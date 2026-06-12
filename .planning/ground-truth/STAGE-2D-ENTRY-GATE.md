# Stage 2D Entry Gate — Purchase Orders + Change Orders verification (FULL gate)

**Date:** 2026-06-12
**Authorization chain:** nwrp266 §15 (revised order) + nwrp276 ("2D keeps full gate treatment — it's the gates-and-controls stage and F2A-1 just proved that territory has real holes").
**Proposed ceiling:** $30.
**Status: AWAITING JAKE AUTHORIZATION.**

## Scope framing

2D verifies the PO + CO workflows: lifecycle transitions, role/permission gates (the F2A-1 class), the CO trigger chain that has NEVER fired (TD-NW-CO-LINE-ALLOCATION Rule 10 flag), fee math, and PCCO numbering on the app path. This is where 2A's carry-forwards land: F2A-1-class probes on every PO/CO mutation route, N2's fee labeling, and the first-ever runtime fire of `recompute_budget_line_co_adjustments`.

## DB-says (2026-06-12)

| Fact | Value |
|---|---|
| RB purchase orders | **0** — the PO half is fixture-only territory (Fish P6 verified the empty state; lifecycle tests run entirely on fixture-org ZZ-2D rows) |
| RB change orders (active) | 73 (Fish 72 + Dewberry 1); cache exact per 2C-2/2C-3 |
| `change_order_lines` | **still 0 rows system-wide** — `recompute_budget_line_co_adjustments` has never executed |
| Fee signals (pending Jake's 15/20 answer) | stored 0.20 uniform ×15 jobs / CO rate 0.15 / G703 fee line ≈11% — N3 convention finding; 2D's fee-math rows execute against whichever answer lands |

## Test matrix

| # | Test | Method | Mutation? |
|---|---|---|---|
| 2D-1 | **Rule 10 flag (first trigger fire):** create ZZ-2D CO with ONE `change_order_lines` allocation on a ZZ budget line → approve → `budget_lines.co_adjustments` + revised math move exactly → void → exact return | fixture-org, app path where routes exist, SQL where not | fixture only |
| 2D-2 | CO app-path lifecycle: draft → pending → approved → void via the CO routes; status_history + activity_log per hop; trigger cache exact at every step (2C-2 standard, app-path this time) | flow driver | fixture only |
| 2D-3 | **F2A-1-class role probes on CO/PO routes:** can a PM approve their own CO? can accounting modify CO amounts post-approval? enumerate which mutations lack role gates (expect holes — that's the point) | flow driver, smoke roles | fixture only |
| 2D-4 | PO lifecycle: draft → issued → partially_invoiced → fully_invoiced → closed; po_balance/consumption math vs linked ZZ invoice | flow driver + SQL | fixture only |
| 2D-5 | Fee math: CO create computes gc_fee_amount = amount × rate, total_with_fee exact; rate sourcing (job default vs per-CO override) documented | flow driver + SQL | fixture only |
| 2D-6 | PCCO numbering on the APP path (2C confirmed the rule by code-read; 2D confirms create-route behavior incl. sequence continuation) | flow driver | fixture only |
| 2D-7 | N2 carry-forward: base-vs-with-fee display labeling across CO list / pay-app panel / G703 — enumerate each surface's choice, propose the label fix | code-read + Jake walk row |
| 2D-8 | Invoice→CO linkage: co_reference enforcement on CO-flagged invoice lines (the action route's hard block, observed 2A code-read) — drive it | flow driver | fixture only |

Mutation discipline: identical to 2A (fixture-org only, ZZ-2D naming, exact-return per cache, immediate halt on cleanup failure). Fixture prep: ZZ-2D cost code + budget line + PO + CO (the 2A revive/re-delete pattern).

Halt conditions: 2A's set verbatim + any 2D-1 trigger misfire (BLOCKING-class — the backfill plan depends on that trigger).

Exit: PART-2D-POS-COS.md — matrix, role-gate hole enumeration (feeds the F2A-1-class gates work), trigger-fire evidence (unblocks TD-NW-CO-LINE-ALLOCATION backfill), carry-forwards for 2E.
