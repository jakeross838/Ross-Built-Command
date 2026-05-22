-- Migration 00107 DOWN — Reverse B-3 Soft-delete audit DB-trigger + DEF-WC-1
--
-- Symmetric reverse of 00107_b3_soft_delete_audit_trigger_def_wc_1.sql.
-- Order: drop policies -> drop 32 triggers -> drop function.
--
-- activity_log rows captured BY THE TRIGGER between ship and rollback are
-- PRESERVED per CLAUDE.md soft-delete + status_history append-only rules.
-- The rolled-back triggers do not retroactively erase their historical
-- audit captures. If admin needs to purge rolled-back-trigger audit rows,
-- separate operations-only SQL DELETE, audit-logged externally.

BEGIN;

-- ===== §A. Drop DEF-WC-1 RESTRICTIVE policies on org_members =====

DROP POLICY IF EXISTS "org_members_delete_strict" ON public.org_members;
DROP POLICY IF EXISTS "org_members_org_isolation" ON public.org_members;

-- ===== §B. Drop per-table soft-delete audit triggers =====

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
  END LOOP;
END $$;

-- ===== §C. Drop trigger function =====

DROP FUNCTION IF EXISTS app_private.audit_soft_delete();

COMMIT;
