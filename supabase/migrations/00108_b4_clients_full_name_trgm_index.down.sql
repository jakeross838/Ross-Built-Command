-- Migration 00108 — DOWN
--
-- Symmetric rollback for the GIN trigram index on clients.full_name.
-- Idempotent via IF EXISTS so re-running on environments that never
-- received 00108 is a no-op.

DROP INDEX IF EXISTS public.idx_clients_full_name_trgm;
