---
reviewer: security-reviewer
scope: NARROW — Task 4 ONLY (nwrp220 §8 + nwrp222 §17)
date: 2026-05-22
verdict: PASS
blocking_findings: 0
must_fix_findings: 0
notes: 1
---

# QA-B4-SECURITY — Task 4 MEDIUM-1 focused security review

Scope is exclusively Task 4: PATCH /api/jobs `.eq("org_id", membership.org_id)` defense-in-depth filter + AC-B4-04 cross-tenant probe evidence.

---

## Check 1 — Fix correctness

**Source:** `src/app/api/jobs/route.ts` lines 403-408.

The UPDATE chain reads:

```ts
const { error } = await supabase
  .from("jobs")
  .update(patch)
  .eq("id", body.id)
  .eq("org_id", membership.org_id)
  .is("deleted_at", null);
```

Verification against PLAN §2.3 canonical diff:

| Requirement | Status |
|---|---|
| `.eq("org_id", membership.org_id)` present | CONFIRMED — line 407 |
| Uses `membership.org_id` from `getCurrentMembership()` | CONFIRMED — `membership` bound at route entry via canonical `getCurrentMembership()` call |
| NOT `body.org_id` (attacker-controlled) | CONFIRMED — `body.org_id` not referenced in this chain |
| Filter position: after `.eq("id", body.id)`, before `.is("deleted_at", null)` | CONFIRMED — correct chain order |
| Existing UPDATE behavior (same-org PATCH) unbroken | CONFIRMED — chain unchanged for same-org callers; filter is a no-op when row.org_id == membership.org_id |

**VERDICT: PASS — Fix correctly implemented.**

---

## Check 2 — AC-B4-04 evidence adequacy

The 4 static-analysis tests in `__tests__/api-jobs.test.ts` (lines 36-78):

1. **Test "PATCH UPDATE chain includes .eq('org_id', membership.org_id) defense-in-depth filter"** — regex asserts the `.eq("org_id", membership.org_id)` token is present in the source. Falsifying: if the filter is absent or uses a different source (`body.org_id`), this test fails.

2. **Test "PATCH UPDATE chain references both id + org_id + deleted_at IS NULL"** — three independent assertions; each is independently falsifiable. If any of the three filters is dropped, this test fails.

3. **Test "PATCH MEDIUM-1 fix carries documented rationale referencing B-1a-bis QA"** — guards against silent removal during cleanup. Requires presence of `B-4 Task 4`, `MEDIUM-1`, `nwrp166`, or `defense-in-depth` in source. Confirmed present at lines 394-402.

4. **Implicit existence guard** — the route existence test (line 29) gates all downstream pattern assertions.

**Assessment:** The 4 tests are real falsifying assertions. Test 1 and Test 2 directly constrain the org_id source: the regex `/\.eq\(\s*['"]org_id['"]\s*,\s*membership\.org_id\s*\)/` matches `membership.org_id` only — `body.org_id` would not match, causing the test to fail. These are not "code-exists" no-ops.

**D-T4-CROSS-TENANT-PROBE-SKIP assessment:** The SKIP marker at test lines 117-141 is explicit, cites PLAN §5 R-3 verbatim, and documents the planned Wave 1.1-Lite upgrade path including the exact test shape to fill in (service-role org_A/org_B fixture + non-200 / 0-rows-updated assertion). The marker is a `console.warn` inside a test body that passes unconditionally; the test runner registers it as PASS while signaling the deferral audibly.

**Rule 1 (schema != runtime) applicability:** Rule 1 targets UI-touching plans where schema-only verification gave false PASSes on user-facing bugs. Task 4 is an application-layer defense-in-depth fix on a route where RLS is already the primary tenant gate. The fix is a single filter append; correctness is fully demonstrable by reading the line. Code-review-only evidence is acceptable for this narrow case because: (a) RLS is the primary gate, (b) the application filter is defense-in-depth, (c) the static assertions are genuinely falsifying, and (d) this is not a UI surface with runtime rendering concerns.

**VERDICT: PASS — Evidence adequate for defense-in-depth close. Live probe deferred appropriately.**

---

## Check 3 — Defense-in-depth posture preserved

The jobs RLS policy (migration 00016) is `RESTRICTIVE FOR ALL USING (org_id = app_private.user_org_id())` — canonical Pattern A.

The two layers are independent:

- **Primary gate:** RLS rejects any UPDATE that would touch a row with `org_id != user_org_id()` at the DB layer. An attacker who crafts a PATCH body with a foreign `id` value cannot write through RLS.
- **Application filter:** `.eq("org_id", membership.org_id)` at the API layer ensures the UPDATE WHERE clause itself scopes to the authenticated org. If RLS is accidentally dropped (e.g., by a mistaken `DROP POLICY`), the application filter continues to block cross-org writes independently.

The two filters are logically AND-ed by the DB planner. Neither masks the other. No weakening identified.

**VERDICT: PASS — Defense-in-depth posture sound. Independent-gate property confirmed.**

---

## Check 4 — Scope boundary

Review confined to Task 4 only per nwrp220 §8 + nwrp222 §17.

NOTE (out-of-scope, not a finding, no action required): Task 5 tests at lines 81-115 follow the same static-analysis-only pattern with a SKIP marker for the live concurrent probe. This is consistent with the R-3 disposition and mirrors Task 4's approach. Not reviewed further per scope constraint.

---

## Summary

| Check | Verdict |
|---|---|
| 1 — Fix correctness | PASS |
| 2 — AC-B4-04 evidence adequacy | PASS |
| 3 — Defense-in-depth posture | PASS |
| 4 — Scope boundary | In scope only |

**Overall Task 4 security verdict: PASS — no blocking or must-fix findings.**

The MEDIUM-1 fix is correctly applied: `membership.org_id` (server-authoritative) is used, not `body.org_id` (attacker-controlled). The static-analysis test suite provides genuine falsifying coverage. The live cross-tenant probe deferral to Wave 1.1-Lite is appropriately documented with an explicit SKIP marker, R-3 citation, and upgrade-path test shape.
