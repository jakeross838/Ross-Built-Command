-- Down for 00109 — restore the pre-F2A-3 column default (false).
-- Does not touch existing rows (the up migration didn't either).

ALTER TABLE public.org_workflow_settings
  ALTER COLUMN require_budget_allocation SET DEFAULT false;

COMMENT ON COLUMN public.org_workflow_settings.require_budget_allocation IS
'Gate: approval 422s unless every invoice line item is allocated to a budget line.';
