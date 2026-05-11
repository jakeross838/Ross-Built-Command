// src/app/jobs/[id]/warranty/page.tsx
//
// Stage 1.5c Plan 5 placeholder — consumes NwPlaceholderCard from Plan 1.
// Phase-aware: shown when phase=warranty per CONTEXT D-12.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function JobWarrantyPage({
  params: _params,
}: {
  params: { id: string };
}) {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Job · Warranty"
          headline="Warranty"
          body="Warranty claims tracking — owner-reported defects within the warranty period, sub-callbacks, resolution tracking. Phase-aware: shown when phase=warranty per CONTEXT D-12 (the PerJobTabs sub-nav hides this tab in active / closeout phases). F4 wires warranty management."
          wave="F4"
        />
      </div>
    </div>
  );
}
