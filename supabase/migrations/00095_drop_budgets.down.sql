-- Reverse migration 00095: Restore budgets table.
--
-- WARNING: This recreates the `budgets` table SCHEMA only. The forward
-- migration's data state was 0 rows (audit 2026-05-12 §Section 3); no data
-- is restored because no data existed at drop time.
--
-- If you are running this .down because you need to recover application
-- behavior that depended on `budgets`, you ALSO need to:
--   - Revert the src refactor commits in PR A-3 (recalc.ts, budget-lines
--     routes, activity-log.ts, action-labels.ts, CLAUDE.md).
--   - Restore the `budget_lines.budget_id` column population logic.
--
-- Restored state matches the cumulative state of 00027 + 00043 + 00049 (the
-- 3 forward migrations that touched `budgets` table or its policies).
--
-- iter-2 patch OQ-A-3-1 (data-migration-safety acceptance): Migrations 00027,
-- 00043, 00049 are forward-only (no .down.sql counterparts). This single
-- .down.sql consolidates the cumulative end-state of budgets-touching DDL
-- across all three. If .down is run on an environment that has not yet
-- reached 00049, this .down will overshoot (apply policies the environment
-- didn't yet have). Acceptable because: (a) all production + staging
-- environments are well past 00049 per audit row-count Section 3; (b) .down
-- is a rollback safety net, not a forward-replay tool.

BEGIN;

-- 1. Re-add the FK column on `budget_lines`.
ALTER TABLE public.budget_lines
  ADD COLUMN IF NOT EXISTS budget_id UUID;
CREATE INDEX IF NOT EXISTS idx_budget_lines_budget_id
  ON public.budget_lines (budget_id);

-- 2. Recreate the budgets table (from 00027).
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id),
  name TEXT NOT NULL DEFAULT 'Original Budget',
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_amount BIGINT NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes (from 00027).
CREATE INDEX IF NOT EXISTS idx_budgets_org_id ON public.budgets (org_id);
CREATE INDEX IF NOT EXISTS idx_budgets_job_id ON public.budgets (job_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_one_active_per_job
  ON public.budgets (job_id)
  WHERE is_active = true AND deleted_at IS NULL;

-- Re-attach the FK on budget_lines.budget_id → budgets.id (after table exists).
ALTER TABLE public.budget_lines
  ADD CONSTRAINT budget_lines_budget_id_fkey
  FOREIGN KEY (budget_id) REFERENCES public.budgets(id);

-- updated_at trigger (from 00027).
DROP TRIGGER IF EXISTS trg_budgets_updated_at ON public.budgets;
CREATE TRIGGER trg_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS (cumulative final state from 00027 + 00043 + 00049).
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Org-isolation RESTRICTIVE policy with platform_admin bypass (00049 final state).
CREATE POLICY "org isolation" ON public.budgets
  AS RESTRICTIVE FOR ALL
  USING (org_id = app_private.user_org_id() OR app_private.is_platform_admin())
  WITH CHECK (org_id = app_private.user_org_id());

-- Strict delete policy (00049).
CREATE POLICY "budgets_delete_strict" ON public.budgets
  AS RESTRICTIVE FOR DELETE
  USING (org_id = app_private.user_org_id());

-- Platform admin cross-org read (00049).
CREATE POLICY "budgets_platform_admin_read" ON public.budgets
  FOR SELECT USING (app_private.is_platform_admin());

-- Admin/owner write parity (00043 final state).
CREATE POLICY "admin owner write budgets" ON public.budgets
  FOR ALL USING (app_private.user_role() IN ('admin', 'owner'))
  WITH CHECK (app_private.user_role() IN ('admin', 'owner'));

-- Members read (from 00027 — superseded by org-isolation USING clause but kept
-- for fidelity with the cumulative forward-migration state).
CREATE POLICY "members read budgets" ON public.budgets
  FOR SELECT USING (org_id = app_private.user_org_id());

COMMIT;
