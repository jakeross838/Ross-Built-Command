// src/app/jobs/[id]/pay-apps/page.tsx
//
// W-3 (per nwrp282 / TD-NW-PER-JOB-TAB-WIRING): WIRED — job-filtered pay
// app list, rows linking to the F10 detail at /financials/pay-apps/[id].
// Display application number honors jobs.starting_application_number
// (Fish renders #21 — the item-8 boundary question may move this to 22;
// the offset math lives in one place here either way). Amounts are the
// STORED G702 current-due (recompute-on-read stays with the detail —
// PART-2C D3). Server component; org+job-scoped; JobFinancialBar context
// with no duplicate stat grid (W-6 rule).

import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org/session";
import JobFinancialBar from "@/components/job-financial-bar";
import NwBadge, { type BadgeVariant } from "@/components/nw/Badge";
import { formatCents, formatDate } from "@/lib/utils/format";

const DRAW_BADGE: Record<string, { variant: BadgeVariant; label: string }> = {
  draft: { variant: "neutral", label: "Draft" },
  pm_review: { variant: "warning", label: "PM Review" },
  submitted: { variant: "info", label: "Submitted" },
  approved: { variant: "success", label: "Approved" },
  locked: { variant: "info", label: "Locked" },
  paid: { variant: "success", label: "Paid" },
  void: { variant: "danger", label: "Void" },
};

export default async function JobPayAppsPage({
  params,
}: {
  params: { id: string };
}) {
  const membership = await getCurrentMembership();
  if (!membership) return notFound();
  const supabase = createServerClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("id, name, starting_application_number")
    .eq("id", params.id)
    .eq("org_id", membership.org_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!job) return notFound();

  const { data: draws } = await supabase
    .from("draws")
    .select(
      "id, draw_number, revision_number, status, period_start, period_end, application_date, current_payment_due"
    )
    .eq("job_id", params.id)
    .eq("org_id", membership.org_id)
    .is("deleted_at", null)
    .order("draw_number", { ascending: false })
    .order("revision_number", { ascending: false });

  const rows = draws ?? [];
  const startingApp = Number(job.starting_application_number ?? 1);

  return (
    <div data-direction="C" data-palette="B" className="design-system-scope">
      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-8">
        <span
          className="block mb-2 text-[10px] uppercase"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            letterSpacing: "0.14em",
            color: "var(--text-tertiary)",
          }}
        >
          Job · Pay Apps
        </span>
        <h2
          className="m-0 mb-4"
          style={{
            fontFamily: "var(--font-space-grotesk)",
            fontWeight: 500,
            fontSize: "30px",
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
          }}
        >
          {job.name as string}
        </h2>
        <JobFinancialBar jobId={params.id} />

        {rows.length === 0 ? (
          <div className="border border-[var(--border-default)] bg-[var(--bg-card)] px-6 py-10 text-center text-sm text-[color:var(--text-secondary)]">
            No pay applications on this job yet. Create one from
            Financials → Pay Apps → Create New Draw.
          </div>
        ) : (
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)] text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-secondary)] font-medium">
                  <th className="text-left px-4 py-3 font-medium">Pay App</th>
                  <th className="text-left px-4 py-3 font-medium">Period</th>
                  <th className="text-left px-4 py-3 font-medium">Application Date</th>
                  <th className="text-right px-4 py-3 font-medium">Current Due (at creation)</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => {
                  const appNo = startingApp + Number(d.draw_number ?? 1) - 1;
                  const badge =
                    DRAW_BADGE[d.status as string] ?? {
                      variant: "neutral" as BadgeVariant,
                      label: d.status as string,
                    };
                  return (
                    <tr
                      key={d.id as string}
                      className="border-b border-[var(--border-default)] last:border-0 hover:bg-[rgba(91,134,153,0.06)]"
                    >
                      <td className="px-4 py-3 font-mono">
                        <Link
                          href={`/financials/pay-apps/${d.id}`}
                          className="text-[color:var(--nw-stone-blue)] hover:underline"
                        >
                          #{appNo}
                          {Number(d.revision_number ?? 0) > 0
                            ? ` Rev ${d.revision_number}`
                            : ""}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[color:var(--text-secondary)]">
                        {formatDate(d.period_start as string | null)} –{" "}
                        {formatDate(d.period_end as string | null)}
                      </td>
                      <td className="px-4 py-3 text-[color:var(--text-secondary)]">
                        {formatDate(d.application_date as string | null)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[color:var(--text-primary)]">
                        {formatCents(Number(d.current_payment_due ?? 0))}
                      </td>
                      <td className="px-4 py-3">
                        <NwBadge variant={badge.variant} size="sm">
                          {badge.label}
                        </NwBadge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
