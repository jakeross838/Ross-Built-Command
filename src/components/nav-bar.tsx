"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/login/actions";
import { useOrgBranding } from "@/components/org-branding-provider";
import { PUBLIC_APP_NAME } from "@/lib/org/public";
import { fetchMe } from "@/lib/api/me-client";
import TrialBanner from "@/components/trial-banner";
import NotificationBell from "@/components/notification-bell";
import FeedbackTrigger from "@/components/feedback-trigger";
import NewJobButton from "@/components/new-job/NewJobButton";
import { useTheme } from "@/components/theme-provider";
import { MobileNavSection } from "@/components/nav/nav-dropdown";
import AdminDropdown, { ADMIN_ITEMS } from "@/components/nav/admin-dropdown";
import PlatformAdminBadge from "@/components/nav/platform-admin-badge";
import { NwWordmark } from "@/components/branding/Wordmark";
import { NwIcon } from "@/components/branding/Icon";

// Flat-IA rework (2026-07): the 8-section nav collapsed to THREE cross-job
// surfaces — Invoices | Price Intelligence | Draws — plus the owner/admin
// Admin ▾ dropdown (the trimmed settings/users/cost-codes/billing access).
// The jobs sidebar + per-job tab nav are gone (AppShell is now NavBar-only),
// so the sidebar hamburger + onToggleSidebar prop are removed. Invoices is the
// default landing (feature #1); /financials/bills is its canonical URL.

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

// Flat-IA rework: 3 surfaces + Admin dropdown. F2 role expansion is mechanical
// (values become arrays of new role strings; this structure is unchanged).
type NavItemKey = "invoices" | "price_intel" | "draws" | "admin";

const ACCESS: Record<NavItemKey, UserRole[]> = {
  invoices:    ["owner", "admin", "pm", "accounting"],
  price_intel: ["owner", "admin", "pm", "accounting"],
  draws:       ["owner", "admin", "pm", "accounting"],
  admin:       ["owner", "admin"], // dropdown
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

// Flat-IA rework: the three top-level cross-job surfaces. Invoices + Draws are
// the canonical /financials/* URLs (the legacy /invoices + /draws 308-redirect
// there); Price Intelligence re-exports /cost-intelligence.
const PRIMARY_NAV: Array<{ key: NavItemKey; label: string; href: string }> = [
  { key: "invoices",    label: "Invoices",          href: "/financials/bills" },
  { key: "price_intel", label: "Price Intelligence", href: "/price-intel" },
  { key: "draws",       label: "Draws",             href: "/financials/pay-apps" },
];

export default function NavBar() {
  const pathname = usePathname();
  // Role + profile come from the server (/api/me), NOT the client-auth
  // useCurrentRole hook. That hook sits on the client-auth strand path and, when
  // it stalled, dropped the whole nav to logo-only (PART 1 regression). The core
  // surface links render UNCONDITIONALLY below; only role-dependent chrome
  // (Admin ▾, ＋ New Job, badge/name) waits on this reliable server resolve.
  const [profile, setProfile] = useState<Profile | null>(null);
  const role = profile?.role ?? null;
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    // Shared /api/me promise (me-client) — dedupes with useOrgId consumers
    // so a page never pays for two identity round-trips.
    fetchMe()
      .then((d) => {
        if (cancelled || !d || !d.authenticated || !d.role) return;
        setProfile({ id: d.id ?? "", full_name: d.full_name ?? "", role: d.role as UserRole });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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

  // Active-state matchers for the 3 surfaces. Invoices covers the canonical
  // /financials/bills + the legacy /invoices; Draws covers /financials/pay-apps
  // + legacy /draws; Price Intel covers /price-intel + /cost-intelligence.
  function isActive(key: NavItemKey): boolean {
    switch (key) {
      case "invoices":
        return (
          pathname.startsWith("/financials/bills") ||
          pathname.startsWith("/invoices")
        );
      case "draws":
        return (
          pathname.startsWith("/financials/pay-apps") ||
          pathname.startsWith("/draws")
        );
      case "price_intel":
        return (
          pathname.startsWith("/price-intel") ||
          pathname.startsWith("/cost-intelligence") ||
          pathname.startsWith("/items")
        );
      case "admin":
        return pathname.startsWith("/admin") || pathname.startsWith("/settings");
    }
  }

  const isAdminActive = isActive("admin");

  const show = {
    invoices:    can(role, "invoices"),
    price_intel: can(role, "price_intel"),
    draws:       can(role, "draws"),
    admin:       can(role, "admin"),
  };
  const branding = useOrgBranding();
  const brandName = branding?.name ?? PUBLIC_APP_NAME;
  const logoUrl = branding?.logo_url ?? null;

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
          <span className="hidden 360:inline-flex">
            <NwWordmark size={110} color="inverse" />
          </span>
          <span className="inline-flex 360:hidden">
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

        {/* Desktop nav — 3 surfaces (rendered UNCONDITIONALLY: they are links;
            middleware enforces auth) + role-gated Admin dropdown. */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center h-full">
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-1.5 h-full px-[15px] font-mono text-[11px] tracking-[0.12em] uppercase transition-colors border-b-2 -mb-px ${
                isActive(item.key)
                  ? "text-nw-white-sand border-b-nw-stone-blue bg-[rgba(91,134,153,0.12)]"
                  : "text-[rgba(247,245,236,0.65)] hover:text-nw-white-sand border-transparent"
              }`}
            >
              {item.label}
            </Link>
          ))}
          {show.admin && (
            <AdminDropdown active={isAdminActive} activeHref={adminActiveHref} />
          )}
        </nav>

        {/* Desktop: org identity + user + logout */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {(role === "owner" || role === "admin") && <NewJobButton />}
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

        {/* Mobile: Platform Admin badge + notification bell + theme toggle +
            nav menu hamburger. No jobs-sidebar hamburger (flat IA has no sidebar). */}
        <div className="flex md:hidden items-center gap-1">
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

      {/* Mobile dropdown — 3 surfaces + Admin dropdown contents + Sign out. */}
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
          {(role === "owner" || role === "admin") && (
            <div className="px-4 py-2">
              <NewJobButton full />
            </div>
          )}
          {PRIMARY_NAV.map((item) => (
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
          ))}
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
