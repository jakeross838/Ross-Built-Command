/**
 * 00122 MULTI-JOB SPLIT — permanent invariant fence (B1 of the massive run).
 *
 * Pins the pure algebra of the split model:
 *   1. PORTION CONSERVATION — a split invoice's per-job portions land on each
 *      job's G702 exactly once and Σ(portions) ≡ invoice total, cent-exact,
 *      through the REAL rollupDrawTotals (both draw surfaces compute through
 *      it, so pinning the algebra pins both).
 *   2. SPLIT ⇒ UNCAPTURED 0 — a fully-allocated split invoice contributes
 *      zero uncaptured dollars to either job's line 8 (the 00122 DB trigger
 *      enforces full allocation; the engine filter excludes split invoices
 *      from the uncaptured working set — the G702 identity is asserted here
 *      with uncaptured=0 on both sides).
 *   3. SCOPE KEYS — scopeKey/parseScopeKey round-trip and multi-job
 *      computeImpactRows keep per-(job, code) scopes distinct (same code on
 *      two jobs never merges) while remaining byte-identical to the legacy
 *      behavior for mono-job keys.
 *
 * Runner idiom mirrors draw-block-b-invariant.test.ts (case array + summary).
 */
import { strict as assert } from "node:assert";
import { rollupDrawTotals, type DrawLineSnapshot } from "@/lib/draw-calc";
import {
  computeImpactRows,
  scopeKey,
  parseScopeKey,
  type CodeBaseline,
} from "@/lib/invoices/balance-impact";

type Case = { name: string; fn: () => void };
const cases: Case[] = [];
const test = (name: string, fn: () => void) => cases.push({ name, fn });

function line(
  cost_code_id: string,
  previous_applications: number,
  this_period: number,
  retainagePct = 0
): DrawLineSnapshot {
  const total_completed = previous_applications + this_period;
  return {
    cost_code_id,
    scheduled_value: total_completed,
    previous_applications,
    this_period,
    total_completed,
    retainage: Math.round(total_completed * (retainagePct / 100)),
    balance_to_finish: 0,
    percent_complete: total_completed > 0 ? 100 : 0,
  };
}

/** Roll one single-line draw with no deposit/adjustment noise. */
function rollSimple(thisPeriod: number, retainagePercent = 0) {
  return rollupDrawTotals({
    originalContractSum: 100_000_00,
    netChangeOrders: 0,
    depositPercentage: 0,
    retainagePercent,
    lines: [line("cc-1", 0, thisPeriod, retainagePercent)],
    lessPreviousCertificates: 0,
    isFinalDraw: false,
    nonBudgetLineThisPeriod: 0,
    previousCoCompletedAmount: 0,
    depositAppliedCents: 0,
    appliedAdjustmentsCents: 0,
    uncapturedLinkedCents: 0, // split invoice: fully allocated ⇒ 0 (invariant 2)
  });
}

// ── 1. Portion conservation across two jobs ───────────────────────────────

test("split $10,000 into $6,000(A) + $4,000(B): per-draw line 8s sum to the invoice total (no retainage)", () => {
  const INVOICE_TOTAL = 10_000_00;
  const portionA = 6_000_00;
  const portionB = INVOICE_TOTAL - portionA;

  const drawA = rollSimple(portionA);
  const drawB = rollSimple(portionB);

  assert.equal(drawA.current_payment_due, portionA, "draw A pays exactly its portion");
  assert.equal(drawB.current_payment_due, portionB, "draw B pays exactly its portion");
  assert.equal(
    drawA.current_payment_due + drawB.current_payment_due,
    INVOICE_TOTAL,
    "portions conserve the invoice total cent-exact"
  );
});

test("odd-cent split ($100.01 → $33.34 + $66.67) conserves every cent", () => {
  const INVOICE_TOTAL = 100_01;
  const portionA = 33_34;
  const portionB = INVOICE_TOTAL - portionA; // 66_67

  const drawA = rollSimple(portionA);
  const drawB = rollSimple(portionB);
  assert.equal(drawA.current_payment_due + drawB.current_payment_due, INVOICE_TOTAL);
});

test("retainage applies per-draw on the portion, not the invoice total", () => {
  const portionA = 6_000_00;
  const portionB = 4_000_00;
  const RET = 10;

  const drawA = rollSimple(portionA, RET);
  const drawB = rollSimple(portionB, RET);

  assert.equal(drawA.total_retainage, Math.round(portionA * 0.1), "A withholds 10% of ITS portion");
  assert.equal(drawB.total_retainage, Math.round(portionB * 0.1), "B withholds 10% of ITS portion");
  // Earned-less-retainage identity survives the split.
  assert.equal(
    drawA.current_payment_due + drawB.current_payment_due,
    portionA + portionB - Math.round(portionA * 0.1) - Math.round(portionB * 0.1),
    "combined pay = combined portions − combined per-portion retainage"
  );
});

// ── 2. Split ⇒ uncaptured 0 (line 8 unpolluted on both sides) ─────────────

test("split invoice adds ZERO uncaptured on either job (line 8 = G703 math alone)", () => {
  const portionA = 6_000_00;
  // Identical rollups with and without an uncaptured term prove the split
  // invoice's line 8 carries no cross-job spill: the engine passes 0 for
  // split invoices (fully-allocated by the 00122 trigger).
  const withZero = rollSimple(portionA);
  const withSpill = rollupDrawTotals({
    originalContractSum: 100_000_00,
    netChangeOrders: 0,
    depositPercentage: 0,
    retainagePercent: 0,
    lines: [line("cc-1", 0, portionA)],
    lessPreviousCertificates: 0,
    isFinalDraw: false,
    nonBudgetLineThisPeriod: 0,
    previousCoCompletedAmount: 0,
    depositAppliedCents: 0,
    appliedAdjustmentsCents: 0,
    uncapturedLinkedCents: 4_000_00, // what the OLD engine would have leaked (job B's portion)
  });
  assert.equal(withZero.current_payment_due, portionA);
  assert.equal(
    withSpill.current_payment_due - withZero.current_payment_due,
    4_000_00,
    "sanity: an uncaptured leak WOULD have billed job A for job B's $4,000 — the 00122 filter prevents exactly this"
  );
});

// ── 3. Scope keys + per-(job, code) strip math ─────────────────────────────

test("scopeKey/parseScopeKey round-trip (uuid-shaped ids)", () => {
  const j = "0cef246b-cd5f-4dbb-b28a-d00ef034cfac";
  const c = "52912ec0-cebf-4422-98c4-d26daca36d1d";
  const key = scopeKey(j, c);
  assert.deepEqual(parseScopeKey(key), { jobId: j, costCodeId: c });
});

test("parseScopeKey tolerates legacy plain-code keys (no job segment)", () => {
  assert.deepEqual(parseScopeKey("cc-plain"), { jobId: "", costCodeId: "cc-plain" });
});

test("same cost code on two jobs stays TWO distinct impact scopes", () => {
  const jobA = "job-a";
  const jobB = "job-b";
  const code = "cc-05101";
  const kA = scopeKey(jobA, code);
  const kB = scopeKey(jobB, code);

  const baselines: Record<string, CodeBaseline> = {
    [kA]: { scope: "budget", scopeTotalCents: 500_00, baselineCents: 0 },
    [kB]: { scope: "budget", scopeTotalCents: 10_000_00, baselineCents: 0 },
  };
  const rows = computeImpactRows(
    [kA, kB],
    { [kA]: 950_00, [kB]: 950_00 },
    baselines
  );
  assert.equal(rows.length, 2, "one impact row per (job, code)");
  assert.equal(rows[0].tone, "over", "job A's $500 budget is $450 over");
  assert.equal(rows[0].afterCents, -450_00);
  assert.equal(rows[1].tone, "ink", "job B's $10,000 budget remains comfortable");
  assert.equal(rows[1].afterCents, 9_050_00);
});

test("mono-job composite keys reproduce legacy plain-key math byte-identically", () => {
  const code = "cc-legacy";
  const base: CodeBaseline = { scope: "budget", scopeTotalCents: 4_000_00, baselineCents: 1_000_00 };
  const legacy = computeImpactRows([code], { [code]: 500_00 }, { [code]: base });
  const composite = computeImpactRows(
    [scopeKey("job-x", code)],
    { [scopeKey("job-x", code)]: 500_00 },
    { [scopeKey("job-x", code)]: base }
  );
  assert.equal(legacy[0].afterCents, composite[0].afterCents);
  assert.equal(legacy[0].tone, composite[0].tone);
  assert.equal(legacy[0].afterLabel, composite[0].afterLabel);
});

// ── runner ────────────────────────────────────────────────────────────────

let failed = 0;
for (const c of cases) {
  try {
    c.fn();
    console.log(`PASS  ${c.name}`);
  } catch (e) {
    failed++;
    console.error(`FAIL  ${c.name}`);
    console.error(`      ${(e as Error).message}`);
  }
}
if (failed > 0) {
  console.error(`${failed} of ${cases.length} test(s) failed`);
  process.exit(1);
}
console.log(`all ${cases.length} tests passed`);
