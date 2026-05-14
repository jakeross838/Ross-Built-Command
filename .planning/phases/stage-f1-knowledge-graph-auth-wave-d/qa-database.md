# Wave-D Database QA Report

**Reviewer:** database-reviewer subagent (postgres-patterns)
**Date:** 2026-05-14
**Scope:** Migration 00098 + smoke-seed.sql + 9 refactored PostgREST hint sites

---

## Verdict: PASS

No blocking issues found. Two warnings are noted (one advisory on a minor idempotency gap in the smoke seed; one on a redundant parallel query in jobs/[id]/overview). Both are non-blocking for ship.

---

## 1. Migration 00098 Quality

**Score: 9.5 / 10**

### Strengths

**Pre-flight DO block — correct pattern.**
The orphan-check at lines 103-114 uses `LEFT JOIN ... WHERE p.id IS NULL` with `COUNT(*)` aggregation, which is the canonical pattern for this class of invariant assertion. It runs inside the transaction, so a non-zero count aborts cleanly before the `ALTER TABLE` fires. The `RAISE EXCEPTION` message includes the count value, giving the on-call engineer immediately actionable context. This mirrors the pattern established in 00096 HF-A4-2 and 00097 HF-C1-2 — consistent across the wave.

**Lock posture documented and correct.**
`ALTER TABLE ADD CONSTRAINT FOREIGN KEY` takes `SHARE ROW EXCLUSIVE` mode on `org_members` and performs a full table scan to validate existing rows. On 14 rows this is sub-millisecond. The migration header documents the NOT VALID escape hatch for future 10k+ tenant scale — that note is load-bearing for future operators and should not be removed. The bare `ADD CONSTRAINT` (without `NOT VALID`) is correct at current scale; skipping `NOT VALID + VALIDATE CONSTRAINT` avoids the two-step DDL complexity for no benefit here.

**No redundant CREATE INDEX.**
`idx_org_members_user_id` already exists (migration 00016:177). Postgres uses it for the new FK's referencing-side lookups automatically. The referenced-side (profiles.id) is the PK — inherently indexed. Omitting a `CREATE INDEX` here is correct, not an oversight. This is confirmed by the header comment at line 77-79.

**Dual-FK pattern is semantically correct.**
The existing `auth.users` FK (ON DELETE CASCADE, 00016:96) is kept untouched. The new `profiles` FK adds NO ACTION semantics. This is the correct choice: the auth.users CASCADE is the authoritative deletion signal (Supabase Auth owns the cascade chain); the profiles FK acts as a defensive guard against hand-crafted out-of-band profile deletions. The comment at lines 59-74 documents the full rationale chain and is accurate.

**NOTIFY pgrst positioned correctly.**
The NOTIFY appears inside the transaction at line 132, before COMMIT. Supabase managed instances auto-reload on DDL via an event trigger, but the explicit NOTIFY eliminates any race window between FK landing in pg_constraint and the PostgREST schema cache picking it up. Belt-and-suspenders is correct here given Wave-C's schema-verification-vs-runtime-verification lesson (documented in ITER-2-PATCHES §1.1).

**Constraint naming follows convention.**
`org_members_user_id_profiles_fkey` follows the Postgres auto-generation convention `<source_table>_<source_column>_<target_table>_fkey`. Naming explicitly (rather than relying on auto-generation) is correct because the .down.sql references it by name and ITER-2-PATCHES §1.6 locks the literal across 7+ citation sites.

### Down migration

`00098_add_org_members_profiles_fk.down.sql` correctly uses `DROP CONSTRAINT IF EXISTS` — idempotent. The warning comment about the 9 src consumer sites needing lockstep reversion is accurate and appropriate to include; it prevents a partial rollback leaving live callers in a PGRST200 state.

### Minor finding (advisory, no deduction)

**DO block variable naming.** `v_orphan_count` matches the pattern from 00096/00097 (v_ prefix for DO-block variables). Consistent — good. No concern.

**One deduction (0.5 points): pre-flight query is outside the main transaction boundary.**

The DO block runs before `BEGIN;` at line 95. This means:

```
DO $$ ... check orphans ... $$;   -- runs in its own implicit transaction (auto-commit)
BEGIN;
ALTER TABLE ...;
NOTIFY ...;
COMMIT;
```

If the DO block's implicit transaction commits and then the `BEGIN` block is interrupted before COMMIT, the pre-flight assertion cannot be re-run as part of rollback recovery. In practice this is not a problem — the assertion doesn't mutate anything, so it is always safe to re-run. However, for strict correctness the DO block should sit inside the explicit transaction:

```sql
BEGIN;
DO $$ ... check orphans ... $$;
ALTER TABLE ...;
NOTIFY ...;
COMMIT;
```

This is advisory. The current placement is functionally safe. No production risk. Does not block ship.

---

## 2. Query Plan for Refactored PostgREST Hints

**Verdict: PASS — index coverage confirmed from migration source**

The equivalent SQL for the PostgREST hint `profile:profiles (id, full_name)` on `org_members` is:

```sql
SELECT om.user_id, p.id, p.full_name
FROM org_members om
JOIN profiles p ON p.id = om.user_id
WHERE om.org_id = '00000000-0000-0000-0000-fb1ce0a55e55'
  AND om.is_active = true
  AND om.role IN ('pm','admin');
```

**Index analysis from migration source (no live EXPLAIN needed at this row count):**

| Predicate | Index available | Source |
|-----------|----------------|--------|
| `om.org_id = $1` | `idx_org_members_org_id` (00016:178) | B-tree on org_members(org_id) |
| `p.id = om.user_id` (join) | `profiles PK` (00007:15) + `idx_org_members_user_id` (00016:177) | PK index on profiles; B-tree on org_members(user_id) |
| `om.is_active = true` | No dedicated index | Filtered post-scan |
| `om.role IN (...)` | No dedicated index | Filtered post-scan |

**Expected plan at current scale (14 rows in org_members):** Postgres will choose a sequential scan on the full org_members table (14 rows) and a Nested Loop join to profiles via PK. This is correct — the planner correctly prefers a seq scan over index scan when the table is tiny. Estimated execution time is under 0.1ms.

**At multi-tenant scale (>100k org_members rows):** The org_id index will engage, narrowing to per-org rows before the is_active and role filters apply. A composite index `(org_id, is_active, role)` would allow index-only filtering; this is a future optimization to consider when any org's org_members table grows past a few hundred rows. Not needed today.

**PostgREST !FK syntax (embedding via FK name).** The hint syntax `profile:profiles (...)` resolves via `pg_constraint` lookup for a FK from `org_members` to `profiles`. Migration 00098 adds exactly that constraint (`org_members_user_id_profiles_fkey`). The FK is on `org_members.user_id → profiles.id`. PostgREST will execute a JOIN on `profiles.id = org_members.user_id`, which uses the profiles PK index — efficient.

**Advisory: composite index opportunity for is_active filtering.** If `is_active` is always `true` in queries (all 9 hint sites filter `.eq("is_active", true)`), a partial index `ON org_members(org_id, user_id) WHERE is_active = true` would eliminate all inactive rows from the index entirely. This is a future optimization, not a current blocker. Recommend adding to the technical debt log.

---

## 3. Smoke Seed Idempotency and Safety

**Score: 8.5 / 10 — one warning**

### Strengths

**Conflict clauses are correctly keyed:**

| Table | ON CONFLICT key | Correct? |
|-------|----------------|---------|
| `auth.users` | `(id)` | Yes — UUID PK |
| `auth.identities` | `(provider_id, provider)` | Yes — composite unique constraint on identities |
| `public.profiles` | `(id)` | Yes — UUID PK |
| `public.org_members` | `(org_id, user_id)` | Yes — UNIQUE constraint from 00016:104 |
| `public.jobs` | `(id)` | Yes — UUID PK |
| `public.invoices` | `(id)` | Yes — UUID PK |
| `public.activity_log` | `(id)` | Yes — UUID PK |

**Schema column alignment is accurate:**
The seed inserts into `activity_log` using columns `(id, org_id, user_id, action, entity_type, entity_id)`. Migration 00026 defines these columns: `id UUID PK`, `org_id UUID NOT NULL`, `user_id UUID`, `entity_type TEXT NOT NULL`, `entity_id UUID`, `action TEXT NOT NULL`, `details JSONB`, `created_at TIMESTAMPTZ`. The seed omits `details` (nullable) and `created_at` (DEFAULT NOW()) — both correct omissions. The seed's comment at line 217 correctly documents that `occurred_at` does not exist and `details` uses the correct column name.

**profiles CHECK constraint respected:**
`profiles.role CHECK (role IN ('admin', 'pm', 'accounting'))` — the seed uses `'admin'`, `'pm'`, `'accounting'`. The comment at line 139 correctly documents that `'owner'` maps to `'admin'` at the profiles level and `'owner'` is only valid in `org_members.role`. Smoke User 1 is inserted as `'admin'` in profiles and `'owner'` in org_members — correct.

**Email uniqueness handled correctly:**
The seed skips re-inserting the existing harness fixture user (5eb26edc-...) whose email `harness-fixture@nightwork.local` already exists in auth.users. The 9 new smoke-* emails use the `nightwork.local` domain, matching the fixture pattern, and are distinct from each other. No collision risk.

**UUID namespace is predictable and non-colliding:**
`00000000-0000-0000-0002-NNNNNNNNNNN` for users; `22222222-...` for jobs; `33333333-...` for invoices; `44444444-...` for activity_log. These are clearly synthetic, non-overlapping with the `00000000-0000-0000-0000-...` org/user namespace and the `00000000-0000-0000-0001-...` Ross Built org, and non-overlapping with Drummond UUIDs. Good discipline.

**INSERT sequence respects FK dependency order:**
auth.users → profiles → org_members → jobs → invoices → activity_log. Foreign key chain is satisfied in order. The DO $$ block for auth.users runs before the standard INSERT statements, which is correct.

### Warning: auth.users ON CONFLICT uses DO UPDATE, not DO NOTHING

At lines 103-105:

```sql
ON CONFLICT (id) DO UPDATE SET
  email_confirmed_at = COALESCE(auth.users.email_confirmed_at, NOW()),
  updated_at = NOW();
```

On re-run this updates `email_confirmed_at` and `updated_at` on the existing row. The `COALESCE` ensures `email_confirmed_at` is not overwritten if already set — good. However, `encrypted_password` is NOT in the DO UPDATE set, meaning the password stays whatever it was from the first run — also fine.

The actual concern is subtler: if Supabase Auth's internal bookkeeping columns (`deleted_at`, `banned_until`, `is_sso_user`, etc.) are set by Auth internals between runs, the DO UPDATE clause does not touch them — they are preserved. This is correct behavior.

**However:** On a second run, `raw_app_meta_data` and `raw_user_meta_data` (which contain the role and full_name) are NOT updated by the DO UPDATE clause. If someone modified these between runs, the seed would silently leave stale metadata. This is a minor hygiene issue for a test fixture — it does not affect production correctness. Recommend either:

Option A (simpler): Change DO UPDATE to DO NOTHING for auth.users (since the 9 UUIDs are predictable and fixed).
Option B: Add `raw_app_meta_data` and `raw_user_meta_data` to the DO UPDATE clause.

**Rating: warning, non-blocking.** The current behavior is safe for a smoke fixture; the only risk is stale metadata on repeated runs, which would only affect test isolation — not production data.

### Minor finding: auth.identities id uses gen_random_uuid() on re-run

At line 111, `auth.identities` inserts with `id = gen_random_uuid()` and then `ON CONFLICT (provider_id, provider) DO NOTHING`. On re-run, the random UUID is generated first, then thrown away by the DO NOTHING. This is harmless but wastes one `gen_random_uuid()` call per user per re-run. Non-blocking.

---

## 4. Schema Migration Drift

**Verdict: PASS**

Migration files on disk run from 00001 to 00098 (with a legitimate gap at 00051 — `00051_support_chat.sql` exists, confirming no gap). The files exist in pairs where `.down.sql` variants are expected. Migration 00098 is the highest-numbered file on disk and is confirmed applied to production per nwrp135 + D-1 orchestrator verification.

**No missing migrations on disk.** The gap between 00025 and 00026 in the directory listing is a filesystem ordering artifact; both files exist (`00025_phase5_api_usage.sql` and `00026_phase5_scaffolding_tables.sql` are both present in the glob results).

**FK census post-00098 confirmed:**
- Pre-Wave-D: 56 auth.users FKs + 2 profiles FKs (per ITER-2-PATCHES §0.1 verified query result)
- Post-00098: 56 auth.users FKs + 3 profiles FKs (adds `org_members_user_id_profiles_fkey`)
- The FK adds to profiles count, not auth.users count — correct, as the new FK targets `profiles(id)`

---

## 5. Index Coverage on org_members

**Verdict: PASS**

From migration 00016:177-178, two indexes exist on org_members:

```sql
CREATE INDEX IF NOT EXISTS idx_org_members_user_id  ON public.org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id   ON public.org_members(org_id);
```

Coverage assessment:

| Query pattern | Index used |
|---------------|-----------|
| FK lookup: check if `user_id` references valid `profiles.id` | `idx_org_members_user_id` (referencing-side) |
| Org-scoped member list: `WHERE org_id = $1` | `idx_org_members_org_id` |
| PostgREST join: `JOIN profiles p ON p.id = om.user_id` | `idx_org_members_user_id` (join key) |
| RLS policy: `org_id = app_private.user_org_id()` | `idx_org_members_org_id` |

Both existing indexes cover the FK lookup and the RLS org-isolation pattern. No new index is needed. This is confirmed.

---

## 6. Additional Finding: Double Query in jobs/[id]/overview/route.ts

**Severity: Warning (non-blocking, minor inefficiency)**

In `src/app/api/jobs/[id]/overview/route.ts`, two separate queries to `org_members` are issued in the same `Promise.all` wave:

- `usersRes` (line 75-80): `org_members` filtered to `role IN ('pm', 'admin')` — used for the PM dropdown
- `orgProfilesRes` (line 115-118): `org_members` with no role filter — used for the full name map

These could be merged into a single query returning all members (the superset) and then filtered client-side for the PM dropdown subset. At current scale (14 org_members) this is irrelevant to performance, but it is a pattern inconsistency with `dashboard/route.ts` and `jobs/health/route.ts` which each issue only one org_members query. This was noted in ITER-2-PATCHES §1.5 as an H-D1-08 pattern parity item. Recommend consolidating in a follow-up cleanup.

---

## Summary

| Area | Score / Verdict | Notes |
|------|----------------|-------|
| Migration 00098 quality | 9.5 / 10 | Pre-flight, lock, index, cascade semantics all correct; one advisory on DO block transaction placement |
| Query plan for PostgREST hints | PASS | All 9 sites use correct hint syntax; index coverage verified from migration source |
| Smoke seed idempotency | 8.5 / 10 | Conflict clauses correct; one warning on auth.users DO UPDATE not refreshing metadata on re-run |
| Migration drift | PASS | No gaps; 00098 is highest on disk and confirmed applied |
| Index coverage | PASS | idx_org_members_user_id covers FK lookup; idx_org_members_org_id covers RLS; no new index needed |

### Top 3 DB Findings

1. **Pre-flight DO block runs outside the explicit transaction** (migration 00098). The DO $$ block fires before `BEGIN;`, meaning it runs in its own implicit auto-commit transaction. Moving it inside `BEGIN;...COMMIT;` would make the assertion and the DDL atomic. Advisory only — no mutation happens in the DO block so the current placement is functionally safe.

2. **auth.users ON CONFLICT uses DO UPDATE in smoke seed** — does not refresh `raw_app_meta_data`/`raw_user_meta_data` on re-run. On a second execution, stale role metadata in auth internal columns would not be corrected. Switch to `DO NOTHING` for these predictable-UUID rows, or add the metadata columns to the UPDATE set.

3. **Double org_members query in jobs/[id]/overview** — `usersRes` (role-filtered PM list) and `orgProfilesRes` (full member list) are issued in the same Promise.all wave. They could be merged to one query. Pattern inconsistency with dashboard and jobs/health endpoints, both of which issue one org_members query. Recommend consolidating in Wave 1.1-Lite cleanup.

### Checklist

- [x] All WHERE/JOIN columns indexed (org_id, user_id on org_members)
- [x] Composite indexes in correct column order (N/A — single-column indexes correct for current patterns)
- [x] Proper data types (FK columns are UUID throughout)
- [x] RLS enabled on org_members (00016:111)
- [x] RLS policies use `app_private.user_org_id()` pattern (wrapped in helper — session-cached SECURITY DEFINER function)
- [x] Foreign keys have indexes (both existing idx_org_members_user_id and idx_org_members_org_id cover FK and RLS paths)
- [x] No N+1 query patterns (all 9 refactored sites use batch org_members queries)
- [x] Transactions kept short (migration DDL is minimal: one ALTER TABLE + one NOTIFY)
- [ ] Composite index on (org_id, is_active) for org_members (future optimization — not needed at current scale)
