-- 00115_billing_method.down.sql — reverse of 00115.
-- Additive-only migration; dropping the columns fully reverts it. No data
-- restoration needed (existing draws are unaffected — they never read these
-- columns; the app treats a missing billing_method as 'aia').

ALTER TABLE public.jobs
  DROP COLUMN IF EXISTS billing_method,
  DROP COLUMN IF EXISTS markup_display,
  DROP COLUMN IF EXISTS backup_detail;

ALTER TABLE public.organizations
  DROP COLUMN IF EXISTS default_billing_method,
  DROP COLUMN IF EXISTS default_markup_display,
  DROP COLUMN IF EXISTS default_backup_detail;
