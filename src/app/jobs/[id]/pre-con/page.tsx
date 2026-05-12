// src/app/jobs/[id]/pre-con/page.tsx
//
// Stage 1.5c Plan 5 placeholder — consumes NwPlaceholderCard from Plan 1.
// Phase-aware: shown when phase=pre_con per CONTEXT D-12; hidden post-contract.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function JobPreConPage({
  params: _params,
}: {
  params: { id: string };
}) {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Job · Pre-Con"
          headline="Pre-Con"
          body="Pre-construction — Estimates, Proposals, Contracts. Phase-aware: shown when phase=pre_con per CONTEXT D-12; the PerJobTabs sub-nav hides this tab post-contract (active / closeout / warranty phases). F4 wires pre-construction workflow."
          wave="F4"
        />
      </div>
    </div>
  );
}
