// src/app/jobs/[id]/mobile-approval/page.tsx
//
// Production route — Mobile invoice/bill approval (Stage 1.5c Plan 3
// thin wrapper). Mounts MobileApprovalView with first pm_review-status
// invoice for this job, or first invoice if none.
//
// Per CONTEXT D-04: mobile-approval renders inside iPhone viewport
// (393×852). Per SYSTEM.md §11a: high-stakes Approve button at 56px
// (NwButton size="lg-touch"). MobileApprovalView handles the touch-
// target enforcement internally.
//
// Architect W-5 status: PLACEHOLDER.
//
// Per CONTEXT D-19: outer wraps in .design-system-scope.
//
// Hook T10c — fixture import silent in production paths.

import { notFound } from "next/navigation";
import {
  CALDWELL_INVOICES,
  CALDWELL_VENDORS,
  CALDWELL_COST_CODES,
  CALDWELL_JOBS,
} from "@/app/design-system/_fixtures/drummond";
import MobileApprovalView from "@/components/prototypes/MobileApprovalView";

export default function JobMobileApprovalPage({
  params,
}: {
  params: { id: string };
}) {
  const job = CALDWELL_JOBS.find((j) => j.id === params.id);
  if (!job) return notFound();

  // Pick first pm_review invoice for this job (or first invoice if none).
  // F1 wires real query: invoices.where(status='pm_review' AND
  // approver_id=current_user_id).
  const inv =
    CALDWELL_INVOICES.find(
      (i) => i.job_id === job.id && i.status === "pm_review",
    ) ?? CALDWELL_INVOICES.find((i) => i.job_id === job.id);
  if (!inv) return notFound();

  const vendor = CALDWELL_VENDORS.find((v) => v.id === inv.vendor_id) ?? null;
  const costCode = inv.cost_code_id
    ? CALDWELL_COST_CODES.find((c) => c.id === inv.cost_code_id) ?? null
    : null;

  return (
    <div data-direction="C" data-palette="B" className="design-system-scope">
      <MobileApprovalView invoice={inv} vendor={vendor} costCode={costCode} />
    </div>
  );
}
