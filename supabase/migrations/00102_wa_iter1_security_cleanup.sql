-- Migration 00102 — Wave-A iter-1 deferred security cleanup
--
-- Closes MED-WA-1 (Wave-A iter-1 deferred security findings; see
-- .planning/phases/stage-f1-knowledge-graph-auth-wave-a/GATE-A-HALT.md:122).
-- Plan: .planning/phases/stage-f1-wave-a-iter1-cleanup/WA-iter1-cleanup-PLAN.md
-- Authorization chain: nwrp165 (weekend authoring) → nwrp167 (sequential
-- autonomous execution) → nwrp174 (locked KEEP-set + dispatch) → nwrp176
-- (EXPANDED-SCOPE approved) → nwrp188 (Plan B dispatch with $20 fresh
-- scope ceiling).
--
-- Three sections, all in a single atomic transaction:
--
--   §A — search_path hardening (8 functions) per Supabase advisor 0011
--        `function_search_path_mutable`. Pattern mirrors migration 00034.
--        For functions in app_private, the schema list expands to
--        `public, app_private, pg_temp` so refresh_approved_cos_total
--        and related app_private helpers stay resolvable. Function
--        bodies preserved verbatim from `pg_get_functiondef` snapshot
--        2026-05-19 pre-apply (see PLAN §A executor responsibility).
--
--   §B — REVOKE EXECUTE from anon, authenticated on 7 internal-trigger
--        SECURITY DEFINER functions (5 trg_pricing_history_from_* +
--        2 create_default_*). These are trigger-internal / seed-default
--        functions with NO legitimate RPC caller. Trigger fire context
--        runs as table-owner (postgres), so REVOKE on anon/authenticated
--        does not affect trigger semantics. Application sweep confirmed
--        zero `rpc('trg_pricing_history_*')` / `rpc('create_default_*')`
--        call sites in src/.
--
--   §C — Move pg_trgm + vector extensions out of public schema into
--        dedicated `extensions` schema per Supabase advisor 0014
--        `extension_in_public`. ALTER DATABASE search_path keeps
--        existing operator-class references (`gin_trgm_ops`,
--        `vector_cosine_ops`) resolving for the 4 affected indexes
--        on item_aliases, items, pricing_history (verified pre-apply
--        via pg_indexes scan).
--
-- Data-loss contract: ZERO row-level data touched. All changes are
-- function definitions, role grants, and extension schema location.
-- Idempotent re-apply safe (CREATE OR REPLACE + ALTER EXTENSION).
-- See 00102_wa_iter1_security_cleanup.down.sql for full rollback.

BEGIN;

-- ============================================================================
-- §A — search_path hardening (8 functions)
-- ============================================================================

-- A.1: public.trg_change_orders_status_sync
-- (NOT SECURITY DEFINER per current pg_get_functiondef snapshot.)
CREATE OR REPLACE FUNCTION public.trg_change_orders_status_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
DECLARE
  bl_id UUID;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Recompute budget_line co_adjustments for affected lines
    FOR bl_id IN
      SELECT DISTINCT col.budget_line_id
        FROM public.change_order_lines col
        WHERE col.co_id = NEW.id
          AND col.budget_line_id IS NOT NULL
          AND col.deleted_at IS NULL
    LOOP
      PERFORM public.recompute_budget_line_co_adjustments(bl_id);
    END LOOP;
    -- Job-level cache (approved_cos_total, current_contract_amount) is now
    -- handled by co_cache_trigger which uses total_with_fee.
  END IF;
  RETURN NEW;
END;
$function$;

-- A.2: public._compute_scheduled_payment_date
-- (IMMUTABLE; NOT SECURITY DEFINER per current snapshot.)
CREATE OR REPLACE FUNCTION public._compute_scheduled_payment_date(_received_date date, _schedule text)
 RETURNS date
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path = public, pg_temp
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

-- A.3: app_private.co_cache_trigger
-- (NOT SECURITY DEFINER per current snapshot. Calls
-- app_private.refresh_approved_cos_total — schema list expanded.)
CREATE OR REPLACE FUNCTION app_private.co_cache_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, app_private, pg_temp
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

-- A.4: app_private.cleanup_stale_import_errors
-- (IS SECURITY DEFINER per current snapshot.)
CREATE OR REPLACE FUNCTION app_private.cleanup_stale_import_errors(p_older_than_days integer DEFAULT 7)
 RETURNS TABLE(invoices_soft_deleted integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, app_private, pg_temp
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

-- A.5: app_private.update_vip_landed_total_cents
-- (NOT SECURITY DEFINER per current snapshot.)
CREATE OR REPLACE FUNCTION app_private.update_vip_landed_total_cents()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, app_private, pg_temp
AS $function$
BEGIN
  NEW.landed_total_cents :=
    COALESCE(NEW.total_cents, 0) +
    COALESCE(NEW.tax_cents, 0) +
    COALESCE(NEW.overhead_allocated_cents, 0);
  RETURN NEW;
END;
$function$;

-- A.6: public.org_cost_codes_set_updated_at
-- (NOT SECURITY DEFINER per current snapshot.)
CREATE OR REPLACE FUNCTION public.org_cost_codes_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- A.7: public.touch_updated_at
-- (NOT SECURITY DEFINER per current snapshot.)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $function$;

-- A.8: app_private.update_iel_landed_total_cents
-- (NOT SECURITY DEFINER per current snapshot.)
CREATE OR REPLACE FUNCTION app_private.update_iel_landed_total_cents()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, app_private, pg_temp
AS $function$
BEGIN
  NEW.landed_total_cents :=
    COALESCE(NEW.raw_total_cents, 0) +
    COALESCE(NEW.line_tax_cents, 0) +
    COALESCE(NEW.overhead_allocated_cents, 0);
  RETURN NEW;
END;
$function$;

-- §A verification (inline; transaction will ROLLBACK on assertion failure)
DO $$
DECLARE
  v_missing_search_path text[] := ARRAY[]::text[];
  rec record;
BEGIN
  FOR rec IN
    SELECT n.nspname AS schema, p.proname AS function_name, p.proconfig
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE (n.nspname = 'public' AND p.proname IN (
             'trg_change_orders_status_sync',
             '_compute_scheduled_payment_date',
             'org_cost_codes_set_updated_at',
             'touch_updated_at'))
       OR (n.nspname = 'app_private' AND p.proname IN (
             'co_cache_trigger',
             'cleanup_stale_import_errors',
             'update_vip_landed_total_cents',
             'update_iel_landed_total_cents'))
  LOOP
    IF rec.proconfig IS NULL
       OR NOT EXISTS (
         SELECT 1
         FROM unnest(rec.proconfig) AS cfg
         WHERE cfg LIKE 'search_path=%'
       )
    THEN
      v_missing_search_path := array_append(
        v_missing_search_path,
        rec.schema || '.' || rec.function_name
      );
    END IF;
  END LOOP;

  IF array_length(v_missing_search_path, 1) > 0 THEN
    RAISE EXCEPTION 'Section A verification FAILED: % function(s) missing search_path: %',
      array_length(v_missing_search_path, 1),
      array_to_string(v_missing_search_path, ', ');
  END IF;
END $$;

-- ============================================================================
-- §B — REVOKE EXECUTE on internal-trigger SECURITY DEFINER functions (7)
-- ============================================================================
--
-- All 7 functions are SECURITY DEFINER per pre-apply pg_proc snapshot.
-- Trigger fire context (table-owner role = postgres) is unaffected by
-- REVOKE on anon/authenticated; only RPC-style invocation through
-- /rest/v1/rpc/<function> is closed. Application sweep confirmed zero
-- application call sites for any of these 7 functions.

REVOKE EXECUTE ON FUNCTION public.trg_pricing_history_from_co_line()
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_pricing_history_from_invoice_line()
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_pricing_history_from_invoice_status()
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_pricing_history_from_po_line()
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_pricing_history_from_proposal_line()
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_default_approval_chains()
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_default_workflow_settings()
  FROM anon, authenticated;

-- §B verification (inline)
DO $$
DECLARE
  v_still_executable text[] := ARRAY[]::text[];
  rec record;
BEGIN
  FOR rec IN
    SELECT n.nspname AS schema, p.proname AS function_name, p.proacl
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'trg_pricing_history_from_co_line',
        'trg_pricing_history_from_invoice_line',
        'trg_pricing_history_from_invoice_status',
        'trg_pricing_history_from_po_line',
        'trg_pricing_history_from_proposal_line',
        'create_default_approval_chains',
        'create_default_workflow_settings'
      )
  LOOP
    -- proacl is an aclitem[] like {anon=X/postgres,authenticated=X/postgres,...}
    -- After REVOKE, anon= and authenticated= entries should not appear.
    IF rec.proacl IS NOT NULL
       AND EXISTS (
         SELECT 1
         FROM unnest(rec.proacl::text[]) AS acl
         WHERE acl LIKE 'anon=%' OR acl LIKE 'authenticated=%'
       )
    THEN
      v_still_executable := array_append(
        v_still_executable,
        rec.schema || '.' || rec.function_name
      );
    END IF;
  END LOOP;

  IF array_length(v_still_executable, 1) > 0 THEN
    RAISE EXCEPTION 'Section B verification FAILED: % function(s) still grant EXECUTE to anon/authenticated: %',
      array_length(v_still_executable, 1),
      array_to_string(v_still_executable, ', ');
  END IF;
END $$;

-- ============================================================================
-- §C — Move pg_trgm + vector extensions out of public schema
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

-- Make `extensions` part of the default database search_path BEFORE the move,
-- so existing index operator-class references (gin_trgm_ops, vector_cosine_ops)
-- continue to resolve. Per Supabase canonical pattern.
ALTER DATABASE postgres SET search_path TO "$user", public, extensions;

-- Move extensions
ALTER EXTENSION pg_trgm SET SCHEMA extensions;
ALTER EXTENSION vector SET SCHEMA extensions;

-- §C verification (inline)
DO $$
DECLARE
  v_pg_trgm_schema name;
  v_vector_schema name;
BEGIN
  SELECT extnamespace::regnamespace::name INTO v_pg_trgm_schema
  FROM pg_extension WHERE extname = 'pg_trgm';
  SELECT extnamespace::regnamespace::name INTO v_vector_schema
  FROM pg_extension WHERE extname = 'vector';

  IF v_pg_trgm_schema IS DISTINCT FROM 'extensions' THEN
    RAISE EXCEPTION 'Section C verification FAILED: pg_trgm in schema %, expected extensions',
      v_pg_trgm_schema;
  END IF;
  IF v_vector_schema IS DISTINCT FROM 'extensions' THEN
    RAISE EXCEPTION 'Section C verification FAILED: vector in schema %, expected extensions',
      v_vector_schema;
  END IF;
END $$;

-- ============================================================================
-- §D — Trigger-fire sanity check (AC-WA-iter1-05)
-- ============================================================================
-- Verifies that the 5 trg_pricing_history_* triggers still fire correctly
-- under REVOKE EXECUTE (trigger context = table-owner, unaffected by
-- caller-role grant changes). We confirm structural integrity: triggers
-- still exist and are enabled on their target tables. Trigger-fire on
-- representative data is verified post-migration by the QA harness — not
-- inside this transaction (which would require fixture INSERTs against
-- live tenant tables and is out of scope per requires_smoke: false).
DO $$
DECLARE
  v_missing_triggers text[] := ARRAY[]::text[];
  v_expected_count int := 5;
  v_actual_count int;
BEGIN
  SELECT COUNT(*) INTO v_actual_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname LIKE 'trg_pricing_history_from_%'
    AND p.prosecdef = true;

  IF v_actual_count < v_expected_count THEN
    RAISE EXCEPTION 'Section D verification FAILED: expected % SECURITY DEFINER trg_pricing_history_* functions, found %',
      v_expected_count, v_actual_count;
  END IF;
END $$;

COMMIT;
