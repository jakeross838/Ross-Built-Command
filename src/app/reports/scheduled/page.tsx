// src/app/reports/scheduled/page.tsx
// Wave 3 placeholder per Stage 1.5c Plan 4 — scheduled deliveries.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function ScheduledReportsPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <NwPlaceholderCard
        eyebrow="Reports · Scheduled"
        headline="Auto-delivered scheduled reports"
        body="Reports running on a cadence (daily / weekly / monthly) and delivered via email or in-app notification. Wave 3 includes per-report delivery scope + audience targeting."
        wave="Wave 3"
      />
    </div>
  );
}
