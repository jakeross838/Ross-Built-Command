# PART — Per-Job Wiring phase results (W-1..7 per nwrp282)

**Date:** 2026-06-12 · **Spend:** ~$38-44 of $55 (+ brief ~$3 of $5) · **Deploy:** `dpl_GUonZ7AGGTw3CHp6s4XRBscErYGu` (cache-skip ✓, domain-ID ✓, anon-curl sweep ✓).
**Verdict: all seven W-items land. FULL TEST SUITE GREEN — "all test files passed" — first time on record. Scope guard never triggered. Zero fixture mutations needed (read-surface wiring). One inline LOW fix used (of 2).**

| W | Result |
|---|---|
| W-7 (FIRST) | GH#18 adjudicated REAL (limit-without-order on org_members in `verification/auth-strategy.ts`) — fixed with the guard's own prescription (`.order('created_at')` before `.limit(1)`); inline LOW fix #1. Suite member 4/4. |
| W-1 budget | Real `BudgetView` mount: server component, org+job-scoped lines/invoices/cost-codes/latest-draw/approved-COs via `_shims.ts` (E-3/F10 fixture-shape pattern, stored values, canonical CO statuses per 00060). Zero-line jobs (Drummond) render an honest empty state. Fish inputs = the GTV anchors (144 lines / 45 invoices / draw #1 / 72 COs). |
| W-2 bills | Job-filtered table on the P7 pattern → links to `/financials/bills/[id]`; full status-badge map; empty state. |
| W-3 pay-apps | Job-filtered draw table → links to F10 detail; display numbers honor `starting_application_number` (item-8 boundary isolated to one expression); "Current Due (at creation)" labeled honestly per D3. |
| W-4 activity | Per-job feed via the entity-universe linkage (job + invoices + draws + COs + POs → `activity_log.entity_id IN`), `auditLabel` summaries, profile-resolved actors. Fish: 16 rows live. |
| W-5 | "+ New Change Order" hidden unless admin/owner (F2D-2 closed at the affordance layer; both enforcement layers already denied PMs). |
| W-6 | CO page's local grid de-duped to "Pending / Draft COs" only (the bar carries the contract triple — the GTV "two summary rows" closes). Other 7 bar pages audited: no overlap grids. New pages born clean. |

**Guard catches during build (working-as-designed, not findings):** the status-enum fence caught a fixture-era `executed` reference in W-1's new query (corrected to the canonical set pre-commit) — the 00060 guard doing exactly its job on new code.

**Auto-proceed audit (nwrp282 condition 3):** inline LOW fixes used **1 of 2** (W-7). MEDIUM/HIGH findings: **none new**. Cleanup failures: **n/a — no mutations**. Scope guard: **never triggered** (zero new tables/RPCs/schema). Ceiling: ~$41-47 total vs $60 combined caps.

**Companion deliverables this phase:** L8 filed (DB-side grep-invisibility, lessons.md) · ITEM-8-ADJUDICATION-BRIEF.md parked for Jake's Diane sitting.
