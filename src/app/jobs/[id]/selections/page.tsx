// src/app/jobs/[id]/selections/page.tsx
//
// Stage 1.5c Plan 5 placeholder — consumes NwPlaceholderCard from Plan 1.
// Per CONTEXT D-13: placeholder copy describes future ingestion + workflow.
// F5 wires real selections data; product entity surface filtered by job_id.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function JobSelectionsPage({
  params: _params,
}: {
  params: { id: string };
}) {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Job · Selections"
          headline="Selections"
          body="Selections lifecycle: picked → spec → ordered → delivered → installed → warranty. View of Price Intel filtered by product entities for this job."
          wave="F5"
        />
      </div>
    </div>
  );
}
