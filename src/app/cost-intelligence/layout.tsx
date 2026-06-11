// src/app/cost-intelligence/layout.tsx
//
// Legacy cost-intelligence section layout — wraps children in AppShell.
// Added by the nwrp268-270 AppShell ownership fix: the 9 cost-intelligence
// page components had page-level <AppShell> mounts (pre-1.5c pattern) that
// produced DOUBLE chrome when re-exported under /price-intel (whose
// layout.tsx also mounts AppShell). The fix stripped every page-level
// mount; this layout keeps the legacy paths that are still directly
// reachable WITHOUT a next.config.mjs redirect (/cost-intelligence/items,
// /items/[id], /verification) chromed.
//
// Layouts are path-based — this file does NOT apply to /price-intel/*
// routes even though they re-export pages from this directory; those get
// AppShell from price-intel/layout.tsx. See
// .planning/ground-truth/APPSHELL-OWNERSHIP-INVESTIGATION.md.

import AppShell from "@/components/app-shell";

export default function CostIntelligenceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
