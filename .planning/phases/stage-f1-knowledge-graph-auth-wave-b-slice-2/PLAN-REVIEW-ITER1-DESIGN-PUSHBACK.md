# Design-pushback plan-review iter-1 — B-2

**Reviewer:** nightwork-design-pushback-agent
**Date:** 2026-05-20
**Verdict:** **REVISE** (4 CRITICAL + 4 WARNING + 5 NOTE)

Disk-evidence captured retroactively by orchestrator (agent lacked Write tool; returned inline only). Full findings recorded inline; consolidated into `PLAN-REVIEW-ITER1-SYNTHESIS.md`.

## CRITICAL findings

**C-1 — OwnerDrawView already contains inline-style TD-20 boundary exemption (lines 163-176).** PLAN Task 4 proposes adding a SECOND 56px CTA ("Acknowledge receipt") to the same file. Plan does NOT specify whether the new CTA: (a) extends the TD-20 exemption with matching comment, or (b) introduces NwButton xl=56px size variant. Post-edit hook will fire on option (a) without explicit exemption comment. **Pick one; document in Task 4.**

**C-2 — `--shadow-popover` token does NOT exist in codebase.** PLAN Task 5 TD-B1abis-03 polish proposes `shadow-[var(--shadow-popover)]` — verified via grep: zero hits in `src/`. Only `--shadow-panel` + `--shadow-hover` declared (colors_and_type.css:61). PLAN's fallback "use cost-code-combobox idiom" is also unsound (cost-code-combobox.tsx uses raw `shadow-2xl`, not a token). **Recommend option (c): use `shadow-[var(--shadow-panel)]` — closest existing token.**

**C-3 — No new PATTERNS.md "Owner Status View" entry needed.** PLAN proposes new pattern entry + TD-B2-01. But PATTERNS.md §4h.3 explicitly documents "Owner portal dashboard … job-scoped KPIs for the owner role + draw approval action card + payment history" as instance of Dashboard pattern. PATTERNS.md §2j.3 explicitly documents "Draw approval detail (planned) — extends Document Review for owner sign-off on AIA pay applications." **Inventing 13th pattern violates "Invoice review is gold standard; do not invent one-off layouts." Cite §4h.3 + §2j.3 instead; drop TD-B2-01.**

**C-4 — "Approve & sign" vs "Acknowledge receipt" label conflict on OwnerDrawView.** Existing prototype button labeled "Approve & sign" (line 174-175) signals approval workflow. PLAN §4.b says homeowner action is `acknowledged` (audit-only, NO state mutation). Mismatch: either rename prototype button to "Acknowledge receipt" OR gate visibility via `showLegacyApproveButton?: boolean` prop. **Pick one; document.**

## WARNING findings

- W-1: Logo top-left "every authenticated surface" rule — anon homeowner extension undocumented in CLAUDE.md
- W-2: `design-system-scope` wrap placement (layout vs page) not specified
- W-3: AC-B2-14 viewports test ≥412px but not the claimed 320px floor — add 320px reference viewport
- W-4: `design-system-scope` activation depends on root layout `design-system.css` import not being auth-gated

## NOTE findings

- Construction-domain transparency correctly preserved
- OwnerDashboardView genuinely tenant-blind (verified line 36)
- Slate type system + JetBrains Mono inherited correctly
- Touch target compliance ≥44px / ≥56px correctly stated
- `Referrer-Policy: no-referrer` good defense (verify implementation at execute time)

## Recommendation on pattern reuse

**STRONG: do NOT add new "Owner Status View" entry.** Amend B-2 to:
1. Drop proposed new pattern entry + TD-B2-01
2. Cite PATTERNS.md §4h.3 (Dashboard) for `/owner/{token}` index
3. Cite PATTERNS.md §2j.3 (Document Review) for `/owner/{token}/pay-apps/{id}`
4. Add ACs verifying conformance to existing patterns

## Verdict

REVISE. 4 CRITICAL items need plan amendments before /nx. Structural decisions are mostly right; specifics need surfacing.
