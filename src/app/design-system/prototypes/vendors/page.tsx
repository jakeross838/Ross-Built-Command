// src/app/design-system/prototypes/vendors/page.tsx
//
// Thin wrapper for the vendors list prototype (Stage 1.5c Plan 3a).
// Mirrors the production wrapper at /people/vendors but
// (a) detailHref + breadcrumbRoot point inside the prototypes gallery and
// (b) no inner .design-system-scope wrap — prototypes/layout.tsx provides it.
//
// Hook T10c — fixture import silent in design-system paths.

import {
  CALDWELL_VENDORS,
  CALDWELL_INVOICES,
  CALDWELL_COST_CODES,
} from "@/app/design-system/_fixtures/drummond";
import VendorListView from "@/components/prototypes/VendorListView";

export default function VendorsListPrototypePage() {
  return (
    <VendorListView
      vendors={CALDWELL_VENDORS}
      invoices={CALDWELL_INVOICES}
      costCodes={CALDWELL_COST_CODES}
      detailHref={(vendorId) => `/design-system/prototypes/vendors/${vendorId}`}
      breadcrumbRoot={{
        href: "/design-system/prototypes/",
        label: "Prototypes",
      }}
    />
  );
}
