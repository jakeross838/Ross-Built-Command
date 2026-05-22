# QA-B3-RLS-AUDITOR — RLS audit post-execute QA (LOAD-BEARING)

**Phase:** stage-f1-knowledge-graph-auth-wave-b-slice-2 / B-3
**Threat severity:** HIGH
**QA lens:** rls-auditor (LOAD-BEARING per B-3-PLAN §7 + nwrp216 §17)
**Verdict:** PASS — No BLOCKING or WARNING findings; B-3 clear for POST-EXECUTE GATE B-3 Jake review
**Reviewed against commits:** 49bb664..8ed0e38
**Date:** 2026-05-22
**Reviewer constraint:** Read-only tool surface (Read/Grep/Glob/Bash); agent inspected migration source + cross-referenced B-3-SUMMARY.md verbatim live results. Orchestrator wrote this file to disk per Rule 8(d) on the agent's behalf.

## Migrations reviewed
- `supabase/migrations/00107_b3_soft_delete_audit_trigger_def_wc_1.sql`

## API routes reviewed
- None (B-3 is a migration + TS extension only; no new API routes)

## Checks summary table

| Check | Verdict | Evidence |
|-------|---------|----------|
| New tables: RLS enabled | N/A | B-3 adds no new tables |
| New tables: at least one policy | N/A | B-3 adds no new tables |
| New API routes: getCurrentMembership before DB access | N/A | B-3 adds no new API routes |
| New API routes: org_id filter on every query | N/A | B-3 adds no new API routes |
| Hardcoded ORG_ID fallback | PASS | No hardcoded ORG_ID in migration 00107 or touched TS files |
| Soft-delete only | PASS | Trigger fires on deleted_at NULL → NOT NULL only; no hard DELETE introduced |
| status_history appends | N/A | B-3 appends to activity_log (audit sink), not status_history |
| DEF-WC-1: RESTRICTIVE policies on org_members | PASS | Live: 2 RESTRICTIVE + 3 PERMISSIVE; shape exact |
| DEF-WC-3: ARCHITECTURE.md §9 row count | PASS | Live awk count = 36 |
| DEF-WC-3: Pattern A/B classification vs live | PASS | clients + client_portal_access = 0 restrictive (Pattern B); jobs/invoices/vendors/draws = 2 restrictive each (Pattern A) |
| AC-B3-05: cross-tenant isolation live probe | PASS | leak_rows=0; own_org_rows=10; platform_admin_cross_org=9 |
| Trigger SECURITY DEFINER + correct search_path | PASS | prosecdef=true; proconfig=search_path=public,pg_temp |
| Trigger uses NEW.org_id (not session-derived) | PASS | Migration line 172: NEW.org_id — cross-tenant integrity |
| Function ACL: no PUBLIC/anon/authenticated EXECUTE | PASS | proacl = {postgres=X/postgres} — only owner |

---

## Check 1 — DEF-WC-1 policies LIVE on org_members (verbatim)

```json
[
  {"cmd":"ALL","permissive":"RESTRICTIVE","policyname":"org_members_org_isolation",
   "qual":"((org_id = app_private.user_org_id()) OR app_private.is_platform_admin())",
   "with_check":"(org_id = app_private.user_org_id())"},
  {"cmd":"DELETE","permissive":"RESTRICTIVE","policyname":"org_members_delete_strict",
   "qual":"(org_id = app_private.user_org_id())","with_check":null},
  {"cmd":"ALL","permissive":"PERMISSIVE","policyname":"admin manage org_members",
   "qual":"((org_id = app_private.user_org_id()) AND (app_private.user_role() = ANY (ARRAY['admin'::text, 'owner'::text])))","with_check":"..."},
  {"cmd":"SELECT","permissive":"PERMISSIVE","policyname":"members read org_members",
   "qual":"(org_id = app_private.user_org_id())","with_check":null},
  {"cmd":"SELECT","permissive":"PERMISSIVE","policyname":"org_members_platform_admin_read",
   "qual":"app_private.is_platform_admin()","with_check":null}
]
```

**Canonical form verification:**
- `org_members_org_isolation` RESTRICTIVE ALL: qual = `((org_id = app_private.user_org_id()) OR app_private.is_platform_admin())`, with_check = `(org_id = app_private.user_org_id())`. **Direct-call form confirmed** (not SELECT-wrapped). Matches nwrp215 decision 2 Option A exactly.
- `org_members_delete_strict` RESTRICTIVE DELETE: qual = `(org_id = app_private.user_org_id())`. Intentionally omits `is_platform_admin` (W-3 rationale — platform admin should not delete org members cross-tenant unilaterally). Correct.
- 3 PERMISSIVE policies preserved unchanged (admin manage / members read / platform_admin_read).

**PASS — DEF-WC-1 canonical shape verified live.**

---

## Check 2 — DEF-WC-3 ARCHITECTURE.md §9 accuracy vs live pg_policies (verbatim)

**Row count:** Independent awk count on ARCHITECTURE.md §9 = **36**. Matches PLAN claim.

**Pattern A/B control query (verbatim):**
```json
[
  {"tablename":"client_portal_access","restrictive_count":0},
  {"tablename":"clients","restrictive_count":0},
  {"tablename":"draws","restrictive_count":2},
  {"tablename":"invoices","restrictive_count":2},
  {"tablename":"jobs","restrictive_count":2},
  {"tablename":"vendors","restrictive_count":2}
]
```

- `clients` = 0 restrictive → Pattern B. ARCHITECTURE.md §9 says "B (PERMISSIVE-only)". **CORRECT.**
- `client_portal_access` = 0 restrictive → Pattern B. ARCHITECTURE.md §9 says "B (PERMISSIVE-only; uses revoked_at/expires_at lifecycle NOT deleted_at)". **CORRECT.**
- `jobs`/`invoices`/`vendors`/`draws` = 2 restrictive each → Pattern A. **CORRECT.**

**Spot-check of a Pattern B table (`approval_chains`):** 3 PERMISSIVE policies only (INSERT/SELECT/UPDATE) — no RESTRICTIVE. ARCHITECTURE.md says "B (PERMISSIVE-only joins)". **CORRECT.**

**Pattern A table with RESTRICTIVE backstop (`budget_lines`, `change_orders`):** Both have 2 RESTRICTIVE policies (`org isolation` ALL + `_delete_strict` DELETE). **CORRECT — matches Pattern A canonical shape.**

**PASS — DEF-WC-3 table accurate vs live pg_policies.**

---

## Check 3 — AC-B3-05 cross-tenant-deletion-rejection probe (independently run, verbatim)

**Steps 3-5 (org_B member `5eb26edc-5989-477f-ac42-d1e9264db0e2` impersonated):**
```json
{"session_user_id":"5eb26edc-5989-477f-ac42-d1e9264db0e2",
 "step4_leak_rows_org_a":0,
 "step5_own_org_rows_org_b":10}
```

**Step 6 (platform_admin `a0000000-0000-0000-0000-000000000001`):**
```json
{"session_user_id":"a0000000-0000-0000-0000-000000000001",
 "is_platform_admin":true,
 "step6_platform_admin_cross_org_rows":9}
```

**Four falsifiable conditions:**
1. `step4_leak_rows_org_a = 0` — RESTRICTIVE `org_members_org_isolation` blocks cross-org reads. **PASS.**
2. `step5_own_org_rows_org_b = 10 > 0` — same-org access preserved. **PASS.**
3. `is_platform_admin = true` — platform_admin helper functioning under authenticated JWT context. **PASS.**
4. `step6_platform_admin_cross_org_rows = 9 > 0` — platform_admin retains cross-org SELECT via RESTRICTIVE OR-clause. **PASS.**

**My independent results AGREE exactly with executor SUMMARY §5 verbatim output.** No Rule 9 cross-reviewer disagreement. Concurrent ai-logic-tester coordination: results are identical; no HALT required.

**PASS — DEF-WC-1 RESTRICTIVE backstop validated LIVE under authenticated session.**

---

## Check 4 — Trigger SECURITY DEFINER bypassing RLS (correct posture, verbatim)

**Function metadata:**
```json
{"prosecdef":true,"proconfig":["search_path=public, pg_temp"]}
```

**ACL:**
```json
{"proacl":"{postgres=X/postgres}"}
```

**Function body key excerpt (from pg_get_functiondef):**
```sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
...
INSERT INTO public.activity_log (
  org_id, user_id, entity_type, entity_id, action, details, actor_token_id
) VALUES (
  NEW.org_id,   -- line 172: cross-tenant integrity: audit stays in same tenant
  v_user_id,
  ...
);
```

**Posture analysis:**
- `SECURITY DEFINER` = function runs as postgres (owner), bypassing RLS on activity_log. This is the intentional + correct security boundary. The trigger must bypass RLS to write audit rows for soft-deletes executed by roles with no direct activity_log INSERT grant.
- `NEW.org_id` is used for the audit row's org_id, NOT `app_private.user_org_id()` or any session-derived org. Correct: the trigger audits the row being soft-deleted; a session impersonating org_B cannot cause the trigger to write an audit row with org_A's org_id.
- `search_path = public, pg_temp` — canonical CLAUDE.md Dev Rules pattern. Correct.
- `proacl = {postgres=X/postgres}` — no PUBLIC, anon, or authenticated EXECUTE grants. Correct per M-05 verification + REVOKE FROM authenticated auto-fix.
- activity_log does NOT have `FORCE ROW LEVEL SECURITY` (per PLAN R-9). SECURITY DEFINER can INSERT without an explicit INSERT policy. This dependency is documented; correct current state.

**PASS — SECURITY DEFINER posture is intentional, correct, and cross-tenant-integrity-preserving.**

---

## Findings

### BLOCKING
None.

### WARNING
None.

### NOTE
- **AC-B3-06 Tier 1 + Tier 2 PARTIAL at execute close:** Was deferred to ai-logic-tester at QA per dispatch. ai-logic-tester independently closed both tiers via LIVE probes — AC-B3-06 PARTIAL → FULL PASS. rls-auditor lens unaffected (no RLS bearing on user_id tier resolution).
- **Pattern B tables (17 + client_portal_access):** Have PERMISSIVE-only RLS with no RESTRICTIVE backstop. Documented pre-Wave-A posture; acknowledged in ARCHITECTURE.md §9; scheduled for Wave 1.1-Lite uniformity sweep. Not a B-3 regression — scope was org_members DEF-WC-1 only.
- **activity_log FORCE RLS dependency (R-9):** SECURITY DEFINER trigger INSERT depends on relforcerowsecurity=false for activity_log. Documented in migration 00107 + B-3-SUMMARY §11 R-9. Future ALTER TABLE activity_log FORCE ROW LEVEL SECURITY would require explicit INSERT policy.
- **TD-NW-APP-PRIVATE-DEFAULT-ACL-HARDEN open:** pg_default_acl schema-wide issue means every new SECURITY DEFINER function in app_private requires explicit REVOKE FROM authenticated until Wave 1.1-Lite normalization. B-4..B-7 migration authors must remember this pattern.

---

## Verdict

**PASS**

All four checks pass against live Supabase production schema. DEF-WC-1 canonical policy shape is exact. DEF-WC-3 ARCHITECTURE.md §9 is accurate (36 rows, Pattern A/B classifications correct). AC-B3-05 cross-tenant isolation probe independently confirms `leak_rows = 0` with no Rule 9 disagreement against executor's SUMMARY §5 or ai-logic-tester's independent re-run. SECURITY DEFINER trigger uses `NEW.org_id` (not session-derived), correct `search_path`, and restricted ACL (`postgres` only).

No BLOCKING or WARNING findings. B-3 is clear for POST-EXECUTE GATE B-3 Jake review.

---

**End of QA-B3-RLS-AUDITOR.md.**
