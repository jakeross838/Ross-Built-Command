// src/app/admin/workflow-customization/page.tsx
//
// Workflow Customization placeholder — F3 future-state per Stage 1.5c Plan 6.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function WorkflowCustomizationPlaceholderPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <NwPlaceholderCard
        eyebrow="Admin · Workflow"
        headline="Workflow customization"
        body="Workflow customization — adjust per-company business rules. Override default status flows, confidence thresholds, payment-schedule cutoffs, and draw-revision policies."
        wave="F3"
      />
    </div>
  );
}
