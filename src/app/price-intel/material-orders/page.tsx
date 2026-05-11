// src/app/price-intel/material-orders/page.tsx
// F5 placeholder per Stage 1.5c Plan 4 — material orders.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function MaterialOrdersPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <NwPlaceholderCard
        eyebrow="Price Intel · Material Orders"
        headline="Vendor material orders"
        body="Vendor material orders linked to jobs + cost codes with delivery tracking and ETA surfacing. Feeds the schedule when materials are late; feeds Price Intel when prices drift."
        wave="F5"
      />
    </div>
  );
}
