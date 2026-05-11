-- Migration: verification harness fixture org + session user
--
-- Per stage-1.5c-verification-harness D-30 (tenant boundary by construction):
-- the harness session is fixture-org-scoped only. Real-tenant data is unreachable
-- BY CONSTRUCTION at every layer.
--
-- This migration seeds the ONE fixture organization the harness operates on.
-- Plan 5's orchestrator authenticates as harness-fixture@nightwork.local; that
-- user has membership in this single fixture org (FIXTURE_ORG_ID); RLS unchanged
-- but the session's org_id claim resolves only to fixture data.
--
-- ============================================================================
-- CHICKEN-AND-EGG NOTE FOR PLAN 5 README (iter-2 LOW concern #3 cleanup)
-- ============================================================================
-- The harness-fixture@nightwork.local user is created by the application via
-- Supabase auth on first harness run, NOT via this migration. Reason: auth.users
-- is managed by Supabase auth, not a vanilla Postgres table — direct INSERT
-- bypasses password hashing + email verification flow.
--
-- Plan 5 orchestrator does:
--   1. supabase.auth.signInWithPassword({
--        email: 'harness-fixture@nightwork.local',
--        password: process.env.HARNESS_FIXTURE_PASSWORD
--      });
--   2. If sign-in fails (user does not exist), one-time setup: create via
--      supabase.auth.admin.createUser (documented in Plan 5 README as
--      "First-time harness setup — run on a fresh project").
--   3. Once the user exists, the org_members row in this migration auto-binds
--      it to the fixture org on next migration run (the SELECT-from-auth.users
--      pattern handles the order — if user doesn't yet exist, the INSERT is a
--      no-op; once they exist, re-running the migration adds the membership).
--
-- This migration is idempotent (re-running is a no-op via ON CONFLICT DO NOTHING).
-- ============================================================================
--
-- Per iter-1 C1 + D-30: this is the C1 prep deliverable. Plan 5 (orchestrator)
-- depends on the fixture org existing before runHarness can authenticate.

BEGIN;

-- 1. Create the fixture org (idempotent on id collision)
--
-- The UUID 00000000-0000-0000-0000-fb1ce0a55e55 is mnemonic ("FIxture Org
-- ASsessment"); never repurpose. The slug 'fixture-harness-org' matches
-- FIXTURE_ORG_ID in src/lib/verification/types.ts (foundation Task 1, Plan 1).
INSERT INTO public.organizations (
  id,
  name,
  slug,
  subscription_plan,
  subscription_status,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-fb1ce0a55e55'::uuid,
  'Verification Harness Fixture Org',
  'fixture-harness-org',
  'enterprise',
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 2. Add the harness-fixture user's membership to the fixture org if the user
-- already exists in auth.users. If not, this INSERT is a no-op (the SELECT
-- returns 0 rows) — the user gets bound on a later migration re-run after the
-- application creates them via supabase.auth.admin.createUser. See chicken-and-
-- egg note above.
--
-- The role is 'admin' so the harness can read fixture data; admin scope is
-- bounded to this single fixture org by RLS — cannot cross into other orgs.
INSERT INTO public.org_members (
  org_id,
  user_id,
  role,
  invited_at,
  accepted_at,
  is_active
)
SELECT
  '00000000-0000-0000-0000-fb1ce0a55e55'::uuid,
  u.id,
  'admin',
  NOW(),
  NOW(),
  TRUE
FROM auth.users u
WHERE u.email = 'harness-fixture@nightwork.local'
ON CONFLICT (org_id, user_id) DO NOTHING;

-- 3. Add the harness-fixture user's profile row if the user already exists in
-- auth.users. Same SELECT-from-auth.users guard pattern as step 2 (no-op
-- until user exists; binds on re-run after auth.admin.createUser).
--
-- WHY THIS IS REQUIRED (closes chicken-and-egg gap discovered in stage-1.5c
-- recovery, nwrp58 diagnostic):
--
-- The harness's auth-strategy.ts uses an anon-key + signInWithPassword session
-- to verify membership (defense-in-depth — same RLS path real customers go
-- through). The RLS policy on org_members SELECT is:
--   USING (org_id = app_private.user_org_id())
-- And user_org_id() is defined as:
--   SELECT org_id FROM public.profiles WHERE id = auth.uid();
--
-- So if the user has org_members but no profiles row, user_org_id() returns
-- NULL, the RLS predicate `org_id = NULL` evaluates to NULL (not true), and
-- the user's own membership row is hidden — auth-strategy.ts emits FATAL
-- "NO active org membership" even though the row exists.
--
-- Migration 00092's original v1 only seeded organizations + org_members,
-- leaving the profiles invariant violated. The platform's normal signup path
-- (phase3_sql_signup migrations 00021-00023) creates profiles via the
-- create_organization_for_new_user SQL function — but auth.admin.createUser
-- (used by the harness one-time bootstrap) bypasses that path, leaving the
-- gap. This INSERT closes it.
INSERT INTO public.profiles (id, full_name, email, role, org_id)
SELECT
  u.id,
  'Harness Fixture',
  u.email,
  'admin',
  '00000000-0000-0000-0000-fb1ce0a55e55'::uuid
FROM auth.users u
WHERE u.email = 'harness-fixture@nightwork.local'
ON CONFLICT (id) DO NOTHING;

-- 4. RLS sanity: this migration touches NO tenant tables (only organizations,
-- org_members, and profiles — all of which already have RLS enabled per
-- migration 00016_multi_tenant_foundation.sql). No additional RLS work
-- required.
--
-- The fixture org is tenant-isolated via the same RLS that protects every other
-- org. The harness session has membership in fixture org only — RLS denies
-- cross-org reads BY CONSTRUCTION even with a misconfigured query.

COMMIT;
