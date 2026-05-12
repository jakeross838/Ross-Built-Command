// src/app/jobs/[id]/to-dos/page.tsx
//
// Stage 1.5c Plan 5 placeholder — consumes NwPlaceholderCard from Plan 1.
// Job-scoped to-dos + punch items.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function JobToDosPage({
  params: _params,
}: {
  params: { id: string };
}) {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Job · Tasks"
          headline="To-Dos"
          body="Job-scoped to-dos + punch items. Assigned to team members; due dates + completion tracking with status history."
          wave="Wave 2"
        />
      </div>
    </div>
  );
}
