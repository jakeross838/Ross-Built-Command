// src/app/admin/permissions/page.tsx
//
// Permissions placeholder — F2 future-state per Stage 1.5c Plan 6.
// Describes the per-role permission matrix UI.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function PermissionsPlaceholderPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Admin · Permissions"
          headline="Permission matrix"
          body="Permissions matrix UI — granular per-role permissions. Read / Write / Approve / Admin per entity type (jobs, invoices, draws, change orders, etc.)."
          wave="F2"
        />
      </div>
    </div>
  );
}
