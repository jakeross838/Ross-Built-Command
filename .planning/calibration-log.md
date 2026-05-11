# Calibration log

Per-phase retrospective entries. Append-only. Written by `nightwork-custodian` at post-ship sweep per D-13 in `.planning/phases/stage-1.5c-verification-harness/01.5-c-verification-harness-CONTEXT.md`.

**Schema:** `.planning/calibration-log-schema.md` (D-14 / Plan-review watchpoint #4).

**Reader:** `/np` orchestrator references the most recent 3-5 entries when scoping a new phase. Per D-27 dynamic prompting, orchestrator adjusts parallelism / prompt density / iter budget per the heuristics in the schema.

**Format:** JSON front-matter (machine-readable) + markdown body (human-readable). Both required. See schema for field list.

**Writer rules:** custodian extracts from PLAN SUMMARY.md / qa-runs / verification reports / lessons.md. No speculation beyond extractable data.

---

## stage-1.5c-verification-harness (PENDING SHIP)

```yaml
---
phase: stage-1.5c-verification-harness
shipped_at: <pending>
wave_count: 8
parallelism_used: 3
plan_count: 12
plan_iter_counts:
  "01": 0
  "02": 0
  "03": 0
  "04": 0
  "05": 0
  "06": 0
  "07": 0
  "08a": 0
  "08b": 0
  "09": 0
  "10": 0
  "11": 0
harness_runs: 0
harness_pass_rate: 0.0
harness_iter_counts:
  iter_1_resolved: 0
  iter_2_resolved: 0
  iter_3_resolved: 0
  iter_3_halt_for_jake: 0
ambiguous_vision_halts: 0
vision_cost_usd: 0
vision_cache_hit_rate: 0.0
prompt_density_signal: 3
drift_cases: 0
process_discipline_violations: 0
---
```

## What worked

(pending ship — custodian fills from QA report + lessons.md after Plan 11 self-test PASSes and Jake merges to main)

## What didn't

(pending ship)

## Adjustment for next phase

(pending ship)

## Cost notes

(pending ship — Plan 11 self-test will surface first vision_cost_usd data)

## Process notes

- 1.5c IA Plan 1 dev-server-kill incident (2026-05-05) is the carry-forward process discipline lesson — every executor brief in this phase reinforced "Never kill running processes" rule.

---

## stage-1.5c-information-architecture Block N+1 follow-ups (post-2026-05-11)

### useCurrentRole onAuthStateChange listener

**What**: Modify `src/hooks/use-current-role.ts` to subscribe to `supabase.auth.onAuthStateChange` for SIGNED_IN events in addition to the existing mount-time `getUser()` call. Would also benefit `src/components/nav-bar.tsx`'s profile fetch (same pattern).

**Why**: Production improvement that would resolve AC-1-8-class harness-incompatible criteria (client-side hook reads auth state with one-shot pattern + no listener; harness-injected sessions land too late to influence the hook before render). Real users would also benefit (cross-tab login sync, no stale-empty-session edge cases during slow networks).

**Effort**: ~30 min, including hook diff + cleanup of any cascading callsites + harness validation re-run.

**Trigger condition**: Pairs with F1 schema work where role-evaluation logic gets touched (will be modifying these hooks anyway). Could also land as a stand-alone polish PR if a future harness gap surfaces.

**Diagnostic provenance**: stage-1.5c-vh Block N+1 surfaced via Y.1.D race-confirmation diagnostic (nwrp86 W.1 validation). Diagnostic chain: nwrp79..nwrp87. Cookie + token + Supabase API all verified working in headless; only the hook's one-shot pattern is the gap.

**Estimated value**: removes 1 known harness limitation entirely; enables future Layer 3 visual/semantic criteria against any auth-gated client-rendered UI.
