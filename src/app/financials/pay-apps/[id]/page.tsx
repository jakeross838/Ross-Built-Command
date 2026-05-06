// src/app/financials/pay-apps/[id]/page.tsx
//
// Production route — Pay App approval (Stage 1.5c Plan 3 thin wrapper).
// Mounts DrawApprovalView from src/components/prototypes/ with Caldwell
// fixtures.
//
// Per CONTEXT D-19 + iter-3 Q-iter2-1=a: outer wraps in
// data-direction="C" data-palette="B" className="design-system-scope".
// Per CONTEXT D-01: UI labels say "Pay App" not "Draw"; component file
// names + variable names retain Draw* internally for code-search
// continuity.
//
// Hook T10c — fixture import silent in production paths.

import { notFound } from "next/navigation";
import {
  CALDWELL_DRAWS,
  CALDWELL_DRAW_LINE_ITEMS,
  CALDWELL_COST_CODES,
  CALDWELL_CHANGE_ORDERS,
  CALDWELL_JOBS,
} from "@/app/design-system/_fixtures/drummond";
import DrawApprovalView from "@/components/prototypes/DrawApprovalView";

export default function PayAppReviewPage({
  params,
}: {
  params: { id: string };
}) {
  const draw = CALDWELL_DRAWS.find((d) => d.id === params.id);
  if (!draw) return notFound();

  const job = CALDWELL_JOBS.find((j) => j.id === draw.job_id);
  if (!job) return notFound();

  const lineItems = CALDWELL_DRAW_LINE_ITEMS.filter(
    (li) => li.draw_id === draw.id,
  );

  // Approved + executed COs through this draw — for the contract sum
  // running total. Filter to this job + approved-or-executed status.
  const changeOrdersThroughThisDraw = CALDWELL_CHANGE_ORDERS.filter(
    (co) =>
      co.job_id === draw.job_id &&
      (co.status === "approved" || co.status === "executed"),
  );

  return (
    <div data-direction="C" data-palette="B" className="design-system-scope">
      <DrawApprovalView
        draw={draw}
        job={{ id: job.id, name: job.name }}
        lineItems={lineItems}
        costCodes={CALDWELL_COST_CODES}
        changeOrdersThroughThisDraw={changeOrdersThroughThisDraw}
        printHref={`/financials/pay-apps/${draw.id}/print`}
        breadcrumbRoot={{ href: "/financials/pay-apps", label: "Pay Apps" }}
      />
    </div>
  );
}
