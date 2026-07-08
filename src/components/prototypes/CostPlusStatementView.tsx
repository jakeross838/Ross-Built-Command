// src/components/prototypes/CostPlusStatementView.tsx
//
// Cost-Plus Statement renderer (billing_method = 'cost_plus_statement').
// The forked OUTPUT for cost+markup jobs — an invoice-style statement, NOT an
// AIA G702/G703 pay app. Everything upstream (invoice → approve → allocate →
// draw lifecycle) is shared; this only replaces the body + totals. The
// lifecycle controls come from the SHARED <DrawActionBar>.
//
// Structure (per the billing-model decision):
//   header (org identity + client/job/statement#/period)
//   → costs grouped by cost code, subtotaled
//   → cost subtotal
//   → markup line (markup % × subtotal) — own_line only; blended folds it in
//   → credits (deposit applied / retainage / prior payments — nonzero only)
//   → TOTAL DUE
//   → payment terms
//
// Config A markup_display: own_line (open book) | blended (distributed
//   pro-rata into code amounts; identical totals). Config B backup_detail:
//   summary | detailed (vendor·invoice#·amount per code) | detailed_with_pdfs
//   (adds an appended-documents list; the print package merges the stamped
//   PDFs via the existing stamp pipeline).

"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import Card from "@/components/nw/Card";
import Eyebrow from "@/components/nw/Eyebrow";
import Money from "@/components/nw/Money";
import Badge from "@/components/nw/Badge";
import DrawActionBar from "@/components/prototypes/DrawActionBar";
import DrawInvoicesSection from "@/components/prototypes/DrawInvoicesSection";
import { computeStatement } from "@/lib/statement-calc";
import type { StatementViewData, DrawInvoice } from "@/app/financials/pay-apps/[id]/_data";

const STATUS_META: Record<
  string,
  { variant: "neutral" | "accent" | "success" | "warning" | "danger" | "info"; label: string }
> = {
  draft: { variant: "neutral", label: "DRAFT" },
  pm_review: { variant: "warning", label: "PM REVIEW" },
  approved: { variant: "success", label: "APPROVED" },
  submitted: { variant: "info", label: "SUBMITTED" },
  locked: { variant: "info", label: "SUBMITTED" },
  paid: { variant: "success", label: "PAID" },
  void: { variant: "danger", label: "VOID" },
};

export interface CostPlusStatementViewProps {
  drawId: string;
  status: string;
  jobName: string;
  revisionNumber?: number;
  statement: StatementViewData;
  storedSummaryStale?: boolean;
  printHref: string;
  breadcrumbRoot?: { href: string; label: string };
  interactive?: boolean;
  editHref?: string;
  drawInvoices?: DrawInvoice[];
}

function pctLabel(fraction: number): string {
  const p = fraction * 100;
  return `${Number.isInteger(p) ? p.toFixed(0) : p.toFixed(2)}%`;
}

export default function CostPlusStatementView({
  drawId,
  status,
  jobName,
  revisionNumber = 0,
  statement,
  storedSummaryStale = false,
  printHref,
  breadcrumbRoot = { href: "/financials/pay-apps", label: "Draws" },
  interactive = false,
  editHref,
  drawInvoices = [],
}: CostPlusStatementViewProps) {
  const meta = STATUS_META[status] ?? { variant: "neutral" as const, label: status.toUpperCase() };
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const invoicesByCode = (cc: string) => drawInvoices.filter((i) => i.cost_code_id === cc);
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
  // Map cost_code_id -> its backup invoices for detailed rows.
  const invByCode = new Map(statement.costLines.map((l) => [l.cost_code_id, l.invoices]));

  const td = "px-3 py-2 text-[12px]";
  const money = "px-3 py-2 text-[12px] text-right tabular-nums";

  return (
    <div className="px-6 py-8 max-w-[1100px] mx-auto">
      {/* Header band — breadcrumb + statement meta + status + shared actions */}
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
              Statement #{statement.statementNumber}
            </span>
            {revisionNumber > 0 && (
              <>
                <span>·</span>
                <span style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--nw-warn)" }}>
                  Rev {revisionNumber}
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
            {jobName} — Statement #{statement.statementNumber}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
              Period: {statement.periodStart} – {statement.periodEnd}
            </span>
            <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
              Statement date: {statement.applicationDate}
            </span>
            <Badge variant={meta.variant}>{meta.label}</Badge>
            {status === "draft" && storedSummaryStale && (
              <Badge variant="warning">Recomputed — stored value stale</Badge>
            )}
          </div>
        </div>
        <DrawActionBar
          drawId={drawId}
          status={status}
          interactive={interactive}
          editHref={editHref}
          printHref={printHref}
          storedSummaryStale={storedSummaryStale}
        />
      </div>

      <Card padding="lg">
        {/* Statement identity header */}
        <div className="flex items-start justify-between gap-6 pb-4 mb-4 border-b" style={{ borderColor: "var(--border-default)" }}>
          <div>
            {statement.org.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={statement.org.logo_url} alt={statement.org.name} className="h-10 mb-2 object-contain" />
            ) : (
              <div
                className="text-[16px] mb-1"
                style={{ fontFamily: "var(--font-space-grotesk)", fontWeight: 500, color: "var(--text-primary)" }}
              >
                {statement.org.name || "—"}
              </div>
            )}
            <Eyebrow tone="muted">Cost-Plus Statement</Eyebrow>
          </div>
          <div className="text-right text-[12px]" style={{ color: "var(--text-secondary)" }}>
            <div><span style={{ color: "var(--text-tertiary)" }}>Client: </span>{statement.clientName}</div>
            <div><span style={{ color: "var(--text-tertiary)" }}>Project: </span>{jobName}</div>
            <div style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
              Statement #{statement.statementNumber} · {statement.periodStart} – {statement.periodEnd}
            </div>
          </div>
        </div>

        {/* Costs by cost code */}
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontVariantNumeric: "tabular-nums" }}>
            <thead>
              <tr style={{ background: "var(--bg-subtle)" }}>
                <th className={`${td} text-left uppercase`} style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "10px", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>Code</th>
                <th className={`${td} text-left uppercase`} style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "10px", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>Description</th>
                <th className={`${money} uppercase`} style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "10px", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>
                  {statement.markupDisplay === "blended" ? "Amount (incl. markup)" : "Cost this period"}
                </th>
              </tr>
            </thead>
            <tbody>
              {totals.lines.length === 0 && (
                <tr>
                  <td className={td} colSpan={3} style={{ color: "var(--text-tertiary)" }}>
                    No costs on this statement period yet.
                  </td>
                </tr>
              )}
              {totals.lines.map((l) => {
                const composing = invoicesByCode(l.cost_code_id);
                // In detailed modes the invoices show inline (below). In
                // summary mode the row is click-to-expand so every config
                // still drills into a line's composing invoices.
                const expandable = !showBackup && composing.length > 0;
                const isExpanded = expandedCode === l.cost_code_id;
                return (
                <Fragment key={l.cost_code_id}>
                  <tr
                    className={`border-t ${expandable ? "cursor-pointer" : ""}`}
                    style={{ borderColor: "var(--border-subtle)" }}
                    onClick={expandable ? () => setExpandedCode(isExpanded ? null : l.cost_code_id) : undefined}
                  >
                    <td className={td} style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                      {expandable && (
                        <span aria-hidden="true" className="mr-1" style={{ color: "var(--text-tertiary)" }}>{isExpanded ? "▾" : "▸"}</span>
                      )}
                      {l.code}
                    </td>
                    <td className={td} style={{ color: "var(--text-primary)" }}>{l.description}</td>
                    <td className={money}><Money cents={l.amount} size="sm" /></td>
                  </tr>
                  {showBackup &&
                    (invByCode.get(l.cost_code_id) ?? []).map((inv, i) => (
                      <tr key={`${l.cost_code_id}-inv-${i}`}>
                        <td className={td}></td>
                        <td className="px-3 py-1 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                          {inv.vendor}
                          {inv.invoice_number ? ` · #${inv.invoice_number}` : ""}
                        </td>
                        <td className="px-3 py-1 text-[11px] text-right tabular-nums" style={{ color: "var(--text-tertiary)" }}>
                          <Money cents={inv.amount} size="sm" />
                        </td>
                      </tr>
                    ))}
                  {expandable && isExpanded &&
                    composing.map((inv) => (
                      <tr key={`${l.cost_code_id}-exp-${inv.id}`} style={{ background: "var(--bg-subtle)" }}>
                        <td className={td}></td>
                        <td className="px-3 py-1 text-[11px]">
                          <Link href={`/financials/bills/${inv.id}`} className="hover:underline" style={{ color: "var(--nw-stone-blue)" }}>
                            {inv.vendor}{inv.invoice_number ? ` · #${inv.invoice_number}` : ""}
                          </Link>
                        </td>
                        <td className="px-3 py-1 text-[11px] text-right tabular-nums" style={{ color: "var(--text-secondary)" }}>
                          <Money cents={inv.amount} size="sm" />
                        </td>
                      </tr>
                    ))}
                </Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t" style={{ borderColor: "var(--border-default)" }}>
                <td className={td}></td>
                <td className={`${td} uppercase`} style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "10px", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>
                  Cost subtotal
                </td>
                <td className={money}><Money cents={totals.cost_subtotal} size="sm" /></td>
              </tr>
              {totals.showMarkupLine && (
                <tr>
                  <td className={td}></td>
                  <td className={td} style={{ color: "var(--text-primary)" }}>
                    Markup ({pctLabel(totals.markup_percent)})
                  </td>
                  <td className={money}><Money cents={totals.markup_amount} size="sm" /></td>
                </tr>
              )}
              {totals.credits.map((c) => (
                <tr key={c.key}>
                  <td className={td}></td>
                  <td className={td} style={{ color: "var(--text-primary)" }}>{c.label}</td>
                  <td className={money}>
                    <Money cents={-c.amount} size="sm" signColor />
                  </td>
                </tr>
              ))}
              <tr className="border-t-2" style={{ borderColor: "var(--border-strong)" }}>
                <td className={td}></td>
                <td className={`${td} uppercase`} style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "11px", letterSpacing: "0.1em", color: "var(--text-primary)", fontWeight: 600 }}>
                  Total due
                </td>
                <td className={money}><Money cents={totals.total_due} size="md" variant="emphasized" /></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Payment terms */}
        <div className="mt-5 pt-4 border-t" style={{ borderColor: "var(--border-default)" }}>
          <Eyebrow tone="muted" className="mb-1">Payment terms</Eyebrow>
          <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
            Total due is payable per your contract payment terms. Cost-plus, open
            book{statement.markupDisplay === "own_line" ? " — markup shown as its own line above" : " — markup distributed across the line amounts above"}.
          </p>
        </div>

        {/* detailed_with_pdfs: appended supporting documents */}
        {statement.backupDetail === "detailed_with_pdfs" && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border-default)" }}>
            <Eyebrow tone="muted" className="mb-1">Appended documents</Eyebrow>
            <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              Stamped invoice PDFs for every cost above are appended to the printed
              statement package (via the approval-stamp pipeline).
            </p>
          </div>
        )}
      </Card>

      {/* Backup config note (collapsed, mirrors the AIA timeline affordance) */}
      <Card padding="md" className="mt-4">
        <details className="group">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <ChevronRightIcon className="w-3 h-3 shrink-0 transition-transform group-open:rotate-90" aria-hidden="true" strokeWidth={2} style={{ color: "var(--text-tertiary)" }} />
              <Eyebrow tone="muted">Statement configuration</Eyebrow>
            </div>
            <Badge variant="neutral">{statement.markupDisplay === "blended" ? "BLENDED" : "OPEN BOOK"}</Badge>
          </summary>
          <div className="mt-3 text-[11px] space-y-1" style={{ color: "var(--text-secondary)" }}>
            <div>Markup display: <b>{statement.markupDisplay}</b> · rate {pctLabel(statement.markupPercent)}</div>
            <div>Backup detail: <b>{statement.backupDetail}</b></div>
          </div>
        </details>
      </Card>

      <DrawInvoicesSection invoices={drawInvoices} />
    </div>
  );
}
