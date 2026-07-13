-- 00121_pay_app_signatory.down.sql
ALTER TABLE public.organizations
  DROP COLUMN IF EXISTS pay_app_signatory_name,
  DROP COLUMN IF EXISTS pay_app_signatory_title;
