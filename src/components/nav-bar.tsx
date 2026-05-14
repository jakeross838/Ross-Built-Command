"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { logoutAction } from "@/app/login/actions";
import { useOrgBranding } from "@/components/org-branding-provider";
import { PUBLIC_APP_NAME } from "@/lib/org/public";
import TrialBanner from "@/components/trial-banner";
import NotificationBell from "@/components/notification-bell";
import FeedbackTrigger from "@/components/feedback-trigger";
import { useTheme } from "@/components/theme-provider";
import { MobileNavSection } from "@/components/nav/nav-dropdown";
import AdminDropdown, { ADMIN_ITEMS } from "@/components/nav/admin-dropdown";
import PlatformAdminBadge from "@/components/nav/platform-admin-badge";
import { useCurrentRole } from "@/hooks/use-current-role";
import { NwWordmark } from "@/components/branding/Wordmark";
import { NwIcon } from "@/components/branding/Icon";

// Token discipline (CLAUDE.md UI rules + post-edit hook):
// - Foreground text on the dark nav-bar uses `text-nw-white-sand`
//   (the existing Slate Tailwind utility for --nw-white-sand).
// - Muted text and subtle borders on the dark nav use opacity-reduced
//   white-sand via bracket-value rgba — these are NOT hex literals and
//   are accepted by the post-edit hook. Logged as a Wave 1.1-Lite
//   cleanup candidate (TD-21-style rgba consolidation): replace with a
//   --nw-white-sand-muted CSS var token defined in colors_and_type.css
//   so even the rgba literals collapse into named tokens.
//
// Tailwind JIT requires hover: prefixes to appear as full literal
// strings in source — template literals like `hover:${NAV_TEXT}` are
// invisible to the scanner and the hover class never gets generated.
// Hence the literals are inlined below.

function NavThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const next = theme === "light" ? "dark" : "light";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className="inline-flex items-center justify-center w-8 h-8 border border-[rgba(247,245,236,0.15)] text-[rgba(247,245,236,0.65)] hover:text-nw-white-sand hover:border-[rgba(247,245,236,0.35)] transition-colors"
    >
      {theme === "light" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      )}
    </button>
  );
}

export type UserRole = "admin" | "pm" | "accounting" | "owner";

type Profile = {
  id: string;
  full_name: string;
  role: UserRole;
};

// Per CONTEXT D-04 + D-11: 8-section nav locked structure. F2 expansion
// to 15 roles is mechanical (the values become arrays of new role
// strings; the structure here is unchanged).
type NavItemKey =
  | "today"
  | "pipeline"
  | "jobs"
  | "financials"
  | "price_intel"
  | "people"
  | "company"
  | "reports"
  | "admin";  // dropdown

const ACCESS: Record<NavItemKey, UserRole[]> = {
  today:        ["owner", "admin", "pm", "accounting"],
  pipeline:     ["owner", "admin", "pm"],
  jobs:         ["owner", "admin", "pm", "accounting"],
  financials:   ["owner", "admin", "pm", "accounting"],
  price_intel:  ["owner", "admin", "pm", "accounting"],
  people:       ["owner", "admin", "pm", "accounting"],
  company:      ["owner", "admin", "accounting"],
  reports:      ["owner", "admin", "pm", "accounting"],
  admin:        ["owner", "admin"],  // dropdown (13 items in AdminDropdown)
};

function can(role: UserRole | null, key: NavItemKey) {
  return role != null && ACCESS[key].includes(role);
}

const ROLE_LABEL: Record<UserRole, string> = {
  owner: "Owner",
  admin: "Admin",
  pm: "PM",
  accounting: "Accounting",
};

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className="px-[6px] py-[2px] text-[9px] font-medium tracking-[0.12em] uppercase border text-nw-white-sand border-[rgba(247,245,236,0.25)]"
      style={{
        fontFamily: "var(--font-mono)",
      }}
    >
      {ROLE_LABEL[role]}
    </span>
  );
}

function firstNameOf(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

// Per CONTEXT D-11: the prior buildFinancialItems / buildOperationsItems /
// buildCostIntelItems / buildAdminItems builders were REMOVED. The new
// 8-section nav uses single-link primary items (NOT dropdowns). The only
// top-level dropdown is Admin ▾, owned by `<AdminDropdown />`.
//
// Section sub-navigation lives inside section overview pages (Plan 4 work)
// — visiting `/financials` lands on the section overview Card grid which
// links to /financials/bills, /financials/pay-apps, etc. This matches the
// IA principle that the top nav is for sections; sub-navigation is a
// section concern.
//
// Per iter-2 architect W-7: the prior local `pendingVerification` +
// `pendingConversions` state + fetch was nav-bar-local; the only callers
// were the (now-removed) cost intelligence dropdown count badges. The
// counts concept is reachable via /price-intel/verification and
// /price-intel section overview when those pages are built (Plan 4).
// The cost-intelligence and admin/platform pages each have their own
// independent pending-count fetch logic — confirmed by grep.

const PRIMARY_NAV: Array<{ key: NavItemKey; label: string; href: string }> = [
  { key: "today",       label: "Today",       href: "/today" },
  { key: "pipeline",    label: "Pipeline",    href: "/pipeline" },
  { key: "jobs",        label: "Jobs",        href: "/jobs" },
  { key: "financials",  label: "Financials",  href: "/financials" },
  { key: "price_intel", label: "Price Intel", href: "/price-intel" },
  { key: "people",      label: "People",      href: "/people" },
  { key: "company",     label: "Company",     href: "/company" },
  { key: "reports",     label: "Reports",     href: "/reports" },
];

export default function NavBar({ onToggleSidebar }: { onToggleSidebar?: () => void } = {}) {
  const pathname = usePathname();
  const role = useCurrentRole();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Wait for role to resolve before composing the Profile state — the
  // nav renders the role badge alongside the user name, so loading
  // both together avoids a flash of a placeholder role.
  //
  // The PlatformAdminBadge component owns its own platform_admins query
  // (see src/components/nav/platform-admin-badge.tsx). Removed from this
  // file per Plan 1 Step F.
  useEffect(() => {
    if (!role) return;
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", user.id)
        .single();
      if (cancelled) return;
      if (profileRow) {
        setProfile({
          id: profileRow.id as string,
          full_name: profileRow.full_name as string,
          role: role as UserRole,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMobileOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const closeMobile = () => setMobileOpen(false);

  // Active-state matchers for the 8 primary nav items. Per CONTEXT D-12:
  // /jobs is the top-level list; per-job sub-nav (Plan 5) renders inside
  // /jobs/[id]/layout.tsx, NOT in this top nav.
  function isActive(key: NavItemKey): boolean {
    switch (key) {
      case "today":
        // /today (canonical) + / (root redirects to /today via Task 2) +
        // legacy /dashboard (308-redirects via Task 3) — the redirects
        // fire before render so pathname here will already be /today,
        // but we keep the legacy match for the brief moment between
        // client-side navigation requests and the server redirect
        // resolving.
        return pathname === "/" || pathname === "/today" || pathname === "/dashboard";
      case "pipeline":
        return pathname.startsWith("/pipeline");
      case "jobs":
        return pathname === "/jobs" || pathname.startsWith("/jobs/");
      case "financials":
        // Includes legacy paths that 308-redirect into /financials/* — the
        // redirect resolves before render but we keep these for client-side
        // optimistic active-state during navigation.
        return (
          pathname.startsWith("/financials") ||
          pathname.startsWith("/financial") ||
          pathname.startsWith("/invoices") ||
          pathname.startsWith("/draws") ||
          pathname.startsWith("/payments") ||
          pathname.startsWith("/aging") ||
          pathname.startsWith("/lien-releases") ||
          pathname.startsWith("/change-orders") ||
          pathname.startsWith("/purchase-orders")
        );
      case "price_intel":
        return (
          pathname.startsWith("/price-intel") ||
          pathname.startsWith("/cost-intelligence") ||
          pathname.startsWith("/items")
        );
      case "people":
        return pathname.startsWith("/people") || pathname.startsWith("/vendors");
      case "company":
        return pathname.startsWith("/company");
      case "reports":
        return pathname.startsWith("/reports");
      case "admin":
        return pathname.startsWith("/admin") || pathname.startsWith("/settings");
    }
  }

  const isAdminActive = isActive("admin");

  // Use the hook's role directly for show-gates; profile?.role is
  // redundant once the hook drives profile assembly above.
  const show = {
    today:        can(role, "today"),
    pipeline:     can(role, "pipeline"),
    jobs:         can(role, "jobs"),
    financials:   can(role, "financials"),
    price_intel:  can(role, "price_intel"),
    people:       can(role, "people"),
    company:      can(role, "company"),
    reports:      can(role, "reports"),
    admin:        can(role, "admin"),
  };
  const branding = useOrgBranding();
  const brandName = branding?.name ?? PUBLIC_APP_NAME;
  const logoUrl = branding?.logo_url ?? null;

  // Active menu item href for the Admin dropdown (used by NavDropdown to
  // render the active item with the stone-blue left-border accent).
  const adminActiveHref = ADMIN_ITEMS.find((i) => pathname === i.href)?.href;

  return (
    <>
    <header
      ref={menuRef}
      data-component="nav-bar"
      className="bg-nw-slate-deeper border-b border-[rgba(247,245,236,0.08)] sticky top-0 z-40"
    >
      <div className="max-w-[1600px] mx-auto px-8 h-[54px] flex items-center justify-between gap-[22px]">
        <Link
          href="/"
          aria-label={PUBLIC_APP_NAME}
          className="flex items-center gap-4 group shrink-0 group-hover:opacity-85 transition-opacity"
        >
          {/* Wordmark for >=360px viewports; collapses to icon at <360px per
              CLAUDE.md UI rules Q13 / nwrp19 spec. Tailwind arbitrary
              breakpoint max-[359px] handles the cutoff without adding a
              named breakpoint to tailwind.config (per BRANDING.md §3
              Mobile collapse). Nav bar sits on bg-nw-slate-deeper (dark)
              so wordmark uses color="inverse" → --nw-white-sand. */}
          <span className="hidden min-[360px]:inline-flex">
            <NwWordmark size={110} color="inverse" />
          </span>
          <span className="inline-flex min-[360px]:hidden">
            <NwIcon size={32} />
          </span>
          {logoUrl && (
            <>
              <span
                aria-hidden="true"
                className="hidden md:block w-px h-6 bg-[rgba(247,245,236,0.18)]"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt={brandName}
                className="hidden md:block w-auto object-contain"
                style={{ height: "18px" }}
              />
            </>
          )}
        </Link>

        {/* Desktop nav — 8 primary items + Admin dropdown */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center h-full">
          {PRIMARY_NAV.map((item) =>
            show[item.key] ? (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center gap-1.5 h-full px-[14px] text-[13px] font-medium font-sans transition-colors border-b-2 -mb-px ${
                  isActive(item.key)
                    ? "text-nw-white-sand border-b-nw-stone-blue"
                    : "text-[rgba(247,245,236,0.65)] hover:text-nw-white-sand border-transparent"
                }`}
              >
                {item.label}
              </Link>
            ) : null
          )}
          {show.admin && (
            <AdminDropdown active={isAdminActive} activeHref={adminActiveHref} />
          )}
        </nav>

        {/* Desktop user + logout */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <PlatformAdminBadge />
          {profile && <NotificationBell userId={profile.id} />}
          <NavThemeToggle />
          {profile && (
            <div className="flex items-center gap-[12px]">
              <span className="text-[13px] font-medium text-nw-white-sand">
                {firstNameOf(profile.full_name)}
              </span>
              <RoleBadge role={profile.role} />
            </div>
          )}
          <FeedbackTrigger className="text-[13px] font-sans px-2 py-1 transition-colors hover:underline underline-offset-4 text-[rgba(247,245,236,0.65)] hover:text-nw-white-sand">
            Feedback
          </FeedbackTrigger>
          <form action={logoutAction}>
            <button type="submit"
              className="text-[13px] font-sans px-2 py-1 transition-colors hover:underline underline-offset-4 text-[rgba(247,245,236,0.65)] hover:text-nw-white-sand">
              Sign Out
            </button>
          </form>
        </div>

        {/* Mobile: sidebar hamburger + Platform Admin badge + notification
            bell + theme toggle + nav menu hamburger.
            Per CONTEXT D-04 (Q5=A): the Platform Admin badge + notifications
            bell + theme toggle stay top-right pinned even on mobile (do NOT
            collapse into the menu hamburger). The menu hamburger expands
            the 8 primary nav items + Admin dropdown contents + User
            menu. */}
        <div className="flex md:hidden items-center gap-1">
          {onToggleSidebar && (
            <button type="button" onClick={onToggleSidebar}
              className="flex items-center justify-center w-10 h-10 text-[rgba(247,245,236,0.65)] hover:text-nw-white-sand transition-colors"
              aria-label="Open job sidebar">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
              </svg>
            </button>
          )}
          <PlatformAdminBadge />
          {profile && <NotificationBell userId={profile.id} />}
          <NavThemeToggle />
          <button type="button" onClick={() => setMobileOpen((p) => !p)}
            className="flex items-center justify-center w-10 h-10 text-[rgba(247,245,236,0.65)] hover:text-nw-white-sand transition-colors relative"
            aria-label="Toggle menu" aria-expanded={mobileOpen}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown — expands ALL 8 primary nav items + Admin
          dropdown contents + User menu (Sign out). Notifications bell +
          Platform Admin badge + theme toggle stay top-right pinned per
          CONTEXT D-04 (Q5=A). */}
      {mobileOpen && (
        <nav className="md:hidden bg-nw-slate-deeper border-b border-[rgba(247,245,236,0.08)] px-2 pb-3 pt-1 flex flex-col gap-0">
          {profile && (
            <div className="flex items-center justify-between py-2 px-4 border-b border-[rgba(247,245,236,0.08)] mb-1">
              <div className="flex items-center gap-[12px]">
                <span className="text-[13px] font-medium text-nw-white-sand">
                  {firstNameOf(profile.full_name)}
                </span>
                <RoleBadge role={profile.role} />
              </div>
            </div>
          )}
          {PRIMARY_NAV.map((item) =>
            show[item.key] ? (
              <Link
                key={item.key}
                href={item.href}
                onClick={closeMobile}
                className={`py-3 px-4 w-full text-[13px] font-medium font-sans transition-colors ${
                  isActive(item.key)
                    ? "text-nw-white-sand"
                    : "text-[rgba(247,245,236,0.65)] hover:text-nw-white-sand"
                }`}
              >
                {item.label}
              </Link>
            ) : null
          )}
          {show.admin && (
            <MobileNavSection
              label="Admin"
              items={ADMIN_ITEMS}
              onItemClick={closeMobile}
              activeHref={adminActiveHref}
              defaultOpen={isAdminActive}
            />
          )}
          <FeedbackTrigger className="w-full text-left py-3 px-4 text-[13px] font-sans transition-colors hover:underline underline-offset-4 text-[rgba(247,245,236,0.65)] hover:text-nw-white-sand">
            Give feedback
          </FeedbackTrigger>
          <form action={logoutAction} className="mt-1">
            <button type="submit" className="w-full text-left py-3 px-4 text-[13px] font-sans transition-colors hover:underline underline-offset-4 text-[rgba(247,245,236,0.65)] hover:text-nw-white-sand">
              Sign Out
            </button>
          </form>
        </nav>
      )}
    </header>
    <TrialBanner />
    </>
  );
}
