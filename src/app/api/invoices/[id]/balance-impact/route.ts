import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { ApiError, withApiError } from "@/lib/api/errors";
import { getCurrentMembership, getMembershipFromRequest } from "@/lib/org/session";
import {
  computeBaselineCents,
  scopeKey,
  type CodeBaseline,
  type InvoiceContribution,
} from "@/lib/invoices/balance-impact";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * Read-only baselines for the balance-impact strip (Stage-2 review redesign;
 * 00122 multi-job aware).
 *
 * For every (job, cost code) the invoice touches — the header job plus every
 * job named by its allocations — returns the scope (PO takes precedence over
 * budget), the scope total, and the invoiced-against-scope baseline computed
 * FROM SOURCE EXCLUDING this invoice (the trap-proof contract — see
 * src/lib/invoices/balance-impact.ts header). Keys are `${jobId}::${costCodeId}`
 * (scopeKey); `jobNames` maps job ids to display names so the strip can group
 * rows by job. The client computes now = scopeTotal - baseline and
 * after = now - liveGridSum, live as the PM edits. NO approval math here.
 */
export const GET = withApiError(async (
  req: NextRequest,
  context: { params: { id: string } }
) => {
  // Fast path: org from middleware-set headers (skips a redundant
  // auth.getUser() + org_members round-trip pair; measured ~2.3s warm).
  const membership = getMembershipFromRequest(req) ?? (await getCurrentMembership());
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
  const headerJobId = invoice.job_id as string | null;

  // Jobs in scope: header + every allocation job (00122).
  const { data: allocJobRows } = await supabase
    .from("invoice_allocations")
    .select("job_id")
    .eq("invoice_id", reviewedId)
    .is("deleted_at", null);
  const jobIds = Array.from(
    new Set(
      [headerJobId, ...(allocJobRows ?? []).map((r) => (r as { job_id: string | null }).job_id)]
        .filter((j): j is string => !!j)
    )
  );
  if (jobIds.length === 0) {
    // No job anywhere → nothing to predict against. Empty (not an error).
    return NextResponse.json({ baselines: {}, jobNames: {} });
  }

  const [{ data: budgetLines }, { data: pos }, { data: jobRows }] = await Promise.all([
    supabase
      .from("budget_lines")
      .select("id, job_id, cost_code_id, revised_estimate")
      .in("job_id", jobIds)
      .eq("org_id", membership.org_id)
      .is("deleted_at", null),
    supabase
      .from("purchase_orders")
      .select("id, job_id, cost_code_id, po_number, amount, status")
      .in("job_id", jobIds)
      .eq("org_id", membership.org_id)
      .is("deleted_at", null)
      .in("status", ["issued", "partially_invoiced", "fully_invoiced"]),
    supabase
      .from("jobs")
      .select("id, name")
      .in("id", jobIds)
      .eq("org_id", membership.org_id),
  ]);

  // Line-item contributions per scope, across ALL in-scope jobs (via the
  // invoices join; RLS + the org filter keep this tenant-safe).
  const { data: lineItems } = await supabase
    .from("invoice_line_items")
    .select("amount_cents, budget_line_id, po_id, invoices!inner(id, status, deleted_at, job_id)")
    .in("invoices.job_id", jobIds)
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
    const blJob = (bl as { job_id: string | null }).job_id;
    if (!ccId || !blJob) continue;
    baselines[scopeKey(blJob, ccId)] = {
      scope: "budget",
      scopeTotalCents: (bl as { revised_estimate: number | null }).revised_estimate ?? 0,
      baselineCents: computeBaselineCents(contribsByBudgetLine.get((bl as { id: string }).id) ?? [], reviewedId),
    };
  }
  // ...then PO scope overrides any (job, code) that has an open PO.
  for (const po of pos ?? []) {
    const ccId = (po as { cost_code_id: string | null }).cost_code_id;
    const poJob = (po as { job_id: string | null }).job_id;
    if (!ccId || !poJob) continue;
    baselines[scopeKey(poJob, ccId)] = {
      scope: "po",
      poNumber: (po as { po_number: string | null }).po_number,
      scopeTotalCents: (po as { amount: number | null }).amount ?? 0,
      baselineCents: computeBaselineCents(contribsByPo.get((po as { id: string }).id) ?? [], reviewedId),
    };
  }

  const jobNames: Record<string, string> = {};
  for (const j of jobRows ?? []) {
    jobNames[(j as { id: string }).id] = (j as { name: string | null }).name ?? "—";
  }

  return NextResponse.json({ baselines, jobNames });
});
