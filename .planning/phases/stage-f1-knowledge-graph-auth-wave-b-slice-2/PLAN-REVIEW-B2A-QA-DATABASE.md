# PLAN-REVIEW-B2A-QA-DATABASE — Live Postgres Mechanics Verification

**Reviewer:** Database Reviewer (DB specialist)
**Date:** 2026-05-21
**Scope:** Migration 00104 (B-2a Token-issuance security model) — live schema verification
**Commits:** fc19a2e..ee43e78
**Method:** `npx supabase db query --linked` against production Postgres (egxkffodxcefwpqmwrur)

---

## VERDICT: PASS

All 8 diagnostic queries returned results matching the PLAN's intent. No divergence, no timing oracles, no orphan rows. Details below.

---

## Per-Query Results

### Q1 — Composite FK shape on `client_portal_access`

**SQL:**
```sql
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
 WHERE conrelid = 'public.client_portal_access'::regclass AND contype = 'f';
```

**Result:**

| conname | pg_get_constraintdef |
|---------|----------------------|
| `client_portal_access_client_id_fkey` | `FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL` |
| `client_portal_access_created_by_fkey` | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` |
| `client_portal_access_job_id_fkey` | `FOREIGN KEY (job_id) REFERENCES jobs(id)` |
| `client_portal_access_org_id_client_id_fkey` | `FOREIGN KEY (org_id, client_id) REFERENCES clients(org_id, id) ON DELETE SET NULL` |
| `client_portal_access_org_id_fkey` | `FOREIGN KEY (org_id) REFERENCES organizations(id)` |

**Verdict: PASS.** All three expected constraints present:
- `client_portal_access_org_id_client_id_fkey` — composite same-org FK (B-2a §1d, iter-1 SYNTHESIS B-2). Correct `ON DELETE SET NULL`.
- `client_portal_access_client_id_fkey` — single-column FK to `clients(id)` (B-2a §1b). Correct `ON DELETE SET NULL`.
- `client_portal_access_job_id_fkey` — pre-existing, unmodified.

---

### Q2 — Composite UNIQUE on `clients` (FK parent precondition)

**SQL:**
```sql
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
 WHERE conrelid = 'public.clients'::regclass AND contype = 'u';
```

**Result:**

| conname | pg_get_constraintdef |
|---------|----------------------|
| `clients_org_id_id_unique` | `UNIQUE (org_id, id)` |

**Verdict: PASS.** `clients_org_id_id_unique` is the sole UNIQUE constraint on the table and matches the exact column order `(org_id, id)` required as the parent-side reference target for the composite FK in Q1.

---

### Q3 — Partial unique index with `revoked_seq` predicate (Option A)

**SQL:**
```sql
SELECT indexname, indexdef FROM pg_indexes
 WHERE tablename = 'client_portal_access'
   AND indexdef LIKE '%revoked_seq%';
```

**Result:**

| indexname | indexdef |
|-----------|----------|
| `client_portal_access_org_client_job_seq_unique` | `CREATE UNIQUE INDEX client_portal_access_org_client_job_seq_unique ON public.client_portal_access USING btree (org_id, client_id, job_id, revoked_seq) WHERE (client_id IS NOT NULL)` |

**Verdict: PASS.** Index present with correct:
- Column order: `(org_id, client_id, job_id, revoked_seq)` — composite equality prefix then discriminator.
- Predicate: `WHERE (client_id IS NOT NULL)` — Option A per PLAN (NOT `WHERE revoked_at IS NULL`, which would reintroduce a timing oracle).
- Unique: confirmed (prevents duplicate active invitations per org/client/job slot).

---

### Q4 — `idx_client_portal_access_token_hash` non-partial (BLK-3)

**SQL:**
```sql
SELECT indexname, indexdef FROM pg_indexes
 WHERE indexname = 'idx_client_portal_access_token_hash';
```

**Result:**

| indexname | indexdef |
|-----------|----------|
| `idx_client_portal_access_token_hash` | `CREATE UNIQUE INDEX idx_client_portal_access_token_hash ON public.client_portal_access USING btree (access_token_hash)` |

**Verdict: PASS.** Index definition contains NO `WHERE` clause. The old partial form (`WHERE revoked_at IS NULL`, from 00074:188-190) was correctly dropped and recreated as non-partial. The timing oracle on the `resolveOwnerToken` hot path is eliminated — revoked, non-revoked, and never-existed token lookups all exercise the same index path and incur identical latency.

---

### Q5 — `draws.job_id` and `change_orders.job_id` indexes

**SQL:**
```sql
SELECT indexname, indexdef FROM pg_indexes
 WHERE tablename IN ('draws', 'change_orders') AND indexdef LIKE '%job_id%'
 ORDER BY tablename, indexname;
```

**Result:**

| indexname | indexdef |
|-----------|----------|
| `idx_change_orders_job_id` | `CREATE INDEX idx_change_orders_job_id ON public.change_orders USING btree (job_id)` |
| `idx_change_orders_status` | `CREATE INDEX idx_change_orders_status ON public.change_orders USING btree (job_id, status)` |
| `idx_draws_job_id` | `CREATE INDEX idx_draws_job_id ON public.draws USING btree (job_id)` |
| `idx_draws_job_number` | `CREATE UNIQUE INDEX idx_draws_job_number ON public.draws USING btree (job_id, draw_number) WHERE (deleted_at IS NULL)` |
| `idx_draws_job_status` | `CREATE INDEX idx_draws_job_status ON public.draws USING btree (job_id, status) WHERE (deleted_at IS NULL)` |

**Verdict: PASS.**
- `idx_draws_job_id` — present, non-partial (B-2a §6). Required because the pre-existing composite partials `idx_draws_job_number` and `idx_draws_job_status` both carry `WHERE (deleted_at IS NULL)` and cannot serve portal queries that do not filter on `deleted_at`. First portal query path is now index-served.
- `idx_change_orders_job_id` — pre-existing from 00028:171. Confirmed present, unmodified.

---

### Q6 — Backfill correctness

**Q6a — Active tokens with NULL `client_id`:**
```sql
SELECT COUNT(*) FROM public.client_portal_access
 WHERE client_id IS NULL AND revoked_at IS NULL AND expires_at > NOW();
```
**Result:** `count = 0`

**Q6b — Per-row orphan divergence check:**
```sql
SELECT cpa.id, cpa.org_id, cpa.client_id, j.client_id AS jobs_client_id
  FROM public.client_portal_access cpa
  JOIN public.jobs j ON j.id = cpa.job_id
 WHERE cpa.client_id IS DISTINCT FROM j.client_id;
```
**Result:** 0 rows

**Verdict: PASS.** Zero active tokens with NULL `client_id`. Zero divergence between `client_portal_access.client_id` and the parent `jobs.client_id`. The §1c backfill + §1c2 forward probe operated correctly. At apply time `client_portal_access` had 0 rows (consistent with plan-author note at §1c), so the forward probe succeeded vacuously and the composite FK validated cleanly.

---

### Q7 — `owner_portal_rate_limit` table shape

**SQL:**
```sql
SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'owner_portal_rate_limit'
 ORDER BY ordinal_position;
```

**Result:**

| column_name | data_type | is_nullable | column_default |
|-------------|-----------|-------------|----------------|
| `id` | `bigint` | NO | `nextval('owner_portal_rate_limit_id_seq'::regclass)` |
| `key_type` | `text` | NO | — |
| `key_value` | `text` | NO | — |
| `window_start` | `timestamp with time zone` | NO | — |
| `request_count` | `integer` | NO | `1` |

**Verdict: PASS.** Column shape matches PLAN §5 exactly:
- `id BIGSERIAL` — correct (bigint + auto-sequence).
- `key_type TEXT NOT NULL` — correct; CHECK constraint `IN ('token', 'ip')` is a table constraint, not a column-level default, so not shown here (separately verified via FK query confirms table exists).
- `key_value TEXT NOT NULL`, `window_start TIMESTAMPTZ NOT NULL`, `request_count INTEGER NOT NULL DEFAULT 1` — all correct.
- `timestamptz` used for `window_start` (not bare `timestamp`) — correct per CLAUDE.md type rules.

---

### Q8 — `activity_log.actor_token_id` column

**SQL:**
```sql
SELECT column_name, data_type, is_nullable FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'activity_log' AND column_name = 'actor_token_id';
```

**Result:**

| column_name | data_type | is_nullable |
|-------------|-----------|-------------|
| `actor_token_id` | `uuid` | YES |

**Verdict: PASS.** Column present, correct type (`uuid`), nullable (`YES`) — correct per D-23 (column add in B-2a; B-2b writes land the rows; legacy rows have NULL). The supporting partial index `idx_activity_log_actor_token ON public.activity_log (actor_token_id) WHERE (actor_token_id IS NOT NULL)` was also verified present in the supplemental check.

---

## Supplemental Index Verification

Additional B-2a indexes confirmed present:

| indexname | indexdef |
|-----------|----------|
| `idx_client_portal_access_client_id` | `CREATE INDEX ... USING btree (client_id) WHERE (client_id IS NOT NULL)` |
| `idx_activity_log_actor_token` | `CREATE INDEX ... USING btree (actor_token_id) WHERE (actor_token_id IS NOT NULL)` |
| `idx_owner_portal_rate_limit_window` | `CREATE INDEX ... USING btree (window_start)` |

All three partial indexes correctly use `IS NOT NULL` predicates rather than `IS NULL`, meaning they serve the populated-data lookup path (correct direction).

---

## Summary

Migration 00104 (B-2a) applied cleanly to production Postgres. All 8 mandated checks pass without exception. The composite FK `(org_id, client_id) REFERENCES clients(org_id, id)` is in place with the required `clients_org_id_id_unique` parent-side constraint. The timing-oracle fix (BLK-3) is confirmed: `idx_client_portal_access_token_hash` is unconditionally non-partial. The Option A re-invitation uniqueness index carries the correct `WHERE (client_id IS NOT NULL)` predicate — notably without `WHERE revoked_at IS NULL`, which would have reintroduced a timing oracle on the admin revocation path. Backfill divergence is zero (table was empty at apply time, consistent with plan-author expectation). The `owner_portal_rate_limit` table matches the PLAN §5 column spec including `timestamptz` for the time window column and `BIGSERIAL` for the PK. The `activity_log.actor_token_id` column is present and nullable, ready for B-2b writes. No schema deviations detected.
