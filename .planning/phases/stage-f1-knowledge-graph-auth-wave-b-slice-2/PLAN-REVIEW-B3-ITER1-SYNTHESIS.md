# Plan-review iter-1 SYNTHESIS — B-3

**Plan reviewed:** `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-3-PLAN.md` commit `2f8e93a`
**Synthesis date:** 2026-05-22
**Threat model:** HIGH (Soft-delete DB-trigger audit safety net + DEF-WC-1 + DEF-WC-3 + W.1 conditional)
**Dispatch authorization:** nwrp214 (full HIGH-threat rigor + mandatory pre-design audit + halt_after: true)
**Overall verdict:** **NEEDS-WORK** (iter-2 required before /nx — 4 BLOCKING findings + 8 MUST-FIX + 4 WARNING + 5 NOTE)

---

## 1. Reviewer scope executed

| # | Reviewer | Verdict | Disk artifact |
|---|----------|---------|---------------|
| 1 | spec-checker | NEEDS-WORK | (inline only — interpreted "do NOT write files" rule; findings captured below) |
| 2 | security-reviewer (LOAD-BEARING) | NEEDS-WORK | `PLAN-REVIEW-B3-ITER1-SECURITY.md` |
| 3 | multi-tenant-architect (LOAD-BEARING) | APPROVE (with WARNINGs) | (inline only — interpreted "do NOT write files" rule) |
| 4 | rls-auditor (LOAD-BEARING) | NEEDS-WORK | (inline only — interpreted "do NOT write files" rule) |
| 5 | database-reviewer | NEEDS-WORK | `PLAN-REVIEW-B3-ITER1-DATABASE.md` |
| 6 | ai-logic-tester | NEEDS-WORK | (inline only — interpreted "do NOT write files" rule) |
| 7 | custodian | APPROVE | `PLAN-REVIEW-B3-ITER1-CUSTODIAN.md` |

**NO design-pushback** per nwrp214 §15 (B-3 has no UI surface).

**NOTE on disk persistence**: 4 of 7 reviewers returned inline only. Per CLAUDE.md Rule 8(d) "disk-evidence > conversation-context," this is a discipline gap to address in future plan-review dispatches. The findings ARE captured here in SYNTHESIS canonical form for audit-trail purposes; individual reviewer files for the 4 are NOT persisted but their full output is incorporated below. Future iter-1 dispatches should explicitly mandate file persistence in the reviewer Task prompts.

---

## 2. Cross-reviewer agreement matrix (Rule 9 lens)

### Cross-reviewer ALIGNMENT on factual claims (no Rule 9 disagreement triggered)

| Finding | Reviewers | Severity | Cross-agreement strength |
|---------|-----------|----------|-------------------------|
| `client_portal_access` DEF-WC-3 row inaccuracy (no deleted_at; uses revoked_at; trigger does NOT apply) | spec-checker (F-2) + multi-tenant-architect (WARNING-2) + rls-auditor (MF-RLS-03) + database-reviewer (M-2) | MUST-FIX | **4 reviewers** |
| Exception handler missing in trigger function (violates AC-B3-10 graceful degradation) | security-reviewer (SEC-B3-03 BLOCKING) + database-reviewer (M-1 MUST-FIX) | BLOCKING | **2 reviewers** |
| DEF-WC-1 SELECT-wrapped vs canonical direct-call form divergence | rls-auditor (MF-RLS-01) + ai-logic-tester (Finding 7) + multi-tenant-architect (WARNING-4) | MUST-FIX (decision point) | **3 reviewers** |
| `app.current_user_id` spoofing risk + service-role-only contract undocumented | security-reviewer (SEC-B3-04 HIGH) + multi-tenant-architect (WARNING-1) | HIGH | **2 reviewers** |
| AC-B3-09 / Task 2 row-count inconsistency (3 sites disagree: 36 vs 37) | spec-checker (F-1) + multi-tenant-architect (WARNING-5) | HIGH | **2 reviewers** |
| Hard-DELETE CASCADE audit gap accepted as documented deferral | multi-tenant-architect (NTH-2) + ai-logic-tester (Finding 9) | NOTE | **2 reviewers** |

**Rule 9 status:** **No factual disagreement detected.** All findings are either cross-agreed OR independent observations on distinct surfaces. NO HALT for Rule 9 required.

---

## 3. Findings by severity

### 3.1 BLOCKING (4 findings — must fix before /nx)

#### BLOCKING-1 — Entity_type singular/plural divergence (ai-logic-tester Finding 1)

**Where:** PLAN §2.1 trigger function body line 451 (`entity_type ← TG_TABLE_NAME` → emits plural like `'jobs'`)
PLAN `<criteria>` block line 82 (locks in `entity_type='jobs'`)
PLAN AC-B3-02 expected result (`captured_entity_type = 'jobs'`)

**Issue:** `TG_TABLE_NAME` returns the PLURAL physical table name. But:
- All 74 existing `activity_log` rows use **SINGULAR** entity_types (`invoice` x42, `draw` x14, `job` x14, `change_order` x2, `budget_line` x1, `invoice_import_batch` x1) — verified via LIVE query
- `src/lib/activity-log.ts:32-49` `ActivityEntityType` union is **strictly SINGULAR**: `"invoice" | "purchase_order" | "change_order" | "budget_line" | "job" | "vendor" | "cost_code" | "draw" | "user" | "client" | "client_portal_access"` (+ a few others)
- `src/lib/audit/action-labels.ts:51` `ENTITY_LABELS` Record requires exhaustive keys
- 40+ call sites in `src/app/api/**` all use singular
- Stage 1.5c audit-log rename ("Bill" / "Pay App") relies on singular entity_type values

**Consequence if shipped:**
- Trigger writes plural like `'jobs'`, `'invoices'`, `'change_orders'` (9 plural variants for existing tables) + 23 NEW entity_types not in union
- Audit-log query code falls back to raw text → Stage 1.5c UI rename does NOT apply to trigger-written rows
- TypeScript union extension required for soundness (Record exhaustiveness fails compile)
- Cross-system query consistency broken: `entity_type='job'` misses trigger rows

**Resolution options:**
- **(a) RECOMMENDED — Singular mapping in trigger function.** Per-table mapping via CASE statement OR explicit constant array OR per-table trigger functions. Trigger emits `'job'` not `'jobs'`. ALSO extend `ActivityEntityType` union + `ENTITY_LABELS` Record for the 23 new entity types.
- (b) Plural everywhere — migrate 40+ call sites + backfill SQL on 74 existing rows. NOT recommended (massive blast radius).
- (c) Dual vocabulary with read-time mapping in `auditLabel()`. Creates two convention universes in same column — anti-pattern.

**Scope expansion:** `files_modified` must add `src/lib/activity-log.ts` + `src/lib/audit/action-labels.ts` (~30 lines + Record entries).

#### BLOCKING-2 — `'soft_deleted'` action not in `ActivityAction` union (ai-logic-tester Finding 2)

**Where:** PLAN §2.1 trigger writes `action ← 'soft_deleted'`

**Issue:**
- `src/lib/activity-log.ts:51-81` `ActivityAction` union — `'soft_deleted'` is NOT a member (only `'deleted'` is)
- `src/lib/audit/action-labels.ts:62-89` `ACTION_LABELS` Record requires exhaustive keys → no `'soft_deleted'` entry → falls through to raw text

**Resolution options:**
- (a) Add `'soft_deleted'` to `ActivityAction` union + `ACTION_LABELS` Record
- **(b) RECOMMENDED — Use existing `'deleted'` action.** Discriminate via `details.actor_source` (already in scope). Avoids extending union; trigger fires on transition NULL → NOT NULL which IS deletion.

**Scope expansion:** Either path requires `src/lib/activity-log.ts` + `src/lib/audit/action-labels.ts` in `files_modified`.

#### BLOCKING-3 — Exception handler absent in trigger function body (security-reviewer SEC-B3-03 + database-reviewer M-1)

**Where:** PLAN §2.1 function body lines 420-475

**Issue:** Trigger function body lacks `BEGIN ... EXCEPTION WHEN OTHERS THEN ... END` wrapper around the `INSERT INTO activity_log` statement. If INSERT fails for any reason (constraint violation, lock timeout, schema change mid-migration, transient error), exception propagates and the underlying soft-delete UPDATE silently FAILS.

**Consequence if shipped:** Violates AC-B3-10 graceful-degradation contract ("Trigger does NOT block soft-delete on missing user_id"). PLAN explicitly flags this as "plan-author finalizes exception handling at iter-1" but provides no body.

**Fix:** Wrap the entire body in `BEGIN ... EXCEPTION WHEN OTHERS THEN RAISE WARNING ... RETURN NEW; END;` Trigger captures the failure to Sentry via PostgreSQL WARNING but does NOT block the UPDATE.

#### BLOCKING-4 — AC-B3-08 proacl ACL verification check is fragile (security-reviewer SEC-B3-08)

**Where:** PLAN §3 Task 1 verification M-05 + §4 AC-B3-08

**Issue:** The inline check uses `proacl` text-contains match (`does NOT contain =X/postgres`). Migration 00103 was specifically written because this pattern misses PUBLIC grants in managed Supabase environments where the ACL representation differs.

**Fix:** Replace with canonical `aclexplode` + `grantee = 0` pattern from 00103 + 00105 (B-2a ACL hardening per nwrp208):
```sql
SELECT bool_or(grantor = grantee OR grantee = 0) AS public_grant_present
  FROM pg_proc p
  CROSS JOIN LATERAL aclexplode(p.proacl) AS acl
 WHERE p.proname = 'audit_soft_delete'
   AND p.pronamespace = 'app_private'::regnamespace
   AND acl.privilege_type = 'EXECUTE';
-- Expected: false (no PUBLIC EXECUTE grant)
```

### 3.2 MUST-FIX (8 findings — must fix before /nx)

#### MF-1 — `client_portal_access` DEF-WC-3 row inaccuracy (4 reviewers agree)

**Where:** PLAN §2.4 client_portal_access extension row, line 564

**Issue:** Currently says `"Soft-delete trigger: YES (B-2a added deleted_at? confirm at iter-1)"`. Live schema verification confirms:
- `client_portal_access` has NO `deleted_at` column (uses `revoked_at` + `expires_at` lifecycle)
- B-2a migration 00104 did NOT add `deleted_at`
- Therefore client_portal_access is NOT in the 32-table soft-delete trigger set
- 3 PERMISSIVE policies only (`client_portal_access_org_insert/read/update`) — Pattern B, NOT Pattern A

**Fix:**
- Soft-delete trigger column: `N/A (uses revoked_at lifecycle; no deleted_at column)`
- RLS pattern column: `B (PERMISSIVE-only)` NOT `A (post-B-2a)`
- Audit coverage column: `App only` NOT `Both`

#### MF-2 — DEF-WC-1 SELECT-wrapped vs canonical direct-call form (3 reviewers, DECISION POINT)

**Where:** PLAN §2.3 DEF-WC-1 policy syntax

**Issue:** PLAN proposes:
```sql
USING ((org_id = (SELECT app_private.user_org_id())) OR (SELECT app_private.is_platform_admin()))
WITH CHECK (org_id = (SELECT app_private.user_org_id()))
```

Live `pg_policies` shows canonical Pattern A on 14+ tables uses **direct-call** form:
```sql
USING ((org_id = app_private.user_org_id()) OR app_private.is_platform_admin())
WITH CHECK (org_id = app_private.user_org_id())
```

ONE exception: `invoice_allocations` uses SELECT-wrapped (migration 00096 Q10b session-cache pattern for ORG-scoped child).

**Decision required (Jake at GATE):**
- **Option A (rls-auditor RECOMMENDED):** Match canonical direct-call form. Preserves consistency across 14+ tables. Defers any Q10b sweep to Wave 1.1-Lite.
- **Option B (Q10b improvement):** Use SELECT-wrapped form. Performance better for high-frequency queries. Creates new "A-SELECT" subcategory in DEF-WC-3 table. Requires Wave 1.1-Lite follow-up to normalize the other 14 tables.

#### MF-3 — `clients` Pattern A vs B in DEF-WC-3 (rls-auditor MF-RLS-02)

**Where:** PLAN §2.4 clients row says `A (post-00100)`

**Issue:** Live `pg_policies` for clients shows 3 PERMISSIVE policies (`clients_org_insert/select/update`) with `(SELECT app_private.user_org_id())` qual. **NO RESTRICTIVE backstop.** clients is Pattern B, not Pattern A.

**Fix:** DEF-WC-3 table assigns clients to Pattern B.

#### MF-4 — AC-B3-05 cross-org probe session-context setup undocumented (rls-auditor MF-RLS-04)

**Where:** PLAN §4 AC-B3-05 — Q3-equivalent load-bearing cross-org leak probe

**Issue:** Verification query does NOT specify HOW the org_B authenticated session is established for `mcp__supabase__execute_sql`. If ai-logic-tester runs the probe under service-role context (which bypasses RLS), it ALWAYS returns rows → false PASS.

**Fix:** Add explicit setup step:
```sql
-- Establish org_B authenticated session before probe
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '<org_B_member_user_id>';
SET LOCAL request.jwt.claims = '{"sub":"<org_B_member_user_id>","role":"authenticated"}';
-- Then run the probe:
SELECT COUNT(*) FROM public.org_members WHERE org_id = '<org_A_id>';
-- Expected: 0
```

#### MF-5 — AC-B3-09 / Task 2 row-count inconsistency (spec-checker F-1 + multi-tenant WARNING-5)

**Where:** Three sites in PLAN body conflict:
- `<criteria>` block line 91 + §2.4 narrative line 574: "3 extension + 1 client_portal_access = 36 rows total"
- Task 2 scope line 641: "36 rows (32 soft-delete + **4** extension entities)"
- AC-B3-09 expected result line 904: "**≥37** rows (1 header row + 32 soft-delete + 4 extension rows)"

**Fix:** Standardize to:
- DEF-WC-3 table has **36 DATA rows** (32 soft-delete + 4 extension: org_members, activity_log, platform_admins, client_portal_access)
- AC-B3-09 expected `≥36` rows when grep counts data rows only (NOT header rows)
- Propagate consistent count to all 3 sites

#### MF-6 — Drummond org/job mislabeling in AC-B3-02 + AC-B3-03 + AC-B3-06 + AC-B3-10 + Task 3 (ai-logic-tester Finding 5 + Finding 10)

**Where:** PLAN §4 multiple ACs reference `<drummond_org_id>` + Task 3 line 657 references "Drummond + harness-fixture-org"

**Issue:** "Drummond" is a JOB (`Drummond Residence`, id `a1bb4d28-103d-40d8-98fd-2dc449bf5d1c`) inside Ross Built org (`00000000-0000-0000-0000-000000000001`), NOT an organization. There is no "Drummond org."

**Fix:**
- Replace `<drummond_org_id>` with `<ross_built_org_id> = '00000000-0000-0000-0000-000000000001'`
- Add explicit `<drummond_job_id> = 'a1bb4d28-103d-40d8-98fd-2dc449bf5d1c'`
- Task 3 reword: smoke harness against `harness-fixture-org` (synthetic seed only per CLAUDE.md Domain rules); Drummond is for E2E demos only, NOT smoke

#### MF-7 — §1.4 trigger landscape factually undercount (ai-logic-tester Finding 6)

**Where:** PLAN §1.4 "3 invoices + 1 change_orders + 1 invoice_line_items existing AFTER UPDATE triggers"

**Issue:** Live verification (`pg_trigger` joined to `pg_class`):
- Actual AFTER UPDATE triggers across 32 tenant tables: **15 triggers across 8 tables** (not 5 across 3 tables)
- 27 BEFORE UPDATE triggers (PLAN claimed 28)

**Design conclusion unchanged:** `zz_*` prefix STILL fires last (PROBE 5 confirmed no existing triggers above 'z'). But the supporting evidence in §1.4 is factually off by a factor of 3.

**Fix:** Correct §1.4 counts to live values: 15 AFTER UPDATE / 27 BEFORE UPDATE; preserve design conclusion.

#### MF-8 — `app.current_user_id` service-role-only contract undocumented (security-reviewer SEC-B3-04 + multi-tenant WARNING-1)

**Where:** PLAN §2.1 trigger function Tier 2 resolution

**Issue:** Tier 2 reads `current_setting('app.current_user_id', true)`. Any service-role caller (or any code with `set_config` capability) can set this to ANY UUID. Trigger writes that UUID as actor → audit-integrity concern (NOT cross-tenant; tenant integrity preserved via NEW.org_id).

PLAN does not explicitly state that `set_config('app.current_user_id', ...)` is service-role-only contract. Future consumers might allow client-bound SQL to set the GUC, creating audit-spoofing surface.

**Fix:** Add to PLAN §2.6 + §5 R-3 + commit body language:
> "**CONTRACT:** `set_config('app.current_user_id', user_id, true)` is set ONLY by trusted server-side code (service-role API routes). NEVER by client-bound SQL (PostgREST, anon-token-resolved contexts, JWT-bound user contexts). Violation of this contract = audit-spoofing surface."

### 3.3 WARNING (4 findings)

#### W-1 — Trigger Tier-resolution logic in §2.1 is correct but fragile-to-edit (ai-logic-tester Finding 3)

PLAN body assigns `v_actor_source := 'auth_uid'` BEFORE the NULL-check on v_user_id. The Tier 3 branch DOES correctly overwrite to `'service_role'`, but the code path is hard to audit on first read.

**Recommended restructure:**
```sql
IF auth.uid() IS NOT NULL THEN
  v_user_id := auth.uid(); v_actor_source := 'auth_uid';
ELSIF nullif(current_setting('app.current_user_id', true), '') IS NOT NULL THEN
  v_user_id := nullif(current_setting('app.current_user_id', true), '')::uuid;
  v_actor_source := 'app_current_user_id';
ELSE
  v_user_id := NULL; v_actor_source := 'service_role';
END IF;
```

#### W-2 — `'soft_deleted'` semantic duplication with `'deleted'` (ai-logic-tester Finding 4)

`ActivityAction` already has `'deleted'`. Adding `'soft_deleted'` creates a third axis (entity_type + action + source-row-state) where action is meant to be primary discriminator.

**Recommended:** Use `'deleted'` (already in union). Discriminate trigger-written vs app-layer via `details.actor_source` (already in scope). Avoids extending the union. Couples with BLOCKING-2 resolution.

#### W-3 — `org_members_delete_strict` policy intentionally blocks platform_admin cross-org deletes (database-reviewer W-1)

The plan correctly omits `is_platform_admin()` OR-clause from `org_members_delete_strict`. This is per canonical pattern (00049). Migration body should cite the rationale explicitly to prevent future plan-authors from "fixing" it.

**Fix:** Add migration comment:
```sql
-- org_members_delete_strict deliberately omits is_platform_admin() OR-clause.
-- Canonical Wave-A pattern (migration 00049) — platform_admin retains cross-org SELECT
-- but NOT cross-org DELETE. Cross-org membership removal is an operations event
-- that must be audited separately via admin tooling.
```

#### W-4 — Undelete transition NOT audited (ai-logic-tester state-machine concern)

Trigger fires only on forward soft-delete (NULL → NOT NULL on `deleted_at`). Undelete events (NOT NULL → NULL) are NOT audited.

**Recommended:** Add explicit decision to PLAN: "B-3 trigger ONLY fires on soft-delete forward transition. Undelete events are not currently audited; deferred to Wave 1.1-Lite if needed (no current product requirement)."

### 3.4 NOTE (5 findings)

#### N-1 — EXPANDED-SCOPE §11 ACs say "~25 tenant tables" but PLAN correctly upgrades to 32 (spec-checker N-1)

Pre-design audit corrected the estimate. Post-ship, Jake should consider amending EXPANDED-SCOPE §11 B-3 ACs to say "32" for future artifact coherence. NOT blocking.

#### N-2 — W.1 conditional assigned to B-4 (spec-checker N-2)

PLAN defers W.1 to B-4 (observation window on boundary). EXPANDED-SCOPE §11 line 432 explicitly permits "B-3 or B-4." No AC gap.

#### N-3 — HALT GATE 1 item 1 "representative test per table — script-driven" coverage (spec-checker N-3)

AC-B3-01 (count = 32) + AC-B3-02 (representative jobs firing test) + Task 3 smoke harness together cover HALT GATE 1 item 1. EXPANDED-SCOPE §9 line 539 strictly reads "per table — script-driven" — Jake may want a DO-block looping over 32 tables soft-deleting + rolling back one fixture row each. Confirm at GATE B-3.

#### N-4 — Trigger BYPASSRLS dependence on activity_log NOT having FORCE RLS (ai-logic-tester Finding 8)

Live: `activity_log.relforcerowsecurity = false` → table owner (postgres BYPASSRLS) writes succeed. If future hardening adds FORCE RLS, trigger needs explicit INSERT policy.

**Fix:** Add migration comment + PLAN body note:
> "Trigger INSERT to activity_log relies on activity_log.relforcerowsecurity = false. If future hardening adds FORCE RLS, trigger needs explicit INSERT policy."

#### N-5 — Hard-DELETE CASCADE audit gap (already documented in §1.5 + R-1; multi-tenant + ai-logic-tester agree)

PLAN documents the gap and accepts deferral to Wave 1.1-Lite. ai-logic-tester enumerated ~22 cascade FKs (PLAN said ~16). Worth recording the larger blast radius:
- `invoices → document_extractions → document_extraction_lines → line_bom_attachments/line_cost_components` (5+ table cascade)

---

## 4. Pre-design audit assessment (per nwrp214 §7-13)

**Verdict on pre-design audit quality:** STRONG — surfaced 2 corrections + 1 design refinement BEFORE design phase.

| Audit finding | Verified against live data? | Surfaced design implication? | Disposition |
|---------------|----------------------------|------------------------------|-------------|
| §1.1: 32 tables (NOT ~25) | YES — INTERSECT query | YES — 7 more tables than estimated | Accepted; EXPANDED-SCOPE §11 wording stale but PLAN supersedes |
| §1.2: TWO RLS patterns | YES — pg_policies enumeration | YES — Pattern A vs B taxonomy in DEF-WC-3 | Accepted; defer Pattern B → A sweep to Wave 1.1-Lite |
| §1.3: org_members RLS gap | YES — pg_policies for org_members | YES — DEF-WC-1 fills gap | Accepted; canonical Wave-A pattern adopted |
| §1.4: 28 BEFORE UPDATE + 4 AFTER UPDATE triggers | PARTIAL — live actual is 27/15 (off by factor of 3 on AFTER) | YES — zz_-prefix ordering | DESIGN UNCHANGED but count needs correction (MF-7) |
| §1.5: ~16 FK CASCADE relationships | PARTIAL — live actual is ~22 cascades | YES — hard-DELETE audit gap | Accepted gap; defer to Wave 1.1-Lite |
| §1.6: Soft-delete uniform | YES — 32 tables uniform | YES — generic trigger function | Accepted |
| §1.7: activity_log shape | YES — information_schema | YES — column write contract | Accepted |
| §1.8: SECURITY DEFINER patterns | YES — pg_proc + proconfig | YES — canonical `search_path = public, pg_temp` | Accepted |
| §1.9: app.current_user_id GUC + auth.uid() | YES — pg_get_functiondef + Grep | YES — design refined to three-tier with auth.uid() primary | Accepted; service-role-only contract needs documentation (MF-8) |

**Conclusion:** Pre-design audit caught the EXPANDED-SCOPE ~25→32 correction AND the design refinement on user-identity-threading (auth.uid() canonical primary, app.current_user_id service-role escape). This validates nwrp214 §7-13 mandatory audit posture — the B-2a lesson applied correctly.

---

## 5. Slice-2 ledger surface (per nwrp214 §27)

### Current cost trajectory (pre-iter-2)

| Plan | Spend | Status |
|------|-------|--------|
| B-2 iter-1 (superseded) | ~$15-20 | NEEDS-WORK; led to nwrp200 re-split |
| **B-2a** | ~$77-98 | SHIPPED |
| **B-2b** | ~$24-28 | SHIPPED |
| **B-3 to-date** | ~$35-52 | iter-1 NEEDS-WORK; iter-2 required |
| **Slice-2 consumed** | ~$151-198 of $300 | — |
| **Slice-2 remaining** | ~$102-149 | For B-3 iter-2 + B-4..B-7 |

### B-3 cost projection (iter-2 + completion)

| Activity | Estimate |
|----------|----------|
| iter-2 PLAN revision (incorporate 4 BLOCKING + 8 MUST-FIX) | $5-8 |
| iter-2 reviewer dispatch (subset: security + database + ai-logic-tester + rls-auditor) | $10-15 |
| **iter-2 total** | $15-23 |
| **B-3 cumulative (iter-1 + iter-2)** | $50-75 |

### Per-plan halt gate $50 — TRIGGERED

**Trigger:** Per Rule 7d + nwrp214 §21, mid-flight projections past $50 require HALT for Jake re-scope.

**Cumulative B-3 spend approaches or exceeds $50.** Iter-2 cost would push B-3 cumulative to $50-75, exceeding the per-plan halt gate.

**Per nwrp214 §22:** "halt + surface — fresh-ceiling reset as needed (the B-2a pattern: iter cycles in fresh sessions, never one silent run-through past gate)."

**Per nwrp214 §25:** "Do NOT auto-proceed to /nx. Tier-1."

### Forward projection (post-B-3 ship)

If B-3 ships at $75 cumulative:
- Slice-2 remaining: ~$102-149 - ~$23 iter-2 = ~$79-126
- Plans remaining: 4 (B-4 + B-5 + B-6 + B-7)
- Avg remaining budget per plan: $20-32

**B-4 EXPANDED-SCOPE estimate** (per §10): $15-25 (additive type extension + 5 carry-forwards; should land ≤$25 even with carry-forwards)
**B-5 estimate** (§10): not yet projected — likely $20-30 (HIGH threat external webhook)
**B-6 + B-7 estimates** (§10): $15-25 each

**Slice-2 close projection:** ~$210-275 of $300 ceiling. Within budget IF B-5 lands ≤$30.

---

## 6. Decision points requiring Jake authorization (per nwrp214 §25)

### 6.1 Per-plan halt gate $50 — exceeded

**Question:** Authorize iter-2 PLAN revision + reviewer subset re-dispatch ($15-23 incremental)?

- **Option A:** Authorize ceiling bump $50 → $75 EXCLUSIVELY for iter-2 + execute path (B-2a precedent per nwrp207). One-time bump; no further bumps without explicit Jake authorization.
- **Option B:** Halt-for-fresh-session per nwrp203/nwrp164 precedent. Persist iter-1 SYNTHESIS + PLAN; resume B-3 iter-2 in a fresh session.
- **Option C:** Scope-restrict iter-2 — keep only BLOCKING-1 through BLOCKING-4 fixes; defer the 8 MUST-FIX to GATE B-3 review against LIVE DB. Iter-2 spend would be ~$8-12.

**Recommended:** Option A. The 4 BLOCKING + 8 MUST-FIX are all factual / pattern-consistency / documentation refinements; the design itself (trigger function + DEF-WC-1 + DEF-WC-3 + W.1 conditional) is sound per pre-design audit + reviewer alignment.

### 6.2 DEF-WC-1 SELECT-wrapped vs canonical direct-call form (MF-2)

**Question:** Match canonical direct-call form on org_members (Option A, rls-auditor RECOMMENDED) OR adopt SELECT-wrapped form (Option B, Q10b improvement)?

- **Option A:** Consistency with existing 14 Pattern A tables. Defer Q10b normalization sweep to Wave 1.1-Lite.
- **Option B:** Adopt modern Q10b session-cache form. Document divergence in DEF-WC-3. Triggers Wave 1.1-Lite follow-up to normalize the 14 Pattern A tables.

**Recommended:** Option A. Consistency over single-table optimization at this scale (org_members has ~21 rows; perf delta negligible).

### 6.3 BLOCKING-1 + BLOCKING-2 resolution path

**Question:** Entity_type singular mapping approach + `'soft_deleted'` action union extension OR existing `'deleted'`?

- **Option A:** Singular mapping in trigger via CASE statement; extend `ActivityEntityType` union with 23 new singular entity types; extend `ENTITY_LABELS` Record.
- **Option B:** Singular mapping in trigger via per-table trigger functions OR helper map; minimal union extension (only new singular entity types like `'approval_chain'`, `'document_extraction'` etc. — 23 entries).
- **Option C:** Plural everywhere — migrate 40+ call sites. NOT RECOMMENDED.

**Action discriminator:**
- (a) Add `'soft_deleted'` to `ActivityAction` union.
- (b) Use existing `'deleted'` action; discriminate via `details.actor_source`.

**Recommended:** Option A + (b). Singular mapping via CASE in trigger (clean encapsulation); extend `ActivityEntityType` with 23 new singular forms; use existing `'deleted'` action discriminated by `details.actor_source`.

### 6.4 W.1 listener unflag carry-forward (D-28)

**Question:** Defer W.1 to B-4 (PLAN recommendation) OR ship in B-3?

- **Option A (PLAN recommendation):** Defer to B-4. 7-day observation window on boundary; full 2-week window preferred.
- **Option B:** Ship in B-3. 7 days Sentry green over Slice-1 ship is acceptable signal.

**Recommended:** Option A (PLAN default). Conservative defer-to-B-4 keeps B-3 scope tight.

### 6.5 N-3 HALT GATE 1 "script-driven per-table test"

**Question:** Is AC-B3-01 (count = 32) + AC-B3-02 (representative jobs firing) + Task 3 smoke harness sufficient OR does Jake require an explicit DO-block looping over 32 tables soft-deleting + rolling back one fixture row each?

**Recommended:** Confirm at GATE B-3. If yes, add Task 6 (script-driven per-table verification) at ~$3-5 additional iter-2 cost.

---

## 7. Recommended iter-2 scope (if Option A authorized)

If Jake authorizes ceiling bump $50 → $75 for B-3 iter-2:

### Iter-2 PLAN revision (BLOCKING-1..4 + MF-1..8 + W-1..4)

**PLAN body edits (estimated 15-20 surgical changes):**

1. **§2.1 trigger function body** (BLOCKING-1, BLOCKING-2, BLOCKING-3, W-1, MF-8):
   - Add singular-entity-type CASE mapping (BLOCKING-1)
   - Change action to existing `'deleted'` (BLOCKING-2 option b)
   - Add `BEGIN ... EXCEPTION WHEN OTHERS THEN RAISE WARNING ... RETURN NEW; END;` wrapper (BLOCKING-3)
   - Restructure Tier-resolution logic for readability (W-1)
   - Add comment: service-role-only contract for app.current_user_id (MF-8)

2. **§2.3 DEF-WC-1 policy syntax** (MF-2 decision):
   - Match canonical direct-call form OR document SELECT-wrapped divergence

3. **§2.4 DEF-WC-3 table sketch** (MF-1, MF-3):
   - client_portal_access row: N/A on trigger, Pattern B
   - clients row: Pattern B (not A)
   - Add Wave-A-iter-1 audit comment for clients + client_portal_access as DEF-WC-1 candidates (Wave 1.1-Lite)

4. **§3 Task 1 verification + §4 AC-B3-08** (BLOCKING-4):
   - Replace proacl string-contains check with `aclexplode` + `grantee = 0` pattern (canonical 00103/00105)

5. **§4 AC-B3-02 + AC-B3-03 + AC-B3-06 + AC-B3-10** (MF-6):
   - Replace `<drummond_org_id>` with `<ross_built_org_id>` + `<drummond_job_id>` explicitly
   - Update comments to clarify Drummond is a job in Ross Built org

6. **§4 AC-B3-05** (MF-4):
   - Add explicit session-context setup for org_B authenticated probe

7. **§4 AC-B3-09 + Task 2 + `<criteria>` block** (MF-5):
   - Standardize row count to 36 data rows across 3 sites

8. **§1.4** (MF-7):
   - Correct trigger count to live values (27 BEFORE / 15 AFTER UPDATE)

9. **§3 Task 1 migration body** (W-3):
   - Add canonical comment on org_members_delete_strict rationale

10. **`files_modified` frontmatter** (BLOCKING-1, BLOCKING-2):
    - Add `src/lib/activity-log.ts` (extend ActivityEntityType union with 23 entries)
    - Add `src/lib/audit/action-labels.ts` (extend ENTITY_LABELS Record)

11. **§3 add Task 5 (CONDITIONAL on Option B from §6.4)** OR keep deferred (PLAN current state):
    - W.1 listener unflag — env-var addition

12. **§5 R-3** (MF-8):
    - Add service-role-only contract documentation for app.current_user_id

13. **§5 add R-8 undelete deferral note** (W-4):
    - "B-3 trigger ONLY fires on forward soft-delete; undelete deferred to Wave 1.1-Lite"

14. **Add migration comment in 00107.sql** (N-4):
    - "Trigger INSERT to activity_log relies on activity_log.relforcerowsecurity = false"

### Iter-2 reviewer dispatch scope (subset)

**Re-dispatch 4 reviewers** (not all 7) on the revised PLAN:
- security-reviewer — verify SEC-B3-03, SEC-B3-04, SEC-B3-08 closed
- database-reviewer — verify M-1, M-2 closed
- rls-auditor — verify MF-RLS-01, MF-RLS-02, MF-RLS-03, MF-RLS-04 closed
- ai-logic-tester — verify Finding 1, Finding 2, Finding 5, Finding 6 closed; re-run AC-B3-05 cross-org probe with corrected session context

**Skip iter-2 dispatch for** (no findings on these axes):
- spec-checker (findings were ALL in scope of the 4 above — AC count + falsifiability already passes)
- multi-tenant-architect (APPROVE; no BLOCKING / MUST-FIX from this lens)
- custodian (APPROVE; planning tree integrity intact)

**Iter-2 estimated cost:** $15-23.

---

## 8. Overall verdict + halt contract

### Verdict: **NEEDS-WORK**

- **4 BLOCKING findings** (must fix before /nx)
- **8 MUST-FIX findings** (must fix before /nx)
- **4 WARNING findings** (recommend fix)
- **5 NOTE findings** (acknowledge; deferred to Wave 1.1-Lite OR GATE confirmation)

**No Rule 9 cross-reviewer factual disagreement triggered.** All findings either align or are independent observations.

**Pre-design audit (per nwrp214 §7-13) STRONG** — surfaced 2 corrections + 1 design refinement BEFORE design phase. The B-2a lesson application succeeded.

### halt_after: true contract (per nwrp214 §23-25)

**HALTING per contract. Do NOT auto-proceed to iter-2 OR /nx.**

Surface to Jake:
1. **This SYNTHESIS** — `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/PLAN-REVIEW-B3-ITER1-SYNTHESIS.md` (this file)
2. **3 disk-persisted reviewer reports**:
   - `PLAN-REVIEW-B3-ITER1-SECURITY.md`
   - `PLAN-REVIEW-B3-ITER1-DATABASE.md`
   - `PLAN-REVIEW-B3-ITER1-CUSTODIAN.md`
3. **4 inline-returned reviewer outputs** (captured in §3 of this SYNTHESIS):
   - spec-checker — NEEDS-WORK (2 HIGH + 3 NOTE findings)
   - multi-tenant-architect — APPROVE with 5 WARNINGs + 2 NTH
   - rls-auditor — NEEDS-WORK (4 MUST-FIX findings)
   - ai-logic-tester — NEEDS-WORK (3 BLOCKING + 4 WARNING + 3 NOTE)
4. **Slice-2 ledger surface** (§5 above)
5. **5 decision points** (§6 above)

### Jake review questions (for GATE B-3 substantive review)

1. **Per-plan halt gate $50 exceeded** — authorize Option A (ceiling bump $50 → $75 for iter-2) OR Option B (halt-for-fresh-session) OR Option C (scope-restricted iter-2)?
2. **DEF-WC-1 SELECT-wrapped vs canonical direct-call** — Option A (canonical) OR Option B (Q10b improvement)?
3. **Entity_type singular mapping + action discriminator** — Option A (CASE mapping in trigger) + (b) (use existing `'deleted'`)?
4. **W.1 listener unflag** — Option A (defer to B-4 per PLAN) OR Option B (ship in B-3)?
5. **HALT GATE 1 "script-driven per-table test"** — Is AC-B3-01 + AC-B3-02 + Task 3 smoke sufficient OR add Task 6 (per-table DO-block)?

**Do NOT auto-proceed.** Tier-1 halt per nwrp214 §25.

---

**End of PLAN-REVIEW-B3-ITER1-SYNTHESIS.md.**
