# Plan Review Iter-1 — Database Review: B-2
# `client_portal_access.client_id` FK + Owner Portal Path A + `activity_log.actor_token_id`

**Reviewer:** database-reviewer (postgres-patterns skill)
**Plan file:** `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2-PLAN.md`
**Migration scope:** `supabase/migrations/00104_client_portal_access_add_client_id.sql` (not yet on disk — pre-execute review)
**References verified:** `00074_client_portal.sql`, `00100_clients_schema_foundation.sql`, `00026_phase5_scaffolding_tables.sql`, `00101_drop_jobs_client_columns.sql`
**Date:** 2026-05-20

---

## Verdict

**CONDITIONAL PASS — 2 BLOCKING items + 3 WARNINGS**

The migration is structurally sound. The FK shapes are correct, the backfill logic is safe, the audit durability contract is properly upheld, and `database.types.ts` regen is explicitly called out in the plan. Two blocking issues must be resolved before execute dispatch: a semantic error in the partial unique index predicate and a missing index on a new critical query path. Three warnings require explicit plan-author disposition but do not block.

---

## Concern 1 — FK shape: `ON DELETE SET NULL` correctness

**Status: PASS**

`client_portal_access.client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL` is the correct FK disposition. The precedent is `jobs.client_id` from migration 00100 (line 319: `ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL`). Both use the same pattern for the same reason: the token row (like the job row) is a durable audit artifact that must survive if a `clients` row is hard-deleted via the emergency DBA path. Soft-delete is the normal path; soft-deleted clients leave `client_id` pointing at a `deleted_at IS NOT NULL` clients row, which is the correct audit posture. The plan's comment on the column (`ON DELETE SET NULL preserves token row if client is hard-deleted via emergency DBA path`) accurately documents this.

The `actor_token_id` FK on `activity_log` uses `ON DELETE SET NULL` referencing `client_portal_access(id)`. This is correct per the audit durability contract: a deleted portal-access token must not cascade-delete the audit history of what that token did. SET NULL preserves the log row while allowing the token to be cleaned up. This matches D-078 PI1.1 / CC7.2 SOC2 framing (audit trail durability).

One structural note: `client_portal_access` uses `revoked_at` as its soft-delete mechanism (migration 00074 header: "no DELETE policy — revoked_at is the soft-delete mechanism"). The table has no `deleted_at` column. This is by design and does not affect the FK shape; it is relevant to Concern 2 below.

---

## Concern 2 — Partial unique index predicate: BLOCKING

**Status: BLOCKING**

**The discrepancy:** There is a semantic mismatch between the EXPANDED-SCOPE §7 line 272, the plan body §1 line 87, and the actual SQL in Task 1.

- **EXPANDED-SCOPE §7 line 272 says:** `partial unique index (org_id, client_id, deleted_at IS NULL)`
- **Plan body §1 line 87 says:** `WHERE revoked_at IS NULL`
- **Task 1 SQL (line 399-401) says:** `WHERE revoked_at IS NULL AND client_id IS NOT NULL`

The EXPANDED-SCOPE wording (`deleted_at IS NULL`) is wrong for this table. `client_portal_access` has no `deleted_at` column (00074 explicitly omits it; the table uses `revoked_at` as the invalidation mechanism). The EXPANDED-SCOPE text was written by analogy with other tenant tables that use `deleted_at`, without accounting for this table's distinct soft-invalidation pattern. The plan body and the Task 1 SQL correctly use `revoked_at IS NULL`, which is the right predicate for this table.

**However, the `WHERE revoked_at IS NULL AND client_id IS NOT NULL` predicate has a semantic gap that is not addressed anywhere in the plan:**

**Expired-but-not-revoked tokens are not excluded from the unique constraint.** The `client_portal_access` table uses both `revoked_at` and `expires_at` as invalidation signals. A token can be functionally dead (expired: `expires_at < now()`) without being revoked (`revoked_at IS NULL`). Under the current predicate, an expired-but-not-revoked old token STILL counts toward the uniqueness constraint. This means:

- If Alice received a portal invite 91 days ago, and her token expired naturally (sliding window closed), her old row is still `revoked_at IS NULL`.
- When the admin tries to issue Alice a fresh invite today for the same job, the INSERT will conflict on `(org_id, client_id)`.
- The existing per-email-per-job index (`client_portal_access_org_job_email_active` from 00074) has the same `WHERE revoked_at IS NULL` predicate and does not filter out expired tokens either — so this is a pre-existing pattern carried into B-2.

**The question the plan must explicitly answer:** should the partial unique constraint allow one active (non-revoked, non-expired) token per (org, client), or one non-revoked token per (org, client)? The existing 00074 per-job-per-email index uses the same `revoked_at IS NULL` convention, so B-2's use of that convention is consistent. But the plan does not acknowledge that expired tokens accumulate in the constraint window, and the `create_client_portal_invite` RPC (from 00074) does not check for expired-but-not-revoked rows before inserting — meaning re-inviting a client whose token naturally expired will fail with a unique constraint violation.

**Resolution required from plan-author (choose one):**

Option A: Extend the predicate to `WHERE revoked_at IS NULL AND expires_at > now() AND client_id IS NOT NULL`. This excludes expired tokens from the constraint window, allowing re-invite after natural expiration. Requires documenting the decision (since the existing per-email-per-job index does NOT use this predicate — this would be a conscious divergence).

Option B: Keep `WHERE revoked_at IS NULL AND client_id IS NOT NULL` but update the `create_client_portal_invite` RPC (or a new service-role path in B-2) to revoke any expired row for the same `(org_id, client_id)` before inserting a new one. This maintains the convention with 00074's existing index while preventing the conflict.

Option C: Acknowledge the expired-token constraint issue as a known gap, document it as a follow-up TD, and keep the current predicate. The practical frequency is low (admins would typically revoke before re-inviting), but the constraint will produce an unexpected 23505 unique-violation if not handled.

This must be explicitly resolved by the plan-author before execute. The plan currently does not address the scenario.

---

## Concern 3 — Backfill safety

**Status: PASS with one edge case to confirm**

The backfill logic in Task 1 steps 2-3 is:

```sql
UPDATE public.client_portal_access cpa
   SET client_id = j.client_id
  FROM public.jobs j
 WHERE cpa.job_id = j.id
   AND cpa.client_id IS NULL
   AND j.client_id IS NOT NULL;
```

Then a forward probe checks:

```sql
SELECT COUNT(*) FROM public.client_portal_access cpa
  JOIN public.jobs j ON j.id = cpa.job_id
 WHERE j.client_id IS NOT NULL AND cpa.client_id IS NULL;
```

**Edge case 1 — `client_portal_access` rows where `job_id` has no matching `jobs` row:** The table has `job_id UUID NOT NULL REFERENCES public.jobs(id)` with no ON DELETE clause — meaning if a job row were hard-deleted (which is forbidden by soft-delete convention), the portal_access row would have a dangling FK. In practice this cannot happen; soft-deletes leave jobs rows intact. Not a blocker; noted.

**Edge case 2 — `client_portal_access` rows where `jobs.client_id IS NULL`:** If a job was created before migration 00100 and never received a `client_id` (because it had no `client_name` data and was therefore skipped in the 00100 backfill), then `cpa.client_id` will remain NULL after the backfill UPDATE. The forward probe correctly does NOT count these as failures — it only checks `WHERE j.client_id IS NOT NULL AND cpa.client_id IS NULL`, which is the right guard. Rows from jobs with no client identity simply get `cpa.client_id = NULL`, which is valid (nullable column). No issue.

**Edge case 3 — jobs with `client_id` pointing at a soft-deleted clients row:** The backfill will set `cpa.client_id` to the soft-deleted client's UUID. This is correct behavior — the token existed for that client. The partial unique index predicate `WHERE revoked_at IS NULL AND client_id IS NOT NULL` would then block creating a new active token for a soft-deleted client at the same `(org_id, client_id)`. This is arguably the right behavior (don't invite a soft-deleted client), but the plan does not address it. Low risk; documented for plan-author awareness.

The pre-flight RAISE NOTICE (not RAISE EXCEPTION) in step 0 is informational only — it does not fail-loud if harness rows are missing. This is explicitly documented as intentional ("Allow 0 or N; do not fail if no harness portal_access rows yet") and is correct. The fail-loud pattern (RAISE EXCEPTION) is reserved for the forward probe in step 3.

---

## Concern 4 — Missing covering index for the new critical query path: BLOCKING

**Status: BLOCKING**

The plan adds `client_id` to `client_portal_access` and the Owner Portal API will issue queries filtered by `client_id` and `org_id`. The Task 1 SQL creates:

```sql
CREATE INDEX idx_client_portal_access_client_id
  ON public.client_portal_access (client_id)
  WHERE revoked_at IS NULL;
```

This index supports `WHERE client_id = $x AND revoked_at IS NULL` lookups. However, the `/owner/{token}` page.tsx (Task 3 step 3) issues the following queries against `jobs`, `draws`, and `change_orders` using the resolved `client_id` and `org_id`:

```
.eq("client_id", $clientId).eq("org_id", $orgId)
```

**The index on `jobs.client_id` exists from migration 00100:**
`idx_jobs_client_id ON public.jobs (client_id) WHERE deleted_at IS NULL` — this supports the jobs query.

**Missing: `draws` queried by job_id, not client_id directly.** The plan resolves the `job_id` from the portal access row and then queries `draws WHERE job_id = $jobId`. The `draws` table (from migration 00001 / scaffolding) needs a `job_id` index to avoid a sequential scan. This is not in the B-2 migration scope, and B-2 does not verify whether this index exists. Given `draws` will grow proportionally to the number of pay applications per job, a missing `draws.job_id` index will cause a table scan on every Owner Portal page load.

**Required action:** Verify via `mcp__supabase__execute_sql` that `draws` has an index on `job_id` before execution. If the index does not exist, B-2's Task 1 migration must add it (or document it as a prerequisite from an earlier migration that can be verified). The same check applies to `change_orders` queried by `job_id`.

This is a blocking gap because B-2 introduces the first production queries against these tables from an external (owner portal) path, and EXPLAIN ANALYZE on the portal page load is not in B-2 scope (it's in B-7). A missing index here will be invisible until B-7 profiling, by which time the pattern is already baked in.

**Query to run before execute dispatch:**
```sql
SELECT indexname, indexdef
  FROM pg_indexes
 WHERE tablename IN ('draws', 'change_orders')
   AND indexdef LIKE '%job_id%';
```

If both tables have `job_id` indexes (likely from the scaffolding migrations), this concern is satisfied. If either is missing, add the index in 00104.

---

## Concern 5 — `actor_token_id` FK and audit durability contract

**Status: PASS**

The plan explicitly declines to add a DB CHECK constraint enforcing `user_id IS NULL XOR actor_token_id IS NULL`, citing three valid reasons: (a) legacy rows with `user_id = NULL` exist (service-role-context inserts), (b) B-3 trigger will write rows where both are NULL (service-role soft-delete context), and (c) application-layer enforcement via `logActivity()` is sufficient because it is the ONLY write path, backed by RLS RESTRICTIVE blocking direct anon INSERTs.

This is the correct call. The audit durability contract (D-078 PI1.1 / CC7.2) is upheld: `ON DELETE SET NULL` on the FK ensures that deleting a `client_portal_access` row never deletes the audit history. The `idx_activity_log_actor_token WHERE actor_token_id IS NOT NULL` partial index supports the display-label query pattern (`WHERE actor_token_id IS NOT NULL` to find homeowner-sourced rows) without bloating the index with the majority of rows that have NULL.

The existing `activity_log` RLS from 00026 (RESTRICTIVE `"org isolation"` + `"members read activity"` SELECT) is unmodified by B-2. The `actor_token_id` column addition does not change the RLS posture — anon still has zero INSERT capability (the RESTRICTIVE policy blocks it; no anon INSERT policy exists). This is verified in AC-B2-13.

One observation: `activity_log` has no `updated_at` column (per 00026 schema), which is correct for an append-only audit table. The `actor_token_id` column addition inherits this append-only posture.

---

## Concern 6 — N+1 risk on `/owner/{token}` page

**Status: WARNING — low risk but needs explicit suppression in plan**

The `/owner/{token}/page.tsx` (Task 3 step 3) issues three separate service-role queries:

1. `jobs` row filtered by `job_id + org_id + client_id`
2. `draws` rows filtered by `job_id` (potentially all draws for the job — unbounded)
3. `change_orders` rows filtered by `job_id` (potentially all change orders for the job — unbounded)

The plan wires these to the existing `OwnerDashboardView` component which was authored for fixture data. On a large job like Drummond (8+ draws, multiple COs), each query returns a manageable result set. The concern is not N+1 in the classic sense (no loop-per-row), but rather three sequential round trips where the job query's result (`job_id`) is required before dispatching the `draws` and `change_orders` queries.

The plan does not use `Promise.all()` to parallelize the draws + change_orders queries after the initial job resolution. This means each Owner Portal page load incurs 3 sequential database round trips instead of the optimal 2 (job resolution → then draws + change_orders in parallel).

This is a WARNING, not a blocker. The practical impact on a sub-30-draw, sub-20-CO job (Drummond scale) is negligible at current scale. The fix is trivial: issue draws and change_orders queries in parallel via `Promise.all()` once `job_id` is resolved. The plan should acknowledge this explicitly and either fix it at execute time or document it as a known optimization deferred to B-7 EXPLAIN ANALYZE.

---

## Concern 7 — Migration idempotency

**Status: PASS**

The forward migration uses `ADD COLUMN` without `IF NOT EXISTS`. This is NOT idempotent — if the migration is applied twice (e.g., after a failed partial apply followed by retry), the second `ALTER TABLE ... ADD COLUMN` will fail with "column already exists". The same applies to the index creation (without `IF NOT EXISTS` on `CREATE INDEX`).

**Assessment:** This is consistent with the existing migration pattern in this codebase. Migrations 00100 and 00101 also use bare `ALTER TABLE ... ADD COLUMN` without `IF NOT EXISTS`. The codebase convention is that migrations are applied once via Supabase's migration tracker (`supabase_migrations.schema_migrations` table), which prevents re-application. Within a single transaction, if the forward probe DO block raises an exception, the entire transaction rolls back atomically, so partial-apply-then-retry is clean.

The down migration correctly uses `DROP INDEX IF EXISTS` and `DROP COLUMN IF EXISTS`, making it idempotent. This is the correct asymmetry: forward migrations are tracked/non-idempotent; down migrations are defensive/idempotent.

No change required.

---

## Concern 8 — Down migration faithfulness and order

**Status: PASS with one observation**

The down migration:

```sql
DROP INDEX IF EXISTS public.idx_activity_log_actor_token;
ALTER TABLE public.activity_log DROP COLUMN IF EXISTS actor_token_id;

DROP INDEX IF EXISTS public.client_portal_access_org_client_active;
DROP INDEX IF EXISTS public.idx_client_portal_access_client_id;
ALTER TABLE public.client_portal_access DROP COLUMN IF EXISTS client_id;

NOTIFY pgrst, 'reload schema';
```

The order is: drop index → drop column for activity_log, then drop indexes → drop column for client_portal_access. This is correct — Postgres requires dropping dependent indexes before dropping the column they index (though `DROP COLUMN` in Postgres will automatically drop dependent indexes, the explicit drop is belt-and-suspenders and follows good practice).

There is no `DROP` of the FK constraint by name. `DROP COLUMN` in Postgres automatically drops the FK constraint that references the column. So `DROP COLUMN actor_token_id` implicitly drops the FK to `client_portal_access(id)`, and `DROP COLUMN client_id` implicitly drops the FK to `clients(id)`. This is correct — no separate `ALTER TABLE ... DROP CONSTRAINT` is needed.

One observation: the down migration does not include `ALTER TABLE public.activity_log DROP COLUMN IF EXISTS actor_token_id` before dropping the `client_portal_access` columns. If the FK from `activity_log.actor_token_id` to `client_portal_access(id)` is present and someone drops `client_portal_access` in a future scenario (not this down migration, but a hypothetical deeper rollback), the FK reference would need to be dropped first. Within the scope of this down migration (which only drops the columns, not the tables), the order is correct.

---

## Concern 9 — EXPLAIN ANALYZE requirements for B-7

**Status: WARNING — gap in B-7 planning, not a B-2 blocker**

B-7 ships `EXPLAIN ANALYZE` on 4 candidate aggregations (`jobs.approved_cos_total`, `jobs.total_committed`, `vendors.balance_outstanding`, `jobs.current_contract_amount`). B-2 introduces a new query pattern that is NOT in B-7's current candidate list: the Owner Portal token resolution + scoped data fetch.

The two queries most likely to benefit from EXPLAIN ANALYZE planning in a B-7 pass are:

1. `SELECT * FROM client_portal_access WHERE access_token_hash = $hash AND revoked_at IS NULL AND expires_at > now()` — the token resolution hot path. The existing `idx_client_portal_access_token_hash` index (unique, partial on `revoked_at IS NULL`) supports this well, but `expires_at > now()` is a range condition not covered by that index. If expired tokens accumulate in large numbers (the table grows unbounded unless revoked rows are periodically purged), the index will still return all `revoked_at IS NULL` rows and then filter by `expires_at` at the heap level.

2. `SELECT * FROM draws WHERE job_id = $jobId ORDER BY draw_number` — the draws-per-job query on the portal page.

These are not blocking B-2 but should be added to B-7's EXPLAIN ANALYZE candidate list. The plan-author should note this as a B-7 carry-forward item in the B-2 SUMMARY (per AC-B2-17 follow-ups).

---

## Concern 10 — `database.types.ts` regen

**Status: PASS**

The plan explicitly includes `src/lib/types/database.types.ts` in `files_modified` (frontmatter line 33) and Task 1's verification block includes `npx supabase gen types typescript --linked > src/lib/types/database.types.ts` (line 449). Task 6's done-condition also cross-references regen (line 770). This satisfies CLAUDE.md Dev Rules requirement for regen in the same commit as the migration. The pre-commit hook `.claude/hooks/nightwork-type-regen.sh` will enforce this gate automatically at commit time.

---

## Summary table

| # | Concern | Status | Resolution Required |
|---|---|---|---|
| 1 | FK shape `ON DELETE SET NULL` on `client_id` + `actor_token_id` | PASS | None |
| 2 | Partial unique index predicate — expired-but-not-revoked tokens not excluded | **BLOCKING** | Plan-author must choose Option A / B / C (see §2 above) and document decision before execute |
| 3 | Backfill safety — edge cases | PASS | None; edge cases acknowledged and handled |
| 4 | Missing `draws` / `change_orders` `job_id` index verification | **BLOCKING** | Run verification query before execute dispatch; add to migration if missing |
| 5 | `actor_token_id` audit durability — FK shape + RLS posture | PASS | None |
| 6 | N+1 risk on portal page — 3 sequential round trips | WARNING | Parallelize draws + change_orders queries via `Promise.all()` or document as deferred optimization |
| 7 | Migration idempotency — forward vs down asymmetry | PASS | None; consistent with codebase convention |
| 8 | Down migration faithfulness and drop order | PASS | None |
| 9 | EXPLAIN ANALYZE candidate list for B-7 — portal query paths not included | WARNING | Add token-resolution + draws-per-job to B-7 EXPLAIN ANALYZE list as carry-forward in B-2 SUMMARY |
| 10 | `database.types.ts` regen | PASS | None; explicitly in `files_modified` + Task 1 + Task 6 |

---

## Blocking item resolutions required before execute dispatch

**BLOCKING-1 (Concern 2):** Plan-author must explicitly choose and document one of Options A/B/C for the expired-token constraint behavior. The EXPANDED-SCOPE wording (`deleted_at IS NULL`) is incorrect for this table — this is a PLAN discrepancy that must be resolved (EXPANDED-SCOPE §7 line 272 says `deleted_at IS NULL`; the table has no such column). Even if the plan-author's chosen SQL predicate (`revoked_at IS NULL AND client_id IS NOT NULL`) is the right call, the plan-review iter-1 should record this discrepancy as resolved-in-plan-body, so QA does not surface it again.

**BLOCKING-2 (Concern 4):** Run the index verification query against the live schema before executing B-2's Task 1. If `draws.job_id` and `change_orders.job_id` indexes already exist from earlier scaffolding migrations, document this in the B-2 SUMMARY under "pre-existing indexes verified." If either is missing, add the CREATE INDEX to migration 00104.

---

*Report written by database-reviewer. Cross-reference with security-reviewer (token surface + RLS posture) and multi-tenant-architect (anon-role scoping) for complete plan-review iter-1 coverage.*
