#!/usr/bin/env node
/**
 * co-line-allocation.mjs — F6-family (nwrp286) 72-CO BACKFILL RAILS.
 *
 * The MECHANISM to allocate already-approved, header-only change orders to
 * budget lines by authoring their missing `change_order_lines`. Built for the
 * Fish backfill (72 COs, Σ base amount $799,510.34) but org-agnostic. This is
 * the rails ONLY — the LIVE Fish run is Jake's, gated on item-8 + his data.
 *
 * SAFETY (verification firewall, nwrp286):
 *   - DRY-RUN IS THE DEFAULT. Nothing is written without --apply.
 *   - Production guard fires on the RESOLVED org_id (the job's org), not just
 *     the --org arg. Ross Built (...0001) is refused unless
 *     --i-understand-this-is-production is passed (this run never passes it).
 *   - validate-ALL-then-insert: if ANY CO's allocations don't sum to its
 *     amount, NOTHING is inserted (no partial backfill).
 *   - Idempotent: a CO that already has non-deleted lines is SKIPPED unless
 *     --reallocate (which soft-deletes prior lines first).
 *   - Inserting lines on an approved CO fires trg_change_order_lines_sync ->
 *     recompute_budget_line_co_adjustments (validated cent-exact, nwrp286) and
 *     trg_change_order_lines_pricing_history (price-intel learns — benign/
 *     desirable; see runbook).
 *
 * The backfill target is the SUM OF CO BASE `amount` (fee-excluded) — NOT
 * total_with_fee. Allocating lines moves budget_lines.co_adjustments /
 * revised_estimate (G703 scheduled values) and leaves jobs.current_contract_
 * amount / G702 net_change_orders (fee-inclusive, header-driven) UNTOUCHED.
 *
 * GIT-BASH NOTE: run with MSYS_NO_PATHCONV=1 so leading-slash args/UUIDs are
 * not mangled into Windows paths (nwrp279 standing fix).
 *
 * USAGE:
 *   node scripts/backfill/co-line-allocation.mjs --job <JOB_UUID> --mapping <map.json> [--apply] [--reallocate]
 *   Env: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY.
 *   mapping JSON: { "<co_id>": [ { "budget_line_id": "<uuid>", "amount": <cents int>, "description"?: "..." }, ... ], ... }
 */

export const RB_ORG_ID = "00000000-0000-0000-0000-000000000001";

/** Refuse to mutate Ross Built (production) unless explicitly overridden. */
export function assertSafeOrg(resolvedOrgId, { allowProduction = false } = {}) {
  if (resolvedOrgId === RB_ORG_ID && !allowProduction) {
    throw new Error(
      "FATAL: resolved org is Ross Built (production, read-only per firewall). " +
        "Refusing to mutate. Pass --i-understand-this-is-production to override."
    );
  }
}

/** Validate one CO's allocations: >=1, each allocated, integer cents, Σ == co.amount. */
export function validateAllocation(co, allocations) {
  if (!Array.isArray(allocations) || allocations.length === 0) {
    return { ok: false, error: `CO ${co.id}: no allocations provided` };
  }
  for (const a of allocations) {
    if (!a || !a.budget_line_id) {
      return { ok: false, error: `CO ${co.id}: an allocation is missing budget_line_id` };
    }
    if (!Number.isInteger(a.amount)) {
      return { ok: false, error: `CO ${co.id}: allocation amount must be integer cents (got ${a && a.amount})` };
    }
  }
  const sum = allocations.reduce((s, a) => s + a.amount, 0);
  if (sum !== co.amount) {
    return {
      ok: false,
      error: `CO ${co.id}: allocations sum ${sum}c ($${(sum / 100).toFixed(2)}) != CO amount ${co.amount}c ($${(co.amount / 100).toFixed(2)})`,
    };
  }
  return { ok: true, sum };
}

/** Idempotency: skip if lines already exist (unless --reallocate). */
export function idempotencyDecision(co, existingLineCount, { reallocate = false } = {}) {
  if (existingLineCount > 0 && !reallocate) {
    return {
      action: "skip",
      reason: `CO ${co.id} already has ${existingLineCount} non-deleted line(s); pass --reallocate to replace`,
    };
  }
  if (existingLineCount > 0 && reallocate) return { action: "reallocate" };
  return { action: "insert" };
}

/** Shape allocations into change_order_lines insert rows. */
export function shapeLineRows(co, allocations) {
  return allocations.map((a, idx) => ({
    org_id: co.org_id,
    co_id: co.id,
    budget_line_id: a.budget_line_id,
    cost_code: a.cost_code ?? null,
    description: a.description ?? null,
    amount: a.amount,
    sort_order: a.sort_order ?? idx,
  }));
}

/**
 * Plan the whole run (validate-ALL-then-insert). If ANY CO is invalid, the
 * returned `plan` is EMPTY (structural no-partial guarantee — a caller that
 * ignores `errors` still cannot partial-apply). Only when every CO validates
 * does `plan` carry the per-CO insert plan.
 */
export function planBackfill(cos, mapping, existingCounts, opts = {}) {
  const errors = [];
  const plan = [];
  for (const co of cos) {
    const allocations = mapping[co.id];
    if (!allocations) {
      errors.push(`CO ${co.id} fetched but absent from mapping`);
      continue;
    }
    const v = validateAllocation(co, allocations);
    if (!v.ok) {
      errors.push(v.error);
      continue;
    }
    const decision = idempotencyDecision(co, existingCounts[co.id] ?? 0, opts);
    plan.push({
      co_id: co.id,
      action: decision.action,
      reason: decision.reason ?? null,
      rows: decision.action === "skip" ? [] : shapeLineRows(co, allocations),
      sum: v.sum,
    });
  }
  // No-partial guarantee: any validation error → empty plan, regardless of
  // how many COs were individually valid. The caller still reports `errors`.
  return { plan: errors.length ? [] : plan, errors };
}

// ─────────────────────────────────────────────────────────────────────────
// CLI (skipped on import so the pure helpers above are unit-testable).
// ─────────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { apply: false, reallocate: false, allowProduction: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") out.apply = true;
    else if (a === "--reallocate") out.reallocate = true;
    else if (a === "--i-understand-this-is-production") out.allowProduction = true;
    else if (a === "--job") out.job = argv[++i];
    else if (a === "--org") out.org = argv[++i];
    else if (a === "--mapping") out.mapping = argv[++i];
  }
  return out;
}

async function main() {
  const { readFileSync } = await import("node:fs");
  const { createClient } = await import("@supabase/supabase-js");
  const args = parseArgs(process.argv);
  if (!args.job || !args.mapping) {
    console.error("Usage: --job <JOB_UUID> --mapping <map.json> [--org <UUID>] [--apply] [--reallocate]");
    process.exit(2);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env.");
    process.exit(2);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const mapping = JSON.parse(readFileSync(args.mapping, "utf8"));

  // Resolve org from the JOB row (not the --org arg) and guard.
  const { data: job, error: jobErr } = await supabase
    .from("jobs").select("id, org_id").eq("id", args.job).single();
  if (jobErr || !job) { console.error(`Job ${args.job} not found: ${jobErr?.message}`); process.exit(1); }
  if (args.org && args.org !== job.org_id) {
    console.error(`--org ${args.org} != job's org ${job.org_id}; refusing (mismatch).`); process.exit(1);
  }
  assertSafeOrg(job.org_id, { allowProduction: args.allowProduction });

  const coIds = Object.keys(mapping);
  const { data: cos, error: coErr } = await supabase
    .from("change_orders").select("id, org_id, job_id, amount, status")
    .in("id", coIds).is("deleted_at", null);
  if (coErr) { console.error(`CO fetch failed: ${coErr.message}`); process.exit(1); }
  for (const co of cos ?? []) {
    if (co.org_id !== job.org_id) { console.error(`CO ${co.id} org mismatch; abort.`); process.exit(1); }
    if (co.job_id !== job.id) { console.error(`CO ${co.id} not on job ${job.id}; abort.`); process.exit(1); }
  }

  const existingCounts = {};
  for (const id of coIds) {
    const { count } = await supabase
      .from("change_order_lines").select("id", { count: "exact", head: true })
      .eq("co_id", id).is("deleted_at", null);
    existingCounts[id] = count ?? 0;
  }

  const { plan, errors } = planBackfill(cos ?? [], mapping, existingCounts, { reallocate: args.reallocate });
  if (errors.length) {
    console.error(`VALIDATION FAILED (validate-all-then-insert — NOTHING written):`);
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }

  console.log(`Org ${job.org_id} | job ${job.id} | ${plan.length} CO(s) planned | mode=${args.apply ? "APPLY" : "DRY-RUN"}`);
  for (const p of plan) {
    console.log(`  CO ${p.co_id}: ${p.action}${p.reason ? " (" + p.reason + ")" : ""} | ${p.rows.length} line(s) | Σ ${p.sum}c ($${(p.sum / 100).toFixed(2)})`);
  }
  if (!args.apply) { console.log("\nDRY-RUN complete — no rows written. Re-run with --apply to execute."); process.exit(0); }

  // APPLY: per CO, (reallocate -> soft-delete prior) then insert; reconcile after.
  let totalLines = 0;
  for (const p of plan) {
    if (p.action === "skip") continue;
    if (p.action === "reallocate") {
      const { error } = await supabase.from("change_order_lines")
        .update({ deleted_at: new Date().toISOString() }).eq("co_id", p.co_id).is("deleted_at", null);
      if (error) { console.error(`reallocate soft-delete failed for ${p.co_id}: ${error.message}`); process.exit(1); }
    }
    const { error } = await supabase.from("change_order_lines").insert(p.rows);
    if (error) { console.error(`insert failed for ${p.co_id}: ${error.message}`); process.exit(1); }
    totalLines += p.rows.length;
  }

  // Reconcile: Σ co_adjustments over touched budget lines must equal Σ planned line amounts.
  const touchedBl = Array.from(new Set(plan.flatMap((p) => p.rows.map((r) => r.budget_line_id))));
  const { data: bls } = await supabase.from("budget_lines")
    .select("id, original_estimate, co_adjustments, revised_estimate").in("id", touchedBl);
  const expectedByBl = {};
  for (const p of plan) for (const r of p.rows) expectedByBl[r.budget_line_id] = (expectedByBl[r.budget_line_id] ?? 0) + r.amount;
  let mismatch = 0;
  console.log(`\nReconciliation (${totalLines} lines, ${touchedBl.length} budget lines):`);
  for (const bl of bls ?? []) {
    const exp = expectedByBl[bl.id] ?? 0;
    const ok = bl.co_adjustments >= exp; // >= because a line may already carry prior approved COs
    if (!ok) mismatch++;
    console.log(`  BL ${bl.id}: co_adjustments=${bl.co_adjustments}c revised=${bl.revised_estimate}c (this run added ${exp}c) ${ok ? "OK" : "MISMATCH"}`);
  }
  if (mismatch) { console.error(`\n${mismatch} reconciliation MISMATCH(es).`); process.exit(1); }
  console.log(`\nAPPLY complete — ${totalLines} lines, reconciliation clean.`);
  process.exit(0);
}

const invokedDirectly =
  typeof process !== "undefined" &&
  process.argv[1] &&
  process.argv[1].replace(/\\/g, "/").endsWith("scripts/backfill/co-line-allocation.mjs");
if (invokedDirectly) main();
