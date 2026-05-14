---
phase: stage-f1-knowledge-graph-auth-wave-d
plan: D-4
plan-name: rules-and-playwright
subsystem: workflow-codification + verification-harness
tags: [rules, playwright-smoke, codification, claude-md, plan-review, ai-logic-tester, fixtures, data-slot]
completed: 2026-05-14
duration: ~13 minutes (single atomic execute pass)
authored: 2026-05-13
authored_by: gsd-planner (claude-opus-4-7[1m])
executed_by: gsd-executor (claude-opus-4-7[1m])

dependency_graph:
  requires:
    - stage-f1-knowledge-graph-auth-wave-d D-1 (PostgREST FK migration 00098 shipped — c84b4a0 path)
    - stage-f1-knowledge-graph-auth-wave-d D-5 (D-078 decision entry shipped — c84b4a0)
    - stage-f1-knowledge-graph-auth-wave-d D-2 (financials AppShell dedup shipped — e79e46e)
  provides:
    - "CLAUDE.md Workflow posture Rules 1-6 codified (verbatim per iter-2 §4.5 + nwrp127 + nwrp130/131)"
    - "CLAUDE.md Architecture posture PostgREST FK citation cross-reference bullet"
    - "CLAUDE.md Domain rules Drummond-vs-synthetic-fixtures exception clause"
    - "CLAUDE.md Development Rules nwrp133 commit-mechanism transparency clarification"
    - "nightwork-plan-review.md Rule 2 + Rule 5 + Rule 6 enforcement sections (PLAN_MISSING_FK_CITATION + PLAN_PARALLEL_FILES_OVERLAP + PLAN_PRECURSOR_VIOLATION finding codes)"
    - "nightwork-ai-logic-tester.md Step 4 runtime-execution mandate + Hard rule + Runtime evidence Output template section"
    - "nightwork-ai-logic-checker SKILL.md Rule 3 runtime-execution contract (iter-2 §4.10 propagation)"
    - "scripts/wave-d-smoke.ts Playwright harness (~590 lines, 13 unique routes, synthetic UUIDs, per-route invariants, /login warmup, WARN on missing bypass secrets, DIAGNOSTIC-ONLY screenshots, JSON output)"
    - "scripts/fixtures/smoke-seed.sql synthetic non-Drummond seed (1 org + 10 profiles/memberships + 10 jobs + 5 invoices + 10 activity_log rows; idempotent via ON CONFLICT)"
    - "src/components/branding/Wordmark.tsx + Icon.tsx data-slot='org-logo' attribute"
    - "src/components/prototypes/InvoiceReviewView.tsx data-pattern-slot='file-preview'/'right-rail'/'audit-timeline' attributes"
    - ".gitignore /.playwright-output/ rule (verification/auth rule already pre-existing)"
  affects:
    - "All future plans with PostgREST embedding hints — plan-review iter-1 now BLOCKS unless FK cited (Rule 2)"
    - "All future plans with parallel_execute_ok: true — plan-review iter-1 now BLOCKS on non-empty files_modified intersection (Rule 5)"
    - "All future plans declaring files_modified — plan-review iter-1 now WARNs on pre-existing hook violations (Rule 6)"
    - "All future /nightwork-qa invocations involving PostgREST/RLS claims — ai-logic-tester now MUST execute representative queries (Rule 3)"
    - "All future UI-touching plans — Rule 4 requires requires_smoke: true front-matter flag + Playwright smoke pre-/nightwork-qa"
    - "All future smoke scripts — synthetic UUIDs via scripts/fixtures/smoke-seed.sql (NOT Drummond/SmartShield) per Domain rules exception"

tech-stack:
  added: [] # no new deps — Playwright 1.59.1 + tsx 4.21.0 already in devDependencies
  patterns:
    - "Rule-based codification — 4 of 6 rules placed in CLAUDE.md Workflow posture subsection per iter-2 §4.5 RELOCATION (originally targeted Development Rules)"
    - "Two-tier mirroring — Rule 3 in agent file (.md) + SKILL.md per iter-2 §4.10 propagation (SKILL.md is runtime authority; agent is conversational interface)"
    - "Synthetic UUID namespace convention per iter-2 §4.4.1 — org=1, users=0, jobs=2, invoices=3, activity_log=4"
    - "Playwright storageState reuse from harness-auth-bootstrap.ts (same auth posture as 3-layer harness)"
    - "DIAGNOSTIC-ONLY screenshots per iter-2 §4.3 — no baseline diff until palette/density stabilize post-CP2 (Wave 1.1-Full Layer 4 deliverable)"
    - "Per-route invariants per iter-2 §4.6-§4.9 — single NavBar, logo placement, DataGrid rows, PM-UUID-leak, NavBar background token, Document Review pattern slots"
    - "Cold-lambda warmup via /login per nwrp124 step 5 reversion (no permanent /api/healthcheck route introduced for verification harness scope)"
    - "Loud WARN on missing bypass secrets per iter-2 §4.12 (does NOT abort)"

key-files:
  created:
    - scripts/wave-d-smoke.ts
    - scripts/fixtures/smoke-seed.sql
    - .planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-4-rules-and-playwright-SUMMARY.md
  modified:
    - CLAUDE.md (4 edits — Workflow posture Rules 1-6; Architecture posture FK cross-reference; Domain rules synthetic-fixtures exception; Development Rules nwrp133 commit-mechanism clarification)
    - .claude/commands/nightwork-plan-review.md (3 new enforcement sections — Rule 2 + Rule 5 + Rule 6)
    - .claude/agents/nightwork-ai-logic-tester.md (Step 4 amended + Hard rule + Runtime evidence template)
    - .claude/skills/nightwork-ai-logic-checker/SKILL.md (Rule 3 runtime-execution contract section + cross-reference note)
    - src/components/branding/Wordmark.tsx (data-slot="org-logo")
    - src/components/branding/Icon.tsx (data-slot="org-logo")
    - src/components/prototypes/InvoiceReviewView.tsx (data-pattern-slot triple)
    - .gitignore (added /.playwright-output/ rule; .planning/verification/auth/ rule already pre-existing)

decisions:
  - "InvoiceReviewView lives at src/components/prototypes/InvoiceReviewView.tsx (per Plan D-4 Task 6 watchpoint — executor confirmed via grep that the canonical path under src/components/invoice-review/ does NOT exist; the prototype location is the actual canonical Document Review surface per Plan 2 of stage-1.5c-verification-harness)"
  - "Schema alignment deviation (Rule 3 — auto-fix blocking issue): plan skeleton in §Task5 cited table `orgs`; actual schema (migration 00016_multi_tenant_foundation.sql) names this `organizations`. Seed targets canonical name."
  - "Schema alignment deviation (Rule 3): profiles.id is FK to auth.users(id) per migration 00007. Synthetic profiles rows require corresponding auth.users entries first. Seed now includes a DO $$ block at Step 1 that bootstraps the 10 synthetic auth.users rows using the migration 00008 pattern (with ON CONFLICT DO UPDATE for idempotency)."
  - "Schema alignment deviation (Rule 3): plan cited `invoices.assigned_pm_id` column; current schema does not have this column. Seed omits assigned_pm_id from invoice INSERTs to preserve idempotency."
  - "Drummond-UUID-comment removal (Rule 1 — bug-equivalent): plan §Task4 included two comment lines documenting the OLD Drummond UUIDs being replaced (audit-trail style). Per the criteria 'Drummond UUIDs MUST be absent per iter-2 §4.4.2', the executor removed those comment lines (replaced with a reference to ITER-2-PATCHES.md §4.4.2 for the audit trail). Drummond UUIDs now appear in zero places in scripts/wave-d-smoke.ts."

metrics:
  duration: "~13 minutes (single atomic execute pass)"
  files_modified: 8
  files_created: 2
  total_files_in_diff: 10
  tasks_completed: 6
  ac_outcomes:
    AC-D4-01: PASS
    AC-D4-02: PASS
    AC-D4-03: PASS
    AC-D4-04: PASS
    AC-D4-05: PASS
    AC-D4-06: PASS
    AC-D4-07: PASS
    AC-D4-08: PASS
    AC-D4-09: PASS
    AC-D4-10: DEFERRED (synthetic seed application to fixture-harness-org via Supabase MCP runs post-commit, pre-D-3 dispatch per iter-2 §8 execution order)
    AC-D4-11: PASS
    AC-D4-12: PASS
    AC-D4-13: DEFERRED (wave-d-smoke.ts warmup ping to /login runs against the live preview URL, which deploys after D-3 ships; smoke run sequenced post-D-3)
---

# Phase stage-f1-knowledge-graph-auth-wave-d Plan D-4: rules-and-playwright Summary

Codified Rules 1-6 (nwrp120 diagnosis + nwrp127 parallel-files + nwrp130/131 precursor-hook + nwrp133 commit-mechanism) into CLAUDE.md Workflow posture / Architecture posture / Domain rules / Development Rules, mirrored the Rule 3 runtime-execution contract into nightwork-plan-review.md enforcement + nightwork-ai-logic-tester.md agent prompt + nightwork-ai-logic-checker SKILL.md, and shipped the Wave-D Playwright smoke harness (scripts/wave-d-smoke.ts + scripts/fixtures/smoke-seed.sql + data-slot/data-pattern-slot JSX attributes) — all 10 files in a single atomic commit. No new dependencies; Playwright 1.59.1 + tsx 4.21.0 already present.

## Tasks completed

### Task 1 — CLAUDE.md surgical edits (4 inserts)

- **EDIT 1 (Workflow posture):** Inserted Rules 1-6 verbatim as 6 bullets appended after the `/nightwork-propagate` bullet. Headers match iter-2 §4.5 canonical text — `Rule 1 — Schema verification ≠ runtime verification`, `Rule 2 — PostgREST FK citation requirement on plans that touch embedded selects`, `Rule 3 — ai-logic-tester executes representative queries`, `Rule 4 — Playwright smoke pre-QA for UI-touching plans`, `Rule 5 — files_modified intersection check before parallel dispatch`, `Rule 6 — precursor hook scan before plan-execute dispatch`.
- **EDIT 2 (Architecture posture):** Inserted one `PostgREST FK citation rule` cross-reference bullet after the `Data portability is first-class` bullet, citing migration 00098 (Wave-D) as the canonical example.
- **EDIT 3 (Domain rules):** Inserted one `Drummond is the reference job for production-facing artifacts ONLY` exception clause documenting that smoke scripts + verification harness fixtures use synthetic seeded UUIDs at `scripts/fixtures/smoke-seed.sql`.
- **EDIT 4 (Development Rules per nwrp133):** Inserted a `Commit mechanism transparency` clarification paragraph under the existing `--no-verify` rule. Distinguishes compound `git add ... && git commit` form (no Jake auth required; hook design at lines 28-30) from `--no-verify` flag (Jake auth required OR pre-push revert). Cites Wave-D D-1 NEAR-MISS (SHA 8af4aa6 → 7b26ddd reset).

Mechanical greps after all 4 edits:
- `grep -c 'Schema verification ≠ runtime verification\|PostgREST FK citation requirement\|ai-logic-tester executes representative queries\|Playwright smoke pre-QA for UI-touching plans' CLAUDE.md` → 4 ✓
- `grep -c 'PostgREST FK citation rule' CLAUDE.md` → 1 ✓
- `grep -c 'Drummond is the reference job for production-facing artifacts' CLAUDE.md` → 1 ✓
- `grep -c 'Commit mechanism transparency' CLAUDE.md` → 1 ✓

### Task 2 — nightwork-plan-review.md enforcement sections

Appended three new sections after the existing `### Drop-in template` block (mirroring the `Criteria mandate enforcement` precedent shape):

- **Rule 2 FK-citation enforcement** — `PLAN_MISSING_FK_CITATION` BLOCKING finding code; tightened regex per iter-2 §4.17 (scans PLAN body AND files_modified .tsx/.ts source files via awk + rg); reviewer reassignment per iter-2 §4.18 (`architect` primary + `database-reviewer` co-primary; `nightwork-multi-tenant-architect` demoted to secondary).
- **Rule 5 files_modified intersection enforcement** — `PLAN_PARALLEL_FILES_OVERLAP` BLOCKING finding code; mechanical set-intersection on files_modified across all parallel-claimed plans in a wave; three documented remediation paths (flip parallel_execute_ok / split plan / worktree isolation).
- **Rule 6 precursor hook scan enforcement** — `PLAN_PRECURSOR_VIOLATION` WARNING (NOT BLOCKING) finding code per Rule 6 friction-tax rationale; embeds complete hook forbidden-pattern set (HEX_HITS, NAMED_HITS, PURE_HITS, LEGACY_HITS, ORG_ID_HITS, ROUNDED, CB4, CB2, SHADOW, PURPLE) with word-boundary anchors per nwrp131 regex-precision refinement; additional `PLAN_PRECURSOR_SCAN_REGEX_NARROWED` WARNING for narrower-regex approximations.

### Task 3 — ai-logic-tester agent + SKILL.md propagation

**Agent file (.claude/agents/nightwork-ai-logic-tester.md):**
- Step 4 ("Actual behavior") amended to split into two cases: non-PostgREST/non-RLS surfaces (code reading OK) vs. PostgREST/RLS surfaces (`execute_sql` runtime query required per Rule 3).
- Hard rules section gained a new bullet: "PostgREST/RLS claims require runtime evidence" with explicit Rule 3 cross-reference.
- Output template gained a new `## Runtime evidence (for PostgREST/RLS claims — Rule 3)` sub-section before the Verdict block.

**SKILL.md (.claude/skills/nightwork-ai-logic-checker/SKILL.md):**
- Added top-of-file cross-reference note: "this skill's operating contract is mirrored from `.claude/agents/nightwork-ai-logic-tester.md`. When both files describe the same rule, this SKILL.md is the runtime authority; agent file is the conversational interface."
- New section `## Rule 3 runtime-execution contract (per Wave-D D-4 / iter-2 §4.10)` inserted before the Cross-references section. Defines what counts as "execute" (Supabase MCP `execute_sql`, curl against preview, `pg_constraint` introspection) and what does NOT count (migration-text reading, code-reading, schema-diagram inspection). Explicit "Inferred-but-unverified claims are explicitly disallowed."

### Task 4 — scripts/wave-d-smoke.ts (NEW, ~590 lines TypeScript)

Playwright smoke harness for 13 unique routes against a Vercel preview URL with harness-fixture@nightwork.local auth. Key behaviors:

- **Auth:** Reuses `HARNESS_AUTH_STATE_PATH` storageState from `scripts/harness-auth-bootstrap.ts`; invokes bootstrap inline via `spawnSync('npx', ['tsx', 'scripts/harness-auth-bootstrap.ts', ...])` if state file missing. Matches the 3-layer harness's single-auth-path posture per D-30. NOT platform_admin.
- **Synthetic UUIDs:** All 13 routes use UUIDs from `scripts/fixtures/smoke-seed.sql`. Drummond UUIDs appear in zero places (confirmed via grep). Audit-trail comments redirect readers to ITER-2-PATCHES.md §4.4.2.
- **Cold-lambda warmup:** Hits `${previewUrl}/login` with 30s timeout before the route loop. WARN on timeout, do NOT abort. Per nwrp124 step 5 reversion of iter-2 §4.14 (conservative path; no permanent /api/healthcheck route introduced).
- **WARN on missing bypass secrets:** Per iter-2 §4.12, prints loud `⚠ ...not set...` warnings if `VERCEL_AUTOMATION_BYPASS_SECRET` or `VERIFICATION_BYPASS_SECRET` is unset. Does NOT abort.
- **Per-route invariants** (per iter-2 §4.6-§4.9):
  - Single NavBar: exactly 1 `header.app-shell-nav, header[data-component="nav-bar"]`; sidebar count ≤1.
  - Logo placement: `header [data-slot="org-logo"]` present + bounding-box `x >= viewportWidth * 0.5`.
  - DataGrid (list routes only): `[role="grid"] [role="row"], tbody tr` count >= 1 OR `[data-state="empty"]` indicator present.
  - PM-UUID-leak: regex check on PM dropdown options for UUID patterns.
  - NavBar background-color token: `getComputedStyle(navBar).backgroundColor` non-transparent.
  - Document Review pattern (pattern: "document-review" routes): `[data-pattern-slot="file-preview"]` + `"right-rail"` + `"audit-timeline"` all present.
- **HTTP-status handling:** `/invoices` asserts HTTP 308 (Next.js `permanent: true` per iter-2 §3.3); all other routes assert 200. Redirect captured via `page.on("response", ...)` listener before navigation follows the redirect.
- **DIAGNOSTIC-ONLY screenshots** per iter-2 §4.3: one per route to `.planning/qa-runs/wave-d/screenshots/<route-slug>-<run-id>.png` with `<run-id>` = `Date.now().toString()`. No baseline diff.
- **JSON output** to `.planning/qa-runs/wave-d/smoke-results.json` per iter-2 §4.1 lifecycle artifact path.
- **Console redaction:** `sk-ant-[A-Za-z0-9_-]+` and `Bearer [A-Za-z0-9_.-]+` substrings stripped before landing in JSON output (mirrors Layer 3 vision-client.ts WARNING-1 amendment pattern).
- **Outer walltime cap:** 10 min via `Promise.race([walk(), setTimeout-reject])`. Per-route timeout 30s. T-D-4-02 mitigation.
- **Exit codes:** 0 = all pass; 1 = any fail/error; 2 = setup error (missing env, invalid URL, bootstrap failure).

### Task 4 (Step B) — .gitignore amendment

Added `/.playwright-output/` rule after the `/screenshots/` block, per iter-2 §4.11. The `.planning/verification/auth/` rule already pre-existed at lines 167-168 (added by stage-1.5c-verification-harness Plan 9 nwrp82); no change needed there. Net new lines: 4.

### Task 5 — scripts/fixtures/smoke-seed.sql (NEW)

Synthetic non-Drummond seed at `scripts/fixtures/smoke-seed.sql`. UUID namespace convention per iter-2 §4.4.1:
- Organizations: `11111111-1111-1111-1111-111111111111`
- Users: `00000000-0000-0000-XXXX-XXXXXXXXXXXX` (X = sequential 0001..000a)
- Jobs: `22222222-2222-2222-2222-XXXXXXXXXXXX`
- Invoices: `33333333-3333-3333-3333-XXXXXXXXXXXX`
- Activity log: `44444444-4444-4444-4444-XXXXXXXXXXXX`

Row counts per iter-2 §4.4.1:
- 1 organization (`Harness Fixture Org`, slug `harness-fixture`)
- 10 profiles (1 owner + 1 admin + 7 PMs Alpha..Eta + 1 accounting)
- 10 org_members (matching memberships)
- 10 jobs (`Smoke Job Alpha..Kappa`)
- 5 invoices (diverse statuses: ai_processed / pm_review / qa_review / in_draw / paid)
- 10 activity_log rows

Idempotency: every INSERT uses `ON CONFLICT (...) DO NOTHING` (or `DO UPDATE` for auth.users to keep email_confirmed_at fresh). Running the file twice produces zero net row changes.

**Schema alignment deviations applied at execute-time (Rule 3 — auto-fix blocking issues):**
1. Plan skeleton cited `orgs` table; actual schema (migration 00016) is `organizations`. Seed targets canonical name.
2. `profiles.id` FKs `auth.users(id)` (migration 00007). Synthetic profile inserts would fail without corresponding auth.users entries. Seed now bootstraps 10 synthetic auth.users rows in Step 1 via a `DO $$ ... BEGIN ... END $$` block mirroring migration 00008's pattern (with ON CONFLICT DO UPDATE for email-confirmed-at idempotency).
3. Plan cited `invoices.assigned_pm_id` column; current schema does not have this column. INSERT omits the column.
4. `activity_log` uses `created_at` (default NOW()), not `occurred_at` (which the plan skeleton showed). Aligned.
5. `org_members` requires `accepted_at` per the constraint pattern; added `NOW()` for all rows.

### Task 6 — JSX data-slot + data-pattern-slot attributes

- **src/components/branding/Wordmark.tsx:** Added `data-slot="org-logo"` attribute to root `<svg>` element (after `style={mergedStyle}`, before existing `data-color={color}`). No visual or behavior change.
- **src/components/branding/Icon.tsx:** Added `data-slot="org-logo"` attribute to root `<svg>` element (after `style={style}`). No visual or behavior change.
- **src/components/prototypes/InvoiceReviewView.tsx:** Added three `data-pattern-slot` attributes per iter-2 §4.9 + §6.4:
  - File preview LEFT wrapper `<div>` at the LEFT column of the hero 50/50 grid → `data-pattern-slot="file-preview"`
  - Right rail wrapper `<div>` at the RIGHT column of the hero 50/50 grid → `data-pattern-slot="right-rail"`
  - Status timeline `<Card padding="md">` BELOW the hero grid → `data-pattern-slot="audit-timeline"` (Card extends HTMLAttributes<HTMLDivElement>; the attribute flows through `{...rest}` to the rendered `<div>`)

  No visual or behavior change. The component continues to render identically per CONTEXT D-07 visual-parity bar.

**Path watchpoint resolved:** Plan D-4 Task 6 cited `src/components/invoice-review/InvoiceReviewView.tsx` as the assumed canonical path; that directory does NOT exist. Executor grep confirmed the actual canonical Document Review surface lives at `src/components/prototypes/InvoiceReviewView.tsx` (per Plan 2 of stage-1.5c-verification-harness D-06; commented in the file header at lines 1-9). The components playground at `/design-system/prototypes/invoices/[id]` and production routes at `/financials/bills/[id]` both consume this canonical View component.

## Acceptance criteria outcomes

All 11 locally verifiable ACs pass. The 2 runtime-dependent ACs are DEFERRED per Plan D-4 sequencing — the wave-d-smoke harness runs against the live Vercel preview URL after D-3 ships per iter-2 §4.1 lifecycle sequence.

| AC | Status | Evidence |
|---|---|---|
| AC-D4-01 | PASS | CLAUDE.md Workflow posture contains Rules 1-6 as ordered bullets appended after /nightwork-propagate (verified line 615+) |
| AC-D4-02 | PASS | `grep -c 'Schema verification ≠ runtime verification' CLAUDE.md` → 1 |
| AC-D4-03 | PASS | `grep -c 'PostgREST FK citation requirement' CLAUDE.md` → 1 |
| AC-D4-04 | PASS | `grep -c 'ai-logic-tester executes representative queries' CLAUDE.md` → 1 |
| AC-D4-05 | PASS | `grep -c 'Playwright smoke pre-QA for UI-touching plans' CLAUDE.md` → 1; Architecture posture cross-reference + Domain rules exception clause both present |
| AC-D4-06 | PASS | nightwork-plan-review.md contains "## Rule 2 FK-citation enforcement" with `PLAN_MISSING_FK_CITATION` BLOCKING + tightened regex + `architect` primary + `database-reviewer` co-primary |
| AC-D4-07 | PASS | ai-logic-tester.md Step 4 differentiates surfaces; new Hard rule bullet; Output template "Runtime evidence" sub-section. SKILL.md mirrors Rule 3 contract per iter-2 §4.10. |
| AC-D4-08 | PASS | scripts/wave-d-smoke.ts exists at documented path |
| AC-D4-09 | PASS | `npx tsc --noEmit` → 0 errors. Script includes: 13 routes (synthetic UUIDs); /login warmup; loud WARN on missing bypass secrets; per-route invariants (NavBar + logo + DataGrid + UUID-leak + Document Review); DIAGNOSTIC-ONLY screenshots with epoch-ms run-id; JSON output to .planning/qa-runs/wave-d/smoke-results.json. |
| AC-D4-10 | DEFERRED | Synthetic seed application to fixture-harness-org via Supabase MCP runs post-commit, pre-D-3 dispatch per iter-2 §8 execution order. Seed file is idempotency-clean per ON CONFLICT analysis. |
| AC-D4-11 | PASS | `data-slot="org-logo"` present on rendered root <svg> of Wordmark.tsx (line 88) AND Icon.tsx (line 37) |
| AC-D4-12 | PASS | `data-pattern-slot` triple present on InvoiceReviewView.tsx: file-preview (LEFT div), right-rail (RIGHT div), audit-timeline (outer Card) |
| AC-D4-13 | DEFERRED | wave-d-smoke.ts warmup ping to /login runs against the live preview URL, which deploys after D-3 ships. Code path implemented + tested via typecheck; runtime evidence sequenced post-D-3. |

## Deviations from Plan

### Auto-fixed Issues (Rule 1/2/3 — applied inline at execute-time)

**1. [Rule 3 — Auto-fix blocking issue] Schema-alignment deviation in smoke-seed.sql**
- **Found during:** Task 5 — pre-write schema review
- **Issue:** Plan skeleton cited `orgs` (not `organizations`), assumed `profiles` could be inserted independently (it FKs auth.users), assumed `invoices.assigned_pm_id` exists (it does not), and used `occurred_at` for activity_log (actual column is `created_at`).
- **Fix:** Aligned seed to actual current-schema column lists. Added a `DO $$ ... BEGIN ... END $$` Step 1 block that bootstraps the 10 synthetic auth.users rows via the migration-00008 pattern; this lets the synthetic profiles inserts succeed in the same transaction. Omitted `assigned_pm_id` from invoice INSERTs. Used `created_at` (implicit DEFAULT NOW()) for activity_log.
- **Why this counts as Rule 3:** The plan's contract was "idempotent via ON CONFLICT DO NOTHING; re-running produces zero net row changes." Without the auth.users bootstrap, the profiles INSERTs would error out on first run with an FK violation, breaking the contract. This is a blocking issue surfaced during write — fixed inline without scope creep.
- **Files modified:** scripts/fixtures/smoke-seed.sql (single-file change)
- **Schema-alignment notes documented** in the seed file header for future reference.

**2. [Rule 1 — Bug-equivalent] Drummond UUID comment removal in wave-d-smoke.ts**
- **Found during:** Task 4 — mechanical grep verification
- **Issue:** Plan §Task4 included two TypeScript comment lines documenting the OLD Drummond UUIDs being replaced (audit-trail style: `// OLD: /financials/bills/7c63cf40-... / NEW: /financials/bills/33333333-...`). The plan's mechanical criteria says `grep -c '7c63cf40-...|a1bb4d28-...' scripts/wave-d-smoke.ts` MUST return 0 ("Drummond UUIDs MUST be absent per iter-2 §4.4.2").
- **Fix:** Removed the literal Drummond UUIDs from the comments; replaced with `Per iter-2 §4.4.2: synthetic invoice UUID (Drummond UUID NOT used here — see ITER-2-PATCHES.md §4.4.2 for the replacement audit trail).` The audit-trail intent is preserved (readers know there was a replacement) without putting Drummond UUIDs in the file. Now passes the literal mechanical check.
- **Files modified:** scripts/wave-d-smoke.ts

**3. [Watchpoint resolution] InvoiceReviewView canonical path**
- **Found during:** Task 6 — pre-edit grep
- **Issue:** Plan §Task6 Edit C cited `src/components/invoice-review/InvoiceReviewView.tsx` as the assumed path; the plan itself flagged this as a watchpoint ("if the InvoiceReviewView component does not exist at the assumed path, identify alternative paths via grep").
- **Fix:** Grep located the actual file at `src/components/prototypes/InvoiceReviewView.tsx`. Per file header (lines 1-9): "InvoiceReviewView — Document Review pattern exemplar (Stage 1.5c Plan 2 + AMENDMENT per nwrp48). Pure props-only View component. Plan 3 implementers COPY THIS PATTERN VERBATIM..." Production routes at `/financials/bills/[id]` and design-system route at `/design-system/prototypes/invoices/[id]` both consume this canonical View.
- **Adjustment:** Updated execution to target the prototypes/ path; no scope creep, attributes added as planned.
- **Files modified:** src/components/prototypes/InvoiceReviewView.tsx

No other deviations. Plan executed exactly as authored.

## Authentication gates encountered

None — this plan operates entirely on local file edits + git commit. No external auth surfaces touched (Supabase MCP runs post-commit, sequenced per iter-2 §8).

## Files modified summary

| File | Type | Lines changed | Notes |
|---|---|---|---|
| CLAUDE.md | modified | +86 | 4 surgical edits (Workflow posture Rules 1-6; Architecture posture FK cross-reference; Domain rules synthetic-fixtures exception; Development Rules nwrp133 clarification) |
| .claude/commands/nightwork-plan-review.md | modified | +138 | 3 enforcement sections appended (Rule 2 + Rule 5 + Rule 6) |
| .claude/agents/nightwork-ai-logic-tester.md | modified | +15 | Step 4 split + Hard rule bullet + Runtime evidence template section |
| .claude/skills/nightwork-ai-logic-checker/SKILL.md | modified | +22 | Cross-reference note + Rule 3 runtime-execution contract section |
| .gitignore | modified | +5 | /.playwright-output/ rule (verification/auth pre-existing) |
| src/components/branding/Wordmark.tsx | modified | +1 | data-slot="org-logo" |
| src/components/branding/Icon.tsx | modified | +1 | data-slot="org-logo" |
| src/components/prototypes/InvoiceReviewView.tsx | modified | +14 / -4 | data-pattern-slot triple |
| scripts/wave-d-smoke.ts | NEW | +590 | Playwright harness for 13 routes |
| scripts/fixtures/smoke-seed.sql | NEW | +163 | Synthetic non-Drummond seed |

Net: 8 modified + 2 created = **10 files** (matches plan files_modified count).

## Verification results

- `npm run build`: PASS (0 errors, 0 warnings; final exit code 0)
- `npx tsc --noEmit`: PASS (0 errors; final exit code 0)
- `.claude/hooks/nightwork-post-edit.sh` against Wordmark.tsx / Icon.tsx / InvoiceReviewView.tsx / wave-d-smoke.ts: ALL SILENT (exit 0)
- All 12 mechanical greps from the dispatch context: PASS
- Drummond grep gate on staged diff: silent (no Drummond identifiers anywhere)
- Privacy gate: no sk-ant-*, no Bearer literals, no service-role-key references in new files
- Synthetic UUIDs in scripts/wave-d-smoke.ts: 2 (`33333333-...-300000000001` + `22222222-...-200000000001`)
- Drummond UUIDs in scripts/wave-d-smoke.ts: 0
- Drummond UUIDs in scripts/fixtures/smoke-seed.sql: 0

## Self-Check: PASSED

Final mechanical pre-commit checks (each ✓ = item verified in the working tree before commit):

- ✓ `test -f scripts/wave-d-smoke.ts`
- ✓ `test -f scripts/fixtures/smoke-seed.sql`
- ✓ `test -f .planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-4-rules-and-playwright-SUMMARY.md`
- ✓ `grep -c 'Schema verification ≠ runtime verification\|PostgREST FK citation requirement\|ai-logic-tester executes representative queries\|Playwright smoke pre-QA for UI-touching plans' CLAUDE.md` → 4
- ✓ `grep -c 'PostgREST FK citation rule' CLAUDE.md` → 1
- ✓ `grep -c 'Drummond is the reference job for production-facing artifacts' CLAUDE.md` → 1
- ✓ `grep -c 'Commit mechanism transparency' CLAUDE.md` → 1
- ✓ `grep -cE 'PLAN_MISSING_FK_CITATION|PLAN_PARALLEL_FILES_OVERLAP|PLAN_PRECURSOR_VIOLATION' .claude/commands/nightwork-plan-review.md` → 9 (3+ each via 3 sections)
- ✓ `grep -c 'execute_sql' .claude/agents/nightwork-ai-logic-tester.md` → 3
- ✓ `grep -c 'execute_sql' .claude/skills/nightwork-ai-logic-checker/SKILL.md` → 2
- ✓ `grep -c '/.playwright-output/' .gitignore` → 1
- ✓ `grep -c '.planning/verification/auth/' .gitignore` → 2 (pre-existing pair)
- ✓ `grep -c 'data-slot="org-logo"' src/components/branding/Wordmark.tsx` → 1
- ✓ `grep -c 'data-slot="org-logo"' src/components/branding/Icon.tsx` → 1
- ✓ `grep -c 'data-pattern-slot="file-preview"\|data-pattern-slot="right-rail"\|data-pattern-slot="audit-timeline"' src/components/prototypes/InvoiceReviewView.tsx` → 3
- ✓ `npm run build` exits 0
- ✓ `npx tsc --noEmit` exits 0

## Open follow-ups

- **AC-D4-10 + AC-D4-13 runtime evidence:** wave-d-smoke.ts execution against the live Vercel preview URL is sequenced after D-3 ships per iter-2 §4.1 lifecycle. The synthetic seed application via Supabase MCP runs post-commit, pre-D-3 dispatch per iter-2 §8 execution order. Both deferred to D-3 + preview-deploy phase.
- **Wave-B preconditions:** Wave-D ship + wave-d-smoke pass + Rules 1-6 codified + plan-review prompt updated = 4 of the 5 Wave-B preconditions per nwrp121. Final gate completes after D-3 + preview smoke pass.
- **Deferred TD items** (NOT in D-4 scope; tracked):
  - TD-WD-02 — Parallel BrowserContext fan-out (per iter-2 §4.13); revisit Layer 4
  - TD-WD-03 — Empty/loading/error state coverage (per iter-2 §4.15); revisit Layer 4
  - TD-WD-04 — Mobile viewport coverage (per iter-2 §4.16); revisit Layer 4
- **Wave 1.1-Full Layer 4 seed:** wave-d-smoke.ts is the first Playwright-script-against-preview-URL artifact outside the 3-layer harness. Reference calibration-log.md lines 93-95 (F1+ harness extension entry).
