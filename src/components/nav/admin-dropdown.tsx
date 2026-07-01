"use client";

// src/components/nav/admin-dropdown.tsx
//
// Per CONTEXT D-22 (Decision D / D-060): Admin dropdown is a power-user
// shortcut; /admin section overview Card grid (Plan 6) is the canonical
// destination. Both surfaces exist with clear precedence — clicking the
// "Admin" label routes to /admin overview; clicking the dropdown items
// is the shortcut path.
//
// NavDropdown's existing contract (src/components/nav/nav-dropdown.tsx)
// renders a <button> for the label that opens the dropdown on click /
// hover. It does NOT support label-as-link semantics directly. To honor
// D-22 dual-surface posture, the AdminDropdown's first menu item is
// "Org Settings" → /admin (the canonical destination), so the user can
// reach the section overview from inside the dropdown without a separate
// label-link. This matches the typical "first item = overview" pattern
// for nav dropdowns; the visual distinction (label opens dropdown vs
// label clicks through) is deferred to F2 if needed.
//
// Plan 7 documents this precedence in CLAUDE.md atomic update.

import NavDropdown, { type NavDropdownItem } from "@/components/nav/nav-dropdown";

// Gate-2 strip (2026-07): trimmed to the 4 live surfaces the three kept features
// need. The 9 F2/F3/Wave-3 placeholder items (Roles, Permissions, Org Chart,
// Approval Workflows, Notification Rules, Templates, Integrations, Workflow
// Customization, Profile) are removed from the dropdown — they are inert
// placeholder cards and out of the stripped product. Un-hide = re-add entries.
const ADMIN_ITEMS: NavDropdownItem[] = [
  { href: "/admin", label: "Org Settings" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/cost-codes", label: "Cost Codes" },
  { href: "/admin/billing", label: "Billing" },
];

export default function AdminDropdown({
  active,
  activeHref,
}: {
  active: boolean;
  activeHref?: string;
}) {
  return (
    <NavDropdown label="Admin" items={ADMIN_ITEMS} active={active} activeHref={activeHref} />
  );
}

// Re-export the item list so callers (e.g., mobile hamburger) can render
// the same 13 items in a different surface without duplicating the list.
export { ADMIN_ITEMS };
