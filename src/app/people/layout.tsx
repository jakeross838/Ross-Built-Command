// src/app/people/layout.tsx
//
// People section layout — wraps children in AppShell so NavBar persists
// across /people/* navigation. Per /nightwork-qa 2026-05-11 UI FLAG-1.

import AppShell from "@/components/app-shell";

export default function PeopleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
