// src/app/people/page.tsx
//
// People section overview per Stage 1.5c Plan 4. Card grid linking to
// Vendors (LIVE from Plan 3) + Clients (F1) + Team (F2) + Org Chart
// (F2) + Sub Portal (F3). The /people/vendors route is the only
// production destination; the rest are placeholders.

import Link from "next/link";
import Card from "@/components/nw/Card";
import Eyebrow from "@/components/nw/Eyebrow";
import Badge from "@/components/nw/Badge";

// Static IA — full directory preserved. Internal-Launch Phase 1:
// /people section middleware-404'd unconditionally by middleware Task 3
// hardcoded pathname check per nwrp232 OQ #3 path (b). The Card grid below
// is defensive future-state — when /people un-hides at F2/Wave-2 (via code
// change, NOT env-var flip), the filter renders only live entries.
//
// Per nwrp232 Disposition 1: Vendors marked live:false (Caldwell-fixture-
// mount; same architectural class as schedule; un-hides at Wave-2 real-DB
// swap). With all entries now live:false, PEOPLE_SECTIONS = empty array
// in flag-OFF state — appropriate defensive posture since users can't
// reach this page anyway via the middleware gate.
const ALL_PEOPLE_SECTIONS = [
  { href: "/people/vendors", label: "Vendors", desc: "Subcontractor + supplier directory", wave: "Wave-2", live: false },  // hidden per nwrp232 Disposition 1 — Caldwell-fixture-mount; un-hides at Wave-2 real-DB swap
  { href: "/people/clients", label: "Clients", desc: "Client directory + relationship history", wave: "F1", live: false },
  { href: "/people/team", label: "Team", desc: "Internal team — employees, roles, comp", wave: "F2", live: false },
  { href: "/people/org-chart", label: "Org chart", desc: "Reporting structure + approval routing", wave: "F2", live: false },
  { href: "/sub-portal", label: "Sub Portal", desc: "Subcontractor self-service portal entry", wave: "F3", live: false },
];

// Defensive future-state; no flag check since PEOPLE not in FeatureFlagName
// union per nwrp232 OQ #3 path (b); whole /people middleware-404'd hardcoded
// so this filter is unreachable in flag-OFF state.
const PEOPLE_SECTIONS = ALL_PEOPLE_SECTIONS.filter((s) => s.live);

export default function PeopleOverviewPage() {
  return (
    <div className="px-6 py-8 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <Eyebrow tone="muted" className="mb-2">People</Eyebrow>
        <h1
          className="text-[28px] mb-1"
          style={{
            fontFamily: "var(--font-space-grotesk)",
            fontWeight: 500,
            color: "var(--text-primary)",
          }}
        >
          Directory & roles
        </h1>
        <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
          Vendors, clients, internal team, and the Sub Portal entry. Org chart drives approval routing.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {PEOPLE_SECTIONS.map((s) => (
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
