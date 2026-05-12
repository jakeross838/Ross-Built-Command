// src/app/jobs/[id]/punchlist/page.tsx
//
// Stage 1.5c Plan 5 placeholder — consumes NwPlaceholderCard from Plan 1.
// Punchlist with AI video routing per Principle 5. Permanent QC entries
// per CLAUDE.md "Field mistakes become permanent QC entries" rule.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function JobPunchlistPage({
  params: _params,
}: {
  params: { id: string };
}) {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Job · Tasks"
          headline="Punchlist"
          body="Punchlist with AI voice/video routing per Principle 5. PM walks the house with phone, talks while filming. System transcribes → identifies room → identifies product/vendor → creates punchlist item with photo + description + assignment + due date. ONE 10-second comment generates 5+ database operations across 4+ entities, manually-zero. Punchlist items remain as permanent QC entries even after resolution (per CLAUDE.md field-mistakes rule)."
          wave="Wave 2"
        />
      </div>
    </div>
  );
}
