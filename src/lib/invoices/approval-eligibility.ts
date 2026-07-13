// Invoice approval eligibility — the money-gate logic behind PM Quick-Approve
// and batch approve. Extracted verbatim (byte-equivalent) from the PM Queue
// (src/app/invoices/queue/page.tsx getApprovalBlockers / isQuickApproveEligible)
// so the same rules can drive BOTH the queue and the folded-in Bills list
// (coherence audit 3.2 "ONE QUEUE"). Pure functions — no React, no fetch, no
// closure over component state; settings + the per-invoice line-item summary
// are passed in. This is the CLIENT-side eligibility preview; the real gate is
// the server (POST /api/invoices/batch-action), which must never trust the
// client. Unit-tested in __tests__/approval-eligibility.test.ts.

export interface ApprovalWorkflowSettings {
  quick_approve_enabled: boolean;
  /** Whole percent (e.g. 95), not a 0–1 fraction. */
  quick_approve_min_confidence: number;
  require_invoice_date: boolean;
  require_budget_allocation: boolean;
  require_po_linkage: boolean;
  duplicate_detection_enabled: boolean;
}

/** Per-invoice budget-line / PO coverage, mirroring the PM Queue computation. */
export interface ApprovalLineItemSummary {
  hasAllBudgetLines: boolean;
  hasAllPOs: boolean;
  lineCount: number;
}

/**
 * The minimal invoice shape the eligibility gates read. Fields the list route's
 * MINIMAL fallback may omit (`po_id`, `is_potential_duplicate`,
 * `duplicate_dismissed_at`) are optional so a degraded row is still assignable;
 * the checks below treat them as falsy, matching the strict queue behavior.
 */
export interface ApprovalInvoice {
  id: string;
  status: string;
  confidence_score: number;
  job_id: string | null;
  cost_code_id: string | null;
  invoice_date: string | null;
  po_id?: string | null;
  is_potential_duplicate?: boolean | null;
  duplicate_dismissed_at?: string | null;
}

/**
 * Reasons this invoice cannot be batch-approved. Empty array = eligible.
 * Byte-equivalent to the PM Queue's getApprovalBlockers. With `null` settings
 * (still loading) it returns no blockers — matching the queue, which also gates
 * its UI on `workflowSettings` being present before acting.
 */
export function getApprovalBlockers(
  inv: ApprovalInvoice,
  settings: ApprovalWorkflowSettings | null,
  lineItemSummary: ApprovalLineItemSummary | undefined,
): string[] {
  if (!settings) return [];
  const reasons: string[] = [];
  if (!inv.job_id) reasons.push("No job assigned");
  if (!inv.cost_code_id) reasons.push("No cost code assigned");
  if (settings.require_invoice_date && !inv.invoice_date) {
    reasons.push("Missing invoice date");
  }
  if (
    settings.duplicate_detection_enabled &&
    inv.is_potential_duplicate &&
    !inv.duplicate_dismissed_at
  ) {
    reasons.push("Flagged as duplicate — review individually");
  }
  if (settings.require_budget_allocation) {
    const s = lineItemSummary;
    if (!s || s.lineCount === 0 || !s.hasAllBudgetLines) {
      reasons.push("Not fully allocated to budget lines");
    }
  }
  if (settings.require_po_linkage) {
    const s = lineItemSummary;
    const headerPO = !!inv.po_id;
    if (!headerPO && (!s || !s.hasAllPOs)) {
      reasons.push("No PO linked");
    }
  }
  return reasons;
}

/** The confidence floor for Quick-Approve, as a 0–1 fraction (default 95%). */
export function quickApproveThreshold(settings: ApprovalWorkflowSettings | null): number {
  return (settings?.quick_approve_min_confidence ?? 95) / 100;
}

/**
 * Whether a single invoice qualifies for one-click Quick-Approve: the feature
 * is enabled, confidence meets the threshold, the invoice is in a reviewable
 * state, and it has zero blockers. Byte-equivalent to the PM Queue.
 */
export function isQuickApproveEligible(
  inv: ApprovalInvoice,
  settings: ApprovalWorkflowSettings | null,
  lineItemSummary: ApprovalLineItemSummary | undefined,
): boolean {
  if (!settings?.quick_approve_enabled) return false;
  if (inv.confidence_score < quickApproveThreshold(settings)) return false;
  if (inv.status !== "pm_review" && inv.status !== "ai_processed") return false;
  const blockers = getApprovalBlockers(inv, settings, lineItemSummary);
  if (blockers.length > 0) return false;
  return true;
}
