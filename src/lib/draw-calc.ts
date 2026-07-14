/**
 * Draw calculation engine — Phase 8.
 *
 * Centralizes the math for AIA G702/G703 pay applications so the create,
 * update, detail, and export endpoints all produce identical numbers.
 *
 * Key rules:
 *   1. "Previous Applications" for a line = sum of that line's this_period
 *      across all locked/submitted/approved/paid draws on the same job with a
 *      lower draw_number (revisions within the same draw_number do NOT stack
 *      — the revision REPLACES the parent, so we take the most recent
 *      revision per draw_number).
 *   2. "This Period" includes only invoices whose approval_date (or received
 *      date, whichever falls first) lies within the draw's
 *      [period_start, period_end] window and are linked to this draw.
 *   3. Retainage = retainage_percent × total_completed_to_date. On a final
 *      draw, retainage releases as a separate line (negative adjustment).
 *
 * All amounts are cents (BIGINT). All percentages are 0–100 (NUMERIC(5,2)).
 *
 * The helpers here are server-only; they use the service-role client so they
 * can run from API routes regardless of RLS.
 */

import { createServiceRoleClient } from "@/lib/supabase/service";

export interface DrawTotals {
  original_contract_sum: number;
  net_change_orders: number;
  contract_sum_to_date: number;
  total_completed_to_date: number;
  // Phase 8 retainage breakdown (lines 5a / 5b / 5c / 6 / 7 / 8 / 9).
  retainage_on_completed: number;
  retainage_on_stored: number;
  total_retainage: number;
  total_earned_less_retainage: number;
  less_previous_certificates: number;
  current_payment_due: number;
  balance_to_finish: number;
  deposit_amount: number;
  // BLOCK B / 1.6 — deposit credit APPLIED on this draw (not the full pool).
  // Reduces line 8 (current payment due) only; never completion/retainage.
  deposit_applied: number;
  // BLOCK B / 1.2 — net signed sum of adjustment_status='applied_to_draw'
  // adjustments on this draw. Negative = credits reducing the amount owed.
  // Reduces line 8 only; line items stay traceable (migration 00069 D2).
  applied_adjustments: number;
  // HANDOFF #2 credit fix — signed sum of linked-invoice dollars NOT captured by
  // any G703 cost-code line (fully-uncoded invoices like a −$640 credit memo, +
  // partial-allocation gaps): uncaptured = Σ(linked totals) − Σ(captured). Flows
  // into line 8 and surfaces in Adjustments & Credits, so a linked invoice can
  // NEVER contribute $0. The linkage invariant: Σ(G703 this-period) + uncaptured
  // ≡ Σ(linked invoice totals).
  uncaptured_linked: number;
  // Phase 7b legacy column — kept because the G702 detail API and PDF
  // exporter still read it. We populate it to match total_completed_to_date
  // minus less_previous_certificates so back-compat reports still balance.
  less_previous_payments: number;
}

export interface DrawLineSnapshot {
  cost_code_id: string;
  scheduled_value: number;      // revised_estimate
  previous_applications: number;
  this_period: number;
  total_completed: number;
  retainage: number;            // cents withheld on this line this period
  balance_to_finish: number;
  percent_complete: number;     // 0..100 decimal
}

// Invoice statuses that count as approved for draw inclusion purposes.
const APPROVED_INVOICE_STATUSES = [
  "qa_approved",
  "pushed_to_qb",
  "in_draw",
  "paid",
];

// Draw statuses whose line totals contribute to "Previous Applications".
// Submitted / approved / locked / paid: already locked-in pay apps.
// Revisions within the same draw_number share the draw_number but we take
// only the highest revision_number per draw_number (so Rev 2 replaces Rev 1
// replaces Rev 0).
const PRIOR_DRAW_STATUSES = ["submitted", "approved", "locked", "paid"];

/**
 * Sum this-period dollars per cost_code_id for a set of invoices. Source of
 * truth is `invoice_allocations` (every dollar allocated, tax/fee folded in
 * pro-rata — so the full invoice total lands on the G703, not just the pre-tax
 * subtotal). Falls back per-invoice to invoice_line_items, then the invoice-
 * level cost_code_id, so legacy invoices without allocations still contribute.
 *
 * Cent-exact and keyed by cost code — the draw does NOT depend on a budget line
 * existing (allocations are the source; budget lines only enrich columns).
 */
async function sumThisPeriodByCostCode(
  supabase: ReturnType<typeof createServiceRoleClient>,
  invoiceIds: string[]
): Promise<Map<string, number>> {
  const m = new Map<string, number>();
  const add = (cc: string, cents: number) => m.set(cc, (m.get(cc) ?? 0) + (cents ?? 0));
  if (invoiceIds.length === 0) return m;

  // 1) invoice_allocations — the canonical every-dollar split.
  const { data: allocs } = await supabase
    .from("invoice_allocations")
    .select("invoice_id, cost_code_id, amount_cents")
    .in("invoice_id", invoiceIds)
    .is("deleted_at", null);
  const covered = new Set<string>();
  for (const a of allocs ?? []) {
    const cc = (a as { cost_code_id: string | null }).cost_code_id;
    if (cc) { covered.add((a as { invoice_id: string }).invoice_id); add(cc, (a as { amount_cents: number }).amount_cents); }
  }

  // 2) line items for invoices with no allocations.
  const noAlloc = invoiceIds.filter((id) => !covered.has(id));
  if (noAlloc.length > 0) {
    const { data: lines } = await supabase
      .from("invoice_line_items")
      .select("invoice_id, cost_code_id, amount_cents")
      .in("invoice_id", noAlloc)
      .is("deleted_at", null);
    for (const li of lines ?? []) {
      const cc = (li as { cost_code_id: string | null }).cost_code_id;
      if (cc) { covered.add((li as { invoice_id: string }).invoice_id); add(cc, (li as { amount_cents: number }).amount_cents); }
    }
  }

  // 3) invoice-level cost code for anything still uncovered.
  const stillUncovered = invoiceIds.filter((id) => !covered.has(id));
  if (stillUncovered.length > 0) {
    const { data: invs } = await supabase
      .from("invoices")
      .select("id, cost_code_id, total_amount")
      .in("id", stillUncovered)
      .is("deleted_at", null);
    for (const inv of invs ?? []) {
      const cc = (inv as { cost_code_id: string | null }).cost_code_id;
      if (cc) add(cc, (inv as { total_amount: number }).total_amount);
    }
  }
  return m;
}

/**
 * Compute per-cost-code totals for a draw, including the Phase 8
 * previous-applications math that pulls forward prior draws' this_period
 * values.
 *
 * @param jobId              The job the draw belongs to.
 * @param drawNumber         Draw # (so we include only DRAWS with a LOWER
 *                           draw_number as "prior"). For a new draw being
 *                           created, pass the upcoming draw number.
 * @param excludeDrawId      If this draw is being recomputed, pass its own
 *                           id to exclude it from "prior" aggregation.
 * @param periodStart        Draw period start (ISO date yyyy-mm-dd)
 * @param periodEnd          Draw period end   (ISO date yyyy-mm-dd)
 * @param drawInvoiceIds     Invoice IDs linked to this draw (this_period
 *                           source). If empty, this_period = 0.
 * @param retainagePercent   0..100, e.g. 10 means withhold 10%.
 * @param isFinalDraw        When true, retainage on completed work releases
 *                           — Phase 8 surfaces this as a separate line on
 *                           the G703 output.
 */
export async function computeDrawLines(args: {
  jobId: string;
  drawNumber: number;
  excludeDrawId?: string;
  periodStart: string | null;
  periodEnd: string | null;
  drawInvoiceIds: string[];
  retainagePercent: number;
  isFinalDraw: boolean;
}): Promise<{
  lines: DrawLineSnapshot[];
  allBudgetLineIds: string[];
}> {
  const supabase = createServiceRoleClient();
  const {
    jobId,
    drawNumber,
    excludeDrawId,
    drawInvoiceIds,
    retainagePercent,
    isFinalDraw,
  } = args;

  // 1. Budget lines for this job.
  const { data: budgetLines } = await supabase
    .from("budget_lines")
    .select("id, cost_code_id, original_estimate, revised_estimate, previous_applications_baseline, co_adjustments")
    .eq("job_id", jobId)
    .is("deleted_at", null);

  const bls = budgetLines ?? [];
  const bCodeMap = new Map<string, (typeof bls)[number]>();
  for (const bl of bls) bCodeMap.set(bl.cost_code_id as string, bl);

  // 2. This period per cost_code_id — from the invoices on this draw
  //    (allocations first; see sumThisPeriodByCostCode).
  const thisPeriod = await sumThisPeriodByCostCode(supabase, drawInvoiceIds);

  // 3. Previous applications per cost_code_id: sum of this_period on every
  //    LOCKED draw with a lower draw_number. Take the latest revision per
  //    draw_number.
  let priorDrawsQuery = supabase
    .from("draws")
    .select("id, draw_number, revision_number, status")
    .eq("job_id", jobId)
    .lt("draw_number", drawNumber)
    .in("status", PRIOR_DRAW_STATUSES)
    .is("deleted_at", null);
  if (excludeDrawId) priorDrawsQuery = priorDrawsQuery.neq("id", excludeDrawId);
  const { data: priorDrawsRaw } = await priorDrawsQuery;

  // Collapse revisions: for each draw_number, keep the highest revision.
  const priorByNumber = new Map<number, { id: string; revision: number }>();
  for (const d of priorDrawsRaw ?? []) {
    const num = (d as { draw_number: number }).draw_number;
    const rev = (d as { revision_number: number }).revision_number ?? 0;
    const id = (d as { id: string }).id;
    const cur = priorByNumber.get(num);
    if (!cur || rev > cur.revision) priorByNumber.set(num, { id, revision: rev });
  }
  const priorDrawIds = Array.from(priorByNumber.values()).map((v) => v.id);

  // Previous = baseline per line + sum of this_period for that cost_code
  // across prior (locked) draws (same allocation-first source).
  let priorThisPeriod = new Map<string, number>();
  if (priorDrawIds.length > 0) {
    const { data: priorInvoices } = await supabase
      .from("invoices")
      .select("id, draw_id")
      .in("draw_id", priorDrawIds)
      .is("deleted_at", null);
    const priorInvIds = (priorInvoices ?? []).map((i) => i.id as string);
    priorThisPeriod = await sumThisPeriodByCostCode(supabase, priorInvIds);
  }

  // 4. Compose the snapshot — one line per cost code that has a budget line OR
  //    an invoice amount (this or prior period). Allocations are the source of
  //    truth; a budget line only ENRICHES (scheduled value / baseline). This is
  //    what lets a quick-created job with no budget lines still produce a real
  //    G703 from its approved invoices.
  const lines: DrawLineSnapshot[] = [];
  const pct = Math.max(0, Math.min(100, retainagePercent)) / 100;
  const codeIds = new Set<string>([
    ...bls.map((b) => b.cost_code_id as string),
    ...thisPeriod.keys(),
    ...priorThisPeriod.keys(),
  ]);
  for (const ccId of codeIds) {
    const bl = bCodeMap.get(ccId);
    const budgetScheduled = bl ? ((bl as { revised_estimate?: number }).revised_estimate ?? 0) : 0;
    const baseline = bl ? ((bl as { previous_applications_baseline?: number }).previous_applications_baseline ?? 0) : 0;
    const prior = priorThisPeriod.get(ccId) ?? 0;
    const previous_applications = baseline + prior;
    const this_period = thisPeriod.get(ccId) ?? 0;
    const total_completed = previous_applications + this_period;
    // Retainage released on a final draw — withholds drop to 0; otherwise
    // we withhold pct of total_completed so far. The line's retainage
    // column shows *currently withheld*, not incremental.
    const retainage = isFinalDraw ? 0 : Math.round(total_completed * pct);
    // Unbudgeted (or $0-budget) line: the billed-to-date IS the scheduled value,
    // so a cost-plus line with no formal budget reads 100% / $0-to-finish
    // instead of a negative balance.
    const scheduled = budgetScheduled > 0 ? budgetScheduled : total_completed;
    const balance_to_finish = scheduled - total_completed;
    const percent_complete =
      scheduled > 0 ? Math.round((total_completed / scheduled) * 10000) / 100 : total_completed > 0 ? 100 : 0;
    lines.push({
      cost_code_id: ccId,
      scheduled_value: scheduled,
      previous_applications,
      this_period,
      total_completed,
      retainage,
      balance_to_finish,
      percent_complete,
    });
  }

  return { lines, allBudgetLineIds: bls.map((b) => b.id as string) };
}

/**
 * Compute the G702 header totals (lines 1–9) from the line snapshot +
 * job/context metadata. This is pure math — no DB access — so it can be
 * reused by the preview UI as well.
 */
export function rollupDrawTotals(args: {
  originalContractSum: number;
  netChangeOrders: number;
  depositPercentage: number;
  retainagePercent: number;
  lines: DrawLineSnapshot[];
  lessPreviousCertificates: number;
  isFinalDraw: boolean;
  nonBudgetLineThisPeriod: number;
  previousCoCompletedAmount?: number;
  // BLOCK B — required so every call site threads the money explicitly (no
  // silent 0 that would corrupt a later draw's less-previous-certificates via
  // a deposit-ignoring stored current_payment_due). New/preview draws pass 0.
  depositAppliedCents: number;
  appliedAdjustmentsCents: number;
  // HANDOFF #2 credit fix — signed sum of linked-invoice dollars not captured by
  // any G703 line (see DrawTotals.uncaptured_linked). Required; new/preview = 0.
  uncapturedLinkedCents: number;
}): DrawTotals {
  const {
    originalContractSum,
    netChangeOrders,
    depositPercentage,
    retainagePercent,
    lines,
    lessPreviousCertificates,
    isFinalDraw,
    nonBudgetLineThisPeriod,
    previousCoCompletedAmount = 0,
    depositAppliedCents,
    appliedAdjustmentsCents,
    uncapturedLinkedCents,
  } = args;

  const contract_sum_to_date = originalContractSum + netChangeOrders;
  const total_completed_to_date =
    lines.reduce((s, l) => s + l.total_completed, 0) + nonBudgetLineThisPeriod + previousCoCompletedAmount;
  const pct = Math.max(0, Math.min(100, retainagePercent)) / 100;
  // Line 5a — retainage on completed work. On final draw, we release (0).
  const retainage_on_completed = isFinalDraw ? 0 : Math.round(total_completed_to_date * pct);
  const retainage_on_stored = 0; // scaffold; stored-material retainage unused yet
  const total_retainage = retainage_on_completed + retainage_on_stored;
  // Line 6 — total earned less retainage.
  const total_earned_less_retainage = total_completed_to_date - total_retainage;
  // Line 8 — current payment due = (line 6) - (line 7 previous certificates)
  //   - deposit credit applied this draw  (explicit deduction line between 7
  //     and 8; NEVER folded into line 7 — that would conflate deposit with
  //     prior certificates)
  //   + net applied adjustments (signed; negative credits reduce the amount).
  //   + uncaptured linked-invoice dollars (HANDOFF #2 — signed; a −$640 credit
  //     memo with no cost code reduces the amount instead of silently vanishing).
  // Deposit + adjustments + uncaptured touch line 8 ONLY — completion,
  // retainage, and balance-to-finish are unaffected (migration 00069 D2).
  const current_payment_due =
    total_earned_less_retainage -
    lessPreviousCertificates -
    depositAppliedCents +
    appliedAdjustmentsCents +
    uncapturedLinkedCents;
  // Line 9 — balance to finish + retainage.
  const balance_to_finish = contract_sum_to_date - total_completed_to_date + total_retainage;
  const deposit_amount = Math.round(originalContractSum * depositPercentage);

  return {
    original_contract_sum: originalContractSum,
    net_change_orders: netChangeOrders,
    contract_sum_to_date,
    total_completed_to_date,
    retainage_on_completed,
    retainage_on_stored,
    total_retainage,
    total_earned_less_retainage,
    less_previous_certificates: lessPreviousCertificates,
    current_payment_due,
    balance_to_finish,
    deposit_amount,
    deposit_applied: depositAppliedCents,
    applied_adjustments: appliedAdjustmentsCents,
    uncaptured_linked: uncapturedLinkedCents,
    // Back-compat: legacy "less_previous_payments" tracks what Line 7 used to
    // mean before we split retainage out. Keep it aligned with line 7 so the
    // existing export path continues to read a sensible number.
    less_previous_payments: lessPreviousCertificates,
  };
}

/** A prior draw as needed to resolve its CANONICAL current-payment-due for the
 *  line-7 carry-forward — deliberately NOT the stored current_payment_due
 *  column (NEW-2: that column is never refreshed by draw_submit_rpc). */
type PriorDrawRow = {
  id: string;
  draw_number: number;
  revision_number: number | null;
  status: string;
  snapshot: unknown;
  is_final: boolean | null;
  deposit_applied_cents: number | null;
  period_start: string | null;
  period_end: string | null;
  original_contract_sum: number | null;
  net_change_orders: number | null;
};

/**
 * Canonical "current payment due" of ONE prior draw, for the G702 line-7
 * carry-forward. NEW-2 fix (canonicalize, option i): the stored
 * `draws.current_payment_due` column is NEVER read for money here — it is never
 * refreshed by `draw_submit_rpc`, so it drifts from what the detail/print
 * actually render (the uncaptured-credit / deposit / adjustment terms). Instead:
 *   • approved / locked / paid WITH a frozen snapshot → the snapshot's certified
 *     current_payment_due (the byte-exact value the issued pay app legally
 *     certified — the same value the detail early-returns from the snapshot);
 *   • everything else (submitted, or issued-without-snapshot) → recompute on
 *     read through the SAME rollupDrawTotals chain the detail/print use, so
 *     line 7 ties out cent-exact with that prior draw's own bottom line.
 */
async function canonicalCurrentPaymentDueForPriorDraw(
  d: PriorDrawRow,
  jobId: string
): Promise<number> {
  if (["approved", "locked", "paid"].includes(d.status) && d.snapshot) {
    const snap = d.snapshot as { draw?: { current_payment_due?: unknown } } | null;
    const v = snap?.draw?.current_payment_due;
    if (typeof v === "number") return v;
    // Snapshot present but malformed → fall through to a from-source recompute.
  }
  return (await recomputeTotalsForDraw(d, jobId)).current_payment_due;
}

/**
 * Recompute one draw's FULL G702 totals from source — mirrors the detail/print
 * chain (computeDrawLines + rollupDrawTotals + deposit / adjustments /
 * uncaptured + recursive line-7). Service-role, server-only.
 *
 * `originalContractSum` / `netChangeOrders` are the draw's stored pass-through
 * inputs — rollupDrawTotals only passes them into contract-sum / balance lines,
 * NOT into current_payment_due, and the detail render feeds the same stored
 * columns (see draw-staleness.ts), so this matches the detail exactly.
 *
 * Recursion terminates: every prior draw has a strictly lower draw_number.
 */
async function recomputeTotalsForDraw(
  d: PriorDrawRow,
  jobId: string
): Promise<DrawTotals> {
  const supabase = createServiceRoleClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("deposit_percentage, retainage_percent, previous_co_completed_amount")
    .eq("id", jobId)
    .maybeSingle();
  const retainagePct = Number(
    (job as { retainage_percent?: number } | null)?.retainage_percent ?? 10
  );

  const { data: invRows } = await supabase
    .from("invoices")
    .select("id")
    .eq("draw_id", d.id)
    .is("deleted_at", null);
  const invoiceIds = (invRows ?? []).map((i) => (i as { id: string }).id);

  const { lines } = await computeDrawLines({
    jobId,
    drawNumber: d.draw_number,
    excludeDrawId: d.id,
    periodStart: d.period_start,
    periodEnd: d.period_end,
    drawInvoiceIds: invoiceIds,
    retainagePercent: retainagePct,
    isFinalDraw: !!d.is_final,
  });

  const lessPrev = await lessPreviousCertificatesForJob(jobId, d.draw_number, d.id);
  const nonBudget = await nonBudgetLineThisPeriodForDraw(d.id);
  const appliedAdj = await appliedAdjustmentsForDraw(d.id);
  const { total: uncaptured } = await uncapturedLinkedInvoicesForDraw(d.id);

  const totals = rollupDrawTotals({
    originalContractSum: d.original_contract_sum ?? 0,
    netChangeOrders: d.net_change_orders ?? 0,
    depositPercentage: Number(
      (job as { deposit_percentage?: number } | null)?.deposit_percentage ?? 0.1
    ),
    retainagePercent: retainagePct,
    lines,
    lessPreviousCertificates: lessPrev,
    isFinalDraw: !!d.is_final,
    nonBudgetLineThisPeriod: nonBudget,
    previousCoCompletedAmount: Number(
      (job as { previous_co_completed_amount?: number } | null)
        ?.previous_co_completed_amount ?? 0
    ),
    depositAppliedCents: d.deposit_applied_cents ?? 0,
    appliedAdjustmentsCents: appliedAdj,
    uncapturedLinkedCents: uncaptured,
  });
  return totals;
}

/**
 * G702 Line 7: sum of the CANONICAL current_payment_due across all prior
 * locked/submitted/approved/paid draws, plus the pre-Nightwork baseline from
 * jobs.previous_certificates_total. Revisions within the same draw_number
 * collapse to the latest revision.
 *
 * NEW-2 fix: each prior draw's current-payment-due comes from its canonical
 * value (frozen snapshot for issued draws, else a from-source recompute) — NOT
 * the stale stored draws.current_payment_due column, which draw_submit_rpc never
 * refreshes, so line 7 could inherit a credit-/deposit-/adjustment-dropped
 * figure while the prior draw's own detail showed the corrected one. See
 * canonicalCurrentPaymentDueForPriorDraw.
 *
 * Baseline is for pre-Nightwork certificates NOT represented in the draws table.
 */
export async function lessPreviousCertificatesForJob(
  jobId: string,
  drawNumber: number,
  excludeDrawId?: string
): Promise<number> {
  const supabase = createServiceRoleClient();
  let q = supabase
    .from("draws")
    .select(
      "id, draw_number, revision_number, status, snapshot, is_final, deposit_applied_cents, period_start, period_end, original_contract_sum, net_change_orders"
    )
    .eq("job_id", jobId)
    .lt("draw_number", drawNumber)
    .in("status", PRIOR_DRAW_STATUSES)
    .is("deleted_at", null);
  if (excludeDrawId) q = q.neq("id", excludeDrawId);
  const { data } = await q;

  // Collapse revisions: keep the highest revision per draw_number (Rev 2
  // replaces Rev 1 replaces Rev 0).
  const byNumber = new Map<number, PriorDrawRow>();
  for (const row of (data ?? []) as unknown as PriorDrawRow[]) {
    const cur = byNumber.get(row.draw_number);
    if (!cur || (row.revision_number ?? 0) > (cur.revision_number ?? 0)) {
      byNumber.set(row.draw_number, row);
    }
  }

  // Sum each prior draw's CANONICAL current-payment-due (snapshot or recompute).
  let sumPriorDraws = 0;
  for (const d of byNumber.values()) {
    sumPriorDraws += await canonicalCurrentPaymentDueForPriorDraw(d, jobId);
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("previous_certificates_total")
    .eq("id", jobId)
    .single();
  const baseline = (job as { previous_certificates_total?: number } | null)
    ?.previous_certificates_total ?? 0;

  return sumPriorDraws + baseline;
}

/** The G702 header figures a document generator needs, in cents. */
export type CanonicalG702 = {
  original_contract_sum: number;
  net_change_orders: number;
  contract_sum_to_date: number;
  total_completed_to_date: number;
  total_retainage: number;
  /** G702 line 7 — "less previous certificates" (a.k.a. less_previous_payments). */
  less_previous_payments: number;
  current_payment_due: number;
  balance_to_finish: number;
  deposit_amount: number;
};

/**
 * Canonical G702 header totals for ONE draw — the SAME numbers the pay-app
 * detail/print render: a frozen snapshot for issued (approved/locked/paid)
 * draws, else a from-source recompute. NEW-2 class closure: document generators
 * that can't call the membership-scoped loadPayAppViewData (the token-scoped
 * owner portal) or want a lighter path (the cover-letter route) call this so the
 * stored draws.current_payment_due column (+ its rollup siblings) feeds ZERO
 * document output — it is a display cache only.
 *
 * Service-role + keyed by drawId: the CALLER MUST have already authorized access
 * (membership org-scope OR a validated owner token). Returns null if the draw is
 * missing/deleted.
 */
export async function canonicalG702ForDraw(
  drawId: string
): Promise<CanonicalG702 | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("draws")
    .select(
      "id, job_id, draw_number, revision_number, status, snapshot, is_final, deposit_applied_cents, period_start, period_end, original_contract_sum, net_change_orders"
    )
    .eq("id", drawId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) return null;
  const d = data as unknown as PriorDrawRow & { job_id: string };

  // Issued draw with a frozen snapshot → the certified figures verbatim (the
  // detail early-returns the same). total_retainage lives at snapshot.retainage.
  if (["approved", "locked", "paid"].includes(d.status) && d.snapshot) {
    const snap = d.snapshot as {
      draw?: Record<string, unknown>;
      retainage?: { amount?: unknown };
    } | null;
    const sd = snap?.draw;
    if (sd && typeof sd.current_payment_due === "number") {
      const num = (v: unknown) => (typeof v === "number" ? v : 0);
      return {
        original_contract_sum: num(sd.original_contract_sum),
        net_change_orders: num(sd.net_change_orders),
        contract_sum_to_date: num(sd.contract_sum_to_date),
        total_completed_to_date: num(sd.total_completed_to_date),
        total_retainage: num(snap?.retainage?.amount),
        less_previous_payments: num(sd.less_previous_payments),
        current_payment_due: sd.current_payment_due,
        balance_to_finish: num(sd.balance_to_finish),
        deposit_amount: num(sd.deposit_amount),
      };
    }
    // Snapshot malformed → fall through to a from-source recompute.
  }

  const t = await recomputeTotalsForDraw(d, d.job_id);
  return {
    original_contract_sum: t.original_contract_sum,
    net_change_orders: t.net_change_orders,
    contract_sum_to_date: t.contract_sum_to_date,
    total_completed_to_date: t.total_completed_to_date,
    total_retainage: t.total_retainage,
    less_previous_payments: t.less_previous_payments,
    current_payment_due: t.current_payment_due,
    balance_to_finish: t.balance_to_finish,
    deposit_amount: t.deposit_amount,
  };
}

/**
 * Sum of this_period from draw_line_items whose source is NOT a budget line
 * (i.e. internal billings and change orders). These rows are invisible to
 * computeDrawLines (which iterates budget_lines), so they feed into G702
 * Line 4 separately via rollupDrawTotals.
 */
export async function nonBudgetLineThisPeriodForDraw(drawId: string): Promise<number> {
  if (!drawId) return 0;
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("draw_line_items")
    .select("this_period")
    .eq("draw_id", drawId)
    .in("source_type", ["internal", "change_order"])
    .is("deleted_at", null);
  return (data ?? []).reduce(
    (s, r) => s + ((r as { this_period: number }).this_period ?? 0),
    0
  );
}

/**
 * BLOCK B / 1.6 — deposit pool consumed by OTHER non-void draws on a job.
 *
 * Sum of deposit_applied_cents across every non-void, non-deleted draw on the
 * job, EXCLUDING the given draw. A draft's application reserves the pool (so
 * two open drafts can't oversubscribe); voiding a draw returns its slice.
 * Remaining pool for a draw = draws.deposit_amount − this sum.
 */
export async function depositAppliedToDateForJob(
  jobId: string,
  excludeDrawId?: string
): Promise<number> {
  if (!jobId) return 0;
  const supabase = createServiceRoleClient();
  let q = supabase
    .from("draws")
    .select("id, deposit_applied_cents")
    .eq("job_id", jobId)
    .neq("status", "void")
    .is("deleted_at", null);
  if (excludeDrawId) q = q.neq("id", excludeDrawId);
  const { data } = await q;
  return (data ?? []).reduce(
    (s, r) =>
      s + ((r as { deposit_applied_cents: number }).deposit_applied_cents ?? 0),
    0
  );
}

/**
 * BLOCK B / 1.2 — net signed sum of adjustments APPLIED to a draw.
 *
 * Only adjustment_status='applied_to_draw' counts toward the draw's math (per
 * the status ruling). 'approved' adjustments are a pending pool surfaced in the
 * wizard but NOT counted here; 'resolved'/'voided' never re-enter. amount_cents
 * is signed — negative = credit reducing the amount owed — so the raw sum flows
 * straight into current_payment_due.
 */
export async function appliedAdjustmentsForDraw(drawId: string): Promise<number> {
  if (!drawId) return 0;
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("draw_adjustments")
    .select("amount_cents")
    .eq("draw_id", drawId)
    .eq("adjustment_status", "applied_to_draw")
    .is("deleted_at", null);
  return (data ?? []).reduce(
    (s, r) => s + ((r as { amount_cents: number }).amount_cents ?? 0),
    0
  );
}

/**
 * HANDOFF #2 credit fix — linked-invoice dollars NOT captured by any G703 line.
 *
 * `total = Σ(linked invoice totals) − Σ(captured by cost code)`, where
 * "captured" uses the SAME allocation → line-item → invoice-level resolution as
 * the G703 (sumThisPeriodByCostCode). This is the signed amount that must flow
 * into current_payment_due + Adjustments & Credits so a linked invoice can never
 * contribute $0 — e.g. a −$640 credit memo with no cost code.
 *
 * `items` lists the FULLY-uncoded linked invoices (no cost code anywhere) for
 * display; any residual from partial-allocation gaps folds into a synthetic
 * "Unallocated remainder" so `Σ(items) === total` (nothing hidden).
 */
export type UncapturedLinked = {
  total: number;
  items: {
    id: string;
    vendor: string;
    invoice_number: string | null;
    amount: number;
  }[];
};

export async function uncapturedLinkedInvoices(
  invoiceIds: string[]
): Promise<UncapturedLinked> {
  if (invoiceIds.length === 0) return { total: 0, items: [] };
  const supabase = createServiceRoleClient();

  const { data: invRows } = await supabase
    .from("invoices")
    .select("id, total_amount, vendor_name_raw, invoice_number, cost_code_id")
    .in("id", invoiceIds)
    .is("deleted_at", null);
  const invoices = invRows ?? [];
  if (invoices.length === 0) return { total: 0, items: [] };

  const ids = invoices.map((i) => i.id as string);
  const linkedTotal = invoices.reduce(
    (s, i) => s + ((i as { total_amount: number }).total_amount ?? 0),
    0
  );
  const captured = await sumThisPeriodByCostCode(supabase, ids);
  const capturedTotal = Array.from(captured.values()).reduce((s, v) => s + v, 0);
  const total = linkedTotal - capturedTotal;

  // Which invoices are FULLY uncoded (no cost code via allocation, line item, or
  // invoice level)? Those are the clean, itemized display entries.
  const codedInvoiceIds = new Set<string>();
  const { data: allocs } = await supabase
    .from("invoice_allocations")
    .select("invoice_id, cost_code_id")
    .in("invoice_id", ids)
    .is("deleted_at", null);
  for (const a of allocs ?? []) {
    if ((a as { cost_code_id: string | null }).cost_code_id) {
      codedInvoiceIds.add((a as { invoice_id: string }).invoice_id);
    }
  }
  const { data: liRows } = await supabase
    .from("invoice_line_items")
    .select("invoice_id, cost_code_id")
    .in("invoice_id", ids)
    .is("deleted_at", null);
  for (const li of liRows ?? []) {
    if ((li as { cost_code_id: string | null }).cost_code_id) {
      codedInvoiceIds.add((li as { invoice_id: string }).invoice_id);
    }
  }
  for (const inv of invoices) {
    if ((inv as { cost_code_id: string | null }).cost_code_id) {
      codedInvoiceIds.add(inv.id as string);
    }
  }

  const items = invoices
    .filter((i) => !codedInvoiceIds.has(i.id as string))
    .map((i) => ({
      id: i.id as string,
      vendor: (i as { vendor_name_raw: string | null }).vendor_name_raw ?? "—",
      invoice_number: (i as { invoice_number: string | null }).invoice_number ?? null,
      amount: (i as { total_amount: number }).total_amount ?? 0,
    }));
  const itemsTotal = items.reduce((s, it) => s + it.amount, 0);
  const residual = total - itemsTotal;
  if (residual !== 0) {
    items.push({
      id: "unallocated-remainder",
      vendor: "Unallocated remainder",
      invoice_number: null,
      amount: residual,
    });
  }

  return { total, items };
}

/** HANDOFF #2 — uncaptured linked-invoice dollars for a persisted draw (fetches
 *  the draw's linked invoices, then delegates to uncapturedLinkedInvoices). */
export async function uncapturedLinkedInvoicesForDraw(
  drawId: string
): Promise<UncapturedLinked> {
  if (!drawId) return { total: 0, items: [] };
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("invoices")
    .select("id")
    .eq("draw_id", drawId)
    .is("deleted_at", null);
  return uncapturedLinkedInvoices((data ?? []).map((i) => i.id as string));
}

/**
 * G702 Line 2: cumulative net change orders. Includes the pre-Nightwork
 * baseline from jobs.previous_change_orders_total plus every approved
 * owner-type CO created in Nightwork.
 *
 * Baseline is for pre-Nightwork COs NOT represented in the change_orders
 * table. If the pay-app importer already created change_orders rows for
 * historical COs, the baseline should be $0 to avoid double-counting.
 */
export async function netChangeOrdersForJob(jobId: string): Promise<number> {
  const supabase = createServiceRoleClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("previous_change_orders_total")
    .eq("id", jobId)
    .single();
  const baseline = (job as { previous_change_orders_total?: number } | null)
    ?.previous_change_orders_total ?? 0;

  const { data: cos } = await supabase
    .from("change_orders")
    .select("total_with_fee, amount, gc_fee_amount")
    .eq("job_id", jobId)
    .eq("status", "approved")
    .neq("co_type", "internal")
    .is("deleted_at", null);
  const nightworkSum = (cos ?? []).reduce((s, co) => {
    const row = co as { total_with_fee?: number; amount?: number; gc_fee_amount?: number };
    return s + (row.total_with_fee ?? (row.amount ?? 0) + (row.gc_fee_amount ?? 0));
  }, 0);

  return baseline + nightworkSum;
}

/**
 * Compute the AIA Application # for a draw. Pure function — no DB access.
 * If the job has starting_application_number set, the formula is:
 *   starting_application_number + draw_number - 1
 * Otherwise falls back to draw_number (legacy behavior).
 */
export function applicationNumberForDraw(
  draw: { draw_number: number },
  job: { starting_application_number: number | null }
): number {
  if (job.starting_application_number == null) return draw.draw_number;
  return job.starting_application_number + draw.draw_number - 1;
}

/**
 * Return the invoice IDs approved within a given period that aren't already
 * on a prior draw — the candidates for a "This Period" pull-in.
 */
export async function approvedInvoicesInPeriod(args: {
  jobId: string;
  periodStart: string;
  periodEnd: string;
  excludeDrawId?: string;
}): Promise<string[]> {
  const supabase = createServiceRoleClient();
  const { jobId, periodStart, periodEnd, excludeDrawId } = args;
  // "Approval date" falls on the invoice's updated_at when the status
  // flipped to qa_approved. Absent a dedicated column, use
  // received_date as the billing window anchor — that's the date the bill
  // entered Ross Built's system, which is how the accounting team thinks
  // of billing periods.
  let q = supabase
    .from("invoices")
    .select("id, draw_id, received_date, status")
    .eq("job_id", jobId)
    .in("status", APPROVED_INVOICE_STATUSES)
    .gte("received_date", periodStart)
    .lte("received_date", periodEnd)
    .is("deleted_at", null);
  if (excludeDrawId) q = q.or(`draw_id.is.null,draw_id.eq.${excludeDrawId}`);
  else q = q.is("draw_id", null);
  const { data } = await q;
  return (data ?? []).map((r) => (r as { id: string }).id);
}

/** Format a period_end date = last day of the current month at UTC noon. */
export function defaultPeriodEndFromToday(): string {
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;
}

/**
 * Recompute stored G702 totals for every DRAFT draw on a job.
 *
 * Called from the jobs PATCH endpoint when retainage_percent changes. Draft
 * draws are the only ones that should silently re-stamp retainage —
 * submitted/approved/locked/paid draws keep their captured values because
 * retroactive retainage changes on those would be a revision event.
 *
 * Idempotent: running this twice writes the same values.
 */
export async function recalcDraftDrawsForJob(jobId: string): Promise<number> {
  if (!jobId) return 0;
  const supabase = createServiceRoleClient();

  const [{ data: job }, { data: draws }] = await Promise.all([
    supabase
      .from("jobs")
      .select(
        "original_contract_amount, current_contract_amount, deposit_percentage, retainage_percent, previous_co_completed_amount"
      )
      .eq("id", jobId)
      .maybeSingle(),
    supabase
      .from("draws")
      .select("id, draw_number, period_start, period_end, is_final, deposit_applied_cents")
      .eq("job_id", jobId)
      .eq("status", "draft")
      .is("deleted_at", null),
  ]);

  if (!job || !draws || draws.length === 0) return 0;

  const retainagePct =
    (job as { retainage_percent?: number }).retainage_percent ?? 10;
  const depositPct =
    (job as { deposit_percentage?: number }).deposit_percentage ?? 0.1;
  const originalContractSum =
    (job as { original_contract_amount?: number }).original_contract_amount ?? 0;
  const previousCoCompleted =
    (job as { previous_co_completed_amount?: number }).previous_co_completed_amount ?? 0;
  const netChangeOrders = await netChangeOrdersForJob(jobId);

  let recomputed = 0;

  for (const d of draws) {
    const draw = d as {
      id: string;
      draw_number: number;
      period_start: string | null;
      period_end: string | null;
      is_final: boolean;
      deposit_applied_cents: number | null;
    };

    const { data: invRows } = await supabase
      .from("invoices")
      .select("id")
      .eq("draw_id", draw.id)
      .is("deleted_at", null);
    const invoiceIds = (invRows ?? []).map((i) => (i as { id: string }).id);

    const { lines } = await computeDrawLines({
      jobId,
      drawNumber: draw.draw_number,
      excludeDrawId: draw.id,
      periodStart: draw.period_start,
      periodEnd: draw.period_end,
      drawInvoiceIds: invoiceIds,
      retainagePercent: retainagePct,
      isFinalDraw: !!draw.is_final,
    });

    const lessPrevCerts = await lessPreviousCertificatesForJob(
      jobId,
      draw.draw_number,
      draw.id
    );
    const nonBudgetLineThisPeriod = await nonBudgetLineThisPeriodForDraw(draw.id);
    const appliedAdjustments = await appliedAdjustmentsForDraw(draw.id);
    const { total: uncapturedLinked } = await uncapturedLinkedInvoicesForDraw(draw.id);

    const totals = rollupDrawTotals({
      originalContractSum,
      netChangeOrders,
      depositPercentage: depositPct,
      retainagePercent: retainagePct,
      lines,
      lessPreviousCertificates: lessPrevCerts,
      isFinalDraw: !!draw.is_final,
      nonBudgetLineThisPeriod,
      previousCoCompletedAmount: previousCoCompleted,
      depositAppliedCents: draw.deposit_applied_cents ?? 0,
      appliedAdjustmentsCents: appliedAdjustments,
      uncapturedLinkedCents: uncapturedLinked,
    });

    await supabase
      .from("draws")
      .update({
        original_contract_sum: totals.original_contract_sum,
        net_change_orders: totals.net_change_orders,
        contract_sum_to_date: totals.contract_sum_to_date,
        total_completed_to_date: totals.total_completed_to_date,
        retainage_on_completed: totals.retainage_on_completed,
        retainage_on_stored: totals.retainage_on_stored,
        total_retainage: totals.total_retainage,
        total_earned_less_retainage: totals.total_earned_less_retainage,
        less_previous_certificates: totals.less_previous_certificates,
        less_previous_payments: totals.less_previous_payments,
        current_payment_due: totals.current_payment_due,
        balance_to_finish: totals.balance_to_finish,
        deposit_amount: totals.deposit_amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", draw.id);

    recomputed += 1;
  }

  return recomputed;
}

export const DRAW_STATUSES_APPROVED_INVOICES = APPROVED_INVOICE_STATUSES;
export const DRAW_LOCKED_STATUSES = PRIOR_DRAW_STATUSES;
