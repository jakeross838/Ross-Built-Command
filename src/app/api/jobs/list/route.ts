import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentMembership, getMembershipFromRequest } from "@/lib/org/session";

export const dynamic = "force-dynamic";

// Lightweight org job list for the Job-filter sidebar rail. SERVER-SIDE
// (standing pattern — no client-auth mount fetch). Returns non-deleted jobs
// (id + name + status) sorted by name; the rail filters lists in place by id.
export async function GET(request: NextRequest) {
  const membership = getMembershipFromRequest(request) ?? (await getCurrentMembership());
  if (!membership) {
    return NextResponse.json({ jobs: [] });
  }
  const supabase = createServerClient();
  const { data } = await supabase
    .from("jobs")
    .select("id, name, status")
    .eq("org_id", membership.org_id)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  const jobs = (data ?? []).map((j) => ({
    id: j.id as string,
    name: j.name as string,
    status: (j.status as string) ?? "active",
  }));

  return NextResponse.json({ jobs });
}
