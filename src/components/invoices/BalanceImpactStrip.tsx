"use client";

/**
 * Balance-impact strip (Stage-2 review redesign). One row per distinct cost
 * code the invoice touches: code · scope (PO {number} | Budget) · after-value.
 * Ink when comfortable, amber when tight (≤12% of scope), red "$X over" when
 * negative — the same red the over-budget confirm dialog uses. Prior balance
 * ("Was $X before this invoice") + committed-cost note surface on hover only.
 *
 * READ-ONLY DISPLAY. Math is the unit-tested pure functions in
 * src/lib/invoices/balance-impact.ts; baselines come from
 * GET /api/invoices/[id]/balance-impact (reviewed-invoice-EXCLUDED).
 */
import { useMemo } from "react";
import {
  computeImpactRows,
  codeOrderFromRows,
  liveSumByCode,
  type CodeBaseline,
} from "@/lib/invoices/balance-impact";

type GridRow = { cost_code_id: string | null; amount_cents: number };

export default function BalanceImpactStrip({
  rows,
  baselines,
  codeLabelById,
}: {
  rows: GridRow[];
  /** keyed by cost_code_id — from the balance-impact route. */
  baselines: Record<string, CodeBaseline>;
  /** cost_code_id → display code, e.g. "15-410". */
  codeLabelById: Record<string, string>;
}) {
  const impacts = useMemo(() => {
    const keyRows = rows.map((r) => ({ cost_code: r.cost_code_id, amount_cents: r.amount_cents }));
    const order = codeOrderFromRows(keyRows);
    const sums = liveSumByCode(keyRows);
    return computeImpactRows(order, sums, baselines);
  }, [rows, baselines]);

  if (impacts.length === 0) return null;

  return (
    <div className="nw-impact-strip" aria-label="Balance impact if approved">
      <div className="nw-impact-eyebrow">Balance impact · if approved</div>
      {impacts.map((im) => (
        <div className="nw-impact-row" key={im.code} title={im.wasLabel}>
          <span className="nw-impact-code">{codeLabelById[im.code] ?? im.code}</span>
          <span className="nw-impact-scope">{im.scopeLabel}</span>
          <span
            className={
              "nw-impact-after " +
              (im.tone === "over" ? "is-over" : im.tone === "tight" ? "is-tight" : "is-ink")
            }
          >
            {im.afterLabel}
          </span>
        </div>
      ))}
    </div>
  );
}
