-- ============================================================
-- WARNING: SCHEMA-ONLY RESTORE.
-- This .down.sql restores the public.users TABLE STRUCTURE only.
-- Legacy data (9 internal-team rows from 00004 + 00007) is NOT
-- reseeded. Data lives in auth.users + profiles (unaffected by drop).
-- For data restore: hand-execute 00004:17-26 + 00007:88 seed SQL.
-- ============================================================
--
-- Reverse migration 00097: Restore public.users table.
--
-- This .down.sql also reverts the 2 FK retargets:
--   - invoices.assigned_pm_id → users(id) (was profiles(id) post-up)
--   - org_workflow_settings.import_default_pm_id → public.users(id) (was profiles(id) post-up)
--
-- Restored state matches the cumulative state of the 5 forward
-- migrations that touched public.users or its FKs/policies:
--   00004 (CREATE TABLE + initial seed)
--   00009 (initial RLS: authenticated read + admin write)
--   00016 (multi-tenant: org_id FK + org_id RESTRICTIVE isolation)
--   00043 (RLS owner-role write parity: "admin write users" →
--          "admin owner write users")
--   00049 (platform_admin RLS bypass refresh)
--
-- If running this .down on an environment that has not yet reached
-- 00049, the platform_admin RLS policies will overshoot. All
-- Nightwork environments (prod + preview + dev) are well past 00094
-- (Wave-A applied 2026-05-12) so this is not a concern in practice.
--
-- Mixed-state rollback decision tree (iter-2 HF-C1-4):
--   - Atomic rollback (.down.sql + src revert in single PR):
--     OPERATIONAL — no UI gap. Recommended path.
--   - .down.sql applies WITHOUT src revert:
--     OPERATIONAL — src reads from profiles + org_members continue
--     working (unaffected by table restore). Safe direction.
--   - Src revert WITHOUT .down.sql:
--     BUILD FAILS at compile time (TypeScript references nonexistent
--     users table; or runtime FK errors). Not deployable; rollback
--     must include .down.sql.
--   - .down.sql first, src revert deferred:
--     SAFE — public.users schema restored empty; src continues reading
--     profiles + org_members. No degradation.
--   - Src revert deployed first, .down.sql applied later:
--     UI GAP WINDOW — between src deploy and .down.sql apply, src
--     reads from("users") against the (still-existing-from-merge)
--     table → returns data correctly until .down.sql empties it.
--     After .down.sql: from("users") returns empty arrays → PM
--     dropdowns empty, "Unassigned" everywhere. AVOID this sequence.

BEGIN;

-- 1. Recreate public.users table (from 00004 base + 00016 org_id FK).
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'pm' CHECK (role IN ('admin', 'pm', 'accounting', 'owner')),
  org_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 2. Restore org_id FK to organizations (from 00016:84).
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_org_id_fkey;
ALTER TABLE public.users
  ADD CONSTRAINT users_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES public.organizations(id);

-- 3. Restore RLS state (cumulative 00009 + 00016 + 00043 + 00049).
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 00009 SELECT policy (unchanged through chain).
DROP POLICY IF EXISTS "authenticated read users" ON public.users;
CREATE POLICY "authenticated read users"
  ON public.users FOR SELECT TO authenticated USING (true);

-- 00043 write parity replacement (iter-2 HF-C1-1):
--   Original 00009 policy "admin write users" (admin only) was DROPped
--   in 00043 and replaced with "admin owner write users" (admin + owner).
--   Restoring the 00043-era policy here ensures Jake (owner role) keeps
--   write access to public.users post-rollback.
DROP POLICY IF EXISTS "admin write users" ON public.users;
DROP POLICY IF EXISTS "admin owner write users" ON public.users;
CREATE POLICY "admin owner write users" ON public.users
  FOR ALL USING (app_private.user_role() IN ('admin', 'owner'))
  WITH CHECK (app_private.user_role() IN ('admin', 'owner'));

-- 00016 + 00049 RESTRICTIVE org isolation (cumulative end-state).
DROP POLICY IF EXISTS "org isolation" ON public.users;
CREATE POLICY "org isolation" ON public.users
  AS RESTRICTIVE FOR ALL
  USING (org_id = app_private.user_org_id() OR app_private.is_platform_admin())
  WITH CHECK (org_id = app_private.user_org_id());

DROP POLICY IF EXISTS "users_delete_strict" ON public.users;
CREATE POLICY "users_delete_strict" ON public.users
  AS RESTRICTIVE FOR DELETE
  USING (org_id = app_private.user_org_id());

DROP POLICY IF EXISTS "users_platform_admin_read" ON public.users;
CREATE POLICY "users_platform_admin_read" ON public.users
  FOR SELECT USING (app_private.is_platform_admin());

-- 4. Revert invoices.assigned_pm_id FK back to users(id).
ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_assigned_pm_id_fkey;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_assigned_pm_id_fkey
  FOREIGN KEY (assigned_pm_id) REFERENCES public.users(id);

-- 5. Revert org_workflow_settings.import_default_pm_id FK back to public.users(id).
ALTER TABLE public.org_workflow_settings
  DROP CONSTRAINT IF EXISTS org_workflow_settings_import_default_pm_id_fkey;

ALTER TABLE public.org_workflow_settings
  ADD CONSTRAINT org_workflow_settings_import_default_pm_id_fkey
  FOREIGN KEY (import_default_pm_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Note: 9-row legacy data NOT reseeded. If a hard rollback to pre-Wave-C
-- behavior is required, re-run the seed SQL from 00004:17-26 + 00007:88 by
-- hand. The canonical identity data lives in profiles + auth.users (which
-- the up-migration did not touch).

COMMIT;
