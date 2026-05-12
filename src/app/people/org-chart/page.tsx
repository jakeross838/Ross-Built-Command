// src/app/people/org-chart/page.tsx
// F2 placeholder per Stage 1.5c Plan 4 — visual org chart.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function OrgChartPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="People · Org chart"
          headline="Reporting & approval routing"
          body="Visual org chart driving reporting structure, approval routing, notification routing, and permission inheritance. F2 derives this from the team membership table + role hierarchy."
          wave="F2"
        />
      </div>
    </div>
  );
}
