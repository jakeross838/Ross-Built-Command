# Layer 1 — static / mechanical / DOM verification

Per D-08, this layer absorbs `nightwork-smoke-tester` mechanical-check logic.

## What runs

| Sub-runner | What it checks | Categories | Cost |
|---|---|---|---|
| build-typecheck | `npm run build` clean + `npx tsc --noEmit` | mechanical | ~30s + 5s |
| hooks-runner | system pre-commit (Drummond grep) silent | mechanical | <1s |
| route-status | `src/app/**/page.tsx` URLs return 200/3xx | mechanical | <5s for ~10 routes |
| dom-assertions | `criterion.category="dom"` assertions across 3 viewports (1920/1280/393) via Playwright | dom | <30s for 5 criteria x 3 viewports |

## DOM convention v1

`criterion.text` matches:
- `Page <path> contains element "<css-selector>"`
- `Page <path> contains text "<text>"`

Per D-02 forward-extensibility, future conventions add a parser branch in `dom-assertions.ts` without rewriting the runner. PLAN files (Plan 8a criteria mandate) use these conventions verbatim.

## Sandbox args (iter-1 SECURITY MEDIUM-2)

`chromium.launch()` always passes `--disable-dev-shm-usage`. `--no-sandbox` is added only when `process.env.CI === "true"` OR `process.env.GITHUB_ACTIONS === "true"`. Local dev keeps Chromium's default sandbox.

## Layer1Context contract (single source of truth)

Per iter-1 ARCH-CRIT-3 / Jake watchpoint #1, `Layer1Context` lives in `src/lib/verification/types.ts`. This module imports it; it does NOT redefine it. If you need to change the shape, edit `types.ts` and the change propagates to Plans 2/3/4/5 by recompile.

## Tenant boundary (D-30)

`ctx.org_id` is `FIXTURE_ORG_ID = "fixture-harness-org"` today. Sub-runners thread `ctx.org_id` through to `deriveIdempotencyKey()`; cache keys are tenant-bounded BY CONSTRUCTION. Wave 1.1+ swaps in real tenant identity.

## Loop semantics

Layer 1 FAIL → state machine `failed-fixable` → spawn `gsd-fix-executor` (Plan 8b). Most Layer 1 failures are file:line errors with clear remediation (TS error in X.ts:42; missing Tailwind class in Y.tsx:18); the fix-executor commit closes the loop on iter+1.

## Don't

- Don't add Layer 2 (industry-standards) logic here. Layer 2 is Plan 3.
- Don't add Layer 3 (vision) logic here. Layer 3 is Plan 4.
- Don't kill the dev server (per D-23 / .planning/lessons.md). The build wrapper does not start a dev server; route-status fetches the Vercel preview URL.
- Don't redefine `Layer1Context` locally. Import from `../types`.
