# Spec check -- Phase stage-1.5c-information-architecture

## Acceptance criteria

AC source: structured criteria blocks in each plan PLAN.md (retrofitted in commit 6ed6b21 per nwrp89 GATE-A.2 for Plans 4/5/6; authored for Plans 1/2/3 in commit 52fa8ff). Harness run #25735210768 on HEAD 7fa0725: PASS=159 / FAIL=0 / SKIP=4 (unchanged from prior run #25703521075 on accb55f -- no regressions from GATE-B.1 autofixes).

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| AC-1.5c-1-01 | 8-section nav renders in correct order on desktop | COVERED | src/components/nav-bar.tsx PRIMARY_NAV array; harness Layer 1 PASS |
| AC-1.5c-1-02 | Admin dropdown opens; 13 items; Org Settings first | COVERED | src/components/nav/admin-dropdown.tsx ADMIN_ITEMS 13 items |
| AC-1.5c-1-03 | PlatformAdminBadge platform_admins-only; nw-white-sand + border-default; no hex | COVERED | src/components/nav/platform-admin-badge.tsx; hex grep = 0 |
| AC-1.5c-1-04 | Mobile hamburger expands 8 items + Admin + Sign Out | COVERED | nav-bar.tsx mobileOpen block; harness Layer 1 PASS |
| AC-1.5c-1-05 | Bell + badge + theme toggle top-right pinned | COVERED | nav-bar.tsx flex siblings of hamburger button |
| AC-1.5c-1-06 | ACCESS Record data-driven shape | COVERED | nav-bar.tsx; harness Layer 1 PASS |
| AC-1.5c-1-07 | redirect to /today in root; /dashboard 308-redirects | COVERED | src/app/page.tsx; next.config.mjs permanent:true = 50 |
| AC-1.5c-1-08 | /today renders 8-section nav with Site Office aesthetic | PARTIAL -- V.3 N/A | Body AC-1-9 PASS @ 0.95; nav N/A per V.3 harness limitation; Jake OBSERVATION A confirms production nav renders correctly |
| AC-1.5c-1-09 | /today three-section scaffold | COVERED | src/app/today/page.tsx three-section code; harness PASS @ 0.95 |
| AC-1.5c-1-10 | permanent:true count >= 44 | COVERED | Actual = 50 verified live |
| AC-1.5c-1-11 | 12 existing redirect rules preserved | COVERED | SUMMARY: 12 destinations updated |
| AC-1.5c-1-12 | D-20 wildcard /admin/platform/:path* present | COVERED | Plan 7 smoke redirect 8 PASS 308 |
| AC-1.5c-1-13 | /admin/billing in BILLING_ESCAPE_PATHS; no redirect loop | COVERED | src/middleware.ts; Plan 7 smoke redirect 10 PASS |
| AC-1.5c-1-14 | NwPlaceholderCard.tsx with NwPlaceholderCardProps | COVERED | File present; COMPONENTS.md grep = 4 |
| AC-1.5c-1-15 | Build + all hooks silent; hex = 0 | COVERED | 150 pages compiled; hex grep admin/platform-admin = 0 |
| AC-1.5c-1-16 | Hex literal grep on 11 modified files = 0 | COVERED | Verified live |
| AC-1.5c-1-17 | pendingVerification/Conversions consumers independent of nav-bar | COVERED | SUMMARY iter-2 watchpoint W-7 |
| AC-1.5c-2-01..13 | InvoiceReviewView + BudgetView props-only; action-labels.ts; T10c; TD fixes=0; tenant-blind; build clean | COVERED | Both View files present; action-labels.ts present; grep TD-20/25/26 = 0 |
| AC-1.5c-2-AMEND-01 | BudgetView Committed column; Available replaces Balance; KPI strip | COVERED | Commit 0cb99db; BudgetView.tsx 615 LOC |
| AC-1.5c-2-AMEND-02 | Parse Confidence + Status Timeline collapsed by default | COVERED | Commit cb9aab9; InvoiceReviewView.tsx 442 LOC |
| AC-1.5c-2-AMEND-03 | BudgetView footer dev info removed | COVERED | Commit ade04b4 |
| AC-1.5c-2-AMEND-04 | WORKFLOW-INTELLIGENCE.md 39 patterns; MASTER-PLAN D-066..D-072 | COVERED | .planning/architecture/WORKFLOW-INTELLIGENCE.md present |
| AC-1.5c-3-01 | 10 NEW View components 12 total | COVERED | ls returns 12 View.tsx files |
| AC-1.5c-3-02 | All 10 NEW Views use import type for Caldwell types | COVERED | T10c hook silent; build passes |
| AC-1.5c-3-03..05 | TD-20/25/26 fixes across all 10 NEW Views | COVERED | grep returns 0 all 10 files |
| AC-1.5c-3-06 | Views tenant-blind | COVERED | grep -rE on prototypes/ = 0 |
| AC-1.5c-3-07 | 12 production page.tsx files at canonical paths | COVERED | All 12 confirmed present; build 88 pages |
| AC-1.5c-3-08..10 | Wrappers: fixtures + View + notFound; design-system-scope wrap | COVERED | grep design-system-scope on bills pay-apps budget = 2 each |
| AC-1.5c-3-11 | 11 portfolio /design-system/prototypes routes as thin wrappers | COVERED | Resolved by Plan 3a-now commit 93a83f6 |
| AC-1.5c-3-12 | Bills/Pay Apps terminology in user-visible labels | COVERED | DrawApprovalView uses Pay App; InvoiceReviewView uses Bill |
| AC-1.5c-3-13 | Owner Portal mounted with design-system-scope; W-1 documented | COVERED | owner-portal/page.tsx confirmed; SUMMARY iter-2 W-1 |
| AC-1.5c-3-14 | Mobile Approval 393x852; 56px Approve | COVERED | jobs/[id]/mobile-approval/page.tsx present; NwButton size=lg-touch |
| AC-1.5c-3-15 | Print preview preserves @media print stylesheet | COVERED | financials/pay-apps/[id]/print/page.tsx + DrawPrintView.tsx scoped style |
| AC-1.5c-3-16..17 | D-07 12-pair visual + Site Office signatures at 3 viewports | PARTIAL -- deferred to M3 walk | All 12 routes data-direction=C data-palette=B + design-system-scope confirmed; harness Layer 3 PASS; M3 phone walk = formal sign-off |
| AC-1.5c-3-18 | JobTabs removed from 9 pages | COVERED | grep = 0 across all 8 modified files; 9th implicit via REAL-route replace |
| AC-1.5c-3-19..20 | getCurrentMembership preserved; REAL vs PLACEHOLDER documented | COVERED | 11 PLACEHOLDER + 1 REAL-REPLACED with backup comment |
| AC-1.5c-3-21..23 | Build/typecheck/hooks silent; privacy clean; SEC-10 DOM = 0 | COVERED | grep data-org-id etc = 0; build 88 pages; hex = 0 |
| AC-1.5c-4-01 | NwPlaceholderCard imported not created by Plan 4 | COVERED | Pipeline sub-routes grep = 2 per file |
| AC-1.5c-4-02 | Pipeline: 6 routes | COVERED | /pipeline + 5 sub-routes confirmed |
| AC-1.5c-4-03..04 | Financials 9 sub-routes + overview; Price Intel 9 routes; canonical terminology | COVERED (component-internal rename deferred F1 per D-01) | All URLs exist; wrapper headers carry canonical labels |
| AC-1.5c-4-05 | People: 4 routes; vendors from Plan 3 | COVERED | people/page clients team org-chart + vendors confirmed |
| AC-1.5c-4-06 | Sub Portal: 3 distinct routes | COVERED | /sub-portal /sub-portal/magic/[token] /sub-portal/public/[token] present |
| AC-1.5c-4-07 | Sub Portal stubs describe F3 future-state; 3 grep tokens | COVERED | Subcontractor self-service=1; magic link=3; public read-only=1 |
| AC-1.5c-4-08 | Sub Portal stubs do NOT reflect params.token | COVERED | grep -rE params.token = 0 confirmed at 7fa0725 |
| AC-1.5c-4-09 | F3 compliance contract | COVERED | Token expiry=2; JWT-with-org-claim REJECTED=2; client_portal_access or SHA-256=7 |
| AC-1.5c-4-10 | Company: 12 routes; /company/overview from Plan 1 not duplicated | COVERED | company/* confirmed; /company/overview is Plan 1 component |
| AC-1.5c-4-11 | Reports: 6 routes; Wave 3 AI Report Builder references | COVERED | all sub-routes present; all Wave 3 badged |
| AC-1.5c-4-12 | Placeholders approx 30 LOC; NwPlaceholderCard uniform | COVERED | Sub-routes avg 17-25 LOC; all import NwPlaceholderCard; overview pages use Card grid (see NOTE) |
| AC-1.5c-4-13 | All approx 50 routes Site Office tokens; no hardcoded hex | COVERED | Post-GATE-B.1: design-system-scope wrap applied to all 43 previously unwrapped placeholders (commit 20d6ef5); cream->border-subtle fix src/app/page.tsx:163; hex grep = 0 on net-new GATE-B.1 code |
| AC-1.5c-4-14 | REAL-LOGIC re-mounts preserve getCurrentMembership verbatim | COVERED | Auth grep diff = 0 for all 10 re-mount routes |
| AC-1.5c-4-15 | REAL vs PLACEHOLDER documented per route | COVERED | SUMMARY table: 10 REAL + 1 RESTRUCTURE + 39 PLACEHOLDER |
| AC-1.5c-4-16 | Wave 3 mid-checkpoint smoke PASS | COVERED | SUMMARY Task 4: all 8 nav sections + 5 sub-routes + 3 Plan 3 routes PASS |
| AC-1.5c-5-01 | 6 primary tabs on desktop | COVERED | PRIMARY_TABS array = 6 |
| AC-1.5c-5-02 | Collapse to single dropdown on mobile per D-21 | COVERED | md:hidden/md:flex = 4 hits; mobile branch renders SubNavDropdown |
| AC-1.5c-5-03 | More dropdown contains required sub-sections | COVERED | moreBaseItems = 14 per CONTEXT D-12 |
| AC-1.5c-5-04 | layout.tsx mounts PerJobTabs with phase=active | COVERED | jobs/[id]/layout.tsx present; hardcodes phase=active |
| AC-1.5c-5-05 | Phase-aware: active shows Closeout; hides Warranty + Pre-Con | COVERED | morePhaseItems conditions verified |
| AC-1.5c-5-06 | 19 per-job placeholder routes with NwPlaceholderCard | COVERED | 19 routes confirmed; all import NwPlaceholderCard |
| AC-1.5c-5-07..08 | Bills + Pay Apps sub-tabs exist | COVERED | bills/page.tsx + pay-apps/page.tsx present |
| AC-1.5c-5-09 | Budget + schedule inherit sub-nav via layout | COVERED (mechanical) | Next.js layout chain; no page.tsx change required |
| AC-1.5c-5-10 | Active state: stone-blue underline desktop; activeLabel mobile | COVERED | borderBottom 2px solid var(--nw-stone-blue) in per-job-tabs.tsx |
| AC-1.5c-5-11 | More dropdown reuses NavDropdown UX behavior | COVERED (SubNavDropdown variant) | SubNavDropdown mirrors hybrid hover+click + keyboard nav; plan UX contract preserved |
| AC-1.5c-5-12 | Mobile responsive 4-viewport visual | PARTIAL -- deferred to M3 walk | Tailwind md: classes confirmed; visual = M3 phone walk gate |
| AC-1.5c-5-13 | Punchlist + Daily Logs reference Principle 5 multi-modal | COVERED | grep voice/video/Principle-5: punchlist=2 daily-logs=3 |
| AC-1.5c-5-14 | Zero double tab bars | COVERED | grep import JobTabs + JobTabs render = 0 across 8 files |
| AC-1.5c-6-01 | Admin overview Card grid at /admin; D-22 canonical destination | COVERED | src/app/admin/page.tsx present; redirect loop resolved |
| AC-1.5c-6-02 | 3 REAL-LOGIC admin re-mounts (Users/Billing/Cost Codes) | COVERED | All 3 files present; getCurrentMembership grep positive in all 3 |
| AC-1.5c-6-03 | 10 admin placeholders | COVERED | Post-GATE-B.1: all 8 placeholder sub-routes have design-system-scope wrap (commit 20d6ef5); 10 total confirmed |
| AC-1.5c-6-04 | /platform-admin/*: 14 surfaces | COVERED | layout.tsx + page.tsx + 12 migrated sub-routes confirmed |
| AC-1.5c-6-05 | middleware.ts extended for /platform-admin/*; same isPlatformAdmin posture | COVERED | grep -c /platform-admin middleware.ts = 7 |
| AC-1.5c-6-06 | Shared components updated | COVERED | platform-sidebar audit-row end-impersonation-button all modified |
| AC-1.5c-6-07 | SEC-9: /platform-admin/audit uses createServerClient not service-role | COVERED | grep createServerClient = 3; createServiceRoleClient = 0 |
| AC-1.5c-6-08 | iter-2 mechanical 10 verified for 15 routes | COVERED | 14/15 ZERO DIFF; 1 documented URL-path-only divergence |
| AC-1.5c-7-01 | 4 NEW canonical docs at .planning/architecture/ | COVERED | All 4 present on disk |
| AC-1.5c-7-02 | 6 EXISTING docs atomically updated in single commit 6d1c568 | COVERED | 11-file atomic commit confirmed in git log |
| AC-1.5c-7-03 | CLAUDE.md schema-aware audit-log language | COVERED | entity_type.*invoice = 1; action-labels.ts = 1; concat framing = 0 |
| AC-1.5c-7-04 | Retention/PII/Cross-org/SOC2 columns in new docs | COVERED | SUMMARY grep verifications all PASS |
| AC-1.5c-7-05 | Owner Portal F1 auth path constraint documented W-1 | COVERED | ARCHITECTURE.md section 8 |
| AC-1.5c-7-06 | >= 2 consumers per new pattern in PHILOSOPHY (4) + PATTERNS (6) | COVERED | Consumers grep = 4 PHILOSOPHY 6 PATTERNS |
| AC-1.5c-7-07 | D-040..D-065 added to MASTER-PLAN atomically; idempotency guard | COVERED | D-040/D-060/D-065 grep = 6 in MASTER-PLAN.md |
| AC-1.5c-7-08 | Final smoke: build + typecheck + 10 redirects PASS | COVERED | 10/10 redirects PASS; build 150 pages; typecheck clean |
| AC-1.5c-7-09 | NwPlaceholderCard COMPONENTS.md entry | COVERED | grep NwPlaceholderCard COMPONENTS.md = 4 |

## Spec deliverables

- [x] 8-section top nav with ACCESS map -- src/components/nav-bar.tsx
- [x] /today screen -- src/app/today/page.tsx
- [x] /company/overview -- src/app/company/overview/page.tsx
- [x] 38 308-redirect rules -- next.config.mjs permanent:true = 50
- [x] NwPlaceholderCard primitive -- src/components/nw/NwPlaceholderCard.tsx (PlaceholderWave union extended with Wave 1.1-Full in GATE-B.1 commit 20d6ef5)
- [x] AdminDropdown + PlatformAdminBadge -- src/components/nav/
- [x] design-system.css root-import -- src/app/layout.tsx grep = 1
- [x] InvoiceReviewView -- src/components/prototypes/InvoiceReviewView.tsx 442 LOC
- [x] BudgetView with Committed column -- src/components/prototypes/BudgetView.tsx 615 LOC
- [x] src/lib/audit/action-labels.ts -- present; 6 entity_type refs
- [x] AUDIT-LOG-STRATEGY.md -- .planning/phases/stage-1.5c-information-architecture/AUDIT-LOG-STRATEGY.md
- [x] WORKFLOW-INTELLIGENCE.md 39 patterns -- .planning/architecture/WORKFLOW-INTELLIGENCE.md
- [x] 10 NEW props-only View components -- 12 total in src/components/prototypes/
- [x] 12 production routes with data-direction=C data-palette=B design-system-scope wrap -- confirmed
- [x] 8 existing /jobs/[id]/* JobTabs removed -- grep = 0
- [x] Plan 3a-now: 10 portfolio prototype routes as thin wrappers -- commit 93a83f6
- [x] 50 placeholder routes Plan 4 -- all 50 files confirmed; design-system-scope wrap applied to all 43 previously unwrapped leaf pages (GATE-B.1 commit 20d6ef5)
- [x] PerJobTabs + SubNavDropdown + /jobs/[id]/layout.tsx -- src/components/nav/per-job-tabs.tsx 415 LOC
- [x] 19 per-job tab placeholder routes -- all confirmed
- [x] 13 admin routes (3 REAL + 10 placeholders + overview) -- src/app/admin/; 8 placeholder sub-routes now have design-system-scope wrap (GATE-B.1 commit 20d6ef5)
- [x] 14 /platform-admin surfaces (12 sub-routes + layout + index) -- src/app/platform-admin/
- [x] middleware.ts regex extension for /platform-admin/* -- grep = 7
- [x] Shared component dual-awareness updates -- platform-sidebar audit-row end-impersonation-button
- [x] 4 NEW canonical docs -- ARCHITECTURE.md ENTITY-INVENTORY.md ROLES-CATALOG.md INGESTION-ARCHITECTURE.md
- [x] 6 EXISTING docs atomically updated -- commit 6d1c568 11-file atomic
- [x] D-040..D-065 in MASTER-PLAN -- confirmed
- [x] Final integration smoke report -- SUMMARY Plan 7
- [x] 7 section-level layout.tsx files (AppShell wrap) -- src/app/{pipeline,financials,company,people,price-intel,reports,admin}/layout.tsx (GATE-B.1 commit 96484db; resolves QA UI FLAG-1)
- [x] next.config.mjs NEXT_PUBLIC_VERCEL_ENV passthrough -- next.config.mjs:16-18 (GATE-B.1 commit 7fa0725; resolves QA SECURITY M-1)

## Domain rules spot-check

- Drummond fixtures used: yes -- All 12 View components consume CALDWELL_* fixtures (Caldwell = sanitized Drummond per phase convention). Production routes /financials/bills/inv-caldwell-001 and /financials/pay-apps/d-caldwell-05 confirmed passing in Plan 7 smoke. ARCHITECTURE.md references AIA reference Pay App 8. GATE-B.1 changes are layout/token/env fixes with no fixture impact. No change from prior check.
- Recalculate-not-increment honored: yes -- BudgetView.tsx useMemo rows computes previous_applications this_period total_to_date percent_complete balance_to_finish committed available from source fixture rows on every render. Zero stored aggregates introduced in any Plan 1-7 file or GATE-B.1 fix file. Evidence: src/components/prototypes/BudgetView.tsx. No change from prior check.
- Multi-tenant RLS posture: pass -- SEC-10 DOM tenant-attribute leak = 0 across src/components/prototypes/ src/app/financials/ src/app/platform-admin/. Sub-portal scope-wrap files from GATE-B.1 commit 20d6ef5 confirmed params.token not reflected into HTML (grep = 0 at 7fa0725). platform_admins table query user_id-bounded per migration 00048. SEC-9 posture unchanged. No change from prior check.
- Design tokens (no hardcoded colors): pass -- GATE-B.1 commit 20d6ef5 fixes src/app/page.tsx:163 border-cream/40 to border-[var(--border-subtle)] (grep border-cream = 0 at HEAD). GATE-B.1 commit 9ef5dab removes 5 rgba lines from inline StatusBadge in admin/billing/page.tsx, replacing with NwBadge wrapper (net-new rgba additions = 0 confirmed via git diff). Residual rgba at admin/billing/page.tsx:218 and :317-319 are pre-existing from accb55f baseline, not introduced by GATE-B.1, scoped per commit message.
- Audit log writes added on every state change: N/A -- stage-1.5c-information-architecture is a pure UI/IA restructure. GATE-B.1 autofixes are layout, token hygiene, and env-passthrough changes with no write logic. action-labels.ts and AUDIT-LOG-STRATEGY.md establish the correct convention for future writes. No change from prior check.

## Findings

### BLOCKING

None.

### WARNING

1. AC-1.5c-1-08: /today 8-section nav vision criterion marked N/A (V.3 harness limitation). Harness run #25735210768 on 7fa0725 shows identical SKIP=4 count as prior run -- no regression, no resolution. Jake OBSERVATION A (production correct) stands. Post-phase harness-internals fix queued. GATE-B.1 autofixes do not change this posture.

2. admin/billing/page.tsx retains 4 residual rgba() literals at lines 218 and 317-319, carried verbatim from accb55f baseline. None introduced by GATE-B.1 (confirmed: git diff 107a213..7fa0725 shows no net-new rgba additions in that file). Commit 9ef5dab explicitly scopes the Banner and trial-section exclusions (no NwBanner primitive exists yet). Pre-existing; deferred per scope-boundary rule.

3. AC-1.5c-3-11: Plan 3 SUMMARY still marks portfolio prototype routes as DEFERRED despite Plan 3a-now (commit 93a83f6) resolving them. Documentation gap, not a code gap. Unchanged from prior check.

4. AC-1.5c-3-16/17 and AC-1.5c-5-12 formally deferred to M3 phone walk per CONTEXT D-17/Q13=A. GATE-B.1 scope-wrap additions strengthen code-level evidence. M3 phone walk remains the formal visual gate.

### NOTE

1. GROUP 1 (commit 96484db): 7 new layout.tsx files (src/app/{pipeline,financials,company,people,price-intel,reports,admin}/layout.tsx) are not individually mentioned in any PLAN.md criterion. They are remediation of QA UI FLAG-1, motivated by the PATTERNS.md authenticated-surface rule (underpins AC-1.5c-4-13 and AC-1.5c-6-01). Not over-build. The /platform-admin/* section is correctly exempt -- it has its own internal-tools header in src/app/platform-admin/layout.tsx.

2. GROUP 2 (commit 20d6ef5): 43 placeholder scope wraps close a gap where the prior check recorded AC-1.5c-4-13 as COVERED on hex-clean evidence alone. After GATE-B.1 both conditions hold: hex-clean AND scope-wrapped. Sub-portal stubs re-verified for params.token non-reflection at 7fa0725 (src/app/sub-portal/magic/[token]/page.tsx:21 has the scope wrap; grep params.token = 0). PlaceholderWave Wave 1.1-Full addition is a one-line type extension at src/components/nw/NwPlaceholderCard.tsx:21 closing a spec/impl drift against COMPONENTS.md section 7.8.

3. GROUP 3 (commit 9ef5dab): StatusBadge to NwBadge refactor in src/app/admin/billing/page.tsx:297-306 removes 5 rgba lines from the inline sub-function. The 12% to 6% tint change is intentional COMPONENTS.md convergence. Deferred Banner and trial-section rgba are correctly out of scope; introducing NwBanner to close them would be over-build for this hygiene pass.

4. GROUP 4 (commit 7fa0725): next.config.mjs env.NEXT_PUBLIC_VERCEL_ENV passthrough at lines 16-18 closes a correctness gap in the W.1 harness bridge gate. The prior condition (undefined !== production) was always true, meaning the bridge ran on every deploy including production. Fix inlines production on prod Vercel builds, preview on preview builds, empty string locally. No new business logic, no new dependencies.

5. Plan 4 REAL-LOGIC re-mounts use export-default re-exports rather than verbatim component copy. Auth posture byte-identical. Component-internal terminology gap (Invoice/Draw vs Bill/Pay App) deferred to F1 per CONTEXT D-01. Unchanged from prior check.

6. Pre-existing CSS-var-fallback hex literals in src/app/jobs/[id]/page.tsx:582-583 are documented in deferred-items.md. Out of scope. Unchanged from prior check.

7. Plan 5 SubNavDropdown vs NavDropdown: color-contract incompatibility on light sub-nav surface required sibling component. UX contract preserved. Unchanged from prior check.

8. Plan 4 section overview pages (Reports, Company) use Card grid not NwPlaceholderCard. Appropriate for navigation-hub pages. Sub-routes use NwPlaceholderCard uniformly. Unchanged from prior check.

## Verdict

PASS

Prior PASS verdict holds at HEAD 7fa0725. All 159 harness criteria PASS on HEAD 7fa0725 (FAIL=0 SKIP=4 -- identical to prior run on accb55f; no regressions). No BLOCKING findings. All 82 acceptance criteria remain COVERED (79) or PARTIAL (3, all documented).

GATE-B.1 autofixes (4 groups, 55 files, commits 96484db + 20d6ef5 + 9ef5dab + 7fa0725) are spec-consistent and within scope. No new acceptance criteria are implied by the fixes. No over-build detected. AC-1.5c-4-13 evidence is now stronger (scope-wrapped + hex-clean vs hex-clean alone in the prior check). The two pre-existing conditions in WARNINGs are unchanged.

Ship is contingent on:
1. M3 phone walk completing without CRITICAL halt criteria (AC-1.5c-3-16/17, AC-1.5c-5-12)
2. AC-1-8 harness criterion formally resolved (V.3 N/A accepted per Jake OBSERVATION A, or harness auth fix post-phase)

---
Generated: nightwork-spec-checker
Phase: stage-1.5c-information-architecture
HEAD: 7fa0725 (fix(env): NEXT_PUBLIC_VERCEL_ENV passthrough -- GATE-B.1 final commit)
Prior HEAD: accb55f (Plan 7 SUMMARY -- canonical-docs-smoke)
Re-check date: 2026-05-11
Re-check trigger: GATE-B.1 autofixes (4 groups, 55 files)
Harness run: #25735210768 PASS=159 FAIL=0 SKIP=4
