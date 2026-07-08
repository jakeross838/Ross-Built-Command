import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org/session";
import { matchJobForInvoice, loadJobCandidates } from "@/lib/invoices/job-matcher";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * Re-run job resolution for a parsed invoice against the CURRENT job list.
 *
 * Item 3 — a parse can run before a job exists (stale NO MATCH that sticks for
 * the whole session). The upload card calls this when its job combobox opens or
 * the job list changes so a now-existing job resolves without the user having to
 * type. Uses the same matcher (matchJobForInvoice) as the parse route, so the
 * scoring is identical.
 */
export async function POST(req: NextRequest) {
  const membership = await getCurrentMembership();
  if (!membership) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    job_reference?: string | null;
    vendor_name?: string | null;
    description?: string | null;
    filename?: string | null;
  };

  // Session client → RLS scopes candidates to this user's org (tenant-safe by
  // construction; same path the parse route uses). No service role here.
  const supabase = createServerClient();
  try {
    const jobs = await loadJobCandidates(supabase);
    const match = matchJobForInvoice(jobs, {
      job_reference_raw: body.job_reference ?? null,
      vendor_name_raw: body.vendor_name ?? null,
      description: body.description ?? null,
      filename: body.filename ?? null,
    });
    if (match && match.score >= 3 && !match.ambiguous) {
      return NextResponse.json({ job: { id: match.job.id, name: match.job.name } });
    }
    return NextResponse.json({ job: null });
  } catch (err) {
    console.error("[api/jobs/resolve] failed:", err);
    return NextResponse.json({ job: null });
  }
}
