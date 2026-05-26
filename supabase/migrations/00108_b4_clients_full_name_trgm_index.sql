-- Migration 00108 — F1-Wave-B Slice-2 B-4 Task 6 (TD-B1abis-02)
--
-- GIN trigram index on clients.full_name for autocomplete-driven /api/clients
-- search performance.
--
-- The /api/clients?search=<query> endpoint (introduced by F1-Wave-B Slice-1
-- B-1a-bis at src/app/api/clients/route.ts:53-60) uses ILIKE '%query%' against
-- clients.full_name with a leading wildcard. The existing btree partial index
-- `idx_clients_full_name_lower` (migration 00100) does NOT serve leading-
-- wildcard ILIKE — Postgres seqscans the entire org's clients table per
-- keystroke. At scale (500+ clients/org realistic within 2-3 years of
-- Drummond-class builds), the per-keystroke tenant-shard seqscan becomes a
-- UX bottleneck on the find-or-create combobox.
--
-- TD-B1abis-02 carry-forward per nwrp166 §11 + nwrp222 §7 GATE B-4 SIGNED.
--
-- Extension dependency:
-- - pg_trgm extension MUST be active. Precedent: migrations 00052 + 00073
--   already use gin_trgm_ops on other tables; extension is registered.
--   We do NOT re-create the extension here (idempotent per `CREATE EXTENSION
--   IF NOT EXISTS` pattern would still incur a no-op admin write, but is not
--   needed because the precedent migrations bootstrap it).
--
-- WHERE clause (deleted_at IS NULL):
-- - Partial index only on live clients rows. Soft-deleted clients are
--   never targets for autocomplete (the route filters .is("deleted_at",
--   null) already). Reduces index size + write cost for soft-delete
--   triggers from B-3.
--
-- gin_trgm_ops:
-- - GIN operator class for trigram matching. Handles arbitrary ILIKE
--   patterns including leading wildcards via trigram decomposition.
-- - Match cost is O(distinct_trigrams_in_query) not O(table_size).
--
-- Falsifiability:
-- - M-01: SELECT indexname FROM pg_indexes WHERE indexname = 'idx_clients_full_name_trgm' -> 1 row
-- - M-02: SELECT pg_get_indexdef(c.oid) FROM pg_class c WHERE c.relname = 'idx_clients_full_name_trgm' -> contains 'gin_trgm_ops'
-- - M-03: EXPLAIN ANALYZE on representative `/api/clients?search=<query>` query
--   shows Bitmap Index Scan / Bitmap Heap Scan referencing the trgm index
--   (NOTE: small fixture row counts may cause the planner to prefer seqscan
--   below the gin_trgm_ops cost threshold per database-reviewer iter-1
--   guidance; this is planner-flexibility OK at GATE-B-4).

CREATE INDEX IF NOT EXISTS idx_clients_full_name_trgm
  ON public.clients USING gin (full_name gin_trgm_ops)
  WHERE deleted_at IS NULL;

-- ─── Inline verification (M-01..M-03) ───────────────────────────
-- These DO blocks RAISE NOTICE on success; they do not throw because the
-- mcp__supabase__apply_migration path captures NOTICE output for verification
-- evidence in B-4-SUMMARY.md.

DO $$
DECLARE
  idx_count int;
  idx_def text;
BEGIN
  -- M-01: index exists
  SELECT COUNT(*) INTO idx_count FROM pg_indexes
   WHERE schemaname = 'public' AND indexname = 'idx_clients_full_name_trgm';
  IF idx_count <> 1 THEN
    RAISE EXCEPTION 'M-01 FAIL: expected 1 idx_clients_full_name_trgm row in pg_indexes, got %', idx_count;
  END IF;
  RAISE NOTICE 'M-01 PASS: idx_clients_full_name_trgm exists in pg_indexes';

  -- M-02: index definition uses gin_trgm_ops + WHERE deleted_at IS NULL
  SELECT pg_get_indexdef(c.oid) INTO idx_def
    FROM pg_class c
   WHERE c.relname = 'idx_clients_full_name_trgm';
  IF idx_def IS NULL OR idx_def NOT LIKE '%gin_trgm_ops%' THEN
    RAISE EXCEPTION 'M-02 FAIL: idx_clients_full_name_trgm does not use gin_trgm_ops — definition: %', idx_def;
  END IF;
  IF idx_def NOT LIKE '%deleted_at IS NULL%' THEN
    RAISE EXCEPTION 'M-02 FAIL: idx_clients_full_name_trgm missing WHERE deleted_at IS NULL — definition: %', idx_def;
  END IF;
  RAISE NOTICE 'M-02 PASS: definition contains gin_trgm_ops + WHERE deleted_at IS NULL';
  RAISE NOTICE 'M-02 INFO: definition = %', idx_def;
END $$;

-- M-03 EXPLAIN ANALYZE is captured at apply-migration time via
-- mcp__supabase__execute_sql; embedded here as a comment for review.
--
-- Representative query (mirrors src/app/api/clients/route.ts:53-60):
--   EXPLAIN ANALYZE SELECT id, full_name FROM public.clients
--    WHERE org_id = '00000000-0000-0000-0000-000000000001'
--      AND full_name ILIKE '%test%'
--      AND deleted_at IS NULL
--    ORDER BY full_name ASC LIMIT 20;
--
-- Expected plan element (post-index, with sufficient row count):
--   Bitmap Heap Scan on clients
--     Recheck Cond: ((full_name ILIKE '%test%'::text) AND ...)
--     -> Bitmap Index Scan on idx_clients_full_name_trgm
--        Index Cond: (full_name ~~* '%test%'::text)
--
-- Planner-flexibility: on small fixture row counts the cost threshold may
-- favor seqscan; this is expected. M-01 + M-02 are the primary AC-B4-06
-- gates; M-03 is informational at small scale.
