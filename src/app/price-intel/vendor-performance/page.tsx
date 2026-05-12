// src/app/price-intel/vendor-performance/page.tsx
// F5 placeholder per Stage 1.5c Plan 4 — vendor performance scoring.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function VendorPerformancePage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Price Intel · Vendor Performance"
          headline="Vendor performance scoring"
          body="On-time delivery, on-budget delivery, dispute rate, and quality flags by vendor. Feeds bid-comparison weighting and vendor selection. Historical context for new-vendor onboarding decisions."
          wave="F5"
        />
      </div>
    </div>
  );
}
