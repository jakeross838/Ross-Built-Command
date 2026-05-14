---
name: nightwork-plan-review
description: Plan-level architectural review. Auto-runs at the end of /gsd-plan-phase. Spawns architect + planner + enterprise-readiness + multi-tenant-architect + scalability + compliance + security-reviewer + design-pushback (when applicable) in fresh contexts via Task tool. Critical findings block execute.
argument-hint: "[<phase-number>] [--skip=architect,security,...] [--skip-block]"
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
  - Write
  - Task
---

<objective>
Run plan-level architectural review on the active (or specified) phase. This is the gate between `/gsd-plan-phase` and `/gsd-execute-phase`.

Logic:
1. Read PLAN.md, SPEC.md (if present), and phase metadata.
2. Skip review entirely if phase metadata says `complexity: trivial` (and surface that).
3. Spawn the following in parallel via Task tool, each in a fresh context:
   - architect (ECC agent)
   - planner (ECC agent)
   - nightwork-enterprise-readiness-reviewer
   - nightwork-multi-tenant-architect
   - nightwork-scalability-reviewer (if plan touches queries / hot paths)
   - nightwork-compliance-reviewer (if plan touches PII / financial / audit)
   - security-reviewer (ECC agent)
   - nightwork-design-pushback-agent (if plan touches UI)
4. Synthesize results: critical from any = REVISE-PLAN; single non-critical = warning.
5. Write `.planning/plan-reviews/<phase>-plan-review.md`.
6. Return blocking-or-clean verdict.
</objective>

<arguments>
- Phase number (optional) — defaults to the latest phase with PLAN.md but no MANIFEST.md.
- `--skip=name1,name2` — skip specific reviewers (e.g., `--skip=design-pushback` if you've manually justified).
- `--skip-block` — produce the report but do not halt on critical findings.
</arguments>

<execution>

### Step 1 — Read inputs

- `.planning/phases/<N>/PLAN.md` — required. Abort if missing.
- `.planning/phases/<N>/SPEC.md` — optional but strongly preferred.
- `.planning/phases/<N>/RESEARCH.md` — if present.
- Phase metadata in PLAN.md frontmatter — check for `complexity: trivial` and exit if so.

### Step 2 — Decide reviewer plan

Always:
- architect, planner, nightwork-enterprise-readiness-reviewer, nightwork-multi-tenant-architect, security-reviewer.

Add if PLAN.md mentions queries / aggregations / dashboards / list views / hot paths:
- nightwork-scalability-reviewer.

Add if PLAN.md mentions PII / financial / audit trails / external integrations / encryption / auth flows:
- nightwork-compliance-reviewer.

Add if PLAN.md mentions UI / components / screens / routes / pages:
- nightwork-design-pushback-agent.

Honor `--skip=` overrides.

### Step 3 — Spawn reviewers in parallel

Use a single message with multiple Task calls. Each prompt:
- Provides the phase number, the path to PLAN.md / SPEC.md, and the reviewer's specific brief.
- Tells the reviewer to write its report file (`.planning/phases/<N>/PLAN-REVIEW-<reviewer>.md`) and return a structured summary.

### Step 4 — Wait, collect, synthesize

```
Synthesis rules:
- ANY reviewer reports CRITICAL  → overall = REVISE-PLAN.
- 2+ reviewers report WARNING on same concern  → escalate to REVISE-PLAN.
- Single WARNING from one reviewer  → overall = WARNING.
- All APPROVE  → overall = APPROVE.
```

### Step 5 — Write the consolidated report

Write to `.planning/plan-reviews/<phase>-plan-review.md`:

```markdown
# Plan review — Phase <N>

## PLAN.md summary
<2-3 lines>

## Reviewers run
- <list with verdicts>

## Cross-reviewer concerns (2+ flagged the same)
- <issue> — from <list of reviewers>

## Critical concerns (revise plan)
1. <issue> — from <reviewer>

## Warnings
- <issue>

## Approved with notes
- <reviewer>: <note>

## Overall verdict
<APPROVE | WARNING | REVISE-PLAN>

## Recommended next step
- APPROVE: `/gsd-execute-phase <N>`
- WARNING: address warnings or proceed at user's discretion
- REVISE-PLAN: revise PLAN.md, re-run `/nightwork-plan-review`
```

### Step 6 — Return verdict

Exit code:
- `0` = APPROVE or WARNING.
- `1` = REVISE-PLAN (unless `--skip-block`).

This lets GSD's `plan_gate: true` config halt advancement to execute.
</execution>

<failure_modes>
- Trivial-complexity phases skip review entirely. Output: `Skipped — complexity: trivial.`
- If PLAN.md is missing, abort with a clear error pointing at `/gsd-plan-phase`.
- A reviewer that fails to complete is treated as UNKNOWN = REVISE-PLAN.
</failure_modes>

## Criteria mandate enforcement (per stage-1.5c-verification-harness D-17/D-18)

Every PLAN.md must include a `<criteria>` yaml block. Plan-review aggregates this check across all reviewers (architect, planner, enterprise-readiness, multi-tenant-architect, scalability, compliance, security, design-pushback) and surfaces as a discrete finding.

### Check

For each PLAN.md in the phase:
1. Confirm `<criteria>` ... `</criteria>` block present (regex match the opening + closing tags).
2. Confirm yaml block inside contains all 5 categories (mechanical, dom, visual, behavioral, semantic) — even if some are explicit `N/A`.
3. Confirm at least one entry per applicable category (non-N/A).
4. Specificity check: scan entries for vague patterns ("works", "good", "correct", "renders", "looks right" without specific selectors / state values / commands). Flag as REVISE.

### Verdict integration

- Missing block → BLOCKING finding (`PLAN_MISSING_CRITERIA_BLOCK`)
- Missing category → REVISE finding (`PLAN_MISSING_CATEGORY:<name>`)
- Vague entries (>2 detected) → REVISE finding (`PLAN_VAGUE_CRITERIA`)
- All 5 categories with specific entries → no finding

### 1.5c IA retrofit exemption (per Q6=B)

Plans authored before stage-1.5c-verification-harness ships (specifically, 1.5c IA Plans 1/2/2-amend/3 on `phase/1.5-c-information-architecture` branch) are exempt from this check. The retrofit is a separate ~1-hour follow-up after the harness merges to main.

To detect: check the PLAN's frontmatter `phase:` field. If `stage-1.5c-information-architecture` AND no `<criteria>` block, mark `EXEMPT — Q6=B retrofit pending`.

### Friction-tax watchpoint (per D-18 / plan-review watchpoint #5)

If plan-review iter-1 finds itself flagging >50% of new PLAN files as `PLAN_VAGUE_CRITERIA`, the template is failing — friction tax is real. Surface as a meta-finding: "criteria-template needs better default phrasings for <plan domain>" — extend the template (`.planning/templates/criteria-template.md`) in a follow-up rather than failing every plan.

### Drop-in template

Authors and the planner agent reference `.planning/templates/criteria-template.md` for the canonical drop-in template + 10+ example phrasings + worked examples from stage-1.5c-verification-harness Plans 1-11.

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
