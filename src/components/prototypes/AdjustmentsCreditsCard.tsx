// src/components/prototypes/AdjustmentsCreditsCard.tsx
//
// BLOCK B pt2 — the "Adjustments & Credits" section rendered on a pay app.
// Shows the adjustments APPLIED to this draw (adjustment_status =
// 'applied_to_draw'); each signed amount already flows into current_payment_due
// via the draw-calc engine, so this section is the itemized backing that makes
// the bottom line traceable (migration 00069 D2 auditability rule). Approved-
// but-not-applied adjustments are NOT shown here — they are the wizard's pending
// pool (visible ≠ counted).

import Card from "@/components/nw/Card";
import Eyebrow from "@/components/nw/Eyebrow";
import Money from "@/components/nw/Money";
import type { DrawAdjustment } from "@/app/financials/pay-apps/[id]/_data";

const TYPE_LABEL: Record<string, string> = {
  correction: "Correction",
  credit_goodwill: "Credit — goodwill",
  credit_defect: "Credit — defect",
  credit_error: "Credit — billing error",
  withhold: "Withhold",
  customer_direct_pay: "Customer direct pay",
  conditional: "Conditional hold",
};

export function adjustmentTypeLabel(t: string): string {
  return TYPE_LABEL[t] ?? t;
}

export default function AdjustmentsCreditsCard({
  adjustments,
}: {
  adjustments: DrawAdjustment[];
}) {
  const applied = adjustments.filter(
    (a) => a.adjustment_status === "applied_to_draw"
  );
  if (applied.length === 0) return null;
  const net = applied.reduce((s, a) => s + a.amount_cents, 0);

  return (
    <Card padding="md">
      <Eyebrow tone="muted" className="mb-3">
        Adjustments &amp; Credits · {applied.length}
      </Eyebrow>
      <ul className="space-y-3 text-[12px]">
        {applied.map((a) => (
          <li key={a.id} className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div
                className="text-[10px] mb-0.5"
                style={{
                  fontFamily: "var(--font-jetbrains-mono)",
                  letterSpacing: "0.08em",
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                }}
              >
                {adjustmentTypeLabel(a.adjustment_type)}
                {a.affected_pcco_number ? ` · ${a.affected_pcco_number}` : ""}
              </div>
              <div className="leading-snug" style={{ color: "var(--text-primary)" }}>
                {a.reason.length > 160
                  ? `${a.reason.slice(0, 160).trimEnd()}…`
                  : a.reason}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <Money cents={a.amount_cents} size="sm" signColor />
            </div>
          </li>
        ))}
      </ul>
      <div
        className="mt-3 pt-3 flex items-center justify-between"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <span
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            fontSize: "10px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
          }}
        >
          Net applied to this draw
        </span>
        <Money cents={net} size="sm" signColor variant="emphasized" />
      </div>
    </Card>
  );
}
