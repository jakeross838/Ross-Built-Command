// src/app/pipeline/bids-out/page.tsx
// Wave 4 placeholder per Stage 1.5c Plan 4 — sub bids in flight.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function BidsOutPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <NwPlaceholderCard
        eyebrow="Pipeline · Bids out"
        headline="Sub bids in flight"
        body="Track sub-bid invitations, response rates, and pending quotes per cost code. Reminder cadence, comparison readiness, and missing-bid surfacing."
        wave="Wave 4"
      />
    </div>
  );
}
