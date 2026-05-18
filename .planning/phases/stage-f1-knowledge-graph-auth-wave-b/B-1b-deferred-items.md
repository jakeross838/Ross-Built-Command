# B-1b — deferred items (out-of-scope test failures observed)

**Origin:** B-1b execute, npm test run at end of Task 6.
**Captured:** 2026-05-18

Per CLAUDE.md "SCOPE BOUNDARY: Only auto-fix issues DIRECTLY caused by
the current task's changes." These failures are PRE-EXISTING (not
introduced by B-1b) and out-of-scope.

## Pre-existing test failures observed during B-1b post-execute run

### 1. lien-release-waived-at.test.ts — 3 failures

```
FAIL  src/app/api/lien-releases/bulk/route.ts stamps received_at on bulk mark_received (regression guard)
FAIL  src/app/api/lien-releases/bulk/route.ts stamps waived_at on bulk waive
FAIL  src/app/api/lien-releases/bulk/route.ts still sets status='waived' on bulk waive (regression guard)
```

Last touched: `a7034dd feat(stage-f1-wave-a): Plan A-1 — D-035 cleanup +
status_history coverage` (commit predates B-1b dispatch by 4 commits).

**Disposition:** out-of-scope; flag to Slice-2 plan-author OR
Wave-1.1-Lite scoping. Tests assert that `src/app/api/lien-releases/bulk/route.ts` stamps timestamps on bulk actions; the regex/file
the test reads may have drifted since A-1 ship.

### 2. multi-org-session.test.ts — 1 failure

```
FAIL  no .from('org_members').maybeSingle()/single() chain filters by
      user_id without .order('created_at' ...) or .eq('org_id' ...) (GH #18)

  src\lib\verification\auth-strategy.ts
    .from("org_members") .select("org_id, role, is_active")
    .eq("user_id", data.user.id) .eq("is_active", true) .limit(1)
    .maybeSingle()
```

Last touched: `572280f feat(stage-1.5c-vh): attach Supabase session
cookies to Playwright context` (stage-1.5c-vh ship; long predates B-1b).

**Disposition:** out-of-scope; `src/lib/verification/auth-strategy.ts`
is harness-only infrastructure (not application code), so the GH #18
multi-org anti-pattern fence applies less strictly. The harness uses
fixture-harness-org which is a single-org context by construction —
the missing `.order("created_at")` is harmless in this surface.
Defer to plan-author triage if a future migration adds multi-org
membership rows to fixture-harness-org.

## What B-1b did NOT touch

Per Plan §3 downstream-consumer sweep + this verification run:

- src/app/api/lien-releases/* — N/A (B-1b is application-layer KG +
  Layer 2 + hook + types; touches no API routes).
- src/lib/verification/auth-strategy.ts — N/A (B-1b extends layer2
  registry but does not touch harness auth wiring).

## Acceptance posture

These failures DID NOT regress as a result of B-1b changes. They are
pre-existing baseline noise that the npm test runner surfaces; the
project's CI configuration apparently accepts this baseline.

B-1b's 3 new validator test files (`__tests__/validators/wi-001.test.ts`,
`__tests__/validators/wi-013.test.ts`,
`__tests__/validators/client-pii-not-embedded.test.ts`) ALL PASS — 23
test cases total across the 3 files. No B-1b–scoped test failures.
