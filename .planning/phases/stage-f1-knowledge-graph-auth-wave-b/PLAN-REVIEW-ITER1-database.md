---
review: PLAN-REVIEW-ITER1-database
scope: Wave-B-Slice-1 (B-D080, B-1a, B-1a-bis, B-1b)
reviewer: database-reviewer (Claude Sonnet 4.6)
date: 2026-05-14
verdict: CONDITIONAL PASS — 2 BLOCKING items must be resolved before execute dispatch
rule3_queries_executed: true
---

# Database Review — Wave-B-Slice-1

## Rule 3 representative queries executed (pre-execute baseline)

All queries ran against the live Supabase project `egxkffodxcefwpqmwrur` via REST API.

**Pre-B-D080 state confirmed:**
- `jobs pm embed (pm:profiles) -> PGRST200` — FK does not exist yet. B-D080 is needed.
- `org_members profile embed -> HTTP 200` — Wave-D `org_members_user_id_profiles_fkey` is live, confirming the profiles-FK pattern works.
- `jobs.client_name` column present with 26 non-null rows (26 total in REST response; at least 1 real-org client with email).
- Fixture-harness-org has exactly 10 jobs. Probe (d) expectation CONFIRMED.
- Probe (c) CLEAN: 0 rows with same (org_id, name, email) but different phones.
- Asymmetric data check CLEAN: 0 jobs with null `client_name` but non-null `client_email` or `client_phone`.
- `parser_corrections.corrected_by` sample `a0000000-*-0001` resolves in profiles (i.e., in auth.users by 1:1 invariant). Orphan risk LOW.
- Multi-job client detected: `michael harllee|mharllee@email.com` appears on 2 jobs in the same org. Backfill CTE must produce exactly 1 clients row for this pair.
- `fixture-harness-org` org UUID confirmed present.

---

## Findings by severity

### BLOCKING

#### BLK-1 — B-1a backfill CTE produces duplicate rows (SELECT DISTINCT + window function interaction)

**Plan:** B-1a, Migration sketch §6, lines 481-500 (Step 7 BACKFILL).

**Issue:** The CTE uses `SELECT DISTINCT` with window functions in the same SELECT list. In PostgreSQL, `SELECT DISTINCT` deduplicates AFTER the window function computes across ALL rows in the partition — it does not first deduplicate then apply the window. The window `FIRST_VALUE` runs per-row; each input row gets a `full_name`, `email`, `phone` value from the window. Then `SELECT DISTINCT` collapses rows where all 6 projected columns are identical.

For a client with exactly one job (the common case), this works correctly — one row in the partition produces one row out.

For Michael Harllee (2 jobs, same org+name+email, confirmed via live query), the window produces 2 rows both with the same FIRST_VALUE output. `SELECT DISTINCT` collapses them to 1. This case works correctly.

**However**, the INSERT then has no `ON CONFLICT` clause. If the window function produces rows that differ in `full_name` (e.g., "Michael Harllee" vs "michael harllee" after trim — trim is applied but DISTINCT compares the trimmed value), or differ in `email` or `phone` by NULL vs empty string variance, `SELECT DISTINCT` may NOT collapse them, producing 2 inserts for the same logical client. The subsequent `INSERT INTO public.clients` has no `ON CONFLICT` guard. This produces duplicate clients rows for the same logical person.

**More precisely:** the `DISTINCT` key includes `name_key` and `email_key` (lowercased), but the `full_name` column in the projection is `trim(client_name)` (NOT lowercased). If two jobs for the same client have `client_name = 'Michael Harllee'` and `client_name = 'MICHAEL HARLLEE'`, then `name_key` is the same but `full_name` differs — `SELECT DISTINCT` on all 6 columns will NOT collapse them. Two rows hit the INSERT; the `clients` table has no UNIQUE constraint on `(org_id, lower(trim(full_name)), lower(trim(email)))`, so both rows insert. The subsequent UPDATE in Step 8 then matches BOTH clients rows for the same job, producing a JOIN that updates `jobs.client_id` to the LAST matched clients row (non-deterministic). The forward probe in Step 9 passes (count of unmatched jobs == 0) even though duplicate clients rows exist.

**Fix required (two options):**

Option A — Add `UNIQUE` constraint on `clients(org_id, lower(trim(full_name)), lower(trim(email)))` (partial, WHERE deleted_at IS NULL) AND add `ON CONFLICT (org_id, lower(trim(full_name)), lower(trim(email))) DO NOTHING` to the INSERT. This is the correct long-term shape. The expression index `idx_clients_full_name_lower` already exists in the plan as a non-unique index — promote it to UNIQUE.

Option B — Replace the CTE approach with a simpler `INSERT ... SELECT` using `GROUP BY org_id, lower(trim(client_name)), lower(trim(client_email))` with `MIN(trim(client_name))` for the canonical name, which produces exactly one row per logical group without needing DISTINCT + window interaction.

Option A is recommended because the UNIQUE constraint also enforces ongoing integrity for B-2 Owner Portal inserts.

**Severity: BLOCKING** — duplicates in `clients` table corrupt the FK backfill and any future Owner Portal lookup.

---

#### BLK-2 — B-1a RLS INSERT/UPDATE policy does not use SELECT-wrapped helper (session-caching gap)

**Plan:** B-1a, Migration sketch §6, Step 4 RLS policies (lines 409-440).

**Issue:** The `clients_org_read` policy correctly uses `(SELECT app_private.is_platform_admin())` with a `SELECT` wrapper for session caching. However, the `clients_org_insert` and `clients_org_update` policies use a bare subquery against `org_members`:

```sql
org_id IN (
  SELECT org_id FROM public.org_members
   WHERE user_id = auth.uid() AND is_active = true
     AND role IN ('owner', 'admin', 'pm', 'accounting')
)
```

The EXPANDED-SCOPE §4 cross-cutting checklist explicitly cites "direct-filter on `org_id` via `app_private.user_org_id()` wrapped in `(SELECT ...)` per Wave-C 00097 session-cache pattern." The migration's own header comment (line 405) states: "Pattern mirrors 00065_proposals.sql exactly." But 00096 (invoice_allocations, the most recent ORG-scoped precedent) wraps the user_org_id helper in `(SELECT app_private.user_org_id())` for session caching.

The direct subquery against `org_members` is re-evaluated per row in UPDATE policies, which fires once per updated row. For bulk updates (e.g., backfill UPDATE in Step 8) this is not a user-session context so RLS doesn't apply — but for application-layer updates from B-2 Owner Portal write paths, this policy fires per row. The un-cached subquery creates a risk of repeated `org_members` lookups under future write load.

The deeper issue is that the plan's stated pattern ("mirrors 00065_proposals.sql exactly") is correct for SELECT but the INSERT/UPDATE policies in proposals also use membership subqueries. The Wave-C 00097 session-cache pattern uses `app_private.user_org_id()` which is a STABLE function — PostgreSQL's function-result caching within a session does not apply to subqueries. Wrapping in `(SELECT fn())` forces the planner to evaluate it once per statement rather than per row.

The plan should either:
(a) Use `app_private.user_org_id()` for org-context and `app_private.user_role()` for role-check (mirroring the helper pattern from 00007+00016), OR
(b) Explicitly acknowledge that the un-cached subquery is intentional with a rationale comment, given that at Ross Built scale (small row counts) per-row eval is acceptable.

This is BLOCKING because the EXPANDED-SCOPE standard (§4, Wave-C 00097 citation) mandates the session-cache pattern, and the plan's own header claims to comply with it but the SQL body does not match.

**Severity: BLOCKING** — compliance gap with stated standard; executor may ship this unchanged if plan-review passes without catching it.

---

### CRITICAL

#### CRT-1 — B-D080 constraint-existence check inside DO block could fire false-positive on re-run

**Plan:** B-D080, Task 2, bullet point "Constraint-existence sanity check INSIDE the DO $$ block."

**Issue:** The plan specifies: "before the orphan check, query pg_constraint for each of the 11 names; RAISE EXCEPTION if ANY already exists." This is correct as a defense-in-depth guard. However, migrations in Supabase are often re-applied during local development cycles or on branch resets. A RAISE EXCEPTION on constraint already existing makes the migration non-idempotent in a way that differs from the Wave-D 00098 pattern.

00098 uses `ADD CONSTRAINT` without `IF NOT EXISTS` and lets PostgreSQL's own error message surface — it does NOT pre-check pg_constraint inside the DO block. 00097 similarly uses fail-loud ADD without pre-check. The plan adds an extra layer that is more aggressive than the precedent it cites.

**Specific risk:** If the migration is applied twice (e.g., Supabase migration system glitch, local dev reset, or test environment re-seeding), the DO block RAISES before the orphan probe even runs. The error message from the DO block is less clear than PostgreSQL's native "constraint already exists" message. More importantly, if the migration partially applied (9 of 11 FKs added before a crash), the re-run DO block raises on the 1st existing constraint before adding the remaining 2 — preventing recovery without manual constraint inspection.

**Recommended fix:** Remove the pre-existence check from the DO block. Let PostgreSQL's native `ADD CONSTRAINT` error surface if a constraint already exists. This matches the 00097+00098 fail-loud convention exactly and is simpler. If idempotency is needed, use `ADD CONSTRAINT IF NOT EXISTS` — but the plan explicitly prohibits this ("NO IF NOT EXISTS guards"), which is the correct call for fail-loud style. Just remove the pre-existence DO-block check; the native ADD CONSTRAINT error is sufficient.

**Severity: CRITICAL** — does not block execute in the happy path, but creates a confusing failure mode on re-run and diverges from stated Wave-D precedent.

---

#### CRT-2 — B-1a backfill UPDATE (Step 8) can match multiple clients rows if BLK-1 is not fixed

**Plan:** B-1a, Migration sketch §6, Step 8 UPDATE (lines 506-515).

**Issue:** The UPDATE uses a FROM clause joining `public.clients` on `(org_id, lower(trim(full_name)), lower(trim(email)))`. If BLK-1 is fixed (UNIQUE constraint added), this is a 1:1 match per job and is correct. If BLK-1 is NOT fixed, the UPDATE may match multiple clients rows per job, producing non-deterministic client_id assignment (PostgreSQL picks the last row from an unordered join when multiple rows satisfy the FROM condition).

This is a secondary consequence of BLK-1, but called out separately because it means BLK-1 and CRT-2 must be fixed together — fixing only the INSERT without also verifying the UPDATE produces exactly one match per job is insufficient.

**Additionally:** The UPDATE does not filter by `clients.deleted_at IS NULL`. Since the fixture client row is inserted with `deleted_at = NULL` (V.1 default), this is not a problem in B-1a. But the pattern should include a `AND c.deleted_at IS NULL` clause for correctness (the clients table has `deleted_at TIMESTAMPTZ` — if a partial rollback somehow left deleted_at set on a row, the UPDATE would still match it).

**Severity: CRITICAL** — resolved by fixing BLK-1; call out explicitly so the fix is comprehensive.

---

#### CRT-3 — B-1a-bis reverse probe SQL comment says "forward grep" but the migration body runs the DB probe

**Plan:** B-1a-bis, Migration sketch §8.1.

**Issue:** The migration header comment (lines 399-403) describes the "forward code-level grep" as a PRE-DROP verification run by the executor from the repo root before applying the migration. The DO block inside the transaction (Step 1) then runs the **database-level reverse probe** — checking for jobs with `client_id IS NULL AND (client_name IS NOT NULL OR ...)`.

This is architecturally correct (code-level grep + DB probe = dual verification). However, the migration comment says "forward code-level grep... Expected: 0 matches in active code paths... HALT migration apply if non-zero." This is a code-level check that cannot be enforced by the DB transaction — it relies on the executor running the grep manually before `apply_migration`. The DB transaction has no mechanism to fail if the grep was not run.

This is a process gap, not a SQL error. The concern is that an executor in a hurry could call `apply_migration` without running the grep first, and the DB-level reverse probe would PASS (0 rows with client_id IS NULL + non-null client_*) even if active code still reads `jobs.client_name` — because the reverse probe only checks data state, not code state.

**Recommended fix:** The plan already addresses this via AC-B1a-bis-03 (grep returns 0 hits). The migration header comment should be explicit that the forward grep is a MANDATORY executor step, not a DB enforcement — "HALT if non-zero. This is a code-gate, not enforced by the transaction." The current wording could be misread as suggesting the migration itself halts on non-zero grep output. Clarify the wording.

**Severity: CRITICAL** — process gap that could allow DROP COLUMN to apply with live code still reading the dropped columns; the grep AC exists but needs to be clearly separated from the DB-probe AC in executor protocol.

---

### WARNING

#### WARN-1 — B-D080 lock posture comment understates risk at stated scale

**Plan:** B-D080, Task 2, header comment, "Lock posture" bullet.

**Issue:** The plan states: "ADD CONSTRAINT FOREIGN KEY takes SHARE ROW EXCLUSIVE on the source table + validates every existing row. Current scale (largest table = invoices at ~11 rows post-Wave-E) is sub-millisecond."

Via live query, `jobs` has 26+ rows with non-null `pm_id` and `invoices` has at least that many rows. More importantly, the plan adds 10 separate FKs in a single transaction — each ADD CONSTRAINT takes SHARE ROW EXCLUSIVE on its source table. The 10 statements lock 10 different tables simultaneously (change_orders, draws, invoices, jobs, lien_releases, parser_corrections, purchase_orders, vendors — 8 distinct tables). At Ross Built's current scale this is fine. But the lock is held for the duration of the transaction, and the transaction includes the full orphan-probe DO block (11 UNION ALL queries) before the ADD CONSTRAINT statements. If the orphan probe is slow (e.g., on a cold Supabase instance), the lock duration extends. The comment should acknowledge that the lock is held from the first ADD CONSTRAINT until COMMIT, covering all 10 ADD statements.

This is a WARNING, not BLOCKING, because at current scale (sub-10k rows on all tables) the risk is low. But the comment should be accurate.

**Severity: WARNING**

---

#### WARN-2 — B-1a idx_clients_full_name_lower is not sufficient as a unique enforcement index

**Plan:** B-1a, Migration sketch §6, Step 2 (lines 379-384).

**Issue:** The plan creates `idx_clients_full_name_lower` as a non-unique index on `(org_id, lower(trim(full_name))) WHERE deleted_at IS NULL`. This index supports lookups (correct) but does NOT enforce the uniqueness key from the backfill logic. If BLK-1 is fixed by promoting this index to UNIQUE (Option A), the index should be `CREATE UNIQUE INDEX` with the appropriate expression. The plan as written creates a plain index that allows duplicate (org_id, lower(trim(full_name))) rows as long as they have different emails (which the backfill uniqueness key separates on).

The uniqueness key is `(org_id, lower(trim(full_name)), lower(trim(email)))` — but the index only covers `(org_id, lower(trim(full_name)))`. These are not the same. The UNIQUE constraint enforcement index should cover all three columns to match the backfill dedup logic.

**Recommended:** If BLK-1 is fixed with Option A, create the UNIQUE index as:
```sql
CREATE UNIQUE INDEX idx_clients_org_name_email_unique
  ON public.clients (org_id, lower(trim(full_name)), lower(trim(email)))
  WHERE deleted_at IS NULL;
```
Keep the existing `idx_clients_full_name_lower` as a non-unique index for partial-name lookups (or drop it if the UNIQUE index covers the lookup use case).

**Severity: WARNING** — partial unique coverage; must be resolved as part of BLK-1 fix.

---

#### WARN-3 — B-1a-bis DOWN migration does not add indexes back

**Plan:** B-1a-bis, Down migration §8.2.

**Issue:** The down migration re-adds `client_name`, `client_email`, `client_phone` as nullable TEXT columns but does not restore any indexes that may have existed on those columns pre-migration. In practice, the original schema may not have had indexes on these columns (they were plain TEXT fields added in 00001). This is low risk but the down migration header comment should explicitly state "no indexes restored (none existed on these columns in pre-migration schema)" for completeness.

**Severity: WARNING** — documentation gap; no functional impact at current scale.

---

#### WARN-4 — B-1b harness rls-coverage.ts introspection via pg_policies will encounter RLS on pg_policies itself

**Plan:** B-1b, Layer 2 standards description.

**Issue:** The plan specifies that `rls-coverage.ts` "introspects pg_policies." In Supabase, `pg_policies` is a system catalog view; it is accessible via the service-role key without RLS restrictions. However, if the harness uses the anon/authenticated client rather than service-role, `pg_policies` may return an empty set or be inaccessible. The `conservation/money-line-items-sum.ts` SKIP-clean pattern uses the service-role client for direct DB introspection, which is correct.

The plan should explicitly state that all 4 Layer 2 integrity standards use the Supabase service-role client (not the anon client or the test user session client) for their introspection queries. This is implied by the "direct DB introspection" wording but not stated explicitly in the plan body.

**Severity: WARNING** — if the executor defaults to the anon client, the standards silently SKIP rather than enforce, defeating their purpose.

---

### NOTE

#### NOTE-1 — B-D080 FK naming convention for profiles target differs from 00098 pattern

**Plan:** B-D080, interfaces block.

**Observation:** The plan correctly cites the naming convention: `<table>_<column>_profiles_fkey` for the profiles-target FK (e.g., `jobs_pm_id_profiles_fkey`). This mirrors 00098's `org_members_user_id_profiles_fkey`. However, the standard Postgres auto-naming convention for FKs is `<source_table>_<source_column>_fkey` (no target table suffix). The `_profiles_fkey` suffix is a project-specific convention introduced in 00098. This is correct and intentional per D-078 §4 "distinct-target suffix" rationale — the suffix disambiguates from a hypothetical future auth.users FK on the same column. No action needed; document confirms this was explicit.

**Severity: NOTE** — PASS; convention is correct and intentional.

---

#### NOTE-2 — B-1a pre-flight DO block checks fixture-harness-org job count but not fixture client UUID collision

**Plan:** B-1a, Migration sketch §6, Step 0 PRE-FLIGHT (lines 340-350).

**Observation:** The pre-flight DO block asserts fixture-harness-org has exactly 10 jobs. This is correct. It does NOT assert that the fixture client UUID `00000000-0000-0000-0003-000000000001` does not already exist in `clients` (which doesn't exist yet pre-migration, so this is a moot check). However, the `ON CONFLICT (id) DO NOTHING` on the fixture INSERT (Step 5, line 460) handles idempotency correctly. The pre-flight check is appropriate for its stated purpose (baseline divergence detection).

**Severity: NOTE** — PASS on this specific check.

---

#### NOTE-3 — B-1a-bis PostgREST embed notation inconsistency: `client:clients(id, name)` vs `client:clients(id, full_name)`

**Plan:** B-1a-bis, §4 refactor map, row for `job-matcher.ts`.

**Observation:** The `clients` table schema (from B-1a) has column `full_name TEXT NOT NULL`. The plan uses `client:clients(id, name)` for most consumers but `client:clients(id, full_name)` for `job-matcher.ts`. PostgREST will correctly resolve `full_name` (it is the actual column name). However, `name` is NOT a column on `clients` — the plan appears to use `name` as a shorthand but the actual column is `full_name`. PostgREST will return PGRST204 (column not found) for any embed using `clients(id, name)` because there is no `name` column on `clients`.

**This is a BLOCKING-class issue in B-1a-bis** but it is a code-level error (TypeScript/PostgREST), not a pure SQL/schema error. It falls partly within this database review's scope because it directly concerns the PostgREST FK embed resolution (Workflow posture Rule 2 + Rule 3).

Reclassifying to NOTE here since the database schema (column named `full_name`) is correct, and the consumer refactor code using `name` is the error. However, the database-reviewer flags it for the executor: every `client:clients(id, name)` embed string in B-1a-bis §4 will fail at runtime. All must be `client:clients(id, full_name)`.

**Severity: NOTE (elevated — executor must fix before ship)** — schema is correct; consumer embed strings are wrong in the plan's §4 table.

---

#### NOTE-4 — B-1a clients.org_id ON DELETE CASCADE vs jobs.client_id ON DELETE SET NULL semantics

**Plan:** B-1a, clients table CREATE (lines 356-367) + jobs.client_id ALTER (lines 466-471).

**Observation:** `clients.org_id REFERENCES organizations(id) ON DELETE CASCADE` — if an organization is deleted, its clients are cascade-deleted. `jobs.client_id REFERENCES clients(id) ON DELETE SET NULL` — if a client is deleted (via the org cascade), the jobs FK is set to NULL. This chain is: org deleted -> clients CASCADE deleted -> jobs.client_id SET NULL. This is correct behavior for the multi-tenant posture. The EXPANDED-SCOPE §3 gap 1 note confirms `ON DELETE SET NULL` is required for `client_portal_access` preservation semantics. PASS — semantics are correct.

**Severity: NOTE** — PASS.

---

#### NOTE-5 — B-D080 orphan probe confirms profiles resolves for pm_id values (Rule 3 verification)

**Rule 3 execution result:** Live query against production DB confirmed `a0000000-0000-0000-0000-000000000005` (Jeff Bryde, PM) is in profiles. The 26 `pm_id` values sampled all follow the `a0000000-*` pattern which corresponds to seeded PM profiles. The `jobs_pm_id_profiles_fkey` constraint should apply cleanly — 0 orphans expected. Pre-flight DO block should pass.

**Severity: NOTE** — PASS (pre-flight expectation confirmed).

---

## Cross-plan concerns

**CC-1 (BLOCKING):** BLK-1 (duplicate clients from backfill CTE) and BLK-2 (RLS session-cache gap) must both be resolved in the B-1a migration body before B-1a-bis can safely execute. B-1a-bis's forward grep + reverse probe rely on a clean `clients` table with correct 1:1 mapping. If B-1a ships with duplicate clients rows, the B-1a-bis consumer refactor produces non-deterministic `jobs.client_id` assignments.

**CC-2 (NOTE-3 elevated):** The `client:clients(id, name)` vs `client:clients(id, full_name)` inconsistency in B-1a-bis §4 spans 14 of 16 load-bearing consumers. The plan author appears to have used `name` as shorthand throughout the refactor map, but the actual column is `full_name`. The executor must use `full_name` uniformly. The single exception (`job-matcher.ts` correctly uses `full_name`) confirms the author knows the real column name — the others are documentation shortcuts that must not become code.

**CC-3 (WARN-4):** B-1b Layer 2 standards must use the service-role client. This is cross-plan because any standard that introspects `pg_policies` or `pg_tables` with the wrong client will silently SKIP, making the harness extensions ineffective at detecting future RLS coverage gaps. Document the service-role requirement explicitly in each standard's self-test.

**CC-4 (process):** The B-D080 orphan probe (Task 1) is the only plan that runs a pre-apply probe at plan-author time AND specifies the execute-time probe SQL. B-1a and B-1a-bis both state "probe not runnable from sandbox" or "run by executor." The Rule 3 verification confirmed the live DB is in the expected pre-migration state (26 jobs with client_name, 0 asymmetric orphans, probe c CLEAN). Executor should record these baseline numbers in the probe results file before apply.

---

## Verdict

**CONDITIONAL PASS** — 4 plans reviewed. 2 BLOCKING findings (BLK-1 and BLK-2) in B-1a must be resolved before execute dispatch. 2 CRITICAL findings (CRT-1 in B-D080; CRT-3 in B-1a-bis) require plan body amendments. 4 WARNINGS require either fixes or explicit acknowledgment. NOTE-3 is elevated and must be caught in the consumer refactor executor pass.

**Top 3 by impact:**

1. **BLK-1 (B-1a)** — Backfill CTE produces potential duplicate `clients` rows due to `SELECT DISTINCT` + window function interaction without a UNIQUE constraint or `ON CONFLICT` guard. Corrupts the FK backfill for any client with multiple jobs. Fix: add `CREATE UNIQUE INDEX` on `(org_id, lower(trim(full_name)), lower(trim(email)))` and `ON CONFLICT DO NOTHING` on the INSERT.

2. **BLK-2 (B-1a)** — RLS INSERT/UPDATE policies use un-cached `org_members` subquery rather than the session-caching pattern mandated by the EXPANDED-SCOPE standard (Wave-C 00097 citation). Fix: wrap the membership subquery in `(SELECT ...)` or use the `app_private.user_org_id()` helper per the stated pattern.

3. **NOTE-3 elevated (B-1a-bis)** — All 14 `client:clients(id, name)` embed strings in the §4 refactor map will fail at runtime with PGRST204 because the actual column is `full_name`, not `name`. Executor must use `full_name` uniformly across all 16 consumer refactors.

**Execute gate:** Do not dispatch B-1a to execute until BLK-1 and BLK-2 are resolved in the plan body. B-D080 may execute independently (CRT-1 is a recommended simplification, not a hard block on the happy path). B-1a-bis and B-1b remain gated behind B-1a resolution.
