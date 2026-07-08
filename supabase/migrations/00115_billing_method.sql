-- 00115_billing_method.sql
--
-- Billing-method fork (Phase 1). A per-job `billing_method` drives the draw
-- RENDERER + TOTALS MATH only — everything upstream (invoice -> approve ->
-- allocate -> draw data, and the draft/submit/approve/void lifecycle) stays a
-- SINGLE shared pipeline. This migration is purely additive (new columns with
-- safe defaults); it touches no existing row values beyond defaulting.
--
-- Values:
--   aia                 - AIA G702/G703 pay application (today's behaviour)
--   cost_plus_statement - cost + markup invoice statement (Phase 1 renderer)
--   fixed_fee_schedule  - Phase 2, SCHEMA-ONLY here (no renderer yet)
--
-- Config (cost_plus_statement only; per-job override, NULL = inherit org):
--   markup_display  own_line | blended
--   backup_detail   summary | detailed | detailed_with_pdfs
--
-- The markup RATE reuses jobs.gc_fee_percentage (shared column, labelled as
-- "markup" in the statement context; math kept distinct from the AIA
-- contract-fee per the billing-model decision). No new percent column.
--
-- Org-level defaults live on organizations alongside default_gc_fee_percentage
-- (migration 00016). Org default billing_method is 'cost_plus_statement' (the
-- common case going forward); the jobs column default is 'aia' so every
-- EXISTING job (incl. Fish, Gavin) is pinned to AIA and any insert that omits
-- the field is safe. New jobs get their method from the create form, which
-- reads the org default.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS default_billing_method TEXT NOT NULL DEFAULT 'cost_plus_statement'
    CHECK (default_billing_method IN ('aia', 'cost_plus_statement', 'fixed_fee_schedule')),
  ADD COLUMN IF NOT EXISTS default_markup_display TEXT NOT NULL DEFAULT 'own_line'
    CHECK (default_markup_display IN ('own_line', 'blended')),
  ADD COLUMN IF NOT EXISTS default_backup_detail TEXT NOT NULL DEFAULT 'summary'
    CHECK (default_backup_detail IN ('summary', 'detailed', 'detailed_with_pdfs'));

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS billing_method TEXT NOT NULL DEFAULT 'aia'
    CHECK (billing_method IN ('aia', 'cost_plus_statement', 'fixed_fee_schedule')),
  ADD COLUMN IF NOT EXISTS markup_display TEXT
    CHECK (markup_display IN ('own_line', 'blended')),
  ADD COLUMN IF NOT EXISTS backup_detail TEXT
    CHECK (backup_detail IN ('summary', 'detailed', 'detailed_with_pdfs'));

COMMENT ON COLUMN public.jobs.billing_method IS
  'Per-job billing model: aia (G702/G703 pay app), cost_plus_statement (cost+markup invoice statement), fixed_fee_schedule (Phase 2, schema-only). Forks the draw renderer + totals math ONLY; the draft/submit/approve/void lifecycle + invoice->allocation pipeline are shared. Org default = organizations.default_billing_method. Existing rows default to aia.';
COMMENT ON COLUMN public.jobs.markup_display IS
  'cost_plus_statement config: own_line (markup on its own line, open book) or blended (markup distributed pro-rata into displayed code amounts; totals identical). NULL = inherit organizations.default_markup_display.';
COMMENT ON COLUMN public.jobs.backup_detail IS
  'cost_plus_statement config: summary | detailed (vendor.invoice#.amount per code) | detailed_with_pdfs (stamped invoice PDFs appended to the package). NULL = inherit organizations.default_backup_detail.';
