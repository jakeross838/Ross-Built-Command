// WI-001 — Inline budget context validator.
//
// Source rule (`.planning/architecture/WORKFLOW-INTELLIGENCE.md §WI-001`):
//   "When approving an invoice, show the cost code's revised budget,
//    total invoiced to date (including this invoice), committed (open
//    POs + approved-unbilled COs), and available balance — all live in
//    the right rail of the review view."
//
// Distilled validator (input: an `InvoiceRow` proposed for approval):
// verify the invoice's `cost_code_id` references a `budget_lines` row
// for the same `job_id`, AND the proposed `total_amount` doesn't push
// the cost code over `revised_estimate` by an unflagged amount.
//
// Violation codes:
//   - `wi-001-budget-line-query-error`     — DB error on budget_lines lookup
//   - `wi-001-cost-code-no-budget-line`    — invoice's cost_code_id has no matching budget_lines row for the job
//   - `wi-001-invoice-aggregation-error`   — DB error on prior-invoices aggregation
//   - `wi-001-budget-line-overage`         — approving this invoice would push total_to_date > revised_estimate (informational; not blocking — PM can approve over-budget per CLAUDE.md "What-If Handling" rule 4)
//
// Per CLAUDE.md "Recalculate, don't increment" — prior totals are aggregated
// from source invoice rows on every call. No stored aggregate is read.
import type { Validator, ValidatorViolation } from "../types";
import type { InvoiceRow } from "@/lib/types";

export const wi001InlineBudgetContext: Validator<InvoiceRow> = async (
  invoice,
  ctx,
) => {
  const violations: ValidatorViolation[] = [];

  if (!invoice.cost_code_id || !invoice.job_id) {
    // Cost-code-less invoices skip the budget context check; this is a
    // legitimate state pre-PM-review (cost_code_id assigned during review).
    return { ok: true, violations: [] };
  }

  // Look up the budget_line for this (job_id, cost_code_id).
  const { data: budgetLine, error: blErr } = await ctx.supabase
    .from("budget_lines")
    .select("id, revised_estimate")
    .eq("job_id", invoice.job_id)
    .eq("cost_code_id", invoice.cost_code_id)
    .eq("org_id", ctx.org_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (blErr) {
    violations.push({
      code: "wi-001-budget-line-query-error",
      message: `Failed to query budget_lines: ${blErr.message}`,
      evidence: {
        job_id: invoice.job_id,
        cost_code_id: invoice.cost_code_id,
      },
    });
    return { ok: false, violations };
  }

  if (!budgetLine) {
    violations.push({
      code: "wi-001-cost-code-no-budget-line",
      message: `Invoice references cost_code_id ${invoice.cost_code_id} but no budget_lines row exists for job ${invoice.job_id}.`,
      evidence: {
        job_id: invoice.job_id,
        cost_code_id: invoice.cost_code_id,
      },
    });
    return { ok: false, violations };
  }

  // Aggregate prior approved invoice totals for (job_id, cost_code_id).
  // R.2 recalculate-don't-increment — sourced from invoices table, never
  // a stored aggregate.
  const { data: approvedInvoices, error: aiErr } = await ctx.supabase
    .from("invoices")
    .select("total_amount")
    .eq("job_id", invoice.job_id)
    .eq("cost_code_id", invoice.cost_code_id)
    .eq("org_id", ctx.org_id)
    .in("status", [
      "pm_approved",
      "qa_approved",
      "pushed_to_qb",
      "in_draw",
      "paid",
    ])
    .is("deleted_at", null);

  if (aiErr) {
    violations.push({
      code: "wi-001-invoice-aggregation-error",
      message: `Failed to aggregate prior invoices: ${aiErr.message}`,
      evidence: {
        job_id: invoice.job_id,
        cost_code_id: invoice.cost_code_id,
      },
    });
    return { ok: false, violations };
  }

  const priorTotal = (approvedInvoices ?? []).reduce(
    (acc, row) => acc + (row.total_amount ?? 0),
    0,
  );
  const proposedTotalToDate = priorTotal + (invoice.total_amount ?? 0);

  if (
    budgetLine.revised_estimate != null &&
    proposedTotalToDate > budgetLine.revised_estimate
  ) {
    const overage = proposedTotalToDate - budgetLine.revised_estimate;
    violations.push({
      code: "wi-001-budget-line-overage",
      message: `Approving this invoice would push total_to_date ($${proposedTotalToDate / 100}) over revised_estimate ($${budgetLine.revised_estimate / 100}) by $${overage / 100}.`,
      evidence: {
        budget_line_id: budgetLine.id,
        revised_estimate: budgetLine.revised_estimate,
        prior_total: priorTotal,
        this_invoice: invoice.total_amount,
        proposed_total_to_date: proposedTotalToDate,
        overage,
      },
    });
    // NOTE: This is INFORMATIONAL per CLAUDE.md "What-If Handling" rule 4.
    // The validator surfaces ok:false so the UI can show the overage
    // warning, but the caller (invoice approval API route) decides whether
    // to block or proceed with PM acknowledgment.
  }

  return { ok: violations.length === 0, violations };
};
