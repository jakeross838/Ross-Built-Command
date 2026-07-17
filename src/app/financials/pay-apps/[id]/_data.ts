// src/app/financials/pay-apps/[id]/_data.ts
//
// Shared server-side data loader for the Pay App detail + print routes —
// F10 wiring per nwrp271 (E-3-style: real public.draws data mounted into
// the locked-shape prototype Views, mirroring how Wave-E Plan E-3 wired
// /financials/bills/[id] to public.invoices).
//
// PRIOR IMPLEMENTATION (both consumers): Caldwell fixture thin-wrappers —
// CALDWELL_DRAWS.find(d => d.id === params.id) → notFound() on real Ross
// Built draw UUIDs. The org-wide /financials/pay-apps list shows REAL
// draws (GTV walk row 15 VERIFIED), so clicking any draw 404'd. Worse:
// the fully-implemented legacy /draws/[id] page 308-redirects here
// (next.config.mjs:101). Caught by the F-Inv-1 retro sweep
// (.planning/ground-truth/F-INV-1-RETRO-SWEEP.md Part C, finding F10).
//
// Math posture: G702 totals are RECOMPUTED on read via @/lib/draw-calc
// (same helpers, same parameters as the canonical /api/draws/[id] route)
// per the standing rule "Recalculate, don't increment" — the stored draws
// row can be stale after retainage/contract edits. The ONE deliberate
// divergence from the API route: NO auto-create of missing budget_lines
// (the API's write-on-read recovery at route.ts:87-108). A page render
// must not mutate; an invoice cost code with no budget line simply won't
// produce a G703 row here, and the API/list surfaces still self-heal.
//
// Trust chain: getCurrentMembership() + org-scoped draw lookup through the
// cookie-scoped server client GATE entry (RLS backstop intact). The
// draw-calc helpers internally use the service-role client (documented
// server-only posture in draw-calc.ts:21-22) keyed by the job_id/draw_id
// taken from the org-verified draw row — identical trust shape to
// /api/draws/[id].
//
// PostgREST FK citations (Workflow posture Rule 2):
//   - draws → jobs embed via draws_job_id_fkey (draws.job_id).
//   - jobs → clients embed via jobs_client_id_fkey (migration 00100) —
//     narrowed to client:clients(id, full_name) per D-078/D-079 PII fence
//     (same embed string as /api/draws/[id] route.ts:45).
//   - budget_lines → cost_codes embed via budget_lines_cost_code_id_fkey.
//
// Shim scale notes: draw-calc percent_complete is 0..100 (draw-calc.ts:55);
// CaldwellDrawLineItem.percent_complete is 0..1 (both Views render
// `* 100`) — divided here. NUMERIC columns (gc_fee_rate,
// retainage_percent, deposit_percentage) arrive as strings — Number()'d.
// DB draw status 'locked' (draw-calc PRIOR_DRAW_STATUSES) is absent from
// CaldwellDrawStatus — rendered as "submitted" so STATUS_META resolves.

import { createServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getCurrentMembership, getMembershipFromHeaders } from "@/lib/org/session";
import {
  appliedAdjustmentsForDraw,
  applicationNumberForDraw,
  computeDrawLines,
  depositAppliedToDateForJob,
  lessPreviousCertificatesForJob,
  netChangeOrdersForJob,
  nonBudgetLineThisPeriodForDraw,
  rollupDrawTotals,
  uncapturedLinkedInvoicesForDraw,
} from "@/lib/draw-calc";
import { computeDrawStaleness } from "@/lib/draw-staleness";
import {
  resolveMarkupDisplay,
  resolveBackupDetail,
} from "@/lib/statement-calc";
import type {
  CaldwellChangeOrder,
  CaldwellCostCode,
  CaldwellDraw,
  CaldwellDrawLineItem,
  CaldwellJob,
} from "@/app/design-system/_fixtures/drummond/types";

export type StatementCostLineData = {
  cost_code_id: string;
  code: string;
  description: string;
  cost: number; // cents (this-period)
  invoices: { vendor: string; invoice_number: string | null; amount: number }[];
};

export type StatementViewData = {
  costLines: StatementCostLineData[];
  markupPercent: number; // FRACTION (jobs.gc_fee_percentage)
  markupDisplay: "own_line" | "blended";
  backupDetail: "summary" | "detailed" | "detailed_with_pdfs";
  credits: {
    deposit_application: number;
    retainage: number;
    prior_payments: number;
  };
  org: { name: string; logo_url: string | null };
  clientName: string;
  statementNumber: number; // application number
  applicationDate: string;
  periodStart: string;
  periodEnd: string;
};

export type DrawInvoice = {
  id: string;
  vendor: string;
  invoice_number: string | null;
  received_date: string | null;
  /** THIS-JOB portion in cents (00122) — equals the full invoice total for
   *  mono-job invoices; the split portion otherwise. */
  amount: number;
  /** Full invoice total in cents. When amount < invoice_total the renderers
   *  show "$X of $Y invoice total" (Q5). */
  invoice_total: number;
  cost_code_id: string | null;
  code: string | null;
  stamped: boolean;
};

// BLOCK B / 1.2 — draw adjustments surfaced on the doc + wizard.
export type DrawAdjustment = {
  id: string;
  adjustment_type: string;
  adjustment_status: string; // 'applied_to_draw' (counted) | 'approved' (pending)
  amount_cents: number; // signed; negative = credit
  reason: string;
  affected_pcco_number: string | null;
};

// BLOCK B / 1.6 — deposit application state for the doc + wizard cap.
export type DepositState = {
  pool: number; // full contract deposit (AIA line 1a, informational)
  applied: number; // applied on THIS draw (the deduction line)
  appliedToDate: number; // Σ across all non-void draws (this included)
  remaining: number; // pool − appliedToDate
};

export type PayAppViewData = {
  draw: CaldwellDraw;
  job: CaldwellJob;
  lineItems: CaldwellDrawLineItem[];
  costCodes: CaldwellCostCode[];
  changeOrdersThroughThisDraw: CaldwellChangeOrder[];
  // Every invoice linked to this draw (drill-down: "Invoices in this draw" +
  // per-line expansion). Renderer-agnostic (AIA + statement both consume it).
  drawInvoices: DrawInvoice[];
  // F6-family D3 (nwrp286 Q3): display-only signal — a DRAFT or SUBMITTED draw's
  // stored G702 summary diverges from a from-source recompute (NEW-2: submitted
  // draws' current_payment_due column is never refreshed by draw_submit_rpc).
  // Separate prop (the CaldwellDraw fixture shape is locked). Always false for
  // issued draws (approved/locked/paid) — they render from the frozen snapshot.
  storedSummaryStale: boolean;
  // Billing-method fork (Phase 1). billingMethod drives which renderer the
  // page mounts. `statement` is populated ONLY for cost_plus_statement jobs.
  billingMethod: "aia" | "cost_plus_statement" | "fixed_fee_schedule";
  statement: StatementViewData | null;
  // BLOCK B — deposit application (1.6) + adjustments (1.2). Both renderers
  // show the "Less Deposit Credit Applied" line + "Adjustments & Credits"
  // section from these; current_payment_due already reflects them.
  deposit: DepositState;
  adjustments: DrawAdjustment[]; // applied_to_draw + approved (pending pool)
  appliedAdjustmentsTotal: number; // signed sum of applied_to_draw only
  // PRINT FIDELITY — AIA G702 line 5 (retainage withheld this application) +
  // contractor letterhead identity sourced from the org row (NOT hardcoded).
  // Both drive DrawPrintView; previously the print hardcoded 0% retainage +
  // "Ross Built Custom Homes", contradicting the withheld math on any tenant.
  retainage: { percent: number; amount: number }; // percent 0-100; amount cents
  contractor: { name: string; address: string };
  // R2 — org-configured G702 signatory; empty strings when unset (print blank).
  signatory: { name: string; title: string };
};

// PRINT FIDELITY — format the org row's company_* parts into a single
// letterhead address line ("305 67th St West, Bradenton FL 34209"). Missing
// parts drop gracefully so a partially-filled org still renders cleanly.
function formatOrgAddress(
  org: {
    company_address?: string | null;
    company_city?: string | null;
    company_state?: string | null;
    company_zip?: string | null;
  } | null
): string {
  if (!org) return "";
  const street = (org.company_address ?? "").trim();
  const city = (org.company_city ?? "").trim();
  const state = (org.company_state ?? "").trim();
  const zip = (org.company_zip ?? "").trim();
  const cityStateZip = [city, [state, zip].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(" ");
  return [street, cityStateZip].filter(Boolean).join(", ");
}

const KNOWN_DRAW_STATUSES: ReadonlyArray<CaldwellDraw["status"]> = [
  "draft",
  "pm_review",
  "approved",
  "submitted",
  "paid",
  "void",
];

const KNOWN_JOB_STATUSES: ReadonlyArray<CaldwellJob["status"]> = [
  "active",
  "complete",
  "warranty",
  "cancelled",
];

type JobEmbed = {
  id: string;
  name: string;
  address: string | null;
  contract_type: string | null;
  status: string | null;
  deposit_percentage: number | string | null;
  gc_fee_percentage: number | string | null;
  retainage_percent: number | string | null;
  original_contract_amount: number | null;
  current_contract_amount: number | null;
  starting_application_number: number | null;
  previous_co_completed_amount: number | null;
  billing_method: string | null;
  markup_display: string | null;
  backup_detail: string | null;
  pm_id: string | null;
  client: { id: string; full_name: string | null } | { id: string; full_name: string | null }[] | null;
};

export async function loadPayAppViewData(
  drawId: string
): Promise<PayAppViewData | null> {
  // Fast path: middleware-forwarded org headers (skips auth.getUser() +
  // org_members — 2 sequential round-trips measured on the 4.6s SSR chain).
  const membership = (await getMembershipFromHeaders()) ?? (await getCurrentMembership());
  if (!membership) return null;

  const supabase = createServerClient();

  // Draw row + org letterhead row are independent — fetch in parallel.
  const [{ data: draw, error }, { data: orgRow }] = await Promise.all([
    supabase
      .from("draws")
      .select(
        `*, jobs:job_id (id, name, address, contract_type, status, deposit_percentage, gc_fee_percentage, retainage_percent, original_contract_amount, current_contract_amount, starting_application_number, previous_co_completed_amount, billing_method, markup_display, backup_detail, pm_id, client:clients(id, full_name))`
      )
      .eq("id", drawId)
      .eq("org_id", membership.org_id)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("organizations")
      .select(
        "name, logo_url, company_address, company_city, company_state, company_zip, pay_app_signatory_name, pay_app_signatory_title, default_markup_display, default_backup_detail"
      )
      .eq("id", membership.org_id)
      .maybeSingle(),
  ]);

  if (error) {
    console.error("[pay-apps/[id]] draw query error:", error);
    return null;
  }
  if (!draw) return null;

  // PRINT FIDELITY — contractor letterhead identity from the org row (NOT
  // hardcoded; fetched in the parallel pair above). Shared by BOTH the
  // frozen-snapshot early-return and the live recompute path. Presentation
  // identity legitimately reflects CURRENT org identity even on a frozen
  // draw — only the FINANCIALS are byte-frozen at approval, not the
  // letterhead. Also reused by the cost_plus_statement branch below
  // (default_markup_display/backup_detail).
  const contractor = {
    name: (orgRow?.name as string | null) ?? "",
    address: formatOrgAddress(
      orgRow as {
        company_address?: string | null;
        company_city?: string | null;
        company_state?: string | null;
        company_zip?: string | null;
      } | null
    ),
  };
  // R2 (PRINT SIGNATORY) — org-configured G702 signer. Empty when unset → the
  // print renders blank signature lines (never a defaulted/hardcoded person).
  const signatory = {
    name: (orgRow?.pay_app_signatory_name as string | null) ?? "",
    title: (orgRow?.pay_app_signatory_title as string | null) ?? "",
  };

  // ── FROZEN SNAPSHOT (TD-NW-DRAW-SNAPSHOT) ─────────────────────────────
  // Approved/locked/paid draws render from the snapshot captured at approval
  // — never recompute — so later source changes can't alter an issued draw.
  // The current status/dates are overlaid so approved→paid still shows the
  // right status while the financials stay byte-frozen.
  const rawStatusForSnap = draw.status as string;
  if (
    ["approved", "locked", "paid"].includes(rawStatusForSnap) &&
    draw.snapshot
  ) {
    const snap = draw.snapshot as PayAppViewData;
    const mappedStatus = (KNOWN_DRAW_STATUSES as readonly string[]).includes(
      rawStatusForSnap
    )
      ? (rawStatusForSnap as CaldwellDraw["status"])
      : "submitted";
    return {
      ...snap,
      draw: {
        ...snap.draw,
        status: mappedStatus,
        submitted_at: (draw.submitted_at as string | null) ?? snap.draw.submitted_at,
        paid_at: (draw.paid_at as string | null) ?? snap.draw.paid_at,
        revision_number:
          (draw.revision_number as number | null) ?? snap.draw.revision_number,
      },
      storedSummaryStale: false,
      // BLOCK B — backfill deposit/adjustments for snapshots captured before
      // 1.2/1.6 (a frozen draw stays byte-frozen; missing = none applied).
      deposit:
        snap.deposit ?? {
          pool: snap.draw?.deposit_amount ?? 0,
          applied: 0,
          appliedToDate: 0,
          remaining: snap.draw?.deposit_amount ?? 0,
        },
      adjustments: snap.adjustments ?? [],
      appliedAdjustmentsTotal: snap.appliedAdjustmentsTotal ?? 0,
      // PRINT FIDELITY — pre-fix snapshots lack retainage; 0 fallback matches
      // exactly what they printed before (no regression). Contractor is fresh
      // (presentation identity, not frozen financials).
      retainage: snap.retainage ?? { percent: 0, amount: 0 },
      contractor,
      signatory,
    };
  }

  const jobEmbed = (
    Array.isArray(draw.jobs) ? draw.jobs[0] ?? null : draw.jobs
  ) as JobEmbed | null;
  if (!jobEmbed) {
    console.error("[pay-apps/[id]] draw returned null job embed:", {
      id: draw.id,
      job_id: draw.job_id,
    });
    return null;
  }
  const clientEmbed = Array.isArray(jobEmbed.client)
    ? jobEmbed.client[0] ?? null
    : jobEmbed.client;

  // PERF RUN 2026-07-17: the reads below were a ~10-deep sequential await
  // chain (measured 4.6s streamed SSR on prod). They are mutually
  // independent reads — parallelized here with IDENTICAL inputs flowing to
  // computeDrawLines/rollupDrawTotals (concurrency only; no money-math
  // change, F1 firewall intact).
  const [
    { data: linkRowsForDraw },
    { data: budgetLinesRaw },
    lessPrevCerts,
    nonBudgetLineThisPeriod,
    appliedAdjustmentsTotal,
    depositAppliedOnOthers,
    { data: adjRows },
    uncaptured,
    { data: coRows },
  ] = await Promise.all([
    // Invoices linked to this draw — junction membership (00122). Each
    // carries its THIS-JOB portion (Σ allocations on the draw's job; full
    // total only for allocation-less invoices headered here) so the
    // statement backup and "Invoices in this draw" tie to the per-portion
    // G703 cent-exact.
    supabase
      .from("invoice_draw_links")
      .select("invoice_id")
      .eq("draw_id", drawId)
      .is("deleted_at", null),
    // Budget lines + cost-code embeds for the G703 rows.
    supabase
      .from("budget_lines")
      .select(
        `id, cost_code_id, original_estimate, revised_estimate, previous_applications_baseline,
         cost_codes:cost_code_id (code, description, category, sort_order)`
      )
      .eq("job_id", draw.job_id as string)
      .eq("org_id", membership.org_id)
      .is("deleted_at", null),
    lessPreviousCertificatesForJob(
      draw.job_id as string,
      draw.draw_number as number,
      draw.id as string
    ),
    nonBudgetLineThisPeriodForDraw(draw.id as string),
    // BLOCK B — deposit + adjustments for this draw (both feed
    // current_payment_due).
    appliedAdjustmentsForDraw(draw.id as string),
    depositAppliedToDateForJob(draw.job_id as string, draw.id as string),
    // Adjustment rows for the Adjustments & Credits section (applied) + the
    // wizard's pending pool (approved). Display only — the math sum comes
    // from the canonical appliedAdjustmentsForDraw helper (single source).
    supabase
      .from("draw_adjustments")
      .select(
        "id, adjustment_type, adjustment_status, amount_cents, reason, affected_pcco_number"
      )
      .eq("draw_id", draw.id as string)
      .eq("org_id", membership.org_id)
      .in("adjustment_status", ["approved", "applied_to_draw"])
      .is("deleted_at", null)
      .order("created_at"),
    // HANDOFF #2 — uncoded linked-invoice dollars (see drawAdjustments push
    // below).
    uncapturedLinkedInvoicesForDraw(draw.id as string),
    // Approved/executed change orders on the job (contract-sum running
    // total).
    supabase
      .from("change_orders")
      .select(
        "id, job_id, pcco_number, title, description, amount, gc_fee_amount, gc_fee_rate, total_with_fee, estimated_days_added, status, approved_date, draw_number"
      )
      .eq("job_id", draw.job_id as string)
      .eq("org_id", membership.org_id)
      .in("status", ["approved", "executed"])
      .is("deleted_at", null)
      .order("pcco_number"),
  ]);
  const linkedInvoiceIds = Array.from(
    new Set((linkRowsForDraw ?? []).map((l) => (l as { invoice_id: string }).invoice_id))
  );
  // Linked invoices + their allocations — independent given the id set.
  const [{ data: invoices }, { data: portionAllocRows }] = linkedInvoiceIds.length
    ? await Promise.all([
        supabase
          .from("invoices")
          .select("id, vendor_name_raw, invoice_number, total_amount, cost_code_id, received_date, status, job_id")
          .in("id", linkedInvoiceIds)
          .eq("org_id", membership.org_id)
          .is("deleted_at", null),
        supabase
          .from("invoice_allocations")
          .select("invoice_id, amount_cents, job_id")
          .in("invoice_id", linkedInvoiceIds)
          .is("deleted_at", null),
      ])
    : [{ data: [] as never[] }, { data: [] as never[] }];
  const invoiceHasAllocs = new Set(
    (portionAllocRows ?? []).map((a) => (a as { invoice_id: string }).invoice_id)
  );
  const invoicePortion = new Map<string, number>();
  for (const a of portionAllocRows ?? []) {
    const row = a as { invoice_id: string; amount_cents: number; job_id: string };
    if (row.job_id !== (draw.job_id as string)) continue;
    invoicePortion.set(
      row.invoice_id,
      (invoicePortion.get(row.invoice_id) ?? 0) + (row.amount_cents ?? 0)
    );
  }
  const portionFor = (inv: { id: unknown; total_amount: unknown; job_id?: unknown }): number =>
    invoiceHasAllocs.has(inv.id as string)
      ? invoicePortion.get(inv.id as string) ?? 0
      : (inv.job_id as string | null) === (draw.job_id as string)
        ? Number(inv.total_amount ?? 0)
        : 0;

  // Budget lines fetched in the parallel group above; shim the embeds here.
  const budgetLines = (budgetLinesRaw ?? []).map((bl) => ({
    ...bl,
    cost_codes: (Array.isArray(bl.cost_codes)
      ? bl.cost_codes[0] ?? null
      : bl.cost_codes) as {
      code: string;
      description: string;
      category: string | null;
      sort_order: number | null;
    } | null,
  }));

  // Recompute G702/G703 math — same helper chain + parameters as
  // /api/draws/[id] (route.ts:126-156), minus the budget-line auto-create.
  const retainagePct = Number(jobEmbed.retainage_percent ?? 10);
  const invoiceIds = (invoices ?? []).map((i) => i.id as string);
  const { lines: snapshot } = await computeDrawLines({
    jobId: draw.job_id as string,
    drawNumber: draw.draw_number as number,
    excludeDrawId: draw.id as string,
    periodStart: (draw.period_start as string | null) ?? null,
    periodEnd: (draw.period_end as string | null) ?? null,
    drawInvoiceIds: invoiceIds,
    retainagePercent: retainagePct,
    isFinalDraw: !!draw.is_final,
  });

  // lessPrevCerts / nonBudgetLineThisPeriod / appliedAdjustmentsTotal /
  // depositAppliedOnOthers / adjRows all resolved in the parallel group above.
  const depositApplied = (draw.deposit_applied_cents as number | null) ?? 0;
  const drawAdjustments: DrawAdjustment[] = (adjRows ?? []).map((a) => ({
    id: a.id as string,
    adjustment_type: (a.adjustment_type as string) ?? "",
    adjustment_status: (a.adjustment_status as string) ?? "",
    amount_cents: Number(a.amount_cents ?? 0),
    reason: (a.reason as string) ?? "",
    affected_pcco_number: (a.affected_pcco_number as string | null) ?? null,
  }));

  // HANDOFF #2 — uncoded linked-invoice dollars (a credit memo with no cost
  // code) fold into current_payment_due AND surface as Adjustments & Credits
  // entries, so a linked invoice can never contribute $0. Pushed as synthetic
  // 'applied_to_draw' rows so the shared section renders them alongside real
  // draw_adjustments; the math term is uncaptured.total, SEPARATE from
  // appliedAdjustmentsTotal (no double count). (`uncaptured` resolved in the
  // parallel group above.)
  for (const it of uncaptured.items) {
    drawAdjustments.push({
      id: `uncaptured-${it.id}`,
      adjustment_type: "uncoded_invoice",
      adjustment_status: "applied_to_draw",
      amount_cents: it.amount,
      reason: `Uncoded linked invoice — ${it.vendor}${it.invoice_number ? ` #${it.invoice_number}` : ""}`,
      affected_pcco_number: null,
    });
  }

  const totals = rollupDrawTotals({
    originalContractSum: (draw.original_contract_sum as number | null) ?? 0,
    netChangeOrders: (draw.net_change_orders as number | null) ?? 0,
    depositPercentage: Number(jobEmbed.deposit_percentage ?? 0.1),
    retainagePercent: retainagePct,
    lines: snapshot,
    lessPreviousCertificates: lessPrevCerts,
    isFinalDraw: !!draw.is_final,
    nonBudgetLineThisPeriod,
    previousCoCompletedAmount: Number(
      jobEmbed.previous_co_completed_amount ?? 0
    ),
    depositAppliedCents: depositApplied,
    appliedAdjustmentsCents: appliedAdjustmentsTotal,
    uncapturedLinkedCents: uncaptured.total,
  });

  // ---- Shims (locked View contracts; CaldwellX shapes) ----
  // (coRows resolved in the parallel group above.)

  const rawDrawStatus = draw.status as string;
  const drawStatus: CaldwellDraw["status"] = (
    KNOWN_DRAW_STATUSES as readonly string[]
  ).includes(rawDrawStatus)
    ? (rawDrawStatus as CaldwellDraw["status"])
    : "submitted"; // 'locked' renders as SUBMITTED

  // F6-family D3 (nwrp286 Q3): DISPLAY-ONLY staleness signal. Compare the stored
  // G702 summary columns against a from-source recompute. net_change_orders is
  // recomputed from change_orders (catches a CO approved after the row was
  // written); the rest come from rollupDrawTotals (genuinely source-derived).
  // Pass-through fields (original_contract_sum, contract_sum_to_date) are
  // excluded — they could never flag (see draw-staleness.ts).
  //
  // NEW-2 hygiene: computed for DRAFT *and* SUBMITTED draws. draw_submit_rpc
  // does not refresh the stored current_payment_due column, so a submitted
  // draw's cached summary can drift from the recompute the detail actually
  // renders — badge it honestly wherever it still displays. Issued draws
  // (approved/locked/paid) render from the frozen snapshot and returned above,
  // so they never reach here and stay non-stale by construction.
  let storedSummaryStale = false;
  if (drawStatus === "draft" || drawStatus === "submitted") {
    const recomputedNetChangeOrders = await netChangeOrdersForJob(
      draw.job_id as string
    );
    storedSummaryStale = computeDrawStaleness(
      {
        net_change_orders: (draw.net_change_orders as number | null) ?? 0,
        total_completed_to_date:
          (draw.total_completed_to_date as number | null) ?? 0,
        current_payment_due: (draw.current_payment_due as number | null) ?? 0,
        balance_to_finish: (draw.balance_to_finish as number | null) ?? 0,
        deposit_amount: (draw.deposit_amount as number | null) ?? 0,
      },
      {
        net_change_orders: recomputedNetChangeOrders,
        total_completed_to_date: totals.total_completed_to_date,
        current_payment_due: totals.current_payment_due,
        balance_to_finish: totals.balance_to_finish,
        deposit_amount: totals.deposit_amount,
      }
    );
  }

  const drawShim: CaldwellDraw = {
    id: draw.id as string,
    job_id: draw.job_id as string,
    // User-facing application number (job starting offset honored — Fish
    // starts at #21 per jobs.starting_application_number).
    draw_number: applicationNumberForDraw(
      { draw_number: draw.draw_number as number },
      {
        starting_application_number:
          jobEmbed.starting_application_number ?? null,
      }
    ),
    application_date:
      (draw.application_date as string | null) ??
      (draw.period_end as string | null) ??
      "",
    period_start: (draw.period_start as string | null) ?? "",
    period_end: (draw.period_end as string | null) ?? "",
    status: drawStatus,
    revision_number: (draw.revision_number as number | null) ?? 0,
    original_contract_sum: totals.original_contract_sum,
    net_change_orders: totals.net_change_orders,
    contract_sum_to_date: totals.contract_sum_to_date,
    total_completed_to_date: totals.total_completed_to_date,
    less_previous_payments: totals.less_previous_payments,
    current_payment_due: totals.current_payment_due,
    balance_to_finish: totals.balance_to_finish,
    deposit_amount: totals.deposit_amount,
    submitted_at: (draw.submitted_at as string | null) ?? null,
    paid_at: (draw.paid_at as string | null) ?? null,
  };

  const rawJobStatus = (jobEmbed.status ?? "active") as string;
  const jobShim: CaldwellJob = {
    id: jobEmbed.id,
    name: jobEmbed.name,
    address: jobEmbed.address ?? "",
    // PII fence (D-078/D-079): client embed is (id, full_name) only —
    // email/phone intentionally NOT fetched; the print owner block renders
    // name + address only.
    client_name: clientEmbed?.full_name ?? "—",
    client_email: "",
    client_phone: "",
    contract_type:
      jobEmbed.contract_type === "fixed" ? "fixed" : "cost_plus",
    original_contract_amount: Number(jobEmbed.original_contract_amount ?? 0),
    current_contract_amount: Number(jobEmbed.current_contract_amount ?? 0),
    pm_id: jobEmbed.pm_id ?? "",
    status: (KNOWN_JOB_STATUSES as readonly string[]).includes(rawJobStatus)
      ? (rawJobStatus as CaldwellJob["status"])
      : "active",
    deposit_percentage: Number(jobEmbed.deposit_percentage ?? 0.1),
    gc_fee_percentage: Number(jobEmbed.gc_fee_percentage ?? 0.2),
  };

  // BLOCK B / 1.3 — G703 UNION. The recomputed snapshot spans the union of
  // budget-line codes AND unbudgeted this/prior-period invoice codes (see
  // draw-calc computeDrawLines). Previously the G703 rows were built from
  // budget_lines ONLY, so unbudgeted invoice codes landed in the G702 total
  // (via the snapshot) but were absent from the continuation sheet — the sheet
  // didn't tie out. Build rows from the FULL snapshot so Σ(G703 rows) captures
  // every this-period dollar. Scheduled Value ("Original") is reconstructed by
  // the View as previous + this_period + balance_to_finish; draw-calc sets an
  // unbudgeted line's balance to 0 (scheduled = billed-to-date, 100%) — the
  // same convention the /api/draws/[id] route + PDF already render.
  const blByCc = new Map(
    budgetLines.map((bl) => [bl.cost_code_id as string, bl])
  );

  // Labels for every snapshot cost code. Budget-line codes carry their embed;
  // unbudgeted codes (no budget line here — this loader never auto-creates)
  // need a direct lookup.
  const ccLabel = new Map<
    string,
    { code: string; description: string; category: string; sort_order: number }
  >();
  for (const bl of budgetLines) {
    if (bl.cost_codes) {
      ccLabel.set(bl.cost_code_id as string, {
        code: bl.cost_codes.code,
        description: bl.cost_codes.description,
        category: bl.cost_codes.category ?? "",
        sort_order: bl.cost_codes.sort_order ?? 0,
      });
    }
  }
  const unlabeledCc = Array.from(
    new Set(snapshot.map((l) => l.cost_code_id).filter((id) => !ccLabel.has(id)))
  );
  if (unlabeledCc.length > 0) {
    const { data: ccRows } = await supabase
      .from("cost_codes")
      .select("id, code, description, category, sort_order")
      .eq("org_id", membership.org_id)
      .in("id", unlabeledCc);
    for (const cc of ccRows ?? []) {
      ccLabel.set(cc.id as string, {
        code: (cc.code as string) ?? "—",
        description: (cc.description as string) ?? "",
        category: (cc.category as string) ?? "",
        sort_order: (cc.sort_order as number | null) ?? 0,
      });
    }
  }

  const lineItems: CaldwellDrawLineItem[] = snapshot
    .map((s) => {
      const bl = blByCc.get(s.cost_code_id);
      const label = ccLabel.get(s.cost_code_id);
      return {
        id: bl ? `computed-${bl.id}` : `computed-cc-${s.cost_code_id}`,
        draw_id: draw.id as string,
        budget_line_id: bl ? (bl.id as string) : `unbudgeted-${s.cost_code_id}`,
        cost_code_id: s.cost_code_id,
        previous_applications: s.previous_applications,
        this_period: s.this_period,
        total_to_date: s.total_completed,
        percent_complete: s.percent_complete / 100,
        balance_to_finish: s.balance_to_finish,
        sort: label?.sort_order ?? 0,
      };
    })
    .sort((a, b) => a.sort - b.sort)
    .map(({ sort: _sort, ...li }) => li);

  const costCodes: CaldwellCostCode[] = snapshot
    .map((s) => {
      const label = ccLabel.get(s.cost_code_id);
      return {
        id: s.cost_code_id,
        code: label?.code ?? "—",
        description: label?.description ?? "",
        category: label?.category ?? "",
        sort_order: label?.sort_order ?? 0,
      };
    })
    .sort((a, b) => a.sort_order - b.sort_order);

  const changeOrdersThroughThisDraw: CaldwellChangeOrder[] = (
    coRows ?? []
  ).map((co) => ({
    id: co.id as string,
    job_id: co.job_id as string,
    pcco_number: (co.pcco_number as number | null) ?? 0,
    description:
      (co.title as string | null) ?? (co.description as string | null) ?? "",
    amount: Number(co.amount ?? 0),
    gc_fee_amount: Number(co.gc_fee_amount ?? 0),
    gc_fee_rate: Number(co.gc_fee_rate ?? 0),
    total_with_fee: Number(co.total_with_fee ?? co.amount ?? 0),
    estimated_days_added: (co.estimated_days_added as number | null) ?? 0,
    status: co.status === "executed" ? "executed" : "approved",
    approved_date: (co.approved_date as string | null) ?? null,
    draw_number: (co.draw_number as number | null) ?? null,
  }));

  // ---- Invoices in this draw (drill-down; both renderers) ----
  // Resolve cost-code labels for the invoices' cost_code_ids (may include
  // codes outside budgetLines, e.g. unbudgeted invoice codes).
  const invCcIds = Array.from(
    new Set((invoices ?? []).map((i) => i.cost_code_id as string | null).filter(Boolean) as string[])
  );
  const invCcMap = new Map<string, string>();
  if (invCcIds.length > 0) {
    const { data: ccRows } = await supabase
      .from("cost_codes")
      .select("id, code")
      .eq("org_id", membership.org_id)
      .in("id", invCcIds);
    for (const cc of ccRows ?? []) invCcMap.set(cc.id as string, (cc.code as string) ?? "—");
  }
  const drawInvoices = (invoices ?? [])
    .map((i) => ({
      id: i.id as string,
      vendor: (i.vendor_name_raw as string | null) ?? "—",
      invoice_number: (i.invoice_number as string | null) ?? null,
      received_date: (i.received_date as string | null) ?? null,
      // THIS-JOB portion (00122) — the statement/backup rows tie to the
      // per-portion G703, never the cross-job invoice total.
      amount: portionFor(i),
      invoice_total: Number(i.total_amount ?? 0),
      cost_code_id: (i.cost_code_id as string | null) ?? null,
      code: i.cost_code_id ? invCcMap.get(i.cost_code_id as string) ?? null : null,
      // Stamped once approved (no approved_at column — derive from status).
      stamped: ["qa_approved", "pushed_to_qb", "in_draw", "paid"].includes(
        (i.status as string | null) ?? ""
      ),
    }))
    .sort((a, b) => (a.received_date ?? "").localeCompare(b.received_date ?? ""));

  // ---- Billing-method fork data (Phase 1) ----
  const billingMethod = ((jobEmbed.billing_method as string) ??
    "aia") as PayAppViewData["billingMethod"];

  let statement: StatementViewData | null = null;
  if (billingMethod === "cost_plus_statement") {
    // Org identity + config defaults sourced from the top-level orgRow fetch
    // (single query; reused for the contractor letterhead + statement header).

    // Resolve code/description for EVERY cost code carrying this-period cost
    // (snapshot spans the union of budget-line + invoice codes; unbudgeted
    // codes aren't in `costCodes` which is budget-line-derived).
    const costCodeIds = Array.from(
      new Set(snapshot.filter((l) => l.this_period > 0).map((l) => l.cost_code_id))
    );
    const ccMap = new Map<string, { code: string; description: string; sort: number }>();
    if (costCodeIds.length > 0) {
      const { data: ccRows } = await supabase
        .from("cost_codes")
        .select("id, code, description, sort_order")
        .eq("org_id", membership.org_id)
        .in("id", costCodeIds);
      for (const cc of ccRows ?? []) {
        ccMap.set(cc.id as string, {
          code: (cc.code as string) ?? "—",
          description: (cc.description as string) ?? "",
          sort: (cc.sort_order as number | null) ?? 0,
        });
      }
    }

    // Invoices grouped by cost code (invoice-level cost_code_id) for the
    // "detailed" backup rows.
    const invByCode = new Map<
      string,
      { vendor: string; invoice_number: string | null; amount: number }[]
    >();
    for (const inv of invoices ?? []) {
      const cc = (inv.cost_code_id as string | null) ?? "__unassigned__";
      const list = invByCode.get(cc) ?? [];
      list.push({
        vendor: (inv.vendor_name_raw as string | null) ?? "—",
        invoice_number: (inv.invoice_number as string | null) ?? null,
        // 00122: THIS-JOB portion — the open-book backup rows must tie to
        // the per-portion code subtotals, never a cross-job invoice total.
        amount: portionFor(inv),
      });
      invByCode.set(cc, list);
    }

    const costLines: StatementCostLineData[] = snapshot
      .filter((l) => l.this_period > 0)
      .map((l) => {
        const meta = ccMap.get(l.cost_code_id);
        return {
          cost_code_id: l.cost_code_id,
          code: meta?.code ?? "—",
          description: meta?.description ?? "",
          cost: l.this_period,
          invoices: invByCode.get(l.cost_code_id) ?? [],
          _sort: meta?.sort ?? 0,
        };
      })
      .sort((a, b) => a._sort - b._sort)
      .map(({ _sort, ...rest }) => rest);

    statement = {
      costLines,
      markupPercent: Number(jobEmbed.gc_fee_percentage ?? 0.2),
      markupDisplay: resolveMarkupDisplay(
        jobEmbed.markup_display,
        (orgRow?.default_markup_display as string | null) ?? null
      ),
      backupDetail: resolveBackupDetail(
        jobEmbed.backup_detail,
        (orgRow?.default_backup_detail as string | null) ?? null
      ),
      // Credits render only when nonzero (statement-calc drops zeros). Sourced
      // from the same recomputed totals the AIA cover sheet uses. BLOCK B:
      // deposit_application is the amount APPLIED this draw (deposit_applied) —
      // NOT the full pool (totals.deposit_amount) which was credited on every
      // draw before 1.6.
      credits: {
        deposit_application: totals.deposit_applied,
        retainage: totals.total_retainage,
        prior_payments: totals.less_previous_payments,
      },
      org: {
        name: (orgRow?.name as string | null) ?? "",
        logo_url: (orgRow?.logo_url as string | null) ?? null,
      },
      clientName: jobShim.client_name,
      statementNumber: drawShim.draw_number,
      applicationDate: drawShim.application_date,
      periodStart: drawShim.period_start,
      periodEnd: drawShim.period_end,
    };
  }

  return {
    draw: drawShim,
    job: jobShim,
    lineItems,
    costCodes,
    changeOrdersThroughThisDraw,
    drawInvoices,
    storedSummaryStale,
    billingMethod,
    statement,
    deposit: {
      pool: totals.deposit_amount,
      applied: depositApplied,
      appliedToDate: depositAppliedOnOthers + depositApplied,
      remaining: Math.max(
        0,
        totals.deposit_amount - depositAppliedOnOthers - depositApplied
      ),
    },
    adjustments: drawAdjustments,
    appliedAdjustmentsTotal,
    // PRINT FIDELITY — actual retainage withheld this application (AIA line 5)
    // + org letterhead identity, both fed into DrawPrintView.
    retainage: { percent: retainagePct, amount: totals.total_retainage },
    contractor,
    signatory,
  };
}

/**
 * Freeze a draw's fully-computed render data into draws.snapshot. Called at
 * approval (post-RPC). loadPayAppViewData recomputes here because the draw's
 * snapshot is still NULL at capture time (the frozen-status early-return only
 * engages once a snapshot exists), so this captures fresh, correct data. From
 * the next read on, approved/locked/paid draws render from this verbatim.
 * Stored via service role (trusted drawId, post-approval). Non-fatal on error
 * — a failed freeze just means the draw keeps recomputing until re-approved.
 */
export async function captureAndStoreSnapshot(drawId: string): Promise<boolean> {
  const data = await loadPayAppViewData(drawId);
  if (!data) return false;
  const svc = createServiceRoleClient();
  const { error } = await svc
    .from("draws")
    .update({ snapshot: data })
    .eq("id", drawId);
  if (error) {
    console.warn(`[draw snapshot] capture failed for ${drawId}: ${error.message}`);
    return false;
  }
  return true;
}
