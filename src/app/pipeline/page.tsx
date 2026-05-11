// src/app/pipeline/page.tsx
//
// Pipeline section overview per Stage 1.5c Plan 4 — pre-construction
// lifecycle per Principle 8. Profile-aware (custom_builder shows full
// Pipeline; remodeler hides — F2 wires the hide rule). 1.5c renders the
// same nav for all profiles.
//
// Token discipline: Site Office (Eyebrow / Space Grotesk Medium /
// Badge). No hardcoded hex. NwPlaceholderCard is reserved for the leaf
// sub-routes; this overview page uses a Card grid to advertise the 5
// upcoming sub-sections.

import Link from "next/link";
import Card from "@/components/nw/Card";
import Eyebrow from "@/components/nw/Eyebrow";
import Badge from "@/components/nw/Badge";

const PIPELINE_SECTIONS = [
  { href: "/pipeline/leads", label: "Leads", desc: "CRM intake — track potential clients", wave: "Wave 4" },
  { href: "/pipeline/estimates", label: "Estimates", desc: "Price Intel powered estimates", wave: "Wave 4" },
  { href: "/pipeline/bids-out", label: "Bids out", desc: "Sub bids in flight", wave: "Wave 4" },
  { href: "/pipeline/proposals", label: "Proposals", desc: "E-sign proposals to clients", wave: "Wave 4" },
  { href: "/pipeline/contracts", label: "Contracts", desc: "Owner contracts + sub master agreements", wave: "Wave 4" },
];

export default function PipelineOverviewPage() {
  return (
    <div className="px-6 py-8 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <Eyebrow tone="muted" className="mb-2">Pipeline</Eyebrow>
        <h1
          className="text-[28px] mb-1"
          style={{
            fontFamily: "var(--font-space-grotesk)",
            fontWeight: 500,
            color: "var(--text-primary)",
          }}
        >
          Pre-construction
        </h1>
        <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
          From lead intake through signed contract. Powered by Price Intel for accurate estimates.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {PIPELINE_SECTIONS.map((s) => (
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
