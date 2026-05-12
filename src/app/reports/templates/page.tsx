// src/app/reports/templates/page.tsx
// Wave 3 placeholder per Stage 1.5c Plan 4 — report templates.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function ReportTemplatesPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Reports · Templates"
          headline="Pre-built report templates"
          body="Pre-built report templates seeded per industry. Org-customizable. Wave 3 starts with the canonical builder set (Cost-to-Complete, Aging by Vendor, Margin Trend, PCCO Log)."
          wave="Wave 3"
        />
      </div>
    </div>
  );
}
