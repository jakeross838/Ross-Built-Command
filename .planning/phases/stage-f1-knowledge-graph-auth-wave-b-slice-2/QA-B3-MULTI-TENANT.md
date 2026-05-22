# QA-B3-MULTI-TENANT — Multi-tenant lens post-execute QA (LOAD-BEARING)

**Phase:** stage-f1-knowledge-graph-auth-wave-b-slice-2 / B-3
**Threat severity:** HIGH
**QA lens:** multi-tenant-architect (LOAD-BEARING per B-3-PLAN §7)
**Verdict:** PASS — APPROVE for /nightwork-qa Step 3 consolidation
**Reviewed against commits:** 49bb664..8ed0e38
**Date:** 2026-05-22
**Reviewer constraint:** Read-only tool surface; relies on verbatim live-DB results captured in B-3-SUMMARY.md (same-day, service-role mcp__supabase__execute_sql), cross-referenced against migration 00107 source. Orchestrator wrote this file to disk per Rule 8(d) on the agent's behalf.

## Check 1 — Cross-tenant integrity in trigger function (NEW.org_id, not session-derived)

**Verdict: PASS.**

Migration source verbatim (00107 lines 168-179):

```sql
BEGIN
  INSERT INTO public.activity_log (
    org_id, user_id, entity_type, entity_id, action, details, actor_token_id
  ) VALUES (
    NEW.org_id,          -- cross-tenant integrity: audit stays in same tenant
    v_user_id,
    v_entity_type,
    NEW.id,
    'deleted',
    v_snapshot,
    NULL
  );
EXCEPTION WHEN OTHERS THEN
  ...
END;
```

`org_id` source is the row's NEW.org_id, NOT a session GUC or `auth.uid()`-derived org lookup. The trigger uses session context (`auth.uid()`, `current_setting('app.current_user_id', true)`) ONLY for actor identity resolution (Tier 1/2/3), never for org context.

**Cross-reference:** B-3-SUMMARY.md §4 AC-B3-07 verifies live: `audit_org_id = source_org_id = '00000000-0000-0000-0000-000000000001'` (Drummond Residence soft-delete probe).

## Check 2 — Trigger blast radius across 32 tables

**Verdict: PASS.**

B-3-SUMMARY.md M-03 verbatim:
```json
[{"trigger_count":32}]
```

Migration 00107 DO-block (lines 212-237) hard-codes the canonical 32-table array — verified by inspection against B-3-PLAN §1.1 information_schema pre-design audit. `lien_releases` is present in the array; trigger exists regardless of fixture data presence. Task 6's 27 N/A entries (B-3-SUMMARY.md §7) reflect MISSING FIXTURE ROWS, NOT MISSING TRIGGERS.

## Check 3 — DEF-WC-1 RESTRICTIVE backstop preserves cross-tenant block

**Verdict: PASS.**

B-3-SUMMARY.md §5 verbatim probe results (authenticated session context, NOT service-role bypass):

STEPS 3-5 (org_B member impersonation):
```json
[{"session_user_id":"5eb26edc-5989-477f-ac42-d1e9264db0e2","step4_leak_rows_org_a":0,"step5_own_org_rows_org_b":10}]
```

STEP 6 (platform_admin control case):
```json
[{"session_user_id":"a0000000-0000-0000-0000-000000000001","is_platform_admin":true,"step6_platform_admin_cross_org_rows":9}]
```

Four falsifiable conditions all PASS:
- step4_leak_rows_org_a = 0 → RESTRICTIVE org_members_org_isolation blocks cross-org reads
- step5_own_org_rows_org_b = 10 > 0 → same-org access preserved
- is_platform_admin = true → control case for cross-org admin
- step6_platform_admin_cross_org_rows = 9 > 0 → platform_admin retains cross-org SELECT via RESTRICTIVE OR-clause

**Rule 9 alignment with rls-auditor + ai-logic-tester:** Both independently re-ran AC-B3-05 with verbatim-equivalent results. No factual disagreement.

## Check 4 — Pattern A vs B taxonomy deferral disposition

**Verdict: ACCEPTABLE WITH WARNING.**

DEF-WC-3 ARCHITECTURE.md §9 documents 17 Pattern B tenant tables (PERMISSIVE-only with `org_id IN (SELECT FROM org_members)` JOIN-style isolation) plus client_portal_access. Wave 1.1-Lite sweep deferred.

Multi-tenant lens position:
- Pattern B IS tenant-safe BY CONSTRUCTION when PERMISSIVE policy intact. The `org_id IN (SELECT FROM org_members WHERE user_id = auth.uid())` clause IS the tenant filter — not a "RLS will catch it" answer; it IS the construction.
- The Pattern A defense-in-depth gap is DROPPED-POLICY RESILIENCE, not first-line construction. CLAUDE.md "BY CONSTRUCTION" rule is satisfied for Pattern B (no leak via design); the gap is operational hardening.
- B-3 hardens the most asymmetric table (org_members — the membership-authority root). Trigger covers ALL 32 tables uniformly.
- Wave 1.1-Lite sweep to convert 17 → Pattern A is appropriate scheduling.

**WARNING (non-blocking) — extend rls-auditor coverage for Pattern B:**
- Recommend rls-auditor at future /nightwork-qa cycles execute live cross-org probes on at least 2 representative Pattern B tables (suggest `proposals` + `items`) in addition to the AC-B3-05 org_members probe.
- This catches accidental Pattern B policy drift via runtime probe even before Wave 1.1-Lite conversion lands.

## Check 5 — Hard-DELETE CASCADE consistency gap

**Verdict: PASS — not a cross-tenant issue.**

PLAN R-1 + B-3-SUMMARY.md §11 R-1 documented. Hard-DELETE forbidden by CLAUDE.md. Where CASCADE fires, FK constraints route within-tenant: FK from child to parent in same `org_id` ⇒ CASCADE stays within tenant.

Multi-tenant lens: audit-trail gap from hard-DELETE CASCADE is a coverage gap, NOT a cross-tenant leak vector. Audit at parent level captures the operator-driven hard-delete event. Acceptable.

## Check 6 — activity_log rows in correct tenant per soft-delete (cross-tenant integrity at scale)

**Verdict: PASS for verified sample (5 PASS Task 6 entries + AC-B3-07 Drummond probe).**

B-3-SUMMARY.md §7 Task 6 verbatim — all 5 PASS rows captured `captured_org_id = test_org_id = 00000000-0000-0000-0000-fb1ce0a55e55` (harness-fixture-org).

AC-B3-07 cross-org-A probe (Drummond Residence in Ross Built org):
- `audit_org_id = source_org_id = 00000000-0000-0000-0000-000000000001`

Two distinct orgs verified live; zero cross-tenant audit-log writes observed.

**Coverage gap noted (non-blocking):** 27 tables have NO fixture data, so per-table cross-tenant integrity not exercised. The trigger function body is single-codepath (no per-table CASE for the INSERT — only entity_type CASE), so the verified 5 PASS rows are representative of behavior across all 32. Filed as carry-forward for future fixture seed extension.

## Check 7 — Trigger SECURITY DEFINER bypass posture

**Verdict: APPROVE.**

Function owner = postgres (BYPASSRLS=true) is REQUIRED for the audit-sink write under cross-RLS context. The bypass is mechanical (trigger-invocation-only); cannot be called as SQL.

B-3-SUMMARY.md M-05 verbatim:
```json
[{
  "public_grant_present": false,
  "anon_grant_present": false,
  "authenticated_grant_present": false,
  "all_grantees": ["postgres"]
}]
```

ACL hardening complete. The `authenticated` REVOKE is required because of `pg_default_acl` on app_private — TD-NW-APP-PRIVATE-DEFAULT-ACL-HARDEN filed for schema-wide Wave 1.1-Lite normalization.

## Halt-condition check

| Condition | Triggered? | Evidence |
|---|---|---|
| Trigger writes wrong org_id (session-derived not NEW.org_id) | NO | Migration 00107 line 172 verbatim `NEW.org_id`; AC-B3-07 live verified |
| Cross-org probe (Check 3) returns rows | NO | B-3-SUMMARY.md §5 `step4_leak_rows_org_a = 0` verbatim |
| Cross-reviewer factual disagreement (Rule 9) with rls-auditor / ai-logic-tester on AC-B3-05 | NO | Independent re-runs align verbatim |
| 17 Pattern B tables' deferral unacceptable | NO | Acceptable with documented WARNING for rls-auditor coverage extension |

## Findings

### CRITICAL
None.

### WARNING (non-blocking; recommendations)
1. **Pattern B runtime coverage extension** — Future /nightwork-qa cycles should execute live cross-org probes on 2 representative Pattern B tenant tables (suggest `proposals` + `items`) to catch policy drift before Wave 1.1-Lite sweep.
2. **Fixture coverage extension** — 27 of 32 tables have no harness-fixture-org seed rows; per-table cross-tenant integrity not exercised on those (trigger codepath is single-shape so 5-PASS sample is representative).

### NOTES
- Pattern A canonical direct-call form for DEF-WC-1 (matching existing 14 Pattern A tables verbatim per nwrp215 decision 2 Option A) is the right call for consistency across canonical RLS surface — confirmed multi-tenant correct.
- platform_admin OR-clause on org_members_org_isolation but NOT on org_members_delete_strict is the correct asymmetric posture.

## Cross-reviewer alignment

- **rls-auditor:** PASS aligned on AC-B3-05 + DEF-WC-1 mechanical verification.
- **ai-logic-tester:** PASS aligned on Task 6 entity_type singular-form + AC-B3-06 closure.
- **security-reviewer:** PASS aligned on AC-B3-08 aclexplode (PART 1 + PART 2). TD-NW-APP-PRIVATE-DEFAULT-ACL-HARDEN filed.

## Verdict

**APPROVE for /nightwork-qa Step 3 consolidation.** B-3 advances multi-tenant safety posture (org_members defense-in-depth + 32-table audit-trail coverage) without introducing new cross-tenant leak vectors. Pattern B 17-table deferral is acceptable with the recommended rls-auditor coverage extension WARNING.

---

**End of QA-B3-MULTI-TENANT.md.**
