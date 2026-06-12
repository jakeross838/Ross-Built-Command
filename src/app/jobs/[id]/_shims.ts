// src/app/jobs/[id]/_shims.ts
//
// Per-job wiring shims (W-1..W-3 per nwrp282 / TD-NW-PER-JOB-TAB-WIRING).
// Maps live DB rows into the locked-shape Caldwell* prototype-View
// contracts — the E-3 / F10 pattern (construct fixture-SHAPED objects from
// rows + safe defaults; never edit the Views). STORED values only: per-job
// tabs are context surfaces; recompute-on-read stays with the canonical
// /api/draws/[id] + F10 detail paths.
//
// Scale notes carried from F10's loader: NUMERIC columns arrive as strings
// (Number()'d); DB draw status 'locked' is absent from the View enum and
// renders as 'submitted'; CaldwellJob.client_* is PII-fenced to the
// clients(full_name) embed.

import type {
  CaldwellBudgetLine,
  CaldwellChangeOrder,
  CaldwellCostCode,
  CaldwellDraw,
  CaldwellInvoice,
  CaldwellJob,
} from "@/app/design-system/_fixtures/drummond/types";

type Row = Record<string, unknown>;

const KNOWN_DRAW_STATUSES: ReadonlyArray<CaldwellDraw["status"]> = [
  "draft",
  "pm_review",
  "approved",
  "submitted",
  "paid",
  "void",
];

export function mapJob(row: Row, clientFullName: string | null): CaldwellJob {
  const rawStatus = (row.status as string | null) ?? "active";
  return {
    id: row.id as string,
    name: (row.name as string | null) ?? "",
    address: (row.address as string | null) ?? "",
    client_name: clientFullName ?? "—",
    client_email: "",
    client_phone: "",
    contract_type: row.contract_type === "fixed" ? "fixed" : "cost_plus",
    original_contract_amount: Number(row.original_contract_amount ?? 0),
    current_contract_amount: Number(row.current_contract_amount ?? 0),
    pm_id: (row.pm_id as string | null) ?? "",
    status: (["active", "complete", "warranty", "cancelled"] as const).includes(
      rawStatus as CaldwellJob["status"]
    )
      ? (rawStatus as CaldwellJob["status"])
      : "active",
    deposit_percentage: Number(row.deposit_percentage ?? 0.1),
    gc_fee_percentage: Number(row.gc_fee_percentage ?? 0.2),
  };
}

export function mapBudgetLine(row: Row): CaldwellBudgetLine {
  return {
    id: row.id as string,
    job_id: row.job_id as string,
    cost_code_id: row.cost_code_id as string,
    original_estimate: Number(row.original_estimate ?? 0),
    revised_estimate: Number(row.revised_estimate ?? 0),
  };
}

export function mapCostCode(row: Row): CaldwellCostCode {
  return {
    id: row.id as string,
    code: (row.code as string | null) ?? "",
    description: (row.description as string | null) ?? "",
    category: (row.category as string | null) ?? "",
    sort_order: Number(row.sort_order ?? 0),
  };
}

export function mapInvoice(row: Row): CaldwellInvoice {
  return {
    id: row.id as string,
    vendor_id: (row.vendor_id as string | null) ?? "",
    job_id: (row.job_id as string | null) ?? "",
    cost_code_id: (row.cost_code_id as string | null) ?? null,
    po_id: (row.po_id as string | null) ?? null,
    co_id: (row.co_id as string | null) ?? null,
    invoice_number: (row.invoice_number as string | null) ?? null,
    invoice_date: (row.invoice_date as string | null) ?? null,
    description: (row.description as string | null) ?? "",
    invoice_type:
      (row.invoice_type as CaldwellInvoice["invoice_type"]) ?? "progress",
    total_amount: Number(row.total_amount ?? 0),
    confidence_score: Number(row.confidence_score ?? 0),
    confidence_details: (row.confidence_details as CaldwellInvoice["confidence_details"]) ?? {
      vendor_name: 0,
      invoice_number: 0,
      total_amount: 0,
      job_reference: 0,
      cost_code_suggestion: 0,
    },
    status: row.status as CaldwellInvoice["status"],
    received_date: (row.received_date as string | null) ?? "",
    payment_date: (row.payment_date as string | null) ?? null,
    draw_id: (row.draw_id as string | null) ?? null,
    line_items: Array.isArray(row.line_items)
      ? (row.line_items as CaldwellInvoice["line_items"])
      : [],
    flags: [],
    original_file_url: (row.original_file_url as string | null) ?? null,
  };
}

/** Stored-column draw map. `applicationNumber` display offset is the
 *  CALLER's concern (pass `displayNumber` when the job carries
 *  starting_application_number). */
export function mapDraw(row: Row, displayNumber?: number): CaldwellDraw {
  const raw = row.status as string;
  return {
    id: row.id as string,
    job_id: row.job_id as string,
    draw_number: displayNumber ?? Number(row.draw_number ?? 0),
    application_date:
      (row.application_date as string | null) ??
      (row.period_end as string | null) ??
      "",
    period_start: (row.period_start as string | null) ?? "",
    period_end: (row.period_end as string | null) ?? "",
    status: (KNOWN_DRAW_STATUSES as readonly string[]).includes(raw)
      ? (raw as CaldwellDraw["status"])
      : "submitted",
    revision_number: Number(row.revision_number ?? 0),
    original_contract_sum: Number(row.original_contract_sum ?? 0),
    net_change_orders: Number(row.net_change_orders ?? 0),
    contract_sum_to_date: Number(row.contract_sum_to_date ?? 0),
    total_completed_to_date: Number(row.total_completed_to_date ?? 0),
    less_previous_payments: Number(row.less_previous_payments ?? 0),
    current_payment_due: Number(row.current_payment_due ?? 0),
    balance_to_finish: Number(row.balance_to_finish ?? 0),
    deposit_amount: Number(row.deposit_amount ?? 0),
    submitted_at: (row.submitted_at as string | null) ?? null,
    paid_at: (row.paid_at as string | null) ?? null,
  };
}

/** Zero-valued draw shim for jobs with no draws yet — BudgetView requires
 *  a currentDraw; an all-zero draft is the honest empty representation. */
export function emptyDrawShim(jobId: string): CaldwellDraw {
  return {
    id: "",
    job_id: jobId,
    draw_number: 0,
    application_date: "",
    period_start: "",
    period_end: "",
    status: "draft",
    revision_number: 0,
    original_contract_sum: 0,
    net_change_orders: 0,
    contract_sum_to_date: 0,
    total_completed_to_date: 0,
    less_previous_payments: 0,
    current_payment_due: 0,
    balance_to_finish: 0,
    deposit_amount: 0,
    submitted_at: null,
    paid_at: null,
  };
}

export function mapChangeOrder(row: Row): CaldwellChangeOrder {
  return {
    id: row.id as string,
    job_id: row.job_id as string,
    pcco_number: Number(row.pcco_number ?? 0),
    description:
      (row.title as string | null) ?? (row.description as string | null) ?? "",
    amount: Number(row.amount ?? 0),
    gc_fee_amount: Number(row.gc_fee_amount ?? 0),
    gc_fee_rate: Number(row.gc_fee_rate ?? 0),
    total_with_fee: Number(row.total_with_fee ?? row.amount ?? 0),
    estimated_days_added: Number(row.estimated_days_added ?? 0),
    status: row.status === "executed" ? "executed" : "approved",
    approved_date: (row.approved_date as string | null) ?? null,
    draw_number: (row.draw_number as number | null) ?? null,
  };
}
