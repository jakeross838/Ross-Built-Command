// src/components/nw/NwPlaceholderCard.tsx
//
// Reusable placeholder card for ~50+ placeholder routes in Stage 1.5c.
// Per CONTEXT D-13 — describes future-state with Wave badge.
// Token discipline: Site Office tokens; no hardcoded hex.
//
// Per CONTEXT D-19 / Decision A (D-057) — production routes wrap in
// .design-system-scope class (Plan 3); this primitive is scope-agnostic
// (renders inside scope or outside; tokens resolve from CSS chain).
//
// Tenant-blind primitive — accepts no org_id / membership / vendor_id props.
// Per PROPAGATION-RULES.md §4b — Nw<Role> PascalCase like NwButton/NwEyebrow/NwBadge.
// Plan 7 atomic update adds COMPONENTS.md §7 entry per iter-2 mechanical fix #2.

import Card from "@/components/nw/Card";
import Eyebrow from "@/components/nw/Eyebrow";
import Badge from "@/components/nw/Badge";

export type PlaceholderWave =
  | "F1" | "F2" | "F3" | "F4" | "F5" | "F6"
  | "Wave 1.1-Lite" | "Wave 2" | "Wave 3" | "Wave 4";

export interface NwPlaceholderCardProps {
  eyebrow: string;
  headline: string;
  body: string;
  wave: PlaceholderWave;
  className?: string;
}

export default function NwPlaceholderCard({
  eyebrow,
  headline,
  body,
  wave,
  className = "",
}: NwPlaceholderCardProps) {
  return (
    <Card padding="md" className={className}>
      <Eyebrow tone="muted" className="mb-2">{eyebrow}</Eyebrow>
      <h1
        className="text-[24px] mb-2"
        style={{
          fontFamily: "var(--font-space-grotesk)",
          fontWeight: 500,  // NOT 600 per TD-26 fix
          color: "var(--text-primary)",
        }}
      >
        {headline}
      </h1>
      <p className="text-[14px] mb-3" style={{ color: "var(--text-secondary)" }}>
        {body}
      </p>
      <Badge variant="neutral">Coming {wave}</Badge>
    </Card>
  );
}
