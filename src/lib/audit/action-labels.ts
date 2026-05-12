// src/lib/audit/action-labels.ts
//
// Canonical UI label mapping for the activity_log table.
//
// Per .planning/phases/stage-1.5c-information-architecture/AUDIT-LOG-STRATEGY.md:
// the activity_log table has TWO separate columns — entity_type + action —
// not a single concatenated string. This module maps those two values to
// user-facing labels under the Stage 1.5c "Bills / Pay Apps" terminology
// rename (CONTEXT D-01).
//
// Strategy 1-prime (recommended for 1.5c): preserve existing entity_type
// literal values in writes (no DB migration); UI maps entity_type='invoice'
// to "Bill" and entity_type='draw' to "Pay App" via this helper. F1 may
// extend the ActivityEntityType enum or migrate existing rows; until then
// dual vocabulary (DB literal vs UI label) is the convention.
//
// Source of truth for the type unions: src/lib/activity-log.ts:20-49.

import type { ActivityEntityType, ActivityAction } from "@/lib/activity-log";

export interface AuditLabel {
  /** User-facing entity name. e.g. "Bill" for entity_type='invoice'. */
  entityLabel: string;
  /** User-facing action verb in sentence case. e.g. "approved". */
  actionLabel: string;
  /** Combined human-readable summary. e.g. "Bill approved". */
  summary: string;
}

const ENTITY_LABELS: Record<ActivityEntityType, string> = {
  invoice: "Bill", // 1.5c terminology rename per D-01
  invoice_import_batch: "Bill import",
  purchase_order: "Purchase Order",
  change_order: "Change Order",
  budget_line: "Budget line",
  // 'budget' entry removed in PR A-3 (F1-Wave-A) per Q10c — budgets table
  // dropped in migration 00095. Legacy activity_log rows with
  // entity_type='budget' (if any) are handled by auditLabel's defensive
  // fallback below — returns "Budget (legacy)" for backward-compatible
  // rendering. See HF-A3-2 in ITER-2-PATCHES.md.
  job: "Job",
  vendor: "Vendor",
  cost_code: "Cost Code",
  draw: "Pay App", // 1.5c terminology rename per D-01
  user: "User",
};

const ACTION_LABELS: Record<ActivityAction, string> = {
  created: "created",
  updated: "updated",
  status_changed: "status changed",
  deleted: "deleted",
  delete_blocked: "delete blocked",
  voided: "voided",
  void_blocked: "void blocked",
  merged: "merged",
  imported: "imported",
  recomputed: "recomputed",
  approved: "approved",
  denied: "denied",
  bulk_assigned_job: "bulk assigned to job",
  sent_to_queue: "sent to queue",
  deleted_errors: "errors deleted",
};

/**
 * Map (entity_type, action) tuple to user-facing UI labels.
 *
 * Pure function — no side effects, no DB access. Safe to call from any
 * audit-log-displaying surface (timelines, activity feeds, /admin/platform/audit
 * viewer, etc.).
 *
 * @example
 *   const { summary } = auditLabel("invoice", "approved");
 *   // summary === "Bill approved"
 */
export function auditLabel(
  entityType: ActivityEntityType,
  action: ActivityAction,
): AuditLabel {
  // Defensive fallback for legacy entity_type values that may exist in the
  // activity_log table from pre-A-3 writes (e.g., entity_type='budget' from
  // before the budgets table was dropped). Since activity_log.entity_type is
  // TEXT (not a Postgres ENUM), historical rows survive the TS union narrowing
  // and can surface here via raw-SQL-read paths. Per HF-A3-2.
  const entityLabel =
    ENTITY_LABELS[entityType] ??
    (entityType === ("budget" as ActivityEntityType)
      ? "Budget (legacy)"
      : String(entityType));
  const actionLabel = ACTION_LABELS[action] ?? String(action);
  return {
    entityLabel,
    actionLabel,
    summary: `${entityLabel} ${actionLabel}`,
  };
}
