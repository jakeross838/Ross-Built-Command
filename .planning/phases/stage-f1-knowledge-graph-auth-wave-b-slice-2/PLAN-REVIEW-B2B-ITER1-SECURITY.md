---
reviewer: security-reviewer
plan: B-2b
plan-name: owner-portal-readonly-ui-and-audit
iteration: iter-1
scope: NARROW (nwrp209 §10) — token-scoped fetch + AC-B2b-10 runtime revocation only
authored: 2026-05-21
verdict: PASS
---

# Security Review — B-2b Plan iter-1 (NARROW)

Scope per nwrp209 §10: token-scoped data fetch correctness + AC-B2b-10 runtime revocation
disposition. Seven targeted checks. All PASS.

---

## Per-Check Findings

| # | Check | Verdict | Evidence |
|---|-------|---------|----------|
| 1 | `getScopedOwnerPortalClient` usage in portal pages | PASS | §6.a page.tsx code shows `const scope = getScopedOwnerPortalClient(resolved)` then `scope.scopedFrom("jobs", "*")` + `scope.scopedFrom("draws", "*")` + `scope.scopedFrom("change_orders", "*")`. Semantic criterion S-01 mandates ≥2 grep hits across `src/app/owner/**` + `src/app/api/owner-portal/acknowledge-pay-app/`. |
| 2 | `assertDrawBelongsToToken` before audit write | PASS | §6.a pay-apps page calls `assertDrawBelongsToToken(params.id, resolved)` at Step 3, before any scope queries. §6.b acknowledge route calls `assertDrawBelongsToToken(body.drawId, resolved)` at Step 4, explicitly before the `logActivity` call at Step 5. S-01(b) mandates ≥1 grep hit in `acknowledge-pay-app/route.ts`. |
| 3 | Rate-limit both `'token'` + `'ip'` keys on acknowledge route | PASS | §6.b Steps 3a–3b show `recordOwnerPortalRequest("token", resolved.portal_access_id)` then `recordOwnerPortalRequest("ip", requestIp)` with separate 429 returns for each. Both keys explicitly exercised. IP extracted from `x-forwarded-for`/`x-real-ip` with `.split(",")[0].trim()` to handle proxy chains. Dashboard read path also rate-limits per-token (Step 2 in §6.a) for defense-in-depth. |
| 4 | No direct service-role client in `src/app/owner/**` or `src/app/api/owner-portal/acknowledge-pay-app/` | PASS | Semantic criterion M-04 / S-01(c) defines a mandatory grep gate: `grep -rn 'createServiceRoleClient\|createServerSupabaseClient\|tryCreateServiceRoleClient' src/app/owner/ src/app/api/owner-portal/acknowledge-pay-app/` must return ZERO hits. This grep is listed as a required verification step for AC-B2b-02, §12 Jake checklist item N-5, and Sweep 1 anti-pattern check. The service-role client DOES appear in `src/lib/owner-portal/token.ts` (B-2a's server-only resolution helper), which is correct — the helper layer owns the service-role call; consumer routes call only the helper exports. No consumer-side direct construction is present in the plan's authored code. |
| 5 | AC-B2b-10 (forward-carried AC-B2a-08) — all 5 steps + ship-gate | PASS | AC-B2b-10 at §8 (lines 1577-1584) and B-04 behavioral criterion (lines 202-204) both enumerate all 5 required steps: (1) create token via `create_client_portal_invite`; (2) GET `/owner/{token}` → 200 + dashboard rendered; (3) POST admin revoke; (4) GET `/owner/{token}` again → error boundary with "link no longer valid" UX; (5) cleanup. The step-4 assertion is explicit: "NOT 200 with data. NOT 500 stack trace." HALT condition for step-4 failure is explicit at both the AC and §6.i threat model T-B2b-04. Task 8 (§7) delivers a Playwright headless probe (`scripts/b-2b-revocation-runtime-probe.ts`) as the load-bearing ship-test artifact. The probe must run against Vercel preview (not localhost) per Workflow Rule 1. AC-B2b-10 is treated as GATE, not defer-to-future. |
| 6 | Append-only audit_log — no `expected_updated_at` / `updateWithLock` | PASS | §6.b route code shows direct `logActivity({..., onConflictDoNothing: true})` with no `expected_updated_at` parameter. §2 out-of-scope list, iter-1 SYNTHESIS B-13 resolution table, and the route comment block all explicitly state "NO `updateWithLock` / `expected_updated_at` on activity_log; direct INSERT with ON CONFLICT for dedupe." M-02 verification criterion asserts the written row shape. |
| 7 | Acknowledge endpoint CSRF risk | PASS — adequately addressed | §6.i threat T-B2b-02 addresses this: "CSRF N/A in the traditional sense (no cookie-authenticated session; token in request body acts as bearer credential)." This is correct. The endpoint is anonymous — there is no authenticated session cookie to forge cross-site. The 64-char bearer token in the POST body is the auth mechanism; an attacker cannot force a homeowner's browser to POST a known token cross-site because the token is not accessible from a third-party origin. Rate-limiting + HTTPS-only (Vercel default) provide additional defense. Jake checklist at §12 explicitly records this reasoning for sign-off. |

---

## AC-B2b-10 Disposition

AC-B2b-10 is correctly positioned as a **load-bearing GATE**, not a deferred nicety. Specific
confirmations:

- B-04 behavioral criterion specifies the test against Vercel preview URL with the explicit
  HALT condition on Step 4 failure.
- Task 8 in §7 delivers `scripts/b-2b-revocation-runtime-probe.ts` as a first-class Playwright
  harness, not a manual curl walkthrough.
- AC-B2b-10 verification command (§9) requires `--preview-url` argument, enforcing the
  Workflow Rule 1 "deployed surface" requirement.
- The B-2b-SUMMARY.md hand-off (§13 item 3) requires flipping B-2a-SUMMARY.md AC-B2a-08
  from DEFERRED-TO-QA to PASS with artifact path — creating a traceable closure record.

One execution note for the executor: the probe at Task 8 re-uses the seeded
`HARNESS_FIXTURE_OWNER_TOKEN` fixture row with a revoke-then-re-issue lifecycle OR creates
a fresh token via `create_client_portal_invite`. Either path is acceptable per AC-B2b-10.
The preferred path is creating a fresh ephemeral test token to avoid revoking the shared
smoke-harness fixture row (which Task 7 exercises separately), but this is an executor
judgment call, not a blocking concern.

---

## New Blocking Findings vs Plan-Checker Iter-1

None. The three blockers raised in plan-checker iter-1 (BLK-1 middleware, BLK-2 smoke fixture,
BLK-3 data-prototype wrapper) were all security-adjacent but not in the narrow security scope.
All three were addressed in the REVISED plan. Within the narrow security scope defined by
nwrp209 §10, no new blocking issues are found.

One observation that does not rise to blocking: the `onConflictDoNothing` upsert path in
`logActivity` uses `onConflict: "entity_id,actor_token_id,action"` as a string-column-list
form. The 00106 partial unique index is defined as
`(entity_id, actor_token_id, action) WHERE action='acknowledged' AND actor_token_id IS NOT NULL`.
Supabase's PostgREST `upsert` with `onConflict` specifies columns by name; the partial index
predicate is enforced at the DB level independently. This is correct behavior — the conflict
will be detected against the partial index only when the predicate matches, which is exactly
the intended scope. No remediation needed; noting for executor awareness.
