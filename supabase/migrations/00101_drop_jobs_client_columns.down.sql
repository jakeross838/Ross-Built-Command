-- ============================================================================
-- 00101_drop_jobs_client_columns.down.sql
-- ============================================================================
--
-- ROLLBACK for 00101. Re-adds the 3 columns (client_name, client_email,
-- client_phone) on public.jobs as nullable TEXT but DOES NOT restore data.
--
-- WARNING: data NOT restored on rollback. The pre-DROP data lives only in
-- the `clients` table now (via jobs.client_id FK). This down migration
-- re-shapes the schema only — it does NOT reverse-derive jobs.client_name
-- from clients.full_name. Operator decides whether to run the optional
-- reverse-backfill UPDATE (commented out below).
--
-- For the full coordinated-rollback procedure (revert source code + apply
-- down migration + optional reverse-backfill from clients table), see:
--   .planning/phases/stage-f1-knowledge-graph-auth-wave-b/
--     B-1a-bis-clients-consumer-refactor-PLAN.md §11.3
--   .planning/runbooks/wave-b-slice-1-rollback.md
--
-- Source decisions:
--   nwrp154 Path A (down migration shape mirrors up migration; data NOT
--     auto-restored — explicit rollback contract).
--   D-078 + D-079 (PII fence rationale; client_email/phone restoration
--     deferred per Q1 nwrp153 PII fence approval).
--   Q2 nwrp153 (DROP COLUMN with safety addition; down migration is the
--     emergency-rollback path documented in B-1a-bis §11).
--   ITER-2-PATCHES §3.4 / §3.10 (warning text + runbook cross-reference
--     codified per planner C-2 + data-migration WARN-2/5 patches).
--
-- Data loss inventory on rollback:
--   * client_name: REVERSIBLE via reverse-derive (UPDATE jobs SET
--     client_name=clients.full_name FROM clients WHERE id=client_id).
--     This restores the SHAPE — see optional UPDATE below.
--   * client_email: data DROPPED from /api/jobs write paths in B-1a-bis
--     refactor (per ITER-2-PATCHES §3.6 DELIBERATE REGRESSION). Only
--     re-derivable for jobs created BEFORE B-1a-bis refactor (the original
--     embedded value lives in pg_dump history, not in any live table).
--   * client_phone: same as client_email.
--
-- WARNING: This is an EMERGENCY ROLLBACK ONLY. Re-add of columns without
-- data restoration leaves runtime in a broken state IF the consumer
-- refactor is also rolled back in lockstep — the post-refactor consumers
-- read `j.client?.full_name` (which works regardless of jobs.client_*), so
-- pure DDL rollback without code rollback is harmless on display surfaces.
-- However, /api/jobs POST + PATCH no longer accept client_* in body
-- post-refactor; rolling back the migration alone does not restore those
-- code paths. Plan a coordinated code-rollback in lockstep with this
-- down migration if needed (coordinated-rollback procedure per §11.3).
--
-- Step order:
--   1. ALTER TABLE jobs ADD COLUMN client_name/email/phone TEXT.
--   2. (Optional) reverse-backfill client_name from clients.full_name via
--      JOIN. Commented out — operator decision documented in §11.3.
--   3. NOTIFY pgrst.
-- ============================================================================

BEGIN;

ALTER TABLE public.jobs ADD COLUMN client_name TEXT;
ALTER TABLE public.jobs ADD COLUMN client_email TEXT;
ALTER TABLE public.jobs ADD COLUMN client_phone TEXT;

-- Operator-controlled reverse-backfill (commented out; uncomment if needed
-- per coordinated-rollback procedure §11.3):
--
-- UPDATE public.jobs j
--    SET client_name = c.full_name,
--        client_email = c.email,
--        client_phone = c.phone
--   FROM public.clients c
--  WHERE c.id = j.client_id
--    AND c.deleted_at IS NULL;
--
-- Reminder: only jobs.client_name is meaningfully recoverable from clients.
-- jobs.client_email/phone will remain NULL on rows created during the
-- B-1a-bis refactor window because the application-layer write redirection
-- dropped those fields (clients.email/phone never wrote them).

NOTIFY pgrst, 'reload schema';

COMMIT;
