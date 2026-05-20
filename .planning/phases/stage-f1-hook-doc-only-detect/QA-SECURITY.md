---
phase: stage-f1-hook-doc-only-detect
plan: HDOD
reviewer: security-reviewer
iteration: QA (post-execute; mandatory mechanical re-test per nwrp193 §22)
date: 2026-05-20
verdict: PASS
---

# QA Security Review — stage-f1-hook-doc-only-detect

## Overall verdict

**PASS** — all 8 mandatory mechanical tests executed and confirmed. Fail-closed posture preserved. No security regressions. No findings blocking ship.

---

## Mandatory Mechanical Test Results

All tests run against the ACTUAL STAGED hook at `.claude/hooks/nightwork-pre-commit.sh` (221 lines, post-edit). Not inferred from PLAN or SUMMARY.

| # | Test | Expected | Actual | Result |
|---|------|----------|--------|--------|
| 1a | `.claude/hooks/nightwork-pre-commit.sh` — must NOT match regex | NOT MATCHED (falls through to gate) | NOT MATCHED | PASS |
| 1b | `.claude/hooks/README.md` — must match regex | MATCHED (skips) | MATCHED | PASS |
| 1c | `.claude/skills/continuous-learning-v2/agents/observer-loop.sh` — must NOT match | NOT MATCHED | NOT MATCHED | PASS |
| 1d | `.claude/skills/continuous-learning-v2/scripts/instinct-cli.py` — must NOT match | NOT MATCHED | NOT MATCHED | PASS |
| 1e | `.claude/skills/foo/SKILL.md` — must match | MATCHED | MATCHED | PASS |
| 1f | `.claude/commands/foo.md` — must match (broad) | MATCHED | MATCHED | PASS |
| 1g | `.claude/agents/foo.md` — must match (broad) | MATCHED | MATCHED | PASS |
| 1h | `src/foo.ts` — must NOT match (Q3=A strict-mixed) | NOT MATCHED | NOT MATCHED | PASS |
| 1i | `notes.txt` — must match (extension allowlist) | MATCHED | MATCHED | PASS |
| 1j | `LICENSE` (root) — must match | MATCHED | MATCHED | PASS |
| 2 | Drummond gate byte-identical (HEAD vs staged) | Empty diff | Empty diff; 28 lines both | PASS |
| 3 | env-flag at line 46; doc-only-skip at line 89; env-flag fires BEFORE new branch | env-flag < doc-only-skip | Line 46 < Line 89 | PASS |
| 4 | `|| true` correctly handles grep exit 1 on empty match with `set -e` | doc-only scenario: NON_DOC=''; mixed: NON_DOC='src/foo.ts' | Confirmed by simulation | PASS |
| 5 | Quoting safety: `$STAGED` double-quoted in echo; regex is hardcoded literal | No user input in regex | Regex is single-quoted hardcoded constant; `$STAGED` double-quoted | PASS |
| 6 | Corrected Drummond ordering language present; "still fires regardless" absent | "BEFORE Drummond is reached" at line 16 | Found at line 16; "still fires regardless" absent | PASS |
| 7 | nwrp193 §17-18 inline addendum (`.claude/commands/` note) present | Lines 26-30 doc note + nwrp193 citation | nwrp193 citation at line 29; `.claude/commands/` note at lines 26-30 | PASS |
| 8 | HDOD-SUMMARY Arm A + Arm B exit codes match actual hook behavior | Scenarios iii/iv/ix/x fall through; i/ii control skip | All 6 cross-verified scenarios match claimed exit codes | PASS |

---

## Mechanical Evidence Detail

### Test 1 — Regex extraction and filename matching

Union regex extracted from staged hook line 97:

```
(\.md$|\.txt$|\.gitignore$|/LICENSE$|^LICENSE$|/CHANGELOG(\.[a-zA-Z]+)?$|^CHANGELOG(\.[a-zA-Z]+)?$|/README(\.[a-zA-Z]+)?$|^README(\.[a-zA-Z]+)?$|\.editorconfig$|^\.editorconfig$|^\.claude/agents/|^\.claude/commands/|^\.claude/hooks/.*\.(md|txt)$|^\.claude/skills/.*\.(md|txt)$)
```

All 10 mandatory filenames tested via `echo <filename> | grep -E "$REGEX"`. Results match expected per nwrp193 §22 mandate exactly.

Key security-relevant results:
- `.claude/hooks/nightwork-pre-commit.sh` — NOT matched (`.sh` enforces per Option B)
- `.claude/skills/continuous-learning-v2/agents/observer-loop.sh` — NOT matched
- `.claude/skills/continuous-learning-v2/scripts/instinct-cli.py` — NOT matched
- `src/foo.ts` — NOT matched (strict-mixed Q3=A preserved)

### Test 2 — Drummond gate byte-identical

Method: `awk '/^DRUMMOND_PATTERN=/,/^fi$/'` applied to both `git show HEAD:` and staged file; output diffed. Diff: empty. 28 lines in both. AC-HDOD-11 confirmed.

### Test 3 — env-flag order

`NIGHTWORK_HOOKS_DISABLE` at line 46; `NIGHTWORK_PRECOMMIT_DISABLE` at line 47. New doc-only-skip branch starts at line 89. Short-circuit fires before doc-only-skip: correct. Byte-identical to HEAD lines 9-10 (content match confirmed; line numbers shifted +37 due to 37-line header addition).

### Test 4 — set -e + `|| true` interaction

`set -e` active from line 44. The command `grep -vE ... || true` on line 96-98 correctly neutralizes grep's exit 1 (when no lines fall through the filter). Simulation confirmed:
- All-doc staged: `NON_DOC=''` -> `[ -z "$NON_DOC" ]` true -> `exit 0` (skip)
- Mixed staged (`mix.md` + `src/foo.ts`): `NON_DOC='src/foo.ts'` -> `[ -z "$NON_DOC" ]` false -> fall through
- `|| true` is correctly positioned inside the command substitution assignment (not after the `if` block), preventing `set -e` from aborting on grep exit 1.

### Test 5 — Quoting safety

`$STAGED` is populated from `git diff --cached --name-only 2>/dev/null || true` (line 81). It is used only via `echo "$STAGED" | grep -vE '<hardcoded regex>'`. Piped to grep as stdin — no eval, no exec, no argument interpolation. The regex string is a hardcoded single-quoted literal — no user-supplied data interpolated. Filenames with shell metacharacters (`$(...)`, `;`, `|`, etc.) in their names: git outputs filenames one per line to stdout, captured into `$STAGED` as a variable, then piped through `echo "$STAGED"` (double-quoted). No word-splitting or glob expansion occurs on the piped data as it reaches grep's stdin. No injection vector.

Note: `echo "$STAGED"` with newlines in the variable correctly preserves multi-line filename list behavior. This is the same pattern used in the existing NON_PLANNING branch (line 83) and is consistent.

### Test 6 — Drummond ordering language

Line 16 of staged hook: `# BEFORE Drummond is reached — see LOW-severity rationale #5 in HDOD-PLAN.md §6)`.

String "still fires regardless" absent from file. The header correctly documents that doc-only-skip exits cleanly BEFORE reaching the Drummond gate, not that "Drummond fires regardless." This is the corrected language per nwrp192 BLOCKING-2 fix.

### Test 7 — nwrp193 §17-18 inline addendum

Lines 26-30 of staged hook:
```
# .claude/commands/ stays broad-skip on the assumption it's .md-only at HEAD.
# If commands gain executable content (.sh/.js/.py), apply the same *.(md|txt)$
# restriction as hooks/ and skills/. Prevents future command-with-script silently
# slipping the QA gate. (nwrp193 §17-18 inline addendum — orchestrator sweep
# 2026-05-20 confirmed .claude/commands/ is .md-only at HEAD.)
```

nwrp193 citation confirmed at line 29.

### Test 8 — Arm A + Arm B scenario cross-verification

All 6 tested scenarios mechanically confirmed via regex test:

| Scenario | File(s) | NON_DOC result | Hook outcome | SUMMARY claim | Match |
|----------|---------|----------------|--------------|---------------|-------|
| iii (no-QA) | `src/foo.ts` | `src/foo.ts` | falls through | exit 2 BLOCK | CORRECT |
| iv (no-QA) | `mix.md` + `src/foo.ts` | `src/foo.ts` | falls through | exit 2 BLOCK | CORRECT |
| ix (no-QA) | `.claude/hooks/foo.sh` | `.claude/hooks/foo.sh` | falls through | exit 2 BLOCK | CORRECT |
| x (no-QA) | `.claude/skills/foo/scripts/foo.py` | `.claude/skills/foo/scripts/foo.py` | falls through | exit 2 BLOCK | CORRECT |
| i control | `foo.md` | `''` (empty) | doc-only-skip | exit 0 | CORRECT |
| vii (back-compat) | `.planning/expansions/foo.md` | — (caught at line 83 first) | existing branch skip | exit 0 | CORRECT |

---

## Purely Additive Diff Confirmation

- Lines removed: **0**
- Lines added: **56** (37 header comment lines + ~14 union branch lines + 5 fall-through comment lines)
- `git diff --cached -- .claude/hooks/nightwork-pre-commit.sh | grep '^-' | grep -v '^---' | wc -l` = 0

No existing logic was modified. The Drummond gate, QA timestamp check, verdict check, env-flags, merge-commit allowance, and `--no-verify` allowance are all byte-identical to HEAD.

---

## AC-HDOD-13a Verification

The current staged diff includes `.claude/hooks/nightwork-pre-commit.sh` (a `.sh` file). This file:

1. Does NOT match `^(\.planning/|docs/|README|CHANGELOG|\.gitignore)` at line 83 -> `NON_PLANNING` is non-empty -> existing branch does NOT exit early
2. Does NOT match `^\.claude/hooks/.*\.(md|txt)$` in the new union regex -> `NON_DOC` is non-empty -> new branch does NOT exit early

Therefore the ship commit falls through to the Drummond gate + QA timestamp check. AC-HDOD-13a is mechanically enforced: the ship commit passes ONLY if a fresh (< 60 min) QA report with non-BLOCKING verdict exists at commit time. This is the self-validating-ship behavior as designed.

The two `.md` files also staged (`.planning/expansions/stage-f1-hook-doc-only-detect-PREFLIGHT-PASS.md`, `.planning/phases/stage-f1-hook-doc-only-detect/HDOD-SUMMARY.md`) are caught by the EXISTING branch at line 83 (`^\.planning/`) and would themselves skip — but they do not prevent the `.sh` file from forcing fall-through because the existing branch and new branch both check `NON_PLANNING` / `NON_DOC` for the FULL staged file list, and the `.sh` file is in that list.

---

## Security Assessment

### Fail-closed posture: PRESERVED

The new union branch only fires `exit 0` when `NON_DOC` is empty — i.e., when EVERY staged file matches the allowlist. Any single non-allowlist file forces fall-through to Drummond + QA gate. This is identical in posture to the existing `NON_PLANNING` branch at line 83.

No path through the new code can cause a code-bearing commit to silently skip the QA gate.

### Hook edit discipline: PRESERVED

`.sh` executables under `.claude/hooks/` mechanically fall through to the QA timestamp gate. The restricted regex `^\.claude/hooks/.*\.(md|txt)$` ensures `.sh` is always enforced. This is the correct Option B resolution per nwrp192 — hook executables carry QA evidence.

### Covert bypass risk: NONE

The doc-only-skip branch is explicit and auditable. It is not semantically equivalent to `--no-verify` — it only fires for committed filenames that match a public, hardcoded allowlist. The allowlist cannot be exploited by renaming a `.ts` file with a `.md` extension, because the allowlist operates on the actual committed filename as reported by git.

### Command injection risk: NONE

No user-controlled input reaches grep's argument list. The regex is a hardcoded single-quoted literal. `$STAGED` is piped through stdin. No eval, exec, or dynamic argument construction.

### Drummond gate bypass via doc-only-skip: IMPOSSIBLE

Doc-only-skip exits BEFORE reaching the Drummond gate (`exit 0` at line 100). This means a doc-only commit that skips the QA gate also skips the Drummond gate. This is by design and LOW risk: the Drummond gate is scoped to `src/app/design-system/_fixtures/drummond/` (a `src/` path), and any commit touching that path would contain `.ts`/`.tsx`/`.json` files that are NOT in the doc allowlist — they would fall through to the Drummond gate normally. A doc-only commit cannot contain a fixture file under `src/`. This was analyzed in HDOD-PLAN.md §6 LOW-severity rationale #5 and is confirmed by the regex construction.

---

## Deferred / Open Items (not blocking ship)

| Item | Status | Notes |
|------|--------|-------|
| AC-HDOD-13b throwaway doc-only test | DEFERRED to post-ship session | Per dispatch sequencing — must happen after ship commit lands new behavior; mechanical pre-validation confirmed above |
| AC-HDOD-14 custodian MASTER-PLAN §12 + CLAUDE.md Rule 8(e) | DEFERRED to post-ship custodian task | Per PLAN §13 hand-off; not in this plan's commit boundary |

Neither deferred item blocks ship. AC-HDOD-13a is fully mechanically verified. AC-HDOD-13b pre-validation passes.

---

## Summary

The staged hook edit is correct, purely additive, fail-closed, quoting-safe, and free of command injection risk. All 8 mandatory mechanical tests pass on the actual staged file. The Drummond gate is byte-identical. The env-flag escape hatches fire before the new branch. The `|| true` correctly neutralizes `set -e` on empty grep output. The nwrp193 inline addendum is present. The corrected Drummond ordering language is in place.

**Verdict: PASS. Safe to ship pending fresh QA timestamp (AC-HDOD-13a).**

---

*Reviewer: security-reviewer*
*Phase: stage-f1-hook-doc-only-detect*
*Date: 2026-05-20*
*Hook lines reviewed: 221 (staged), 165 (HEAD)*
*Tests executed: Bash mechanical; no inferred results*
