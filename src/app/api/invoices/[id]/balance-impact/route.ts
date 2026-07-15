import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { ApiError, withApiError } from "@/lib/api/errors";
import { getCurrentMembership } from "@/lib/org/session";
import {
  computeBaselineCents,
  type CodeBaseline,
  type InvoiceContribution,
} from "@/lib/invoices/balance-impact";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * Read-only baselines for the balance-impact strip (Stage-2 review redesign).
 *
 * For every cost code on this job that has a budget line or an open PO, returns
 * the scope (PO takes precedence over budget), the scope total, and the
 * invoiced-against-scope baseline computed FROM SOURCE EXCLUDING this invoice
 * (the trap-proof contract — see src/lib/invoices/balance-impact.ts header).
 * The client computes now = scopeTotal - baseline and after = now - liveGridSum,
 * live as the PM edits allocations. NO approval math is touched here.
 */
export const GET = withApiError(async (
  _req: NextRequest,
  context: { params: { id: string } }
) => {
  const membership = await getCurrentMembership();
  if (!membership) throw new ApiError("Not authenticated", 401);
  const supabase = createServerClient();
  const reviewedId = context.params.id;

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, org_id, job_id")
    .eq("id", reviewedId)
    .single();
  if (!invoice || invoice.org_id !== membership.org_id) {
    throw new ApiError("Invoice not found", 404);
  }
  const jobId = invoice.job_id as string | null;
  if (!jobId) {
    // No job → nothing to predict against. Empty (not an error).
    return NextResponse.json({ baselines: {} });
  }

  // PO scope (precedence): open POs on this job, keyed by cost code.
  // Open = issued | partially_invoiced | fully_invoiced (recalc.ts PO_OPEN_STATUSES).
  const [{ data: budgetLines }, { data: pos }] = await Promise.all([
    supabase
      .from("budget_lines")
      .select("id, cost_code_id, revised_estimate")
      .eq("job_id", jobId)
      .eq("org_id", membership.org_id)
      .is("deleted_at", null),
    supabase
      .from("purchase_orders")
      .select("id, cost_code_id, po_number, amount, status")
      .eq("job_id", jobId)
      .eq("org_id", membership.org_id)
      .is("deleted_at", null)
      .in("status", ["issued", "partially_invoiced", "fully_invoiced"]),
  ]);

  // All invoice_line_items on this job (via the invoice_line_items → invoices
  // FK `invoice_line_items_invoice_id_fkey`), with each line's invoice status so
  // computeBaselineCents can apply the counting-status filter + exclude the
  // reviewed invoice. RLS + the org-scoped job filter keep this tenant-safe.
  const { data: lineItems } = await supabase
    .from("invoice_line_items")
    .select("amount_cents, budget_line_id, po_id, invoices!inner(id, status, deleted_at, job_id)")
    .eq("invoices.job_id", jobId)
    .is("deleted_at", null);

  type LineRow = {
    amount_cents: number | null;
    budget_line_id: string | null;
    po_id: string | null;
    invoices: { id: string; status: string; deleted_at: string | null } | null;
  };
  const rows = ((lineItems ?? []) as unknown as LineRow[]).filter(
    (r) => r.invoices && !r.invoices.deleted_at
  );

  const contribsByPo = new Map<string, InvoiceContribution[]>();
  const contribsByBudgetLine = new Map<string, InvoiceContribution[]>();
  for (const r of rows) {
    const contrib: InvoiceContribution = {
      invoiceId: r.invoices!.id,
      status: r.invoices!.status,
      amountCents: r.amount_cents ?? 0,
    };
    if (r.po_id) {
      const arr = contribsByPo.get(r.po_id) ?? [];
      arr.push(contrib);
      contribsByPo.set(r.po_id, arr);
    }
    if (r.budget_line_id) {
      const arr = contribsByBudgetLine.get(r.budget_line_id) ?? [];
      arr.push(contrib);
      contribsByBudgetLine.set(r.budget_line_id, arr);
    }
  }

  const baselines: Record<string, CodeBaseline> = {};

  // Budget scope first...
  for (const bl of budgetLines ?? []) {
    const ccId = (bl as { cost_code_id: string | null }).cost_code_id;
    if (!ccId) continue;
    baselines[ccId] = {
      scope: "budget",
      scopeTotalCents: (bl as { revised_estimate: number | null }).revised_estimate ?? 0,
      baselineCents: computeBaselineCents(contribsByBudgetLine.get((bl as { id: string }).id) ?? [], reviewedId),
    };
  }
  // ...then PO scope overrides any code that has an open PO (mockup precedence).
  for (const po of pos ?? []) {
    const ccId = (po as { cost_code_id: string | null }).cost_code_id;
    if (!ccId) continue;
    baselines[ccId] = {
      scope: "po",
      poNumber: (po as { po_number: string | null }).po_number,
      scopeTotalCents: (po as { amount: number | null }).amount ?? 0,
      baselineCents: computeBaselineCents(contribsByPo.get((po as { id: string }).id) ?? [], reviewedId),
    };
  }

  return NextResponse.json({ baselines });
});
