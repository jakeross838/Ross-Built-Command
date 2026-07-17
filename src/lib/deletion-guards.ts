/**
 * Deletion guards — Phase 7b.
 *
 * Every financial entity has dependent records. Before allowing a delete or
 * void, we check for those dependencies and block if any would be orphaned.
 *
 * Each guard returns `{ allowed, blockers }` where `blockers` is a list of
 * human-readable strings the caller can surface in an error toast.
 *
 * Callers must ALSO call logActivity('..._blocked') when a guard rejects so
 * we capture the attempt.
 */

import { tryCreateServiceRoleClient } from "@/lib/supabase/service";

export interface GuardResult {
  allowed: boolean;
  blockers: string[];
}

/** Status sets that count as "linked" for guard purposes. */
const PO_ACTIVE = ["draft", "issued", "partially_invoiced", "fully_invoiced", "closed"];
const INVOICE_ACTIVE_STATUSES = [
  "received",
  "ai_processed",
  "pm_review",
  "pm_approved",
  "pm_held",
  "info_requested",
  "qa_review",
  "qa_approved",
  "pushed_to_qb",
  "in_draw",
  "paid",
];
const CO_ACTIVE = ["draft", "pending", "approved"];
const DRAW_ACTIVE = ["draft", "pm_review", "approved", "submitted", "paid"];

/** Budget line cannot be deleted if any PO or CO references it, or if any
 *  counting-status invoice consumes budget on its (job_id, cost_code_id) —
 *  consumption sourced from the invoice_budget_consumption view (B2/Q8a,
 *  migration 00123), NOT the dead invoice_line_items.budget_line_id path. */
export async function canDeleteBudgetLine(budgetLineId: string): Promise<GuardResult> {
  const supabase = tryCreateServiceRoleClient();
  if (!supabase) return { allowed: true, blockers: [] };

  // Consumption is keyed by (job_id, cost_code_id), not budget_line_id —
  // resolve the budget line's scope first, then read the view.
  const consumptionPromise = (async (): Promise<{ invoice_id: string | null }[]> => {
    const { data: bl } = await supabase
      .from("budget_lines")
      .select("job_id, cost_code_id")
      .eq("id", budgetLineId)
      .maybeSingle();
    if (!bl?.job_id || !bl?.cost_code_id) return [];
    const { data: cons } = await supabase
      .from("invoice_budget_consumption")
      .select("invoice_id")
      .eq("job_id", bl.job_id)
      .eq("cost_code_id", bl.cost_code_id);
    return cons ?? [];
  })();

  const [{ data: pos }, consumption, { data: col }, { data: poLines }] = await Promise.all([
    supabase
      .from("purchase_orders")
      .select("id")
      .eq("budget_line_id", budgetLineId)
      .in("status", PO_ACTIVE)
      .is("deleted_at", null),
    consumptionPromise,
    supabase
      .from("change_order_lines")
      .select("id, change_orders!inner(status, deleted_at)")
      .eq("budget_line_id", budgetLineId)
      .is("deleted_at", null),
    supabase
      .from("po_line_items")
      .select("id, purchase_orders!inner(status, deleted_at)")
      .eq("budget_line_id", budgetLineId)
      .is("deleted_at", null),
  ]);

  const activeCol = (col ?? []).filter((r) => {
    const co = (r as unknown as { change_orders: { status: string; deleted_at: string | null } }).change_orders;
    return co && !co.deleted_at && CO_ACTIVE.includes(co.status);
  });
  const activePoLines = (poLines ?? []).filter((r) => {
    const po = (r as unknown as { purchase_orders: { status: string; deleted_at: string | null } }).purchase_orders;
    return po && !po.deleted_at && PO_ACTIVE.includes(po.status);
  });

  const blockers: string[] = [];
  if ((pos ?? []).length > 0) blockers.push(`${pos!.length} purchase order(s) linked (header)`);
  if (activePoLines.length > 0) blockers.push(`${activePoLines.length} purchase order line(s) linked`);
  if (consumption.length > 0)
    blockers.push(`${consumption.length} invoice(s) consume budget on this job + cost code`);
  if (activeCol.length > 0) blockers.push(`${activeCol.length} change order line(s) reference this budget line`);

  return { allowed: blockers.length === 0, blockers };
}

/** Job cannot be deleted if any financial record exists. */
export async function canDeleteJob(jobId: string): Promise<GuardResult> {
  const supabase = tryCreateServiceRoleClient();
  if (!supabase) return { allowed: true, blockers: [] };

  const [invCount, poCount, coCount, drawCount, bdCount, allocCount] = await Promise.all([
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("job_id", jobId)
      .is("deleted_at", null)
      .in("status", INVOICE_ACTIVE_STATUSES),
    supabase
      .from("purchase_orders")
      .select("id", { count: "exact", head: true })
      .eq("job_id", jobId)
      .is("deleted_at", null)
      .in("status", PO_ACTIVE),
    supabase
      .from("change_orders")
      .select("id", { count: "exact", head: true })
      .eq("job_id", jobId)
      .is("deleted_at", null)
      .in("status", CO_ACTIVE),
    supabase
      .from("draws")
      .select("id", { count: "exact", head: true })
      .eq("job_id", jobId)
      .is("deleted_at", null)
      .in("status", DRAW_ACTIVE),
    supabase
      .from("budget_lines")
      .select("id", { count: "exact", head: true })
      .eq("job_id", jobId)
      .is("deleted_at", null),
    // Multi-job splits (00122): an allocation can reference a job that is
    // NOT the invoice's header job, so the invoices check above misses it.
    supabase
      .from("invoice_allocations")
      .select("id", { count: "exact", head: true })
      .eq("job_id", jobId)
      .is("deleted_at", null),
  ]);

  const blockers: string[] = [];
  if ((invCount.count ?? 0) > 0) blockers.push(`${invCount.count} invoice(s)`);
  if ((poCount.count ?? 0) > 0) blockers.push(`${poCount.count} purchase order(s)`);
  if ((coCount.count ?? 0) > 0) blockers.push(`${coCount.count} change order(s)`);
  if ((drawCount.count ?? 0) > 0) blockers.push(`${drawCount.count} draw(s)`);
  if ((bdCount.count ?? 0) > 0) blockers.push(`${bdCount.count} budget line(s)`);
  if ((allocCount.count ?? 0) > 0) blockers.push(`${allocCount.count} invoice allocation(s)`);

  return { allowed: blockers.length === 0, blockers };
}

/** Vendor cannot be deleted if invoices or POs reference them. */
export async function canDeleteVendor(vendorId: string): Promise<GuardResult> {
  const supabase = tryCreateServiceRoleClient();
  if (!supabase) return { allowed: true, blockers: [] };

  const [invRes, poRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendorId)
      .is("deleted_at", null),
    supabase
      .from("purchase_orders")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendorId)
      .is("deleted_at", null),
  ]);

  const blockers: string[] = [];
  if ((invRes.count ?? 0) > 0) blockers.push(`${invRes.count} invoice(s)`);
  if ((poRes.count ?? 0) > 0) blockers.push(`${poRes.count} purchase order(s)`);
  return { allowed: blockers.length === 0, blockers };
}

/**
 * PO cannot be voided if any of its linked invoice lines are on an in_draw
 * or paid invoice — those lock against the draw.
 */
export async function canVoidPO(poId: string): Promise<GuardResult> {
  const supabase = tryCreateServiceRoleClient();
  if (!supabase) return { allowed: true, blockers: [] };

  const { data } = await supabase
    .from("invoice_line_items")
    .select("id, invoices!inner(status, deleted_at)")
    .eq("po_id", poId)
    .is("deleted_at", null);

  const locked = (data ?? []).filter((row) => {
    const inv = (row as unknown as { invoices: { status: string; deleted_at: string | null } }).invoices;
    return inv && !inv.deleted_at && ["in_draw", "paid"].includes(inv.status);
  });
  const blockers: string[] = [];
  if (locked.length > 0) {
    blockers.push(
      `${locked.length} invoice line(s) on in-draw or paid invoices — draws must be voided first`
    );
  }
  return { allowed: blockers.length === 0, blockers };
}

/**
 * CO cannot be voided if draws have been submitted after the CO's approval
 * date — voiding would rewrite numbers already sent to the owner.
 */
export async function canVoidCO(coId: string): Promise<GuardResult> {
  const supabase = tryCreateServiceRoleClient();
  if (!supabase) return { allowed: true, blockers: [] };

  const { data: co } = await supabase
    .from("change_orders")
    .select("job_id, approved_date, status")
    .eq("id", coId)
    .maybeSingle();
  if (!co) return { allowed: false, blockers: ["Change order not found"] };
  const approvedDate = (co as { approved_date?: string | null }).approved_date;
  if (!approvedDate) {
    return { allowed: true, blockers: [] };
  }

  const jobId = (co as { job_id: string }).job_id;
  const { data: laterDraws } = await supabase
    .from("draws")
    .select("id, draw_number, submitted_at")
    .eq("job_id", jobId)
    .in("status", ["submitted", "paid"])
    .is("deleted_at", null);
  const offenders = (laterDraws ?? []).filter((d) => {
    const submitted = (d as { submitted_at?: string | null }).submitted_at;
    return submitted && submitted > approvedDate;
  });
  const blockers: string[] = [];
  if (offenders.length > 0) {
    blockers.push(
      `${offenders.length} draw(s) submitted after this CO was approved — voiding will invalidate submitted pay applications`
    );
  }
  return { allowed: blockers.length === 0, blockers };
}

/** Cost code cannot be deleted if vendors default to it, budget lines use it,
 *  or invoice lines / invoice allocations reference it. */
export async function canDeleteCostCode(costCodeId: string): Promise<GuardResult> {
  const supabase = tryCreateServiceRoleClient();
  if (!supabase) return { allowed: true, blockers: [] };

  const [blCount, invCount, allocCount, poCount, vendCount] = await Promise.all([
    supabase
      .from("budget_lines")
      .select("id", { count: "exact", head: true })
      .eq("cost_code_id", costCodeId)
      .is("deleted_at", null),
    supabase
      .from("invoice_line_items")
      .select("id", { count: "exact", head: true })
      .eq("cost_code_id", costCodeId)
      .is("deleted_at", null),
    // Allocations are the canonical budget-consumption scope (00122/00123)
    // and reference cost codes independently of line items.
    supabase
      .from("invoice_allocations")
      .select("id", { count: "exact", head: true })
      .eq("cost_code_id", costCodeId)
      .is("deleted_at", null),
    supabase
      .from("purchase_orders")
      .select("id", { count: "exact", head: true })
      .eq("cost_code_id", costCodeId)
      .is("deleted_at", null),
    supabase
      .from("vendors")
      .select("id", { count: "exact", head: true })
      .eq("default_cost_code_id", costCodeId)
      .is("deleted_at", null),
  ]);

  const blockers: string[] = [];
  if ((blCount.count ?? 0) > 0) blockers.push(`${blCount.count} budget line(s)`);
  if ((invCount.count ?? 0) > 0) blockers.push(`${invCount.count} invoice line(s)`);
  if ((allocCount.count ?? 0) > 0) blockers.push(`${allocCount.count} invoice allocation(s)`);
  if ((poCount.count ?? 0) > 0) blockers.push(`${poCount.count} purchase order(s)`);
  if ((vendCount.count ?? 0) > 0) blockers.push(`${vendCount.count} vendor(s) default to this code`);
  return { allowed: blockers.length === 0, blockers };
}

/** Render a human-readable blocker message from a GuardResult. */
export function formatBlockers(action: string, result: GuardResult): string {
  if (result.allowed) return "";
  return `Cannot ${action}: ${result.blockers.join(", ")}.`;
}
