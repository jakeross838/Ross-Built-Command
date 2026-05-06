-- Down migration for 00092_verification_harness_fixture_org.sql
--
-- Disables the verification harness fixture org + deactivates its harness-
-- fixture@nightwork.local membership. Used only when retiring the verification
-- harness phase entirely; routine migration rollback should not run this
-- (the fixture org is the sole anchor for harness session auth — disabling
-- it without amending Plan 5 will break harness runs).
--
-- Per CLAUDE.md "Never delete records — soft delete only":
--   - organizations: soft-deleted via deleted_at timestamp (column exists per
--     migration 00016).
--   - org_members: deactivated via is_active = FALSE (column exists per
--     migration 00016 with DEFAULT TRUE). org_members has no deleted_at, but
--     is_active is the project-canonical soft-disable flag for memberships.
--
-- Both operations are idempotent (UPDATE is safe to re-run).

BEGIN;

-- 1. Deactivate the harness fixture org_members row via is_active flag.
-- Skips silently if row does not exist (e.g., if up migration could not insert
-- because auth.users user did not yet exist on first migration run).
UPDATE public.org_members
SET is_active = FALSE,
    updated_at = NOW()
WHERE org_id = '00000000-0000-0000-0000-fb1ce0a55e55'::uuid
  AND is_active = TRUE;

-- 2. Soft-delete the fixture org (preserves history per Nightwork policy).
-- The slug becomes available for re-use only after a hard delete via
-- platform-admin tooling — intentional friction so this isn't routine.
UPDATE public.organizations
SET deleted_at = NOW(),
    updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-fb1ce0a55e55'::uuid
  AND deleted_at IS NULL;

COMMIT;
