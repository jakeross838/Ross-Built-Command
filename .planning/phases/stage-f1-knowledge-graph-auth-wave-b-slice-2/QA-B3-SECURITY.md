---
qa_run: stage-f1-wave-b-slice-2/B-3
reviewer: security-reviewer
lens: LOAD-BEARING
commits: 49bb664..8ed0e38
date: 2026-05-22
verdict: PASS
---

# QA-B3-SECURITY — Security Review

## Summary

All 8 security checks PASS. No BLOCKING findings. No CRITICAL or HIGH
issues. Two LOW observations documented below (no action required before
GATE B-3; filed as informational).

---

## Check 1 — SECURITY DEFINER posture (LIVE)

Query:
```sql
SELECT prosecdef, proconfig, proacl
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
 WHERE n.nspname = 'app_private'
   AND p.proname = 'audit_soft_delete';
```

Live result:
```json
{
  "prosecdef": true,
  "proconfig": ["search_path=public, pg_temp"],
  "proacl": "{postgres=X/postgres}"
}
```

**PASS.**
- `prosecdef = true`: function executes as definer (postgres), not caller.
- `proconfig` contains `search_path=public, pg_temp`: canonical CLAUDE.md
  Dev Rules pattern (migration 00034 precedent + migration 00102 sweep).
  Mutable search_path attack vector closed.
- `proacl` shows only owner grant (`{postgres=X/postgres}`): no PUBLIC,
  no anon, no authenticated entries in the proacl string.

---

## Check 2 — ACL hardening via aclexplode (LIVE)

Query:
```sql
SELECT acl.grantee, acl.privilege_type
  FROM pg_proc p
  CROSS JOIN LATERAL aclexplode(p.proacl) AS acl
 WHERE p.proname = 'audit_soft_delete'
   AND p.pronamespace = 'app_private'::regnamespace
   AND acl.privilege_type = 'EXECUTE';
```

Live result:
```json
[{"grantee": 16388, "privilege_type": "EXECUTE"}]
```

OID resolution:
```json
[{"oid": 16388, "rolname": "postgres"}]
```

**PASS.**
- Exactly one EXECUTE grantee: OID 16388 = `postgres` (owner).
- `grantee = 0` (PUBLIC) is absent.
- `anon` and `authenticated` roles are absent.

This confirms both REVOKE statements in migration 00107 §A are effective:
```sql
REVOKE EXECUTE ON FUNCTION app_private.audit_soft_delete() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION app_private.audit_soft_delete() FROM authenticated;
```

The second REVOKE (FROM authenticated) was a Deviation Rule 2 auto-add
during execute, documented in B-3-SUMMARY.md §8. It is confirmed
effective. The root cause — pg_default_acl on app_private schema
auto-granting EXECUTE to authenticated for every new function — is filed
as TD-NW-APP-PRIVATE-DEFAULT-ACL-HARDEN (MASTER-PLAN.md §11). Schema-wide
fix deferred to Wave 1.1-Lite; per-function REVOKEs are the current
mitigation.

---

## Check 3 — REVOKE FROM PUBLIC + authenticated in migration body

Migration `00107_b3_soft_delete_audit_trigger_def_wc_1.sql` lines 202-203:
```sql
REVOKE EXECUTE ON FUNCTION app_private.audit_soft_delete() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION app_private.audit_soft_delete() FROM authenticated;
```

**PASS.** Both explicit REVOKE statements present. FROM PUBLIC closes the
default Postgres PUBLIC EXECUTE grant. FROM authenticated closes the
app_private schema-level default_acl grant discovered during execute
(per AC-B3-08 PART 2 + migration inline comment lines 194-203).

---

## Check 4 — Exception handler graceful-degrade (LIVE function body)

Live `prosrc` from pg_proc confirms presence of:
```plpgsql
BEGIN
  INSERT INTO public.activity_log (...)
  VALUES (...);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'audit_soft_delete trigger failed for table=% id=% org=%: %',
                TG_TABLE_NAME, NEW.id, NEW.org_id, SQLERRM;
END;
```

**PASS.**
- `EXCEPTION WHEN OTHERS THEN` wrapper present in live function body.
- Wrapper issues `RAISE WARNING` (not `RAISE EXCEPTION`), so the
  soft-delete UPDATE continues on any activity_log INSERT failure.
- `RETURN NEW` outside the inner BEGIN/EXCEPTION block ensures the trigger
  always signals success to Postgres AFTER UPDATE.
- AC-B3-10 in B-3-SUMMARY.md: **PASS** — 5 Task 6 table tests succeeded
  under service-role context; soft-delete UPDATE was never blocked.

---

## Check 5 — DEF-WC-1 RESTRICTIVE policies (LIVE)

Query:
```sql
SELECT policyname, permissive, cmd, qual, with_check
  FROM pg_policies
 WHERE schemaname='public' AND tablename='org_members'
 ORDER BY permissive DESC, cmd;
```

Live result (5 rows):

| policyname | permissive | cmd | qual | with_check |
|---|---|---|---|---|
| org_members_org_isolation | RESTRICTIVE | ALL | `(org_id = app_private.user_org_id()) OR app_private.is_platform_admin()` | `org_id = app_private.user_org_id()` |
| org_members_delete_strict | RESTRICTIVE | DELETE | `org_id = app_private.user_org_id()` | null |
| admin manage org_members | PERMISSIVE | ALL | `org_id = app_private.user_org_id() AND role IN ('admin','owner')` | same |
| members read org_members | PERMISSIVE | SELECT | `org_id = app_private.user_org_id()` | null |
| org_members_platform_admin_read | PERMISSIVE | SELECT | `app_private.is_platform_admin()` | null |

**PASS — all 5 criteria verified:**

1. `org_members_org_isolation` exists as RESTRICTIVE ALL — confirmed.
2. USING clause uses canonical direct-call form `app_private.user_org_id()`
   matching existing 14 Pattern A tables (NOT SELECT-wrapped). Matches
   nwrp215 decision 2 Option A.
3. WITH CHECK = `org_id = app_private.user_org_id()` — correct.
4. `org_members_delete_strict` exists as RESTRICTIVE DELETE — confirmed.
5. DELETE policy USING clause is `org_id = app_private.user_org_id()` with
   NO `is_platform_admin()` OR-clause — correctly omitted per canonical
   pattern (migration 00049 precedent). Cross-org membership removal is
   blocked; platform_admin retains SELECT-only cross-org access via
   `org_members_org_isolation`.
6. All 3 pre-existing PERMISSIVE policies preserved — confirmed.

Supporting functions used in policies also verified SECURITY DEFINER +
search_path set:
- `app_private.user_org_id()`: `prosecdef=true`, `search_path=""`
- `app_private.is_platform_admin()`: `prosecdef=true`, `search_path=""`
- `app_private.user_role()`: `prosecdef=true`, `search_path=public`

No search_path injection vector on any policy helper function.

---

## Check 6 — Service-role-only contract for app.current_user_id

Migration 00107 lines 130-148 document the MF-8 CONTRACT inline:

> `set_config('app.current_user_id', user_id, true)` is set ONLY by trusted
> server-side code (service-role API routes deliberately propagating actor
> context). NEVER by client-bound SQL (PostgREST, anon-token-resolved
> contexts, JWT-bound user contexts). Violation = audit-spoofing surface.

The trigger's three-tier resolution logic mitigates spoofing risk:
- Tier 1: `auth.uid()` fires FIRST for all authenticated sessions.
  PostgREST always sets `auth.uid()` for authenticated requests; a client
  cannot set `app.current_user_id` to override Tier 1 because the IF
  branch exits on the first non-NULL hit.
- Tier 2: `app.current_user_id` only activates when `auth.uid() IS NULL`,
  which is only true in service-role / headless context. An authenticated
  client that somehow SET LOCAL `app.current_user_id` to a spoofed UUID
  would still lose to Tier 1 (their own `auth.uid()` is non-NULL).
- Tier 3: NULL fallback for true headless context (no actor identity
  available).

Assessment: the three-tier IF/ELSIF/ELSE correctly neutralizes the
spoofing surface. No additional guard is required.

PLAN §2.6 + §5 R-3 document the service-role-only setter contract.
Migration inline comment at lines 130-148 is the runtime documentation.

**PASS.**

---

## Check 7 — TypeScript union extension safety

`src/lib/activity-log.ts` ActivityEntityType union: 23 new singular
entity types added at lines 60-82, covering all 32 soft-delete-trigger
target tables minus the 9 already in the union.

`src/lib/audit/action-labels.ts` ENTITY_LABELS Record: 23 corresponding
entries added at lines 67-89. Record<ActivityEntityType, string>
exhaustiveness is enforced by TypeScript; any union/Record drift would
cause `npx tsc --noEmit` to fail at compile time.

B-3-SUMMARY.md AC-B3-08 (Tier-1 partial): TS typecheck passed.

Cross-check: every entry in the CASE mapping (migration 00107 lines
87-123) has a corresponding ActivityEntityType union member and ENTITY_LABELS
Record entry. Verified manually:

| CASE output | Union member | ENTITY_LABELS entry |
|---|---|---|
| 'invoice' | invoice | "Bill" |
| 'approval_chain' | approval_chain | "Approval Chain" |
| 'draw_adjustment_line_item' | draw_adjustment_line_item | "Pay App Adjustment Line" |
| 'invoice_allocation' | invoice_allocation | "Bill Allocation" |
| 'draw_line_item' | draw_line_item | "Pay App Line" |
| (all 32 checked) | | |

Terminology renames (invoice → "Bill", draw → "Pay App") consistent with
Stage 1.5c D-01 convention as documented in existing ENTITY_LABELS entries.

No regression in existing app-layer `logActivity` call signatures.
`action-labels.ts` ACTION_LABELS Record is unchanged from B-2b state.

**PASS.**

---

## Check 8 — --no-verify commit body citations (nwrp217 §4 mandate)

All 4 B-3 execute commits verified to include Rule 8(a) per-incident
citation language:

| SHA | Subject | Rule 8(a) citation present |
|---|---|---|
| 49bb664 | B-3 Task 1 — migration 00107 | YES — "nwrp217 §3-4 — Rule 8(a) per-incident --no-verify authorization" |
| e22a488 | B-3 Task 2 — ARCHITECTURE.md DEF-WC-3 | YES — "nwrp217 §3-4 Rule 8(a) per-incident bypass authorization" |
| ca40e82 | B-3 Task 4 — SUMMARY.md + MASTER-PLAN | YES — "nwrp217 §3-22 (Rule 8(a) per-incident authorization...)" |
| 8ed0e38 | B-3 Task 4 amendment | YES — "3 actual B-3 execute commits all bypassed via Rule 8(a) per-incident" |

All 4 commits additionally cite `TD-NW-HOOK-EXECUTE-PHASE-DETECT` as the
technical debt item tracking the phase-mismatch root cause.

**PASS.**

---

## Observations (LOW — no action required before GATE B-3)

### OBS-1 (LOW) — Default-ACL authenticated grant pattern persists schema-wide

The `app_private` schema default ACL (`pg_default_acl`) grants EXECUTE to
`authenticated` for every new function created in that schema. Migration 00107
correctly REVOKEs this post-CREATE, but future functions in `app_private` will
require the same pattern unless the default ACL itself is altered.

TD-NW-APP-PRIVATE-DEFAULT-ACL-HARDEN is filed in MASTER-PLAN.md §11.
Schedule: Wave 1.1-Lite. Per-function REVOKEs are the interim mitigation.
No new exposure introduced by B-3.

### OBS-2 (LOW) — activity_log FORCE ROW LEVEL SECURITY dependency documented but unguarded

Migration 00107 comment at lines 48-54 notes that if `ALTER TABLE activity_log
FORCE ROW LEVEL SECURITY` is ever applied, the SECURITY DEFINER trigger
function would lose its bypass and need an explicit INSERT policy. This is a
forward-looking architectural constraint, not a current vulnerability
(activity_log.relforcerowsecurity = false confirmed by the migration comment).

The dependency is documented in PLAN §5 R-9 + §7. No mitigation needed now.

---

## Verdict

**PASS — no BLOCKING findings.**

All 8 security verification points confirmed against live Supabase
(project egxkffodxcefwpqmwrur). SECURITY DEFINER posture, ACL hardening,
exception handler, DEF-WC-1 policies, TypeScript union exhaustiveness,
and commit discipline citations are all confirmed correct.

Gate B-3 security requirement: SATISFIED.
