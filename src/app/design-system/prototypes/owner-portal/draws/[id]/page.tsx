// src/app/design-system/prototypes/owner-portal/draws/[id]/page.tsx
//
// Thin wrapper for the owner-facing draw approval prototype (Stage 1.5c
// Plan 3a). Mirrors the production wrapper at /owner-portal/pay-apps/[id]
// but
// (a) breadcrumbRoot stays inside the prototypes gallery and
// (b) no inner .design-system-scope wrap — prototypes/layout.tsx provides it.
//
// Hook T10c — fixture import silent in design-system paths.

import { notFound } from "next/navigation";
import {
  CALDWELL_DRAWS,
  CALDWELL_DRAW_LINE_ITEMS,
  CALDWELL_INVOICES,
  CALDWELL_VENDORS,
  CALDWELL_COST_CODES,
  CALDWELL_JOBS,
} from "@/app/design-system/_fixtures/drummond";
import OwnerDrawView from "@/components/prototypes/OwnerDrawView";

export default function OwnerDrawPrototypePage({
  params,
}: {
  params: { id: string };
}) {
  const draw = CALDWELL_DRAWS.find((d) => d.id === params.id);
  if (!draw) return notFound();

  const job = CALDWELL_JOBS.find((j) => j.id === draw.job_id) ?? null;
  const lineItems = CALDWELL_DRAW_LINE_ITEMS.filter(
    (li) => li.draw_id === draw.id,
  );

  return (
    <OwnerDrawView
      draw={draw}
      job={job ? { id: job.id, name: job.name } : null}
      lineItems={lineItems}
      invoices={CALDWELL_INVOICES}
      vendors={CALDWELL_VENDORS}
      costCodes={CALDWELL_COST_CODES}
      breadcrumbRoot={{
        href: "/design-system/prototypes/owner-portal",
        label: "Owner portal",
      }}
    />
  );
}
