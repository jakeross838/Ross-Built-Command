/**
 * GET /api/clients?search=<query>
 *
 * F1-Wave-B Slice-1 Plan B-1a-bis (per ITER-2-PATCHES §3.5 C5/C6 + nwrp155 C5/C6).
 *
 * Returns up to 20 matching clients in the caller's org for the Combobox
 * autocomplete UI on:
 *   - /jobs/[id]/page.tsx edit form (replaces 3 client_name/email/phone inputs)
 *   - /jobs/new/page.tsx (new-job form)
 *
 * Response shape: `{ clients: Array<{ id: string; full_name: string }> }`.
 *
 * PII fence per Q1 (D-078 + D-079 + nwrp153): this endpoint returns
 * `id + full_name` ONLY. clients.email + clients.phone are NEVER returned via
 * any embed or shorthand select — restoration of email/phone display routes
 * through a future role-gated `/api/clients/[id]` GET endpoint (Slice-2 Plan
 * B-2 alongside Owner Portal Path A, see TD-B1abis-01).
 *
 * Auth + RLS:
 *   - getCurrentMembership() throws on no session; caller MUST be authenticated.
 *   - Query is double-fenced: explicit `eq("org_id", membership.org_id)`
 *     filter PLUS RLS on the `clients` table (Q10b direct-filter on org_id).
 *     Belt-and-suspenders per defense-in-depth.
 *
 * Find-or-create flow:
 *   - When the Combobox shows "Create new client: <typed text>" and the user
 *     selects it, the consumer (job edit form) calls /api/jobs PATCH with body
 *     `{ client_name_for_create: <typed text> }`. The /api/jobs route does the
 *     server-side find-or-create against clients table + writes the audit_log
 *     entry per ITER-2-PATCHES §3.2 B5.
 */

import { NextResponse } from "next/server";
import { getCurrentMembership } from "@/lib/org/session";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  const membership = await getCurrentMembership();
  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("search") ?? "";
  if (query.length < 2) {
    return NextResponse.json({ clients: [] });
  }

  const supabase = createServerClient();
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, full_name") // NB: id + full_name ONLY — PII fence per Q1
    .eq("org_id", membership.org_id)
    .is("deleted_at", null)
    .ilike("full_name", `%${query}%`)
    .order("full_name", { ascending: true })
    .limit(20);

  if (error) {
    console.error("[api/clients] search query error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }

  return NextResponse.json({ clients: clients ?? [] });
}
