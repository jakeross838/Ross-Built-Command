-- ============================================================================
-- 00100_clients_schema_foundation.down.sql
-- ============================================================================
--
-- ROLLBACK for 00100. Best-effort archaeology only -- emergency rollback path.
-- Removes jobs.client_id column + drops clients table + drops user_org_role
-- helper.
--
-- Per nwrp154 Path A: this down migration is SIMPLER than the original (pre-
-- Path-A) version because B-1a does NOT drop the embedded jobs.client_*
-- columns. Reverse-backfill from clients -> jobs is unnecessary -- the
-- embedded columns were never touched by the up migration, so they remain
-- populated with their original values. Backfilled clients rows ARE LOST on
-- down (the table itself is dropped), but the source-of-truth data lives on
-- in the embedded columns.
--
-- ============================================================================
-- ROLLBACK CHAIN ORDERING (per iter-2 §2.10 + data-migration CP-4 + nwrp155):
-- ============================================================================
-- This down migration drops the `clients` table + jobs.client_id column. If
-- executing multi-migration rollback after Slice-1 has shipped:
--
--   1. 00101.down -- re-add jobs.client_name/email/phone (data NOT restored;
--                    coordinated with B-1a-bis source-code revert)
--   2. 00100.down -- this migration (drop clients + jobs.client_id + helper)
--   3. 00099.down -- drop 11 FK constraints (optional; not strictly required
--                    if rollback is targeted at Slice-1 only)
--
-- Standalone rollback of 00100 (after 00101 ran): SAFE. The clients table is
-- gone; backfilled data lost; original jobs.client_* columns restored
-- (nullable; data not restored per 00101.down contract).
--
-- WARNING: If B-1a-bis (migration 00101) has ALREADY shipped at down-time,
-- the embedded columns WILL have been dropped by 00101. In that case,
-- applying THIS down migration WITHOUT first applying 00101.down would
-- orphan all jobs (no client_id column AND no embedded client_*). 00101.down
-- MUST always be applied first if it shipped.
--
-- ============================================================================
-- DROP HELPER FUNCTION CAVEAT
-- ============================================================================
-- `app_private.user_org_role()` was created by 00100.up per nwrp156 iter-2.5
-- amendment. No other migration depends on it as of 00100 ship. Dropping it
-- here is safe. If a future migration (F2+) references the helper, that
-- migration's own ordering must ensure 00100 has shipped first; rolling back
-- 00100 in that scenario would also require rolling back the dependent
-- migration first. CASCADE on DROP FUNCTION is intentionally omitted -- if
-- a future plan ADDs a dependent policy without re-creating the helper in
-- its own migration, DROP FUNCTION will fail loudly, blocking incoherent
-- rollback.
--
-- Step order (reverse of up):
--   1. DROP INDEX idx_jobs_client_id (auto-drops with column).
--   2. ALTER TABLE jobs DROP COLUMN client_id (auto-drops FK + partial idx).
--   3. DROP TABLE public.clients CASCADE (drops policies + indexes + trigger
--      + fixture row in one shot).
--   4. DROP FUNCTION app_private.user_org_role().
--   5. NOTIFY pgrst.
-- ============================================================================

BEGIN;

-- 1. Drop jobs.client_id (column drop auto-drops FK + partial index).
ALTER TABLE public.jobs DROP COLUMN IF EXISTS client_id;

-- 2. Drop clients table + cascade (policies + indexes + fixture row + trigger).
-- nightwork: drop-justified — emergency rollback of 00100.up creation; per nwrp154 Path A this down migration is the canonical reverse of the table creation in the up migration. Backfilled rows are data-loss-tolerable because source data persists in jobs.client_name/email/phone columns (B-1a leaves them populated; only B-1a-bis migration 00101 drops them).
DROP TABLE IF EXISTS public.clients CASCADE;

-- 3. Drop user_org_role helper (no other migration depends on it post-00100).
DROP FUNCTION IF EXISTS app_private.user_org_role();

-- 4. NOTIFY PostgREST.
NOTIFY pgrst, 'reload schema';

COMMIT;
