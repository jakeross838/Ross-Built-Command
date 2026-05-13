-- Migration 00097: Retire public.users legacy identity table.
--
-- Source decision: GAP item 20 (.planning/audits/2026-05-12-migration-inventory.md
-- Section 5 line 584; line 635 risk analysis) + Wave-C EXPANDED-SCOPE
-- (.planning/expansions/stage-f1-knowledge-graph-auth-wave-c-EXPANDED-SCOPE.md)
-- + nwrp116 authorization.
--
-- Rationale: `public.users` is the pre-multi-tenant identity table from
-- migration 00004 (2025-Q2 era), seeded with 9 internal-team rows. It was
-- conceptually superseded by `profiles` (00007) + `org_members` (00016) but
-- left in place to avoid coordinated breakage during the multi-tenant
-- foundation work. F1-Wave-A audit (2026-05-12) identified 5 src files
-- still reading from this table; Wave-C Plan C-1 refactors those 5 files
-- to read `profiles + org_members` exclusively and then drops the table.
--
-- The 9-row legacy data is REDUNDANT with profiles (00007:88 docs the
-- equivalence: "profiles.id === auth.users.id === public.users.id"). No
-- data migration is needed; pre-flight rowcount documents the legacy
-- state for posterity but is not restored on rollback.
--
-- This migration is safe:
--   - Pre-flight FK enumeration (planner-time grep): only 2 FKs point at
--     public.users(id), both retargeted to profiles(id) BEFORE the DROP.
--   - PostgREST relationship `assigned_pm:assigned_pm_id (id, full_name)`
--     used in 3 src consumers (invoices/queue, invoices, api/invoices/[id])
--     continues to resolve via the retargeted FK to profiles.
--   - 5 src consumers refactored in the same plan (PR C-1).
--
-- Cascading effects (all expected, no action required):
--   - 5 RLS policies on public.users dropped (cumulative chain 00009 →
--     00016 → 00043 → 00049).
--   - users_org_id_fkey constraint pointing FROM public.users TO
--     organizations (00016:84) — auto-dropped with table.
--   - Any remaining indexes on public.users — auto-dropped with table.
--
-- NOT affected (intentionally retained):
--   - auth.users (Supabase Auth foundational; never modified).
--   - profiles (00007) — the canonical identity entity.
--   - org_members (00016) — the role/membership-relation entity.
--   - All rows in invoices.assigned_pm_id + org_workflow_settings.
--     import_default_pm_id (UUIDs preserved; FK target switched).
--
-- Reversibility: `00097_drop_public_users.down.sql` recreates the table
-- schema (NOT data) and reverts the 2 FK retargets. Best-effort rollback;
-- the production audit log + invoice assignments are unaffected by either
-- direction (UUIDs are identity-equivalent between public.users and
-- profiles by 00007 design).
--
-- FK target choice rationale (MED-C1-8): FKs retarget to `profiles(id)`
-- not `auth.users(id)`. Codebase convention for person-FKs is REFERENCES
-- auth.users(id) (30+ existing FKs). Plan C-1 retargets to `profiles(id)`
-- because the PostgREST relationship hint `assigned_pm:assigned_pm_id
-- (id, full_name, role)` requires full_name + role columns — which exist
-- on profiles, NOT on auth.users. FK pointing at auth.users would break
-- the named relationship resolution. Deliberate convention divergence;
-- documented for Wave-B coordination.
--
-- Pre-flight executor verification (run BEFORE applying this migration):
--   SELECT count(*) FROM public.users;  -- documented in SUMMARY.md
--   SELECT * FROM information_schema.referential_constraints WHERE
--     constraint_name LIKE '%users%';   -- expect 2 source FKs, retargeted below

BEGIN;

-- 0. FAIL-LOUD ORPHAN-FK ASSERTION (iter-2 HF-C1-2; mirrors 00096 HF-A4-2
--    pattern). Aborts cleanly if any invoices.assigned_pm_id or
--    org_workflow_settings.import_default_pm_id value does NOT resolve in
--    profiles(id). If this raises, surface to Jake — orphan FK values
--    indicate drift between public.users and profiles that pre-flight Step
--    B should have caught.
DO $$
DECLARE
  v_orphan_invoices INT;
  v_orphan_settings INT;
BEGIN
  SELECT COUNT(*) INTO v_orphan_invoices
    FROM public.invoices
   WHERE assigned_pm_id IS NOT NULL
     AND assigned_pm_id NOT IN (SELECT id FROM public.profiles);
  SELECT COUNT(*) INTO v_orphan_settings
    FROM public.org_workflow_settings
   WHERE import_default_pm_id IS NOT NULL
     AND import_default_pm_id NOT IN (SELECT id FROM public.profiles);
  IF v_orphan_invoices > 0 OR v_orphan_settings > 0 THEN
    RAISE EXCEPTION 'Orphan FK values detected: invoices.assigned_pm_id=%, org_workflow_settings.import_default_pm_id=%. Aborting before FK retarget.',
      v_orphan_invoices, v_orphan_settings;
  END IF;
END $$;

-- 1. Retarget invoices.assigned_pm_id FK from users(id) to profiles(id).
--    Original FK: invoices_assigned_pm_id_fkey from 00004:14.
--    ON DELETE: NO ACTION (default; preserved post-retarget — auth.users
--               deletion cascades to profiles.id, which then NO ACTIONs
--               on invoices.assigned_pm_id, blocking the cascade. This
--               matches the legacy semantic of "cannot silently lose PM
--               assignment on an invoice").
--    Note (iter-2 MED-C1-5): DROP CONSTRAINT without IF EXISTS so the
--    pre-flight FK enumeration must have surfaced the correct name; a
--    name mismatch fails loudly rather than silently.
ALTER TABLE public.invoices
  DROP CONSTRAINT invoices_assigned_pm_id_fkey;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_assigned_pm_id_fkey
  FOREIGN KEY (assigned_pm_id) REFERENCES public.profiles(id);

-- 2. Retarget org_workflow_settings.import_default_pm_id FK from
--    public.users(id) to profiles(id).
--    Original FK: org_workflow_settings_import_default_pm_id_fkey from
--    00036:72.
--    ON DELETE: SET NULL (preserved — semantic "if PM is removed, fall
--               back to no default").
--    Note (iter-2 MED-C1-5): DROP CONSTRAINT without IF EXISTS — same
--    rationale as Step 1.
ALTER TABLE public.org_workflow_settings
  DROP CONSTRAINT org_workflow_settings_import_default_pm_id_fkey;

ALTER TABLE public.org_workflow_settings
  ADD CONSTRAINT org_workflow_settings_import_default_pm_id_fkey
  FOREIGN KEY (import_default_pm_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Drop the table. CASCADE handles the cumulative RLS policy chain:
--    00009 → 00016 → 00043 → 00049 (MED-C1-12). Specifically:
--    - "authenticated read users" (00009:33) — SELECT for all authenticated
--    - "admin write users" (00009:39) replaced in 00043 by
--      "admin owner write users" (00043:73-78) — FOR ALL admin+owner
--    - "org isolation" (00016:163 era; refreshed 00049:319-329) — RESTRICTIVE
--    - "users_delete_strict" (00049:319-329) — RESTRICTIVE DELETE
--    - "users_platform_admin_read" (00049:319-329) — platform_admin bypass
--    Plus users_org_id_fkey (00016:84) auto-drops with the table.
-- nightwork: drop-justified
--   audit-evidence: .planning/audits/2026-05-12-migration-inventory.md GAP item 20
--   consumers-cleared: 5 src files refactored in PR C-1 (jobs/new + invoices/queue
--                      + invoices + api/invoices/[id] + api/jobs/[id]/overview)
--   fks-retargeted: 2 (invoices.assigned_pm_id + org_workflow_settings.import_default_pm_id)
DROP TABLE IF EXISTS public.users CASCADE;

COMMIT;

-- Post-apply executor verification (run AFTER applying this migration):
--   \dt public.users                     -- expect: no relation
--   \d public.invoices                   -- assigned_pm_id REFERENCES profiles(id)
--   \d public.org_workflow_settings      -- import_default_pm_id REFERENCES profiles(id), ON DELETE SET NULL
--   SELECT conname, confrelid::regclass FROM pg_constraint
--     WHERE contype='f' AND confrelid='public.profiles'::regclass
--     AND conname IN ('invoices_assigned_pm_id_fkey',
--                     'org_workflow_settings_import_default_pm_id_fkey');
--   -- expect: 2 rows
