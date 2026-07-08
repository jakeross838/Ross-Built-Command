import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { ApiError, withApiError } from "@/lib/api/errors";
import { getCurrentMembership } from "@/lib/org/session";
import { recalcDraftDrawsForJob } from "@/lib/draw-calc";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * POST /api/draws/[id]/refresh-totals
 *
 * Re-saves the stored G702 summary totals for this draw from a live
 * from-source recompute. Defect-5c fix: the DrawApprovalView shows a
 * "Recomputed — stored value stale" badge when the persisted summary
 * diverges from what computeDrawLines/rollupDrawTotals produce now. That
 * badge is correct behaviour, but until this endpoint existed there was no
 * way to make the stored value catch up — the recompute lived only on read.
 *
 * recalcDraftDrawsForJob() only touches DRAFT draws for the job; submitted/
 * approved/locked/paid draws keep their captured values (a retroactive
 * change on those is a revision event, not a silent refresh). So this is
 * safe to call from a draft's action bar — approved draws stay locked.
 *
 * Auth: getCurrentMembership() gate + org-scoped draw lookup precedes the
 * recompute (RLS backstop intact). Returns the number of draft draws
 * re-stamped so the client can toast an accurate count.
 */
export const POST = withApiError(async (
  _req: NextRequest,
  context: { params: { id: string } }
) => {
  const membership = await getCurrentMembership();
  if (!membership) throw new ApiError("Not authenticated", 401);
  const supabase = createServerClient();

  const { data: draw } = await supabase
    .from("draws")
    .select("id, job_id, status")
    .eq("id", context.params.id)
    .eq("org_id", membership.org_id)
    .single();
  if (!draw) throw new ApiError("Draw not found", 404);

  if (draw.status !== "draft") {
    throw new ApiError(
      `Only draft draws can be refreshed — this draw is '${draw.status}'. Submitted and approved draws keep their captured totals (a change is a revision event).`,
      400
    );
  }

  const recomputed = await recalcDraftDrawsForJob(draw.job_id as string);

  return NextResponse.json({ ok: true, recomputed });
});
