// src/app/design-system/prototypes/reconciliation/page.tsx
//
// Thin wrapper for the reconciliation strawman prototype (Stage 1.5c
// Plan 3a). Mirrors the production wrapper at /financials/reconciliation
// but
// (a) breadcrumbRoot stays inside the prototypes gallery and
// (b) no inner .design-system-scope wrap — prototypes/layout.tsx provides it.
//
// Hook T10c — fixture import silent in design-system paths.

import { CALDWELL_RECONCILIATION_PAIRS } from "@/app/design-system/_fixtures/drummond";
import ReconciliationView from "@/components/prototypes/ReconciliationView";

export default function ReconciliationPrototypePage() {
  return (
    <ReconciliationView
      pairs={CALDWELL_RECONCILIATION_PAIRS}
      breadcrumbRoot={{
        href: "/design-system/prototypes/",
        label: "Prototypes",
      }}
    />
  );
}
