// src/app/jobs/[id]/bills/page.tsx
//
// W-2 (per nwrp282 / TD-NW-PER-JOB-TAB-WIRING): WIRED — job-filtered bill
// list on the org-wide /financials/bills pattern (walk P7), rows linking
// to the canonical bill review at /financials/bills/[id]. Server
// component; org+job-scoped; JobFinancialBar gives job context with NO
// duplicate stat grid (W-6 rule applied from birth). Empty state for
// jobs with no bills.

import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org/session";
import JobFinancialBar from "@/components/job-financial-bar";
import NwBadge, { type BadgeVariant } from "@/components/nw/Badge";
import { formatCents, formatDate } from "@/lib/utils/format";

const STATUS_BADGE: Record<string, { variant: BadgeVariant; label: string }> = {
  received: { variant: "neutral", label: "Received" },
  ai_processed: { variant: "neutral", label: "Processed" },
  pm_review: { variant: "warning", label: "PM Review" },
  pm_approved: { variant: "info", label: "PM Approved" },
  pm_held: { variant: "warning", label: "Held" },
  pm_denied: { variant: "danger", label: "Denied" },
  info_requested: { variant: "warning", label: "Info Requested" },
  qa_review: { variant: "warning", label: "QA Review" },
  qa_approved: { variant: "success", label: "QA Approved" },
  qa_kicked_back: { variant: "danger", label: "Kicked Back" },
  pushed_to_qb: { variant: "info", label: "Pushed to QB" },
  qb_failed: { variant: "danger", label: "QB Failed" },
  in_draw: { variant: "info", label: "In Draw" },
  paid: { variant: "success", label: "Paid" },
  void: { variant: "danger", label: "Void" },
};

export default async function JobBillsPage({
  params,
}: {
  params: { id: string };
}) {
  const membership = await getCurrentMembership();
  if (!membership) return notFound();
  const supabase = createServerClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("id, name")
    .eq("id", params.id)
    .eq("org_id", membership.org_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!job) return notFound();

  const { data: bills } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, invoice_date, vendor_name_raw, total_amount, status, received_date, vendors:vendor_id (name)"
    )
    .eq("job_id", params.id)
    .eq("org_id", membership.org_id)
    .is("deleted_at", null)
    .order("received_date", { ascending: false });

  const rows = bills ?? [];

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
          Job · Bills
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
            No bills on this job yet. Bills land here from upload or email
            intake once vendors start invoicing this job.
          </div>
        ) : (
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)] text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-secondary)] font-medium">
                  <th className="text-left px-4 py-3 font-medium">Vendor</th>
                  <th className="text-left px-4 py-3 font-medium">Bill #</th>
                  <th className="text-left px-4 py-3 font-medium">Received</th>
                  <th className="text-right px-4 py-3 font-medium">Amount</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => {
                  const vendor = Array.isArray(b.vendors) ? b.vendors[0] : b.vendors;
                  const badge =
                    STATUS_BADGE[b.status as string] ?? {
                      variant: "neutral" as BadgeVariant,
                      label: b.status as string,
                    };
                  return (
                    <tr
                      key={b.id as string}
                      className="border-b border-[var(--border-default)] last:border-0 hover:bg-[rgba(91,134,153,0.06)]"
                    >
                      <td className="px-4 py-3 text-[color:var(--text-primary)]">
                        <Link
                          href={`/invoices/${b.id}`}
                          className="text-[color:var(--nw-stone-blue)] hover:underline"
                        >
                          {(vendor as { name?: string } | null)?.name ??
                            (b.vendor_name_raw as string | null) ??
                            "Unknown Vendor"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-[color:var(--text-secondary)]">
                        {(b.invoice_number as string | null) ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-[color:var(--text-secondary)]">
                        {formatDate(b.received_date as string | null)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[color:var(--text-primary)]">
                        {formatCents(Number(b.total_amount ?? 0))}
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
