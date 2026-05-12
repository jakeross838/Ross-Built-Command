// src/app/jobs/[id]/activity/page.tsx
//
// Stage 1.5c Plan 5 placeholder — consumes NwPlaceholderCard from Plan 1.
// REPLACES the prior client-side Supabase + JobFinancialBar implementation
// that Plan 3 Task 4 had only partially cleaned up (JobTabs removed; rest
// of the surface preserved). Plan 5 standardizes /jobs/[id]/activity as a
// proper NwPlaceholderCard placeholder so the IA reads consistently across
// all 19 placeholder routes.
//
// Prior implementation snapshot (pre-Plan 5) — for F1 reference when
// wiring the per-job activity_log filter:
//
//   "use client";
//   import { useEffect, useState } from "react";
//   import { useRouter } from "next/navigation";
//   import JobFinancialBar from "@/components/job-financial-bar";
//   import Breadcrumbs from "@/components/breadcrumbs";
//   import { supabase } from "@/lib/supabase/client";
//   // [auth + jobs.name fetch + "Activity log coming soon" card body]
//
// activity_log table already ships; F1 wires the per-job filter so this
// view becomes real (Wave 1.1-Lite).

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function JobActivityPage({
  params: _params,
}: {
  params: { id: string };
}) {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Job · Activity"
          headline="Activity"
          body="Activity feed for this job — every event (bill received, PO issued, schedule updated, etc.) chronological. The activity_log table already ships; Wave 1.1-Lite wires the per-job filter so this view becomes real."
          wave="Wave 1.1-Lite"
        />
      </div>
    </div>
  );
}
