// src/app/admin/users/page.tsx
//
// Users management at /admin/users — REAL-LOGIC mount of /settings/team logic.
// Per Stage 1.5c Plan 6 + iter-2 mechanical #10: getCurrentMembership preserved
// verbatim (grep diff zero vs /settings/team/page.tsx). Logic unchanged; only
// the route path moved and user-visible labels rename Team → Users.
//
// The TeamSettings client component is re-used from /settings/team — its
// internal type imports from "./page" resolve to /settings/team/page (not
// this file), which is the intended behavior (same shape).
//
// Per CONTEXT D-22: redirect destination on insufficient role now lands at
// /admin (the canonical overview Card grid), not /settings/company.

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org/session";
import TeamSettings from "@/app/settings/team/TeamSettings";
import type { TeamMember, PendingInvite } from "@/app/settings/team/page";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");
  if (membership.role !== "admin" && membership.role !== "owner") {
    redirect("/admin");
  }

  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  type MemberRow = {
    id: string;
    user_id: string;
    role: TeamMember["role"];
    is_active: boolean;
    accepted_at: string | null;
    invited_at: string;
  };

  const { data: membersRaw } = await supabase
    .from("org_members")
    .select("id, user_id, role, is_active, accepted_at, invited_at")
    .eq("org_id", membership.org_id)
    .order("invited_at", { ascending: true });

  const userIds = (membersRaw ?? []).map((m) => m.user_id as string);
  const { data: profileRows } = userIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
    : { data: [] as { id: string; full_name: string; email: string | null }[] };

  const profileById = new Map(
    (profileRows ?? []).map((p) => [p.id as string, { full_name: p.full_name as string, email: p.email as string | null }])
  );

  const members: TeamMember[] = ((membersRaw ?? []) as MemberRow[]).map((m) => {
    const profile = profileById.get(m.user_id);
    return {
      id: m.id,
      user_id: m.user_id,
      full_name: profile?.full_name ?? "(unknown)",
      email: profile?.email ?? null,
      role: m.role,
      is_active: m.is_active,
      accepted_at: m.accepted_at,
      invited_at: m.invited_at,
    };
  });

  const { data: pendingRaw } = await supabase
    .from("org_invites")
    .select("id, email, role, token, invited_at, expires_at, accepted_at, revoked_at")
    .eq("org_id", membership.org_id)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .order("invited_at", { ascending: false });

  const pending: PendingInvite[] = (pendingRaw ?? []) as PendingInvite[];

  return (
    <TeamSettings
      currentUserId={user.id}
      members={members}
      pending={pending}
    />
  );
}
