// src/components/prototypes/VendorListView.tsx
//
// VendorListView — Multi-fixture aggregation pattern (vendor List+Detail).
// Stage 1.5c Plan 3 extraction; copies BudgetView pattern (multi-fixture
// aggregation + R.2 recalculate-don't-increment) per iter-2 W-2.
//
// Pure props-only View component. Wrapper handles fixture lookup + path
// resolution; this View renders.
//
// Pattern: List+Detail (PATTERNS.md §7) with right-rail vendor detail
// rendered against the selected vendor. 17 vendors stress-test the layout
// at long names like "Bay Region Carpentry Inc" / "Coastal Smart Systems
// LLC".
//
// AMENDMENT inheritance per nwrp48: VendorList consumers may add
// "committed" concept where meaningful — for vendors, committed = open POs
// + approved-unbilled COs against this vendor. Caldwell fixtures don't
// include POs (no CaldwellPurchaseOrder type), so committed is omitted in
// 1.5c per the same Path 1 fixture-gap interpretation BudgetView used. F1
// will surface committed alongside total invoiced when PO fixtures land.
//
// TD-20 fix: VendorList has 1 raw button (the list rail row select). Per
// Plan 2 architect's TD-20 exemption rationale, this is NOT a CTA action
// button — it's a list-cell selection control with different ergonomics
// (full-width, multi-line content, focus-ring). NwButton would break the
// visual contract. Source preserved verbatim with explanatory comment.
//
// TD-25/26: All Card padding=md / fontWeight=500 (already clean in source).
//
// Tenant-blind by construction.

"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";

import type {
  CaldwellVendor,
  CaldwellInvoice,
  CaldwellCostCode,
} from "@/app/design-system/_fixtures/drummond/types";

import Card from "@/components/nw/Card";
import Eyebrow from "@/components/nw/Eyebrow";
import Money from "@/components/nw/Money";
import DataRow from "@/components/nw/DataRow";
import Badge from "@/components/nw/Badge";

export interface VendorListViewProps {
  vendors: CaldwellVendor[];
  invoices: CaldwellInvoice[];
  costCodes: CaldwellCostCode[];
  /** Optional breadcrumb root link. Defaults to /design-system/prototypes/. */
  breadcrumbRoot?: { href: string; label: string };
  /** Optional href builder for "Open detail" link. Receives vendor id, returns href. */
  detailHref?: (vendorId: string) => string;
}

// Map invoice status -> Badge variant for the vendor activity panel.
function activityBadgeVariant(
  status: string,
): "neutral" | "success" | "warning" | "info" {
  if (status === "paid" || status === "qa_approved" || status === "pm_approved")
    return "success";
  if (status === "qa_review" || status === "in_draw" || status === "pushed_to_qb")
    return "info";
  if (status.includes("review") || status === "ai_processed") return "warning";
  return "neutral";
}

export default function VendorListView({
  vendors,
  invoices,
  costCodes,
  breadcrumbRoot = { href: "/design-system/prototypes/", label: "Prototypes" },
  detailHref,
}: VendorListViewProps) {
  const [selectedId, setSelectedId] = useState<string>(vendors[0]?.id ?? "");
  const selected = vendors.find((v) => v.id === selectedId) ?? vendors[0];

  const recentInvoices = invoices
    .filter((i) => i.vendor_id === selected?.id)
    .sort((a, b) =>
      (b.received_date ?? "").localeCompare(a.received_date ?? ""),
    )
    .slice(0, 5);
  const totalInvoiced = invoices
    .filter((i) => i.vendor_id === selected?.id)
    .reduce((sum, i) => sum + i.total_amount, 0);
  const allInvoiceCount = invoices.filter(
    (i) => i.vendor_id === selected?.id,
  ).length;
  const defaultCC = selected?.default_cost_code_id
    ? costCodes.find((c) => c.id === selected.default_cost_code_id)
    : null;

  const resolvedDetailHref =
    detailHref ??
    ((vendorId: string) =>
      `${breadcrumbRoot.href}vendors/${vendorId}`);

  return (
    <div className="px-6 py-8 max-w-[1600px] mx-auto">
      {/* Header band */}
      <div className="mb-6">
        <div
          className="flex items-center gap-2 text-[12px] mb-2"
          style={{ color: "var(--text-tertiary)" }}
        >
          <Link href={breadcrumbRoot.href} className="hover:underline">
            {breadcrumbRoot.label}
          </Link>
          <span>/</span>
          <span style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
            Vendors
          </span>
        </div>
        <h1
          className="text-[24px] mb-2 nw-direction-headline"
          style={{
            fontFamily: "var(--font-space-grotesk)",
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
          }}
        >
          Vendors
        </h1>
        <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
          {vendors.length} active vendors on the Caldwell Residence project.
        </p>
      </div>

      {/* List + Detail */}
      <Card padding="none">
        <div
          className="grid grid-cols-1 md:grid-cols-[280px_1fr]"
          style={{ minHeight: "560px" }}
        >
          {/* LEFT — list rail */}
          <div
            className="border-r"
            style={{ borderColor: "var(--border-default)" }}
          >
            <div
              className="px-4 py-3 border-b"
              style={{ borderColor: "var(--border-default)" }}
            >
              <Eyebrow tone="muted">Vendors · {vendors.length}</Eyebrow>
            </div>
            <ul>
              {vendors.map((v) => {
                const isSelected = v.id === selected?.id;
                return (
                  <li key={v.id}>
                    {/* TD-20 exemption: list rail row select. NOT a CTA
                        action button — it's a list-cell selection control
                        with full-width + multi-line content + focus-ring.
                        Same exemption pattern as BudgetView's TanStack
                        sort-trigger (Plan 2 architect decision). NwButton
                        would break the visual contract. */}
                    <button
                      type="button"
                      onClick={() => setSelectedId(v.id)}
                      className="w-full text-left px-4 py-3 border-b cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-stone-blue/40"
                      style={{
                        borderColor: "var(--border-subtle)",
                        background: isSelected
                          ? "var(--bg-subtle)"
                          : "transparent",
                        borderLeft: isSelected
                          ? "2px solid var(--nw-stone-blue)"
                          : "2px solid transparent",
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                          className="text-[12px] font-medium truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {v.name}
                        </span>
                      </div>
                      <div
                        className="text-[10px] truncate"
                        style={{
                          fontFamily: "var(--font-jetbrains-mono)",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {v.email}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* RIGHT — detail pane */}
          <div className="p-5">
            {selected ? (
              <>
                <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                  <div className="min-w-0">
                    <Eyebrow tone="accent" className="mb-2">
                      Vendor profile
                    </Eyebrow>
                    <h2
                      className="text-[20px] mb-1 nw-direction-headline"
                      style={{
                        fontFamily: "var(--font-space-grotesk)",
                        fontWeight: 500,
                        letterSpacing: "-0.02em",
                        color: "var(--text-primary)",
                      }}
                    >
                      {selected.name}
                    </h2>
                  </div>
                  <Link
                    href={resolvedDetailHref(selected.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] border uppercase font-medium"
                    style={{
                      fontFamily: "var(--font-jetbrains-mono)",
                      letterSpacing: "0.12em",
                      borderColor: "var(--border-default)",
                      color: "var(--text-primary)",
                      background: "var(--bg-card)",
                    }}
                  >
                    Open detail
                    <ArrowTopRightOnSquareIcon
                      className="w-3 h-3"
                      strokeWidth={1.5}
                    />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card padding="md">
                    <Eyebrow tone="muted" className="mb-3">
                      Contact
                    </Eyebrow>
                    <div className="space-y-3">
                      <DataRow label="Address" value={selected.address} />
                      <DataRow label="Phone" value={selected.phone} />
                      <DataRow label="Email" value={selected.email} />
                      <DataRow
                        label="Default cost code"
                        value={
                          defaultCC
                            ? `${defaultCC.code} · ${defaultCC.description}`
                            : "—"
                        }
                      />
                    </div>
                  </Card>

                  <Card padding="md">
                    <Eyebrow tone="muted" className="mb-3">
                      Activity
                    </Eyebrow>
                    <div className="space-y-3">
                      <DataRow
                        label="Total invoiced"
                        value={
                          <Money
                            cents={totalInvoiced}
                            size="md"
                            variant="emphasized"
                          />
                        }
                      />
                      <DataRow
                        label="Recent invoices"
                        value={`${recentInvoices.length} of ${allInvoiceCount}`}
                      />
                    </div>
                  </Card>
                </div>

                {recentInvoices.length > 0 && (
                  <Card padding="md" className="mt-4">
                    <Eyebrow tone="muted" className="mb-3">
                      Recent invoices
                    </Eyebrow>
                    <ul
                      className="divide-y"
                      style={{ borderColor: "var(--border-subtle)" }}
                    >
                      {recentInvoices.map((inv) => (
                        <li
                          key={inv.id}
                          className="py-2 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div
                              className="text-[12px] truncate"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {inv.description}
                            </div>
                            <div
                              className="text-[10px] truncate"
                              style={{
                                fontFamily: "var(--font-jetbrains-mono)",
                                color: "var(--text-tertiary)",
                              }}
                            >
                              {inv.invoice_number ?? "—"} ·{" "}
                              {inv.received_date}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Money cents={inv.total_amount} size="sm" />
                            <Badge variant={activityBadgeVariant(inv.status)}>
                              {inv.status.replaceAll("_", " ")}
                            </Badge>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </>
            ) : (
              <Eyebrow tone="muted">No vendor selected</Eyebrow>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
