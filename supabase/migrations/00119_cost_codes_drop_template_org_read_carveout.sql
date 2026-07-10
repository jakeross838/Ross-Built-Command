-- 00119: Remove the cost_codes cross-org read carve-out for Ross Built's org
-- (1.1d — divorce the cost-code template source from any live org).
--
-- The "authenticated read cost_codes" SELECT policy carried a hardcoded
-- disjunct `OR org_id = '00000000-0000-0000-0000-000000000001'` (Ross Built's
-- live org), which let EVERY authenticated user in EVERY org read Ross Built's
-- cost codes. That carve-out existed solely so the cost-code template route,
-- running under the RLS-enforced per-request client, could clone Ross Built's
-- live codes into a new org as the "Standard Residential" starter (the
-- TEMPLATE_ORG_ID mechanism).
--
-- Step 1.1d replaces that mechanism with a frozen, in-repo snapshot
-- (src/lib/cost-codes/standard-residential-template.ts) seeded via
-- POST /api/cost-codes/template. The route no longer reads any live org's
-- codes, so the carve-out is now pure dead weight AND a live cross-org read
-- leak. Remove it: authenticated users read ONLY their own org's cost codes.
-- Platform admins retain cross-org read via the separate
-- "cost_codes_platform_admin_read" policy (unchanged).

DROP POLICY IF EXISTS "authenticated read cost_codes" ON public.cost_codes;

CREATE POLICY "authenticated read cost_codes"
  ON public.cost_codes
  FOR SELECT
  TO public
  USING (org_id = app_private.user_org_id());
