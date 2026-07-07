"use client";

import { usePathname } from "next/navigation";
import NavBar from "./nav-bar";
import JobFilterRail from "./job-filter/JobFilterRail";

/**
 * AppShell wraps authenticated page content with the flat top NavBar.
 *
 * Flat-IA rework (2026-07): the per-job JobSidebar was removed. The product is
 * three cross-job surfaces (Invoices / Price Intelligence / Draws) reached from
 * the top nav — there is no per-job tab navigation.
 *
 * PART 2: a left Job-filter RAIL is shown on the Invoices + Draws list surfaces
 * only (NOT Price Intelligence, NOT detail/sub views). It is a cross-surface
 * FILTER (never navigation) — see JobFilterRail / JobFilterProvider. The old
 * navigating JobSidebar is intentionally NOT remounted.
 */
const RAIL_PATHS = new Set([
  "/financials/bills",
  "/invoices",
  "/financials/pay-apps",
  "/draws",
]);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showRail = RAIL_PATHS.has(pathname);

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <div className="flex flex-1 min-w-0">
        {showRail && <JobFilterRail />}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
