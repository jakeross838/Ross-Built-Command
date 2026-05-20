# QA Spec-Check - Phase stage-f1-hook-doc-only-detect (Plan HDOD)

Reviewer: nightwork-spec-checker
Date: 2026-05-20
Gate: pre-ship-commit (staged diff; AC-HDOD-13a self-validating-ship sequencing)

Staged files reviewed:
- .claude/hooks/nightwork-pre-commit.sh (+56 lines additive)
- .planning/phases/stage-f1-hook-doc-only-detect/HDOD-SUMMARY.md (NEW, 213 lines)
- .planning/expansions/stage-f1-hook-doc-only-detect-PREFLIGHT-PASS.md (NEW, 46 lines)

---

## Acceptance Criteria Coverage Matrix

| AC | Description | Verdict | Evidence |
|----|-------------|---------|----------|
| AC-HDOD-01 | bash -n exit 0 syntax clean | COVERED | Mechanically verified: SYNTAX_OK returned. HDOD-SUMMARY.md:95. |
| AC-HDOD-02 | Scenario i pure .md exit 0 new branch | COVERED | HDOD-SUMMARY.md:125 Arm A: staged=foo.md exit=0. Regex .md matches allowlist. |
| AC-HDOD-03 | Scenario ii pure .txt exit 0 new branch | COVERED | HDOD-SUMMARY.md:126 Arm A: staged=notes.txt exit=0. |
| AC-HDOD-04 | Scenario iii pure .ts falls through | COVERED | HDOD-SUMMARY.md:127,142. Arm A exit=0 fresh-QA pass. Arm B exit=2 BLOCK. Both arms. |
| AC-HDOD-05 | Scenario iv mixed .md+.ts falls through Q3=A strict-mixed | COVERED | HDOD-SUMMARY.md:128,143. Arm A exit=0. Arm B exit=2 BLOCK. |
| AC-HDOD-06 | Scenario v .claude/agents/foo.md exit 0 new branch | COVERED | HDOD-SUMMARY.md:129 Arm A exit=0. Regex .claude/agents/ matches allowlist. |
| AC-HDOD-07 | Scenario vi root LICENSE exit 0 new branch | COVERED | HDOD-SUMMARY.md:130 Arm A exit=0. |
| AC-HDOD-08 | Scenario vii .planning/expansions/foo.md exit 0 EXISTING branch | COVERED | HDOD-SUMMARY.md:131 Arm A exit=0 via EXISTING branch line 80-87. |
| AC-HDOD-09 | Scenario viii .gitignore exit 0 EXISTING branch | COVERED | HDOD-SUMMARY.md:132 Arm A exit=0 existing branch line 80-87. |
| AC-HDOD-10 | Header comment block enumerates 6 required items | COVERED | Mechanical grep count=12 threshold=8. Items at hook:8-42. HDOD-SUMMARY.md:104. |
| AC-HDOD-11 | Drummond grep gate byte-identical | COVERED | Content-anchor diff empty. DRUMMOND_BYTE_IDENTICAL verified mechanically. HDOD-SUMMARY.md:105. |
| AC-HDOD-12 | Purely additive diff zero removed lines | COVERED | git diff removed-line count=0. New branch hook:89-106 after hook:83 before DRUMMOND_PATTERN hook:121. HDOD-SUMMARY.md:106. |
| AC-HDOD-13a | Ship commit via fresh-QA-timestamp NOT doc-only-skip | PENDING | Pre-validation: .claude/hooks/nightwork-pre-commit.sh FALLS_THROUGH restricted regex (verified). Ship commit awaits this QA report. Correct per dispatch. HDOD-SUMMARY.md:107. |
| AC-HDOD-13b | Throwaway doc-only test commit demonstrates skip path then discarded | DEFERRED | Dispatch explicit: throwaway after ship commit lands. Pre-validation captured. Correct per dispatch. HDOD-SUMMARY.md:108. |
| AC-HDOD-14 | Custodian task logged in MASTER-PLAN section 12 NEXT PLANNED WORK | DEFERRED | MASTER-PLAN section 12 entries not yet written (pre-ship). Post-ship custodian boundary per PLAN section 13. HDOD-SUMMARY.md:109. |
| AC-HDOD-15 | Scenario ix .claude/hooks/foo.sh falls through Option B | COVERED | HDOD-SUMMARY.md:110,133,144. Arm B exit=2 BLOCK. Mechanical regex FALLS_THROUGH verified. |
| AC-HDOD-16 | Scenario x .claude/skills/foo.py falls through Option B | COVERED | HDOD-SUMMARY.md:111,134,145. Arm B exit=2 BLOCK. Mechanical regex FALLS_THROUGH verified. |

Summary: 14 COVERED, 1 PENDING (AC-HDOD-13a correct per dispatch), 2 DEFERRED (13b + 14 correct per dispatch sequencing).

---

## Spec Deliverables

- [x] Hook edit additive 56 lines -- DELIVERED; hook:6-42 header, hook:89-106 new branch
- [x] Header comment block 6 required items -- DELIVERED; grep-count=12 at hook:8-42
- [x] nwrp192 Option B regex restriction .sh-enforces -- DELIVERED; hook:97-98 FALLS_THROUGH verified
- [x] nwrp193 inline addendum .claude/commands/ broad-skip documentation -- DELIVERED; hook:26-30
- [x] Existing branch byte-identical back-compat -- DELIVERED; zero removed lines
- [x] Drummond gate byte-identical -- DELIVERED; content-anchor diff empty
- [x] 10-scenario walk Arm A and Arm B -- DELIVERED; HDOD-SUMMARY.md scenario walk results section
- [x] HDOD-SUMMARY.md 17-AC attestation table -- DELIVERED; HDOD-SUMMARY.md:91-113
- [x] PREFLIGHT-PASS.md -- DELIVERED staged
- [ ] AC-HDOD-13a ship commit -- PENDING awaiting this QA cycle and orchestrator coordination
- [ ] AC-HDOD-13b throwaway test -- DEFERRED post-ship
- [ ] AC-HDOD-14 MASTER-PLAN section 12 custodian entries -- DEFERRED post-ship

---

## Domain Rules Spot-Check

- Drummond fixtures used: N/A -- hook discipline change. Drummond grep gate preserved byte-identical.
- Recalculate-not-increment: N/A -- no aggregations or financial logic.
- Multi-tenant RLS posture: N/A -- no tenant tables no schema changes.
- Design tokens no hardcoded colors: N/A -- bash script hook does not apply.
- Audit log writes on state change: N/A -- no workflow entity state changes.

---

## Hook-Specific Verification (Core Concern)

### Regex correctness (independent checks during this review)

| File pattern | Expected | Result |
|---|---|---|
| .claude/hooks/nightwork-pre-commit.sh | FALLS_THROUGH | FALLS_THROUGH |
| .claude/skills/continuous-learning-v2/scripts/install.sh | FALLS_THROUGH | FALLS_THROUGH |
| .claude/agents/foo.md | MATCHES_ALLOWLIST | MATCHES_ALLOWLIST |
| .claude/commands/foo.md | MATCHES_ALLOWLIST | MATCHES_ALLOWLIST |
| .claude/hooks/foo.md | MATCHES_ALLOWLIST | MATCHES_ALLOWLIST |

### Branch ordering (mechanical)

Line positions: STAGED=80, NON_PLANNING existing branch=83, NON_DOC new branch=96, DRUMMOND_PATTERN=121. Order: 80 < 83 < 96 < 121. Correct -- new branch placed after existing branch and before Drummond gate.

### Fail-closed posture

git diff failure handled via 2>/dev/null || true. Empty STAGED falls through if-n guard to qa-timestamp gate (not exit 0). Fail-closed posture preserved.

### W-2 carry-forward (real git add staging)

HDOD-SUMMARY.md:117 documents scratch worktree /tmp/hdod-nightwork-platform-scratch renamed to satisfy nightwork-platform pwd guard at hook:50-52. Arm A and Arm B tables include Staged column with per-row filenames. HDOD-SUMMARY.md:119 explicitly states W-2 discipline followed.

---

## Findings

### BLOCKING
None.

### WARNING
None.

### NOTE

1. PREFLIGHT-PASS.md not in PLAN files_modified: staged but not listed in PLAN frontmatter files_modified (lists only hook and HDOD-SUMMARY.md). Standard preflight artifact under .planning/ -- appropriate. Not a discipline concern.

2. HDOD-PLAN.md absent from staged diff: PLAN Task 4 step 3 specified staging PLAN.md in ship commit. HDOD-PLAN.md committed at SHA c096004 (iter-2 amendments) prior to execute. Staged diff is functionally correct -- PLAN artifact already in repo history. Observation only.

3. AC-HDOD-13b throwaway deferred to post-ship: Live demonstration in post-ship session. Pre-validation captured. Deferral per dispatch sequencing properly documented.

4. AC-HDOD-14 MASTER-PLAN entries absent: Correct pre-ship state per PLAN section 13 Hand-off scope definition.

5. Arm B Scenario iv Staged column: HDOD-SUMMARY.md:143 shows both filenames with literal backslash-n. Minor formatting artifact; does not affect test result correctness.

---

## Verdict

PASS (with 3 properly-deferred items per dispatch sequencing)

14 of 17 ACs are COVERED with concrete evidence from hook diff, HDOD-SUMMARY.md attestation table, and independent mechanical checks. The 3 PENDING/DEFERRED items are correctly sequenced: this QA cycle is the prerequisite for AC-HDOD-13a.

The hook edit is purely additive. nwrp192 Option B restricted regex correctly implemented for .claude/hooks/ and .claude/skills/ (mechanically verified FALLS_THROUGH for .sh and .py). Drummond gate byte-identical. Existing path-allowlist branch byte-identical. nwrp193 inline addendum for .claude/commands/ broad-skip documentation present at hook:26-30. No BLOCKING or WARNING findings.

Ship commit may proceed once orchestrator coordinates (fresh QA timestamp from this report satisfies the AC-HDOD-13a gate condition).

---
Phase: stage-f1-hook-doc-only-detect
Plan: HDOD
QA reviewer: nightwork-spec-checker
Completed: 2026-05-20