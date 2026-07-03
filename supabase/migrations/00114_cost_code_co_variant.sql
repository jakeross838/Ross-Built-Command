-- 00114_cost_code_co_variant.sql
--
-- Change-order codes are a PROPERTY of the parent code, not a separate row.
--
-- Before: "13101C" was stored as its own cost_codes row (is_change_order=true).
-- After:  the base code "13101" carries has_co_variant=true, and "13101C" is
--         DERIVED (in draw/G703 CO sections) — never stored as its own row.
--
-- We add a NEW column instead of repurposing is_change_order because invoice
-- logic (src/lib/invoices/save.ts, bulk-import.ts, claude/parse-invoice.ts)
-- reads cost_codes.is_change_order as a per-row "this code IS a change-order
-- code" signal. Repurposing it would make ordinary base-code invoices flag as
-- change orders. So the two flags are distinct:
--   * is_change_order  — legacy per-row CO marker (kept for the invoice
--                        contract; a base code with a CO variant stays false)
--   * has_co_variant   — NEW: this base code has a derived "<code>C" CO variant
--
-- No data backfill: there is no live split-C data (RB is wiped; the template
-- clones from RB; 8j Test has zero CO rows). Forward-looking only.

ALTER TABLE public.cost_codes
  ADD COLUMN IF NOT EXISTS has_co_variant boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.cost_codes.has_co_variant IS
  'When true, this base code (e.g. 13101) has a DERIVED change-order variant (13101C) surfaced in draw/G703 CO sections — the variant is never stored as its own row. Set via the cost-code manager checkbox, or auto-merged from "<digits>C" rows on CSV import. Distinct from is_change_order (a per-row CO marker the invoice pipeline reads); a base code with has_co_variant=true keeps is_change_order=false.';
