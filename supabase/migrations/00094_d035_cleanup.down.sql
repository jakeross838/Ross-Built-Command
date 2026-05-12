-- 00094_d035_cleanup.down.sql
-- BEST-EFFORT rollback of 00094_d035_cleanup.sql.
--
-- IMPORTANT — per R.16 convention + CLAUDE.md "Never delete records":
-- .down.sql files are NOT applied to production. They document the
-- emergency rollback path only.
--
-- Limitations:
--   * status_history JSONB data is LOST on column drop. If any rows have
--     accumulated transition history between the up + down apply, that
--     history is unrecoverable from this script.
--   * change_order_budget_lines recreation is SHELL ONLY. Row data was
--     verified 0 at audit time (audit Section 4 task 1) so the empty
--     recreate is mathematically lossless, but the RLS policy text is
--     not exactly restored — only the minimum org-isolation policy is
--     re-added. A full restore would require re-running 00015 + 00034 +
--     00043 + 00049 fragments by hand, which is out of scope for a
--     down.sql.
--
-- iter-2 patch HF-A1-4: Wrapped in explicit BEGIN; ... COMMIT; for
-- consistency with up migration hygiene.

BEGIN;

-- ============================================================
-- 1. Drop jobs.status_history (inverse of up step 3).
-- ============================================================
ALTER TABLE public.jobs DROP COLUMN IF EXISTS status_history;

-- ============================================================
-- 2. Drop lien_releases.status_history (inverse of up step 2).
-- ============================================================
ALTER TABLE public.lien_releases DROP COLUMN IF EXISTS status_history;

-- ============================================================
-- 3. Recreate change_order_budget_lines shell (inverse of up step 1).
--     Empty table + minimum RLS so the schema is restored; full RLS
--     policy text is NOT restored — see header limitations.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.change_order_budget_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  change_order_id UUID NOT NULL REFERENCES public.change_orders(id) ON DELETE CASCADE,
  budget_line_id UUID NOT NULL REFERENCES public.budget_lines(id),
  amount BIGINT NOT NULL DEFAULT 0,
  org_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_co_budget_lines_co
  ON public.change_order_budget_lines(change_order_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_co_budget_lines_bl
  ON public.change_order_budget_lines(budget_line_id) WHERE deleted_at IS NULL;

ALTER TABLE public.change_order_budget_lines ENABLE ROW LEVEL SECURITY;

-- Minimum org-isolation RESTRICTIVE policy (matches 00034 spirit, not full text).
CREATE POLICY "org isolation"
  ON public.change_order_budget_lines AS RESTRICTIVE
  USING (org_id = app_private.user_org_id())
  WITH CHECK (org_id = app_private.user_org_id());

COMMENT ON TABLE public.change_order_budget_lines IS
  'Recreated by 00094_d035_cleanup.down.sql as a SHELL only. Original RLS policy text not restored. Do NOT rely on this table in code without re-running 00015 + 00034 + 00043 + 00049 fragments first.';

COMMIT;
