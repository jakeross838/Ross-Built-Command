-- 00123 — B2/Q8a: unify budget consumption onto invoice_allocations.
--
-- Jake's ruling (2026-07-17, B2 session, tie-out gate): Option A — switch every
-- budget-consumption reader to allocations. RIDER: budget_lines.invoiced is
-- demoted to display-cache-or-dead; it feeds ZERO math after this migration.
-- Executor's call: DEAD (kill readers, re-point to the view below). Never let a
-- stored rollup with no writer feed a gate again.
--
-- Tie-out evidence (recorded in .planning/coherence/b2-q8a-tieout-halt.md):
-- the old source (invoice_line_items keyed by stored budget_line_id) read $0.00
-- company-wide — zero live budget_lines existed and every line item's
-- budget_line_id was NULL (resolution happens only at line-item save time and
-- never re-runs). The allocations source read $59,420.75 across 9 (job, code)
-- pairs, cent-identical to what the draw engine already bills on G703s.
--
-- This migration:
--   1. Creates `invoice_budget_consumption` — a security_invoker view that IS
--      the single budget-consumption definition, mirroring the draw engine's
--      3-tier per-invoice attribution (src/lib/draw-calc.ts:97-167
--      sumThisPeriodByCostCode) exactly:
--        tier 1: live invoice_allocations (job-scoped, canonical; an invoice
--                with ANY live allocation is "covered" — fallbacks never re-add
--                its dollars)
--        tier 2: coded invoice_line_items for allocation-less invoices
--                (header job, keyed by cost CODE — not the dead budget_line_id)
--        tier 3: invoice-level cost_code × total_amount for invoices with no
--                allocations and no coded lines (header job)
--      Only counting-status invoices appear (same 6-status set recalc.ts and
--      the 00027 trigger used): pm_approved, qa_review, qa_approved,
--      pushed_to_qb, in_draw, paid.
--   2. Drops the 00027 invoiced-cache maintenance (function + both triggers).
--      budget_lines.invoiced keeps zero writers and zero readers; the column
--      stays in place (commented dead) — dropping it is deferred so rollback
--      stays non-destructive. purchase_orders.invoiced_total and its 00028
--      maintenance are UNTOUCHED: allocations carry no po_id, so PO scope
--      stays line-item-sourced (explicit scope split per Jake's ruling).
--   3. Adds a split total-guard on invoices: partial-approve (and any other
--      total_amount writer) previously could rewrite a split invoice's total
--      without touching allocations — trg_split_fully_allocated (00122) only
--      fires on allocation DML, so the balanced invariant broke silently.
--      The new trigger re-checks balance whenever total_amount changes on an
--      invoice with live cross-job allocations. Mono-job laxity is preserved
--      (allocations optional / may drift on mono-job invoices, unchanged).
--
-- Index plan (Architecture rule: every aggregation ships its index plan):
-- all view access paths are covered by EXISTING indexes —
--   invoices:            idx_invoices_org_status (org_id, status) live,
--                        idx_invoices_job_status (job_id, status) live
--   invoice_allocations: idx_invoice_allocations_live (invoice_id) live,
--                        idx_invoice_allocations_job_code (job_id, cost_code_id) live
--   invoice_line_items:  idx_invoice_line_items_invoice (invoice_id) live,
--                        idx_invoice_line_items_cost_code (cost_code_id) live
-- EXPLAIN ANALYZE run on the org-wide and per-job aggregate shapes post-apply
-- (see .planning/coherence/b2-q8a-tieout-halt.md session record). No new
-- indexes required.

-- ══ 1. The view — single source of budget consumption ═══════════════════

-- Shape note: three direct branches (NOT a shared CTE) — a 3x-referenced CTE
-- gets materialized, which blocks org/job predicate pushdown into the invoices
-- index scans. With direct branches, per-org / per-job queries drive
-- idx_invoices_org_status / idx_invoices_job_status in every branch and the
-- coverage checks become indexed (anti-)semi-joins. EXPLAIN ANALYZE verified
-- 2026-07-17 (remote applied as 00123 + 00123b; this file is the final shape).

CREATE OR REPLACE VIEW public.invoice_budget_consumption
WITH (security_invoker = on) AS
-- tier 1: allocations (canonical; job-scoped per portion)
SELECT i.org_id,
       a.job_id,
       a.cost_code_id,
       i.id AS invoice_id,
       SUM(a.amount_cents)::bigint AS amount_cents,
       1 AS tier
  FROM public.invoices i
  JOIN public.invoice_allocations a
    ON a.invoice_id = i.id AND a.deleted_at IS NULL
 WHERE i.deleted_at IS NULL
   AND i.status IN ('pm_approved','qa_review','qa_approved',
                    'pushed_to_qb','in_draw','paid')
 GROUP BY i.org_id, a.job_id, a.cost_code_id, i.id
UNION ALL
-- tier 2: coded line items, allocation-less invoices only (header job)
SELECT i.org_id,
       i.job_id,
       l.cost_code_id,
       i.id,
       SUM(l.amount_cents)::bigint,
       2 AS tier
  FROM public.invoices i
  JOIN public.invoice_line_items l
    ON l.invoice_id = i.id AND l.deleted_at IS NULL
   AND l.cost_code_id IS NOT NULL
 WHERE i.deleted_at IS NULL
   AND i.status IN ('pm_approved','qa_review','qa_approved',
                    'pushed_to_qb','in_draw','paid')
   AND i.job_id IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM public.invoice_allocations a
      WHERE a.invoice_id = i.id AND a.deleted_at IS NULL
   )
 GROUP BY i.org_id, i.job_id, l.cost_code_id, i.id
UNION ALL
-- tier 3: invoice-level code, nothing else available (header job)
SELECT i.org_id,
       i.job_id,
       i.cost_code_id,
       i.id,
       i.total_amount::bigint,
       3 AS tier
  FROM public.invoices i
 WHERE i.deleted_at IS NULL
   AND i.status IN ('pm_approved','qa_review','qa_approved',
                    'pushed_to_qb','in_draw','paid')
   AND i.job_id IS NOT NULL
   AND i.cost_code_id IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM public.invoice_allocations a
      WHERE a.invoice_id = i.id AND a.deleted_at IS NULL
   )
   AND NOT EXISTS (
     SELECT 1 FROM public.invoice_line_items l
      WHERE l.invoice_id = i.id AND l.deleted_at IS NULL
        AND l.cost_code_id IS NOT NULL
   );

COMMENT ON VIEW public.invoice_budget_consumption IS
  'B2/Q8a (00123): THE budget-consumption source. One row per counting-status '
  'invoice x (job_id, cost_code_id) with its attributed cents + tier '
  '(1=allocations canonical, 2=coded line items fallback, 3=invoice-level code). '
  'Mirrors draw-calc sumThisPeriodByCostCode tiering exactly — budgets and draws '
  'read the same dollars. security_invoker: querying role''s RLS applies to the '
  'underlying tables. Gates compute a reviewed invoice''s own live contribution '
  'separately (the invoice is pre-counting at approve time and thus not in this '
  'view); baselines exclude the reviewed invoice with invoice_id != $reviewed.';

-- ══ 2. Kill the dead cache maintenance (00027) ══════════════════════════

DROP TRIGGER IF EXISTS trg_invoice_line_items_budget_sync ON public.invoice_line_items;
DROP TRIGGER IF EXISTS trg_invoices_status_budget_sync ON public.invoices;
DROP FUNCTION IF EXISTS public.trg_invoice_line_items_budget_sync();
DROP FUNCTION IF EXISTS public.trg_invoices_status_budget_sync();
DROP FUNCTION IF EXISTS public.recompute_budget_line_invoiced(uuid);

COMMENT ON COLUMN public.budget_lines.invoiced IS
  'DEAD as of 00123 (B2/Q8a ruling): zero writers, zero readers. Budget '
  'consumption lives in the invoice_budget_consumption view (allocations-first '
  '3-tier). Column retained for non-destructive rollback; scheduled for drop in '
  'a later cleanup migration.';

-- ══ 3. Split total-guard on invoices ════════════════════════════════════
-- Companion to 00122''s trg_split_fully_allocated (which fires only on
-- invoice_allocations DML). Blocks any total_amount change that would leave a
-- SPLIT invoice''s live allocations unbalanced — the state partial-approve
-- could previously create silently. SECURITY DEFINER + pinned search_path per
-- advisor 0011 / migration 00034 convention (matches 00122''s functions).

CREATE OR REPLACE FUNCTION public.enforce_split_total_on_invoice_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _is_split boolean;
  _sum bigint;
BEGIN
  SELECT
    bool_or(a.job_id IS DISTINCT FROM NEW.job_id),
    COALESCE(sum(a.amount_cents), 0)
    INTO _is_split, _sum
    FROM public.invoice_allocations a
   WHERE a.invoice_id = NEW.id
     AND a.deleted_at IS NULL;

  IF COALESCE(_is_split, false) AND _sum IS DISTINCT FROM NEW.total_amount THEN
    RAISE EXCEPTION
      'split_invoice_total_desync: invoice % is split across jobs; total_amount changed to % cents but live allocations sum to % — rebalance the allocations first',
      NEW.id, NEW.total_amount, _sum
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_split_total_guard ON public.invoices;
CREATE TRIGGER trg_split_total_guard
  AFTER UPDATE OF total_amount ON public.invoices
  FOR EACH ROW
  WHEN (OLD.total_amount IS DISTINCT FROM NEW.total_amount)
  EXECUTE FUNCTION public.enforce_split_total_on_invoice_change();
