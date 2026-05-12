// src/app/admin/layout.tsx
//
// Admin section layout — wraps children in AppShell so NavBar persists
// across /admin/* navigation. Per /nightwork-qa 2026-05-11 UI FLAG-1.
// Note: /platform-admin/* (staff-only tools) has its own purpose-built
// layout and is exempt — see src/app/platform-admin/layout.tsx.

import AppShell from "@/components/app-shell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
