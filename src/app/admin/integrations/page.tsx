// src/app/admin/integrations/page.tsx
//
// Integrations placeholder per Stage 1.5c Plan 6.
//
// Plan-spec note: the plan listed /admin/integrations as REAL-LOGIC mounting
// /settings/integrations — but /settings/integrations does not exist in the
// current codebase. Per Plan 6 deviation Rule 3 (auto-fix blocking issue),
// this is rendered as a placeholder describing the future-state. F2 builds
// the actual QuickBooks / Buildertrend / Stripe connection UI here.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function IntegrationsPlaceholderPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Admin · Integrations"
          headline="Third-party connections"
          body="QuickBooks Online, Buildertrend, Stripe — manage credentials, sync settings, and audit logs. Stripe billing connection is configured under /admin/billing; this surface adds the broader integration registry."
          wave="F3"
        />
      </div>
    </div>
  );
}
