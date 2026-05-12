// src/app/price-intel/anomaly-review/page.tsx
// F5 placeholder per Stage 1.5c Plan 4 — anomaly review.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function AnomalyReviewPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Price Intel · Anomaly Review"
          headline="Cost anomaly review queue"
          body="Bills flagged by Price Intel for unusual cost vs historical rate, vendor performance dispute, or scope-creep markers. Accounting / PM triage workflow with override + confirm + escalate."
          wave="F5"
        />
      </div>
    </div>
  );
}
