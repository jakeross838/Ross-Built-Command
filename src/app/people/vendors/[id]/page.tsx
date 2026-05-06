// src/app/people/vendors/[id]/page.tsx
//
// Production route — Vendor detail (Stage 1.5c Plan 3 thin wrapper).
// Mounts VendorDetailView with the resolved vendor + recent invoices +
// lien releases.
//
// Architect W-5 status: PLACEHOLDER.
//
// Per CONTEXT D-19: outer wraps in .design-system-scope.
//
// Hook T10c — fixture import silent in production paths.

import { notFound } from "next/navigation";
import {
  CALDWELL_VENDORS,
  CALDWELL_INVOICES,
  CALDWELL_LIEN_RELEASES,
  CALDWELL_COST_CODES,
} from "@/app/design-system/_fixtures/drummond";
import VendorDetailView from "@/components/prototypes/VendorDetailView";

export default function VendorDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const vendor = CALDWELL_VENDORS.find((v) => v.id === params.id);
  if (!vendor) return notFound();

  // Pre-filter: invoices + lien releases for this vendor only — passed
  // through; the View handles further sorting + display logic.
  const invoices = CALDWELL_INVOICES.filter((i) => i.vendor_id === vendor.id);
  const lienReleases = CALDWELL_LIEN_RELEASES.filter(
    (lr) => lr.vendor_id === vendor.id,
  );

  return (
    <div data-direction="C" data-palette="B" className="design-system-scope">
      <VendorDetailView
        vendor={vendor}
        invoices={invoices}
        lienReleases={lienReleases}
        costCodes={CALDWELL_COST_CODES}
        invoiceHref={(invoiceId) => `/financials/bills/${invoiceId}`}
        breadcrumbRoot={{ href: "/people/vendors", label: "Vendors" }}
      />
    </div>
  );
}
