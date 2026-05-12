import { NextRequest, NextResponse } from "next/server";
import { getCurrentMembership } from "@/lib/org/session";
import { logActivity } from "@/lib/activity-log";
import {
  getClientForRequest,
  logImpersonatedWrite,
} from "@/lib/auth/impersonation-client";

export const dynamic = "force-dynamic";

/**
 * POST /api/lien-releases/bulk
 * Body: { ids: string[], action: 'mark_received' | 'waive' }
 *
 * Used by the "Mark All as Received" and "Waive All" buttons on the draw
 * detail page.
 */
export async function POST(request: NextRequest) {
  try {
    const membership = await getCurrentMembership();
    if (!membership) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const orgId = membership.org_id;

    const ctx = await getClientForRequest();
    if (!ctx.ok) {
      return NextResponse.json(
        { error: `Impersonation rejected: ${ctx.reason}` },
        { status: 401 }
      );
    }
    const supabase = ctx.client;
    const body = (await request.json()) as { ids?: string[]; action?: string };
    const ids = body.ids ?? [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "No ids provided" }, { status: 400 });
    }

    // Confirm every target release belongs to the user's org. Reject the
    // whole batch if any don't (rather than silently skipping) so the caller
    // knows they passed a bad id.
    //
    // iter-2 HF-A1-2 (DOCUMENTED in SUMMARY, no code change): the per-row loop
    // below is NOT transactional — mid-loop failure leaves earlier rows
    // committed. Wave-B Plan B-3 will restore atomicity via DB trigger /
    // wrapper helper. Acceptable behavior regression for Wave-A; documented.
    const { data: targets, error: targetsErr } = await supabase
      .from("lien_releases")
      .select("id, status, status_history")
      .eq("org_id", orgId)
      .in("id", ids);
    if (targetsErr) {
      return NextResponse.json({ error: targetsErr.message }, { status: 500 });
    }
    if ((targets?.length ?? 0) !== ids.length) {
      return NextResponse.json(
        { error: "One or more lien releases not found in your organization" },
        { status: 404 }
      );
    }

    // Determine the new status from body.action.
    let newStatus: "received" | "waived";
    let timestampField: "received_at" | "waived_at";
    if (body.action === "mark_received") {
      newStatus = "received";
      timestampField = "received_at";
    } else if (body.action === "waive") {
      newStatus = "waived";
      timestampField = "waived_at";
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Q12 uniform-rule (status_history append per row). iter-2 HF-A1-1: use null
    // fallback for `who` (not "user" literal) so downstream audit-timeline UIs
    // can distinguish service-role / unauthenticated writes from real user ids.
    const { data: { user: actor } } = await supabase.auth.getUser();
    const actorId = actor?.id ?? null;
    const nowIso = new Date().toISOString();

    // Per-row loop replaces single bulk UPDATE because each row's status_history
    // needs its own existing-history-plus-entry. N+1 round-trips but N is
    // bounded by UI batching (typically 1-20 per draw); throughput trade-off
    // accepted per Q2 lean-cache-footprint principle (umbrella EXPANDED-SCOPE.md).
    // Self-transition skip (row.status === newStatus) keeps status_history clean.
    let updatedCount = 0;
    for (const row of targets!) {
      const existingHistory = Array.isArray((row as { status_history?: unknown }).status_history)
        ? ((row as { status_history: unknown[] }).status_history)
        : [];
      if ((row as { status: string }).status === newStatus) {
        updatedCount += 1;
        continue;
      }
      const entry = {
        who: actorId,
        when: nowIso,
        old_status: (row as { status: string }).status,
        new_status: newStatus,
        note: `Bulk ${body.action}`,
      };
      const { error: updErr } = await supabase
        .from("lien_releases")
        .update({
          status: newStatus,
          [timestampField]: nowIso,
          status_history: [...existingHistory, entry],
        })
        .eq("id", (row as { id: string }).id)
        .eq("org_id", orgId);
      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }
      updatedCount += 1;
    }

    await logActivity({
      org_id: orgId,
      entity_type: "draw",
      entity_id: null,
      action: "updated",
      details: { bulk_lien_release_action: body.action, count: ids.length },
    });
    for (const id of ids) {
      await logImpersonatedWrite(ctx, {
        target_record_type: "lien_release",
        target_record_id: id,
        details: { action: body.action, batch_size: ids.length },
        route: "/api/lien-releases/bulk",
        method: "POST",
      });
    }
    return NextResponse.json({ ok: true, updated: updatedCount });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
