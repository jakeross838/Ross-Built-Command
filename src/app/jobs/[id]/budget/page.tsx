// src/app/jobs/[id]/budget/page.tsx
//
// Stage 1.5c Plan 3 → reframed 2026-06-02 per GTV Stage 1.5 walk
// (nwrp264-267).
//
// PRIOR IMPLEMENTATION — Caldwell fixture thin-wrapper:
//   Imported CALDWELL_* fixtures from @/app/design-system/_fixtures/drummond,
//   ran CALDWELL_JOBS.find(j => j.id === params.id), and notFound()'d
//   when the lookup missed (real Ross Built job UUIDs don't match the
//   caldwell-* fixture IDs). The 404 lied about the cause — implied
//   error / route-missing, not scope-deferred-pending-F1-wire-up. GTV
//   Stage 1.5 walk caught this on /jobs/{fish}/budget where 144
//   budget_lines exist in the DB but the page 404'd.
//
// NOW — NwPlaceholderCard placeholder, consistent with peer per-job
// tabs (/jobs/[id]/bills, /pay-apps, /activity). Honest "Coming F1"
// messaging communicates scope-deferred status. F1 wave wires this
// surface by replacing the placeholder with the existing BudgetView
// reading budget_lines filtered by job_id (scope path defined in
// the prior version's comment header and preserved as TD scope below).
//
// WIRED-REPLACEMENT SCOPE (tracked):
//   `.planning/tech-debt/TD-NW-PER-JOB-TAB-WIRING.md` — must ship
//   before Diane dogfood. F1 swap path:
//     - Replace this placeholder with server-side
//       getCurrentMembership() + supabase.from("budget_lines")
//         .select(...)
//         .eq("job_id", params.id)
//         .eq("org_id", membership.org_id)
//         .is("deleted_at", null)
//     - Mount existing <BudgetView /> with real data + currentDraw +
//       drawLineItems + changeOrders + costCodes (all already typed
//       in @/components/prototypes/BudgetView).
//
// PEER PATTERN: matches /jobs/[id]/bills/page.tsx + /pay-apps/page.tsx
// + /activity/page.tsx — all NwPlaceholderCard mounts; F1 / Wave 1.1-Lite
// scope.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function JobBudgetPage({
  params: _params,
}: {
  params: { id: string };
}) {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Job · Budget"
          headline="Budget"
          body="Job-scoped budget table — cost-code rows + revised estimates + previous applications + this-period + balance to finish (the G703-style view per AIA workflow). F1 wires the BudgetView with real budget_lines filtered by job_id."
          wave="F1"
        />
      </div>
    </div>
  );
}
