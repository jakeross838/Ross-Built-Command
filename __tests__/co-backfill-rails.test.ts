/**
 * F6-family (nwrp286) — 72-CO backfill RAILS pure logic. The DB propagation
 * (insert lines on an approved CO -> co_adjustments moves to Σ lines) is
 * separately proven cent-exact against the live trigger via a rolled-back
 * fixture-org transaction; these tests pin the rails' DECISION logic:
 * validate-all-then-insert, idempotency, org-guard, row shaping.
 */
import {
  RB_ORG_ID,
  assertSafeOrg,
  validateAllocation,
  idempotencyDecision,
  shapeLineRows,
  planBackfill,
} from "../scripts/backfill/co-line-allocation.mjs";

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

const FIXTURE_ORG = "00000000-0000-0000-0000-fb1ce0a55e55";
const co = (amount: number) => ({ id: "co-1", org_id: FIXTURE_ORG, job_id: "job-1", amount, status: "approved" });

// assertSafeOrg
{
  let threw = false;
  try { assertSafeOrg(RB_ORG_ID); } catch { threw = true; }
  check("assertSafeOrg throws for Ross Built without override", threw);
  let threw2 = false;
  try { assertSafeOrg(FIXTURE_ORG); } catch { threw2 = true; }
  check("assertSafeOrg allows fixture org", !threw2);
  let threw3 = false;
  try { assertSafeOrg(RB_ORG_ID, { allowProduction: true }); } catch { threw3 = true; }
  check("assertSafeOrg allows RB with explicit override", !threw3);
}

// validateAllocation
{
  check("Σ == amount, all allocated → ok", validateAllocation(co(250000), [
    { budget_line_id: "b1", amount: 150000 }, { budget_line_id: "b2", amount: 100000 },
  ]).ok === true);
  check("Σ != amount → error", validateAllocation(co(250000), [{ budget_line_id: "b1", amount: 240000 }]).ok === false);
  check("missing budget_line_id → error", validateAllocation(co(100000), [{ budget_line_id: null, amount: 100000 }]).ok === false);
  check("empty allocations → error", validateAllocation(co(100000), []).ok === false);
  check("non-integer cents → error", validateAllocation(co(100000), [{ budget_line_id: "b1", amount: 100000.5 }]).ok === false);
}

// idempotencyDecision
{
  check("no existing lines → insert", idempotencyDecision(co(1), 0).action === "insert");
  check("existing lines, no reallocate → skip", idempotencyDecision(co(1), 3).action === "skip");
  check("existing lines + reallocate → reallocate", idempotencyDecision(co(1), 3, { reallocate: true }).action === "reallocate");
}

// shapeLineRows
{
  const rows = shapeLineRows(co(250000), [
    { budget_line_id: "b1", amount: 150000, description: "A" },
    { budget_line_id: "b2", amount: 100000 },
  ]);
  check("shapeLineRows carries org/co/budget_line/amount + sort_order", rows.length === 2 &&
    rows[0].org_id === FIXTURE_ORG && rows[0].co_id === "co-1" && rows[0].budget_line_id === "b1" &&
    rows[0].amount === 150000 && rows[0].sort_order === 0 && rows[1].sort_order === 1);
}

// planBackfill — validate-ALL-then-insert: one bad CO doesn't let others proceed silently
{
  const cos = [
    { id: "co-ok", org_id: FIXTURE_ORG, job_id: "j", amount: 100000, status: "approved" },
    { id: "co-bad", org_id: FIXTURE_ORG, job_id: "j", amount: 100000, status: "approved" },
  ];
  const mapping = {
    "co-ok": [{ budget_line_id: "b1", amount: 100000 }],
    "co-bad": [{ budget_line_id: "b2", amount: 90000 }], // sum mismatch
  };
  const { plan, errors } = planBackfill(cos, mapping, {});
  check("planBackfill collects the mismatch error", errors.length === 1 && /co-bad/.test(errors[0]));
  check("planBackfill returns EMPTY plan when ANY CO is invalid (structural no-partial)", plan.length === 0);
}

// planBackfill — idempotency reflected in plan
{
  const cos = [{ id: "co-x", org_id: FIXTURE_ORG, job_id: "j", amount: 50000, status: "approved" }];
  const mapping = { "co-x": [{ budget_line_id: "b1", amount: 50000 }] };
  const skipPlan = planBackfill(cos, mapping, { "co-x": 2 }).plan;
  check("planBackfill marks already-allocated CO as skip", skipPlan[0].action === "skip" && skipPlan[0].rows.length === 0);
  const reallocPlan = planBackfill(cos, mapping, { "co-x": 2 }, { reallocate: true }).plan;
  check("planBackfill marks reallocate when flagged", reallocPlan[0].action === "reallocate" && reallocPlan[0].rows.length === 1);
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
