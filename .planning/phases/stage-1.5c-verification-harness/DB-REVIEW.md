# DB Review — stage-1.5c-verification-harness migrations

Reviewer: database-reviewer subagent
Date: 2026-05-07
Migrations reviewed: 00092, 00093

---

## Verdict: PASS — 0 critical findings, 1 advisory

---

## Checklist Results

### 1. Idempotency

PASS. Every INSERT in both migrations uses `ON CONFLICT DO NOTHING`:

- `00092` step 1: `ON CONFLICT (id) DO NOTHING` — organizations PK.
- `00092` step 2: `ON CONFLICT (org_id, user_id) DO NOTHING` — matches the `UNIQUE (org_id, user_id)` constraint defined in migration 00016.
- `00092` step 3: `ON CONFLICT (id) DO NOTHING` — profiles PK (`id UUID PRIMARY KEY`).
- `00093`: identical `ON CONFLICT (id) DO NOTHING` profiles INSERT.

All four conflict targets map to real constraints in the schema. Re-running either migration against a fully-bootstrapped DB is a verified no-op.

### 2. Query Plan

PASS. Both migrations are purely seed-data INSERTs. The only read is a `SELECT … FROM auth.users WHERE email = 'harness-fixture@nightwork.local'` — a point lookup on the indexed `email` column of the internal Supabase `auth.users` table. No tenant tables are scanned. No `EXPLAIN ANALYZE` is needed; there is no planner-sensitive path.

### 3. Schema Integrity

PASS. No `ALTER TABLE`, no new columns, no DDL of any kind. Only INSERTs into three pre-existing tables (`organizations`, `org_members`, `profiles`). The `profiles` INSERT supplies all NOT NULL columns (`id`, `full_name`, `email`, `role`, `org_id`) and respects the `CHECK (role IN ('admin','pm','accounting'))` constraint by inserting `'admin'`.

### 4. Migration Ordering Safety

PASS. 00092 and 00093 are the two highest-numbered migrations on this branch; no 00094+ exists. Cold-bootstrap path: 00092 v2 runs first (seeds org + org_members + profiles, all no-ops if user absent), then 00093 (profiles INSERT, no-op via ON CONFLICT). Live-DB patch path: 00092 v2 is already recorded as applied, so 00093 runs the corrective profiles INSERT only. Both paths converge to the same state: organizations row + org_members row + profiles row all present.

### 5. Data Integrity and Chicken-and-Egg Chain

PASS. The chain is fully documented in the 00092 comment block. The dependency order is:

1. `auth.admin.createUser` (one-time manual step, documented in Plan 5 README).
2. Migration 00092 (or re-run) — SELECT-from-auth.users guard returns the user and inserts org, org_members, profiles.
3. If step 1 was not yet done when 00092 first ran, the org INSERT still succeeds (it has no auth.users dependency); org_members and profiles INSERTs silently skip (SELECT returns 0 rows). Re-running after step 1 completes binds both rows.

The RLS dependency chain is correctly identified: `app_private.user_org_id()` reads `profiles.org_id` (defined in migration 00016); without a profiles row `user_org_id()` returns NULL; the `org_members` SELECT policy `USING (org_id = app_private.user_org_id())` evaluates to NULL and hides the row. Migration 00093 and 00092 v2 both close this gap. The documented diagnosis in both migration comment blocks is accurate.

### 6. Rollback Safety

PASS with advisory. `00092_verification_harness_fixture_org.down.sql` exists and follows the project soft-delete convention: `UPDATE organizations SET deleted_at = NOW()` + `UPDATE org_members SET is_active = FALSE`. The down migration is idempotent (UPDATE with a WHERE guard, safe to re-run).

**Advisory (non-blocking):** `00093` has no `.down.sql` file. Because 00093 is purely a corrective profiles INSERT that 00092 v2 already covers going forward, a separate down migration for 00093 is low value — running 00092's down migration soft-deletes the fixture org and deactivates the membership, which renders the profiles row inert (the harness session auth fails at org lookup before the profiles row matters). However, for completeness and to match the convention established by migrations 00060–00082 (most of which ship paired down files), a minimal down file for 00093 would be:

```sql
-- Corrective: if needed, remove the harness profiles row seeded by 00093.
-- Running 00092.down.sql is sufficient for full harness retirement;
-- this file exists only for migration-tooling parity.
BEGIN;
DELETE FROM public.profiles
WHERE id = (SELECT id FROM auth.users WHERE email = 'harness-fixture@nightwork.local')
  AND email = 'harness-fixture@nightwork.local';
COMMIT;
```

This is a recommendation only. The absence does not create a data-loss or correctness risk because the fixture org UUID is mnemonic and reserved (`00000000-0000-0000-0000-fb1ce0a55e55`).

---

## Index Review

No new indexes are needed. The migrations do not add columns, and the auth.users email lookup is already served by Supabase's internal index on `auth.users.email`.

## RLS Review

No new RLS policies. Existing policies on `organizations`, `org_members`, and `profiles` (migrations 00016, 00049) apply to the fixture org's rows exactly as they apply to any other org — the harness session is bounded to the fixture org by construction. No RLS bypass or special grant was added by these migrations.

---

## Summary

| Check | Result |
|---|---|
| Idempotency (ON CONFLICT targets match real constraints) | PASS |
| Query plan (no table scans on tenant tables) | PASS |
| Schema integrity (no DDL, no type violations) | PASS |
| Migration ordering (cold-bootstrap and live-patch converge) | PASS |
| Data integrity (chicken-and-egg chain documented + no-op fallback) | PASS |
| Rollback safety (down file exists for 00092) | PASS |
| 00093 down file | ADVISORY — absent, non-blocking |

Critical findings: 0
Advisory findings: 1 (missing 00093.down.sql — cosmetic, no correctness risk)
