// src/components/prototypes/DrawApprovalView.tsx
//
// DrawApprovalView — Document Review pattern (Pay App approval).
// Stage 1.5c Plan 3 extraction; copies InvoiceReviewView pattern verbatim
// (including AMENDMENT collapsible-panel contract per nwrp48).
//
// Pure props-only View component. Accepts pre-resolved fixture data via
// props; type-only imports from Caldwell fixtures (no runtime fixture
// imports). Wrapper at production /financials/pay-apps/[id] + portfolio
// /design-system/prototypes/draws/[id] does fixture lookup + passes
// resolved entities into this View.
//
// Pattern: Document Review (PATTERNS.md §2). G702 summary LEFT (Pay App
// summary card + Change Order list) + G703 line items RIGHT
// (continuation sheet). Status timeline collapsed by default per
// AMENDMENT CHANGE 2 — both audit/diagnostic panels collapse with native
// <details>/<summary>.
//
// Bills/Pay Apps terminology per CONTEXT D-01: UI labels say "Pay App"
// not "Draw". Component file name retains Draw* internally for
// code-search continuity per CONTEXT D-01 scope clarification.
//
// TD fixes applied (per CONTEXT D-06):
//   - TD-20: NwButton replaces 3 raw button elements (Print link unchanged
//     because it's a Link not a button-action; Send back + Approve as
//     NwButton secondary + primary)
//   - TD-25: All Card padding=md (no padding=lg — already clean)
//   - TD-26: All headlines fontWeight: 500 (no 600 — already clean)
//
// Tenant-blind by construction.

"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";

import type {
  CaldwellDraw,
  CaldwellDrawStatus,
  CaldwellDrawLineItem,
  CaldwellChangeOrder,
  CaldwellCostCode,
} from "@/app/design-system/_fixtures/drummond/types";
import type { DrawInvoice } from "@/app/financials/pay-apps/[id]/_data";

import Card from "@/components/nw/Card";
import Eyebrow from "@/components/nw/Eyebrow";
import Money from "@/components/nw/Money";
import DataRow from "@/components/nw/DataRow";
import Badge from "@/components/nw/Badge";
import DrawActionBar from "@/components/prototypes/DrawActionBar";
import DrawInvoicesSection from "@/components/prototypes/DrawInvoicesSection";

export interface DrawApprovalViewProps {
  draw: CaldwellDraw;
  job: { id: string; name: string };
  lineItems: CaldwellDrawLineItem[];
  costCodes: CaldwellCostCode[];
  /** Approved change orders rolled into the contract sum through this draw. */
  changeOrdersThroughThisDraw: CaldwellChangeOrder[];
  /** F6-family D3 (nwrp286 Q3): display-only — stored G702 summary diverges
   *  from a from-source recompute. Badge shows on DRAFT draws only. */
  storedSummaryStale?: boolean;
  /** Optional href for the print preview action. Defaults to portfolio path. */
  printHref?: string;
  /** Optional breadcrumb root link. Defaults to /design-system/prototypes/. */
  breadcrumbRoot?: { href: string; label: string };
  /** When true, the action bar (Submit / Approve / Send back / Void / Refresh
   *  totals) posts to the real /api/draws/[id] endpoints and refreshes. The
   *  production /financials/pay-apps/[id] route passes this. The portfolio
   *  prototype gallery leaves it false so its fixture UUIDs never fire a POST. */
  interactive?: boolean;
  /** Where to go after a draft is edited. Production passes the wizard edit URL. */
  editHref?: string;
  /** Invoices linked to this draw (drill-down + per-line expansion). */
  drawInvoices?: DrawInvoice[];
}

const STATUS_BADGE: Record<
  CaldwellDrawStatus,
  {
    variant: "neutral" | "accent" | "success" | "warning" | "danger" | "info";
    label: string;
  }
> = {
  draft: { variant: "neutral", label: "DRAFT" },
  pm_review: { variant: "warning", label: "PM REVIEW" },
  approved: { variant: "success", label: "APPROVED" },
  submitted: { variant: "info", label: "SUBMITTED" },
  paid: { variant: "success", label: "PAID" },
  void: { variant: "danger", label: "VOID" },
};

// Build status timeline from the draw's terminal status. CaldwellDraw
// doesn't carry status_history JSONB (per F1 gap). The timeline is
// reconstructed for prototype rendering only and clearly labeled as such.
function buildTimeline(draw: CaldwellDraw) {
  const steps: Array<{ when: string; what: string; done: boolean }> = [];
  steps.push({
    when: draw.application_date,
    what: `DRAFTED · period ${draw.period_start} – ${draw.period_end}`,
    done: true,
  });
  if (draw.submitted_at) {
    steps.push({
      when: draw.submitted_at.slice(0, 10),
      what: "SUBMITTED to owner",
      done: true,
    });
  }
  if (draw.paid_at) {
    steps.push({ when: draw.paid_at.slice(0, 10), what: "PAID", done: true });
  }
  return steps;
}

export default function DrawApprovalView({
  draw,
  job,
  lineItems,
  costCodes,
  changeOrdersThroughThisDraw,
  storedSummaryStale = false,
  printHref,
  breadcrumbRoot = { href: "/design-system/prototypes/", label: "Prototypes" },
  interactive = false,
  editHref,
  drawInvoices = [],
}: DrawApprovalViewProps) {
  const status = STATUS_BADGE[draw.status];
  const timeline = buildTimeline(draw);
  const resolvedPrintHref =
    printHref ?? `${breadcrumbRoot.href}draws/${draw.id}/print`;
  // Per-line drill-down: which cost code's composing invoices are expanded.
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const invoicesByCode = (cc: string) => drawInvoices.filter((i) => i.cost_code_id === cc);

  return (
    <div className="px-6 py-8 max-w-[1600px] mx-auto">
      {/* Header band — breadcrumb + Pay App meta + status + actions */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <div
            className="flex items-center gap-2 text-[12px] mb-2"
            style={{ color: "var(--text-tertiary)" }}
          >
            <Link href={breadcrumbRoot.href} className="hover:underline">
              {breadcrumbRoot.label}
            </Link>
            <span>/</span>
            <span style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
              Draw #{draw.draw_number}
            </span>
            {draw.revision_number > 0 && (
              <>
                <span>·</span>
                <span
                  style={{
                    fontFamily: "var(--font-jetbrains-mono)",
                    color: "var(--nw-warn)",
                  }}
                >
                  Rev {draw.revision_number}
                </span>
              </>
            )}
          </div>
          <h1
            className="text-[24px] mb-2 nw-direction-headline"
            style={{
              fontFamily: "var(--font-space-grotesk)",
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
            }}
          >
            {job.name} — Pay App #{draw.draw_number}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className="text-[12px]"
              style={{ color: "var(--text-secondary)" }}
            >
              Period: {draw.period_start} – {draw.period_end}
            </span>
            <span
              className="text-[12px]"
              style={{ color: "var(--text-secondary)" }}
            >
              Application: {draw.application_date}
            </span>
            <Badge variant={status.variant}>{status.label}</Badge>
            {draw.status === "draft" && storedSummaryStale && (
              <Badge variant="warning">Recomputed — stored value stale</Badge>
            )}
          </div>
        </div>
        <DrawActionBar
          drawId={draw.id}
          status={draw.status}
          interactive={interactive}
          editHref={editHref}
          printHref={resolvedPrintHref}
          storedSummaryStale={storedSummaryStale}
        />
      </div>

      {/* Hero grid — LEFT: G702 summary, RIGHT: G703 line items */}
      <div
        className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] mb-6"
        style={{ gap: "1px", background: "var(--border-default)" }}
      >
        {/* LEFT — G702 cover sheet summary */}
        <div className="p-5 space-y-4" style={{ background: "var(--bg-card)" }}>
          <Eyebrow tone="accent">G702 — Application & Certificate</Eyebrow>
          <Card padding="md">
            <div className="space-y-3">
              <DataRow
                label="Original contract sum"
                value={<Money cents={draw.original_contract_sum} size="md" />}
              />
              <DataRow
                label="Net change orders"
                value={
                  <Money cents={draw.net_change_orders} size="md" signColor />
                }
              />
              <DataRow
                label="Contract sum to date"
                value={
                  <Money
                    cents={draw.contract_sum_to_date}
                    size="md"
                    variant="emphasized"
                  />
                }
              />
              <DataRow
                label="Total completed to date"
                value={<Money cents={draw.total_completed_to_date} size="md" />}
              />
              <DataRow
                label="Less previous payments"
                value={<Money cents={draw.less_previous_payments} size="md" />}
              />
              <DataRow
                label="Current payment due"
                value={
                  <Money
                    cents={draw.current_payment_due}
                    size="md"
                    variant="emphasized"
                  />
                }
              />
              <DataRow
                label="Balance to finish"
                value={<Money cents={draw.balance_to_finish} size="md" />}
              />
            </div>
          </Card>

          {changeOrdersThroughThisDraw.length > 0 && (
            <Card padding="md">
              <Eyebrow tone="muted" className="mb-3">
                Change orders · {changeOrdersThroughThisDraw.length}
              </Eyebrow>
              <ul className="space-y-3 text-[12px]">
                {changeOrdersThroughThisDraw.map((co) => (
                  <li
                    key={co.id}
                    className="flex items-start justify-between gap-3"
                  >
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
                        PCCO #{co.pcco_number}
                      </div>
                      <div
                        className="leading-snug"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {/* Length-truncate only — splitting on "." broke
                            descriptions containing periods ("plan revision
                            #3 7.14" → "...#3 7"; "Ext. Column Wraps" →
                            "Ext"). Bank-facing copy; N1 per nwrp274. */}
                        {co.description.length > 160
                          ? `${co.description.slice(0, 160).trimEnd()}…`
                          : co.description}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div
                        style={{
                          fontFamily: "var(--font-jetbrains-mono)",
                          fontSize: "9px",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--text-tertiary)",
                          marginBottom: "1px",
                        }}
                      >
                        With fee
                      </div>
                      <Money cents={co.total_with_fee} size="sm" signColor />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* RIGHT — G703 line items table */}
        <div className="p-5" style={{ background: "var(--bg-card)" }}>
          <Eyebrow tone="accent" className="mb-3">
            G703 — Continuation sheet · {lineItems.length} line items
          </Eyebrow>
          <div className="overflow-x-auto">
            <table
              className="w-full text-[10px]"
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <thead>
                <tr style={{ background: "var(--bg-subtle)" }}>
                  {[
                    "Item",
                    "Description",
                    "Original",
                    "Previous",
                    "This period",
                    "Total to date",
                    "%",
                    "Balance",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-2 py-2 text-left border"
                      style={{
                        borderColor: "var(--border-default)",
                        color: "var(--text-secondary)",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        fontSize: "9px",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lineItems.map((li) => {
                  const cc = costCodes.find((c) => c.id === li.cost_code_id);
                  // R.2 — "Original" estimate per AIA G703 reconstructed
                  // from the row: previous + this period + balance to
                  // finish (basic G703 contract math).
                  const originalEstimate =
                    li.previous_applications +
                    li.this_period +
                    li.balance_to_finish;
                  const composing = invoicesByCode(li.cost_code_id);
                  const isExpanded = expandedCode === li.cost_code_id;
                  return (
                    <Fragment key={li.id}>
                    <tr
                      className={composing.length > 0 ? "cursor-pointer" : ""}
                      onClick={
                        composing.length > 0
                          ? () => setExpandedCode(isExpanded ? null : li.cost_code_id)
                          : undefined
                      }
                    >
                      <td
                        className="px-2 py-1.5 border"
                        style={{ borderColor: "var(--border-subtle)" }}
                      >
                        {composing.length > 0 && (
                          <span aria-hidden="true" className="inline-block mr-1" style={{ color: "var(--text-tertiary)" }}>
                            {isExpanded ? "▾" : "▸"}
                          </span>
                        )}
                        {cc?.code ?? "—"}
                      </td>
                      <td
                        className="px-2 py-1.5 border"
                        style={{
                          borderColor: "var(--border-subtle)",
                          fontFamily: "var(--font-inter, inherit)",
                        }}
                      >
                        {cc?.description ?? "—"}
                      </td>
                      <td
                        className="px-2 py-1.5 border text-right"
                        style={{ borderColor: "var(--border-subtle)" }}
                      >
                        $
                        {(originalEstimate / 100).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td
                        className="px-2 py-1.5 border text-right"
                        style={{ borderColor: "var(--border-subtle)" }}
                      >
                        $
                        {(li.previous_applications / 100).toLocaleString(
                          undefined,
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )}
                      </td>
                      <td
                        className="px-2 py-1.5 border text-right"
                        style={{ borderColor: "var(--border-subtle)" }}
                      >
                        $
                        {(li.this_period / 100).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td
                        className="px-2 py-1.5 border text-right"
                        style={{ borderColor: "var(--border-subtle)" }}
                      >
                        $
                        {(li.total_to_date / 100).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td
                        className="px-2 py-1.5 border text-right"
                        style={{ borderColor: "var(--border-subtle)" }}
                      >
                        {(li.percent_complete * 100).toFixed(1)}%
                      </td>
                      <td
                        className="px-2 py-1.5 border text-right"
                        style={{ borderColor: "var(--border-subtle)" }}
                      >
                        $
                        {(li.balance_to_finish / 100).toLocaleString(
                          undefined,
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )}
                      </td>
                    </tr>
                    {isExpanded && composing.length > 0 && (
                      <tr>
                        <td className="border px-2 py-1" style={{ borderColor: "var(--border-subtle)" }}></td>
                        <td className="border px-2 py-1" colSpan={7} style={{ borderColor: "var(--border-subtle)", background: "var(--bg-subtle)" }}>
                          <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", marginBottom: "2px" }}>
                            Composed of {composing.length} invoice(s)
                          </div>
                          {composing.map((inv) => (
                            <div key={inv.id} className="flex items-center justify-between gap-3 py-0.5">
                              <Link href={`/financials/bills/${inv.id}`} className="hover:underline" style={{ color: "var(--nw-stone-blue)" }}>
                                {inv.vendor}{inv.invoice_number ? ` · #${inv.invoice_number}` : ""}
                              </Link>
                              <span className="tabular-nums" style={{ color: "var(--text-secondary)" }}>
                                ${(inv.amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* AMENDMENT CHANGE 2 inheritance per nwrp48 — Status timeline panel
          collapsed by default with inline summary visible. Same native
          <details> pattern as InvoiceReviewView. Click chevron to expand
          the full reconstructed timeline. */}
      <Card padding="md">
        <details className="group">
          <summary
            className="cursor-pointer list-none flex items-center justify-between gap-3"
            aria-label="Toggle status timeline detail"
          >
            <div className="flex items-center gap-2 min-w-0">
              <ChevronRightIcon
                className="w-3 h-3 shrink-0 transition-transform group-open:rotate-90"
                aria-hidden="true"
                strokeWidth={2}
                style={{ color: "var(--text-tertiary)" }}
              />
              <Eyebrow tone="muted">Status timeline</Eyebrow>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className="text-[10px]"
                style={{
                  fontFamily: "var(--font-jetbrains-mono)",
                  color: "var(--text-tertiary)",
                  letterSpacing: "0.04em",
                }}
              >
                {timeline.length} step{timeline.length === 1 ? "" : "s"}
              </span>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
          </summary>
          <div className="mt-3">
            <ul className="space-y-2 text-[12px]">
              {timeline.map((e, i) => (
                <li key={i} className="flex items-baseline gap-3">
                  <span
                    className="w-1.5 h-1.5 mt-1 shrink-0"
                    style={{
                      borderRadius: "var(--radius-dot)",
                      background: e.done
                        ? "var(--nw-stone-blue)"
                        : "var(--border-default)",
                    }}
                  />
                  <span
                    className="text-[10px] shrink-0"
                    style={{
                      fontFamily: "var(--font-jetbrains-mono)",
                      color: "var(--text-tertiary)",
                      minWidth: "140px",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {e.when}
                  </span>
                  <span
                    style={{
                      color: e.done
                        ? "var(--text-primary)"
                        : "var(--text-tertiary)",
                    }}
                  >
                    {e.what}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      </Card>

      <DrawInvoicesSection invoices={drawInvoices} />
    </div>
  );
}
