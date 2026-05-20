-- Migration 00103.down — Reverse PUBLIC EXECUTE revoke on 7 SECURITY DEFINER trigger functions
--
-- Restores the pre-apply state for environments rolling back 00103.
--
-- Data-loss contract: ZERO row-level data touched. Restores PUBLIC EXECUTE grant
-- (the extraneous-but-original grant pre-00103). Note: rolling back returns to the
-- post-00102 state (anon + authenticated REVOKE'd; PUBLIC granted). The Supabase
-- advisor will resume flagging these functions as anon/authenticated callable via
-- PUBLIC inheritance — which is the known-degraded rollback state.

BEGIN;

GRANT EXECUTE ON FUNCTION public.trg_pricing_history_from_co_line()        TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.trg_pricing_history_from_invoice_line()   TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.trg_pricing_history_from_invoice_status() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.trg_pricing_history_from_po_line()        TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.trg_pricing_history_from_proposal_line()  TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_default_approval_chains()          TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_default_workflow_settings()        TO PUBLIC;

COMMIT;
