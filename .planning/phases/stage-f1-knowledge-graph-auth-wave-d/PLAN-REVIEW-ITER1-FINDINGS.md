# Wave-D Plan-Review iter-1 — Consolidated Findings

**Date:** 2026-05-13
**Source:** nwrp121 authorization → 24 reviewers dispatched (6× D-1, 6× D-2, 3× D-3, 6× D-4, 3× D-5)
**Reviewer mix per plan:** noted at each section (varied with each plan's surface — code/Rule plans got the full 6, doc-only plans got 3)

---

## Executive verdict

| Plan | Reviewers | PASS | WARN | BLOCK | Status |
|------|-----------|------|------|-------|--------|
| D-1  | 6 | 6 | 0 | 0 | **CLEAN PASS** (Rule 2 satisfied; 5 HIGH non-blocking) |
| D-2  | 6 | 6 | 0 | 0 | **CLEAN PASS** (3-5 HIGH per reviewer; scope-discipline concerns) |
| D-3  | 3 | 1 | 2 | 0 | **WARN** (smoke packet has fixture/auth-path gaps) |
| D-4  | 6 | 0 | 6 | 5 BLOCKING claims | **BLOCK** (Rule 4 lifecycle anchor + smoke-script design system assertions) |
| D-5  | 3 | 1 | 2 | 0 | **WARN** (45-count unverified; SOC2 + retention silent) |

**Overall Wave-D iter-1: BLOCKED on D-4 lifecycle gate + smoke-script primary-UX coverage.** Other 4 plans have HIGH-level concerns but no BLOCKING items.

---

## Plan D-1 — PostgREST FK refactor — **PASS (clean)**

**Reviewers:** nightwork-multi-tenant-architect, nightwork-data-migration-safety, database-reviewer, nightwork-scalability-reviewer, architect, planner (Rule 2 enforcer)

**Rule 2 FK citation check:** ✅ **SATISFIED.** Constraint `org_members_user_id_profiles_fkey` cited in header, migration comment, key_links, must_haves, AND dedicated "Rule 2 citations" block (lines 1302-1357) with (a) FK name (b) 9-site mapping table (c) `SELECT conname FROM pg_constraint` verification query.

**Grep-verified counts:** 9 hits matching plan's planner-time list exactly.

**HIGH concerns (non-blocking):**
1. **H-D1-01 (database-reviewer)** — Existing index `idx_org_members_user_id` (00016:177) covers FK lookup; plan should one-line-note this so future reviewers don't expect a new CREATE INDEX.
2. **H-D1-02 (database-reviewer + architect)** — PostgREST schema-cache reload claim "Supabase auto-reloads via DDL-trigger NOTIFY" is unverified in repo (grep returned zero hits). Confirmed correct for Supabase managed instances. **Action:** add note "auto-reload confirmed on Supabase managed; self-hosted requires NOTIFY pgrst, 'reload schema'" OR add belt-and-suspenders NOTIFY given Wave-C process gap.
3. **H-D1-03 (data-migration-safety)** — `ALTER TABLE ADD CONSTRAINT FK` takes SHARE ROW EXCLUSIVE lock + validates all rows; on populated org_members this blocks concurrent writes. Plan should note `NOT VALID + VALIDATE CONSTRAINT` as alternative for prod. (Non-blocking on dev; populated table is small at Ross Built scale.)
4. **H-D1-04 (data-migration-safety)** — `.down.sql` leaves 9 refactored consumers broken; no mechanical link between code revert + schema revert. Rely on PR-revert discipline.
5. **H-D1-05 (data-migration-safety)** — `ON DELETE NO ACTION` defensive guard not unit-tested. Add AC verifying FK rejects profile deletion when org_members row references it.
6. **H-D1-06 (planner)** — Rule 2 line-range stub ("Exact line numbers depend on final formatting") — executor should lock specific line ranges in commit message for iter-2 traceability.
7. **H-D1-07 (planner)** — `PmRow` type union admits both single-object and array shapes — masks unexpected array returns without typecheck failure. Consider tightening.
8. **H-D1-08 (planner)** — `dashboard/route.ts` AFTER block drops `Array.isArray` defensive guard that other 8 sites preserve. Verify `pickFirst` handles `null` input identically.
9. **H-D1-09 (planner)** — Commit ordering risk: migration commits before src, but unapplied-migration + new-syntax src would 500 mid-merge. Consider single squash commit OR document the merge-window discipline.
10. **H-D1-10 (architect)** — PATTERNS.md / ARCHITECTURE.md not updated with dual-FK + PostgREST embedding hint convention. Plan defers to D-5 (decision-only). Add an explicit follow-up TD entry naming the architectural pattern doc that should reference D-078.
11. **H-D1-11 (architect)** — D-5 cross-references migration 00098 before D-1 authors it (textual coupling). Acceptable since D-5 executes first per nwrp121, but if D-1 constraint name drifts at execute, D-5 mis-cites. Lock constraint name in both plans NOW (it's locked in plan body, just not in D-5 cross-ref).
12. **H-D1-12 (architect — STRONG recommendation)** — Add `NOTIFY pgrst, 'reload schema'` to migration body as belt-and-suspenders. The whole reason Wave-D exists is Wave-C's runtime-not-tested process gap. If schema-cache auto-reload lags during Wave-D ship, smoke fails despite correct schema.

**Scalability findings (informational):**
- `/api/dashboard` runs the embed on every render — ~200-row hash-join per call at most, well within Postgres budget. Bounded by org headcount (~14 at Ross Built, ~200 enterprise).
- 2 follow-up TDs surfaced: dashboard userNameMap KV memoization; jobs/[id]/overview duplicate embed consolidation. Out of D-1 scope.

**Verdict: ✅ PROCEED with minor adjustments at iter-2.**

---

## Plan D-2 — Remove double AppShell — **PASS (clean)**

**Reviewers:** nightwork-design-pushback-agent, nightwork-blast-radius-analyzer, architect, planner, nightwork-enterprise-readiness-reviewer, nightwork-scalability-reviewer

**Blast radius:** ✅ verified — 6 underlying files imported ONLY by 6 financials/* thin-wrappers. Zero non-financials importers across src/. No direct route mounts survive next.config.mjs 308 redirects.

**HIGH concerns (non-blocking):**
1. **H-D2-01 (blast-radius + architect + design-pushback)** — **/financials/aging/page.tsx + /financials/aging-report/page.tsx have IDENTICAL double-AppShell pathology** (confirmed live grep). Plan flags as Wave-D follow-up observation but does NOT open a tracked TD. **Decision needed:** (a) expand D-2 scope to 8 files (parallel-safe, ~10 extra LOC, ships now) OR (b) author tracked TD entry before D-2 merges.
2. **H-D2-02 (blast-radius)** — **/invoices/[id]/page.tsx has 2 AppShell wraps + 2k+ lines of dead code** (route redirects to /financials/bills/[id] which uses InvoiceReviewView via different thin-wrapper). **Decision needed:** (a) delete in D-2 (cleanest, +tombstone comment) OR (b) tracked TD entry.
3. **H-D2-03 (architect)** — Single-AppShell-per-mount convention is emergent (today/, reports/, price-intel/, pipeline/, people/, company/, admin/ already follow). PATTERNS.md doesn't state it explicitly. Recommend adding to PATTERNS.md or new D-### decision after Wave-D ships, so future plan-authors don't reintroduce double-AppShell.
4. **H-D2-04 (planner)** — Plan task action "Replace lines 397-398 (`<AppShell>` open) with `<>` Fragment open" reads wrong; line 398 is `<main>` open (not part of AppShell). The diff preview is correct; the prose action is misleading. Tighten to "Replace line 397 only".
5. **H-D2-05 (planner)** — AC-D2-03 greps for `'app-shell'` substring — would false-positive on `app-shell-padding` CSS class. Tighten to `from "@/components/app-shell"` or `import AppShell`.
6. **H-D2-06 (planner)** — AC-D2-05/06 (single-NavBar / single-sidebar assertions) gated on Plan D-4's `wave-d-smoke.ts`. Reframe as "verified at GATE-D pre-ship harness run, not at D-2 execute completion" so executor doesn't block on D-4-not-yet-shipped.
7. **H-D2-07 (architect)** — Line-range parallel-execute claim (D-1 + D-2 in shared files like invoices/page.tsx + invoices/queue/page.tsx) needs re-grep at merge-time on actual rebase head, not just at planner-time.
8. **H-D2-08 (enterprise-readiness + scalability — net-positive findings)** — NavBar + JobSidebar + NotificationBell currently double-mount. Post-D-2 halves: profile fetch, org_members role lookup, jobs list query, platform_admins lookup, AND 60s notification polling timer. **At 100k tenants × 6 PM page loads/day → ~3.6M redundant queries/day eliminated.** Plan should call this out as observability/cost improvement in §provides.

**Verdict: ✅ PROCEED.** Reviewers want H-D2-01 + H-D2-02 decisions before D-2 commits.

---

## Plan D-3 — Corrected smoke packet — **WARN**

**Reviewers:** planner, architect, nightwork-enterprise-readiness-reviewer

**HIGH concerns (need iter-2):**
1. **H-D3-01 (planner + e-r)** — **Auth fixture / role / org context missing.** Smoke instructions like "PM dropdown shows 7 PMs not just Unassigned" are meaningless without specifying which user to log in as (PM-with-7-PMs-org vs empty-org). Plan §168-173 references Vercel preview URL but no fixture user / role guidance.
2. **H-D3-02 (planner)** — Forbidden-input grep gate (line 195) filters bullet lines only (`^- `); a packet author writing `### Route N — /invoices` as H3 header bypasses the gate. Tighten regex.
3. **H-D3-03 (architect)** — Missing `/draws/:id/print` → `/financials/pay-apps/:id/print` redirect coverage (next.config.mjs:102).
4. **H-D3-04 (architect)** — Plan uses "301-redirect" throughout but next.config.mjs `permanent: true` emits **308**. Terminology drift — fix consistently.
5. **H-D3-05 (architect)** — No verify-line confirming `/invoices` STILL redirects to `/financials/bills` (regression catch). Add: `curl -I /invoices returns 308`.
6. **H-D3-06 (e-r)** — Network 4xx/5xx response check NOT in template — only console-error grep. Wave-C signal was a 400 response, not a console throw. Add Network-tab check.
7. **H-D3-07 (e-r)** — "What to do if you find an issue" path absent. Smoke runner with no escalation guidance.
8. **H-D3-08 (e-r)** — Fixture-adequacy prerequisite unstated. Org needs ≥2 PM-role memberships + recent activity_log rows to exercise the failure modes.
9. **H-D3-09 (planner)** — Plan D-3 implicitly excludes the OTHER 7 IA D-040 sections (Today, Pipeline, Price Intel, People, Company, Reports, Admin) — state as explicit exclusion in packet itself.

**Verdict: ⚠ NEEDS iter-2 patches** — fixture/auth path is the most important (H-D3-01).

---

## Plan D-4 — Rules 1-4 + Playwright smoke — **BLOCK**

**Reviewers:** architect, planner, nightwork-enterprise-readiness-reviewer, security-reviewer, nightwork-scalability-reviewer, nightwork-design-pushback-agent

### BLOCKING items (5 across 2 reviewers)

**B-D4-01 (architect)** — **Rule 4 lifecycle gate is ambiguous.** Plan claims smoke runs "pre-GATE-N" but EXPANDED-SCOPE step 6 places script execution AFTER execute and BEFORE `/nightwork-qa` (step 7), while success_criteria call it "Wave-D ship verification." Trigger point must explicitly land between executor-task-complete and `/nightwork-qa` invocation — or QA passes schema-only again (exact Wave-C gap).

**B-D4-02 (architect)** — **Rule 4 codification omits the named enforcer.** Verbatim Rule 4 text says "Before any UI-touching plan can reach GATE-N halt" but never names the responsible orchestrator/agent (executor? /nightwork-qa? /gsd-ship?). Without a named enforcer, the rule is advisory — defeating the structural-enforcement claim.

**B-D4-03 (design-pushback)** — **Document Review surface not asserted as a pattern.** PATTERNS.md §2 makes file-preview-LEFT + right-rail + audit-BELOW the gold standard; the script asserts none of these. Add selectors for `[data-pattern="document-review"]` left/right/below anatomy or Rule-4 gate cannot catch regressed Document Review layout.

**B-D4-04 (design-pushback)** — **Screenshot strategy is capture-only, no diff.** Plan takes `page.screenshot({ fullPage: false })` but no baseline storage, no pixel diff, no DOM-snapshot diff. Screenshots that nobody compares are diagnostic, not assertive — Rule 4 claims runtime enforcement but cannot regress-detect. Either (a) state explicitly "screenshots are diagnostic-only; Layer 3 vision is the assertion mechanism" OR (b) wire a baseline directory + tolerance.

**B-D4-05 (design-pushback)** — **Logo placement not asserted on any route.** CLAUDE.md UI rules mandate Ross Built logo top-right of every authenticated surface. 13 routes, 0 logo assertions. A regressed AppShell header would pass this smoke.

### HIGH concerns

1. **H-D4-01 (architect)** — Rule 2 enforcement regex (`rg -n '\.select\("[^"]+:[^"]+\('`) only matches PostgREST hints appearing literally in plan markdown. Plans referencing code files without inlining `.select(...)` pass plan-review while shipping broken hints. Add companion grep over `files_modified` paths.
2. **H-D4-02 (architect)** — ai-logic-tester prompt update misses skill-file propagation. Task 3 amends `.claude/agents/nightwork-ai-logic-tester.md` but the agent's operating contract lives in `.claude/skills/nightwork-ai-logic-checker/SKILL.md`. Rule 3 mandate must propagate to SKILL.md or agent reverts to code-reading.
3. **H-D4-03 (architect)** — Layer 4 framework seed lacks route-registry abstraction. `wave-d-smoke.ts` hardcodes 13 routes; Wave 1.1-Full Layer 4 will need plan-N route registration via manifest, requiring extraction into `scripts/smoke/routes/<plan>.ts` + generic runner. Without that boundary now, every future plan duplicates 350 lines.
4. **H-D4-04 (architect)** — `requires_drummond_data: true` skip path silently passes the Wave-C anti-pattern. Routes 4-5 marked `skipped_no_fixture_match` with HTTP 200 + console-clean only — exactly the "page loaded" check Rule 4 warns against. Seed fixture-harness-org with analog rows OR move to nightwork-end-to-end-test.
5. **H-D4-05 (architect)** — Rule 2 reviewer assignment misrouted. Plan assigns `nightwork-multi-tenant-architect` as primary FK-citation reviewer, but FK constraints are schema-correctness not tenant-isolation. `architect` or new `nightwork-schema-reviewer` should be primary.
6. **H-D4-06 (planner)** — Rules placement: Development Rules vs Standing Rules ambiguity. Plan inserts at line 535 in "## Development Rules" (between reference-invoice-formats + `--no-verify`). Rules 1-4 are process-enforcement rules (cross-section) — closer to Standing Rules' "### Workflow posture" sub-section. Either justify Development Rules OR relocate.
7. **H-D4-07 (planner)** — Route 8 selector `select[name='pm_id']` for /jobs/new — D-1 is canonical authority for the post-fix selector name. Cross-reference D-1's component diff at execute-time.
8. **H-D4-08 (e-r)** — Screenshot idempotency gap: static filenames overwrite reruns. No run-id, timestamp, or sequence suffix. SOC2 audit-trail loses per-run diffs.
9. **H-D4-09 (e-r + design-pushback)** — PM dropdown audit-relevance underspecified. Routes 6/7/8 assert `option count >= 1` but NOT that option `textContent` matches display-name pattern (vs UUID) — exact Wave-C bug being closed. Add: grep for non-UUID text in option labels.
10. **H-D4-10 (e-r + design-pushback)** — Activity-feed display-name check missing on /today (only checks `text=Active jobs` presence, not that feed renders display-names vs UUIDs).
11. **H-D4-11 (e-r + scalability)** — Rate-limit + retry/backoff posture undocumented. 13 sequential routes with 30s+5s waits ≈ ~7.5min total, no 429 detection, no retry budget. Single transient timeout = full red.
12. **H-D4-12 (e-r)** — Sentry-noise unaddressed. Script generates console errors on fail paths; no DSN-disable or X-Sentry-Suppress header. Smoke runs pollute Sentry events tagged with fixture-harness-org.
13. **H-D4-13 (security)** — `HARNESS_AUTH_STATE_PATH` resolves to `.planning/verification/auth/harness-auth-state.json`. Plan gitignores `.playwright-output/` but NOT verified `.planning/verification/auth/*` is gitignored. Live Supabase session token could land in repo.
14. **H-D4-14 (security)** — Drummond UUIDs hardcoded in route table (`/financials/bills/7c63cf40-...`, `/jobs/a1bb4d28-...`). Real project identifiers → PII-adjacent. Replace with fixture UUIDs or compile-time env-sourced constant.
15. **H-D4-15 (security)** — `VERIFICATION_BYPASS_SECRET` marked "Optional env" but missing bypass silently degrades auth chain → Vercel SSO wall captured as HTTP 200 → false PASSes. Emit loud WARNING when bypass secret absent.
16. **H-D4-16 (scalability)** — ~7.5min walltime over implied <5min pre-merge budget. Sequential design forecloses parallelism with wrong rationale (BrowserContext fan-out from one storageState IS the standard pattern, would cut ~3×).
17. **H-D4-17 (scalability)** — No cold-lambda warmup; first 1-2 routes absorb 3-8s extra inside 30s timeout. No pre-walk health-ping.
18. **H-D4-18 (design-pushback)** — No empty/loading/error state coverage. Only data-populated paths.
19. **H-D4-19 (design-pushback)** — No design-token getComputedStyle assertions (NavBar `--bg-card`, body `--text-primary`).
20. **H-D4-20 (design-pushback)** — DataGrid row-count assertion missing for list routes. `/financials/bills`, `/financials/bills/queue` etc. only assert `header.app-shell-nav` count — regressed empty grid with intact navbar passes.
21. **H-D4-21 (design-pushback)** — Double-NavBar assertion is special-case only (Issue-2 routes). Promote to global per-route invariant: `header.app-shell-nav === 1` on every route.
22. **H-D4-22 (design-pushback)** — Mobile collapse not exercised. Viewport hardcoded 1280×800. PATTERNS.md §2g mobile contract desktop-only verified.

**Verdict: ❌ BLOCKED on lifecycle gate (B-D4-01/02) + design-system assertion coverage (B-D4-03/04/05).**

---

## Plan D-5 — D-078 decision entry — **WARN**

**Reviewers:** architect, planner, nightwork-compliance-reviewer

**HIGH concerns:**
1. **H-D5-01 (architect — IMPORTANT)** — **"45 auth.users FKs" count is UNVERIFIED against schema.** Migration 00097:50-51 says "30+ existing FKs"; the "45" figure traces only to nwrp121 → EXPANDED-SCOPE. T-D-5-04 makes pre-flight count OPTIONAL → make it REQUIRED before committing documentary count.
2. **H-D5-02 (architect)** — "3 profiles FKs post-Wave-D" needs verification via `information_schema.referential_constraints` query. Plan lists `invoices.assigned_pm_id`, `org_workflow_settings.import_default_pm_id`, `org_members.user_id` (new) — claim plausible but not independently verified.
3. **H-D5-03 (architect)** — CLAUDE.md insertion at line 72 between bullet-list + "### Stage 1.5c" subsection — structurally OK but breaks pattern where Stage-specific bullets sit under their dated subsection. Consider placing under Wave-D subsection OR in parallel "Canonical architecture references" block.
4. **H-D5-04 (architect)** — Deferred-standardization clause omits `§11 TECH DEBT REGISTRY` entry. D-038/D-039 set precedent that deferred items also get logged in §11. Add register entry for discoverability.
5. **H-D5-05 (compliance — IMPORTANT)** — **D-078 entry silent on `activity_log.user_id` FK target.** SOC2 CC7.2 auditors ask "which table anchors audit reconstruction?" — entry should classify audit-log actor columns explicitly as auth.users-anchored.
6. **H-D5-06 (compliance — IMPORTANT)** — **Profiles ON DELETE CASCADE retention durability not acknowledged.** `profiles.id REFERENCES auth.users(id) ON DELETE CASCADE`. If auth.users deletes, profiles deletes, and any FK to profiles(id) loses display-name resolution permanently — but financial/audit data is forever-retention. Entry must state ON DELETE behavior on the 3 profiles-FK columns.
7. **H-D5-07 (compliance)** — PostgREST embedding hint scope undefined. `profiles` carries `email` (PII). Without enumerated allowed-columns fence (id, full_name only), future plan-author may write `profile:profiles(*)` and leak email.
8. **H-D5-08 (compliance)** — SOC2 control mapping absent (CC6.1 logical access — auth.users is access-control anchor; CC7.2 system monitoring — audit-trail referential integrity).
9. **H-D5-09 (planner)** — Entry format / line-cite verifications all PASS (line 252 + line 71/72 correct; D-077..D-073 row format match; AC commands all runnable).

**Verdict: ⚠ NEEDS iter-2 patches** — H-D5-01 (verify the count!) + H-D5-05/06 (audit + retention clauses) are the most important.

---

## Cross-plan themes

### Theme A — Process-gap closure must be airtight (D-4 BLOCKING)

The entire reason Wave-D exists is the Wave-C process gap. D-4's Rule 4 codification must explicitly name:
- **WHERE** in the lifecycle the smoke runs (between executor-task-complete and /nightwork-qa)
- **WHO** enforces it (which orchestrator/agent gates progression)
- **HOW** failure halts (does /nightwork-qa refuse to start if smoke JSON shows failures?)

Without all three, Rule 4 is advisory text.

### Theme B — Smoke-script primary-UX assertions still too thin (D-4 BLOCKING + 10+ HIGH)

The script's current selector strategy ("text=X present" + "option count >= 1" + console-error grep) is necessary but NOT sufficient to catch the Wave-C class of bugs. Required additions:
- **Logo placement** (CLAUDE.md UI rule) on every authenticated route
- **DataGrid row-count** assertion on list routes (regressed-empty + intact-navbar = false PASS today)
- **Design-token getComputedStyle** assertion (`--bg-card`, `--text-primary`)
- **Document Review pattern** invariants on /financials/bills/[id]-style surfaces
- **Display-name vs UUID** check on PM dropdowns + activity feed (the literal Wave-C failure mode)
- **Single-NavBar invariant** on EVERY route, not just Issue-2 special-case
- **Screenshot baselines + diff** OR explicit "screenshots are diagnostic-only" framing

### Theme C — Out-of-scope pathology should be explicitly tracked (D-1 + D-2 + D-5)

Multiple reviewers found pathology near Wave-D scope that wasn't filed as TD:
- D-2: /financials/aging + /financials/aging-report identical double-AppShell (8-file or TD?)
- D-2: /invoices/[id]/page.tsx 2k+ lines dead code with double AppShell (delete or TD?)
- D-5: §11 TECH DEBT REGISTRY entry for "migrate all 45 auth.users FKs to convention" not added
- D-1: PATTERNS.md / ARCHITECTURE.md dual-FK + PostgREST embedding pattern doc deferred without follow-up plan ID

Recommendation: each "out of scope" mention in Wave-D plans needs either (a) explicit TD entry OR (b) explicit scope expansion decision. No silent drift.

### Theme D — Schema-correctness claims need pre-flight verification (D-5 + D-1)

- D-5: "45 auth.users / 3 profiles" counts unverified vs migration 00097's "30+"
- D-1: PostgREST schema-cache reload mechanism claim unverified in repo

Both should run pre-flight `information_schema` queries to anchor claims in observable reality.

### Theme E — Net-positive findings worth documenting (D-2)

D-2 yields significant scalability + observability wins worth calling out in §provides:
- ~3.6M redundant Supabase queries/day eliminated at 100k tenants (NavBar profile, org_members role, jobs list, platform_admins, notification poll × 2 → × 1)
- 60s polling timer no longer double-firing
- Dashboard 503 adjacency reduced on hot paths

This frames D-2 as scalability work, not just a UI fix.

---

## Recommended iter-2 actions

### D-1 (clean PASS, minor adjustments)
- Add `NOTIFY pgrst, 'reload schema'` to migration body (H-D1-12 strong rec)
- Note `idx_org_members_user_id` already covers FK lookup (H-D1-01)
- Add AC verifying ON DELETE NO ACTION rejects profile deletion (H-D1-05)
- Document lock posture (NOT VALID + VALIDATE alternative) (H-D1-03)

### D-2 (clean PASS, scope decisions needed)
- **DECIDE:** /financials/aging + aging-report — expand scope to 8 files OR file TD (H-D2-01)
- **DECIDE:** /invoices/[id]/page.tsx dead code — delete in D-2 OR file TD (H-D2-02)
- Tighten AC-D2-03 grep pattern (H-D2-05)
- Reframe AC-D2-05/06 as GATE-D-deferred (H-D2-06)
- Call out net-positive ~3.6M queries/day finding in §provides (Theme E)

### D-3 (needs iter-2)
- **Add fixture user / role / org guidance to "How to run"** (H-D3-01 most important)
- Add `/draws/:id/print` redirect coverage (H-D3-03)
- Fix 308 vs 301 terminology (H-D3-04)
- Add /invoices regression-redirect check (H-D3-05)
- Add Network-tab response-status check (H-D3-06)
- Add escalation path subsection (H-D3-07)
- Tighten forbidden-input grep regex (H-D3-02)

### D-4 (BLOCKED — iter-2 mandatory before execute)
- **B-D4-01/02 RESOLVE:** Rule 4 text must name (a) where in lifecycle (b) which orchestrator enforces (c) how failure halts
- **B-D4-03 RESOLVE:** Add Document Review pattern invariants to script
- **B-D4-04 RESOLVE:** Decide screenshot strategy — baseline+diff OR diagnostic-only framing
- **B-D4-05 RESOLVE:** Add logo placement assertion (global per-route invariant)
- Add design-token getComputedStyle assertions (H-D4-19)
- Add DataGrid row-count assertions on list routes (H-D4-20)
- Promote single-NavBar invariant to every route (H-D4-21)
- Add display-name vs UUID dropdown check (H-D4-09)
- Replace Drummond UUIDs with fixture UUIDs (H-D4-14)
- Gitignore `.planning/verification/auth/` (H-D4-13)
- Loud WARN on missing bypass secret (H-D4-15)
- Propagate Rule 3 to nightwork-ai-logic-checker SKILL.md (H-D4-02)
- Parallel BrowserContext fan-out to cut walltime (H-D4-16)
- Add cold-lambda warmup ping (H-D4-17)
- Idempotent screenshot filenames (timestamp/run-id) (H-D4-08)
- Reposition Rules in Standing Rules → Workflow posture? (H-D4-06) — needs Jake decision

### D-5 (needs iter-2)
- **Make pre-flight count REQUIRED** via `information_schema.referential_constraints` query (H-D5-01 + H-D5-02)
- **Add `activity_log.user_id` FK target classification** (H-D5-05 — SOC2 CC7.2)
- **Add ON DELETE CASCADE retention clause** for profiles-FK columns (H-D5-06)
- **Enumerate allowed PostgREST embedding columns** (id, full_name only, no email) (H-D5-07)
- Add SOC2 CC6.1 + CC7.2 control mapping references (H-D5-08)
- Add §11 TECH DEBT REGISTRY entry for "standardize 45 FKs" deferred (H-D5-04)
- Consider CLAUDE.md placement under Wave-D subsection vs bullet-list peer (H-D5-03)

---

## Decisions for Jake at HALT

**DEC-1 — D-2 scope:** /financials/aging + aging-report — expand D-2 to 8 files (~10 extra LOC) OR file Wave-D-followup TD?

**DEC-2 — D-2 dead code:** /invoices/[id]/page.tsx — delete in D-2 OR file TD?

**DEC-3 — D-4 lifecycle gate position:** Rule 4 fires between (executor-task-complete) and (/nightwork-qa)? Or before /gsd-ship? Pick one and codify in CLAUDE.md text.

**DEC-4 — D-4 named enforcer:** Which orchestrator/agent fails the gate? Options:
- (a) /nightwork-qa refuses to start if smoke JSON shows failures
- (b) /gsd-ship refuses to start if smoke not run since last src change
- (c) executor's own preflight check
- (d) new gating skill

**DEC-5 — D-4 screenshot strategy:** Baseline+diff (heavier infra) OR diagnostic-only framing (lighter, defers Layer 3 vision)?

**DEC-6 — D-4 Drummond UUIDs in script:** OK to commit real UUIDs (Drummond is fixture-org per CLAUDE.md "reference job")? Or replace with non-Drummond fixture UUIDs?

**DEC-7 — D-4 Rules placement in CLAUDE.md:** Development Rules section OR Standing Rules → Workflow posture section?

**DEC-8 — D-1 PostgREST NOTIFY:** Add belt-and-suspenders `NOTIFY pgrst, 'reload schema'` to migration body, given Wave-C process-gap context? (Recommended.)

**DEC-9 — D-5 pre-flight count:** Require `information_schema` query before committing the documentary "45 auth.users, 3 profiles" count? (Recommended.)

---

## HALT — Jake review

Per nwrp121 step 3: "Halt for Jake review of iter-1 findings BEFORE execute."

Until Jake's decisions on DEC-1..DEC-9, no execute. iter-2 patches authored after Jake responds, then iter-2 review (lighter — only re-review files that changed), then execute in dependency order: D-5 → D-1+D-2 parallel → D-4 → D-3.

**Wave-B remains REVOKED** per nwrp121 until Wave-D ships clean.
