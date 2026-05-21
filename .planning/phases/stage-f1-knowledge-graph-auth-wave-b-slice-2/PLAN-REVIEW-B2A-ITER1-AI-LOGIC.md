# Plan-Review B-2a iter-1 — AI Logic Tester

**Captured 2026-05-21 from agent inline return.** Source: nightwork-ai-logic-tester agent return content (the agent's own disk-write was suppressed by its system prompt; this file captures the agent's full report verbatim for audit-trail persistence).

**Verdict: NEEDS-WORK** (1 BLOCKING-CANDIDATE + 3 WARNING/NOTE + Latitude #4 APPROVED).

## Per-query results table (Rule 3 runtime evidence)

19 queries executed against current schema via Supabase Management API 2026-05-21. All read-only.

| # | Query | Expected (PLAN claim) | Actual | Match |
|---|---|---|---|---|
| Q1a | `client_portal_access.client_id` column today | NO (B-2a adds) | Empty result | YES |
| Q1b | `create_client_portal_invite` RPC signature | YES (6 params) | EXACT match | YES |
| Q1c | RPC body does NOT set `client_id` (B-4 leak) | INSERT no `client_id` ref | INSERT 8 columns, none is `client_id` | YES — **B-4 LEAK CONFIRMED** |
| Q1d | RPC body uses 90-day sliding window | `COALESCE(p_expires_at, now() + interval '90 days')` | CONFIRMED | YES |
| Q2-1 | `org_members` composite UNIQUE | YES | `org_members_org_id_user_id_key` | YES |
| Q2-2 | `org_invites` composite UNIQUE | YES | `org_invites_org_id_email_key` | YES |
| Q2-3 | `internal_billings(org_id,*)` composite UNIQUE | YES | **NO — table is `internal_billing_types`** (citation error; constraint exists at 00038:41 but table name in PLAN is wrong) | PARTIAL — citation error |
| Q2-4 | `org_cost_codes(org_id, code)` composite UNIQUE | YES | `org_cost_codes_org_id_code_key` | YES |
| Q3a | `clients` PK is `(id)` only — no composite UNIQUE on `(org_id, id)` today | YES | `clients_pkey PRIMARY KEY (id)` only | YES |
| Q3b | `jobs.client_id` FK exists | YES | `FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL` | YES |
| Q4a | `idx_change_orders_job_id` exists | YES | `idx_change_orders_job_id ON change_orders USING btree (job_id)` confirmed | YES |
| Q4b | `draws.job_id` is NOT indexed — added in 00104 | NO dedicated index | **No `idx_draws_job_id` exists. However, two existing partial composites lead with job_id:** `idx_draws_job_number (job_id, draw_number) WHERE deleted_at IS NULL` and `idx_draws_job_status (job_id, status) WHERE deleted_at IS NULL`. PLAN conclusion (add unfiltered index) is correct; prose framing imprecise. | PARTIAL — prose imprecise |
| Q5 | `activity_log` has 8 columns; no `actor_token_id` | 8 columns matching expectation | EXACT | YES |
| Q6 | Drummond client_portal_access row exists | "Drummond + harness-fixture-org token rows must be backfilled" | **client_portal_access is EMPTY (0 rows across all orgs)** | NO — backfill is no-op; **Drummond canary vacuously true** |
| Q7 | Existing FKs on client_portal_access include `client_portal_access_job_id_fkey` (Rule 2 citation) | YES | `FOREIGN KEY (job_id) REFERENCES jobs(id)` confirmed; no `_client_id_fkey` exists yet | YES |
| Q8 | 2 sliding-window RPCs (`submit_client_portal_message`, `mark_client_portal_message_read`); `consume_client_portal_token` does NOT exist | YES — naming correction valid | EXACTLY 2 rows; `consume_client_portal_token` does not exist | YES — **NAMING-ERROR CORRECTION HOLDS** |
| Q8-bodies | Both RPCs contain `expires_at = now() + interval '90 days'` UPDATE | YES | CONFIRMED verbatim in both bodies | YES |
| Q8-coverage | No other RPCs/triggers touch `client_portal_access.expires_at` | Implicit claim | Searched all pg_proc bodies — only the 3 expected functions. Only `updated_at` trigger | YES — **Latitude #4 scope-completeness CONFIRMED** |
| Q-extra | RLS on `client_portal_access` has no anon-role policy | Service-role mediated per PLAN | Confirmed: 3 policies; anon path via service role only | YES |
| Q-extra-2 | `draws_job_id_fkey` exists for PostgREST embed | Cited at PLAN line 757 | CONFIRMED via runtime PostgREST query | YES — runtime evidence captured |

## Critical findings

### Finding 1 — BLOCKING-CANDIDATE: Token resolution path retains timing oracle

The PLAN's `resolveOwnerToken` helper (lines 645-672) issues:
```typescript
.from("client_portal_access")
.select(...)
.eq("access_token_hash", hash)
.maybeSingle();
```
followed by app-layer filter on `data.revoked_at`. The existing index `idx_client_portal_access_token_hash WHERE revoked_at IS NULL` (from 00074) is PARTIAL. Postgres CANNOT use this index when the SQL WHERE clause does not include `revoked_at IS NULL` (verified via `SET enable_seqscan = off; EXPLAIN` returning seq scan at penalty cost).

**Net effect:** the PLAN closes the timing oracle on admin-UI `(org_id, client_id, job_id)` lookups but ACTUALLY OPENS one on the token-resolution path that runs on every anon homeowner request. At current zero-row scale this is unobservable; at production scale (10K-100K rows) the oracle becomes measurable.

**Resolution options:**
- (a) Add `AND revoked_at IS NULL AND expires_at > now()` to the SQL WHERE clause + acknowledge re-introducing the partial-predicate timing oracle (uniform across paths).
- (b) DROP `idx_client_portal_access_token_hash WHERE revoked_at IS NULL` and create a non-partial unique index on `access_token_hash`. Removes the oracle entirely.
- (c) PLAN body explicit acknowledgement that revocation filtering is app-layer + cite seq-scan latency at expected production table size — but that's the PARTIAL ESCAPE that nwrp202 §4 EXPLICITLY FORBIDS.

**Severity:** the PLAN's nwrp202 §4 "NO partial-index escape" prohibition is INTERNALLY INCONSISTENT with the existing `idx_client_portal_access_token_hash` partial index unless the latter is also addressed. **Same finding as security-reviewer (Rule 9 alignment, cross-reviewer agreement).**

### Finding 2 — WARNING: Drummond canary (AC-B2a-13 sub-item 9) is vacuously true

Query #6 returned 0 client_portal_access rows across ALL orgs. The PLAN's backfill UPDATE in 00104 Step 3 is a no-op; the Sweep 6 forward probe will trivially pass; the AC-B2a-13 sub-item 9 query returns ZERO rows.

This means the Drummond canary is structurally impossible to satisfy as written. PLAN should either:
- Acknowledge canary is vacuously true (no rows = no divergence = AC passes by definition); OR
- Add an active probe: at AC-B2a-13 sub-item 9, INVOKE the FIXED RPC against the Drummond job + client_id, verify the resulting row has `client_id = jobs.client_id`, then revert/cleanup.

### Finding 3 — WARNING: Citation error on `internal_billings` composite UNIQUE precedent

PLAN cites `internal_billings UNIQUE(org_id, name)` at 00038:41. Migration line ref is correct (00038:41), but the constraint is on the **`internal_billing_types`** table, NOT `internal_billings`. Cosmetic; one-word fix. **Substantive impact: ZERO** — the 4 composite UNIQUE precedents claim holds (cross-reviewer alignment with multi-tenant-architect on this).

### Finding 4 — NOTE: `draws.job_id` prose imprecision

PLAN claims at lines 111, 199, 966: "draws.job_id index DOES NOT exist." Strictly correct: there is no single-column `idx_draws_job_id (job_id)`. However, TWO partial composite indexes lead with `job_id` but are partial-on-`deleted_at`. Since the PLAN explicitly DEFERS soft-delete filters to B-2b (line 122), B-2a's helpers will not include `deleted_at IS NULL` — so the existing partial composites will NOT be selectable. **PLAN's CONCLUSION is correct; the PROSE FRAMING elides existing partial composites.**

### Finding 5 — Latitude #4 disposition: IN-SCOPE CONFIRMED

Per Q8 verification:
- RPC names corrected from earlier B-2 draft (`consume_client_portal_token` was wrong — doesn't exist).
- Both RPCs contain `expires_at = now() + interval '90 days'` UPDATE on token use — CONFIRMED verbatim from pg_proc bodies.
- UPDATE happens during normal token use AFTER message INSERT/UPDATE.
- 90-day default is a SLIDING window.
- Changing to 1-year is the NECESSARY consequence of nwrp200 1-year lock.
- No other RPCs/triggers touch `client_portal_access.expires_at`.

**Recommend Latitude #4: APPROVE in-scope.** Plan-author's default choice is correct.

## Rule 9 cross-reviewer alignment notes

**Cross-reviewer agreement with security-reviewer on Finding 1 (timing oracle on token-hash path).** Two independent reviewers (security threat model lens + ai-logic runtime evidence lens) flag the SAME existing partial index from 00074 as the timing-oracle re-introduction surface. NOT a Rule 9 disagreement — Rule 9 ALIGNMENT requiring orchestrator disposition.

**Cross-reviewer agreement with multi-tenant-architect on `internal_billings` citation** (cosmetic). 2 reviewers same finding.

## Verdict

**NEEDS-WORK** — Finding 1 is BLOCKING-candidate needing PLAN amendment OR security-reviewer + Jake explicit acceptance with nwrp202 §4 exception. Findings 2-4 are WARNING/NOTE. Finding 5 (Latitude #4) is PASS — approve in-scope.

## Recommendations (priority order)

1. **BLOCKING-candidate:** PLAN must either (a) add migration step in 00104 to DROP and recreate `idx_client_portal_access_token_hash` as non-partial, OR (b) re-introduce `WHERE revoked_at IS NULL AND expires_at > now()` predicates in the `resolveOwnerToken` SQL with explicit Jake acceptance per nwrp202 §4 exception, OR (c) surface to Jake via Rule 9 HALT for a decision.
2. **WARNING:** AC-B2a-13 sub-item 9 prose should acknowledge backfill is vacuously satisfied (0 cpa rows); add active probe to AC-B2a-06 sub-item 2.
3. **WARNING:** Tighten `internal_billings` → `internal_billing_types` (cosmetic).
4. **NOTE:** Tighten `draws.job_id is NOT indexed` to acknowledge existing partial-composite leading-column indexes.
5. **PASS:** Approve Latitude #4 in-scope.

## Runtime evidence anchors (Rule 3 satisfied)

All queries executed via Supabase Management API 2026-05-21. Authentication via `SUPABASE_ACCESS_TOKEN`. Read-only; no schema mutations. Notable captured outputs:
- `create_client_portal_invite` body: INSERT block enumerated 8 columns (no `client_id`)
- `submit_client_portal_message` body: post-INSERT UPDATE clause `expires_at = now() + interval '90 days'`
- `mark_client_portal_message_read` body: post-UPDATE clause `expires_at = now() + interval '90 days'`
- Runtime PostgREST embed: `GET /rest/v1/draws?select=id,job_id,org_id,jobs!inner(...)&limit=1` returned embedded jobs object (not PGRST200 error)
- `EXPLAIN ... SET enable_seqscan = off`: partial index NOT selectable for query missing predicate
