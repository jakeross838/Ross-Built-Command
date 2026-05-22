-- supabase/migrations/00106_b2b_activity_log_ack_dedupe.down.sql
-- F1-Wave-B Slice-2 B-2b down migration — restore pre-B-2b state.
--
-- Drops the partial unique index added by 00106. Pre-existing activity_log
-- rows are unaffected (index drop is non-destructive). Dropping the index
-- allows duplicate ('acknowledged', actor_token_id, entity_id) tuples to
-- accumulate again on concurrent double-tap — application logic should
-- not rely on the index after rollback (B-2b acknowledge endpoint also
-- reverts in lockstep per the §11 Rollback section in B-2b-PLAN.md).

DROP INDEX IF EXISTS public.activity_log_ack_dedupe_unique;

NOTIFY pgrst, 'reload schema';
