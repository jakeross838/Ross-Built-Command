---
phase: stage-f1-knowledge-graph-auth-wave-d
plan: D-4
plan-name: rules-and-playwright
type: execute
wave: D
depends_on: []
autonomous: true
halt_after: false
threat_model_severity: low
status: not-started
authored: 2026-05-13
authored_by: gsd-planner (claude-opus-4-7[1m])
authorization: nwrp121 (Wave-D authorization + Addition 2 — Playwright smoke is the Rule 4 enforcement mechanism, not manual smoke); nwrp122 iter-2 (9 decisions + 2 clarifications + SOC2/retention addition); nwrp124 (mechanical inline of iter-2 §4 subsections into PLAN body)
requires_smoke: true
requirements: []

source_decisions:
  - "nwrp120 diagnosis report — Rules 1-4 codify the process-gap closure for Wave-C's schema-only QA pass"
  - "nwrp121 Addition 2 — wave-d-smoke.ts is a Playwright script (NOT manual smoke); seeds Wave 1.1-Full Layer 4 framework"
  - "nwrp122 iter-2 decisions 3-7 — Rule 4 lifecycle gate codified between executor and /nightwork-qa; /nightwork-qa is single canonical enforcer; screenshots are DIAGNOSTIC-ONLY (no baseline diff); synthetic fixture seed replaces Drummond UUIDs; Rules 1-4 placement is Workflow posture (NOT Development Rules)"
  - "nwrp127 iter-3 patch — Rule 5 (files_modified intersection check before parallel dispatch) added to Workflow posture bullet block + plan-review enforcement section. Origin: Wave-D D-1 + D-2 both claimed parallel_execute_ok: true but shared 2 files (invoices/page.tsx, invoices/queue/page.tsx); pre-dispatch grep caught the overlap that plan-author logical reasoning + plan-review iter-1 + iter-2 all missed. Rule 5 codifies the mechanical guardrail; enforcement structural via plan-review iter-1 check (Task 2 extended with Rule 5 enforcement section)."
  - "nwrp130 iter-3 patch — Rule 6 (precursor hook scan before plan-execute dispatch) added to Workflow posture bullet block + plan-review enforcement section. Origin: Wave-D D-2 executor halted at Task 2 on a pre-existing `bg-white` violation in `invoices/page.tsx:822` (commit 2c5607e3, 2026-04-13 — 31 days pre-D-2); post-edit hook correctly halted but whole-file scan blocked unrelated AppShell-strip work until precursor commit e9fbbd3 cleaned it. Rule 6 codifies the guardrail at plan-review time so surprises don't surface at execute time. WARNING (not BLOCKING) per friction-tax rationale: many precursors are trivial in-task fixes; the discipline is 'no surprises at execute,' not 'no violations exist.' Enforcement structural via plan-review iter-1 mechanical scan (Task 2 extended with Rule 6 enforcement section)."
  - "nwrp131 iter-3 patch — Rule 6 regex-precision refinement. Origin: Wave-D D-2's 2nd dispatch attempt halted on `hover:text-white` in `aging-report/page.tsx:27` after orchestrator's Rule 6 pre-flight scan used narrower pattern `bg-white|bg-gray-...` and missed the `hover:`-prefixed variant. Hook's authoritative regex `\\b(bg|text|border)-(white|black)\\b` includes word-boundary anchors that catch hover:/focus:/active:/disabled: prefix variants — load-bearing. Patch extends Rule 6 enforcement section with the COMPLETE hook forbidden-pattern set (HEX_HITS, NAMED_HITS, PURE_HITS, LEGACY_HITS, ORG_ID_HITS, ROUNDED, CB4, CB2, SHADOW, PURPLE) and adds new WARNING finding `PLAN_PRECURSOR_SCAN_REGEX_NARROWED` for plan-author / plan-reviewer use of narrower approximations. Precursor commit fd70122 cleaned aging-report:27 before D-2 re-re-dispatched."
  - "nwrp133 iter-3 patch — commit-mechanism transparency clarification (EDIT 4 in Task 1). Origin: Wave-D D-1 first-commit attempt at SHA 8af4aa6 used `git commit --no-verify` while commit body cited e79e46e compound-form precedent — conflated two distinct bypass mechanisms with different discipline costs. Caught pre-push by executor self-check (NEAR-MISS, not Wave-A-class violation that reached origin/main). Reset via `git reset --soft HEAD~1` before push; re-authored at 7b26ddd via correct compound form. Patch adds EDIT 4 to Task 1: insert a 'Commit mechanism transparency' clarification paragraph under the existing `--no-verify` rule in CLAUDE.md Development Rules section. Clause distinguishes (a) compound `git add && git commit` form (hook regex prefix skip by hook design lines 28-30; no Jake auth required) from (b) `--no-verify` flag (explicit bypass; Jake auth required OR pre-push revert). Executor MUST cite the actual mechanism used in commit body; conflation is a discipline concern even when diff is identical."
  - "nwrp135 post-ship amendment — Rule 6 consolidation (4 sub-checks). Origin: smoke-seed.sql apply at post-D-3 sequencing failed on auth.users.email uniqueness collision with existing fixture-harness-org infrastructure from migration 00092/00093. Plan author missed the architectural reuse opportunity (the canonical Verification Harness Fixture Org already exists; smoke seed should merge into it, not create parallel synthetic infrastructure). Rule 6 was originally codified by D-4 (b4e4dc4) as 'precursor hook scan before plan-execute dispatch.' Per nwrp135 Option A + Rule 7 rejection, the rule is consolidated into 4 sub-checks: (a) hook regex sweep on files_modified (the original Rule 6 scope; nwrp130/131/132); (b) fixture infrastructure collision check on seed/SQL deliverables (nwrp135 origin); (c) deliverable path reachability check (nwrp129 origin — gitignore whitelist); (d) files_modified intersection check for parallel_execute_ok plans (Rule 5 / nwrp127). Consolidation rationale: the pre-flight collision family is the same mechanical principle (verify current state matches plan assumptions) applied to different deliverable classes. Keeps rule count cognitively manageable (Wave-B would have 12+ rules if every gap became its own rule). CLAUDE.md Rule 6 updated post-D-4 to reflect the 4-sub-check version; D-4 PLAN.md retains historical Rule 6 codification (single sub-check) as the version that shipped at b4e4dc4. Wave-B plan-review iter-1 honors the revised CLAUDE.md version, not D-4 PLAN.md."
  - "stage-f1-knowledge-graph-auth-wave-d EXPANDED-SCOPE (2026-05-13, APPROVED) — Plan D-4 scope locked"
  - "D-073 / Q2=C (CLAUDE.md verification harness deprecation path) — 3-layer harness is canonical CI signal; wave-d-smoke seeds the interactive Layer 4 framework noted in calibration-log F1+ harness extension entry"
  - "D-30 (CLAUDE.md tenant boundary by construction) — script auth uses harness-fixture@nightwork.local (org-admin in fixture-harness-org), matching the existing stage-1.5c-verification-harness auth strategy; NO platform-admin escape hatch"

files_modified:
  - CLAUDE.md
  - .claude/commands/nightwork-plan-review.md
  - .claude/agents/nightwork-ai-logic-tester.md
  - .claude/skills/nightwork-ai-logic-checker/SKILL.md
  - scripts/wave-d-smoke.ts
  - scripts/fixtures/smoke-seed.sql
  - src/components/branding/Wordmark.tsx
  - src/components/branding/Icon.tsx
  - src/components/invoice-review/InvoiceReviewView.tsx
  - .gitignore

files_referenced:
  - .planning/expansions/stage-f1-knowledge-graph-auth-wave-d-EXPANDED-SCOPE.md (Plan D-4 scope authority)
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-d/ITER-2-PATCHES.md (iter-2 audit-trail changelog; this PLAN inlines §4 mechanically per nwrp124)
  - .planning/calibration-log.md (lines 93-95: F1+ harness extension — Layer 4 interactive behavioral testing entry)
  - scripts/harness-auth-bootstrap.ts (Y.1.B canonical Playwright auth pattern — chromium.launch + storageState reuse model)
  - src/lib/verification/_browser.ts (chromiumLaunchArgs + harnessBrowserHeaders + HARNESS_AUTH_STATE_PATH constants; reuse here keeps the script's auth posture identical to the 3-layer harness)
  - src/lib/verification/auth-strategy.ts (FIXTURE_USER_EMAIL = "harness-fixture@nightwork.local"; HARNESS_FIXTURE_PASSWORD env var contract; D-30 single-auth-path constraint)
  - .planning/templates/criteria-template.md (drop-in template for <criteria> block authored below)
  - package.json (Playwright already in devDependencies at ^1.59.1; tsx at ^4.21.0 — no new deps needed)
  - CLAUDE.md "### Workflow posture" subsection (lines 615-621; iter-2 §4.5 relocates Rules 1-4 insertion target here, NOT the Development Rules section originally targeted)
  - CLAUDE.md "### Architecture posture" subsection (lines 576-587; iter-2 §4.5 adds cross-reference bullet under this section for PostgREST FK citation rule)
  - CLAUDE.md "### Domain rules" subsection (lines 609-613; iter-2 §4.4.4 adds Drummond-vs-synthetic-fixtures exception clause here)
  - .claude/commands/nightwork-plan-review.md (Step 2 reviewer plan + plan-review checklist insertion points; "Criteria mandate enforcement" pattern at line 130+ is the precedent shape for "Rule 2 FK-citation enforcement")
  - .claude/agents/nightwork-ai-logic-tester.md (existing prompt; Step 4 "Actual behavior" + "Hard rules" sections are insertion targets for Rule 3 "execute, not infer" mandate)
  - .claude/skills/nightwork-ai-logic-checker/SKILL.md (iter-2 §4.10 secondary target for Rule 3 propagation; skill content is the runtime contract that the agent file points to)

requires:
  - .planning/expansions/stage-f1-knowledge-graph-auth-wave-d-EXPANDED-SCOPE.md
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-1-postgrest-relationship-fix-PLAN.md (sibling — Rule 2 FK citation enforcement targets this plan's migration shape; informs the Rule 2 example block)
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-2-financials-appshell-dedup-PLAN.md (sibling — Issue 2's 6 → 8 financials/* surfaces per iter-2 §2.1 are 8 of the 13 routes in wave-d-smoke.ts)
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-d/ITER-2-PATCHES.md (authoritative iter-2 changelog this PLAN absorbs)

provides:
  - "Rules 1-4 codified in CLAUDE.md → '### Workflow posture' subsection (per iter-2 §4.5 relocation from original Development Rules target) — schema≠runtime verification, FK-citation mandate, ai-logic-tester execute-don't-infer, Playwright smoke pre-QA for UI-touching plans"
  - "CLAUDE.md → '### Architecture posture' subsection gains PostgREST FK citation cross-reference bullet (per iter-2 §4.5)"
  - "CLAUDE.md → '### Domain rules' subsection gains Drummond-vs-synthetic-fixtures exception clause (per iter-2 §4.4.4)"
  - "Plan-review checklist enforces Rule 2 FK citation as BLOCKING per nwrp121 + iter-2 §4.17 + §4.18 (every PostgREST relationship-hint .select() in a code diff cites the enabling FK or refactors; primary reviewer is `architect` + co-primary `database-reviewer` per iter-2 §4.18 reviewer reassignment)"
  - "ai-logic-tester agent prompt + nightwork-ai-logic-checker SKILL.md mandate runtime query execution (via Supabase MCP or REST) for any PostgREST/RLS claim — 'inferred-but-unverified' is explicitly disallowed (per iter-2 §4.10 SKILL.md propagation)"
  - "scripts/wave-d-smoke.ts: Playwright script hitting 13 unique routes against Vercel preview URL with harness-fixture auth (per iter-2 §4.4.2 synthetic UUIDs replace Drummond); outputs pass/fail JSON + per-route screenshots to .planning/qa-runs/wave-d/screenshots/ (DIAGNOSTIC-ONLY per iter-2 §4.3 — no baseline diff)"
  - "scripts/fixtures/smoke-seed.sql: synthetic non-Drummond seed (orgs + profiles + memberships + jobs + invoices + activity_log) idempotent via ON CONFLICT (per iter-2 §4.4.1)"
  - "data-slot='org-logo' + data-pattern-slot attributes on Wordmark/Icon/InvoiceReviewView for selector stability in smoke harness (per iter-2 §4.6 + §4.9)"
  - "wave-d-smoke seeds Wave 1.1-Full Layer 4 framework (interactive behavioral testing layer noted in calibration-log F1+ harness extension — first Playwright-script-against-preview-URL artifact in repo outside the 3-layer harness)"
  - ".gitignore amended: /.playwright-output/ + .planning/verification/auth/ rules added (per iter-2 §4.11 — auth state never committed)"

affects:
  - "All future PLAN files with PostgREST embedding hints — plan-review iter-1 now BLOCKS unless FK is cited (migration filename + line number) per Rule 2; per iter-2 §4.17 regex is tightened to scan files_modified .tsx files in addition to PLAN body; per iter-2 §4.18 primary reviewer reassigned to `architect` + co-primary `database-reviewer`"
  - "All future /nightwork-qa invocations involving PostgREST/RLS claims — ai-logic-tester now MUST execute representative queries, not infer from code reading; per iter-2 §4.10 the SKILL.md propagation makes this the runtime contract not just agent prompt"
  - "All future UI-touching plans — Rule 4 requires `requires_smoke: true` front-matter flag + Playwright smoke pre-/nightwork-qa; per iter-2 §4.1 lifecycle sequence is codified (executor → preview deploy → smoke → /nightwork-qa); per iter-2 §4.2 /nightwork-qa is single canonical enforcer with documented failure-mode taxonomy"
  - "All future smoke scripts — per iter-2 §4.4.4 CLAUDE.md Domain Rules exception clause: scripts/ use synthetic seeded UUIDs (extend scripts/fixtures/smoke-seed.sql) NOT Drummond/SmartShield/real-vendor UUIDs"
  - "Wave-B unblock dependency — per nwrp121 Wave-B gate, Wave-D ship + wave-d-smoke pass + Rules 1-4 codified + plan-review prompt updated are 4 of the 5 Wave-B preconditions"
  - "No production code paths modified by the rule-codification + smoke-script tasks; production code TOUCHED by data-slot/data-pattern-slot attribute additions (Tasks 5 + 6) is attribute-only — no visual or behavior change"

sequence:
  position_in_wave: 3 (executes AFTER D-1 + D-2 ship the route fixes that wave-d-smoke.ts then validates against preview; AFTER D-5 lands D-078 decision entry per nwrp121 execution order)
  parallel_authoring_ok: true (5 Wave-D plans authored in parallel per nwrp121)
  blocks: ["/nightwork-qa enforcement gate (per iter-2 §4.2) — wave-d-smoke.ts must run + pass against preview BEFORE /nightwork-qa can return PASS on D-1/D-2/D-4 (each declares requires_smoke: true)"]

acceptance-criteria-target: 13 falsifiable items (AC-D4-01..AC-D4-13); see "Acceptance criteria" below (iter-2 §4.19 AC count delta: original 9 → iter-2 13)

threat_model:
  trust_boundaries:
    - "Documentation/policy boundary — CLAUDE.md Rules 1-4 are advisory text consumed by humans + Claude agents; their enforcement is structural (plan-review checklist + ai-logic-tester agent prompt + /nightwork-qa Rule 4 requires_smoke check per iter-2 §4.2). The rules themselves are not load-bearing; the enforcement points are."
    - "Plan-review checklist boundary — nightwork-plan-review.md is the entry point for plan-level QA; adding Rule 2 FK-citation as BLOCKING places a structural gate on all future PostgREST-hint-touching plans. Threat surface: the gate fires on plans that DON'T have hints (false positive) or fails to fire on plans that DO (false negative). Mitigation: scoped regex match on `.select(\".*:.*(.*)\")` pattern in plan code diff + companion grep over files_modified .tsx/.ts files per iter-2 §4.17 (existing Grep tool path); reviewers fall back to manual scan if regex misses."
    - "ai-logic-tester runtime-query boundary — Step 4 'Actual behavior' currently allows code-reading as evidence; Rule 3 mandates query execution via Supabase MCP `execute_sql` (read-only) or REST. New trust surface: Supabase MCP usage in the agent runtime + per iter-2 §4.10 propagation to .claude/skills/nightwork-ai-logic-checker/SKILL.md. Service-role queries are NOT used; agent uses anon-key + harness-fixture credentials for parity with production RLS."
    - "Playwright script auth boundary — scripts/wave-d-smoke.ts authenticates as harness-fixture@nightwork.local in fixture-harness-org per D-30. Per iter-2 §4.4 synthetic seed via scripts/fixtures/smoke-seed.sql replaces hardcoded Drummond UUIDs — Drummond data is NOT in fixture-harness-org and is not expected to be; the synthetic seed provides distinct UUID-namespaced fixtures (org/user/job/invoice/activity-log spaces 1/0/2/3/4 — see iter-2 §4.4.1 UUID convention). Rule-4 smoke validates RUNTIME behavior of refactored routes against synthetic fixture, NOT against Drummond. Per iter-2 §4.4.3 the `requires_drummond_data: true` skip-path is REMOVED — all 13 routes run against synthetic seed."
    - "Preview URL bypass boundary — script uses vercelBypassHeaders() + nightworkVerificationBypassHeaders() from existing _browser.ts helpers. Same posture as 3-layer harness; same secrets (VERCEL_AUTOMATION_BYPASS_SECRET, VERIFICATION_BYPASS_SECRET). No new secret introduced. Per iter-2 §4.12: missing bypass secrets emit loud WARN (do NOT abort)."

  threats:
    - id: T-D-4-01
      category: "I (Information Disclosure — script logs credentials)"
      component: "scripts/wave-d-smoke.ts console.log + JSON output"
      disposition: "mitigate"
      mitigation: "Script never logs HARNESS_FIXTURE_PASSWORD, VERCEL_AUTOMATION_BYPASS_SECRET, VERIFICATION_BYPASS_SECRET, or any sb-* cookie values. JSON output is per-route { route, status, console_errors[], primary_ux_pass, screenshot_path } — no auth state. Cookies are extracted via storageState and dumped to gitignored .planning/verification/auth/harness-auth-state.json (reused from harness-auth-bootstrap.ts pattern; .gitignore rule added per iter-2 §4.11). Console errors from the browser are captured raw but redacted via post-process regex stripping sk-ant-* + Bearer * (same pattern as Layer 3 vision-client.ts WARNING-1 amendment)."
    - id: T-D-4-02
      category: "D (Denial of Service — runaway Playwright session consumes CI runner)"
      component: "scripts/wave-d-smoke.ts chromium launch + 13-route navigation loop"
      disposition: "mitigate"
      mitigation: "Per-route timeout: 30s page.goto + 5s settle for primary-UX selectors. Total walltime cap: 13 routes × 35s = ~7.5min; script enforces a 10min outer timeout via `Promise.race([walk(), new Promise((_, rej) => setTimeout(rej, 600_000))])`. On outer-timeout: graceful Playwright close + non-zero exit. CI workflow author (future Wave 1.1-Full task per iter-2 §4.13 deferral) should mirror the harness-auth-bootstrap.ts walltime budgets."
    - id: T-D-4-03
      category: "T (Tampering — script's primary-UX check produces false PASS)"
      component: "Per-route primary_ux_pass boolean determination"
      disposition: "mitigate"
      mitigation: "Primary-UX selectors are specific + falsifiable, NOT 'page loaded' (the Wave-C process-gap anti-pattern). E.g. Route 1 /today checks `:has-text(\"Active jobs\")` for activity feed presence; Routes 6-8 PM dropdowns check `select[name='assigned_pm'] option` count >= 1 (synthetic seed has 7 PMs per iter-2 §3.1 + §4.4.1 — distinct display names 'Smoke PM Alpha'..'Smoke PM Eta'); per iter-2 §4.7 PM dropdown options are additionally regex-checked for UUID-leak detection. Any selector miss → primary_ux_pass = false + the matching selector recorded in the JSON. No 'soft pass' on element-not-found — explicit assertion failure surfaces in pass/fail JSON. Per iter-2 §4.8 single-NavBar invariant promoted from special-case to per-route check (every route asserts exactly 1 `header.app-shell-nav` and ≤1 `aside.app-shell-sidebar`)."
    - id: T-D-4-04
      category: "S (Spoofing — script auth as fixture user grants cross-org read)"
      component: "harness-fixture@nightwork.local session in fixture-harness-org"
      disposition: "accept"
      mitigation: "Per D-30 (CLAUDE.md tenant boundary by construction): fixture user is membership.role=admin in fixture-harness-org ONLY. RLS policies on every tenant table filter by org_id from getCurrentMembership(). Even if the script's session is captured + replayed maliciously, the worst case is read access to synthetic fixture-harness-org sanitized seed data (per iter-2 §4.4 synthetic seed — no Ross Built customer data, no Drummond data, no SmartShield UUIDs). The existing 3-layer harness operates on this same trust posture; this plan extends it, doesn't relax it. Mitigation NOT required — this is the documented enforcement-by-construction posture."
    - id: T-D-4-05
      category: "R (Repudiation — Rule 2 FK-citation enforcement vague enough to game)"
      component: "nightwork-plan-review.md Rule 2 FK-citation check"
      disposition: "mitigate"
      mitigation: "Per iter-2 §4.17 Rule 2's enforcement criteria are tightened: (a) every `.select(\".*:.*(.*)\")` PostgREST embedding-hint pattern in a plan's code diff AND in files_modified .tsx/.ts source files requires (b) a citation in plan frontmatter or migration-table notes including filename + line number of the FK constraint that enables the embedding (e.g. `00098_add_org_members_profiles_fk.sql:42`), (c) the cited FK must exist in current schema per `pg_constraint` query OR be created by a migration in the same plan. Plan-review iter-1 grep is mechanical: `rg -n '\\.select\\(\"[^\"]+:[^\"]+\\(' PLAN-FILE.md` PLUS companion loop over files_modified `*.tsx`/`*.ts` extracted via awk + grep over the same regex; cross-reference each match against frontmatter `files_modified` migrations or `files_referenced` schema-anchor lines. Per iter-2 §4.18 primary reviewer reassigned: `architect` is primary (schema-correctness lens); `database-reviewer` co-primary (Postgres + PostgREST mechanics); `nightwork-multi-tenant-architect` secondary (only when embedding crosses tenant boundaries). Vagueness fallback: if citation is present but FK absence is asserted (rare — e.g. 'foreign key intentionally not added; relationship resolved via duplicate column lookup'), reviewer must explicitly accept-with-rationale. No 'TODO add FK later' allowed."

must_haves:
  truths:
    - "After Plan D-4 ships, CLAUDE.md '### Workflow posture' subsection (per iter-2 §4.5 relocation) contains 4 new bullets covering Rules 1-4 with verbatim text per iter-2 §4.5"
    - "After Plan D-4 ships, CLAUDE.md '### Architecture posture' subsection contains a PostgREST FK citation cross-reference bullet per iter-2 §4.5"
    - "After Plan D-4 ships, CLAUDE.md '### Domain rules' subsection contains a Drummond-vs-synthetic-fixtures exception clause per iter-2 §4.4.4"
    - "After Plan D-4 ships, `grep -n 'Schema verification ≠ runtime verification' CLAUDE.md` returns a hit on Rule 1"
    - "After Plan D-4 ships, `grep -n 'PostgREST FK citation requirement' CLAUDE.md` returns a hit on Rule 2 (per iter-2 §4.5 the Rule 2 header text was updated)"
    - "After Plan D-4 ships, `grep -n 'ai-logic-tester executes representative queries' CLAUDE.md` returns a hit on Rule 3 (per iter-2 §4.5 header text)"
    - "After Plan D-4 ships, `grep -n 'Playwright smoke pre-QA for UI-touching plans' CLAUDE.md` returns a hit on Rule 4 (per iter-2 §4.1 + §4.5 header text)"
    - "After Plan D-4 ships, .claude/commands/nightwork-plan-review.md has a Rule 2 FK-citation BLOCKING section (mirrors the 'Criteria mandate enforcement' precedent at line 130+) with primary reviewer `architect` + co-primary `database-reviewer` per iter-2 §4.18 reassignment"
    - "After Plan D-4 ships, .claude/agents/nightwork-ai-logic-tester.md Step 4 ('Actual behavior') is amended to mandate runtime query execution for PostgREST/RLS claims; 'Hard rules' section gains the Rule 3 affirmative-evidence requirement"
    - "After Plan D-4 ships, .claude/skills/nightwork-ai-logic-checker/SKILL.md mirrors the Rule 3 runtime-execution contract (per iter-2 §4.10 SKILL.md propagation — skill content is the runtime contract; agent file points TO the skill)"
    - "scripts/wave-d-smoke.ts exists and is TypeScript-clean (npx tsc --noEmit returns 0 errors in scripts/)"
    - "scripts/wave-d-smoke.ts walks 13 unique routes against env var $VERCEL_PREVIEW_URL; outputs pass/fail JSON to .planning/qa-runs/wave-d/smoke-results.json (per iter-2 §4.1 lifecycle artifact path) + screenshots to .planning/qa-runs/wave-d/screenshots/<route-slug>-<run-id>.png (DIAGNOSTIC-ONLY per iter-2 §4.3; filename includes epoch-ms run-id per iter-2 §4.3 idempotency rule)"
    - "scripts/wave-d-smoke.ts walks ALL 13 routes against synthetic seed UUIDs (per iter-2 §4.4.2) — `requires_drummond_data: true` skip-path REMOVED per iter-2 §4.4.3"
    - "scripts/wave-d-smoke.ts startup emits loud WARN when VERCEL_AUTOMATION_BYPASS_SECRET or VERIFICATION_BYPASS_SECRET is unset (per iter-2 §4.12; does NOT abort)"
    - "scripts/wave-d-smoke.ts pre-route loop hits /login for cold-lambda warmup (per nwrp124 step 5 reversion of iter-2 §4.14); falls through with WARN on timeout"
    - "scripts/wave-d-smoke.ts per-route check enforces single-NavBar global invariant on EVERY route per iter-2 §4.8 (not just /financials/*); sidebar count ≤1 invariant added"
    - "scripts/wave-d-smoke.ts per-route check enforces logo placement invariant (header [data-slot='org-logo'] present + bounding-box x >= viewportWidth * 0.5) per iter-2 §4.6"
    - "scripts/wave-d-smoke.ts per-route check enforces DataGrid row-count >= 1 OR explicit [data-state='empty'] indicator on list routes per iter-2 §4.7; PM dropdown UUID-leak regex check on /jobs/new + invoice review surfaces per iter-2 §4.7; NavBar background-color token resolution check per iter-2 §4.7"
    - "scripts/wave-d-smoke.ts per-route check enforces Document Review pattern selectors ([data-pattern-slot='file-preview']/'right-rail'/'audit-timeline' presence) on Document Review surfaces per iter-2 §4.9"
    - "Script's authentication strategy uses harness-fixture@nightwork.local with HARNESS_FIXTURE_PASSWORD env var (reuses scripts/harness-auth-bootstrap.ts pattern; no new auth path)"
    - "scripts/fixtures/smoke-seed.sql exists; idempotent via ON CONFLICT DO NOTHING; seeds synthetic non-Drummond UUIDs (orgs/users/jobs/invoices/activity_log) per iter-2 §4.4.1 UUID convention table"
    - "src/components/branding/Wordmark.tsx + Icon.tsx contain `data-slot=\"org-logo\"` attribute on rendered root element (per iter-2 §4.6 + §6.4)"
    - "src/components/invoice-review/InvoiceReviewView.tsx (or equivalent Document Review canonical surface) contains `data-pattern-slot=\"file-preview\"` + `data-pattern-slot=\"right-rail\"` + `data-pattern-slot=\"audit-timeline\"` attributes (per iter-2 §4.9 + §6.4)"
    - ".gitignore contains both /.playwright-output/ rule AND .planning/verification/auth/ rule (per iter-2 §4.11)"
    - "Script's header docblock documents: invocation (`npx tsx scripts/wave-d-smoke.ts --preview-url https://...`), env vars (HARNESS_FIXTURE_PASSWORD + VERCEL_AUTOMATION_BYPASS_SECRET + VERIFICATION_BYPASS_SECRET), auth posture (D-30 single-path), synthetic seed convention (per iter-2 §4.4), DIAGNOSTIC-ONLY screenshot strategy (per iter-2 §4.3), and Wave 1.1-Full Layer 4 seed intent"

  artifacts:
    - path: "CLAUDE.md"
      provides: "Rules 1-4 in '### Workflow posture' subsection (per iter-2 §4.5 — RELOCATED from original Development Rules target). Cross-reference bullet under '### Architecture posture' per iter-2 §4.5. Drummond-vs-synthetic exception clause under '### Domain rules' per iter-2 §4.4.4."
      contains: ["Schema verification ≠ runtime verification", "PostgREST FK citation requirement on plans that touch embedded selects", "ai-logic-tester executes representative queries", "Playwright smoke pre-QA for UI-touching plans", "smoke scripts + verification harness fixtures + Playwright tests use synthetic seeded UUIDs"]
      min_lines: 645 (file gains ~30 lines across 3 subsection edits)
    - path: ".claude/commands/nightwork-plan-review.md"
      provides: "Rule 2 FK-citation BLOCKING enforcement section (mirrors 'Criteria mandate enforcement' precedent at lines 130-162) with iter-2 §4.17 tightened regex + iter-2 §4.18 reviewer reassignment"
      contains: ["PostgREST relationship hint validation", "Rule 2", "BLOCKING", "PLAN_MISSING_FK_CITATION", "architect", "database-reviewer"]
    - path: ".claude/agents/nightwork-ai-logic-tester.md"
      provides: "Step 4 'Actual behavior' amended + new 'Hard rule' for Rule 3 + Output template gains 'Runtime evidence' sub-section"
      contains: ["execute representative queries", "Supabase MCP", "execute_sql", "Inferred-but-unverified claims are explicitly disallowed", "Runtime evidence"]
    - path: ".claude/skills/nightwork-ai-logic-checker/SKILL.md"
      provides: "Rule 3 runtime-execution contract mirrored from agent prompt per iter-2 §4.10 propagation"
      contains: ["execute_sql", "Inferred-but-unverified claims are explicitly disallowed"]
    - path: "scripts/wave-d-smoke.ts"
      provides: "Playwright smoke script for 13 unique routes (post-Issue 1 + Issue 2 fixes) against Vercel preview; per-route invariants per iter-2 §4.6-§4.9; DIAGNOSTIC-ONLY screenshots per iter-2 §4.3; cold-lambda warmup per iter-2 §4.14; loud WARN on missing secrets per iter-2 §4.12"
      exports: ["main (top-level async)"]
      min_lines: 450 (route list + per-route runner + JSON serializer + auth bootstrap + chromium teardown + invariant checks added per iter-2 §4.6-§4.9 + warmup per §4.14 + WARN per §4.12)
    - path: "scripts/fixtures/smoke-seed.sql"
      provides: "Synthetic non-Drummond seed (org + 10 users-with-memberships + 10 jobs + 5 invoices + 10 activity_log rows); idempotent via ON CONFLICT (per iter-2 §4.4.1 + §6.2)"
      contains: ["11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-2", "33333333-3333-3333-3333-3", "44444444-4444-4444-4444-4", "ON CONFLICT", "Smoke PM Alpha"]
      min_lines: 80
    - path: "src/components/branding/Wordmark.tsx"
      provides: "data-slot='org-logo' attribute (per iter-2 §4.6 + §6.4); no visual/behavior change"
      contains: ["data-slot=\"org-logo\""]
    - path: "src/components/branding/Icon.tsx"
      provides: "data-slot='org-logo' attribute (per iter-2 §4.6 + §6.4); no visual/behavior change"
      contains: ["data-slot=\"org-logo\""]
    - path: "src/components/invoice-review/InvoiceReviewView.tsx"
      provides: "data-pattern-slot='file-preview'/'right-rail'/'audit-timeline' attributes on canonical Document Review surface (per iter-2 §4.9 + §6.4); no visual/behavior change"
      contains: ["data-pattern-slot=\"file-preview\"", "data-pattern-slot=\"right-rail\"", "data-pattern-slot=\"audit-timeline\""]
    - path: ".gitignore"
      provides: "Ephemeral .playwright-output/ exclusion + .planning/verification/auth/ exclusion (per iter-2 §4.11)"
      contains: ["/.playwright-output/", ".planning/verification/auth/"]

  key_links:
    - from: "scripts/wave-d-smoke.ts"
      to: "playwright"
      via: "import { chromium, type Browser, type BrowserContext, type ConsoleMessage } from 'playwright'"
      pattern: "from 'playwright'"
    - from: "scripts/wave-d-smoke.ts"
      to: "src/lib/verification/_browser.ts"
      via: "import { chromiumLaunchArgs, harnessBrowserHeaders, HARNESS_AUTH_STATE_PATH } from '../src/lib/verification/_browser'"
      pattern: "from '../src/lib/verification/_browser'"
    - from: "scripts/wave-d-smoke.ts"
      to: "harness-auth-bootstrap.ts (transitively, via shared storageState)"
      via: "browser.newContext({ storageState: HARNESS_AUTH_STATE_PATH })"
      pattern: "storageState: HARNESS_AUTH_STATE_PATH"
    - from: "scripts/wave-d-smoke.ts"
      to: "/login"
      via: "warmup ping at startup per nwrp124 step 5 reversion of iter-2 §4.14"
      pattern: "/login"
    - from: "scripts/wave-d-smoke.ts"
      to: "scripts/fixtures/smoke-seed.sql"
      via: "synthetic UUIDs in route table per iter-2 §4.4.2"
      pattern: "33333333-3333-3333-3333-300000000001"
    - from: ".claude/commands/nightwork-plan-review.md"
      to: "Rule 2 enforcement"
      via: "new section 'Rule 2 FK-citation enforcement' near line 130 (after 'Criteria mandate enforcement')"
      pattern: "PLAN_MISSING_FK_CITATION"
    - from: ".claude/agents/nightwork-ai-logic-tester.md"
      to: "Supabase MCP execute_sql"
      via: "Step 4 amendment + Hard rule"
      pattern: "execute_sql"
    - from: ".claude/skills/nightwork-ai-logic-checker/SKILL.md"
      to: "Supabase MCP execute_sql"
      via: "Rule 3 runtime-execution contract mirrored per iter-2 §4.10"
      pattern: "execute_sql"
    - from: "CLAUDE.md → ### Workflow posture"
      to: "nwrp120 + nwrp121 + nwrp122 iter-2"
      via: "Rule headers reference origin"
      pattern: "Wave-A + Wave-C process gap origin"
    - from: "CLAUDE.md → ### Domain rules"
      to: "scripts/fixtures/smoke-seed.sql"
      via: "Drummond-vs-synthetic exception clause references the seed file path"
      pattern: "scripts/fixtures/smoke-seed.sql"
---

<objective>
Codify Rules 1-4 from the nwrp120 diagnosis report into CLAUDE.md (per iter-2 §4.5 → **Workflow posture** subsection, NOT Development Rules), the plan-review checklist, and the ai-logic-tester agent prompt + nightwork-ai-logic-checker SKILL.md (per iter-2 §4.10 propagation) — and ship `scripts/wave-d-smoke.ts` as the Rule 4 Playwright-smoke enforcement mechanism, plus supporting artifacts (scripts/fixtures/smoke-seed.sql + data-slot/data-pattern-slot JSX attributes). The script walks 13 unique routes against a Vercel preview URL using the existing harness-fixture@nightwork.local auth pattern + synthetic seed (per iter-2 §4.4 — no Drummond/SmartShield UUIDs), captures pass/fail JSON + per-route DIAGNOSTIC-ONLY screenshots (per iter-2 §4.3 — no baseline diff), and seeds the Wave 1.1-Full Layer 4 interactive-behavioral-testing framework per calibration-log F1+ harness extension entry. Cold-lambda warmup uses `/login` per nwrp125 step 5 reversion (no permanent /api/healthcheck route introduced for verification harness scope).

The Wave-C process gap — 8 QA reviewers passed Wave-C without anyone exercising refactored UIs at runtime — closes only when these 4 enforcement points are in place. Rules in CLAUDE.md are advisory text; structural enforcement lives in (a) plan-review BLOCKING the Rule 2 FK citation, (b) ai-logic-tester executing queries (not inferring), (c) /nightwork-qa enforcing `requires_smoke: true` plans (per iter-2 §4.1 + §4.2 — single canonical enforcement point with documented failure-mode taxonomy). This plan ships all four.

Per nwrp121 Addition 2 + nwrp122 iter-2 §4.1 lifecycle codification: wave-d-smoke is a Playwright script, NOT manual smoke. The script runs BETWEEN executor-commit and /nightwork-qa — not before either, not after both. ~2 hours of work. Persists as seed for Wave 1.1-Full Layer 4 framework.

**Screenshot strategy: DIAGNOSTIC-ONLY (no baseline diff).** Per iter-2 §4.3 — screenshots are captured for Jake's eyeball review at GATE-D halt, NOT for pixel-diff regression detection. Baseline+diff is a Wave 1.1-Full Layer 4 deliverable; deferred until palette/density/typography contracts stabilize post-CP2. Filename idempotency: include `<run-id>` (epoch milliseconds) per iter-2 §4.3.

**Synthetic fixtures replace Drummond UUIDs.** Per iter-2 §4.4 + iter-2 decision 6 — scripts/fixtures/smoke-seed.sql provides non-Drummond UUIDs in distinct UUID-prefix namespaces (org=1, users=0, jobs=2, invoices=3, activity_log=4). The `requires_drummond_data: true` skip-path from earlier draft is REMOVED (iter-2 §4.4.3) — all 13 routes run against synthetic seed. CLAUDE.md Domain rules gains an exception clause documenting that smoke scripts use synthetic UUIDs while production-facing artifacts (E2E flows, demos, canonical Ross Built truth) continue to use Drummond (iter-2 §4.4.4).

**Deferred items (out of D-4 scope):**
- TD-WD-02 — parallel BrowserContext fan-out (iter-2 §4.13); revisit Layer 4
- TD-WD-03 — empty/loading/error state coverage (iter-2 §4.15); revisit Layer 4
- TD-WD-04 — mobile viewport coverage (iter-2 §4.16); revisit Layer 4

Output:
- CLAUDE.md amended at 3 subsections: ### Workflow posture (Rules 1-4 verbatim per iter-2 §4.5), ### Architecture posture (cross-reference bullet per iter-2 §4.5), ### Domain rules (synthetic-fixtures exception per iter-2 §4.4.4)
- .claude/commands/nightwork-plan-review.md amended with Rule 2 FK-citation BLOCKING enforcement (tightened regex per iter-2 §4.17; reviewer reassignment per iter-2 §4.18)
- .claude/agents/nightwork-ai-logic-tester.md amended with Rule 3 runtime-execution mandate
- .claude/skills/nightwork-ai-logic-checker/SKILL.md amended with mirrored Rule 3 runtime-execution contract (per iter-2 §4.10)
- scripts/wave-d-smoke.ts (new, ~450 lines TypeScript)
- scripts/fixtures/smoke-seed.sql (new, ~80 lines synthetic seed)
- src/components/branding/Wordmark.tsx + Icon.tsx (JSX patches: data-slot="org-logo")
- src/components/invoice-review/InvoiceReviewView.tsx (JSX patches: data-pattern-slot attributes)
- .gitignore amended with /.playwright-output/ + .planning/verification/auth/ rules
</objective>

<execution_context>
@C:/Users/Jake/nightwork-platform/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Jake/nightwork-platform/.claude/get-shit-done/templates/summary.md
</execution_context>

<canonical_refs>
@.planning/STATE.md
@.planning/expansions/stage-f1-knowledge-graph-auth-wave-d-EXPANDED-SCOPE.md
@.planning/phases/stage-f1-knowledge-graph-auth-wave-d/ITER-2-PATCHES.md
@.planning/calibration-log.md
@.planning/templates/criteria-template.md
@CLAUDE.md

<!-- Auth pattern reuse — exact same posture as 3-layer harness -->
@scripts/harness-auth-bootstrap.ts
@src/lib/verification/_browser.ts
@src/lib/verification/auth-strategy.ts

<!-- Insertion-target precedents -->
@.claude/commands/nightwork-plan-review.md
@.claude/agents/nightwork-ai-logic-tester.md
@.claude/skills/nightwork-ai-logic-checker/SKILL.md
@package.json

<interfaces>
<!-- Reused from src/lib/verification/_browser.ts (Plan 2 of stage-1.5c-vh) -->

```typescript
// src/lib/verification/_browser.ts (already exists)
export const HARNESS_AUTH_STATE_PATH: string;  // ".planning/verification/auth/harness-auth-state.json"
export function chromiumLaunchArgs(): string[];  // ['--disable-dev-shm-usage', '--no-sandbox' (CI)]
export function harnessBrowserHeaders(): Record<string, string>;  // {x-vercel-protection-bypass, x-vercel-set-bypass-cookie, x-nightwork-verification-bypass}
```

<!-- Reused from scripts/harness-auth-bootstrap.ts (Y.1.B pattern) -->

```typescript
// scripts/harness-auth-bootstrap.ts (already exists)
// Bootstrap: signs in as harness-fixture@nightwork.local + dumps storageState
//   to HARNESS_AUTH_STATE_PATH for downstream consumers (Layer 1 + Layer 3 +
//   wave-d-smoke.ts to consume the same authenticated context).
//
// Usage: npx tsx scripts/harness-auth-bootstrap.ts --preview-url <https://...>
// Required env: HARNESS_FIXTURE_PASSWORD
//
// Wave-D scripts/wave-d-smoke.ts reuses this pattern transitively: if the
// storageState file exists (bootstrap already ran), it's reused; if it
// doesn't, the script invokes bootstrap inline as its first step.
```

<!-- New: scripts/wave-d-smoke.ts public surface (this plan exports) -->

```typescript
// scripts/wave-d-smoke.ts (will be created)

interface RouteCheck {
  route: string;                          // e.g. "/today"
  category: "issue-1" | "issue-2" | "both";
  primary_ux_selector?: string;           // Playwright selector — null = HTTP 200 + zero console errors only
  primary_ux_min_count?: number;          // For dropdowns: minimum option count
  pattern?: "document-review";            // Per iter-2 §4.9 — triggers Document Review pattern-slot check
  // Note: requires_drummond_data REMOVED per iter-2 §4.4.3 — all routes run against synthetic seed
}

interface RouteResult {
  route: string;
  status: "pass" | "fail" | "skipped_no_auth" | "error_timeout" | "error_unknown";
  http_status?: number;
  console_errors: string[];               // Filtered, redacted (sk-ant-* + Bearer * stripped)
  primary_ux_pass: boolean | null;        // null = no primary-UX check defined
  primary_ux_evidence?: string;           // e.g. "found 7 PM options"
  invariant_failures: string[];           // Per-route invariants from iter-2 §4.6-§4.9 (NavBar count, logo placement, DataGrid rows, design tokens, etc.)
  screenshot_path?: string;               // e.g. ".planning/qa-runs/wave-d/screenshots/today-1715634000000.png"
  duration_ms: number;
}

interface SmokeOutput {
  preview_url: string;
  run_id: string;                         // epoch ms (per iter-2 §4.3 filename idempotency)
  started_at: string;                     // ISO 8601
  finished_at: string;
  total_routes: number;
  passed: number;
  failed: number;
  errored: number;
  results: RouteResult[];
}

// Entry point (no exports — top-level script)
async function main(): Promise<void>;
```
</interfaces>
</canonical_refs>

<scope>

**Screenshot strategy: DIAGNOSTIC-ONLY (no baseline diff).** (Per iter-2 §4.3 — addresses B-D4-04.)

`wave-d-smoke.ts` captures one screenshot per route to `.planning/qa-runs/wave-d/screenshots/<route-slug>-<run-id>.png`. These are for Jake's eyeball review at GATE-N halt, NOT for pixel-diff regression detection.

**Why no baseline+diff:**
- Palette is unstable until Strategic Checkpoint #2 (CP2) reconciliation
- Typography is finalized but density/spacing tokens iterate weekly
- Pixel diffs against shifting baselines produce false-positive noise that erodes gate trust

**Baseline+diff is a Wave 1.1-Full Layer 4 deliverable** per calibration-log F1+ harness extension entry. Defer until palette/density/typography contracts stabilize post-CP2.

**Filename idempotency (H-D4-08):** include `<run-id>` (epoch milliseconds) in filename to preserve per-run history. Don't overwrite. Last 10 runs retained; older runs gitignored.

**Deferred items (tracked but NOT in D-4 scope):**

- **TD-WD-02 — Parallel BrowserContext fan-out** (per iter-2 §4.13). Deferred to TD-WD-02; out of Wave-D scope. Revisit Layer 4. Rationale: Wave-D is corrective; smoke runs are infrequent (per phase, not per commit). ~7.5min walltime acceptable for now. Parallel fan-out via 3-4× BrowserContext adds complexity (cookie-isolation, retry, sequencing) that isn't load-bearing now.
- **TD-WD-03 — Empty/loading/error state coverage** (per iter-2 §4.15). Deferred to TD-WD-03; out of Wave-D scope. Revisit Layer 4.
- **TD-WD-04 — Mobile viewport coverage** (per iter-2 §4.16). Deferred to TD-WD-04; out of Wave-D scope. Revisit Layer 4.

</scope>

<criteria>
mechanical:
  - "npm run build clean (0 warnings, 0 errors)"
  - "npx tsc --noEmit returns 0 errors in scripts/wave-d-smoke.ts"
  - "grep -n 'Schema verification ≠ runtime verification' CLAUDE.md returns >= 1 match (Rule 1 header per iter-2 §4.5)"
  - "grep -n 'PostgREST FK citation requirement' CLAUDE.md returns >= 1 match (Rule 2 header per iter-2 §4.5)"
  - "grep -n 'ai-logic-tester executes representative queries' CLAUDE.md returns >= 1 match (Rule 3 header per iter-2 §4.5)"
  - "grep -n 'Playwright smoke pre-QA for UI-touching plans' CLAUDE.md returns >= 1 match (Rule 4 header per iter-2 §4.5)"
  - "grep -n 'smoke scripts + verification harness fixtures use synthetic' CLAUDE.md returns >= 1 match (Domain rules exception clause per iter-2 §4.4.4 + §6.1)"
  - "grep -n 'PostgREST FK citation rule' CLAUDE.md returns >= 1 match (Architecture posture cross-reference per iter-2 §4.5)"
  - "grep -n 'PLAN_MISSING_FK_CITATION' .claude/commands/nightwork-plan-review.md returns >= 1 match (Rule 2 enforcement section)"
  - "grep -c 'architect\\|database-reviewer' .claude/commands/nightwork-plan-review.md returns >= 2 in the Rule 2 enforcement block (per iter-2 §4.18 reviewer reassignment)"
  - "grep -n 'execute_sql' .claude/agents/nightwork-ai-logic-tester.md returns >= 1 match (Rule 3 mandate)"
  - "grep -n 'Inferred-but-unverified claims are explicitly disallowed' .claude/agents/nightwork-ai-logic-tester.md returns >= 1 match"
  - "grep -n 'execute_sql' .claude/skills/nightwork-ai-logic-checker/SKILL.md returns >= 1 match (per iter-2 §4.10 SKILL.md propagation)"
  - "grep -n 'Inferred-but-unverified claims are explicitly disallowed' .claude/skills/nightwork-ai-logic-checker/SKILL.md returns >= 1 match"
  - "grep -n '/.playwright-output/' .gitignore returns >= 1 match"
  - "grep -n '.planning/verification/auth/' .gitignore returns >= 1 match (per iter-2 §4.11)"
  - "test -f scripts/fixtures/smoke-seed.sql && echo PASS (per iter-2 §4.4.1 + §6.2)"
  - "grep -c '11111111-1111-1111-1111-111111111111\\|22222222-2222-2222-2222-2\\|33333333-3333-3333-3333-3\\|44444444-4444-4444-4444-4' scripts/fixtures/smoke-seed.sql returns >= 4 (UUID convention namespaces per iter-2 §4.4.1)"
  - "grep -c 'ON CONFLICT' scripts/fixtures/smoke-seed.sql returns >= 1 (idempotency per iter-2 §4.4.1)"
  - "grep -c 'data-slot=\"org-logo\"' src/components/branding/Wordmark.tsx returns >= 1 (per iter-2 §4.6 + §6.4)"
  - "grep -c 'data-slot=\"org-logo\"' src/components/branding/Icon.tsx returns >= 1"
  - "grep -c 'data-pattern-slot=\"file-preview\"\\|data-pattern-slot=\"right-rail\"\\|data-pattern-slot=\"audit-timeline\"' src/components/invoice-review/InvoiceReviewView.tsx returns >= 3 (per iter-2 §4.9 + §6.4)"
  - "All hooks silent on every commit (Drummond grep gate via .githooks/pre-commit; nightwork-post-edit drift gate)"
  - "Privacy gate clean across new files (scripts/wave-d-smoke.ts + scripts/fixtures/smoke-seed.sql contain NO sk-ant-* or Bearer * literals, no service-role-key references, no email PII outside the documented FIXTURE_USER_EMAIL constant + synthetic 'smoke-pm-*@nightwork.local' display strings)"
dom:
  - "N/A — this plan ships documentation + script + small JSX patches (data-slot/data-pattern-slot attributes only). No new UI surfaces rendered. Runtime UI verification happens AT script-execution time against Vercel preview, recorded in wave-d-smoke.ts JSON output (a Wave-D ship artifact at .planning/qa-runs/wave-d/smoke-results.json per iter-2 §4.1 — NOT a Plan D-4 criterion)."
visual:
  - "N/A — no new UI surfaces rendered by this plan. The Playwright script captures DIAGNOSTIC-ONLY screenshots per iter-2 §4.3, but those are consumed at GATE-D halt, not Plan D-4 acceptance evidence."
behavioral:
  - "When VERCEL_PREVIEW_URL + HARNESS_FIXTURE_PASSWORD env vars are set + scripts/wave-d-smoke.ts is invoked via `npx tsx scripts/wave-d-smoke.ts --preview-url $VERCEL_PREVIEW_URL`, the script exits with code 0 if all routes pass + code 1 if any route fails"
  - "scripts/wave-d-smoke.ts navigates exactly 13 unique routes per the documented route table in plan body (Task 4); the JSON output's `total_routes` field equals 13"
  - "For each route, the script captures HTTP status + console errors + primary-UX evidence + invariant_failures[] + screenshot path; missing any field for any route is a non-zero exit"
  - "When HARNESS_FIXTURE_PASSWORD is unset, the script exits with code 2 + actionable error message naming the env var (mirrors harness-auth-bootstrap.ts:75-79 pattern)"
  - "When VERCEL_PREVIEW_URL is unset OR invalid (regex `^https://[A-Za-z0-9.-]+`), the script exits with code 2 + actionable error message"
  - "When the storageState file does NOT exist at HARNESS_AUTH_STATE_PATH, the script invokes scripts/harness-auth-bootstrap.ts inline as its first step (transparent bootstrap; reuses the existing chicken-and-egg pattern)"
  - "When VERCEL_AUTOMATION_BYPASS_SECRET or VERIFICATION_BYPASS_SECRET is unset, the script emits a loud WARN at startup (per iter-2 §4.12) but does NOT abort — Jake may intentionally run without bypass for diagnostic"
  - "Pre-route loop, the script attempts a warmup ping to `${previewUrl}/login` per nwrp124 step 5 reversion of iter-2 §4.14 with a 30s timeout; on failure emits WARN and continues (does not abort)"
  - "Console-error redaction post-processes captured stderr via regex stripping `sk-ant-[A-Za-z0-9_-]+` + `Bearer [A-Za-z0-9_.-]+` substrings before they're written to JSON (mirrors Layer 3 vision-client.ts WARNING-1 amendment pattern)"
  - "Per-route invariant — single NavBar (per iter-2 §4.8 global promotion): EVERY route asserts exactly 1 `header.app-shell-nav, header[data-component=\"nav-bar\"]`; sidebar count must be ≤1 (`aside.app-shell-sidebar, aside[data-component=\"job-sidebar\"]`); failures recorded in `invariant_failures[]`"
  - "Per-route invariant — logo placement (per iter-2 §4.6): EVERY route asserts `header [data-slot=\"org-logo\"]` is present AND bounding-box `x >= viewportWidth * 0.5` (right-half of viewport); failures recorded in `invariant_failures[]`"
  - "Per-route invariant — DataGrid + design tokens + display-name (per iter-2 §4.7, list routes only): rows >= 1 OR `[data-state=\"empty\"]` indicator present; PM dropdown options regex-checked for UUID-leak (`/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/`); NavBar `background-color` resolves to non-transparent value"
  - "Per-route invariant — Document Review pattern (per iter-2 §4.9, document-review pattern routes only): `[data-pattern-slot=\"file-preview\"]` + `[data-pattern-slot=\"right-rail\"]` + `[data-pattern-slot=\"audit-timeline\"]` all present"
  - "Plan-review iter-1 on a hypothetical follow-up plan that includes `.select(\"foo:bar(...)\")` without an FK citation MUST return verdict=REVISE-PLAN with finding code PLAN_MISSING_FK_CITATION (Rule 2 enforcement). Per iter-2 §4.17 the grep also scans files_modified .tsx/.ts source files (not just PLAN body)."
  - "ai-logic-tester invocation on a hypothetical follow-up phase containing a PostgREST embedding-hint claim MUST include at least one Supabase MCP execute_sql call (or REST equivalent) targeting `information_schema.referential_constraints` or `pg_constraint` — code-reading alone fails the Rule 3 affirmative-evidence bar. Per iter-2 §4.10 the SKILL.md mirrors this contract."
  - "scripts/fixtures/smoke-seed.sql is idempotent: running twice via `psql -f scripts/fixtures/smoke-seed.sql` produces zero errors and zero net row changes on the second run (ON CONFLICT DO NOTHING)"
  - "wave-d-smoke.ts warmup ping to `/login` returns HTTP 200 (per nwrp124 step 5 reversion + AC-D4-13)"
semantic:
  - "N/A — no UI surfaces visible on rendered web pages within Plan D-4's deliverables; semantic verification properly lives in the wave-d-smoke.ts runtime output evaluated at Wave-D /nightwork-qa enforcement gate (per iter-2 §4.2), not in this plan's static checks"
</criteria>

<tasks>

<task type="auto">
  <name>Task 1: Insert Rules 1-4 + cross-reference + Domain exception into CLAUDE.md (3 subsections)</name>
  <files>CLAUDE.md</files>
  <action>
Per iter-2 §4.5 (decision 7), Rules 1-4 RELOCATED from the original "## Development Rules" target to the "### Workflow posture" subsection (within "## Nightwork standing rules", current location lines 615-621 in CLAUDE.md). Additionally per iter-2 §4.5: one cross-reference bullet added under "### Architecture posture" (lines 576-587). Additionally per iter-2 §4.4.4 (§6.1 cross-plan): one exception clause added under "### Domain rules" (lines 609-613).

This task performs 3 surgical edits to CLAUDE.md.

---

**EDIT 1 — Insert Rules 1-4 into "### Workflow posture" subsection (per iter-2 §4.5).**

Target location: end of `### Workflow posture` subsection (within "## Nightwork standing rules") — after the `/nightwork-propagate` bullet, before the next subsection break (`## Deployment` at line 623).

Insert the 4 bullets verbatim per iter-2 §4.5:

```markdown
- **Rule 1 — Schema verification ≠ runtime verification.** Migrations passing
  + REST-API queries returning expected JSON are NECESSARY but NOT SUFFICIENT
  evidence that a UI-touching plan ships correctly. Plans that touch JSX,
  components, layouts, or PostgREST hints MUST be verified with a runtime
  check on a deployed surface (Vercel preview minimum) before /nightwork-qa
  can pass. Wave-A + Wave-C process gap origin: schema-only verification gave
  false PASSes on 3 user-facing bugs.
- **Rule 2 — PostgREST FK citation requirement on plans that touch embedded
  selects.** Any plan adding/modifying a `select=...:embed(...)` PostgREST hint
  MUST cite the specific FK constraint name + table + column that resolves the
  hint. Plan-review iter-1 BLOCKS without this citation. ai-logic-tester MUST
  execute a representative query to verify the FK resolves at runtime (NOT
  infer from schema metadata).
- **Rule 3 — ai-logic-tester executes representative queries.** For any
  PostgREST relationship, RLS policy, or schema-resolution claim in a plan,
  ai-logic-tester (or equivalent reviewer) MUST execute a representative
  SQL/REST query against current schema. Inferring correctness from migration
  text alone is the Wave-C anti-pattern that shipped 3 bugs. This rule applies
  to plan-review iter-1; SKILL.md propagation per Plan D-4 Task 3.
- **Rule 4 — Playwright smoke pre-QA for UI-touching plans.** (See full Rule 4
  codification in Plan D-4 Task 1 — lifecycle, enforcer, failure modes.
  Summary: plans with `requires_smoke: true` MUST have a passing
  `smoke-results.json` artifact before /nightwork-qa can return PASS.)
- **Rule 5 — files_modified intersection check before parallel dispatch.**
  Plans declaring `parallel_execute_ok: true` MUST be verified via mechanical
  files_modified intersection grep BEFORE dispatch. Plan-author logical
  reasoning ("migration vs UI is independent") is necessary but NOT sufficient —
  any non-empty intersection of files_modified between plans dispatched in
  parallel = BLOCKING. The check is: grep files_modified entries across all
  parallel-claimed plans in the same wave; any shared path forces sequential
  dispatch OR worktree isolation with explicit merge protocol. (Origin: nwrp127
  Wave-D D-1 + D-2 surfaced file-level overlap at pre-dispatch grep that the
  plans' "parallel_execute_ok: true" annotations missed; enforcement structural
  via plan-review iter-1 mechanical check — see Plan D-4 Task 2 Rule 5
  enforcement section.)
- **Rule 6 — precursor hook scan before plan-execute dispatch.**
  For every plan declaring `files_modified` entries, plan-review iter-1 MUST
  run the post-edit hook (or equivalent design-token / typecheck scan using
  the hook's COMPLETE forbidden-pattern set with word-boundary anchors —
  approximations are NOT acceptable per nwrp131) against current state of
  each listed file BEFORE plan-execute dispatch. Pre-existing violations in
  target files = surface to plan-author for precursor handling (either
  include precursor cleanup in plan scope with explicit separation in the
  commit graph, OR author a precursor plan that ships first). Missing check
  = WARNING (not BLOCKING since it doesn't always apply — schema-only /
  doc-only plans may not touch hook-scanned surfaces). (Origin: nwrp130
  Wave-D D-2 executor halted at Task 2 on a pre-existing `bg-white` violation
  in `invoices/page.tsx:822` that predated D-2 by 31 days; precursor commit
  e9fbbd3 cleaned it. nwrp131 refinement: Rule 6 pre-flight using narrower
  `bg-white` pattern missed `hover:text-white` on `aging-report/page.tsx:27`
  because the word-boundary `\b` anchor in the hook's authoritative regex
  was dropped — precursor commit fd70122 cleaned it. Enforcement structural
  via plan-review iter-1 mechanical scan using complete hook regex set — see
  Plan D-4 Task 2 Rule 6 enforcement section.)
```

The full Rule 4 codification (per iter-2 §4.1 + §4.2) is the canonical reference for the lifecycle gate + enforcer + failure-mode taxonomy. The text below is the authoritative full text of Rule 4 (per iter-2 §4.1) that the bullet above abbreviates:

> **Rule 4 — Playwright smoke pre-QA for UI-touching plans.**
>
> For any plan whose front-matter declares `requires_smoke: true` (UI-touching: adds/modifies/removes JSX, components, layouts, or PostgREST hints), the executor's commit-and-push sequence must trigger a Playwright smoke run AFTER the Vercel preview deploys.
>
> **Lifecycle sequence (single canonical chain):**
>
> 1. /gsd-execute-phase completes all tasks
> 2. Executor commits + pushes to phase branch
> 3. Vercel preview deployment fires (auto on push)
> 4. Executor (or CI hook if wired) runs `npx tsx scripts/wave-d-smoke.ts --preview-url <vercel-preview-url>` against the deployed preview
> 5. Smoke results land at `.planning/qa-runs/<phase>/smoke-results.json`
> 6. Screenshots land at `.planning/qa-runs/<phase>/screenshots/`
> 7. /nightwork-qa runs WITH smoke artifacts as input (per Rule 4's named enforcer below)
> 8. GATE-N halt for Jake review
>
> **Rule:** smoke runs BETWEEN executor-commit and /nightwork-qa, not before either, not after both. /nightwork-qa is the gate.
>
> **Why this position:** running smoke before commit means against localhost which diverges from production runtime (Wave-C's exact gap). Running smoke after QA means QA can't act on smoke results — the gate is post-hoc theatre. Position between them is the only way smoke gates the QA verdict.
>
> **Manual smoke is fallback ONLY when Playwright infra is not yet in place for the surface.** This will become rarer over time; for any surface that lives in the smoke script's route registry, automated > manual.
>
> **Enforcer:** /nightwork-qa is the single canonical enforcement point.
>
> **Plan front-matter contract:**
>
> Every plan declares `requires_smoke: true | false`:
> - UI-touching plans (adds/modifies/removes JSX, components, layouts, PostgREST hints, routing) → MUST declare `requires_smoke: true`
> - Schema-only plans (migration text without app-layer changes), doc-only plans, config-only plans → MAY declare `requires_smoke: false`
> - Plan-author defaults to `requires_smoke: true` when ambiguous
>
> **/nightwork-qa enforcement logic:**
>
> ```python
> # Pseudocode for /nightwork-qa orchestrator
> for plan in wave.plans:
>     if plan.requires_smoke is True:
>         smoke_path = f".planning/qa-runs/{phase}/smoke-results.json"
>         if not exists(smoke_path):
>             return Verdict.CRITICAL("smoke artifact missing: " + plan.id)
>         smoke = json.load(smoke_path)
>         if smoke.status == "FAIL":
>             failed_routes = [r.url for r in smoke.routes if r.status == "FAIL"]
>             return Verdict.CRITICAL(
>                 f"smoke FAIL on routes {failed_routes}; ship blocked: " + plan.id
>             )
>     # if requires_smoke is False: skip smoke check entirely
> ```
>
> **Single point of enforcement** — do NOT spread across executor-preflight + /gsd-ship + custodian. One named gate, one verdict.
>
> **Failure-mode taxonomy:**
> - `requires_smoke=true` AND artifact missing → CRITICAL "smoke not run"
> - `requires_smoke=true` AND artifact status=FAIL → CRITICAL "smoke FAIL"
> - `requires_smoke=true` AND artifact status=PASS → smoke-check PASS (proceeds to other QA reviewers)
> - `requires_smoke=false` → smoke-check N/A (proceeds to other QA reviewers)
> - Plan-author forgot to declare → /nightwork-qa returns WARNING "plan missing requires_smoke flag; assuming true"; if no artifact → CRITICAL as above

Executor inserts the 4-bullet abbreviated form into CLAUDE.md (mirroring iter-2 §4.5 text). The full Rule 4 codification above is captured here in the PLAN body as authoritative source; it can ALSO be added to a separate `.planning/architecture/RULE-4-LIFECYCLE.md` file at executor discretion if desired (NOT required for AC-pass).

Edit-tool guidance for EDIT 1:
1. Read CLAUDE.md lines 615-622 to confirm the existing "### Workflow posture" subsection ends at the `/nightwork-propagate` bullet (line 621).
2. Use Edit with `old_string` = the last existing bullet text + the following blank line transitioning to `## Deployment`, and `new_string` = the same anchor + the 4 Rule bullets inserted before the blank line.

---

**EDIT 2 — Insert PostgREST FK citation cross-reference bullet into "### Architecture posture" subsection (per iter-2 §4.5).**

Target location: end of `### Architecture posture` subsection (within "## Nightwork standing rules", lines 576-587). After the `Data portability is first-class` bullet (line 587), before the next subsection (`### Code behavior` at line 589).

Insert one bullet verbatim per iter-2 §4.5:

```markdown
- **PostgREST FK citation rule** — when adding embedded-select hints, cite the
  FK constraint by name in the plan. See Workflow posture Rule 2 for full
  language. Migration 00098 (Wave-D) is the canonical example.
```

Edit-tool guidance for EDIT 2:
1. Read CLAUDE.md lines 585-590 to confirm the anchor (the `Data portability is first-class` bullet) matches exactly.
2. Use Edit with `old_string` ending at the end of the `Data portability` bullet + blank line + `### Code behavior` header, and `new_string` = the same anchor + the new bullet inserted before the blank line.

---

**EDIT 3 — Insert Drummond-vs-synthetic-fixtures exception clause into "### Domain rules" subsection (per iter-2 §4.4.4 + §6.1).**

Target location: end of `### Domain rules` subsection (within "## Nightwork standing rules", lines 609-613). After the `Draw requests link to punchlist` bullet (line 613), before the next subsection (`### Workflow posture` at line 615).

Insert one bullet verbatim per iter-2 §4.4.4:

```markdown
- **Drummond is the reference job for production-facing artifacts ONLY** — E2E
  flows (`/nightwork-end-to-end-test`), demos, seed data shown to Jake/Andrew,
  and Ross Built canonical truth. **Smoke scripts + verification harness
  fixtures + Playwright tests use synthetic seeded UUIDs** to avoid embedding
  real client data in repo-checked-in scripts. Synthetic seed lives at
  `scripts/fixtures/smoke-seed.sql` (Wave-D Plan D-4 deliverable). When a future
  smoke script needs new fixture data, extend `smoke-seed.sql`; do NOT hardcode
  Drummond/SmartShield/real-vendor UUIDs in scripts/.
```

Edit-tool guidance for EDIT 3:
1. Read CLAUDE.md lines 611-616 to confirm the anchor (the `Draw requests link to punchlist` bullet) matches exactly.
2. Use Edit with `old_string` ending at the end of the `Draw requests` bullet + blank line + `### Workflow posture` header, and `new_string` = the same anchor + the new bullet inserted before the blank line.

---

**EDIT 4 — Add commit-mechanism transparency clarification under existing `--no-verify` rule in Development Rules (per nwrp133).**

Target location: the `--no-verify` rule in Development Rules section (CLAUDE.md line ~537, ending with "Both root causes addressed; going forward: hook failures = halt."). Insert a new paragraph immediately after the existing rule body, before the blank line that precedes `## Testing Rule (MANDATORY)`.

Insert this clarification paragraph verbatim:

```markdown
  **Commit mechanism transparency (per nwrp133 NEAR-MISS).** Compound
  `git add ... && git commit` form is NOT equivalent to `--no-verify`
  flag. The compound form is by hook design — `.claude/hooks/nightwork-
  pre-commit.sh:28-30` checks for the regex `^(git[[:space:]]+commit)`,
  which doesn't match commands starting with `git add`. Hook design note
  at lines 63-65 acknowledges this and accepts terminal commits as the
  documented uncovered path; compound form has identical coverage
  characteristics. Compound form does NOT require Jake authorization.
  The `--no-verify` flag explicitly bypasses pre-commit gates and DOES
  require Jake authorization per the rule above. Executor MUST distinguish
  these in commit body — if compound form is used, cite "compound form per
  hook line 28-30 regex"; if `--no-verify` is used, cite explicit Jake
  authorization OR revert before push (local-only `--no-verify` caught
  pre-push is acceptable IF reverted via `git reset --soft HEAD~1` before
  push; reaching origin/main is the violation). Conflating the two in
  commit-body citations is a discipline concern even when the diff is
  identical. (Origin: Wave-D D-1 first-commit attempt at SHA `8af4aa6`
  used `--no-verify` while citing compound-form precedent — caught
  pre-push by executor self-check, reset + re-authored at `7b26ddd` via
  correct compound form. Origin/main history clean.)
```

Edit-tool guidance for EDIT 4:
1. Read CLAUDE.md lines 537-547 to confirm the anchor (the existing `--no-verify` rule body, ending with "going forward: hook failures = halt.") matches exactly.
2. Use Edit with `old_string` = the last sentence of the existing rule ("Both root causes addressed; going forward: hook failures = halt.") and `new_string` = same sentence + blank line + the new clarification paragraph above.

---

After all 4 edits, run the 7+1 grep mechanical checks (from criteria) to confirm:
- 4 Rule headers in CLAUDE.md (`Schema verification ≠ runtime verification`, `PostgREST FK citation requirement`, `ai-logic-tester executes representative queries`, `Playwright smoke pre-QA for UI-touching plans`)
- 1 Architecture posture cross-reference (`PostgREST FK citation rule`)
- 1 Domain rules exception clause (`smoke scripts + verification harness fixtures use synthetic`)
- 1 Development Rules clarification clause (`Commit mechanism transparency` — per EDIT 4 / nwrp133)
- 1 cumulative count check (above >= 7 lines added)

NOTE on previous draft: the prior version of this Task 1 targeted the "## Development Rules" section (line 535) with shorter Rule headers (`Schema verification ≠ runtime verification` / `PostgREST relationship hint validation` / `ai-logic-tester must execute, not infer` / `Playwright smoke pre-GATE-N`). Per iter-2 §4.5 (decision 7) that target is RELOCATED to Workflow posture and the Rule headers are REPHRASED. The new headers are the binding contract — older grep patterns in any sibling artifact must be updated to match. (EDIT 4 per nwrp133 is the only Development Rules section edit that remains in this task — the commit-mechanism clarification clause under the existing `--no-verify` rule.)
  </action>
  <verify>
    <automated>
      grep -c 'Schema verification ≠ runtime verification\|PostgREST FK citation requirement\|ai-logic-tester executes representative queries\|Playwright smoke pre-QA for UI-touching plans' CLAUDE.md
      # Expected: 4
      grep -c 'PostgREST FK citation rule' CLAUDE.md
      # Expected: >= 1 (Architecture posture cross-reference)
      grep -c 'smoke scripts + verification harness fixtures use synthetic' CLAUDE.md
      # Expected: 1 (Domain rules exception clause)
      grep -c 'Commit mechanism transparency' CLAUDE.md
      # Expected: >= 1 (Development Rules nwrp133 clarification clause)
    </automated>
  </verify>
  <done>
    CLAUDE.md "### Workflow posture" subsection contains Rules 1-6 as ordered bullets appended at the end (after the /nightwork-propagate bullet) — Rules 1-4 per iter-2 §4.5; Rule 5 per nwrp127; Rule 6 per nwrp130 (+ nwrp131 regex precision refinement). CLAUDE.md "### Architecture posture" subsection contains a PostgREST FK citation cross-reference bullet. CLAUDE.md "### Domain rules" subsection contains a Drummond-vs-synthetic-fixtures exception bullet. CLAUDE.md "## Development Rules" section's existing `--no-verify` rule gains a "Commit mechanism transparency" clarification paragraph per nwrp133 (compound form vs --no-verify distinction). All 6 Rule headers + 2 cross-references + 1 exception clause + 1 commit-mechanism clarification are grep-matchable per mechanical criteria. No other section of CLAUDE.md is modified.
  </done>
</task>

<task type="auto">
  <name>Task 2: Amend nightwork-plan-review.md with Rule 2 FK-citation BLOCKING enforcement (regex tightening + reviewer reassignment per iter-2 §4.17 + §4.18)</name>
  <files>.claude/commands/nightwork-plan-review.md</files>
  <action>
Insert a new section "## Rule 2 FK-citation enforcement (per nwrp120 + Wave-D D-4)" into .claude/commands/nightwork-plan-review.md immediately AFTER the existing "## Criteria mandate enforcement (per stage-1.5c-verification-harness D-17/D-18)" section (currently ends around line 162). Mirror that section's structure as the precedent — it's the canonical shape for "PLAN.md must include X or plan-review halts."

Per iter-2 §4.17 the regex is TIGHTENED to include a companion scan over files_modified .tsx/.ts source files (not just PLAN body). Per iter-2 §4.18 the primary reviewer is REASSIGNED: `architect` is primary (schema-correctness lens); `database-reviewer` co-primary (Postgres + PostgREST mechanics); `nightwork-multi-tenant-architect` secondary (only when embedding crosses tenant boundaries).

Section content:

```markdown
## Rule 2 FK-citation enforcement (per nwrp120 + Wave-D D-4)

Per CLAUDE.md Workflow posture → Rule 2: every PostgREST relationship-hint `.select("...:...(...)")` pattern in a plan's code diff must cite the enabling FK constraint (migration filename + line number) OR refactor to a two-query pattern. Wave-C surfaced 9 sites using `profiles:user_id (id, full_name)` against org_members where no FK existed on org_members.user_id → profiles.id; the embedding hint was unresolvable at runtime even though the code read fine.

### Check (tightened per iter-2 §4.17)

For each PLAN.md in the phase:
1. **Mechanical grep over PLAN body:** `rg -n '\.select\("[^"]+:[^"]+\(' PLAN-FILE.md` — extract every PostgREST embedding-hint pattern in the plan's documented code changes.
2. **Companion grep over files_modified source files:** extract files_modified .tsx/.ts paths from frontmatter (awk + grep), then for each `f`:
   ```bash
   for f in $(awk '/^files_modified:/,/^[a-z]/' PLAN-FILE.md | grep -oP '"\K[^"]+\.tsx?'); do
     rg -n '\.select\("[^"]+:[^"]+\(' "$f"
   done
   ```
   Catches code-only PostgREST hints that the plan author forgot to document in the PLAN body itself.
3. For each match (PLAN body OR source file), cross-reference the plan's `files_modified` migrations OR `files_referenced` schema-anchor lines for a citation in the form `<migration-filename>:<line-number>` (e.g. `00098_add_org_members_profiles_fk.sql:42`).
4. If a citation is present, verify the cited FK actually exists in current schema via `pg_constraint` query (executor responsibility; plan-review surfaces the requirement, doesn't enforce it directly).
5. If citation absent OR refactor-to-two-query justification absent, flag as BLOCKING.

### Verdict integration

- Missing FK citation for any embedding-hint pattern → BLOCKING finding (`PLAN_MISSING_FK_CITATION`)
- Citation present but plan-author asserts FK is intentionally absent → REVISE finding with rationale prompt (`PLAN_FK_DELIBERATELY_ABSENT`)
- All embedding hints have valid citations → no finding

### Default reviewer disposition (per iter-2 §4.18 reassignment)

`architect` is the **primary** reviewer for this check (schema-correctness lens — the architect agent is responsible for FK-design decisions per the project's architectural posture). `database-reviewer` is **co-primary** (Postgres + PostgREST mechanics lens — confirms the cited FK resolves the embedding at the SQL/PostgREST layer). `nightwork-multi-tenant-architect` is **secondary** (only when the embedding crosses tenant boundaries — e.g. embedding spans org_members across orgs, which would be a separate RLS concern). `nightwork-ai-logic-tester` is the post-execute counterpart — per Rule 3, the logic-tester executes a representative PostgREST query at /nightwork-qa time to confirm runtime resolution; plan-review surfaces the citation requirement at plan time.

NOTE on previous draft: the prior version assigned `nightwork-multi-tenant-architect` as primary. Per iter-2 §4.18 (decision 4 follow-up): reassigned to `architect` + `database-reviewer` co-primary.

### Friction-tax watchpoint

If plan-review iter-1 finds itself flagging >30% of new PLAN files as `PLAN_MISSING_FK_CITATION`, the citation pattern is failing — either (a) the template needs better defaults (extend `.planning/templates/criteria-template.md` with an FK-citation example), or (b) the embedding-hint usage pattern is too common to require per-hint citation (escalate to D-amendment).

## Rule 5 files_modified intersection enforcement (per nwrp127 + Wave-D D-1/D-2 surface)

Per CLAUDE.md Workflow posture → Rule 5: every plan declaring `parallel_execute_ok: true` in front-matter must pass a mechanical files_modified intersection check against all other plans in the same wave that ALSO declare parallel-execute-ok. Plan-author logical reasoning about independence ("migration vs UI is independent") is necessary but NOT sufficient — file-level overlap forces sequential dispatch OR worktree isolation. Origin: nwrp127 Wave-D D-1 + D-2 both claimed parallel_execute_ok but shared 2 files (invoices/page.tsx, invoices/queue/page.tsx); surface caught at pre-dispatch grep, not at plan-author or plan-review time.

### Check

For each wave (or batch of plans dispatched in parallel):
1. Enumerate all PLAN files declaring `parallel_execute_ok: true` in front-matter (mechanical: `rg -l 'parallel_execute_ok:\s*true' .planning/phases/<phase>/*.md`).
2. For each pair of parallel-claimed plans (P_i, P_j), extract `files_modified:` lists via:
   ```bash
   awk '/^files_modified:/,/^[a-z_]+:/' PLAN-FILE.md | grep -oP '^\s+-\s+\K\S+'
   ```
3. Compute set intersection: `comm -12 <(sort <files_i>) <(sort <files_j>)`. Any non-empty intersection = BLOCKING.
4. Flag finding code: `PLAN_PARALLEL_FILES_OVERLAP` with the offending plan pair + overlapping path list.

### Verdict integration

- Non-empty files_modified intersection between any parallel-claimed plan pair → BLOCKING finding (`PLAN_PARALLEL_FILES_OVERLAP`)
- All parallel-claimed plans have disjoint files_modified → no finding
- Single plan claims parallel_execute_ok with no sibling parallel claim in the wave → no finding (vacuous)

### Default reviewer disposition

`architect` is the **primary** reviewer for this check (cross-plan structural lens). `planner` is **co-primary** (the planner agent authored the plans and is responsible for parallel-execute claims). No secondary reviewer needed — the check is mechanical (set intersection on file paths).

### Remediation paths

When a `PLAN_PARALLEL_FILES_OVERLAP` finding fires, the plan-author has three options:
1. **Flip `parallel_execute_ok: false`** on one or both plans; document the file overlap as rationale. Sequential dispatch. (Default; lowest risk.)
2. **Split the overlapping plan into two plans** whose files_modified are disjoint (e.g. extract the shared-file portion to a precursor plan that ships first).
3. **Worktree isolation** with explicit merge protocol; document the merge sequence in plan-author commentary. (Highest risk; reserved for waves where wall-clock matters.)

### Friction-tax watchpoint

If plan-review iter-1 finds itself flagging >20% of waves with `PLAN_PARALLEL_FILES_OVERLAP`, the parallel_execute_ok claim is being over-asserted by plan-authors — escalate to template-level guidance (extend `.planning/templates/plan-template.md` with a "before declaring parallel_execute_ok: true, list files_modified across all parallel candidates and confirm disjoint" pre-check) OR to D-amendment that defaults parallel_execute_ok to false unless explicitly justified.

## Rule 6 precursor hook scan enforcement (per nwrp130 + Wave-D D-2 surface)

Per CLAUDE.md Workflow posture → Rule 6: every plan declaring `files_modified` entries must pass a pre-execute hook scan against each target file's current state. Pre-existing violations (design-token, typecheck, lint) surface during plan-review iter-1 rather than at executor's first edit attempt. Origin: nwrp130 Wave-D D-2 executor halted at Task 2 on a pre-existing `bg-white` violation in `invoices/page.tsx:822` that predated D-2 by 31 days; the post-edit hook's whole-file scan posture blocked unrelated AppShell-strip work until the precursor was cleaned. A pre-execute hook scan at plan-review time surfaces the same finding before dispatch, allowing precursor handling without an executor halt.

### Check

For each PLAN.md in the phase:
1. **Extract files_modified paths** via:
   ```bash
   awk '/^files_modified:/,/^[a-z_]+:/' PLAN-FILE.md | grep -oP '^\s+-\s+\K\S+'
   ```
2. **Filter to hook-scanned surfaces** (the post-edit hook scans `.ts`/`.tsx`/`.css` per `.claude/hooks/nightwork-post-edit.sh`):
   ```bash
   grep -E '\.(ts|tsx|css)$'
   ```
3. **For each filtered path**, run the post-edit hook against current file state:
   ```bash
   for f in <filtered-paths>; do
     CLAUDE_TOOL_OUTPUT='{"filePath":"'$f'"}' .claude/hooks/nightwork-post-edit.sh
   done
   ```
   OR equivalent grep against the hook's complete forbidden-pattern set (per nwrp131 regex-precision refinement):
   ```bash
   # HEX_HITS — 6-digit hex literals outside globals.css / tailwind.config / comments
   grep -nE "#[0-9a-fA-F]{6}\b" $f | grep -vE "(globals\.css|tailwind\.config|//|/\*)"
   # NAMED_HITS — Tailwind named colors with scales
   grep -nE "\b(bg|text|border|ring|fill|stroke|from|to|via|placeholder|caret|accent|outline|divide)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)\b" $f
   # PURE_HITS — pure white/black (catches hover:text-white, focus:bg-black, etc. — word-boundary regex)
   grep -nE "\b(bg|text|border)-(white|black)\b" $f
   # LEGACY_HITS — removed namespaces
   grep -nE "\b(bg|text|border)-(cream|teal-(?!.*nw)|brass|brand|status|nightwork)-" $f
   # ORG_ID_HITS — hardcoded ORG_ID const/let/var
   grep -nE "(const|let|var)\s+ORG_ID\s*=" $f
   # ROUNDED — oversized corners on non-avatar/dot
   grep -nE "\brounded(-(t|r|b|l|tl|tr|bl|br|ts|te|bs|be|s|e))?-(lg|xl|2xl|3xl|full)\b" $f
   # CB4 / CB2 — bouncy easing
   grep -nE "cubic-bezier\([^)]*,[^)]*,[^)]*,\s*[1-9]\.[0-9]" $f
   grep -nE "cubic-bezier\([^,]+,\s*[1-9]\.[0-9]" $f
   # SHADOW — dark glow
   grep -nE "box-shadow:\s*[^;]*\s+(2[1-9]|[3-9][0-9]|[1-9][0-9]{2,})px\s+[1-9][0-9]*px" $f
   # PURPLE — purple/pink HSL hue
   grep -nE "hsl\(\s*(2[7-9][0-9]|3[01][0-9]|320)\b" $f
   ```
   Per nwrp131: narrower approximations of these patterns (e.g. omitting the word-boundary anchors, missing the `hover:` / `focus:` prefix coverage that the `\b` anchors handle) are NOT acceptable substitutes — they produce false negatives that surface as executor halts. nwrp130 + nwrp131 origin: D-2's 2nd dispatch attempt halted on `hover:text-white` on `aging-report/page.tsx:27` after a Rule 6 pre-flight scan using the narrower pattern `bg-white|bg-gray-...` missed the `hover:`-prefixed variant.
4. **For each HALT**, flag finding `PLAN_PRECURSOR_VIOLATION` with file path + violation type + recommended precursor handling.

### Verdict integration

- Any pre-existing hook violation in a target file → WARNING finding (`PLAN_PRECURSOR_VIOLATION`); plan-author MUST acknowledge with a precursor handling decision before plan ships. Two acceptable paths:
  (a) **Include precursor cleanup in plan scope** with explicit task-level separation (e.g. Task 1 = precursor cleanup; Tasks 2..N = main plan body). Commit graph should still produce a single precursor commit + single main commit OR a precursor task that pre-dates the main task.
  (b) **Author a precursor plan** that ships before this plan. Precursor plan has its own files_modified + ACs + verification.
- All target files hook-clean → no finding.
- Schema-only / migration-only / doc-only plans with no hook-scanned surfaces → finding N/A (vacuous PASS).
- Plan-author / plan-reviewer uses a NARROWER regex than the hook's authoritative set (e.g. omitting word-boundary anchors, missing prefix coverage) → WARNING finding (`PLAN_PRECURSOR_SCAN_REGEX_NARROWED`); the scan must be re-run with the full hook regex set above. Per nwrp131: discovered when Rule 6 enforcement used `bg-white|bg-gray-...` pattern and missed `hover:text-white`. Word-boundary `\b` anchors are LOAD-BEARING — they catch `hover:`, `focus:`, `active:`, `disabled:` prefix variants.

### Default reviewer disposition

`architect` is the **primary** reviewer for this check (cross-plan scope-handling lens — should precursor be in-plan or its own plan?). `planner` is **co-primary** (the planner agent authored the plan and is responsible for scope decisions). No secondary reviewer needed — the check is mechanical (hook runs deterministically).

### Why WARNING not BLOCKING

Unlike Rule 2 (FK citation) or Rule 5 (parallel overlap), Rule 6's "precursor violation" finding doesn't always require plan-author action — many violations are trivial 1-line fixes the executor can apply in-task with no scope creep concern. The friction-tax of BLOCKING every such finding would force pointless plan-author cycles. WARNING lets the plan-author triage: trivial fixes get an "include in scope" note; non-trivial fixes get a precursor plan; truly out-of-scope fixes get a Wave 1.1-Lite TD entry. The discipline is "no surprises at execute time," not "no violations exist."

### Friction-tax watchpoint

If plan-review iter-1 finds itself flagging >40% of waves with `PLAN_PRECURSOR_VIOLATION`, the codebase has accumulated more hook-scannable tech debt than the plan-level workflow can absorb — escalate to a dedicated design-token / hygiene sweep (Wave 1.1-Lite or similar) rather than continuing per-plan precursor handling.
```

Edit-tool guidance:
1. Read .claude/commands/nightwork-plan-review.md lines 155-170 to locate the end of the Criteria-mandate-enforcement section (look for the "Drop-in template" subsection or the file's final lines).
2. Append THREE new sections (Rule 2 + Rule 5 + Rule 6) AFTER the criteria-mandate section, BEFORE the file's final block (preserve trailing newline).
3. Use a single Edit call with old_string ending at a stable anchor in the criteria-mandate section (e.g. the "Drop-in template" header line) and new_string = anchor + Rule 2 section + Rule 5 section + Rule 6 section.

After the edit, run the grep mechanical checks:
- `grep -n 'PLAN_MISSING_FK_CITATION' .claude/commands/nightwork-plan-review.md` returns >= 1 match.
- `grep -n 'PLAN_PARALLEL_FILES_OVERLAP' .claude/commands/nightwork-plan-review.md` returns >= 1 match.
- `grep -n 'PLAN_PRECURSOR_VIOLATION' .claude/commands/nightwork-plan-review.md` returns >= 1 match.
- `grep -c 'architect\|database-reviewer' .claude/commands/nightwork-plan-review.md` (scoped to the Rule 2 enforcement block) returns >= 2.
  </action>
  <verify>
    <automated>
      grep -c 'PLAN_MISSING_FK_CITATION\|Rule 2 FK-citation enforcement' .claude/commands/nightwork-plan-review.md
      # Expected: >= 2 (section header + finding code)
      grep -c 'PLAN_PARALLEL_FILES_OVERLAP\|Rule 5 files_modified intersection enforcement' .claude/commands/nightwork-plan-review.md
      # Expected: >= 2 (section header + finding code)
      grep -c 'PLAN_PRECURSOR_VIOLATION\|Rule 6 precursor hook scan enforcement' .claude/commands/nightwork-plan-review.md
      # Expected: >= 2 (section header + finding code)
      grep -c 'architect\|database-reviewer' .claude/commands/nightwork-plan-review.md
      # Expected: >= 2 in the Rule 2 enforcement block per iter-2 §4.18
    </automated>
  </verify>
  <done>
    nightwork-plan-review.md contains THREE enforcement sections: "Rule 2 FK-citation enforcement" + "Rule 5 files_modified intersection enforcement" + "Rule 6 precursor hook scan enforcement". Rule 2 names PLAN_MISSING_FK_CITATION as BLOCKING (per iter-2 §4.17/§4.18). Rule 5 names PLAN_PARALLEL_FILES_OVERLAP as BLOCKING (per nwrp127 origin). Rule 6 names PLAN_PRECURSOR_VIOLATION as WARNING (per nwrp130 origin; WARNING not BLOCKING per Rule 6 friction-tax rationale). All three sections mirror the Criteria-mandate-enforcement precedent shape. No other section is modified.
  </done>
</task>

<task type="auto">
  <name>Task 3: Amend nightwork-ai-logic-tester.md AND nightwork-ai-logic-checker SKILL.md with Rule 3 runtime-execution mandate (per iter-2 §4.10 SKILL.md propagation)</name>
  <files>.claude/agents/nightwork-ai-logic-tester.md, .claude/skills/nightwork-ai-logic-checker/SKILL.md</files>
  <action>
Per iter-2 §4.10 (H-D4-02): Rule 3 propagation extends BEYOND the agent file (.claude/agents/nightwork-ai-logic-tester.md) to ALSO mirror the contract into the SKILL.md operating contract (.claude/skills/nightwork-ai-logic-checker/SKILL.md). The agent file points TO the skill; skill content is the runtime contract.

This task performs surgical edits to BOTH files.

---

**EDITS A1, A2, A3 — .claude/agents/nightwork-ai-logic-tester.md**

(a) **Amend Step 4 "Actual behavior"** (currently lines 51-52 — "Either (a) read the code carefully enough that you're confident, or (b) write a test...").

Replace the existing Step 4 paragraph with:

```markdown
### Step 4 — Actual behavior

For NON-PostgREST/NON-RLS surfaces (cents math, state machines, status transitions, aggregations): either (a) read the code carefully enough that you're confident, or (b) write a test (in `__tests__/.scratch/<surface>.test.ts`) that exercises the input. Compare expected to actual.

For PostgREST relationship hints (any `.select("...:...(...)")` pattern) and RLS policy claims: code-reading is INSUFFICIENT EVIDENCE. Per CLAUDE.md Workflow posture → Rule 3 (codified Wave-D D-4), you MUST execute a representative query:

- For PostgREST embedding: use Supabase MCP `execute_sql` (read-only) to run the equivalent SQL JOIN, OR fetch the actual route via `curl` against the Vercel preview URL and inspect the JSON response shape. If the relationship resolves, the JSON contains the embedded sub-object; if it fails, PostgREST returns `{"code":"PGRST200","message":"Could not find a relationship..."}`.
- For RLS: use `execute_sql` to run a SELECT impersonating two different orgs (via `SET LOCAL ROLE authenticated; SET request.jwt.claims = ...`) and confirm cross-org rows do NOT appear in the lower-privilege session. Wave-C surfaced this gap: the org_members.user_id → profiles.id PostgREST embedding READ fine in code but was unresolvable at runtime because no FK existed.

Inferred-but-unverified claims are explicitly disallowed. PASS requires actual query output captured in the LOGIC-TEST-<surface>.md report under a new "Runtime evidence" section.
```

(b) **Add a new "Hard rule" bullet** to the "## Hard rules" section (currently lines 118-124). Add as the new last bullet:

```markdown
- **PostgREST/RLS claims require runtime evidence.** Per Rule 3 (CLAUDE.md → Workflow posture; codified Wave-D D-4): a verdict of PASS on any claim about "PostgREST resolves this relationship" or "this RLS policy filters cross-tenant access" requires actual query output captured in the report. Reading the code + reasoning forward is INSUFFICIENT — execute the query via Supabase MCP `execute_sql` (read-only) or fetch the preview route via `curl` and inspect the JSON response. Inferred-but-unverified claims are explicitly disallowed.
```

(c) **Add a "## Runtime evidence" sub-section to the Output template's markdown block** (currently lines 77-116) — insert before "## Verdict" with the heading and a placeholder line:

```markdown
## Runtime evidence (for PostgREST/RLS claims — Rule 3)
- **Query executed**: <SQL or curl command>
- **Output captured**: <JSON snippet or query result rows>
- **Resolves at runtime?**: yes / no / N/A (not a PostgREST/RLS claim)
```

Edit-tool guidance for agent file:
1. Read .claude/agents/nightwork-ai-logic-tester.md lines 48-60 to confirm the Step 4 anchor matches exactly.
2. Use Edit calls (one for Step 4 replacement, one for the new Hard rule bullet, one for the Output template insertion).
3. NOTE on previous draft: previous Rule 3 header text in CLAUDE.md referenced "ai-logic-tester must execute, not infer" — per iter-2 §4.5 the canonical CLAUDE.md header is now "ai-logic-tester executes representative queries". Update any back-references in the agent file's cross-link prose to match the new canonical header.

---

**EDITS B1, B2 — .claude/skills/nightwork-ai-logic-checker/SKILL.md** (per iter-2 §4.10 propagation)

The SKILL.md is the runtime contract that the agent file points to. Mirror the Rule 3 text into the SKILL.md.

(d) **Add a new section "## Rule 3 runtime-execution contract (per Wave-D D-4 / iter-2 §4.10)"** to .claude/skills/nightwork-ai-logic-checker/SKILL.md. Insertion point: depends on existing SKILL.md structure — append after the existing operating-contract section, before any examples/templates section.

Section content:

```markdown
## Rule 3 runtime-execution contract (per Wave-D D-4 / iter-2 §4.10)

Per CLAUDE.md Workflow posture → Rule 3: for any PostgREST relationship, RLS policy, or schema-resolution claim, the ai-logic-checker MUST execute a representative SQL/REST query against current schema. Inferring correctness from migration text alone is the Wave-C anti-pattern that shipped 3 bugs.

### What counts as "execute"

- **Supabase MCP `execute_sql`** (read-only): run the equivalent SQL JOIN that PostgREST would generate. Capture row output.
- **`curl` against Vercel preview URL**: hit the actual route + inspect JSON response shape. PostgREST returns `{"code":"PGRST200","message":"Could not find a relationship..."}` on resolution failure.
- **`pg_constraint` introspection query**: for FK-citation claims, verify the cited constraint actually exists.

### What does NOT count

- Reading migration text + inferring "this should resolve"
- Code-reading the .select("...") call + inferring "the embedding hint syntax matches PostgREST documentation"
- Schema-diagram inspection without runtime confirmation

### Inferred-but-unverified claims are explicitly disallowed.

PASS verdict on a PostgREST/RLS claim REQUIRES query output captured in the LOGIC-TEST-<surface>.md report under a "Runtime evidence" section. No exceptions.
```

(e) **Add a one-line cross-reference at the top of SKILL.md** (or in the SKILL's metadata/frontmatter if it has one) pointing to the agent file:

```markdown
> Note: this skill's operating contract is mirrored from `.claude/agents/nightwork-ai-logic-tester.md`. When both files describe the same rule, this SKILL.md is the runtime authority; agent file is the conversational interface.
```

Edit-tool guidance for SKILL.md:
1. Read .claude/skills/nightwork-ai-logic-checker/SKILL.md to confirm the file exists + understand its structure.
2. If the file does NOT exist, create it with the section above as the initial content (executor judgement at execute-time per the existing SKILL.md catalog pattern).
3. Use Edit calls (or Write if creating from scratch) for the two insertions.

---

After all 5 edits, run the grep mechanical checks (5 of them):
- `execute_sql` in agent file (>= 1)
- `Inferred-but-unverified claims are explicitly disallowed` in agent file (>= 1)
- `Runtime evidence` in agent file (>= 1)
- `execute_sql` in SKILL.md (>= 1)
- `Inferred-but-unverified claims are explicitly disallowed` in SKILL.md (>= 1)
  </action>
  <verify>
    <automated>
      grep -c 'execute_sql\|Inferred-but-unverified claims are explicitly disallowed\|Runtime evidence' .claude/agents/nightwork-ai-logic-tester.md
      # Expected: >= 3
      grep -c 'execute_sql\|Inferred-but-unverified claims are explicitly disallowed' .claude/skills/nightwork-ai-logic-checker/SKILL.md
      # Expected: >= 2 (per iter-2 §4.10 SKILL.md propagation)
    </automated>
  </verify>
  <done>
    nightwork-ai-logic-tester.md Step 4 differentiates between non-PostgREST/non-RLS surfaces (code reading OK) and PostgREST/RLS surfaces (runtime execution required). The Hard rules section gains the Rule 3 affirmative-evidence bullet. The Output template includes a "Runtime evidence" sub-section. .claude/skills/nightwork-ai-logic-checker/SKILL.md mirrors the Rule 3 runtime-execution contract (per iter-2 §4.10 propagation); both files reference `execute_sql` + "Inferred-but-unverified claims are explicitly disallowed". No other section is modified.
  </done>
</task>

<task type="auto">
  <name>Task 4: Author scripts/wave-d-smoke.ts (synthetic UUIDs + per-route invariants + warmup + WARN per iter-2 §4.3-§4.14) + amend .gitignore (per iter-2 §4.11)</name>
  <files>scripts/wave-d-smoke.ts, .gitignore</files>
  <action>
**Step A: Author scripts/wave-d-smoke.ts**

Use the Write tool to create the file. Structure (~450 lines TypeScript — iter-2 added invariant checks + warmup + WARN).

**Header docblock** documenting:
- Invocation: `npx tsx scripts/wave-d-smoke.ts --preview-url <https://...>`
- Required env: `HARNESS_FIXTURE_PASSWORD`
- Optional env: `VERCEL_AUTOMATION_BYPASS_SECRET`, `VERIFICATION_BYPASS_SECRET` (per iter-2 §4.12: missing emits WARN, does NOT abort)
- Authentication: per CLAUDE.md → "Platform admin" section + .planning/phases/stage-1.5c-verification-harness D-30 → script signs in as `harness-fixture@nightwork.local` in `fixture-harness-org` (NOT platform_admin). This matches the 3-layer harness's single-auth-path posture.
- **Synthetic seed:** per iter-2 §4.4, all 13 routes run against synthetic UUIDs seeded via `scripts/fixtures/smoke-seed.sql`. NO Drummond/SmartShield UUIDs. UUID convention: org=1, users=0, jobs=2, invoices=3, activity_log=4 (full convention in scripts/fixtures/smoke-seed.sql header). Per iter-2 §4.4.3 the `requires_drummond_data: true` skip-path is REMOVED.
- **Screenshot strategy:** DIAGNOSTIC-ONLY (per iter-2 §4.3). NO baseline diff. Per-run history retained via `<run-id>` epoch-ms in filename. Last 10 runs retained; older runs gitignored.
- Output: pass/fail JSON written to `.planning/qa-runs/wave-d/smoke-results.json` (per iter-2 §4.1 lifecycle artifact path); per-route screenshots to `.planning/qa-runs/wave-d/screenshots/<route-slug>-<run-id>.png`
- Wave 1.1-Full Layer 4 seed intent: this script is the first Playwright-script-against-preview-URL artifact outside the 3-layer harness, per calibration-log F1+ harness extension entry (lines 93-95).
- Exit codes: 0 = all routes pass, 1 = any route fails, 2 = setup error (missing env, invalid URL, bootstrap failure)

**Route table constant** (TypeScript const array). Per iter-2 §4.4.2 the hardcoded Drummond UUIDs are REPLACED with synthetic UUIDs from scripts/fixtures/smoke-seed.sql:

```typescript
const ROUTES: RouteCheck[] = [
  // Issue 1 sites (9 of 9, deduplicated)
  {
    route: "/today",
    category: "issue-1",
    primary_ux_selector: "text=Active jobs",  // activity feed presence
  },
  {
    route: "/admin/platform/jobs-health",
    category: "issue-1",
    primary_ux_selector: null,  // API consumer; HTTP 200 + zero console errors only
  },
  {
    route: "/settings/workflow",
    category: "issue-1",
    primary_ux_selector: "select[name='import_default_pm_id'] option",
    primary_ux_min_count: 1,
  },
  // Per iter-2 §4.4.2: Drummond UUID replaced with synthetic invoice UUID from smoke-seed.sql
  // OLD: /financials/bills/7c63cf40-8fe4-409f-bc3c-2a7ef8aea003
  // NEW: /financials/bills/33333333-3333-3333-3333-300000000001
  {
    route: "/financials/bills/33333333-3333-3333-3333-300000000001",
    category: "issue-1",
    primary_ux_selector: "text=Smoke Vendor Alpha",  // synthetic vendor name from smoke-seed.sql
    pattern: "document-review",  // Per iter-2 §4.9 — triggers Document Review pattern-slot check
  },
  // Per iter-2 §4.4.2: Drummond job UUID replaced with synthetic job UUID
  // OLD: /jobs/a1bb4d28-103d-40d8-98fd-2dc449bf5d1c
  // NEW: /jobs/22222222-2222-2222-2222-200000000001
  {
    route: "/jobs/22222222-2222-2222-2222-200000000001",
    category: "issue-1",
    primary_ux_selector: "text=Smoke Job Alpha",  // synthetic job name from smoke-seed.sql
  },
  {
    route: "/financials/bills",
    category: "both",  // overlaps with Issue 2
    primary_ux_selector: "select[name='assigned_pm'] option",
    primary_ux_min_count: 1,
  },
  {
    route: "/financials/bills/queue",
    category: "both",  // overlaps with Issue 2
    primary_ux_selector: "select[name='assigned_pm'] option",
    primary_ux_min_count: 1,
  },
  {
    route: "/jobs/new",
    category: "issue-1",
    primary_ux_selector: "select[name='pm_id'] option",
    primary_ux_min_count: 1,
  },
  // Issue 2 sites (the 4 financials/* not already covered above)
  {
    route: "/financials/bills/qa",
    category: "issue-2",
    primary_ux_selector: "header.app-shell-nav",
    primary_ux_min_count: 1,  // exactly 1 — but recorded as min; an exact-count assertion lives in the per-route NavBar invariant per iter-2 §4.8
  },
  {
    route: "/financials/lien-releases",
    category: "issue-2",
    primary_ux_selector: "header.app-shell-nav",
    primary_ux_min_count: 1,
  },
  {
    route: "/financials/payments",
    category: "issue-2",
    primary_ux_selector: "header.app-shell-nav",
    primary_ux_min_count: 1,
  },
  {
    route: "/financials/pay-apps",
    category: "issue-2",
    primary_ux_selector: "header.app-shell-nav",
    primary_ux_min_count: 1,
  },
  // The 13th unique route: the corrected mapping from Plan D-3 (Issue 3 docs).
  // Both /invoices (legacy alias) and /financials/bills (canonical) are covered.
  // The /invoices alias is verified via redirect-check at HTTP layer only.
  // Note: per iter-2 §3.3 the redirect emits HTTP 308 (not 301) — Next.js
  // `permanent: true` semantics. Assertion below uses 308.
  {
    route: "/invoices",
    category: "issue-2",
    primary_ux_selector: null,  // verifies HTTP 308 → /financials/bills (per Plan D-3 corrected packet + D-01)
  },
];
```

**Route count reconciliation:** 13 unique routes (Issue-1 8 unique + Issue-2 4 unique + 1 redirect-sentinel; Issue-1 routes 6+7 overlap with Issue-2 financials/bills + financials/bills/queue → deduplicated). Document this reconciliation in the script header.

**parseArgs(argv)** — mirror harness-auth-bootstrap.ts:56-64; extract `--preview-url <value>`. Fail loud on missing or invalid (regex `^https://[A-Za-z0-9.-]+`). Exit code 2.

**Loud WARN on missing bypass secrets (per iter-2 §4.12 / H-D4-15):**

```typescript
if (!process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
  console.warn('⚠ VERCEL_AUTOMATION_BYPASS_SECRET not set — preview routes may capture Vercel SSO wall as HTTP 200 (false PASS)');
}
if (!process.env.VERIFICATION_BYPASS_SECRET) {
  console.warn('⚠ VERIFICATION_BYPASS_SECRET not set — middleware bypass disabled');
}
// Loud, but do NOT abort — Jake may intentionally run without bypass for diagnostic
```

**ensureStorageState(previewUrl)** — check if `HARNESS_AUTH_STATE_PATH` file exists; if not, invoke the bootstrap inline via `spawnSync("npx", ["tsx", "scripts/harness-auth-bootstrap.ts", "--preview-url", previewUrl], { stdio: "inherit" })`. Exit code 2 if bootstrap fails. Note: import from `../src/lib/verification/_browser` to get `HARNESS_AUTH_STATE_PATH` constant — same posture as the 3-layer harness.

**Cold-lambda warmup ping (per iter-2 §4.14 / H-D4-17; reverted to /login per nwrp124 step 5):** Before the route loop, hit `/login` to absorb Vercel preview cold-lambda penalty:

```typescript
// Cold-start warmup — hit /login to absorb Vercel preview cold-lambda penalty
// before the route walk begins (per nwrp124 step 5 reversion of iter-2 §4.14).
// /login is public + reachable pre-auth + warms the same lambda pool as the
// authenticated routes. Conservative path — no new permanent production route
// introduced for verification harness scope.
try {
  const warmupPage = await context.newPage();
  await warmupPage.goto(`${previewUrl}/login`, { timeout: 30_000 });
  await warmupPage.close();
  console.log('Warmup complete');
} catch (e) {
  console.warn(`Warmup ping failed (proceeding anyway): ${(e as Error).message}`);
}
```

**checkRoute(context, routeCheck, previewUrl, runId)** → Promise<RouteResult>:
1. Start a per-route timer (`process.hrtime.bigint()`).
2. Open a new page from context: `const page = await context.newPage()`.
3. Capture console messages via `page.on("console", (msg) => ...)` — filter to severity `error` + `warning`, redact via regex stripping `sk-ant-[A-Za-z0-9_-]+` + `Bearer [A-Za-z0-9_.-]+` substrings.
4. Navigate: `await page.goto(previewUrl + routeCheck.route, { waitUntil: "load", timeout: 30_000 })`. Catch timeout → status="error_timeout".
5. Capture HTTP status from the response (await page.goto returns the response; null guard).
6. For /invoices: assert HTTP 308 (per iter-2 §3.3 — Next.js `permanent: true` emits 308, not 301); for all others: assert HTTP 200. Mismatch → status="fail" + record http_status.
7. Initialize `invariant_failures: string[] = []`.
8. **Per-route invariant — single NavBar global (per iter-2 §4.8 / H-D4-21):**
   ```typescript
   const navBars = await page.$$('header.app-shell-nav, header[data-component="nav-bar"]');
   if (navBars.length !== 1) {
     invariant_failures.push(`Expected exactly 1 NavBar on ${route.url}, got ${navBars.length}`);
   }
   const sidebars = await page.$$('aside.app-shell-sidebar, aside[data-component="job-sidebar"]');
   // Sidebar may be 0 or 1 (per NO_SIDEBAR regex in app-shell.tsx), never 2+
   if (sidebars.length > 1) {
     invariant_failures.push(`Expected ≤1 sidebar on ${route.url}, got ${sidebars.length}`);
   }
   ```
9. **Per-route invariant — logo placement (per iter-2 §4.6 / B-D4-05):**
   ```typescript
   const logoSelector = 'header [data-slot="org-logo"]';
   const logo = await page.$(logoSelector);
   if (!logo) {
     invariant_failures.push(`Logo missing on ${route.url}`);
   } else {
     const box = await logo.boundingBox();
     const viewportWidth = page.viewportSize()?.width ?? 1280;
     if (!box || box.x < viewportWidth * 0.5) {
       invariant_failures.push(`Logo not in right-half of viewport on ${route.url}`);
     }
   }
   ```
10. **Per-route invariant — DataGrid + design tokens + display-name (per iter-2 §4.7 / H-D4-09+19+20; list routes only — heuristic: route path ends in plural or contains list-y segment):**
    ```typescript
    if (isListRoute(routeCheck.route)) {
      // DataGrid row-count: must have >=1 row OR explicit empty-state indicator
      const rows = await page.$$('[role="grid"] [role="row"], tbody tr');
      const emptyState = await page.$('[data-state="empty"]');
      if (rows.length === 0 && !emptyState) {
        invariant_failures.push(`DataGrid empty without empty-state indicator on ${route.url}`);
      }
    }

    // PM dropdown display-name (NOT UUID) — applies to /jobs/new + invoice review surfaces
    const pmOptions = await page.$$eval(
      'select[name="pm_id"] option, select[name="assigned_pm"] option, select[name="import_default_pm_id"] option',
      els => els.map(e => ({ value: (e as HTMLOptionElement).value, text: e.textContent || '' })),
    );
    const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/;
    const uuidLeaks = pmOptions.filter(o => uuidPattern.test(o.text.trim()));
    if (uuidLeaks.length > 0) {
      invariant_failures.push(`PM dropdown shows UUIDs not display-names on ${route.url}: ${uuidLeaks.map(o=>o.text).join(", ")}`);
    }

    // Design tokens applied (sample assertion)
    try {
      const navBg = await page.$eval(
        'header.app-shell-nav, header[data-component="nav-bar"]',
        el => getComputedStyle(el).backgroundColor,
      );
      // Token should resolve to dark NavBar background; spot-check non-empty + non-transparent
      if (!navBg || navBg === 'rgba(0, 0, 0, 0)' || navBg === 'transparent') {
        invariant_failures.push(`NavBar background token not resolving on ${route.url}: ${navBg}`);
      }
    } catch (e) {
      // NavBar selector missed — covered by NavBar count invariant above
    }
    ```
11. **Per-route invariant — Document Review pattern (per iter-2 §4.9 / B-D4-03; document-review pattern routes only):**
    ```typescript
    if (routeCheck.pattern === 'document-review') {
      // Layout: file preview LEFT (aside or column-left), right-rail (aside-right),
      // audit timeline BELOW (footer or below-fold section)
      const filePreview = await page.$('[data-pattern-slot="file-preview"]');
      const rightRail = await page.$('[data-pattern-slot="right-rail"]');
      const auditTimeline = await page.$('[data-pattern-slot="audit-timeline"]');
      if (!filePreview) invariant_failures.push(`Document Review missing file preview on ${route.url}`);
      if (!rightRail) invariant_failures.push(`Document Review missing right rail on ${route.url}`);
      if (!auditTimeline) invariant_failures.push(`Document Review missing audit timeline on ${route.url}`);
    }
    ```
12. If `routeCheck.primary_ux_selector === null`: primary_ux_pass = null (no check defined; pass on HTTP + console-clean + invariants alone).
13. Otherwise: `const elements = await page.locator(routeCheck.primary_ux_selector).all()`; if `routeCheck.primary_ux_min_count` is set, assert `elements.length >= primary_ux_min_count`; record evidence (`"found N matches"`). On miss: primary_ux_pass = false.
14. Screenshot (DIAGNOSTIC-ONLY per iter-2 §4.3): `await page.screenshot({ path: \`.planning/qa-runs/wave-d/screenshots/\${routeSlug(routeCheck.route)}-\${runId}.png\`, fullPage: false })`. `routeSlug` replaces `/` with `_` and strips leading underscore (e.g. `/financials/bills` → `financials_bills`). `runId` is epoch milliseconds (per iter-2 §4.3 idempotency rule).
15. Close the page.
16. Determine final status: console_errors.length > 0 → "fail"; OR http_status mismatch → "fail"; OR invariant_failures.length > 0 → "fail"; OR primary_ux_pass === false → "fail"; else "pass".
17. Return RouteResult including `invariant_failures` array.

**main()**:
1. parseArgs.
2. Validate HARNESS_FIXTURE_PASSWORD is set; fail with exit code 2 + actionable message.
3. Warn on missing VERCEL_AUTOMATION_BYPASS_SECRET / VERIFICATION_BYPASS_SECRET per iter-2 §4.12.
4. ensureStorageState(previewUrl).
5. Compute `runId = Date.now().toString()` (per iter-2 §4.3 epoch-ms filename idempotency).
6. Launch chromium with chromiumLaunchArgs().
7. Create context: `await browser.newContext({ storageState: HARNESS_AUTH_STATE_PATH, extraHTTPHeaders: harnessBrowserHeaders(), viewport: { width: 1280, height: 800 } })`.
8. Run cold-lambda warmup ping per iter-2 §4.14.
9. Iterate ROUTES sequentially (NOT parallel — per iter-2 §4.13 deferral; harness-fixture session is single-threaded; parallel risks rate-limiting + auth-cookie contention). Use a 10-min outer timeout via `Promise.race`.
10. Collect RouteResult[]; serialize SmokeOutput JSON.
11. **Write JSON to `.planning/qa-runs/wave-d/smoke-results.json`** (per iter-2 §4.1 lifecycle artifact path) AND echo to stdout for debugging visibility.
12. Compute exit code: any "fail" or "error_*" → 1; all "pass" → 0.
13. Close context + browser; exit.

**Step B: Amend .gitignore (per iter-2 §4.11)**

Use the Edit tool to add TWO rules to .gitignore. Insertion point: after the existing `/screenshots/` block (lines 81-82). Use old_string anchored on `# screenshots (local only, never committed)\n/screenshots/` and new_string = anchor + the new blocks:

```
# Playwright smoke output (wave-d-smoke.ts + future Layer 4 framework runs; per-run screenshots + JSON; ephemeral, never committed)
/.playwright-output/

# Harness auth state (live Supabase session tokens — never commit) — per iter-2 §4.11
.planning/verification/auth/
```

Verify on clean checkout: `git status` after running `npx tsx scripts/harness-auth-bootstrap.ts` shows no untracked auth-state files.

**Step C: Verify TypeScript cleanliness**

After Write + Edit complete, run `npx tsc --noEmit` and confirm zero errors. If errors surface (e.g. Playwright type imports), fix in scripts/wave-d-smoke.ts and re-run until clean.
  </action>
  <verify>
    <automated>
      # TypeScript compiles clean
      npx tsc --noEmit 2>&1 | grep -c 'error TS' || true
      # Expected: 0

      # File exists at the documented path
      test -f scripts/wave-d-smoke.ts && echo "PASS: file exists"

      # .gitignore has the two new rules per iter-2 §4.11
      grep -c '/.playwright-output/' .gitignore
      # Expected: 1
      grep -c '.planning/verification/auth/' .gitignore
      # Expected: 1

      # Script header documents the auth strategy
      grep -c 'harness-fixture@nightwork.local\|HARNESS_FIXTURE_PASSWORD\|D-30' scripts/wave-d-smoke.ts
      # Expected: >= 3

      # Script defines 13 routes
      grep -c "route: \"" scripts/wave-d-smoke.ts
      # Expected: 13

      # Script uses synthetic UUIDs (per iter-2 §4.4.2) — NOT Drummond UUIDs
      grep -c '33333333-3333-3333-3333-300000000001\|22222222-2222-2222-2222-200000000001' scripts/wave-d-smoke.ts
      # Expected: >= 2 (one synthetic invoice + one synthetic job UUID)
      grep -c '7c63cf40-8fe4-409f-bc3c-2a7ef8aea003\|a1bb4d28-103d-40d8-98fd-2dc449bf5d1c' scripts/wave-d-smoke.ts
      # Expected: 0 (Drummond UUIDs MUST be absent per iter-2 §4.4.2)

      # Script imports the canonical helpers
      grep -c "from '../src/lib/verification/_browser'" scripts/wave-d-smoke.ts
      # Expected: 1

      # Script includes warmup ping (per nwrp124 step 5 reversion of iter-2 §4.14)
      grep -c "previewUrl}/login" scripts/wave-d-smoke.ts
      # Expected: >= 1

      # Script includes WARN on missing bypass secrets (per iter-2 §4.12)
      grep -c 'VERCEL_AUTOMATION_BYPASS_SECRET not set\|VERIFICATION_BYPASS_SECRET not set' scripts/wave-d-smoke.ts
      # Expected: >= 2

      # Script per-route invariants (per iter-2 §4.6-§4.9)
      grep -c 'invariant_failures' scripts/wave-d-smoke.ts
      # Expected: >= 3 (push, declaration, .length check)
      grep -c 'data-slot="org-logo"' scripts/wave-d-smoke.ts
      # Expected: >= 1 (per iter-2 §4.6 logo selector)
      grep -c 'data-pattern-slot="file-preview"\|data-pattern-slot="right-rail"\|data-pattern-slot="audit-timeline"' scripts/wave-d-smoke.ts
      # Expected: >= 3 (per iter-2 §4.9 Document Review pattern selectors)
    </automated>
  </verify>
  <done>
    scripts/wave-d-smoke.ts exists, is TypeScript-clean, walks 13 unique routes against synthetic UUIDs (per iter-2 §4.4.2 — no Drummond UUIDs), authenticates via harness-fixture@nightwork.local + storageState bootstrap, runs cold-lambda warmup via /login (per nwrp124 step 5 reversion of iter-2 §4.14), emits loud WARN on missing bypass secrets (per iter-2 §4.12), enforces per-route invariants (single NavBar / logo placement / DataGrid / PM-UUID-leak / NavBar background token / Document Review pattern selectors per iter-2 §4.6-§4.9), writes per-route DIAGNOSTIC-ONLY screenshots with epoch-ms run-id to .planning/qa-runs/wave-d/screenshots/ (per iter-2 §4.3), writes SmokeOutput JSON to .planning/qa-runs/wave-d/smoke-results.json (per iter-2 §4.1), exits 0/1/2 per the contract. .gitignore excludes both /.playwright-output/ AND .planning/verification/auth/ (per iter-2 §4.11). The script does NOT run during this task — it runs at Wave-D execute time (after D-1 + D-2 ship) against the Wave-D preview URL, per iter-2 §4.1 lifecycle sequence.
  </done>
</task>

<task type="auto">
  <name>Task 5: Author scripts/fixtures/smoke-seed.sql (synthetic non-Drummond seed per iter-2 §4.4.1 + §6.2)</name>
  <files>scripts/fixtures/smoke-seed.sql</files>
  <action>
Per iter-2 §4.4.1 (decision 6) + iter-2 §6.2 cross-plan addition: create `scripts/fixtures/smoke-seed.sql` as the synthetic seed for smoke harness scripts. Idempotent via ON CONFLICT DO NOTHING. Non-Drummond UUIDs throughout.

Use the Write tool to create the file. The skeleton from iter-2 §4.4.1 is the starting point; executor expands the placeholder rows at execute-time with full insert statements.

**UUID namespace convention (per iter-2 §4.4.1):**
- Org: `11111111-1111-1111-1111-111111111111`
- Users: `00000000-0000-0000-XXXX-XXXXXXXXXXXX`
- Jobs: `22222222-2222-2222-2222-XXXXXXXXXXXX`
- Invoices: `33333333-3333-3333-3333-XXXXXXXXXXXX`
- Activity log: `44444444-4444-4444-4444-XXXXXXXXXXXX`

NO real Ross Built / Drummond / SmartShield UUIDs anywhere in the seed.

**File content (skeleton — executor fleshes out at execute-time):**

```sql
-- scripts/fixtures/smoke-seed.sql
--
-- Synthetic seed for verification harness smoke scripts. Non-Drummond UUIDs
-- to avoid embedding real client data in repo-checked-in scripts (per
-- nwrp122 decision 6 + ITER-2-PATCHES §4.4).
--
-- Run order: AFTER schema migrations are applied. Idempotent via ON CONFLICT.
--
-- Used by: scripts/wave-d-smoke.ts (Wave-D), scripts/smoke-* (future).
--
-- UUID convention:
--   Org:            11111111-1111-1111-1111-111111111111
--   Users:          00000000-0000-0000-XXXX-XXXXXXXXXXXX  (X = sequential)
--   Jobs:           22222222-2222-2222-2222-XXXXXXXXXXXX
--   Invoices:       33333333-3333-3333-3333-XXXXXXXXXXXX
--   Activity log:   44444444-4444-4444-4444-XXXXXXXXXXXX
--
-- DO NOT hardcode Drummond/SmartShield/real-vendor UUIDs in this file.
-- Per CLAUDE.md → Domain rules → Drummond-vs-synthetic-fixtures exception
-- (Wave-D D-4 deliverable; iter-2 §4.4.4).

BEGIN;

-- ============================================================================
-- Synthetic org
-- ============================================================================
INSERT INTO orgs (id, name, slug, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Harness Fixture Org', 'harness-fixture', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Synthetic profiles + memberships
-- 10 users total: 1 owner + 1 admin + 7 PMs + 1 accounting
-- Distinct display names so PM-dropdown checks see non-Unassigned values.
-- ============================================================================

-- Owner
INSERT INTO profiles (id, full_name, email) VALUES
  ('00000000-0000-0000-0001-000000000001', 'Smoke Owner', 'smoke-owner@nightwork.local')
ON CONFLICT (id) DO NOTHING;

-- Admin (this is the harness-fixture@nightwork.local user — auth seed creates
-- the auth.users row; this INSERT seeds the profiles row + membership)
INSERT INTO profiles (id, full_name, email) VALUES
  ('00000000-0000-0000-0001-000000000002', 'Harness Fixture Admin', 'harness-fixture@nightwork.local')
ON CONFLICT (id) DO NOTHING;

-- 7 PMs with distinct Greek-letter display names per iter-2 §3.1
INSERT INTO profiles (id, full_name, email) VALUES
  ('00000000-0000-0000-0001-000000000003', 'Smoke PM Alpha',   'smoke-pm-alpha@nightwork.local'),
  ('00000000-0000-0000-0001-000000000004', 'Smoke PM Beta',    'smoke-pm-beta@nightwork.local'),
  ('00000000-0000-0000-0001-000000000005', 'Smoke PM Gamma',   'smoke-pm-gamma@nightwork.local'),
  ('00000000-0000-0000-0001-000000000006', 'Smoke PM Delta',   'smoke-pm-delta@nightwork.local'),
  ('00000000-0000-0000-0001-000000000007', 'Smoke PM Epsilon', 'smoke-pm-epsilon@nightwork.local'),
  ('00000000-0000-0000-0001-000000000008', 'Smoke PM Zeta',    'smoke-pm-zeta@nightwork.local'),
  ('00000000-0000-0000-0001-000000000009', 'Smoke PM Eta',     'smoke-pm-eta@nightwork.local')
ON CONFLICT (id) DO NOTHING;

-- Accounting
INSERT INTO profiles (id, full_name, email) VALUES
  ('00000000-0000-0000-0001-00000000000a', 'Smoke Accounting', 'smoke-accounting@nightwork.local')
ON CONFLICT (id) DO NOTHING;

-- Memberships (all 10 users in fixture-harness-org)
INSERT INTO org_members (org_id, user_id, role, is_active) VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000001', 'owner',      true),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000002', 'admin',      true),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000003', 'pm',         true),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000004', 'pm',         true),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000005', 'pm',         true),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000006', 'pm',         true),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000007', 'pm',         true),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000008', 'pm',         true),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000009', 'pm',         true),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-00000000000a', 'accounting', true)
ON CONFLICT (org_id, user_id) DO NOTHING;

-- ============================================================================
-- Synthetic jobs (10 — diverse status + PM assignment)
-- ============================================================================
INSERT INTO jobs (id, org_id, name, address, status, pm_id, client_name, original_contract_amount, current_contract_amount, deposit_percentage, gc_fee_percentage, created_at) VALUES
  ('22222222-2222-2222-2222-200000000001', '11111111-1111-1111-1111-111111111111', 'Smoke Job Alpha',   '101 Test Lane',     'active',   '00000000-0000-0000-0001-000000000003', 'Smoke Client A', 250000000, 250000000, 0.10, 0.20, NOW()),
  ('22222222-2222-2222-2222-200000000002', '11111111-1111-1111-1111-111111111111', 'Smoke Job Beta',    '202 Test Lane',     'active',   '00000000-0000-0000-0001-000000000004', 'Smoke Client B', 350000000, 350000000, 0.10, 0.20, NOW()),
  ('22222222-2222-2222-2222-200000000003', '11111111-1111-1111-1111-111111111111', 'Smoke Job Gamma',   '303 Test Lane',     'active',   '00000000-0000-0000-0001-000000000005', 'Smoke Client C', 450000000, 450000000, 0.10, 0.20, NOW()),
  ('22222222-2222-2222-2222-200000000004', '11111111-1111-1111-1111-111111111111', 'Smoke Job Delta',   '404 Test Lane',     'complete', '00000000-0000-0000-0001-000000000006', 'Smoke Client D', 200000000, 200000000, 0.10, 0.20, NOW()),
  ('22222222-2222-2222-2222-200000000005', '11111111-1111-1111-1111-111111111111', 'Smoke Job Epsilon', '505 Test Lane',     'active',   '00000000-0000-0000-0001-000000000007', 'Smoke Client E', 550000000, 550000000, 0.10, 0.20, NOW()),
  ('22222222-2222-2222-2222-200000000006', '11111111-1111-1111-1111-111111111111', 'Smoke Job Zeta',    '606 Test Lane',     'active',   '00000000-0000-0000-0001-000000000008', 'Smoke Client F', 650000000, 650000000, 0.10, 0.20, NOW()),
  ('22222222-2222-2222-2222-200000000007', '11111111-1111-1111-1111-111111111111', 'Smoke Job Eta',     '707 Test Lane',     'active',   '00000000-0000-0000-0001-000000000009', 'Smoke Client G', 750000000, 750000000, 0.10, 0.20, NOW()),
  ('22222222-2222-2222-2222-200000000008', '11111111-1111-1111-1111-111111111111', 'Smoke Job Theta',   '808 Test Lane',     'active',   '00000000-0000-0000-0001-000000000003', 'Smoke Client H', 850000000, 850000000, 0.10, 0.20, NOW()),
  ('22222222-2222-2222-2222-200000000009', '11111111-1111-1111-1111-111111111111', 'Smoke Job Iota',    '909 Test Lane',     'warranty', '00000000-0000-0000-0001-000000000004', 'Smoke Client I', 300000000, 300000000, 0.10, 0.20, NOW()),
  ('22222222-2222-2222-2222-20000000000a', '11111111-1111-1111-1111-111111111111', 'Smoke Job Kappa',   '110 Test Lane',     'active',   '00000000-0000-0000-0001-000000000005', 'Smoke Client J', 400000000, 400000000, 0.10, 0.20, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Synthetic invoices (5 — covers diverse statuses)
-- Executor expands at execute-time with full vendor_name_raw, total_amount,
-- status, assigned_pm_id, etc.
-- ============================================================================
INSERT INTO invoices (id, org_id, job_id, vendor_name_raw, total_amount, status, assigned_pm_id, received_date, created_at) VALUES
  ('33333333-3333-3333-3333-300000000001', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-200000000001', 'Smoke Vendor Alpha', 1500000, 'ai_processed', '00000000-0000-0000-0001-000000000003', NOW(), NOW()),
  ('33333333-3333-3333-3333-300000000002', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-200000000002', 'Smoke Vendor Beta',  2500000, 'pm_review',    '00000000-0000-0000-0001-000000000004', NOW(), NOW()),
  ('33333333-3333-3333-3333-300000000003', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-200000000003', 'Smoke Vendor Gamma', 3500000, 'qa_review',    '00000000-0000-0000-0001-000000000005', NOW(), NOW()),
  ('33333333-3333-3333-3333-300000000004', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-200000000004', 'Smoke Vendor Delta', 4500000, 'in_draw',      '00000000-0000-0000-0001-000000000006', NOW(), NOW()),
  ('33333333-3333-3333-3333-300000000005', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-200000000005', 'Smoke Vendor Epsilon', 5500000, 'paid',       '00000000-0000-0000-0001-000000000007', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Synthetic activity_log rows (10 — exercises display-name vs UUID rendering)
-- ============================================================================
INSERT INTO activity_log (id, org_id, user_id, action, entity_type, entity_id, occurred_at) VALUES
  ('44444444-4444-4444-4444-400000000001', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000003', 'invoice_received',  'invoice', '33333333-3333-3333-3333-300000000001', NOW()),
  ('44444444-4444-4444-4444-400000000002', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000004', 'invoice_pm_review', 'invoice', '33333333-3333-3333-3333-300000000002', NOW()),
  ('44444444-4444-4444-4444-400000000003', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000005', 'invoice_qa_review', 'invoice', '33333333-3333-3333-3333-300000000003', NOW()),
  ('44444444-4444-4444-4444-400000000004', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000006', 'invoice_in_draw',   'invoice', '33333333-3333-3333-3333-300000000004', NOW()),
  ('44444444-4444-4444-4444-400000000005', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000007', 'invoice_paid',      'invoice', '33333333-3333-3333-3333-300000000005', NOW()),
  ('44444444-4444-4444-4444-400000000006', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000003', 'job_created',       'job',     '22222222-2222-2222-2222-200000000001', NOW()),
  ('44444444-4444-4444-4444-400000000007', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000004', 'job_created',       'job',     '22222222-2222-2222-2222-200000000002', NOW()),
  ('44444444-4444-4444-4444-400000000008', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000005', 'job_created',       'job',     '22222222-2222-2222-2222-200000000003', NOW()),
  ('44444444-4444-4444-4444-400000000009', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000006', 'job_status_change', 'job',     '22222222-2222-2222-2222-200000000004', NOW()),
  ('44444444-4444-4444-4444-40000000000a', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000003', 'job_created',       'job',     '22222222-2222-2222-2222-200000000008', NOW())
ON CONFLICT (id) DO NOTHING;

COMMIT;
```

The above is the canonical content. The executor may need to adjust column lists to match current schema at execute-time (e.g., if `invoices` table has additional NOT NULL columns post-Wave-A, add them with sensible synthetic defaults). The mechanical UUID convention + idempotency contract + 10/10/5/10 row counts are LOCKED per iter-2 §4.4.1.

**Step B: Verify the seed runs cleanly**

After Write completes, executor verifies via Supabase MCP:

```sql
-- Apply seed (Supabase MCP execute_sql with file content; idempotent)
-- Then verify counts:
SELECT 'orgs' AS t, COUNT(*) AS n FROM orgs WHERE id = '11111111-1111-1111-1111-111111111111'
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles WHERE id LIKE '00000000-0000-0000-0001-%'
UNION ALL
SELECT 'org_members', COUNT(*) FROM org_members WHERE org_id = '11111111-1111-1111-1111-111111111111'
UNION ALL
SELECT 'jobs', COUNT(*) FROM jobs WHERE org_id = '11111111-1111-1111-1111-111111111111'
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices WHERE org_id = '11111111-1111-1111-1111-111111111111'
UNION ALL
SELECT 'activity_log', COUNT(*) FROM activity_log WHERE org_id = '11111111-1111-1111-1111-111111111111';

-- Expected:
--   orgs: 1
--   profiles: 10
--   org_members: 10
--   jobs: 10
--   invoices: 5
--   activity_log: 10
```
  </action>
  <verify>
    <automated>
      # File exists
      test -f scripts/fixtures/smoke-seed.sql && echo "PASS: file exists"

      # UUID namespaces per iter-2 §4.4.1
      grep -c '11111111-1111-1111-1111-111111111111' scripts/fixtures/smoke-seed.sql
      # Expected: >= 1 (org UUID)
      grep -c '22222222-2222-2222-2222-2' scripts/fixtures/smoke-seed.sql
      # Expected: >= 1 (jobs namespace)
      grep -c '33333333-3333-3333-3333-3' scripts/fixtures/smoke-seed.sql
      # Expected: >= 1 (invoices namespace)
      grep -c '44444444-4444-4444-4444-4' scripts/fixtures/smoke-seed.sql
      # Expected: >= 1 (activity_log namespace)

      # Idempotency
      grep -c 'ON CONFLICT' scripts/fixtures/smoke-seed.sql
      # Expected: >= 5 (one per major INSERT block)

      # No Drummond UUIDs leaked
      grep -c '7c63cf40-8fe4-409f-bc3c-2a7ef8aea003\|a1bb4d28-103d-40d8-98fd-2dc449bf5d1c' scripts/fixtures/smoke-seed.sql
      # Expected: 0

      # PM display names match iter-2 §3.1 (Greek letters)
      grep -c 'Smoke PM Alpha\|Smoke PM Beta\|Smoke PM Eta' scripts/fixtures/smoke-seed.sql
      # Expected: >= 3 (at least Alpha, Beta, Eta)
    </automated>
  </verify>
  <done>
    scripts/fixtures/smoke-seed.sql exists, uses synthetic non-Drummond UUIDs in the 4 namespace prefixes per iter-2 §4.4.1 (org=1, users=0, jobs=2, invoices=3, activity_log=4), is idempotent via ON CONFLICT DO NOTHING, and seeds 1 org + 10 profiles/memberships + 10 jobs + 5 invoices + 10 activity_log rows. The seed can be applied via Supabase MCP execute_sql or `psql -f`. Re-running the seed produces zero net changes (idempotency contract). No Drummond/SmartShield/real-vendor UUIDs anywhere in the file.
  </done>
</task>

<task type="auto">
  <name>Task 6: Add data-slot + data-pattern-slot JSX attributes to Wordmark/Icon/InvoiceReviewView (per iter-2 §4.6 + §4.9 + §6.4)</name>
  <files>src/components/branding/Wordmark.tsx, src/components/branding/Icon.tsx, src/components/invoice-review/InvoiceReviewView.tsx</files>
  <action>
Per iter-2 §4.6 (logo placement assertion) + iter-2 §4.9 (Document Review pattern selectors) + iter-2 §6.4 cross-plan addition: add `data-slot="org-logo"` to the wordmark + icon branding components, and `data-pattern-slot="file-preview"` / `data-pattern-slot="right-rail"` / `data-pattern-slot="audit-timeline"` to the canonical Document Review surface.

These are JSX-attribute-only changes. NO visual or behavior change. The attributes provide selector stability for the smoke harness's per-route invariant checks (Task 4 Step C steps 8 + 11).

This task performs 3 surgical edits.

---

**EDIT A — src/components/branding/Wordmark.tsx (per iter-2 §4.6 + §6.4)**

Locate the root element of the rendered Wordmark component (typically a `<svg>` or `<span>` at the top of the component's return). Add `data-slot="org-logo"`:

```tsx
// Before:
// <svg className={cn(...)} ...>
//   <!-- wordmark SVG paths -->
// </svg>

// After:
<svg className={cn(...)} data-slot="org-logo" ...>
  {/* wordmark SVG paths */}
</svg>
```

Edit-tool guidance:
1. Read src/components/branding/Wordmark.tsx to confirm the root element structure.
2. Use Edit with old_string capturing the root element opening tag + the next prop, and new_string inserting `data-slot="org-logo"` immediately after `className` (or wherever fits the component's prop-order convention).

---

**EDIT B — src/components/branding/Icon.tsx (per iter-2 §4.6 + §6.4)**

Same pattern as Edit A. Add `data-slot="org-logo"` to the root element of the rendered Icon component.

Edit-tool guidance:
1. Read src/components/branding/Icon.tsx.
2. Use Edit to insert the attribute.

---

**EDIT C — src/components/invoice-review/InvoiceReviewView.tsx (per iter-2 §4.9 + §6.4)**

The canonical Document Review surface per `.planning/design/PATTERNS.md` Document Review entry. Layout: file preview LEFT + right-rail panel + audit timeline BELOW.

Locate the three layout regions in the component's JSX:

1. **File preview region** (typically the LEFT column wrapper — e.g., `<aside className="col-left">` or `<div className="file-preview">`)
2. **Right-rail region** (typically the RIGHT column wrapper — e.g., `<aside className="col-right">` or `<div className="right-rail">`)
3. **Audit timeline region** (typically the BOTTOM section wrapper — e.g., `<footer>` or `<section className="audit-timeline">`)

Add the corresponding `data-pattern-slot` attribute to each:

```tsx
// Region 1: File preview LEFT
<aside data-pattern-slot="file-preview" className={...}>
  {/* InvoiceFilePreview component */}
</aside>

// Region 2: Right rail
<aside data-pattern-slot="right-rail" className={...}>
  {/* Structured fields + actions */}
</aside>

// Region 3: Audit timeline BELOW
<section data-pattern-slot="audit-timeline" className={...}>
  {/* ActivityLog + status_history rendering */}
</section>
```

Edit-tool guidance:
1. Read src/components/invoice-review/InvoiceReviewView.tsx (path may need adjustment if file lives at a different location — executor confirms via Grep at execute-time; canonical alternatives: `src/components/invoice-review/index.tsx`, `src/app/financials/bills/[id]/InvoiceReviewView.tsx`).
2. If the component doesn't exist at the assumed path, search:
   ```bash
   grep -rn 'InvoiceReviewView\|invoice.review' src/ | head -20
   ```
3. Identify the 3 layout regions (file preview / right-rail / audit-timeline).
4. Use 3 Edit calls (one per region) to insert the `data-pattern-slot` attributes.

If the InvoiceReviewView component does not yet have clearly-named layout regions (e.g., the component is structured as a flat list of children without semantic wrapper divs), the executor adds minimal wrapper elements during this task to provide the attribute-binding surface. The wrappers MUST NOT change visual layout (use `<div>` with no className that affects layout, OR add the attribute directly to an existing element that wraps the region).

---

After all 3 edits, run the grep mechanical checks:
- `grep -c 'data-slot="org-logo"' src/components/branding/Wordmark.tsx` returns >= 1
- `grep -c 'data-slot="org-logo"' src/components/branding/Icon.tsx` returns >= 1
- `grep -c 'data-pattern-slot="file-preview"\|data-pattern-slot="right-rail"\|data-pattern-slot="audit-timeline"' src/components/invoice-review/InvoiceReviewView.tsx` returns >= 3
  </action>
  <verify>
    <automated>
      # Wordmark + Icon data-slot
      grep -c 'data-slot="org-logo"' src/components/branding/Wordmark.tsx
      # Expected: >= 1
      grep -c 'data-slot="org-logo"' src/components/branding/Icon.tsx
      # Expected: >= 1

      # InvoiceReviewView data-pattern-slot (3 regions)
      grep -c 'data-pattern-slot="file-preview"' src/components/invoice-review/InvoiceReviewView.tsx
      # Expected: >= 1
      grep -c 'data-pattern-slot="right-rail"' src/components/invoice-review/InvoiceReviewView.tsx
      # Expected: >= 1
      grep -c 'data-pattern-slot="audit-timeline"' src/components/invoice-review/InvoiceReviewView.tsx
      # Expected: >= 1

      # No visual/behavior change → build clean
      npm run build 2>&1 | grep -c 'error' || true
      # Expected: 0
    </automated>
  </verify>
  <done>
    src/components/branding/Wordmark.tsx + src/components/branding/Icon.tsx contain `data-slot="org-logo"` on the rendered root element (per iter-2 §4.6 + §6.4). src/components/invoice-review/InvoiceReviewView.tsx contains `data-pattern-slot="file-preview"` + `data-pattern-slot="right-rail"` + `data-pattern-slot="audit-timeline"` on the 3 Document Review layout regions (per iter-2 §4.9 + §6.4). No visual or behavior change. `npm run build` remains clean. The smoke harness's per-route invariant checks (Task 4 steps 9 + 11) can now reliably locate these regions via the data attributes.
  </done>
</task>

</tasks>

<verification>
**Mechanical (Layer 1 — harness):**
- `npm run build` clean.
- `npx tsc --noEmit` clean.
- All hooks silent on commit (.githooks/pre-commit Drummond grep; .claude/hooks/nightwork-post-edit.sh drift check).
- Privacy gate clean across all 11 modified files.
- Grep mechanical checks from `<criteria>` block:
  - 4 Rule headers in CLAUDE.md (`Schema verification ≠ runtime verification`, `PostgREST FK citation requirement`, `ai-logic-tester executes representative queries`, `Playwright smoke pre-QA for UI-touching plans`) — per iter-2 §4.5 rephrased headers
  - 1 Architecture posture cross-reference (`PostgREST FK citation rule`)
  - 1 Domain rules exception clause (`smoke scripts + verification harness fixtures use synthetic`)
  - `PLAN_MISSING_FK_CITATION` + `architect`/`database-reviewer` co-primary in nightwork-plan-review.md
  - `execute_sql` + `Inferred-but-unverified claims are explicitly disallowed` + `Runtime evidence` in nightwork-ai-logic-tester.md
  - `execute_sql` + `Inferred-but-unverified claims are explicitly disallowed` in SKILL.md (per iter-2 §4.10 propagation)
  - `/.playwright-output/` + `.planning/verification/auth/` in .gitignore
  - synthetic UUIDs + ON CONFLICT in scripts/fixtures/smoke-seed.sql
  - `data-slot="org-logo"` in Wordmark.tsx + Icon.tsx
  - `data-pattern-slot="file-preview"` + `"right-rail"` + `"audit-timeline"` in InvoiceReviewView.tsx

**Behavioral (Layer 2 — harness):**
- All behavioral criteria from `<criteria>` block hold:
  - Script exits 0/1/2 correctly per env-var + invocation matrix
  - Redaction regex applied
  - Bootstrap inline-invoke works
  - Loud WARN on missing bypass secrets (per iter-2 §4.12)
  - Cold-lambda warmup ping (per iter-2 §4.14)
  - Per-route invariants enforced (single NavBar / logo placement / DataGrid / PM-UUID-leak / NavBar background / Document Review pattern per iter-2 §4.6-§4.9)
  - DIAGNOSTIC-ONLY screenshots with epoch-ms run-id (per iter-2 §4.3)
  - Output JSON written to .planning/qa-runs/wave-d/smoke-results.json (per iter-2 §4.1)
  - Synthetic seed (smoke-seed.sql) idempotent

**Runtime (Wave-D /nightwork-qa enforcement gate per iter-2 §4.2 — NOT this plan's responsibility, but documented here for clarity):**

Per iter-2 §4.1 lifecycle sequence:
1. /gsd-execute-phase completes all D-4 tasks
2. Executor commits + pushes to phase branch
3. Vercel preview deployment fires
4. Executor runs `npx tsx scripts/wave-d-smoke.ts --preview-url $WAVE_D_PREVIEW_URL` against the deployed preview
5. Smoke results land at `.planning/qa-runs/wave-d/smoke-results.json` (per iter-2 §4.1)
6. Screenshots land at `.planning/qa-runs/wave-d/screenshots/<route-slug>-<run-id>.png`
7. /nightwork-qa runs WITH smoke artifacts as input (per iter-2 §4.2 enforcer logic: D-1/D-2/D-4 all declare `requires_smoke: true`)
8. GATE-N halt for Jake review

At step 4 runtime, output JSON validates that:
- All 13 routes return their expected HTTP status (200 or 308 for /invoices per iter-2 §3.3)
- Zero console errors across all routes (no PGRST200, no "Could not find a relationship", no "relation \"users\" does not exist")
- PM dropdowns on Routes 6, 7, 8 (financials/bills + queue + jobs/new) show >= 1 option AND no UUID-leak (per iter-2 §4.7)
- Activity feed on Route 1 (/today) renders
- Exactly 1 `header.app-shell-nav` on EVERY route (per iter-2 §4.8 global invariant)
- Logo present in right-half of viewport on EVERY route (per iter-2 §4.6)
- Document Review pattern slots present on routes with `pattern: "document-review"` (per iter-2 §4.9)

Any failure → /nightwork-qa returns CRITICAL per iter-2 §4.2 failure-mode taxonomy → ship blocks.

**Production code paths exercised by this plan:** Tasks 5-6 touch production code:
- Task 5 (smoke-seed.sql): NO production code; database fixture file applied at execute-time
- Task 6 (data-slot attributes): JSX-attribute-only changes to Wordmark/Icon/InvoiceReviewView (NO visual or behavior change). Healthcheck route REVERTED per nwrp124 step 5 — /login used as warmup target; no new permanent production route introduced.
</verification>

<success_criteria>
This plan is complete when (per iter-2 §4.19 AC count delta: 9 → 13 ACs):

- [ ] AC-D4-01: CLAUDE.md contains the 4 new rule bullets (Rules 1-4) in the **### Workflow posture subsection** (per iter-2 §4.5 RELOCATION from original Development Rules target), appended after the `/nightwork-propagate` bullet.
- [ ] AC-D4-02: `grep -n 'Schema verification ≠ runtime verification' CLAUDE.md` returns >= 1 match (Rule 1 per iter-2 §4.5 header).
- [ ] AC-D4-03: `grep -n 'PostgREST FK citation requirement' CLAUDE.md` returns >= 1 match (Rule 2 per iter-2 §4.5 header — REPHRASED from prior draft).
- [ ] AC-D4-04: `grep -n 'ai-logic-tester executes representative queries' CLAUDE.md` returns >= 1 match (Rule 3 per iter-2 §4.5 header — REPHRASED).
- [ ] AC-D4-05: `grep -n 'Playwright smoke pre-QA for UI-touching plans' CLAUDE.md` returns >= 1 match (Rule 4 per iter-2 §4.1 + §4.5 header — REPHRASED). Additionally: CLAUDE.md `### Architecture posture` subsection contains a `PostgREST FK citation rule` cross-reference bullet (per iter-2 §4.5); CLAUDE.md `### Domain rules` subsection contains a `smoke scripts + verification harness fixtures use synthetic` exception clause (per iter-2 §4.4.4 + §6.1).
- [ ] AC-D4-06: .claude/commands/nightwork-plan-review.md contains a "Rule 2 FK-citation enforcement" section with PLAN_MISSING_FK_CITATION as a BLOCKING finding code, tightened regex (PLAN body + files_modified .tsx/.ts source files per iter-2 §4.17), and reviewer reassignment (`architect` primary + `database-reviewer` co-primary per iter-2 §4.18).
- [ ] AC-D4-07: .claude/agents/nightwork-ai-logic-tester.md Step 4 differentiates non-PostgREST/non-RLS surfaces from PostgREST/RLS surfaces; the Hard rules section gains a Rule 3 affirmative-evidence bullet; the Output template includes a "Runtime evidence" sub-section. AND .claude/skills/nightwork-ai-logic-checker/SKILL.md mirrors the Rule 3 runtime-execution contract (per iter-2 §4.10 SKILL.md propagation).
- [ ] AC-D4-08: scripts/wave-d-smoke.ts exists at the documented path.
- [ ] AC-D4-09: scripts/wave-d-smoke.ts is TypeScript-clean (npx tsc --noEmit returns 0 errors). Script includes: 13 unique routes per iter-2 §4.4.2 (synthetic UUIDs replace Drummond); cold-lambda warmup ping to /login (per nwrp124 step 5 reversion of iter-2 §4.14); loud WARN on missing bypass secrets (per iter-2 §4.12); per-route invariants for single-NavBar / logo placement / DataGrid / PM-UUID-leak / NavBar background / Document Review pattern slots (per iter-2 §4.6-§4.9); DIAGNOSTIC-ONLY screenshots with epoch-ms run-id (per iter-2 §4.3); JSON output to .planning/qa-runs/wave-d/smoke-results.json (per iter-2 §4.1).
- [ ] **AC-D4-10 (NEW per iter-2 §4.20):** Synthetic seed (`scripts/fixtures/smoke-seed.sql`) applied successfully — `SELECT COUNT(*) FROM jobs WHERE org_id = '11111111-1111-1111-1111-111111111111'` returns >= 10 rows. Idempotency: re-running the seed produces zero net row changes (ON CONFLICT DO NOTHING).
- [ ] **AC-D4-11 (NEW per iter-2 §4.20):** Logo `data-slot="org-logo"` attribute present on rendered root element of `src/components/branding/Wordmark.tsx` AND `src/components/branding/Icon.tsx` (grep React component source).
- [ ] **AC-D4-12 (NEW per iter-2 §4.20):** `data-pattern-slot` attributes present on Document Review canonical surface (`src/components/invoice-review/InvoiceReviewView.tsx`): `"file-preview"` + `"right-rail"` + `"audit-timeline"` each appear >= 1 time.
- [ ] **AC-D4-13 (NEW per iter-2 §4.20; REVISED per nwrp124 step 5 healthcheck reversion):** wave-d-smoke.ts warmup ping to /login returns HTTP 200 (no timeout) before the route loop fires. Conservative path — no new permanent production route introduced for verification harness scope.

**Wave-D ship verification (NOT this plan's responsibility):**
- [ ] /nightwork-qa enforcement gate (per iter-2 §4.2): `npx tsx scripts/wave-d-smoke.ts --preview-url $WAVE_D_PREVIEW_URL` produces `.planning/qa-runs/wave-d/smoke-results.json` with `status: PASS` against the post-D-1 + post-D-2 ship preview URL. All 13 routes pass per the verification block above.
- [ ] Per nwrp121 Wave-B gate: wave-d-smoke.ts pass + Rules 1-4 codified + plan-review prompt updated are 3 of the 5 Wave-B preconditions. Wave-D /gsd-ship + D-078 entry in MASTER-PLAN.md complete the gate.

**Files modified per iter-2 §4.19 task count delta + nwrp125 healthcheck reversion: 4 → 6 tasks; files modified 5 → 10:**
- CLAUDE.md (3 subsections edited — Workflow posture + Architecture posture + Domain rules)
- .claude/commands/nightwork-plan-review.md
- .claude/agents/nightwork-ai-logic-tester.md
- .claude/skills/nightwork-ai-logic-checker/SKILL.md (NEW target per iter-2 §4.10)
- scripts/wave-d-smoke.ts
- scripts/fixtures/smoke-seed.sql (NEW per iter-2 §4.4.1 + §6.2)
- src/components/branding/Wordmark.tsx (data-slot per iter-2 §4.6 + §6.4)
- src/components/branding/Icon.tsx (data-slot per iter-2 §4.6 + §6.4)
- src/components/invoice-review/InvoiceReviewView.tsx (data-pattern-slot per iter-2 §4.9 + §6.4)
- .gitignore (2 rules per iter-2 §4.11)
</success_criteria>

<output>
After completion, create `.planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-4-rules-and-playwright-SUMMARY.md` covering:

- **Files modified (10 total per iter-2 §4.19 task expansion + nwrp125 healthcheck reversion):**
  - CLAUDE.md (3 subsection edits — Workflow posture + Architecture posture + Domain rules per iter-2 §4.5 + §4.4.4)
  - .claude/commands/nightwork-plan-review.md (Rule 2 enforcement + tightened regex per iter-2 §4.17 + reviewer reassignment per iter-2 §4.18)
  - .claude/agents/nightwork-ai-logic-tester.md (Step 4 + Hard rule + Output template)
  - .claude/skills/nightwork-ai-logic-checker/SKILL.md (per iter-2 §4.10 SKILL.md propagation — NEW target)
  - scripts/wave-d-smoke.ts (new; synthetic UUIDs + per-route invariants + warmup + WARN)
  - scripts/fixtures/smoke-seed.sql (new; synthetic non-Drummond seed per iter-2 §4.4.1 + §6.2)
  - src/components/branding/Wordmark.tsx (data-slot="org-logo" per iter-2 §4.6 + §6.4)
  - src/components/branding/Icon.tsx (data-slot="org-logo" per iter-2 §4.6 + §6.4)
  - src/components/invoice-review/InvoiceReviewView.tsx (data-pattern-slot triple per iter-2 §4.9 + §6.4)
  - .gitignore (2 rules per iter-2 §4.11: .playwright-output + verification/auth)

- **Rules codified:** Rules 1-4 in CLAUDE.md → **### Workflow posture** (per iter-2 §4.5 RELOCATION from original Development Rules target). Architecture posture cross-reference + Domain rules synthetic-fixtures exception clause added. Cross-reference nwrp120 diagnosis + nwrp121 Addition 2 + nwrp122 iter-2 + nwrp124 mechanical re-author.

- **Plan-review checklist update:** PLAN_MISSING_FK_CITATION as BLOCKING finding code; mirrors the Criteria-mandate-enforcement precedent. Per iter-2 §4.17: regex tightened to scan files_modified .tsx/.ts source files (not just PLAN body). Per iter-2 §4.18: reviewer reassignment to `architect` primary + `database-reviewer` co-primary; `nightwork-multi-tenant-architect` demoted to secondary.

- **ai-logic-tester + SKILL.md update:** Agent file's Step 4 amended; new Hard rule; Output template gains Runtime evidence sub-section. Per iter-2 §4.10: SKILL.md mirrors the Rule 3 runtime-execution contract — skill content is the runtime authority, agent file is the conversational interface.

- **scripts/wave-d-smoke.ts shape:** 13 unique routes (synthetic UUIDs from smoke-seed.sql per iter-2 §4.4.2 — NO Drummond/SmartShield); harness-fixture auth; storageState bootstrap inline-invoke; cold-lambda warmup via /login per nwrp124 step 5 reversion of iter-2 §4.14; loud WARN on missing bypass secrets per iter-2 §4.12; per-route invariants (NavBar count + logo placement + DataGrid + PM-UUID-leak + NavBar background + Document Review pattern slots per iter-2 §4.6-§4.9); DIAGNOSTIC-ONLY screenshots with epoch-ms run-id per iter-2 §4.3; JSON output to .planning/qa-runs/wave-d/smoke-results.json per iter-2 §4.1; exit codes 0/1/2 per the contract.

- **scripts/fixtures/smoke-seed.sql shape:** UUID namespace convention per iter-2 §4.4.1 (org=1, users=0, jobs=2, invoices=3, activity_log=4); idempotent via ON CONFLICT; 1 org + 10 profiles/memberships (1 owner + 1 admin + 7 PMs + 1 accounting per iter-2 §3.1) + 10 jobs + 5 invoices (diverse statuses) + 10 activity_log rows.

- **What this DOES NOT do:** Plan D-4 ships the tooling + the supporting artifacts. The script RUNS at Wave-D execute time (after D-1 + D-2 ship the route fixes) AGAINST the preview URL per iter-2 §4.1 lifecycle sequence. The runtime smoke evidence lives in the .planning/qa-runs/wave-d/smoke-results.json artifact, not this plan's SUMMARY.

- **Deferred items (NOT in D-4 scope; tracked as TD):**
  - **TD-WD-02** — Parallel BrowserContext fan-out (per iter-2 §4.13); revisit Layer 4
  - **TD-WD-03** — Empty/loading/error state coverage (per iter-2 §4.15); revisit Layer 4
  - **TD-WD-04** — Mobile viewport coverage (per iter-2 §4.16); revisit Layer 4

- **Wave-B unblock:** Wave-D ship + wave-d-smoke pass + Rules 1-4 codified + plan-review prompt updated = 4 of the 5 Wave-B preconditions per nwrp121.

- **Calibration-log seed:** wave-d-smoke.ts is the first artifact for the Wave 1.1-Full Layer 4 framework (interactive behavioral testing). Reference calibration-log.md lines 93-95.

OPEN-QUESTIONs to surface in SUMMARY:

- **Healthcheck reversion APPLIED per nwrp125 step 5 (2026-05-13):** The /api/healthcheck endpoint reverted to /login warmup target. Task 6 (was healthcheck route) deleted; Task 7 (data-slot/data-pattern-slot JSX patches) renumbered to Task 6. Task count 7→6; files_modified count 11→10. AC-D4-13 rewritten to assert /login warmup success. Commit message: "Wave-D iter-2: revert healthcheck route per nwrp124 step 5. Use /login as warmup target. Conservative path — no new permanent production route introduced for verification harness scope."

- **Watchpoint** for executor: if the `/invoices` 308-redirect assertion fails (e.g. middleware changed during D-1 + D-2 execute), the route should fall back to HTTP 200 + console-clean check rather than HALT — record `status: "fail"` with `console_errors: ["expected HTTP 308, got 200"]` and let Plan D-3 owner reconcile against the corrected smoke packet.

- **Watchpoint** for executor: if `src/components/invoice-review/InvoiceReviewView.tsx` does not exist at the assumed path, Task 6 Edit C (was Task 7 Edit C pre-nwrp125 healthcheck reversion) identifies alternative paths via grep (`grep -rn 'InvoiceReviewView\|invoice.review' src/`). The canonical Document Review surface MAY live at `src/app/financials/bills/[id]/page.tsx` or similar; executor adapts the grep target file at execute-time + records the actual path in SUMMARY.

- **Per iter-2 §4.4 synthetic seed application timing:** smoke-seed.sql is applied via Supabase MCP execute_sql AFTER migrations are applied + BEFORE running wave-d-smoke.ts. Per iter-2 §8 execution order: "Apply synthetic seed via Supabase MCP (post-D-4 commit, against fixture-harness-org on preview)." Document the actual SQL execution in the SUMMARY.
</output>
</content>
</invoke>