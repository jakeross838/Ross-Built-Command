// src/app/today/layout.tsx
//
// Route segment for /today — the personal home screen (replaces /dashboard
// for role-aware experience per Principle 7 / CONTEXT D-05). Chrome
// (NavBar via AppShell + globals + design-system.css from root layout)
// inherited from root layout.tsx; this segment is a pass-through marker.
//
// Per CONTEXT D-19 / Decision A (D-057) — Plan 3 wraps each production
// route's outer container in `.design-system-scope` to activate Site
// Office C rules. Plan 1 only scaffolds the route; Plan 3 adds the
// wrap to all production routes including this one.

import type { ReactNode } from "react";

export default function TodayLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
