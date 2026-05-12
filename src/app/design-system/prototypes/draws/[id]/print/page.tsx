// src/app/design-system/prototypes/draws/[id]/print/page.tsx
//
// Thin wrapper for the draw print preview prototype (Stage 1.5c Plan 3a).
// Mirrors the production wrapper at /financials/pay-apps/[id]/print but
// (a) backHref points to the prototype draw approval page and
// (b) no inner .design-system-scope wrap — prototypes/layout.tsx provides it.
//
// Hook T10c — fixture import silent in design-system paths.

import { notFound } from "next/navigation";
import {
  CALDWELL_DRAWS,
  CALDWELL_DRAW_LINE_ITEMS,
  CALDWELL_COST_CODES,
  CALDWELL_CHANGE_ORDERS,
  CALDWELL_JOBS,
} from "@/app/design-system/_fixtures/drummond";
import DrawPrintView from "@/components/prototypes/DrawPrintView";

export default function DrawPrintPrototypePage({
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
    <DrawPrintView
      draw={draw}
      job={job}
      lineItems={lineItems}
      costCodes={CALDWELL_COST_CODES}
      changeOrdersThroughThisDraw={changeOrdersThroughThisDraw}
      backHref={`/design-system/prototypes/draws/${draw.id}`}
    />
  );
}
