import { NextRequest, NextResponse } from "next/server";
import { getCurrentMembership } from "@/lib/org/session";
import { logActivity } from "@/lib/activity-log";
import { updateWithLock, isLockConflict } from "@/lib/api/optimistic-lock";
import {
  getClientForRequest,
  logImpersonatedWrite,
} from "@/lib/auth/impersonation-client";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/lien-releases/:id
 * Edit release type, amount, status, through_date, document_url, notes.
 * Flipping status to 'received' stamps received_at.
 * Flipping status to 'waived' stamps waived_at.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const membership = await getCurrentMembership();
    if (!membership) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const ctx = await getClientForRequest();
    if (!ctx.ok) {
      return NextResponse.json(
        { error: `Impersonation rejected: ${ctx.reason}` },
        { status: 401 }
      );
    }
    const supabase = ctx.client;
    const body = (await request.json()) as Record<string, unknown>;

    // Fetch acting user for status_history.who (Q12 uniform-rule). iter-2 HF-A1-1:
    // use null fallback (not "user" literal) so downstream audit-timeline UIs can
    // distinguish "system/service-role write" from a real user id. Matches
    // logActivity convention in src/lib/activity-log.ts.
    const { data: { user: actor } } = await supabase.auth.getUser();
    const actorId = actor?.id ?? null;

    const { data: existing } = await supabase
      .from("lien_releases")
      .select("id, status, status_history, org_id")
      .eq("id", params.id)
      .eq("org_id", membership.org_id)
      .single();
    if (!existing) {
      return NextResponse.json({ error: "Lien release not found" }, { status: 404 });
    }

    const releaseOrgId = existing.org_id as string | null;
    if (!releaseOrgId) {
      return NextResponse.json(
        { error: "Lien release record missing org_id" },
        { status: 500 }
      );
    }

    const updates: Record<string, unknown> = {};
    for (const key of [
      "release_type",
      "amount",
      "status",
      "through_date",
      "document_url",
      "notes",
      "po_id",
    ]) {
      if (key in body) updates[key] = body[key];
    }
    if (body.status === "received" && existing.status !== "received") {
      updates.received_at = new Date().toISOString();
    }
    if (body.status === "waived" && existing.status !== "waived") {
      updates.waived_at = new Date().toISOString();
    }

    // Q12 uniform-rule (status_history append on every transition). The append
    // happens INSIDE the `updates` object so updateWithLock writes both status
    // and status_history atomically (single UPDATE statement).
    // iter-2 MED-A1-1: cap body.note at 500 chars to bound PII / abuse surface.
    if (
      typeof body.status === "string" &&
      body.status !== existing.status
    ) {
      const existingHistory = Array.isArray(existing.status_history)
        ? existing.status_history
        : [];
      const rawNote = typeof body.note === "string" ? body.note : null;
      const note = rawNote === null ? null : rawNote.slice(0, 500);
      const entry = {
        who: actorId,
        when: new Date().toISOString(),
        old_status: existing.status,
        new_status: body.status,
        note,
      };
      updates.status_history = [...existingHistory, entry];
    }

    const expectedUpdatedAt = (body.expected_updated_at as string | undefined) || null;
    const lockResult = await updateWithLock(supabase, {
      table: "lien_releases",
      id: params.id,
      orgId: membership.org_id,
      expectedUpdatedAt,
      updates,
    });
    if (isLockConflict(lockResult)) {
      return lockResult.response;
    }

    await logActivity({
      org_id: releaseOrgId,
      entity_type: "draw",
      entity_id: params.id,
      action: "updated",
      details: { lien_release_update: updates },
    });
    await logImpersonatedWrite(ctx, {
      target_record_type: "lien_release",
      target_record_id: params.id,
      details: { updates },
      route: `/api/lien-releases/${params.id}`,
      method: "PATCH",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
