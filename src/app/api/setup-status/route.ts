import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentMembership, getMembershipFromRequest } from "@/lib/org/session";

export const dynamic = "force-dynamic";

// Setup progress for the empty-Invoices SetupGuide. Computed SERVER-SIDE with
// the org's membership (the same reliable path /admin/cost-codes uses to read
// cost codes) so completion derives from actual data, not a stored flag — and
// avoids the client-side auth/RLS/timing fragility of doing these counts in the
// browser. Existence probes (limit 1) are all the guide needs.
export async function GET(request: NextRequest) {
  // Fast path: org from middleware-set headers (skips a redundant
  // auth.getUser() + org_members round-trip pair).
  const membership = getMembershipFromRequest(request) ?? (await getCurrentMembership());
  if (!membership) {
    return NextResponse.json({ costCodes: 0, jobs: 0, invoices: 0 });
  }
  const supabase = createServerClient();
  const org = membership.org_id;

  const [cc, jb, inv] = await Promise.all([
    supabase.from("cost_codes").select("id").eq("org_id", org).is("deleted_at", null).limit(1),
    supabase.from("jobs").select("id").eq("org_id", org).is("deleted_at", null).limit(1),
    supabase.from("invoices").select("id").eq("org_id", org).is("deleted_at", null).limit(1),
  ]);

  return NextResponse.json({
    costCodes: cc.data?.length ?? 0,
    jobs: jb.data?.length ?? 0,
    invoices: inv.data?.length ?? 0,
  });
}
