// src/app/design-system/prototypes/vendors/[id]/page.tsx
//
// Thin wrapper for the vendor detail prototype (Stage 1.5c Plan 3a).
// Mirrors the production wrapper at /people/vendors/[id] but
// (a) invoiceHref + breadcrumbRoot stay inside the prototypes gallery and
// (b) no inner .design-system-scope wrap — prototypes/layout.tsx provides it.
//
// Hook T10c — fixture import silent in design-system paths.

import { notFound } from "next/navigation";
import {
  CALDWELL_VENDORS,
  CALDWELL_INVOICES,
  CALDWELL_LIEN_RELEASES,
  CALDWELL_COST_CODES,
} from "@/app/design-system/_fixtures/drummond";
import VendorDetailView from "@/components/prototypes/VendorDetailView";

export default function VendorDetailPrototypePage({
  params,
}: {
  params: { id: string };
}) {
  const vendor = CALDWELL_VENDORS.find((v) => v.id === params.id);
  if (!vendor) return notFound();

  const invoices = CALDWELL_INVOICES.filter((i) => i.vendor_id === vendor.id);
  const lienReleases = CALDWELL_LIEN_RELEASES.filter(
    (lr) => lr.vendor_id === vendor.id,
  );

  return (
    <VendorDetailView
      vendor={vendor}
      invoices={invoices}
      lienReleases={lienReleases}
      costCodes={CALDWELL_COST_CODES}
      invoiceHref={(invoiceId) =>
        `/design-system/prototypes/invoices/${invoiceId}`
      }
      breadcrumbRoot={{
        href: "/design-system/prototypes/vendors",
        label: "Vendors",
      }}
    />
  );
}
