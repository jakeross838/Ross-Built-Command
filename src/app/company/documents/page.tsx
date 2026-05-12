// src/app/company/documents/page.tsx
// Wave 2 placeholder per Stage 1.5c Plan 4 — company documents.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function CompanyDocumentsPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Company · Documents"
          headline="Policies + templates + master agreements"
          body="Company documents — policies, templates, master vendor agreements, employee handbook, safety procedures. Distinct from job-scoped documents which live under each job."
          wave="Wave 2"
        />
      </div>
    </div>
  );
}
