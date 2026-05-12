-- Migration 00095: Drop budgets table.
--
-- Source decision: Q10c (umbrella F1 EXPANDED-SCOPE) + D-035 task #4 resolved
-- as DROP per Wave-A EXPANDED-SCOPE.
--
-- Rationale: The `budgets` table was scaffolded in 00027 as a parent container
-- for budget versioning ("Original Budget" / "Owner Rev 2"). It was never
-- meaningfully wired — the audit (2026-05-12-migration-inventory.md §Section
-- 4 task 4) found 0 rows in production and only loose, conditional wiring in
-- 2 src files (`recalc.ts:253`, `budget-lines/route.ts:65`) with an explicit
-- "some phases wire it, some don't" comment, plus 2 additional wiring points
-- in `budget-lines/[id]/route.ts` discovered during planning. Budget
-- versioning intent is now canonically encoded by
-- `budget_lines.original_estimate` + `revised_estimate` + the `change_orders`
-- graph; no parent container is required.
--
-- This migration is safe:
--   - 0 rows in `budgets` at time of authoring (verified via audit Section 3
--     row-count table; executor MUST re-verify at apply time per OQ-A-3-4).
--   - 3 src consumers refactored in the same plan (PR A-3): `recalc.ts`,
--     `budget-lines/route.ts`, `budget-lines/[id]/route.ts`.
--   - `'budget'` removed from `ActivityEntityType` TS union in
--     `activity-log.ts` (also removed from the parallel
--     `src/lib/audit/action-labels.ts` exhaustive Record).
--   - `budget_lines.budget_id` column is dropped here (CASCADE drops the FK
--     constraint; column drop is explicit for cleanliness).
--   - 288 production `budget_lines` rows carry a NULL `budget_id` (audit
--     evidence: column was nullable and never populated meaningfully); drop
--     is non-destructive.
--
-- Cascading effects (all expected, no action required):
--   - FK constraint `budget_lines_budget_id_fkey` dropped.
--   - 3 RLS policies on `budgets` dropped (from 00027 + 00043 + 00049).
--   - 3 indexes on `budgets` dropped (from 00027).
--   - Trigger `trg_budgets_updated_at` dropped.
--
-- NOT affected (intentionally retained):
--   - Function `update_updated_at` — shared utility used by many tables.
--   - Functions `recompute_budget_line_invoiced`, `trg_invoice_line_items_budget_sync`,
--     `trg_invoices_status_budget_sync` — operate on `budget_lines` + `invoices`
--     (not on `budgets`). Hardened with `SET search_path = public, pg_temp` in
--     migration 00034. They continue to maintain `budget_lines.invoiced` post-drop.
--
-- iter-2 patch HF-A3-1: Post-migration verification query (run manually after
-- apply) confirms `budget_lines` RLS policies do NOT reference the dropped
-- `budgets` table:
--   SELECT policyname, qual, with_check
--     FROM pg_policies
--    WHERE tablename = 'budget_lines'
--      AND (qual LIKE '%budgets%' OR with_check LIKE '%budgets%');
--   -- Expected: 0 rows.
--
-- iter-2 patch HF-A3-2: Post-migration smoke-test query confirms no legacy
-- activity_log rows reference `entity_type='budget'` (TEXT column; rows would
-- remain readable but unaddressable from TS code post-union narrowing):
--   SELECT COUNT(*) FROM activity_log WHERE entity_type = 'budget';
--   -- Expected: 0 rows.
--
-- Reversibility: `00095_drop_budgets.down.sql` recreates the table schema
-- (NOT the data — data was 0 rows). RLS policies, indexes, and triggers are
-- restored to match 00027 + 00043 + 00049 final state.

BEGIN;

-- 1. Drop the now-dead nullable FK column on `budget_lines`.
--    (CASCADE on the table drop below would handle the FK constraint, but
--    leaving the column behind as dangling UUID is dead weight. Explicit drop.)
DROP INDEX IF EXISTS public.idx_budget_lines_budget_id;
ALTER TABLE public.budget_lines DROP COLUMN IF EXISTS budget_id;

-- 2. Drop the table. CASCADE handles:
--    - FK constraint (already gone via step 1, but defensive).
--    - 3 RLS policies on `budgets`.
--    - 3 indexes on `budgets`.
--    - Trigger `trg_budgets_updated_at`.
DROP TABLE IF EXISTS public.budgets CASCADE; -- nightwork: drop-justified — Q10c (umbrella F1 EXPANDED-SCOPE) + D-035 #4: budgets table scaffolded in 00027 but never meaningfully wired; 0 rows verified in audit 2026-05-12-migration-inventory.md Section 4 task 4. Budget versioning intent canonically encoded by budget_lines.original_estimate + revised_estimate + change_orders. Reversibility via 00095_drop_budgets.down.sql.

COMMIT;
