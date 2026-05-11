// src/app/admin/page.tsx
//
// Admin section overview — canonical destination per CONTEXT D-22 (= MASTER-PLAN D-060).
// Clicking "Admin" in top nav routes here; AdminDropdown is the power-user shortcut.
//
// 13-item structure per CONTEXT D-15 / Part 7 F:
//   /admin (this overview) + 12 sub-routes (4 REAL-LOGIC + 8 placeholders)
//
// Per Stage 1.5c Plan 6 — replaces prior 5-line redirect that pointed to
// /settings/company (which Plan 1's redirect map sends back to /admin,
// creating a redirect loop — Rule 1 fix).
//
// Token discipline: Site Office (Eyebrow / Space Grotesk Medium / Badge).
// No hardcoded hex. Section overview uses Card grid (matches Plan 4 pipeline
// section overview pattern).

import Link from "next/link";
import Card from "@/components/nw/Card";
import Eyebrow from "@/components/nw/Eyebrow";
import Badge from "@/components/nw/Badge";

type AdminTile = {
  href: string;
  label: string;
  desc: string;
  status: "live" | "placeholder";
  wave?: "F2" | "F3" | "Wave 3";
};

const ADMIN_TILES: AdminTile[] = [
  // REAL-LOGIC (4)
  { href: "/admin/users", label: "Users", desc: "Manage team members, invites, and roles", status: "live" },
  { href: "/admin/cost-codes", label: "Cost Codes", desc: "5-digit AIA G703 line items per org", status: "live" },
  { href: "/admin/billing", label: "Billing", desc: "Subscription, payment method, invoices", status: "live" },
  // F2 placeholders
  { href: "/admin/roles", label: "Roles", desc: "15-role library (Owner, GM, PM, etc.) — customizable per org", status: "placeholder", wave: "F2" },
  { href: "/admin/permissions", label: "Permissions", desc: "Per-role permission matrix (Read / Write / Approve)", status: "placeholder", wave: "F2" },
  { href: "/admin/org-chart", label: "Org Chart", desc: "Visual hierarchy — drives approval routing", status: "placeholder", wave: "F2" },
  { href: "/admin/profile", label: "Profile", desc: "Org type selector — Custom Builder / Remodeler / Commercial GC", status: "placeholder", wave: "F2" },
  // F3 placeholders
  { href: "/admin/approval-workflows", label: "Approval Workflows", desc: "Customizable approval routing per company", status: "placeholder", wave: "F3" },
  { href: "/admin/notification-rules", label: "Notification Rules", desc: "Who gets notified for what events", status: "placeholder", wave: "F3" },
  { href: "/admin/workflow-customization", label: "Workflow Customization", desc: "Adjust per-company business rules", status: "placeholder", wave: "F3" },
  // Placeholder (no source to mount — was listed REAL-LOGIC in plan but /settings/integrations
  // does not exist; per Plan 6 deviation Rule 3 auto-fix, treat as placeholder)
  { href: "/admin/integrations", label: "Integrations", desc: "QuickBooks, Buildertrend, Stripe — connection management", status: "placeholder", wave: "F3" },
  // Wave 3 placeholders
  { href: "/admin/templates", label: "Templates", desc: "Document + email templates", status: "placeholder", wave: "Wave 3" },
];

export default function AdminOverviewPage() {
  return (
    <div className="px-6 py-8 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <Eyebrow tone="muted" className="mb-2">Admin</Eyebrow>
        <h1
          className="text-[28px] mb-1"
          style={{
            fontFamily: "var(--font-space-grotesk)",
            fontWeight: 500,
            color: "var(--text-primary)",
          }}
        >
          Org settings
        </h1>
        <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
          Roles, permissions, billing, cost codes, and customization for your organization.
          Cross-tenant operations live in <Link href="/platform-admin" className="underline">Platform Admin</Link>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {ADMIN_TILES.map((tile) => (
          <Link key={tile.href} href={tile.href} className="block">
            <Card padding="md">
              <Eyebrow tone="default" className="mb-2">{tile.label}</Eyebrow>
              <p className="text-[13px] mb-3" style={{ color: "var(--text-secondary)" }}>
                {tile.desc}
              </p>
              {tile.status === "live" ? (
                <Badge variant="success">Live</Badge>
              ) : (
                <Badge variant="neutral">Coming {tile.wave}</Badge>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
