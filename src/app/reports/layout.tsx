// src/app/reports/layout.tsx
//
// Reports section layout — wraps children in AppShell so NavBar persists
// across /reports/* navigation. Per /nightwork-qa 2026-05-11 UI FLAG-1.

import AppShell from "@/components/app-shell";

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
