-- Migration 00102 DOWN — Wave-A iter-1 deferred security cleanup REVERSE
--
-- Reverses 00102_wa_iter1_security_cleanup.sql in inverse section order:
--   §C-reverse: extensions back to public + search_path restoration
--   §B-reverse: GRANT EXECUTE back to anon/authenticated
--   §A-reverse: re-issue CREATE OR REPLACE FUNCTION WITHOUT the
--               SET search_path = ... clause (returns to pre-00102
--               mutable search_path state).
--
-- Data-loss contract: ZERO row-level data touched. No data is lost
-- in either direction. Safe to repeatedly apply + reverse.
--
-- Wrap in a single transaction; all sections reverse together or none do.

BEGIN;

-- ============================================================================
-- §C-reverse: Move extensions back to public + restore database search_path
-- ============================================================================

ALTER EXTENSION pg_trgm SET SCHEMA public;
ALTER EXTENSION vector SET SCHEMA public;

-- Restore the pre-00102 database search_path. Per pg_db_role_setting at apply
-- time (2026-05-19), the default DB search_path was unset (postgres' default).
-- Resetting clears the explicit override applied by 00102.
ALTER DATABASE postgres RESET search_path;

-- ============================================================================
-- §B-reverse: GRANT EXECUTE back to anon, authenticated on 7 functions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.trg_pricing_history_from_co_line()
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trg_pricing_history_from_invoice_line()
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trg_pricing_history_from_invoice_status()
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trg_pricing_history_from_po_line()
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trg_pricing_history_from_proposal_line()
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_approval_chains()
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_workflow_settings()
  TO anon, authenticated;

-- ============================================================================
-- §A-reverse: Re-issue function definitions WITHOUT search_path SET clause
-- ============================================================================
-- Function bodies preserved verbatim from pre-00102 pg_get_functiondef
-- snapshot. The only delta vs 00102 up is the absence of the
-- `SET search_path = ...` clause.

CREATE OR REPLACE FUNCTION public.trg_change_orders_status_sync()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  bl_id UUID;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    FOR bl_id IN
      SELECT DISTINCT col.budget_line_id
        FROM public.change_order_lines col
        WHERE col.co_id = NEW.id
          AND col.budget_line_id IS NOT NULL
          AND col.deleted_at IS NULL
    LOOP
      PERFORM public.recompute_budget_line_co_adjustments(bl_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public._compute_scheduled_payment_date(_received_date date, _schedule text)
 RETURNS date
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
  target date;
  dow int;
  d int;
BEGIN
  IF _received_date IS NULL OR _schedule = 'custom' THEN
    RETURN NULL;
  END IF;

  d := EXTRACT(day FROM _received_date)::int;

  IF _schedule = '5_20' THEN
    IF d <= 5 THEN
      target := date_trunc('month', _received_date)::date + 14;
    ELSIF d <= 20 THEN
      target := (date_trunc('month', _received_date) + interval '1 month')::date - 1;
    ELSE
      target := (date_trunc('month', _received_date) + interval '1 month')::date + 14;
    END IF;
  ELSIF _schedule = '15_30' THEN
    IF d <= 15 THEN
      target := (date_trunc('month', _received_date) + interval '1 month')::date - 1;
    ELSE
      target := (date_trunc('month', _received_date) + interval '1 month')::date + 14;
    END IF;
  ELSIF _schedule = 'monthly' THEN
    target := (date_trunc('month', _received_date) + interval '2 months')::date - 1;
  ELSE
    RETURN NULL;
  END IF;

  dow := EXTRACT(isodow FROM target)::int;
  IF dow = 6 THEN
    target := target + 2;
  ELSIF dow = 7 THEN
    target := target + 1;
  END IF;

  RETURN target;
END $function$;

CREATE OR REPLACE FUNCTION app_private.co_cache_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM app_private.refresh_approved_cos_total(NEW.job_id);
    IF TG_OP = 'UPDATE' AND OLD.job_id IS DISTINCT FROM NEW.job_id THEN
      PERFORM app_private.refresh_approved_cos_total(OLD.job_id);
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM app_private.refresh_approved_cos_total(OLD.job_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION app_private.cleanup_stale_import_errors(p_older_than_days integer DEFAULT 7)
 RETURNS TABLE(invoices_soft_deleted integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.invoices
  SET deleted_at = now()
  WHERE status = 'import_error'
    AND deleted_at IS NULL
    AND created_at < now() - make_interval(days => p_older_than_days);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION app_private.update_vip_landed_total_cents()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.landed_total_cents :=
    COALESCE(NEW.total_cents, 0) +
    COALESCE(NEW.tax_cents, 0) +
    COALESCE(NEW.overhead_allocated_cents, 0);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.org_cost_codes_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $function$;

CREATE OR REPLACE FUNCTION app_private.update_iel_landed_total_cents()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.landed_total_cents :=
    COALESCE(NEW.raw_total_cents, 0) +
    COALESCE(NEW.line_tax_cents, 0) +
    COALESCE(NEW.overhead_allocated_cents, 0);
  RETURN NEW;
END;
$function$;

COMMIT;
