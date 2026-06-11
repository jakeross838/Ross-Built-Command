# Stage 2C Entry Gate — Budgets verification scoping

**Date:** 2026-06-11
**Authorization chain:** nwrp266 §15-17 (revised order: 2C before 2A) + §33 (Step 4: produce this doc, surface for authorization) + nwrp271 §16 (sequence item 3).
**Ceiling:** $25 (per nwrp266 §33).
**Status: AWAITING JAKE AUTHORIZATION — 2C does not execute until this gate is approved.**

## Scope framing (locked per nwrp266 §17)

2C tests the **budget data layer + math, NOT per-job PM UX**. The per-job budget tab is an honest F1 placeholder (TD-NW-PER-JOB-TAB-WIRING; must ship before Diane dogfood). Budget math reaches users today through three wired surfaces: the job overview budget-health panel (walk P4), the org-wide jobs health API, and — as of F10 (commit `103743e`) — the Pay App detail + print G702/G703 recompute. Reasoning for 2C-before-2A: invoices post to budget lines as part of approval; a budget-math defect found later would contaminate 2A's interpretation.

## DB-says expectations (live state captured 2026-06-11)

| Metric | Fish Residence | Dewberry Residence |
|---|---|---|
| budget_lines (active) | 144 | 143 |
| Σ original_estimate | $7,016,767.17 | $5,293,168.95 |
| Σ revised_estimate | $7,016,767.17 (== original) | $5,293,168.95 (== original) |
| jobs.original_contract_amount | $7,496,667.17 | $5,351,168.95 |
| jobs.current_contract_amount | $8,393,810.56 | $5,355,071.21 |
| jobs.approved_cos_total (trigger cache) | $897,143.39 | $3,902.26 |
| Σ approved/executed COs total_with_fee (source rows) | $897,143.39 — **cache EXACT** | $3,902.26 — **cache EXACT** |
| original + approved_cos == current | **EXACT to the cent** | **EXACT to the cent** |
| Duplicate (job, cost_code) budget-line pairs | 0 | 0 |

**Invariants that HOLD at gate time** (2C re-verifies after any mutation test): `co_cache_trigger` consistency, contract-sum identity, cost-code uniqueness per job.

**Pre-loaded questions 2C must answer** (found while building this gate — these are the test targets, not gate blockers):

1. **CO → budget-line propagation is ZERO.** All 287 budget lines have `revised_estimate == original_estimate` despite 72 approved COs ($897K) on Fish and 1 ($3.9K) on Dewberry. CLAUDE.md's schema intent: `revised_estimate = original + approved CO adjustments`, and `budget_lines.co_adjustments` exists (the draw API reads it). Either (a) approved COs are SUPPOSED to allocate down to budget lines and the propagation is missing (cascade-audit-rule class gap), or (b) line-level allocation is intentionally deferred (CO amounts live only at contract level until F6 allocates). Outcome classes: design-gap / data-gap / intended-deferred — 2C determines which and routes the disposition; it does NOT fix.
2. **Budget-lines-sum vs contract gap:** Fish lines under-cover original contract by $479,900.00; Dewberry by $58,000.00. Is the gap a known unbudgeted bucket (fee? contingency? deposit?), an import artifact, or missing lines? DB-says the gap; 2C names it.
3. **Stored-vs-recomputed draw totals divergence (F8 follow-on):** the pay-apps LIST renders stored `draws.current_payment_due` (the walk's −$224K F8 observation); the F10 detail RECOMPUTES on read. The two can legitimately diverge when stored is stale. 2C documents the divergence class and whether the list should also recompute (or display a staleness marker).

## Test matrix

| # | Test | Method | Expected |
|---|---|---|---|
| 2C-1 | Budget-line integrity sweep: dup (job, cost_code) pairs, orphaned cost_code FKs, negative estimates, soft-delete hygiene | SQL | 0 / 0 / 0 / clean |
| 2C-2 | Trigger-cache consistency: `jobs.approved_cos_total` vs Σ source COs — BEFORE and AFTER a CO status mutation on a scratch CO (create → approve → void), per recalc-not-increment | SQL + API | exact at every step; void returns cache to prior value |
| 2C-3 | Contract identity: original + approved_cos_total == current_contract_amount across all active jobs | SQL | exact, all jobs |
| 2C-4 | CO→budget-line propagation disposition (pre-loaded Q1) | SQL + code-read of CO approval path (`src/app/api/**/change-orders` + triggers) | named outcome class + routing (TD / F6 / fix-now recommendation) |
| 2C-5 | Budget-health panel math vs DB (walk P4 claimed "144 lines, 1 over budget, 85 under-committed") | authed walk on Fish + SQL cross-check | panel numbers reproducible from source rows |
| 2C-6 | `/api/jobs/health` aggregation correctness + `EXPLAIN ANALYZE` on its queries (dashboard-503 history; every aggregation needs an index plan) | SQL | plans use indexes; no seq-scan on hot paths at current row counts |
| 2C-7 | G703 chain (F10 surface): scheduled_value == revised_estimate per line; Σ this_period == draw invoice allocations; percent scale 0..1 rendering; previous_applications_baseline + previous_co_completed_amount offsets honored (mid-project import jobs — Fish starts at App #21) | authed walk on Fish draw `b0277ee7` + SQL | line-level identity to the cent |
| 2C-8 | Empty-state branch: Drummond budget surfaces (0 budget_lines) | authed walk | graceful empty states, no errors |
| 2C-9 | Stored-vs-recomputed divergence (pre-loaded Q3): list stored totals vs detail recompute on both real draws | authed walk + SQL | divergence documented + disposition proposed |

Driver format: split-driver per F-Inv-1 rule 4 (navigator + DB-cross-checker). Jobs: Fish (data-heavy), Dewberry (second sample), Drummond (empty-state).

## Smoke-fixture login readiness (reported per nwrp266 §33; binding gate is 2A's)

| Account | Confirmed | Ever signed in | Role / org |
|---|---|---|---|
| harness-fixture@nightwork.local | ✓ | **✓ (proven)** | admin / fixture-harness-org |
| smoke-accounting, smoke-owner, smoke-pm-{alpha,beta,gamma,delta,epsilon,zeta,eta} (9 accounts) | ✓ all | **never** (last_sign_in_at null) | accounting / owner / pm — fixture-harness-org |

2C does **not** require smoke logins (SQL probes + Jake-authed walks on Ross Built jobs). The nwrp266 §13 provisioning gate binds **2A**: before 2A dispatch, one scripted login probe per smoke role (the SmokeAuthHelper primitive's first real use); failure → halt and re-authorize per nwrp266 §11-13. The harness-fixture account's proven sign-in is positive evidence the fixture org's auth path works; the 9 smoke accounts share its provisioning mechanism but remain UNPROVEN until probed.

## Halt conditions + exit criteria

- **Halt mid-2C** if: trigger-cache drift or contract-identity break found (BLOCKING-class — financial source-of-truth integrity); any mutation test (2C-2) leaves residue it can't clean up; ceiling approach per Rule 7.
- **Surface (not fix):** pre-loaded Q1/Q2/Q3 outcomes route to Jake for disposition — likely TD/F6 routing; 2C is verification, not build work (nwrp266 §19-21 separation).
- **Exit:** `PART-2C-BUDGETS.md` in `.planning/ground-truth/` with PASS/FAIL per matrix row, dispositions for Q1-Q3, and carry-forwards named for 2A. Walk rows follow the Stage 1.5 table format; (a)-CANDIDATE upgrades per F-Inv-1 rule 4 where runtime-confirmed.

**Awaiting authorization to execute 2C as scoped ($25 ceiling).**
