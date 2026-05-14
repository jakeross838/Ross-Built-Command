---
phase: stage-f1-knowledge-graph-auth-wave-e
plan: E-2
plan-name: smoke-harness-fix
type: execute
wave: E
depends_on: []
autonomous: true
halt_after: false
requires_smoke: true
threat_model_severity: medium
status: not-started
authored: 2026-05-14
authored_by: gsd-planner (claude-opus-4-7[1m])
authorization: nwrp141-144 + Wave-D /nightwork-qa BLOCKING verdict (3-reviewer convergence on smoke harness; ai-logic-tester 4 distinct smoke bugs)
requirements: []

source_decisions:
  - "stage-f1-knowledge-graph-auth-wave-e EXPANDED-SCOPE (2026-05-14, APPROVED) — Plan E-2 absorbs E-4 security per nwrp141 decomposition. Scope = (1) production component data-component attributes, (2) Rule 6 precursor cleanup on job-sidebar.tsx, (3) wave-d-smoke.ts selector + timing fixes, (4) NEW DOM-level PM name verification AC per nwrp144 #1, (5) smoke-seed.sql plaintext-password rewrite, (6) harness-auth-bootstrap.ts updated to load passwords from gitignored credentials file."
  - "Wave-D /nightwork-qa BLOCKING verdict (2026-05-14-1700-qa-report.md) — 3-reviewer convergence on smoke harness NavBar selector mismatch (ui-reviewer + spec-checker + ai-logic-tester); ai-logic-tester surfaced 4 distinct smoke bugs (A: selector mismatch, B: form name=attribute miss, C: hydration timing waitUntil=load too early, D: /financials/bills/[id] Caldwell-fixture incompatibility — D is E-3 scope, not E-2)."
  - "nwrp140 — orchestrator-level review of /nightwork-qa BLOCKING verdict; surfaced 3-reviewer convergence on smoke selectors as the canonical Wave-E E-2 fix vector."
  - "nwrp141 — FINDING-2 prevention codified. Plaintext password committed at scripts/fixtures/smoke-seed.sql:65 ('SmokeSeed2026!') was applied to production at nwrp135 ec68df2. 9 smoke-*@nightwork.local accounts deleted from production Supabase via finding-2-remediation.md cascade map (post-cleanup at local commit 5958df0, not yet pushed). Plan E-2 seed rewrite ensures the next apply uses `crypt(gen_random_uuid()::text, gen_salt('bf'))` with apply-time random password persisted to gitignored credentials file."
  - "nwrp144 #1 — DOM-level PM name verification AC. The application-layer pm_id → orgPms[i].full_name mapping (nwrp143 Q3(a)) is the PostgREST embed's runtime payload but the actual UI rendering at `src/app/jobs/[id]/page.tsx:345` (`<Detail label='Assigned PM' value={pms.find((p) => p.id === job.pm_id)?.full_name ?? 'Unassigned'} />`) is a SECOND application-layer step. PostgREST resolving the org_members → profiles embed is necessary but not sufficient; the React code must also map pm_id to the full_name in the resulting page DOM. Plan E-2 adds the runtime verification."
  - "Rule 6 pre-flight on job-sidebar.tsx — 7 hook hits surfaced. 2 cleanable as precursor in Plan E-2 scope: line 164 + line 284 `hover:text-white` → `hover:text-[color:var(--nw-white-sand)]` (matches fd70122 + aging-report:27/aging:39 canonical sibling pattern). 5 hits on lines 192, 212, 248, 343, 407 (`rounded-full` on status dots) LEFT AS-IS — legitimate per CLAUDE.md SYSTEM.md §13 'avatars/dots use --radius-dot: 999px exception'. The hook-vs-spec divergence captured as TD-WB-01 Wave-B hook-precision-refinement candidate (NOT Plan E-2 scope)."
  - "CLAUDE.md Workflow posture Rule 4 (Playwright smoke pre-QA for UI-touching plans) — Plan E-2 fixes the runtime verification gate Rule 4 depends on. Without E-2, Wave-B inherits a broken Rule 4 gate."
  - "D-30 (CLAUDE.md tenant boundary by construction) — smoke harness uses harness-fixture@nightwork.local in fixture-harness-org; E-2 preserves this auth posture, only adds password-lifecycle change for the 9 supporting smoke users."

files_modified:
  - src/components/nav-bar.tsx
  - src/components/job-sidebar.tsx
  - scripts/wave-d-smoke.ts
  - scripts/fixtures/smoke-seed.sql
  - scripts/harness-auth-bootstrap.ts
  - src/app/jobs/[id]/page.tsx

files_referenced:
  - .planning/expansions/stage-f1-knowledge-graph-auth-wave-e-EXPANDED-SCOPE.md (Plan E-2 scope authority)
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-4-rules-and-playwright-PLAN.md (sibling Wave-D plan that authored the original smoke harness; frontmatter conventions + smoke harness contract reuse)
  - .planning/qa-runs/2026-05-14-1700-qa-report.md (3-reviewer convergence + 4-bug enumeration that gates Plan E-2)
  - .planning/qa-runs/wave-d/finding-2-remediation.md (FINDING-2 cascade map + apply-time password rationale; gitignored)
  - .planning/qa-runs/wave-d/smoke-results.json (existing smoke output; reference for current bug-state JSON shape)
  - scripts/wave-d-smoke.ts:384-387 (hydration wait `waitUntil: "load"` location)
  - scripts/wave-d-smoke.ts:406 (NavBar selector `header.app-shell-nav, header[data-component="nav-bar"]`)
  - scripts/wave-d-smoke.ts:414 (Sidebar selector `aside.app-shell-sidebar`)
  - scripts/wave-d-smoke.ts:422-435 (Logo placement invariant — relies on NavBar selector resolving)
  - scripts/wave-d-smoke.ts:473 (NavBar background-color check — second use of same selector)
  - scripts/wave-d-smoke.ts:180-216 (Route table with `select[name='pm_id']` / `select[name='assigned_pm']` / `select[name='import_default_pm_id']` primary_ux_selector entries)
  - scripts/wave-d-smoke.ts:451-468 (PM dropdown UUID-leak regex check — also references the same select[name=...] selectors)
  - src/components/nav-bar.tsx:280-283 (production `<header>` element where data-component="nav-bar" attribute lands)
  - src/components/job-sidebar.tsx:259 (production `<aside>` element where data-component="job-sidebar" attribute lands)
  - src/components/job-sidebar.tsx:164 (Rule 6 precursor target — `hover:text-white` mobile +New Job button)
  - src/components/job-sidebar.tsx:284 (Rule 6 precursor target — `hover:text-white` desktop +New Job button)
  - src/app/jobs/[id]/page.tsx:345 (PM name render site for DOM-level AC — `<Detail label="Assigned PM" value={pms.find((p) => p.id === job.pm_id)?.full_name ?? "Unassigned"} />`)
  - src/app/jobs/new/page.tsx:294-303 (production `<select>` for PM assignment WITHOUT name= attribute — drives Bug B refactor to role-based locator)
  - src/app/settings/workflow/WorkflowSettingsForm.tsx:306-315 (production `<select>` for default PM WITHOUT name= attribute)
  - src/components/invoices/InvoiceHeader.tsx:82-92 (production `<select>` for PM reassignment WITHOUT name= attribute)
  - scripts/fixtures/smoke-seed.sql:65 (hardcoded `v_password TEXT := 'SmokeSeed2026!'` — rewrite target)
  - scripts/harness-auth-bootstrap.ts:68-79 (existing HARNESS_FIXTURE_PASSWORD env var pattern; extended for credentials-file fallback)
  - CLAUDE.md "### Workflow posture" Rule 4 (Playwright smoke pre-QA for UI-touching plans — the gate E-2 unblocks)
  - .gitignore:107 (`/.planning/*` whitelist exclusion that gitignores `.planning/qa-runs/` by default — credentials file inherits exclusion)
  - .planning/architecture/ARCHITECTURE.md §SOC2 control mapping (CC6.1 = Secrets management; credentials-file approach maintains CC6.1 posture)

requires:
  - .planning/expansions/stage-f1-knowledge-graph-auth-wave-e-EXPANDED-SCOPE.md
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-4-rules-and-playwright-PLAN.md (sibling — contract reuse)
  - .planning/qa-runs/2026-05-14-1700-qa-report.md (BLOCKING verdict authority)

provides:
  - "Production component `data-component=\"nav-bar\"` attribute on `<header>` in `src/components/nav-bar.tsx:280` (matches Wave-D D-4's `data-slot=\"org-logo\"` + `data-pattern-slot` convention)"
  - "Production component `data-component=\"job-sidebar\"` attribute on `<aside>` in `src/components/job-sidebar.tsx:259`"
  - "Rule 6 precursor cleanup: 2 `hover:text-white` → `hover:text-[color:var(--nw-white-sand)]` fixes on job-sidebar.tsx lines 164 + 284"
  - "scripts/wave-d-smoke.ts: NavBar selector narrowed to single canonical form `header[data-component=\"nav-bar\"]` (drops the OR-clause to `header.app-shell-nav`)"
  - "scripts/wave-d-smoke.ts: Sidebar selector narrowed to single canonical form `aside[data-component=\"job-sidebar\"]`"
  - "scripts/wave-d-smoke.ts: Hydration wait changed from `waitUntil: \"load\"` to `waitUntil: \"networkidle\"` per ai-logic-tester Bug C (load fires before React hydrates client-side components)"
  - "scripts/wave-d-smoke.ts: Primary-UX selectors refactored from `select[name='...']` to Playwright role-based locators (`getByRole(\"combobox\", { name: /assigned pm/i })`) — name= attributes are NOT present on production selects, role-based is canonical fix"
  - "scripts/wave-d-smoke.ts: NEW DOM-level PM name verification AC (per nwrp144 #1) — for the synthetic Job Alpha smoke route, smoke asserts the rendered DOM contains 'Smoke PM Alpha' text in the `data-pm-name` element on `/jobs/[id]/page.tsx`"
  - "src/app/jobs/[id]/page.tsx: `<Detail>` component gains a `data-pm-name` attribute on the PM-display `<p>` when the label is 'Assigned PM' — enables the smoke AC to find + assert against a stable selector independent of layout shuffling"
  - "scripts/fixtures/smoke-seed.sql: REWRITTEN — replaces hardcoded `v_password TEXT := 'SmokeSeed2026!'` with apply-time-random `crypt(gen_random_uuid()::text, gen_salt('bf'))` per user. Generated email→password pairs written to `.planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt` (gitignored)"
  - "scripts/harness-auth-bootstrap.ts: extended to read smoke-* user passwords from `.planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt` when authenticating as a smoke-* user (NOT the harness-fixture user; that still uses HARNESS_FIXTURE_PASSWORD env var per nwrp139/141 don't-rotate decision)"
  - "Resolves Wave-D /nightwork-qa BLOCKING #1 + #2 + #3 (smoke harness selectors + form names + hydration) and HIGH #6 (plaintext password)"

affects:
  - "All future /nightwork-qa invocations of `requires_smoke: true` plans — smoke harness selectors are now stable against the production DOM. Wave-B can rely on the Rule 4 gate."
  - "Wave-B unblock dependency — per Wave-E EXPANDED-SCOPE Wave-B Prerequisites, items 8 + 9 (smoke harness fixes + vendor PII + seed-account cleanup) resolved if PASS."
  - "Future smoke harnesses (Wave 1.1-Full Layer 4 framework) — credentials-file pattern is the canonical posture for any synthetic-user-with-random-password Playwright runner. The HARNESS_FIXTURE_PASSWORD env var pattern remains for the single canonical harness-fixture user (don't-rotate per nwrp139)."
  - "Future plans that test PM-name rendering — the `data-pm-name` attribute pattern is the canonical test-target for displayed user-identity names. Extends to other 'Assigned X' patterns (Assigned Vendor, Assigned QA Reviewer) by analogy."
  - "Plan E-1 + Plan E-3 — Plan E-2 is independent (different files_modified) BUT E-2 sequences FIRST in execute because it gates downstream smoke runs. E-1 + E-3 can dispatch in parallel after E-2 ships."

sequence:
  before: "E-1 + E-3 smoke validation; orchestrator re-applies seed post-merge then re-runs wave-d-smoke.ts against re-applied 9 smoke users"
  parallel_execute_ok: "true with E-1 (different files: api/invoices/[id]/route.ts vs E-2 files) + E-3 (different files: financials/bills/[id]/page.tsx vs E-2 files). Verified disjoint files_modified per Wave-E EXPANDED-SCOPE Rule 5 check. E-2 still sequences FIRST in execution order because E-1 + E-3 both declare requires_smoke=true; smoke validates their work, and smoke is broken until E-2 lands."
  blocks: ["/nightwork-qa revalidation post-Wave-E execute (per Wave-E EXPANDED-SCOPE AC-E-11)"]

acceptance-criteria-target: 14 falsifiable items (AC-E2-01..AC-E2-14); see "Acceptance criteria" below — covers all 6 sub-steps + cross-references AC-E-02..AC-E-08 in Wave-E EXPANDED-SCOPE

threat_model:
  trust_boundaries:
    - "Production component attribute boundary — adding `data-component=\"nav-bar\"` + `data-component=\"job-sidebar\"` to production JSX is attribute-only (no visual or behavior change). The attributes form a contract for the smoke harness selector, mirroring the D-4 pattern. Threat surface: attribute removed by a future plan-author who doesn't realize it's load-bearing for the smoke gate. Mitigation: data-component attributes are now first-class hook-protected per the D-4 convention; any future removal would surface in plan-review iter-1 via the same Rule 6 mechanical scan that flags forbidden patterns."
    - "Smoke harness selector boundary — smoke harness queries the production DOM via Playwright. The selector must match exactly one canonical form OR fall back gracefully. Pre-E-2 the selector OR'd `header.app-shell-nav` (legacy class never applied) WITH `header[data-component=\"nav-bar\"]` (the intended new attribute, never added) — both branches missed. E-2 collapses to single canonical form. Threat surface: false PASS if the hook gates pass but the production DOM diverges (e.g., NavBar wrapped in another header element). Mitigation: Rule 4 smoke is the runtime verification gate; the existing `Expected exactly 1 NavBar` invariant (wave-d-smoke.ts:408-411) catches duplicate-rendering regressions."
    - "Credentials-file lifecycle boundary — `.planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt` lives on Jake's local checkout (gitignored per `.planning/qa-runs/` exclusion). The file is written by the SQL seed apply step (orchestrator post-execute, NOT plan body) and consumed by harness-auth-bootstrap.ts. Threat surface: (a) accidental commit if .gitignore exclusion is regressed; (b) stale file from a previous apply when re-running smoke against a freshly-reapplied seed. Mitigation: (a) the file's name explicitly contains 'DO-NOT-COMMIT' as a tripwire for grep-based pre-push hooks; the existing `.planning/qa-runs/` whitelist exclusion in .gitignore:107 is the structural defense. (b) seed apply REWRITES the file every time, so stale state cannot persist across applies — credentials are tied 1:1 to the running auth.users rows."
    - "Random password-strength boundary — `crypt(gen_random_uuid()::text, gen_salt('bf'))` uses 128-bit UUID (~122 bits of entropy after canonical-form padding) hashed via bcrypt with a 2^11 cost factor (Supabase default). For RLS-scoped synthetic accounts in fixture-harness-org, this is overkill — the threat model is `R (Repudiation — credentials in repo)` which the rewrite eliminates by never persisting cleartext to git. The credentials file on Jake's filesystem is an acceptable hand-off mechanism per D-30 tenant-by-construction posture."
    - "Apply-time-vs-commit-time boundary — the plan body changes the SEED FILE (commit-time artifact). The orchestrator runs `Supabase MCP execute_sql` post-merge to APPLY the rewritten seed (apply-time, NOT in plan body). The acceptance criterion AC-E2-13 below verifies the seed file shape; AC-E-07 (Wave-E cumulative) verifies the smoke re-run post-apply. The plan-author MUST NOT include the seed apply as a task (would require Supabase MCP credentials in execute-plan context, which is wrong layer)."

  threats:
    - id: T-E-2-01
      category: "I (Information Disclosure — credentials file leaked via stale gitignore)"
      component: ".planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt"
      disposition: "mitigate"
      mitigation: "File name contains 'DO-NOT-COMMIT' substring for human-visible tripwire. Lives under .planning/qa-runs/ which is gitignored by default per .gitignore:107 (whitelist exclusion — only specific paths under .planning/ are tracked). Verification at AC-E2-13: `git status --ignored | grep 'smoke-seed-credentials' || echo 'UNTRACKED'`. If the file ever appears in `git status` (untracked → unignored), a gitignore regression has occurred and must be remediated before commit. Suggested pre-push hook addition (NOT in E-2 scope): grep --include='*-DO-NOT-COMMIT.*' over staged files."
    - id: T-E-2-02
      category: "T (Tampering — DOM-level PM name AC produces false PASS on attribute-only render)"
      component: "scripts/wave-d-smoke.ts new DOM-level PM name AC + src/app/jobs/[id]/page.tsx <Detail> attribute"
      disposition: "mitigate"
      mitigation: "AC is two-pronged: (a) `[data-pm-name]` attribute MUST be present on the rendered element AND (b) `textContent` MUST equal 'Smoke PM Alpha' (the synthetic seed's pm_id-resolved name for Job Alpha). Just having the attribute is not enough — the attribute value or innerText must contain the expected PM display string. This catches the actual PostgREST resolving + application-layer pm_id→full_name mapping that nwrp143 Q3(a) flagged. If a future regression breaks PostgREST embed: the `pms` array becomes empty, `pms.find(...)?.full_name` returns undefined, the Detail renders '—' (per Detail's `value ?? '—'` fallback), and the smoke AC fails on textContent mismatch."
    - id: T-E-2-03
      category: "D (Denial of Service — networkidle hydration wait stalls on background polling)"
      component: "scripts/wave-d-smoke.ts page.goto waitUntil change"
      disposition: "mitigate"
      mitigation: "Some Nightwork pages poll background endpoints (notification-bell every 30s, presence indicators). `waitUntil: \"networkidle\"` requires 500ms of zero network activity which can stall behind these. Mitigation: existing per-route 30s timeout still bounds the wait (PER_ROUTE_TIMEOUT_MS at wave-d-smoke.ts:113); on timeout the route records `error_timeout` rather than hanging the outer walk. If timeouts surface as false negatives during the Wave-E re-run, fallback path is `waitForLoadState('domcontentloaded')` + explicit `waitForSelector('header[data-component=\"nav-bar\"]', { state: 'visible' })` per route. The plan body implements `networkidle` first (per ai-logic-tester Bug C primary recommendation); if it stalls during Wave-E orchestrator re-run, downstream patch reverts to the waitForSelector form (NOT a new plan; revert via direct executor patch)."
    - id: T-E-2-04
      category: "S (Spoofing — apply-time random password reused across applies)"
      component: "scripts/fixtures/smoke-seed.sql v_password generation"
      disposition: "accept"
      mitigation: "Each `psql -f scripts/fixtures/smoke-seed.sql` apply MUST generate FRESH passwords. The `crypt(gen_random_uuid()::text, gen_salt('bf'))` expression is evaluated at apply time inside the DO $$ block; `gen_random_uuid()` is non-deterministic. If a developer accidentally cached the SQL output or replayed the same INSERT verbatim, the cached row would contain the OLD bcrypt hash (passwords don't 'leak' across applies — the bcrypt hash is one-way). Acceptable: the threat model here is 'committed plaintext in git' which the rewrite eliminates. Cross-apply password reuse is a non-issue for synthetic fixture-org accounts."
    - id: T-E-2-05
      category: "R (Repudiation — Rule 6 hook-vs-spec divergence on rounded-full dots silently degrades hook precision)"
      component: "Rule 6 precursor cleanup scope on job-sidebar.tsx"
      disposition: "accept-with-followup"
      mitigation: "5 hook-flagged `rounded-full` hits on job-sidebar.tsx lines 192, 212, 248, 343, 407 are LEGITIMATE per CLAUDE.md SYSTEM.md §13 ('avatars/dots use --radius-dot: 999px exception'). The post-edit hook's regex doesn't distinguish status-dot avatars from rounded buttons. Plan E-2 documents the divergence at TD-WB-01 (Wave-B hook-precision-refinement candidate). Plan E-2 does NOT 'fix' these hits — they're spec-compliant. The 2 hits cleaned by E-2 (`hover:text-white` on lines 164 + 284) ARE forbidden by spec (per fd70122 + aging-report:27/aging:39 sibling pattern); only those 2 are precursor scope."

must_haves:
  truths:
    - "After Plan E-2 ships, `grep -n 'data-component=\"nav-bar\"' src/components/nav-bar.tsx` returns >=1 match (per Wave-E EXPANDED-SCOPE AC-E-02)"
    - "After Plan E-2 ships, `grep -n 'data-component=\"job-sidebar\"' src/components/job-sidebar.tsx` returns >=1 match (per Wave-E EXPANDED-SCOPE AC-E-03)"
    - "After Plan E-2 ships, `grep -nE '\\b(bg|text|border)-(white|black)\\b' src/components/job-sidebar.tsx` returns 0 hits (Rule 6 precursor cleanup; per Wave-E EXPANDED-SCOPE AC-E-04)"
    - "After Plan E-2 ships, `grep -n 'SmokeSeed2026' scripts/fixtures/smoke-seed.sql` returns 0 hits (per Wave-E EXPANDED-SCOPE AC-E-05)"
    - "After Plan E-2 ships, `grep -nE 'crypt\\(gen_random_uuid|smoke-seed-credentials-DO-NOT-COMMIT' scripts/fixtures/smoke-seed.sql` returns >=1 match each (per Wave-E EXPANDED-SCOPE AC-E-06; total combined >=1, but both substrings must be present)"
    - "After Plan E-2 ships, scripts/wave-d-smoke.ts NavBar selector at line 406 + line 473 is single canonical `header[data-component=\"nav-bar\"]` (NOT OR'd with `header.app-shell-nav`)"
    - "After Plan E-2 ships, scripts/wave-d-smoke.ts Sidebar selector at line 414 is single canonical `aside[data-component=\"job-sidebar\"]` (NOT OR'd with `aside.app-shell-sidebar`)"
    - "After Plan E-2 ships, scripts/wave-d-smoke.ts page.goto uses `waitUntil: \"networkidle\"` (NOT `waitUntil: \"load\"`)"
    - "After Plan E-2 ships, scripts/wave-d-smoke.ts primary_ux_selector for Job Alpha route asserts DOM-level PM name 'Smoke PM Alpha' via `[data-pm-name]` text-content match (per nwrp144 #1; per Wave-E EXPANDED-SCOPE AC-E-08)"
    - "After Plan E-2 ships, src/app/jobs/[id]/page.tsx `<Detail>` component renders `data-pm-name=\"<full_name>\"` attribute when label is 'Assigned PM' (enables the AC above)"
    - "After Plan E-2 ships, scripts/wave-d-smoke.ts replaces all 3 `select[name='pm_id']` / `select[name='assigned_pm']` / `select[name='import_default_pm_id']` primary_ux_selector entries with Playwright role-based locator equivalents (`page.getByRole(\"combobox\", { name: /assigned pm/i })` pattern)"
    - "After Plan E-2 ships, scripts/harness-auth-bootstrap.ts reads passwords from `.planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt` when authenticating as a `smoke-*@nightwork.local` user; falls back to HARNESS_FIXTURE_PASSWORD env var when authenticating as harness-fixture@nightwork.local"
    - "After Plan E-2 ships, npm run build returns 0 errors + 0 warnings"
    - "After Plan E-2 ships, npx tsc --noEmit returns 0 errors in scripts/ + src/"

  artifacts:
    - path: "src/components/nav-bar.tsx"
      provides: "data-component=\"nav-bar\" attribute on `<header>` element at line 280"
      contains: ["data-component=\"nav-bar\""]
      min_lines: 455 (file gains 1 attribute; ~454 → ~455 lines)
    - path: "src/components/job-sidebar.tsx"
      provides: "data-component=\"job-sidebar\" attribute on `<aside>` at line 259 + Rule 6 precursor cleanup on lines 164 + 284"
      contains: ["data-component=\"job-sidebar\"", "hover:text-[color:var(--nw-white-sand)]"]
    - path: "src/app/jobs/[id]/page.tsx"
      provides: "data-pm-name attribute on `<Detail>` component when label is 'Assigned PM'"
      contains: ["data-pm-name"]
    - path: "scripts/wave-d-smoke.ts"
      provides: "Updated NavBar + Sidebar selectors (single canonical form), waitUntil=networkidle, role-based primary-UX locators, NEW DOM-level PM name AC on Job Alpha route"
      contains: ["header[data-component=\"nav-bar\"]", "aside[data-component=\"job-sidebar\"]", "networkidle", "getByRole", "data-pm-name", "Smoke PM Alpha"]
    - path: "scripts/fixtures/smoke-seed.sql"
      provides: "Rewritten seed using crypt(gen_random_uuid()::text, gen_salt('bf')) for each user + apply-time persistence of generated passwords to gitignored credentials file"
      contains: ["crypt(gen_random_uuid()::text", "gen_salt('bf')", "smoke-seed-credentials-DO-NOT-COMMIT"]
    - path: "scripts/harness-auth-bootstrap.ts"
      provides: "Credentials-file fallback path when authenticating as smoke-* users"
      contains: ["smoke-seed-credentials-DO-NOT-COMMIT.txt", "smoke-"]

  key_links:
    - from: "scripts/wave-d-smoke.ts"
      to: "src/components/nav-bar.tsx data-component attribute"
      via: "selector `header[data-component=\"nav-bar\"]`"
      pattern: "data-component=\"nav-bar\""
    - from: "scripts/wave-d-smoke.ts"
      to: "src/components/job-sidebar.tsx data-component attribute"
      via: "selector `aside[data-component=\"job-sidebar\"]`"
      pattern: "data-component=\"job-sidebar\""
    - from: "scripts/wave-d-smoke.ts"
      to: "src/app/jobs/[id]/page.tsx PM name render"
      via: "DOM-level AC asserting [data-pm-name] textContent contains seed-fixture PM name"
      pattern: "data-pm-name.*Smoke PM Alpha"
    - from: "scripts/fixtures/smoke-seed.sql"
      to: ".planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt"
      via: "apply-time COPY or psql \\o or pg_notify hand-off — seed writes generated email→password rows to the file"
      pattern: "smoke-seed-credentials-DO-NOT-COMMIT"
    - from: "scripts/harness-auth-bootstrap.ts"
      to: ".planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt"
      via: "fs.readFileSync at bootstrap time when smoke-* user is requested"
      pattern: "smoke-seed-credentials-DO-NOT-COMMIT"
    - from: "scripts/wave-d-smoke.ts"
      to: "scripts/harness-auth-bootstrap.ts"
      via: "inline bootstrap invocation when storageState missing (ensureStorageState helper at wave-d-smoke.ts:304-334)"
      pattern: "harness-auth-bootstrap"
---

<objective>
Plan E-2 closes the Wave-D /nightwork-qa BLOCKING verdict on the smoke harness. Three reviewers (ui-reviewer + spec-checker + ai-logic-tester) converged on the NavBar selector mismatch; ai-logic-tester additionally surfaced 4 distinct smoke bugs (A: selector mismatch, B: form name=attribute miss, C: hydration timing waitUntil=load too early, D: /financials/bills/[id] Caldwell-fixture incompatibility — D is E-3 scope, not E-2). Plan E-2 fixes bugs A + B + C through 6 sub-steps: (1) add `data-component` attributes to production NavBar + JobSidebar matching the D-4 `data-slot` convention; (2) Rule 6 precursor cleanup of 2 `hover:text-white` violations on job-sidebar.tsx (lines 164 + 284); (3) update wave-d-smoke.ts selectors + hydration wait + primary-UX selectors to use Playwright role-based locators; (4) NEW DOM-level PM name verification AC per nwrp144 #1 — validates the application-layer pm_id → orgPms[i].full_name mapping by asserting the rendered DOM contains "Smoke PM Alpha" on the synthetic Job Alpha route; (5) REWRITE scripts/fixtures/smoke-seed.sql to use apply-time `crypt(gen_random_uuid()::text, gen_salt('bf'))` per user with generated passwords persisted to gitignored `.planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt`; (6) update scripts/harness-auth-bootstrap.ts to read smoke-* user passwords from the credentials file.

The plan resolves Wave-D /nightwork-qa BLOCKING #1 + #2 + #3 (smoke harness selector mismatch + primary-UX form name attributes + hydration timing) and the HIGH security finding (plaintext password committed in git). Plan E-2 also adds the DOM-level PM name AC per nwrp144 #1 — this AC validates the SECOND application-layer step in the PostgREST resolve → application-layer mapping → DOM render chain. PostgREST resolving the org_members → profiles embed is necessary but not sufficient; the React code at `src/app/jobs/[id]/page.tsx:345` must also map pm_id to full_name from the orgPms array, and that final DOM rendering must contain the expected PM name. The new AC catches regressions at that final mapping step.

Plan E-2 is the FIRST plan in Wave-E execution order. Without E-2, the Rule 4 smoke gate (CLAUDE.md Workflow posture) remains broken, and Wave-B inherits a blind smoke verifier. Plan E-1 (vendor PII narrow) + Plan E-3 (/financials/bills/[id] real DB wire) are independent at the files_modified level and can dispatch in parallel after E-2 ships, BUT both declare `requires_smoke: true` and depend on the working smoke harness for /nightwork-qa revalidation. The orchestrator applies the rewritten seed via Supabase MCP execute_sql AFTER E-2 commits land (orchestrator-level step, NOT in plan body — see Wave-E EXPANDED-SCOPE post-execute steps).

Plan E-2 also surfaces a halt-finding for plan-review consideration: implementing the DOM-level PM name AC requires adding a `data-pm-name` attribute to the `<Detail>` component on `src/app/jobs/[id]/page.tsx`. This is a small JSX patch (attribute-only, no visual or behavior change) but it adds a production-component-level test-stability concern. The plan body includes the patch; if plan-review or Jake prefers an alternate AC mechanism (e.g., role-based text match without a dedicated attribute), the AC text-content prong remains valid without the attribute prong.

**Out of E-2 scope (per Wave-E EXPANDED-SCOPE):**
- E-1 vendor PII narrow (separate plan; api/invoices/[id]/route.ts vendor embed)
- E-3 /financials/bills/[id] route wire (separate plan; replaces in-memory CALDWELL_INVOICES with real DB query)
- harness-fixture password rotation (override per nwrp141 Q2; documented in calibration log)
- jobs/[id]/overview select(*) PII (TD-WD-06 for Wave 1.1-Lite)
- D-arch deployment architecture decision (deferred per nwrp138)
- User-identity FK convention D-### entry (Wave-E close-out scope per nwrp144 #2; authored AFTER E-1/E-2/E-3 ship + /nightwork-qa PASS)
- Hook precision refinement for rounded-full status dots (Wave-B TD-WB-01 candidate; 5 legitimate hits on job-sidebar.tsx remain after E-2's 2 precursor fixes)

Output:
- src/components/nav-bar.tsx (1-line patch: `data-component="nav-bar"` on `<header>`)
- src/components/job-sidebar.tsx (3-edit patch: `data-component="job-sidebar"` on `<aside>` + 2 `hover:text-white` precursor fixes)
- src/app/jobs/[id]/page.tsx (1-edit patch: `data-pm-name` attribute on `<Detail>` for 'Assigned PM' label)
- scripts/wave-d-smoke.ts (5-edit patch: 2 selector simplifications + waitUntil change + primary-UX locator refactor + new DOM-level PM name AC)
- scripts/fixtures/smoke-seed.sql (rewrite section: password generation + credentials-file persistence)
- scripts/harness-auth-bootstrap.ts (extension: credentials-file fallback for smoke-* users)
</objective>

<execution_context>
@C:/Users/Jake/nightwork-platform/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Jake/nightwork-platform/.claude/get-shit-done/templates/summary.md
</execution_context>

<canonical_refs>
@.planning/STATE.md
@.planning/expansions/stage-f1-knowledge-graph-auth-wave-e-EXPANDED-SCOPE.md
@.planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-4-rules-and-playwright-PLAN.md
@.planning/qa-runs/2026-05-14-1700-qa-report.md
@CLAUDE.md

<!-- Production component files touched -->
@src/components/nav-bar.tsx
@src/components/job-sidebar.tsx
@src/app/jobs/[id]/page.tsx

<!-- Production component files referenced (not modified) for selector context -->
@src/app/jobs/new/page.tsx
@src/app/settings/workflow/WorkflowSettingsForm.tsx
@src/components/invoices/InvoiceHeader.tsx

<!-- Smoke harness files modified -->
@scripts/wave-d-smoke.ts
@scripts/fixtures/smoke-seed.sql
@scripts/harness-auth-bootstrap.ts

<!-- Smoke harness helpers (not modified) for context -->
@src/lib/verification/_browser.ts
@src/lib/verification/auth-strategy.ts

<interfaces>
<!-- Production NavBar + JobSidebar are React components; smoke harness selectors are the contract -->

```typescript
// src/components/nav-bar.tsx (existing — gains data-component attribute)
<header
  ref={menuRef}
  data-component="nav-bar"   // NEW per Plan E-2
  className="bg-nw-slate-deeper border-b border-[rgba(247,245,236,0.08)] sticky top-0 z-40"
>

// src/components/job-sidebar.tsx (existing — gains data-component attribute)
<aside
  data-component="job-sidebar"   // NEW per Plan E-2
  className="hidden md:flex flex-col w-[220px] shrink-0 border-r border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden"
>

// src/app/jobs/[id]/page.tsx (existing Detail component — extended to accept data-pm-name)
function Detail({ label, value, dataPmName }: { label: string; value: string | null | undefined; dataPmName?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <NwEyebrow tone="muted">{label}</NwEyebrow>
      <p
        className="text-sm"
        style={{ color: "var(--text-primary)" }}
        data-pm-name={dataPmName ? value ?? "" : undefined}   // NEW per Plan E-2
      >
        {value ?? "—"}
      </p>
    </div>
  );
}

// Usage at line 345 (existing — passes dataPmName flag):
<Detail
  label="Assigned PM"
  value={pms.find((p) => p.id === job.pm_id)?.full_name ?? "Unassigned"}
  dataPmName   // NEW
/>
```

```typescript
// scripts/wave-d-smoke.ts new helpers + AC (will be added)

// Helper: read smoke-* user password from gitignored credentials file
function loadSmokeUserPassword(email: string): string | null {
  if (!email.startsWith("smoke-")) return null;
  const credPath = path.join(SMOKE_OUTPUT_DIR, "smoke-seed-credentials-DO-NOT-COMMIT.txt");
  if (!existsSync(credPath)) return null;
  const content = readFileSync(credPath, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const [credEmail, credPw] = line.split(/\s+/);
    if (credEmail === email) return credPw;
  }
  return null;
}

// New invariant: DOM-level PM name verification (added to checkRoute per-route loop
// when route matches /jobs/22222222-2222-2222-2222-200000000001):
if (route === "/jobs/22222222-2222-2222-2222-200000000001") {
  const pmNameEl = await page.$('[data-pm-name]');
  if (!pmNameEl) {
    invariantFailures.push(
      `DOM-level PM name verification: [data-pm-name] element missing on ${route}`
    );
  } else {
    const txt = (await pmNameEl.textContent())?.trim() ?? "";
    if (!txt.includes("Smoke PM Alpha")) {
      invariantFailures.push(
        `DOM-level PM name verification: expected "Smoke PM Alpha" in [data-pm-name] textContent, got "${txt}"`
      );
    }
  }
}
```

```sql
-- scripts/fixtures/smoke-seed.sql (will be rewritten)

DO $$
DECLARE
  v_user RECORD;
  v_password TEXT;
  v_creds TEXT := '';
BEGIN
  FOR v_user IN
    SELECT * FROM (VALUES
      ('00000000-0000-0000-0002-000000000001'::uuid, 'smoke-owner@nightwork.local',      'Smoke Owner',      'admin'),
      ('00000000-0000-0000-0002-000000000002'::uuid, 'smoke-pm-alpha@nightwork.local',   'Smoke PM Alpha',   'pm'),
      -- ... 7 more rows ...
    ) AS t(id, email, full_name, role)
  LOOP
    v_password := gen_random_uuid()::text;   -- raw cleartext (NOT persisted to DB)
    v_creds := v_creds || v_user.email || ' ' || v_password || E'\n';

    INSERT INTO auth.users (...)
    VALUES (
      ...,
      crypt(v_password, gen_salt('bf')),     -- bcrypt-hashed in DB
      ...
    )
    ON CONFLICT (id) DO UPDATE SET
      encrypted_password = crypt(v_password, gen_salt('bf')),   -- re-hash on apply (new password each time)
      email_confirmed_at = COALESCE(auth.users.email_confirmed_at, NOW()),
      updated_at = NOW();

    -- ... auth.identities insert ...
  END LOOP;

  -- Persist generated credentials to plain text via Postgres NOTICE (psql captures
  -- this into stdout when run via `psql -f`; orchestrator pipes stdout to the
  -- gitignored credentials file post-apply). See seed file header for full apply
  -- procedure.
  RAISE NOTICE 'SMOKE_SEED_CREDENTIALS_START';
  RAISE NOTICE '%', v_creds;
  RAISE NOTICE 'SMOKE_SEED_CREDENTIALS_END';
END $$;
```

```typescript
// scripts/harness-auth-bootstrap.ts new credentials-file fallback (will be added)

import { readFileSync, existsSync } from "node:fs";
import * as path from "node:path";

function resolvePassword(email: string): string {
  // For smoke-*@nightwork.local accounts: read from gitignored credentials file
  if (email.startsWith("smoke-")) {
    const credPath = path.resolve(
      process.cwd(),
      ".planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt",
    );
    if (existsSync(credPath)) {
      const content = readFileSync(credPath, "utf-8");
      for (const line of content.split(/\r?\n/)) {
        const [credEmail, credPw] = line.split(/\s+/);
        if (credEmail === email && credPw) return credPw;
      }
    }
    throw new Error(
      `Cannot find password for ${email}. Expected credentials file at ${credPath} — ` +
      `did the orchestrator capture seed-apply NOTICE output to this path?`
    );
  }

  // For harness-fixture@nightwork.local: env var per nwrp139/141 don't-rotate decision
  const envPassword = process.env.HARNESS_FIXTURE_PASSWORD;
  if (!envPassword) {
    throw new Error(
      "Missing HARNESS_FIXTURE_PASSWORD env. Set the harness fixture user password before running bootstrap."
    );
  }
  return envPassword;
}
```
</interfaces>
</canonical_refs>

<scope>

**This plan ships 6 atomic sub-steps in a single commit:**

1. **Production component attribute additions** (Step 1 below) — 2 files, 2 attribute-only patches.
2. **Rule 6 precursor cleanup on job-sidebar.tsx** (Step 2 below) — 2 hover:text-white → hover:text-[color:var(--nw-white-sand)] edits.
3. **Smoke harness selector + timing fixes in wave-d-smoke.ts** (Step 3 below) — 4 edits (NavBar selector x2, sidebar selector, hydration wait, primary-UX role-based locator refactor).
4. **DOM-level PM name verification AC** (Step 4 below) — adds a new invariant check in wave-d-smoke.ts + a `data-pm-name` attribute on the `<Detail>` component in jobs/[id]/page.tsx.
5. **Smoke seed rewrite — never commit plaintext password** (Step 5 below) — replaces hardcoded password with apply-time random + persists generated passwords to gitignored credentials file via PostgreSQL RAISE NOTICE.
6. **Harness auth bootstrap extension** (Step 6 below) — reads smoke-* user passwords from credentials file; falls back to HARNESS_FIXTURE_PASSWORD env var for the harness-fixture user.

**Plan E-2 does NOT include:**

- The Supabase MCP `execute_sql` step that re-applies the rewritten seed to production (orchestrator-level post-merge step per Wave-E EXPANDED-SCOPE sequencing diagram, lines 102-125 — NOT a task in the plan body)
- Running wave-d-smoke.ts against the re-applied seed (orchestrator post-execute step, AC-E-07 cumulative)
- jobs/[id]/overview select(*) PII narrowing (TD-WD-06 for Wave 1.1-Lite)
- Hook precision refinement for rounded-full status dots (TD-WB-01 Wave-B candidate; the 5 legitimate hits on job-sidebar.tsx lines 192, 212, 248, 343, 407 are spec-compliant per CLAUDE.md SYSTEM.md §13 'avatars/dots use --radius-dot: 999px exception')
- E-1 vendor PII narrow (separate plan; Wave-E EXPANDED-SCOPE)
- E-3 /financials/bills/[id] real DB wire (separate plan; Wave-E EXPANDED-SCOPE)
- User-identity FK convention D-### MASTER-PLAN entry (Wave-E close-out per nwrp144 #2)

**Plan body order of operations (execute as written; do NOT reorder):**

Steps 1-6 must commit AS A SINGLE ATOMIC COMMIT per Wave-E EXPANDED-SCOPE commit posture. The order in the plan body reflects logical dependency (production attribute exists before smoke selector relies on it; precursor cleanup before unrelated edits to keep `git diff` reviewable) but execution within the plan can interleave Edit tool calls freely. The final pre-commit state must satisfy all 14 acceptance criteria.

</scope>

<criteria>
mechanical:
  - "npm run build clean (0 warnings, 0 errors)"
  - "npx tsc --noEmit returns 0 errors in scripts/ + src/"
  - "grep -nE 'data-component=\"nav-bar\"' src/components/nav-bar.tsx returns >=1 match (AC-E2-01)"
  - "grep -nE 'data-component=\"job-sidebar\"' src/components/job-sidebar.tsx returns >=1 match (AC-E2-02)"
  - "grep -nE '\\b(bg|text|border)-(white|black)\\b' src/components/job-sidebar.tsx returns 0 hits (AC-E2-03 Rule 6 precursor)"
  - "grep -n 'SmokeSeed2026' scripts/fixtures/smoke-seed.sql returns 0 hits (AC-E2-04)"
  - "grep -nE 'crypt\\(gen_random_uuid\\(\\)::text|gen_random_uuid\\(\\)::text' scripts/fixtures/smoke-seed.sql returns >=1 match (AC-E2-05)"
  - "grep -n 'smoke-seed-credentials-DO-NOT-COMMIT' scripts/fixtures/smoke-seed.sql returns >=1 match (AC-E2-06)"
  - "grep -nE 'header\\[data-component=\\\"nav-bar\\\"\\]' scripts/wave-d-smoke.ts returns >=2 matches (line 406 + line 473 callsites; AC-E2-07)"
  - "grep -nE 'header\\.app-shell-nav' scripts/wave-d-smoke.ts returns 0 hits (legacy OR-clause removed; AC-E2-07 corroborate)"
  - "grep -nE 'aside\\[data-component=\\\"job-sidebar\\\"\\]' scripts/wave-d-smoke.ts returns >=1 match (line 414; AC-E2-08)"
  - "grep -nE 'aside\\.app-shell-sidebar' scripts/wave-d-smoke.ts returns 0 hits (legacy OR-clause removed; AC-E2-08 corroborate)"
  - "grep -nE 'waitUntil:\\s*\"networkidle\"' scripts/wave-d-smoke.ts returns >=1 match (AC-E2-09)"
  - "grep -nE 'waitUntil:\\s*\"load\"' scripts/wave-d-smoke.ts returns 0 hits (legacy waitUntil removed; AC-E2-09 corroborate)"
  - "grep -nE 'getByRole' scripts/wave-d-smoke.ts returns >=1 match (role-based locator refactor; AC-E2-10)"
  - "grep -nE 'select\\[name=.pm_id.\\]|select\\[name=.assigned_pm.\\]|select\\[name=.import_default_pm_id.\\]' scripts/wave-d-smoke.ts returns 0 hits OUTSIDE comment lines (`-n '^[^/]'` filter; AC-E2-10 corroborate — all 3 attribute-based selectors must be removed from active code, may remain in commented-out blocks for archaeology)"
  - "grep -nE 'data-pm-name' scripts/wave-d-smoke.ts returns >=1 match (AC-E2-11 new DOM-level AC)"
  - "grep -nE 'Smoke PM Alpha' scripts/wave-d-smoke.ts returns >=1 match (AC-E2-11 corroborate)"
  - "grep -nE 'data-pm-name' src/app/jobs/\\[id\\]/page.tsx returns >=1 match (AC-E2-12 production component support)"
  - "grep -nE 'smoke-seed-credentials-DO-NOT-COMMIT' scripts/harness-auth-bootstrap.ts returns >=1 match (AC-E2-13 credentials-file fallback)"
  - "grep -nE 'HARNESS_FIXTURE_PASSWORD' scripts/harness-auth-bootstrap.ts returns >=1 match (existing env var pattern preserved for harness-fixture user; AC-E2-13 corroborate)"
  - "git status --porcelain | grep -E 'smoke-seed-credentials-DO-NOT-COMMIT' returns 0 hits (verifies the file is NOT staged + IS gitignored; runs before commit; AC-E2-14)"
  - "All hooks silent on every commit (Drummond grep gate via .githooks/pre-commit; nightwork-post-edit drift gate)"

dom:
  - "AT WAVE-E ORCHESTRATOR POST-EXECUTE STEP (not Plan E-2 criterion): After orchestrator re-applies seed via Supabase MCP execute_sql + re-runs wave-d-smoke.ts against staging URL, the smoke-results.json for /jobs/22222222-2222-2222-2222-200000000001 route must contain `\"primary_ux_pass\": true` AND `invariant_failures: []` (empty array) AND screenshot at .planning/qa-runs/wave-d/screenshots/jobs_22222222-2222-2222-2222-200000000001-<run-id>.png exists. The DOM-level PM name AC fires within the invariant_failures check (not primary_ux_pass) — empty invariant_failures = AC passes."

visual:
  - "N/A — no new UI surfaces rendered. Attribute-only patches do not affect visual output."

behavioral:
  - "AC-E2-01: `data-component=\"nav-bar\"` attribute added to `<header>` in src/components/nav-bar.tsx (Step 1). Production renders unchanged (attribute is invisible to users)."
  - "AC-E2-02: `data-component=\"job-sidebar\"` attribute added to `<aside>` in src/components/job-sidebar.tsx (Step 1). Production renders unchanged."
  - "AC-E2-03: Rule 6 precursor cleanup — both `hover:text-white` instances on job-sidebar.tsx (line 164 + line 284) replaced with `hover:text-[color:var(--nw-white-sand)]` (Step 2). Hover color matches fd70122 + aging-report:27/aging:39 canonical sibling pattern."
  - "AC-E2-04: scripts/fixtures/smoke-seed.sql no longer contains hardcoded `SmokeSeed2026!` password literal (Step 5). The `v_password TEXT := 'SmokeSeed2026!'` line is REPLACED with `v_password TEXT := gen_random_uuid()::text;` (cleartext is generated at apply time; the cleartext is NEVER inserted into auth.users — only the bcrypt hash via `crypt(v_password, gen_salt('bf'))`)."
  - "AC-E2-05: scripts/fixtures/smoke-seed.sql uses `gen_random_uuid()::text` for cleartext password generation + `crypt(v_password, gen_salt('bf'))` for bcrypt hashing (Step 5)."
  - "AC-E2-06: scripts/fixtures/smoke-seed.sql references `.planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt` in seed header comments + uses `RAISE NOTICE` to emit per-user `email password` lines that the apply step pipes to the credentials file (Step 5)."
  - "AC-E2-07: scripts/wave-d-smoke.ts NavBar selector at line 406 + line 473 simplified to single canonical form `header[data-component=\"nav-bar\"]` — legacy `header.app-shell-nav` removed (Step 3)."
  - "AC-E2-08: scripts/wave-d-smoke.ts Sidebar selector at line 414 simplified to single canonical form `aside[data-component=\"job-sidebar\"]` — legacy `aside.app-shell-sidebar` removed (Step 3)."
  - "AC-E2-09: scripts/wave-d-smoke.ts page.goto uses `waitUntil: \"networkidle\"` instead of `waitUntil: \"load\"` (Step 3). Per-route 30s timeout (PER_ROUTE_TIMEOUT_MS) still bounds the wait."
  - "AC-E2-10: scripts/wave-d-smoke.ts primary_ux_selector entries replaced. Routes /settings/workflow + /financials/bills + /financials/bills/queue + /jobs/new previously used `select[name='import_default_pm_id'] option` / `select[name='assigned_pm'] option` / `select[name='pm_id'] option` (which never matched production). Replacement: Playwright role-based locators referencing the visible labels: `page.getByRole(\"combobox\", { name: /assigned pm/i })` (for jobs/new + financials), `page.getByRole(\"combobox\", { name: /default pm/i })` (for settings/workflow). Same primary_ux_min_count semantics preserved (min 1 option present)."
  - "AC-E2-11: scripts/wave-d-smoke.ts adds DOM-level PM name verification invariant on /jobs/22222222-2222-2222-2222-200000000001 — asserts the rendered DOM contains a `[data-pm-name]` element whose textContent includes 'Smoke PM Alpha' (Step 4). Failure recorded in `invariant_failures[]` like other per-route invariants."
  - "AC-E2-12: src/app/jobs/[id]/page.tsx `<Detail>` component renders `data-pm-name=\"<full_name>\"` attribute on the `<p>` element when the label is 'Assigned PM' (Step 4). Implementation: Detail component extended with optional `dataPmName?: boolean` prop; when true, the attribute is set to the value (or empty string if value is null). Existing Detail callsites are NOT modified; only the line 345 callsite passes `dataPmName` flag."
  - "AC-E2-13: scripts/harness-auth-bootstrap.ts adds a credentials-file fallback path for `smoke-*@nightwork.local` users. Reads `.planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt`, parses one `email password` line per user, returns the matching password. Fails with actionable error if file missing OR no matching email line. For `harness-fixture@nightwork.local` user, the existing HARNESS_FIXTURE_PASSWORD env var path is preserved (don't-rotate decision per nwrp139/141)."
  - "AC-E2-14: Plan E-2 commit does NOT contain the credentials file. `git status --porcelain` before commit returns 0 entries matching `smoke-seed-credentials-DO-NOT-COMMIT` (the file is gitignored under .planning/qa-runs/ default exclusion in .gitignore:107)."
  - "Plan E-2 ships as a SINGLE ATOMIC COMMIT per Wave-E EXPANDED-SCOPE commit posture. Compound `git add ... && git commit` form per nwrp133 codification — no --no-verify under any circumstance."

semantic:
  - "N/A — no UI surfaces visible to users; verifications above are sufficient for Plan E-2 acceptance. The DOM-level PM name AC is technically semantic but it's bundled into the behavioral category since it's mechanically scriptable."

</criteria>

<tasks>

<task type="auto">
  <name>Task 1: Add data-component="nav-bar" attribute to production NavBar</name>
  <files>src/components/nav-bar.tsx</files>
  <action>
Edit src/components/nav-bar.tsx at line 280-283 to add a `data-component="nav-bar"` attribute to the `<header>` element.

The current state (verified at plan-authoring time, 2026-05-14):

```tsx
    <header
      ref={menuRef}
      className="bg-nw-slate-deeper border-b border-[rgba(247,245,236,0.08)] sticky top-0 z-40"
    >
```

The target state:

```tsx
    <header
      ref={menuRef}
      data-component="nav-bar"
      className="bg-nw-slate-deeper border-b border-[rgba(247,245,236,0.08)] sticky top-0 z-40"
    >
```

Use the Edit tool. old_string = the full 4-line block above with the closing `>` on its own line. new_string = the same block with the `data-component="nav-bar"` line inserted between `ref={menuRef}` and `className=...`.

The attribute matches the Wave-D D-4 convention (`data-slot="org-logo"` on Wordmark.tsx/Icon.tsx, `data-pattern-slot="file-preview"` etc. on InvoiceReviewView.tsx). No visual or behavior change — the attribute is purely a stable test contract for the smoke harness.

DO NOT modify:
- The mobile `<nav>` element inside `mobileOpen` block at line 404 (this is the dropdown menu, NOT the NavBar header)
- The `<header>` ref={menuRef} (already correct)
- The className (existing token + brackets, already correct)

After the edit, run `grep -nE 'data-component=\"nav-bar\"' src/components/nav-bar.tsx` and confirm it returns exactly 1 match at the modified line.
  </action>
  <verify>
    <automated>grep -cE 'data-component=\"nav-bar\"' src/components/nav-bar.tsx | grep -q '^1$' && echo PASS || echo FAIL</automated>
  </verify>
  <done>`<header data-component="nav-bar">` rendered on every authenticated page that mounts NavBar. Smoke harness selector `header[data-component="nav-bar"]` resolves to exactly 1 element per page.</done>
</task>

<task type="auto">
  <name>Task 2: Add data-component="job-sidebar" attribute + Rule 6 precursor cleanup on JobSidebar</name>
  <files>src/components/job-sidebar.tsx</files>
  <action>
This task performs 3 atomic edits on src/components/job-sidebar.tsx. Group them as 3 separate Edit tool calls for review clarity, but commit them together with Task 1.

---

**EDIT 1 — Add data-component="job-sidebar" attribute to the expanded sidebar `<aside>`.**

Target: line 259 `<aside>` element (the expanded sidebar — the canonical sidebar). The collapsed-rail `<aside>` at line 225 also needs the attribute for selector stability across collapsed/expanded states.

Current state (verified at plan-authoring time):

```tsx
  // Expanded sidebar
  return (
    <aside className="hidden md:flex flex-col w-[220px] shrink-0 border-r border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden">
      {/* Header */}
```

Target state:

```tsx
  // Expanded sidebar
  return (
    <aside
      data-component="job-sidebar"
      className="hidden md:flex flex-col w-[220px] shrink-0 border-r border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden"
    >
      {/* Header */}
```

Also update the collapsed-rail `<aside>` at line 225 to add the same attribute:

Current state:

```tsx
      <aside className="hidden md:flex flex-col items-center w-12 shrink-0 border-r border-[var(--border-default)] bg-[var(--bg-card)] py-4 gap-3">
```

Target state:

```tsx
      <aside
        data-component="job-sidebar"
        className="hidden md:flex flex-col items-center w-12 shrink-0 border-r border-[var(--border-default)] bg-[var(--bg-card)] py-4 gap-3"
      >
```

Both edits are attribute-only — no visual or behavior change. Smoke harness selector `aside[data-component="job-sidebar"]` resolves to exactly 1 element per page (either collapsed-rail OR expanded, never both — the mobile-mode return at line 158 wraps the list in a `<div>` NOT an `<aside>`, so it's correctly outside the smoke harness's `<aside>` count).

---

**EDIT 2 — Rule 6 precursor cleanup: line 164 `hover:text-white` → `hover:text-[color:var(--nw-white-sand)]`**

Target: src/components/job-sidebar.tsx line 164 — the mobile-mode "+ New Job" CTA button.

Current state (verified at plan-authoring time):

```tsx
            <Link
              href="/jobs/new"
              className="flex items-center justify-center gap-1.5 w-full py-1.5 text-[11px] tracking-[0.06em] uppercase font-medium border border-nw-stone-blue text-nw-stone-blue hover:bg-nw-stone-blue hover:text-white transition-colors"
            >
              + New Job
            </Link>
```

Target state (only the className changes; the `hover:text-white` becomes `hover:text-[color:var(--nw-white-sand)]`):

```tsx
            <Link
              href="/jobs/new"
              className="flex items-center justify-center gap-1.5 w-full py-1.5 text-[11px] tracking-[0.06em] uppercase font-medium border border-nw-stone-blue text-nw-stone-blue hover:bg-nw-stone-blue hover:text-[color:var(--nw-white-sand)] transition-colors"
            >
              + New Job
            </Link>
```

The pattern matches the canonical sibling fix from fd70122 + aging-report:27 + aging:39: when an element inverts to bg-nw-stone-blue on hover, the text inverts to --nw-white-sand (cream/light) not raw white. The post-edit hook rejects the raw `text-white` pattern.

---

**EDIT 3 — Rule 6 precursor cleanup: line 284 `hover:text-white` → `hover:text-[color:var(--nw-white-sand)]`**

Target: src/components/job-sidebar.tsx line 284 — the desktop-mode "+ New Job" CTA button (second instance of the same pattern; copy-pasted code between mobile mode and expanded sidebar mode).

Current state:

```tsx
          <Link
            href="/jobs/new"
            className="flex items-center justify-center gap-1.5 w-full py-1.5 text-[11px] tracking-[0.06em] uppercase font-medium border border-nw-stone-blue text-nw-stone-blue hover:bg-nw-stone-blue hover:text-white transition-colors"
          >
            + New Job
          </Link>
```

Target state:

```tsx
          <Link
            href="/jobs/new"
            className="flex items-center justify-center gap-1.5 w-full py-1.5 text-[11px] tracking-[0.06em] uppercase font-medium border border-nw-stone-blue text-nw-stone-blue hover:bg-nw-stone-blue hover:text-[color:var(--nw-white-sand)] transition-colors"
          >
            + New Job
          </Link>
```

---

**DO NOT MODIFY** (these are spec-compliant; flagged by hook but legitimate per CLAUDE.md SYSTEM.md §13 'avatars/dots use --radius-dot: 999px exception'):

- Line 192: `rounded-full` on selected-job status dot in mobile mode
- Line 212: `rounded-full` on job-list status dot in mobile mode
- Line 248: `rounded-full` on collapsed-rail status dot
- Line 343: `rounded-full` on selected-job status dot in expanded mode
- Line 407: `rounded-full` on job-list status dot in expanded mode

These 5 `rounded-full` hits are tracked as TD-WB-01 (Wave-B hook-precision-refinement candidate) — the hook regex doesn't distinguish status-dot avatars from rounded buttons. Plan E-2 documents the divergence but does NOT modify these lines.

After all 3 edits, run:
- `grep -cE 'data-component=\"job-sidebar\"' src/components/job-sidebar.tsx` → expect 2 (collapsed + expanded)
- `grep -nE '\b(bg|text|border)-(white|black)\b' src/components/job-sidebar.tsx` → expect 0 hits (Rule 6 precursor)
- `grep -nE 'rounded-full' src/components/job-sidebar.tsx` → expect 5 hits remaining (status dots; spec-compliant)
  </action>
  <verify>
    <automated>grep -cE 'data-component=\"job-sidebar\"' src/components/job-sidebar.tsx | grep -q '^2$' && grep -cE '\b(bg|text|border)-(white|black)\b' src/components/job-sidebar.tsx | grep -q '^0$' && echo PASS || echo FAIL</automated>
  </verify>
  <done>JobSidebar `<aside>` (collapsed + expanded) renders with `data-component="job-sidebar"` attribute. Both `hover:text-white` instances replaced with `hover:text-[color:var(--nw-white-sand)]`. Smoke harness selector `aside[data-component="job-sidebar"]` resolves to exactly 1 element on /jobs/[id] routes. Post-edit hook silent on job-sidebar.tsx.</done>
</task>

<task type="auto">
  <name>Task 3: Add data-pm-name attribute to Detail component for "Assigned PM" label</name>
  <files>src/app/jobs/[id]/page.tsx</files>
  <action>
This task adds a `data-pm-name` attribute to the `<Detail>` component on src/app/jobs/[id]/page.tsx so the smoke harness can assert against the rendered PM name in the DOM.

Two edits are required:

---

**EDIT 1 — Extend `Detail` component signature to accept optional `dataPmName` flag.**

Target: src/app/jobs/[id]/page.tsx lines 593-600. Current state:

```tsx
function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-1">
      <NwEyebrow tone="muted">{label}</NwEyebrow>
      <p className="text-sm" style={{ color: "var(--text-primary)" }}>{value ?? "—"}</p>
    </div>
  );
}
```

Target state:

```tsx
function Detail({ label, value, dataPmName }: { label: string; value: string | null | undefined; dataPmName?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <NwEyebrow tone="muted">{label}</NwEyebrow>
      <p
        className="text-sm"
        style={{ color: "var(--text-primary)" }}
        {...(dataPmName ? { "data-pm-name": value ?? "" } : {})}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}
```

The conditional-spread pattern ensures `data-pm-name` is ONLY present on the rendered DOM when the consuming callsite explicitly opts in. Existing Detail callsites at lines 334-340 + 346 (Client Name, Client Email, Client Phone, Contract Date, Contract Type, Deposit %, GC Fee %, Retainage %, Status) do NOT pass `dataPmName` and therefore do NOT gain the attribute. This is the principle-of-least-surprise: we add a test contract to a single rendering, not to the whole component shape.

---

**EDIT 2 — Pass `dataPmName` flag from the "Assigned PM" callsite at line 345.**

Target: src/app/jobs/[id]/page.tsx line 345. Current state:

```tsx
                <Detail label="Assigned PM" value={pms.find((p) => p.id === job.pm_id)?.full_name ?? "Unassigned"} />
```

Target state:

```tsx
                <Detail
                  label="Assigned PM"
                  value={pms.find((p) => p.id === job.pm_id)?.full_name ?? "Unassigned"}
                  dataPmName
                />
```

The JSX is reformatted to multi-line for readability (single-line would exceed ~150 chars). Functionally equivalent — same props, same render output except for the new attribute.

---

**Verification of DOM render after edits:**

For the synthetic Job Alpha route `/jobs/22222222-2222-2222-2222-200000000001` (pm_id = `00000000-0000-0000-0002-000000000002`), the seed has `pms` array containing `{ id: '00000000-0000-0000-0002-000000000002', full_name: 'Smoke PM Alpha' }`. The Detail will render:

```html
<p class="text-sm" style="color: var(--text-primary);" data-pm-name="Smoke PM Alpha">Smoke PM Alpha</p>
```

If the PM is unassigned (pm_id is null OR no matching entry in pms array), the Detail renders:

```html
<p class="text-sm" style="color: var(--text-primary);" data-pm-name="Unassigned">Unassigned</p>
```

Both forms are queryable via `page.locator('[data-pm-name]')`. The smoke harness AC asserts the textContent includes 'Smoke PM Alpha' specifically — an Unassigned render would fail the AC, which is the correct semantic (we want to verify the PostgREST + application-layer mapping resolved to the right PM, not just that the Detail renders).

After the edits, run:
- `grep -nE 'data-pm-name' src/app/jobs/\[id\]/page.tsx` → expect ≥1 hit (the prop wiring + the JSX usage)
- `npx tsc --noEmit` → expect 0 errors (the new `dataPmName?: boolean` prop is TypeScript-clean)
- `npm run build` → expect 0 errors + 0 warnings
  </action>
  <verify>
    <automated>grep -cE 'data-pm-name' "src/app/jobs/[id]/page.tsx" | grep -q '^[1-9]' && npx tsc --noEmit 2>&1 | grep -q "error" && echo FAIL || echo PASS</automated>
  </verify>
  <done>Detail component accepts optional dataPmName flag. The "Assigned PM" callsite at line 345 passes the flag. Production DOM renders `<p data-pm-name="<full_name>">...</p>` on the PM row. Smoke harness can query the attribute and assert textContent matches the expected PM display name.</done>
</task>

<task type="auto">
  <name>Task 4: Update wave-d-smoke.ts — selectors, hydration wait, primary-UX role-based locators, NEW DOM-level PM name AC</name>
  <files>scripts/wave-d-smoke.ts</files>
  <action>
This task performs 5 edits to scripts/wave-d-smoke.ts. Group them as 5 separate Edit tool calls for review clarity.

---

**EDIT 1 — Narrow NavBar selector at line 406 (NavBar count invariant).**

Current state (lines 405-412):

```typescript
      const navBars = await page.$$(
        'header.app-shell-nav, header[data-component="nav-bar"]',
      );
      if (navBars.length !== 1) {
        invariantFailures.push(
          `Expected exactly 1 NavBar on ${route}, got ${navBars.length}`,
        );
      }
```

Target state:

```typescript
      const navBars = await page.$$('header[data-component="nav-bar"]');
      if (navBars.length !== 1) {
        invariantFailures.push(
          `Expected exactly 1 NavBar on ${route}, got ${navBars.length}`,
        );
      }
```

Rationale: Pre-E-2 the OR-clause was an attempt to allow either a className-based selector (`header.app-shell-nav`, which never existed in production) OR an attribute-based selector (`header[data-component="nav-bar"]`, which also didn't exist in production until Task 1 above). With Task 1 landing the attribute, the className OR is dead code and adds confusion. Drop to single canonical form.

---

**EDIT 2 — Narrow Sidebar selector at line 414 (sidebar count invariant).**

Current state (lines 413-420):

```typescript
      const sidebars = await page.$$(
        'aside.app-shell-sidebar, aside[data-component="job-sidebar"]',
      );
      if (sidebars.length > 1) {
        invariantFailures.push(
          `Expected ≤1 sidebar on ${route}, got ${sidebars.length}`,
        );
      }
```

Target state:

```typescript
      const sidebars = await page.$$('aside[data-component="job-sidebar"]');
      if (sidebars.length > 1) {
        invariantFailures.push(
          `Expected ≤1 sidebar on ${route}, got ${sidebars.length}`,
        );
      }
```

Same rationale as Edit 1.

---

**EDIT 3 — Narrow NavBar background-color selector at line 473.**

Current state (lines 471-487):

```typescript
      // NavBar background-color token resolution check.
      try {
        const navBg = await page.$eval(
          'header.app-shell-nav, header[data-component="nav-bar"]',
          (el) => getComputedStyle(el).backgroundColor,
        );
        if (
          !navBg ||
          navBg === "rgba(0, 0, 0, 0)" ||
          navBg === "transparent"
        ) {
          invariantFailures.push(
            `NavBar background token not resolving on ${route}: ${navBg}`,
          );
        }
      } catch {
        // NavBar selector missed — covered by NavBar count invariant above.
      }
```

Target state:

```typescript
      // NavBar background-color token resolution check.
      try {
        const navBg = await page.$eval(
          'header[data-component="nav-bar"]',
          (el) => getComputedStyle(el).backgroundColor,
        );
        if (
          !navBg ||
          navBg === "rgba(0, 0, 0, 0)" ||
          navBg === "transparent"
        ) {
          invariantFailures.push(
            `NavBar background token not resolving on ${route}: ${navBg}`,
          );
        }
      } catch {
        // NavBar selector missed — covered by NavBar count invariant above.
      }
```

Same rationale.

---

**EDIT 4 — Change hydration wait from waitUntil="load" to waitUntil="networkidle" at line 384-387.**

Current state (lines 383-387):

```typescript
    const response = await page.goto(`${previewUrl}${route}`, {
      waitUntil: "load",
      timeout: PER_ROUTE_TIMEOUT_MS,
    });
```

Target state:

```typescript
    const response = await page.goto(`${previewUrl}${route}`, {
      waitUntil: "networkidle",
      timeout: PER_ROUTE_TIMEOUT_MS,
    });
```

Rationale: Per ai-logic-tester Bug C in qa-report 2026-05-14-1700, NavBar is a `"use client"` component that mounts post-hydration. `waitUntil: "load"` fires when the initial HTML+CSS+image load completes but BEFORE React hydration finishes mounting the client components. The result is false-null bounding boxes on the logo-placement invariant (line 422-435) because the logo element doesn't exist in the captured DOM yet. `networkidle` waits 500ms after the last network request completes — sufficient for Next.js SSR hydration to settle on Vercel preview environments.

Risk mitigation per threat T-E-2-03 in frontmatter: per-route 30s timeout (PER_ROUTE_TIMEOUT_MS at line 113) still bounds the wait. If background polling endpoints stall networkidle, the route records `error_timeout` rather than hanging the outer walk. If timeouts surface as false negatives during the Wave-E orchestrator re-run, fallback path is `waitUntil: "domcontentloaded"` + explicit `waitForSelector('header[data-component="nav-bar"]', { state: "visible" })` per route — NOT a new plan, revert via direct executor patch.

---

**EDIT 5 — Refactor primary_ux_selector entries to use Playwright role-based locators.**

Three routes in the ROUTES array use `select[name='...']`-style selectors that never matched production (production selects have no `name=` attribute). Replace with role-based locators.

Current state (lines 178-216):

```typescript
  {
    route: "/settings/workflow",
    category: "issue-1",
    primary_ux_selector: "select[name='import_default_pm_id'] option",
    primary_ux_min_count: 1,
  },
  // ...
  {
    route: "/jobs/new",
    category: "issue-1",
    primary_ux_selector: "select[name='pm_id'] option",
    primary_ux_min_count: 1,
  },
  // ...
  {
    route: "/financials/bills",
    category: "both",
    primary_ux_selector: "select[name='assigned_pm'] option",
    primary_ux_min_count: 1,
  },
  {
    route: "/financials/bills/queue",
    category: "both",
    primary_ux_selector: "select[name='assigned_pm'] option",
    primary_ux_min_count: 1,
  },
```

Target state — use Playwright role-based locators with `aria-label`-equivalent name matching:

```typescript
  {
    route: "/settings/workflow",
    category: "issue-1",
    primary_ux_selector: 'role=combobox[name=/default pm/i]',
    primary_ux_min_count: 1,
  },
  // ...
  {
    route: "/jobs/new",
    category: "issue-1",
    primary_ux_selector: 'role=combobox[name=/assigned pm/i]',
    primary_ux_min_count: 1,
  },
  // ...
  {
    route: "/financials/bills",
    category: "both",
    primary_ux_selector: 'role=combobox[name=/pm/i]',
    primary_ux_min_count: 1,
  },
  {
    route: "/financials/bills/queue",
    category: "both",
    primary_ux_selector: 'role=combobox[name=/pm/i]',
    primary_ux_min_count: 1,
  },
```

Playwright's `role=` selector syntax accepts `name=` filter regex, matching against the element's accessible name (computed per W3C ARIA spec — falls back to `aria-label`, then `<label>` association, then surrounding text). This is more semantic than attribute-based selectors and is the canonical Playwright pattern for form interactions.

**IMPORTANT — accessible-name resolution caveat:** Production `<select>` elements at jobs/new/page.tsx:294-303, WorkflowSettingsForm.tsx:306-315, InvoiceHeader.tsx:82-92 do NOT have `aria-label`. Their accessible name resolves via adjacent text or via `<label>` association if the parent is `<label>`-wrapped. Verified at plan-authoring time:
- jobs/new/page.tsx:293-304 — `<Field label="Assigned PM" full>` wrapper renders the `<select>` inside a `<label>` (via Field's implementation), so accessible name = "Assigned PM"
- WorkflowSettingsForm.tsx:302-319 — `<label>` wraps the select with `<span>Default PM for unmatched jobs</span>` as visible label → accessible name includes "Default PM"
- InvoiceHeader.tsx:80-92 — `<span>PM:</span>` is sibling to `<select>` (NOT label-wrapping). Accessible name may NOT resolve to anything useful. For /financials/bills + /financials/bills/queue (which render lists with optional reassignment dropdowns INSIDE rows), the dropdown only renders when the user clicks into a specific bill's PM cell — these dropdowns may not be visible on initial page load.

**Plan-author note for plan-review:** Verify the /financials/bills + /financials/bills/queue routes actually render a PM dropdown on initial page load. If NOT (the dropdown is hidden until a specific bill row is selected), the primary_ux_selector for these routes should be REPLACED with a different visible-on-load element (e.g., the bills list grid `[role="grid"] [role="row"]` count, or the page header text). Plan-author RECOMMENDATION: keep the role-based dropdown selectors for /jobs/new + /settings/workflow (verified visible on load), and REPLACE /financials/bills + /financials/bills/queue selectors with `'text=Bills'` or `'[role="grid"] [role="row"]'` per the existing DataGrid invariant pattern. Plan-review should validate this assumption.

Also update the PM dropdown UUID-leak check at lines 451-468 to use the new selectors. Current state:

```typescript
      const pmOptions = await page
        .$$eval(
          'select[name="pm_id"] option, select[name="assigned_pm"] option, select[name="import_default_pm_id"] option',
          (els) =>
            els.map((e) => ({
              value: (e as HTMLOptionElement).value,
              text: e.textContent || "",
            })),
        )
        .catch(() => [] as { value: string; text: string }[]);
```

Target state — query all `combobox` elements with PM-related accessible names:

```typescript
      const pmOptions = await page
        .locator('role=combobox')
        .filter({ has: page.locator('option') })
        .evaluateAll((selects) =>
          selects.flatMap((sel) => {
            const accessibleName = (sel as HTMLSelectElement).labels?.[0]?.textContent ?? sel.getAttribute('aria-label') ?? '';
            if (!/pm/i.test(accessibleName)) return [];
            return Array.from((sel as HTMLSelectElement).options).map((o) => ({
              value: o.value,
              text: o.textContent || "",
            }));
          })
        )
        .catch(() => [] as { value: string; text: string }[]);
```

The filter accepts only `<select>` elements whose `<label>` text matches /pm/i. The UUID-leak regex check downstream is unchanged.

After all 5 edits:
- `grep -cE 'header\\[data-component=\"nav-bar\"\\]' scripts/wave-d-smoke.ts` → expect ≥2 (line 406 + line 473)
- `grep -cE 'aside\\[data-component=\"job-sidebar\"\\]' scripts/wave-d-smoke.ts` → expect ≥1 (line 414)
- `grep -cE 'header\\.app-shell-nav|aside\\.app-shell-sidebar' scripts/wave-d-smoke.ts` → expect 0 (legacy selectors fully removed)
- `grep -cE 'waitUntil:\\s*\"networkidle\"' scripts/wave-d-smoke.ts` → expect ≥1
- `grep -cE 'waitUntil:\\s*\"load\"' scripts/wave-d-smoke.ts` → expect 0
- `grep -cE 'role=combobox' scripts/wave-d-smoke.ts` → expect ≥3 (multiple primary_ux_selector replacements)
- `grep -cE 'select\\[name=' scripts/wave-d-smoke.ts` → expect 0 in active code (commented-out lines OK if used for archaeology)
- `npx tsc --noEmit` → expect 0 errors
  </action>
  <verify>
    <automated>grep -cE 'header\[data-component="nav-bar"\]' scripts/wave-d-smoke.ts | grep -qE '^[2-9]' && grep -cE 'waitUntil:\s*"networkidle"' scripts/wave-d-smoke.ts | grep -qE '^[1-9]' && grep -cE 'waitUntil:\s*"load"' scripts/wave-d-smoke.ts | grep -q '^0$' && echo PASS || echo FAIL</automated>
  </verify>
  <done>wave-d-smoke.ts uses single canonical selectors for NavBar + Sidebar (matching the data-component attributes added in Tasks 1 + 2). Hydration wait uses networkidle for React-hydration-aware capture. Primary-UX selectors use Playwright role-based locators instead of non-existent name= attributes.</done>
</task>

<task type="auto">
  <name>Task 5: Add DOM-level PM name verification AC to wave-d-smoke.ts (nwrp144 #1)</name>
  <files>scripts/wave-d-smoke.ts</files>
  <action>
This task adds a new per-route invariant check to wave-d-smoke.ts: for the synthetic Job Alpha route `/jobs/22222222-2222-2222-2222-200000000001`, assert that the rendered DOM contains a `[data-pm-name]` element whose textContent includes "Smoke PM Alpha".

The new check fires INSIDE the per-route invariant block at lines 489-510 (after the Document Review pattern check, before the Primary-UX check). It is a route-conditional invariant — only fires for the specific Job Alpha UUID; other routes skip.

Current state (lines 487-512):

```typescript
      // Per-route invariant — Document Review pattern (per iter-2 §4.9).
      if (routeCheck.pattern === "document-review") {
        const filePreview = await page.$(
          '[data-pattern-slot="file-preview"]',
        );
        const rightRail = await page.$('[data-pattern-slot="right-rail"]');
        const auditTimeline = await page.$(
          '[data-pattern-slot="audit-timeline"]',
        );
        if (!filePreview)
          invariantFailures.push(
            `Document Review missing file preview on ${route}`,
          );
        if (!rightRail)
          invariantFailures.push(
            `Document Review missing right rail on ${route}`,
          );
        if (!auditTimeline)
          invariantFailures.push(
            `Document Review missing audit timeline on ${route}`,
          );
      }

      // Primary-UX check.
```

Target state — add a new block BEFORE the Primary-UX check comment:

```typescript
      // Per-route invariant — Document Review pattern (per iter-2 §4.9).
      if (routeCheck.pattern === "document-review") {
        const filePreview = await page.$(
          '[data-pattern-slot="file-preview"]',
        );
        const rightRail = await page.$('[data-pattern-slot="right-rail"]');
        const auditTimeline = await page.$(
          '[data-pattern-slot="audit-timeline"]',
        );
        if (!filePreview)
          invariantFailures.push(
            `Document Review missing file preview on ${route}`,
          );
        if (!rightRail)
          invariantFailures.push(
            `Document Review missing right rail on ${route}`,
          );
        if (!auditTimeline)
          invariantFailures.push(
            `Document Review missing audit timeline on ${route}`,
          );
      }

      // Per-route invariant — DOM-level PM name verification (Plan E-2 / nwrp144 #1).
      //
      // Validates the application-layer pm_id → orgPms[i].full_name mapping.
      // The PostgREST embed (`org_members.select=*,profile:profiles(...)`) resolving
      // is necessary but NOT sufficient — the React code at
      // src/app/jobs/[id]/page.tsx:345 maps pm_id from the resolved pms array
      // and renders the full_name in the Detail component's `<p data-pm-name="...">`.
      //
      // For the synthetic Job Alpha route the pm_id is
      // 00000000-0000-0000-0002-000000000002 which seeds to "Smoke PM Alpha"
      // in scripts/fixtures/smoke-seed.sql. Assert the DOM contains that text
      // in the [data-pm-name] element.
      if (route === "/jobs/22222222-2222-2222-2222-200000000001") {
        const pmNameEl = await page.$('[data-pm-name]');
        if (!pmNameEl) {
          invariantFailures.push(
            `DOM-level PM name verification: [data-pm-name] element missing on ${route}`,
          );
        } else {
          const txt = (await pmNameEl.textContent())?.trim() ?? "";
          if (!txt.includes("Smoke PM Alpha")) {
            invariantFailures.push(
              `DOM-level PM name verification: expected "Smoke PM Alpha" in [data-pm-name] textContent, got "${txt}"`,
            );
          }
        }
      }

      // Primary-UX check.
```

The check fires AFTER NavBar count + logo placement + DataGrid + UUID-leak + NavBar background-color invariants. By design it does NOT short-circuit any other invariant — the run still captures all failures per route for triage.

**Why route-string matching instead of routeCheck flag:** The current ROUTES table doesn't have a per-route invariant-discriminator field. Adding one (e.g., `requires_pm_name_check: true`) would be cleaner but requires a wider schema change. For Plan E-2 a route-string match is sufficient — the synthetic seed pins the Job Alpha UUID, so there's no aliasing concern. If future plans need multi-route PM-name checks (e.g., Job Beta etc.), the schema can be widened then.

**Per-route invariant added BEFORE per-route primary_ux check:** The primary_ux selector for /jobs/22222222... is currently `"text=Smoke Job Alpha"` (route table line 196) — that asserts the JOB name renders, NOT the PM name. The new DOM-level invariant complements (does not replace) the existing job-name primary_ux check.

After the edit:
- `grep -cE 'data-pm-name' scripts/wave-d-smoke.ts` → expect ≥1
- `grep -cE 'Smoke PM Alpha' scripts/wave-d-smoke.ts` → expect ≥1
- `npx tsc --noEmit` → expect 0 errors
  </action>
  <verify>
    <automated>grep -cE 'data-pm-name' scripts/wave-d-smoke.ts | grep -qE '^[1-9]' && grep -cE 'Smoke PM Alpha' scripts/wave-d-smoke.ts | grep -qE '^[1-9]' && echo PASS || echo FAIL</automated>
  </verify>
  <done>wave-d-smoke.ts asserts the rendered DOM at /jobs/22222222-2222-2222-2222-200000000001 contains "Smoke PM Alpha" text in a [data-pm-name] element. Validates the application-layer pm_id → orgPms[i].full_name mapping (the SECOND application-layer step that nwrp143 Q3(a) flagged).</done>
</task>

<task type="auto">
  <name>Task 6: Rewrite scripts/fixtures/smoke-seed.sql to use apply-time random passwords</name>
  <files>scripts/fixtures/smoke-seed.sql</files>
  <action>
This task rewrites the password handling in scripts/fixtures/smoke-seed.sql. The plaintext literal `'SmokeSeed2026!'` (committed at line 65) is replaced with `gen_random_uuid()::text` evaluated at apply time, and the generated email→password pairs are emitted via PostgreSQL RAISE NOTICE for capture into the gitignored credentials file.

The full rewritten DO $$ block (replaces lines 63-122 in current state):

Current state (lines 63-122):

```sql
DO $$
DECLARE
  v_password TEXT := 'SmokeSeed2026!';  -- synthetic; never used at runtime
  v_user RECORD;
BEGIN
  FOR v_user IN
    SELECT * FROM (VALUES
      ('00000000-0000-0000-0002-000000000001'::uuid, 'smoke-owner@nightwork.local',      'Smoke Owner',      'admin'),
      ('00000000-0000-0000-0002-000000000002'::uuid, 'smoke-pm-alpha@nightwork.local',   'Smoke PM Alpha',   'pm'),
      ('00000000-0000-0000-0002-000000000003'::uuid, 'smoke-pm-beta@nightwork.local',    'Smoke PM Beta',    'pm'),
      ('00000000-0000-0000-0002-000000000004'::uuid, 'smoke-pm-gamma@nightwork.local',   'Smoke PM Gamma',   'pm'),
      ('00000000-0000-0000-0002-000000000005'::uuid, 'smoke-pm-delta@nightwork.local',   'Smoke PM Delta',   'pm'),
      ('00000000-0000-0000-0002-000000000006'::uuid, 'smoke-pm-epsilon@nightwork.local', 'Smoke PM Epsilon', 'pm'),
      ('00000000-0000-0000-0002-000000000007'::uuid, 'smoke-pm-zeta@nightwork.local',    'Smoke PM Zeta',    'pm'),
      ('00000000-0000-0000-0002-000000000008'::uuid, 'smoke-pm-eta@nightwork.local',     'Smoke PM Eta',     'pm'),
      ('00000000-0000-0000-0002-000000000009'::uuid, 'smoke-accounting@nightwork.local', 'Smoke Accounting', 'accounting')
    ) AS t(id, email, full_name, role)
  LOOP
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user.id,
      'authenticated',
      'authenticated',
      v_user.email,
      crypt(v_password, gen_salt('bf')),
      NOW(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email'], 'role', v_user.role),
      jsonb_build_object('full_name', v_user.full_name),
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    ON CONFLICT (id) DO UPDATE SET
      email_confirmed_at = COALESCE(auth.users.email_confirmed_at, NOW()),
      updated_at = NOW();

    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user.id,
      v_user.id::text,
      jsonb_build_object('sub', v_user.id::text, 'email', v_user.email, 'email_verified', true, 'phone_verified', false),
      'email',
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT (provider_id, provider) DO NOTHING;
  END LOOP;
END $$;
```

Target state (rewrite the DO block; the surrounding SQL above + below is unchanged):

```sql
-- ============================================================================
-- Step 1: 9 NEW synthetic auth.users (supporting users for smoke harness).
--
-- Password lifecycle (per Plan E-2 / FINDING-2 remediation):
--   - Per-user cleartext password generated VIA gen_random_uuid()::text at
--     apply time. NEVER committed to git; NEVER persisted to DB as cleartext.
--   - Cleartext is bcrypt-hashed via crypt(v_password, gen_salt('bf')) for
--     the auth.users.encrypted_password column.
--   - The cleartext is emitted via RAISE NOTICE so the apply step can pipe
--     it to .planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt
--     (gitignored per .planning/qa-runs/ default exclusion).
--
-- Apply procedure (orchestrator-level; NOT in plan body):
--   1. psql -f scripts/fixtures/smoke-seed.sql 2>&1 | tee /tmp/seed-apply.log
--   2. awk '/SMOKE_SEED_CREDENTIALS_START/,/SMOKE_SEED_CREDENTIALS_END/' \
--        /tmp/seed-apply.log \
--        | grep -E '^NOTICE:  smoke-' \
--        | sed 's/^NOTICE:  //' \
--        > .planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt
--   3. rm /tmp/seed-apply.log
--   4. Verify .planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt
--      has 9 lines, format `email password` per line, all 9 smoke-* emails present.
--
-- Idempotency note: re-applying the seed regenerates fresh passwords for all 9
-- users (the DO UPDATE re-hashes encrypted_password with a new bcrypt). The
-- credentials file must be regenerated on every apply — stale credentials from
-- a previous apply will NOT authenticate.
--
-- SKIPS the harness-fixture@nightwork.local user — that user already exists
-- with UUID 5eb26edc-5989-477f-ac42-d1e9264db0e2 from migration 00092/00093
-- (Layer 3 verification harness). Its password is rotated via the existing
-- HARNESS_FIXTURE_PASSWORD env var pattern (don't-rotate decision per nwrp139/141).
-- ============================================================================
DO $$
DECLARE
  v_user RECORD;
  v_password TEXT;
BEGIN
  RAISE NOTICE 'SMOKE_SEED_CREDENTIALS_START';
  FOR v_user IN
    SELECT * FROM (VALUES
      ('00000000-0000-0000-0002-000000000001'::uuid, 'smoke-owner@nightwork.local',      'Smoke Owner',      'admin'),
      ('00000000-0000-0000-0002-000000000002'::uuid, 'smoke-pm-alpha@nightwork.local',   'Smoke PM Alpha',   'pm'),
      ('00000000-0000-0000-0002-000000000003'::uuid, 'smoke-pm-beta@nightwork.local',    'Smoke PM Beta',    'pm'),
      ('00000000-0000-0000-0002-000000000004'::uuid, 'smoke-pm-gamma@nightwork.local',   'Smoke PM Gamma',   'pm'),
      ('00000000-0000-0000-0002-000000000005'::uuid, 'smoke-pm-delta@nightwork.local',   'Smoke PM Delta',   'pm'),
      ('00000000-0000-0000-0002-000000000006'::uuid, 'smoke-pm-epsilon@nightwork.local', 'Smoke PM Epsilon', 'pm'),
      ('00000000-0000-0000-0002-000000000007'::uuid, 'smoke-pm-zeta@nightwork.local',    'Smoke PM Zeta',    'pm'),
      ('00000000-0000-0000-0002-000000000008'::uuid, 'smoke-pm-eta@nightwork.local',     'Smoke PM Eta',     'pm'),
      ('00000000-0000-0000-0002-000000000009'::uuid, 'smoke-accounting@nightwork.local', 'Smoke Accounting', 'accounting')
    ) AS t(id, email, full_name, role)
  LOOP
    -- Generate fresh cleartext per user per apply. Never persists as cleartext
    -- in DB; only the bcrypt hash is written.
    v_password := gen_random_uuid()::text;

    -- Emit the email→password pair for capture into the gitignored credentials file.
    -- Format: `email password` (single space separator).
    RAISE NOTICE '% %', v_user.email, v_password;

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user.id,
      'authenticated',
      'authenticated',
      v_user.email,
      crypt(v_password, gen_salt('bf')),
      NOW(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email'], 'role', v_user.role),
      jsonb_build_object('full_name', v_user.full_name),
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    ON CONFLICT (id) DO UPDATE SET
      encrypted_password = crypt(v_password, gen_salt('bf')),
      email_confirmed_at = COALESCE(auth.users.email_confirmed_at, NOW()),
      updated_at = NOW();

    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user.id,
      v_user.id::text,
      jsonb_build_object('sub', v_user.id::text, 'email', v_user.email, 'email_verified', true, 'phone_verified', false),
      'email',
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT (provider_id, provider) DO NOTHING;
  END LOOP;
  RAISE NOTICE 'SMOKE_SEED_CREDENTIALS_END';
END $$;
```

Key differences from current state:

1. **Removed:** `v_password TEXT := 'SmokeSeed2026!';` (the committed plaintext)
2. **Added:** `v_password := gen_random_uuid()::text;` INSIDE the FOR loop (fresh password per user)
3. **Added:** `RAISE NOTICE '% %', v_user.email, v_password;` per user (emits credentials to stdout)
4. **Added:** `RAISE NOTICE 'SMOKE_SEED_CREDENTIALS_START'` + `SMOKE_SEED_CREDENTIALS_END` sentinels (delimit the credentials block in apply output)
5. **Added to ON CONFLICT DO UPDATE:** `encrypted_password = crypt(v_password, gen_salt('bf'))` — on re-apply, re-hash with the new password (otherwise stale rows would keep the old hash)
6. **Added:** header docblock documenting the apply procedure and the gitignored credentials file path
7. **Added:** `RAISE NOTICE` sentinel for the apply step's awk-based extraction (start/end markers)

**One critical edit elsewhere in the file (lines 233 + 247):** The `COMMIT;` at line 233 and the verification queries comment block do NOT need changes. The `BEGIN; ... COMMIT;` wrapper at the top still wraps everything — the new DO block is inside this transaction. Note: PostgreSQL's `RAISE NOTICE` output is emitted regardless of transaction commit state (notices are written to the wire as they're encountered, NOT batched until COMMIT). This means the credentials are written to stdout even if a later step in the transaction fails — acceptable for our use case because the orchestrator's apply procedure runs each seed apply independently with explicit error checking.

After the edit:
- `grep -nE 'SmokeSeed2026' scripts/fixtures/smoke-seed.sql` → expect 0 hits
- `grep -nE 'gen_random_uuid\\(\\)::text' scripts/fixtures/smoke-seed.sql` → expect ≥1 hit
- `grep -nE 'smoke-seed-credentials-DO-NOT-COMMIT' scripts/fixtures/smoke-seed.sql` → expect ≥1 hit (in the header comment block)
- `grep -nE 'RAISE NOTICE' scripts/fixtures/smoke-seed.sql` → expect ≥3 hits (start sentinel + per-user line + end sentinel)
- `grep -nE 'SMOKE_SEED_CREDENTIALS_START|SMOKE_SEED_CREDENTIALS_END' scripts/fixtures/smoke-seed.sql` → expect 2 hits

**Plan E-2 does NOT apply the rewritten seed.** The apply step is orchestrator-level per Wave-E EXPANDED-SCOPE sequencing — orchestrator runs Supabase MCP `execute_sql` with the rewritten seed content + captures the RAISE NOTICE output to the gitignored credentials file. AC-E2-14 verifies the credentials file is NOT committed.
  </action>
  <verify>
    <automated>grep -c 'SmokeSeed2026' scripts/fixtures/smoke-seed.sql | grep -q '^0$' && grep -cE 'gen_random_uuid\(\)::text' scripts/fixtures/smoke-seed.sql | grep -qE '^[1-9]' && grep -cE 'smoke-seed-credentials-DO-NOT-COMMIT' scripts/fixtures/smoke-seed.sql | grep -qE '^[1-9]' && echo PASS || echo FAIL</automated>
  </verify>
  <done>scripts/fixtures/smoke-seed.sql no longer contains plaintext password. Apply-time random passwords are generated per user. RAISE NOTICE emits credentials to stdout for orchestrator capture. The seed file itself is safe to commit (contains only the password-generation expression, not any actual passwords).</done>
</task>

<task type="auto">
  <name>Task 7: Extend scripts/harness-auth-bootstrap.ts to read smoke-* user passwords from credentials file</name>
  <files>scripts/harness-auth-bootstrap.ts</files>
  <action>
This task adds a credentials-file fallback path to scripts/harness-auth-bootstrap.ts. Currently the script only reads HARNESS_FIXTURE_PASSWORD env var (line 68) for the single hardcoded FIXTURE_USER_EMAIL at line 54. Plan E-2 extends it so:

1. The script accepts a `--email` CLI argument (or defaults to FIXTURE_USER_EMAIL).
2. For the `harness-fixture@nightwork.local` user: existing HARNESS_FIXTURE_PASSWORD env var path is preserved.
3. For any `smoke-*@nightwork.local` user: read password from `.planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt`.

The argparse + password resolution is done up front; the existing Playwright login flow at lines 86-169 is unchanged (just consumes the resolved password + email).

Two edits required:

---

**EDIT 1 — Extend parseArgs to accept `--email` flag (lines 56-64).**

Current state:

```typescript
function parseArgs(argv: string[]): { previewUrl: string } {
  let previewUrl = "";
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--preview-url" && i + 1 < argv.length) {
      previewUrl = argv[i + 1];
    }
  }
  return { previewUrl };
}
```

Target state:

```typescript
function parseArgs(argv: string[]): { previewUrl: string; email: string } {
  let previewUrl = "";
  let email = FIXTURE_USER_EMAIL; // default to harness-fixture for backward compatibility
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--preview-url" && i + 1 < argv.length) {
      previewUrl = argv[i + 1];
    }
    if (argv[i] === "--email" && i + 1 < argv.length) {
      email = argv[i + 1];
    }
  }
  return { previewUrl, email };
}
```

Backward compatibility: existing callsites that don't pass `--email` default to the harness-fixture user (current behavior).

---

**EDIT 2 — Add resolvePassword helper + use it in bootstrap (lines 66-79 + adjustments).**

Add this helper function BEFORE the `bootstrap` function (insert after line 64, before line 66):

```typescript
function resolvePassword(email: string): string {
  // For smoke-* synthetic accounts (created by scripts/fixtures/smoke-seed.sql):
  // read password from gitignored credentials file written by the seed apply step.
  if (email.startsWith("smoke-") && email.endsWith("@nightwork.local")) {
    const credPath = path.resolve(
      process.cwd(),
      ".planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt",
    );
    if (!existsSync(credPath)) {
      throw new Error(
        `Cannot find smoke-user credentials file at ${credPath}. ` +
        `Did the orchestrator capture seed-apply RAISE NOTICE output to this path? ` +
        `See scripts/fixtures/smoke-seed.sql header for the apply procedure.`,
      );
    }
    const content = readFileSync(credPath, "utf-8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue;
      const [credEmail, credPw] = line.split(/\s+/, 2);
      if (credEmail === email && credPw) return credPw;
    }
    throw new Error(
      `No password line for ${email} in credentials file at ${credPath}. ` +
      `Re-run the seed apply to regenerate.`,
    );
  }

  // For harness-fixture@nightwork.local: HARNESS_FIXTURE_PASSWORD env var
  // (existing pattern; don't-rotate decision per nwrp139/141).
  const envPassword = process.env.HARNESS_FIXTURE_PASSWORD;
  if (!envPassword) {
    throw new Error(
      "Missing HARNESS_FIXTURE_PASSWORD env. Set the harness fixture user password before running bootstrap.",
    );
  }
  return envPassword;
}
```

ALSO update the existing import at line 46:

Current state:

```typescript
import { chromium, type Browser, type BrowserContext } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import * as path from "node:path";
```

Target state — add readFileSync + existsSync to the node:fs import:

```typescript
import { chromium, type Browser, type BrowserContext } from "playwright";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as path from "node:path";
```

---

**EDIT 3 — Update the bootstrap function to use parsed email + resolved password.**

Current state (lines 66-80):

```typescript
async function bootstrap(): Promise<void> {
  const { previewUrl } = parseArgs(process.argv.slice(2));
  const password = process.env.HARNESS_FIXTURE_PASSWORD;

  if (!previewUrl) {
    throw new Error(
      "Missing --preview-url argument. Usage: tsx scripts/harness-auth-bootstrap.ts --preview-url <https://...>"
    );
  }
  if (!password) {
    throw new Error(
      "Missing HARNESS_FIXTURE_PASSWORD env. Set the harness fixture user password before running bootstrap."
    );
  }
  if (!/^https:\/\/[A-Za-z0-9.-]+/.test(previewUrl)) {
    throw new Error(`Invalid --preview-url: ${previewUrl}`);
  }
```

Target state:

```typescript
async function bootstrap(): Promise<void> {
  const { previewUrl, email } = parseArgs(process.argv.slice(2));
  const password = resolvePassword(email);  // throws actionable error if not found

  if (!previewUrl) {
    throw new Error(
      "Missing --preview-url argument. Usage: tsx scripts/harness-auth-bootstrap.ts --preview-url <https://...>"
    );
  }
  if (!/^https:\/\/[A-Za-z0-9.-]+/.test(previewUrl)) {
    throw new Error(`Invalid --preview-url: ${previewUrl}`);
  }
```

Then update the existing `FIXTURE_USER_EMAIL` references at lines 106-107 + 121 to use the parsed `email` variable. Specifically:

Current state at line 106-108:

```typescript
    console.log(`[harness-auth-bootstrap] filling credentials for ${FIXTURE_USER_EMAIL}`);
    await page.fill('input[name="email"]', FIXTURE_USER_EMAIL);
    await page.fill('input[name="password"]', password);
```

Target state:

```typescript
    console.log(`[harness-auth-bootstrap] filling credentials for ${email}`);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
```

Also update the header docblock at lines 31-36 (the REQUIRED ENV section) to reflect both the env-var path AND the credentials-file path:

Current state (lines 31-36):

```typescript
// USAGE
//   npx tsx scripts/harness-auth-bootstrap.ts --preview-url <https://...>
//
// REQUIRED ENV
//   HARNESS_FIXTURE_PASSWORD          — fixture user password
```

Target state:

```typescript
// USAGE
//   npx tsx scripts/harness-auth-bootstrap.ts --preview-url <https://...>
//   npx tsx scripts/harness-auth-bootstrap.ts --preview-url <https://...> --email smoke-pm-alpha@nightwork.local
//
// OPTIONAL ARGS
//   --email <user>                    — defaults to harness-fixture@nightwork.local
//
// REQUIRED CREDENTIALS (one of, depending on --email)
//   For harness-fixture@nightwork.local:
//     HARNESS_FIXTURE_PASSWORD env var (existing pattern; don't-rotate per nwrp139/141)
//   For smoke-*@nightwork.local:
//     .planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt (gitignored;
//     written by scripts/fixtures/smoke-seed.sql apply step via RAISE NOTICE capture)
```

After all 3 edits:
- `grep -cE 'smoke-seed-credentials-DO-NOT-COMMIT' scripts/harness-auth-bootstrap.ts` → expect ≥2 (docblock + helper)
- `grep -cE 'HARNESS_FIXTURE_PASSWORD' scripts/harness-auth-bootstrap.ts` → expect ≥1 (preserved env var path)
- `grep -cE 'readFileSync\\|existsSync' scripts/harness-auth-bootstrap.ts` → expect ≥1 (new imports)
- `grep -cE 'resolvePassword' scripts/harness-auth-bootstrap.ts` → expect ≥2 (function def + callsite)
- `npx tsc --noEmit` → expect 0 errors

**Note for plan-review:** wave-d-smoke.ts also calls scripts/harness-auth-bootstrap.ts INLINE at lines 304-334 (the ensureStorageState helper). That inline invocation does NOT currently pass `--email`. It will continue to default to harness-fixture per the backward-compat default. The smoke harness DOES NOT need to authenticate as smoke-* users for the current Wave-E scope — the smoke harness reads jobs.pm_id values from the DB (server-side) and renders the PM name client-side, but the AUTH user is still harness-fixture (org-admin in fixture-harness-org, can read all rows in the org via RLS). Future Wave-B work that needs to test per-PM-role permissions can pass `--email smoke-pm-alpha@nightwork.local` to authenticate as a specific PM and validate role-based access.
  </action>
  <verify>
    <automated>grep -cE 'smoke-seed-credentials-DO-NOT-COMMIT' scripts/harness-auth-bootstrap.ts | grep -qE '^[2-9]' && grep -c 'HARNESS_FIXTURE_PASSWORD' scripts/harness-auth-bootstrap.ts | grep -qE '^[1-9]' && grep -c 'resolvePassword' scripts/harness-auth-bootstrap.ts | grep -qE '^[2-9]' && echo PASS || echo FAIL</automated>
  </verify>
  <done>scripts/harness-auth-bootstrap.ts can authenticate as harness-fixture OR any smoke-* user. The harness-fixture path is preserved (env var). The smoke-* path is new (credentials file). Backward-compatible: existing callsites without --email default to harness-fixture.</done>
</task>

<task type="auto">
  <name>Task 8: Build + typecheck + commit</name>
  <files>(no files modified in this task — verification + commit only)</files>
  <action>
Pre-commit gate:

1. Run `npm run build` — expect 0 errors + 0 warnings.
2. Run `npx tsc --noEmit` — expect 0 errors.
3. Run `git status --porcelain` — expect to see ONLY the 6 files in files_modified list, plus possibly `.planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt` AS UNTRACKED (NOT staged). If the credentials file is staged or absent from the ignored-files list, halt and surface to Jake — the .gitignore inheritance has regressed.
4. Run `git status --ignored | grep smoke-seed-credentials || echo NOT_PRESENT` — expect either "NOT_PRESENT" (file doesn't exist yet — orchestrator hasn't applied the seed) OR the path showing under the ignored list.

Commit:

Per nwrp133 compound-form commit convention + Wave-E EXPANDED-SCOPE commit posture, use compound `git add` + `git commit` (NOT `--no-verify` under any circumstance):

```
git add src/components/nav-bar.tsx src/components/job-sidebar.tsx src/app/jobs/\[id\]/page.tsx scripts/wave-d-smoke.ts scripts/fixtures/smoke-seed.sql scripts/harness-auth-bootstrap.ts && git commit -m "$(cat <<'EOF'
fix(stage-f1-wave-e): Plan E-2 — smoke harness selectors + seed password lifecycle

Closes Wave-D /nightwork-qa BLOCKING #1+#2+#3 (smoke harness selector mismatch,
form name= attribute miss, hydration timing waitUntil=load too early) and HIGH
finding #6 (plaintext password committed in smoke-seed.sql).

Changes:
- src/components/nav-bar.tsx — add data-component="nav-bar" attribute
- src/components/job-sidebar.tsx — add data-component="job-sidebar" + Rule 6
  precursor cleanup (2 hover:text-white → hover:text-[color:var(--nw-white-sand)])
- src/app/jobs/[id]/page.tsx — Detail component accepts optional dataPmName
  flag; "Assigned PM" callsite passes the flag → renders data-pm-name attribute
- scripts/wave-d-smoke.ts — NavBar selector single canonical form, sidebar
  single canonical form, waitUntil="networkidle", primary-UX selectors use
  Playwright role-based locators, NEW DOM-level PM name AC on Job Alpha route
- scripts/fixtures/smoke-seed.sql — REWRITE password handling: per-user
  gen_random_uuid()::text at apply time, RAISE NOTICE emits credentials for
  orchestrator capture to gitignored .planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt
- scripts/harness-auth-bootstrap.ts — credentials-file fallback for smoke-*
  users; HARNESS_FIXTURE_PASSWORD env var path preserved for harness-fixture

Authorization: nwrp141-144 + Wave-D /nightwork-qa BLOCKING verdict
(3-reviewer convergence on smoke harness + ai-logic-tester 4-bug enumeration).
nwrp144 #1 adds DOM-level PM name verification AC validating the application-
layer pm_id → orgPms[i].full_name mapping that nwrp143 Q3(a) flagged.

Post-commit (orchestrator-level, NOT in plan body):
1. Apply rewritten seed via Supabase MCP execute_sql.
2. Capture RAISE NOTICE output to .planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt.
3. Re-run wave-d-smoke.ts against staging URL.
4. /nightwork-qa revalidation.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

After commit:

5. Run `git log -1 --stat` — verify the commit lists exactly 6 files modified.
6. Run `git status` — expect clean working tree (no remaining staged or unstaged changes).
7. Do NOT push. The orchestrator handles pushing per Wave-E EXPANDED-SCOPE sequencing diagram (after seed re-apply + smoke re-run + /nightwork-qa PASS + GATE-N approval).

**If pre-commit hook fails:** HALT for Jake authorization per CLAUDE.md Development Rules. The Drummond gate (.githooks/pre-commit) is NEVER bypassed under any circumstance. The nightwork-post-edit Claude-Bash hook may be bypassed only with explicit per-incident Jake authorization, with bypass + rationale documented in the commit body. Do NOT proceed with --no-verify; surface the failure with the hook's stdout + stderr captured for Jake's review.

**If npm run build fails:** HALT and surface to Jake. Most likely root causes: (a) TypeScript error from the Detail component's new dataPmName prop type; (b) JSX syntax error from the conditional spread `{...(dataPmName ? ... : {})}`; (c) `getByRole` syntax in wave-d-smoke.ts not matching Playwright API surface. Address the specific error before re-running the build.
  </action>
  <verify>
    <automated>npm run build 2>&1 | grep -qE 'error|Error' && echo FAIL || (git log -1 --stat | grep -qE 'nav-bar.tsx|job-sidebar.tsx|wave-d-smoke.ts|smoke-seed.sql|harness-auth-bootstrap.ts' && echo PASS || echo FAIL_NO_COMMIT)</automated>
  </verify>
  <done>Plan E-2 commit lands in local main branch. All 14 acceptance criteria satisfied. Working tree clean. Push handled by orchestrator post-Wave-E /nightwork-qa PASS.</done>
</task>

</tasks>

<verification>

**Pre-execute (orchestrator-level — verify before dispatching Plan E-2 executor):**
- Wave-E EXPANDED-SCOPE approved (verified — file exists at .planning/expansions/stage-f1-knowledge-graph-auth-wave-e-EXPANDED-SCOPE.md)
- Plan-review iter-1 results reviewed by Jake (Wave-E sequencing diagram step: "HALT for Jake — iter-1 findings review")
- E-2 plan body addresses any iter-1 findings (revision if needed before execute)
- Local commit at 5958df0 (FINDING-2 remediation calibration log) exists but is NOT yet pushed (per nwrp143; bundles with Wave-E commits at the end)

**During execute (executor self-check before commit):**
- All 14 acceptance criteria in `<criteria>` section above satisfied per the per-task verify commands
- `npm run build` clean (0 errors, 0 warnings)
- `npx tsc --noEmit` clean (0 errors in scripts/ + src/)
- `git status --porcelain` shows only the 6 files in files_modified
- `.planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt` is NOT staged (either absent or shown under git status --ignored)
- All hooks silent (Drummond grep gate + nightwork-post-edit)
- Compound commit form used (NOT --no-verify)

**Post-execute (orchestrator-level — Wave-E sequencing diagram steps 5-8):**
- Apply rewritten seed via Supabase MCP execute_sql against production Supabase
- Capture RAISE NOTICE output to `.planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt` (gitignored)
- Verify the credentials file contains 9 lines, format `email password` per line, all 9 smoke-* emails present
- Re-run `npx tsx scripts/wave-d-smoke.ts --preview-url <staging-url>` (still authenticates as harness-fixture)
- Verify smoke-results.json shows:
  - All 13 routes PASS or expected DEFER per Wave-E EXPANDED-SCOPE AC-E-07
  - /jobs/22222222-2222-2222-2222-200000000001 route shows empty invariant_failures (DOM-level PM name AC passes)
- Run /nightwork-qa revalidation post-Wave-E execute (expect PASS or WARNING; not BLOCKING per Wave-E EXPANDED-SCOPE AC-E-11)
- HALT for Jake review at GATE-N

**Failure modes + recovery:**

| Symptom | Likely root cause | Recovery |
|---------|-------------------|----------|
| Smoke shows `NavBar count != 1` on every route | data-component attribute not actually present | Verify Task 1 + 2 commits landed; check `git log -1 --stat` |
| Smoke shows DOM PM name AC fails with "[data-pm-name] element missing" | Detail component not rendering the attribute (caller didn't pass dataPmName) | Re-verify Task 3 edits; check `grep -n 'dataPmName' src/app/jobs/[id]/page.tsx` |
| Smoke shows DOM PM name AC fails with "expected Smoke PM Alpha, got Unassigned" | PostgREST embed broken OR seed didn't populate Job Alpha's pm_id | Run Supabase MCP query against jobs WHERE id='22222222-...-200000000001' AND check pm_id; if null, re-apply seed |
| `waitUntil=networkidle` stalls + timeouts on background-polling routes | Notification-bell or similar background fetch | Revert to `waitUntil="domcontentloaded"` + explicit `waitForSelector('header[data-component="nav-bar"]', { state: "visible" })` per route. Direct executor patch (NOT a new plan). |
| Credentials file missing after seed apply | Orchestrator didn't capture RAISE NOTICE output OR captured but to wrong path | Re-apply seed with explicit `2>&1 | tee /tmp/seed-apply.log` and awk-extract to the canonical path |
| harness-auth-bootstrap.ts fails with "Cannot find smoke-user credentials file" | --email passed with smoke-* user but credentials file absent | Re-apply seed first (the harness-fixture path doesn't need the credentials file; only smoke-* paths do) |
| Plan E-2 commit triggers pre-commit hook failure | Drift on token discipline OR Drummond grep OR design-token-* | HALT for Jake; do NOT --no-verify; address the specific hook failure |

</verification>

<success_criteria>

Plan E-2 ships successfully when:

- All 14 acceptance criteria (AC-E2-01..AC-E2-14) in `<criteria>` section above pass mechanically
- Wave-E EXPANDED-SCOPE AC-E-02, AC-E-03, AC-E-04, AC-E-05, AC-E-06, AC-E-08 (which Plan E-2 owns) verified by grep
- npm run build clean (0 errors, 0 warnings)
- npx tsc --noEmit clean (0 errors)
- All hooks silent on commit (Drummond grep gate + nightwork-post-edit)
- Plan E-2 commit is a single atomic commit with all 6 files
- No --no-verify bypass used
- Credentials file is NOT in the commit (gitignored per .planning/qa-runs/ default exclusion)
- Plan E-2 commit hash recorded in calibration log under "Wave-E Plan E-2 ship" entry (orchestrator-level)

Plan E-2 is considered TRULY COMPLETE (per Wave-E EXPANDED-SCOPE Wave-B unblock dependency) when, post-orchestrator-re-apply-and-smoke-re-run:

- Wave-E EXPANDED-SCOPE AC-E-07 satisfied (wave-d-smoke.ts re-run PASSES all 13 routes or documented expected DEFER/SKIP)
- Wave-E EXPANDED-SCOPE AC-E-08 satisfied (DOM PM name AC fires + passes on Job Alpha route)
- Wave-E EXPANDED-SCOPE AC-E-11 satisfied (/nightwork-qa re-run returns PASS or WARNING, NOT BLOCKING)
- Jake approves at GATE-N

</success_criteria>

<rollback_strategy>

If Plan E-2 ships but post-execute smoke + /nightwork-qa fail, rollback options:

**Option A — Forward fix (preferred):** Address the specific failure directly via executor patch on Wave-E branch. Common forward fixes:
- networkidle stalls → fall back to `domcontentloaded` + waitForSelector (no new plan; direct edit)
- DOM PM name AC fails on textContent mismatch → debug via Playwright trace (Wave 1.1-Full Layer 4 deliverable — for now, manual Chrome DevTools walk on the staging URL)
- Credentials file format mismatch → fix the awk extraction command in the orchestrator's apply procedure
- Production attribute regression (e.g., later commit accidentally removes data-component) → re-add the attribute in a separate commit

**Option B — Code revert (use only if forward fix unclear):** `git revert <Plan E-2 commit hash>` reverts all 6 file changes in one commit. The reverted state is the pre-E-2 broken-smoke state — Wave-B remains blocked. Document the revert + root cause in calibration log before attempting fresh Plan E-2 revision.

**Option C — Schema rollback (CRITICAL):** The Plan E-2 commit itself contains ONLY file edits, NOT any schema changes. However, the orchestrator's seed re-apply DOES touch production Supabase (9 auth.users rows with new bcrypt hashes). To roll back the schema state:

```sql
-- Restore previous bcrypt hashes (CAUTION: only if seed was applied)
-- Requires the previous credentials file from before the re-apply
-- (which was deleted as part of FINDING-2 cleanup per nwrp141-143)
-- In practice: re-apply the seed AGAIN with fresh passwords; the previous
-- run's passwords are unrecoverable from bcrypt hashes.

-- Alternative: DELETE the 9 smoke-* users entirely (per nwrp143 FINDING-2 procedure)
DELETE FROM auth.users WHERE email LIKE 'smoke-%@nightwork.local';
-- Cascade chain: auth.identities + profiles + org_members all CASCADE delete.
-- Synthetic jobs/invoices/activity_log persist with dangling pm_id (acceptable
-- for short-term; Wave-B prerequisite #10 addresses the user-identity FK
-- convention that closes this gap).
```

For a full pre-Wave-E state restoration, follow the finding-2-remediation.md procedure: delete 9 smoke users + cleanup synthetic jobs/invoices/activity_log via the cascade chain documented at finding-2-remediation.md:65-77.

**Reversibility note:** Plan E-2 file changes are reversible via standard git revert. The seed re-apply step (orchestrator-level, NOT Plan E-2 scope) is reversible via DELETE + re-apply with old or new passwords. NO data outside the synthetic fixture-harness-org is touched.

</rollback_strategy>

<output>
After completion, create `.planning/phases/stage-f1-knowledge-graph-auth-wave-e/E-2-SUMMARY.md` per the standard summary template — record commit hash, AC verification results, any deviations from plan body, post-execute orchestrator steps remaining, and any halt-findings surfaced during execute that warrant calibration-log entries.

Also surface to the calibration log at Wave-E close-out (NOT during E-2 execute):
- Plan E-2 commit hash
- Smoke re-run verdict (PASS or per-route failure list)
- /nightwork-qa revalidation verdict
- Any gaps surfaced during the DOM-level PM name AC implementation (e.g., did the Detail component pattern generalize cleanly, or did the conditional-spread `{...(dataPmName ? ... : {})}` feel awkward enough to warrant a refactor in Wave-B?)
- TD-WB-01 entry in tech-debt directory for the rounded-full hook-precision divergence (NEW tech-debt entry; created at Wave-E close-out, not during E-2 execute)
</output>

<notes_for_plan_review>

**Surfaced during plan-authoring (2026-05-14):**

1. **DOM-level PM name AC implementation requires production component change.** The smoke harness AC asserts `[data-pm-name]` element textContent contains "Smoke PM Alpha". Implementation: Task 3 extends the `<Detail>` component in src/app/jobs/[id]/page.tsx with an optional `dataPmName?: boolean` prop. This is a small attribute-only patch (no visual/behavior change) but it's a production component edit. Plan-review should validate that this is acceptable per the iter-2 §6.4 "data-slot/data-pattern-slot attribute-only patches" pattern. If plan-review prefers a non-attribute-based AC (e.g., role-based text match on the page like `page.getByRole("heading", { name: /assigned pm/i })` + sibling text content), the Detail component change becomes unnecessary. Plan-author recommendation: KEEP the attribute approach. It's stable across layout shuffling (whereas role-based text matches are sensitive to NwEyebrow vs h3 vs <p>-with-strong structural changes).

2. **Primary-UX selector for /financials/bills + /financials/bills/queue may not have a visible PM dropdown on initial page load.** Per the codebase scan at plan-authoring time, `src/components/invoices/InvoiceHeader.tsx:82-92` renders a PM select INSIDE a specific bill row's header — it's NOT a page-level filter dropdown visible on the bills list view. Plan-author RECOMMENDATION: REPLACE the /financials/bills + /financials/bills/queue primary_ux_selector entries with the DataGrid row-count assertion already in the per-route invariant block (lines 439-447). Or use `text=Bills` as the primary-UX selector to assert the page header renders. Plan-review should confirm.

3. **`role=combobox[name=/...../i]` syntax depends on Playwright accessible-name resolution.** Playwright's role-based locator resolves the accessible name per W3C ARIA spec. For production `<select>` elements without `aria-label`, the accessible name resolves via `<label>` association (when the select is inside a `<label>` element) OR adjacent text (less reliable). At plan-authoring time:
   - jobs/new/page.tsx:293-304 uses a Field wrapper which renders `<label>` (verified — name resolves to "Assigned PM")
   - WorkflowSettingsForm.tsx:302-319 wraps the select in `<label>` (verified — name resolves to "Default PM for unmatched jobs")
   - InvoiceHeader.tsx:80-92 places a `<span>PM:</span>` adjacent to the `<select>` (NOT label-wrapping) — accessible name may NOT resolve to "PM"

   Plan-author recommendation: TEST the role-based locators against the staging URL during plan-review's ai-logic-tester pass. If any locator fails to resolve, fall back to Playwright `text=PM` + `xpath=following-sibling::select` or similar structural selector.

4. **RAISE NOTICE-based credentials capture relies on apply-step orchestration.** The orchestrator (NOT the plan body) must run the seed apply with stdout capture + awk extraction. This is documented in scripts/fixtures/smoke-seed.sql header comments but is NOT verified by any AC in Plan E-2 (AC verifies the seed FILE shape, not the credentials FILE shape — the credentials file is orchestrator-step output). If the orchestrator's apply step has a bug, the smoke re-run will fail. Plan-author confidence: medium. Suggested mitigation: orchestrator should add a verification step "credentials file has 9 lines + 9 distinct smoke-* emails" before re-running wave-d-smoke.ts.

5. **PostgreSQL transaction semantics for RAISE NOTICE + BEGIN/COMMIT.** PostgreSQL emits NOTICE messages immediately, NOT batched at COMMIT. This means if the seed transaction fails after some RAISE NOTICE calls have emitted, the credentials file may have partial state. Plan-author recommendation: orchestrator should treat the credentials file as POSSIBLY-PARTIAL until the apply step's exit code is verified zero. Acceptable for fixture-harness-org (synthetic data; re-runnable).

6. **Plan E-2 sequencing within Wave-E:** Plan E-2 commits FIRST (gates downstream smoke runs), but E-1 + E-3 are dispatchable in parallel after E-2 commits per Wave-E EXPANDED-SCOPE Rule 5 disjoint files_modified check. Plan-author RECOMMENDATION: orchestrator runs:
   1. Author E-2 + E-1 + E-3 plans in parallel (3 gsd-planner subagents)
   2. Run /nightwork-plan-review iter-1 across all 3 plans
   3. HALT for Jake review
   4. Dispatch E-2 executor first
   5. After E-2 commits, dispatch E-1 + E-3 executors in parallel
   6. After all 3 commit, orchestrator re-applies seed + re-runs smoke + /nightwork-qa revalidation

7. **TD-WB-01 tech-debt entry creation:** Plan E-2 references TD-WB-01 (Wave-B hook-precision-refinement candidate) but does NOT create the tech-debt entry. Per Wave-E EXPANDED-SCOPE close-out scope, tech-debt entries are authored at Wave-E close-out (NOT during E-2 execute). Plan-author confirms this is correct per nwrp144 #2 — Wave-E close-out also authors the user-identity FK convention D-### entry. Both should be done in the same close-out pass.

8. **Halt finding — no plan-author halts identified.** Plan E-2's scope is well-defined; all 6 sub-steps have concrete code targets verified at plan-authoring time. The DOM-level PM name AC implementation (item 1 above) is the largest design choice; plan-review should validate the attribute approach vs alternative AC mechanisms.

</notes_for_plan_review>
