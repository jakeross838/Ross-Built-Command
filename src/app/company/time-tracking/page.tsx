// src/app/company/time-tracking/page.tsx
// F4 placeholder per Stage 1.5c Plan 4 — labor time tracking.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function TimeTrackingPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <NwPlaceholderCard
        eyebrow="Company · Time tracking"
        headline="Labor hours across employees + jobs"
        body="Company-wide time tracking — labor hours by employee, job, and cost code. Powers internal labor billing, productivity metrics, and crew utilization."
        wave="F4"
      />
    </div>
  );
}
