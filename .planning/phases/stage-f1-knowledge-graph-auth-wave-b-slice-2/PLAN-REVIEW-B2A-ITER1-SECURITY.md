# Plan-Review B-2a — Security Reviewer (LOAD-BEARING)
# iter-1 — Token-Issuance Security Model

**Generated:** 2026-05-21
**Reviewer role:** Security Reviewer (LOAD-BEARING per nwrp202 dispatch)
**Plan reviewed:** `B-2a-PLAN.md` (2289 lines, committed 7198e86)
**Threat model severity:** HIGH (external token surface + cross-tenant leak closure + foundational security infra)

---

## Verdict: NEEDS-WORK

**Summary:** B-2a-PLAN.md is architecturally sound and closes the B-4 NULL-leak, the timing-oracle, and the non-functional rate-limit. Four issues require resolution before /nx: (1) the `idx_client_portal_access_token_hash` partial index from 00074 is not replaced — the token-resolution hot path re-introduces the timing oracle it was meant to eliminate; (2) the 3 re-defined SECURITY DEFINER RPCs (create_client_portal_invite, submit_client_portal_message, mark_client_portal_message_read) lack REVOKE/GRANT statements in the forward migration body, leaving the 00074 grants in an indeterminate state post-CREATE OR REPLACE; (3) the §6.f rate-limit TS code block (pseudo-code vestige) contradicts the §5 Task 1 §5d implementation and must be reconciled; (4) the admin revoke route exposes a CSRF gap that is unmitigated for authenticated-admin sessions. Latitude #3: Option A accepted. Latitude #4: in-scope accepted.

---

## Per-threat-surface findings

### Threat Surface 1 — `create_client_portal_invite` RPC NULL-leak fix (B-4)

**Finding SEC-B2a-01 — PASS (with caveat)**

The CREATE OR REPLACE body at §5 Task 1 §3 correctly:
- Adds `_client_id UUID` DECLARE variable
- Issues `SELECT j.client_id INTO _client_id FROM public.jobs j WHERE j.id = p_job_id AND j.org_id = p_org_id` (same-org guard present — defense-in-depth, composite FK is BY-CONSTRUCTION)
- RAISES EXCEPTION if `_client_id IS NULL`
- Injects `_client_id` into the INSERT VALUES list
- Preserves caller-authorization checks from 00074:407-421 byte-for-byte
- Preserves `SET search_path = public, pg_temp` from 00074:400

Three AC-B2a-06 falsifiable queries per nwrp201/202 §5 are defined at §9 and cover: backfill completeness, RPC produces non-NULL client_id, cross-org rejection with zero-leakage-row clause. All three are properly falsifiable.

**Caveat — BLOCKING: missing REVOKE/GRANT after CREATE OR REPLACE (see SEC-B2a-05 below).**

The B-4 leak is closed at the function-body level. The cross-org invite rejection (AC-B2a-06 Query 3) relies on the existing 00074:407-421 auth check, which is byte-for-byte preserved — confirmed against 00074 source. The "zero-leakage-row clause" in AC-B2a-06 Query 3 correctly post-hoc validates that no partial write occurred. PASS on the leak closure itself.

---

### Threat Surface 2 — Token lifecycle (1-year + admin revocation)

**Finding SEC-B2a-02 — PASS**

- Column default change at §5 Task 1 §2: `ALTER TABLE ... ALTER COLUMN expires_at SET DEFAULT (now() + interval '1 year')` is correct DDL.
- RPC fallback in re-defined create_client_portal_invite body: `COALESCE(p_expires_at, now() + interval '1 year')` — confirmed present at line 1153.
- Sliding-window UPDATE in submit_client_portal_message (§3b): UPDATE now sets `expires_at = now() + interval '1 year'` — confirmed at line 1208. Consistent with nwrp200 LOCKED.
- Sliding-window UPDATE in mark_client_portal_message_read (§3c): UPDATE now sets `expires_at = now() + interval '1 year'` — confirmed at line 1262. Consistent.

Latitude #4 (in-scope disposition) is confirmed as the security-correct choice. Deferring would undermine nwrp200's 1-year lock because any token use immediately after B-2a ship would roll the window back to 90 days, contradicting the locked decision. PASS.

**Finding SEC-B2a-03 — PASS (revocation audit log)**

Admin revoke route (§5 Task 7 line 1721): calls `logActivity({ org_id, user_id: membership.user_id, actor_token_id: null, entity_type: 'client_portal_access', action: 'revoked', ... })`. This correctly uses `user_id` (authenticated admin) NOT `actor_token_id` (per D-10). The revocation audit-log entry uses the authenticated admin's `user_id` — correct semantics.

`updateWithLock()` is invoked at Task 7 line 1720 with `expected_updated_at` per D-11 — optimistic locking present. The concurrent double-revoke (T-B2a-09) is mitigated.

**Finding SEC-B2a-04 — MEDIUM: CSRF gap on admin revoke route**

The admin revoke route is added to `PUBLIC_PATHS` at `/api/owner-portal` (covers `/api/owner-portal/admin/revoke-token`). The plan correctly notes that `getCurrentMembership()` is still called inside the route handler (PUBLIC_PATHS only bypasses the auth redirect, not the auth check). However, the plan documents NO CSRF protection on this state-mutating POST endpoint.

In a Next.js App Router context, the Supabase cookie-based session is the auth mechanism. A cross-site POST with `content-type: application/json` from a malicious page CAN include the cookie (if `SameSite=Lax` or `SameSite=None`). B-2a's threat model §6.j lists T-B2a-08 (unauthorized revoke) as mitigated by `getCurrentMembership()` + role check, but does not enumerate CSRF as a sub-threat. The plan has NO `Origin`/`Referer` header validation, no CSRF token, and no `SameSite=Strict` assertion.

Severity: MEDIUM (insider/phishing risk — the attacker needs a logged-in admin to visit a malicious page, which is a realistic attack surface for an internal tool). Not BLOCKING because: (a) the mutation requires an authenticated admin session, limiting attacker surface; (b) `expected_updated_at` in the request body provides partial replay-protection (requires knowledge of the current `updated_at` value); (c) Next.js App Router's default cookie handling is `SameSite=Lax` for most Supabase clients, which blocks cross-site POSTs from navigations but allows subresource requests. Recommend adding an `Origin` header check or Supabase CSRF token in Task 7.

---

### Threat Surface 3 — Rate-limit infrastructure (B-6)

**Finding SEC-B2a-05-RL — PASS with NOTE**

The forward migration at §5 Task 1 §5a-§5d correctly:
- Creates `owner_portal_rate_limit` table with RLS enabled + no policies = service-role-only access
- Creates `cleanup_owner_portal_rate_limit()` SECURITY DEFINER with `SET search_path = public, pg_temp` + REVOKE PUBLIC + GRANT service_role
- Creates `record_owner_portal_request(TEXT, TEXT, TIMESTAMPTZ)` SECURITY DEFINER with `SET search_path = public, pg_temp` + REVOKE PUBLIC + GRANT service_role

The atomic UPSERT pattern in `record_owner_portal_request` at lines 1318-1323 uses `INSERT ... ON CONFLICT (key_type, key_value, window_start) DO UPDATE SET request_count = public.owner_portal_rate_limit.request_count + 1 RETURNING request_count` — this is fully atomic at the Postgres level. Correct.

**NOTE:** The §6.f rate-limit TS pseudo-code block at lines 848-888 contradicts §5 Task 6/§5 Task 1 §5d by describing a `.upsert()` approach with a comment saying "we need explicit increment" — this pseudo-code is NOT the intended implementation. Task 6 description at line 1690 correctly says to call `record_owner_portal_request` RPC. The §6.f pseudo-code block is a vestige from an earlier draft. Executor must implement Task 6 per Task 6's description (RPC call), NOT per the §6.f pseudo-code. The plan should clarify this explicitly to avoid executor confusion.

The fail-open behavior on DB error (lines 865-868) is acceptable per the plan's rationale. The opportunistic cleanup at `Math.random() < 0.01` (1% probability) is low but acceptable for the projected low-traffic portal profile.

Rate-limit limits: TOKEN_LIMIT_PER_MINUTE=30 and IP_LIMIT_PER_MINUTE=60. These are reasonable for a homeowner portal (single-digit requests/hour profile per §6.f). No concern.

---

### Threat Surface 4 — Index timing oracle elimination (B-7)

**Finding SEC-B2a-06 — BLOCKING: partial index on token_hash NOT replaced**

This is the most significant security finding. B-2a eliminates the timing oracle on the `(org_id, client_id, job_id, revoked_seq)` unique index by removing `WHERE revoked_at IS NULL` from that index. However, the existing `idx_client_portal_access_token_hash` from 00074 at line 188-190 is a PARTIAL index:

```sql
CREATE UNIQUE INDEX idx_client_portal_access_token_hash
  ON public.client_portal_access (access_token_hash)
  WHERE revoked_at IS NULL;
```

The `resolveOwnerToken()` function in token.ts queries at lines 653-657:

```typescript
const { data, error } = await supabase
  .from("client_portal_access")
  .select("id, org_id, client_id, job_id, invited_at, expires_at, revoked_at")
  .eq("access_token_hash", hash)
  .maybeSingle();
```

This query does NOT include `.eq("revoked_at", null)` or `.is("revoked_at", null)` in the Supabase filter chain. The app-layer revocation check is applied AFTER the fetch (line 660: `if (data.revoked_at !== null) return null`). This means:

- Lookup of a VALID (non-revoked) token: query hits the partial index (fast, ~1ms).
- Lookup of a REVOKED token: query does NOT match the partial index predicate `WHERE revoked_at IS NULL` — Postgres falls back to a seq-scan or full index scan (slow, ~10-100ms).
- Lookup of a NEVER-EXISTED token: query misses the index entirely (also seq-scan if no other covering index).

The timing oracle that B-7 was specifically designed to eliminate is re-introduced on the primary lookup path. An attacker probing token validity can distinguish "this token was revoked" from "this token never existed" by measuring response time from `resolveOwnerToken()`.

**Required fix:** Either:
(a) Drop `idx_client_portal_access_token_hash` in 00104 and replace with a full (non-partial) index on `(access_token_hash)` — the uniqueness constraint on the hash ensures collisions are impossible regardless; OR
(b) Add a full covering index `CREATE UNIQUE INDEX idx_client_portal_access_token_hash_full ON public.client_portal_access (access_token_hash)` (no WHERE predicate) and DROP the partial index.

The app-layer filter approach in `resolveOwnerToken()` is sound for the unique-index case only if the underlying index is non-partial. The plan already states this principle correctly for the `(org_id, client_id, job_id, revoked_seq)` index, but fails to apply it to the token-hash lookup path.

**Impact:** This BLOCKING finding partially undermines the B-7 resolution. The composite `(org_id, client_id, job_id, revoked_seq)` index is correctly non-partial, but the hot-path token resolution index is not, preserving the timing oracle on the most-executed code path (every page load on the owner portal calls `resolveOwnerToken()`).

---

### Threat Surface 5 — Search_path hardening (all new SECURITY DEFINER functions)

**Finding SEC-B2a-07 — HIGH: 3 re-defined RPCs missing REVOKE/GRANT statements**

The plan defines 5 SECURITY DEFINER functions in the forward migration:
1. `create_client_portal_invite` (re-defined via CREATE OR REPLACE, §3) — no REVOKE/GRANT statement
2. `submit_client_portal_message` (re-defined via CREATE OR REPLACE, §3b) — no REVOKE/GRANT statement
3. `mark_client_portal_message_read` (re-defined via CREATE OR REPLACE, §3c) — no REVOKE/GRANT statement
4. `cleanup_owner_portal_rate_limit` (new, §5b) — REVOKE PUBLIC + GRANT service_role present
5. `record_owner_portal_request` (new, §5d) — REVOKE PUBLIC + GRANT service_role present

All five have `SET search_path = public, pg_temp` — search_path hardening is present. PASS on that requirement.

However, `CREATE OR REPLACE FUNCTION` in Postgres preserves existing GRANT/REVOKE state from the previous definition, meaning the 00074 grants remain in effect. This creates an inconsistency:

- `create_client_portal_invite` (00074 line 441-443): `GRANT EXECUTE ... TO authenticated` — this persists post-CREATE OR REPLACE. Not a security regression (it was already granted).
- `submit_client_portal_message` (00074 line 496-497): `GRANT EXECUTE ... TO anon` — this persists post-CREATE OR REPLACE. The B-2a re-definition contains a sliding-window change that is now active for anon-callable RPCs. This is intentional.
- `mark_client_portal_message_read` (00074 line 545-546): `GRANT EXECUTE ... TO anon` — same.

The concern is not that the grants are wrong — they are intentional, matching 00074's design. The concern is that the plan's threat model at T-B2a-12 ("SECURITY DEFINER function PUBLIC EXECUTE inheritance — mitigate via REVOKE PUBLIC per 00103 precedent") is inconsistently applied: it covers the 2 new functions (#4 and #5) but NOT the 3 re-defined functions (#1-3). For the re-defined RPCs, `CREATE OR REPLACE` resets to PUBLIC execute by default in PostgreSQL before any GRANT takes effect.

**Wait — clarification of Postgres semantics:** In Postgres, `CREATE OR REPLACE FUNCTION` DOES preserve existing GRANTs. However, the 00103 precedent (migration 00103_revoke_public_execute_security_definer_triggers.sql) shows that the project has chosen to explicitly `REVOKE EXECUTE FROM PUBLIC` on SECURITY DEFINER functions even when they have existing grants. This is because a `CREATE OR REPLACE` on a function that PREVIOUSLY had its PUBLIC execute revoked will, per Postgres semantics, restore the default PUBLIC EXECUTE grant on the new function body (the function OID changes or grants reset in some Postgres versions).

The safe approach per 00103 precedent is to add explicit REVOKE/GRANT pairs after each `CREATE OR REPLACE`. The plan does this for the 2 new functions but omits it for the 3 re-defined functions. Given that:
- `create_client_portal_invite` SHOULD remain `TO authenticated` (builder-side)
- `submit_client_portal_message` SHOULD remain `TO anon` (client-side)
- `mark_client_portal_message_read` SHOULD remain `TO anon` (client-side)

The missing REVOKE/GRANT pairs do not change the functional security posture IF Postgres preserves existing GRANTs on CREATE OR REPLACE. However, the project's 00103 precedent and T-B2a-12 mitigation claim both demand explicit REVOKE/GRANT. Severity: HIGH rather than BLOCKING because the functional security posture is unchanged, but the explicit 00103 pattern is violated and the T-B2a-12 mitigation claim is inaccurate as written.

**Required fix:** Add explicit REVOKE/GRANT pairs after each of the 3 re-defined RPCs in the forward migration:
```sql
-- After §3 (create_client_portal_invite re-definition):
REVOKE EXECUTE ON FUNCTION public.create_client_portal_invite(UUID,UUID,TEXT,TEXT,JSONB,TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_client_portal_invite(UUID,UUID,TEXT,TEXT,JSONB,TIMESTAMPTZ) TO authenticated;

-- After §3b (submit_client_portal_message re-definition):
REVOKE EXECUTE ON FUNCTION public.submit_client_portal_message(TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_client_portal_message(TEXT,TEXT) TO anon;

-- After §3c (mark_client_portal_message_read re-definition):
REVOKE EXECUTE ON FUNCTION public.mark_client_portal_message_read(TEXT,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_client_portal_message_read(TEXT,UUID) TO anon;
```

The down migration also restores these 3 RPCs via CREATE OR REPLACE but similarly lacks REVOKE/GRANT — the same fix should be applied to the down migration body.

---

### Threat Surface 6 — Revocation API path threat model

**Finding SEC-B2a-08 — PASS (with MEDIUM caveat)**

The threat model §6.j covers:
- T-B2a-08 (cross-tenant revoke via unauthorized actor): mitigated by `getCurrentMembership()` + role check. PASS.
- T-B2a-09 (double-revoke race): mitigated by `updateWithLock`. PASS.

The plan notes at §5 Sweep 3 line 253: "CRITICAL: middleware adding `/api/owner-portal/*` to PUBLIC_PATHS does NOT mean the route is unauthenticated. The admin revoke route MUST call `getCurrentMembership()`... PUBLIC_PATHS only bypasses the auth REDIRECT, NOT the route handler's own auth check." This warning is present and correct.

Cross-org revoke probe (AC-B2a-08 Step 7): verified that `updateWithLock` with `orgId = membership.org_id` will return 0 rows when the token belongs to a different org (RLS-scoped). The `updateWithLock` signature at `src/lib/api/optimistic-lock.ts` includes `orgId` in the WHERE clause, preventing cross-tenant mutation. PASS.

PM role blocked at route handler (403) — explicitly verified at AC-B2a-08 Step 6. PASS.

CSRF caveat already documented in SEC-B2a-04 (MEDIUM). No separate BLOCKING finding here beyond that.

---

### Threat Surface 7 — Admin UI revocation threat model

**Finding SEC-B2a-09 — PASS with NOTE**

The admin UI at `/admin/owner-portal-tokens/page.tsx` is a server component with `getCurrentMembership()` + `owner|admin` role gate. No novel design patterns. Reuses existing admin section conventions (`/admin/users/page.tsx` mirror). The `RevokeTokenRow.tsx` client component POSTs to `/api/owner-portal/admin/revoke-token` with `{ token_id, expected_updated_at }`.

The server component does NOT expose plaintext tokens (only hashes are stored; plaintext is returned once at invite creation and not stored — confirmed per 00074 header). The token list shows `id` (truncated), metadata, and status. No XSS risk from token display.

**NOTE:** The `RevokeTokenRow.tsx` confirm modal is described but the implementation details are plan-author discretion. Executor must ensure the confirm dialog is not auto-dismissable (no keyboard shortcut that bypasses the modal) and that the "Revoke" action requires explicit click confirmation. This is an implementation note, not a plan-level blocking finding.

**NOTE:** The plan does not specify that the admin token list page should enforce a `Cache-Control: no-store` header. Without this, a shared browser caching proxy could return stale token state (showing "Active" for a token that has been revoked). Recommend adding this to Task 8's verification step. Not BLOCKING given admin-only access.

---

### Internal consistency finding

**Finding SEC-B2a-10 — NOTE: summary description vs implementation inconsistency on index columns**

Section 1.6 (line 108) describes the timing-oracle-eliminating index as `(org_id, client_id, job_id, revoked_at, expires_at)`. The actual index defined in §5 Task 1 §1f (line 1089-1091) and AC-B2a-05 (line 1839) is `(org_id, client_id, job_id, revoked_seq) WHERE client_id IS NOT NULL`. These are different index shapes. The §1.6 description appears to be from an earlier draft of the plan (pre-Latitude #3 Option A resolution) and was not updated.

This is a documentation inconsistency, not an implementation gap (§5 Task 1 is the authoritative implementation section). Executor should update the §1.6 summary line to match the §5 implementation. Not BLOCKING.

---

## Latitude #3 Disposition — `revoked_seq` column + re-invitation pattern

**Security reviewer disposition: OPTION A ACCEPTED.**

Rationale:
1. **Option C is rejected** per nwrp202 §4 prohibition (re-introduces partial index timing oracle). No security-reviewer exception available.
2. **Option B is rejected on security grounds** despite the schema simplicity argument. Option B performs a hard DELETE on the revoked row before re-invitation. This:
   - Violates CLAUDE.md "Never delete records — soft delete only" Dev Rule — this is a non-negotiable rule per the codebase
   - Severs the `activity_log.actor_token_id` FK chain (ON DELETE SET NULL fires on the hard delete, which destroys the audit trail linkage for any future audit of "which token performed action X")
   - Breaks row-identity across revocation/re-invitation cycles — admin UI cannot show "this client had 3 prior invite cycles"
   - Creates a subtle security gap: an attacker who somehow triggers a re-invitation before the hard delete completes has a window where the old revoked token might be simultaneously valid (race condition on hard delete + RPC insert)
3. **Option A** preserves audit trail, soft-delete semantics, and satisfies the no-timing-oracle requirement via the `revoked_seq` discriminator. The 5-line schema addition is minimal and matches Q12 uniform versioning posture (status_history JSONB pattern extended to the sequence counter). Row identity survives re-invitation; every revocation cycle is recoverable from the `activity_log`. The `(org_id, client_id, job_id, revoked_seq)` unique constraint correctly allows one NEW row with `revoked_seq=0` after the old row's seq is bumped to ≥1.

**One implementation note for Option A:** the admin revoke route (Task 7 line 1720) must compute `revoked_seq` as `MAX(revoked_seq) + 1` for the specific `(org_id, client_id, job_id)` triplet before calling `updateWithLock`. A sub-select or a separate query is needed. The plan describes this at line 582 ("revoked_seq: <max+1 sub-query>") without providing the exact SQL. Executor must implement this as a Postgres sub-select within the update or a prior SELECT MAX() under the same transaction to avoid race conditions.

---

## Latitude #4 Disposition — sliding-window UPDATE 90-day → 1-year in 2 RPCs

**Security reviewer disposition: IN-SCOPE ACCEPTED (plan-author default).**

Both RPCs are re-defined in §5 Task 1 §3b and §3c with the sliding-window UPDATE changed to `1 year`. Confirmed at lines 1208 and 1262. The alternative (defer) would create inconsistent semantics where the column default is 1-year but any token use immediately regresses to 90-day. This would undermine the nwrp200 LOCKED decision within 90 days of first token use. Security posture: in-scope is the correct choice.

---

## iter-1 SYNTHESIS B-1..B-11 Resolution Table

| Finding | Description | B-2a Resolution | Status |
|---------|-------------|-----------------|--------|
| B-1 | App-layer scoping convention, not construction | `getScopedOwnerPortalClient` + `assertDrawBelongsToToken` in `token.ts` | PASS — helpers correct; `import "server-only"` present; scope injection non-bypassable at type level |
| B-2 | `client_portal_access.client_id` FK lacks same-org invariant | Composite FK `(org_id, client_id) REFERENCES clients(org_id, id)` after `UNIQUE(org_id, id)` on clients | PASS — migration §1a+§1b+§1d correct; NOT VALID + VALIDATE CONSTRAINT pattern sound; both single-col and composite FK declared |
| B-3 | Acknowledge SQL not pinned | `assertDrawBelongsToToken` with JOIN to jobs verifying `client_id` + `org_id` | PASS — pinned SQL at lines 747-762; JOIN path cannot be bypassed; cross-validates `job.client_id === resolvedToken.client_id` |
| B-4 | RPC produces `client_id=NULL` | CREATE OR REPLACE with `SELECT j.client_id INTO _client_id` + RAISE on NULL | PASS — leak closed; caveat: REVOKE/GRANT missing (SEC-B2a-07) but does not reopen the leak |
| B-5 | `/api/owner-portal/*` NOT in PUBLIC_PATHS | Middleware PUBLIC_PATHS adds `/owner` + `/api/owner-portal` | PASS — both paths added; route handlers retain their own auth checks |
| B-6 | In-process Map rate-limit non-functional on Vercel | DB-backed counter table + atomic RPC + TTL cleanup | PASS — counter persists in DB across invocations; confirms Vercel-safe |
| B-7 | Partial index timing oracle | Full covering index `(org_id, client_id, job_id, revoked_seq) WHERE client_id IS NOT NULL` | PARTIAL — the `(org_id, client_id, job_id, revoked_seq)` index is non-partial (timing oracle eliminated on that path), BUT the existing `idx_client_portal_access_token_hash WHERE revoked_at IS NULL` from 00074 is NOT replaced; the hot-path `resolveOwnerToken()` re-introduces the timing oracle (SEC-B2a-06 BLOCKING) |
| B-8 | PostgREST FK citations missing | `client_portal_access_client_id_fkey` + `client_portal_access_org_id_client_id_fkey` + `client_portal_access_job_id_fkey` cited | PASS — all 3 FK names cited in §5 Task 1 + AC-B2a-09 + §5 Task 8; also `draws_job_id_fkey` cited for assertDrawBelongsToToken |
| B-9 | Partial unique expired-token gap | Predicate extended; with Option A: `(org_id, client_id, job_id, revoked_seq) WHERE client_id IS NOT NULL` — expired tokens distinguished by seq | PASS — Option A `revoked_seq` discriminator handles this correctly (revoked rows have seq ≥1; expired-but-not-revoked rows still have seq=0 but re-invitation would hit the RAISE EXCEPTION in the RPC if client_id is NULL, or the unique constraint if a prior row has seq=0) — NOTE: executor must verify that expired-but-not-revoked rows don't block re-invitation (they DO still have seq=0); this may need the RPC to first revoke+increment expired rows before inserting. Surface to plan-author at execute time. |
| B-10 | Partial unique blocks 1-client-N-jobs | Composite key `(org_id, client_id, job_id, revoked_seq)` — different `job_id` values allowed | PASS — confirmed in §5 Task 1 §1f index definition |
| B-11 | `draws` + `change_orders` job_id indexes not verified | `draws.job_id` added in §6 of migration; `change_orders.job_id` verified extant at 00028:171 | PASS — `CREATE INDEX IF NOT EXISTS idx_draws_job_id ON public.draws (job_id)` at line 1331; 00028:171 confirmed extant |

---

## Additional findings not in B-1..B-11

**Finding SEC-B2a-11 — NOTE: `activity_log.actor_token_id` mutual-exclusion is application-layer only**

The plan at line 960 explicitly calls out: "No DB CHECK constraint on mutual-exclusion — both fields can be NULL legitimately." The note says "Application-layer enforcement via the helper logActivity caller is sufficient" and asks for iter-1 security-reviewer explicit signoff.

Security-reviewer signoff: ACCEPTED. The mutual-exclusion between `user_id` and `actor_token_id` is a business-logic concern, not a security constraint. A row with both NULL (e.g., service-role context insertions from triggers) or both set is not a security vulnerability — it would be an audit-log data quality issue. The risk is low given that all write paths go through `logActivity()` which is the single write helper. No DB CHECK constraint required.

**Finding SEC-B2a-12 — NOTE: `resolveOwnerToken` input validation**

The input validation at line 648 checks `typeof plaintextToken !== "string" || plaintextToken.length !== 64`. The plaintext token is the output of `encode(extensions.gen_random_bytes(32), 'hex')` which produces a 64-character hex string. The length-64 check is correct. The absence of a regex charset check (only hex chars: `[0-9a-f]{64}`) is acceptable — the SHA-256 hash comparison (`createHash("sha256").update(plaintextToken).digest("hex")`) will produce a deterministic hash regardless of input charset; a non-hex input would hash to a value that will never match the stored SHA-256 hash of a valid token, so it would safely return null. No security gap.

---

## Rule 9 alignment — cross-reviewer factual disagreement check

No cross-reviewer factual disagreements identified on the B-2a-specific claims. The following items are flagged for synthesis cross-check:

1. **SEC-B2a-06 (BLOCKING: token-hash partial index)** — this finding is NOT in the B-2-PLAN.md iter-1 SYNTHESIS (B-1..B-17); it is a NEW finding specific to B-2a-PLAN.md's implementation choices. Multi-tenant-architect and database-reviewer should confirm whether this finding appears in their B-2a reports for cross-reviewer agreement.

2. **SEC-B2a-07 (HIGH: missing REVOKE/GRANT for 3 re-defined RPCs)** — the plan's T-B2a-12 mitigation claim says "REVOKE EXECUTE ... FROM PUBLIC on new SECURITY DEFINER functions" but the 3 re-defined functions are not "new" by the plan's own language. This is a plan-internal tension, not a cross-reviewer factual disagreement. Synthesis reviewer should confirm no other reviewer made a contradictory claim about whether the re-defined RPCs' REVOKE/GRANT state is correct.

3. **B-9 re-invitation gap (expired-but-not-revoked rows)** — B-2a resolves B-9 via Option A `revoked_seq`, but the exact behavior of expired-but-not-revoked rows under the new unique constraint has not been fully analyzed. If an active token expires without being revoked, it has `revoked_seq=0` and its `(org_id, client_id, job_id, revoked_seq=0)` slot remains occupied in the unique index. A new invitation for the same `(org_id, client_id, job_id)` would collide on `revoked_seq=0`. The RPC's re-invitation path must increment or handle this case. This is POTENTIALLY a blocking gap — flagging to synthesis for database-reviewer cross-check.

---

## Recommendations

1. **BLOCKING (SEC-B2a-06):** Add to migration 00104 (before COMMIT):
   ```sql
   -- Drop the partial token-hash index from 00074 (timing oracle on hot-path lookup)
   DROP INDEX IF EXISTS public.idx_client_portal_access_token_hash;
   -- Replace with full non-partial index (app-layer filters revoked_at post-fetch per D-04)
   CREATE UNIQUE INDEX idx_client_portal_access_token_hash
     ON public.client_portal_access (access_token_hash);
   -- Down migration reversal: recreate 00074 partial shape
   -- DROP INDEX IF EXISTS public.idx_client_portal_access_token_hash;
   -- CREATE UNIQUE INDEX idx_client_portal_access_token_hash
   --   ON public.client_portal_access (access_token_hash) WHERE revoked_at IS NULL;
   ```
   Update AC-B2a-05 to include verification that `idx_client_portal_access_token_hash` has no WHERE predicate.

2. **HIGH (SEC-B2a-07):** Add explicit REVOKE/GRANT pairs in the forward migration after each of the 3 `CREATE OR REPLACE` re-definitions. The GRANTs must match 00074's original posture (authenticated for create_invite; anon for submit_message and mark_read). Mirror the same pairs in the down migration's restored RPC blocks.

3. **MEDIUM (SEC-B2a-04):** Add `Origin` header validation in Task 7 admin revoke route handler before calling `getCurrentMembership()`:
   ```typescript
   const origin = request.headers.get("origin");
   const appUrl = process.env.NEXT_PUBLIC_APP_URL;
   if (origin && appUrl && !origin.startsWith(appUrl)) {
     return NextResponse.json({ error: "forbidden" }, { status: 403 });
   }
   ```
   Or defer CSRF protection to B-2b scope with explicit Jake acceptance and a TD entry.

4. **NOTE (B-9 re-invitation edge case):** Verify that the `create_client_portal_invite` RPC handles the case where an expired-but-not-revoked token row occupies the `(org_id, client_id, job_id, revoked_seq=0)` unique slot. Options: (a) the RPC auto-revokes (sets revoked_at + increments revoked_seq) on any existing active-or-expired row before inserting; (b) the unique index predicate adds `AND expires_at > now()` so expired rows fall out of scope (re-introduces mild timing oracle but less severe than the revoked case). Surface to plan-author for disposition.

5. **NOTE (SEC-B2a-10):** Update §1.6 summary description of the timing-oracle index from `(org_id, client_id, job_id, revoked_at, expires_at)` to `(org_id, client_id, job_id, revoked_seq) WHERE client_id IS NOT NULL` to match the actual implementation.

---

**Reviewer:** Security Reviewer (LOAD-BEARING)
**Date:** 2026-05-21
**Verdict:** NEEDS-WORK — 1 BLOCKING + 1 HIGH + 1 MEDIUM. BLOCKING must be resolved before /nx dispatch.
