// src/app/financials/page.tsx
//
// Financials section overview per Stage 1.5c Plan 4. Restructured from
// the prior `redirect("/financial")` stub into a proper Card grid that
// links to each Financials sub-route. Per CONTEXT D-01 the canonical
// user-facing terminology is Bills / Pay Apps / Lien Releases (code
// identifiers keep `invoice` / `draw` / `lien` per Plan 4 scope).
//
// iter-2 architect W-5 status: RESTRUCTURE — prior page was a redirect
// only (5 LOC). No real logic to preserve. The redirect chain is:
// /financial (legacy) → Plan 1 redirect → /financials (this overview).
//
// Token discipline: Site Office. NwPlaceholderCard is reserved for
// leaf sub-routes; the overview uses Card + Eyebrow + Badge directly.

import Link from "next/link";
import Card from "@/components/nw/Card";
import Eyebrow from "@/components/nw/Eyebrow";
import Badge from "@/components/nw/Badge";

const FINANCIALS_SECTIONS = [
  { href: "/financials/bills", label: "Bills", desc: "All bills — review + approve + assign", wave: "Live", live: true },
  { href: "/financials/pay-apps", label: "Pay Apps", desc: "AIA G702 / G703 draw applications", wave: "Live", live: true },
  { href: "/financials/payments", label: "Payments", desc: "Payment tracking — check pickup + mail", wave: "Live", live: true },
  { href: "/financials/lien-releases", label: "Lien Releases", desc: "Conditional + unconditional waivers", wave: "Live", live: true },
  { href: "/financials/aging", label: "Aging", desc: "Cross-job invoice aging buckets", wave: "Live", live: true },
  { href: "/financials/purchase-orders", label: "Purchase Orders", desc: "Org-wide PO list — F1 unifies job-scoped POs", wave: "F1", live: false },
  { href: "/financials/change-orders", label: "Change Orders", desc: "Org-wide change order list — F1 unifies job-scoped COs", wave: "F1", live: false },
];

export default function FinancialsOverviewPage() {
  return (
    <div className="px-6 py-8 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <Eyebrow tone="muted" className="mb-2">Financials</Eyebrow>
        <h1
          className="text-[28px] mb-1"
          style={{
            fontFamily: "var(--font-space-grotesk)",
            fontWeight: 500,
            color: "var(--text-primary)",
          }}
        >
          Bills, Pay Apps & Cash Flow
        </h1>
        <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
          Bill intake through payment + lien releases. Pay Apps roll up to AIA G702 / G703.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {FINANCIALS_SECTIONS.map((s) => (
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
