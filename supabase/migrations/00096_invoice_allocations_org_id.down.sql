-- ===========================================================================
-- 00096_invoice_allocations_org_id.down.sql
-- ===========================================================================
--
-- ROLLBACK for 00096. Per CLAUDE.md / project convention (R.16 / commit
-- 4fd3e7d), .down.sql files document emergency rollback paths and are NOT
-- applied to production automatically. This file exists for archaeology
-- + worst-case manual rollback only.
--
-- CRITICAL: this down migration restores the EXACT pre-00096 RLS posture
-- (the post-00049 + post-00043 + post-00038 state). If the rollback policy
-- text diverges from the pre-00096 state, emergency rollback would leave
-- the schema in a different RLS posture than where it started.
--
-- Note (HF-A4-4): "admin owner accounting write invoice_allocations" policy
-- from 00043:118-120 is intentionally NOT recreated here because the up
-- migration never dropped it. Verify via `SELECT policyname FROM pg_policies
-- WHERE tablename='invoice_allocations'` returns 5 policies pre-up and 5
-- policies post-down.
--
-- Step order (reverse of up-migration):
--   1. Drop the 4 direct-filter policies created by 00096.
--   2. Recreate the 4 JOIN-based policies as they existed pre-00096.
--   3. Drop NOT NULL constraint.
--   4. Drop FK constraint.
--   5. Drop org_id column (composite index drops with the column).
-- ===========================================================================

BEGIN;

-- =========================================================================
-- 1. Drop direct-filter policies
-- =========================================================================

DROP POLICY IF EXISTS "org isolation" ON public.invoice_allocations;
DROP POLICY IF EXISTS "invoice_allocations_delete_strict" ON public.invoice_allocations;
DROP POLICY IF EXISTS "authenticated read invoice_allocations" ON public.invoice_allocations;
DROP POLICY IF EXISTS "invoice_allocations_platform_admin_read" ON public.invoice_allocations;


-- =========================================================================
-- 2. Recreate pre-00096 JOIN-based policies
-- =========================================================================
-- Verbatim from:
--   - 00049:345-360 (RESTRICTIVE "org isolation" FOR ALL with JOIN + platform_admin OR-clause)
--   - 00049:361-369 (RESTRICTIVE "invoice_allocations_delete_strict" FOR DELETE with JOIN)
--   - 00049:370-371 (PERMISSIVE "invoice_allocations_platform_admin_read" FOR SELECT)
--   - 00038:211-220 (PERMISSIVE "authenticated read invoice_allocations" FOR SELECT with JOIN)

CREATE POLICY "org isolation"
  ON public.invoice_allocations
  AS RESTRICTIVE FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
       WHERE i.id = invoice_allocations.invoice_id
         AND i.org_id = app_private.user_org_id()
    ) OR app_private.is_platform_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
       WHERE i.id = invoice_allocations.invoice_id
         AND i.org_id = app_private.user_org_id()
    )
  );

CREATE POLICY "invoice_allocations_delete_strict"
  ON public.invoice_allocations
  AS RESTRICTIVE FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
       WHERE i.id = invoice_allocations.invoice_id
         AND i.org_id = app_private.user_org_id()
    )
  );

CREATE POLICY "authenticated read invoice_allocations"
  ON public.invoice_allocations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
       WHERE i.id = invoice_allocations.invoice_id
         AND i.org_id = app_private.user_org_id()
    )
  );

CREATE POLICY "invoice_allocations_platform_admin_read"
  ON public.invoice_allocations
  FOR SELECT USING (app_private.is_platform_admin());


-- =========================================================================
-- 3. Drop NOT NULL constraint
-- =========================================================================

ALTER TABLE public.invoice_allocations
  ALTER COLUMN org_id DROP NOT NULL;


-- =========================================================================
-- 4. Drop FK constraint
-- =========================================================================

ALTER TABLE public.invoice_allocations
  DROP CONSTRAINT IF EXISTS invoice_allocations_org_id_fkey;


-- =========================================================================
-- 5. Drop org_id column (composite index drops automatically)
-- =========================================================================

ALTER TABLE public.invoice_allocations
  DROP COLUMN IF EXISTS org_id;


COMMIT;


-- ===========================================================================
-- POST-ROLLBACK NOTES
-- ===========================================================================
-- Source code changes (4 INSERT sites passing org_id explicitly) must ALSO
-- be reverted in the rollback commit. The src/ INSERTs will fail with
-- "column org_id does not exist" once this down migration lands until the
-- INSERT signatures are reverted. Coordinate via revert PR.
--
-- Drop-the-column is destructive in the sense that any data tied to org_id
-- evidence is lost (though every row's org_id derives from invoices.org_id,
-- which remains intact — re-running the up-migration restores org_id
-- exactly). The down migration is therefore reversible: down→up→down→up
-- preserves invoice_allocations row content.
-- ===========================================================================
