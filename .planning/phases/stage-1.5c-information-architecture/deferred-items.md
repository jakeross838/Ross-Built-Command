# Deferred items — Stage 1.5c information-architecture

Out-of-scope discoveries surfaced during plan execution.

## Plan 3 (extraction-production-routes) — 2026-05-06

### CSS-var-fallback hex literals in legacy /jobs/[id]/* pages

**Triggered by:** post-edit hook during Task 4 JobTabs removal.

**Files + lines:**
- `src/app/jobs/[id]/page.tsx:582-583` — `var(--bg-subtle, #F5F5F5)` + `var(--border-default, #E8E8E8)` inside scoped `<style jsx>` block (`.input` class)
- `src/app/jobs/new/page.tsx:312-313` — same pattern (CSS var fallbacks for `.input` styling)

**Pattern:** CSS variable fallback literals — `var(--token-name, #FALLBACK_HEX)`. The fallback is invoked only if the CSS variable fails to resolve. Slate tokens are always defined under `.design-system-scope`, but these legacy pages render outside that scope, so the fallback could fire.

**Why deferred:**
- Pre-existing in legacy code before Plan 3 work (verified via `git blame` not modified by my JobTabs-removal edit; the post-edit hook flags whole-file hex on every Edit regardless of whether the edit touched the hex line)
- Out of scope for Plan 3 (Plan 3 task scope: extract View components + mount production routes + remove inline JobTabs — not legacy `<style jsx>` cleanup)
- Fix path: replace `var(--bg-subtle, #F5F5F5)` with bracket-value Tailwind utility (`bg-[var(--bg-subtle)]`) or move the `<style jsx>` block to globals.css with documented exception. Either path is a non-trivial code change requiring its own plan + verification (these legacy `.input` classes are used in multiple form fields).

**Recommended phase:** Stage 1.5c Plan 7 (canonical-docs-smoke) atomic CLAUDE.md update could note the legacy `<style jsx>` cleanup as a tracked F1 ticket. Or fold into a future "legacy-css-cleanup" plan when /jobs/[id]/page.tsx becomes the next IA-extracted target (currently just JobTabs-removed; full IA migration deferred to F1+).

**Verification when fixed:** `grep -nE '#[0-9A-Fa-f]{3,6}' src/app/jobs/\[id\]/page.tsx src/app/jobs/new/page.tsx` returns 0.
