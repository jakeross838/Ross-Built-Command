---
phase: stage-f1-hook-doc-only-detect
plan: HDOD
plan-name: hook-doc-only-detect-extension-allowlist
type: execute
wave: standalone (chore phase, single-plan)
depends_on: []
autonomous: true
halt_after: true  # GATE substantive review by Jake before /nx ship per nwrp191 §17
requires_smoke: false
threat_model_severity: low
status: AUTHORED + ITER-2 AMENDMENTS APPLIED — PENDING JAKE REVIEW AT PLAN-REVIEW ITER-2
authored: 2026-05-19; 2026-05-20 iter-2 amendments applied per nwrp192
authored_by: gsd-planner via /np dispatch (nwrp191); iter-2 amendments via /np re-dispatch (nwrp192)
authorization: nwrp189 pre-authorized scope + nwrp190 EXPANDED-SCOPE approved + nwrp191 /np dispatch authorization + nwrp192 Option B resolution authorization
iter-2-amendments_applied: 2026-05-20 per nwrp192
source_decisions:
  - "EXPANDED-SCOPE Q1=C / Q2=B+Amendment 1 / Q3=A / Q4=B / Q5=C+Amendment 2 / Q6=A (APPROVED 2026-05-19 per nwrp190)"
  - "EXPANDED-SCOPE Q2 Amendment 1 correction (2026-05-20 per nwrp192) — supersedes original Amendment 1 reasoning; `.sh`-enforces wins per three-reason resolution at nwrp192 §3-12"
  - "nwrp192 Option B resolution: `.sh`-enforces; path regex restricted to `.(md|txt)$` for `.claude/hooks/` + `.claude/skills/`"
  - "TD-NW-HOOK-DOC-ONLY-DETECT @ MASTER-PLAN §11 row 314 (origin nwrp163/166/169 three-occurrence pattern)"
  - "Workflow posture Rule 8 hook fail-closed contract (CLAUDE.md)"
  - "nwrp190 §17-22 AC-HDOD-13 split resolution (13a fresh-QA-timestamp ship + 13b throwaway doc-only test commit)"
  - "nwrp192 §19 — AC-HDOD-13a wording stands as originally framed; AC-HDOD-13b remains meaningful (proves `.md` skip path)"
requirements: []
files_modified:
  - .claude/hooks/nightwork-pre-commit.sh  # ~30-40 lines bash addition + ~5-12 lines header comment (Option B regex restriction adds ~3-5 lines vs Amendment-1-as-originally-written)
  - .planning/phases/stage-f1-hook-doc-only-detect/HDOD-SUMMARY.md  # ship-time SUMMARY artifact (N-2 fix per iter-1 spec-checker)
files_referenced:
  - .planning/expansions/stage-f1-hook-doc-only-detect-EXPANDED-SCOPE.md  # updated 2026-05-20 per nwrp192 §17 with Amendment 1 correction
  - .planning/expansions/stage-f1-hook-doc-only-detect-SETUP-COMPLETE.md
  - .planning/expansions/stage-f1-hook-doc-only-detect-AUTO-LOG.md
  - .planning/phases/stage-f1-hook-doc-only-detect/PLAN-REVIEW-ITER1-SPEC-CHECK.md
  - .planning/phases/stage-f1-hook-doc-only-detect/PLAN-REVIEW-ITER1-CUSTODIAN.md
  - .planning/phases/stage-f1-hook-doc-only-detect/PLAN-REVIEW-ITER1-SECURITY.md
  - .planning/phases/stage-f1-hook-doc-only-detect/PLAN-REVIEW-ITER1-SYNTHESIS.md
  - .planning/MASTER-PLAN.md §11 row 314 (TD-NW-HOOK-DOC-ONLY-DETECT)
  - CLAUDE.md Workflow posture Rules 7/8/9
  - .claude/hooks/nightwork-pre-commit.sh existing lines 43-50 (path-allowlist branch — UNION target per Q1=C)
  - .claude/hooks/nightwork-pre-commit.sh existing lines 65-92 (Drummond grep gate — MUST remain byte-identical per AC-HDOD-11)
  - .claude/hooks/nightwork-pre-commit.sh existing lines 94-133 (qa-timestamp + verdict checks — the gate being pre-empted on doc-only diffs)
sequence:
  before: Slice-2 B-2 dispatch (per nwrp182 scheduling — hook calibration ships BEFORE Slice-2 to prevent further `--no-verify` bypass pattern accumulation)
  after: Wave-A iter-1 cleanup ship (RESOLVED 2026-05-19 per `ee9e1bc` + `56de959` + `a8ae5b1`)
  parallel_authoring_ok: n/a (single plan)
  parallel_execute_ok: false (single bash file edit; serial only — no overlap, no concurrency surface)
acceptance-criteria-target: 17 falsifiable items (AC-HDOD-01..AC-HDOD-12 + AC-HDOD-13a + AC-HDOD-13b + AC-HDOD-14 + AC-HDOD-15 + AC-HDOD-16)
qa_reviewers:
  - spec-checker
  - custodian
  - security-reviewer  # included because hook is a discipline gate
---

# Plan HDOD — Hook doc-only detection extension-allowlist

## 1. Goal

Close **TD-NW-HOOK-DOC-ONLY-DETECT** (`.planning/MASTER-PLAN.md` §11 row 314).
Eliminate the structural pressure that drove four `--no-verify` bypass events
across nwrp163/166/169 + F1-Wave-A by teaching the Claude-Bash-tool pre-commit
hook (`.claude/hooks/nightwork-pre-commit.sh`) to recognise doc-only commits
and skip the qa-runs timestamp + verdict checks for them — while preserving
the fail-closed posture (Workflow posture Rule 8) for any commit that touches
production application code OR executable discipline-gate infrastructure.

Mechanism: add an **extension-allowlist + path-allowlist union branch** (per
Jake-locked Q1=C) immediately after the existing line 43-50 path-allowlist
branch. If every file in `git diff --cached --name-only` matches EITHER an
allowed doc extension (`.md`, `.txt`, `.gitignore`, `LICENSE`, `CHANGELOG`,
`README`, `.editorconfig`) OR a doc-bearing path (`.planning/`, `docs/`,
`.claude/agents/`, `.claude/commands/` — broad; `.claude/hooks/.*\.(md|txt)$`,
`.claude/skills/.*\.(md|txt)$` — RESTRICTED to docs only per nwrp192 Option B
resolution), the hook exits 0 before reaching the qa-timestamp check. ANY file
matching NEITHER list (per Jake-locked Q3=A strict-mixed posture) — including
ANY `.sh` / `.py` / `.js` / `.json` / `.css` / `.html` / `.jsx` under
`.claude/hooks/` or `.claude/skills/` — falls through to the existing gate
logic unchanged.

The Drummond grep gate (lines 65-92) MUST remain byte-identical per
AC-HDOD-11. The env-flag escape hatches (lines 9-10) MUST remain unchanged.
The `--no-verify` Jake-authorisation rule (CLAUDE.md Dev Rules) MUST remain
unchanged. The 60-minute QA freshness threshold (line 120) MUST remain
unchanged per Q6=A.

## 2. Why now / dependencies

- **Sequencing rationale (per nwrp182):** ship BEFORE Wave-B Slice-2 B-2
  dispatch. Slice-1 closed 2026-05-18; Wave-A iter-1 cleanup shipped
  2026-05-19 (`ee9e1bc` + `56de959` + `a8ae5b1`). The hook calibration
  closes the structural pressure that has been driving `--no-verify` bypass
  citations through four events; if it does not ship before Slice-2, the
  Slice-2 plans will accumulate further bypass-citations during their own
  authoring + ship cycles, eroding gate discipline.
- **Three-occurrence pattern (per Q4=B precedent):** TD-NW-HOOK-DOC-ONLY-
  DETECT was opened after nwrp163 → reinforced at nwrp166 → triggered the
  Q4=B "three-occurrence re-trigger if pattern repeats" rule at nwrp169.
  Pattern is confirmed; remediation is now in scope.
- **Independent of Slice-2 in execution dependency graph:** Slice-2 plans
  touch DB / RLS / multi-tenant surfaces, not the hook file. No file
  collision; no functional coupling. The discipline benefit (lower bypass
  citation rate) is what ties them in sequence.
- **No new entities, no destructive operations:** pure bash edit to a single
  file. No DB migration, no fixture data, no FK, no RLS, no env vars, no
  npm dependencies, no CI workflows, no schema regeneration. Per
  SETUP-COMPLETE.md, the inventory derivation was **0 AUTO + 0 MANUAL**.

## 3. Pre-flight downstream-consumer-sweep

Per CLAUDE.md Workflow posture: all plans MUST include downstream sweep
before execute dispatch. For this plan, three search vectors:

### Sweep 1 — direct file-path references

```bash
# Search for any source-of-truth consumer that references the hook file
grep -rn "nightwork-pre-commit\.sh\|\.claude/hooks/nightwork-pre-commit" \
  src/ scripts/ .github/workflows/ supabase/ 2>/dev/null
```

**Findings (mechanical at plan-author time):**

| Hit | File | Disposition |
|---|---|---|
| 1 | `scripts/sanitize-drummond.ts:8` (comment block) | Documentation comment naming Tier-1.5 hook arrangement; no behavioural dependency. UNCHANGED — comment remains accurate post-edit. |
| 2 | `.github/workflows/drummond-grep-check.yml` (workflow file) | Parallel CI gate (NOT a consumer of this hook); runs Drummond grep independently on `main`. UNCHANGED — no interaction with qa-timestamp logic. |

**Zero hits in `src/` (application code) — confirms the hook is a discipline
gate, not an application dependency.** No application code calls the hook
or depends on its skip path.

### Sweep 2 — existing doc-only references in command / skill files

```bash
grep -rn "doc-only\|doc_only" .claude/ .planning/MASTER-PLAN.md 2>/dev/null
```

**Findings:**

| Hit | File | Disposition |
|---|---|---|
| 1 | `.claude/commands/nightwork-plan-review.md:286` | Plan-review hook-finding posture: "doc-only plans with no hook-scanned surfaces → finding N/A (vacuous PASS)". Already aligned with this plan's posture. UNCHANGED. |
| 2 | `.planning/MASTER-PLAN.md:314` (TD-NW-HOOK-DOC-ONLY-DETECT row) | The canonical TD this plan closes. Custodian post-ship task marks CLOSED with shipped commit SHA. |

### Sweep 3 — Workflow posture Rule 8 references (the discipline contract being preserved)

The new branch must be cited as a calibrated exception, NOT a posture change.
Post-ship custodian task (per Q5=C) appends Rule 8(e) sub-clause. This sweep
is mentioned for completeness — nothing to change in CLAUDE.md as part of
this slice's commit boundary.

### Hook regex sweep on `files_modified` (per CLAUDE.md Rule 6 sub-check (a))

`files_modified` = `.claude/hooks/nightwork-pre-commit.sh` + new
`HDOD-SUMMARY.md` (planning artifact). The hook file is a bash script,
NOT a `.tsx` / `.ts` / `.css` / JSX surface. Design-token + hex + NwWordmark
+ ROUNDED + CB4 + CB2 + SHADOW + PURPLE + LEGACY hooks do not apply to bash
files (the hook scanners run on JSX/TSX/CSS source surfaces). The SUMMARY.md
is a planning artifact under `.planning/` — also out of scope for design-
token hooks. **N/A — no design-token concerns for bash script + planning
SUMMARY edits.**

### Pre-flight files_modified intersection check (Rule 5)

This plan declares `parallel_execute_ok: false`. No intersection check
required. Single-file edit; serial only.

### Pre-flight summary

**No blocking findings. Sweep is clean. Plan-execute may proceed once
plan-review iter-2 closes.**

## 4. Structural approach (per AC-HDOD-12 mandatory declaration)

**Choice: UNCHANGED-AND-AUGMENTED with a new separate branch placed
IMMEDIATELY AFTER the existing lines 43-50 path-allowlist branch.**

Rationale:

1. **Atomic rollback boundary.** A separate branch is a pure additive diff
   (new lines ~50.5..N). If the new branch misbehaves on any of the 10
   scenario tests, the rollback is a single `git revert`; existing lines
   43-50 behaviour is unaffected.
2. **Clean reviewer audit surface.** Plan-review iter-2 + /nightwork-qa
   reviewers can diff the change in isolation — every new line is the new
   contract; nothing existing was touched. This is the cleanest possible
   pattern for a discipline-gate calibration.
3. **Back-compat preservation (AC-HDOD-08 + AC-HDOD-09).** Commits that
   pass today via the existing path-allowlist (`.planning/`, `docs/`,
   `README`, `CHANGELOG`, `.gitignore`) continue to pass via the existing
   branch — they exit 0 at line 48 before the new branch is reached. The
   new branch is an ADDITIONAL gate, not a REPLACEMENT.
4. **Q1=C union semantics preserved (with nwrp192 Option B mechanical
   restriction).** Per Jake-locked Q1=C, the doc-only skip applies when
   "every file matches EITHER an allowed extension OR an allowed path." Per
   nwrp192 Option B resolution: the path-allowlist regex for `.claude/hooks/`
   and `.claude/skills/` is RESTRICTED to `.(md|txt)$` — only documentation
   files under those paths skip; `.sh` / `.py` / `.js` / `.json` / `.css` /
   `.html` / `.jsx` files fall through to QA gate. The union is mechanically
   realised across the two branches in sequence: first branch checks paths
   per existing line 46 set; second branch checks extensions + the corrected
   path set; either passing the union → exit 0. The mechanical contract is
   that **executable code (`.sh`) enforces; prose (`.md` / `.txt` / config)
   skips** — Option B preserves this clean mental model (rationale in §6
   T-HDOD-03 disposition).

**Alternative considered + REJECTED:** merging lines 43-50 into a single
unified union branch. Rejected because (a) it inflates the diff surface,
(b) it introduces silent behaviour-change risk for commits that pass today
via lines 43-50 (AC-HDOD-08 / -09 would become harder to attest
mechanically), (c) the atomic-rollback boundary is muddier — partial revert
of a merged branch loses both the path-allowlist AND the new extension
logic.

### Final path-allowlist contract (per nwrp192 §17 + orchestrator sweep)

The mechanical contract the executor MUST implement:

| Path | Restriction | Rationale |
|---|---|---|
| `^\.planning/` | broad (no extension restriction) | Planning artifacts are documentation by convention |
| `^docs/` | broad | Project docs directory; documentation by convention |
| `^\.claude/agents/` | broad | At HEAD, contains ONLY `.md` agent definitions; future executable additions would be uncommon per Claude Code convention |
| `^\.claude/commands/` | broad | At HEAD, contains ONLY `.md` slash command definitions; same convention as agents |
| `^\.claude/hooks/.*\.(md\|txt)$` | RESTRICTED | Mixed: contains `.sh` executables. Only docs (`.md`/`.txt`) under this path skip; `.sh` falls through. |
| `^\.claude/skills/.*\.(md\|txt)$` | RESTRICTED | Mixed: contains `.sh`/`.py`/`.js`/`.json`/`.css`/`.html`/`.jsx` (per `continuous-learning-v2/` + `impeccable/scripts/`). Only docs skip. |

**Diff shape (preview, executor authors verbatim at execute time):**

```bash
# EXISTING (lines 43-50) — UNCHANGED
# Allow .planning/-only and docs/-only commits (no source change → no QA needed)
STAGED=$(git diff --cached --name-only 2>/dev/null || true)
if [ -n "$STAGED" ]; then
  NON_PLANNING=$(echo "$STAGED" | grep -vE "^(\.planning/|docs/|README|CHANGELOG|\.gitignore)" || true)
  if [ -z "$NON_PLANNING" ]; then
    exit 0
  fi
fi

# NEW (lines ~50.5..N) — AUGMENTED EXTENSION-ALLOWLIST UNION BRANCH
# See header comment block above for the doc-only-skip contract.
# Union with the path-allowlist above per nwrp190 Q1=C.
# .claude/hooks/ and .claude/skills/ are RESTRICTED to .(md|txt) per
# nwrp192 Option B resolution — `.sh`-enforces wins. See §6 T-HDOD-03.
if [ -n "$STAGED" ]; then
  NON_DOC=$(echo "$STAGED" | grep -vE \
    '(\.md$|\.txt$|\.gitignore$|/LICENSE$|^LICENSE$|/CHANGELOG(\.[a-zA-Z]+)?$|^CHANGELOG(\.[a-zA-Z]+)?$|/README(\.[a-zA-Z]+)?$|^README(\.[a-zA-Z]+)?$|\.editorconfig$|^\.editorconfig$|^\.claude/agents/|^\.claude/commands/|^\.claude/hooks/.*\.(md|txt)$|^\.claude/skills/.*\.(md|txt)$)' \
    || true)
  if [ -z "$NON_DOC" ]; then
    exit 0
  fi
fi
# Fall through to Drummond grep gate + qa-timestamp + verdict checks
# for any commit touching non-allowlist files (per Q3=A strict-mixed) —
# including `.sh` / `.py` / `.js` / `.json` / `.css` / `.html` / `.jsx`
# under `.claude/hooks/` or `.claude/skills/` (per nwrp192 Option B).
```

**Hook-doc-vs-hook-executable discipline (per nwrp192 Option B resolution,
supersedes original Amendment 1):**

The `.claude/hooks/` path inclusion above is for documentation files
(`.md` / `.txt`) inside that directory ONLY. **A `.sh` file under
`.claude/hooks/` does NOT match the new path-allowlist regex
`^\.claude/hooks/.*\.(md|txt)$`** — `.sh` files fall through to the
existing gate logic (Drummond + qa-timestamp + verdict).

This is **the corrected mechanical contract per nwrp192 §3-12 Jake-
authored resolution.** Three reasons (per nwrp192):

1. **Hook files are executable discipline infrastructure.** A change to
   `nightwork-pre-commit.sh` modifies the gate enforcing everything else.
   The one place "skip" is most dangerous is exactly the gate that does
   the enforcing. `.sh`-enforces is the safer default.
2. **Sign-off-cycle discipline operates INDEPENDENTLY of the QA timestamp
   gate.** The nwrp160/161 three-cycle sign-off happened via surface-for-
   Jake-review per Rule 8 — that works regardless of whether the QA
   timestamp gate fires. We don't need hooks doc-only-skippable for sign-
   off discipline to function. The original Amendment 1 conflated two
   independent things.
3. **Option B preserves the clean mental model:** executable code (`.sh`)
   enforces; prose (`.md` / `.txt` / config) skips. Option A (broad-path
   skip) muddied this ("hooks skip despite being executable").

**The same restriction applies to `.claude/skills/`** per orchestrator
sweep — that directory contains mixed `.sh` / `.py` / `.js` / `.json` /
`.css` / `.html` / `.jsx` content (see `continuous-learning-v2/` +
`impeccable/scripts/`), so the same `.(md|txt)$` restriction prevents
the analogous leak vector.

`.claude/agents/` and `.claude/commands/` remain BROAD (no extension
restriction) because both contain ONLY `.md` files at HEAD per Claude
Code convention; orchestrator sweep confirmed this.

**Cross-reference:** AC-HDOD-13a wording stands as originally framed (per
nwrp192 §19) — the `.sh`-containing ship commit enforces the QA timestamp
gate and passes via fresh QA timestamp (because this chore plan's own
`/nightwork-qa` cycle writes a fresh report before the ship commit lands).
AC-HDOD-13b throwaway doc-only test remains meaningful (proves `.md`
skip path works mechanically).

## 5. Implementation tasks

### Task 1 — Author the doc-only-skip branch + header comment block

**Files modified:** `.claude/hooks/nightwork-pre-commit.sh` (single file).

**Estimated diff:** ~30-40 lines bash for the new branch + ~5-12 lines for
the header comment block = ~35-52 lines total. (Option B regex restriction
adds ~3-5 lines vs the original Amendment-1-as-written reading.)

**Sub-steps:**

1. **Header comment block (insert after line 5, before the env-flag block):**

   ```bash
   # ---
   # Doc-only-skip contract (per stage-f1-hook-doc-only-detect, nwrp190 Q1=C / Q2=B / Q3=A;
   # nwrp192 Option B Amendment 1 correction — `.sh`-enforces wins):
   #
   # If every file in `git diff --cached --name-only` matches either an allowed
   # doc extension OR an allowed doc-bearing path, skip the qa-runs timestamp
   # check + verdict check below. ANY file matching neither list → fall through
   # to the existing gate (Drummond grep gate + qa-timestamp both fire
   #   normally for non-doc-only diffs; doc-only-skip exits cleanly
   #   BEFORE Drummond is reached — see §6 LOW-severity rationale #5).
   #
   # Allowed extensions: .md, .txt, .gitignore, LICENSE, CHANGELOG, README,
   # .editorconfig (with or without dotted suffix variants).
   # Allowed paths (BROAD — match all files under prefix):
   #   .planning/, docs/, .claude/agents/, .claude/commands/
   # Allowed paths (RESTRICTED to .md/.txt only — per nwrp192 Option B):
   #   .claude/hooks/  — contains .sh executables; `.sh` falls through to gate
   #   .claude/skills/ — contains .sh/.py/.js/.json/.css/.html/.jsx; only docs skip
   #
   # Origin: TD-NW-HOOK-DOC-ONLY-DETECT (MASTER-PLAN §11 row 314); three-
   # occurrence pattern nwrp163/166/169 + F1-Wave-A bypass events.
   # Discipline contract: Workflow posture Rule 8 fail-closed (CLAUDE.md).
   # Hook-edit discipline (per nwrp192 Option B / Amendment 1 correction):
   #   `.sh` edits under .claude/hooks/ ENFORCE the QA timestamp gate; they
   #   are executable discipline infrastructure and modifying the gate that
   #   enforces everything else must carry QA evidence. Sign-off-cycle
   #   discipline (Rule 8 + nwrp160/161 three-cycle precedent) operates
   #   independently via surface-for-Jake-review, so `.sh`-enforces does
   #   NOT weaken hook-change discipline.
   # ---
   ```

2. **New union branch (insert IMMEDIATELY AFTER existing line 50, BEFORE
   the Drummond grep gate at existing line 52):**

   Implement the `grep -vE` shape shown in §4 above. Verify regex is
   correctly anchored (`^` for path-prefix matches, `$` for extension-suffix
   matches) and that filename-only matches (`LICENSE` / `CHANGELOG` /
   `README` at repository root) AND nested matches (`vendor/LICENSE`) both
   resolve correctly via the `^X$|/X$` pair. **CRITICAL: the `.claude/hooks/`
   and `.claude/skills/` regex MUST be the restricted `.*\.(md|txt)$`
   form, NOT the broad `^\.claude/hooks/` form.** Verify with mechanical
   regex test against `.claude/hooks/nightwork-pre-commit.sh` →
   `NON_DOC` MUST be non-empty (i.e., `.sh` file does NOT match, falls
   through to gate).

3. **`bash -n` syntax check** (in-task verification):

   ```bash
   bash -n .claude/hooks/nightwork-pre-commit.sh && echo SYNTAX_OK
   ```

4. **No other lines touched.** The Drummond grep gate (existing lines
   65-92), qa-timestamp check (existing lines 94-133), and exit 0 at line
   165 MUST remain byte-identical.

**Commit boundary:** this task = one atomic commit. Commit message format:
`chore(hook): add doc-only-skip union branch (TD-NW-HOOK-DOC-ONLY-DETECT)`.

**Verify:** AC-HDOD-01 (syntax) + AC-HDOD-10 (header comment block content)
+ AC-HDOD-11 (Drummond gate unchanged) + AC-HDOD-12 (structural approach).

**Done:** file modified, syntax check passes, header comment block matches
spec, diff-walk confirms unchanged sections are byte-identical.

### Task 2 — Manual scenario walk (10 representative diff scenarios)

**Files modified:** none (verification only; no commit boundary).

**Method:** for each scenario, simulate the staged diff in a scratch
worktree (or use `git diff --cached --name-only` against a temporary
staging area), invoke the modified hook with a synthetic `tool_input`
payload, and observe the exit code.

**CRITICAL execute-time discipline (per iter-1 spec-checker W-2 carry-
forward):** Each scenario MUST use REAL `git add` staging to populate
the staged diff before piping the payload to the hook. Shortcutting to
empty `STAGED` produces FALSE PASSes — the existing path-allowlist branch
at line 47 trivially exits 0 when `STAGED` is empty (the `[ -n "$STAGED" ]`
guard is false → falls through both branches → reaches qa-timestamp gate,
which may exit 0 if a fresh report exists). The failure mode: a scenario
walk that "passes" because the hook never saw any staged files at all.
Mechanical discipline: for each scenario row, executor logs the output of
`git diff --cached --name-only` BEFORE invoking the hook; the output MUST
match the scenario's expected staged file list. If `git diff --cached
--name-only` returns empty, FAIL the scenario row and re-stage.

**Scenarios + expected outcomes:**

| # | Scenario | Staged files | Expected exit | Resolves AC |
|---|---|---|---|---|
| i | Pure `.md` | `foo.md` | 0 (skip via new branch) | AC-HDOD-02 |
| ii | Pure `.txt` | `notes.txt` | 0 (skip via new branch) | AC-HDOD-03 |
| iii | Pure code `.ts` | `src/foo.ts` | non-zero (fall through to qa-timestamp gate; behaviour unchanged for code-only) | AC-HDOD-04 |
| iv | Mixed `.md` + `.ts` | `foo.md`, `src/foo.ts` | non-zero (Q3=A strict-mixed; `src/foo.ts` falls outside both allowlists → enforce) | AC-HDOD-05 |
| v | `.claude/agents/foo.md` only | `.claude/agents/foo.md` | 0 (skip via new branch; matches both extension AND path) | AC-HDOD-06 |
| vi | Root `LICENSE` only | `LICENSE` | 0 (skip via new branch; matches `^LICENSE$`) | AC-HDOD-07 |
| vii | `.planning/expansions/foo.md` only | `.planning/expansions/foo.md` | 0 (skip via existing branch line 46; back-compat) | AC-HDOD-08 |
| viii | `.gitignore` only | `.gitignore` | 0 (skip via existing branch line 46; back-compat) | AC-HDOD-09 |
| ix | `.claude/hooks/foo.sh` only | `.claude/hooks/foo.sh` | non-zero (per nwrp192 Option B; restricted regex does NOT match `.sh` → falls through to gate) | AC-HDOD-15 |
| x | `.claude/skills/foo/scripts/foo.py` only | `.claude/skills/foo/scripts/foo.py` | non-zero (per nwrp192 Option B; restricted regex does NOT match `.py` → falls through to gate) | AC-HDOD-16 |

**Scenarios iii, iv, ix, x are CRITICAL:** they verify the fail-closed
posture for code-bearing AND executable-discipline-infrastructure
commits. If ANY returns exit 0 (skip-path), the new branch has a regex
gap and is a stealth bypass. Halt + surface to Jake.

**Implementation note:** the hook reads its input from stdin (JSON
`tool_input.command`). For scenario simulation, executor pipes a synthetic
JSON payload (`{"tool_input":{"command":"git commit -m 'test'"}}`) to the
hook AFTER staging the scenario's file set via REAL `git add`. Hook reads
`git diff --cached --name-only` from the current working directory.
**Per iter-1 spec-checker W-2:** verify `git diff --cached --name-only`
returns the expected list BEFORE invoking the hook; empty result =
re-stage, do NOT proceed (trivial pass via empty-STAGED branch).

**Commit boundary:** this task = no commit (verification only). Findings
recorded in HDOD-SUMMARY.md.

**Verify:** all 10 scenarios produce expected exit codes.

**Done:** scenario walk table fully attested with PASS/FAIL per row;
HDOD-SUMMARY.md records the command transcripts including the
pre-invocation `git diff --cached --name-only` output per row.

### Task 3 — Throwaway doc-only test commit (AC-HDOD-13b proof)

**Files modified:** none persistent (proof-only; commit gets discarded).

**Method:** in a scratch worktree OR via `git stash`-style isolation,
stage a `.md`-only change and attempt `git commit` via the Claude Bash
tool with the modified hook installed. Observe that the hook exits 0 via
the doc-only-skip branch (not via the existing `.planning/`-only branch
— use a `.md` file outside the existing path-allowlist, e.g. a temporary
`.claude/agents/throwaway.md` or a temp `notes.txt` at repo root).

**Confirm:** hook exit 0; commit lands locally in scratch space; QA
timestamp gate NOT exercised.

**Cleanup (per iter-1 security-reviewer LOW-2 precision request):**
explicit sequence required BEFORE any push operation:

```bash
git reset --soft HEAD~1   # unwind the throwaway commit, keep file staged
git restore --staged <throwaway-file>  # unstage the throwaway file
rm <throwaway-file>        # delete the throwaway file from working tree
# DO NOT push. Verify with: git log -1 --format=%H
# should show the PRE-throwaway HEAD, not the throwaway SHA.
```

Record command transcript in HDOD-SUMMARY.md.

**Critical:** this is NOT the slice's ship commit. The ship commit
(AC-HDOD-13a) contains the `.sh` hook edit + this PLAN.md + HDOD-SUMMARY.md;
the `.sh` edit is explicit-NO per nwrp192 Option B (Amendment 1 corrected
— `.sh`-enforces wins). The ship commit MUST pass via fresh QA timestamp
legitimately, NOT via the doc-only-skip path.

**Commit boundary:** this task = throwaway commit created + discarded.
NO commit to `main`. NO push.

**Verify:** AC-HDOD-13b (skip-path-works demonstration with command
transcript in HDOD-SUMMARY.md, including explicit `git reset --soft HEAD~1`
+ `rm` cleanup transcript).

**Done:** doc-only commit demonstrably exits 0 via new branch; throwaway
discarded; no leakage to repo history; cleanup transcript captured.

### Task 4 — Authoring HDOD-SUMMARY.md + AC attestation + ship commit

**Files modified:** `.planning/phases/stage-f1-hook-doc-only-detect/HDOD-SUMMARY.md` (new file).

**Sub-steps:**

1. Author `HDOD-SUMMARY.md` recording:
   - Implementation choices made during execute (structural approach
     confirmation, any regex tweaks from Task 2 scenario discoveries).
   - Scenario walk results (Task 2 transcript — 10 scenarios, including
     pre-invocation `git diff --cached --name-only` output per row).
   - Throwaway test commit transcript (Task 3, including cleanup).
   - AC-by-AC attestation table (PASS/FAIL/N/A per AC-HDOD-01..12 +
     AC-HDOD-13a + AC-HDOD-13b + AC-HDOD-14 + AC-HDOD-15 + AC-HDOD-16).
   - Cost spend so far.
2. Run `/nightwork-qa stage-f1-hook-doc-only-detect` (3 reviewers per cap:
   spec-checker + custodian + security-reviewer). Confirm fresh
   qa-report.md timestamp.
3. Stage the ship commit: `.claude/hooks/nightwork-pre-commit.sh` +
   `.planning/phases/stage-f1-hook-doc-only-detect/HDOD-PLAN.md` +
   `.planning/phases/stage-f1-hook-doc-only-detect/HDOD-SUMMARY.md`.
4. `git commit -m "chore(hook): close TD-NW-HOOK-DOC-ONLY-DETECT — doc-only-skip union branch"`.
   The hook fires; the `.sh` file in the diff is non-doc-only (per
   nwrp192 Option B; `.sh` does NOT match the restricted
   `^\.claude/hooks/.*\.(md|txt)$` regex) → falls through to qa-timestamp
   check → fresh report from step 2 passes → commit lands.
5. `git push origin main`.

**Commit boundary:** this task = ONE ship commit (atomic).

**Verify:** AC-HDOD-13a (fresh-QA-timestamp ship) + AC-HDOD-14 (custodian
task logged in MASTER-PLAN §12 NEXT PLANNED WORK).

**Done:** ship commit on `main`; QA-report disk-evidence captured;
HDOD-SUMMARY.md complete with AC attestation table; MASTER-PLAN §12 NEXT
PLANNED WORK lists the custodian task per Q5=C + Amendment 2.

## 6. Threat model

**Severity:** LOW

**Trust boundary:** the modified hook is a developer-side discipline gate
(Claude-Bash-tool PreToolUse). No application-runtime trust boundary
crossed. No tenant data exposed. No RLS surface touched. No external
network calls. No new dependencies.

### Option B vs Option A — rationale for nwrp192 Jake-authored resolution

Plan-review iter-1 (2026-05-20) surfaced that the original Amendment 1
(EXPANDED-SCOPE Q2 Amendment 1 as authored per nwrp190 §11-12) was
mechanically unimplementable under Q1=C union semantics: a broad
`^\.claude/hooks/` path regex matches ALL files under that path,
including `.sh` executables. The Amendment 1 prose said `.sh` was
"explicit-NO" but the implementation contract carried no mechanical
enforcement of that intent.

**Rule 9 cross-reviewer factual disagreement triggered HALT** —
spec-checker interpreted as deliberate trade-off; security-reviewer
mechanically tested the regex and found contradiction with AC-HDOD-13a.
Mechanical reality (canonical source per Rule 9): security-reviewer
correct.

**Jake's resolution (nwrp192 §3-12): Option B — restrict the regex.**
Three reasons:

1. **Hook files are executable discipline infrastructure.** Modifying
   the gate that enforces everything else should carry QA evidence;
   `.sh`-enforces is the safer default.
2. **Sign-off-cycle discipline operates INDEPENDENTLY of the QA
   timestamp gate.** The nwrp160/161 three-cycle sign-off happened via
   surface-for-Jake-review per Rule 8 — that works regardless of
   whether the QA timestamp gate fires.
3. **Option B preserves the clean mental model:** executable code
   (`.sh`) enforces; prose (`.md`/`.txt`/config) skips. Option A muddied
   this.

The orchestrator sweep extended the same restriction to `.claude/skills/`
(mixed contents — see context table in EXPANDED-SCOPE §6 Q2 corrected
Amendment 1) and confirmed `.claude/agents/` + `.claude/commands/`
remain safe to skip broadly (both contain ONLY `.md` at HEAD per Claude
Code convention).

### STRIDE register

| Threat ID | Category | Component | Disposition | Mitigation |
|---|---|---|---|---|
| T-HDOD-01 | T (Tampering) | New union branch regex | mitigate | Q3=A strict-mixed posture: ANY non-allowlist file in diff → fall through to qa-timestamp gate. Scenario tests iii + iv + ix + x (Task 2) explicitly verify code-bearing AND executable-discipline-infrastructure commits do NOT skip. Plan-review iter-2 + /nightwork-qa security-reviewer audit the regex. Per nwrp192 Option B, `.claude/hooks/` and `.claude/skills/` regex are RESTRICTED to `.(md|txt)$` — mechanical enforcement of `.sh`-enforces, not convention-only. |
| T-HDOD-02 | I (Information disclosure) | Hook script edit visibility | accept | Hook source is git-tracked + public-to-team; no secret material. Header comment block documents the contract publicly. |
| T-HDOD-03 | E (Elevation of privilege) | `.sh` edit qualifying as doc-only-skip path | **mitigate (per nwrp192 Option B)** | Per nwrp192 Option B Amendment 1 correction: hook executable `.sh` edits do NOT match the path-allowlist regex (restricted to `.(md|txt)$`) and DO fall through to the qa-timestamp gate. Mechanical enforcement, not convention-only. Sign-off-cycle discipline (Rule 8 + nwrp160/161 three-cycle precedent) operates independently via surface-for-Jake-review. **Note on Drummond gate order:** the Drummond grep gate (lines 65-92) fires AFTER the doc-only-skip branches; for diffs that exit via doc-only-skip (e.g., pure `.md`), the Drummond gate is NOT reached — but this is acceptable because the Drummond regex is path-scoped to `src/app/design-system/_fixtures/drummond/` and doc-only-skip can only fire when zero files in that fixture path are staged. For diffs that fall through doc-only-skip (e.g., any `.sh` under `.claude/hooks/`, or any code file), the Drummond gate fires unconditionally before qa-timestamp. **No regression in Drummond protection.** |
| T-HDOD-04 | D (Denial of service) | Regex gap allowing `--no-verify`-equivalent stealth bypass | mitigate | (a) Explicit short allowlist (per Q2=B); reviewer can visually audit regex against the list. (b) Scenario walk Task 2 includes representative code-bearing AND executable-infrastructure diffs (scenarios iii, iv, ix, x). (c) `git diff --cached --name-only` failure falls-closed per CLAUDE.md Rule 8c (preserved by existing hook structure). (d) Per nwrp192 Option B, `.sh` files under `.claude/hooks/` mechanically enforce — no convention-only attestation. (e) Bypass-counter telemetry deferred per Q4=B; three-occurrence re-trigger if pattern surfaces. |
| T-HDOD-05 | S (Spoofing) | Synthetic `tool_input` to dodge hook | N/A | Out-of-band concern: a developer who can craft synthetic JSON for the Bash-tool PreToolUse hook can also pass `--no-verify` directly. Not a new attack surface. |
| T-HDOD-06 | R (Repudiation) | Audit trail of doc-only-skip exercise | accept | Today no audit trail per Q4=B defer. Commit SHAs in git log are the audit record; downstream QA catches any code-file slip-through. If pattern of stealth bypass surfaces, file follow-up TD for telemetry. |
| T-HDOD-07 | (pre-existing) | Newline-in-filename edge case in `grep -vE` pipe | accept (pre-existing) | Per iter-1 security-reviewer LOW-1: a filename containing an embedded newline could split into multiple grep-matched and grep-non-matched parts. This is a pre-existing characteristic of the line-43-50 branch (inherited; not introduced by this plan). Real attack surface is negligible (creating a file with embedded newline requires deliberate adversarial action with shell access). NO fix in this scope. |
| T-HDOD-08 | (theoretical) | `foo.sh.md` compound extension | accept (theoretical) | Per iter-1 security-reviewer INFO-1: a file named `foo.sh.md` would match the `.md$` extension regex and skip the gate. Real attack surface is negligible (would require deliberate naming intent to bypass; no legitimate workflow produces compound `.sh.md` extensions). Flagged for awareness; no fix in this scope. |

### LOW-severity rationale (per EXPANDED-SCOPE recommendation #4)

1. **Doc-only-skip cannot affect production application code.** Any code
   file in the diff (Q3=A strict-mixed) forces fall-through to qa-timestamp
   gate. Code-bearing commits cannot skip.
2. **Doc-only-skip cannot affect executable discipline infrastructure
   (per nwrp192 Option B).** `.sh` files under `.claude/hooks/` and
   `.sh`/`.py`/`.js`/`.json`/`.css`/`.html`/`.jsx` files under
   `.claude/skills/` mechanically fall through to gate — the restricted
   regex `^\.claude/{hooks,skills}/.*\.(md|txt)$` does not match them.
3. **Env-flag escape hatches unchanged.** Lines 9-10 (`NIGHTWORK_HOOKS_DISABLE` /
   `NIGHTWORK_PRECOMMIT_DISABLE`) preserved; operator-side emergency-exit
   posture intact.
4. **`--no-verify` Jake-authorisation rule untouched.** CLAUDE.md Dev Rules
   `--no-verify` requires explicit Jake per-incident authorisation; this
   plan does NOT modify that rule. Doc-only-skip is an EXPLICIT GATE PATH,
   not a `--no-verify` substitute.
5. **Drummond grep gate (lines 65-92) untouched.** Sanitised-fixture
   protection fires AFTER the doc-only-skip branches in flow order — for
   diffs that exit via doc-only-skip, the Drummond gate is NOT reached;
   for diffs that fall through, the Drummond gate fires unconditionally
   before qa-timestamp. This is acceptable because the Drummond gate's
   purpose is to protect `src/app/design-system/_fixtures/drummond/` files
   from real-name leakage; doc-only-skip can only fire when zero files in
   that fixture path are staged. The fixture-path-scoped Drummond regex
   (line 67) is fired against `git grep --cached -nE "$DRUMMOND_PATTERN"
   -- 'src/app/design-system/_fixtures/drummond/'` — and the doc-only-skip
   branch fires only when `git diff --cached --name-only` contains zero
   files matching that path prefix (because `src/` is not in any
   allowlist). Therefore the doc-only-skip cannot allow a Drummond leak:
   the diff that skips contains NO `src/` files, and the Drummond regex
   is path-scoped to `src/app/design-system/_fixtures/drummond/`. **No
   regression in Drummond protection.**
6. **60-min QA freshness threshold (line 120) untouched** per Q6=A.
7. **CLAUDE.md Workflow posture Rule 8 unchanged.** Doc-only-skip is a
   calibrated exception, not a posture change. Rule 8(e) sub-clause append
   is post-ship custodian task (Q5=C + Amendment 2).

## 7. Test plan

**No automated test harness exists for the hook today.** Per chore-plan
posture and EXPANDED-SCOPE §4 cross-cutting checklist row "CI test gate
APPLIES (LIGHT)", the test plan is:

1. **`bash -n` syntax check** (AC-HDOD-01).
2. **Manual scenario walk** for 10 representative diffs (Task 2 — AC-HDOD-02
   through AC-HDOD-09 + AC-HDOD-15 + AC-HDOD-16).
3. **Throwaway doc-only test commit** (Task 3 — AC-HDOD-13b).
4. **Real-world ship commit** demonstrates fresh-QA-timestamp pass path
   (Task 4 — AC-HDOD-13a).

`requires_smoke: false` is acceptable BECAUSE the hook is itself the
trigger surface — manual scenario walks ARE the smoke for this slice. No
Playwright surface; no UI; no API endpoint.

**Execute-time discipline (per iter-1 spec-checker W-2):** Each scenario
MUST use REAL `git add` staging. Executor verifies `git diff --cached
--name-only` returns the scenario's expected list BEFORE invoking the
hook. Empty `STAGED` produces a FALSE PASS via the existing line-47
branch (trivially exits 0 on empty diff). See Task 2 implementation note.

### Test command transcript (executor MUST capture in HDOD-SUMMARY.md)

```bash
# AC-HDOD-01 syntax
bash -n .claude/hooks/nightwork-pre-commit.sh && echo SYNTAX_OK

# AC-HDOD-02 .. AC-HDOD-09 + AC-HDOD-15 + AC-HDOD-16 scenario walks
# For each of 10 scenarios, the executor:
#   1. Sets up scratch worktree OR uses git stash to isolate.
#   2. Stages the scenario's file set via REAL `git add` (per spec-checker W-2).
#   3. Captures `git diff --cached --name-only` output (verifies non-empty).
#   4. Pipes synthetic tool_input JSON to the hook.
#   5. Records exit code.
# Example for scenario i (pure .md):
git add foo.md
git diff --cached --name-only   # expect: foo.md  (non-empty — REAL stage)
echo '{"tool_input":{"command":"git commit -m test"}}' | \
  CLAUDE_PROJECT_DIR=$(pwd) bash .claude/hooks/nightwork-pre-commit.sh
echo "exit=$?"  # expect 0

# Example for scenario ix (.claude/hooks/foo.sh) — NEW per nwrp192 Option B:
mkdir -p .claude/hooks && touch .claude/hooks/foo.sh
git add .claude/hooks/foo.sh
git diff --cached --name-only   # expect: .claude/hooks/foo.sh
echo '{"tool_input":{"command":"git commit -m test"}}' | \
  CLAUDE_PROJECT_DIR=$(pwd) bash .claude/hooks/nightwork-pre-commit.sh
echo "exit=$?"  # expect non-zero (falls through to qa-timestamp gate)

# Example for scenario x (.claude/skills/foo/scripts/foo.py) — NEW per nwrp192 Option B:
mkdir -p .claude/skills/foo/scripts && touch .claude/skills/foo/scripts/foo.py
git add .claude/skills/foo/scripts/foo.py
git diff --cached --name-only   # expect: .claude/skills/foo/scripts/foo.py
echo '{"tool_input":{"command":"git commit -m test"}}' | \
  CLAUDE_PROJECT_DIR=$(pwd) bash .claude/hooks/nightwork-pre-commit.sh
echo "exit=$?"  # expect non-zero (falls through to qa-timestamp gate)

# AC-HDOD-11 Drummond gate byte-identical check
git diff HEAD~1 .claude/hooks/nightwork-pre-commit.sh | \
  grep -E '^[-+].*(DRUMMOND_PATTERN|DRUMMOND_HITS|REASON=|Real Drummond)' | wc -l
# expect 0 lines (no diff to Drummond gate region)
```

## 8. Acceptance criteria

**17 falsifiable items.** AC-HDOD-13 split into 13a + 13b per nwrp190
§17-22 resolution (the resolution language in §17-22 is reproduced verbatim
in 13a and 13b below). AC-HDOD-15 + AC-HDOD-16 added per nwrp192 Option B
resolution to mechanically attest the `.sh`-enforces + `.py`/etc.-enforces
contracts on `.claude/hooks/` and `.claude/skills/` paths.

| AC | Description | Verification |
|---|---|---|
| AC-HDOD-01 | `bash -n .claude/hooks/nightwork-pre-commit.sh` returns exit 0 (syntax clean). | `bash -n .claude/hooks/nightwork-pre-commit.sh && echo PASS` |
| AC-HDOD-02 | Scenario test #i (pure `.md` diff) — hook returns exit 0 (skip via new branch). | Scenario walk transcript in HDOD-SUMMARY.md row i, including pre-invocation `git diff --cached --name-only` confirmation. |
| AC-HDOD-03 | Scenario test #ii (pure `.txt` diff) — hook returns exit 0 (skip via new branch). | Scenario walk transcript row ii. |
| AC-HDOD-04 | Scenario test #iii (pure code `.ts` diff) — hook falls through to existing qa-timestamp check (behaviour unchanged for code-only commits). | Scenario walk transcript row iii; expect non-zero exit (BLOCK if no fresh QA report) OR exit 0 only if a fresh QA report exists. |
| AC-HDOD-05 | Scenario test #iv (mixed `.md` + `.ts`) — hook falls through to existing qa-timestamp check (strict-mixed posture per Q3=A). | Scenario walk transcript row iv; expect non-zero exit (BLOCK) OR fresh-QA pass. |
| AC-HDOD-06 | Scenario test #v (`.claude/agents/foo.md` only) — hook returns exit 0 (skip via new branch). | Scenario walk transcript row v. |
| AC-HDOD-07 | Scenario test #vi (root `LICENSE` only) — hook returns exit 0 (skip via new branch). | Scenario walk transcript row vi. |
| AC-HDOD-08 | Scenario test #vii (`.planning/expansions/foo.md` only) — hook returns exit 0 (skip via existing branch line 46; back-compat preserved). | Scenario walk transcript row vii. |
| AC-HDOD-09 | Scenario test #viii (`.gitignore` only) — hook returns exit 0 (skip via existing branch line 46; back-compat preserved). | Scenario walk transcript row viii. |
| AC-HDOD-10 | Header comment block enumerates: extension allowlist, path allowlist (broad set + restricted set), fail-closed posture for ambiguity, origin nwrp citations (163/166/169), Workflow posture Rule 8 cross-reference, hook-doc-vs-hook-executable discipline note (per nwrp192 Option B Amendment 1 correction — `.sh`-enforces wins). | Diff-walk of header block; reviewer confirms all six items present, AND that the hook-doc-vs-hook-executable note reflects nwrp192 Option B (NOT the original Amendment 1 reasoning). |
| AC-HDOD-11 | Drummond grep gate (existing hook lines 65-92) verified UNCHANGED in diff — `DRUMMOND_PATTERN` regex + `DRUMMOND_HITS` `git grep` + `REASON` message + `node` JSON-emit shape ALL byte-identical. | `git diff` of hook lines 65-92 region shows zero changes; `git diff HEAD~1` filtered grep returns zero lines (see §7 test command transcript). |
| AC-HDOD-12 | Structural approach UNCHANGED-AND-AUGMENTED-BY-NEW-BRANCH (per §4 declaration); existing line 43-50 path-allowlist branch is BYTE-IDENTICAL post-edit; new union branch is a SEPARATE bash `if [ -n "$STAGED" ]; then ... fi` block placed IMMEDIATELY AFTER line 50 and BEFORE the Drummond gate. | Diff-walk confirms lines 43-50 byte-identical; new branch is additive block. |
| AC-HDOD-13a | **Ship commit (which contains the `.sh` hook edit) passes via fresh-QA-timestamp legitimately.** The chore plan's own `/nightwork-qa` cycle writes a fresh qa-runs report; when the ship commit lands, the QA timestamp gate passes legitimately (NOT via doc-only-skip — `.sh` is explicit-NO per nwrp192 Option B; the path-allowlist regex `^\.claude/hooks/.*\.(md|txt)$` mechanically does NOT match `nightwork-pre-commit.sh`, so the file falls through to gate). | Ship commit lands on `main` with no `--no-verify`; fresh qa-report timestamp in `.planning/qa-runs/` matches the commit timestamp within 60min. |
| AC-HDOD-13b | **Separate throwaway doc-only test commit demonstrates the skip path works.** Commit a `.md`-only change (use a temp file outside the existing path-allowlist — e.g. a temporary `.claude/agents/throwaway.md` or a temp `notes.txt`), confirm hook returns exit 0 via doc-only-skip branch, then DISCARD the throwaway via explicit `git reset --soft HEAD~1` followed by `git restore --staged <file>` + `rm <file>`. Do NOT push. | Command transcript in HDOD-SUMMARY.md documents the proof: staged file list + synthetic `tool_input` payload + exit 0 + cleanup commands (explicit `git reset --soft HEAD~1` + `rm`). |
| AC-HDOD-14 | Post-ship custodian task logged in `.planning/MASTER-PLAN.md` §12 NEXT PLANNED WORK — TWO items (per Q5=C + Amendment 2): (a) append CLAUDE.md Workflow posture Rule 8(e) sub-clause documenting doc-only-skip carve-out; (b) evaluate Rules 7/8/9 + Orchestration discipline subsection extraction to `.planning/discipline/*.md` given CLAUDE.md 45.1k > 40k size warning. NOT executed in this slice; named in queue. | `grep -n "Rule 8(e)\|discipline extraction" .planning/MASTER-PLAN.md` returns ≥2 hits in §12. |
| AC-HDOD-15 | **Scenario test #ix (`.claude/hooks/foo.sh` only) — hook falls through to existing qa-timestamp check** (per nwrp192 Option B; restricted regex `^\.claude/hooks/.*\.(md|txt)$` does NOT match `.sh` → mechanical enforcement of `.sh`-enforces, NOT convention-only). | Scenario walk transcript row ix; expect non-zero exit (BLOCK if no fresh QA report) OR exit 0 only if a fresh QA report exists. |
| AC-HDOD-16 | **Scenario test #x (`.claude/skills/foo/scripts/foo.py` only) — hook falls through to existing qa-timestamp check** (per nwrp192 Option B; restricted regex `^\.claude/skills/.*\.(md|txt)$` does NOT match `.py` → same `.sh`-enforces principle applied to `.claude/skills/` mixed-content tree). | Scenario walk transcript row x; expect non-zero exit OR fresh-QA pass. |

## 9. Verification commands (executor MUST run before claiming AC pass)

```bash
# AC-HDOD-01 syntax check
bash -n .claude/hooks/nightwork-pre-commit.sh && echo AC-HDOD-01_PASS

# AC-HDOD-02 .. AC-HDOD-09 + AC-HDOD-15 + AC-HDOD-16 scenario walk template
# (executor repeats for each of 10 scenarios with appropriate staged files)
# Per spec-checker W-2: use REAL `git add` staging, verify diff is non-empty.
STAGED_FILES="<scenario-specific list>"
git add <scenario-files>
git diff --cached --name-only   # verify non-empty; matches expected list
echo '{"tool_input":{"command":"git commit -m test"}}' | \
  CLAUDE_PROJECT_DIR="$(pwd)" bash .claude/hooks/nightwork-pre-commit.sh; \
  echo "exit=$?"

# AC-HDOD-15 specific verification (`.sh` under .claude/hooks/ falls through)
mkdir -p .claude/hooks && touch .claude/hooks/test-foo.sh
git add .claude/hooks/test-foo.sh
git diff --cached --name-only   # expect: .claude/hooks/test-foo.sh
echo '{"tool_input":{"command":"git commit -m test"}}' | \
  CLAUDE_PROJECT_DIR="$(pwd)" bash .claude/hooks/nightwork-pre-commit.sh; \
  echo "exit=$?"  # expect non-zero (fall through to gate)
# Cleanup: git restore --staged .claude/hooks/test-foo.sh && rm .claude/hooks/test-foo.sh

# AC-HDOD-16 specific verification (`.py` under .claude/skills/ falls through)
mkdir -p .claude/skills/test-foo/scripts && touch .claude/skills/test-foo/scripts/foo.py
git add .claude/skills/test-foo/scripts/foo.py
git diff --cached --name-only   # expect: .claude/skills/test-foo/scripts/foo.py
echo '{"tool_input":{"command":"git commit -m test"}}' | \
  CLAUDE_PROJECT_DIR="$(pwd)" bash .claude/hooks/nightwork-pre-commit.sh; \
  echo "exit=$?"  # expect non-zero (fall through to gate)
# Cleanup: git restore --staged ... && rm -rf .claude/skills/test-foo

# AC-HDOD-10 header comment block content check
grep -v '^#' .claude/hooks/nightwork-pre-commit.sh > /tmp/hook-no-comments.sh
# Then check that header (filtered separately) has the required tokens:
grep -cE "Doc-only-skip contract|Allowed extensions|Allowed paths|nwrp163|Rule 8|nwrp192|Option B|sign-off-cycle" \
  .claude/hooks/nightwork-pre-commit.sh
# Expected: ≥8 (one match per enumerated item, including the nwrp192 Option B reference).
# Hygiene note: grep -c counts ALL lines including the header itself (per CLAUDE.md grep-gate
# hygiene). Use grep -v '^#' filter when running invariants on production code regions.

# AC-HDOD-11 Drummond gate byte-identical
git show HEAD:.claude/hooks/nightwork-pre-commit.sh | sed -n '65,92p' > /tmp/drummond-before.txt
sed -n '65,92p' .claude/hooks/nightwork-pre-commit.sh > /tmp/drummond-after.txt
# NOTE: line numbers will SHIFT in the modified file due to inserted lines above.
# Verification instead uses content-anchor:
diff <(git show HEAD:.claude/hooks/nightwork-pre-commit.sh | \
        awk '/^DRUMMOND_PATTERN=/,/^fi$/{print; if(/^fi$/) exit}') \
     <(awk '/^DRUMMOND_PATTERN=/,/^fi$/{print; if(/^fi$/) exit}' \
        .claude/hooks/nightwork-pre-commit.sh)
# Expected: empty diff (Drummond gate region byte-identical).

# AC-HDOD-12 structural approach check
git diff HEAD .claude/hooks/nightwork-pre-commit.sh | \
  grep -E '^[-]' | grep -vE '^---' | wc -l
# Expected: 0 (purely additive diff; no removed lines except diff header).

# AC-HDOD-13a ship-commit-via-fresh-QA verification
ls -t .planning/qa-runs/*qa-report*.md | head -1
# Expected: a recent qa-report.md generated by this slice's /nightwork-qa cycle.
git log -1 --format=%cI .claude/hooks/nightwork-pre-commit.sh
# Expected: ship commit timestamp within 60min of latest qa-report mtime.

# AC-HDOD-13b throwaway test commit transcript
# (recorded in HDOD-SUMMARY.md — no live command at AC-time; transcript is the artefact)
# Cleanup sequence MUST include:
#   git reset --soft HEAD~1
#   git restore --staged <throwaway-file>
#   rm <throwaway-file>
# Verify post-cleanup: git log -1 --format=%H shows PRE-throwaway HEAD.

# AC-HDOD-14 custodian task logged
grep -nE "(Rule 8\(e\)|discipline extraction|CLAUDE\.md size)" .planning/MASTER-PLAN.md
# Expected: ≥2 hits in §12 NEXT PLANNED WORK region.

# AC-HDOD-15 mechanical regex test (offline, no staging needed)
echo ".claude/hooks/nightwork-pre-commit.sh" | grep -E \
  '^\.claude/hooks/.*\.(md|txt)$' && echo MATCHES_SKIP || echo FALLS_THROUGH
# Expected: FALLS_THROUGH (Option B regex restriction; .sh does NOT match docs-only)

# AC-HDOD-16 mechanical regex test (offline, no staging needed)
echo ".claude/skills/continuous-learning-v2/scripts/install.sh" | grep -E \
  '^\.claude/skills/.*\.(md|txt)$' && echo MATCHES_SKIP || echo FALLS_THROUGH
# Expected: FALLS_THROUGH (Option B regex restriction)
```

## 10. Rollback

**Single-line rollback:** `git revert <ship-SHA>` on `main`.

**Why this is sufficient:**

- Pure additive diff (no removed lines); `git revert` cleanly removes the
  new header comment block + new union branch + restores prior hook
  behaviour.
- No DB state to undo (no migration applied).
- No fixture state to undo (no seed data touched).
- No env state to undo (no env vars added).
- No file lifecycle to undo (no files deleted or renamed; only one file
  modified plus one new HDOD-SUMMARY.md created — revert removes the
  SUMMARY too).
- No CI workflow to undo (none touched).
- No npm dependency to undo (none touched).

**Post-revert verification:** `bash -n .claude/hooks/nightwork-pre-commit.sh
&& echo POST_REVERT_OK`. Manual test on scenario i (pure `.md`) — expect
hook to fall through to qa-timestamp gate (pre-revert behaviour); confirms
revert was complete.

**Worst-case (revert itself fails):** the hook is operator-side; setting
`NIGHTWORK_PRECOMMIT_DISABLE=1` in environment provides an immediate
disable until manual repair. Hook source can be restored from git
history `git show HEAD~1:.claude/hooks/nightwork-pre-commit.sh > .claude/hooks/nightwork-pre-commit.sh`.

## 11. Dispatch authorization (Jake gate per nwrp191 §17 + nwrp192 iter-2)

`halt_after: true` in frontmatter. Plan-review iter-2 runs after this
amended PLAN is committed; reviewers (spec-checker + custodian + security-
reviewer per nwrp189 §24 cap) write findings to disk in this phase folder.
After plan-review iter-2 closes, **executor surfaces PLAN content + iter-2
reviewer findings to Jake for substantive review; Jake authorises `/nx`
separately**. Do NOT auto-proceed to plan-execute.

Pre-`/nx` checklist for Jake at iter-2:

- [ ] Confirm structural approach (§4 UNCHANGED-AND-AUGMENTED) is still accepted.
- [ ] Confirm nwrp192 Option B Amendment 1 correction is mechanically
  realised in §4 path-allowlist contract + §5 Task 1 regex shape.
- [ ] Confirm AC-HDOD-13 split (13a + 13b) language matches intent per
  nwrp192 §19 ("AC-HDOD-13a wording stands").
- [ ] Confirm new AC-HDOD-15 + AC-HDOD-16 mechanically attest the
  `.sh`-enforces + `.py`/etc.-enforces contracts.
- [ ] Confirm BLOCKING-2 fix (T-HDOD-03 Drummond gate ordering
  documentation) is correct.
- [ ] Confirm $15 ceiling discipline; if any reviewer surfaces work that
  exceeds remaining headroom, halt + Jake authorises bump per Rule 7c
  (max one bump per slice per Rule 7d).

## 12. Cost projection

Per EXPANDED-SCOPE §9 Hand-off cost projection (carried into this PLAN
unchanged), with iter-2 amendment overhead added:

| Stage | Estimate | Notes |
|---|---|---|
| Plan-author (original iter-1 PLAN) | ~$2-3 | Single bash file edit, well-scoped, EXPANDED-SCOPE answers most design questions. Spent at nwrp191 dispatch. |
| Plan-review iter-1 (3 reviewers) | $4-6 | Small surface; 3 reviewers per nwrp189 cap. Spent 2026-05-20. |
| Iter-2 amendments (this re-author) | ~$1-2 | Edit-by-edit amendments per nwrp192; no structural rewrite. |
| Plan-review iter-2 (3 reviewers) | $3-5 | Smaller surface than iter-1 (focused on amendment correctness, not whole-plan review). |
| Plan-execute | $1-3 | Mechanical edit; manual scenario walk (10 scenarios) is no-cost reasoning. |
| /nightwork-qa (3 reviewers) | $3-5 | Small surface. |
| Ship | ~$1 | Single atomic commit. |
| **Total projected** | **$15-25** | Median ~$18; tail ~$25 if iter-2 surfaces additional findings. **Exceeds $15 ceiling at projection.** |

**Ceiling status:** at iter-2 amendment time, projected total **exceeds
the original $15 ceiling**. Per Rule 7c (Jake-only bump authorization),
the orchestrator authorising this iter-2 re-author per nwrp192 implicitly
authorised the ceiling work to complete the slice — but executor MUST
verify with Jake before /nightwork-qa if mid-execute projection signals
further overage. Per Rule 7d (max one bump per slice), this is the
allowed bump; no further bumps available without halt-for-fresh-session.

**Discipline (per CLAUDE.md Rule 7):** if mid-execute projection exceeds
agreed iter-2 ceiling, executor HALTs and surfaces to Jake. No autonomous
bump. No autonomous scope-trim to fit. Per-plan halt gate (Rule 7d /
nwrp166 §17) fires at $50; this plan is below.

## 13. Hand-off

Post-ship custodian tasks (NOT in this plan's commit boundary; logged in
MASTER-PLAN §12 NEXT PLANNED WORK per AC-HDOD-14):

1. Mark TD-NW-HOOK-DOC-ONLY-DETECT at MASTER-PLAN §11 row 314 as CLOSED
   with shipped commit SHA.
2. Append CLAUDE.md Workflow posture Rule 8(e) sub-clause documenting the
   doc-only-skip carve-out as a calibrated exception (per Q5=C), with
   explicit note that `.sh` files under `.claude/hooks/` and `.claude/
   skills/` mechanically ENFORCE the qa-timestamp gate (per nwrp192
   Option B Amendment 1 correction).
3. **Evaluate** whether Rules 7/8/9 + Orchestration discipline subsection
   should extract to `.planning/discipline/*.md` with CLAUDE.md anchor
   references, given CLAUDE.md 45.1k > 40k size warning (per Q5
   Amendment 2). NOT acting on extraction in this slice; custodian
   decides at sweep time. If endorsed → follow-up plan; if rejected →
   Rule 8(e) sub-clause appends inline as originally scoped.
4. Update MASTER-PLAN §12 NEXT PLANNED WORK to remove this phase from
   queue.

Slice-2 B-2 dispatch can proceed once items 1-3 above close (per nwrp182
sequencing: Slice-1 closed + Wave-A iter-1 cleanup shipped + hook
calibration shipped).

---

END HDOD-PLAN.md — **AUTHORED 2026-05-19 per nwrp191 /np dispatch.**
**ITER-2 AMENDMENTS APPLIED 2026-05-20 per nwrp192 Option B resolution.**
Single ambiguity from EXPANDED-SCOPE (AC-HDOD-13 self-validating ship
internal inconsistency) resolved at iter-1 per nwrp190 §17-22 by splitting
into AC-HDOD-13a (fresh-QA-timestamp ship) + AC-HDOD-13b (throwaway
doc-only test commit). Plan-review iter-1 (2026-05-20) surfaced BLOCKING-1
(Q2 Amendment 1 mechanically unimplementable under broad `^\.claude/hooks/`
path regex) + BLOCKING-2 (T-HDOD-03 doc inconsistency) + Rule 9 cross-
reviewer factual disagreement; resolved per Jake's nwrp192 Option B choice
(restrict path regex to `.(md|txt)$` for `.claude/hooks/` AND
`.claude/skills/`; `.sh`-enforces wins). Structural approach unchanged
(UNCHANGED-AND-AUGMENTED with new union branch). AC count: 15 → 17
(AC-HDOD-15 + AC-HDOD-16 added to mechanically attest `.sh`-enforces +
`.py`/etc.-enforces). Halt-after for Jake review at plan-review iter-2
close per nwrp191 §17 + nwrp192 amendment-cycle continuity.
