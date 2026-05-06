// src/app/financials/pay-apps/[id]/print/page.tsx
//
// Production route — Pay App print preview (Stage 1.5c Plan 3 thin
// wrapper). Mounts DrawPrintView with Caldwell fixtures.
//
// Per CONTEXT D-15 (Q7 override): print fidelity is tiered (G702 cover
// pixel-perfect attempt against AIA G702-1992; G703 detail at 80% fidelity).
// Per CONTEXT D-19: outer wraps in .design-system-scope so Site Office
// CSS activates for the chrome (back link, action button). Print
// stylesheet (in DrawPrintView's scoped <style jsx global>) overrides
// body styling at @media print regardless.
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
import DrawPrintView from "@/components/prototypes/DrawPrintView";

export default function PayAppPrintPage({
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

  const changeOrdersThroughThisDraw = CALDWELL_CHANGE_ORDERS.filter(
    (co) =>
      co.job_id === draw.job_id &&
      (co.status === "approved" || co.status === "executed"),
  );

  return (
    <div data-direction="C" data-palette="B" className="design-system-scope">
      <DrawPrintView
        draw={draw}
        job={job}
        lineItems={lineItems}
        costCodes={CALDWELL_COST_CODES}
        changeOrdersThroughThisDraw={changeOrdersThroughThisDraw}
        backHref={`/financials/pay-apps/${draw.id}`}
      />
    </div>
  );
}
