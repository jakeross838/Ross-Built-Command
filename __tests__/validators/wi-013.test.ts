/**
 * Unit tests for `wi013MultiJobAllocation` validator.
 *
 * Per F1-Wave-B Plan B-1b — exercises the locked validator interface
 * contract from src/lib/knowledge-graph/types.ts via a stubbed
 * SupabaseClient (no real DB).
 *
 * Coverage:
 *   - happy: allocations sum exactly to total, jobs in-org, cost codes
 *     have budget lines → ok=true
 *   - violation: sum drift > 1 cent → ok=false with sum-drift code
 *   - violation: cross-tenant job → ok=false with cross-tenant code
 *   - violation: missing budget line for allocation → ok=false with
 *     cost-code-no-budget-line code
 *   - combination: multiple violations stack in one result
 */
import { strict as assert } from "node:assert";
import { wi013MultiJobAllocation } from "../../src/lib/knowledge-graph/validators/wi-013-multi-job-allocation";
import type { ValidatorContext } from "../../src/lib/knowledge-graph/types";

type Case = { name: string; fn: () => Promise<void> };
const cases: Case[] = [];
const test = (name: string, fn: () => Promise<void>) =>
  cases.push({ name, fn });

const ORG_ID = "00000000-0000-0000-0000-fb1ce0a55e55"; // fixture-harness-org
const OTHER_ORG = "11111111-1111-1111-1111-111111111111";

// ── stub supabase client ──────────────────────────────────────────────
// The validator does two query shapes:
//   - .from("jobs").select(...).eq("id", job_id).maybeSingle()
//   - .from("budget_lines").select(...).eq("job_id", j).eq("cost_code_id", c).eq("org_id", o).is("deleted_at", null).maybeSingle()
//
// Stub records the args via the chain and returns canned data from a map
// indexed by `(table, eq-key1=val1, ...)`.

interface JobRow {
  id: string;
  org_id: string;
}

interface StubConfig {
  jobsById?: Record<string, JobRow | null>;
  budgetLinesByJobCc?: Record<string, { id: string } | null>;
}

function makeStubClient(cfg: StubConfig): ValidatorContext["supabase"] {
  return {
    from(table: string) {
      const eqArgs: Record<string, unknown> = {};
      const builder: {
        select: (..._args: unknown[]) => typeof builder;
        eq: (col: string, val: unknown) => typeof builder;
        is: (..._args: unknown[]) => typeof builder;
        maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
      } = {
        select: () => builder,
        eq: (col, val) => {
          eqArgs[col] = val;
          return builder;
        },
        is: () => builder,
        maybeSingle: async () => {
          if (table === "jobs") {
            const jobId = eqArgs["id"] as string;
            const job = cfg.jobsById?.[jobId];
            return {
              data: job === undefined ? null : job,
              error: null,
            };
          }
          if (table === "budget_lines") {
            const k = `${eqArgs["job_id"]}::${eqArgs["cost_code_id"]}`;
            const bl = cfg.budgetLinesByJobCc?.[k];
            return {
              data: bl === undefined ? null : bl,
              error: null,
            };
          }
          return { data: null, error: null };
        },
      };
      return builder;
    },
  } as unknown as ValidatorContext["supabase"];
}

const baseCtx = (cfg: StubConfig): ValidatorContext => ({
  supabase: makeStubClient(cfg),
  org_id: ORG_ID,
  user_id: null,
});

// ── tests ─────────────────────────────────────────────────────────────

test("allocations sum exactly, jobs in-org, budget lines present → ok=true", async () => {
  const ctx = baseCtx({
    jobsById: {
      "job-a": { id: "job-a", org_id: ORG_ID },
      "job-b": { id: "job-b", org_id: ORG_ID },
    },
    budgetLinesByJobCc: {
      "job-a::cc-1": { id: "bl-a-1" },
      "job-b::cc-1": { id: "bl-b-1" },
    },
  });
  const result = await wi013MultiJobAllocation(
    {
      invoice_id: "inv-1",
      invoice_total_amount: 100_000,
      allocations: [
        { job_id: "job-a", cost_code_id: "cc-1", amount: 60_000 },
        { job_id: "job-b", cost_code_id: "cc-1", amount: 40_000 },
      ],
    },
    ctx,
  );
  assert.equal(result.ok, true);
  assert.equal(result.violations.length, 0);
});

test("sum drift > 1 cent → wi-013-allocation-sum-drift", async () => {
  const ctx = baseCtx({
    jobsById: {
      "job-a": { id: "job-a", org_id: ORG_ID },
    },
    budgetLinesByJobCc: {
      "job-a::cc-1": { id: "bl-a-1" },
    },
  });
  const result = await wi013MultiJobAllocation(
    {
      invoice_id: "inv-1",
      invoice_total_amount: 100_000,
      allocations: [
        { job_id: "job-a", cost_code_id: "cc-1", amount: 60_000 },
        // 60_000 vs 100_000 → drift 40_000
      ],
    },
    ctx,
  );
  assert.equal(result.ok, false);
  const codes = result.violations.map((v) => v.code);
  assert.ok(codes.includes("wi-013-allocation-sum-drift"));
});

test("sum drift of exactly 1 cent → tolerated, no sum-drift violation", async () => {
  const ctx = baseCtx({
    jobsById: {
      "job-a": { id: "job-a", org_id: ORG_ID },
    },
    budgetLinesByJobCc: {
      "job-a::cc-1": { id: "bl-a-1" },
    },
  });
  const result = await wi013MultiJobAllocation(
    {
      invoice_id: "inv-1",
      invoice_total_amount: 100_001,
      allocations: [
        { job_id: "job-a", cost_code_id: "cc-1", amount: 100_000 },
      ],
    },
    ctx,
  );
  // drift = 1, NOT > 1, so no sum-drift violation
  const codes = result.violations.map((v) => v.code);
  assert.ok(!codes.includes("wi-013-allocation-sum-drift"));
});

test("allocation references job in different org → wi-013-allocation-cross-tenant", async () => {
  const ctx = baseCtx({
    jobsById: {
      "job-foreign": { id: "job-foreign", org_id: OTHER_ORG },
    },
    budgetLinesByJobCc: {},
  });
  const result = await wi013MultiJobAllocation(
    {
      invoice_id: "inv-1",
      invoice_total_amount: 50_000,
      allocations: [
        { job_id: "job-foreign", cost_code_id: null, amount: 50_000 },
      ],
    },
    ctx,
  );
  assert.equal(result.ok, false);
  const codes = result.violations.map((v) => v.code);
  assert.ok(codes.includes("wi-013-allocation-cross-tenant"));
});

test("allocation job not found → wi-013-allocation-job-not-found", async () => {
  const ctx = baseCtx({
    jobsById: {
      // job-missing not in map → returns null
    },
    budgetLinesByJobCc: {},
  });
  const result = await wi013MultiJobAllocation(
    {
      invoice_id: "inv-1",
      invoice_total_amount: 50_000,
      allocations: [
        { job_id: "job-missing", cost_code_id: null, amount: 50_000 },
      ],
    },
    ctx,
  );
  assert.equal(result.ok, false);
  const codes = result.violations.map((v) => v.code);
  assert.ok(codes.includes("wi-013-allocation-job-not-found"));
});

test("allocation with cost_code_id but no budget_line → wi-013-allocation-cost-code-no-budget-line", async () => {
  const ctx = baseCtx({
    jobsById: {
      "job-a": { id: "job-a", org_id: ORG_ID },
    },
    budgetLinesByJobCc: {
      // "job-a::cc-1" intentionally absent
    },
  });
  const result = await wi013MultiJobAllocation(
    {
      invoice_id: "inv-1",
      invoice_total_amount: 50_000,
      allocations: [
        { job_id: "job-a", cost_code_id: "cc-1", amount: 50_000 },
      ],
    },
    ctx,
  );
  assert.equal(result.ok, false);
  const codes = result.violations.map((v) => v.code);
  assert.ok(codes.includes("wi-013-allocation-cost-code-no-budget-line"));
});

test("combination of multiple violations → all surfaced", async () => {
  const ctx = baseCtx({
    jobsById: {
      "job-a": { id: "job-a", org_id: ORG_ID },
      "job-foreign": { id: "job-foreign", org_id: OTHER_ORG },
    },
    budgetLinesByJobCc: {
      // none — so both allocations with cost_code_id get no-budget-line
    },
  });
  const result = await wi013MultiJobAllocation(
    {
      invoice_id: "inv-1",
      invoice_total_amount: 100_000,
      allocations: [
        { job_id: "job-a", cost_code_id: "cc-1", amount: 30_000 },
        { job_id: "job-foreign", cost_code_id: "cc-2", amount: 40_000 },
        // 30 + 40 = 70 vs 100 → drift 30
      ],
    },
    ctx,
  );
  assert.equal(result.ok, false);
  const codes = result.violations.map((v) => v.code);
  // Sum drift + cross-tenant (job-foreign) + no budget line (job-a only;
  // job-foreign short-circuits before budget-line check).
  assert.ok(codes.includes("wi-013-allocation-sum-drift"));
  assert.ok(codes.includes("wi-013-allocation-cross-tenant"));
  assert.ok(codes.includes("wi-013-allocation-cost-code-no-budget-line"));
});

// ── runner ────────────────────────────────────────────────────────────

(async () => {
  let failed = 0;
  for (const c of cases) {
    try {
      await c.fn();
      console.log(`PASS  ${c.name}`);
    } catch (e) {
      failed++;
      console.log(`FAIL  ${c.name}`);
      console.log(`      ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  console.log("");
  if (failed > 0) {
    console.error(`${failed} of ${cases.length} test(s) failed`);
    process.exit(1);
  } else {
    console.log(`${cases.length} test(s) passed`);
  }
})();
