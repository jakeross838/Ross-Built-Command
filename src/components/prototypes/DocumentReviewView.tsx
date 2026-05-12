// src/components/prototypes/DocumentReviewView.tsx
//
// DocumentReviewView — Document Review pattern (generic, 3 sub-types).
// Stage 1.5c Plan 3 extraction; copies InvoiceReviewView pattern (Document
// Review per PATTERNS.md §2). Handles 3 document discriminators:
//   - lr-* — lien release (CaldwellLienRelease)
//   - plan-* — architectural plans stub (synthesized)
//   - contract-* — construction contract stub (synthesized)
//
// Pure props-only View component. Wrapper handles fixture lookup +
// discriminator resolution; this View renders by accepting a typed
// discriminator on the props.
//
// AMENDMENT inheritance per nwrp48: Status timeline collapsed by default
// per CHANGE 2. Native <details>/<summary> with chevron + eyebrow + inline
// step count + status badge.
//
// TD fixes per CONTEXT D-06:
//   - TD-20: 1 raw button (Mark received) → NwButton primary
//   - TD-25/26: All Card padding=md / fontWeight=500 (already clean)
//
// Tenant-blind by construction.

"use client";

import Link from "next/link";
import {
  PaperClipIcon,
  DocumentTextIcon,
  ScaleIcon,
  CheckBadgeIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

import type {
  CaldwellJob,
  CaldwellLienRelease,
  CaldwellLienReleaseType,
  CaldwellLienReleaseStatus,
} from "@/app/design-system/_fixtures/drummond/types";

import Card from "@/components/nw/Card";
import Eyebrow from "@/components/nw/Eyebrow";
import Money from "@/components/nw/Money";
import DataRow from "@/components/nw/DataRow";
import Badge from "@/components/nw/Badge";
import NwButton from "@/components/nw/Button";

// Discriminated props — wrapper resolves the document type and passes
// the appropriate shape.
export type DocumentReviewViewProps =
  | {
      type: "lien_release";
      lienRelease: CaldwellLienRelease;
      vendor: { id: string; name: string } | null;
      invoice: { id: string; invoice_number: string | null } | null;
      job: { id: string; name: string } | null;
      breadcrumbRoot?: { href: string; label: string };
      invoiceHref?: (invoiceId: string) => string;
      drawHref?: (drawId: string) => string;
    }
  | {
      type: "plan";
      job: CaldwellJob;
      breadcrumbRoot?: { href: string; label: string };
      documentId: string;
    }
  | {
      type: "contract";
      job: CaldwellJob;
      breadcrumbRoot?: { href: string; label: string };
      documentId: string;
    };

// Florida 4-statute reference per CLAUDE.md §Lien.
const STATUTE_LABEL: Record<
  CaldwellLienReleaseType,
  { label: string; statute: string }
> = {
  conditional_progress: {
    label: "Conditional waiver — progress payment",
    statute: "Florida Statute 713.20(2)(a)",
  },
  unconditional_progress: {
    label: "Unconditional waiver — progress payment",
    statute: "Florida Statute 713.20(2)(c)",
  },
  conditional_final: {
    label: "Conditional waiver — final payment",
    statute: "Florida Statute 713.20(2)(b)",
  },
  unconditional_final: {
    label: "Unconditional waiver — final payment",
    statute: "Florida Statute 713.20(2)(d)",
  },
};

const LIEN_STATUS_BADGE: Record<
  CaldwellLienReleaseStatus,
  {
    variant: "neutral" | "accent" | "success" | "warning" | "danger" | "info";
    label: string;
  }
> = {
  not_required: { variant: "neutral", label: "NOT REQUIRED" },
  pending: { variant: "warning", label: "PENDING" },
  received: { variant: "success", label: "RECEIVED" },
  waived: { variant: "info", label: "WAIVED" },
};

// ─── Sub-component: lien release ──────────────────────────────────────
function LienReleaseLayout({
  lr,
  vendor,
  invoice,
  job,
  breadcrumbRoot,
  invoiceHref,
  drawHref,
}: {
  lr: CaldwellLienRelease;
  vendor: { id: string; name: string } | null;
  invoice: { id: string; invoice_number: string | null } | null;
  job: { id: string; name: string } | null;
  breadcrumbRoot: { href: string; label: string };
  invoiceHref?: (id: string) => string;
  drawHref?: (id: string) => string;
}) {
  const statute = STATUTE_LABEL[lr.release_type];
  const status = LIEN_STATUS_BADGE[lr.status];

  // Build timeline (faked client-side per F1 gap #7).
  const timeline: Array<{ when: string; what: string; done: boolean }> = [];
  timeline.push({
    when: invoice
      ? // received_date isn't on the trimmed shape — wrapper passes
        // received_date via a separate prop if needed. For now fallback to
        // lr.release_date or "—".
        lr.release_date ?? "—"
      : "—",
    what: "REQUESTED with invoice",
    done: true,
  });
  if (lr.status === "received" && lr.release_date) {
    timeline.push({
      when: lr.release_date,
      what: "RECEIVED — signed and notarized",
      done: true,
    });
  }
  if (lr.status === "pending") {
    timeline.push({
      when: "Pending",
      what: "AWAITING signed waiver",
      done: false,
    });
  }

  const resolvedInvoiceHref =
    invoiceHref ?? ((id: string) => `${breadcrumbRoot.href}invoices/${id}`);
  const resolvedDrawHref =
    drawHref ?? ((id: string) => `${breadcrumbRoot.href}draws/${id}`);

  return (
    <div className="px-6 py-8 max-w-[1600px] mx-auto">
      {/* Header band */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <div
            className="flex items-center gap-2 text-[10px] uppercase mb-2"
            style={{
              fontFamily: "var(--font-jetbrains-mono)",
              letterSpacing: "0.14em",
              color: "var(--text-tertiary)",
            }}
          >
            <Link href={breadcrumbRoot.href} className="hover:underline">
              {breadcrumbRoot.label}
            </Link>
            <span>›</span>
            <span>Documents</span>
            <span>›</span>
            <span>{lr.id}</span>
          </div>
          <h1
            className="text-[24px] mb-2 nw-direction-headline"
            style={{
              fontFamily: "var(--font-space-grotesk)",
              letterSpacing: "-0.02em",
              fontWeight: 500,
              color: "var(--text-primary)",
            }}
          >
            Lien release — {vendor?.name ?? "Unknown vendor"}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <Money cents={lr.amount_through} size="lg" variant="emphasized" />
            <Badge variant={status.variant}>{status.label}</Badge>
            <span
              className="text-[11px]"
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                color: "var(--text-tertiary)",
              }}
            >
              {statute.statute}
            </span>
          </div>
        </div>
        {/* TD-20 fix: NwButton replaces raw "Mark received" button. */}
        <div className="flex items-center gap-2">
          <NwButton variant="primary" size="md">
            <CheckBadgeIcon className="w-3.5 h-3.5" strokeWidth={1.5} /> Mark
            received
          </NwButton>
        </div>
      </div>

      {/* Hero grid 50/50 */}
      <div
        className="grid grid-cols-1 lg:grid-cols-2 mb-6"
        style={{
          gap: "1px",
          background: "var(--border-default)",
          borderTop: "1px solid var(--border-default)",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        {/* LEFT — file preview */}
        <div className="p-5" style={{ background: "var(--bg-card)" }}>
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
            <ScaleIcon
              className="w-8 h-8 mb-3"
              strokeWidth={1.25}
              style={{ color: "var(--text-tertiary)" }}
              aria-hidden="true"
            />
            <span
              className="text-[10px] uppercase"
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                letterSpacing: "0.14em",
                color: "var(--text-tertiary)",
              }}
            >
              Lien release PDF preview
            </span>
            <span
              className="text-[10px] mt-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              react-pdf · sticky on desktop
            </span>
          </div>
        </div>

        {/* RIGHT — structured fields */}
        <div
          className="p-5 space-y-4"
          style={{ background: "var(--bg-card)" }}
        >
          <Card padding="md">
            <Eyebrow tone="accent" className="mb-3">
              Lien details
            </Eyebrow>
            <div className="grid grid-cols-1 gap-3">
              <DataRow label="Type" value={statute.label} />
              <DataRow label="Statute" value={statute.statute} />
              <DataRow label="Vendor" value={vendor?.name ?? "—"} />
              <DataRow label="Project" value={job?.name ?? "—"} />
              <DataRow
                label="Invoice"
                value={
                  invoice ? (
                    <Link
                      href={resolvedInvoiceHref(invoice.id)}
                      className="hover:underline"
                      style={{ color: "var(--nw-stone-blue)" }}
                    >
                      {invoice.invoice_number ?? invoice.id}
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
              <DataRow
                label="Amount through"
                value={
                  <Money
                    cents={lr.amount_through}
                    size="md"
                    variant="emphasized"
                  />
                }
              />
              <DataRow label="Release date" value={lr.release_date ?? "—"} />
              {lr.draw_id && (
                <DataRow
                  label="Pay App"
                  value={
                    <Link
                      href={resolvedDrawHref(lr.draw_id)}
                      className="hover:underline"
                      style={{ color: "var(--nw-stone-blue)" }}
                    >
                      Pay App #{lr.draw_id.replace("d-caldwell-", "")}
                    </Link>
                  }
                />
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* AMENDMENT CHANGE 2 inheritance — Status timeline collapsed by
          default. Native <details>/<summary>. */}
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
            <div
              className="mb-3 p-3 text-[10px] leading-relaxed"
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                background: "var(--bg-subtle)",
                color: "var(--text-tertiary)",
                borderLeft: "2px solid var(--nw-warn)",
              }}
            >
              Note:{" "}
              <code style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                lien_releases.status_history
              </code>{" "}
              JSONB column does not yet exist in the production schema (R.7
              violation per CURRENT-STATE A.2 / F1 gap #7). F1 adds the
              column. This timeline is faked client-side for prototype
              rendering only.
            </div>
            <ul className="space-y-2 text-[12px]">
              {timeline.map((e, i) => (
                <li key={i} className="flex items-baseline gap-2.5">
                  <span
                    className="w-2 h-2 mt-1 shrink-0"
                    style={{
                      borderRadius: "var(--radius-dot)",
                      background: e.done ? "var(--nw-success)" : "transparent",
                      border: e.done
                        ? "none"
                        : "1px solid var(--text-tertiary)",
                    }}
                    aria-hidden="true"
                  />
                  <span
                    className="text-[10px] uppercase shrink-0"
                    style={{
                      fontFamily: "var(--font-jetbrains-mono)",
                      letterSpacing: "0.1em",
                      color: "var(--text-tertiary)",
                      width: "120px",
                    }}
                  >
                    {e.when}
                  </span>
                  <span
                    style={{
                      color: e.done
                        ? "var(--text-primary)"
                        : "var(--text-secondary)",
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

// ─── Sub-component: architectural plans stub ──────────────────────────
function PlanLayout({
  job,
  breadcrumbRoot,
  documentId,
}: {
  job: CaldwellJob;
  breadcrumbRoot: { href: string; label: string };
  documentId: string;
}) {
  return (
    <div className="px-6 py-8 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <div
          className="flex items-center gap-2 text-[10px] uppercase mb-2"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            letterSpacing: "0.14em",
            color: "var(--text-tertiary)",
          }}
        >
          <Link href={breadcrumbRoot.href} className="hover:underline">
            {breadcrumbRoot.label}
          </Link>
          <span>›</span>
          <span>Documents</span>
          <span>›</span>
          <span>{documentId}</span>
        </div>
        <h1
          className="text-[24px] mb-2 nw-direction-headline"
          style={{
            fontFamily: "var(--font-space-grotesk)",
            letterSpacing: "-0.02em",
            fontWeight: 500,
            color: "var(--text-primary)",
          }}
        >
          Architectural plans — {job.name}
        </h1>
        <Badge variant="neutral">PLAN STUB</Badge>
      </div>

      <div
        className="grid grid-cols-1 lg:grid-cols-2 mb-6"
        style={{
          gap: "1px",
          background: "var(--border-default)",
          borderTop: "1px solid var(--border-default)",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        <div className="p-5" style={{ background: "var(--bg-card)" }}>
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
              aria-hidden="true"
            />
            <span
              className="text-[10px] uppercase"
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                letterSpacing: "0.14em",
                color: "var(--text-tertiary)",
              }}
            >
              Plans PDF preview (sanitized)
            </span>
          </div>
        </div>
        <div
          className="p-5 space-y-4"
          style={{ background: "var(--bg-card)" }}
        >
          <Card padding="md">
            <Eyebrow tone="accent" className="mb-3">
              Sheet metadata
            </Eyebrow>
            <div className="grid grid-cols-1 gap-3">
              <DataRow label="Project" value={job.name} />
              <DataRow label="Sheet" value="A-101 First floor plan" />
              <DataRow label="Revision" value="Rev 2 (issued 2025-09-15)" />
              <DataRow label="Architect" value="(sanitized)" />
              <DataRow label="Scale" value="1/4 in = 1 ft" />
            </div>
          </Card>
        </div>
      </div>

      <Card padding="md">
        <Eyebrow tone="muted" className="mb-2">
          Notes
        </Eyebrow>
        <p
          className="text-[12px] leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          The plans entity is MISSING from the current schema (per
          CURRENT-STATE A.4). VISION proposes a first-class{" "}
          <code style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
            documents
          </code>{" "}
          table (Wave 2). For 1.5b prototype, the Document Review pattern is
          exercised against this stub to validate the gold-standard
          layout&apos;s reach beyond invoices/draws.
        </p>
      </Card>
    </div>
  );
}

// ─── Sub-component: construction contract stub ────────────────────────
function ContractLayout({
  job,
  breadcrumbRoot,
  documentId,
}: {
  job: CaldwellJob;
  breadcrumbRoot: { href: string; label: string };
  documentId: string;
}) {
  return (
    <div className="px-6 py-8 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <div
          className="flex items-center gap-2 text-[10px] uppercase mb-2"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            letterSpacing: "0.14em",
            color: "var(--text-tertiary)",
          }}
        >
          <Link href={breadcrumbRoot.href} className="hover:underline">
            {breadcrumbRoot.label}
          </Link>
          <span>›</span>
          <span>Documents</span>
          <span>›</span>
          <span>{documentId}</span>
        </div>
        <h1
          className="text-[24px] mb-2 nw-direction-headline"
          style={{
            fontFamily: "var(--font-space-grotesk)",
            letterSpacing: "-0.02em",
            fontWeight: 500,
            color: "var(--text-primary)",
          }}
        >
          Construction agreement — {job.name}
        </h1>
        <div className="flex items-center gap-3">
          <Money
            cents={job.original_contract_amount}
            size="lg"
            variant="emphasized"
          />
          <Badge variant="success">EXECUTED</Badge>
        </div>
      </div>

      <div
        className="grid grid-cols-1 lg:grid-cols-2 mb-6"
        style={{
          gap: "1px",
          background: "var(--border-default)",
          borderTop: "1px solid var(--border-default)",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        <div className="p-5" style={{ background: "var(--bg-card)" }}>
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
            <DocumentTextIcon
              className="w-8 h-8 mb-3"
              strokeWidth={1.25}
              style={{ color: "var(--text-tertiary)" }}
              aria-hidden="true"
            />
            <span
              className="text-[10px] uppercase"
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                letterSpacing: "0.14em",
                color: "var(--text-tertiary)",
              }}
            >
              Contract DOCX preview (sanitized)
            </span>
          </div>
        </div>
        <div
          className="p-5 space-y-4"
          style={{ background: "var(--bg-card)" }}
        >
          <Card padding="md">
            <Eyebrow tone="accent" className="mb-3">
              Contract details
            </Eyebrow>
            <div className="grid grid-cols-1 gap-3">
              <DataRow label="Project" value={job.name} />
              <DataRow label="Client" value={job.client_name} />
              <DataRow label="Address" value={job.address} />
              <DataRow
                label="Contract type"
                value={
                  job.contract_type
                    ? job.contract_type.replaceAll("_", " ").toUpperCase()
                    : "—"
                }
              />
              <DataRow
                label="Original amount"
                value={
                  <Money
                    cents={job.original_contract_amount}
                    size="md"
                    variant="emphasized"
                  />
                }
              />
              <DataRow
                label="Current amount"
                value={
                  <Money cents={job.current_contract_amount} size="md" />
                }
              />
              <DataRow
                label="GC fee"
                value={`${(job.gc_fee_percentage * 100).toFixed(0)}%`}
              />
              <DataRow
                label="Deposit"
                value={`${(job.deposit_percentage * 100).toFixed(0)}%`}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function DocumentReviewView(props: DocumentReviewViewProps) {
  const breadcrumbRoot =
    props.breadcrumbRoot ?? {
      href: "/design-system/prototypes/",
      label: "Prototypes",
    };

  if (props.type === "lien_release") {
    return (
      <LienReleaseLayout
        lr={props.lienRelease}
        vendor={props.vendor}
        invoice={props.invoice}
        job={props.job}
        breadcrumbRoot={breadcrumbRoot}
        invoiceHref={props.invoiceHref}
        drawHref={props.drawHref}
      />
    );
  }
  if (props.type === "plan") {
    return (
      <PlanLayout
        job={props.job}
        breadcrumbRoot={breadcrumbRoot}
        documentId={props.documentId}
      />
    );
  }
  // contract
  return (
    <ContractLayout
      job={props.job}
      breadcrumbRoot={breadcrumbRoot}
      documentId={props.documentId}
    />
  );
}
