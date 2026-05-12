// src/app/price-intel/selections-catalog/page.tsx
// F5 placeholder per Stage 1.5c Plan 4 — selections catalog VIEW.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function SelectionsCatalogPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Price Intel · Selections Catalog"
          headline="Selections as a Price Intel view"
          body="Selections catalog as a VIEW of Price Intel filtered by product entities — picked → spec → ordered → delivered → installed → warranty lifecycle. Single source of truth shared across jobs."
          wave="F5"
        />
      </div>
    </div>
  );
}
