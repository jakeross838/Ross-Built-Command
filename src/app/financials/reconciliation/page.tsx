// src/app/financials/reconciliation/page.tsx
//
// Production route — Reconciliation strawman (Stage 1.5c Plan 3 thin
// wrapper). Mounts ReconciliationView with all 8 candidate × drift-type
// pairs from CALDWELL_RECONCILIATION_PAIRS.
//
// Per CONTEXT Q3=C: the 4×2 candidate matrix renders top-to-bottom for
// side-by-side scrolling comparison. Final reconciliation lock happens
// post-Phase 3.9 (per nwrp44 Amendment 2 deferred decisions).
//
// Per CONTEXT D-19: outer wraps in .design-system-scope.
//
// Hook T10c — fixture import silent in production paths.

import {
  CALDWELL_RECONCILIATION_PAIRS,
} from "@/app/design-system/_fixtures/drummond";
import ReconciliationView from "@/components/prototypes/ReconciliationView";

export default function ReconciliationPage() {
  return (
    <div data-direction="C" data-palette="B" className="design-system-scope">
      <ReconciliationView
        pairs={CALDWELL_RECONCILIATION_PAIRS}
        breadcrumbRoot={{
          href: "/financials/reconciliation",
          label: "Reconciliation",
        }}
      />
    </div>
  );
}
