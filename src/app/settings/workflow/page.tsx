// src/app/settings/workflow/page.tsx
//
// SHELVED / F3-DEFERRED (TD-WE-05, marked 2026-05-15 per nwrp149/150).
//
// This server component is NO LONGER REACHED at runtime. The /settings/workflow
// route is redirected to /admin/workflow-customization by the 1.5c-IA contract
// (D-058 + D-060 — Admin section overview is the canonical destination).
// The destination at /admin/workflow-customization currently renders a
// "Coming F3" placeholder card; the actual workflow-customization form
// (this file + WorkflowSettingsForm.tsx) is shelved pending F3 revival.
//
// CODE BELOW IS REAL, FUNCTIONAL, AND TESTED — getCurrentMembership +
// PM redirect + getWorkflowSettings + org_members PM-list query + form
// render are all wired correctly. The page renders 2 <select> form
// controls (Default-PM-for-unmatched-jobs + status-flow selectors).
//
// DO NOT DELETE. F3 will either:
//   (a) Revive this code by removing the /settings/workflow → /admin/workflow-
//       customization redirect, OR
//   (b) Migrate this code into a new admin-section component, OR
//   (c) Explicitly delete with a fresh decision (and the WorkflowSettingsForm
//       component) — author a D-### entry first.
//
// Smoke harness: scripts/wave-d-smoke.ts targets /settings/workflow with an
// H1-anchored selector against the redirect destination (verifies redirect
// chain AND placeholder renders). Restore a `'select'`-anchored selector when
// F3 revives this code.
//
// Context: nwrp149 (live DOM probe surfacing 1.5c-IA route relocation + F3
// deferral); nwrp150 (disposition: option d3 — both files stay, shelved
// state made explicit via this header comment).

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
