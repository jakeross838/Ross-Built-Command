---
phase: stage-f1-knowledge-graph-auth-wave-b-slice-2
plan: B-4
plan-name: activity-log-verification-write-site-sweep-carry-forward-cleanup
type: execute
threat_model_severity: low
halt_after: true
requires_smoke: true
autonomous: true
status: GATE B-4 SIGNED per nwrp222 §7 — PENDING /nx EXECUTE (Task 3 + AC-B4-07 clarifications applied inline per nwrp221 + nwrp222)
depends_on:
  - B-2a   # SHIPPED 2026-05-21 per nwrp209 (added client_portal_access entity_type)
  - B-2b   # SHIPPED 2026-05-22 per nwrp213 (added 'acknowledged' action)
  - B-3    # SHIPPED 2026-05-22 per nwrp219 (added 23 singular entity_types for 32-table trigger coverage)
sequence:
  before: B-5
  parallel_execute_ok: false
acceptance-criteria-target: 12 falsifiable ACs (10 sub-tasks + 2 verification tasks)
qa_reviewers:
  - spec-checker
  - custodian
  - database-reviewer    # Migration 00108 trgm index + Task 5 race-catch pattern
  - ai-logic-tester      # entity_type exhaustiveness verification + validator domain (Tasks 8-10)
  - security-reviewer    # NARROW — Task 4 ONLY per nwrp220 §8 (MEDIUM-1 cross-tenant fix focused review)
  # DROPPED per nwrp220 §6 lean Tier-2: multi-tenant-architect, rls-auditor, design-pushback, data-migration-safety
source_decisions:
  - "EXPANDED-SCOPE §7 plan #3 (lines 335-346) — B-4 canonical scope with 10 sub-tasks"
  - "EXPANDED-SCOPE §11 lines 419-420 (B-4 entity_type + MEDIUM-1 ACs)"
  - "EXPANDED-SCOPE §11 lines 430-432 (B-4 TD-B1abis-01 + TD-B1abis-02 + W.1 ACs)"
  - "nwrp166 §10-11 (Slice-1 carry-forward distribute pattern: TD-B1abis-01/02 → B-4, MEDIUM-1 → B-4, W.1 → B-3 OR B-4)"
  - "nwrp172 (B-1b QA HIGH-findings bundle disposition: F-J + F-K + F-D + F-A → B-4 carry-forwards 5-7)"
  - "nwrp200/202 (Slice-2 re-split + EXPANDED-SCOPE RE-APPROVE)"
  - "nwrp219 §11 (Slice-2 ceiling $300 → $400; per-plan $50 halt gate stays; B-4 tightened Tier-2 rigor)"
  - "nwrp220 — B-4 DISPATCH lean Tier-2: 4-reviewer scope + focused security-reviewer on Task 4 + ONE iter cycle target + NO pre-design landmine audit (additive cleanup, not security)"
  - "CLAUDE.md Workflow posture Rules 1-9 — Rule 7d per-plan halt gate; Rule 8(a) hook fail-closed (now relaxed for execute-phase via TD-NW-HOOK-EXECUTE-PHASE-DETECT closure 6c8085b)"
files_modified:
  - src/app/api/jobs/route.ts                                                 # Task 4 (.eq org_id) + Task 5 (23505 race-catch)
  - src/lib/knowledge-graph/validators/wi-013-multi-job-allocation.ts          # Task 8 F-J NaN guard + Task 9 F-D rationale comment
  - src/lib/knowledge-graph/validators/wi-001-inline-budget-context.ts         # Task 8 F-K NaN guard
  - src/lib/knowledge-graph/validators/client-pii-not-embedded.ts              # Task 10 F-A regex i flag
  - supabase/migrations/00108_b4_clients_full_name_trgm_index.sql              # Task 6 (NEW)
  - supabase/migrations/00108_b4_clients_full_name_trgm_index.down.sql         # Task 6 (NEW)
  - src/lib/types/database.types.ts                                            # REGEN per migration 00108
  - __tests__/validators/wi-013.test.ts                                        # Task 8 F-J unit tests
  - __tests__/validators/wi-001.test.ts                                        # Task 8 F-K unit tests
  - __tests__/validators/client-pii-not-embedded.test.ts                       # Task 10 F-A unit tests
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-4-SUMMARY.md  # NEW
  - .planning/MASTER-PLAN.md                                                   # §12 Slice-2 progress 3→4; §11 TD closures
files_referenced:
  - .planning/expansions/stage-f1-knowledge-graph-auth-wave-b-slice-2-EXPANDED-SCOPE.md
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-4-CONTEXT.md
  - .planning/qa-runs/2026-05-18-1230-wave-b-b1b-qa-report.md   # F-* finding source
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-3-SUMMARY.md
  - src/lib/activity-log.ts                                                    # ActivityEntityType union (verification target)
  - src/lib/audit/action-labels.ts                                             # ENTITY_LABELS Record (verification target)
  - CLAUDE.md
---

<criteria>
mechanical:
  - "supabase/migrations/00108_b4_clients_full_name_trgm_index.sql exists + applies via mcp__supabase__apply_migration"
  - "supabase/migrations/00108_b4_clients_full_name_trgm_index.down.sql exists + symmetric"
  - "src/lib/types/database.types.ts regenerated post-migration; `npx tsc --noEmit` passes"
  - "Production build (`npm run build`) succeeds"
  - "Existing test suite (`npm test`) passes (no new regressions beyond pre-existing deferred-items.md lien-releases/bulk + org_members.maybeSingle baseline)"
  - "ALL B-4 execute commits use Execute-Phase: B-4-Task-<N> footer (no --no-verify needed; hook fix 6c8085b live)"
dom:
  - N/A (B-4 has no UI surface)
visual:
  - N/A (B-4 has no UI surface)
behavioral:
  - "Task 4 MEDIUM-1 fix: authenticated org_B user attempting PATCH /api/jobs with org_A job_id body returns non-200 OR 0 rows updated; LIVE probe in test suite"
  - "Task 5 race-catch: two concurrent identical-name find-or-create returns 200 + same client_id for both (not 500 on second)"
  - "Task 6 trgm index: EXPLAIN ANALYZE on `/api/clients?search=` representative query shows GIN index usage"
  - "Task 7 W.1 unflag: post-env-add, Sentry shows no auth-state-change error rate spike during 7 days observation"
  - "Tasks 8-10: validator unit tests pass + new test cases cover NaN/Infinity/case-sensitive inputs"
semantic:
  - "Task 1+2 verification: ActivityEntityType union + ENTITY_LABELS Record exhaustiveness preserved post-B-3; no drift; npx tsc --noEmit clean"
  - "Task 3 write-site coverage: grep verification of `logActivity` calls in CREATE/UPDATE/state-change routes for lien_releases + proposals + client_portal_access + clients; per-route coverage table in SUMMARY"
  - "Task 9 F-D rationale comment present + matches RLS-by-design diagnostic rationale"
</criteria>

# B-4 — Activity-log union/Record verification + write-site sweep + 8 carry-forwards

**Plan ID:** B-4
**Threat model:** LOW (per CONTEXT D-30 + EXPANDED-SCOPE §7 plan #3 line 346)
**halt_after:** true (Tier 2 GATE per nwrp220 §26 — lighter than B-2a/B-3 security GATEs)
**Per-plan halt gate:** $50 (Rule 7d default; nwrp220 §22)

## §0. Source decisions + Slice-2 ledger surface

### Authorization chain
- **EXPANDED-SCOPE RE-APPROVED** 2026-05-21 per nwrp202 §5
- **B-2a SHIPPED** 2026-05-21 per nwrp209 (added `client_portal_access` to ActivityEntityType)
- **B-2b SHIPPED** 2026-05-22 per nwrp213 (added `acknowledged` to ActivityAction)
- **B-3 SHIPPED** 2026-05-22 per nwrp219 (added 23 singular entity_types for 32-table trigger coverage; ENTITY_LABELS Record extended)
- **Hook chore SHIPPED** 2026-05-26 via `6c8085b` (TD-NW-HOOK-EXECUTE-PHASE-DETECT closed; B-4 execute uses Execute-Phase footer)
- **B-4 DISPATCH** 2026-05-26 per nwrp220 — lean Tier-2 rigor
- **CONTEXT.md** authored 2026-05-26 with 45 D-NN decisions consolidating EXPANDED-SCOPE + nwrp220 + survey findings

### Slice-2 cost ledger (per nwrp219 §11 ceiling $400)

| Plan | Spend | Status |
|------|-------|--------|
| B-2 iter-1 (superseded) | ~$15-20 | NEEDS-WORK; led to B-2a + B-2b split |
| **B-2a** | ~$77-98 | SHIPPED |
| **B-2b** | ~$24-28 | SHIPPED |
| **B-3** (iter-1 + iter-2 + execute + QA + ship) | ~$91-140 | SHIPPED |
| **Hook chore (TD-NW-HOOK-EXECUTE-PHASE-DETECT)** | ~$5-7 | SHIPPED |
| **B-4 entry budget** | $15-25 (lean Tier-2; per-plan $50 gate) | This plan |
| **Slice-2 consumed pre-B-4** | ~$212-293 | of $400 ceiling (post-nwrp219 bump) |
| **Remaining for B-4..B-7** | ~$107-188 | B-4 est $15-25; B-5 fuller HIGH; B-6+B-7 lean |

### Forward-carried gate conditions
- **TD-B3-FIXTURE-COVERAGE-32-TABLE** — Wave 1.1-Lite (pre-Diane-onboarding); NOT a B-4 deliverable
- **TD-NW-APP-PRIVATE-DEFAULT-ACL-HARDEN** — Wave 1.1-Lite (B-4 + B-5 individual REVOKEs tolerable interim per the per-function pattern; no B-4 SECURITY DEFINER functions)
- No active forward-carry INTO B-4

---

## §1. Pre-flight survey findings (lean — NO pre-design landmine audit per nwrp220 §8)

Per nwrp220 §8: "B-4's tasks are additive cleanup. (Exception: Task 4 MEDIUM-1 PATCH /api/jobs org_id filter fix IS a tenancy-adjacent fix — give that ONE task a focused security-reviewer look, not the whole plan.)"

Survey scope: confirm sub-task surfaces exist at expected locations + identify any "already done" deliverables.

### §1.1 ActivityEntityType union state (Task 1)

**Verified at `src/lib/activity-log.ts:33-82` line-by-line:**

Union members post-B-3:
```
invoice, invoice_import_batch, purchase_order, change_order, budget_line,
job, vendor, cost_code, draw, user, client, client_portal_access,
approval_chain, change_order_line, document_extraction_line, document_extraction,
draw_adjustment_line_item, draw_adjustment, draw_line_item, internal_billing,
invoice_allocation, invoice_line_item, item, job_item_activity, job_milestone,
lien_release, line_bom_attachment, line_cost_component, po_line_item,
proposal_line_item, proposal, selection_category, selection,
unit_conversion_suggestion, vendor_item_pricing
```

**35 members total.** EXPANDED-SCOPE §7 plan #3 first bullet asks for:
- Add `lien_releases` → **already present as singular `lien_release`** (B-3)
- Add `proposals` → **already present as singular `proposal`** (B-3)
- Add `client_portal_access` → **already present** (B-2a)
- Remove `budget` → **already removed** (Wave-A PR A-3 per inline comment lines 38-43)

**Finding:** Task 1 deliverable = verification only. No source changes needed. Document in commit body + SUMMARY: "Union completeness verified post-B-3; no changes required; the EXPANDED-SCOPE bullet was authored pre-B-3 ship + is now satisfied by predecessor work."

### §1.2 ENTITY_LABELS Record state (Task 2)

**Verified at `src/lib/audit/action-labels.ts:30-89` line-by-line:** Record has 35 entries matching union 1:1 (Record exhaustiveness preserved by TypeScript compile).

**Finding:** Task 2 deliverable = verification only (same shape as Task 1). `npx tsc --noEmit` clean is the falsifiable check.

### §1.3 ACTION_LABELS Record state (incidental check)

**Verified at `src/lib/audit/action-labels.ts:~75-95`:** Includes `revoked` (B-2a addition) + `acknowledged` (B-2b addition) + existing actions (created/updated/status_changed/deleted/etc.). No B-4 changes needed.

### §1.4 MEDIUM-1 surface (Task 4)

**Verified at `src/app/api/jobs/route.ts` line ~373:** UPDATE statement chain:
```typescript
const { error } = await supabase
  .from("jobs")
  .update(patch)
  .eq("id", body.id)
  .is("deleted_at", null);
```

**Finding:** Missing `.eq("org_id", membership.org_id)` filter. Single-line fix. Tenant isolation upheld via RLS at DB layer; application-layer defense-in-depth missing (pre-existing per B-1a-bis QA cross-reviewer agreement).

### §1.5 resolveClientId race surface (Task 5)

**Verified at `src/app/api/jobs/route.ts:~67-78`:** INSERT-then-throw pattern:
```typescript
const { data: newClient, error: insertError } = await supabase
  .from("clients")
  .insert({ org_id: membership.org_id, full_name: typedName, created_by: membership.user_id, })
  .select("id, full_name")
  .single();
if (insertError) {
  throw new ApiError(`Failed to create client: ${insertError.message}`, 500);
}
```

**Finding:** No 23505 catch. Race condition: two concurrent identical-name requests both miss the prior ilike find, both INSERT, second hits partial unique index `idx_clients_org_name_email_unique`, throws 500.

### §1.6 TD-B1abis-02 trgm index state (Task 6)

**Verified via grep:** No existing `idx_clients_full_name_trgm` migration. `pg_trgm` extension is active (per migrations 00052 + 00073 using `gin_trgm_ops`). Migration 00108 ships the index cleanly.

### §1.7 W.1 listener observation window (Task 7)

**Verified:** `NEXT_PUBLIC_AUTH_STATE_LISTENER` env-flag gate present at `src/hooks/use-current-role.ts`. Observation window status:
- B-1b shipped: **2026-05-18**
- Today: **2026-05-26**
- Days elapsed: **8 days** (past 1-week minimum per EXPANDED-SCOPE §11 line 432 "1-2 weeks")
- B-2a/B-2b/B-3 chain shipped through window: smoke baseline 11/13 preserved (B-3 ship confirmed)
- No auth-state-change incidents in QA reports

**Finding:** Window status qualifies for unflag. Recommend Task 7 ships in B-4 per nwrp220 §17 directive.

### §1.8 B-1b QA F-* finding locations (Tasks 8-10)

**Verified in `.planning/qa-runs/2026-05-18-1230-wave-b-b1b-qa-report.md`:**
- F-J: `src/lib/knowledge-graph/validators/wi-013-multi-job-allocation.ts:49-54` (NaN guard on `allocation.amount`)
- F-K: `src/lib/knowledge-graph/validators/wi-001-inline-budget-context.ts:101-105` (NaN guard on `invoice.total_amount`)
- F-D: `src/lib/knowledge-graph/validators/wi-013-multi-job-allocation.ts:68-72` (jobs lookup rationale comment)
- F-A: `src/lib/knowledge-graph/validators/client-pii-not-embedded.ts:40-46` (4 patterns: WILDCARD_PATTERN, ALIAS_WILDCARD, EMAIL_PATTERN, PHONE_PATTERN; case-sensitivity fix)

**Test files exist** at `__tests__/validators/{wi-001,wi-013,client-pii-not-embedded}.test.ts` (6+7+10 cases respectively). Task 8+10 extend these.

### §1.9 Survey summary

| # | Surface | Finding | Task disposition |
|---|---------|---------|------------------|
| 1 | ActivityEntityType union | Already complete post-B-3 | Task 1 = verification-only |
| 2 | ENTITY_LABELS Record | Already complete post-B-3 | Task 2 = verification-only |
| 3 | Write-site coverage | Partial confirmation (lien-releases ✓; proposals + client_portal_access NEEDS VERIFICATION) | Task 3 = grep sweep + fill gaps if found |
| 4 | MEDIUM-1 PATCH /api/jobs | Confirmed missing `.eq("org_id")` | Task 4 = single-line fix + focused security-reviewer |
| 5 | resolveClientId race | Confirmed no 23505 catch | Task 5 = catch + re-find |
| 6 | trgm index | Not yet shipped | Task 6 = migration 00108 |
| 7 | W.1 env-flag | Observation window past 1-week minimum | Task 7 = unflag via vercel env add |
| 8-10 | Validator F-* | All 4 locations verified | Tasks 8-10 = file edits + unit tests |

NO blockers surfaced. B-4 is straightforward additive cleanup as designed.

---

## §2. Design

### §2.1 Task 1+2 verification approach

Read-only check + commit-body documentation:
1. Run `npx tsc --noEmit` — confirm clean (Record exhaustiveness preserved by compile)
2. Visual verify ActivityEntityType union vs B-3 CASE mapping target list (32 trigger-target tables in singular form + 3 extras = 35; matches §1.1 enumeration)
3. Record in B-4-SUMMARY.md §Task-1+2: "VERIFIED — no source changes required; predecessor work (B-2a + B-2b + B-3 + Wave-A PR A-3) satisfied the EXPANDED-SCOPE §7 plan #3 first bullet."

NO source file edits for Tasks 1+2. NO ACs that require code changes.

### §2.2 Task 3 write-site sweep

**Method (gap-FILL not gap-FIND per nwrp221 §5-6 + nwrp222 §3):**

1. **CLOSE 4 confirmed proposal-route gaps** (spec-checker live grep at iter-1; nwrp221 §5):
   - `src/app/api/proposals/[id]/commit/route.ts` — POST handler — `entity_type='proposal'`, action=`'committed'` (or `'approved'` if the existing ActivityAction union semantics map better)
   - `src/app/api/proposals/[id]/extract/route.ts` — POST handler — `entity_type='proposal'`, action=`'updated'` (extraction is an update to proposal state with extracted lines/cost-codes)
   - `src/app/api/proposals/[id]/extract/reject/route.ts` — POST handler — `entity_type='proposal'`, action=`'denied'` (reject = denial of an extraction attempt)
   - `src/app/api/proposals/[id]/convert-to-po/route.ts` — POST handler — `entity_type='proposal'`, action=`'status_changed'` (with `details.to='converted_to_po'` and the resulting `purchase_order` referenced in details)
2. **Sweep additional routes** for any other gaps in target set: `src/app/api/{lien-releases,proposals,owner-portal,clients}/**/route.ts`
3. For each found gap: add `logActivity` call inline as part of Task 3
4. Output: per-route coverage table in B-4-SUMMARY.md + integration-test or live-DB-probe verification per route

**Per-route disposition matrix** (executor populates at execute time):

| Route | Handler | Pre-B-4 logActivity? | Post-B-4 logActivity? | entity_type | action | Disposition |
|-------|---------|----------------------|----------------------|-------------|--------|-------------|
| `src/app/api/lien-releases/[id]/route.ts` | POST/PATCH | YES (line 117) | YES (unchanged) | `lien_release` | various | UNCHANGED |
| `src/app/api/lien-releases/[id]/upload/route.ts` | POST | YES (line 136) | YES (unchanged) | `lien_release` | upload-adjacent | UNCHANGED |
| `src/app/api/lien-releases/bulk/route.ts` | POST | YES (line 119) | YES (unchanged) | `lien_release` | bulk action | UNCHANGED |
| **`src/app/api/proposals/[id]/commit/route.ts`** | POST | NO | **WIRED (Task 3)** | `proposal` | `committed` (or canonical equivalent from union) | **FILLED** |
| **`src/app/api/proposals/[id]/extract/route.ts`** | POST | NO | **WIRED (Task 3)** | `proposal` | `updated` (extraction is state update) | **FILLED** |
| **`src/app/api/proposals/[id]/extract/reject/route.ts`** | POST | NO | **WIRED (Task 3)** | `proposal` | `denied` | **FILLED** |
| **`src/app/api/proposals/[id]/convert-to-po/route.ts`** | POST | NO | **WIRED (Task 3)** | `proposal` | `status_changed` | **FILLED** |
| `src/app/api/owner-portal/admin/revoke-token/route.ts` | POST | YES (B-2a) | YES (unchanged) | `client_portal_access` | `revoked` | VERIFIED-UNCHANGED |
| `src/app/api/clients/*` | POST/PATCH | (verify at execute) | (verify at execute) | `client` | varies | SWEEP |

**Action-mapping rationale:** The 4 proposal-route actions (`committed`, `updated`, `denied`, `status_changed`) are all members of existing `ActivityAction` union (`src/lib/activity-log.ts:84-105`); NO new actions needed. If executor finds a semantic mismatch (e.g., `committed` doesn't exist + `approved` is more apt), use the canonical action from the union + document mapping in the route's logActivity call rationale comment.

### Task 3 falsifiability — 3-layer verification per nwrp221 §6 + nwrp222 §3

| Layer | What | Falsifiability |
|-------|------|----------------|
| **(a) Grep evidence** | `grep -rn "logActivity" src/app/api/proposals/` — each of the 4 named proposal routes MUST appear in output (was 0 hits pre-B-4) | If any of the 4 routes still shows 0 `logActivity` matches → AC FAIL |
| **(b) Per-route disposition table** in B-4-SUMMARY.md §Task-3 | Per row: route path + handler verb + entity_type + action + line number of `logActivity` call | If table missing any of 4 named rows OR row has `MISSING` disposition → AC FAIL |
| **(c) Live emit verification** (integration test OR `mcp__supabase__execute_sql` live-DB probe post-handler invocation) | For each of 4 routes: invoke handler against fixture data; assert exactly 1 new `activity_log` row with matching `entity_type='proposal'` + appropriate action + correct `entity_id` (= the proposal id) | If any route doesn't actually emit at runtime → AC FAIL |

**Halt-check on scope expansion:** If the broader sweep (step 2 above) surfaces >2 additional gaps beyond the 4 proposal-route fills (i.e., total >6 fills required), executor halt-and-surface per Rule 7d $50 per-plan gate. Each fill is ~3-5 lines; ~6 fills × 4 = 24 lines stays well within lean estimate; >6 fills would expand scope.

### §2.3 Task 4 MEDIUM-1 fix

```diff
const { error } = await supabase
  .from("jobs")
  .update(patch)
  .eq("id", body.id)
+ .eq("org_id", membership.org_id)
  .is("deleted_at", null);
```

**Focused security-reviewer scope (per nwrp220 §8):** review THIS change ONLY (not full plan):
1. Confirm `.eq("org_id", membership.org_id)` is added correctly (not `org_id` from body or other source)
2. Confirm `membership.org_id` is the canonical org-scope source (matches `getCurrentMembership()` pattern elsewhere)
3. Verify cross-tenant probe AC (org_B PATCH on org_A row returns non-200 OR 0 rows)

### §2.4 Task 5 race-catch

```diff
const { data: newClient, error: insertError } = await supabase
  .from("clients")
  .insert({ org_id: membership.org_id, full_name: typedName, created_by: membership.user_id })
  .select("id, full_name")
  .single();
- if (insertError) {
-   throw new ApiError(`Failed to create client: ${insertError.message}`, 500);
- }
+ if (insertError) {
+   // TD-B1abis-01 race-catch: another concurrent insert won the partial unique
+   // index race; re-run the find branch and return the resolved id.
+   if (insertError.code === '23505') {
+     const { data: raceWinner } = await supabase
+       .from("clients")
+       .select("id")
+       .eq("org_id", membership.org_id)
+       .ilike("full_name", typedName)
+       .is("deleted_at", null)
+       .limit(1)
+       .maybeSingle();
+     if (raceWinner) return raceWinner.id as string;
+   }
+   throw new ApiError(`Failed to create client: ${insertError.message}`, 500);
+ }
```

Integration test (1-2 cases): concurrent identical-name requests; second hits 23505 path; both return same client_id; UX surface returns 200 not 500.

### §2.5 Task 6 trgm index migration 00108

```sql
-- supabase/migrations/00108_b4_clients_full_name_trgm_index.sql

-- TD-B1abis-02: GIN trigram index on clients.full_name for autocomplete perf.
-- The /api/clients?search=<query> endpoint uses ILIKE '%query%' — leading wildcard
-- bypasses the existing btree partial idx_clients_full_name_lower. At scale (500+
-- clients/org realistic within 2-3 years), per-keystroke tenant-shard scan becomes
-- a UX bottleneck. pg_trgm extension active (per 00052 + 00073).

CREATE INDEX IF NOT EXISTS idx_clients_full_name_trgm
  ON public.clients USING gin (full_name gin_trgm_ops)
  WHERE deleted_at IS NULL;
```

Down migration: `DROP INDEX IF EXISTS public.idx_clients_full_name_trgm;`

**Inline verification (within transaction):**
- M-01: index exists → `SELECT indexname FROM pg_indexes WHERE indexname = 'idx_clients_full_name_trgm';` returns 1 row
- M-02: index type correct → `SELECT pg_get_indexdef(c.oid) FROM pg_class c WHERE c.relname = 'idx_clients_full_name_trgm';` contains `gin_trgm_ops`
- M-03: EXPLAIN ANALYZE on representative `/api/clients?search=<query>` query — shows GIN/Bitmap Heap Scan with trgm index

### §2.6 Task 7 W.1 listener unflag

**Per nwrp220 §17 + EXPANDED-SCOPE §11 line 432:** Observation window status confirms unflag-eligible.

Deliverable:
```bash
vercel env add NEXT_PUBLIC_AUTH_STATE_LISTENER production
# (paste value: true)
vercel env add NEXT_PUBLIC_AUTH_STATE_LISTENER preview
# (paste value: true)
vercel --prod    # trigger redeploy
```

NOT a code change. Verification gate (7-day Sentry observation):
- Sentry shows no auth-state-change error rate spike during 7 days post-unflag
- Smoke baseline remains 11/13 (or improves)
- No user-facing regression reports

Rollback (if regression surfaces):
```bash
vercel env rm NEXT_PUBLIC_AUTH_STATE_LISTENER production
vercel env rm NEXT_PUBLIC_AUTH_STATE_LISTENER preview
vercel --prod
```

### §2.7 Tasks 8-10 validator fixes

**Task 8 — F-J + F-K NaN guards (CORRECTED per iter-1 ai-logic-tester MUST-FIX #1+#2):**

Both validators use `.reduce()` aggregation (NOT loop iteration), so the `continue` keyword does NOT fit. The correct fix shape is a **pre-pass NaN check BEFORE the reduce**, which pushes violation(s) + skips/excludes NaN allocations from the sum (or short-circuits the validator with ok:false).

WI-013 (`wi-013-multi-job-allocation.ts` around the `.reduce()` at line 52-55):

```typescript
// BEFORE the .reduce() at line ~52 (pre-pass NaN check):
const nanAllocations = input.allocations.filter((a) => !Number.isFinite(a.amount));
for (const a of nanAllocations) {
  violations.push({
    code: 'wi-013-allocation-amount-not-finite',
    message: `Allocation amount is not finite (got: ${a.amount}) — input source likely produced NaN/Infinity which silently bypasses sum-drift check.`,
    evidence: { allocation_id: a.id ?? null, amount: a.amount, job_id: a.job_id },
  });
}

// Then the existing .reduce() filters out NaN to prevent total-poisoning:
const sum = input.allocations
  .filter((a) => Number.isFinite(a.amount))
  .reduce((acc, a) => acc + a.amount, 0);
// Continue with existing drift check on sum vs invoice_total_amount.
```

WI-001 (`wi-001-inline-budget-context.ts` around line 101-105):

```typescript
// BEFORE the priorTotal computation (pre-pass NaN check):
if (!Number.isFinite(invoice.total_amount)) {
  violations.push({
    code: 'wi-001-invoice-amount-not-finite',
    message: `Invoice total_amount is not finite (got: ${invoice.total_amount}) — silently bypasses overage check.`,
    evidence: { invoice_id: invoice.id ?? null, total_amount: invoice.total_amount },
  });
  return { ok: false, violations };
}

// Also guard the approvedInvoices reduce against NaN poisoning:
const priorTotal = (approvedInvoices ?? [])
  .filter((row) => Number.isFinite(row.total_amount))
  .reduce((acc, row) => acc + row.total_amount, 0);
```

**Verification (unit test):** Each validator gets 1-2 cases — NaN input case + Infinity input case — confirming the new violation code is emitted AND that the downstream checks (sum-drift / budget-overage) are NOT silently bypassed.

**Original PLAN diff shape used `continue` keyword + line range 49-54 / 101-105.** That shape implied loop iteration but the actual code uses `.reduce()` — surfaced by ai-logic-tester iter-1 MUST-FIX #1+#2. Corrected to pre-pass-NaN-filter pattern that fits the existing `.reduce()` control flow.

**Task 9 — F-D rationale comment:**

```typescript
// At wi-013-multi-job-allocation.ts:68-72 (the jobs lookup):
// INTENTIONAL: this lookup omits .eq("org_id", ctx.org_id) for diagnostic
// clarity. The validator must SEE foreign-org rows to emit
// `wi-013-allocation-cross-tenant` with diagnostic detail. If filtered by
// org_id at query time, cross-tenant rows return null → validator emits
// `job-not-found` instead (less diagnostic; same safety profile under RLS).
// Outcome-safe because callers are RLS-bound at the API layer; this validator
// runs in admin-context where seeing cross-tenant is the desired behavior.
// Per nwrp172 GATE 2 disposition + B-1b QA F-D finding.
const { data: job } = await supabase
  .from("jobs")
  .select("id, org_id")
  .eq("id", alloc.job_id)
  .maybeSingle();
```

**Task 10 — F-A regex case-insensitivity (CORRECTED per iter-1 ai-logic-tester BLOCKING):**

The actual patterns at `client-pii-not-embedded.ts:40-46` use the `/g` flag (required by downstream `.matchAll()` calls; without `g` flag, `String.prototype.matchAll` THROWS `TypeError: String.prototype.matchAll called with a non-global RegExp argument`) and `\b` word-boundary anchors. The fix is to **append `i` to `g` (→ `gi`)** — preserving both `g` and `\b`. NOT replace `g` with `i`.

Actual current patterns (verified at `src/lib/knowledge-graph/validators/client-pii-not-embedded.ts:40-46`):

```typescript
const WILDCARD_PATTERN = /\bclients?\s*\(\s*\*\s*\)/g;
const ALIAS_WILDCARD = /:\s*clients?\s*\(\s*\*\s*\)/g;
const EMAIL_PATTERN = /\bclients?\s*\([^)]*\bemail\b[^)]*\)/g;
const PHONE_PATTERN = /\bclients?\s*\([^)]*\bphone\b[^)]*\)/g;
```

Correct fix diff (append `i` flag; preserve `g` flag + `\b` anchor + ALIAS_WILDCARD's `:` prefix shape):

```diff
- const WILDCARD_PATTERN = /\bclients?\s*\(\s*\*\s*\)/g;
+ const WILDCARD_PATTERN = /\bclients?\s*\(\s*\*\s*\)/gi;
- const ALIAS_WILDCARD = /:\s*clients?\s*\(\s*\*\s*\)/g;
+ const ALIAS_WILDCARD = /:\s*clients?\s*\(\s*\*\s*\)/gi;
- const EMAIL_PATTERN = /\bclients?\s*\([^)]*\bemail\b[^)]*\)/g;
+ const EMAIL_PATTERN = /\bclients?\s*\([^)]*\bemail\b[^)]*\)/gi;
- const PHONE_PATTERN = /\bclients?\s*\([^)]*\bphone\b[^)]*\)/g;
+ const PHONE_PATTERN = /\bclients?\s*\([^)]*\bphone\b[^)]*\)/gi;
```

Each fix is exactly +1 character (`g` → `gi`). Total 4 characters across 4 patterns. `\b` word-boundary anchor preserved (catches `\bclients?\(` against `subclients(`; without `\b`, false positives slip).

**Failure mode if applied literally as the original PLAN diff (stripping `g` flag):** Runtime crash on `.matchAll()` call at line 62-64 + 83. Validator unusable. Verified by ai-logic-tester via Node REPL.

Unit tests (added to existing `__tests__/validators/client-pii-not-embedded.test.ts`):
- 1 test: `CLIENTS(*)` (uppercase) — should match WILDCARD_PATTERN after `i` flag
- 1 test: `Clients(email)` (mixed-case) — should match EMAIL_PATTERN after `i` flag

---

## §3. Tasks (atomic commit sequence)

Each commit MUST include `Execute-Phase: B-4-Task-<N>` footer (per CONTEXT D-34 + nwrp220 §1 + hook fix `6c8085b`). NO `--no-verify` needed.

### Task 1 — Verify ActivityEntityType union completeness (no source changes)

**Subject:** `chore(stage-f1-wave-b-slice-2): B-4 Task 1 — verify ActivityEntityType union completeness post-B-3`

**Scope:**
- Read `src/lib/activity-log.ts:33-82`; confirm 35-member union covers all 32 trigger-target singular types + invoice_import_batch + client + client_portal_access
- Run `npx tsc --noEmit`; confirm clean
- Document verification in commit body

**Files modified:** NONE (verification commit)

**Commit body cites:** CONTEXT D-01 + §1.1 survey + B-3 ship reference (entity_type singular CASE mapping established).

### Task 2 — Verify ENTITY_LABELS Record exhaustiveness (no source changes)

**Subject:** `chore(stage-f1-wave-b-slice-2): B-4 Task 2 — verify ENTITY_LABELS Record exhaustiveness post-B-3`

**Scope:**
- Read `src/lib/audit/action-labels.ts:30-89`; confirm 35 entries match union 1:1
- TypeScript compile is the exhaustiveness check (Task 1 typecheck output covers Task 2)
- Document in commit body

**Files modified:** NONE (verification commit)

### Task 3 — Write-site coverage sweep (verification + inline fills)

**Subject:** `chore(stage-f1-wave-b-slice-2): B-4 Task 3 — logActivity write-site coverage sweep`

**Scope:**
- Grep `logActivity` across `src/app/api/{lien-releases,proposals,owner-portal,clients}/**/route.ts`
- For each route file, populate per-route disposition table
- If gap found: add `logActivity` call inline (estimated 0-3 gaps)
- Record verbatim grep output + per-route table in SUMMARY

**Files modified:** Variable (0-3 route files if gaps found; or none if all covered)

**Commit body cites:** CONTEXT D-12..D-14 + §2.2 sweep methodology + per-route findings.

### Task 4 — MEDIUM-1 PATCH /api/jobs `.eq("org_id", ...)` fix

**Subject:** `fix(stage-f1-wave-b-slice-2): B-4 Task 4 — MEDIUM-1 PATCH /api/jobs add org_id filter`

**Scope:**
- Edit `src/app/api/jobs/route.ts` UPDATE chain at ~line 373: add `.eq("org_id", membership.org_id)` (single line)
- Add integration test (or test stub if test infrastructure permits) for cross-tenant PATCH probe
- Verify: org_B authenticated PATCH on org_A job_id returns non-200 OR 0 rows

**Files modified:**
- `src/app/api/jobs/route.ts` (1 line edit)
- `__tests__/api-jobs.test.ts` (FLAT naming per database-reviewer iter-1 MUST-FIX: existing test infrastructure uses `__tests__/api-*.test.ts` flat convention, NOT `__tests__/api/*.test.ts` subdirectory) (NEW or UPDATE — 1 test case)

**Commit body cites:** CONTEXT D-15..D-17 + §2.3 fix design + B-1a-bis QA cross-reviewer agreement source + focused security-reviewer scope per nwrp220 §8.

### Task 5 — TD-B1abis-01 resolveClientId race-catch via 23505

**Subject:** `fix(stage-f1-wave-b-slice-2): B-4 Task 5 — TD-B1abis-01 resolveClientId race-catch 23505`

**Scope:**
- Edit `src/app/api/jobs/route.ts:~67-78`: wrap insertError check with 23505 branch + re-find logic
- Add integration test: 2 concurrent identical-name find-or-create requests; both return same client_id; UX 200 not 500

**Files modified:**
- `src/app/api/jobs/route.ts` (~8 line edit)
- `__tests__/api-jobs.test.ts` (FLAT naming per database-reviewer iter-1 MUST-FIX: existing test infrastructure uses `__tests__/api-*.test.ts` flat convention, NOT `__tests__/api/*.test.ts` subdirectory) (UPDATE — 1 test case)

**Commit body cites:** CONTEXT D-18..D-19 + §2.4 race-catch design + TD-B1abis-01 source.

### Task 6 — TD-B1abis-02 trgm index migration 00108

**Subject:** `feat(stage-f1-wave-b-slice-2): B-4 Task 6 — TD-B1abis-02 idx_clients_full_name_trgm migration 00108`

**Scope:**
- Create `supabase/migrations/00108_b4_clients_full_name_trgm_index.sql` (per §2.5 body)
- Create `supabase/migrations/00108_b4_clients_full_name_trgm_index.down.sql`
- Apply via `mcp__supabase__apply_migration`
- Inline verification M-01..M-03 within transaction
- Regen types: `mcp__supabase__generate_typescript_types` → `src/lib/types/database.types.ts`

**Files modified:**
- `supabase/migrations/00108_b4_clients_full_name_trgm_index.sql` (NEW)
- `supabase/migrations/00108_b4_clients_full_name_trgm_index.down.sql` (NEW)
- `src/lib/types/database.types.ts` (REGEN)

**Commit body cites:** CONTEXT D-20..D-21 + §2.5 migration design + TD-B1abis-02 source.

### Task 7 — W.1 listener unflag (Vercel env-var addition)

**Subject:** `chore(stage-f1-wave-b-slice-2): B-4 Task 7 — W.1 listener unflag NEXT_PUBLIC_AUTH_STATE_LISTENER`

**Scope:**
- `vercel env add NEXT_PUBLIC_AUTH_STATE_LISTENER=true production`
- `vercel env add NEXT_PUBLIC_AUTH_STATE_LISTENER=true preview`
- Trigger redeploy via `vercel --prod`
- Record env-add evidence + 7-day observation start timestamp in SUMMARY

**Files modified:** NONE (operations-only)

**Commit body cites:** CONTEXT D-22..D-24 + §2.6 observation window status + TD-WB-LISTENER-UNFLAG closure (filed in MASTER-PLAN §11).

### Task 8 — F-J + F-K NaN guards (B-1b QA carry-forward 5)

**Subject:** `fix(stage-f1-wave-b-slice-2): B-4 Task 8 — F-J + F-K NaN guards in WI-013 + WI-001 validators`

**Scope:**
- Edit `src/lib/knowledge-graph/validators/wi-013-multi-job-allocation.ts:49-54`: add `Number.isFinite(a.amount)` guard + new violation code
- Edit `src/lib/knowledge-graph/validators/wi-001-inline-budget-context.ts:101-105`: add `Number.isFinite(invoice.total_amount)` guard + new violation code
- Add 2 unit test cases per validator (NaN input + Infinity input)

**Files modified:**
- `src/lib/knowledge-graph/validators/wi-013-multi-job-allocation.ts` (Task 8 edit; Task 9 comment will combine in §3)
- `src/lib/knowledge-graph/validators/wi-001-inline-budget-context.ts`
- `__tests__/validators/wi-013.test.ts` (UPDATE — +2 cases)
- `__tests__/validators/wi-001.test.ts` (UPDATE — +2 cases)

**Commit body cites:** CONTEXT D-25 + §2.7 fix + B-1b QA F-J + F-K source + nwrp172 disposition.

### Task 9 — F-D WI-013 jobs lookup rationale comment (B-1b QA carry-forward 6)

**Subject:** `docs(stage-f1-wave-b-slice-2): B-4 Task 9 — F-D WI-013 jobs lookup rationale comment`

**Scope:**
- Edit `src/lib/knowledge-graph/validators/wi-013-multi-job-allocation.ts:68-72`: add inline comment block (per §2.7 Task 9 body)
- Pure docs change

**Files modified:**
- `src/lib/knowledge-graph/validators/wi-013-multi-job-allocation.ts` (could be combined with Task 8 commit if executor prefers; left separate here for atomic-commit-per-task)

**Commit body cites:** CONTEXT D-26 + §2.7 Task 9 body + B-1b QA F-D source + nwrp172.

### Task 10 — F-A client-pii-not-embedded regex `i` flag (B-1b QA carry-forward 7)

**Subject:** `fix(stage-f1-wave-b-slice-2): B-4 Task 10 — F-A client-pii regex case-insensitivity`

**Scope:**
- Edit `src/lib/knowledge-graph/validators/client-pii-not-embedded.ts:40-46`: add `i` flag to 4 regex patterns
- Add 2 unit test cases (uppercase + mixed-case patterns)

**Files modified:**
- `src/lib/knowledge-graph/validators/client-pii-not-embedded.ts`
- `__tests__/validators/client-pii-not-embedded.test.ts` (UPDATE — +2 cases)

**Commit body cites:** CONTEXT D-27 + §2.7 Task 10 body + B-1b QA F-A source + nwrp172.

### Task 11 — B-4-SUMMARY.md + MASTER-PLAN.md update + ship reconciliation

**Subject:** `docs(stage-f1-wave-b-slice-2): B-4 Task 11 — SUMMARY.md authored + MASTER-PLAN update + TD closures`

**Scope:**
- Author `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-4-SUMMARY.md`:
  - Status: AUTHORED — PENDING GATE B-4 REVIEW (lighter GATE per nwrp220 §26)
  - All 12 ACs with verification evidence
  - Per-route write-site coverage table (Task 3 verbatim)
  - Migration 00108 M-01..M-03 verbatim
  - Cross-tenant probe verbatim (Task 4)
  - Race-catch test results (Task 5)
  - W.1 observation window status (Task 7)
  - Validator unit test results (Tasks 8 + 10)
  - Slice-2 ledger entry (B-4 actual /nx spend)
- Update `.planning/MASTER-PLAN.md`:
  - §12 Slice-2 progress: 3 of 7 → 4 of 7
  - §11: CLOSE TD-B1abis-01 (per Task 5), TD-B1abis-02 (per Task 6), TD-WB-LISTENER-UNFLAG (per Task 7); update MEDIUM-1 carry-forward note to CLOSED via Task 4
  - §11: Note B-1b QA HIGH-findings bundle CLOSED via Tasks 8/9/10

**Files modified:**
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-4-SUMMARY.md` (NEW)
- `.planning/MASTER-PLAN.md` (UPDATE)

**Commit body cites:** nwrp220 §26 halt_after; CONTEXT D-32..D-33; B-4-PLAN §4 ACs.

---

## §4. Acceptance criteria (12 falsifiable ACs)

### AC-B4-01 — ActivityEntityType union completeness verified (Task 1)

**Verification:**
```bash
$ npx tsc --noEmit
# Expected: zero errors

$ grep -c '^  | "' src/lib/activity-log.ts
# Expected: 35 (union members)
```

**Expected:** TypeScript compiles clean + union member count matches expected 35.

**Falsifiability:** If predecessor work somehow regressed the union, typecheck fails OR member count diverges from §1.1 enumeration.

### AC-B4-02 — ENTITY_LABELS Record exhaustiveness verified (Task 2)

**Verification:** AC-B4-01's typecheck covers this (Record<ActivityEntityType, string> exhaustiveness enforced at compile time).

**Expected:** Zero compile errors (same evidence as AC-B4-01).

**Falsifiability:** Any Record drift relative to union surfaces as `Property 'X' is missing` compile error.

### AC-B4-03 — Write-site coverage sweep (Task 3)

**Verification:**
```bash
$ grep -rn "logActivity" src/app/api/{lien-releases,proposals,owner-portal,clients}/ \
    | grep -E "route\.ts:"
```

Per-route disposition table populated in B-4-SUMMARY.md §Task-3 with one row per route + handler + logActivity-present/absent + rationale-if-absent.

**Expected:** Every CREATE/UPDATE/state-change handler has either `logActivity` call OR explicit inline rationale comment for skip.

**Falsifiability:** Any handler missing `logActivity` without rationale = FAIL; executor must add inline OR justify.

### AC-B4-04 — MEDIUM-1 fix applied + cross-tenant probe (Task 4)

**Verification (code):**
```bash
$ grep -A 5 "from\\(\"jobs\"\\)" src/app/api/jobs/route.ts | grep -B 2 -A 2 ".eq(\"org_id\""
```

Expected: shows the UPDATE chain with the new `.eq("org_id", membership.org_id)` line.

**Verification (integration test):**
```typescript
// Test stub authored at Task 4 commit:
test("PATCH /api/jobs rejects cross-org request", async () => {
  // Set up: authenticate as org_B user; attempt PATCH with org_A job_id
  // Expected: non-200 OR 0 rows updated
});
```

**Falsifiability:** If `.eq("org_id")` missing OR org_B can successfully PATCH org_A job → FAIL.

### AC-B4-05 — TD-B1abis-01 race-catch (Task 5)

**Verification (integration test):**
```typescript
test("resolveClientId handles concurrent identical-name race", async () => {
  const promises = [resolveClientId("RaceTestClient"), resolveClientId("RaceTestClient")];
  const [id1, id2] = await Promise.all(promises);
  expect(id1).toBe(id2); // same client_id; no 500
});
```

**Falsifiability:** If second request throws 500 (unhandled 23505) → FAIL.

### AC-B4-06 — TD-B1abis-02 trgm index applied + EXPLAIN ANALYZE (Task 6)

**Verification (LIVE):**
```sql
-- M-01: Index exists
SELECT indexname FROM pg_indexes WHERE indexname = 'idx_clients_full_name_trgm';
-- Expected: 1 row

-- M-02: Index definition uses gin_trgm_ops
SELECT pg_get_indexdef(c.oid) FROM pg_class c WHERE c.relname = 'idx_clients_full_name_trgm';
-- Expected: definition contains 'gin_trgm_ops' + 'WHERE deleted_at IS NULL'

-- M-03: EXPLAIN ANALYZE on representative query
EXPLAIN ANALYZE SELECT id, full_name FROM public.clients
 WHERE org_id = '<test_org>' AND full_name ILIKE '%test%' AND deleted_at IS NULL LIMIT 10;
-- Expected: Bitmap Index Scan on idx_clients_full_name_trgm OR Bitmap Heap Scan referencing trgm
```

**Falsifiability:** Index missing OR query plan doesn't use trgm index → FAIL.

### AC-B4-07 — W.1 listener unflag env-var added + 7-day Sentry observation gate (Task 7)

**Verification (Vercel env list):**
```bash
$ vercel env ls --environment production | grep NEXT_PUBLIC_AUTH_STATE_LISTENER
$ vercel env ls --environment preview | grep NEXT_PUBLIC_AUTH_STATE_LISTENER
```

**Expected:** Both environments show `NEXT_PUBLIC_AUTH_STATE_LISTENER` with value (recent timestamp).

### Sentry alerting surface (per nwrp221 §10 + nwrp222 §6 — specified at GATE, NOT deferred to execute)

**What it alerts on:** Errors originating from the W.1 `onAuthStateChange` listener callback path. Sentry filter = events whose stack trace contains ANY of:
- `onAuthStateChange` (listener subscription site at `src/hooks/use-current-role.ts:~38`)
- `useCurrentRole` (downstream hook re-render triggered by listener)
- nav-bar / invoice-detail role-display components re-rendering after listener-driven cache invalidation (React error boundary OR uncaught Sentry exception)

NOT alerting on: stale-role render (silent UX defect; surfaces via user report, not Sentry).

### Spike threshold (3-detector definition per nwrp221 §10 + nwrp222 §6)

A spike is ANY of:

1. **Burst:** >5 listener-path Sentry errors in any **1-minute** window
2. **Sustained rate:** >1% listener-callback failure rate over any **5-minute** window (denominator = count of `onAuthStateChange` events in that window per Sentry breadcrumbs OR estimated from active-session count)
3. **Chronic-low-rate:** >0 listener-path errors per day sustained over **3 consecutive days** (catches edge-case regressions that don't burst but accumulate)

**Pre-unflag baseline:** ZERO listener-path errors (listener was env-flag gated off; never executed). Any post-unflag listener-path error is by definition "above baseline."

### Observation gate (7 days post-Task-7 commit)

- **PASS** = no spike detected per the 3-detector definition during the 7-day window
- **FAIL/HALT** = any of the 3 detectors fires → surface to Jake → if real regression: rollback W.1 via `vercel env rm NEXT_PUBLIC_AUTH_STATE_LISTENER production && preview` + redeploy (Task 7 rollback path; no code revert needed) → if false-positive: refine Sentry filter + continue observation

**Falsifiability:** Env-var absent in either environment OR any of the 3 detectors fires during 7-day window → FAIL/HALT.

### AC-B4-08 — F-J NaN guard in WI-013 (Task 8)

**Verification (unit test):**
```typescript
test("wi-013 emits 'wi-013-allocation-amount-not-finite' on NaN amount", () => {
  const violations = wi013.validate({ allocations: [{ amount: NaN, ... }] }, ctx);
  expect(violations).toContainEqual(expect.objectContaining({
    code: 'wi-013-allocation-amount-not-finite',
  }));
});
```

**Falsifiability:** If guard absent → NaN silently produces ok=true (sum-drift bypass) → test FAILs.

### AC-B4-09 — F-K NaN guard in WI-001 (Task 8)

**Verification (unit test):** Same shape as AC-B4-08 on WI-001 `invoice.total_amount`. Violation code: `wi-001-invoice-amount-not-finite`.

### AC-B4-10 — F-D rationale comment (Task 9)

**Verification (grep):**
```bash
$ grep -A 5 "select.*from.*jobs" src/lib/knowledge-graph/validators/wi-013-multi-job-allocation.ts \
    | grep -i "INTENTIONAL\|diagnostic\|cross-tenant"
```

**Expected:** Comment block present with INTENTIONAL/diagnostic/cross-tenant rationale per §2.7.

**Falsifiability:** Comment block absent → FAIL (pure docs deliverable).

### AC-B4-11 — F-A regex case-insensitivity (Task 10)

**Verification (unit test):**
```typescript
test("client-pii-not-embedded matches uppercase CLIENTS(*)", () => {
  expect(validator.detect('CLIENTS(*)')).toMatch(/wildcard/);
});
test("client-pii-not-embedded matches mixed-case Clients(email)", () => {
  expect(validator.detect('Clients(email)')).toMatch(/email/);
});
```

**Falsifiability:** If `i` flag absent → uppercase patterns slip undetected → tests FAIL.

### AC-B4-12 — Smoke harness post-B-4 ≤2 failures matching TD-WE-03 set

**Verification:**
- Run smoke against harness-fixture-org
- Expected: ≤2 failures (TD-WE-03 set: `/financials/lien-releases` + `/financials/pay-apps` empty-state)
- NO new failures from B-4 changes

**Falsifiability:** Any new failure attributable to B-4 changes → FAIL/HALT.

---

## §5. Risks

### R-1 — Task 3 sweep may find more gaps than estimated

**Risk:** Survey identified partial coverage on lien-releases routes; full per-route audit may surface 4+ gaps requiring inline fills.

**Mitigation:**
- Each gap is ~2-5 lines of code (logActivity call with appropriate entity_type + action)
- If >5 gaps found OR scope balloons past $50 per-plan halt gate → halt + surface
- Task 3 commit can include the additional logActivity calls (no separate task needed)

**Disposition:** Monitor at execute time; halt-and-surface if mid-flight projects past $50.

### R-2 — W.1 listener unflag could surface unexpected auth-state regression

**Risk:** Listener fires `onAuthStateChange` callbacks; if there's a subtle issue with role-cache invalidation timing or Supabase JWT refresh handling, users could see flicker / wrong-role nav / stale data.

**Mitigation:**
- 8-day observation window (Slice-1 → B-2a/B-2b/B-3 ship) showed no auth-state-change incidents
- Rollback via env-var removal (no code change to revert)
- 7-day post-unflag Sentry observation as AC-B4-07 gate

**Disposition:** Acceptable risk per observation-window precedent; rollback is one env-var change.

### R-3 — Task 4 cross-tenant probe AC may need test infrastructure that doesn't exist yet

**Risk:** Integration test for cross-tenant PATCH may require RLS-bound session setup that the existing test suite doesn't have.

**Mitigation:**
- If existing tests use service-role (BYPASSRLS), simulate cross-org via membership.org_id override in mock
- Falsifiability via code review of the `.eq("org_id")` addition is still valid even if integration test stub is partial
- Document in SUMMARY: code-review evidence + test stub authored (full integration test deferred to Wave 1.1-Lite test infrastructure pass)

**Disposition:** Acceptable; focused security-reviewer at iter-1 reviews code change directly.

### R-4 — Tasks 1+2 verification commits are "empty" (no source changes)

**Risk:** Each is a separate commit with no diff (just commit body documenting verification). Some review tools / process scripts may flag empty commits as anomaly.

**Mitigation:** Use `git commit --allow-empty` if needed; commit body is the documentation. Alternatively bundle Task 1+2 verification into Task 3's commit body section.

**Disposition:** Plan-author preference at execute time; either approach is acceptable.

---

## §6. Files modified (frontmatter mirror)

See frontmatter `files_modified` block above for canonical list. Notable:
- **Source files (7):** jobs/route.ts, 3 validator files, 3 test files
- **Migration (2):** 00108 .sql + .down.sql
- **Types (1):** database.types.ts regen
- **Docs (2):** B-4-SUMMARY.md (NEW) + MASTER-PLAN.md (UPDATE)
- **Vercel env vars (Task 7):** NEXT_PUBLIC_AUTH_STATE_LISTENER=true in Production + Preview

---

## §7. Rollback plan

### Schema rollback (Migration 00108)
- `supabase/migrations/00108_b4_clients_full_name_trgm_index.down.sql` drops the index
- Down migration is idempotent via IF EXISTS

### Code rollback (Tasks 4, 5, 8, 9, 10)
- All code changes are surgical (1-line MEDIUM-1; ~8-line race-catch; ~4-line NaN guards × 2; ~6-line comment; 4-char regex × 4)
- Revert individual commits if needed; no migration dependency

### Env-var rollback (Task 7)
- `vercel env rm NEXT_PUBLIC_AUTH_STATE_LISTENER production`
- `vercel env rm NEXT_PUBLIC_AUTH_STATE_LISTENER preview`
- `vercel --prod` to redeploy
- Listener early-return resumes (env-var absent → `process.env.NEXT_PUBLIC_AUTH_STATE_LISTENER !== 'true'` evaluates true → listener subscription never created)

### Activity_log row preservation
- Activity_log is append-only; rows from new write-site calls (if any added in Task 3) preserved on rollback
- No cleanup needed

---

## §8. Plan-review iter-1 expectations

### Reviewer scope (4 reviewers + Task 4 focused security-reviewer per nwrp220 §6 + §8)

1. **spec-checker** — falsifiable AC tracing; verify Task 3 write-site sweep AC requires real evidence (grep/per-route table), not text-only assertion
2. **custodian** — planning tree + commit chain + Slice-2 ledger surface; verify Tasks 1+2 verification-only disposition is clearly documented
3. **database-reviewer** — Task 6 migration 00108 (idempotent + WHERE clause + extension dependency); Task 5 race-catch pattern correctness
4. **ai-logic-tester** — Tasks 1+2 union/Record verification (entity_type domain post-B-3); Tasks 8-10 validator changes (entity_type + violation codes)
5. **security-reviewer (NARROW — Task 4 ONLY)** — single-route fix correctness + cross-tenant probe AC adequacy; NOT full-plan review

**DROPPED per nwrp220 §6:** multi-tenant-architect, rls-auditor, design-pushback, data-migration-safety

### Cross-reviewer alignment expectations

Lean Tier-2: ONE iter cycle target per nwrp220 §7. If iter-1 surfaces only trivial fixes → apply inline + skip iter-2.

### Halt conditions

- New BLOCKING at iter-1 (e.g., MEDIUM-1 fix is wrong shape OR Task 7 observation-window status flagged as too short) → halt + surface
- Per-plan halt gate $50 approached → halt + surface
- Rule 9 cross-reviewer factual disagreement → halt for Jake

### halt_after: true contract (per nwrp220 §26)

After plan-review iter-1 (and any iter-2 if findings warrant):
1. Author PLAN-REVIEW-B4-ITER1-SYNTHESIS.md
2. Surface PLAN + iter-1 findings + Slice-2 ledger to Jake
3. HALT — do NOT auto-/nx
4. Jake reviews per nwrp220 §26: task-3 write-site coverage real + task-4 org_id filter verified + no regressions; quicker GATE

---

## §9. Plan integrity attestation

### Falsifiability checklist

- [x] All 12 ACs have verification mechanism (LIVE SQL / unit test / grep / file check)
- [x] Pre-flight survey findings documented in §1 (per nwrp220 §8: NO pre-design landmine audit needed for additive cleanup)
- [x] Migration boundary explicit (single migration 00108 atomic; Task 6 only)
- [x] Rollback plan symmetric to forward changes
- [x] Per-plan halt gate $50 acknowledged
- [x] halt_after: true contract documented
- [x] Execute-Phase footer pattern documented (per hook fix 6c8085b live)

### CLAUDE.md compliance checklist

- [x] **Multi-tenant RLS BY CONSTRUCTION** — Task 4 adds application-layer defense-in-depth filter alongside existing RLS enforcement
- [x] **Soft-delete only** — N/A (no DELETE statements added; B-4 is additive)
- [x] **All amounts in cents** — N/A (no monetary calculation changes)
- [x] **Status changes append to status_history** — N/A (no status transitions added)
- [x] **TypeScript strict mode** — preserved (Record exhaustiveness enforces it)
- [x] **All business logic in server-side API routes** — preserved
- [x] **Schema changes regenerate types** — Task 6 migration 00108 includes types regen
- [x] **Rule 1 schema ≠ runtime** — Task 6 has LIVE EXPLAIN ANALYZE verification
- [x] **Rule 2 PostgREST FK citation** — N/A (no PostgREST embedding hints added)
- [x] **Rule 3 ai-logic-tester executes** — N/A for B-4 (no new aggregations / validators introduced; existing validator tests extended)
- [x] **Rule 7d per-plan halt gate** — $50 acknowledged in §5 R-1
- [x] **Rule 8 hook fail-closed** — Execute-Phase footer used; Drummond gate still fires
- [x] **Rule 9 cross-reviewer HALT** — explicit in §8

### Source decisions citation

All 8 cited sources per frontmatter `source_decisions`.

### Slice-2 ledger surface

Per §0 + CONTEXT D-31. B-4 fits in remaining ~$107-188 budget with margin.

---

## §10. References

### Source-of-truth documents
- `.planning/expansions/stage-f1-knowledge-graph-auth-wave-b-slice-2-EXPANDED-SCOPE.md` (RE-APPROVED 2026-05-21)
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-4-CONTEXT.md` (45 D-NN decisions)
- `.planning/qa-runs/2026-05-18-1230-wave-b-b1b-qa-report.md` (F-* finding source)
- `.planning/MASTER-PLAN.md` (Slice-2 progress + TD registry)
- `CLAUDE.md` (Architecture posture + Workflow posture Rules 1-9)

### Predecessor plans
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2a-PLAN.md` + `B-2b-PLAN.md` + `B-3-PLAN.md`
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-b/B-1a-bis-*.md` (TD-B1abis-01 + TD-B1abis-02 + TD-B1abis-03 source)
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-b/B-1b-*.md` (F-* + W.1 source)

### Canonical migration precedents
- `supabase/migrations/00052_cost_intelligence_spine.sql` (pg_trgm extension + gin_trgm_ops first use)
- `supabase/migrations/00073_pricing_history.sql` (gin_trgm_ops on pricing_history.description)
- `supabase/migrations/00100_clients_schema_foundation.sql` (clients table + idx_clients_org_name_email_unique partial unique)

### nwrp chain
- nwrp200 (Slice-2 re-split)
- nwrp202 (EXPANDED-SCOPE RE-APPROVED)
- nwrp166 §10-11 + nwrp172 (carry-forward distribute pattern)
- nwrp209 / nwrp213 / nwrp219 (B-2a / B-2b / B-3 GATE-close)
- nwrp217 (hook chore TD filing)
- nwrp219 §11 (Slice-2 ceiling $400; lean Tier-2 rigor directive for B-4/B-6/B-7)
- nwrp220 (B-4 DISPATCH lean Tier-2; 4-reviewer scope; focused security-reviewer on Task 4)

---

**End of B-4-PLAN.md.**
