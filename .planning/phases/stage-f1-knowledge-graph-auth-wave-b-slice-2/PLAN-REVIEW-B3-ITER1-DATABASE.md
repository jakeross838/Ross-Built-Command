---
reviewer: database-reviewer
plan: B-3
iter: 1
date: 2026-05-22
verdict: NEEDS-WORK
blocking_count: 0
must_fix_count: 2
warning_count: 3
---

# Plan-Review B-3 Iter-1 — Database Reviewer

## Verdict: NEEDS-WORK

Zero blocking findings. Two must-fix items that the plan itself flags as needing iter-1 finalization; both are straightforward additions to the function body. Three warnings on documentation accuracy and policy interaction rationale. The core trigger function design, naming strategy, migration shape, and DEF-WC-1 policy structure are sound.

---

## Check 1 — Trigger naming and ordering vs existing triggers

**Status: PASS (VERIFIED LIVE)**

### Live query results

Query run against live production schema (`pg_trigger` joined `pg_class`, all non-internal triggers, ordered by `tgname DESC`):

```
trg_vip_landed_total          | vendor_item_pricing
trg_vip_after_insert          | vendor_item_pricing
trg_vendors_updated_at        | vendors
trg_support_conversations_updated_at | support_conversations
trg_subscriptions_updated_at  | subscriptions
trg_selections_touch          | selections
trg_purchase_orders_updated_at| purchase_orders
trg_purchase_orders_commit_sync | purchase_orders
trg_proposals_updated_at      | proposals
... (all remaining triggers also start with 'trg_')
```

The alphabetically last existing trigger name is `trg_vip_landed_total`. All existing triggers use the `trg_` prefix. The plan's `zz_soft_delete_audit_<table>` prefix ('z' = ASCII 122) sorts after 't' (ASCII 116), so B-3 triggers will fire LAST among all AFTER UPDATE triggers. No naming conflicts with existing triggers.

### Confirmed existing AFTER UPDATE triggers on the 3 flagged tables

Queried `pg_trigger` filtered to `invoices`, `change_orders`, `invoice_line_items` with timing=AFTER:

| Table | Trigger | Event |
|-------|---------|-------|
| `change_orders` | `co_cache_trigger` | INSERT_OR_UPDATE_OR_DELETE |
| `change_orders` | `trg_change_orders_status_sync` | UPDATE |
| `invoice_line_items` | `trg_invoice_line_items_budget_sync` | INSERT_OR_UPDATE_OR_DELETE |
| `invoice_line_items` | `trg_invoice_line_items_po_sync` | INSERT_OR_UPDATE_OR_DELETE |
| `invoice_line_items` | `trg_invoice_line_items_pricing_history` | INSERT_OR_UPDATE |
| `invoices` | `trg_invoices_pricing_history_on_status` | UPDATE |
| `invoices` | `trg_invoices_status_budget_sync` | UPDATE |
| `invoices` | `trg_invoices_status_po_sync` | UPDATE |

All existing AFTER UPDATE triggers on these three tables (`trg_*`) sort before `zz_soft_delete_audit_*`. B-3's trigger fires last. The WHEN clause `(OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)` further limits interaction: for status-transition updates (which these triggers also handle), soft-delete and status transitions are logically distinct events. The design is correct.

Plan §1.4 pre-design audit correctly identified these triggers. No discrepancy.

---

## Check 2 — Trigger function body correctness

**Status: PASS with MUST-FIX M-1**

### Three-tier user-id resolution logic

The three-tier cascade is correct:

1. `v_user_id := auth.uid()` — reads `current_setting('request.jwt.claim.sub', true)` (verified live via `pg_get_functiondef` on `auth.uid()`). Returns NULL (not exception) when GUC is unset. The `nullif(...,'')::uuid` pattern inside `auth.uid()` handles empty-string GUC correctly: `nullif('', '') = NULL`, `NULL::uuid = NULL`. No exception path.

2. `nullif(current_setting('app.current_user_id', true), '')::uuid` — the `true` (missing_ok) parameter means `current_setting` returns `''` rather than raising when the GUC is unset. `nullif('', '') = NULL`. `NULL::uuid = NULL`. No exception path on this line itself.

3. NULL fallback with `actor_source = 'service_role'` — correct per CONTEXT D-25 (trigger MUST NOT block).

Logic ordering is correct. `v_actor_source` is set before `v_snapshot` is built, so the JSONB always contains the final resolved source.

### MUST-FIX M-1 — Missing exception handler around activity_log INSERT

**Severity: MUST-FIX**

The function body in §2.1 has no `BEGIN ... EXCEPTION WHEN OTHERS THEN ...` block around the `INSERT INTO public.activity_log (...)` statement.

Plan §3.1 Task 1 deviation handling explicitly says: *"If `auth.uid()` evaluation inside trigger function raises: trigger function must guard with `BEGIN ... EXCEPTION WHEN OTHERS THEN ...` to tier-down gracefully. Plan-author finalizes exception handling at iter-1."*

The gap is broader than auth.uid() evaluation (which itself never raises as analyzed above). The unguarded risk is the INSERT itself: if `activity_log` is locked, has a transient constraint violation, or experiences any other error, the INSERT fails and propagates as an exception out of the trigger function. For an AFTER trigger, an uncaught exception aborts the triggering statement — the soft-delete UPDATE fails.

This violates CONTEXT D-25: *"trigger MUST NOT block the underlying soft-delete."*

The fix is straightforward:

```sql
BEGIN
  -- ... three-tier resolution + snapshot build ...

  INSERT INTO public.activity_log (...)
  VALUES (...);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Audit write failure MUST NOT block the soft-delete.
  -- Log via RAISE WARNING so errors surface in Postgres logs / Sentry
  -- without aborting the transaction.
  RAISE WARNING 'audit_soft_delete: activity_log INSERT failed for table=%, id=%, error=%',
    TG_TABLE_NAME, NEW.id, SQLERRM;
  RETURN NEW;
END;
```

The `RAISE WARNING` ensures the failure is visible in Postgres logs and propagates to Sentry via the `pg_audit` surface without blocking the UPDATE.

**Practical risk:** In steady-state production, this path is unlikely to fire. But during migrations (e.g., a migration that temporarily locks `activity_log`), or during any schema evolution that temporarily violates a constraint, every soft-delete in the application window would fail without this guard. The plan's own stated requirement (D-25) demands it.

### TG_TABLE_NAME vs TG_NAME in v_snapshot

The function builds `v_snapshot` with both `trigger_name = TG_NAME` (e.g., `'zz_soft_delete_audit_jobs'`) and `trigger_table = TG_TABLE_NAME` (e.g., `'jobs'`). The INSERT uses `TG_TABLE_NAME` for `entity_type`, which is correct. The snapshot fields are useful for debugging. No correctness issue.

### RETURN NEW from AFTER trigger

Per PostgreSQL docs, the return value of an AFTER trigger is ignored. `RETURN NEW` is the conventional form and is correct.

### `set_config` transaction scope

AC-B3-06 tier-2 test uses `set_config('app.current_user_id', '<id>', true)`. The `true` parameter means transaction-local scope: the GUC is cleared at transaction end. This is correct — no cross-request contamination.

---

## Check 3 — Migration DO block and idempotency

**Status: PASS**

### format() + %I (identifier quoting)

```sql
EXECUTE format(
  'CREATE TRIGGER %I AFTER UPDATE ON public.%I FOR EACH ROW WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) EXECUTE FUNCTION app_private.audit_soft_delete()',
  'zz_soft_delete_audit_' || v_table,
  v_table
);
```

The `%I` quoting applies to the trigger name and table name only. The WHEN clause is a static string literal embedded in the format template — no user-controlled data, no SQL injection surface. The WHEN clause syntax is valid PostgreSQL for row-level AFTER UPDATE triggers (OLD and NEW references in WHEN clauses are supported since PostgreSQL 9.0). No correctness issue.

### Idempotency

`DROP TRIGGER IF EXISTS ... CREATE TRIGGER` pattern is correct. Re-running the migration drops and recreates all 32 triggers. The `CREATE OR REPLACE FUNCTION` and `CREATE POLICY` (without `IF NOT EXISTS`) are the only non-idempotent pieces, but within a single migration apply they execute exactly once. The plan does not use `IF NOT EXISTS` on the policies — if somehow the policies already exist (e.g., partial prior run), the migration would fail. This is the canonical behavior and acceptable since the migration is wrapped in a transaction (per 00103 pattern using `BEGIN ... COMMIT`).

**Recommendation:** Confirm the migration uses `BEGIN ... COMMIT` (per 00103 canonical pattern). The plan body does not explicitly show this wrapping. Executor should add `BEGIN;` and `COMMIT;` as first/last lines of 00107.sql.

### DO block table list: hard-coded NOT dynamic

The 32-table array is hard-coded, not derived from `pg_class`. This is correct — explicit is better than dynamic for migration artifacts. Future tables added after B-3 ships will NOT be auto-covered; they must be explicitly added in a subsequent migration. This is documented in the PLAN and is an acceptable gap (DEF-WC-3 tracks it). No issue.

### Down migration ordering

Plan §7 drops:
1. `org_members_delete_strict` policy
2. `org_members_org_isolation` policy
3. Loop: `DROP TRIGGER IF EXISTS zz_soft_delete_audit_<table>` on all 32
4. `DROP FUNCTION IF EXISTS app_private.audit_soft_delete()`

This ordering is correct: triggers must be dropped before the function they reference (otherwise PostgreSQL raises "cannot drop function because other objects depend on it"). Policy drops are independent and can go before or after triggers. `IF EXISTS` guards on all drops make the down migration idempotent.

---

## Check 4 — DEF-WC-1 policy correctness

**Status: PASS with WARNING W-1**

### RESTRICTIVE FOR ALL + WITH CHECK scope

```sql
CREATE POLICY "org_members_org_isolation" ON public.org_members
  AS RESTRICTIVE FOR ALL
  USING ((org_id = (SELECT app_private.user_org_id())) OR (SELECT app_private.is_platform_admin()))
  WITH CHECK (org_id = (SELECT app_private.user_org_id()));
```

`FOR ALL` means this USING clause applies to SELECT, UPDATE, and DELETE operations. `WITH CHECK` applies to INSERT and UPDATE only (PostgreSQL restriction — not to SELECT/DELETE). The `(SELECT ...)` wrapping for both `user_org_id()` and `is_platform_admin()` is the canonical Wave-A session-cache pattern per CLAUDE.md Q10b and matches migration 00096+ style (not the older non-wrapped style in 00049).

### WARNING W-1 — delete_strict interaction with platform_admin rationale needs documentation

**Severity: WARNING**

The `org_members_delete_strict` policy:
```sql
CREATE POLICY "org_members_delete_strict" ON public.org_members
  AS RESTRICTIVE FOR DELETE
  USING (org_id = (SELECT app_private.user_org_id()));
```

This policy has no platform_admin exception. Combined with the `org_members_org_isolation` RESTRICTIVE FOR ALL (which DOES allow platform_admin reads), the net effect is:
- Platform admins CAN SELECT cross-org org_members rows (allowed by `org_isolation` OR clause)
- Platform admins CANNOT DELETE cross-org org_members rows (blocked by `delete_strict` — no OR clause)

CONTEXT D-19 states this is intentional ("DELETE backstop closes platform_admin-cross-org-delete vector"). This is correct per the canonical 00049 pattern which explicitly documents the same restriction:

> *"Platform admins therefore cannot delete cross-org via RLS. Cross-org mutations must go through dedicated API routes that use the service-role key and log to platform_admin_audit."*

The design is sound. The warning is that the migration comment body for 00107 should explicitly cite this intention (matching 00049's in-migration comment for the canonical tables), so future reviewers don't flag the asymmetry as a bug.

### (SELECT ...) wrapping consistency

The plan uses `(SELECT app_private.user_org_id())` and `(SELECT app_private.is_platform_admin())`. This matches migration 00096+ conventions (Wave-A canonical). Migration 00049 uses the un-wrapped form. Both are functionally correct; the wrapped form enables query planner optimization by evaluating the function once per statement rather than per row. The plan's use of the wrapped form is correct and consistent with the newer convention.

---

## Check 5 — activity_log indexes coverage for trigger writes

**Status: PASS (VERIFIED VIA MIGRATION FILES)**

The trigger will INSERT rows with: `org_id` (NOT NULL), `entity_type` (TG_TABLE_NAME), `entity_id` (NEW.id), `action = 'soft_deleted'`, `user_id` (nullable), `created_at` (default now()).

Existing indexes confirmed via migration files (00026 + 00035):

| Index | Columns | Notes |
|-------|---------|-------|
| `idx_activity_log_org_id` | `(org_id)` | Covers org-scoped reads |
| `idx_activity_log_created_at` | `(created_at DESC)` | Covers recency queries |
| `idx_activity_log_entity` | `(entity_type, entity_id)` | Covers entity lookup queries (the primary post-trigger query pattern) |
| `idx_activity_log_org_created` | `(org_id, created_at DESC)` | Covers dashboard feed (composite) |
| `idx_activity_log_entity_id` | `(entity_id) WHERE entity_id IS NOT NULL` | Partial index for job/health resolution |
| `activity_log_ack_dedupe_unique` | `(entity_id, actor_token_id, action) WHERE action='acknowledged' AND actor_token_id IS NOT NULL` | B-2b deduplication — not relevant to soft_deleted rows |

All query patterns generated by B-3 trigger writes are covered by existing indexes. No new indexes needed for B-3. R-2 performance risk is mitigated by the composite `idx_activity_log_org_created` (dashboard feed) and `idx_activity_log_entity` (entity lookup). The plan's post-ship EXPLAIN ANALYZE threshold (<5ms) is the right verification mechanism.

---

## Check 6 — SECURITY DEFINER + search_path

**Status: PASS**

`SET search_path = public, pg_temp` is correct for a function that writes only to `public.activity_log` and calls `auth.uid()` (in the `auth` schema — reachable because `auth` is in the default search path for Supabase, not because it's listed here). The trigger function does not access `app_private` directly.

`REVOKE EXECUTE ON FUNCTION app_private.audit_soft_delete() FROM PUBLIC` is present in §2.1. This matches the 00103 pattern. The inline verification M-05 (`proacl DOES NOT contain '=X/postgres'`) correctly tests for PUBLIC grant removal using the same ACL check approach that 00103 §B implements.

One clarification for the executor: the `app_private` namespace means the function is in a schema not accessible to `anon` or `authenticated` roles by default (no USAGE grant on `app_private` to those roles in this codebase). The `REVOKE FROM PUBLIC` is belt-and-suspenders defense. Both are correct.

---

## Check 7 — DEF-WC-3 documentation accuracy

**Status: PASS with MUST-FIX M-2 and WARNING W-2**

### MUST-FIX M-2 — client_portal_access soft-delete trigger entry is incorrect

**Severity: MUST-FIX**

Plan §2.4 extension rows include:

> `| client_portal_access | A (post-B-2a) | ORG-scoped tenant | YES (B-2a added deleted_at? confirm at iter-1) | Both |`

Confirmed via migration 00074 (`client_portal.sql`): `client_portal_access` uses `revoked_at` (not `deleted_at`) as its soft-delete mechanism. The table has no `deleted_at` column. It is NOT in the 32-table B-3 trigger list (correct). The DEF-WC-3 extension row must be corrected to:

- **Soft-delete trigger:** N/A (uses `revoked_at`, not `deleted_at`; outside B-3 trigger scope)
- **Audit coverage:** App only (application-layer audit; no deleted_at trigger)

The plan's parenthetical "B-2a added deleted_at? confirm at iter-1" is now confirmed NO. The executor must author the ARCHITECTURE.md section with the corrected entry. This is a must-fix for documentation accuracy (DEF-WC-3 is an authoritative posture reference).

### WARNING W-2 — client_portal_access not in the 32-table trigger list (correct — but document explicitly)

**Severity: WARNING**

`client_portal_access` is correctly absent from the 32-table array in §2.2 (because it has no `deleted_at` column). The DEF-WC-3 section lists it as an extension row. The two appearances (not-in-trigger-list + in-extension-row) could confuse future readers if the extension row says "Soft-delete trigger: YES." After M-2 fix, this inconsistency is resolved. No separate action needed beyond M-2.

### WARNING W-3 — DEF-WC-3 row count discrepancy

**Severity: WARNING**

Plan §2.4 says "3 extension rows (org_members, activity_log, platform_admins) + 1 client_portal_access from B-2a = 36 rows total" and §4 AC-B3-09 expects "≥37 rows (1 header row + 32 soft-delete + 4 extension rows; allowing for legend rows)."

The count is internally consistent (36 data rows + 1 header = 37 awk-counted rows), but the "3 extension rows + 1 client_portal_access" framing is confusing — there are 4 extension entities total. After M-2 fix correcting the client_portal_access row, the count remains 36 data rows. The executor should reconcile the description to say "4 extension rows" rather than "3 + 1 client_portal_access."

---

## Check 8 — FK cascade consistency gap (hard-DELETE not audited)

**Status: PASS — ACCEPTED GAP, documentation adequate**

Plan §1.5 and R-1 document the ~16 CASCADE relationships where hard-DELETE of a parent silently removes children without firing B-3's UPDATE-based trigger. The mitigation (hard-DELETE is forbidden per CLAUDE.md) is correct. The acceptance reasoning is sound.

One note for the executor: the down migration for B-3 (which drops triggers) does NOT create any new hard-delete audit gap — the gap was pre-existing and is unrelated to B-3's rollback path.

---

## Check 9 — 32 tables have id and org_id NOT NULL columns

**Status: PASS — confirmed via pre-design audit in plan**

The plan's §1.1 pre-design audit confirms all 32 tables have `org_id NOT NULL` (verified against live schema). The trigger function reads `NEW.org_id` and `NEW.id` — both must exist. The pre-design audit query used `information_schema.columns WHERE column_name = 'org_id'` intersection with `column_name = 'deleted_at'`, which only returns tables that have BOTH columns. `id` column presence is not explicitly verified in the pre-design audit, but all tables that participate in this schema follow the house convention (`id UUID PRIMARY KEY DEFAULT gen_random_uuid()`). Live verification of id column existence is recommended as part of AC-B3-01 executor attestation (count 32 rows from `pg_trigger` implies 32 tables each have id accessible as `NEW.id` at trigger runtime).

---

## Check 10 — Migration number (00107) availability

**Status: PASS (INFERRED)**

The most recent migration file is 00106 (`b2b_activity_log_ack_dedupe`). Migration 00107 is the next sequential number. No collision risk.

---

## Summary table

| # | Check | Status | Severity |
|---|-------|--------|----------|
| 1 | Trigger naming / ordering (live-verified) | PASS | — |
| 2a | Three-tier user-id resolution logic | PASS | — |
| 2b | Missing exception handler around INSERT | MUST-FIX | M-1 |
| 3 | DO block format() correctness + idempotency | PASS | — |
| 4a | DEF-WC-1 RESTRICTIVE policy correctness | PASS | — |
| 4b | delete_strict / platform_admin interaction | WARNING | W-1 |
| 5 | activity_log indexes cover trigger write patterns | PASS | — |
| 6 | SECURITY DEFINER + search_path + REVOKE | PASS | — |
| 7a | DEF-WC-3 client_portal_access entry incorrect | MUST-FIX | M-2 |
| 7b | DEF-WC-3 row count description inconsistency | WARNING | W-3 |
| 8 | Hard-DELETE cascade audit gap | PASS — accepted | — |
| 9 | All 32 tables have id + org_id NOT NULL | PASS | — |
| 10 | Migration number 00107 availability | PASS | — |

---

## Required iter-1 actions (executor)

### M-1 — Add EXCEPTION WHEN OTHERS THEN handler in trigger function body

Add a top-level `EXCEPTION WHEN OTHERS` block around the entire function body so that any failure in the `activity_log INSERT` (or any other step) degrades gracefully with a `RAISE WARNING` rather than aborting the soft-delete UPDATE. This is explicitly flagged in the plan's own deviation handling section (§3.1 Task 1) as needing iter-1 finalization.

### M-2 — Correct DEF-WC-3 client_portal_access extension row

`client_portal_access` uses `revoked_at` (not `deleted_at`). The ARCHITECTURE.md extension row must read:
- Soft-delete trigger: N/A (revoked_at model; no deleted_at)
- Audit coverage: App only

Reconcile description from "3 extension rows + 1 client_portal_access" to "4 extension rows" for clarity.

### Advisory (no iter needed, executor discretion)

- Add `BEGIN; ... COMMIT;` wrapping to migration 00107.sql body (matches 00103 canonical pattern).
- Add inline comment to `org_members_delete_strict` policy body citing 00049 canonical precedent and documenting that platform_admin cross-org DELETE is intentionally blocked (routes through service-role API per 00049 design rationale).

---

*Live queries executed: pg_trigger ordering (VERIFIED), invoices/change_orders/invoice_line_items AFTER UPDATE triggers (VERIFIED), activity_log indexes (VERIFIED via migration files 00026 + 00035). Circuit-breaker from parallel auth attempts blocked bulk verification; sequential queries confirmed key findings.*
