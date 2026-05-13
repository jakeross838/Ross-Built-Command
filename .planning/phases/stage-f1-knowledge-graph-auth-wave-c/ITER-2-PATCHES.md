# Wave-C iter-2 Plan-Review Patches (authoritative addendum to C-1 PLAN.md)

**Status:** iter-2 amendments (Jake-authorized per nwrp116 autonomous envelope within Wave-C scope).
**Source reviews (iter-1):**
- architect verdict: WARNING (3 HIGH + 4 MEDIUM; inline message)
- database-reviewer verdict: WARNING (1 HIGH + 4 MEDIUM; `.planning/plan-reviews/stage-f1-knowledge-graph-auth-wave-c-database-review-iter1.md`)
- nightwork-data-migration-safety verdict: WARNING (3 HIGH + 4 MEDIUM; inline)
- security-reviewer verdict: WARNING (2 HIGH + 3 MEDIUM; `.planning/plan-reviews/stage-f1-knowledge-graph-auth-wave-c-security-review-iter1.md`)
- nightwork-multi-tenant-architect verdict: **BLOCKING** (2 CRITICAL + 3 HIGH + 2 MEDIUM; inline) — Task 6 Option B violates D-30 by-construction

**Resolution:** No iter-2 reviewer round. Findings are mostly doc clarifications + small SQL additions + one code refactor (Task 6 → Option A). Executor applies patches below at execute-time atop the original PLAN.md.

**Verdict consolidation (deduplicated across 5 reviewers):**
- BLOCKING: 1 (multi-tenant)
- CRITICAL: 1 (Task 6 Option B → Option A)
- HIGH (unique): 5
- MEDIUM (unique): ~12

---

## CRITICAL fix (must apply before execute)

### CR-C1-1 — Promote Task 6 (`src/app/invoices/page.tsx`) from Option B to Option A (explicit `org_id` filter)

**Flagged by:** multi-tenant-architect (CRITICAL-1), security-reviewer (HIGH-1), database-reviewer (MED-4), architect (H-3). **4-of-5 reviewer consensus on resolution.** (Data-migration-safety did not explicitly flag this but did not dissent.)

**Plan-author's "least-change-from-existing-pattern" justification rejected.** Per CLAUDE.md "Architecture posture": *"Multi-tenant RLS is non-negotiable... Tenant safety is built BY CONSTRUCTION, not by enforcement — design schemas and APIs so that a tenant cannot leak via this design even with a dropped RLS policy."* Per CLAUDE.md "Development Rules": *"Every API route uses `getCurrentMembership()` before DB access. RLS alone is a backstop, not a substitute for application-layer auth. A dropped policy must not cause a leak. Filter every query by `membership.org_id`."*

**Why CRITICAL (multi-tenant reasoning):** Task 6's pattern reads `org_members` joined to `profiles` without explicit `org_id` filter. `org_members` has ONLY a PERMISSIVE `"members read org_members"` policy (migration 00016:142) — **no RESTRICTIVE org-isolation backstop** (multi-tenant MED-1; reviewer's separate finding). If that single PERMISSIVE policy is ever dropped or rewritten incorrectly, the unfiltered query returns **every PM in every org in the database**. (Profiles DOES have RESTRICTIVE backstop per 00016:163 + 00049:285-288 — architect H-2; security-reviewer was incorrect about profiles being wide-open. The single-point-of-failure risk is on `org_members`, not `profiles`.)

**Executor action:** Refactor `src/app/invoices/page.tsx` to mirror the Task 5 (`invoices/queue/page.tsx`) pattern:

1. Add `supabase.auth.getUser()` pre-flight to fetch authenticated user.
2. Fetch user's active `org_members` row to get `org_id`:
   ```typescript
   const { data: membership } = await supabase
     .from("org_members")
     .select("role, org_id")
     .eq("user_id", user.id)
     .eq("is_active", true)
     .maybeSingle();
   const orgId = membership?.org_id ?? null;
   ```
3. Use `orgId` as explicit filter on the PM query inside the Promise.all:
   ```typescript
   const pmQuery = orgId
     ? supabase
         .from("org_members")
         .select("user_id, profiles:user_id (id, full_name)")
         .eq("org_id", orgId)
         .eq("is_active", true)
         .in("role", ["pm", "admin"])
     : Promise.resolve({ data: null, error: null });
   ```
4. Remove C1-R7 from risk register (now eliminated by convergence).
5. Update plan's OQ-5 disposition to reflect convergence.

**Adversarial walkthrough confirmation:** If `org_members` RLS policy dropped, the explicit `orgId` filter still scopes results to empty. Without the filter (Option B), the unfiltered query returns cross-tenant PM data.

---

## HIGH fixes (apply during execute)

### HF-C1-1 — `.down.sql` restores wrong write policy (omits 00043)

**Flagged by:** database-reviewer (HIGH-1), data-migration-safety (H-1), architect (H-1). **3-of-5 reviewer consensus.**

**The concern:** Migration 00043 (`rls_owner_admin_write_parity.sql:73-78`) DROPped `"admin write users"` and replaced with `"admin owner write users"` (added `owner` role — fixed Jake Ross's inability to write to public.users). Plan's `.down.sql` restores 00009-era `"admin write users"` policy with only `admin` role. **Post-rollback, Jake (owner role) would lose write access to public.users.**

**Executor action:** In `00097_drop_public_users.down.sql`, replace the `"admin write users"` restoration with:
```sql
DROP POLICY IF EXISTS "admin write users" ON public.users;
DROP POLICY IF EXISTS "admin owner write users" ON public.users;
CREATE POLICY "admin owner write users" ON public.users
  FOR ALL USING (app_private.user_role() IN ('admin', 'owner'))
  WITH CHECK (app_private.user_role() IN ('admin', 'owner'));
```

Update `.down.sql` header comment cumulative migration list: `00004 + 00009 + 00016 + 00043 + 00049` (include 00043).

Update plan's migration comment (~line 528-531): policy count is at least 5 in end-state (1 from 00043 replacement, 4 from cumulative — DB-reviewer's M-1).

### HF-C1-2 — Add fail-loud orphan-FK assertion BEFORE migration 00097 retarget steps

**Flagged by:** data-migration-safety (H-2), database-reviewer (MED-2).

**The concern:** Plan's pre-flight (Task 1 Step B) verifies rowcount but does NOT verify that `invoices.assigned_pm_id` + `org_workflow_settings.import_default_pm_id` values resolve in `profiles(id)`. If any value is orphan, `ADD CONSTRAINT` fails mid-transaction (clean abort via BEGIN/COMMIT, but no remediation guidance).

**Executor action:** Add fail-loud DO block at TOP of migration 00097, BEFORE any DDL:

```sql
DO $$
DECLARE
  v_orphan_invoices INT;
  v_orphan_settings INT;
BEGIN
  SELECT COUNT(*) INTO v_orphan_invoices
    FROM public.invoices
   WHERE assigned_pm_id IS NOT NULL
     AND assigned_pm_id NOT IN (SELECT id FROM public.profiles);
  SELECT COUNT(*) INTO v_orphan_settings
    FROM public.org_workflow_settings
   WHERE import_default_pm_id IS NOT NULL
     AND import_default_pm_id NOT IN (SELECT id FROM public.profiles);
  IF v_orphan_invoices > 0 OR v_orphan_settings > 0 THEN
    RAISE EXCEPTION 'Orphan FK values detected: invoices.assigned_pm_id=%, org_workflow_settings.import_default_pm_id=%. Aborting before FK retarget.',
      v_orphan_invoices, v_orphan_settings;
  END IF;
END $$;
```

Pattern mirrors 00096's pre-flight orphan check (HF-A4-2 in Wave-A).

### HF-C1-3 — Threat model T-C-1-03 factual correction

**Flagged by:** architect (H-2).

**The concern:** Plan's T-C-1-03 mitigation states "RLS policy 'authenticated can read profiles' (00007:60) currently permits cross-org SELECT." This is INACCURATE. Migration 00016:163 added RESTRICTIVE `"org isolation" ON public.profiles` enforcing `org_id = app_private.user_org_id()`. Refreshed in 00049:285-288 with platform_admin bypass. Profile reads ARE already org-scoped at RLS layer.

**Executor action:** Update T-C-1-03 mitigation text in plan to:
> "RLS posture on `public.profiles`: PERMISSIVE `'authenticated can read profiles'` policy (00007:60-64) is `USING (true)` BY DESIGN — designed for cross-org PM dropdown lists. RESTRICTIVE `'org isolation'` policy (00016:163, refreshed 00049:285-288) scopes ALL SELECT/INSERT/UPDATE/DELETE operations to `org_id = app_private.user_org_id()`. **Profile reads ARE org-scoped at RLS layer.** Single-point-of-failure concern in this plan is on `org_members` (which has ONLY PERMISSIVE `'members read org_members'` and no RESTRICTIVE backstop — multi-tenant-architect MED-1), NOT on `profiles`."

This correction strengthens — not weakens — the case for CR-C1-1 (Task 6 → Option A): the SPOF is on `org_members`, which is exactly what Task 6's RLS-trust relies on.

### HF-C1-4 — Document rollback decision tree for mixed-state scenarios

**Flagged by:** data-migration-safety (H-3).

**The concern:** Plan's rollback strategy doesn't explicitly model the mixed-state scenario where `.down.sql` and src revert happen non-atomically — could create silent UI gap window (PM names go null).

**Executor action:** Add to plan's "Post-ship rollback" section:

> **Mixed-state rollback decision tree:**
> - **Atomic rollback (`.down.sql` + src revert in single PR):** OPERATIONAL — no UI gap. Recommended path.
> - **`.down.sql` applies WITHOUT src revert:** OPERATIONAL — src reads from `profiles + org_members` continue working (unaffected by table restore). Safe direction.
> - **Src revert WITHOUT `.down.sql`:** BUILD FAILS at compile time (TypeScript references nonexistent `users` table; or runtime FK errors). Not deployable; rollback must include `.down.sql`.
> - **`.down.sql` first, src revert deferred:** SAFE — `public.users` schema restored empty; src continues reading `profiles + org_members`. No degradation.
> - **Src revert deployed first, `.down.sql` applied later:** **UI GAP WINDOW** — between src deploy and `.down.sql` apply, src reads `from("users")` against the (still-existing-from-merge) table → returns data correctly until `.down.sql` empties it. After `.down.sql`: `from("users")` returns empty arrays → PM dropdowns empty, "Unassigned" everywhere. **AVOID this sequence.**

Pair with reseed SQL snippet in `.down.sql` header for emergency data restore option.

### HF-C1-5 — OQ-5 disposition: REQUIRE Option A for all 5 files (codifies CR-C1-1)

**Flagged by:** multi-tenant-architect (HIGH-1), architect (H-3), security-reviewer (HIGH-1), database-reviewer (MED-4).

**Executor action:** Update plan's §"Open questions" OQ-5 to:
> **OQ-5 RESOLVED:** Converge on Option A across all 5 refactored files. Per CLAUDE.md "Filter every query by membership.org_id" and D-30 by-construction principle. Task 6 (`invoices/page.tsx`) promoted to Option A per CR-C1-1. C1-R7 risk register entry removed (no longer applicable). Wave-C exits with uniform architectural posture across all refactored surfaces.

Plus update C1-R7 risk register entry to "RESOLVED — Task 6 promoted to Option A per iter-2 CR-C1-1."

---

## MEDIUM fixes (document or address opportunistically)

### MED-C1-1 — Pre-flight role-divergence check before FK retarget

**Source:** security-reviewer (M-1).

**Action:** Add to Pre-flight Step B (or as new Step B2):
```sql
SELECT i.id AS invoice_id, u.role AS users_role, p.role AS profiles_role
  FROM public.invoices i
  JOIN public.users u ON u.id = i.assigned_pm_id
  JOIN public.profiles p ON p.id = i.assigned_pm_id
 WHERE u.role != p.role
   AND i.assigned_pm_id IS NOT NULL;
-- Expected: 0 rows.
-- If non-zero: invoice's joined role would shift post-retarget (users.role
-- includes 'owner'; profiles.role CHECK is 'admin'/'pm'/'accounting' only).
-- Surface to Jake before apply.
```

Run during pre-flight; document results in SUMMARY.md.

### MED-C1-2 — `console.error` guard for null `orgId` in Task 5

**Source:** security-reviewer (M-3).

**Action:** In Task 5 refactor of `invoices/queue/page.tsx`, when `orgId` resolves to null, log:
```typescript
if (!orgId) {
  console.error("[invoices/queue] Membership has no org_id; PM dropdown will be empty", {
    user_id: user.id,
    membership,
  });
}
```

Same pattern in Task 6 after CR-C1-1 promotion to Option A.

### MED-C1-3 — `.down.sql` empty-table banner warning at top of file

**Source:** architect (M-3), data-migration-safety (M-1).

**Action:** Add to `.down.sql` top (BEFORE existing header comments):
```sql
-- ============================================================
-- ⚠️ WARNING: SCHEMA-ONLY RESTORE.
-- This .down.sql restores the public.users TABLE STRUCTURE only.
-- Legacy data (9 internal-team rows from 00004 + 00007) is NOT
-- reseeded. Data lives in auth.users + profiles (unaffected by drop).
-- For data restore: hand-execute 00004:17-26 + 00007:88 seed SQL.
-- ============================================================
```

### MED-C1-4 — Strengthen Pre-flight Step B with equivalence assertion + LEFT JOIN check

**Source:** data-migration-safety (M-2), database-reviewer (MED-2).

**Action:** Replace Step B's existing rowcount check with:
```sql
-- Step B (strengthened): mandate equivalence + LEFT JOIN orphan check
SELECT u.id, u.full_name, u.email,
       CASE WHEN p.id IS NULL THEN 'MISSING FROM PROFILES' ELSE 'OK' END AS profile_status
  FROM public.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.deleted_at IS NULL;
-- Expected: ALL rows show 'OK'.
-- If ANY row shows 'MISSING FROM PROFILES': HALT — FK retarget would
-- fail on that row's assigned_pm_id values.

-- HALT thresholds:
-- - public.users count > profiles count + 2 → HALT (legacy accretion)
-- - public.users count < profiles count - 2 → HALT (drift)
-- - any row with profile_status='MISSING FROM PROFILES' → HALT
```

### MED-C1-5 — Replace `DROP CONSTRAINT IF EXISTS` with fail-loud `DROP CONSTRAINT`

**Source:** database-reviewer (MED-3).

**Action:** In migration 00097, the two FK retarget steps use `IF EXISTS`. Replace with explicit `DROP CONSTRAINT` (no `IF EXISTS`) so failed name match fails loudly. The process-level FK enumeration check (Task 1 Step C) already validates the names exist.

### MED-C1-6 — Add PostgREST schema-cache reload verification curl

**Source:** data-migration-safety (M-3).

**Action:** Add to verification commands section:
```bash
# Verify PostgREST resolves assigned_pm relationship post-FK-retarget
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/invoices?select=id,assigned_pm:assigned_pm_id(id,full_name)&limit=1" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $TEST_JWT" \
  | jq '.[0].assigned_pm'
# Expect: { "id": "...", "full_name": "..." } — NOT null (unless invoice has no PM).
# If null on a PM-assigned invoice: PostgREST schema cache reload needed.
# Mitigation: Supabase Studio API Settings → Reload schema cache (manual).
```

### MED-C1-7 — `EXPLAIN ANALYZE` on new `org_members + profiles` join

**Source:** data-migration-safety (M-4); CLAUDE.md standing rule.

**Action:** Run on Drummond org post-apply; add to SUMMARY.md AC-C1-06:
```sql
EXPLAIN ANALYZE
SELECT user_id, profiles.id, profiles.full_name
  FROM org_members
  JOIN profiles ON profiles.id = org_members.user_id
 WHERE org_id = '00000000-0000-0000-0000-000000000001'
   AND is_active = true
   AND role IN ('pm', 'admin');
-- Expected: sub-millisecond on 12-row tables.
-- Document query plan in SUMMARY.md. Surface to Jake if >100ms.
```

### MED-C1-8 — Document FK target choice rationale in plan §Migration design

**Source:** architect (M-1).

**Action:** Add paragraph to plan §"Migration design rationale" explaining why FKs retarget to `profiles(id)` not `auth.users(id)`:
> **FK target choice: `profiles(id)` over `auth.users(id)`.** Codebase convention for person-FKs is `REFERENCES auth.users(id)` (30+ existing FKs follow this pattern). Plan C-1 retargets to `profiles(id)` because the PostgREST relationship hint `assigned_pm:assigned_pm_id (id, full_name, role)` requires `full_name` + `role` columns — which exist on `profiles`, NOT on `auth.users`. FK pointing at `auth.users` would break the named relationship resolution. This is a deliberate convention divergence; documented for Wave-B coordination if future entity-FKs need similar PostgREST hint support.

### MED-C1-9 — Threat model T-C-1-04 factual correction

**Source:** architect (M-2).

**Action:** Correct T-C-1-04 in plan from "activity_log.user_id stores user UUIDs as TEXT without FK" to:
> "activity_log.user_id is `UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL` (migration 00026:85). Post-drop of `public.users`, historical rows pointing at user UUIDs continue to resolve through `auth.users` (unaffected by this plan) + lookup via `profiles` (`auth.users → profiles` 1:1 per 00007:5)."

### MED-C1-10 — Add pg_constraint cross-check to Pre-flight FK enumeration

**Source:** architect (M-4).

**Action:** Add as Step C2 in pre-flight:
```sql
SELECT conname, conrelid::regclass, contype, confrelid::regclass
  FROM pg_constraint
 WHERE contype = 'f'
   AND confrelid = 'public.users'::regclass;
-- Expected: 2 rows (invoices_assigned_pm_id_fkey + org_workflow_settings_import_default_pm_id_fkey).
-- If divergent from Step C information_schema query: HALT for Jake.
```

Belt-and-suspenders against raw-DDL FKs that information_schema might miss.

### MED-C1-11 — Sentry observability for refactored surfaces

**Source:** security-reviewer (M-2).

**Action:** Add to executor notes:
> Post-deploy, monitor Sentry for any 500s from the 5 refactored surfaces in the 24-hour observation window. Flag for Jake if Sentry surfaces unexpected errors related to `from("users")` or `assigned_pm` relationship resolution.

### MED-C1-12 — Update plan's policy attribution prose (cosmetic doc fix)

**Source:** database-reviewer (MED-1).

**Action:** Update plan's "Why CASCADE on DROP TABLE" attribution from "3 from 00049 + 2 from 00009" to accurate full chain: 00009 (initial) → 00016 (org isolation RESTRICTIVE replacement) → 00043 (write parity owner-role add) → 00049 (platform_admin bypass refresh).

---

## Acceptance criteria additions (per iter-2)

Add to Plan C-1 AC list:
- **AC-C1-09 (NEW):** Pre-flight orphan-FK assertion DO block (HF-C1-2) embedded at TOP of migration 00097 BEFORE retarget steps. Migration aborts cleanly on orphan detection.
- **AC-C1-10 (NEW):** Task 6 promoted to Option A per CR-C1-1. All 5 refactored files use explicit `org_id` filter; OQ-5 unanimous convergence achieved.
- **AC-C1-11 (NEW):** `.down.sql` restores `"admin owner write users"` policy per HF-C1-1; 00043 included in cumulative migration list comment.
- **AC-C1-12 (NEW):** Pre-flight role-divergence check (MED-C1-1) + equivalence assertion (MED-C1-4) + pg_constraint cross-check (MED-C1-10) all PASS before migration applies.

---

## Open-question dispositions (iter-1 → iter-2)

**Accept plan-author defaults:**
- OQ-1 (Audit-vs-grep divergence): document in SUMMARY.md; proceed with actual 5-file set.
- OQ-2 (PostgREST relationship hint): keep hint; explicit-join fallback documented.
- OQ-3 (`"user"` in ActivityEntityType): defer to Wave-B Plan B-4.
- OQ-4 (`import_default_pm_id` ON DELETE semantic improvement): documented in SUMMARY; minor improvement.

**Override plan-author default:**
- **OQ-5 (Task 6 Option A vs B):** REQUIRE Option A across all 5 files per CR-C1-1. Plan-author's "least-change-from-existing-pattern" justification rejected by 4-of-5 reviewers.

---

## Executor instructions summary

When executing Plan C-1:

1. **Read PLAN.md + THIS DOCUMENT** together. ITER-2-PATCHES.md overrides PLAN.md where they conflict.
2. **CR-C1-1 is mandatory** — refactor Task 6 (`src/app/invoices/page.tsx`) to Option A with explicit `org_id` filter + auth pre-flight.
3. **HF-C1-1 mandatory** — `.down.sql` restores `"admin owner write users"` from 00043 (not 00009 era).
4. **HF-C1-2 mandatory** — fail-loud orphan-FK assertion at TOP of migration 00097.
5. **HF-C1-3 + HF-C1-4 + HF-C1-5** — doc/scope corrections; apply during execute.
6. **MED-* items** apply opportunistically; surface at GATE-C halt if any cannot land.

7. **Acceptance criteria updates:** AC-C1-09 (orphan assertion) + AC-C1-10 (Option A convergence) + AC-C1-11 (down.sql 00043) + AC-C1-12 (pre-flight strengthening).

8. **GATE-C halt summary must surface:**
   - All MED-* findings deferred to Wave-B/future
   - SUMMARY.md confirmation of all CR + HF + MED patches applied
   - Pre-flight verification results (rowcount, role divergence, FK orphan check, pg_constraint cross-check)
   - Post-apply verification results (12 verification queries from migration footer + new MED-C1-6 + MED-C1-7)
   - org_members RESTRICTIVE policy gap (multi-tenant MED-1) — route to Wave-B or future hardening plan
   - cross-tenant PM assignment risk (multi-tenant analysis) — compound-FK to org_members for future Wave consideration

---

## Deferred follow-ups for Wave-B / future F1+ work

These items surfaced during Wave-C iter-1 plan-review but are **out of Wave-C scope**. They are tracked here for explicit routing rather than buried in the GATE-C halt summary, per nwrp117 Verification 2 requirement.

### DEF-WC-1 — `org_members` lacks RESTRICTIVE `"org isolation"` policy

**Source:** nightwork-multi-tenant-architect (MED-1).

**Concern:** Unlike `profiles`, `invoices`, `jobs`, `vendors`, etc. (which have BOTH a PERMISSIVE role-based/auth-based policy AND a RESTRICTIVE `"org isolation"` from migrations 00016 + 00049), `org_members` has ONLY:
- `"members read org_members"` PERMISSIVE FOR SELECT `USING (org_id = app_private.user_org_id())` (00016:142)
- platform_admin PERMISSIVE FOR SELECT (00049:380)

**This is the actual single-point-of-failure that motivated CR-C1-1 (Task 6 → Option A).** If the PERMISSIVE `"members read org_members"` policy is dropped or rewritten incorrectly (as happened to the 8 core tables before 00080 RESTRICTIVE sweep), there is no RESTRICTIVE backstop. The other 30+ tenant tables that received RESTRICTIVE backstops in 00016 + 00049 don't have this gap.

**Route:** Wave-B Plan B-3 (deletion safety net trigger work — natural pairing with RLS hardening) OR a dedicated F1+ hardening micro-plan ("org_members RESTRICTIVE backstop addition"; ~1 migration; ~0.5 day).

**Migration shape (preview for plan-author):**
```sql
CREATE POLICY "org isolation" ON public.org_members
  AS RESTRICTIVE FOR ALL
  USING (org_id = (SELECT app_private.user_org_id()) OR (SELECT app_private.is_platform_admin()))
  WITH CHECK (org_id = (SELECT app_private.user_org_id()));
```

Mirrors the canonical 00049 pattern with HF-A4-1 `(SELECT ...)` session-cache wrapping from Wave-A.

**Pairs with:** removes Task 6's CR-C1-1 motivation entirely (defense-in-depth would no longer be a workaround for a missing RESTRICTIVE layer; both defense layers would exist). Even with DEF-WC-1 applied, Option A application-layer filtering stays as best-practice per D-30 by-construction.

---

### DEF-WC-2 — `invoices.assigned_pm_id` compound-FK consideration

**Source:** nightwork-multi-tenant-architect (cross-tenant PM assignment risk analysis).

**Concern:** Pre/post-Wave-C state both allow theoretical cross-tenant PM assignment at the DB FK constraint level. Current FK references `profiles(id)` (post-Wave-C) — single-column FK, no enforcement that `invoices.assigned_pm_id` value's profile belongs to the same org as the invoice. Effective protection today: app-layer enforcement (via `getCurrentMembership()` in API routes) + RLS RESTRICTIVE `WITH CHECK (org_id = user_org_id())` on `invoices` (blocks cross-org INSERT/UPDATE wholesale, but doesn't specifically validate `assigned_pm_id` ↔ org binding).

**Compound-FK shape (preview for future Wave):**
```sql
ALTER TABLE public.invoices
  DROP CONSTRAINT invoices_assigned_pm_id_fkey;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_assigned_pm_id_org_id_fkey
  FOREIGN KEY (assigned_pm_id, org_id)
  REFERENCES public.org_members (user_id, org_id);
```

This would make cross-tenant PM assignment DB-impossible (FK violation on INSERT) — true by-construction.

**Route:** Wave-B or future F1+ hardening plan. NOT in Wave-C scope. Same pattern applies to other person-FKs (`org_workflow_settings.import_default_pm_id`, etc.).

**Pre-existing risk:** This risk exists today pre-Wave-C and post-Wave-C identically. Wave-C does NOT make it worse and does NOT fix it. The FK retarget from `users(id)` to `profiles(id)` is semantically neutral on this axis.

---

### DEF-WC-3 — Plan threat-model accuracy discipline (calibration-log entry)

**Source:** Plan's T-C-1-03 + T-C-1-04 factual errors caught by architect.

**Concern:** Plan-author wrote T-C-1-03 claiming "profiles RLS permits cross-org SELECT" (factually wrong — profiles HAS RESTRICTIVE backstop) and T-C-1-04 claiming "activity_log.user_id stores TEXT" (factually wrong — IS UUID FK to auth.users). Security-reviewer made the SAME error on profiles independently. This suggests planner agents may not be rigorously verifying RLS posture claims against actual migration files.

**Route:** Calibration-log entry post-Wave-C ship. Recommendation: planner agents should cite migration filename + line number for every RLS posture claim in threat-model entries; reviewers should cross-check before endorsing. Same diagnose-first discipline applied to F1 expansion (read canonical docs before deciding).

---

## Cost tracking

- Plan-review iter-1: 5 reviewer agents (~600K tokens cumulative agent context).
- iter-2 patches: doc-only; ~0 vision spend.
- Cumulative vision spend post-iter-1: still ~$2 (40% of $5 ceiling).
