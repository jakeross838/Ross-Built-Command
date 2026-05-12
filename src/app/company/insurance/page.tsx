// src/app/company/insurance/page.tsx
// Wave 2 placeholder per Stage 1.5c Plan 4 — insurance policies.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function InsurancePage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Company · Insurance"
          headline="GL + WC + builders-risk policies"
          body="General liability, workers' comp, builders-risk policies with effective dates, renewal cadence, and certificate management. Feeds sub-vendor insurance verification."
          wave="Wave 2"
        />
      </div>
    </div>
  );
}
