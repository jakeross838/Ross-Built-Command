# Plan-review iter-1 — Custodian check
## stage-f1-hook-doc-only-detect (HDOD)

**Date:** 2026-05-19
**Reviewer:** Nightwork custodian (plan-review pre-execute tier per CLAUDE.md Rule 8(d))
**Scope:** Planning tree state, MASTER-PLAN alignment, post-ship task actionability, organization conventions

---

## 1. VERDICT: **PASS**

All checks clear. Planning tree is clean, MASTER-PLAN alignment is accurate, post-ship tasks are actionable, and organization conventions are consistent with precedent (Wave-A iter-1-cleanup PLAN).

---

## 2. PLANNING TREE STATE

### Phase folder contents
- **File inventory:** `.planning/phases/stage-f1-hook-doc-only-detect/` contains exactly 1 file:
  - `HDOD-PLAN.md` (689 lines)
  
  **Status:** Clean. No orphan files from abandoned attempts. Matches the post-ship pattern (only PLAN file at pre-execute time; SUMMARY.md and QA-reviewer artifacts created during execute).

### Expansion artifacts
- `.planning/expansions/stage-f1-hook-doc-only-detect-EXPANDED-SCOPE.md` (309 lines) — APPROVED 2026-05-19 per nwrp190. Two amendments applied (Q2 hook-edit-discipline reasoning + Q5 custodian-task expansion). ✓
- `.planning/expansions/stage-f1-hook-doc-only-detect-SETUP-COMPLETE.md` (32 lines) — Auto-setup no-op (0 AUTO + 0 MANUAL per chore-plan posture). ✓
- `.planning/expansions/stage-f1-hook-doc-only-detect-AUTO-LOG.md` (46 lines) — Inventory derivation log, all 5 VALIDATE items PASS. ✓

**Status:** Complete and consistent. All three expansion artifacts present, sequenced, and cross-referenced correctly in PLAN lines 25-27.

---

## 3. MASTER-PLAN ALIGNMENT

### §11 TD Registry (TECH DEBT REGISTRY)
**Row 314 — TD-NW-HOOK-DOC-ONLY-DETECT**

Canonical entry located at `.planning/MASTER-PLAN.md:314`. Current state:
- **Item:** TD-NW-HOOK-DOC-ONLY-DETECT (hook-timestamp-skip structural issue)
- **Severity:** MEDIUM
- **Source:** nwrp163 → nwrp166 → nwrp169 (three-occurrence pattern)
- **Remediation:** Add file-extension filter (~1 hour effort; ~30 lines bash)

PLAN cross-references at:
- Line 18: "TD-NW-HOOK-DOC-ONLY-DETECT @ MASTER-PLAN §11 row 314"
- Line 49: "Close **TD-NW-HOOK-DOC-ONLY-DETECT** (`.planning/MASTER-PLAN.md` §11 row 314)"

**Alignment check:** ✓ EXACT MATCH. PLAN's reference language mirrors the canonical row wording. The PLAN accurately states this phase closes this TD.

### §12 NEXT PLANNED WORK (sequence positioning)
Current MASTER-PLAN §12 state (as of 2026-05-19):
- Wave-A iter-1 cleanup shipped 2026-05-19 (commits `ee9e1bc` + `56de959` + `a8ae5b1`)
- Slice-1 GATE 2 HALT pending Jake review
- Slice-2 dispatch gates: GATE 2 HALT clearance + Wave-A iter-1 cleanup sequencing decision

**PLAN sequence claims** (lines 33-37):
- `before: Slice-2 B-2 dispatch (per nwrp182 scheduling — hook calibration ships BEFORE Slice-2 to prevent further --no-verify bypass pattern accumulation)`
- `after: Wave-A iter-1 cleanup ship (RESOLVED 2026-05-19 per ee9e1bc + 56de959 + a8ae5b1)`

**Alignment check:** ✓ CONSISTENT. Wave-A iter-1 cleanup is confirmed shipped; this phase is positioned BEFORE Slice-2 B-2 per nwrp182 authorization. The sequencing language is accurate to git history and MASTER-PLAN §12.

**Post-ship custodian task:** PLAN line 677-680 lists the handoff items, including "Update MASTER-PLAN §12 NEXT PLANNED WORK to remove this phase from queue." This is actionable — custodian will mark the PLAN as shipped and promote Slice-2 into the immediate slot once /gsd-ship lands.

---

## 4. POST-SHIP CUSTODIAN TASK ACTIONABILITY

Per Q5=C + Amendment 2, three post-ship tasks are identified:

### Task 1: Mark TD-NW-HOOK-DOC-ONLY-DETECT CLOSED
**Language:** "Mark TD-NW-HOOK-DOC-ONLY-DETECT at MASTER-PLAN §11 row 314 as CLOSED with shipped commit SHA."
- **Actionable?** ✓ YES. Custodian will grep §11 row 314, add timestamp + ship commit SHA, mark status CLOSED.
- **Precedent:** Same pattern applied post-Slice-1 for TDs closed by B-1a, B-1a-bis, B-1b phases. Precedent at `.planning/MASTER-PLAN.md:300-304` (Wave-A iter-1 cleanup TDs listed with ship SHAs).

### Task 2: Append CLAUDE.md Rule 8(e) sub-clause
**Language:** "Append CLAUDE.md Workflow posture Rule 8(e) sub-clause documenting the doc-only-skip carve-out as a calibrated exception (per Q5=C)."
- **Actionable?** ✓ YES. PLAN §4 + EXPANDED-SCOPE Q5 narrative provide exact wording to append. Sub-clause rationale: doc-only-skip is a calibrated exception to Rule 8 fail-closed posture, NOT a posture change. Custodian appends after Rule 8(d) in CLAUDE.md §Workflow posture.
- **Precedent:** CLAUDE.md has been amended post-ship before (e.g., the nwrp133 compound-form-vs-no-verify note at line 288-300 was added post-merge). Inline append is acceptable; full extraction deferred per Amendment 2.

### Task 3: Evaluate CLAUDE.md size + rules extraction
**Language:** "**Evaluate** whether Rules 7/8/9 + Orchestration discipline subsection should extract to `.planning/discipline/*.md` with CLAUDE.md anchor references, given CLAUDE.md 45.1k > 40k size warning (per Q5 Amendment 2). NOT acting on extraction in this slice; custodian decides at sweep time. If endorsed → follow-up plan; if rejected → Rule 8(e) sub-clause appends inline as originally scoped."
- **Actionable?** ✓ YES, with clear decision branch. Custodian will:
  1. Check CLAUDE.md current byte size (pre-amendment)
  2. Estimate size post-Rule 8(e) append
  3. If post-append size <40k: append inline, close.
  4. If post-append size ≥40k: file follow-up TD + create `.planning/discipline/RULES-7-8-9.md` extraction plan for Wave-2+ roadmap.
- **Precedent:** Nightwork has extracted docs to `.planning/architecture/` multiple times (SYSTEM.md, COMPONENTS.md, etc.). Pattern is established; `.planning/discipline/` is a new directory but the extraction pattern is precedented.

**Critical:** All three tasks have clear, testable completion criteria and precedent. Custodian sweep can execute.

---

## 5. ORGANIZATION & NAMING CONVENTIONS

Compared against `.planning/phases/stage-f1-wave-a-iter1-cleanup/WA-iter1-cleanup-PLAN.md` (precedent for F1-phase PL ANs):

| Element | HDOD | Precedent (WA-iter1) | Alignment |
|---------|------|---------------------|-----------|
| **Frontmatter `phase:` field** | `stage-f1-hook-doc-only-detect` | `stage-f1-knowledge-graph-auth-wave-a` | ✓ Consistent naming convention (stage-f1-*) |
| **Frontmatter `plan:` field** | `HDOD` | `WA-iter1-cleanup` | ✓ Consistent (short identifier) |
| **Frontmatter `plan-name:` field** | `hook-doc-only-detect-extension-allowlist` | `search-path-revoke-extension-move` | ✓ Consistent (dash-separated, descriptive) |
| **Frontmatter `type:` field** | `execute` | `execute` | ✓ Consistent |
| **Frontmatter `wave:` field** | `standalone (chore phase, single-plan)` | `post-Wave-A (deferred per MED-WA-1)` | ✓ Consistent (contextual explanation) |
| **PLAN file naming** | `HDOD-PLAN.md` | `WA-iter1-cleanup-PLAN.md` | ✓ Consistent (`<plan-id>-PLAN.md`) |
| **Expansion file naming** | `stage-f1-hook-doc-only-detect-EXPANDED-SCOPE.md` (etc.) | `stage-f1-wave-a-iter1-cleanup-EXPANDED-SCOPE.md` (would be the pattern) | ✓ Consistent (`<phase-name>-ARTIFACT-TYPE.md`) |
| **Frontmatter `authored:` field** | `2026-05-19` | `2026-05-15 NIGHT` | ✓ Both use ISO date; both explicit |
| **Frontmatter `status:` field** | `AUTHORED — PENDING JAKE REVIEW AT PLAN-REVIEW ITER-1` | `AUTHORED — NOT DISPATCHED` | ✓ Consistent status language |
| **Frontmatter `halt_after:` field** | `true` | `true` | ✓ Both halt for Jake review |
| **AC naming convention** | `AC-HDOD-01..AC-HDOD-14` | `AC-WA-iter1-01..AC-WA-iter1-14` | ✓ Consistent (`AC-<plan-id>-NN`) |

**Status:** ✓ ALL ELEMENTS MATCH PRECEDENT. File structure, frontmatter, naming, and conventions are uniform with Wave-A iter-1 cleanup PLAN.

---

## 6. CROSS-CHECKS

### File path validity
- PLAN file: `.planning/phases/stage-f1-hook-doc-only-detect/HDOD-PLAN.md` ✓ (readable, 689 lines, git-tracked)
- Expansion files: all three present and readable ✓
- References to external files: MASTER-PLAN, CLAUDE.md, existing hook file `.claude/hooks/nightwork-pre-commit.sh` — all verified to exist ✓

### Frontmatter consistency
- All required fields present (phase, plan, plan-name, type, wave, depends_on, autonomous, halt_after, requires_smoke, threat_model_severity, status, authored, authored_by, authorization, source_decisions, files_modified, files_referenced, sequence, acceptance-criteria-target, qa_reviewers) ✓
- Field values are consistent with EXPANDED-SCOPE answers (Q1-Q6 selected values match PLAN §4-5) ✓

### Cross-references
- EXPANDED-SCOPE cited in PLAN line 25 ✓
- SETUP-COMPLETE cited in PLAN line 26 ✓
- AUTO-LOG cited in PLAN line 27 ✓
- MASTER-PLAN §11 row 314 cited in PLAN line 28 ✓
- CLAUDE.md Rules cited in PLAN lines 19, 29, 30 ✓

### AC coverage
- 15 ACs declared (line 38) ✓
- All 15 ACs itemized in §8 with verification steps ✓
- AC-HDOD-13 split into 13a + 13b per nwrp190 resolution (section 8, lines 544-545) ✓

---

## 7. NO DRIFT OR AMBIGUITY DETECTED

### Potential concerns (checked and clear)
- **Ambiguity on AC-HDOD-13:** Resolved per nwrp190 §17-22. PLAN language at lines 544-545 splits original ambiguity cleanly (13a = ship via fresh-QA-timestamp legitimately; 13b = throwaway doc-only test commit demonstrating skip path, then discarded). ✓
- **Hook-doc-vs-hook-executable trade-off:** Documented at PLAN §4 (lines 222-260) and EXPANDED-SCOPE Q2 Amendment 1 (lines 157-159). The carve-out (hook `.sh` edits qualify as doc-only-skip) is intentional and flagged for reviewer acceptance. ✓
- **Ceiling discipline:** $15 fresh-scoped ceiling declared (EXPANDED-SCOPE line 7, PLAN line 657). Cost projection (PLAN §12 lines 645-655) is within ceiling ($11-18 median ~$14). Per Rule 7d, if mid-execute projects exceed $15, executor HALTs. ✓
- **QA reviewer scope:** spec-checker + custodian + security-reviewer (3 reviewers, per cap) consistently cited in EXPANDED-SCOPE line 20, SETUP-COMPLETE line 27, PLAN line 39-42. ✓

---

## 8. SUMMARY FOR PLAN-REVIEW ITER-1 REVIEWERS

### Key points to validate
1. **Structural approach (§4 UNCHANGED-AND-AUGMENTED):** New union branch placed IMMEDIATELY AFTER existing line 43-50 path-allowlist branch, before Drummond grep gate. Existing lines 43-50 remain BYTE-IDENTICAL. Plan-review reviewers should diff-walk the final hook to confirm this structure.

2. **Fail-closed posture (§6 threat model T-HDOD-01, §4 Q3=A strict-mixed):** ANY file matching NEITHER the doc-only extension list NOR the doc-path allowlist → falls through to existing QA-timestamp gate. Scenario tests iii + iv (Task 2 manual walk) are CRITICAL — both must return non-zero exit OR fresh-QA-pass to confirm fail-closed posture is maintained.

3. **Hook-edit trade-off (§4 Q2 Amendment 1):** `.claude/hooks/*.sh` files qualify as doc-only-skip BY DESIGN because hook calibration discipline is sign-off-cycle (Rule 8 fail-closed contract), NOT QA-timestamp gate. Plan-review reviewers (security-reviewer in particular) must confirm they accept this trade-off. If not, this must surface to Jake for scope decision before /nx.

4. **Post-ship custodian task (AC-HDOD-14):** Rule 8(e) sub-clause append to CLAUDE.md + optional extraction evaluation. Custodian will execute per clear decision branch (append inline if <40k; extract if ≥40k).

### Blockers
- **None identified.** Planning tree is clean, MASTER-PLAN is accurate, post-ship tasks are actionable. Ready for Jake review.

---

## 9. RECOMMENDATION

**PASS — forward to Jake for substantive review per nwrp191 §17.**

Planning artifacts are organized, coherent, and consistent with precedent. PLAN language is clear and actionable. All acceptance criteria are falsifiable. Post-ship tasks are structured and documented for custodian execution.

Jake review checklist (per PLAN §11 lines 633-641):
- [ ] Confirm structural approach (§4 UNCHANGED-AND-AUGMENTED) is accepted.
- [ ] Confirm hook-doc-vs-hook-executable trade-off (§4 + T-HDOD-03) is accepted with documented sign-off-cycle discipline backstop.
- [ ] Confirm AC-HDOD-13 split (13a + 13b) language matches intent.
- [ ] Confirm $15 ceiling discipline.

Once Jake authorizes `/nx`, plan-execute + /nightwork-qa + ship proceed sequentially per PLAN §5 Task 1-4.

