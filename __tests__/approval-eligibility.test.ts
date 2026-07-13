/**
 * 3.2 ONE QUEUE — approval eligibility gates (the money-gate logic behind PM
 * Quick-Approve + batch approve). Pure-function tests for the module extracted
 * from the PM Queue so the Bills list can drive the same rules. Covers every
 * blocker rule, the quick-approve gates, accumulation, and a batch split.
 */
import {
  getApprovalBlockers,
  isQuickApproveEligible,
  quickApproveThreshold,
  type ApprovalInvoice,
  type ApprovalWorkflowSettings,
  type ApprovalLineItemSummary,
} from "../src/lib/invoices/approval-eligibility";

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}
function eq<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// All gates ON — the strictest settings, so each blocker rule can fire.
const STRICT: ApprovalWorkflowSettings = {
  quick_approve_enabled: true,
  quick_approve_min_confidence: 95,
  require_invoice_date: true,
  require_budget_allocation: true,
  require_po_linkage: true,
  duplicate_detection_enabled: true,
};

// A fully-eligible invoice under STRICT (job, cost code, date, not-dup, header PO).
const OK_INV: ApprovalInvoice = {
  id: "i1",
  status: "pm_review",
  confidence_score: 0.97,
  job_id: "job-1",
  cost_code_id: "cc-1",
  invoice_date: "2026-06-01",
  po_id: "po-1",
  is_potential_duplicate: false,
  duplicate_dismissed_at: null,
};
const FULL_SUMMARY: ApprovalLineItemSummary = { hasAllBudgetLines: true, hasAllPOs: true, lineCount: 2 };

// ── getApprovalBlockers ──────────────────────────────────────────────

// null settings → no blockers (still loading; matches the queue).
check("null settings → no blockers", eq(getApprovalBlockers(OK_INV, null, FULL_SUMMARY), []));

// fully eligible → []
check("fully eligible invoice → no blockers", eq(getApprovalBlockers(OK_INV, STRICT, FULL_SUMMARY), []));

// no job
check(
  "no job_id → 'No job assigned'",
  getApprovalBlockers({ ...OK_INV, job_id: null }, STRICT, FULL_SUMMARY).includes("No job assigned")
);

// no cost code
check(
  "no cost_code_id → 'No cost code assigned'",
  getApprovalBlockers({ ...OK_INV, cost_code_id: null }, STRICT, FULL_SUMMARY).includes("No cost code assigned")
);

// require_invoice_date + missing date
check(
  "require_invoice_date + no date → 'Missing invoice date'",
  getApprovalBlockers({ ...OK_INV, invoice_date: null }, STRICT, FULL_SUMMARY).includes("Missing invoice date")
);

// require_invoice_date OFF + missing date → no date blocker
check(
  "require_invoice_date off + no date → no date blocker",
  !getApprovalBlockers({ ...OK_INV, invoice_date: null }, { ...STRICT, require_invoice_date: false }, FULL_SUMMARY).includes("Missing invoice date")
);

// duplicate flagged, not dismissed
check(
  "dup detection + flagged + not dismissed → dup blocker",
  getApprovalBlockers({ ...OK_INV, is_potential_duplicate: true, duplicate_dismissed_at: null }, STRICT, FULL_SUMMARY).some((r) => /duplicate/i.test(r))
);

// duplicate flagged but dismissed → no dup blocker
check(
  "dup flagged but dismissed → no dup blocker",
  !getApprovalBlockers({ ...OK_INV, is_potential_duplicate: true, duplicate_dismissed_at: "2026-06-02" }, STRICT, FULL_SUMMARY).some((r) => /duplicate/i.test(r))
);

// dup detection OFF → no dup blocker even if flagged
check(
  "dup detection off + flagged → no dup blocker",
  !getApprovalBlockers({ ...OK_INV, is_potential_duplicate: true }, { ...STRICT, duplicate_detection_enabled: false }, FULL_SUMMARY).some((r) => /duplicate/i.test(r))
);

// require_budget_allocation + no summary
check(
  "require_budget_allocation + missing summary → not allocated",
  getApprovalBlockers(OK_INV, STRICT, undefined).some((r) => /allocated to budget lines/i.test(r))
);

// require_budget_allocation + lineCount 0
check(
  "require_budget_allocation + 0 lines → not allocated",
  getApprovalBlockers(OK_INV, STRICT, { hasAllBudgetLines: false, hasAllPOs: false, lineCount: 0 }).some((r) => /allocated to budget lines/i.test(r))
);

// require_budget_allocation + not all budget lines
check(
  "require_budget_allocation + partial budget lines → not allocated",
  getApprovalBlockers(OK_INV, STRICT, { hasAllBudgetLines: false, hasAllPOs: true, lineCount: 2 }).some((r) => /allocated to budget lines/i.test(r))
);

// require_po_linkage + no header PO + no line POs
check(
  "require_po_linkage + no PO anywhere → 'No PO linked'",
  getApprovalBlockers({ ...OK_INV, po_id: null }, STRICT, { hasAllBudgetLines: true, hasAllPOs: false, lineCount: 2 }).includes("No PO linked")
);

// require_po_linkage + header PO present → no PO blocker
check(
  "require_po_linkage + header po_id → no PO blocker",
  !getApprovalBlockers({ ...OK_INV, po_id: "po-9" }, STRICT, { hasAllBudgetLines: true, hasAllPOs: false, lineCount: 2 }).includes("No PO linked")
);

// require_po_linkage + all line POs → no PO blocker
check(
  "require_po_linkage + line POs cover → no PO blocker",
  !getApprovalBlockers({ ...OK_INV, po_id: null }, STRICT, { hasAllBudgetLines: true, hasAllPOs: true, lineCount: 2 }).includes("No PO linked")
);

// accumulation
{
  const r = getApprovalBlockers({ ...OK_INV, job_id: null, cost_code_id: null }, STRICT, FULL_SUMMARY);
  check("multiple blockers accumulate (no job + no cost code)", r.includes("No job assigned") && r.includes("No cost code assigned"));
}

// RB-realistic settings (budget/PO gates off) — an invoice with job+code+date is eligible.
{
  const RB: ApprovalWorkflowSettings = { ...STRICT, require_budget_allocation: false, require_po_linkage: false };
  check("RB settings (budget/PO off) + job+code+date → eligible", eq(getApprovalBlockers({ ...OK_INV, po_id: null }, RB, undefined), []));
}

// ── quickApproveThreshold ────────────────────────────────────────────
check("threshold 95 → 0.95", quickApproveThreshold(STRICT) === 0.95);
check("threshold null settings → 0.95 default", quickApproveThreshold(null) === 0.95);

// ── isQuickApproveEligible ───────────────────────────────────────────
check("fully eligible pm_review → quick-approvable", isQuickApproveEligible(OK_INV, STRICT, FULL_SUMMARY) === true);
check("ai_processed + eligible → quick-approvable", isQuickApproveEligible({ ...OK_INV, status: "ai_processed" }, STRICT, FULL_SUMMARY) === true);
check("quick_approve_enabled false → not quick-approvable", isQuickApproveEligible(OK_INV, { ...STRICT, quick_approve_enabled: false }, FULL_SUMMARY) === false);
check("confidence below threshold → not quick-approvable", isQuickApproveEligible({ ...OK_INV, confidence_score: 0.9 }, STRICT, FULL_SUMMARY) === false);
check("confidence exactly at threshold (0.95) → quick-approvable", isQuickApproveEligible({ ...OK_INV, confidence_score: 0.95 }, STRICT, FULL_SUMMARY) === true);
check("status qa_review → not quick-approvable", isQuickApproveEligible({ ...OK_INV, status: "qa_review" }, STRICT, FULL_SUMMARY) === false);
check("has a blocker (no cost code) → not quick-approvable", isQuickApproveEligible({ ...OK_INV, cost_code_id: null }, STRICT, FULL_SUMMARY) === false);
check("null settings → not quick-approvable", isQuickApproveEligible(OK_INV, null, FULL_SUMMARY) === false);

// ── batch split (mirrors handleBatchApprove eligibility partition) ────
{
  const RB: ApprovalWorkflowSettings = { ...STRICT, require_budget_allocation: false, require_po_linkage: false };
  const set: ApprovalInvoice[] = [
    { ...OK_INV, id: "a", po_id: null }, // eligible
    { ...OK_INV, id: "b", cost_code_id: null, po_id: null }, // blocked (no cost code)
    { ...OK_INV, id: "c", job_id: null, po_id: null }, // blocked (no job)
  ];
  const eligible = set.filter((inv) => getApprovalBlockers(inv, RB, undefined).length === 0);
  const excluded = set.filter((inv) => getApprovalBlockers(inv, RB, undefined).length > 0);
  check("batch split — 1 eligible, 2 excluded", eligible.length === 1 && excluded.length === 2 && eligible[0].id === "a");
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
