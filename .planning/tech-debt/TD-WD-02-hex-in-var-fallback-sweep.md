# TD-WD-02 — hex-in-CSS-var-fallback sweep across remaining sites

**Origin:** Wave-D D-1 pre-flight Rule 6 sweep (nwrp132)
**Captured:** 2026-05-14 nwrp132 Scenario A decision
**Scheduled:** Wave 1.1-Full design polish

## Evidence (verified 2026-05-14)

Pattern: `var(--css-var-name, #HEX-LITERAL)` — defensive hex fallback inside CSS `var()` declaration. Hook regex `#[0-9a-fA-F]{6}\b` (.claude/hooks/nightwork-post-edit.sh:55) treats this identically to plain hardcoded hex, but the semantic is different — it's a fallback that fires only if the CSS var is undefined at runtime.

Found via `grep -rn "var(\-\-[a-z-]\+, #" src/` during D-1 pre-flight:

| File | Line | Pattern |
|------|------|---------|
| `src/app/jobs/new/page.tsx` | 332 | `background: var(--bg-subtle, #F5F5F5)` — **CLEANED in D-1 precursor commit** |
| `src/app/jobs/new/page.tsx` | 333 | `border: 1px solid var(--border-default, #E8E8E8)` — **CLEANED in D-1 precursor commit** |
| `src/app/jobs/[id]/page.tsx` | 582 | `background: var(--bg-subtle, #F5F5F5)` |
| `src/app/jobs/[id]/page.tsx` | 583 | `border: 1px solid var(--border-default, #E8E8E8)` |
| `src/components/invoice-allocations-editor.tsx` | 290 | `background: var(--bg-subtle, #f5f5f5)` (lowercase) |
| `src/components/invoice-allocations-editor.tsx` | 291 | `border: 1px solid var(--border-default, #e8e8e8)` (lowercase) |

All 4 remaining instances use the SAME two CSS vars (`--bg-subtle`, `--border-default`) with the SAME fallback hexes (`#F5F5F5`, `#E8E8E8` or lowercase). The pattern likely originated as a single copy-paste-propagated `<style jsx>` block.

## Why fallbacks were once needed (historical context)

These files were authored before `--bg-subtle` + `--border-default` were defined globally in `src/app/globals.css`. The hex fallback was the "primary value if CSS var unset" — defensive against the design-system migration that hadn't yet completed. Post-migration, both CSS vars are now defined unconditionally in `:root` and `.dark` selectors (src/app/globals.css:36, 44-45, 61, 63, 79, 87-88, 100, 102, 160, 191, 197, 243), so the fallback is redundant and now technical debt.

## Canonical design-system position (per Wave-D verification)

Per PROPAGATION-RULES.md:273, the canonical fallback pattern is **chained CSS vars** (`var(--brand-accent, var(--nw-stone-blue))`), NOT hex literals. Hex-as-fallback is non-canonical; remove unconditionally when the primary var is defined globally.

## Status

**Active tech debt.** Two source files (jobs/[id]/page.tsx + invoice-allocations-editor.tsx) still have the pattern. Hook will fire on any future edit to those files (the same block-on-pre-existing-violation pathology that surfaced this finding in jobs/new/page.tsx during D-1 pre-flight).

## Recommended action (Wave 1.1-Full design polish)

1. Remove hex fallbacks from both remaining files:
   - `src/app/jobs/[id]/page.tsx:582` — `var(--bg-subtle, #F5F5F5)` → `var(--bg-subtle)`
   - `src/app/jobs/[id]/page.tsx:583` — `var(--border-default, #E8E8E8)` → `var(--border-default)`
   - `src/components/invoice-allocations-editor.tsx:290` — `var(--bg-subtle, #f5f5f5)` → `var(--bg-subtle)`
   - `src/components/invoice-allocations-editor.tsx:291` — `var(--border-default, #e8e8e8)` → `var(--border-default)`
2. Verify typecheck + build remain clean (no runtime regression — the fallbacks are unused since the vars resolve)
3. Re-run the Rule 6 pre-flight sweep across affected files; expect zero remaining hex-in-var-fallback hits in `src/`
4. Optional: codify in PROPAGATION-RULES.md a "never use hex-as-fallback; always use var-chained-fallback" rule alongside the existing chained-var pattern documentation at line 273

## Estimated impact

- 4 line changes across 2 files
- No runtime behavior change (vars resolve identically; fallbacks are dead code)
- Eliminates the Rule 6 pre-flight false-precursor for any future plan that touches these 2 files
- Closes the hex-in-var-fallback sub-category of HEX_HITS violations in `src/` to zero
