// src/app/jobs/[id]/team/page.tsx
//
// Stage 1.5c Plan 5 placeholder — consumes NwPlaceholderCard from Plan 1.
// Job team — PM + supts + foremen + accountant + assigned subs.
// Role-aware visibility per Principle 6. F2 wires role-aware logic.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function JobTeamPage({
  params: _params,
}: {
  params: { id: string };
}) {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Job · People"
          headline="Team"
          body="Job team — PM + supts + foremen + accountant + assigned subs. Role-aware visibility per Principle 6: each member sees the slice of the job relevant to their role. F2 wires real role-aware logic."
          wave="F2"
        />
      </div>
    </div>
  );
}
