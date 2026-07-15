/**
 * Balance-impact strip math (Stage-2 review-screen redesign). Pure-function
 * tests: mockup fixture tie-out, the double-count trap (Jake's Stage-2 caveat),
 * tone thresholds, multi-line-per-code summing, and the counting-status pin.
 *
 * READ-ONLY DISPLAY ARITHMETIC — no approval math is exercised here.
 */
import {
  computeImpactRows,
  computeBaselineCents,
  codeOrderFromRows,
  liveSumByCode,
  toneFor,
  INVOICE_COUNTING_STATUSES,
  TIGHT_FRACTION,
  type CodeBaseline,
} from "../src/lib/invoices/balance-impact";

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}
const D = (dollars: number) => Math.round(dollars * 100); // dollars → cents

// ── 1. Harborline fixture ties out to the mockup / README exactly ──────────
// 15-410 PO RB-2026-041 ($24,000 total / $8,000 invoiced-excl) + two lines
//   summing $13,950 → $2,050 remain (amber). 15-420 Budget ($48,000 / $31,200)
//   + $3,800 → $13,000 remain (ink). 01-500 Budget ($12,000 / $11,500) + $850
//   → -$350 (red).
const HARBORLINE_BASELINES: Record<string, CodeBaseline> = {
  "15-410": { scope: "po", poNumber: "RB-2026-041", scopeTotalCents: D(24000), baselineCents: D(8000) },
  "15-420": { scope: "budget", scopeTotalCents: D(48000), baselineCents: D(31200) },
  "01-500": { scope: "budget", scopeTotalCents: D(12000), baselineCents: D(11500) },
};
const HARBORLINE_LIVE = {
  "15-410": D(12400) + D(1550), // two lines on one code, summed
  "15-420": D(3800),
  "01-500": D(850),
};
const hb = computeImpactRows(["15-410", "15-420", "01-500"], HARBORLINE_LIVE, HARBORLINE_BASELINES);

check("15-410 PO → $2,050 remain, amber", hb[0].afterCents === D(2050) && hb[0].tone === "tight" && hb[0].afterLabel === "$2,050 remain after" && hb[0].scopeLabel === "PO RB-2026-041", JSON.stringify(hb[0]));
check("15-420 Budget → $13,000 remain, ink", hb[1].afterCents === D(13000) && hb[1].tone === "ink" && hb[1].afterLabel === "$13,000 remain after" && hb[1].scopeLabel === "Budget", JSON.stringify(hb[1]));
check("01-500 Budget → $350 over, red", hb[2].afterCents === D(-350) && hb[2].tone === "over" && hb[2].afterLabel === "$350 over", JSON.stringify(hb[2]));
check("one row per distinct code, first-seen order", hb.length === 3 && hb.map((r) => r.code).join(",") === "15-410,15-420,01-500");
check("15-410 now = $16,000 (before this invoice)", hb[0].nowCents === D(16000), `${hb[0].nowCents}`);

// ── 2. THE DOUBLE-COUNT TRAP (Jake's Stage-2 caveat) ───────────────────────
// PO RB-2026-041 total $24,000. Other counting invoice contributes $8,000. The
// REVIEWED invoice is PO-linked AND in a counting status (qa_review = final
// review) so it is ALREADY inside purchase_orders.invoiced_total. The baseline
// MUST exclude it, else `after` double-subtracts the reviewed lines.
const REVIEWED = "inv-under-review";
const trapContribs = [
  { invoiceId: "inv-other-A", status: "pm_approved", amountCents: D(8000) },
  { invoiceId: REVIEWED, status: "qa_review", amountCents: D(13950) }, // already counted
];
const trapBaseline = computeBaselineCents(trapContribs, REVIEWED);
check("baseline EXCLUDES reviewed invoice even when it is counting-status", trapBaseline === D(8000), `baseline=${trapBaseline} expected=${D(8000)}`);
// Feed the trap-proof baseline through the row math → correct $2,050, not -$11,900.
const trapRows = computeImpactRows(["15-410"], { "15-410": D(13950) }, {
  "15-410": { scope: "po", poNumber: "RB-2026-041", scopeTotalCents: D(24000), baselineCents: trapBaseline },
});
check("no double-count: final-review PO-linked invoice → $2,050 remain (not -$11,900)", trapRows[0].afterCents === D(2050), `after=${trapRows[0].afterCents}`);
// Sanity: had we WRONGLY included the reviewed invoice in the baseline, after would be wrong.
const wrongBaseline = D(8000) + D(13950);
const wrongRows = computeImpactRows(["15-410"], { "15-410": D(13950) }, {
  "15-410": { scope: "po", poNumber: "RB-2026-041", scopeTotalCents: D(24000), baselineCents: wrongBaseline },
});
check("guard: including reviewed WOULD have double-counted (proves exclusion matters)", wrongRows[0].afterCents === D(-11900), `after=${wrongRows[0].afterCents}`);

// ── 3. No UNDER-count when the reviewed invoice is pre-approval ─────────────
// PM-review invoice is NOT in invoiced_total. Baseline naturally excludes it
// (both by id and by non-counting status). after subtracts its live lines once.
const preContribs = [
  { invoiceId: "inv-other-A", status: "in_draw", amountCents: D(8000) },
  { invoiceId: REVIEWED, status: "pm_review", amountCents: D(13950) }, // not counted yet
];
const preBaseline = computeBaselineCents(preContribs, REVIEWED);
check("baseline excludes a pre-approval reviewed invoice (no under-count setup)", preBaseline === D(8000), `baseline=${preBaseline}`);
const preRows = computeImpactRows(["15-410"], { "15-410": D(13950) }, {
  "15-410": { scope: "po", poNumber: "RB-2026-041", scopeTotalCents: D(24000), baselineCents: preBaseline },
});
check("pre-approval invoice → $2,050 remain (subtracted exactly once)", preRows[0].afterCents === D(2050), `after=${preRows[0].afterCents}`);

// ── 4. Counting-status filter: non-counting siblings never in the baseline ──
const mixed = [
  { invoiceId: "a", status: "pm_approved", amountCents: D(1000) },
  { invoiceId: "b", status: "in_draw", amountCents: D(2000) },
  { invoiceId: "c", status: "void", amountCents: D(9999) }, // excluded
  { invoiceId: "d", status: "pm_denied", amountCents: D(9999) }, // excluded
  { invoiceId: "e", status: "pm_review", amountCents: D(9999) }, // excluded
];
check("baseline sums only counting-status siblings", computeBaselineCents(mixed, "reviewed") === D(3000), `${computeBaselineCents(mixed, "reviewed")}`);

// ── 5. Tone thresholds (amber boundary at exactly 12% of scope) ────────────
check("amber at exactly 12% of scope", toneFor(D(12000) * 0.12 / 1, D(12000)) === "tight");
check("amber boundary: just above 12% is ink", toneFor(Math.round(D(12000) * TIGHT_FRACTION) + 1, D(12000)) === "ink");
check("negative is over", toneFor(-1, D(12000)) === "over");
check("zero remaining is tight (not over)", toneFor(0, D(12000)) === "tight");

// ── 6. Helpers ─────────────────────────────────────────────────────────────
check("codeOrderFromRows distinct + first-seen + skips null", codeOrderFromRows([{ cost_code: "15-410" }, { cost_code: "15-410" }, { cost_code: "15-420" }, { cost_code: null }, { cost_code: "01-500" }]).join(",") === "15-410,15-420,01-500");
const sums = liveSumByCode([{ cost_code: "15-410", amount_cents: D(12400) }, { cost_code: "15-410", amount_cents: D(1550) }, { cost_code: null, amount_cents: D(999) }]);
check("liveSumByCode sums per code, skips null", sums["15-410"] === D(13950) && !("null" in sums), JSON.stringify(sums));

// ── 7. Pin the counting-status list (guards silent drift from recalc.ts) ────
check("INVOICE_COUNTING_STATUSES matches recalc.ts's 6 statuses", JSON.stringify([...INVOICE_COUNTING_STATUSES]) === JSON.stringify(["pm_approved", "qa_review", "qa_approved", "pushed_to_qb", "in_draw", "paid"]));

// ── 8. A code with no budget line and no PO is skipped (no fiction) ─────────
check("code with no baseline is omitted", computeImpactRows(["99-999"], { "99-999": D(500) }, {}).length === 0);

console.log(`\n${failures === 0 ? "OK" : "FAILED"} — balance-impact: ${failures} failure(s)`);
process.exit(failures > 0 ? 1 : 0);
