-- supabase/migrations/00106_b2b_activity_log_ack_dedupe.sql
-- F1-Wave-B Slice-2 B-2b per CONTEXT D-19 + iter-1 SYNTHESIS B-12 closure.
--
-- TOCTOU close on owner-portal pay-app acknowledgment: concurrent double-tap
-- from a homeowner (network retry, fast double-tap, racing tabs) must produce
-- exactly 1 audit_log row, not 2. Partial unique index scopes the constraint
-- to action='acknowledged' AND actor_token_id IS NOT NULL — does NOT block
-- legacy or future user-action entity_id collisions on other action types
-- (e.g., status_changed rows with same entity_id but different user_id are
-- still permitted; only homeowner-via-token acknowledged actions are deduped).
--
-- Idempotency: IF NOT EXISTS guards the forward apply; down drops unconditionally.

CREATE UNIQUE INDEX IF NOT EXISTS activity_log_ack_dedupe_unique
  ON public.activity_log (entity_id, actor_token_id, action)
  WHERE action = 'acknowledged' AND actor_token_id IS NOT NULL;

COMMENT ON INDEX public.activity_log_ack_dedupe_unique IS
  'F1 Wave-B Slice-2 B-2b D-19 — TOCTOU close on homeowner pay-app acknowledgment. Scopes uniqueness to acknowledged actions with non-null actor_token_id; concurrent double-tap from owner portal produces exactly 1 audit row via INSERT...ON CONFLICT DO NOTHING.';

-- Schema reload (mirroring 00104 pattern)
NOTIFY pgrst, 'reload schema';
