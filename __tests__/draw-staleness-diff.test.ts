/**
 * F6-family (nwrp286 Q3) — draw staleness diff. Pure integer-cents compare.
 * Each included field must be able to FLIP the result true (no dead fields —
 * plan-review CRITICAL). original_contract_sum / contract_sum_to_date are
 * intentionally NOT in the field set (pass-through in rollupDrawTotals), so
 * they are not tested here — that exclusion IS the fix.
 */
import {
  computeDrawStaleness,
  DRAW_STALE_KEYS,
  type DrawStaleFields,
} from "../src/lib/draw-staleness";

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

const base: DrawStaleFields = {
  net_change_orders: 89714339,
  total_completed_to_date: 5000000,
  current_payment_due: 1200000,
  balance_to_finish: 3000000,
  deposit_amount: 750000,
};

// Identical → not stale.
check("identical stored/recomputed → not stale", computeDrawStaleness(base, { ...base }) === false);

// Each field, diverged by 1¢ → stale (proves no dead fields).
for (const k of DRAW_STALE_KEYS) {
  const recomputed = { ...base, [k]: base[k] + 1 };
  check(`diverging ${k} by 1¢ → stale`, computeDrawStaleness(base, recomputed) === true);
}

// The phase-relevant case: a CO approved after the draft was written →
// recomputed net_change_orders larger than stored → stale.
check(
  "CO approved post-draft (net_change_orders grew) → stale",
  computeDrawStaleness(base, { ...base, net_change_orders: base.net_change_orders + 30000000 }) === true
);

// Field count guard — exactly 5 fields (the pass-throughs are excluded).
check("diff covers exactly the 5 source-derived fields", DRAW_STALE_KEYS.length === 5 &&
  !DRAW_STALE_KEYS.includes("original_contract_sum" as keyof DrawStaleFields) &&
  !DRAW_STALE_KEYS.includes("contract_sum_to_date" as keyof DrawStaleFields));

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
