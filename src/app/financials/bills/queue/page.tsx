// src/app/financials/bills/queue/page.tsx
//
// 3.2 ONE QUEUE — RETIRED. The standalone PM review queue folded into the Bills
// list (/financials/bills), which now carries Quick-Approve + multi-select +
// the floating batch bar via the shared useInvoiceApproval hook + components
// (byte-equivalent eligibility, same endpoints). This route now redirects to
// the list, preset to the PM Review sub-view (closest equivalent to the old
// queue). Parity was confirmed before retiring (see
// .planning/coherence/3.2-one-queue-report.md). The former re-export of
// @/app/invoices/queue/page is gone; that component file is now orphaned dead
// code (unreachable — next.config 308-redirects /invoices/queue here first),
// safe to delete in a later cleanup.

import { redirect } from "next/navigation";

export default function RetiredBillsQueuePage() {
  redirect("/financials/bills?review=pm");
}
