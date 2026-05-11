// src/app/jobs/[id]/submittals/page.tsx
//
// Stage 1.5c Plan 5 placeholder — consumes NwPlaceholderCard from Plan 1.
// Submittal review (sub deliverable docs). Architect approves via magic link.
// F3 / Wave 2 wires.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function JobSubmittalsPage({
  params: _params,
}: {
  params: { id: string };
}) {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Job · Coordination"
          headline="Submittals"
          body="Submittal review (sub deliverable docs). Architect approves via magic link → temporary auth → approval captured back in the system."
          wave="F3"
        />
      </div>
    </div>
  );
}
