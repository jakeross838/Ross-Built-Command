-- ============================================================================
-- D-080 FORWARD-COMPAT CLAUSE (per architect iter-1 WARNING-3 + nwrp155):
-- ============================================================================
-- This migration codifies the FK convention by RETROFITTING 11 existing
-- NO_FK user-identity columns. Forward-compat: new user-identity FK columns
-- on NEW tables created after migration 00099 default to:
--   REFERENCES auth.users(id) ON DELETE NO ACTION
-- UNLESS the column is referenced in PostgREST display embedding hints, in
-- which case:
--   REFERENCES profiles(id) ON DELETE NO ACTION
--
-- B-1a (migration 00100) is the first new-table application:
--   - clients.created_by -> auth.users(id) (no display embed needed)
--
-- Plan-authors writing new tables in F2-F5 inherit this convention from
-- D-080 + this header. Departing requires explicit D-### entry.
-- ============================================================================
--
-- Migration 00099: User-identity FK convention codification (D-080).
--
-- Source decision: D-080 (MASTER-PLAN.md §10:256, codified 2026-05-15)
-- Parent convention: D-078 (auth.users default; profiles for PostgREST
--                            display embeds)
-- Decision brief: .planning/decisions-resolved/2026-05-15-user-identity-fk-convention-BRIEF.md
-- Expansion: stage-f1-knowledge-graph-auth-wave-b-EXPANDED-SCOPE.md
-- Wave-C origin: migration 00097 (split-convention introduction)
-- Wave-D extension: migration 00098 (org_members.user_id dual-FK precedent)
--
-- Rationale: PostgREST resolves embed hints (e.g. `pm:profiles(id, full_name)`)
-- by inspecting pg_constraint for a FK from the source table to the target
-- table. Prior to this migration, 11 user-identity columns (10 audit + 1
-- functional) carried no FK at all — UUID values were permitted regardless
-- of whether they resolved in auth.users / profiles. This migration anchors
-- the 11 columns to their D-080-matrix targets:
--
--   * 10 columns -> auth.users(id) ON DELETE NO ACTION (audit-trail durability)
--   * 1  column  -> profiles(id)  ON DELETE NO ACTION (display embed enabler)
--
-- SOC2 mapping (inherited from D-078 per MASTER-PLAN.md §10:256):
--   * CC6.1 (Logical / physical access controls) — FK constraints to auth.users
--     enforce that user-identity claimed in any audit/ownership column refers
--     to a real user. Prevents data-integrity drift from arbitrary-UUID inserts.
--   * CC7.2 (System monitoring — audit-trail durability) — ON DELETE NO ACTION
--     on all 11 FKs blocks silent audit-trail loss via accidental hard-delete.
--     Aligns with CLAUDE.md "Never delete records — soft-delete only" posture.
--   * PI1.1 (Processing integrity — completeness/validity) — jobs.pm_id ->
--     profiles(id) FK enables PostgREST display-embed resolution consistent
--     with the rest of the embedding convention.
--
-- draws.approved_by carve-out (per D-080 §4): auth.users-only for now.
-- F6 Pay App engine MAY add a parallel profiles FK if G702 signature block
-- needs PostgREST display embed for the approver's full_name (dual-FK
-- retroactive pattern per Wave-D 00098 precedent on org_members.user_id).
-- Not in scope for B-D080.
--
-- jobs.pm_id PostgREST embed refactor opportunity: documented for
-- Wave 1.1-Lite polish per nwrp153 Q6 decision (DEFER consumer refactor).
-- Current code at src/app/jobs/[id]/page.tsx uses a secondary query for
-- PM full_name; post-migration, the embed pattern `pm:profiles(id, full_name)`
-- becomes resolvable via the new jobs_pm_id_profiles_fkey constraint.
-- Refactor is OUT of scope for this migration; only the FK is added.
--
-- Pre-flight orphan probe (plan-author time, 2026-05-15; via Node +
-- service-role + PostgREST against production project egxkffodxcefwpqmwrur):
--   Result: 0 orphans across all 11 columns.
--   Distinct FK UUIDs total: 20 (cross-column overlap; 14 distinct PMs).
--
-- Pre-flight executor-time re-probe (Task 1): 0 orphans across all 11
-- columns (matched plan-author result). Probe also lives inside the DO $$
-- block below as a fail-loud belt + suspenders.
--
-- Constraint-naming convention (per Wave-C 00097 + Wave-D 00098 precedent):
--   * auth.users target -> `<source_table>_<source_column>_fkey`
--   * profiles target   -> `<source_table>_<source_column>_profiles_fkey`
--     (suffix disambiguates from any future hypothetical
--      `jobs_pm_id_fkey` against auth.users; mirrors
--      org_members_user_id_profiles_fkey from 00098)
--
-- Lock posture: ADD CONSTRAINT FOREIGN KEY takes SHARE ROW EXCLUSIVE on each
-- source table + validates every existing row. At Ross Built scale (largest
-- source = invoices at ~11 rows post-Wave-E) this is sub-millisecond.
-- Reconsider NOT VALID + VALIDATE CONSTRAINT pattern when any source table
-- exceeds ~10k rows. Mirrors 00098 lock-posture guidance.
--
-- Index posture: no new indexes. Source-side: existing indexes / low-cardinality
-- columns at current scale. Referenced-side: PK on auth.users.id + profiles.id
-- provides FK lookup coverage. Mirrors 00098 (no new indexes).
--
-- No IF NOT EXISTS / IF EXISTS guards on ADD CONSTRAINT — Wave-C/Wave-D
-- fail-loud convention per 00097 iter-2 MED-C1-5 (name mismatch / partial
-- prior-run state fails loudly rather than silently). ITER-2-PATCHES.md §1.1
-- removed any wrapper IF NOT EXISTS guard explicitly (database-reviewer CRT-1).
--
-- Reversibility: 00099_user_identity_fk_convention.down.sql drops the 11
-- constraints (single DROP CONSTRAINT IF EXISTS each — idempotent).
--
-- Cascading effects (none): ADD CONSTRAINT does NOT modify any existing row;
-- only pg_constraint system catalog gains 11 entries. Supabase auto-reloads
-- PostgREST schema cache via DDL trigger; explicit NOTIFY pgrst at tail
-- (belt + suspenders).

BEGIN;

-- 0. FAIL-LOUD ORPHAN-FK ASSERTION (mirrors 00097 Step 0 + 00098 Step 0).
--    Aborts cleanly if any of the 11 columns has FK values not resolving
--    in target table. Plan-author-time + execute-time probes both returned
--    0 orphans (2026-05-15); this DO block confirms at apply time.
--    Per ITER-2-PATCHES.md §1.5: error message surfaces ONLY column name +
--    integer count; UUID values must NOT be logged (nwrp139 discipline).
DO $$
DECLARE
  v_orphan_change_orders_created_by INT;
  v_orphan_draws_approved_by INT;
  v_orphan_draws_created_by INT;
  v_orphan_invoices_created_by INT;
  v_orphan_invoices_duplicate_dismissed_by INT;
  v_orphan_jobs_created_by INT;
  v_orphan_jobs_pm_id INT;
  v_orphan_lien_releases_created_by INT;
  v_orphan_parser_corrections_corrected_by INT;
  v_orphan_purchase_orders_created_by INT;
  v_orphan_vendors_created_by INT;
  v_total INT;
BEGIN
  SELECT COUNT(*) INTO v_orphan_change_orders_created_by
    FROM public.change_orders t
    WHERE t.created_by IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.created_by);

  SELECT COUNT(*) INTO v_orphan_draws_approved_by
    FROM public.draws t
    WHERE t.approved_by IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.approved_by);

  SELECT COUNT(*) INTO v_orphan_draws_created_by
    FROM public.draws t
    WHERE t.created_by IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.created_by);

  SELECT COUNT(*) INTO v_orphan_invoices_created_by
    FROM public.invoices t
    WHERE t.created_by IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.created_by);

  SELECT COUNT(*) INTO v_orphan_invoices_duplicate_dismissed_by
    FROM public.invoices t
    WHERE t.duplicate_dismissed_by IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.duplicate_dismissed_by);

  SELECT COUNT(*) INTO v_orphan_jobs_created_by
    FROM public.jobs t
    WHERE t.created_by IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.created_by);

  SELECT COUNT(*) INTO v_orphan_jobs_pm_id
    FROM public.jobs t
    WHERE t.pm_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = t.pm_id);

  SELECT COUNT(*) INTO v_orphan_lien_releases_created_by
    FROM public.lien_releases t
    WHERE t.created_by IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.created_by);

  SELECT COUNT(*) INTO v_orphan_parser_corrections_corrected_by
    FROM public.parser_corrections t
    WHERE t.corrected_by IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.corrected_by);

  SELECT COUNT(*) INTO v_orphan_purchase_orders_created_by
    FROM public.purchase_orders t
    WHERE t.created_by IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.created_by);

  SELECT COUNT(*) INTO v_orphan_vendors_created_by
    FROM public.vendors t
    WHERE t.created_by IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.created_by);

  v_total := v_orphan_change_orders_created_by
    + v_orphan_draws_approved_by
    + v_orphan_draws_created_by
    + v_orphan_invoices_created_by
    + v_orphan_invoices_duplicate_dismissed_by
    + v_orphan_jobs_created_by
    + v_orphan_jobs_pm_id
    + v_orphan_lien_releases_created_by
    + v_orphan_parser_corrections_corrected_by
    + v_orphan_purchase_orders_created_by
    + v_orphan_vendors_created_by;

  IF v_total > 0 THEN
    RAISE EXCEPTION 'Pre-flight orphan FK detection: change_orders.created_by=%, draws.approved_by=%, draws.created_by=%, invoices.created_by=%, invoices.duplicate_dismissed_by=%, jobs.created_by=%, jobs.pm_id=%, lien_releases.created_by=%, parser_corrections.corrected_by=%, purchase_orders.created_by=%, vendors.created_by=%. Aborting before FK add.',
      v_orphan_change_orders_created_by,
      v_orphan_draws_approved_by,
      v_orphan_draws_created_by,
      v_orphan_invoices_created_by,
      v_orphan_invoices_duplicate_dismissed_by,
      v_orphan_jobs_created_by,
      v_orphan_jobs_pm_id,
      v_orphan_lien_releases_created_by,
      v_orphan_parser_corrections_corrected_by,
      v_orphan_purchase_orders_created_by,
      v_orphan_vendors_created_by;
  END IF;
END $$;

-- 1. change_orders.created_by -- audit trail (creator).
ALTER TABLE public.change_orders
  ADD CONSTRAINT change_orders_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE NO ACTION;

-- 2. draws.approved_by -- workflow audit (draw approval signer).
--    Carved out from dual-FK speculation per D-080 §4: auth.users-only for now.
--    F6 Pay App engine MAY add a parallel profiles FK if G702 signature block
--    needs PostgREST display embed for the approver's full_name.
ALTER TABLE public.draws
  ADD CONSTRAINT draws_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE NO ACTION;

-- 3. draws.created_by -- audit trail (creator).
ALTER TABLE public.draws
  ADD CONSTRAINT draws_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE NO ACTION;

-- 4. invoices.created_by -- audit trail (creator).
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE NO ACTION;

-- 5. invoices.duplicate_dismissed_by -- workflow audit (PM dismissed a duplicate-flag).
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_duplicate_dismissed_by_fkey
  FOREIGN KEY (duplicate_dismissed_by) REFERENCES auth.users(id) ON DELETE NO ACTION;

-- 6. jobs.created_by -- audit trail (creator).
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE NO ACTION;

-- 7. lien_releases.created_by -- audit trail (creator).
ALTER TABLE public.lien_releases
  ADD CONSTRAINT lien_releases_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE NO ACTION;

-- 8. parser_corrections.corrected_by -- AI learning audit.
--    NOT NULL column; orphans (if any) would have required backfill from
--    auth.users or audit-aware row delete. Pre-flight (plan-author 2026-05-15
--    AND execute-time) both returned 0 orphans across 5 rows / 2 distinct UUIDs.
ALTER TABLE public.parser_corrections
  ADD CONSTRAINT parser_corrections_corrected_by_fkey
  FOREIGN KEY (corrected_by) REFERENCES auth.users(id) ON DELETE NO ACTION;

-- 9. purchase_orders.created_by -- audit trail (creator).
ALTER TABLE public.purchase_orders
  ADD CONSTRAINT purchase_orders_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE NO ACTION;

-- 10. vendors.created_by -- audit trail (creator).
ALTER TABLE public.vendors
  ADD CONSTRAINT vendors_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE NO ACTION;

-- 11. jobs.pm_id -- functional FK (PM assignment); display-embedded.
--     Mirrors invoices.assigned_pm_id Wave-C 00097 pattern. profiles target
--     enables PostgREST embed `pm:profiles(id, full_name)` resolution
--     without secondary query. Current code at src/app/jobs/[id]/page.tsx
--     uses a secondary query -- REFACTOR OPPORTUNITY documented for
--     Wave 1.1-Lite polish (per nwrp153 Q6 decision: DEFER consumer
--     refactor; out of slice scope). Constraint name uses _profiles_fkey
--     suffix per Wave-D 00098 precedent (org_members_user_id_profiles_fkey)
--     -- disambiguates from any future hypothetical jobs_pm_id_fkey against
--     auth.users.
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_pm_id_profiles_fkey
  FOREIGN KEY (pm_id) REFERENCES public.profiles(id) ON DELETE NO ACTION;

-- 12. Belt-and-suspenders: explicitly notify PostgREST schema cache to reload.
--     Particularly important for jobs_pm_id_profiles_fkey (FK enabling future
--     embed-resolution). Wave-C taught us schema verification != runtime
--     verification; eliminate the race-window. Mirrors 00098 NOTIFY posture.
NOTIFY pgrst, 'reload schema';

COMMIT;

-- Post-apply executor verification:
--   SELECT conname,
--          conrelid::regclass::text AS source,
--          confrelid::regclass::text AS target,
--          confdeltype  -- expect 'a' (NO ACTION) for all 11
--   FROM pg_constraint
--   WHERE conname IN (
--     'change_orders_created_by_fkey',
--     'draws_approved_by_fkey',
--     'draws_created_by_fkey',
--     'invoices_created_by_fkey',
--     'invoices_duplicate_dismissed_by_fkey',
--     'jobs_created_by_fkey',
--     'jobs_pm_id_profiles_fkey',
--     'lien_releases_created_by_fkey',
--     'parser_corrections_corrected_by_fkey',
--     'purchase_orders_created_by_fkey',
--     'vendors_created_by_fkey'
--   )
--   ORDER BY conname;
--   -- Expect: 11 rows; 10 target='auth.users'; 1 target='public.profiles'
--   --         (jobs_pm_id_profiles_fkey); all confdeltype='a'.
--
--   -- Optional: confirm PostgREST embed resolution for jobs.pm_id -> profiles
--   -- (NOT required for slice; embed adoption deferred to Wave 1.1-Lite):
--   --   curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/jobs?\
--   --     select=id,name,pm:profiles(id,full_name)&limit=1" \
--   --     -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
--   --     -H "Authorization: Bearer $TEST_USER_JWT"
--   -- expect: HTTP 200; pm key resolves to {id, full_name} object (NOT PGRST200)
