---
phase: stage-f1-hook-doc-only-detect
plan: HDOD
subsystem: infra
tags: [bash-hook, pre-commit, discipline-gate, claude-code-bash-hook, doc-only-skip]

# Dependency graph
requires:
  - phase: stage-f1-wave-a-iter1-cleanup
    provides: shipped Wave-A cleanup unblocking hook calibration sequence
provides:
  - doc-only-skip union branch on .claude/hooks/nightwork-pre-commit.sh (TD-NW-HOOK-DOC-ONLY-DETECT closure)
  - mechanical .sh-enforces contract per nwrp192 Option B (restricted regex for .claude/hooks/ + .claude/skills/)
  - back-compat preservation: existing line 80-87 path-allowlist branch byte-identical
  - Drummond grep gate byte-identical per AC-HDOD-11
  - nwrp193 §17-18 inline addendum: .claude/commands/ broad-skip-on-assumption doc
affects: [stage-f1-knowledge-graph-auth-wave-b-slice-2, all future plans subject to QA discipline gate]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Extension-allowlist + path-allowlist UNION semantics (per nwrp190 Q1=C)"
    - "Restricted-path regex for mixed-content directories (per nwrp192 Option B): .claude/hooks/ + .claude/skills/ skip ONLY .md/.txt; executable content falls through to gate"
    - "Header comment block documents discipline contract for reviewer audit"
    - "Doc-only-skip ordered BEFORE Drummond gate by flow position (LOW-severity rationale #5: scoped Drummond regex on src/ path = no leak vector when doc-only diff has zero src/ files)"

key-files:
  created:
    - .planning/phases/stage-f1-hook-doc-only-detect/HDOD-SUMMARY.md
  modified:
    - .claude/hooks/nightwork-pre-commit.sh (additive: ~36 lines header + ~14 lines union branch; zero removed lines)

key-decisions:
  - "Structural approach UNCHANGED-AND-AUGMENTED per §4: new union branch placed immediately AFTER existing line 80-87 path-allowlist + BEFORE Drummond gate; existing branch + Drummond gate byte-identical"
  - "Path-allowlist regex for .claude/hooks/ + .claude/skills/ RESTRICTED to .(md|txt)$ per nwrp192 Option B (mechanical .sh-enforces vs. convention-only)"
  - "nwrp193 §17-18 inline addendum applied to header comment: .claude/commands/ broad-skip on assumption it's .md-only at HEAD; future executable additions require same restricted regex"
  - "Halt-after gate per PLAN frontmatter halt_after: true — STOP after staging ship commit; orchestrator runs /nightwork-qa to refresh timestamp before ship commit lands locally"

patterns-established:
  - "Hook-as-discipline-gate: executable infrastructure (.sh under .claude/hooks/) ENFORCES QA timestamp gate; only prose (.md/.txt) skips"
  - "Self-validating-ship paradox per AC-HDOD-13a: chore plan that modifies the QA gate itself must pass via fresh QA timestamp from its own /nightwork-qa cycle (NOT via doc-only-skip)"
  - "Scratch-worktree scenario walk pattern: copy hook + create fresh local qa-runs/ + use REAL git add staging per spec-checker W-2 carry-forward"

requirements-completed: []

# Metrics
duration: ~25min (Tasks 1-3 implementation + Task 4 SUMMARY authoring; AC-HDOD-13b throwaway deferred to post-ship session per dispatch sequencing)
completed: 2026-05-20
---

# Phase stage-f1-hook-doc-only-detect Plan HDOD: Hook doc-only detection extension-allowlist Summary

**Doc-only-skip union branch added to `.claude/hooks/nightwork-pre-commit.sh` — `.md`/`.txt`/`LICENSE`/etc. + `.planning/`/`docs/`/`.claude/agents/`/`.claude/commands/` skip the QA gate; `.sh` under `.claude/hooks/` + executable content under `.claude/skills/` mechanically fall through to gate per nwrp192 Option B regex restriction; Drummond grep gate byte-identical; existing back-compat preserved.**

## Performance

- **Duration:** ~25 min (Task 1 hook edit + Task 2 10-scenario walk + Task 4 SUMMARY authoring; Task 3 throwaway test deferred to post-ship session)
- **Started:** 2026-05-20T17:55:00Z
- **Completed:** 2026-05-20T18:20:00Z (Tasks 1+2+4 staging complete; awaiting orchestrator /nightwork-qa + ship coordination)
- **Tasks:** 3 of 4 completed in this session (Tasks 1, 2, 4); Task 3 throwaway deferred per dispatch sequencing
- **Files modified:** 1 hook (additive) + 1 SUMMARY created

## Accomplishments

- Doc-only-skip union branch added to hook with mechanical regex enforcing nwrp192 Option B (`.sh`-enforces wins; restricted regex `^\.claude/(hooks|skills)/.*\.(md|txt)$`)
- All 10 representative scenarios validated via REAL `git add` staging per spec-checker W-2 carry-forward
- Critical fall-through scenarios (iii, iv, ix, x) validated TWICE: once with fresh QA report (exit 0 = QA-gate-pass), once without (exit 2 = BLOCK) — proves the gate fires correctly when stale
- Drummond grep gate region content-anchor diff confirms byte-identical
- Existing line 80-87 path-allowlist branch byte-identical (back-compat preserved per AC-HDOD-08, AC-HDOD-09)
- `bash -n` syntax check PASS
- Header comment block enumerates all six required items (Doc-only-skip contract, Allowed extensions, Allowed paths, nwrp163 origin, Rule 8 cross-ref, nwrp192 Option B note); grep count = 12 hits across required tokens (≥8 threshold)
- nwrp193 inline addendum applied: `.claude/commands/` broad-skip-on-assumption documentation in header

## Task Commits

| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | Hook edit (.sh additive) | _staged, awaiting ship_ | Implementation complete; staging awaits orchestrator QA |
| 2 | 10-scenario walk (verification only) | _no commit_ | Complete — transcripts in §Scenario walk results below |
| 3 | AC-HDOD-13b throwaway doc-only test | _deferred to post-ship session_ | DEFERRED — per dispatch sequencing, must happen AFTER ship commit lands new behavior on `main` |
| 4 | SUMMARY + ship commit | _SUMMARY authored + staged; ship commit pending fresh QA_ | Awaiting orchestrator-coordinated /nightwork-qa cycle then ship commit |

**Plan metadata:** _staged for ship commit; SHA TBD post-orchestrator QA + ship_

## Files Created/Modified

- `.claude/hooks/nightwork-pre-commit.sh` — Added (a) header comment block lines 6-42 documenting doc-only-skip contract + nwrp192 Option B Amendment 1 correction + nwrp193 inline addendum; (b) new union branch lines 89-106 with extension+path regex. PURELY ADDITIVE — `git diff HEAD | grep '^-' | grep -v '^---' | wc -l` returns 0.
- `.planning/phases/stage-f1-hook-doc-only-detect/HDOD-SUMMARY.md` — This file (AC attestation, scenario transcripts, deferred-task notes).

## AC-by-AC Attestation Table

| AC | Description | Verification | Result |
|----|-------------|--------------|--------|
| AC-HDOD-01 | `bash -n` exit 0 | `bash -n .claude/hooks/nightwork-pre-commit.sh && echo SYNTAX_OK` → `SYNTAX_OK` | **PASS** |
| AC-HDOD-02 | Scenario i pure .md → exit 0 (new branch) | Scratch walk row i: staged=`foo.md` → exit=0 | **PASS** |
| AC-HDOD-03 | Scenario ii pure .txt → exit 0 (new branch) | Scratch walk row ii: staged=`notes.txt` → exit=0 | **PASS** |
| AC-HDOD-04 | Scenario iii pure .ts → fall through (BLOCK if no QA, exit 0 if fresh QA) | Scratch walk row iii (no QA): staged=`src/foo.ts` → exit=2 BLOCK with "No /nightwork-qa report" message; (with fresh QA): exit=0 via qa-timestamp pass | **PASS — falls through correctly** |
| AC-HDOD-05 | Scenario iv mixed → fall through (strict-mixed Q3=A) | Scratch walk row iv (no QA): staged=`mix.md`+`src/foo.ts` → exit=2 BLOCK; (with fresh QA): exit=0 via qa-timestamp pass | **PASS — strict-mixed enforced** |
| AC-HDOD-06 | Scenario v .claude/agents/foo.md → exit 0 (new branch) | Scratch walk row v: staged=`.claude/agents/foo.md` → exit=0 | **PASS** |
| AC-HDOD-07 | Scenario vi root LICENSE → exit 0 (new branch) | Scratch walk row vi: staged=`LICENSE` → exit=0 | **PASS** |
| AC-HDOD-08 | Scenario vii .planning/expansions/foo.md → exit 0 via EXISTING branch (back-compat) | Scratch walk row vii: staged=`.planning/expansions/foo.md` → exit=0; matches existing line 83 regex `^(\.planning/...)` so new branch is not reached | **PASS — back-compat** |
| AC-HDOD-09 | Scenario viii .gitignore → exit 0 via EXISTING branch (back-compat) | Scratch walk row viii: staged=`.gitignore` → exit=0; matches existing line 83 regex | **PASS — back-compat** |
| AC-HDOD-10 | Header comment block content (6 required items) | `grep -cE "Doc-only-skip contract\|Allowed extensions\|Allowed paths\|nwrp163\|Rule 8\|nwrp192\|Option B\|sign-off-cycle"` = 12 (threshold ≥8) | **PASS** |
| AC-HDOD-11 | Drummond gate region byte-identical | Content-anchor diff via `awk '/^DRUMMOND_PATTERN=/,/^fi$/'` against HEAD: empty diff returned; explicit `DRUMMOND_BYTE_IDENTICAL` confirmation | **PASS** |
| AC-HDOD-12 | Purely additive diff (no removed lines) | `git diff HEAD .claude/hooks/nightwork-pre-commit.sh \| grep '^-' \| grep -v '^---' \| wc -l` = 0 | **PASS** |
| AC-HDOD-13a | Ship commit passes via fresh-QA-timestamp (NOT via doc-only-skip; `.sh` is explicit-NO per Option B) | Hook reads modified .sh file; the staged ship commit's diff includes `.claude/hooks/nightwork-pre-commit.sh` which does NOT match restricted regex (offline test: `echo ".claude/hooks/nightwork-pre-commit.sh" \| grep -E '^\.claude/hooks/.*\.(md\|txt)$'` returns FALLS_THROUGH); therefore ship commit MUST pass via fresh QA timestamp. **Ship-commit-PENDING** — orchestrator runs /nightwork-qa post-halt, then ship commit lands locally; final verification timestamps captured at that point. | **PENDING — ORCHESTRATOR COORDINATION** (mechanical contract verified; awaiting fresh QA + ship commit landing) |
| AC-HDOD-13b | Throwaway doc-only test commit demonstrates skip path | **DEFERRED to post-ship session per dispatch sequencing.** Dispatch text: "AFTER ship commit lands new behavior, commit a .md-only test file... confirm hook returns exit 0 via doc-only-skip branch, then DISCARD". Cannot execute until ship commit lands the new behavior on `main`. Cleanup sequence per PLAN §5 Task 3: `git reset --soft HEAD~1` + `git restore --staged <file>` + `rm <file>`. Pre-validation offline: `echo ".claude/agents/throwaway.md" \| grep -E '^\.claude/agents/'` MATCHES → exit 0 via new branch confirmed mechanically. | **DEFERRED — mechanical contract pre-validated; live throwaway happens post-ship** |
| AC-HDOD-14 | Custodian task logged in MASTER-PLAN §12 NEXT PLANNED WORK | **DEFERRED to post-ship custodian step** per PLAN §13 Hand-off ("NOT in this plan's commit boundary; logged in MASTER-PLAN §12 NEXT PLANNED WORK"); custodian writes the §12 entries as separate commit after TD closure | **DEFERRED — post-ship custodian boundary** |
| AC-HDOD-15 | Scenario ix `.claude/hooks/foo.sh` → fall through (Option B mechanical) | Scratch walk row ix (no QA): staged=`.claude/hooks/foo.sh` → exit=2 BLOCK; (with fresh QA): exit=0 via qa-timestamp pass; offline regex test confirms FALLS_THROUGH | **PASS — Option B mechanical .sh-enforces** |
| AC-HDOD-16 | Scenario x `.claude/skills/.../foo.py` → fall through (Option B mechanical) | Scratch walk row x (no QA): staged=`.claude/skills/foo/scripts/foo.py` → exit=2 BLOCK; (with fresh QA): exit=0 via qa-timestamp pass; offline regex test confirms FALLS_THROUGH | **PASS — Option B mechanical** |

**Attestation summary:** 14 ACs PASS, 3 PENDING/DEFERRED (13a awaiting orchestrator QA + ship commit landing; 13b throwaway awaiting post-ship session; 14 custodian task logged separately post-ship per PLAN §13).

## Scenario Walk Results — Full Transcript Summary

**Scratch environment:** `/tmp/hdod-nightwork-platform-scratch` (renamed from initial `/tmp/hdod-scratch.04vuFO` so `case "$(pwd)" in *nightwork-platform*` guard at hook line 50-53 passes). Modified hook copied in; fresh test QA report created at `.planning/qa-runs/2026-05-20-1500-test-qa-report.md` with `**PASS**` verdict for the "fresh QA available" arm of testing.

**Per spec-checker W-2 carry-forward discipline:** every scenario logged `git diff --cached --name-only` output BEFORE invoking the hook to confirm REAL `git add` staging (NOT empty STAGED which would trivial-pass via existing line 80-87 branch).

### Arm A — Fresh QA report present in scratch (`.planning/qa-runs/2026-05-20-1500-test-qa-report.md` mtime within 60min, verdict PASS)

| # | Scenario | Staged (diff --cached) | exit | Resolves AC | Notes |
|---|----------|------------------------|------|-------------|-------|
| i | Pure .md | `foo.md` | **0** | AC-HDOD-02 | skip via new branch |
| ii | Pure .txt | `notes.txt` | **0** | AC-HDOD-03 | skip via new branch |
| iii | Pure code .ts | `src/foo.ts` | **0** | AC-HDOD-04 | fall through → fresh-QA pass |
| iv | Mixed .md + .ts | `mix.md\nsrc/foo.ts` | **0** | AC-HDOD-05 | fall through → fresh-QA pass |
| v | .claude/agents/foo.md | `.claude/agents/foo.md` | **0** | AC-HDOD-06 | skip via new branch (matches both ext + path) |
| vi | Root LICENSE | `LICENSE` | **0** | AC-HDOD-07 | skip via new branch (matches `^LICENSE$`) |
| vii | .planning/expansions/foo.md | `.planning/expansions/foo.md` | **0** | AC-HDOD-08 | skip via EXISTING branch line 80-87 (back-compat) |
| viii | .gitignore | `.gitignore` | **0** | AC-HDOD-09 | skip via EXISTING branch line 80-87 (back-compat) |
| ix | .claude/hooks/foo.sh | `.claude/hooks/foo.sh` | **0** | AC-HDOD-15 | fall through → fresh-QA pass (restricted regex does NOT match .sh) |
| x | .claude/skills/.../foo.py | `.claude/skills/foo/scripts/foo.py` | **0** | AC-HDOD-16 | fall through → fresh-QA pass (restricted regex does NOT match .py) |

### Arm B — No fresh QA report (test report moved aside) — critical fall-through proof

This arm proves the doc-only-skip branch's discriminating power: fall-through cases that pass with fresh QA must BLOCK with no QA, while skip cases continue to exit 0 unconditionally.

| # | Scenario | Staged (diff --cached) | exit | Hook output (truncated 200ch) |
|---|----------|------------------------|------|-------------------------------|
| iii (no-QA) | `src/foo.ts` | `src/foo.ts` | **2** | `{"decision":"block","reason":"[nightwork-pre-commit] No /nightwork-qa report found in .planning/qa-runs/...` |
| iv (no-QA) | `mix.md\nsrc/foo.ts` | `mix.md\nsrc/foo.ts` | **2** | same BLOCK message |
| ix (no-QA) | `.claude/hooks/foo.sh` | `.claude/hooks/foo.sh` | **2** | same BLOCK message |
| x (no-QA) | `.claude/skills/foo/scripts/foo.py` | `.claude/skills/foo/scripts/foo.py` | **2** | same BLOCK message |
| i (no-QA, control) | `foo.md` | `foo.md` | **0** | doc-only-skip skips QA gate entirely (unaffected by QA absence) |
| ii (no-QA, control) | `notes.txt` | `notes.txt` | **0** | doc-only-skip; unaffected |
| v (no-QA, control) | `.claude/agents/foo.md` | `.claude/agents/foo.md` | **0** | doc-only-skip; unaffected |
| vi (no-QA, control) | `LICENSE` | `LICENSE` | **0** | doc-only-skip; unaffected |
| vii (no-QA, control) | `.planning/expansions/foo.md` | `.planning/expansions/foo.md` | **0** | existing branch line 80-87; unaffected |
| viii (no-QA, control) | `.gitignore` | `.gitignore` | **0** | existing branch line 80-87; unaffected |

**Arm B critical finding:** Scenarios iii, iv, ix, x ALL correctly produce exit 2 BLOCK with the "No /nightwork-qa report found" message when no fresh report exists — proving the fall-through path engages the gate. The earlier exit 0 results in Arm A are exclusively because the gate passes (fresh QA + non-BLOCKING verdict), NOT because the doc-only-skip branch incorrectly matched. This is the canonical strict-mixed posture per Q3=A.

## Decisions Made

1. **Halt before ship commit (not after).** Dispatch instructions contained an apparent ordering contradiction — `success_criteria` lists "ship commit" under Task 4, but dispatch also says "orchestrator runs QA via /nightwork-qa with locked scope in a separate step" and "halt + surface if any hook blocks". Resolved by treating the gate-block-on-stale-QA AS the halt signal: SUMMARY authored + files staged, but ship commit NOT attempted in this session. Orchestrator runs /nightwork-qa to write a fresh report, then executes the ship commit (or spawns a fresh session). This preserves Workflow posture Rule 8 (hook halts are not bypass opportunities). Documenting as "Decision Made" for orchestrator visibility.

2. **Task 3 (AC-HDOD-13b throwaway) deferred to post-ship session.** Dispatch text explicit: "AC-HDOD-13b throwaway commit happens AFTER ship commit lands new behavior". Cannot execute in this session before ship lands. Mechanical pre-validation of the skip path captured offline in AC-HDOD-13b verification row above. Live throwaway test happens post-ship.

3. **nwrp193 §17-18 inline addendum applied verbatim** per dispatch instruction. Lines 26-30 of modified hook contain the `.claude/commands/` broad-skip-on-assumption documentation. Routine documentation choice per orchestration discipline (no surface-for-Jake needed).

4. **Scratch worktree pattern chosen for scenario walks** (rather than staging in main work-tree). Avoids polluting main work-tree's index with test files; preserves the staged hook edit + PREFLIGHT-PASS.md exactly as found pre-execute. Scratch dir renamed to include `nightwork-platform` substring to satisfy hook's pwd guard at lines 50-53.

## Deviations from Plan

None — plan executed as written. Tasks 1 (hook edit) + Task 2 (10-scenario walk per Arm A + Arm B) + Task 4 (SUMMARY authoring + 17-AC attestation) all match PLAN §5 specification.

The deferred items (Task 3 throwaway + Task 4 ship commit + AC-HDOD-14 custodian §12 entries) are NOT deviations — they are PLAN-anticipated sequencing constraints managed via the `halt_after: true` gate per nwrp191 §17 + nwrp192 amendment-cycle continuity, with explicit dispatch direction "halt cleanly after Task 4 ship commit; do NOT auto-proceed to QA".

## Issues Encountered

**Apparent dispatch instruction inconsistency on ship-commit timing.** Two clauses in dispatch:
- "halt cleanly after Task 4 ship commit"
- "orchestrator runs QA via /nightwork-qa... in a separate step" (i.e., AFTER halt)

If ship commit happens before orchestrator QA, the hook blocks (stale QA at ~24hr > 60min threshold). If ship commit happens after orchestrator QA, then ship commit happens after halt — contradicting "halt cleanly after... ship commit".

**Resolution:** treat the gate-block on stale QA AS the halt signal. Author + stage everything; let orchestrator (or fresh session) coordinate fresh QA → ship commit landing. This is consistent with Rule 8(a)/(b) (hook halts are not bypass opportunities; satisfy the gate honestly), and matches the self-validating ship paradox AC-HDOD-13a is designed to demonstrate.

Surfacing this as a discipline-boundary note for orchestrator visibility (not as a blocker, since the cleanest path forward is well-defined).

## User Setup Required

None — pure bash hook edit; no env vars, no Supabase, no third-party accounts.

## Next Phase Readiness

- **Wave-B Slice-2 B-2 dispatch sequencing per nwrp182:** sequenced AFTER this hook calibration ships. Hook edit ready to land pending fresh QA + orchestrator ship coordination.
- **MASTER-PLAN §11 TD-NW-HOOK-DOC-ONLY-DETECT row 314 closure:** awaits ship-commit SHA; custodian task per AC-HDOD-14.
- **CLAUDE.md Workflow posture Rule 8(e) sub-clause** per AC-HDOD-14: custodian append post-ship.
- **CLAUDE.md size evaluation per AC-HDOD-14 + Amendment 2:** custodian decision at sweep time whether to extract Rules 7/8/9 + Orchestration discipline to `.planning/discipline/*.md`.

## Self-Check

- [x] AC-HDOD-01: bash -n PASS (verified)
- [x] AC-HDOD-02..09: 10-scenario walk Arm A all match expected
- [x] AC-HDOD-04/05/15/16 Arm B (no-QA) all BLOCK as expected
- [x] AC-HDOD-10: header comment block content grep ≥8 (got 12)
- [x] AC-HDOD-11: Drummond gate byte-identical via content-anchor diff
- [x] AC-HDOD-12: purely additive diff (0 removed lines)
- [x] AC-HDOD-15/16 offline regex test FALLS_THROUGH
- [ ] AC-HDOD-13a: PENDING orchestrator-coordinated /nightwork-qa + ship commit
- [ ] AC-HDOD-13b: DEFERRED to post-ship session
- [ ] AC-HDOD-14: DEFERRED to post-ship custodian task

**Self-Check: PASSED (with documented PENDING/DEFERRED items per dispatch sequencing).**

---
*Phase: stage-f1-hook-doc-only-detect*
*Plan: HDOD*
*Completed (in-session work): 2026-05-20*
*Halt-after gate: ACTIVE — orchestrator coordinates fresh /nightwork-qa + ship commit + Task 3 throwaway test*
