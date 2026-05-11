// src/app/design-system/prototypes/owner-portal/page.tsx
//
// Thin wrapper for the owner portal dashboard prototype (Stage 1.5c
// Plan 3a). Mirrors the production wrapper at /owner-portal but
// (a) drawReviewHref stays inside the prototypes gallery and
// (b) no inner .design-system-scope wrap — prototypes/layout.tsx provides it.
//
// Hook T10c — fixture import silent in design-system paths.

import { notFound } from "next/navigation";
import {
  CALDWELL_DRAWS,
  CALDWELL_JOBS,
  CALDWELL_CHANGE_ORDERS,
} from "@/app/design-system/_fixtures/drummond";
import OwnerDashboardView from "@/components/prototypes/OwnerDashboardView";

export default function OwnerPortalPrototypePage() {
  const job = CALDWELL_JOBS[0];
  if (!job) return notFound();

  return (
    <OwnerDashboardView
      job={job}
      draws={CALDWELL_DRAWS}
      changeOrders={CALDWELL_CHANGE_ORDERS}
      drawReviewHref={(drawId) =>
        `/design-system/prototypes/owner-portal/draws/${drawId}`
      }
    />
  );
}
