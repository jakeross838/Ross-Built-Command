// src/components/prototypes/CostPlusStatementPrintView.tsx
//
// Print/PDF layout for a Cost-Plus Statement (billing_method =
// 'cost_plus_statement'). Parallel to DrawPrintView (AIA G702/G703). Uses the
// existing print pipeline: window.print() + a scoped <style jsx global> @media
// print block (hook-safe hex per CONTEXT D-19). Monochrome, letter portrait.

"use client";

import Link from "next/link";
import { Fragment } from "react";
import { ArrowLeftIcon, PrinterIcon } from "@heroicons/react/24/outline";
import NwButton from "@/components/nw/Button";
import { computeStatement } from "@/lib/statement-calc";
import { adjustmentTypeLabel } from "@/components/prototypes/AdjustmentsCreditsCard";
import type {
  StatementViewData,
  DrawAdjustment,
} from "@/app/financials/pay-apps/[id]/_data";

function fmt(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function pctLabel(fraction: number): string {
  const p = fraction * 100;
  return `${Number.isInteger(p) ? p.toFixed(0) : p.toFixed(2)}%`;
}

export interface CostPlusStatementPrintViewProps {
  jobName: string;
  statement: StatementViewData;
  backHref: string;
  /** BLOCK B pt2 — applied adjustments (signed rows folded into total due). */
  adjustments?: DrawAdjustment[];
}

export default function CostPlusStatementPrintView({
  jobName,
  statement,
  backHref,
  adjustments = [],
}: CostPlusStatementPrintViewProps) {
  const appliedAdjustments = adjustments.filter(
    (a) => a.adjustment_status === "applied_to_draw",
  );
  const netAdjustments = appliedAdjustments.reduce((s, a) => s + a.amount_cents, 0);
  const totals = computeStatement({
    costLines: statement.costLines.map((l) => ({
      cost_code_id: l.cost_code_id,
      code: l.code,
      description: l.description,
      cost: l.cost,
    })),
    markupPercent: statement.markupPercent,
    markupDisplay: statement.markupDisplay,
    credits: statement.credits,
  });
  const showBackup =
    statement.backupDetail === "detailed" ||
    statement.backupDetail === "detailed_with_pdfs";
  const invByCode = new Map(statement.costLines.map((l) => [l.cost_code_id, l.invoices]));

  return (
    <>
      <style jsx global>{`
        @page {
          size: letter;
          margin: 0.75in;
        }
        .stmt-print-root {
          color: #000;
        }
        .stmt-line {
          border-bottom: 0.5pt solid #ccc;
        }
        .stmt-total {
          border-top: 2pt solid #000;
          font-weight: 700;
        }
        .stmt-subtotal {
          border-top: 1pt solid #000;
        }
        @media print {
          .stmt-print-root {
            font-size: 10pt;
          }
          .stmt-print-root table {
            width: 100%;
          }
        }
      `}</style>

      <div
        className="print:hidden no-print px-6 py-4 border-b"
        style={{ borderColor: "var(--border-default)", background: "var(--bg-page)" }}
      >
        <div className="max-w-[1600px] mx-auto flex items-center justify-between flex-wrap gap-4">
          <Link href={backHref} className="hover:underline flex items-center gap-1 text-[12px]" style={{ color: "var(--text-secondary)" }}>
            <ArrowLeftIcon className="w-4 h-4" strokeWidth={1.5} /> Back to Statement
          </Link>
          <div className="flex items-center gap-3">
            <span
              className="text-[11px]"
              style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-jetbrains-mono)", textTransform: "uppercase", letterSpacing: "0.08em" }}
            >
              Print preview · Statement #{statement.statementNumber}
            </span>
            <NwButton variant="primary" size="md" onClick={() => window.print()} aria-label="Print this statement">
              <PrinterIcon className="w-3.5 h-3.5" strokeWidth={1.5} /> Print
            </NwButton>
          </div>
        </div>
      </div>

      <main className="print-area stmt-print-root max-w-[8.5in] mx-auto px-4 py-6 text-[10pt]">
        {/* Statement header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            {statement.org.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={statement.org.logo_url} alt={statement.org.name} style={{ height: "0.55in", objectFit: "contain", marginBottom: "0.1in" }} />
            ) : (
              <div style={{ fontSize: "14pt", fontWeight: 600 }}>{statement.org.name || "—"}</div>
            )}
            <div style={{ fontSize: "9pt", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Cost-Plus Statement
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: "9pt" }}>
            <div>Client: {statement.clientName}</div>
            <div>Project: {jobName}</div>
            <div>Statement #{statement.statementNumber}</div>
            <div>Period: {statement.periodStart} – {statement.periodEnd}</div>
            <div>Date: {statement.applicationDate}</div>
          </div>
        </div>

        <table style={{ borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "3pt 4pt", fontSize: "8pt", textTransform: "uppercase" }}>Code</th>
              <th style={{ textAlign: "left", padding: "3pt 4pt", fontSize: "8pt", textTransform: "uppercase" }}>Description</th>
              <th style={{ textAlign: "right", padding: "3pt 4pt", fontSize: "8pt", textTransform: "uppercase" }}>
                {statement.markupDisplay === "blended" ? "Amount (incl. markup)" : "Cost this period"}
              </th>
            </tr>
          </thead>
          <tbody>
            {totals.lines.map((l) => (
              <Fragment key={l.cost_code_id}>
                <tr className="stmt-line">
                  <td style={{ padding: "3pt 4pt", fontFamily: "ui-monospace, monospace" }}>{l.code}</td>
                  <td style={{ padding: "3pt 4pt" }}>{l.description}</td>
                  <td style={{ padding: "3pt 4pt", textAlign: "right" }}>{fmt(l.amount)}</td>
                </tr>
                {showBackup &&
                  (invByCode.get(l.cost_code_id) ?? []).map((inv, i) => (
                    <tr key={`${l.cost_code_id}-i-${i}`} style={{ color: "#555" }}>
                      <td></td>
                      <td style={{ padding: "1pt 4pt", fontSize: "8pt" }}>
                        {inv.vendor}{inv.invoice_number ? ` · #${inv.invoice_number}` : ""}
                      </td>
                      <td style={{ padding: "1pt 4pt", textAlign: "right", fontSize: "8pt" }}>{fmt(inv.amount)}</td>
                    </tr>
                  ))}
              </Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr className="stmt-subtotal">
              <td></td>
              <td style={{ padding: "3pt 4pt", textTransform: "uppercase", fontSize: "8pt" }}>Cost subtotal</td>
              <td style={{ padding: "3pt 4pt", textAlign: "right" }}>{fmt(totals.cost_subtotal)}</td>
            </tr>
            {totals.showMarkupLine && (
              <tr>
                <td></td>
                <td style={{ padding: "3pt 4pt" }}>Markup ({pctLabel(totals.markup_percent)})</td>
                <td style={{ padding: "3pt 4pt", textAlign: "right" }}>{fmt(totals.markup_amount)}</td>
              </tr>
            )}
            {totals.credits.map((c) => (
              <tr key={c.key}>
                <td></td>
                <td style={{ padding: "3pt 4pt" }}>{c.label}</td>
                <td style={{ padding: "3pt 4pt", textAlign: "right" }}>({fmt(c.amount)})</td>
              </tr>
            ))}
            {appliedAdjustments.map((a) => (
              <tr key={a.id}>
                <td></td>
                <td style={{ padding: "3pt 4pt" }}>{adjustmentTypeLabel(a.adjustment_type)}</td>
                <td style={{ padding: "3pt 4pt", textAlign: "right" }}>{fmt(a.amount_cents)}</td>
              </tr>
            ))}
            <tr className="stmt-total">
              <td></td>
              <td style={{ padding: "4pt", textTransform: "uppercase" }}>Total due</td>
              <td style={{ padding: "4pt", textAlign: "right" }}>{fmt(totals.total_due + netAdjustments)}</td>
            </tr>
          </tfoot>
        </table>

        <div style={{ marginTop: "0.3in", fontSize: "9pt" }}>
          <div style={{ textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "8pt", color: "#555" }}>Payment terms</div>
          <p style={{ margin: "0.05in 0 0" }}>
            Total due is payable per your contract payment terms. Cost-plus, open book.
          </p>
        </div>

        {statement.backupDetail === "detailed_with_pdfs" && (
          <div style={{ marginTop: "0.25in", fontSize: "8pt", color: "#555" }}>
            Stamped invoice PDFs for the costs above are appended to this statement package.
          </div>
        )}
      </main>
    </>
  );
}
