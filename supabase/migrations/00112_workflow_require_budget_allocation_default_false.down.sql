-- Down: restore the 00109 posture (new orgs gated by default). Default-only
-- change; no existing rows touched.
ALTER TABLE public.org_workflow_settings
  ALTER COLUMN require_budget_allocation SET DEFAULT true;

COMMENT ON COLUMN public.org_workflow_settings.require_budget_allocation IS
'Gate: approval 422s unless every invoice line item is allocated to a budget line. DEFAULT true since 00109 (F2A-3) — new orgs start gated. Ross Built row remains false pending D2 backfill (TD-NW-CO-LINE-ALLOCATION).';
