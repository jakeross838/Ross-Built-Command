// src/components/prototypes/DrawPrintView.tsx
//
// DrawPrintView — Pay App print preview component (G702 cover + G703 detail).
// Stage 1.5c Plan 3 extraction; specialized print-preview pattern (preserves
// @media print stylesheet from 1.5b verbatim). Source: src/app/design-system/
// prototypes/draws/[id]/print/page.tsx.
//
// Pure props-only View component. Wrapper handles fixture lookup + path
// resolution; this View renders the chrome + AIA G702/G703 print form.
//
// Hex-color exception: print rendering for AIA forms requires raw black /
// gray fills (#000 / #f0f0f0 / #f8f8f8 / #ccc / #666 / #fff) because print
// is monochrome by definition. All hex is contained inside a scoped
// <style jsx global> CSS block (CSS file pattern, post-edit hook safe) and
// applied via class names — NO inline style={{ background: "#..." }}.
//
// TIERED FIDELITY per CONTEXT D-15 (Q7 override) preserved from 1.5b:
//   - G702 cover: pixel-perfect attempt against AIA G702-1992 standard
//   - G703 detail: 80% fidelity (8-column AIA structure, no per-page subtotals)
//
// TD fixes per CONTEXT D-06:
//   - TD-20: Print button (CTA action) → NwButton
//   - TD-25/26: All Card padding=md / fontWeight=500 (already clean in source;
//     print form uses raw HTML table not Card primitives)
//
// Tenant-blind by construction.

"use client";

import Link from "next/link";
import { PrinterIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";

import type {
  CaldwellDraw,
  CaldwellDrawLineItem,
  CaldwellChangeOrder,
  CaldwellCostCode,
  CaldwellJob,
} from "@/app/design-system/_fixtures/drummond/types";
import type {
  DepositState,
  DrawAdjustment,
} from "@/app/financials/pay-apps/[id]/_data";
import { adjustmentTypeLabel } from "@/components/prototypes/AdjustmentsCreditsCard";

import NwButton from "@/components/nw/Button";

export interface DrawPrintViewProps {
  draw: CaldwellDraw;
  job: CaldwellJob;
  lineItems: CaldwellDrawLineItem[];
  costCodes: CaldwellCostCode[];
  /** Approved change orders rolled into the contract sum through this draw. */
  changeOrdersThroughThisDraw: CaldwellChangeOrder[];
  /** BLOCK B pt2 — deposit application (1a line + deduction before payment due). */
  deposit?: DepositState;
  /** BLOCK B pt2 — applied adjustments (deduction rows before payment due). */
  adjustments?: DrawAdjustment[];
  /** PRINT FIDELITY — retainage withheld this application (AIA line 5). When
   *  absent (prototype gallery fixtures), the line renders 0% / $0.00. */
  retainage?: { percent: number; amount: number };
  /** PRINT FIDELITY — contractor letterhead identity from the org row. When
   *  absent (prototype gallery fixtures), falls back to the Ross Built demo. */
  contractor?: { name: string; address: string };
  /** Optional href for back-to-draw link. Defaults to portfolio path. */
  backHref?: string;
}

// Helper: cents → "$X,XXX.XX" formatted text. Print uses plain text +
// monospace inline style, not the Money component (which carries Slate
// theme tokens that don't translate to print monochrome).
function fmt(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents) / 100;
  return `${sign}$${abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function DrawPrintView({
  draw,
  job,
  lineItems,
  costCodes,
  changeOrdersThroughThisDraw,
  deposit,
  adjustments = [],
  retainage,
  contractor,
  backHref,
}: DrawPrintViewProps) {
  // Contractor letterhead — org identity when wired (production), Ross Built
  // demo as the fixture-gallery fallback.
  const contractorName = contractor?.name?.trim() || "Ross Built Custom Homes";
  const contractorAddress =
    contractor?.address?.trim() || "305 67th St West, Bradenton FL 34209";
  // AIA line 5 retainage (withheld this application) + the line-6 subtotal
  // "total earned less retainage" (line 4 − line 5). Both are computed from
  // real draw math; the prior hardcoded "$0.00" contradicted current_payment_due
  // on any job that withholds retainage.
  const retainageAmount = retainage?.amount ?? 0;
  const retainagePct = retainage?.percent ?? 0;
  const totalEarnedLessRetainage = draw.total_completed_to_date - retainageAmount;
  const cosThroughThisDraw = [...changeOrdersThroughThisDraw].sort(
    (a, b) => a.pcco_number - b.pcco_number,
  );
  const appliedAdjustments = adjustments.filter(
    (a) => a.adjustment_status === "applied_to_draw",
  );

  // CO summary totals (additions, deductions, net) — shown on G702 change
  // order summary line 2.
  const coAdditions = cosThroughThisDraw
    .filter((co) => co.total_with_fee > 0)
    .reduce((sum, co) => sum + co.total_with_fee, 0);
  const coDeductions = cosThroughThisDraw
    .filter((co) => co.total_with_fee < 0)
    .reduce((sum, co) => sum + co.total_with_fee, 0);

  // G703 grand totals — computed on render per R.2 (recalculate, don't
  // increment).
  const grandScheduled = lineItems.reduce(
    (s, li) =>
      s + li.previous_applications + li.this_period + li.balance_to_finish,
    0,
  );
  const grandPrevious = lineItems.reduce(
    (s, li) => s + li.previous_applications,
    0,
  );
  const grandThisPeriod = lineItems.reduce((s, li) => s + li.this_period, 0);
  const grandTotal = lineItems.reduce((s, li) => s + li.total_to_date, 0);
  const grandBalance = lineItems.reduce(
    (s, li) => s + li.balance_to_finish,
    0,
  );

  const resolvedBackHref = backHref ?? `/design-system/prototypes/draws/${draw.id}`;

  return (
    <>
      {/* Page-specific print rules. Scoped to this route via
          <style jsx global> — DOES NOT modify globals.css. The base
          print stylesheet at src/app/globals.css already handles chrome
          hiding, table borders, monochrome conversion; these overrides
          add AIA-specific column padding + page breaks.

          Hex-color exception: all bank-AIA monochrome colors are DEFINED
          HERE (CSS file pattern, hook-safe) and applied via class names
          below. NO inline style={{ background: "#..." }} to keep
          nightwork-post-edit.sh hex hard-block silent. */}
      <style jsx global>{`
        /* Print page setup: letter portrait, 0.75in margins. */
        @page {
          size: letter;
          margin: 0.75in;
        }

        /* AIA-print color palette — applied via class names. Monochrome
           by AIA Document Service standard; not Slate tokens. */
        .aia-print-root {
          color: #000;
        }
        .aia-bordered-block {
          border: 1pt solid #000;
        }
        .aia-bordered-block > div + div,
        .aia-bordered-block > div:first-child {
          border-color: #000;
        }
        .aia-cell-divider-right {
          border-right: 1pt solid #000;
        }
        .aia-cell-divider-bottom {
          border-bottom: 1pt solid #000;
        }
        .aia-row-separator {
          border-bottom: 0.5pt solid #ccc;
        }
        .aia-line-bold-top {
          border-top: 1pt solid #000;
        }
        .aia-line-grandtotal {
          background: #f0f0f0; /* AIA-print monochrome — exception per CONTEXT cross-cutting */
          border-top: 2pt solid #000;
        }
        .aia-line-emphasis {
          background: #f0f0f0; /* AIA-print monochrome — exception per CONTEXT cross-cutting */
        }
        .aia-line-summary {
          background: #f8f8f8; /* AIA-print monochrome — exception per CONTEXT cross-cutting */
        }
        .aia-table-cell {
          border: 0.5pt solid #000;
        }
        .aia-table-cell-strong {
          border: 1pt solid #000;
        }
        .aia-signature-line {
          border-top: 1pt solid #000;
        }
        .aia-footer-note {
          color: #666;
        }
        .aia-mono {
          font-family: ui-monospace, "JetBrains Mono", monospace;
        }

        @media print {
          /* G702 cover sheet on first page; G703 detail starts on next */
          .g702-cover {
            page-break-after: always;
          }

          /* Compact density forced per SYSTEM.md §10b */
          :root {
            --density-row: var(--density-compact-row, 1.25rem);
          }

          /* AIA G703-specific table sizing — 8 cols fit letter portrait */
          .aia-g703 {
            font-size: 8pt;
          }
          .aia-g703 th,
          .aia-g703 td {
            padding: 2pt 3pt !important;
          }
          .aia-g703 th {
            letter-spacing: 0.04em;
            text-transform: uppercase;
          }

          /* G702 header — formal, centered */
          .aia-g702-header {
            font-size: 14pt;
            font-weight: 600;
            text-align: center;
            margin-bottom: 0.05in;
          }
          .aia-g702-subheader {
            font-size: 9pt;
            text-align: center;
            margin-bottom: 0.25in;
          }

          /* Signature block — preserved at G702 bottom */
          .aia-signature {
            margin-top: 0.4in;
            border-top: 1pt solid #000;
            padding-top: 0.2in;
          }
        }
      `}</style>

      {/* Chrome — hidden in print. TD-20 fix: Print button is a CTA action
          → NwButton primary size=md. */}
      <div
        className="print:hidden no-print px-6 py-4 border-b"
        style={{
          borderColor: "var(--border-default)",
          background: "var(--bg-page)",
        }}
      >
        <div className="max-w-[1600px] mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2 text-[12px]">
            <Link
              href={resolvedBackHref}
              className="hover:underline flex items-center gap-1"
              style={{ color: "var(--text-secondary)" }}
            >
              <ArrowLeftIcon className="w-4 h-4" strokeWidth={1.5} /> Back to
              Pay App
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="text-[11px]"
              style={{
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-jetbrains-mono)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Print preview · Pay App #{draw.draw_number}
            </span>
            <NwButton
              variant="primary"
              size="md"
              onClick={() => window.print()}
              aria-label="Print this Pay App"
            >
              <PrinterIcon className="w-3.5 h-3.5" strokeWidth={1.5} /> Print
            </NwButton>
          </div>
        </div>
      </div>

      {/* Print area */}
      <main className="print-area aia-print-root max-w-[8.5in] mx-auto px-4 py-6 text-[10pt]">
        <section className="g702-cover">
          {/* 1. Title block */}
          <h1 className="aia-g702-header text-[14pt] font-semibold text-center mb-1">
            APPLICATION AND CERTIFICATE FOR PAYMENT
          </h1>
          <p className="aia-g702-subheader text-[9pt] text-center mb-4">
            AIA Document G702 · Pay Application #{draw.draw_number}
            {draw.revision_number > 0
              ? ` · Revision ${draw.revision_number}`
              : ""}
          </p>

          {/* 2. Header block — 2x2 grid */}
          <div className="aia-bordered-block grid grid-cols-2 mb-4 text-[10pt]">
            <div className="aia-cell-divider-right aia-cell-divider-bottom p-2">
              <div
                className="text-[7pt] uppercase tracking-wider mb-0.5"
                style={{ letterSpacing: "0.06em" }}
              >
                TO OWNER:
              </div>
              <div className="font-medium">{job.client_name ?? "—"}</div>
              <div>{job.address ?? "—"}</div>
            </div>
            <div className="aia-cell-divider-bottom p-2">
              <div
                className="text-[7pt] uppercase tracking-wider mb-0.5"
                style={{ letterSpacing: "0.06em" }}
              >
                FROM CONTRACTOR:
              </div>
              <div className="font-medium">{contractorName}</div>
              <div>{contractorAddress}</div>
            </div>
            <div className="aia-cell-divider-right p-2">
              <div
                className="text-[7pt] uppercase tracking-wider mb-0.5"
                style={{ letterSpacing: "0.06em" }}
              >
                PROJECT:
              </div>
              <div className="font-medium">{job.name ?? "—"}</div>
              <div>{job.address ?? "—"}</div>
            </div>
            <div className="p-2">
              <div
                className="text-[7pt] uppercase tracking-wider mb-0.5"
                style={{ letterSpacing: "0.06em" }}
              >
                CONTRACT FOR:
              </div>
              <div className="font-medium">
                {job.contract_type === "fixed"
                  ? "Fixed-Price Construction"
                  : "Cost-Plus Construction"}
              </div>
              <div>
                GC Fee: {((job.gc_fee_percentage ?? 0) * 100).toFixed(0)}% ·
                Open-book reimbursable
              </div>
            </div>
          </div>

          {/* 3. Application info row — 4-cell strip */}
          <div className="aia-bordered-block grid grid-cols-4 mb-5 text-[9pt]">
            <div className="aia-cell-divider-right p-2">
              <div
                className="text-[7pt] uppercase tracking-wider"
                style={{ letterSpacing: "0.06em" }}
              >
                Application No.
              </div>
              <div className="aia-mono font-semibold text-[11pt]">
                {draw.draw_number}
              </div>
            </div>
            <div className="aia-cell-divider-right p-2">
              <div
                className="text-[7pt] uppercase tracking-wider"
                style={{ letterSpacing: "0.06em" }}
              >
                Period To
              </div>
              <div className="aia-mono font-semibold">{draw.period_end}</div>
            </div>
            <div className="aia-cell-divider-right p-2">
              <div
                className="text-[7pt] uppercase tracking-wider"
                style={{ letterSpacing: "0.06em" }}
              >
                Application Date
              </div>
              <div className="aia-mono font-semibold">
                {draw.application_date}
              </div>
            </div>
            <div className="p-2">
              <div
                className="text-[7pt] uppercase tracking-wider"
                style={{ letterSpacing: "0.06em" }}
              >
                Project No.
              </div>
              <div className="aia-mono font-semibold">{job.id ?? "—"}</div>
            </div>
          </div>

          {/* 4. Statement of contractor — 7 numbered lines */}
          <div className="text-[10pt] mb-5">
            <div
              className="font-semibold mb-1.5 text-[10pt] uppercase"
              style={{ letterSpacing: "0.06em" }}
            >
              Contractor&apos;s Application for Payment
            </div>
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <tbody>
                <tr className="aia-row-separator">
                  <td className="py-1 pl-3">1. ORIGINAL CONTRACT SUM</td>
                  <td className="aia-mono text-right py-1 pr-3 font-semibold">
                    {fmt(draw.original_contract_sum)}
                  </td>
                </tr>
                {deposit && deposit.pool > 0 && (
                  <tr className="aia-row-separator">
                    <td className="py-1 pl-3">1a. DEPOSIT ON FILE</td>
                    <td className="aia-mono text-right py-1 pr-3">
                      {fmt(deposit.pool)}
                    </td>
                  </tr>
                )}
                <tr className="aia-row-separator">
                  <td className="py-1 pl-3">
                    2. NET CHANGE BY CHANGE ORDERS
                  </td>
                  <td className="aia-mono text-right py-1 pr-3">
                    {fmt(draw.net_change_orders)}
                  </td>
                </tr>
                <tr className="aia-line-bold-top">
                  <td className="py-1 pl-3 font-semibold">
                    3. CONTRACT SUM TO DATE (Line 1 ± 2)
                  </td>
                  <td className="aia-mono text-right py-1 pr-3 font-semibold">
                    {fmt(draw.contract_sum_to_date)}
                  </td>
                </tr>
                <tr className="aia-row-separator">
                  <td className="py-1 pl-3">
                    4. TOTAL COMPLETED &amp; STORED TO DATE
                  </td>
                  <td className="aia-mono text-right py-1 pr-3">
                    {fmt(draw.total_completed_to_date)}
                  </td>
                </tr>
                <tr className="aia-row-separator">
                  <td className="py-1 pl-3">
                    5. RETAINAGE{retainagePct > 0 ? ` (${retainagePct}%)` : ""}
                  </td>
                  <td className="aia-mono text-right py-1 pr-3">
                    {retainageAmount > 0
                      ? `(${fmt(retainageAmount)})`
                      : fmt(0)}
                  </td>
                </tr>
                <tr className="aia-line-bold-top">
                  <td className="py-1 pl-3 font-semibold">
                    6. TOTAL EARNED LESS RETAINAGE (Line 4 − 5)
                  </td>
                  <td className="aia-mono text-right py-1 pr-3 font-semibold">
                    {fmt(totalEarnedLessRetainage)}
                  </td>
                </tr>
                <tr className="aia-row-separator">
                  <td className="py-1 pl-3">
                    7. LESS PREVIOUS CERTIFICATES FOR PAYMENT
                  </td>
                  <td className="aia-mono text-right py-1 pr-3">
                    {fmt(draw.less_previous_payments)}
                  </td>
                </tr>
                {deposit && deposit.applied > 0 && (
                  <tr className="aia-row-separator">
                    <td className="py-1 pl-3">LESS DEPOSIT CREDIT APPLIED</td>
                    <td className="aia-mono text-right py-1 pr-3">
                      ({fmt(deposit.applied)})
                    </td>
                  </tr>
                )}
                {appliedAdjustments.map((a) => (
                  <tr key={a.id} className="aia-row-separator">
                    <td className="py-1 pl-3">
                      {adjustmentTypeLabel(a.adjustment_type).toUpperCase()}
                    </td>
                    <td className="aia-mono text-right py-1 pr-3">
                      {fmt(a.amount_cents)}
                    </td>
                  </tr>
                ))}
                <tr className="aia-line-bold-top aia-line-emphasis">
                  <td className="py-2 pl-3 font-bold text-[12pt]">
                    8. CURRENT PAYMENT DUE
                  </td>
                  <td className="aia-mono text-right py-2 pr-3 font-bold text-[12pt]">
                    {fmt(draw.current_payment_due)}
                  </td>
                </tr>
                <tr className="aia-line-bold-top">
                  <td className="py-1 pl-3 italic">
                    9. BALANCE TO FINISH (incl. retainage)
                  </td>
                  <td className="aia-mono text-right py-1 pr-3 italic">
                    {fmt(draw.balance_to_finish)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 5. Change order summary table */}
          {cosThroughThisDraw.length > 0 && (
            <div className="text-[9pt] mb-5">
              <div
                className="font-semibold mb-1.5 text-[9pt] uppercase"
                style={{ letterSpacing: "0.06em" }}
              >
                Change Order Summary
              </div>
              <table
                className="w-full"
                style={{ borderCollapse: "collapse" }}
              >
                <thead>
                  <tr className="aia-line-emphasis">
                    <th className="aia-table-cell text-left p-1">PCCO #</th>
                    <th className="aia-table-cell text-left p-1">
                      Description
                    </th>
                    <th className="aia-table-cell text-right p-1">Amount</th>
                    <th className="aia-table-cell text-right p-1">GC Fee</th>
                    <th className="aia-table-cell text-right p-1">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {cosThroughThisDraw.map((co) => (
                    <tr key={co.id}>
                      <td className="aia-table-cell aia-mono p-1">
                        {co.pcco_number}
                      </td>
                      <td className="aia-table-cell p-1">{co.description}</td>
                      <td className="aia-table-cell aia-mono p-1 text-right">
                        {fmt(co.amount)}
                      </td>
                      <td className="aia-table-cell aia-mono p-1 text-right">
                        {fmt(co.gc_fee_amount)}
                      </td>
                      <td className="aia-table-cell aia-mono p-1 text-right font-semibold">
                        {fmt(co.total_with_fee)}
                      </td>
                    </tr>
                  ))}
                  <tr className="aia-line-summary">
                    <td
                      className="aia-table-cell p-1 text-right italic"
                      colSpan={4}
                    >
                      Total approved additions:
                    </td>
                    <td className="aia-table-cell aia-mono p-1 text-right">
                      {fmt(coAdditions)}
                    </td>
                  </tr>
                  <tr className="aia-line-summary">
                    <td
                      className="aia-table-cell p-1 text-right italic"
                      colSpan={4}
                    >
                      Total approved deductions:
                    </td>
                    <td className="aia-table-cell aia-mono p-1 text-right">
                      {fmt(coDeductions)}
                    </td>
                  </tr>
                  <tr className="aia-line-emphasis">
                    <td
                      className="aia-table-cell p-1 text-right font-semibold"
                      colSpan={4}
                    >
                      Net change by Change Orders:
                    </td>
                    <td className="aia-table-cell aia-mono p-1 text-right font-bold">
                      {fmt(coAdditions + coDeductions)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* 6. Signature block */}
          <div className="aia-signature text-[9pt]">
            <p
              className="mb-3 leading-snug"
              style={{ textAlign: "justify" }}
            >
              The undersigned Contractor certifies that to the best of the
              Contractor&apos;s knowledge, information and belief the Work
              covered by this Application for Payment has been completed in
              accordance with the Contract Documents, that all amounts have
              been paid by the Contractor for Work for which previous
              Certificates for Payment were issued and payments received from
              the Owner, and that current payment shown herein is now due.
            </p>
            <div className="grid grid-cols-2 gap-8 mt-6">
              <div>
                <div className="aia-signature-line pt-1">
                  {/* Signatory person + title are still fixed to the Ross Built
                      signer — there is no org "pay-app signatory" setting yet
                      (name + title would need one). Org NAME is de-hardcoded.
                      Flagged in STATUS.md for a future org-config field. */}
                  <div className="font-medium">Jake Ross</div>
                  <div className="text-[8pt]">
                    Director of Construction · {contractorName}
                  </div>
                </div>
              </div>
              <div>
                <div className="aia-signature-line pt-1">
                  <div className="font-medium">Date</div>
                  <div className="text-[8pt]">
                    Sign date — application submitted {draw.application_date}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* G703 CONTINUATION SHEET — 80% FIDELITY */}
        <section className="aia-g703">
          <h2 className="aia-g702-header text-[12pt] font-semibold text-center mb-1">
            CONTINUATION SHEET
          </h2>
          <p className="aia-g702-subheader text-[9pt] text-center mb-3">
            AIA Document G703 · {lineItems.length} budget line items
          </p>

          <div className="aia-bordered-block grid grid-cols-3 mb-3 text-[9pt]">
            <div className="aia-cell-divider-right p-2">
              <div
                className="text-[7pt] uppercase tracking-wider"
                style={{ letterSpacing: "0.06em" }}
              >
                Application No.
              </div>
              <div className="aia-mono font-semibold">{draw.draw_number}</div>
            </div>
            <div className="aia-cell-divider-right p-2">
              <div
                className="text-[7pt] uppercase tracking-wider"
                style={{ letterSpacing: "0.06em" }}
              >
                Application Date
              </div>
              <div className="aia-mono font-semibold">
                {draw.application_date}
              </div>
            </div>
            <div className="p-2">
              <div
                className="text-[7pt] uppercase tracking-wider"
                style={{ letterSpacing: "0.06em" }}
              >
                Period To
              </div>
              <div className="aia-mono font-semibold">{draw.period_end}</div>
            </div>
          </div>

          <table
            className="aia-g703 w-full text-[8pt]"
            style={{ borderCollapse: "collapse" }}
          >
            <thead>
              <tr className="aia-line-emphasis">
                <th
                  className="aia-table-cell p-1 text-left"
                  style={{ width: "8%" }}
                >
                  A
                  <br />
                  ITEM
                </th>
                <th
                  className="aia-table-cell p-1 text-left"
                  style={{ width: "30%" }}
                >
                  B
                  <br />
                  DESCRIPTION
                </th>
                <th
                  className="aia-table-cell p-1 text-right"
                  style={{ width: "11%" }}
                >
                  C
                  <br />
                  SCHEDULED VALUE
                </th>
                <th
                  className="aia-table-cell p-1 text-right"
                  style={{ width: "10%" }}
                >
                  D
                  <br />
                  PREVIOUS
                </th>
                <th
                  className="aia-table-cell p-1 text-right"
                  style={{ width: "10%" }}
                >
                  E
                  <br />
                  THIS PERIOD
                </th>
                <th
                  className="aia-table-cell p-1 text-right"
                  style={{ width: "11%" }}
                >
                  F
                  <br />
                  TOTAL TO DATE
                </th>
                <th
                  className="aia-table-cell p-1 text-right"
                  style={{ width: "5%" }}
                >
                  G
                  <br />
                  %
                </th>
                <th
                  className="aia-table-cell p-1 text-right"
                  style={{ width: "11%" }}
                >
                  H
                  <br />
                  BALANCE
                </th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li) => {
                const cc = costCodes.find((c) => c.id === li.cost_code_id);
                const scheduled =
                  li.previous_applications +
                  li.this_period +
                  li.balance_to_finish;
                return (
                  <tr key={li.id} className="print-avoid-break">
                    <td className="aia-table-cell aia-mono p-1">
                      {cc?.code ?? "—"}
                    </td>
                    <td className="aia-table-cell p-1">
                      {cc?.description ?? "—"}
                    </td>
                    <td className="aia-table-cell aia-mono p-1 text-right">
                      {fmt(scheduled)}
                    </td>
                    <td className="aia-table-cell aia-mono p-1 text-right">
                      {fmt(li.previous_applications)}
                    </td>
                    <td className="aia-table-cell aia-mono p-1 text-right">
                      {fmt(li.this_period)}
                    </td>
                    <td className="aia-table-cell aia-mono p-1 text-right font-semibold">
                      {fmt(li.total_to_date)}
                    </td>
                    <td className="aia-table-cell aia-mono p-1 text-right">
                      {(li.percent_complete * 100).toFixed(0)}%
                    </td>
                    <td className="aia-table-cell aia-mono p-1 text-right">
                      {fmt(li.balance_to_finish)}
                    </td>
                  </tr>
                );
              })}
              <tr className="aia-line-grandtotal">
                <td
                  className="aia-table-cell-strong p-1 font-bold"
                  colSpan={2}
                >
                  GRAND TOTAL
                </td>
                <td className="aia-table-cell-strong aia-mono p-1 text-right font-bold">
                  {fmt(grandScheduled)}
                </td>
                <td className="aia-table-cell-strong aia-mono p-1 text-right font-bold">
                  {fmt(grandPrevious)}
                </td>
                <td className="aia-table-cell-strong aia-mono p-1 text-right font-bold">
                  {fmt(grandThisPeriod)}
                </td>
                <td className="aia-table-cell-strong aia-mono p-1 text-right font-bold">
                  {fmt(grandTotal)}
                </td>
                <td className="aia-table-cell-strong aia-mono p-1 text-right font-bold">
                  {grandScheduled > 0
                    ? `${((grandTotal / grandScheduled) * 100).toFixed(0)}%`
                    : "—"}
                </td>
                <td className="aia-table-cell-strong aia-mono p-1 text-right font-bold">
                  {fmt(grandBalance)}
                </td>
              </tr>
            </tbody>
          </table>

          <p className="aia-footer-note text-[7pt] text-center mt-3 italic">
            AIA Document G703 · Continuation Sheet to G702 · Certified for
            Payment Application #{draw.draw_number}
          </p>
        </section>
      </main>
    </>
  );
}
