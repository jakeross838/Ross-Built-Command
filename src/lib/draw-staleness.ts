/**
 * F6-family (nwrp286 Q3) — draw staleness diff. A DRAFT draw's stored G702
 * summary columns can drift from a from-source recompute (a CO approved, or an
 * invoice changed, after the row was written). DISPLAY-ONLY signal: it never
 * writes. Integer-cents exact compare — no float.
 *
 * Field choice (plan-review CRITICAL, money-reviewer): rollupDrawTotals PASSES
 * THROUGH `original_contract_sum` and `net_change_orders` from its inputs, and
 * `_data.ts` feeds those inputs from the STORED draw columns — so a stored-vs-
 * recomputed compare on them is `x == x`, always false (dead). `contract_sum_
 * to_date` is derived from those two pass-throughs, so it is excluded too. The
 * fields below either are genuinely DERIVED FROM SOURCE by rollupDrawTotals
 * (total_completed_to_date, current_payment_due, balance_to_finish,
 * deposit_amount) or are recomputed from source by the caller
 * (net_change_orders, via netChangeOrdersForJob — the CO-staleness signal).
 */
export type DrawStaleFields = {
  net_change_orders: number;
  total_completed_to_date: number;
  current_payment_due: number;
  balance_to_finish: number;
  deposit_amount: number;
};

export const DRAW_STALE_KEYS: ReadonlyArray<keyof DrawStaleFields> = [
  "net_change_orders",
  "total_completed_to_date",
  "current_payment_due",
  "balance_to_finish",
  "deposit_amount",
];

export function computeDrawStaleness(
  stored: DrawStaleFields,
  recomputed: DrawStaleFields
): boolean {
  return DRAW_STALE_KEYS.some((k) => (stored[k] ?? 0) !== (recomputed[k] ?? 0));
}
