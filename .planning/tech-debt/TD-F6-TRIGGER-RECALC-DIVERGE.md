# TD-F6-TRIGGER-RECALC-DIVERGE — CO co_adjustments status-filter divergence (trigger vs TS recalc)

**Status:** OPEN — file-don't-fix (no live impact today). Surfaced during f6-family plan-review (nwrp286), 2026-06-17.
**Severity:** LOW today / HIGH-if-triggered (data-integrity, money math).
**Owner queue:** human-walk / next CO-status phase.

## The divergence

Two code paths recompute `budget_lines.co_adjustments` / `revised_estimate` from `change_order_lines`, and they use **different CO-status filters**:

- **DB trigger** `recompute_budget_line_co_adjustments(uuid)` — counts CO lines whose parent `change_orders.status IN ('approved','executed')`. Live body confirmed via `pg_get_functiondef` 2026-06-17 (== migration `00028:421-446`). Fired by `trg_change_orders_status_sync` (AFTER UPDATE on change_orders, on status change) and `trg_change_order_lines_sync` (AFTER INS/UPD/DEL on change_order_lines).
- **TS recalc** `recalcBudgetLine` — `src/lib/recalc.ts:40` `CO_APPROVED_STATUSES = ["approved"]`, applied at `:107-112`. Counts `'approved'` only.

They diverge **iff a CO is `status='executed'`**: the trigger includes its lines in `co_adjustments`; the TS recalc excludes them. Since both are absolute recomputes and the CO PATCH route calls `recalcBudgetLine` AFTER the trigger fired (`route.ts:319`), the **TS value wins** for any budget line touched through the route — so an `executed` CO's allocation would be silently dropped from `co_adjustments` the next time `recalcBudgetLine` runs for that line (e.g., via an invoice status flip touching the same line).

## Why no live impact today (verified)

- All 72 Fish approved COs are `status='approved'` — **zero `executed`** (live SQL 2026-06-17).
- The app CO status enum on the PATCH route is `draft → pending → approved → denied → void` (`change-orders/[id]/route.ts:78`) — the app **never writes `executed`**. `'executed'` is a legacy/documented status with no writer.
- Therefore the two paths agree on every state the app can currently produce.

## Trigger condition (when this becomes real)

Any future phase that (a) enables an `executed` CO status transition, OR (b) backfills/imports COs with `status='executed'`. At that point the trigger and `recalcBudgetLine` disagree and budget-line `co_adjustments` becomes non-deterministic (depends on which path ran last).

## Recommended fix (when triggered, NOT now)

Make the two filters identical. Either add `'executed'` to `CO_APPROVED_STATUSES` in `recalc.ts` (matching the trigger and the DB job-cache `refresh_approved_cos_total`, which also uses `{approved,executed}`), OR drop `'executed'` from the trigger filter — but the former is correct (an executed CO is a stronger commitment than approved and should count toward the budget). Also reconcile `netChangeOrdersForJob` (`draw-calc.ts:406-429`) which filters `status='approved'` ONLY (excludes executed) — a third divergent filter on the same conceptual question. A single shared constant/helper for "CO statuses that count toward budget/contract" is the clean resolution.

## Cross-refs

[[feedback_cascade_audit_rule]] (recalc-not-increment family). Related rails mapped in f6-family investigation. See `.planning/phases/f6-family/PLAN.md` baseline table.
