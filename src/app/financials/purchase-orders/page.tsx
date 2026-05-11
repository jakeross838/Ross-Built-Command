// src/app/financials/purchase-orders/page.tsx
// F1 placeholder per Stage 1.5c Plan 4 — org-wide PO list.
//
// iter-2 architect W-5 status: PLACEHOLDER. Job-scoped POs already
// exist at /jobs/[id]/purchase-orders; F1 unifies them into this
// org-wide view.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function PurchaseOrdersPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <NwPlaceholderCard
        eyebrow="Financials · Purchase Orders"
        headline="Org-wide PO list"
        body="Org-wide purchase orders across every active job. Job-scoped POs already live at /jobs/[id]/purchase-orders; F1 unifies them with org-wide filtering, vendor rollups, and PO-vs-bill reconciliation."
        wave="F1"
      />
    </div>
  );
}
