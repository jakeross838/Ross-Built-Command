-- 00112_workflow_require_budget_allocation_default_false.sql
--
-- Onboarding fix (Jake — the new-org budget-allocation cliff): revert the
-- NEW-org default of require_budget_allocation from TRUE (migration 00109)
-- back to FALSE.
--
-- WHY: a brand-new customer has ZERO budget lines, so the gate ("every
-- invoice line item must be allocated to an existing budget line before
-- approval", enforced at src/app/api/invoices/[id]/action/route.ts:174-188)
-- is UNSATISFIABLE on their very first invoice — approval 422s with no path
-- forward, because budget lines are never auto-created during review (the
-- line-items route only LOOKS them up). This is the #1 onboarding blocker.
-- FALSE matches what Ross Built actually runs (RB's row has always been
-- FALSE); the gate stays opt-in per-org and can be re-enabled once a
-- customer has authored a budget.
--
-- TRADEOFF (acknowledged): this re-opens the invisible-unallocated-spend
-- risk that 00109 targeted. Mitigated by (a) a new org having nothing to
-- allocate to yet, and (b) per-org re-enable once budgets exist.
--
-- EXISTING rows are NOT touched (no UPDATE): every current org is already
-- FALSE and Ross Built's row is left exactly as-is. This is a default-only
-- change affecting FUTURE inserts (new orgs via the AFTER-INSERT
-- create_default_workflow_settings trigger, which inserts (org_id) and
-- relies on this column default). Mirrors 00111's no-UPDATE posture.

ALTER TABLE public.org_workflow_settings
  ALTER COLUMN require_budget_allocation SET DEFAULT false;

COMMENT ON COLUMN public.org_workflow_settings.require_budget_allocation IS
'Gate: approval 422s unless every invoice line item is allocated to a budget line. DEFAULT false since 00112 — new orgs start UNGATED (a brand-new org has no budget lines yet; the gate is opt-in per-org, re-enable once budgets exist). Reverts 00109. Ross Built row is and remains false.';
