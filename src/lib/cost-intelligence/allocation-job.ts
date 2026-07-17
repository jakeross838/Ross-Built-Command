/**
 * Per-portion job attribution for price-intel observations — B2 item 3
 * (migration 00124).
 *
 * Deterministic unique-code→job rule (mono-job invoices unchanged by
 * construction): a line's job = the single distinct job among the invoice's
 * LIVE allocations matching the line's cost code; zero or multiple matches
 * (code absent from allocations, or the same code split across jobs —
 * genuinely ambiguous without a line↔allocation linkage) fall back to the
 * header job. SQL twin: public.resolve_allocation_job_for_line (00124) —
 * keep in lockstep.
 *
 * Timing hazard this module closes: extraction auto-commit runs at SAVE
 * time, before any PM has split the invoice in review — so spine rows are
 * born header-attributed. `reattributeSpineJobsForInvoice` re-resolves them
 * whenever the allocation set changes (called from the allocations PUT);
 * migration 00124's trg_vip_after_update_job keeps the job_item_activity
 * rollup consistent under the job_id UPDATE.
 */

type QueryClient = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

/** TS mirror of public.resolve_allocation_job_for_line (00124). */
export function resolveAllocationJobForLine(
  lineCostCodeId: string | null,
  headerJobId: string | null,
  liveAllocations: Array<{ job_id: string | null; cost_code_id: string | null }>
): string | null {
  if (!lineCostCodeId) return headerJobId;
  const jobs = new Set(
    liveAllocations
      .filter((a) => a.cost_code_id === lineCostCodeId && a.job_id)
      .map((a) => a.job_id as string)
  );
  if (jobs.size === 1) return Array.from(jobs)[0];
  return headerJobId;
}

/**
 * Re-resolve job attribution on existing spine rows for one invoice after
 * its allocation set changed. Observational data — callers wrap in
 * try/catch and never block the money save on this.
 * Returns the number of spine rows re-attributed.
 */
export async function reattributeSpineJobsForInvoice(
  supabase: QueryClient,
  invoiceId: string
): Promise<number> {
  const [{ data: invoice }, { data: allocs }, { data: vipRows }] = await Promise.all([
    supabase
      .from("invoices")
      .select("job_id")
      .eq("id", invoiceId)
      .maybeSingle(),
    supabase
      .from("invoice_allocations")
      .select("job_id, cost_code_id")
      .eq("invoice_id", invoiceId)
      .is("deleted_at", null),
    supabase
      .from("vendor_item_pricing")
      .select("id, job_id, source_invoice_line_id")
      .eq("source_invoice_id", invoiceId)
      .is("deleted_at", null),
  ]);
  const headerJobId = (invoice as { job_id: string | null } | null)?.job_id ?? null;
  const liveAllocations = (allocs ?? []) as Array<{
    job_id: string | null;
    cost_code_id: string | null;
  }>;
  const rows = (vipRows ?? []) as Array<{
    id: string;
    job_id: string | null;
    source_invoice_line_id: string | null;
  }>;
  if (rows.length === 0) return 0;

  const lineIds = Array.from(
    new Set(rows.map((r) => r.source_invoice_line_id).filter((x): x is string => !!x))
  );
  const lineCodeById = new Map<string, string | null>();
  if (lineIds.length > 0) {
    const { data: lines } = await supabase
      .from("invoice_line_items")
      .select("id, cost_code_id")
      .in("id", lineIds);
    for (const l of lines ?? []) {
      const row = l as { id: string; cost_code_id: string | null };
      lineCodeById.set(row.id, row.cost_code_id);
    }
  }

  let changed = 0;
  for (const vip of rows) {
    const lineCode = vip.source_invoice_line_id
      ? lineCodeById.get(vip.source_invoice_line_id) ?? null
      : null;
    const resolved = resolveAllocationJobForLine(lineCode, headerJobId, liveAllocations);
    if (resolved && resolved !== vip.job_id) {
      const { error } = await supabase
        .from("vendor_item_pricing")
        .update({ job_id: resolved })
        .eq("id", vip.id);
      if (!error) changed += 1;
    }
  }
  return changed;
}
