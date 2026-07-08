// src/components/prototypes/DrawInvoicesSection.tsx
//
// "Invoices in this draw" — the set of invoices composing a draw, shown on the
// draw detail (both AIA + cost_plus_statement). A draw is a set of invoices;
// this makes that set visible + navigable (each row opens the invoice detail).
// Renderer-agnostic; consumes the loader's DrawInvoice[].

import Link from "next/link";
import Card from "@/components/nw/Card";
import Eyebrow from "@/components/nw/Eyebrow";
import Money from "@/components/nw/Money";
import type { DrawInvoice } from "@/app/financials/pay-apps/[id]/_data";

export default function DrawInvoicesSection({
  invoices,
}: {
  invoices: DrawInvoice[];
}) {
  if (!invoices || invoices.length === 0) return null;
  const th =
    "py-2 px-3 text-left text-[9px] uppercase font-mono tracking-[0.08em] text-[color:var(--text-secondary)]";
  return (
    <Card padding="md" className="mt-4">
      <Eyebrow tone="muted" className="mb-3">
        Invoices in this draw · {invoices.length}
      </Eyebrow>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]" style={{ fontVariantNumeric: "tabular-nums" }}>
          <thead>
            <tr style={{ background: "var(--bg-subtle)" }}>
              <th className={th}>Vendor</th>
              <th className={th}>Inv #</th>
              <th className={th}>Date</th>
              <th className={th}>Cost code</th>
              <th className={th}>Status</th>
              <th className={`${th} text-right`}>Amount</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-t" style={{ borderColor: "var(--border-subtle)" }}>
                <td className="py-2 px-3" style={{ color: "var(--text-primary)" }}>{inv.vendor}</td>
                <td className="py-2 px-3 font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>{inv.invoice_number ?? "—"}</td>
                <td className="py-2 px-3 text-[11px] tabular-nums" style={{ color: "var(--text-muted)" }}>{inv.received_date ?? "—"}</td>
                <td className="py-2 px-3 font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>{inv.code ?? "—"}</td>
                <td className="py-2 px-3">
                  {inv.stamped ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] uppercase font-mono tracking-[0.08em] border" style={{ borderColor: "rgba(74,138,111,0.4)", color: "var(--nw-success)" }}>
                      ✓ Stamped
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>—</span>
                  )}
                </td>
                <td className="py-2 px-3 text-right"><Money cents={inv.amount} size="sm" /></td>
                <td className="py-2 px-3 text-right">
                  <Link
                    href={`/financials/bills/${inv.id}`}
                    className="hover:underline text-[11px]"
                    style={{ color: "var(--nw-stone-blue)" }}
                  >
                    Open →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
