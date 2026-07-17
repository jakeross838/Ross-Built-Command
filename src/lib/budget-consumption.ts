/**
 * Budget-consumption reader — B2/Q8a (migration 00123).
 *
 * THE single budget-consumption source is the `invoice_budget_consumption`
 * SQL view: one row per counting-status invoice × (job_id, cost_code_id) with
 * its attributed cents + tier, mirroring the draw engine's 3-tier attribution
 * (src/lib/draw-calc.ts sumThisPeriodByCostCode) exactly — budgets and draws
 * read the same dollars. `budget_lines.invoiced` is DEAD (zero writers, zero
 * readers) per Jake's 2026-07-17 ruling: a stored rollup with no writer must
 * never feed a gate.
 *
 * Two read shapes:
 *  - View reads (counting-status invoices only): baselines, job/code rollups,
 *    display surfaces. Pass `excludeInvoiceId` for the trap-proof
 *    reviewed-invoice-excluded contract (see balance-impact.ts header).
 *  - `liveInvoiceContribution`: ONE invoice's own 3-tier attribution computed
 *    from live rows REGARDLESS of status — the over-budget gate runs before
 *    approval, when the invoice is pre-counting and thus absent from the view.
 *
 * All functions take a supabase client (server or service-role); this module
 * is server-only.
 */

import { scopeKey } from "@/lib/invoices/balance-impact";

type QueryClient = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

export type ConsumptionRow = {
  org_id: string;
  job_id: string;
  cost_code_id: string;
  invoice_id: string;
  amount_cents: number;
  tier: number;
};

/** Raw view rows, optionally filtered by job and/or excluding one invoice. */
export async function consumptionRows(
  supabase: QueryClient,
  orgId: string,
  opts: { jobId?: string; jobIds?: string[]; excludeInvoiceId?: string } = {}
): Promise<ConsumptionRow[]> {
  let q = supabase
    .from("invoice_budget_consumption")
    .select("org_id, job_id, cost_code_id, invoice_id, amount_cents, tier")
    .eq("org_id", orgId);
  if (opts.jobId) q = q.eq("job_id", opts.jobId);
  if (opts.jobIds && opts.jobIds.length > 0) q = q.in("job_id", opts.jobIds);
  if (opts.excludeInvoiceId) q = q.neq("invoice_id", opts.excludeInvoiceId);
  const { data, error } = await q;
  if (error) throw new Error(`invoice_budget_consumption read failed: ${error.message}`);
  return (data ?? []) as ConsumptionRow[];
}

/** Consumed cents per `${jobId}::${costCodeId}` scope key. */
export async function consumedByJobCode(
  supabase: QueryClient,
  orgId: string,
  opts: { jobId?: string; jobIds?: string[]; excludeInvoiceId?: string } = {}
): Promise<Map<string, number>> {
  const rows = await consumptionRows(supabase, orgId, opts);
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = scopeKey(r.job_id, r.cost_code_id);
    m.set(k, (m.get(k) ?? 0) + (r.amount_cents ?? 0));
  }
  return m;
}

/** Consumed cents per job (allocation-aware "billed to date"). */
export async function consumedByJob(
  supabase: QueryClient,
  orgId: string,
  opts: { jobIds?: string[] } = {}
): Promise<Map<string, number>> {
  const rows = await consumptionRows(supabase, orgId, opts);
  const m = new Map<string, number>();
  for (const r of rows) {
    m.set(r.job_id, (m.get(r.job_id) ?? 0) + (r.amount_cents ?? 0));
  }
  return m;
}

/**
 * ONE invoice's live 3-tier contribution per (job, code) — status-independent.
 * Mirrors the view's tier selection on live rows:
 *   tier 1: live allocations (job-scoped; any live allocation = covered)
 *   tier 2: coded line items (header job) when no allocations exist
 *   tier 3: invoice-level cost code × total_amount when neither exists
 * Used by the over-budget gate (the invoice is pre-counting at approve time).
 */
export async function liveInvoiceContribution(
  supabase: QueryClient,
  invoiceId: string
): Promise<Map<string, number>> {
  const m = new Map<string, number>();
  const add = (jobId: string, ccId: string, cents: number) => {
    const k = scopeKey(jobId, ccId);
    m.set(k, (m.get(k) ?? 0) + (cents ?? 0));
  };

  const { data: allocs } = await supabase
    .from("invoice_allocations")
    .select("job_id, cost_code_id, amount_cents")
    .eq("invoice_id", invoiceId)
    .is("deleted_at", null);
  if ((allocs ?? []).length > 0) {
    for (const a of allocs ?? []) {
      const row = a as { job_id: string | null; cost_code_id: string | null; amount_cents: number | null };
      if (row.job_id && row.cost_code_id) add(row.job_id, row.cost_code_id, row.amount_cents ?? 0);
    }
    return m;
  }

  const { data: invoice } = await supabase
    .from("invoices")
    .select("job_id, cost_code_id, total_amount")
    .eq("id", invoiceId)
    .maybeSingle();
  const inv = invoice as { job_id: string | null; cost_code_id: string | null; total_amount: number | null } | null;
  if (!inv?.job_id) return m;

  const { data: lines } = await supabase
    .from("invoice_line_items")
    .select("cost_code_id, amount_cents")
    .eq("invoice_id", invoiceId)
    .is("deleted_at", null)
    .not("cost_code_id", "is", null);
  if ((lines ?? []).length > 0) {
    for (const l of lines ?? []) {
      const row = l as { cost_code_id: string | null; amount_cents: number | null };
      if (row.cost_code_id) add(inv.job_id, row.cost_code_id, row.amount_cents ?? 0);
    }
    return m;
  }

  if (inv.cost_code_id) add(inv.job_id, inv.cost_code_id, inv.total_amount ?? 0);
  return m;
}

/**
 * Allocation-coverage check for the `require_budget_allocation` approval gate
 * (allocations-canonical replacement for the old "every line item has a
 * budget_line_id" check): the invoice must have live allocations summing to
 * total_amount, and every allocation's (job, cost code) must resolve to a
 * live budget line. Returns null when the gate passes, else a human-readable
 * block reason.
 */
export async function budgetAllocationGateBlocker(
  supabase: QueryClient,
  orgId: string,
  invoiceId: string,
  totalAmount: number
): Promise<string | null> {
  const { data: allocs } = await supabase
    .from("invoice_allocations")
    .select("job_id, cost_code_id, amount_cents")
    .eq("invoice_id", invoiceId)
    .is("deleted_at", null);
  const rows = (allocs ?? []) as Array<{
    job_id: string | null;
    cost_code_id: string | null;
    amount_cents: number | null;
  }>;
  if (rows.length === 0) {
    return "Invoice must be fully allocated to cost codes before approval";
  }
  const sum = rows.reduce((s, a) => s + Math.round(a.amount_cents ?? 0), 0);
  if (sum !== totalAmount) {
    return `Allocations sum to ${sum} cents but invoice total is ${totalAmount} cents — rebalance before approval`;
  }
  const pairs = Array.from(
    new Map(
      rows
        .filter((a) => a.job_id && a.cost_code_id)
        .map((a) => [scopeKey(a.job_id as string, a.cost_code_id as string), a])
    ).values()
  );
  const jobIds = Array.from(new Set(pairs.map((p) => p.job_id as string)));
  const { data: bls } = await supabase
    .from("budget_lines")
    .select("job_id, cost_code_id")
    .eq("org_id", orgId)
    .in("job_id", jobIds)
    .is("deleted_at", null);
  const blKeys = new Set(
    ((bls ?? []) as Array<{ job_id: string; cost_code_id: string | null }>)
      .filter((b) => b.cost_code_id)
      .map((b) => scopeKey(b.job_id, b.cost_code_id as string))
  );
  const missing = pairs.filter(
    (p) => !blKeys.has(scopeKey(p.job_id as string, p.cost_code_id as string))
  );
  if (missing.length > 0) {
    return `${missing.length} allocation(s) have no budget line for their job + cost code — add budget lines or adjust the allocations`;
  }
  return null;
}
