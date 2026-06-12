-- 00109_workflow_require_budget_allocation_default_true.sql
--
-- F2A-3 / D2 companion (per nwrp276 §9-14 + PART-2A-INVOICES.md):
-- require_budget_allocation defaults TRUE for NEW orgs. Silent-off is how
-- Ross Built accumulated ~$95K of approved invoice value invisible to
-- budget rollups (13 unallocated invoices, PART-2C D2). New orgs start
-- gated; the self-heal row creation in src/lib/workflow-settings.ts
-- (upsert with column defaults) picks this up automatically, and the
-- code-side DEFAULT_WORKFLOW_SETTINGS flipped in the same commit.
--
-- EXISTING rows are intentionally NOT updated: Ross Built's row stays
-- FALSE until the D2 backfill completes (TD-NW-CO-LINE-ALLOCATION
-- companion workstream — backfill FIRST, manual flip SECOND, both before
-- Diane dogfood). Flipping RB now would block live approval work
-- mid-stream on invoices that predate allocation authoring.

ALTER TABLE public.org_workflow_settings
  ALTER COLUMN require_budget_allocation SET DEFAULT true;

COMMENT ON COLUMN public.org_workflow_settings.require_budget_allocation IS
'Gate: approval 422s unless every invoice line item is allocated to a budget line. DEFAULT true since 00109 (F2A-3) — new orgs start gated. Ross Built row remains false pending D2 backfill (TD-NW-CO-LINE-ALLOCATION).';
