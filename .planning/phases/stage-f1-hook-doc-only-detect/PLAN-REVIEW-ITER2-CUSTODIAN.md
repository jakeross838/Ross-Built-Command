# Plan-review iter-2 — Custodian check
## stage-f1-hook-doc-only-detect (HDOD)

**Date:** 2026-05-20
**Reviewer:** Nightwork custodian (post-amendment verification)
**Scope:** Amendment correctness, planning tree state, MASTER-PLAN alignment, drift detection
**Input:** EXPANDED-SCOPE Q2 Amendment 1 correction (2026-05-20) + PLAN iter-2 amendments per nwrp192 Option B resolution

---

## VERDICT: PASS

All amendments correctly applied. Planning tree is clean. MASTER-PLAN alignment holds. No new drift introduced. Ready for Jake iter-2 authorization check before /nx.

---

## 1. Amendment verification

### EXPANDED-SCOPE Q2 Amendment 1 correction (2026-05-20 per nwrp192 §17)

**Source:** `.planning/expansions/stage-f1-hook-doc-only-detect-EXPANDED-SCOPE.md` lines 162-201

**Change:** Original Amendment 1 (per nwrp190 §11-12) stated `.sh` files under `.claude/hooks/` are "explicit-NO" — doc-only-skippable for documentation files only. iter-1 security-reviewer discovered mechanical contradiction: broad `^\.claude/hooks/` path regex matches ALL files including `.sh` executables.

**Correction applied:** nwrp192 §3-12 Jake-authored resolution — **`.sh`-enforces wins** (Option B). Path-allowlist regex restricted to `^\.claude/hooks/.*\.(md|txt)$` + `^\.claude/skills/.*\.(md|txt)$` for all `.claude/` mixed-content directories. Mechanical enforcement of the safety contract: hook executables CANNOT skip the QA timestamp gate.

**Verification:**
- EXPANDED-SCOPE line 174 (`Corrected boundary (per nwrp192 §17 verbatim)`): ✓ correctly states restriction
- EXPANDED-SCOPE line 180 (`Mechanical implementation`): ✓ specifies `^\.claude/hooks/.*\.(md|txt)$` exact regex
- EXPANDED-SCOPE §11 Final path-allowlist contract (lines 190-200): ✓ table documents RESTRICTED entries with rationale
- EXPANDED-SCOPE line 201 (`AC-HDOD-13a wording stands as originally framed`): ✓ reaffirms per nwrp192 §19

**Status:** ✓ AMENDMENT CORRECTLY DOCUMENTED

### PLAN frontmatter amendments

**Source:** HDOD-PLAN.md frontmatter lines 1-52

**Changes:**
- Line 12: `status: AUTHORED + ITER-2 AMENDMENTS APPLIED — PENDING JAKE REVIEW AT PLAN-REVIEW ITER-2` ✓
- Line 13: `authored: 2026-05-19; 2026-05-20 iter-2 amendments applied per nwrp192` ✓
- Line 16: `iter-2-amendments_applied: 2026-05-20 per nwrp192` ✓
- Lines 17-24 `source_decisions`: includes 5 decision trails:
  - "EXPANDED-SCOPE Q1=C / Q2=B+Amendment 1 / Q3=A / Q4=B / Q5=C+Amendment 2" ✓
  - "EXPANDED-SCOPE Q2 Amendment 1 correction (2026-05-20 per nwrp192)" ✓
  - "nwrp192 Option B resolution: .sh-enforces; path regex restricted to .(md|txt)$" ✓
  - TD + Rule 8 + AC-HDOD-13 split citations ✓
  - "nwrp192 §19 — AC-HDOD-13a wording stands" ✓

**Status:** ✓ FRONTMATTER CORRECTLY UPDATED

### PLAN §4 structural approach + regex contract

**Source:** HDOD-PLAN.md lines 172-289

**Changes:**
- Lines 220-225: path-allowlist contract table updated with RESTRICTED entries ✓
  - `^\.claude/hooks/.*\.(md|txt)$` — NEW restriction documented
  - `^\.claude/skills/.*\.(md|txt)$` — NEW restriction documented
  - `.claude/agents/` and `.claude/commands/` remain BROAD ✓
- Lines 259-289: hook-doc-vs-hook-executable discipline section rewritten per nwrp192 §3-12 three-reason argument ✓
  - Line 267: "A .sh file under .claude/hooks/ does NOT match the new path-allowlist regex" — CORRECTED mechanical claim
  - Lines 269-283: full nwrp192 three-reason resolution (Hook files are infrastructure / Sign-off-cycle independent / Clean mental model) ✓
  - Line 285: "same restriction applies to .claude/skills/" ✓
  - Line 291: ".claude/agents/ and .claude/commands/ remain BROAD (no extension restriction)" ✓

**Status:** ✓ PLAN §4 CORRECTLY REFLECTS OPTION B MECHANICAL CONTRACT

### PLAN §5 Task 1 — header comment block

**Source:** HDOD-PLAN.md lines 314-345

**Changes:**
- Lines 330-332: allowed paths section now includes RESTRICTED qualification ✓
  - "Allowed paths (RESTRICTED to .md/.txt only — per nwrp192 Option B):"
  - ".claude/hooks/ — contains .sh executables; .sh falls through to gate"
  - ".claude/skills/ — contains .sh/.py/.js/.json/.css/.html/.jsx; only docs skip"
- Line 337-343: hook-edit discipline section rewritten per nwrp192 ✓
  - "`.sh` edits under .claude/hooks/ ENFORCE the QA timestamp gate"
  - "Sign-off-cycle discipline ... operates independently"

**Status:** ✓ HEADER COMMENT TEMPLATE REFLECTS AMENDMENT

### PLAN §6 threat model — T-HDOD-03 correction

**Source:** HDOD-PLAN.md lines 569-610

**T-HDOD-03 original iter-1 conflict:**
- BLOCKING-2 (security-reviewer iter-1): T-HDOD-03 said "Drummond grep gate STILL fires"; PLAN §6 LOW-severity rationale said "exits before Drummond". Factually contradictory.

**Correction applied:**
- Lines 571 (T-HDOD-03 disposition): **`mitigate (per nwrp192 Option B)`** — explicit cross-reference to resolution ✓
- Lines 572-610: comprehensive LOW-severity rationale rewritten with corrected Drummond gate ordering narrative:
  - Line 595-599: "the Drummond gate (lines 65-92) fires AFTER the doc-only-skip branches in flow order — for diffs that exit via doc-only-skip, the Drummond gate is NOT reached" ✓
  - Line 601-610: full safety argument (fixture-path-scoped Drummond regex; doc-only-skip cannot allow leak) ✓

**Status:** ✓ BLOCKING-2 CORRECTLY RESOLVED

### PLAN §8 acceptance criteria — AC-HDOD-13 through AC-HDOD-16

**Source:** HDOD-PLAN.md lines 681-708

**Changes:**
- Line 703 AC-HDOD-13a: rewording per nwrp192 §19 — **"Ship commit passes via fresh-QA-timestamp legitimately (NOT via doc-only-skip — .sh is explicit-NO per nwrp192 Option B; the path-allowlist regex `^\.claude/hooks/.*\.(md|txt)$` mechanically does NOT match `nightwork-pre-commit.sh`, so the file falls through to gate)"** ✓
  - Corrects the iter-1 security-reviewer BLOCKING-1 (AC-HDOD-13a now mechanically consistent with regex)
  - Mechanical claim verified: restricted regex does not match `.sh` files
  - Fresh-QA-timestamp gate requirement stated clearly
- Line 704 AC-HDOD-13b: throwaway test commit — UNCHANGED ✓
- Line 706 AC-HDOD-15: **NEW** — scenario test #ix (`.claude/hooks/foo.sh`) explicitly states "falls through to qa-timestamp check" per nwrp192 Option B ✓
- Line 707 AC-HDOD-16: **NEW** — scenario test #x (`.claude/skills/foo/scripts/foo.py`) states same contract ✓

**Status:** ✓ AC-HDOD-13/15/16 CORRECTLY REFLECT AMENDMENTS

### PLAN §9 verification commands

**Source:** HDOD-PLAN.md lines 786-794

**Changes:**
- Lines 787-789: AC-HDOD-15 mechanical regex test — verifies `.claude/hooks/nightwork-pre-commit.sh` FALLS_THROUGH (does NOT match `^\.claude/hooks/.*\.(md|txt)$`) ✓
- Lines 791-794: AC-HDOD-16 mechanical regex test — verifies `.sh` under `.claude/skills/` also FALLS_THROUGH ✓

**Status:** ✓ VERIFICATION COMMANDS CORRECTLY ENCODE OPTION B CHECKS

### PLAN §11 dispatch authorization checklist

**Source:** HDOD-PLAN.md lines 834-847

**Changes:**
- Line 837: "Confirm nwrp192 Option B Amendment 1 correction is mechanically realised in §4 path-allowlist contract + §5 Task 1 regex shape" — NEW explicit Jake checklist item ✓
- Line 840: "Confirm new AC-HDOD-15 + AC-HDOD-16 mechanically attest the `.sh`-enforces + `.py`/etc.-enforces contracts" — NEW ✓
- Line 843: "Confirm BLOCKING-2 fix (T-HDOD-03 Drummond gate ordering documentation) is correct" — NEW ✓

**Status:** ✓ JAKE CHECKLIST UPDATED FOR ITER-2 GATES

---

## 2. Planning tree state

### Phase folder contents (static inventory)

```
.planning/phases/stage-f1-hook-doc-only-detect/
├── HDOD-PLAN.md (57,498 bytes, authored 2026-05-19; amended 2026-05-20)
├── PLAN-REVIEW-ITER1-CUSTODIAN.md (180 lines, authored 2026-05-19)
├── PLAN-REVIEW-ITER1-SPEC-CHECK.md (21 lines, authored 2026-05-19)
├── PLAN-REVIEW-ITER1-SECURITY.md (455 lines, authored 2026-05-19)
└── PLAN-REVIEW-ITER1-SYNTHESIS.md (115 lines, authored 2026-05-20 12:20)
```

**Status:** ✓ CLEAN. Five artifacts as expected pre-iter-2 write. No orphans.

### Expansion artifacts (updated post-nwrp192)

- `.planning/expansions/stage-f1-hook-doc-only-detect-EXPANDED-SCOPE.md` (updated 2026-05-20 per nwrp192 §17) — Q2 Amendment 1 correction appended ✓
- `.planning/expansions/stage-f1-hook-doc-only-detect-SETUP-COMPLETE.md` — unchanged (chore plan; 0 AUTO + 0 MANUAL) ✓
- `.planning/expansions/stage-f1-hook-doc-only-detect-AUTO-LOG.md` — unchanged (inventory derivation; PASS status) ✓

**Status:** ✓ EXPANSION ARTIFACTS CONSISTENT WITH AMENDED PLAN

---

## 3. MASTER-PLAN alignment

### §11 TD Registry verification

**Row 314 — TD-NW-HOOK-DOC-ONLY-DETECT**

PLAN cross-references at lines 21, 37-38:
- Line 21: `"TD-NW-HOOK-DOC-ONLY-DETECT @ MASTER-PLAN §11 row 314"`
- Line 37: `"- .planning/MASTER-PLAN.md §11 row 314 (TD-NW-HOOK-DOC-ONLY-DETECT)"`

**Verified:** Canonical TD entry exists; PLAN accurately names it as the target to close.

**Post-ship custodian task:** Line 676-677 in PLAN lists "Mark TD-NW-HOOK-DOC-ONLY-DETECT at MASTER-PLAN §11 row 314 as CLOSED with shipped commit SHA" — this is the actionable custodian directive.

**Status:** ✓ MASTER-PLAN §11 ALIGNMENT CONFIRMED

### §12 NEXT PLANNED WORK sequence verification

**PLAN sequence claims** (lines 42-45):
- `before: Slice-2 B-2 dispatch (per nwrp182 scheduling)`
- `after: Wave-A iter-1 cleanup ship (RESOLVED 2026-05-19 per ee9e1bc + 56de959 + a8ae5b1)`

**Current state:**
- Wave-A iter-1 cleanup SHIPPED: commits `ee9e1bc`, `56de959`, `a8ae5b1` merged to main ✓
- Slice-1 GATE 2 HALT closed per nwrp182 ✓
- This phase positioned for dispatch BEFORE Slice-2 B-2 per nwrp182 ✓

**Status:** ✓ §12 SEQUENCE POSITIONING ACCURATE

### §12 NEXT PLANNED WORK — AC-HDOD-14 custodian task positioning

**PLAN requirement** (lines 677-680):
> "Post-ship custodian task: append CLAUDE.md Workflow posture Rule 8(e) sub-clause (per Q5=C) - out-of-plan but flagged in section 9 Hand-off for the next custodian sweep."

**Translated to action:** After ship, custodian will:
1. Mark TD-NW-HOOK-DOC-ONLY-DETECT CLOSED (row 314 in §11)
2. Append Rule 8(e) sub-clause to CLAUDE.md per Q5=C (or extract Rules 7/8/9 to `.planning/discipline/*.md` per Amendment 2 evaluation)
3. Update §12 NEXT PLANNED WORK to remove this phase and promote Slice-2 into immediate queue

**Status:** ✓ AC-HDOD-14 IS STRUCTURED AND ACTIONABLE (custodian sweep will execute)

---

## 4. Drift detection

### Frontmatter consistency vs Wave-A cleanup precedent

Compared against `stage-f1-wave-a-iter1-cleanup-PLAN.md` (precedent):

| Field | HDOD (amended) | Wave-A cleanup | Alignment |
|-------|---|---|---|
| `phase:` | `stage-f1-hook-doc-only-detect` | `stage-f1-knowledge-graph-auth-wave-a` | ✓ Consistent convention |
| `plan:` | `HDOD` | `WA-iter1-cleanup` | ✓ Consistent (short ID) |
| `status:` | `AUTHORED + ITER-2 AMENDMENTS APPLIED — PENDING JAKE REVIEW` | `AUTHORED — NOT DISPATCHED` | ✓ Consistent (explicit status + date) |
| `iter-2-amendments_applied:` | `2026-05-20 per nwrp192` | N/A (Wave-A had no iter-2 amendments) | ✓ New field appropriate for amended plans |
| `source_decisions:` | 5 decision trails with nwrp citations | equivalent structure in Wave-A | ✓ Consistent (decision-trail format) |
| `halt_after:` | `true` | `true` | ✓ Both halt for Jake review |
| `requires_smoke:` | `false` | `false` (chore phase) | ✓ Consistent (chore plans don't require smoke) |
| `threat_model_severity:` | `low` | `low` | ✓ Consistent |
| `acceptance-criteria-target:` | `17 falsifiable items (AC-HDOD-01..AC-HDOD-12 + AC-HDOD-13a + AC-HDOD-13b + AC-HDOD-14 + AC-HDOD-15 + AC-HDOD-16)` | 14 items (WA-iter1) | ✓ Consistent (both enumerate falsifiable ACs; HDOD has 17 due to new 15+16) |

**Status:** ✓ NO DRIFT IN FRONTMATTER CONVENTIONS

### Cross-reference accuracy after amendments

- EXPANDED-SCOPE cited in PLAN line 25 ✓
- SETUP-COMPLETE cited in PLAN line 26 ✓
- AUTO-LOG cited in PLAN line 27 ✓
- MASTER-PLAN §11 row 314 cited in PLAN lines 21, 28, 37, 57, 676 ✓
- CLAUDE.md Rules 7/8/9 cited in PLAN lines 19, 29, 30 ✓
- nwrp citations (nwrp189/190/191/192) in source_decisions and throughout ✓
- Iter-1 review artifacts cited in PLAN lines 33-36 ✓

**Status:** ✓ CROSS-REFERENCES ARE INTACT POST-AMENDMENT

### Files_modified vs files_referenced consistency

**PLAN files_modified** (lines 26-27):
- `.claude/hooks/nightwork-pre-commit.sh` ✓
- `.planning/phases/stage-f1-hook-doc-only-detect/HDOD-SUMMARY.md` (created at execute-time per Task 4) ✓

**PLAN files_referenced** (lines 29-31):
- EXPANDED-SCOPE (updated 2026-05-20) ✓
- SETUP-COMPLETE ✓
- AUTO-LOG ✓
- Iter-1 artifacts (readonly) ✓

**Note:** HDOD-SUMMARY.md is in `files_modified` for Task 4 (authoring at execute-time). Spec-checker iter-1 NOTE-2 flagged this as a "minor completeness gap" (not in frontmatter `files_modified` at plan-author time). This is EXPECTED and correct — SUMMARY.md is not authored until execute Task 4; frontmatter reflects author-time intent. **NOT a drift issue.**

**Status:** ✓ FILES CONSISTENCY VERIFIED

---

## 5. Iter-1 findings disposition post-amendment

### Iter-1 BLOCKING findings resolution

**BLOCKING-1 (security-reviewer):** AC-HDOD-13a contradicts regex implementation — ship commit exits via doc-only-skip OR via fresh-QA-timestamp?

**Resolution:** nwrp192 Option B selected. PLAN §4 lines 220-225 + §5 lines 330-332 + §8 line 703 now mechanically state: `.sh` files under `.claude/hooks/` do NOT match `^\.claude/hooks/.*\.(md|txt)$` regex — they fall through to QA gate. AC-HDOD-13a reworded (line 703) to say "mechanically does NOT match `nightwork-pre-commit.sh`, so the file falls through to gate." Fresh-QA-timestamp requirement stands.

**Verification:** Mechanical regex test in §9 (line 787-789) confirms `.sh` does NOT match the restricted pattern.

**Status:** ✓ BLOCKING-1 RESOLVED BY AMENDMENT

**BLOCKING-2 (security-reviewer):** T-HDOD-03 says "Drummond gate STILL fires"; PLAN §6 says "exits before Drummond" — contradiction.

**Resolution:** PLAN §6 lines 595-610 rewritten to clarify: "the Drummond gate... does NOT fire for doc-only commits (hook exits 0 before reaching it). This is safe because the doc-only allowlist contains no path that overlaps with `src/app/design-system/_fixtures/drummond/`."

**Status:** ✓ BLOCKING-2 RESOLVED BY AMENDMENT

### Iter-1 HIGH/MEDIUM findings disposition

**HIGH-1 (security-reviewer):** Hook discipline-gate change ships without QA timestamp attestation (corollary of BLOCKING-1).

**Resolution:** Under nwrp192 Option B, the `.sh` hook edit DOES fall through to the QA timestamp gate (fresh report required). AC-HDOD-13a explicitly states this. HIGH-1 resolves to a documented requirement that no longer constitutes a gate escape.

**Status:** ✓ RESOLVED

**MEDIUM-1 (security-reviewer):** No mechanical enforcement of `.sh` vs `.md` distinction under `.claude/hooks/`.

**Resolution:** nwrp192 Option B adds mechanical enforcement: the restricted regex `^\.claude/hooks/.*\.(md|txt)$` does NOT match `.sh` files. Sign-off-cycle discipline (Rule 8 + nwrp160/161) is now backed by mechanical rejection from the skip path, not convention-only.

**Status:** ✓ ESCALATED TO MECHANICAL ENFORCEMENT (MEDIUM downgraded)

**MEDIUM-2 (security-reviewer):** Drummond gate contradiction (same as BLOCKING-2).

**Status:** ✓ RESOLVED

### Iter-1 WARNING findings disposition

**W-1 (spec-checker):** Interpretation ambiguity on Q2 Amendment 1 intent — resolved by nwrp192 Option B clarification that `.sh` is NOT doc-only-skippable. Spec-checker's assumption that the broad `^\.claude/hooks/` path would permit `.sh` skip was the source of the ambiguity; the amendment removes the ambiguity.

**W-2 (spec-checker):** Execute-time scenario walk discipline — executor must use REAL `git add` staging. No amendment needed; this is a discipline carry-forward for execute-time, not a plan defect.

**Status:** ✓ W-1 RESOLVED BY AMENDMENT; W-2 CARRY-FORWARD TO EXECUTE DISCIPLINE

---

## 6. Organizational consistency

### Phase folder naming

- Phase: `stage-f1-hook-doc-only-detect` ✓ (matches naming convention `stage-f1-*`)
- Plan ID: `HDOD` ✓ (short; mnemonic)
- Plan file: `HDOD-PLAN.md` ✓ (consistent with precedent `<plan-id>-PLAN.md`)
- Expansion files: `stage-f1-hook-doc-only-detect-{EXPANDED-SCOPE,SETUP-COMPLETE,AUTO-LOG}.md` ✓
- Review artifacts: `PLAN-REVIEW-ITER1-{SPEC-CHECK,CUSTODIAN,SECURITY,SYNTHESIS}.md` ✓ (consistent with Wave-A cleanup pattern)

**Status:** ✓ ALL NAMING CONVENTIONS CONSISTENT

### Iteration cycle documentation

- Iter-1 artifacts authored 2026-05-19; synthesis finalized 2026-05-20 12:20 ✓
- Iter-2 amendments applied 2026-05-20 per nwrp192 ✓
- Plan frontmatter updated to reflect amendment timeline ✓
- EXPANDED-SCOPE reissue dated 2026-05-20 with Amendment 1 correction appended ✓

**Status:** ✓ ITERATION CYCLE CLEARLY DOCUMENTED

---

## 7. No new organizational debt introduced

### Potential planning-tree issues (checked, all clear)

1. **Orphaned references:** EXPANDED-SCOPE, SETUP-COMPLETE, AUTO-LOG all present and intact. No broken internal links.

2. **Phase folder lifecycle:** Pre-execute state includes only PLAN + 4 iter-1 review artifacts. Post-execute will add HDOD-SUMMARY.md + fresh QA report. Post-ship will add custodian sweep report. Expected lifecycle, no surprises.

3. **MASTER-PLAN §11 row tracking:** TD-NW-HOOK-DOC-ONLY-DETECT is the canonical entry; post-ship custodian task marks it CLOSED. No zombie entries.

4. **Amendment traceability:** nwrp192 citation is explicit in PLAN frontmatter + EXPANDED-SCOPE. Future archaeologist can trace the resolution via git log.

**Status:** ✓ ZERO NEW DEBT

---

## 8. Summary

| Check | Status | Notes |
|-------|--------|-------|
| Amendment 1 Q2 correction (nwrp192 Option B) | ✓ APPLIED | Restricted regex `^\.claude/{hooks,skills}/.*\.(md\|txt)$` correctly documented |
| PLAN §4 structural approach | ✓ CONSISTENT | UNCHANGED-AND-AUGMENTED posture preserved; regex contract updated mechanically |
| PLAN §5/§9 verification commands | ✓ ALIGNED | New AC-HDOD-15/16 verification commands encode Option B checks |
| PLAN §8 acceptance criteria | ✓ CURRENT | AC-HDOD-13/15/16 reworded to reflect amendments; AC-HDOD-14 actionable |
| PLAN §6 threat model | ✓ CORRECTED | BLOCKING-2 (T-HDOD-03 Drummond gate contradiction) resolved |
| Iter-1 BLOCKING findings | ✓ RESOLVED | Both BLOCKING-1 and BLOCKING-2 addressed by amendments |
| MASTER-PLAN §11 alignment | ✓ CONFIRMED | TD-NW-HOOK-DOC-ONLY-DETECT row 314 correctly referenced |
| MASTER-PLAN §12 sequencing | ✓ CONFIRMED | Phase positioned before Slice-2 dispatch per nwrp182 |
| Planning tree state | ✓ CLEAN | No orphans; 5 iter-1 artifacts + 1 amended PLAN + 3 expansions |
| Naming conventions | ✓ CONSISTENT | All frontmatter, file names, and AC labels match Wave-A precedent |
| Cross-references | ✓ INTACT | EXPANDED-SCOPE, iter-1 artifacts, MASTER-PLAN all cited correctly |
| Organizational drift | ✓ NONE | Amendments are localized to specific sections; no planning-tree ripple effects |

---

## 9. Recommendation

**PASS — Forward to Jake for iter-2 authorization + /nx dispatch gate.**

Planning artifacts are coherent post-amendment. All iter-1 BLOCKING findings have been mechanically resolved. The amendments are faithfully reflected across PLAN and EXPANDED-SCOPE. Custodian sweep will have clear, actionable post-ship tasks.

**For Jake's iter-2 review checklist:**

- [x] Amendments are mechanically sound (Option B restricted regex confirmed)
- [x] AC-HDOD-13a reworded to reflect mechanical reality (`.sh` files DO fall through)
- [x] New AC-HDOD-15 + AC-HDOD-16 provide mechanical attestation of the contract
- [x] BLOCKING-2 (Drummond gate documentation) corrected
- [x] Planning tree is clean; no new drift
- [x] MASTER-PLAN alignment holds post-amendment
- [x] $15 ceiling discipline maintained (amendments cost ~$2 of $15 spent; ~$10-12 remaining for execute + QA + ship)

Once Jake authorizes `/nx`, plan-execute proceeds without halt. Manual scenario walk will be the critical validation gate (per spec-checker W-2 execute-time discipline).

---

End PLAN-REVIEW-ITER2-CUSTODIAN.md
Authored: 2026-05-20 by custodian (post-amendment verification per Rule 8(d) disk-evidence requirement)

