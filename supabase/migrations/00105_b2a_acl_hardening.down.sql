-- =============================================================================
-- 00105_b2a_acl_hardening.down.sql
--
-- Reverse of 00105_b2a_acl_hardening.sql — restores the pre-fix ACL state
-- where Supabase default ACL auto-grants survived the original 00074/00104
-- REVOKE FROM PUBLIC pattern.
--
-- NOTE: This down-migration explicitly re-grants the unwanted ACL entries
-- that 00105 removed. Rolling back 00105 re-introduces BLOCKING-1 + WARNING-1
-- from the B-2a QA review (commit 229e759). Use only if 00105's verification
-- DO blocks raised unexpectedly OR if a downstream issue surfaces; defense-in-
-- depth at the function body level remains intact regardless.
--
-- Authored: 2026-05-22 per nwrp208
-- =============================================================================

BEGIN;

-- Restore the explicit named-role EXECUTE grants that 00105 removed
GRANT EXECUTE ON FUNCTION public.create_client_portal_invite(UUID, UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ) TO anon;

GRANT EXECUTE ON FUNCTION public.submit_client_portal_message(TEXT, TEXT) TO authenticated;

GRANT EXECUTE ON FUNCTION public.mark_client_portal_message_read(TEXT, UUID) TO authenticated;

COMMIT;
