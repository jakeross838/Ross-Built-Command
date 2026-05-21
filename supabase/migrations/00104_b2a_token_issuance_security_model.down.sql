-- ============================================================
-- F1 Wave-B Slice-2 B-2a — Token-issuance security model — DOWN
--
-- Reverses 00104 forward migration. Sequence: drop downstream-most
-- artifacts first, then restore upstream RPC bodies + indexes.
--
-- Atomic per CONTEXT D-17. Cohesive rollback unit.
--
-- §3 RPC bodies restored to 00074:390-439 + 00074:448-494 + 00074:501-543
-- byte-for-byte (90-day sliding-window restored; client_id derivation +
-- RAISE removed; signature preserved).
--
-- §1k token-hash index restored to 00074:188-190 partial form
-- (WHERE revoked_at IS NULL) per BLK-3 down-reverse parity.
--
-- §3a/3b/3c GRANT pairs restored to 00074:441-443 + 00074:496-497 +
-- 00074:545-546 verbatim per BLK-4 down-reverse parity.
-- ============================================================

BEGIN;

-- =========================================================================
-- §6 reverse — drop draws.job_id index
-- =========================================================================
DROP INDEX IF EXISTS public.idx_draws_job_id;

-- =========================================================================
-- §5d/c/b/a reverse — drop rate-limit RPC + cleanup + table
-- =========================================================================
DROP FUNCTION IF EXISTS public.record_owner_portal_request(TEXT, TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.cleanup_owner_portal_rate_limit();
-- nightwork: drop-justified — owner_portal_rate_limit was created by this same migration (00104 forward §5). Down-migration reverses the forward CREATE TABLE; no data loss outside the rollback unit's own scope.
DROP TABLE IF EXISTS public.owner_portal_rate_limit;

-- =========================================================================
-- §4 reverse — drop activity_log.actor_token_id column + index
-- (auto-named FK constraint activity_log_actor_token_id_fkey drops with column)
-- =========================================================================
DROP INDEX IF EXISTS public.idx_activity_log_actor_token;
ALTER TABLE public.activity_log DROP COLUMN IF EXISTS actor_token_id;

-- =========================================================================
-- §3 reverse — restore 00074 RPC bodies verbatim (no client_id derivation;
-- no RAISE on NULL; 90-day sliding-window UPDATE).
--
-- Source: supabase/migrations/00074_client_portal.sql:390-439, 448-494, 501-543
-- =========================================================================

-- §3 reverse — create_client_portal_invite restored to 00074:390-439
CREATE OR REPLACE FUNCTION public.create_client_portal_invite(
  p_org_id UUID,
  p_job_id UUID,
  p_email TEXT,
  p_name TEXT,
  p_visibility_config JSONB,
  p_expires_at TIMESTAMPTZ
)
RETURNS TABLE(portal_access_id UUID, plaintext_token TEXT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  _plaintext TEXT;
  _hash TEXT;
  _new_id UUID;
BEGIN
  -- Caller must be org member with role IN ('owner','admin','pm')
  -- and (if pm) own the job. Mirrors Amendment H insert policy.
  IF NOT (
    p_org_id = app_private.user_org_id()
    AND app_private.user_role() IN ('owner','admin','pm')
    AND (
      app_private.user_role() IN ('owner','admin')
      OR EXISTS (
        SELECT 1 FROM public.jobs j
        WHERE j.id = p_job_id AND j.pm_id = auth.uid()
      )
    )
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  _plaintext := encode(extensions.gen_random_bytes(32), 'hex');
  _hash := encode(extensions.digest(_plaintext, 'sha256'), 'hex');

  INSERT INTO public.client_portal_access (
    org_id, job_id, email, name, access_token_hash,
    visibility_config, expires_at, created_by
  ) VALUES (
    p_org_id, p_job_id, p_email, p_name, _hash,
    COALESCE(p_visibility_config, '{}'::jsonb),
    COALESCE(p_expires_at, now() + interval '90 days'),
    auth.uid()
  )
  RETURNING id INTO _new_id;

  RETURN QUERY SELECT _new_id, _plaintext;
END;
$function$;

-- §3a reverse — restore 00074:441-443 GRANT verbatim (authenticated only)
REVOKE EXECUTE ON FUNCTION public.create_client_portal_invite(UUID, UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_client_portal_invite(UUID, UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ) TO authenticated;

-- §3b reverse — submit_client_portal_message restored to 00074:448-494
CREATE OR REPLACE FUNCTION public.submit_client_portal_message(
  p_token TEXT,
  p_message TEXT
)
RETURNS TABLE(message_id UUID)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  _hash TEXT;
  _access RECORD;
  _new_id UUID;
BEGIN
  IF p_token IS NULL OR p_message IS NULL OR p_message = '' THEN
    RETURN;
  END IF;

  _hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  SELECT id, org_id, job_id, email
    INTO _access
    FROM public.client_portal_access
    WHERE access_token_hash = _hash
      AND revoked_at IS NULL
      AND expires_at > now();

  IF NOT FOUND THEN
    RETURN;  -- silent no-op
  END IF;

  INSERT INTO public.client_portal_messages (
    org_id, job_id, from_type, from_client_email, message
  ) VALUES (
    _access.org_id, _access.job_id, 'client',
    _access.email, p_message
  )
  RETURNING id INTO _new_id;

  -- Sliding-window: extend expires_at on successful access (00074 original 90 days).
  UPDATE public.client_portal_access
    SET last_accessed_at = now(),
        expires_at = now() + interval '90 days'
    WHERE id = _access.id;

  RETURN QUERY SELECT _new_id;
END;
$function$;

-- §3b-grant reverse — restore 00074:496-497 GRANT verbatim (anon only)
REVOKE EXECUTE ON FUNCTION public.submit_client_portal_message(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_client_portal_message(TEXT, TEXT) TO anon;

-- §3c reverse — mark_client_portal_message_read restored to 00074:501-543
CREATE OR REPLACE FUNCTION public.mark_client_portal_message_read(
  p_token TEXT,
  p_message_id UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  _hash TEXT;
  _access RECORD;
BEGIN
  IF p_token IS NULL OR p_message_id IS NULL THEN
    RETURN;
  END IF;

  _hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  SELECT id, org_id, job_id
    INTO _access
    FROM public.client_portal_access
    WHERE access_token_hash = _hash
      AND revoked_at IS NULL
      AND expires_at > now();

  IF NOT FOUND THEN
    RETURN;  -- silent no-op
  END IF;

  UPDATE public.client_portal_messages
    SET read_at = now()
    WHERE id = p_message_id
      AND org_id = _access.org_id
      AND job_id = _access.job_id
      AND from_type = 'builder'
      AND read_at IS NULL;

  -- Sliding-window: extend expires_at on successful access (00074 original 90 days).
  UPDATE public.client_portal_access
    SET last_accessed_at = now(),
        expires_at = now() + interval '90 days'
    WHERE id = _access.id;
END;
$function$;

-- §3c-grant reverse — restore 00074:545-546 GRANT verbatim (anon only)
REVOKE EXECUTE ON FUNCTION public.mark_client_portal_message_read(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_client_portal_message_read(TEXT, UUID) TO anon;

-- =========================================================================
-- §2 reverse — restore 00074 90-day expiration default
-- =========================================================================
ALTER TABLE public.client_portal_access
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '90 days');

-- =========================================================================
-- §1k reverse — restore 00074:188-190 partial token-hash index form
-- per BLK-3 down-reverse parity (WHERE revoked_at IS NULL).
-- =========================================================================
DROP INDEX IF EXISTS public.idx_client_portal_access_token_hash;
CREATE UNIQUE INDEX idx_client_portal_access_token_hash
  ON public.client_portal_access (access_token_hash)
  WHERE revoked_at IS NULL;

-- =========================================================================
-- §1f reverse — drop B-2a indexes
-- =========================================================================
DROP INDEX IF EXISTS public.idx_client_portal_access_client_id;
DROP INDEX IF EXISTS public.client_portal_access_org_client_job_seq_unique;

-- =========================================================================
-- §1e reverse — drop revoked_seq column
-- =========================================================================
ALTER TABLE public.client_portal_access DROP COLUMN IF EXISTS revoked_seq;

-- =========================================================================
-- §1d reverse — drop composite FK
-- =========================================================================
ALTER TABLE public.client_portal_access
  DROP CONSTRAINT IF EXISTS client_portal_access_org_id_client_id_fkey;

-- =========================================================================
-- §1b reverse — drop client_id column (auto-named single-column FK
-- client_portal_access_client_id_fkey drops with the column).
-- =========================================================================
ALTER TABLE public.client_portal_access DROP COLUMN IF EXISTS client_id;

-- =========================================================================
-- §1a reverse — drop UNIQUE(org_id, id) on clients
-- =========================================================================
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_org_id_id_unique;

-- =========================================================================
-- PostgREST schema cache reload
-- =========================================================================
NOTIFY pgrst, 'reload schema';

COMMIT;
