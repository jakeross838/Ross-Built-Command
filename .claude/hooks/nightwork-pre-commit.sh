#!/bin/bash
# Nightwork PreToolUse hook for Bash (git commit detection)
# Block git commit unless a fresh /nightwork-qa report exists with non-BLOCKING verdict.
# --no-verify bypasses (per Claude Code Bash hook conventions, surfaces user intent).
# Set NIGHTWORK_PRECOMMIT_DISABLE=1 to disable entirely.
#
# ---
# Execute-phase-skip contract (per TD-NW-HOOK-EXECUTE-PHASE-DETECT, nwrp217 + nwrp219 §22):
#
# Commits made DURING an active /nx execute (pre-scheduled-QA) skip the
# qa-freshness check + verdict-BLOCKING check below, because /nx Step 3
# runs /nightwork-qa AFTER execute completes. The qa-freshness gate is
# calibrated for post-QA ship commits ("don't ship un-QA'd code"); B-N
# execute commits are pre-QA by design.
#
# Trigger marker (commit body must contain ONE of):
#   - `Execute-Phase: <plan-id>` (canonical footer; preferred going forward)
#   - `execute-time commit pre-scheduled-QA` (legacy nwrp217 citation literal;
#     preserved for backward-compat with the 4 B-3 execute commits already on
#     origin/main that used --no-verify + this citation language)
#
# Fail-closed contract preserved:
# - Drummond grep gate STILL fires on every commit (pre-QA-skip)
# - Execute-phase marker must be EXPLICIT (no implicit bypass)
# - Ship commits (no marker) STILL enforce qa-freshness + verdict-BLOCKING
# - --no-verify STILL works as the manual escape hatch (Rule 8(a) per-incident)
#
# Origin: TD-NW-HOOK-EXECUTE-PHASE-DETECT (MASTER-PLAN §11; filed 2026-05-22
# per nwrp217 §14-18; closed per this hook edit + nwrp219 §22).
# 4-instance lineage on B-3 alone (49bb664, e22a488, ca40e82, 8ed0e38 amend).
# Discipline contract: Workflow posture Rule 8 fail-closed (CLAUDE.md).
# Precedent: TD-NW-HOOK-DOC-ONLY-DETECT (closed `c20e5d9` per nwrp192 Option B);
# same fail-closed-preserved discipline applied to a different calibration gap.
# ---
#
# ---
# Doc-only-skip contract (per stage-f1-hook-doc-only-detect, nwrp190 Q1=C / Q2=B / Q3=A;
# nwrp192 Option B Amendment 1 correction — `.sh`-enforces wins):
#
# If every file in `git diff --cached --name-only` matches either an allowed
# doc extension OR an allowed doc-bearing path, skip the qa-runs timestamp
# check + verdict check below. ANY file matching neither list → fall through
# to the existing gate (Drummond grep gate + qa-timestamp both fire
# normally for non-doc-only diffs; doc-only-skip exits cleanly
# BEFORE Drummond is reached — see LOW-severity rationale #5 in HDOD-PLAN.md §6).
#
# Allowed extensions: .md, .txt, .gitignore, LICENSE, CHANGELOG, README,
# .editorconfig (with or without dotted suffix variants).
# Allowed paths (BROAD — match all files under prefix):
#   .planning/, docs/, .claude/agents/, .claude/commands/
# Allowed paths (RESTRICTED to .md/.txt only — per nwrp192 Option B):
#   .claude/hooks/  — contains .sh executables; `.sh` falls through to gate
#   .claude/skills/ — contains .sh/.py/.js/.json/.css/.html/.jsx; only docs skip
#
# .claude/commands/ stays broad-skip on the assumption it's .md-only at HEAD.
# If commands gain executable content (.sh/.js/.py), apply the same *.(md|txt)$
# restriction as hooks/ and skills/. Prevents future command-with-script silently
# slipping the QA gate. (nwrp193 §17-18 inline addendum — orchestrator sweep
# 2026-05-20 confirmed .claude/commands/ is .md-only at HEAD.)
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

set -e

[[ "$NIGHTWORK_HOOKS_DISABLE" == "1" ]] && exit 0
[[ "$NIGHTWORK_PRECOMMIT_DISABLE" == "1" ]] && exit 0

cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0
case "$(pwd)" in
  *nightwork-platform*) ;;
  *) exit 0 ;;
esac

INPUT=$(cat)
CMD=$(node -e "
let d='';
process.stdin.on('data', c => d += c);
process.stdin.on('end', () => {
  try { process.stdout.write(JSON.parse(d).tool_input?.command || ''); }
  catch { process.stdout.write(''); }
});
" <<< "$INPUT" 2>/dev/null)

# Only check git commit
if [[ ! "$CMD" =~ ^(git[[:space:]]+commit) ]]; then
  exit 0
fi

# Allow --no-verify (user explicitly bypassed)
if [[ "$CMD" =~ --no-verify ]]; then
  exit 0
fi

# Allow merge commits (no QA expected on merges)
if [[ "$CMD" =~ \ -m\ .*Merge ]] || [[ "$CMD" =~ \ -m\ .*merge ]]; then
  exit 0
fi

# Execute-phase-skip detection (per TD-NW-HOOK-EXECUTE-PHASE-DETECT, nwrp217 + nwrp219 §22)
# See header contract block above. Sets SKIP_QA_GATES=1 to skip qa-freshness +
# verdict-BLOCKING checks below WHILE preserving Drummond grep gate fail-closed.
SKIP_QA_GATES=0
if echo "$CMD" | grep -qE 'Execute-Phase:[[:space:]]|execute-time commit pre-scheduled-QA'; then
  SKIP_QA_GATES=1
fi

# Allow .planning/-only and docs/-only commits (no source change → no QA needed)
STAGED=$(git diff --cached --name-only 2>/dev/null || true)
if [ -n "$STAGED" ]; then
  NON_PLANNING=$(echo "$STAGED" | grep -vE "^(\.planning/|docs/|README|CHANGELOG|\.gitignore)" || true)
  if [ -z "$NON_PLANNING" ]; then
    exit 0
  fi
fi

# Doc-only-skip union branch — extension allowlist + path allowlist
# (per HDOD-PLAN §4 / nwrp190 Q1=C; nwrp192 Option B regex restriction).
# See header comment block above for the full doc-only-skip contract.
# Union with the path-allowlist above per nwrp190 Q1=C.
# .claude/hooks/ and .claude/skills/ are RESTRICTED to .(md|txt) per
# nwrp192 Option B resolution — `.sh`-enforces wins.
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

# Drummond grep gate (per nwrp31 #2 — pre-commit defense for sanitized fixtures).
# Mirrors .github/workflows/drummond-grep-check.yml. Blocks commits whose
# staged content under src/app/design-system/_fixtures/drummond/ contains
# high-risk Drummond identifiers — owner surname + site address + 17
# vendors + Tier 2 customers + canonical PM names.
#
# Scoped to fixture path only — docs commits (.planning/, *.md) accept
# real-name presence per CONTEXT D-21. CI workflow runs the same grep
# post-merge as defense-in-depth; this hook catches drift pre-commit.
#
# Note: this hook only fires on Claude-initiated `git commit` via the
# Bash tool. Manual `git commit` from terminal is NOT covered. For full
# coverage add .git/hooks/pre-commit or .husky/pre-commit (future).
DRUMMOND_PATTERN='Drummond|501 74th|Holmes Beach|SmartShield Homes|Florida Sunshine Carpentry|Doug Naeher Drywall|Paradise Foam|Banko Overhead Doors|WG Drywall|Loftin Plumbing|Island Lumber|CoatRite|Ecosouth|MJ Florida|Rangel Tile|TNT Painting|Avery Roofing|ML Concrete LLC|Dewberry|Pou|Krauss|Duncan|Molinari|Markgraf|Harllee|Fish|Clark|Lee Worthy|Nelson Belanger|Bob Mozine|Jason Szykulski|Martin Mannix'

DRUMMOND_HITS=$(git grep --cached -nE "$DRUMMOND_PATTERN" -- 'src/app/design-system/_fixtures/drummond/' 2>/dev/null || true)

if [ -n "$DRUMMOND_HITS" ]; then
  REASON="[nightwork-pre-commit] Real Drummond identifier detected in staged sanitized fixtures.

Hits:
$DRUMMOND_HITS

Sanitized fixtures (src/app/design-system/_fixtures/drummond/) must use
SUBSTITUTION-MAP.md substitutions (Caldwell, 712 Pine Ave, caldwell-* IDs).

Options:
  • Re-run scripts/sanitize-drummond.ts to regenerate from gitignored sources
  • Hand-fix the offending file (then re-stage)
  • Pass --no-verify ONLY if you have verified this is a false positive

Mirrors .github/workflows/drummond-grep-check.yml — the CI gate would
also block this commit if it landed on main."
  NW_REASON="$REASON" node -e "
  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: process.env.NW_REASON || ''
  }));
  " 2>/dev/null
  exit 2
fi

# Skip qa-freshness + verdict-BLOCKING gates for execute-phase commits.
# Per TD-NW-HOOK-EXECUTE-PHASE-DETECT (closed via this hook edit per nwrp219 §22),
# /nx execute commits land BEFORE /nx Step 3 /nightwork-qa runs; the freshness
# + verdict gates are calibrated for post-QA ship commits, not pre-QA execute.
# Drummond grep gate above (line ~108) STILL fired for execute commits.
if [ "$SKIP_QA_GATES" = "1" ]; then
  exit 0
fi

# Find latest QA report
LATEST_QA=$(ls -t .planning/qa-runs/*-qa-report.md 2>/dev/null | head -1 || true)

if [ -z "$LATEST_QA" ]; then
  REASON="[nightwork-pre-commit] No /nightwork-qa report found in .planning/qa-runs/.

The repo is configured to require QA review before commits to source files.

Options:
  • Run /nightwork-qa first, then re-commit
  • Pass --no-verify to bypass (use sparingly)
  • Add 'Execute-Phase: <plan-id>' footer if this is a pre-scheduled-QA execute commit
  • Set NIGHTWORK_PRECOMMIT_DISABLE=1 to disable this hook"
  NW_REASON="$REASON" node -e "
  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: process.env.NW_REASON || ''
  }));
  " 2>/dev/null
  exit 2
fi

# Check freshness — within 60 minutes
NOW=$(date +%s)
QA_TIME=$(stat -c %Y "$LATEST_QA" 2>/dev/null || stat -f %m "$LATEST_QA" 2>/dev/null || echo "$NOW")
AGE=$((NOW - QA_TIME))

if [ "$AGE" -gt 3600 ]; then
  AGE_MIN=$((AGE / 60))
  REASON="[nightwork-pre-commit] Latest /nightwork-qa report is ${AGE_MIN} minutes old (>60). Recent code may not be covered.

  • Run /nightwork-qa to refresh
  • Or add 'Execute-Phase: <plan-id>' footer if this is a pre-scheduled-QA execute commit
  • Or pass --no-verify if you've manually verified the latest changes"
  NW_REASON="$REASON" node -e "
  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: process.env.NW_REASON || ''
  }));
  " 2>/dev/null
  exit 2
fi

# Check verdict — extract just the leading verdict token, not prose.
# Reports look like:
#   ## Overall verdict
#
#   **WARNING (down from WARNING with HIGH)** — no BLOCKING / CRITICAL / HIGH findings remain.
# Older format also accepted: a single bolded token ("**BLOCKING**").
# We only match BLOCKING when it is the leading **TOKEN** (or a bare leading
# token), never when it appears in surrounding prose.
VERDICT_LINE=$(awk '/^## Overall verdict/{flag=1;next} flag && NF{print;exit}' "$LATEST_QA" 2>/dev/null || true)
# Pull leading **TOKEN** (bolded) or first ALL-CAPS word.
LEADING_VERDICT=$(echo "$VERDICT_LINE" | sed -nE 's/^[[:space:]]*\*\*([A-Z]+).*/\1/p')
if [ -z "$LEADING_VERDICT" ]; then
  LEADING_VERDICT=$(echo "$VERDICT_LINE" | sed -nE 's/^[[:space:]]*([A-Z]+).*/\1/p')
fi

if [ "$LEADING_VERDICT" = "BLOCKING" ]; then
  REASON="[nightwork-pre-commit] Latest /nightwork-qa verdict is BLOCKING.

Report: $LATEST_QA

Address the blocking findings, re-run /nightwork-qa, then re-commit. Pass --no-verify only if you've verified the blockers no longer apply."
  NW_REASON="$REASON" node -e "
  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: process.env.NW_REASON || ''
  }));
  " 2>/dev/null
  exit 2
fi

exit 0
