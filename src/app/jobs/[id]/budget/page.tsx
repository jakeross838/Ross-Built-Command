// src/app/jobs/[id]/budget/page.tsx
//
// W-1 (per nwrp282 / TD-NW-PER-JOB-TAB-WIRING): WIRED to real data — the
// F1 swap documented in the 2026-06-02 reframe header lands here. Server
// component (E-3/F10 pattern): getCurrentMembership() + org-scoped
// queries mount the existing BudgetView with budget_lines / invoices /
// cost_codes / latest draw / approved COs for this job. Shim mapping in
// ../_shims.ts. Zero budget lines renders the honest empty state
// (Drummond branch) instead of the View.
//
// Per CONTEXT D-19: outer wrap in .design-system-scope. Chrome from
// jobs/layout.tsx AppShell + jobs/[id]/layout.tsx PerJobTabs (single
// chrome — the nwrp268-270 ownership rule).

import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org/session";
import BudgetView from "@/components/prototypes/BudgetView";
import {
  emptyDrawShim,
  mapBudgetLine,
  mapChangeOrder,
  mapCostCode,
  mapDraw,
  mapInvoice,
  mapJob,
} from "../_shims";

export default async function JobBudgetPage({
  params,
}: {
  params: { id: string };
}) {
  const membership = await getCurrentMembership();
  if (!membership) return notFound();
  const supabase = createServerClient();

  const { data: job } = await supabase
    .from("jobs")
    .select(
      "id, name, address, contract_type, status, deposit_percentage, gc_fee_percentage, original_contract_amount, current_contract_amount, pm_id, client:clients(id, full_name)"
    )
    .eq("id", params.id)
    .eq("org_id", membership.org_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!job) return notFound();

  const [linesRes, invoicesRes, drawRes, cosRes, consumptionRes] = await Promise.all([
    supabase
      .from("budget_lines")
      .select(
        "id, job_id, cost_code_id, original_estimate, revised_estimate, cost_codes:cost_code_id (id, code, description, category, sort_order)"
      )
      .eq("job_id", params.id)
      .eq("org_id", membership.org_id)
      .is("deleted_at", null),
    supabase
      .from("invoices")
      .select(
        "id, vendor_id, job_id, cost_code_id, po_id, co_id, invoice_number, invoice_date, description, invoice_type, total_amount, confidence_score, status, received_date, payment_date, draw_id, line_items, original_file_url"
      )
      .eq("job_id", params.id)
      .eq("org_id", membership.org_id)
      .is("deleted_at", null),
    supabase
      .from("draws")
      .select("*")
      .eq("job_id", params.id)
      .eq("org_id", membership.org_id)
      .neq("status", "void")
      .is("deleted_at", null)
      .order("draw_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("change_orders")
      .select(
        "id, job_id, pcco_number, title, description, amount, gc_fee_amount, gc_fee_rate, total_with_fee, estimated_days_added, status, approved_date, draw_number"
      )
      .eq("job_id", params.id)
      .eq("org_id", membership.org_id)
      // canonical CO status set per migration 00060 (legacy executed value removed)
      .eq("status", "approved")
      .is("deleted_at", null)
      .order("pcco_number"),
    // B2/Q8a (migration 00123): per-invoice budget consumption from the
    // canonical invoice_budget_consumption view (3-tier attribution,
    // counting statuses only). budget_lines.invoiced is DEAD — per-line
    // consumed numbers in BudgetView key off these rows by cost code.
    supabase
      .from("invoice_budget_consumption")
      .select("cost_code_id, invoice_id, amount_cents")
      .eq("job_id", params.id)
      .eq("org_id", membership.org_id),
  ]);

  const lineRows = linesRes.data ?? [];
  if (lineRows.length === 0) {
    return (
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <main className="max-w-[900px] mx-auto px-6 py-8">
          <span
            className="block mb-2 text-[10px] uppercase"
            style={{
              fontFamily: "var(--font-jetbrains-mono)",
              letterSpacing: "0.14em",
              color: "var(--text-tertiary)",
            }}
          >
            Job · Budget
          </span>
          <div className="border border-[var(--border-default)] bg-[var(--bg-card)] px-6 py-10 text-center text-sm text-[color:var(--text-secondary)]">
            No budget lines on this job yet. Import a budget from the job
            overview page (Import Budget) or via a pay-app workbook — the
            G703-style table renders here once lines exist.
          </div>
        </main>
      </div>
    );
  }

  const clientEmbed = Array.isArray(job.client) ? job.client[0] ?? null : job.client;
  const consumption = (
    (consumptionRes.data ?? []) as Array<{
      cost_code_id: string | null;
      invoice_id: string | null;
      amount_cents: number | null;
    }>
  )
    .filter((r) => r.cost_code_id && r.invoice_id)
    .map((r) => ({
      cost_code_id: r.cost_code_id as string,
      invoice_id: r.invoice_id as string,
      amount_cents: r.amount_cents ?? 0,
    }));
  const costCodes = lineRows
    .map((l) => (Array.isArray(l.cost_codes) ? l.cost_codes[0] : l.cost_codes))
    .filter(Boolean)
    .map((cc) => mapCostCode(cc as Record<string, unknown>));

  return (
    <div data-direction="C" data-palette="B" className="design-system-scope">
      <BudgetView
        job={mapJob(job, (clientEmbed as { full_name: string | null } | null)?.full_name ?? null)}
        budgetLines={lineRows.map((l) => mapBudgetLine(l))}
        invoices={(invoicesRes.data ?? []).map((i) => mapInvoice(i))}
        consumption={consumption}
        costCodes={costCodes}
        currentDraw={drawRes.data ? mapDraw(drawRes.data) : emptyDrawShim(params.id)}
        drawLineItems={[]}
        changeOrders={(cosRes.data ?? []).map((c) => mapChangeOrder(c))}
        breadcrumbRoot={{ href: `/jobs/${params.id}`, label: job.name as string }}
      />
    </div>
  );
}
