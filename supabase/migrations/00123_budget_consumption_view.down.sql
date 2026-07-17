-- 00123 DOWN — restore the pre-B2 budget-consumption world.
-- Non-destructive symmetry: 00123 dropped no data; this restores the 00027
-- invoiced-cache maintenance verbatim, drops the view + split total-guard, and
-- re-runs the cache backfill so budget_lines.invoiced is consistent with the
-- restored (line-item-sourced) definition.

DROP TRIGGER IF EXISTS trg_split_total_guard ON public.invoices;
DROP FUNCTION IF EXISTS public.enforce_split_total_on_invoice_change();

DROP VIEW IF EXISTS public.invoice_budget_consumption;

-- Restore 00027's function + triggers (verbatim, plus the 00034 search_path pin).
CREATE OR REPLACE FUNCTION public.recompute_budget_line_invoiced(p_budget_line_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.budget_lines bl
    SET invoiced = COALESCE((
      SELECT SUM(ili.amount_cents)
        FROM public.invoice_line_items ili
        JOIN public.invoices i ON i.id = ili.invoice_id
        WHERE ili.budget_line_id = p_budget_line_id
          AND ili.deleted_at IS NULL
          AND i.deleted_at IS NULL
          AND i.status IN (
            'pm_approved', 'qa_review', 'qa_approved',
            'pushed_to_qb', 'in_draw', 'paid'
          )
    ), 0)
  WHERE bl.id = p_budget_line_id;
END;
$$ LANGUAGE plpgsql;
ALTER FUNCTION public.recompute_budget_line_invoiced(p_budget_line_id uuid) SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.trg_invoice_line_items_budget_sync()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.budget_line_id IS NOT NULL THEN
      PERFORM public.recompute_budget_line_invoiced(OLD.budget_line_id);
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.budget_line_id IS DISTINCT FROM NEW.budget_line_id THEN
      IF OLD.budget_line_id IS NOT NULL THEN
        PERFORM public.recompute_budget_line_invoiced(OLD.budget_line_id);
      END IF;
    END IF;
    IF NEW.budget_line_id IS NOT NULL THEN
      PERFORM public.recompute_budget_line_invoiced(NEW.budget_line_id);
    END IF;
    RETURN NEW;
  ELSE
    IF NEW.budget_line_id IS NOT NULL THEN
      PERFORM public.recompute_budget_line_invoiced(NEW.budget_line_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;
ALTER FUNCTION public.trg_invoice_line_items_budget_sync() SET search_path = public, pg_temp;

CREATE TRIGGER trg_invoice_line_items_budget_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_invoice_line_items_budget_sync();

CREATE OR REPLACE FUNCTION public.trg_invoices_status_budget_sync()
RETURNS TRIGGER AS $$
DECLARE
  bl_id UUID;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    FOR bl_id IN
      SELECT DISTINCT ili.budget_line_id
        FROM public.invoice_line_items ili
        WHERE ili.invoice_id = NEW.id
          AND ili.budget_line_id IS NOT NULL
          AND ili.deleted_at IS NULL
    LOOP
      PERFORM public.recompute_budget_line_invoiced(bl_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
ALTER FUNCTION public.trg_invoices_status_budget_sync() SET search_path = public, pg_temp;

CREATE TRIGGER trg_invoices_status_budget_sync
  AFTER UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.trg_invoices_status_budget_sync();

COMMENT ON COLUMN public.budget_lines.invoiced IS NULL;

-- Re-backfill the restored cache.
DO $$
DECLARE
  bl_id UUID;
BEGIN
  FOR bl_id IN SELECT id FROM public.budget_lines WHERE deleted_at IS NULL LOOP
    PERFORM public.recompute_budget_line_invoiced(bl_id);
  END LOOP;
END;
$$;
