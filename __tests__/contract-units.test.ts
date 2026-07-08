/**
 * Job-settings unit transforms — display<->store round-trip correctness.
 * The whole point: a stored fraction (0.30) must survive display (30%) and
 * save (0.30) WITHOUT becoming 0.3% or 3000%. Also guards the money and
 * whole-percent (retainage) boundaries, and the contract-type labels.
 */
import {
  centsToDollars,
  dollarsToCents,
  fractionToPercent,
  percentToFraction,
  wholePercent,
  formatDollars,
  contractTypeLabel,
  CONTRACT_TYPE_OPTIONS,
} from "../src/lib/jobs/contract-units";

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

// ---- FRACTION-scale percents (deposit_percentage, gc_fee_percentage) ----
// The 3000× hazard case, stated explicitly.
check("fraction 0.30 -> display 30", fractionToPercent(0.3) === 30);
check("percent 30 -> store 0.30", percentToFraction(30) === 0.3);
check(
  "ROUND TRIP: 0.30 store -> 30% -> 0.30 store (not 0.003, not 3000)",
  percentToFraction(fractionToPercent(0.3)) === 0.3
);
check("percent 30 does NOT store as 30 (would be 3000%)", percentToFraction(30) !== 30);
check("default deposit 0.10 -> 10%", fractionToPercent(0.1) === 10);
check("default gc 0.20 -> 20%", fractionToPercent(0.2) === 20);
check("percent string '18.5' -> 0.185", percentToFraction("18.5") === 0.185);
check("empty percent string -> 0", percentToFraction("") === 0);

// ---- WHOLE-scale percent (retainage_percent) — identity, NOT /100 ----
check("retainage 30 stays 30 (whole scale)", wholePercent(30) === 30);
check("retainage string '10' -> 10", wholePercent("10") === 10);
check(
  "retainage is NOT routed through the fraction transform",
  wholePercent(30) !== percentToFraction(30)
);

// ---- Money (cents <-> dollars) ----
check("245000000 cents -> 2,450,000 dollars", centsToDollars(245000000) === 2450000);
check("$2,450,000 -> 245000000 cents", dollarsToCents(2450000) === 245000000);
check(
  "ROUND TRIP: 245000000 cents -> dollars -> cents",
  dollarsToCents(centsToDollars(245000000)) === 245000000
);
check("dollars string '13563.00' -> 1356300 cents", dollarsToCents("13563.00") === 1356300);
check("fractional-cent input rounds ($100.005 -> 10001)", dollarsToCents(100.005) === 10001);
check("formatDollars(245000000) -> currency", formatDollars(245000000) === "$2,450,000.00");

// ---- Contract-type labels ----
check("cost_plus_open_book gets a human label", contractTypeLabel("cost_plus_open_book") === "Cost-Plus — Open Book");
check("unknown value falls back to raw string", contractTypeLabel("weird_new_type") === "weird_new_type");
check("null -> em dash", contractTypeLabel(null) === "—");
check("all 6 contract types have options", CONTRACT_TYPE_OPTIONS.length === 6);
check(
  "no option label is a raw enum value",
  CONTRACT_TYPE_OPTIONS.every((o) => o.label !== o.value)
);

console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
