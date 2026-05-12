// src/app/jobs/[id]/permits/page.tsx
//
// Stage 1.5c Plan 5 placeholder — consumes NwPlaceholderCard from Plan 1.
// Building permits + inspections. Florida-specific county / municipality
// permit tracking.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function JobPermitsPage({
  params: _params,
}: {
  params: { id: string };
}) {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Job · Permits"
          headline="Permits"
          body="Building permits + inspections. Florida-specific: Manatee County / Anna Maria Island municipality permit tracking + inspection scheduling + sign-off capture."
          wave="Wave 2"
        />
      </div>
    </div>
  );
}
