-- Down for 00120: drop the per-draw deposit application column.
ALTER TABLE public.draws DROP COLUMN IF EXISTS deposit_applied_cents;
