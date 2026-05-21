/**
 * Activity log — Phase 7b.
 *
 * The activity_log table was scaffolded in Phase 5 (migration 00026). This
 * module is the single write-path. Every status change, financial mutation,
 * or deletion attempt (successful or blocked) should call logActivity.
 *
 * Design rules:
 *   - logActivity NEVER throws. A failed audit write must not block a user
 *     action (we'd rather have a slightly incomplete log than a cascading
 *     failure). Errors are console.warn'd.
 *   - Uses the service-role client so the write succeeds even under
 *     RESTRICTIVE RLS policies.
 *   - `details` is JSONB; callers should include `from` / `to` for status
 *     changes, and a `reason` string where the user supplied a note.
 *
 * F1-Wave-B Slice-2 B-2a (per CONTEXT D-23 + Sweep 4 WARNING #1 resolution
 * path (a) — type-extension throughout): `actor_token_id` column added on
 * activity_log via migration 00104; `LogActivityArgs.actor_token_id` field
 * is the type contract. Mutual-exclusion semantics (NULL XOR populated)
 * enforced at the application layer (callers pass either `user_id` OR
 * `actor_token_id`, never both for a single row). NOT enforced via DB
 * CHECK — legacy rows + future trigger rows may have both NULL
 * (bootstrap migrations, B-3 soft-delete triggers). B-2a admin revoke
 * route writes `user_id` (revoker is an authenticated admin, NOT a
 * homeowner-via-token); B-2b acknowledge endpoint is the first runtime
 * writer of `actor_token_id`-bearing rows.
 */

import { tryCreateServiceRoleClient } from "@/lib/supabase/service";

export type ActivityEntityType =
  | "invoice"
  | "invoice_import_batch"
  | "purchase_order"
  | "change_order"
  | "budget_line"
  // 'budget' member removed in PR A-3 (F1-Wave-A) per Q10c — the `budgets`
  // table was dropped in migration 00095. Legacy activity_log rows with
  // entity_type='budget' (if any — verify via SELECT COUNT(*) at GATE-A;
  // expected 0 per audit 2026-05-12-migration-inventory.md Section 4 task 4)
  // remain readable as TEXT but are no longer addressable from TS write paths.
  | "job"
  | "vendor"
  | "cost_code"
  | "draw"
  | "user"
  | "client" // F1-Wave-B Slice-1 B-1a-bis per nwrp155 B5 partial pull from Slice-2 B-4 — clients table writes (find-or-create in /api/jobs) need audit-log coverage during B-1a-bis -> B-4 window.
  | "client_portal_access"; // F1-Wave-B Slice-2 B-2a per CONTEXT D-10 + Sweep 4 WARNING #1 resolution path (a). Admin revocation of owner-portal tokens writes audit-log rows with this entity_type + action='revoked'. Must mirror ENTITY_LABELS Record entry in src/lib/audit/action-labels.ts per B-1a-bis precedent (line 17 explicit comment).

export type ActivityAction =
  | "created"
  | "updated"
  | "status_changed"
  | "deleted"
  | "delete_blocked"
  | "voided"
  | "void_blocked"
  | "merged"
  | "imported"
  | "recomputed"
  | "approved"
  | "denied"
  // Bulk import batch actions
  | "bulk_assigned_job"
  | "sent_to_queue"
  | "deleted_errors"
  // F1-Wave-B Slice-2 B-2a per CONTEXT D-10. Admin revocation of owner-portal
  // tokens uses entity_type='client_portal_access' + action='revoked'. Must
  // mirror ACTION_LABELS Record entry in src/lib/audit/action-labels.ts per
  // B-1a-bis precedent (Record exhaustiveness — TypeScript fails compile if
  // a union member lacks a Record entry).
  | "revoked";

interface LogActivityArgs {
  org_id: string;
  user_id?: string | null;
  /**
   * F1-Wave-B Slice-2 B-2a per CONTEXT D-23. Present when audit row
   * originated from owner-portal token-context action (B-2b acknowledge
   * endpoint writes the rows). Mutually exclusive with `user_id` at the
   * application layer (callers pass one OR the other, never both).
   *
   * B-2a admin revoke endpoint writes `user_id` (revoker is authenticated
   * admin), NOT `actor_token_id`. B-2b acknowledge endpoint is the first
   * runtime writer of `actor_token_id`-bearing rows.
   */
  actor_token_id?: string | null;
  entity_type: ActivityEntityType;
  entity_id?: string | null;
  action: ActivityAction;
  details?: Record<string, unknown> | null;
}

export async function logActivity(args: LogActivityArgs): Promise<void> {
  const supabase = tryCreateServiceRoleClient();
  if (!supabase) {
    console.warn(
      `[activity-log] SUPABASE_SERVICE_ROLE_KEY not configured — skipping log for ${args.entity_type}/${args.action}`
    );
    return;
  }
  try {
    const { error } = await supabase.from("activity_log").insert({
      org_id: args.org_id,
      user_id: args.user_id ?? null,
      actor_token_id: args.actor_token_id ?? null, // F1-Wave-B Slice-2 B-2a per CONTEXT D-23. Defaults to NULL; B-2b acknowledge endpoint populates this on homeowner-initiated writes.
      entity_type: args.entity_type,
      entity_id: args.entity_id ?? null,
      action: args.action,
      details: args.details ?? null,
    });
    if (error) {
      console.warn(`[activity-log] insert failed: ${error.message}`);
    }
  } catch (err) {
    console.warn(
      `[activity-log] unexpected error: ${err instanceof Error ? err.message : err}`
    );
  }
}

/** Convenience: log a status change with from/to details. */
export async function logStatusChange(
  args: Omit<LogActivityArgs, "action" | "details"> & {
    from: string | null;
    to: string;
    reason?: string;
    extra?: Record<string, unknown>;
  }
): Promise<void> {
  const { from, to, reason, extra, ...rest } = args;
  await logActivity({
    ...rest,
    action: "status_changed",
    details: { from, to, ...(reason ? { reason } : {}), ...(extra ?? {}) },
  });
}
