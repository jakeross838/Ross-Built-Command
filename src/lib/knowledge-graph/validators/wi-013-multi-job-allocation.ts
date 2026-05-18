// WI-013 — Multi-job allocation validator.
//
// Source rule (`.planning/architecture/WORKFLOW-INTELLIGENCE.md §WI-013`):
//   "A single roofing invoice covers two adjacent jobs ... PM splits the
//    invoice into two job allocations with audit trail."
//
// Distilled validator (input: an array of proposed allocations for a
// single invoice):
//   (a) sum of allocation amounts equals invoice.total_amount (1¢ tolerance)
//   (b) every allocation's `job_id` belongs to caller's `org_id`
//   (c) every allocation's `cost_code_id` (when present) references a
//       `budget_lines` row for that allocation's job
//
// Violation codes:
//   - `wi-013-allocation-sum-drift`                    — sum ≠ invoice total
//   - `wi-013-allocation-job-not-found`                — allocation job_id unknown / unreadable
//   - `wi-013-allocation-cross-tenant`                 — allocation job belongs to a different org
//   - `wi-013-allocation-cost-code-no-budget-line`     — cost_code_id present but no matching budget_line
//
// Per CLAUDE.md "Multi-tenant RLS" — every allocation's `job_id` is
// cross-validated against `ctx.org_id`; an attacker who supplied a
// job_id outside their org would fail at the `cross-tenant` violation
// even if RLS would have caught the underlying read.
import type { Validator, ValidatorViolation } from "../types";

/**
 * Shape accepted as an allocation input. Loose shape — the validator
 * does not require the row already exists (validates proposed
 * allocations before INSERT).
 */
export interface AllocationInput {
  invoice_id?: string;
  job_id: string;
  cost_code_id: string | null;
  amount: number; // cents
}

export interface MultiJobAllocationInput {
  invoice_id: string;
  invoice_total_amount: number; // cents
  allocations: AllocationInput[];
}

export const wi013MultiJobAllocation: Validator<MultiJobAllocationInput> =
  async (input, ctx) => {
    const violations: ValidatorViolation[] = [];

    // (a) Sum equality (R.2 recalculate, 1¢ tolerance)
    const sum = input.allocations.reduce(
      (acc, a) => acc + (a.amount ?? 0),
      0,
    );
    const drift = Math.abs(sum - input.invoice_total_amount);
    if (drift > 1) {
      violations.push({
        code: "wi-013-allocation-sum-drift",
        message: `Allocations sum to ${sum} cents but invoice total is ${input.invoice_total_amount} cents (drift ${drift}).`,
        evidence: {
          sum,
          invoice_total: input.invoice_total_amount,
          drift,
        },
      });
    }

    // (b) Cross-tenant check + (c) budget_line existence per allocation.
    for (const alloc of input.allocations) {
      const { data: job, error: jobErr } = await ctx.supabase
        .from("jobs")
        .select("id, org_id")
        .eq("id", alloc.job_id)
        .maybeSingle();

      if (jobErr || !job) {
        violations.push({
          code: "wi-013-allocation-job-not-found",
          message: `Allocation references job ${alloc.job_id} which does not exist or is not readable.`,
          evidence: { job_id: alloc.job_id },
        });
        continue;
      }
      if (job.org_id !== ctx.org_id) {
        violations.push({
          code: "wi-013-allocation-cross-tenant",
          message: `Allocation references job ${alloc.job_id} which belongs to org ${job.org_id}, not the caller's org ${ctx.org_id}.`,
          evidence: {
            job_id: alloc.job_id,
            job_org_id: job.org_id,
          },
        });
        continue;
      }

      if (alloc.cost_code_id) {
        const { data: budgetLine } = await ctx.supabase
          .from("budget_lines")
          .select("id")
          .eq("job_id", alloc.job_id)
          .eq("cost_code_id", alloc.cost_code_id)
          .eq("org_id", ctx.org_id)
          .is("deleted_at", null)
          .maybeSingle();
        if (!budgetLine) {
          violations.push({
            code: "wi-013-allocation-cost-code-no-budget-line",
            message: `Allocation for job ${alloc.job_id} references cost_code ${alloc.cost_code_id} with no matching budget_line.`,
            evidence: {
              job_id: alloc.job_id,
              cost_code_id: alloc.cost_code_id,
            },
          });
        }
      }
    }

    return { ok: violations.length === 0, violations };
  };
