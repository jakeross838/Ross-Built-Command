---
reviewer: security-reviewer
plan: B-2
plan-name: client-portal-client-id-fk-owner-portal-path-a
review-type: plan-review-iter1-security
authored: 2026-05-19
authority: nwrp198 §23 (load-bearing security gate; first user-facing F1 surface; token-based external portal; mobile-mandatory; multi-tenant)
files-read:
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2-PLAN.md
  - .planning/expansions/stage-f1-knowledge-graph-auth-wave-b-slice-2-EXPANDED-SCOPE.md
  - supabase/migrations/00074_client_portal.sql
  - supabase/migrations/00026_phase5_scaffolding_tables.sql
  - src/middleware.ts
  - src/lib/activity-log.ts
verdict: CONDITIONAL PASS — 2 BLOCKINGs + 4 HIGHs + 4 MEDIUMs + 3 INFOs require resolution before /nx
---

# Plan-Review Iter-1 Security Review — B-2

## Executive Summary

B-2 ships the first external-facing F1 surface: a token-based homeowner portal at `/owner/{token}`. The token security model is sound in concept (256-bit entropy, hash-stored, service-role mediation, RLS backstop). However, two blocking gaps exist: (1) the in-process rate-limit Map is stateless across Vercel invocations and will not function as designed, rendering brute-force protection purely theoretical; (2) the `idx_client_portal_access_token_hash` unique index predicate (`WHERE revoked_at IS NULL`) creates a timing oracle vulnerability where revoked-token lookups differ from not-found lookups in database query cost. Four additional HIGH findings require resolution before ship; four MEDIUMs may proceed with documented acceptance.

The 4-layer defense model is structurally correct. The EXPANDED-SCOPE Q5 / 90-day vs 1-year deviation is properly flagged and surfaced for Jake decision; that item is not blocking by itself. The D-079 PII fence is honored. The actor_token_id mutual-exclusion via application-layer is acceptable given documented constraints.

---

## Mandatory Test Results

### Test 1 — Token Entropy and Generation

**Verdict: PASS**

Mechanical evidence (00074:423):
```sql
_plaintext := encode(extensions.gen_random_bytes(32), 'hex');
_hash := encode(extensions.digest(_plaintext, 'sha256'), 'hex');
```

- `gen_random_bytes(32)` = 32 bytes = 256 bits of cryptographic entropy from PostgreSQL's `pg_crypto` extension, which draws from the OS CSPRNG (`/dev/urandom` on Linux).
- The hex-encoded output is 64 characters; the SHA-256 digest of that string is stored, not the plaintext.
- The 64-char CHECK constraint on `access_token_hash` (00074:161) rejects accidental plaintext storage (which would be 64 chars too, but SHA-256 of a 64-char hex is a different 64 chars — the CHECK alone does not prevent plaintext storage; the CHECK was designed against the 48-char org_invites pattern, not against same-length plaintext).

**Residual note on CHECK adequacy:** The CHECK `char_length(access_token_hash) = 64` is necessary but not sufficient to prevent storing the plaintext token itself (which is also 64 chars). Sole protection is the code path: `_plaintext` is never written to any column; only `_hash` is. This is correct by design and is not a new gap — it is an existing 00074 design note. B-2 does not alter this.

**Enumeration oracles — FINDING HIGH-1 (see §2 below).**

Hash-lookup is the ONLY code path to access a token-gated resource per the plan's design. The plan's service-role resolve endpoint computes SHA-256 of the plaintext before querying. There is no path where raw plaintext reaches the database query. No timing oracle exists on hash computation itself (SHA-256 is constant-time for fixed-length input).

---

### Test 2 — 4-Layer Defense Claim

**Verdict: PASS WITH CAVEATS**

The PLAN's §4.a articulates four layers:

1. **Layer 1 (entropy):** 2^256 keyspace. Verified above. Mathematically sound.
2. **Layer 2 (hash-lookup scoping):** service-role queries `access_token_hash = $hash AND revoked_at IS NULL AND expires_at > now()`. If zero rows match: 404. This is correct. The unique index `idx_client_portal_access_token_hash` (00074:188-190, `WHERE revoked_at IS NULL`) ensures at most one active row per hash. FINDING HIGH-1 below concerns the oracle introduced by this partial index.
3. **Layer 3 (application-layer client_id + org_id filter):** NEW in B-2. Every subsequent query after token resolution uses `.eq("client_id", row.client_id).eq("org_id", row.org_id)`. The route handler derives both values exclusively from the resolved token row — the URL or request body cannot supply `client_id` or `org_id`. This is correct by construction.
4. **Layer 4 (RLS backstop):** The service-role client bypasses RLS entirely (this is standard Supabase behavior). Therefore Layer 4 does NOT backstop a Layer 3 bug in the service-role path. The plan's §4.a acknowledges this but frames Layer 4 as preventing "authenticated cross-org reads" — that framing is correct. Layer 4 is not a backstop for the service-role API path; it is a backstop for any future authenticated path. If a developer were to accidentally use the authenticated (non-service-role) Supabase client in a portal API route, RLS would apply and would reject the query (since anon has no SELECT policy). So Layer 4 provides defense-in-depth against implementation mistakes that switch to the anon/authenticated client.

**What happens if Layer 3 has a bug (forgets `.eq("client_id", ...)`):**
- The service-role client has no RLS. A query `SELECT * FROM jobs WHERE org_id = $orgId` (missing `client_id` filter) would return ALL jobs for the org, not just the resolved client's jobs. Layer 4 (RLS) does NOT catch this because service-role bypasses RLS. Layer 2 (hash lookup) already completed successfully. **Layer 3 is the sole defense against cross-client within the same org.** This is a known architectural reality — the plan correctly places all weight on Layer 3 (application-layer filtering). The AC-B2-09 cross-client probe must specifically test the Layer 3 filter is present in every data-fetching code path, not just the resolve endpoint.

**What happens if Layer 4 has a bug (anon SELECT policy accidentally added):**
- If an anon SELECT policy were added to `client_portal_access`, an anon user could enumerate rows directly without going through the service-role API. Layer 3 would not protect against this because Layer 3 exists only in the API route. This is why the plan correctly prohibits adding an anon SELECT policy. AC-B2-11 (rls-auditor verification of zero anon policies) is the mechanical gate. **The absence of an anon RLS policy is a security property that must be verified at QA time, not just at plan-review time.** B-3 (which adds a SECURITY DEFINER trigger function that writes to activity_log) must not inadvertently add an anon policy to client_portal_access as a side effect.

**BLOCKING gap on Layer 3:** The plan's Task 3 (step 3) specifies that `/owner/[token]/page.tsx` queries jobs, draws, and change_orders with `.eq("client_id", $clientId).eq("org_id", $orgId)`. However, the plan does not specify the same filter discipline for the pay-app drilldown (`/owner/[token]/pay-apps/[id]/page.tsx`). Task 3 step 4 says: "validates the requested `draw.id` belongs to the token's `client_id + org_id` scope (404 otherwise)." This is correct for the scoping check. However, if the drilldown then queries `draw_line_items` or related data without a `client_id`/`org_id` filter (relying only on the draw_id foreign key), a cross-client information disclosure is possible if draw IDs are somehow guessable or leaked. This requires explicit documentation in the plan that ALL data fetches in ALL portal sub-routes apply the `org_id + client_id` filter or equivalently verify the parent draw's ownership before fetching children.

---

### Test 3 — No Anon RLS Policy on client_portal_access

**Verdict: PASS**

Mechanical evidence from 00074:247-301: three policies on `client_portal_access`:
- `client_portal_access_org_read` (SELECT): requires `app_private.is_platform_admin() OR org_id = app_private.user_org_id() AND user_role() IN ('owner','admin','accounting','pm')`. No anon clause.
- `client_portal_access_org_insert` (INSERT): requires `org_id = app_private.user_org_id() AND user_role() IN ('owner','admin','pm')`. No anon clause.
- `client_portal_access_org_update` (UPDATE): same pattern. No anon clause.

The anon role has zero SELECT, INSERT, UPDATE, or DELETE policies on `client_portal_access`. Confirmed by policy inspection. B-2 adds no anon policy.

**Future-change protection:** The plan correctly notes this decision at §4.a "Why NOT add an anon RLS policy" with documented rationale referencing 00074 Scope decision #1. The migration comment on the column (Task 1 SQL, comment block) also documents this. The AC-B2-11 QA verification step (query `pg_policies WHERE tablename = 'client_portal_access' AND 'anon' = ANY(roles)` expecting 0 rows) provides ongoing mechanical validation.

**Risk if future change introduces anon SELECT:** The only protection is the AC-B2-11 check (which runs at QA, not at commit time). There is no pre-commit hook that would catch a future migration adding an anon policy. This is acceptable given the low probability of accidental anon-policy addition, but the comment block in the migration is load-bearing documentation.

---

### Test 4 — actor_token_id Mutual Exclusion via Application Layer

**Verdict: PASS WITH CAVEATS**

The plan's reasoning at §4.b is sound:
- (a) Legacy rows may have `user_id = NULL` from service-role context writes — a DB CHECK `(user_id IS NULL) <> (actor_token_id IS NULL)` would reject those.
- (b) B-3 trigger will write rows where BOTH are NULL (service-role soft-delete context).
- (c) Therefore a DB CHECK on mutual exclusion cannot be applied.

Application-layer enforcement: `logActivity()` is the ONLY write path per 00026:97-101 (activity_log has a RESTRICTIVE RLS policy + only `members read activity` SELECT policy; no INSERT policy — writes via service-role client only, which bypasses RLS). The constraint that `logActivity()` is the sole INSERT path is only as strong as the guarantee that no other code writes to `activity_log` directly via service-role.

**Cost of getting this wrong:** If someone writes an `activity_log` row via service-role with both `user_id` and `actor_token_id` non-NULL, the row will insert successfully (no DB constraint blocks it). The audit display would show both a user name and "Homeowner (via portal link)" on the same row, which is semantically incoherent but not a security vulnerability. The D-079 PII fence is not breached by this scenario. The risk is audit-log integrity, not information disclosure. The plan's "warn + drop actor_token_id" defensive guard in `logActivity()` (§4.b) prevents this from the TypeScript write path. Direct Supabase service-role SQL (e.g., a future migration or a DBA script) bypasses this guard — this is the acknowledged residual risk.

**The guard implementation has a subtle flaw:** The plan specifies "if BOTH user_id and actor_token_id are provided, console.warn + drops actor_token_id." This means a caller who accidentally passes both will silently log the action as a user action (actor_token_id dropped), not as a homeowner-via-token action. The audit record will be attributed to the wrong actor. The correct behavior for this case may be to raise an error (or at minimum log with high severity) rather than silently drop. The plan's "warns" language is ambiguous about severity — a `console.warn` in a Next.js API route does not surface to Sentry by default. **This is a MEDIUM finding.**

---

### Test 5 — Rate Limiting

**Verdict: BLOCKING — CRITICAL DESIGN GAP**

**BLOCKING-1: In-process rate-limit Map does not work on Vercel.**

The plan specifies (§4.a):
> "Per-token: short-window (60s) cache miss counter; >5 misses on same token in 60s = 429. Implemented in `src/lib/owner-portal/token.ts` using in-process Map with TTL eviction (acceptable for Vercel single-region)."

This claim is incorrect. Vercel's serverless functions are stateless — each invocation runs in an isolated ephemeral container. An in-process `Map` is destroyed at the end of each invocation. **There is no shared state between Vercel function invocations, even within the same region.** The plan cites "single-region" as the justification, but single-region does not mean single-instance. Vercel scales horizontally by spinning up new container instances on demand; each has its own empty Map. Under normal load (multiple concurrent requests), the per-token and per-IP rate-limit counters will always be 0 or 1 — never accumulating to the threshold.

This means the rate-limit implementation as specified provides **zero protection** against brute-force enumeration in production. The 5-miss-per-60s threshold is never reachable because counters reset on every invocation.

**Evidence from plan's own language:** The plan acknowledges "multi-region a Redis/KV upgrade would be needed" — this acknowledges shared state is required. The same problem applies within a single region on Vercel because of the serverless/ephemeral execution model. The distinction between "single-region" and "multi-region" is not the relevant axis; "serverless vs. persistent process" is.

**Impact:** Without functional rate limiting, Layer 1 (entropy) is the ONLY protection against enumeration. 256-bit entropy is mathematically infeasible to brute-force (correct), but the absence of rate limiting means:
- No protection against an attacker who leaks a token via logs/history and tries variations.
- No protection against an attacker with a target (known org) who tries tokens from a compromised token-generation source.
- No early-warning signal of enumeration attempts (Sentry logging of rate-limit events will never fire).

**Required resolution before /nx:**
Option A (recommended): Replace in-process Map with Vercel KV (Redis-backed, persisted across invocations, native Vercel integration, free tier available). KV provides atomic increment + TTL, which is exactly what rate limiting requires. Implementation: `import { kv } from '@vercel/kv'; await kv.incr(key); await kv.expire(key, 60)` — roughly equivalent complexity to the Map approach.

Option B: Use middleware-level rate limiting via Vercel's built-in Edge Rate Limiting (if plan is using Edge runtime for the middleware). However, Edge Rate Limiting is a Vercel Pro feature.

Option C (accept-with-documentation): Document the gap explicitly, accept that Layer 1 entropy is the primary protection, add Sentry logging of all resolve-endpoint calls (not just rate-limited ones) for anomaly detection, and defer proper rate limiting to Wave 1.1-Lite. This is only acceptable if Jake explicitly accepts that the rate-limit claim in T-B2-02 is currently non-functional.

**Timing uniformity:** The plan states "429 responses do NOT distinguish 'wrong token' from 'rate-limited token' — same body, same status." This is correct in principle. However, since the rate-limit Map is non-functional (see above), this uniformity guarantee is moot in production. If rate limiting is fixed via KV, the timing uniformity claim needs mechanical verification: the KV increment + the SHA-256 hash computation path must take comparable time to the "wrong token" 404 path. If the rate-limit 429 returns before hash computation (early return), it is faster than a genuine token-resolve attempt and creates a timing oracle revealing "this IP/token is rate-limited" vs "this token doesn't exist."

**Per-IP rate limiting:** The same stateless-Map problem applies. Additionally, the plan uses `x-forwarded-for` first IP, which can be trivially spoofed on non-Vercel-proxied connections. On Vercel, the `x-forwarded-for` header is set by the Vercel edge and is trustworthy — this is acceptable for Vercel-deployed code. The plan should document that per-IP rate limiting only functions correctly when deployed on Vercel (where `x-forwarded-for` is not user-controllable).

---

### Test 6 — Token Expiration and the 90-day vs 1-year Deviation

**Verdict: PROPERLY SURFACED — Jake decision required**

The plan correctly identifies the EXPANDED-SCOPE Q5 contradiction (Q5 line 211 says "1-year expiration"; existing 00074 schema uses 90-day sliding window) and explicitly surfaces it for Jake in §11:
> "90-day sliding window preserved (NOT 1-year default). EXPANDED-SCOPE Q5 line 211 mentions '1-year expiration' but the existing 00074 schema is 90-day sliding. B-2 preserves the existing default to avoid an unintentional schema-default change inside a plan that should not be changing token lifecycle policy."

**Security perspective on the two options:**

- **90-day sliding window (current behavior):** A token that is regularly used never expires. A token that is unused for 90 days expires. This is a "activity-based" expiration — it protects against abandoned tokens but not against active tokens that are compromised. For a builder-homeowner relationship on a $1.5M–$10M project, "actively used" means the homeowner visits the portal during construction (months to years). A 90-day sliding window means tokens for active projects are effectively permanent (they reset every visit).

- **1-year fixed expiration (EXPANDED-SCOPE Q5 recommendation):** Better than sliding for compromised-token scenarios — a leaked token has at most 1 year of validity regardless of access patterns. The homeowner frictions slightly (re-authenticate annually via new token), but the security posture is strictly better for long-lived credentials.

**Security recommendation:** If the goal is SOC2-capable posture (mentioned in EXPANDED-SCOPE Q7), 1-year fixed expiration is more defensible than sliding-window. The sliding window creates a class of tokens that are practically permanent for active projects. A Jake-authorized decision to change to 1-year fixed (not sliding) in this plan would be a security improvement, not a regression. However, the plan is correct to not make this change autonomously — it requires Jake sign-off.

**FINDING MEDIUM-1:** The plan should document whether the sliding-window UPDATE (which extends `expires_at` on every successful access) is intended for the B-2 service-role resolve path or only for the existing RPC path. The existing 00074 RPCs (`submit_client_portal_message`, `mark_client_portal_message_read`) extend the sliding window. The plan's `validateOwnerToken()` helper also extends `last_accessed_at` + `expires_at` on success (§4.a Task 3 step 2: "Updates `last_accessed_at` + extends `expires_at` on successful resolution (sliding-window — matches existing RPC behavior)"). This means every time the homeowner loads a page, their token expiration is reset 90 days out. The plan should make this explicit in AC-B2-12's scope — the test for token expiration should use a token that has NOT been accessed recently, not just one that was set to expire in the past.

---

### Test 7 — Revocation

**Verdict: ADEQUATE FOR B-2 SCOPE; UI GAP DOCUMENTED**

The revocation mechanism is correct: setting `revoked_at = now()` immediately invalidates the token because all resolve paths query `WHERE revoked_at IS NULL`. This is honored by the plan (inheriting 00074).

**No revocation UI in B-2 scope.** The plan correctly defers this to Wave 1.1-Lite. The DB-layer mechanism is sufficient for emergency revocation via direct SQL. The migration comment documents this. The 00074 table comment also documents it.

**FINDING MEDIUM-2: Emergency revocation procedure is undocumented at the operator level.** There is no runbook entry (analogous to `docs/platform-admin-runbook.md`) describing how a builder or platform admin revokes a token in the absence of a UI. The current process requires a platform admin to execute:
```sql
UPDATE public.client_portal_access
  SET revoked_at = now()
  WHERE id = '<portal_access_id>';
```
This is a non-trivial SQL operation for a non-technical user (e.g., a PM). A CLAUDE.md or runbook note should document the emergency revocation path for B-2 ship. This is a LOW-severity operational gap, not a security vulnerability, but it should be documented before shipping a token-based external surface.

---

### Test 8 — Threat Model Coverage (T-B2-01 through T-B2-11)

**Assessed all 11 threats. Findings below.**

**T-B2-01 (cross-client leak via token-data mismatch):** Mitigated by Layer 3. Correctly identified. BLOCKING gap on sub-route data fetching — see Test 2 caveat.

**T-B2-02 (token brute-force enumeration):** Rate-limiting mitigation is non-functional in practice (BLOCKING-1 above). The entropy claim is correct; rate limiting is not. This threat is currently mitigated only by Layer 1 (entropy).

**T-B2-03 (cross-org via anon role):** Correctly mitigated. No anon SELECT policy. Service-role API applies explicit `org_id` filter derived from the token row (not from user input).

**T-B2-04 (token expiration bypass):** Correctly mitigated. `expires_at > now()` is in the WHERE clause of every token lookup. AC-B2-12 verifies.

**T-B2-05 (audit-log poisoning by anon writes):** Correctly mitigated. activity_log has no anon INSERT policy. All portal audit writes go through the service-role acknowledge endpoint which validates the token first.

**T-B2-06 (TD-B1abis-03 scope-creep):** Non-security technical debt item. Acceptable framing in threat model as defense against unintended surface expansion.

**T-B2-07 (TD-B1abis-03 polish):** Same as T-B2-06.

**T-B2-08 (PII leak via "Homeowner" label):** Correctly accepted. Display label "Homeowner (via portal link)" does not surface `.name` or `.email` from `portal_access`. D-079 fence preserved.

**T-B2-09 (URL-tampering cross-client pay-app probe):** Correctly mitigated by the pay-app sub-route validation (`draw.id` must belong to token's `client_id + org_id`).

**T-B2-10 (token replay across portals):** The unique index `idx_client_portal_access_token_hash (WHERE revoked_at IS NULL)` ensures one row per hash. A token is single-portal-access by DB construction. Sliding-window expiration limits stale-token utility.

**T-B2-11 (token in URL leaks via referer / browser history):** The plan adds `Referrer-Policy: no-referrer` to the `/owner/*` layout. This is the correct mitigation for server-side requests. Browser history is still a risk (the plaintext token is in the URL and persists in browser history). This is accepted per Wave 1.1-Lite lifecycle policy revisit. The `Referrer-Policy: no-referrer` header is mentioned in §6 T-B2-11 row but is NOT explicitly specified in Task 3 (the layout implementation task). **FINDING MEDIUM-3: `Referrer-Policy: no-referrer` must be added explicitly in the Task 3 AC, not just mentioned in the threat model table.** It is not sufficient to mention it in the threat model without an acceptance criterion that verifies it is present in the response headers.

**MISSING THREATS — the following are not in the threat register:**

**T-MISSING-1: Token sharing / forwarding (shoulder-surfing / phishing / social engineering).** A homeowner who receives a portal link via email may forward that link to a family member, a contractor, or an adversary. The plan does not address this. The current design grants full portal access to anyone with the token — there is no per-user identity within the portal session. This is an accepted design choice (single-link model), but it should be explicitly documented in the threat register with its acceptance rationale (e.g., "This is intentional for the homeowner UX; shared access is acceptable because the data is the homeowner's own project; the token can be revoked by the builder if sharing is problematic"). The current threat register omits this threat entirely.

**T-MISSING-2: Time-of-check-time-of-use (TOCTOU) on token validity.** The `validateOwnerToken()` helper checks `revoked_at IS NULL AND expires_at > now()` at resolve time. If a token is revoked between the resolve check and the subsequent data fetch (e.g., a builder revokes the token while the homeowner has an in-flight page load), the data fetch succeeds because it uses the already-resolved `client_id + org_id` (no re-check). For a read-only portal, this TOCTOU window is extremely narrow and the impact is limited (homeowner sees one more page render), but it should be in the threat register with an explicit acceptance rationale.

**T-MISSING-3: Failed attempt logging.** The threat model does not include logging of failed authentication attempts (wrong token, expired token). The plan mentions rate-limiting 429 events are logged to Sentry, but 404 responses (wrong token) are not mentioned as logged. Without logging failed token probes, there is no visibility into enumeration attempts or token fishing. This is particularly relevant given that BLOCKING-1 makes rate limiting non-functional — the only detection mechanism is anomaly detection on failed attempt volume, and that requires logging. **FINDING HIGH-2: All failed token resolution attempts (404 from `/api/owner-portal/resolve`) must be logged to Sentry with `event_type: 'owner_portal_token_miss'`, IP (sanitized), and timestamp. Do NOT log the attempted token plaintext or hash.**

**T-MISSING-4: Token plaintext transmission security.** The plan does not specify HTTPS enforcement for the `/owner/*` routes. The token is in the URL (plaintext). If served over HTTP, the token is transmitted in cleartext and is trivially interceptable. Vercel enforces HTTPS by default on deployed previews and production — but this should be explicitly stated as an assumption in the threat model, and local development (HTTP) should be noted as an exception where the token is not sensitive (dev tokens are synthetic).

**T-MISSING-5: Concurrent acknowledgment race.** The plan specifies an idempotency check for the pay-app acknowledgment: "query `activity_log` for any existing row with `entity_type='draw' AND entity_id=$draw_id AND actor_token_id=$portalAccess.id AND action='acknowledged'`." This check-then-insert is a classic TOCTOU for concurrent requests. If a homeowner double-taps the acknowledge button, two concurrent requests may both pass the existence check (no row found) and both insert rows. The plan says "no optimistic-locking required on the audit-log INSERT" — this is acceptable because the audit log is append-only and duplicate entries do not corrupt financial data. However, the plan also states "confirm idempotent (200 + already_acknowledged: true; no second row)" in AC-B2-08. The idempotency claim is not guaranteed by the current design under concurrent load. **FINDING MEDIUM-4: Either add a DB unique constraint on `(entity_id, actor_token_id, action)` for the `acknowledged` action, or accept that concurrent double-taps may create two rows and revise the idempotency claim in AC-B2-08 to "at most N rows" rather than "exactly 1."**

---

### Test 9 — D-079 PII Fence

**Verdict: PASS**

The plan at §4.b documents:
> "The portal_access row's `name` or `email` fields could theoretically be surfaced but B-2 does NOT do so (PII fence concerns; D-079 — homeowner email is in scope). The generic 'Homeowner (via portal link)' label is sufficient for audit traceability + does not leak PII."

Verification of surfaces:

1. **Audit timeline display:** The activity_log row for `actor_token_id IS NOT NULL` displays "Homeowner (via portal link)" — no PII from `client_portal_access.name` or `.email`.

2. **Owner Portal UI itself:** The plan specifies the portal renders `OwnerDashboardView` (tenant-blind by construction) fed by real Drummond data from the service-role API. The data fetched is `jobs`, `draws`, and `change_orders` rows — not `clients.email` or `clients.phone` (per EXPANDED-SCOPE Q4 decision to defer PII restoration). The homeowner sees their own project data but not their own contact info (which they already possess). No PII from `clients` table is surfaced to the portal.

3. **Portal layout footer:** The plan specifies "a 'report an issue' mailto link to PM." If this mailto includes the PM's email address in the link, it surfaces the PM's email (from `profiles` table) through the homeowner-visible UI. Whether PM contact info is PII under D-079/D-078 requires clarification — CLAUDE.md notes "PM contact info surfaces from `profiles` table (subject to D-078 fence — PM's email/phone visible to admin/owner role)" but the homeowner (via token, not org role) is neither admin nor owner. **FINDING INFO-1: Verify the "report an issue" mailto link implementation does not surface the PM's email address to the homeowner-via-token. The PM's email is D-078-fenced for non-admin/non-owner roles. A mailto link with a hardcoded or dynamically resolved PM email would be a D-079/D-078 fence violation if homeowners can see it.**

---

## Additional Security Findings (Beyond Mandatory Tests)

### BLOCKING-2: `idx_client_portal_access_token_hash` Partial Index Creates Timing Oracle

**Severity: BLOCKING**

The existing unique index (00074:188-190):
```sql
CREATE UNIQUE INDEX idx_client_portal_access_token_hash
  ON public.client_portal_access (access_token_hash)
  WHERE revoked_at IS NULL;
```

This partial index (only indexes non-revoked rows) means:
- A lookup for a **non-revoked valid token**: hits the index, O(log n) lookup, fast.
- A lookup for a **revoked token's hash**: index miss, falls back to sequential scan, slower.
- A lookup for a **non-existent token's hash**: sequential scan on the filtered index space, time proportional to unrevoked rows.

The `submit_client_portal_message` and `mark_client_portal_message_read` RPCs in 00074 handle this with "silent no-op" (no exception leaked). However, response TIME is not uniform — a revoked-token lookup takes longer than a valid-token lookup. An attacker can distinguish "this hash matches a revoked row" from "this hash matches nothing" via timing. This reveals whether a guessed token was ever valid (then revoked) vs. never existed.

For B-2's resolve endpoint, this is the same issue. The plan specifies "429 responses do NOT distinguish wrong token from rate-limited" (timing uniformity claim), but does not address the timing difference between revoked and non-existent tokens at the database query level.

**Remediation options:**

Option A (recommended): Add a non-partial lookup index (covering all rows including revoked) and perform a two-query pattern: (1) lookup by hash regardless of revoked_at to normalize query time; (2) check revoked_at/expires_at in application code. Cost: slightly slower query for valid tokens (scans all rows including revoked); eliminates timing oracle.

Option B: Accept the timing oracle as a theoretical risk given the 256-bit entropy (an attacker cannot practically leverage "this token was once valid" knowledge without already knowing the token). Document as accepted residual risk in the threat model with explicit rationale.

Option C: Use `pg_sleep()` in the RPC to normalize response time to a fixed floor (e.g., 100ms minimum), regardless of index hit/miss. Complex to implement correctly.

**Recommendation:** Option B (accept + document) is defensible given the practical infeasibility of exploiting the oracle without pre-knowledge of a valid token. However, this must be an explicit Jake acceptance, not a silent omission. The threat model table should include this as a named threat with an acceptance record.

### HIGH-1: Token Hash Lookup Hits Index Only on Active Tokens — Revoked Tokens Enumerable

Already covered in BLOCKING-2 above. Flagged separately here because it affects the enumeration claim in T-B2-02.

### HIGH-2: Failed Token Attempt Logging Missing

Covered in T-MISSING-3 above. All failed resolve attempts should be Sentry-tagged.

### HIGH-3: Layer 3 Filter Discipline Not Specified for All Sub-Routes

The plan specifies `.eq("client_id", ...).eq("org_id", ...)` for the main dashboard data fetch but does not enumerate which queries the pay-app drilldown page performs or confirm all of them apply the filter. If `draw_line_items` are fetched by `draw_id` (without `org_id` + `client_id` check), cross-client data disclosure is possible via URL tampering to a draw_id that belongs to a different client within the same org.

**Required: Add an explicit AC or task note that EVERY database query in the portal sub-routes (not just the ownership validation check) applies the `org_id + client_id` derived from the token, OR confirm that the ownership validation (draw belongs to token's scope) is performed BEFORE any child-data fetch and serves as the scope anchor for all subsequent queries.**

### HIGH-4: Smoke Token Provisioning Security

The plan (§5 Task 6) specifies:
> "the token plaintext cannot be checked into the repo (security boundary); the harness reads it from `process.env.SMOKE_OWNER_TOKEN_DRUMMOND` (new env var)"

The Drummond token is a real production credential giving access to Drummond's homeowner portal data. It is being provisioned to Vercel Preview environment as an environment variable. Vercel Preview deployments are accessible to anyone with the preview URL (which is often shared in PR comments, Slack, etc.). If the preview URL is accessible to unauthorized parties AND the smoke token is provisioned to preview, someone with the preview URL could access the Drummond homeowner portal with real data.

**Required clarification:** Is `SMOKE_OWNER_TOKEN_DRUMMOND` provisioned to Vercel Preview (public-ish) or only to Production (restricted)? The plan says "harness env" — the harness runs against Preview per the deployment runbook. If the Drummond token is in the Vercel Preview env, and Vercel Preview URLs are accessible without authentication, this is a real data exposure risk.

**Recommended mitigation:** Use the harness-fixture-org synthetic token (not the Drummond production token) for the smoke harness. Document the Drummond production token as only for live manual testing, never in automated harness. The smoke harness should validate the route structure (HTTP 200, selector presence) against a synthetic token, not a production-data token.

---

## Medium Findings

**MEDIUM-1:** Sliding-window reset on every portal page load means "active project" tokens are practically permanent. This should be explicitly documented in the threat model as an accepted risk with rationale ("active construction projects have a defined end; token can be revoked post-project completion by the builder"). Without documentation, future reviewers may not understand why this design choice was made.

**MEDIUM-2:** Emergency revocation procedure (no UI in B-2 scope) requires direct SQL access. This should be documented in a runbook note before shipping an external token surface.

**MEDIUM-3:** `Referrer-Policy: no-referrer` is mentioned in the threat model but not in any acceptance criterion. Must be added to AC or Task 3 implementation spec with a verification command (`curl -I https://preview.url/owner/test-token | grep -i referrer-policy`).

**MEDIUM-4:** Concurrent acknowledgment double-tap may create duplicate activity_log rows despite the idempotency claim. Either add a unique constraint or revise the AC-B2-08 idempotency claim.

---

## Informational Findings

**INFO-1:** "Report an issue" mailto link in the portal footer — verify it does not surface PM email to the homeowner-via-token (D-078 fence concern).

**INFO-2:** The plan correctly notes that `logActivity()` uses the service-role client. The service-role client's JWT is a long-lived credential stored in `SUPABASE_SERVICE_ROLE_KEY`. The plan does not discuss what happens if this env var is absent in the portal API routes (the existing `tryCreateServiceRoleClient()` pattern returns null and skips the log). For the acknowledgment endpoint, a missing service-role key should be a hard error (not a silent skip), because the acknowledgment write IS the purpose of the endpoint — not a side-effect audit log.

**INFO-3:** The visibility_config column (00074:167-168) controls what sections a homeowner sees. B-2's resolve endpoint should respect this config when deciding which data to fetch and render. The plan does not explicitly address visibility_config enforcement in the new portal route. If the resolver fetches all draws/change_orders/etc. without checking visibility_config, the homeowner may see sections they were not supposed to see per the builder's configuration. This is not a security vulnerability (the data is the homeowner's own project data) but is a behavioral correctness gap.

---

## Threat Model Coverage Attestation

| Threat ID | Coverage | Gap |
|---|---|---|
| T-B2-01 (cross-client leak) | Covered — AC-B2-09 | Sub-route filter discipline not fully specified (HIGH-3) |
| T-B2-02 (brute-force) | Partially covered | Rate-limit non-functional in production (BLOCKING-1) |
| T-B2-03 (cross-org via anon) | Covered — AC-B2-11 | None |
| T-B2-04 (expiration bypass) | Covered — AC-B2-12 | None |
| T-B2-05 (audit-log poisoning) | Covered — AC-B2-13 | None |
| T-B2-06 (TD polish scope-creep) | Covered — AC-B2-17 | Non-security item |
| T-B2-07 (same as T-B2-06) | Covered | Non-security item |
| T-B2-08 (PII via Homeowner label) | Covered — D-079 | Info-1 (mailto footer) |
| T-B2-09 (URL tampering) | Covered — AC-B2-15 | Sub-route child data filter (HIGH-3) |
| T-B2-10 (token replay) | Covered | None |
| T-B2-11 (token in URL / referer) | Partially covered | No AC for Referrer-Policy header (MEDIUM-3) |
| T-MISSING-1 (token sharing/forwarding) | NOT IN REGISTER | Must be added + explicitly accepted |
| T-MISSING-2 (TOCTOU on token validity) | NOT IN REGISTER | Must be added + explicitly accepted |
| T-MISSING-3 (failed attempt logging) | NOT IN REGISTER | Must add Sentry logging of all 404s from resolve (HIGH-2) |
| T-MISSING-4 (HTTPS enforcement assumption) | NOT IN REGISTER | Must be documented as assumption |
| T-MISSING-5 (concurrent acknowledgment race) | NOT IN REGISTER | Must be added + accepted or mitigated (MEDIUM-4) |

---

## Summary Table

| # | Finding | Severity | Resolution Required |
|---|---|---|---|
| BLOCKING-1 | In-process Map rate-limit is non-functional on Vercel serverless | BLOCKING | Option A (Vercel KV), B (accept + document), or C (defer with Jake sign-off). Must resolve before /nx. |
| BLOCKING-2 | Partial index on `access_token_hash WHERE revoked_at IS NULL` creates timing oracle distinguishing revoked vs non-existent tokens | BLOCKING | Option A (full index), B (accept + document in threat model with Jake sign-off), or C (pg_sleep normalization). Must resolve before /nx. |
| HIGH-1 | Revoked token timing difference (same as BLOCKING-2) | HIGH | Subsumed by BLOCKING-2 resolution. |
| HIGH-2 | Failed token resolution attempts not logged to Sentry | HIGH | Add Sentry event on every 404 from `/api/owner-portal/resolve`. Must add AC. |
| HIGH-3 | Layer 3 filter discipline not specified for pay-app sub-route child data fetches | HIGH | Add explicit note in Task 3 or a new AC that ALL queries in all portal sub-routes apply `org_id + client_id` filter. |
| HIGH-4 | Smoke token (`SMOKE_OWNER_TOKEN_DRUMMOND`) provisioned to Vercel Preview with real Drummond data | HIGH | Use synthetic harness-fixture-org token for smoke harness. Reserve Drummond production token for manual testing only. |
| MEDIUM-1 | Sliding-window = permanent tokens for active projects; undocumented acceptance | MEDIUM | Add to threat model with acceptance rationale. |
| MEDIUM-2 | Emergency revocation procedure undocumented (no UI in B-2) | MEDIUM | Add runbook note before ship. |
| MEDIUM-3 | `Referrer-Policy: no-referrer` in threat model but no AC to verify it ships | MEDIUM | Add AC with verification command. |
| MEDIUM-4 | Concurrent acknowledgment double-tap breaks idempotency claim | MEDIUM | Add DB unique constraint OR revise AC-B2-08 claim. |
| INFO-1 | "Report an issue" mailto footer may surface PM email (D-078 fence) | INFO | Verify implementation does not surface PM email. |
| INFO-2 | Missing service-role key causes silent skip in acknowledgment endpoint | INFO | Acknowledgment endpoint should fail-loud (500) not fail-silent on missing service-role key. |
| INFO-3 | visibility_config enforcement not specified in portal route | INFO | Verify resolver respects visibility_config before fetch. |

---

## Verdict

**CONDITIONAL PASS**

Do NOT dispatch `/nx` until:

1. **BLOCKING-1 resolved:** Rate-limit approach replaced with persistent state (Vercel KV or equivalent) OR explicitly accepted by Jake with documentation that Layer 1 entropy is the sole enumeration protection.
2. **BLOCKING-2 resolved:** Timing oracle on revoked vs non-existent tokens either mitigated (full index) OR explicitly accepted by Jake with threat-model entry.
3. **HIGH-2 addressed:** Sentry logging of all failed resolve attempts added to plan + AC.
4. **HIGH-3 addressed:** Explicit Layer 3 filter discipline documentation for all portal sub-route data fetches.
5. **HIGH-4 addressed:** Smoke harness uses synthetic token, not production Drummond token.
6. **Jake sign-off on EXPANDED-SCOPE Q5 (90-day vs 1-year):** Per §11 dispatch checklist — this is already surfaced; Jake must explicitly check the box.
7. **T-MISSING-1, T-MISSING-2, T-MISSING-4, T-MISSING-5 added to threat register** with acceptance rationale or mitigations.

MEDIUMs (MEDIUM-1 through MEDIUM-4) may proceed to execute with resolution during Task authoring, confirmed in B-2-SUMMARY.md AC attestation. INFOs may be verified at execute time.

The fundamental security model (256-bit entropy + hash-stored + service-role mediation + application-layer scoping + RLS backstop) is architecturally sound. The BLOCKINGs are implementation-strategy gaps, not design-model failures. With resolution of BLOCKINGs and HIGHs, B-2 can ship with an acceptable security posture for an F1 internal-use surface.
