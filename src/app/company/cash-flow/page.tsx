// src/app/company/cash-flow/page.tsx
// F4 placeholder per Stage 1.5c Plan 4 — detailed cash flow forecasting.
//
// Note: /company/overview from Plan 1 already surfaces Cash Flow KPIs.
// This route is for the F4 forecast view with payment schedule
// projections.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function CashFlowPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <NwPlaceholderCard
        eyebrow="Company · Cash Flow"
        headline="Cash flow forecasting"
        body="Detailed cash-flow forecasting — payment schedule projections, overhead burn, and incoming draws. Complements the overview-level KPIs at /company/overview with forward-looking modeling."
        wave="F4"
      />
    </div>
  );
}
