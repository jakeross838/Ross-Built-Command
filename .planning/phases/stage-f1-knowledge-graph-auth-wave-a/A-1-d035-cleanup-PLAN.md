---
phase: stage-f1-knowledge-graph-auth-wave-a
plan: A-1
plan-name: d035-cleanup
type: execute
status: not-started
wave: 1
depends_on: []
autonomous: true
halt_after: false
threat_model_severity: low
source_decisions:
  - D-021 (drop change_order_budget_lines — ratified in MASTER-PLAN)
  - D-035 #1 (drop change_order_budget_lines as F1 first-day task)
  - D-035 #2 (add lien_releases.status_history as F1 first-day task)
  - audit R.7 (bonus jobs.status_history fix; same migration shape)
  - Q12 uniform versioning (status_history JSONB on every workflow entity)
  - nwrp113 Wave-A authorization (autonomous execution permitted on CATEGORY F)
requirements:
  - D-035-1
  - D-035-2
  - audit-R7
  - Q12-uniform-status-history
files_modified:
  - supabase/migrations/00094_d035_cleanup.sql
  - supabase/migrations/00094_d035_cleanup.down.sql
  - src/app/api/lien-releases/[id]/route.ts
  - src/app/api/lien-releases/bulk/route.ts
  - src/app/api/jobs/route.ts
  - CLAUDE.md
requires:
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-a/CONTEXT.md
  - .planning/expansions/stage-f1-knowledge-graph-auth-wave-a-EXPANDED-SCOPE.md
  - .planning/expansions/stage-f1-knowledge-graph-auth-EXPANDED-SCOPE.md (Q12 + D-035)
  - .planning/audits/2026-05-12-migration-inventory.md (Section 4 task 1 + task 2 + Section 7 R.7 bonus)
  - CLAUDE.md (Architecture Rules — status_history rule + Data Model)
  - supabase/migrations/00015_partial_approvals_co_links_vendor_notes.sql:45-75 (CCBL creation site)
  - supabase/migrations/00026_phase5_scaffolding_tables.sql:19-32 (lien_releases creation site)
  - supabase/migrations/00030_phase8_draws_liens_payments.sql:71-105 (lien_releases status CHECK widening)
  - supabase/migrations/00034_phase8i_security_audit_fixes.sql:19-65 (CCBL RLS policies — will be dropped via CASCADE)
  - supabase/migrations/00043_rls_owner_admin_write_parity.sql:143-146 (additional CCBL policy — will be dropped via CASCADE)
  - supabase/migrations/00049_platform_admin_rls_bypass.sql:79-88 (CCBL platform_admin policy — will be dropped via CASCADE)
  - supabase/migrations/00001_initial_schema.sql:97,121,165,215 (canonical status_history shape JSONB NOT NULL DEFAULT '[]'::jsonb)
  - src/lib/activity-log.ts (logStatusChange helper — line 88-102)
  - src/app/api/draws/[id]/action/route.ts:381-394 (canonical in-app status_history append pattern)
provides:
  - Schema change_order_budget_lines table dropped (D-021 / D-035 #1 closure)
  - Schema lien_releases.status_history JSONB NOT NULL DEFAULT '[]'::jsonb (D-035 #2 closure)
  - Schema jobs.status_history JSONB NOT NULL DEFAULT '[]'::jsonb (audit R.7 bonus closure)
  - App-layer lien_releases PATCH + bulk routes append status_history on transitions
  - App-layer jobs PATCH route appends status_history on status transitions
  - Doc CLAUDE.md Architecture Rules — Q12 uniform-rule codification (status_history vs activity_log vs revision_number)
affects:
  - lien_releases workflow integrity (transition history now persisted at the entity level, not just in activity_log)
  - jobs workflow integrity (status transitions now persisted; closes R.7 audit concern)
  - Drop of change_order_budget_lines closes RESTRICTIVE RLS policy carry-cost from migration 00034
acceptance-criteria-target: 11 falsifiable items
estimated-duration: 0.5-1 day
must_haves:
  truths:
    - "After migration 00094 applied change_order_budget_lines table no longer exists in the public schema"
    - "After migration 00094 applied lien_releases has a status_history JSONB NOT NULL DEFAULT '[]'::jsonb column"
    - "After migration 00094 applied jobs has a status_history JSONB NOT NULL DEFAULT '[]'::jsonb column"
    - "When a PATCH /api/lien-releases/:id transitions status (pending to received, pending to waived, etc.), the lien_releases row's status_history JSONB gains a new entry of shape who/when/old_status/new_status/note"
    - "When a POST /api/lien-releases/bulk runs mark_received or waive on N ids, each of the N target rows' status_history gains a new entry"
    - "When a PATCH /api/jobs (body.id, body.status) transitions a job's status, the jobs row's status_history JSONB gains a new entry"
    - "Existing logActivity / logStatusChange writes to activity_log continue to fire — the new status_history append is ADDITIVE, not a replacement"
    - "CLAUDE.md Architecture Rules section explicitly documents the Q12 uniform rule: every workflow entity has status_history JSONB; every cross-entity event goes through activity_log; Pay Apps + Draws use revision_number rows ONLY for LOCKED-after-submit AIA legal contract requirements (the exception, not the rule)"
    - "npm run build passes with 0 errors after route updates"
    - "Drummond pre-commit gate stays silent on all staged files"
    - "Harness Layer 1 (mechanical) stays at PASS=151 / FAIL=0 baseline (or improves)"
  artifacts:
    - path: "supabase/migrations/00094_d035_cleanup.sql"
      provides: "DROP TABLE change_order_budget_lines + ADD COLUMN lien_releases.status_history + ADD COLUMN jobs.status_history"
      contains: "DROP TABLE IF EXISTS public.change_order_budget_lines"
    - path: "supabase/migrations/00094_d035_cleanup.down.sql"
      provides: "Best-effort rollback (recreate CCBL shell + drop new status_history columns); status_history data NOT recoverable post-drop per R.16 convention"
      contains: "ALTER TABLE public.lien_releases DROP COLUMN IF EXISTS status_history"
    - path: "src/app/api/lien-releases/[id]/route.ts"
      provides: "PATCH appends status_history entry on transition; existing logActivity call preserved"
      contains: "status_history"
    - path: "src/app/api/lien-releases/bulk/route.ts"
      provides: "Bulk POST appends status_history entry to each target row on transition"
      contains: "status_history"
    - path: "src/app/api/jobs/route.ts"
      provides: "PATCH appends status_history entry on status transition; existing retainage/baseline logActivity calls preserved"
      contains: "status_history"
    - path: "CLAUDE.md"
      provides: "Q12 uniform-rule codification under Architecture Rules section"
      contains: "Pay Apps + Draws use revision_number"
  key_links:
    - from: "src/app/api/lien-releases/[id]/route.ts"
      to: "supabase lien_releases.status_history column"
      via: "supabase.from('lien_releases').update({ status_history: [...existing, newEntry] })"
      pattern: "status_history"
    - from: "src/app/api/lien-releases/bulk/route.ts"
      to: "supabase lien_releases.status_history column (N rows)"
      via: "per-id select existing status_history then update with appended entry; loop on N ids"
      pattern: "status_history"
    - from: "src/app/api/jobs/route.ts"
      to: "supabase jobs.status_history column"
      via: "supabase.from('jobs').update({ status_history: [...existing, newEntry] })"
      pattern: "status_history"
    - from: "CLAUDE.md Architecture Rules"
      to: "Q12 uniform rule (status_history JSONB on every workflow entity)"
      via: "explicit rule statement codifying the existing convention"
      pattern: "status_history"
---

# Plan A-1 — d035-cleanup (F1-Wave-A)

## Goal

Close two D-035 first-day F1 cleanup tasks (drop `change_order_budget_lines`; add `lien_releases.status_history`) plus the audit R.7 bonus fix (`jobs.status_history`) in a single migration (`00094`), then update the lien_releases + jobs PATCH/bulk routes so status changes ACTUALLY append `{who, when, old_status, new_status, note}` entries to the new JSONB columns, and codify the Q12 uniform-rule in CLAUDE.md Architecture Rules so future workflow entities inherit the pattern by default.

## Scope inclusions

1. **Migration 00094** — `DROP TABLE change_order_budget_lines` (verified 0 rows, 0 src consumers, superseded by `change_order_lines` per `supabase/migrations/00028_phase7_purchase_orders_change_orders.sql:178`); `ALTER TABLE lien_releases ADD COLUMN status_history JSONB NOT NULL DEFAULT '[]'::jsonb`; `ALTER TABLE jobs ADD COLUMN status_history JSONB NOT NULL DEFAULT '[]'::jsonb`. Paired `.down.sql` per R.16 convention (best-effort rollback; data loss acknowledged for the JSONB columns once dropped).
2. **App-layer route updates** — `src/app/api/lien-releases/[id]/route.ts` (PATCH) + `src/app/api/lien-releases/bulk/route.ts` (POST) + `src/app/api/jobs/route.ts` (PATCH) append `{who, when, old_status, new_status, note}` entries to `status_history` whenever the status field changes. Existing `logActivity` / `logStatusChange` calls remain — the new append is ADDITIVE (Q12 + audit_log working together, per `.planning/architecture/AUDIT-LOG-STRATEGY.md` Strategy 1-prime).
3. **CLAUDE.md Architecture Rules update** — under the `## Architecture Rules (Non-Negotiable)` section, add the Q12 uniform-rule codification immediately after the existing `Status history:` bullet (`CLAUDE.md:67`). The new sentence makes explicit that activity_log handles cross-entity events while status_history handles entity-local transitions, and Pay App + Draw `revision_number` rows are the ONLY exception (driven by AIA legal contract requirements).

## Scope exclusions (deferred to other plans / waves)

- **Activity log entity_type union extension** to `lien_releases` / `proposals` / `clients` / `client_portal_access` — deferred to Wave-B Plan B-4 per umbrella EXPANDED-SCOPE.md line 121. Lien-release status changes will continue to log under `entity_type: "draw"` until B-4 lands. **This plan does NOT change `src/lib/activity-log.ts`.**
- **docx-html auth gate fix** — Plan A-2 (D-035 #3).
- **`budgets` table drop + refactor** — Plan A-3 (D-035 #4, Q10c).
- **`invoice_allocations.org_id` denormalize** — Plan A-4 (Q10b).
- **`public.users` retirement** — Plan A-5 (optional; absorption decision at plan-review halt).
- **Backfill of historical status_history entries for existing lien_releases / jobs rows** — out of scope. The new column defaults to `'[]'::jsonb`; existing 0 lien_releases rows + 16 jobs rows start with empty arrays. Activity_log already captures historical job updates via the 63 existing rows (audit confirms). The forward-only posture is consistent with `00073` / `00077` precedent (pricing_history forward-only).
- **DB-trigger safety net** ensuring status_history is appended even when a write path forgets — Wave-B Plan B-3 (Q6 F).
- **New entity creation** (Clients, etc.) — Wave-B.

## Migration numbering confirmation

Verified via `ls supabase/migrations/ | sort | tail -5`:

- `00091_document_extractions_cache.sql` (active)
- `00092_verification_harness_fixture_org.sql` (active)
- `00093_harness_fixture_profile_corrective.sql` (active — corrective, current latest)

Next slot: **`00094_d035_cleanup.sql`**.

## Implementation tasks

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Author migration 00094 + paired .down.sql</name>
  <files>supabase/migrations/00094_d035_cleanup.sql, supabase/migrations/00094_d035_cleanup.down.sql</files>

  <read_first>
    - supabase/migrations/00015_partial_approvals_co_links_vendor_notes.sql:45-75 (CCBL creation site — table def + indexes + RLS policies)
    - supabase/migrations/00026_phase5_scaffolding_tables.sql:19-32 (lien_releases creation site — confirms org_id NOT NULL + status CHECK shape)
    - supabase/migrations/00030_phase8_draws_liens_payments.sql:71-105 (lien_releases status CHECK widening to pending/received/waived/not_required)
    - supabase/migrations/00034_phase8i_security_audit_fixes.sql:19-65 (CCBL RLS policies that will be dropped via CASCADE)
    - supabase/migrations/00043_rls_owner_admin_write_parity.sql:143-146 (additional CCBL policy)
    - supabase/migrations/00049_platform_admin_rls_bypass.sql:79-88 (CCBL platform_admin policy + DELETE strict policy)
    - supabase/migrations/00001_initial_schema.sql:97,121,165,215 (canonical status_history shape — JSONB NOT NULL DEFAULT '[]'::jsonb)
    - supabase/migrations/00060_align_status_enums.sql:30 (header note re: status_history JSONB convention)
    - supabase/migrations/00071_milestones_retainage.sql:151 (status_history JSONB convention reuse — most-recent precedent)
  </read_first>

  <action>
**Step A — Write `supabase/migrations/00094_d035_cleanup.sql`.**

The migration is three independent ALTER/DROP statements wrapped in idempotent `IF EXISTS` / `IF NOT EXISTS` guards (per existing convention — see 00045, 00046, 00071 precedent). Verify the file header documents D-021 + D-035 #1 + D-035 #2 + audit R.7 + Q12 closure. No DO-block needed because we are not mutating CHECK constraints or backfilling; the columns default to `'[]'::jsonb` and the drop is unconditional.

```sql
-- 00094_d035_cleanup.sql
-- F1-Wave-A Plan A-1 — D-035 cleanup + audit R.7 bonus + Q12 closure.
--
-- Three independent schema operations in one migration:
--   1. DROP TABLE change_order_budget_lines (D-021 / D-035 #1)
--      Verified safe per .planning/audits/2026-05-12-migration-inventory.md
--      Section 4 task 1: 0 rows + 0 src/ consumers + superseded by
--      change_order_lines (created in 00028, line 178 explicitly states
--      "Replaces the legacy change_order_budget_lines table").
--      CASCADE drops the 6 RLS policies (00015 base, 00034 RESTRICTIVE +
--      narrowed PM/admin/owner/accounting, 00043 widened, 00049
--      platform_admin_read + delete_strict) along with the table.
--
--   2. ADD COLUMN lien_releases.status_history JSONB NOT NULL DEFAULT
--      '[]'::jsonb (D-035 #2 + Q12 uniform-rule).
--      Per CLAUDE.md Architecture Rules: "Status history: JSONB column on
--      every workflow entity logging every status change: {who, when,
--      old_status, new_status, note}". lien_releases.status is a workflow
--      enum {pending|received|waived|not_required} (00026 + 00030);
--      status_history was the only workflow-entity gap (per audit Section 4
--      task 2 — peers like change_orders, draws, invoices, proposals all
--      have it). Default '[]'::jsonb on the 0 existing rows; app-layer
--      PATCH + bulk routes (this plan's tasks 2 + 3) populate forward-going.
--
--   3. ADD COLUMN jobs.status_history JSONB NOT NULL DEFAULT '[]'::jsonb
--      (audit R.7 bonus + Q12 uniform-rule).
--      Same gap as lien_releases — audit Section 4 task 2 explicitly calls
--      out: "lien_releases and jobs are the only workflow-status tables
--      without it". jobs.status enum is {active|complete|warranty|cancelled}
--      (definition in src/app/api/jobs/route.ts:57 + 85). Default
--      '[]'::jsonb on the 16 existing rows; jobs PATCH route (this plan's
--      task 4) populates forward-going.
--
-- Rollback contract: .down.sql is BEST-EFFORT per CLAUDE.md "Never delete
-- records" + .planning/audits Section 1 R.16 convention. CCBL recreation is
-- a SHELL only (no row data; the 0 rows are mathematically restored).
-- status_history JSONB data, if any has been written between up + down, is
-- LOST on column drop. Down is intended for emergency rollback at deploy
-- time only — production status_history rows should never round-trip.

-- ============================================================
-- 1. Drop change_order_budget_lines (D-021 / D-035 #1).
-- ============================================================
DROP TABLE IF EXISTS public.change_order_budget_lines CASCADE;

-- ============================================================
-- 2. Add lien_releases.status_history (D-035 #2 / Q12 closure).
-- ============================================================
ALTER TABLE public.lien_releases
  ADD COLUMN IF NOT EXISTS status_history JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.lien_releases.status_history IS
  'Q12 uniform-rule: append-only JSONB array of {who, when, old_status, new_status, note} on every status transition. Populated by PATCH + bulk routes. Cross-entity events also flow to activity_log; this column is the entity-local transition record.';

-- ============================================================
-- 3. Add jobs.status_history (audit R.7 bonus / Q12 closure).
-- ============================================================
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS status_history JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.jobs.status_history IS
  'Q12 uniform-rule: append-only JSONB array of {who, when, old_status, new_status, note} on every status transition (active|complete|warranty|cancelled). Populated by PATCH /api/jobs route on status change. Cross-entity events also flow to activity_log.';
```

**Step B — Write `supabase/migrations/00094_d035_cleanup.down.sql`.**

Best-effort rollback per R.16 convention. The DROP COLUMN steps are exact inverses (lose JSONB data; acceptable per the up-migration's header contract). The CCBL recreate is shell-only (table + indexes + RLS policies as they stood post-00049); does NOT attempt to restore the 6 RLS policies' WITH CHECK exactly because the up migration uses CASCADE and the policy text accumulated cross 4 migrations (00015 / 00034 / 00043 / 00049). Document this explicitly in the down.sql header.

```sql
-- 00094_d035_cleanup.down.sql
-- BEST-EFFORT rollback of 00094_d035_cleanup.sql.
--
-- IMPORTANT — per R.16 convention + CLAUDE.md "Never delete records":
-- .down.sql files are NOT applied to production. They document the
-- emergency rollback path only.
--
-- Limitations:
--   * status_history JSONB data is LOST on column drop. If any rows have
--     accumulated transition history between the up + down apply, that
--     history is unrecoverable from this script.
--   * change_order_budget_lines recreation is SHELL ONLY. Row data was
--     verified 0 at audit time (audit Section 4 task 1) so the empty
--     recreate is mathematically lossless, but the RLS policy text is
--     not exactly restored — only the minimum org-isolation policy is
--     re-added. A full restore would require re-running 00015 + 00034 +
--     00043 + 00049 fragments by hand, which is out of scope for a
--     down.sql.

-- ============================================================
-- 1. Drop jobs.status_history (inverse of up step 3).
-- ============================================================
ALTER TABLE public.jobs DROP COLUMN IF EXISTS status_history;

-- ============================================================
-- 2. Drop lien_releases.status_history (inverse of up step 2).
-- ============================================================
ALTER TABLE public.lien_releases DROP COLUMN IF EXISTS status_history;

-- ============================================================
-- 3. Recreate change_order_budget_lines shell (inverse of up step 1).
--     Empty table + minimum RLS so the schema is restored; full RLS
--     policy text is NOT restored — see header limitations.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.change_order_budget_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  change_order_id UUID NOT NULL REFERENCES public.change_orders(id) ON DELETE CASCADE,
  budget_line_id UUID NOT NULL REFERENCES public.budget_lines(id),
  amount BIGINT NOT NULL DEFAULT 0,
  org_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_co_budget_lines_co
  ON public.change_order_budget_lines(change_order_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_co_budget_lines_bl
  ON public.change_order_budget_lines(budget_line_id) WHERE deleted_at IS NULL;

ALTER TABLE public.change_order_budget_lines ENABLE ROW LEVEL SECURITY;

-- Minimum org-isolation RESTRICTIVE policy (matches 00034 spirit, not full text).
CREATE POLICY "org isolation"
  ON public.change_order_budget_lines AS RESTRICTIVE
  USING (org_id = app_private.user_org_id())
  WITH CHECK (org_id = app_private.user_org_id());

COMMENT ON TABLE public.change_order_budget_lines IS
  'Recreated by 00094_d035_cleanup.down.sql as a SHELL only. Original RLS policy text not restored. Do NOT rely on this table in code without re-running 00015 + 00034 + 00043 + 00049 fragments first.';
```

**Step C — Verify migration ordering + idempotency.**

`ls supabase/migrations/ | sort | tail -3` returns:

- `00092_verification_harness_fixture_org.sql`
- `00093_harness_fixture_profile_corrective.sql`
- `00094_d035_cleanup.sql` (newly created)

Idempotency: all three operations use `IF NOT EXISTS` / `IF EXISTS` guards. Re-running the migration on a database where it has already applied is a safe no-op.
  </action>

  <verify>
    <automated>test -f supabase/migrations/00094_d035_cleanup.sql ; test -f supabase/migrations/00094_d035_cleanup.down.sql ; grep -c 'DROP TABLE IF EXISTS public.change_order_budget_lines CASCADE' supabase/migrations/00094_d035_cleanup.sql ; grep -c 'lien_releases' supabase/migrations/00094_d035_cleanup.sql ; grep -c 'jobs' supabase/migrations/00094_d035_cleanup.sql ; grep -Ec 'status_history JSONB NOT NULL DEFAULT' supabase/migrations/00094_d035_cleanup.sql</automated>
    Expected: each file exists; CCBL drop count=1; lien_releases mention count is at least 1; jobs mention count is at least 1; status_history column-def count=2 (one per table).

    Apply migration via supabase MCP (`mcp__supabase__apply_migration`) against the dev project. Verify:
    - `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='change_order_budget_lines'` returns 0 rows.
    - `SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='lien_releases' AND column_name='status_history'` returns one row with is_nullable=NO and column_default like `'[]'::jsonb`.
    - Same SELECT for `jobs.status_history` returns same shape.
    - `mcp__supabase__get_advisors` shows no new warnings introduced by the migration (existing 8 mutable-search-path + extension_in_public warnings are pre-existing per audit Section 5; this plan does not address them).
  </verify>

  <done>
    - `supabase/migrations/00094_d035_cleanup.sql` written with three idempotent operations
    - `supabase/migrations/00094_d035_cleanup.down.sql` written with best-effort rollback
    - Migration applied via supabase MCP and verified via information_schema queries
    - No new advisor warnings introduced
    - File header documents D-021 + D-035 #1 + D-035 #2 + audit R.7 + Q12 closure
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Update src/app/api/lien-releases/[id]/route.ts PATCH to append status_history on transition</name>
  <files>src/app/api/lien-releases/[id]/route.ts</files>

  <read_first>
    - src/app/api/lien-releases/[id]/route.ts (FULL file, 109 lines — existing PATCH handler at lines 18-108)
    - src/lib/activity-log.ts (FULL file — logActivity + logStatusChange contracts)
    - src/app/api/draws/[id]/action/route.ts:381-394 (canonical in-app status_history append pattern — who/when/old_status/new_status/note shape + spread into updates)
    - src/lib/api/optimistic-lock.ts (updateWithLock signature; the existing PATCH already uses it)
  </read_first>

  <action>
**Step A — Read current PATCH structure.**

The existing handler (lines 38-43) selects `id, status, org_id` from lien_releases before the update. The status transition logic at lines 68-73 stamps `received_at` / `waived_at` timestamps. The `updates` object at lines 56-67 is passed to `updateWithLock`.

**Step B — Add status_history append.**

Modify the existing PATCH to also append a status_history entry whenever `body.status` is present AND differs from `existing.status`. The append happens INSIDE the `updates` object so `updateWithLock` writes both `status` and `status_history` atomically (single UPDATE statement; matches the optimistic-lock contract).

Required changes:

1. Extend the SELECT at line 38-43 to include `status_history`:

```typescript
const { data: existing } = await supabase
  .from("lien_releases")
  .select("id, status, status_history, org_id")
  .eq("id", params.id)
  .eq("org_id", membership.org_id)
  .single();
```

2. Fetch the acting user (for the `who` field). Add right after the existing membership/ctx setup (mirror the pattern in `src/app/api/draws/[id]/action/route.ts:179-180`):

```typescript
const { data: { user: actor } } = await supabase.auth.getUser();
const actorId = actor?.id ?? null;
```

3. After the existing `updates` object is fully populated (after line 73), append a status_history entry if status is transitioning:

```typescript
if (
  typeof body.status === "string" &&
  body.status !== existing.status
) {
  const existingHistory = Array.isArray(existing.status_history)
    ? existing.status_history
    : [];
  const entry = {
    who: actorId ?? "user",
    when: new Date().toISOString(),
    old_status: existing.status,
    new_status: body.status,
    note: typeof body.note === "string" ? body.note : null,
  };
  updates.status_history = [...existingHistory, entry];
}
```

The `note` field reads from `body.note` if the caller supplied a reason (caller convention; not currently in the explicit field allow-list at lines 57-65 but the PATCH body is a free-form `Record<string, unknown>`). If absent, store `null` — matches the `{who, when, old_status, new_status, note}` shape from CLAUDE.md Architecture Rules:67.

4. **Preserve existing `logActivity` call (lines 87-93).** Do NOT replace it; the new status_history append is ADDITIVE per AUDIT-LOG-STRATEGY.md Strategy 1-prime (entity-local transition record + cross-entity activity_log). The existing call uses `entity_type: "draw"` because the audit log enum has not yet been extended to `lien_releases` (Wave-B Plan B-4 territory per nwrp113 + Wave-A scope exclusions).

5. **DO NOT add a `logStatusChange` call.** That helper writes to `activity_log` with a `from`/`to`/`reason` shape; the existing `logActivity({ action: "updated", details: { lien_release_update: updates } })` already covers cross-entity logging for this route. Adding `logStatusChange` would create a duplicate activity_log row on each transition. Wave-B Plan B-4 will replace `logActivity` with `logStatusChange` once the entity_type union includes `lien_releases`.

**Step C — Type safety check.**

The `body.status` allow-list is `pending|received|waived|not_required` per `00030_phase8_draws_liens_payments.sql:101-102`. The PATCH does NOT currently validate `body.status` against this set explicitly — it relies on the DB CHECK constraint to reject invalid values. The status_history append is unaffected: if `body.status` is a string that differs from `existing.status`, we record the transition; if the DB rejects the update, `updateWithLock` returns an error and the append is effectively rolled back (no UPDATE applied means status_history was not written).

No type changes required; the existing `Record<string, unknown>` body shape covers `body.note` reads.
  </action>

  <verify>
    <automated>npm run build ; grep -c 'status_history' src/app/api/lien-releases/[id]/route.ts ; grep -c 'old_status' src/app/api/lien-releases/[id]/route.ts ; grep -c 'new_status' src/app/api/lien-releases/[id]/route.ts ; grep -c 'logActivity' src/app/api/lien-releases/[id]/route.ts</automated>
    Expected: build exits 0; status_history count is at least 3 (SELECT col, existingHistory const, updates field); old_status count=1; new_status count=1; logActivity count=1 (existing call preserved).

    Functional verification (manual via dev server):
    1. Start dev server (`npm run dev`).
    2. Pick a lien_releases row in the fixture org (or create one in Drummond if 0 rows persist) where status='pending'.
    3. PATCH `/api/lien-releases/<id>` with body `{ "status": "received" }`.
    4. SELECT `status, status_history FROM lien_releases WHERE id=<id>` — verify status='received' AND status_history is a JSONB array of length 1 with shape `[{who, when, old_status: "pending", new_status: "received", note: null}]`.
    5. PATCH again with `{ "status": "waived", "note": "test rollback" }`.
    6. SELECT — status_history length 2; entry 2 has `old_status: "received", new_status: "waived", note: "test rollback"`.
    7. activity_log table should have 2 new rows from the 2 PATCH calls (legacy entity_type='draw' until Wave-B B-4).
  </verify>

  <done>
    - PATCH route appends status_history entry on transition
    - Existing logActivity call preserved (no duplicate writes)
    - npm run build passes with 0 errors
    - Functional verification of 2 sequential transitions confirms append shape + activity_log additivity
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Update src/app/api/lien-releases/bulk/route.ts to append status_history on each target row</name>
  <files>src/app/api/lien-releases/bulk/route.ts</files>

  <read_first>
    - src/app/api/lien-releases/bulk/route.ts (FULL file, 99 lines — existing POST handler)
    - src/app/api/lien-releases/[id]/route.ts (post-Task-2 — for parallel append shape)
    - src/lib/activity-log.ts (unchanged)
  </read_first>

  <action>
**Step A — Read current bulk handler structure.**

The existing handler (lines 18-99) accepts `{ids, action}`, verifies org-scope (lines 43-56), builds an `updates` object from action (lines 58-67), then executes a SINGLE `UPDATE` on all matching ids at lines 69-74. This is the structural challenge: the bulk update is one SQL statement, but each row's `status_history` needs its OWN existing-history-plus-entry — meaning the append cannot use the single-UPDATE pattern as-is.

**Step B — Pick the per-row approach.**

Two viable approaches:

- **Approach A (chosen):** Replace the single bulk UPDATE with a per-id loop. SELECT each row's current `status, status_history`; UPDATE each row with status + status_history appended. N+1 round-trips but N is bounded by UI batching (typically 1-20 lien releases per draw), and the bulk endpoint is invoked rarely. Trade-off accepted: correctness over throughput.

- **Approach B (rejected):** Use a Postgres function or `UPDATE ... FROM jsonb_array_elements` trick to append per-row in a single statement. More efficient but adds DB-side complexity for a low-traffic endpoint; rejected per Q2 lean-cache-footprint principle inherited from umbrella EXPANDED-SCOPE.md.

**Step C — Implement Approach A.**

Replace lines 43-74 (the target verification + single UPDATE) with:

1. SELECT all target rows including current status_history (preserve the count-mismatch rejection at lines 51-56):

```typescript
const { data: targets, error: targetsErr } = await supabase
  .from("lien_releases")
  .select("id, status, status_history")
  .eq("org_id", orgId)
  .in("id", ids);
if (targetsErr) {
  return NextResponse.json({ error: targetsErr.message }, { status: 500 });
}
if ((targets?.length ?? 0) !== ids.length) {
  return NextResponse.json(
    { error: "One or more lien releases not found in your organization" },
    { status: 404 }
  );
}
```

2. Determine the new status from `body.action` (preserve existing logic lines 58-67):

```typescript
let newStatus: "received" | "waived";
let timestampField: "received_at" | "waived_at";
if (body.action === "mark_received") {
  newStatus = "received";
  timestampField = "received_at";
} else if (body.action === "waive") {
  newStatus = "waived";
  timestampField = "waived_at";
} else {
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
```

3. Fetch the acting user (mirror Task 2 step B point 2):

```typescript
const { data: { user: actor } } = await supabase.auth.getUser();
const actorId = actor?.id ?? null;
const nowIso = new Date().toISOString();
```

4. Per-id update loop (replaces the single bulk UPDATE at lines 69-74):

```typescript
let updatedCount = 0;
for (const row of targets!) {
  const existingHistory = Array.isArray(row.status_history)
    ? row.status_history
    : [];
  // No-op for rows already in target status — preserves idempotency of
  // the bulk action and avoids polluting status_history with self-transitions.
  if (row.status === newStatus) {
    updatedCount += 1;
    continue;
  }
  const entry = {
    who: actorId ?? "user",
    when: nowIso,
    old_status: row.status,
    new_status: newStatus,
    note: `Bulk ${body.action}`,
  };
  const { error: updErr } = await supabase
    .from("lien_releases")
    .update({
      status: newStatus,
      [timestampField]: nowIso,
      status_history: [...existingHistory, entry],
    })
    .eq("id", row.id)
    .eq("org_id", orgId);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }
  updatedCount += 1;
}
```

The self-transition skip (`row.status === newStatus`) matches the spirit of the existing bulk UPDATE (which would have UPDATE-with-no-effect on already-received rows but still bumped `received_at` — a small behavior change is intentional here to keep status_history clean; document in SUMMARY).

5. **Preserve existing `logActivity` + `logImpersonatedWrite` calls (lines 76-91).** Same rationale as Task 2 step B point 4 — additive, not replacement.

6. Update the response to use the new counter:

```typescript
return NextResponse.json({ ok: true, updated: updatedCount });
```

(Equivalent to existing `updated: ids.length` since the loop always processes every input id; preserve the counter for clarity.)

**Step D — Concurrency note.**

The per-row loop is sequential (`await` inside `for`). For a bulk of N=20, this is 20 sequential DB round-trips. Acceptable for the low-frequency use case (draw-approval bulk). If profiling later shows latency issues, the loop can be parallelized with `Promise.all` — but per-row optimistic-lock conflicts would then need handling. Out of scope here.

**Step E — Verify the new error path.**

If any individual UPDATE fails mid-loop, earlier successful rows have already been committed (no transaction wrapper). The 500 error surfaces the first failure. This is acceptable for the low-frequency use case but document in SUMMARY for follow-up consideration in Wave-B Plan B-3 (DB-trigger safety net).
  </action>

  <verify>
    <automated>npm run build ; grep -c 'status_history' src/app/api/lien-releases/bulk/route.ts ; grep -c 'for (const row of targets' src/app/api/lien-releases/bulk/route.ts ; grep -c 'logActivity' src/app/api/lien-releases/bulk/route.ts ; grep -c 'updatedCount' src/app/api/lien-releases/bulk/route.ts</automated>
    Expected: build exits 0; status_history count is at least 3 (SELECT col, existingHistory const, updates field); for-loop count=1; logActivity count=1 (existing call preserved); updatedCount count is at least 3 (declaration, +=1 in self-transition skip, +=1 in normal path, response field).

    Functional verification (manual via dev server):
    1. Create 3 lien_releases rows for a Drummond draw (status='pending').
    2. POST `/api/lien-releases/bulk` with body `{ "ids": [<id1>, <id2>, <id3>], "action": "mark_received" }`.
    3. SELECT `id, status, status_history FROM lien_releases WHERE id IN (...)` — all 3 rows have status='received'; each status_history array has length 1 with `{old_status: "pending", new_status: "received", note: "Bulk mark_received"}`.
    4. POST again with the same payload (re-mark received already-received rows) — response `{ok:true, updated:3}` but status_history arrays unchanged (length still 1; self-transition skip prevents pollution).
    5. activity_log table has 2 new rows from the 2 bulk POSTs (entity_type='draw' until Wave-B B-4).
  </verify>

  <done>
    - Bulk POST replaces single UPDATE with per-row loop
    - Each target row's status_history appended (or skipped if self-transition)
    - Existing logActivity + logImpersonatedWrite calls preserved
    - npm run build passes with 0 errors
    - Functional verification of bulk + idempotent re-bulk confirms shape + skip
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 4: Update src/app/api/jobs/route.ts PATCH to append status_history on status transition</name>
  <files>src/app/api/jobs/route.ts</files>

  <read_first>
    - src/app/api/jobs/route.ts (FULL file, 265 lines — POST at lines 60-148, PATCH at lines 150-264)
    - src/lib/activity-log.ts (unchanged; still no `entity_type: "job"` for status_changed action — existing entity_type="job" works because activity-log.ts:27 includes `"job"` in union)
    - src/app/api/draws/[id]/action/route.ts:381-394 (canonical in-app status_history append pattern)
  </read_first>

  <action>
**Step A — Read current PATCH structure.**

Important context (verified during plan-phase exploration):

- `src/app/api/jobs/route.ts:150-264` exports the PATCH handler. It accepts `body: JobBody & { id: string }` (line 163) — note the body has `body.id`, NOT a `[id]` URL param. This is the only PATCH route for jobs (the `[id]` subdir contains `route.ts` with DELETE only — no PATCH).
- The existing `existing` SELECT at lines 168-173 fetches `retainage_percent, org_id` — does NOT fetch `status` or `status_history`. We must extend it.
- The status transition currently writes `body.status` to the patch object at line 214 with no audit trail at all — there is no `logStatusChange` call on this route today. The audit_log only fires on retainage/baseline changes (lines 246-261).
- jobs status enum is `active | complete | warranty | cancelled` per line 57 + DB CHECK (confirm via SQL at execute time).

**Step B — Extend SELECT to include status + status_history.**

Change the existing SELECT (lines 168-173) to also select `status, status_history`:

```typescript
const { data: existing } = await supabase
  .from("jobs")
  .select("retainage_percent, org_id, status, status_history")
  .eq("id", body.id)
  .is("deleted_at", null)
  .maybeSingle();
if (!existing) throw new ApiError("Job not found", 404);
const previousRetainage = Number(
  (existing as { retainage_percent?: number }).retainage_percent ?? 0
);
const previousStatus = (existing as { status: string }).status;
```

**Step C — Append status_history entry on transition.**

After the existing patch field assignments (after line 214 `if (body.status !== undefined) patch.status = body.status;`), add a status_history append when status transitions:

```typescript
let statusChanged = false;
if (typeof body.status === "string" && body.status !== previousStatus) {
  statusChanged = true;
  const existingHistory = Array.isArray(
    (existing as { status_history?: unknown }).status_history
  )
    ? ((existing as { status_history: unknown[] }).status_history)
    : [];
  const entry = {
    who: user.id,
    when: new Date().toISOString(),
    old_status: previousStatus,
    new_status: body.status,
    note: null,
  };
  patch.status_history = [...existingHistory, entry];
}
```

(The `user.id` is already in scope from line 156. The `note` field reads from no caller-side parameter on the jobs PATCH; future Wave-B Plan B-3 may add a `body.status_change_note` field, but Wave-A keeps `null`.)

**Step D — Add corresponding activity_log entry for the status transition.**

The existing route does NOT log status transitions to activity_log (it only logs retainage/baseline changes). Add a `logStatusChange` call immediately after the UPDATE succeeds (after line 235 `if (error) throw new ApiError(error.message, 500);`), gated on `statusChanged`:

```typescript
if (statusChanged) {
  await logStatusChange({
    org_id: (existing as { org_id: string }).org_id,
    user_id: user.id,
    entity_type: "job",
    entity_id: body.id,
    from: previousStatus,
    to: body.status as string,
  });
}
```

This is NEW activity_log coverage that Wave-A is adding for jobs status transitions. The `entity_type: "job"` is already in the ActivityEntityType union (`src/lib/activity-log.ts:27`), so no TS union change required.

**Step E — Import logStatusChange.**

Verify line 7 imports: `import { logActivity } from "@/lib/activity-log";` — extend to `import { logActivity, logStatusChange } from "@/lib/activity-log";`.

**Step F — Preserve existing retainage/baseline logActivity call (lines 246-261).**

The existing call fires only on retainage/baseline changes and is unchanged. The new `logStatusChange` call is independent. A single PATCH that changes BOTH `body.status` AND `body.retainage_percent` will write TWO activity_log rows (one `status_changed`, one `updated`) — this is correct per Strategy 1-prime (each distinct event is its own row).

**Step G — Type safety check.**

The existing `JobBody.status` type at line 57 is `"active" | "complete" | "warranty" | "cancelled"`, and line 85-87 validates against this set. The status_history append uses `body.status` as a string — fine because validation already gated it.

`patch: Record<string, unknown>` at line 179 already accepts arbitrary keys; `patch.status_history = [...]` type-checks without issue.
  </action>

  <verify>
    <automated>npm run build ; grep -c 'status_history' src/app/api/jobs/route.ts ; grep -c 'logStatusChange' src/app/api/jobs/route.ts ; grep -c 'previousStatus' src/app/api/jobs/route.ts ; grep -c 'entity_type: "job"' src/app/api/jobs/route.ts</automated>
    Expected: build exits 0; status_history count is at least 3 (SELECT col, existingHistory check, patch assignment); logStatusChange count=2 (import + call); previousStatus count is at least 2 (declaration + comparison); entity_type job count=1.

    Functional verification (manual via dev server):
    1. Pick the Drummond job (or any active job in fixture org) with status='active'.
    2. PATCH `/api/jobs` with body `{ "id": "<job-id>", "status": "complete" }`.
    3. SELECT `status, status_history FROM jobs WHERE id=<job-id>` — status='complete'; status_history is array of length 1 with `{old_status: "active", new_status: "complete", note: null}`.
    4. SELECT `* FROM activity_log WHERE entity_type='job' AND entity_id='<job-id>' ORDER BY created_at DESC LIMIT 1` — most recent row has action='status_changed' and details JSONB contains `{from: "active", to: "complete"}`.
    5. PATCH same job back to 'active'. Verify status_history grows to length 2.
    6. Edge case — PATCH with `body.status` absent (e.g., only changing `pm_id`). Verify status_history is unchanged (no transition logged).
  </verify>

  <done>
    - PATCH route SELECT extended to include status + status_history
    - Status transition appends status_history entry with user.id as `who`
    - New logStatusChange call writes to activity_log (NEW coverage; previously absent)
    - import line updated to include logStatusChange
    - Existing retainage/baseline logActivity call unchanged
    - npm run build passes with 0 errors
    - Functional verification of 2 transitions + 1 non-status PATCH confirms behavior
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 5: Codify Q12 uniform-rule in CLAUDE.md Architecture Rules section</name>
  <files>CLAUDE.md</files>

  <read_first>
    - CLAUDE.md (FULL — Architecture Rules section at line 61-71; particularly line 67 "Status history: JSONB column on every workflow entity logging every status change: {who, when, old_status, new_status, note}")
    - .planning/expansions/stage-f1-knowledge-graph-auth-EXPANDED-SCOPE.md:96-100 (Q12 versioning strategy text — source of the uniform rule)
    - .planning/architecture/AUDIT-LOG-STRATEGY.md (if present — Strategy 1-prime activity_log vs status_history division)
  </read_first>

  <action>
**Step A — Locate the existing Status history bullet.**

CLAUDE.md:67 (verified during plan-phase) contains:

```
- **Status history:** JSONB column on every workflow entity logging every status change: `{who, when, old_status, new_status, note}`.
```

**Step B — Insert the Q12 codification bullet immediately after it.**

Per the Q12 resolution in the umbrella EXPANDED-SCOPE.md (Q12 uniform versioning at line 96-100), the rule has three layers: entity-local status_history, cross-entity activity_log, and Pay App + Draw `revision_number` rows as the LOCKED-after-submit exception.

Add a new bullet (or extend the existing one) at CLAUDE.md:67 immediately after the Status history line. The cleanest insertion is a new bullet `- **Q12 versioning layers (uniform rule):**` followed by sub-bullets. Suggested exact text:

```
- **Q12 versioning layers (uniform rule per F1 umbrella EXPANDED-SCOPE.md Q12):**
  - **status_history (entity-local):** every workflow entity has `status_history JSONB NOT NULL DEFAULT '[]'::jsonb` populated by the app-layer write path on every transition. Shape: `{who, when, old_status, new_status, note}`. (As of F1-Wave-A Plan A-1: `change_orders`, `draws`, `invoices`, `proposals`, `purchase_orders`, `selections`, `draw_adjustments`, `job_milestones`, `lien_releases`, `jobs` — full workflow coverage.)
  - **activity_log (cross-entity):** every cross-entity event (transitions, deletes, blocked deletes, voids, imports, etc.) writes a row via `logActivity` / `logStatusChange` (`src/lib/activity-log.ts`). Strategy 1-prime keeps `entity_type` and `action` as separate columns. activity_log is the answer to "what happened across the system?"; status_history is the answer to "how did THIS row get to its current status?". Both fire on a status transition — that is BY DESIGN, not duplication.
  - **revision_number rows (Pay App + Draw exception ONLY):** the only entities that capture their entire prior state as a NEW row (with `revision_number` incremented) instead of mutating in place are Pay Apps and Draws — driven by the AIA G702/G703 legal contract requirement that submitted draws are LOCKED and corrections create Rev N rows. This is the EXCEPTION to "edits go through status_history transitions", not the rule. Do NOT extend this pattern to other entities without explicit Jake authorization.
```

**Step C — Update the existing Status history bullet to cross-reference Q12.**

Optionally edit line 67's bullet to add a parenthetical reference. Lower-priority — the new bullet above can stand alone. Decision: leave line 67 untouched (the new bullet at Step B is self-contained and adding "see Q12 below" creates documentation churn).

**Step D — Verify the surrounding Architecture Rules section remains coherent.**

After insertion, the section ordering at CLAUDE.md:65-71 becomes (logical reading order):

1. Every record: id, created_at, updated_at, created_by, org_id
2. Soft delete: deleted_at timestamp
3. Status history: JSONB column on every workflow entity (line 67 unchanged)
4. **Q12 versioning layers (new bullet — Step B)**
5. Amounts in cents
6. `job_id` is universal parent
7. TypeScript strict mode
8. All business logic in server-side API routes

This places the Q12 codification immediately adjacent to the rule it elaborates, which is the right cognitive grouping.
  </action>

  <verify>
    <automated>grep -c 'Q12 versioning layers' CLAUDE.md ; grep -c 'revision_number rows (Pay App' CLAUDE.md ; grep -c 'activity_log (cross-entity)' CLAUDE.md ; grep -c 'status_history (entity-local)' CLAUDE.md ; grep -n 'Q12 versioning layers' CLAUDE.md</automated>
    Expected: Q12 versioning layers count=1; revision_number rows Pay App count=1; activity_log cross-entity count=1; status_history entity-local count=1. The `grep -n` line confirms the bullet is added in the Architecture Rules section (line number should be at 68 or 69, immediately after the existing Status history bullet at line 67).

    Markdown rendering verification: open CLAUDE.md in a Markdown previewer (VS Code's built-in is fine). Verify the new Q12 bullet renders as a top-level list item with three sub-bullets indented under it. No broken indentation or missing list-continuation.

    No build / harness verification required — CLAUDE.md is doc-only; not part of the TypeScript or runtime surface.
  </verify>

  <done>
    - Q12 codification bullet inserted into CLAUDE.md Architecture Rules section
    - Three sub-bullets cover status_history (entity-local) + activity_log (cross-entity) + revision_number rows (Pay App + Draw exception)
    - Original Status history bullet at line 67 unchanged
    - Section ordering preserved (Q12 sits adjacent to its parent rule)
    - Markdown renders correctly
  </done>
</task>

</tasks>

## Migration SQL preview (assembled in one place for plan-review)

Full body of `supabase/migrations/00094_d035_cleanup.sql` (also embedded in Task 1 Step A):

```sql
DROP TABLE IF EXISTS public.change_order_budget_lines CASCADE;

ALTER TABLE public.lien_releases
  ADD COLUMN IF NOT EXISTS status_history JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.lien_releases.status_history IS
  'Q12 uniform-rule: append-only JSONB array of {who, when, old_status, new_status, note} on every status transition. Populated by PATCH + bulk routes. Cross-entity events also flow to activity_log; this column is the entity-local transition record.';

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS status_history JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.jobs.status_history IS
  'Q12 uniform-rule: append-only JSONB array of {who, when, old_status, new_status, note} on every status transition (active|complete|warranty|cancelled). Populated by PATCH /api/jobs route on status change. Cross-entity events also flow to activity_log.';
```

Full body of `supabase/migrations/00094_d035_cleanup.down.sql` (also embedded in Task 1 Step B):

```sql
ALTER TABLE public.jobs DROP COLUMN IF EXISTS status_history;
ALTER TABLE public.lien_releases DROP COLUMN IF EXISTS status_history;

CREATE TABLE IF NOT EXISTS public.change_order_budget_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  change_order_id UUID NOT NULL REFERENCES public.change_orders(id) ON DELETE CASCADE,
  budget_line_id UUID NOT NULL REFERENCES public.budget_lines(id),
  amount BIGINT NOT NULL DEFAULT 0,
  org_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_co_budget_lines_co
  ON public.change_order_budget_lines(change_order_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_co_budget_lines_bl
  ON public.change_order_budget_lines(budget_line_id) WHERE deleted_at IS NULL;

ALTER TABLE public.change_order_budget_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org isolation"
  ON public.change_order_budget_lines AS RESTRICTIVE
  USING (org_id = app_private.user_org_id())
  WITH CHECK (org_id = app_private.user_org_id());
```

## Acceptance criteria

Direct mapping from Wave-A EXPANDED-SCOPE.md Plan A-1 acceptance + plan-derived sub-ACs:

- [ ] **AC-A1-01** (Wave-A AC #1): Migration 00094 applied; `change_order_budget_lines` table dropped from `public` schema (verified via `SELECT 1 FROM information_schema.tables WHERE table_name='change_order_budget_lines'` returns 0 rows).
- [ ] **AC-A1-02** (Wave-A AC #1): Migration 00094 applied; `lien_releases.status_history` JSONB NOT NULL DEFAULT '[]'::jsonb column exists (verified via `information_schema.columns`).
- [ ] **AC-A1-03** (Wave-A AC #1 + audit R.7): Migration 00094 applied; `jobs.status_history` JSONB NOT NULL DEFAULT '[]'::jsonb column exists.
- [ ] **AC-A1-04** (Wave-A AC #2): PATCH `/api/lien-releases/:id` appends `{who, when, old_status, new_status, note}` to `status_history` on status transition (verified via Task 2 functional verification steps 3-4).
- [ ] **AC-A1-05** (Wave-A AC #2): POST `/api/lien-releases/bulk` appends per-row `status_history` entries on each of N target rows (verified via Task 3 functional verification steps 2-4).
- [ ] **AC-A1-06** (Wave-A AC #2 + plan-derived): PATCH `/api/jobs` (body.id, body.status) appends `status_history` entry on status transition AND writes a `logStatusChange` activity_log row with action='status_changed' (verified via Task 4 functional verification steps 2-6).
- [ ] **AC-A1-07** (plan-derived): Self-transition bulk requests (already-received rows in mark_received bulk) do NOT pollute status_history with no-op entries; the row is counted as updated but status_history is unchanged (verified via Task 3 step 4).
- [ ] **AC-A1-08** (Wave-A AC #3): CLAUDE.md Architecture Rules section contains the Q12 uniform-rule codification bullet with three sub-bullets (status_history entity-local, activity_log cross-entity, revision_number rows Pay App + Draw exception ONLY).
- [ ] **AC-A1-09** (Wave-A AC #4): `npm run build` exits 0 after all code changes.
- [ ] **AC-A1-10** (Wave-A AC #4): Drummond pre-commit grep gate (`.githooks/pre-commit`) is silent on every commit touching files in this plan (no real Drummond identifiers leak into staged sanitized fixtures or any of the modified files).
- [ ] **AC-A1-11** (Wave-A AC #4 + plan-derived): Verification harness Layer 1 (mechanical) PASS=151/FAIL=0 baseline preserved (or improved) post-merge. Run `npx tsx scripts/verify-phase.ts --phase stage-f1-knowledge-graph-auth-wave-a --skip-layer 2 --skip-layer 3` and confirm PASS count is at least 151 with FAIL=0.
- [ ] **AC-A1-12** (Wave-A AC #5 enforcement): No changes to `src/lib/activity-log.ts` (entity_type union, action union, or any other surface) — verify via `git diff --stat src/lib/activity-log.ts` returns 0 lines changed.

## Verification commands (assembled for execute-time)

After all 5 tasks complete:

1. **Build + typecheck**

```bash
npm run build
npx tsc --noEmit
```

Both exit 0.

2. **Migration application + schema verification**

```bash
# Apply via supabase MCP at execute-time (mcp__supabase__apply_migration).
# Post-apply schema queries:
psql -c "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='change_order_budget_lines';"
# Expect: 0 rows.
psql -c "SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='lien_releases' AND column_name='status_history';"
# Expect: 1 row, is_nullable=NO, column_default contains '[]::jsonb'.
psql -c "SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='jobs' AND column_name='status_history';"
# Expect: 1 row, is_nullable=NO, column_default contains '[]::jsonb'.
```

3. **Drummond pre-commit gate**

```bash
git add supabase/migrations/00094_d035_cleanup.sql supabase/migrations/00094_d035_cleanup.down.sql src/app/api/lien-releases/[id]/route.ts src/app/api/lien-releases/bulk/route.ts src/app/api/jobs/route.ts CLAUDE.md
git commit -m "feat(F1-Wave-A A-1): D-035 cleanup + Q12 closure + audit R.7 bonus"
# Expect: .githooks/pre-commit exits 0 silently.
```

4. **Harness Layer 1 (mechanical)**

```bash
npx tsx scripts/verify-phase.ts \
  --phase stage-f1-knowledge-graph-auth-wave-a \
  --skip-layer 2 --skip-layer 3 \
  --mode local --base-url http://localhost:3000
```

Expect: exit code 0; report shows PASS at least 151 / FAIL 0.

5. **Functional verification (Drummond fixture)**

Execute the functional verification steps in Task 2 / Task 3 / Task 4 verify blocks against the Drummond reference job. Each step's expected output is documented inline. Capture screenshots or query output for SUMMARY documentation.

6. **Supabase advisor regression**

```bash
# Via supabase MCP at execute-time.
mcp__supabase__get_advisors --type security
mcp__supabase__get_advisors --type performance
```

Expect: no NEW warnings introduced by 00094 (existing 8 mutable-search-path + 2 extension_in_public + 30 anon-callable SECURITY DEFINER warnings are pre-existing per audit Section 5; this plan does not address them).

## Dependencies

**Schema:** none. Migration 00094 is independent of migrations 00091-00093 (different tables and columns). No FK cascades from outside the plan.

**Code:** none. The three modified routes (`lien-releases/[id]`, `lien-releases/bulk`, `jobs`) do not share state with each other; the import update on `jobs/route.ts` reuses the existing `@/lib/activity-log` module without modifying it.

**Sequencer:** Plan order is **A-1 -> A-2 -> A-3 -> A-4** (with optional A-5 absorption decision at plan-review halt per Wave-A EXPANDED-SCOPE.md "Sequencing + dependencies"). A-1 lands first because:

- Smallest D-035 cleanup with the lowest blast radius (3 schema changes + 3 routes + 1 doc).
- Establishes the canonical Q12 status_history pattern that future entities follow.
- No dependency on A-2 (docx-html auth) or A-3 (budgets drop) or A-4 (invoice_allocations RLS).

## Rollback strategy

**At deploy time (pre-merge):** revert the PR. Migration 00094 has not been applied to production; no rollback needed.

**At deploy time (post-merge, pre-data-write):** apply `supabase/migrations/00094_d035_cleanup.down.sql` via supabase MCP `mcp__supabase__apply_migration` with the rollback file content. The down.sql is best-effort per R.16 convention; CCBL recreate is a shell only (0 rows of original data; mathematically lossless). status_history columns drop is exact-inverse.

**At deploy time (post-merge, post-data-write):** down.sql still applies but status_history JSONB data accumulated between up and down is LOST. Per the up-migration's header contract, this is acknowledged and accepted — Wave-A plans are not expected to round-trip in production. If a critical data-loss concern emerges post-deploy, the fallback is to manually preserve status_history rows via:

```sql
CREATE TABLE _backup_lien_releases_status_history AS
  SELECT id, status_history FROM public.lien_releases WHERE status_history != '[]'::jsonb;
CREATE TABLE _backup_jobs_status_history AS
  SELECT id, status_history FROM public.jobs WHERE status_history != '[]'::jsonb;
```

Then apply down.sql, then ADD COLUMN again, then UPDATE from backup. Out of scope for this plan's automation — surface to Jake if it ever becomes relevant.

**Code rollback:** `git revert <plan-A-1-commit-sha>` reverts the 4 source files (lien-releases/[id]/route.ts, lien-releases/bulk/route.ts, jobs/route.ts, CLAUDE.md). The migration files (00094_*.sql) are NOT removed by the revert; if the migration has been applied to dev/prod, the down.sql must be applied separately.

## Risk register

| Risk ID | Category | Description | Likelihood | Impact | Mitigation |
|---------|----------|-------------|------------|--------|------------|
| R-A1-01 | Schema | DROP TABLE change_order_budget_lines CASCADE inadvertently removes a row in a related table | Very low | Low | Audit confirmed 0 rows; CCBL has no inbound FKs (it FKs OUT to change_orders + budget_lines, both via ON DELETE CASCADE from CCBL side, NOT the other direction). CASCADE only drops the 6 RLS policies on CCBL itself. |
| R-A1-02 | App-layer | A code path bypasses the PATCH / bulk routes and writes lien_releases.status directly via service-role client, skipping the status_history append | Low | Medium | Wave-B Plan B-3 adds a DB-trigger safety net per Q6 F. For Wave-A: document the gap explicitly in SUMMARY; grep `src/` for any direct `.from("lien_releases").update({ status })` writes outside the modified routes. |
| R-A1-03 | App-layer | jobs PATCH adds NEW activity_log coverage; existing tests or dashboards may not expect `entity_type='job' AND action='status_changed'` rows | Low | Low | Wider activity_log coverage is the GOAL per Q12 + AUDIT-LOG-STRATEGY.md. Surface to spec-checker review during /nightwork-qa post-execution. |
| R-A1-04 | Bulk endpoint behavior change | Bulk mark_received on already-received rows used to bump received_at; new code skips the row entirely | Very low | Very low | Per Task 3 Step C — intentional behavior change documented in plan. SUMMARY should note: any UI relying on bulk-action timestamp refresh for already-received rows must move to PATCH single-row instead. |
| R-A1-05 | Performance | Bulk endpoint becomes N+1 round trips | Low | Low | N is bounded by UI batching (typically 1-20). Acceptable per Task 3 Step D. If profiling later shows latency, parallelize with Promise.all in Wave-B Plan B-3. |
| R-A1-06 | Migration apply order | 00094 applies before related Wave-A migrations (A-3 budgets drop) | None | N/A | Wave-A EXPANDED-SCOPE.md explicitly states A-1 lands first; migration numbering 00094 < 00095 (A-3) enforces order. |
| R-A1-07 | Status enum drift | Caller sends `body.status` value not in the lien_releases CHECK enum (e.g., `"draft"`) | Low | Low | DB CHECK rejects with constraint violation; updateWithLock returns 500 error; status_history is NOT written (because the UPDATE was rolled back). No spurious history rows. |

## OPEN-QUESTIONS

None blocking. Two soft-flag items for plan-review iter-1 to consider (not blockers; plan can proceed):

**OQ-A1-1:** The `note` field in the lien_releases PATCH status_history entry reads from `body.note` (if caller supplied), but `body.note` is NOT in the explicit field allow-list at the existing handler's lines 57-65. This means the body validation does not currently expect this field. Should Plan A-1 add `body.note` to the allow-list explicitly, OR leave it as a free-form read (current proposal)?

- **Plan-author recommendation:** leave as free-form read. The PATCH body is typed `Record<string, unknown>`; the allow-list at lines 57-65 controls which fields propagate into the `updates` object that hits the DB. `body.note` is read directly for the status_history entry — it does NOT flow into the DB column allow-list. The free-form read is intentional and consistent with the existing handler's body-shape contract.

**OQ-A1-2:** The bulk endpoint's self-transition skip (Task 3 Step C) is a small behavior change vs. the existing single-UPDATE handler (which would have bumped `received_at` on already-received rows). Should this be preserved (old behavior — always update timestamp) or changed (new behavior — skip)?

- **Plan-author recommendation:** change (skip). Rationale: status_history pollution with self-transitions is more harmful than a stale `received_at` for an already-received row. The UI bulk action's purpose is to mark rows received; rows that are already received are already in the desired state. If a user wanted to refresh the timestamp, they would PATCH single-row instead.

If plan-review iter-1 disagrees on either, surface for Jake at the iter-1 / iter-2 boundary.
