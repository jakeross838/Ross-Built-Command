import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org/session";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * POST /api/draws/[id]/adjustments/apply  { adjustment_id }
 *
 * BLOCK B pt2b — apply an APPROVED draw adjustment to this draw
 * (adjustment_status: approved → applied_to_draw) so it counts toward
 * current_payment_due. Only 'approved' adjustments can be applied;
 * 'resolved' / 'voided' are terminal and 'applied_to_draw' is a no-op-guard.
 * Org- + draw-scoped; RLS is the backstop.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const membership = await getCurrentMembership();
    if (!membership) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const supabase = createServerClient();
    const { adjustment_id } = (await request.json()) as {
      adjustment_id?: string;
    };
    if (!adjustment_id) {
      return NextResponse.json({ error: "adjustment_id required" }, { status: 400 });
    }

    const { data: adj } = await supabase
      .from("draw_adjustments")
      .select("id, adjustment_status, status_history")
      .eq("id", adjustment_id)
      .eq("org_id", membership.org_id)
      .eq("draw_id", params.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!adj) {
      return NextResponse.json({ error: "Adjustment not found" }, { status: 404 });
    }
    if (adj.adjustment_status !== "approved") {
      return NextResponse.json(
        {
          error: `Only approved adjustments can be applied (this one is '${adj.adjustment_status}').`,
        },
        { status: 400 }
      );
    }

    const history = Array.isArray(adj.status_history)
      ? (adj.status_history as unknown[])
      : [];
    history.push({
      who: "user",
      when: new Date().toISOString(),
      old_status: "approved",
      new_status: "applied_to_draw",
      note: "Applied to draw via wizard pending pool",
    });

    const { error } = await supabase
      .from("draw_adjustments")
      .update({
        adjustment_status: "applied_to_draw",
        status_history: history,
        updated_at: new Date().toISOString(),
      })
      .eq("id", adjustment_id)
      .eq("org_id", membership.org_id)
      .eq("draw_id", params.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
