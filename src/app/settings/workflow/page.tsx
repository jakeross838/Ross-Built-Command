import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/org/session";
import { getWorkflowSettings } from "@/lib/workflow-settings";
import { createServerClient } from "@/lib/supabase/server";
import WorkflowSettingsForm from "./WorkflowSettingsForm";

export const dynamic = "force-dynamic";

export default async function WorkflowSettingsPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");
  if (membership.role === "pm") {
    redirect("/settings/company");
  }

  const supabase = createServerClient();
  const [settings, pmList] = await Promise.all([
    getWorkflowSettings(membership.org_id),
    // PMs who can be the default assignee for unmatched invoices in bulk import.
    // Plan D-1 (Wave-D Issue 1 fix): hint syntax updated to `profile:profiles (...)`
    // resolving via the FK org_members_user_id_profiles_fkey created in 00098.
    supabase
      .from("org_members")
      .select("user_id, profile:profiles (id, full_name)")
      .eq("org_id", membership.org_id)
      .eq("is_active", true)
      .in("role", ["pm", "admin", "owner"]),
  ]);

  type PmRow = { user_id: string; profile: { id: string; full_name: string | null } | { id: string; full_name: string | null }[] | null };
  const pms = (pmList.data ?? [])
    .map((r) => {
      const rec = r as unknown as PmRow;
      const profile = Array.isArray(rec.profile) ? rec.profile[0] : rec.profile;
      return profile?.id && profile.full_name
        ? { id: profile.id, name: profile.full_name }
        : null;
    })
    .filter((p): p is { id: string; name: string } => p !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  return <WorkflowSettingsForm settings={settings} pms={pms} />;
}
