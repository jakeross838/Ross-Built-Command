-- Reverse migration 00098: Drop org_members->profiles FK.
--
-- Single DROP CONSTRAINT IF EXISTS — idempotent.
--
-- WARNING: Applying this .down.sql leaves the 9 src consumer hints in their
-- D-1-refactored state (`profile:profiles (id, full_name)`). Those hints
-- WILL return PGRST200 again once the FK is gone — same regression Wave-D
-- Issue 1 fixes. Do NOT apply this .down without ALSO reverting the 9 src
-- file changes (revert the D-1 PR commits in lockstep).
--
-- Intended use: emergency rollback within hours of 00098 apply, BEFORE any
-- production traffic relies on the new hints.

BEGIN;

ALTER TABLE public.org_members
  DROP CONSTRAINT IF EXISTS org_members_user_id_profiles_fkey;

COMMIT;
