---
type: decision-brief
status: INVESTIGATIVE (no code; no D-### entry)
authored: 2026-05-14 (path-named 2026-05-15 per nwrp145 reviewer scheduling)
authored_by: orchestrator (claude-opus-4-7[1m]) under nwrp145 autonomous-run Phase 2
authorization: nwrp145 — "Phase 2: Author user-identity FK convention decision brief; no D-### entry written, no code"
prerequisite_for: Wave-B execute (Wave-B prereq #10)
inherits_from: D-078 (Wave-D D-5 user-identity FK convention split: auth.users default; profiles for PostgREST display embeds)
---

# User-identity FK convention decision brief

**Question for Jake:** which FK target should each of the 11 currently-NO_FK user-identity-pattern columns be linked to, and what's the codification mechanism (one bulk migration or per-column case-by-case)?

This brief is investigative ONLY. It does NOT write a D-### entry, does NOT modify code, does NOT propose a specific migration. It surfaces the trade-offs so Jake can pick before Wave-B opens.

## §1 — D-078 convention recap (the inherited constraint)

Per `.planning/MASTER-PLAN.md` D-078 (codified in Wave-D D-5):

> New user-identity FKs default to `auth.users` UNLESS the column is used in PostgREST embedding hints for display, in which case `profiles`.
>
> Current state: 56 auth.users-FK columns + 3 profiles-FK columns (post-Wave-D).
> Convention emerged in Wave-C migration 00097 + extended in Wave-D migration 00098. Full standardization deferred (TD-D-078).

The convention split exists because:
- `auth.users` is the canonical Supabase auth table — the FK to `auth.users.id` enforces "user exists in auth system" (ON DELETE NO ACTION prevents user-deletion from orphaning records).
- `profiles` is the application-side display profile table — PostgREST embeds use `profiles` to surface `full_name` + `role` for display (since auth.users isn't directly addressable from PostgREST for non-platform-admin roles).
- Some columns need BOTH (e.g. `org_members.user_id` per migration 00098): auth-side enforcement + PostgREST-side embedding display.

## §2 — Inventory of the 11 NO_FK columns

Verified via live DB query (executed 2026-05-14 against production Supabase):

| # | Table | Column | NOT NULL? | Purpose | Used in PostgREST embed for display? |
|---|-------|--------|-----------|---------|--------------------------------------|
| 1 | change_orders | created_by | nullable | Audit trail (creator) | No (not surfaced in CO list UI) |
| 2 | draws | approved_by | nullable | Workflow audit (draw approval signer) | **Maybe** (G702 signature block surfaces approver name) |
| 3 | draws | created_by | nullable | Audit trail (creator) | No |
| 4 | invoices | created_by | nullable | Audit trail (creator) | No |
| 5 | invoices | duplicate_dismissed_by | nullable | Workflow audit (PM dismissed a duplicate-flag) | No |
| 6 | jobs | created_by | nullable | Audit trail (creator) | No |
| 7 | **jobs** | **pm_id** | **nullable** | **Functional FK — assigns PM to job** | **YES** (job list + job header surface PM full name + role) |
| 8 | lien_releases | created_by | nullable | Audit trail (creator) | No |
| 9 | parser_corrections | corrected_by | **NOT NULL** | AI learning audit (who corrected the parser output) | No |
| 10 | purchase_orders | created_by | nullable | Audit trail (creator) | No |
| 11 | vendors | created_by | nullable | Audit trail (creator) | No |

**Quick reconciliation:**
- 9 `created_by` audit columns: same pattern, FK target should be uniform.
- 1 workflow-audit (`approved_by` on draws): subtle — surfaces in G702 signature block (signer name on the AIA pay-app PDF).
- 1 workflow-audit (`duplicate_dismissed_by` on invoices): pure backend audit, not surfaced in UI.
- 1 AI-learning audit (`corrected_by` on parser_corrections): pure backend training data, not surfaced; NOT NULL so column has stricter constraint.
- 1 functional FK (`pm_id` on jobs): this is the OUTLIER — it's a functional assignment column, NOT an audit trail. Already used in PostgREST embeds for display per Wave-D D-4 (`jobs/[id]/page.tsx` renders PM name). Should mirror `invoices.assigned_pm_id` → profiles convention.

## §3 — Three FK-target options per D-078

### Option A — uniform auth.users FK on all 11

All 11 columns get a single FK to `auth.users(id) ON DELETE NO ACTION`. Mirrors the current 46-column auth.users-FK majority.

**Pros:**
- Simplest migration (one bulk migration adding 11 FKs)
- Auth-side enforcement: prevents orphaning records when auth.users row deleted (NO ACTION blocks the delete with a clear error)
- Consistent with the 46-column auth.users-FK precedent
- No new PostgREST embedding surfaces required

**Cons:**
- `jobs.pm_id` is functionally a profiles-display column (Wave-D D-4 already surfaces PM name via PostgREST embed). Pure auth.users FK would require a SECOND query for display.
- `draws.approved_by` may need PostgREST embed for the G702 PDF (depends on F6 Pay App engine design — unclear today)

### Option B — dual FK on display-surfaced columns (D-078 split applied per-column)

Apply D-078 convention strictly per-column:
- `jobs.pm_id` → BOTH auth.users + profiles (mirrors `org_members.user_id` migration 00098 pattern)
- `draws.approved_by` → BOTH auth.users + profiles (anticipating G702 signature block)
- All other 9 columns → auth.users only

**Pros:**
- Honors the D-078 convention split exactly
- PostgREST embed for `jobs.pm_id` works without secondary query (mirrors the existing `org_members.user_id` dual-FK pattern)
- F6 Pay App engine gets the embed-ready FK without future re-work

**Cons:**
- Slightly more complex migration (2 FKs on 2 columns; 1 FK on 9 columns)
- Introduces variance: 9 single-FK + 2 dual-FK columns within a single migration

### Option C — profile-only FK on display-surfaced columns (avoid dual FKs)

Apply D-078 convention but use profiles SINGLE FK for display-surfaced columns:
- `jobs.pm_id` → profiles only
- `draws.approved_by` → profiles only (if G702 needs display)
- All other 9 columns → auth.users only

**Pros:**
- No dual FKs (simpler than Option B)
- Profile embed works for display

**Cons:**
- Bypasses auth-side enforcement on display-surfaced columns. If `profiles.id` is the canonical FK target (and profiles.id is itself FK to auth.users.id per migration 00007), the auth-side enforcement IS preserved transitively. Need to verify this transitivity holds for ON DELETE semantics.
- Inconsistent with `org_members.user_id` migration 00098 dual-FK precedent.
- Inconsistent with `invoices.assigned_pm_id` which is profiles-only (migration 00097) — actually this MATCHES Option C.

**Wait — re-examining:** Option C ALREADY matches the `invoices.assigned_pm_id` precedent (Wave-C migration 00097: profiles-only FK; works for display). The `org_members.user_id` dual-FK (Wave-D migration 00098) was a SPECIAL case because that column predates D-078 and was migrated retroactively while keeping the existing auth.users FK.

If `invoices.assigned_pm_id` (single profiles FK) is the canonical PM-assignment-column pattern going forward, Option C is the most internally-consistent choice.

## §4 — Per-column recommendation matrix

| # | Column | Recommendation | Rationale |
|---|--------|----------------|-----------|
| 1 | change_orders.created_by | auth.users | Pure audit; not embedded |
| 2 | draws.approved_by | auth.users OR profiles (Jake call) | Depends on G702 signature-block design (F6); SAFEST: auth.users now, migrate if F6 needs display |
| 3 | draws.created_by | auth.users | Pure audit |
| 4 | invoices.created_by | auth.users | Pure audit |
| 5 | invoices.duplicate_dismissed_by | auth.users | Pure audit; backend-only |
| 6 | jobs.created_by | auth.users | Pure audit |
| 7 | **jobs.pm_id** | **profiles (mirrors invoices.assigned_pm_id precedent)** | **Functional FK; display-embedded; canonical PM-assignment pattern** |
| 8 | lien_releases.created_by | auth.users | Pure audit |
| 9 | parser_corrections.corrected_by | auth.users | AI learning audit; NOT NULL but otherwise standard pattern |
| 10 | purchase_orders.created_by | auth.users | Pure audit |
| 11 | vendors.created_by | auth.users | Pure audit |

**Net result:** 10 auth.users + 1 profiles = 11 new FKs. Census becomes 66 auth.users-FK + 4 profiles-FK columns (existing 56+3 + Wave-B-prereq additions).

`draws.approved_by` is a deferred decision pending F6 design — recommend auth.users now and migrate to dual-FK or profiles-only later if F6 surfaces it. Wave-B itself wouldn't need to surface `approved_by` in any UI before F6, so auth.users-only is safe.

## §5 — Codification mechanism

### Mechanism A — one bulk migration in Wave-B Plan B-1

Single migration `0009X_user_identity_fk_convention.sql` adds all 11 FK constraints in one transaction. Mirrors how Wave-D D-5 migration 00098 added the `org_members.user_id → profiles` FK as a single discrete migration.

**Pros:** atomic, reviewable, one diff
**Cons:** if any one FK fails (e.g. orphan rows that violate NEW FK), the whole migration rolls back. Need pre-flight orphan check.

### Mechanism B — per-table migrations spread across Wave-B execute

Each NO_FK table gets its own migration. Smaller blast radius if any one fails.

**Pros:** isolates failure modes
**Cons:** 11 migrations is a lot of churn; D-078 was codified as a single migration each time (00097, 00098), so this would deviate from precedent.

### Mechanism C — staged migration with pre-flight orphan cleanup

Migration adds:
1. Detect orphan rows (where the FK target user UUID doesn't exist in target table)
2. NULL-out (or audit-log + NULL-out) the orphan FKs
3. Add the FK constraint

This is the safest option but requires pre-execute orphan analysis.

**Recommendation:** **Mechanism A + pre-flight orphan probe.** Run a pre-execute query that counts orphan rows for each NO_FK column. If 0 orphans, the bulk migration is safe. If >0 orphans, decide per-column whether to NULL-out or block.

## §6 — Pre-flight orphan probe (run this before Wave-B Plan B-1)

The SQL below probes for orphan rows. Wave-B Plan B-1 author should run this and append the orphan count to the migration's pre-flight checks.

```sql
-- For each NO_FK column, count rows where the user_id value doesn't exist in auth.users.
-- Orphan rows must be NULLed-out (or backfilled) before the FK can be added.

WITH no_fk_columns(table_name, column_name) AS (
  VALUES
    ('change_orders', 'created_by'),
    ('draws', 'approved_by'),
    ('draws', 'created_by'),
    ('invoices', 'created_by'),
    ('invoices', 'duplicate_dismissed_by'),
    ('jobs', 'created_by'),
    ('jobs', 'pm_id'),
    ('lien_releases', 'created_by'),
    ('parser_corrections', 'corrected_by'),
    ('purchase_orders', 'created_by'),
    ('vendors', 'created_by')
)
SELECT
  table_name,
  column_name,
  /* TODO: build dynamic SQL OR list orphan-count queries per row */
  '-- orphan probe query template' AS hint
FROM no_fk_columns;

-- Concrete probe (example for jobs.pm_id, profiles target):
SELECT 'jobs.pm_id' AS col, COUNT(*) AS orphan_count
FROM public.jobs j
WHERE j.pm_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = j.pm_id);

-- Concrete probe (example for any auth.users-target column):
SELECT 'jobs.created_by' AS col, COUNT(*) AS orphan_count
FROM public.jobs j
WHERE j.created_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = j.created_by);

-- For Wave-B Plan B-1 author: run all 11 probes; expect 0 orphans for
-- non-`parser_corrections` columns (NOT NULL on parser_corrections.corrected_by
-- means orphans would have been impossible to insert ONLY IF the column had
-- an existing constraint; without FK, an arbitrary UUID could have been
-- inserted). Run + report.
```

## §7 — SOC2 mapping

Adding these 11 FKs maps to:

- **CC6.1 (access controls)** — FK enforces that the user-identity claimed in an audit column refers to a real user in the auth system. Prevents data-integrity drift where an `created_by` field could reference a never-existed user UUID.
- **CC7.2 (audit-trail durability)** — ON DELETE NO ACTION on the FK ensures the audit trail can never be silently broken by user deletion (Supabase auth-user delete now requires explicit handling — and in practice users are soft-deleted via auth.users.deleted_at, not hard-deleted).
- **PI1.1 (processing integrity)** — Display embeds (for `jobs.pm_id` → profiles) become consistent with the rest of the embeddings convention.

## §8 — Open questions for Jake

1. **Approve recommendation matrix in §4?** Specifically `jobs.pm_id` → profiles (single FK, mirrors invoices.assigned_pm_id) vs `auth.users` (mirrors created_by pattern) vs dual (mirrors org_members.user_id).
2. **`draws.approved_by` — defer to F6 OR commit now?** If commit now: auth.users vs profiles? Decision depends on whether F6's G702 signature block needs PostgREST embedding (vs server-side join).
3. **Mechanism A vs B vs C?** Recommendation: A (single bulk migration) + Mechanism C's orphan probe as a pre-flight check.
4. **D-### sequence number?** Next would be D-080. Should this be authored in Wave-B Plan B-1 frontmatter OR earlier as a stand-alone decision migration?
5. **Wave-B prereq #10 closeout:** is this brief sufficient closeout for prereq #10, or does Jake want a full D-### entry authored before Wave-B opens?

## §9 — What this brief does NOT do

- Does NOT write a D-### entry in MASTER-PLAN.md (Jake authors after approving recommendation)
- Does NOT modify any source code
- Does NOT write the Wave-B Plan B-1 migration (Plan B-1 author does that, taking this brief as input)
- Does NOT decide the F6 Pay App engine signature-block surface area
- Does NOT run the orphan probe against production (that's Plan B-1 pre-flight)

## §10 — Path to D-080 entry

Once Jake approves §4 recommendation matrix, the D-080 MASTER-PLAN entry would read approximately:

> **D-080** | 2026-05-XX | **User-identity FK convention codification for 11 remaining NO_FK columns.** Wave-B prereq #10 closeout. Per D-078 inherited convention split (auth.users default; profiles for PostgREST display embeds), the 11 NO_FK columns inventoried at `.planning/decisions-pending/2026-05-15-user-identity-fk-convention-BRIEF.md` get FK constraints per §4 recommendation matrix:
> - 10 columns → auth.users(id) ON DELETE NO ACTION (created_by audit trail + draws.approved_by deferred + invoices.duplicate_dismissed_by + parser_corrections.corrected_by)
> - 1 column → profiles(id) ON DELETE NO ACTION (jobs.pm_id — display-embedded; mirrors invoices.assigned_pm_id pattern)
>
> Census post-codification: 66 auth.users-FK + 4 profiles-FK columns. Codified via single Wave-B Plan B-1 migration `0009X_user_identity_fk_convention.sql` with pre-flight orphan probe per brief §6. SOC2 mapping: CC6.1 (access integrity) + CC7.2 (audit-trail durability) + PI1.1 (processing integrity).

This D-080 wording is a DRAFT for Jake review. Final wording, sequence number, and "draws.approved_by" disposition are Jake's call.

---

**End of brief.** Awaiting Jake input on §8 open questions before Wave-B Plan B-1 authoring begins.
