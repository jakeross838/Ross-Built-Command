# Tiering-Implementation RE-BASELINE (per nwrp284 — surfaced, NOT executed)

**Date:** 2026-06-12 · **Cap:** $12 (actual ~$8-10) · **Re-baselines:** the parked DRAFT EXPANDED-SCOPE (`acbfa06`, 2026-05-27) against six weeks of ground change. **Execution authorization follows on this refresh — nothing dispatched.**

## (1) Refreshed scope — pre-built / moot / surviving

### Pre-built and production-exercised since the park

| Parked deliverable | Now |
|---|---|
| SmokeAuthHelper (`scripts/lib/smoke-auth.mjs`, touch point 6, AC-8/9, design §3) | **~70% exists as three production-exercised increments**: `scripts/smoke-auth-probe.mjs` (login, 9/9 validated), `scripts/zz-2a-flow-driver.mjs` + `scripts/zz-authed-fetch.mjs` (cookie-jar authed fetch — `getAuthCookies`/`withAuthedContext` in working form), `tmp/zz-listener-app-cell.mjs` (full Playwright authed browser cells incl. fresh-sign-in state control). Remaining work: CONSOLIDATION into the design's API surface, not creation. The §6 risk row "SmokeAuthHelper has subtle bugs… not caught until Phase 2" is retired — the primitives ran against production across 2A/2D/2E and the interaction-bug phase. |
| §9 sanity smoke vs harness-fixture-org | Effectively done — the increments exercised real auth/cookies/queries against production fixture-org repeatedly. AC re-targets to "the consolidated lib passes the same cells." |
| Verification standards inputs | The design's §10 referenced L1+L2; **L4-L9 now exist** (4-assertion hide smoke, external-route heuristic, chrome-once, re-export resolution, DB-side enumeration, state-variable truth tables) — the tier verification standards inherit them for free. |
| Bootstrap evidence | **~10 phases ran under manual/bootstrap gates without a discipline miss** (GTV stages + fix waves + wiring + interaction-bug; ceilings $5-55, all held; halt gates fired correctly twice). The §6 "MEDIUM ceiling too tight" risk recalibrates against this actuals base. |

### Moot parked dispositions

- **PA-4 (smoke-runner seeding) — MOOT**, and its §6.2 re-tier WARNING with it: the 9 smoke users exist (smoke-seed lifecycle), probe-validated 9/9. No migration, no schema touch, no HIGH re-tier question. The recommended path (b) happened naturally.
- **§7 `.mjs` naming — MOOT-AS-DECIDED**: all increments are `.mjs` in practice.
- **§12 Q2 (γ preemptive bump $100→$150) — DIES**: see ceiling below; no bump needed.
- **§13 "next phase = phase-2-pdf-preview-spike" — STALE**: superseded by the stamped sequence + the §(4) proposal below.
- **CLAUDE.md "Rule 10 (severity tiering)" — STALE NUMBERING**: Workflow Posture **already has a Rule 10** (runtime truth-table, added 2026-05-28). The tiering rule ships as **Rule 11**. (Same staleness class as the closure-condition mapping below.)

### Surviving dispositions — re-surfaced for Jake (3, not 12)

- **PA-1** (severity-rationale auto-populate from signal matches + edit-before-confirm) — recommendation stands.
- **PA-2** (`tier-config.json` as single source of truth vs inline) — recommendation stands; the §6 missing-config risk mitigation stands with it.
- **PA-3** (`mid-execute-halts.jsonl` append-on-event capture) — recommendation stands; AC-13's no-stub rule stands.

Plus two affirmations carried verbatim: **§2 closed-seam contract** (no legacy flag, old logic DELETED, atomic-or-marked cutover) and **§8 bootstrap reviewer-set posture** (this phase runs under the existing 8-reviewer set; no future phase does).

## (2) Re-proposed ceiling — honest number

Parked estimate $103-145 against a $100 ceiling → recommended preemptive bump to $150. Re-based: SmokeAuthHelper is consolidation (−$8-12 of execute), PA-4/migration path gone (−DB-reviewer conditional, −migration work), the design doc promotion was already done, and execute-stage costs across the last ten bootstrap phases ran consistently UNDER the parked per-stage guesses. The bootstrap-exception plan-review (8 reviewers) remains the cost driver and is unchanged. **Honest estimate: $80-105. Proposed ceiling: $100 (MEDIUM, unchanged) — NO preemptive bump; Rule 7a/7c handle an overrun the normal way (halt for Jake at >$100 projection, one bump available).** The γ question from §12 is withdrawn.

## (3) Closure-condition reconciliation (substance verbatim, numbering mapped)

nwrp233 / TD-PLANNING-PIPELINE-SEVERITY-TIERING closure requires: **(i)** implementation SHIPPED (custodian-marked in MASTER-PLAN §9) — unchanged; **(ii)** "first phase under new tier completes" — the parked text binds this to "Phase 2 (UI-FINALIZE) / phase-2-pdf-preview-spike," both stale; **maps to: the F6-family phase (§4 below) as the first tiered dispatch**; **(iii)** REVIEW-1 (PIPELINE-TIERING-REVIEW-1.md) after 4 phases under the new pipeline — unchanged; the 4 will naturally be F6-family + the early 3-series/dogfood-fix phases. **The BLOCKING gate on 3-series dispatch is preserved verbatim** — unchanged condition, unchanged teeth.

## (4) Sequencing proposal + deadline math (pressure-tested)

**Proposal: F6-family runs as the FIRST phase dispatched under the new tiering.** Scope: CO line-allocation authoring (TD-NW-CO-LINE-ALLOCATION workstream 1, trigger validated 2D-1), lien create/upload path + gate wiring (TD-NW-LIEN-CREATE), draw staleness affordance (D3), N2 base/with-fee labeling. Likely MEDIUM tier (financial-adjacent UI + one or two small migrations possible for upload metadata — if a schema touch fires §6.2, the re-tier mechanism gets its first real exercise, which is exactly what closure condition (ii) wants to observe).

**Deadline math:** dogfood START ~1-2 weeks out (human gates only — proceeds in PARALLEL with everything below, zero dependency). First real draw ~2-4 weeks after start → **first-draw deadline ≈ week 3-6 from today.** Path: re-baseline approval (now) → tiering-implementation executes (~1-2 days, $80-105) → F6-family dispatches first-tiered (~3-5 days, est. $60-90 at MEDIUM) → **F6-family lands ≈ week 1.5-2.5 — clears the first-draw deadline with ~1-3.5 weeks of margin**, and the FIRST-DRAW gates that are human-side (item-8 application, 72-CO backfill data entry, Diane's reconciliation) overlap that window. The 72-CO backfill EXECUTION (gated on 2D ✔ + Jake's stamp) ideally lands right after F6's authoring ships so backfilled rows ride the real authoring path. **Recommend: stamp the proposal.**

---

**Awaiting Jake:** PA-1/2/3 confirmations + §2/§8 affirmations + the $100-no-bump ceiling + the F6-family-first stamp → then "execute tiering-implementation" authorizes dispatch.
