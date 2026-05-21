---
reviewer: security-reviewer
plan: B-2a (iter-2 re-review)
scope: verify iter-1 findings closed (BLOCKING + HIGH + MEDIUM)
verdict: PASS
date: 2026-05-21
authorized_by: nwrp204
---

# Security Reviewer — Iter-2 Re-Review

**Plan:** B-2a-PLAN.md (2559 lines, commit 4780007)
**Scope:** Closure verification of iter-1 BLOCKING + HIGH + MEDIUM findings + additional security checks per nwrp204 tasking.
**Verdict: PASS**

No new BLOCKING findings. No Rule 9 cross-reviewer factual disagreements. HALT conditions not triggered.

---

## Per-Finding Verification Table

| Finding | Iter-1 Severity | Status | Evidence |
|---|---|---|---|
| Partial index `idx_client_portal_access_token_hash WHERE revoked_at IS NULL` timing oracle on token-resolution hot path | BLOCKING | **PASS — CLOSED** | See verification below |
| 3 re-defined SECURITY DEFINER RPCs lack REVOKE/GRANT pairs | HIGH | **PASS — CLOSED** | See verification below |
| CSRF gap on admin revoke POST | MEDIUM | **PASS — CLOSED** | See verification below |

---

### Finding 1 — BLOCKING: Timing oracle on token-resolution hot path

**Claim:** Forward migration drops the 00074 partial index and recreates as non-partial. Down migration restores partial form. Rationale documented in §6.c. Goal item 6(b) explicitly calls out the fix.

**Verification results:**

- **Goal item 6(b) at line 211:** CONFIRMED. Line 211 reads: "DROP existing partial `idx_client_portal_access_token_hash WHERE revoked_at IS NULL` (from 00074:188-190) + recreate as NON-PARTIAL on the token-resolution hot path (per BLK-3 iter-1 SYNTHESIS — security-reviewer + ai-logic-tester cross-reviewer alignment)." Explicitly names the problem, the source, and the cross-reviewer alignment.

- **Forward migration §1k at lines 1215-1223:**
  ```sql
  -- §1k — DROP+recreate idx_client_portal_access_token_hash as NON-PARTIAL per BLK-3.
  DROP INDEX IF EXISTS public.idx_client_portal_access_token_hash;
  CREATE UNIQUE INDEX idx_client_portal_access_token_hash
    ON public.client_portal_access (access_token_hash);
  ```
  Non-partial form confirmed (no `WHERE` clause). The inline comment names BLK-3, the hot-path oracle problem, and the resolver.

- **Down migration §1k reverse at lines 1685-1689:**
  ```sql
  -- §1k reverse — restore 00074:188-190 partial index form (per BLK-3 down-reverse parity)
  DROP INDEX IF EXISTS public.idx_client_portal_access_token_hash;
  CREATE UNIQUE INDEX idx_client_portal_access_token_hash
    ON public.client_portal_access (access_token_hash)
    WHERE revoked_at IS NULL;
  ```
  Restores the original 00074 partial form. Parity confirmed.

- **§6.c rationale at lines 622-681:** Full section "Index posture eliminating timing oracle" with subsection "Token-resolution hot path — BLK-3 partial-index DROP+recreate" (lines 652-681). Rationale states: "The `resolveOwnerToken` helper (§6.e) queries `client_portal_access` by `access_token_hash` only — without the `revoked_at IS NULL` predicate. Postgres cannot use the partial index without the predicate; falls back to seq-scan for revoked-token lookups." Non-partial index eliminates the oracle because all three lookup paths (revoked, non-revoked, never-existed) hit the same index and incur the same latency.

- **COLUMN COMMENT at line 1483-1484:** Schema comment on the index explicitly documents the BLK-3 origin and the non-partial rationale.

- **Threat model T-B2a-05b at line 1114:** Dedicated threat row for the hot-path oracle: "Timing oracle on token-resolution hot path via existing partial `idx_client_portal_access_token_hash WHERE revoked_at IS NULL` (00074:188-190)" — disposition: mitigate via DROP+recreate non-partial.

- **AC-B2a-14 at lines 2446-2468:** Dedicated acceptance criterion with SQL verification query confirming post-migration index has no WHERE clause.

- **`resolveOwnerToken` helper at lines 770-778:** Comment explicitly states "Non-partial token-hash index (per BLK-3 fix) serves the query regardless of revoked_at, so all three null-paths share the same latency. Timing oracle eliminated."

**Assessment:** FULLY CLOSED. The fix is present in forward migration, reversed in down migration, rationalized in §6.c, captured in the threat model as T-B2a-05b, and verified by AC-B2a-14.

---

### Finding 2 — HIGH: 3 re-defined SECURITY DEFINER RPCs lack REVOKE/GRANT pairs

**Claim:** Forward migration adds REVOKE EXECUTE FROM PUBLIC + GRANT to appropriate roles after each of the 3 `CREATE OR REPLACE` RPC re-definitions. Down migration includes parity REVOKE+GRANT for the restored 00074 bodies.

**Verification results:**

- **`create_client_portal_invite` forward (lines 1290-1293):**
  ```sql
  -- §3a — REVOKE+GRANT for re-defined create_client_portal_invite per BLK-4 iter-1 SYNTHESIS.
  -- Role list matches 00074:441-443 verbatim (authenticated only — admin function).
  REVOKE EXECUTE ON FUNCTION public.create_client_portal_invite(UUID, UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.create_client_portal_invite(UUID, UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ) TO authenticated;
  ```
  Present. Role: `authenticated`. Comment cites 00074:441-443 as the source for the role list.

- **`submit_client_portal_message` forward (lines 1348-1351):**
  ```sql
  -- §3b-grant — REVOKE+GRANT for re-defined submit_client_portal_message per BLK-4 iter-1 SYNTHESIS.
  -- Role list matches 00074:496-497 verbatim (anon only — homeowner-callable).
  REVOKE EXECUTE ON FUNCTION public.submit_client_portal_message(TEXT, TEXT) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.submit_client_portal_message(TEXT, TEXT) TO anon;
  ```
  Present. Role: `anon`. Comment cites 00074:496-497.

- **`mark_client_portal_message_read` forward (lines 1404-1407):**
  ```sql
  -- §3c-grant — REVOKE+GRANT for re-defined mark_client_portal_message_read per BLK-4 iter-1 SYNTHESIS.
  -- Role list matches 00074:545-546 verbatim (anon only — homeowner-callable).
  REVOKE EXECUTE ON FUNCTION public.mark_client_portal_message_read(TEXT, UUID) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.mark_client_portal_message_read(TEXT, UUID) TO anon;
  ```
  Present. Role: `anon`. Comment cites 00074:545-546.

- **Down migration REVOKE+GRANT parity (lines 1577-1579, 1629-1631, 1677-1679):**
  - `create_client_portal_invite` down: REVOKE FROM PUBLIC + GRANT TO authenticated (lines 1577-1579). CONFIRMED.
  - `submit_client_portal_message` down: REVOKE FROM PUBLIC + GRANT TO anon (lines 1629-1631). CONFIRMED.
  - `mark_client_portal_message_read` down: REVOKE FROM PUBLIC + GRANT TO anon (lines 1677-1679). CONFIRMED.

- **Role list parity with 00074:** All three GRANT targets match the cited 00074 line numbers. `create_client_portal_invite` → `authenticated` (admin-only function); both message RPCs → `anon` (homeowner-callable without authentication session). The pattern is semantically correct: the admin invite function must not be callable by anonymous homeowners; the message RPCs must be callable by anonymous sessions (portal pages do not have authenticated Supabase sessions).

- **Threat model T-B2a-12 at line 1123:** "SECURITY DEFINER function PUBLIC EXECUTE inheritance" — mitigation explicitly calls out "ALSO on re-defined 3 existing RPCs per BLK-4 iter-1 SYNTHESIS (REVOKE+GRANT pair after each CREATE OR REPLACE — role list per 00074 verbatim)."

- **AC-B2a-14 at lines 2456-2467:** SQL verification query against `pg_proc`/`aclexplode` to confirm each function has only the expected GRANTs with no PUBLIC.

**Assessment:** FULLY CLOSED. All 3 RPCs have REVOKE+GRANT pairs in both forward and down migrations, roles match 00074 verbatim, rationale documented in threat model, and verification query exists in AC-B2a-14.

---

### Finding 3 — MEDIUM: CSRF gap on admin revoke POST

**Claim:** CSRF Origin header validation added to Task 7 step 2, §6.d step 2, threat model T-B2a-08b, and AC-B2a-08 step 8.

**Verification results:**

- **Task 7 step 2 at lines 1882-1884:**
  ```
  2. CSRF protection (per iter-1 SYNTHESIS H-2): at route handler entry, assert
     `request.headers.get('origin')` equals `process.env.NEXT_PUBLIC_APP_URL`.
     Reject 403 on mismatch. This closes the CSRF surface — Origin is a
     forbidden-write header per Fetch spec, so a cross-origin attacker cannot
     spoof it from a browser context. Same-origin enforcement via Origin header
     is the OWASP-recommended pattern (CSRF cheat sheet).
  ```
  CONFIRMED. Present as discrete step 2 before getCurrentMembership() call, which is correct ordering (reject cross-origin before incurring auth cost).

- **§6.d step 2 at line 708:**
  ```
  2. Route handler CSRF protection (per iter-1 SYNTHESIS H-2): assert
     `request.headers.get('origin')` matches `process.env.NEXT_PUBLIC_APP_URL`;
     reject 403 on mismatch.
  ```
  CONFIRMED. Present as the same step 2 in the §6.d admin revocation API path description.

- **Threat model T-B2a-08b at line 1118:**
  ```
  | T-B2a-08b | T (Tampering) | CSRF on admin revoke POST | mitigate | Origin header validation ...
  ```
  CONFIRMED. Dedicated row in threat table with category T (Tampering), disposition "mitigate," and full mitigation description including the OWASP pattern citation and the Fetch spec forbidden-write header rationale.

- **AC-B2a-08 step 8 CSRF probe at lines 2334-2338:**
  ```bash
  # Step 8: CSRF probe (H-2 iter-1 SYNTHESIS)
  curl -X POST .../revoke-token -d '...' \
    -H "Origin: https://attacker.example.com" \
    -H "Cookie: <admin-session-cookie>"
  # Expect: 403 (Origin mismatch).
  ```
  CONFIRMED. Discrete step 8 in AC-B2a-08 with specific attacker Origin header and expected 403 response.

- **Jake checklist at line 2527:**
  ```
  - [ ] §6.d CSRF Origin check accepted (H-2 iter-1 SYNTHESIS). Admin revoke route validates
        `request.headers.get('origin')` matches `process.env.NEXT_PUBLIC_APP_URL`; rejects 403
        on mismatch. Same-origin OWASP pattern.
  ```
  CONFIRMED in Jake pre-/nx sign-off checklist.

**Assessment:** FULLY CLOSED. CSRF Origin check appears in all four required locations, and additionally in the Jake checklist.

---

## Additional Security Checks

### Latitude #3 and #4 dispositions in §2

- **Latitude #3 (revoked_seq Option A):** Disposition recorded at lines 242-260. States "APPROVED Option A" with cross-reviewer alignment from security-reviewer + multi-tenant-architect. Reasoning, Option A/B/C analysis, and rejection grounds for B and C all present. CONFIRMED.

- **Latitude #4 (sliding-window 90-day → 1-year):** Disposition recorded at lines 262-278. States "APPROVED IN-SCOPE" with 3-reviewer alignment (security + multi-tenant + ai-logic). Reasoning cites NECESSARY CONSEQUENCE of nwrp200 lock. ai-logic-tester Q8 scope-completeness query (3 functions only) cited. CONFIRMED.

### W-2 (admin revocation rate-limit IP-only) explicit accept

- **Threat model T-B2a-08c at line 1119:** Row present. Category "E (Elevation)," disposition "accept." Rationale: admin sessions are authenticated (getCurrentMembership() gate) + optimistic-lock-bound (updateWithLock) + audit-logged on every revocation. Compromised admin account bounded by these gates; IP-level cap is backstop against scripted revocation of all org tokens. Per-membership.user_id rate-limit deferred to Wave 1.1-Lite. CONFIRMED.

- **§6.d threat-model paragraph at line 718 (T-B2a-08-rate-limit):** Same disposition documented in-line in the admin revocation section as "T-B2a-08-rate-limit (NEW per iter-1 SYNTHESIS W-2)." CONFIRMED.

- **Jake checklist at line 2528:** "§6.d admin revocation rate-limit IP-only acceptance (W-2 iter-1 SYNTHESIS). Disposition (a): explicit accept..." CONFIRMED.

### 3 new threat-model rows citing mitigations correctly

| Threat Row | Present | Disposition | Mitigation Citation |
|---|---|---|---|
| T-B2a-05b (timing oracle, hot path) | Line 1114 | mitigate | DROP+recreate non-partial per BLK-3 cross-reviewer alignment |
| T-B2a-08b (CSRF on admin revoke POST) | Line 1118 | mitigate | Origin header validation, OWASP CSRF cheat sheet, Fetch spec forbidden-write header |
| T-B2a-08c (admin rate-limit IP-only) | Line 1119 | accept | Authenticated gate + optimistic lock + audit log; per-user deferred to Wave 1.1-Lite |

All three present with correct dispositions and mitigations. CONFIRMED.

### search_path discipline on 3 re-defined RPCs

Spot-check verifying `SET search_path = public, pg_temp` was not accidentally dropped when REVOKE/GRANT pairs were added:

- **`create_client_portal_invite` (line 1242):** `SET search_path = public, pg_temp` present in function header. REVOKE/GRANT at lines 1292-1293 are AFTER the function body, not touching the header. CONFIRMED.

- **`submit_client_portal_message` (line 1305):** `SET search_path = public, pg_temp` present. REVOKE/GRANT at lines 1350-1351 follow the `$function$;` close. CONFIRMED.

- **`mark_client_portal_message_read` (line 1364):** `SET search_path = public, pg_temp` present. REVOKE/GRANT at lines 1406-1407 follow the `$function$;` close. CONFIRMED.

The REVOKE/GRANT statements are positioned as standalone DDL statements after the function body closes, not inside the function definition. No risk of header modification. All 3 re-defined RPCs retain search_path discipline. The `cleanup_owner_portal_rate_limit()` and `record_owner_portal_request()` new SECURITY DEFINER functions also have `SET search_path = public, pg_temp` at lines 1434 and 1456 respectively.

---

## New BLOCKING Findings

None. No new BLOCKING findings were identified during this iter-2 re-review. HALT condition not triggered.

---

## Summary

All three iter-1 findings are cleanly closed in the iter-2 revision. The BLOCKING timing-oracle finding is addressed by a two-part index fix: the forward migration at §1k (lines 1215-1223) drops the 00074 partial index and recreates it as non-partial; the down migration at lines 1685-1689 restores the partial form for rollback parity; §6.c provides the rationale; T-B2a-05b captures it in the threat model; and AC-B2a-14 provides the post-migration verification query. The HIGH REVOKE/GRANT finding is addressed by REVOKE+GRANT pairs for all three re-defined RPCs in both forward (lines 1290-1293, 1348-1351, 1404-1407) and down migrations (lines 1577-1579, 1629-1631, 1677-1679), with role lists matching 00074 verbatim. The MEDIUM CSRF finding is addressed by Origin header validation in Task 7 step 2 (line 1882), §6.d step 2 (line 708), threat model T-B2a-08b (line 1118), and AC-B2a-08 step 8 (lines 2334-2338). Additional checks confirm Latitude #3 and #4 dispositions recorded, W-2 IP-only rate-limit accept documented in three locations, all three new threat rows cite correct mitigations, and search_path discipline is intact on all three re-defined RPCs and both new SECURITY DEFINER functions. No new BLOCKING findings.
