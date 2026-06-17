# TD-NW-CLIENT-ORG-ID-FILTER-SWEEP — client-side queries relying on RLS only (no explicit org_id)

**Status:** OPEN — **file-don't-fix** (nwrp287(2), $15 cap). FINDINGS ONLY. Defense-in-depth fixes get their own scoped pass AFTER Jake reviews this inventory. Swept 2026-06-17.
**Severity:** MEDIUM (defense-in-depth — RLS is currently intact, so no live leak; the exposure is "a dropped/mis-scoped RLS policy would leak cross-tenant"). Per CLAUDE.md: "RLS alone is a backstop, not a substitute. Filter every query by membership.org_id. A dropped policy must not cause a leak."

## Calibration (important)
The codebase **demonstrably knows the correct pattern** — `getting-started-checklist.tsx` filters `.eq("org_id", orgId)` on every query, and `invoices/page.tsx:201-207` filters its PM-dropdown query with an explicit CLAUDE.md citation. The flagged queries are **inconsistencies, not ignorance** — which is exactly the "dropped policy = leak" exposure the rule guards against. Most flagged surfaces fetch their LIST data through scoped `/api/...` route handlers (server-side, org-scoped); the client-side RLS-only read is usually the **job-header** read. Exposure is real but bounded by intact RLS.

## Finding #0 — JobSidebar (the known seed) — STILL RLS-only
`src/components/job-sidebar.tsx:108-118` (`loadJobs`): `.from("jobs").select(...).is("deleted_at", null).order("name")` (+ optional `.eq("pm_id", userId)`) — **no `.eq("org_id", ...)`**. `jobs` is tenant-scoped (org_id + RLS, migration 00016). Mounts on **every authenticated page** via the app shell → maximum reach. The sibling `org_members` query (`:86-93`) is correctly user-scoped (own-membership bootstrap) — NOT a finding.

## TIER-1 — always-mounted / per-job-tab (highest reach)
| Surface | File:line | Table(s) client-side, org_id-unscoped | Risk if RLS dropped |
|---|---|---|---|
| JobFinancialBar (every per-job tab) | `src/components/job-financial-bar.tsx:43-50, 51-56` | `jobs`, `invoices` (by id/job_id) | contract amounts + billed totals for a crafted job_id |
| JobOverviewCards (overview tab) | `src/components/job-overview-cards.tsx:102,108,115,122,129,140,148,163,218` | `budget_lines, invoices, purchase_orders, change_orders, lien_releases, activity_log, profiles` | cross-tenant budget/AP/activity for a guessed job_id |
| BudgetDrillDown (budget views) | `src/components/budget-drill-down.tsx:124,167,175,238,343,387,408` | `budget_lines, purchase_orders, po_line_items, invoice_line_items, change_order_lines, activity_log, profiles` | line-item-level cost detail cross-tenant |
| Job Draws tab | `src/app/jobs/[id]/draws/page.tsx:49-52, 54-60` | `jobs`, `draws` | G702 current-payment-due cross-tenant |
| Financials Bills/Invoices list (`/financials/bills`) | `src/app/invoices/page.tsx:178-194, 215-219` | `invoices` (up to 500, deleted_at only), `invoice_line_items` | org-wide invoice list — same file DOES scope its org_members query, so this is a clear miss |
| Job Invoices tab | `src/app/jobs/[id]/invoices/page.tsx:50-53, 57-80` | `jobs`, `invoices` | per-job AP cross-tenant |
| Job Change Orders tab (header) | `src/app/jobs/[id]/change-orders/page.tsx:78-83` | `jobs` (CO list itself via scoped /api) | job header leak |
| Job Purchase Orders tab (header) | `src/app/jobs/[id]/purchase-orders/page.tsx:75-81` | `jobs` (PO list via scoped /api) | job header leak |
| Job Internal Billings tab (header) | `src/app/jobs/[id]/internal-billings/page.tsx:180-185` | `jobs` (list via scoped /api) | job header leak |
| Job Lien Releases tab (header) | `src/app/jobs/[id]/lien-releases/page.tsx:68` | `jobs` (list via scoped /api) | job header leak |
| Job overview budget count (post-import) | `src/app/jobs/[id]/page.tsx:155-159` | `budget_lines` (count only) | low — count only |

## TIER-2 — list / detail
| Surface | File:line | Table(s) | Risk |
|---|---|---|---|
| Vendors list | `src/app/vendors/page.tsx:60-64, 65` | `vendors` (org-wide), `invoices` (vendor_id) | cross-tenant vendor list + spend roll-up |
| Vendor detail | `src/app/vendors/[id]/page.tsx:56-61, 97-106, 127-131` | `vendors`, `invoices`, `cost_codes` | vendor + AP detail cross-tenant |

## Not-a-finding (coverage evidence — checked OK)
- Per-job tabs that are SERVER components correctly scope org_id: `budget`, `bills`, `pay-apps`, `activity` under `jobs/[id]/`, and `financials/bills/[id]` detail.
- `getting-started-checklist.tsx` — canonical correct pattern (every query org_id-scoped).
- Own-identity bootstrap (user-scoped, not tenant-leakable): `org_members.eq("user_id")`, `profiles.eq("id", user.id)`, `notifications.eq("user_id")`, `organizations.eq("id", member.org_id)` across nav-bar, job-sidebar, trial-banner, etc.
- `connection-banner.tsx:43-45` — `cost_codes` head-count health probe (no data rows); negligible.

## Coverage / gaps
Scanned: JobSidebar seed; all 8 per-job tabs + overview; the always-mounted nav stack; high-reach per-job components; Financials bills/pay-apps list + detail; jobs + vendors. Schema confirmed (org_id + RLS, 00016). **NOT deeply scanned (budget):** TIER-3 (`admin/**`, `settings/**`, price-intel, design-system). `platform-admin/**` excluded (intentionally cross-tenant by design). Server route handlers behind the `/api` list paths not separately audited (instruction prioritized client-side, where exposure concentrates).

## Recommended fix shape (NOT applied — for the future scoped pass)
Add `.eq("org_id", membership.org_id)` to each flagged client query (resolve membership the way `getting-started-checklist.tsx` does). Highest-leverage first: **#0 JobSidebar + JobFinancialBar + JobOverviewCards + BudgetDrillDown** (always-mounted / highest reach), then the per-job header reads, then TIER-2. Consider a shared `useOrgScopedQuery` helper so the scoping can't be forgotten.
