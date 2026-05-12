---
phase: stage-f1-knowledge-graph-auth-wave-a
plan: A-3
plan-name: drop-budgets
type: execute
wave: A
depends_on: []
autonomous: true
halt_after: false
threat_model_severity: low
status: not-started
authored: 2026-05-12
authored_by: gsd-planner (claude-opus-4-7[1m])
authorization: nwrp113 (Wave-A autonomous plan authoring + execution envelope)
requirements: []
source_decisions:
  - "Q10c (umbrella F1 EXPANDED-SCOPE §Drop budgets cascade — drop entirely; versioning intent encoded by budget_lines.original_estimate + revised_estimate + change_orders)"
  - "D-035 #4 (decide budgets table fate — RESOLVED via Q10c = drop)"
files_modified:
  - supabase/migrations/00095_drop_budgets.sql
  - supabase/migrations/00095_drop_budgets.down.sql
  - src/lib/recalc.ts
  - src/app/api/budget-lines/route.ts
  - src/app/api/budget-lines/[id]/route.ts
  - src/lib/activity-log.ts
  - CLAUDE.md
files_referenced:
  - supabase/migrations/00027_phase6_budget_system_and_notifications.sql (original CREATE TABLE budgets — schema reference for .down.sql restore)
  - supabase/migrations/00034_phase8i_security_audit_fixes.sql (search_path hardening on recompute_budget_line_invoiced — UNTOUCHED, retained)
  - supabase/migrations/00043_rls_owner_admin_write_parity.sql (admin-owner write policy on budgets — schema reference for .down.sql)
  - supabase/migrations/00049_platform_admin_rls_bypass.sql (platform-admin RLS policies on budgets — schema reference for .down.sql)
  - .planning/audits/2026-05-12-migration-inventory.md (Section 4 task 4 — 0-row evidence; Section 3 row-count table)
requires:
  - .planning/expansions/stage-f1-knowledge-graph-auth-wave-a-EXPANDED-SCOPE.md
  - .planning/expansions/stage-f1-knowledge-graph-auth-EXPANDED-SCOPE.md
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-a/CONTEXT.md
  - .planning/audits/2026-05-12-migration-inventory.md
provides:
  - "budgets table removed from schema (0-row state at drop time confirmed via audit; 0-row check re-asserted by executor pre-migration)"
  - "budget_lines.budget_id FK column removed (dead column post-drop)"
  - "ActivityEntityType TS union narrowed: 'budget' member removed; reads of legacy activity_log rows with entity_type='budget' remain non-breaking (column is TEXT, not ENUM)"
  - "Canonical job-level budget total documented as derived: SUM(budget_lines.revised_estimate) — computed on read, never stored"
  - "D-035 first-day task #4 closed"
affects:
  - "src/lib/recalc.ts — recalcBudgetTotals function deleted (2 callsite imports removed in budget-lines routes)"
  - "src/app/api/budget-lines/route.ts — POST handler simplified (budget lookup + budget_id insert + recalcBudgetTotals call removed)"
  - "src/app/api/budget-lines/[id]/route.ts — PATCH + DELETE handlers simplified (budget_id reads + recalcBudgetTotals calls removed)"
  - "Any future UI/API surface that wants the job-level budget total computes it on read (no stored value to consume)"
  - "Migrations 00027 / 00043 / 00049 historical state is preserved (forward-only — already run); .down.sql restores the cumulative end-state if rollback is needed"
sequence:
  after: A-1 (migration 00094)
  before: A-4 (migration 00096)
  parallel_authoring_ok: true
  schema_independent_of: [A-1, A-2, A-4]
acceptance-criteria-target: 6 falsifiable items (verbatim from Wave-A EXPANDED-SCOPE §Plan A-3) + 1 plan-extension item for the missed budget-lines/[id]/route.ts file

threat_model:
  trust_boundaries:
    - "DB schema change boundary — migration 00095 modifies public schema; CASCADE drops 3 RLS policies + 3 indexes + 1 trigger + 1 FK on budget_lines"
    - "Code refactor boundary — 3 src files lose references to a soon-to-be-nonexistent table; build must reflect the change atomically with the migration"
    - "Audit-log read boundary — pre-existing activity_log rows with entity_type='budget' (if any) become unaddressable from typed-TS write paths; READ paths via raw SQL or label-lookup map are unaffected (D-051 entity_type is TEXT)"
  threats:
    - id: T-A-3-01
      category: "D (Denial of Service — schema migration fails on production)"
      component: "DROP TABLE budgets CASCADE"
      disposition: "mitigate"
      mitigation: "0-row state verified via audit Section 4; executor re-verifies via SELECT count(*) immediately before migration apply. CASCADE explicitly scoped to expected dependents (1 FK column, 3 RLS policies, 3 indexes, 1 trigger). All listed and rationalized in §Migration design rationale."
    - id: T-A-3-02
      category: "I (Information Disclosure — orphan column data leak)"
      component: "budget_lines.budget_id column"
      disposition: "mitigate"
      mitigation: "Column dropped explicitly via ALTER TABLE DROP COLUMN (Option B per §Migration design rationale). No row contains meaningful budget_id (none ever populated; column always nullable per 00027:64). No information surface."
    - id: T-A-3-03
      category: "T (Tampering — RLS regression on sibling table)"
      component: "RLS policies on budget_lines"
      disposition: "mitigate"
      mitigation: "Policies on budgets are scoped per-table via ON public.budgets clauses (00027 + 00043 + 00049 — verified). CASCADE drops budgets-scoped policies only. budget_lines policies (org isolation + admin/owner write + platform_admin bypass) are independent and untouched. Harness Layer 1 RLS-coverage check verifies post-migration that budget_lines policies still enforce org boundary."
    - id: T-A-3-04
      category: "R (Repudiation — audit-log rendering regression for legacy entity_type='budget' rows)"
      component: "src/lib/audit/action-labels.ts label-lookup map"
      disposition: "accept (mitigation deferred to plan-review opt-in)"
      mitigation: "activity_log.entity_type is TEXT (not ENUM). Legacy rows remain in DB; read paths via raw SQL or label-lookup are unaffected. IF a UI surface uses an exhaustive switch on ActivityEntityType TS union, that surface would drop 'budget' rows. Per OPEN-QUESTION-3: executor greps src/lib/audit/ during execution and adds a default case if missing. If no exhaustive switch exists, no action."
    - id: T-A-3-05
      category: "D (Denial of Service — overshoot on .down.sql)"
      component: "supabase/migrations/00095_drop_budgets.down.sql"
      disposition: "accept"
      mitigation: "Risk only materializes on parallel/cold-start environment that applied 00027 but not 00043+00049. All Nightwork environments (prod + preview + dev) are well past 00049 per .planning/audits/2026-05-12-migration-inventory.md row-count audit. .down.sql header documents the assumption. nightwork-data-migration-safety reviewer to sanity-check."

must_haves:
  truths:
    - "After migration 00095 applies, `\\dt public.budgets` returns no relation"
    - "After migration 00095 applies, `\\d public.budget_lines` shows no `budget_id` column"
    - "After A-3 PR merges, `grep -rn '\\.from(\"budgets\"' src/` returns 0 hits"
    - "After A-3 PR merges, `grep -rn 'recalcBudgetTotals' src/` returns 0 hits (function deleted; no callsites remain)"
    - "After A-3 PR merges, `grep -rn 'budget_id' src/app/api/budget-lines/` returns 0 hits (column dropped; references removed)"
    - "After A-3 PR merges, `grep -c '\"budget\"' src/lib/activity-log.ts` returns 0 (union member removed)"
    - "After A-3 PR merges, `grep -rn 'entity_type:\\s*\"budget\"' src/ supabase/` returns 0 hits (no code writes 'budget' as entity_type)"
    - "POST /api/budget-lines continues to return HTTP 200 with { id } for an authenticated admin/owner inserting a valid (job_id, cost_code_id) pair"
    - "PATCH /api/budget-lines/:id continues to return HTTP 200 with { ok: true } for an authenticated admin/owner editing original_estimate"
    - "DELETE /api/budget-lines/:id continues to return HTTP 200 with { ok: true } for an authenticated admin/owner soft-deleting (when deletion guards pass)"
    - "`npm run build` passes with zero TypeScript errors"
    - "`npx tsc --noEmit` passes"
    - "Drummond grep gate (.githooks/pre-commit) silent on the committed diff"
    - "Harness Layer 1 (DB integrity + RLS coverage) PASS post-migration — no advisor regression, no orphan FK flag"
    - "Drummond gate (full E2E walk) PASS post-migration — budgets drop does not affect the Drummond scenario (table was never populated for Drummond or any org)"
    - "CLAUDE.md '### budget_lines' entry contains the new derived-from-line-items note (cite Q10c)"
  artifacts:
    - path: "supabase/migrations/00095_drop_budgets.sql"
      provides: "Forward DDL: DROP TABLE budgets CASCADE + DROP COLUMN budget_lines.budget_id"
      contains: "DROP TABLE IF EXISTS public.budgets CASCADE"
      contains_also: "ALTER TABLE public.budget_lines DROP COLUMN IF EXISTS budget_id"
    - path: "supabase/migrations/00095_drop_budgets.down.sql"
      provides: "Reverse DDL: recreate budgets table schema (NOT data) — restores cumulative state from 00027 + 00043 + 00049"
      contains: "CREATE TABLE IF NOT EXISTS public.budgets"
      contains_also: "ENABLE ROW LEVEL SECURITY"
    - path: "src/lib/recalc.ts"
      provides: "Module with `recalcBudgetTotals` function deleted; documentation comment explaining derived-on-read semantics"
      not_contains: "from(\"budgets\""
      not_contains_also: "recalcBudgetTotals"
    - path: "src/app/api/budget-lines/route.ts"
      provides: "POST handler simplified: no budget lookup, no budget_id field, no recalcBudgetTotals call"
      not_contains: "from(\"budgets\""
      not_contains_also: "budget_id"
    - path: "src/app/api/budget-lines/[id]/route.ts"
      provides: "PATCH + DELETE handlers simplified: no budget_id reads, no recalcBudgetTotals calls; DELETE 'before' read also removed (no longer needed)"
      not_contains: "budget_id"
      not_contains_also: "recalcBudgetTotals"
    - path: "src/lib/activity-log.ts"
      provides: "ActivityEntityType union narrowed: 11-entry → 10-entry (drops 'budget' per Q10c)"
      not_contains: "| \"budget\""
    - path: "CLAUDE.md"
      provides: "Data Model §budget_lines entry contains derived-from-line-items note citing Q10c"
      contains: "No `budgets` parent table"
      contains_also: "computed on read"
  key_links:
    - from: "supabase/migrations/00095_drop_budgets.sql"
      to: "public.budgets table"
      via: "DROP TABLE CASCADE"
      pattern: "DROP TABLE IF EXISTS public.budgets CASCADE"
    - from: "supabase/migrations/00095_drop_budgets.sql"
      to: "public.budget_lines.budget_id column"
      via: "ALTER TABLE DROP COLUMN"
      pattern: "ALTER TABLE public.budget_lines DROP COLUMN IF EXISTS budget_id"
    - from: "src/lib/recalc.ts"
      to: "(deleted recalcBudgetTotals)"
      via: "function removal"
      pattern: "// `recalcBudgetTotals` was removed in PR A-3"
    - from: "src/app/api/budget-lines/route.ts (POST)"
      to: "src/lib/recalc.ts"
      via: "named import — narrowed to recalcBudgetLine only"
      pattern: "import \\{ recalcBudgetLine \\} from \"@/lib/recalc\""
    - from: "src/app/api/budget-lines/[id]/route.ts (PATCH+DELETE)"
      to: "src/lib/recalc.ts"
      via: "named import — narrowed to recalcBudgetLine only"
      pattern: "import \\{ recalcBudgetLine \\} from \"@/lib/recalc\""
    - from: "src/lib/activity-log.ts (ActivityEntityType)"
      to: "(removed 'budget' member)"
      via: "TS union narrowing"
      pattern: "ActivityEntityType[\\s\\S]*?budget_line[\\s\\S]*?job"
    - from: "CLAUDE.md"
      to: "Q10c (umbrella F1 EXPANDED-SCOPE)"
      via: "explicit citation in budget_lines entry"
      pattern: "Per Q10c"
---

# A-3 — Drop `budgets` table + refactor consumers

## Goal

Drop the `budgets` table entirely per Q10c. The half-built versioning concept ("Original Budget" / "Owner Rev 2") is removed; canonical budget total for a job is computed on read as `SUM(budget_lines.revised_estimate)` for the job. Three src consumers are refactored to stop touching the table, and `'budget'` is removed from the `ActivityEntityType` TS union.

## Source decision (verbatim from umbrella EXPANDED-SCOPE)

> **Q10c — Drop `budgets` entirely** — versioning intent already encoded by `budget_lines.original_estimate` + `revised_estimate` + change_orders. Adding budgets back later is doable but requires re-litigating the canonical entity decision.
>
> (§Cross-cutting decisions row 11)

> Decide `budgets` table fate (D-035 #4): RESOLVED via Q10c — drop entirely. F1-Wave-A.
>
> (§D-035 first-day tasks status post-audit, item 4)

---

## Scope inclusions

1. SQL migration `00095_drop_budgets.sql` that:
   - `DROP TABLE public.budgets CASCADE` (cascades to FK reference from `budget_lines.budget_id`).
   - Optionally drops the now-dead `budget_lines.budget_id` column explicitly for hygiene. **Decision: include the explicit `ALTER TABLE budget_lines DROP COLUMN budget_id` in this same migration** — see §Migration design rationale below.
   - Optionally drops the now-dead `idx_budget_lines_budget_id` index (created in 00027:97). **Decision: included; `DROP INDEX IF EXISTS` is implicit when the column drops, but explicit is cleaner and Postgres-version-safe.**
2. Reverse migration `00095_drop_budgets.down.sql` that restores the `budgets` table schema (NOT data — data was 0 rows; documented explicitly).
3. Code refactors to remove all 3 src consumers (one more than the brief listed).
4. TS union narrowing in `src/lib/activity-log.ts`.
5. CLAUDE.md documentation update under the existing `### budget_lines` entry (no new `### budgets` entry was ever present; confirmed CLAUDE.md L153).
6. Build + harness verification.

## Scope exclusions

- **No data migration.** `budgets` is 0 rows. There is nothing to back-up, archive, or transform.
- **No re-keying of activity_log historical rows.** Per acceptance criterion #4, existing `activity_log` rows with `entity_type='budget'` (if any) remain as legacy TEXT — the column is TEXT, not an ENUM. Removing `'budget'` from the TS union narrows compile-time writes only; reads of pre-existing rows are unaffected.
- **No change to migration 00034 search_path hardening on `recompute_budget_line_invoiced`, `trg_invoice_line_items_budget_sync`, `trg_invoices_status_budget_sync`.** These functions operate on `budget_lines` and `invoice_line_items` — they reference `budget_lines.invoiced`, `budget_lines.budget_line_id` (no, that's a column name on the join target), and `invoices.status`. They do NOT touch `budgets`. They stay intact and continue to function correctly post-drop.
- **No change to RLS policy churn migrations 00043 (write-parity) and 00049 (platform_admin bypass).** The `DROP POLICY IF EXISTS` clauses in those migrations are no-ops if the table is already gone; the `CREATE POLICY` clauses target `public.budgets` and would fail. But — **those migrations have already run on every environment** that has reached 00049+, so they are historical. They do not re-execute. No edit needed. (Verified: `00043` has no `.down.sql`; `00049` has no `.down.sql`. Both are forward-only.) The down migration for 00095 must re-create the RLS-policy state — see §Migration .down.sql design.
- **No change to UI / API consumers downstream of `recalcBudgetTotals`.** The function is unexported after this plan; the only callers are the 2 budget-line API routes, which are also being refactored.
- **A-5 (`public.users` retirement) is out of scope** per Wave-A scope (CONTEXT.md). The half-finished `public.users` legacy table is a separate cleanup deferred to either an absorbed A-5 or Wave-C.

---

## Migration design rationale

### Why drop the column, not just leave it nullable

`budget_lines.budget_id UUID REFERENCES public.budgets(id)` was added in 00027:64. `DROP TABLE budgets CASCADE` will drop the FK constraint but **leave the `budget_id` column behind as a dangling UUID with no referent.** This is dead weight: 288 production rows (per audit row count) carry a now-meaningless UUID column.

Two options:

**Option A — DROP TABLE CASCADE only, leave column.**
- Pro: smallest migration; column is nullable so reads/writes don't break.
- Con: dead column accrues in every JOIN, every SELECT *, every backup. Future schema scans flag it as orphan.

**Option B — DROP TABLE CASCADE + DROP COLUMN budget_lines.budget_id.**
- Pro: clean. No dangling references. Schema reads tell the truth.
- Con: one more DDL statement; one more line in down.sql.

**Decision: Option B.** The migration is one logical change ("retire the budgets concept"); leaving the column behind for cleanliness later just creates Wave-B noise. The acceptance criterion #1 explicitly allows "plan-phase to decide cleanest path" — this is that decision.

### Why CASCADE on DROP TABLE

`budget_lines.budget_id` has a FK to `budgets.id`. Without CASCADE, the DROP will fail with `cannot drop table budgets because other objects depend on it`. CASCADE drops:
- The FK constraint on `budget_lines.budget_id` (we then explicitly drop the column itself).
- The three RLS policies on `budgets` (`org isolation` from 00049, `admin owner write budgets` from 00043, `budgets_delete_strict` from 00049, `budgets_platform_admin_read` from 00049 — all auto-dropped with the table).
- The three indexes on `budgets` (`idx_budgets_org_id`, `idx_budgets_job_id`, `idx_budgets_one_active_per_job` — auto-dropped with the table).
- The `trg_budgets_updated_at` trigger (auto-dropped with the table).

CASCADE is the correct, well-scoped operator here. The only other dependency is the application-layer trigger function `update_updated_at` (a shared utility), which is unaffected.

### Why `DROP INDEX IF EXISTS idx_budget_lines_budget_id`

This index on `budget_lines.budget_id` was created in 00027:97. It's automatically dropped when the column is dropped via `ALTER TABLE ... DROP COLUMN`. But Postgres versions differ subtly here, and `DROP INDEX IF EXISTS` before `DROP COLUMN` is idiomatic and explicit. Included for safety + readability.

---

## Implementation tasks

### Task 1 — Author migration `00095_drop_budgets.sql`

**Path:** `supabase/migrations/00095_drop_budgets.sql`

**Action:** Create new file with the following content.

```sql
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
-- "some phases wire it, some don't" comment. Budget versioning intent is now
-- canonically encoded by `budget_lines.original_estimate` + `revised_estimate`
-- + the `change_orders` graph; no parent container is required.
--
-- This migration is safe:
--   - 0 rows in `budgets` at time of authoring (verified via audit Section 3
--     row-count table).
--   - 3 src consumers refactored in the same plan (PR A-3): `recalc.ts`,
--     `budget-lines/route.ts`, `budget-lines/[id]/route.ts`.
--   - `'budget'` removed from `ActivityEntityType` TS union in `activity-log.ts`.
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
DROP TABLE IF EXISTS public.budgets CASCADE;

COMMIT;
```

**Verification:** `psql -d $DATABASE_URL -c "\dt public.budgets"` returns `no relation` post-migration. `\d public.budget_lines` shows no `budget_id` column.

### Task 2 — Author reverse migration `00095_drop_budgets.down.sql`

**Path:** `supabase/migrations/00095_drop_budgets.down.sql`

**Action:** Create new file with restoration DDL. **This restores schema only — data was 0 rows; nothing to restore.**

```sql
-- Reverse migration 00095: Restore budgets table.
--
-- WARNING: This recreates the `budgets` table SCHEMA only. The forward
-- migration's data state was 0 rows (audit 2026-05-12 §Section 3); no data
-- is restored because no data existed at drop time.
--
-- If you are running this .down because you need to recover application
-- behavior that depended on `budgets`, you ALSO need to:
--   - Revert the src refactor commits in PR A-3 (recalc.ts, budget-lines
--     routes, activity-log.ts, CLAUDE.md).
--   - Restore the `budget_lines.budget_id` column population logic.
--
-- Restored state matches the cumulative state of 00027 + 00043 + 00049 (the
-- 3 forward migrations that touched `budgets` table or its policies).

BEGIN;

-- 1. Re-add the FK column on `budget_lines`.
ALTER TABLE public.budget_lines
  ADD COLUMN IF NOT EXISTS budget_id UUID;
CREATE INDEX IF NOT EXISTS idx_budget_lines_budget_id
  ON public.budget_lines (budget_id);

-- 2. Recreate the budgets table (from 00027).
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id),
  name TEXT NOT NULL DEFAULT 'Original Budget',
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_amount BIGINT NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes (from 00027).
CREATE INDEX IF NOT EXISTS idx_budgets_org_id ON public.budgets (org_id);
CREATE INDEX IF NOT EXISTS idx_budgets_job_id ON public.budgets (job_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_one_active_per_job
  ON public.budgets (job_id)
  WHERE is_active = true AND deleted_at IS NULL;

-- Re-attach the FK on budget_lines.budget_id → budgets.id (after table exists).
ALTER TABLE public.budget_lines
  ADD CONSTRAINT budget_lines_budget_id_fkey
  FOREIGN KEY (budget_id) REFERENCES public.budgets(id);

-- updated_at trigger (from 00027).
DROP TRIGGER IF EXISTS trg_budgets_updated_at ON public.budgets;
CREATE TRIGGER trg_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS (cumulative final state from 00027 + 00043 + 00049).
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Org-isolation RESTRICTIVE policy with platform_admin bypass (00049 final state).
CREATE POLICY "org isolation" ON public.budgets
  AS RESTRICTIVE FOR ALL
  USING (org_id = app_private.user_org_id() OR app_private.is_platform_admin())
  WITH CHECK (org_id = app_private.user_org_id());

-- Strict delete policy (00049).
CREATE POLICY "budgets_delete_strict" ON public.budgets
  AS RESTRICTIVE FOR DELETE
  USING (org_id = app_private.user_org_id());

-- Platform admin cross-org read (00049).
CREATE POLICY "budgets_platform_admin_read" ON public.budgets
  FOR SELECT USING (app_private.is_platform_admin());

-- Admin/owner write parity (00043 final state).
CREATE POLICY "admin owner write budgets" ON public.budgets
  FOR ALL USING (app_private.user_role() IN ('admin', 'owner'))
  WITH CHECK (app_private.user_role() IN ('admin', 'owner'));

-- Members read (from 00027 — superseded by org-isolation USING clause but kept
-- for fidelity with the cumulative forward-migration state).
CREATE POLICY "members read budgets" ON public.budgets
  FOR SELECT USING (org_id = app_private.user_org_id());

COMMIT;
```

**Note re: .down.sql faithfulness:** Migrations `00027`, `00043`, and `00049` have no `.down.sql` counterparts (they are forward-only). This single `.down.sql` consolidates the cumulative end-state of `budgets`-touching DDL across all three. If `.down` is run on an environment that has not yet reached `00049`, this `.down` will overshoot (apply policies the environment didn't yet have). This is acceptable because: (a) all production + staging environments are well past 00049; (b) `.down` is a rollback safety net, not a forward-replay tool.

### Task 3 — Refactor `src/lib/recalc.ts`

**Path:** `src/lib/recalc.ts`

**Current state:** Lines 231-257 define and export `recalcBudgetTotals`. Imports nothing extra. Used by 2 call sites.

**Action:** Delete the entire `recalcBudgetTotals` function (lines 231-257 inclusive — the JSDoc block + function body). No replacement function needed; the canonical total `SUM(budget_lines.revised_estimate) WHERE job_id = ?` is computed on read by the UI/API layer (not stored).

**Diff preview:**

```typescript
// BEFORE (lines 231-257):
/**
 * Recompute a budget's total_amount from the sum of its budget_lines'
 * original estimates. Used when an individual line's original_amount is
 * edited.
 */
export async function recalcBudgetTotals(budgetId: string): Promise<{
  total_amount: number;
} | null> {
  if (!budgetId) return null;
  const supabase = createServiceRoleClient();

  const { data: lines } = await supabase
    .from("budget_lines")
    .select("original_estimate")
    .eq("budget_id", budgetId)
    .is("deleted_at", null);
  const total_amount = (lines ?? []).reduce(
    (s, bl) => s + ((bl as { original_estimate: number }).original_estimate ?? 0),
    0
  );

  await supabase
    .from("budgets")
    .update({ total_amount, updated_at: new Date().toISOString() })
    .eq("id", budgetId);
  return { total_amount };
}

// AFTER: deleted entirely. No replacement.
```

**Documentation insertion (replaces deleted block):** Add a brief comment block above `recalcAllForJob` (which becomes the new immediate-successor function) explaining why `recalcBudgetTotals` was removed:

```typescript
// `recalcBudgetTotals` was removed in PR A-3 (F1-Wave-A) per Q10c — the
// `budgets` table was dropped. Job-level budget totals are now computed on
// read as `SUM(budget_lines.revised_estimate) WHERE job_id = ?` by the
// UI/API surfaces that need them (e.g. budget page, draw header). No
// stored aggregate is maintained.
```

**Verify:** `grep -n "recalcBudgetTotals\|budgets" src/lib/recalc.ts` returns 0 matches post-edit (other than the comment above).

### Task 4 — Refactor `src/app/api/budget-lines/route.ts` (POST)

**Path:** `src/app/api/budget-lines/route.ts`

**Current state:** Lines 60-70 do a budget lookup. Line 86 sets `budget_id` on insert. Line 98 calls `recalcBudgetTotals`. The "some phases wire it, some don't" comment is at lines 60-63.

**Action:**

1. **Remove the import** of `recalcBudgetTotals` (line 6): change `import { recalcBudgetLine, recalcBudgetTotals } from "@/lib/recalc";` → `import { recalcBudgetLine } from "@/lib/recalc";`
2. **Delete the budget lookup block** (lines 60-70).
3. **Delete the `budget_id` field** from the insert (line 86).
4. **Delete the `recalcBudgetTotals` call** (lines 97-98).
5. **Tighten the inserted-row `.select(...)`** from `"id, budget_id"` to `"id"` (line 90).

**Diff preview:**

```typescript
// BEFORE (relevant excerpts):
import { recalcBudgetLine, recalcBudgetTotals } from "@/lib/recalc";          // line 6

// ... inside POST handler ...

  // Find a budget_id if the job already has one (budgets table is the         // line 60
  // parent container; some phases wire it, some don't). Use the first         // line 61
  // active budget if present; otherwise leave null (budget_lines.budget_id    // line 62
  // is nullable).                                                              // line 63
  const { data: budgetRow } = await supabase                                   // line 64
    .from("budgets")                                                            // line 65
    .select("id")                                                               // line 66
    .eq("job_id", body.job_id)                                                  // line 67
    .is("deleted_at", null)                                                     // line 68
    .limit(1)                                                                   // line 69
    .maybeSingle();                                                             // line 70

  const { data: inserted, error } = await supabase
    .from("budget_lines")
    .insert({
      job_id: body.job_id,
      // ... other fields ...
      budget_id: (budgetRow as { id?: string } | null)?.id ?? null,            // line 86
      org_id: membership.org_id,
      created_by: user?.id ?? null,
    })
    .select("id, budget_id")                                                   // line 90
    .single();
  if (error) throw new ApiError(error.message, 500);

  // Trigger a recalc so committed/invoiced stay at 0 (noop but idempotent)    // line 94
  // and ensure budget totals stay in sync.                                    // line 95
  await recalcBudgetLine((inserted as { id: string }).id);                     // line 96
  const budgetId = (inserted as { budget_id?: string | null }).budget_id;      // line 97
  if (budgetId) await recalcBudgetTotals(budgetId);                            // line 98


// AFTER:
import { recalcBudgetLine } from "@/lib/recalc";

// ... inside POST handler ...

  // (lines 60-70 deleted entirely — budgets table no longer exists per A-3 / Q10c)

  const { data: inserted, error } = await supabase
    .from("budget_lines")
    .insert({
      job_id: body.job_id,
      // ... other fields ...
      // budget_id: REMOVED — column dropped in migration 00095.
      org_id: membership.org_id,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) throw new ApiError(error.message, 500);

  // Trigger a recalc so committed/invoiced stay at 0 (noop but idempotent).
  await recalcBudgetLine((inserted as { id: string }).id);
  // (job-level budget total is computed on read; no stored aggregate to update)
```

**Verify:** `grep -n "budgets\|budget_id\|recalcBudgetTotals" src/app/api/budget-lines/route.ts` returns 0 matches post-edit.

### Task 5 — Refactor `src/app/api/budget-lines/[id]/route.ts` (PATCH + DELETE)

**Path:** `src/app/api/budget-lines/[id]/route.ts`

**This file was MISSED in the original brief.** It has two `recalcBudgetTotals` callsites (lines 62 and 122) and reads `budget_id` from `budget_lines` (line 33 select + lines 61, 109).

**Current state:**
- Line 7: imports `recalcBudgetTotals`.
- Line 33: `.select("id, budget_id, original_estimate")` in PATCH read.
- Lines 61-63: conditional `recalcBudgetTotals` call after PATCH (if `before.budget_id`).
- Line 109: `.select("budget_id")` in DELETE read.
- Lines 121-125: conditional `recalcBudgetTotals` call after DELETE (if `before.budget_id`).

**Action:**

1. **Remove `recalcBudgetTotals` from the import** (line 7): change to `import { recalcBudgetLine } from "@/lib/recalc";`
2. **In PATCH:** tighten the `.select(...)` (line 33) from `"id, budget_id, original_estimate"` to `"id, original_estimate"`. Delete lines 61-63 (the `if (before.budget_id) await recalcBudgetTotals(...)` block).
3. **In DELETE:** delete the `before` row read at lines 107-112 entirely (no longer needed — only used for `budget_id`). Delete lines 121-125 (the conditional `recalcBudgetTotals` call).

**Diff preview (PATCH block):**

```typescript
// BEFORE (lines 7, 31-37, 60-63):
import { recalcBudgetLine, recalcBudgetTotals } from "@/lib/recalc";          // line 7

// ... inside PATCH handler ...
    const { data: before } = await supabase                                    // line 31
      .from("budget_lines")
      .select("id, budget_id, original_estimate")                              // line 33
      .eq("id", params.id)
      .eq("org_id", membership.org_id)
      .is("deleted_at", null)
      .single();
    if (!before) throw new ApiError("Budget line not found", 404);

// ... after update ...

    await recalcBudgetLine(params.id);                                          // line 60
    if ((before as { budget_id?: string | null }).budget_id) {                  // line 61
      await recalcBudgetTotals((before as { budget_id: string }).budget_id);    // line 62
    }                                                                            // line 63


// AFTER:
import { recalcBudgetLine } from "@/lib/recalc";

// ... inside PATCH handler ...
    const { data: before } = await supabase
      .from("budget_lines")
      .select("id, original_estimate")
      .eq("id", params.id)
      .eq("org_id", membership.org_id)
      .is("deleted_at", null)
      .single();
    if (!before) throw new ApiError("Budget line not found", 404);

// ... after update ...

    await recalcBudgetLine(params.id);
    // (job-level budget total is computed on read; no stored aggregate to update)
```

**Diff preview (DELETE block):**

```typescript
// BEFORE (lines 107-125):
    const { data: before } = await supabase                                    // line 107
      .from("budget_lines")
      .select("budget_id")                                                      // line 109
      .eq("id", params.id)
      .eq("org_id", membership.org_id)
      .single();

    const { error } = await supabase                                            // line 114
      .from("budget_lines")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", params.id)
      .eq("org_id", membership.org_id);
    if (error) throw new ApiError(error.message, 500);

    if ((before as { budget_id?: string | null } | null)?.budget_id) {          // line 121
      await recalcBudgetTotals(                                                  // line 122
        (before as { budget_id: string }).budget_id                              // line 123
      );                                                                          // line 124
    }                                                                              // line 125


// AFTER:
    const { error } = await supabase
      .from("budget_lines")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", params.id)
      .eq("org_id", membership.org_id);
    if (error) throw new ApiError(error.message, 500);
    // (job-level budget total is computed on read; no stored aggregate to update)
```

**Verify:** `grep -n "budget_id\|recalcBudgetTotals\|budgets" src/app/api/budget-lines/[id]/route.ts` returns 0 matches post-edit.

### Task 6 — Narrow TS union in `src/lib/activity-log.ts`

**Path:** `src/lib/activity-log.ts`

**Current state:** Line 26 contains `| "budget"` in the `ActivityEntityType` union.

**Action:** Remove line 26 entirely.

**Diff preview:**

```typescript
// BEFORE (lines 20-31):
export type ActivityEntityType =
  | "invoice"
  | "invoice_import_batch"
  | "purchase_order"
  | "change_order"
  | "budget_line"
  | "budget"               // line 26 — REMOVE
  | "job"
  | "vendor"
  | "cost_code"
  | "draw"
  | "user";


// AFTER:
export type ActivityEntityType =
  | "invoice"
  | "invoice_import_batch"
  | "purchase_order"
  | "change_order"
  | "budget_line"
  | "job"
  | "vendor"
  | "cost_code"
  | "draw"
  | "user";
```

**Note re: legacy activity_log rows.** The DB column `activity_log.entity_type` is TEXT (not a Postgres ENUM). Existing rows (if any) with `entity_type='budget'` remain in the DB; they are simply no longer addressable from TS code that writes new rows. Reads via raw SQL or via `audit/action-labels.ts` mapping would still surface them. Per acceptance criterion #4: non-breaking.

**Verify:** `grep -c '"budget"' src/lib/activity-log.ts` returns `0`. `npx tsc --noEmit` shows no errors (since `'budget'` was only referenced in this union — no other src file passes `"budget"` as an `entity_type` arg, confirmed by audit grep on `logActivity({ ... entity_type: "budget"`).

**Pre-verification grep before executor proceeds:**

```bash
# This command MUST return 0 hits before A-3 lands. If any are found, halt and
# refactor the call site too.
grep -rn 'entity_type:\s*"budget"' src/ supabase/
```

### Task 7 — Update CLAUDE.md Data Model section

**Path:** `CLAUDE.md`

**Current state:** Lines 153-167 contain the `### budget_lines` entry with computed-fields note. No `### budgets` entry exists (confirmed by grep). The brief's guidance was correct.

**Action:** Insert a brief clarifying sentence under the `### budget_lines` entry's computed-fields block. **Do NOT add a `### budgets` entry** — it never existed and Q10c is explicit that none should be added.

**Diff preview:**

```markdown
<!-- BEFORE (lines 153-167): -->

### budget_lines
One per cost code per job. This is what shows on the G703.
```
id, job_id, cost_code_id,
original_estimate (cents), revised_estimate (cents — original + approved COs),
org_id, created_at, updated_at, deleted_at
```

**Computed fields (never stored, always calculated):**
- `previous_applications` = sum of invoices in prior draws
- `this_period` = sum of invoices in current draw
- `total_to_date` = previous + this_period
- `percent_complete` = total_to_date / revised_estimate
- `balance_to_finish` = revised_estimate - total_to_date


<!-- AFTER: -->

### budget_lines
One per cost code per job. This is what shows on the G703.
```
id, job_id, cost_code_id,
original_estimate (cents), revised_estimate (cents — original + approved COs),
org_id, created_at, updated_at, deleted_at
```

**No `budgets` parent table.** Budgets are derived from line items + change orders, not stored as entities. The job-level budget total is `SUM(budget_lines.revised_estimate)` for the job — computed on read, never stored. Budget versioning intent is encoded by `original_estimate` (the locked baseline) + `revised_estimate` (baseline + approved CO adjustments). Per Q10c (F1 umbrella EXPANDED-SCOPE) the scaffolded `budgets` table was dropped in migration 00095 — re-adding a versioning entity later requires re-litigating this decision.

**Computed fields (never stored, always calculated):**
- `previous_applications` = sum of invoices in prior draws
- `this_period` = sum of invoices in current draw
- `total_to_date` = previous + this_period
- `percent_complete` = total_to_date / revised_estimate
- `balance_to_finish` = revised_estimate - total_to_date
```

**Verify:** `grep -n "budgets" CLAUDE.md` returns only:
- The new "No `budgets` parent table" note added above.
- The pre-existing copy-text matches (deployment description, philosophy/UI text — those are word-sense uses, unaffected).

No `### budgets` heading exists post-edit (and never did).

---

## Acceptance criteria (verbatim from Wave-A EXPANDED-SCOPE.md §Plan A-3)

1. **Migration 00095 applied:** `DROP TABLE budgets CASCADE`. `budget_lines.budget_id` column dropped (or set to nullable with no consumers, depending on FK ON DELETE behavior — plan-phase to decide cleanest path). **— Plan decision: column dropped explicitly (Option B per §Migration design rationale).**
2. **`src/lib/recalc.ts:253` refactored** — no `budgets.total_amount` update. Canonical total derived from `SUM(budget_lines.revised_estimate)` on read. **— Plan delivers via Task 3 (deletes the entire `recalcBudgetTotals` function and adds a documentation comment about derived-on-read semantics).**
3. **`src/app/api/budget-lines/route.ts:60-70` refactored** — no budget lookup; `budget_id` not set. **— Plan delivers via Task 4.**
4. **`src/lib/activity-log.ts:26` updated** — `'budget'` removed from `ActivityEntityType` union. Existing activity_log rows with `entity_type='budget'` (if any) remain as legacy text — non-breaking. **— Plan delivers via Task 6.**
5. **CLAUDE.md "Data Model" / Architecture Rules section** documents the derived-from-line-items + change-orders pattern. **— Plan delivers via Task 7.**
6. **`npm run build` + harness Layer 1 + Drummond gate green.** **— Verified via §Verification commands below.**

**Plan extension over criteria (justification):** `src/app/api/budget-lines/[id]/route.ts` is also refactored (Task 5). This file was missed by the original brief but contains two `recalcBudgetTotals` callsites that would otherwise break `npm run build` after Task 3 deletes the function. The change is in-scope per acceptance criterion #6 (build must pass) and per Q10c spirit (drop the budgets concept entirely from the code surface).

---

## Verification commands

Run all in repo root after executor completes the 7 tasks above.

```bash
# 1. TypeScript clean.
npm run typecheck
# Expect: 0 errors. If `recalcBudgetTotals` import or callsite leaked, here.

# 2. Build clean.
npm run build
# Expect: success. Verifies type narrowing on activity_log holds.

# 3. Migration applies cleanly on a fresh dev db.
supabase db reset --linked   # if running against shared dev project
# OR: npx supabase migration up --linked
# Expect: 00095 applies; \dt shows no public.budgets; \d budget_lines shows no budget_id column.

# 4. No residual code refs to `budgets` table or `budget_id` column.
grep -rn '\.from("budgets"\|\.from(\x27budgets\x27\|budget_id\|recalcBudgetTotals' src/
# Expect: 0 hits. Comments referencing the rationale are fine; runtime refs are not.

# 5. No residual TS union member.
grep -n '"budget"' src/lib/activity-log.ts
# Expect: 0 hits.

# 6. No call site passes "budget" as entity_type.
grep -rn 'entity_type:\s*"budget"' src/ supabase/
# Expect: 0 hits.

# 7. Harness Layer 1 (DB integrity + RLS) — see .planning/architecture/VERIFICATION-PIPELINE.md.
npm run harness:layer-1
# Expect: PASS. Specifically — no advisor flag re: orphan FK on budget_lines.

# 8. Harness Layer 2 (mechanical / API) — Drummond gate.
npm run harness:drummond-gate
# Expect: full Drummond scenario passes (vendor → PO → invoice → approve → draw
# → G702/G703 → lien release → paid). The budgets drop does NOT touch any
# Drummond-walk surface because budgets was never populated.

# 9. Spot-check: budget-line CRUD still works.
#    POST /api/budget-lines       → 200 with { id }
#    PATCH /api/budget-lines/:id  → 200 with { ok: true }
#    DELETE /api/budget-lines/:id → 200 with { ok: true } (if no blockers)
# Run from a logged-in admin/owner session against dev.
```

---

## Dependencies

- **After A-1** (migration `00094_*.sql`) lands — migration numbering only; no FK/data dependency between the two plans.
- **Before A-4** (migration `00096_invoice_allocations_org_id.sql`) — migration numbering only.
- **Schema-independent from A-1, A-2, A-4** per Wave-A EXPANDED-SCOPE §Sequencing. May be authored in parallel; must be applied sequentially because of migration sequence numbers.
- **Independent of Wave-B work.** A-3 must complete before Wave-B Plan B-1 (Clients entity) lands per umbrella §Dependencies between Plans line 439: "A-1 (drop budgets) before B-1 (Clients) — both touch `budget_lines` references". *(Umbrella draft maps "A-1" to drop-budgets; Wave-A EXPANDED-SCOPE renumbers to A-3. Same dependency, different label.)*

---

## Rollback strategy

### Quick rollback (PR not yet merged)

`git revert <commit-sha>` on the executor's commits. No DB state to recover — migration not yet applied.

### Mid-flight rollback (migration applied; PR not yet shipped)

```bash
# Reverse the migration.
psql "$DATABASE_URL" -f supabase/migrations/00095_drop_budgets.down.sql

# Revert the src commits.
git revert <recalc-commit> <budget-lines-commits> <activity-log-commit> <claude-md-commit>

# Verify schema restored.
psql "$DATABASE_URL" -c "\dt public.budgets"   # → present
psql "$DATABASE_URL" -c "\d public.budget_lines" | grep budget_id   # → present

# Rebuild + harness.
npm run build && npm run harness:layer-1
```

### Post-ship rollback (PR merged, deployed to production)

Same as mid-flight, but coordinate via Jake. The `.down.sql` restores SCHEMA only; no data was ever in `budgets` so there is no data-loss concern. Per CLAUDE.md "Never kill running processes" rule — wait for active requests to drain before flipping the migration.

**The most likely rollback trigger** is a downstream UI/API consumer that we missed during planning. The pre-commit grep gate at step (4) of §Verification commands is the first line of defense. The Drummond gate at step (8) is the second.

---

## Risk register

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| A3-R1 | An additional src consumer of `budgets` table or `budget_id` column exists that grep missed (e.g. dynamic SQL, raw `.rpc()` call, file with non-standard quoting). | Low | Medium (build fail) | Step (4) of §Verification commands greps comprehensively. Pre-merge typecheck catches missed callsites of `recalcBudgetTotals`. |
| A3-R2 | A production `activity_log` row with `entity_type='budget'` exists, and a downstream surface (e.g. audit timeline UI) renders it via a switch that asserts on `ActivityEntityType`. | Low | Low (UI degradation, not data loss) | Audit-log rendering in `src/lib/audit/action-labels.ts` uses a default fallback per CLAUDE.md §Stage 1.5c IA additions; legacy text values are tolerated. **Cross-check during execution:** grep `src/lib/audit/` for explicit narrowing on `ActivityEntityType` and add a fallback case if missing. |
| A3-R3 | `npm run build` passes but a runtime test that exercises POST /api/budget-lines fails because the row insert now lacks a column the DB expects. | Very Low | Medium (API regression) | Step 1 of migration drops the `budget_id` column itself, so the DB schema and the TS insert payload stay synchronized. Step (9) of §Verification commands exercises the CRUD flow on dev. |
| A3-R4 | `.down.sql` overshoots when applied on a pre-00049 environment (creates `budgets_platform_admin_read` policy that environment didn't have). | Very Low | Negligible | All Nightwork environments (prod + preview + dev) are well past 00049. The .down.sql header documents this assumption. If a future cold-start uses migrations in order, the .down would only run AFTER the corresponding .up, by which point 00049 has already shipped. |
| A3-R5 | A future Wave-B plan (e.g. B-7 knowledge-graph scaffold) re-adds a budgets concept under a different name (e.g. `budget_versions`), creating semantic regression. | Low | Low (Wave-B concern) | The CLAUDE.md note documents Q10c as the canonical decision — Wave-B must re-litigate at expansion time to undo it. |
| A3-R6 | RLS regression: dropping policies on `budgets` somehow affects sibling policies on `budget_lines` via shared statements. | Negligible | N/A | The RLS policies in 00027 + 00043 + 00049 are scoped per-table via `ON public.budgets` clauses; no shared statements. Harness Layer 1 RLS-coverage check verifies post-migration that `budget_lines` policies still enforce org boundary. |

---

## Open questions

> Surfaced for plan-review. Each carries a default resolution that the
> executor is authorized to apply unless plan-review overrides.

**OPEN-QUESTION-1 — `.down.sql` faithfulness vs. parallel-environment risk.**

The `.down.sql` consolidates the cumulative end-state of `budgets`-related DDL from 3 forward-only migrations (00027 + 00043 + 00049). If a non-standard environment exists that applied 00027 but not 00043 or 00049, the `.down` would overshoot. **Default resolution:** ship as written (Risk A3-R4 — Very Low / Negligible). The Wave-A QA reviewer `nightwork-data-migration-safety` should sanity-check on a fresh dev reset.

**OPEN-QUESTION-2 — Should we drop `budget_lines.invoiced`, `budget_lines.co_adjustments`, `budget_lines.committed` per CLAUDE.md "Never store computed values"?**

Migration 00027 added these three "running totals" columns on `budget_lines` (lines 73-79). They are explicitly maintained by the `recalc.ts` engine — clearly stored aggregates. But:

- CLAUDE.md "Never store computed values" carries an explicit exception: "trigger-maintained caches are permitted when read-time recompute would be prohibitively expensive."
- `budget_lines.invoiced` is trigger-maintained by `trg_invoice_line_items_budget_sync` + `trg_invoices_status_budget_sync` (00027:156-185).
- `budget_lines.committed` and `budget_lines.co_adjustments` are app-layer-maintained by `recalc.ts` (NOT trigger-backed).

The app-layer-maintained columns violate the cache-trigger rule. **However:** dropping them is OUT OF SCOPE for A-3. A-3's mandate is the `budgets` table. The stored-aggregates audit on `budget_lines` is a separate decision and likely belongs to Wave-B or Wave-C.

**Default resolution:** Note this as a flagged-follow-up in the A-3 SUMMARY but do NOT touch `budget_lines.invoiced/committed/co_adjustments` in this plan. Surface to Jake at GATE-A halt.

**OPEN-QUESTION-3 — Should `src/lib/audit/action-labels.ts` get a defensive case for legacy `entity_type='budget'` rows?**

If activity_log has historical rows with `entity_type='budget'` (unverified — Supabase MCP unavailable in agent session), and the audit timeline UI uses a switch-on-entity-type without a default case, those rows would render as unknown. **Default resolution:** during executor task 6, grep `src/lib/audit/action-labels.ts` for narrowing on `ActivityEntityType`. If a switch exists, add a fallback `default: return entity_type` case. If no switch, no action.

**OPEN-QUESTION-4 — 0-row verification.**

The brief instructed: "Verify via Supabase MCP (if available) that `budgets` table is truly at 0 rows before authoring the DROP." Supabase MCP tools are not callable from this agent session (only Read/Write/Bash/Grep/Glob/WebFetch are exposed). 0-row state is cited from:
- `.planning/audits/2026-05-12-migration-inventory.md` §Section 3 (line 174): `budgets | 0 rows`.
- `.planning/audits/2026-05-12-migration-inventory.md` §Section 4 task 4 (line 378): `SELECT count(*) FROM budgets → 0 rows`.

**Default resolution:** executor MUST re-verify via `psql -c "SELECT count(*) FROM budgets"` or equivalent IMMEDIATELY before applying migration 00095. If count > 0, HALT and surface to Jake — Wave-A scope assumed 0 rows; any rows present represent unexpected state and require a data-handling decision (archive / migrate / discard) outside this plan.

---

## Verification by reviewer agents (Wave-A QA scope)

Per Wave-A EXPANDED-SCOPE.md §Wave-A QA scope, the following reviewers should validate A-3 post-execution:

- **nightwork-spec-checker** — verifies all 6 acceptance criteria met; flags the Task 5 expansion (covered in §Plan extension over criteria).
- **database-reviewer** — verifies migration 00095 is clean: no orphan FK, no advisor regression, indexes properly dropped.
- **nightwork-data-migration-safety** — verifies forward + backward idempotent; verifies 0-row state held; validates .down.sql fidelity vs. parallel-environment risk (OPEN-QUESTION-1).
- **nightwork-ai-logic-tester** — verifies the derived-total semantics (SUM-on-read) survive in any UI/API surface that previously consumed `budgets.total_amount` (none surfaced in planning, but recheck during execution).
- **nightwork-custodian** — sweeps for `.planning/` drift from A-3 (e.g., ENTITY-INVENTORY.md should not list `budgets` post-merge; CLAUDE.md updated correctly).

---

## Notes for executor

1. **Migration ordering.** Even though A-3 is authored independently of A-1, A-2, A-4, the executor MUST apply 00094 (A-1) before 00095 (A-3) per migration numbering. If running locally and starting from a non-clean DB, `supabase migration up` enforces ordering automatically.
2. **Pre-flight check.** Run `grep -rn '\.from("budgets"\|recalcBudgetTotals' src/` BEFORE editing — confirm the 5 callsites (1 in recalc.ts, 2 in budget-lines/route.ts, 2 in budget-lines/[id]/route.ts). If grep returns more or fewer, halt and re-audit.
3. **Single PR.** Author the SQL migration + 4 src-file edits + 1 doc update as a single PR. Do not split into multiple PRs — the typecheck only passes after all 5 edits land together.
4. **Commit message structure.** Use one commit per logical change:
   - `feat(A-3): migration 00095 drop budgets table`
   - `refactor(A-3): remove recalcBudgetTotals from recalc.ts`
   - `refactor(A-3): remove budgets lookup from budget-lines POST`
   - `refactor(A-3): remove recalcBudgetTotals from budget-lines [id] route`
   - `refactor(A-3): narrow ActivityEntityType union — remove 'budget'`
   - `docs(A-3): CLAUDE.md — document derived budget total pattern`
   This sequencing keeps `git bisect` useful if a later regression traces back to A-3.
5. **Post-merge audit-log spot check.** After deploy, query `SELECT count(*) FROM activity_log WHERE entity_type = 'budget'` once. Document the count in OVERNIGHT-LOG.md. (Non-blocking; informational.)
6. **Sentry / log monitoring.** Tail Sentry for the 24h post-deploy for any caller invoking `/api/budget-lines` (POST or PATCH or DELETE) — the refactor should be invisible to consumers, but the change touches 3 routes.

---

*Authored by gsd-planner per nwrp113 Wave-A autonomous-execution envelope. Awaiting plan-review halt before executor dispatch.*
