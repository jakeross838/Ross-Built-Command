// src/app/company/capacity-planning/page.tsx
// Wave 3 placeholder per Stage 1.5c Plan 4 — capacity planning.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function CapacityPlanningPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Company · Capacity planning"
          headline="Active-job capacity vs bandwidth"
          body="Active-job capacity vs PM + crew bandwidth — surfaces when to take new work, when to defer, and where to scale. Pulls from time tracking, job schedules, and PM allocation."
          wave="Wave 3"
        />
      </div>
    </div>
  );
}
