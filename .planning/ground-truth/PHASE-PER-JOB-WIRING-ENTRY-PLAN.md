# Per-Job Wiring Phase — entry plan (surfaced per nwrp281 §E; NOT begun)

**Date:** 2026-06-12 · **Sequencing authority:** nwrp281 §B stamp of NIGHTWORK-STATE-AND-LAUNCH-PATH §f (wiring before tiering-implementation; bootstrap/manual gates; nwrp233 preserved).
**Status: AWAITING JAKE AUTHORIZATION.**

## Scope (from TD-NW-PER-JOB-TAB-WIRING + GTV carry-ins)

| # | Deliverable | Shape |
|---|---|---|
| W-1 | `/jobs/[id]/budget` wired: org-scoped server fetch (budget_lines + invoices + cost_codes + draws + COs by job_id) mounting the existing `BudgetView` | the TD's documented swap path; data layers verified by 2C |
| W-2 | `/jobs/[id]/bills` wired: job-filtered invoice list on the org-wide pattern | P7-verified pattern, job_id filter |
| W-3 | `/jobs/[id]/pay-apps` wired: job-filtered draw list (F10 detail already live) | same |
| W-4 | `/jobs/[id]/activity` wired: activity_log feed by job entity linkage | Wave-1.1-Lite item pulled in per TD ship-together note |
| W-5 | F2D-2 affordance: "+ New Change Order" hidden-by-role for PMs (both layers deny) | one conditional |
| W-6 | Per-job header metric rationalization (the TD's folded disposition: de-dupe JobFinancialBar vs local stat grids across the 8 mounting pages) | PATTERNS.md-guided |
| W-7 | Inherited test-debt adjudication: `multi-org-session.test.ts` GH#18 guard (stash-verified pre-existing) — regression-vs-stale per the lien-guard playbook | first task, like 2E-1 |

**Explicitly OUT:** CO line-allocation backfill execution (gated on Jake's PART-2D stamp + operational data, checklist items 2-4), the `require_budget_allocation` flip (item 5 — after backfill), TD-NW-LIEN-CREATE (post-dogfood-start deadline), tiering-implementation (after this phase per the stamp).

## Verification standard (inherited from GTV)

Every wired surface: SQL cross-check of rendered numbers to the cent against source rows (2C-5 pattern) + chrome-renders-once (L6) + re-export resolution awareness (L7) + authed walk row for Jake on Fish (data-heavy) / Drummond (empty-state) per the canonical job-selection guidance. Build + full test suite green (modulo W-7's adjudication outcome). Force-cache-bust deploy + standing domain/cache checks + anon-curl sweep per run.

## Proposed ceiling + autonomy (mirroring the validated nwrp280/281 pattern)

- **Ceiling: $55** (4 wired surfaces ≈ 2C-scale each at LOW-tier bootstrap + W-5/6/7 small items; estimation lesson's lean-class ~at-estimate heuristic applies — these ride proven data layers).
- **Auto-proceed:** findings MEDIUM-or-below file with routing, don't halt; ≤2 inline LOW fixes ≤$3 riding existing patterns (fail-closed/403-gate/audit-append); render-vs-source mismatch >$0.00 on a wired surface = treat as the 2C cents-exact standard — fix-or-halt, not file.
- **HALT:** any HIGH (money math, cross-tenant, RLS, launch-spine); any cleanup/exact-return miss; ceiling approach; W-7 adjudicating a REAL regression (production fix = Jake's nod, lien-guard precedent).
- **Mutations:** none planned on RB rows (wiring is read-surface work); any fixture needs follow ZZ naming + exact-return.
- **Exit:** PART-WIRING.md (per-surface evidence + walk rows queued for Jake) + STATE.md refresh + dogfood-entry checklist mapped to the canonical doc's items 2-5.

**Awaiting authorization. On approval this phase starts the post-GTV critical path (canonical doc §e items 4-5).**
