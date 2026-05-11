// src/app/price-intel/cost-database/page.tsx
// F5 placeholder per Stage 1.5c Plan 4 — Price Intel cost database.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function CostDatabasePage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <NwPlaceholderCard
        eyebrow="Price Intel · Cost Database"
        headline="Historical cost database"
        body="Historical cost rows across vendors / cost codes / jobs / time. Powers Price Intel's lookup + anomaly detection + estimating. F5 ingests structured cost data from bills + POs + change orders to populate."
        wave="F5"
      />
    </div>
  );
}
