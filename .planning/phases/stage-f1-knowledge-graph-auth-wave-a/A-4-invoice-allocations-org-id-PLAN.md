---
phase: stage-f1-knowledge-graph-auth-wave-a
plan: A-4
plan-name: invoice-allocations-org-id-denormalize
type: execute
status: not-started
wave: 1
depends_on: [A-3]    # migration numbering only — A-3 lands 00095, A-4 lands 00096; schema-independent otherwise
autonomous: true
halt_after: false    # wave-A QA halts collectively at GATE-A, not per-plan
threat_model_severity: medium    # RLS rewrite — regression risk if direct-filter policy diverges from JOIN-based equivalents
requirements: []
source_decision: Q10b (canonical resolution in umbrella EXPANDED-SCOPE.md §10)
files_modified:
  - supabase/migrations/00096_invoice_allocations_org_id.sql               # new
  - supabase/migrations/00096_invoice_allocations_org_id.down.sql          # new — rollback
  - supabase/migrations/00051_support_chat.sql                              # comment-only update; no DDL change
  - src/app/api/invoices/[id]/allocations/route.ts                         # add org_id to 3 INSERT sites
  - src/lib/invoices/save.ts                                                # add org_id to auto-populate INSERT
  - CLAUDE.md                                                               # Architecture Rules — Q10b codified rule + examples
  - __tests__/rls/invoice-allocations-tenant-boundary.test.ts              # new — regression test for cross-tenant read enforcement
requires:
  - .planning/expansions/stage-f1-knowledge-graph-auth-wave-a-EXPANDED-SCOPE.md  # Plan A-4 acceptance criteria
  - .planning/expansions/stage-f1-knowledge-graph-auth-EXPANDED-SCOPE.md         # umbrella Q&A — Q10b verbatim rule + rationale
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-a/CONTEXT.md             # phase context
  - .planning/audits/2026-05-12-migration-inventory.md                           # Section 5 + Section 6 (D-30 + RLS-by-join fragility concern)
  - supabase/migrations/00038_phase_b_internal_billings.sql                      # CURRENT — invoice_allocations table creation + JOIN-based RLS at lines 75-91, 191-226
  - supabase/migrations/00043_rls_owner_admin_write_parity.sql                   # CURRENT — admin/owner/accounting write policy at lines 115-120 (NO JOIN — preserved unchanged)
  - supabase/migrations/00049_platform_admin_rls_bypass.sql                      # CURRENT — RESTRICTIVE JOIN-based org isolation + delete_strict + platform_admin_read at lines 343-371
  - supabase/migrations/00051_support_chat.sql                                   # USER-scoped child reference (kept as-is; gets comment-only update at lines ~75-105)
  - supabase/migrations/00046_rls_tighten_reads.sql                              # canonical direct-filter authenticated-read pattern (lines 18-31)
  - supabase/migrations/00016_multi_tenant_foundation.sql                        # canonical direct-filter RESTRICTIVE org-isolation pattern (line 155-163)
provides:
  - invoice_allocations.org_id UUID NOT NULL column with FK to organizations(id) ON DELETE CASCADE
  - composite index (org_id, invoice_id) for tenant-bounded queries
  - direct-filter RLS policies (RESTRICTIVE org-isolation + PERMISSIVE authenticated-read + PERMISSIVE platform-admin-read + RESTRICTIVE delete-strict) replacing JOIN-based equivalents
  - tenant-boundary regression test (RLS rejects cross-tenant SELECT) — Layer 2 fixture-coverage prerequisite
  - CLAUDE.md codified Q10b rule (ORG-scoped child vs USER-scoped child)
  - comment-only documentation on support_messages migration noting user-scoped pattern intent
affects:
  - All 4 source-code INSERT paths to invoice_allocations (must pass org_id explicitly; nullable backfill phase tolerates pre-merge writes)
  - Layer 2 harness fixture-coverage assertion (Q9 D + Q10b refinement) — invoice_allocations now classified as ORG-scoped (was JOIN-scoped)
  - pg_policies row count on invoice_allocations (replaces 4 JOIN-based policies with 4 direct-filter equivalents; net zero)
acceptance-criteria-target: 6 falsifiable items (verbatim from Wave-A EXPANDED-SCOPE.md §Plan A-4 acceptance)
estimated-duration: 0.5 day

must_haves:
  truths:
    - "invoice_allocations table has a non-null org_id UUID column referencing organizations(id) with ON DELETE CASCADE"
    - "Composite index idx_invoice_allocations_org_id_invoice_id on (org_id, invoice_id) exists"
    - "All 4 JOIN-based RLS policies on invoice_allocations (RESTRICTIVE org isolation, PERMISSIVE authenticated read, PERMISSIVE platform_admin_read, RESTRICTIVE delete_strict) are replaced with direct-filter equivalents using org_id = app_private.user_org_id()"
    - "Role-based write policy (admin owner accounting write invoice_allocations from 00043:118-120) is UNCHANGED — does not join, no rewrite needed"
    - "Cross-tenant SELECT on invoice_allocations returns 0 rows (RLS boundary preserved post-rewrite) — proven by regression test"
    - "All 4 source-code INSERT call sites (save.ts:536, allocations/route.ts:116, allocations/route.ts:141, allocations/route.ts:269) pass org_id explicitly"
    - "support_messages migration file (00051) contains a comment block near its RLS policies documenting the USER-scoped pattern as intentional per Q10b codified rule"
    - "CLAUDE.md Architecture Rules section contains the Q10b codified rule with three categorical examples (primary entity / ORG-scoped child / USER-scoped child)"
    - "npm run build + npx tsc --noEmit clean; harness Layer 1 (mechanical + DOM) green; Drummond grep gate silent"
  artifacts:
    - path: "supabase/migrations/00096_invoice_allocations_org_id.sql"
      provides: "org_id column add (nullable initially) + backfill from invoices + ALTER NOT NULL + FK + composite index + RLS policy rewrite (drop 4 JOIN-based + create 4 direct-filter equivalents)"
      contains: "ALTER TABLE public.invoice_allocations ADD COLUMN org_id UUID"
    - path: "supabase/migrations/00096_invoice_allocations_org_id.down.sql"
      provides: "Rollback — restore 4 JOIN-based RLS policies + drop 4 direct-filter policies + drop NOT NULL constraint + drop FK + drop column (index drops with column)"
      contains: "DROP POLICY"
    - path: "supabase/migrations/00051_support_chat.sql"
      provides: "Comment-only documentation update near support_messages RLS policies (no DDL change)"
      contains: "Q10b codified rule"
    - path: "CLAUDE.md"
      provides: "Q10b codified rule + 3 categorical examples in Architecture Rules section"
      contains: "Child entity scope-axis rule"
    - path: "__tests__/rls/invoice-allocations-tenant-boundary.test.ts"
      provides: "Regression test — authenticated user from org A attempts SELECT on invoice_allocations rows belonging to org B; asserts 0 rows returned"
      contains: "user_org_id"
    - path: "src/lib/invoices/save.ts"
      provides: "Auto-populate INSERT path passes org_id (line 536 area)"
      contains: "org_id: orgId"
    - path: "src/app/api/invoices/[id]/allocations/route.ts"
      provides: "3 INSERT sites pass org_id (auto-create multi-cost-code at line ~116, single-stub at line ~141, PUT main path at line ~269)"
      contains: "org_id:"
  key_links:
    - from: "supabase/migrations/00096_invoice_allocations_org_id.sql"
      to: "supabase/migrations/00038_phase_b_internal_billings.sql (lines 191-226 JOIN-based policies)"
      via: "DROP POLICY before CREATE POLICY"
      pattern: "DROP POLICY IF EXISTS .* ON public.invoice_allocations"
    - from: "supabase/migrations/00096_invoice_allocations_org_id.sql"
      to: "supabase/migrations/00049_platform_admin_rls_bypass.sql (lines 343-371 platform admin JOIN bypass)"
      via: "DROP + CREATE replacement matching RESTRICTIVE/PERMISSIVE structure"
      pattern: "org_id = app_private.user_org_id\\(\\) OR app_private.is_platform_admin\\(\\)"
    - from: "src/lib/invoices/save.ts:536"
      to: "supabase/migrations/00096_invoice_allocations_org_id.sql (NOT NULL constraint)"
      via: "INSERT must include org_id once constraint lands"
      pattern: "invoice_allocations.*insert.*org_id"
    - from: "src/app/api/invoices/[id]/allocations/route.ts (3 INSERT sites)"
      to: "supabase/migrations/00096_invoice_allocations_org_id.sql (NOT NULL constraint)"
      via: "INSERT must include org_id"
      pattern: "from\\(.invoice_allocations.\\).insert"
    - from: "supabase/migrations/00043_rls_owner_admin_write_parity.sql (lines 115-120)"
      to: "supabase/migrations/00096_invoice_allocations_org_id.sql"
      via: "UNCHANGED — role-based write policy doesn't join; preserve verbatim"
      pattern: "admin owner accounting write invoice_allocations"
---

<objective>
Denormalize `invoice_allocations.org_id` per Q10b codified rule: add `org_id NOT NULL` column with FK to organizations + composite index + direct-filter RLS replacing the existing JOIN-through-invoices pattern. Documents support_messages' USER-scoped pattern as intentional via comment-only update on 00051. Codifies the ORG-scoped-child vs USER-scoped-child rule in CLAUDE.md Architecture Rules so future child detail tables choose the right pattern by default.

Purpose: closes the audit Section 5 concern that `invoice_allocations` is the only ORG-scoped child entity still relying on RLS-by-join, which is fragile (audit notes: "if a future migration adds invoice_allocations.org_id for performance, the join-based policies need to be replaced"). The denormalization also enables composite-index query plans for cost-intel work in F5 (Price Intel) where allocations-by-org will become a hot path.

Output:
- 1 new migration (`00096_invoice_allocations_org_id.sql`) + paired down migration
- 1 comment-only edit to existing 00051 migration documenting the user-scoped pattern intent
- CLAUDE.md Architecture Rules updated with Q10b codified rule
- 4 source-code INSERT sites updated to pass org_id
- 1 new regression test verifying cross-tenant boundary still enforced post-RLS-rewrite
</objective>

<scope>

**Inclusions:**
1. Add `org_id` column (nullable initially) → backfill from `invoices.org_id` → ALTER NOT NULL.
2. Add FK constraint `org_id REFERENCES organizations(id) ON DELETE CASCADE`.
3. Add composite index `(org_id, invoice_id)`.
4. Drop 4 JOIN-based RLS policies on `invoice_allocations`:
   - RESTRICTIVE `"org isolation"` (last updated at `00049:345-360` — includes platform_admin OR-clause)
   - PERMISSIVE `"authenticated read invoice_allocations"` (`00038:211-220`)
   - PERMISSIVE `"invoice_allocations_platform_admin_read"` (`00049:370-371`)
   - RESTRICTIVE `"invoice_allocations_delete_strict"` (`00049:361-369`)
5. Create 4 direct-filter equivalents mirroring the structure (RESTRICTIVE/PERMISSIVE shape preserved; only the predicate changes from `EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_allocations.invoice_id AND i.org_id = app_private.user_org_id())` to `invoice_allocations.org_id = app_private.user_org_id()`).
6. PRESERVE unchanged the role-based write policy `"admin owner accounting write invoice_allocations"` from `00043:118-120` (it filters on role, not org_id, and does not join — no rewrite needed).
7. Update 4 source-code INSERT sites to include `org_id` explicitly so post-NOT-NULL writes succeed:
   - `src/lib/invoices/save.ts:536-541` (auto-populate after invoice save)
   - `src/app/api/invoices/[id]/allocations/route.ts:115-118` (GET auto-create when line items split)
   - `src/app/api/invoices/[id]/allocations/route.ts:140-149` (GET legacy single-stub fallback)
   - `src/app/api/invoices/[id]/allocations/route.ts:262-271` (PUT replacement set)
8. Comment-only documentation block on `supabase/migrations/00051_support_chat.sql` near the support_messages RLS policies (lines ~75-105) noting USER-scoped pattern intent per Q10b.
9. CLAUDE.md Architecture Rules append the Q10b codified rule with 3 categorical examples.
10. New regression test `__tests__/rls/invoice-allocations-tenant-boundary.test.ts` verifying cross-tenant SELECT returns 0 rows (closes acceptance criterion #3).

**Exclusions (out of scope for A-4):**
- Renaming or restructuring `invoice_allocations` (column rename, FK changes beyond org_id, schema shape changes).
- Touching `support_messages` DDL — comment-only update on its source migration file only.
- Layer 2 harness fixture-coverage assertion implementation (Q9 D + refinement) — that's Wave-B Plan B-7 territory; this plan only adds the org_id column that the refined contract will rely on.
- Type generation (`database.types.ts` regenerate) — Wave-B Plan B-7 pipeline.
- Backfilling fixture rows in fixture-harness-org for invoice_allocations (no rows currently exist in fixture-harness-org for invoice_allocations per audit row count; create-row-in-migration not in scope here; deferred to Wave-B fixture-maintenance contract).

</scope>

<implementation_tasks>

**Task ordering note:** All sub-tasks of this plan execute in a single migration (00096) plus paired code changes. The migration runs in a single transaction (BEGIN/COMMIT); RLS rewrite is atomic with the column add. The 4 src/ INSERT updates land in the same commit as the migration so that staging-then-prod migration application doesn't expose a window where INSERTs fail. The regression test + CLAUDE.md + 00051 comment can land in the same PR or follow-on commit.

### Task 1: Author migration `00096_invoice_allocations_org_id.sql`

File: `supabase/migrations/00096_invoice_allocations_org_id.sql` (new)

Wraps all DDL in `BEGIN` / `COMMIT`. Idempotent (`IF NOT EXISTS`, `IF EXISTS`) where supported.

Migration steps in order:
1. `ALTER TABLE public.invoice_allocations ADD COLUMN IF NOT EXISTS org_id UUID;` — initially nullable so backfill can run before the NOT NULL flip.
2. Backfill: `UPDATE public.invoice_allocations a SET org_id = i.org_id FROM public.invoices i WHERE a.invoice_id = i.id AND a.org_id IS NULL;`
   - Uses join form (not correlated subquery) for postgres planner clarity + single-pass execution.
   - Filters `a.org_id IS NULL` so re-running the migration on an already-backfilled table is a no-op.
3. Verify backfill complete (DO block, fails loud if any rows remain unbackfilled — protects against parent-row-missing edge cases):
   ```sql
   DO $$
   DECLARE missing_count BIGINT;
   BEGIN
     SELECT COUNT(*) INTO missing_count
       FROM public.invoice_allocations
      WHERE org_id IS NULL AND deleted_at IS NULL;
     IF missing_count > 0 THEN
       RAISE EXCEPTION 'invoice_allocations backfill incomplete: % rows have NULL org_id. '
         'Check for orphaned invoice_allocations rows (invoice_id pointing to deleted invoice).',
         missing_count;
     END IF;
   END $$;
   ```
4. `ALTER TABLE public.invoice_allocations ALTER COLUMN org_id SET NOT NULL;`
5. `ALTER TABLE public.invoice_allocations ADD CONSTRAINT invoice_allocations_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;`
6. `CREATE INDEX IF NOT EXISTS idx_invoice_allocations_org_id_invoice_id ON public.invoice_allocations (org_id, invoice_id);` — composite index supports both `WHERE org_id = ?` and `WHERE org_id = ? AND invoice_id = ?` query plans (left-prefix coverage). Replaces no existing index; the existing single-column `idx_invoice_allocations_invoice_id` (from `00038:88-89`) is preserved (still useful for cross-tenant joins via service role).
7. Drop 4 JOIN-based RLS policies:
   - `DROP POLICY IF EXISTS "org isolation" ON public.invoice_allocations;`
   - `DROP POLICY IF EXISTS "authenticated read invoice_allocations" ON public.invoice_allocations;`
   - `DROP POLICY IF EXISTS "invoice_allocations_platform_admin_read" ON public.invoice_allocations;`
   - `DROP POLICY IF EXISTS "invoice_allocations_delete_strict" ON public.invoice_allocations;`
8. Create 4 direct-filter equivalents (mirroring 00049's pattern used on every other ORG-scoped table — e.g., `jobs` at 00049:223-233):
   - RESTRICTIVE `"org isolation"` FOR ALL: `USING (org_id = app_private.user_org_id() OR app_private.is_platform_admin()) WITH CHECK (org_id = app_private.user_org_id())`
   - RESTRICTIVE `"invoice_allocations_delete_strict"` FOR DELETE: `USING (org_id = app_private.user_org_id())`
   - PERMISSIVE `"authenticated read invoice_allocations"` FOR SELECT TO authenticated: `USING (org_id = app_private.user_org_id())`
   - PERMISSIVE `"invoice_allocations_platform_admin_read"` FOR SELECT: `USING (app_private.is_platform_admin())`

The role-based write policy `"admin owner accounting write invoice_allocations"` from `00043:118-120` is INTENTIONALLY UNTOUCHED — its predicate is `app_private.user_role() IN ('admin','owner','accounting')` and does not join through invoices, so it doesn't need a rewrite. RLS still enforces tenant boundary via the RESTRICTIVE policy regardless of which role policy permits the write.

Verification queries (commented at end of migration; standard pattern):
- All 4 new policies present in pg_policies
- No policy on invoice_allocations references `invoices` (proves the JOIN rewrite is complete)
- `idx_invoice_allocations_org_id_invoice_id` exists
- `invoice_allocations.org_id` is NOT NULL
- Row count check: `SELECT COUNT(*) FROM invoice_allocations WHERE org_id IS NULL` = 0
- Optional: `EXPLAIN ANALYZE SELECT * FROM invoice_allocations WHERE org_id = '00000000-0000-0000-0000-000000000001' AND invoice_id = '<some_uuid>'` should use the composite index

### Task 2: Author down migration `00096_invoice_allocations_org_id.down.sql`

File: `supabase/migrations/00096_invoice_allocations_org_id.down.sql` (new)

**Critical:** the down migration MUST restore the EXACT JOIN-based policies that exist immediately before 00096 runs (i.e., post-00049 state for the RESTRICTIVE / PERMISSIVE platform-admin-read / RESTRICTIVE delete-strict + post-00038 state for the PERMISSIVE authenticated-read). If the down migration's policy text diverges from the pre-00096 state, emergency rollback would leave the schema in a different RLS posture than where it started.

Per project convention (R.16 / commit 4fd3e7d) `.down.sql` files document emergency rollback paths and are NOT applied to production automatically. The down migration is preserved for archaeology + worst-case manual rollback.

Steps (reverse order of up-migration):
1. Drop 4 direct-filter policies created in Task 1.
2. CREATE the 4 JOIN-based policies as they existed pre-00096 (i.e., as defined in 00038 + 00049 — see "Migration .down.sql preview" below for exact SQL).
3. `ALTER TABLE public.invoice_allocations ALTER COLUMN org_id DROP NOT NULL;`
4. `ALTER TABLE public.invoice_allocations DROP CONSTRAINT IF EXISTS invoice_allocations_org_id_fkey;`
5. `ALTER TABLE public.invoice_allocations DROP COLUMN IF EXISTS org_id;` (this drops `idx_invoice_allocations_org_id_invoice_id` automatically — column drop cascades to indexes that include the column).

### Task 3: Update source-code INSERT sites to pass org_id

#### Task 3a: `src/lib/invoices/save.ts:530-547`

Current (line 534-541):
```typescript
if (matchedCostCode?.id && totalAmountCents > 0) {
  try {
    await supabase.from("invoice_allocations").insert({
      invoice_id: invoiceId,
      cost_code_id: matchedCostCode.id,
      amount_cents: totalAmountCents,
      description: parsed.description ?? null,
    });
```

Change: add `org_id: orgId,` to the insert object. `orgId` is already in scope (used at line 514 for invoice_line_items).

#### Task 3b: `src/app/api/invoices/[id]/allocations/route.ts:107-118` (auto-create multi-cost-code split)

Current (line 107-114):
```typescript
const toInsert = Array.from(groups.entries()).map(
  ([cost_code_id, g]) => ({
    invoice_id: invoice.id,
    cost_code_id,
    amount_cents: g.amount_cents,
    description: g.description,
  })
);
```

Change: add `org_id: membership.org_id,` to the per-row object inside the map. `membership.org_id` is in scope via the `getCurrentMembership()` call at line 29.

#### Task 3c: `src/app/api/invoices/[id]/allocations/route.ts:140-149` (legacy single-stub fallback)

Current (line 140-149):
```typescript
const { data: inserted } = await supabase
  .from("invoice_allocations")
  .insert({
    invoice_id: invoice.id,
    cost_code_id: invoice.cost_code_id,
    amount_cents: invoice.total_amount,
    description: invoice.description ?? null,
  })
  .select("id, invoice_id, cost_code_id, amount_cents, description, created_at")
  .single();
```

Change: add `org_id: membership.org_id,` to the insert object.

#### Task 3d: `src/app/api/invoices/[id]/allocations/route.ts:262-271` (PUT main replacement path)

Current (line 262-270):
```typescript
const toInsert = body.allocations.map((a) => ({
  invoice_id: context.params.id,
  cost_code_id: a.cost_code_id,
  amount_cents: Math.round(a.amount_cents ?? 0),
  description: a.description ?? null,
}));
const { error: insErr } = await supabase
  .from("invoice_allocations")
  .insert(toInsert);
```

Change: add `org_id: membership.org_id,` to the per-row object inside the map.

**Verification of all 4 src changes:** grep `from\(.invoice_allocations.\)\.insert` across `src/` should return only call sites that include `org_id` in the inserted object. The single SELECT-only call site at `src/lib/support/tool-handlers.ts:112` requires no change (it's a `.select()` query, not `.insert()`).

### Task 4: Comment-only update on `supabase/migrations/00051_support_chat.sql`

File: `supabase/migrations/00051_support_chat.sql` (modify in place; NO DDL change)

Insert a comment block immediately above the `support_messages` RLS policies (currently at lines 75-92, right after the `-- Messages inherit via conversation ownership` header at line 75).

The comment block documents that the user-scoped pattern (RLS-by-join through `support_conversations`) is intentional per the Q10b codified rule:

```sql
-- ---------------------------------------------------------------
-- support_messages RLS uses RLS-by-join via support_conversations
-- INTENTIONALLY (Q10b codified rule; CLAUDE.md Architecture Rules):
--   support_messages is a USER-scoped child entity — the parent
--   conversation is owned by auth.uid(), not by an org-bounded
--   workflow. The join is strict: single parent FK (conversation_id)
--   + ON DELETE CASCADE + support_conversations has proper user_id
--   RLS at line 57-73. Adding org_id to support_messages would be a
--   redundant column with no query-path benefit (every meaningful
--   support_messages query is already filtered by conversation_id,
--   which itself is user-bounded).
--
-- For ORG-scoped children (e.g., invoice_allocations post-00096):
--   the rule is the opposite — denormalize org_id from day one and
--   use direct-filter RLS. invoice_allocations was migrated to that
--   posture in migration 00096.
-- ---------------------------------------------------------------
```

The comment is placed BEFORE the `CREATE POLICY "support_messages_user_read"` policy block at line 76. No DDL is changed.

### Task 5: Update CLAUDE.md Architecture Rules with Q10b codified rule

File: `CLAUDE.md` (modify in place)

Find the "Architecture Rules (Non-Negotiable)" section heading and append the Q10b codified rule beneath the existing bullet "Every record: `id` (UUID), `created_at`, ...". Place it after the existing `**Multi-tenant RLS is non-negotiable**` paragraph in the "Nightwork standing rules > Architecture posture" section so the rule lives next to its sibling.

New addition (verbatim text per CONTEXT prompt + umbrella EXPANDED-SCOPE §2):

```markdown
- **Child entity scope-axis rule (per Q10b):**
  - **Every primary tenant entity** has `org_id NOT NULL` + direct-filter RLS.
  - **ORG-scoped child detail tables** (relationship: child belongs to an org-scoped parent; queries are org-driven): get `org_id` from day one + direct-filter RLS. Example: `invoice_allocations` post-migration 00096 — org context flows from parent invoice via column denormalization, RLS filters directly on `invoice_allocations.org_id`.
  - **USER-scoped child detail tables** (relationship: user owns conversation/thread/etc.; queries are user-driven): may RLS-by-join when relationship is strict (single parent FK + ON DELETE CASCADE + parent has proper RLS). Example: `support_messages` joins to `support_conversations` filtering on `user_id = auth.uid()` — see `supabase/migrations/00051_support_chat.sql` comment block.
  - **Anything else:** case-by-case in code review.
```

The rule is placed where existing reviewers naturally look when adding new child tables, so the next child-entity migration picks the right pattern by default rather than discovering the rule at audit time.

### Task 6: Author regression test `__tests__/rls/invoice-allocations-tenant-boundary.test.ts`

File: `__tests__/rls/invoice-allocations-tenant-boundary.test.ts` (new)

Test contract: prove that after 00096 lands, a user authenticated as org A cannot SELECT invoice_allocations rows belonging to org B. This is the regression-prevention test for acceptance criterion #3.

Test structure (npx tsx test runner; same harness as existing `__tests__/_runner.ts`):

```typescript
// __tests__/rls/invoice-allocations-tenant-boundary.test.ts
//
// Regression test for migration 00096: invoice_allocations org_id denormalize.
// Proves direct-filter RLS still enforces tenant boundary post-rewrite from
// JOIN-based to direct-filter equivalents.
//
// Setup assumption: two fixture orgs (fixture-harness-org and Ross Built, or
// two synthetic test orgs) each have ≥1 invoice + ≥1 invoice_allocation row.
// If fixture coverage is missing, the test SKIPS with a TODO message routing
// to the Wave-B fixture-maintenance contract work.

import { createClient } from "@supabase/supabase-js";
import { test } from "../_runner";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

test("RLS: invoice_allocations enforces tenant boundary post-00096", async () => {
  // Use service-role client to inspect cross-org row presence (bypasses RLS).
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Find two distinct org_ids that both have invoice_allocations rows.
  const { data: orgRowCounts, error } = await admin
    .from("invoice_allocations")
    .select("org_id", { count: "exact", head: false })
    .is("deleted_at", null);
  if (error) throw error;

  const orgIdsWithRows = [...new Set((orgRowCounts ?? []).map((r) => r.org_id))];
  if (orgIdsWithRows.length < 2) {
    console.warn(
      "SKIP: invoice_allocations needs rows in ≥2 orgs for cross-tenant test. " +
      "Wave-B fixture-maintenance contract should seed coverage."
    );
    return; // skip rather than fail — fixture coverage gap is Wave-B work
  }

  const [orgA, orgB] = orgIdsWithRows;

  // Sign in as a member of orgA (use a test user pre-seeded in fixture-harness-org
  // or skip if not present).
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const testEmail = `harness-fixture@nightwork.local`;
  const testPassword = process.env.HARNESS_FIXTURE_PASSWORD;
  if (!testPassword) {
    console.warn("SKIP: HARNESS_FIXTURE_PASSWORD not set; cannot exercise RLS as authenticated user.");
    return;
  }
  const { error: signinErr } = await userClient.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });
  if (signinErr) throw new Error(`Cannot sign in as harness-fixture: ${signinErr.message}`);

  // Determine which org this user belongs to (via org_members table).
  const { data: userMembership } = await userClient
    .from("org_members")
    .select("org_id")
    .limit(1)
    .single();
  const userOrgId = userMembership!.org_id;

  // Find the OTHER org (cross-tenant target).
  const targetOrgId = orgIdsWithRows.find((id) => id !== userOrgId);
  if (!targetOrgId) {
    console.warn("SKIP: harness-fixture user's org has all invoice_allocations rows; no cross-tenant target.");
    return;
  }

  // Attempt cross-tenant SELECT — RLS must reject.
  const { data: crossTenantRows, error: queryErr } = await userClient
    .from("invoice_allocations")
    .select("id, org_id")
    .eq("org_id", targetOrgId);

  if (queryErr) {
    throw new Error(`Unexpected query error: ${queryErr.message}`);
  }

  if ((crossTenantRows ?? []).length > 0) {
    throw new Error(
      `RLS BOUNDARY VIOLATION: user from org ${userOrgId} read ${crossTenantRows!.length} ` +
      `invoice_allocations rows from org ${targetOrgId}. Direct-filter RLS broken post-00096.`
    );
  }

  // Sanity check: SELECT for own org returns >0 rows.
  const { data: ownRows } = await userClient
    .from("invoice_allocations")
    .select("id")
    .eq("org_id", userOrgId);

  if ((ownRows ?? []).length === 0) {
    throw new Error(
      `RLS posture suspicious: user from org ${userOrgId} got 0 rows for own org. ` +
      `Either fixture coverage is missing or RLS rejects own org too (broken).`
    );
  }
});
```

The test SKIPs (rather than fails) when fixture coverage is missing — Wave-B Plan B-6 (cost-code wipe-and-reseed + fixture-maintenance contract codification) will guarantee coverage. The current row count of 52 invoice_allocations rows (per audit Section 2) means at least one org has rows; if all 52 are in a single org (Ross Built canonical `'00000000-0000-0000-0000-000000000001'`), the test SKIPs but the migration still lands. The skip-vs-fail posture matches harness Layer 2's "fixture-coverage missing → WARN" convention.

If the harness convention is "RLS regression tests must always run", the alternative is for this plan to seed a synthetic second-org row into fixture-harness-org as part of the migration — that's a fixture-maintenance-contract pattern that Wave-B is explicitly chartered for, so deferring here is correct.

</implementation_tasks>

<migration_preview>

### `supabase/migrations/00096_invoice_allocations_org_id.sql` (full)

```sql
-- ===========================================================================
-- 00096_invoice_allocations_org_id.sql
-- ===========================================================================
--
-- Denormalize org_id onto invoice_allocations per Q10b codified rule
-- (CLAUDE.md Architecture Rules; .planning/expansions/stage-f1-knowledge-graph-
-- auth-EXPANDED-SCOPE.md §10 Q10b).
--
-- BEFORE this migration:
--   invoice_allocations is org-scoped via RLS-by-join through invoices.org_id.
--   Policies defined in 00038 (initial) + 00043 (write policy) + 00049
--   (platform_admin bypass).
--
-- AFTER this migration:
--   invoice_allocations has org_id NOT NULL column with FK to organizations.
--   Composite index (org_id, invoice_id) added for tenant-bounded queries.
--   4 JOIN-based RLS policies replaced with direct-filter equivalents using
--   org_id = app_private.user_org_id(). RESTRICTIVE / PERMISSIVE structure
--   preserved.
--
-- Role-based write policy from 00043 (admin owner accounting write
-- invoice_allocations) is UNCHANGED — its predicate is role-only and does
-- not join through invoices; tenant boundary remains enforced by the
-- RESTRICTIVE policy regardless of which role policy permits the write.
--
-- Source code INSERT call sites updated in same commit to pass org_id
-- explicitly so post-NOT-NULL writes succeed:
--   - src/lib/invoices/save.ts:536
--   - src/app/api/invoices/[id]/allocations/route.ts (3 INSERT sites)
--
-- TARGET: DEV Supabase (egxkffodxcefwpqmwrur) ONLY.
-- DO NOT APPLY TO PROD (vnpqjderiuhsiiygfwfb).
-- ===========================================================================

BEGIN;

-- =========================================================================
-- 1. Add org_id column (nullable initially for backfill)
-- =========================================================================

ALTER TABLE public.invoice_allocations
  ADD COLUMN IF NOT EXISTS org_id UUID;


-- =========================================================================
-- 2. Backfill from invoices.org_id
-- =========================================================================
-- Single-pass join form (planner clarity). Filters a.org_id IS NULL so a
-- re-run on an already-backfilled table is a no-op.

UPDATE public.invoice_allocations a
   SET org_id = i.org_id
  FROM public.invoices i
 WHERE a.invoice_id = i.id
   AND a.org_id IS NULL;


-- =========================================================================
-- 3. Verify backfill complete (fail-loud on orphaned rows)
-- =========================================================================
-- An orphan invoice_allocations row (invoice_id points to a deleted invoice
-- that was hard-deleted somehow) would leave org_id NULL after the UPDATE.
-- Better to fail the migration than silently land an unenforced NOT NULL.

DO $$
DECLARE missing_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO missing_count
    FROM public.invoice_allocations
   WHERE org_id IS NULL;
  IF missing_count > 0 THEN
    RAISE EXCEPTION 'invoice_allocations backfill incomplete: % rows have NULL org_id. '
      'Investigate orphaned rows (invoice_id pointing to missing/hard-deleted invoice). '
      'Migration aborted.', missing_count;
  END IF;
END $$;


-- =========================================================================
-- 4. Enforce NOT NULL + add FK
-- =========================================================================

ALTER TABLE public.invoice_allocations
  ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE public.invoice_allocations
  ADD CONSTRAINT invoice_allocations_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- =========================================================================
-- 5. Composite index for tenant-bounded queries
-- =========================================================================
-- (org_id, invoice_id) supports both WHERE org_id = ? (e.g., tenant-bounded
-- aggregations in F5 Price Intel) and WHERE org_id = ? AND invoice_id = ?
-- (the typical UI fetch path) via left-prefix coverage.
-- Existing idx_invoice_allocations_invoice_id (from 00038:88-89) is preserved.

CREATE INDEX IF NOT EXISTS idx_invoice_allocations_org_id_invoice_id
  ON public.invoice_allocations (org_id, invoice_id);


-- =========================================================================
-- 6. Drop 4 JOIN-based RLS policies
-- =========================================================================
-- These exist (in order of original creation):
--   - 00038:193-209 "org isolation" RESTRICTIVE FOR ALL (JOIN through invoices)
--   - 00038:211-220 "authenticated read invoice_allocations" PERMISSIVE SELECT (JOIN)
--   - 00049:345-360 (REPLACES the 00038 "org isolation" with platform_admin OR-clause; still JOIN)
--   - 00049:361-369 "invoice_allocations_delete_strict" RESTRICTIVE FOR DELETE (JOIN)
--   - 00049:370-371 "invoice_allocations_platform_admin_read" PERMISSIVE FOR SELECT
--
-- Drop all 4. Recreate as direct-filter equivalents in Step 7.

DROP POLICY IF EXISTS "org isolation" ON public.invoice_allocations;
DROP POLICY IF EXISTS "authenticated read invoice_allocations" ON public.invoice_allocations;
DROP POLICY IF EXISTS "invoice_allocations_delete_strict" ON public.invoice_allocations;
DROP POLICY IF EXISTS "invoice_allocations_platform_admin_read" ON public.invoice_allocations;


-- =========================================================================
-- 7. Create 4 direct-filter equivalents
-- =========================================================================
-- Pattern mirrors 00049's canonical RESTRICTIVE-org-isolation + delete-strict
-- + PERMISSIVE-platform-admin-read trio used on jobs / invoices / vendors /
-- etc. (see e.g. 00049:223-233 for jobs).
--
-- The 00038-era PERMISSIVE "authenticated read" is also restored here as a
-- direct-filter equivalent (per 00046 canonical defense-in-depth pattern).
--
-- The role-based write policy from 00043:118-120 ("admin owner accounting
-- write invoice_allocations") is INTENTIONALLY UNTOUCHED — its predicate
-- is role-only and does not join. Tenant boundary is enforced by the
-- RESTRICTIVE policy below regardless of which role policy permits writes.

CREATE POLICY "org isolation" ON public.invoice_allocations
  AS RESTRICTIVE FOR ALL
  USING (org_id = app_private.user_org_id() OR app_private.is_platform_admin())
  WITH CHECK (org_id = app_private.user_org_id());

CREATE POLICY "invoice_allocations_delete_strict" ON public.invoice_allocations
  AS RESTRICTIVE FOR DELETE
  USING (org_id = app_private.user_org_id());

CREATE POLICY "authenticated read invoice_allocations" ON public.invoice_allocations
  FOR SELECT TO authenticated
  USING (org_id = app_private.user_org_id());

CREATE POLICY "invoice_allocations_platform_admin_read" ON public.invoice_allocations
  FOR SELECT USING (app_private.is_platform_admin());


COMMIT;


-- ===========================================================================
-- VERIFICATION QUERIES (run after applying)
-- ===========================================================================
--
-- 1. org_id column is NOT NULL:
--    SELECT column_name, is_nullable, data_type
--      FROM information_schema.columns
--     WHERE table_name = 'invoice_allocations' AND column_name = 'org_id';
--    Expected: is_nullable = NO, data_type = uuid
--
-- 2. FK exists:
--    SELECT constraint_name FROM information_schema.table_constraints
--     WHERE table_name = 'invoice_allocations'
--       AND constraint_name = 'invoice_allocations_org_id_fkey';
--    Expected: 1 row
--
-- 3. Composite index exists:
--    SELECT indexname FROM pg_indexes
--     WHERE tablename = 'invoice_allocations'
--       AND indexname = 'idx_invoice_allocations_org_id_invoice_id';
--    Expected: 1 row
--
-- 4. 4 direct-filter policies present (per pg_policies):
--    SELECT policyname, permissive, cmd FROM pg_policies
--     WHERE tablename = 'invoice_allocations'
--     ORDER BY policyname;
--    Expected at minimum:
--      - "admin owner accounting write invoice_allocations" (PERMISSIVE ALL) — unchanged from 00043
--      - "authenticated read invoice_allocations" (PERMISSIVE SELECT)
--      - "invoice_allocations_delete_strict" (RESTRICTIVE DELETE)
--      - "invoice_allocations_platform_admin_read" (PERMISSIVE SELECT)
--      - "org isolation" (RESTRICTIVE ALL)
--    (5 rows; was 5 pre-migration with different predicates — net zero policy count, posture change is JOIN → direct-filter.)
--
-- 5. No policy still joins through invoices (proves the rewrite is complete):
--    SELECT policyname, qual, with_check FROM pg_policies
--     WHERE tablename = 'invoice_allocations'
--       AND (qual LIKE '%invoices%' OR with_check LIKE '%invoices%');
--    Expected: 0 rows
--
-- 6. No NULL org_id rows:
--    SELECT COUNT(*) FROM public.invoice_allocations WHERE org_id IS NULL;
--    Expected: 0
--
-- 7. Backfill correctness — every row's org_id matches parent invoice's org_id:
--    SELECT COUNT(*) FROM public.invoice_allocations a
--      JOIN public.invoices i ON i.id = a.invoice_id
--     WHERE a.org_id != i.org_id;
--    Expected: 0
--
-- 8. Composite index usable on representative query:
--    EXPLAIN ANALYZE SELECT id, cost_code_id, amount_cents
--      FROM invoice_allocations
--     WHERE org_id = '00000000-0000-0000-0000-000000000001'
--       AND invoice_id = (SELECT id FROM invoices LIMIT 1);
--    Expected: plan uses idx_invoice_allocations_org_id_invoice_id
--
-- ===========================================================================
-- OUT OF SCOPE
-- ===========================================================================
-- - No changes to existing columns (id / invoice_id / cost_code_id /
--   change_order_id / amount_cents / description / created_at / updated_at /
--   deleted_at).
-- - No new triggers.
-- - No data migration beyond backfill (NULL → invoices.org_id).
-- - support_messages migration (00051) gets comment-only update in same commit
--   — see commit diff.
-- - Layer 2 harness fixture-coverage assertion implementation deferred to
--   Wave-B Plan B-6 / B-7.
-- - PROD database (vnpqjderiuhsiiygfwfb): NOT touched.
-- ===========================================================================
```

</migration_preview>

<down_migration_preview>

### `supabase/migrations/00096_invoice_allocations_org_id.down.sql` (full)

```sql
-- ===========================================================================
-- 00096_invoice_allocations_org_id.down.sql
-- ===========================================================================
--
-- ROLLBACK for 00096. Per CLAUDE.md / project convention (R.16 / commit
-- 4fd3e7d), .down.sql files document emergency rollback paths and are NOT
-- applied to production automatically. This file exists for archaeology
-- + worst-case manual rollback only.
--
-- CRITICAL: this down migration restores the EXACT pre-00096 RLS posture
-- (the post-00049 + post-00043 + post-00038 state). If the rollback policy
-- text diverges from the pre-00096 state, emergency rollback would leave
-- the schema in a different RLS posture than where it started.
--
-- Step order (reverse of up-migration):
--   1. Drop the 4 direct-filter policies created by 00096.
--   2. Recreate the 4 JOIN-based policies as they existed pre-00096.
--   3. Drop NOT NULL constraint.
--   4. Drop FK constraint.
--   5. Drop org_id column (composite index drops with the column).
--
-- The role-based write policy from 00043 (admin owner accounting write
-- invoice_allocations) is NOT touched — same as the up-migration.
-- ===========================================================================

BEGIN;

-- =========================================================================
-- 1. Drop direct-filter policies
-- =========================================================================

DROP POLICY IF EXISTS "org isolation" ON public.invoice_allocations;
DROP POLICY IF EXISTS "invoice_allocations_delete_strict" ON public.invoice_allocations;
DROP POLICY IF EXISTS "authenticated read invoice_allocations" ON public.invoice_allocations;
DROP POLICY IF EXISTS "invoice_allocations_platform_admin_read" ON public.invoice_allocations;


-- =========================================================================
-- 2. Recreate pre-00096 JOIN-based policies
-- =========================================================================
-- Verbatim from:
--   - 00049:345-360 (RESTRICTIVE "org isolation" FOR ALL with JOIN + platform_admin OR-clause)
--   - 00049:361-369 (RESTRICTIVE "invoice_allocations_delete_strict" FOR DELETE with JOIN)
--   - 00049:370-371 (PERMISSIVE "invoice_allocations_platform_admin_read" FOR SELECT)
--   - 00038:211-220 (PERMISSIVE "authenticated read invoice_allocations" FOR SELECT with JOIN)

CREATE POLICY "org isolation"
  ON public.invoice_allocations
  AS RESTRICTIVE FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
       WHERE i.id = invoice_allocations.invoice_id
         AND i.org_id = app_private.user_org_id()
    ) OR app_private.is_platform_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
       WHERE i.id = invoice_allocations.invoice_id
         AND i.org_id = app_private.user_org_id()
    )
  );

CREATE POLICY "invoice_allocations_delete_strict"
  ON public.invoice_allocations
  AS RESTRICTIVE FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
       WHERE i.id = invoice_allocations.invoice_id
         AND i.org_id = app_private.user_org_id()
    )
  );

CREATE POLICY "authenticated read invoice_allocations"
  ON public.invoice_allocations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
       WHERE i.id = invoice_allocations.invoice_id
         AND i.org_id = app_private.user_org_id()
    )
  );

CREATE POLICY "invoice_allocations_platform_admin_read"
  ON public.invoice_allocations
  FOR SELECT USING (app_private.is_platform_admin());


-- =========================================================================
-- 3. Drop NOT NULL constraint
-- =========================================================================

ALTER TABLE public.invoice_allocations
  ALTER COLUMN org_id DROP NOT NULL;


-- =========================================================================
-- 4. Drop FK constraint
-- =========================================================================

ALTER TABLE public.invoice_allocations
  DROP CONSTRAINT IF EXISTS invoice_allocations_org_id_fkey;


-- =========================================================================
-- 5. Drop org_id column (composite index drops automatically)
-- =========================================================================

ALTER TABLE public.invoice_allocations
  DROP COLUMN IF EXISTS org_id;


COMMIT;


-- ===========================================================================
-- POST-ROLLBACK NOTES
-- ===========================================================================
-- Source code changes (4 INSERT sites passing org_id explicitly) must ALSO
-- be reverted in the rollback commit. The src/ INSERTs will fail with
-- "column org_id does not exist" once this down migration lands until the
-- INSERT signatures are reverted. Coordinate via revert PR.
--
-- Drop-the-column is destructive in the sense that any data tied to org_id
-- evidence is lost (though every row's org_id derives from invoices.org_id,
-- which remains intact — re-running the up-migration restores org_id
-- exactly). The down migration is therefore reversible: down→up→down→up
-- preserves invoice_allocations row content.
-- ===========================================================================
```

</down_migration_preview>

<comment_only_update_preview>

### `supabase/migrations/00051_support_chat.sql` — comment-only insertion preview

Insert this comment block IMMEDIATELY ABOVE the `-- Messages inherit via conversation ownership` comment at line 75 (which is the section header for support_messages RLS policies). The CREATE TABLE / CREATE INDEX / ALTER TABLE blocks above line 75 are unchanged.

Inserted text (no DDL change; comment block only):

```sql

-- ---------------------------------------------------------------
-- support_messages RLS uses RLS-by-join via support_conversations
-- INTENTIONALLY (Q10b codified rule; CLAUDE.md Architecture Rules):
--   support_messages is a USER-scoped child entity — the parent
--   conversation is owned by auth.uid(), not by an org-bounded
--   workflow. The join is strict: single parent FK (conversation_id)
--   + ON DELETE CASCADE + support_conversations has proper user_id
--   RLS at line 57-73. Adding org_id to support_messages would be
--   a redundant column with no query-path benefit (every meaningful
--   support_messages query is already filtered by conversation_id,
--   which itself is user-bounded).
--
-- For ORG-scoped children (e.g., invoice_allocations post-00096):
--   the rule is the opposite — denormalize org_id from day one and
--   use direct-filter RLS. invoice_allocations was migrated to that
--   posture in migration 00096.
-- ---------------------------------------------------------------

-- Messages inherit via conversation ownership   ← existing line 75; unchanged
CREATE POLICY "support_messages_user_read"      ← existing line 76; unchanged
  ON public.support_messages FOR SELECT
  ...
```

This is a comment-only modification. No CREATE / ALTER / DROP statements are added or changed. The migration's behavior on apply is identical pre- and post-edit — but anyone reading the migration file (e.g., the next reviewer adding a child detail table) sees the rationale inline.

</comment_only_update_preview>

<claude_md_preview>

### `CLAUDE.md` update preview

Find this existing section in `CLAUDE.md` (currently at the top of "Nightwork standing rules > Architecture posture"):

```markdown
### Architecture posture

- **Multi-tenant RLS is non-negotiable.** Every tenant table has RLS enabled, every query filters on `org_id` from `getCurrentMembership()`. Tenant safety is built BY CONSTRUCTION, not by enforcement — design schemas and APIs so that a tenant cannot leak via this design even with a dropped RLS policy.
- **Every aggregation needs proper indexes.** Dashboard 503s on aggregations (the current pain) are an architectural smell. Any new aggregation query has an index plan in the same migration. `EXPLAIN ANALYZE` runs on representative data before merging.
- **Org-configurable, not hardcoded.** Cost code lists, fee rates, payment-schedule cutoffs, deposit %, draw revision rules, lien-release templates — anything a customer might want to change — lives in `org_settings` (or a per-org config table), not in code. Ross Built defaults seed the table; future tenants override.
- **Data portability is first-class.** Every entity must be exportable to a stable JSON contract and importable from one. Imports are idempotent (re-running with the same payload is a no-op), validated against an explicit schema, and audit-logged on both sides. Data import is a triggering event for downstream workflows (a draw can be created from imported invoice data, a budget from imported PO data, etc.) — not a one-shot migration.
```

INSERT this new bullet IMMEDIATELY AFTER the "Multi-tenant RLS is non-negotiable" bullet (so it sits with its sibling, before "Every aggregation"):

```markdown
- **Child entity scope-axis rule (per Q10b).** When adding a new child detail table, choose its tenant-isolation pattern based on its scope-axis:
  - **Every primary tenant entity** has `org_id NOT NULL` + direct-filter RLS (`org_id = app_private.user_org_id()`).
  - **ORG-scoped child detail tables** (relationship: child belongs to an org-scoped parent; queries are org-driven): get `org_id` from day one + direct-filter RLS. Example: `invoice_allocations` post-migration 00096 — org context flows from parent invoice via column denormalization, RLS filters directly on `invoice_allocations.org_id`.
  - **USER-scoped child detail tables** (relationship: user owns conversation/thread/etc.; queries are user-driven): may RLS-by-join when relationship is strict (single parent FK + ON DELETE CASCADE + parent has proper RLS). Example: `support_messages` joins to `support_conversations` filtering on `user_id = auth.uid()` — see comment block in `supabase/migrations/00051_support_chat.sql`.
  - **Anything else:** case-by-case in code review.
```

The rule is placed where existing reviewers naturally look when planning schema changes, so the next child-entity migration picks the right pattern by default rather than discovering the rule at audit time. Cross-references the two canonical examples by file path so a reviewer can read the actual SQL.

</claude_md_preview>

<acceptance_criteria>

Six falsifiable items, verbatim from `.planning/expansions/stage-f1-knowledge-graph-auth-wave-a-EXPANDED-SCOPE.md §Plan A-4 acceptance`:

1. **Migration 00096 applied:** `invoice_allocations.org_id UUID NOT NULL` added via backfill from `invoices.org_id`. Composite index `(org_id, invoice_id)` added.
   - Verification: `SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name='invoice_allocations' AND column_name='org_id'` returns `org_id, NO`. `SELECT indexname FROM pg_indexes WHERE tablename='invoice_allocations' AND indexname='idx_invoice_allocations_org_id_invoice_id'` returns 1 row.

2. **Existing JOIN-based RLS policies on `invoice_allocations` dropped; direct-filter policies on `org_id = app_private.user_org_id()` created. RESTRICTIVE org-isolation policy updated to direct-filter.**
   - Verification: `SELECT policyname, qual, with_check FROM pg_policies WHERE tablename='invoice_allocations' AND (qual LIKE '%invoices%' OR with_check LIKE '%invoices%')` returns 0 rows (no policy still joins through invoices). All 4 expected direct-filter policies present in pg_policies.

3. **Regression test verifies tenant boundary still enforced (RLS policy still rejects cross-tenant reads).**
   - Verification: `__tests__/rls/invoice-allocations-tenant-boundary.test.ts` passes (or SKIPs cleanly with documented fixture-coverage gap routing to Wave-B Plan B-6). `npm test` exit 0.

4. **Comment-only doc update on `supabase/migrations/00051_support_chat.sql`** — note that `support_messages` user-scoped pattern is intentional per Q10b codified rule.
   - Verification: `grep -c "Q10b codified rule" supabase/migrations/00051_support_chat.sql` returns ≥ 1. No DDL diff vs pre-edit version (only comment lines changed).

5. **CLAUDE.md Architecture Rules adds the Q10b codified rule with examples.**
   - Verification: `grep -c "Child entity scope-axis rule" CLAUDE.md` returns ≥ 1. The bullet is placed within the "Nightwork standing rules > Architecture posture" section.

6. **`npm run build` + harness Layer 1 + Drummond gate green.**
   - Verification: `npm run build` exits 0. `npx tsc --noEmit` exits 0. Drummond grep gate (`.githooks/pre-commit`) silent on staged changes. Harness Layer 1 (mechanical + DOM) PASS. (Layer 2 + Layer 3 covered by Wave-A QA collectively at GATE-A halt.)

</acceptance_criteria>

<verification>

### Commands to run (in order)

```bash
# 1. Apply migration to DEV Supabase (via MCP, not psql direct)
# Via mcp__supabase__apply_migration with name="invoice_allocations_org_id" and the SQL body.

# 2. Verify migration applied
# Via mcp__supabase__execute_sql:
#   SELECT column_name, is_nullable, data_type
#     FROM information_schema.columns
#    WHERE table_name = 'invoice_allocations' AND column_name = 'org_id';
# Expected: org_id, NO, uuid

# 3. Verify policies rewritten (no JOIN-based remaining)
# Via mcp__supabase__execute_sql:
#   SELECT policyname, permissive, cmd, qual
#     FROM pg_policies
#    WHERE tablename = 'invoice_allocations'
#    ORDER BY policyname;
# Expected: 5 policies; none contain "invoices" in qual or with_check.

# 4. Run typecheck + build
npx tsc --noEmit
npm run build

# 5. Run regression test
npm test
# Expected: invoice-allocations-tenant-boundary.test.ts passes or skips cleanly.

# 6. Run harness Layer 1 (mechanical + DOM)
# Via scripts/verify-phase.ts against current branch's Vercel preview URL.
# Expected: Layer 1 PASS.

# 7. Drummond grep gate
git diff --cached | grep -E "$(cat .githooks/pre-commit | grep PATTERN= | head -1)" || echo "OK — no real Drummond identifiers staged"

# 8. EXPLAIN ANALYZE the composite index (optional but recommended)
# Via mcp__supabase__execute_sql:
#   EXPLAIN ANALYZE SELECT id, cost_code_id, amount_cents
#     FROM invoice_allocations
#    WHERE org_id = (SELECT org_id FROM invoices LIMIT 1)
#      AND invoice_id = (SELECT id FROM invoices LIMIT 1);
# Expected: plan uses idx_invoice_allocations_org_id_invoice_id (Index Scan or Index Only Scan).
```

### Sanity check — backfill correctness

After migration applies, verify that every row's `org_id` matches its parent invoice's `org_id`:

```sql
SELECT COUNT(*) AS mismatched_rows
  FROM public.invoice_allocations a
  JOIN public.invoices i ON i.id = a.invoice_id
 WHERE a.org_id != i.org_id;
-- Expected: 0
```

If this returns > 0, the backfill UPDATE went wrong (or invoices.org_id changed between backfill and verification — vanishingly unlikely but worth catching).

### Drummond gate

The Drummond grep gate (`.githooks/pre-commit`) scans `src/app/design-system/_fixtures/drummond/` for unsanitized real-PII identifiers (Drummond / 501 74th / etc. per nwrp33). This plan touches NO files under that path, so the gate is silent by construction. Staged files: 6 source files + 1 new test + 2 new migration files + 1 modified migration file + CLAUDE.md. None of those paths trigger the gate.

</verification>

<dependencies>

**Sequencing constraints:**
- **A-3 must land first** for migration numbering only (A-3 lands `00095_drop_budgets.sql`; A-4 lands `00096_invoice_allocations_org_id.sql`). The two migrations are schema-independent (different tables, different columns, no FK references between them).
- **A-1 and A-2 are independent of A-4.** A-1 (00094 drop CCBL + status_history) touches different tables; A-2 (docx-html auth fix) is code-only. Can land in any order relative to A-4 (subject to migration numbering: 00094 → 00095 → 00096).

**Schema dependencies:**
- `invoices` table must exist with `org_id NOT NULL` (granted; existed since migration 00001 + 00016).
- `organizations` table must exist (granted; created in migration 00016).
- `app_private.user_org_id()` SECURITY DEFINER helper must exist (granted; defined in migration 00016 + canonical-fixed in migration 00039).
- `app_private.is_platform_admin()` SECURITY DEFINER helper must exist (granted; defined in migration 00048).

**Code dependencies:**
- The 4 source-code INSERT call sites must be updated in the SAME COMMIT as the migration. Otherwise there is a transient window where a deployed application running pre-merge code hits `NOT NULL violation on org_id` after the migration applies. Coordinate via single PR + single merge.

**Wave-B dependencies on A-4:**
- Wave-B Plan B-6 (Q9 D fixture-maintenance contract) will require ≥1 fixture row in `fixture-harness-org` for `invoice_allocations` — the column added by A-4 is a prerequisite for the Layer 2 assertion. A-4 does NOT seed fixture rows (deferred to B-6); the assertion + seed land together in B-6.
- Wave-B Plan B-7 (knowledge-graph + types pipeline) will regenerate `database.types.ts` once A-4 has landed; the regenerated types will include `org_id` on `invoice_allocations` rows. A-4 does NOT regenerate types (deferred to B-7).

</dependencies>

<rollback_strategy>

**Primary rollback path (preferred):** revert the merge commit via `git revert <sha>` + push, then apply the `00096_invoice_allocations_org_id.down.sql` migration via Supabase MCP `apply_migration`. This restores both the schema state and the source-code INSERT signatures (which would otherwise fail post-revert if the migration is still applied).

**Critical sequencing for rollback:**
1. `git revert <sha>` of the merge commit (reverts both src/ changes + migration files in the working tree, but the migration is still APPLIED to the DB).
2. Apply `00096_invoice_allocations_org_id.down.sql` to DEV Supabase via MCP. This drops the `org_id` column + restores JOIN-based RLS policies.
3. Push the revert commit. Vercel preview deploys the rolled-back code; the running app no longer sends `org_id` in INSERTs (which is correct because the column is gone).

**If the down migration fails partway through:**
- Most likely cause: a write happened between the up-migration and the rollback that depends on `org_id` (e.g., a new RLS policy somewhere else now references `invoice_allocations.org_id`).
- Recovery: investigate the dependency, drop the dependent object, re-run the down migration.
- Worst case: leave `org_id` in place (it's nullable post-down-step-3) and revert only the policies + src/ INSERT signatures. The schema would be in a hybrid state but not broken — `org_id` is now an unenforced informational column.

**Source code rollback alone (without dropping org_id):**
If only the src/ changes regress (e.g., a bug in the new INSERT signatures), revert just the src/ commits and leave the migration applied. The column would remain NOT NULL, so reverting src/ INSERTs without the column being dropped would break INSERTs — DO NOT DO THIS. Rollback must include the down migration when reverting any of the 4 INSERT call sites.

**Forward-only mitigation:**
If a defect surfaces post-merge that does NOT warrant a full rollback, write a corrective migration (00097+) rather than rolling back. Examples:
- Policy text needs adjustment → CREATE OR REPLACE the policy in a new migration.
- Missing fixture row → seed in a new migration.

</rollback_strategy>

<risk_register>

| ID | Risk | Likelihood | Severity | Mitigation |
|----|------|-----------|----------|------------|
| R1 | **RLS policy regression** — direct-filter policies fail to enforce tenant boundary; cross-tenant rows leak | Low | CRITICAL | Regression test `__tests__/rls/invoice-allocations-tenant-boundary.test.ts` proves boundary post-rewrite. Mirrors canonical pattern from 00049 (used on 30+ other tables without issue). Down migration restores prior JOIN-based posture if regression is discovered. |
| R2 | **Backfill orphans** — invoice_allocations row exists with invoice_id pointing to a missing/hard-deleted invoice; backfill leaves org_id NULL; ALTER NOT NULL fails | Very low | MEDIUM | Verification DO block in migration step 3 raises EXCEPTION with row count + remediation guidance. Migration aborts cleanly before any RLS rewrite happens. Per audit Section 2, no soft-delete-bypass hard-deletes have been observed on invoices; all rows go through `deleted_at IS NOT NULL` path. Audit shows 52 invoice_allocations rows currently. |
| R3 | **Source code INSERT regression** — one of the 4 INSERT sites is missed; production write fails with NOT NULL violation | Low | HIGH | Grep verification step in plan-execute checklist: `grep -nE "from\\(.invoice_allocations.\\)\\.insert" src/` returns exactly 4 hits, each verified to include `org_id`. Build + typecheck catches mismatched signatures at CI time. Harness Layer 1 route-status checks against Vercel preview catch runtime regressions before merge. |
| R4 | **Down migration drift** — `.down.sql` policy text diverges from pre-00096 state; emergency rollback leaves schema in different posture | Low | HIGH | Down migration policies are copy-paste verbatim from 00038 + 00049 source files (cited line ranges in the .down.sql header comment). Reviewer cross-checks the .down.sql against original migration files line-by-line. |
| R5 | **Concurrent writes during backfill** — production-style write hits invoice_allocations while UPDATE-from-invoices is in-flight; new row gets NULL org_id; verification DO block fails the migration | Very low (DEV only) | LOW | Migration runs in a single transaction; PostgreSQL row locking prevents concurrent inserts during the UPDATE. Even if a write sneaks in, the verification DO block at step 3 catches it and fails loud BEFORE the NOT NULL constraint locks in. DEV Supabase only; no production writes possible. (Production application is a separate Supabase project per migration headers.) |
| R6 | **Composite index doesn't get used** — query planner prefers existing single-column `idx_invoice_allocations_invoice_id`; new composite index is dead weight | Low | LOW | EXPLAIN ANALYZE verification query in migration footer proves index usage on representative query. If the planner doesn't pick the composite, F5 (Price Intel) will surface the slow-aggregation as an architectural smell and the index can be left as-is until F5 query patterns are clearer. Worst-case: an unused 8KB index — harmless. |
| R7 | **Q9 D fixture-coverage assertion blocks at A-4 ship time** — Layer 2 harness check expects ≥1 fixture row in fixture-harness-org for every ORG-scoped table; invoice_allocations newly ORG-scoped → assertion fails | Medium | LOW | Q9 D + Q10b refinement explicitly states "Layer 2 harness assertion implementation deferred to Wave-B Plan B-6 / B-7." A-4 establishes the column; B-6 wires the assertion + seeds the row. Until B-6 lands, the assertion is dormant. |
| R8 | **A-1 / A-2 / A-3 conflict with A-4** — overlapping policy DROPs or shared migration body | None | — | Verified during plan authoring: A-1 touches `change_order_budget_lines` / `lien_releases` / `jobs`; A-2 is code-only on docx-html route; A-3 touches `budgets` / `budget_lines` / `recalc.ts`; A-4 touches `invoice_allocations` / `support_messages` (comment) + 2 src files + CLAUDE.md. Zero overlap. Sequencing constraint is migration numbering only. |

</risk_register>

<backfill_safety>

**Current row count (per audit Section 2, line 231):** `invoice_allocations` has **52 rows** in DEV Supabase as of 2026-05-12. All 52 rows have a non-null `invoice_id` (FK enforced at table creation per `00038:79`).

**Verification attempted:** Supabase MCP query tools (`list_tables`, `execute_sql`) are documented in the env instructions but not surfaced as tool functions in this planner session. The 52-row count is taken from the migration audit (authored 2026-05-12, same day as this plan, against live production schema via `mcp__supabase__execute_sql`). If audit row count is stale (very unlikely given same-day timeline), the migration's verification DO block will catch any incomplete backfill at apply time before damaging the schema.

**Sizing analysis:**
- 52 rows is well below any concurrent-write or lock-contention threshold. The backfill UPDATE will complete in under 10ms on any reasonable Postgres.
- The verification DO block in migration step 3 is the safety net: if any row remains NULL post-backfill (e.g., orphan with deleted parent invoice), the migration aborts cleanly before the NOT NULL constraint locks in.

**Concurrent-write considerations:**
- Migration runs in a single transaction (BEGIN/COMMIT). PostgreSQL holds an `ACCESS EXCLUSIVE LOCK` on `invoice_allocations` during the `ALTER TABLE ALTER COLUMN ... SET NOT NULL` step (briefly), which serializes against any concurrent INSERTs.
- DEV Supabase has no real user traffic during a planned migration window; the only concurrent writers would be other migration scripts or harness fixture seeding — neither of which run during the migration apply window.
- Production database (vnpqjderiuhsiiygfwfb) is NOT touched by this plan per migration header (`TARGET: DEV Supabase (egxkffodxcefwpqmwrur) ONLY`). Production migration timing is a separate decision (per audit Section 1 footer + project deployment posture).

**Migration apply time estimate:** < 1 second total. Steps:
- Column add (zero data): instant
- 52-row UPDATE backfill: ~10ms
- Verification DO block: ~5ms
- ALTER NOT NULL: ~20ms
- ADD CONSTRAINT FK: ~30ms (with 52 rows to validate)
- CREATE INDEX: ~50ms
- 4 DROP POLICY: ~10ms each = 40ms
- 4 CREATE POLICY: ~10ms each = 40ms

Total: ~200ms. Well within any reasonable migration timeout. No concurrent-write window to worry about.

**Per CLAUDE.md "Recalculate, don't increment":** `org_id` is NOT a computed running total — it's a denormalized FK that mirrors `invoices.org_id` (the source of truth). The migration explicitly checks `a.org_id != i.org_id` returns 0 rows post-backfill (verification step 7). Future maintenance: if `invoices.org_id` could ever change (it cannot; org_id is immutable per all current migrations), a trigger would be needed to keep `invoice_allocations.org_id` in sync. No such trigger is needed.

</backfill_safety>

<open_questions>

**None blocking plan-review or execute.** The plan is self-contained per acceptance criteria + Q10b verbatim resolution.

**Process notes** (not blockers — surfaced for transparency):

1. **MCP tool availability:** the Supabase MCP `list_tables` / `execute_sql` tools are documented in the env header but were not surfaced as callable tool functions in this planner session. Row count + policy state confirmation is therefore taken from the migration audit (`.planning/audits/2026-05-12-migration-inventory.md`) authored 2026-05-12. If the row count has drifted significantly (more than 10x) since the audit, the verification DO block in migration step 3 will still catch any incomplete backfill — so the plan is safe regardless.

2. **Regression test fixture coverage:** the `__tests__/rls/invoice-allocations-tenant-boundary.test.ts` test will SKIP rather than FAIL when fixture coverage is missing (i.e., only one org has invoice_allocations rows). This is the documented Wave-B contract — B-6 (cost-code wipe-and-reseed + fixture-maintenance contract codification) is chartered to seed coverage. If the Wave-A reviewers want hard-fail-on-missing-coverage in A-4, the alternative is for A-4 to seed a synthetic 2nd-org row into fixture-harness-org via the migration itself. That's a small scope expansion and Q9 D explicitly allows the deferral.

3. **`__tests__/_runner.ts` test framework verification:** the regression test file uses `import { test } from "../_runner"` matching the project's `npm test` invocation (`npx tsx __tests__/_runner.ts`). The exact test runner API (whether it exports `test` as a function or uses a different name like `describe/it`) was not verified during plan authoring. If the runner uses a different API, the test file template needs a small adjustment — that's a 5-minute fix at execute time, not a plan blocker.

</open_questions>

<success_criteria>

This plan succeeds when ALL of the following hold:

- [ ] Migration 00096 is committed to `supabase/migrations/` with paired `.down.sql`
- [ ] Migration 00096 applies cleanly to DEV Supabase (apply via MCP `apply_migration`)
- [ ] Backfill produces 0 NULL org_id rows on invoice_allocations
- [ ] All 4 direct-filter policies present in `pg_policies` for invoice_allocations
- [ ] Zero policies on invoice_allocations reference `invoices` table in `qual` or `with_check`
- [ ] Composite index `idx_invoice_allocations_org_id_invoice_id` present
- [ ] 4 source-code INSERT sites updated; grep verifies `org_id` appears in each
- [ ] Comment block added to `00051_support_chat.sql` (no DDL change)
- [ ] CLAUDE.md Architecture Rules contains Q10b codified rule with 3 examples
- [ ] Regression test exists at `__tests__/rls/invoice-allocations-tenant-boundary.test.ts`
- [ ] `npm test` exits 0 (regression test passes or skips cleanly)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
- [ ] Harness Layer 1 (mechanical + DOM) green against Vercel preview URL
- [ ] Drummond grep gate silent on staged changes
- [ ] All 6 acceptance criteria items (verbatim from Wave-A EXPANDED-SCOPE.md) verified

</success_criteria>

<output>

After execution, write the plan summary to:
`.planning/phases/stage-f1-knowledge-graph-auth-wave-a/A-4-invoice-allocations-org-id-SUMMARY.md`

Summary includes:
- Commit SHA + branch
- Migration 00096 + .down.sql + 00051 comment-only diff confirmed
- pg_policies verification snapshot (5 policies on invoice_allocations, 0 JOIN-references)
- Row count post-backfill (52 expected; non-NULL 52 enforced)
- Regression test status (passed | skipped-with-reason)
- 4 INSERT call sites diff summary
- Harness Layer 1 verdict
- Drummond gate status
- CLAUDE.md diff summary
- Any open items routed to Wave-B (e.g., Layer 2 fixture-coverage assertion → B-6/B-7)

</output>
