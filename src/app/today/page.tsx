"use client";

// src/app/today/page.tsx
//
// Today screen scaffold — the personal home screen per Principle 7 +
// CONTEXT D-05/D-10 / Q6=C / Q7=A.
//
// Wave-zero layout (1.5c): three sections.
//   1. "Your Day" placeholder Card: "Coming F3 — personalized daily plan."
//   2. Action Items: org-wide queues from /api/dashboard (existing
//      aggregator endpoint reused).
//   3. Activity Feed: org-wide activity entries from /api/dashboard.
//
// Cash Flow + Getting Started moved to /company/overview per Q6=C
// (see src/app/company/overview/page.tsx).
//
// Role-aware logic: SKELETON only in 1.5c per D-10 / Q12=A. Same content
// for all users. F2 wires actual role-personalization. The current
// /api/dashboard endpoint already filters by org via getCurrentMembership;
// in F2 the Action Items + Activity feed will become role-personalized
// via that same endpoint adding role-specific queries.
//
// Token discipline: Site Office direction inherited from root chain
// (globals.css + colors_and_type.css + design-system.css imported at
// root layout per iter-3 D-23). Plan 3 wraps in .design-system-scope.
// No hardcoded hex; only CSS vars and Slate `nw-*` utilities.
//
// Component reuse approach (per plan Step B):
//   The dashboard Attention + Activity sections are inline in the
//   existing dashboard/page.tsx. Extracting them in 1.5c would be a
//   larger refactor than necessary — Plan 7 may retire dashboard/page.tsx
//   entirely. For now, /today implements the same render shape against
//   the same /api/dashboard contract. Behavior is identical.

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/app-shell";
import {
  formatRelativeTime,
  formatStatus,
} from "@/lib/utils/format";
import { SkeletonBlock } from "@/components/loading-skeleton";
import EmptyState, { EmptyIcons } from "@/components/empty-state";
import NwCard from "@/components/nw/Card";
import NwEyebrow from "@/components/nw/Eyebrow";
import NwBadge from "@/components/nw/Badge";
import NwButton from "@/components/nw/Button";
import NwStatusDot, { type StatusDotVariant } from "@/components/nw/StatusDot";

interface AttentionItem {
  kind: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  href: string;
  ageDays?: number;
}

interface ActivityEntry {
  id: string;
  user_name: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
  job_name?: string | null;
  job_id?: string | null;
  link_href?: string;
}

interface TodayData {
  attention: { total: number; items: AttentionItem[] };
  activity: ActivityEntry[];
}

export default function Today() {
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Today failed (${res.status})`);
      }
      const json = await res.json();
      setData({
        attention: json.attention,
        activity: json.activity,
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Couldn't load today");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AppShell>
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-6 py-8">
        {/* Header band */}
        <div className="mb-6 animate-fade-up">
          <NwEyebrow tone="muted" className="mb-2">Today</NwEyebrow>
          <h1
            className="m-0 text-[28px]"
            style={{
              fontFamily: "var(--font-space-grotesk)",
              fontWeight: 500,  // NOT 600 per TD-26 fix
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
            }}
          >
            Your action items and queues
          </h1>
        </div>

        {errorMessage && !loading && (
          <section className="mb-6 animate-fade-up">
            <NwCard
              padding="md"
              style={{ borderColor: "var(--nw-danger)" }}
            >
              <NwEyebrow tone="danger" className="mb-2">Couldn&apos;t load</NwEyebrow>
              <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                {errorMessage}
              </p>
              <div className="mt-4">
                <NwButton variant="secondary" size="sm" onClick={load}>Retry</NwButton>
              </div>
            </NwCard>
          </section>
        )}

        {/* Section 1 — Your Day placeholder (per D-10 — F3 wires
            personalization). Renders even when data fetch fails. */}
        <section className="mb-6 animate-fade-up">
          <NwCard padding="md">
            <NwEyebrow tone="muted" className="mb-2">Your Day</NwEyebrow>
            <h2
              className="text-[20px] mb-2"
              style={{
                fontFamily: "var(--font-space-grotesk)",
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              Coming F3 — personalized daily plan
            </h2>
            <p className="text-[14px] mb-3" style={{ color: "var(--text-secondary)" }}>
              A role-personalized daily action plan. PMs see their queues +
              day&apos;s schedule. Field workers see today&apos;s job + clock-in.
              Accountants see their queues. Owners see the strategic dashboard.
            </p>
            <NwBadge variant="neutral">Coming F3</NwBadge>
          </NwCard>
        </section>

        {/* Section 2 — Action Items (org-wide queues from /api/dashboard) */}
        <section className="mb-6 animate-fade-up stagger-1">
          <SectionHeader
            title="Action Items"
            subtitle={data ? `${data.attention.total} item${data.attention.total === 1 ? "" : "s"}` : undefined}
          />
          {loading || !data ? (
            <SkeletonBlock height="h-64" />
          ) : data.attention.items.length === 0 ? (
            <EmptyState
              icon={<EmptyIcons.Check />}
              variant="success"
              title="You're all caught up"
              message="Nothing needs your attention right now. New action items will appear here as data flows in."
            />
          ) : (
            <NwCard padding="none">
              <ul>
                {data.attention.items.map((item, i) => (
                  <AttentionRow key={`${item.kind}-${i}`} item={item} />
                ))}
              </ul>
              {data.attention.total > data.attention.items.length && (
                <div className="border-t px-4 py-3 text-center" style={{ borderColor: "var(--border-default)" }}>
                  <Link href="/financials/bills/queue" className="text-sm hover:underline" style={{ color: "var(--nw-gulf-blue)" }}>
                    View all {data.attention.total} items
                  </Link>
                </div>
              )}
            </NwCard>
          )}
        </section>

        {/* Section 3 — Activity Feed */}
        <section className="animate-fade-up stagger-2">
          <SectionHeader title="Activity Feed" />
          {loading || !data ? (
            <SkeletonBlock height="h-96" />
          ) : data.activity.length === 0 ? (
            <EmptyState
              icon={<EmptyIcons.Activity />}
              title="No activity yet"
              message="Actions will appear here as your team uses the system."
            />
          ) : (
            <NwCard padding="none">
              <ul>
                {data.activity.map((entry) => (
                  <ActivityRow key={entry.id} entry={entry} />
                ))}
              </ul>
              <div className="border-t px-4 py-3 text-center" style={{ borderColor: "var(--border-default)" }}>
                <Link href="/admin" className="text-sm hover:underline" style={{ color: "var(--nw-gulf-blue)" }}>
                  View all activity
                </Link>
              </div>
            </NwCard>
          )}
        </section>
      </main>
    </AppShell>
  );
}

// ---------- Section Header ----------
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <h2
        className="m-0"
        style={{
          fontFamily: "var(--font-space-grotesk)",
          fontWeight: 500,
          fontSize: "18px",
          letterSpacing: "-0.01em",
          color: "var(--text-primary)",
        }}
      >
        {title}
      </h2>
      {subtitle && <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{subtitle}</p>}
    </div>
  );
}

// ---------- Attention Row ----------
const SEV_DOT: Record<AttentionItem["severity"], StatusDotVariant> = {
  critical: "danger",
  high: "danger",
  medium: "pending",
  low: "inactive",
};

function AttentionRow({ item }: { item: AttentionItem }) {
  return (
    <li className="border-b last:border-0" style={{ borderColor: "var(--border-default)" }}>
      <Link
        href={item.href}
        className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-subtle)] transition-colors"
      >
        <NwStatusDot variant={SEV_DOT[item.severity]} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{item.title}</span>
            {item.ageDays !== undefined && item.ageDays > 0 && (
              <NwBadge
                variant={item.severity === "critical" || item.severity === "high" ? "danger" : "warning"}
                size="sm"
              >
                {item.ageDays}d
              </NwBadge>
            )}
          </div>
          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-tertiary)" }}>{item.description}</p>
        </div>
        <svg
          className="shrink-0 w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          style={{ color: "var(--text-tertiary)" }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </li>
  );
}

// ---------- Activity Row ----------
function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const verb = describeAction(entry.action, entry.details);
  const entityLabel = describeEntity(entry.entity_type, entry.details);
  const summary = `${entry.user_name ?? "System"} ${verb} ${entityLabel}${entry.job_name ? ` on ${entry.job_name}` : ""}`;
  const content = (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--bg-subtle)] transition-colors">
      <span className="mt-1.5">
        <NwStatusDot variant="info" size="sm" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{ color: "var(--text-primary)" }}>{summary}</p>
        <p
          className="text-[10px] uppercase tracking-[0.14em] mt-0.5"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            color: "var(--text-tertiary)",
          }}
        >
          {formatRelativeTime(entry.created_at)}
        </p>
      </div>
    </div>
  );
  return (
    <li className="border-b last:border-0" style={{ borderColor: "var(--border-default)" }}>
      {entry.link_href ? <Link href={entry.link_href}>{content}</Link> : content}
    </li>
  );
}

function describeAction(action: string, details: Record<string, unknown> | null): string {
  switch (action) {
    case "created":     return "created";
    case "updated":     return "updated";
    case "approved":    return "approved";
    case "denied":      return "denied";
    case "voided":      return "voided";
    case "merged":      return "merged";
    case "imported":    return "imported";
    case "deleted":     return "deleted";
    case "delete_blocked": return "tried to delete";
    case "void_blocked":   return "tried to void";
    case "recomputed":  return "recomputed";
    case "status_changed": {
      const to = details && typeof details["to"] === "string" ? formatStatus(details["to"] as string) : "";
      return to ? `set status to ${to} on` : "changed status of";
    }
    default:
      return action.replace(/_/g, " ");
  }
}

function describeEntity(entityType: string, details: Record<string, unknown> | null): string {
  // Per CONTEXT D-01 (Bills/Pay Apps rename) — surface the new
  // user-facing labels in the activity feed even though historical
  // audit_log rows use entity_type "invoice" / "draw". Per Plan 2
  // architect decision: UI surfaces both as the new terminology
  // uniformly; action_log rows stay AS-IS, no migration.
  const map: Record<string, string> = {
    invoice: "a bill",
    purchase_order: "a PO",
    change_order: "a change order",
    budget_line: "a budget line",
    budget: "the budget",
    job: "a job",
    vendor: "a vendor",
    cost_code: "a cost code",
    draw: "a pay app",
    user: "a user",
  };
  if (details) {
    if (typeof details["invoice_number"] === "string") return `Bill #${details["invoice_number"]}`;
    if (typeof details["po_number"] === "string") return `PO ${details["po_number"]}`;
    if (typeof details["draw_number"] === "number") return `Pay App #${details["draw_number"]}`;
    if (typeof details["name"] === "string") return `${map[entityType] ?? entityType} ${details["name"]}`;
  }
  return map[entityType] ?? entityType;
}
