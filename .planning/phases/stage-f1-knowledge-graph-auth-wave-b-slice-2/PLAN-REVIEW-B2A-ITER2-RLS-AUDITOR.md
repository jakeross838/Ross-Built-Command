# Plan-Review B-2a iter-2 — RLS Auditor

**Captured 2026-05-21 from agent inline return** (agent disk-write suppressed by its system prompt; transcribed for audit-trail persistence).

**Verdict: PASS**

All four iter-1 findings (W-1, W-2, N-1, N-2) fully resolved in commit `4780007`. Plan carries zero open RLS posture concerns from prior review cycle.

## Per-finding verification table

| Finding | Status | Evidence |
|---|---|---|
| **W-1 (PUBLIC_PATHS comment conflation)** | RESOLVED | Lines 1027-1032 show split per-entry inline comments: `/owner` labeled "anon homeowner UI (B-2b)", `/api/owner-portal/acknowledge` labeled "anon homeowner pay-app acknowledge (B-2b; reaches handler)", `/api/owner-portal/admin` labeled "authenticated admin (B-2a; handler enforces via getCurrentMembership())". Task 5 at line 1831 repeats the same split form. Jake checklist at line 2531 calls out "W-1 split form" explicitly. |
| **W-2 (Admin revocation rate-limit IP-only disposition)** | RESOLVED | Line 718 (§6.d T-B2a-08-rate-limit paragraph) states `Disposition: accept` with full rationale — authenticated + optimistic-lock-bound + audit-logged gates bound a compromised admin; per-user_id deferred to Wave 1.1-Lite. Threat model row T-B2a-08c at line 1119 echoes the same accept disposition. Jake checklist at line 2528 explicitly calls it out as "(W-2 iter-1 SYNTHESIS) ... explicit accept." |
| **N-1 (Drummond canary vacuously-true case)** | RESOLVED | Line 2056 (AC-B2a-13 sub-item 9) explicitly acknowledges the vacuously-true case: "if `client_portal_access` is empty at backfill time (current state per ai-logic-tester Q6 evidence — 0 rows across all orgs in current schema), the canary passes vacuously." Points to AC-B2a-06 sub-item 2 active RPC-invocation probe as covering the non-empty case. |
| **N-2 (`as any` cast in §6.d step 5)** | RESOLVED | Line 711 shows `new Date().toISOString()` directly in the `updateWithLock` call — no `as any` cast present. Grep for `as any` across entire plan file returns zero matches. |

## Additional checks (no regressions)

- PUBLIC_PATHS path entries unchanged by comment split: all three paths (`/owner`, `/api/owner-portal/acknowledge`, `/api/owner-portal/admin`) remain present at lines 1029-1031, matching middleware code sample and Task 5 description. No regression.
- Anon-role policy posture on `client_portal_access` unchanged: rate-limit table at line 951-952 has RLS enabled with no policies (service-role-only access). No new anon SELECT policy added to `client_portal_access`; existing RLS posture relied upon.
- Admin revocation route membership gate: line 710-711 confirms `getCurrentMembership()` called before DB access, role asserted `IN ('owner', 'admin')`, and `updateWithLock()` used for write. No regression.

## Newly surfaced findings

**None.** No new BLOCKING, no Rule 9 cross-reviewer factual disagreements detected.

## Summary

All four iter-1 findings (W-1 PUBLIC_PATHS comment + W-2 IP-only rate-limit + N-1 Drummond canary + N-2 `as any` cast) fully resolved. Plan ready for Jake sign-off + execute dispatch.
