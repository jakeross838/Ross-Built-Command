---
reviewer: database-reviewer
plan: B-2a
iter: 1
date: 2026-05-21
verdict: NEEDS-WORK
blocking_count: 2
warning_count: 3
---

# Plan-Review B-2a Iter-1 — Database Reviewer

## Verdict: NEEDS-WORK

Two blocking items and three warnings. No findings block the approach or the architectural decisions — the composite FK pattern, index posture, backfill, and down-migration are largely sound. The blocking items are a correctness gap in the partial unique index design and a missing constraint name that the plan cites as resolved but does not actually deliver.

---

## Check 1 — Composite FK shape (D-01): 5th composite UNIQUE precedent

**Status: PASS**

### Precedent verification

The four cited precedents are valid pattern matches for the composite UNIQUE that precedes a composite FK:

- `00016:104` — `UNIQUE (org_id, user_id)` on `org_members`. Confirmed at line 104 of 00016. Single-column UNIQUE on an individual column for the composite; the org_id + id variant is a slight extension but structurally identical.
- `00019:17` — `UNIQUE (org_id, email)` on `org_invites`. Confirmed at line 17.
- `00038:41` — `UNIQUE(org_id, name)` on `internal_billing_types`. Confirmed at line 41.
- `00083:30` — `UNIQUE (org_id, code)` on `org_cost_codes`. Confirmed at line 30.

All four are established within Nightwork migrations. The B-2a addition of `UNIQUE(org_id, id)` on `clients` is the 5th such constraint and follows the same structural shape.

### Migration sequence

The DDL sequence in §5 Task 1 is mechanically correct:
- Step §1a: `ALTER TABLE public.clients ADD CONSTRAINT clients_org_id_id_unique UNIQUE (org_id, id)` — creates the parent side.
- Step §1b: adds the column to the child with single-column FK.
- Step §1d: adds the composite FK `NOT VALID`, then `VALIDATE CONSTRAINT`.

`NOT VALID` + `VALIDATE CONSTRAINT` is the canonical Postgres pattern for adding a FK without a full table scan under ShareRowExclusiveLock. The sequence is correct.

### UNIQUE(org_id, id) redundancy with primary key

`clients_pkey` is `UNIQUE` on `id` alone (a PK is always a unique constraint). Adding `UNIQUE(org_id, id)` creates a second index covering the same `id` column extended with `org_id`. Postgres will maintain both indexes on every write. For the clients table (expected row count: dozens to low hundreds — one client per job, Ross Built has ~14 simultaneous projects), the additional write overhead is negligible. The composite UNIQUE is required to support the composite FK reference; the planner will select the more selective single-column PK index for ordinary `id`-based lookups and only use the composite index when the FK lookup needs `(org_id, id)`. No ANALYZE-time degradation expected at Ross Built's data volume. Per CONTEXT.md `<deferred>` classification this is verify-on-apply, not blocking.

### ON DELETE SET NULL cascade

Specified correctly on both the single-column FK at §1b and the composite FK at §1d. When a `clients` row is soft-deleted (normal path: `deleted_at` set), `client_portal_access.client_id` is NOT set to NULL because `ON DELETE` only fires on hard DELETE. On hard DELETE of a `clients` row (emergency DBA path), `client_portal_access.client_id` becomes NULL — token row is preserved with `client_id=NULL`, which `resolveOwnerToken` rejects at app-layer via the `if (data.client_id === null) return null` guard at §6.e:662. Correct behavior; comment at §8:1335 documents this.

### FK constraint name conflicts

- `client_portal_access_client_id_fkey` (auto-named single-column FK from §1b): no existing constraint by this name visible in 00074 or any referenced migration. CLEAR.
- `client_portal_access_org_id_client_id_fkey` (explicitly named composite FK from §1d): no existing constraint by this name. CLEAR.
- `clients_org_id_id_unique` (UNIQUE on clients): no existing constraint by this name visible in 00100. CLEAR.

---

## Check 2 — Index posture (D-04): full covering, NOT partial

**Status: PASS with NOTE**

The plan is clear and locked: full covering index on `(org_id, client_id, job_id, revoked_seq)` with predicate `WHERE client_id IS NOT NULL`. No `WHERE revoked_at IS NULL` predicate. This eliminates the timing oracle (revoked-token lookup no longer misses the index and causes a seq-scan timing discrepancy).

The PLAN body code at §5:1089-1091 shows Option A shape (with `revoked_seq`):

```sql
CREATE UNIQUE INDEX client_portal_access_org_client_job_seq_unique
  ON public.client_portal_access (org_id, client_id, job_id, revoked_seq)
  WHERE client_id IS NOT NULL;
```

This is correct for the no-timing-oracle posture. App-layer filter `WHERE revoked_at IS NULL AND expires_at > now()` applied inside `resolveOwnerToken` at §6.e:660-661.

**NOTE (non-blocking):** The lookup index at §5:1093 covering `(client_id) WHERE client_id IS NOT NULL` serves the admin revocation UI's reverse query (find all tokens for a client). This is appropriate. The hot-path token lookup uses the existing `idx_client_portal_access_token_hash` from 00074:188 (unique index on `access_token_hash`). The plan does NOT propose replacing or modifying this token-hash index — correct, it remains the fast lookup path for `resolveOwnerToken`. No gap here.

**App-layer filter documentation** confirmed at §6.c:527-528 and §6.e token.ts code at lines 659-661. The filter is documented as the mechanism, not the index predicate.

---

## Check 3 — Partial unique index (D-03 + iter-1 SYNTHESIS B-9 + B-10)

**Status: BLOCKING — BLOCKING-DB-01**

### The `now()` volatility issue — BLOCKER

The plan's **original** partial unique index design (cited in B-9/B-10 context, §6.c:545 Options discussion, and the scope statement §1:197-198) includes `expires_at > now()` in the partial index predicate. This design appears in the Option C discussion and in the iter-1 SYNTHESIS description of what was requested to be added.

**However, the actual §5 Task 1 SQL at line 1089-1091 (Option A) does NOT include `expires_at > now()` in the predicate.** Option A's predicate is only `WHERE client_id IS NOT NULL`. This is the plan-author's choice for the unique index.

The `now()` concern applies to **Option A as described in the spec document for B-9**, which says the predicate was extended to `WHERE revoked_at IS NULL AND client_id IS NOT NULL AND expires_at > now()`. This predicate does NOT appear in the actual migration SQL block, which uses only `WHERE client_id IS NOT NULL` with `revoked_seq` for uniqueness discrimination.

**The blocker is not `now()` per se. The blocker is this:** The plan contains an internal inconsistency that must be resolved:

- The PLAN resolution map §4 row for B-9 at line 197 states: "Predicate extended: `WHERE revoked_at IS NULL AND client_id IS NOT NULL AND expires_at > now()`" — this is the resolution for B-9.
- The actual SQL at §5:1089-1091 uses Option A predicate `WHERE client_id IS NOT NULL` (no `revoked_at IS NULL`, no `expires_at > now()`).
- The B-9 resolution row incorrectly states a predicate that does not match the authored SQL. An executor reading the resolution table would expect one index shape; the migration SQL delivers a different shape.

**This is a documentation accuracy blocker.** Before execute dispatch: the B-9 resolution row at §4:197 must be updated to correctly describe the Option A predicate shape (`WHERE client_id IS NOT NULL` + `revoked_seq` in the tuple) rather than the Option C/B-9-original predicate `WHERE revoked_at IS NULL AND ... expires_at > now()`. Otherwise the executor will face a contradiction between the resolution table and the migration SQL.

**On the `now()` question specifically (as surfaced in the check prompt):** If `expires_at > now()` were used in a partial index predicate in Postgres, the concern would be valid. Postgres evaluates index predicates at index scan time, not at row-write time. A UNIQUE partial index predicate containing `now()` would behave as follows: at INSERT time, Postgres checks for uniqueness among rows that satisfy the predicate `expires_at > now()` at the moment of the INSERT. As time passes and rows' `expires_at` falls behind `now()`, those rows "fall out" of the partial index and their uniqueness slot is vacated — re-insertion becomes possible. This is the B-9 intent. However, `now()` in a partial index predicate is STABLE (not VOLATILE) within a transaction; Postgres docs confirm that STABLE functions are permitted in index predicates (unlike VOLATILE). So `expires_at > now()` in a partial unique index predicate is mechanically valid in Postgres. The re-invitation behavior this enables is correct by design for B-9. It does NOT cause incorrect uniqueness enforcement during normal operations.

**However**, per nwrp202 §4's explicit prohibition on partial-WHERE-revoked_at patterns, and per the plan-author's choice of Option A (which avoids this entirely), this `now()` predicate is NOT in the final authored SQL. The concern becomes moot for Option A. What remains is the documentation inconsistency flagged above.

### B-9 + B-10 correctness in the actual authored SQL (Option A)

With Option A as authored:
- **B-10** (1-client-N-jobs): `(org_id, client_id, job_id, revoked_seq)` tuple — two tokens for the same client but different jobs have different `job_id` values and are both allowed. CORRECT.
- **B-9** (expired-token re-invitation): `revoked_seq` bump on revoke + new row with `revoked_seq=0` on re-invite — expired rows also occupy the unique slot. An expired-but-not-revoked token will block re-invitation because its `(org_id, client_id, job_id, revoked_seq=0)` tuple is still in the unique constraint. The admin flow must explicitly revoke (increment `revoked_seq`) before re-inviting, even for expired tokens. **This is a semantic gap.** B-9 was specifically about expired tokens being able to be re-invited without admin revocation action. Option A does NOT solve B-9 without requiring an admin revocation step on expired tokens. Plan-author's resolution claim for B-9 at §4:197 is incomplete — the text says "Predicate extended" (the Option C/original approach) but the actual implementation (Option A + `revoked_seq`) requires the admin to actively revoke expired tokens before re-inviting. This may be acceptable behavior (expired = admin should revoke anyway) but must be explicitly acknowledged in the PLAN and in AC-B2a-08's verification language.

**Recommendation:** The PLAN should explicitly state that Option A with `revoked_seq` requires admin revocation for expired tokens before re-invitation (not automatic). Update AC-B2a-08 to include an expired-token re-invitation test. Update the B-9 resolution row in §4 to correctly describe the Option A behavior.

---

## Check 4 — Backfill correctness (D-02)

**Status: PASS with NOTE**

### Idempotency

The backfill UPDATE at §5:1044-1050:

```sql
UPDATE public.client_portal_access cpa
   SET client_id = j.client_id
  FROM public.jobs j
 WHERE cpa.job_id = j.id
   AND cpa.client_id IS NULL
   AND j.client_id IS NOT NULL;
```

`AND cpa.client_id IS NULL` ensures idempotency — re-running the UPDATE is a no-op for already-backfilled rows. CORRECT.

### Edge case: `jobs.client_id IS NULL`

Rows where `j.client_id IS NULL` are skipped by `AND j.client_id IS NOT NULL`. These rows remain with `client_id = NULL` in `client_portal_access` after the backfill. The forward probe DO block at §5:1052-1063 ONLY raises EXCEPTION for orphans where `j.client_id IS NOT NULL AND cpa.client_id IS NULL` — it intentionally does NOT raise for rows where `j.client_id IS NULL`. This means a `client_portal_access` row for a job without a client assignment will silently remain with `client_id = NULL`. The `resolveOwnerToken` function at §6.e:662 rejects such rows with a defensive null check, so they are not exploitable. However, there is no RAISE NOTICE counting how many rows were left with `client_id = NULL` due to `jobs.client_id IS NULL`. This is a monitoring gap — the executor will not know if any production or fixture tokens were left in the NULL state without an explicit count. Recommendation: add a RAISE NOTICE after the backfill reporting the count of remaining NULL rows (informational; not fail-loud):

```sql
RAISE NOTICE 'B-2a backfill: % cpa rows remain client_id=NULL (jobs.client_id IS NULL for their job)', 
  (SELECT COUNT(*) FROM public.client_portal_access cpa JOIN public.jobs j ON j.id = cpa.job_id WHERE j.client_id IS NULL AND cpa.client_id IS NULL);
```

### Transaction lock posture

The entire migration is wrapped in `BEGIN;...COMMIT;` per §5:1020,1352. The backfill UPDATE runs inside this transaction, holding a RowExclusiveLock on `client_portal_access` for the transaction duration. For the current dataset (expected handful of rows given Ross Built's 14-project scale), this is fine. No concern.

### Drummond canary

AC-B2a-13 sub-item (9) explicitly verifies Drummond row backfill. The verification query at §8:1874 is concrete and correct. PASS.

---

## Check 5 — `draws` + `change_orders` `job_id` index verification (D-18 + iter-1 SYNTHESIS B-11)

**Status: PASS**

The plan confirms at §6.i:963-965:
- `change_orders.job_id` index: EXISTS at `00028:171` as `idx_change_orders_job_id`. Verified — confirmed present at line 171 of 00028 with `CREATE INDEX IF NOT EXISTS idx_change_orders_job_id ON public.change_orders (job_id)`.
- `draws.job_id` index: DOES NOT exist. Added in 00104 at §5:1331 as `CREATE INDEX IF NOT EXISTS idx_draws_job_id ON public.draws (job_id)`. `IF NOT EXISTS` makes it safe to re-run.

The verification SQL in AC-B2a-12 at §9:2184-2192 is a concrete `pg_indexes` query. PASS.

One note: the plan cites `idx_change_orders_status` at AC-B2a-12 as an expected result. Confirmed present at 00028:173 as `CREATE INDEX IF NOT EXISTS idx_change_orders_status ON public.change_orders (job_id, status)` — this is a composite index on `(job_id, status)`, not just `status`. The AC expects it listed in the `indexdef LIKE '%job_id%'` query — it will appear because `job_id` is the leading column. The name `idx_change_orders_status` may be confusing given it's actually a composite index, but this is a pre-existing naming issue, not a B-2a concern.

---

## Check 6 — Rate-limit table shape (D-15)

**Status: PASS — with RECOMMENDATION**

### Assessment of chosen design

The plan chose `(key_type TEXT, key_value TEXT, window_start TIMESTAMPTZ)` as the unique tuple with `BIGSERIAL` primary key. Separate `record_owner_portal_request` RPC uses atomic `INSERT ... ON CONFLICT (key_type, key_value, window_start) DO UPDATE SET request_count = request_count + 1 RETURNING request_count`. This is the correct atomic increment pattern for a rate-limit counter in Postgres.

**TEXT key vs BYTEA hash:** For low-volume owner portal traffic (homeowners check progress occasionally — single-digit requests/hour per token), the TEXT key is entirely sufficient. The `key_value` for a token key would be the SHA-256 hex digest (64 chars) — already hashed, no raw plaintext stored. For an IP key it is an IPv4/IPv6 address string. No need for BYTEA hash collapse at this volume; the TEXT UNIQUE constraint performs fine.

**TTL cleanup via lazy DELETE vs pg_cron:** The chosen pattern (opportunistic cleanup on every ~100th request call) is simpler and correct for low-volume traffic. Nightwork has no pg_cron precedent (per plan body §6.f). The SECURITY DEFINER cleanup function with `REVOKE PUBLIC EXECUTE` per 00103 precedent follows established pattern. The cleanup function correctly uses `SET search_path = public, pg_temp` per 00102 hardening (confirmed at §5:1292).

**Index on `(window_start)`:** Present at §5:1284-1285 as `idx_owner_portal_rate_limit_window`. This index supports the cleanup DELETE (`WHERE window_start < now() - interval '5 minutes'`). For the lookup-and-increment pattern, the UNIQUE constraint on `(key_type, key_value, window_start)` already creates an index; the `window_start` separate index is additive for cleanup performance. No redundancy concern at low volume.

**RECOMMENDATION — cover the upsert with the right UNIQUE constraint column order:** The UNIQUE constraint at §5:1281 is `UNIQUE (key_type, key_value, window_start)`. The ON CONFLICT clause in the RPC at §5:1320 specifies `ON CONFLICT (key_type, key_value, window_start)` — this must exactly match the constraint column order to resolve. The constraint and the ON CONFLICT specification use identical column order. CORRECT. No change required.

**RPC atomicity:** `INSERT ... ON CONFLICT DO UPDATE ... RETURNING request_count` is a single statement. There is no TOCTOU gap between the count check and the increment. The application-layer check on the returned `_new_count` vs the limit is immediate post-RPC. This is the correct atomic pattern. Compared to the TS pseudo-code in §6.f that showed a two-step upsert + separate UPDATE (which would have a race condition), the final §5d RPC design is correct.

**One concern (WARNING, not blocking — see below under WARNING-DB-03):** The `GRANT SELECT, INSERT, UPDATE ON public.owner_portal_rate_limit TO service_role` at §5:1304 does not include `DELETE`. The cleanup function is SECURITY DEFINER and will DELETE — SECURITY DEFINER functions run as the function owner (typically a superuser role in Supabase), not as `service_role`, so the DELETE inside the function body is not subject to the `service_role` grant. The cleanup function will work. However, if any future code tries to call the RPC from service_role client context directly (outside the SECURITY DEFINER boundary), the DELETE will fail. The SECURITY DEFINER pattern is correct; the grant omission is intentional per the design. Documenting as WARNING for awareness.

---

## Check 7 — Down-migration correctness

**Status: PASS with NOTE**

### RPC body restoration verification

The down-migration at §5:1374-1521 authors three `CREATE OR REPLACE FUNCTION` blocks restoring the 00074 original RPC bodies.

**`create_client_portal_invite`** (down §5:1380-1429): Comparing against source 00074:390-439:

- Auth check block: matches exactly. `IF NOT (p_org_id = app_private.user_org_id() AND ...)` — MATCH.
- Body: no `_client_id` variable declaration (correct — B-2a added it, down removes it).
- INSERT: `org_id, job_id, email, name, access_token_hash, visibility_config, expires_at, created_by` without `client_id` — MATCH to 00074:426-428.
- `COALESCE(p_expires_at, now() + interval '90 days')` — MATCH to 00074:432. Restoration of 90-day interval confirmed.
- Function delimiter: `$function$` in down (vs `$$` in 00074:401). Postgres treats both as valid dollar-quoting with different tags; `$function$` is the standard generated delimiter from `pg_get_functiondef`. ACCEPTABLE — Postgres does not require the delimiter to match the original.

**`submit_client_portal_message`** (down §5:1431-1477): Comparing against 00074:448-494:

- Sliding-window UPDATE at down §5:1470-1473 restores `expires_at = now() + interval '90 days'` — MATCH to 00074:489. CORRECT restoration.

**`mark_client_portal_message_read`** (down §5:1479-1521): Comparing against 00074:501-543:

- Sliding-window UPDATE at down §5:1516-1519 restores `expires_at = now() + interval '90 days'` — MATCH to 00074:540. CORRECT restoration.

**Naming-error correction:** The plan correctly identifies the third RPC as `mark_client_portal_message_read`, not the erroneous `consume_client_portal_token` from earlier drafts. Down-migration authors `mark_client_portal_message_read`. CORRECT.

### All columns/constraints/indexes have DROPs

- §6 reverse: `DROP INDEX IF EXISTS public.idx_draws_job_id` — covers §6 forward.
- §5d/c/b/a reverse: functions dropped before table. `DROP FUNCTION ... (TEXT, TEXT, TIMESTAMPTZ)` includes signature — required for overloaded functions. CORRECT.
- §4 reverse: `DROP INDEX` then `ALTER TABLE ... DROP COLUMN` — index dropped before column. CORRECT (Postgres auto-drops indexes when column is dropped, but explicit drop is cleaner).
- §3 reverse: RPCs restored via CREATE OR REPLACE (not DROP + CREATE) — idempotent.
- §2 reverse: `ALTER TABLE ... ALTER COLUMN expires_at SET DEFAULT (now() + interval '90 days')` — restores 90-day default. CORRECT.
- §1f/e reverse: DROP INDEX → DROP COLUMN — correct order (partial index on `revoked_seq` can only be dropped after the index is gone; DROP COLUMN would fail with "column has dependent objects" if the index weren't dropped first). Plan drops `idx_client_portal_access_client_id` and `client_portal_access_org_client_job_seq_unique` before `DROP COLUMN revoked_seq`. CORRECT.
- §1d reverse: `DROP CONSTRAINT IF EXISTS client_portal_access_org_id_client_id_fkey` — CORRECT.
- §1b reverse: `DROP COLUMN IF EXISTS client_id` — drops single-column FK implicitly along with column. CORRECT.
- §1a reverse: `DROP CONSTRAINT IF EXISTS clients_org_id_id_unique` — CORRECT.

**NOTE:** The down-migration does NOT restore the `GRANT EXECUTE ON FUNCTION ... TO authenticated/anon` GRANTs from 00074:441-443 and 00074:496-497 and 00074:545-546. The `CREATE OR REPLACE` in the down restores the function body but not the permissions. If the forward migration had REVOKEd these grants (which B-2a does NOT explicitly do — it only does `CREATE OR REPLACE` which preserves existing grants), this would be fine. But if Postgres resets grants on `CREATE OR REPLACE` (it does NOT — `CREATE OR REPLACE` preserves existing grants), then the grants are preserved and the down-migration is correct as authored. Postgres behavior: `CREATE OR REPLACE FUNCTION` preserves all existing permissions. CORRECT. No issue.

---

## Check 8 — Rule 2 PostgREST FK citation

**Status: BLOCKING — BLOCKING-DB-02**

The plan cites three FK constraint names per Rule 2:
1. `client_portal_access_client_id_fkey` — single-column FK auto-named from §1b column declaration.
2. `client_portal_access_org_id_client_id_fkey` — composite FK named explicitly at §1d.
3. `client_portal_access_job_id_fkey` — cited from 00074:152 inline FK.

These citations appear in §4 (B-8 resolution row at line 196), §6.a (§5 Task 1 sub-step b + AC-B2a-09), and §8 (AC-B2a-09 at line 1855).

**Problem 1 — `client_portal_access_job_id_fkey` does NOT exist by that name.**

Examining 00074:151-152:
```sql
job_id UUID NOT NULL REFERENCES public.jobs(id),
```
This is an inline column-level FK with no explicit constraint name. Postgres auto-names inline column FK constraints as `{table}_{column}_fkey`. For table `client_portal_access` and column `job_id`, the auto-name would be `client_portal_access_job_id_fkey`. This naming is correct IF the Supabase migration engine creates it with that naming. However, the PLAN has not verified this against `pg_constraint` — it is inferred from the Postgres naming convention. Per Rule 2 (iter-1 SYNTHESIS B-8): "every PostgREST embedding-hint... MUST cite the enabling FK constraint by name + migration filename + line number." The plan cites the name as inferred but does not include a `SELECT conname FROM pg_constraint WHERE conrelid = 'client_portal_access'::regclass` verification. Given that Postgres auto-naming is consistent and predictable, this is LOW RISK, but the plan explicitly states at AC-B2a-09:1855 that "PostgREST FK citations: ... `client_portal_access_job_id_fkey` (from 00074:152)... per Workflow Rule 2 (closes iter-1 SYNTHESIS B-8)" — and the AC verification at §9:2131-2134 only grep-counts citations in the PLAN body, not actual `pg_constraint` query. This is a Rule 2 compliance gap.

**Problem 2 — `assertDrawBelongsToToken` embeds `draws` → `jobs` via `jobs!inner(...)` at §6.e:749.** This PostgREST embed requires a FK from `draws.job_id` → `jobs.id`. The plan cites the FK as `draws_job_id_fkey` in the task description at §7 Task 4 line 1645 ("cite FK constraint name `draws_job_id_fkey` per Workflow Rule 2"). This FK exists (inline in the draws table definition) but is again inferred-not-verified. The plan does NOT include a `pg_constraint` probe confirming `draws_job_id_fkey` is the actual constraint name.

**Resolution required (BLOCKING):** Add a verification query in §9 (or in the pre-flight Sweep 6):

```sql
SELECT conname, conrelid::regclass, confrelid::regclass, pg_get_constraintdef(oid) 
  FROM pg_constraint 
  WHERE conrelid IN ('client_portal_access'::regclass, 'draws'::regclass) 
    AND contype = 'f';
```

This must return rows confirming:
- `client_portal_access_job_id_fkey` with `confrelid = jobs`
- `client_portal_access_client_id_fkey` with `confrelid = clients`
- `draws_job_id_fkey` with `confrelid = jobs`

Without this verification, the Rule 2 citation requirement is met only by naming convention inference, not by schema evidence. The plan-checker iter-1 already flagged B-8 as BLOCKING. The B-2a plan claims to resolve B-8 but the cited constraint names lack pg_constraint evidence.

**This is BLOCKING-DB-02.** Add the `pg_constraint` probe to §9 before execute dispatch.

---

## Check 9 — Rule 6 precursor hook scan (Sweep 5 regex set)

**Status: WARNING — WARNING-DB-01**

The Sweep 5 results table at §5:308-313 shows the regex set used. Comparing against the canonical hook regex set (HEX, NAMED, PURE, LEGACY, ORG_ID, CB4, CB2, ROUNDED, SHADOW, PURPLE):

The Sweep 5 bash script at §5:291-303 shows 9 regex variables: HEX_HITS, NAMED_HITS, PURE_HITS, LEGACY_HITS, ORG_ID_HITS, CB4_HITS, CB2_HITS, ROUNDED_HITS, SHADOW_HITS, PURPLE_HITS. That is all 10 canonical categories (HEX is one, CB4 and CB2 are two separate ones). The categories match.

**Regex anchor concern (per nwrp131):** The Sweep 5 HEX regex at line 292 uses `#[0-9a-fA-F]{6}\\b` — this includes the `\b` word-boundary anchor, which is the canonical form required by nwrp131. The NAMED regex at line 293 uses `\\b(bg|text|...)` with `\\b` prefix anchor — correct. The PURE regex uses `\\b(bg|text|border)-(white|black)\\b` — correct anchoring on both ends.

However, there is one gap: the SHADOW regex at line 300 uses `box-shadow:\\s*[^;]*\\s+(2[1-9]|[3-9][0-9]|[1-9][0-9]{2,})px\\s+[1-9][0-9]*px`. The hook's canonical SHADOW pattern also checks for the oversized blur/spread radius. The Sweep 5 SHADOW regex pattern looks plausible but is not compared against the hook's actual source. The PLAN body at §5:317 states: "Hook scope note... replicates the hook's exact regex set." The B-2a files (token.ts, rate-limit.ts, route.ts, page.tsx) contain no CSS properties at all — all 0 SHADOW_HITS is mechanically correct regardless of any regex variation. This is WARNING-DB-01 (minor): the regex set is claimed to be the hook's exact set but cannot be verified without reading the hook source. For non-CSS TypeScript files, the distinction is moot (0 hits either way). No remediation required before execute; log as NOTED.

---

## Check 10 — Additional database mechanics observations

### `revoked_seq` UPDATE in admin revoke route (WARNING-DB-02)

The admin revoke route at §6.d:582 shows the `updateWithLock` call including:
```
updates: { revoked_at: 'now()' as any, revoked_seq: <max+1 sub-query> }
```

The `<max+1 sub-query>` is a placeholder. The actual implementation requires computing `revoked_seq + 1` for the current row. There are two approaches:

1. **Read current `revoked_seq` first, then pass `current_seq + 1` in the `updates` object.** This creates a TOCTOU gap between the read and the `updateWithLock` write — concurrent double-revoke could produce duplicate `revoked_seq` values.

2. **Use a raw SQL expression in the update.** Supabase PostgREST does not support SQL expressions in `.update()` calls natively; `revoked_seq: supabase.raw('revoked_seq + 1')` is not available in the JS client.

3. **Use the existing `updateWithLock` + derive from the `expectedUpdatedAt` row.** The current row's `revoked_seq` would need to be fetched as part of the `expected_updated_at` lookup. The route already fetches current `updated_at`; fetching `revoked_seq` in the same query and passing `current_revoked_seq + 1` as the update value closes the TOCTOU gap because `updateWithLock` uses optimistic locking — if a concurrent revoke changed the row between the fetch and the update, `expected_updated_at` won't match and the call returns a 409 conflict.

The optimistic-lock pattern is correct here: fetch `{updated_at, revoked_seq}` together, pass `revoked_seq + 1` in updates, and the `expected_updated_at` check prevents concurrent collision. Plan-author's reference to `<max+1 sub-query>` is conceptually sound when combined with the optimistic-lock semantics; the executor must implement it as a two-step fetch+update within the optimistic-lock contract. **WARNING-DB-02:** add explicit implementation guidance to Task 7 clarifying that `revoked_seq + 1` is derived from the row fetched during the `expected_updated_at` lookup, not from a sub-query, to make the TOCTOU safety explicit.

### `owner_portal_rate_limit` RLS posture — service_role bypass (non-blocking)

At §5:1303-1305, the table has RLS enabled with no policies defined, plus an explicit `GRANT SELECT, INSERT, UPDATE TO service_role`. Supabase's `service_role` bypasses RLS entirely (it operates as a postgres superuser equivalent). The explicit GRANT is therefore redundant with the RLS bypass — but it is not harmful. The explicit GRANT makes the intent legible in the migration. The cleanup function is SECURITY DEFINER and also bypasses RLS. Correct.

### Single-column vs composite FK interaction (non-blocking)

The plan at §6.a:436 correctly describes that Postgres treats the single-column `client_portal_access_client_id_fkey` and the composite `client_portal_access_org_id_client_id_fkey` as two independent constraints: the composite FK enforces same-org invariant; the single-column FK enforces the `clients.id` existence. Together they enforce the full by-construction invariant. ON DELETE SET NULL fires for both independently when a `clients` row is hard-deleted — both will SET NULL on `client_id`, which is idempotent. CORRECT.

---

## Summary of findings

| ID | Status | Category | Description |
|----|--------|----------|-------------|
| BLOCKING-DB-01 | BLOCKING | Partial unique index | §4 B-9 resolution row cites Option C predicate shape; authored SQL implements Option A shape. Inconsistency must be resolved before execute. Expired-token re-invitation semantics under Option A must be explicitly documented. |
| BLOCKING-DB-02 | BLOCKING | Rule 2 FK citation | `client_portal_access_job_id_fkey` and `draws_job_id_fkey` are inferred from Postgres naming convention but not verified via `pg_constraint` probe. Add verification query to §9. |
| WARNING-DB-01 | WARNING | Hook scan regex | Sweep 5 SHADOW regex cannot be mechanically verified against hook source; moot for TS-only files (0 hits) but formally noted per nwrp131. |
| WARNING-DB-02 | WARNING | `revoked_seq` increment | Task 7 implementation guidance for `revoked_seq + 1` should explicitly state the optimistic-lock pattern (fetch current seq + pass as update value) to prevent TOCTOU ambiguity. |
| WARNING-DB-03 | WARNING | Rate-limit GRANT | `GRANT ... TO service_role` on rate-limit table omits `DELETE`; cleanup function is SECURITY DEFINER and bypasses this restriction. Correct behavior but DELETE omission from grant is documented. |
| NOTE | NOTE | Backfill NULL notice | Add RAISE NOTICE counting `client_portal_access` rows where `jobs.client_id IS NULL` (informational; not fail-loud) to make the silent-skip behavior visible at migration apply time. |
| NOTE | NOTE | Redundant UNIQUE | `UNIQUE(org_id, id)` on clients is redundant with PK on `id`; Postgres planner handles this correctly; negligible overhead at Ross Built data volume; verify-on-apply per CONTEXT.md `<deferred>` classification. |

---

## Rate-limit table shape recommendation

Plan-author chose correctly for this traffic profile. Canonical recommendation:

- `key TEXT` (not `key_hash BYTEA`) — sufficient. Token key is already a SHA-256 hex digest (64 chars), not raw plaintext. IP key is 7-39 chars. Text equality for these lengths is fast on modern hardware; no need for BYTEA.
- TTL cleanup via lazy DELETE on INSERT (opportunistic per-100-requests trigger) — correct choice over pg_cron. Ross Built homeowners submit a handful of requests per session. A 1% probability cleanup trigger on `~100 requests/session window` means cleanup runs roughly once per homeowner session. Adequate.
- `UNIQUE (key_type, key_value, window_start)` + `index on (window_start)` — correct two-index posture. The UNIQUE constraint serves the INSERT...ON CONFLICT path; the window_start index serves the DELETE cleanup path.

The only structural note is the atomic increment RPC (`record_owner_portal_request`) using `INSERT...ON CONFLICT DO UPDATE SET request_count = request_count + 1 RETURNING request_count` — this is the canonical pattern and correctly eliminates the two-step read-increment race. No alternative recommended.

---

## Down-migration correctness check

All three RPC restorations are byte-faithful to 00074 originals (modulo function delimiter `$function$` vs `$$`, which is functionally equivalent in Postgres). The 90-day sliding-window intervals are correctly restored. The `client_id`-free INSERT in the restored `create_client_portal_invite` body matches 00074:426-435. All forward-migration DDL steps (UNIQUE, column, FK, indexes, column default change, rate-limit table/functions, activity_log column, draws index) have corresponding IF EXISTS DROPs in the down-migration in correct reverse order.

---

## Rule 2 PostgREST FK citation check

See BLOCKING-DB-02. The three constraint names (`client_portal_access_client_id_fkey`, `client_portal_access_org_id_client_id_fkey`, `client_portal_access_job_id_fkey`) are cited in the plan body (grep-verifiable per AC-B2a-09 verification at §9:2131-2134). The composite FK and single-column FK auto-name are consistent with Postgres naming convention. The gap is that the plan substitutes naming-convention inference for an actual `pg_constraint` probe. BLOCKING-DB-02 remediation: add this query to §9 before execute dispatch:

```sql
SELECT conname, conrelid::regclass, confrelid::regclass
  FROM pg_constraint 
  WHERE conrelid IN ('client_portal_access'::regclass, 'draws'::regclass) 
    AND contype = 'f'
  ORDER BY conrelid::regclass::text, conname;
```

Expected results after 00104 applies:
- `client_portal_access_client_id_fkey` → clients
- `client_portal_access_job_id_fkey` → jobs
- `client_portal_access_org_id_client_id_fkey` → clients (composite)
- `draws_job_id_fkey` → jobs (pre-existing)

---

## Rule 9 cross-reviewer alignment notes

No factual cross-reviewer contradiction observed within the database domain. The plan-author's choice of Option A (revoked_seq) over Option C (partial WHERE revoked_at IS NULL) is mechanically correct per nwrp202 §4. The BLOCKING-DB-01 finding is an internal plan inconsistency (§4 resolution row vs §5 SQL), not a cross-reviewer disagreement. Routing to plan-author for documentation correction before execute dispatch.

---

*Database reviewer sign-off pending BLOCKING-DB-01 + BLOCKING-DB-02 resolution. Architectural direction (composite FK, full covering index, Option A revoked_seq, DB-backed rate-limit, down-migration structure) is sound and approved at this review.*
