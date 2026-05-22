---
reviewer: database-reviewer
plan: B-3
iter: 2
date: 2026-05-22
verdict: NEEDS-WORK
blocking_count: 0
must_fix_count: 1
warning_count: 0
new_blocking: false
---

# Plan-Review B-3 Iter-2 — Database Reviewer

## Verdict: NEEDS-WORK

All four iter-1 MUST-FIX / WARNING items are CLOSED. One new MUST-FIX found: AC-B3-07 still filters on the stale `action = 'soft_deleted'` string; every other site in the plan was updated to `'deleted'` (BLOCKING-2 fix) but this one was missed. No new BLOCKING items. No Rule 9 cross-reviewer disagreement.

---

## Iter-1 finding closure verification

### M-1 (exception handler missing) — CLOSED

`§2.1` trigger function body now contains:

```sql
BEGIN
  INSERT INTO public.activity_log (...)
  VALUES (...);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'audit_soft_delete trigger failed for table=% id=% org=%: %',
                TG_TABLE_NAME, NEW.id, NEW.org_id, SQLERRM;
END;
```

The outer `BEGIN ... END` block forms the entire function body (including the CASE statement and tier-resolution IF/ELSIF/ELSE block). The inner `BEGIN ... EXCEPTION WHEN OTHERS ... END` wraps the INSERT. `RETURN NEW` sits outside the inner exception block at the outer function-body level, so it executes on both the INSERT-succeeded path and the INSERT-failed path. This is correct — the soft-delete UPDATE always succeeds regardless of audit INSERT outcome, satisfying CONTEXT D-25.

The `RAISE WARNING` captures `TG_TABLE_NAME`, `NEW.id`, `NEW.org_id`, and `SQLERRM` — a superset of the iter-1 recommendation. No issue.

**Status: CLOSED — correct and complete.**

---

### M-2 (client_portal_access DEF-WC-3 row) — CLOSED

`§2.4` extension row for `client_portal_access` now reads:

> `| client_portal_access | B (PERMISSIVE-only — iter-2 corrected per rls-auditor MF-RLS-03 + database M-2; 3 PERMISSIVE policies; uses revoked_at/expires_at lifecycle NOT deleted_at) | ORG-scoped tenant | N/A (no deleted_at; uses revoked_at lifecycle) | App only |`

The row count description has been reconciled to "4 extension rows (org_members, activity_log, platform_admins, client_portal_access)" — the confusing "3 + 1 client_portal_access" framing from iter-1 is gone. AC-B3-09 row count expectation updated to 36 data rows consistently across `<criteria>` block, §2.4, Task 2, and AC-B3-09 body (W-3 / MF-5 closure).

**Status: CLOSED — correct and complete.**

---

### W-1 (org_members_delete_strict rationale) — CLOSED

`§2.3` now includes an inline comment directly on the `org_members_delete_strict` policy:

```sql
-- DELETE backstop closes platform_admin-cross-org-delete vector.
-- DELIBERATELY omits is_platform_admin() OR-clause per canonical pattern (migration 00049).
-- platform_admin retains cross-org SELECT (via org_isolation policy above)
-- but NOT cross-org DELETE — cross-org membership removal is an operations event
-- that must be audited separately via admin tooling. Per W-3 / iter-2 rationale codification.
```

This matches the iter-1 advisory exactly. Future reviewers cannot flag the asymmetry as a bug without first reading the cited canonical precedent.

**Status: CLOSED — correct and complete.**

---

### W-2 / W-3 (row count consistency — MF-5 standardization) — CLOSED

All four sites now consistently state 36 data rows:

| Site | Value |
|------|-------|
| `<criteria>` block (line 100) | "32 soft-delete tables + 4 extension entities ... = 36 data rows" |
| §2.4 body (line 698) | "36 data rows total (per CONTEXT D-22 + rls-auditor MF-RLS-02 + MF-RLS-03 + database M-2)" |
| Task 2 scope | references §2.4 which states 36 rows |
| AC-B3-09 (line 1247) | "Expected: 36 data rows" |

Verified consistent across all four sites.

**Status: CLOSED — correct and complete.**

---

## New: Task 6 DO-block correctness

### SAVEPOINT + ROLLBACK pattern — PASS

The DO-block uses:

```sql
SAVEPOINT sp_test;
BEGIN
  EXECUTE format('UPDATE public.%I SET deleted_at = NOW() WHERE id = $1', v_table) USING v_test_id;
  -- ... verify ...
  ROLLBACK TO SAVEPOINT sp_test;
EXCEPTION WHEN OTHERS THEN
  -- ...
  ROLLBACK TO SAVEPOINT sp_test;
END;
```

This is correct PostgreSQL plpgsql. `SAVEPOINT` inside a DO-block works as expected — the DO-block executes inside an implicit transaction, and `SAVEPOINT` / `ROLLBACK TO SAVEPOINT` are valid within that transaction. The ROLLBACK TO SAVEPOINT restores the test row to `deleted_at = NULL` after each table, preventing state bleed between loop iterations. The EXCEPTION handler also rolls back to the savepoint on error, ensuring no partial states persist. This is the correct pattern for non-destructive per-table verification.

One observation: after `ROLLBACK TO SAVEPOINT sp_test`, the savepoint name `sp_test` is still valid (PostgreSQL does not implicitly release a savepoint on rollback; it can be re-established in the next loop iteration). Since the SAVEPOINT statement is inside the LOOP, it re-establishes `sp_test` at each iteration, which is correct behavior.

**Status: PASS.**

---

### format() + %I quoting — PASS

Both EXECUTE statements in the DO-block use `format(..., v_table)` with `%I`:

```sql
EXECUTE format('SELECT id, org_id FROM public.%I WHERE ...', v_table)
EXECUTE format('UPDATE public.%I SET deleted_at = NOW() WHERE id = $1', v_table) USING v_test_id
```

`v_table` is drawn from a hard-coded `text[]` array of valid table names — no user-controlled input. `%I` double-quotes the identifier, preventing SQL injection even if a future table name contains SQL metacharacters. `$1` parameter binding for `v_test_id` (uuid type) is correctly separated from the identifier path, preventing injection on the value side as well.

**Status: PASS.**

---

### JSONB result aggregation — PASS

The accumulation pattern:

```sql
v_results := v_results || jsonb_build_object('table', v_table, 'status', ..., ...);
```

PostgreSQL `||` on jsonb concatenates two jsonb objects. When one operand is a jsonb array (`'[]'::jsonb`) and the other is a jsonb object, the `||` operator on arrays appends the element. This is correct: `'[]'::jsonb || '{"a":1}'::jsonb` yields `[{"a":1}]` in PostgreSQL 14+. The initial value is `'[]'::jsonb` and each iteration appends an object element. The final `RAISE NOTICE 'Per-table verification: %', jsonb_pretty(v_results)` formats the array for readability. No correctness issue.

**Status: PASS.**

---

### RAISE EXCEPTION on FAIL — PASS with one observation

```sql
IF v_results @? '$[*] ? (@.status == "FAIL")' THEN
  RAISE EXCEPTION 'Per-table verification FAILED for at least one table — see NOTICE above';
END IF;
```

The `@?` jsonpath existence operator (`$[*] ? (@.status == "FAIL")`) returns true if any element in the array has `status = "FAIL"`. This is correct for the described intent. The RAISE EXCEPTION causes the DO-block to abort, which (in the absence of an outer EXCEPTION handler) rolls back the implicit transaction — including any test-row modifications not already rolled back via SAVEPOINT.

One observation: the RAISE EXCEPTION does NOT check for `status = 'ERROR'` (caught-exception rows). A table that raises a PL/pgSQL error during the trigger test would be recorded as `status = 'ERROR'`, not `status = 'FAIL'`, and would NOT trigger the final RAISE EXCEPTION. The plan-author's note says "Halt-and-surface if ANY table fails verification" — if ERROR rows are considered failures, the guard expression should be:

```sql
IF v_results @? '$[*] ? (@.status == "FAIL" || @.status == "ERROR")' THEN
```

This is not a blocking correctness issue (FAIL is the definitive failure mode; ERROR indicates an unexpected exception that itself surfaces via SQLERRM in the results JSON). But it is a gap worth noting so the executor adds the ERROR branch to the fail-loud check.

This is advisory only — the plan notes "Plan-author finalizes exact DO-block at execute time" so the executor has latitude to harden the guard expression at authoring time.

**Status: PASS with advisory (no iter action required).**

---

## New: §1.4 trigger count correction — PASS

`§1.4` now states:

> "27 of 32 tables have BEFORE UPDATE triggers ... Existing AFTER UPDATE triggers detected on 8 tables (15 total triggers — iter-2 corrected count)"

The corrected count (15 existing AFTER UPDATE triggers across 8 tables, up from the iter-1 understated 4) is internally consistent with the detailed breakdown showing triggers per table. Design conclusion (zz_ prefix fires last) is unchanged and remains correct — no existing trigger names exceed 'z' alphabetically (confirmed in iter-1 via live query).

**Status: PASS.**

---

## New: §7 FORCE RLS dependency note (N-4) — PASS

`§7 Rollback plan` now contains the section:

> "Migration 00107 includes an explicit comment noting that the SECURITY DEFINER trigger function's INSERT into activity_log relies on `activity_log.relforcerowsecurity = false`."

The risk is correctly characterized: trigger runs as table owner (postgres, BYPASSRLS=true), so INSERT into activity_log succeeds without an explicit INSERT policy. If `FORCE ROW LEVEL SECURITY` is added to activity_log in the future, the trigger needs a companion INSERT policy. The dependency is now documented as R-9 in §5 AND in §7, covering both the risk register and the rollback section. This is the correct belt-and-suspenders documentation approach for a subtle future-hardening dependency.

**Status: PASS.**

---

## New MUST-FIX

### MF-1 — AC-B3-07 filter still uses stale `'soft_deleted'` action value

**Severity: MUST-FIX**

`§4 AC-B3-07` (line 1171) verification query:

```sql
SELECT al.org_id AS audit_org_id, j.org_id AS source_org_id
  FROM public.activity_log al
  JOIN public.jobs j ON j.id = al.entity_id
 WHERE al.entity_id = '<test_id>'
   AND al.action = 'soft_deleted';    -- STALE: should be 'deleted'
```

The trigger function body (§2.1) uses `action = 'deleted'` (BLOCKING-2 fix per nwrp215 decision 3b). All other AC verification queries that filter on `action` have been updated:

- AC-B3-02: `captured_action = 'deleted'` — correct
- AC-B3-10: `AND al.action = 'deleted'` — correct
- `<criteria>` block: `action='deleted'` — correct

AC-B3-07 alone was missed. If the executor runs this query as written after the trigger ships, `al.action = 'soft_deleted'` will match zero rows regardless of correct trigger behavior, because the trigger writes `'deleted'`. The cross-tenant integrity check (the purpose of this AC) would appear to pass vacuously (both `audit_org_id` and `source_org_id` are NULL from an empty result set, which would satisfy `audit_org_id = source_org_id` by NULL = NULL comparison). This is a silent false-positive failure mode.

**Fix required:**

```sql
-- Change line 1171:
   AND al.action = 'soft_deleted';
-- To:
   AND al.action = 'deleted';
```

**Status: MUST-FIX — straightforward one-line correction in AC-B3-07 verification query.**

---

## Summary table

| # | Item | Source | Status |
|---|------|--------|--------|
| M-1 (iter-1) | Exception handler in trigger body | Iter-1 | CLOSED |
| M-2 (iter-1) | client_portal_access DEF-WC-3 row corrected | Iter-1 | CLOSED |
| W-1 (iter-1) | delete_strict rationale inline comment | Iter-1 | CLOSED |
| W-2/W-3 (iter-1) | MF-5 row count 36 standardized at 4 sites | Iter-1 | CLOSED |
| Task 6 SAVEPOINT/ROLLBACK | Transaction-safe per-table verification | New | PASS |
| Task 6 format() + %I | SQL injection prevention | New | PASS |
| Task 6 JSONB aggregation | Array accumulation correctness | New | PASS |
| Task 6 RAISE EXCEPTION | Fail-loud on FAIL status | New | PASS (advisory on ERROR branch) |
| §1.4 trigger count correction | 15 AFTER UPDATE / 27 BEFORE UPDATE | New | PASS |
| §7 FORCE RLS dependency note | N-4 documented in R-9 + §7 | New | PASS |
| MF-1 (new) | AC-B3-07 stale `'soft_deleted'` filter | New | MUST-FIX |

---

## Required iter-2 action (executor)

### MF-1 — Update AC-B3-07 verification query action filter

Change the filter in the AC-B3-07 SQL from `AND al.action = 'soft_deleted'` to `AND al.action = 'deleted'`. Single-line change in `§4 AC-B3-07`. No other changes required from this reviewer for iter-3.

---

*No live queries executed at iter-2 — iter-2 scope is plan-text delta verification against iter-1 findings. Live schema verification was performed at iter-1 and is unchanged by iter-2 text revisions.*
