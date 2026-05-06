// src/app/people/vendors/page.tsx
//
// Production route — Vendors list (Stage 1.5c Plan 3 thin wrapper).
// Mounts VendorListView with all Caldwell vendors.
//
// Architect W-5 status: PLACEHOLDER (no prior implementation at this
// path; legacy /vendors route 301-redirects here per Plan 1 redirects).
//
// Per CONTEXT D-19: outer wraps in .design-system-scope.
//
// Hook T10c — fixture import silent in production paths.

import {
  CALDWELL_VENDORS,
  CALDWELL_INVOICES,
  CALDWELL_COST_CODES,
} from "@/app/design-system/_fixtures/drummond";
import VendorListView from "@/components/prototypes/VendorListView";

export default function VendorsListPage() {
  return (
    <div data-direction="C" data-palette="B" className="design-system-scope">
      <VendorListView
        vendors={CALDWELL_VENDORS}
        invoices={CALDWELL_INVOICES}
        costCodes={CALDWELL_COST_CODES}
        detailHref={(vendorId) => `/people/vendors/${vendorId}`}
        breadcrumbRoot={{ href: "/people/vendors", label: "Vendors" }}
      />
    </div>
  );
}
