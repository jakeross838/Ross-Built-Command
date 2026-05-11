// src/app/jobs/[id]/rfis/page.tsx
//
// Stage 1.5c Plan 5 placeholder — consumes NwPlaceholderCard from Plan 1.
// RFIs (Requests for Information). Sub responds via magic-link auth.
// F3 wires magic-link auth.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function JobRfisPage({
  params: _params,
}: {
  params: { id: string };
}) {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Job · Coordination"
          headline="RFIs"
          body="RFIs (Requests for Information). Sub responds via magic link → temporary auth → response captured back in the system. F3 wires magic-link auth."
          wave="F3"
        />
      </div>
    </div>
  );
}
