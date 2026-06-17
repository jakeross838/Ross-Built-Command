/**
 * F6-family (nwrp286) — pure CO allocation-gate evaluation, extracted from the
 * change-orders PATCH route so the invariant is unit-testable without a request
 * scope. Mirrors the invoice-side `require_budget_allocation` gate.
 *
 * Invariant (enforced only when `require_co_budget_allocation` is ON for the
 * org): a change order may be approved only if it has >= 1 line, EVERY line is
 * allocated to a budget line, AND the line amounts sum to the CO amount. All
 * amounts are integer cents — the sum check is an exact integer compare (the
 * GC fee is NOT part of this; it lives on the CO header `total_with_fee` and
 * flows to the job contract via a separate trigger, not to budget lines).
 */
export type CoGateLine = { budget_line_id: string | null; amount: number };

export type CoGateResult =
  | { ok: true }
  | { ok: false; status: 422; error: string };

export function evaluateCoAllocationGate(
  lines: CoGateLine[],
  coAmountCents: number
): CoGateResult {
  const allAllocated =
    lines.length > 0 && lines.every((l) => !!l.budget_line_id);
  if (!allAllocated) {
    return {
      ok: false,
      status: 422,
      error:
        "Every change-order line must be allocated to a budget line before approval.",
    };
  }
  const sumLines = lines.reduce((s, l) => s + (l.amount ?? 0), 0);
  if (sumLines !== coAmountCents) {
    return {
      ok: false,
      status: 422,
      error: `Change-order line allocations ($${(sumLines / 100).toFixed(2)}) must sum to the CO amount ($${(coAmountCents / 100).toFixed(2)}) before approval.`,
    };
  }
  return { ok: true };
}
