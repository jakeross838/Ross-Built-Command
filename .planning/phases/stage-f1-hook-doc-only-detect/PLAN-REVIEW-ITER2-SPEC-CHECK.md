# Plan-review iter-2 -- Spec-checker
## stage-f1-hook-doc-only-detect (HDOD)

**Date:** 2026-05-19 (session date; amendments applied 2026-05-20 per nwrp192)
**Reviewer:** nightwork-spec-checker
**Run type:** PLAN-TIME iter-2 (post-nwrp192 Option B amendments; verifying defined fix set)
**Spec source:** .planning/expansions/stage-f1-hook-doc-only-detect-EXPANDED-SCOPE.md (Q2 Amendment 1 correction 2026-05-20 per nwrp192)
**Plan source:** .planning/phases/stage-f1-hook-doc-only-detect/HDOD-PLAN.md (919 lines; iter-2 amendments applied 2026-05-20 per nwrp192)

---

## VERDICT: NEEDS WORK

9 of 10 iter-2 mandates satisfied. Both iter-1 BLOCKINGs substantially closed. One new HIGH finding (HIGH-1-NEW) from the security reviewer requires a one-line fix in PLAN section 5 Task 1 header comment code block before execute. The security reviewer explicitly states this does NOT require Jake re-authorization -- it is a documentation fix within the scope of the BLOCKING-2 amendment cycle. Once the one-line fix is applied, all three plan-review iter-2 reviewers reach PASS.

**Gate on PASS verdict:** HIGH-1-NEW (security-reviewer iter-2) -- proposed hook header comment code block at PLAN section 5 Task 1 line 324 ships ambiguous Drummond-gate wording into the actual hook file. Requires a one-line correction before execute.

---

## Iter-2 mandate verification

### Mandate 1 -- AC count = 17, correct IDs and scenario coverage

**PASS.**

PLAN frontmatter line 47: acceptance-criteria-target: 17 falsifiable items (AC-HDOD-01..AC-HDOD-12 + AC-HDOD-13a + AC-HDOD-13b + AC-HDOD-14 + AC-HDOD-15 + AC-HDOD-16).

PLAN section 8 (lines 689-707) enumerates all 17 items explicitly.

- AC-HDOD-01..12: present (lines 691-702).
- AC-HDOD-13a: present (line 703) -- ship via fresh QA timestamp; .sh explicit-NO per nwrp192 Option B.
- AC-HDOD-13b: present (line 704) -- throwaway doc-only test commit demonstrates skip path.
- AC-HDOD-14: present (line 705) -- custodian task logged in MASTER-PLAN section 12.
- AC-HDOD-15: present (line 706) -- scenario ix: .claude/hooks/foo.sh -> falls through. Correct per nwrp192.
- AC-HDOD-16: present (line 707) -- scenario x: .claude/skills/foo/scripts/foo.py -> falls through. Correct.

All 17 ACs have verification commands in section 9 (lines 711-795). Count verified.

**COVERED.**

---

### Mandate 2 -- Path-allowlist contract: 6-row table present in section 4

**PASS.**

PLAN section 4 lines 218-225 contain the 6-row table. Matches EXPANDED-SCOPE Q2 Amendment 1 correction final table (EXPANDED-SCOPE lines 191-199) verbatim.

| Row | Path | Restriction |
|---|---|---|
| 1 | ^.planning/ | broad |
| 2 | ^docs/ | broad |
| 3 | ^.claude/agents/ | broad |
| 4 | ^.claude/commands/ | broad |
| 5 | ^.claude/hooks/.*.(md|txt)$ | RESTRICTED -- contains .sh executables |
| 6 | ^.claude/skills/.*.(md|txt)$ | RESTRICTED -- contains .sh/.py/.js/.json/.css/.html/.jsx |

RESTRICTED rationale for rows 5 and 6 is present and correct.

**COVERED.**

---
### Mandate 3 -- Q2 Amendment 1 correction cited in frontmatter; section 4 narrative reflects corrected boundary (no residual deliberate-trade-off framing for .sh skipping)

**PASS.**

Frontmatter source_decisions (lines 17-24) cites the Amendment 1 correction (line 19) and nwrp192 Option B resolution (line 20) explicitly.

PLAN section 4 lines 259-289 frame this as the corrected mechanical contract per nwrp192 section 3-12 Jake-authored resolution (line 268). The deliberate trade-off framing from iter-1 is absent; replaced with three-reason Option B resolution (lines 269-283).

**COVERED.**

---

### Mandate 4 -- BLOCKING-1 closed: diff preview regex + Task 1 header block use restricted regex for .claude/hooks/ AND .claude/skills/

**PASS.**

PLAN section 4 diff preview (lines 246-247): grep -vE pattern includes ^.claude/hooks/.*.(md|txt)$ and ^.claude/skills/.*.(md|txt)$ -- both restricted forms. The broad ^.claude/hooks/ pattern (source of BLOCKING-1) is absent.

PLAN section 5 Task 1 sub-step 2 (lines 353-358): CRITICAL annotation -- restricted form required; mechanical verification against nightwork-pre-commit.sh mandated (NON_DOC must be non-empty for .sh files).

Task 1 header block draft (lines 316-344): RESTRICTED paths listed with rationale for both directories.

Security-reviewer iter-2 mechanically tested 7 .claude/hooks/ filenames (Test 1) and 6 .claude/skills/ filenames (Test 2) -- all PASS. All .sh files fall through; .md files match skip.

**BLOCKING-1: CLOSED.**

---

### Mandate 5 -- BLOCKING-2 closed: T-HDOD-03 wording corrected; Drummond gate ordering consistent with section 6 mainstream and section 4

**PARTIAL PASS -- see HIGH-1-NEW finding below.**

PLAN section 6 T-HDOD-03 (line 571) and LOW-severity rationale point 5 (lines 595-610) are both corrected: Drummond gate fires AFTER doc-only-skip branches; for doc-only-skip diffs the Drummond gate is NOT reached; safety argument (no fixture-path overlap) intact.

However, PLAN section 5 Task 1 header comment code block (line 324) contains the phrase:
  # to the existing gate (Drummond grep gate still fires regardless).
The phrase still fires regardless is ambiguous to a reader of the installed hook who could interpret it as Drummond fires even for doc-only-skip commits (incorrect). This text is written VERBATIM into the hook file by the executor. See HIGH-1-NEW in the Findings section.

**BLOCKING-2: PARTIALLY CLOSED -- T-HDOD-03 + section 6 correct; hook comment code block ambiguous. HIGH-1-NEW requires one-line fix before execute.**

---

### Mandate 6 -- AC-HDOD-13a wording stands as originally framed per nwrp192 section 19

**PASS.**

AC-HDOD-13a (line 703) states the ship commit passes via fresh-QA-timestamp legitimately (NOT via doc-only-skip -- .sh is explicit-NO per nwrp192 Option B; the restricted regex mechanically does NOT match nightwork-pre-commit.sh, so the file falls through to gate).

Security-reviewer iter-2 mechanically confirmed .claude/hooks/nightwork-pre-commit.sh does NOT match the restricted regex (Test 1). Iter-1 HIGH-1 (ship bypasses QA gate) is CLOSED.

**COVERED.**

---

### Mandate 7 -- AC-HDOD-13b remains meaningful; Task 3 has explicit cleanup sequence per security-reviewer LOW-2

**PASS.**

AC-HDOD-13b (line 704): throwaway test commit remains meaningful under Option B. Ship commit contains .sh and goes through the QA gate; throwaway .md-only commit demonstrates the skip path. Still required.

Task 3 (lines 440-481): explicit cleanup sequence at lines 457-463 (git reset --soft HEAD~1 + git restore --staged + rm + post-cleanup verification). Prohibits push at line 474. Security-reviewer iter-2 confirms LOW-2 CLOSED.

**COVERED.**

---

### Mandate 8 -- W-2 carry-forward: REAL git add staging mandated; empty-STAGED failure mode documented

**PASS.**

PLAN section 5 Task 2 lines 389-401: CRITICAL execute-time discipline block (W-2 carry-forward).
PLAN section 7 lines 632-637: Execute-time discipline note (per W-2).
PLAN section 9 lines 715-723: verification command template with git add -> git diff --cached --name-only (verify non-empty) -> pipe to hook.

**COVERED.**

---

### Mandate 9 -- Frontmatter completeness

**PASS.**

- acceptance-criteria-target: 17 -- line 47: present.
- HDOD-SUMMARY.md in files_modified -- line 28: present with N-2 fix annotation.
- All four iter-1 review artifacts in files_referenced -- lines 33-36: present.

**COVERED.**

---

### Mandate 10 -- No new issues introduced by amendments

**PARTIAL FAIL -- HIGH-1-NEW from security-reviewer iter-2.**

The amendments introduced one new issue: the hook header comment code block at PLAN section 5 Task 1 line 324 contains ambiguous Drummond gate ordering language that will be written verbatim into the installed hook file.

All other amendment checks pass: regex correctness (security Tests 1, 2, 6 all PASS), set -e + || true interaction correct (Test 8), variable naming distinct (Test 8), bash quoting safe (Test 8), scenario count consistent (10 throughout), no scope creep.

**PARTIAL FAIL: one new HIGH finding requires one-line fix before execute.**

---

## Acceptance criteria table

| AC | Description | Verdict | Evidence |
|---|---|---|---|
| AC-HDOD-01 | bash -n syntax check | COVERED | section 9 line 713 |
| AC-HDOD-02 | Scenario i: pure .md -> exit 0 | COVERED | section 8 line 692; security iter-2 Test 6 PASS |
| AC-HDOD-03 | Scenario ii: pure .txt -> exit 0 | COVERED | section 8 line 693; security iter-2 Test 6 PASS |
| AC-HDOD-04 | Scenario iii: pure .ts -> fall through | COVERED | section 8 line 694; security iter-2 Test 6 PASS |
| AC-HDOD-05 | Scenario iv: mixed .md+.ts -> fall through | COVERED | section 8 line 695; security iter-2 Test 6 PASS |
| AC-HDOD-06 | Scenario v: .claude/agents/foo.md -> exit 0 | COVERED | section 8 line 696; security iter-2 Test 6 PASS |
| AC-HDOD-07 | Scenario vi: root LICENSE -> exit 0 | COVERED | section 8 line 697; security iter-2 Test 6 PASS |
| AC-HDOD-08 | Scenario vii: .planning/expansions/foo.md -> exit 0 | COVERED | section 8 line 698; security iter-2 Test 6 PASS |
| AC-HDOD-09 | Scenario viii: .gitignore -> exit 0 | COVERED | section 8 line 699; security iter-2 Test 6 PASS |
| AC-HDOD-10 | Header comment block: all required elements incl. Option B note | PARTIAL | lines 316-344; HIGH-1-NEW at line 324 requires fix |
| AC-HDOD-11 | Drummond gate byte-identical | COVERED | section 8 line 701; security iter-2 Test 3 PASS |
| AC-HDOD-12 | Structural approach UNCHANGED-AND-AUGMENTED | COVERED | section 8 line 702; section 9 lines 763-766 |
| AC-HDOD-13a | Ship commit passes via fresh QA timestamp; .sh falls through | COVERED | section 8 line 703; security iter-2 Tests 1 + 7 |
| AC-HDOD-13b | Throwaway commit proves skip path; explicit cleanup | COVERED | section 8 line 704; Task 3 lines 440-481 |
| AC-HDOD-14 | Custodian task in MASTER-PLAN section 12 | COVERED | section 8 line 705; section 9 lines 782-784 |
| AC-HDOD-15 | Scenario ix: .claude/hooks/foo.sh -> fall through | COVERED | section 8 line 706; security iter-2 Tests 1 + 6 PASS |
| AC-HDOD-16 | Scenario x: .claude/skills/foo/scripts/foo.py -> fall through | COVERED | section 8 line 707; security iter-2 Tests 2 + 6 PASS |

16 COVERED, 1 PARTIAL (AC-HDOD-10 pending HIGH-1-NEW fix), 0 MISSING.

---

## Iter-1 finding status

| Finding | Iter-1 | Iter-2 status | Evidence |
|---|---|---|---|
| BLOCKING-1 -- AC-HDOD-13a vs broad regex | BLOCKING | CLOSED | Restricted regex; AC-HDOD-13a consistent. Security iter-2 Tests 1 + 7. |
| BLOCKING-2 -- T-HDOD-03 contradiction | BLOCKING | PARTIALLY CLOSED | T-HDOD-03 + section 6 fixed; hook comment ambiguous (HIGH-1-NEW). |
| HIGH-1 -- ship bypasses QA gate | HIGH | CLOSED | .sh falls through mechanically. Security iter-2 Test 7. |
| MEDIUM-1 -- no mechanical enforcement | MEDIUM | CLOSED (downgraded INFO) | Option B restricted regex IS mechanical enforcement. |
| MEDIUM-2 -- dup of BLOCKING-2 | MEDIUM | CLOSED | Same resolution. |
| LOW-1 -- newline-in-filename | LOW (accepted) | OPEN (accepted) | T-HDOD-07 in STRIDE register line 575. Pre-existing. |
| LOW-2 -- throwaway cleanup ordering | LOW | CLOSED | Task 3 lines 457-463; security iter-2 confirms. |
| INFO-1 -- foo.sh.md compound extension | INFO (accepted) | OPEN (accepted) | T-HDOD-08 in STRIDE register line 576. |
| W-1 -- .sh-skip Rule 9 disagreement | WARNING | CLOSED | Jake Option B; .sh mechanically enforces. |
| W-2 -- execute-time staging discipline | WARNING | CLOSED | Section 5 Task 2 lines 389-401; section 7 + 9. |
| N-1 -- regex order readability | NOTE | OPEN (carry-forward) | No action required. |
| N-2 -- HDOD-SUMMARY.md not in files_modified | NOTE | CLOSED | Frontmatter line 28 with N-2 fix annotation. |
| N-3 -- MASTER-PLAN section 12 entries | NOTE | OPEN (expected post-ship) | AC-HDOD-14 verification at line 783. |

---

## Findings

### BLOCKING

None.

### HIGH (requires fix before execute; no Jake re-authorization needed)

**HIGH-1-NEW (security-reviewer iter-2):**
PLAN section 5 Task 1 header comment code block line 324 will be written verbatim into
.claude/hooks/nightwork-pre-commit.sh by the executor. Current text at line 324:
  # to the existing gate (Drummond grep gate still fires regardless).
The phrase still fires regardless is ambiguous -- a hook reader could interpret it as Drummond
fires even for doc-only-skip commits (incorrect). This undermines the BLOCKING-2 fix in T-HDOD-03
and section 6 that took two iterations to get right.

Required one-line fix (plan-author applies; security reviewer authorizes within BLOCKING-2 amendment scope; no Jake re-authorization needed):

Replace at PLAN section 5 Task 1 code block line 324:
  # to the existing gate (Drummond grep gate still fires regardless).
With:
  # to the existing gate (Drummond grep gate + qa-timestamp both fire;
  #   doc-only-skip exits BEFORE Drummond -- see section 6 LOW-severity rationale #5).

Executor MUST write the corrected text (not the current PLAN text) into the actual hook.

### WARNING

None.

### NOTE

**N-1 (carry-forward):** Regex ordering within grep -vE alternation is readability, not semantic. Carry to QA.

**N-2 (ceiling transparency):** PLAN section 12 projects total cost exceeding the ceiling. Surfaces this honestly per Rule 7c at lines 865-876. No corrective action required at plan-review time.

---

## Domain rules spot-check

- Drummond fixtures used: N/A -- pure hook script change; no fixture data.
- Recalculate-not-increment honored: N/A -- no aggregations.
- Multi-tenant RLS posture: N/A -- no tenant tables touched.
- Design tokens (no hardcoded colors): N/A -- bash script + planning artifacts.
- Audit log writes added on every state change: N/A -- no workflow entities.

---

## Summary verdict reasoning

The iter-2 amendments correctly close BLOCKING-1 (restricted regex; AC-HDOD-13a consistent) and substantially close BLOCKING-2 (T-HDOD-03 + section 6 corrected). Security-reviewer iter-2 mechanically verified all critical properties: 10 scenarios PASS (Tests 1/2/6), env-flag bypass unchanged (Test 5), set -e + || true correct (Test 8), Drummond gate byte-identical sound (Test 3).

One residual HIGH finding (HIGH-1-NEW) -- ambiguous Drummond ordering language in the hook comment code block at PLAN section 5 Task 1 line 324. The security reviewer explicitly states this is a documentation fix within the BLOCKING-2 amendment cycle, requires no Jake re-authorization, and the plan is clear for execute once fixed.

Recommended path: plan-author applies the one-line fix to PLAN section 5 Task 1 code block line 324, then all three iter-2 reviewers reach PASS and /nx may proceed with Jake authorization.

---

END PLAN-REVIEW-ITER2-SPEC-CHECK.md
Authored: 2026-05-19 (session date; iter-2 review completed 2026-05-20) by nightwork-spec-checker.
BLOCKING-1: CLOSED. BLOCKING-2: PARTIALLY CLOSED (HIGH-1-NEW fix required; no Jake re-auth).
Overall verdict: NEEDS WORK (one-line fix required before /nx).
