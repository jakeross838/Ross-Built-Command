# Phase internal-launch-hide: HIDE - Context

**Gathered:** 2026-05-26 (assumptions mode, --auto)
**Status:** Ready for planning
**Halt-gate ceiling:** $25 (per nwrp227; halt-gate control point, NOT believed budget; per-plan halt $50 per Rule 7d)

<domain>
## Phase Boundary

Phase 1 of the Internal Ross Built Launch SEQUENCE per `.planning/launch/INTERNAL-LAUNCH-SCOPE-LOCKED.md` §HIDE. Scope: feature-flag off Owner Portal + ~50 placeholder routes + 15 per-job operational tabs + 2 Caldwell-fixture-mount Wave-2 routes. Reduce nav from 8 sections to 4 + Admin dropdown. Pattern: `NEXT_PUBLIC_FEATURE_*` env vars + nav-bar conditional + middleware 404 block + section-overview Card filtering. ~2-hour stated estimate.

**Sequence step:** HIDE (first in SEQUENCE per locked-scope rationale: cheapest item, biggest perceptual change). Stops at Phase 1 sign-off gate per nwrp227; does NOT roll into Phase 2.

**Authorization chain:** nwrp225 (locked scope) → nwrp226 (phased plan draft) → nwrp227 (Phase 1 pre-authorized) → nwrp228 (sign-off on revised plan) → nwrp229 (signs off all slices) → nwrp230 (dispatch /np, halt at plan-review gate).
</domain>

<decisions>
## Implementation Decisions

### Feature-flag scheme (resolved in EXPANDED-SCOPE Q1)
- **D-01:** **5 granular `NEXT_PUBLIC_FEATURE_*` flags** (not a single mode flag). The 6th flag (`_FINANCIALS_F1_VIEWS`) emerged from Q3. Future Owner Portal re-expose at external launch needs independent gating; matches W.1 precedent of independent units. Flags: `NEXT_PUBLIC_FEATURE_OWNER_PORTAL`, `_PIPELINE`, `_COMPANY`, `_REPORTS`, `_PRICE_INTEL_F5`, `_FINANCIALS_F1_VIEWS`.
- **D-02:** **All 6 flags set to value `""` (empty string)** in Vercel Production + Preview per SETUP-COMPLETE.md. Jake accepted as functionally equivalent to `false` via AskUserQuestion (fail-closed pattern `!== "true"` treats empty + unset + `"false"` identically as OFF).

### `/people/clients` carve-out decision (Item 1 from nwrp230 — RESOLVED via assumption-analysis evidence)
- **D-03:** **HIDE `/people/clients` alongside the rest of `/people/*`. No carve-out.**
  - **Evidence:** (a) Page is a 19-line placeholder at `src/app/people/clients/page.tsx:6-19` rendering only `<NwPlaceholderCard eyebrow="People · Clients" wave="F1">`. (b) Backend is autocomplete-only at `src/app/api/clients/route.ts:40-67` — GET-only search, min-2-char query gate, capped at 20 results, with explicit PII fence at lines 54-55 returning `id + full_name` ONLY (no email/phone display path until Slice-2 per TD-B1abis-01). (c) The directory use-case the placeholder advertises ("relationship history, communication threads, lifetime-value rollups") has ZERO backend. (d) Real Diane/PM client-lookup happens via `ClientCombobox` (`src/components/client-combobox.tsx` + grep hits at `src/app/jobs/[id]/page.tsx` + `src/app/onboard/OnboardWizard.tsx`) wired into job-edit + new-job forms. (e) GROUNDED-INVENTORY:153 + D-ui-state-and-hiding.md:295 both label as stale.
  - **Reasoning:** A carve-out would expose a "Coming F1" placeholder card with no functional value to Diane or PMs — contradicts locked-scope §HIDE goal "feels complete at reduced scope." If Diane during dogfood discovers a flat directory need, Phase 2/3 re-expose is a 1-line flag-flip (trivial cost). Wrong direction = harm.
  - **Per nwrp230 Jake's lean:** "keep it if it's useful internally, but surface the recommendation with reasoning." Recommendation surfaced with evidence; verdict = NOT useful internally today; HIDE.

### Empty-vs-false canonical idiom (Item 2 from nwrp230 — RESOLVED via W.1 precedent)
- **D-04:** **Canonical idiom at all 4 read sites: `process.env.NEXT_PUBLIC_FEATURE_X !== "true"`** (negate; default deny). Byte-identical to W.1 precedent at `src/hooks/use-current-role.ts:67-69`. NO `=== "false"` (mis-handles empty: `"" === "false"` is `false`). NO truthy coercion `!process.env.X` (mis-handles `"false"` string: `!"false"` is `false`).
  - **Mechanical AC for security-reviewer:** grep across all 4 read sites confirms `!== "true"` exactly; flags any `=== "false"`, `=== ""`, or `Boolean(process.env.X)` patterns.
  - **The 4 read sites:**
    1. `src/components/nav-bar.tsx` — PRIMARY_NAV filter (also serves mobile nav via same array)
    2. `src/middleware.ts` — 404 block per-gate
    3. `src/components/nav/per-job-tabs.tsx` — PRIMARY_TABS + moreBaseItems filter
    4. Section-overview Card filters across 6 pages (`src/app/{financials,admin,people,company,pipeline,reports}/page.tsx`)
  - **Runtime AC (Rule 1):** deploy to Vercel preview with one flag at `""`, confirm route HIDDEN; flip to `"true"`, confirm EXPOSED; flip to `"false"`, confirm HIDDEN.

### Middleware insertion point
- **D-05:** **404 block inserts BETWEEN line 209 (end of platform-admin block) and line 211 (design-system block header).** Specifically: AFTER `updateSession()` at line 141, AFTER platform-admin block (188-209), BEFORE design-system block (235).
  - **Why this ordering:** (a) Observability — `updateSession` at line 141 sets Sentry tags (`user_id`, `org_id`, `impersonation_active`, `platform_admin`). Any gate BEFORE line 141 loses tags on 404'd requests. (b) Staff bypass posture — platform-admin block must run first so staff debugging a hidden Owner Portal via impersonation can reach it (feature flags don't gate staff investigation paths per CLAUDE.md §Platform admin). (c) Design-system block at line 235 is platform-presentation (sample data, not tenant); feature flags don't apply.
  - **Gate ordering inside the new block:** Owner Portal dual-gate FIRST (most sensitive) — `/owner/*` AND `/api/owner-portal/*` both check `NEXT_PUBLIC_FEATURE_OWNER_PORTAL !== "true"`. Then section gates: `/pipeline`, `/company`, `/reports`, `/people` (incl. `/people/clients` per D-03), `/price-intel/{anomaly-review,bid-comparison,cost-database,material-orders,selections-catalog,vendor-performance,verification}`, `/financials/{change-orders,purchase-orders}`, `/jobs/[id]/schedule`, `/financials/reconciliation`.
  - **404 response shape:** JSON `NextResponse.json({ error: "Not found" }, { status: 404 })` for `/api/*` paths (per lines 157-162 + 285-290 precedent); HTML `NextResponse.rewrite(notFoundUrl, { status: 404 })` for non-API paths (per line 268's design-system non-admin rewrite precedent).

### PerJobTabs filter composition
- **D-06:** **Static array removal, NOT per-tab env-var gating.** Drop the 14 hidden items from `moreBaseItems` (lines 73-97); drop Schedule + Selections from `PRIMARY_TABS` (lines 64-71). `morePhaseItems` (lines 99-113) UNCHANGED — those 3 phase-gated items (Closeout / Warranty / Pre-Con) are job-lifecycle contexts, NOT feature placeholders, not in the locked-scope HIDE list.
  - **Why static removal:** 14+ per-tab env vars would explode the env-var surface (15+ flags instead of 6), each requiring Vercel add + Sentry observability. Phase 1 ceiling is $25. EXPANDED-SCOPE §7 line 174 specifies "for internal launch, none are on, so More ▾ collapses to just Change Orders + Purchase Orders + Activity." Wave-2-onward unhide = 1 line per tab to re-add literal.
  - **Composition order preserved:** mobile collapse at lines 367-373 (`allTabsAsDropdownItems`) concatenates `PRIMARY_TABS` + `moreItems` → filtering at source (the two arrays) covers both desktop + mobile via single source of truth.

### Surface at plan-phase (NOT a decision — needs plan-author resolution)
- **PO clarification:** EXPANDED-SCOPE §7 + GROUNDED-INVENTORY both say "More ▾ collapses to CO + PO + Activity" but **`/jobs/[id]/purchase-orders` is NOT currently in `moreBaseItems`** at lines 73-97. Plan-author must either (a) ADD the literal entry to `moreBaseItems` (1-line change; align with intent) OR (b) confirm PO is reachable via `/financials/purchase-orders` which is itself hidden by `_FINANCIALS_F1_VIEWS` per Q3=A (mismatch with intent). Surface to Jake at /gsd-plan-phase for resolution.

### Claude's Discretion
- Plan-author may choose to bundle the 6 env-var-flag checks into a small helper (e.g., `isFeatureEnabled(name: string): boolean`) at a shared location, OR inline the `!== "true"` check at each read site. EXPANDED-SCOPE doesn't mandate. Either is acceptable provided D-04 mechanical AC passes (no `=== "false"` etc.).
- Plan-author may add a `NEXT_PUBLIC_FEATURE_PEOPLE` flag (single People-section flag) OR break out per-sub-route flags (`_PEOPLE_TEAM`, `_PEOPLE_ORG_CHART`). EXPANDED-SCOPE §1 row 5 enumerates the People section as a single block; recommend single flag for simplicity unless plan-author surfaces a reason to split.

### Folded Todos
None — todo.match-phase returned 0 matches for `internal-launch-hide`.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/launch/INTERNAL-LAUNCH-SCOPE-LOCKED.md` — authoritative locked scope (§HIDE lines 120-135 + §SEQUENCE + §DISCIPLINE)
- `.planning/launch/INTERNAL-LAUNCH-PHASED-PLAN.md` — Rev 3, plan approved end-to-end per nwrp229; §Phase 1 — HIDE has work items + ACs
- `.planning/expansions/internal-launch-hide-EXPANDED-SCOPE.md` — APPROVED 2026-05-26 with Q1-Q3 resolved + canonical 9-section breakdown
- `.planning/expansions/internal-launch-hide-SETUP-COMPLETE.md` — env vars added; READY FOR PLAN
- `.planning/expansions/internal-launch-hide-PREFLIGHT-PASS.md` — Rule 6 sub-checks all PASS
- `.planning/grounding-pass/GROUNDED-INVENTORY.md` §4 (What needs hiding) + §6 (Gap to launch — HIDE block) — empirical inventory
- `CLAUDE.md` — §Architecture Rules, §Dev Rules, §UI Rules, §Workflow Posture Rules 1-9, §Orchestration discipline, §Platform admin (cross-tenant) — all standing
- W.1 precedent: `src/hooks/use-current-role.ts:61-75` + `.planning/tech-debt/TD-WB-LISTENER-UNFLAG.md` + MASTER-PLAN §11 D-T7-VERCEL-CLI-API-FALLBACK
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **W.1 fail-closed pattern** at `src/hooks/use-current-role.ts:67-69` — the canonical `!== "true"` idiom byte-identical for re-use.
- **Middleware gating patterns** at `src/middleware.ts` — platform-admin block (lines 188-209), design-system block (lines 235-281), admin/platform API gate (lines 284-291) — all established `pathname.startsWith + return 404/rewrite` pattern.
- **PUBLIC_PATHS** at `src/middleware.ts:27,32,41,48` — 4 Owner Portal entries enumerated; dual gate must override all 4.
- **NwPlaceholderCard component** — used by all 50 placeholder routes incl. `/people/clients`; hidden routes still render this component but middleware returns 404 first.
- **Card grid structures** at `/financials/page.tsx:21-29`, `/admin/page.tsx:30-49`, `/people/page.tsx:13-19`, `/company/page.tsx:12-25`, `/pipeline/page.tsx:18-24`, `/reports/page.tsx:12-18` — all static SECTIONS arrays; filter at array source before `.map()`.

### Established Patterns
- **NEXT_PUBLIC_* env-var inlining** (Next.js build-time) — Server + client bundles see the value at build time; default unset = `undefined`; `undefined !== "true"` = `true` → fail-closed.
- **Q12 status_history JSONB** — not relevant (no status transitions in this phase).
- **Touched-lines-only hook (Rule 8)** — pre-existing 14 `rgba(247,245,236,0.X)` white-sand-alpha tints in nav-bar.tsx are NOT in Phase 1 touched lines; hook won't fire.
- **JSON-vs-HTML 404 response split** — `/api/*` returns JSON; non-API returns HTML rewrite. Phase 1 must match (e.g., `/api/owner-portal/*` → JSON 404; `/owner/*` → HTML rewrite).

### Integration Points
- **Vercel env vars** — 6 new flags already present in Production + Preview (value `""`). Code reads them via `process.env.NEXT_PUBLIC_FEATURE_X` at build time (server components) + runtime (middleware).
- **Sentry tag pipeline** — `updateSession()` at middleware:141 sets tags; gates must land AFTER to preserve observability on 404'd requests.
- **Phase 2 UI-FINALIZE depends on this phase** — UI polish lands on the reduced 4-section nav. Phase 1 must ship + Jake sign-off BEFORE Phase 2 starts.
- **Reversibility** — flipping any flag to `"true"` in Vercel + redeploy preview re-exposes the route without code changes (Rule 1 runtime AC during /nightwork-qa).
</code_context>

<specifics>
## Specific Ideas

- **`/people/clients` HIDE decision was Jake's lean per nwrp230 ("keep it if it's useful internally, but surface the recommendation with reasoning")** → reasoning surfaced (D-03 evidence trail) → recommendation = HIDE → matches Jake's "keep IF useful" caveat (it's NOT useful today).
- **Empty-string env values must be treated identically to `false`** per Jake's nwrp230 → canonical idiom `!== "true"` enforced across all 4 read sites (D-04). Mechanical AC + runtime AC both spec'd.
- **Owner Portal is the most sensitive hidden surface** — built at full external-grade security rigor (B-2a + B-2b) but staying hidden until external launch. Dual-gate (`/owner/*` + `/api/owner-portal/*`) mandatory.
</specifics>

<deferred>
## Deferred Ideas

- **Per-tab env-var gating for PerJobTabs** — would explode env-var surface; deferred. Static array removal chosen per D-06. If Phase 2+ wants per-tab control, add then.
- **`NEXT_PUBLIC_FEATURE_YOUR_DAY` flag** — "Your Day" today-card replacement is Phase 2 UI-FINALIZE work, NOT a HIDE flag. EXPANDED-SCOPE §3 row 2 explicit: "do NOT add a `NEXT_PUBLIC_FEATURE_YOUR_DAY` flag. Replacement is a real Phase 2 build."
- **Per-tenant feature toggle infrastructure** — Wave 1.1-Full or later when 2nd customer onboards. Granular env vars correct for Phase 1; per-tenant is a future-customer concern.
- **Feature-flag library (Statsig, Unleash, etc.)** — explicit per locked-scope §HIDE: "No feature-flag library; env vars + a couple of small code changes." Revisit when 2nd customer onboards.
- **Deletion of 50 placeholder route page.tsx files** — HIDE makes them unreachable; deletion is later cleanup (premature deletion loses IA scaffolding for phase planning).
- **Per-job Purchase Orders sub-route** — surfaced for plan-author resolution (see "Surface at plan-phase" note above): is PO reachable as per-job tab OR via the hidden `/financials/purchase-orders`? Resolve at /gsd-plan-phase.

### Reviewed Todos (not folded)
None — todo.match-phase returned 0 matches.
</deferred>
