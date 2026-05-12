// src/app/design-system/prototypes/documents/[id]/page.tsx
//
// Thin wrapper for the document review prototype (Stage 1.5c Plan 3a).
// Mirrors the production wrapper at /jobs/[id]/documents/[documentId]
// but dispatches solely on the documentId-prefix (no separate jobId in
// the route; resolves to the first Caldwell job for the prototype
// gallery surface).
//
// Doc types (per Stage 1.5b deliverable #7):
//   - lr-caldwell-*       → CaldwellLienRelease lookup
//   - plan-caldwell-*     → architectural plans stub
//   - contract-caldwell-* → construction contract stub
//
// No inner .design-system-scope wrap — prototypes/layout.tsx provides it.
//
// Hook T10c — fixture import silent in design-system paths.

import { notFound } from "next/navigation";
import {
  CALDWELL_LIEN_RELEASES,
  CALDWELL_VENDORS,
  CALDWELL_INVOICES,
  CALDWELL_JOBS,
} from "@/app/design-system/_fixtures/drummond";
import DocumentReviewView from "@/components/prototypes/DocumentReviewView";

export default function DocumentReviewPrototypePage({
  params,
}: {
  params: { id: string };
}) {
  const documentId = params.id;

  // Prototype-gallery context: pick the first Caldwell job. Production
  // route at /jobs/[id]/documents/[documentId] resolves the job from
  // the parent route segment.
  const job = CALDWELL_JOBS[0];
  if (!job) return notFound();

  const breadcrumbRoot = {
    href: "/design-system/prototypes/",
    label: "Prototypes",
  };

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
        invoiceHref={(invoiceId) =>
          `/design-system/prototypes/invoices/${invoiceId}`
        }
        drawHref={(drawId) => `/design-system/prototypes/draws/${drawId}`}
      />
    );
  }

  if (
    documentId.startsWith("plan-caldwell-") ||
    documentId.startsWith("plan-")
  ) {
    return (
      <DocumentReviewView
        type="plan"
        job={job}
        documentId={documentId}
        breadcrumbRoot={breadcrumbRoot}
      />
    );
  }

  if (
    documentId.startsWith("contract-caldwell-") ||
    documentId.startsWith("contract-")
  ) {
    return (
      <DocumentReviewView
        type="contract"
        job={job}
        documentId={documentId}
        breadcrumbRoot={breadcrumbRoot}
      />
    );
  }

  return notFound();
}
