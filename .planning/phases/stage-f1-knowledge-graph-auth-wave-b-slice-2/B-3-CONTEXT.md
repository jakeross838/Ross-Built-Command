# Phase stage-f1-knowledge-graph-auth-wave-b-slice-2 — B-3 CONTEXT

**Gathered:** 2026-05-22 (lean direct authoring per Slice-2 efficiency pattern; B-2b precedent — substance well-documented in EXPANDED-SCOPE §7 plan #2 + nwrp214 dispatch parameters)
**Status:** Ready for planning
**Plan ID:** B-3 (Soft-delete DB-trigger safety net + user-identity-threading convention + DEF-WC-1 + DEF-WC-3 + W.1 listener unflag (conditional) — HIGH threat)
**Depends on:** B-2a (SHIPPED 2026-05-21 per nwrp209), B-2b (SHIPPED 2026-05-22 per nwrp213)

<domain>
## Phase Boundary

**B-3 delivers the trigger-layer soft-delete audit safety net + DEF-WC-1 org_members RESTRICTIVE backstop + DEF-WC-3 RLS posture summary table + (conditional) W.1 listener unflag.** It guarantees audit-log writes happen on EVERY soft-delete UPDATE regardless of the originating code path, closes the org_members cross-tenant backstop gap, and codifies the canonical RLS-posture audit table in ARCHITECTURE.md.

Specifically:
1. **1 SECURITY DEFINER trigger function** that writes `activity_log` on every soft-delete UPDATE (NULL → NOT NULL on `deleted_at`)
2. **Per-table AFTER UPDATE triggers** on 32 tenant tables (NOT ~25 as EXPANDED-SCOPE estimated; pre-design audit finding — see D-22)
3. **User-identity-threading convention**: trigger reads `auth.uid()` (PostgREST-set per-transaction JWT GUC) → falls back to `current_setting('app.current_user_id', true)` for service-role escape → NULL marker
4. **DEF-WC-1**: `org_members` gets a RESTRICTIVE "org isolation" backstop policy mirroring the canonical Wave-A pattern (jobs / invoices / vendors)
5. **DEF-WC-3 partial**: ARCHITECTURE.md "RLS posture summary table by entity" — full table covering 32 tables × 5 columns each
6. **Carry-forward (conditional)**: W.1 listener unflag (env-var `NEXT_PUBLIC_AUTH_STATE_LISTENER=true`) — lands in B-3 IF the 1-2 week observation window post-Slice-1 B-1b ship closes before B-3 dispatches (Sentry green + smoke clean)

**Out of scope (deferred):**
- B-4 `activity_log.entity_type` TS union extension + write-site sweep — B-4 scope
- Wave-A iter-1 search_path sweep — separate authored plan per nwrp165 deliverable #5
- F2 employees + role_definitions registry — F2
- Inngest async event surface on soft-delete (notify owner / downstream hooks) — F3
- ENTITY-INVENTORY.md updates for future entities (Wave 2+) — out-of-scope until those entities land
- AUDIT-LOG-STRATEGY.md updates to canonicalize the trigger-write pattern alongside the existing application-layer `logActivity` helper — out-of-scope (B-3 trigger writes to the SAME activity_log table via the SAME entity_type + action contract; AUDIT-LOG-STRATEGY.md remains canonical; documentation update optional follow-up)

</domain>

<decisions>
## Implementation Decisions

### Pre-design audit (per nwrp214 §7-13 — MANDATORY)

- **D-01:** Pre-design audit run 2026-05-22 against live Supabase production schema BEFORE designing trigger. Findings load-bearing on D-02..D-09. Audit output preserved verbatim in PLAN body §1 (pre-design audit section).
- **D-02:** **Target table count = 32, NOT ~25.** EXPANDED-SCOPE §1 + §7 plan #2 estimated ~25 tenant tables; live audit shows 32 tables with `(org_id NOT NULL, deleted_at TIMESTAMPTZ NULL)` shape + RLS enabled. The 7-table delta is material for trigger application scope.
- **D-03:** **All 32 target tables have uniform `deleted_at timestamp with time zone NULL DEFAULT NULL`** shape — trigger function uses generic `OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL` predicate; no per-table customization needed.
- **D-04:** **All 32 target tables have RLS enabled** — no precondition gap. Trigger function executes with SECURITY DEFINER so it can write `activity_log` regardless of caller's RLS posture.
- **D-05:** **TWO distinct RLS patterns across the 32 tables (pre-design audit finding):**
  - **Pattern A (~15 tables, canonical Wave-A):** RESTRICTIVE "org isolation" + `<table>_delete_strict` RESTRICTIVE DELETE + PERMISSIVE role-bound writes. Tables: budget_lines, change_order_lines, change_orders, cost_codes, draw_line_items, draws, internal_billings, invoice_allocations, invoice_line_items, invoices, jobs, lien_releases, po_line_items, purchase_orders, vendors
  - **Pattern B (~17 tables, pre-Wave-A):** PERMISSIVE-only with `org_id IN (SELECT FROM org_members)` joins. Tables: approval_chains, clients (mixed with `(SELECT app_private.user_org_id())`), document_extraction_lines, document_extractions, draw_adjustment_line_items, draw_adjustments, items, job_item_activity, job_milestones, line_bom_attachments, line_cost_components, proposal_line_items, proposals, selection_categories, selections, unit_conversion_suggestions, vendor_item_pricing
  - **Implication for DEF-WC-3:** RLS posture summary table MUST show this taxonomy explicitly. Pattern A vs Pattern B is the canonical distinction Wave-A migration sweep would have addressed for Pattern B tables; for now DEF-WC-3 documents the as-is state with a "RLS pattern" column.
  - **Implication for B-3 trigger:** trigger fires regardless of pattern (SECURITY DEFINER bypasses both); pattern variance does NOT affect trigger correctness, only the DEF-WC-3 summary clarity.
- **D-06:** **28 of 32 tables have existing `BEFORE UPDATE` triggers** (`update_updated_at` or `touch_updated_at` for `updated_at` maintenance). B-3 trigger MUST be `AFTER UPDATE` to avoid interfering with the BEFORE triggers (they fire first, set NEW.updated_at = now(), then B-3's AFTER trigger sees the final NEW row including soft-delete transition).
- **D-07:** **3 invoices + 1 change_orders + 1 invoice_line_items existing AFTER UPDATE triggers** detected. B-3's per-table AFTER UPDATE trigger MUST coexist; PostgreSQL fires AFTER triggers alphabetically by trigger name. B-3 trigger names use prefix `zz_soft_delete_audit_<table>` to fire LAST (alphabetic 'z' bottom-sort) — ensures other status-sync / cache triggers see the final row state first, then audit captures.
- **D-08:** **~16 FK CASCADE relationships exist** (e.g., `change_orders → change_order_lines CASCADE`, `invoices → invoice_line_items CASCADE`). B-3's soft-delete trigger fires ONLY on UPDATE deleted_at; it does NOT fire on hard-DELETE CASCADE events. This is a CONSISTENCY GAP: hard-delete via CASCADE silently misses the audit trail. Plan-author surfaces this gap in PLAN §1 + §5 (Risks); mitigation: hard-DELETE is forbidden per CLAUDE.md ("Never delete records — soft delete only"); CASCADE only fires on admin-driven hard-deletes which are themselves out-of-flow events. Accept as documented gap; not a B-3 in-scope fix. (Reviewers may disagree — surface for Jake at iter-1 if multi-tenant-architect / rls-auditor pushes back.)
- **D-09:** **`org_members` has NO RESTRICTIVE backstop** (pre-design audit confirmation of DEF-WC-1 gap). 3 PERMISSIVE policies only: `admin manage org_members` (ALL, role-check), `members read org_members` (SELECT, org-check), `org_members_platform_admin_read` (SELECT, platform-admin-check). DEF-WC-1 adds RESTRICTIVE backstop mirroring the jobs/invoices/vendors canonical pattern.

### Trigger function design

- **D-10:** **Function name:** `app_private.audit_soft_delete()` (returns TRIGGER; LANGUAGE plpgsql; SECURITY DEFINER; SET search_path = public, pg_temp per CLAUDE.md Dev Rules). Reserved-namespace convention matches existing `app_private.user_org_id`, `app_private.user_role`, `app_private.is_platform_admin` patterns.
- **D-11:** **Function body (sketch):**
  ```sql
  -- Fires AFTER UPDATE ON <each tenant table> WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
  -- Writes activity_log row capturing soft-delete event with org + entity + actor context.
  --
  -- Reads acting user via THREE-TIER fallback:
  -- 1. auth.uid() — primary (PostgREST sets request.jwt.claim.sub per transaction; covers ~95% of cases)
  -- 2. current_setting('app.current_user_id', true) — service-role escape hatch (route deliberately sets this before write)
  -- 3. NULL with marker — fallback for true headless context (Inngest jobs, pg_cron, manual SQL); details.actor_source = 'service_role'
  ```
  Exact function body authored at PLAN time; specifics surface as ACs.
- **D-12:** **Function reads `entity_type` from `TG_TABLE_NAME`** (PostgreSQL built-in) — generic across all 32 tables, no per-table customization. **NO entity_type union extension required for B-3** — the activity_log.entity_type column is `text NOT NULL` (no enum); B-3 writes whatever table name the trigger was attached to. B-4 separately extends the TypeScript `ActivityEntityType` union at `src/lib/activity-log.ts:36` to cover Slice-2 entities. B-3 ships trigger; B-4 extends TypeScript union. NO race condition because TypeScript union is consumed by application code (logActivity helper) — trigger writes to DB raw, application code reads via Supabase + types. Plan-author confirms this split is correct at iter-1.
- **D-13:** **Function writes action = `'soft_deleted'`** (canonical action string for soft-delete events). Convention matches existing `logActivity` action conventions (e.g., 'created', 'updated', 'submitted', 'approved', 'paid', 'voided', 'acknowledged'). NOT 'deleted' (which implies hard-delete and is forbidden by CLAUDE.md).
- **D-14:** **Function writes details JSONB with:**
  - `actor_source`: 'auth_uid' | 'app_current_user_id' | 'service_role' (which of the three tiers resolved the user_id)
  - `row_snapshot_summary`: optional minimal snapshot (e.g., `{name, status}` if present) — plan-author bounds the snapshot scope at iter-1 to avoid bloating activity_log size
  - **NO full row dump** — activity_log already has 7-year retention per VISION §6.4; bloating with row snapshots multiplies storage cost. Targeted summary fields only.
- **D-15:** **Function does NOT write `actor_token_id`** — that column is reserved for B-2b's homeowner-initiated `actor_token_id` writes. Soft-delete events are always user-initiated (PMs, admins, accounting), never token-initiated. B-3 trigger sets `actor_token_id = NULL` explicitly.
- **D-16:** **Per-table trigger declarations** use uniform name `zz_soft_delete_audit_<table>` + body `EXECUTE FUNCTION app_private.audit_soft_delete()` + WHEN clause `(OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)`. PL/pgSQL DO block authored in 00107 migration loops over the 32 target tables; idempotent (DROP TRIGGER IF EXISTS … then CREATE TRIGGER).

### DEF-WC-1 — org_members RESTRICTIVE backstop

- **D-17:** **DEF-WC-1 adds RESTRICTIVE policy `"org_members_org_isolation"` on `org_members`** with:
  - `qual` (USING clause): `((org_id = (SELECT app_private.user_org_id())) OR (SELECT app_private.is_platform_admin()))`
  - `with_check` (WITH CHECK clause): `(org_id = (SELECT app_private.user_org_id()))`
  - Wrapping `(SELECT ...)` per CLAUDE.md Q10b session-cache pattern (avoids per-row function evaluation)
  - PERMISSIVE = false → adds RESTRICTIVE backstop that AND's with all existing PERMISSIVE policies (cross-org reads now blocked regardless of PERMISSIVE policy bugs)
- **D-18:** **DEF-WC-1 does NOT modify existing PERMISSIVE policies** on `org_members`. Existing 3 policies (`admin manage org_members`, `members read org_members`, `org_members_platform_admin_read`) remain unchanged. RESTRICTIVE policy AND's with them (cross-tenant denial-of-effect).
- **D-19:** **DEF-WC-1 plus `org_members_delete_strict`** RESTRICTIVE DELETE policy (`org_id = (SELECT app_private.user_org_id())`) to fully match the canonical pattern. Without this, cross-org DELETE via platform_admin role could still happen (the RESTRICTIVE backstop above explicitly allows platform_admin reads; DELETE backstop closes that vector for non-self-delete).

### DEF-WC-3 — RLS posture summary table in ARCHITECTURE.md

- **D-20:** **DEF-WC-3 adds new section `§X. RLS posture summary table by entity`** to `.planning/architecture/ARCHITECTURE.md` (exact section number determined by plan-author at iter-1 after reading current ARCHITECTURE.md TOC). Table covers all 32 tenant tables (D-02) with columns:
  - **Entity** — table name (e.g., `jobs`, `invoices`)
  - **RLS pattern** — A (canonical Wave-A: RESTRICTIVE backstop + role-bound PERMISSIVE) OR B (pre-Wave-A: PERMISSIVE-only with org_members joins)
  - **Scope-axis** (per Q10b) — ORG-scoped tenant (direct-filter RLS) vs USER-scoped child (RLS-by-join) — for all 32 the answer is ORG-scoped tenant
  - **Soft-delete trigger** — fires on AFTER UPDATE deleted_at? YES (all 32 post-B-3) / N/A
  - **Audit coverage** — application-layer `logActivity` calls + trigger-layer `audit_soft_delete` complement; row "Both" / "Trigger only" / "App only"
- **D-21:** **DEF-WC-3 table is the AS-IS snapshot post-B-3 ship**, NOT a normative Pattern-A-mandate. Pattern B → Pattern A migration is a separate scope (deferred). Table SHOWS the heterogeneity so future plan-authors / reviewers can reason about it.
- **D-22:** **DEF-WC-3 INCLUDES org_members + activity_log + platform_admins** as extension rows (even though they're not in the 32-table soft-delete set) — these are first-class entities for tenant-isolation posture. Total ARCHITECTURE.md table rows: ~36 (32 soft-delete + 3 extension + 1 client_portal_access from B-2a).

### User-identity-threading convention

- **D-23:** **CONVENTION ANGLE — `auth.uid()` is canonical primary tier.** Per pre-design audit query of `auth.uid()` function body: it reads from `current_setting('request.jwt.claim.sub', true)` which PostgREST sets automatically per transaction. NO new middleware wiring needed for the ~95% authenticated-user case.
- **D-24:** **`current_setting('app.current_user_id', true)` is service-role escape hatch ONLY** — used when API routes deliberately invoke service-role Supabase clients (which lack JWT context). The escape pattern is:
  ```sql
  -- In service-role API route, before any write that triggers B-3 audit trigger:
  SELECT set_config('app.current_user_id', '<authenticated_user_id_from_membership>', true);
  -- Then the soft-delete UPDATE; B-3 trigger reads via tier 2 and records the actor.
  ```
  Plan-author surfaces (a) which existing service-role routes need this escape, (b) whether to add a helper `setSessionUserId(supabaseClient, userId)` to `src/lib/supabase/service.ts`, (c) whether B-3 ships the escape helper or defers to first consumer. **Recommended:** B-3 ships the helper; documents the escape pattern; does NOT call it at every existing service-role site (out-of-scope sweep). First consumer adopts.
- **D-25:** **Trigger function does NOT throw or block on missing user_id.** If all three tiers return NULL, trigger writes user_id = NULL + `details.actor_source = 'service_role'`. Service-role context is legitimate (Inngest jobs, pg_cron cleanup, smoke-seed fixtures); trigger MUST NOT block the underlying soft-delete.

### Migration boundary

- **D-26:** **Single migration 00107** containing all B-3 schema work: (a) `app_private.audit_soft_delete()` SECURITY DEFINER function creation, (b) DO block applying 32 per-table AFTER UPDATE triggers, (c) `org_members_org_isolation` RESTRICTIVE policy creation, (d) `org_members_delete_strict` RESTRICTIVE DELETE policy creation, (e) (optional) `setSessionUserId` PL/pgSQL helper if plan-author scopes the escape helper to B-3.
  - **Why single migration:** Atomic rollback contract. B-3's pieces are interdependent (trigger function + triggers + RLS hardening all ship together). If trigger function fails verification, RLS policies should not exist standalone.
  - Down migration drops in reverse order: per-table triggers → audit_soft_delete function → org_members RESTRICTIVE policies.
- **D-27:** **DEF-WC-3 ARCHITECTURE.md update is DOC-only, separate commit from migration 00107** (canonical pattern — docs commits separate from schema commits). Plan-author surfaces commit sequence: (1) migration 00107 commit, (2) ARCHITECTURE.md DEF-WC-3 commit, (3) (conditional) W.1 unflag env-var commit.

### W.1 listener unflag (conditional carry-forward)

- **D-28:** **W.1 carry-forward observation window check:** Plan-author verifies at /np time whether the 1-2 week observation window post-Slice-1 B-1b ship (2026-05-15) has closed. Today is 2026-05-22 — 7 days post-Slice-1 ship. Window status: PARTIAL (1 week of 1-2 weeks). Plan-author proposes (a) ship W.1 in B-3 (Sentry green over 7 days is acceptable signal) OR (b) defer to B-4 (full 2-week window). **Recommended:** Defer to B-4 per EXPANDED-SCOPE §7 plan #2 "Lands in B-3 IF observation window closes BEFORE B-3 dispatches" — at B-3 dispatch (2026-05-22), 7-day window is on the boundary; conservative defer-to-B-4 is the safer call.
- **D-29:** **If W.1 ships in B-3** (D-28 alternative path): env-var addition `NEXT_PUBLIC_AUTH_STATE_LISTENER=true` in Vercel Production + Preview environments. ONE explicit verification gate task in PLAN body — Sentry shows no auth-state-change error rate spike during the 7 days post-unflag. NOT a code change.

### Acceptance criteria — falsifiable with LIVE verification queries (per nwrp214 §19)

- **D-30:** **AC-B3-01..AC-B3-10 each have a LIVE SQL verification query** that the executor / reviewer runs against the live schema. Per nwrp214 §19, AC-text-only is INSUFFICIENT for HIGH-threat plans. Example AC patterns:
  - AC-B3-01 (trigger applied to all 32 tables): query `pg_trigger` joining `pg_class` filtered to public-schema tables; expect 32 rows with name like `zz_soft_delete_audit_%`
  - AC-B3-02 (trigger fires correctly on soft-delete): UPDATE a test row's deleted_at; query activity_log for a new row with `entity_type=<table>, action='soft_deleted'`
  - AC-B3-04 (DEF-WC-1 RESTRICTIVE applied): query `pg_policies WHERE tablename='org_members'` for RESTRICTIVE row
  - AC-B3-05 (cross-org leak blocked): impersonate org_A authenticated user, attempt SELECT on org_B's org_members row; expect 0 rows
  - AC-B3-06 (3-tier user-id resolution): execute three test cases (auth.uid set, app.current_user_id set, both NULL); confirm activity_log rows record actor_source correctly
- **D-31:** **AC count target: ~10-12 falsifiable items** matching B-2a's 14-AC scope (HIGH-threat parity). Plan-author may add granularity but MUST include cross-org rejection live attestation (Q3 equivalent of B-2a's catastrophic-leak proof) for org_members.

### Threat model + reviewer scope

- **D-32:** **Threat model: HIGH** (matches EXPANDED-SCOPE §7 plan #2 line 333). Justification:
  - SECURITY DEFINER trigger function fires on every soft-delete across 32 tables (cross-tenant blast radius if misauthored)
  - RLS change on `org_members` (the membership-authority table for tenant scoping; any error here cascades to every other tenant table)
  - User-identity-threading convention is foundational for audit-log integrity (forever-retention compliance per VISION §6.4 + SOC2 CC6.1)
- **D-33:** **Plan-review iter-1 scope: 7 reviewers FULL HIGH-threat (NO streamline; same as B-2a per nwrp214 §15):**
  - spec-checker (verify all 10-12 ACs falsifiable + live queries trace)
  - security-reviewer (LOAD-BEARING — SECURITY DEFINER posture, search_path, REVOKE FROM PUBLIC + EXECUTE grant chain, ACL surface)
  - multi-tenant-architect (LOAD-BEARING — trigger blast radius + DEF-WC-1 cross-tenant correctness)
  - rls-auditor (LOAD-BEARING — DEF-WC-1 RESTRICTIVE pattern; DEF-WC-3 audit table accuracy)
  - database-reviewer (trigger function correctness; trigger ordering vs existing triggers; migration shape; idempotent posture)
  - ai-logic-tester (Rule 3 representative queries; cross-tenant probe execution; audit-log integrity proofs)
  - custodian (planning tree + commit chain + MASTER-PLAN alignment + Slice-2 ledger surface)
  - **NO design-pushback** per nwrp214 §15 (B-3 has no UI surface; deletion + RLS is backend-only)

### Per-plan halt gate (Rule 7d)

- **D-34:** **Per-plan halt gate $50** per CLAUDE.md Workflow posture Rule 7d. B-3 estimate $35-50 base; could run hot to $70-110 if landmines (B-2a precedent). **Plan-author halts if mid-flight projects past $50** per nwrp214 §21 — fresh-ceiling reset, never silent pass.

### Slice-2 ledger surface (per nwrp214 §27)

- **D-35:** **Slice-2 spend to date:** ~$139-177 of $300 ceiling (B-2 iter-1 superseded + B-2a SHIPPED + B-2b SHIPPED). Remaining: ~$123-161 for B-3..B-7. B-3 entry: ~$35-50 base / ~$70-110 if landmines. Plan-review surfaces this at iter-1 synthesis.

### halt_after: true (Tier 1 GATE per nwrp214 §23)

- **D-36:** **halt_after: true** — after plan-review iter-1, HALT for Jake's substantive review against LIVE DB before /nx. NOT auto-/nx. nwrp214 §25: "Surface PLAN.md + the pre-existing-posture audit + iter-1 findings for my review."

### Source decisions (per nwrp152 convention)

- **D-37:** Plan frontmatter cites:
  - EXPANDED-SCOPE §1 (Mapped entities) — 32-table scope
  - EXPANDED-SCOPE §7 plan #2 (B-3 canonical scope)
  - EXPANDED-SCOPE §9 HALT GATE 1 (post-B-3) — 3 verification items
  - EXPANDED-SCOPE §11 (Acceptance criteria for B-3)
  - nwrp200/201/202 (Slice-2 re-split + B-4 leak fix lessons cascading to B-3 pre-design audit)
  - nwrp213/214 (B-2b SHIPPED unblocks B-3; B-3 dispatch with full HIGH-threat rigor + mandatory pre-design audit)
  - CLAUDE.md Workflow posture Rules 1-9 (Rule 1 schema≠runtime; Rule 3 ai-logic-tester executes; Rule 6 pre-flight collision; Rule 7d per-plan halt gate; Rule 9 cross-reviewer factual disagreement HALT)
  - CLAUDE.md Architecture posture (Multi-tenant RLS BY CONSTRUCTION; Q10b scope-axis; soft-delete only)
  - CLAUDE.md Dev Rules (SECURITY DEFINER + search_path mandatory; soft-delete only — never hard-delete; trigger-maintained caches require rationale comment)

### Files modified (preliminary — plan-author finalizes at iter-1)

- **D-38:** **Migration files:**
  - `supabase/migrations/00107_b3_soft_delete_audit_trigger_def_wc_1.sql` (NEW)
  - `supabase/migrations/00107_b3_soft_delete_audit_trigger_def_wc_1.down.sql` (NEW)
- **D-39:** **TypeScript types regen:**
  - `src/lib/types/database.types.ts` (REGEN — migration changes RLS policies + adds trigger function metadata; types may shift)
- **D-40:** **Architecture doc:**
  - `.planning/architecture/ARCHITECTURE.md` (UPDATE — DEF-WC-3 section addition)
- **D-41:** **Helper (optional, plan-author decides at iter-1):**
  - `src/lib/supabase/service.ts` (UPDATE — add `setSessionUserId(client, userId)` helper for service-role escape) — OR defer to first consumer
- **D-42:** **Env-var addition (conditional W.1):**
  - Vercel Production + Preview `NEXT_PUBLIC_AUTH_STATE_LISTENER=true` — NOT a code change; via `vercel env add`

### Codebase reality B-3 modifies (confirmed via Glob + audit)

- **D-43:** `app_private.audit_soft_delete()` does NOT exist (verified via SECURITY DEFINER function audit). B-3 creates it.
- **D-44:** `zz_soft_delete_audit_*` triggers do NOT exist (verified via pg_trigger audit). B-3 creates 32 of them.
- **D-45:** `org_members` RESTRICTIVE policies do NOT exist (verified via pg_policies query). B-3 creates 2 (org_isolation + delete_strict).
- **D-46:** `setSessionUserId` helper does NOT exist (Grep confirmed). B-3 creates it OR defers (D-24).
- **D-47:** ARCHITECTURE.md "RLS posture summary table by entity" section does NOT exist (Grep confirmed). B-3 creates it (DEF-WC-3).

### Deferred research items (out-of-scope for B-3 — surface for follow-up)

- **D-48:** Pattern B → Pattern A RLS migration sweep (17 tables) — deferred to Wave 1.1-Lite (cosmetic RLS uniformity).
- **D-49:** Hard-DELETE audit gap closure (CASCADE silently misses soft-delete trigger) — deferred unless reviewers escalate; mitigation per D-08.
- **D-50:** `setSessionUserId` adoption sweep across existing service-role API routes — deferred to B-4 / Wave 1.1-Lite per first-consumer pattern.
- **D-51:** Inngest async event surface on soft-delete (e.g., "notify owner that draw was voided") — deferred to F3 per EXPANDED-SCOPE §3 #6.

</decisions>

<canonical_refs>
## Canonical References

- **EXPANDED-SCOPE.md** at `.planning/expansions/stage-f1-knowledge-graph-auth-wave-b-slice-2-EXPANDED-SCOPE.md` (RE-APPROVED 2026-05-21):
  - §1 Mapped entities (line 83) — "All tenant tables (~25 tables per ENTITY-INVENTORY.md) | B-3 | Per-table trigger declaration for soft-delete audit safety net" → CORRECTED to 32 per D-02
  - §1 Mapped entities (line 84) — `org_members | B-3 | DEF-WC-1: ADD RESTRICTIVE "org isolation" policy`
  - §2 Prerequisite gaps (line 128) — `current_setting('app.current_user_id', true)` middleware threading is B-3's design contract
  - §2 Prerequisite gaps (line 129) — DEF-WC-3 RLS posture summary table is B-3 deliverable
  - §3 Dependent-soon gaps (line 147) — trigger function must work with current 4-role enum AND future expanded role enum (role-agnostic — trigger reads `current_setting`, not role)
  - §4 Cross-cutting checklist (line 161) — Permissions, B-3 DEF-WC-1 closes org_members backstop
  - §4 Cross-cutting checklist (line 163) — Soft-delete + status_history, B-3 trigger is THE deliverable
  - §4 Cross-cutting checklist (line 175) — Error handling for partial failures — trigger MUST handle missing user_id (NULL marker, does NOT block)
  - §5 Construction-domain checklist (line 188) — Drummond reference job; B-3 trigger fires on Drummond soft-deletes
  - §5 Construction-domain checklist (line 201) — Compliance retention — B-3 trigger ensures every soft-delete creates audit row (7-year financial retention)
  - §7 Recommended scope expansion plan #2 (lines 327-333) — full B-3 canonical scope
  - §9 HALT GATE 1 (post-B-3) (lines 538-542) — 3 verification items
  - §11 Acceptance criteria (lines 416-418, 432) — 3 B-3 ACs + W.1 conditional
- **MASTER-PLAN.md** at `.planning/MASTER-PLAN.md` — §9 Slice-2 progress (2 of 7 shipped post-nwrp213); §11 TD registry (no B-3 prerequisites)
- **CLAUDE.md** (root): Architecture posture (Multi-tenant RLS BY CONSTRUCTION; Q10b scope-axis); Workflow posture Rules 1-9; Dev Rules (SECURITY DEFINER + search_path; soft-delete only; trigger-maintained caches require rationale comment)
- **ARCHITECTURE.md** at `.planning/architecture/ARCHITECTURE.md` — current TOC; section §X for DEF-WC-3 addition determined at iter-1
- **ENTITY-INVENTORY.md** at `.planning/architecture/ENTITY-INVENTORY.md` — 31+ entity catalog; B-3 trigger applies to entities with `org_id NOT NULL + deleted_at NULLABLE` shape (32 tables per D-02; deviates from inventory's 31+ count because some inventory entities don't have tables yet — Wave 2+ entities)
- **B-2a-CONTEXT.md + B-2a-PLAN.md + B-2a-SUMMARY.md** at this phase folder — predecessor security model + composite FK precedent + SECURITY DEFINER + search_path pattern + REVOKE/GRANT discipline (B-2a ACL hardening lesson per nwrp208)
- **B-2b-CONTEXT.md + B-2b-PLAN.md + B-2b-SUMMARY.md** at this phase folder — predecessor lean-direct-authoring + 5-reviewer scope precedent (B-3 reverts to 7-reviewer per nwrp214)
- **Migration 00049** (`supabase/migrations/00049_*.sql`) — canonical RESTRICTIVE backstop pattern reference; DEF-WC-1 mirrors. (Filename precise verification at iter-1 — pre-design audit confirmed pattern exists across jobs/invoices/vendors/etc. but did not pin specific migration filename.)
- **Migration 00102** (`supabase/migrations/00102_wa_iter1_security_cleanup.sql`) — canonical SECURITY DEFINER search_path hardening sweep; B-3 trigger function inherits same posture
- **Migration 00103** (`supabase/migrations/00103_revoke_public_execute_security_definer_triggers.sql`) — canonical REVOKE EXECUTE FROM PUBLIC posture for SECURITY DEFINER trigger functions; B-3 trigger function inherits

</canonical_refs>

<code_context>
## Code Context

### Current state (verified via pre-design audit)

- **32 tenant tables** with `(org_id NOT NULL, deleted_at TIMESTAMPTZ NULL)` shape + RLS enabled — full list at D-02 / D-05.
- **org_members** has NO RESTRICTIVE backstop — 3 PERMISSIVE policies only (per D-09).
- **`app_private.audit_soft_delete()` does NOT exist** — B-3 creates it.
- **`zz_soft_delete_audit_*` triggers do NOT exist** — B-3 creates 32.
- **`current_setting('app.current_user_id', true)`** is NOT set anywhere in `src/`. EXPANDED-SCOPE §2 #13 confirms B-3 is the design-contract author.
- **`auth.uid()` reads from `request.jwt.claim.sub`** GUC set by PostgREST per transaction — verified via `pg_get_functiondef`.
- **`activity_log` shape** (from B-2a ship): `id UUID PK, org_id NOT NULL, user_id NULL, entity_type TEXT NOT NULL, entity_id NULL, action TEXT NOT NULL, details JSONB, created_at NOT NULL DEFAULT now(), actor_token_id NULL`.
- **`updateWithLock()` helper** at `src/lib/api/optimistic-lock.ts` — used by API routes; B-3 trigger is independent (PostgreSQL DDL).
- **Drummond fixture data** (org `00000000-0000-0000-0000-000000000002` Ross Built) + harness-fixture-org — both have ~25 rows across the 32 tables; trigger MUST not break existing fixture seed paths (Drummond seed runs via service-role → trigger writes NULL user_id with marker per D-25).

### Files B-3 creates / modifies (preliminary; plan-author finalizes at iter-1)

- `supabase/migrations/00107_b3_soft_delete_audit_trigger_def_wc_1.sql` (NEW)
- `supabase/migrations/00107_b3_soft_delete_audit_trigger_def_wc_1.down.sql` (NEW)
- `src/lib/types/database.types.ts` (REGEN per CLAUDE.md schema-regen rule)
- `.planning/architecture/ARCHITECTURE.md` (UPDATE — DEF-WC-3 section addition)
- `src/lib/supabase/service.ts` (POSSIBLE UPDATE — `setSessionUserId` helper; plan-author decides at iter-1 per D-24)

### Verification helpers

Pre-design audit queries (preserved verbatim for PLAN §1 reference):
- 32-target-table enumeration query
- RLS policies enumeration query
- Existing triggers query
- FK CASCADE query
- org_members RLS query
- `auth.uid()` function body query (proves JWT-GUC source)
- `app.current_user_id` Grep across `src/` (proves not currently set)

Live verification queries for ACs (plan-author authors these at PLAN time matching B-2a's AC-B2a-06 Q1/Q2/Q3 precedent):
- Trigger applied to 32 tables (pg_trigger join pg_class)
- Trigger fires correctly on soft-delete (test row UPDATE + activity_log assertion)
- DEF-WC-1 RESTRICTIVE applied (pg_policies)
- Cross-org leak blocked (org-B-as-org-A attempt + zero rows)
- 3-tier user-id resolution (three test cases)

</code_context>

<specifics>
## Specifics

### Migration 00107 atomic boundary

Single migration containing:
1. `CREATE OR REPLACE FUNCTION app_private.audit_soft_delete() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$ ... $$;`
2. `REVOKE EXECUTE ON FUNCTION app_private.audit_soft_delete() FROM PUBLIC;` (canonical 00103 pattern)
3. DO block looping over 32 target tables; for each: `DROP TRIGGER IF EXISTS zz_soft_delete_audit_<table> ON public.<table>; CREATE TRIGGER zz_soft_delete_audit_<table> AFTER UPDATE ON public.<table> FOR EACH ROW WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) EXECUTE FUNCTION app_private.audit_soft_delete();`
4. `CREATE POLICY org_members_org_isolation ON public.org_members AS RESTRICTIVE FOR ALL USING (...) WITH CHECK (...);`
5. `CREATE POLICY org_members_delete_strict ON public.org_members AS RESTRICTIVE FOR DELETE USING (...);`
6. (Optional) `setSessionUserId` SQL function if plan-author scopes the escape helper to migration vs application-layer.

### Down migration

Reverse order:
1. Drop org_members RESTRICTIVE policies
2. Loop drop 32 triggers
3. Drop `app_private.audit_soft_delete()` function

### Sentry / observability

Trigger errors MUST surface to Sentry. PostgreSQL emits NOTICE/WARNING on trigger errors; Supabase Edge functions / API routes catch PostgrestError and route to Sentry. Plan-author confirms trigger errors propagate to client (e.g., RAISE EXCEPTION fails the underlying UPDATE; the API route's PostgrestError handler captures + sends to Sentry).

### Threat surface

**HIGH-threat justifications (per D-32):**
1. SECURITY DEFINER trigger function with cross-tenant blast radius (32 tables)
2. RLS change on `org_members` (the membership-authority table — cross-tenant cascade if misauthored)
3. Audit-log integrity foundation for SOC2 CC6.1 / forever-retention compliance
4. User-identity-threading convention is foundational for future audit trail (B-4+ all consume this)

</specifics>
