// src/app/sub-portal/public/[token]/page.tsx
//
// Sub Portal PUBLIC READ-ONLY stub per Stage 1.5c CONTEXT D-02 (Q3=B)
// + iter-2 mechanical #5. F3 wires real public-link infrastructure
// mirroring the client_portal_access pattern from migration 00074.
//
// IMPORTANT — iter-2 mechanical #5 (a) param-reflection grep:
//   `grep -E "params\.token" src/app/sub-portal/public/[token]/page.tsx`
//   returns 0. This stub accepts the [token] route segment so the URL
//   pattern is named correctly for F3 share-link emails, but does NOT
//   read, validate, or reflect the token into HTML. F3 will validate
//   token + view-scope at the route-handler level (server-side).

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function SubPortalPublicLinkPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <NwPlaceholderCard
        eyebrow="Sub Portal · Public read-only"
        headline="Architects, inspectors, external observers"
        body={[
          "public read-only access — architects, inspectors, external observers receive a unique URL granting view-only access to specific job documents (plans, schedules, RFIs, photos). NO write or edit access.",
          "F3 compliance contract:",
          "(a) Token expiry: configurable per share (default 90 days).",
          "(b) Scope binding: single job + view-scope filter (e.g., 'plans only', 'schedule only').",
          "(c) Audit-log-on-use: every public link follow logs entity_type='client_portal_access' / action='accessed' (cross-link with the magic-link audit pattern).",
          "(d) Cookie-vs-querystring: public links use querystring (no session); each request validates token + view-scope.",
          "(e) JWT-with-org-claim REJECTED by-construction (the org_id leakage on a stolen token is a vulnerability surface; instead, server-side resolves scope from token hash).",
          "(f) Mirrors client_portal_access pattern (migration 00074): SHA-256 hash + service-role-API + anon-grant + audit-log.",
        ].join(" ")}
        wave="F3"
      />
    </div>
  );
}
