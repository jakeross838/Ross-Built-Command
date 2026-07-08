// src/lib/jobs/contract-units.ts
//
// Explicit display<->store unit transforms for the job settings form.
//
// The DB stores money in CENTS and — for legacy reasons — TWO different
// percent scales:
//   * deposit_percentage / gc_fee_percentage : FRACTION 0..1 (0.30 == 30%).
//       Consumed DIRECTLY by draw math — draw-calc computes
//       deposit_amount = originalContractSum * depositPercentage
//       (src/lib/draw-calc.ts:316), so the stored value MUST stay a fraction.
//   * retainage_percent : WHOLE 0..100 (30 == 30%). Draw math divides by 100
//       (src/lib/draw-calc.ts:234,305). Stored value MUST stay whole.
//
// The FORM speaks human units (dollars, whole percents). Every field routes
// through one of these named transforms so the boundary is explicit and
// round-trip-safe: a stored 0.30 displays as 30% and saves back as 0.30 —
// never silently 0.3% or 3000%. Normalizing the two DB percent scales into
// one is a separate migration (it touches live Fish/Gavin financial config +
// draw math), deliberately out of scope here — this module makes the UI
// boundary correct WITHOUT changing storage.
//
// Tested in __tests__/contract-units.test.ts (round-trip + boundary cases).

/** cents (store) -> dollars (display). */
export function centsToDollars(cents: number): number {
  return (Number(cents) || 0) / 100;
}

/** dollars (input) -> cents (store). Rounds to the nearest cent. */
export function dollarsToCents(dollars: number | string): number {
  const n = typeof dollars === "string" ? parseFloat(dollars) : dollars;
  return Math.round((Number.isFinite(n) ? n : 0) * 100);
}

/**
 * FRACTION-scale column (deposit_percentage, gc_fee_percentage):
 * stored 0.30 -> displayed 30.
 */
export function fractionToPercent(fraction: number): number {
  // Round to 6 places so an input value never shows float noise
  // (0.185 * 100 = 18.499999999996 -> 18.5).
  return Math.round((Number(fraction) || 0) * 100 * 1e6) / 1e6;
}

/**
 * FRACTION-scale column: entered 30 -> stored 0.30. This is the transform
 * whose absence caused the 3000× hazard (typing "30" under a "0-100" label
 * stored 30, which draw math read as a 3000% deposit).
 */
export function percentToFraction(percent: number | string): number {
  const n = typeof percent === "string" ? parseFloat(percent) : percent;
  return (Number.isFinite(n) ? n : 0) / 100;
}

/**
 * WHOLE-scale column (retainage_percent): entered 30 -> stored 30. Identity,
 * named explicitly so the form never accidentally routes a whole-scale field
 * through the /100 fraction transform.
 */
export function wholePercent(percent: number | string): number {
  const n = typeof percent === "string" ? parseFloat(percent) : percent;
  return Number.isFinite(n) ? n : 0;
}

/** Human-readable dollars for display, e.g. 245000000 -> "$2,450,000.00". */
export function formatDollars(cents: number): string {
  return centsToDollars(cents).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Human labels for the contract_type enum. Values must match the DB CHECK /
// api CONTRACT_TYPES allow-list (src/app/api/jobs/route.ts:132-140).
export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  cost_plus_aia: "Cost-Plus — AIA (G702 / G703)",
  cost_plus_open_book: "Cost-Plus — Open Book",
  fixed_price: "Fixed Price",
  gmp: "Guaranteed Maximum Price (GMP)",
  time_and_materials: "Time & Materials",
  unit_price: "Unit Price",
};

export function contractTypeLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return CONTRACT_TYPE_LABELS[value] ?? value;
}

export const CONTRACT_TYPE_OPTIONS = Object.entries(CONTRACT_TYPE_LABELS).map(
  ([value, label]) => ({ value, label })
);
