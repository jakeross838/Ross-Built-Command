// src/app/jobs/[id]/photos/page.tsx
//
// Stage 1.5c Plan 5 placeholder — consumes NwPlaceholderCard from Plan 1.
// Job photos with multi-modal ingestion (Principle 5). Wave 2/3 wires
// per-photo metadata extraction.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function JobPhotosPage({
  params: _params,
}: {
  params: { id: string };
}) {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Job · Documentation"
          headline="Photos"
          body="Job photos with categorized tags (room, vendor, phase, date). Multi-modal ingestion: PM uploads via mobile; system extracts EXIF + auto-classifies room / cost-code from image content."
          wave="Wave 2"
        />
      </div>
    </div>
  );
}
