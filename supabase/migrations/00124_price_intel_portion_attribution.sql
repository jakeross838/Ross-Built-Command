-- 00124 — B2 item 3: price-intel per-portion job attribution (multi-job split).
--
-- Problem (B2 sweep, 2026-07-17): both pricing-observation stores stamp the
-- invoice HEADER job on every observation — vendor_item_pricing rows via
-- commit-line-to-spine (TS), and pricing_history rows via the 00077/00073
-- triggers (SQL). A split invoice (00122: allocations carrying different
-- job_ids) mis-attributes the other job's portions to the header job.
--
-- Deterministic resolution rule (mono-job invoices UNCHANGED by construction):
-- a line item's job = the UNIQUE job among live allocations matching the
-- line's (invoice_id, cost_code_id); when zero or multiple jobs match (code
-- absent from allocations, or the same code split across jobs — genuinely
-- ambiguous with no line↔allocation linkage), fall back to the header job
-- (today's behavior). The common split shape — different codes per job —
-- resolves job-correct. An explicit line↔allocation FK is the future upgrade
-- if real use demands per-line job splits of one code.
--
-- Pieces:
--   1. resolve_allocation_job_for_line() — the shared SQL rule.
--   2. trg_pricing_history_from_invoice_status (00077, LIVE) → per-line job
--      via the rule.
--   3. trg_pricing_history_from_invoice_line (00073, dormant-but-can-fire on
--      line UPDATE under an already-qa_approved invoice) → aligned in
--      lockstep so the two paths can never diverge.
--   4. vip_after_update_job — job_item_activity was INSERT-maintained only;
--      re-attribution UPDATEs vendor_item_pricing.job_id (TS side of this
--      change), so the rollup gets a maintenance path for that mutation
--      class (no stored rollup without a writer — B2/Q8a doctrine).

-- ══ 1. Shared resolution rule ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.resolve_allocation_job_for_line(
  p_invoice_id uuid,
  p_line_cost_code_id uuid,
  p_header_job_id uuid
) RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN p_line_cost_code_id IS NULL THEN p_header_job_id
    WHEN (SELECT COUNT(DISTINCT a.job_id)
            FROM public.invoice_allocations a
           WHERE a.invoice_id = p_invoice_id
             AND a.cost_code_id = p_line_cost_code_id
             AND a.deleted_at IS NULL) = 1
    THEN (SELECT MIN(a.job_id::text)::uuid
            FROM public.invoice_allocations a
           WHERE a.invoice_id = p_invoice_id
             AND a.cost_code_id = p_line_cost_code_id
             AND a.deleted_at IS NULL)
    ELSE p_header_job_id
  END;
$$;

COMMENT ON FUNCTION public.resolve_allocation_job_for_line(uuid, uuid, uuid) IS
  'B2 (00124): unique-code→job rule for per-portion price-intel attribution. '
  'Line''s job = the single distinct job among live allocations matching the '
  'line''s cost code on that invoice; zero or multiple matches → header job. '
  'Mirrored in TS by resolveAllocationJobForLine (src/lib/cost-intelligence/'
  'allocation-job.ts) — keep in lockstep.';

GRANT EXECUTE ON FUNCTION public.resolve_allocation_job_for_line(uuid, uuid, uuid)
  TO authenticated;

-- ══ 2. LIVE pricing_history trigger (00077) — per-line job ══════════════

CREATE OR REPLACE FUNCTION public.trg_pricing_history_from_invoice_status()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'qa_approved' THEN
    RETURN NEW;
  END IF;
  IF OLD.status IS NOT DISTINCT FROM 'qa_approved' THEN
    RETURN NEW;
  END IF;

  -- job_id on invoices is nullable (legacy rows pre-tenancy cleanup);
  -- pricing_history.job_id is NOT NULL. Skip rather than fail the parent
  -- UPDATE. (An invoice cannot reach qa_approved without a job in the
  -- current flow, so this guards legacy data only.)
  IF NEW.job_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.pricing_history (
    org_id, job_id, source_type, source_id, source_line_id,
    vendor_id, cost_code_id, description,
    quantity, unit, unit_price, amount, date,
    created_by
  )
  SELECT
    NEW.org_id,
    -- B2 (00124): per-portion attribution — unique-code→job rule, header
    -- fallback. Mono-job invoices resolve to NEW.job_id by construction.
    public.resolve_allocation_job_for_line(NEW.id, ili.cost_code_id, NEW.job_id),
    'invoice', NEW.id, ili.id,
    NEW.vendor_id, ili.cost_code_id, COALESCE(ili.description, ''),
    ili.qty, ili.unit,
    CASE WHEN ili.rate IS NOT NULL THEN ROUND(ili.rate * 100)::BIGINT ELSE NULL END,
    ili.amount_cents,
    COALESCE(NEW.invoice_date, NEW.created_at::date),
    auth.uid()
  FROM public.invoice_line_items ili
  WHERE ili.invoice_id = NEW.id
    AND ili.deleted_at IS NULL
  ON CONFLICT (source_type, source_line_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ══ 3. Dormant 00073 line trigger — aligned in lockstep ═════════════════

CREATE OR REPLACE FUNCTION public.trg_pricing_history_from_invoice_line()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _inv RECORD;
BEGIN
  SELECT id, org_id, job_id, vendor_id, status, invoice_date, created_at
    INTO _inv
    FROM public.invoices
    WHERE id = NEW.invoice_id;

  IF _inv.status IS DISTINCT FROM 'qa_approved' THEN
    RETURN NEW;
  END IF;

  IF _inv.job_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.pricing_history (
    org_id, job_id, source_type, source_id, source_line_id,
    vendor_id, cost_code_id, description,
    quantity, unit, unit_price, amount, date,
    created_by
  ) VALUES (
    _inv.org_id,
    -- B2 (00124): per-portion attribution — same rule as the 00077 path.
    public.resolve_allocation_job_for_line(_inv.id, NEW.cost_code_id, _inv.job_id),
    'invoice', _inv.id, NEW.id,
    _inv.vendor_id, NEW.cost_code_id, COALESCE(NEW.description, ''),
    NEW.qty, NEW.unit,
    CASE WHEN NEW.rate IS NOT NULL THEN ROUND(NEW.rate * 100)::BIGINT ELSE NULL END,
    NEW.amount_cents,
    COALESCE(_inv.invoice_date, _inv.created_at::date),
    auth.uid()
  )
  ON CONFLICT (source_type, source_line_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ══ 4. job_item_activity maintenance on spine job re-attribution ════════
-- The TS re-attribution pass (allocations PUT) UPDATEs
-- vendor_item_pricing.job_id when a split changes a line's resolved job.
-- job_item_activity was previously maintained only by vip_after_insert —
-- give the UPDATE mutation class its own writer: exact deltas for the money
-- fields (recalculate-don't-increment applies to reads; this cache mirrors
-- the existing insert-delta pattern). first/last_purchase_date are display
-- metadata and self-heal on subsequent inserts.

CREATE OR REPLACE FUNCTION app_private.vip_after_update_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.job_id IS NOT DISTINCT FROM NEW.job_id THEN
    RETURN NEW;
  END IF;

  IF OLD.job_id IS NOT NULL THEN
    UPDATE public.job_item_activity jia
       SET actual_quantity = COALESCE(jia.actual_quantity, 0) - OLD.quantity,
           actual_total_cents = COALESCE(jia.actual_total_cents, 0) - OLD.total_cents,
           updated_at = NOW()
     WHERE jia.job_id = OLD.job_id
       AND jia.item_id = OLD.item_id
       AND jia.deleted_at IS NULL;
  END IF;

  IF NEW.job_id IS NOT NULL THEN
    INSERT INTO public.job_item_activity (
      org_id, job_id, item_id,
      actual_quantity, actual_total_cents,
      cost_code_id,
      first_purchase_date, last_purchase_date,
      status
    )
    VALUES (
      NEW.org_id, NEW.job_id, NEW.item_id,
      NEW.quantity, NEW.total_cents,
      NEW.cost_code_id,
      NEW.transaction_date, NEW.transaction_date,
      'partial_received'
    )
    ON CONFLICT (job_id, item_id) WHERE deleted_at IS NULL
    DO UPDATE SET
      actual_quantity = COALESCE(job_item_activity.actual_quantity, 0) + EXCLUDED.actual_quantity,
      actual_total_cents = COALESCE(job_item_activity.actual_total_cents, 0) + EXCLUDED.actual_total_cents,
      last_purchase_date = GREATEST(
        job_item_activity.last_purchase_date,
        EXCLUDED.last_purchase_date
      ),
      first_purchase_date = COALESCE(
        job_item_activity.first_purchase_date,
        EXCLUDED.first_purchase_date
      ),
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vip_after_update_job ON public.vendor_item_pricing;
CREATE TRIGGER trg_vip_after_update_job
  AFTER UPDATE OF job_id ON public.vendor_item_pricing
  FOR EACH ROW EXECUTE FUNCTION app_private.vip_after_update_job();
