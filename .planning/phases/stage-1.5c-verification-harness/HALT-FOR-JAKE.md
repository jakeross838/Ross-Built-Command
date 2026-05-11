# HALT FOR JAKE — pre-flight investigation surfaces deeper signal than AC text refinement

**Halt timestamp:** 2026-05-09T20:05Z
**Triggering directive:** nwrp70 (Option A — re-author ACs 130/131/139)
**Stop condition:** "Uncertainty about correctness on a non-trivial decision" (nwrp70 PART 5)

---

## What surfaced during pre-flight investigation

Before re-authoring the three ACs, I inspected the actual source files for:
- The target route nwrp70 directed AC-139 to (`/design-system/prototypes/invoices/inv-caldwell-001`)
- The `#5B8699` token usage across the codebase
- The typography page's tracking-eyebrow rendering

Three findings change the calculus.

### Finding 1 — `/design-system/prototypes/invoices/inv-caldwell-001` does NOT exist on this branch

```bash
$ find src/app/design-system -type d -name prototypes
(no output)

$ find src/app -path "*prototype*"
(no output)

$ find src/app -iname "*caldwell*"
(no output)

$ ls .planning/phases/stage-1.5b-prototype-gallery/
01.5-1-fixture-extraction-PLAN.md
01.5-2-invoice-draw-vendors-PLAN.md   ← this would ship the route
01.5-3-budget-documents-PLAN.md
...
```

The prototype route lives on a parallel branch `phase/1.5-b-prototype-gallery` which has NOT merged to `main` yet. On the current `phase/1.5-c-verification-harness` branch, `/design-system/prototypes/*` is a 404. The Stage 1.5b plan files anticipate the route but it isn't built.

**Consequence:** if I re-target AC-139 at this route per nwrp70's literal instruction, the harness will navigate to 404 → vision reports "404 page" → regressive signal vs. the substantive WI-004 verdict we just got.

This was the same finding I surfaced in nwrp65 ("the prototype routes Jake mentioned don't exist") — pre-emptively pointed AC-139 at `/design-system/patterns` instead. nwrp70 reiterates the original (non-existent) route.

### Finding 2 — `#5B8699` IS canonical Stone Blue and IS rendered on palette page (vision missed it via viewport fold)

```bash
$ grep -n "5B8699\|5b8699" src/lib/branding/constants.ts src/app/colors_and_type.css \
                          src/app/design-system/palette/page.tsx .planning/design/CHOSEN-DIRECTION.md

src/lib/branding/constants.ts:25:    stoneBlue: HASH + "5B8699",
src/app/colors_and_type.css:16:     --nw-stone-blue:  #5B8699;
src/app/design-system/palette/page.tsx:63: { name: "stone-blue", hex: HASH + "5B8699",
                                            twClass: "nw-stone-blue",
                                            role: "Stone-blue; brand accent / focus ring" },
.planning/design/CHOSEN-DIRECTION.md:12:    - `--nw-stone-blue: #5B8699`
```

`#5B8699` IS the canonical Nightwork Stone Blue brand accent, defined in 4 authoritative locations, and IS in the palette page source at line 63 as one of the rendered swatches.

Vision saw `#3B5864 (slate-tile)`, `#1A2830 (slate-deep)`, `#132028 (slate-deeper)` — slate variants further down the swatch list. **It missed `#5B8699` because the Layer 3 runner uses 1280×800 viewport with `fullPage: false`** (`src/lib/verification/layer3/runner.ts:189` — `await page.screenshot({ path: screenshotPath, fullPage: false });`). The stone-blue swatch is below the 800px fold on the palette page.

**So neither the criterion nor the page is wrong.** The criterion text correctly cites `#5B8699` (the canonical Stone Blue). The page correctly renders `#5B8699` (line 63 of palette page). **The Layer 3 viewport configuration is the limiting factor.**

### Finding 3 — `0.14em` IS rendered literally on typography page (same viewport-fold issue)

`src/app/design-system/typography/page.tsx` line 69 + lines 240-292 — the TRACKING_TOKENS section renders `{t.value}` (literally `"0.14em"`) for each tracking token in its own card. But it's **SECTION 2** of the typography page (after the type-scale SECTION 1). At 1280×800 with `fullPage: false`, vision only sees Section 1 (type scale) — which is what its reasoning describes: *"only size and font family are shown."*

Section 1 (type scale) and Section 2 (tracking) are both real. Vision's report is accurate for what it can see; it just can't see Section 2.

**Same root cause as Finding 2.** Criterion is correct. Page is correct. Viewport fold is hiding content from vision.

---

## Why this is the wrong fight at the AC-text level

The proposed nwrp70 re-authorings address symptoms:
- "Update AC-130 to expect `#3B5864` instead of `#5B8699`" — incorrect, the page DOES render `#5B8699`
- "Update AC-131 to accept derived treatments instead of literal `0.14em`" — incorrect, the page DOES render `0.14em` literally
- "Re-target AC-139 to `/design-system/prototypes/invoices/inv-caldwell-001`" — that route doesn't exist; would regress to 404

The **underlying issue** is that Layer 3's screenshot captures only the first 800px of any page. Long-scroll pages (palette, typography) inevitably lose content below the fold. ACs that test below-the-fold content will FAIL not because the page is wrong but because vision can't see it.

---

## Three candidate paths, ranked

### Path A (recommended) — Fix Layer 3 fullPage screenshots; keep current AC text

**Single-line change** in `src/lib/verification/layer3/runner.ts:189`:

```ts
- await page.screenshot({ path: screenshotPath, fullPage: false });
+ await page.screenshot({ path: screenshotPath, fullPage: true });
```

CATEGORY-A authorized scope (touches `src/lib/verification/`, infrastructure-level harness improvement). After this fix:
- AC-130 should PASS (vision sees full palette including `#5B8699` swatch)
- AC-131 should PASS (vision sees both type-scale AND tracking sections, including literal `0.14em`)
- AC-139 (WI-004) still surfaces its substantive verdict from the last run — patterns page is documentation, not a live multi-row invoice. We already have that signal; no need to re-target.

Estimated outcome of next run with Path A: PASS=66 / FAIL=1 / SKIP=1 (only AC-139 / WI-004 remains as the substantive "surface gap" finding Jake reviews).

Caveat: fullPage screenshots are larger → ~30% more vision tokens per call → cost rises from ~$0.0066 to ~$0.0086 per Layer 3 call (~$0.03 cumulative for 4 ACs vs. current ~$0.027). Still negligible against $5 ceiling.

Tradeoff: vision may have lower precision on large screenshots (more pixels, more content to parse). But the alternative — missing all below-the-fold content — is strictly worse for design-system pages.

### Path B — Refine criteria to scope to first-viewport content only

Re-author AC-130 to say *"Page /design-system/palette: visible-on-load swatches include slate-tile (#3B5864) and slate-deep (#1A2830)"* (matches what vision actually sees in the viewport). Same for AC-131 + AC-139.

CATEGORY-D phase-spec hygiene. Doesn't change runner behavior.

Drawback: this makes the harness systematically blind to below-the-fold content. Future ACs targeting features rendered farther down the page will all FAIL. Path B is a workaround, not a fix.

### Path C — Wait for Stage 1.5b prototype-gallery to merge, then re-target AC-139

Don't touch AC-130 / AC-131 (keep current FAILs as known viewport-fold limitations); re-target AC-139 when `/design-system/prototypes/invoices/inv-caldwell-001` actually exists on main.

CATEGORY-X scheduling decision — out of nwrp envelope. Defers WI-004 verification until Stage 1.5b ships.

Drawback: leaves the harness in an "mostly working but with known-FAIL artifacts" state through Wave 4 and beyond.

### My recommendation: **Path A**

Path A is the only one that addresses the underlying issue. The `fullPage: true` change is small, autonomously-authorized under CATEGORY-A scope (verification module code), and unblocks all three ACs in one shot. The cost increase is negligible.

If Path A confirms AC-130 / AC-131 PASS on next run, the harness is in the cleanest state achievable on this branch — only AC-139 (WI-004) remains as a substantive product finding (patterns page documentation vs. live invoice surface), which is the harness doing its job.

After Path A confirms clean → halt for Jake authorization to dispatch Wave 4.

---

## Context Jake needs to decide

- **Cumulative vision spend:** $0.388 across 8 productive runs. Well under $5 ceiling.
- **WI-004 verdict is already captured** (FAIL conf 0.9 with substantive reasoning) from run #25610086532. Re-running with Path A doesn't re-evaluate AC-139's verdict against the patterns page — it'd hit the idempotency cache for same (commit, criterion).
- **If I push a CATEGORY-A runner.ts edit, the new commit invalidates the idempotency cache for all Layer 3 criteria** — they all re-run. Cost ≈ $0.035 (4 calls × ~$0.0086 each with fullPage screenshots).
- **All AC text is currently correct.** The criterion authoring isn't the bug.

---

## Sub-outcomes if Path A authorized

After single-line fullPage change + push:

- **A1 (most likely):** AC-130 + AC-131 PASS at high confidence; AC-139 still FAILs with same substantive WI-004 reasoning (patterns page = documentation). PASS=66 / FAIL=1 / SKIP=1. Halt for Wave 4 dispatch authorization.
- **A2 (less likely):** AC-130 or AC-131 still FAIL even with fullPage — would indicate criterion really is more precise than what the page renders (e.g., page renders `#5B8699` swatch but vision misreads its hex code). HALT for further refinement.
- **A3 (unlikely):** Vision precision drops on full-page screenshots and one of the previously-PASSING ACs (e.g., AC-08a-138 Document Review pattern) regresses. HALT for diagnostic.

---

## Suggested next message

> "Path A authorized. Apply fullPage:true to runner.ts; push; observe new run; surface verdicts."

OR

> "Path B authorized (don't touch runner.ts). Refine each AC to scope to first-viewport content. Surface what changes."

OR

> "Hold all three ACs for Stage 1.5b merge; refine AC-139 only after that, run, halt for Wave 4 dispatch."
