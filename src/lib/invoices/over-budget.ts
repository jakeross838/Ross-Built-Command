/**
 * WI-L-4 over-budget gate — pure decision logic (B2/Q8a).
 *
 * Extracted from src/app/api/invoices/[id]/action/route.ts so the threshold
 * behavior is unit-testable, and re-sourced onto the unified allocation-based
 * consumption (per Jake's 2026-07-17 ruling): the baseline comes from the
 * invoice_budget_consumption view (computed FROM SOURCE, excluding the
 * reviewed invoice), never from the dead budget_lines.invoiced cache.
 *
 * Decision rule (unchanged from the pre-B2 gate): for every (job, cost code)
 * scope this invoice touches that has a live budget line with
 * revised_estimate > 0, block when baseline + thisInvoice > revised_estimate.
 * Scopes without a budget line are not gated (same as the old gate skipping
 * line items with NULL budget_line_id).
 */

import { parseScopeKey } from "@/lib/invoices/balance-impact";

export type GateBudgetLine = {
  budget_line_id: string;
  revised_estimate: number;
  cost_code: string | null;
  description: string | null;
};

export type OverageDetail = {
  budget_line_id: string;
  cost_code: string | null;
  description: string | null;
  revised_estimate: number;
  currently_invoiced: number;
  this_invoice_allocation: number;
  overage: number;
};

/**
 * @param contribution scopeKey(job,code) → this invoice's live cents
 * @param baseline     scopeKey(job,code) → consumed cents from every OTHER
 *                     counting-status invoice (reviewed-invoice-EXCLUDED)
 * @param budgetLines  scopeKey(job,code) → live budget line for that scope
 */
export function evaluateOverBudget(
  contribution: Map<string, number>,
  baseline: Map<string, number>,
  budgetLines: Map<string, GateBudgetLine>
): OverageDetail[] {
  const overages: OverageDetail[] = [];
  for (const [key, thisInvoice] of contribution) {
    const bl = budgetLines.get(key);
    if (!bl) continue; // no budget line for this (job, code) → not gated
    const revised = bl.revised_estimate ?? 0;
    if (revised <= 0) continue;
    const invoiced = baseline.get(key) ?? 0;
    if (invoiced + thisInvoice > revised) {
      overages.push({
        budget_line_id: bl.budget_line_id,
        cost_code: bl.cost_code,
        description: bl.description,
        revised_estimate: revised,
        currently_invoiced: invoiced,
        this_invoice_allocation: thisInvoice,
        overage: invoiced + thisInvoice - revised,
      });
    }
  }
  return overages;
}

/** Distinct job ids touched by a contribution map (for budget-line fetch). */
export function jobIdsFromContribution(contribution: Map<string, number>): string[] {
  const jobs = new Set<string>();
  for (const key of contribution.keys()) {
    const { jobId } = parseScopeKey(key);
    if (jobId) jobs.add(jobId);
  }
  return Array.from(jobs);
}
