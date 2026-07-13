"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useJobFilter } from "@/components/job-filter/JobFilterProvider";
import EmptyState, { EmptyIcons } from "@/components/empty-state";
import { SkeletonList } from "@/components/loading-skeleton";
import { formatDate, formatStatus } from "@/lib/utils/format";
import NwBadge, { type BadgeVariant } from "@/components/nw/Badge";
import NwMoney from "@/components/nw/Money";

function drawBadgeVariant(status: string): BadgeVariant {
  if (status === "submitted" || status === "pm_review") return "warning";
  if (status === "paid" || status === "approved") return "success";
  if (status === "void") return "danger";
  if (status === "draft") return "neutral";
  return "neutral";
}

interface Draw {
  id: string;
  draw_number: number;
  revision_number: number;
  application_date: string | null;
  period_start: string | null;
  period_end: string | null;
  status: string;
  current_payment_due: number;
  jobs: { id: string; name: string; address: string | null } | null;
}

// Flat-IA rework (2026-07): DrawsPage is now a single CROSS-JOB list (Model A) —
// one flat table across every job with Job as a filterable column, matching the
// Invoices list. The prior grouped-by-job rendering + the Financials sub-nav are
// gone; rows open the reachable pay-app detail (/financials/pay-apps/[id]).
export default function DrawsPage() {
  const [draws, setDraws] = useState<Draw[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedJobId } = useJobFilter();
  // Voided draws stay in the record (soft-delete only) but are noise in the
  // active list, so they're hidden by default and revealed via this filter.
  const [statusFilter, setStatusFilter] = useState<"active" | "voided" | "all">("active");

  useEffect(() => {
    async function fetchDraws() {
      const res = await fetch("/api/draws");
      if (res.ok) {
        const data = await res.json();
        setDraws(data);
      }
      setLoading(false);
    }
    fetchDraws();
  }, []);

  // Job filter comes from the cross-surface left rail (PART 2).
  const jobFiltered = selectedJobId ? draws.filter((d) => d.jobs?.id === selectedJobId) : draws;
  const voidedCount = jobFiltered.filter((d) => d.status === "void").length;
  const filtered = jobFiltered.filter((d) =>
    statusFilter === "all"
      ? true
      : statusFilter === "voided"
        ? d.status === "void"
        : d.status !== "void"
  );

  const STATUS_TABS: { key: typeof statusFilter; label: string; count?: number }[] = [
    { key: "active", label: "Active" },
    { key: "voided", label: "Voided", count: voidedCount },
    { key: "all", label: "All" },
  ];

  const th = "py-3 px-5 text-[10px] uppercase font-mono font-medium tracking-[0.14em] text-[color:var(--text-secondary)]";

  return (
    <main className="max-w-[1600px] mx-auto px-6 py-8">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <span
            className="block mb-2 text-[10px] uppercase"
            style={{
              fontFamily: "var(--font-jetbrains-mono)",
              letterSpacing: "0.14em",
              color: "var(--text-tertiary)",
            }}
          >
            Financials · Draws
          </span>
          <h2
            className="m-0"
            style={{
              fontFamily: "var(--font-space-grotesk)",
              fontWeight: 500,
              fontSize: "30px",
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
            }}
          >
            Draws
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            AIA G702/G703 pay applications across all jobs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/financials/pay-apps/new"
            className="inline-flex items-center justify-center h-9 px-4 text-[11px] uppercase font-medium border transition-all shadow-[var(--shadow-raise-accent)] hover:-translate-y-px active:translate-y-px active:shadow-[var(--shadow-raise-accent-active)]"
            style={{
              fontFamily: "var(--font-jetbrains-mono)",
              letterSpacing: "0.12em",
              background: "var(--nw-stone-blue)",
              borderColor: "var(--nw-stone-blue)",
              color: "var(--nw-white-sand)",
            }}
          >
            + New Draw
          </Link>
        </div>
      </div>

      {!loading && (draws.length > 0) && (
        <div className="flex items-center gap-2 mb-4">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setStatusFilter(t.key)}
              className="px-3 py-1.5 text-[10px] uppercase font-medium border transition-colors"
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                letterSpacing: "0.12em",
                borderColor: statusFilter === t.key ? "var(--nw-stone-blue)" : "var(--border-default)",
                background: statusFilter === t.key ? "var(--nw-stone-blue)" : "var(--bg-card)",
                color: statusFilter === t.key ? "var(--nw-white-sand)" : "var(--text-secondary)",
              }}
            >
              {t.label}
              {typeof t.count === "number" && t.count > 0 ? ` (${t.count})` : ""}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <SkeletonList rows={5} columns={["w-32", "w-16", "w-32", "w-24", "w-32"]} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<EmptyIcons.Document />}
          title={
            statusFilter === "voided"
              ? "No voided draws"
              : jobFiltered.length > 0
                ? "No draws match this filter"
                : !selectedJobId
                  ? "No draws yet"
                  : "No draws for this job"
          }
          message="Create a draw to generate an AIA G702/G703 pay application from approved invoices."
          primaryAction={{ label: "New Draw", href: "/financials/pay-apps/new" }}
        />
      ) : (
        <div className="overflow-x-auto bg-[var(--bg-card)] border border-[var(--border-default)] animate-fade-up">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-subtle)] text-left">
                <th className={th}>Job</th>
                <th className={th}>Draw #</th>
                <th className={th}>Period</th>
                <th className={th}>Application Date</th>
                <th className={th}>Status</th>
                <th className={`${th} text-right`}>Current Payment Due</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id}
                  className="border-t border-[var(--border-default)] hover:bg-[var(--bg-muted)]/50 cursor-pointer transition-colors"
                  onClick={() => (window.location.href = `/financials/pay-apps/${d.id}`)}>
                  <td className="py-4 px-5">
                    {d.jobs ? (
                      <Link href={`/jobs/${d.jobs.id}`} onClick={(e) => e.stopPropagation()} className="hover:opacity-80 transition-opacity">
                        <NwBadge variant="info" size="sm">{d.jobs.name}</NwBadge>
                      </Link>
                    ) : (
                      <NwBadge variant="info" size="sm">—</NwBadge>
                    )}
                  </td>
                  <td className="py-4 px-5 text-[color:var(--text-primary)] font-mono font-medium tabular-nums">
                    #{d.draw_number}
                    {d.revision_number > 0 && <span className="text-[color:var(--nw-warn)] ml-1 text-xs">Rev {d.revision_number}</span>}
                  </td>
                  <td className="py-4 px-5 text-[color:var(--text-muted)]">{formatDate(d.period_start)} — {formatDate(d.period_end)}</td>
                  <td className="py-4 px-5 text-[color:var(--text-muted)]">{formatDate(d.application_date)}</td>
                  <td className="py-4 px-5">
                    <NwBadge variant={drawBadgeVariant(d.status)} size="sm">{formatStatus(d.status)}</NwBadge>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <NwMoney cents={d.current_payment_due} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
