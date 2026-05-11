"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
  matches?: (pathname: string, search: URLSearchParams) => boolean;
  badge?: number | null;
};

export default function PlatformSidebar({
  unresolvedFeedback,
  escalatedSupport,
  pendingCostIntel,
}: {
  unresolvedFeedback?: number;
  escalatedSupport?: number;
  pendingCostIntel?: number;
}) {
  const pathname = usePathname();

  // Per Stage 1.5c Plan 6 Task 2 (iter-2 D-20 / D-058 full migration):
  // Sidebar links now point at /platform-admin/* (migrated sub-routes).
  // The OLD /admin/platform/* pages still exist (deletion deferred to F1 /
  // Wave 1.1-Lite per Plan 6 Step G); when an old-page renders, sidebar
  // clicks 308-redirect once via Plan 1 wildcard rule. Acceptable transition
  // behavior. The pathname checks below also recognize the old prefix so
  // active-state highlighting works during the transition window.
  const NAV_ITEMS: NavItem[] = [
    { href: "/platform-admin", label: "Overview", exact: true },
    { href: "/platform-admin/organizations", label: "Organizations" },
    { href: "/platform-admin/users", label: "Users" },
    {
      href: "/platform-admin/support",
      label: "Support",
      badge: escalatedSupport ?? null,
    },
    {
      href: "/platform-admin/feedback",
      label: "Feedback",
      badge: unresolvedFeedback ?? null,
    },
    {
      href: "/platform-admin/cost-intelligence",
      label: "Cost Intelligence",
      badge: pendingCostIntel ?? null,
    },
    { href: "/platform-admin/audit", label: "Audit log" },
    {
      href: "/platform-admin/audit?action=impersonate_start",
      label: "Impersonation history",
      matches: (pathname: string, search: URLSearchParams) =>
        (pathname === "/platform-admin/audit" || pathname === "/admin/platform/audit") &&
        search.get("action") === "impersonate_start",
    },
  ];

  return (
    <nav
      className="w-[220px] shrink-0 hidden md:block border-r"
      style={{ borderColor: "var(--border-default)" }}
      aria-label="Platform admin sections"
    >
      <div className="sticky top-0 px-3 py-6 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          // Per Stage 1.5c Plan 6 Task 2 (iter-2 D-20): sidebar must
          // highlight correctly whether rendered in /platform-admin/*
          // (new layout) or /admin/platform/* (legacy layout — still
          // exists until F1 cleanup). The legacy href is derived by
          // swapping the prefix so active-state matches in both cases.
          const legacyHref = item.href.startsWith("/platform-admin")
            ? item.href.replace(/^\/platform-admin/, "/admin/platform")
            : item.href;

          let active: boolean;
          if (item.matches) {
            // usePathname doesn't expose search params — fall back to
            // href-prefix match for the impersonation shortcut so the
            // active state at least highlights the audit group.
            active =
              pathname === "/platform-admin/audit" ||
              pathname === "/admin/platform/audit";
          } else if (item.exact) {
            active = pathname === item.href || pathname === legacyHref;
          } else {
            active =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`) ||
              pathname === legacyHref ||
              pathname.startsWith(`${legacyHref}/`);
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between gap-2 px-3 py-2 text-sm transition-colors"
              style={{
                color: active ? "var(--text-primary)" : "var(--text-tertiary)",
                fontWeight: active ? 500 : 400,
                background: active ? "var(--bg-subtle)" : "transparent",
                borderLeft: active
                  ? "2px solid var(--nw-stone-blue)"
                  : "2px solid transparent",
              }}
            >
              <span>{item.label}</span>
              {item.badge && item.badge > 0 ? (
                <span
                  className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[10px] font-medium tabular-nums border"
                  style={{
                    fontFamily: "var(--font-jetbrains-mono)",
                    letterSpacing: "0.08em",
                    color: "var(--nw-white-sand)",
                    background: "var(--nw-danger)",
                    borderColor: "var(--nw-danger)",
                  }}
                >
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
