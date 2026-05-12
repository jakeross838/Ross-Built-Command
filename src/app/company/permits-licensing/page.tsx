// src/app/company/permits-licensing/page.tsx
// Wave 2 placeholder per Stage 1.5c Plan 4 — company licenses + permits.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function PermitsLicensingPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Company · Permits & licensing"
          headline="Company licenses + recurring permits"
          body="State + county GC licenses, trade licenses, recurring permits, and renewal cadence. Distinct from job-scoped permits which live under each job."
          wave="Wave 2"
        />
      </div>
    </div>
  );
}
