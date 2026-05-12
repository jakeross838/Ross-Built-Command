// src/app/admin/approval-workflows/page.tsx
//
// Approval Workflows placeholder — F3 future-state per Stage 1.5c Plan 6.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function ApprovalWorkflowsPlaceholderPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Admin · Approval Workflows"
          headline="Approval engine"
          body="Approval workflow engine — customizable per company. Define multi-step approval chains for invoices, POs, change orders, and draws with role-based routing."
          wave="F3"
        />
      </div>
    </div>
  );
}
