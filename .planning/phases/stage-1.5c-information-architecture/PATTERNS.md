# Phase 1.5c: information-architecture — Pattern Map

**Mapped:** 2026-05-04
**Files analyzed:** ~95 files (60-90 placeholder routes + 8-item nav restructure + 11 thin-wrapper extractions + 4 NEW canonical docs + 5 UPDATED docs + 32 redirects + Today scaffold + per-job sub-nav + Admin section restructure + Sub Portal stubs)
**Analogs found:** ~93 / ~95 (2 files have no direct analog — ARCHITECTURE.md and INGESTION-ARCHITECTURE.md are new canonical doc shapes; partial precedents in other architecture/*.md)

---

## File Classification

### Wave 1 — Top nav + Today scaffold + redirects

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/nav-bar.tsx` (MODIFY) | client component | render-only | self (current 4-item ACCESS map at lines 55-67 + buildOperationsItems / buildCostIntelItems / buildAdminItems builders at lines 95-149) | exact (in-place refactor) |
| `src/components/nav/nav-dropdown.tsx` (KEEP) | client component | render-only | self — already supports hybrid hover+click + keyboard navigation; reused verbatim by 8-item nav | exact (no change) |
| `src/components/nav/admin-dropdown.tsx` (NEW — Admin ▾ dedicated component) | client component | render-only | `src/components/nav/nav-dropdown.tsx` (NavDropdown shape) | exact (instantiation w/ 13 admin items) |
| `src/components/nav/platform-admin-badge.tsx` (NEW) | client component | render-only | `nav-bar.tsx:170-176` (existing platform_admins query) + `RoleBadge` at lines 76-89 | role-match (badge shape + query reuse) |
| `src/app/today/page.tsx` (NEW) | page | render-only | `src/app/dashboard/page.tsx` (current dashboard — extract Attention + Activity sections; leave Cash Flow + Getting Started behind) | exact (component subset migration) |
| `src/app/today/layout.tsx` (NEW) | layout | render-only | `src/app/dashboard/page.tsx` chrome + `src/app/layout.tsx` (root layout) | role-match |
| `src/app/page.tsx` (MODIFY) | page | render-only / redirect | self — already redirects `/` to `/dashboard`. Change to `/today`. | exact (in-place edit) |
| `src/app/company/overview/page.tsx` (NEW) | page | render-only | `src/app/dashboard/page.tsx` (extract Cash Flow + Getting Started cards) | exact (component subset migration) |
| `next.config.mjs` (MODIFY) | config | redirect rules | self — existing `redirects()` async at lines 14-35 with 12 existing rules; extend with 32 new legacy-path entries | exact (in-place extension) |

### Wave 2 — Thin-wrapper extraction architecture + Bills/Pay Apps rename

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/prototypes/InvoiceReviewView.tsx` (NEW — extracted) | component | props-only render | `src/app/design-system/prototypes/invoices/[id]/page.tsx` (Wave 0 1.5b — currently imports CALDWELL_INVOICES directly; refactor to accept `invoice: CaldwellInvoice` + `vendor` + `job` + `costCode` props) | exact (refactor in place) |
| `src/components/prototypes/DrawApprovalView.tsx` (NEW — extracted) | component | props-only render | `src/app/design-system/prototypes/draws/[id]/page.tsx` | exact (refactor) |
| `src/components/prototypes/DrawPrintView.tsx` (NEW — extracted) | component | props-only render | `src/app/design-system/prototypes/draws/[id]/print/page.tsx` | exact (refactor) |
| `src/components/prototypes/BudgetView.tsx` (NEW — extracted) | component | props-only render | `src/app/design-system/prototypes/jobs/[id]/budget/page.tsx` | exact (refactor) |
| `src/components/prototypes/ScheduleView.tsx` (NEW — extracted) | component | props-only render | `src/app/design-system/prototypes/jobs/[id]/schedule/page.tsx` | exact (refactor) |
| `src/components/prototypes/VendorListView.tsx` (NEW — extracted) | component | props-only render | `src/app/design-system/prototypes/vendors/page.tsx` | exact (refactor) |
| `src/components/prototypes/VendorDetailView.tsx` (NEW — extracted) | component | props-only render | `src/app/design-system/prototypes/vendors/[id]/page.tsx` | exact (refactor) |
| `src/components/prototypes/DocumentReviewView.tsx` (NEW — extracted) | component | props-only render | `src/app/design-system/prototypes/documents/[id]/page.tsx` | exact (refactor) |
| `src/components/prototypes/OwnerDashboardView.tsx` (NEW — extracted) | component | props-only render | `src/app/design-system/prototypes/owner-portal/page.tsx` | exact (refactor) |
| `src/components/prototypes/OwnerDrawView.tsx` (NEW — extracted) | component | props-only render | `src/app/design-system/prototypes/owner-portal/draws/[id]/page.tsx` | exact (refactor) |
| `src/components/prototypes/MobileApprovalView.tsx` (NEW — extracted) | component | props-only render | `src/app/design-system/prototypes/mobile-approval/page.tsx` | exact (refactor) |
| `src/components/prototypes/ReconciliationView.tsx` (NEW — extracted) | component | props-only render | `src/app/design-system/prototypes/reconciliation/page.tsx` | exact (refactor) |

### Wave 2 cont. — Production routes mounting extracted components

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/app/financials/bills/[id]/page.tsx` (NEW) | page | render-only | `src/app/design-system/prototypes/invoices/[id]/page.tsx` (current — replace fixture import w/ prop call to InvoiceReviewView) | exact (thin wrapper) |
| `src/app/financials/pay-apps/[id]/page.tsx` (NEW) | page | render-only | `src/app/design-system/prototypes/draws/[id]/page.tsx` | exact (thin wrapper) |
| `src/app/financials/pay-apps/[id]/print/page.tsx` (NEW) | page | render-only | `src/app/design-system/prototypes/draws/[id]/print/page.tsx` | exact (thin wrapper) |
| `src/app/financials/reconciliation/page.tsx` (NEW) | page | render-only | `src/app/design-system/prototypes/reconciliation/page.tsx` | exact (thin wrapper) |
| `src/app/jobs/[id]/budget/page.tsx` (REPLACE existing) | page | render-only | `src/app/design-system/prototypes/jobs/[id]/budget/page.tsx` (mount BudgetView) — replaces existing `/jobs/[id]/budget` if present, or augments with prototype data path | exact (thin wrapper) |
| `src/app/jobs/[id]/schedule/page.tsx` (NEW) | page | render-only | `src/app/design-system/prototypes/jobs/[id]/schedule/page.tsx` | exact (thin wrapper) |
| `src/app/people/vendors/page.tsx` (NEW) | page | render-only | `src/app/design-system/prototypes/vendors/page.tsx` | exact (thin wrapper) |
| `src/app/people/vendors/[id]/page.tsx` (NEW) | page | render-only | `src/app/design-system/prototypes/vendors/[id]/page.tsx` | exact (thin wrapper) |
| `src/app/jobs/[id]/documents/[documentId]/page.tsx` (NEW) | page | render-only | `src/app/design-system/prototypes/documents/[id]/page.tsx` | exact (thin wrapper) |
| `src/app/owner-portal/page.tsx` (NEW) | page | render-only | `src/app/design-system/prototypes/owner-portal/page.tsx` | exact (thin wrapper) |
| `src/app/owner-portal/pay-apps/[id]/page.tsx` (NEW) | page | render-only | `src/app/design-system/prototypes/owner-portal/draws/[id]/page.tsx` | exact (thin wrapper) |
| `src/app/jobs/[id]/mobile-approval/page.tsx` (NEW) | page | render-only | `src/app/design-system/prototypes/mobile-approval/page.tsx` | exact (thin wrapper) |
| `src/app/design-system/prototypes/invoices/[id]/page.tsx` (REWRITE) | page | render-only | self — but become a thin wrapper passing CALDWELL_INVOICES + CALDWELL_VENDORS + ... to InvoiceReviewView (instead of inlining the rendering logic) | exact (refactor in place; keeps portfolio path live under platform_admin gate) |
| `src/app/design-system/prototypes/draws/[id]/page.tsx` (REWRITE) | page | render-only | same shape | exact |
| `src/app/design-system/prototypes/draws/[id]/print/page.tsx` (REWRITE) | page | render-only | same shape | exact |
| `src/app/design-system/prototypes/jobs/[id]/budget/page.tsx` (REWRITE) | page | render-only | same shape | exact |
| `src/app/design-system/prototypes/jobs/[id]/schedule/page.tsx` (REWRITE) | page | render-only | same shape | exact |
| `src/app/design-system/prototypes/vendors/page.tsx` (REWRITE) | page | render-only | same shape | exact |
| `src/app/design-system/prototypes/vendors/[id]/page.tsx` (REWRITE) | page | render-only | same shape | exact |
| `src/app/design-system/prototypes/documents/[id]/page.tsx` (REWRITE) | page | render-only | same shape | exact |
| `src/app/design-system/prototypes/owner-portal/page.tsx` (REWRITE) | page | render-only | same shape | exact |
| `src/app/design-system/prototypes/owner-portal/draws/[id]/page.tsx` (REWRITE) | page | render-only | same shape | exact |
| `src/app/design-system/prototypes/mobile-approval/page.tsx` (REWRITE) | page | render-only | same shape | exact |
| `src/app/design-system/prototypes/reconciliation/page.tsx` (REWRITE) | page | render-only | same shape | exact |

### Wave 3 — Section placeholders + Sub Portal stubs + Per-job sub-nav + Admin restructure

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/nw/PlaceholderCard.tsx` (NEW) | component | render-only | `src/app/design-system/prototypes/page.tsx` 10-Card index pattern (per CONTEXT D-13 — eyebrow + headline + body + Wave badge) | role-match (extract reusable) |
| `src/app/pipeline/page.tsx` (NEW — section overview) | page | render-only | PlaceholderCard pattern | exact |
| `src/app/pipeline/leads/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern | exact |
| `src/app/pipeline/estimates/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern | exact |
| `src/app/pipeline/bids-out/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern | exact |
| `src/app/pipeline/proposals/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern | exact |
| `src/app/pipeline/contracts/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern | exact |
| `src/app/financials/page.tsx` (MODIFY existing) | page | render-only | self — current `src/app/financials/page.tsx`; restructure to be a Bills/Pay Apps/POs/Lien Releases/Change Orders/Payments/Aging overview with Card grid | role-match (in-place restructure) |
| `src/app/financials/bills/page.tsx` (NEW) | page | render-only | `src/app/invoices/page.tsx` (existing — references / labels rename) | role-match (rename + label flip) |
| `src/app/financials/bills/queue/page.tsx` (NEW) | page | render-only | `src/app/invoices/queue/page.tsx` (existing) | role-match (rename + label flip) |
| `src/app/financials/bills/qa/page.tsx` (NEW) | page | render-only | `src/app/invoices/qa/page.tsx` (existing) | role-match (rename + label flip) |
| `src/app/financials/payments/page.tsx` (NEW) | page | render-only | `src/app/invoices/payments/page.tsx` (existing) | role-match (rename) |
| `src/app/financials/lien-releases/page.tsx` (NEW) | page | render-only | `src/app/invoices/liens/page.tsx` (existing) | role-match (rename) |
| `src/app/financials/pay-apps/page.tsx` (NEW) | page | render-only | `src/app/draws/page.tsx` (existing — list of draws for owner) | role-match (rename + label flip) |
| `src/app/financials/purchase-orders/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (job-scoped POs already exist; this is the org-wide stub) | exact (placeholder) |
| `src/app/financials/change-orders/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (job-scoped COs exist; org-wide stub) | exact (placeholder) |
| `src/app/financials/aging/page.tsx` (NEW) | page | render-only | `src/app/financials/aging-report/page.tsx` (existing — rename) | role-match (rename) |
| `src/app/price-intel/page.tsx` (NEW) | page | render-only | `src/app/cost-intelligence/page.tsx` (existing) | role-match (rename + section overview) |
| `src/app/price-intel/cost-lookup/page.tsx` (NEW) | page | render-only | `src/app/cost-intelligence/lookup/page.tsx` (existing) | role-match (rename) |
| `src/app/price-intel/selections-catalog/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (Wave 4 / F5) | exact (placeholder) |
| `src/app/price-intel/material-orders/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (Wave 4 / F5) | exact (placeholder) |
| `src/app/price-intel/bid-comparison/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (Wave 4 / F5) | exact (placeholder) |
| `src/app/price-intel/anomaly-review/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (F5) | exact (placeholder) |
| `src/app/price-intel/vendor-performance/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (F5) | exact (placeholder) |
| `src/app/price-intel/verification/page.tsx` (NEW) | page | render-only | `src/app/cost-intelligence/verification/page.tsx` (existing) | role-match (rename) |
| `src/app/price-intel/cost-database/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (F5) | exact (placeholder) |
| `src/app/people/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern + section overview | role-match |
| `src/app/people/clients/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (F1 entity) | exact (placeholder) |
| `src/app/people/team/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (F2 entity) | exact (placeholder) |
| `src/app/people/org-chart/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (F2) | exact (placeholder) |
| `src/app/sub-portal/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern w/ Wave F3 + Coming F3 — Subcontractor self-service portal copy | exact (placeholder) |
| `src/app/sub-portal/magic/[token]/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern w/ Wave F3 + magic link copy | exact (placeholder) |
| `src/app/sub-portal/public/[token]/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern w/ Wave F3 + public read-only link copy | exact (placeholder) |
| `src/app/company/page.tsx` (NEW — section overview) | page | render-only | PlaceholderCard pattern + Card grid linking to overview / p&l / cash-flow / etc. | role-match |
| `src/app/company/p-l/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (F4 / Wave 4) | exact (placeholder) |
| `src/app/company/cash-flow/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (F4) | exact (placeholder) |
| `src/app/company/expenses/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (F4) | exact (placeholder) |
| `src/app/company/time-tracking/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (F4) | exact (placeholder) |
| `src/app/company/compliance/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (Wave 2/3) | exact (placeholder) |
| `src/app/company/fleet-equipment/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (F4) | exact (placeholder) |
| `src/app/company/insurance/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (Wave 2) | exact (placeholder) |
| `src/app/company/permits-licensing/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (Wave 2/3) | exact (placeholder) |
| `src/app/company/tax/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (Wave 4) | exact (placeholder) |
| `src/app/company/capacity-planning/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (Wave 3+) | exact (placeholder) |
| `src/app/company/documents/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (Wave 2) | exact (placeholder) |
| `src/app/reports/page.tsx` (NEW — section overview) | page | render-only | PlaceholderCard pattern w/ Wave 3 / "AI Report Builder coming Wave 3" copy | exact (placeholder) |
| `src/app/reports/saved/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (Wave 3) | exact (placeholder) |
| `src/app/reports/ai-builder/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (Wave 3) | exact (placeholder) |
| `src/app/reports/custom-builder/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (Wave 3) | exact (placeholder) |
| `src/app/reports/scheduled/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (Wave 3) | exact (placeholder) |
| `src/app/reports/templates/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (Wave 3) | exact (placeholder) |
| `src/app/jobs/[id]/layout.tsx` (NEW or MODIFY) | layout | render-only | `src/app/design-system/prototypes/page.tsx` Card grid + sub-nav patterns | role-match (per-job sub-nav scaffold) |
| `src/components/nav/per-job-tabs.tsx` (NEW) | client component | render-only | `src/components/nav/nav-dropdown.tsx` (More ▾ dropdown structure) + existing `src/components/nav-bar.tsx` tab patterns | role-match (sub-nav tab bar w/ More ▾) |
| `src/app/jobs/[id]/selections/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (Wave 4 / F5) | exact (placeholder) |
| `src/app/jobs/[id]/plans/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (Wave 2) | exact (placeholder) |
| `src/app/jobs/[id]/specs/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (Wave 2) | exact (placeholder) |
| `src/app/jobs/[id]/photos/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (Wave 2) | exact (placeholder) |
| `src/app/jobs/[id]/documents/page.tsx` (NEW — index) | page | render-only | PlaceholderCard pattern (Wave 2; per-document is real-route from Wave 2 above) | role-match |
| `src/app/jobs/[id]/rfis/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (Wave 2/3 / F3) | exact (placeholder) |
| `src/app/jobs/[id]/submittals/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (Wave 2/3) | exact (placeholder) |
| `src/app/jobs/[id]/change-orders/page.tsx` (KEEP existing — list) | page | render-only | self — current `src/app/jobs/[id]/change-orders` exists; verify still mounted | exact (no change) |
| `src/app/jobs/[id]/daily-logs/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (Wave 2) | exact (placeholder) |
| `src/app/jobs/[id]/to-dos/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (Wave 2) | exact (placeholder) |
| `src/app/jobs/[id]/punchlist/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (Wave 2 — Principle 5 voice/video example) | exact (placeholder) |
| `src/app/jobs/[id]/time-entries/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (F4) | exact (placeholder) |
| `src/app/jobs/[id]/permits/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (Wave 2/3) | exact (placeholder) |
| `src/app/jobs/[id]/team/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (F2) | exact (placeholder) |
| `src/app/jobs/[id]/activity/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (Wave 3) | exact (placeholder) |
| `src/app/jobs/[id]/closeout/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (phase-aware Wave 2; closeout phase) | exact (placeholder) |
| `src/app/jobs/[id]/warranty/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (phase-aware Wave 4) | exact (placeholder) |
| `src/app/jobs/[id]/pre-con/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (phase-aware Wave 4) | exact (placeholder) |
| `src/app/admin/page.tsx` (NEW — settings overview) | page | render-only | `src/app/settings/page.tsx` (existing) | role-match (rename) |
| `src/app/admin/users/page.tsx` (NEW) | page | render-only | `src/app/settings/team/page.tsx` (existing) | role-match (rename) |
| `src/app/admin/roles/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern w/ "15 default roles will live here, customizable per org — coming F2" copy | exact (placeholder) |
| `src/app/admin/permissions/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (F2) | exact (placeholder) |
| `src/app/admin/org-chart/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (F2) | exact (placeholder) |
| `src/app/admin/approval-workflows/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (F3) | exact (placeholder) |
| `src/app/admin/notification-rules/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (F3) | exact (placeholder) |
| `src/app/admin/cost-codes/page.tsx` (NEW) | page | render-only | `src/app/settings/cost-codes/page.tsx` (existing) | role-match (rename) |
| `src/app/admin/templates/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (Wave 3) | exact (placeholder) |
| `src/app/admin/integrations/page.tsx` (NEW) | page | render-only | `src/app/settings/integrations/page.tsx` (existing) | role-match (rename) |
| `src/app/admin/billing/page.tsx` (NEW) | page | render-only | `src/app/settings/billing/page.tsx` (existing) | role-match (rename) |
| `src/app/admin/workflow-customization/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern (F3) | exact (placeholder) |
| `src/app/admin/profile/page.tsx` (NEW) | page | render-only | PlaceholderCard pattern w/ "Custom Builder / Remodeler / Commercial GC — coming F2" stubbed selector copy | exact (placeholder) |
| `src/app/platform-admin/page.tsx` (NEW) | page | render-only | `src/app/admin/platform/page.tsx` (existing) — placeholder w/ existing admin/platform tools listed as Wave 1.1-Lite migration target | role-match (rename + placeholder) |

### Wave 4 — Canonical documentation atomic update + final smoke

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `.planning/architecture/ARCHITECTURE.md` (NEW) | doc | reference | `.planning/architecture/CURRENT-STATE.md` + `TARGET.md` + `VISION.md` (existing — same dir + tone) | role-match (NEW canonical anchor) |
| `.planning/architecture/ENTITY-INVENTORY.md` (NEW) | doc | reference | `.planning/architecture/CURRENT-STATE.md` (table-of-entities sections; partial precedent) | partial (catalog table format) |
| `.planning/architecture/ROLES-CATALOG.md` (NEW) | doc | reference | `.planning/architecture/CURRENT-STATE.md` (role mentions; partial precedent) | partial (catalog table format) |
| `.planning/architecture/INGESTION-ARCHITECTURE.md` (NEW) | doc | reference | NEW shape — no direct precedent in `.planning/architecture/`; partial precedent in nwrp43 Principle 5 narrative | none (new shape) |
| `.planning/CONTEXT.md` (MODIFY) | doc | reference | self | exact (in-place edit — add 8 principles) |
| `.planning/MASTER-PLAN.md` (MODIFY) | doc | reference | self — D-039 last; add D-040..D-056 | exact (atomic decision append + roadmap rewrite) |
| `CLAUDE.md` (MODIFY) | doc | reference | self — Data Model section + invoice/draw references | exact (in-place rename — Bills/Pay Apps terminology) |
| `.planning/design/PHILOSOPHY.md` (MODIFY) | doc | reference | self — add Today as home, role-aware filtering, multi-modal ingestion patterns | exact (in-place append) |
| `.planning/design/PATTERNS.md` (MODIFY) | doc | reference | self — add placeholder treatment, role-filtered nav, phase-aware sub-nav patterns | exact (in-place append) |

---

## Pattern Assignments

### Top nav restructure (`src/components/nav-bar.tsx`)

**Current shape (`src/components/nav-bar.tsx:55-67`):**
```typescript
type NavItemKey = "dashboard" | "financial" | "operations" | "cost_intelligence" | "admin";

const ACCESS: Record<NavItemKey, UserRole[]> = {
  dashboard: ["owner", "admin", "pm", "accounting"],
  financial: ["owner", "admin", "pm", "accounting"],
  operations: ["owner", "admin", "pm"],
  cost_intelligence: ["owner", "admin", "pm", "accounting"],
  admin: ["owner", "admin"],
};
```

**Target shape (per CONTEXT D-04 + D-11):**
```typescript
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

// Data-driven for F2 swap to 15 roles. Same shape preserved.
const ACCESS: Record<NavItemKey, UserRole[]> = {
  today:        ["owner", "admin", "pm", "accounting"],
  pipeline:     ["owner", "admin", "pm"],
  jobs:         ["owner", "admin", "pm", "accounting"],
  financials:   ["owner", "admin", "pm", "accounting"],
  price_intel:  ["owner", "admin", "pm", "accounting"],
  people:       ["owner", "admin", "pm", "accounting"],
  company:      ["owner", "admin", "accounting"],
  reports:      ["owner", "admin", "pm", "accounting"],
  admin:        ["owner", "admin"],
};
```

**Per F2 (1.5c does NOT extend ACCESS rows; F2 swaps in 15 roles):** structure as `Record<NavItemKey, Set<RoleKey>>` so adding 11 new roles is a value-only change.

### PlaceholderCard component (`src/components/nw/PlaceholderCard.tsx`)

**Analog:** the existing 10-Card grid in `src/app/design-system/prototypes/page.tsx:1248-1326` — eyebrow + headline + body + monospace footer (goal). The 1.5c variant uses Wave badge instead of "goal":

**Pattern:**
```typescript
import Card from "@/components/nw/Card";
import Eyebrow from "@/components/nw/Eyebrow";
import Badge from "@/components/nw/Badge";

interface PlaceholderCardProps {
  eyebrow: string;        // Section name UPPERCASE (rendered by Site Office Eyebrow)
  headline: string;       // Feature name (Space Grotesk Medium)
  body: string;           // 2-3 sentence description
  wave: "F1" | "F2" | "F3" | "F4" | "F5" | "F6" | "Wave 1.1-Lite" | "Wave 2" | "Wave 3" | "Wave 4";
}

export default function PlaceholderCard({ eyebrow, headline, body, wave }: PlaceholderCardProps) {
  return (
    <Card padding="md">
      <Eyebrow tone="muted" className="mb-2">{eyebrow}</Eyebrow>
      <h1
        className="text-[24px] mb-2"
        style={{
          fontFamily: "var(--font-space-grotesk)",
          fontWeight: 500,
          color: "var(--text-primary)",
        }}
      >
        {headline}
      </h1>
      <p className="text-[14px] mb-3" style={{ color: "var(--text-secondary)" }}>
        {body}
      </p>
      <Badge variant="neutral">Coming {wave}</Badge>
    </Card>
  );
}
```

**Per CONTEXT D-13:** every per-job tab placeholder + every section placeholder uses this. ~30 LOC each. Token discipline (no hex literals — only CSS vars). T10c clean (no @/lib/supabase imports).

### Thin-wrapper extraction architecture (`src/components/prototypes/*View.tsx`)

**Per CONTEXT D-03:** prototype components currently import fixtures directly. Extraction = move rendering into a pure props-only component that BOTH `/design-system/prototypes/*` (with Caldwell fixture) AND `/financials/bills/[id]` (also with Caldwell fixture in 1.5c, real data in F1) re-import.

**Pattern (using InvoiceReviewView as exemplar):**

```typescript
// src/components/prototypes/InvoiceReviewView.tsx
//
// Tenant-blind extracted view. Accepts ALL data via props (no fixture imports).
// Both /financials/bills/[id] (production) and /design-system/prototypes/invoices/[id]
// (portfolio) mount this with the same data shape.
//
// Per CONTEXT D-03 — refactored from `src/app/design-system/prototypes/invoices/[id]/page.tsx`
// for T10c-clean separation. Hook nightwork-post-edit.sh:194-230 (T10c) BLOCKS production
// routes from importing _fixtures/drummond directly. Hence prop-drilled refactor.

import type {
  CaldwellInvoice,
  CaldwellInvoiceConfidenceDetails,
  CaldwellInvoiceStatus,
} from "@/app/design-system/_fixtures/drummond/types";
import Card from "@/components/nw/Card";
import Eyebrow from "@/components/nw/Eyebrow";
import Money from "@/components/nw/Money";
import DataRow from "@/components/nw/DataRow";
import Badge from "@/components/nw/Badge";
import NwButton from "@/components/nw/Button";  // TD-20 fix: was raw <button>
// ... (rest of original component, but data via props)

export interface InvoiceReviewViewProps {
  invoice: CaldwellInvoice;
  vendor: { id: string; name: string };
  job: { id: string; name: string };
  costCode: { id: string; code: string; description: string } | null;
}

export default function InvoiceReviewView(props: InvoiceReviewViewProps) {
  // ... all current rendering logic, but reads props instead of running fixture
  // .find() lookups internally
}
```

**Wrapper at `/financials/bills/[id]/page.tsx`:**

```typescript
import { notFound } from "next/navigation";
import {
  CALDWELL_INVOICES,
  CALDWELL_VENDORS,
  CALDWELL_JOBS,
  CALDWELL_COST_CODES,
} from "@/app/design-system/_fixtures/drummond";
import InvoiceReviewView from "@/components/prototypes/InvoiceReviewView";

export default function BillPage({ params }: { params: { id: string } }) {
  const inv = CALDWELL_INVOICES.find((i) => i.id === params.id);
  if (!inv) return notFound();
  const vendor = CALDWELL_VENDORS.find((v) => v.id === inv.vendor_id) ?? null;
  const job = CALDWELL_JOBS.find((j) => j.id === inv.job_id) ?? null;
  const costCode = inv.cost_code_id ? CALDWELL_COST_CODES.find((c) => c.id === inv.cost_code_id) : null;
  if (!vendor || !job) return notFound();
  return <InvoiceReviewView invoice={inv} vendor={vendor} job={job} costCode={costCode} />;
}
```

**T10c posture clarification:** The hook `.claude/hooks/nightwork-post-edit.sh:194-230` blocks `/lib/(supabase|org|auth)` imports from anywhere under `src/app/design-system/*`. Production routes (e.g., `src/app/financials/bills/[id]/page.tsx`) are OUTSIDE `/design-system/*` and CAN import fixtures directly per current hook semantics. **However**, the same hook isolates fixture imports from production code paths only when the post-edit-hook FORBIDDEN regex catches `/_fixtures/` imports outside `/design-system/`. **VERIFY at execute-time:** is the existing hook semantics block-on-import-from-`/design-system/_fixtures/` outside `/design-system/*`, or is the hook only forbidding `@/lib/(supabase|org|auth)` from inside `/design-system/*`? If the former, production wrappers would also need the extracted-view pattern (the View component doesn't import fixtures; the wrapper does, but the wrapper IS in production tree). If the latter, the wrapper-fixture-import is fine. The plan's Plan 2 architecture review settles this with a hook-edit if necessary.

### Audit-log action string strategy (Bills/Pay Apps rename)

**Per CONTEXT R2 + Plan 2 architect decision:**

- Historical `audit_log` rows with `invoice_*` action strings stay AS-IS (no migration).
- New writes (post-1.5c) use `bill_*` action strings.
- UI labels read both strings as the same surface (e.g., "BILL UPDATED" UI for both `invoice_updated` and `bill_updated` action_log entries).
- Document rationale in `.planning/architecture/ARCHITECTURE.md` plus a CLAUDE.md note: "Bills = vendor invoices. Action strings post-1.5c = bill_*; historical = invoice_*; UI surfaces both as 'Bills' uniformly."

### Per-job sub-nav scaffold (`src/app/jobs/[id]/layout.tsx` + `src/components/nav/per-job-tabs.tsx`)

**Per CONTEXT D-12:**
- Primary tabs (always visible): Overview | Schedule | Budget | Selections | Bills | Pay Apps | More ▾
- More ▾ dropdown: Documentation (Plans/Specs/Photos/Documents), Coordination (RFIs/Submittals/Change Orders/Daily Logs), Tasks (To-Dos/Punchlist), Time, Permits, People, Activity, Closeout (phase-aware — show), Warranty (phase-aware — hide), Pre-Con (phase-aware — hide post-contract).
- Phase-aware logic: SKELETON only in 1.5c. Hardcoded `phase: "active"` in layout. F2 wires actual `jobs.phase`.
- Role-aware logic: SKELETON only in 1.5c. Same role visibility for all tabs in 1.5c. F2 wires.

**Pattern:**

```typescript
// src/app/jobs/[id]/layout.tsx
import PerJobTabs from "@/components/nav/per-job-tabs";

export default function JobLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  // 1.5c: hardcoded phase. F2 reads from jobs.phase column.
  const phase: "active" | "closeout" | "warranty" | "pre_con" = "active";
  return (
    <div>
      <PerJobTabs jobId={params.id} phase={phase} />
      {children}
    </div>
  );
}
```

```typescript
// src/components/nav/per-job-tabs.tsx
"use client";
import NavDropdown, { type NavDropdownItem } from "@/components/nav/nav-dropdown";

const PRIMARY_TABS = [
  { key: "overview",    label: "Overview",    href: (id: string) => `/jobs/${id}` },
  { key: "schedule",    label: "Schedule",    href: (id: string) => `/jobs/${id}/schedule` },
  { key: "budget",      label: "Budget",      href: (id: string) => `/jobs/${id}/budget` },
  { key: "selections",  label: "Selections",  href: (id: string) => `/jobs/${id}/selections` },
  { key: "bills",       label: "Bills",       href: (id: string) => `/jobs/${id}/bills` },
  { key: "pay_apps",    label: "Pay Apps",    href: (id: string) => `/jobs/${id}/pay-apps` },
];

const MORE_DOCUMENTATION = (id: string): NavDropdownItem[] => [
  { href: `/jobs/${id}/plans`, label: "Plans" },
  { href: `/jobs/${id}/specs`, label: "Specs" },
  { href: `/jobs/${id}/photos`, label: "Photos" },
  { href: `/jobs/${id}/documents`, label: "Documents" },
];
// ... etc for Coordination/Tasks/Time/Permits/People/Activity/Closeout/Warranty/Pre-Con

export default function PerJobTabs({ jobId, phase }: { jobId: string; phase: "active" | "closeout" | "warranty" | "pre_con" }) {
  // Phase-aware visibility (1.5c skeleton — F2 wires real logic)
  const showCloseout = phase === "closeout" || phase === "active";
  const showWarranty = phase === "warranty";
  const showPreCon = phase === "pre_con";
  // ... render primary tabs + More ▾
}
```

### 32-path 301-redirect map (`next.config.mjs`)

**Per CONTEXT D-01 + EXPANDED-SCOPE §1.2:**

| Legacy path | Canonical path |
|-------------|----------------|
| `/dashboard` | `/today` |
| `/financial` | `/financials` |
| `/financials/aging-report` | `/financials/aging` |
| `/operations` | `/today` (replaced by Today action items + per-job tabs) |
| `/cost-intelligence` | `/price-intel` |
| `/cost-intelligence/items` | `/price-intel/cost-database` (closest semantic; F5 may revisit) |
| `/cost-intelligence/items/:id` | `/price-intel/cost-database/:id` |
| `/cost-intelligence/verification` | `/price-intel/verification` |
| `/cost-intelligence/lookup` | `/price-intel/cost-lookup` |
| `/cost-intelligence/conversions` | `/price-intel/cost-database?tab=conversions` (or kept as Phase F5 placeholder if URL fragments don't match) |
| `/cost-intelligence/codes` | `/admin/cost-codes` |
| `/cost-intelligence/scope-data` | `/price-intel` (F5 placeholder) |
| `/cost-intelligence/suggestions` | `/price-intel` (F5 placeholder) |
| `/invoices` | `/financials/bills` |
| `/invoices/queue` | `/financials/bills/queue` |
| `/invoices/qa` | `/financials/bills/qa` |
| `/invoices/payments` | `/financials/payments` |
| `/invoices/liens` | `/financials/lien-releases` |
| `/invoices/upload` | `/financials/bills?action=upload` (extends existing redirect) |
| `/invoices/import` | `/financials/bills?action=import` (extends existing redirect) |
| `/draws` | `/financials/pay-apps` |
| `/draws/:id` | `/financials/pay-apps/:id` |
| `/draws/:id/print` | `/financials/pay-apps/:id/print` |
| `/change-orders/:id` | `/financials/change-orders/:id` |
| `/vendors` | `/people/vendors` |
| `/vendors/:id` | `/people/vendors/:id` |
| `/vendors/import` | `/people/vendors?action=import` (extends existing redirect) |
| `/proposals/review/:extraction_id` | `/pipeline/proposals/review/:extraction_id` |
| `/settings` | `/admin` |
| `/settings/team` | `/admin/users` |
| `/settings/integrations` | `/admin/integrations` |
| `/settings/billing` | `/admin/billing` |
| `/settings/cost-codes` | `/admin/cost-codes` |
| `/settings/cost-codes/import` | `/admin/cost-codes?action=import` (extends existing redirect) |
| `/admin/platform` | `/platform-admin` |

**Note:** the EXISTING redirects at lines 14-35 of `next.config.mjs` MUST be preserved. The 32 new redirects extend the array; existing 5 action-page-to-modal + 3 cost-intelligence + 4 platform-admin entries stay in place but their destinations may need updates (e.g., `/invoices?action=upload` → `/financials/bills?action=upload`). Plan 1 audits and updates.

### Owner Portal posture (`src/app/owner-portal/*`)

**Per CONTEXT D-08:** Same Supabase auth + role gate `owner_view`. NO middleware change. NO subdomain. NO separate auth domain. The existing `client_portal_access` table provides token-based invite via `/access/[token]` (already shipped Wave 3). Owner Portal at `/owner-portal/*` is gated to `owner` role via `useCurrentRole()` + middleware role check. Existing auth + role infrastructure reused as-is.

### Platform Admin badge (`src/components/nav/platform-admin-badge.tsx`)

**Per CONTEXT D-09:** existing query at `src/components/nav-bar.tsx:170-176` (the `platform_admins` lookup) extracted into a dedicated badge component. Click → `/platform-admin/*` placeholder. No middleware change — existing posture preserved.

### Today screen (`src/app/today/page.tsx`)

**Per CONTEXT D-05 (Q6=C) + D-10:**
- Three-section layout:
  1. "Your Day" placeholder Card — eyebrow "PERSONAL" + headline "Coming F3 — personalized daily plan" + Wave badge.
  2. Action Items section — REUSES the existing org-wide queues from `/api/dashboard` (extracted from current `dashboard/page.tsx`).
  3. Activity Feed — REUSES existing component from current dashboard.
- Cash Flow + Getting Started cards MOVED to `/company/overview`.
- `/` redirects to `/today` (Q7=A); existing `/dashboard` 301-redirects to `/today`; existing dashboard component IS the Today scaffold (skeleton; F2 wires role-personalization).

---

## Site Office direction inheritance

All new files inherit Site Office tokens (from `src/app/globals.css` + `src/app/colors_and_type.css` Set B palette + `src/app/design-system/design-system.css` `[data-direction="C"]` rules — already shipped 1.5a + verified 1.5b CP2).

Site Office signature applied:
- Eyebrow components: UPPERCASE 0.18em tracking, JetBrains Mono 10-11px
- Card components: 1px slate-tile left-stamp via `[data-direction="C"] [data-slot="card"]`
- Card padding: 16px (NOT padding="lg" per TD-25 fix; replaced by padding="md" or padding="sm")
- Headlines: Space Grotesk Medium (NOT fontWeight: 600; replaced per TD-26 fix)
- Money: JetBrains Mono tabular-nums
- Motion: 150ms ease-out (no bouncy easing; hook-blocked)
- Buttons: NwButton primitive (NOT raw `<button>` for action elements per TD-20 fix)
- No hardcoded hex (only `var(--...)` references)

Production-route surfaces NOT under `/design-system/*` follow the same tokens via root globals.css. NO `data-direction="C"` attribute needed — root layout already locks direction at app level (per CP2 lock D-037).

---

## NwButton primitive (TD-20 fix)

**Per CONTEXT D-06:** Six raw `<button>` instances in extracted prototype components must replace with NwButton. Affected components (verified in 1.5b findings.md TD-20):
- InvoiceReviewView.tsx — Reject + Push to QB header buttons (2 raw <button>s)
- DrawApprovalView.tsx — Approve + Reject + Submit buttons (3 raw <button>s; verify count at execute time)
- VendorDetailView.tsx — possible 1 raw button
- OwnerDrawView.tsx — possible 1 raw button (owner-facing approval)
- MobileApprovalView.tsx — Approve + Reject (currently raw — Reject is the missing path per TD-W2-2 — not fixed in 1.5c per nwrp44 deferral; just the existing Approve button uses NwButton)

NwButton API (per `.planning/design/COMPONENTS.md`):
```typescript
import NwButton from "@/components/nw/Button";
<NwButton variant="primary" | "secondary" | "danger" size="sm" | "md" | "lg-touch">...</NwButton>
```

Touch-target min: 44px standard / 56px high-stakes per SYSTEM.md §11. NwButton's `size="lg-touch"` enforces 56px.

---

## Card padding="lg" → padding="md" replacement (TD-25 fix)

**Per SYSTEM.md §13 Forbidden + CONTEXT D-06:** Card padding="lg" (24px or larger) violates Site Office compact density. Replace with padding="md" (16px) in all extracted views. Hook `.claude/hooks/nightwork-post-edit.sh` Forbidden tokens block reintroduction.

---

## fontWeight: 600 → fontWeight: 500 + Space Grotesk Medium replacement (TD-26 fix)

**Per SYSTEM.md §4d + CONTEXT D-06:** Headlines must use Space Grotesk Medium (weight 500), NOT fontWeight: 600. Replace inline `fontWeight: 600` style props in extracted views with `fontWeight: 500`. Ensure the font face referenced is `var(--font-space-grotesk)`.

---

## What this map does NOT cover

- Cosmetic TDs deferred to Wave 1.1-Lite per nwrp44 D-06 amendment: TD-21 (rgba inline mobile-approval), TD-22 (Money component G703), TD-23 (vendor + contract + plan audit timelines), TD-24 (owner-portal/draws audit timeline), TD-27 (h1 missing nw-direction-headline class), TD-28 (vendors aria-current). These are NOT 1.5c work.
- Real-backend wiring per CONTEXT D-14 (Q8=A) — production routes mount Caldwell fixtures only. F1 wires real backend.
- Multi-modal ingestion routing per CONTEXT D-13 — placeholder copy only ("Coming F3 — voice/video punchlist with AI extraction"). F3+ wires.
- Phase-aware per-job logic per CONTEXT D-12 — skeleton only ("active" hardcoded). F2 wires.
- Role-aware filtering — F2 wires 15 roles into the data-driven ACCESS map.
- 1.5b prototype routes ARE rewritten in this phase (`/design-system/prototypes/*`) but the 1.5b artifact files (CONTEXT.md, findings.md, 6 PLAN.md files) are PART 8 LOCKED per CONTEXT — do NOT modify those.
- `_fixtures/drummond/*` — PART 8 LOCKED. Do NOT modify per CONTEXT.

---

*End of PATTERNS.md*


## iter-2 amendments (per Jake nwrp45)

The following clarifications apply to iter-2 plans without changing the core pattern map above:

### Rename: PlaceholderCard → NwPlaceholderCard (per iter-2 mechanical #2)

Per PROPAGATION-RULES.md §4b — Nw<Role> PascalCase naming is required for new primitives in src/components/nw/. The component originally named `PlaceholderCard` in this map is RENAMED to `NwPlaceholderCard`. All references in iter-2 plan files (Plans 1, 4, 5, 6) use NwPlaceholderCard. PATTERNS.md table entries above retain the original `PlaceholderCard` label for historical traceability — actual file at `src/components/nw/NwPlaceholderCard.tsx`.

### Hoist: NwPlaceholderCard creation moved from Plan 4 to Plan 1 (per iter-2 mechanical #1)

Plans 5 + 6 declared `requires PlaceholderCard` without `depends_on Plan 4 Task 1` — Wave 3 race condition. iter-2 hoists creation to Plan 1 Task 1; Plans 4/5/6 import + consume only.

### Section overview Card grid vs NwPlaceholderCard distinction (per iter-2 design-pushback W-7)

- **Section overview Card grid** (e.g., /pipeline, /financials, /people, /company, /reports, /admin): NOT a NwPlaceholderCard. Renders multiple Cards in a grid linking to sub-routes; each Card has eyebrow + label + 1-line description + optional Wave badge for placeholder destinations.
- **NwPlaceholderCard** (single primitive): renders one Card describing a future-state feature with eyebrow + headline + body + Wave badge.
- Section overviews USE Card primitives directly (with Link wrappers); NwPlaceholderCard is ONE specific Card variant for placeholder-only routes.

### Plan 3 production wrapper template — .design-system-scope wrap (per iter-2 must-fix CRITICAL #1 / D-19)

Production route wrappers in Plan 3 add an outer `<div className="design-system-scope">` so Site Office direction-aware CSS rules at /design-system/design-system.css:84-153 propagate (1px slate-tile left-stamp, JetBrains Mono UPPERCASE eyebrows, Space Grotesk Medium headlines).

### iter-2 D-19 / D-20 / D-21 / D-22 in plan files

- D-19 (= MASTER-PLAN D-057): Site Office .design-system-scope wrap on production routes — encoded in Plan 3 Tasks 2 + 5
- D-20 (= MASTER-PLAN D-058): Full /admin/platform → /platform-admin migration — encoded in Plan 1 (wildcard redirect) + Plan 6 (13 sub-routes mounted)
- D-21 (= MASTER-PLAN D-059): PerJobTabs collapse to dropdown <768px — encoded in Plan 5 Task 1
- D-22 (= MASTER-PLAN D-060): Admin dropdown + /admin section overview precedence — encoded in Plan 1 (dropdown) + Plan 6 (overview Card grid) + Plan 7 (CLAUDE.md atomic update documents precedence)

*End iter-2 amendments.*
