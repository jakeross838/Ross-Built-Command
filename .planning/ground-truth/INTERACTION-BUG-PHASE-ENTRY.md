# Interaction-Bug Phase — entry proposal (surfaced per nwrp282 exit; NOT begun)

**Date:** 2026-06-12 · **Sequencing authority:** the stamped order (wiring ✔ done → THIS → tiering-implementation → 3-series). **Gate condition unchanged:** must complete before any W.1 listener re-enable; nothing on the dogfood path requires it, so dogfood may proceed in parallel.
**Parent TD:** TD-WB-LISTENER-PHASE1-INTERACTION (HIGH-ish, MITIGATED — listener OFF in Production since 2026-05-28; Preview retains `true` for bisect per nwrp251).
**Status: AWAITING JAKE AUTHORIZATION.**

## Scope (the TD's own D-series, unchanged)

| Step | What | Method |
|---|---|---|
| D2 | Bisect: which Phase-1 commit half of the interaction breaks under listener-on | binary search over the 6 Phase-1 task commits, Preview deploys (listener already `true` there), Rule 10 discipline (deploy-ID + cache-skip + bundle-grep premises per cell) |
| D3 | Bundle diff: listener-on vs listener-off chunks of the guilty commit | build-output diff, string-literal grep |
| D4 | Mechanism + real fix (or documented permanent listener-off posture with W.1's goals met another way) | depends on D2/D3 |

## Why now-ish (and why it can still wait for dogfood)

The mitigated state is stable — GTV ran its entire program on listener-off Production without a single auth anomaly. The risk the TD holds is OPTION VALUE: W.1's auth-state listener (session-refresh UX) stays unavailable until the mechanism is understood. Nothing in Diane's dogfood needs it; the first thing that WOULD want it is longer-session multi-tab usage patterns at nightwork.build cutover (critical path item 7).

## Proposed ceiling + rules

**$25** (bisect is ~3-4 Preview deploys with strict Rule 10 cell discipline; D3 is build tooling; D4 unknown — halt-and-surface if the fix exceeds a LOW-shape change). Autonomy: nwrp281/282 pattern verbatim (MEDIUM file-don't-halt, HIGH halt, ≤2 inline LOW fixes, cleanup/ceiling halts, exit audit). Special condition inherited from the TD: **every bisect cell verifies its premises** (deploy target, source SHA, cache state, env state) before its observation counts — this bug already produced three confounded conclusions once (Rule 10's origin).

**Awaiting authorization.**
