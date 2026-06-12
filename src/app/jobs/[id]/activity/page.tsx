// src/app/jobs/[id]/activity/page.tsx
//
// W-4 (per nwrp282 / TD-NW-PER-JOB-TAB-WIRING): WIRED — per-job activity
// feed. activity_log has no job_id column; per-job scope = rows whose
// entity_id is the job itself OR any of the job's invoices / draws /
// change orders / purchase orders (the jobs/health route's linkage model).
// Labels via the canonical auditLabel helper (CLAUDE.md audit-log
// strategy); actor names resolved from profiles. Server component;
// org-scoped; latest 50.

import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org/session";
import JobFinancialBar from "@/components/job-financial-bar";
import { auditLabel } from "@/lib/audit/action-labels";
import type {
  ActivityAction,
  ActivityEntityType,
} from "@/lib/activity-log";

export default async function JobActivityPage({
  params,
}: {
  params: { id: string };
}) {
  const membership = await getCurrentMembership();
  if (!membership) return notFound();
  const supabase = createServerClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("id, name")
    .eq("id", params.id)
    .eq("org_id", membership.org_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!job) return notFound();

  // Gather the job's entity universe (ids only — cheap, indexed).
  const [inv, drw, cos, pos] = await Promise.all([
    supabase.from("invoices").select("id").eq("job_id", params.id).eq("org_id", membership.org_id),
    supabase.from("draws").select("id").eq("job_id", params.id).eq("org_id", membership.org_id),
    supabase.from("change_orders").select("id").eq("job_id", params.id).eq("org_id", membership.org_id),
    supabase.from("purchase_orders").select("id").eq("job_id", params.id).eq("org_id", membership.org_id),
  ]);
  const entityIds = [
    params.id,
    ...(inv.data ?? []).map((r) => r.id as string),
    ...(drw.data ?? []).map((r) => r.id as string),
    ...(cos.data ?? []).map((r) => r.id as string),
    ...(pos.data ?? []).map((r) => r.id as string),
  ];

  const { data: events } = await supabase
    .from("activity_log")
    .select("id, user_id, entity_type, entity_id, action, details, created_at")
    .eq("org_id", membership.org_id)
    .in("entity_id", entityIds)
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = events ?? [];

  // Resolve actor names in one shot.
  const userIds = Array.from(
    new Set(rows.map((r) => r.user_id as string | null).filter(Boolean))
  ) as string[];
  const nameById = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      nameById.set(p.id as string, (p.full_name as string | null) ?? "");
    }
  }

  return (
    <div data-direction="C" data-palette="B" className="design-system-scope">
      <main className="max-w-[1100px] mx-auto px-4 md:px-6 py-8">
        <span
          className="block mb-2 text-[10px] uppercase"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            letterSpacing: "0.14em",
            color: "var(--text-tertiary)",
          }}
        >
          Job · Activity
        </span>
        <h2
          className="m-0 mb-4"
          style={{
            fontFamily: "var(--font-space-grotesk)",
            fontWeight: 500,
            fontSize: "30px",
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
          }}
        >
          {job.name as string}
        </h2>
        <JobFinancialBar jobId={params.id} />

        {rows.length === 0 ? (
          <div className="border border-[var(--border-default)] bg-[var(--bg-card)] px-6 py-10 text-center text-sm text-[color:var(--text-secondary)]">
            No activity recorded on this job yet.
          </div>
        ) : (
          <ul className="bg-[var(--bg-card)] border border-[var(--border-default)] divide-y divide-[var(--border-default)]">
            {rows.map((e) => {
              const label = auditLabel(
                e.entity_type as ActivityEntityType,
                e.action as ActivityAction
              );
              const who = e.user_id
                ? nameById.get(e.user_id as string) || "System"
                : "System";
              const when = new Date(e.created_at as string).toLocaleString(
                "en-US",
                { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
              );
              return (
                <li key={e.id as string} className="px-4 py-3 flex items-baseline gap-3">
                  <span
                    className="shrink-0 text-[10px] uppercase"
                    style={{
                      fontFamily: "var(--font-jetbrains-mono)",
                      letterSpacing: "0.1em",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {when}
                  </span>
                  <span className="text-sm text-[color:var(--text-primary)]">
                    {label.summary}
                  </span>
                  <span className="ml-auto shrink-0 text-[11px] text-[color:var(--text-secondary)]">
                    {who}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
