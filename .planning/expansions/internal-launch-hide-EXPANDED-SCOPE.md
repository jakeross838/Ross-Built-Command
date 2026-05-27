# Expanded scope — internal-launch-hide

**Status:** APPROVED 2026-05-26 (Q1-Q3 answered with recommended options via AskUserQuestion: 5 granular flags / HIDE Schedule+Selections from PRIMARY_TABS / HIDE F1-org-wide-views from Card grid AND middleware 404)
**Generated:** 2026-05-26
**Halt-gate ceiling:** $25 (per nwrp227; halt-gate control point, NOT believed budget; per-plan halt $50 per Rule 7d)

**Stated scope (verbatim from three durable artifacts per nwrp228 directive):**

**Source 1 — `.planning/launch/INTERNAL-LAUNCH-SCOPE-LOCKED.md` §HIDE (lines 120-135):**

> ## HIDE — Feature-Flag Off (~2 hours)
>
> Pattern: `NEXT_PUBLIC_FEATURE_*` env vars + nav-bar conditional + middleware 404 block + section-overview filtering. Same precedent as `NEXT_PUBLIC_AUTH_STATE_LISTENER` (W.1 unflag). No feature-flag library; env vars + a couple of small code changes.
>
> **Hidden surfaces:**
>
> - **Owner portal** — `/owner/*` + `/api/owner-portal/*` return 404 when flag off. Already not in internal nav; this adds the explicit middleware gate so the routes 404 even on direct URL access. Owner Portal is built (B-2a + B-2b shipped at full external-grade security rigor) — staying hidden until external launch is the explicit goal.
> - **~50 placeholder routes** — Admin F2/F3, Company Wave 2/F4, Pipeline Wave 4, People F2, Reports Wave 3, Sub Portal F3, per-job Wave 2/F2/F3/F4/F5, Price Intel F5 sub-routes, Financials F1 org-wide views.
> - **15 per-job operational tabs** — schedule, daily logs, punchlist, photos, RFIs, submittals, plans, specs, permits, warranty, pre-con, closeout, team, time-entries, to-dos.
> - **`/jobs/[id]/schedule` + `/financials/reconciliation`** — the two Caldwell-fixture-mount routes that are Wave 2 / post-Phase 3.9 scope. Hide, do not swap.
> - **Partial "Your Day" today-card** — replaced with a real launch-surface aggregate (see UI-FINALIZE in Phase 2).
>
> **Internal launch nav reduces from 8 sections to 4 + Admin:**
>
> > **Today | Jobs | Financials | Price Intel | (Admin v)**

**Source 2 — `.planning/launch/INTERNAL-LAUNCH-PHASED-PLAN.md` §Phase 1 — HIDE (lines 92-122):** the full Phase 1 spec including 4-row work-item table, 7 falsifiable ACs, Jake sign-off gate, and the $25 ceiling proposal. Quoted in full inline as Section 7 below.

**Source 3 — nwrp227 Phase 1 authorization block:**

> "PHASE 1 (HIDE) — AUTHORIZED to dispatch. Ceiling $25. HIDE is independent of the re-spec below (feature-flags + nav only; doesn't touch CO designation or the printed block). Proceed: /nightwork-init-phase -> /np for Phase 1 at $25 ceiling, per-plan $50 halt. Standard cycle through to the Phase 1 Jake sign-off gate. Stop at that gate — do NOT roll into Phase 2."

---

## 1. Mapped entities and workflows

This phase is config/UI-layer only. NO new entities. NO new tables. NO new RLS policies. NO new mutations. NO schema changes. The only data flow is environment variables read at build time (per Next.js NEXT_PUBLIC_* inlining contract) and at middleware request time.

| Concern | Surface | Current state | Notes |
|---|---|---|---|
| Env-var inlining | process.env.NEXT_PUBLIC_FEATURE_* reads in client + server bundles | Next.js inlines NEXT_PUBLIC_* at build time per the W.1 precedent at src/hooks/use-current-role.ts:62-70 | Default unset = treated as not true = feature off. Reversibility = flip env var + redeploy. |
| Nav-bar primary nav array | src/components/nav-bar.tsx:142-151 PRIMARY_NAV (8 entries: today / pipeline / jobs / financials / price_intel / people / company / reports) + role-gate show map at :259-269 | 8-section structure locked at Stage 1.5c D-040 per CLAUDE.md. Mobile nav at :404-450 iterates same array. | Filter env-var BEFORE existing role filter so role precedence preserved. |
| Per-job tabs | src/components/nav/per-job-tabs.tsx:64-71 PRIMARY_TABS (6) + :73-97 moreBaseItems (14) + :99-113 morePhaseItems (1-3) | All 6 primary tabs + 14 More items render today; only Overview + Bills + Pay Apps + Budget have real-DB backing per GROUNDED-INVENTORY (rest are placeholders or Wave 2/F2/F3/F4/F5 stubs) | Schedule + Selections are primary tabs that render placeholders. Hide both (Schedule = Caldwell-mount + Wave 2; Selections = Wave 2). |
| Middleware route gates | src/middleware.ts:188-209 (platform admin), :235-281 (design-system), :284-291 (admin/platform API) — established pattern of pathname.startsWith + return 404/redirect | Existing pattern proven. Owner Portal PUBLIC_PATHS entries at :27,32,41,48 mark routes as auth-redirect-skip; HIDE must add 404 layer BEFORE the auth-redirect-skip resolves. | Owner Portal 404 must gate BOTH /owner/* AND /api/owner-portal/* (4 entries to override). |
| Section-overview Card grids | src/app/financials/page.tsx:21-29 (7 cards), src/app/admin/page.tsx:30-49 (12 cards), src/app/people/page.tsx:13-19 (5 cards), src/app/company/page.tsx:12-25 (12 cards), src/app/pipeline/page.tsx:18-24 (5 cards), src/app/reports/page.tsx:12-18 (5 cards), src/app/price-intel/page.tsx:21 (re-exports cost-intelligence) | Static arrays; trivial to filter by env-var check | 6 section-overview pages. Price-Intel is re-export only — no card grid to filter. |

Workflow precedent for env-var-as-feature-flag pattern: NEXT_PUBLIC_AUTH_STATE_LISTENER shipped 2026-05-15 (B-1b commit 9613be7), unflagged 2026-05-26 (B-4 Task 7 commit aa3a5a4). Build-time inlining behavior, early-return pattern, Vercel env-add via CLI + Preview-via-API workaround, observation gate — all documented at .planning/tech-debt/TD-WB-LISTENER-UNFLAG.md and MASTER-PLAN §11 line 298.

---

## 2. Prerequisite gaps

What MUST exist before this phase can ship safely.

| # | Gap | Source | Blocking? |
|---|---|---|---|
| 1 | Vercel CLI access (Jake account) to add 5+ env vars to Production + Preview | nwrp227 directive: /np for Phase 1 at $25 ceiling implies executor runs vercel env add per the W.1 precedent | NON-BLOCKING for code work; BLOCKING for ship — env-add can land before or after the code merge, but reversibility-spot-check AC requires env-add complete on Vercel before sign-off. Per W.1 precedent (D-T7-VERCEL-CLI-API-FALLBACK at MASTER-PLAN §11), Preview env-var add may need direct API POST since vercel env add requires git_branch_required in non-interactive mode. |
| 2 | Owner Portal auth path commitment NOT changed by HIDE | CLAUDE.md §Owner Portal F1 auth path constraint (ARCHITECTURE.md §8, iter-2 multi-tenant W-1): 1.5c is structural — Owner Portal mounts thin-wrapper components with sanitized fixtures. F1 commits to ONE auth path — extending client_portal_access tokens (Path A) OR introducing owner_view member role with RLS (Path B). NOT both. | NOT blocking — HIDE returns 404 on the routes regardless of which auth path lands. The 404 gate sits BEFORE the auth-redirect-skip PUBLIC_PATHS check, so both Path A and Path B are unaffected. Confirmed by middleware ordering at src/middleware.ts:155-167 (auth) vs the proposed insertion point BEFORE line 155. |
| 3 | Hook calibration accepts feature-flag pattern | .claude/hooks/nightwork-pre-commit.sh Drummond grep gate + design-token regex + qa-timestamp + execute-phase-detect | NOT blocking — HIDE touches src/components/nav-bar.tsx (no Drummond fixtures); src/middleware.ts (no design tokens); src/app/{financials,admin,people,company,pipeline,reports}/page.tsx (existing tokens unchanged). The post-edit hook min-[360px]: regex sweep will not fire on env-var conditionals. Recommend /nightwork-preflight Rule 6(a) pre-flight hook regex sweep on all 8 files as standard plan-review iter-1 step. |
| 4 | NO blocking dependency on Phase 2 or later — explicit per nwrp227 | Phase 1 dispatches independently of this revision sign-off + dependency graph at INTERNAL-LAUNCH-PHASED-PLAN.md:83-89 | NOT blocking — Phase 1 can ship before Slices 3A-3D rev-2 ACs are signed. HIDE -> Phase 2 dependency is forward-only (Phase 2 finalizes on already-reduced surfaces). |

Verdict: the only true prerequisite is Vercel env-add access — and per the W.1 precedent, that is a known well-trodden path with a documented CLI + API fallback.

---

## 3. Dependent-soon gaps

What is likely needed shortly after — design for it now.

| # | Gap | Likely next phase | Design implication for HIDE |
|---|---|---|---|
| 1 | Phase 2 UI-FINALIZE depends on the 4-section + Admin nav being the user-visible state when polish lands | Phase 2 — UI-FINALIZE (locked-scope §UI-FINALIZE) | HIDE must complete + Jake sign-off BEFORE Phase 2 starts polish work, so designers/Jake polish the reduced launch surfaces rather than re-polishing after HIDE. Sequence locked per INTERNAL-LAUNCH-PHASED-PLAN.md:84-89. |
| 2 | Phase 2 Your Day card replacement (half day to 1 day) | Phase 2 — UI-FINALIZE (locked-scope §UI-FINALIZE row 5) | HIDE does NOT remove the Your Day placeholder card at src/app/today/page.tsx:143-165 — that is Phase 2 job per locked scope. Recommend: do NOT add a NEXT_PUBLIC_FEATURE_YOUR_DAY flag. Replacement is a real Phase 2 build (Open Invoices Today + Pay Apps Due This Week aggregate), not a hide. Flag here would be cosmetic over-engineering. |
| 3 | Phase 3 Slice 3C may swap routes that today look hidden via section overview (/financials/change-orders, /financials/purchase-orders) | Phase 3 — Slice 3C Caldwell swaps + future F1 org-wide views | HIDE should treat the Coming F1 Card-grid entries on /financials/page.tsx:27-28 consistently — section-overview filter must HIDE both (org-wide CO/PO views are F1 scope, not internal launch). When F1 lands they get unhidden. |
| 4 | Future re-expose path for Owner Portal at external launch | Wave 2+ external rollout (per locked-scope §DEFERRED — Future wave will flip the flag when external exposure is the explicit goal) | HIDE design: keep the env-var NEXT_PUBLIC_FEATURE_OWNER_PORTAL granular (not bundled with other gates). Flipping it ON in a future wave must re-expose /owner/* + /api/owner-portal/* without code changes. Reversibility spot-check AC verifies this. |
| 5 | Future internal launch mode toggle in onboarding flow | Wave 1.1-Full or later customer #2 onboarding | Granular per-feature env vars (5 separate flags) are STRICTLY BETTER than a single NEXT_PUBLIC_INTERNAL_LAUNCH_MODE per-tenant approach for THIS phase — the simpler alternative noted at D-ui-state-and-hiding.md:445 trades flexibility for terseness, but we are past the point where that trade is worth it. Keep granular; future per-tenant gating is its own design problem. |
| 6 | Per-job tabs PRIMARY_TABS array hides Schedule + Selections — both currently render as primary tabs | Wave 2 (Schedule per Wave 2 scope; Selections per Wave 2 scope) | PerJobTabs at src/components/nav/per-job-tabs.tsx:64-71 defines 6 primary tabs. HIDE must filter the array AT RENDER TIME by env-var checks before the existing tab-iteration loop. Wave-2 unhide path: flip flags; tabs re-appear. |

---

## 4. Cross-cutting checklist

| Concern | Status | Rationale |
|---|---|---|
| Audit logging | N/A | No mutations. Feature-flag reads write to no tables. Per CLAUDE.md activity_log is for state changes; env-var reads are not state changes. |
| Permissions | N/A — existing role-filter preserved | HIDE filters BEFORE the existing show map at src/components/nav-bar.tsx:259-269. Role precedence preserved; env-var is additional gate. |
| Optimistic locking | N/A | No write endpoints. |
| Soft-delete + status_history | N/A | No new statused entities. |
| Recalculate, do not increment | N/A | No derived totals touched. |
| Multi-tenant RLS | N/A | No new tables. Existing routes RLS untouched. Owner Portal 404 sits BEFORE token resolution, so RLS posture on /api/owner-portal/* is preserved when flag flips back on. |
| Idempotency | N/A | No write endpoints, no webhooks, no imports. |
| Background jobs | N/A | All work runs in middleware request path; no async required. |
| Rate limiting | N/A | No new endpoints; existing endpoints rate-limit posture unchanged (still effectively absent per CURRENT-STATE C.1 #3, but that is CRITICAL gate per GAP.md A.1 #3, not Phase 1 scope). |
| Observability (Sentry) | APPLIES — preserve middleware tag posture | Middleware tags (user_id, org_id, impersonation_active, platform_admin) set per request at src/middleware.ts (via updateSession). The new 404-block code MUST land AFTER updateSession so the request flows through the existing tag pipeline. Pattern verified at src/middleware.ts:141 (updateSession call) -> :147+ (gate checks). Recommend inserting feature-flag gates AFTER the platform-admin block at :188 to preserve tag-stamp order. |
| Data import/export | N/A | No new entities. |
| Document provenance | N/A | No document-shaped entities. |
| Mobile-friendly | APPLIES | Mobile nav at src/components/nav-bar.tsx:404-450 iterates the same PRIMARY_NAV array; filter at the array source. PerJobTabs at :382-438 has mobile collapse-to-dropdown at <768px per D-059; both desktop (:389-425) and mobile (:428-435) iterate the same items array — filter at source covers both. AC: confirm mobile nav matches 4-section + Admin spec on Chrome DevTools iPhone SE viewport. |
| Drummond fixtures sufficient | N/A | No data work. |
| CI test gate | APPLIES (existing posture) | No HTTP integration tests for this phase (feature flags are config; not testable as logic). Recommend manual Vercel preview walk per Rule 1 covers verification. /nightwork-qa standard reviewers (security-reviewer + custodian) suffice — no nightwork-ai-logic-tester since no DB queries. |
| Error handling for partial failures | APPLIES (lightweight) | 404 return is unambiguous; no partial-fail surface. The risk vector is leaving a route accidentally exposed because the middleware regex missed it (e.g., /owner-portal vs /api/owner-portal mismatch). AC #1 enumerates every gated path; nightwork-qa security-reviewer mechanically grep-verifies every NEXT_PUBLIC_FEATURE_* reference resolves to BOTH a middleware gate AND a section-overview/nav filter (no dangling reference). |
| Graceful degradation | APPLIES (lightweight) | process.env.NEXT_PUBLIC_FEATURE_* evaluating to undefined (env var unset) = treated as not true = feature OFF. This is FAIL-CLOSED (matches W.1 precedent at src/hooks/use-current-role.ts:67-69). AC verifies: a deploy without any of the new env vars set behaves identically to a deploy with all flags explicitly false (= internal launch nav). |
| Rule 1 (schema verification != runtime verification) | APPLIES — UI-touching plan | Phase 1 touches JSX (nav-bar, section overviews) + middleware (route handlers). Per Workflow Posture Rule 1, MUST verify on Vercel preview before /nightwork-qa PASS. All 7 ACs at INTERNAL-LAUNCH-PHASED-PLAN.md:111-117 are runtime-verifiable. |
| Rule 2 (PostgREST FK citation) | N/A | No PostgREST embeds added. |
| Rule 3 (ai-logic-tester executes representative queries) | N/A | No DB queries added. |
| Rule 4 (Playwright smoke pre-QA for UI-touching plans) | APPLIES — declare requires_smoke: true | UI-touching plan per Rule 4 definition. Smoke target: nav-bar renders 4-section + Admin spec; section overviews filter cards; middleware 404s on direct-URL access to gated paths. Recommend smoke against Vercel preview with flag env-vars set to enforce all off posture. |
| Rule 5 (files_modified intersection check before parallel dispatch) | N/A | Phase 1 is a single plan; no parallel dispatch. |
| Rule 6 (pre-flight collision checks) | APPLIES — all 4 sub-checks | (a) Hook regex sweep on 8 files (nav-bar.tsx, middleware.ts, per-job-tabs.tsx, 6 section overviews) — recommend /nightwork-preflight run. (b) Fixture-infra collision N/A (no SQL deliverables). (c) Path reachability — all 8 files git-tracked from fresh checkout (verified above). (d) Intersection check — single plan, no parallel. |
| Rule 7 (cost ceiling discipline) | APPLIES — $25 halt gate | Per nwrp227 explicit. Per-plan halt $50 per Rule 7d. Plan-author self-resolution of overrun BANNED per Rule 7a. If costs project >$25 mid-authoring, halt for Jake. If they project >$50 mid-execute, halt for Jake. |
| Rule 8 (hook fail-closed contract) | APPLIES — standard posture | All commits go through .claude/hooks/nightwork-pre-commit.sh + .githooks/pre-commit. Drummond grep NEVER bypassed (no Drummond fixtures touched). Execute-Phase footer required per TD-NW-HOOK-EXECUTE-PHASE-DETECT. Recommend commits carry footer Execute-Phase: internal-launch-hide-<task>. |
| Rule 9 (cross-reviewer factual disagreement halt) | APPLIES — standard posture | If plan-review iter-1 or QA cycle surfaces cross-reviewer disagreement (e.g., this middleware regex covers /owner-portal/admin vs no it does not), HALT for Jake per Rule 9. Standard discipline. |

---

## 5. Construction-domain checklist

This phase is config/UI-layer only. Almost every domain consideration is N/A.

| Domain consideration | Applies? | Rationale |
|---|---|---|
| Drummond as reference job | NO | No data work; no fixtures touched. Drummond grep gate is part of the hook but will not fire on the 8 modified files (none reference Drummond fixtures). |
| Field mistakes become permanent QC entries | NO | No QC/punchlist workflows touched. |
| Draw requests link to punchlist | NO | No draw workflows touched. |
| Invoice review is the gold standard UI | NO | No new review surface. Existing invoice review at src/app/invoices/[id]/page.tsx untouched. |
| Stone blue palette + Slate type system + logo top-left | NO touch to design tokens | No new colors/fonts/spacing. Section overview Cards already use Slate tokens (Eyebrow, Badge, Card — verified at src/app/financials/page.tsx). |
| Stored aggregates require rationale comments | NO | No aggregates touched. |
| Cost-plus open-book | NO direct touch | Owner Portal (the open-book client surface) gets HIDDEN by this phase; cost-plus accounting workflows are unaffected. |
| Florida-specific (lien releases / FL contractor license / FL retainage) | NO | No FL-statute-touching work. |
| GC fee semantics (cost-plus vs fixed) | NO | No fee or CO logic touched. |
| Retainage org-configurable | NO | No retainage logic touched. |
| Lien waivers (4 FL release types) | NO | No lien release logic touched. |
| Sub-tier suppliers | NO | Not modeled today; not touched. |
| Tax handling | NO | Not modeled today; not touched. |
| Owner notification cadence | NO direct touch | Owner Portal hidden; owner notification workflows unaffected because owner does not reach the portal anyway in internal launch. |
| Compliance retention | NO | No data retention work. |
| Mobile flows (daily logs / photos / punchlist) | NO | All Wave 2; all hidden by this phase. The HIDE is what makes the launch nav match what Diane + 6 PMs actually use. |

---

## 6. Targeted questions for Jake — RESOLVED 2026-05-26

**All 3 answered via AskUserQuestion with recommended options:**
- **Q1 = A (5 granular flags)** ✓ — `NEXT_PUBLIC_FEATURE_OWNER_PORTAL`, `_PIPELINE`, `_COMPANY`, `_REPORTS`, `_PRICE_INTEL_F5`, plus `_FINANCIALS_F1_VIEWS` per Q3
- **Q2 = A (HIDE Schedule + Selections entirely from PRIMARY_TABS)** ✓ — Overview/Budget/Bills/Pay Apps remain as the 4 primary tabs
- **Q3 = A (HIDE /financials/change-orders + /financials/purchase-orders from Card grid AND middleware 404)** ✓ — flag name `NEXT_PUBLIC_FEATURE_FINANCIALS_F1_VIEWS`

Most of the heavy questions were already resolved in nwrp227 and nwrp228. The 3 remaining concrete questions worth raising before /np dispatches:

1. **Single NEXT_PUBLIC_INTERNAL_LAUNCH_MODE=true flag vs 5 granular NEXT_PUBLIC_FEATURE_* flags?**
   - Options: A: 5 granular flags (per phased-plan + GROUNDED-INVENTORY recommendation) / B: 1 single mode flag (simpler-alternative noted at GROUNDED-INVENTORY:445) / C: hybrid (1 mode flag controls primary nav; granular flags control per-job tabs + section overviews)
   - **Recommended: A (5 granular flags).** Rationale: a future wave that wants to flip just Owner Portal on (external launch) without touching Pipeline/Company/Reports needs granular control. The simpler alternative trades flexibility for ~30 minutes of work — net loss given Owner Portal re-expose is a known future event per locked-scope §DEFERRED. 5 flags also matches the W.1 precedent: gated independent units, not bundled.

2. **Per-job tabs Schedule + Selections — HIDE entirely from PRIMARY_TABS, or keep visible with Coming Wave 2 badge state?**
   - Options: A: HIDE entirely (filter out of PRIMARY_TABS array) / B: keep visible as disabled Coming Wave 2 badges / C: hide the route content via middleware 404 but leave tabs visible
   - **Recommended: A (HIDE entirely).** Rationale: locked-scope §HIDE explicitly enumerates 15 per-job operational tabs as hidden. Schedule + Selections are 2 of the 6 primary tabs; the other 4 (Overview, Budget, Bills, Pay Apps) stay. Coming Wave 2 badges (B) clutter PM workflow with surfaces they cannot use. Option C is inconsistent (visible tab -> 404 = bad UX). One caveat: GROUNDED-INVENTORY line 459 mentions keeping POs and COs as working — interpret as per-job sub-routes reachable from More v (/jobs/[id]/change-orders, /jobs/[id]/purchase-orders), not as primary tabs. Matches phased plan AC #5 at INTERNAL-LAUNCH-PHASED-PLAN.md:115.

3. **/financials/change-orders + /financials/purchase-orders (the 2 Coming F1 org-wide section-overview cards) — HIDE from section overview AND middleware 404, or HIDE from section overview only?**
   - Options: A: HIDE both from Card grid + 404 the routes / B: HIDE from Card grid only; direct-URL still works / C: leave both visible with Coming F1 Badge (current behavior)
   - **Recommended: A (HIDE both ways).** Rationale: the section-overview AC at INTERNAL-LAUNCH-PHASED-PLAN.md:113 enumerates Hides org-wide POs, org-wide COs, Reconciliation. Consistency demands 404 on direct URL too (matches the pattern for /pipeline, /company, /reports). Plan-author chooses flag name (e.g., NEXT_PUBLIC_FEATURE_FINANCIALS_ORG_WIDE).

One DEFERRED question (not in scope for HIDE; flagged for future): the NwButton + Site Office tokens used by section-overview Card-grids work today; if Phase 2 UI-FINALIZE changes those tokens, HIDE Card-grid filter logic does not break (the filter is on the array, not the rendering). No design coordination needed between Phase 1 and Phase 2.

---

## 7. Recommended scope expansion

**Stated (verbatim from three sources above):** see Sources 1, 2, 3 at top.

**Recommended phase scope:**

1. **Add 5 granular NEXT_PUBLIC_FEATURE_* env vars to Vercel Production + Preview** — NEXT_PUBLIC_FEATURE_OWNER_PORTAL, NEXT_PUBLIC_FEATURE_PIPELINE, NEXT_PUBLIC_FEATURE_COMPANY, NEXT_PUBLIC_FEATURE_REPORTS, NEXT_PUBLIC_FEATURE_PRICE_INTEL_F5 — all default unset (= treated as not true = OFF). Effort ~30 min. Per W.1 precedent: vercel env add for Production; direct API POST for Preview if CLI hits git_branch_required (per D-T7-VERCEL-CLI-API-FALLBACK at MASTER-PLAN §11). One additional flag may emerge per Question 3 above (NEXT_PUBLIC_FEATURE_FINANCIALS_F1_VIEWS or similar); plan-author finalizes name during /np.

2. **Conditional rendering in src/components/nav-bar.tsx PRIMARY_NAV** — filter array by env-var checks BEFORE the existing role-gate show map at :259-269. Both desktop nav (:322-336) and mobile nav (:416-431) iterate the same array, so single-source filtering covers both. Effort ~30 min.

3. **Conditional rendering in src/components/nav/per-job-tabs.tsx** — filter PRIMARY_TABS at :64-71 (drop Schedule + Selections per Q2 recommendation) AND filter moreBaseItems at :73-97 (drop the 14 Wave-2/F2/F3/F4/F5 placeholder tabs enumerated in locked-scope; keep Plans/Specs/Photos/Documents/RFIs/Submittals/etc. only when their respective flags are on — for internal launch, none are on, so More v collapses to just Change Orders + Purchase Orders + Activity, the 3 sub-routes with real backing per GROUNDED-INVENTORY). Effort ~30 min.

4. **Middleware 404 block in src/middleware.ts** — insert AFTER the platform-admin block (:188-209) and BEFORE the design-system block (:235). Pattern per gate: if pathname.startsWith /pipeline AND env var !== true, return 404. Owner Portal gets DUAL gates: /owner/* AND /api/owner-portal/* (both PUBLIC_PATHS-listed at :27,32,41,48 need the 404 layer to fire BEFORE the auth-redirect-skip resolves). Reconciliation gated by NEXT_PUBLIC_FEATURE_RECONCILIATION (or rolled into the org-wide-views flag per Q3). Effort ~30 min.

5. **Section-overview Card grid filtering across 6 pages** — src/app/{financials,admin,price-intel,people,company,pipeline,reports}/page.tsx (price-intel is re-export; not a Card grid — 6 actionable pages). Filter the SECTIONS array at the top of each file by env-var checks before mapping to Cards. Use process.env.NEXT_PUBLIC_FEATURE_* reads inlined at build time (server components). Effort ~30 min.

**Stated estimate ~2 hours; recommended scope holds.** Single plan, single executor cycle.

**Out of scope (deferred):**

- Your Day today-card replacement — deferred to Phase 2 UI-FINALIZE per locked-scope §UI-FINALIZE row 5. Phase 1 does NOT touch src/app/today/page.tsx:143-165. Reason: Phase 2 job; replacement is a real aggregate build, not a hide.
- All Phase 2/3/4/5 work — explicit per nwrp227 directive to stop at the gate and not roll into Phase 2.
- Per-tenant feature toggle infrastructure — Wave 1.1-Full or later. Granular env vars are correct for THIS phase; per-tenant is a future-customer concern.
- Feature-flag library (Statsig, Unleash, etc.) — explicit per locked-scope §HIDE: No feature-flag library; env vars + a couple of small code changes. Future may revisit when 2nd customer onboards.
- RGBA cleanup, breakpoint fix, PDF preview, touch-target audit — all Phase 2 UI-FINALIZE row entries. Phase 1 does NOT touch any of these.
- Removing 50 placeholder route files from the repo — HIDE makes them unreachable; later cleanup can delete the page.tsx files once features actually ship. Premature deletion loses the IA scaffolding that informs phase planning.

**Acceptance criteria target (preview — final criteria locked in /gsd-discuss-phase; matches phased-plan AC at INTERNAL-LAUNCH-PHASED-PLAN.md:111-117 with 2 additions marked NEW):**

- [ ] Internal launch nav renders **Today | Jobs | Financials | Price Intel | (Admin v)** — 4 primary sections + Admin dropdown. No Pipeline / Company / Reports / People in top nav. (Both desktop AND mobile.)
- [ ] Direct URL to /pipeline (any path) returns HTTP 404 when NEXT_PUBLIC_FEATURE_PIPELINE !== true. Same for /company/*, /reports/*, /people/* (excluding /people/clients if kept — confirm at /gsd-discuss), Owner Portal /owner/* + /api/owner-portal/*.
- [ ] Section-overview Card grid on /financials shows only Bills, Pay Apps, Payments, Lien Releases, Aging. Hides Org-wide POs, Org-wide COs, Reconciliation.
- [ ] Section-overview Card grid on /admin shows only working routes (Users, Cost Codes, Billing). Hides Roles, Permissions, Org Chart, Profile, Approval Workflows, Notification Rules, Workflow Customization, Integrations, Templates.
- [ ] Per-job nav (PerJobTabs) primary tabs show only Overview, Budget, Bills, Pay Apps. Hides Schedule + Selections. More v dropdown hides all 14 Wave-2/F2/F3/F4/F5 placeholders; keeps only Change Orders + Purchase Orders + Activity.
- [ ] Flipping any NEXT_PUBLIC_FEATURE_* env var to true in a hotfix scenario re-exposes the routes without code changes. (Reversibility spot-check: pick one flag, flip on, redeploy preview, confirm routes accessible.)
- [ ] All existing working routes render without regression (Today, Jobs, /invoices, /invoices/[id], /invoices/queue, /invoices/qa, /invoices/payments, /invoices/liens, /draws/*, /cost-intelligence/*, /price-intel root, Admin live routes).
- [ ] **NEW — fail-closed default verified:** a build with NO NEXT_PUBLIC_FEATURE_* env vars set (env vars absent, not explicit false) behaves identically to a build with all 5 explicitly false. Verified by manual Vercel preview comparison OR explicit /nightwork-qa security-reviewer mechanical check.
- [ ] **NEW — middleware tag posture preserved:** Sentry tags (user_id, org_id, impersonation_active, platform_admin) still set on requests that hit the new 404 gates. Verified by middleware-ordering review (feature-flag block must land AFTER updateSession call at :141). No regression to existing tag pipeline.

---

## 8. Risks and assumptions

| Risk | Mitigation |
|---|---|
| Middleware regex misses a route (e.g., /owner-portal-admin matches /owner-portal startsWith but should not, or vice versa). HIGH-IMPACT because Owner Portal is the most sensitive hidden surface (per locked-scope: Owner Portal is built — staying hidden until external launch is the explicit goal). | AC enumerates EVERY gated path. /nightwork-qa security-reviewer runs mechanical grep: every NEXT_PUBLIC_FEATURE_* env-var reference must have BOTH (a) middleware gate AND (b) nav/section-overview filter. Cross-check the gate path against the actual route file system. Owner Portal specifically: AC requires confirming BOTH /owner/* and /api/owner-portal/* 404 on direct URL access. PUBLIC_PATHS at src/middleware.ts:27,32,41,48 enumerates 4 entries — all 4 covered by the dual gate. |
| Section-overview Card filter forgets a page. There are 6 actionable section-overview pages; missing one leaves dead cards exposed. | AC #3 + #4 + (implicit) Pipeline + (implicit) Reports each enumerate the expected card sets per page. Plan-author must touch all 6 files; /nightwork-qa grep verifies. |
| Vercel env-add hits the CLI Preview gap (W.1 precedent: git_branch_required in non-interactive mode). | Documented workaround at MASTER-PLAN §11 D-T7-VERCEL-CLI-API-FALLBACK: direct Vercel API POST for Preview env-vars. Plan-author cites this in plan to make verification trivial. |
| HIDE leaves a path Jake did not expect — e.g., /sub-portal (placeholder route per src/app/people/page.tsx:18) — visible because not enumerated. | Plan-author runs a full find src/app -name page.tsx audit during /gsd-plan-phase and cross-references against locked-scope HIDE enumeration (~50 placeholder routes). Any route not on the WORKING list and not on the HIDE list gets surfaced to Jake before /np dispatch finalizes. |
| Per-job tabs hide implementation: the More v dropdown content already CONDITIONALLY renders phase-aware items (morePhaseItems at src/components/nav/per-job-tabs.tsx:99-113). Adding env-var filtering must compose correctly with phase filtering. | Pattern: env-var filter applies FIRST (drop items entirely if flag off), then phase filter applies SECOND (drop items not in current phase). Both filters operate on the same items array; no interaction risk if applied in sequence. Plan-author writes ~5-line filter function; /nightwork-qa reviewer confirms order. |
| Hook regex sweep (per Rule 6(a)) trips on a token in a section-overview page that is unrelated to the env-var change. | Pre-flight /nightwork-preflight Rule 6(a) sweeps before dispatch. If flagged, plan-author addresses precursors OR scope-revises. Sub-clause 8(e) doc-only-skip does NOT apply (these are .tsx files, not .md). |
| $25 ceiling overrun mid-execute. | Per Rule 7a + 7c: HALT for Jake at $25. Per Rule 7d: per-plan halt at $50. Plan-author self-resolution BANNED. Standard discipline. |
| 5 env-var adds to Vercel constitutes a manual checklist step that does not ship via /nightwork-auto-setup. | /nightwork-auto-setup writes a SETUP-COMPLETE.md or MANUAL-CHECKLIST.md per phase precedent (see .planning/expansions/stage-1.5b-prototype-gallery-MANUAL-CHECKLIST.md). Env-add is in the manual checklist; executor cycles through Jake confirmation that env-vars are added on Vercel (Production + Preview) before /nightwork-qa runs the reversibility AC. |
| **Assumption: existing 8-section nav is the locked baseline.** | Per CLAUDE.md Stage 1.5c D-040 and ARCHITECTURE.md §5. 8-section nav locked. HIDE narrows the visible surface without changing the underlying structure. Future internal launch mode is reversible; the canonical 8-section nav re-emerges when flags flip. |
| **Assumption: env-var-as-feature-flag pattern is approved for this scope.** | Per W.1 precedent (commit aa3a5a4 2026-05-26) + nwrp227 explicit authorization. No new library; same template as NEXT_PUBLIC_AUTH_STATE_LISTENER. |
| **Assumption: Phase 1 ships independently of Slices 3A-3D rev-2 sign-off.** | Per nwrp227 explicit: Phase 1 dispatches independently of this revision sign-off. Dependency graph at INTERNAL-LAUNCH-PHASED-PLAN.md:83-89 forward-only. |

---

## 9. Hand-off

After Jake approves this expansion (or amends it via Q1-Q3 answers above):

1. **/nightwork-auto-setup internal-launch-hide** runs:
   - Writes .planning/expansions/internal-launch-hide-PREFLIGHT-PASS.md after Rule 6 pre-flight (hook regex sweep on 8 files + path reachability check).
   - Writes .planning/expansions/internal-launch-hide-MANUAL-CHECKLIST.md enumerating the Vercel env-var add step (with the D-T7 fallback for Preview).
   - Writes .planning/expansions/internal-launch-hide-SETUP-COMPLETE.md.

2. **/np internal-launch-hide** at $25 halt-gate ceiling, per-plan halt $50, with requires_smoke: true declared in plan front-matter (Rule 4).

3. **/nx internal-launch-hide** for execute. Commit footers carry Execute-Phase: internal-launch-hide-<task> per TD-NW-HOOK-EXECUTE-PHASE-DETECT. Drummond grep gate not triggered (no Drummond fixtures touched). Standard hook discipline.

4. **/nightwork-qa** runs the standard reviewer set:
   - spec-checker (AC parity)
   - custodian (sweep marks phase done)
   - security-reviewer (middleware regex correctness; Owner Portal 404 dual gate; fail-closed verification)
   - nightwork-design-system-reviewer (no design-token drift; section-overview Card grids still match SYSTEM.md)
   - (Skip: nightwork-ai-logic-tester — no DB queries; nightwork-data-portability — no new entities; nightwork-rls-auditor — no new RLS)

5. **Jake sign-off gate per INTERNAL-LAUNCH-PHASED-PLAN.md:119:** Jake visually confirms the 4-section + Admin dropdown spec on Vercel preview (desktop + mobile). /nightwork-qa PASS. Custodian marks Phase 1 done. **STOPS HERE — does NOT roll into Phase 2.**

6. Phase 2 (UI-FINALIZE) cycle awaits separate Jake authorization per the phased plan sequence + dependency graph.
