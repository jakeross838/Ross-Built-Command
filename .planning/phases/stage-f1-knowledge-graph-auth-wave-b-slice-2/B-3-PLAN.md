---
phase: stage-f1-knowledge-graph-auth-wave-b-slice-2
plan: B-3
plan-name: soft-delete-trigger-def-wc-1-def-wc-3-rls-hardening
type: execute
threat_model_severity: high
halt_after: true
requires_smoke: true
autonomous: true
status: AUTHORED — PENDING JAKE REVIEW AT PLAN-REVIEW ITER-1
depends_on:
  - B-2a   # SHIPPED 2026-05-21 per nwrp209 (composite FK + SECURITY DEFINER + search_path discipline + REVOKE/GRANT pattern precedent)
  - B-2b   # SHIPPED 2026-05-22 per nwrp213 (activity_log.actor_token_id + lean direct authoring + halt_after precedent)
sequence:
  before: B-4   # B-3 establishes user-identity-threading + activity_log soft-delete trigger; B-4 extends entity_type union + write-site sweep
  parallel_execute_ok: false   # B-3 + B-4 share src/lib/activity-log.ts + activity_log table; strict sequential per Rule 5
acceptance-criteria-target: 11 falsifiable ACs with LIVE SQL verification queries per nwrp214 §19
qa_reviewers:
  - spec-checker
  - security-reviewer           # LOAD-BEARING per nwrp214 §17 — SECURITY DEFINER posture + ACL surface
  - multi-tenant-architect      # LOAD-BEARING per nwrp214 §16 — trigger blast radius across 32 tables + DEF-WC-1
  - rls-auditor                 # LOAD-BEARING per nwrp214 §16 — DEF-WC-1 RESTRICTIVE pattern + DEF-WC-3 accuracy
  - database-reviewer           # trigger correctness + ordering vs existing triggers + idempotent posture
  - ai-logic-tester             # Rule 3 representative queries + cross-tenant probe + audit integrity proofs
  - custodian                   # planning tree + commit chain + MASTER-PLAN + Slice-2 ledger surface
  # NO design-pushback — B-3 has no UI surface (backend-only per nwrp214 §15)
source_decisions:
  - "EXPANDED-SCOPE §1 Mapped entities (line 83) — All tenant tables ~25 (CORRECTED to 32 per pre-design audit D-02)"
  - "EXPANDED-SCOPE §1 Mapped entities (line 84) — org_members DEF-WC-1 ADD RESTRICTIVE backstop"
  - "EXPANDED-SCOPE §2 Prerequisite gaps (line 128) — current_setting('app.current_user_id', true) middleware threading is B-3's design contract"
  - "EXPANDED-SCOPE §2 Prerequisite gaps (line 129) — DEF-WC-3 RLS posture summary table is B-3 deliverable"
  - "EXPANDED-SCOPE §3 Dependent-soon gaps (line 147) — trigger works with current 4-role enum AND future expanded; role-agnostic"
  - "EXPANDED-SCOPE §4 Cross-cutting checklist (line 161, 163, 175) — Permissions, soft-delete, error handling"
  - "EXPANDED-SCOPE §5 Construction-domain checklist (line 188, 201) — Drummond + compliance retention"
  - "EXPANDED-SCOPE §7 Recommended scope expansion plan #2 (lines 327-333) — full B-3 canonical scope LOCKED"
  - "EXPANDED-SCOPE §9 HALT GATE 1 (post-B-3) (lines 538-542) — 3 verification items Jake reviews"
  - "EXPANDED-SCOPE §11 Acceptance criteria (lines 416-418, 432) — 3 B-3 ACs (expanded to 11 here per nwrp214 §19)"
  - "nwrp200/201/202 — Slice-2 re-split + B-4 leak fix lessons → mandatory pre-design audit for B-3"
  - "nwrp209 — B-2a GATE SIGNED; B-2a SHIPS; precedent for HIGH-threat pattern"
  - "nwrp213 — B-2b SHIPPED; halt_after pattern; activity_log.actor_token_id available"
  - "nwrp214 — B-3 DISPATCH full HIGH-threat rigor + MANDATORY pre-design audit baked into plan-author (B-2a lesson)"
  - "CLAUDE.md Workflow posture Rules 1-9 — Rule 1 schema≠runtime; Rule 3 ai-logic-tester executes; Rule 6 pre-flight collision; Rule 7d per-plan halt gate; Rule 9 cross-reviewer factual disagreement HALT"
  - "CLAUDE.md Architecture posture — Multi-tenant RLS BY CONSTRUCTION; Q10b scope-axis; soft-delete only"
  - "CLAUDE.md Dev Rules — SECURITY DEFINER + explicit search_path mandatory; soft-delete only; trigger-maintained caches require rationale comment"
files_modified:
  - supabase/migrations/00107_b3_soft_delete_audit_trigger_def_wc_1.sql
  - supabase/migrations/00107_b3_soft_delete_audit_trigger_def_wc_1.down.sql
  - src/lib/types/database.types.ts
  - .planning/architecture/ARCHITECTURE.md
  # Optional (plan-author decides at iter-1 per CONTEXT D-24):
  # - src/lib/supabase/service.ts (add setSessionUserId helper; defer to first consumer if not in scope)
files_referenced:
  - .planning/expansions/stage-f1-knowledge-graph-auth-wave-b-slice-2-EXPANDED-SCOPE.md
  - .planning/architecture/ENTITY-INVENTORY.md
  - .planning/architecture/ARCHITECTURE.md
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-3-CONTEXT.md
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2a-PLAN.md
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2a-SUMMARY.md
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2b-PLAN.md
  - supabase/migrations/00026_phase5_scaffolding_tables.sql   # activity_log shape
  - supabase/migrations/00074_client_portal.sql               # SECURITY DEFINER + search_path patterns
  - supabase/migrations/00102_wa_iter1_security_cleanup.sql   # search_path sweep canonical pattern
  - supabase/migrations/00103_revoke_public_execute_security_definer_triggers.sql   # REVOKE EXECUTE pattern
  - supabase/migrations/00104_b2a_token_issuance_security_model.sql
  - supabase/migrations/00105_b2a_acl_hardening.sql
  - supabase/migrations/00106_b2b_activity_log_ack_dedupe.sql
  - CLAUDE.md
---

<criteria>
mechanical:
  - "supabase/migrations/00107_b3_soft_delete_audit_trigger_def_wc_1.sql exists + applies cleanly via mcp__supabase__apply_migration"
  - "supabase/migrations/00107_b3_soft_delete_audit_trigger_def_wc_1.down.sql exists + symmetric to up"
  - "src/lib/types/database.types.ts regenerated post-migration; npm typecheck passes"
  - "Production build (`npm run build`) succeeds"
  - "Existing test suite (`npm test`) passes without regression"
dom:
  - N/A (B-3 has no UI surface)
visual:
  - N/A (B-3 has no UI surface)
behavioral:
  - "Trigger fires on test soft-delete UPDATE: UPDATE public.jobs SET deleted_at = now() WHERE id = <test_id> creates exactly one activity_log row with entity_type='jobs', action='soft_deleted'"
  - "Cross-org leak via org_members blocked: authenticated org_A user attempting SELECT from public.org_members WHERE org_id = <org_B_id> returns 0 rows post-DEF-WC-1"
  - "Trigger does NOT fire on non-soft-delete UPDATE: UPDATE public.jobs SET name = 'rename' WHERE id = <test_id> writes 0 new activity_log rows from B-3 trigger"
  - "Hard DELETE on test fixture row preserves audit chain (trigger does not fire on DELETE; documented limitation per pre-design audit D-08)"
semantic:
  - "activity_log row from trigger has correct entity_type matching TG_TABLE_NAME (table name = entity_type)"
  - "activity_log row from trigger has correct org_id matching the soft-deleted row's org_id (cross-tenant integrity)"
  - "activity_log row from trigger has actor_source IN ('auth_uid', 'app_current_user_id', 'service_role') matching the resolution tier that fired"
  - "DEF-WC-1 RESTRICTIVE policy named org_members_org_isolation exists in pg_policies"
  - "DEF-WC-3 ARCHITECTURE.md section exists + covers 32 tenant tables + 3 extension entities (org_members, activity_log, platform_admins) + client_portal_access from B-2a = 36 rows"
</criteria>

# B-3 — Soft-delete DB-trigger audit safety net + DEF-WC-1 + DEF-WC-3 + W.1 (conditional)

**Plan ID:** B-3
**Threat model:** HIGH (per CONTEXT D-32 + EXPANDED-SCOPE §7 plan #2 line 333)
**halt_after:** true (Tier 1 GATE per nwrp214 §23)
**Per-plan halt gate:** $50 (Rule 7d); B-3 estimate $35-50 base / $70-110 if landmines

## §0. Source decisions + Slice-2 ledger surface

### Authorization chain
- **EXPANDED-SCOPE RE-APPROVED** 2026-05-21 per nwrp202 §5
- **B-2a SHIPPED** 2026-05-21 per nwrp209 (composite FK + SECURITY DEFINER + REVOKE/GRANT)
- **B-2b SHIPPED** 2026-05-22 per nwrp213 (activity_log.actor_token_id + lean direct authoring + Owner Portal UI)
- **B-3 DISPATCH** 2026-05-22 per nwrp214 — full HIGH-threat rigor + mandatory pre-design audit
- **CONTEXT.md** authored 2026-05-22 with 51 D-NN decisions consolidating EXPANDED-SCOPE + nwrp214 + pre-design audit findings
- **Pre-design audit** completed 2026-05-22 against live Supabase production schema (see §1)

### Slice-2 cost ledger (per nwrp214 §27)

| Plan | Spend | Outcome |
|------|-------|---------|
| B-2 iter-1 (superseded by nwrp200 re-split) | ~$15-20 | NEEDS-WORK; 17 BLOCKING findings → B-2a + B-2b |
| **B-2a** | ~$77-98 | SHIPPED; included considered bumps ($50→$75 QA per nwrp207, $75→$85 ACL fix per nwrp208) |
| **B-2b** | ~$47-59 | SHIPPED; lean direct authoring; 5-reviewer streamlined per nwrp209 |
| **B-3 entry budget** | $35-50 base / $70-110 if landmines | Per-plan halt gate $50 (Rule 7d); halt-and-surface if mid-flight projects past |
| **Slice-2 consumed of $300** | ~$139-177 | — |
| **Remaining** | ~$123-161 | For B-3 + B-4..B-7 |

### Forward-carried gate conditions
- AC-B2a-08 (runtime revocation kill-switch) — CLOSED at B-2b GATE per nwrp213 §6 via canonical 5-step probe.
- No active forward-carry into B-3.

### Slice-2 progress
- 2 of 7 plans shipped (B-2a, B-2b).
- B-3 is plan 3 of 7.
- B-3 → B-4 sequential edge (Rule 5: B-3 + B-4 share `src/lib/activity-log.ts` + `activity_log` table; strict sequential).

---

## §1. Pre-design audit (MANDATORY per nwrp214 §7-13)

> **This section is the B-2a lesson applied:** B-2a's TWO catastrophic findings (NULL-leak RPC, timing-oracle index) were both in PRE-EXISTING code the new design assumed safe. B-3 touches deletion + RLS — prime territory for the same. The design below is built ON the verified existing posture, not an assumed one. Pre-design audit run 2026-05-22 against live Supabase production schema via `mcp__supabase__execute_sql`.

### §1.1 Target table enumeration (verified count: 32, NOT ~25 as EXPANDED-SCOPE estimated)

**Query executed** (verbatim):
```sql
WITH tenant_tables AS (
  SELECT c.table_schema, c.table_name
    FROM information_schema.columns c
   WHERE c.table_schema = 'public' AND c.column_name = 'org_id'
   INTERSECT
  SELECT c.table_schema, c.table_name
    FROM information_schema.columns c
   WHERE c.table_schema = 'public' AND c.column_name = 'deleted_at'
)
SELECT t.table_name, ... FROM tenant_tables t ORDER BY t.table_name;
```

**Result (32 tables):**

| # | Table | RLS enabled | has_status | has_status_history | approx row count |
|---|-------|-------------|------------|--------------------|------------------|
| 1 | `approval_chains` | true | false | false | 24 |
| 2 | `budget_lines` | true | false | false | 288 |
| 3 | `change_order_lines` | true | false | false | 0 |
| 4 | `change_orders` | true | true | true | 88 |
| 5 | `clients` | true | false | true | 26 |
| 6 | `cost_codes` | true | false | false | 238 |
| 7 | `document_extraction_lines` | true | false | false | 391 |
| 8 | `document_extractions` | true | false | false | 133 |
| 9 | `draw_adjustment_line_items` | true | false | false | 0 |
| 10 | `draw_adjustments` | true | false | true | 0 |
| 11 | `draw_line_items` | true | false | false | 16 |
| 12 | `draws` | true | true | true | 5 |
| 13 | `internal_billings` | true | true | false | 3 |
| 14 | `invoice_allocations` | true | false | false | 52 |
| 15 | `invoice_line_items` | true | false | false | 119 |
| 16 | `invoices` | true | true | true | 62 |
| 17 | `items` | true | false | false | 61 |
| 18 | `job_item_activity` | true | true | false | 6 |
| 19 | `job_milestones` | true | true | true | 0 |
| 20 | `jobs` | true | true | true | 26 |
| 21 | `lien_releases` | true | true | true | 0 |
| 22 | `line_bom_attachments` | true | false | false | 2 |
| 23 | `line_cost_components` | true | false | false | 285 |
| 24 | `po_line_items` | true | false | false | 0 |
| 25 | `proposal_line_items` | true | false | false | 7 |
| 26 | `proposals` | true | true | true | 1 |
| 27 | `purchase_orders` | true | true | true | 0 |
| 28 | `selection_categories` | true | false | false | 39 |
| 29 | `selections` | true | true | true | 0 |
| 30 | `unit_conversion_suggestions` | true | true | false | 3 |
| 31 | `vendor_item_pricing` | true | false | false | 7 |
| 32 | `vendors` | true | false | false | 24 |

**Finding:** 32 target tables. **EXPANDED-SCOPE estimate of ~25 was off by 7 tables.** Material for trigger application scope; cost estimate; DEF-WC-3 table size.

**All 32 tables have:**
- `org_id NOT NULL UUID`
- `deleted_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NULL` (uniform shape across all 32 — verified)
- RLS enabled (verified)

### §1.2 Existing RLS posture audit — TWO patterns observed

**Query executed**: pg_policies query filtered to 32 target tables (full output preserved separately; summary below).

#### Pattern A — canonical Wave-A RESTRICTIVE backstop family (15 tables)

`budget_lines`, `change_order_lines`, `change_orders`, `cost_codes`, `draw_line_items`, `draws`, `internal_billings`, `invoice_allocations`, `invoice_line_items`, `invoices`, `jobs`, `lien_releases`, `po_line_items`, `purchase_orders`, `vendors`

**Policies:**
- `"org isolation"` (RESTRICTIVE, ALL): `qual = ((org_id = app_private.user_org_id()) OR app_private.is_platform_admin())`; `with_check = (org_id = app_private.user_org_id())`
- `"<table>_delete_strict"` (RESTRICTIVE, DELETE): `qual = (org_id = app_private.user_org_id())`
- Multiple PERMISSIVE role-bound writes (`admin owner ...`, `accounting ...`, `pm ... on own jobs`)
- PERMISSIVE platform-admin read (`<table>_platform_admin_read`)

#### Pattern B — pre-Wave-A PERMISSIVE-only with org_members joins (17 tables)

`approval_chains`, `clients` (mixed — uses `(SELECT app_private.user_org_id())` per migration 00100), `document_extraction_lines`, `document_extractions`, `draw_adjustment_line_items`, `draw_adjustments`, `items`, `job_item_activity`, `job_milestones`, `line_bom_attachments`, `line_cost_components`, `proposal_line_items`, `proposals`, `selection_categories`, `selections`, `unit_conversion_suggestions`, `vendor_item_pricing`

**Policies (typical shape):**
- `<table>_org_insert` (PERMISSIVE, INSERT): `with_check = (org_id IN (SELECT org_members.org_id FROM org_members WHERE user_id = auth.uid() AND is_active = true AND role = ANY (ARRAY[...])))`
- `<table>_org_read` (PERMISSIVE, SELECT): `qual = (org_id IN (SELECT ... FROM org_members ...)) OR is_platform_admin()`
- `<table>_org_update` (PERMISSIVE, UPDATE): similar JOIN pattern

**NO RESTRICTIVE backstop on Pattern B tables.** A dropped or buggy PERMISSIVE policy = leak. Wave-A sweep would have converted Pattern B → Pattern A; **Pattern B → Pattern A migration is OUT OF SCOPE for B-3** (deferred to Wave 1.1-Lite per CONTEXT D-48).

**B-3 implication:** Trigger fires regardless of pattern (SECURITY DEFINER bypasses both). Pattern variance does NOT affect trigger correctness. DEF-WC-3 RLS posture summary table MUST show this taxonomy explicitly (per CONTEXT D-20).

### §1.3 org_members RLS posture (DEF-WC-1 target)

**Query executed**: `pg_policies WHERE schemaname='public' AND tablename='org_members'`

**Existing policies (3, all PERMISSIVE — NO RESTRICTIVE backstop):**

| Policy name | Permissive | Cmd | Qual | With check |
|-------------|------------|-----|------|------------|
| `admin manage org_members` | PERMISSIVE | ALL | `(org_id = app_private.user_org_id()) AND (app_private.user_role() = ANY (ARRAY['admin', 'owner']))` | same |
| `members read org_members` | PERMISSIVE | SELECT | `org_id = app_private.user_org_id()` | NULL |
| `org_members_platform_admin_read` | PERMISSIVE | SELECT | `app_private.is_platform_admin()` | NULL |

**Finding:** Confirms DEF-WC-1 gap. The 3 PERMISSIVE policies all do their own `org_id` check, but a dropped or buggy PERMISSIVE policy leaks. RESTRICTIVE backstop adds defense-in-depth.

**B-3 design (per CONTEXT D-17, D-18, D-19):**
- ADD `org_members_org_isolation` (RESTRICTIVE, ALL): `qual = ((org_id = (SELECT app_private.user_org_id())) OR (SELECT app_private.is_platform_admin()))`; `with_check = (org_id = (SELECT app_private.user_org_id()))`
- ADD `org_members_delete_strict` (RESTRICTIVE, DELETE): `qual = (org_id = (SELECT app_private.user_org_id()))`
- LEAVE existing 3 PERMISSIVE policies unchanged.

### §1.4 Existing triggers landscape on 32 target tables

**Query executed**: `pg_trigger` joined to `pg_class` filtered to 32 target tables.

**Findings:**
- **28 of 32 tables have `BEFORE UPDATE` triggers** for `updated_at` maintenance (`update_updated_at` or `touch_updated_at` PL/pgSQL functions). B-3 trigger MUST be `AFTER UPDATE` to avoid interference — BEFORE triggers fire first, set NEW.updated_at = now(), then B-3's AFTER trigger sees the final NEW row including soft-delete transition.
- **Existing AFTER UPDATE triggers detected on 3 tables:**
  - `invoices`: `trg_invoices_pricing_history_on_status`, `trg_invoices_status_budget_sync`, `trg_invoices_status_po_sync` (all fire on status transitions)
  - `change_orders`: `trg_change_orders_status_sync`
  - `invoice_line_items`: `trg_invoice_line_items_*` (AFTER INSERT not UPDATE, but coexists)
- **AFTER INSERT triggers** also detected on `change_orders` (`co_cache_trigger`), `change_order_lines`, `document_extraction_lines`, `invoice_line_items`, `po_line_items`, `proposal_line_items`, `purchase_orders`, `vendor_item_pricing` — these fire on INSERT and are independent of B-3's UPDATE trigger.

**B-3 design (per CONTEXT D-06, D-07):**
- All 32 per-table triggers named with prefix `zz_soft_delete_audit_<table>` (alphabetic 'z' = fires LAST among AFTER UPDATE triggers — other status-sync / cache triggers see final row state first).
- AFTER UPDATE (NOT BEFORE, NOT AFTER DELETE).
- WHEN clause: `(OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)` — fires only on soft-delete transition.

### §1.5 FK cascade landscape on 32 target tables

**Query executed**: `pg_constraint` filtered to FKs referencing the 32 target tables.

**Findings (~16 hard-delete CASCADE relationships):**

| Parent → Child (FK) | ON DELETE |
|---------------------|-----------|
| `change_orders → change_order_lines` | CASCADE |
| `change_orders → draw_line_items.change_order_id` | SET NULL |
| `change_orders → invoice_allocations.change_order_id` | SET NULL |
| `clients → client_portal_access.client_id` | SET NULL (single FK) |
| `clients → client_portal_access` (composite `(org_id, client_id)`) | SET NULL (B-2a) |
| `clients → jobs.client_id` | SET NULL |
| `cost_codes → internal_billing_types` | SET NULL |
| `document_extractions → document_extraction_lines` | CASCADE |
| `document_extraction_lines → line_bom_attachments (bom_)` | CASCADE |
| `document_extraction_lines → line_bom_attachments (scope_)` | CASCADE |
| `document_extraction_lines → line_cost_components` | CASCADE |
| `draw_adjustments → draw_adjustment_line_items` | CASCADE |
| `invoices → document_extractions` | CASCADE |
| `invoices → invoice_allocations` | CASCADE |
| `invoices → invoice_line_items` | CASCADE |
| `invoices → parser_corrections` | CASCADE |
| `items → item_aliases` | CASCADE |
| `items → unit_conversion_suggestions (source_extraction_line_id)` | CASCADE |
| `jobs → internal_billings` | CASCADE |
| `proposals → proposal_line_items` | CASCADE |
| `purchase_orders → po_line_items` | CASCADE |
| `vendor_item_pricing → line_cost_components` | CASCADE |

**Most other FKs**: `ON DELETE NO ACTION` (Postgres default; parent can't be deleted if children exist).

**B-3 implication (per CONTEXT D-08):**
- B-3's soft-delete trigger fires ONLY on UPDATE deleted_at; it does NOT fire on hard-DELETE CASCADE events.
- **Consistency gap:** if a parent is hard-deleted with CASCADE, children are DELETEd (not UPDATEd). B-3 trigger does NOT capture the cascade in audit log.
- **Mitigation:** Hard-DELETE is forbidden per CLAUDE.md ("Never delete records — soft delete only"). CASCADE only fires on admin-driven hard-deletes which are themselves out-of-flow events; usually wrapped in admin tooling that audits at parent level.
- **Acceptance:** Documented gap; NOT a B-3 in-scope fix. **Reviewers may push back** — if multi-tenant-architect / rls-auditor escalate to BLOCKING, surface to Jake at iter-1 SYNTHESIS.

### §1.6 Soft-delete pattern uniformity

**Query executed**: `information_schema.columns WHERE column_name='deleted_at' AND table_name IN <32 tables>`

**Finding:** All 32 tables have:
- `deleted_at timestamp with time zone`
- `is_nullable = YES`
- `column_default = NULL`

**Perfect uniformity.** Trigger function uses generic `OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL` predicate; no per-table customization needed.

### §1.7 activity_log shape (target write surface)

**Query executed**: `information_schema.columns WHERE table_name='activity_log'`

**Schema confirmed (post-B-2a + B-2b ships):**

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | `gen_random_uuid()` |
| `org_id` | uuid | NO | — |
| `user_id` | uuid | YES | — |
| `entity_type` | text | NO | — |
| `entity_id` | uuid | YES | — |
| `action` | text | NO | — |
| `details` | jsonb | YES | — |
| `created_at` | timestamptz | NO | `now()` |
| `actor_token_id` | uuid | YES | — (B-2a addition) |

**B-3 trigger writes:**
- `org_id` ← row.org_id (cross-tenant integrity — trigger reads NEW.org_id and writes it; the activity_log row stays in the same tenant as the soft-deleted row)
- `user_id` ← three-tier fallback (auth.uid() → app.current_user_id → NULL)
- `entity_type` ← `TG_TABLE_NAME` (table name; generic across 32)
- `entity_id` ← NEW.id (the soft-deleted row's id)
- `action` ← `'soft_deleted'` (canonical action string)
- `details` ← JSONB `{actor_source: '...', row_snapshot_summary: {...}}` (bounded scope per CONTEXT D-14)
- `actor_token_id` ← NULL (soft-delete is always user-initiated, never token-initiated; per CONTEXT D-15)

### §1.8 SECURITY DEFINER + search_path canonical patterns

**Query executed**: `pg_proc` joined to `pg_namespace` filtered to `prosecdef=true` in public + app_private schemas.

**Findings — canonical pattern variants:**
- `SET search_path = public, pg_temp` (most common; canonical for B-3)
- `SET search_path = public, app_private, pg_temp` (cross-schema; used by `cleanup_stale_import_errors`)
- `SET search_path = public` (legacy; superseded by 00102 sweep)
- `SET search_path = ""` (most restrictive; used by `app_private.user_org_id`, `app_private.is_platform_admin` — these don't access tables)

**B-3 design (per CONTEXT D-10):**
- `app_private.audit_soft_delete()` uses `SET search_path = public, pg_temp` (writes to `public.activity_log` only; no cross-schema reads).

**REVOKE/GRANT discipline (per migration 00103 + B-2a ACL hardening lesson per nwrp208):**
- `REVOKE EXECUTE ON FUNCTION app_private.audit_soft_delete() FROM PUBLIC;` (canonical 00103 sweep pattern)
- No EXECUTE grant to `anon` or `authenticated` — trigger function is called BY the trigger mechanism, not by SQL clients.

### §1.9 `current_setting('app.current_user_id', true)` threading status

**Grep executed**: `app\.current_user_id|set_config\('app\.|setSessionUser|current_setting\('app\.` across `src/`

**Result: NO files match.** The `app.current_user_id` GUC is NOT currently set anywhere in the codebase. EXPANDED-SCOPE §2 #13 confirms: "DESIGN CONTRACT — B-3 establishes."

**Query executed**: `pg_get_functiondef` on `auth.uid()` function body.

**Finding:**
```sql
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $function$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$function$;
```

**Critical design implication (per CONTEXT D-23, D-24):**
- `auth.uid()` reads from `request.jwt.claim.sub` GUC set by PostgREST per-transaction. NO new middleware wiring needed for the ~95% authenticated-user case.
- `app.current_user_id` GUC is service-role escape hatch ONLY — used when API routes deliberately invoke service-role Supabase clients (which lack JWT context).
- **B-3 trigger reads via three-tier fallback:**
  1. `auth.uid()` — primary (covers authenticated calls)
  2. `current_setting('app.current_user_id', true)` — service-role escape
  3. NULL — fallback for headless context (Inngest, pg_cron, smoke seed)

This is a SIMPLER design than EXPANDED-SCOPE §2 #13 implied. The original wording "current_setting populated by getCurrentMembership()" is essentially redundant with `auth.uid()` for authenticated calls. **Recommend Jake confirms this design refinement at GATE B-3.**

### §1.10 Pre-design audit summary

| # | Audit area | Finding | B-3 implication |
|---|------------|---------|------------------|
| 1 | Target table count | 32 (NOT ~25) | Trigger applies to 32; DEF-WC-3 table sizes 32 |
| 2 | deleted_at shape | Uniform across 32 | Generic trigger function; no per-table customization |
| 3 | RLS posture | TWO patterns (A: 15 tables canonical Wave-A; B: 17 tables PERMISSIVE-only joins) | DEF-WC-3 must show taxonomy; Pattern B → A migration DEFERRED |
| 4 | org_members RLS | NO RESTRICTIVE backstop (3 PERMISSIVE only) | DEF-WC-1 fills gap |
| 5 | Existing triggers | 28 BEFORE UPDATE for updated_at; 3 AFTER UPDATE on invoices; 1 AFTER UPDATE on change_orders | B-3 trigger uses AFTER UPDATE + zz_-prefix to fire LAST |
| 6 | FK cascade | ~16 CASCADE relationships | Audit gap on hard-delete (documented; mitigation: hard-delete forbidden) |
| 7 | activity_log shape | post-B-2a + B-2b: id+org_id+user_id+entity_type+entity_id+action+details+created_at+actor_token_id | Trigger writes 7 columns; sets actor_token_id=NULL |
| 8 | SECURITY DEFINER patterns | Canonical = `SET search_path = public, pg_temp` + REVOKE EXECUTE FROM PUBLIC | B-3 trigger function inherits |
| 9 | app.current_user_id GUC | NOT currently set anywhere | B-3 establishes design contract; auth.uid() is primary; app.current_user_id is service-role escape |

**Cross-finding observations:**
- **NO blockers surfaced.** B-3 scope is implementable as designed.
- **Consistency gap on hard-DELETE CASCADE** (§1.5) is documented + mitigated; reviewers may push back.
- **EXPANDED-SCOPE ~25 estimate** was off by 7 tables; cost / DEF-WC-3 table size grow accordingly but stay within B-3 estimated $35-50 budget.
- **EXPANDED-SCOPE §2 #13 design contract for app.current_user_id** is REFINED here — auth.uid() is canonical primary; app.current_user_id is service-role escape ONLY. Plan-author surfaces refinement for Jake at iter-1 + GATE B-3.

---

## §2. Design

### §2.1 Trigger function `app_private.audit_soft_delete()`

```sql
CREATE OR REPLACE FUNCTION app_private.audit_soft_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_actor_source text;
  v_snapshot jsonb;
BEGIN
  -- Three-tier user-id resolution
  -- Tier 1: auth.uid() (PostgREST sets request.jwt.claim.sub per transaction)
  v_user_id := auth.uid();
  v_actor_source := 'auth_uid';

  -- Tier 2: app.current_user_id (service-role escape hatch — set by route via set_config)
  IF v_user_id IS NULL THEN
    v_user_id := nullif(current_setting('app.current_user_id', true), '')::uuid;
    IF v_user_id IS NOT NULL THEN
      v_actor_source := 'app_current_user_id';
    END IF;
  END IF;

  -- Tier 3: NULL with service-role marker (Inngest, pg_cron, smoke seed)
  IF v_user_id IS NULL THEN
    v_actor_source := 'service_role';
  END IF;

  -- Build bounded row snapshot summary (NOT full row dump — activity_log has 7-year retention)
  -- Plan-author finalizes the bounded snapshot scope at iter-1; tentative:
  v_snapshot := jsonb_build_object(
    'actor_source', v_actor_source,
    'deleted_at', NEW.deleted_at,
    'trigger_name', TG_NAME,
    'trigger_table', TG_TABLE_NAME
  );

  -- Write activity_log row (APPEND-ONLY per CLAUDE.md soft-delete + status_history rules)
  INSERT INTO public.activity_log (
    org_id, user_id, entity_type, entity_id, action, details, actor_token_id
  ) VALUES (
    NEW.org_id,          -- cross-tenant integrity: audit row stays in same tenant as the soft-deleted row
    v_user_id,           -- nullable; resolved via three-tier fallback
    TG_TABLE_NAME,       -- generic across 32 tables
    NEW.id,              -- soft-deleted row's id
    'soft_deleted',      -- canonical action string
    v_snapshot,          -- bounded JSONB with actor_source + deleted_at + trigger context
    NULL                 -- actor_token_id = NULL (soft-delete is always user-initiated)
  );

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION app_private.audit_soft_delete() FROM PUBLIC;
-- NO EXECUTE grant to anon/authenticated — function invoked by trigger mechanism only
```

**Properties (verifiable):**
- `SECURITY DEFINER` (canonical for trigger functions writing across RLS)
- `SET search_path = public, pg_temp` (CLAUDE.md mandate)
- `REVOKE EXECUTE FROM PUBLIC` (canonical 00103 + B-2a ACL hardening posture)
- Returns NEW (preserves the soft-delete UPDATE)
- Throws nothing on missing user_id (per CONTEXT D-25 — trigger MUST NOT block underlying soft-delete)

### §2.2 Per-table trigger application

Migration 00107 contains a DO block that loops over the 32 target tables:

```sql
DO $$
DECLARE
  v_table text;
  v_target_tables text[] := ARRAY[
    'approval_chains','budget_lines','change_order_lines','change_orders','clients',
    'cost_codes','document_extraction_lines','document_extractions','draw_adjustment_line_items',
    'draw_adjustments','draw_line_items','draws','internal_billings','invoice_allocations',
    'invoice_line_items','invoices','items','job_item_activity','job_milestones','jobs',
    'lien_releases','line_bom_attachments','line_cost_components','po_line_items',
    'proposal_line_items','proposals','purchase_orders','selection_categories','selections',
    'unit_conversion_suggestions','vendor_item_pricing','vendors'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_target_tables LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I ON public.%I',
      'zz_soft_delete_audit_' || v_table,
      v_table
    );
    EXECUTE format(
      'CREATE TRIGGER %I AFTER UPDATE ON public.%I FOR EACH ROW WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) EXECUTE FUNCTION app_private.audit_soft_delete()',
      'zz_soft_delete_audit_' || v_table,
      v_table
    );
  END LOOP;
END $$;
```

**Properties (verifiable):**
- Trigger name: `zz_soft_delete_audit_<table>` (alphabetic 'z' = fires LAST among AFTER UPDATE triggers per pre-design audit §1.4)
- Timing: AFTER UPDATE
- Granularity: FOR EACH ROW
- WHEN clause: only on soft-delete transition (NULL → NOT NULL on deleted_at)
- Idempotent: DROP IF EXISTS + CREATE pattern; re-running migration is safe
- DO block uses format() + %I (PostgreSQL identifier quoting) to prevent SQL injection from the hard-coded table list

### §2.3 DEF-WC-1 — org_members RESTRICTIVE backstop

```sql
-- RESTRICTIVE backstop mirrors canonical Wave-A pattern (jobs / invoices / vendors)
CREATE POLICY "org_members_org_isolation" ON public.org_members
  AS RESTRICTIVE
  FOR ALL
  USING ((org_id = (SELECT app_private.user_org_id())) OR (SELECT app_private.is_platform_admin()))
  WITH CHECK (org_id = (SELECT app_private.user_org_id()));

-- DELETE backstop closes platform_admin-cross-org-delete vector
CREATE POLICY "org_members_delete_strict" ON public.org_members
  AS RESTRICTIVE
  FOR DELETE
  USING (org_id = (SELECT app_private.user_org_id()));
```

**Properties (verifiable):**
- RESTRICTIVE (AND's with existing PERMISSIVE policies)
- `(SELECT ...)` wrapping per CLAUDE.md Q10b session-cache pattern (avoids per-row function evaluation)
- Cross-org reads now blocked regardless of PERMISSIVE policy bugs (defense-in-depth)
- platform_admin retains SELECT access (matches canonical jobs/invoices pattern) but NOT cross-org DELETE access

### §2.4 DEF-WC-3 — ARCHITECTURE.md RLS posture summary table

New section in `.planning/architecture/ARCHITECTURE.md` (exact section number determined at iter-1 — plan-author reads current TOC and slots appropriately).

**Section content sketch:**

```markdown
## §X. RLS posture summary table by entity

Captures the as-is RLS posture for every tenant-scoped entity post-B-3 ship. Pattern variance documented to enable future Pattern B → Pattern A uniformity sweep (deferred to Wave 1.1-Lite).

| Entity (table) | RLS pattern | Scope axis (Q10b) | Soft-delete trigger | Audit coverage |
|---------------|-------------|--------------------|--------------------|-----------------|
| approval_chains | B (PERMISSIVE-only joins) | ORG-scoped tenant | YES (B-3) | Trigger only |
| budget_lines | A (RESTRICTIVE backstop) | ORG-scoped tenant | YES (B-3) | Trigger only |
| change_order_lines | A | ORG-scoped tenant | YES (B-3) | Trigger only |
| change_orders | A | ORG-scoped tenant | YES (B-3) | Both (app `logActivity` + trigger) |
| clients | A (post-00100) | ORG-scoped tenant | YES (B-3) | Both |
| cost_codes | A | ORG-scoped tenant | YES (B-3) | Trigger only |
| document_extraction_lines | B | ORG-scoped tenant | YES (B-3) | Trigger only |
| ... (29 more rows) ... | ... | ... | ... | ... |
| **Extension rows:** | | | | |
| org_members | A (post-B-3 DEF-WC-1) | ORG-scoped tenant | N/A (no deleted_at) | App only |
| activity_log | A | ORG-scoped tenant | N/A (append-only; no deleted_at) | N/A (IS the audit) |
| platform_admins | Special (cross-org) | Cross-tenant | N/A | App only |
| client_portal_access | A (post-B-2a) | ORG-scoped tenant | YES (B-2a added deleted_at? confirm at iter-1) | Both |

**Legend:**
- **RLS pattern A** = canonical Wave-A: RESTRICTIVE "org isolation" backstop + role-bound PERMISSIVE writes
- **RLS pattern B** = pre-Wave-A: PERMISSIVE-only with `org_id IN (SELECT FROM org_members)` JOIN-style isolation
- **Scope axis Q10b** — ORG-scoped tenant (direct-filter RLS) vs USER-scoped child (RLS-by-join)
- **Soft-delete trigger** — `zz_soft_delete_audit_<table>` from B-3 fires on `deleted_at` transition NULL → NOT NULL
- **Audit coverage** — application-layer `logActivity` calls + trigger-layer `audit_soft_delete` complement
```

**Plan-author confirms row count at iter-1**: 32 soft-delete tables + 3 extension rows (org_members, activity_log, platform_admins) + 1 client_portal_access from B-2a = 36 rows total. Per CONTEXT D-22.

### §2.5 W.1 listener unflag (CONDITIONAL — D-28)

**Decision posture:** Today is 2026-05-22, 7 days post-Slice-1 B-1b ship (2026-05-15). Observation window per EXPANDED-SCOPE §7 plan #2 is "1-2 weeks." Status: PARTIAL.

**Plan-author recommendation:** **DEFER W.1 to B-4** (the safer call). 7-day window is on the boundary; full 2-week window needs another week.

**If Jake overrides at iter-1** (chooses to ship W.1 in B-3): add `NEXT_PUBLIC_AUTH_STATE_LISTENER=true` to Vercel Production + Preview environments via `vercel env add`. ONE verification gate task in PLAN body — Sentry shows no auth-state-change error rate spike during 7 days post-unflag. NOT a code change.

**B-3 PLAN body authored on the DEFER assumption.** If Jake overrides at iter-1, add Task X authoring W.1.

### §2.6 Service-role escape helper (CONDITIONAL — D-24)

**Decision posture:** B-3 ships the trigger function with three-tier resolution (auth.uid() → app.current_user_id → NULL). The `setSessionUserId(supabaseClient, userId)` helper would be used by service-role API routes deliberately impersonating a user (e.g., admin actions on behalf of another user, async jobs propagating actor context).

**Plan-author recommendation:** **DEFER helper to first consumer.** B-3 ships the trigger + documents the escape pattern in commit body. First service-role route that needs to capture an actor user_id (likely in B-4 or later) authors the helper. Out-of-scope for B-3 to seed the helper without a consumer.

**If reviewers push back at iter-1** (request the helper as part of B-3): add as Task X with ~10 lines + 1 unit test.

---

## §3. Tasks (atomic commit sequence)

### Task 1 — Author migration 00107 (single commit)

**Subject:** `feat(stage-f1-wave-b-slice-2): B-3 Task 1 — migration 00107 soft-delete audit trigger + DEF-WC-1`

**Scope:**
- Create `supabase/migrations/00107_b3_soft_delete_audit_trigger_def_wc_1.sql`:
  - `CREATE OR REPLACE FUNCTION app_private.audit_soft_delete()` (per §2.1)
  - `REVOKE EXECUTE ON FUNCTION app_private.audit_soft_delete() FROM PUBLIC`
  - DO block applying 32 per-table triggers (per §2.2)
  - `CREATE POLICY org_members_org_isolation` (RESTRICTIVE, ALL — per §2.3)
  - `CREATE POLICY org_members_delete_strict` (RESTRICTIVE, DELETE — per §2.3)
- Create `supabase/migrations/00107_b3_soft_delete_audit_trigger_def_wc_1.down.sql` (reverse order)

**Inline verification (executor runs within apply transaction):**
- M-01: trigger function exists → `SELECT proname FROM pg_proc WHERE proname='audit_soft_delete';` returns 1 row
- M-02: function has SECURITY DEFINER + search_path set → `SELECT prosecdef, proconfig FROM pg_proc WHERE proname='audit_soft_delete';`
- M-03: 32 triggers applied → `SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE 'zz_soft_delete_audit_%' AND NOT tgisinternal;` returns 32
- M-04: org_members RESTRICTIVE policies exist → `SELECT policyname, permissive FROM pg_policies WHERE tablename='org_members' AND permissive='RESTRICTIVE';` returns 2 rows
- M-05: EXECUTE not granted to PUBLIC → `SELECT proacl FROM pg_proc WHERE proname='audit_soft_delete';` does NOT contain `=X/postgres`
- M-06: `npx supabase gen types typescript --linked > src/lib/types/database.types.ts` regenerates

**Commit body cites:**
- B-3-CONTEXT.md D-01..D-51
- B-3-PLAN.md §1 (pre-design audit findings) + §2 (design)
- CLAUDE.md Dev Rules (SECURITY DEFINER + search_path; soft-delete only)
- nwrp214 §7-13 mandatory pre-design audit
- nwrp208 ACL hardening pattern (REVOKE EXECUTE FROM PUBLIC)

**Files modified:**
- `supabase/migrations/00107_b3_soft_delete_audit_trigger_def_wc_1.sql` (NEW)
- `supabase/migrations/00107_b3_soft_delete_audit_trigger_def_wc_1.down.sql` (NEW)
- `src/lib/types/database.types.ts` (REGEN)

**Deviation handling:**
- If `auth.uid()` evaluation inside trigger function raises (e.g., context missing): trigger function must guard with `BEGIN ... EXCEPTION WHEN OTHERS THEN ...` to tier-down gracefully. Plan-author finalizes exception handling at iter-1.
- If DO block fails on any of the 32 tables (e.g., table has been renamed since pre-design audit): halt + surface; do NOT bypass.

### Task 2 — ARCHITECTURE.md DEF-WC-3 RLS posture summary table (single commit)

**Subject:** `docs(stage-f1-wave-b-slice-2): B-3 Task 2 — ARCHITECTURE.md DEF-WC-3 RLS posture summary table`

**Scope:**
- Insert new section `§X. RLS posture summary table by entity` in `.planning/architecture/ARCHITECTURE.md` (exact section number determined by reading current TOC).
- Table: 36 rows (32 soft-delete + 4 extension entities — see §2.4).
- Legend: 4 entries (RLS pattern A/B, Scope axis Q10b, Soft-delete trigger, Audit coverage).
- Cross-reference: link to `.planning/architecture/ENTITY-INVENTORY.md` + `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-3-PLAN.md` §2.4.

**Commit body cites:**
- EXPANDED-SCOPE §2 line 129 (DEF-WC-3 is B-3 deliverable)
- EXPANDED-SCOPE §7 plan #2 line 331 (DEF-WC-3 partial — full table per Q12)
- B-3-PLAN.md §1.2 (Pattern A/B taxonomy discovery via pre-design audit)
- B-3-PLAN.md §2.4 (table design)

**Files modified:**
- `.planning/architecture/ARCHITECTURE.md` (UPDATE)

### Task 3 — Smoke harness verification (no commit — verification only)

**Scope:**
- Run smoke harness against fixture-harness-org (Drummond + harness-fixture-org)
- Verify ≤2 failures matching TD-WE-03 set (Wave-B prereq #12)
- Verify NO new failures introduced by B-3 trigger (e.g., fixture seed soft-deletes don't break)
- Verify `npm run build` succeeds
- Verify `npm test` passes (existing tests)

**Output:** Recorded in B-3-SUMMARY.md post-execute.

### Task 4 — Author B-3-SUMMARY.md (single commit)

**Subject:** `docs(stage-f1-wave-b-slice-2): B-3 Task 4 — SUMMARY.md authored + MASTER-PLAN update`

**Scope:**
- Author `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-3-SUMMARY.md`:
  - Status: AUTHORED — PENDING GATE B-3 REVIEW
  - Acceptance criteria status (all 11 ACs with verbatim verification query output)
  - Forward-carried gates: HALT GATE 1 (post-B-3) per EXPANDED-SCOPE §9 — 3 verification items
  - Risks materialized / mitigated
  - Slice-2 ledger entry (B-3 actual spend)
- Update `.planning/MASTER-PLAN.md` §9 (Slice-2 progress: 2 of 7 → 3 of 7); §11 (B-3 row 🔒 → ✅ pending GATE)

**Files modified:**
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-3-SUMMARY.md` (NEW)
- `.planning/MASTER-PLAN.md` (UPDATE)

**Commit body cites:**
- nwrp214 §23 halt_after: true
- B-3-PLAN.md §4 (Acceptance criteria results)

### Task 5 (CONDITIONAL — if Jake approves W.1 at GATE B-3) — W.1 listener unflag

**Subject:** `chore(stage-f1-wave-b-slice-2): B-3 Task 5 — W.1 listener unflag env-var addition`

**Scope:**
- `vercel env add NEXT_PUBLIC_AUTH_STATE_LISTENER=true production`
- `vercel env add NEXT_PUBLIC_AUTH_STATE_LISTENER=true preview`
- ONE verification gate: Sentry shows no auth-state-change error rate spike during 7 days post-unflag.

**Files modified:** NONE (env-var addition is operations-only)

**DEFER POSTURE:** Per §2.5 + CONTEXT D-28, plan-author defers to B-4. Task 5 is NOT in the B-3 execute sequence unless Jake overrides at iter-1 SYNTHESIS or GATE B-3.

---

## §4. Acceptance criteria (11 falsifiable ACs with LIVE SQL verification queries per nwrp214 §19)

Each AC has a LIVE verification query that the executor / reviewer runs against the live schema. Per nwrp214 §19, AC-text-only is INSUFFICIENT for HIGH-threat plans.

### AC-B3-01 — Trigger function applied to all 32 tenant tables

**Verification query (LIVE):**
```sql
SELECT COUNT(*) AS trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace ns ON c.relnamespace = ns.oid
 WHERE ns.nspname = 'public'
   AND NOT t.tgisinternal
   AND t.tgname LIKE 'zz_soft_delete_audit_%';
```

**Expected:** `trigger_count = 32`.

**Falsifiability:** If migration applied only some tables, count < 32; PLAN execute halts at this AC.

### AC-B3-02 — Trigger fires correctly on soft-delete UPDATE

**Verification query (LIVE):**
```sql
-- Capture activity_log baseline
SELECT COUNT(*) AS baseline_count FROM public.activity_log;

-- Pick a representative test row from any of the 32 target tables (jobs is canonical)
-- Use Drummond org for predictability
WITH test_job AS (
  SELECT id, org_id FROM public.jobs WHERE org_id = '<drummond_org_id>' AND deleted_at IS NULL LIMIT 1
),
soft_delete AS (
  UPDATE public.jobs
     SET deleted_at = NOW()
   WHERE id = (SELECT id FROM test_job)
  RETURNING id, org_id
)
SELECT count_after - <baseline_count> AS new_audit_rows,
       (SELECT entity_type FROM public.activity_log WHERE entity_id = (SELECT id FROM soft_delete) ORDER BY created_at DESC LIMIT 1) AS captured_entity_type,
       (SELECT action FROM public.activity_log WHERE entity_id = (SELECT id FROM soft_delete) ORDER BY created_at DESC LIMIT 1) AS captured_action
  FROM (SELECT COUNT(*) AS count_after FROM public.activity_log) c;

-- Rollback the test soft-delete (undo)
UPDATE public.jobs SET deleted_at = NULL WHERE id = (SELECT id FROM test_job);
```

**Expected:**
- `new_audit_rows = 1` (exactly one activity_log row created by trigger)
- `captured_entity_type = 'jobs'`
- `captured_action = 'soft_deleted'`

**Falsifiability:** If trigger missing or misfiring, new_audit_rows = 0 OR captured_action != 'soft_deleted'.

### AC-B3-03 — Trigger does NOT fire on non-soft-delete UPDATE

**Verification query (LIVE):**
```sql
SELECT COUNT(*) AS baseline FROM public.activity_log;

-- UPDATE without changing deleted_at
WITH test_job AS (
  SELECT id FROM public.jobs WHERE org_id = '<drummond_org_id>' AND deleted_at IS NULL LIMIT 1
),
no_op_update AS (
  UPDATE public.jobs SET updated_at = NOW() WHERE id = (SELECT id FROM test_job)
  RETURNING id
)
SELECT COUNT(*) - <baseline> AS new_audit_rows FROM public.activity_log;
```

**Expected:** `new_audit_rows = 0`.

**Falsifiability:** If WHEN clause is missing or wrong (e.g., fires on every UPDATE), new_audit_rows > 0.

### AC-B3-04 — DEF-WC-1 RESTRICTIVE policies applied

**Verification query (LIVE):**
```sql
SELECT policyname, permissive, cmd
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename = 'org_members'
   AND permissive = 'RESTRICTIVE'
 ORDER BY policyname;
```

**Expected:** 2 rows:
- `org_members_delete_strict | RESTRICTIVE | DELETE`
- `org_members_org_isolation | RESTRICTIVE | ALL`

**Falsifiability:** If DEF-WC-1 missing or partial, row count != 2.

### AC-B3-05 — Cross-org leak via org_members blocked (Q3-equivalent catastrophic-leak proof per nwrp214 §19)

**Verification query (LIVE — load-bearing):**
```sql
-- Identify two orgs with org_members rows
SELECT DISTINCT org_id FROM public.org_members ORDER BY org_id LIMIT 2;
-- Capture: <org_A_id>, <org_B_id>

-- Set session to org_B authenticated user (or via service-role with explicit org_B membership claim)
-- Test pattern matches B-2a's AC-B2a-06 Q3 precedent — load-bearing live attempt.

-- Attempt the cross-org read (org_B user querying org_A's org_members)
SELECT COUNT(*) AS leak_rows
  FROM public.org_members
 WHERE org_id = '<org_A_id>';
-- Run from session authenticated as org_B member (NOT platform_admin)
```

**Expected:** `leak_rows = 0` (RESTRICTIVE policy blocks cross-org read regardless of PERMISSIVE policy variance).

**Falsifiability:** If RESTRICTIVE policy missing or misauthored, leak_rows > 0 = BLOCKING.

**Notes:**
- ai-logic-tester executes this against LIVE DB (per Rule 3); not inferred from migration text.
- platform_admin should retain cross-org read access (verify via separate query — platform_admin SELECT returns rows). RESTRICTIVE backstop is `(org_id = user_org_id()) OR is_platform_admin()`.

### AC-B3-06 — Three-tier user-id resolution works correctly

**Verification query (LIVE — three test cases):**

**Tier 1 (auth.uid set via JWT):**
```sql
-- Test from authenticated session (jwt.claim.sub = some real user_id)
-- Soft-delete a test row
UPDATE public.jobs SET deleted_at = NOW() WHERE id = '<test_id>';
SELECT user_id, details->>'actor_source' FROM public.activity_log WHERE entity_id = '<test_id>' ORDER BY created_at DESC LIMIT 1;
```
Expected: `user_id = <auth_uid>`, `actor_source = 'auth_uid'`.

**Tier 2 (auth.uid NULL, app.current_user_id set):**
```sql
-- From service-role context (NO JWT)
SELECT set_config('app.current_user_id', '<test_user_id>', true);
UPDATE public.jobs SET deleted_at = NOW() WHERE id = '<test_id>';
SELECT user_id, details->>'actor_source' FROM public.activity_log WHERE entity_id = '<test_id>' ORDER BY created_at DESC LIMIT 1;
```
Expected: `user_id = <test_user_id>`, `actor_source = 'app_current_user_id'`.

**Tier 3 (both NULL):**
```sql
-- From service-role context with NO set_config
UPDATE public.jobs SET deleted_at = NOW() WHERE id = '<test_id>';
SELECT user_id, details->>'actor_source' FROM public.activity_log WHERE entity_id = '<test_id>' ORDER BY created_at DESC LIMIT 1;
```
Expected: `user_id = NULL`, `actor_source = 'service_role'`.

**Falsifiability:** If tier resolution buggy, actor_source != expected OR user_id != expected.

### AC-B3-07 — activity_log row has correct org_id (cross-tenant integrity)

**Verification query (LIVE):**
```sql
-- After trigger fires from §AC-B3-02
SELECT al.org_id AS audit_org_id, j.org_id AS source_org_id
  FROM public.activity_log al
  JOIN public.jobs j ON j.id = al.entity_id
 WHERE al.entity_id = '<test_id>'
   AND al.action = 'soft_deleted';
```

**Expected:** `audit_org_id = source_org_id` (trigger preserves cross-tenant integrity).

**Falsifiability:** If trigger writes wrong org_id (e.g., from session instead of NEW row), audit_org_id != source_org_id.

### AC-B3-08 — Trigger function has correct SECURITY DEFINER + search_path posture

**Verification query (LIVE):**
```sql
SELECT prosecdef AS security_definer,
       array_to_string(proconfig, ',') AS config_settings,
       array_to_string(proacl, ',') AS acl
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
 WHERE n.nspname = 'app_private'
   AND p.proname = 'audit_soft_delete';
```

**Expected:**
- `security_definer = true`
- `config_settings` contains `search_path=public, pg_temp`
- `acl` does NOT contain `=X/postgres` (PUBLIC EXECUTE) AND does NOT contain `anon=X/` AND does NOT contain `authenticated=X/` (matches B-2a ACL hardening)

**Falsifiability:** If migration sets wrong search_path OR misses REVOKE FROM PUBLIC, posture check fails.

### AC-B3-09 — DEF-WC-3 ARCHITECTURE.md RLS posture summary table exists

**Verification (file-system + content):**
```bash
grep -n "RLS posture summary table by entity" .planning/architecture/ARCHITECTURE.md
```

**Expected:** Section header exists.

**Verification (row count):**
```bash
# Count rows in the markdown table after the section header
awk '/RLS posture summary table by entity/,/^## /' .planning/architecture/ARCHITECTURE.md | grep -c '^|'
```

**Expected:** ≥37 rows (1 header row + 32 soft-delete + 4 extension rows; allowing for legend rows).

**Falsifiability:** If section missing or table truncated.

### AC-B3-10 — Trigger does NOT block soft-delete on missing user_id (graceful degradation)

**Verification query (LIVE):**
```sql
-- From a context where auth.uid() returns NULL AND app.current_user_id is NULL
-- (e.g., pg_cron job, raw SQL via service-role)
UPDATE public.jobs SET deleted_at = NOW() WHERE id = '<test_id>';
-- Should succeed (NOT raise exception)
SELECT deleted_at FROM public.jobs WHERE id = '<test_id>';
-- Expected: deleted_at IS NOT NULL (the UPDATE succeeded)

-- And activity_log captured the event
SELECT COUNT(*) FROM public.activity_log WHERE entity_id = '<test_id>' AND action = 'soft_deleted';
-- Expected: 1
```

**Expected:** UPDATE succeeds; activity_log row created with `user_id = NULL` + `actor_source = 'service_role'`.

**Falsifiability:** If trigger raises on missing user_id, UPDATE fails OR activity_log not written.

### AC-B3-11 — Smoke harness post-B-3 ≤2 failures matching TD-WE-03 set

**Verification (smoke harness):**
- Run smoke against fixture-harness-org
- Expected: ≤2 failures matching TD-WE-03 set (Wave-B prereq #12 baseline maintained)
- NO new failures from B-3 trigger introduction (especially around fixture seed paths)

**Falsifiability:** If B-3 trigger breaks fixture seed (e.g., service-role soft-deletes blocked or audit_log writes failing), smoke fails.

---

## §5. Risks

### R-1 — Hard-DELETE CASCADE silently misses audit trail (per §1.5)

**Risk:** ~16 FK CASCADE relationships exist in schema. When a parent is hard-deleted, children are DELETEd (not UPDATEd). B-3's soft-delete trigger does NOT fire on DELETE events; cascade-deleted rows are NOT audited.

**Mitigation:** Hard-DELETE is forbidden per CLAUDE.md ("Never delete records — soft delete only"). CASCADE only fires on admin-driven hard-deletes which are themselves out-of-flow events.

**Disposition:** ACCEPTED gap. Documented in §1.5. Plan-author surfaces for reviewer challenge at iter-1. If multi-tenant-architect / rls-auditor / database-reviewer escalate to BLOCKING, surface to Jake at SYNTHESIS.

**Possible Wave 1.1-Lite follow-up:** Add `BEFORE DELETE` trigger (not just AFTER UPDATE) to capture pre-deletion row snapshot in audit_log. Deferred to keep B-3 scope tight.

### R-2 — Trigger function performance impact at scale (per EXPANDED-SCOPE §11 line 608)

**Risk:** Trigger fires on EVERY soft-delete across 32 tables. At F1+ scale (100 orgs × 14 jobs × 50 invoices each = 70k invoices), if many soft-deletes per day, audit_log + trigger overhead could become noticeable.

**Mitigation:**
- EXPLAIN ANALYZE on representative soft-delete UPDATE post-ship; threshold <5ms overhead per trigger fire.
- If higher, plan-author surfaces per-table opt-in (vs blanket application).
- activity_log already has 7-year retention; trigger row size is modest (~200 bytes; not bloated).

**Disposition:** PLAN execute includes EXPLAIN ANALYZE measurement task as part of AC verification. Surface results in B-3-SUMMARY.md.

### R-3 — `current_setting('app.current_user_id', true)` middleware threading misses paths (per EXPANDED-SCOPE §11 line 609)

**Risk:** Service-role API routes that don't set `app.current_user_id` will record `actor_source = 'service_role'` instead of the impersonated user.

**Mitigation:**
- Trigger gracefully degrades to NULL user_id with marker (per CONTEXT D-25 + AC-B3-10).
- Plan-author surveys all Supabase client creation sites (preliminary at iter-1) and documents which service-role paths SHOULD set the GUC.
- Adoption sweep across existing routes deferred to B-4 / Wave 1.1-Lite per CONTEXT D-50 (first-consumer pattern).

**Disposition:** ACCEPTED — B-3 ships trigger + documents pattern; full sweep is future work.

### R-4 — Cross-reviewer factual disagreement on RLS pattern naming (per Rule 9)

**Risk:** Reviewers may disagree on Pattern A vs Pattern B naming, or on whether Pattern B → Pattern A migration should be in B-3 scope.

**Mitigation:**
- Pre-design audit §1.2 surfaces this taxonomy explicitly with evidence (pg_policies queries).
- B-3 PLAN explicitly defers Pattern B → A migration to Wave 1.1-Lite (CONTEXT D-48).
- Reviewer disagreements HALT per Rule 9 — surface to Jake for resolution.

**Disposition:** If iter-1 surfaces factual disagreement on RLS pattern taxonomy or scope, HALT per Rule 9. Resolution requires verification against migration source (NOT majority-rule consensus).

### R-5 — SECURITY DEFINER trigger function bypasses RLS incorrectly (writes activity_log to wrong org)

**Risk:** Trigger reads `NEW.org_id` and writes `activity_log.org_id = NEW.org_id`. If trigger function body has a bug (e.g., reads from session GUC instead of NEW row), audit_log could leak cross-org.

**Mitigation:**
- AC-B3-07 verifies cross-tenant integrity LIVE.
- Trigger function body deliberately uses `NEW.org_id` (not session-derived) — per §2.1.
- Reviewers verify function body line-by-line at iter-1.

**Disposition:** Explicit AC + reviewer verification. NO BLOCKING risk if mitigations hold.

### R-6 — Plan estimate $35-50 base; could run hot (B-2a precedent: $70-110)

**Risk:** Per-plan halt gate $50 (Rule 7d). If iter-1 surfaces unexpected complexity (e.g., reviewer disagrees on RLS pattern taxonomy + requires iter-2 revision), spend could project past $50.

**Mitigation:**
- Halt-and-surface posture per Rule 7d + nwrp214 §21.
- Pre-design audit BEFORE design (this Plan body) was the load-bearing front-loading of work — meant to surface landmines early.
- Slice-2 remaining budget ~$123-161 allows for considered-bump if needed (per nwrp208 precedent), but only with explicit Jake authorization.

**Disposition:** Monitor at iter-1 SYNTHESIS. Halt if projects past $50.

### R-7 — Trigger ordering interferes with existing AFTER UPDATE triggers

**Risk:** Per pre-design audit §1.4, 4 existing AFTER UPDATE triggers fire on invoices + change_orders + invoice_line_items. If B-3 trigger fires BEFORE them (due to alphabetic name collision), it could see intermediate row state.

**Mitigation:**
- B-3 trigger names use `zz_soft_delete_audit_<table>` prefix → fires LAST alphabetically.
- WHEN clause limits firing to soft-delete transition only (not every UPDATE) — minimizing interaction window.
- AC-B3-02 verifies trigger fires correctly with expected row state.

**Disposition:** Explicit AC + alphabetic-naming-by-design. NO BLOCKING risk if mitigations hold.

---

## §6. Files modified (frontmatter mirror)

- `supabase/migrations/00107_b3_soft_delete_audit_trigger_def_wc_1.sql` (NEW)
- `supabase/migrations/00107_b3_soft_delete_audit_trigger_def_wc_1.down.sql` (NEW)
- `src/lib/types/database.types.ts` (REGEN per CLAUDE.md schema-regen rule)
- `.planning/architecture/ARCHITECTURE.md` (UPDATE — DEF-WC-3 section addition)
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-3-SUMMARY.md` (NEW)
- `.planning/MASTER-PLAN.md` (UPDATE — Slice-2 progress 2→3)

**OPTIONAL** (plan-author decides at iter-1 per CONTEXT D-24):
- `src/lib/supabase/service.ts` (UPDATE — `setSessionUserId(client, userId)` helper)
- Vercel Production + Preview env: `NEXT_PUBLIC_AUTH_STATE_LISTENER=true` (CONDITIONAL per §2.5)

---

## §7. Rollback plan

### Schema rollback (migration 00107)

`supabase/migrations/00107_b3_soft_delete_audit_trigger_def_wc_1.down.sql` reverses:

1. Drop `org_members_delete_strict` policy
2. Drop `org_members_org_isolation` policy
3. DO block loops over 32 target tables: `DROP TRIGGER IF EXISTS zz_soft_delete_audit_<table> ON public.<table>;`
4. `DROP FUNCTION IF EXISTS app_private.audit_soft_delete();`

### Documentation rollback

- ARCHITECTURE.md DEF-WC-3 section removed via subsequent commit
- B-3-SUMMARY.md marked status DEPLOYED-THEN-ROLLED-BACK with rationale
- MASTER-PLAN.md §9 reverts Slice-2 progress 3 → 2 with explanatory commit

### Production rollback steps (post-Vercel-deploy, if needed)

Per `.planning/deployment.md` rollback runbook:
1. `vercel promote <previous-deploy-url> --prod` (revert frontend, but frontend hasn't changed — schema-only rollback)
2. Apply down migration: `npx supabase migration list` to confirm 00107 status; if applied, run down migration via Supabase dashboard SQL editor.
3. Regen types: `npx supabase gen types typescript --linked > src/lib/types/database.types.ts`
4. Verify: re-run AC-B3-01..AC-B3-10 — all expected to FAIL post-rollback (which is correct — they test for B-3's presence).

### activity_log row preservation on rollback

**IMPORTANT:** activity_log rows created BY THE TRIGGER between ship and rollback are NOT deleted. activity_log is APPEND-ONLY per CLAUDE.md soft-delete + status_history rules. Rolled-back triggers preserve their historical audit captures.

If admin needs to purge rolled-back-trigger audit rows: separate operations-only SQL DELETE statement, audit-logged externally. Out-of-scope for B-3 PLAN.

---

## §8. Plan-review iter-1 expectations

### Reviewer scope (7 reviewers, full HIGH-threat — NO design-pushback)

Per CONTEXT D-33 + nwrp214 §15:

1. **spec-checker** — verify all 11 ACs trace to delivered design + live verification queries present + falsifiability rigorous
2. **security-reviewer (LOAD-BEARING)** — SECURITY DEFINER posture verification (search_path, REVOKE/GRANT, function body correctness); ACL hardening matches B-2a precedent per nwrp208
3. **multi-tenant-architect (LOAD-BEARING)** — trigger blast radius across 32 tables; cross-tenant integrity (NEW.org_id write); DEF-WC-1 correctness vs canonical Wave-A pattern
4. **rls-auditor (LOAD-BEARING)** — DEF-WC-1 RESTRICTIVE pattern correctness; DEF-WC-3 audit table accuracy vs `pg_policies` live data
5. **database-reviewer** — trigger function correctness + ordering vs existing triggers (per §1.4 alphabetic 'z' design); migration shape (DO block + idempotent posture); FK CASCADE consistency gap (§1.5) acceptance
6. **ai-logic-tester** — Rule 3 executes representative queries (AC-B3-02, AC-B3-05, AC-B3-06); cross-org probe LIVE; audit-log integrity proofs
7. **custodian** — planning tree + commit chain alignment; MASTER-PLAN §9 update preview; Slice-2 ledger surface

**NO design-pushback** per nwrp214 §15 — no UI surface.

### Cross-reviewer alignment expectations

Surface findings categorized:
- BLOCKING — must fix iter-1 + iter-2 OR halt for Jake
- MUST-FIX — fix iter-2 (within $50 gate)
- NICE-TO-HAVE — defer to Wave 1.1-Lite
- DEFERRED — acknowledge but not in scope

### Halt conditions

Per nwrp214 §22 + Rule 7c/d/9:
- Per-plan halt gate $50 approached → HALT
- Cross-reviewer factual disagreement (Rule 9) → HALT for Jake
- New BLOCKING finding on RLS pattern taxonomy → HALT for re-scope conversation
- B-3-PLAN total spend approaching ceiling → HALT for fresh-ceiling reset (B-2a precedent per nwrp208)

### halt_after: true contract

Per nwrp214 §23, after plan-review iter-1 (and any iter-2 if findings warrant):
1. Author PLAN-REVIEW-B3-ITER1-SYNTHESIS.md
2. Surface PLAN.md + pre-design audit + iter-1 findings + Slice-2 ledger to Jake
3. **HALT — do NOT auto-/nx**
4. Jake reviews against LIVE DB; signs GATE B-3 SIGNED OR routes back for revision

---

## §9. Plan integrity attestation

### Falsifiability checklist (per plan-checker)

- [x] All 11 ACs have LIVE SQL verification queries (NOT AC-text-only)
- [x] Pre-design audit findings preserved verbatim in §1
- [x] Migration boundary explicit (single migration 00107 atomic)
- [x] Rollback plan symmetric to forward migration
- [x] Per-plan halt gate $50 acknowledged
- [x] Cross-reviewer alignment expectations specified
- [x] halt_after: true contract documented

### CLAUDE.md compliance checklist

- [x] **Multi-tenant RLS BY CONSTRUCTION** — DEF-WC-1 RESTRICTIVE backstop adds defense-in-depth
- [x] **Q10b scope-axis** — org_members is ORG-scoped tenant (direct-filter RLS); RESTRICTIVE backstop applies
- [x] **Soft-delete only** — trigger fires on UPDATE deleted_at (NOT on hard-DELETE; hard-delete forbidden)
- [x] **SECURITY DEFINER + search_path** — `SET search_path = public, pg_temp` explicit
- [x] **REVOKE EXECUTE FROM PUBLIC** — canonical 00103 pattern + B-2a ACL hardening lesson
- [x] **Append-only audit log** — trigger writes via INSERT (NO updates, NO deletes)
- [x] **Rule 1 schema ≠ runtime** — every AC has LIVE verification query
- [x] **Rule 2 PostgREST FK citation** — N/A (no PostgREST embedding hints in B-3)
- [x] **Rule 3 ai-logic-tester executes** — AC-B3-02/05/06 require LIVE execution
- [x] **Rule 6 pre-flight collision** — pre-design audit (§1) is the pre-flight; no design-token / hex / org_id collisions in DB-only files
- [x] **Rule 7d per-plan halt gate** — $50 gate explicit in §5 R-6
- [x] **Rule 9 cross-reviewer HALT** — explicit in §8

### Source decisions citation (per nwrp152)

All decisions traceable to source — see frontmatter `source_decisions` block (16 cited sources).

### Slice-2 ledger surface (per nwrp214 §27)

| Metric | Value |
|--------|-------|
| Slice-2 ceiling | $300 (raised from $200 per nwrp209) |
| Consumed | ~$139-177 (B-2 iter-1 + B-2a + B-2b) |
| Remaining | ~$123-161 |
| B-3 estimate | $35-50 base / $70-110 if landmines |
| B-3 per-plan halt gate | $50 |
| Plans remaining post-B-3 | 4 (B-4 + B-5 + B-6 + B-7) |
| Avg remaining budget per plan | $18-28 (after B-3 ships at high-end) |

**Halt-and-surface posture:** Plan-author halts at iter-1 SYNTHESIS if B-3 projects past $50 OR if BLOCKING reviewer findings require iter-2 + execute + re-verify cycle that pushes past gate.

---

## §10. References

### Source-of-truth documents
- `.planning/expansions/stage-f1-knowledge-graph-auth-wave-b-slice-2-EXPANDED-SCOPE.md` (RE-APPROVED 2026-05-21)
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-3-CONTEXT.md` (51 D-NN decisions)
- `.planning/MASTER-PLAN.md` (Slice-2 progress + DECISIONS LOG)
- `.planning/architecture/ARCHITECTURE.md` (DEF-WC-3 target)
- `.planning/architecture/ENTITY-INVENTORY.md` (entity catalog with Retention class + PII?)
- `CLAUDE.md` (Architecture posture + Workflow posture Rules 1-9 + Dev Rules)

### Predecessor plans (B-2a + B-2b)
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2a-PLAN.md` (composite FK + SECURITY DEFINER precedent)
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2a-SUMMARY.md` (HIGH-threat ship attestation)
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2b-PLAN.md` (lean direct authoring precedent)
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2b-SUMMARY.md` (halt_after pattern)

### Canonical migration precedents
- `supabase/migrations/00026_phase5_scaffolding_tables.sql` (activity_log shape)
- `supabase/migrations/00074_client_portal.sql` (SECURITY DEFINER + search_path patterns)
- `supabase/migrations/00102_wa_iter1_security_cleanup.sql` (search_path sweep)
- `supabase/migrations/00103_revoke_public_execute_security_definer_triggers.sql` (REVOKE EXECUTE pattern)
- `supabase/migrations/00104_b2a_token_issuance_security_model.sql` (B-2a security model precedent)
- `supabase/migrations/00105_b2a_acl_hardening.sql` (ACL discipline)
- `supabase/migrations/00106_b2b_activity_log_ack_dedupe.sql` (partial unique index pattern)

### nwrp chain
- nwrp200 (Slice-2 re-split B-2 → B-2a + B-2b)
- nwrp201 (rate-limit DB-backed lock)
- nwrp202 (EXPANDED-SCOPE RE-APPROVED)
- nwrp209 (B-2a GATE SIGNED + ships)
- nwrp213 (B-2b GATE CLOSED + ships)
- nwrp214 (B-3 DISPATCH with mandatory pre-design audit)

---

**End of B-3-PLAN.md.**
