/**
 * BLOCK B — permanent invariant fence for the draw money engine.
 *
 * Standing invariant (Jake): the G702 bottom line ties out, cent-exact, from
 * the G703 lines + adjustments − deposit applied, on every draw and both
 * renderers. Both renderers (the pay-app `_data.ts` loader and the
 * `/api/draws/[id]` route) compute their numbers through the SAME pure
 * `rollupDrawTotals`, so pinning the engine's algebra here pins the invariant
 * for both surfaces. Behavioral (executes the real function), not a source
 * regex — so any future formula drift fails loudly.
 *
 * Covers 1.6 (deposit reduces line 8 only) + 1.2 (applied adjustments, signed,
 * reduce line 8 only) + the completion identity that backs the 1.3 G703 union.
 */
import { strict as assert } from "node:assert";
import { rollupDrawTotals, type DrawLineSnapshot } from "@/lib/draw-calc";

type Case = { name: string; fn: () => void };
const cases: Case[] = [];
const test = (name: string, fn: () => void) => cases.push({ name, fn });

function line(
  cost_code_id: string,
  previous_applications: number,
  this_period: number
): DrawLineSnapshot {
  const total_completed = previous_applications + this_period;
  return {
    cost_code_id,
    scheduled_value: total_completed,
    previous_applications,
    this_period,
    total_completed,
    retainage: 0,
    balance_to_finish: 0,
    percent_complete: 100,
  };
}

// Shared fixture: two G703 lines + non-budget + prior-CO completed.
const LINES = [line("cc-a", 90000, 60000), line("cc-b", 30000, 20000)]; // totals 150000, 50000
const NON_BUDGET = 5000;
const PREV_CO = 10000;
const RETAINAGE_PCT = 10; // withhold 10%
const LESS_PREV_CERTS = 40000;

const base = {
  originalContractSum: 5_000_000,
  netChangeOrders: 0,
  depositPercentage: 0.1,
  retainagePercent: RETAINAGE_PCT,
  lines: LINES,
  lessPreviousCertificates: LESS_PREV_CERTS,
  isFinalDraw: false,
  nonBudgetLineThisPeriod: NON_BUDGET,
  previousCoCompletedAmount: PREV_CO,
  uncapturedLinkedCents: 0,
};

// Expected intermediate math (recomputed here so a formula change is caught).
const EXPECTED_TOTAL_COMPLETED = 150000 + 50000 + NON_BUDGET + PREV_CO; // 215000
const EXPECTED_RETAINAGE = Math.round(EXPECTED_TOTAL_COMPLETED * 0.1); // 21500
const EXPECTED_EARNED_LESS_RET = EXPECTED_TOTAL_COMPLETED - EXPECTED_RETAINAGE; // 193500

// ── completion identity (backs the 1.3 G703 union) ────────────────────────

test("total_completed_to_date = Σ(line totals) + non-budget + prior-CO (cent-exact)", () => {
  const t = rollupDrawTotals({ ...base, depositAppliedCents: 0, appliedAdjustmentsCents: 0 });
  const sumLines = LINES.reduce((s, l) => s + l.total_completed, 0);
  assert.equal(t.total_completed_to_date, sumLines + NON_BUDGET + PREV_CO);
  assert.equal(t.total_completed_to_date, EXPECTED_TOTAL_COMPLETED);
});

// ── baseline: no deposit, no adjustments ──────────────────────────────────

test("current_payment_due (no deposit/adjustments) = earned-less-retainage − prev certs", () => {
  const t = rollupDrawTotals({ ...base, depositAppliedCents: 0, appliedAdjustmentsCents: 0 });
  assert.equal(t.total_earned_less_retainage, EXPECTED_EARNED_LESS_RET);
  assert.equal(t.current_payment_due, EXPECTED_EARNED_LESS_RET - LESS_PREV_CERTS); // 153500
  assert.equal(t.deposit_applied, 0);
  assert.equal(t.applied_adjustments, 0);
});

// ── 1.6 deposit: reduces line 8 ONLY ──────────────────────────────────────

test("deposit applied reduces current_payment_due by exactly the deposit", () => {
  const deposit = 25000;
  const t0 = rollupDrawTotals({ ...base, depositAppliedCents: 0, appliedAdjustmentsCents: 0 });
  const t = rollupDrawTotals({ ...base, depositAppliedCents: deposit, appliedAdjustmentsCents: 0 });
  assert.equal(t.current_payment_due, t0.current_payment_due - deposit);
  assert.equal(t.deposit_applied, deposit);
  // deposit is payment-level only — completion / retainage / balance unchanged.
  assert.equal(t.total_completed_to_date, t0.total_completed_to_date);
  assert.equal(t.total_retainage, t0.total_retainage);
  assert.equal(t.balance_to_finish, t0.balance_to_finish);
});

// ── 1.2 adjustments: signed, reduce line 8 ONLY ───────────────────────────

test("negative adjustment (credit) reduces current_payment_due; positive increases", () => {
  const t0 = rollupDrawTotals({ ...base, depositAppliedCents: 0, appliedAdjustmentsCents: 0 });
  const credit = rollupDrawTotals({ ...base, depositAppliedCents: 0, appliedAdjustmentsCents: -3000 });
  const upward = rollupDrawTotals({ ...base, depositAppliedCents: 0, appliedAdjustmentsCents: 1500 });
  assert.equal(credit.current_payment_due, t0.current_payment_due - 3000);
  assert.equal(upward.current_payment_due, t0.current_payment_due + 1500);
  assert.equal(credit.applied_adjustments, -3000);
  // adjustments are payment-level only.
  assert.equal(credit.total_completed_to_date, t0.total_completed_to_date);
  assert.equal(credit.balance_to_finish, t0.balance_to_finish);
});

// ── combined invariant, cent-exact ────────────────────────────────────────

test("INVARIANT: current_payment_due = earned-less-retainage − prev certs − deposit + adjustments", () => {
  const deposit = 25000;
  const adjustments = -3000; // a credit
  const t = rollupDrawTotals({
    ...base,
    depositAppliedCents: deposit,
    appliedAdjustmentsCents: adjustments,
  });
  const expected =
    t.total_earned_less_retainage - t.less_previous_certificates - deposit + adjustments;
  assert.equal(t.current_payment_due, expected);
  assert.equal(t.current_payment_due, EXPECTED_EARNED_LESS_RET - LESS_PREV_CERTS - 25000 - 3000); // 125500
  assert.equal(t.deposit_applied, deposit);
  assert.equal(t.applied_adjustments, adjustments);
});

// ── HANDOFF #2 — uncaptured linked-invoice (credit memo) fix ────────────────

test("uncaptured linked invoice (uncoded −$640 credit) reduces current_payment_due, line 8 only", () => {
  const t0 = rollupDrawTotals({ ...base, depositAppliedCents: 0, appliedAdjustmentsCents: 0 });
  const t = rollupDrawTotals({
    ...base,
    depositAppliedCents: 0,
    appliedAdjustmentsCents: 0,
    uncapturedLinkedCents: -64_000, // −$640.00
  });
  assert.equal(t.current_payment_due, t0.current_payment_due - 64_000);
  assert.equal(t.uncaptured_linked, -64_000);
  // Payment-level only — completion / retainage / balance unchanged.
  assert.equal(t.total_completed_to_date, t0.total_completed_to_date);
  assert.equal(t.balance_to_finish, t0.balance_to_finish);
});

test("HANDOFF #2 linkage: captured(G703) + uncaptured ≡ Σ(linked totals); a −$640 credit is never dropped", () => {
  // draw-#1 fixture shape (cents): two coded invoices land on the G703
  // (drywall $11,498 split 19101+15102, framing $14,750) = 2,624,800 captured;
  // one fully-uncoded −$640 credit memo = −64,000 uncaptured.
  const captured = 2_624_800; // Σ(G703 this-period)
  const uncaptured = -64_000; // −$640, no cost code
  const linkedTotal = 2_560_800; // Σ(every linked invoice total) = 11,498 − 640 + 14,750
  // Every linked dollar accounted — nothing contributes $0.
  assert.equal(captured + uncaptured, linkedTotal);
  assert.notEqual(uncaptured, 0);
  // And the engine routes uncaptured into line 8 (not the floor).
  const t0 = rollupDrawTotals({ ...base, depositAppliedCents: 0, appliedAdjustmentsCents: 0 });
  const t = rollupDrawTotals({
    ...base,
    depositAppliedCents: 0,
    appliedAdjustmentsCents: 0,
    uncapturedLinkedCents: uncaptured,
  });
  assert.equal(t.current_payment_due, t0.current_payment_due + uncaptured);
});

// ── NEW-2 — carry-forward invariant ────────────────────────────────────────
// G702 line 7 (less previous certificates) MUST sum the CANONICAL current-
// payment-due of each prior non-void draw — the value the prior draw's own
// detail/print render (snapshot for issued draws, else recompute) — NOT the
// stale stored draws.current_payment_due column, which draw_submit_rpc never
// refreshes. Pinned as pure engine algebra (same pattern as the linkage test):
// the wiring in lessPreviousCertificatesForJob is exercised by the live fixture
// verify, but the algebra is pinned here so a formula/definition drift fails.

test("NEW-2 carry-forward: line 7 ≡ Σ canonical prior current-payment-due; a prior credit flows through, cent-exact (stale stored would be off by the credit)", () => {
  // Draw #1 (prior) — Sample-B fixture shape: Σ this-period 2,624,800 (→ earned-
  // less-retainage 2,362,320 at 10%) with a −$640 uncoded credit memo.
  const draw1 = {
    originalContractSum: 50_000_000,
    netChangeOrders: 0,
    depositPercentage: 0.3,
    retainagePercent: 10,
    lines: [line("cc-dry", 0, 2_624_800)],
    lessPreviousCertificates: 0, // draw #1 has no priors
    isFinalDraw: false,
    nonBudgetLineThisPeriod: 0,
    previousCoCompletedAmount: 0,
    depositAppliedCents: 0,
    appliedAdjustmentsCents: 0,
  };
  const draw1Canonical = rollupDrawTotals({ ...draw1, uncapturedLinkedCents: -64_000 });
  const draw1StaleStored = rollupDrawTotals({ ...draw1, uncapturedLinkedCents: 0 });
  assert.equal(draw1Canonical.current_payment_due, 2_298_320); // $22,983.20 — credit applied
  assert.equal(draw1StaleStored.current_payment_due, 2_362_320); // $23,623.20 — the stale column
  assert.equal(draw1StaleStored.current_payment_due - draw1Canonical.current_payment_due, 64_000);

  // Draw #2 (carry-forward). line 7 sourced from the CANONICAL prior value.
  const draw2 = {
    ...draw1,
    lines: [line("cc-dry", 2_624_800, 500_000)],
    uncapturedLinkedCents: 0,
  };
  const draw2Canonical = rollupDrawTotals({
    ...draw2,
    lessPreviousCertificates: draw1Canonical.current_payment_due,
  });
  const draw2FromStale = rollupDrawTotals({
    ...draw2,
    lessPreviousCertificates: draw1StaleStored.current_payment_due,
  });
  // The invariant, stated directly: line 7 == the prior draw's canonical cpd.
  assert.equal(draw2Canonical.less_previous_certificates, draw1Canonical.current_payment_due);
  // Sourcing the stale stored value overstates line 7 by the credit, so it
  // understates draw #2's payment due by exactly $640.
  assert.equal(draw2FromStale.current_payment_due, draw2Canonical.current_payment_due - 64_000);
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
