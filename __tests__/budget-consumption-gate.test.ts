/**
 * B2/Q8a — WI-L-4 over-budget gate on the unified allocation source.
 *
 * THE REQUIRED PROOF (Jake's B2 dispatch): "the gate must fire on identical
 * thresholds before/after on clean data (test it)". Clean data = an invoice
 * whose live allocations equal its coded line items (same codes, same cents,
 * header job) with budget lines resolved for every code — the state every
 * mono-job invoice reaches through the normal save flow. On that data the
 * OLD gate (line items summed per stored budget_line_id vs the
 * budget_lines.invoiced cache) and the NEW gate (3-tier live contribution vs
 * view-computed baseline) must make byte-identical decisions at the exact
 * cent boundary.
 *
 * Plus: per-job gating on split invoices, no-budget-line skip parity,
 * revised<=0 skip parity, and the unique-code→job attribution rule (00124).
 */
import {
  evaluateOverBudget,
  jobIdsFromContribution,
  type GateBudgetLine,
} from "../src/lib/invoices/over-budget";
import { scopeKey } from "../src/lib/invoices/balance-impact";
import { resolveAllocationJobForLine } from "../src/lib/cost-intelligence/allocation-job";

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

const JOB_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const JOB_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const CODE_1 = "05101";
const CODE_2 = "13101";

/** OLD gate formula (pre-B2, action/route.ts): per budget line the invoice's
 *  line items reference — fire when cache.invoiced + thisInvoice > revised
 *  (revised > 0). Reproduced here as the identity reference. */
function oldGateOverages(
  lineItemsByBL: Map<string, number>,
  cacheInvoicedByBL: Map<string, number>,
  revisedByBL: Map<string, number>
): Array<{ bl: string; overage: number }> {
  const out: Array<{ bl: string; overage: number }> = [];
  for (const [bl, thisInvoice] of lineItemsByBL) {
    const revised = revisedByBL.get(bl) ?? 0;
    const invoiced = cacheInvoicedByBL.get(bl) ?? 0;
    if (invoiced + thisInvoice > revised && revised > 0) {
      out.push({ bl, overage: invoiced + thisInvoice - revised });
    }
  }
  return out;
}

// ── 1. IDENTITY ON CLEAN DATA — exact cent boundary ────────────────────────
// Budget line (JOB_A, CODE_1): revised $10,000.00, other invoices consumed
// $9,000.00. This invoice allocates $1,000.00 to CODE_1.
//   boundary case: 9000_00 + 1000_00 == 10000_00 → NO fire on either gate.
//   +1¢ case:      this invoice 1000_01          → fire on BOTH, overage 1¢.
{
  const BL_ID = "bl-1";
  const revised = 1000000;
  const consumed = 900000;

  for (const [label, thisCents, shouldFire, expectedOverage] of [
    ["boundary (== revised)", 100000, false, 0],
    ["boundary +1¢", 100001, true, 1],
    ["deep overage", 250000, true, 150000],
  ] as Array<[string, number, boolean, number]>) {
    // OLD: line items resolved to BL_ID; cache fresh at `consumed`.
    const oldRes = oldGateOverages(
      new Map([[BL_ID, thisCents]]),
      new Map([[BL_ID, consumed]]),
      new Map([[BL_ID, revised]])
    );
    // NEW: allocations on (JOB_A, CODE_1); view baseline at `consumed`.
    const newRes = evaluateOverBudget(
      new Map([[scopeKey(JOB_A, CODE_1), thisCents]]),
      new Map([[scopeKey(JOB_A, CODE_1), consumed]]),
      new Map<string, GateBudgetLine>([
        [
          scopeKey(JOB_A, CODE_1),
          { budget_line_id: BL_ID, revised_estimate: revised, cost_code: CODE_1, description: null },
        ],
      ])
    );
    check(
      `identity ${label}: fire old=${oldRes.length > 0} == new=${newRes.length > 0} == ${shouldFire}`,
      (oldRes.length > 0) === shouldFire && (newRes.length > 0) === shouldFire
    );
    if (shouldFire) {
      check(
        `identity ${label}: overage cents old=${oldRes[0]?.overage} == new=${newRes[0]?.overage} == ${expectedOverage}`,
        oldRes[0]?.overage === expectedOverage && newRes[0]?.overage === expectedOverage
      );
      check(
        `identity ${label}: detail fields (baseline ${consumed}, this ${thisCents})`,
        newRes[0]?.currently_invoiced === consumed &&
          newRes[0]?.this_invoice_allocation === thisCents &&
          newRes[0]?.budget_line_id === BL_ID
      );
    }
  }
}

// ── 2. SPLIT INVOICE — each job's portion gates against ITS OWN budget line ─
{
  const contribution = new Map([
    [scopeKey(JOB_A, CODE_1), 60000], // $600 to job A / 05101
    [scopeKey(JOB_B, CODE_1), 40000], // $400 to job B / 05101 (same code!)
  ]);
  const baseline = new Map([
    [scopeKey(JOB_A, CODE_1), 950000], // A nearly full
    [scopeKey(JOB_B, CODE_1), 0],      // B empty
  ]);
  const budgetLines = new Map<string, GateBudgetLine>([
    [scopeKey(JOB_A, CODE_1), { budget_line_id: "bl-A", revised_estimate: 1000000, cost_code: CODE_1, description: null }],
    [scopeKey(JOB_B, CODE_1), { budget_line_id: "bl-B", revised_estimate: 1000000, cost_code: CODE_1, description: null }],
  ]);
  const res = evaluateOverBudget(contribution, baseline, budgetLines);
  check(
    "split: only job A's portion fires (A over by $100, B untouched)",
    res.length === 1 && res[0].budget_line_id === "bl-A" && res[0].overage === 10000,
    JSON.stringify(res)
  );
  check(
    "split: jobIdsFromContribution finds both jobs",
    jobIdsFromContribution(contribution).sort().join(",") === [JOB_A, JOB_B].sort().join(",")
  );
}

// ── 3. SKIP PARITY — no budget line / revised<=0 never gate (old NULL-bl skip) ─
{
  const res = evaluateOverBudget(
    new Map([
      [scopeKey(JOB_A, CODE_1), 500000], // no budget line for this scope
      [scopeKey(JOB_A, CODE_2), 500000], // budget line with revised 0
    ]),
    new Map(),
    new Map<string, GateBudgetLine>([
      [scopeKey(JOB_A, CODE_2), { budget_line_id: "bl-z", revised_estimate: 0, cost_code: CODE_2, description: null }],
    ])
  );
  check("skip parity: no-budget-line + revised<=0 scopes never fire", res.length === 0, JSON.stringify(res));
}

// ── 4. Unique-code→job attribution rule (00124 TS mirror) ──────────────────
{
  const allocs = [
    { job_id: JOB_A, cost_code_id: CODE_1 },
    { job_id: JOB_B, cost_code_id: CODE_2 },
  ];
  check("rule: unique code → that job", resolveAllocationJobForLine(CODE_2, JOB_A, allocs) === JOB_B);
  check("rule: header job when code has one alloc on header", resolveAllocationJobForLine(CODE_1, JOB_A, allocs) === JOB_A);
  const ambiguous = [
    { job_id: JOB_A, cost_code_id: CODE_1 },
    { job_id: JOB_B, cost_code_id: CODE_1 },
  ];
  check("rule: same code on two jobs → header fallback", resolveAllocationJobForLine(CODE_1, JOB_A, ambiguous) === JOB_A);
  check("rule: code absent from allocations → header", resolveAllocationJobForLine("99999", JOB_A, allocs) === JOB_A);
  check("rule: null line code → header", resolveAllocationJobForLine(null, JOB_A, allocs) === JOB_A);
  check("rule: mono-job invoice unchanged (all allocs header)", resolveAllocationJobForLine(CODE_1, JOB_A, [{ job_id: JOB_A, cost_code_id: CODE_1 }]) === JOB_A);
}

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nAll budget-consumption gate tests passed.");
