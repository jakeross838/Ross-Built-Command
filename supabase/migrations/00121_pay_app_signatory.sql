-- 00121_pay_app_signatory.sql
-- R2 (PRINT SIGNATORY) — org-level pay-app signatory identity for the AIA G702
-- certification block. Both columns nullable: when UNSET the print renders BLANK
-- signature lines (a wet signature) — never a defaulted or hardcoded person.
-- Kills the prior hardcoded "Jake Ross / Director of Construction" in
-- DrawPrintView. Additive + nullable → no backfill, no RLS change (organizations
-- RLS already governs the table).

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS pay_app_signatory_name text,
  ADD COLUMN IF NOT EXISTS pay_app_signatory_title text;

COMMENT ON COLUMN public.organizations.pay_app_signatory_name IS
  'Name printed on the AIA G702 contractor signature line. NULL = blank line (wet signature).';
COMMENT ON COLUMN public.organizations.pay_app_signatory_title IS
  'Title printed under the signatory name on the G702. NULL = blank.';
