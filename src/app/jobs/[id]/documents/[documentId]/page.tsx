// src/app/jobs/[id]/documents/[documentId]/page.tsx
//
// Production route — Job document review (Stage 1.5c Plan 3 thin
// wrapper). Mounts DocumentReviewView with discriminator-based
// dispatch (lien_release / plan / contract) keyed off documentId
// prefix.
//
// Per CONTEXT D-19: outer wraps in .design-system-scope.
// Per CONTEXT cross-cutting: lien_release status_history JSONB column
// MISSING in production schema (R.7 violation; F1 gap #7). View renders
// a faked 2-step timeline with explicit F1-fix disclaimer so it can
// never be mistaken for canonical data.
//
// Architect W-5 status: PLACEHOLDER.
//
// Hook T10c — fixture import silent in production paths.

import { notFound } from "next/navigation";
import {
  CALDWELL_LIEN_RELEASES,
  CALDWELL_VENDORS,
  CALDWELL_INVOICES,
  CALDWELL_JOBS,
} from "@/app/design-system/_fixtures/drummond";
import DocumentReviewView from "@/components/prototypes/DocumentReviewView";

export default function JobDocumentPage({
  params,
}: {
  params: { id: string; documentId: string };
}) {
  const documentId = params.documentId;
  const job = CALDWELL_JOBS.find((j) => j.id === params.id);
  if (!job) return notFound();

  const breadcrumbRoot = {
    href: `/jobs/${job.id}`,
    label: job.name,
  };

  // Lien release — direct id match against the fixture (covers both
  // explicit `lr-caldwell-*` prefix and any future renames).
  if (
    documentId.startsWith("lr-caldwell-") ||
    CALDWELL_LIEN_RELEASES.some((l) => l.id === documentId)
  ) {
    const lr = CALDWELL_LIEN_RELEASES.find((l) => l.id === documentId);
    if (!lr) return notFound();
    const vendor = CALDWELL_VENDORS.find((v) => v.id === lr.vendor_id) ?? null;
    const invoice =
      CALDWELL_INVOICES.find((i) => i.id === lr.invoice_id) ?? null;
    return (
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <DocumentReviewView
          type="lien_release"
          lienRelease={lr}
          vendor={vendor ? { id: vendor.id, name: vendor.name } : null}
          invoice={
            invoice
              ? { id: invoice.id, invoice_number: invoice.invoice_number }
              : null
          }
          job={{ id: job.id, name: job.name }}
          breadcrumbRoot={breadcrumbRoot}
          invoiceHref={(invoiceId) => `/financials/bills/${invoiceId}`}
          drawHref={(drawId) => `/financials/pay-apps/${drawId}`}
        />
      </div>
    );
  }

  // Architectural plans stub — any `plan-*` id renders the plan layout.
  if (
    documentId.startsWith("plan-caldwell-") ||
    documentId.startsWith("plan-")
  ) {
    return (
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <DocumentReviewView
          type="plan"
          job={job}
          documentId={documentId}
          breadcrumbRoot={breadcrumbRoot}
        />
      </div>
    );
  }

  // Construction contract stub — any `contract-*` id renders contract.
  if (
    documentId.startsWith("contract-caldwell-") ||
    documentId.startsWith("contract-")
  ) {
    return (
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <DocumentReviewView
          type="contract"
          job={job}
          documentId={documentId}
          breadcrumbRoot={breadcrumbRoot}
        />
      </div>
    );
  }

  return notFound();
}
