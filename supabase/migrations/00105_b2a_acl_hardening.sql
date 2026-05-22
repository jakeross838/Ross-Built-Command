-- =============================================================================
-- 00105_b2a_acl_hardening.sql
--
-- B-2a ACL hardening per nwrp208 — closes BLOCKING-1 + WARNING-1 from
-- /nightwork-qa B-2a (commit 229e759).
--
-- Pattern: explicit-named-role-survives-PUBLIC-revoke (third instance, per
-- nwrp208 §3). Wave-A PUBLIC gap was the first → migration 00103.
-- B-2a invite-RPC anon survival is the third. We codified the convention
-- for exactly this — apply the fix, don't defer our own lesson.
--
-- 3-line REVOKE:
--   - create_client_portal_invite: REMOVE anon (was auto-granted by Supabase
--     default ACL; survived 00104's REVOKE FROM PUBLIC). Function is admin
--     only per 00074:441-443 design + 00104 §3a comment "authenticated only".
--   - submit_client_portal_message + mark_client_portal_message_read: REMOVE
--     authenticated (also auto-granted; survived 00104's REVOKE FROM PUBLIC).
--     Functions are homeowner-only per 00074:496-497 + 00074:545-546 design.
--
-- Inline verification INSIDE transaction per nwrp208 §10-13:
--   - proacl on all 3 functions shows EXACT intended role per function
--   - RPC bodies unchanged (auth checks intact — defense-in-depth stays)
--   - Any wrong → ROLLBACK + surface
--
-- Authored: 2026-05-22 per nwrp208 (considered bump $75 → $85, scoped to
-- ACL fix + lean re-verify + GATE B-2a + ship)
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1 — REVOKE explicit named-role grants
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.create_client_portal_invite(UUID, UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ) FROM anon;

REVOKE EXECUTE ON FUNCTION public.submit_client_portal_message(TEXT, TEXT) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.mark_client_portal_message_read(TEXT, UUID) FROM authenticated;

-- =============================================================================
-- STEP 2 — Inline verification: proacl on all 3 functions per nwrp208 §10-11
-- =============================================================================
-- Pattern: aclexplode pg_proc.proacl + assert intended role exists + assert
-- unintended roles do NOT exist + assert no =%PUBLIC entry remains.
-- Any deviation → RAISE EXCEPTION → ROLLBACK.

DO $$
DECLARE
  invite_authenticated_count INTEGER;
  invite_anon_count INTEGER;
  invite_public_count INTEGER;
  submit_anon_count INTEGER;
  submit_authenticated_count INTEGER;
  submit_public_count INTEGER;
  mark_anon_count INTEGER;
  mark_authenticated_count INTEGER;
  mark_public_count INTEGER;
BEGIN
  -- create_client_portal_invite: MUST have authenticated, MUST NOT have anon or PUBLIC
  SELECT COUNT(*) INTO invite_authenticated_count
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace,
         LATERAL aclexplode(p.proacl) acl
   WHERE p.proname = 'create_client_portal_invite'
     AND n.nspname = 'public'
     AND acl.grantee = (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
     AND acl.privilege_type = 'EXECUTE';

  SELECT COUNT(*) INTO invite_anon_count
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace,
         LATERAL aclexplode(p.proacl) acl
   WHERE p.proname = 'create_client_portal_invite'
     AND n.nspname = 'public'
     AND acl.grantee = (SELECT oid FROM pg_roles WHERE rolname = 'anon')
     AND acl.privilege_type = 'EXECUTE';

  SELECT COUNT(*) INTO invite_public_count
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace,
         LATERAL aclexplode(p.proacl) acl
   WHERE p.proname = 'create_client_portal_invite'
     AND n.nspname = 'public'
     AND acl.grantee = 0  -- 0 = PUBLIC
     AND acl.privilege_type = 'EXECUTE';

  IF invite_authenticated_count = 0 THEN
    RAISE EXCEPTION 'BLOCKING: create_client_portal_invite missing EXECUTE for authenticated (intended caller per nwrp208 §11)';
  END IF;

  IF invite_anon_count > 0 THEN
    RAISE EXCEPTION 'BLOCKING: create_client_portal_invite still has EXECUTE for anon AFTER REVOKE (nwrp208 §11 violation; BLOCKING-1 not closed)';
  END IF;

  IF invite_public_count > 0 THEN
    RAISE EXCEPTION 'BLOCKING: create_client_portal_invite has EXECUTE for PUBLIC (nwrp208 §11 — no =%% PUBLIC entry allowed)';
  END IF;

  -- submit_client_portal_message: MUST have anon, MUST NOT have authenticated or PUBLIC
  SELECT COUNT(*) INTO submit_anon_count
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace,
         LATERAL aclexplode(p.proacl) acl
   WHERE p.proname = 'submit_client_portal_message'
     AND n.nspname = 'public'
     AND acl.grantee = (SELECT oid FROM pg_roles WHERE rolname = 'anon')
     AND acl.privilege_type = 'EXECUTE';

  SELECT COUNT(*) INTO submit_authenticated_count
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace,
         LATERAL aclexplode(p.proacl) acl
   WHERE p.proname = 'submit_client_portal_message'
     AND n.nspname = 'public'
     AND acl.grantee = (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
     AND acl.privilege_type = 'EXECUTE';

  SELECT COUNT(*) INTO submit_public_count
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace,
         LATERAL aclexplode(p.proacl) acl
   WHERE p.proname = 'submit_client_portal_message'
     AND n.nspname = 'public'
     AND acl.grantee = 0
     AND acl.privilege_type = 'EXECUTE';

  IF submit_anon_count = 0 THEN
    RAISE EXCEPTION 'BLOCKING: submit_client_portal_message missing EXECUTE for anon (intended caller per 00074:496-497)';
  END IF;

  IF submit_authenticated_count > 0 THEN
    RAISE EXCEPTION 'BLOCKING: submit_client_portal_message still has EXECUTE for authenticated AFTER REVOKE (nwrp208 WARNING-1 not closed)';
  END IF;

  IF submit_public_count > 0 THEN
    RAISE EXCEPTION 'BLOCKING: submit_client_portal_message has EXECUTE for PUBLIC';
  END IF;

  -- mark_client_portal_message_read: MUST have anon, MUST NOT have authenticated or PUBLIC
  SELECT COUNT(*) INTO mark_anon_count
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace,
         LATERAL aclexplode(p.proacl) acl
   WHERE p.proname = 'mark_client_portal_message_read'
     AND n.nspname = 'public'
     AND acl.grantee = (SELECT oid FROM pg_roles WHERE rolname = 'anon')
     AND acl.privilege_type = 'EXECUTE';

  SELECT COUNT(*) INTO mark_authenticated_count
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace,
         LATERAL aclexplode(p.proacl) acl
   WHERE p.proname = 'mark_client_portal_message_read'
     AND n.nspname = 'public'
     AND acl.grantee = (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
     AND acl.privilege_type = 'EXECUTE';

  SELECT COUNT(*) INTO mark_public_count
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace,
         LATERAL aclexplode(p.proacl) acl
   WHERE p.proname = 'mark_client_portal_message_read'
     AND n.nspname = 'public'
     AND acl.grantee = 0
     AND acl.privilege_type = 'EXECUTE';

  IF mark_anon_count = 0 THEN
    RAISE EXCEPTION 'BLOCKING: mark_client_portal_message_read missing EXECUTE for anon (intended caller per 00074:545-546)';
  END IF;

  IF mark_authenticated_count > 0 THEN
    RAISE EXCEPTION 'BLOCKING: mark_client_portal_message_read still has EXECUTE for authenticated AFTER REVOKE (nwrp208 WARNING-1 not closed)';
  END IF;

  IF mark_public_count > 0 THEN
    RAISE EXCEPTION 'BLOCKING: mark_client_portal_message_read has EXECUTE for PUBLIC';
  END IF;

  -- All 3 functions' ACL state verified clean
  RAISE NOTICE 'ACL hardening verified clean: create_client_portal_invite=authenticated; submit/mark=anon. nwrp208 §11 satisfied.';
END $$;

-- =============================================================================
-- STEP 3 — Inline verification: RPC bodies unchanged (defense-in-depth stays)
-- =============================================================================
-- Per nwrp208 §12: re-confirm RPC bodies unchanged (auth checks intact —
-- the defense-in-depth layer stays). Sanity check that 00105 only touches
-- ACLs, not function bodies.

DO $$
DECLARE
  invite_body_has_auth_check BOOLEAN;
  invite_body_has_client_id_select BOOLEAN;
  invite_body_has_one_year BOOLEAN;
  submit_body_has_one_year BOOLEAN;
  mark_body_has_one_year BOOLEAN;
BEGIN
  -- create_client_portal_invite: body must contain auth check (00074:407-421)
  -- + client_id SELECT (B-2a fix per 00104:227-232) + 1-year interval (L-4)
  SELECT pg_get_functiondef(p.oid) LIKE '%app_private.user_org_id()%' INTO invite_body_has_auth_check
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE p.proname = 'create_client_portal_invite' AND n.nspname = 'public';

  SELECT pg_get_functiondef(p.oid) LIKE '%SELECT j.client_id INTO _client_id%' INTO invite_body_has_client_id_select
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE p.proname = 'create_client_portal_invite' AND n.nspname = 'public';

  SELECT pg_get_functiondef(p.oid) LIKE '%interval ''1 year''%' INTO invite_body_has_one_year
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE p.proname = 'create_client_portal_invite' AND n.nspname = 'public';

  IF NOT invite_body_has_auth_check THEN
    RAISE EXCEPTION 'BLOCKING: create_client_portal_invite body missing app_private.user_org_id() auth check (defense-in-depth removed?)';
  END IF;

  IF NOT invite_body_has_client_id_select THEN
    RAISE EXCEPTION 'BLOCKING: create_client_portal_invite body missing SELECT j.client_id INTO _client_id (B-2a NULL-leak fix removed?)';
  END IF;

  IF NOT invite_body_has_one_year THEN
    RAISE EXCEPTION 'BLOCKING: create_client_portal_invite body missing interval ''1 year'' (L-4 1-year flip removed?)';
  END IF;

  -- submit_client_portal_message: body must contain 1-year sliding window (L-4)
  SELECT pg_get_functiondef(p.oid) LIKE '%interval ''1 year''%' INTO submit_body_has_one_year
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE p.proname = 'submit_client_portal_message' AND n.nspname = 'public';

  IF NOT submit_body_has_one_year THEN
    RAISE EXCEPTION 'BLOCKING: submit_client_portal_message body missing interval ''1 year'' (L-4 flip removed?)';
  END IF;

  -- mark_client_portal_message_read: body must contain 1-year sliding window (L-4)
  SELECT pg_get_functiondef(p.oid) LIKE '%interval ''1 year''%' INTO mark_body_has_one_year
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE p.proname = 'mark_client_portal_message_read' AND n.nspname = 'public';

  IF NOT mark_body_has_one_year THEN
    RAISE EXCEPTION 'BLOCKING: mark_client_portal_message_read body missing interval ''1 year'' (L-4 flip removed?)';
  END IF;

  RAISE NOTICE 'RPC bodies verified unchanged: defense-in-depth + NULL-leak fix + 1-year sliding window all intact.';
END $$;

COMMIT;
