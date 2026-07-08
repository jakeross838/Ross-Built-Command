import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/server";
import { ApiError, withApiError } from "@/lib/api/errors";
import { getCurrentMembership } from "@/lib/org/session";
import { checkPlanLimit, planDisplayName } from "@/lib/plan-limits";
import { recalcDraftDrawsForJob } from "@/lib/draw-calc";
import { recalcJobContract } from "@/lib/recalc";
import { logActivity, logStatusChange } from "@/lib/activity-log";

/**
 * Resolve client_id from job body — F1-Wave-B Slice-1 B-1a-bis.
 *
 * Returns the canonical client_id to write on the jobs row, or null when no
 * client identity is supplied. Three input paths:
 *   1. body.client_id set + exists in caller's org -> return that id.
 *   2. body.client_id set + does NOT exist in caller's org -> throw 400.
 *   3. body.client_name_for_create set (non-empty) -> find-or-create:
 *        - find: lookup clients where (org_id, lower(trim(full_name)))
 *          matches existing rows.
 *        - create: INSERT new clients row + write activity_log per nwrp155 B5.
 *      Email + phone are NEVER written by this path (NAME-ONLY per §3.12).
 *      Restoration: /api/clients/[id] PATCH (Slice-2 Plan B-2).
 *   4. Neither supplied -> return null (job has no client identity).
 *
 * Cross-org check (per ITER-2-PATCHES §3.13): the SELECT for client_id path
 * filters on `eq("org_id", membership.org_id)`. If a request supplies a valid
 * UUID belonging to a different org, the query returns null and we throw 400.
 * This is belt-and-suspenders alongside RLS on the clients table.
 */
async function resolveClientId(
  supabase: SupabaseClient,
  body: { client_id?: string | null; client_name_for_create?: string },
  membership: { org_id: string; user_id: string },
): Promise<string | null> {
  // Path 1+2: explicit client_id reference
  if (body.client_id) {
    const { data: clientCheck } = await supabase
      .from("clients")
      .select("id")
      .eq("id", body.client_id)
      .eq("org_id", membership.org_id) // belt-and-suspenders cross-org check
      .is("deleted_at", null)
      .maybeSingle();
    if (!clientCheck) {
      throw new ApiError("Invalid client_id", 400);
    }
    return body.client_id;
  }

  // Path 3: find-or-create from typed text
  const typedName = body.client_name_for_create?.trim();
  if (typedName) {
    const lookupName = typedName.toLowerCase();
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("org_id", membership.org_id)
      .ilike("full_name", typedName) // ILIKE for case-insensitive exact match
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    if (existingClient) {
      return existingClient.id as string;
    }

    // INSERT new clients row. Per §3.12: NAME-ONLY (email + phone NULL).
    const { data: newClient, error: insertError } = await supabase
      .from("clients")
      .insert({
        org_id: membership.org_id,
        full_name: typedName,
        created_by: membership.user_id,
      })
      .select("id, full_name")
      .single();
    if (insertError) {
      // F1-Wave-B Slice-2 B-4 Task 5 (TD-B1abis-01 race-catch): two
      // concurrent identical-name find-or-create requests both miss the
      // prior ilike find above, both proceed to INSERT, and the second
      // hits the partial unique index `idx_clients_org_name_email_unique`
      // (migration 00100) which throws SQLSTATE 23505 (unique_violation).
      // Pre-fix: 500 to the UX. Post-fix: re-find branch returns the
      // winner's id; UX surfaces 200 with that id. Idempotent semantics
      // for the find-or-create contract per nwrp166 §11 carry-forward.
      if ((insertError as { code?: string }).code === "23505") {
        const { data: raceWinner } = await supabase
          .from("clients")
          .select("id")
          .eq("org_id", membership.org_id)
          .ilike("full_name", typedName)
          .is("deleted_at", null)
          .limit(1)
          .maybeSingle();
        if (raceWinner) {
          return (raceWinner as { id: string }).id;
        }
      }
      throw new ApiError(`Failed to create client: ${insertError.message}`, 500);
    }

    // Audit log entry per nwrp155 B5 + ITER-2-PATCHES §3.2.
    // Email + phone NOT logged per Q1 PII fence (even in audit_log details).
    await logActivity({
      org_id: membership.org_id,
      user_id: membership.user_id,
      entity_type: "client",
      entity_id: newClient.id,
      action: "created",
      details: {
        source: "jobs_find_or_create",
        full_name: newClient.full_name,
      },
    });

    // Reference local variable so unused-binding lint stays clean when
    // lookupName is not referenced after the ilike call above.
    void lookupName;
    return newClient.id as string;
  }

  // Path 4: nothing supplied
  return null;
}

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Next.js App Router restricts exports in route.ts to HTTP handlers and a
// small set of metadata constants. These enum allow-lists stay
// file-private; if another module ever needs them they'll move to
// src/lib/types/jobs.ts.
const CONTRACT_TYPES = [
  "cost_plus_aia",
  "cost_plus_open_book",
  "fixed_price",
  "gmp",
  "time_and_materials",
  "unit_price",
] as const;
type ContractType = (typeof CONTRACT_TYPES)[number];

const BILLING_METHODS = ["aia", "cost_plus_statement", "fixed_fee_schedule"] as const;
const MARKUP_DISPLAYS = ["own_line", "blended"] as const;
const BACKUP_DETAILS = ["summary", "detailed", "detailed_with_pdfs"] as const;

const JOB_PHASES = [
  "lead",
  "estimating",
  "contracted",
  "pre_construction",
  "in_progress",
  "substantially_complete",
  "closed",
  "warranty",
  "archived",
] as const;
type JobPhase = (typeof JOB_PHASES)[number];

type JobBody = {
  name?: string;
  address?: string | null;
  // F1-Wave-B Slice-1 B-1a-bis: client identity via FK only. POST/PATCH accepts
  //   - client_id: UUID of an existing clients row in the caller's org (per
  //     §3.13 cross-org check), OR
  //   - client_name_for_create: server-side find-or-create against clients
  //     table (per ITER-2-PATCHES §3.5 + §3.12 NAME-ONLY contract).
  // Body MUST NOT include client_name/client_email/client_phone — those are
  // rejected at request validation (returns 400). Email + phone collection
  // routes through /api/clients/[id] PATCH (admin-gated, Slice-2 Plan B-2).
  client_id?: string | null;
  client_name_for_create?: string;
  contract_type?: ContractType;
  billing_method?: string;           // 'aia' | 'cost_plus_statement' | 'fixed_fee_schedule'
  markup_display?: string | null;    // 'own_line' | 'blended' | null (inherit org)
  backup_detail?: string | null;     // 'summary' | 'detailed' | 'detailed_with_pdfs' | null
  phase?: JobPhase;
  original_contract_amount?: number; // cents
  deposit_percentage?: number;       // FRACTION 0..1 (e.g. 0.10 = 10%) — see contract-units
  gc_fee_percentage?: number;        // FRACTION 0..1 (e.g. 0.20 = 20%) — see contract-units
  retainage_percent?: number;        // 0..100 (whole percent, e.g. 10 = 10%)
  // Phase D baseline fields — how much of the job's history predates Nightwork.
  starting_application_number?: number;  // 1-based; default 1 = Nightwork's first draw is App #1
  previous_certificates_total?: number;  // cents — pre-Nightwork certified payments
  previous_change_orders_total?: number; // cents — pre-Nightwork net CO total (incl. fees)
  pm_id?: string | null;
  contract_date?: string | null;     // YYYY-MM-DD
  status?: "active" | "complete" | "warranty" | "cancelled";
};

export const POST = withApiError(async (request: NextRequest) => {
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ApiError("Not authenticated", 401);

  const membership = await getCurrentMembership();
  if (!membership) throw new ApiError("No active organization", 403);
  if (membership.role !== "admin" && membership.role !== "owner") {
    throw new ApiError("Only admins can create jobs", 403);
  }

  const body: JobBody = await request.json();

  if (!body.name || !body.name.trim()) {
    throw new ApiError("Job name is required", 400);
  }
  if (body.contract_type && !CONTRACT_TYPES.includes(body.contract_type)) {
    throw new ApiError("Invalid contract_type", 400);
  }
  if (body.billing_method && !(BILLING_METHODS as readonly string[]).includes(body.billing_method)) {
    throw new ApiError("Invalid billing_method", 400);
  }
  if (body.phase && !JOB_PHASES.includes(body.phase)) {
    throw new ApiError("Invalid phase", 400);
  }
  if (body.status && !["active", "complete", "warranty", "cancelled"].includes(body.status)) {
    throw new ApiError("Invalid status", 400);
  }

  // Only active jobs count toward the plan limit — completed/warranty/cancelled
  // don't consume a slot. We only need to guard creation when the new job will
  // actually be active; completed-at-creation is a rare import path.
  const incomingStatus = body.status ?? "active";
  if (incomingStatus === "active") {
    const jobsCheck = await checkPlanLimit(membership.org_id, "active_jobs");
    if (!jobsCheck.allowed) {
      throw new ApiError(
        `You've reached your active job limit (${jobsCheck.current} of ${jobsCheck.limit}) on ${planDisplayName(jobsCheck.plan)}. Upgrade your plan or complete an existing job to start a new one.`,
        402
      );
    }
  }

  const original = Math.max(0, Math.round(body.original_contract_amount ?? 0));

  // Inherit org's default retainage when caller doesn't override it. Ross
  // Built's org default is 0; new orgs default to 10.
  let retainageToUse: number | undefined;
  if (body.retainage_percent !== undefined) {
    retainageToUse = Number(body.retainage_percent);
  } else {
    const { data: orgRow } = await supabase
      .from("organizations")
      .select("default_retainage_percent")
      .eq("id", membership.org_id)
      .maybeSingle();
    const dflt =
      (orgRow as { default_retainage_percent?: number } | null)?.default_retainage_percent;
    if (dflt !== undefined && dflt !== null) retainageToUse = Number(dflt);
  }

  // F1-Wave-B Slice-1 B-1a-bis: resolve client_id from body (existing or
  // find-or-create). Throws 400 on cross-org client_id; throws 500 on insert
  // failure. NAME-ONLY find-or-create per §3.12 PII-fence contract.
  const resolvedClientId = await resolveClientId(supabase, body, {
    org_id: membership.org_id,
    user_id: user.id,
  });

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      name: body.name.trim(),
      address: body.address ?? null,
      client_id: resolvedClientId,
      contract_type: body.contract_type ?? "cost_plus_aia",
      ...(body.billing_method ? { billing_method: body.billing_method } : {}),
      ...(body.phase ? { phase: body.phase } : {}),
      original_contract_amount: original,
      current_contract_amount: original, // start equal; COs adjust later
      // FRACTION scale (0..1) — draw-calc reads these directly. The prior
      // ?? 10 / ?? 20 fallbacks were whole-scale (would store 1000%/2000%);
      // all callers send fractions, but the safe default must match the scale.
      deposit_percentage: body.deposit_percentage ?? 0.1,
      gc_fee_percentage: body.gc_fee_percentage ?? 0.2,
      ...(retainageToUse !== undefined ? { retainage_percent: retainageToUse } : {}),
      pm_id: body.pm_id ?? null,
      contract_date: body.contract_date ?? null,
      status: body.status ?? "active",
      org_id: membership.org_id,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) throw new ApiError(error.message, 500);

  return NextResponse.json({ id: data.id });
});

export const PATCH = withApiError(async (request: NextRequest) => {
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ApiError("Not authenticated", 401);

  const membership = await getCurrentMembership();
  if (!membership || (membership.role !== "admin" && membership.role !== "owner")) {
    throw new ApiError("Only admins can edit jobs", 403);
  }

  const body: JobBody & { id: string } = await request.json();
  if (!body.id) throw new ApiError("Missing job id", 400);

  // Read current value so we can detect an actual retainage change and
  // cascade it to draft draws. Also used for activity-log deltas.
  // Q12 uniform-rule: also fetch status + status_history so we can append
  // a transition entry when body.status changes.
  const { data: existing } = await supabase
    .from("jobs")
    .select("retainage_percent, org_id, status, status_history")
    .eq("id", body.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!existing) throw new ApiError("Job not found", 404);
  const previousRetainage = Number(
    (existing as { retainage_percent?: number }).retainage_percent ?? 0
  );
  const previousStatus = (existing as { status: string }).status;

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.address !== undefined) patch.address = body.address;
  // F1-Wave-B Slice-1 B-1a-bis: client identity via FK only. Body MUST NOT
  // include client_name/client_email/client_phone — those columns were dropped
  // by migration 00101. Accept client_id (existing in caller's org) OR
  // client_name_for_create (server-side find-or-create + audit_log).
  // resolveClientId handles cross-org check (400) + find-or-create (500 on
  // insert error). NAME-ONLY per §3.12.
  if (body.client_id !== undefined || body.client_name_for_create !== undefined) {
    patch.client_id = await resolveClientId(supabase, body, {
      org_id: membership.org_id,
      user_id: user.id,
    });
  }
  if (body.contract_type !== undefined) {
    if (!CONTRACT_TYPES.includes(body.contract_type)) {
      throw new ApiError("Invalid contract_type", 400);
    }
    patch.contract_type = body.contract_type;
  }
  if (body.billing_method !== undefined) {
    if (!(BILLING_METHODS as readonly string[]).includes(body.billing_method)) {
      throw new ApiError("Invalid billing_method", 400);
    }
    patch.billing_method = body.billing_method;
  }
  if (body.markup_display !== undefined) {
    if (body.markup_display !== null && !(MARKUP_DISPLAYS as readonly string[]).includes(body.markup_display)) {
      throw new ApiError("Invalid markup_display", 400);
    }
    patch.markup_display = body.markup_display; // null = inherit org default
  }
  if (body.backup_detail !== undefined) {
    if (body.backup_detail !== null && !(BACKUP_DETAILS as readonly string[]).includes(body.backup_detail)) {
      throw new ApiError("Invalid backup_detail", 400);
    }
    patch.backup_detail = body.backup_detail; // null = inherit org default
  }
  if (body.phase !== undefined) {
    if (!JOB_PHASES.includes(body.phase)) {
      throw new ApiError("Invalid phase", 400);
    }
    patch.phase = body.phase;
  }
  let originalContractChanged = false;
  if (body.original_contract_amount !== undefined) {
    patch.original_contract_amount = body.original_contract_amount;
    originalContractChanged = true;
    // current_contract_amount is NOT set here. It is DERIVED (original +
    // approved COs) and re-stamped by recalcJobContract() after the UPDATE
    // (see below). That both fixes the setup-card $0 re-prompt (Gavin: no COs
    // -> current = original) AND is CO-safe (Fish: current = original + COs),
    // where the old current = original lockstep would have wiped CO value.
  }
  if (body.deposit_percentage !== undefined) patch.deposit_percentage = body.deposit_percentage;
  if (body.gc_fee_percentage !== undefined) patch.gc_fee_percentage = body.gc_fee_percentage;

  let retainageChanged = false;
  let newRetainage = previousRetainage;
  if (body.retainage_percent !== undefined) {
    const pct = Number(body.retainage_percent);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      throw new ApiError("retainage_percent must be between 0 and 100", 400);
    }
    patch.retainage_percent = pct;
    newRetainage = pct;
    retainageChanged = pct !== previousRetainage;
  }
  if (body.pm_id !== undefined) patch.pm_id = body.pm_id;
  if (body.contract_date !== undefined) patch.contract_date = body.contract_date;
  if (body.status !== undefined) patch.status = body.status;

  // Q12 uniform-rule (status_history append on every transition). The append
  // happens INSIDE the patch object so the UPDATE writes both status and
  // status_history atomically. user.id is guaranteed non-null here (auth gate
  // at line 156); no `?? null` fallback needed (jobs PATCH only — lien-releases
  // routes use `actorId ?? null` per iter-2 HF-A1-1 because their actor fetch
  // can return null in service-role / RPC fan-out cases).
  let statusChanged = false;
  if (typeof body.status === "string" && body.status !== previousStatus) {
    statusChanged = true;
    const existingHistory = Array.isArray(
      (existing as { status_history?: unknown }).status_history
    )
      ? ((existing as { status_history: unknown[] }).status_history)
      : [];
    const entry = {
      who: user.id,
      when: new Date().toISOString(),
      old_status: previousStatus,
      new_status: body.status,
      note: null,
    };
    patch.status_history = [...existingHistory, entry];
  }
  // `!= null` (not `!== undefined`): a form field that's null in the DB
  // reaches the body as null, and Number(null) === 0 would fail the `< 1`
  // guard even though the field displayed its `?? 1` default. Skip null +
  // undefined alike so an untouched field never trips its own validator.
  if (body.starting_application_number != null) {
    const n = Number(body.starting_application_number);
    if (Number.isNaN(n) || n < 1) {
      throw new ApiError("starting_application_number must be ≥ 1", 400);
    }
    patch.starting_application_number = n;
  }
  if (body.previous_certificates_total != null) {
    const n = Number(body.previous_certificates_total);
    patch.previous_certificates_total = Number.isNaN(n) ? 0 : Math.max(0, Math.round(n));
  }
  if (body.previous_change_orders_total != null) {
    const n = Number(body.previous_change_orders_total);
    patch.previous_change_orders_total = Number.isNaN(n) ? 0 : Math.round(n);
  }

  // F1-Wave-B Slice-2 B-4 Task 4 (MEDIUM-1 fix) per nwrp166 §10 carry-forward +
  // B-1a-bis QA cross-reviewer agreement (rls-auditor + security-reviewer both
  // flagged this UPDATE chain missing the `.eq("org_id", ...)` defense-in-depth
  // filter). RLS at DB layer still gates writes to authenticated user's org, BUT
  // application-layer filter is required by CLAUDE.md "Multi-tenant RLS BY
  // CONSTRUCTION" + "Every API route uses getCurrentMembership() before DB
  // access. RLS alone is a backstop, not a substitute for application-layer
  // auth. A dropped policy must not cause a leak. Filter every query by
  // membership.org_id." Closes MEDIUM-1 carry-forward filed in MASTER-PLAN §11.
  const { error } = await supabase
    .from("jobs")
    .update(patch)
    .eq("id", body.id)
    .eq("org_id", membership.org_id)
    .is("deleted_at", null);

  if (error) throw new ApiError(error.message, 500);

  // Q12 uniform-rule (cross-entity activity_log row). NEW coverage — this route
  // previously logged only retainage/baseline changes. entity_type='job' is
  // already in the ActivityEntityType union (src/lib/activity-log.ts:27 + 37);
  // action='status_changed' is in ActivityAction (line 36). UI label mapping
  // exists in src/lib/audit/action-labels.ts (entity_type='job' -> "Job",
  // action='status_changed' -> "status changed").
  //
  // iter-2 HF-A1-3 (scope-exclusion): this plan does NOT migrate audit-log
  // strategy. entity_type stays TEXT (not Postgres ENUM); Strategy 1-prime
  // preserved. entity_type='job' is consistent with D-051 Bills/Pay-Apps rename
  // (jobs is universal parent, not subject to entity rename). Wave-B Plan B-4
  // handles any future ENUM migration; rows written here remain readable post-B-4.
  if (statusChanged) {
    await logStatusChange({
      org_id: (existing as { org_id: string }).org_id,
      user_id: user.id,
      entity_type: "job",
      entity_id: body.id,
      from: previousStatus,
      to: body.status as string,
    });
  }

  // Cascade: when retainage OR any baseline-history field changes,
  // recompute draft draws so Line 2/5a-c/6/7/8/9 and Application # stay
  // in sync. Submitted/approved/locked/paid draws keep their captured
  // values — retroactive changes there would be a revision event, not a
  // silent edit.
  // When the original contract changes, re-derive current_contract_amount
  // (= original + approved COs) from source. Runs BEFORE the draft-draw
  // recompute so draws read the fresh contract.
  if (originalContractChanged) {
    await recalcJobContract(body.id);
  }

  const baselineChanged =
    originalContractChanged ||
    body.starting_application_number !== undefined ||
    body.previous_certificates_total !== undefined ||
    body.previous_change_orders_total !== undefined;
  if (retainageChanged || baselineChanged) {
    const recomputed = await recalcDraftDrawsForJob(body.id);
    await logActivity({
      org_id: (existing as { org_id: string }).org_id,
      user_id: user.id,
      entity_type: "job",
      entity_id: body.id,
      action: "updated",
      details: {
        field: "retainage_percent",
        from: previousRetainage,
        to: newRetainage,
        draft_draws_recomputed: recomputed,
      },
    });
  }

  return NextResponse.json({ ok: true });
});
