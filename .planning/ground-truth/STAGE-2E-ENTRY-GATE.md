# Stage 2E Entry Gate — Draws / Pay Apps / Lien Releases (TRIMMED per nwrp279)

**Date:** 2026-06-12 (supersedes the 2026-06-12 full-scope draft committed at `a432390`)
**Authorization chain:** nwrp266 §15 (2E after 2D, post-F10) + nwrp279 ("propose the trimmed matrix … I expect $15-20 is achievable. Surface before executing.").
**F10 precondition: SATISFIED** (wired `103743e`, walk-verified nwrp273, 2C-7 cent-exact).
**Proposed ceiling:** $18.
**Status: AWAITING JAKE AUTHORIZATION — trimmed proposal, not executed.**

## Trim rationale + what is CITED instead of re-run

The read-side of the draw chain is already verified at depth: G703 line math cent-exact from source rows (PART-2C 2C-7 upgraded per nwrp274), F10 detail + print walk-verified with real data (nwrp273 e/f), stored==recomputed confirmed (2C-9 amendment), and 2D just validated the CO-side cache chains both directions. None of that re-runs — **cited as standing evidence**. What has NEVER run: any lien-release row (zero ever, any layer) and any draw MUTATION (every draw check so far was read-only). The trim is exactly Jake's hard floor plus one $1-2 closure row.

## Matrix (3 rows)

| # | Test | Method | Notes |
|---|---|---|---|
| 2E-1 | **FIRST — lien test-debt adjudication + first-ever lien flow exercise.** (a) Adjudicate the 3 pre-existing FAILs in `__tests__/lien-release-waived-at.test.ts` (bulk-route `received_at`/`waived_at` stamp guards): regression vs stale guard, against route source + git history; fix the route or re-pin the guards accordingly (test-layer fix is in-scope; route fix needs authorization if it's a regression). (b) Then exercise the lien flow fixture-side for the first time: create → mark received (stamp) → waive (stamp) → link to a draw, via the app routes as smoke users. **If the flow cannot be exercised fixture-side (route/schema gaps), that is a FINDING, not a skip** (per nwrp279). Also maps the `require_lien_release_for_draw=true` default's interaction with zero lien data. | flow driver + SQL + code-read | hard floor (1) |
| 2E-2 | **One full draw lifecycle mutation, fixture-org:** create (app path) → submit → approve → reject-path if one exists (deny/void per the draws action route's verb set — enumerate at runtime) → exact-return. Checks at each hop: status transition legality, status_history + activity_log appends, stored G702 columns behavior on a draft vs submitted draw (D3 evidence), revision behavior if surfaced by the verb set. ZZ-2E naming; smoke-org draws only; the 2 RB draft draws are READ-ONLY. | flow driver + SQL | hard floor (2) |
| 2E-3 | **Export-vs-detail parity (cheap closure):** one authed GET of `/api/draws/[id]/export` for the 2E-2 fixture draw; diff its G702 totals against the recompute the F10 detail path produces. Closes the last unexercised leg of the draw chain for ~$1-2. | one authed fetch + SQL | optional row — cut it if 2E-1 adjudication grows |

**Out of scope, already routed:** D3 staleness affordance (F6), the 4 uncoded scope rows' backfill (TD-NW-CO-LINE-ALLOCATION), N2 labeling (F6), render walks (cited above).

## Mutation discipline + halt conditions

2A/2D contract verbatim: fixture-org only, ZZ-2E naming, exact-return per cache/stored-column, IMMEDIATE HALT on cleanup failure; RB rows read-only; ceiling halt per Rule 7. 2E-1's route-fix branch (if the bulk-route stamps regressed for real) is a SURFACE-then-fix: a production code change mid-2E needs Jake's nod unless it's the test file itself.

## Exit

`PART-2E-DRAWS.md`: 3-row results, lien adjudication disposition + first-lien-flow findings, draw-mutation evidence, the before-dogfood checklist's draw-side items finalized, Stage 2F judgment inputs. Projected $12-16 against the $18 ceiling.

**Awaiting authorization to execute as trimmed.**
