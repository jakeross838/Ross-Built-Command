# RLS Audit — Plan B-2 (plan-review iter-1)

**Auditor:** rls-auditor agent
**Date:** 2026-05-19
**Scope:** B-2-PLAN.md + EXPANDED-SCOPE §7 + migration 00104 (planned) against 00074 + 00100 + 00026 + 00049 as the canonical existing RLS posture
**Authorization:** nwrp198 §23 — LOAD-BEARING per-plan RLS audit before /np dispatch

---

## Files reviewed

### Migrations
- supabase/migrations/00074_client_portal.sql — existing RLS on client_portal_access (verified from disk)
- supabase/migrations/00100_clients_schema_foundation.sql — existing RLS on clients (verified from disk)
- supabase/migrations/00026_phase5_scaffolding_tables.sql — existing RLS on activity_log (verified from disk)
- supabase/migrations/00049_platform_admin_rls_bypass.sql — existing platform-admin bypass on activity_log (verified from disk)
- supabase/migrations/00104_client_portal_access_add_client_id.sql — PLANNED (audited from B-2-PLAN.md §5 Task 1 SQL)

### API routes (planned — audited from B-2-PLAN.md §5 Task 3 + Task 4)
- src/app/api/owner-portal/resolve/route.ts — planned POST handler
- src/app/api/owner-portal/acknowledge-pay-app/route.ts — planned POST handler

### Supporting files (verified from disk)
- src/middleware.ts — PUBLIC_PATHS array (lines 7, 30-35)
- src/lib/org/session.ts — getCurrentMembership() implementation
- src/lib/activity-log.ts — logActivity write path (referenced via 00026 comments + plan text)

---
## Checks

| Check | Verdict | Evidence |
|-------|---------|----------|
| New columns on existing tables: RLS enabled on parent tables | PASS | client_portal_access RLS enabled 00074:247; activity_log RLS enabled 00026:97. B-2 adds columns only — no new CREATE TABLE. |
| Existing RLS policies preserved by migration 00104 | PASS | Migration 00104 SQL contains no DROP POLICY / ALTER POLICY. All three client_portal_access policies from 00074 remain intact. |
| client_portal_access SELECT: anon blocked | PASS | 00074:249-267 — anon has zero SELECT policy; user_org_id() returns NULL for anon making USING false. |
| client_portal_access INSERT: correct role-set | PASS | 00074:269-282 — write role-set (owner, admin, pm), accounting excluded (Scope decision #2), PM-on-own-job narrowing present. |
| client_portal_access UPDATE: revocation path | PASS | 00074:284-301 — UPDATE allowed to (owner, admin, pm) with PM-on-own-job narrowing. WITH CHECK also org-scoped. |
| client_portal_access DELETE: absent by design | PASS | No DELETE policy. Revocation via revoked_at = now() is the documented soft-delete. Correct per CLAUDE.md. |
| client_portal_access platform-admin SELECT bypass | PASS | 00074:249-267 USING clause leads with is_platform_admin(). Matches 00049 canonical pattern. |
| activity_log RLS: RESTRICTIVE org-isolation policy | PASS | 00026:98-101 + 00049:32-36. RESTRICTIVE FOR ALL with platform-admin read-bypass. No INSERT-specific permissive policy — writes are server-side. |
| activity_log anon INSERT: blocked | PASS | Zero INSERT permissive policy; RESTRICTIVE org isolation USING = false for anon (user_org_id() = NULL). AC-B2-13 mechanically enforced. |
| activity_log actor_token_id addition: no new policy required | PASS | Nullable additive column. Service-role writes bypass RLS (correct). Anon still blocked by RESTRICTIVE. |
| New API routes: getCurrentMembership() bypass | CONDITIONAL PASS | Bypass intentional, documented (Path A / 00074 Scope decision #1). Equivalent guarantee: service-role + token hash lookup + application-layer client_id+org_id filter. See W-4 for NULL client_id gap. |
| New API routes: org_id filter on every query | PASS (W-4 caveat) | org_id derives from token row (not user input). Every downstream query uses .eq(org_id).eq(client_id). Fails if client_id is NULL — see W-4. |
| New API routes: auth failure response | PASS | validateOwnerToken returns null -> 404. Correct for token-based anon auth (avoids timing oracle per 00074 silent-no-op pattern). |
| Hardcoded ORG_ID search | PASS | grep returns zero matches. Only TEMPLATE_ORG_ID in cost-codes/template/route.ts (permitted exception). |
| Soft-delete only: no hard DELETE in migration 00104 | PASS | Migration SQL contains no DELETE FROM. Down-migration uses DROP COLUMN IF EXISTS / DROP INDEX IF EXISTS (schema DDL, not row-level delete). |
| status_history appends | PASS / N/A | client_portal_access has no status_history column (state tracked via revoked_at + expires_at per 00074 Scope decision #7). activity_log is append-only. |
| Partial unique index predicate matches 00074 pattern | PASS | B-2 index uses WHERE revoked_at IS NULL AND client_id IS NOT NULL. NOT NULL guard is correct — prevents NULL/NULL uniqueness collision. Consistent with 00074 index pattern. |
| Cross-tenant JOIN: resolve route | PASS | Token hash -> single row -> org_id + client_id extracted. All downstream queries scoped to both. No unscoped JOINs. |
| Cross-tenant JOIN: acknowledge route | PASS | Token validated first; draw ownership confirmed via client_id+org_id scope before writing activity_log. |
| Service-role usage bounded | PASS | Service-role used only in resolve endpoint (token lookup) and acknowledge endpoint (activity_log INSERT). Matches 00074 Scope decision #1. No new expansion. |
| Middleware PUBLIC_PATHS: /owner added but /api/owner-portal missing | WARNING W-1 | Plan adds /owner to PUBLIC_PATHS but NOT /api/owner-portal. Middleware line 113-120 returns JSON 401 for unauthenticated /api/* requests. acknowledge-pay-app POST from homeowner UI will 401. |

---
## Detailed audit — per-check analysis

### Check 1: New tables / columns — RLS posture

B-2 does not CREATE any new tables. It adds columns only:
1. client_portal_access.client_id — FK on existing RLS-enabled table.
2. activity_log.actor_token_id — FK on existing RLS-enabled table.

Adding columns does not disable RLS. Existing policies remain in force. Migration 00104 SQL contains no DROP POLICY or ALTER POLICY statements. Verified by reading the full migration SQL from B-2-PLAN.md §5 Task 1.

**Verdict: PASS.**

### Check 2: client_portal_access RLS — full posture attestation

Source: supabase/migrations/00074_client_portal.sql:247-301 (verified from disk).

SELECT policy (client_portal_access_org_read):
USING: app_private.is_platform_admin() OR (org_id = app_private.user_org_id() AND role IN (...) OR pm-on-own-job)
For anon: user_org_id() returns NULL -> org_id = NULL is always false. is_platform_admin() is false for anon. Zero rows returned to anon via PostgREST or RLS-bound client.

INSERT policy (client_portal_access_org_insert):
Role-set: (owner, admin, pm), accounting excluded (Scope decision #2). PM-on-own-job narrowing. No anon INSERT path.

UPDATE policy (client_portal_access_org_update):
Same role-set. Revocation (SET revoked_at = now()) uses this path. USING + WITH CHECK both org-scoped.

DELETE policy: ABSENT by design. Revocation via revoked_at is the soft-delete mechanism. Correct per CLAUDE.md.

Platform-admin bypass: SELECT policy leads with is_platform_admin() — cross-org read for debugging. WITH CHECK is strictly org-scoped — platform admins cannot write cross-org via RLS. Consistent with 00049 canonical pattern.

**Verdict: PASS on all four operations.**

### Check 3: activity_log RLS — B-2 interaction analysis

Source: 00026:97-105 + 00049:32-41 (verified from disk).

Final policy set after 00049:
1. RESTRICTIVE org isolation FOR ALL: USING (org_id = user_org_id() OR is_platform_admin()), WITH CHECK (org_id = user_org_id()).
2. RESTRICTIVE activity_log_delete_strict FOR DELETE: USING (org_id = user_org_id()).
3. PERMISSIVE activity_log_platform_admin_read FOR SELECT: USING is_platform_admin().
4. PERMISSIVE members read activity FOR SELECT: USING (org_id = user_org_id()).

B-2 acknowledge-pay-app writes via service-role client — bypasses RLS. The org_id in the INSERT comes from the resolved client_portal_access.org_id (derived from token row, not user input). This is correct.

Anon INSERT via PostgREST: RESTRICTIVE org isolation USING evaluates user_org_id() for anon = NULL -> false -> INSERT denied. Zero permissive INSERT policy exists for anon. AC-B2-13 is mechanically enforced by the existing RESTRICTIVE policy.

The plan claim that existing activity_log RLS is sufficient is correct and verified.

**Verdict: PASS. No new policies required on activity_log.**

### Check 4: getCurrentMembership() bypass — safety analysis

The two new routes do not call getCurrentMembership(). This is intentional and documented as Path A (00074 Scope decision #1).

Equivalent guarantee chain:
1. Token is 256-bit SHA-256 hash (Layer 1: entropy). 64-char hex, 32 bytes, 2^256 keyspace.
2. Hash lookup returns single matching client_portal_access row with revoked_at IS NULL AND expires_at > now() (Layer 2: hash-lookup scoping).
3. Every downstream query: .eq(org_id, row.org_id).eq(client_id, row.client_id) (Layer 3). NOTE: This layer FAILS if row.client_id IS NULL — see W-4.
4. RLS backstop: anon cannot read client_portal_access directly (Layer 4).

getCurrentMembership() assumes a Supabase session JWT. No such concept exists for an anon token-bearer. The token IS the credential. Service-role validation replaces session validation. This is a correct architectural pattern for token-based anon portals.

**Verdict: CONDITIONAL PASS. Safe by construction given W-4 is resolved (client_id must always be populated for Layer 3 to function).**

### Check 5: Hardcoded ORG_ID

Pattern checked: (const|let|var)s+ORG_IDs*= across src/ — zero matches found.
Only constant: TEMPLATE_ORG_ID in src/app/api/cost-codes/template/route.ts:12 — the one permitted exception per CLAUDE.md Dev Rules.
B-2 planned routes derive org_id from client_portal_access.org_id (token row). No fallback constant.

**Verdict: PASS.**

---
## Findings

### BLOCKING

None.

### WARNING

**W-1 — /api/owner-portal/* not in PUBLIC_PATHS; middleware will 401 anon API callers**

- File: src/middleware.ts:7 (PUBLIC_PATHS declaration) + src/middleware.ts:113-120 (the unauthenticated /api/* gate)
- Issue: The acknowledge-pay-app endpoint (POST /api/owner-portal/acknowledge-pay-app) is called by the homeowner browser with no session JWT — only the token in the POST body. Middleware line 113-120 checks !user && !isPublic(pathname) and for /api/* returns { error: Not authenticated, status: 401 }. Since /api/owner-portal is not in PUBLIC_PATHS and the plan Task 3 step 1 only adds /owner, the middleware fires 401 before the route handler runs.
- Impact: AC-B2-08 (pay-app acknowledgment endpoint writes activity_log row) will FAIL at execute time. The acknowledge button in the UI will always receive 401.
- Resolution: Add /api/owner-portal to PUBLIC_PATHS in Task 3 step 1. One-line fix. The simplest correct fix is to add /api/owner-portal alongside /owner in PUBLIC_PATHS.

**W-4 — create_client_portal_invite RPC not updated; new invites post-B-2 will have client_id = NULL; Layer 3 scoping breaks**

- File: supabase/migrations/00074_client_portal.sql:390-439 (the RPC INSERT at lines 426-435 does not include client_id)
- Issue: After B-2 ships, calling create_client_portal_invite(...) creates a client_portal_access row with client_id = NULL (column is nullable; RPC does not set it). When /api/owner-portal/resolve processes a token from such a row, row.client_id is NULL. The downstream query .eq(client_id, null) in PostgREST is interpreted as .is(client_id, null), which matches ALL rows where client_id IS NULL — not just the intended client. Combined with the .eq(org_id, ) filter, this limits exposure to the same org, but still allows a homeowner with a null-client_id token to see job data from ALL same-org jobs where client_id IS NULL. This is an intra-org data leak between homeowners.
- Impact: Layer 3 of the 4-layer defense (B-2-PLAN.md §4.a) fails for any new invite created after B-2 ships. Backfilled historical rows (from migration 00100) are protected. Only new invites are affected.
- Severity: HIGH. The plan claims mechanically enforced single-client scoping — that claim is false for new invites until this is resolved.
- Resolution options (plan author must choose one before execute dispatch):
  - Option A (preferred): Add a BEFORE INSERT OR UPDATE trigger on client_portal_access that auto-populates client_id from jobs.client_id when client_id IS NULL AND job_id IS NOT NULL. Add to migration 00104. Does not change the RPC signature.
  - Option B: Update create_client_portal_invite RPC to derive client_id from p_job_id -> jobs.client_id inside the RPC body (CREATE OR REPLACE). Backward-compatible if client_id is populated from the job lookup.
  - Option C (minimum viable): The resolve route MUST guard against row.client_id IS NULL and return 404 with a Sentry alarm (fail-safe posture). This degrades new tokens gracefully — no data leak occurs — but new tokens will not work until client_id is backfilled.

**W-3 — Token expiration default: EXPANDED-SCOPE says 1-year; 00074 is 90-day sliding; B-2-PLAN.md §4.a preserves 90-day**

- Files: EXPANDED-SCOPE.md Q5 line 211 vs B-2-PLAN.md §4.a
- Issue: EXPANDED-SCOPE Q5 states B-2 default in this slice: tokens have 1-year expiration. B-2-PLAN.md §4.a explicitly corrects this: B-2 preserves the existing 90-day sliding default. The plan is correctly surfacing this conflict for Jake acknowledgement at plan-review iter-1.
- Not an RLS concern but a security lifecycle policy concern requiring Jake formal acknowledgement before /np dispatch.
- Resolution: Jake acknowledges 90-day sliding window (not 1-year) in nwrpNNN dispatch authorization, OR amends EXPANDED-SCOPE Q5 text to inherited 90-day sliding from 00074; lifecycle policy deferred to Wave 1.1-Lite.

### NOTE

**N-1: activity_log mutual-exclusion is application-layer-only — rationale is sound**

The plan documents (B-2-PLAN.md §4.b) why no DB CHECK enforces user_id XOR actor_token_id. Three valid reasons: (a) legacy rows may have user_id = NULL with no token context; (b) B-3 trigger will write rows with both NULL (service-role context); (c) logActivity() is the only write path per 00026 comments (Writes happen server-side). Application-layer enforcement is acceptable given service-role is the write path — anon cannot circumvent the logActivity() guard. The one-write-path assumption is verified by 00026 architecture.

**N-2: create_client_portal_invite INSERT policy WITH CHECK does not require client_id populated — escalated to W-4**

After B-2 adds client_id as nullable, the INSERT policy WITH CHECK does not require it to be set. This allows builders to create portal invites with client_id = NULL via the existing INSERT policy. This is the same root cause as W-4 and has been escalated there.

**N-3: Platform-admin bypass on client_portal_access — correct posture confirmed**

00074 SELECT policy leads with is_platform_admin() — cross-org read for platform admins is intentional (debugging). Mutations remain org-scoped via WITH CHECK. Consistent with 00049 canonical pattern. No issue.

**N-4: activity_log pre-00049 policies use bare function calls, not helper-form (SELECT ...) wrapping**

The org isolation RESTRICTIVE policy on activity_log (00049:32-36) uses bare app_private.user_org_id() and app_private.is_platform_admin() rather than the (SELECT app_private.user_org_id()) session-cache wrapping mandated by nwrp155 D1 for the clients table policies (00100:288-308). This is a pre-existing policy predating nwrp155. B-2 does not touch it. Not a B-2 regression. Route to B-3 ARCHITECTURE.md RLS posture summary table sweep (DEF-WC-3 partial) for inclusion in the full policy-form audit.

---
## Per-table RLS attestation

| Table | RLS Enabled | Policy count | Anon SELECT | Anon INSERT | Anon UPDATE | Anon DELETE | Platform-admin bypass | B-2 impact |
|---|---|---|---|---|---|---|---|---|
| client_portal_access | YES (00074:247) | 3 (SELECT + INSERT + UPDATE) | NONE | NONE | NONE | N/A (no DELETE policy) | SELECT via is_platform_admin() in SELECT USING clause | Column add only; all policies unchanged |
| activity_log | YES (00026:97, modified 00049) | 4 after 00049 (RESTRICTIVE org isolation + delete-strict + platform-admin read + members read) | NONE | NONE | NONE | RESTRICTIVE delete-strict blocks | Platform-admin via activity_log_platform_admin_read PERMISSIVE + RESTRICTIVE USING bypass | Column add only; B-2 service-role writes bypass RLS (correct); anon blocked |
| clients | YES (00100:283) | 3 (SELECT + INSERT + UPDATE, helper-form) | NONE | NONE | NONE | N/A (no DELETE policy) | Via SELECT USING (SELECT app_private.is_platform_admin()) | Referenced via FK only; no policy changes |

---

## Token-resolution security model — layer-by-layer attestation

| Layer | Description | Status |
|---|---|---|
| Layer 1: Token entropy | 256-bit random hex (00074:423 gen_random_bytes(32)) | VERIFIED. 64-char hex = 32 bytes = 256 bits. Unique hash index enforces single-row result per hash. |
| Layer 2: Hash-lookup scoping | Single client_portal_access row via access_token_hash =  AND revoked_at IS NULL AND expires_at > now() | VERIFIED. 00074:188-190 unique index ensures at most one match. |
| Layer 3: Single-client scoping (NEW in B-2) | .eq(client_id, row.client_id).eq(org_id, row.org_id) on all downstream queries | FAILS for new invites — see W-4. row.client_id is NULL for any invite created after B-2 ships via existing RPC (00074:426-435 does not populate client_id). Resolution required before execute dispatch. |
| Layer 4: RLS backstop | Existing RLS prevents anon SELECT on client_portal_access; no anon policy | VERIFIED. Anon cannot bypass service-role API to read directly. |

---

## Verdict

**NEEDS WORK — two findings require resolution before execute dispatch; one requires Jake acknowledgment.**

| Finding | Severity | Blocks execute? | Resolution |
|---|---|---|---|
| W-4: Layer 3 scoping fails for new invites (client_id = NULL from existing RPC post-B-2) | HIGH | YES | Add trigger on INSERT OR update RPC OR add fail-safe null guard in resolve route. Must be in migration 00104 before execute. |
| W-1: /api/owner-portal not in PUBLIC_PATHS; middleware 401s anon acknowledge POST | HIGH | YES | Add /api/owner-portal to PUBLIC_PATHS in Task 3 step 1. One-line fix. |
| W-3: 90-day vs 1-year token expiry conflict between EXPANDED-SCOPE and PLAN | MEDIUM | NO (requires Jake ack) | Jake acknowledges 90-day posture at /np dispatch OR amends EXPANDED-SCOPE Q5. |

No BLOCKING findings. No hardcoded ORG_IDs. No hard deletes. No anon INSERT paths. Existing RLS on both modified tables (client_portal_access + activity_log) is sound and sufficient for the service-role-mediated anon access pattern. W-4 is a gap in the new application-layer defense claim, not a breakdown of existing RLS — the RLS backstop continues to protect against anon direct reads regardless of W-4 state. W-1 and W-4 must both be resolved in the plan body before /np dispatches execute.

---

## Resolution checklist for execute dispatch

- [ ] W-4: Plan author adds one of three remediation options for client_id auto-population on new invites (trigger preferred). Code must be in migration 00104 before execute.
- [ ] W-1: Plan author amends Task 3 step 1 to add /api/owner-portal to PUBLIC_PATHS (in addition to /owner).
- [ ] W-3: Jake acknowledges in nwrpNNN that B-2 inherits 90-day sliding window. EXPANDED-SCOPE Q5 text amended OR Jake confirms 90-day is the intended posture.
- [ ] N-4 carry-forward: Route to B-3 RLS posture summary table sweep for helper-form wrapping audit on activity_log pre-00049 policies.
