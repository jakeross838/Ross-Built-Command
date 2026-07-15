/**
 * Balance-impact strip math (Stage-2 of the review-screen redesign).
 *
 * READ-ONLY DISPLAY ARITHMETIC. This module computes the "if approved"
 * after-values shown in the balance-impact strip below the allocation grid.
 * It changes NO approval math — the real approve gate (over-budget) is
 * untouched. See design_handoff_redesign/README.md "Balance impact strip".
 *
 * The mockup's `impacts()` models: per distinct cost code the invoice touches,
 *   now   = scopeTotal - baselineExcludingThisInvoice
 *   after = now - (sum of THIS invoice's live allocation lines on that code)
 * with PO scope taking precedence over budget when the code has an open PO.
 *
 * DOUBLE-COUNT TRAP (per Jake's Stage-2 caveat): purchase_orders.invoiced_total
 * and budget_line.invoiced COUNT invoices in statuses
 *   {pm_approved, qa_review, qa_approved, pushed_to_qb, in_draw, paid}
 * (see src/lib/recalc.ts INVOICE_COUNTING_STATUSES). An invoice under FINAL
 * review (qa_review / pm_approved) is ALREADY inside those totals; one under PM
 * review is not. Rather than branch on status, the server computes each scope's
 * baseline FROM SOURCE EXCLUDING the reviewed invoice's id (`baselineCents`
 * below is always reviewed-invoice-free). Then `after = now - liveSum` subtracts
 * the reviewed invoice's current allocation exactly once — trap-proof for every
 * status. Callers MUST pass a baseline that excludes the reviewed invoice.
 */

/** Amber when remaining after ≤ 12% of the scope total (mockup denom * 0.12). */
export const TIGHT_FRACTION = 0.12;

/**
 * Invoice statuses that COUNT toward budget_line.invoiced / purchase_orders.
 * invoiced_total. MUST stay in sync with src/lib/recalc.ts
 * INVOICE_COUNTING_STATUSES (that file owns the write path; this file is
 * client-safe so it can't import the server-only recalc module). A unit test
 * pins this list so it can't drift silently.
 */
export const INVOICE_COUNTING_STATUSES = [
  "pm_approved",
  "qa_review",
  "qa_approved",
  "pushed_to_qb",
  "in_draw",
  "paid",
] as const;

/** One invoice's contribution to a scope (a PO, or a budget line). */
export type InvoiceContribution = {
  invoiceId: string;
  status: string;
  amountCents: number;
};

/**
 * The reviewed-invoice-EXCLUDED baseline for a scope: sum of counting-status
 * contributions from every OTHER invoice. Excluding `reviewedInvoiceId` is what
 * makes the strip trap-proof — see the module header. When the reviewed invoice
 * is itself counting-status (final review), this drops its already-counted
 * contribution so `after = now - liveSum` doesn't subtract it twice.
 */
export function computeBaselineCents(
  contributions: InvoiceContribution[],
  reviewedInvoiceId: string,
  countingStatuses: readonly string[] = INVOICE_COUNTING_STATUSES
): number {
  return contributions
    .filter((c) => c.invoiceId !== reviewedInvoiceId && countingStatuses.includes(c.status))
    .reduce((s, c) => s + Math.round(c.amountCents ?? 0), 0);
}

export type ImpactScope = "po" | "budget";

/** Per-cost-code baseline, computed server-side, EXCLUDING the reviewed invoice. */
export type CodeBaseline = {
  /** Scope total in cents: PO amount, or budget-line revised_estimate. */
  scopeTotalCents: number;
  /**
   * Invoiced/committed-against-scope in cents from every OTHER counting-status
   * invoice — i.e. excluding the invoice under review. Never includes the
   * reviewed invoice, so `after` below subtracts its live lines exactly once.
   */
  baselineCents: number;
  scope: ImpactScope;
  /** PO number for display when scope === "po". */
  poNumber?: string | null;
};

export type ImpactTone = "ink" | "tight" | "over";

export type ImpactRow = {
  code: string;
  scope: ImpactScope;
  /** "PO RB-2026-041" | "Budget" */
  scopeLabel: string;
  /** cents remaining on the scope BEFORE this invoice's lines. */
  nowCents: number;
  /** cents remaining on the scope AFTER this invoice's live lines. */
  afterCents: number;
  tone: ImpactTone;
  /** Whole-dollar display, e.g. "$2,050 remain after" / "$350 over". */
  afterLabel: string;
  /** Hover title, e.g. "Was $16,000 before this invoice · draws PO … (committed cost)". */
  wasLabel: string;
};

/** Whole-dollar formatter matching the mockup's fmt0 (no cents in the strip). */
export function formatWholeDollarsFromCents(cents: number): string {
  const dollars = Math.round(cents / 100);
  return "$" + dollars.toLocaleString("en-US");
}

export function toneFor(afterCents: number, scopeTotalCents: number): ImpactTone {
  if (afterCents < 0) return "over";
  if (afterCents <= scopeTotalCents * TIGHT_FRACTION) return "tight";
  return "ink";
}

/**
 * Compute one balance-impact row per distinct cost code the invoice touches,
 * in first-seen order — mirrors the mockup's `impacts()`.
 *
 * @param codeOrder   distinct cost codes in first-seen order (from the live grid)
 * @param liveSumByCode  cents this invoice currently allocates to each code (live grid)
 * @param baselineByCode server-computed baselines, reviewed-invoice-EXCLUDED
 */
export function computeImpactRows(
  codeOrder: string[],
  liveSumByCode: Record<string, number>,
  baselineByCode: Record<string, CodeBaseline>
): ImpactRow[] {
  const rows: ImpactRow[] = [];
  for (const code of codeOrder) {
    const base = baselineByCode[code];
    // No budget line and no PO for this code → nothing to predict against.
    if (!base) continue;
    const liveSum = liveSumByCode[code] ?? 0;
    const nowCents = base.scopeTotalCents - base.baselineCents;
    const afterCents = nowCents - liveSum;
    const tone = toneFor(afterCents, base.scopeTotalCents);
    const scopeLabel = base.scope === "po" ? `PO ${base.poNumber ?? ""}`.trim() : "Budget";
    const afterLabel =
      afterCents < 0
        ? `${formatWholeDollarsFromCents(-afterCents)} over`
        : `${formatWholeDollarsFromCents(afterCents)} remain after`;
    const wasLabel =
      `Was ${formatWholeDollarsFromCents(nowCents)} before this invoice` +
      (base.scope === "po"
        ? ` · draws PO ${base.poNumber ?? ""} — budget unchanged (committed cost)`.replace(/\s+—/, " —")
        : "");
    rows.push({ code, scope: base.scope, scopeLabel, nowCents, afterCents, tone, afterLabel, wasLabel });
  }
  return rows;
}

/** Distinct cost codes touched by the live rows, in first-seen order. */
export function codeOrderFromRows(
  rows: { cost_code?: string | null }[]
): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const r of rows) {
    const c = r.cost_code;
    if (c && !seen.has(c)) {
      seen.add(c);
      order.push(c);
    }
  }
  return order;
}

/** Sum live allocation cents per cost code (skips rows with no code). */
export function liveSumByCode(
  rows: { cost_code?: string | null; amount_cents?: number }[]
): Record<string, number> {
  const sums: Record<string, number> = {};
  for (const r of rows) {
    if (!r.cost_code) continue;
    sums[r.cost_code] = (sums[r.cost_code] ?? 0) + Math.round(r.amount_cents ?? 0);
  }
  return sums;
}
