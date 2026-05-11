// src/app/admin/profile/page.tsx
//
// Profile (Org Type) placeholder per Stage 1.5c Plan 6 + CONTEXT D-10 / Q12=A.
// Stubbed Custom Builder / Remodeler / Commercial GC selector — disabled
// (pointer-events-none) — demonstrates eventual selector shape without doing
// actual filtering. F2 wires this to org_settings + Today screen role-aware logic.
//
// The disabled tile grid uses Site Office tokens; no hardcoded hex.

import Card from "@/components/nw/Card";
import Eyebrow from "@/components/nw/Eyebrow";
import Badge from "@/components/nw/Badge";

type OrgTypeStub = {
  key: "custom_builder" | "remodeler" | "commercial_gc";
  label: string;
  desc: string;
};

const ORG_TYPE_STUBS: OrgTypeStub[] = [
  {
    key: "custom_builder",
    label: "Custom Builder",
    desc: "New-construction luxury homes. Cost-plus contracts. Full lifecycle from pre-construction through warranty.",
  },
  {
    key: "remodeler",
    label: "Remodeler",
    desc: "Renovation, addition, and remodel work. Mix of cost-plus and fixed-price. Punchlist-heavy.",
  },
  {
    key: "commercial_gc",
    label: "Commercial GC",
    desc: "Commercial general contractor. AIA G702/G703 draws against tenant-improvement and ground-up projects.",
  },
];

export default function ProfilePlaceholderPage() {
  return (
    <div className="px-6 py-8 max-w-[1000px] mx-auto">
      <div className="mb-6">
        <Eyebrow tone="muted" className="mb-2">Admin · Profile</Eyebrow>
        <h1
          className="text-[28px] mb-1"
          style={{
            fontFamily: "var(--font-space-grotesk)",
            fontWeight: 500,
            color: "var(--text-primary)",
          }}
        >
          Organization profile
        </h1>
        <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
          Pick the profile that best matches your business. F2 wires this to feature flags
          that adjust Today screen content, Pipeline visibility, and Reports defaults.
        </p>
        <Badge variant="neutral" className="mt-3">Coming F2</Badge>
      </div>

      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-4 pointer-events-none opacity-60"
        aria-disabled="true"
      >
        {ORG_TYPE_STUBS.map((tile) => (
          <Card key={tile.key} padding="md">
            <Eyebrow tone="default" className="mb-2">{tile.label}</Eyebrow>
            <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
              {tile.desc}
            </p>
          </Card>
        ))}
      </div>

      <p
        className="mt-6 text-[12px]"
        style={{
          fontFamily: "var(--font-jetbrains-mono)",
          letterSpacing: "0.08em",
          color: "var(--text-tertiary)",
        }}
      >
        SELECTOR DISABLED · F2 WIRES TO org_settings
      </p>
    </div>
  );
}
