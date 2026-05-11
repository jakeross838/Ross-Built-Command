// src/app/jobs/[id]/plans/page.tsx
//
// Stage 1.5c Plan 5 placeholder — consumes NwPlaceholderCard from Plan 1.
// Architectural plans + drawings. Wave 2 wires document storage.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function JobPlansPage({
  params: _params,
}: {
  params: { id: string };
}) {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Job · Documentation"
          headline="Plans"
          body="Architectural plans + drawings. PDFs, CAD files, version history with revision tracking. Wave 2 wires document storage + per-plan markup."
          wave="Wave 2"
        />
      </div>
    </div>
  );
}
