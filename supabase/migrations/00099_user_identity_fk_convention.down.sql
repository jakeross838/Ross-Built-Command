-- ============================================================================
-- ROLLBACK CHAIN ORDERING (per data-migration CP-4 + nwrp155):
-- ============================================================================
-- This down migration drops 11 FK constraints added in 00099.up. If executing
-- a multi-migration rollback after Slice-1 has shipped, execute in this order:
--
--   1. 00101.down -- re-add jobs.client_name/email/phone (data NOT restored;
--                    coordinated with B-1a-bis source-code revert)
--   2. 00100.down -- drop jobs.client_id + drop clients table
--   3. 00099.down -- drop 11 FK constraints (this migration)
--
-- Single-migration rollback of 00099 alone is safe (no downstream FK
-- dependency on the constraints being dropped here). The chain ordering
-- matters only if 00100/00101 were applied and need rolling back too.
-- ============================================================================
--
-- Reverse migration 00099: Drop the 11 FK constraints added by 00099 forward.
--
-- All 11 DROP CONSTRAINT statements use IF EXISTS — idempotent.
--
-- WARNING: Applying this .down.sql removes the structural enforcement of the
-- D-080 convention. Audit-trail durability (CC7.2) reverts to pre-codification
-- posture (auth.users-row deletion would silently orphan audit rows).
-- Acceptable only as an emergency rollback within hours of 00099 apply,
-- BEFORE any production traffic depends on the FK enforcement.
--
-- jobs.pm_id PostgREST embed-resolution depends on jobs_pm_id_profiles_fkey.
-- IF Wave 1.1-Lite has already refactored src/app/jobs/[id]/page.tsx to use
-- the embed pattern before this .down is applied, the embed will return
-- PGRST200 again — same regression Wave-D Issue 1 fixed. As of slice ship
-- (2026-05-15-ish), no consumer uses the embed, so .down is safe at slice
-- ship time.

BEGIN;

ALTER TABLE public.change_orders DROP CONSTRAINT IF EXISTS change_orders_created_by_fkey;
ALTER TABLE public.draws DROP CONSTRAINT IF EXISTS draws_approved_by_fkey;
ALTER TABLE public.draws DROP CONSTRAINT IF EXISTS draws_created_by_fkey;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_created_by_fkey;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_duplicate_dismissed_by_fkey;
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_created_by_fkey;
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_pm_id_profiles_fkey;
ALTER TABLE public.lien_releases DROP CONSTRAINT IF EXISTS lien_releases_created_by_fkey;
ALTER TABLE public.parser_corrections DROP CONSTRAINT IF EXISTS parser_corrections_corrected_by_fkey;
ALTER TABLE public.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_created_by_fkey;
ALTER TABLE public.vendors DROP CONSTRAINT IF EXISTS vendors_created_by_fkey;

NOTIFY pgrst, 'reload schema';

COMMIT;
