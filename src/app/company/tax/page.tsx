// src/app/company/tax/page.tsx
// Wave 4 placeholder per Stage 1.5c Plan 4 — tax planning.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function TaxPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Company · Tax"
          headline="Estimated quarterlies + year-end prep"
          body="Quarterly estimated-tax projections, deductions tracking, and year-end prep dashboard. Feeds the accountant's data package."
          wave="Wave 4"
        />
      </div>
    </div>
  );
}
