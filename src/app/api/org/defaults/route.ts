import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  getCurrentMembership,
  getCurrentOrg,
  getMembershipFromRequest,
} from "@/lib/org/session";

export const dynamic = "force-dynamic";

// Org creation defaults for the New Job slide-over (Pattern 3, F4): the real
// org financial defaults (deposit %, GC fee %) from /admin/financial, plus the
// PM roster for the ADJUST panel. Computed SERVER-SIDE (standing pattern — no
// client-side supabase auth in a load path). There is NO org "default PM"
// setting, so the slide-over shows "—" and PM is chosen under ADJUST.
export async function GET(request: NextRequest) {
  const membership = getMembershipFromRequest(request) ?? (await getCurrentMembership());
  if (!membership) {
    return NextResponse.json({ deposit: 0.1, gcFee: 0.2, pms: [] });
  }

  const org = await getCurrentOrg();
  const supabase = createServerClient();
  const { data: members } = await supabase
    .from("org_members")
    .select("user_id, profile:profiles (id, full_name)")
    .eq("org_id", membership.org_id)
    .eq("is_active", true)
    .in("role", ["pm", "admin"]);

  const pms = (
    (members as Array<{
      user_id: string;
      profile: { id: string; full_name: string } | { id: string; full_name: string }[] | null;
    }> | null) ?? []
  )
    .map((m) => {
      const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile;
      return profile && profile.id && profile.full_name
        ? { id: profile.id, full_name: profile.full_name }
        : null;
    })
    .filter((p): p is { id: string; full_name: string } => p !== null)
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  return NextResponse.json({
    deposit: org?.default_deposit_percentage ?? 0.1,
    gcFee: org?.default_gc_fee_percentage ?? 0.2,
    billingMethod:
      (org as { default_billing_method?: string } | null)?.default_billing_method ??
      "cost_plus_statement",
    pms,
  });
}
