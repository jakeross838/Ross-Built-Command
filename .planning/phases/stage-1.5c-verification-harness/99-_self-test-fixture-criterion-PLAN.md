---
phase: stage-1.5c-verification-harness
plan_id: _fixture-criterion
plan_name: self-test-fixture-criterion
type: execute
wave: 7
depends_on: []
autonomous: true
halt_after: false
files_modified: []
estimated_days: 0
plan_review_watchpoints: []
requirements: []
must_haves:
  truths: []
  artifacts: []
  key_links: []
---

<objective>
ITER-1 amendment fixture (per architect WARN-2 + Jake watchpoint #3). NOT a real plan — exists solely so Plan 11 self-test exercises Layer 3 vision NON-VACUOUSLY.

This file is named `99-_self-test-fixture-criterion-PLAN.md` so the criteria-loader picks it up (file ends with `-PLAN.md`); the `99-` prefix sorts it last; the `_` in plan_id signals "fixture, not real plan". The single visual criterion below fires Claude vision against the marketing root page (`/`) which always renders meaningful content; vision should return high-confidence PASS.
</objective>

<criteria>

```yaml
criteria:
  mechanical: []
  dom: []
  visual:
    - "Page /: Nightwork app renders (onboarding, dashboard, or sign-in depending on session) with visible text + interactive button; not a 404 or error page"
  behavioral: []
  semantic: []
```

</criteria>
