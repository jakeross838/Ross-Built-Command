#!/bin/bash
# Nightwork PostToolUse hook for Write|Edit|MultiEdit
# Scans the just-edited file for Nightwork anti-patterns. BLOCKS on hard violations
# introduced by the current edit; WARNS (informational; doesn't block) on pre-existing
# violations from prior commits.
#
# Hard rejections — hex colors in components, Tailwind named colors, legacy namespaces,
# CREATE TABLE without RLS, hard DELETE / DROP TABLE in migrations.
#
# nwrp158 + nwrp159 iter-3 precision refinement (TD-WB-HOOK-PRECISION resolution):
# Scope blocking to lines touched by the current edit (computed via `git diff HEAD --
# <file>`). Pre-existing violations on untouched lines still surface as stderr warnings
# (discipline preserved — never silently suppressed) but do NOT block the commit. This
# closes the recurring class where pre-existing technical debt on an unrelated line in a
# touched file would block legitimate edits + force the executor to either fix
# unrelated debt (scope creep) or bypass with --no-verify (override).

set -e

[[ "$NIGHTWORK_HOOKS_DISABLE" == "1" ]] && exit 0

cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0
case "$(pwd)" in
  *nightwork-platform*) ;;
  *) exit 0 ;;
esac

INPUT=$(cat)
FILE=$(node -e "
let d='';
process.stdin.on('data', c => d += c);
process.stdin.on('end', () => {
  try {
    const j = JSON.parse(d);
    process.stdout.write(j.tool_input?.file_path || j.tool_input?.path || '');
  } catch { process.stdout.write(''); }
});
" <<< "$INPUT" 2>/dev/null)

[ -z "$FILE" ] && exit 0
[ ! -f "$FILE" ] && exit 0

# Convert backslash to forward slash for matching on Windows
FILE_NORM=$(echo "$FILE" | sed 's|\\|/|g')

# Skip outside-scope files (match both absolute and relative paths)
case "$FILE_NORM" in
  src/* | */src/* | supabase/migrations/* | */supabase/migrations/* )
    ;;
  *) exit 0 ;;
esac

# Skip globals.css and tailwind config — they DEFINE tokens
case "$FILE_NORM" in
  *globals.css | *tailwind.config.* )
    exit 0 ;;
esac

ISSUES_FILE=$(mktemp)
WARNINGS_FILE=$(mktemp)
> "$ISSUES_FILE"
> "$WARNINGS_FILE"

# Compute the set of line numbers ADDED by the current edit (working tree vs HEAD).
# - For tracked files: parse `git diff -U0 HEAD -- <file>` hunk headers (`@@ -A,B +C,D @@`)
#   and emit the new-file line range C..C+D-1.
# - For untracked files: all lines are NEW (file just created by Write tool).
# - On any error (no git repo, etc.): conservative fallback — treat all hits as NEW
#   (preserves current blocking behavior; no false negatives).
ADDED_LINES=""
if git rev-parse --git-dir > /dev/null 2>&1; then
  if git ls-files --error-unmatch "$FILE" > /dev/null 2>&1; then
    # Tracked file: extract added-line numbers from diff hunk headers
    ADDED_LINES=$(git diff --no-color -U0 HEAD -- "$FILE" 2>/dev/null | awk '
      /^@@/ {
        # @@ -A,B +C,D @@ ... or @@ -A +C @@ ...
        if (match($0, /\+[0-9]+(,[0-9]+)?/)) {
          hunk = substr($0, RSTART+1, RLENGTH-1)
          n = split(hunk, parts, ",")
          start = parts[1]
          count = (n == 2 ? parts[2] : 1)
          for (i = start; i < start + count; i++) print i
        }
      }
    ')
  else
    # Untracked: file just created OR not in git yet — all lines are new
    # Emit all line numbers 1..N
    ADDED_LINES=$(awk 'END { for (i = 1; i <= NR; i++) print i }' "$FILE")
  fi
fi

# Classify a multi-line grep result (line-prefixed: "N:...") into NEW vs PRE-EXISTING.
# Writes to two files: $NEW_OUT (block-on) and $PREEXISTING_OUT (informational warn).
classify_hits() {
  local raw_hits="$1"
  local new_out="$2"
  local preexisting_out="$3"
  > "$new_out"
  > "$preexisting_out"

  [ -z "$raw_hits" ] && return

  # Conservative fallback: if ADDED_LINES couldn't be computed, treat all as NEW.
  if [ -z "$ADDED_LINES" ]; then
    echo "$raw_hits" >> "$new_out"
    return
  fi

  while IFS= read -r hit; do
    [ -z "$hit" ] && continue
    local line
    line=$(echo "$hit" | cut -d: -f1)
    # Match line number against ADDED_LINES (exact match on its own line in the set)
    if echo "$ADDED_LINES" | grep -qxE "${line}"; then
      echo "$hit" >> "$new_out"
    else
      echo "$hit" >> "$preexisting_out"
    fi
  done <<< "$raw_hits"
}

# Report a violation class with split blocking/informational tiers.
#   $1: class label (the header line, e.g. "[design-tokens] Hardcoded hex color (...):")
#   $2: raw grep hits (multi-line)
# Writes:
#   - NEW hits → $ISSUES_FILE (blocks the edit)
#   - PRE-EXISTING hits → $WARNINGS_FILE (informational; emitted to stderr; does NOT block)
report_hits() {
  local class_label="$1"
  local raw_hits="$2"
  [ -z "$raw_hits" ] && return

  local new_file
  local preexisting_file
  new_file=$(mktemp)
  preexisting_file=$(mktemp)

  classify_hits "$raw_hits" "$new_file" "$preexisting_file"

  if [ -s "$new_file" ]; then
    echo "$class_label" >> "$ISSUES_FILE"
    head -3 "$new_file" >> "$ISSUES_FILE"
    echo "" >> "$ISSUES_FILE"
  fi

  if [ -s "$preexisting_file" ]; then
    echo "$class_label (pre-existing on untouched lines — informational; not blocking):" >> "$WARNINGS_FILE"
    head -3 "$preexisting_file" >> "$WARNINGS_FILE"
    echo "" >> "$WARNINGS_FILE"
  fi

  rm -f "$new_file" "$preexisting_file"
}

# 1. .tsx / .ts / .css — design token violations
if [[ "$FILE_NORM" =~ \.(tsx|ts|css|scss)$ ]]; then
  # Hex colors used as Tailwind class arbitrary values are OK only via var(); pure hex hardcoded → BLOCK
  HEX_HITS=$(grep -nE "#[0-9a-fA-F]{6}\b" "$FILE" | grep -vE "(globals\.css|tailwind\.config|//|/\*)" || true)
  report_hits "[design-tokens] Hardcoded hex color (use Slate CSS vars / nw-* utilities):" "$HEX_HITS"

  # Tailwind named color utilities (block list — Slate palette only)
  NAMED_HITS=$(grep -nE "\b(bg|text|border|ring|fill|stroke|from|to|via|placeholder|caret|accent|outline|divide)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)\b" "$FILE" || true)
  report_hits "[design-tokens] Tailwind named color (Phase E removed these — use bracket-value with --bg-card / --text-primary or nw-* utilities):" "$NAMED_HITS"

  # Pure bg-white / text-black / bg-black / text-white  — Nightwork uses Slate, never pure
  PURE_HITS=$(grep -nE "\b(bg|text|border)-(white|black)\b" "$FILE" || true)
  report_hits "[design-tokens] Pure white/black (Nightwork uses Slate — bg-nw-page, text-nw-slate-tile):" "$PURE_HITS"

  # Legacy namespaces removed in Phase E
  LEGACY_HITS=$(grep -nE "\b(bg|text|border)-(cream|teal-(?!.*nw)|brass|brand|status|nightwork)-" "$FILE" 2>/dev/null || true)
  report_hits "[design-tokens] Legacy namespace (cream/teal/brass/brand/status/nightwork removed in Phase E):" "$LEGACY_HITS"
fi

# 2. SQL migrations — RLS, soft-delete, drops
if [[ "$FILE_NORM" =~ supabase/migrations/.*\.sql$ ]]; then
  # CREATE TABLE without ENABLE ROW LEVEL SECURITY in the same file
  # (this is a whole-file check, not line-based — keep the existing all-or-nothing block
  # because adding a CREATE TABLE without RLS in any new lines is a true new violation
  # regardless of whether other tables in the file have RLS)
  if grep -iqE "CREATE TABLE\s+(IF NOT EXISTS\s+)?[a-zA-Z_]" "$FILE" && ! grep -iq "ENABLE ROW LEVEL SECURITY" "$FILE"; then
    # Only block if the CREATE TABLE was introduced in this edit
    CREATE_TABLE_HITS=$(grep -niE "^[^-]*CREATE TABLE\s+(IF NOT EXISTS\s+)?[a-zA-Z_]" "$FILE" || true)
    report_hits "[rls-auditor] Migration creates a table without ENABLE ROW LEVEL SECURITY. Add ALTER TABLE … ENABLE ROW LEVEL SECURITY + at least one CREATE POLICY in the same migration." "$CREATE_TABLE_HITS"
  fi

  # Hard DELETE FROM (allow inside comments)
  DELETE_HITS=$(grep -niE "^[^-]*\bDELETE FROM\b" "$FILE" || true)
  report_hits "[migration-safety] Hard DELETE FROM. Nightwork uses soft-delete: UPDATE … SET deleted_at = now()." "$DELETE_HITS"

  # DROP TABLE — block by default, allow only with explicit comment
  DROP_HITS=$(grep -niE "^[^-]*\bDROP TABLE\b" "$FILE" || true)
  if [ -n "$DROP_HITS" ] && ! grep -iq -- "-- nightwork: drop-justified" "$FILE"; then
    report_hits "[migration-safety] DROP TABLE without justification. Add '-- nightwork: drop-justified — <reason>' comment if intentional." "$DROP_HITS"
  fi

  # TRUNCATE
  TRUNC_HITS=$(grep -niE "^[^-]*\bTRUNCATE\b" "$FILE" || true)
  report_hits "[migration-safety] TRUNCATE — destroys data, never allowed in tenant tables." "$TRUNC_HITS"
fi

# 3. Hardcoded ORG_ID outside the seed-template path
if [[ "$FILE_NORM" =~ \.(ts|tsx)$ ]] && [[ ! "$FILE_NORM" =~ cost-codes/template/ ]]; then
  ORG_ID_HITS=$(grep -nE "(const|let|var)\s+ORG_ID\s*=" "$FILE" || true)
  report_hits "[rls-auditor] Hardcoded ORG_ID found. Only TEMPLATE_ORG_ID in cost-codes/template/route.ts is allowed. Use getCurrentMembership().org_id." "$ORG_ID_HITS"
fi

# Stage 1.5a — T10b: Forbidden-list enforcement (per SPEC A2.1 / D5.1).
if [[ "$FILE_NORM" =~ \.(tsx|ts|css|scss)$ ]]; then
  CB4_HITS=$(grep -nE "cubic-bezier\([^)]*,[^)]*,[^)]*,\s*[1-9]\.[0-9]" "$FILE" || true)
  report_hits "[forbidden-A2.1] Bouncy easing — cubic-bezier 4th arg >= 1.0 (overshoot/elastic forbidden per SPEC A2.1):" "$CB4_HITS"

  CB2_HITS=$(grep -nE "cubic-bezier\([^,]+,\s*[1-9]\.[0-9]" "$FILE" || true)
  report_hits "[forbidden-A2.1] Bouncy easing — cubic-bezier 2nd arg >= 1.0 (forbidden per SPEC A2.1):" "$CB2_HITS"

  # Oversized rounded — exempt avatar/dot files (filename hints)
  case "$FILE_NORM" in
    *avatar* | *Avatar* | *status-dot* | *StatusDot* | *radius-dot* )
      ;; # avatar/dot exception per SPEC A2.1 (--radius-dot: 999px)
    *)
      ROUNDED_HITS=$(grep -nE "\brounded(-(t|r|b|l|tl|tr|bl|br|ts|te|bs|be|s|e))?-(lg|xl|2xl|3xl|full)\b" "$FILE" || true)
      report_hits "[forbidden-A2.1] Oversized rounded corners — rounded-{,t,r,b,l,…}-{lg,xl,2xl,3xl,full} forbidden on rectangular elements (border-radius > 4px per SPEC A2.1; avatars/dots use --radius-dot: 999px exception):" "$ROUNDED_HITS"
      ;;
  esac

  # Dark glow — box-shadow with blur > 20px AND spread > 0
  SHADOW_HITS=$(grep -nE "box-shadow:\s*[^;]*\s+(2[1-9]|[3-9][0-9]|[1-9][0-9]{2,})px\s+[1-9][0-9]*px" "$FILE" || true)
  report_hits "[forbidden-A2.1] Dark glow — box-shadow with blur > 20px AND spread > 0 (forbidden per SPEC A2.1):" "$SHADOW_HITS"

  # Purple/pink — HSL hue ∈ [270°, 320°]
  PURPLE_HITS=$(grep -nE "hsl\(\s*(2[7-9][0-9]|3[01][0-9]|320)\b" "$FILE" || true)
  report_hits "[forbidden-A2.1] Purple/pink HSL hue (270°-320° forbidden per SPEC A2.1 — anti-Notion/anti-Slack palette posture):" "$PURPLE_HITS"
fi

# Stage 1.5a — T10c: Sample-data isolation in /design-system/ (per SPEC C6 / D9).
# This check is whole-file-import-scope (NOT touched-lines-only) because importing a
# forbidden module poisons the entire file — a touched line that doesn't include the
# import would still inherit the violation. Keep blocking-on-presence for this class.
if [[ "$FILE_NORM" =~ ^(.*/)?src/app/design-system/.*\.(tsx|ts|jsx|js)$ ]]; then
  ALL_IMPORTS=$(grep -nE "from\s+['\"]@/lib/(supabase|org|auth)([/'\"])" "$FILE" 2>/dev/null || true)
  if [ -n "$ALL_IMPORTS" ]; then
    SAMPLE_HITS=$(echo "$ALL_IMPORTS" | awk '
      /from[[:space:]]+['\''"]@\/lib\/supabase\/types(['\''"]|\/)/ { next }
      { print }
    ')
    # For module-import-scope: block regardless of touched-lines (poison-scope concern).
    if [ -n "$SAMPLE_HITS" ]; then
      echo "[design-system-isolation] Sample data in /design-system/ MUST come from constants in src/app/design-system/_fixtures/ — never tenant-scoped modules. Type-only imports from '@/lib/supabase/types' (and subpaths) are allowed; module imports from '@/lib/supabase/server', '@/lib/supabase' (bare), '@/lib/org/*', '@/lib/auth/*' are forbidden (per SPEC C6 / D9):" >> "$ISSUES_FILE"
      echo "$SAMPLE_HITS" | head -3 >> "$ISSUES_FILE"
      echo "" >> "$ISSUES_FILE"
    fi
  fi
fi

# Stage 1.5a — T10d: Tenant-blind primitives in src/components/ui/ (per SPEC C8 / A12.1).
# Like T10c: prop-shape contract is whole-file-scope (a forbidden prop in a touched line
# OR an untouched line of the same component contract is equally bad). Keep blocking-on-
# presence.
if [[ "$FILE_NORM" =~ ^(.*/)?src/components/ui/.*\.(tsx|ts|jsx|js)$ ]]; then
  TENANT_HITS=$(grep -nE "\b(org_id|membership|vendor_id|orgId|membershipId)(\?)?\s*:" "$FILE" || true)
  if [ -n "$TENANT_HITS" ]; then
    echo "[tenant-blind-primitives] Primitives in src/components/ui/ MUST be tenant-blind — no org_id/membership/vendor_id/orgId/membershipId props. Tenant-aware composition lives in src/components/<domain>/ only (per SPEC C8 / A12.1):" >> "$ISSUES_FILE"
    echo "$TENANT_HITS" | head -3 >> "$ISSUES_FILE"
    echo "" >> "$ISSUES_FILE"
  fi
fi

# nwrp19 — T-nwrp19a + T-nwrp19b: Wordmark integrity (per BRANDING.md §3, §6).
if [[ "$FILE_NORM" =~ \.tsx$ ]]; then
  # (a) Size attribute literal-only match
  WM_SIZE_HITS=$(grep -nE "<NwWordmark[^>]*\bsize=\{[0-9]+\}" "$FILE" | \
    grep -vE "size=\{(80|110|140|180|200|220|240)\}" || true)
  report_hits "[branding-nwrp19a] <NwWordmark size={N}> with N outside the documented allow-list {80, 110, 140, 180, 200, 220, 240} (per BRANDING.md §3 sizing system):" "$WM_SIZE_HITS"

  # (b) Hex color override on a wordmark instance
  WM_HEX_HITS=$(awk '
    /<NwWordmark/ {
      win=10; nr=NR
      buf=$0
      next
    }
    win > 0 {
      buf = buf "\n" $0
      win--
      if (win == 0) {
        if (match(buf, /(style=\{\{[^}]*(color|fill)[^}]*#[0-9a-fA-F]{6}|text-\[#[0-9a-fA-F]{6}\]|fill-\[#[0-9a-fA-F]{6}\])/)) {
          print nr ": " substr(buf, RSTART, RLENGTH)
        }
        buf=""
      }
    }
  ' "$FILE")
  report_hits "[branding-nwrp19b] Wordmark color override via hex literal forbidden — use the NwWordmark color prop ('auto' | 'inverse' | 'brand') or token-driven CSS vars (per BRANDING.md §6 Forbidden treatments):" "$WM_HEX_HITS"
fi

# Emit pre-existing-violation warnings to stderr (informational; doesn't block)
if [ -s "$WARNINGS_FILE" ]; then
  echo "[nightwork-post-edit] PRE-EXISTING violations in $FILE (informational; flagged but not blocking edit — these were in the file at HEAD before the current edit. Track via TD entry if cleanup is desired):" >&2
  cat "$WARNINGS_FILE" >&2
fi

# Block if any NEW issues were found (violations introduced by the current edit)
if [ -s "$ISSUES_FILE" ]; then
  REASON=$(cat "$ISSUES_FILE")
  rm -f "$ISSUES_FILE" "$WARNINGS_FILE"
  NW_REASON="$REASON" node -e "
  const reason = process.env.NW_REASON || '';
  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: '[nightwork-post-edit] ' + reason + '\\nFix or justify (legitimate exceptions are rare). Use /nightwork-design-check or /nightwork-qa for full review. Set NIGHTWORK_HOOKS_DISABLE=1 only as a last resort.'
  }));
  " 2>/dev/null
  exit 2
fi

rm -f "$ISSUES_FILE" "$WARNINGS_FILE"
exit 0
