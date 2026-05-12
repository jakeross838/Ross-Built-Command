// src/components/prototypes/ScheduleView.tsx
//
// ScheduleView — Multi-fixture aggregation pattern (Gantt schedule).
// Stage 1.5c Plan 3 extraction; copies BudgetView pattern verbatim where
// possible (TanStack Table v8 + multi-fixture aggregation per iter-2 W-2).
//
// Pure props-only View component. Wrapper handles fixture lookup + path
// resolution; this View renders.
//
// Pattern characteristics (similar to BudgetView):
//   - Aggregates 3 fixture types (job, scheduleItems, vendors)
//   - R.2 "Recalculate, don't increment" — project date range, today-pct,
//     month labels all derived from items on render
//   - TanStack Table v8 base + custom timeline cell renderer
//   - 6+ month timeline + 20+ tasks + dependencies + today-marker
//
// AMENDMENT inheritance per nwrp48: Plan 3 BudgetView consumers may add
// a "committed" concept where it has meaningful "future-known commitment"
// interpretation. For Schedule: committed = approved-but-not-yet-started
// tasks. We don't add a separate column because schedule's "status" enum
// (not_started / in_progress / complete / blocked) already discriminates;
// not_started + in the future = the commitment. The legend + status colors
// surface this naturally; no extra column needed.
//
// TD-20 fix: TanStack column-header sort-trigger TD-20 exemption applies
// (per Plan 2 architect decision, BudgetView pattern). Schedule has no
// CTA action buttons in the source — only navigation + display affordances.
//
// TD-25/26: All Card padding=md / fontWeight=500 (already clean in source).
//
// Hooks order (Rules of Hooks):
//   1. useMemo items
//   2. useMemo projectStart
//   3. useMemo projectEnd
//   4. useCallback pctOffset
//   5. useMemo todayPct
//   6. useMemo monthLabels
//   7. useMemo columns
//   8. useReactTable
//
// Tenant-blind by construction.

"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";

import type {
  CaldwellJob,
  CaldwellScheduleItem,
  CaldwellScheduleStatus,
  CaldwellVendor,
} from "@/app/design-system/_fixtures/drummond/types";

import Card from "@/components/nw/Card";
import Eyebrow from "@/components/nw/Eyebrow";
import Badge, { type BadgeVariant } from "@/components/nw/Badge";

export interface ScheduleViewProps {
  job: CaldwellJob;
  scheduleItems: CaldwellScheduleItem[];
  vendors: CaldwellVendor[];
  /** Optional breadcrumb root link. Defaults to /design-system/prototypes/. */
  breadcrumbRoot?: { href: string; label: string };
}

// Status → CSS var color mapping (Site Office tokens, Set B locked palette).
function statusColor(s: CaldwellScheduleStatus): string {
  switch (s) {
    case "not_started":
      return "var(--text-tertiary)";
    case "in_progress":
      return "var(--nw-stone-blue)";
    case "complete":
      return "var(--nw-success)";
    case "blocked":
      return "var(--nw-danger)";
  }
}

const STATUS_BADGE: Record<
  CaldwellScheduleStatus,
  { variant: BadgeVariant; label: string }
> = {
  not_started: { variant: "neutral", label: "NOT STARTED" },
  in_progress: { variant: "accent", label: "IN PROGRESS" },
  complete: { variant: "success", label: "COMPLETE" },
  blocked: { variant: "danger", label: "BLOCKED" },
};

export default function ScheduleView({
  job,
  scheduleItems,
  vendors,
  breadcrumbRoot = { href: "/design-system/prototypes/", label: "Prototypes" },
}: ScheduleViewProps) {
  // Hooks order (Rules of Hooks compliance) — items first; downstream
  // useMemos handle empty input. Wrapped in useMemo so dependent useMemos
  // get a stable reference per render.
  const items = useMemo<CaldwellScheduleItem[]>(() => {
    return scheduleItems.filter((i) => i.job_id === job.id);
  }, [job.id, scheduleItems]);

  // Compute timeline date range from rendered items.
  const projectStart = useMemo(() => {
    if (items.length === 0) return new Date();
    return new Date(
      items.reduce(
        (min, i) => (i.start_date < min ? i.start_date : min),
        items[0].start_date,
      ),
    );
  }, [items]);

  const projectEnd = useMemo(() => {
    if (items.length === 0) return new Date();
    return new Date(
      items.reduce(
        (max, i) => (i.end_date > max ? i.end_date : max),
        items[0].end_date,
      ),
    );
  }, [items]);

  const totalMs = projectEnd.getTime() - projectStart.getTime();
  const totalDays = totalMs / (1000 * 60 * 60 * 24);

  // Helper: convert ISO date to % offset within project range.
  const pctOffset = useCallback(
    (isoDate: string): number => {
      if (totalMs <= 0) return 0;
      const d = new Date(isoDate);
      return ((d.getTime() - projectStart.getTime()) / totalMs) * 100;
    },
    [projectStart, totalMs],
  );

  // Today-marker offset.
  const todayPct = useMemo(() => {
    const now = new Date();
    if (now < projectStart) return 0;
    if (now > projectEnd) return 100;
    if (totalMs <= 0) return 0;
    return ((now.getTime() - projectStart.getTime()) / totalMs) * 100;
  }, [projectStart, projectEnd, totalMs]);

  // Generate month labels for timeline header axis.
  const monthLabels = useMemo(() => {
    const labels: Array<{ label: string; pct: number }> = [];
    if (totalMs <= 0) return labels;
    const cursor = new Date(
      projectStart.getFullYear(),
      projectStart.getMonth(),
      1,
    );
    while (cursor <= projectEnd) {
      const pct =
        ((cursor.getTime() - projectStart.getTime()) / totalMs) * 100;
      labels.push({
        label: cursor.toLocaleString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        pct,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return labels;
  }, [projectStart, projectEnd, totalMs]);

  // TanStack Table v8 column definitions.
  const columns = useMemo<ColumnDef<CaldwellScheduleItem>[]>(
    () => [
      {
        id: "task",
        header: "Task",
        cell: (info) => {
          const item = info.row.original;
          const vendor = item.assigned_vendor_id
            ? vendors.find((v) => v.id === item.assigned_vendor_id)
            : null;
          const indent = item.parent_id ? "pl-4" : "pl-0";
          return (
            <div className={indent}>
              <div
                className="text-[12px] truncate"
                style={{
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-space-grotesk)",
                  fontWeight: 500,
                }}
              >
                {item.is_milestone && (
                  <span
                    className="mr-1"
                    style={{ color: "var(--nw-stone-blue)" }}
                    aria-hidden="true"
                  >
                    ◆
                  </span>
                )}
                {item.name}
              </div>
              {vendor && (
                <div
                  className="text-[10px] truncate"
                  style={{
                    fontFamily: "var(--font-jetbrains-mono)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  {vendor.name}
                </div>
              )}
              {item.predecessor_ids.length > 0 && (
                <div
                  className="text-[9px]"
                  style={{
                    fontFamily: "var(--font-jetbrains-mono)",
                    color: "var(--text-tertiary)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  After: {item.predecessor_ids.length} dep
                  {item.predecessor_ids.length === 1 ? "" : "s"}
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        cell: (info) => {
          const s = STATUS_BADGE[info.row.original.status];
          return <Badge variant={s.variant}>{s.label}</Badge>;
        },
      },
      {
        id: "timeline",
        header: () => (
          <div className="relative h-8" style={{ minWidth: "600px" }}>
            {monthLabels.map((m) => (
              <div
                key={m.label}
                className="absolute top-0 text-[9px]"
                style={{
                  left: `${m.pct}%`,
                  fontFamily: "var(--font-jetbrains-mono)",
                  color: "var(--text-tertiary)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  transform: "translateX(0)",
                }}
              >
                {m.label}
              </div>
            ))}
          </div>
        ),
        cell: (info) => {
          const item = info.row.original;
          const left = pctOffset(item.start_date);
          const right = pctOffset(item.end_date);
          const width = Math.max(right - left, 0);

          return (
            <div className="relative h-6" style={{ minWidth: "600px" }}>
              {/* Today-marker per row (full-row vertical line). */}
              <div
                className="absolute top-0 bottom-0"
                style={{
                  left: `${todayPct}%`,
                  width: "1px",
                  background: "var(--nw-danger)",
                  opacity: 0.6,
                  pointerEvents: "none",
                }}
                aria-hidden="true"
              />

              {item.is_milestone ? (
                <div
                  className="absolute top-1"
                  style={{
                    left: `${left}%`,
                    width: "16px",
                    height: "16px",
                    background: "var(--nw-stone-blue)",
                    transform: "translateX(-8px) rotate(45deg)",
                  }}
                  title={`${item.name} (milestone) — ${item.start_date}`}
                />
              ) : (
                <div
                  className="absolute top-1 h-4"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    background: "var(--bg-subtle)",
                    border: `1px solid ${statusColor(item.status)}`,
                    overflow: "hidden",
                  }}
                  title={`${item.name} — ${item.start_date} to ${item.end_date} (${(item.percent_complete * 100).toFixed(0)}%)`}
                >
                  <div
                    className="h-full"
                    style={{
                      width: `${item.percent_complete * 100}%`,
                      background: statusColor(item.status),
                      opacity: 0.7,
                    }}
                  />
                </div>
              )}
            </div>
          );
        },
      },
    ],
    [monthLabels, todayPct, pctOffset, vendors],
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="px-6 py-8 max-w-[1800px] mx-auto">
      {/* Breadcrumb + header */}
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
            {job.id}
          </span>
          <span>/</span>
          <span style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
            Schedule
          </span>
        </div>
        <h1
          className="text-[24px] mb-1 nw-direction-headline"
          style={{
            fontFamily: "var(--font-space-grotesk)",
            fontWeight: 500,
            color: "var(--text-primary)",
          }}
        >
          {job.name} — Schedule
        </h1>
        <div
          className="flex items-center gap-3 text-[12px] flex-wrap"
          style={{ color: "var(--text-secondary)" }}
        >
          <span>{items.length} tasks</span>
          <span>·</span>
          <span style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
            {projectStart.toISOString().slice(0, 10)} →{" "}
            {projectEnd.toISOString().slice(0, 10)}
          </span>
          <span>·</span>
          <span>
            {Math.round(totalDays)} days ({Math.round(totalDays / 30)} months)
          </span>
          <span>·</span>
          <Badge variant="neutral">WAVE 2 PREVIEW</Badge>
        </div>
      </div>

      {/* Wave 2 preview banner */}
      <Card padding="md" className="mb-4">
        <Eyebrow tone="muted" className="mb-2">
          Wave 2 preview surface
        </Eyebrow>
        <p
          className="text-[12px]"
          style={{ color: "var(--text-secondary)" }}
        >
          Per Stage 1.5b deliverable #11 + Q2 override C: Schedule (Gantt) is
          a Wave 2 preview to test whether Site Office direction&apos;s
          compact density holds at Gantt scale.{" "}
          <code style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
            schedule_items
          </code>{" "}
          shape is proposed (NOT canonical — F1 may revise based on real
          complexity discovered here).
        </p>
      </Card>

      {/* Gantt grid — TanStack Table v8 base + per-cell timeline rendering. */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table
            className="w-full text-[11px]"
            style={{
              fontFamily: "var(--font-jetbrains-mono)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr
                  key={hg.id}
                  style={{ background: "var(--bg-subtle)" }}
                >
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      className="px-2 py-2 text-left border align-bottom"
                      style={{
                        borderColor: "var(--border-default)",
                        color: "var(--text-secondary)",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        fontSize: "9px",
                      }}
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-2 py-2 border align-top"
                      style={{ borderColor: "var(--border-subtle)" }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Legend */}
      <div
        className="mt-4 flex items-center gap-4 text-[10px] flex-wrap"
        style={{
          fontFamily: "var(--font-jetbrains-mono)",
          color: "var(--text-tertiary)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-2"
            style={{ background: "var(--text-tertiary)" }}
            aria-hidden="true"
          />{" "}
          Not started
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-2"
            style={{ background: "var(--nw-stone-blue)" }}
            aria-hidden="true"
          />{" "}
          In progress
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-2"
            style={{ background: "var(--nw-success)" }}
            aria-hidden="true"
          />{" "}
          Complete
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-2"
            style={{ background: "var(--nw-danger)" }}
            aria-hidden="true"
          />{" "}
          Blocked
        </span>
        <span className="flex items-center gap-1">
          <span
            style={{ color: "var(--nw-stone-blue)" }}
            aria-hidden="true"
          >
            ◆
          </span>{" "}
          Milestone
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-px h-3"
            style={{ background: "var(--nw-danger)" }}
            aria-hidden="true"
          />{" "}
          Today
        </span>
      </div>
    </div>
  );
}
