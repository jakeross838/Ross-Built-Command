-- 00094_d035_cleanup.sql
-- F1-Wave-A Plan A-1 — D-035 cleanup + audit R.7 bonus + Q12 closure.
--
-- Three independent schema operations in one migration:
--   1. DROP TABLE change_order_budget_lines (D-021 / D-035 #1)
--      Verified safe per .planning/audits/2026-05-12-migration-inventory.md
--      Section 4 task 1: 0 rows + 0 src/ consumers + superseded by
--      change_order_lines (created in 00028, line 178 explicitly states
--      "Replaces the legacy change_order_budget_lines table").
--      CASCADE drops the 6 RLS policies (00015 base, 00034 RESTRICTIVE +
--      narrowed PM/admin/owner/accounting, 00043 widened, 00049
--      platform_admin_read + delete_strict) along with the table.
--
--   2. ADD COLUMN lien_releases.status_history JSONB NOT NULL DEFAULT
--      '[]'::jsonb (D-035 #2 + Q12 uniform-rule).
--      Per CLAUDE.md Architecture Rules: "Status history: JSONB column on
--      every workflow entity logging every status change: {who, when,
--      old_status, new_status, note}". lien_releases.status is a workflow
--      enum {pending|received|waived|not_required} (00026 + 00030);
--      status_history was the only workflow-entity gap (per audit Section 4
--      task 2 — peers like change_orders, draws, invoices, proposals all
--      have it). Default '[]'::jsonb on the 0 existing rows; app-layer
--      PATCH + bulk routes (this plan's tasks 2 + 3) populate forward-going.
--
--   3. ADD COLUMN jobs.status_history JSONB NOT NULL DEFAULT '[]'::jsonb
--      (audit R.7 bonus + Q12 uniform-rule).
--      Same gap as lien_releases — audit Section 4 task 2 explicitly calls
--      out: "lien_releases and jobs are the only workflow-status tables
--      without it". jobs.status enum is {active|complete|warranty|cancelled}
--      (definition in src/app/api/jobs/route.ts:57 + 85). Default
--      '[]'::jsonb on the 16 existing rows; jobs PATCH route (this plan's
--      task 4) populates forward-going.
--
-- iter-2 patch HF-A1-4: Wrapped in explicit BEGIN; ... COMMIT; for
-- consistency with migrations 00095 + 00096 hygiene convention.
--
-- iter-2 patch MED-A1-1: Extended COMMENT on status_history (both tables)
-- notes that `note` field may contain free-form text including PII; the
-- column follows parent entity retention class.
--
-- Rollback contract: .down.sql is BEST-EFFORT per CLAUDE.md "Never delete
-- records" + .planning/audits Section 1 R.16 convention. CCBL recreation is
-- a SHELL only (no row data; the 0 rows are mathematically restored).
-- status_history JSONB data, if any has been written between up + down, is
-- LOST on column drop. Down is intended for emergency rollback at deploy
-- time only — production status_history rows should never round-trip.

BEGIN;

-- ============================================================
-- 1. Drop change_order_budget_lines (D-021 / D-035 #1).
-- ============================================================
-- nightwork: drop-justified — D-021 ratified in MASTER-PLAN + D-035 #1 F1 first-day cleanup task. Verified safe per .planning/audits/2026-05-12-migration-inventory.md Section 4 task 1: 0 rows in production + 0 src/ consumers + superseded by change_order_lines (00028 line 178 explicitly states "Replaces the legacy change_order_budget_lines table"). Carries 6 stale RLS policies + RESTRICTIVE policy maintenance cost; CASCADE drops them with the table.
DROP TABLE IF EXISTS public.change_order_budget_lines CASCADE;

-- ============================================================
-- 2. Add lien_releases.status_history (D-035 #2 / Q12 closure).
-- ============================================================
ALTER TABLE public.lien_releases
  ADD COLUMN IF NOT EXISTS status_history JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.lien_releases.status_history IS
  'Q12 uniform-rule: append-only JSONB array of {who, when, old_status, new_status, note} on every status transition. Populated by PATCH + bulk routes. Cross-entity events also flow to activity_log; this column is the entity-local transition record. Note field may contain free-form text including PII; follows parent entity (lien_releases) retention class.';

-- ============================================================
-- 3. Add jobs.status_history (audit R.7 bonus / Q12 closure).
-- ============================================================
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS status_history JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.jobs.status_history IS
  'Q12 uniform-rule: append-only JSONB array of {who, when, old_status, new_status, note} on every status transition (active|complete|warranty|cancelled). Populated by PATCH /api/jobs route on status change. Cross-entity events also flow to activity_log. Note field may contain free-form text including PII; follows parent entity (jobs) retention class.';

COMMIT;
