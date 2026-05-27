# Planner Cross-Review iter-2 — internal-launch-hide PLAN.md (post-nwrp232 revision)

**Reviewer:** planner (cross-review lens; independent of original plan-author + revision-author)
**Date:** 2026-05-27
**Plan reviewed:** `.planning/phases/internal-launch-hide/internal-launch-PLAN.md` (1607 lines, post-revision)
**Iter-1 reference:** `.planning/phases/internal-launch-hide/PLAN-REVIEW-planner.md` (1 CRITICAL + 4 WARNINGS + 2 OQs)
**Iter-1 verdict:** WARNING (CRITICAL contradiction + 3 minor warnings)

## Verdict: APPROVE

All iter-1 findings demonstrably closed; previously-PASS items unchanged; no new issues introduced by the revision pass.

---

## Per-check findings

### CHECK 1 — CRITICAL `/people/vendors` reachability contradiction — RESOLVED — PASS

**Evidence:**
- Task 5.3 `ALL_PEOPLE_SECTIONS` Vendors entry at PLAN.md line 1085: `live: false`, `wave: "Wave-2"`, with rationale comment "hidden per nwrp232 — Caldwell-fixture-mount; un-hides at Wave-2 real-DB swap"
- must_have line 51 reworded to "Section-overview Card grid on /people is unreachable in flag-OFF state (middleware 404 hides the section per nwrp232 OQ #3 path (b)); filter logic retained as defensive future-state..."
- Task 6 smoke #4 at line 1358 still asserts `/people/vendors → 404` (consistent with hidden state)
- Grep `Vendors.*live: true` returns ZERO matches across PLAN.md
- Grep `/people shows` returns ZERO matches
- Filter logic at line 1092: `const PEOPLE_SECTIONS = ALL_PEOPLE_SECTIONS.filter((s) => s.live)` — with all 5 entries `live: false`, results in empty array (defensive future-state)

### CHECK 2 — OQ #3 PEOPLE path (b) hardcoded — PASS

**Task 1 — feature-flags.ts helper:**
- `FeatureFlagName` union lines 317-323: exactly 6 members (no `"PEOPLE"`)
- `FLAG_ENV_VALUE` Record lines 329-336: 6 entries (no `PEOPLE:` line)
- AC line 408: `"FLAG_ENV_VALUE Record contains 6 static process.env.NEXT_PUBLIC_FEATURE_<NAME> reads (one per flag; PEOPLE NOT present)"`
- AC line 410: `"File contains ZERO instances of PEOPLE"`
- Negative grep verify line 395: `! grep -E '"PEOPLE"|PEOPLE:\s*process\.env\.NEXT_PUBLIC_FEATURE_PEOPLE' src/lib/feature-flags.ts`

**Task 2 — nav-bar.tsx:**
- Action line 471: `if (item.key === "people") return false;` with rationale comment
- "Don't" guidance line 497: forbids `isFeatureEnabled("PEOPLE")` (TS compile would fail)
- Negative grep line 518: `! grep -E 'isFeatureEnabled\("PEOPLE"\)' src/components/nav-bar.tsx`
- AC line 544: `"people item dropped via hardcoded if (item.key === "people") return false; (NOT via isFeatureEnabled — per nwrp232 OQ #3 path (b))"`

**Task 3 — middleware.ts:**
- Action lines 676-678: `if (pathname === "/people" || pathname.startsWith("/people/")) { return respond404(); }`
- Negative grep line 762: `! grep -E 'isFeatureEnabled\("PEOPLE"\)' src/middleware.ts`
- AC line 808: hardcoded gate enforced

**Task 5.3 — people/page.tsx:**
- Action line 1069: "Do NOT add an import for `isFeatureEnabled`"
- Filter line 1092: simple `.live` predicate
- Negative grep lines 1226 + 1230: no import, no PEOPLE call

**AC count adjustments coherent:**
- Mechanical AC line 1551: `isFeatureEnabled(` returns ≥10 matches (1+3+6+4 = 14)
- Mechanical AC line 1552: `NEXT_PUBLIC_FEATURE_` returns exactly 6
- Mechanical AC line 1554: negative-grep `! grep -rEn 'isFeatureEnabled\("PEOPLE"\)' src/`

### CHECK 3 — OQ #1 BUNDLE Schedule under FINANCIALS_F1_VIEWS — PASS

- `<dispatch_blocker>` table line 134: Q1 marked RESOLVED with Jake's quote
- Plan body OQ #1 line 1536: marked RESOLVED
- Task 3 FINANCIALS_F1_VIEWS gate lines 720-735: includes schedule regex inside the same flag block
- must_have line 47: explicit bundling annotation
- AC line 813: `"schedule BUNDLED under this flag per nwrp232 OQ #1 disposition"`

No separate `_SCHEDULE` flag anywhere.

### CHECK 4 — All 4 warnings folded — PASS

**W-1 smoke #3 path correction:** Task 6 smoke #3 line 1346 posts to real route `/api/owner-portal/admin/revoke-token` asserts HTTP 404; positive grep verify line 1454; negative grep verify line 1458; realistic body shape specified.

**W-2 depends_on annotations:** all 6 tasks have explicit annotations matching spec (Task 1 `[]`, Task 2 `[1]`, Task 3 `[1]`, Task 4 `[]`, Task 5 `[1]`, Task 6 `[1,2,3,4,5]`).

**W-3 /company Overview reword:** must_have line 52 same shape as 51; Task 5.4 Overview entry line 1118 `live: false`, `wave: "Wave-2/F4"`; AC line 1309 explicit reference to nwrp232 W-3; positive grep verify line 1275.

**W-4 ceiling 25→50:** Frontmatter line 30 `halt_gate_ceiling: 50` with full audit-trail comment; per_plan_halt 50; halt-fields per Rule 7.

### CHECK 5 — No new issues + previously-PASS items unchanged — PASS

**Must_haves:** 23 entries; reworded /people + /company entries have corresponding Task 5.3 + 5.4 filter logic implementations.

**D-01..D-06 still implemented:** D-01 (6 granular flags) ✓ D-02 (Vercel `""` value) ✓ D-03 (HIDE /people/clients via hardcoded gate) ✓ D-04 (canonical idiom with mechanical AC) ✓ D-05 (middleware insertion point verified) ✓ D-06 (per-job-tabs static removal; no helper import) ✓

**Threat model STRIDE:** 10 entries complete; LOW severity unchanged; T-ilh-01/07/09 updated to note PEOPLE not in env-var surface.

**Frontmatter compliance:** all required fields present; halt-gate fields updated correctly.

**No scope creep:** revisions only removed PEOPLE from union/Record + adjusted live flags + corrected smoke #3 + added depends_on.

**Plan structure intact:** 6 tasks; all required XML blocks; OQ #2 + #4 retained as soft halts.

## New issues from revision pass: NONE

## Specific recommendation

**APPROVE plan for /nx dispatch.**

Iter-1 CRITICAL `/people/vendors` reachability fully resolved; all 4 warnings folded with audit-trail comments; OQ #3 PEOPLE path (b) consistently applied across 4 task surfaces with compile-time TypeScript guarantee + grep-time mechanical guarantee; OQ #1 Schedule bundling confirmed in code; frontmatter ceiling updated correctly.

OQ #2 (Owner Portal 404 vs 403) + OQ #4 (empty-grid UX) retained as "FLAG FOR JAKE: confirm. (Not blocking)" — recommendations awaiting confirmation, not dispatch blockers.
