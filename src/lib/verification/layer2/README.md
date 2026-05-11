# Layer 2 — industry-standards verification

Per D-01 (Q1=A): framework + ONE working rule shipped this phase. Future phases populate the standards library as they need it via gsd-research-standards (Plan 7).

## What runs

| Sub-runner | What it does |
|---|---|
| `loader.ts` | Reads `.planning/verification/standards/<domain>/*.json` matching `_schema.json` |
| `runner.ts` | Iterates loaded rules, resolves `verifyFn` via registry, invokes, converts to `VerificationResult` |
| `standards/<domain>/<rule>.ts` | One file per rule. Calls `registerVerifyFn(id, fn)` on import |

## Rule contract (per D-02 forward-extensibility)

Adding a new Layer 2 rule:

1. **Drop a JSON file** at `.planning/verification/standards/<domain>/<rule-id>.json` matching `.planning/verification/standards/_schema.json`. Use `id` convention `<domain>-<noun>-<test>` (kebab-case). Specify `verifyFn` as camelCase ID.

2. **Drop a TypeScript module** at `src/lib/verification/layer2/standards/<domain>/<rule-id>.ts`:

   ```typescript
   import { registerVerifyFn, type VerifyFn } from "../../../registry";

   const myRuleFn: VerifyFn = async (ctx) => {
     // ctx: { rule, commit_sha, preview_url, phase }
     // Return { verdict: "PASS" | "FAIL" | "SKIP", evidence?, expected?, actual?, error? }
   };

   registerVerifyFn("myRuleFn", myRuleFn);
   export {};
   ```

3. **Append the import** to `src/lib/verification/layer2/index.ts`:

   ```typescript
   import "./standards/<domain>/<rule-id>";
   ```

That's it. No changes to `runner.ts`, `loader.ts`, or any framework code per rule.

## Domains

Per the schema enum:

- `aia` — AIA G702/G703 standards (e.g., row-7 identity)
- `accounting` — debits = credits, retainage formula, etc.
- `lien-law` — Florida 4-statute waiver structure
- `dates` — payment schedule cutoffs, business-day calc
- `conservation` — money sums, state machine completeness

## Tenant boundary (D-30)

Mirrors Plan 2 Layer 1's tenant-boundary posture exactly. Layer 2 is tenant-aware BY SHAPE:

- `Layer2Context.org_id` is required (today: `FIXTURE_ORG_ID = "fixture-harness-org"`; Wave 1.1+ tenant-aware)
- `runLayer2` threads `ctx.org_id` through to `deriveIdempotencyKey(commit_sha, criterion, org_id)` at every callsite — both the success path (line 92) and the SKIP-on-throw path (line 74)
- `idempotency.ts:canonicalCriterionHash` includes `org_id` in the canonical hash so a cached PASS verdict from tenant A cannot be reused for tenant B with the same criterion text
- `verifyFn`s receive `ctx` from the runner, NOT directly from `Layer2Context`. The runner is the single point where `ctx.org_id` flows into idempotency-key derivation. If a future verifyFn needs tenant identity (e.g., to call its own org-scoped fetch), it MUST receive it through a future amendment to `VerifyFnContext` — never read from a global or query string

This is enforcement-by-construction: even if the caller forgets to pass `org_id`, `idempotency.ts` defaults to `FIXTURE_ORG_ID` (single-tenant default), so cache poisoning across tenants is impossible at the type level.

## Future work — `/api/_introspect/*` introspection surface (per ITER-1 multi-tenant C3 + D-30)

Layer 2 verifyFns currently SKIP when no introspection surface exists at the Vercel preview URL (e.g., `conservation-money-line-items-sum` HEAD-probes `/api/_introspect/invoice` and SKIPs on non-2xx/3xx). When Wave 1.1+ ships introspection routes that expose entity JSON for verification, those routes MUST adhere to this contract:

**MUST:**
1. **Authenticate via `getCurrentMembership()`** at the start of every `/api/_introspect/*` route handler — exactly the same pattern that protects production data routes per CLAUDE.md "Every API route uses getCurrentMembership() before DB access" rule.
2. **Filter every query by `membership.org_id`** — no exceptions, no fallbacks, no platform-admin bypass paths. The harness's session is the harness fixture-org session (per D-30 + Plan 5 auth strategy); rows returned by `/api/_introspect/*` are scoped to that org_id by construction.
3. **Test per-route org_id filter** — every new `/api/_introspect/*` route ships with a test that asserts: requesting the route as fixture-org session returns ONLY fixture-org rows; requesting as a different org's session returns ONLY that other org's rows; requesting as no session returns 401.
4. **Cross-reference D-30** in route file header comment — explicit reminder that adding an introspection route is a tenant-safety surface, not a debug surface.

**MUST NOT:**
1. **Use service-role keys to bypass RLS** for "convenience" — even within `/api/_introspect/*`. RLS is the second-line defense behind `getCurrentMembership()`; both must hold.
2. **Accept an `org_id` query param** to override the session's org. Cross-tenant lookups via the introspection surface are design-time impossible.
3. **Cache responses keyed by criterion text only** — cache keys must include `membership.org_id` (mirrors iter-1 C4 amendment to `canonicalCriterionHash`).

**Adding an introspection route checklist:**
- [ ] Route imports `getCurrentMembership` from `@/lib/api/auth`
- [ ] First line of handler: `const membership = await getCurrentMembership(request); if (!membership) return new Response('Unauthorized', { status: 401 });`
- [ ] Every DB query filters by `membership.org_id`
- [ ] Test exists at `tests/api/introspect/<entity>.test.ts` asserting per-tenant isolation (fixture-org-only, cross-tenant-rejected, no-session-rejected)
- [ ] Route file header cites D-30
- [ ] Plan-review iter-1 of the Wave 1.1+ phase that adds the route surfaces this checklist

Verifying this checklist prevents the failure mode iter-1 C3 surfaced: an introspection route that returned entity JSON without `getCurrentMembership()` filter would break tenant isolation entirely — the harness would receive cross-tenant data and Layer 2 rules would assert against the wrong org's invoices.

## Currently shipped

| Rule | Domain | Status |
|---|---|---|
| `conservation-money-line-items-sum` | conservation | Shipped (Plan 3 of this phase). SKIPs cleanly until `/api/_introspect/*` surface ships in Wave 1.1+. |

All other domain dirs (`aia/`, `accounting/`, `lien-law/`, `dates/`) are scaffolded but empty per Q1=A — `gsd-research-standards` (Plan 7 of this phase) populates them per future phase need.

## Loop semantics

- Layer 2 FAIL on `severity: "blocking"` rule → state machine `failed-fixable` → spawn `gsd-fix-executor` (Plan 8b)
- Layer 2 FAIL on `severity: "warning"` rule → result still FAIL but loop progresses; orchestrator surfaces in report
- Layer 2 SKIP → loop progresses (entity unreachable / introspection unavailable)
- Layer 2 throw (e.g., unregistered `verifyFn`) → SKIP with diagnostic in `error` field; loop progresses

## Don't

- Don't bake rule logic into `runner.ts`. Use the registry contract.
- Don't add a 6th domain without `CONTEXT.md` addition + plan-review approval.
- Don't kill running processes (per D-23). The Layer 2 runner does not start servers; it only `fetch()`es a Vercel preview URL.
- Don't redefine `Layer2Context` locally. It lives in `src/lib/verification/types.ts` per ARCH-CRIT-3 / Jake watchpoint #1.
- Don't drop the `org_id` thread through `deriveIdempotencyKey`. Tenant-bounded cache is enforcement-by-construction (D-30).

## Plan-review watchpoint #1

This module's design IS the plan-review watchpoint. Future Layer 2 rules arrive incrementally across F1-F6+ Wave 1.1+. The contract above must hold without retrofit. If you find yourself modifying `loader.ts` or `runner.ts` to support a new rule, STOP — the schema or registry pattern is leaking abstraction. Surface as iter-1 plan-review feedback.
