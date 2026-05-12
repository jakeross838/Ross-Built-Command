// src/app/reports/ai-builder/page.tsx
// Wave 3 placeholder per Stage 1.5c Plan 4 — AI report builder.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function AIBuilderPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Reports · AI builder"
          headline="Natural-language report builder"
          body="Ask the system a question in natural language ('show me bills over $10k that aged 60+ days last quarter, grouped by vendor') — get a working report. Wave 3 AI Report Builder."
          wave="Wave 3"
        />
      </div>
    </div>
  );
}
