-- Migration 00098: Add FK from org_members.user_id to profiles.id.
--
-- Source decision: nwrp121 Addition 1 (D-078 — user-identity FK convention)
-- + Wave-D EXPANDED-SCOPE Plan D-1 + Rule 2 (plan-review iter-1 cites FK).
--
-- Rationale: PostgREST resolves embed hints (e.g.
-- `select=profile:profiles(id, full_name)`) by inspecting pg_constraint for
-- a FK from the source table (org_members) to the target table (profiles).
-- Prior to this migration, no such FK existed: `org_members.user_id` FK'd
-- to `auth.users(id)` (00016:96), and `profiles.id` FK'd to `auth.users(id)`
-- (00007:16), but PostgREST does NOT follow transitive FK chains. The
-- malformed hint `profiles:user_id (...)` returned PGRST200 on every call
-- (confirmed via direct REST API call against current main, 2026-05-13).
--
-- Wave-D EXPANDED-SCOPE Plan D-1 introduces this FK and refactors the 9
-- src consumer sites to use the correct hint syntax `profile:profiles (...)`.
--
-- Data-safety proof (1:1 invariant):
--   * profiles.id === auth.users.id by design (00007:5 doc comment).
--   * org_members.user_id === auth.users.id by FK (00016:96 ON DELETE CASCADE).
--   * Therefore org_members.user_id === profiles.id for every existing row.
--   * 00016:115-119 seed populated org_members FROM profiles directly,
--     establishing the invariant at seed time.
--   * Going-forward: Supabase Auth signup creates auth.users -> trigger
--     creates profiles -> app code creates org_members. The chain preserves
--     the invariant by construction.
--   * Pre-flight DO block (Step 0 below) RAISES EXCEPTION if any orphan
--     org_members.user_id is detected (i.e. value not in profiles.id). In
--     practice this should never fire; it's a fail-loud belt + suspenders.
--
-- Cascading effects (none):
--   * ADD CONSTRAINT does NOT modify any existing org_members row.
--   * Only pg_constraint system catalog gains an entry.
--   * Supabase auto-reloads PostgREST schema cache via DDL-trigger NOTIFY.
--     This migration also issues an explicit NOTIFY pgrst at the tail per
--     ITER-2-PATCHES.md §1.1 decision 8 — belt-and-suspenders eliminating
--     the race-window between schema-apply and cache-pickup. Wave-C taught
--     us that schema verification != runtime verification.
--
-- FK convention divergence rationale (D-078):
--   * org_members.user_id now has DUAL FKs:
--     - existing FK to auth.users(id) ON DELETE CASCADE (00016:96)
--     - NEW FK to profiles(id) NO ACTION (this migration)
--   * D-078: NEW user-identity FKs default to auth.users UNLESS the column
--     is used in PostgREST embedding hints for display, in which case
--     profiles. org_members.user_id is the display-embedding case (used
--     in 9 src consumer hints post-Wave-D); profiles FK is correct.
--   * The dual-FK pattern is the same as invoices.assigned_pm_id post-
--     Wave-C (00097 retargeted to profiles; auth.users no longer in chain).
--     This plan ADDS a second FK rather than retargeting because
--     org_members.user_id's ON DELETE CASCADE semantic from auth.users is
--     load-bearing: deleting an auth user must cascade-delete their
--     org_members rows. Retargeting to profiles would lose that semantic.
--   * Post-Wave-D F1 state: 56 auth.users-FK columns + 3 profiles-FK
--     columns. Full standardization deferred (TD-D-078). Convention split
--     documented in MASTER-PLAN.md §10 D-078 + CLAUDE.md "Architecture
--     Rules". See ITER-2-PATCHES.md §0.1 for the FK census.
--
-- ON DELETE NO ACTION rationale (vs CASCADE):
--   * profiles.id deletion is itself ON DELETE CASCADE from auth.users.id
--     (00007:16). The chain is: delete auth.users row -> profiles deleted
--     (CASCADE from 00007:16) AND org_members deleted (CASCADE from
--     00016:96 auth.users FK).
--   * Both child rows go away together via the auth.users CASCADE; this
--     new FK to profiles never triggers in that chain.
--   * NO ACTION on this new FK serves as a defensive guard: a hand-crafted
--     SQL deletion of a profiles row WITHOUT the matching auth.users
--     deletion would be blocked by this FK (orphan reference would
--     otherwise remain in org_members). Matches the never-delete posture.
--   * CASCADE on this FK would be redundant + would allow profile-only
--     deletion to silently remove org_members rows — incorrect semantic.
--   * Per ITER-2-PATCHES.md §1.3, AC-D1-08 verifies NO ACTION enforces:
--     attempting to delete a profile that has org_members references must
--     raise a FK violation, not silently delete.
--
-- Index posture: org_members.user_id is already indexed by idx_org_members_user_id
-- (migration 00016:177). Adding this FK does NOT require a new index — Postgres
-- uses the existing index for FK lookups (referencing-side coverage). PK on
-- profiles.id provides referenced-side coverage. No CREATE INDEX in this migration.
--
-- Lock posture: ALTER TABLE ADD CONSTRAINT FOREIGN KEY takes SHARE ROW EXCLUSIVE
-- on org_members + validates every existing row. On Ross Built's current org_members
-- (~14 rows) this is sub-millisecond. At 100k-tenant scale, consider NOT VALID +
-- VALIDATE CONSTRAINT to defer validation cost. For Wave-D current scale: bare
-- ADD CONSTRAINT is correct and simpler. Reconsider when org_members > 10k rows.
--
-- Reversibility: `00098_add_org_members_profiles_fk.down.sql` drops the
-- single constraint; idempotent (IF EXISTS guard).
--
-- Pre-flight executor verification (run BEFORE applying this migration):
--   SELECT COUNT(*) FROM public.org_members om
--     LEFT JOIN public.profiles p ON p.id = om.user_id WHERE p.id IS NULL;
--   -- expect: 0. If > 0, HALT for Jake.

BEGIN;

-- 0. FAIL-LOUD ORPHAN-FK ASSERTION.
--    Mirrors 00096 HF-A4-2 + 00097 iter-2 HF-C1-2 pattern. Aborts cleanly
--    if any org_members.user_id value does NOT resolve in profiles(id).
--    Per 00007:5 + 00016:96 design, this should be 0 rows for all historical
--    + going-forward data. If this raises, surface to Jake — orphan
--    indicates identity drift requiring investigation BEFORE FK add.
DO $$
DECLARE
  v_orphan_count INT;
BEGIN
  SELECT COUNT(*) INTO v_orphan_count
    FROM public.org_members om
    LEFT JOIN public.profiles p ON p.id = om.user_id
    WHERE p.id IS NULL;
  IF v_orphan_count > 0 THEN
    RAISE EXCEPTION 'Pre-flight: % org_members rows have user_id NOT IN profiles. Aborting before FK add.', v_orphan_count;
  END IF;
END $$;

-- 1. Add the FK constraint enabling PostgREST embed resolution.
--    Constraint name `org_members_user_id_profiles_fkey` follows Postgres
--    auto-generation convention: <source_table>_<source_column>_<target_table>_fkey.
--    Naming matters because the down migration references it by name AND
--    the Plan D-5 D-078 entry + CLAUDE.md cross-references cite this
--    literal name (per ITER-2-PATCHES.md §1.6 — count >= 7 across docs).
--    NO ON DELETE clause: defaults to NO ACTION. Rationale in header.
ALTER TABLE public.org_members
  ADD CONSTRAINT org_members_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id);

-- 2. Belt-and-suspenders: explicitly notify PostgREST schema cache to reload.
--    Supabase managed instances auto-reload via DDL trigger, but Wave-C taught
--    us schema verification != runtime verification. Eliminate the race-window
--    where the FK lands but the cache hasn't picked it up yet.
--    Per ITER-2-PATCHES.md §1.1 decision 8.
NOTIFY pgrst, 'reload schema';

COMMIT;

-- Post-apply executor verification (run AFTER applying this migration):
--   SELECT conname FROM pg_constraint
--     WHERE conrelid='public.org_members'::regclass
--       AND confrelid='public.profiles'::regclass;
--   -- expect: 1 row, conname=org_members_user_id_profiles_fkey
--
--   -- Reproduce the post-fix REST call (replaces the prior PGRST200):
--   curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/org_members?\
--     select=user_id,profile:profiles(id,full_name)&is_active=eq.true&limit=1" \
--     -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
--     -H "Authorization: Bearer $TEST_USER_JWT"
--   -- expect: HTTP 200, body=[{"user_id":"...","profile":{"id":"...","full_name":"..."}}]
--
--   -- AC-D1-08: ON DELETE NO ACTION guard verification (post-apply against
--   -- fixture-harness-org). Should raise FK violation, NOT silently delete:
--   BEGIN;
--   DELETE FROM profiles WHERE id = (
--     SELECT user_id FROM org_members WHERE org_id = '<fixture-org-uuid>' LIMIT 1
--   );
--   -- expect: ERROR — update or delete on table "profiles" violates foreign key
--   -- constraint "org_members_user_id_profiles_fkey" on table "org_members"
--   ROLLBACK;
