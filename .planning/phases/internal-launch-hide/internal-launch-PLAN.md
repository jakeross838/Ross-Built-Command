---
phase: internal-launch-hide
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/feature-flags.ts                          # NEW — single helper for D-04 canonical idiom
  - src/components/nav-bar.tsx                        # PRIMARY_NAV filter (desktop + mobile share array)
  - src/middleware.ts                                 # 404 block inserted after platform-admin (188-209), before design-system (235)
  - src/components/nav/per-job-tabs.tsx               # PRIMARY_TABS drop Schedule+Selections; moreBaseItems drop 12 placeholders + ADD Purchase Orders
  - src/app/financials/page.tsx                       # FINANCIALS_SECTIONS filter hides Purchase Orders + Change Orders (F1 org-wide)
  - src/app/admin/page.tsx                            # ADMIN_TILES filter hides 9 F2/F3/Wave3 placeholders
  - src/app/people/page.tsx                           # PEOPLE_SECTIONS filter hides Clients/Team/Org chart/Sub Portal per D-03
  - src/app/company/page.tsx                          # COMPANY_SECTIONS filter hides 11 F4/Wave2/Wave3/Wave4 placeholders
  - src/app/pipeline/page.tsx                         # PIPELINE_SECTIONS filter hides all 5 Wave4 placeholders (overview itself 404'd by middleware)
  - src/app/reports/page.tsx                          # REPORTS_SECTIONS filter hides all 5 Wave3 placeholders (overview itself 404'd by middleware)
  - scripts/smoke-internal-launch-hide.mjs            # Task 6 — Playwright smoke runner (Rule 4 enforcement)
  - .planning/qa-runs/internal-launch-hide/smoke-results.json  # Task 6 — Rule 4 canonical artifact path (auto-created via mkdirSync)
parallel_execute_ok: false                            # single plan; no parallel dispatch
autonomous: true                                       # no checkpoints; standard execute
requires_smoke: true                                   # UI-touching plan per Rule 4 (nav + section overviews + middleware route gates)
requirements: []                                       # Internal Launch is project-level initiative outside ROADMAP.md numbered phases

# Phase 1 of Internal Ross Built Launch SEQUENCE (HIDE → UI-FINALIZE → BUILD → fix → TEST/dogfood)
# Authorization chain: nwrp225 (scope locked) → nwrp226 (phased plan) → nwrp227 (Phase 1 authorized $25 ceiling)
#                      → nwrp228 (rev plan signed) → nwrp229 (slices signed) → nwrp230 (dispatch /np)
#                      → nwrp231 (plan-review ceiling bump $25→$50; 1 bump per Rule 7c)
#                      → nwrp232 (revision pass folding 3 dispositions + 4 warnings; halt-gate ceiling extends to cover revision cycle)
halt_gate_ceiling: 50                                  # nwrp227 original $25 → nwrp231 bump (1 bump per Rule 7c) → nwrp232 extends to cover revision cycle
per_plan_halt: 50                                      # Rule 7d
plan_author_self_resolution_overrun: BANNED            # Rule 7a
max_bumps_per_slice: 1                                 # Rule 7c

must_haves:
  truths:
    # User-observable behaviors derived goal-backward from scope-locked §HIDE
    - "Internal launch nav renders Today | Jobs | Financials | Price Intel | (Admin ▾) — 4 primary sections + Admin dropdown — on desktop AND mobile"
    - "Direct URL to /pipeline (any path) returns HTTP 404 when NEXT_PUBLIC_FEATURE_PIPELINE !== 'true'"
    - "Direct URL to /company/* returns HTTP 404 when NEXT_PUBLIC_FEATURE_COMPANY !== 'true'"
    - "Direct URL to /reports/* returns HTTP 404 when NEXT_PUBLIC_FEATURE_REPORTS !== 'true'"
    - "Direct URL to /people/* (including /people/clients per D-03) returns HTTP 404 unconditionally (hardcoded pathname check per nwrp232 OQ #3 path (b); no env var)"
    - "Direct URL to /owner/* returns HTTP 404 when NEXT_PUBLIC_FEATURE_OWNER_PORTAL !== 'true'"
    - "Direct URL to /api/owner-portal/* returns JSON 404 {error:'Not found'} when NEXT_PUBLIC_FEATURE_OWNER_PORTAL !== 'true'"
    - "Direct URL to /price-intel/{anomaly-review,bid-comparison,cost-database,material-orders,selections-catalog,vendor-performance,verification} returns HTTP 404 when NEXT_PUBLIC_FEATURE_PRICE_INTEL_F5 !== 'true'"
    - "Direct URL to /financials/{change-orders,purchase-orders} returns HTTP 404 when NEXT_PUBLIC_FEATURE_FINANCIALS_F1_VIEWS !== 'true'"
    - "Direct URL to /jobs/{any-id}/schedule returns HTTP 404 when NEXT_PUBLIC_FEATURE_FINANCIALS_F1_VIEWS !== 'true' (Wave-2 Caldwell-fixture-mount route per locked-scope; bundled under _FINANCIALS_F1_VIEWS per nwrp232 OQ #1 disposition — both Wave-2 routes hide+expose together)"
    - "Direct URL to /financials/reconciliation returns HTTP 404 when NEXT_PUBLIC_FEATURE_FINANCIALS_F1_VIEWS !== 'true' (Wave-2 Caldwell-fixture-mount route)"
    - "Section-overview Card grid on /financials shows only Bills, Pay Apps, Payments, Lien Releases, Aging (5 cards); hides Purchase Orders + Change Orders (2 cards)"
    - "Section-overview Card grid on /admin shows 4 cards (Users, Cost Codes, Billing, Owner Portal Tokens) - adds Owner Portal Tokens which is a real live admin sub-route at /admin/owner-portal-tokens (15KB B-2a server component with PostgREST FK-cited embeds); hides 9 F2/F3/Wave3 placeholders"
    - "Section-overview Card grid on /people is unreachable in flag-OFF state (middleware 404 hides the section per nwrp232 OQ #3 path (b)); filter logic retained as defensive future-state for when /people un-hides at Wave-2 (Vendors is Caldwell-fixture-mount; un-hides at Wave-2 real-DB swap per nwrp232 Disposition 1)"
    - "Section-overview Card grid on /company is unreachable in flag-OFF state (middleware 404 hides the section); filter logic retained as defensive future-state for when /company un-hides at Wave-2/F4 (Overview entry marked live:false same architectural class as /people/vendors per nwrp232 W-3)"
    - "Per-job nav PRIMARY_TABS shows only Overview, Budget, Bills, Pay Apps (4 tabs); hides Schedule + Selections (2 tabs)"
    - "Per-job nav More ▾ dropdown contains only Change Orders + Purchase Orders + Activity (3 items); hides 12 Wave-2/F2/F3/F4/F5 placeholder tabs"
    - "morePhaseItems (Closeout/Warranty/Pre-Con) UNCHANGED — these are job-lifecycle contexts, not feature placeholders"
    - "Mobile nav (PerJobTabs collapse-to-dropdown <768px) shows same 4 primary tabs + 3 More items + phase items via the same source arrays"
    - "Flipping any NEXT_PUBLIC_FEATURE_* env var to 'true' in Vercel + redeploy preview re-exposes routes without code changes (PEOPLE excepted — hardcoded per nwrp232 OQ #3 path (b); un-hides as part of eventual /people build at F2/Wave-2 via code change)"
    - "Fail-closed default: build with NO NEXT_PUBLIC_FEATURE_* env vars set behaves identically to build with all 6 explicitly false (env var absent === '' === 'false' === 'anything-not-true' === OFF)"
    - "Existing working routes render without regression: Today, Jobs, /invoices, /invoices/[id], /invoices/queue, /invoices/qa, /invoices/payments, /invoices/liens, /draws/*, /cost-intelligence/*, /price-intel root (re-exports /cost-intelligence), Admin live routes (Users, Cost Codes, Billing)"
    - "Sentry middleware tags (user_id, org_id, impersonation_active, platform_admin) still set on requests that hit the new 404 gates (insertion AFTER updateSession at line 141 preserves tag pipeline)"

  artifacts:
    - path: "src/lib/feature-flags.ts"
      provides: "Single isFeatureEnabled() helper enforcing D-04 canonical idiom !== 'true'; centralizes 6-flag list as TypeScript type for autocomplete + grep (PEOPLE NOT a flag per nwrp232 OQ #3 path (b))"
      exports: ["isFeatureEnabled", "FeatureFlagName"]
      min_lines: 30
    - path: "src/components/nav-bar.tsx"
      provides: "PRIMARY_NAV filtered by isFeatureEnabled() before existing role-gate show map (people hardcoded-dropped per nwrp232 OQ #3 path (b))"
      contains: "isFeatureEnabled"
    - path: "src/middleware.ts"
      provides: "404 gate block inserted between platform-admin block (188-209) and design-system block (235); JSON 404 for /api/* paths, HTML rewrite for non-API paths; PEOPLE gate hardcoded pathname check per nwrp232 OQ #3 path (b)"
      contains: "NEXT_PUBLIC_FEATURE_OWNER_PORTAL"
    - path: "src/components/nav/per-job-tabs.tsx"
      provides: "PRIMARY_TABS reduced to 4 (Overview/Budget/Bills/Pay Apps); moreBaseItems reduced to 3 (Change Orders/Purchase Orders/Activity)"
      contains: "Purchase Orders"
    - path: "src/app/financials/page.tsx"
      provides: "FINANCIALS_SECTIONS filtered by isFeatureEnabled('FINANCIALS_F1_VIEWS')"
    - path: "src/app/admin/page.tsx"
      provides: "ADMIN_TILES filtered by tile.status === 'live'"
    - path: "src/app/people/page.tsx"
      provides: "PEOPLE_SECTIONS filtered by s.live (no flag — page itself middleware-404'd hardcoded; filter is defensive future-state per nwrp232 OQ #3 path (b))"
    - path: "src/app/company/page.tsx"
      provides: "COMPANY_SECTIONS filtered by isFeatureEnabled('COMPANY')"
    - path: "src/app/pipeline/page.tsx"
      provides: "PIPELINE_SECTIONS filter — overview page itself middleware-404'd; defensive filter for symmetry"
    - path: "src/app/reports/page.tsx"
      provides: "REPORTS_SECTIONS filter — overview page itself middleware-404'd; defensive filter for symmetry"

  key_links:
    - from: "src/lib/feature-flags.ts"
      to: "src/components/nav-bar.tsx, src/middleware.ts, 5 of 6 section-overview pages (admin uses status; people no longer uses flag per nwrp232 OQ #3 path (b))"
      via: "isFeatureEnabled() import"
      pattern: "isFeatureEnabled\\("
    - from: "src/middleware.ts"
      to: "Next.js request pipeline AFTER updateSession (line 141)"
      via: "request.nextUrl.pathname.startsWith() gates"
      pattern: "NEXT_PUBLIC_FEATURE_"
    - from: "Vercel env vars (already added 2026-05-26)"
      to: "Next.js build-time inlining for NEXT_PUBLIC_* + middleware runtime read"
      via: "process.env.NEXT_PUBLIC_FEATURE_*"
      pattern: "process\\.env\\.NEXT_PUBLIC_FEATURE_"
---

<scope_rationale>
**Plan at upper threshold per plan-checker dimension 5** (6 tasks / 10 files modified pre-revision; 12 files modified post-revision including smoke artifacts / ~98KB pre-revision plan body). **Cohesion check passes:** all source files in `files_modified` are env-var-feature-flag wiring for a single coherent phase (Internal-Launch §HIDE). The 10 source files break down into 4 categories that MUST ship atomically:

| Category | Files | Cohesion |
|----------|-------|----------|
| Helper (Task 1) | `src/lib/feature-flags.ts` (NEW) | All downstream tasks import from this; cannot split |
| Top nav (Task 2) | `src/components/nav-bar.tsx` | Depends on Task 1; produces visible nav surface |
| Middleware gates (Task 3) | `src/middleware.ts` | Depends on Task 1; produces 404 boundary |
| Per-job tabs (Task 4) | `src/components/nav/per-job-tabs.tsx` | Static array removal per D-06; no Task 1 dependency BUT bundled for atomic ship |
| Section overviews (Task 5) | 6 page.tsx files | All consume Task 1 (or status filter); pattern symmetry across pages |
| Smoke artifact (Task 6) | `scripts/smoke-internal-launch-hide.mjs` + `.planning/qa-runs/internal-launch-hide/smoke-results.json` | Rule 4 enforcement gate — cannot ship without |

**Splitting analysis:** A 2-plan split would impose coordination overhead (Plan A1 ships helper + middleware + nav; Plan A2 ships section overviews + smoke) with no per-file complexity savings AND would force section-overview pages to ship without the helper + middleware that makes their filters meaningful at runtime (Rule 1 violation: schema-only verification on Plan A2 without the actual gate behaving correctly on Plan A1). Atomic ship preserves Rule 1 (schema verification ≠ runtime verification) at the phase level.

**Cost discipline:** Per-plan halt $50 (Rule 7d) is the cost discipline gate; max 1 bump per slice (Rule 7c) caps the upside. $50 halt-gate ceiling per nwrp227+nwrp231 is the planning-time control point (bumped from $25 once per Rule 7c; nwrp232 extends to cover revision cycle). If execute surfaces a per-plan overrun, the executor HALTS for Jake re-scope per Rule 7a (plan-author self-resolution BANNED).
</scope_rationale>

<objective>
Reduce nav from 8 sections to 4 + Admin dropdown via env-var-as-feature-flag pattern. Hide Owner Portal (built but not externally exposed), ~50 placeholder routes, 15 per-job operational tabs, and 2 Caldwell-fixture-mount Wave-2 routes. Pattern: 6 `NEXT_PUBLIC_FEATURE_*` env vars (already added to Vercel Production + Preview at value `""` per SETUP-COMPLETE.md) + nav-bar conditional + middleware 404 block + section-overview Card filtering. PEOPLE section hardcoded HIDE per nwrp232 OQ #3 path (b) — no env var; un-hides as part of eventual /people build at F2/Wave-2 via code change.

Purpose: Get the app feeling complete at reduced scope before Phase 2 (UI-FINALIZE) lands polish on the launch surfaces. Cheapest item ($25 ceiling; bumped to $50 per nwrp231); biggest perceptual change (8-section nav → 4 sections; ~50 placeholder routes disappear from discovery). Pre-Phase-2 prerequisite per locked-scope SEQUENCE (HIDE → UI-FINALIZE → BUILD → fix → TEST/dogfood). Phase 1 of Internal Ross Built Launch.

Output: 10 source files modified (1 new + 9 existing). 6 Vercel env vars already set (PEOPLE NOT a 7th env var per nwrp232 OQ #3 path (b)). No schema changes, no financial logic, no data writes, no new endpoints. Reversibility via env-var flip on Vercel (no code changes required to re-expose any hidden surface EXCEPT /people which is hardcoded and un-hides via code change at F2/Wave-2).
</objective>

<dispatch_blocker>
**RESOLVED per nwrp232 — original HARD HALT questions have been dispositioned by Jake. This section retained as audit trail.**

| Open Question | Original Plan-Body Default | nwrp232 Jake Disposition | Status |
|---------------|----------------------------|--------------------------|--------|
| **Q1 — Schedule flag bundling** | Bundle `/jobs/{id}/schedule` under `NEXT_PUBLIC_FEATURE_FINANCIALS_F1_VIEWS` (Task 3 regex) | **BUNDLE under FINANCIALS_F1_VIEWS** — Jake quote: "A separate _SCHEDULE flag costs another Vercel env-add (Prod+Preview) before /nx for a semantic distinction with zero practical value at launch (both hidden, both stay hidden till their wave). If they ever need independent un-hide, split then — trivial. Don't pay setup friction now for unused flexibility." | **RESOLVED via nwrp232 — bundled; no plan revision needed** |
| **Q3 — PEOPLE flag mechanism** | Path (a): Add `NEXT_PUBLIC_FEATURE_PEOPLE` to Vercel (7th flag) | **Path (b): HARDCODED startsWith('/people') 404, NOT a 7th env var** — Jake quote: "(a) adds another Vercel env-add + SETUP-COMPLETE update (more manual work from me) to buy flag-flip reversibility — but unlike Owner Portal (known future re-expose, so the flip is valuable), People is F2/Wave-2 build that doesn't exist yet. I won't flip People back on as a flag; when it ships it ships as code. The env-var's whole value (cheap flip-back) doesn't apply here. Hardcode it; un-hides as part of the eventual People build." | **RESOLVED via nwrp232 — path (b) baseline plan; revisions applied to Tasks 1+2+3+5** |

**Audit trail preserved:** Path (a) for Q3 was rejected; Path (b) is now baseline plan (no Vercel env-add needed; no SETUP-COMPLETE update needed; revisions applied per nwrp232 W-1/W-2/W-3/W-4).
</dispatch_blocker>

<execution_context>
@C:/Users/Jake/nightwork-platform/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Jake/nightwork-platform/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@C:/Users/Jake/nightwork-platform/.planning/STATE.md
@C:/Users/Jake/nightwork-platform/CLAUDE.md

# Canonical phase artifacts (REQUIRED reading before execution)
@C:/Users/Jake/nightwork-platform/.planning/launch/INTERNAL-LAUNCH-SCOPE-LOCKED.md
@C:/Users/Jake/nightwork-platform/.planning/phases/internal-launch-hide/internal-launch-CONTEXT.md
@C:/Users/Jake/nightwork-platform/.planning/expansions/internal-launch-hide-EXPANDED-SCOPE.md
@C:/Users/Jake/nightwork-platform/.planning/expansions/internal-launch-hide-SETUP-COMPLETE.md

# W.1 precedent (canonical fail-closed `!== "true"` idiom)
@C:/Users/Jake/nightwork-platform/src/hooks/use-current-role.ts

<interfaces>
<!-- Key contracts the executor needs. Embedded so executor does not have to grep the codebase mid-task. -->

==== File: src/hooks/use-current-role.ts (W.1 canonical idiom — lines 61-70) ====
```ts
  // Reading NEXT_PUBLIC_AUTH_STATE_LISTENER:
  //   Next.js inlines NEXT_PUBLIC_* env vars at build time. With the
  //   env var unset, `process.env.NEXT_PUBLIC_AUTH_STATE_LISTENER`
  //   evaluates to `undefined` at build time and the early return
  //   short-circuits BEFORE the supabase.auth.onAuthStateChange call.
  //   The subscription is never created; cleanup is a no-op.
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_AUTH_STATE_LISTENER !== "true") {
      return; // env-flag-off: no-op (slice ship default posture)
    }
```
This is the byte-identical `!== "true"` idiom canonical for D-04. Empty string `""` !== `"true"` evaluates true → fail-closed.

==== File: src/middleware.ts (lines 139-167 — updateSession + auth gate; lines 188-209 — platform-admin block; lines 211-281 — design-system block) ====
Insertion point: AFTER platform-admin block (after line 209 closing brace), BEFORE design-system block (before line 211 comment header). The new 404 gate block lands at approximately line 210. Insertion AFTER updateSession at line 141 preserves Sentry tag pipeline per CONTEXT D-05 rationale.

JSON-vs-HTML 404 response shape precedent in this file:
- Lines 157-162: JSON 404 for /api/* paths via `NextResponse.json({ error: "..." }, { status: 401 })` — adapt to status 404 + message "Not found"
- Lines 263-268: HTML 404 for non-API via `NextResponse.rewrite(notFoundUrl, { status: 404 })` where notFoundUrl is `request.nextUrl.clone()` with `pathname = "/_not-found"`

PUBLIC_PATHS (lines 16-49) includes 4 Owner Portal entries:
- "/owner" (line 27)
- "/api/owner-portal/acknowledge" (line 32)
- "/api/owner-portal/acknowledge-pay-app" (line 41)
- "/api/owner-portal/admin" (line 48)
The new dual gate must fire BEFORE the !user && !isPublic(pathname) check at line 155 RESOLVES PUBLIC_PATHS — actually NO, the 404 gate must fire AFTER updateSession (for Sentry tags). Since gates land at line 210, they fire AFTER both updateSession AND the !user auth gate. This means: if user is anon AND PUBLIC_PATHS allows the owner-portal route through, the new 404 gate must still independently return 404 when the flag is off. Test: anon visitor to /owner/abc when flag off → must 404 (not redirect to login, not pass-through to PUBLIC_PATHS).

==== File: src/components/nav-bar.tsx (lines 142-151 PRIMARY_NAV + 256-269 show map + 322-336 desktop nav render + 416-431 mobile nav render) ====
```ts
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
```
Composition with `show` map: desktop nav renders `PRIMARY_NAV.map((item) => show[item.key] ? <Link...> : null)`. Mobile nav at lines 416-431 uses the same PRIMARY_NAV array and same show map. **Filter ORDER: env-var filter FIRST (drop entire item from PRIMARY_NAV), then role filter (show[key]) — env-var filter is build-time hide; role filter is runtime gate.**

==== File: src/components/nav/per-job-tabs.tsx (lines 64-71 PRIMARY_TABS + 73-97 moreBaseItems + 99-113 morePhaseItems) ====
```ts
const PRIMARY_TABS = [
  { key: "overview", label: "Overview", path: "" },
  { key: "schedule", label: "Schedule", path: "/schedule" },        // DROP per Q2=A
  { key: "budget", label: "Budget", path: "/budget" },
  { key: "selections", label: "Selections", path: "/selections" },  // DROP per Q2=A
  { key: "bills", label: "Bills", path: "/bills" },
  { key: "pay_apps", label: "Pay Apps", path: "/pay-apps" },
];

function moreBaseItems(jobId: string): DropdownItem[] {
  return [
    // Documentation
    { href: `/jobs/${jobId}/plans`, label: "Plans" },               // DROP (12 of 14 hidden)
    { href: `/jobs/${jobId}/specs`, label: "Specs" },               // DROP
    { href: `/jobs/${jobId}/photos`, label: "Photos" },             // DROP
    { href: `/jobs/${jobId}/documents`, label: "Documents" },       // DROP
    { href: `/jobs/${jobId}/rfis`, label: "RFIs" },                 // DROP
    { href: `/jobs/${jobId}/submittals`, label: "Submittals" },     // DROP
    { href: `/jobs/${jobId}/change-orders`, label: "Change Orders" }, // KEEP
    { href: `/jobs/${jobId}/daily-logs`, label: "Daily Logs" },     // DROP
    { href: `/jobs/${jobId}/to-dos`, label: "To-Dos" },             // DROP
    { href: `/jobs/${jobId}/punchlist`, label: "Punchlist" },       // DROP
    { href: `/jobs/${jobId}/time-entries`, label: "Time Entries" }, // DROP
    { href: `/jobs/${jobId}/permits`, label: "Permits" },           // DROP
    { href: `/jobs/${jobId}/team`, label: "Team" },                 // DROP
    { href: `/jobs/${jobId}/activity`, label: "Activity" },         // KEEP
  ];
}
```
**PO clarification resolution (per orchestrator `<one_open_item_for_plan_resolution>`):** `src/app/jobs/[id]/purchase-orders/page.tsx` EXISTS as a 15KB fully-working real-DB UI (verified during plan-author investigation). It is NOT currently in `moreBaseItems`. Per EXPANDED-SCOPE §7 + GROUNDED-INVENTORY intent ("More ▾ collapses to CO + PO + Activity"), this plan ADDS `{ href: \`/jobs/${jobId}/purchase-orders\`, label: "Purchase Orders" }` to the new reduced `moreBaseItems`. 1-line align with intent (option a). Composition order: Change Orders → Purchase Orders → Activity.

`morePhaseItems` (lines 99-113) UNCHANGED — Closeout/Warranty/Pre-Con are job-lifecycle phase contexts, NOT feature placeholders.

==== Mobile composition: allTabsAsDropdownItems at lines 367-373 ====
```ts
const allTabsAsDropdownItems: DropdownItem[] = [
  ...PRIMARY_TABS.map((t) => ({
    href: `/jobs/${jobId}${t.path}`,
    label: t.label,
  })),
  ...moreItems,  // moreItems = [...moreBaseItems(jobId), ...morePhaseItems(jobId, phase)]
];
```
Filtering at the source arrays (PRIMARY_TABS + moreBaseItems) covers both desktop render (lines 389-425) AND mobile collapse-to-dropdown (lines 428-435). Single source of truth.

==== File: src/app/financials/page.tsx (FINANCIALS_SECTIONS at lines 21-29) ====
Current 7 entries: Bills, Pay Apps, Payments, Lien Releases, Aging (5 live) + Purchase Orders, Change Orders (2 "Coming F1"). The 2 F1 entries hide per `NEXT_PUBLIC_FEATURE_FINANCIALS_F1_VIEWS !== "true"`.

==== File: src/app/admin/page.tsx (ADMIN_TILES at lines 30-49) ====
Current (pre-edit) 12 entries: Users, Cost Codes, Billing (3 live with `status: "live"`) + 9 placeholders (Roles/Permissions/Org Chart/Profile/Approval Workflows/Notification Rules/Workflow Customization/Integrations/Templates — all with `status: "placeholder"`). **POST-edit (per checker WARNING #4 + phased-plan AC line 133): Task 5 ADDS 4th live tile `{ href: "/admin/owner-portal-tokens", label: "Owner Portal Tokens", desc: "...", status: "live" }`** — the route exists as a fully-working real-DB UI at `src/app/admin/owner-portal-tokens/page.tsx` (15KB B-2a server component; Slice-2 ship; PostgREST FK-cited embeds per Workflow Posture Rule 2) but the tile entry was missing from ADMIN_TILES pre-edit. Final structure: 13 entries (4 live + 9 placeholders). Filter: `tile.status === "live"` (unchanged signal; just gains the 4th live row).

==== File: src/app/people/page.tsx (PEOPLE_SECTIONS at lines 13-19) ====
Current 5 entries: Vendors (1 live) + Clients/Team/Org chart/Sub Portal (4 not live). **Per nwrp232 Disposition 1: Vendors marked `live: false`** (Caldwell-fixture-mount; same architectural class as schedule; un-hides at Wave-2 real-DB swap). Per nwrp232 OQ #3 path (b): /people whole-section hardcoded-404'd by middleware; filter logic retained as defensive future-state — with Vendors now `live: false`, ALL_PEOPLE_SECTIONS becomes all-live:false → PEOPLE_SECTIONS = empty array. Filter: `s.live === true` (defensive symmetry; no flag check since whole section middleware-404'd).

==== File: src/app/company/page.tsx (COMPANY_SECTIONS at lines 12-25) ====
Current 12 entries: Overview (1 live) + 11 placeholders. **Per nwrp232 W-3: Overview marked `live: false`** (same architectural-class reasoning as /people/vendors — unreachable in flag-OFF state; un-hides at Wave-2/F4). Filter: `s.live === true && isFeatureEnabled("COMPANY")` — wait, the filter is conceptually `!s.live && !isFeatureEnabled("COMPANY") return false` (same canonical pattern); but with Overview now live:false, ALL entries are live:false → COMPANY_SECTIONS = empty array when flag OFF.

==== File: src/app/pipeline/page.tsx (PIPELINE_SECTIONS at lines 18-24) ====
Current 5 entries: all 5 are Wave 4 (no live). Filter: `s.live === true` → renders empty grid. Page itself is middleware-404'd when `NEXT_PUBLIC_FEATURE_PIPELINE !== "true"`, so users never reach this filtered page in normal flow. Filter is defensive symmetry (if flag flipped on without re-deploy of pipeline content, grid shows nothing instead of placeholders).

==== File: src/app/reports/page.tsx (REPORTS_SECTIONS at lines 12-18) ====
Same pattern as pipeline: 5 Wave-3 entries, none live. Defensive filter.
</interfaces>
</context>

<tasks>

<task type="auto" depends_on="[]">
  <name>Task 1: Create canonical feature-flag helper (D-04 enforcement)</name>
  <read_first>
    - C:/Users/Jake/nightwork-platform/src/hooks/use-current-role.ts (lines 61-70 — W.1 canonical idiom)
    - C:/Users/Jake/nightwork-platform/.planning/phases/internal-launch-hide/internal-launch-CONTEXT.md (D-04 spec)
    - C:/Users/Jake/nightwork-platform/.planning/expansions/internal-launch-hide-SETUP-COMPLETE.md (6 flag names already set in Vercel)
  </read_first>
  <files>src/lib/feature-flags.ts</files>
  <action>Create NEW file `src/lib/feature-flags.ts`. Single helper that enforces the D-04 canonical idiom `process.env.NEXT_PUBLIC_FEATURE_<NAME> !== "true"` in ONE place; importable from middleware (Edge runtime), server components, AND client components. Exports:

```ts
// src/lib/feature-flags.ts
//
// Internal-Launch Phase 1 — env-var-as-feature-flag helper (D-04).
//
// Canonical idiom: NEXT_PUBLIC_FEATURE_<NAME> !== "true" (fail-closed default).
// Empty string "" → !== "true" === true → feature OFF (per Jake's nwrp230 +
// SETUP-COMPLETE.md: all 6 Vercel flags set to "" as functionally equivalent
// to "false"). Unset env var → undefined → !== "true" === true → OFF.
//
// Byte-identical to W.1 precedent at src/hooks/use-current-role.ts:67-69
// (NEXT_PUBLIC_AUTH_STATE_LISTENER). Re-uses the proven Next.js NEXT_PUBLIC_*
// build-time inlining contract: Next.js inlines NEXT_PUBLIC_* at build time
// so client + server + Edge middleware all see the same value.
//
// Centralizes the flag NAMES as a TypeScript union so:
//   (a) every read site auto-completes via FeatureFlagName
//   (b) typos surface at compile time (vs runtime "undefined" silent OFF)
//   (c) /nightwork-qa security-reviewer can mechanically grep:
//       `grep -rn "isFeatureEnabled\\(" src/` finds every read site
//       `grep -rn "NEXT_PUBLIC_FEATURE_" src/lib/feature-flags.ts` confirms
//       the canonical pattern lives in exactly one file (one-token-per-name)
//
// The 6 flags below match Vercel Production + Preview added 2026-05-26
// per SETUP-COMPLETE.md MANUAL §1.
//
// PEOPLE intentionally NOT a flag per nwrp232 OQ #3 path (b); hardcoded in
// middleware Task 3 (pathname check, no env var). Reasoning per Jake's
// disposition: People is F2/Wave-2 build that doesn't exist yet; the env
// var's whole value (cheap flip-back) doesn't apply since /people will ship
// as code, not a flag-flip. Hardcoded HIDE; un-hides as part of eventual
// /people build via code change.

export type FeatureFlagName =
  | "OWNER_PORTAL"
  | "PIPELINE"
  | "COMPANY"
  | "REPORTS"
  | "PRICE_INTEL_F5"
  | "FINANCIALS_F1_VIEWS";

// Static mapping: TypeScript union → process.env key. Inline `process.env.X`
// reads are REQUIRED for Next.js NEXT_PUBLIC_* build-time inlining (dynamic
// access like `process.env[`NEXT_PUBLIC_FEATURE_${name}`]` does NOT inline
// per Next.js docs — must be statically analyzable string literals).
const FLAG_ENV_VALUE: Record<FeatureFlagName, string | undefined> = {
  OWNER_PORTAL:        process.env.NEXT_PUBLIC_FEATURE_OWNER_PORTAL,
  PIPELINE:            process.env.NEXT_PUBLIC_FEATURE_PIPELINE,
  COMPANY:             process.env.NEXT_PUBLIC_FEATURE_COMPANY,
  REPORTS:             process.env.NEXT_PUBLIC_FEATURE_REPORTS,
  PRICE_INTEL_F5:      process.env.NEXT_PUBLIC_FEATURE_PRICE_INTEL_F5,
  FINANCIALS_F1_VIEWS: process.env.NEXT_PUBLIC_FEATURE_FINANCIALS_F1_VIEWS,
};

/**
 * Returns `true` if the named feature flag is enabled (env var === "true").
 * Returns `false` otherwise: empty string, "false", any other value, OR
 * env var unset (undefined). This is the FAIL-CLOSED default per W.1.
 *
 * Per CLAUDE.md Workflow Posture Rule 1: combine with Vercel-preview-walk
 * runtime verification — schema verification ≠ runtime verification. UI
 * changes gated by these flags MUST be confirmed on the Vercel preview
 * before /nightwork-qa PASS.
 *
 * Usage:
 *   // middleware.ts
 *   if (!isFeatureEnabled("PIPELINE") && pathname.startsWith("/pipeline")) {
 *     return NextResponse.rewrite(notFoundUrl, { status: 404 });
 *   }
 *
 *   // section overview page
 *   const sections = ALL_SECTIONS.filter(s => s.live || isFeatureEnabled("FINANCIALS_F1_VIEWS"));
 *
 *   // nav-bar PRIMARY_NAV
 *   const PRIMARY_NAV = ALL_NAV_ITEMS.filter(item => {
 *     if (item.key === "pipeline" && !isFeatureEnabled("PIPELINE")) return false;
 *     // ... etc
 *     return true;
 *   });
 */
export function isFeatureEnabled(name: FeatureFlagName): boolean {
  return FLAG_ENV_VALUE[name] === "true";
}
```

**Why a helper instead of inline reads** (per CONTEXT Claude's Discretion, option a chosen):
- D-04 mechanical AC simpler: grep `isFeatureEnabled\\(` finds every site; grep `NEXT_PUBLIC_FEATURE_` finds only the helper + the canonical helper-comment
- Compile-time typo catch via `FeatureFlagName` union
- One file owns the 6-flag list (audit trail; aligns with Vercel env-var list in SETUP-COMPLETE.md MANUAL §1)
- No additional bundle weight vs inline (Next.js dead-code-eliminates the helper if all callers are at module-init; helper is 5 lines of executable code)

**Don't:** Don't use dynamic `process.env[name]` access — Next.js requires STATIC string-literal lookups for NEXT_PUBLIC_* build-time inlining. The static `Record<FeatureFlagName, string | undefined>` initialized at module load time ensures every flag is inlined correctly. Don't add a default branch like `case _exhaustive` — TypeScript exhaustiveness on the union is enforced by the `Record<FeatureFlagName, ...>` type definition. **Don't add PEOPLE to the union or FLAG_ENV_VALUE Record** — per nwrp232 OQ #3 path (b), PEOPLE is hardcoded in middleware Task 3 (no env var; un-hides via code change at F2/Wave-2 build).
  </action>
  <verify>
    <automated>
# 1. File exists with required exports
test -f src/lib/feature-flags.ts && echo "FILE EXISTS"

# 2. All 6 NEXT_PUBLIC_FEATURE_* env-var reads present (6 Vercel-set; PEOPLE NOT a flag per nwrp232 OQ #3 path (b))
grep -c "process.env.NEXT_PUBLIC_FEATURE_" src/lib/feature-flags.ts
# Expected: 6

# 3. Canonical idiom `=== "true"` in the EXACT helper function (D-04 — NO !== "false", NO Boolean coercion, NO ""=== checks)
grep -E '^\s*return\s+FLAG_ENV_VALUE\[name\]\s*===\s*"true";' src/lib/feature-flags.ts
# Expected: matches the canonical line

# 4. FORBIDDEN patterns NOT present (D-04 mechanical AC)
! grep -E '=== ?"false"|!process\.env\.NEXT_PUBLIC_FEATURE|Boolean\(process\.env\.NEXT_PUBLIC_FEATURE' src/lib/feature-flags.ts
# Expected: exit 0 (no matches)

# 5. PEOPLE NOT in union or FLAG_ENV_VALUE Record (per nwrp232 OQ #3 path (b))
! grep -E '"PEOPLE"|PEOPLE:\s*process\.env\.NEXT_PUBLIC_FEATURE_PEOPLE' src/lib/feature-flags.ts
# Expected: exit 0 (no matches — PEOPLE removed)

# 6. Type build clean
npx tsc --noEmit
# Expected: no errors related to src/lib/feature-flags.ts
    </automated>
  </verify>
  <acceptance_criteria>
    - File `src/lib/feature-flags.ts` exists (≥30 lines including JSDoc + comments)
    - Exports `FeatureFlagName` union type with exactly 6 members: OWNER_PORTAL, PIPELINE, COMPANY, REPORTS, PRICE_INTEL_F5, FINANCIALS_F1_VIEWS (PEOPLE intentionally NOT in union per nwrp232 OQ #3 path (b))
    - Exports `isFeatureEnabled(name: FeatureFlagName): boolean` function
    - Function body returns `FLAG_ENV_VALUE[name] === "true"` (the canonical D-04 idiom)
    - `FLAG_ENV_VALUE` Record contains 6 static `process.env.NEXT_PUBLIC_FEATURE_<NAME>` reads (one per flag; PEOPLE NOT present)
    - File contains ZERO instances of `=== "false"`, `!process.env`, or `Boolean(process.env...)` patterns
    - File contains ZERO instances of `PEOPLE` (per nwrp232 OQ #3 path (b))
    - `npx tsc --noEmit` passes (no type errors)
    - JSDoc on `isFeatureEnabled` references CLAUDE.md Workflow Posture Rule 1
    - JSDoc/inline comment explicitly notes PEOPLE NOT a flag per nwrp232 OQ #3 path (b)
  </acceptance_criteria>
  <done>
    Helper file created; D-04 canonical idiom enforced in ONE place; downstream tasks import from `@/lib/feature-flags`. PEOPLE intentionally NOT a flag per nwrp232 OQ #3 path (b).
  </done>
</task>

<task type="auto" depends_on="[1]">
  <name>Task 2: Filter top-level nav (PRIMARY_NAV in nav-bar.tsx)</name>
  <read_first>
    - C:/Users/Jake/nightwork-platform/src/components/nav-bar.tsx (full file; reference lines 142-151 PRIMARY_NAV, 256-269 show map, 322-336 desktop render, 416-431 mobile render)
    - C:/Users/Jake/nightwork-platform/src/lib/feature-flags.ts (just created in Task 1)
  </read_first>
  <files>src/components/nav-bar.tsx</files>
  <action>Modify `PRIMARY_NAV` to be filtered by feature flags BEFORE the existing role-gate show map. Per CONTEXT D-04 + EXPANDED-SCOPE §7 row 2: filter at the array source so both desktop nav (lines 322-336) AND mobile nav (lines 416-431) — which both iterate the same PRIMARY_NAV — receive the filtered list via single source of truth.

**Per nwrp232 OQ #3 path (b): the `people` item is HARDCODED-DROPPED from PRIMARY_NAV (no flag check; un-hides at F2/Wave-2 via code change).** Reasoning per Jake's disposition: People is F2/Wave-2 build that doesn't exist yet; the env var's whole value (cheap flip-back) doesn't apply since /people will ship as code, not a flag-flip.

**Specific edit (1-line import + replace PRIMARY_NAV definition at lines 142-151):**

Add import at top with the other imports (around line 17, alphabetical):
```ts
import { isFeatureEnabled } from "@/lib/feature-flags";
```

Replace lines 142-151 (the static PRIMARY_NAV array) with this filtered version:

```ts
// PRIMARY_NAV — full 8-section structure preserved for IA reference + future
// unhide path. Per Internal-Launch Phase 1 (D-04 + D-11 of CONTEXT): filter by
// NEXT_PUBLIC_FEATURE_* env vars at module load; both desktop nav (line 322)
// and mobile nav (line 416) iterate this filtered list (single source of truth).
// Reversibility: flip flag to "true" in Vercel + redeploy → section reappears
// (EXCEPT people which is hardcoded HIDE per nwrp232 OQ #3 path (b); un-hides
//  at F2/Wave-2 via code change).
//
// Filter ORDER: env-var filter HERE (build-time hide via NEXT_PUBLIC_*); the
// existing role-gate `show` map at line 256-269 applies SECOND at render time.
// Both filters preserved; env-var precedence over role.
const ALL_PRIMARY_NAV: Array<{ key: NavItemKey; label: string; href: string }> = [
  { key: "today",       label: "Today",       href: "/today" },
  { key: "pipeline",    label: "Pipeline",    href: "/pipeline" },
  { key: "jobs",        label: "Jobs",        href: "/jobs" },
  { key: "financials",  label: "Financials",  href: "/financials" },
  { key: "price_intel", label: "Price Intel", href: "/price-intel" },
  { key: "people",      label: "People",      href: "/people" },
  { key: "company",     label: "Company",     href: "/company" },
  { key: "reports",     label: "Reports",     href: "/reports" },
];

const PRIMARY_NAV = ALL_PRIMARY_NAV.filter((item) => {
  // Internal-launch Phase 1 hide list — flag !== "true" → drop from nav.
  // today, jobs, financials, price_intel, admin are always on (no flag).
  // Note: Admin is rendered separately via <AdminDropdown />, NOT via this
  // PRIMARY_NAV array (see line 337-339); no admin flag here.
  if (item.key === "pipeline"   && !isFeatureEnabled("PIPELINE"))   return false;
  if (item.key === "company"    && !isFeatureEnabled("COMPANY"))    return false;
  if (item.key === "reports"    && !isFeatureEnabled("REPORTS"))    return false;
  if (item.key === "people") return false;  // hardcoded HIDE per nwrp232 OQ #3 path (b); no env var; un-hides when /people section ships at F2/Wave-2
  // price_intel root re-exports /cost-intelligence (working surface, NOT a
  // placeholder per src/app/price-intel/page.tsx:21) — stays visible.
  // PRICE_INTEL_F5 gates only the 7 sub-routes (middleware Task 3).
  // financials stays visible — only the F1 org-wide CO/PO sub-views hide
  // (middleware Task 3 + section-overview Task 8).
  return true;
});
```

**Composition with existing `show` role-gate (lines 256-269):**
The existing `show` Record + `can(role, key)` filter at render time (lines 322-336 desktop, 416-431 mobile) is PRESERVED untouched. After this change, render order is: ALL_PRIMARY_NAV → PRIMARY_NAV (env-var filter + people hardcoded) → render only if show[item.key] (role filter). Both gates fire; env-var/hardcoded precedence at module load; role gate at render.

**With internal launch flags all "" (current Vercel state):**
- Today: always shown ✓
- Pipeline: HIDDEN (flag !== "true") ✓
- Jobs: always shown ✓
- Financials: always shown ✓
- Price Intel: always shown (root re-exports /cost-intelligence) ✓
- People: HIDDEN (hardcoded per nwrp232 OQ #3 path (b)) ✓
- Company: HIDDEN (flag !== "true") ✓
- Reports: HIDDEN (flag !== "true") ✓
- Admin ▾: rendered separately at line 337-339; always shown to owner/admin per existing `show.admin` role gate ✓

Result: Today | Jobs | Financials | Price Intel | (Admin ▾) — exactly per locked-scope §HIDE spec.

**Don't:** Don't modify the `ACCESS` Record (lines 83-93). Don't touch the show map (lines 259-269). Don't add an admin flag here — Admin dropdown renders independently. Don't filter inside the `.map()` at lines 322-336 — that would force two filter passes and confuse Tailwind's JIT scanner (which can statically resolve `PRIMARY_NAV.map(...)` for class extraction but breaks on chained filters). **Don't change `people` to use `isFeatureEnabled("PEOPLE")`** — per nwrp232 OQ #3 path (b), PEOPLE is NOT in the FeatureFlagName union; the call would fail TypeScript compilation. Use hardcoded `return false` for the `people` key.
  </action>
  <verify>
    <automated>
# 1. Import added
grep -n "from \"@/lib/feature-flags\"" src/components/nav-bar.tsx
# Expected: 1 line near top imports

# 2. ALL_PRIMARY_NAV (the unfiltered source) preserved with 8 entries
grep -A 10 "const ALL_PRIMARY_NAV" src/components/nav-bar.tsx | grep -c "key:"
# Expected: 8

# 3. PRIMARY_NAV filter expression present
grep -E "ALL_PRIMARY_NAV.filter" src/components/nav-bar.tsx
# Expected: 1 match

# 4. All 4 hidden sections handled in the filter callback (pipeline, company, reports via isFeatureEnabled; people via hardcoded return false) - anchored to the filter callback body
grep -A 12 'ALL_PRIMARY_NAV.filter' src/components/nav-bar.tsx | grep -cE 'item\.key === "(pipeline|company|reports|people)"'
# Expected: 4 (anchored to ALL_PRIMARY_NAV.filter() callback; prevents false-positive matches if "key === X" appears outside the filter elsewhere in the file)

# 5. PEOPLE is hardcoded (no isFeatureEnabled("PEOPLE") call — would fail TS compile since PEOPLE removed from union)
! grep -E 'isFeatureEnabled\("PEOPLE"\)' src/components/nav-bar.tsx
# Expected: exit 0 (no matches — PEOPLE not a flag per nwrp232 OQ #3 path (b))

# 6. No `=== "false"` patterns (D-04 mechanical AC for this file)
! grep -E '=== ?"false"' src/components/nav-bar.tsx
# Expected: exit 0

# 7. isFeatureEnabled used for the 3 flag-driven sections (PIPELINE, COMPANY, REPORTS)
grep -c "isFeatureEnabled(" src/components/nav-bar.tsx
# Expected: ≥3 (one per flag-driven hidden section: PIPELINE, COMPANY, REPORTS — PEOPLE excluded per nwrp232)

# 8. Build clean
npm run build 2>&1 | grep -E "error|Error" | grep -v "ESLint\|0 errors\|no errors" | head -5
# Expected: empty (no build errors)

# 9. Hook regex sweep on touched lines (Rule 6(a) — pre-existing
#    rgba(247,245,236,...) at hover utilities NOT in touched lines)
.claude/hooks/nightwork-post-edit.sh src/components/nav-bar.tsx 2>&1 | grep -E "BLOCK|FAIL" || echo "HOOK PASS"
# Expected: HOOK PASS
    </automated>
  </verify>
  <acceptance_criteria>
    - Import statement `import { isFeatureEnabled } from "@/lib/feature-flags";` added near top of file (with other imports)
    - `ALL_PRIMARY_NAV` constant declared with 8 entries (full IA reference; matches pre-edit PRIMARY_NAV content byte-for-byte except renamed)
    - `PRIMARY_NAV` derived as `ALL_PRIMARY_NAV.filter(...)` with 3 explicit conditional drops (pipeline / company / reports each gated by `!isFeatureEnabled("X")`) + 1 hardcoded drop (people via `return false`)
    - 3 isFeatureEnabled calls use `!isFeatureEnabled("NAME")` (negate; default deny) for PIPELINE/COMPANY/REPORTS
    - `people` item dropped via hardcoded `if (item.key === "people") return false;` (NOT via isFeatureEnabled — per nwrp232 OQ #3 path (b))
    - NO `isFeatureEnabled("PEOPLE")` call anywhere in file (would fail TypeScript compile since PEOPLE removed from FeatureFlagName union)
    - NO `=== "false"`, NO `=== ""`, NO `Boolean(process.env...)` patterns
    - Existing `ACCESS` Record (lines 83-93) UNCHANGED
    - Existing `show` map (lines 259-269) UNCHANGED — runtime role gate preserved
    - Desktop nav render (lines 322-336) UNCHANGED — still `PRIMARY_NAV.map(...)` (now reads filtered list)
    - Mobile nav render (lines 416-431) UNCHANGED — still `PRIMARY_NAV.map(...)`
    - `npm run build` exits 0
    - Hook regex sweep on touched lines PASSES (no new design-token violations)
    - With all 6 Vercel flags at `""`, the filtered PRIMARY_NAV has exactly 4 items: today, jobs, financials, price_intel
  </acceptance_criteria>
  <done>
    Top nav reduced from 8 to 4 + Admin dropdown on both desktop and mobile by build-time array filter (3 flag-driven drops + 1 hardcoded people drop per nwrp232 OQ #3 path (b)). Reversibility: flip any flag to "true" in Vercel + redeploy → section reappears without code change (people excepted — un-hides via code change at F2/Wave-2).
  </done>
</task>

<task type="auto" depends_on="[1]">
  <name>Task 3: Middleware 404 gates (12 path families, dual gate for Owner Portal, JSON-vs-HTML response split, hardcoded /people gate per nwrp232 OQ #3 path (b))</name>
  <read_first>
    - C:/Users/Jake/nightwork-platform/src/middleware.ts (full file; reference lines 139-167 updateSession + auth gate, 155-167 JSON 401 precedent, 188-209 platform-admin block, 211-281 design-system block + 263-268 HTML 404 precedent, 284-291 admin/platform API gate)
    - C:/Users/Jake/nightwork-platform/src/lib/feature-flags.ts (just created)
    - C:/Users/Jake/nightwork-platform/.planning/phases/internal-launch-hide/internal-launch-CONTEXT.md (D-05 — full insertion point + gate ordering + response shape spec)
  </read_first>
  <files>src/middleware.ts</files>
  <action>Add a new 404 gate block in `middleware()` function BETWEEN the platform-admin block (ends at line 209) and the design-system block header (starts at line 211). Insertion is AFTER `updateSession()` at line 141 (preserves Sentry tags) AFTER platform-admin block (staff can debug hidden Owner Portal via impersonation per CLAUDE.md §Platform admin) and BEFORE design-system block (which is platform-presentation, not tenant — flags don't apply per CONTEXT D-05 rationale).

**Per nwrp232 OQ #3 path (b): the /people gate is HARDCODED (no isFeatureEnabled check; no env var). The other 6 gates use isFeatureEnabled. Total: 7 gate blocks (6 flag-driven + 1 hardcoded for /people).**

**Specific edit:**

1. Add import at top (alphabetical, near line 2):
```ts
import { isFeatureEnabled, type FeatureFlagName } from "@/lib/feature-flags";
```

2. Insert NEW block AFTER closing brace of platform-admin block (after line 209) and BEFORE the design-system block comment header (before line 211). Exact code to insert:

```ts
  // Internal-Launch Phase 1 — feature-flag 404 gates (HIDE per nwrp227,
  // CONTEXT D-05). Insertion point: AFTER platform-admin block (line 209)
  // AND AFTER updateSession (line 141) so Sentry tags (user_id, org_id,
  // impersonation_active, platform_admin) are stamped on requests that hit
  // these 404s. Insertion BEFORE design-system block (line 211) because
  // design-system is platform-presentation (sample data; not tenant) and
  // feature flags don't apply.
  //
  // Gate ordering inside this block: Owner Portal dual-gate FIRST (most
  // sensitive — built at full external-grade security rigor but staying
  // hidden until external launch per locked-scope §DEFERRED). Section
  // gates next, ordered alphabetically by path. Sub-route gates last.
  //
  // Response shape per CONTEXT D-05:
  //   /api/* paths → NextResponse.json({ error: "Not found" }, { status: 404 })
  //     (matches existing /api/* JSON 401 precedent at lines 157-162; client
  //      JS expects JSON, not HTML rewrite, on API endpoints)
  //   non-API paths → NextResponse.rewrite(notFoundUrl, { status: 404 })
  //     (matches existing design-system 404 rewrite at lines 263-268; rewrite
  //      not redirect because a 3xx redirect leaks the route's existence; 404
  //      makes the path indistinguishable from any unknown route)
  //
  // Reversibility: flip NEXT_PUBLIC_FEATURE_<NAME> to "true" in Vercel
  // Production OR Preview env vars + redeploy → route re-exposes without
  // code changes (Rule 1 runtime AC during /nightwork-qa). EXCEPTION:
  // /people is hardcoded per nwrp232 OQ #3 path (b) — un-hides at F2/Wave-2
  // via code change (no env-var flip path).

  // Helper: 404 response with the correct shape per path family.
  // Defined inline (not extracted to a util) so the middleware file remains
  // the single source of truth for the 404 response posture.
  const respond404 = (): NextResponse => {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }
    const notFoundUrl = request.nextUrl.clone();
    notFoundUrl.pathname = "/_not-found";
    notFoundUrl.search = "";
    return NextResponse.rewrite(notFoundUrl, { status: 404 });
  };

  // OWNER PORTAL — DUAL GATE (most sensitive surface; per CONTEXT D-05).
  // Both /owner/* AND /api/owner-portal/* must 404 when flag off, even on
  // direct URL access (PUBLIC_PATHS at lines 16-49 enumerates 4 entries that
  // bypass auth-redirect; this gate fires AFTER auth gate at line 155-167
  // so the PUBLIC_PATHS bypass already let the request through — that's
  // expected; we want the gate to fire regardless of auth state).
  // Reversibility: flip NEXT_PUBLIC_FEATURE_OWNER_PORTAL → "true" + redeploy
  // → both gates re-open. External-launch flip path per locked-scope §DEFERRED.
  if (!isFeatureEnabled("OWNER_PORTAL")) {
    if (pathname === "/owner" || pathname.startsWith("/owner/")) {
      return respond404();
    }
    if (pathname.startsWith("/api/owner-portal/")) {
      return respond404();
    }
  }

  // PIPELINE — entire section + sub-routes.
  if (!isFeatureEnabled("PIPELINE")) {
    if (pathname === "/pipeline" || pathname.startsWith("/pipeline/")) {
      return respond404();
    }
  }

  // COMPANY — entire section + sub-routes.
  if (!isFeatureEnabled("COMPANY")) {
    if (pathname === "/company" || pathname.startsWith("/company/")) {
      return respond404();
    }
  }

  // REPORTS — entire section + sub-routes.
  if (!isFeatureEnabled("REPORTS")) {
    if (pathname === "/reports" || pathname.startsWith("/reports/")) {
      return respond404();
    }
  }

  // PEOPLE — entire section + sub-routes (including /people/clients per
  // CONTEXT D-03 + /people/vendors per nwrp232 Disposition 1).
  // HARDCODED HIDE per nwrp232 OQ #3 path (b) — no env var; no
  // isFeatureEnabled check. Reasoning per Jake's disposition: People is
  // F2/Wave-2 build that doesn't exist yet; the env var's whole value
  // (cheap flip-back) doesn't apply since /people will ship as code, not
  // a flag-flip. Un-hides as part of eventual /people build via code
  // change (remove this block).
  //
  // pathname.startsWith("/people/") catches /people/clients, /people/vendors,
  // /people/team, /people/org-chart, and any future sub-routes. The
  // pathname === "/people" exact match catches the section root.
  if (pathname === "/people" || pathname.startsWith("/people/")) {
    return respond404();
  }

  // PRICE INTEL F5 — 7 placeholder sub-routes ONLY (not the /price-intel
  // root, which re-exports /cost-intelligence — a working surface per
  // src/app/price-intel/page.tsx:21 + GROUNDED-INVENTORY §3). The 7
  // F5-placeholder sub-routes are enumerated explicitly so we don't
  // accidentally gate the /price-intel root or any future REAL-LOGIC
  // re-mount that doesn't follow the placeholder pattern.
  //
  // Note: /price-intel/cost-lookup is a REAL-LOGIC re-export of
  // /cost-intelligence/lookup — NOT in the F5 hide list. /price-intel/verification
  // IS in the F5 hide list per CONTEXT D-05 (the production verification UI
  // remains accessible at /cost-intelligence/verification, which is NOT gated).
  if (!isFeatureEnabled("PRICE_INTEL_F5")) {
    const priceIntelF5Routes = [
      "/price-intel/anomaly-review",
      "/price-intel/bid-comparison",
      "/price-intel/cost-database",
      "/price-intel/material-orders",
      "/price-intel/selections-catalog",
      "/price-intel/vendor-performance",
      "/price-intel/verification",
    ];
    for (const route of priceIntelF5Routes) {
      if (pathname === route || pathname.startsWith(`${route}/`)) {
        return respond404();
      }
    }
  }

  // FINANCIALS F1 ORG-WIDE VIEWS — 2 placeholder sub-routes (Coming F1
  // per src/app/financials/page.tsx:27-28) + 2 Caldwell-fixture-mount
  // Wave-2 routes (/jobs/[id]/schedule + /financials/reconciliation per
  // locked-scope §HIDE row 4). All 4 gated by the same flag because
  // they're conceptually "Wave-2 post-internal-launch financial UI" —
  // re-expose together when F1 + Wave-2 ship (BUNDLE confirmed per
  // nwrp232 OQ #1 disposition; separate _SCHEDULE flag rejected per
  // Jake quote: "a semantic distinction with zero practical value at
  // launch (both hidden, both stay hidden till their wave)").
  //
  // /jobs/{id}/schedule uses a path-match (not startsWith on a fixed
  // prefix) because {id} is a dynamic segment.
  if (!isFeatureEnabled("FINANCIALS_F1_VIEWS")) {
    if (
      pathname === "/financials/change-orders" ||
      pathname.startsWith("/financials/change-orders/") ||
      pathname === "/financials/purchase-orders" ||
      pathname.startsWith("/financials/purchase-orders/") ||
      pathname === "/financials/reconciliation" ||
      pathname.startsWith("/financials/reconciliation/")
    ) {
      return respond404();
    }
    // /jobs/{any-id}/schedule + sub-paths
    if (/^\/jobs\/[^/]+\/schedule(\/.*)?$/.test(pathname)) {
      return respond404();
    }
  }
```

**Insertion location verification (executor must double-check before edit):**
Read current `src/middleware.ts:209` — must be the closing `}` of the platform-admin block (the last line of `if (...) { ... if (!user) { ... } if (!isPlatformAdmin) { ... } // Authorized — fall through to response. }`). Read line 211 — must be the `// Design-system playground gate (Stage 1.5a T18.5 / SPEC B7).` comment header. If line numbers have drifted, find the block by content match: insertion goes AFTER the `// Authorized — fall through to response.` comment that closes platform-admin and BEFORE `// Design-system playground gate (Stage 1.5a T18.5 / SPEC B7).` comment header.

**Why dual gate for Owner Portal even though PUBLIC_PATHS allows it through anonymously:** Per CONTEXT D-05 rationale — Owner Portal is built at full external-grade security rigor (B-2a + B-2b) but the explicit goal is "staying hidden until external launch." Token resolution at the page handler would 404 invalid tokens, BUT a valid token (test fixture or leaked) would render the portal. The middleware gate is independent of token state — flag off = 404 regardless of token. Reversibility: flip flag → both gates re-open; existing token resolution + acknowledgment endpoints work identically to pre-Phase-1 state.

**Why the regex for /jobs/{id}/schedule:** The schedule route is `src/app/jobs/[id]/schedule/page.tsx` — `[id]` is a Next.js dynamic segment that matches any non-empty string. The regex `/^\/jobs\/[^/]+\/schedule(\/.*)?$/` matches `/jobs/{anything}/schedule` AND `/jobs/{anything}/schedule/anything`. Test cases: `/jobs/abc/schedule` matches; `/jobs/abc/schedule/foo` matches; `/jobs/abc` does NOT match; `/jobs/abc/budget` does NOT match.

**Don't:** Don't add a flag for `/financials` root — the root section is working (Bills/Pay Apps/etc.). Don't 404 `/cost-intelligence/*` — that's the working surface that `/price-intel` root re-exports. Don't 404 `/admin/*` — Admin dropdown items reach placeholder pages (intentional per CONTEXT — placeholder cards are IA scaffolding). Don't change PUBLIC_PATHS (lines 16-49) — keep Owner Portal entries intact so the gate can be flipped off cleanly. Don't change `updateSession` or any code at lines 1-209 — pure insertion at line 210. **Don't use `isFeatureEnabled("PEOPLE")` for the /people gate** — PEOPLE is NOT in the FeatureFlagName union per nwrp232 OQ #3 path (b); use hardcoded `if (pathname === "/people" || pathname.startsWith("/people/")) { return respond404(); }`.
  </action>
  <verify>
    <automated>
# 1. Import added
grep -n "from \"@/lib/feature-flags\"" src/middleware.ts
# Expected: 1 line near top imports

# 2. respond404 helper defined inline
grep -c "const respond404 = " src/middleware.ts
# Expected: 1

# 3. All 6 flags gated via isFeatureEnabled (OWNER_PORTAL, PIPELINE, COMPANY, REPORTS, PRICE_INTEL_F5, FINANCIALS_F1_VIEWS) — PEOPLE NOT via isFeatureEnabled per nwrp232 OQ #3 path (b)
grep -E 'isFeatureEnabled\("(OWNER_PORTAL|PIPELINE|COMPANY|REPORTS|PRICE_INTEL_F5|FINANCIALS_F1_VIEWS)"\)' src/middleware.ts | wc -l
# Expected: 6 (one isFeatureEnabled call per flag-driven gate block; PEOPLE gate is hardcoded — does NOT match the isFeatureEnabled\("..." regex)

# 4. PEOPLE gate hardcoded (not via isFeatureEnabled)
! grep -E 'isFeatureEnabled\("PEOPLE"\)' src/middleware.ts
# Expected: exit 0 (no matches — PEOPLE not a flag)

# 5. Hardcoded /people pathname check present (catches both /people exact + /people/* sub-routes)
grep -E 'pathname === "/people" \|\| pathname\.startsWith\("/people/"\)' src/middleware.ts
# Expected: 1 match

# 6. Owner Portal DUAL gate present (both /owner/* AND /api/owner-portal/*)
grep -E 'pathname.*startsWith\("/owner/"\)' src/middleware.ts
grep -E 'pathname.*startsWith\("/api/owner-portal/"\)' src/middleware.ts
# Expected: both match

# 7. /jobs/{id}/schedule regex present
grep -E 'jobs\\\\/\[\^\\\/\]\+\\\\/schedule' src/middleware.ts
# Expected: 1 match (regex literal in source)

# 8. JSON-vs-HTML response shape split present
grep -A 4 "const respond404" src/middleware.ts | grep -E "pathname.startsWith.*api"
# Expected: api/ path check inside respond404

# 9. PUBLIC_PATHS UNCHANGED
git diff src/middleware.ts | grep -E "^-\s*\"/owner\"|^-\s*\"/api/owner-portal" | wc -l
# Expected: 0 (no PUBLIC_PATHS lines removed)

# 10. updateSession line UNCHANGED
git diff src/middleware.ts | grep -E "^-\s*const \{ response, user, gate, isPlatformAdmin \} = await updateSession" | wc -l
# Expected: 0

# 11. Insertion AFTER platform-admin block — verify by reading line numbers (manual eyeball OK; structural check):
grep -n "Internal-Launch Phase 1 — feature-flag 404 gates" src/middleware.ts | head -1 | awk -F: '{print $1}'
# Expected: line number > 209 AND < 235 (i.e., between platform-admin block end and design-system block start)

# 12. Type build clean
npx tsc --noEmit
# Expected: no errors

# 13. Build clean
npm run build 2>&1 | grep -E "Error|error" | grep -v "no errors\|ESLint\|0 errors" | head -5
# Expected: empty
    </automated>
  </verify>
  <acceptance_criteria>
    - Import `import { isFeatureEnabled, type FeatureFlagName } from "@/lib/feature-flags";` added near top of file
    - `respond404` helper defined ONCE inline (returns JSON 404 for `/api/*`, HTML 404 rewrite for non-API)
    - 7 gate blocks present (6 flag-driven via isFeatureEnabled + 1 hardcoded pathname check for PEOPLE), in this order: OWNER_PORTAL (dual: /owner/* + /api/owner-portal/*) → PIPELINE → COMPANY → REPORTS → PEOPLE (hardcoded, no isFeatureEnabled per nwrp232 OQ #3 path (b)) → PRICE_INTEL_F5 (7 explicit sub-routes) → FINANCIALS_F1_VIEWS (3 financials sub-routes + /jobs/{id}/schedule regex)
    - Each flag-driven gate uses `pathname === "/x" || pathname.startsWith("/x/")` pattern (matches existing platform-admin precedent at lines 188-192)
    - PEOPLE gate uses hardcoded `if (pathname === "/people" || pathname.startsWith("/people/")) { return respond404(); }` (NO isFeatureEnabled call — PEOPLE not in FeatureFlagName union per nwrp232 OQ #3 path (b))
    - NO `isFeatureEnabled("PEOPLE")` call anywhere in file (would fail TypeScript compile)
    - Owner Portal DUAL gate covers BOTH `/owner` + `/owner/*` AND `/api/owner-portal/*` (4 PUBLIC_PATHS entries from lines 16-49 all covered)
    - PEOPLE hardcoded gate fires for `/people/clients` AND `/people/vendors` (both caught by `pathname.startsWith("/people/")`; no carve-out per D-03 + nwrp232 Disposition 1)
    - PRICE_INTEL_F5 gate explicitly enumerates 7 sub-routes from CONTEXT D-05 (does NOT gate /price-intel root or /price-intel/cost-lookup)
    - FINANCIALS_F1_VIEWS gate covers `/financials/change-orders`, `/financials/purchase-orders`, `/financials/reconciliation`, AND `/jobs/{any-id}/schedule` (regex `/^\/jobs\/[^/]+\/schedule(\/.*)?$/`) — schedule BUNDLED under this flag per nwrp232 OQ #1 disposition
    - Insertion point is AFTER the platform-admin closing brace (line ~209) AND BEFORE the `// Design-system playground gate` comment header (line ~211)
    - Existing PUBLIC_PATHS (lines 16-49) UNCHANGED (zero deletions in git diff)
    - Existing `updateSession` call (line 141) UNCHANGED
    - Existing platform-admin block (lines 188-209) UNCHANGED
    - Existing design-system block (lines 211-281) UNCHANGED
    - Existing admin/platform API gate (lines 284-291) UNCHANGED
    - Existing billing gate (lines 297-307) UNCHANGED
    - `npx tsc --noEmit` passes
    - `npm run build` exits 0
    - No `=== "false"` or other forbidden idioms anywhere in file
  </acceptance_criteria>
  <done>
    Middleware gates all 12 path families (OWNER_PORTAL dual + 4 flag-driven section gates + 1 hardcoded /people gate per nwrp232 OQ #3 path (b) + 7 PRICE_INTEL_F5 sub-routes + 4 FINANCIALS_F1_VIEWS routes including /jobs/{id}/schedule regex bundled per nwrp232 OQ #1). Gates fire AFTER updateSession (Sentry tags preserved). Reversibility: flip any flag to `"true"` + redeploy → corresponding route re-exposes (EXCEPT /people which un-hides via code change at F2/Wave-2).
  </done>
</task>

<task type="auto" depends_on="[]">
  <name>Task 4: PerJobTabs — reduce PRIMARY_TABS + reduce moreBaseItems + ADD Purchase Orders (PO clarification resolved)</name>
  <read_first>
    - C:/Users/Jake/nightwork-platform/src/components/nav/per-job-tabs.tsx (full file; reference lines 64-71 PRIMARY_TABS, 73-97 moreBaseItems, 99-113 morePhaseItems, 343-373 mobile collapse composition)
    - C:/Users/Jake/nightwork-platform/src/app/jobs/[id]/purchase-orders/page.tsx (lines 1-50 — confirms route is fully-working real-DB UI, 15KB)
    - C:/Users/Jake/nightwork-platform/.planning/phases/internal-launch-hide/internal-launch-CONTEXT.md (D-06 — static array removal NOT per-tab env-var gating)
  </read_first>
  <files>src/components/nav/per-job-tabs.tsx</files>
  <action>Per CONTEXT D-06: static array removal (NOT per-tab env-var gating). Drop 2 from `PRIMARY_TABS` (Schedule + Selections — Q2=A of EXPANDED-SCOPE), drop 12 from `moreBaseItems` (the 14 Wave-2/F2/F3/F4/F5 items minus Change Orders + Activity which stay), and **ADD** `{ href: "/jobs/${jobId}/purchase-orders", label: "Purchase Orders" }` (PO clarification resolution: option (a) from CONTEXT — `/jobs/[id]/purchase-orders` exists as 15KB working real-DB UI; 1-line align with EXPANDED-SCOPE §7 + GROUNDED-INVENTORY intent "More ▾ collapses to CO + PO + Activity").

`morePhaseItems` (lines 99-113) UNCHANGED per D-06 — Closeout/Warranty/Pre-Con are job-lifecycle phase contexts, NOT feature placeholders, not in locked-scope HIDE list.

**Specific edits:**

1. Replace lines 64-71 (PRIMARY_TABS) with reduced 4-tab list:
```ts
// Internal-Launch Phase 1 (CONTEXT D-06 / EXPANDED-SCOPE Q2=A):
// Static array removal — Schedule + Selections dropped from PRIMARY_TABS
// per locked-scope §HIDE. /jobs/[id]/schedule middleware-404'd by
// FINANCIALS_F1_VIEWS flag (Wave-2 Caldwell-fixture-mount route per Plan
// Task 3). /jobs/[id]/selections renders a placeholder card directly
// (not middleware-gated per locked-scope; reachable by direct URL but
// not promoted via this nav). Wave-2 unhide path: re-add literal entry.
const PRIMARY_TABS = [
  { key: "overview", label: "Overview", path: "" },
  { key: "budget", label: "Budget", path: "/budget" },
  { key: "bills", label: "Bills", path: "/bills" },
  { key: "pay_apps", label: "Pay Apps", path: "/pay-apps" },
];
```

2. Replace lines 73-97 (moreBaseItems function body) with reduced 3-item list (Change Orders + Purchase Orders + Activity):
```ts
// Internal-Launch Phase 1 (CONTEXT D-06): More ▾ collapses to CO + PO +
// Activity per EXPANDED-SCOPE §7 + GROUNDED-INVENTORY. 12 Wave-2/F2/F3/F4/F5
// items dropped: Plans, Specs, Photos, Documents, RFIs, Submittals, Daily
// Logs, To-Dos, Punchlist, Time Entries, Permits, Team. Wave-2 unhide path:
// re-add literal entries.
//
// PO clarification (CONTEXT "Surface at plan-phase" — RESOLVED option a):
// /jobs/[id]/purchase-orders exists as a fully-working real-DB UI (~15KB
// /jobs/[id]/purchase-orders/page.tsx); the prior moreBaseItems list omitted
// it. Adding the literal entry aligns the nav with EXPANDED-SCOPE §7 +
// GROUNDED-INVENTORY intent ("More ▾ collapses to CO + PO + Activity").
function moreBaseItems(jobId: string): DropdownItem[] {
  return [
    { href: `/jobs/${jobId}/change-orders`, label: "Change Orders" },
    { href: `/jobs/${jobId}/purchase-orders`, label: "Purchase Orders" },
    { href: `/jobs/${jobId}/activity`, label: "Activity" },
  ];
}
```

3. Leave `morePhaseItems` (lines 99-113) UNCHANGED.

4. Leave `allTabsAsDropdownItems` composition (lines 367-373) UNCHANGED — automatically picks up the reduced PRIMARY_TABS + moreBaseItems via spread.

5. Leave all SubNavDropdown rendering, keyboard handling, mobile-collapse logic (lines 117-340 + 343-439) UNCHANGED.

**With internal launch state (PRIMARY_TABS reduced + moreBaseItems reduced):**
- Desktop (`md:flex`): Overview | Budget | Bills | Pay Apps | More ▾ → [Change Orders, Purchase Orders, Activity, Closeout-if-phase, Warranty-if-phase, Pre-Con-if-phase]
- Mobile (`md:hidden`): single dropdown with [Overview, Budget, Bills, Pay Apps, Change Orders, Purchase Orders, Activity, ...morePhaseItems]
- Both surfaces driven from the same source arrays (PRIMARY_TABS + moreBaseItems + morePhaseItems) so the reduction takes effect identically on both viewports.

**Don't:** Don't add env-var gating to individual tabs (per D-06 — would explode env-var surface; static removal chosen). Don't touch SubNavDropdown helper (lines 117-340). Don't touch the mobile-collapse render logic (lines 428-435). Don't add a feature-flag import to this file (D-06 explicit — no env-var conditionals). Don't reorder the kept items — Change Orders → Purchase Orders → Activity is the intentional locked-scope sequence.
  </action>
  <verify>
    <automated>
# 1. PRIMARY_TABS reduced to 4 entries
grep -A 8 "const PRIMARY_TABS = \[" src/components/nav/per-job-tabs.tsx | grep -c "key:"
# Expected: 4

# 2. Schedule + Selections DROPPED from PRIMARY_TABS (no longer present)
grep -E 'key: "(schedule|selections)"' src/components/nav/per-job-tabs.tsx | wc -l
# Expected: 0

# 3. moreBaseItems reduced to 3 entries
grep -A 8 "function moreBaseItems" src/components/nav/per-job-tabs.tsx | grep -c "href:"
# Expected: 3

# 4. Change Orders + Purchase Orders + Activity all present in moreBaseItems
grep -E 'label: "(Change Orders|Purchase Orders|Activity)"' src/components/nav/per-job-tabs.tsx | wc -l
# Expected: 3

# 5. 12 dropped items NOT present in moreBaseItems
for item in Plans Specs Photos Documents RFIs Submittals "Daily Logs" "To-Dos" Punchlist "Time Entries" Permits Team; do
  if grep -E "label: \"$item\"" src/components/nav/per-job-tabs.tsx | grep -q .; then
    echo "FAIL: $item still present"
  fi
done
# Expected: no output (all 12 dropped)

# 6. morePhaseItems UNCHANGED (Closeout/Warranty/Pre-Con references intact)
grep -E "label: \"(Closeout|Warranty|Pre-Con)\"" src/components/nav/per-job-tabs.tsx | wc -l
# Expected: 3

# 7. No isFeatureEnabled import added to this file (D-06 explicit)
! grep -c "from \"@/lib/feature-flags\"" src/components/nav/per-job-tabs.tsx
# Expected: exit 0 (no match)

# 8. SubNavDropdown component definition UNCHANGED (helper preserved)
grep -c "function SubNavDropdown" src/components/nav/per-job-tabs.tsx
# Expected: 1 (still defined)

# 9. allTabsAsDropdownItems composition UNCHANGED (line ~367)
grep -A 6 "const allTabsAsDropdownItems" src/components/nav/per-job-tabs.tsx | grep -c "\\.\\.\\."
# Expected: 2 (spread of PRIMARY_TABS map + spread of moreItems)

# 10. Type build clean
npx tsc --noEmit
# Expected: no errors

# 11. Build clean
npm run build 2>&1 | grep -E "Error|error" | grep -v "no errors\|ESLint\|0 errors" | head -5
# Expected: empty
    </automated>
  </verify>
  <acceptance_criteria>
    - `PRIMARY_TABS` array has exactly 4 entries with keys: overview, budget, bills, pay_apps
    - `PRIMARY_TABS` does NOT contain `key: "schedule"` or `key: "selections"`
    - `moreBaseItems(jobId)` returns exactly 3 entries with labels: "Change Orders", "Purchase Orders", "Activity"
    - `moreBaseItems` entries in order: Change Orders → Purchase Orders → Activity
    - `moreBaseItems` does NOT contain any of: Plans, Specs, Photos, Documents, RFIs, Submittals, Daily Logs, To-Dos, Punchlist, Time Entries, Permits, Team
    - `morePhaseItems` function UNCHANGED — still returns Closeout for phase ∈ {"closeout", "active"}, Warranty for "warranty", Pre-Con for "pre_con"
    - SubNavDropdown component definition (lines 127-340) UNCHANGED
    - `allTabsAsDropdownItems` composition at line 367-373 UNCHANGED (still spreads PRIMARY_TABS + moreItems)
    - Desktop render block (lines 389-425) UNCHANGED
    - Mobile collapse render block (lines 428-435) UNCHANGED
    - NO `isFeatureEnabled` import in this file (D-06 explicit — static removal pattern, no env-var conditionals)
    - `npx tsc --noEmit` passes
    - `npm run build` exits 0
    - With phase="active": More ▾ contains [Change Orders, Purchase Orders, Activity, Closeout] (4 items)
    - With phase="warranty": More ▾ contains [Change Orders, Purchase Orders, Activity, Warranty] (4 items)
  </acceptance_criteria>
  <done>
    PerJobTabs primary tabs reduced from 6 to 4; More ▾ dropdown reduced from 14 to 3 base items + phase-aware items unchanged. PO route (existing working real-DB UI) added per CONTEXT PO clarification resolution. Single source of truth (PRIMARY_TABS + moreBaseItems) drives both desktop and mobile renders via existing composition.
  </done>
</task>

<task type="auto" depends_on="[1]">
  <name>Task 5: Filter section-overview Card grids on /financials, /admin, /people, /company, /pipeline, /reports</name>
  <read_first>
    - C:/Users/Jake/nightwork-platform/src/app/financials/page.tsx (lines 21-29 FINANCIALS_SECTIONS — 7 cards; F1 entries at 27-28)
    - C:/Users/Jake/nightwork-platform/src/app/admin/page.tsx (lines 30-49 ADMIN_TILES — 12 cards pre-edit; 3 status:"live", 9 status:"placeholder". POST-edit: 13 cards (4 live + 9 placeholders) — adds Owner Portal Tokens entry per checker WARNING #4 / phased-plan AC line 133)
    - C:/Users/Jake/nightwork-platform/src/app/admin/owner-portal-tokens/page.tsx (confirms route exists; 15KB B-2a server component; status="live")
    - C:/Users/Jake/nightwork-platform/src/app/people/page.tsx (lines 13-19 PEOPLE_SECTIONS — 5 cards; 1 live, 4 not — per nwrp232 Disposition 1: Vendors becomes live:false)
    - C:/Users/Jake/nightwork-platform/src/app/company/page.tsx (lines 12-25 COMPANY_SECTIONS — 12 cards; 1 live, 11 not — per nwrp232 W-3: Overview becomes live:false)
    - C:/Users/Jake/nightwork-platform/src/app/pipeline/page.tsx (lines 18-24 PIPELINE_SECTIONS — 5 Wave-4 cards; none live)
    - C:/Users/Jake/nightwork-platform/src/app/reports/page.tsx (lines 12-18 REPORTS_SECTIONS — 5 Wave-3 cards; none live)
    - C:/Users/Jake/nightwork-platform/src/lib/feature-flags.ts (just created)
  </read_first>
  <files>src/app/financials/page.tsx, src/app/admin/page.tsx, src/app/people/page.tsx, src/app/company/page.tsx, src/app/pipeline/page.tsx, src/app/reports/page.tsx</files>
  <action>For each of the 6 section-overview pages, add an import for `isFeatureEnabled` from `@/lib/feature-flags` (admin uses status filter, people uses simple .live filter, others use flag), then filter the static SECTIONS array at the top of the file BEFORE the component returns its JSX. Filter applies at module level (Server Component pattern — no React state); the array passed to `.map()` is the filtered list. Each page has a slightly different filter rule based on the flag scope.

**5.1 — `src/app/financials/page.tsx`:**

Add import (after line 19 `import Badge from "@/components/nw/Badge";`):
```ts
import { isFeatureEnabled } from "@/lib/feature-flags";
```

Replace lines 21-29 (the static `FINANCIALS_SECTIONS` array) with:
```ts
// Static IA — full F1 + Live entries preserved for reference. Internal-Launch
// Phase 1 (D-04 + EXPANDED-SCOPE Q3=A) filters out F1 org-wide views
// (Purchase Orders + Change Orders) when NEXT_PUBLIC_FEATURE_FINANCIALS_F1_VIEWS
// !== "true". Wave-F1 unhide path: flip flag + redeploy → cards reappear.
const ALL_FINANCIALS_SECTIONS = [
  { href: "/financials/bills", label: "Bills", desc: "All bills — review + approve + assign", wave: "Live", live: true },
  { href: "/financials/pay-apps", label: "Pay Apps", desc: "AIA G702 / G703 draw applications", wave: "Live", live: true },
  { href: "/financials/payments", label: "Payments", desc: "Payment tracking — check pickup + mail", wave: "Live", live: true },
  { href: "/financials/lien-releases", label: "Lien Releases", desc: "Conditional + unconditional waivers", wave: "Live", live: true },
  { href: "/financials/aging", label: "Aging", desc: "Cross-job invoice aging buckets", wave: "Live", live: true },
  { href: "/financials/purchase-orders", label: "Purchase Orders", desc: "Org-wide PO list — F1 unifies job-scoped POs", wave: "F1", live: false },
  { href: "/financials/change-orders", label: "Change Orders", desc: "Org-wide change order list — F1 unifies job-scoped COs", wave: "F1", live: false },
];

const FINANCIALS_SECTIONS = ALL_FINANCIALS_SECTIONS.filter((s) => {
  // Hide F1 org-wide views unless flag is on. Live entries always shown.
  if (!s.live && !isFeatureEnabled("FINANCIALS_F1_VIEWS")) return false;
  return true;
});
```

The component body at lines 31-65 (which `.map()`s over `FINANCIALS_SECTIONS`) is UNCHANGED — it reads the filtered list.

**5.2 — `src/app/admin/page.tsx`:**

Add NO import to `src/app/admin/page.tsx` — admin uses `status === "live"` filter, NOT a flag.

Replace lines 30-49 (ADMIN_TILES const) with:
```ts
// Static IA — full 13-tile structure preserved for reference. Internal-Launch
// Phase 1 (D-04 + locked-scope §HIDE row 2): filter to status="live" entries
// only. The 9 placeholders (Roles, Permissions, Org Chart, Profile, Approval
// Workflows, Notification Rules, Workflow Customization, Integrations,
// Templates) remain in ALL_ADMIN_TILES for IA reference + future unhide path
// (when each placeholder gains real backing, flip its `status` to "live" and
// it reappears in the section overview Card grid). The AdminDropdown
// component (separate from this page) still shows all 13 items as a power-
// user shortcut per CONTEXT D-22 — that is intentional.
//
// REAL-LOGIC adds Owner Portal Tokens (4th live tile per phased-plan AC line
// 133 + checker WARNING #4). Route exists at src/app/admin/owner-portal-tokens/page.tsx
// (15KB B-2a server component; Slice-2 ship; PostgREST FK-cited embeds per
// Workflow Posture Rule 2). Tile entry was missing from pre-edit ADMIN_TILES —
// Task 5 adds it as status="live" so the section overview reflects the actual
// live surface (4 live REAL-LOGIC + 9 placeholders = 13 total).
const ALL_ADMIN_TILES: AdminTile[] = [
  // REAL-LOGIC (4)
  { href: "/admin/users", label: "Users", desc: "Manage team members, invites, and roles", status: "live" },
  { href: "/admin/cost-codes", label: "Cost Codes", desc: "5-digit AIA G703 line items per org", status: "live" },
  { href: "/admin/billing", label: "Billing", desc: "Subscription, payment method, invoices", status: "live" },
  { href: "/admin/owner-portal-tokens", label: "Owner Portal Tokens", desc: "Issued client-portal tokens — revoke + status (Slice-2 B-2a)", status: "live" },
  // F2 placeholders
  { href: "/admin/roles", label: "Roles", desc: "15-role library (Owner, GM, PM, etc.) — customizable per org", status: "placeholder", wave: "F2" },
  { href: "/admin/permissions", label: "Permissions", desc: "Per-role permission matrix (Read / Write / Approve)", status: "placeholder", wave: "F2" },
  { href: "/admin/org-chart", label: "Org Chart", desc: "Visual hierarchy — drives approval routing", status: "placeholder", wave: "F2" },
  { href: "/admin/profile", label: "Profile", desc: "Org type selector — Custom Builder / Remodeler / Commercial GC", status: "placeholder", wave: "F2" },
  // F3 placeholders
  { href: "/admin/approval-workflows", label: "Approval Workflows", desc: "Customizable approval routing per company", status: "placeholder", wave: "F3" },
  { href: "/admin/notification-rules", label: "Notification Rules", desc: "Who gets notified for what events", status: "placeholder", wave: "F3" },
  { href: "/admin/workflow-customization", label: "Workflow Customization", desc: "Adjust per-company business rules", status: "placeholder", wave: "F3" },
  // Placeholder (no source to mount — was listed REAL-LOGIC in plan but /settings/integrations
  // does not exist; per Plan 6 deviation Rule 3 auto-fix, treat as placeholder)
  { href: "/admin/integrations", label: "Integrations", desc: "QuickBooks, Buildertrend, Stripe — connection management", status: "placeholder", wave: "F3" },
  // Wave 3 placeholders
  { href: "/admin/templates", label: "Templates", desc: "Document + email templates", status: "placeholder", wave: "Wave 3" },
];

const ADMIN_TILES: AdminTile[] = ALL_ADMIN_TILES.filter((tile) => tile.status === "live");
```

The component body at lines 51-91 (which `.map()`s over `ADMIN_TILES`) UNCHANGED.

**5.3 — `src/app/people/page.tsx`:**

**Per nwrp232 OQ #3 path (b): no flag check (PEOPLE not in FeatureFlagName union). Per nwrp232 Disposition 1: Vendors marked `live: false` (Caldwell-fixture-mount; un-hides at Wave-2 real-DB swap). Filter logic retained as defensive future-state — whole /people section middleware-404'd by Task 3 hardcoded pathname check, so the filtered grid is unreachable in flag-OFF state.**

Do NOT add an import for `isFeatureEnabled` (the filter no longer uses it — PEOPLE removed from union per nwrp232).

Replace lines 13-19 (PEOPLE_SECTIONS const) with:
```ts
// Static IA — full directory preserved. Internal-Launch Phase 1:
// /people section middleware-404'd unconditionally by Task 3 hardcoded
// pathname check per nwrp232 OQ #3 path (b). The Card grid below is
// defensive future-state — when /people un-hides at F2/Wave-2 (via code
// change, NOT env-var flip), the filter renders only live entries.
//
// Per nwrp232 Disposition 1: Vendors marked live:false (Caldwell-fixture-
// mount; same architectural class as schedule; un-hides at Wave-2 real-DB
// swap). With all entries now live:false, PEOPLE_SECTIONS = empty array
// in flag-OFF state — appropriate defensive posture since users can't
// reach this page anyway via the middleware gate.
const ALL_PEOPLE_SECTIONS = [
  { href: "/people/vendors", label: "Vendors", desc: "Subcontractor + supplier directory", wave: "Wave-2", live: false },  // hidden per nwrp232 — Caldwell-fixture-mount; un-hides at Wave-2 real-DB swap
  { href: "/people/clients", label: "Clients", desc: "Client directory + relationship history", wave: "F1", live: false },
  { href: "/people/team", label: "Team", desc: "Internal team — employees, roles, comp", wave: "F2", live: false },
  { href: "/people/org-chart", label: "Org chart", desc: "Reporting structure + approval routing", wave: "F2", live: false },
  { href: "/sub-portal", label: "Sub Portal", desc: "Subcontractor self-service portal entry", wave: "F3", live: false },
];

const PEOPLE_SECTIONS = ALL_PEOPLE_SECTIONS.filter((s) => s.live);  // defensive future-state; no flag check since PEOPLE not in FeatureFlagName union per nwrp232 OQ #3 path (b); whole /people middleware-404'd hardcoded so filter is unreachable in flag-OFF state
```

Component body UNCHANGED.

**5.4 — `src/app/company/page.tsx`:**

**Per nwrp232 W-3: Overview marked `live: false` (same architectural class as /people/vendors — unreachable in flag-OFF state; un-hides at Wave-2/F4). Filter logic retained for future-state when COMPANY flag flips.**

Add import (after line 10 `import Badge from "@/components/nw/Badge";`):
```ts
import { isFeatureEnabled } from "@/lib/feature-flags";
```

Replace lines 12-25 (COMPANY_SECTIONS const) with:
```ts
// Static IA preserved. Internal-Launch Phase 1: /company section middleware-
// 404'd by Task 3 when COMPANY flag !== "true". Defensive filter for symmetry.
//
// Per nwrp232 W-3: Overview marked live:false (same architectural class as
// /people/vendors — unreachable in flag-OFF state via middleware 404; un-hides
// at Wave-2/F4 when COMPANY flag flips + real Overview content ships). With
// all entries now live:false, COMPANY_SECTIONS = empty array in flag-OFF
// state — appropriate defensive posture since users can't reach this page
// anyway via the middleware gate.
const ALL_COMPANY_SECTIONS = [
  { href: "/company/overview", label: "Overview", desc: "Cash Flow + Getting Started checklist", wave: "Wave-2/F4", live: false },
  { href: "/company/p-l", label: "P&L", desc: "Profit & loss across active jobs + overhead", wave: "F4", live: false },
  { href: "/company/cash-flow", label: "Cash Flow", desc: "Detailed cash-flow forecasting", wave: "F4", live: false },
  { href: "/company/expenses", label: "Expenses", desc: "Overhead expense tracking + categorization", wave: "F4", live: false },
  { href: "/company/time-tracking", label: "Time tracking", desc: "Labor hours across employees + jobs", wave: "F4", live: false },
  { href: "/company/compliance", label: "Compliance", desc: "OSHA + regulatory compliance tracking", wave: "Wave 2", live: false },
  { href: "/company/fleet-equipment", label: "Fleet & equipment", desc: "Vehicles + tools + equipment utilization", wave: "F4", live: false },
  { href: "/company/insurance", label: "Insurance", desc: "GL + WC + builders-risk policies", wave: "Wave 2", live: false },
  { href: "/company/permits-licensing", label: "Permits & licensing", desc: "Company licenses + recurring permits", wave: "Wave 2", live: false },
  { href: "/company/tax", label: "Tax", desc: "Estimated quarterlies + year-end prep", wave: "Wave 4", live: false },
  { href: "/company/capacity-planning", label: "Capacity planning", desc: "Active-job capacity vs PM + crew bandwidth", wave: "Wave 3", live: false },
  { href: "/company/documents", label: "Documents", desc: "Company documents — policies + templates + master agreements", wave: "Wave 2", live: false },
];

const COMPANY_SECTIONS = ALL_COMPANY_SECTIONS.filter((s) => {
  if (!s.live && !isFeatureEnabled("COMPANY")) return false;
  return true;
});
```

Component body UNCHANGED.

**5.5 — `src/app/pipeline/page.tsx`:**

Add import (after line 16 `import Badge from "@/components/nw/Badge";`):
```ts
import { isFeatureEnabled } from "@/lib/feature-flags";
```

Replace lines 18-24 (PIPELINE_SECTIONS const) — note original entries lack `live` field; add `live: false` to each. After filter, all 5 disappear when flag off (page itself is middleware-404'd anyway; this is defensive symmetry):
```ts
// All Pipeline sub-routes are Wave-4 placeholders (no live entries). Internal-
// Launch Phase 1: /pipeline section middleware-404'd by Task 3 when PIPELINE
// flag !== "true" — users never reach this page in normal flow. Defensive
// filter for symmetry (if flag flips on without re-deploy of Wave-4 content,
// grid renders empty rather than promoting placeholders).
const ALL_PIPELINE_SECTIONS = [
  { href: "/pipeline/leads", label: "Leads", desc: "CRM intake — track potential clients", wave: "Wave 4", live: false },
  { href: "/pipeline/estimates", label: "Estimates", desc: "Price Intel powered estimates", wave: "Wave 4", live: false },
  { href: "/pipeline/bids-out", label: "Bids out", desc: "Sub bids in flight", wave: "Wave 4", live: false },
  { href: "/pipeline/proposals", label: "Proposals", desc: "E-sign proposals to clients", wave: "Wave 4", live: false },
  { href: "/pipeline/contracts", label: "Contracts", desc: "Owner contracts + sub master agreements", wave: "Wave 4", live: false },
];

const PIPELINE_SECTIONS = ALL_PIPELINE_SECTIONS.filter((s) => {
  if (!s.live && !isFeatureEnabled("PIPELINE")) return false;
  return true;
});
```

Component body at lines 26-58 UNCHANGED — but note the `.map()` Badge logic currently always renders `Coming ${s.wave}`. After filter, with flag off + middleware-404 fires first, this code path is unreachable; with flag on + redeploy of Wave-4 content, the Badge should ideally render `Live` for live entries. The CURRENT Badge JSX at line 51 hardcodes `Coming ${s.wave}` — modify to:
```tsx
<Badge variant={s.live ? "success" : "neutral"}>
  {s.live ? "Live" : `Coming ${s.wave}`}
</Badge>
```
(Matches pattern from financials/page.tsx for consistency. Functional behavior with current data: all 5 entries are `live: false`, so still renders `Coming Wave 4` for everything.)

**5.6 — `src/app/reports/page.tsx`:**

Same pattern as pipeline. Add import:
```ts
import { isFeatureEnabled } from "@/lib/feature-flags";
```

Replace lines 12-18 (REPORTS_SECTIONS const):
```ts
// All Reports sub-routes are Wave-3 placeholders (no live entries). Internal-
// Launch Phase 1: /reports section middleware-404'd by Task 3 when REPORTS
// flag !== "true". Defensive filter for symmetry.
const ALL_REPORTS_SECTIONS = [
  { href: "/reports/saved", label: "Saved", desc: "Your saved + shared reports", wave: "Wave 3", live: false },
  { href: "/reports/ai-builder", label: "AI builder", desc: "Natural-language report builder", wave: "Wave 3", live: false },
  { href: "/reports/custom-builder", label: "Custom builder", desc: "Drag-and-drop report builder", wave: "Wave 3", live: false },
  { href: "/reports/scheduled", label: "Scheduled", desc: "Auto-delivered scheduled reports", wave: "Wave 3", live: false },
  { href: "/reports/templates", label: "Templates", desc: "Pre-built report templates", wave: "Wave 3", live: false },
];

const REPORTS_SECTIONS = ALL_REPORTS_SECTIONS.filter((s) => {
  if (!s.live && !isFeatureEnabled("REPORTS")) return false;
  return true;
});
```

Update Badge JSX at line 45 to match financials pattern (defensive for future live entries):
```tsx
<Badge variant={s.live ? "success" : "neutral"}>
  {s.live ? "Live" : `Coming ${s.wave}`}
</Badge>
```

**Don't:** Don't modify the component body rendering (everything below the constant definitions). Don't change the Card grid layout, Eyebrow, headline, or paragraph copy. Don't import `isFeatureEnabled` into admin/page.tsx (admin filter is `status === "live"`, not flag-driven — keep that file's import block clean). Don't import `isFeatureEnabled` into people/page.tsx (PEOPLE not in FeatureFlagName union per nwrp232 OQ #3 path (b); filter uses simple `.live` predicate). Don't add a flag for admin tile filtering — D-04 enumerates 4 read sites; section-overview pages count as ONE read site collectively; admin uses a different signal (`status` field) by design.
  </action>
  <verify>
    <automated>
# 1. 4 of 6 pages import isFeatureEnabled (financials/company/pipeline/reports — admin uses status filter, people uses simple .live filter per nwrp232 OQ #3 path (b))
for page in financials company pipeline reports; do
  if ! grep -q "from \"@/lib/feature-flags\"" "src/app/$page/page.tsx"; then
    echo "FAIL: $page missing isFeatureEnabled import"
  fi
done
# Expected: no output

# 2. Admin page does NOT import feature-flags (status filter is different signal)
! grep -q "from \"@/lib/feature-flags\"" src/app/admin/page.tsx
# Expected: exit 0

# 3. People page does NOT import feature-flags (PEOPLE not in FeatureFlagName union per nwrp232 OQ #3 path (b); simple .live filter)
! grep -q "from \"@/lib/feature-flags\"" src/app/people/page.tsx
# Expected: exit 0

# 4. People page does NOT contain isFeatureEnabled("PEOPLE") call (would fail TypeScript compile)
! grep -E 'isFeatureEnabled\("PEOPLE"\)' src/app/people/page.tsx
# Expected: exit 0

# 5. All 6 pages have ALL_*_SECTIONS or ALL_ADMIN_TILES (full IA preserved)
grep -l "ALL_FINANCIALS_SECTIONS\|ALL_ADMIN_TILES\|ALL_PEOPLE_SECTIONS\|ALL_COMPANY_SECTIONS\|ALL_PIPELINE_SECTIONS\|ALL_REPORTS_SECTIONS" src/app/financials/page.tsx src/app/admin/page.tsx src/app/people/page.tsx src/app/company/page.tsx src/app/pipeline/page.tsx src/app/reports/page.tsx | wc -l
# Expected: 6

# 6. All 6 pages have filtered const that .map() reads
for page in financials admin people company pipeline reports; do
  CONST_NAME=$(grep -E "^const (FINANCIALS_SECTIONS|ADMIN_TILES|PEOPLE_SECTIONS|COMPANY_SECTIONS|PIPELINE_SECTIONS|REPORTS_SECTIONS)" "src/app/$page/page.tsx" | head -1)
  if [ -z "$CONST_NAME" ]; then
    echo "FAIL: $page missing filtered const"
  fi
done
# Expected: no output

# 7. Admin filter uses status === "live" (not flag)
grep -E 'tile\.status === "live"' src/app/admin/page.tsx
# Expected: 1 match

# 8. People filter uses simple .live predicate (no flag check per nwrp232 OQ #3 path (b))
grep -E 'ALL_PEOPLE_SECTIONS\.filter\(\(s\) => s\.live\)' src/app/people/page.tsx
# Expected: 1 match

# 9. 4 flag-driven pages use !s.live && !isFeatureEnabled pattern (financials, company, pipeline, reports — people uses simple .live per nwrp232)
for page in financials company pipeline reports; do
  if ! grep -qE '!s\.live && !isFeatureEnabled\(' "src/app/$page/page.tsx"; then
    echo "FAIL: $page missing canonical filter pattern"
  fi
done
# Expected: no output

# 10. No forbidden idioms in any of the 6 files
for page in financials admin people company pipeline reports; do
  if grep -E '=== ?"false"|!process\.env\.NEXT_PUBLIC_FEATURE|Boolean\(process\.env\.NEXT_PUBLIC_FEATURE' "src/app/$page/page.tsx" | grep -q .; then
    echo "FAIL: $page has forbidden idiom"
  fi
done
# Expected: no output

# 11. People — Vendors entry marked live:false per nwrp232 Disposition 1
grep -E '"/people/vendors".*"Vendors".*live: false' src/app/people/page.tsx
# Expected: 1 match (Vendors hidden per nwrp232 — Caldwell-fixture-mount; un-hides at Wave-2 real-DB swap)

# 12. Company — Overview entry marked live:false per nwrp232 W-3
grep -E '"/company/overview".*"Overview".*live: false' src/app/company/page.tsx
# Expected: 1 match (Overview hidden per nwrp232 W-3 — same architectural class as /people/vendors)

# 13. Type build clean
npx tsc --noEmit
# Expected: no errors

# 14. Build clean
npm run build 2>&1 | grep -E "Error|error" | grep -v "no errors\|ESLint\|0 errors" | head -5
# Expected: empty

# 15. With current Vercel state (all 6 flags ""), counts of visible Cards per page (unreachable for people + company in flag-OFF state via middleware 404, but defensive filter renders these counts if flag flipped):
#     financials = 5 (Bills, Pay Apps, Payments, Lien Releases, Aging)
#     admin = 4 (Users, Cost Codes, Billing, Owner Portal Tokens) - per checker WARNING #4 / phased-plan AC line 133
#     people = 0 (unreachable in flag-OFF; defensive filter — Vendors now live:false per nwrp232 Disposition 1)
#     company = 0 (unreachable in flag-OFF; defensive filter retains Overview as future-state per nwrp232 W-3 — Overview now live:false)
#     pipeline = 0 (all Wave 4, none live)
#     reports = 0 (all Wave 3, none live)
# Verification done at runtime via Vercel preview walk (Rule 1).
    </automated>
  </verify>
  <acceptance_criteria>
    - All 6 pages have the static SECTIONS array renamed to `ALL_*_SECTIONS` (full IA preserved)
    - 4 of 6 pages (financials, company, pipeline, reports) import `isFeatureEnabled` from `@/lib/feature-flags`
    - Admin page does NOT import `isFeatureEnabled` — admin filter uses `tile.status === "live"` (status field, not flag)
    - People page does NOT import `isFeatureEnabled` — per nwrp232 OQ #3 path (b), PEOPLE not in FeatureFlagName union; people uses simple `.live` filter
    - People page does NOT contain `isFeatureEnabled("PEOPLE")` call (would fail TypeScript compile)
    - Each page has a filtered const (`FINANCIALS_SECTIONS`, `ADMIN_TILES`, etc.) derived via `.filter(...)` from the ALL_* version
    - Component bodies (JSX rendering, Card grid, Eyebrow, headline, paragraph copy) UNCHANGED across all 6 pages
    - 4 flag-driven pages (financials, company, pipeline, reports) use canonical filter pattern: `!s.live && !isFeatureEnabled("FLAG_NAME")` returns false (hide); otherwise return true
    - Admin page uses pattern: `tile.status === "live"` returns truthy (keep); placeholder returns falsy (hide)
    - People page uses pattern: `(s) => s.live` — defensive future-state per nwrp232 OQ #3 path (b); whole section middleware-404'd hardcoded
    - Each ALL_* array preserves the exact same entry count + content as the pre-edit static array (no data loss; IA scaffolding intact)
    - **Per nwrp232 Disposition 1: /people/vendors entry marked `live: false`** (Caldwell-fixture-mount; same architectural class as schedule; un-hides at Wave-2 real-DB swap) — wave field updated to "Wave-2" with inline comment
    - **Per nwrp232 W-3: /company/overview entry marked `live: false`** (same architectural class as /people/vendors — unreachable in flag-OFF state; un-hides at Wave-2/F4) — wave field updated to "Wave-2/F4"
    - No `=== "false"`, no `Boolean(process.env...)`, no `!process.env` patterns in any of the 6 files
    - `npx tsc --noEmit` passes
    - `npm run build` exits 0
    - Pipeline + Reports pages have Badge JSX updated to render `Live` vs `Coming ${wave}` based on `s.live` (defensive future-compat; with current data renders `Coming Wave X` for all entries)
    - With current Vercel state (all 6 flags `""`), visible card counts after filter: financials=5, admin=4 (Users, Cost Codes, Billing, Owner Portal Tokens — per checker WARNING #4 / phased-plan AC line 133), people=0 (unreachable in flag-OFF; defensive filter — Vendors now live:false per nwrp232 Disposition 1), company=0 (unreachable in flag-OFF; defensive filter — Overview now live:false per nwrp232 W-3), pipeline=0, reports=0
  </acceptance_criteria>
  <done>
    All 6 section-overview pages filter their Card grids before render. Filter logic centralized via `isFeatureEnabled` from the helper (4 pages: financials, company, pipeline, reports) plus `status === "live"` for admin and simple `.live` for people (per nwrp232 OQ #3 path (b)). Per nwrp232 Disposition 1 + W-3: Vendors + Overview marked live:false (same architectural class — Caldwell-fixture-mount / unreachable in flag-OFF state).
  </done>
</task>

<task type="auto" depends_on="[1, 2, 3, 4, 5]">
  <name>Task 6: Playwright smoke for Phase 1 (requires_smoke: true per Rule 4)</name>
  <read_first>
    - C:/Users/Jake/nightwork-platform/scripts/smoke-test.mjs (existing patterns; reference lines 1-100)
    - C:/Users/Jake/nightwork-platform/.planning/expansions/internal-launch-hide-EXPANDED-SCOPE.md §4 row 4 (Rule 4 applies)
  </read_first>
  <files>scripts/smoke-internal-launch-hide.mjs, .planning/qa-runs/internal-launch-hide/smoke-results.json</files>
  <action>Create `scripts/smoke-internal-launch-hide.mjs` — Playwright smoke runner that walks the Vercel preview URL after deploy and verifies all the falsifiable ACs from the must_haves. Output a JSON results file at `.planning/qa-runs/internal-launch-hide/smoke-results.json` (Rule 4 canonical path per CLAUDE.md Workflow Posture Rule 4 codification at `.planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-4-rules-and-playwright-PLAN.md:543` + canonical precedent at `scripts/wave-d-smoke.ts:111`) so /nightwork-qa Rule 4 enforcement can verify a passing artifact exists before PASS.

**Specific tests to include** (each as a `run(id, area, name, fn)` call matching `scripts/smoke-test.mjs` pattern):

1. **NAV REDUCTION (desktop):**
   - Navigate to `${BASE}/today` (after login)
   - Read all visible nav items via `page.locator('header[data-component="nav-bar"] nav a').allTextContents()`
   - Assert visible items EQUAL ["Today", "Jobs", "Financials", "Price Intel"] (in that order; Admin dropdown is a button, not an `<a>`)
   - Assert "Pipeline", "People", "Company", "Reports" are NOT visible

2. **NAV REDUCTION (mobile, iPhone SE viewport 375×667):**
   - Re-create context with viewport 375x667
   - Navigate to `${BASE}/today`
   - Open mobile hamburger menu
   - Assert visible nav items EQUAL ["Today", "Jobs", "Financials", "Price Intel", "Admin"] (Admin is a section in mobile view)

3. **OWNER PORTAL 404 (dual gate) — per nwrp232 W-1 path correction:**
   - Anonymous navigation to `${BASE}/owner/some-token` → expect HTTP 404
   - Anonymous POST to `${BASE}/api/owner-portal/admin/revoke-token` with dummy JSON body → expect HTTP 404 (NOT 401). The 404 proves the middleware gate fires BEFORE the route handler (which would return 401 for missing auth). Body shape: `{ token_id: "invalid-test-id", expected_updated_at: "2025-01-01T00:00:00Z" }`. Assert response body `{ error: "Not found" }` and HTTP status 404.

   **Why path correction per nwrp232 W-1:** Original smoke #3 posted to `${BASE}/api/owner-portal/admin?id=test` — NOT a real route. Returns 404 regardless of flag (route doesn't exist) so doesn't actually prove the middleware gate fires. The real route is `/api/owner-portal/admin/revoke-token` at `src/app/api/owner-portal/admin/revoke-token/route.ts`; the middleware gate covers it via `pathname.startsWith("/api/owner-portal/")`. POST to this real path + assert 404 (not 401) = proof the middleware gate fires before the handler.

4. **SECTION 404s (anonymous OR authed; route gates are auth-agnostic per CONTEXT D-05):**
   - GET `${BASE}/pipeline` → 404
   - GET `${BASE}/pipeline/leads` → 404
   - GET `${BASE}/company` → 404
   - GET `${BASE}/company/p-l` → 404
   - GET `${BASE}/reports` → 404
   - GET `${BASE}/reports/saved` → 404
   - GET `${BASE}/people` → 404
   - GET `${BASE}/people/vendors` → 404 (no carve-out; hardcoded /people gate per nwrp232 OQ #3 path (b) + Vendors marked live:false per nwrp232 Disposition 1)
   - GET `${BASE}/people/clients` → 404 (per D-03)

5. **PRICE_INTEL_F5 sub-route 404s:**
   - GET `${BASE}/price-intel/anomaly-review` → 404
   - GET `${BASE}/price-intel/verification` → 404
   - GET `${BASE}/price-intel` → 200 (re-exports working /cost-intelligence)
   - GET `${BASE}/price-intel/cost-lookup` → 200 (real-logic re-export)

6. **FINANCIALS_F1_VIEWS 404s:**
   - GET `${BASE}/financials/change-orders` → 404
   - GET `${BASE}/financials/purchase-orders` → 404
   - GET `${BASE}/financials/reconciliation` → 404
   - GET `${BASE}/jobs/{any-existing-job-id}/schedule` → 404
   - GET `${BASE}/financials` → 200 (root section visible)
   - GET `${BASE}/financials/bills` → 200 (live sub-route)

7. **SECTION OVERVIEW CARD COUNTS (authed):**
   - Navigate to `${BASE}/financials` → count Card components → expect 5 (Bills, Pay Apps, Payments, Lien Releases, Aging)
   - Navigate to `${BASE}/admin` → expect 4 (Users, Cost Codes, Billing, Owner Portal Tokens — per checker WARNING #4 / phased-plan AC line 133)
   - (`/people`, `/company` already 404'd by middleware; can't reach to verify card counts unless flag flipped; with nwrp232 Disposition 1 + W-3 both Vendors + Overview now live:false so even if reachable both grids render empty)

8. **PER-JOB TABS (visit any existing job):**
   - Navigate to `${BASE}/jobs/{first-job-id}` (read first job id via Supabase GET)
   - Read primary tabs via `page.locator('[data-direction] nav a, .md\\:flex a').allTextContents()` (selector may need adjustment per current per-job-tabs.tsx)
   - Assert primary tabs EQUAL ["Overview", "Budget", "Bills", "Pay Apps"] (4 items, no Schedule, no Selections)
   - Hover/click "More" button → assert dropdown items EQUAL ["Change Orders", "Purchase Orders", "Activity"] (+ phase items if any)

9. **EXISTING ROUTES NO REGRESSION:**
   - Verify each loads 200: `/today`, `/jobs`, `/invoices`, `/invoices/queue`, `/draws`, `/cost-intelligence`, `/price-intel` (root), `/admin/users`, `/admin/cost-codes`, `/admin/billing`

10. **REVERSIBILITY SPOT CHECK (manual; documented in smoke output):**
    - The smoke script alone CANNOT reversibly flip a Vercel env var (that requires CLI + redeploy). Add a final test that logs: "REVERSIBILITY VERIFICATION: requires manual `vercel env rm NEXT_PUBLIC_FEATURE_PIPELINE --yes preview` + `vercel env add NEXT_PUBLIC_FEATURE_PIPELINE preview true` + `vercel deploy --prod=false` + re-run smoke → expect /pipeline returns 200." Record as `note` field in the result, status `MANUAL`.
    - Note: /people NOT included in reversibility spot-check (hardcoded per nwrp232 OQ #3 path (b); un-hides via code change not env-var flip).

Use the existing `scripts/smoke-test.mjs` skeleton (`run`, `addResult`, `snap`, `gotoWait` helpers — copy them; do NOT modify the main smoke-test.mjs). Output results JSON to `.planning/qa-runs/internal-launch-hide/smoke-results.json` (relative path from CWD; the path must match exactly what `/nightwork-qa` Rule 4 enforcer reads). **The script MUST call `mkdirSync(path.dirname(RESULTS_PATH), { recursive: true })` BEFORE the first writeFileSync** so the `.planning/qa-runs/internal-launch-hide/` directory is auto-created on fresh clones (matches canonical pattern at `scripts/wave-d-smoke.ts:795`).

**Results file shape (JSON):**
```json
{
  "phase": "internal-launch-hide",
  "timestamp": "2026-05-26T...",
  "base_url": "https://<vercel-preview-url>",
  "total": <N>,
  "passed": <N>,
  "failed": <N>,
  "manual": <N>,
  "results": [
    { "id": 1, "area": "Nav", "name": "Desktop nav shows 4 sections + Admin", "status": "PASS", "note": "" },
    ...
  ]
}
```

**Execute environment:**
- Local: `BASE_URL=http://localhost:3000 node scripts/smoke-internal-launch-hide.mjs` (when dev server running)
- Vercel preview: `BASE_URL=https://<preview-url>.vercel.app node scripts/smoke-internal-launch-hide.mjs` (after deploy)

**Don't:** Don't write secrets, login credentials, or real client data into the JSON results. Don't hardcode a specific Vercel preview URL — read from `BASE_URL` env var. Don't add Drummond fixture data references in the script (use the first job ID via dynamic Supabase query OR fall back to skipping job-tab tests if no jobs exist). Don't modify the existing `scripts/smoke-test.mjs` — create a new file. **Don't keep the original smoke #3 path (`/api/owner-portal/admin?id=test`)** — per nwrp232 W-1, use `/api/owner-portal/admin/revoke-token` (the real route) so the smoke actually proves the middleware gate fires.

**Note on test job fixture:** For test #8 (per-job tabs), the script can either:
- (a) Query Supabase via service role for the first active job and use that id (preferred for accuracy)
- (b) Skip with `status: "SKIP"` and `note: "no test job available — recommend running on fixture-harness-org"` if no service role available

Either is acceptable; (b) is fine for /nightwork-qa Rule 4 pass.
  </action>
  <verify>
    <automated>
# 1. Script exists
test -f scripts/smoke-internal-launch-hide.mjs && echo "SMOKE SCRIPT EXISTS"

# 2. Script uses Playwright
grep -q "from 'playwright'" scripts/smoke-internal-launch-hide.mjs
# Expected: match

# 3. Script reads BASE_URL from env (not hardcoded)
grep -E "process\\.env\\.BASE_URL" scripts/smoke-internal-launch-hide.mjs
# Expected: 1 match

# 4. Script writes to .planning/qa-runs/internal-launch-hide/smoke-results.json (Rule 4 canonical path)
grep -E "qa-runs/internal-launch-hide/smoke-results\\.json" scripts/smoke-internal-launch-hide.mjs
# Expected: 1 match

# 4b. Script auto-creates output directory via mkdirSync (canonical pattern per scripts/wave-d-smoke.ts:795)
grep -E "mkdirSync\\(.*\\.planning/qa-runs/internal-launch-hide.*recursive: true" scripts/smoke-internal-launch-hide.mjs
# Expected: 1 match (RESULTS_PATH dirname auto-created)

# 5. All 10 test categories present (by area string)
for area in "Nav (desktop)" "Nav (mobile)" "Owner Portal" "Section 404" "Price Intel F5" "Financials F1" "Section overview" "Per-job tabs" "No regression" "Reversibility"; do
  if ! grep -q "$area" scripts/smoke-internal-launch-hide.mjs; then
    echo "MISSING: $area"
  fi
done
# Expected: no output (all present)

# 6. Per nwrp232 W-1: smoke #3 posts to the REAL Owner Portal admin route (revoke-token), NOT the non-existent admin?id=test path
grep -E "/api/owner-portal/admin/revoke-token" scripts/smoke-internal-launch-hide.mjs
# Expected: 1+ match (real route used in smoke #3)

# 6b. Per nwrp232 W-1: smoke #3 does NOT post to the non-existent admin?id=test path
! grep -E "/api/owner-portal/admin\\?id=test" scripts/smoke-internal-launch-hide.mjs
# Expected: exit 0 (no match — old path corrected per nwrp232 W-1)

# 7. Script does NOT contain hardcoded credentials, real client data, or Drummond fixture refs
! grep -E "(rossbuilt|drummond|Drummond|RossBuilt2026|jakeross)" scripts/smoke-internal-launch-hide.mjs
# Expected: exit 0 (no matches — uses fixture data or env vars only)

# 8. Smoke script syntactically valid JS
node --check scripts/smoke-internal-launch-hide.mjs
# Expected: no output (parse OK)

# 9. Production runtime AC (Rule 1): execute against Vercel preview AFTER deploy
#    (executor runs this as part of /nightwork-qa preparation; this verify block
#     can mock-run against localhost during plan execute if dev server is up):
# BASE_URL=https://<vercel-preview>.vercel.app node scripts/smoke-internal-launch-hide.mjs
# cat .planning/qa-runs/internal-launch-hide/smoke-results.json | jq '.failed'
# Expected: 0
    </automated>
  </verify>
  <acceptance_criteria>
    - File `scripts/smoke-internal-launch-hide.mjs` exists (≥150 lines)
    - Uses Playwright (`import { chromium } from 'playwright'`)
    - Reads `BASE_URL` from `process.env.BASE_URL` (no hardcoded URL)
    - Writes results JSON to `.planning/qa-runs/internal-launch-hide/smoke-results.json` (Rule 4 canonical path per CLAUDE.md Workflow Posture Rule 4 + precedent at `scripts/wave-d-smoke.ts:111`)
    - Calls `mkdirSync(path.dirname(RESULTS_PATH), { recursive: true })` BEFORE first writeFileSync (auto-creates output dir on fresh clones; matches `scripts/wave-d-smoke.ts:795` precedent)
    - Covers all 10 test areas listed in `<action>`:
      (1) Nav desktop=4+Admin, (2) Nav mobile=4+Admin, (3) Owner Portal dual 404 — per nwrp232 W-1 posts to REAL `/api/owner-portal/admin/revoke-token` (not the non-existent `?id=test` path); asserts HTTP 404 (not 401) which proves middleware gate fires before handler, (4) Section 404s (pipeline/company/reports/people/people-clients/people-vendors), (5) Price Intel F5 sub-route 404s + root 200, (6) Financials F1 404s + root 200, (7) Section overview card counts, (8) Per-job tabs reduced, (9) Existing routes 200, (10) Reversibility note (MANUAL status; /people NOT in reversibility — hardcoded per nwrp232 OQ #3 path (b))
    - Per nwrp232 W-1: smoke #3 uses real route `/api/owner-portal/admin/revoke-token` — proves middleware gate fires BEFORE route handler (404 not 401 when flag off)
    - Per nwrp232 W-1: smoke #3 does NOT use the original non-existent `/api/owner-portal/admin?id=test` path (would have returned 404 by default — wouldn't actually prove the gate fires)
    - JSON output schema includes: phase, timestamp, base_url, total, passed, failed, manual, results[]
    - Each result has: id (number), area (string), name (string), status (PASS/FAIL/PARTIAL/MANUAL/SKIP), note (string)
    - Script passes `node --check` (syntax valid)
    - No hardcoded credentials, real client names, or Drummond fixture references
    - Test job ID resolution either via dynamic Supabase query OR SKIP if unavailable
    - Smoke run against Vercel preview produces `.planning/qa-runs/internal-launch-hide/smoke-results.json` with `failed=0` (validated during /nightwork-qa)
  </acceptance_criteria>
  <done>
    Smoke harness script ready. /nightwork-qa Rule 4 enforcer can mechanically verify `.planning/qa-runs/internal-launch-hide/smoke-results.json` exists + `failed=0` before PASS. Per nwrp232 W-1: smoke #3 path corrected to real Owner Portal admin route (`/api/owner-portal/admin/revoke-token`) — proves middleware gate fires (HTTP 404 not 401) before the route handler.
  </done>
</task>

</tasks>

<threat_model>

## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Anonymous → /owner/* + /api/owner-portal/* | Owner portal is built at full external-grade security rigor (B-2a + B-2b) but staying hidden. Untrusted token-bearing requests cross here. |
| Anonymous → all gated section paths | Anyone with the URL can hit /pipeline /company /reports /people directly. /people is hardcoded-404'd per nwrp232 OQ #3 path (b); others are flag-driven. |
| Authed PM/Diane → all gated section paths | Authed users can also hit gated paths via direct URL. |
| Vercel env var consumer (Next.js build) → bundled flag value | The 6 NEXT_PUBLIC_FEATURE_* env vars are inlined at build time. Operator misconfig (wrong value in Vercel UI) shipped via redeploy. PEOPLE is NOT in this set per nwrp232 OQ #3 path (b) — hardcoded in middleware. |
| Sentry tag pipeline (updateSession) → middleware return path | Gates must fire AFTER updateSession to preserve user_id/org_id/impersonation_active/platform_admin tags. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-ilh-01 | Spoofing | NEXT_PUBLIC_FEATURE_* env var values | accept | Operator-controlled via Vercel dashboard with audit log; flag flip requires Vercel auth + redeploy. Low blast radius: 404 vs 200 toggle on already-built routes, no data writes, no privilege escalation. PEOPLE NOT spoofable via env var per nwrp232 OQ #3 path (b) — hardcoded in middleware (code change required to un-hide). |
| T-ilh-02 | Tampering | Middleware 404 gate could be circumvented by header spoofing | accept | Gates check pathname only (no header-based bypass). No verification-bypass-style escape hatch added (unlike design-system gate). Production-fail-closed by construction. |
| T-ilh-03 | Repudiation | Hidden Owner Portal access via valid token + flag off would 404 silently | mitigate | Per CONTEXT D-05: 404 gate is BEFORE token resolution, so anyone with a valid token AND the URL still 404s. Reversibility: flip flag → both gates re-open, existing token flow resumes identically. Documented in plan §Open-Q-2. No silent token leak. |
| T-ilh-04 | Information Disclosure | Owner Portal routes leaking existence via 4xx vs 5xx response codes | mitigate | All gated paths return identical HTTP 404 (HTML rewrite for non-API; JSON for API). Path is indistinguishable from any unknown route. Matches design-system gate precedent at lines 263-268. No "405 Method Not Allowed" or "403 Forbidden" — explicit 404 with `/_not-found` rewrite. |
| T-ilh-05 | Information Disclosure | Sentry tags lost on gated requests would hamper debugging | mitigate | Insertion point AFTER updateSession at line 141 (CONTEXT D-05 rationale). Verified by middleware ordering test (executor reads file line numbers in Task 3 read_first; AC includes line-number verification). |
| T-ilh-06 | Denial of Service | Middleware regex `/^\/jobs\/[^/]+\/schedule(\/.*)?$/` runs on every request | accept | Regex is anchored + bounded + has no catastrophic backtracking (`[^/]+` matches non-`/`, no alternation). Runs once per request. Low CPU cost. |
| T-ilh-07 | Elevation of Privilege | Operator flips wrong flag → wrong section exposed | accept | Each flag controls ONE section family (4 flag-driven sections + 1 Owner Portal + 1 F1-views composite + 1 hardcoded /people). Reversibility is also the audit trail: if /pipeline appears wrongly, flip _PIPELINE back to "" + redeploy. Vercel audit log records env-var changes with operator + timestamp. PEOPLE not exposable via env var per nwrp232 OQ #3 path (b). |
| T-ilh-08 | Tampering | Section-overview Card grid filter could be bypassed via direct URL to hidden card route | mitigate | Section-overview filter (Task 5) is a discovery hide; middleware gate (Task 3) is the security boundary. Both apply: hidden cards CANNOT be reached because the underlying routes 404. Audit AC: for each hidden card on each filtered page, the linked href must 404 per Task 3 gate (mechanical cross-check via /nightwork-qa security-reviewer grep). |
| T-ilh-09 | Configuration Drift | Vercel env var named slightly differently in Production vs Preview (e.g., NEXT_PUBLIC_FEATURES_PIPELINE typo) | mitigate | Centralized FLAG_ENV_VALUE Record in src/lib/feature-flags.ts is the single source of truth for flag names. Mechanical AC: grep `process.env.NEXT_PUBLIC_FEATURE_` in src/lib/feature-flags.ts returns 6 (all 6 flags). Vercel-side names verified in SETUP-COMPLETE.md MANUAL §1 (already validated via `vercel env ls production`). PEOPLE not in env-var surface per nwrp232 OQ #3 path (b) — no Vercel-side state to drift. |
| T-ilh-10 | Information Disclosure | PUBLIC_PATHS still lists Owner Portal entries even when flag off | accept | PUBLIC_PATHS is for auth-redirect bypass only (anon visitors don't redirect to login); the 404 gate fires AFTER the auth gate so PUBLIC_PATHS allowing the request through does NOT undo the 404. Verified by reading middleware ordering. Keeping PUBLIC_PATHS intact = clean flag-flip reversibility. |

**Severity overall:** LOW (per locked-scope §HIDE threat-model — env-var pattern proven (W.1 precedent), no schema changes, no financial-logic changes, no data writes, no new endpoints; failure mode = wrong section renders = no data loss; visible to user; reversible by flipping env var (except /people which requires code change per nwrp232 OQ #3 path (b))).

</threat_model>

<open_questions_for_jake>

## Open questions surfaced at plan-review (status after nwrp232 dispositions)

1. **Schedule flag association — RESOLVED via nwrp232 OQ #1 disposition: BUNDLE under FINANCIALS_F1_VIEWS.** Jake quote: "A separate _SCHEDULE flag costs another Vercel env-add (Prod+Preview) before /nx for a semantic distinction with zero practical value at launch (both hidden, both stay hidden till their wave). If they ever need independent un-hide, split then — trivial. Don't pay setup friction now for unused flexibility." Plan body already bundled this; no revision needed. /jobs/{id}/schedule stays in the FINANCIALS_F1_VIEWS gate block (Task 3 regex `/^\/jobs\/[^/]+\/schedule(\/.*)?$/`); 2 Wave-2 routes (schedule + reconciliation) hide+expose together when F1 ships.

2. **Owner Portal 404 vs 403 disposition (T-ilh-03):** The plan returns 404 (matches CONTEXT D-05 explicit + design-system gate precedent). A bank or auditor with knowledge of the Owner Portal architecture COULD infer "404 + flag presence = portal is built but hidden" by correlating Vercel env-var listings with public route 404s. Mitigation: Vercel env vars are private; the public surface returns identical 404 for hidden routes AND for unknown routes. Recommend: **stay with 404.** FLAG FOR JAKE: confirm. (Not blocking; left as recommendation awaiting Jake confirm per nwrp232.)

3. **People flag granularity — RESOLVED via nwrp232 OQ #3 disposition: path (b) HARDCODED, NOT a 7th env var.** Jake quote: "(b) HARDCODED startsWith('/people') 404, NOT a 7th env var. Going against plan default deliberately: (a) adds another Vercel env-add + SETUP-COMPLETE update (more manual work from me) to buy flag-flip reversibility — but unlike Owner Portal (known future re-expose, so the flip is valuable), People is F2/Wave-2 build that doesn't exist yet. I won't flip People back on as a flag; when it ships it ships as code. The env-var's whole value (cheap flip-back) doesn't apply here. Hardcode it; un-hides as part of the eventual People build. (b)'s revision cost is the executor's and small." Revisions applied to Tasks 1+2+3+5: PEOPLE removed from FeatureFlagName union; nav-bar uses hardcoded `if (item.key === "people") return false;`; middleware uses hardcoded pathname check (no isFeatureEnabled call); people/page.tsx uses simple `.live` filter (no isFeatureEnabled import).

4. **Empty Card grids on /people, /company, /pipeline, /reports after middleware-404:** Middleware 404s the page entirely, so the empty-grid scenario is unreachable in normal flow. If Jake wants the page to gracefully render an empty state OR redirect (e.g., redirect /pipeline → /today instead of 404 rewrite), that's a UX call. Recommend: **stay with 404 rewrite** — matches design-system precedent (404 hides the route's existence; redirect leaks via 3xx). FLAG FOR JAKE: confirm. (Not blocking; left as recommendation awaiting Jake confirm per nwrp232.) Per nwrp232 Disposition 1 + W-3 reframe: /people/vendors and /company/overview now marked live:false — both grids render empty even if reachable (which they aren't in flag-OFF state due to middleware 404).

</open_questions_for_jake>

<verification>

## Phase-level verification (cross-cutting acceptance)

### Mechanical AC (grep + build):
- [ ] `grep -rn "isFeatureEnabled\\(" src/` returns ≥10 matches (Task 1 helper + Task 2 nav-bar 3 (PIPELINE+COMPANY+REPORTS; PEOPLE hardcoded per nwrp232 OQ #3 path (b)) + Task 3 middleware 6 (PEOPLE hardcoded) + Task 5 section-overviews 4 (financials/company/pipeline/reports; admin uses status; people uses .live per nwrp232))
- [ ] `grep -rn "process.env.NEXT_PUBLIC_FEATURE_" src/` returns exactly 6 matches (6 in feature-flags.ts FLAG_ENV_VALUE Record; PEOPLE removed per nwrp232 OQ #3 path (b); W.1 flag `NEXT_PUBLIC_AUTH_STATE_LISTENER` in use-current-role.ts does NOT match the `NEXT_PUBLIC_FEATURE_` regex prefix — different env-var family. D-04 mechanical: helper owns the FEATURE env-var reads)
- [ ] `! grep -rEn '=== ?"false"|!process\\.env\\.NEXT_PUBLIC_FEATURE|Boolean\\(process\\.env\\.NEXT_PUBLIC_FEATURE' src/` returns no matches (D-04 forbidden idioms)
- [ ] `! grep -rEn 'isFeatureEnabled\\("PEOPLE"\\)' src/` returns no matches (PEOPLE not in FeatureFlagName union per nwrp232 OQ #3 path (b); call would fail TypeScript compile)
- [ ] `npm run build` exits 0 with no errors
- [ ] `npx tsc --noEmit` exits 0
- [ ] `.claude/hooks/nightwork-post-edit.sh` passes on all 10 modified files (Rule 8: touched-lines-only)

### Runtime AC on Vercel preview (Rule 1: schema verification ≠ runtime verification):
- [ ] After deploy to Vercel preview with all 6 flags at "" (current Vercel state; PEOPLE NOT a 7th env var per nwrp232 OQ #3 path (b)):
  - Nav shows Today | Jobs | Financials | Price Intel + Admin ▾ on desktop AND mobile
  - All 12 path families return 404 per must_haves.truths
  - All section-overview Card grids show only live entries (people + company grids unreachable due to middleware 404)
  - All existing routes (today/jobs/invoices/draws/cost-intelligence/etc.) load 200
  - Sentry tags present on requests that hit the new 404 gates (verified by triggering one 404 + checking Sentry event for user_id tag)
- [ ] Reversibility spot-check: flip NEXT_PUBLIC_FEATURE_PIPELINE to "true" in Vercel Preview + redeploy → `/pipeline` returns 200 with the placeholder Card grid visible
- [ ] /people reversibility NOT tested — hardcoded per nwrp232 OQ #3 path (b); un-hides at F2/Wave-2 via code change (no env-var flip path)
- [ ] Smoke artifact `.planning/qa-runs/internal-launch-hide/smoke-results.json` exists + `failed=0` (Rule 4 Playwright pre-QA enforcer; canonical path per CLAUDE.md Workflow Posture Rule 4)

### /nightwork-qa reviewer set (per EXPANDED-SCOPE §9 step 4):
- spec-checker — AC parity against this PLAN.md
- custodian — sweep marks phase done
- security-reviewer — middleware regex correctness + Owner Portal 404 dual gate + fail-closed verification + JSON-vs-HTML response shape + smoke #3 path correction per nwrp232 W-1
- nightwork-design-system-reviewer — no design-token drift in modified files; section-overview Card grids still match SYSTEM.md
- (Skip: nightwork-ai-logic-tester — no DB queries; nightwork-data-portability — no new entities; nightwork-rls-auditor — no new RLS)

</verification>

<success_criteria>

Phase 1 complete when:

1. **All 6 tasks pass acceptance criteria** (verified by /nightwork-qa)
2. **Build + typecheck clean**: `npm run build` + `npx tsc --noEmit` both exit 0
3. **Smoke artifact present**: `.planning/qa-runs/internal-launch-hide/smoke-results.json` with `failed=0` (Rule 4 Playwright pre-QA enforcer; canonical path per CLAUDE.md Workflow Posture Rule 4); smoke #3 uses real `/api/owner-portal/admin/revoke-token` path per nwrp232 W-1
4. **Runtime verified on Vercel preview** (Rule 1): all 12 path families 404 with flags off; flip-one-flag-on test confirms reversibility (people excluded — hardcoded per nwrp232 OQ #3 path (b))
5. **Sentry tags preserved** on requests hitting new 404 gates (verified by triggering one 404 + checking Sentry event)
6. **/nightwork-qa PASS** with 5 reviewers (spec-checker + custodian + security-reviewer + nightwork-design-system-reviewer; ai-logic-tester / data-portability / rls-auditor skipped per EXPANDED-SCOPE)
7. **Jake sign-off gate**: Jake visually confirms 4-section + Admin dropdown spec on Vercel preview (desktop + mobile) → custodian sweep marks Phase 1 done. **STOPS here — does NOT roll into Phase 2.**

Cost discipline:
- $50 halt-gate ceiling per nwrp227 (original $25 → nwrp231 bump (1 bump per Rule 7c) → nwrp232 extends to cover revision cycle). Per-plan halt $50 per Rule 7d.
- Plan-author self-resolution of overrun BANNED per Rule 7a.
- Max 1 bump per slice per Rule 7c (used in nwrp231).

Hook discipline:
- All commits go through `.claude/hooks/nightwork-pre-commit.sh` + `.githooks/pre-commit`.
- Drummond grep gate not triggered (no Drummond fixtures touched).
- Execute-Phase footer per TD-NW-HOOK-EXECUTE-PHASE-DETECT: commits carry `Execute-Phase: internal-launch-hide-task-N`.

</success_criteria>

<output>

After completion, create `.planning/phases/internal-launch-hide/internal-launch-SUMMARY.md` per CLAUDE.md SUMMARY conventions (commit references, build outcomes, AC results, Vercel preview URL, smoke results path, Jake sign-off log).

</output>
