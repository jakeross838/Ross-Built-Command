// src/app/financials/pay-apps/[id]/page.tsx
//
// Production route — Pay App review (Stage 1.5c Plan 3 thin wrapper,
// F10-wired to public.draws per nwrp271, 2026-06-11).
//
// PRIOR IMPLEMENTATION: Caldwell fixture thin-wrapper —
// CALDWELL_DRAWS.find() → notFound() on real draw UUIDs, so the REAL
// draws listed at /financials/pay-apps 404'd on click while the real
// legacy /draws/[id] implementation 308-redirected here. F-Inv-1 retro
// sweep finding F10 (.planning/ground-truth/F-INV-1-RETRO-SWEEP.md
// Part C). Now mounts DrawApprovalView with REAL recomputed G702/G703
// data via the shared loader (_data.ts — E-3 pattern, full posture +
// FK citations documented there).
//
// Per CONTEXT D-19: outer wraps in .design-system-scope. Per CONTEXT
// D-01: UI labels say "Pay App"; component names retain Draw* internally.
//
// Auth posture: middleware authenticated-org-member gate precedes render;
// loader re-checks getCurrentMembership() + org-scopes every query
// (defense-in-depth; RLS backstop intact).

import { notFound } from "next/navigation";
import DrawApprovalView from "@/components/prototypes/DrawApprovalView";
import { loadPayAppViewData } from "./_data";

export default async function PayAppReviewPage({
  params,
}: {
  params: { id: string };
}) {
  const data = await loadPayAppViewData(params.id);
  if (!data) return notFound();

  return (
    <div data-direction="C" data-palette="B" className="design-system-scope">
      <DrawApprovalView
        draw={data.draw}
        job={{ id: data.job.id, name: data.job.name }}
        lineItems={data.lineItems}
        costCodes={data.costCodes}
        changeOrdersThroughThisDraw={data.changeOrdersThroughThisDraw}
        storedSummaryStale={data.storedSummaryStale}
        printHref={`/financials/pay-apps/${data.draw.id}/print`}
        breadcrumbRoot={{ href: "/financials/pay-apps", label: "Pay Apps" }}
      />
    </div>
  );
}
