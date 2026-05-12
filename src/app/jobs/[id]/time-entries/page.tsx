// src/app/jobs/[id]/time-entries/page.tsx
//
// Stage 1.5c Plan 5 placeholder — consumes NwPlaceholderCard from Plan 1.
// Time entries — employees clock in to jobs/cost codes. F4 wires.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function JobTimeEntriesPage({
  params: _params,
}: {
  params: { id: string };
}) {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Job · Time"
          headline="Time Entries"
          body="Time entries — employees clock in to jobs / cost codes. Time → Pay App flow (auto-generate billable line items). Time → Payroll integration (QuickBooks). Time → Price Intel feeding for labor benchmarks."
          wave="F4"
        />
      </div>
    </div>
  );
}
