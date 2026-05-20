# Plan-review iter-1 synthesis — stage-f1-hook-doc-only-detect

**Generated:** 2026-05-20 12:20
**PLAN reviewed:** `.planning/phases/stage-f1-hook-doc-only-detect/HDOD-PLAN.md` (just-authored 2026-05-19 per nwrp191)
**Reviewer scope (LOCKED per nwrp189 §24 / nwrp191 §11-13):** spec-checker + custodian + security-reviewer (3 reviewers)
**Synthesis verdict:** **HALT — Rule 9 cross-reviewer factual disagreement on substantive plan design + 2 BLOCKING findings**

---

## Per-reviewer verdicts

| Reviewer | Verdict | Disk artifact |
|---|---|---|
| nightwork-spec-checker | PASS (with 2 WARNINGs, 3 NOTEs) | `PLAN-REVIEW-ITER1-SPEC-CHECK.md` |
| nightwork-custodian | PASS (no drift; planning tree clean; MASTER-PLAN alignment confirmed) | `PLAN-REVIEW-ITER1-CUSTODIAN.md` |
| security-reviewer | **NEEDS-WORK** (2 BLOCKING, 1 HIGH, 1 MEDIUM, 2 LOW, 1 INFO) | `PLAN-REVIEW-ITER1-SECURITY.md` |

---

## Rule 9 halt-gate analysis

**Cross-reviewer factual claim about the same artifact:** `.claude/hooks/foo.sh` files matching the new `^\.claude/hooks/` path regex.

- **spec-checker W-1 interpretation:** ".sh files under .claude/hooks/ qualify as doc-only-skip; PLAN s4 (lines 222-260) and T-HDOD-03 correctly document this as a deliberate trade-off pre-authorised by Q2 Amendment 1."
- **security-reviewer BLOCKING-1 interpretation:** "AC-HDOD-13a is internally inconsistent with PLAN §4. The `^\.claude/hooks/` path regex mechanically matches `.claude/hooks/nightwork-pre-commit.sh`. Ship commit (.sh + two .md files) will exit via doc-only-skip path, not via the QA timestamp gate." (Confirmed by mechanical regex test.)

**Mechanical reality (canonical state, verified by security-reviewer regex test):** the PLAN's `^\.claude/hooks/` path pattern matches `.claude/hooks/foo.sh` files — the path-allowlist branch will skip the QA gate for hook `.sh` edits.

**Source of the disagreement:** EXPANDED-SCOPE Q2 Amendment 1 (added per nwrp190 §11-12) said:

> "`.claude/hooks/` paths are in the doc-only allowlist for documentation files inside that directory (e.g., a README or comment block file). The `.claude/hooks/*.sh` executable files themselves are NOT in the allowlist (per the explicit-NO `.sh` clause above)."

This Amendment 1 intent (`.sh` under `.claude/hooks/` = explicit-NO; ship via QA gate) was carried forward into nwrp190 §17-22 AC-HDOD-13a resolution language ("ship commit passes via fresh-QA-timestamp legitimately... NOT via doc-only-skip — `.sh` is explicit-NO per Q2 Amendment 1").

But the PLAN's mechanical implementation (path regex `^\.claude/hooks/` without `.sh` exclusion) does NOT distinguish `.sh` from `.md` under that path — both skip. So the PLAN's regex implementation contradicts the AC-HDOD-13a wording AND EXPANDED-SCOPE Q2 Amendment 1 intent.

**Per CLAUDE.md Workflow posture Rule 9** ("Cross-reviewer factual disagreement HALT — Resolution requires verifying against source [not majority-rule consensus]"): mechanically, security-reviewer's regex test is the canonical source. The PLAN ships `.sh` edits via doc-only-skip path, NOT via QA gate. AC-HDOD-13a wording + Q2 Amendment 1 intent are not reflected in the implementation.

**This requires Jake's resolution call.**

---

## BLOCKING findings

### BLOCKING-1 (security-reviewer) — AC-HDOD-13a vs regex implementation contradiction

The ship commit (containing `.claude/hooks/nightwork-pre-commit.sh` + planning .md files) exits via doc-only-skip per the path regex, NOT via fresh-QA-timestamp as AC-HDOD-13a claims.

**Two resolution paths surfaced by security-reviewer (Jake picks):**

- **Option A (simpler):** Accept the ship exits via doc-only-skip. Amend AC-HDOD-13a wording to acknowledge the ship goes through doc-only-skip path (via `^\.claude/hooks/` path match), not via fresh QA timestamp. This security review sign-off cycle becomes the equivalent discipline attestation for the hook change (sign-off-cycle discipline per Rule 8 + nwrp160/161 precedent). Implication: Q2 Amendment 1's `.sh` explicit-NO intent is not implementable under Q1=C union with `.claude/hooks/` path allowlist; either Q1+Q2 must reconcile OR Amendment 1 reasoning is downgraded from "explicit-NO" to "governed by sign-off-cycle discipline" without mechanical enforcement.

- **Option B (mechanical):** Restrict the `^\.claude/hooks/` path regex to non-`.sh` files (e.g., `^\.claude/hooks/.*\.(md|txt|md\.[a-z]+)$` — match docs under that path, not executables). Adds ~3-5 lines complexity. Preserves Q2 Amendment 1 mechanical intent (`.sh` files under .claude/hooks/ DO fall through to QA gate). AC-HDOD-13a wording stands as authored.

**The choice is a substantive plan design decision** — not a typo. It affects:
- Whether sign-off-cycle discipline is convention-only or mechanically backed
- Whether ship of THIS slice exercises doc-only-skip (yes under A, no under B)
- Whether AC-HDOD-13b throwaway test is still meaningful (under A, ship itself proves the skip path; under B, throwaway is still needed)
- Q2 Amendment 1 / nwrp190 implementation fidelity

### BLOCKING-2 (security-reviewer) — T-HDOD-03 vs PLAN §6 internal contradiction

T-HDOD-03 (threat register) says Drummond grep gate "STILL fires" for doc-only commits; PLAN §6 correctly says it exits 0 before reaching Drummond. **Documentation fix only** — no regex or posture change required. The safety argument (no fixture-path overlap with doc allowlist) is sound; only the mechanism description in T-HDOD-03 is wrong. Plan-author to correct.

---

## HIGH-1 (security-reviewer) — Corollary of BLOCKING-1

Hook discipline-gate change ships without QA timestamp attestation unless Jake accepts Option A or Option B is implemented.

---

## MEDIUM-1 (security-reviewer) — Mechanical enforcement of `.sh` vs `.md` discipline

No mechanical enforcement distinguishes `.sh` from `.md` under `.claude/hooks/`; sign-off-cycle discipline is convention-only. Acceptable at current scale; flag for follow-up TD if pattern surfaces. Resolution depends on BLOCKING-1 disposition (under Option B, this MEDIUM is closed; under Option A, this MEDIUM becomes accepted-risk).

---

## WARNING from spec-checker (W-2) — execute-time scenario walk discipline

Each of the 8 scenario walk tests must confirm REAL `git add` staging occurred before piping payload to hook; shortcutting to empty STAGED produces false PASSes (because the existing path-allowlist branch trivially exits 0 on empty STAGED). Execute-time discipline concern; not a plan defect. Surface to executor at /nx authorization.

---

## LOW + NOTE findings

- **LOW-1 (security):** Pre-existing newline-in-filename edge case (inherited from line 43-50 branch; not introduced by this plan)
- **LOW-2 (security):** AC-HDOD-13b throwaway test cleanup should explicitly require `git reset --soft HEAD~1` to complete before any push operation (PLAN already requires this; LOW-2 is documentation precision request)
- **INFO-1 (security):** `foo.sh.md` compound extension would skip the gate (not a real attack surface; flagged for awareness)
- **N-1 (spec-checker):** Regex order is readability aspiration, not semantic
- **N-2 (spec-checker):** `HDOD-SUMMARY.md` not in `files_modified` frontmatter (minor completeness gap)
- **N-3 (spec-checker):** MASTER-PLAN §12 doesn't yet contain AC-HDOD-14 entries (expected; post-ship)

---

## Synthesis verdict

**HALT — REQUIRES JAKE RESOLUTION**

Per /np algorithm Step 4 + nwrp191 §17 + CLAUDE.md Workflow posture Rule 9:

The plan cannot proceed to /nx because:
1. **BLOCKING-1** is a substantive plan design decision (Option A vs Option B) requiring Jake's authorization — not an executor-resolvable issue
2. **Rule 9 cross-reviewer factual disagreement** on the `.claude/hooks/*.sh` regex behavior requires Jake-arbitrated source-verified resolution (security-reviewer's mechanical regex test is the canonical source; spec-checker's "deliberate trade-off" interpretation depends on whether Jake intended Option A semantics from the start)

Recommended next step:
1. Jake reviews this synthesis + the 3 per-reviewer disk artifacts
2. Jake picks Option A or Option B for BLOCKING-1
3. Plan-author applies plan amendments (Option A = AC-HDOD-13a rewording + Q2 Amendment 1 reasoning reframe; Option B = regex restriction + plan §4 §5 §7 §8 §9 updates)
4. Plan-author also fixes BLOCKING-2 (T-HDOD-03 wording) + N-2 (frontmatter completeness)
5. Re-dispatch plan-review iter-1 OR Jake authorizes plan-execute with documented Option-A acceptance language

**Ceiling tracking:** ~$5-7 of $15 spent so far across plan-author + 3 plan-reviewers. ~$8-10 headroom for amendments + execute + QA + ship.

**Per nwrp191 §17: do NOT auto-/nx; halt + surface to Jake.** This synthesis IS the surface.
