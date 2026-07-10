-- Down for 00119: restore the Ross Built cross-org read carve-out on
-- cost_codes. Reverting reintroduces the cross-org read leak this migration
-- closed; only use if the template-source divorce (1.1d) is being rolled back
-- AND the template route is reverted to read from TEMPLATE_ORG_ID.

DROP POLICY IF EXISTS "authenticated read cost_codes" ON public.cost_codes;

CREATE POLICY "authenticated read cost_codes"
  ON public.cost_codes
  FOR SELECT
  TO public
  USING (
    (org_id = app_private.user_org_id())
    OR (org_id = '00000000-0000-0000-0000-000000000001'::uuid)
  );
