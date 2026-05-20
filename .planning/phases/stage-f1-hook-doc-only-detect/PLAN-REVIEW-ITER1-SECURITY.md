---
reviewer: security-reviewer
role: load-bearing (per nwrp191 §13)
phase: stage-f1-hook-doc-only-detect
plan: HDOD
verdict: NEEDS-WORK
authored: 2026-05-19
blocking_findings: 2
high_findings: 1
medium_findings: 2
low_findings: 2
info_findings: 1
---

# Plan-Review Iter-1 — Security Reviewer
## Hook doc-only detection extension-allowlist (HDOD)

This is the load-bearing security review per nwrp191 §13. The hook file
(`.claude/hooks/nightwork-pre-commit.sh`, 165 lines) was read in full.
All 7 verification areas were executed with mechanical testing against
the proposed regex. Findings are severity-classified and falsifiable.

---

## Verdict: NEEDS-WORK

**Two BLOCKING findings. Plan-execute is gated until both are resolved.**

The core calibration logic is sound and the fail-closed posture for code
commits is preserved. The BLOCKING findings are (1) an internal
inconsistency in AC-HDOD-13a that will mislead the executor about whether
the ship commit goes through the QA timestamp gate, and (2) a
documentation error in T-HDOD-03 that contradicts the safety argument in
§6. Both require correction before execute. Neither requires redesigning
the regex or the fundamental approach.

---

## Area 1 — Fail-closed posture for code commits

**Assessment: PASS**

Mechanically verified the proposed regex against the full scenario set
from PLAN §7, plus additional edge cases:

```
.claude/hooks/nightwork-pre-commit.sh  -> SKIP (via ^\.claude/hooks/ path — deliberate)
src/foo.ts                             -> FALL-THROUGH (correct)
src/foo.tsx                            -> FALL-THROUGH (correct)
foo.md + src/foo.ts (mixed)            -> FALL-THROUGH (correct, Q3=A strict)
foo.md                                 -> SKIP (correct)
notes.txt                              -> SKIP (correct)
.claude/agents/foo.md                  -> SKIP (correct)
LICENSE (root)                         -> SKIP (correct)
vendor/LICENSE (nested)                -> SKIP (correct)
foo.md.sh                              -> FALL-THROUGH (correct, .sh suffix wins)
foo.sh.md                              -> SKIP (.md suffix — this is a known edge case; noted below)
notes.json                             -> FALL-THROUGH (correct)
foo.yaml                               -> FALL-THROUGH (correct)
 (space filename)                      -> FALL-THROUGH (correct)
```

**Git diff failure (empty STAGED):** When `git diff --cached --name-only`
fails or returns empty, `STAGED` is set to empty string via the `|| true`
fallback. The `if [ -n "$STAGED" ]` guard on both branches is then false,
and neither branch executes. Control falls through to the Drummond gate
and QA timestamp gate. This is correct fail-closed behavior — no change
from the existing hook structure.

**`set -e` interaction:** Line 7 sets `set -e`. The proposed branch uses
`|| true` after the `grep -vE` call, matching the pattern in the existing
line 46. Without `|| true`, `grep` returning exit 1 (all lines filtered
= doc-only commit) would terminate the hook under `set -e` with exit 1
(BLOCK). The `|| true` converts this to `NON_DOC=''`, which triggers the
skip correctly. The `|| true` is present in PLAN §4 code. Correct.

**Deleted files:** `git diff --cached --name-only` outputs the filename
of deleted files in the same format as added files. A deleted `src/foo.ts`
correctly falls through. A deleted `.claude/agents/foo.md` correctly
skips. No regression from deletion events.

**Renamed files:** With standard `--name-only`, git shows only the new
name for renames (or both names with `-M` flag). The hook uses
`--name-only` without `-M`, so renamed files appear by their new name.
A rename of `src/foo.ts` to `src/bar.ts` falls through correctly.

**Binary files and symlinks:** These appear by filename in
`--name-only` output, so classification is by extension only. A binary
file named `blob.md` or a symlink named `link.md` would skip the gate.
This is an inherent constraint of filename-based classification; it is
not a new vulnerability introduced by this plan and it was pre-existing
in the line 43-50 branch for `.planning/` files.

**INFO: `foo.sh.md` edge case.** A file with a compound extension
`foo.sh.md` matches the `.md$` regex and would skip the gate. This is
unlikely in practice but worth noting. It is not a blocking concern
because a developer cannot use this to slip application code through —
`.sh.md` files are not valid shell scripts by convention, and the
`.md` suffix is explicitly chosen as a doc-only marker.

---

## Area 2 — Drummond grep gate UNCHANGED

**Assessment: PASS with documentation correction required (BLOCKING-2)**

The structural approach (UNCHANGED-AND-AUGMENTED) places the new branch
after line 50 and before line 52 (the Drummond comment). The Drummond
gate content at lines 65-92 (`DRUMMOND_PATTERN`, `DRUMMOND_HITS`,
`REASON`, `node` JSON-emit shape) is untouched by the additive diff.

AC-HDOD-11 uses a content-anchored `awk` diff to handle the line-number
shift caused by inserting ~30 lines above the Drummond block. This is
the correct approach.

**Safety argument verified:** The Drummond gate is scoped to
`src/app/design-system/_fixtures/drummond/`. The doc-only allowlist
contains no path that overlaps with `src/`. Therefore, a commit that
qualifies as doc-only (all files in allowlist) CANNOT include any file
under the fixture path. The doc-only-skip cannot enable a Drummond leak.
This safety argument in PLAN §6 is sound.

**BLOCKING-2: T-HDOD-03 contradicts PLAN §6 on Drummond gate firing.**

T-HDOD-03 in the threat register (PLAN §6) states:
> "Drummond grep gate (lines 65-92) STILL fires"

PLAN §6 LOW-severity rationale point 4 states:
> "the doc-only-skip branch exits 0 before reaching the Drummond gate"

These are factually contradictory. The hook flow is:
`existing-branch -> new-branch (exit 0 here) -> Drummond -> QA-gate`

If the new branch exits 0, the Drummond gate does NOT fire. T-HDOD-03's
"STILL fires" claim is incorrect.

The safety claim is still valid (no Drummond leak possible via doc-only
path because fixture path never overlaps with doc allowlist). But the
T-HDOD-03 mitigation description is factually wrong. This must be
corrected before execute because:

1. It misleads future reviewers into thinking Drummond is a backstop for
   doc-only commits when it is not.
2. If the fixture path constraint ever changes, a reviewer relying on
   T-HDOD-03 might falsely believe Drummond remains a catchall.

**Required fix:** Update T-HDOD-03 mitigation to read:
> "Drummond grep gate does NOT fire for doc-only commits (hook exits 0
> before reaching it). This is safe because the doc-only allowlist
> contains no path that overlaps with
> `src/app/design-system/_fixtures/drummond/`. If the fixture path
> structure ever changes, re-evaluate this claim."

---

## Area 3 — NIGHTWORK_HOOKS_DISABLE bypass still works

**Assessment: PASS**

Lines 9-10 (`NIGHTWORK_HOOKS_DISABLE` / `NIGHTWORK_PRECOMMIT_DISABLE`)
are checked immediately after the shebang header and before the
`cd "$CLAUDE_PROJECT_DIR"` block. The new branch is positioned AFTER
line 50 (the existing path-allowlist branch). Therefore:

- `NIGHTWORK_HOOKS_DISABLE=1` → exits at line 9, before everything
- `NIGHTWORK_PRECOMMIT_DISABLE=1` → exits at line 10, before everything
- `--no-verify` in commit command → exits at lines 34-36, before everything
- All three remain unchanged and still short-circuit the entire hook

The new branch inherits this protection; it cannot be reached if any
env-flag or `--no-verify` fires first.

---

## Area 4 — No stealth bypass pattern introduced

**Assessment: PASS with AC inconsistency requiring correction (BLOCKING-1)**

The doc-only-skip path is explicit and honest. The regex is hardcoded
(not derived from user input), the allowlist is enumerated in the header
comment, and the skip fires on a clear condition (all staged files match
the allowlist). This is not semantically equivalent to `--no-verify`
because:

- `--no-verify` skips ALL hook checks including the project-directory
  check, `--no-verify` detection, merge-commit detection, Drummond gate,
  and QA timestamp gate.
- The doc-only-skip path exits ONLY the QA timestamp and verdict checks.
  It is reached after the project-directory check, `--no-verify`
  detection, and merge-commit detection have all run.

The header comment per Q5=C documents the contract clearly, including the
origin nwrp citations and the sign-off-cycle discipline for hook
executables.

**BLOCKING-1: AC-HDOD-13a is internally inconsistent with PLAN §4.**

AC-HDOD-13a states:
> "The chore plan's own `/nightwork-qa` cycle writes a fresh qa-runs
> report; when the ship commit lands, the QA timestamp gate passes
> legitimately (NOT via doc-only-skip — `.sh` is explicit-NO per Q2
> Amendment 1; doc-only-skip is NOT exercised for the ship)."

PLAN §4 states:
> "A .sh file under `.claude/hooks/` would ALSO match this path regex"
> "This is a deliberate trade-off documented per Q2 Amendment 1"

Mechanical verification confirms: `^\.claude/hooks/` matches
`.claude/hooks/nightwork-pre-commit.sh`. The ship commit contains this
file plus two `.md` files. All three match the new branch's allowlist:
- `.sh` file: matched by `^\.claude/hooks/` path regex
- `.md` files: matched by `\.md$` extension regex

Therefore the ship commit will exit via the doc-only-skip path, NOT via
the QA timestamp gate. AC-HDOD-13a's claim that "`.sh` is explicit-NO"
is contradicted by the regex design that §4 explicitly accepts.

**Security concern:** This inconsistency means the hook discipline-gate
change itself will ship WITHOUT going through the QA timestamp gate. The
ship commit bypasses the very gate it is modifying. Whether this is
acceptable depends on whether Jake's acceptance of the Q2 Amendment 1
trade-off also extends to the ship commit. AC-HDOD-13a appears to assume
it does not (hence requiring fresh QA timestamp), but the regex makes it
inevitable that it will.

**Required resolution (two options — surface to Jake):**

Option A (recommended): Accept that the ship commit goes through the
doc-only-skip path. Update AC-HDOD-13a to acknowledge this:
> "The ship commit will exit via the doc-only-skip path (`.sh` under
> `.claude/hooks/` matches the path regex per Q2 Amendment 1 trade-off).
> Fresh QA timestamp is still required and written in Task 4 step 2, but
> the gate is exercised via AC-HDOD-13b throwaway test, not the ship
> commit. The ship's integrity is attested by the security reviewer
> sign-off at plan-review iter-1."

Option B: Restrict `^\.claude/hooks/` path match to non-`.sh` files by
adding a negative lookahead or post-filter:
```bash
^\.claude/hooks/(?!.*\.sh$)  # if using PCRE
# or equivalently, add a second grep to remove .sh files from the skip:
NON_DOC=$(echo "$STAGED" | grep -vE '(allowlist)' | grep -E '\.sh$' || true)
# if NON_DOC (i.e. any .sh files remain after allowlist filter), fall through
```
This is more complex but makes `.sh` files truly fall through. The ship
commit would then go through the QA timestamp gate as AC-HDOD-13a states.

Option B adds ~5 lines and makes the regex more complex. The PLAN's
current posture (Option A with corrected AC wording) is defensible and
is the simpler path. Surface to Jake.

---

## Area 5 — Q2 Amendment 1 hook-doc-vs-hook-executable distinction

**Assessment: CONDITIONAL PASS (contingent on BLOCKING-1 resolution)**

The distinction as implemented: the `^\.claude/hooks/` path regex matches
BOTH `.md` documentation files AND `.sh` executables under that path.
The PLAN acknowledges this in §4 and frames it as the "Q2 Amendment 1
deliberate trade-off" — hook executable changes are governed by
sign-off-cycle discipline (Rule 8 + nwrp160/161 three-cycle precedent),
not the QA timestamp gate.

The distinction is therefore NOT enforced at the regex level; it is
enforced at the process level (Jake reviews hook changes via the sign-off
cycle). This is an intentional design choice, documented in the header
comment per Q5=C.

The conditional: once BLOCKING-1 is resolved (AC-HDOD-13a corrected),
the trade-off is fully documented and the executor will understand that
hook `.sh` edits skip the QA timestamp gate. This is the correct and
honest representation of how the regex behaves.

**MEDIUM-1: No enforcement mechanism distinguishes `.sh` from `.md` under
`.claude/hooks/`.** If a future executor is unaware of the sign-off-cycle
discipline and commits a hook `.sh` change without Jake review, the
doc-only-skip path silently permits it. The header comment documents the
expectation, but a grep or automated check does not enforce it. This is
acceptable at LOW severity (per EXPANDED-SCOPE §8 risk register) because
the sign-off-cycle discipline is documented in CLAUDE.md and the header
comment. Noting it here for completeness.

---

## Area 6 — OWASP and general security smells

**Assessment: PASS (no actionable injection or command-execution risks)**

**Regex injection:** The `grep -vE` regex is hardcoded; the STAGED
variable is only interpolated on the left side of the pipe as the input
data, not as part of the regex pattern. Filenames containing regex
metacharacters (parentheses, brackets, plus signs, etc.) do not affect
the pattern. Confirmed with test cases:

```
src/foo[bar].ts  -> FALL-THROUGH (correct, bracket treated as literal in input)
src/foo).ts      -> FALL-THROUGH (correct)
```

**Command injection:** No user-controlled string is interpolated into a
`eval`, backtick, or unquoted command substitution. `STAGED` is used
only in `echo "$STAGED"` (double-quoted, which prevents word-splitting
and glob expansion). The `CMD` variable from the JSON `tool_input` is
used in `[[ ... =~ ]]` pattern matches, which do not execute code.

**Race condition:** The `STAGED` variable is set once at line 44 and
reused across both branches. If the git index changes between the capture
and the commit, `STAGED` is stale. This is a pre-existing condition from
the line 43-50 branch and is not a new surface. Acceptable.

**Symlink files:** A symlink whose name ends in `.md` would appear as
`.md` in `--name-only` output and would skip the gate. A developer could
stage a symlink named `bypass.md` that points to an application code
file. The symlink target is not followed by `git diff --cached
--name-only`. This is a theoretical concern but requires deliberate
malicious action in a developer-side tool; it is out-of-scope per
T-HDOD-05's trust boundary. Not flagged as blocking.

**LOW-1: Newlines in filenames.** Git supports filenames containing
newlines (rare, but possible). `echo "$STAGED"` with a filename
containing an embedded newline would split the filename across two lines
in the pipe, potentially causing a partial match against the regex (each
half classified separately). In practice, filenames with embedded
newlines in a TypeScript/bash codebase are vanishingly unlikely. The
existing branch at line 46 has the same exposure. Not blocking.

---

## Area 7 — AC-HDOD-13b throwaway test commit security

**Assessment: PASS with documentation suggestion (LOW-2)**

The throwaway commit procedure is:
1. Stage a `.md` file outside the existing path-allowlist
2. Commit via Claude Bash tool (hook fires and exits 0)
3. Record exit code in SUMMARY.md
4. `git reset --soft HEAD~1` (local-only rollback)
5. `rm` the throwaway file
6. Do NOT push

**`git reset --soft HEAD~1`** is safe: it moves `HEAD` back one commit,
preserving the index and working tree. The throwaway commit is removed
from history. There is no risk of data loss to other commits.

**Accidental push risk:** The PLAN says "Do NOT push." If the executor
runs `git push` after the throwaway commit but before `git reset --soft
HEAD~1`, the throwaway commit reaches `origin/main`. This would create a
spurious commit in history. It is not a security concern (the throwaway
is a benign `.md` file with no sensitive content), but it is a history
hygiene concern.

**LOW-2: The procedure should explicitly require cleanup BEFORE any
subsequent push operation.** The PLAN currently places cleanup in the
"Cleanup" sub-step after recording the transcript. Adding a step that
reads "MUST complete `git reset --soft HEAD~1` + `rm` before any `git
push` operation" makes the ordering unambiguous. Suggested wording for
SUMMARY.md template:

> "MANDATORY: run `git reset --soft HEAD~1` and `rm throwaway-file`
> BEFORE any `git push` or staging of the ship commit. Do not proceed
> to Task 4 until `git log --oneline -1` no longer shows the throwaway
> commit."

---

## MEDIUM-2: T-HDOD-03 Drummond "STILL fires" vs §6 early-exit contradiction

Covered in Area 2 above but classified separately for the findings table.

The threat register and the LOW-severity rationale in §6 give contradictory
accounts of whether the Drummond gate fires for doc-only commits. Reviewers
at /nightwork-qa and future plan-review sessions will see both statements
and cannot determine which is authoritative.

The §6 narrative is correct (early exit, Drummond does not fire). The
T-HDOD-03 mitigation row must be corrected. This is rolled into
BLOCKING-2 above.

---

## Summary findings table

| ID | Area | Severity | Description |
|---|---|---|---|
| BLOCKING-1 | 4 + 5 | BLOCKING | AC-HDOD-13a claims `.sh` is "explicit-NO" for doc-only-skip, but the `^\.claude/hooks/` path regex matches `.sh` files by design (Q2 Amendment 1 deliberate trade-off per §4). Ship commit WILL exit via doc-only-skip, not QA timestamp gate. AC-HDOD-13a must be corrected or the regex must be restricted. Surface to Jake (Option A vs B above). |
| BLOCKING-2 | 2 | BLOCKING | T-HDOD-03 states "Drummond grep gate STILL fires" for doc-only commits; PLAN §6 correctly states the doc-only-skip exits before Drummond. Contradictory claims must be corrected to avoid misleading future reviewers. Safety argument remains valid. |
| HIGH-1 | 5 | HIGH | Corollary of BLOCKING-1: if ship commit goes through doc-only-skip path, the hook discipline-gate change ships without QA timestamp attestation. Whether this is acceptable per Q2 Amendment 1 sign-off-cycle discipline requires Jake acknowledgment. If Jake accepts Option A (corrected AC wording), downgrade to INFO. If Jake requires Option B (regex restriction), executor must implement before ship. |
| MEDIUM-1 | 5 | MEDIUM | No enforcement mechanism distinguishes `.sh` from `.md` under `.claude/hooks/`. Future hook executors may commit `.sh` changes without Jake sign-off-cycle review and the doc-only-skip path will silently permit it. Header comment documents the expectation but provides no mechanical enforcement. Not blocking; note for MASTER-PLAN §12 follow-up TD if pattern surfaces. |
| MEDIUM-2 | 2 | MEDIUM | Same as BLOCKING-2 — included for findings table visibility. Resolved when BLOCKING-2 is fixed. |
| LOW-1 | 6 | LOW | Filenames with embedded newlines cause incorrect line splitting in `echo "$STAGED"` pipe. Pre-existing condition from line 43-50 branch; not a new surface. Extremely unlikely in practice. |
| LOW-2 | 7 | LOW | Throwaway test commit procedure (AC-HDOD-13b Task 3) should explicitly require `git reset --soft HEAD~1` completion BEFORE any `git push` or ship-commit staging. Current ordering is "Cleanup" after transcript recording — add explicit dependency statement. |
| INFO-1 | 1 | INFO | `foo.sh.md` edge case: a file with compound extension `.sh.md` matches `\.md$` and would skip the gate. Not a real attack surface in this codebase. No action required. |

---

## Threat model coverage attestation

The PLAN's STRIDE register (T-HDOD-01 through T-HDOD-06) covers the
material attack surface for a developer-side pre-commit hook. The
classifications are appropriate.

**Attestation:**
- T-HDOD-01 (Tampering/regex-gap): mitigated by Q3=A strict posture + scenario tests. CONFIRMED sufficient.
- T-HDOD-02 (Information disclosure/hook-visibility): accept rationale sound. CONFIRMED.
- T-HDOD-03 (Elevation/`.sh` doc-only path): accept-with-documentation. CONFIRMED as deliberate but AC-HDOD-13a wording must be corrected (BLOCKING-1).
- T-HDOD-04 (DoS/stealth-bypass via regex gap): mitigated by short allowlist + scenario walk. CONFIRMED.
- T-HDOD-05 (Spoofing/synthetic-tool-input): N/A rationale sound. CONFIRMED.
- T-HDOD-06 (Repudiation/no-audit-trail): accept-with-defer rationale sound. CONFIRMED.

Missing from STRIDE register: the Drummond gate early-exit concern (BLOCKING-2). Should be added as T-HDOD-07 or corrected in T-HDOD-03 mitigation.

LOW threat_model_severity designation is appropriate for this change class. The fail-closed posture for code commits is verified. No application-runtime trust boundary, no tenant data, no RLS surface.

---

## Required actions before plan-execute

### BLOCKING-1 (AC-HDOD-13a inconsistency — surface to Jake)

The executor must surface to Jake with two options:

**Option A (recommended):** Accept that ship commit exits via
doc-only-skip. Correct AC-HDOD-13a to remove the "`.sh` is explicit-NO"
language and clarify that: (a) fresh QA timestamp is still written in
Task 4 step 2 per /nightwork-qa, (b) the QA gate is validated via the
AC-HDOD-13b throwaway test, and (c) the hook discipline-gate change
itself ships under Q2 Amendment 1 sign-off-cycle discipline (this
plan-review iter-1 security review IS the sign-off-cycle attestation).

**Option B:** Add a post-filter to exclude `.sh` files from the
`^\.claude/hooks/` path match, making `.sh` files truly fall through
to the QA timestamp gate. Ship commit then requires a fresh QA timestamp.
Adds ~3-5 lines to the hook and makes the executor's sign-off-cycle
discipline mechanically enforced rather than convention-only.

Jake's decision here also resolves HIGH-1.

### BLOCKING-2 (T-HDOD-03 correction)

Correct T-HDOD-03 to accurately state that the Drummond gate does NOT
fire for doc-only commits (hook exits 0 before reaching it), and explain
why this is safe (no fixture-path overlap with doc allowlist). No
security posture change required — the safety argument is already
correct in §6. This is a documentation fix only.

### LOW-2 recommendation (non-blocking)

Add explicit ordering constraint to AC-HDOD-13b / Task 3: cleanup
(`git reset --soft HEAD~1` + `rm`) must complete before any push
operation or ship-commit staging.

---

END PLAN-REVIEW-ITER1-SECURITY.md
Authored: 2026-05-19 by security-reviewer (load-bearing, per nwrp191 §13)
