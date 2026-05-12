// src/app/owner-portal/page.tsx
//
// Production route — Owner portal dashboard (Stage 1.5c Plan 3 thin
// wrapper). Mounts OwnerDashboardView with Caldwell fixtures.
//
// Per CONTEXT D-08 + iter-2 multi-tenant W-1 clarification:
//   - 1.5c is structural — Caldwell fixtures only. NO real auth flow
//     exercised in 1.5c.
//   - F1 commits to ONE auth path (NOT both):
//     Path A: extend client_portal_access token model (SHA-256 +
//             service-role-API + anon-grant per migration 00074)
//     Path B: introduce owner_view member role with RLS for owner-
//             scoped reads
//   - Plan 7 ARCHITECTURE.md / OWNER-PORTAL-CUTOVER.md documents this
//     constraint so F1 inherits it.
//   - 1.5c does NOT modify middleware; existing auth + role gate posture
//     applies (this route currently sits behind authenticated-org-member
//     middleware; F1 commits to either Path A or Path B above).
//
// Architect W-5 status: PLACEHOLDER.
//
// Per CONTEXT D-19: outer wraps in .design-system-scope.
//
// Hook T10c — fixture import silent in production paths.

import {
  CALDWELL_DRAWS,
  CALDWELL_JOBS,
  CALDWELL_CHANGE_ORDERS,
} from "@/app/design-system/_fixtures/drummond";
import OwnerDashboardView from "@/components/prototypes/OwnerDashboardView";
import { notFound } from "next/navigation";

export default function OwnerPortalPage() {
  // single-job Caldwell fixture; F1 wires real owner-scoped job lookup
  const job = CALDWELL_JOBS[0];
  if (!job) return notFound();

  return (
    <div data-direction="C" data-palette="B" className="design-system-scope">
      <OwnerDashboardView
        job={job}
        draws={CALDWELL_DRAWS}
        changeOrders={CALDWELL_CHANGE_ORDERS}
        drawReviewHref={(drawId) => `/owner-portal/pay-apps/${drawId}`}
      />
    </div>
  );
}
