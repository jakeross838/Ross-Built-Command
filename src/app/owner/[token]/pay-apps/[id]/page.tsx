// src/app/owner/[token]/pay-apps/[id]/page.tsx
//
// F1-Wave-B Slice-2 B-2b — owner-portal pay-app drilldown route.
// Per CONTEXT D-02 + D-07 + D-17 + D-22 + D-26 + D-27 + BLK-3 wrapper fix:
//   - Token resolution via B-2a's `resolveOwnerToken` (timing-uniform null).
//   - Cross-validate draw belongs to token's (org_id, client_id, job_id) via
//     B-2a's `assertDrawBelongsToToken` (PostgREST jobs!inner embed; closes
//     B-3 intra-org cross-client probe per B-2a §6.e pinned SQL).
//   - Per-token rate-limit via `recordOwnerPortalRequest('token', ...)`.
//   - Scoped data fetch via `getScopedOwnerPortalClient`; tenant + client +
//     job isolation BY CONSTRUCTION.
//   - Soft-delete + status filters per D-22: draws.status IN
//     ('submitted','approved','paid','void') + .is('deleted_at', null).
//   - BLK-3 fix: <main data-prototype="owner-draw"> wraps the tenant-blind
//     OwnerDrawView primitive at this page.tsx layer; primitive at
//     src/components/prototypes/OwnerDrawView.tsx UNTOUCHED per Latitude #1 (a).
//   - Acknowledge CTA per D-26 + D-27 + Latitude #4 (a):
//       Raw <button> with TD-20 exemption comment mirroring OwnerDrawView.tsx
//       :158-162 precedent. NwButton has no 56px size; high-stakes touch
//       target per SYSTEM.md §11 = 56px. data-testid for smoke-harness probe.
//   - Cost-plus open-book detail (line_items, invoices, vendors, cost_codes)
//     passed as empty arrays for B-2b minimum-viable read-only surface; full
//     wiring deferred to Wave 1.1-Lite per nwrp200 (`OwnerPortalScopableTable`
//     union covers jobs/draws/change_orders/lien_releases by design).
//
// Pattern citations:
//   - PATTERNS.md §2h.3 (Owner Draw Review = Document Review extension)

import { notFound } from "next/navigation";
import {
  resolveOwnerToken,
  getScopedOwnerPortalClient,
  assertDrawBelongsToToken,
} from "@/lib/owner-portal/token";
import { recordOwnerPortalRequest } from "@/lib/owner-portal/rate-limit";
import OwnerDrawView from "@/components/prototypes/OwnerDrawView";
import type { CaldwellDraw } from "@/app/design-system/_fixtures/drummond/types";
import AcknowledgePayAppButton from "./AcknowledgePayAppButton";

export const dynamic = "force-dynamic";

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

// NOTE-2 fix: explicit field-by-field map (no `as CaldwellDraw` cast) per
// mapDbJobToCaldwell precedent. Catches shape drift at compile time.
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

export default async function OwnerPayAppPage({
  params,
}: {
  params: { token: string; id: string };
}) {
  // Step 1: token resolution
  const resolved = await resolveOwnerToken(params.token);
  if (!resolved) notFound();

  // Step 2: rate-limit per-token (defense-in-depth on read path)
  const rl = await recordOwnerPortalRequest(
    "token",
    resolved.portal_access_id,
  );
  if (!rl.allowed) throw new Error("rate-limit");

  // Step 3: cross-validate draw belongs to token's client+org scope via
  // assertDrawBelongsToToken (closes B-3 intra-org cross-client probe per
  // B-2a §6.e pinned SQL; PostgREST jobs!inner embed cites FK constraint
  // draws_job_id_fkey per CLAUDE.md Workflow Rule 2).
  const drawBelongs = await assertDrawBelongsToToken(params.id, resolved);
  if (!drawBelongs) notFound();

  // Step 4: scoped queries with soft-delete + status filters (D-22).
  const scope = getScopedOwnerPortalClient(resolved);

  const { data: drawRow, error: drawErr } = await scope
    .scopedFrom("draws", "*")
    .eq("id", params.id)
    .is("deleted_at", null)
    .in("status", ["submitted", "approved", "paid", "void"])
    .maybeSingle();
  if (drawErr || !drawRow) notFound();

  const { data: jobRow } = await scope
    .scopedFrom("jobs", "id, name")
    .is("deleted_at", null)
    .maybeSingle();

  const draw = mapDbDrawToCaldwell(drawRow as unknown as DbDrawRow);
  const jobMeta = (jobRow as unknown as { id: string; name: string } | null) ?? null;

  const isAcknowledgedStatusTerminal =
    draw.status === "paid" || draw.status === "void";

  // BLK-3 fix (plan-checker iter-1): wrap tenant-blind primitive in
  // <main data-prototype="owner-draw"> so smoke-harness selector resolves
  // WITHOUT modifying OwnerDrawView (preserves Latitude #1 (a) contract).
  return (
    <main
      data-prototype="owner-draw"
      className="px-[var(--space-4)] py-[var(--space-4)] pb-[env(safe-area-inset-bottom)]"
    >
      <OwnerDrawView
        draw={draw}
        job={jobMeta}
        // Cost-plus open-book detail (line_items, invoices, vendors,
        // cost_codes) passed as empty arrays for B-2b minimum-viable
        // read-only surface. `OwnerPortalScopableTable` union covers
        // jobs/draws/change_orders/lien_releases BY DESIGN per B-2a; full
        // detail wiring (extend scope union or use a separate read-only
        // service-role path with token-bound .eq filters) deferred to
        // Wave 1.1-Lite per nwrp200 minimum-viable contract.
        lineItems={[]}
        invoices={[]}
        vendors={[]}
        costCodes={[]}
        breadcrumbRoot={{
          href: `/owner/${params.token}`,
          label: "Project",
        }}
      />

      {/* Acknowledge CTA — B-2b's only owner-initiated action. */}
      {/* TD-20 boundary exemption per OwnerDrawView.tsx:158-162 precedent
          (Latitude #4 (a) per CONTEXT D-26 + D-27): NwButton lg=44px;
          acknowledge is a high-stakes action (homeowner irreversible
          attestation of pay-app); SYSTEM.md §11 mandates 56px touch target
          for high-stakes per WCAG 2.2 AA + Nightwork's stricter posture.
          Raw <button> required because NwButton has no 56px variant. */}
      <div className="mt-[var(--space-6)] flex justify-center">
        <AcknowledgePayAppButton
          token={params.token}
          drawId={draw.id}
          alreadyAcknowledged={isAcknowledgedStatusTerminal}
        />
      </div>
    </main>
  );
}
