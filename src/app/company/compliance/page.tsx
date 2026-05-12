// src/app/company/compliance/page.tsx
// Wave 2 placeholder per Stage 1.5c Plan 4 — OSHA + regulatory.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function CompliancePage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Company · Compliance"
          headline="OSHA + regulatory compliance"
          body="OSHA incident tracking, safety training records, regulatory deadlines, and inspection cadence. Feeds the per-job site-safety dashboard."
          wave="Wave 2"
        />
      </div>
    </div>
  );
}
