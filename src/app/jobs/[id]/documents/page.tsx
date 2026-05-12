// src/app/jobs/[id]/documents/page.tsx
//
// Stage 1.5c Plan 5 placeholder — consumes NwPlaceholderCard from Plan 1.
// Job document library. Per-document review at /jobs/[id]/documents/[documentId]
// already exists from Plan 3 (production). Wave 2 wires storage.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function JobDocumentsPage({
  params: _params,
}: {
  params: { id: string };
}) {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Job · Documentation"
          headline="Documents"
          body="Job document library — contracts, addenda, certificates, correspondence. Per-document review at /jobs/[id]/documents/[documentId] (Plan 3). Wave 2 wires storage + categorization."
          wave="Wave 2"
        />
      </div>
    </div>
  );
}
