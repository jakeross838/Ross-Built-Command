# F1-Wave-A — Cleanup + D-035 + Schema-shape Concerns — EXPANDED-SCOPE

**Status:** APPROVED 2026-05-12 (per nwrp113 Jake authorization)
**Phase name:** `stage-f1-knowledge-graph-auth-wave-a`
**Wave of:** F1 — Knowledge Graph + Auth Foundation (umbrella)
**Umbrella EXPANDED-SCOPE.md:** `.planning/expansions/stage-f1-knowledge-graph-auth-EXPANDED-SCOPE.md` (canonical Q1-Q12 + Q4b + Q10b + Q10c resolutions)
**Drift-check:** `.planning/drift-checks/2026-05-12-1700-f1-knowledge-graph-auth-expansion-init.md` (PASS)
**Migration audit:** `.planning/audits/2026-05-12-migration-inventory.md` (informs decomposition)
**Authorization:** nwrp113 — Wave-A plan authoring + autonomous execution; Wave-B deferred pending umbrella review.

---

## Stated scope (verbatim from nwrp113)

> Plans A-1..A-4 (+ optional A-5):
>
> A-1: D-035 cleanup migrations — Drop change_order_budget_lines (0 rows, 0 consumers — safe); Add lien_releases.status_history JSONB NOT NULL DEFAULT '[]'; Add jobs.status_history JSONB NOT NULL DEFAULT '[]' (audit R.7 bonus fix); Document status_history uniform rule in CLAUDE.md Architecture Rules.
>
> A-2: docx-html auth gate fix — 5-minute getCurrentMembership() gate per D-035 #3; Audit existing endpoint, add membership check, verify with harness Layer 1.
>
> A-3: budgets table drop + refactor (Q10c=A) — Migration: DROP TABLE budgets CASCADE; Refactor src/lib/recalc.ts:253 — remove budgets.total_amount update; Refactor src/app/api/budget-lines/route.ts:60-70 — remove budget lookup; Remove 'budget' from activity_log.entity_type TS union; Document derived-from-line-items + change-orders pattern.
>
> A-4: invoice_allocations org_id addition (Q10b=C) — ALTER TABLE invoice_allocations ADD COLUMN org_id UUID NOT NULL via backfill from invoices; Add composite index (org_id, invoice_id); DROP existing JOIN-based RLS policy, CREATE direct-filter policy; Comment-only update on support_messages migration file (document user-scoped pattern intent); Update CLAUDE.md Architecture Rules with org-scoped-vs-user-scoped-child codified rule.
>
> A-5 (optional): public.users retirement — Audit confirms 5 src files read public.users alongside profiles + org_members; Refactor those 5 files to read profiles + org_members exclusively; Drop public.users table after consumers cleared; Wait for Wave-A plan-review halt to decide whether to include OR defer to Wave-C.

---

## Plan list

| Plan | Migration | Code changes | Source decision |
|---|---|---|---|
| **A-1** D-035 cleanup migrations | 00094 (drop CCBL + add lien_releases.status_history + jobs.status_history) | PATCH + bulk routes for lien_releases / jobs to append status_history on transitions; CLAUDE.md uniform-rule documentation | D-035 #1 + D-035 #2 + Q12 + audit R.7 |
| **A-2** docx-html auth gate fix | none (code-only) | Add `getCurrentMembership()` gate to docx-html endpoint | D-035 #3 |
| **A-3** Drop budgets + refactor | 00095 (DROP TABLE budgets CASCADE) | `src/lib/recalc.ts:253` (remove budgets.total_amount update); `src/app/api/budget-lines/route.ts:60-70` (remove budget lookup); `src/lib/activity-log.ts:26` (remove 'budget' from union); CLAUDE.md doc derived-pattern | D-035 #4 + Q10c |
| **A-4** invoice_allocations org_id denormalize | 00096 (ALTER + backfill + RLS rewrite + composite index) | CLAUDE.md Architecture Rules codified rule; comment-only doc on `00051_support_chat.sql` re: user-scoped pattern intent | Q10b + audit concern #4 |
| **A-5 (optional)** public.users retirement | 00097 (DROP TABLE public.users) — only if absorbed | Refactor 5 src files reading public.users to use `profiles + org_members` exclusively | audit GAP item 20 |

A-5 absorption decision: at plan-review halt. Default = defer to Wave-C unless plan-review surfaces low blast.

---

## Sequencing + dependencies

- A-1, A-2, A-3, A-4 are **schema-independent** (different tables, different columns; no inter-plan FK dependencies). Can author in parallel; execute sequentially due to migration numbering (00094 → 00095 → 00096).
- A-1 should land first (smallest D-035 cleanup; establishes status_history pattern that future entities follow).
- A-2 is code-only (no migration sequence concern); can land any time after A-1.
- A-3 lands before A-4 (lower migration number; both independent).
- A-5 (if absorbed) lands LAST (migration 00097); allows D-30 RLS verification on the user table cleanup separately.

---

## Acceptance criteria (per plan)

### Plan A-1 acceptance
1. Migration 00094 applied: `change_order_budget_lines` table dropped; `lien_releases.status_history` JSONB NOT NULL DEFAULT '[]' added; `jobs.status_history` JSONB NOT NULL DEFAULT '[]' added.
2. PATCH + bulk routes for `lien_releases` and `jobs` append `{who, when, old_status, new_status, note}` to `status_history` on status transitions via `logStatusChange`-equivalent app-layer helper.
3. CLAUDE.md Architecture Rules section documents the uniform status_history rule (Q12 codification).
4. `npm run build` + harness Layer 1 + Drummond gate all green post-merge.
5. Activity log unchanged in this plan (extension to lien_releases/proposals/clients/client_portal_access entity_type is Wave-B Plan B-4 — out of scope here).

### Plan A-2 acceptance
1. docx-html endpoint identified via grep for current handler.
2. `getCurrentMembership()` gate added; missing membership → 401 unauthorized.
3. No regression in legitimate-membership case (existing docx-html generation continues).
4. Harness Layer 1 covers the endpoint behavior (authorized + unauthorized cases).
5. `npm run build` + Drummond gate green.

### Plan A-3 acceptance
1. Migration 00095 applied: `DROP TABLE budgets CASCADE`. `budget_lines.budget_id` column dropped (or set to nullable with no consumers, depending on FK ON DELETE behavior — plan-phase to decide cleanest path).
2. `src/lib/recalc.ts:253` refactored — no `budgets.total_amount` update. Canonical total derived from `SUM(budget_lines.revised_estimate)` on read.
3. `src/app/api/budget-lines/route.ts:60-70` refactored — no budget lookup; `budget_id` not set.
4. `src/lib/activity-log.ts:26` updated — `'budget'` removed from `ActivityEntityType` union. Existing activity_log rows with `entity_type='budget'` (if any) remain as legacy text — non-breaking.
5. CLAUDE.md "Data Model" / Architecture Rules section documents the derived-from-line-items + change-orders pattern.
6. `npm run build` + harness Layer 1 + Drummond gate green.

### Plan A-4 acceptance
1. Migration 00096 applied: `invoice_allocations.org_id UUID NOT NULL` added via backfill from `invoices.org_id`. Composite index `(org_id, invoice_id)` added.
2. Existing JOIN-based RLS policies on `invoice_allocations` dropped; direct-filter policies on `org_id = app_private.user_org_id()` created. RESTRICTIVE org-isolation policy updated to direct-filter.
3. Regression test verifies tenant boundary still enforced (RLS policy still rejects cross-tenant reads).
4. Comment-only doc update on `supabase/migrations/00051_support_chat.sql` — note that `support_messages` user-scoped pattern is intentional per Q10b codified rule.
5. CLAUDE.md Architecture Rules adds the Q10b codified rule with examples.
6. `npm run build` + harness Layer 1 + Drummond gate green.

### Plan A-5 acceptance (only if absorbed)
1. 5 src files identified by audit refactored to read `profiles + org_members` exclusively, NOT `public.users`.
2. Migration 00097 applied: `DROP TABLE public.users` (with CASCADE to any remaining FK references; verify no orphans).
3. Test coverage verifies UI surfaces still render correct user info post-refactor.
4. `npm run build` + harness Layer 1 + Drummond gate green.

---

## Wave-A QA scope (post-execution)

Run `/nightwork-qa` equivalent or spawn reviewer agents in parallel:
- `nightwork-spec-checker` — verifies each plan delivered against its acceptance criteria
- `nightwork-custodian` — sweeps for `.planning/` drift; surfaces archival candidates if any
- `security-reviewer` — verifies no auth regressions from A-2 (docx-html gate) or A-4 (RLS rewrite)
- `nightwork-rls-auditor` — verifies invoice_allocations RLS still enforces org boundary post-A-4
- `database-reviewer` — verifies all 4 migrations are clean (no missing indexes, no leftover orphans, no advisor regressions)
- `nightwork-data-migration-safety` — verifies migrations are backwards-compatible / rollback-safe / preserve data integrity
- `nightwork-ai-logic-tester` — applicable for A-3 derived-total logic (recalc.ts) and A-4 RLS direct-filter regression
- Harness Layer 1+2+3 must remain at PASS=151 / FAIL=0 baseline (or improve)

---

## GATE-A halt definition

After Wave-A Plans A-1..A-4 (+ optional A-5) executed + QA passes:

1. Write structured ship summary to OVERNIGHT-LOG.md
2. Surface to Jake:
   - Wave-A commit SHAs + harness state
   - Plan-review findings (iter-1 + iter-2 if any)
   - A-5 absorption decision (absorbed vs deferred to Wave-C)
   - D-035 first-day tasks status (1-5; all should be DONE post-Wave-A except #5 which remains Wave-B)
   - Recommendation on Wave-B dispatch timing
3. HALT for Jake authorization before any Wave-B work

---

## Umbrella scope-drift items deferred to Wave-B/Wave-C (per iter-1 plan-review finding)

The umbrella EXPANDED-SCOPE.md §"Recommended Plan decomposition" Wave-A scope text included three additional cleanup items not present in this Wave-A spec or in Plans A-1..A-4:
- **Function `search_path` sweep** (8 flagged functions per audit Section 5)
- **REVOKE EXECUTE from anon** on 4× `pricing_history` trigger functions + 3× `create_default_*` auto-seed functions
- **Move `pg_trgm` + `vector` extensions out of `public` schema** (advisor recommendation)

**Resolution (iter-1 architect H-1, downgraded to MEDIUM):** Defer these to Wave-B (recommended Plan B-8 or a dedicated cleanup plan within Wave-B). Rationale: nwrp113's stated scope was the authoritative listing for Wave-A; including these here would expand Wave-A blast radius. They are low-blast cleanup items per audit, suitable for inclusion in Wave-B's foundational work or a follow-on Wave-C cleanup batch.

**No execute impact for Wave-A** — these items don't conflict with A-1..A-4 and can land separately whenever Wave-B begins.

---

## Out-of-scope (Wave-B+ deferred)

- Clients entity creation + jobs.client_id FK + Q2 A1 normalization (Wave-B Plan B-1)
- client_portal_access.client_id FK + Owner Portal Path A minimum UI (Wave-B Plan B-2)
- Soft-delete DB-trigger safety net + user-identity-threading (Wave-B Plan B-3 — Q6 F)
- activity_log entity_type TS union extension for new F1 entities (Wave-B Plan B-4)
- Magic-link primitive + email-in receiving primitive (Wave-B Plan B-5)
- Cost-code wipe-and-reseed per D-020 + fixture-maintenance contract codification (Wave-B Plan B-6)
- Knowledge-graph scaffold + database.types.ts generation pipeline (Wave-B Plan B-7 — Q11 D)
- RB org seed + Stripe sanity check + Q2 EXPLAIN ANALYZE + onAuthStateChange listener + harness extensions (Wave-B Plan B-8)

Any Wave-B work or deviation from Q1-Q12 + Q4b + Q10b + Q10c captured decisions → HALT per nwrp113 envelope.
