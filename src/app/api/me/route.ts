import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentMembership, getMembershipFromRequest } from "@/lib/org/session";

export const dynamic = "force-dynamic";

// Current user's role + profile, resolved SERVER-SIDE (standing pattern). The
// nav bar consumes this instead of the client-auth useCurrentRole hook, which
// sits on the client-auth strand path — when it stalled, the whole nav dropped
// to logo-only (PART 1 regression). Server auth is reliable (middleware keeps
// the cookie fresh), so role-dependent nav chrome (Admin ▾, ＋ New Job, badge)
// resolves without depending on the client auth singleton.
export async function GET(request: NextRequest) {
  const membership = getMembershipFromRequest(request) ?? (await getCurrentMembership());
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!membership || !user) {
    return NextResponse.json({ authenticated: false, id: null, full_name: "", role: null });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    authenticated: true,
    id: user.id,
    full_name: (profile?.full_name as string) ?? "",
    role: membership.role,
  });
}
