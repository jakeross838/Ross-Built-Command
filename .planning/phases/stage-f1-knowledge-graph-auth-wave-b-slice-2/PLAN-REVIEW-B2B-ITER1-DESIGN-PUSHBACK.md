# Plan-Review B-2b iter-1 — Design Pushback

**Captured from agent inline return** (agent disk-write suppressed by its system prompt; transcribed for audit-trail).

**Verdict: APPROVE** — 2 WARN + multiple NOTE; no BLOCKING.

## Plan UI surface

B-2b ships the first user-facing F1 surface: `/owner/{token}` (Dashboard pattern, §4h.3) + `/owner/{token}/pay-apps/{id}` (Document Review extension, §2h.3 ex. 3) — both via existing tenant-blind primitives `OwnerDashboardView` / `OwnerDrawView` wrapped in `<main data-prototype="...">` at the page.tsx layer. Adds standalone `layout.tsx` (logo top-left), `error.tsx` (timing-uniform "link no longer valid"), acknowledge POST endpoint, ClientCombobox polish, NwButton TD-20 exemption on acknowledge CTA.

## Pushbacks

### CRITICAL

**None.** All 7 design-pushback scope items reconcile against canonical sources.

### WARNING

1. **PATTERNS.md section citation drift** — PLAN cites "**§2j.3**" repeatedly (lines 25, 67, 232, 242, 260, 297, 313, 1138, 1141, 1420, 1568, 1813, 1817). Actual: PATTERNS.md §2j is "Cross-references" (no item-3 subsection); the intended cite is **§2h.3 Examples** at line 223 ("Draw approval detail — extends Document Review for owner sign-off on AIA pay applications"). Semantic intent unambiguous; textual citation drift. Recommend global replace before /nx.

2. **SYSTEM.md NwButton size docs disagree with implementation** — SYSTEM.md §11 lines 621-622 claim `size="lg"` → 56px high-stakes; actual at `src/components/nw/Button.tsx:28` is `lg: "h-[44px]"`. PLAN correctly observes this reality at line 1103 comment. The TD-20 raw-button exemption is the only way to meet SYSTEM.md §11a high-stakes 56px contract today since NwButton's `lg` lacks 56px. **Flag for separate Wave 1.1-Lite tech-debt item** (add NwButton `size="xl"` at 56px OR reconcile docs vs implementation); NOT a B-2b blocker.

### NOTE (compliant items confirmed)

- **Logo posture compliant.** `layout.tsx` puts Ross Built mark in `<header>` row top-left (line 506) per CLAUDE.md UI rules + nwrp147 TD-WE-02 disposition. `font-display` utility correctly replaces inline fontFamily (NOTE-1 fix at lines 487, 542).
- **Hardcoded color sweep clean.** NEW files use bracket-value utilities with CSS vars consistently: `bg-[var(--bg-page)]`, `text-[color:var(--text-primary)]`, `border-[var(--border-default)]`, `bg-[var(--nw-stone-blue)]`, `text-[color:var(--nw-white-sand)]`, `shadow-[var(--shadow-panel)]`. No raw hex; no legacy `cream/teal/brass/brand/status/nightwork` namespaces.
- **TD-B1abis-03 ClientCombobox polish properly uses `--shadow-panel`** (lines 1047, 1087); `--shadow-popover` confirmed absent. B-15 closure mechanically resolved.
- **NO new PATTERNS.md entry confirmed.** B-17 RESOLVED. §4h.3 (Owner portal dashboard) at PATTERNS.md:461; Document Review extension for "Draw approval detail" at PATTERNS.md:223. No 13th pattern proposed.
- **TD-20 exemption mirrors `OwnerDrawView.tsx:158-176` precedent.** PLAN's raw `<button>` block (lines 1108-1131) carries required explanatory comment, applies `font-display`, uses CSS-var tokens, asserts 56px minHeight. Matches in-tree precedent exactly.
- **Document Review extension scope clean.** OwnerDrawView already renders right-rail-with-audit-below shape; B-2b wraps in `<main>` without violating LEFT/RIGHT/BELOW canonical shape.
- **NwButton TD-20 vs lg=44px disposition (Latitude #4):** Plan-author recommendation (a) — raw `<button>` with TD-20 exemption + 56px minHeight + comment — is the design-coherent choice and matches OwnerDrawView precedent. **Accepted.** Alternative (b) "NwButton lg=44px with WCAG-minimum acknowledgment" would downgrade high-stakes contract on irreversible homeowner attestation; (a) is correct.

## Acceptable justifications offered

- **TD-20 raw-button exemption** — accepted; mirrors precedent; scoped to one element.
- **No new PATTERNS entry** — accepted; system has the patterns (§4h.3 + §2h.3); B-2b consumes them.
- **`<main data-prototype="...">` wrapper at page.tsx not inside tenant-blind primitive (BLK-3 fix)** — accepted; anchor at production-route boundary; primitives stay tenant-blind.

## Verdict

**APPROVE.** Two WARNs are textual/process-level (PATTERNS §2j.3 → §2h.3 drift; SYSTEM.md NwButton lag for Wave 1.1-Lite) and do NOT block dispatch. All 7 design-pushback scope items reconciled. No NEW BLOCKING findings.
