// src/app/financials/change-orders/page.tsx
// F1 placeholder per Stage 1.5c Plan 4 — org-wide change order list.
//
// iter-2 architect W-5 status: PLACEHOLDER. Job-scoped COs already
// exist at /jobs/[id]/change-orders; F1 unifies them into this
// org-wide view.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function ChangeOrdersPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <NwPlaceholderCard
        eyebrow="Financials · Change Orders"
        headline="Org-wide change order list"
        body="Org-wide change orders across every active job, with PCCO running totals, GC-fee surfacing, and draw-tagging. Job-scoped COs already live at /jobs/[id]/change-orders; F1 unifies them with cross-job rollups."
        wave="F1"
      />
    </div>
  );
}
