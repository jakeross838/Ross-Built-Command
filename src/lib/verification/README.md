# Verification module

Foundation for the 3-layer verification pipeline (stage-1.5c-verification-harness).

**Status:** Foundation contracts shipped Plan 1. Plans 2/3/4 import `Layer1Context`, `Layer2Context`, `Layer3Context` from `types.ts` (per ITER-1 ARCH-CRIT-3 amendment).

## Layer responsibility map

| Layer | Categories handled | Implementation plan |
|---|---|---|
| 1 — static | mechanical, dom | Plan 2 — wraps build/typecheck/hooks/privacy + DOM assertions + route-status |
| 2 — standards | behavioral | Plan 3 — JSON rules library + verifyFn registry |
| 3 — vision | visual, semantic | Plan 4 — Claude vision API against PLAN-file criteria |

## File map

- `types.ts` — type contracts. Every other module depends on these.
- `registry.ts` — verifyFn registry (Plan 3 populates).
- `idempotency.ts` — sha256(commit_sha + criterion_hash) cache. Plan 4 vision reads/writes; Plan 11 self-tests rerun-on-same-commit no-op.
- `state-machine.ts` — loop state machine. Plan 8b consumes; Plan 11 self-tests transitions.
- `index.ts` — barrel re-export.
- `criteria-loader.test.md` — smoke-test scaffold (per iter-1 ARCH-CRIT-2). Plan 11 self-test executes this against Plan 5's criteria-loader.ts.

## Standards rule contract

A Layer 2 rule = JSON file at `.planning/verification/standards/<domain>/<rule>.json` matching `_schema.json` + a registered `verifyFn` in this module's registry. Adding a rule:

1. Drop `<rule>.json` per the schema (cite `$schema`, `id`, `verifyFn` ID, etc.).
2. Add `<rule>.ts` next to it that calls `registerVerifyFn("<verifyFnId>", async (ctx) => { ... })`.
3. Import the new `<rule>.ts` from a registry-load entry point (Plan 3 wires this).

That's it. No framework code changes per rule. Per D-02 forward-extensibility contract.

## Idempotency contract

Per D-22 + iter-1 C4 + D-30: `idempotency_key = sha256(commit_sha + canonical_criterion_hash)` where `canonical_criterion_hash = sha256({phase, plan, category, text, org_id})`. `org_id` defaults to `FIXTURE_ORG_ID` (`"fixture-harness-org"`); Wave 1.1+ tenant-aware. Stored at `.planning/verification/runs/[phase]/[commit]/idempotency.json` (gitignored).

**Why org_id in the hash:** even though today the harness runs against a single fixture org, the cache key shape must be tenant-bounded BY CONSTRUCTION. When Wave 1.1+ adds per-tenant preview verification, a cached PASS verdict from tenant A cannot be reused for tenant B with the same criterion text. Tenant safety is a SHAPE invariant, not a runtime check.

- Layer 3 (vision): cache hit → skip Anthropic API call (saves money + matches D-22 contract).
- Layer 1/2: cheap to re-run; idempotency only protects spend.

## Loop state machine

Per D-05/D-06/D-07. See `state-machine.ts` for the full graph + comments.

- Max iterations: 3 (additive within current execute iteration; D-06).
- Halt-for-Jake: iter-3 reached OR Layer 3 confidence < 0.7 (D-07).
- `MAX_ITERATIONS = 3` is hard-coded per iter-1 ARCH-CRIT-1 spec; Plan 8b owns `runLoop`, Plan 5 `runHarness` does not drive transitions.
- `LoopState` includes explicit `"paused-for-fix"` value (Plan 8b runs gsd-fix-executor in this state).

## Don't

- Don't bypass `registerVerifyFn` — the registry is the contract.
- Don't store idempotency cache outside the runs/ tree — it's gitignored on purpose.
- Don't add a 6th standards domain without a CONTEXT.md addition + plan-review approval.
- Don't drive state-machine transitions from anywhere except Plan 8b's `runLoop`. Plan 5's `runHarness` returns layer results; Plan 8b composes them through `transition()`.

## Plan-review watchpoints

- #1 — Registry pattern + standards schema (Task 1 + Task 2 of Plan 1; Plan 3 first real use).
- #2 — Loop state machine bounded (Task 1 of Plan 1; Plan 8b implementation).
- #7 — Idempotency contract precise (Task 1 of Plan 1; Plan 4 cache; Plan 11 rerun-no-op test).

## Iter-1 plan-review amendments (2026-05-06)

This module's foundation contracts now include:

- **`Layer1Context`, `Layer2Context`, `Layer3Context`** in `types.ts` (per ARCH-CRIT-3) — Plans 2/3/4 import, not define locally. Wave 1 zero-overlap claim is now genuine.
- **`FIXTURE_ORG_ID` constant** in `types.ts` (per C4 + D-30) — single source of truth for the fixture org slug; `canonicalCriterionHash` includes `org_id` parameter (default `FIXTURE_ORG_ID`).
- **`"paused-for-fix"`** explicit state in `LoopState` union (per ARCH-CRIT-1 + Plan 8b LoopOutcome.final_state spec).
- **`criteria-loader.test.md`** scaffold (per ARCH-CRIT-2) — Plan 11 self-test asserts ≥40 non-N/A criteria from this phase's 12 PLAN files; catches regex YAML parser regressions.
- **`supabase/migrations/00092_verification_harness_fixture_org.sql`** (per C1) — seeds the fixture org Plan 5 orchestrator authenticates against; idempotent. See migration header for chicken-and-egg note about first-time auth user creation.

The auth-strategy implementation lives in Plan 5 (orchestrator); this plan ships the contracts + migration that Plan 5 consumes.
