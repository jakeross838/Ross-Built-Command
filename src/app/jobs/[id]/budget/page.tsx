// src/app/jobs/[id]/budget/page.tsx
//
// Production route — Job budget (Stage 1.5c Plan 3 thin wrapper).
// REPLACES the prior 1514-LOC client-side rendered page.tsx (Plan 3
// architect W-5 status: REAL → REPLACED with Caldwell fixture mount;
// F1 swaps fixtures for real Supabase queries on this wrapper side,
// View unchanged).
//
// BACKUP — F1 SWAP REFERENCE (per iter-2 architect W-5):
// The prior implementation used client-side Supabase auth + load:
//
//   "use client";
//   import { supabase } from "@/lib/supabase/client";
//   import JobTabs from "@/components/job-tabs";
//   ...
//   useEffect(() => {
//     (async () => {
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) {
//         router.replace(`/login?redirect=/jobs/${params.id}/budget`);
//         return;
//       }
//       await loadBudget();
//     })();
//   }, [params.id, router, loadBudget]);
//
//   // Inline JobTabs at line 710:
//   <JobTabs jobId={job.id} active="budget" />
//
// F1 swap path: replace fixture imports with server-side
// getCurrentMembership() + supabase.from('budget_lines').select(...)
// scoped by membership.org_id. Auth becomes server-side (middleware
// handles redirect). JobTabs is REMOVED in this rewrite per iter-2
// must-fix CRITICAL #2 — Plan 5's PerJobTabs in /jobs/[id]/layout.tsx
// is the sole tab surface.
//
// Per CONTEXT D-19 + iter-3 Q-iter2-1=a: outer container wraps in
// data-direction="C" data-palette="B" className="design-system-scope".
//
// Per CONTEXT D-14 (Q8=A): no real-backend wiring promotion in 1.5c.
// Production routes mount Caldwell fixtures for IA structural
// validation; F1 wires real data.
//
// Hook T10c — fixture import silent in production paths per Plan 2
// architect Option A finding.

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

export default function JobBudgetPage({
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
    <div data-direction="C" data-palette="B" className="design-system-scope">
      <BudgetView
        job={job}
        budgetLines={budgetLines}
        invoices={CALDWELL_INVOICES}
        costCodes={CALDWELL_COST_CODES}
        currentDraw={currentDraw}
        drawLineItems={drawLineItems}
        changeOrders={changeOrders}
        breadcrumbRoot={{ href: `/jobs/${job.id}`, label: job.name }}
      />
    </div>
  );
}
