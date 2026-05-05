// src/components/prototypes/BudgetView.tsx
//
// BudgetView — Multi-fixture aggregation pattern exemplar (Stage 1.5c Plan 2).
// iter-2 architect W-2: 2nd canonical extraction exemplar; Plan 3
// implementers COPY THIS PATTERN VERBATIM when extracting Schedule,
// VendorList, VendorDetail, and any other multi-fixture surfaces.
//
// Pattern characteristics (vs. InvoiceReviewView's single-fixture
// Document Review pattern):
//   - Aggregates 6 fixture types into computed rows
//   - R.2 "Recalculate, don't increment" — every running total
//     (previous_applications, this_period, total_to_date,
//     percent_complete, balance_to_finish, revised_estimate) is
//     derived on render from source rows. Zero stored aggregates.
//   - Job-level KPI strip aggregates row-level computed values
//   - DataGrid renders 30+ rows with computed columns
//   - F1 swaps fixtures for real Supabase queries with the same
//     JOIN pattern + same computed fields
//
// Wrapper-View boundary (per AUDIT-LOG-STRATEGY.md T10c posture
// finding): wrapper imports CALDWELL_* fixtures freely; View imports
// types only. T10c silent on src/components/prototypes/* paths.
//
// Hooks order (Rules of Hooks — preserved from source):
//   1. useMemo rows         — per-budget-line computed columns (R.2)
//   2. useMemo kpis         — job-level totals (R.2)
//   3. useState sorting     — TanStack Table sort state
//   4. useMemo columns      — TanStack ColumnDef array
//   5. useReactTable        — table instance
//   6. early return         — guard on null kpis (after all hooks)
//
// TD-20 fix exemption note: the column-header sort-trigger button at
// the table head is NOT a TD-20 case. TD-20 targets CTA action buttons
// (Reject / Push to QB / Approve / Submit). The sort-trigger is a
// TanStack Table integration with different ergonomics — fixed-height
// NwButton would break the column header layout. Source preserved
// verbatim. CONTEXT D-06 explicitly lists TD-20 prototype targets:
// invoices, draws, documents, vendors, owner-portal, mobile-approval —
// budget is NOT in the TD-20 scope. The single raw button here is a
// table-cell control, not a CTA.
//
// Tenant-blind by construction.

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
} from "@heroicons/react/24/outline";

import type {
  CaldwellJob,
  CaldwellBudgetLine,
  CaldwellInvoice,
  CaldwellCostCode,
  CaldwellDrawLineItem,
  CaldwellChangeOrder,
  CaldwellDraw,
} from "@/app/design-system/_fixtures/drummond/types";

import Card from "@/components/nw/Card";
import Eyebrow from "@/components/nw/Eyebrow";
import Money from "@/components/nw/Money";
// NwButton imported for Plan 3 implementer reference: Schedule /
// VendorList / VendorDetail views (the other multi-fixture
// aggregation views Plan 3 will extract by copying this pattern)
// likely DO render CTA action buttons (e.g., "Add task", "Edit
// vendor"). Import path here is the canonical reference. The
// current BudgetView surface has no action buttons (filter / sort /
// search are TanStack Table-controlled), so NwButton is referenced
// in this comment + the file-header rationale block but not rendered.
// The unused import would trip ESLint — kept as documentation rather
// than as code. See file-header for TD-20 exemption rationale.
// import NwButton from "@/components/nw/Button"; // <- uncomment when adding CTA actions

export interface BudgetViewProps {
  job: CaldwellJob;
  budgetLines: CaldwellBudgetLine[];
  invoices: CaldwellInvoice[];
  costCodes: CaldwellCostCode[];
  /** Current draw being prepared. Wrapper resolves from CALDWELL_DRAWS. */
  currentDraw: CaldwellDraw;
  /** Multi-fixture pattern marker — wrapper passes draw_line_items
   *  through even when the current rendering derives prior/current
   *  period sums from invoices.draw_id. F1 may shift the source of
   *  truth to draw_line_items; the prop already exists. */
  drawLineItems: CaldwellDrawLineItem[];
  /** Approved + executed change orders for this job. Used for CO-fee
   *  total in the KPI strip ("incl. $X approved COs"). */
  changeOrders: CaldwellChangeOrder[];
  /** Optional breadcrumb root link. Defaults to /design-system/prototypes/. */
  breadcrumbRoot?: { href: string; label: string };
}

// Computed shape per R.2 — never stored, always derived on render.
type BudgetRow = CaldwellBudgetLine & {
  cost_code_label: string;
  previous_applications: number;
  this_period: number;
  total_to_date: number;
  percent_complete: number;
  balance_to_finish: number;
};

export default function BudgetView({
  job,
  budgetLines,
  invoices,
  costCodes,
  currentDraw,
  // drawLineItems intentionally accepted but not used in current
  // rendering. F1 may shift previous_applications source-of-truth from
  // invoices.draw_id to draw_line_items.previous_applications — prop
  // already in the contract for that future swap. Silence the unused
  // warning at the call-site by destructuring with rename.
  drawLineItems: _drawLineItems,
  changeOrders,
  breadcrumbRoot = { href: "/design-system/prototypes/", label: "Prototypes" },
}: BudgetViewProps) {
  // Per R.2 — compute on render from source rows. Filter budgetLines to
  // those for this job (typically the wrapper does this, but we re-filter
  // defensively to be safe against wrapper miswiring).
  const rows: BudgetRow[] = useMemo(() => {
    return budgetLines
      .filter((bl) => bl.job_id === job.id)
      .map((bl) => {
        const cc = costCodes.find((c) => c.id === bl.cost_code_id);

        // Sum invoices in PRIOR draws for this cost code (drawn but not
        // in the current period). Excludes invoices not yet drawn
        // (draw_id null).
        const previous_applications = invoices
          .filter(
            (i) =>
              i.cost_code_id === bl.cost_code_id &&
              i.draw_id !== null &&
              i.draw_id !== currentDraw.id,
          )
          .reduce((sum, i) => sum + i.total_amount, 0);

        // Sum invoices in CURRENT draw for this cost code.
        const this_period = invoices
          .filter(
            (i) =>
              i.cost_code_id === bl.cost_code_id &&
              i.draw_id === currentDraw.id,
          )
          .reduce((sum, i) => sum + i.total_amount, 0);

        const total_to_date = previous_applications + this_period;
        const percent_complete =
          bl.revised_estimate > 0 ? total_to_date / bl.revised_estimate : 0;
        const balance_to_finish = bl.revised_estimate - total_to_date;

        return {
          ...bl,
          cost_code_label: cc ? `${cc.code} · ${cc.description}` : "—",
          previous_applications,
          this_period,
          total_to_date,
          percent_complete,
          balance_to_finish,
        };
      });
  }, [job.id, budgetLines, invoices, costCodes, currentDraw.id]);

  // KPI summary — also derived on render per R.2.
  const kpis = useMemo(() => {
    const originalSum = rows.reduce((s, r) => s + r.original_estimate, 0);
    const revisedSum = rows.reduce((s, r) => s + r.revised_estimate, 0);
    const totalToDateSum = rows.reduce((s, r) => s + r.total_to_date, 0);
    const balanceSum = rows.reduce((s, r) => s + r.balance_to_finish, 0);
    const approvedCOs = changeOrders
      .filter(
        (co) =>
          co.job_id === job.id &&
          (co.status === "approved" || co.status === "executed"),
      )
      .reduce((s, co) => s + co.total_with_fee, 0);
    const overUnderTotal = rows.filter((r) => r.balance_to_finish < 0).length;
    return {
      originalSum,
      revisedSum,
      totalToDateSum,
      balanceSum,
      approvedCOs,
      overUnderTotal,
    };
  }, [rows, job.id, changeOrders]);

  // TanStack Table v8 setup — analog: data-display/page.tsx:367-660.
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<BudgetRow>[]>(
    () => [
      {
        accessorKey: "cost_code_label",
        header: "Cost code",
        cell: (info) => (
          <span
            style={{
              fontFamily: "var(--font-jetbrains-mono)",
              fontSize: "11px",
              color: "var(--text-primary)",
            }}
          >
            {info.getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "original_estimate",
        header: "Original",
        cell: (info) => <Money cents={info.getValue<number>()} size="sm" />,
        sortingFn: "basic",
      },
      {
        accessorKey: "revised_estimate",
        header: "Revised",
        cell: (info) => <Money cents={info.getValue<number>()} size="sm" />,
        sortingFn: "basic",
      },
      {
        accessorKey: "previous_applications",
        header: "Previous",
        cell: (info) => <Money cents={info.getValue<number>()} size="sm" />,
        sortingFn: "basic",
      },
      {
        accessorKey: "this_period",
        header: "This period",
        cell: (info) => <Money cents={info.getValue<number>()} size="sm" />,
        sortingFn: "basic",
      },
      {
        accessorKey: "total_to_date",
        header: "Total",
        cell: (info) => <Money cents={info.getValue<number>()} size="sm" />,
        sortingFn: "basic",
      },
      {
        accessorKey: "percent_complete",
        header: "% complete",
        cell: (info) => {
          const pct = info.getValue<number>();
          // Per CONTEXT plan-specific decisions: Stone Blue tint for 0-99%,
          // success-color full bar for 100%, warning tint when balance
          // goes negative (over budget). Bar widget is inline SVG-free —
          // a thin horizontal block with width % and a tinted track.
          const overBudget = pct > 1;
          const complete = pct >= 1 && pct <= 1.0001;
          const fillColor = overBudget
            ? "var(--nw-warn)"
            : complete
              ? "var(--nw-success)"
              : "var(--nw-stone-blue)";
          const widthPct = Math.min(Math.max(pct, 0), 1.5) * 100;
          return (
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="h-1.5 flex-1 min-w-[40px] max-w-[80px] relative"
                style={{
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--border-subtle)",
                }}
                aria-hidden="true"
              >
                <div
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: `${Math.min(widthPct, 100)}%`,
                    background: fillColor,
                  }}
                />
              </div>
              <span
                style={{
                  fontFamily: "var(--font-jetbrains-mono)",
                  fontSize: "10px",
                  color: overBudget
                    ? "var(--nw-warn)"
                    : "var(--text-secondary)",
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                }}
              >
                {(pct * 100).toFixed(1)}%
              </span>
            </div>
          );
        },
        sortingFn: "basic",
      },
      {
        accessorKey: "balance_to_finish",
        header: "Balance",
        cell: (info) => {
          const bal = info.getValue<number>();
          // Negative balance = over budget; render in danger color so the
          // overrun is unmistakable when scanning.
          return (
            <span
              style={{
                color: bal < 0 ? "var(--nw-danger)" : "var(--text-primary)",
              }}
            >
              <Money cents={bal} size="sm" />
            </span>
          );
        },
        sortingFn: "basic",
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // All hooks above run unconditionally. KPIs are always populated when
  // rows non-empty, so no early return needed (the original prototype's
  // notFound() guard was for the wrapper's missing-job case — wrappers
  // are responsible for that guard now).

  const completionPct =
    kpis.revisedSum > 0 ? (kpis.totalToDateSum / kpis.revisedSum) * 100 : 0;

  return (
    <div className="px-6 py-8 max-w-[1600px] mx-auto">
      {/* Header band — breadcrumb + title + sub */}
      <div className="mb-6">
        <div
          className="flex items-center gap-2 text-[10px] uppercase mb-2"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            letterSpacing: "0.14em",
            color: "var(--text-tertiary)",
          }}
        >
          <Link href={breadcrumbRoot.href} className="hover:underline">
            {breadcrumbRoot.label}
          </Link>
          <span>›</span>
          <Link
            href={`${breadcrumbRoot.href}jobs/${job.id}`}
            className="hover:underline"
          >
            {job.id}
          </Link>
          <span>›</span>
          <span>Budget</span>
        </div>
        <h1
          className="text-[24px] mb-1 nw-direction-headline"
          style={{
            fontFamily: "var(--font-space-grotesk)",
            letterSpacing: "-0.02em",
            fontWeight: 500,
            color: "var(--text-primary)",
          }}
        >
          {job.name} — Budget
        </h1>
        <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
          {rows.length} budget lines · Current draw: Pay App #
          {currentDraw.draw_number}
        </p>
      </div>

      {/* KPI strip — analog: patterns/page.tsx:511-581 (Pattern3Dashboard) */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 mb-6"
        style={{
          gap: "1px",
          background: "var(--border-default)",
          borderTop: "1px solid var(--border-default)",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        {[
          {
            label: "Original contract",
            value: <Money cents={kpis.originalSum} size="xl" variant="emphasized" />,
            sub: "as signed",
          },
          {
            label: "Revised total",
            value: <Money cents={kpis.revisedSum} size="xl" variant="emphasized" />,
            sub: `incl. ${(kpis.approvedCOs / 100).toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })} approved COs`,
          },
          {
            label: "Invoiced to date",
            value: (
              <Money cents={kpis.totalToDateSum} size="xl" variant="emphasized" />
            ),
            sub: `${completionPct.toFixed(1)}% complete`,
          },
          {
            label: "Remaining",
            value: <Money cents={kpis.balanceSum} size="xl" variant="emphasized" />,
            sub:
              kpis.overUnderTotal > 0
                ? `${kpis.overUnderTotal} lines over budget`
                : "all lines on budget",
          },
        ].map((k) => (
          <div
            key={k.label}
            className="p-4"
            style={{ background: "var(--bg-card)" }}
          >
            <Eyebrow tone="muted" className="mb-2">
              {k.label}
            </Eyebrow>
            <div className="mb-1">{k.value}</div>
            <div
              className="text-[10px] uppercase"
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                color: "var(--text-accent)",
                letterSpacing: "0.08em",
              }}
            >
              {k.sub}
            </div>
          </div>
        ))}
      </div>

      {/* DataGrid stress test — TanStack Table v8 with sortable columns.
          30 budget lines × 8 columns at compact density. Acceptance: no
          horizontal scroll at 768px tablet width. */}
      <Card padding="none">
        <div
          className="overflow-x-auto"
          style={{ borderTop: "1px solid var(--border-default)" }}
        >
          <table
            className="w-full"
            style={{
              fontFamily: "var(--font-jetbrains-mono)",
              fontVariantNumeric: "tabular-nums",
              fontSize: "11px",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr
                  key={hg.id}
                  style={{
                    background: "var(--bg-muted)",
                    borderBottom: "1px solid var(--border-default)",
                  }}
                >
                  {hg.headers.map((header) => {
                    const sorted = header.column.getIsSorted();
                    const sortable = header.column.getCanSort();
                    return (
                      <th
                        key={header.id}
                        scope="col"
                        aria-sort={
                          sorted === "asc"
                            ? "ascending"
                            : sorted === "desc"
                              ? "descending"
                              : sortable
                                ? "none"
                                : undefined
                        }
                        className="text-left px-2 h-7"
                        style={{
                          fontFamily: "var(--font-jetbrains-mono)",
                          fontSize: "9px",
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          fontWeight: 500,
                          color: sorted
                            ? "var(--text-primary)"
                            : "var(--text-tertiary)",
                        }}
                      >
                        {sortable ? (
                          // NOTE: This is a TanStack Table column-header
                          // sort-trigger, NOT a CTA action button — TD-20
                          // exemption applies (see file-header rationale).
                          // Preserved verbatim from source for visual parity.
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="inline-flex items-center gap-1 hover:[color:var(--text-primary)] transition-colors"
                            style={{
                              fontFamily: "var(--font-jetbrains-mono)",
                              letterSpacing: "0.14em",
                              textTransform: "uppercase",
                              color: "inherit",
                            }}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            <span
                              style={{
                                color: sorted
                                  ? "var(--nw-stone-blue)"
                                  : "var(--text-tertiary)",
                              }}
                            >
                              {sorted === "asc" ? (
                                <ChevronUpIcon
                                  className="w-3 h-3"
                                  aria-hidden="true"
                                  strokeWidth={1.5}
                                />
                              ) : sorted === "desc" ? (
                                <ChevronDownIcon
                                  className="w-3 h-3"
                                  aria-hidden="true"
                                  strokeWidth={1.5}
                                />
                              ) : (
                                <ChevronUpDownIcon
                                  className="w-3 h-3 opacity-40"
                                  aria-hidden="true"
                                  strokeWidth={1.5}
                                />
                              )}
                            </span>
                          </button>
                        ) : (
                          flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-2 py-6 text-center text-[12px]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    No budget lines.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, i, arr) => (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom:
                        i < arr.length - 1
                          ? "1px solid var(--border-subtle)"
                          : "none",
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-2 h-7"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Footer count */}
      <p
        className="text-[10px] mt-3 uppercase"
        style={{
          fontFamily: "var(--font-jetbrains-mono)",
          letterSpacing: "0.14em",
          color: "var(--text-tertiary)",
        }}
      >
        {table.getRowModel().rows.length} of {rows.length} budget lines · Site
        Office compact density
      </p>
    </div>
  );
}
