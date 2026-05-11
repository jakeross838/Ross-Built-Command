// src/app/jobs/[id]/closeout/page.tsx
//
// Stage 1.5c Plan 5 placeholder — consumes NwPlaceholderCard from Plan 1.
// Phase-aware: shown when phase=closeout or phase=active per CONTEXT D-12.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function JobCloseoutPage({
  params: _params,
}: {
  params: { id: string };
}) {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Job · Closeout"
          headline="Closeout"
          body="Closeout — final lien releases, substantial completion sign-off, warranty period start. Phase-aware: shown when phase=closeout or phase=active per CONTEXT D-12; the PerJobTabs sub-nav hides this tab in pre-construction phases."
          wave="Wave 2"
        />
      </div>
    </div>
  );
}
