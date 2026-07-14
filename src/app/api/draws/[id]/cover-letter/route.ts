import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org/session";
import { getWorkflowSettings } from "@/lib/workflow-settings";
import { renderCoverLetter, type CoverLetterContext } from "@/lib/cover-letter";
import { canonicalG702ForDraw, type CanonicalG702 } from "@/lib/draw-calc";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * GET /api/draws/[id]/cover-letter
 *   → { template, body, generated, draw }
 *     - body = stored cover_letter_text if present, else freshly rendered
 *       from the org template (or built-in default).
 *     - generated = true when the body was rendered from template, false
 *       when it's the user's saved edit.
 *
 * PUT /api/draws/[id]/cover-letter
 *   body: { cover_letter_text: string }
 *   → saves the editable body for this draw.
 *
 * POST /api/draws/[id]/cover-letter/regenerate
 *   → re-renders from the current org template, overwriting any saved edit.
 *     (Implemented as POST in this same route file.)
 */

async function loadDraw(
  supabase: ReturnType<typeof createServerClient>,
  id: string,
  orgId: string
) {
  // F1-Wave-B Slice-1 B-1a-bis: nested embed `client:clients(id, full_name)`
  // per Q1 PII fence (D-078 + D-079 + nwrp153). Preserves AIA legal document
  // fidelity per T-B1a-bis-03 mitigation. Migration 00101 drops jobs.client_*;
  // owner_name reads from clients table via FK jobs_client_id_fkey.
  const { data: draw, error } = await supabase
    .from("draws")
    .select(
      `id, job_id, draw_number, period_start, period_end, cover_letter_text,
       jobs:job_id (id, name, address, client:clients(id, full_name))`
    )
    .eq("id", id)
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .single();
  if (error || !draw) return null;
  return draw as unknown as {
    id: string;
    job_id: string;
    draw_number: number;
    period_start: string | null;
    period_end: string | null;
    cover_letter_text: string | null;
    jobs: {
      id: string;
      name: string | null;
      address: string | null;
      client: { id: string; full_name: string } | null;
    } | null;
  };
}

function buildContext(
  draw: Awaited<ReturnType<typeof loadDraw>>,
  g702: CanonicalG702 | null
): CoverLetterContext {
  // NEW-2 class closure: money comes from the CANONICAL G702 (snapshot for
  // issued draws, else recompute), NOT the stale stored draws.* rollup columns.
  // Non-money fields (names, periods, draw #) stay on the draw row.
  const contract = g702?.contract_sum_to_date ?? 0;
  const completed = g702?.total_completed_to_date ?? 0;
  // F1-Wave-B Slice-1 B-1a-bis: normalize embed shape (PostgREST may return
  // single object or array). Preserves owner_name === clients.full_name AIA contract.
  const rawClient = draw?.jobs?.client as { full_name?: string } | { full_name?: string }[] | null | undefined;
  const client = Array.isArray(rawClient) ? rawClient[0] : rawClient;
  return {
    job_name: draw?.jobs?.name ?? "",
    job_address: draw?.jobs?.address ?? "",
    owner_name: client?.full_name ?? "",
    draw_number: draw?.draw_number ?? 0,
    period_start: draw?.period_start ?? null,
    period_end: draw?.period_end ?? null,
    current_payment_due: g702?.current_payment_due ?? 0,
    contract_sum_to_date: contract,
    total_completed: completed,
    percent_complete: contract > 0 ? (completed / contract) * 100 : 0,
    retainage: g702?.total_retainage ?? 0,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const membership = await getCurrentMembership();
    if (!membership) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const orgId = membership.org_id;

    const supabase = createServerClient();
    const draw = await loadDraw(supabase, params.id, orgId);
    if (!draw) return NextResponse.json({ error: "Draw not found" }, { status: 404 });

    const settings = await getWorkflowSettings(orgId);
    const template = settings.cover_letter_template;
    // loadDraw org-validated this draw above → safe to read canonical G702.
    const g702 = await canonicalG702ForDraw(params.id);
    const ctx = buildContext(draw, g702);
    const generated = !draw.cover_letter_text;
    const body = generated ? renderCoverLetter(template, ctx) : draw.cover_letter_text!;
    return NextResponse.json({
      template,
      body,
      generated,
      draw: {
        id: draw.id,
        draw_number: draw.draw_number,
        job_name: draw.jobs?.name ?? "",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const membership = await getCurrentMembership();
    if (!membership) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const orgId = membership.org_id;

    const supabase = createServerClient();
    const body = (await request.json()) as { cover_letter_text?: string };
    const text = (body.cover_letter_text ?? "").toString();
    const { error } = await supabase
      .from("draws")
      .update({ cover_letter_text: text.length > 0 ? text : null })
      .eq("id", params.id)
      .eq("org_id", orgId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity({
      org_id: orgId,
      entity_type: "draw",
      entity_id: params.id,
      action: "updated",
      details: { cover_letter_saved: true, length: text.length },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * POST acts as "regenerate from template". Wipes the saved body and
 * returns the freshly rendered text.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const membership = await getCurrentMembership();
    if (!membership) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const orgId = membership.org_id;

    const supabase = createServerClient();
    const draw = await loadDraw(supabase, params.id, orgId);
    if (!draw) return NextResponse.json({ error: "Draw not found" }, { status: 404 });

    const settings = await getWorkflowSettings(orgId);
    const g702 = await canonicalG702ForDraw(params.id);
    const ctx = buildContext(draw, g702);
    const body = renderCoverLetter(settings.cover_letter_template, ctx);

    await supabase
      .from("draws")
      .update({ cover_letter_text: null })
      .eq("id", params.id)
      .eq("org_id", orgId);

    await logActivity({
      org_id: orgId,
      entity_type: "draw",
      entity_id: params.id,
      action: "updated",
      details: { cover_letter_regenerated: true },
    });
    return NextResponse.json({ body, generated: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
