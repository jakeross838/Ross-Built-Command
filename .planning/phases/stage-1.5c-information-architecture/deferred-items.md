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

## Plan 6 (admin-platform-admin) — 2026-05-11

### Pre-existing hardcoded hex in `end-impersonation-button.tsx`

**Triggered by:** post-edit hook during Task 2 (end-impersonation default-redirect path update).

**File + line:** `src/components/end-impersonation-button.tsx:35` — `color: "#FFF8F3"` (white-sand cream)

**Pattern:** Pre-existing hardcoded hex literal in a component I edited for an unrelated reason (changing the default fallback redirect from `/admin/platform` to `/platform-admin` per iter-2 D-20 migration). The hex predates Plan 6 work entirely.

**Why touched:** The post-edit hook runs on the whole file after any Edit. Since I had to edit lines 18-21 to update the redirect target, the hook scanned the entire file and flagged the hex on line 35. Per the scope boundary rule this is out-of-scope, but the hook blocks the commit. Pragmatic fix applied inline: replaced `#FFF8F3` with `var(--nw-white-sand)` (the Slate equivalent — same visual result, token-correct).

**Status:** Resolved (replaced with Slate CSS var in same Plan 6 Task 2 commit). Documented here for transparency since the fix was technically out of Plan 6's nominal scope.


---

## Wave 1.1-Lite — SMOKE 3 responsive polish (2026-05-12)

**Discovered by:** Pre-ship manual smokes per nwrp90, Smoke 3 (12 production thin-wrappers × 2 viewports).
**Date:** 2026-05-12, post-GATE-B.1 fix groups.

**Findings (non-blocking — content remains accessible via horizontal scroll on all surfaces):**

### iPhone (393×852) — 3 routes overflow

| Route | scrollW | clientW | Cause |
|---|---|---|---|
| `/jobs` | 881 | 393 | Data-heavy job list table |
| `/financials/bills` | 865 | 393 | Bills list table |
| `/financials/pay-apps` | 649 | 393 | Pay Apps list table |

**Wave 1.1-Lite fix:** Collapse tables to card view below `md` breakpoint (768px). Each table row becomes a stacked Card with key fields. Pattern: existing mobile-approval surface (PerJobTabs Plan 5) demonstrates the card-stack approach for data-heavy views on phone.

### Tablet (768×1024) — 10/12 routes overflow

10 section overview pages overflow at scrollW≈993 (suggests `max-w-[1200px]` container with internal content slightly wider than the viewport-shrunk 768).

**Worst offender:** `/financials/bills` scrollW=1313 (data table — same as iPhone overflow but ~545px overflow at tablet width).

**Wave 1.1-Lite fix candidates:**
- Tighten `max-w-[1200px]` to `max-w-[768px]` for tablet, OR
- Adjust internal padding/grid gap so card-grid columns shrink properly at md breakpoint, OR
- Audit each section overview for fixed-width children that don't reflow

**Scope:** ~30-60 min CATEGORY-F mechanical work; spans 10 section overview pages + 3 list views. Pairs with F1 schema work where some list views become real-data backed.

**Status:** DEFERRED to Wave 1.1-Lite polish phase (per Jake nwrp92 Path A authorization). Documented as non-blocking; content remains accessible via horizontal scroll across all affected routes.

**Diagnostic provenance:** `.planning/qa-runs/2026-05-12-manual-smokes.md` (gitignored; full SMOKE 3 detail).
