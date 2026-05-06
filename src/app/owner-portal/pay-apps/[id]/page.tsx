// src/app/owner-portal/pay-apps/[id]/page.tsx
//
// Production route — Owner-facing Pay App approval (Stage 1.5c Plan 3
// thin wrapper). Mounts OwnerDrawView with Caldwell fixtures + vendor-
// name transparency (cost-plus open-book per CLAUDE.md).
//
// Per CONTEXT D-08 + iter-2 multi-tenant W-1: 1.5c structural; F1
// commits to ONE auth path (Path A or Path B; see /owner-portal/page.tsx
// docstring).
//
// Per CONTEXT D-19: outer wraps in .design-system-scope.
//
// Per CONTEXT D-01: UI labels say "Pay App" not "Draw"; component file
// names retain Draw* internally.
//
// Hook T10c — fixture import silent in production paths.

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

export default function OwnerPayAppPage({
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
    <div data-direction="C" data-palette="B" className="design-system-scope">
      <OwnerDrawView
        draw={draw}
        job={job ? { id: job.id, name: job.name } : null}
        lineItems={lineItems}
        invoices={CALDWELL_INVOICES}
        vendors={CALDWELL_VENDORS}
        costCodes={CALDWELL_COST_CODES}
        breadcrumbRoot={{ href: "/owner-portal", label: "Owner portal" }}
      />
    </div>
  );
}
