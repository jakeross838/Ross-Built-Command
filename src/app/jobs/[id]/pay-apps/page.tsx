// src/app/jobs/[id]/pay-apps/page.tsx
//
// Stage 1.5c Plan 5 placeholder — consumes NwPlaceholderCard from Plan 1.
// Job-scoped pay apps list. F1 wires real data; F6 wires the assembled-
// from-data engine that generates G702/G703 from approved invoices.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function JobPayAppsPage({
  params: _params,
}: {
  params: { id: string };
}) {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Job · Pay Apps"
          headline="Pay Apps"
          body="Job-scoped pay apps list. Click → /financials/pay-apps/[id] for review. F1 wires real data; F6 wires the assembled-from-data engine that generates G702/G703 from approved invoices."
          wave="F1"
        />
      </div>
    </div>
  );
}
