-- Down: drop the gate column. Data-destructive for the per-org flag, but
-- acceptable — the column is additive; rollback returns to pre-gate (no CO
-- allocation enforcement) behavior. This is the standard new-column
-- rollback; the 00109 playbook reference applies to the UP structure only
-- (00109 altered an existing column, so its down restored a default).

ALTER TABLE public.org_workflow_settings
  DROP COLUMN IF EXISTS require_co_budget_allocation;
