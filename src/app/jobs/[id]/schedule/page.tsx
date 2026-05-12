// src/app/jobs/[id]/schedule/page.tsx
//
// Production route — Job schedule (Gantt) (Stage 1.5c Plan 3 thin
// wrapper). Mounts ScheduleView with Caldwell schedule fixtures.
//
// Architect W-5 status: PLACEHOLDER (no prior implementation; this is a
// new route per Wave 2 schedule preview surface). F1 wires real
// schedule_items table when ready.
//
// Per CONTEXT D-19: outer wraps in .design-system-scope.
// Per CONTEXT D-11: schedule_items shape is 1.5b proposed (NOT canonical
// — F1 may revise based on real complexity).
//
// Hook T10c — fixture import silent in production paths.

import { notFound } from "next/navigation";
import {
  CALDWELL_SCHEDULE_ITEMS,
  CALDWELL_VENDORS,
  CALDWELL_JOBS,
} from "@/app/design-system/_fixtures/drummond";
import ScheduleView from "@/components/prototypes/ScheduleView";

export default function JobSchedulePage({
  params,
}: {
  params: { id: string };
}) {
  const job = CALDWELL_JOBS.find((j) => j.id === params.id);
  if (!job) return notFound();

  return (
    <div data-direction="C" data-palette="B" className="design-system-scope">
      <ScheduleView
        job={job}
        scheduleItems={CALDWELL_SCHEDULE_ITEMS}
        vendors={CALDWELL_VENDORS}
        breadcrumbRoot={{ href: `/jobs/${job.id}`, label: job.name }}
      />
    </div>
  );
}
