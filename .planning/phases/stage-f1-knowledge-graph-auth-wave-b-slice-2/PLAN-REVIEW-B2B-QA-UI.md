# Plan-Review B-2b QA — UI Reviewer

**Captured from agent inline return** (transcribed for audit-trail; full content also in consolidated qa-runs report).

**Verdict: WARNING** (no BLOCK).

## Pillar scores

| File | Layout | Tokens | Components | States | Mobile | Audit | Overall |
|---|---|---|---|---|---|---|---|
| `owner/layout.tsx` | PASS | PASS | PASS | N/A | PASS | N/A | PASS |
| `owner/[token]/page.tsx` | PASS | PASS | PASS | PASS | PASS | N/A | PASS |
| `owner/[token]/pay-apps/[id]/page.tsx` | PASS | PASS | PASS | PASS | PASS | N/A | PASS |
| `AcknowledgePayAppButton.tsx` | PASS | **FLAG** | PASS | PASS | PASS | N/A | FLAG |
| `client-combobox.tsx` | PASS | **FLAG** | PASS | PASS | N/A | N/A | FLAG |

## Findings

### BLOCK
None.

### FLAG

**client-combobox.tsx:227-228, 243-244 — raw `rgba(91,134,153,...)` colors (Token pillar)**
- 4 instances of `rgba(91,134,153,0.08)` and `rgba(91,134,153,0.04)` are raw alpha-blended values.
- `#5B8699` is `--nw-stone-blue`. Hook's HEX_HITS catches `#RRGGBB`; rgba() notation slips that regex.
- **Carry-forward from B-1a-bis era; NOT a B-2b regression.** No B-2b change introduced these.
- Correct form: `bg-[color:color-mix(in_srgb,var(--nw-stone-blue)_8%,transparent)]` OR `--bg-interactive-hover` CSS var.
- **Recommended: Wave 1.1-Lite TD-B2b-RGBA-CLEANUP** — single-line fix across 4 occurrences.

**AcknowledgePayAppButton.tsx — no explicit `rounded-*` utility (cosmetic, minor)**
- Browser default border-radius (usually 0) is inherited; consistent with Nightwork sharp-edge aesthetic but not declared.
- Low severity; document under TD for Wave 1.1-Lite.

### PASS / NOTE (compliant items confirmed)

1. **layout.tsx NOTE-1 fix confirmed.** `font-display` utility present; no inline `style={{ fontFamily }}`.
2. **layout.tsx logo top-left confirmed.** `<header>` at top with brand text left-justified.
3. **layout.tsx standalone (no auth nav-bar) confirmed.** No `NavBar` import or render.
4. **pay-apps/[id]/page.tsx BLK-3 fix confirmed.** `<main data-prototype="owner-draw">` wraps `OwnerDrawView`; primitive file untouched.
5. **owner/[token]/page.tsx BLK-3 fix confirmed.** `<main data-prototype="owner-dashboard">` wraps `OwnerDashboardView`.
6. **AcknowledgePayAppButton.tsx TD-20 exemption confirmed.** Raw `<button>` with `min-h-[56px]` utility class (NOT inline style); `data-testid="acknowledge-pay-app-button"`; exemption comment citing `OwnerDrawView:158-162` precedent.
7. **No new PATTERNS.md entry confirmed** (iter-1 SYNTHESIS B-17 resolved).
8. **client-combobox.tsx shadow fix confirmed.** `shadow-[var(--shadow-panel)]` present at line 204. Prior inline `boxShadow` resolved.
9. **OwnerDashboardView + OwnerDrawView primitives untouched.** Both source files remain as Stage 1.5c thin-wrapper extractions; B-2b page.tsx files are the sole wrappers.

## Compared to canonical
- `owner/[token]/pay-apps/[id]/page.tsx` extends Document Review pattern per PATTERNS.md §2h.3 (W-1 correction from §2j.3 applied). Does not render file preview (owner sees pay-app summary, not raw invoice scans). Extension correctly scoped.
- `owner/[token]/page.tsx` extends Dashboard pattern per PATTERNS.md §4h.3. No doc-review template mismatch.

## Newly surfaced vs plan-review iter-1
One finding: `rgba(91,134,153,...)` raw color values in `client-combobox.tsx` — pre-existing carry-forward from B-1a-bis; not a B-2b regression. Recommend Wave 1.1-Lite TD entry.

## Verdict: **WARNING (no BLOCK)**

All eight plan-specified checks PASS. One pre-existing FLAG (rgba raw colors) now confirmed in production via B-2b ship. No new blocking issues introduced by B-2b.
