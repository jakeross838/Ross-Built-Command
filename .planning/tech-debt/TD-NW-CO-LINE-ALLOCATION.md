# TD-NW-CO-LINE-ALLOCATION — CO line allocation authoring + Fish 72-CO backfill

**Origin:** Stage 2C budgets verification D1 (PART-2C-BUDGETS.md), accepted per nwrp273 §D1 (2026-06-11).
**Severity:** HIGH — bank-facing G703 defect class.
**Hard deadline (nwrp273 constraint):** BOTH workstreams complete **BEFORE the first real dogfood draw**:
1. **Allocation authoring** — the CO workflow (F6 / CO-workflow family) must author `change_order_lines` rows (or an explicit "unallocated" flag) when a CO is approved.
2. **Fish 72-CO backfill** — operational data work allocating the existing $897,143.39 of approved Fish COs to budget lines (Jake/Andrew source the line mapping).

## State (verified 2026-06-11)

The propagation mechanism is FULLY BUILT and has NEVER FIRED:

- `change_orders` status change → `trg_change_orders_status_sync` (migration 00028, amended 00042) → `recompute_budget_line_co_adjustments(budget_line_id)` per linked `change_order_lines` row → `budget_lines.co_adjustments` → revised-estimate math.
- **`change_order_lines` has 0 rows system-wide.** All 73 approved COs (Fish 72, Dewberry 1) are contract-level-only. `jobs.approved_cos_total` + `current_contract_amount` are correct (trigger cache verified exact in 2C-2); line-level scope is unallocated everywhere.

## Walk evidence (Jake, nwrp273 — why this is bank-facing, not cosmetic)

On the Fish Pay App #21 G703 (F10 detail/print, real data): lines render at **206.9% / 207.8% complete with negative balances-to-finish**, and C-suffix CO cost codes (13101C / 14101C / 25102C / 25103C) show **$0 scheduled value** — because $897K of approved COs live only in the G702 header (`net_change_orders`), never in line scheduled values. **The continuation sheet does not tie to the cover page.** A bank draws-reviewer reads that as a defective pay application.

Mechanism of the >100% lines: invoice line-items allocate real billings to base + C-suffix budget lines whose `revised_estimate` never received the CO scope; `total_to_date / scheduled_value` then exceeds 1.

## Rule 10 flag (per nwrp273)

`recompute_budget_line_co_adjustments` has **never executed against real data** (zero `change_order_lines` rows since inception). The first F6 allocation test MUST be a **runtime check of that trigger chain** — author one allocation row, approve the CO, verify `budget_lines.co_adjustments` + revised math move correctly — before bulk backfill. Do not infer correctness from the migration text (the Wave-C anti-pattern).

## D2 companion workstream (added per nwrp276 §9 — ORDERING IS LOAD-BEARING)

The invoice-side allocation gap (PART-2C D2 + PART-2A F2A-3) resolves operationally in TWO ORDERED STEPS:

1. **Backfill FIRST:** author `invoice_line_items` allocations for the 13 unallocated spent invoices (IDs tabled in PART-2C) + resolve the 4 uncoded-draw scope rows (Q2) + this TD's 72-CO backfill. Operational data work, Jake/Andrew source the mappings.
2. **Flip SECOND:** set `require_budget_allocation = TRUE` on the ross-built org row (manual, one UPDATE). Flipping before the backfill would 422-block Diane's live approval work on invoices that predate allocation authoring.

Both steps complete **before Diane dogfood** (same deadline as the parent TD). The gate itself shipped enforced-able in `804f80e`: new orgs default TRUE (migration 00109 + code default), the action route fails closed on unreadable settings (F2A-2), and QA cannot edit amounts at qa_approve (F2A-1) — RB's flip is the only remaining switch, deliberately manual pending step 1.

## Related (same allocation-gap family)

- **D2 (PART-2C):** 13 spent Fish invoices with no `invoice_line_items` allocations — $76,970.00 fully unallocated + $18,096.64 partial-allocation shortfall = $95,066.64 invisible to budget rollups. Same before-dogfood backfill class; invoice IDs enumerated in PART-2C. 2A tests whether approval can complete with zero allocation (the hole that produced them).
- **Q2 (PART-2C):** the four UNCODED G703 scope rows ($479,900 — louver doors / louver overhangs / pergola / planters) dropped by the pay-app importer are themselves CO-funded scope without cost codes — when backfilling, decide whether they become coded budget lines or C-suffix CO lines.

## Resolution criteria

- CO approval path authors (or explicitly declines) line allocations; `change_order_lines` rows exist for new approvals.
- Fish 72 COs + the 4 uncoded scope rows backfilled; G703 lines show CO-adjusted scheduled values; no line >100% from missing CO scope; continuation ties to cover.
- Trigger-chain runtime check documented (Rule 10 flag above) with before/after row evidence.
