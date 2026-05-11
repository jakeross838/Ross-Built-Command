// src/app/sub-portal/magic/[token]/page.tsx
//
// Sub Portal MAGIC LINK stub per Stage 1.5c CONTEXT D-02 (Q3=B) +
// iter-2 mechanical #5. F3 wires real token validation
// infrastructure mirroring the client_portal_access pattern from
// migration 00074.
//
// IMPORTANT — iter-2 mechanical #5 (a) param-reflection grep:
//   `grep -E "params\.token" src/app/sub-portal/magic/[token]/page.tsx`
//   returns 0. This stub accepts the [token] route segment so the URL
//   pattern is named correctly for F3 magic-link emails, but does NOT
//   read, validate, or reflect the token into HTML (XSS surface
//   prevention). F3 will validate the token at the route-handler
//   level (server-side), not in this page component.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function SubPortalMagicLinkPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <NwPlaceholderCard
        eyebrow="Sub Portal · Magic link"
        headline="Email-driven magic link auth"
        body={[
          "Subcontractor clicks 'Respond to RFI' / 'Sign PO' / 'Submit Bill' email link → temporary session via signed token → respond.",
          "F3 compliance contract:",
          "(a) Token expiry: 30-day default from email send (configurable per email type).",
          "(b) Scope binding: single job + single document; no cross-job exposure.",
          "(c) Audit-log-on-use: every magic link follow logs entity_type='client_portal_access' / action='accessed' to activity_log (mirror migration 00074 pattern).",
          "(d) Cookie-vs-querystring: magic links use querystring; verified via service-role-API endpoint; querystring is single-use (rotated on first follow).",
          "(e) JWT-with-org-claim REJECTED by-construction (the org_id leakage on a stolen token is a vulnerability surface; instead, server-side resolves scope from token hash).",
          "(f) Mirrors client_portal_access pattern (migration 00074): SHA-256 hash + service-role-API + anon-grant + audit-log.",
        ].join(" ")}
        wave="F3"
      />
    </div>
  );
}
