// src/components/prototypes/InvoiceReviewView.tsx
//
// InvoiceReviewView — Document Review pattern exemplar (Stage 1.5c Plan 2
// + AMENDMENT per nwrp48).
//
// Pure props-only View component. Accepts pre-resolved fixture data via props;
// imports NO runtime fixtures (type-only imports OK). Plan 3 implementers
// COPY THIS PATTERN VERBATIM when extracting the 9 remaining prototype
// components — InvoiceReviewView is the canonical Document Review reference.
//
// File preview LEFT, structured fields right-rail, audit timeline BELOW
// (per .planning/design/PATTERNS.md "Document Review" pattern).
//
// Plan 2 AMENDMENT (per Jake nwrp48 — landed before Plan 3 spawns):
//   - CHANGE 2: AI Parse Confidence panel + Status Timeline panel both
//     collapsed by default with inline summaries visible. Both are
//     diagnostic/audit information, not workflow data — approver needs
//     invoice details + budget context up top, audit detail one click
//     away. Pattern: native <details>/<summary> (already used in
//     design-system/patterns/page.tsx; zero JS state; accessibility
//     built-in via aria-expanded). The same pattern applies to both
//     panels for visual consistency. Plan 3's 6 InvoiceReviewView
//     consumers (DocumentReviewView, DrawApprovalView, ReconciliationView,
//     MobileApprovalView, OwnerDashboardView, OwnerDrawView) inherit the
//     collapsed-by-default contract by copying this pattern verbatim.
//
// Wrapper-View boundary:
//   - Wrapper at src/app/design-system/prototypes/invoices/[id]/page.tsx
//     (and future production routes at src/app/financials/bills/[id]/page.tsx)
//     does fixture lookup + passes resolved entities into this View.
//   - This View renders. No fixture lookup, no DB query, no auth.
//   - F1 swaps wrapper-side fixture imports for real Supabase queries.
//     This View is unchanged at F1.
//
// TD fixes applied (per CONTEXT D-06):
//   - TD-20: NwButton replaces raw button elements (Reject + Push to QB)
//   - TD-25: All Card padding=md (no padding=lg — already clean in source)
//   - TD-26: All headlines fontWeight: 500 (no 600 — already clean in source)
//
// Visual parity bar (per CONTEXT D-07):
//   This component must render IDENTICALLY to the iter-1 prototype source.
//   The only acceptable visual differences are TD-20-attributable (NwButton
//   styling vs raw button styling) — these should be subtle: same height,
//   same padding, same colors.
//
// Tenant-blind by construction — accepts no org_id / membership / vendor_id.
// All imports are tenant-blind primitives or fixture-shape types.

"use client";

import Link from "next/link";
import {
  PaperClipIcon,
  CheckBadgeIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

import type {
  CaldwellInvoice,
  CaldwellInvoiceConfidenceDetails,
  CaldwellInvoiceStatus,
} from "@/app/design-system/_fixtures/drummond/types";

import Card from "@/components/nw/Card";
import Eyebrow from "@/components/nw/Eyebrow";
import Money from "@/components/nw/Money";
import DataRow from "@/components/nw/DataRow";
import Badge from "@/components/nw/Badge";
import NwButton from "@/components/nw/Button";

export interface InvoiceReviewViewProps {
  invoice: CaldwellInvoice;
  vendor: { id: string; name: string };
  job: { id: string; name: string };
  costCode: { id: string; code: string; description: string } | null;
  /** Optional breadcrumb root link. Defaults to /design-system/prototypes/. */
  breadcrumbRoot?: { href: string; label: string };
}

// Map invoice status -> Badge variant. Mirrors confidence routing colors per CLAUDE.md.
// Note: Badge.tsx uses "warning" (not "warn") for the yellow tone.
const STATUS_BADGE: Record<
  CaldwellInvoiceStatus,
  {
    variant: "neutral" | "accent" | "success" | "warning" | "danger" | "info";
    label: string;
  }
> = {
  received: { variant: "neutral", label: "RECEIVED" },
  ai_processed: { variant: "warning", label: "AI PROCESSED" }, // yellow flag (70-84%)
  pm_review: { variant: "warning", label: "PM REVIEW" },
  pm_approved: { variant: "success", label: "PM APPROVED" },
  pm_held: { variant: "warning", label: "PM HELD" },
  pm_denied: { variant: "danger", label: "PM DENIED" },
  qa_review: { variant: "info", label: "QA REVIEW" },
  qa_approved: { variant: "success", label: "QA APPROVED" },
  qa_kicked_back: { variant: "danger", label: "QA KICKED BACK" },
  pushed_to_qb: { variant: "success", label: "PUSHED TO QB" },
  in_draw: { variant: "info", label: "IN DRAW" },
  paid: { variant: "success", label: "PAID" },
};

// Confidence color encoding per CLAUDE.md routing thresholds.
function confidenceTone(score: number): "success" | "warning" | "danger" {
  if (score >= 0.85) return "success";
  if (score >= 0.7) return "warning";
  return "danger";
}

// Build a faked status timeline from the invoice's terminal status.
// CaldwellInvoice doesn't carry status_history JSONB (per F1 gap). The
// timeline below shows the workflow path that would have been taken to
// reach the current status — labeled as faked client-side.
function buildTimeline(inv: CaldwellInvoice) {
  const steps: Array<{ when: string; what: string; done: boolean }> = [];
  const r = inv.received_date;
  steps.push({ when: `${r} · 10:04`, what: "RECEIVED via email-in", done: true });
  if (
    [
      "ai_processed",
      "pm_review",
      "pm_approved",
      "qa_review",
      "qa_approved",
      "pushed_to_qb",
      "in_draw",
      "paid",
    ].includes(inv.status)
  ) {
    steps.push({
      when: `${r} · 10:06`,
      what: `AI PARSED · ${(inv.confidence_score * 100).toFixed(0)}% confidence`,
      done: true,
    });
  }
  if (
    [
      "pm_review",
      "pm_approved",
      "qa_review",
      "qa_approved",
      "pushed_to_qb",
      "in_draw",
      "paid",
    ].includes(inv.status)
  ) {
    steps.push({ when: `${r} · 11:18`, what: "PM ASSIGNED · Brent Mullins", done: true });
  }
  if (
    [
      "pm_approved",
      "qa_review",
      "qa_approved",
      "pushed_to_qb",
      "in_draw",
      "paid",
    ].includes(inv.status)
  ) {
    steps.push({ when: `${r} · 14:22`, what: "PM APPROVED", done: true });
  }
  if (
    ["qa_review", "qa_approved", "pushed_to_qb", "in_draw", "paid"].includes(inv.status)
  ) {
    steps.push({ when: `${r} · 16:00`, what: "QA REVIEW · Diane", done: true });
  }
  if (["qa_approved", "pushed_to_qb", "in_draw", "paid"].includes(inv.status)) {
    steps.push({ when: `${r} · 17:30`, what: "QA APPROVED", done: true });
  }
  if (["pushed_to_qb", "in_draw", "paid"].includes(inv.status)) {
    steps.push({ when: `${r} · 17:35`, what: "PUSHED TO QB", done: true });
  }
  if (inv.status === "in_draw" && inv.draw_id) {
    steps.push({
      when: `${r} · 18:00`,
      what: `IN DRAW · ${inv.draw_id}`,
      done: true,
    });
  }
  if (inv.status === "paid" && inv.payment_date) {
    steps.push({
      when: `${inv.payment_date} · 09:00`,
      what: "PAID via check (Ross Built schedule)",
      done: true,
    });
  }
  return steps;
}

// Confidence per-field grid for AI parse panel.
function ConfidenceGrid({ details }: { details: CaldwellInvoiceConfidenceDetails }) {
  const fieldKeys = Object.keys(details) as Array<keyof CaldwellInvoiceConfidenceDetails>;
  return (
    <div className="grid grid-cols-2 gap-2 text-[11px]">
      {fieldKeys.map((k) => {
        const tone = confidenceTone(details[k]);
        return (
          <div
            key={k}
            className="flex items-center justify-between p-2"
            style={{ background: "var(--bg-subtle)" }}
          >
            <span style={{ color: "var(--text-secondary)" }}>
              {k.replaceAll("_", " ")}
            </span>
            <Badge variant={tone}>{(details[k] * 100).toFixed(0)}%</Badge>
          </div>
        );
      })}
    </div>
  );
}

export default function InvoiceReviewView({
  invoice,
  vendor,
  job,
  costCode,
  breadcrumbRoot = { href: "/design-system/prototypes/", label: "Prototypes" },
}: InvoiceReviewViewProps) {
  const inv = invoice;
  const status = STATUS_BADGE[inv.status];
  const timeline = buildTimeline(inv);

  return (
    <div className="px-6 py-8 max-w-[1600px] mx-auto">
      {/* Header band — breadcrumb + invoice meta + status + actions */}
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
            <span style={{ fontFamily: "var(--font-jetbrains-mono)" }}>Invoices</span>
            <span>/</span>
            <span style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
              {inv.invoice_number ?? inv.id}
            </span>
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
            {vendor?.name ?? "Unknown vendor"}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <Money cents={inv.total_amount} size="lg" variant="emphasized" />
            <Badge variant={status.variant}>{status.label}</Badge>
            <span
              className="text-[10px]"
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                color: "var(--text-tertiary)",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              {inv.invoice_type.replaceAll("_", " ")}
            </span>
          </div>
        </div>
        {/* TD-20 fix: NwButton replaces raw button elements. The two
            actions (Reject + Push to QB) match NwButton's secondary +
            primary variants exactly, with size="md" matching the
            original h-36px / px-4 / text-11px styling. */}
        <div className="flex items-center gap-2">
          <NwButton variant="secondary" size="md">
            <XMarkIcon className="w-3.5 h-3.5" strokeWidth={1.5} /> Reject
          </NwButton>
          <NwButton variant="primary" size="md">
            <CheckBadgeIcon className="w-3.5 h-3.5" strokeWidth={1.5} /> Push to QB
          </NwButton>
        </div>
      </div>

      {/* Hero grid 50/50 — analog: patterns/page.tsx:314-404 */}
      <div
        className="grid grid-cols-1 lg:grid-cols-2 mb-6"
        style={{ gap: "1px", background: "var(--border-default)" }}
      >
        {/* LEFT — file preview placeholder (per PATTERNS.md §2 file preview LEFT) */}
        <div
          data-pattern-slot="file-preview"
          className="p-5"
          style={{ background: "var(--bg-card)" }}
        >
          <Eyebrow tone="muted" className="mb-3">
            Source document
          </Eyebrow>
          <div
            className="aspect-[3/4] border flex flex-col items-center justify-center"
            style={{
              background: "var(--bg-subtle)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <PaperClipIcon
              className="w-8 h-8 mb-3"
              strokeWidth={1.25}
              style={{ color: "var(--text-tertiary)" }}
            />
            <span
              className="text-[10px] uppercase"
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                letterSpacing: "0.18em",
                color: "var(--text-tertiary)",
              }}
            >
              {inv.original_file_url ?? "Invoice PDF preview"}
            </span>
            <span
              className="text-[10px] mt-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              react-pdf · sticky on desktop (F1)
            </span>
          </div>
        </div>

        {/* RIGHT — right-rail panels (per PATTERNS.md §2 structured fields RIGHT) */}
        <div
          data-pattern-slot="right-rail"
          className="p-5 space-y-4"
          style={{ background: "var(--bg-card)" }}
        >
          <Card padding="md">
            <Eyebrow tone="accent" className="mb-3">
              Invoice details
            </Eyebrow>
            <div className="grid grid-cols-2 gap-3">
              <DataRow label="Invoice #" value={inv.invoice_number ?? "—"} />
              <DataRow label="Date" value={inv.invoice_date ?? "—"} />
              <DataRow label="Vendor" value={vendor?.name ?? "—"} />
              <DataRow label="Project" value={job?.name ?? "—"} />
              <DataRow
                label="Cost code"
                value={
                  costCode ? `${costCode.code} · ${costCode.description}` : "—"
                }
              />
              <DataRow label="PO #" value={inv.po_id ?? "—"} />
              <DataRow label="Received" value={inv.received_date} />
              <DataRow label="Payment" value={inv.payment_date ?? "—"} />
            </div>
          </Card>

          {/* CHANGE 2 per nwrp48 — AI parse confidence panel collapsed by
              default. Inline summary in the <summary> shows overall %, flag
              count, and confidence tone so the approver sees the gist
              without expanding. Click to expand the per-field grid + flag
              detail. Native <details>/<summary> chosen for zero JS state +
              built-in aria-expanded; pattern already used in design-system
              playground (patterns/page.tsx:134). Plan 3's 6 InvoiceReviewView
              consumers inherit by copying this pattern verbatim. */}
          <Card padding="md">
            <details className="group">
              <summary
                className="cursor-pointer list-none flex items-center justify-between gap-3"
                aria-label="Toggle AI parse confidence detail"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ChevronRightIcon
                    className="w-3 h-3 shrink-0 transition-transform group-open:rotate-90"
                    aria-hidden="true"
                    strokeWidth={2}
                    style={{ color: "var(--text-tertiary)" }}
                  />
                  <Eyebrow tone="muted">AI parse confidence</Eyebrow>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={confidenceTone(inv.confidence_score)}>
                    {(inv.confidence_score * 100).toFixed(0)}%
                  </Badge>
                  {inv.flags.length > 0 && (
                    <span
                      className="text-[10px] flex items-center gap-1"
                      style={{
                        fontFamily: "var(--font-jetbrains-mono)",
                        color: "var(--nw-warn)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      <ExclamationTriangleIcon
                        className="w-3 h-3"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      {inv.flags.length} flag{inv.flags.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </summary>
              <div className="mt-3">
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="text-[11px]"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Per-field confidence
                  </span>
                </div>
                <ConfidenceGrid details={inv.confidence_details} />
                {inv.flags.length > 0 && (
                  <div
                    className="mt-3 flex items-start gap-1.5 text-[11px]"
                    style={{ color: "var(--nw-warn)" }}
                  >
                    <ExclamationTriangleIcon
                      className="w-3.5 h-3.5 mt-0.5 shrink-0"
                      strokeWidth={1.5}
                    />
                    <span style={{ color: "var(--text-secondary)" }}>
                      {inv.flags.join(" · ")}
                    </span>
                  </div>
                )}
              </div>
            </details>
          </Card>

          {/* Line items panel */}
          {inv.line_items.length > 0 && (
            <Card padding="md">
              <Eyebrow tone="muted" className="mb-2">
                Line items · {inv.line_items.length}
              </Eyebrow>
              <ul
                className="divide-y"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                {inv.line_items.map((li, i) => (
                  <li
                    key={i}
                    className="py-2 flex items-start justify-between gap-3 text-[12px]"
                  >
                    <div className="min-w-0 flex-1">
                      <div
                        className="leading-snug"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {li.description}
                      </div>
                      {li.qty !== null && li.unit && li.rate !== null && (
                        <div
                          className="text-[10px] mt-0.5"
                          style={{
                            fontFamily: "var(--font-jetbrains-mono)",
                            color: "var(--text-tertiary)",
                          }}
                        >
                          {li.qty} {li.unit} @ ${li.rate.toLocaleString()}
                        </div>
                      )}
                    </div>
                    <Money cents={li.amount} size="sm" />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {/* CHANGE 2 per nwrp48 — Status timeline panel collapsed by default.
          Inline summary in <summary> shows step count + last/terminal status
          label so the approver sees the gist without expanding. Click to
          expand the full reconstructed timeline. Same native <details>
          pattern as the AI parse confidence panel (above) — both panels use
          identical pattern for visual consistency. Audit timeline still
          renders BELOW the hero grid per PATTERNS.md §2. */}
      <Card padding="md" data-pattern-slot="audit-timeline">
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
            <div
              className="mb-3 text-[10px]"
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                color: "var(--text-tertiary)",
                letterSpacing: "0.04em",
              }}
            >
              Note: timeline reconstructed from terminal status. Real
              status_history JSONB lands in F1.
            </div>
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
    </div>
  );
}
