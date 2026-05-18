---
phase: stage-f1-wave-a-iter1-cleanup
plan: WA-iter1-cleanup
plan-name: search-path-revoke-extension-move
type: execute
wave: post-Wave-A (deferred per MED-WA-1)
depends_on: []
autonomous: true
halt_after: true
requires_smoke: false
threat_model_severity: medium
status: AUTHORED — NOT DISPATCHED
authored: 2026-05-15 NIGHT
authored_by: orchestrator (claude-opus-4-7[1m]) under nwrp165 weekend Option A deliverable #5
authorization: nwrp165 weekend scope + nwrp167 sequential autonomous execution
source_decisions:
  - "MED-WA-1 (Wave-A iter-1 deferred cleanup; logged at .planning/phases/stage-f1-knowledge-graph-auth-wave-a/GATE-A-HALT.md:122)"
  - "Supabase advisor security lints (run 2026-05-15 NIGHT — see §1 inventory)"
  - "Q1 in Slice-2 EXPANDED-SCOPE — bundling option considered but rejected; standalone plan preserves clean rollback boundary"
requirements: []
files_modified:
  - supabase/migrations/00102_wa_iter1_security_cleanup.sql
  - supabase/migrations/00102_wa_iter1_security_cleanup.down.sql
files_referenced:
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-a/GATE-A-HALT.md
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-a/ITER-2-PATCHES.md
  - supabase/migrations/00034_phase8i_security_audit_fixes.sql (canonical search_path hardening pattern)
  - .planning/MASTER-PLAN.md §11 TD registry
sequence:
  before: Slice-2 dispatch (closes MED-WA-1 before Wave-B-Slice-2 plans start authoring; eliminates lint noise during Slice-2 plan-reviews)
  after: Slice-1 B-1b ship + GATE 2 HALT review
  parallel_authoring_ok: n/a (single plan)
  parallel_execute_ok: false (single migration; serial apply only)
acceptance-criteria-target: 14 falsifiable items (AC-WA-iter1-01..AC-WA-iter1-14)
---

# Plan WA-iter1-cleanup — Wave-A iter-1 deferred security cleanup

## 1. Goal

Close MED-WA-1 (Wave-A iter-1 deferred security findings) via a single atomic
migration. Three Supabase-advisor-flagged classes addressed:

1. **search_path hardening** — 8 functions with `function_search_path_mutable` lint. Add `SET search_path = public, pg_temp` (or appropriate schema list per function) per function definition. Mirrors the canonical pattern from migration 00034 (which hardened the budgets-trigger functions when they were authored).

2. **REVOKE EXECUTE on internal-trigger SECURITY DEFINER functions** — 7 functions flagged by `anon_security_definer_function_executable` + `authenticated_security_definer_function_executable` advisors that are TRIGGER-INTERNAL functions (no legitimate RPC use case). REVOKE EXECUTE from anon + authenticated. The TRIGGER context itself continues to fire (triggers run as table-owner regardless of role-level GRANT).

3. **Move pg_trgm + vector extensions out of public schema** — Postgres best practice (extensions in `extensions` schema or dedicated schema; not `public`). Per Supabase `extension_in_public` advisor + Supabase docs guidance.

This plan is **AUTHORED but NOT DISPATCHED.** Per nwrp165 weekend Option A scope, no `/np` or `/nx` invocation; no migration applied. Standalone plan file lives in `.planning/phases/stage-f1-wave-a-iter1-cleanup/` for Monday dispatch under Jake's authorization.

## 2. Why now / dependencies

- **Lint noise during Slice-2 plan-reviews:** Slice-2 plans (B-2..B-7) will all touch DB surfaces; running `get_advisors` during plan-review iter-1 returns these MED-WA-1 lints alongside any genuinely-new ones. Cleaning MED-WA-1 first reduces signal-to-noise for plan-review.
- **B-3 SECURITY DEFINER context (per Slice-2 Q1):** Slice-2 B-3 trigger function will be SECURITY DEFINER with explicit `SET search_path = public, pg_temp`. Establishing the canonical pattern via this cleanup wave avoids B-3 plan-author re-deciding the convention.
- **Independent of Slice-2 in execution order:** can ship before, in parallel with, or after Slice-2 — no functional dependency. Recommended sequencing: AFTER Slice-1 B-1b ships + GATE 2 HALT (clean foundation), BEFORE Slice-2 plan-review iter-1 (clean lint surface).
- **No new entities, no destructive data ops:** all changes are function-definition-level + GRANT/REVOKE + extension schema relocation. No row-level data touched. Idempotent re-apply safe.

## 3. Pre-flight downstream-consumer-sweep

Per `.planning/lessons.md` 2026-05-15 entry + CLAUDE.md Workflow posture: all plans MUST include downstream sweep. For this plan:

- **search_path harden:** functions remain callable from same call sites; no signature change. Sweep target: `grep -r "<function_name>" src/ supabase/` for each of the 8 functions. Expected: zero call-site changes needed (search_path is internal to function execution context).
- **REVOKE EXECUTE:** these 7 functions are TRIGGER functions, NOT RPC functions. Sweep: `grep -r "rpc('trg_pricing_history\|rpc('create_default_" src/ supabase/` — expected to return ZERO matches (no application code calls these directly; they fire from triggers). If any match returns, plan-author re-scopes (could be a false-positive flag from advisor, OR code is doing something unexpected).
- **Extension move (pg_trgm + vector):** any code referencing `public.gin_trgm_ops` operator class needs schema-qualified update OR `search_path` to include the new schema. Sweep: `grep -r "gin_trgm_ops\|vector_l2_ops\|vector_cosine_ops\|pg_trgm\|vector_index" supabase/ src/` — populate plan body with hit count + per-hit disposition.

**Sweep findings (mechanical at plan-author time; will be regenerated at execute time):**

```
# Search 1: 8 search_path functions
$ grep -rn "trg_change_orders_status_sync\|_compute_scheduled_payment_date\|co_cache_trigger\|cleanup_stale_import_errors\|update_vip_landed_total_cents\|org_cost_codes_set_updated_at\|touch_updated_at\|update_iel_landed_total_cents" supabase/migrations/ src/
# Expected hits: migration files that CREATE OR REPLACE FUNCTION these (rewrite-time references); zero application code references (triggers don't surface as RPC).

# Search 2: 7 REVOKE-EXECUTE candidates
$ grep -rn "trg_pricing_history_from_\|create_default_approval_chains\|create_default_workflow_settings" src/ supabase/migrations/
# Expected hits: migration files that CREATE these functions; ZERO application code calling them as RPC. If non-zero in src/, surface to Jake.

# Search 3: extension relocation
$ grep -rn "gin_trgm_ops\|vector_l2_ops\|vector_cosine_ops" supabase/migrations/
# Expected: 1-3 migration files using `USING gin (col gin_trgm_ops)` syntax. These need schema-qualified update OR project-wide search_path config.
```

Per CLAUDE.md Workflow posture Rule 6 sub-check (a) hook regex sweep on `files_modified`: this plan modifies ONLY `supabase/migrations/00102_*.sql` (new file + down partner). Hook scan applies to the migration files. NO design-token / hex / NwWordmark concerns in migration SQL — N/A.

## 4. Implementation tasks

### Task 1 — Author migration 00102_wa_iter1_security_cleanup.sql

Single atomic migration. BEGIN..COMMIT transaction. Three sections:

#### §A — search_path hardening (8 functions)

For each of the 8 functions, `CREATE OR REPLACE FUNCTION` with explicit `SET search_path = public, pg_temp` clause. Function body remains unchanged; only the function declaration's SET clause is added/modified.

Functions to harden:

| # | Function | Schema | Current search_path | Action |
|---|----------|--------|---------------------|--------|
| 1 | `trg_change_orders_status_sync` | public | mutable | `SET search_path = public, pg_temp` |
| 2 | `_compute_scheduled_payment_date` | public | mutable | `SET search_path = public, pg_temp` |
| 3 | `co_cache_trigger` | app_private | mutable | `SET search_path = public, app_private, pg_temp` |
| 4 | `cleanup_stale_import_errors` | app_private | mutable | `SET search_path = public, app_private, pg_temp` |
| 5 | `update_vip_landed_total_cents` | app_private | mutable | `SET search_path = public, app_private, pg_temp` |
| 6 | `org_cost_codes_set_updated_at` | public | mutable | `SET search_path = public, pg_temp` |
| 7 | `touch_updated_at` | public | mutable | `SET search_path = public, pg_temp` |
| 8 | `update_iel_landed_total_cents` | app_private | mutable | `SET search_path = public, app_private, pg_temp` |

**Pattern for each (example for `trg_change_orders_status_sync`):**

```sql
-- Section A.1: Harden search_path on trg_change_orders_status_sync
CREATE OR REPLACE FUNCTION public.trg_change_orders_status_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- preserve existing security context
SET search_path = public, pg_temp  -- NEW: explicit search_path per advisor 0011
AS $$
BEGIN
  -- BODY UNCHANGED — copy from current definition exactly
  -- (executor: query pg_get_functiondef before authoring; preserve body verbatim)
  RETURN NEW;
END;
$$;
```

**Executor responsibility:** before authoring each `CREATE OR REPLACE`, fetch current function body via:
```sql
SELECT pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = '<schema>' AND p.proname = '<function_name>';
```

Copy the body verbatim into the migration; add the `SET search_path = ...` clause. **NEVER rewrite function bodies blindly.**

#### §B — REVOKE EXECUTE on internal-trigger SECURITY DEFINER functions (7 functions)

For each function listed below, `REVOKE EXECUTE ... FROM anon, authenticated`. These functions are INTERNAL triggers (fire via row events) and have no legitimate RPC call site.

| # | Function | Schema | Type |
|---|----------|--------|------|
| 1 | `trg_pricing_history_from_co_line` | public | trigger (fires on change_order_lines change) |
| 2 | `trg_pricing_history_from_invoice_line` | public | trigger (fires on invoice_lines change) |
| 3 | `trg_pricing_history_from_invoice_status` | public | trigger (fires on invoices status change) |
| 4 | `trg_pricing_history_from_po_line` | public | trigger (fires on po_lines change) |
| 5 | `trg_pricing_history_from_proposal_line` | public | trigger (fires on proposal_lines change) |
| 6 | `create_default_approval_chains` | public | seed-default (called once at org-create; no end-user RPC use) |
| 7 | `create_default_workflow_settings` | public | seed-default (called once at org-create; no end-user RPC use) |

**Pattern:**

```sql
-- Section B: Revoke EXECUTE from anon + authenticated on internal-trigger functions
REVOKE EXECUTE ON FUNCTION public.trg_pricing_history_from_co_line() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_pricing_history_from_invoice_line() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_pricing_history_from_invoice_status() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_pricing_history_from_po_line() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_pricing_history_from_proposal_line() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_default_approval_chains() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_default_workflow_settings() FROM anon, authenticated;
```

**Verification post-revoke:** trigger context fires via the table-owner role (typically `postgres` or the app role that owns the table). REVOKE on anon/authenticated does NOT affect trigger-internal invocation. Test post-apply:

```sql
-- Should still fire (insert into proposals, trigger writes pricing_history row)
INSERT INTO proposals (...) VALUES (...);
SELECT count(*) FROM pricing_history WHERE source = 'proposal';
-- Should fail when called as RPC (anon role)
-- (verified via /rest/v1/rpc/trg_pricing_history_from_proposal_line — expect 401 or 403)
```

**Note (per nwrp165 +/-1 calibration):** advisor flags 5 `trg_pricing_history_from_*` functions and 2 `create_default_*` functions (total 7). nwrp165 estimate was "4 + 3 = 7"; actual count is "5 + 2 = 7". Total matches; specific split is what's authored above. No advisor sign-off discrepancy.

**Functions NOT in this REVOKE set (kept anon-callable by design):**
- `create_signup` / `autoconfirm_signup` — signup RPC, called from anon (login page).
- `submit_client_portal_message` / `mark_client_portal_message_read` / `create_client_portal_invite` — Owner Portal token-flow RPCs.
- `create_organization_for_new_user` — onboarding RPC.
- `default_stages_for_workflow_type` — used by workflow-customization UI (verify before final REVOKE decision).
- `draw_*_rpc` — RPC functions for draw workflow (verify before final REVOKE decision).

If executor's sweep finds any of these "kept anon-callable by design" functions are NOT actually used from anon contexts, add them to the REVOKE list. But default is preserve EXECUTE; verify before revoking.

#### §C — Move pg_trgm + vector extensions out of public schema

**Posture:** create dedicated `extensions` schema; move both extensions. Per Supabase official guidance.

```sql
-- Section C: Move pg_trgm + vector extensions out of public schema
-- Per Supabase advisor 0014 + Supabase docs canonical pattern.

CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

-- Move pg_trgm
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- Move vector
ALTER EXTENSION vector SET SCHEMA extensions;

-- Update search_path for the database (so existing references to gin_trgm_ops etc. resolve)
-- NOTE: this is the canonical Supabase pattern; modify per project requirements if needed.
ALTER DATABASE postgres SET search_path TO "$user", public, extensions;
```

**Critical sweep before move:**

```sql
-- Find any indexes using operator classes from these extensions
SELECT
  schemaname,
  tablename,
  indexname,
  pg_get_indexdef(idx.oid) AS indexdef
FROM pg_indexes
JOIN pg_class idx ON idx.relname = indexname
WHERE pg_get_indexdef(idx.oid) ~ 'gin_trgm_ops|vector_(l2|cosine|ip)_ops';
```

Per current state (verified 2026-05-15 via earlier B-1a-bis QA):
- `idx_clients_full_name_lower` uses `btree` (no trgm dependency yet — TD-B1abis-02 trigram index is pending in Slice-2).
- `idx_invoices_*` may use trgm.
- Any vector indexes: per migrations 00040+ vector embeddings work.

**Mitigation if existing indexes reference unschema-qualified operator class:** the `ALTER DATABASE postgres SET search_path` line above makes `extensions` part of the default search path; existing index definitions continue to resolve. NO index rebuild needed if search_path is updated correctly.

**Verification post-apply:**

```sql
-- Confirm extensions moved
SELECT extname, extnamespace::regnamespace FROM pg_extension WHERE extname IN ('pg_trgm', 'vector');
-- Expected: extnamespace = 'extensions' for both.

-- Confirm existing indexes still work
EXPLAIN ANALYZE SELECT * FROM clients WHERE full_name ILIKE '%test%' LIMIT 10;
-- Expected: query plan resolves, returns rows.
```

### Task 2 — Author down migration 00102_*.down.sql

Reverse all three sections in inverse order:

```sql
-- 00102 DOWN: Reverse search_path + REVOKE + extension move

-- §C-reverse: Move extensions back to public
ALTER EXTENSION pg_trgm SET SCHEMA public;
ALTER EXTENSION vector SET SCHEMA public;
ALTER DATABASE postgres SET search_path TO "$user", public;  -- restore original

-- §B-reverse: Restore EXECUTE on internal-trigger functions (for rollback only)
GRANT EXECUTE ON FUNCTION public.trg_pricing_history_from_co_line() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trg_pricing_history_from_invoice_line() TO anon, authenticated;
-- ... (all 7 restored)

-- §A-reverse: Drop search_path SET clause from each function
-- (re-issue CREATE OR REPLACE FUNCTION with the body but no SET clause)
-- Executor: fetch the pre-migration definition; can be reconstructed from migration 00101 git state OR pg_proc snapshot taken pre-apply.
```

**Data-loss contract:** down migration restores function definitions + grants + extension schema. NO data loss (no rows touched in either direction). Safe to repeatedly apply + reverse.

### Task 3 — CLAUDE.md update (Dev Rules)

Add a small bullet to CLAUDE.md `## Development Rules` codifying the search_path standard for future SECURITY DEFINER functions:

```markdown
- **SECURITY DEFINER functions MUST set explicit `search_path`.** Per Supabase
  advisor 0011 (`function_search_path_mutable`) + migration 00034 canonical
  pattern + migration 00102 sweep cleanup. Default: `SET search_path = public,
  pg_temp`. If function reads from `app_private` schema, use `SET search_path =
  public, app_private, pg_temp`. NEVER use a mutable search_path (security
  vulnerability — see Postgres docs on search_path attack).
```

Cross-reference Slice-2 EXPANDED-SCOPE Q1 (B-3 trigger function bundling consideration).

## 5. Acceptance criteria

| AC | Description |
|----|-------------|
| AC-WA-iter1-01 | Migration 00102 applied; all 8 functions show non-null `proconfig` containing `search_path=...` in `pg_proc`. |
| AC-WA-iter1-02 | `get_advisors security` post-apply returns ZERO `function_search_path_mutable` entries (clean). |
| AC-WA-iter1-03 | All 5 `trg_pricing_history_from_*` functions show NO `EXECUTE` privilege for anon/authenticated in `pg_proc.proacl`. |
| AC-WA-iter1-04 | Both `create_default_*` functions show NO `EXECUTE` privilege for anon/authenticated. |
| AC-WA-iter1-05 | Trigger functions still fire correctly (insert into proposals → pricing_history row created; insert into invoice_lines → pricing_history row created). Test against fixture-harness-org. |
| AC-WA-iter1-06 | `get_advisors security` post-apply returns ZERO `anon_security_definer_function_executable` entries for the 7 revoked functions (other anon-callable functions remain as-is). |
| AC-WA-iter1-07 | `pg_extension` shows `pg_trgm` + `vector` in `extensions` schema (not `public`). |
| AC-WA-iter1-08 | `get_advisors security` post-apply returns ZERO `extension_in_public` entries. |
| AC-WA-iter1-09 | Existing indexes using trgm/vector operator classes still functional; `EXPLAIN ANALYZE` on representative query resolves. |
| AC-WA-iter1-10 | CLAUDE.md updated with search_path standard rule. |
| AC-WA-iter1-11 | Down migration `00102_*.down.sql` exists with reverse-section structure + data-loss contract comment. |
| AC-WA-iter1-12 | No application code changes required (sweep §3 confirmed zero src/ hits for the 7 REVOKE-EXECUTE functions). |
| AC-WA-iter1-13 | Smoke harness 11/13 baseline maintained (TD-WE-03 set; no regressions from migration apply). |
| AC-WA-iter1-14 | Custodian sweep confirms MED-WA-1 deferred status updated to RESOLVED in `.planning/phases/stage-f1-knowledge-graph-auth-wave-a/GATE-A-HALT.md` cross-references. |

## 6. Threat model

- **Trigger-fire regression risk:** revoking EXECUTE from anon/authenticated could break trigger fire IF trigger context inherits the calling role's privileges. **Mitigation:** Postgres triggers run with the privileges of the table's owner (typically `postgres` in Supabase), NOT the calling role. Verified pattern across 30+ migrations. Trigger-fire test in AC-WA-iter1-05.
- **Extension move breaks existing indexes:** if extension is moved without updating search_path, indexes using `gin_trgm_ops` lose resolution. **Mitigation:** `ALTER DATABASE postgres SET search_path TO "$user", public, extensions;` keeps existing references resolving.
- **search_path harden introduces wrong schema lookup:** function body may reference symbol that's now invisible due to restricted search_path. **Mitigation:** preserve body verbatim from `pg_get_functiondef`; only ADD the SET clause; do NOT rewrite the body.
- **Down migration partial-revert:** if down migration fails mid-way, system is in inconsistent state. **Mitigation:** wrap down in BEGIN..COMMIT same as up; either all sections reverse or none do.

## 7. Rollback plan

If post-apply verification fails any AC:
1. Run `00102_*.down.sql` against Supabase via MCP.
2. Verify `get_advisors security` returns to pre-apply state (the 8 mutable + 2 extensions + 7 SECURITY DEFINER lints reappear).
3. Document failure in `.planning/phases/stage-f1-wave-a-iter1-cleanup/ROLLBACK-LOG.md`.
4. Halt; surface to Jake.

If rollback itself fails (rare):
- Manual SQL via Supabase Studio to restore: function definitions (from git history of migration 00102), GRANTs (re-run GRANT EXECUTE statements), extension schema (ALTER EXTENSION ... SET SCHEMA public).
- Worst-case: restore from yesterday's automated Supabase backup. RTO ~10 min.

## 8. Verification commands

Post-apply, executor runs these queries to verify each AC:

```sql
-- AC-01: search_path set
SELECT proname, proconfig
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE (n.nspname = 'public' AND p.proname IN ('trg_change_orders_status_sync', '_compute_scheduled_payment_date', 'org_cost_codes_set_updated_at', 'touch_updated_at'))
   OR (n.nspname = 'app_private' AND p.proname IN ('co_cache_trigger', 'cleanup_stale_import_errors', 'update_vip_landed_total_cents', 'update_iel_landed_total_cents'));
-- Each row's proconfig should contain a 'search_path=...' entry.

-- AC-03 + AC-04: REVOKE complete
SELECT proname, proacl
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'trg_pricing_history_from_co_line',
    'trg_pricing_history_from_invoice_line',
    'trg_pricing_history_from_invoice_status',
    'trg_pricing_history_from_po_line',
    'trg_pricing_history_from_proposal_line',
    'create_default_approval_chains',
    'create_default_workflow_settings'
  );
-- proacl should NOT contain 'anon=X' or 'authenticated=X' EXECUTE entries.

-- AC-07: extensions moved
SELECT extname, extnamespace::regnamespace AS schema
FROM pg_extension
WHERE extname IN ('pg_trgm', 'vector');
-- Both schema columns should be 'extensions'.

-- AC-02 + AC-06 + AC-08: advisor returns clean
-- Run via MCP: mcp__supabase__get_advisors type=security
-- Verify NO entries for: function_search_path_mutable, extension_in_public,
-- and reduced count for anon/authenticated_security_definer_function_executable
-- (the 7 revoked functions should be gone; ~12 remain that are by-design anon-callable).
```

## 9. Dispatch authorization (Monday review)

Jake reviews this plan Monday. Authorization checklist before `/nx`:

- [ ] Jake confirms the 7-function REVOKE list (5 trg_pricing + 2 create_default) is the intended scope. NO other anon-callable functions get REVOKE EXECUTE without explicit add to this plan.
- [ ] Jake confirms the extension schema choice (`extensions` vs alternative name like `nightwork_extensions`).
- [ ] Jake confirms `ALTER DATABASE postgres SET search_path` is acceptable (vs per-role / per-session search_path).
- [ ] Jake confirms cost ceiling for this plan: estimated $8-12 single-plan spend ($5 execute + $3-7 QA single-reviewer set: spec-checker + database-reviewer + custodian + rls-auditor (DEF-WC-1 carry-forward verification)).
- [ ] Jake confirms sequencing: ship BEFORE Slice-2 plan-review dispatches OR after Slice-1 B-1b GATE 2 HALT closes OR in parallel with B-1b polish.

If all green: dispatch via `/nx stage-f1-wave-a-iter1-cleanup`. Plan is autonomous (`autonomous: true` in frontmatter); halts after ship for /nightwork-qa per `halt_after: true`.

## 10. Cost estimate

| Phase | Estimate | Notes |
|------|----------|-------|
| Plan-review iter-1 | $3-5 | Lean reviewer set: database-reviewer + security-reviewer + spec-checker. Skip enterprise-readiness/multi-tenant/design-pushback (no surfaces). |
| Execute | $4-6 | Single migration; 3 sections; sweep + verify. |
| /nightwork-qa | $3-5 | spec-checker + custodian + ai-logic-tester + database-reviewer. |
| **Total** | **$10-16** | Below the $50 per-plan halt gate (Rule 7d). |

Below Slice-2 ceiling absorption — if dispatched separately from Slice-2, gets its own budget envelope. Recommended Monday posture: separate dispatch + budget envelope; do NOT bundle with Slice-2 ceiling.

## 11. Cross-reference to Slice-2

Slice-2 EXPANDED-SCOPE Q1 considered bundling this Wave-A iter-1 cleanup with B-3 (SECURITY DEFINER trigger). Decision per Slice-2 Q1 recommendation: keep separate. Reasoning:

- This plan is purely cleanup of existing functions; B-3 introduces NEW functions. Mixing has unclear rollback boundary.
- Bundle slows B-3 if sweep surfaces 8+ functions needing review (per Slice-2 Q1 counter-argument).
- Separate plan = atomic rollback if either fails.

After this plan ships, B-3 plan-author inherits the canonical search_path pattern; no convention re-decision needed.
