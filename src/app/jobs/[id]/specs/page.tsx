// src/app/jobs/[id]/specs/page.tsx
//
// Stage 1.5c Plan 5 placeholder — consumes NwPlaceholderCard from Plan 1.
// Project + product specs. Wave 2 wires document storage.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function JobSpecsPage({
  params: _params,
}: {
  params: { id: string };
}) {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Job · Documentation"
          headline="Specs"
          body="Project specifications + product specs. Linked to selections + cost codes so the bill of materials traces back to the spec sheet."
          wave="Wave 2"
        />
      </div>
    </div>
  );
}
