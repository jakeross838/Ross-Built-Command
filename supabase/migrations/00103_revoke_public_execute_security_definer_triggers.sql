-- Migration 00103 — Revoke PUBLIC EXECUTE on 7 SECURITY DEFINER trigger-internal functions
--
-- Origin: Slice-2 pre-dispatch verification (nwrp195) surfaced that Wave-A iter-1
-- migration 00102 §B REVOKE EXECUTE bucket was incomplete — 5 trg_pricing_history_*
-- + 2 create_default_* functions had EXECUTE revoked from anon + authenticated but
-- PUBLIC retained EXECUTE. Anon + authenticated inherited EXECUTE via PUBLIC, so
-- `anon_security_definer_function_executable` + `authenticated_security_definer_function_executable`
-- advisors continued flagging them as callable.
--
-- Root cause (filed as TD-WAIC-03 yesterday, closed by this migration):
-- 00102 §B inline verification checked `acl LIKE 'anon=%'` and `LIKE 'authenticated=%'`
-- but did NOT check `LIKE '=%'` (PUBLIC). The DO block returned "no findings", commit
-- succeeded, but the gate that the migration claimed to close remained open.
--
-- Call-path safety (verified pre-authoring per nwrp196 STEP 1):
-- All 7 functions are TRIGGER-internal (AFTER INSERT/UPDATE on tenant tables OR
-- AFTER INSERT on organizations). Triggers execute as table-owner (postgres), NOT
-- as session role. PUBLIC EXECUTE was extraneous — revoking it cannot break trigger
-- firing. Zero src/ direct RPC callers (`grep -r "rpc('create_default\|rpc('trg_pricing_history"
-- src/` returns no files).
--
-- Authorization: nwrp196 STEP 1 verdict + nwrp197 STEP 2-4 dispatch confirmation.
--
-- Data-loss contract: ZERO row-level data touched. No data lost in either direction.
-- Safe to repeatedly apply + reverse. Pure GRANT/REVOKE change.

BEGIN;

-- ===== §A. REVOKE EXECUTE FROM PUBLIC =====

REVOKE EXECUTE ON FUNCTION public.trg_pricing_history_from_co_line()       FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_pricing_history_from_invoice_line()  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_pricing_history_from_invoice_status() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_pricing_history_from_po_line()       FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_pricing_history_from_proposal_line() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_default_approval_chains()         FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_default_workflow_settings()       FROM PUBLIC;

-- ===== §B. INLINE VERIFICATION DO BLOCK =====
-- Fail-fast: raise EXCEPTION if any of the 7 functions still shows:
--   - `=X` (PUBLIC EXECUTE; this is what 00102 missed)
--   - `anon=X` (should already be absent from 00102)
--   - `authenticated=X` (should already be absent from 00102)
-- Inside transaction so any check failure → automatic ROLLBACK (closes TD-WAIC-03
-- pattern: §B-style verification now tests for PUBLIC grant alongside named roles).

DO $$
DECLARE
  bad_function RECORD;
  acl_text TEXT;
  bad_count INTEGER := 0;
BEGIN
  FOR bad_function IN
    SELECT
      n.nspname || '.' || p.proname AS function_name,
      p.proacl AS proacl_array
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
    -- proacl is text[]; check each entry for PUBLIC + anon + authenticated grants
    -- PUBLIC entries have empty grantee prefix: '=X/...' (no role name before '=')
    -- Named-role entries: 'anon=X/...', 'authenticated=X/...'
    FOREACH acl_text IN ARRAY bad_function.proacl_array
    LOOP
      IF acl_text LIKE '=%' THEN
        RAISE EXCEPTION 'TD-WAIC-03 verification FAIL: % still has PUBLIC EXECUTE grant: %',
          bad_function.function_name, acl_text;
        bad_count := bad_count + 1;
      ELSIF acl_text LIKE 'anon=%' THEN
        RAISE EXCEPTION 'TD-WAIC-03 verification FAIL: % still has anon EXECUTE grant: %',
          bad_function.function_name, acl_text;
        bad_count := bad_count + 1;
      ELSIF acl_text LIKE 'authenticated=%' THEN
        RAISE EXCEPTION 'TD-WAIC-03 verification FAIL: % still has authenticated EXECUTE grant: %',
          bad_function.function_name, acl_text;
        bad_count := bad_count + 1;
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'TD-WAIC-03 §B verification PASSED: 7 functions cleared of PUBLIC + anon + authenticated EXECUTE grants';
END $$;

-- ===== §C. POST-VERIFICATION STRUCTURAL CHECK =====
-- Confirm all 7 functions still exist + still have SECURITY DEFINER set.
-- Trigger functions remain callable in trigger context regardless of grants;
-- this just protects against accidental DROP.

DO $$
DECLARE
  fn_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fn_count
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
    AND p.prosecdef = true;

  IF fn_count <> 7 THEN
    RAISE EXCEPTION 'TD-WAIC-03 §C structural FAIL: expected 7 SECURITY DEFINER functions present; found %', fn_count;
  END IF;

  RAISE NOTICE 'TD-WAIC-03 §C structural PASSED: 7/7 SECURITY DEFINER functions intact';
END $$;

COMMIT;
