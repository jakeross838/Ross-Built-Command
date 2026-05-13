# Wave-C deferred items (out-of-scope discoveries during execute)

Per CLAUDE.md SCOPE BOUNDARY: pre-existing issues NOT directly caused by Plan
C-1's changes are logged here for future cleanup; not fixed in this PR.

## Pre-existing design-token violations (post-edit hook flagged)

The nightwork-post-edit.sh hook flagged pre-existing hardcoded hex codes in
files Plan C-1 modifies. Confirmed pre-existing via `git diff` — NOT caused
by the C-1 edits.

### `src/app/invoices/page.tsx`

- **Line 810** (pre-existing): `bg-white` on toggle-switch thumb element
  - Pre-existing context: Inline pickup-toggle switch — thumb element uses
    `bg-white` against a stone-blue / border-default background. White thumb
    on dark switch is a standard interaction pattern. Hook flags as
    "Nightwork uses Slate" but this is a legitimate visual contrast on a
    UI toggle thumb. Recommend either:
    1. Update hook allowlist to permit `bg-white` on toggle thumbs, OR
    2. Migrate to a thumb-on-accent token (e.g. `bg-[var(--text-on-accent)]`)
       once SYSTEM.md defines one.
  - Route: Wave 1.1-Lite cosmetic cleanup pass.

**Status:** logged for Wave 1.1-Lite cosmetic pass. Plan C-1's edit in this
file is limited to lines 144-209 (add auth pre-flight + refactor PM
dropdown query per CR-C1-1 Option A); the design-token violation on line
810 is untouched by C-1.

### `src/app/jobs/new/page.tsx`

- **Line 320** (pre-existing): `text-white` class on submit button
  - Pre-existing context: Submit "Create Job" button uses `text-white` against
    `bg-[var(--nw-stone-blue)]`. Stone blue button intentionally uses white
    text for contrast. Likely a stylistic intent decision; hook flags as
    "Slate uses bg-nw-page / text-nw-slate-tile" — but inverse contrast on
    a primary action button is the standard pattern. Recommend either:
    1. Update hook allowlist to permit `text-white` on `bg-[var(--nw-stone-blue)]`
       buttons, OR
    2. Migrate button to use a button-on-stone-blue token (e.g.
       `text-[var(--text-on-accent)]`) once SYSTEM.md defines one.
  - Route: Wave 1.1-Lite cosmetic cleanup pass per ARCHITECTURE.md §6.

- **Lines 332-333** (pre-existing): inline `<style jsx>` block with
  `#F5F5F5` and `#E8E8E8` as CSS-variable fallbacks
  - Pre-existing context: `var(--bg-subtle, #F5F5F5)` and
    `var(--border-default, #E8E8E8)` — the hex is a defensive fallback,
    not a token replacement. Defensive fallbacks are a legitimate pattern
    for env-resilience, but hook does not distinguish fallback from primary.
  - Recommend: refactor the `<style jsx>` block to plain Tailwind utilities
    (`className="bg-[var(--bg-subtle)] border-[var(--border-default)]"` on
    inputs) so no inline CSS is needed; OR update hook regex to permit hex
    inside `var(..., #HEX)` defensive-fallback syntax.
  - Route: Wave 1.1-Lite cosmetic cleanup pass.

**Status:** logged for Wave 1.1-Lite cosmetic pass. Plan C-1's edits in this
file are limited to lines 52-94 (refactor PM dropdown query); the
design-token violations exist on lines 320-340 untouched by C-1.

## Reason this file exists

To unblock C-1 execute while preserving the post-edit hook's audit signal.
Hook will continue to flag these pre-existing items on every C-1-related
edit to this file; documentation here is the deferral-decision record.
