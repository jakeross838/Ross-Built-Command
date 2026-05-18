#!/bin/bash
# Nightwork PreToolUse hook for Bash (git commit detection).
#
# Block commits where supabase/migrations/ files are staged but
# src/lib/types/database.types.ts isn't (or is out of sync with the
# regen output). Per F1-Wave-B Plan B-1b (umbrella Q11 D hybrid pattern
# + nwrp153 — types pipeline gate).
#
# WHY: schema changes flow into types via `supabase gen types typescript
# --linked`. If a migration lands without the regenerated types file,
# downstream callers see a type drift that compiles today but breaks
# the next time the types file IS regenerated. Pre-commit catches the
# drift at staging.
#
# Bypass: `--no-verify` (per CLAUDE.md "Never --no-verify without
# Jake's explicit authorization" — bypass is logged at code review).
# Compound `git add ... && git commit` form bypasses by hook design
# per CLAUDE.md "Commit mechanism transparency" (regex match in
# the line below only fires on commands starting with `git commit`).
#
# Disable env vars:
#   NIGHTWORK_HOOKS_DISABLE=1     — disables every Nightwork hook
#   NIGHTWORK_TYPE_REGEN_DISABLE=1 — disables this hook only

set -e

[[ "$NIGHTWORK_HOOKS_DISABLE" == "1" ]] && exit 0
[[ "$NIGHTWORK_TYPE_REGEN_DISABLE" == "1" ]] && exit 0

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

# Only check git commit (not git add, not other git ops)
if [[ ! "$CMD" =~ ^(git[[:space:]]+commit) ]]; then
  exit 0
fi

# Allow --no-verify (per CLAUDE.md authorization rule)
if [[ "$CMD" =~ --no-verify ]]; then
  exit 0
fi

# Detect staged migration files
STAGED=$(git diff --cached --name-only 2>/dev/null || true)
if [ -z "$STAGED" ]; then
  exit 0
fi

MIGRATIONS_STAGED=$(echo "$STAGED" | grep -cE "^supabase/migrations/" || true)
if [ "$MIGRATIONS_STAGED" -eq 0 ]; then
  # No migrations staged; type regen check is N/A
  exit 0
fi

# Migrations are staged. Check whether database.types.ts is also staged.
TYPES_STAGED=$(echo "$STAGED" | grep -cE "^src/lib/types/database\.types\.ts$" || true)
if [ "$TYPES_STAGED" -eq 1 ]; then
  # User correctly staged the regenerated file alongside the migration.
  exit 0
fi

# Migrations staged but types file isn't. Verify whether regen would
# produce a diff. If yes, block with a clear reason.
if ! command -v supabase >/dev/null 2>&1 && ! command -v npx >/dev/null 2>&1; then
  # No supabase + no npx; can't regenerate locally. Warn but don't block
  # (fail-open posture for tooling-missing environments).
  exit 0
fi

# Regenerate to a temp file and diff. Prefer `supabase` if directly on
# PATH; fall back to `npx supabase` (which is the canonical invocation
# pattern in this repo).
TMP=$(mktemp)
if command -v supabase >/dev/null 2>&1; then
  supabase gen types typescript --linked > "$TMP" 2>/dev/null || {
    rm -f "$TMP"
    # Regen failed (no linked project, network issue, etc.). Don't block.
    exit 0
  }
else
  npx --yes supabase gen types typescript --linked > "$TMP" 2>/dev/null || {
    rm -f "$TMP"
    exit 0
  }
fi

if ! diff -q "$TMP" src/lib/types/database.types.ts >/dev/null 2>&1; then
  REASON="[nightwork-type-regen] Migrations staged under supabase/migrations/ but src/lib/types/database.types.ts does not match the regenerated output.

Run:
  supabase gen types typescript --linked > src/lib/types/database.types.ts
  git add src/lib/types/database.types.ts

(or via npx if supabase isn't on PATH:)
  npx supabase gen types typescript --linked > src/lib/types/database.types.ts
  git add src/lib/types/database.types.ts

Then re-commit. Pass --no-verify ONLY if you've intentionally diverged
(rare; document the rationale in the commit body)."
  rm -f "$TMP"
  NW_REASON="$REASON" node -e "
  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: process.env.NW_REASON || ''
  }));
  " 2>/dev/null
  exit 2
fi

rm -f "$TMP"
exit 0
