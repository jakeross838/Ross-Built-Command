// src/app/reports/page.tsx
//
// Reports section overview per Stage 1.5c Plan 4 — Wave 3 AI Report
// Builder context. All sub-routes are placeholders for the Wave 3
// report-builder workflow.

import Link from "next/link";
import Card from "@/components/nw/Card";
import Eyebrow from "@/components/nw/Eyebrow";
import Badge from "@/components/nw/Badge";

const REPORTS_SECTIONS = [
  { href: "/reports/saved", label: "Saved", desc: "Your saved + shared reports", wave: "Wave 3" },
  { href: "/reports/ai-builder", label: "AI builder", desc: "Natural-language report builder", wave: "Wave 3" },
  { href: "/reports/custom-builder", label: "Custom builder", desc: "Drag-and-drop report builder", wave: "Wave 3" },
  { href: "/reports/scheduled", label: "Scheduled", desc: "Auto-delivered scheduled reports", wave: "Wave 3" },
  { href: "/reports/templates", label: "Templates", desc: "Pre-built report templates", wave: "Wave 3" },
];

export default function ReportsOverviewPage() {
  return (
    <div className="px-6 py-8 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <Eyebrow tone="muted" className="mb-2">Reports</Eyebrow>
        <h1
          className="text-[28px] mb-1"
          style={{
            fontFamily: "var(--font-space-grotesk)",
            fontWeight: 500,
            color: "var(--text-primary)",
          }}
        >
          Wave 3 AI Report Builder
        </h1>
        <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
          Ask the system a question in natural language and get a report. Schedule recurring deliveries. Save templates.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {REPORTS_SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} className="block">
            <Card padding="md">
              <Eyebrow tone="default" className="mb-2">{s.label}</Eyebrow>
              <p className="text-[13px] mb-3" style={{ color: "var(--text-secondary)" }}>{s.desc}</p>
              <Badge variant="neutral">Coming {s.wave}</Badge>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
