/**
 * Cost-Plus Statement math — cent-exact. The load-bearing invariants:
 *   (1) blended totals ≡ own-line totals (distribution changes presentation,
 *       never the grand total);
 *   (2) markup rounds to the cent, and the blended per-line shares sum to
 *       EXACTLY markup_amount (no cent created or lost);
 *   (3) credits render only when nonzero and reduce total_due.
 */
import {
  computeStatement,
  resolveMarkupDisplay,
  resolveBackupDetail,
  type StatementCostLine,
} from "../src/lib/statement-calc";

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

// Deliberately awkward cents + a markup that doesn't divide evenly, to force
// rounding drift the remainder-carry must absorb.
const costLines: StatementCostLine[] = [
  { cost_code_id: "a", code: "13103", description: "Low Voltage", cost: 570235 },
  { cost_code_id: "b", code: "14101", description: "HVAC", cost: 1356300 },
  { cost_code_id: "c", code: "09101", description: "Electrical", cost: 333333 },
];
const markupPercent = 0.185; // 18.5% — non-trivial rounding

const ownLine = computeStatement({ costLines, markupPercent, markupDisplay: "own_line" });
const blended = computeStatement({ costLines, markupPercent, markupDisplay: "blended" });

const subtotal = 570235 + 1356300 + 333333; // 2,259,868
check("cost_subtotal is the exact sum", ownLine.cost_subtotal === subtotal, String(ownLine.cost_subtotal));
check("markup_amount = round(subtotal × 0.185)", ownLine.markup_amount === Math.round(subtotal * 0.185), String(ownLine.markup_amount));

// (1) totals identical
check("own_line total_due === blended total_due", ownLine.total_due === blended.total_due, `${ownLine.total_due} vs ${blended.total_due}`);
check("total_due = subtotal + markup (no credits)", ownLine.total_due === subtotal + ownLine.markup_amount);

// (2) blended line amounts sum to subtotal + markup EXACTLY (no cent lost)
const blendedSum = blended.lines.reduce((s, l) => s + l.amount, 0);
check("blended lines sum === subtotal + markup", blendedSum === subtotal + ownLine.markup_amount, String(blendedSum));
const ownSum = ownLine.lines.reduce((s, l) => s + l.amount, 0);
check("own_line lines sum === subtotal (markup is separate)", ownSum === subtotal, String(ownSum));

// display flags
check("own_line shows a discrete markup line", ownLine.showMarkupLine === true);
check("blended has NO separate markup line", blended.showMarkupLine === false);
check("blended per-line amounts each >= their cost", blended.lines.every((l, i) => l.amount >= costLines[i].cost));

// (3) credits — nonzero only, reduce total
const withCredits = computeStatement({
  costLines,
  markupPercent,
  markupDisplay: "own_line",
  credits: { deposit_application: 100000, retainage: 0, prior_payments: 50000 },
});
check("zero credits are dropped (retainage=0 not rendered)", withCredits.credits.length === 2);
check("credits reduce total_due", withCredits.total_due === subtotal + withCredits.markup_amount - 150000);
check("blended+credits total === own_line+credits total", (() => {
  const b = computeStatement({ costLines, markupPercent, markupDisplay: "blended", credits: { deposit_application: 100000, prior_payments: 50000 } });
  return b.total_due === withCredits.total_due;
})());

// edge: 0% markup
const noMarkup = computeStatement({ costLines, markupPercent: 0, markupDisplay: "own_line" });
check("0% markup → markup_amount 0, total = subtotal", noMarkup.markup_amount === 0 && noMarkup.total_due === subtotal);

// edge: single line blended absorbs full markup
const single = computeStatement({ costLines: [costLines[0]], markupPercent: 0.2, markupDisplay: "blended" });
check("single blended line = cost + full markup", single.lines[0].amount === costLines[0].cost + Math.round(costLines[0].cost * 0.2));

// config resolvers
check("markup_display inherits org default when job NULL", resolveMarkupDisplay(null, "blended") === "blended");
check("markup_display job override wins", resolveMarkupDisplay("own_line", "blended") === "own_line");
check("markup_display falls back to own_line", resolveMarkupDisplay(null, null) === "own_line");
check("backup_detail inherits + defaults", resolveBackupDetail(null, "detailed") === "detailed" && resolveBackupDetail(null, null) === "summary");

console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
