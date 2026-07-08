// src/lib/statement-calc.ts
//
// Cost-Plus Statement math (billing_method = 'cost_plus_statement', Phase 1).
// PURE integer-cents. Distinct from the AIA G702/G703 engine (draw-calc.ts):
// a statement is costs + a markup, not a schedule-of-values pay app. The
// markup here is LABELLED and COMPUTED as a markup, never conflated with the
// AIA contract-fee (they may share the gc_fee_percentage storage column, but
// the math + labels + tests are separate — that is the whole point).
//
// markup_amount = round(cost_subtotal × markup_percent).
//
// Two display modes, IDENTICAL totals:
//   own_line - costs shown at cost; a separate MARKUP line carries the fee.
//   blended  - the markup is distributed pro-rata INTO the displayed code
//              amounts (no separate line). Distribution is cent-exact via a
//              remainder-carry (the last line absorbs the rounding drift) so
//              the blended line amounts sum to EXACTLY cost_subtotal +
//              markup_amount — the same grand total as own_line.
//
// Credits (deposit application, retainage withheld, prior payments) reduce the
// amount due and render ONLY when nonzero.

export type MarkupDisplay = "own_line" | "blended";

export interface StatementCostLine {
  cost_code_id: string;
  code: string;
  description: string;
  cost: number; // cents, this-period cost for the code
}

export interface StatementCreditsInput {
  deposit_application?: number; // cents applied against this statement
  retainage?: number; // cents withheld
  prior_payments?: number; // cents already paid
}

export interface StatementInput {
  costLines: StatementCostLine[];
  markupPercent: number; // FRACTION 0..1 (reuses jobs.gc_fee_percentage scale)
  markupDisplay: MarkupDisplay;
  credits?: StatementCreditsInput;
}

export interface StatementDisplayLine {
  cost_code_id: string;
  code: string;
  description: string;
  amount: number; // cents — displayed amount (own_line: cost; blended: cost + markup share)
}

export interface StatementCredit {
  key: "deposit_application" | "retainage" | "prior_payments";
  label: string;
  amount: number; // cents (positive = reduces total due)
}

export interface StatementTotals {
  lines: StatementDisplayLine[];
  cost_subtotal: number;
  markup_percent: number;
  markup_amount: number;
  /** true only for own_line — the renderer draws a discrete MARKUP line. */
  showMarkupLine: boolean;
  credits: StatementCredit[];
  total_due: number;
}

const CREDIT_LABELS: Record<StatementCredit["key"], string> = {
  deposit_application: "Deposit applied",
  retainage: "Retainage withheld",
  prior_payments: "Less prior payments",
};

/**
 * Distribute `total` across `weights` proportionally, cent-exact: each slice
 * is round(total × weight / sumWeights) except the last, which is the
 * remainder so the slices sum to EXACTLY `total`. If sumWeights is 0 the whole
 * amount lands on the last slice (nothing to weight against).
 */
function distributeProRata(total: number, weights: number[]): number[] {
  const out = new Array<number>(weights.length).fill(0);
  if (weights.length === 0) return out;
  const sum = weights.reduce((s, w) => s + w, 0);
  if (sum <= 0) {
    out[out.length - 1] = total;
    return out;
  }
  let allocated = 0;
  for (let i = 0; i < weights.length - 1; i++) {
    const slice = Math.round((total * weights[i]) / sum);
    out[i] = slice;
    allocated += slice;
  }
  out[out.length - 1] = total - allocated; // remainder absorbs rounding
  return out;
}

export function computeStatement(input: StatementInput): StatementTotals {
  const { costLines, markupPercent, markupDisplay } = input;

  const cost_subtotal = costLines.reduce((s, l) => s + (l.cost || 0), 0);
  const markup_amount = Math.round(cost_subtotal * (markupPercent || 0));

  let lines: StatementDisplayLine[];
  let showMarkupLine: boolean;

  if (markupDisplay === "blended") {
    const shares = distributeProRata(
      markup_amount,
      costLines.map((l) => l.cost || 0)
    );
    lines = costLines.map((l, i) => ({
      cost_code_id: l.cost_code_id,
      code: l.code,
      description: l.description,
      amount: (l.cost || 0) + shares[i],
    }));
    showMarkupLine = false;
  } else {
    lines = costLines.map((l) => ({
      cost_code_id: l.cost_code_id,
      code: l.code,
      description: l.description,
      amount: l.cost || 0,
    }));
    showMarkupLine = true;
  }

  const creditsInput = input.credits ?? {};
  const credits: StatementCredit[] = (
    ["deposit_application", "retainage", "prior_payments"] as const
  )
    .map((key) => ({ key, label: CREDIT_LABELS[key], amount: creditsInput[key] ?? 0 }))
    .filter((c) => c.amount !== 0);

  const creditTotal = credits.reduce((s, c) => s + c.amount, 0);
  const total_due = cost_subtotal + markup_amount - creditTotal;

  return {
    lines,
    cost_subtotal,
    markup_percent: markupPercent || 0,
    markup_amount,
    showMarkupLine,
    credits,
    total_due,
  };
}

/** Resolve a per-job config value against the org default (NULL = inherit). */
export function resolveMarkupDisplay(
  jobValue: string | null | undefined,
  orgDefault: string | null | undefined
): MarkupDisplay {
  const v = jobValue ?? orgDefault ?? "own_line";
  return v === "blended" ? "blended" : "own_line";
}

export type BackupDetail = "summary" | "detailed" | "detailed_with_pdfs";
export function resolveBackupDetail(
  jobValue: string | null | undefined,
  orgDefault: string | null | undefined
): BackupDetail {
  const v = jobValue ?? orgDefault ?? "summary";
  if (v === "detailed") return "detailed";
  if (v === "detailed_with_pdfs") return "detailed_with_pdfs";
  return "summary";
}
