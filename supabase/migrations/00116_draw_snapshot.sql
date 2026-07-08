-- 00116_draw_snapshot.sql
--
-- TD-NW-DRAW-SNAPSHOT closure. At approval, the draw's fully-computed render
-- data (G703 lines + G702/statement totals + linked invoices) is frozen into
-- draws.snapshot. Approved / locked / paid draws render from this snapshot
-- verbatim and NEVER recompute — so a later change to a source invoice, cost
-- code, or job field cannot retroactively alter an issued draw. Drafts (and
-- submitted, pre-approval) still recompute on read; the RECOMPUTED-STALE badge
-- stays a draft-only signal.
--
-- Additive JSONB column, nullable. Draws approved before this migration have
-- snapshot IS NULL and keep recomputing until re-approved (acceptable — no
-- silent data change; the freeze engages at the next approval).

ALTER TABLE public.draws
  ADD COLUMN IF NOT EXISTS snapshot JSONB;

COMMENT ON COLUMN public.draws.snapshot IS
  'Frozen render data captured at approval (G703 lines, G702/statement totals, linked invoices). Approved/locked/paid draws render from this verbatim and never recompute (TD-NW-DRAW-SNAPSHOT). NULL for drafts/submitted and for draws approved before migration 00116.';
