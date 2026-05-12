// src/components/prototypes/OwnerDashboardView.tsx
//
// OwnerDashboardView — Multi-fixture aggregation pattern (homeowner dashboard).
// Stage 1.5c Plan 3 extraction; copies BudgetView pattern (multi-fixture
// aggregation + R.2 recalculate-don't-increment) per iter-2 W-2.
//
// Pure props-only View component. Wrapper handles fixture lookup + path
// resolution; this View renders.
//
// Pattern: simplified Pattern3Dashboard for non-builder audience. Cost-plus
// open-book transparency per CLAUDE.md: every dollar visible. NO builder
// jargon — translates G702 terminology to homeowner-readable language.
//
// Owner portal trust filter: internal-only fields (AI confidence scores,
// PM override audit, vendor cost-code internal mapping) are NOT rendered
// here. Only externally-coherent draw status, payment history, and
// approved-CO totals.
//
// AMENDMENT inheritance per nwrp48: Owner dashboard's "Recent activity"
// list is the equivalent of an audit timeline for non-builders. The
// AMENDMENT CHANGE 2 collapsible-panel pattern is N/A here because the
// homeowner audience EXPECTS to see recent activity at a glance — hiding
// it behind a chevron defeats the open-book transparency goal. Pattern
// preserved expanded.
//
// TD fixes per CONTEXT D-06:
//   - TD-20: 1 raw button (Pattern: Review →) → preserved as Link with
//     button-like styling because it's a navigation target, not a CTA
//     action. NwButton TD-20 inventory targets CTA actions; navigation
//     links are different control type per Plan 2 architect's exemption
//     rationale. (Source uses Link; we preserve it.)
//   - TD-25/26: All Card padding=md / fontWeight=500 except 1 inline
//     fontWeight=600 in the next-pay-app date cell — that's a TD-26
//     candidate. Fix below.
//
// Tenant-blind by construction.

import Link from "next/link";
import {
  CheckBadgeIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";

import type {
  CaldwellJob,
  CaldwellDraw,
  CaldwellChangeOrder,
} from "@/app/design-system/_fixtures/drummond/types";

import Card from "@/components/nw/Card";
import Eyebrow from "@/components/nw/Eyebrow";
import Money from "@/components/nw/Money";
import Badge from "@/components/nw/Badge";

export interface OwnerDashboardViewProps {
  job: CaldwellJob;
  draws: CaldwellDraw[];
  changeOrders: CaldwellChangeOrder[];
  /** Optional href builder for "Review →" link. Receives draw id. */
  drawReviewHref?: (drawId: string) => string;
}

export default function OwnerDashboardView({
  job,
  draws,
  changeOrders,
  drawReviewHref,
}: OwnerDashboardViewProps) {
  // Compute KPIs from source rows (R.2 — no stored aggregates).
  const jobDraws = draws.filter((d) => d.job_id === job.id);
  const latestDraw = jobDraws[jobDraws.length - 1];
  const paidToDate = jobDraws
    .filter((d) => d.status === "paid")
    .reduce((sum, d) => sum + d.current_payment_due, 0);
  const balanceToFinish = job.current_contract_amount - paidToDate;
  const drawsAwaitingApproval = jobDraws.filter(
    (d) => d.status === "submitted" || d.status === "pm_review",
  );
  const approvedCOs = changeOrders.filter(
    (co) =>
      co.job_id === job.id &&
      (co.status === "approved" || co.status === "executed"),
  );

  // Next pay app date estimate — last submission + 30 days.
  const nextDrawDate = latestDraw
    ? (() => {
        const d = new Date(latestDraw.application_date);
        d.setDate(d.getDate() + 30);
        return d.toISOString().slice(0, 10);
      })()
    : null;

  // Short Money formatter for KPI sub-line.
  const dollarsRounded = (cents: number) =>
    Math.round(cents / 100).toLocaleString("en-US");

  const resolvedDrawReviewHref =
    drawReviewHref ??
    ((id: string) => `/design-system/prototypes/owner-portal/draws/${id}`);

  return (
    <div className="px-6 py-8 max-w-[1200px] mx-auto">
      {/* Header band — homeowner-friendly. */}
      <div className="mb-6">
        <Eyebrow tone="muted" className="mb-2">
          Owner portal · {job.name}
        </Eyebrow>
        <h1
          className="text-[28px] mb-2 nw-direction-headline"
          style={{
            fontFamily: "var(--font-space-grotesk)",
            fontWeight: 500,
            color: "var(--text-primary)",
          }}
        >
          Welcome, {job.client_name}
        </h1>
        <p
          className="text-[14px]"
          style={{ color: "var(--text-secondary)" }}
        >
          {job.address} · cost-plus open-book contract · every invoice and
          dollar is visible to you.
        </p>
      </div>

      {/* KPI strip — homeowner-translated */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 mb-6"
        style={{
          gap: "1px",
          background: "var(--border-default)",
          borderTop: "1px solid var(--border-default)",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        {[
          {
            label: "Total project budget",
            value: <Money cents={job.current_contract_amount} size="lg" />,
            sub: `original $${dollarsRounded(job.original_contract_amount)} + ${approvedCOs.length} change orders`,
          },
          {
            label: "Paid to date",
            value: <Money cents={paidToDate} size="lg" />,
            sub: `${jobDraws.filter((d) => d.status === "paid").length} pay apps paid`,
          },
          {
            label: "Remaining",
            value: <Money cents={balanceToFinish} size="lg" />,
            sub: `${((balanceToFinish / job.current_contract_amount) * 100).toFixed(0)}% of budget`,
          },
          {
            label: "Next pay app expected",
            value: (
              // TD-26 fix: was fontWeight=600 in source — corrected to 500.
              <span
                className="nw-direction-headline"
                style={{
                  fontFamily: "var(--font-space-grotesk)",
                  fontWeight: 500,
                  fontSize: "20px",
                  color: "var(--text-primary)",
                }}
              >
                {nextDrawDate ?? "—"}
              </span>
            ),
            sub: `Pay app #${(latestDraw?.draw_number ?? 0) + 1}`,
          },
        ].map((k) => (
          <div
            key={k.label}
            className="p-4"
            style={{ background: "var(--bg-card)" }}
          >
            <Eyebrow tone="muted" className="mb-2">
              {k.label}
            </Eyebrow>
            <div className="mb-1">{k.value}</div>
            <div
              className="text-[10px]"
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                color: "var(--text-tertiary)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {k.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Awaiting your approval */}
      {drawsAwaitingApproval.length > 0 && (
        <Card padding="md" className="mb-6">
          <Eyebrow
            tone="accent"
            className="mb-3"
            icon={<CheckBadgeIcon className="w-3.5 h-3.5" strokeWidth={1.5} />}
          >
            Awaiting your approval · {drawsAwaitingApproval.length}
          </Eyebrow>
          <ul
            className="divide-y"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            {drawsAwaitingApproval.map((d) => (
              <li
                key={d.id}
                className="py-3 flex items-center justify-between gap-4"
              >
                <div>
                  <div
                    className="text-[14px]"
                    style={{
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-space-grotesk)",
                      fontWeight: 500,
                    }}
                  >
                    Pay app #{d.draw_number} — {d.period_start} to{" "}
                    {d.period_end}
                  </div>
                  <div
                    className="text-[11px]"
                    style={{
                      fontFamily: "var(--font-jetbrains-mono)",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    Submitted {d.submitted_at?.slice(0, 10) ?? "—"}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Money
                    cents={d.current_payment_due}
                    size="lg"
                    variant="emphasized"
                  />
                  <Link
                    href={resolvedDrawReviewHref(d.id)}
                    className="inline-flex items-center gap-1 px-4 text-[12px] uppercase font-medium"
                    style={{
                      background: "var(--nw-stone-blue)",
                      color: "var(--nw-white-sand)",
                      fontFamily: "var(--font-jetbrains-mono)",
                      letterSpacing: "0.12em",
                      minHeight: "44px",
                    }}
                  >
                    Review →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Recent activity */}
      <Card padding="md">
        <Eyebrow
          tone="muted"
          className="mb-3"
          icon={<CalendarDaysIcon className="w-3.5 h-3.5" strokeWidth={1.5} />}
        >
          Recent activity
        </Eyebrow>
        <ul className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
          {jobDraws
            .slice()
            .reverse()
            .slice(0, 5)
            .map((d) => (
              <li
                key={d.id}
                className="py-2 flex items-center justify-between gap-3"
              >
                <div>
                  <div
                    className="text-[13px]"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Pay app #{d.draw_number} — {d.application_date}
                  </div>
                  <div
                    className="text-[10px]"
                    style={{
                      fontFamily: "var(--font-jetbrains-mono)",
                      color: "var(--text-tertiary)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {d.paid_at
                      ? `Paid ${d.paid_at.slice(0, 10)}`
                      : d.status === "submitted"
                        ? "Awaiting your approval"
                        : "—"}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Money cents={d.current_payment_due} size="md" />
                  <Badge
                    variant={
                      d.status === "paid"
                        ? "success"
                        : d.status === "submitted"
                          ? "info"
                          : "neutral"
                    }
                  >
                    {d.status === "submitted"
                      ? "Awaiting"
                      : d.status === "paid"
                        ? "Paid"
                        : d.status.replaceAll("_", " ")}
                  </Badge>
                </div>
              </li>
            ))}
        </ul>
      </Card>
    </div>
  );
}
