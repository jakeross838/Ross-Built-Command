// src/app/admin/org-chart/page.tsx
//
// Org Chart placeholder — F2 future-state per Stage 1.5c Plan 6 + Principle 6.
// Visual hierarchy drives approval routing + notification routing + permission inheritance.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function OrgChartPlaceholderPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Admin · Org Chart"
          headline="Visual hierarchy"
          body="Visual org chart — drives reporting + approval routing + notification routing + permission inheritance per Principle 6."
          wave="F2"
        />
      </div>
    </div>
  );
}
