// src/app/jobs/[id]/layout.tsx
//
// Per-job route layout — mounts PerJobTabs sub-nav for all /jobs/[id]/* routes.
// 1.5c: hardcoded phase: "active". F2 reads from jobs.phase column or computed
// view. Per CLAUDE.md "Org-configurable, not hardcoded" — Plan 7 W-8 doc note
// flags the hardcoded phase-to-tab mapping for F2 externalization to
// org_settings or a computed view.
//
// iter-2 must-fix CRITICAL #2 cross-reference: Plan 3 Task 4 removed inline
// JobTabs from 9 existing /jobs/[id]/*/page.tsx files. PerJobTabs in this
// layout is the SOLE tab surface across all /jobs/[id]/* routes (existing +
// Plan 3 production + Plan 5 placeholders). Smoke test confirms zero double
// tab bars.
//
// Wraps existing /jobs/[id]/page.tsx + /jobs/[id]/budget + /jobs/[id]/schedule
// + ALL new per-job tabs from this plan + Plan 3.
//
// No existing /jobs/[id]/layout.tsx was present before this plan — verified
// via `ls src/app/jobs/[id]/layout.tsx` returning ENOENT during execution.

import type { ReactNode } from "react";
import PerJobTabs, { type JobPhase } from "@/components/nav/per-job-tabs";

export default function JobLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { id: string };
}) {
  // 1.5c hardcoded; F2 reads from jobs.phase (per CONTEXT D-12 + W-8 note).
  const phase: JobPhase = "active";

  return (
    <div>
      <PerJobTabs jobId={params.id} phase={phase} />
      {children}
    </div>
  );
}
