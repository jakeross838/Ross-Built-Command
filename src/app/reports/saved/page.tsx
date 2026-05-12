// src/app/reports/saved/page.tsx
// Wave 3 placeholder per Stage 1.5c Plan 4 — saved + shared reports.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function SavedReportsPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Reports · Saved"
          headline="Saved + shared reports"
          body="Your saved reports + reports shared with you. Wave 3 AI Report Builder writes here on save; templates seed common reports on org creation."
          wave="Wave 3"
        />
      </div>
    </div>
  );
}
