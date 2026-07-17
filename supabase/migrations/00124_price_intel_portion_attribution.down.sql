-- 00124 DOWN — restore header-job attribution for pricing observations.
-- Non-destructive: drops the resolution rule + update trigger and restores
-- the 00077 / 00073 trigger functions verbatim (header-job stamping).
-- pricing_history rows already written with per-portion jobs are DATA and
-- are not rewritten (append-only contract per 00073).

DROP TRIGGER IF EXISTS trg_vip_after_update_job ON public.vendor_item_pricing;
DROP FUNCTION IF EXISTS app_private.vip_after_update_job();

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
    NEW.org_id, NEW.job_id, 'invoice', NEW.id, ili.id,
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
    _inv.org_id, _inv.job_id, 'invoice', _inv.id, NEW.id,
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

DROP FUNCTION IF EXISTS public.resolve_allocation_job_for_line(uuid, uuid, uuid);
