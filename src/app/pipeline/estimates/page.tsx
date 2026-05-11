// src/app/pipeline/estimates/page.tsx
// Wave 4 placeholder per Stage 1.5c Plan 4 — Price Intel powered estimates.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function EstimatesPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <NwPlaceholderCard
        eyebrow="Pipeline · Estimates"
        headline="Price Intel powered estimates"
        body="Estimates pulled from Price Intel historical cost data + vendor performance. Tracks revision history, win rate, and accuracy delta vs. final job cost for continuous learning."
        wave="Wave 4"
      />
    </div>
  );
}
