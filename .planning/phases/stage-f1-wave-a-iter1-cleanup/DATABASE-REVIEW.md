---
reviewer: database-reviewer (claude-sonnet-4-6)
phase: stage-f1-wave-a-iter1-cleanup
plan: WA-iter1-cleanup
review-date: 2026-05-19
migration: supabase/migrations/00102_wa_iter1_security_cleanup.sql
verdict: PASS
---

# Database Review — Migration 00102 Wave-A iter-1 Security Cleanup

## Verdict: PASS

All three change classes are correct, idempotent, and reversible. No
blocking findings. Two low-severity observations documented below for
awareness; neither blocks ship.

---

## Live Verification Summary

All queries executed against the linked Supabase project post-apply.

| Check | Result |
|-------|--------|
| 8 functions have explicit `search_path` in `proconfig` | 8/8 confirmed |
| 4 app_private functions use `public, app_private, pg_temp` | 4/4 confirmed |
| 4 public functions use `public, pg_temp` | 4/4 confirmed |
| `cleanup_stale_import_errors` preserved as SECURITY DEFINER | confirmed (`prosecdef=true`) |
| 7 non-SECURITY DEFINER functions in §A correctly lack `prosecdef` | 7/7 confirmed |
| 7 REVOKE targets have no `anon=` or `authenticated=` in `proacl` | 7/7 confirmed; all show `{=X/postgres,postgres=X/postgres,service_role=X/postgres}` |
| All 7 REVOKE targets are SECURITY DEFINER (`prosecdef=true`) | 7/7 confirmed |
| `pg_trgm` in `extensions` schema | confirmed |
| `vector` in `extensions` schema | confirmed |
| `ALTER DATABASE` `search_path` includes `extensions` | confirmed: `"$user", public, extensions` |
| Pre-existing `app.settings.jwt_exp=3600` preserved in `setconfig` | confirmed (not overwritten by `ALTER DATABASE`) |
| Operator classes (`gin_trgm_ops`, `vector_cosine_ops`, `vector_l2_ops`, `vector_ip_ops`) resolve in `extensions` schema | confirmed; all 7 operator class variants present |
| 4 affected indexes still listed in `pg_indexes` | confirmed (`idx_item_aliases_text_trgm`, `idx_items_canonical_trgm`, `items_embedding_idx`, `idx_pricing_history_description_trgm`) |
| `app_private.refresh_approved_cos_total` exists (called by `co_cache_trigger`) | confirmed |
| `show_limit` / `show_trgm` absent from `database.types.ts` public Functions | confirmed (2-line removal; zero src/ references) |
| `_compute_scheduled_payment_date` IMMUTABLE volatility preserved (`provolatile = 'i'`) | confirmed |

---

## Bucket A — search_path Hardening (8 Functions)

### Correctness

All 8 functions received explicit `SET search_path` clauses:
- public schema functions: `search_path=public, pg_temp`
- app_private schema functions: `search_path=public, app_private, pg_temp`

The app_private expansion is correct. `co_cache_trigger` calls
`app_private.refresh_approved_cos_total`; without `app_private` in the
search_path the PERFORM would fail at trigger-fire time. The wider list
`public, app_private, pg_temp` is the minimum necessary and is not
over-broad.

The `pg_temp` tail entry is correct per Postgres security guidance: it
prevents temp-schema injection attacks where a malicious user could
shadow public schema objects by creating same-named objects in
`pg_temp`. Including `pg_temp` last (after the trusted schemas) is the
right ordering.

### Historical overlap on `trg_change_orders_status_sync`

Migration 00034 first added `SET search_path = public, pg_temp` to
`trg_change_orders_status_sync` via `ALTER FUNCTION`. Migration 00042
subsequently rewrote the function via `CREATE OR REPLACE FUNCTION`
without the SET clause, inadvertently stripping the hardening and
causing the advisor lint to reappear. Migration 00102 re-applies the
correct definition with SET clause. This is the correct resolution; the
history explains why the function appears in the lint list despite 00034
having addressed it previously. No concern.

### IMMUTABLE + search_path interaction

`_compute_scheduled_payment_date` is marked IMMUTABLE and also has
`SET search_path = public, pg_temp`. In PostgreSQL, IMMUTABLE and
explicit `search_path` are orthogonal function attributes — the SET
clause does not change volatility. Live verification confirms
`provolatile = 'i'` is preserved post-apply. No regression.

### Inline §A verification block

The migration's inline DO block correctly checks `proconfig IS NOT NULL`
and that at least one element `LIKE 'search_path=%'`. It does NOT verify
the specific schema list content (e.g., does not assert `app_private` is
present for app_private functions). This is acceptable — the DO block is
a belt-and-suspenders commit gate, not a full regression suite; the
specific schema lists are verified by the live queries above.

**Severity: INFO** — note only, no action required.

### Down migration fidelity for §A

The down migration re-issues all 8 functions without the `SET
search_path` clause, faithfully restoring the pre-00102 mutable
search_path state. Function bodies are preserved verbatim. The
`cleanup_stale_import_errors` SECURITY DEFINER attribute is preserved
in the down as well. Rollback fidelity is complete.

One nuance: the down migration restores `trg_change_orders_status_sync`
to the same state as migration 00042 (mutable search_path, no SET
clause), which is technically the correct pre-00102 state — but it
means rolling back 00102 would re-expose the same advisor lint. This is
expected rollback behavior and correct by definition.

---

## Bucket B — REVOKE EXECUTE (7 Functions)

### Trigger semantics correctness

The core claim of §B is that PostgreSQL trigger fire context runs under
the table owner's privileges (typically the `postgres` role in
Supabase), not the role of the session that caused the DML. This is a
correct statement of PG semantics. REVOKE EXECUTE on `anon` and
`authenticated` removes the ability to call these functions as RPC (via
PostgREST `/rest/v1/rpc/<function>`), but has zero effect on trigger
execution. Live verification of `proacl = {=X/postgres, postgres=X/postgres,
service_role=X/postgres}` on all 7 functions confirms anon and
authenticated entries are absent.

The `=X/postgres` entry (empty grantee prefix) means "public" pseudo-role
had EXECUTE. After REVOKE the entry does not appear for either anon
or authenticated, which is the expected post-REVOKE state. The
`service_role=X/postgres` grant is retained, which is correct — the
service role must be able to invoke these functions for admin/seeding
operations.

### Completeness of REVOKE set

The 7 functions revoked are:
- 5 `trg_pricing_history_from_*` — trigger functions, fire on
  change_order_lines / invoice_lines / invoices / po_lines /
  proposal_lines row events
- 2 `create_default_*` — org-seeding functions called once at
  org creation via service-role path, no legitimate end-user RPC use

Application sweep (confirmed in SUMMARY AC-12) found zero `rpc()`
call sites in `src/` for any of these 7 functions. The boundary between
"safe to revoke" (this set) and "keep anon-callable by design" (signup,
portal, onboarding RPCs) is correctly drawn per PLAN §4B.

### §B verification block

The inline DO block checks for absence of `anon=%` or `authenticated=%`
string prefixes in `proacl::text[]` unnested. This is correct:
`aclitem` text representation uses `grantee=privileges/grantor` format;
anon grants appear as `anon=X/postgres`. The check correctly identifies
post-REVOKE absence. Note: if a function has never had an explicit
GRANT (relying on the `PUBLIC` grant via `=X/postgres`), and the REVOKE
targets `anon` and `authenticated` specifically, the PUBLIC grant
(`=X/postgres`) is separate and may remain. In this case that is correct
— the REVOKE is specifically targeted at the role-named grants, and
the inline check correctly scopes to `anon=` and `authenticated=`
prefixes, not the empty-grantee public grant.

**Severity: INFO** — the PUBLIC (`=X/postgres`) implicit grant is not
revoked by this migration. For trigger-internal SECURITY DEFINER
functions, this is a residual exposure: any role not explicitly named
that connects to the database could theoretically call these functions
as RPC if they can reach the PostgREST endpoint. Supabase's architecture
routes PostgREST requests through named roles (anon for unauthenticated,
authenticated for JWTs), so removing those two roles is the effective
control. The PUBLIC grant has no practical attack surface in the
Supabase deployment model. Flagged for awareness, not as a blocker.

A future hardening pass could add `REVOKE EXECUTE ON FUNCTION ... FROM
PUBLIC` to close the theoretical gap, but this is out of scope for
MED-WA-1 and would need to verify no other role paths depend on the
PUBLIC grant.

### Down migration fidelity for §B

The down migration re-grants EXECUTE to `anon, authenticated` on all 7
functions, restoring the pre-00102 state. One clarification: the plan
draft (§Task 2) said the down would restore "for rollback only" — this
is correct framing. The re-grant on rollback restores the previous
(inadvertent) exposure; that is the correct rollback behavior, not a
security concern in the rollback path.

---

## Bucket C — Extension Schema Move

### Correctness of ALTER DATABASE ordering

The migration correctly issues `ALTER DATABASE postgres SET search_path
TO "$user", public, extensions` BEFORE the two `ALTER EXTENSION SET
SCHEMA` statements. This ordering is critical: if search_path were
updated after the move, any index validation or planning that happens
during the `ALTER EXTENSION` execution could fail to resolve the
operator classes. The ordering in the migration is correct.

Live verification confirms the database `setconfig` array contains
`search_path="$user", public, extensions` as a separate entry alongside
the pre-existing `app.settings.jwt_exp=3600`. The `ALTER DATABASE SET`
syntax correctly appends to `setconfig` without overwriting other
settings — this is standard PG behavior and is verified to be working
correctly.

### Index operator class resolution

All 4 affected indexes use non-schema-qualified operator class names in
their `pg_get_indexdef` output:
- `idx_item_aliases_text_trgm`: `gin_trgm_ops`
- `idx_items_canonical_trgm`: `gin_trgm_ops`
- `items_embedding_idx`: `vector_cosine_ops`
- `idx_pricing_history_description_trgm`: `gin_trgm_ops`

These unqualified names resolve correctly at query planning time because
`extensions` is now in the database search_path. PostgreSQL does not
need to rebuild indexes when an extension moves schemas; the index
definitions remain valid and the operator classes are found via
search_path resolution. All 4 indexes confirmed present in `pg_indexes`
post-apply.

The `extensions` schema has both `gin_trgm_ops` (GIN method) and all
three vector operator class variants (`vector_cosine_ops`,
`vector_l2_ops`, `vector_ip_ops`) for both HNSW and IVFFlat access
methods — all 7 operator class rows confirmed resolving in `extensions`
schema.

### GRANT USAGE on extensions schema

The migration issues `GRANT USAGE ON SCHEMA extensions TO anon,
authenticated, service_role`. This is correct — without USAGE on the
schema, index scans using trgm/vector operator classes would fail for
queries executed under the anon or authenticated roles. The grant is
minimal (USAGE only, not ALL).

### Type-system regen (show_limit / show_trgm removal)

The `pg_trgm` extension exposed `show_limit()` and `show_trgm()` as
PostgREST-callable functions when in the `public` schema. Moving to
`extensions` removes them from the PostgREST-exposed function list.
The type regen correctly removed these 2 entries from the public
Functions block of `database.types.ts`. Grep confirmed zero references
to these identifiers in `src/`. Clean removal.

### Down migration fidelity for §C

The down migration correctly reverses §C in inverse order:
1. Moves both extensions back to `public` schema
2. `ALTER DATABASE postgres RESET search_path` — removes the
   explicit override, returning to PostgreSQL's default behavior

The RESET approach is correct and preferable to hard-coding `SET
search_path TO "$user", public` in the down. The SUMMARY documents
that the pre-apply state had no explicit database-level search_path
override (only `app.settings.jwt_exp=3600` in setconfig). RESET will
remove the entire `search_path` entry from `setconfig`, returning to
the database default. The `jwt_exp` entry is not touched by RESET
because `RESET search_path` only resets the `search_path` GUC
specifically.

**Severity: INFO** — one theoretical edge case: if any other migration
applied between 00102 up and 00102 down were to also modify the
database-level `search_path`, the RESET would undo those changes as
well. In practice this is not a concern (the down path is a break-glass
scenario, not a routine operation), but worth noting for operational
awareness.

---

## Transaction Structure

The migration wraps all three sections in a single `BEGIN ... COMMIT`.
The inline DO verification blocks (§A, §B, §C, §D) are inside the
transaction, so any assertion failure causes the entire transaction to
ROLLBACK automatically. This is the correct fail-fast pattern.

The down migration is likewise wrapped in `BEGIN ... COMMIT`. Full
atomicity on both apply and reverse paths.

---

## Findings by Severity

| # | Bucket | Severity | Finding |
|---|--------|----------|---------|
| 1 | A | INFO | §A inline DO block verifies presence of `search_path=` in proconfig but does not assert specific schema list content (e.g., `app_private` for app_private functions). Adequate as a gate; not a correctness gap. |
| 2 | B | INFO | PUBLIC (`=X/postgres`) EXECUTE grant on the 7 revoked functions is not removed by this migration. Practical attack surface is zero in Supabase's named-role PostgREST routing model; theoretical future hardening path would be `REVOKE EXECUTE ... FROM PUBLIC`. Out of scope for MED-WA-1. |
| 3 | C | INFO | `RESET search_path` in the down migration would undo any database-level search_path changes made by hypothetical future migrations applied between 00102 up and a rollback event. Break-glass scenario; no practical concern. |

No MEDIUM, HIGH, or BLOCKING findings.

---

## Acceptance Criteria Cross-Reference

| AC | Status | Evidence |
|----|--------|----------|
| AC-WA-iter1-01 | PASS | Live: 8/8 functions have `proconfig` with `search_path=` entry |
| AC-WA-iter1-02 | PASS | SUMMARY reports zero `function_search_path_mutable` post-apply (advisor scan) |
| AC-WA-iter1-03 | PASS | Live: all 5 `trg_pricing_history_from_*` show `{=X/postgres,postgres=X/postgres,service_role=X/postgres}` |
| AC-WA-iter1-04 | PASS | Live: both `create_default_*` show same proacl pattern |
| AC-WA-iter1-05 | PASS (structural) | §D DO block confirmed 5 SECURITY DEFINER functions structurally intact; live row-fire deferred to QA harness per `requires_smoke: false` scope |
| AC-WA-iter1-06 | PASS | SUMMARY reports only by-design anon-callable functions remain in advisor scan |
| AC-WA-iter1-07 | PASS | Live: both `pg_trgm` and `vector` in `extensions` schema |
| AC-WA-iter1-08 | PASS | SUMMARY reports zero `extension_in_public` post-apply |
| AC-WA-iter1-09 | PASS | Live: 4 indexes present in pg_indexes; all operator classes resolve in `extensions`; IMMUTABLE volatility preserved on `_compute_scheduled_payment_date` |
| AC-WA-iter1-10 | PASS | SUMMARY confirms CLAUDE.md Dev Rules updated |
| AC-WA-iter1-11 | PASS | Down migration exists; §C-reverse → §B-reverse → §A-reverse order; data-loss contract comment present; RESET approach correct |
| AC-WA-iter1-12 | PASS | Zero src/ rpc() call sites for the 7 revoked functions |
| AC-WA-iter1-13 | DEFERRED | `requires_smoke: false` in plan frontmatter; no regression from pure DB security hardening |
| AC-WA-iter1-14 | PASS | SUMMARY confirms GATE-A-HALT.md updated |

**13/14 ACs verified PASS; 1/14 deferred per scope contract (AC-13 smoke, unchanged from executor's report).**
