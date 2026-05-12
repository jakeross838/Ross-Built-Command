-- ===========================================================================
-- 00096_invoice_allocations_org_id.sql
-- ===========================================================================
--
-- Denormalize org_id onto invoice_allocations per Q10b codified rule
-- (CLAUDE.md Architecture Rules; .planning/expansions/stage-f1-knowledge-graph-
-- auth-EXPANDED-SCOPE.md §10 Q10b). F1-Wave-A Plan A-4.
--
-- BEFORE this migration:
--   invoice_allocations is org-scoped via RLS-by-join through invoices.org_id.
--   Policies defined in 00038 (initial) + 00043 (write policy) + 00049
--   (platform_admin bypass).
--
-- AFTER this migration:
--   invoice_allocations has org_id NOT NULL column with FK to organizations.
--   Composite index (org_id, invoice_id) added for tenant-bounded queries.
--   4 JOIN-based RLS policies replaced with direct-filter equivalents using
--   org_id = (SELECT app_private.user_org_id()) (session-cached). RESTRICTIVE
--   and PERMISSIVE structures preserved.
--
-- Role-based write policy from 00043 (admin owner accounting write
-- invoice_allocations) is UNCHANGED — its predicate is role-only and does
-- not join through invoices; tenant boundary remains enforced by the
-- RESTRICTIVE policy regardless of which role policy permits the write.
--
-- Source code INSERT call sites updated in same commit to pass org_id
-- explicitly so post-NOT-NULL writes succeed:
--   - src/lib/invoices/save.ts:536
--   - src/app/api/invoices/[id]/allocations/route.ts (3 INSERT sites)
--
-- F5 INDEX GAP (acknowledged; routes to Wave-B Plan B-7):
-- This migration adds idx_invoice_allocations_org_id_invoice_id covering
-- the tenant-bounded fetch pattern. F5 cost-intel aggregations will likely
-- benefit from (org_id, cost_code_id) and (org_id, change_order_id) indexes
-- for cost-code breakdowns and CO-vs-base splits. Defer to Wave-B Plan B-7.
--
-- TARGET: DEV Supabase (egxkffodxcefwpqmwrur) ONLY.
-- DO NOT APPLY TO PROD (vnpqjderiuhsiiygfwfb).
-- ===========================================================================

BEGIN;

-- =========================================================================
-- 0. Pre-flight orphan check (HF-A4-2 — fail-fast BEFORE any DDL)
-- =========================================================================
-- If any invoice_allocations row points to a missing invoice or to an
-- invoice with NULL org_id, the backfill will leave org_id NULL and the
-- subsequent SET NOT NULL would fail mid-migration. Better to fail at
-- the very top, before column add, so investigators see only one error.

DO $$
DECLARE orphan_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO orphan_count
    FROM public.invoice_allocations a
    LEFT JOIN public.invoices i ON i.id = a.invoice_id
   WHERE i.id IS NULL OR i.org_id IS NULL;
  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'Pre-flight: % invoice_allocations rows have orphan or NULL-org parent invoice. '
      'Investigate and clean before applying 00096.', orphan_count;
  END IF;
END $$;


-- =========================================================================
-- 1. Add org_id column (nullable initially for backfill)
-- =========================================================================

ALTER TABLE public.invoice_allocations
  ADD COLUMN IF NOT EXISTS org_id UUID;


-- =========================================================================
-- 2. Backfill from invoices.org_id
-- =========================================================================
-- Single-pass join form (planner clarity). Filters a.org_id IS NULL so a
-- re-run on an already-backfilled table is a no-op.

UPDATE public.invoice_allocations a
   SET org_id = i.org_id
  FROM public.invoices i
 WHERE a.invoice_id = i.id
   AND a.org_id IS NULL;


-- =========================================================================
-- 3. Verify backfill complete (defense-in-depth; pre-flight should
--    have caught everything but this catches concurrent inserts during
--    the backfill window in case the ACCESS EXCLUSIVE LOCK doesn't
--    serialize all paths — extremely unlikely on DEV with no traffic)
-- =========================================================================
-- Note (CR-A4-1, 5-of-6 reviewer consensus): no `deleted_at IS NULL`
-- filter — the upcoming SET NOT NULL applies to ALL rows including
-- soft-deleted, so filtering soft-deleted from this check would mask
-- a silent NULL → NOT NULL constraint violation.

DO $$
DECLARE missing_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO missing_count
    FROM public.invoice_allocations
   WHERE org_id IS NULL;
  IF missing_count > 0 THEN
    RAISE EXCEPTION 'invoice_allocations backfill incomplete: % rows have NULL org_id. '
      'Investigate orphaned rows (invoice_id pointing to missing/hard-deleted invoice). '
      'Migration aborted.', missing_count;
  END IF;
END $$;


-- =========================================================================
-- 4. Enforce NOT NULL + add FK
-- =========================================================================

ALTER TABLE public.invoice_allocations
  ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE public.invoice_allocations
  ADD CONSTRAINT invoice_allocations_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- =========================================================================
-- 5. Composite index for tenant-bounded queries
-- =========================================================================
-- (org_id, invoice_id) supports both WHERE org_id = ? (e.g., tenant-bounded
-- aggregations in F5 Price Intel) and WHERE org_id = ? AND invoice_id = ?
-- (the typical UI fetch path) via left-prefix coverage.
-- Existing idx_invoice_allocations_invoice_id (from 00038:88-89) is preserved.

CREATE INDEX IF NOT EXISTS idx_invoice_allocations_org_id_invoice_id
  ON public.invoice_allocations (org_id, invoice_id);


-- =========================================================================
-- 6. Drop 4 JOIN-based RLS policies
-- =========================================================================
-- These exist (in order of original creation):
--   - 00038:193-209 "org isolation" RESTRICTIVE FOR ALL (JOIN through invoices)
--   - 00038:211-220 "authenticated read invoice_allocations" PERMISSIVE SELECT (JOIN)
--   - 00049:345-360 (REPLACES the 00038 "org isolation" with platform_admin OR-clause; still JOIN)
--   - 00049:361-369 "invoice_allocations_delete_strict" RESTRICTIVE FOR DELETE (JOIN)
--   - 00049:370-371 "invoice_allocations_platform_admin_read" PERMISSIVE FOR SELECT
--
-- Drop all 4. Recreate as direct-filter equivalents in Step 7.

DROP POLICY IF EXISTS "org isolation" ON public.invoice_allocations;
DROP POLICY IF EXISTS "authenticated read invoice_allocations" ON public.invoice_allocations;
DROP POLICY IF EXISTS "invoice_allocations_delete_strict" ON public.invoice_allocations;
DROP POLICY IF EXISTS "invoice_allocations_platform_admin_read" ON public.invoice_allocations;


-- =========================================================================
-- 7. Create 4 direct-filter equivalents
-- =========================================================================
-- Pattern mirrors 00049's canonical RESTRICTIVE-org-isolation + delete-strict
-- + PERMISSIVE-platform-admin-read trio used on jobs / invoices / vendors /
-- etc. (see e.g. 00049:223-233 for jobs).
--
-- HF-A4-1: helper functions wrapped in (SELECT ...) for session caching.
-- Per CLAUDE.md anti-pattern guidance; per-row calls of app_private.* would
-- penalize the F5 cost-intel allocations-by-org hot path.
--
-- The 00038-era PERMISSIVE "authenticated read" is also restored here as a
-- direct-filter equivalent (per 00046 canonical defense-in-depth pattern).
--
-- The role-based write policy from 00043:118-120 ("admin owner accounting
-- write invoice_allocations") is INTENTIONALLY UNTOUCHED — its predicate
-- is role-only and does not join. Tenant boundary is enforced by the
-- RESTRICTIVE policy below regardless of which role policy permits writes.

CREATE POLICY "org isolation" ON public.invoice_allocations
  AS RESTRICTIVE FOR ALL
  USING (org_id = (SELECT app_private.user_org_id()) OR (SELECT app_private.is_platform_admin()))
  WITH CHECK (org_id = (SELECT app_private.user_org_id()));

CREATE POLICY "invoice_allocations_delete_strict" ON public.invoice_allocations
  AS RESTRICTIVE FOR DELETE
  USING (org_id = (SELECT app_private.user_org_id()));

CREATE POLICY "authenticated read invoice_allocations" ON public.invoice_allocations
  FOR SELECT TO authenticated
  USING (org_id = (SELECT app_private.user_org_id()));

CREATE POLICY "invoice_allocations_platform_admin_read" ON public.invoice_allocations
  FOR SELECT USING ((SELECT app_private.is_platform_admin()));


COMMIT;


-- ===========================================================================
-- VERIFICATION QUERIES (run after applying)
-- ===========================================================================
--
-- 1. org_id column is NOT NULL:
--    SELECT column_name, is_nullable, data_type
--      FROM information_schema.columns
--     WHERE table_name = 'invoice_allocations' AND column_name = 'org_id';
--    Expected: is_nullable = NO, data_type = uuid
--
-- 2. FK exists:
--    SELECT constraint_name FROM information_schema.table_constraints
--     WHERE table_name = 'invoice_allocations'
--       AND constraint_name = 'invoice_allocations_org_id_fkey';
--    Expected: 1 row
--
-- 3. Composite index exists:
--    SELECT indexname FROM pg_indexes
--     WHERE tablename = 'invoice_allocations'
--       AND indexname = 'idx_invoice_allocations_org_id_invoice_id';
--    Expected: 1 row
--
-- 4. 5 policies present in pg_policies (4 rewritten + 1 untouched):
--    SELECT policyname, permissive, cmd FROM pg_policies
--     WHERE tablename = 'invoice_allocations'
--     ORDER BY policyname;
--    Expected (5 rows):
--      - "admin owner accounting write invoice_allocations" (PERMISSIVE ALL) — unchanged from 00043
--      - "authenticated read invoice_allocations" (PERMISSIVE SELECT)
--      - "invoice_allocations_delete_strict" (RESTRICTIVE DELETE)
--      - "invoice_allocations_platform_admin_read" (PERMISSIVE SELECT)
--      - "org isolation" (RESTRICTIVE ALL)
--    Net zero policy count; posture change is JOIN → direct-filter.
--
-- 5. No policy still joins through invoices (proves the rewrite is complete):
--    SELECT policyname, qual, with_check FROM pg_policies
--     WHERE tablename = 'invoice_allocations'
--       AND (qual LIKE '%invoices%' OR with_check LIKE '%invoices%');
--    Expected: 0 rows
--
-- 6. No NULL org_id rows:
--    SELECT COUNT(*) FROM public.invoice_allocations WHERE org_id IS NULL;
--    Expected: 0
--
-- 7. Backfill correctness — every row's org_id matches parent invoice's org_id:
--    SELECT COUNT(*) FROM public.invoice_allocations a
--      JOIN public.invoices i ON i.id = a.invoice_id
--     WHERE a.org_id != i.org_id;
--    Expected: 0
--
-- 8. Composite index usable on representative query:
--    EXPLAIN ANALYZE SELECT id, cost_code_id, amount_cents
--      FROM invoice_allocations
--     WHERE org_id = (SELECT org_id FROM invoices LIMIT 1)
--       AND invoice_id = (SELECT id FROM invoices LIMIT 1);
--    Expected: plan uses idx_invoice_allocations_org_id_invoice_id
--
-- ===========================================================================
-- OUT OF SCOPE
-- ===========================================================================
-- - No changes to existing columns (id / invoice_id / cost_code_id /
--   change_order_id / amount_cents / description / created_at / updated_at /
--   deleted_at).
-- - No new triggers.
-- - No data migration beyond backfill (NULL → invoices.org_id).
-- - support_messages migration (00051) gets comment-only update in same commit
--   — see commit diff.
-- - Layer 2 harness fixture-coverage assertion implementation deferred to
--   Wave-B Plan B-6 / B-7.
-- - PROD database (vnpqjderiuhsiiygfwfb): NOT touched.
-- ===========================================================================
