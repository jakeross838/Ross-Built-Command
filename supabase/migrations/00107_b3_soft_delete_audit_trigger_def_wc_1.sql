-- Migration 00107 — B-3 Soft-delete audit DB-trigger safety net + DEF-WC-1
--                   org_members RESTRICTIVE backstop
--
-- Phase:   F1-Wave-B Slice-2 (Knowledge Graph + Auth Foundation)
-- Plan:    B-3 (per .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-3-PLAN.md)
-- Threat:  HIGH (per B-3-CONTEXT D-32 + EXPANDED-SCOPE §7 plan #2 line 333)
-- Authorization: nwrp216 §5 PLAN APPROVED for /nx (plan-approval; POST-EXECUTE GATE B-3 pending)
--
-- =============================================================================
-- SCOPE
-- =============================================================================
--
-- 1. CREATE FUNCTION app_private.audit_soft_delete()
--    - SECURITY DEFINER trigger function writing one activity_log row per
--      soft-delete transition (deleted_at NULL -> NOT NULL).
--    - Three-tier user-id resolution: auth.uid() -> app.current_user_id -> NULL.
--    - entity_type singular mapping via CASE (NOT plural TG_TABLE_NAME) per
--      B-3-PLAN iter-2 BLOCKING-1 fix per nwrp215 decision 3b.
--    - action = 'deleted' (existing ActivityAction union member; NOT
--      'soft_deleted') per BLOCKING-2 fix per nwrp215 decision 3b. Mechanism
--      discriminator in details.actor_source + details.mechanism = 'db_trigger'.
--    - BEGIN/EXCEPTION wrapper around INSERT for graceful degradation per
--      BLOCKING-3 fix (AC-B3-10 contract: trigger MUST NOT block soft-delete).
--    - SET search_path = public, pg_temp (CLAUDE.md Dev Rules canonical pattern).
--    - REVOKE EXECUTE FROM PUBLIC per migration 00103 + B-2a ACL hardening
--      lesson per nwrp208.
--
-- 2. DO BLOCK applying 32 per-table AFTER UPDATE triggers
--    - Naming: zz_soft_delete_audit_<table> (alphabetic 'z' = fires LAST
--      among AFTER UPDATE triggers per pre-design audit §1.4).
--    - WHEN clause limits firing to soft-delete transition only.
--    - Idempotent: DROP IF EXISTS + CREATE pattern.
--    - SQL injection safe: format() + %I quoting on hard-coded table list.
--
-- 3. DEF-WC-1 — org_members RESTRICTIVE backstop policies
--    - org_members_org_isolation (RESTRICTIVE, ALL)
--    - org_members_delete_strict (RESTRICTIVE, DELETE)
--    - Canonical direct-call form per nwrp215 decision 2 Option A
--      (matches existing 14 Pattern A tables verbatim).
--    - DELETE policy deliberately omits is_platform_admin() OR-clause
--      per canonical pattern (migration 00049) — cross-org membership removal
--      must route through admin tooling with separate audit.
--
-- =============================================================================
-- DEPENDENCY NOTES
-- =============================================================================
--
-- This migration relies on activity_log.relforcerowsecurity = false.
-- The SECURITY DEFINER trigger function runs as table owner (postgres
-- BYPASSRLS=true) and INSERTs into activity_log succeed regardless of RLS.
-- If future hardening adds `ALTER TABLE activity_log FORCE ROW LEVEL
-- SECURITY`, this trigger requires an explicit INSERT policy on
-- activity_log matching org_id from trigger context. Surface at that
-- future migration's PLAN-author time. See B-3-PLAN §5 R-9 + §7.
--
-- =============================================================================
-- ROLLBACK
-- =============================================================================
--
-- See 00107_b3_soft_delete_audit_trigger_def_wc_1.down.sql for symmetric
-- reverse: drop policies -> drop 32 triggers -> drop function.
-- activity_log rows from trigger captures are PRESERVED on rollback per
-- CLAUDE.md append-only audit-log rule.
--
-- =============================================================================

BEGIN;

-- ===== §A. CREATE FUNCTION app_private.audit_soft_delete() =====

CREATE OR REPLACE FUNCTION app_private.audit_soft_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_actor_source text;
  v_entity_type text;
  v_snapshot jsonb;
BEGIN
  -- BLOCKING-1 fix (nwrp215 decision 3b): plural TG_TABLE_NAME -> singular entity_type
  -- Maps to existing ActivityEntityType union members + extends with 23 new singular
  -- entity types for tables B-3 introduces audit coverage for. See
  -- src/lib/activity-log.ts ActivityEntityType union (extended in this same B-3 Task 1).
  v_entity_type := CASE TG_TABLE_NAME
    -- Existing ActivityEntityType union members (singular form already canonical):
    WHEN 'invoices' THEN 'invoice'
    WHEN 'jobs' THEN 'job'
    WHEN 'vendors' THEN 'vendor'
    WHEN 'cost_codes' THEN 'cost_code'
    WHEN 'draws' THEN 'draw'
    WHEN 'change_orders' THEN 'change_order'
    WHEN 'budget_lines' THEN 'budget_line'
    WHEN 'purchase_orders' THEN 'purchase_order'
    WHEN 'clients' THEN 'client'
    -- New singular entity types (TS union extended in Task 1 to cover these):
    WHEN 'approval_chains' THEN 'approval_chain'
    WHEN 'change_order_lines' THEN 'change_order_line'
    WHEN 'document_extraction_lines' THEN 'document_extraction_line'
    WHEN 'document_extractions' THEN 'document_extraction'
    WHEN 'draw_adjustment_line_items' THEN 'draw_adjustment_line_item'
    WHEN 'draw_adjustments' THEN 'draw_adjustment'
    WHEN 'draw_line_items' THEN 'draw_line_item'
    WHEN 'internal_billings' THEN 'internal_billing'
    WHEN 'invoice_allocations' THEN 'invoice_allocation'
    WHEN 'invoice_line_items' THEN 'invoice_line_item'
    WHEN 'items' THEN 'item'
    WHEN 'job_item_activity' THEN 'job_item_activity'   -- already singular shape
    WHEN 'job_milestones' THEN 'job_milestone'
    WHEN 'lien_releases' THEN 'lien_release'
    WHEN 'line_bom_attachments' THEN 'line_bom_attachment'
    WHEN 'line_cost_components' THEN 'line_cost_component'
    WHEN 'po_line_items' THEN 'po_line_item'
    WHEN 'proposal_line_items' THEN 'proposal_line_item'
    WHEN 'proposals' THEN 'proposal'
    WHEN 'selection_categories' THEN 'selection_category'
    WHEN 'selections' THEN 'selection'
    WHEN 'unit_conversion_suggestions' THEN 'unit_conversion_suggestion'
    WHEN 'vendor_item_pricing' THEN 'vendor_item_pricing' -- already singular shape
    ELSE TG_TABLE_NAME  -- fallback (should never hit; defense-in-depth)
  END;

  -- Three-tier user-id resolution (iter-2 W-1 fix: IF/ELSIF/ELSE for auditability):
  --   Tier 1: auth.uid() -- primary (PostgREST sets request.jwt.claim.sub per transaction)
  --   Tier 2: current_setting('app.current_user_id', true) -- service-role escape hatch
  --   Tier 3: NULL -- fallback for true headless context
  --
  -- MF-8 CONTRACT (per nwrp215 + B-3-PLAN §2.6): set_config('app.current_user_id',
  -- user_id, true) is set ONLY by trusted server-side code (service-role API routes
  -- deliberately propagating actor context). NEVER by client-bound SQL (PostgREST,
  -- anon-token-resolved contexts, JWT-bound user contexts). Violation = audit-spoofing
  -- surface. The trigger does NOT guard against spoof because:
  --   (a) Tier 1 (auth.uid()) fires first for all authenticated paths
  --   (b) Service-role code is itself a trusted boundary
  --   (c) Wrapping SET-LOCAL in a SECURITY DEFINER helper would add complexity
  --       without meaningful additional protection.
  IF auth.uid() IS NOT NULL THEN
    v_user_id := auth.uid();
    v_actor_source := 'auth_uid';
  ELSIF nullif(current_setting('app.current_user_id', true), '') IS NOT NULL THEN
    v_user_id := nullif(current_setting('app.current_user_id', true), '')::uuid;
    v_actor_source := 'app_current_user_id';
  ELSE
    v_user_id := NULL;
    v_actor_source := 'service_role';
  END IF;

  -- Bounded row snapshot summary (NOT full row dump -- activity_log has 7-year retention).
  -- mechanism = 'db_trigger' discriminates trigger-written rows from app-layer
  -- logActivity calls (which omit this field).
  v_snapshot := jsonb_build_object(
    'actor_source', v_actor_source,
    'deleted_at', NEW.deleted_at,
    'trigger_name', TG_NAME,
    'trigger_table', TG_TABLE_NAME,
    'mechanism', 'db_trigger'
  );

  -- BLOCKING-3 fix (iter-2): Wrap INSERT in EXCEPTION block to enforce AC-B3-10
  -- graceful degradation contract. If activity_log INSERT fails for any reason
  -- (constraint, lock timeout, schema mismatch, transient error), trigger
  -- RAISE WARNING + RETURN NEW -- does NOT propagate exception to caller. The
  -- soft-delete UPDATE succeeds; audit row may be lost (visible via Sentry +
  -- Postgres logs). Better to lose one audit row than to silently block a
  -- soft-delete on every tenant table.
  BEGIN
    INSERT INTO public.activity_log (
      org_id, user_id, entity_type, entity_id, action, details, actor_token_id
    ) VALUES (
      NEW.org_id,          -- cross-tenant integrity: audit stays in same tenant
      v_user_id,           -- nullable; resolved via three-tier fallback
      v_entity_type,       -- singular form mapped via CASE (NOT raw TG_TABLE_NAME)
      NEW.id,              -- soft-deleted row's id
      'deleted',           -- existing ActivityAction union member (NOT 'soft_deleted')
      v_snapshot,          -- bounded JSONB with actor_source + mechanism discriminator
      NULL                 -- actor_token_id = NULL (soft-delete is user-initiated)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'audit_soft_delete trigger failed for table=% id=% org=%: %',
                  TG_TABLE_NAME, NEW.id, NEW.org_id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- REVOKE EXECUTE FROM PUBLIC + authenticated -- canonical 00103 + B-2a ACL hardening
-- posture (nwrp208 lesson). Trigger function is invoked by the trigger mechanism
-- only, NOT by SQL clients. No EXECUTE grant to anon/authenticated. Verified
-- post-migration via aclexplode + grantee=0 + grantee=authenticated.oid pattern
-- (AC-B3-08 PART 2).
--
-- REVOKE FROM authenticated is REQUIRED because pg_default_acl on app_private schema
-- auto-grants EXECUTE to authenticated for every new function created in the schema
-- (`pg_default_acl WHERE defaclnamespace='app_private' AND defaclobjtype='f'` =
-- `{authenticated=X/postgres}`). REVOKE FROM PUBLIC alone leaves the
-- default-ACL-driven authenticated grant in place. This was discovered during
-- M-05 inline verification at apply time (deviation Rule 2 -- auto-add missing
-- critical functionality; documented in B-3-SUMMARY.md).
REVOKE EXECUTE ON FUNCTION app_private.audit_soft_delete() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION app_private.audit_soft_delete() FROM authenticated;

-- ===== §B. Apply per-table triggers to all 32 target tables =====
--
-- The hard-coded 32-table list was sourced via the live pre-design audit query
-- in B-3-PLAN §1.1 (information_schema.columns INTERSECT WHERE column_name IN
-- ('org_id', 'deleted_at')). Adding a new tenant table requires extending this
-- list in a new migration.

DO $$
DECLARE
  v_table text;
  v_target_tables text[] := ARRAY[
    'approval_chains','budget_lines','change_order_lines','change_orders','clients',
    'cost_codes','document_extraction_lines','document_extractions','draw_adjustment_line_items',
    'draw_adjustments','draw_line_items','draws','internal_billings','invoice_allocations',
    'invoice_line_items','invoices','items','job_item_activity','job_milestones','jobs',
    'lien_releases','line_bom_attachments','line_cost_components','po_line_items',
    'proposal_line_items','proposals','purchase_orders','selection_categories','selections',
    'unit_conversion_suggestions','vendor_item_pricing','vendors'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_target_tables LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I ON public.%I',
      'zz_soft_delete_audit_' || v_table,
      v_table
    );
    EXECUTE format(
      'CREATE TRIGGER %I AFTER UPDATE ON public.%I FOR EACH ROW WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) EXECUTE FUNCTION app_private.audit_soft_delete()',
      'zz_soft_delete_audit_' || v_table,
      v_table
    );
  END LOOP;
END $$;

-- ===== §C. DEF-WC-1 -- org_members RESTRICTIVE backstop policies =====
--
-- Adds defense-in-depth on org_members. The 3 existing PERMISSIVE policies
-- ('admin manage org_members', 'members read org_members',
-- 'org_members_platform_admin_read') all check org_id internally but a dropped
-- or buggy PERMISSIVE policy leaks. RESTRICTIVE AND's with PERMISSIVE so
-- even a broken PERMISSIVE cannot leak.
--
-- Canonical direct-call form per nwrp215 decision 2 Option A: matches the
-- existing 14 Pattern A tables (jobs/invoices/vendors/etc.) verbatim.
-- (SELECT app_private.user_org_id()) session-cache wrap was considered but
-- rejected -- consistency across the canonical RLS surface beats local
-- optimization on this single high-frequency table. If a future Wave 1.1-Lite
-- sweep normalizes the canonical 14 to SELECT-wrapped form, DEF-WC-1
-- normalizes along with them.

CREATE POLICY "org_members_org_isolation" ON public.org_members
  AS RESTRICTIVE
  FOR ALL
  USING ((org_id = app_private.user_org_id()) OR app_private.is_platform_admin())
  WITH CHECK (org_id = app_private.user_org_id());

-- DELETE backstop closes platform_admin-cross-org-delete vector.
-- DELIBERATELY omits is_platform_admin() OR-clause per canonical pattern
-- (migration 00049). platform_admin retains cross-org SELECT (via
-- org_isolation policy above) but NOT cross-org DELETE -- cross-org membership
-- removal is an operations event that must be audited separately via admin
-- tooling. Per W-3 / iter-2 rationale codification (B-3-PLAN §2.3).
CREATE POLICY "org_members_delete_strict" ON public.org_members
  AS RESTRICTIVE
  FOR DELETE
  USING (org_id = app_private.user_org_id());

COMMIT;
