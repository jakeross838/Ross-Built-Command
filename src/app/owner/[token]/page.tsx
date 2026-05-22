// src/app/owner/[token]/page.tsx
//
// F1-Wave-B Slice-2 B-2b — owner-portal entry route (anon homeowner dashboard).
// Per CONTEXT D-01 + D-05 + D-06 + D-11 + D-22 + BLK-3 wrapper fix:
//   - Token resolution via B-2a's `resolveOwnerToken` (timing-uniform null).
//   - Scoped data fetch via B-2a's `getScopedOwnerPortalClient` (scope filters
//     injected at SupabaseQueryBuilder level — tenant + client + job isolation
//     BY CONSTRUCTION).
//   - Soft-delete + status filters per D-22 + iter-1 SYNTHESIS B-14:
//       .is('deleted_at', null) on draws + jobs queries
//       .in('status', ['submitted', 'approved', 'paid', 'void']) on draws
//       .in('status', ['approved', 'executed']) on change_orders
//   - Per-token rate-limit via B-2a's `recordOwnerPortalRequest('token', ...)`.
//   - DB rows mapped to Caldwell fixture-shape types via explicit field-by-field
//     functions per Latitude #1 recommendation (a) + NOTE-2 fix — tenant-blind
//     OwnerDashboardView contract preserved; primitive UNTOUCHED.
//   - BLK-3 fix: `<main data-prototype="owner-dashboard">` wraps the tenant-blind
//     primitive at this page layer; primitive at src/components/prototypes/
//     OwnerDashboardView.tsx remains UNTOUCHED per Latitude #1 (a).
//
// Pattern citations:
//   - PATTERNS.md §4h.3 (Owner Portal Dashboard, Dashboard pattern)
//
// References:
//   - B-2b-CONTEXT.md D-01..D-34
//   - B-2b-PLAN.md §6.a
//   - src/lib/owner-portal/token.ts (B-2a; resolveOwnerToken, getScopedOwnerPortalClient)
//   - src/lib/owner-portal/rate-limit.ts (B-2a; recordOwnerPortalRequest)
//   - src/components/prototypes/OwnerDashboardView.tsx (1.5c thin wrapper consumer)

import { notFound } from "next/navigation";
import {
  resolveOwnerToken,
  getScopedOwnerPortalClient,
} from "@/lib/owner-portal/token";
import { recordOwnerPortalRequest } from "@/lib/owner-portal/rate-limit";
import OwnerDashboardView from "@/components/prototypes/OwnerDashboardView";
import type {
  CaldwellJob,
  CaldwellDraw,
  CaldwellChangeOrder,
} from "@/app/design-system/_fixtures/drummond/types";

export const dynamic = "force-dynamic";

// DB-shape row types. Mirrors the migration 00101-dropped jobs.client_name/
// client_email/client_phone columns by sourcing those PII fields from the
// embedded clients row instead (PostgREST embed not used here — separate
// scope.scopedFrom('jobs') query already filters by client_id).
//
// Note: jobs table no longer carries client_name/email/phone (Q1 PII fence —
// nwrp153 + migration 00101). Per EXPANDED-SCOPE Q4 (Wave 1.1-Lite), homeowner
// dashboard does NOT show "Your PM is [name]" or similar PII; the contract
// fields below leave client_* empty strings since the homeowner already knows
// who they are. This is the read-only minimum-viable surface per nwrp200.

interface DbJobRow {
  id: string;
  name: string;
  address: string | null;
  contract_type: "cost_plus" | "fixed";
  original_contract_amount: number;
  current_contract_amount: number;
  pm_id: string | null;
  status: "active" | "complete" | "warranty" | "cancelled";
  deposit_percentage: number;
  gc_fee_percentage: number;
}

interface DbDrawRow {
  id: string;
  job_id: string;
  draw_number: number;
  application_date: string;
  period_start: string;
  period_end: string;
  status: "draft" | "pm_review" | "approved" | "submitted" | "paid" | "void";
  revision_number: number;
  original_contract_sum: number;
  net_change_orders: number;
  contract_sum_to_date: number;
  total_completed_to_date: number;
  less_previous_payments: number;
  current_payment_due: number;
  balance_to_finish: number;
  deposit_amount: number;
  submitted_at: string | null;
  paid_at: string | null;
}

interface DbChangeOrderRow {
  id: string;
  job_id: string;
  pcco_number: number;
  description: string;
  amount: number;
  gc_fee_amount: number;
  gc_fee_rate: number;
  total_with_fee: number;
  estimated_days_added: number;
  status: "draft" | "pending_approval" | "approved" | "executed" | "void";
  approved_date: string | null;
  draw_number: number | null;
}

// Map DB row shape → Caldwell fixture-shape (Latitude #1 (a) — preserves the
// tenant-blind OwnerDashboardView contract). NOTE-2 fix: explicit field-by-field
// map (not `as CaldwellJob` cast) — catches shape drift at compile time.
//
// PII fields (client_name/email/phone) sourced as empty strings because:
//   1. jobs table no longer carries them (migration 00101 — Q1 PII fence).
//   2. Homeowner dashboard does NOT render PII for the recipient themselves.
//   3. Per EXPANDED-SCOPE Q4, PII restoration for "Your PM is [name]" is
//      deferred to Wave 1.1-Lite; B-2b is minimum-viable read-only.
function mapDbJobToCaldwell(row: DbJobRow): CaldwellJob {
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? "",
    client_name: "",
    client_email: "",
    client_phone: "",
    contract_type: row.contract_type,
    original_contract_amount: row.original_contract_amount,
    current_contract_amount: row.current_contract_amount,
    pm_id: row.pm_id ?? "",
    status: row.status,
    deposit_percentage: row.deposit_percentage,
    gc_fee_percentage: row.gc_fee_percentage,
  };
}

// NOTE-2 fix: explicit field-by-field map (NOT `as CaldwellDraw` cast) to catch
// shape drift at compile time. Mirrors mapDbJobToCaldwell precedent.
function mapDbDrawToCaldwell(row: DbDrawRow): CaldwellDraw {
  return {
    id: row.id,
    job_id: row.job_id,
    draw_number: row.draw_number,
    application_date: row.application_date,
    period_start: row.period_start,
    period_end: row.period_end,
    status: row.status,
    revision_number: row.revision_number,
    original_contract_sum: row.original_contract_sum,
    net_change_orders: row.net_change_orders,
    contract_sum_to_date: row.contract_sum_to_date,
    total_completed_to_date: row.total_completed_to_date,
    less_previous_payments: row.less_previous_payments,
    current_payment_due: row.current_payment_due,
    balance_to_finish: row.balance_to_finish,
    deposit_amount: row.deposit_amount,
    submitted_at: row.submitted_at,
    paid_at: row.paid_at,
  };
}

// Map DB change_order row → Caldwell fixture-shape. NOTE-2: explicit map.
function mapDbChangeOrderToCaldwell(row: DbChangeOrderRow): CaldwellChangeOrder {
  return {
    id: row.id,
    job_id: row.job_id,
    pcco_number: row.pcco_number,
    description: row.description,
    amount: row.amount,
    gc_fee_amount: row.gc_fee_amount,
    gc_fee_rate: row.gc_fee_rate,
    total_with_fee: row.total_with_fee,
    estimated_days_added: row.estimated_days_added,
    status: row.status,
    approved_date: row.approved_date,
    draw_number: row.draw_number,
  };
}

export default async function OwnerDashboardPage({
  params,
}: {
  params: { token: string };
}) {
  // Step 1: resolve token (timing-uniform null per B-2a).
  const resolved = await resolveOwnerToken(params.token);
  if (!resolved) {
    notFound();
  }

  // Step 2: rate-limit per-token (defense-in-depth on read path).
  const tokenRl = await recordOwnerPortalRequest(
    "token",
    resolved.portal_access_id,
  );
  if (!tokenRl.allowed) {
    // Falls through to error boundary at src/app/owner/error.tsx.
    throw new Error("rate-limit");
  }

  // Step 3: scoped queries via B-2a helper. Scope filters injected
  // automatically; tenant + client + job isolation BY CONSTRUCTION.
  // Soft-delete + status filters per D-22 + iter-1 SYNTHESIS B-14.
  const scope = getScopedOwnerPortalClient(resolved);

  const { data: jobRow, error: jobErr } = await scope
    .scopedFrom("jobs", "*")
    .is("deleted_at", null)
    .maybeSingle();
  if (jobErr || !jobRow) notFound();

  const { data: drawsRows, error: drawsErr } = await scope
    .scopedFrom("draws", "*")
    .is("deleted_at", null)
    .in("status", ["submitted", "approved", "paid", "void"]);
  if (drawsErr) notFound();

  const { data: cosRows, error: cosErr } = await scope
    .scopedFrom("change_orders", "*")
    .is("deleted_at", null)
    .in("status", ["approved", "executed"]);
  if (cosErr) notFound();

  // Step 4: map to Caldwell shape + render.
  // BLK-3 fix (plan-checker iter-1): wrap tenant-blind primitive in
  // <main data-prototype="owner-dashboard"> so smoke-harness selector
  // resolves WITHOUT modifying the tenant-blind OwnerDashboardView
  // (preserves Latitude #1 (a) contract).
  // `as unknown as <Db...>` chain required because PostgREST select('*')
  // returns a union including `GenericStringError`. The runtime path here
  // is guarded by `error || !data` checks above; the cast is safe.
  return (
    <main
      data-prototype="owner-dashboard"
      className="px-[var(--space-4)] py-[var(--space-4)] pb-[env(safe-area-inset-bottom)]"
    >
      <OwnerDashboardView
        job={mapDbJobToCaldwell(jobRow as unknown as DbJobRow)}
        draws={((drawsRows ?? []) as unknown[]).map((d) =>
          mapDbDrawToCaldwell(d as DbDrawRow),
        )}
        changeOrders={((cosRows ?? []) as unknown[]).map((co) =>
          mapDbChangeOrderToCaldwell(co as DbChangeOrderRow),
        )}
        drawReviewHref={(drawId) =>
          `/owner/${params.token}/pay-apps/${drawId}`
        }
      />
    </main>
  );
}
