-- Migration: corrective seed for harness-fixture profiles row
--
-- Context: migration 00092 v1 (applied 2026-05-06 21:00:27Z) seeded the fixture
-- org and the org_members membership row, but did NOT seed a public.profiles
-- row for harness-fixture@nightwork.local. The harness's auth-strategy.ts
-- uses an anon-key + signInWithPassword session to verify membership via RLS,
-- and the RLS policy on org_members SELECT is gated by app_private.user_org_id(),
-- which is defined as `SELECT org_id FROM public.profiles WHERE id = auth.uid()`.
-- With no profiles row, user_org_id() returns NULL, the RLS predicate hides
-- the user's own membership row, and auth-strategy.ts emits FATAL
-- "NO active org membership" — preventing the harness from running end-to-end.
--
-- Migration 00092's v2 amends step 3 to seed the profiles row alongside
-- org_members so any FRESH-project cold bootstrap going forward gets the
-- complete invariant set. This migration (00093) is the CORRECTIVE patch
-- for the already-bootstrapped live DB where 00092 v1 has already been
-- recorded as applied.
--
-- Both this migration and 00092 v2 are idempotent (ON CONFLICT DO NOTHING).
-- Re-running either is a no-op once the profiles row exists.
--
-- Cross-reference: nwrp58 diagnostic + nwrp59 fix authorization, OVERNIGHT-LOG
-- entries on 2026-05-07.

BEGIN;

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

COMMIT;
