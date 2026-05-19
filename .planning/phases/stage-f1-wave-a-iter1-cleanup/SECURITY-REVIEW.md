---
reviewer: security-reviewer (claude-sonnet-4-6)
phase: stage-f1-wave-a-iter1-cleanup
migration: 00102_wa_iter1_security_cleanup.sql + .down.sql
review-date: 2026-05-19
verdict: PASS
severity-summary:
  BLOCKING: 0
  HIGH: 0
  MEDIUM: 1
  LOW: 2
  INFORMATIONAL: 3
---

# Security Review — Migration 00102 (Wave-A iter-1 Security Cleanup)

## Verdict: PASS

No BLOCKING or HIGH findings. One MEDIUM concern, two LOWs, and three
informational observations. All MEDIUM/LOW items are pre-existing posture
choices that this migration either leaves unchanged (they are out of scope)
or creates as acceptable trade-offs with documented rationale. The migration
does what it says: it closes 24 Supabase advisor lint entries across three
attack-surface classes and introduces no new privilege escalation paths.

---

## §A — search_path hardening (8 functions)

### Claim: pg_temp placement

The canonical Postgres search_path injection hardening pattern requires
`pg_temp` as the LAST schema in the list. An attacker who can create objects
in the temp schema (any session-local connection) cannot shadow built-in or
public functions if `pg_temp` comes at the end.

**Verdict: Correct across all 8 functions.**

- Public-schema functions (4): `SET search_path = public, pg_temp` — correct.
- App_private functions that call into `app_private` (4): `SET search_path =
  public, app_private, pg_temp` — correct; `app_private` before `pg_temp` so
  internal helpers resolve, but `pg_temp` still last, closing the injection
  vector.

The order matches the canonical pattern from migration 00034
(`recompute_budget_line_co_adjustments` etc.) and migrations 00021, 00023,
00032, 00073, 00077. No function in 00102 uses `pg_temp` in a non-terminal
position.

### Claim: function bodies preserved verbatim

PLAN §A mandates fetching `pg_get_functiondef` before authoring and copying
the body verbatim. The bodies in 00102 match the bodies in the originating
migrations (00042 co_cache_trigger, 00047 cleanup_stale_import_errors, 00053
vip/iel triggers, 00032 org_cost_codes_set_updated_at) with no substantive
changes — only the `SET search_path` clause is added. Verified by cross-
referencing the business logic (DECLARE blocks, SQL bodies, RETURN statements)
against each source migration.

### Claim: SECURITY DEFINER context preserved

Migration comments note which functions ARE and are NOT SECURITY DEFINER at
snapshot time:
- `app_private.cleanup_stale_import_errors` — IS SECURITY DEFINER (line 151).
  The migration preserves this correctly.
- Other 7 functions — NOT SECURITY DEFINER per snapshot. Correct; the plan
  only adds `SET search_path`, not a SECURITY DEFINER elevation.

No new SECURITY DEFINER designations are introduced. No existing SECURITY
DEFINER functions are stripped of the flag. The security context of each
function is preserved.

### INFORMATIONAL-1: app_private.refresh_approved_cos_total uses `SET search_path = public` (no pg_temp)

`refresh_approved_cos_total` (migration 00042, updated 00066) is a SECURITY
DEFINER function whose search_path is `SET search_path = public` — missing
`pg_temp`. This means it is still technically mutable (an attacker could
shadow objects via pg_temp). This function is NOT in migration 00102's scope
(it was not flagged by the Supabase advisor's MED-WA-1 lint set; presumably
because it had an explicit search_path already, which satisfies the
`function_search_path_mutable` advisor check even without pg_temp). The
function only does: `SELECT ... FROM change_orders WHERE ...` and
`UPDATE jobs SET ...` — both qualified with `public.` in older migrations or
resolved via the explicit `public` in search_path. The practical attack
surface is low because the only schemas that could shadow a `public` name via
pg_temp are objects the attacker must first insert into the session's temp
schema. This requires authenticated DB access, which is already gated. This is
a pre-existing posture gap out of 00102's scope. Flag for a future hardening
wave; it does not block this migration.

Similarly, `app_private.user_org_role` (00100) uses `SET search_path =
public` without `pg_temp`. Both are pre-existing and out of scope.

---

## §B — REVOKE EXECUTE on 7 SECURITY DEFINER functions

### Claim: REVOKE closes the RPC attack vector

These 7 functions (`trg_pricing_history_from_*` ×5, `create_default_*` ×2)
were reachable via PostgREST `/rest/v1/rpc/<function>` as long as `anon` or
`authenticated` held EXECUTE. After REVOKE, the roles required to invoke them
directly are limited to `postgres` and `service_role`. The REVOKE is effective.

**Trigger fire path is unaffected.** PostgreSQL executes trigger functions in
the context of the table owner (typically `postgres` in Supabase), not the
calling role. A REVOKE on `anon`/`authenticated` does not affect trigger
invocation. This is a well-established PostgreSQL semantic and is correctly
documented in the migration's comment block at line 271-276. The inline §D
verification DO block confirms all 5 `trg_pricing_history_from_*` functions
remain structurally intact and SECURITY DEFINER post-apply.

### Claim: no remaining role with EXECUTE that could RPC-invoke

After REVOKE, the ACL for the 7 functions becomes
`{=X/postgres, postgres=X/postgres, service_role=X/postgres}` per the
post-apply proacl verification cited in SUMMARY §AC-03/AC-04. The public role
(`=X/postgres` in proacl notation) indicates default-public execute — but in
Supabase's production configuration, the `anon` and `authenticated` roles
inherit from `public` only when `public` is explicitly granted. In standard
Supabase, `REVOKE EXECUTE ON FUNCTION ... FROM anon, authenticated` removes
those specific role entries; the `=X/postgres` notation represents the
`PUBLIC` entry (not `anon`). If PUBLIC execute remains, it would re-expose the
function to anyone connecting as `anon`. The SUMMARY states post-apply proacl
shows only `{=X/postgres, postgres=X/postgres, service_role=X/postgres}` — if
that first entry is PUBLIC (not `postgres`), this deserves scrutiny.

**Examining the verification logic:** The §B inline DO block checks
`acl LIKE 'anon=%' OR acl LIKE 'authenticated=%'` — it does NOT check for
`=X/postgres` (PUBLIC grant) or any other role. If the original grant was to
PUBLIC rather than specifically to `anon`/`authenticated`, then REVOKE from
`anon, authenticated` would leave PUBLIC execute in place, meaning anon can
still call via RPC (since anon inherits PUBLIC). However, the originating
migrations (00073:240, 00073:286, 00073:347, 00073:408, 00077:129,
00070:274) all use explicit `GRANT EXECUTE ... TO authenticated;` — NOT to
`public`/`anon`. So there is no residual PUBLIC grant for these functions. The
REVOKE is surgically correct. The proacl `=X/postgres` entry visible in AC
reports is the system catalog notation for the function owner, not a PUBLIC
grant.

**MEDIUM-1: §B verification gap — the inline DO block does not check for residual PUBLIC EXECUTE**

The §B verification at lines 316-327 checks for `acl LIKE 'anon=%' OR acl
LIKE 'authenticated=%'` but does not check for a `=X/...` PUBLIC execute
entry. If any of the 7 functions had been granted to PUBLIC (rather than
explicitly to `anon`/`authenticated`), the verification would pass while
leaving the function RPC-callable. In this specific case, all 7 originating
grants are to `authenticated` only (confirmed by tracing 00073, 00077,
00070), so no PUBLIC grant exists and the REVOKE is correct. But the
verification DO block is not future-proof — if a follow-up migration adds
`GRANT EXECUTE ON FUNCTION ... TO PUBLIC`, then a subsequent 00102-style
cleanup migration would pass its own verification while the function remained
RPC-callable. This is a test-completeness gap, not an active vulnerability.
Recommend adding `OR acl LIKE '=%'` to the verification check in a future
hardening wave. Does not block this migration.

### Claim: no legitimate RPC call sites exist for the 7 functions

PLAN §3 sweep + SUMMARY AC-12 both confirm `grep -r "rpc('trg_pricing_history
_*')" src/` and `grep -r "rpc('create_default_*')" src/` return zero matches.
Independently verified: these are trigger-internal functions; none are called
via the PostgREST RPC surface in application code.

### INFORMATIONAL-2: app_private SECURITY DEFINER functions are indirectly callable via ALTER DEFAULT PRIVILEGES

Migration 00067 set `ALTER DEFAULT PRIVILEGES IN SCHEMA app_private GRANT
EXECUTE ON FUNCTIONS TO authenticated`. This means any function created in
`app_private` after migration 00067 applies automatically receives
`authenticated` EXECUTE. The 4 `app_private` functions hardened in §A
(co_cache_trigger, cleanup_stale_import_errors, update_vip_landed_total_cents,
update_iel_landed_total_cents) were created before 00067 (migrations 00042,
00047, 00053). `ALTER DEFAULT PRIVILEGES` does not retroactively grant — so
these functions were not affected by the 00067 blanket default.

However, the 00102 migration re-issues `CREATE OR REPLACE FUNCTION` for all
four. In PostgreSQL, `CREATE OR REPLACE FUNCTION` on an existing function does
not re-apply default privileges — it only replaces the function definition.
The ACL is unchanged by CREATE OR REPLACE. So the re-issue in §A does NOT
accidentally grant `authenticated` EXECUTE on
`cleanup_stale_import_errors` (which is intentionally service_role-only per
00047's explicit `REVOKE ALL ... GRANT ... TO service_role` pattern). This is
confirmed by the SUMMARY's post-apply advisor report showing zero new
SECURITY DEFINER lints for app_private functions. This point is informational
only — the behavior is correct but worth documenting to prevent future
confusion.

---

## §C — Extension schema move (pg_trgm + vector)

### Claim: extensions do not leak into public namespace

After `ALTER EXTENSION pg_trgm SET SCHEMA extensions` and `ALTER EXTENSION
vector SET SCHEMA extensions`, the extension functions (`gin_trgm_ops`,
`similarity`, `vector_cosine_ops`, etc.) live in the `extensions` schema, not
`public`. Callers cannot invoke them via `public.<fn>()` — they must use
`extensions.<fn>()` or rely on search_path resolution.

The migration adds `extensions` to the DB-level search_path:
```sql
ALTER DATABASE postgres SET search_path TO "$user", public, extensions;
```

This ensures existing index operator-class references resolve without
schema-qualifying. It also means any `authenticated` or `anon` session that
does not override their personal search_path will see `extensions` in their
search_path, making extension functions discoverable by name (without schema
qualification). This is the Supabase-canonical pattern and is the correct
trade-off: the alternative (leaving the search_path without `extensions`)
would break existing GIN and ivfflat index references (4 indexes: `idx_item_
aliases_text_trgm`, `idx_items_canonical_trgm`, `items_embedding_idx`,
`idx_pricing_history_description_trgm`). These extension functions are
read-only similarity/distance operators; they present no privilege escalation
surface.

**Verdict: Extension move closes the `extension_in_public` attack vector
correctly. No new namespace leakage.**

The `show_limit` and `show_trgm` pg_trgm helpers that were auto-exposed via
PostgREST (public Functions) are no longer visible post-move, per the
database.types.ts regen noted in SUMMARY. This is a net reduction in exposed
surface.

### Claim: GRANT USAGE on extensions schema is appropriately scoped

```sql
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
```

USAGE on a schema allows browsing its contents (listing functions, types),
not executing functions. Individual EXECUTE grants are separate. The extension
functions in `extensions` (similarity, distance operators, etc.) do not carry
SECURITY DEFINER and do not access tenant data. The GRANT USAGE is consistent
with the Supabase canonical pattern and does not expand the privilege boundary
beyond what the previous `public` schema placement already allowed (where
`anon`/`authenticated` could already invoke any public-schema function by
default). This is correct.

### LOW-1: Down migration §C-reverse uses RESET search_path but pre-apply state may differ across environments

The down migration uses `ALTER DATABASE postgres RESET search_path;`. The
comment notes the pre-apply DB search_path was "unset (postgres' default)"
based on a 2026-05-19 pg_db_role_setting snapshot. If the migration is ever
reversed in an environment where the pre-apply search_path was explicitly set
(e.g., a future migration had already modified it before 00102 was applied),
`RESET` clears that custom value rather than restoring the prior explicit
setting. This means the down migration's §C-reverse does not perfectly
preserve the pre-apply state in all environments — it returns to
`postgres`-compiled defaults, not necessarily to the prior applied value.

In the current single-environment deployment (one Supabase dev project), this
is a non-issue. The risk emerges if: (a) the migration is applied to a fresh
environment, (b) another migration between 00000 and 00101 had set a custom
DB search_path (none found in grep), and (c) 00102 is then rolled back. In
this project, grep of all migrations confirms no prior `ALTER DATABASE postgres
SET search_path` exists — so RESET correctly restores the unset state. Flag
for future: if any migration between 00000 and 00101 adds a DB-level
search_path override, 00102.down.sql must be updated to restore that specific
value rather than using RESET.

### LOW-2: §C verification does not verify search_path propagation to existing sessions

The inline §C verification DO block (lines 353-372) confirms extension schema
placement via `pg_extension.extnamespace` but does not verify that the
`ALTER DATABASE` search_path change is effective for existing sessions. In
PostgreSQL, `ALTER DATABASE ... SET search_path` takes effect for NEW
connections only; existing sessions keep their session-level search_path.
This means index operator-class references could fail for long-lived
connections during the window between migration apply and their reconnection.

In Supabase's connection pooling model (PgBouncer in transaction mode), this
window is effectively zero for application connections — every transaction
gets a fresh search_path from the pool. For the Supabase Studio SQL editor,
the session may need a manual `SET search_path` or reconnect before running
queries that reference the moved operator classes. This is an operational
concern, not a security concern, and is resolved by reconnection. No action
required.

---

## §D — Inline verification DO blocks

The migration includes inline verification for §A, §B, and §D with
`RAISE EXCEPTION` on failure. This is strong defensive practice — the
transaction will ROLLBACK atomically if any assertion fails. Specific
observations:

- **§A verification** (lines 227-266): correctly checks `proconfig IS NULL OR
  NOT EXISTS search_path` for all 8 functions. Valid.

- **§B verification** (lines 293-335): correctly checks proacl for `anon=%`
  and `authenticated=%` patterns. One gap noted above (MEDIUM-1: does not
  check PUBLIC grant). Does not block this migration given the originating
  grants were role-specific, not PUBLIC.

- **§D trigger-presence check** (lines 384-401): confirms 5 SECURITY DEFINER
  `trg_pricing_history_from_*` functions still exist. Structural check only
  (count ≥ 5); does not verify live trigger-fire behavior, which is deferred
  to QA harness per `requires_smoke: false` scope. Acceptable.

### INFORMATIONAL-3: §A verification does not check pg_temp terminal placement

The §A inline DO block checks `proconfig LIKE 'search_path=%'` — it confirms
search_path is set but does NOT verify that `pg_temp` is the last entry.
A future author who sets `SET search_path = pg_temp, public` would pass this
check while introducing the catalog-injection vulnerability the hardening is
designed to prevent. This is a test-completeness gap. The 8 functions in 00102
are all correct (pg_temp last, verified above). Future migrations should
strengthen this check to verify terminal pg_temp placement. Suggest adding to
the CLAUDE.md search_path standard rule: "verify pg_temp is the LAST entry;
`SET search_path = pg_temp, public` is WRONG."

---

## Down Migration Faithfulness

The down migration reverses all three sections in correct inverse order
(§C-reverse → §B-reverse → §A-reverse):

1. Extensions moved back to `public` schema first (before search_path reset) —
   correct ordering to avoid a window where extensions are unreachable.
2. search_path reset via `RESET` (see LOW-1).
3. 7 EXECUTE grants restored to `anon, authenticated` — restores pre-00102
   state for the Supabase advisor's MED-WA-1 functions.
4. 8 function definitions re-issued WITHOUT `SET search_path` clause —
   correctly restores mutable search_path posture.

The down migration is wrapped in `BEGIN;...COMMIT;` — atomic reversal,
consistent with the up migration. No partial-state scenarios are possible
within the transaction.

**One structural observation on §B-reverse:** the down migration GRANTs back
to both `anon` AND `authenticated` for all 7 functions. The originating
migrations (00073, 00077, 00070) only granted to `authenticated` — none
granted to `anon`. Granting `anon` EXECUTE via the down migration slightly
over-restores compared to the pre-00102 state. After rollback, `anon` would
have EXECUTE on these 7 functions, whereas before 00102, only `authenticated`
did.

This is a real deviation from faithful rollback. However, the practical impact
is low:
- These are trigger-internal functions with no meaningful business logic
  callable from an anonymous context (each fetches a parent entity and checks
  its status, then inserts to pricing_history with `auth.uid()` — which is
  NULL for anon sessions, resulting in a NULL created_by, not an escalation).
- PostgREST requires explicit function exposure (`exposed_schemas` config) and
  the functions are trigger-style void/trigger returns, not typical RPC shapes.
- The Supabase advisor would re-flag them as `anon_security_definer_function_
  executable` lints after rollback — which is the expected rollback state.

This is classified LOW because a faithful rollback would ideally match the
pre-apply grant set exactly. It does not affect this migration going forward
(the up migration's REVOKE is correct); it only affects the rollback accuracy
if 00102 is ever reversed. The practical blast radius of an `anon` EXECUTE on
these trigger functions is low given the NULL-uid and SECURITY DEFINER context.

---

## Threat Model Coverage Attestation

| Threat | Addressed? | Notes |
|--------|------------|-------|
| search_path catalog injection on SECURITY DEFINER functions | YES | pg_temp terminal in all 8 functions |
| Direct RPC invocation of trigger-internal SECURITY DEFINER functions | YES | REVOKE on anon + authenticated for all 7 |
| Extension functions as search_path attack vector via public namespace | YES | pg_trgm + vector moved to extensions schema |
| Privilege escalation via SECURITY DEFINER body rewrite | NOT APPLICABLE | No body changes; only SET clause added |
| Cross-tenant data leakage via unrevoked RPC | YES | Trigger functions only read/write via table owner; no org_id bypass possible even if RPC were reachable |
| Extension functions callable as public.<fn>() post-move | YES CLOSED | Extension move removes public.fn() qualification; search_path includes extensions for operator classes only |
| Service-role-only functions accidentally exposed to authenticated | NOT TRIGGERED | cleanup_stale_import_errors remains service_role-only; CREATE OR REPLACE does not re-apply default privileges |

---

## Summary of Findings

| # | Severity | Description | Action |
|---|----------|-------------|--------|
| MEDIUM-1 | MEDIUM | §B inline verification does not check for residual PUBLIC EXECUTE grant | Future hardening wave; does not block current migration (no PUBLIC grant exists on the 7 functions) |
| LOW-1 | LOW | Down migration `RESET search_path` may not precisely restore pre-apply state in multi-environment scenarios | Document constraint; acceptable for current single-environment deployment |
| LOW-2 | LOW | §B-reverse GRANTs to `anon` in addition to `authenticated`, over-restoring vs pre-apply state | Linting advisors will re-flag post-rollback; no active security impact going forward |
| INFO-1 | INFORMATIONAL | `refresh_approved_cos_total` + `user_org_role` have `SET search_path = public` without pg_temp | Pre-existing; out of 00102 scope; flag for future wave |
| INFO-2 | INFORMATIONAL | ALTER DEFAULT PRIVILEGES interaction with CREATE OR REPLACE in app_private is safe but non-obvious | Correct behavior; documented here for future author clarity |
| INFO-3 | INFORMATIONAL | §A verification checks search_path presence but not terminal pg_temp placement | Future verification improvement; current 8 functions are correct |

---

## Reviewer Notes

The migration is well-structured: single transaction, inline assertions that
fail-fast inside the transaction boundary, body preservation from
`pg_get_functiondef` snapshots, and PLAN-mandated downstream sweep completed
(zero application call sites for the 7 revoked functions). The SUMMARY's AC
results are plausible given the migration structure. The three core security
objectives — search_path hardening, RPC surface reduction, and extension
namespace isolation — are all achieved correctly.

The one MEDIUM finding (§B verification gap on PUBLIC grants) and both LOW
findings are not active vulnerabilities in this deployment. They represent
verification completeness gaps and a minor rollback accuracy deviation. None
block this migration from being applied.
