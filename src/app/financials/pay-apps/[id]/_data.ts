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
import { getCurrentMembership } from "@/lib/org/session";
import {
  applicationNumberForDraw,
  computeDrawLines,
  lessPreviousCertificatesForJob,
  netChangeOrdersForJob,
  nonBudgetLineThisPeriodForDraw,
  rollupDrawTotals,
} from "@/lib/draw-calc";
import { computeDrawStaleness } from "@/lib/draw-staleness";
import type {
  CaldwellChangeOrder,
  CaldwellCostCode,
  CaldwellDraw,
  CaldwellDrawLineItem,
  CaldwellJob,
} from "@/app/design-system/_fixtures/drummond/types";

export type PayAppViewData = {
  draw: CaldwellDraw;
  job: CaldwellJob;
  lineItems: CaldwellDrawLineItem[];
  costCodes: CaldwellCostCode[];
  changeOrdersThroughThisDraw: CaldwellChangeOrder[];
  // F6-family D3 (nwrp286 Q3): display-only signal — a DRAFT draw's stored
  // G702 summary diverges from a from-source recompute. Separate prop (the
  // CaldwellDraw fixture shape is locked). Always false for non-draft draws.
  storedSummaryStale: boolean;
};

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
  pm_id: string | null;
  client: { id: string; full_name: string | null } | { id: string; full_name: string | null }[] | null;
};

export async function loadPayAppViewData(
  drawId: string
): Promise<PayAppViewData | null> {
  const membership = await getCurrentMembership();
  if (!membership) return null;

  const supabase = createServerClient();

  const { data: draw, error } = await supabase
    .from("draws")
    .select(
      `*, jobs:job_id (id, name, address, contract_type, status, deposit_percentage, gc_fee_percentage, retainage_percent, original_contract_amount, current_contract_amount, starting_application_number, previous_co_completed_amount, pm_id, client:clients(id, full_name))`
    )
    .eq("id", drawId)
    .eq("org_id", membership.org_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("[pay-apps/[id]] draw query error:", error);
    return null;
  }
  if (!draw) return null;

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

  // Invoices linked to this draw (this_period source for computeDrawLines).
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id")
    .eq("draw_id", drawId)
    .eq("org_id", membership.org_id)
    .is("deleted_at", null);

  // Budget lines + cost-code embeds for the G703 rows.
  const { data: budgetLinesRaw } = await supabase
    .from("budget_lines")
    .select(
      `id, cost_code_id, original_estimate, revised_estimate, previous_applications_baseline,
       cost_codes:cost_code_id (code, description, category, sort_order)`
    )
    .eq("job_id", draw.job_id as string)
    .eq("org_id", membership.org_id)
    .is("deleted_at", null);

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

  const lessPrevCerts = await lessPreviousCertificatesForJob(
    draw.job_id as string,
    draw.draw_number as number,
    draw.id as string
  );
  const nonBudgetLineThisPeriod = await nonBudgetLineThisPeriodForDraw(
    draw.id as string
  );

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
  });

  // Approved/executed change orders on the job (contract-sum running total).
  const { data: coRows } = await supabase
    .from("change_orders")
    .select(
      "id, job_id, pcco_number, title, description, amount, gc_fee_amount, gc_fee_rate, total_with_fee, estimated_days_added, status, approved_date, draw_number"
    )
    .eq("job_id", draw.job_id as string)
    .eq("org_id", membership.org_id)
    .in("status", ["approved", "executed"])
    .is("deleted_at", null)
    .order("pcco_number");

  // ---- Shims (locked View contracts; CaldwellX shapes) ----

  const rawDrawStatus = draw.status as string;
  const drawStatus: CaldwellDraw["status"] = (
    KNOWN_DRAW_STATUSES as readonly string[]
  ).includes(rawDrawStatus)
    ? (rawDrawStatus as CaldwellDraw["status"])
    : "submitted"; // 'locked' renders as SUBMITTED

  // F6-family D3 (nwrp286 Q3): DISPLAY-ONLY staleness signal for DRAFT draws.
  // Compare the stored G702 summary columns against a from-source recompute.
  // net_change_orders is recomputed from change_orders (catches a CO approved
  // after this draft was written — the phase-relevant signal); the rest come
  // from rollupDrawTotals (genuinely source-derived). Pass-through fields
  // (original_contract_sum, contract_sum_to_date) are excluded — they could
  // never flag (see draw-staleness.ts). Only computed for drafts (the only
  // status that shows the badge) so non-draft renders skip the extra query.
  let storedSummaryStale = false;
  if (drawStatus === "draft") {
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

  // G703 rows: merge the recomputed snapshot into budget lines by
  // cost_code_id (same merge as route.ts:158-188), sorted by cost-code
  // sort_order. percent_complete scaled 0..100 → 0..1 for the Views.
  const snapByCc = new Map(snapshot.map((l) => [l.cost_code_id, l]));
  const lineItems: CaldwellDrawLineItem[] = budgetLines
    .map((bl) => {
      const s = snapByCc.get(bl.cost_code_id as string);
      const previous_applications =
        s?.previous_applications ??
        ((bl.previous_applications_baseline as number | null) ?? 0);
      const this_period = s?.this_period ?? 0;
      const total_to_date = s?.total_completed ?? previous_applications;
      const revised = (bl.revised_estimate as number | null) ?? 0;
      const percent01 =
        s != null
          ? s.percent_complete / 100
          : revised > 0
            ? total_to_date / revised
            : 0;
      return {
        id: `computed-${bl.id}`,
        draw_id: draw.id as string,
        budget_line_id: bl.id as string,
        cost_code_id: bl.cost_code_id as string,
        previous_applications,
        this_period,
        total_to_date,
        percent_complete: percent01,
        balance_to_finish:
          s?.balance_to_finish ?? Math.max(0, revised - total_to_date),
        sort: bl.cost_codes?.sort_order ?? 0,
      };
    })
    .sort((a, b) => a.sort - b.sort)
    .map(({ sort: _sort, ...li }) => li);

  const costCodes: CaldwellCostCode[] = budgetLines
    .filter((bl) => bl.cost_codes != null)
    .map((bl) => ({
      id: bl.cost_code_id as string,
      code: bl.cost_codes!.code,
      description: bl.cost_codes!.description,
      category: bl.cost_codes!.category ?? "",
      sort_order: bl.cost_codes!.sort_order ?? 0,
    }));

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

  return {
    draw: drawShim,
    job: jobShim,
    lineItems,
    costCodes,
    changeOrdersThroughThisDraw,
    storedSummaryStale,
  };
}
