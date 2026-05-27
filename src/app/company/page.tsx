// src/app/company/page.tsx
//
// Company section overview per Stage 1.5c Plan 4. Card grid linking to
// Overview (LIVE from Plan 1 — Cash Flow + Getting Started) and the
// 11 future-state sub-routes that ride F4 / Wave 2 / Wave 3 / Wave 4.

import Link from "next/link";
import Card from "@/components/nw/Card";
import Eyebrow from "@/components/nw/Eyebrow";
import Badge from "@/components/nw/Badge";
import { isFeatureEnabled } from "@/lib/feature-flags";

// Static IA preserved. Internal-Launch Phase 1: /company section middleware-
// 404'd by middleware Task 3 when COMPANY flag !== "true". Defensive filter
// for symmetry.
//
// Per nwrp232 W-3: Overview marked live:false (same architectural class as
// /people/vendors — unreachable in flag-OFF state via middleware 404;
// un-hides at Wave-2/F4 when COMPANY flag flips + real Overview content
// ships). With all entries now live:false, COMPANY_SECTIONS = empty array
// in flag-OFF state — appropriate defensive posture since users can't reach
// this page anyway via the middleware gate.
const ALL_COMPANY_SECTIONS = [
  { href: "/company/overview", label: "Overview", desc: "Cash Flow + Getting Started checklist", wave: "Wave-2/F4", live: false },
  { href: "/company/p-l", label: "P&L", desc: "Profit & loss across active jobs + overhead", wave: "F4", live: false },
  { href: "/company/cash-flow", label: "Cash Flow", desc: "Detailed cash-flow forecasting", wave: "F4", live: false },
  { href: "/company/expenses", label: "Expenses", desc: "Overhead expense tracking + categorization", wave: "F4", live: false },
  { href: "/company/time-tracking", label: "Time tracking", desc: "Labor hours across employees + jobs", wave: "F4", live: false },
  { href: "/company/compliance", label: "Compliance", desc: "OSHA + regulatory compliance tracking", wave: "Wave 2", live: false },
  { href: "/company/fleet-equipment", label: "Fleet & equipment", desc: "Vehicles + tools + equipment utilization", wave: "F4", live: false },
  { href: "/company/insurance", label: "Insurance", desc: "GL + WC + builders-risk policies", wave: "Wave 2", live: false },
  { href: "/company/permits-licensing", label: "Permits & licensing", desc: "Company licenses + recurring permits", wave: "Wave 2", live: false },
  { href: "/company/tax", label: "Tax", desc: "Estimated quarterlies + year-end prep", wave: "Wave 4", live: false },
  { href: "/company/capacity-planning", label: "Capacity planning", desc: "Active-job capacity vs PM + crew bandwidth", wave: "Wave 3", live: false },
  { href: "/company/documents", label: "Documents", desc: "Company documents — policies + templates + master agreements", wave: "Wave 2", live: false },
];

const COMPANY_SECTIONS = ALL_COMPANY_SECTIONS.filter((s) => {
  if (!s.live && !isFeatureEnabled("COMPANY")) return false;
  return true;
});

export default function CompanyOverviewSectionPage() {
  return (
    <div className="px-6 py-8 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <Eyebrow tone="muted" className="mb-2">Company</Eyebrow>
        <h1
          className="text-[28px] mb-1"
          style={{
            fontFamily: "var(--font-space-grotesk)",
            fontWeight: 500,
            color: "var(--text-primary)",
          }}
        >
          Company-wide rollups
        </h1>
        <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
          Cross-job financials, compliance, fleet + equipment, capacity planning, and company documents.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {COMPANY_SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} className="block">
            <Card padding="md">
              <Eyebrow tone="default" className="mb-2">{s.label}</Eyebrow>
              <p className="text-[13px] mb-3" style={{ color: "var(--text-secondary)" }}>{s.desc}</p>
              <Badge variant={s.live ? "success" : "neutral"}>
                {s.live ? "Live" : `Coming ${s.wave}`}
              </Badge>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
