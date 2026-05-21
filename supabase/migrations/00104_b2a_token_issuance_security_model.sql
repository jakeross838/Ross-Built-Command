-- ============================================================
-- F1 Wave-B Slice-2 B-2a — Token-issuance security model
-- (Owner Portal Path A foundation)
--
-- Atomic single migration per CONTEXT D-17. Cohesive rollback unit.
--
-- Closes:
--   - iter-1 SYNTHESIS B-2: composite same-org FK invariant via
--     (org_id, client_id) REFERENCES clients(org_id, id)
--   - iter-1 SYNTHESIS B-4: RPC NULL-leak fix — create_client_portal_invite
--     CREATE OR REPLACE derives client_id from jobs.client_id + RAISE on NULL
--   - iter-1 SYNTHESIS B-6: in-process Map rate-limit replaced with
--     DB-backed counter table + cleanup function
--   - iter-1 SYNTHESIS B-7 (admin-UI path): full covering index
--     (org_id, client_id, job_id, revoked_seq) WHERE client_id IS NOT NULL
--   - iter-1 SYNTHESIS BLK-3 (hot path): DROP existing partial
--     idx_client_portal_access_token_hash WHERE revoked_at IS NULL,
--     recreate as NON-PARTIAL to eliminate timing oracle on
--     resolveOwnerToken hot path
--   - iter-1 SYNTHESIS BLK-4: REVOKE+GRANT pairs after each
--     CREATE OR REPLACE for the 3 re-defined RPCs
--   - iter-1 SYNTHESIS B-11: draws.job_id unfiltered single-column index
--   - Plan-Author Latitude #3 APPROVED Option A: revoked_seq column
--   - Plan-Author Latitude #4 APPROVED IN-SCOPE: sliding-window UPDATE
--     90-day → 1-year in submit_client_portal_message +
--     mark_client_portal_message_read RPCs (nwrp200 1-year LOCKED)
--
-- D-23: actor_token_id column added on activity_log (B-2b WRITES land
-- the rows; B-2a only adds the column + TS interface contract).
--
-- Per CLAUDE.md Dev Rules: migration accompanied by regenerated
-- src/lib/types/database.types.ts in the same commit. NOTIFY pgrst at
-- the end forces PostgREST cache reload.
--
-- Per CLAUDE.md SECURITY DEFINER rule (advisor 0011 + 00102 sweep):
-- ALL SECURITY DEFINER functions in this migration use
-- `SET search_path = public, pg_temp`. The 3 re-defined existing RPCs
-- preserved their existing search_path posture from 00074:400.
--
-- Threat model HIGH severity per nwrp200 escalation. See B-2a-PLAN §6.j.
-- ============================================================

BEGIN;

-- =========================================================================
-- §0 — Pre-flight: verify baseline. Informational; does NOT fail.
-- =========================================================================
DO $$
DECLARE v_cpa_count INT; v_clients_count INT;
BEGIN
  SELECT COUNT(*) INTO v_cpa_count FROM public.client_portal_access;
  SELECT COUNT(*) INTO v_clients_count FROM public.clients;
  RAISE NOTICE 'B-2a pre-flight: client_portal_access=%, clients=%', v_cpa_count, v_clients_count;
END $$;

-- =========================================================================
-- §1a — UNIQUE(org_id, id) on clients (composite FK parent precondition).
-- The PK already covers id; this composite is the parent-side reference
-- target for the §1d composite FK from client_portal_access.
-- Precedents: 00016:104, 00019:17, 00038:41, 00083:30 (4 in codebase).
-- =========================================================================
ALTER TABLE public.clients
  ADD CONSTRAINT clients_org_id_id_unique UNIQUE (org_id, id);

-- =========================================================================
-- §1b — Add client_id column on client_portal_access. Nullable initially
-- (so existing rows can be backfilled in §1c before constraint validation
-- in §1d). The single-column FK declared inline (REFERENCES clients(id))
-- gives the auto-named client_portal_access_client_id_fkey constraint.
-- The composite FK in §1d gives the same-org invariant per D-01.
-- =========================================================================
ALTER TABLE public.client_portal_access
  ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- =========================================================================
-- §1c — Backfill client_id from jobs.client_id (deterministic; 00100
-- already shipped). At plan-author time client_portal_access had 0 rows;
-- the UPDATE is vacuous in practice but kept for forward-safety.
-- =========================================================================
UPDATE public.client_portal_access cpa
   SET client_id = j.client_id
  FROM public.jobs j
 WHERE cpa.job_id = j.id
   AND cpa.client_id IS NULL
   AND j.client_id IS NOT NULL;

-- =========================================================================
-- §1c2 — Forward probe: every cpa row whose job has a client_id must
-- now have client_id populated. RAISE EXCEPTION otherwise — aborts the
-- entire transaction.
-- =========================================================================
DO $$
DECLARE v_orphan BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_orphan
    FROM public.client_portal_access cpa
    JOIN public.jobs j ON j.id = cpa.job_id
   WHERE j.client_id IS NOT NULL AND cpa.client_id IS NULL;
  IF v_orphan > 0 THEN
    RAISE EXCEPTION 'B-2a §1c forward probe FAILED: % cpa rows orphaned. Aborting.', v_orphan;
  END IF;
END $$;

-- =========================================================================
-- §1d — Composite FK NOT VALID first (avoids long lock; fast), then
-- VALIDATE CONSTRAINT (succeeds because §1c backfill was clean per the
-- §1c2 forward probe). The named constraint
-- client_portal_access_org_id_client_id_fkey is the Rule 2 citation
-- target for PostgREST embedded-select hints in B-2b.
-- =========================================================================
ALTER TABLE public.client_portal_access
  ADD CONSTRAINT client_portal_access_org_id_client_id_fkey
  FOREIGN KEY (org_id, client_id) REFERENCES public.clients(org_id, id)
  ON DELETE SET NULL
  NOT VALID;

ALTER TABLE public.client_portal_access
  VALIDATE CONSTRAINT client_portal_access_org_id_client_id_fkey;

-- =========================================================================
-- §1e — revoked_seq column for re-invitation pattern (Plan-Author
-- Latitude #3 APPROVED Option A per iter-1 SYNTHESIS cross-reviewer
-- alignment security + multi-tenant).
--
-- Re-invitation semantics: on revoke the existing row's revoked_seq is
-- bumped to (max+1). The new invite INSERT uses revoked_seq=0 which is
-- a different uniqueness slot — collision avoided. Row identity
-- survives revocation; full audit trail preserved (vs. Option B
-- delete-on-revoke which breaks audit FK chain).
-- =========================================================================
ALTER TABLE public.client_portal_access
  ADD COLUMN revoked_seq INTEGER NOT NULL DEFAULT 0;

-- =========================================================================
-- §1f — Indexes per D-04 + Option A predicate.
--
-- UNIQUE: (org_id, client_id, job_id, revoked_seq) WHERE client_id IS NOT NULL
-- — predicate excludes pre-backfill NULL client_id rows (none in practice
-- per §1c2 probe). Does NOT include WHERE revoked_at IS NULL per D-04
-- timing-oracle prohibition (admin-UI lookup path). App-layer applies
-- revoked_at IS NULL AND expires_at > now() filters.
--
-- Lookup index for client → tokens reverse query (admin revocation UI).
-- =========================================================================
CREATE UNIQUE INDEX client_portal_access_org_client_job_seq_unique
  ON public.client_portal_access (org_id, client_id, job_id, revoked_seq)
  WHERE client_id IS NOT NULL;

CREATE INDEX idx_client_portal_access_client_id
  ON public.client_portal_access (client_id)
  WHERE client_id IS NOT NULL;

-- =========================================================================
-- §1k — DROP+recreate idx_client_portal_access_token_hash as NON-PARTIAL
-- per BLK-3 iter-1 SYNTHESIS cross-reviewer alignment (security-reviewer
-- + ai-logic-tester).
--
-- The existing partial form at 00074:188-190 (WHERE revoked_at IS NULL)
-- reintroduces a timing oracle on the token-resolution hot path because
-- resolveOwnerToken (src/lib/owner-portal/token.ts) queries by
-- access_token_hash only — without the revoked_at IS NULL predicate.
-- Postgres cannot use a partial index when the query omits the partial
-- predicate; falls back to seq-scan for revoked-token lookups.
--
-- Non-partial index serves the query regardless of revoked_at value,
-- so revoked + non-revoked + never-existed lookups all use the index
-- and incur the same latency. Timing oracle eliminated.
-- =========================================================================
DROP INDEX IF EXISTS public.idx_client_portal_access_token_hash;
CREATE UNIQUE INDEX idx_client_portal_access_token_hash
  ON public.client_portal_access (access_token_hash);

-- =========================================================================
-- §2 — Token expiration default: supersede 00074's 90-day with 1-year
-- per nwrp200 LOCKED + D-07. Only affects future INSERTs; existing rows
-- retain their original expires_at (none exist at apply time).
-- =========================================================================
ALTER TABLE public.client_portal_access
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '1 year');

-- =========================================================================
-- §3 — create_client_portal_invite RPC: CREATE OR REPLACE with NULL-leak
-- fix per D-05. Function signature preserved EXACTLY. Body changes:
--   - SELECT j.client_id INTO _client_id (with same-org guard)
--   - RAISE EXCEPTION if NULL
--   - INSERT includes client_id
--   - p_expires_at fallback now() + interval '1 year' (was 90 days)
--
-- SET search_path = public, pg_temp preserved from 00074:400 per
-- 00102 SECURITY DEFINER hardening pattern.
-- =========================================================================
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
  _client_id UUID;
BEGIN
  -- Existing auth check (00074:407-421) preserved unchanged
  IF NOT (
    p_org_id = app_private.user_org_id()
    AND app_private.user_role() IN ('owner','admin','pm')
    AND (
      app_private.user_role() IN ('owner','admin')
      OR EXISTS (
        SELECT 1 FROM public.jobs j WHERE j.id = p_job_id AND j.pm_id = auth.uid()
      )
    )
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- B-2a NEW: derive client_id from jobs.client_id (D-05 leak fix).
  -- Same-org guard is defense-in-depth; composite FK in §1d is the
  -- BY-CONSTRUCTION enforcement layer.
  SELECT j.client_id INTO _client_id
    FROM public.jobs j
   WHERE j.id = p_job_id AND j.org_id = p_org_id;
  IF _client_id IS NULL THEN
    RAISE EXCEPTION 'B-2a invariant FAILED: jobs.id=% in org=% has NULL client_id (or job not found). Re-invite blocked.', p_job_id, p_org_id;
  END IF;

  _plaintext := encode(extensions.gen_random_bytes(32), 'hex');
  _hash := encode(extensions.digest(_plaintext, 'sha256'), 'hex');

  INSERT INTO public.client_portal_access (
    org_id, job_id, client_id, email, name, access_token_hash,
    visibility_config, expires_at, created_by
  ) VALUES (
    p_org_id, p_job_id, _client_id, p_email, p_name, _hash,
    COALESCE(p_visibility_config, '{}'::jsonb),
    COALESCE(p_expires_at, now() + interval '1 year'),  -- D-07 (was 90 days)
    auth.uid()
  )
  RETURNING id INTO _new_id;

  RETURN QUERY SELECT _new_id, _plaintext;
END;
$function$;

-- §3a — REVOKE+GRANT for re-defined create_client_portal_invite per BLK-4.
-- Role list matches 00074:441-443 verbatim (authenticated only — admin function).
REVOKE EXECUTE ON FUNCTION public.create_client_portal_invite(UUID, UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_client_portal_invite(UUID, UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ) TO authenticated;

-- =========================================================================
-- §3b — submit_client_portal_message RPC: sliding-window UPDATE 90-day
-- → 1-year per Plan-Author Latitude #4 APPROVED IN-SCOPE.
--
-- Body preserved byte-for-byte from 00074:448-494 EXCEPT line 489
-- sliding-window UPDATE: now() + interval '1 year' (was '90 days').
-- =========================================================================
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
    RETURN;  -- silent no-op (defeats timing oracle per 00074 Amendment J)
  END IF;

  INSERT INTO public.client_portal_messages (
    org_id, job_id, from_type, from_client_email, message
  ) VALUES (
    _access.org_id, _access.job_id, 'client',
    _access.email, p_message
  )
  RETURNING id INTO _new_id;

  -- B-2a: sliding-window UPDATE 90-day → 1-year per D-07 + nwrp200 LOCKED.
  -- WAS: expires_at = now() + interval '90 days' (00074:489)
  UPDATE public.client_portal_access
    SET last_accessed_at = now(),
        expires_at = now() + interval '1 year'
    WHERE id = _access.id;

  RETURN QUERY SELECT _new_id;
END;
$function$;

-- §3b-grant — REVOKE+GRANT for re-defined submit_client_portal_message per BLK-4.
-- Role list matches 00074:496-497 verbatim (anon only — homeowner-callable).
REVOKE EXECUTE ON FUNCTION public.submit_client_portal_message(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_client_portal_message(TEXT, TEXT) TO anon;

-- =========================================================================
-- §3c — mark_client_portal_message_read RPC: sliding-window UPDATE
-- 90-day → 1-year per Plan-Author Latitude #4 APPROVED IN-SCOPE.
--
-- Body preserved byte-for-byte from 00074:501-543 EXCEPT line 540
-- sliding-window UPDATE: now() + interval '1 year' (was '90 days').
-- =========================================================================
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

  -- B-2a: sliding-window UPDATE 90-day → 1-year per D-07 + nwrp200 LOCKED.
  -- WAS: expires_at = now() + interval '90 days' (00074:540)
  UPDATE public.client_portal_access
    SET last_accessed_at = now(),
        expires_at = now() + interval '1 year'
    WHERE id = _access.id;
END;
$function$;

-- §3c-grant — REVOKE+GRANT for re-defined mark_client_portal_message_read per BLK-4.
-- Role list matches 00074:545-546 verbatim (anon only — homeowner-callable).
REVOKE EXECUTE ON FUNCTION public.mark_client_portal_message_read(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_client_portal_message_read(TEXT, UUID) TO anon;

-- =========================================================================
-- §4 — activity_log.actor_token_id column per D-23. Column add only;
-- B-2b's acknowledge endpoint is the first runtime writer. B-2a's admin
-- revoke API writes user_id (revoker is authenticated admin, NOT homeowner-
-- via-token per D-10).
--
-- ON DELETE SET NULL preserves the audit row if the token is hard-deleted.
-- FK constraint auto-named: activity_log_actor_token_id_fkey.
-- =========================================================================
ALTER TABLE public.activity_log
  ADD COLUMN actor_token_id UUID REFERENCES public.client_portal_access(id) ON DELETE SET NULL;

CREATE INDEX idx_activity_log_actor_token
  ON public.activity_log (actor_token_id)
  WHERE actor_token_id IS NOT NULL;

-- =========================================================================
-- §5 — Rate-limit counter table per D-15. Replaces non-functional
-- in-process Map per iter-1 SYNTHESIS B-6 + nwrp201/202 LOCKED.
--
-- Keyed by (key_type, key_value, window_start). Window granularity 60s.
-- TTL cleanup via cleanup_owner_portal_rate_limit() function called
-- opportunistically by application layer (no pg_cron precedent in
-- Nightwork).
-- =========================================================================
CREATE TABLE public.owner_portal_rate_limit (
  id BIGSERIAL PRIMARY KEY,
  key_type TEXT NOT NULL CHECK (key_type IN ('token', 'ip')),
  key_value TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  UNIQUE (key_type, key_value, window_start)
);

CREATE INDEX idx_owner_portal_rate_limit_window
  ON public.owner_portal_rate_limit (window_start);

-- =========================================================================
-- §5b — Rate-limit cleanup function (TTL; 5-minute retention).
-- SECURITY DEFINER with pinned search_path per 00102 hardening.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.cleanup_owner_portal_rate_limit()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.owner_portal_rate_limit
   WHERE window_start < now() - interval '5 minutes';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_owner_portal_rate_limit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_owner_portal_rate_limit() TO service_role;

-- =========================================================================
-- §5c — RLS posture on rate-limit table: service-role only access.
-- No policies → anon + authenticated blocked by RLS-on-no-policy default.
-- service_role bypasses RLS by Postgres convention.
-- =========================================================================
ALTER TABLE public.owner_portal_rate_limit ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.owner_portal_rate_limit TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.owner_portal_rate_limit_id_seq TO service_role;

-- =========================================================================
-- §5d — Atomic increment RPC per §6.f. ON CONFLICT DO UPDATE returning
-- count gives race-free counter increment. SECURITY DEFINER with pinned
-- search_path per 00102 hardening.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.record_owner_portal_request(
  p_key_type TEXT, p_key_value TEXT, p_window_start TIMESTAMPTZ
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _new_count INTEGER;
BEGIN
  INSERT INTO public.owner_portal_rate_limit (key_type, key_value, window_start, request_count)
    VALUES (p_key_type, p_key_value, p_window_start, 1)
    ON CONFLICT (key_type, key_value, window_start)
      DO UPDATE SET request_count = public.owner_portal_rate_limit.request_count + 1
    RETURNING request_count INTO _new_count;
  RETURN _new_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_owner_portal_request(TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_owner_portal_request(TEXT, TEXT, TIMESTAMPTZ) TO service_role;

-- =========================================================================
-- §6 — draws.job_id index per D-18 + iter-1 SYNTHESIS B-11.
-- change_orders.job_id already indexed at 00028:171 (idx_change_orders_job_id).
--
-- Existing partial composites on draws (idx_draws_job_number,
-- idx_draws_job_status) are partial-on-deleted_at and cannot serve
-- B-2a helper queries that don't filter deleted_at IS NULL. First
-- user-facing portal query path would seq-scan without this index.
-- IF NOT EXISTS for safe re-apply.
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_draws_job_id ON public.draws (job_id);

-- =========================================================================
-- §7 — Schema documentation (embedded comments)
-- =========================================================================
COMMENT ON COLUMN public.client_portal_access.client_id IS
  'F1 Wave-B Slice-2 B-2a — denormalized client identity FK. Backfilled from jobs.client_id on apply. ON DELETE SET NULL preserves token row if client hard-deleted via emergency DBA path; soft-delete (normal path) leaves client_id pointing at deleted_at-NOT-NULL clients row. Composite FK to clients(org_id, id) enforces same-org BY CONSTRUCTION per D-01.';

COMMENT ON COLUMN public.client_portal_access.revoked_seq IS
  'F1 Wave-B Slice-2 B-2a — revocation sequence for re-invitation pattern (Plan-Author Latitude #3 APPROVED Option A). On revoke: incremented to (max+1). Re-invitation creates row with revoked_seq=0; old row remains at >=1 for audit trail. Eliminates timing oracle (per D-04 + iter-1 SYNTHESIS B-7) by allowing full covering index without partial WHERE revoked_at IS NULL.';

COMMENT ON INDEX public.idx_client_portal_access_token_hash IS
  'F1 Wave-B Slice-2 B-2a — NON-PARTIAL per BLK-3 (iter-1 SYNTHESIS cross-reviewer alignment: security + ai-logic). Replaces 00074:188-190 partial WHERE revoked_at IS NULL that re-introduced timing oracle on token-resolution hot path. Non-partial index serves resolveOwnerToken queries (which filter by access_token_hash only) regardless of revoked_at value, eliminating the oracle entirely.';

COMMENT ON COLUMN public.activity_log.actor_token_id IS
  'F1 Wave-B Slice-2 B-2a — present when audit row originated from owner-portal token-context action (B-2b acknowledge). Mutually exclusive with user_id at application layer (logActivity helper enforces). NOT enforced via DB CHECK (legacy rows + future trigger rows may have both NULL). Column add in B-2a; WRITES land in B-2b.';

COMMENT ON FUNCTION public.create_client_portal_invite(UUID, UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ) IS
  'F1 Wave-B Slice-2 B-2a — re-defined to derive client_id from jobs.client_id (closes iter-1 SYNTHESIS B-4 NULL-leak). RAISE on NULL. Expiration default 1-year per nwrp200 (supersedes 00074 90-day). Signature preserved exactly; existing 1.5c admin callers unchanged.';

COMMENT ON TABLE public.owner_portal_rate_limit IS
  'F1 Wave-B Slice-2 B-2a — DB-backed rate-limit counter for /api/owner-portal/* endpoints. Per-token + per-IP keys. 60s windows. TTL cleanup (5 minutes) via cleanup_owner_portal_rate_limit(). Replaces non-functional in-process Map per iter-1 SYNTHESIS B-6 + nwrp201/202. RLS-on-no-policy → service-role-only access.';

-- =========================================================================
-- §8 — PostgREST schema cache reload
-- =========================================================================
NOTIFY pgrst, 'reload schema';

COMMIT;
