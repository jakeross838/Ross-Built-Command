-- 00111_co_budget_allocation_gate.sql
--
-- F6-family / nwrp286 Q2: a CO-side allocation gate mirroring the
-- invoice-side require_budget_allocation (migration 00109). When ON, a
-- change order cannot be approved unless every CO line is allocated to a
-- budget line AND the lines sum to the CO amount — closing the header-only
-- hole that left Fish's 144 budget lines with $799,510.34 of approved CO
-- base scope undistributed (Σ co_adjustments = 0; PART-2D).
--
-- Default posture (Q2): NEW orgs start gated, EXISTING orgs (incl. Ross
-- Built) start UNGATED. Achieved with NO UPDATE and no atomicity window
-- (security-review recommendation): ADD the column DEFAULT false so every
-- existing row (incl RB) is false at the ALTER, then flip the column
-- DEFAULT to true so future self-heal upserts (new orgs) inherit the gate.
-- Structurally identical to 00109's default flip. RB stays false until
-- Jake's 13/72-CO backfill + manual flip, sequenced AFTER this phase
-- (firewall: do NOT flip RB here).
--
-- The column inherits the existing RLS on org_workflow_settings (org
-- isolation RESTRICTIVE + member-read + owner/admin-write, migrations
-- 00032 + 00049) — no new policy or GRANT needed.

ALTER TABLE public.org_workflow_settings
  ADD COLUMN IF NOT EXISTS require_co_budget_allocation BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.org_workflow_settings
  ALTER COLUMN require_co_budget_allocation SET DEFAULT true;

COMMENT ON COLUMN public.org_workflow_settings.require_co_budget_allocation IS
'Gate: CO approval 422s unless every change_order_line is allocated to a budget_line and lines sum to the CO amount. DEFAULT true since 00111 (F6-family, nwrp286) — new orgs start gated. Existing rows (incl Ross Built) start false; RB flips true after the 72-CO backfill (TD-NW-CO-LINE-ALLOCATION).';
