// src/app/platform-admin/page.tsx
//
// Platform Admin index per CONTEXT D-09 + iter-2 D-20 (Decision B-modified).
// Index is a placeholder showing directory of available tools; sub-routes
// (audit, organizations, etc.) are REAL-LOGIC migrated from /admin/platform/*
// per iter-2 D-20.
//
// Per CLAUDE.md "Platform admin (cross-tenant)" section: existing posture
// preserved (platform_admins table gates access via middleware regex at
// src/middleware.ts:130 — extended in Plan 6 Task 2 per iter-2 must-fix
// CRITICAL #4 Option A LOCKED).
//
// The migrated tools below provide REAL functionality (preserved verbatim
// per iter-2 mechanical #10 — getCurrentMembership / Supabase client type
// preserved across migration; see Plan 6 SUMMARY for grep diff results).
//
// SEC-9 note: /platform-admin/audit uses createServerClient() (anon +
// session cookie + RLS gate via platform_admin_audit_staff_read policy).
// NOT service-role. Migrated verbatim from source.

import Link from "next/link";
import Card from "@/components/nw/Card";
import Eyebrow from "@/components/nw/Eyebrow";
import Badge from "@/components/nw/Badge";

type PlatformTool = {
  href: string;
  label: string;
  desc: string;
};

const PLATFORM_TOOLS: PlatformTool[] = [
  { href: "/platform-admin/organizations", label: "Organizations", desc: "All orgs across the platform — search, filter, drill into detail" },
  { href: "/platform-admin/users", label: "Users", desc: "Cross-org user search + impersonation" },
  { href: "/platform-admin/audit", label: "Audit log", desc: "Append-only cross-org audit trail of every staff action" },
  { href: "/platform-admin/feedback", label: "Feedback", desc: "User feedback inbox — bug reports, ideas, confusion notes" },
  { href: "/platform-admin/support", label: "Support", desc: "Support tickets across orgs — AI chat threads + escalations" },
  { href: "/platform-admin/cost-intelligence", label: "Cost Intelligence Ops", desc: "CI engine controls + verification queue (items, pricing, extractions, classifications, conversions, bootstrap)" },
];

export default function PlatformAdminIndexPage() {
  return (
    <div className="space-y-8">
      <div>
        <Eyebrow tone="muted" className="mb-2">
          PLATFORM ADMIN
        </Eyebrow>
        <h1
          className="font-display text-3xl tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Cross-org operations
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          For Jake / Andrew and future operations staff. Existing platform_admins gate
          enforced via middleware regex extension (iter-2 must-fix CRITICAL #4 Option A
          LOCKED — /platform-admin/* gated with same isPlatformAdmin posture as
          /admin/platform/*). Audit log records every staff action.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {PLATFORM_TOOLS.map((tool) => (
          <Link key={tool.href} href={tool.href} className="block">
            <Card padding="md">
              <div className="flex items-start justify-between gap-3 mb-2">
                <Eyebrow tone="accent">{tool.label}</Eyebrow>
                <Badge variant="success">LIVE</Badge>
              </div>
              <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                {tool.desc}
              </p>
            </Card>
          </Link>
        ))}
      </div>

      <p
        className="text-[11px]"
        style={{
          fontFamily: "var(--font-jetbrains-mono)",
          letterSpacing: "0.08em",
          color: "var(--text-tertiary)",
        }}
      >
        MIGRATED FROM /ADMIN/PLATFORM PER STAGE 1.5C D-20 · F1 / WAVE 1.1-LITE DELETES ORIGINALS
      </p>
    </div>
  );
}
