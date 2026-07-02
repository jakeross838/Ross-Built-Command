"use client";

import NavBar from "./nav-bar";

/**
 * AppShell wraps authenticated page content with the flat top NavBar.
 *
 * Flat-IA rework (2026-07): the per-job JobSidebar was removed. The product is
 * three cross-job surfaces (Invoices / Price Intelligence / Draws) reached from
 * the top nav — there is no jobs sidebar and no per-job tab navigation. This is
 * a NavBar-only wrapper; the `flex-1 min-w-0` content well is preserved so pages
 * (max-w-[1600px] self-centering) do not reflow.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
