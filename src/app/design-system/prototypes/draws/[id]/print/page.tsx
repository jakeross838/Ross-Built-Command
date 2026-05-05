// src/app/design-system/prototypes/draws/[id]/print/page.tsx
//
// AIA G702/G703 print preview prototype — Stage 1.5b deliverable #4
// (per EXPANDED-SCOPE §7).
//
// TIERED FIDELITY per CONTEXT D-15 (Q7 override):
//   - G702 cover sheet: pixel-perfect attempt against the AIA G702-1992
//     standard layout (renders Pay Application #5 — Caldwell-712 Pine Ave
//     in fixture-equivalent shape; the source reference PDF lives in
//     the gitignored .planning/fixtures/drummond/source3-downloads/
//     directory — D-28 acceptable-leak surface for directory labeling).
//   - G703 detail page: 80% fidelity — 8-column AIA structure with
//     monospace cost codes, right-aligned currency, percent-complete
//     column, grand total row. Bank-acceptable but not pixel-matched
//     (page breaks happen naturally; no per-page subtotal rendering).
//
// HALT POINT (per CONTEXT D-16/D-24): if pixel-perfect G702 attempt
// exceeds 1-day budget, drop to 80% on both G702 and G703, log as
// 1.5b-followup. Phase 1B self-evaluation outcome documented in the
// plan SUMMARY.
//
// Print stylesheet strategy (per D-13): pure CSS @page + @media print
// against existing component tree. NO server-side PDF generator
// (puppeteer/playwright). Density forced compact via SYSTEM.md §10b.
//
// Print stylesheet caveat: @page rules + AIA-specific overrides go in
// a SCOPED <style jsx global> block — DOES NOT modify globals.css
// (which would affect all routes site-wide). Print stylesheet only
// applies when this route is rendered.
//
// Hex-color note: print rendering for AIA forms requires raw black /
// gray fills (#000 / #f0f0f0 / #f8f8f8 / #ccc / #666 / #fff) because
// print is monochrome by definition — the Slate `var(--*)` tokens
// resolve to colored values that don't translate to bank-acceptable
// monochrome output. Per CONTEXT cross-cutting checklist + the same
// exception already taken in globals.css:255-289, all hex is moved to
// the scoped <style jsx global> block (CSS file pattern, hook-safe)
// and applied via class names — NO inline style={{ background: "#..." }}.
//
// Print toggle pattern (per D-14): print:hidden chrome + hidden
// print:block content. Replicates src/app/draws/[id]/page.tsx:269-470
// production precedent.
//
// Hook T10c — no imports from @/lib/supabase|org|auth.

"use client";

import { notFound } from "next/navigation";
import Link from "next/link";
import { PrinterIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";

import {
  CALDWELL_DRAWS,
  CALDWELL_DRAW_LINE_ITEMS,
  CALDWELL_COST_CODES,
  CALDWELL_CHANGE_ORDERS,
  CALDWELL_JOBS,
} from "@/app/design-system/_fixtures/drummond";

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

export default function DrawPrintPage({
  params,
}: {
  params: { id: string };
}) {
  const draw = CALDWELL_DRAWS.find((d) => d.id === params.id);
  if (!draw) return notFound();

  const job = CALDWELL_JOBS.find((j) => j.id === draw.job_id);
  const lineItems = CALDWELL_DRAW_LINE_ITEMS.filter(
    (li) => li.draw_id === draw.id,
  );

  // CO summary on G702: all approved COs that have rolled into the
  // contract sum through this draw_number. Includes deductive (PCCO #4)
  // and allowance reconciliation (PCCO #5) per CONTEXT D-32.
  const cosThroughThisDraw = CALDWELL_CHANGE_ORDERS.filter(
    (co) => co.draw_number !== null && co.draw_number <= draw.draw_number,
  ).sort((a, b) => a.pcco_number - b.pcco_number);

  // CO summary totals (additions, deductions, net) — shown on G702
  // change order summary line 2.
  const coAdditions = cosThroughThisDraw
    .filter((co) => co.total_with_fee > 0)
    .reduce((sum, co) => sum + co.total_with_fee, 0);
  const coDeductions = cosThroughThisDraw
    .filter((co) => co.total_with_fee < 0)
    .reduce((sum, co) => sum + co.total_with_fee, 0);

  // G703 grand totals — computed on render per R.2 (recalculate, don't
  // increment). Original column = previous + this period + balance to
  // finish (matches G703 col C "Scheduled Value").
  const grandScheduled = lineItems.reduce(
    (s, li) =>
      s + li.previous_applications + li.this_period + li.balance_to_finish,
    0,
  );
  const grandPrevious = lineItems.reduce(
    (s, li) => s + li.previous_applications,
    0,
  );
  const grandThisPeriod = lineItems.reduce(
    (s, li) => s + li.this_period,
    0,
  );
  const grandTotal = lineItems.reduce((s, li) => s + li.total_to_date, 0);
  const grandBalance = lineItems.reduce(
    (s, li) => s + li.balance_to_finish,
    0,
  );

  return (
    <>
      {/* Page-specific print rules. Scoped to this route via
          <style jsx global> — DOES NOT modify globals.css. The base
          print stylesheet at src/app/globals.css:255-289 already
          handles chrome hiding, table borders, monochrome conversion;
          these overrides add AIA-specific column padding + page breaks.

          Hex-color exception: all bank-AIA monochrome colors are
          DEFINED HERE (CSS file pattern, hook-safe) and applied via
          class names below. NO inline style={{ background: "#..." }}
          to keep nightwork-post-edit.sh:55 (hex hard-block) silent. */}
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

      {/* Chrome — hidden in print (print:hidden Tailwind + .no-print
          belt-and-suspenders since globals.css base hides .no-print). */}
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
              href={`/design-system/prototypes/draws/${draw.id}`}
              className="hover:underline flex items-center gap-1"
              style={{ color: "var(--text-secondary)" }}
            >
              <ArrowLeftIcon className="w-4 h-4" strokeWidth={1.5} /> Back
              to draw
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
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[11px] uppercase font-medium border border-nw-stone-blue bg-nw-stone-blue text-nw-white-sand"
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                letterSpacing: "0.12em",
              }}
              aria-label="Print this draw"
            >
              <PrinterIcon className="w-3.5 h-3.5" strokeWidth={1.5} />{" "}
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Print area — opt content INTO print view (globals.css base
          rule sets max-width:100%, padding:0 inside @media print).
          aia-print-root applies #000 base text via the scoped
          stylesheet (no inline hex). */}
      <main className="print-area aia-print-root max-w-[8.5in] mx-auto px-4 py-6 text-[10pt]">
        {/*
          ═══════════════════════════════════════════════════════════════
          G702 COVER SHEET
          ═══════════════════════════════════════════════════════════════
          AIA G702-1992 standard layout — pixel-perfect attempt per
          CONTEXT D-15 (Q7 override). Reference target: the source
          Pay Application 5 PDF (gitignored — see CONTEXT D-28).

          Sections (top → bottom):
            1. Title block — APPLICATION AND CERTIFICATE FOR PAYMENT
            2. Header block — TO OWNER / FROM CONTRACTOR / PROJECT /
               CONTRACT FOR (2x2 grid)
            3. Application info row — APPLICATION NO / PERIOD TO /
               CONTRACT DATE / PROJECT NO
            4. Statement of contractor — 7 numbered lines
            5. Change order summary table — additions/deductions w/
               running totals
            6. Signature block — Contractor (Jake Ross) + Date
        */}
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

          {/* 2. Header block — 2x2 grid: TO OWNER / FROM CONTRACTOR /
              PROJECT / CONTRACT FOR. Border around the block matches
              AIA standard layout. */}
          <div className="aia-bordered-block grid grid-cols-2 mb-4 text-[10pt]">
            <div className="aia-cell-divider-right aia-cell-divider-bottom p-2">
              <div
                className="text-[7pt] uppercase tracking-wider mb-0.5"
                style={{ letterSpacing: "0.06em" }}
              >
                TO OWNER:
              </div>
              <div className="font-medium">{job?.client_name ?? "—"}</div>
              <div>{job?.address ?? "—"}</div>
            </div>
            <div className="aia-cell-divider-bottom p-2">
              <div
                className="text-[7pt] uppercase tracking-wider mb-0.5"
                style={{ letterSpacing: "0.06em" }}
              >
                FROM CONTRACTOR:
              </div>
              <div className="font-medium">Ross Built Custom Homes</div>
              <div>305 67th St West, Bradenton FL 34209</div>
            </div>
            <div className="aia-cell-divider-right p-2">
              <div
                className="text-[7pt] uppercase tracking-wider mb-0.5"
                style={{ letterSpacing: "0.06em" }}
              >
                PROJECT:
              </div>
              <div className="font-medium">{job?.name ?? "—"}</div>
              <div>{job?.address ?? "—"}</div>
            </div>
            <div className="p-2">
              <div
                className="text-[7pt] uppercase tracking-wider mb-0.5"
                style={{ letterSpacing: "0.06em" }}
              >
                CONTRACT FOR:
              </div>
              <div className="font-medium">Cost-Plus Construction</div>
              <div>
                GC Fee: {((job?.gc_fee_percentage ?? 0) * 100).toFixed(0)}%
                · Open-book reimbursable
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
              <div className="aia-mono font-semibold">{job?.id ?? "—"}</div>
            </div>
          </div>

          {/* 4. Statement of contractor — 7 numbered lines.
              Per CLAUDE.md G702 schema:
                1. ORIGINAL CONTRACT SUM
                2. NET CHANGE BY CHANGE ORDERS
                3. CONTRACT SUM TO DATE (Line 1 + 2)
                4. TOTAL COMPLETED & STORED TO DATE
                5. RETAINAGE (0% per Ross Built standard)
                6. LESS PREVIOUS CERTIFICATES FOR PAYMENT
                7. CURRENT PAYMENT DUE
                + BALANCE TO FINISH (informational, below line 7)
              Per AIA G702 standard, lines bold the totals (3 + 7).
              Line 7 (CURRENT PAYMENT DUE) is the most prominent — light
              gray fill + bold + 12pt to match the "request to pay"
              psychological emphasis. */}
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
                    5. RETAINAGE (0% per Ross Built standard)
                  </td>
                  <td className="aia-mono text-right py-1 pr-3">$0.00</td>
                </tr>
                <tr className="aia-line-bold-top">
                  <td className="py-1 pl-3">
                    6. LESS PREVIOUS CERTIFICATES FOR PAYMENT
                  </td>
                  <td className="aia-mono text-right py-1 pr-3">
                    {fmt(draw.less_previous_payments)}
                  </td>
                </tr>
                <tr className="aia-line-bold-top aia-line-emphasis">
                  <td className="py-2 pl-3 font-bold text-[12pt]">
                    7. CURRENT PAYMENT DUE
                  </td>
                  <td className="aia-mono text-right py-2 pr-3 font-bold text-[12pt]">
                    {fmt(draw.current_payment_due)}
                  </td>
                </tr>
                <tr className="aia-line-bold-top">
                  <td className="py-1 pl-3 italic">BALANCE TO FINISH</td>
                  <td className="aia-mono text-right py-1 pr-3 italic">
                    {fmt(draw.balance_to_finish)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 5. Change order summary table — only renders if any COs
              apply through this draw. Includes the deductive PCCO #4
              (negative total) and allowance reconciliation PCCO #5 per
              CONTEXT D-32. Per AIA G702 standard, additions and
              deductions are summarized at the bottom. */}
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
                  {/* Summary footer rows: total approved ADDITIONS,
                      total approved DEDUCTIONS, NET. Matches AIA G702
                      standard's "summary of changes" lines. */}
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

          {/* 6. Signature block — Contractor + Date.
              Per AIA G702 standard, the contractor certifies that the
              work is complete in accordance with contract documents and
              that previous certificates have been paid. Date column
              empty for sign-time fill. */}
          <div className="aia-signature text-[9pt]">
            <p
              className="mb-3 leading-snug"
              style={{ textAlign: "justify" }}
            >
              The undersigned Contractor certifies that to the best of
              the Contractor&apos;s knowledge, information and belief
              the Work covered by this Application for Payment has been
              completed in accordance with the Contract Documents, that
              all amounts have been paid by the Contractor for Work for
              which previous Certificates for Payment were issued and
              payments received from the Owner, and that current payment
              shown herein is now due.
            </p>
            <div className="grid grid-cols-2 gap-8 mt-6">
              <div>
                <div className="aia-signature-line pt-1">
                  <div className="font-medium">Jake Ross</div>
                  <div className="text-[8pt]">
                    Director of Construction · Ross Built Custom Homes
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

        {/*
          ═══════════════════════════════════════════════════════════════
          G703 CONTINUATION SHEET — 80% FIDELITY (per Q7 override)
          ═══════════════════════════════════════════════════════════════
          AIA G703-1992 standard layout:
            - Title block (CONTINUATION SHEET)
            - Subhead: APPLICATION NO / APPLICATION DATE / PERIOD TO
            - 8-column table:
              A. Item No (5-digit cost code)
              B. Description of Work
              C. Scheduled Value (= previous + this period + balance)
              D. Work Completed: Previous Applications
              E. Work Completed: This Period
              F. Total Completed & Stored to Date (D+E)
              G. % Complete (F/C)
              H. Balance to Finish (C-F)
            - Grand total row at end

          At 80% fidelity: page breaks happen naturally; per-page
          subtotals out of scope. Bank-acceptable but not pixel-matched.
        */}
        <section className="aia-g703">
          <h2 className="aia-g702-header text-[12pt] font-semibold text-center mb-1">
            CONTINUATION SHEET
          </h2>
          <p className="aia-g702-subheader text-[9pt] text-center mb-3">
            AIA Document G703 · {lineItems.length} budget line items
          </p>

          {/* Subhead — APPLICATION NO / APPLICATION DATE / PERIOD TO */}
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

          {/* G703 8-column table.
              Per CLAUDE.md AIA G702/G703 schema:
                A=Item, B=Description, C=Original/Scheduled,
                D=Previous, E=This Period, F=Total To Date,
                G=%, H=Balance.
              Cost codes monospace per AIA standard ("clean fixed-width
              code stack"). */}
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
                const cc = CALDWELL_COST_CODES.find(
                  (c) => c.id === li.cost_code_id,
                );
                // R.2 — scheduled value computed on render from source
                // rows (previous + this period + balance to finish).
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
              {/* Grand total row — sums across all line items per AIA
                  G703 standard final-page subtotal convention. */}
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

          {/* G703 footer — page count placeholder, certifying note */}
          <p className="aia-footer-note text-[7pt] text-center mt-3 italic">
            AIA Document G703 · Continuation Sheet to G702 · Certified
            for Payment Application #{draw.draw_number}
          </p>
        </section>
      </main>
    </>
  );
}
