// src/app/pipeline/proposals/page.tsx
// Wave 4 placeholder per Stage 1.5c Plan 4 — e-sign proposals.
//
// Note: per-extraction review currently lives at /proposals/review/[extraction_id];
// Plan 1 redirects it to /pipeline/proposals/review/[extraction_id]. This page is
// the section overview placeholder.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function ProposalsPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Pipeline · Proposals"
          headline="E-sign proposals to clients"
          body="Generate proposals from estimates, e-sign workflow, version history, and conversion tracking from sent → opened → signed. Owner contract draft on signature."
          wave="Wave 4"
        />
      </div>
    </div>
  );
}
