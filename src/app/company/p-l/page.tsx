// src/app/company/p-l/page.tsx
// F4 placeholder per Stage 1.5c Plan 4 — P&L.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function ProfitAndLossPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <NwPlaceholderCard
        eyebrow="Company · P&L"
        headline="Profit & loss"
        body="Company-wide profit & loss across active jobs + overhead, with margin trend, by-job rollups, and overhead allocation. F4 wires the accounting integration."
        wave="F4"
      />
    </div>
  );
}
