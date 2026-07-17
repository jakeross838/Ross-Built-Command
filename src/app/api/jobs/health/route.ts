import { NextRequest, NextResponse } from "next/server";
import { ApiError, withApiError } from "@/lib/api/errors";
import {
  getCurrentMembership,
  getMembershipFromRequest,
} from "@/lib/org/session";
import { createServerClient } from "@/lib/supabase/server";
import { tryCreateServiceRoleClient } from "@/lib/supabase/service";
import { timed } from "@/lib/perf-log";
import { consumedByJob } from "@/lib/budget-consumption";

/**
 * GET /api/jobs/health
 *
 * Phase 8g — returns every job in the org enriched with health stats so the
 * job list can render colored health dots and quick stats without N+1 queries.
 *
 * Perf: all subsidiary queries run in parallel. Activity log resolution
 * uses type-scoped IN queries instead of broadcasting all IDs to all tables.
 */

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;
export const maxDuration = 30;

const PM_REVIEW_STATUSES = ["pm_review", "ai_processed"];

export interface JobHealth {
  id: string;
  name: string;
  address: string | null;
  // F1-Wave-B Slice-1 B-1a-bis: client identity reads via PostgREST embed
  // `client:clients(id, full_name)` per Q1 PII fence (D-078 + D-079 + nwrp153).
  // jobs.client_name/email/phone columns dropped by migration 00101; consumers
  // read client identity from clients table via jobs.client_id FK.
  client: { id: string; full_name: string } | null;
  contract_type: string;
  original_contract_amount: number;
  current_contract_amount: number;
  previous_certificates_total: number;
  contract_date: string | null;
  status: string;
  pm_id: string | null;
  pm_name: string | null;

  // Computed:
  health: "green" | "yellow" | "red";
  health_reasons: string[];
  pct_complete: number; // 0..100 (invoiced / revised_estimate sum)
  budget_used_pct: number; // 0..100
  open_invoices: number;
  oldest_invoice_days: number;
  last_activity_at: string | null;
  budget_total: number; // cents (revised)
  invoiced_total: number; // cents
}

export const GET = withApiError(async (req: NextRequest) => {
  const Tauth = Date.now();
  // Fast path — membership already resolved by middleware.
  const membership = getMembershipFromRequest(req) ?? (await getCurrentMembership());
  if (!membership) throw new ApiError("Not authenticated", 401);
  if (process.env.PERF_LOG === "1") {
    console.log(`[perf] jobs-health auth+membership: ${Date.now() - Tauth}ms`);
  }

  // Prefer service-role for aggregate efficiency; fall back to the user's
  // RLS-scoped session client when the service key isn't configured.
  const supabase = tryCreateServiceRoleClient() ?? createServerClient();

  const orgId = membership.org_id;
  const T0 = Date.now();

  // All subsidiary queries in a SINGLE wave, filtering by org_id instead of
  // waiting for jobs.by_org to return job_ids. Each row already carries
  // job_id so we can group client-side after the fact. Profile names for PMs
  // we fetch via a nested join on jobs (one extra relationship, still one
  // round-trip).
  const [
    jobsRes,
    budgetLinesRes,
    consumedMap,
    openInvoicesRes,
    pendingDrawsRes,
    jobActivityRes,
    invoiceActivityRes,
    drawActivityRes,
    orgProfilesRes,
  ] = await Promise.all([
    // F1-Wave-B Slice-1 B-1a-bis: client identity reads via embed `client:clients(id, full_name)`
    // per Q1 PII fence (D-078 + D-079 + nwrp153). Server-side flattening to `client_name` (line ~241)
    // preserves the JobHealth response-contract shape so consumers (jobs/page.tsx) don't need
    // a full type refactor for this read endpoint. PostgREST resolves via FK jobs_client_id_fkey
    // (created in migration 00100; auto-named by Postgres) per Workflow posture Rule 2 — FK
    // citation. ai-logic-tester verifies HTTP 200 + populated client.full_name at runtime.
    timed("jobs-health", "jobs.by_org", false,
      supabase.from("jobs")
        .select("id, name, address, client:clients(id, full_name), contract_type, original_contract_amount, current_contract_amount, previous_certificates_total, contract_date, status, pm_id")
        .eq("org_id", orgId).is("deleted_at", null).order("name")),
    timed("jobs-health", "budget_lines.by_org", false,
      supabase.from("budget_lines").select("job_id, revised_estimate")
        .eq("org_id", orgId).is("deleted_at", null)),
    // B2/Q8a: per-job consumption from the invoice_budget_consumption view
    // (migration 00123) — allocation-aware "billed to date"; the dead
    // budget_lines.invoiced column no longer feeds health/variance math.
    timed("jobs-health", "invoice_budget_consumption.by_org", false,
      consumedByJob(supabase, orgId)),
    timed("jobs-health", "invoices.pm_queue_by_org", false,
      supabase.from("invoices").select("job_id, received_date")
        .eq("org_id", orgId).in("status", PM_REVIEW_STATUSES).is("deleted_at", null)),
    timed("jobs-health", "draws.submitted_by_org", false,
      supabase.from("draws").select("job_id, submitted_at, updated_at")
        .eq("org_id", orgId).eq("status", "submitted").is("deleted_at", null)),
    timed("jobs-health", "activity_log.job_entity_by_org", false,
      supabase.from("activity_log").select("entity_id, created_at")
        .eq("org_id", orgId).eq("entity_type", "job")
        .order("created_at", { ascending: false }).limit(100)),
    timed("jobs-health", "invoices.last_updated_by_org", false,
      supabase.from("invoices").select("id, job_id, updated_at")
        .eq("org_id", orgId).is("deleted_at", null)
        .order("updated_at", { ascending: false }).limit(50)),
    timed("jobs-health", "draws.last_updated_by_org", false,
      supabase.from("draws").select("id, job_id, updated_at")
        .eq("org_id", orgId).is("deleted_at", null)
        .order("updated_at", { ascending: false }).limit(50)),
    // Pre-fetch all org PM names via org_members join — covers any PM on any job.
    // Plan D-1 (Wave-D Issue 1 fix): hint syntax updated to `profile:profiles (...)`
    // resolving via the FK org_members_user_id_profiles_fkey created in 00098.
    timed("jobs-health", "profiles.org_members", false,
      supabase.from("org_members")
        .select("user_id, profile:profiles (id, full_name)")
        .eq("org_id", orgId).eq("is_active", true)),
  ]);

  if (jobsRes.error) throw new ApiError(jobsRes.error.message, 500);
  // F1-Wave-B Slice-1 B-1a-bis: PostgREST embed `client:clients(id, full_name)`
  // returns a single object or null (one-to-one FK via jobs.client_id). Normalize
  // the embed: PostgREST may return it as either a single object OR an array (depends
  // on the relationship metadata). Force-single-object shape for consumer simplicity.
  type RawJobRow = Omit<JobHealth, "client" | "health" | "health_reasons" | "pct_complete" |
    "budget_used_pct" | "open_invoices" | "oldest_invoice_days" | "last_activity_at" |
    "budget_total" | "invoiced_total" | "pm_name"> & {
      client: { id: string; full_name: string } | { id: string; full_name: string }[] | null;
    };
  const rawJobs = (jobsRes.data ?? []) as Array<RawJobRow>;
  const jobList = rawJobs.map((j) => {
    const client = Array.isArray(j.client) ? (j.client[0] ?? null) : j.client;
    return {
      ...j,
      client,
    } as JobHealth;
  });
  if (jobList.length === 0) return NextResponse.json([]);

  if (process.env.PERF_LOG === "1") {
    console.log(`[perf] jobs-health GRAND TOTAL: ${Date.now() - T0}ms`);
  }

  // PM name map — orgProfilesRes is org_members with joined profiles.
  const pmNameMap = new Map<string, string>();
  for (const raw of (orgProfilesRes.data ?? []) as unknown as Array<Record<string, unknown>>) {
    const profile = Array.isArray(raw.profile) ? raw.profile[0] : raw.profile;
    const p = profile as { id?: string; full_name?: string | null } | null;
    if (p?.id && p.full_name) pmNameMap.set(p.id, p.full_name);
  }

  // Budget map — revised estimates only; consumed cents come from consumedMap.
  const budgetMap = new Map<string, { revised: number }>();
  for (const line of (budgetLinesRes.data ?? []) as Array<{
    job_id: string;
    revised_estimate: number | null;
  }>) {
    const cur = budgetMap.get(line.job_id) ?? { revised: 0 };
    cur.revised += line.revised_estimate ?? 0;
    budgetMap.set(line.job_id, cur);
  }

  // Open invoice map
  const openInvoiceMap = new Map<string, { count: number; oldestDays: number }>();
  for (const inv of (openInvoicesRes.data ?? []) as Array<{
    job_id: string;
    received_date: string | null;
  }>) {
    const cur = openInvoiceMap.get(inv.job_id) ?? { count: 0, oldestDays: 0 };
    cur.count += 1;
    cur.oldestDays = Math.max(cur.oldestDays, daysSince(inv.received_date));
    openInvoiceMap.set(inv.job_id, cur);
  }

  // Pending draw age map
  const pendingDrawAge = new Map<string, number>();
  for (const d of (pendingDrawsRes.data ?? []) as Array<{
    job_id: string;
    submitted_at: string | null;
    updated_at: string | null;
  }>) {
    const age = daysSince(d.submitted_at ?? d.updated_at);
    const cur = pendingDrawAge.get(d.job_id) ?? 0;
    if (age > cur) pendingDrawAge.set(d.job_id, age);
  }

  // Last activity map — combine job-direct, invoice, and draw timestamps
  const lastActivityByJob = new Map<string, string>();

  const setIfNewer = (jobId: string, ts: string) => {
    const existing = lastActivityByJob.get(jobId);
    if (!existing || ts > existing) lastActivityByJob.set(jobId, ts);
  };

  for (const r of (jobActivityRes.data ?? []) as Array<{ entity_id: string | null; created_at: string }>) {
    if (r.entity_id) setIfNewer(r.entity_id, r.created_at);
  }
  for (const r of (invoiceActivityRes.data ?? []) as Array<{ job_id: string | null; updated_at: string | null }>) {
    if (r.job_id && r.updated_at) setIfNewer(r.job_id, r.updated_at);
  }
  for (const r of (drawActivityRes.data ?? []) as Array<{ job_id: string | null; updated_at: string | null }>) {
    if (r.job_id && r.updated_at) setIfNewer(r.job_id, r.updated_at);
  }

  // Compute health
  const enriched: JobHealth[] = jobList.map((j) => {
    const budget = budgetMap.get(j.id) ?? { revised: 0 };
    const invoiced = consumedMap.get(j.id) ?? 0;
    const inv = openInvoiceMap.get(j.id) ?? { count: 0, oldestDays: 0 };
    const drawAge = pendingDrawAge.get(j.id) ?? 0;

    const variancePct = budget.revised > 0
      ? ((invoiced - budget.revised) / budget.revised) * 100
      : 0;
    const budgetUsedPct = budget.revised > 0 ? (invoiced / budget.revised) * 100 : 0;
    // Include pre-Nightwork baseline for mid-project imports.
    const baseline = (j as { previous_certificates_total?: number }).previous_certificates_total ?? 0;
    const revised = (j as { current_contract_amount?: number }).current_contract_amount ?? 0;
    const totalBilled = baseline + invoiced;
    const pctComplete = revised > 0 ? (totalBilled / revised) * 100 : budgetUsedPct;

    const reasons: string[] = [];
    let attentionCount = 0;
    if (variancePct > 15) {
      reasons.push(`Over budget by ${variancePct.toFixed(1)}%`);
      attentionCount += 2;
    } else if (variancePct > 5) {
      reasons.push(`Budget variance ${variancePct.toFixed(1)}%`);
      attentionCount += 1;
    }
    if (inv.oldestDays >= 14) {
      reasons.push(`Invoice pending ${inv.oldestDays} days`);
      attentionCount += 2;
    } else if (inv.oldestDays >= 7) {
      reasons.push(`Invoice pending ${inv.oldestDays} days`);
      attentionCount += 1;
    }
    if (drawAge >= 10) {
      reasons.push(`Submitted draw ${drawAge} days old`);
      attentionCount += 2;
    } else if (drawAge >= 5) {
      reasons.push(`Submitted draw ${drawAge} days old`);
      attentionCount += 1;
    }

    let health: "green" | "yellow" | "red" = "green";
    if (variancePct > 15 || inv.oldestDays >= 14 || drawAge >= 10 || attentionCount >= 3) {
      health = "red";
    } else if (variancePct > 5 || inv.oldestDays >= 7 || attentionCount >= 1) {
      health = "yellow";
    }

    return {
      ...j,
      pm_name: j.pm_id ? pmNameMap.get(j.pm_id) ?? null : null,
      health,
      health_reasons: reasons,
      pct_complete: Math.min(999, Math.max(0, pctComplete)),
      budget_used_pct: Math.min(999, Math.max(0, budgetUsedPct)),
      open_invoices: inv.count,
      oldest_invoice_days: inv.oldestDays,
      last_activity_at: lastActivityByJob.get(j.id) ?? null,
      budget_total: budget.revised,
      invoiced_total: invoiced,
    };
  });

  const res = NextResponse.json(enriched);
  res.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
  return res;
});

function daysSince(d: string | null | undefined): number {
  if (!d) return 0;
  const dt = new Date(d.includes("T") ? d : d + "T00:00:00");
  if (isNaN(dt.getTime())) return 0;
  return Math.floor((Date.now() - dt.getTime()) / (1000 * 60 * 60 * 24));
}
