// src/app/company/layout.tsx
//
// Company section layout — wraps children in AppShell so NavBar persists
// across /company/* navigation. Per /nightwork-qa 2026-05-11 UI FLAG-1.

import AppShell from "@/components/app-shell";

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
