---
reviewer: security-reviewer
role: load-bearing (per nwrp191 §13; iter-2 re-review per nwrp192)
phase: stage-f1-hook-doc-only-detect
plan: HDOD
verdict: NEEDS-WORK
authored: 2026-05-20
iter: 2
blocking_findings: 0
high_findings: 1
medium_findings: 0
low_findings: 1
info_findings: 1
iter1_findings_closed: BLOCKING-1 CLOSED / BLOCKING-2 PARTIALLY-CLOSED / HIGH-1 CLOSED / MEDIUM-1 DOWNGRADED-TO-INFO / MEDIUM-2 PARTIALLY-CLOSED
---

# Plan-Review Iter-2 — Security Reviewer
## Hook doc-only detection extension-allowlist (HDOD) — Amendment verification

This is the load-bearing iter-2 security review per nwrp192. Scope is mechanical
re-testing of the two BLOCKING fixes authorized per nwrp192 Option B. All tests
below were run via Bash tool — no inferences from plan text.

---

## Verdict: NEEDS-WORK

**Zero BLOCKING findings. One HIGH finding (residual from BLOCKING-2 — Task 1
header comment ships ambiguous Drummond-gate wording into the actual hook file).
All other iter-1 findings are closed or downgraded.**

The Option B regex restriction is mechanically correct and all critical
security properties are verified. The HIGH finding requires a one-line fix
in the proposed hook comment block before execute; it does not require Jake
re-authorization.

---

## Mandatory mechanical test results

Per nwrp192 §33-35, every test was executed via Bash. Results below are
verbatim from tool output.

### Test 1 — `.claude/hooks/` regex: `^\.claude/hooks/.*\.(md|txt)$`

| Filename | Expected | Actual | Result |
|---|---|---|---|
| `.claude/hooks/nightwork-pre-commit.sh` | NO_MATCH | NO_MATCH | PASS |
| `.claude/hooks/README.md` | MATCH | MATCH | PASS |
| `.claude/hooks/foo.txt` | MATCH | MATCH | PASS |
| `.claude/hooks/script.sh.md` | MATCH (INFO-1 acceptable) | MATCH | PASS |
| `.claude/hooks/foo` (no extension) | NO_MATCH | NO_MATCH | PASS |
| `.claude/hooks/subdir/foo.sh` | NO_MATCH | NO_MATCH | PASS |
| `.claude/hooks/subdir/foo.md` | MATCH | MATCH | PASS |

**All 7 hooks tests: PASS. The `.sh` ship file does NOT match; a hypothetical
`.claude/hooks/README.md` does match. This is the corrected behavior per Option B.**

### Test 2 — `.claude/skills/` regex: `^\.claude/skills/.*\.(md|txt)$`

| Filename | Expected | Actual | Result |
|---|---|---|---|
| `.claude/skills/continuous-learning-v2/agents/observer-loop.sh` | NO_MATCH | NO_MATCH | PASS |
| `.claude/skills/continuous-learning-v2/scripts/instinct-cli.py` | NO_MATCH | NO_MATCH | PASS |
| `.claude/skills/impeccable/scripts/live-browser.js` | NO_MATCH | NO_MATCH | PASS |
| `.claude/skills/foo/SKILL.md` | MATCH | MATCH | PASS |
| `.claude/skills/foo/config.json` | NO_MATCH | NO_MATCH | PASS |
| `.claude/skills/foo/style.css` | NO_MATCH | NO_MATCH | PASS |

**All 6 skills tests: PASS. Real executables in the repo (`.sh`, `.py`, `.js`)
correctly fall through. Only `.md` docs skip.**

### Test 3 — AC-HDOD-11 Drummond gate byte-identical verification

Current hook confirmed:
- `DRUMMOND_PATTERN=` at line 65
- Closing `fi` of Drummond gate at line 92
- 28 lines total in the content-anchored gate region
- awk content-anchor `DRUMMOND_PATTERN=` ... `/^fi$/` extracts correctly

The new branch will be inserted after line 50, shifting the Drummond gate block
by ~30-40 lines. PLAN §9 AC-HDOD-11 verification command correctly uses
content-anchored awk diff (not line-number diff) to handle this shift. The
awk anchor `DRUMMOND_PATTERN=` is unique in the hook file (only one occurrence).
**AC-HDOD-11 verification approach is mechanically sound.**

The PLAN §5 Task 1 sub-step 4 explicitly states: "No other lines touched. The
Drummond grep gate (existing lines 65-92) [...] MUST remain byte-identical."
The new union branch is insertd BEFORE the Drummond comment at existing line 52.
**No path exists in the plan's execute instructions for the Drummond gate to be
touched. AC-HDOD-11 is contractually guaranteed by the structural approach.**

### Test 4 — BLOCKING-2 closure: T-HDOD-03 Drummond gate ordering corrected

**T-HDOD-03 STRIDE register entry (PLAN line 571):** Corrected. States:
"Drummond grep gate (lines 65-92) fires AFTER the doc-only-skip branches; for
diffs that exit via doc-only-skip (e.g., pure `.md`), the Drummond gate is NOT
reached."

**§6 LOW-severity rationale point 5 (PLAN lines 595-610):** Correct. States:
"fires AFTER the doc-only-skip branches in flow order — for diffs that exit via
doc-only-skip, the Drummond gate is NOT reached."

**PLAN §5 Task 1 header comment (line 324):** AMBIGUOUS. See HIGH-1 below.

BLOCKING-2 is PARTIALLY CLOSED: the STRIDE register and §6 rationale are both
corrected. A residual inaccuracy exists in the proposed hook comment code block.

### Test 5 — env-flag bypass unchanged

Lines 9-10 verified verbatim:
```
9:  [[ "$NIGHTWORK_HOOKS_DISABLE" == "1" ]] && exit 0
10: [[ "$NIGHTWORK_PRECOMMIT_DISABLE" == "1" ]] && exit 0
```
PLAN places new branch after line 50; env-flag exits at lines 9-10 before
everything. **Env-flag bypass: PASS. Unchanged.**

### Test 6 — Q3=A strict-mixed posture + all 10 scenarios (full regex)

Tested the complete PLAN §4 `grep -vE` regex against 19 filenames including
all 8 original scenarios + scenarios ix, x (new per nwrp192) + 9 additional
edge cases.

**Core 10 scenarios (PLAN §5 Task 2 scenario table):**

| # | Staged files | Expected | Actual | Result |
|---|---|---|---|---|
| i | `foo.md` | skip | skip | PASS |
| ii | `notes.txt` | skip | skip | PASS |
| iii | `src/foo.ts` | fallthrough | fallthrough | PASS |
| iv | `foo.md` + `src/foo.ts` | fallthrough | fallthrough | PASS |
| v | `.claude/agents/foo.md` | skip | skip | PASS |
| vi | `LICENSE` | skip | skip | PASS |
| vii | `.planning/expansions/foo.md` | skip | skip | PASS |
| viii | `.gitignore` | skip | skip | PASS |
| ix | `.claude/hooks/foo.sh` | fallthrough | fallthrough | PASS |
| x | `.claude/skills/foo/scripts/foo.py` | fallthrough | fallthrough | PASS |

**Additional edge cases all PASS.** The CRITICAL fall-through scenarios (iii,
iv, ix, x) all correctly produce `NON_DOC` non-empty. No regex gap detected.

### Test 7 — HIGH-1 and MEDIUM-1 closure under Option B

**HIGH-1:** `.claude/hooks/nightwork-pre-commit.sh` does NOT match
`^\.claude/hooks/.*\.(md|txt)$`. Mechanically verified. The ship commit
will fall through to the QA timestamp gate, NOT exit via doc-only-skip.
**HIGH-1: CLOSED.**

**MEDIUM-1:** The regex restriction IS the mechanical enforcement that
MEDIUM-1 required. `.sh` under `.claude/hooks/` falls through mechanically,
not by convention. T-HDOD-03 updated to reflect "Mechanical enforcement, not
convention-only." **MEDIUM-1: DOWNGRADED to INFO (documented, no action needed).**

### Test 8 — New issues from amendments

**Bash regex quoting:** The PLAN §4 proposed regex is in single quotes in the
`grep -vE` call. Single-quoted regex in bash is safe — no variable expansion,
no word-splitting. Tested: regex parses correctly; `NON_DOC` for `.sh` file
is non-empty (falls through); `NON_DOC` for `.md` file is empty (skips).
**No quoting vulnerability.**

**`set -e` + `|| true` interaction:** The new branch uses `|| true` after
`grep -vE`, matching the identical pattern at line 46 (`NON_PLANNING`
assignment). If `grep -vE` returns 1 (all lines filtered = doc-only), `|| true`
converts to exit 0, `NON_DOC=''`, doc-only skip fires correctly. Without `||
true`, `set -e` would exit the hook with code 1 (BLOCK). The `|| true` is
present in the PLAN §4 code block. **No new `set -e` concern.**

**Variable conflict:** `NON_DOC` (new) and `NON_PLANNING` (existing) are
distinct variable names. `STAGED` is set once at line 44 and reused across
both branches — same pattern as before; no race condition introduced.
**No variable conflict.**

**No other new concerns** from the amendments. The amendments are additive and
scoped to the regex restriction.

---

## Per-finding status table

| ID | Severity | Description | Status |
|---|---|---|---|
| BLOCKING-1 | ~~BLOCKING~~ | AC-HDOD-13a claimed `.sh` is "explicit-NO" but `^\.claude/hooks/` matched `.sh` by design | **CLOSED** — Option B restricted regex to `.(md|txt)$`; AC-HDOD-13a rewritten to correctly state `.sh` falls through to gate |
| BLOCKING-2 | ~~BLOCKING~~ → HIGH | T-HDOD-03 "STILL fires" contradicted §6 early-exit. T-HDOD-03 and §6 are now corrected. BUT the proposed hook header comment at Task 1 line 324 still ships "Drummond grep gate still fires regardless" which is AMBIGUOUS for doc-only-skip path. | **PARTIALLY CLOSED → HIGH-1** (new designation, see below) |
| HIGH-1 | ~~HIGH~~ | Ship commit going through doc-only-skip path; hook change shipping without QA timestamp gate | **CLOSED** — Option B ensures `.sh` falls through to QA gate mechanically |
| MEDIUM-1 | ~~MEDIUM~~ | No enforcement mechanism distinguishes `.sh` from `.md` under `.claude/hooks/` | **DOWNGRADED to INFO** — Option B regex IS the mechanical enforcement |
| MEDIUM-2 | ~~MEDIUM~~ | Duplicate of BLOCKING-2 for findings visibility | **CLOSED** (same as BLOCKING-2 tracking) |
| LOW-1 | LOW | Newlines in filenames cause grep pipe splitting | **OPEN** — pre-existing; no change; explicitly tracked as T-HDOD-07 |
| LOW-2 | LOW | Throwaway test cleanup ordering ambiguous | **CLOSED** — Task 3 cleanup sub-step now explicit: `git reset --soft HEAD~1` + `git restore --staged` + `rm` + verification before push |
| INFO-1 | INFO | `foo.sh.md` compound extension skips gate | **OPEN** — explicitly tracked as T-HDOD-08; no action needed |

---

## New finding introduced by iter-2 amendments

### HIGH-1-NEW: Proposed hook header comment ships ambiguous Drummond ordering statement

**Severity:** HIGH

**Location:** PLAN §5 Task 1 header comment code block, line 324 of HDOD-PLAN.md.
This text will be written VERBATIM into `.claude/hooks/nightwork-pre-commit.sh`
by the executor.

**Exact text (from PLAN code block):**
```
# If every file in `git diff --cached --name-only` matches either an allowed
# doc extension OR an allowed doc-bearing path, skip the qa-runs timestamp
# check + verdict check below. ANY file matching neither list → fall through
# to the existing gate (Drummond grep gate still fires regardless).
```

**The problem:** "Drummond grep gate still fires regardless" is grammatically
scoped to the fall-through path ("ANY file matching neither list → fall through
... (Drummond ... fires)"). For that path it is CORRECT — Drummond does fire.
BUT "regardless" is ambiguous. A reader of the installed hook who reads only the
header comment could interpret it as "Drummond fires regardless of doc-only-skip"
— which is WRONG. For doc-only-skip (exit 0 path), the hook never reaches
Drummond. This contradicts the correctly-stated ordering in T-HDOD-03 and §6,
which took two iterations to get right. Shipping ambiguous text into the actual
hook comment undermines the BLOCKING-2 fix.

**Security concern:** If a future reviewer relies on the hook header comment
(which is the natural place to look) and concludes "Drummond backstops even
doc-only commits," they may incorrectly reason that expanding the doc allowlist
is safe because Drummond will catch leaks. It will not — Drummond is not reached
for doc-only paths. The T-HDOD-03 and §6 statements are authoritative but the
hook comment is the first thing an executor sees.

**This is not BLOCKING** because the hook BEHAVIOR is correct — the regex
correctly exits 0 before Drummond for doc-only paths — and T-HDOD-03 + §6 are
correctly stated. This is a comment accuracy issue that should be corrected
before ship to prevent future confusion.

**Required fix (one line change in PLAN §5 Task 1 code block):**

Replace:
```
# to the existing gate (Drummond grep gate still fires regardless).
```
With:
```
# to the existing gate (Drummond grep gate + qa-timestamp both fire;
# doc-only-skip exits before Drummond — see §6 LOW-severity rationale #5).
```

This replaces the ambiguous "still fires regardless" with a factually precise
statement that distinguishes the two paths.

---

## Threat model coverage attestation (iter-2)

| Threat | Iter-2 verdict |
|---|---|
| T-HDOD-01 (Tampering/regex-gap) | CONFIRMED mitigated. Q3=A posture + all 10 scenarios PASS. |
| T-HDOD-02 (Info disclosure/hook visibility) | N/A — accept rationale unchanged. |
| T-HDOD-03 (Elevation/.sh skip path) | CONFIRMED mitigated per Option B. Restricted regex mechanically enforces `.sh`-enforces. STRIDE entry correctly states ordering. |
| T-HDOD-04 (DoS/stealth bypass) | CONFIRMED mitigated. Short allowlist + scenarios ix + x verify `.sh`/`.py` fall through. |
| T-HDOD-05 (Spoofing) | N/A — accept rationale unchanged. |
| T-HDOD-06 (Repudiation) | Accept. Q4=B defer confirmed. |
| T-HDOD-07 (Newline filenames — new from iter-1 LOW-1) | Accept — pre-existing, tracked. |
| T-HDOD-08 (foo.sh.md compound extension — new from iter-1 INFO-1) | Accept — theoretical; tracked. |

LOW threat_model_severity designation confirmed. No application-runtime trust
boundary crossed. No tenant data. No RLS surface. The fail-closed posture for
code commits and executable discipline infrastructure is mechanically verified.

---

## Required actions before plan-execute

### HIGH-1-NEW (one-line fix in PLAN §5 Task 1 header comment code block — no Jake re-authorization required)

Update the hook header comment code block in PLAN §5 Task 1, line 324:

Replace:
```
# to the existing gate (Drummond grep gate still fires regardless).
```
With:
```
# to the existing gate (Drummond grep gate + qa-timestamp both fire;
# doc-only-skip exits before Drummond — see §6 LOW-severity rationale #5).
```

The executor MUST also write this corrected text (not the PLAN's current text)
into the actual `.claude/hooks/nightwork-pre-commit.sh` header comment during
Task 1. The PLAN code block is the executor's verbatim guide; if the PLAN
code block is wrong, the hook comment ships wrong.

This is a PLAN correction, not a design change. It does not require Jake
re-authorization. The security reviewer authorizes this as a documentation
fix within the scope of the BLOCKING-2 amendment cycle.

---

## Summary

**Verdict: NEEDS-WORK** — one HIGH finding (ambiguous Drummond ordering statement
in proposed hook header comment) requires a one-line fix before execute. Both
original BLOCKINGs are substantially resolved; the HIGH finding is a residual
from BLOCKING-2 that was not fully propagated into the code block.

The Option B regex restriction is mechanically correct and all critical security
properties are verified. Once the HIGH-1-NEW comment fix is applied (PLAN §5
Task 1 code block line 324), this plan is clear for execute.

---

END PLAN-REVIEW-ITER2-SECURITY.md
Authored: 2026-05-20 by security-reviewer (load-bearing, per nwrp191 §13 / iter-2 per nwrp192)
