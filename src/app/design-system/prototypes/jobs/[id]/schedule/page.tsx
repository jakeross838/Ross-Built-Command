// src/app/design-system/prototypes/jobs/[id]/schedule/page.tsx
//
// Thin wrapper for the job schedule (Gantt) prototype (Stage 1.5c Plan 3a).
// Mirrors the production wrapper at /jobs/[id]/schedule but
// (a) breadcrumbRoot points back to the prototypes gallery and
// (b) no inner .design-system-scope wrap — prototypes/layout.tsx provides it.
//
// Hook T10c — fixture import silent in design-system paths.

import { notFound } from "next/navigation";
import {
  CALDWELL_SCHEDULE_ITEMS,
  CALDWELL_VENDORS,
  CALDWELL_JOBS,
} from "@/app/design-system/_fixtures/drummond";
import ScheduleView from "@/components/prototypes/ScheduleView";

export default function JobSchedulePrototypePage({
  params,
}: {
  params: { id: string };
}) {
  const job = CALDWELL_JOBS.find((j) => j.id === params.id);
  if (!job) return notFound();

  return (
    <ScheduleView
      job={job}
      scheduleItems={CALDWELL_SCHEDULE_ITEMS}
      vendors={CALDWELL_VENDORS}
      breadcrumbRoot={{
        href: "/design-system/prototypes/",
        label: "Prototypes",
      }}
    />
  );
}
