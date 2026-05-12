// src/app/pipeline/layout.tsx
//
// Pipeline section layout — wraps children in AppShell so NavBar +
// JobSidebar (when applicable) persist across /pipeline/* navigation.
// Mirrors the /jobs/layout.tsx pattern. Per /nightwork-qa 2026-05-11
// UI FLAG-1: section overview pages added in Plan 4 rendered without
// AppShell; user clicking "Pipeline" in top nav arrived at a chrome-
// free page. Fix: add this layout so AppShell inherits.

import AppShell from "@/components/app-shell";

export default function PipelineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
