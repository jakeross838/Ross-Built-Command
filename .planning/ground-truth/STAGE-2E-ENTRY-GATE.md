# Stage 2E Entry Gate — Draws / Pay Apps / Lien Releases verification

**Date:** 2026-06-12
**Authorization chain:** nwrp266 §15 (2E after 2D, post-F10) + nwrp276 ("2E gate per original scope, post-F10").
**F10 precondition: SATISFIED** — pay-app detail + print wired to real data (`103743e`), walk-verified (nwrp273 e/f), 2C-7 cent-exact.
**Proposed ceiling:** $30.
**Status: AWAITING JAKE AUTHORIZATION (sequenced after 2D completes — 2E consumes 2D's CO-trigger evidence).**

## Pre-loaded findings (surfaced at gate-draft per nwrp275 condition-3 convention)

1. **`__tests__/lien-release-waived-at.test.ts` has 3 pre-existing FAILs on main** (confirmed present before AND after the nwrp276 fix wave): the bulk lien-release route's `received_at` / `waived_at` stamp regression guards. Either the bulk route regressed or the guards are stale — first 2E task adjudicates against route source + git history (it's exactly 2E's territory: lien-release flow integrity).
2. **RB has ZERO lien_releases rows** — the lien flow has never run on real data; fixture-only territory (same shape as 2A's intake finding).
3. `require_lien_release_for_draw = TRUE` is the code default (workflow-settings) — interaction between that gate and zero lien data needs mapping before Diane's first real draw.

## DB-says (2026-06-12)

2 real draft draws (Fish `b0277ee7` / Dewberry `1308...`), both stored==recomputed (nwrp273); 0 RB lien releases; smoke org carries 2 submitted draws (Alpha/Beta) for mutation targets; the 4 uncoded scope rows ($479,900) await backfill disposition (folds into TD-NW-CO-LINE-ALLOCATION at backfill time).

## Test matrix

| # | Test | Method | Mutation? |
|---|---|---|---|
| 2E-1 | Lien-release test-debt adjudication (pre-loaded #1): real regression vs stale guard; fix or re-pin | code-read + git history + targeted fix if regression | repo only |
| 2E-2 | Draw creation via wizard (app path): create ZZ-2E draw on a smoke job → line snapshot math vs computeDrawLines, cents-exact | flow driver + SQL | fixture only |
| 2E-3 | Draw lifecycle: submit → approve → lock → revision (Rev N row, never overwrite) → void; status_history/activity per hop; locked-after-submit edit rejection | flow driver | fixture only |
| 2E-4 | Lien-release flow: create → received (stamp) → waived (stamp) → linkage to draw; `require_lien_release_for_draw` gate behavior with and without releases | flow driver | fixture only |
| 2E-5 | D3 staleness: after a mutation that staleness-exposes stored G702 columns, list-vs-detail divergence becomes ACTIVE — document the trigger conditions for the F6 affordance | fixture only |
| 2E-6 | G702/G703 export route (`/api/draws/[id]/export`) renders the same numbers as the F10 print view | authed fetch + diff | no |
| 2E-7 | Jake walk row: one fixture draw through wizard → detail → print, chrome-once + L6 standard | Jake | — |

Mutation discipline: 2A's contract verbatim (fixture-org, ZZ-2E, exact-return, halt on cleanup failure). RB draws are READ-ONLY — both real draws are draft and stay untouched.

Exit: PART-2E-DRAWS.md — matrix, lien test-debt disposition, the before-dogfood checklist's draw-side items finalized (staleness affordance scope for F6, backfill interaction), Stage 2F judgment inputs.
