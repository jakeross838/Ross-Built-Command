# PART 2C — Budgets verification results

**Date:** 2026-06-11
**Authorization:** nwrp272 (2C as scoped in STAGE-2C-ENTRY-GATE.md, $25 ceiling, amended 2C-2).
**Spend:** ~$15-18 against $25.
**Verdict: 7 of 9 rows PASS outright; 2 rows split (SQL-side PASS, render-side pending Jake's walk). Zero BLOCKING findings. The immediate-halt clause never fired. Three dispositions routed to Jake (D1-D3 below).**

## Matrix results

| # | Test | Result |
|---|---|---|
| 2C-1 | Budget-line integrity sweep | **PASS** — 0 duplicate (job, cost_code) pairs, 0 orphaned cost-code FKs, 0 negative estimates, org-wide. 1 soft-deleted line exists (hygiene-normal). 0 non-zero `co_adjustments` (consistent with 2C-4). |
| 2C-2 | Trigger-cache mutation test (amended per nwrp272) | **PASS — exact at every gate.** Detail below. |
| 2C-3 | Contract identity (all active org jobs) | **PASS** — 0 jobs violate `original + approved_cos_total == current_contract_amount`. |
| 2C-4 | CO→budget-line propagation disposition | **ANSWERED — data-gap, not broken code.** Detail below → D1. |
| 2C-5 | Budget-health panel math | **PASS — exact reproduction** of walk P4 (144 lines / 1 over budget / 85 under-committed) from source rows. Plus a NEW allocation-coverage finding → D2. |
| 2C-6 | Aggregation indexes + plans | **PASS** — index coverage on every hot path (`idx_budget_lines_job/_job_cost/_org_id`, `idx_invoices_job_status/_draw_id/org_*`, `idx_draws_job_status/org_status`, `idx_activity_log_entity/org_created`, `idx_invoice_line_items_budget_line`). EXPLAIN ANALYZE on the overview budget query: seq scan at 288 total rows — planner-correct at this scale (0.18ms); indexes exist for growth. |
| 2C-7 | G703 chain identities | **SQL-side PASS:** `contract_sum_to_date = original + net_change_orders` holds on both stored draw rows; F10 loader maps `scheduled_value := revised_estimate` by construction; percent scale 0..1 verified at code level. **Render-side PENDING** Jake's walk checks e/f. |
| 2C-8 | Drummond empty-state | **SQL-side confirmed** — 0 budget_lines. **Walk PENDING.** |
| 2C-9 | Stored-vs-recomputed divergence | **DOCUMENTED** → D3. Fish stored `current_payment_due` = **−$224,906.77** (the F8 walk observation, confirmed at source). Dewberry stored $71,119.11 vs Σ draw invoices $71,180.22 (−$61.11). Both draws are `draft` with stored G702 columns frozen at creation-time math; the F10 detail/print recompute on read, so Jake's walk WILL show different (fresher) numbers than the list — expected, not a regression. |

## 2C-2 detail — scratch-CO mutation test (Dewberry, per nwrp272 amendment)

Scratch CO `d27b8531-ab9d-4024-a722-5c84c1b5208c`, pcco #18, title `ZZ-2C-TEST-DELETE-ME`, $100.00, `co_type='owner_requested'` (the post-00066 contract-raising default; the cache filter is `co_type <> 'internal'`, updated from `'owner'` in migration 00066).

| Step | approved_cos_total | current_contract_amount | Expected | Result |
|---|---|---|---|---|
| Pre-state | 390226 | 535507121 | — | recorded |
| INSERT draft | 390226 | 535507121 | unchanged (draft excluded) | **EXACT** |
| → approved | 400226 | 535517121 | +10000 both | **EXACT** |
| → void | 390226 | 535507121 | exact return | **EXACT — halt clause not triggered** |
| soft-delete | 390226 | 535507121 | still exact | **EXACT** |

The trigger (migration 00042 `app_private.refresh_approved_cos_total`) maintains BOTH columns — full recompute from source rows on every mutation, per recalculate-don't-increment.

Residue (documented, untouched): the scratch CO row (void + soft-deleted, unmistakable title) + 1 append-only `activity_log` row. **Boundary observation:** `status_history` stayed empty through two status transitions — it is APP-layer-written (Q12 posture), so direct-SQL mutations exercise only the DB-trigger layer. Expected architecture, not a defect; 2A's API-path tests will exercise the app-layer audit trail.

## Dispositions for Jake (D1-D3)

### D1 — CO→budget-line propagation: mechanism EXISTS, allocation data is EMPTY (entry-gate Q1)

The chain is fully built: `change_orders` status change → `trg_change_orders_status_sync` → `recompute_budget_line_co_adjustments(budget_line_id)` per linked `change_order_lines` row → `budget_lines.co_adjustments`. But **`change_order_lines` has 0 rows system-wide** — all 73 approved COs (Fish 72, Dewberry 1) were created/imported contract-level-only, with no line allocations. So `revised == original` on all 287 budget lines is the propagation mechanism correctly doing nothing with no inputs — **data-gap, not code-gap**. Consequences while it persists: G703 CO columns show zero per-line CO adjustment (G702 net_change_orders is correct at contract level), and budget-line over/under analysis ignores CO scope. **Recommendation:** require line allocation (or an explicit "unallocated" flag) in the CO approval workflow when that surface wires (F6 / TD-NW-PER-JOB-TAB-WIRING family); backfilling 72 Fish COs is operational data work, Jake/Andrew's call on timing.

### D2 — Invoice allocation coverage: $95,066.64 of approved Fish invoice value invisible to budget rollups (NEW)

`budget_lines.invoiced` is **exactly consistent with its own rule** (0/144 mismatches vs `recompute_budget_line_invoiced`: Σ `invoice_line_items.amount_cents` by `budget_line_id`, spent statuses). But **13 of the 45 spent-status Fish invoices have NO `invoice_line_items` allocations** — their dollars never reach any budget line. Σ spent invoices $177,571.34 vs Σ stored invoiced $82,504.70. Effects: budget-health `over_budget` likely understated; per-line G703 `this_period` attribution incomplete (draw-calc falls back to invoice-level cost_code_id where splits are missing, so the DRAW math degrades gracefully — the budget-line cache does not). Same family as D1: caches exact, allocations missing. **Recommendation:** 2A (invoice flow verification) adds an explicit check — does the approval path AUTHOR allocations? — and the 13 unallocated invoices get the same backfill-or-flag disposition as D1.

### D3 — Stored-vs-recomputed draw totals (entry-gate Q3 / F8 follow-on)

Stored G702 columns on both draft draws are creation-time snapshots; the canonical API and the F10 detail/print recompute on read. Fish's stored −$224,906.77 `current_payment_due` is the F8 number; the recomputed value Jake sees on the F10 detail will differ. **Recommendation:** the pay-apps LIST should either recompute (heavier) or render a "computed at draw creation — open for current math" affordance; smallest honest fix is a staleness marker on draft draws. Routes naturally with F6 pay-app engine scope.

## Q2 (entry-gate) — the contract under-coverage gap, investigated cold

Fish: Σ budget-line original $7,016,767.17 vs contract $7,496,667.17 → gap **$479,900.00**. Dewberry gap **$58,000.00**. Probed cold: the gap is not deposit-shaped (10% = $749,666.67) and not GC-fee-shaped (20% of lines = $1.4M). Composition is not derivable from the DB alone — likely fee/land/contingency held outside cost-coded lines, or an import artifact. **Open for Ross Built operational knowledge (Jake/Andrew) or import-source comparison; named, not blocking.**

## Carry-forwards to 2A

1. Smoke-login probe gate (nwrp266 §13) — 9 accounts confirmed-never-signed-in; one scripted login per role before 2A dispatch.
2. D2's allocation-authoring check folded into 2A's invoice-flow matrix.
3. App-layer audit-trail verification (status_history + activity_log on API-path status transitions) — the layer 2C-2 could not exercise via SQL.

## Walk-pending rows (fold into Jake's combined walk, checks e/f)

- 2C-7 render: Fish draw detail shows recomputed G702 totals + 144-row G703, percent column sane (0-100%), application number **#21**.
- 2C-8 render: Drummond budget surfaces render empty-state gracefully.
- 2C-9 visual: list value (−$224,906.77) vs detail recomputed value — difference EXPECTED per D3.
