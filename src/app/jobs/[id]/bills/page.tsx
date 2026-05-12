// src/app/jobs/[id]/bills/page.tsx
//
// Stage 1.5c Plan 5 placeholder — consumes NwPlaceholderCard from Plan 1.
// Job-scoped bills list. F1 wires real data filtered by job_id.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function JobBillsPage({
  params: _params,
}: {
  params: { id: string };
}) {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Job · Bills"
          headline="Bills"
          body="Job-scoped bills list. Filter by status / vendor / cost code. Click → /financials/bills/[id] for review. F1 wires real data."
          wave="F1"
        />
      </div>
    </div>
  );
}
