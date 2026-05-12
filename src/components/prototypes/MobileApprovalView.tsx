// src/components/prototypes/MobileApprovalView.tsx
//
// MobileApprovalView — Document Review pattern (mobile bill approval).
// Stage 1.5c Plan 3 extraction; copies InvoiceReviewView pattern (Document
// Review per PATTERNS.md §2) for mobile-first PM-in-field flow.
//
// Pure props-only View component. Wrapper handles fixture lookup; this
// View renders. FULL-SCREEN page (NOT scaled-down container).
//
// Touch target spec per SYSTEM.md §11 + Q10=A:
//   - Standard tap (Hold): 44px minimum
//   - High-stakes (Approve): 56px per SYSTEM.md §11a
//   - Reject deliberately at 44px to TEST the touch-target hierarchy
//     claim under glove-on operation (per the "glove-on test" from
//     1.5b plan; finding logged in 1.5b SUMMARY).
//
// Per CONTEXT D-06 + 1.5b TD-21: Reject button currently uses rgba inline
// per source — DEFERRED. Plan 3 does NOT fix TD-21 (cosmetic; CONTEXT D-06
// scope is structural-only).
//
// AMENDMENT inheritance per nwrp48: Mobile-Approval has Line items
// collapsible already (native useState toggle). Plan 2's CHANGE 2 pattern
// uses native <details>/<summary> — but the existing useState approach is
// idiomatic React + matches mobile UX expectations (full state preserved
// during scroll). Pattern preserved as-is per CONTEXT D-06 "structural
// fixes only" scope; AMENDMENT pattern is a REFERENCE template, not a
// blanket replacement when an existing collapsible already works.
//
// TD fixes per CONTEXT D-06:
//   - TD-20: 4 raw buttons total. Per Plan 2 architect TD-20 boundary
//     reasoning + CONTEXT D-06 explicit naming of mobile-approval as
//     TD-20 target:
//       * The 3 sticky-bottom CTAs (Reject 44px / Hold 44px / Approve 56px)
//         have explicit minHeight specs that NwButton (sm/md/lg = 30/36/44)
//         can't meet exactly. Source uses raw buttons for touch-target
//         conformance — this is the SAME boundary case as OwnerDrawView's
//         56px Approve. Preserved as raw buttons with explanatory comment.
//       * The "Line items toggle" button is a UI control, not a CTA action.
//         44px minHeight + chevron icon + Eyebrow inside. NwButton would
//         break the visual contract (NwButton is opaque-fill default; this
//         needs transparent border + Eyebrow inside). Source preserved.
//   - TD-25/26: All Card padding=md / fontWeight=500 (already clean)
//
// Tenant-blind by construction.

"use client";

import { useState } from "react";
import {
  CheckBadgeIcon,
  XMarkIcon,
  PauseIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PaperClipIcon,
} from "@heroicons/react/24/outline";

import type {
  CaldwellInvoice,
  CaldwellVendor,
  CaldwellCostCode,
} from "@/app/design-system/_fixtures/drummond/types";

import Card from "@/components/nw/Card";
import Eyebrow from "@/components/nw/Eyebrow";
import Money from "@/components/nw/Money";
import DataRow from "@/components/nw/DataRow";
import Badge from "@/components/nw/Badge";

export interface MobileApprovalViewProps {
  invoice: CaldwellInvoice;
  vendor: CaldwellVendor | null;
  costCode: CaldwellCostCode | null;
}

export default function MobileApprovalView({
  invoice,
  vendor,
  costCode,
}: MobileApprovalViewProps) {
  const inv = invoice;
  const [showLineItems, setShowLineItems] = useState(false);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg-page)" }}
    >
      {/* Sticky top app bar — 56px tall, slate-deeper background */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4 border-b"
        style={{
          height: "56px",
          background: "var(--nw-slate-deeper)",
          borderColor: "var(--border-default)",
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2"
            style={{
              borderRadius: "var(--radius-dot)",
              background: "var(--nw-stone-blue)",
            }}
          />
          <span
            className="text-[12px] font-medium"
            style={{
              fontFamily: "var(--font-space-grotesk)",
              color: "var(--nw-white-sand)",
            }}
          >
            Nightwork
          </span>
        </div>
        <span
          className="text-[10px]"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            color: "rgba(247,245,236,0.7)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Approve bill
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-4 space-y-4">
        <Card padding="md">
          <Eyebrow tone="accent" className="mb-2">
            From
          </Eyebrow>
          <h1
            className="text-[18px] mb-2 break-words nw-direction-headline"
            style={{
              fontFamily: "var(--font-space-grotesk)",
              fontWeight: 500,
              color: "var(--text-primary)",
            }}
          >
            {vendor?.name ?? "Unknown vendor"}
          </h1>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Money
              cents={inv.total_amount}
              size="xl"
              variant="emphasized"
            />
            <Badge variant="warning">PM REVIEW</Badge>
          </div>
          <div className="space-y-2">
            <DataRow label="Invoice #" value={inv.invoice_number ?? "—"} />
            <DataRow label="Date" value={inv.invoice_date ?? "—"} />
            <DataRow
              label="Cost code"
              value={
                costCode ? `${costCode.code} · ${costCode.description}` : "—"
              }
            />
            <DataRow
              label="Type"
              value={inv.invoice_type.replaceAll("_", " ").toUpperCase()}
            />
            <DataRow
              label="Confidence"
              value={
                <Badge
                  variant={
                    inv.confidence_score >= 0.85 ? "success" : "warning"
                  }
                >
                  {(inv.confidence_score * 100).toFixed(0)}%
                </Badge>
              }
            />
          </div>
        </Card>

        {/* File preview placeholder */}
        <Card padding="md">
          <Eyebrow tone="muted" className="mb-3">
            Source document
          </Eyebrow>
          <div
            className="aspect-[3/4] border flex flex-col items-center justify-center"
            style={{
              background: "var(--bg-subtle)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <PaperClipIcon
              className="w-8 h-8 mb-3"
              strokeWidth={1.25}
              style={{ color: "var(--text-tertiary)" }}
            />
            <span
              className="text-[10px] uppercase"
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                letterSpacing: "0.18em",
                color: "var(--text-tertiary)",
              }}
            >
              Bill PDF preview
            </span>
            <span
              className="text-[10px] mt-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              pinch to zoom on mobile
            </span>
          </div>
        </Card>

        {/* Line items — collapsible to save screen space */}
        {inv.line_items.length > 0 && (
          <Card padding="md">
            {/* TD-20 exemption: this is a UI toggle control (collapse/
                expand affordance with chevron icon + Eyebrow inside),
                NOT a CTA action button. NwButton would break visual
                contract (NwButton has opaque-fill default; this needs
                transparent border + Eyebrow inside). Preserved as raw
                button with 44px minHeight (standard tap target). */}
            <button
              type="button"
              className="w-full flex items-center justify-between"
              onClick={() => setShowLineItems(!showLineItems)}
              style={{ minHeight: "44px" }}
              aria-expanded={showLineItems}
            >
              <Eyebrow tone="muted">
                Line items · {inv.line_items.length}
              </Eyebrow>
              {showLineItems ? (
                <ChevronUpIcon className="w-4 h-4" strokeWidth={1.5} />
              ) : (
                <ChevronDownIcon className="w-4 h-4" strokeWidth={1.5} />
              )}
            </button>
            {showLineItems && (
              <ul
                className="mt-3 divide-y"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                {inv.line_items.map((li, i) => (
                  <li
                    key={i}
                    className="py-2 flex items-start justify-between gap-3 text-[12px]"
                  >
                    <span
                      style={{ color: "var(--text-primary)" }}
                      className="flex-1 min-w-0"
                    >
                      {li.description}
                    </span>
                    <Money cents={li.amount} size="sm" />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>

      {/* Sticky bottom CTA group — Reject 44px / Hold 44px / Approve 56px.

          TD-20 boundary exemption: NwButton has sizes sm/md/lg only
          (h-30/36/44). Source spec is exact 44px / 44px / 56px touch
          targets per SYSTEM.md §11. NwButton would shrink the Approve to
          44px and break the high-stakes touch-target contract — same
          rationale as OwnerDrawView's Approve button. Reject button TD-21
          rgba inline preserved per CONTEXT D-06 cosmetic-deferred scope. */}
      <div
        className="sticky bottom-0 grid grid-cols-3 border-t"
        style={{
          gap: "1px",
          background: "var(--border-default)",
          borderColor: "var(--border-default)",
        }}
      >
        <button
          type="button"
          className="flex items-center justify-center gap-1 text-[11px] uppercase font-medium"
          style={{
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            minHeight: "44px",
            fontFamily: "var(--font-jetbrains-mono)",
            letterSpacing: "0.12em",
          }}
        >
          <XMarkIcon className="w-4 h-4" strokeWidth={1.5} />
          Reject
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-1 text-[11px] uppercase font-medium"
          style={{
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            minHeight: "44px",
            fontFamily: "var(--font-jetbrains-mono)",
            letterSpacing: "0.12em",
          }}
        >
          <PauseIcon className="w-4 h-4" strokeWidth={1.5} />
          Hold
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-1.5 text-[12px] uppercase font-medium"
          style={{
            background: "var(--nw-stone-blue)",
            color: "var(--nw-white-sand)",
            minHeight: "56px",
            fontFamily: "var(--font-jetbrains-mono)",
            letterSpacing: "0.12em",
          }}
        >
          <CheckBadgeIcon className="w-4 h-4" strokeWidth={1.5} />
          Approve
        </button>
      </div>
    </div>
  );
}
