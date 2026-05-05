// src/app/design-system/prototypes/jobs/[id]/budget/page.tsx
//
// Thin wrapper for the budget view prototype (Stage 1.5c Plan 2 — iter-2 W-2).
//
// Multi-fixture aggregation pattern wrapper: resolves 6 fixture types
// + currentDraw, passes them into BudgetView. Production routes at
// /jobs/[id]/budget (Plan 3) re-import the SAME BudgetView with the
// same fixture lookups (or real Supabase queries at F1).
//
// Site Office direction inherited from prototypes/layout.tsx
// (data-direction="C" data-palette="B" + .design-system-scope wrap).
//
// Hook T10c — wrapper imports fixtures freely (per AUDIT-LOG-STRATEGY.md
// T10c posture finding: src/app/design-system/* paths importing fixture
// constants are silent).

import { notFound } from "next/navigation";
import {
  CALDWELL_BUDGET_LINES,
  CALDWELL_INVOICES,
  CALDWELL_COST_CODES,
  CALDWELL_JOBS,
  CALDWELL_CHANGE_ORDERS,
  CALDWELL_DRAWS,
  CALDWELL_DRAW_LINE_ITEMS,
} from "@/app/design-system/_fixtures/drummond";
import BudgetView from "@/components/prototypes/BudgetView";

export default function BudgetPrototypePage({
  params,
}: {
  params: { id: string };
}) {
  const job = CALDWELL_JOBS.find((j) => j.id === params.id);
  if (!job) return notFound();

  // Identify "current draw" = the draw being prepared. For Caldwell the
  // canonical surface is Pay App 5 (per EXPANDED-SCOPE deliverable #3).
  // Falls back to the latest draw if the canonical id is ever renamed.
  const currentDraw =
    CALDWELL_DRAWS.find((d) => d.id === "d-caldwell-05") ??
    CALDWELL_DRAWS[CALDWELL_DRAWS.length - 1];
  if (!currentDraw) return notFound();

  // Filter to this job's budget lines + draw line items + change orders.
  // Invoices + cost codes are passed through globally (BudgetView filters
  // them per cost_code_id at render time per R.2).
  const budgetLines = CALDWELL_BUDGET_LINES.filter(
    (bl) => bl.job_id === job.id,
  );
  const drawLineItems = CALDWELL_DRAW_LINE_ITEMS.filter((dli) =>
    budgetLines.some((bl) => bl.id === dli.budget_line_id),
  );
  const changeOrders = CALDWELL_CHANGE_ORDERS.filter(
    (co) => co.job_id === job.id,
  );

  return (
    <BudgetView
      job={job}
      budgetLines={budgetLines}
      invoices={CALDWELL_INVOICES}
      costCodes={CALDWELL_COST_CODES}
      currentDraw={currentDraw}
      drawLineItems={drawLineItems}
      changeOrders={changeOrders}
      breadcrumbRoot={{
        href: "/design-system/prototypes/",
        label: "Prototypes",
      }}
    />
  );
}
