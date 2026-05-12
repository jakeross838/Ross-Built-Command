// src/app/sub-portal/page.tsx
//
// Sub Portal AUTHENTICATED stub per Stage 1.5c CONTEXT D-02 (Q3=B).
// F3 wires real authentication + the role engine + sub-side
// dashboards. iter-2 mechanical #5: explicit F3 compliance contract
// documented in copy so the F3 implementer doesn't reinvent the
// posture.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function SubPortalAuthPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Sub Portal · Authenticated"
          headline="Subcontractor self-service portal"
          body="Subcontractors with full accounts manage Bids / POs / Bills / Schedule / Daily Logs / RFIs / Documents / Profile from one workspace. Authenticated via existing Supabase auth + role gate ('sub' or future 'sub_foreman' / 'sub_bookkeeper'). F3 compliance contract: standard org_members RLS posture (org-scoped reads); cookie-based session; audit-log writes on every mutation. JWT-with-org-claim REJECTED by-construction (the org_id leakage on a stolen token is a vulnerability surface; instead, server-side resolves org from the membership row keyed off auth.uid)."
          wave="F3"
        />
      </div>
    </div>
  );
}
