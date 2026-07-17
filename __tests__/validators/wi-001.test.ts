/**
 * Unit tests for `wi001InlineBudgetContext` validator.
 *
 * Per F1-Wave-B Plan B-1b — exercises the locked validator interface
 * contract from src/lib/knowledge-graph/types.ts via a stubbed
 * SupabaseClient (no real DB).
 *
 * Coverage:
 *   - happy: invoice with no cost_code_id → ok=true, violations=[]
 *   - violation: cost_code_id but no matching budget_line → ok=false
 *     with code wi-001-cost-code-no-budget-line
 *   - happy: invoice within budget → ok=true
 *   - violation: invoice that pushes over budget → ok=false with code
 *     wi-001-budget-line-overage + correct overage cents
 */
import { strict as assert } from "node:assert";
import { wi001InlineBudgetContext } from "../../src/lib/knowledge-graph/validators/wi-001-inline-budget-context";
import type { ValidatorContext } from "../../src/lib/knowledge-graph/types";
import type { InvoiceRow } from "../../src/lib/types";

type Case = { name: string; fn: () => Promise<void> };
const cases: Case[] = [];
const test = (name: string, fn: () => Promise<void>) =>
  cases.push({ name, fn });

// ── stub supabase client ──────────────────────────────────────────────
// The validator chains: .from(table).select(...).eq(...).eq(...).eq(...).is(...).maybeSingle()
// AND: .from("invoice_budget_consumption").select(...).eq(...).eq(...).eq(...).neq(...)
// (no maybeSingle on the consumption aggregation; returns array — B2/Q8a
// re-sourced the prior-total aggregation to the invoice_budget_consumption
// view per migration 00123)
//
// We stub a fluent builder that records the table name + final terminator
// (maybeSingle vs. await) and returns canned data based on `table` + `query`.

interface StubBuilder {
  select: (..._args: unknown[]) => StubBuilder;
  eq: (..._args: unknown[]) => StubBuilder;
  neq: (..._args: unknown[]) => StubBuilder;
  is: (..._args: unknown[]) => StubBuilder;
  in: (..._args: unknown[]) => StubBuilder;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
  then: (
    resolve: (v: { data: unknown; error: unknown }) => unknown,
    reject?: unknown,
  ) => unknown;
}

interface StubConfig {
  budgetLine?: { id: string; revised_estimate: number | null } | null;
  budgetLineError?: { message: string } | null;
  priorConsumption?: Array<{ amount_cents: number | null }>;
  priorConsumptionError?: { message: string } | null;
}

function makeStubClient(cfg: StubConfig): ValidatorContext["supabase"] {
  return {
    from(table: string): StubBuilder {
      // Inline state on the per-query chain
      const isBudgetLines = table === "budget_lines";
      const isConsumption = table === "invoice_budget_consumption";
      const builder: StubBuilder = {
        select: () => builder,
        eq: () => builder,
        neq: () => builder,
        is: () => builder,
        in: () => builder,
        maybeSingle: async () => {
          if (isBudgetLines) {
            return {
              data: cfg.budgetLine ?? null,
              error: cfg.budgetLineError ?? null,
            };
          }
          return { data: null, error: null };
        },
        then(resolve) {
          // Aggregation path (no maybeSingle) — applies only to the
          // invoice_budget_consumption view read
          if (isConsumption) {
            return Promise.resolve({
              data: cfg.priorConsumption ?? [],
              error: cfg.priorConsumptionError ?? null,
            }).then(resolve);
          }
          return Promise.resolve({ data: null, error: null }).then(resolve);
        },
      };
      return builder;
    },
    // The validator only touches .from(); everything else is unused.
    // Cast happens at the call site (we are returning a shape-compatible
    // stub for the test, not a full SupabaseClient).
  } as unknown as ValidatorContext["supabase"];
}

const ORG_ID = "00000000-0000-0000-0000-fb1ce0a55e55"; // fixture-harness-org

function mkInvoice(overrides: Partial<InvoiceRow>): InvoiceRow {
  return {
    id: "inv-001",
    org_id: ORG_ID,
    job_id: "job-001",
    cost_code_id: "cc-001",
    total_amount: 100_000, // $1,000.00
    status: "pm_review",
    deleted_at: null,
    ...overrides,
  } as InvoiceRow;
}

// ── tests ─────────────────────────────────────────────────────────────

test("invoice with no cost_code_id → ok=true (early return)", async () => {
  const ctx: ValidatorContext = {
    supabase: makeStubClient({}),
    org_id: ORG_ID,
    user_id: null,
  };
  const result = await wi001InlineBudgetContext(
    mkInvoice({ cost_code_id: null }),
    ctx,
  );
  assert.equal(result.ok, true);
  assert.equal(result.violations.length, 0);
});

test("invoice with no job_id → ok=true (early return)", async () => {
  const ctx: ValidatorContext = {
    supabase: makeStubClient({}),
    org_id: ORG_ID,
    user_id: null,
  };
  const result = await wi001InlineBudgetContext(
    mkInvoice({ job_id: null }),
    ctx,
  );
  assert.equal(result.ok, true);
  assert.equal(result.violations.length, 0);
});

test("cost_code_id with no matching budget_line → wi-001-cost-code-no-budget-line", async () => {
  const ctx: ValidatorContext = {
    supabase: makeStubClient({ budgetLine: null }),
    org_id: ORG_ID,
    user_id: null,
  };
  const result = await wi001InlineBudgetContext(mkInvoice({}), ctx);
  assert.equal(result.ok, false);
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].code, "wi-001-cost-code-no-budget-line");
});

test("invoice within budget → ok=true", async () => {
  const ctx: ValidatorContext = {
    supabase: makeStubClient({
      budgetLine: { id: "bl-001", revised_estimate: 500_000 }, // $5,000 budget
      priorConsumption: [{ amount_cents: 200_000 }], // $2,000 already booked
    }),
    org_id: ORG_ID,
    user_id: null,
  };
  // $1,000 invoice + $2,000 prior = $3,000 vs $5,000 budget → under budget
  const result = await wi001InlineBudgetContext(mkInvoice({}), ctx);
  assert.equal(result.ok, true);
  assert.equal(result.violations.length, 0);
});

test("invoice that pushes over budget → wi-001-budget-line-overage with correct overage", async () => {
  const ctx: ValidatorContext = {
    supabase: makeStubClient({
      budgetLine: { id: "bl-001", revised_estimate: 250_000 }, // $2,500 budget
      priorConsumption: [{ amount_cents: 200_000 }], // $2,000 already booked
    }),
    org_id: ORG_ID,
    user_id: null,
  };
  // $1,000 invoice + $2,000 prior = $3,000 vs $2,500 → overage = $500 = 50000 cents
  const result = await wi001InlineBudgetContext(mkInvoice({}), ctx);
  assert.equal(result.ok, false);
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].code, "wi-001-budget-line-overage");
  const evidence = result.violations[0].evidence as { overage: number };
  assert.equal(evidence.overage, 50_000);
});

test("budget_line revised_estimate null → no overage check", async () => {
  const ctx: ValidatorContext = {
    supabase: makeStubClient({
      budgetLine: { id: "bl-001", revised_estimate: null },
      priorConsumption: [],
    }),
    org_id: ORG_ID,
    user_id: null,
  };
  const result = await wi001InlineBudgetContext(mkInvoice({}), ctx);
  assert.equal(result.ok, true);
  assert.equal(result.violations.length, 0);
});

// ── F1-Wave-B Slice-2 B-4 Task 8 F-K carry-forward (per nwrp172) ──────
// Pre-pass NaN/Infinity check on invoice.total_amount. Without the guard,
// NaN silently bypasses the budget-overage check (NaN > x is false;
// NaN + x is NaN). Validator must emit wi-001-invoice-amount-not-finite
// + return early so downstream computation operates only on valid input.

test("invoice total_amount = NaN → wi-001-invoice-amount-not-finite (early return)", async () => {
  const ctx: ValidatorContext = {
    supabase: makeStubClient({}),
    org_id: ORG_ID,
    user_id: null,
  };
  const result = await wi001InlineBudgetContext(
    mkInvoice({ total_amount: Number.NaN }),
    ctx,
  );
  assert.equal(result.ok, false);
  const codes = result.violations.map((v) => v.code);
  assert.ok(
    codes.includes("wi-001-invoice-amount-not-finite"),
    `expected wi-001-invoice-amount-not-finite in [${codes.join(", ")}]`,
  );
  // Early-return contract: NO downstream violations emitted (the validator
  // SHORT-CIRCUITS rather than running the budget-line lookup with NaN).
  // We assert the violation is the ONLY one emitted to lock in the
  // early-return semantics.
  assert.equal(result.violations.length, 1, "early-return should emit ONLY the not-finite violation");
});

test("invoice total_amount = Infinity → wi-001-invoice-amount-not-finite (early return)", async () => {
  const ctx: ValidatorContext = {
    supabase: makeStubClient({}),
    org_id: ORG_ID,
    user_id: null,
  };
  const result = await wi001InlineBudgetContext(
    mkInvoice({ total_amount: Number.POSITIVE_INFINITY }),
    ctx,
  );
  assert.equal(result.ok, false);
  const codes = result.violations.map((v) => v.code);
  assert.ok(
    codes.includes("wi-001-invoice-amount-not-finite"),
    `expected wi-001-invoice-amount-not-finite in [${codes.join(", ")}]`,
  );
  assert.equal(result.violations.length, 1, "early-return should emit ONLY the not-finite violation");
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
