// src/app/reports/custom-builder/page.tsx
// Wave 3 placeholder per Stage 1.5c Plan 4 — drag-and-drop builder.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function CustomBuilderPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Reports · Custom builder"
          headline="Drag-and-drop report builder"
          body="Power-user surface for building reports without natural language — drag fields, configure filters, save chart types. Wave 3 alternative entry to the AI builder."
          wave="Wave 3"
        />
      </div>
    </div>
  );
}
