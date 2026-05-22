---
phase: stage-f1-knowledge-graph-auth-wave-b-slice-2
plan: B-3
plan-name: soft-delete-trigger-def-wc-1-def-wc-3-rls-hardening
type: execute
threat_model_severity: high
halt_after: true
requires_smoke: true
autonomous: true
status: REVISED ITER-2 — PENDING JAKE REVIEW AT GATE B-3 (per nwrp215 §15-16)
depends_on:
  - B-2a   # SHIPPED 2026-05-21 per nwrp209 (composite FK + SECURITY DEFINER + search_path discipline + REVOKE/GRANT pattern precedent)
  - B-2b   # SHIPPED 2026-05-22 per nwrp213 (activity_log.actor_token_id + lean direct authoring + halt_after precedent)
sequence:
  before: B-4   # B-3 establishes user-identity-threading + activity_log soft-delete trigger; B-4 extends entity_type union + write-site sweep
  parallel_execute_ok: false   # B-3 + B-4 share src/lib/activity-log.ts + activity_log table; strict sequential per Rule 5
acceptance-criteria-target: 12 falsifiable ACs with LIVE SQL verification queries per nwrp214 §19 (iter-2 added AC-B3-12 per-table verification per nwrp215 decision 5)
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
  - "nwrp215 — Iter-2 authorized: 5 decisions (cost bump $50→$75; DEF-WC-1 canonical direct-call; reuse 'deleted' action; defer W.1 to B-4; ADD Task 6 per-table verification). HALT after iter-2."
  - "CLAUDE.md Workflow posture Rules 1-9 — Rule 1 schema≠runtime; Rule 3 ai-logic-tester executes; Rule 6 pre-flight collision; Rule 7d per-plan halt gate; Rule 9 cross-reviewer factual disagreement HALT"
  - "CLAUDE.md Architecture posture — Multi-tenant RLS BY CONSTRUCTION; Q10b scope-axis; soft-delete only"
  - "CLAUDE.md Dev Rules — SECURITY DEFINER + explicit search_path mandatory; soft-delete only; trigger-maintained caches require rationale comment"
files_modified:
  - supabase/migrations/00107_b3_soft_delete_audit_trigger_def_wc_1.sql
  - supabase/migrations/00107_b3_soft_delete_audit_trigger_def_wc_1.down.sql
  - src/lib/types/database.types.ts
  - .planning/architecture/ARCHITECTURE.md
  - src/lib/activity-log.ts                  # iter-2 BLOCKING-1 fix: extend ActivityEntityType union with 23 new singular entity_types
  - src/lib/audit/action-labels.ts           # iter-2 BLOCKING-1 fix: extend ENTITY_LABELS Record with same 23 entity types (Record exhaustiveness)
  # NOTE iter-2 decision (per nwrp215 §5): action stays 'deleted' (existing ActivityAction member);
  # mechanism discriminator in details.actor_source + details.mechanism = 'db_trigger'.
  # No ActivityAction union extension; no ACTION_LABELS Record changes.
  #
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
  - "Trigger fires on test soft-delete UPDATE: UPDATE public.jobs SET deleted_at = now() WHERE id = <drummond_job_id> creates exactly one activity_log row with entity_type='job' (singular, mapped via CASE), action='deleted', details.actor_source IN ('auth_uid','app_current_user_id','service_role'), details.mechanism='db_trigger'"
  - "Cross-org leak via org_members blocked: authenticated org_A user attempting SELECT from public.org_members WHERE org_id = <org_B_id> returns 0 rows post-DEF-WC-1 (verified LIVE under authenticated session context per AC-B3-05)"
  - "Trigger does NOT fire on non-soft-delete UPDATE: UPDATE public.jobs SET name = 'rename' WHERE id = <drummond_job_id> writes 0 new activity_log rows from B-3 trigger"
  - "Hard DELETE on test fixture row preserves audit chain (trigger does not fire on DELETE; documented limitation per pre-design audit §1.5 + R-1)"
  - "Per-table verification (AC-B3-12 / Task 6): DO-block loops over all 32 tables; each table's trigger fires correctly on soft-delete OR correctly does NOT apply (e.g., client_portal_access has no deleted_at)"
semantic:
  - "activity_log row from trigger has correct entity_type matching singular CASE mapping (e.g., TG_TABLE_NAME='jobs' → entity_type='job'); NOT plural raw TG_TABLE_NAME"
  - "activity_log row from trigger has correct org_id matching the soft-deleted row's org_id (cross-tenant integrity)"
  - "activity_log row from trigger has details.actor_source IN ('auth_uid', 'app_current_user_id', 'service_role') matching the resolution tier that fired"
  - "activity_log row from trigger has details.mechanism = 'db_trigger' (discriminates from app-layer logActivity rows which omit this field)"
  - "DEF-WC-1 RESTRICTIVE policy named org_members_org_isolation exists in pg_policies; uses canonical direct-call form `(org_id = app_private.user_org_id()) OR app_private.is_platform_admin()` (NOT SELECT-wrapped — per nwrp215 decision 2 Option A)"
  - "DEF-WC-3 ARCHITECTURE.md section exists + covers 32 soft-delete tables + 4 extension entities (org_members, activity_log, platform_admins, client_portal_access) = 36 data rows"
</criteria>

# B-3 — Soft-delete DB-trigger audit safety net + DEF-WC-1 + DEF-WC-3 + W.1 (conditional)

**Plan ID:** B-3
**Threat model:** HIGH (per CONTEXT D-32 + EXPANDED-SCOPE §7 plan #2 line 333)
**halt_after:** true (Tier 1 GATE per nwrp214 §23 + nwrp215 §15)
**Per-plan halt gate:** $75 (iter-2 bump per nwrp215 §3 — explicit Jake authorization, scoped EXCLUSIVELY to iter-2 revision + re-review; NOT autonomous). Original $50 gate per Rule 7d preserved for B-4..B-7.

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

**Findings (iter-2 CORRECTED via fresh live query per MF-7):**
- **27 of 32 tables have `BEFORE UPDATE` triggers** for `updated_at` maintenance (`update_updated_at` or `touch_updated_at` PL/pgSQL functions). B-3 trigger MUST be `AFTER UPDATE` to avoid interference — BEFORE triggers fire first, set NEW.updated_at = now(), then B-3's AFTER trigger sees the final NEW row including soft-delete transition.
- **Existing AFTER UPDATE triggers detected on 8 tables (15 total triggers — iter-2 corrected count):**
  - `change_order_lines`: 2 triggers
  - `change_orders`: 2 triggers (incl. `co_cache_trigger` AFTER INSERT/UPDATE/DELETE per migration 00042)
  - `document_extraction_lines`: 1 trigger
  - `invoice_line_items`: 3 triggers (budget_sync, po_sync, pricing_history)
  - `invoices`: 3 triggers (pricing_history_on_status, status_budget_sync, status_po_sync)
  - `po_line_items`: 2 triggers
  - `proposal_line_items`: 1 trigger
  - `purchase_orders`: 1 trigger
- **All existing trigger names use `trg_*` prefix.** Live query (`SELECT tgname FROM pg_trigger WHERE NOT tgisinternal AND tgname > 'z'`) confirms NO existing triggers above 'z' alphabetically — `zz_*` prefix from B-3 will fire LAST among same-event/timing triggers as designed.

**B-3 design (per CONTEXT D-06, D-07):**
- All 32 per-table triggers named with prefix `zz_soft_delete_audit_<table>` (alphabetic 'z' = fires LAST among AFTER UPDATE triggers — other status-sync / cache triggers see final row state first).
- AFTER UPDATE (NOT BEFORE, NOT AFTER DELETE).
- WHEN clause: `(OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)` — fires only on soft-delete transition.

**Iter-2 note:** Initial §1.4 understated the existing AFTER UPDATE count (claimed 4, actual 15 across 8 tables). Design conclusion unchanged — `zz_` prefix correctly fires last per the alphabetic-naming-by-design property. The corrected count is now accurate; future plan-authors reasoning about trigger ordering have the right baseline.

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
- `entity_type` ← singular form mapped via CASE in trigger body (iter-2 BLOCKING-1 fix per nwrp215 decision 3b; e.g., `TG_TABLE_NAME='jobs'` → `entity_type='job'`)
- `entity_id` ← NEW.id (the soft-deleted row's id)
- `action` ← `'deleted'` (existing ActivityAction union member — iter-2 BLOCKING-2 fix per nwrp215 decision 3b; soft-delete IS deletion semantically; mechanism in details)
- `details` ← JSONB `{actor_source: '...', mechanism: 'db_trigger', deleted_at: ..., trigger_name: ..., trigger_table: ...}` — `mechanism: 'db_trigger'` discriminates from app-layer `logActivity` calls (which omit this field)
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

### §2.1 Trigger function `app_private.audit_soft_delete()` (iter-2 REVISED)

**Iter-2 changes incorporated:**
- BLOCKING-1 fix: entity_type singular mapping via CASE statement (TG_TABLE_NAME is plural; activity_log uses singular per 74-row precedent + TS union)
- BLOCKING-2 fix: action = `'deleted'` (existing ActivityAction union member; soft-delete IS a deletion semantically per nwrp215 decision 3b; mechanism in `details.actor_source`)
- BLOCKING-3 fix: Wrap body in `BEGIN ... EXCEPTION WHEN OTHERS THEN ... END` to gracefully degrade per AC-B3-10
- WARNING-1 fix: Tier-resolution logic restructured for auditability (single IF/ELSIF/ELSE block)
- MF-8 fix: Service-role-only contract documented in inline comment

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
  v_entity_type text;
  v_snapshot jsonb;
BEGIN
  -- BLOCKING-1 fix (nwrp215 decision 3b): plural TG_TABLE_NAME → singular entity_type
  -- Maps to existing ActivityEntityType union members; falls through to singular form
  -- of the table name (s-strip) for tables not in the canonical singular set.
  -- See src/lib/activity-log.ts:32-49 for the canonical union; B-4 extends to add the
  -- 23 new singular entity types this trigger introduces (proposal, lien_release, etc.).
  v_entity_type := CASE TG_TABLE_NAME
    -- Existing ActivityEntityType union members (singular form already canonical):
    WHEN 'invoices' THEN 'invoice'
    WHEN 'jobs' THEN 'job'
    WHEN 'vendors' THEN 'vendor'
    WHEN 'cost_codes' THEN 'cost_code'
    WHEN 'draws' THEN 'draw'
    WHEN 'change_orders' THEN 'change_order'
    WHEN 'budget_lines' THEN 'budget_line'
    WHEN 'purchase_orders' THEN 'purchase_order'
    WHEN 'clients' THEN 'client'
    -- New singular entity types (B-4 extends ActivityEntityType union to cover these):
    WHEN 'approval_chains' THEN 'approval_chain'
    WHEN 'change_order_lines' THEN 'change_order_line'
    WHEN 'document_extraction_lines' THEN 'document_extraction_line'
    WHEN 'document_extractions' THEN 'document_extraction'
    WHEN 'draw_adjustment_line_items' THEN 'draw_adjustment_line_item'
    WHEN 'draw_adjustments' THEN 'draw_adjustment'
    WHEN 'draw_line_items' THEN 'draw_line_item'
    WHEN 'internal_billings' THEN 'internal_billing'
    WHEN 'invoice_allocations' THEN 'invoice_allocation'
    WHEN 'invoice_line_items' THEN 'invoice_line_item'
    WHEN 'items' THEN 'item'
    WHEN 'job_item_activity' THEN 'job_item_activity'  -- already singular shape
    WHEN 'job_milestones' THEN 'job_milestone'
    WHEN 'lien_releases' THEN 'lien_release'
    WHEN 'line_bom_attachments' THEN 'line_bom_attachment'
    WHEN 'line_cost_components' THEN 'line_cost_component'
    WHEN 'po_line_items' THEN 'po_line_item'
    WHEN 'proposal_line_items' THEN 'proposal_line_item'
    WHEN 'proposals' THEN 'proposal'
    WHEN 'selection_categories' THEN 'selection_category'
    WHEN 'selections' THEN 'selection'
    WHEN 'unit_conversion_suggestions' THEN 'unit_conversion_suggestion'
    WHEN 'vendor_item_pricing' THEN 'vendor_item_pricing'  -- already singular shape
    ELSE TG_TABLE_NAME  -- fallback (should never hit; defense-in-depth)
  END;

  -- W-1 fix (iter-2): Tier-resolution restructured as IF/ELSIF/ELSE for auditability.
  -- Three-tier user-id resolution:
  --   Tier 1: auth.uid() — primary (PostgREST sets request.jwt.claim.sub per transaction)
  --   Tier 2: current_setting('app.current_user_id', true) — service-role escape hatch
  --   Tier 3: NULL — fallback for true headless context
  --
  -- MF-8 CONTRACT (per nwrp215): set_config('app.current_user_id', user_id, true) is
  -- set ONLY by trusted server-side code (service-role API routes deliberately propagating
  -- actor context). NEVER by client-bound SQL (PostgREST, anon-token-resolved contexts,
  -- JWT-bound user contexts). Violation = audit-spoofing surface. The trigger does NOT
  -- guard against spoof because the threat is contained to service-role code paths.
  IF auth.uid() IS NOT NULL THEN
    v_user_id := auth.uid();
    v_actor_source := 'auth_uid';
  ELSIF nullif(current_setting('app.current_user_id', true), '') IS NOT NULL THEN
    v_user_id := nullif(current_setting('app.current_user_id', true), '')::uuid;
    v_actor_source := 'app_current_user_id';
  ELSE
    v_user_id := NULL;
    v_actor_source := 'service_role';
  END IF;

  -- Bounded row snapshot summary (NOT full row dump — activity_log has 7-year retention).
  -- Mechanism (soft-delete via trigger vs app-layer logActivity call) lives in details.actor_source.
  v_snapshot := jsonb_build_object(
    'actor_source', v_actor_source,
    'deleted_at', NEW.deleted_at,
    'trigger_name', TG_NAME,
    'trigger_table', TG_TABLE_NAME,
    'mechanism', 'db_trigger'  -- discriminator from app-layer logActivity calls
  );

  -- BLOCKING-3 fix (iter-2): Wrap INSERT in EXCEPTION block to enforce AC-B3-10 graceful
  -- degradation contract. If activity_log INSERT fails for any reason (constraint, lock
  -- timeout, schema mismatch, transient error), trigger RAISE WARNING + RETURN NEW —
  -- does NOT propagate exception to caller. The soft-delete UPDATE succeeds; audit row
  -- may be lost (visible via Sentry WARNING). Better to lose one audit row than to
  -- silently block a soft-delete on every tenant table.
  BEGIN
    -- Write activity_log row (APPEND-ONLY per CLAUDE.md soft-delete + status_history rules)
    -- BLOCKING-2 fix (nwrp215 decision 3b): use existing 'deleted' action; discriminate
    -- soft-delete via details.actor_source + details.mechanism = 'db_trigger'
    INSERT INTO public.activity_log (
      org_id, user_id, entity_type, entity_id, action, details, actor_token_id
    ) VALUES (
      NEW.org_id,          -- cross-tenant integrity: audit row stays in same tenant as soft-deleted row
      v_user_id,           -- nullable; resolved via three-tier fallback (see above)
      v_entity_type,       -- singular form mapped via CASE (NOT raw TG_TABLE_NAME plural)
      NEW.id,              -- soft-deleted row's id
      'deleted',           -- existing ActivityAction union member (NOT 'soft_deleted')
      v_snapshot,          -- bounded JSONB with actor_source + mechanism discriminator
      NULL                 -- actor_token_id = NULL (soft-delete is always user-initiated)
    );
  EXCEPTION WHEN OTHERS THEN
    -- Graceful degradation: log the warning + continue. Soft-delete UPDATE succeeds;
    -- audit-trail gap visible via Sentry / Postgres logs. The trigger MUST NOT block
    -- the underlying soft-delete on every tenant table.
    RAISE WARNING 'audit_soft_delete trigger failed for table=% id=% org=%: %',
                  TG_TABLE_NAME, NEW.id, NEW.org_id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION app_private.audit_soft_delete() FROM PUBLIC;
-- NO EXECUTE grant to anon/authenticated — function invoked by trigger mechanism only
-- (verified post-migration via aclexplode + grantee=0 pattern; see AC-B3-08)
```

**Properties (verifiable):**
- `SECURITY DEFINER` (canonical for trigger functions writing across RLS)
- `SET search_path = public, pg_temp` (CLAUDE.md mandate)
- `REVOKE EXECUTE FROM PUBLIC` (canonical 00103 + B-2a ACL hardening posture per nwrp208)
- Returns NEW (preserves the soft-delete UPDATE)
- **Throws nothing** on missing user_id OR on activity_log INSERT failure (per CONTEXT D-25 + AC-B3-10 — trigger MUST NOT block underlying soft-delete; exceptions surface via RAISE WARNING + Sentry)
- entity_type singular form maps via CASE (BLOCKING-1 fix per nwrp215 decision 3b)
- action = `'deleted'` (existing ActivityAction union; BLOCKING-2 fix per nwrp215 decision 3b)
- `details.actor_source` + `details.mechanism = 'db_trigger'` discriminate trigger-written rows from app-layer `logActivity` calls (semantic clarity without union expansion)

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

### §2.3 DEF-WC-1 — org_members RESTRICTIVE backstop (iter-2 REVISED — canonical direct-call form)

**Iter-2 change (per nwrp215 decision 2 Option A + rls-auditor MF-RLS-01):** DEF-WC-1 adopts the canonical direct-call form (`app_private.user_org_id()` without `(SELECT ...)` wrapping) to match the existing 14 Pattern A tables verbatim. The Q10b SELECT-wrapped session-cache form was considered but rejected — consistency across the RLS policy surface beats local optimization on this single high-frequency table. If a future Wave 1.1-Lite sweep normalizes the canonical 14 tables to SELECT-wrapped form, DEF-WC-1 normalizes along with them at that time.

```sql
-- RESTRICTIVE "org isolation" backstop mirrors canonical Wave-A pattern verbatim
-- (jobs / invoices / vendors / 11 other Pattern A tables; see pre-design audit §1.2).
-- Uses direct-call form (NOT (SELECT ...) wrapping) for consistency per nwrp215 decision 2.
CREATE POLICY "org_members_org_isolation" ON public.org_members
  AS RESTRICTIVE
  FOR ALL
  USING ((org_id = app_private.user_org_id()) OR app_private.is_platform_admin())
  WITH CHECK (org_id = app_private.user_org_id());

-- DELETE backstop closes platform_admin-cross-org-delete vector.
-- DELIBERATELY omits is_platform_admin() OR-clause per canonical pattern (migration 00049).
-- platform_admin retains cross-org SELECT (via org_isolation policy above)
-- but NOT cross-org DELETE — cross-org membership removal is an operations event
-- that must be audited separately via admin tooling. Per W-3 / iter-2 rationale codification.
CREATE POLICY "org_members_delete_strict" ON public.org_members
  AS RESTRICTIVE
  FOR DELETE
  USING (org_id = app_private.user_org_id());
```

**Properties (verifiable):**
- RESTRICTIVE (AND's with existing 3 PERMISSIVE policies — `admin manage org_members`, `members read org_members`, `org_members_platform_admin_read`)
- Direct-call form `app_private.user_org_id()` (NOT SELECT-wrapped) — matches canonical 14 Pattern A tables verbatim per nwrp215 decision 2 + rls-auditor MF-RLS-01
- Cross-org reads now blocked regardless of PERMISSIVE policy bugs (defense-in-depth)
- platform_admin retains SELECT access (matches canonical jobs/invoices pattern) but NOT cross-org DELETE access (per W-3 rationale)

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
| clients | B (PERMISSIVE-only — iter-2 corrected per rls-auditor MF-RLS-02; 3 PERMISSIVE policies, NO RESTRICTIVE backstop) | ORG-scoped tenant | YES (B-3) | Both |
| cost_codes | A | ORG-scoped tenant | YES (B-3) | Trigger only |
| document_extraction_lines | B | ORG-scoped tenant | YES (B-3) | Trigger only |
| document_extractions | B | ORG-scoped tenant | YES (B-3) | Trigger only |
| draw_adjustment_line_items | B | ORG-scoped tenant | YES (B-3) | Trigger only |
| draw_adjustments | B | ORG-scoped tenant | YES (B-3) | Trigger only |
| draw_line_items | A | ORG-scoped tenant | YES (B-3) | Trigger only |
| draws | A | ORG-scoped tenant | YES (B-3) | Both (app + trigger) |
| internal_billings | A | ORG-scoped tenant | YES (B-3) | Trigger only |
| invoice_allocations | A (Q10b SELECT-wrapped — sole table on this form; see migration 00096) | ORG-scoped tenant | YES (B-3) | Trigger only |
| invoice_line_items | A | ORG-scoped tenant | YES (B-3) | Trigger only |
| invoices | A | ORG-scoped tenant | YES (B-3) | Both (app + trigger) |
| items | B | ORG-scoped tenant | YES (B-3) | Trigger only |
| job_item_activity | B | ORG-scoped tenant | YES (B-3) | Trigger only |
| job_milestones | B | ORG-scoped tenant | YES (B-3) | Both (app + trigger) |
| jobs | A | ORG-scoped tenant | YES (B-3) | Both (app + trigger) |
| lien_releases | A | ORG-scoped tenant | YES (B-3) | Both (app + trigger) |
| line_bom_attachments | B | ORG-scoped tenant | YES (B-3) | Trigger only |
| line_cost_components | B | ORG-scoped tenant | YES (B-3) | Trigger only |
| po_line_items | A | ORG-scoped tenant | YES (B-3) | Trigger only |
| proposal_line_items | B | ORG-scoped tenant | YES (B-3) | Trigger only |
| proposals | B | ORG-scoped tenant | YES (B-3) | Both (app + trigger) |
| purchase_orders | A | ORG-scoped tenant | YES (B-3) | Both (app + trigger) |
| selection_categories | B | ORG-scoped tenant | YES (B-3) | Trigger only |
| selections | B | ORG-scoped tenant | YES (B-3) | Both (app + trigger) |
| unit_conversion_suggestions | B | ORG-scoped tenant | YES (B-3) | Trigger only |
| vendor_item_pricing | B | ORG-scoped tenant | YES (B-3) | Trigger only |
| vendors | A | ORG-scoped tenant | YES (B-3) | Trigger only |
| **Extension rows (4; not in 32-table soft-delete set):** | | | | |
| org_members | A (post-B-3 DEF-WC-1; canonical direct-call form) | ORG-scoped tenant | N/A (no deleted_at column) | App only |
| activity_log | A | ORG-scoped tenant | N/A (append-only; no deleted_at column) | N/A (IS the audit) |
| platform_admins | Special (cross-org) | Cross-tenant | N/A | App only |
| client_portal_access | B (PERMISSIVE-only — iter-2 corrected per rls-auditor MF-RLS-03 + database M-2; 3 PERMISSIVE policies; uses `revoked_at`/`expires_at` lifecycle NOT `deleted_at`) | ORG-scoped tenant | N/A (no deleted_at; uses revoked_at lifecycle) | App only |

**Legend:**
- **RLS pattern A** = canonical Wave-A: RESTRICTIVE "org isolation" backstop + role-bound PERMISSIVE writes
- **RLS pattern B** = pre-Wave-A: PERMISSIVE-only with `org_id IN (SELECT FROM org_members)` JOIN-style isolation (per `clients`, 16 other Pattern B tables, + `client_portal_access`)
- **Scope axis Q10b** — ORG-scoped tenant (direct-filter RLS) vs USER-scoped child (RLS-by-join)
- **Soft-delete trigger** — `zz_soft_delete_audit_<table>` from B-3 fires on `deleted_at` transition NULL → NOT NULL; uses generic CASE-mapped singular entity_type
- **Audit coverage** — application-layer `logActivity` calls + trigger-layer `audit_soft_delete` complement
```

**Row count (iter-2 corrected per MF-5):** 32 soft-delete tables + 4 extension rows (org_members, activity_log, platform_admins, client_portal_access) = **36 data rows total** (per CONTEXT D-22 + rls-auditor MF-RLS-02 + MF-RLS-03 + database M-2). AC-B3-09 expects ≥36 data rows when grep counts data rows (excludes header rows).

### §2.5 W.1 listener unflag — DEFERRED to B-4 (per nwrp215 decision 4)

**Iter-2 LOCKED:** W.1 listener unflag DEFERRED to B-4 per nwrp215 §9. Rationale (Jake's framing): "B-4 is where listener/activity-log work lives; shipping it in B-3 bundles unrelated work into the deletion+RLS scope (distribute-don't-bundle per Q11). If the 7-day window closing creates a real problem, flag it — else default holds."

**B-3 PLAN does NOT include W.1 in scope.** No Task 5; no env-var addition; no verification gate. The W.1 carry-forward per EXPANDED-SCOPE §11 line 432 lands in B-4 alongside the other 6 carry-forwards (TD-B1abis-01, TD-B1abis-02, MEDIUM-1, etc.).

**Trigger for flag-back (per nwrp215 default-holds clause):** If by B-4 dispatch time the 1-2 week observation window has produced no auth-state regression signal (clean Sentry + smoke baseline maintained), W.1 ships in B-4 as scheduled. If unexpected regression surfaces during the window, flag for Jake at B-4 plan-author time.

### §2.6 Service-role escape helper (DEFERRED — D-24)

**Iter-2 LOCKED:** B-3 ships the trigger function with three-tier resolution (auth.uid() → app.current_user_id → NULL); the `setSessionUserId(supabaseClient, userId)` helper is DEFERRED to first consumer (likely in B-4 or later). Out-of-scope for B-3 to seed the helper without a consumer.

**Service-role-only contract (MF-8 documentation per nwrp215 + security-reviewer SEC-B3-04 + multi-tenant WARNING-1):**

```
CONTRACT: set_config('app.current_user_id', user_id, true) is set ONLY by trusted
server-side code (service-role API routes deliberately propagating actor context).
NEVER by:
  - Client-bound SQL (PostgREST anon/authenticated user paths)
  - Anon-token-resolved contexts (homeowner portal via /api/owner-portal/* from B-2b)
  - JWT-bound user contexts (auth.uid() already populated; Tier 1 fires)
  - Untrusted code paths (third-party libraries, dynamic SQL from user input)
Violation = audit-spoofing surface. The trigger does NOT guard against this because:
  (a) Tier 1 (auth.uid()) fires first for all authenticated paths — Tier 2 only
      reachable from explicitly service-role contexts
  (b) Service-role code is itself a trusted boundary; if compromised, audit-spoofing
      is the least of the concerns
  (c) Wrapping SET-LOCAL in a SECURITY DEFINER helper would add complexity without
      meaningful additional protection
```

**Adoption sweep status:** None of B-3's deliverables actively SET `app.current_user_id`. The first consumer (likely B-4 admin-action route OR Wave 1.1-Lite Inngest job propagating actor context) authors the `setSessionUserId` helper at first need.

**Audit-integrity outcome during the deferral window:** Service-role API routes that don't set the GUC record `actor_source = 'service_role'` + `user_id = NULL`. Audit trail captures the EVENT (soft-delete fired; entity_id; org_id; mechanism = db_trigger; timestamp) but not the ACTOR. Acceptable interim state per CONTEXT D-50 first-consumer pattern. Reviewers MAY surface BLOCKING concern at iter-1 — disposition documented in §5 R-3.

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
- M-05 (iter-2 BLOCKING-4 fix per security-reviewer SEC-B3-08): EXECUTE not granted to PUBLIC — use canonical aclexplode pattern from 00103 + 00105:
  ```sql
  SELECT bool_or(grantor = grantee OR grantee = 0) AS public_grant_present
    FROM pg_proc p
    CROSS JOIN LATERAL aclexplode(p.proacl) AS acl
   WHERE p.proname = 'audit_soft_delete'
     AND p.pronamespace = 'app_private'::regnamespace
     AND acl.privilege_type = 'EXECUTE';
  -- Expected: false (no PUBLIC EXECUTE grant)
  -- NOTE: aclexplode returns empty set if proacl is NULL — that is also a PASS
  -- because Postgres default ACL grants EXECUTE to PUBLIC implicitly. The migration
  -- MUST explicitly REVOKE FROM PUBLIC + verify with this query. If proacl is NULL
  -- post-migration, REVOKE was not applied — HALT.
  ```
- M-06: `npx supabase gen types typescript --linked > src/lib/types/database.types.ts` regenerates
- M-07 (iter-2 added — entity_type singular check): TypeScript union extension verified — `src/lib/activity-log.ts` ActivityEntityType union contains 23 new singular entity types (`approval_chain`, `change_order_line`, `document_extraction_line`, `document_extraction`, `draw_adjustment_line_item`, `draw_adjustment`, `draw_line_item`, `internal_billing`, `invoice_allocation`, `invoice_line_item`, `item`, `job_item_activity`, `job_milestone`, `lien_release`, `line_bom_attachment`, `line_cost_component`, `po_line_item`, `proposal_line_item`, `proposal`, `selection_category`, `selection`, `unit_conversion_suggestion`, `vendor_item_pricing`); `src/lib/audit/action-labels.ts` ENTITY_LABELS Record extended with same 23 entries; `npm typecheck` passes

**Commit body cites:**
- B-3-CONTEXT.md D-01..D-51
- B-3-PLAN.md §1 (pre-design audit findings) + §2 (design)
- CLAUDE.md Dev Rules (SECURITY DEFINER + search_path; soft-delete only)
- nwrp214 §7-13 mandatory pre-design audit
- nwrp208 ACL hardening pattern (REVOKE EXECUTE FROM PUBLIC)

**Files modified (Task 1):**
- `supabase/migrations/00107_b3_soft_delete_audit_trigger_def_wc_1.sql` (NEW)
- `supabase/migrations/00107_b3_soft_delete_audit_trigger_def_wc_1.down.sql` (NEW)
- `src/lib/types/database.types.ts` (REGEN)
- `src/lib/activity-log.ts` (UPDATE — extend ActivityEntityType union with 23 new singular entity types per iter-2 BLOCKING-1 fix)
- `src/lib/audit/action-labels.ts` (UPDATE — extend ENTITY_LABELS Record with same 23 entries; Record exhaustiveness preserved)

**Deviation handling:**
- Trigger function exception handling is FINALIZED in §2.1 — `BEGIN ... EXCEPTION WHEN OTHERS THEN RAISE WARNING ... END` block wraps the activity_log INSERT (iter-2 BLOCKING-3 fix).
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
- Run smoke harness against `harness-fixture-org` (synthetic seed per `scripts/fixtures/smoke-seed.sql`; NOT Drummond — Drummond is for E2E demos only per CLAUDE.md Domain rules)
- Verify ≤2 failures matching TD-WE-03 set (Wave-B prereq #12)
- Verify NO new failures introduced by B-3 trigger (e.g., fixture seed soft-deletes don't break)
- Verify `npm run build` succeeds
- Verify `npm test` passes (existing tests)

**Output:** Recorded in B-3-SUMMARY.md post-execute.

**Iter-2 correction (per ai-logic-tester Finding 10):** Initial PLAN coupled Drummond with fixture-harness-org incorrectly. Drummond is a JOB in Ross Built org (id `a1bb4d28-103d-40d8-98fd-2dc449bf5d1c`, org_id `00000000-0000-0000-0000-000000000001`). Smoke harness uses synthetic-seed fixture-harness-org ONLY per Domain rules.

### Task 6 — Per-table verification DO-block (NEW per nwrp215 decision 5)

**Subject:** `feat(stage-f1-wave-b-slice-2): B-3 Task 6 — per-table trigger verification DO-block`

**Rationale (Jake's framing per nwrp215 §11):** "The audit ESTABLISHED the 32 tables aren't uniform (client_portal_access doesn't fit DEF-WC-3, uses revoked_at). Non-uniformity is fact, not hypothesis. The catastrophic risk on a 32-table trigger is the one table with a quirk you didn't individually test. Per-table verification is cheap insurance against the silent one-of-32 failure."

**Scope:**
- Author a DO-block that loops over all 32 target tables; for each table:
  1. Identify ONE fixture-org test row (org_id = harness-fixture-org; deleted_at IS NULL)
  2. UPDATE that row's deleted_at = NOW() (transaction-safe via SAVEPOINT)
  3. Verify activity_log row was created: count of new rows with entity_id = test_row.id AND action = 'deleted' AND entity_type = singular-mapped-form
  4. Verify activity_log.org_id matches test_row.org_id (cross-tenant integrity)
  5. Verify activity_log.details.actor_source = 'service_role' (DO-block context lacks JWT)
  6. Verify activity_log.details.mechanism = 'db_trigger'
  7. ROLLBACK TO SAVEPOINT (restores test row's deleted_at = NULL)
- For tables that don't have an fixture-harness-org test row available (e.g., entities not present in synthetic seed): record as N/A with explicit reason
- Output: structured JSONB report summarizing per-table pass/fail/N/A
- Halt-and-surface if ANY table fails verification

**Implementation (sketch):**
```sql
DO $$
DECLARE
  v_table text;
  v_test_id uuid;
  v_test_org_id uuid;
  v_audit_row_count int;
  v_results jsonb := '[]'::jsonb;
  v_target_tables text[] := ARRAY[
    -- Same 32-table list as Task 1 DO-block
    'approval_chains','budget_lines',...,'vendors'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_target_tables LOOP
    -- Find a fixture-harness-org test row
    EXECUTE format(
      'SELECT id, org_id FROM public.%I WHERE org_id = ''<fixture_harness_org_id>'' AND deleted_at IS NULL LIMIT 1',
      v_table
    ) INTO v_test_id, v_test_org_id;

    IF v_test_id IS NULL THEN
      v_results := v_results || jsonb_build_object('table', v_table, 'status', 'N/A', 'reason', 'no fixture row');
      CONTINUE;
    END IF;

    SAVEPOINT sp_test;
    BEGIN
      -- Soft-delete the row
      EXECUTE format('UPDATE public.%I SET deleted_at = NOW() WHERE id = $1', v_table) USING v_test_id;

      -- Count new audit rows
      SELECT COUNT(*) INTO v_audit_row_count
        FROM public.activity_log
       WHERE entity_id = v_test_id
         AND action = 'deleted'
         AND created_at > NOW() - INTERVAL '5 seconds';

      v_results := v_results || jsonb_build_object(
        'table', v_table,
        'status', CASE WHEN v_audit_row_count = 1 THEN 'PASS' ELSE 'FAIL' END,
        'audit_rows_created', v_audit_row_count
      );

      ROLLBACK TO SAVEPOINT sp_test;
    EXCEPTION WHEN OTHERS THEN
      v_results := v_results || jsonb_build_object(
        'table', v_table,
        'status', 'ERROR',
        'message', SQLERRM
      );
      ROLLBACK TO SAVEPOINT sp_test;
    END;
  END LOOP;

  -- Output the structured report
  RAISE NOTICE 'Per-table verification: %', jsonb_pretty(v_results);

  -- Fail loud if any table FAILed
  IF v_results @? '$[*] ? (@.status == "FAIL")' THEN
    RAISE EXCEPTION 'Per-table verification FAILED for at least one table — see NOTICE above';
  END IF;
END $$;
```

**Plan-author finalizes exact DO-block at execute time** (table list constant; fixture-harness-org UUID resolved from `scripts/fixtures/smoke-seed.sql`). Surface the structured report verbatim in B-3-SUMMARY.md per-table results section.

**Files modified:** NONE (verification is transaction-scoped; ROLLBACK restores state)

**Commit body cites:**
- nwrp215 decision 5 (ADD Task 6 — per-table verification)
- ai-logic-tester Finding 10 (smoke-harness fixture clarification)
- AC-B3-12 (this task's falsifiability spec)

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

### Task 5 — REMOVED (W.1 listener unflag deferred to B-4 per nwrp215 decision 4)

W.1 listener unflag carry-forward is NOT in B-3 scope. The full carry-forward (env-var addition + verification gate) lands in B-4 alongside the other 6 carry-forwards from EXPANDED-SCOPE §11. See §2.5 for the deferral rationale.

---

## §4. Acceptance criteria (12 falsifiable ACs with LIVE SQL verification queries per nwrp214 §19 + nwrp215 §13)

**Iter-2 added AC-B3-12** (per-table verification — matches Task 6) per nwrp215 decision 5.

**Iter-2 corrections applied to AC-B3-02/03/05/06/08/09/10** (Drummond org/job mislabeling fix; session-context setup for AC-B3-05; aclexplode pattern for AC-B3-08; row count standardization for AC-B3-09; entity_type singular form per BLOCKING-1 fix).

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

**Verification query (LIVE — iter-2 corrected per ai-logic-tester Finding 5 + BLOCKING-1 + BLOCKING-2):**

Canonical fixture references:
- Ross Built org id: `00000000-0000-0000-0000-000000000001` (NOT a "Drummond org" — Drummond is a JOB)
- Drummond Residence job id: `a1bb4d28-103d-40d8-98fd-2dc449bf5d1c` (in Ross Built org)
- Plan-author verifies these UUIDs at execute time against live DB; placeholders below fill from `scripts/fixtures/smoke-seed.sql` OR direct query.

```sql
-- Capture activity_log baseline
SELECT COUNT(*) AS baseline_count FROM public.activity_log;

-- Use Drummond Residence job (canonical representative test row) in Ross Built org
WITH test_job AS (
  SELECT id, org_id FROM public.jobs
   WHERE id = 'a1bb4d28-103d-40d8-98fd-2dc449bf5d1c'  -- Drummond Residence
     AND deleted_at IS NULL
   LIMIT 1
),
soft_delete AS (
  UPDATE public.jobs
     SET deleted_at = NOW()
   WHERE id = (SELECT id FROM test_job)
  RETURNING id, org_id
)
SELECT count_after - <baseline_count> AS new_audit_rows,
       (SELECT entity_type FROM public.activity_log WHERE entity_id = (SELECT id FROM soft_delete) ORDER BY created_at DESC LIMIT 1) AS captured_entity_type,
       (SELECT action FROM public.activity_log WHERE entity_id = (SELECT id FROM soft_delete) ORDER BY created_at DESC LIMIT 1) AS captured_action,
       (SELECT details->>'mechanism' FROM public.activity_log WHERE entity_id = (SELECT id FROM soft_delete) ORDER BY created_at DESC LIMIT 1) AS captured_mechanism,
       (SELECT details->>'actor_source' FROM public.activity_log WHERE entity_id = (SELECT id FROM soft_delete) ORDER BY created_at DESC LIMIT 1) AS captured_actor_source
  FROM (SELECT COUNT(*) AS count_after FROM public.activity_log) c;

-- Rollback the test soft-delete (undo)
UPDATE public.jobs SET deleted_at = NULL WHERE id = 'a1bb4d28-103d-40d8-98fd-2dc449bf5d1c';
```

**Expected (iter-2 BLOCKING-1 + BLOCKING-2 fixes applied):**
- `new_audit_rows = 1` (exactly one activity_log row created by trigger)
- `captured_entity_type = 'job'` (singular form, mapped via CASE in trigger; NOT plural `'jobs'`)
- `captured_action = 'deleted'` (existing ActivityAction union member; NOT `'soft_deleted'`)
- `captured_mechanism = 'db_trigger'` (discriminator from app-layer logActivity)
- `captured_actor_source IN ('auth_uid', 'app_current_user_id', 'service_role')` (depends on execution context)

**Falsifiability:** If trigger missing or misfiring, new_audit_rows = 0; if singular CASE mapping broken, captured_entity_type contains plural `'jobs'`; if action discriminator wrong, captured_action != `'deleted'` OR captured_mechanism != `'db_trigger'`.

### AC-B3-03 — Trigger does NOT fire on non-soft-delete UPDATE

**Verification query (LIVE — iter-2 Drummond fix applied):**
```sql
SELECT COUNT(*) AS baseline FROM public.activity_log;

-- UPDATE without changing deleted_at; use Drummond Residence (canonical test row)
WITH test_job AS (
  SELECT id FROM public.jobs
   WHERE id = 'a1bb4d28-103d-40d8-98fd-2dc449bf5d1c'  -- Drummond Residence
     AND deleted_at IS NULL
   LIMIT 1
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

**Verification query (LIVE — LOAD-BEARING + iter-2 MF-RLS-04 fix: session-context setup explicit):**

```sql
-- STEP 1: Identify two orgs with org_members rows (service-role context for setup)
SELECT DISTINCT m.org_id, COUNT(*) AS member_count
  FROM public.org_members m
 GROUP BY m.org_id
 ORDER BY m.org_id
 LIMIT 2;
-- Capture: <org_A_id>, <org_B_id>

-- STEP 2: Identify an org_B member's user_id (for impersonation)
SELECT user_id, org_id FROM public.org_members
 WHERE org_id = '<org_B_id>'
   AND is_active = true
   AND role IN ('owner', 'admin', 'pm', 'accounting')
 LIMIT 1;
-- Capture: <org_B_member_user_id>

-- STEP 3: ESTABLISH AUTHENTICATED SESSION CONTEXT FOR org_B MEMBER
-- This is the LOAD-BEARING step per MF-RLS-04 — service-role execution bypasses RLS
-- and gives a false PASS. The probe MUST run under authenticated session context.
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '<org_B_member_user_id>';
SET LOCAL "request.jwt.claims" = '{"sub":"<org_B_member_user_id>","role":"authenticated","aud":"authenticated"}';

-- Verify session context applied
SELECT auth.uid() AS session_user_id;  -- Expected: <org_B_member_user_id>

-- STEP 4: Attempt the cross-org read (org_B user querying org_A's org_members)
SELECT COUNT(*) AS leak_rows
  FROM public.org_members
 WHERE org_id = '<org_A_id>';
-- Expected: 0 (RESTRICTIVE org_members_org_isolation policy blocks cross-org)

-- STEP 5: Verify same-org access still works (org_B reading org_B own membership)
SELECT COUNT(*) AS own_org_rows
  FROM public.org_members
 WHERE org_id = '<org_B_id>';
-- Expected: > 0 (PERMISSIVE 'members read org_members' permits same-org)

-- STEP 6: Verify platform_admin retains cross-org access (control case)
-- Reset session, impersonate platform_admin
RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '<platform_admin_user_id>';  -- e.g., Jake's user_id
SET LOCAL "request.jwt.claims" = '{"sub":"<platform_admin_user_id>","role":"authenticated","aud":"authenticated"}';

SELECT COUNT(*) AS platform_admin_cross_org_rows
  FROM public.org_members
 WHERE org_id = '<org_A_id>';
-- Expected: > 0 (RESTRICTIVE OR-clause `is_platform_admin()` permits)

RESET ROLE;
```

**Expected (4 falsifiable conditions):**
- STEP 4: `leak_rows = 0` — RESTRICTIVE policy blocks cross-org reads regardless of PERMISSIVE policy variance
- STEP 5: `own_org_rows > 0` — same-org access preserved
- STEP 6: `platform_admin_cross_org_rows > 0` — platform_admin retains cross-org access

**Falsifiability:**
- If RESTRICTIVE policy missing or misauthored: STEP 4 returns rows = BLOCKING
- If RESTRICTIVE inadvertently blocks same-org: STEP 5 returns 0 = BLOCKING (functional regression)
- If RESTRICTIVE doesn't preserve platform_admin escape: STEP 6 returns 0 = BLOCKING (operator access regression)

**Notes:**
- ai-logic-tester executes this against LIVE DB per Rule 3 — NOT inferred from migration text per nwrp215 §13.
- Service-role execution of STEP 4 alone would BYPASS RLS and return rows = FALSE PASS. The `SET LOCAL ROLE authenticated` + JWT context setup in STEP 3 is the LOAD-BEARING step.
- mcp__supabase__execute_sql defaults to service-role; reviewer/executor MUST establish the session context above OR run via a Supabase anon-key REST endpoint with org_B member JWT.

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

**Verification query (LIVE — iter-2 BLOCKING-4 fix per security-reviewer SEC-B3-08: aclexplode pattern from 00103 + 00105):**

```sql
-- PART 1: SECURITY DEFINER + search_path posture
SELECT prosecdef AS security_definer,
       array_to_string(proconfig, ',') AS config_settings
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
 WHERE n.nspname = 'app_private'
   AND p.proname = 'audit_soft_delete';

-- PART 2: ACL hardening verification using canonical aclexplode pattern
-- (Replaces fragile proacl-text-contains-match per security-reviewer SEC-B3-08)
SELECT
  -- Does PUBLIC have EXECUTE grant? (grantee=0 means PUBLIC in Postgres ACL)
  COALESCE(bool_or(grantee = 0), false) AS public_grant_present,
  -- Does anon have EXECUTE grant?
  COALESCE(bool_or(grantee = (SELECT oid FROM pg_roles WHERE rolname = 'anon')), false) AS anon_grant_present,
  -- Does authenticated have EXECUTE grant?
  COALESCE(bool_or(grantee = (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')), false) AS authenticated_grant_present,
  -- Capture all grantees for debug
  array_agg(DISTINCT grantee) AS all_grantees
FROM pg_proc p
CROSS JOIN LATERAL aclexplode(p.proacl) AS acl(grantor, grantee, privilege_type, is_grantable)
WHERE p.proname = 'audit_soft_delete'
  AND p.pronamespace = 'app_private'::regnamespace
  AND acl.privilege_type = 'EXECUTE';
```

**Expected:**
- PART 1:
  - `security_definer = true`
  - `config_settings` contains `search_path=public, pg_temp`
- PART 2 (aclexplode):
  - `public_grant_present = false` (REVOKE EXECUTE FROM PUBLIC applied)
  - `anon_grant_present = false`
  - `authenticated_grant_present = false`
  - `all_grantees` should contain only the function owner (postgres) or be empty

**NOTE on NULL proacl case:** If `pg_proc.proacl IS NULL`, `aclexplode` returns an empty set. Postgres treats NULL proacl as "default ACL" which INCLUDES PUBLIC EXECUTE for functions. The migration MUST explicitly REVOKE EXECUTE FROM PUBLIC + populate proacl. **If aclexplode returns 0 rows post-migration, REVOKE was not applied — HALT.** Plan-author confirms `pg_proc.proacl IS NOT NULL` as a precondition for the aclexplode check above.

**Falsifiability:**
- security_definer != true → wrong definer posture
- search_path absent from config_settings → CLAUDE.md mandate violated
- public_grant_present = true → REVOKE EXECUTE FROM PUBLIC missed → BLOCKING (matches B-2a ACL hardening per nwrp208)
- anon_grant_present OR authenticated_grant_present = true → unexpected non-trigger-mechanism grant — BLOCKING

### AC-B3-09 — DEF-WC-3 ARCHITECTURE.md RLS posture summary table exists (iter-2 MF-5 row count fix)

**Verification (file-system + content):**
```bash
grep -n "RLS posture summary table by entity" .planning/architecture/ARCHITECTURE.md
```

**Expected:** Section header exists.

**Verification (row count — iter-2 standardized to 36 data rows):**
```bash
# Count DATA rows in the markdown table after the section header
# Excludes the markdown header rows (| Entity | RLS pattern | ... | and the separator | --- | --- | ...)
awk '/RLS posture summary table by entity/,/^## /' .planning/architecture/ARCHITECTURE.md \
  | grep '^|' \
  | grep -v '^| Entity' \
  | grep -v '^| ---' \
  | wc -l
```

**Expected:** **36 data rows** (32 soft-delete tables + 4 extension entities: org_members, activity_log, platform_admins, client_portal_access). Per iter-2 MF-5 standardization across `<criteria>` block + §2.4 + Task 2 + this AC.

**Falsifiability:** If section missing, row count = 0 OR < 36; if extension rows missing, count = 32; if extras spuriously included, count > 36.

**Pattern A/B accuracy check (iter-2 MF-RLS-02 + MF-RLS-03 fix):** Reviewer MUST verify the DEF-WC-3 table assigns:
- `clients` = Pattern B (NOT A) per live `pg_policies` (3 PERMISSIVE-only policies on clients; no RESTRICTIVE backstop)
- `client_portal_access` = Pattern B + Soft-delete trigger N/A (NOT Pattern A + YES per the original draft); uses `revoked_at` lifecycle NOT `deleted_at`

### AC-B3-10 — Trigger does NOT block soft-delete on missing user_id (graceful degradation)

**Verification query (LIVE — iter-2 Drummond fix + BLOCKING-3 exception handler verification):**
```sql
-- From a service-role context (no JWT) and no app.current_user_id set
-- Use Drummond Residence (canonical test row) in Ross Built org
UPDATE public.jobs SET deleted_at = NOW()
 WHERE id = 'a1bb4d28-103d-40d8-98fd-2dc449bf5d1c'  -- Drummond Residence
   AND deleted_at IS NULL;
-- Should succeed (NOT raise exception)

SELECT deleted_at FROM public.jobs
 WHERE id = 'a1bb4d28-103d-40d8-98fd-2dc449bf5d1c';
-- Expected: deleted_at IS NOT NULL (the UPDATE succeeded)

-- And activity_log captured the event
SELECT COUNT(*) AS audit_count,
       (SELECT user_id FROM public.activity_log WHERE entity_id = 'a1bb4d28-103d-40d8-98fd-2dc449bf5d1c' ORDER BY created_at DESC LIMIT 1) AS captured_user_id,
       (SELECT details->>'actor_source' FROM public.activity_log WHERE entity_id = 'a1bb4d28-103d-40d8-98fd-2dc449bf5d1c' ORDER BY created_at DESC LIMIT 1) AS captured_actor_source,
       (SELECT action FROM public.activity_log WHERE entity_id = 'a1bb4d28-103d-40d8-98fd-2dc449bf5d1c' ORDER BY created_at DESC LIMIT 1) AS captured_action
  FROM public.activity_log
 WHERE entity_id = 'a1bb4d28-103d-40d8-98fd-2dc449bf5d1c'
   AND action = 'deleted';

-- Rollback the test soft-delete
UPDATE public.jobs SET deleted_at = NULL WHERE id = 'a1bb4d28-103d-40d8-98fd-2dc449bf5d1c';
```

**Expected:**
- UPDATE succeeds (does NOT raise exception)
- `audit_count = 1`
- `captured_user_id IS NULL` (service-role context lacks auth.uid + app.current_user_id)
- `captured_actor_source = 'service_role'`
- `captured_action = 'deleted'` (iter-2 BLOCKING-2 fix)

**Falsifiability:** If trigger raises on missing user_id (BLOCKING-3 fix missing or broken), UPDATE fails. If exception handler doesn't catch + RAISE WARNING, UPDATE blocks indefinitely. If activity_log not written despite the exception handler RETURN NEW path, audit_count = 0.

**Additional sub-test for BLOCKING-3 (exception handler robustness):**

Force an artificial INSERT failure to verify the trigger gracefully degrades rather than blocking the soft-delete:

```sql
-- Temporarily add a CHECK constraint that would fail any INSERT into activity_log
-- (DO NOT actually apply this in production — this is a test-only sub-test for
-- iter-2 BLOCKING-3 verification; plan-author runs against a test database)
ALTER TABLE public.activity_log ADD CONSTRAINT temp_force_fail_check CHECK (entity_type != 'job');

-- Attempt soft-delete; trigger INSERT will fail the CHECK constraint
UPDATE public.jobs SET deleted_at = NOW() WHERE id = 'a1bb4d28-103d-40d8-98fd-2dc449bf5d1c';
-- Expected: UPDATE SUCCEEDS (the trigger's EXCEPTION block catches the CHECK violation
-- and RAISE WARNING; the soft-delete UPDATE proceeds)

SELECT deleted_at FROM public.jobs WHERE id = 'a1bb4d28-103d-40d8-98fd-2dc449bf5d1c';
-- Expected: deleted_at IS NOT NULL (UPDATE succeeded despite trigger INSERT failure)

-- Verify no audit row was created (since the INSERT failed)
SELECT COUNT(*) FROM public.activity_log
 WHERE entity_id = 'a1bb4d28-103d-40d8-98fd-2dc449bf5d1c'
   AND created_at > NOW() - INTERVAL '5 seconds';
-- Expected: 0 (the INSERT failed; trigger's EXCEPTION block prevented blocking)

-- Cleanup
ALTER TABLE public.activity_log DROP CONSTRAINT temp_force_fail_check;
UPDATE public.jobs SET deleted_at = NULL WHERE id = 'a1bb4d28-103d-40d8-98fd-2dc449bf5d1c';
```

**This sub-test is OPTIONAL** (CHECK constraint shadowing is destructive even when rolled back; plan-author may defer to test-database verification rather than production). The primary AC-B3-10 verification above demonstrates the graceful degradation contract via the standard happy path.

### AC-B3-11 — Smoke harness post-B-3 ≤2 failures matching TD-WE-03 set

**Verification (smoke harness):**
- Run smoke against `harness-fixture-org` (synthetic-seed; NOT Drummond per ai-logic-tester Finding 10)
- Expected: ≤2 failures matching TD-WE-03 set (Wave-B prereq #12 baseline maintained)
- NO new failures from B-3 trigger introduction (especially around fixture seed paths)

**Falsifiability:** If B-3 trigger breaks fixture seed (e.g., service-role soft-deletes blocked or audit_log writes failing), smoke fails.

### AC-B3-12 — Per-table verification DO-block (NEW iter-2 per nwrp215 decision 5)

**Verification (LIVE — see Task 6 for full DO-block):**

The Task 6 DO-block loops over all 32 target tables; for each table:
1. Identifies one fixture-harness-org test row (or records N/A if no fixture row)
2. Soft-deletes the row in a SAVEPOINT
3. Verifies activity_log row was created with correct entity_type (singular CASE mapping), action='deleted', org_id matching test row, details.mechanism='db_trigger', details.actor_source='service_role'
4. ROLLBACK TO SAVEPOINT (restores deleted_at = NULL)
5. Records structured PASS/FAIL/N/A per table

**Expected (structured JSONB output from DO-block):**
- ALL tables with fixture rows: status = 'PASS'
- Tables without fixture rows: status = 'N/A' with reason
- ZERO tables with status = 'FAIL' or 'ERROR'

**Falsifiability:** Per nwrp215 §11 — "the catastrophic risk on a 32-table trigger is the one table with a quirk you didn't individually test." If any table's trigger silently fails to fire (e.g., due to renamed column, unusual permissions, or fixture-row missing in seed), this AC catches it. PLAN execute halts on any 'FAIL' status.

**Notes:**
- AC-B3-12 + Task 6 directly addresses ai-logic-tester Finding 6's concern about understated trigger landscape AND the more general "non-uniformity is fact, not hypothesis" insight from the pre-design audit (e.g., client_portal_access has revoked_at instead of deleted_at).
- ai-logic-tester executes the DO-block at iter-2 verification time; output captured verbatim in PLAN-REVIEW-B3-ITER2 reports.

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

### R-3 — `current_setting('app.current_user_id', true)` middleware threading misses paths + service-role-only contract (iter-2 MF-8 documented)

**Risk:** Service-role API routes that don't set `app.current_user_id` will record `actor_source = 'service_role'` instead of the impersonated user. Audit trail captures the EVENT but not the ACTOR.

**Additional risk (iter-2 surfaced per security-reviewer SEC-B3-04 + multi-tenant WARNING-1):** If `app.current_user_id` is settable by client-bound SQL (e.g., a homeowner-token-resolved context, or any code path that allows arbitrary SQL execution post-JWT), trigger writes a forged actor_id → audit-spoofing surface.

**Mitigation:**
- Trigger gracefully degrades to NULL user_id with marker (per CONTEXT D-25 + AC-B3-10).
- Plan-author surveys all Supabase client creation sites (preliminary at iter-1) and documents which service-role paths SHOULD set the GUC.
- Adoption sweep across existing routes deferred to B-4 / Wave 1.1-Lite per CONTEXT D-50 (first-consumer pattern).
- **SERVICE-ROLE-ONLY CONTRACT documented in §2.6** (per nwrp215 + iter-2 MF-8). `set_config('app.current_user_id', ...)` is set ONLY by trusted server-side code. Tier 1 (`auth.uid()`) fires first for all authenticated paths; Tier 2 is only reachable from explicitly service-role contexts where the threat boundary is already crossed.

**Disposition:** ACCEPTED — B-3 ships trigger + documents pattern + documents the service-role-only contract; full sweep is future work.

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

**Risk:** Per pre-design audit §1.4 (iter-2 corrected count), 15 existing AFTER UPDATE triggers across 8 tables (invoices, change_orders, invoice_line_items, change_order_lines, po_line_items, proposal_line_items, document_extraction_lines, purchase_orders). If B-3 trigger fires BEFORE them (due to alphabetic name collision), it could see intermediate row state.

**Mitigation:**
- B-3 trigger names use `zz_soft_delete_audit_<table>` prefix → fires LAST alphabetically.
- Live verification (pre-design audit): no existing triggers above 'z' alphabetically; `zz_` prefix correctly fires last.
- WHEN clause limits firing to soft-delete transition only (not every UPDATE) — minimizing interaction window.
- AC-B3-02 verifies trigger fires correctly with expected row state.

**Disposition:** Explicit AC + alphabetic-naming-by-design. NO BLOCKING risk if mitigations hold.

### R-8 — Undelete transition not audited (iter-2 W-4 deferral)

**Risk:** B-3 trigger fires ONLY on forward soft-delete (NULL → NOT NULL on `deleted_at`). Undelete events (NOT NULL → NULL) are NOT audited.

**Mitigation:**
- Hard requirement: AC-B3-02 + AC-B3-03 + AC-B3-10 verification queries themselves perform undelete-as-rollback step (UPDATE deleted_at = NULL after the test soft-delete). These rollbacks are TEST-FIXTURE cleanup, not production undelete events.
- Production undelete is rare (admin operation only; almost always wraps via admin tooling that itself logs).
- No current product requirement for undelete audit.

**Disposition:** DEFERRED to Wave 1.1-Lite if/when product requires audit of undelete events. NOT a B-3 in-scope fix.

### R-9 — Trigger BYPASSRLS dependence on activity_log NOT having FORCE RLS (iter-2 N-4 documentation)

**Risk:** Live `activity_log.relforcerowsecurity = false`. SECURITY DEFINER trigger runs as table owner (postgres BYPASSRLS=true) → INSERT into activity_log succeeds because table owner skips RLS regardless. If future hardening adds `ALTER TABLE activity_log FORCE ROW LEVEL SECURITY`, trigger would need an explicit INSERT policy on activity_log (matching its `org_id` + entity context).

**Mitigation:**
- Migration 00107 + PLAN body include explicit comment noting this dependency.
- If FORCE RLS is later added to activity_log (Wave 1.1-Lite or compliance-driven), B-3 trigger's INSERT path requires policy addition; surface to plan-author at that time.

**Disposition:** DOCUMENTED dependency. NO BLOCKING risk in current B-3 scope.

---

## §6. Files modified (frontmatter mirror — iter-2 updated)

- `supabase/migrations/00107_b3_soft_delete_audit_trigger_def_wc_1.sql` (NEW)
- `supabase/migrations/00107_b3_soft_delete_audit_trigger_def_wc_1.down.sql` (NEW)
- `src/lib/types/database.types.ts` (REGEN per CLAUDE.md schema-regen rule)
- `src/lib/activity-log.ts` (UPDATE — extend ActivityEntityType union with 23 new singular entity types per iter-2 BLOCKING-1 fix; ActivityAction union UNCHANGED per nwrp215 decision 3b)
- `src/lib/audit/action-labels.ts` (UPDATE — extend ENTITY_LABELS Record with same 23 entries; ACTION_LABELS Record UNCHANGED)
- `.planning/architecture/ARCHITECTURE.md` (UPDATE — DEF-WC-3 section addition; 36 data rows per iter-2 MF-5)
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-3-SUMMARY.md` (NEW)
- `.planning/MASTER-PLAN.md` (UPDATE — Slice-2 progress 2→3)

**DEFERRED (NOT in B-3 scope per nwrp215 decision 4):**
- Vercel Production + Preview env: `NEXT_PUBLIC_AUTH_STATE_LISTENER=true` (W.1 carry-forward → B-4)
- `src/lib/supabase/service.ts` `setSessionUserId(client, userId)` helper (→ first consumer, likely B-4)

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

### TypeScript union rollback (iter-2 added)

If migration 00107 is rolled back, the `src/lib/activity-log.ts` ActivityEntityType union extension (23 new singular entity types) does NOT need to be reverted. Those types remain valid TypeScript declarations even if no rows in `activity_log` currently use them. Future B-4 work depends on the union extension being in place (B-4 extends write-site coverage; trigger NOT firing during rollback doesn't break the type system).

If the executor wants a fully symmetric rollback: revert `src/lib/activity-log.ts` + `src/lib/audit/action-labels.ts` in a separate commit (cosmetic; not load-bearing). Plan-author's recommendation: LEAVE the union extension in place; it's forward-compatible with re-applying 00107.

### activity_log FORCE RLS dependency note (iter-2 N-4 documentation)

**Migration 00107 includes an explicit comment** noting that the SECURITY DEFINER trigger function's INSERT into activity_log relies on `activity_log.relforcerowsecurity = false`. The current production posture has FORCE RLS disabled on activity_log; the trigger runs as table owner (postgres BYPASSRLS=true) and inserts succeed regardless of RLS. If future hardening adds `ALTER TABLE public.activity_log FORCE ROW LEVEL SECURITY`, the B-3 trigger requires an explicit INSERT policy on activity_log (matching `org_id` from trigger context). Surface in PLAN review at that future migration's time.

---

## §8. Plan-review iter-2 expectations (iter-1 SHIPPED + iter-2 IS NOW RE-DISPATCHED)

### Reviewer scope (7 reviewers, full HIGH-threat — NO design-pushback)

Per CONTEXT D-33 + nwrp214 §15 + nwrp215 §13:

1. **spec-checker** — verify all 12 ACs trace to delivered design + live verification queries present + falsifiability rigorous; verify iter-2 fixes propagated (entity_type singular, action='deleted', row count consistency, Drummond org/job correction, session context for AC-B3-05, aclexplode for AC-B3-08, Task 6 + AC-B3-12 added)
2. **security-reviewer (LOAD-BEARING)** — verify iter-2 SEC-B3-03 (exception handler) closed; verify SEC-B3-08 (aclexplode) applied to AC-B3-08; verify MF-8 (service-role-only contract) documented in §2.6 + R-3
3. **multi-tenant-architect (LOAD-BEARING)** — verify iter-2 cross-tenant integrity remains correct post entity_type CASE mapping; verify HIGH-1 Pattern B deferral disposition accepted
4. **rls-auditor (LOAD-BEARING)** — verify iter-2 MF-RLS-01 (canonical direct-call form applied to DEF-WC-1); MF-RLS-02 (clients → Pattern B); MF-RLS-03 (client_portal_access → Pattern B + N/A trigger); MF-RLS-04 (AC-B3-05 session context setup); DEF-WC-3 table accuracy
5. **database-reviewer** — verify iter-2 M-1 (exception handler), M-2 (client_portal_access DEF-WC-3 row), W-3 (delete_strict rationale comment); migration shape correctness; Task 6 DO-block correctness
6. **ai-logic-tester** — verify iter-2 BLOCKING-1 (singular CASE mapping), BLOCKING-2 (action='deleted'), Finding 5 + Finding 10 (Drummond org/job fixes), Finding 6 (trigger count correction); execute Task 6 DO-block + AC-B3-05 cross-org probe LIVE with corrected session context
7. **custodian** — verify iter-2 planning tree + commit chain alignment; PLAN-REVIEW-B3-ITER1-SYNTHESIS.md preserved as canonical record; Slice-2 ledger surface updated post-bump

**NO design-pushback** per nwrp214 §15 — no UI surface.

### Cross-reviewer alignment expectations

Surface findings categorized:
- BLOCKING — must fix in iter-3 OR halt for Jake
- MUST-FIX — fix in iter-3 (within $75 gate; may trigger nwrp215 §17 halt)
- NICE-TO-HAVE — defer to Wave 1.1-Lite
- DEFERRED — acknowledge but not in scope

**Iter-2 expected outcome:** all 4 BLOCKING + 8 MUST-FIX from iter-1 confirmed CLOSED; no NEW BLOCKING (per nwrp215 §17 — new BLOCKING at iter-2 is a deeper-than-mechanical signal and HALTS for Jake).

### Halt conditions (per nwrp215 §17)

- **New BLOCKING at iter-2** (not re-confirmation of fixes) → HALT + surface (deeper-than-mechanical signal)
- **Spend approaches $75** → HALT
- **Rule 9 cross-reviewer factual disagreement** → HALT for Jake

### halt_after: true contract (per nwrp215 §15-16)

After plan-review iter-2:
1. Author PLAN-REVIEW-B3-ITER2-SYNTHESIS.md
2. Surface revised PLAN + pre-design audit + iter-2 findings + Slice-2 ledger to Jake for GATE B-3 review
3. **HALT — do NOT auto-/nx**
4. Jake reviews against LIVE DB; signs GATE B-3 SIGNED OR routes back for further revision OR halts for fresh-session re-scope

---

## §9. Plan integrity attestation

### Falsifiability checklist (per plan-checker — iter-2 updated)

- [x] All 12 ACs have LIVE SQL verification queries (NOT AC-text-only); iter-2 added AC-B3-12 per nwrp215 decision 5
- [x] Pre-design audit findings preserved verbatim in §1
- [x] Migration boundary explicit (single migration 00107 atomic)
- [x] Rollback plan symmetric to forward migration
- [x] Per-plan halt gate $75 (iter-2 bump per nwrp215 §3) acknowledged
- [x] Cross-reviewer alignment expectations specified (NEW BLOCKING at iter-2 = HALT signal per nwrp215 §17)
- [x] halt_after: true contract documented (iter-2: HALT for Jake GATE B-3 review)
- [x] iter-2 changes traceable to specific iter-1 findings (BLOCKING-1..4 + MF-1..8 + W-1..4)

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

### Slice-2 ledger surface (per nwrp214 §27 + nwrp215 §19)

| Metric | Value |
|--------|-------|
| Slice-2 ceiling | $300 (raised from $200 per nwrp209) |
| Consumed pre-iter-1 | ~$139-177 (B-2 iter-1 + B-2a + B-2b) |
| B-3 iter-1 spend | ~$35-52 |
| Consumed pre-iter-2 | ~$174-229 |
| Remaining pre-iter-2 | ~$71-126 |
| B-3 per-plan halt gate (iter-2 bumped per nwrp215 §3) | $75 (was $50; explicit Jake authorization; scoped EXCLUSIVELY to iter-2 revision + re-review) |
| B-3 iter-2 estimate | $15-23 (PLAN revision + 7-reviewer re-dispatch) |
| B-3 cumulative through iter-2 | $50-75 |
| Plans remaining post-B-3 | 4 (B-4 + B-5 + B-6 + B-7) |
| Avg remaining budget per plan | $14-24 (after B-3 ships through execute + GATE at $90-130 per nwrp215 §19 LEDGER FLAG) |

**Halt-and-surface posture:**
- Per nwrp215 §17: iter-2 spend approaches $75 → HALT
- Per nwrp215 §17: NEW BLOCKING at iter-2 (not re-confirmation of fixes) → HALT + surface (deeper-than-mechanical signal)
- Per nwrp215 §17: Rule 9 cross-reviewer factual disagreement → HALT for Jake

**Iter-2 cost trajectory check:** PLAN revision (~$5-8 — completed in this session); 7-reviewer re-dispatch (~$10-15); SYNTHESIS (~$2-3); HALT for Jake. Total iter-2 incremental: ~$17-26. With iter-1 at ~$35-52, B-3 cumulative through iter-2 ~$52-78. **AT THE BOUNDARY of $75 cap; one more reviewer cycle (iter-3) would BREACH the cap.**

**LEDGER FLAG per nwrp215 §19** (surface to Jake at GATE B-3):
- B-3 total (through execute + GATE) likely $90-130 at high end
- Slice-2 projected close: ~$220-275 of $300 ceiling
- B-4 through B-7 squeezed; at high end may not all fit in $300
- Face this with real numbers at B-3's GATE

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
- nwrp215 (B-3 iter-2 authorized: 5 decisions; ceiling bump $50→$75; LEDGER FLAG for B-3 GATE)

### iter-2 audit trail
- PLAN-REVIEW-B3-ITER1-SYNTHESIS.md (canonical iter-1 record with 4 BLOCKING + 8 MUST-FIX + 4 WARNING findings)
- PLAN-REVIEW-B3-ITER1-SECURITY.md (disk-persisted)
- PLAN-REVIEW-B3-ITER1-DATABASE.md (disk-persisted)
- PLAN-REVIEW-B3-ITER1-CUSTODIAN.md (disk-persisted)
- 4 inline-returned reviewer outputs (spec-checker, multi-tenant, rls-auditor, ai-logic-tester) captured verbatim in PLAN-REVIEW-B3-ITER1-SYNTHESIS.md §3

---

**End of B-3-PLAN.md (iter-2 REVISED — pending Jake GATE B-3 review per nwrp215 §15-16).**
