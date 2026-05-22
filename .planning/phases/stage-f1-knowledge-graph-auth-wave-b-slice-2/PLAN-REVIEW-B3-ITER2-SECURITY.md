# Plan-Review B-3 — Security Reviewer (LOAD-BEARING)
# iter-2 — Soft-delete DB-trigger audit safety net + DEF-WC-1 + DEF-WC-3

**Generated:** 2026-05-22
**Reviewer role:** Security Reviewer (LOAD-BEARING per nwrp214 §17)
**Plan reviewed:** `B-3-PLAN.md` (iter-2 revised, commit `bf70d78` on origin/main)
**Inputs also reviewed:**
- `PLAN-REVIEW-B3-ITER1-SECURITY.md` (iter-1 findings to verify CLOSED)
- `supabase/migrations/00105_b2a_acl_hardening.sql` (canonical aclexplode pattern source)

---

## Verdict: NEEDS-WORK

**Summary:** The iter-2 plan closes SEC-B3-03 (exception handler) and SEC-B3-04 (service-role-only contract) correctly and completely. SEC-B3-08 (aclexplode pattern) is substantially fixed — the fragile proacl string-match is gone and aclexplode is used throughout AC-B3-08 — but the M-05 inline verification query (Task 1 §3) contains a spurious `grantor = grantee` clause in the `bool_or` expression that has no precedent in the canonical 00105 pattern and introduces a false-pass vector. This is a new HIGH finding (SEC-B3-08-V2) arising from the fix itself; it does not re-open the original BLOCKING, but it must be corrected before /nx. No other new findings. All other iter-1 findings remain CLOSED.

---

## Iter-1 finding closure verification

### SEC-B3-03 — CLOSED

**Verification:** §2.1 trigger function body at lines 519–546 of the plan now wraps the activity_log INSERT in a nested `BEGIN ... EXCEPTION WHEN OTHERS THEN RAISE WARNING ... END` block. The outer function returns `RETURN NEW` unconditionally (line 548), outside the nested block. Structural analysis:

```
outer BEGIN
  -- variable declarations + tier resolution
  inner BEGIN
    INSERT INTO public.activity_log (...);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'audit_soft_delete trigger failed for table=% id=% org=%: %',
                  TG_TABLE_NAME, NEW.id, NEW.org_id, SQLERRM;
  END;
  RETURN NEW;          -- outer scope, always reached
outer END
```

This matches the required canonical form from iter-1 SEC-B3-03 finding exactly. The `RAISE WARNING` surfaces to Supabase logs + Sentry at WARNING level without propagating to the caller. `RETURN NEW` is in the outer scope and is therefore unconditionally reachable — the soft-delete UPDATE succeeds even when the INSERT fails. The Properties block at line 562 explicitly states "Throws nothing on missing user_id OR on activity_log INSERT failure."

AC-B3-10 has been extended to include the additional sub-test (force-fail via temporary CHECK constraint + assert UPDATE still succeeds), which correctly covers the INSERT-failure path that iter-1 flagged as having narrower AC scope than the protection gap.

The Deviation Handling note at line 789 also explicitly confirms: "Trigger function exception handling is FINALIZED in §2.1 — `BEGIN ... EXCEPTION WHEN OTHERS THEN RAISE WARNING ... END` block wraps the activity_log INSERT (iter-2 BLOCKING-3 fix)."

**Status: CLOSED.**

---

### SEC-B3-04 — CLOSED

**Verification:** Three locations in the plan now carry the service-role-only contract:

1. **§2.1 inline comment (MF-8 fix, lines 493–497):**
   ```
   -- MF-8 CONTRACT (per nwrp215): set_config('app.current_user_id', user_id, true) is
   -- set ONLY by trusted server-side code (service-role API routes deliberately propagating
   -- actor context). NEVER by client-bound SQL (PostgREST, anon-token-resolved contexts,
   -- JWT-bound user contexts). Violation = audit-spoofing surface. The trigger does NOT
   -- guard against spoof because the threat is contained to service-role code paths.
   ```

2. **§2.6 contract block (lines 714–729):** Explicit CONTRACT enumeration listing three prohibited paths (client-bound SQL / anon-token contexts / JWT-bound user contexts) with three structural mitigations (Tier 1 precedence / service-role as trusted boundary / SECURITY DEFINER helper complexity tradeoff).

3. **§5 R-3 (line 1389):** "SERVICE-ROLE-ONLY CONTRACT documented in §2.6 (per nwrp215 + iter-2 MF-8). `set_config('app.current_user_id', ...)` is set ONLY by trusted server-side code. Tier 1 (`auth.uid()`) fires first for all authenticated paths; Tier 2 is only reachable from explicitly service-role contexts where the threat boundary is already crossed."

All three locations are present in the plan body. The constraint is explicit, complete, and covers the specific spoofing scenario described in iter-1: a client-bound session cannot reach Tier 2 because `auth.uid()` is non-NULL for authenticated users and fires first. The plan's §2.6 also correctly notes that the `setSessionUserId` helper ships with this contract documented as a first-class API constraint when authored at first consumer.

**Status: CLOSED.**

---

### SEC-B3-08 — PARTIALLY CLOSED — NEW HIGH FINDING SEC-B3-08-V2

The original BLOCKING finding is substantially addressed: the fragile `proacl` text-contains string match is gone from both AC-B3-08 and M-05. The `aclexplode` function is used in both locations. The `grantee = 0` OID-stable PUBLIC check is present in AC-B3-08. However, the M-05 inline verification query contains a deviation from the canonical pattern that introduces a semantic error.

**AC-B3-08 (lines 1193–1206): PASS**

The PART 2 verification query uses:
```sql
COALESCE(bool_or(grantee = 0), false) AS public_grant_present
```
with `CROSS JOIN LATERAL aclexplode(p.proacl)`. This is OID-stable and matches the canonical 00105 pattern (`acl.grantee = 0`). The `COALESCE(..., false)` correctly handles the NULL proacl case — when `aclexplode` returns 0 rows, `bool_or` returns NULL, COALESCE substitutes false. The NOTE block explicitly states "If aclexplode returns 0 rows post-migration, REVOKE was not applied — HALT" to prevent a false-pass on NULL proacl. This is a tighter safety net than the canonical 00105 pattern (which uses COUNT and checks > 0). PASS on AC-B3-08.

**M-05 (lines 759–770): HIGH finding SEC-B3-08-V2**

The M-05 Task 1 inline verification query (the fail-closed gate that fires within the migration apply transaction) reads:

```sql
SELECT bool_or(grantor = grantee OR grantee = 0) AS public_grant_present
  FROM pg_proc p
  CROSS JOIN LATERAL aclexplode(p.proacl) AS acl
 WHERE p.proname = 'audit_soft_delete'
   AND p.pronamespace = 'app_private'::regnamespace
   AND acl.privilege_type = 'EXECUTE';
-- Expected: false (no PUBLIC EXECUTE grant)
```

The `grantor = grantee` clause has no basis in the canonical pattern and introduces a false-positive vector:

- In Postgres `pg_proc.proacl`, the standard EXECUTE grant for the function owner looks like `postgres=X/postgres` (grantor = grantee = postgres OID). After `REVOKE EXECUTE FROM PUBLIC`, the remaining ACL entry for the owner-to-themselves has `grantor = grantee`.
- `bool_or(grantor = grantee OR grantee = 0)` will evaluate TRUE because `grantor = grantee` is TRUE for the owner self-grant entry. The query returns `public_grant_present = true` even when no PUBLIC grant exists and the REVOKE was correctly applied.
- This inverts the expected semantics: the expected result is `false`, but the owner self-grant makes the result `true` after a correct REVOKE. The migration would RAISE EXCEPTION (or emit a WARNING) on a correctly hardened function, causing the migration to fail spuriously — or worse, if the executor interprets the query result without fail-logic and reads the comment "Expected: false", the mismatch creates confusion about correctness.
- Canonical 00105 pattern is `acl.grantee = 0` only — no `grantor = grantee` clause. The canonical AC-B3-08 PART 2 in the same plan (lines 1195) correctly uses `COALESCE(bool_or(grantee = 0), false)` without this clause.

**Required fix (plan-text only — no migration body change):** Replace the M-05 `bool_or` expression with the canonical OID-0-only form, consistent with AC-B3-08 PART 2 and migration 00105:

```sql
SELECT COALESCE(bool_or(acl.grantee = 0), false) AS public_grant_present
  FROM pg_proc p
  CROSS JOIN LATERAL aclexplode(p.proacl) AS acl
 WHERE p.proname = 'audit_soft_delete'
   AND p.pronamespace = 'app_private'::regnamespace
   AND acl.privilege_type = 'EXECUTE';
-- Expected: false (no PUBLIC EXECUTE grant)
-- NOTE: If aclexplode returns 0 rows (proacl IS NULL), bool_or returns NULL,
-- COALESCE returns false. But NULL proacl means REVOKE was not applied —
-- the migration DO block must assert IS NOT NULL separately, or use COUNT.
```

Severity: HIGH (not BLOCKING because the flaw is in the inline verification check, not in the REVOKE statement itself — the function ACL will be correctly hardened by the migration; the M-05 query would fail spuriously on a correctly configured function, surfacing as a migration failure at apply time and thereby blocking the migration rather than silently passing a bad state). The REVOKE + aclexplode fix in AC-B3-08 is correct; M-05 is the inline gate that needs alignment with AC-B3-08's own correct form.

**Status of original SEC-B3-08: SUBSTANTIALLY CLOSED (string-match replaced with aclexplode). NEW finding SEC-B3-08-V2 raised on M-05 grantor=grantee clause.**

---

## New findings

### SEC-B3-08-V2 — HIGH: M-05 `bool_or(grantor = grantee OR grantee = 0)` spurious clause causes false-positive on correctly hardened function

See full analysis under SEC-B3-08 closure verification above.

**Impact:** M-05 fires within the migration apply transaction. If the DO block includes fail-logic (`IF public_grant_present THEN RAISE EXCEPTION ...`), a correctly applied REVOKE will cause a spurious migration failure because the owner self-grant entry (postgres=X/postgres) satisfies `grantor = grantee`. If no fail-logic is present in the DO block, the query produces a misleading `true` result when `false` is expected.

**Required fix:** Remove `grantor = grantee OR` from the M-05 `bool_or` expression. Use `COALESCE(bool_or(acl.grantee = 0), false)` to match AC-B3-08 PART 2 and canonical 00105 pattern.

**Scope:** Plan-text change only (M-05 inline verification query in §3 Task 1). No migration body change, no schema change. Single-line fix.

---

## Summary table — iter-2 state

| Finding ID | Severity | Area | Iter-2 Status |
|------------|----------|------|---------------|
| SEC-B3-01 | PASS | search_path + REVOKE FROM PUBLIC declaration | UNCHANGED PASS |
| SEC-B3-02 | PASS | org_id sourced from NEW (not session) | UNCHANGED PASS |
| SEC-B3-03 | BLOCKING (iter-1) | Exception handler absent from §2.1 | CLOSED |
| SEC-B3-04 | HIGH (iter-1) | app.current_user_id spoofing undocumented | CLOSED |
| SEC-B3-05 | PASS | DEF-WC-1 org_members_org_isolation RESTRICTIVE policy | UNCHANGED PASS |
| SEC-B3-06 | PASS | DEF-WC-1 org_members_delete_strict RESTRICTIVE policy | UNCHANGED PASS |
| SEC-B3-07 | PASS (observation) | platform_admin read coexistence | UNCHANGED PASS |
| SEC-B3-08 | BLOCKING (iter-1) | proacl string-match replaced with aclexplode | SUBSTANTIALLY CLOSED — see SEC-B3-08-V2 |
| SEC-B3-08-V2 | HIGH (NEW) | M-05 `grantor = grantee` clause causes false-positive on correct REVOKE | FIX REQUIRED |
| SEC-B3-09 | MEDIUM | Hard-DELETE covert-scrub gap; needs TD registration | UNCHANGED (execute-time custodian task) |
| SEC-B3-10 | PASS | Service-role escape window during DEFER; interim posture acceptable | UNCHANGED PASS |
| SEC-B3-11 | PASS | B-2a ACL lesson inherited; REVOKE placed after CREATE OR REPLACE | UNCHANGED PASS |

---

## Iter-3 requirements

One HIGH finding requires plan-text correction before /nx:

**SEC-B3-08-V2** — Replace M-05 `bool_or(grantor = grantee OR grantee = 0)` with `COALESCE(bool_or(acl.grantee = 0), false)` in §3 Task 1 inline verification. This is a plan-text-only change; no migration body is affected. The correct form is already present in the same plan at AC-B3-08 PART 2 (line 1195) — M-05 should match it exactly.

No BLOCKING findings remain. No new BLOCKING findings introduced. No cross-reviewer factual disagreements (Rule 9 clean).

---

**Security Reviewer verdict: NEEDS-WORK — 1 HIGH finding (SEC-B3-08-V2, plan-text fix only). 2 iter-1 BLOCKING findings CLOSED (SEC-B3-03, SEC-B3-08). 1 iter-1 HIGH finding CLOSED (SEC-B3-04). Core SECURITY DEFINER posture, exception handler, service-role-only contract, and DEF-WC-1 policy design are all correct. The remaining issue is a single spurious clause in the M-05 inline verification expression that is inconsistent with the canonical 00105 pattern and with AC-B3-08 in the same plan.**
