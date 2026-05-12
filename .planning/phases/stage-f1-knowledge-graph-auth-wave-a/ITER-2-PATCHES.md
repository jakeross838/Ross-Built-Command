# Wave-A iter-2 Plan-Review Patches (authoritative addendum to PLAN.md files)

**Status:** iter-2 amendments (Jake-authorized per nwrp113 autonomous envelope).
**Source reviews (iter-1):**
- `.planning/plan-reviews/stage-f1-knowledge-graph-auth-wave-a-database-review-iter1.md` (database-reviewer; WARNING)
- `.planning/plan-reviews/stage-f1-knowledge-graph-auth-wave-a-security-review-iter1.md` (security-reviewer; PASS)
- architect verdict: PASS (4 HIGH; inline message)
- data-migration-safety verdict: PASS WITH WARNINGS (5 HIGH; inline message)
- multi-tenant-architect verdict: PASS (1 CRITICAL + 3 HIGH; inline message)
- nightwork-rls-auditor verdict: WARNING (2 HIGH; inline message)

**Resolution:** No iter-2 reviewer round; findings are doc-level + small SQL adjustments + scope clarifications. The executor applies the patches below at execute-time atop the original PLAN.md files.

**Verdict consolidation:**
- BLOCKING: 0
- CRITICAL: 1 (A-4 body/preview deleted_at filter inconsistency)
- HIGH (unique after dedup): 14
- MEDIUM (unique after dedup): ~15 (deferred or surfaced at GATE-A)

---

## CRITICAL fixes (must apply before execute)

### CR-A4-1 — A-4 task description vs. migration body inconsistency on `deleted_at` filter

**Flagged by:** multi-tenant-architect (upgraded to CRITICAL), data-migration-safety (H-2), database-reviewer (H-1), rls-auditor (H-1), security-reviewer (H-1). **5-of-6 reviewer consensus.**

**The discrepancy:**
- A-4 PLAN.md `implementation_tasks` section (~line 169): `WHERE org_id IS NULL AND deleted_at IS NULL`
- A-4 PLAN.md `migration_preview` section (~line 528): `WHERE org_id IS NULL` (no `deleted_at` filter)

**Resolution:** Migration body version (no `deleted_at` filter) is canonical and safer. Reasoning (per multi-tenant-architect):
> "If the inconsistency lands in execute and the executor picks the `deleted_at IS NULL` variant, soft-deleted allocation rows whose parent invoices have NO record (somehow) would slip through verification but FAIL the subsequent `ALTER COLUMN org_id SET NOT NULL` — silent leak risk where the NOT NULL constraint is created on a table containing NULLs."

**Executor action:** When applying A-4 migration, use the migration_preview SQL exactly as written. The task description text at line 169 should be updated to `WHERE org_id IS NULL` (remove `AND deleted_at IS NULL`). Treat the migration body as canonical.

**Add remediation paragraph to A-4 plan:** If the migration aborts on the orphan check, run `SELECT id, invoice_id FROM invoice_allocations WHERE org_id IS NULL` to surface orphans. Options: (a) soft-delete the orphans, (b) hard-delete them (rare; only if data-recovery confirms no audit value), (c) write a corrective migration to set org_id from a different source.

---

## HIGH fixes (apply during execute)

### HF-A4-1 — A-4 RLS policies wrap helper functions in `(SELECT ...)` for session caching

**Flagged by:** database-reviewer (H-2).

**The concern:** A-4's new direct-filter policies call `app_private.user_org_id()` per-row. CLAUDE.md anti-pattern. F5 cost-intel allocations-by-org will become a hot path; fix forward in 00096.

**Executor action:** When writing the 4 direct-filter policies in migration 00096, wrap helper calls:
- Replace `org_id = app_private.user_org_id()` with `org_id = (SELECT app_private.user_org_id())`
- Replace `app_private.is_platform_admin()` with `(SELECT app_private.is_platform_admin())`

Apply to all 4 new policies (org isolation USING + WITH CHECK; delete-strict; authenticated read; platform-admin read). The role-based write policy from 00043 stays untouched.

**Note:** This is forward-fix only; the existing 00049 style is not migrated wholesale. Wave-B Plan B-7 can extend this pattern to other tables as a separate cleanup.

### HF-A4-2 — A-4 add pre-flight orphan check at TOP of migration (fail-fast)

**Flagged by:** data-migration-safety (H-5).

**The concern:** A-4's fail-loud DO block currently runs AFTER column add + backfill. Pre-flight check before any DDL is cheaper to debug.

**Executor action:** Insert at the very top of migration 00096 (before any ADD COLUMN):
```sql
DO $$
DECLARE orphan_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO orphan_count
    FROM public.invoice_allocations a
    LEFT JOIN public.invoices i ON i.id = a.invoice_id
   WHERE i.id IS NULL OR i.org_id IS NULL;
  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'Pre-flight: % invoice_allocations rows have orphan or NULL-org parent invoice. '
      'Investigate and clean before applying 00096.', orphan_count;
  END IF;
END $$;
```

This is in addition to the post-backfill DO block (which stays as a defense-in-depth check after the UPDATE).

### HF-A4-3 — A-4 add F5 index gap header comment

**Flagged by:** database-reviewer (H-3).

**The concern:** F5 cost-intel queries on `invoice_allocations` will likely filter `(org_id, cost_code_id)` for cost-code breakdowns and `(org_id, change_order_id)` for CO splits — neither covered by the composite `(org_id, invoice_id)` index.

**Executor action:** Add to migration 00096 header comment block:
```sql
-- F5 INDEX GAP (acknowledged; routes to Wave-B Plan B-7):
-- This migration adds idx_invoice_allocations_org_id_invoice_id covering
-- the tenant-bounded fetch pattern. F5 cost-intel aggregations will likely
-- benefit from (org_id, cost_code_id) and (org_id, change_order_id) indexes
-- for cost-code breakdowns and CO-vs-base splits. Defer to Wave-B Plan B-7.
```

### HF-A4-4 — A-4 down.sql header comment about preserved role-based write policy

**Flagged by:** data-migration-safety (H-1).

**The concern:** Down migration restores the 4 JOIN-based policies but does NOT recreate the `"admin owner accounting write invoice_allocations"` policy from 00043:118-120 because the up migration never dropped it. Without explicit comment, a reviewer reading the down.sql in isolation might think the policy was meant to be missing.

**Executor action:** Add to top of 00096 .down.sql:
```sql
-- Note: "admin owner accounting write invoice_allocations" policy from
-- 00043:118-120 is intentionally NOT recreated here because the up migration
-- never dropped it. Verify via `SELECT policyname FROM pg_policies WHERE
-- tablename='invoice_allocations'` returns 5 policies pre-up and 5 policies
-- post-down.
```

### HF-A4-5 — A-4 regression test treats SKIP as WARN at GATE-A, not silent pass

**Flagged by:** architect (H-3), data-migration-safety (M-4), multi-tenant-architect (informational), database-reviewer (H-5), rls-auditor (H-2), security-reviewer (M-2). **6-of-6 reviewer consensus.**

**The concern:** A-4's regression test SKIPs when fixture coverage is single-org (current state: all 52 rows in Ross Built canonical org). AC #3 would be marked PASS based on test existing, but no signal at execution.

**Resolution:** Option (a) — defer fixture seeding to Wave-B Plan B-6 per Q9 D fixture-maintenance contract. Surface explicitly at GATE-A.

**Executor action:**
1. Test stays as-is (SKIPs on single-org fixture).
2. Update test's skip message to emit a structured log line that GATE-A summary can grep: `console.warn("WAVE-A-A4-REGRESSION-SKIP: invoice_allocations fixture covers only 1 org; Wave-B Plan B-6 must seed 2-org coverage")`.
3. At GATE-A halt summary, explicitly call out: "A-4 regression test SKIPs at Wave-A execution due to single-org fixture; Wave-B Plan B-6/B-7 must seed coverage to make AC #3 falsifiable."
4. Acceptance criterion #3 wording updated to: "Regression test EXISTS and will run hot once fixture coverage is seeded by Wave-B Plan B-6; current execution SKIPs are documented in GATE-A summary."

**Alternative considered + rejected:** Option (b) — seed synthetic 2nd-org fixture row in migration 00096 itself. Rejected because: (i) Wave-B Plan B-6 codifies fixture-maintenance contract holistically; piecemeal seeding in 00096 creates contract drift; (ii) preserves Wave-A scope discipline.

### HF-A4-6 — A-4 add AC verifying `save.ts`'s `orgId` parameter source

**Flagged by:** multi-tenant-architect (H-2).

**The concern:** `src/lib/invoices/save.ts:536` INSERT path receives `orgId` from caller. The caller MUST pass `membership.org_id` from a server-side `getCurrentMembership()`. If a future caller passes from request body / untrusted source, service-role bypass + NOT NULL constraint could create a cross-tenant INSERT pathway.

**Executor action:** Add to A-4 acceptance criteria:
> AC-7 (NEW): Verify via grep that every caller of `saveInvoice()` passes `orgId` derived from `membership.org_id` (or equivalent server-side identity), NOT from request body or untrusted input. Document call site list in PR description.

### HF-A4-7 — A-4 INSERT-site grep extends to `.upsert()` and `.rpc()` patterns

**Flagged by:** security-reviewer (H-2).

**The concern:** A-4 plan's grep `from\(.invoice_allocations.\)\.insert` doesn't cover `.upsert()` or `.rpc()` paths. If any exist, they'd bypass app-layer org_id requirement.

**Executor action:** Extend the verification grep:
```bash
grep -rnE "from\(.invoice_allocations.\)\.(insert|upsert)" src/
grep -rn "rpc.*invoice_allocation" src/
```

Confirm only the 4 INSERT sites + 1 SELECT site exist. If `.upsert()` or `.rpc()` paths found, audit each before execute.

### HF-A1-1 — A-1 `status_history.who` fallback uses `null` not `"user"` literal

**Flagged by:** data-migration-safety (H-3).

**The concern:** A-1 Tasks 2 + 3 use `who: actorId ?? "user"` for lien-releases. If actor is null (no session, service-role, RPC fan-out), the entry gets `who: "user"` literal — not a UUID, breaks downstream audit-timeline UIs.

**Executor action:** Replace `who: actorId ?? "user"` with `who: actorId ?? null` in:
- `src/app/api/lien-releases/[id]/route.ts` PATCH handler (Task 2 diff)
- `src/app/api/lien-releases/bulk/route.ts` bulk loop (Task 3 diff)

Task 4 (jobs PATCH) uses `who: user.id` directly because `user` is guaranteed non-null at that point — no change needed.

### HF-A1-2 — A-1 bulk endpoint per-row updates document regression in SUMMARY

**Flagged by:** data-migration-safety (H-4).

**The concern:** A-1 bulk endpoint changes from single-UPDATE (atomic by Postgres semantics) to per-row loop with self-transition skip. Partial-failure state is now reachable; prior behavior was all-or-nothing.

**Resolution:** Accept the regression for Wave-A; document explicitly at GATE-A summary; surface to Wave-B Plan B-3 (deletion safety net trigger plan can also house a status_history-trigger safety net for atomicity).

**Executor action:** Add to A-1 SUMMARY.md at ship time:
> "Behavior change (regression): bulk lien-releases endpoint is now per-row sequential, not single-UPDATE atomic. Partial-failure state is reachable on mid-loop failure. Wrapped in BEGIN/COMMIT would restore atomicity; deferred to Wave-B Plan B-3 (status_history-trigger safety net could also handle this)."

NO code change in Wave-A. (Plan-author's original recommendation accepted.)

### HF-A1-3 — A-1 add audit-log strategy scope-exclusion note

**Flagged by:** architect (H-2 + H-4).

**The concern:** A-1 introduces NEW `logStatusChange({entity_type: "job", action: "status_changed"})` call. Need explicit confirmation that:
1. `job` entity_type expansion is consistent with AUDIT-LOG-STRATEGY (no Bills/Pay-Apps vocab conflict — `job` is universal parent, not subject to D-051 rename).
2. No audit-log-strategy migration in this Wave (if B-4 migrates entity_type to Postgres ENUM, pre-existing rows are handled by B-4 migration scope).
3. `src/lib/audit/action-labels.ts` handles `entity_type='job'` + `action='status_changed'` correctly (verify via grep during execute).

**Executor action:** Add scope-exclusion bullet to A-1 plan:
> "Scope exclusion: this plan does NOT migrate the audit-log strategy. `entity_type` stays TEXT (not Postgres ENUM); Strategy 1-prime preserved. `entity_type='job'` is consistent with `D-051` Bills/Pay-Apps rename (jobs is universal parent, not subject to entity rename). Wave-B Plan B-4 handles any future ENUM migration; rows written by this plan with `entity_type='job'` remain readable post-B-4."

Add execute-time verification step: grep `src/lib/audit/action-labels.ts` for `entity_type='job' || 'status_changed'`. If no handler exists, add defensive fallback case.

### HF-A1-4 — A-1 add explicit BEGIN/COMMIT wrapper to migration 00094

**Flagged by:** database-reviewer (H-4).

**The concern:** Migration 00094 currently has DDL statements (DROP TABLE, ADD COLUMN x2) without explicit `BEGIN; ... COMMIT;` wrapper. 00095 and 00096 both wrap. Consistency + hygiene.

**Executor action:** Wrap migration 00094 SQL in:
```sql
BEGIN;
  -- existing DROP TABLE + ADD COLUMN statements
COMMIT;
```

Same for .down.sql.

### HF-A2-1 — A-2 load-bearing code comment near `.eq("org_id", ...)` filter

**Flagged by:** multi-tenant-architect (H-3).

**The concern:** A-2's `.eq("org_id", membership.org_id)` is defense-in-depth (RLS already gives this outcome via `createServerClient()`). But if a future maintainer swaps `createServerClient()` for `tryCreateServiceRoleClient()`, the .eq filter becomes the SOLE tenant boundary.

**Executor action:** Add inline code comment in `src/app/api/invoices/[id]/docx-html/route.ts` near the `.eq("org_id", membership.org_id)` line:
```typescript
// Defense-in-depth tenant filter — REQUIRED if this route ever switches
// to tryCreateServiceRoleClient() (service-role bypasses RLS). Do not
// remove without verifying RLS is still the sole tenant boundary.
.eq("org_id", membership.org_id)
```

### HF-A2-2 — A-2 INSERT/upsert grep extension (same as HF-A4-7 pattern)

**Flagged by:** security-reviewer (H-2; A-4-specific but pattern applies).

**Executor action:** During A-2 execute, run extended grep against `src/`:
```bash
grep -rnE "from\(.invoices.\)\.(insert|upsert)" src/
```

If unexpected paths found, surface to Jake before merging A-2.

### HF-A3-1 — A-3 post-migration verify budget_lines RLS independence

**Flagged by:** multi-tenant-architect (H-1).

**The concern:** A-3 drops `budget_lines.budget_id` column. The plan asserts `budget_lines` RLS is independent of `budgets`, but doesn't verify post-migration.

**Executor action:** Add to A-3 verification commands (post-migration):
```sql
-- Verify budget_lines RLS does NOT reference dropped budgets table
SELECT policyname, qual, with_check 
  FROM pg_policies 
 WHERE tablename = 'budget_lines' 
   AND (qual LIKE '%budgets%' OR with_check LIKE '%budgets%');
-- Expected: 0 rows
```

If returns >0 rows, surface to Jake before merging A-3.

### HF-A3-2 — A-3 mandatory smoke-test query for legacy `entity_type='budget'` rows

**Flagged by:** architect (OQ-A-3-3 upgrade).

**The concern:** A-3 removes `'budget'` from `ActivityEntityType` TS union. If legacy activity_log rows have `entity_type='budget'`, they become orphan-typed (readable from SQL, not from TS) — no immediate breakage but worth documenting.

**Executor action:** Add to A-3 execute Task 6 smoke test:
```sql
SELECT COUNT(*) FROM activity_log WHERE entity_type = 'budget';
-- Expected: 0 rows (no budgets-related app-layer writes ever shipped to production per audit Section 4 task 4).
-- If > 0: surface to Jake at GATE-A for backfill-rename-or-leave decision before merging.
```

Then grep `src/lib/audit/action-labels.ts` for `'budget'`:
```bash
grep -n "'budget'" src/lib/audit/action-labels.ts
```
If exhaustive switch case exists, add defensive default case for `'budget'` → returns "Budget (legacy)" or similar. If no exhaustive switch, no action needed.

---

## MEDIUM findings (surface at GATE-A; defer to Wave-B/C)

These do NOT block Wave-A execute. Document in OVERNIGHT-LOG.md at GATE-A halt summary.

### MED-A1-1 — `status_history` JSONB COMMENT note re: free-form PII in `note` field
**Source:** multi-tenant-architect (M-2), security-reviewer (M-1).
**Action:** Extend migration 00094 column COMMENT on `status_history`:
> "Append-only JSONB array of {who, when, old_status, new_status, note}. Note field may contain free-form text including PII; follows parent entity retention class."

Also add app-layer length cap on `note` (500 chars max) in PATCH route handler (security-reviewer M-1).

### MED-A3-1 — `budget_lines.invoiced/committed/co_adjustments` stored aggregates
**Source:** architect (M-2), data-migration-safety (M-3), database-reviewer (M-4).
**Action:** Surface at GATE-A halt summary as Wave-B-or-C follow-up. These app-layer-maintained aggregates violate CLAUDE.md "Recalculate, don't increment" rule. Not in A-3 scope; route to dedicated cleanup plan.

### MED-A3-2 — In-place edit of 00051 historical migration file (convention question)
**Source:** database-reviewer (M-2).
**Action:** A-4 plan modifies 00051_support_chat.sql with comment-only content. Functionally safe (Supabase tracks state by sequence number, not checksum). Verify the team convention permits cosmetic comment additions to applied migrations. If not, move the Q10b rationale to the 00096 migration header or a docs file. **Default resolution:** ship as written; surface at GATE-A.

### MED-A2-1 — Storage file path validation against `{org_id}/` prefix (Wave-B polish)
**Source:** security-reviewer (M-3).
**Action:** Defer to Wave-B. After A-2 gate, `original_file_url` is used directly in `supabase.storage.download()`. The DB SELECT confirms `org_id` matches, so the file URL came from the correct org's row. But if `original_file_url` ever lacks the `{org_id}/` prefix, defense-in-depth check would catch it. Add to Wave-B Plan B-2 or similar.

### MED-A1-2 — `received_at` divergence in bulk endpoint behavior change
**Source:** architect (M-6).
**Action:** Document at GATE-A summary. UI consumers reading `lien_releases.received_at` post-A-1 bulk skip will see stale-but-not-wrong timestamp. Grep during execute confirms no current UI consumer; flag as future-Wave consideration.

### MED-A1-3 — `depends_on` frontmatter inconsistency across plans
**Source:** architect (M-5).
**Action:** Make `depends_on` explicit at execute time. A-1 → A-2 → A-3 → A-4 sequence enforced by migration numbering; update frontmatter to: A-2 depends_on=[A-1], A-3 depends_on=[A-2], A-4 depends_on=[A-3] for clarity (or leave all empty and document sequencing in CONTEXT.md). Default: document sequencing in CONTEXT.md; leave frontmatter empty.

### MED-WA-1 — Wave-A EXPANDED-SCOPE drift vs umbrella `Recommended Plan decomposition`
**Source:** architect (H-1, downgraded from HIGH to MEDIUM after analysis — it's doc-level drift not execute-blocker).
**Action:** Update Wave-A EXPANDED-SCOPE.md to explicitly defer the umbrella's "function search_path sweep + REVOKE EXECUTE + extension move" items to Wave-B or Wave-C. Closes the umbrella↔wave-spec drift loop.

---

## Open-question dispositions (from iter-1)

**Accept plan-author defaults:**
- OQ-A1-1, OQ-A1-2 (A-1 note allow-list + bulk self-transition skip) — accept plan-author recommendations.
- OQ-A-2-1 (A-2 harness Layer 1 coverage interpretation) — accept lenient interpretation (a).
- OQ-A-2-2 (A-2 fast-path) — accept plan-author recommendation.
- OQ-A-2-3 (A-2 first API-route test file) — accept defer-to-Wave-B.
- OQ-A-3-1 (A-3 .down.sql faithfulness) — accept ship-as-written.
- OQ-A-3-2 (A-3 budget_lines stored aggregates) — accept defer-to-Wave-B/C; surface at GATE-A.
- OQ-A-3-4 (A-3 0-row pre-verify) — accept; mandatory per plan.

**Upgrade plan-author recommendation:**
- OQ-A-3-3 (A-3 action-labels.ts defensive case) — upgrade per HF-A3-2 above.

---

## Executor instructions summary

When executing Wave-A plans:

1. **Read PLAN.md + THIS DOCUMENT** for each plan. ITER-2-PATCHES.md overrides PLAN.md where they conflict.
2. **CR-A4-1 is mandatory** — use migration body's `WHERE org_id IS NULL` (no `deleted_at` filter) for the orphan check.
3. **Apply all HF-* patches** during execute. Each is small + localized.
4. **MED-* items surface at GATE-A halt summary**, NOT during execute.
5. **Acceptance criteria updates:**
   - A-4 AC-3 wording (HF-A4-5)
   - A-4 AC-7 (new; HF-A4-6) — orgId source verification
6. **Smoke-test queries:**
   - A-3: `SELECT COUNT(*) FROM activity_log WHERE entity_type='budget'` (HF-A3-2)
   - A-3: `pg_policies` query for budget_lines RLS independence (HF-A3-1)
7. **Grep verifications:**
   - A-2 + A-4: extended INSERT/upsert/rpc patterns (HF-A4-7 + HF-A2-2)
   - A-4: `save.ts` orgId source callers (HF-A4-6)
   - A-3: action-labels.ts for `'budget'` legacy case (HF-A3-2)

8. **GATE-A halt summary must surface:**
   - All MED-* findings
   - HF-A4-5 SKIP warning re: regression test fixture coverage
   - HF-A1-2 SUMMARY documenting bulk endpoint atomicity regression
   - MED-A3-1 budget_lines stored aggregates follow-up
   - MED-WA-1 umbrella scope drift items (function search_path sweep / REVOKE EXECUTE / extension move) → recommend Wave-B inclusion

---

## Cost tracking

- Plan-review iter-1: 6 reviewer agents × ~150-250K tokens each = ~1.2M tokens
- iter-2 patches: doc-only; ~0 vision spend
- Cumulative vision spend post-iter-1: still ~$2 (40% of $5 ceiling); plan authoring + review are text-based.
