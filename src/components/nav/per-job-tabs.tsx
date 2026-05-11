// src/components/nav/per-job-tabs.tsx
//
// Per-job sub-nav — primary tabs + More ▾ dropdown per CONTEXT D-12.
// 1.5c skeleton: phase + role-aware visibility logic placeholder; F2 wires
// real logic from jobs.phase column / org_settings (per CLAUDE.md
// "Org-configurable, not hardcoded" — flagged in W-8 for F2 externalization).
//
// iter-2 D-21 (= MASTER-PLAN D-059, Decision C from plan-review iter-1):
// collapse to dropdown on viewports <768px. Matches existing nav-bar mobile
// hamburger pattern (CLAUDE.md PM-on-mobile + 360px breakpoint rules).
//
// Mobile <768px breakpoint chosen because:
// - 6 primary tabs at 80-100px each = 560-700px overflows on 360px-768px
// - Collapse-to-dropdown gives PMs a clean tap target (one button) instead
//   of horizontal scroll (anti-pattern in PM field use)
// - Active tab label visible in collapsed state (so PMs know where they are)
// - 768px is Tailwind's `md` breakpoint default
//
// Tenant-blind silent: this component renders nav UI, accepts no
// org_id / membership / vendor_id props. The jobId is a non-tenant route
// param — generic UI primitive.
//
// iter-2 must-fix CRITICAL #2 cross-reference: Plan 3 Task 4 removed inline
// JobTabs from 9 existing /jobs/[id]/*/page.tsx files. PerJobTabs in
// /jobs/[id]/layout.tsx is the SOLE tab surface across all /jobs/[id]/*
// routes (existing + Plan 3 production + Plan 5 placeholders).
//
// NavDropdown reuse note: NavDropdown (src/components/nav/nav-dropdown.tsx)
// is the top-nav dropdown which hard-codes white-sand foreground for the
// dark nav-bar background. Reusing it directly on a light sub-nav surface
// would produce invisible text. Rather than retrofit NavDropdown with a
// surface variant (its file contains pre-existing hex literals tuned for
// the dark nav and the post-edit hook gates further edits to that file),
// the SubNavDropdown helper below mirrors NavDropdown's behavior (hybrid
// hover+click + keyboard navigation + click-outside-to-close + focus
// management) using sub-nav-appropriate Site Office tokens. This preserves
// the plan's intent — same UX behavior — without coupling the sub-nav to
// the top-nav's color decisions.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

export type JobPhase = "active" | "closeout" | "warranty" | "pre_con";

interface PerJobTabsProps {
  jobId: string;
  phase: JobPhase; // 1.5c hardcoded "active"; F2 reads from jobs.phase
}

interface DropdownItem {
  href: string;
  label: string;
}

const PRIMARY_TABS = [
  { key: "overview", label: "Overview", path: "" },
  { key: "schedule", label: "Schedule", path: "/schedule" },
  { key: "budget", label: "Budget", path: "/budget" },
  { key: "selections", label: "Selections", path: "/selections" },
  { key: "bills", label: "Bills", path: "/bills" },
  { key: "pay_apps", label: "Pay Apps", path: "/pay-apps" },
];

function moreBaseItems(jobId: string): DropdownItem[] {
  return [
    // Documentation
    { href: `/jobs/${jobId}/plans`, label: "Plans" },
    { href: `/jobs/${jobId}/specs`, label: "Specs" },
    { href: `/jobs/${jobId}/photos`, label: "Photos" },
    { href: `/jobs/${jobId}/documents`, label: "Documents" },
    // Coordination
    { href: `/jobs/${jobId}/rfis`, label: "RFIs" },
    { href: `/jobs/${jobId}/submittals`, label: "Submittals" },
    { href: `/jobs/${jobId}/change-orders`, label: "Change Orders" },
    { href: `/jobs/${jobId}/daily-logs`, label: "Daily Logs" },
    // Tasks
    { href: `/jobs/${jobId}/to-dos`, label: "To-Dos" },
    { href: `/jobs/${jobId}/punchlist`, label: "Punchlist" },
    // Time
    { href: `/jobs/${jobId}/time-entries`, label: "Time Entries" },
    // Permits
    { href: `/jobs/${jobId}/permits`, label: "Permits" },
    // People
    { href: `/jobs/${jobId}/team`, label: "Team" },
    // Activity
    { href: `/jobs/${jobId}/activity`, label: "Activity" },
  ];
}

function morePhaseItems(jobId: string, phase: JobPhase): DropdownItem[] {
  // Phase-aware visibility — 1.5c skeleton; F2 wires real logic.
  // CLAUDE.md "Org-configurable, not hardcoded" — Plan 7 W-8 doc note
  // for F2 externalization to org_settings or a computed view.
  const items: DropdownItem[] = [];
  if (phase === "closeout" || phase === "active") {
    items.push({ href: `/jobs/${jobId}/closeout`, label: "Closeout" });
  }
  if (phase === "warranty") {
    items.push({ href: `/jobs/${jobId}/warranty`, label: "Warranty" });
  }
  if (phase === "pre_con") {
    items.push({ href: `/jobs/${jobId}/pre-con`, label: "Pre-Con" });
  }
  return items;
}

const HOVER_CLOSE_DELAY_MS = 150;

/**
 * Sub-nav dropdown — mirrors NavDropdown behavior (hybrid hover+click +
 * keyboard navigation + click-outside-to-close) using Site Office tokens
 * tuned for light sub-nav surfaces.
 *
 * Why not import NavDropdown directly: NavDropdown hard-codes white-sand
 * foreground colors for the dark top-nav background. On a light sub-nav
 * surface those would render invisible. See top-of-file comment.
 */
function SubNavDropdown({
  label,
  items,
  active,
  activeHref,
}: {
  label: string;
  items: DropdownItem[];
  active: boolean;
  activeHref?: string;
}) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isHoverCapable, setIsHoverCapable] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  // Detect coarse / fine pointer once on mount
  useEffect(() => {
    const mql = window.matchMedia("(hover: hover) and (pointer: fine)");
    setIsHoverCapable(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsHoverCapable(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current != null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimeout();
    closeTimeoutRef.current = window.setTimeout(() => {
      setOpen(false);
      setFocusedIndex(-1);
    }, HOVER_CLOSE_DELAY_MS);
  }, [clearCloseTimeout]);

  const handleMouseEnter = useCallback(() => {
    if (!isHoverCapable) return;
    clearCloseTimeout();
    setOpen(true);
  }, [isHoverCapable, clearCloseTimeout]);

  const handleMouseLeave = useCallback(() => {
    if (!isHoverCapable) return;
    scheduleClose();
  }, [isHoverCapable, scheduleClose]);

  const handleClick = useCallback(() => {
    setOpen((prev) => !prev);
    setFocusedIndex(-1);
  }, []);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setFocusedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setFocusedIndex(-1);
        buttonRef.current?.focus();
        return;
      }
      if (
        !open &&
        (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")
      ) {
        e.preventDefault();
        setOpen(true);
        setFocusedIndex(0);
        return;
      }
      if (!open) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Home") {
        e.preventDefault();
        setFocusedIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setFocusedIndex(items.length - 1);
      } else if (e.key === "Tab") {
        setOpen(false);
        setFocusedIndex(-1);
      }
    },
    [open, items.length],
  );

  // Focus the active item after open
  useEffect(() => {
    if (!open || focusedIndex < 0) return;
    const el =
      menuRef.current?.querySelectorAll<HTMLAnchorElement>(
        "a[data-sub-nav-item]",
      )[focusedIndex];
    el?.focus();
  }, [open, focusedIndex]);

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-stretch"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1 px-4 py-3 text-[14px] transition-colors"
        style={{
          fontFamily: "var(--font-space-grotesk)",
          fontWeight: 500,
          color: active
            ? "var(--text-primary)"
            : "var(--text-secondary)",
          borderBottom: active
            ? "2px solid var(--nw-stone-blue)"
            : "2px solid transparent",
        }}
      >
        {label}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path
            d="M2.5 3.5l2.5 3 2.5-3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          onKeyDown={handleKeyDown}
          className="absolute top-full left-0 min-w-[220px] z-50 py-1 border bg-[var(--bg-card)] shadow-lg"
          style={{
            borderColor: "var(--border-default)",
            boxShadow:
              "0 12px 24px -6px rgba(0,0,0,0.18), 0 4px 10px -2px rgba(0,0,0,0.08)",
          }}
        >
          {items.map((item, i) => {
            const isActive = !!activeHref && activeHref === item.href;
            return (
              <Link
                key={item.href + i}
                href={item.href}
                data-sub-nav-item
                role="menuitem"
                tabIndex={focusedIndex === i ? 0 : -1}
                onClick={() => {
                  setOpen(false);
                  setFocusedIndex(-1);
                }}
                className="flex items-center justify-between gap-3 px-3 py-2.5 text-[13px] transition-colors"
                style={{
                  fontFamily: "var(--font-inter)",
                  background: isActive
                    ? "var(--bg-subtle)"
                    : "transparent",
                  color: "var(--text-primary)",
                  borderLeft: isActive
                    ? "2px solid var(--nw-stone-blue)"
                    : "2px solid transparent",
                  paddingLeft: "calc(0.75rem - 0px)",
                }}
              >
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PerJobTabs({ jobId, phase }: PerJobTabsProps) {
  const pathname = usePathname();
  const moreItems = [
    ...moreBaseItems(jobId),
    ...morePhaseItems(jobId, phase),
  ];

  // Active tab determination — exact path match against /jobs/{jobId}{path}.
  const activeTab = PRIMARY_TABS.find(
    (t) => pathname === `/jobs/${jobId}${t.path}`,
  );
  const activeTabKey = activeTab?.key ?? null;

  // Active state for More ▾: any path under /jobs/{jobId}/ that isn't a primary tab.
  const isMoreActive =
    !!pathname &&
    pathname.startsWith(`/jobs/${jobId}/`) &&
    !PRIMARY_TABS.some((t) => pathname === `/jobs/${jobId}${t.path}`);

  // iter-2 D-21 / D-059 — Mobile <768px collapse-to-dropdown:
  // ALL tabs (primary + More items) collapse to a single dropdown on <768px.
  // Tailwind responsive classes hide desktop tabs (md:flex) and show mobile
  // dropdown (md:hidden). Static CSS resolves at compile time — no
  // JS-driven media query / useEffect overhead per threat T-1.5c-5-05.
  const allTabsAsDropdownItems: DropdownItem[] = [
    ...PRIMARY_TABS.map((t) => ({
      href: `/jobs/${jobId}${t.path}`,
      label: t.label,
    })),
    ...moreItems,
  ];

  // Active label for mobile button — shows current tab name so PMs see
  // where they are even when nav is collapsed.
  const activeLabel =
    activeTab?.label ??
    moreItems.find((m) => m.href === pathname)?.label ??
    "Tabs";

  return (
    <div
      className="border-b"
      style={{ borderColor: "var(--border-default)" }}
    >
      <div className="px-6 max-w-[1600px] mx-auto">
        {/* Desktop posture (>=768px): primary tabs + More ▾ dropdown — fixed row */}
        <div className="hidden md:flex items-center gap-0">
          {PRIMARY_TABS.map((tab) => {
            const href = `/jobs/${jobId}${tab.path}`;
            const isActive = activeTabKey === tab.key;
            return (
              <Link
                key={tab.key}
                href={href}
                className="px-4 py-3 text-[14px] whitespace-nowrap transition-colors"
                style={{
                  fontFamily: "var(--font-space-grotesk)",
                  fontWeight: 500,
                  color: isActive
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                  borderBottom: isActive
                    ? "2px solid var(--nw-stone-blue)"
                    : "2px solid transparent",
                  // 44px+ touch target via vertical padding (12px+12px+~20px text)
                }}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}

          {/* More ▾ dropdown (desktop) */}
          <div className="ml-2">
            <SubNavDropdown
              label="More"
              items={moreItems}
              active={isMoreActive}
              activeHref={pathname ?? undefined}
            />
          </div>
        </div>

        {/* Mobile posture (<768px): single dropdown showing all tabs per iter-2 D-21 */}
        <div className="md:hidden py-2">
          <SubNavDropdown
            label={activeLabel}
            items={allTabsAsDropdownItems}
            active={true}
            activeHref={pathname ?? undefined}
          />
        </div>
      </div>
    </div>
  );
}
