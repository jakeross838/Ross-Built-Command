// src/app/people/clients/page.tsx
// F1 placeholder per Stage 1.5c Plan 4 — client directory.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function ClientsPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="People · Clients"
          headline="Client directory + relationship history"
          body="Current + past clients + leads from Pipeline, with project history, communication threads, and lifetime-value rollups. F1 schema lands; Wave 1.1-Lite goes live with Ross Built data."
          wave="F1"
        />
      </div>
    </div>
  );
}
