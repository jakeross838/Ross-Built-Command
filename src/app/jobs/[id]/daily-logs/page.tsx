// src/app/jobs/[id]/daily-logs/page.tsx
//
// Stage 1.5c Plan 5 placeholder — consumes NwPlaceholderCard from Plan 1.
// Daily logs with multi-modal ingestion per Principle 5. The PM walks the
// site with phone, talks while filming — the system transcribes, extracts
// entities, creates structured log entries automatically. ONE 10-second
// comment generates 5+ database operations across 4+ entities, manually-zero.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function JobDailyLogsPage({
  params: _params,
}: {
  params: { id: string };
}) {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <NwPlaceholderCard
          eyebrow="Job · Coordination"
          headline="Daily Logs"
          body="Daily logs. Multi-modal ingestion per Principle 5: PM walks site with phone, talks while filming. System transcribes voice → extracts entities (room, vendor, cost code, defect) → creates structured log entries. ONE 10-second comment generates 5+ database operations across 4+ entities, manually-zero."
          wave="Wave 2"
        />
      </div>
    </div>
  );
}
