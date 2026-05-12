// src/app/price-intel/layout.tsx
//
// Price Intel section layout — wraps children in AppShell so NavBar
// persists across /price-intel/* navigation. Per /nightwork-qa 2026-05-11
// UI FLAG-1.

import AppShell from "@/components/app-shell";

export default function PriceIntelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
