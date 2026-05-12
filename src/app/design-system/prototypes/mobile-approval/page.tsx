// src/app/design-system/prototypes/mobile-approval/page.tsx
//
// Thin wrapper for the mobile invoice approval prototype (Stage 1.5c
// Plan 3a). Mirrors the production wrapper at /jobs/[id]/mobile-approval
// but operates without a jobId param — picks the first pm_review invoice
// across all jobs (or first invoice if none), suitable for the
// prototypes-gallery surface.
//
// No inner .design-system-scope wrap — prototypes/layout.tsx provides it.
//
// Hook T10c — fixture import silent in design-system paths.

import { notFound } from "next/navigation";
import {
  CALDWELL_INVOICES,
  CALDWELL_VENDORS,
  CALDWELL_COST_CODES,
} from "@/app/design-system/_fixtures/drummond";
import MobileApprovalView from "@/components/prototypes/MobileApprovalView";

export default function MobileApprovalPrototypePage() {
  const inv =
    CALDWELL_INVOICES.find((i) => i.status === "pm_review") ??
    CALDWELL_INVOICES[0];
  if (!inv) return notFound();

  const vendor = CALDWELL_VENDORS.find((v) => v.id === inv.vendor_id) ?? null;
  const costCode = inv.cost_code_id
    ? CALDWELL_COST_CODES.find((c) => c.id === inv.cost_code_id) ?? null
    : null;

  return <MobileApprovalView invoice={inv} vendor={vendor} costCode={costCode} />;
}
