"use client";

// src/app/company/overview/page.tsx
//
// Company overview — the canonical destination for Cash Flow + Getting
// Started per CONTEXT D-05 (Q6=C). Moved here from /dashboard so /today
// is purely action-oriented (per Principle 7).
//
// 1.5c: surfaces the same Cash Flow KPIs + Getting Started checklist
// that currently render on /dashboard. Reads /api/dashboard's `cashFlow`
// payload (org-wide aggregator). F2/Wave 1.1-Lite wires real-time data
// surfaces; this page is correctly server-rendered today.
//
// Per CONTEXT D-19 / Decision A (D-057) — Plan 3 wraps each production
// route's outer container in `.design-system-scope` to activate Site
// Office C rules. This page renders inside AppShell which inherits root
// chrome.
//
// Token discipline: Site Office direction inherited from root chain
// (globals.css + colors_and_type.css + design-system.css imported at
// root layout per iter-3 D-23). Cash Flow + Getting Started components
// reuse the same dashboard contracts; only the route changes.

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/app-shell";
import GettingStartedChecklist from "@/components/getting-started-checklist";
import { SkeletonBlock } from "@/components/loading-skeleton";
import NwCard from "@/components/nw/Card";
import NwEyebrow from "@/components/nw/Eyebrow";
import NwButton from "@/components/nw/Button";
import NwMoney from "@/components/nw/Money";
import NwStatusDot, { type StatusDotVariant } from "@/components/nw/StatusDot";
import { supabase } from "@/lib/supabase/client";

type UserRole = "owner" | "admin" | "pm" | "accounting";

interface CashFlow {
  monthInvoiced: number;
  monthPaid: number;
  monthNet: number;
  outstandingTotal: number;
  aging: { current: number; d30: number; d60: number; d90: number };
  upcomingCommitted: number;
}

interface OverviewData {
  cashFlow: CashFlow;
}

export default function CompanyOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);

  async function load() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: membership } = await supabase
          .from("org_members")
          .select("role")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (membership?.role) setRole(membership.role as UserRole);
      }

      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Overview failed (${res.status})`);
      }
      const json = await res.json();
      setData({ cashFlow: json.cashFlow });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Couldn't load overview");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const isAdminLike = role === "admin" || role === "owner";

  return (
    <AppShell>
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-6 py-8">
        {/* Header band */}
        <div className="mb-6 animate-fade-up">
          <NwEyebrow tone="muted" className="mb-2">Company</NwEyebrow>
          <h1
            className="m-0 text-[28px]"
            style={{
              fontFamily: "var(--font-space-grotesk)",
              fontWeight: 500,  // NOT 600 per TD-26 fix
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
            }}
          >
            Overview
          </h1>
        </div>

        {errorMessage && !loading && (
          <section className="mb-6 animate-fade-up">
            <NwCard padding="md" style={{ borderColor: "var(--nw-danger)" }}>
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

        {/* Cash Flow card — extracted from dashboard. */}
        <section className="mb-6 animate-fade-up">
          <SectionHeader title="Cash Flow" subtitle="This month + outstanding" />
          {loading || !data ? (
            <SkeletonBlock height="h-96" />
          ) : (
            <CashFlowPanel cashFlow={data.cashFlow} />
          )}
        </section>

        {/* Getting Started checklist — only for admin-like roles per
            existing dashboard logic. The component owns its own
            dismissal state via localStorage. */}
        {isAdminLike && (
          <section className="animate-fade-up stagger-1">
            <GettingStartedChecklist />
          </section>
        )}
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

// ---------- Cash Flow Panel ----------
// Mirrors dashboard/page.tsx CashFlowPanel exactly. Plan 7 cleanup may
// extract to a shared component (src/components/dashboard/CashFlowPanel.tsx)
// once the dashboard route is retired; for 1.5c the duplication is
// acceptable given the route is short-lived.
function CashFlowPanel({ cashFlow }: { cashFlow: CashFlow }) {
  const total =
    cashFlow.aging.current + cashFlow.aging.d30 + cashFlow.aging.d60 + cashFlow.aging.d90;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  return (
    <NwCard padding="md" className="space-y-5">
      {/* This month */}
      <div>
        <NwEyebrow tone="muted" className="mb-2">This month</NwEyebrow>
        <div className="grid grid-cols-3 gap-3">
          {/* Per CONTEXT D-01 — links use new canonical Bills/Pay Apps
              paths. The paths land in Plan 4; until then they fall
              through Plan 1's redirects to the legacy routes. */}
          <NumStat label="Invoiced" cents={cashFlow.monthInvoiced} href="/financials/bills" />
          <NumStat label="Paid" cents={cashFlow.monthPaid} href="/financials/payments" />
          <NumStat label="Net" cents={cashFlow.monthNet} signColor />
        </div>
      </div>

      {/* Outstanding aging breakdown */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <NwEyebrow tone="muted">Outstanding</NwEyebrow>
          <NwMoney cents={cashFlow.outstandingTotal} size="md" variant="emphasized" />
        </div>
        {/* Stacked horizontal bar */}
        <div
          className="flex h-2.5 w-full overflow-hidden border"
          style={{ borderColor: "var(--border-default)", background: "var(--bg-subtle)" }}
        >
          {pct(cashFlow.aging.current) > 0 && (
            <div
              style={{ width: `${pct(cashFlow.aging.current)}%`, background: "var(--nw-success)" }}
              title={`Current`}
            />
          )}
          {pct(cashFlow.aging.d30) > 0 && (
            <div
              style={{ width: `${pct(cashFlow.aging.d30)}%`, background: "var(--nw-warn)" }}
              title={`30-59 days`}
            />
          )}
          {pct(cashFlow.aging.d60) > 0 && (
            <div
              style={{ width: `${pct(cashFlow.aging.d60)}%`, background: "var(--nw-warn)" }}
              title={`60-89 days`}
            />
          )}
          {pct(cashFlow.aging.d90) > 0 && (
            <div
              style={{ width: `${pct(cashFlow.aging.d90)}%`, background: "var(--nw-danger)" }}
              title={`90+ days`}
            />
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <AgeChip variant="active" label="Current" value={cashFlow.aging.current} />
          <AgeChip variant="pending" label="30-59d" value={cashFlow.aging.d30} />
          <AgeChip variant="pending" label="60-89d" value={cashFlow.aging.d60} />
          <AgeChip variant="danger" label="90+d" value={cashFlow.aging.d90} />
        </div>
      </div>

      {/* Upcoming */}
      <div className="pt-4 border-t" style={{ borderColor: "var(--border-default)" }}>
        <div className="flex items-baseline justify-between">
          <NwEyebrow tone="muted">Upcoming (open POs)</NwEyebrow>
          <Link href="/jobs" className="hover:opacity-75 transition-opacity">
            <NwMoney cents={cashFlow.upcomingCommitted} size="md" />
          </Link>
        </div>
      </div>
    </NwCard>
  );
}

function NumStat({
  label,
  cents,
  href,
  signColor,
}: {
  label: string;
  cents: number;
  href?: string;
  signColor?: boolean;
}) {
  const inner = (
    <div className="flex flex-col gap-1">
      <NwEyebrow tone="muted">{label}</NwEyebrow>
      <NwMoney cents={cents} size="md" signColor={signColor} />
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block hover:opacity-75 transition-opacity">
        {inner}
      </Link>
    );
  }
  return inner;
}

function AgeChip({ variant, label, value }: { variant: StatusDotVariant; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <NwStatusDot variant={variant} size="sm" />
      <div>
        <NwEyebrow tone="muted">{label}</NwEyebrow>
        <NwMoney cents={value} size="sm" />
      </div>
    </div>
  );
}
