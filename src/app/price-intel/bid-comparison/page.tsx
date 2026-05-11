// src/app/price-intel/bid-comparison/page.tsx
// F5 placeholder per Stage 1.5c Plan 4 — bid comparison engine.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function BidComparisonPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <NwPlaceholderCard
        eyebrow="Price Intel · Bid Comparison"
        headline="Bid comparison engine"
        body="Sub bid normalization + delta analysis. Surfaces apples-to-apples comparisons across vendors, flags scope-omission, and tracks historical accuracy of the winning bid vs. final actual."
        wave="F5"
      />
    </div>
  );
}
