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
- `_browser.ts` — chromium launch args helper (Plan 4 extraction). Plan 1/2/4 use.
- `index.ts` — barrel re-export.
- **Plan 5 deliverables (orchestrator + integration):**
  - `vercel-discovery.ts` — 4-tier preview URL discovery (REST API primary; CLI / pattern fallbacks; fail-loudly).
  - `criteria-loader.ts` — parses PLAN `<criteria>` yaml blocks → flat `VerificationCriterion[]`. SEC-HIGH-2 sanitization on each criterion text.
  - `auth-strategy.ts` — `createHarnessSession` via Supabase `signInWithPassword`. D-30 BREACH detection. NO platform-admin path.
  - `orchestrator.ts` — `runHarness` composes runLayer1/2/3 + emits `HarnessReport`. Does NOT drive state machine (per ARCH-CRIT-1).
  - `report-writer.ts` — `writePerCommitReport` (gitignored, full evidence) + `writeReport` (git-tracked, sanitized per ITER-1 C5).
  - `orchestrator.test.md` — manual test fixture (Plan 11 self-test executes the scenarios end-to-end).
- `criteria-loader.test.md` — smoke-test scaffold (per iter-1 ARCH-CRIT-2). Plan 11 self-test executes this against Plan 5's criteria-loader.ts.

## Chicken-and-egg setup (Plan 5)

`auth-strategy.ts` requires the harness fixture user to exist BEFORE the
first `runHarness` call. The setup flow (one-time per fresh checkout):

1. **Apply migration 00092** — seeds the fixture org row (UUID
   `00000000-0000-0000-0000-fb1ce0a55e55`) and (idempotently) the
   `org_members` row IF the user already exists in `auth.users`.
2. **Bootstrap the harness user** via Supabase Studio SQL editor:

   ```sql
   SELECT auth.admin.create_user(
     email := 'harness-fixture@nightwork.local',
     password := '<the-value-you-will-set-as-HARNESS_FIXTURE_PASSWORD>',
     email_confirm := true
   );
   ```

3. **Re-run migration 00092** — now binds membership to the fixture org.
4. **Set `HARNESS_FIXTURE_PASSWORD`** in `.env.local` or as GH Action secret.
5. **Run the harness** — `createHarnessSession` succeeds.

If any step is skipped, `createHarnessSession` throws with an actionable
error. Per D-30: there is NO platform-admin escape hatch — the bootstrap
MUST be done. Future need = explicit D-30 amendment.

See `orchestrator.test.md` "Chicken-and-egg setup" section for the full
walkthrough.

## FIXTURE_ORG_ID slug vs FIXTURE_ORG_UUID

Per Plan 5 active scope item #1: `types.ts` exports BOTH constants
(Option A — additive):

- **`FIXTURE_ORG_ID`** = `"fixture-harness-org"` — the slug. What every
  `Layer*Context.org_id` carries; what `canonicalCriterionHash` uses;
  what runs/screenshots paths use; what Sentry tags use.
- **`FIXTURE_ORG_UUID`** = `"00000000-0000-0000-0000-fb1ce0a55e55"` —
  the database primary key. What RLS filters on; what `createHarnessSession`
  asserts the harness session's resolved org_id matches.

The slug is the harness-scoped string identifier; the UUID is the
database primary key. Both are correct. `auth-strategy.ts` returns both
in the `HarnessSession` so callers never need to do their own slug↔UUID
lookup.

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
