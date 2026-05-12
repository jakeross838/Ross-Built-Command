// src/app/admin/roles/page.tsx
//
// Roles placeholder — F2 future-state per Stage 1.5c Plan 6 + CONTEXT D-15.
// Describes the 15-role library (Owner, GM, Sr PM, PM, Estimator,
// Accountant, Foreman, Field, Designer, Sub Foreman, Sub Bookkeeper,
// Owner/Homeowner, Architect/External, Inspector, Banker) that will be
// customizable per org.
//
// Consumes NwPlaceholderCard primitive from Plan 1 (hoisted).

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function RolesPlaceholderPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Admin · Roles"
          headline="Role library"
          body="15 default roles will live here, customizable per org. Default library: Owner, GM, Sr PM, PM, Estimator, Accountant, Foreman, Field, Designer, Sub Foreman, Sub Bookkeeper, Owner/Homeowner, Architect/External, Inspector, Banker."
          wave="F2"
        />
      </div>
    </div>
  );
}
