// src/app/financials/layout.tsx
//
// Financials section layout — wraps children in AppShell so NavBar
// persists across /financials/* navigation. Per /nightwork-qa 2026-05-11
// UI FLAG-1.

import AppShell from "@/components/app-shell";

export default function FinancialsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
