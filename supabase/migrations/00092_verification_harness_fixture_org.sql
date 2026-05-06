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

-- 3. RLS sanity: this migration touches NO tenant tables (only organizations
-- and org_members, both of which already have RLS enabled per migration
-- 00016_multi_tenant_foundation.sql). No additional RLS work required.
--
-- The fixture org is tenant-isolated via the same RLS that protects every other
-- org. The harness session has membership in fixture org only — RLS denies
-- cross-org reads BY CONSTRUCTION even with a misconfigured query.

COMMIT;
