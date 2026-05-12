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

const PEOPLE_SECTIONS = [
  { href: "/people/vendors", label: "Vendors", desc: "Subcontractor + supplier directory", wave: "Live", live: true },
  { href: "/people/clients", label: "Clients", desc: "Client directory + relationship history", wave: "F1", live: false },
  { href: "/people/team", label: "Team", desc: "Internal team — employees, roles, comp", wave: "F2", live: false },
  { href: "/people/org-chart", label: "Org chart", desc: "Reporting structure + approval routing", wave: "F2", live: false },
  { href: "/sub-portal", label: "Sub Portal", desc: "Subcontractor self-service portal entry", wave: "F3", live: false },
];

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
