// src/components/prototypes/ReconciliationView.tsx
//
// ReconciliationView — Multi-fixture aggregation pattern (reconciliation
// strawman). Stage 1.5c Plan 3 extraction; copies BudgetView pattern
// (multi-fixture aggregation per iter-2 W-2) for the reconciliation
// strawman 4 candidates × 2 drift types.
//
// Pure props-only View component. Wrapper handles fixture lookup; this
// View renders.
//
// Per CONTEXT D-07: single page rendering 4×2 matrix top-to-bottom. Per
// drift-type sections enable side-by-side scrolling comparison.
//
// Per CONTEXT D-08: extends existing ReconciliationStrawman function in
// patterns/page.tsx — does NOT diverge per A16.1.
//
// Per CONTEXT D-09: uses CALDWELL_RECONCILIATION_PAIRS fixture from
// _fixtures/drummond/reconciliation.ts (passed via props).
//
// AMENDMENT inheritance per nwrp48: Reconciliation surface has 8
// candidate cards + 2 section anchors. CHANGE 2 collapsible-panel pattern
// is N/A here — the 4 candidates are the SUBJECT of the comparison, not
// audit panels. Hiding them defeats the whole purpose of the strawman.
// Pattern preserved expanded.
//
// TD fixes per CONTEXT D-06:
//   - TD-20: 0 raw buttons (anchor links + display-only). No fixes.
//   - TD-25/26: All Card padding=md / fontWeight=500 (already clean)
//
// Tenant-blind by construction.

import Link from "next/link";

import type {
  CaldwellReconciliationPair,
  CaldwellReconciliationDriftType,
} from "@/app/design-system/_fixtures/drummond/types";

import Card from "@/components/nw/Card";
import Eyebrow from "@/components/nw/Eyebrow";
import DataRow from "@/components/nw/DataRow";

export interface ReconciliationViewProps {
  pairs: CaldwellReconciliationPair[];
  /** Optional breadcrumb root link. Defaults to /design-system/prototypes/. */
  breadcrumbRoot?: { href: string; label: string };
}

// Each pair has a candidate label embedded in id (e.g.
// rec-caldwell-invoice_po-1 for candidate 1 of invoice_po drift type).
function candidateOf(pair: CaldwellReconciliationPair): number {
  const match = pair.id.match(/-([1-4])$/);
  return match ? parseInt(match[1], 10) : 1;
}

function val(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") return v.toLocaleString();
  return String(v);
}

function labelOf(field: string): string {
  return field.replaceAll("_", " ");
}

// ─── Candidate 1 — Side-by-side delta ─────────────────────────────────
function Candidate1SideBySide({
  pair,
}: {
  pair: CaldwellReconciliationPair;
}) {
  const driftFields = new Set(pair.diffs.map((d) => d.field));
  const allKeys = Array.from(
    new Set([...Object.keys(pair.imported), ...Object.keys(pair.current)]),
  );

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-2">
        <Eyebrow tone="accent">Candidate 1 · Side-by-side delta</Eyebrow>
        <span
          className="text-[10px] uppercase"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            letterSpacing: "0.08em",
            color: "var(--text-tertiary)",
          }}
        >
          {pair.id}
        </span>
      </div>
      <p
        className="text-[12px] mb-3"
        style={{ color: "var(--text-secondary)" }}
      >
        Two columns: imported (left) vs current (right). Differences
        highlighted with --nw-warn border on the changed cell.
      </p>
      <div className="grid grid-cols-2 gap-2 text-[12px]">
        <div
          className="border p-3"
          style={{ borderColor: "var(--border-default)" }}
        >
          <Eyebrow tone="muted" className="mb-2">
            Imported · QuickBooks
          </Eyebrow>
          <div className="space-y-2">
            {allKeys.map((k) => (
              <DataRow
                key={k}
                label={labelOf(k)}
                value={val(pair.imported[k])}
              />
            ))}
          </div>
        </div>
        <div
          className="border p-3"
          style={{ borderColor: "var(--border-default)" }}
        >
          <Eyebrow tone="muted" className="mb-2">
            Current · Nightwork
          </Eyebrow>
          <div className="space-y-2">
            {allKeys.map((k) => {
              const isDrift = driftFields.has(k);
              const cell = (
                <DataRow label={labelOf(k)} value={val(pair.current[k])} />
              );
              return isDrift ? (
                <div
                  key={k}
                  className="border-l-2 pl-2"
                  style={{ borderColor: "var(--nw-warn)" }}
                >
                  {cell}
                </div>
              ) : (
                <div key={k}>{cell}</div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Candidate 2 — Inline diff ────────────────────────────────────────
function Candidate2InlineDiff({
  pair,
}: {
  pair: CaldwellReconciliationPair;
}) {
  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-2">
        <Eyebrow tone="accent">Candidate 2 · Inline diff</Eyebrow>
        <span
          className="text-[10px] uppercase"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            letterSpacing: "0.08em",
            color: "var(--text-tertiary)",
          }}
        >
          {pair.id}
        </span>
      </div>
      <p
        className="text-[12px] mb-3"
        style={{ color: "var(--text-secondary)" }}
      >
        One row per attribute drift; deletion + addition stacked inline like
        a git diff. Best for many records, narrow attribute changes.
      </p>
      <div
        className="space-y-2 text-[11px]"
        style={{ fontFamily: "var(--font-jetbrains-mono)" }}
      >
        {pair.diffs.map((d, i) => (
          <div key={i} className="space-y-1">
            <div
              className="text-[9px] uppercase"
              style={{
                color: "var(--text-tertiary)",
                letterSpacing: "0.08em",
              }}
            >
              {labelOf(d.field)}
            </div>
            <div
              className="px-3 py-1.5"
              style={{
                background: "rgba(176, 85, 78, 0.06)",
                color: "var(--nw-danger)",
              }}
            >
              − {val(d.imported_value)}
            </div>
            <div
              className="px-3 py-1.5"
              style={{
                background: "rgba(74, 138, 111, 0.06)",
                color: "var(--nw-success)",
              }}
            >
              + {val(d.current_value)}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Candidate 3 — Timeline overlay ───────────────────────────────────
function Candidate3TimelineOverlay({
  pair,
}: {
  pair: CaldwellReconciliationPair;
}) {
  const allKeys = Array.from(
    new Set([...Object.keys(pair.imported), ...Object.keys(pair.current)]),
  );
  const driftFields = new Set(pair.diffs.map((d) => d.field));

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-2">
        <Eyebrow tone="accent">Candidate 3 · Timeline overlay</Eyebrow>
        <span
          className="text-[10px] uppercase"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            letterSpacing: "0.08em",
            color: "var(--text-tertiary)",
          }}
        >
          {pair.id}
        </span>
      </div>
      <p
        className="text-[12px] mb-3"
        style={{ color: "var(--text-secondary)" }}
      >
        Single per-attribute list; warn-dot on drifted attributes,
        success-dot on matches. Best for time-ordered reconciliation (audit
        logs, activity streams).
      </p>
      <ul className="space-y-2 text-[12px]">
        {allKeys.map((k) => {
          const isDrift = driftFields.has(k);
          return (
            <li key={k} className="flex items-center gap-3">
              <span
                className="w-3 h-3 shrink-0 border"
                style={{
                  borderRadius: "var(--radius-dot)",
                  background: isDrift
                    ? "var(--nw-warn)"
                    : "var(--nw-success)",
                  borderColor: isDrift
                    ? "var(--nw-warn)"
                    : "var(--nw-success)",
                }}
              />
              <span
                className="text-[10px] uppercase"
                style={{
                  fontFamily: "var(--font-jetbrains-mono)",
                  color: "var(--text-tertiary)",
                  minWidth: "140px",
                  letterSpacing: "0.08em",
                }}
              >
                {labelOf(k)}
              </span>
              <span style={{ color: "var(--text-primary)" }}>
                {isDrift ? (
                  <>
                    imported{" "}
                    <code style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                      {val(pair.imported[k])}
                    </code>{" "}
                    vs current{" "}
                    <code style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                      {val(pair.current[k])}
                    </code>
                  </>
                ) : (
                  <>{val(pair.current[k])} (match)</>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// ─── Candidate 4 — Hybrid split + inline ──────────────────────────────
function Candidate4Hybrid({ pair }: { pair: CaldwellReconciliationPair }) {
  const driftFields = new Set(pair.diffs.map((d) => d.field));
  const allKeys = Array.from(
    new Set([...Object.keys(pair.imported), ...Object.keys(pair.current)]),
  );

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-2">
        <Eyebrow tone="accent">Candidate 4 · Hybrid (split + inline)</Eyebrow>
        <span
          className="text-[10px] uppercase"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            letterSpacing: "0.08em",
            color: "var(--text-tertiary)",
          }}
        >
          {pair.id}
        </span>
      </div>
      <p
        className="text-[12px] mb-3"
        style={{ color: "var(--text-secondary)" }}
      >
        Top-level split (imported left / current right) with row-level
        inline diff per attribute. Most expressive; highest implementation
        weight.
      </p>
      <div
        className="grid grid-cols-2 gap-px"
        style={{ background: "var(--border-default)" }}
      >
        <div
          className="p-3 text-[11px]"
          style={{ background: "var(--bg-card)" }}
        >
          <Eyebrow tone="muted" className="mb-2">
            Imported · QuickBooks
          </Eyebrow>
          <div className="space-y-2">
            {allKeys.map((k) => {
              const isDrift = driftFields.has(k);
              return (
                <div key={k}>
                  <DataRow
                    label={labelOf(k)}
                    value={val(pair.imported[k])}
                  />
                  {isDrift ? (
                    <div
                      className="text-[9px] mt-0.5 ml-1"
                      style={{
                        fontFamily: "var(--font-jetbrains-mono)",
                        color: "var(--nw-danger)",
                      }}
                    >
                      → drifts to {val(pair.current[k])}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
        <div
          className="p-3 text-[11px]"
          style={{ background: "var(--bg-card)" }}
        >
          <Eyebrow tone="muted" className="mb-2">
            Current · Nightwork
          </Eyebrow>
          <div className="space-y-2">
            {allKeys.map((k) => {
              const isDrift = driftFields.has(k);
              return (
                <div key={k}>
                  <DataRow
                    label={labelOf(k)}
                    value={val(pair.current[k])}
                  />
                  {isDrift ? (
                    <div
                      className="text-[9px] mt-0.5 ml-1"
                      style={{
                        fontFamily: "var(--font-jetbrains-mono)",
                        color: "var(--nw-success)",
                      }}
                    >
                      ← imported was {val(pair.imported[k])}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

function CandidateRenderer({ pair }: { pair: CaldwellReconciliationPair }) {
  const c = candidateOf(pair);
  switch (c) {
    case 1:
      return <Candidate1SideBySide pair={pair} />;
    case 2:
      return <Candidate2InlineDiff pair={pair} />;
    case 3:
      return <Candidate3TimelineOverlay pair={pair} />;
    case 4:
      return <Candidate4Hybrid pair={pair} />;
    default:
      return null;
  }
}

function DriftSection({
  pairs,
  driftType,
  title,
  blurb,
  anchor,
}: {
  pairs: CaldwellReconciliationPair[];
  driftType: CaldwellReconciliationDriftType;
  title: string;
  blurb: string;
  anchor: string;
}) {
  const filtered = pairs
    .filter((p) => p.drift_type === driftType)
    .sort((a, b) => candidateOf(a) - candidateOf(b));

  return (
    <section id={anchor} className="mb-10">
      <div
        className="mb-4 pb-2 border-b"
        style={{ borderColor: "var(--border-default)" }}
      >
        <Eyebrow tone="accent" className="mb-1">
          {title} · {filtered.length} candidates
        </Eyebrow>
        <p
          className="text-[13px]"
          style={{ color: "var(--text-secondary)" }}
        >
          {blurb}
        </p>
      </div>
      <div className="space-y-4">
        {filtered.map((p) => (
          <CandidateRenderer key={p.id} pair={p} />
        ))}
      </div>
    </section>
  );
}

export default function ReconciliationView({
  pairs,
  breadcrumbRoot = { href: "/design-system/prototypes/", label: "Prototypes" },
}: ReconciliationViewProps) {
  return (
    <div className="px-6 py-8 max-w-[1400px] mx-auto">
      {/* Header band */}
      <div className="mb-8">
        <div
          className="flex items-center gap-2 text-[12px] mb-2"
          style={{ color: "var(--text-tertiary)" }}
        >
          <Link href={breadcrumbRoot.href} className="hover:underline">
            {breadcrumbRoot.label}
          </Link>
          <span>/</span>
          <span style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
            Reconciliation
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
          Reconciliation strawman
        </h1>
        <p
          className="text-[14px] mb-4 max-w-[820px] leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          4 candidates × 2 drift types = 8 prototypes rendered against real
          Caldwell drift. Per CONTEXT Q3=C: leading candidate documented at
          end of 1.5b; final lock at first reconciliation phase post-Phase-3.9
          per D-028. This page extends the PATTERNS.md §11 strawman — does
          NOT diverge per A16.1.
        </p>
        <nav
          className="flex items-center gap-3 text-[11px] uppercase"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            color: "var(--text-tertiary)",
            letterSpacing: "0.08em",
          }}
        >
          <a href="#invoice-po" className="hover:underline">
            Invoice ↔ PO drift →
          </a>
          <span>·</span>
          <a href="#draw-budget" className="hover:underline">
            Draw ↔ Budget drift →
          </a>
        </nav>
      </div>

      <DriftSection
        pairs={pairs}
        driftType="invoice_po"
        title="Invoice ↔ PO drift"
        blurb="QuickBooks PO record vs Nightwork invoice — surfaces missing po_id linkage, amount overage on Coastline Foam, missing PO record entirely on Sandhill Drywall (cc-15101 drywall scope)."
        anchor="invoice-po"
      />
      <DriftSection
        pairs={pairs}
        driftType="draw_budget"
        title="Draw ↔ Budget drift"
        blurb="QuickBooks pay-app projection vs Nightwork budget line — surfaces missing CO attribution on framing (PCCO #1 plumbing CO not propagating), revised-estimate drift on cc-12101 specialties, missing draw_id linkage on cc-15101 drywall, missing lien_release_id linkage on cc-13101 special construction."
        anchor="draw-budget"
      />

      <div
        className="mt-10 p-5"
        style={{
          background: "var(--bg-subtle)",
          borderLeft: "2px solid var(--nw-warn)",
        }}
      >
        <Eyebrow tone="warn" className="mb-2">
          About this strawman
        </Eyebrow>
        <p
          className="text-[12px] mb-2 leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          Per CONTEXT D-08 and PATTERNS.md §11 acceptance posture (A16.1),
          this prototype EXTENDS the existing ReconciliationStrawman function
          in <code>src/app/design-system/patterns/page.tsx:1149-1279</code> —
          it does NOT diverge. Picking a non-Candidate-1 model now would
          force a non-trivial PATTERNS.md rewrite mid-foundation. Per Q3=C,
          the goal of 1.5b is to render all 4 against real Caldwell drift so
          Jake&apos;s preference becomes visually obvious; the leading
          candidate is a recommendation, not a lock.
        </p>
        <p
          className="text-[12px] leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          <strong style={{ color: "var(--text-primary)" }}>
            Leading-candidate observation (per Q3=C):
          </strong>{" "}
          across all 8 Caldwell pairs,{" "}
          <strong>Candidate 1 (side-by-side delta)</strong> handles drift
          most cleanly because the Caldwell drift is dominated by
          missing-field/null-vs-value cases (po_id missing, draw_id missing,
          lien_release_id missing, co_attribution missing). The two-column
          layout makes &ldquo;this side has it, this side doesn&apos;t&rdquo;
          instantly readable, and the warn-color left-border on the
          differing cell anchors the eye without competing with the data.
          Candidate 2 (inline diff) rivals Candidate 1 for narrow-attribute
          cases (e.g., cc-12101 budget_revised_dollars 14812.50 → 14375.00)
          but does not surface match-fields, which obscures what&apos;s NOT
          drifting. Candidate 3 timeline overlay over-rotates to
          time-ordered semantics that don&apos;t exist in the Caldwell drift
          (these are point-in-time snapshots, not events). Candidate 4
          hybrid carries the most visual weight per record — appropriate
          when many records share a small drift, but overweight for
          single-record review. Final lock at first reconciliation phase
          post-3.9 per D-028.
        </p>
      </div>
    </div>
  );
}
