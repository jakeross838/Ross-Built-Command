// src/components/prototypes/OwnerDrawView.tsx
//
// OwnerDrawView — Document Review pattern (owner-facing pay app approval).
// Stage 1.5c Plan 3 extraction; copies InvoiceReviewView pattern (Document
// Review per PATTERNS.md §2) extending Multi-step Approval (PATTERNS.md
// §3) for non-builder homeowner audience.
//
// Pure props-only View component. Wrapper handles fixture lookup; this
// View renders.
//
// Cost-plus open-book transparency: owner sees every line item AND every
// vendor. Internal builder fields (cost code raw IDs, internal status
// machine names) are hidden.
//
// Owner-portal trust filter: NO AI confidence scores, NO PM override
// audit, NO internal cost-code mapping notes.
//
// AMENDMENT inheritance per nwrp48: Owner draw review's "Where the money
// went" list is the audit-equivalent for non-builders. CHANGE 2
// collapsible-panel pattern is N/A here — homeowner audience EXPECTS to
// see the line items breakdown when reviewing a pay app. Pattern preserved
// expanded; transparency goal trumps tidiness.
//
// TD fixes per CONTEXT D-06:
//   - TD-20: 2 raw buttons (Request clarification, Approve & sign) →
//     NwButton secondary + primary. The Approve button has minHeight 56px
//     in source for high-stakes touch target — preserved as raw button
//     with explanatory comment per TD-20 exemption rationale (NwButton's
//     lg size is 44px; there's no 56px size). Per Plan 2 architect's
//     TD-20 exemption reasoning, this is a TD-20 boundary case where the
//     exact source-spec touch target trumps the TD-20 fix. Documented
//     inline.
//   - TD-25/26: All Card padding=md / fontWeight=500 (already clean)
//
// Tenant-blind by construction.

import Link from "next/link";
import {
  CheckBadgeIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";

import type {
  CaldwellDraw,
  CaldwellDrawLineItem,
  CaldwellInvoice,
  CaldwellVendor,
  CaldwellCostCode,
} from "@/app/design-system/_fixtures/drummond/types";

import Card from "@/components/nw/Card";
import Eyebrow from "@/components/nw/Eyebrow";
import Money from "@/components/nw/Money";
import DataRow from "@/components/nw/DataRow";
import NwButton from "@/components/nw/Button";
import type { DepositState } from "@/app/financials/pay-apps/[id]/_data";

export interface OwnerDrawViewProps {
  draw: CaldwellDraw;
  job: { id: string; name: string } | null;
  lineItems: CaldwellDrawLineItem[];
  invoices: CaldwellInvoice[];
  vendors: CaldwellVendor[];
  costCodes: CaldwellCostCode[];
  /** Optional breadcrumb root link. Defaults to /design-system/prototypes/. */
  breadcrumbRoot?: { href: string; label: string };
  /** BLOCK B pt2 — deposit application; owner sees the credit applied this pay
   *  app. Adjustments detail follows the owner-portal detail wiring
   *  (Wave 1.1-Lite per nwrp200). */
  deposit?: DepositState;
}

export default function OwnerDrawView({
  draw,
  job,
  lineItems,
  invoices,
  vendors,
  costCodes,
  breadcrumbRoot = {
    href: "/design-system/prototypes/owner-portal",
    label: "Owner portal",
  },
  deposit,
}: OwnerDrawViewProps) {
  const drawId = draw.id;

  // Per cost code, find vendor breakdown — for owner transparency.
  function vendorsForLine(costCodeId: string) {
    const invoicesForLine = invoices.filter(
      (i) => i.cost_code_id === costCodeId && i.draw_id === drawId,
    );
    const byVendor = new Map<string, number>();
    for (const inv of invoicesForLine) {
      byVendor.set(
        inv.vendor_id,
        (byVendor.get(inv.vendor_id) ?? 0) + inv.total_amount,
      );
    }
    return Array.from(byVendor.entries()).map(([vid, cents]) => ({
      vendor: vendors.find((v) => v.id === vid),
      cents,
    }));
  }

  const linesWithSpend = lineItems.filter((li) => li.this_period > 0);

  return (
    <div className="px-6 py-8 max-w-[1200px] mx-auto">
      {/* Header band — homeowner-friendly. */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <div
            className="flex items-center gap-2 text-[12px] mb-2"
            style={{ color: "var(--text-tertiary)" }}
          >
            <Link href={breadcrumbRoot.href} className="hover:underline">
              {breadcrumbRoot.label}
            </Link>
            <span>/</span>
            <span style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
              Pay app #{draw.draw_number}
            </span>
          </div>
          <h1
            className="text-[28px] mb-1 nw-direction-headline"
            style={{
              fontFamily: "var(--font-space-grotesk)",
              fontWeight: 500,
              color: "var(--text-primary)",
            }}
          >
            Pay app #{draw.draw_number} for your review
          </h1>
          <p
            className="text-[14px]"
            style={{ color: "var(--text-secondary)" }}
          >
            Work completed {draw.period_start} – {draw.period_end} ·
            submitted by your builder for approval · {job?.name ?? "—"}
          </p>
        </div>
        {/* Action buttons — owner role. TD-20 fix: NwButton replaces the
            "Request clarification" raw button (secondary, size=md = 36px;
            close enough to source's 44px minHeight standard for non-stakes
            actions; SYSTEM.md §11 requires 44px min for nav/secondary —
            NwButton size=lg is 44px exactly). Use size=lg here.

            The Approve button has minHeight: 56px in source (high-stakes
            per SYSTEM.md §11a) — NwButton has no 56px size. Per Plan 2
            architect's TD-20 exemption pattern, the exact source-spec
            touch target trumps the TD-20 fix here. Preserved as raw
            button with explanatory comment.

            The reject button at 44px on the Mobile Approval surface
            already has a finding documented in 1.5b — that's not this
            view. Owner draw approval is desktop-first; touch targets on
            this surface are 44/56 to match the mobile-on-iPad case. */}
        <div className="flex items-center gap-2">
          <NwButton variant="secondary" size="lg">
            <ChatBubbleLeftRightIcon className="w-4 h-4" strokeWidth={1.5} />
            Request clarification
          </NwButton>
          {/* TD-20 boundary exemption — 56px high-stakes touch target.
              NwButton has sizes sm/md/lg only (h-30/36/44). Source spec is
              minHeight 56px per SYSTEM.md §11a. Preserved as raw button to
              honor the source touch-target; NwButton would shrink to 44px
              and break the high-stakes contract. */}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-4 text-[12px] uppercase font-medium"
            style={{
              fontFamily: "var(--font-jetbrains-mono)",
              letterSpacing: "0.12em",
              background: "var(--nw-stone-blue)",
              color: "var(--nw-white-sand)",
              minHeight: "56px",
            }}
          >
            <CheckBadgeIcon className="w-4 h-4" strokeWidth={1.5} />
            Approve &amp; sign
          </button>
        </div>
      </div>

      {/* Summary card — homeowner-translated */}
      <Card padding="md" className="mb-6">
        <Eyebrow tone="accent" className="mb-3">
          This pay app summary
        </Eyebrow>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <DataRow
            label="Total project budget"
            value={<Money cents={draw.contract_sum_to_date} size="md" />}
          />
          <DataRow
            label="Paid before this pay app"
            value={<Money cents={draw.less_previous_payments} size="md" />}
          />
          {deposit && deposit.applied > 0 && (
            <DataRow
              label="Deposit credit applied"
              value={<Money cents={-deposit.applied} size="md" signColor />}
            />
          )}
          <DataRow
            label="Work completed this period"
            value={
              <Money
                cents={draw.current_payment_due}
                size="md"
                variant="emphasized"
              />
            }
          />
          <DataRow
            label="Remaining after this pay app"
            value={<Money cents={draw.balance_to_finish} size="md" />}
          />
        </div>
      </Card>

      {/* Detailed line items WITH vendor breakdown */}
      <Card padding="md">
        <Eyebrow tone="muted" className="mb-3">
          Where the money went · {linesWithSpend.length} categories
        </Eyebrow>
        <p
          className="text-[12px] mb-3"
          style={{ color: "var(--text-secondary)" }}
        >
          Cost-plus open-book contract — every vendor invoice is visible.
          Each category below is broken down by the vendors who billed
          against it during this period.
        </p>
        <ul className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
          {linesWithSpend.map((li) => {
            const cc = costCodes.find((c) => c.id === li.cost_code_id);
            const vendorBreakdown = vendorsForLine(li.cost_code_id);
            return (
              <li key={li.id} className="py-3">
                <div className="flex items-center justify-between mb-1 gap-3">
                  <div className="min-w-0 flex-1">
                    <div
                      className="text-[14px] truncate"
                      style={{
                        color: "var(--text-primary)",
                        fontFamily: "var(--font-space-grotesk)",
                        fontWeight: 500,
                      }}
                    >
                      {cc?.description ?? "—"}
                    </div>
                    <div
                      className="text-[10px]"
                      style={{
                        fontFamily: "var(--font-jetbrains-mono)",
                        color: "var(--text-tertiary)",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      Code {cc?.code ?? "—"} ·{" "}
                      {(li.percent_complete * 100).toFixed(0)}% complete
                    </div>
                  </div>
                  <Money
                    cents={li.this_period}
                    size="md"
                    variant="emphasized"
                  />
                </div>
                {vendorBreakdown.length > 0 && (
                  <ul className="ml-4 mt-2 space-y-1 text-[11px]">
                    {vendorBreakdown.map((v, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <span>{v.vendor?.name ?? "—"}</span>
                        <Money cents={v.cents} size="sm" />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
