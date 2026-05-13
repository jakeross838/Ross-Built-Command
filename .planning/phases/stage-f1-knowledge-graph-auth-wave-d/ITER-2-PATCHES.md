# Wave-D ITER-2-PATCHES

**Status:** DRAFT — pending Jake review per nwrp122 step 7
**Date:** 2026-05-13
**Source:** nwrp122 (9 decisions + 2 clarifications + SOC2/retention addition)
**Pattern:** Wave-A iter-2 addendum convention — authoritative patches on top of original PLAN bodies; executor follows iter-2 where conflicts exist.
**Reviewer round:** NONE per nwrp122 step 1 (consolidated doc-level + small SQL/code adjustments).

---

## §0 — Pre-flight verification (PRE-EXECUTE — RESULTS LOCKED-IN)

### 0.1 FK count (decision 9 + clarification on §H-D5-01/02)

Query executed via Supabase MCP:
```sql
SELECT
  CASE WHEN confrelid::regclass::text = 'auth.users' THEN 'auth.users'
       WHEN confrelid::regclass::text = 'profiles' THEN 'profiles' END AS target,
  COUNT(*) AS fk_count
FROM pg_constraint c
WHERE c.contype = 'f'
  AND c.confrelid::regclass::text IN ('auth.users', 'profiles')
GROUP BY 1;
```

**Result (current main, pre-Wave-D):**

| target | fk_count |
|--------|----------|
| auth.users | **56** |
| profiles | **2** |

**Post-Wave-D 00098 expected:** auth.users=**56** / profiles=**3** (adds `org_members_user_id_profiles_fkey`).

**Corrections:**
- nwrp121's "45 / 3" was estimated; wrong by 11 (under-counted auth.users) and off-by-one on profiles direction (we're going FROM 2 TO 3, not 3 staying 3).
- Migration 00097 comment ("30+ existing FKs") was already obsolete in main; not a target for this iter.

**Two current profiles-FK columns (pre-Wave-D):**
1. `invoices.assigned_pm_id`
2. `org_workflow_settings.import_default_pm_id`

**Third added by Wave-D 00098:**
3. `org_members.user_id` (NEW — adds 2nd FK on this column; auth.users FK remains)

### 0.2 /invoices/[id]/page.tsx reachability (clarification B)

Grep checks:
```
$ grep -rn "from.*invoices/\[id\]" src/
src/components/invoice-file-preview.tsx:22:    *   .docx  → rendered HTML (fetched from /api/invoices/[id]/docx-html)
src/app/invoices/[id]/page.tsx:808: // Phase 3b: QA Approve — ported verbatim from src/app/invoices/[id]/qa/

$ grep -rn "invoices/\[id\]" next.config.mjs
# (no matches — config uses :id syntax not [id])
```

Inspection:
- `invoice-file-preview.tsx:22` is a doc-comment referencing the API route `/api/invoices/[id]/docx-html`, NOT the page file. Not an importer.
- The self-reference at line 808 is a comment-only mention of the file's own historical context.
- **Zero source-file imports of `src/app/invoices/[id]/page.tsx` module.**

next.config.mjs:97:
```js
{ source: "/invoices/:id", destination: "/financials/bills/:id", permanent: true },
```

**Conclusion: `/invoices/[id]` is 308-redirected at the routing layer. The page module compiles into the bundle but never renders.**

**Decision:** D-2 scope stays at **8 files** (6 original + `aging/page.tsx` + `aging-report/page.tsx`). `/invoices/[id]/page.tsx` gets TD entry; deletion deferred to Wave 1.1-Lite.

### 0.3 D-2 "3.6M queries/day" math (clarification A)

**Evidence chain — 6 distinct DB queries fire on every AppShell mount; all 6 double-fire when AppShell is double-mounted:**

| # | File:line | Query | Notes |
|---|-----------|-------|-------|
| 1 | `src/components/nav-bar.tsx:171-177` | `supabase.auth.getUser()` + `profiles.select("id, full_name").eq("id", user.id).single()` | Profile fetch in NavBar |
| 2 | `src/hooks/use-current-role.ts:28-35` | `org_members.select("role").eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle()` | Role lookup |
| 3 | `src/components/nav/platform-admin-badge.tsx:40-44` | `platform_admins.select("user_id").eq("user_id", user.id).maybeSingle()` | Platform-admin gate |
| 4 | `src/components/notification-bell.tsx:43-49` + `:54` | `notifications.select(...).eq("user_id", userId).limit(10)` + 60s `setInterval` poll | One on mount + 1/60s |
| 5 | `src/components/job-sidebar.tsx:83-90` | `org_members.select("role").eq("user_id", user.id).eq("is_active", true).maybeSingle()` | Duplicate role lookup (parallel #2) |
| 6 | `src/components/job-sidebar.tsx:105-115` | `jobs.select("id, name, address, status, ...").is("deleted_at", null).order("name")` | Sidebar job list |

Per double-mount on the 6 D-2-affected routes (`/financials/bills`, `/financials/bills/queue`, `/financials/bills/qa`, `/financials/lien-releases`, `/financials/payments`, `/financials/pay-apps`): **6 redundant DB queries eliminated per pageview + 1 redundant 60s notifications polling timer eliminated** (cuts ongoing background load in half on those routes).

**Headline math (conservative aggregate):**
```
100,000 tenants × 6 page-loads/tenant/day × 6 doubled-queries/load = 3,600,000 queries/day eliminated
```

**Caveats — be honest about premise:**
- The "100k tenants" multiplier is the **architectural multi-tenant horizon target**, not current scale. Today's Ross Built sole-tenant load is ~36 queries/day eliminated.
- The "6 page-loads/tenant/day" rate is **per-tenant aggregate** (treating each tenant as one unit-of-load). **Per-staff math** would be ~5-10× higher: Ross Built has 6 PMs × ~10 review pageviews/day each = 60/day per-tenant; at 100k similar tenants → 36M/day.
- Conservative headline = 3.6M; per-staff realistic = 36M. Both are forward-looking.

**Plus, separately:** every double-mount on those 6 routes had two 60s notification-bell pollers running. Post-D-2 → one. That's 1 fewer 60s timer per affected route per user-session — non-trivial ongoing background load reduction at architectural horizon.

**Verdict for D-2 priority framing:** D-2's primary motivation remains the **visible bug fix** (double NavBar + double sidebar — Wave-C user-facing issue). The query-reduction is a **side benefit**, not the reason to ship. Don't elevate priority on the basis of headline number; keep the bug-fix framing primary. Math is sound at the doubled-queries-per-mount level (file:line verified); aggregate scaling is forward-looking horizon estimate.

---

## §1 — Plan D-1 patches

### 1.1 Migration body: add `NOTIFY pgrst, 'reload schema'` (decision 8)

**Where:** end of `supabase/migrations/00098_add_org_members_profiles_fk.sql`, immediately before `COMMIT;`.

**Add:**
```sql
-- Belt-and-suspenders: explicitly notify PostgREST schema cache to reload.
-- Supabase managed instances auto-reload via DDL trigger, but Wave-C taught
-- us schema verification ≠ runtime verification. Eliminate the race-window
-- where the FK lands but the cache hasn't picked it up yet.
NOTIFY pgrst, 'reload schema';
```

**Rationale:** addresses iter-1 H-D1-02 + H-D1-12. Cheap; deterministic; closes a class of race.

### 1.2 Migration comment: existing index already covers FK lookup (H-D1-01)

**Where:** within the migration header comment block in `00098_add_org_members_profiles_fk.sql`.

**Add one paragraph:**
```
-- Index posture: org_members.user_id is already indexed by idx_org_members_user_id
-- (migration 00016:177). Adding this FK does NOT require a new index — Postgres
-- uses the existing index for FK lookups (referencing-side coverage). PK on
-- profiles.id provides referenced-side coverage. No CREATE INDEX in this migration.
```

### 1.3 New AC: ON DELETE NO ACTION guard verification (H-D1-05)

**Add to AC list:**

**AC-D1-08** — ON DELETE NO ACTION rejects orphan-creating profile deletion.

Test command (post-apply, against fixture-harness-org):
```sql
-- Should raise FK violation, NOT silently delete:
BEGIN;
DELETE FROM profiles WHERE id = (
  SELECT user_id FROM org_members WHERE org_id = 'fixture-org-uuid' LIMIT 1
);
-- Expected: ERROR — update or delete on table "profiles" violates foreign key
-- constraint "org_members_user_id_profiles_fkey" on table "org_members"
ROLLBACK;
```

Passes if the DELETE raises a FK violation. Fails if DELETE succeeds (would mean NO ACTION isn't enforcing).

### 1.4 Migration header note: lock posture (H-D1-03)

**Add to migration comment:**
```
-- Lock posture: ALTER TABLE ADD CONSTRAINT FOREIGN KEY takes SHARE ROW EXCLUSIVE
-- on org_members + validates every existing row. On Ross Built's current org_members
-- (~14 rows) this is sub-millisecond. At 100k-tenant scale, consider NOT VALID +
-- VALIDATE CONSTRAINT to defer validation cost. For Wave-D current scale: bare
-- ADD CONSTRAINT is correct and simpler. Reconsider when org_members > 10k rows.
```

### 1.5 Plan body: dashboard/route.ts AFTER block consistency (H-D1-08)

The plan's AFTER diff for `src/app/api/dashboard/route.ts:159` removed `Array.isArray(...)` guard while the other 8 sites kept it. **Decision:** restore `Array.isArray(...)` on dashboard/route.ts AFTER too — minimal-diff posture; defensive parity across all 9 sites. Update Task 4 BEFORE/AFTER block.

### 1.6 Plan body: lock constraint name in D-5 cross-reference (H-D1-11)

Plan D-5's iter-2 patch (see §5.2) will cite the exact constraint name `org_members_user_id_profiles_fkey`. This iter-2 patch confirms D-1 + D-5 use the identical literal string in all five reference sites: migration body, migration comment, plan key_links, plan must_haves, plan Rule 2 citation block, D-5 D-078 entry, D-5 CLAUDE.md cross-reference. Executor MUST verify with `grep -c "org_members_user_id_profiles_fkey"` post-execute (expected count ≥ 7).

### 1.7 Plan body: tighten `PmRow` type union (H-D1-07)

**Where:** Task 6 PmRow type declaration.

**Replace** the broad union `{ id, full_name } | { id, full_name }[]` with strict single-object:
```ts
type PmRow = { id: string; full_name: string } | null;
```

PostgREST embedding via `!FKname` syntax returns exactly one row OR null (per FK semantics). Tighter type catches future-PostgREST-array regressions at typecheck time.

If consumers need defensive Array.isArray (per H-D1-08), keep it in code but typescript signature is single-or-null.

### 1.8 Acceptance criteria delta

| Old | New |
|-----|-----|
| AC count: 7 | AC count: 8 (adds AC-D1-08) |
| Migration line count: ~30 | Migration line count: ~32 (adds 2 lines for NOTIFY + comment) |
| Files modified: 11 | Files modified: 11 (unchanged) |

---

## §2 — Plan D-2 patches

### 2.1 Scope expansion to 8 files (decision 1)

**Add to `files_modified`:**
- `src/app/financials/aging/page.tsx` (remove inner AppShell wrap)
- `src/app/financials/aging-report/page.tsx` (remove inner AppShell wrap)

**Pre-flight verification — confirmed via prior reviewer + Grep:**
- Both files are direct page mounts under `app/financials/layout.tsx`'s canonical AppShell wrap.
- Both contain inner `<AppShell>` JSX (same pathology as the original 6).
- Same Fragment-vs-bare decision per file (check modal siblings; default to bare `<main>`).

**Update AC counts:**

| Original | iter-2 |
|----------|--------|
| 6 page files | 8 page files |
| 12 AppShell tags (open+close × 6) | 16 AppShell tags (open+close × 8) |
| 6 import-cleanup sites | 8 import-cleanup sites |

**Update AC-D2-01** to enumerate all 8 file paths.

**Update AC-D2-05** (single-NavBar grep) to verify across 8 routes, not 6: `/financials/bills`, `/financials/bills/queue`, `/financials/bills/qa`, `/financials/lien-releases`, `/financials/payments`, `/financials/pay-apps`, `/financials/aging`, `/financials/aging-report`.

### 2.2 TD entry for /invoices/[id]/page.tsx (decision 2)

**Create new file:** `.planning/tech-debt/TD-WD-01-invoices-id-page-dead-code.md`

```markdown
# TD-WD-01 — /invoices/[id]/page.tsx dead code

**Origin:** Wave-D iter-1 plan-review finding (blast-radius reviewer)
**Captured:** 2026-05-13 nwrp122 decision 2
**Scheduled:** Wave 1.1-Lite

## Evidence (verified 2026-05-13 — see ITER-2-PATCHES.md §0.2)

- File: `src/app/invoices/[id]/page.tsx`, ~2,000+ lines
- Contains TWO inner `<AppShell>` wraps (intra-file double-shell)
- Routed by Next.js App Router to `/invoices/[id]`
- next.config.mjs:97 308-redirects `/invoices/:id` → `/financials/bills/:id`
- Live route at `/financials/bills/[id]` uses `InvoiceReviewView` component via different thin-wrapper, NOT this file
- Zero source-file imports of the page module (grep verified)

## Status

**Unreachable at any live URL.** Module compiles into bundle (build cost + size cost) but never renders.

## Recommended action (Wave 1.1-Lite)

1. Confirm no late-arriving feature plans reference the file
2. Delete the file
3. Add tombstone comment near the redirect (next.config.mjs:97) noting the dead-code removal
4. Investigate why the file persisted past stage-1.5c-IA D-01 redirect (was it migrated incompletely?)

## Estimated impact

- ~2,000 LOC deleted
- Bundle size reduction (~50-100KB minified)
- Removes confusion source for future plan-authors who grep for invoice review UI
```

### 2.3 §Provides — surface 3.6M math (clarification A)

**Add to D-2 plan §Provides:**

```markdown
### Side benefit: query-reduction at scale

Eliminating the double-AppShell render on 6 → 8 affected routes removes 6 redundant
Supabase queries per page load (NavBar profile + useCurrentRole org_members +
PlatformAdminBadge + NotificationBell + JobSidebar role + JobSidebar jobs list)
plus halves a 60s notifications polling timer.

At architectural horizon (100k tenants × 6 per-tenant-aggregate page loads/day):
~3.6M queries/day eliminated. Per-staff realistic math: ~36M/day. See
ITER-2-PATCHES.md §0.3 for full evidence chain with file:line citations.

**Framing:** Side benefit, not primary motivation. D-2 ships to fix the visible
Wave-C double-NavBar/sidebar bug. Query-reduction is a bonus from the bug fix.
```

### 2.4 Patch H-D2-04 — Task 2 prose action fix

Original prose: "Replace lines 397-398 (`<AppShell>` open) with `<>` Fragment open"

**Replace with:** "Replace line 397 only (`<AppShell>` open) with `<>` Fragment open. Line 398 (`<main>` open) is NOT part of the AppShell wrap; do not touch."

### 2.5 Patch H-D2-05 — AC-D2-03 grep tightening

**Original AC-D2-03:** `grep -rn "'app-shell'" src/app/ → expect 0 hits`

**Replace with:**
```
grep -rn 'from "@/components/app-shell"' src/app/{invoices,draws,financials/aging,financials/aging-report} → expect 0 hits
grep -rn '<AppShell' src/app/{invoices,draws,financials/aging,financials/aging-report} → expect 0 hits
```

Two-grep pattern: covers BOTH the import statement (caught by `from "..."`) AND any stray JSX. Avoids false-positives on CSS class names containing `app-shell`.

### 2.6 Patch H-D2-06 — AC-D2-05/06 GATE-D framing

**Restate AC-D2-05 + AC-D2-06:** "Verified at GATE-D pre-ship harness run via `wave-d-smoke.ts` (Plan D-4 deliverable), not at D-2 execute completion. D-2 executor commits without running Playwright; D-4 executor runs the full smoke after both D-1 + D-2 + D-4 land on the same branch."

### 2.7 Patch H-D2-03 (deferred follow-up) — PATTERNS.md addition

**Recommended for post-Wave-D Wave 1.1-Lite (not blocking D-2):** add a PATTERNS.md entry documenting "single-AppShell-per-mount" rule explicitly. Today's convention is emergent (every section layout follows it); the addition prevents future re-introduction of the bug.

Logged as follow-up; **not in D-2 scope** to keep this corrective wave tight.

---

## §3 — Plan D-3 patches

### 3.1 Add Auth Fixture section (H-D3-01 — MOST IMPORTANT)

**Add new subsection** to packet template:

```markdown
## Auth fixture for smoke run

**User:** harness-fixture@nightwork.local
**Password:** see `PLAYWRIGHT_FIXTURE_PASSWORD` env var on Vercel preview deployment
**Org:** harness-fixture-org (UUID seeded via `scripts/fixtures/smoke-seed.sql` per
decision 6; non-Drummond synthetic fixture)
**Memberships seeded for this fixture:**
- 1× owner
- 1× admin
- 7× PM (named "Smoke PM Alpha", "Smoke PM Beta", ..., "Smoke PM Eta" — distinct
  display names to verify the PM-dropdown populates non-Unassigned values)
- 1× accounting

**Activity-log seeded rows:** 10× distinct activity_log entries with assigned_pm
column populated by 4 different fixture PMs (so feed displays display-names not
UUIDs).

To run smoke against a different fixture set, override seed via env vars.
```

### 3.2 Add /draws/:id/print coverage (H-D3-03)

**Add to route table:**

| Route | Redirect-source | Issue context |
|-------|-----------------|---------------|
| `/financials/pay-apps/:id/print` | `/draws/:id/print` (next.config.mjs:102) | Print path — was missing from iter-1 packet |

Expected behavior: page renders printable G702/G703 layout. Smoke spot-check: page has expected `<table>` row count > 0 (verify draw renders); no double-NavBar (print pages may render without AppShell — verify intentional posture).

### 3.3 Fix 308 vs 301 terminology (H-D3-04)

**Replace throughout the packet:** every occurrence of "301-redirect" / "301 permanent" → "**308 permanent** (Next.js `permanent: true` emits HTTP 308, not 301)".

Affected: route table, smoke instructions, forbidden-input list. Single search-replace.

### 3.4 Add /invoices regression-redirect check (H-D3-05)

**Add to packet section §Smoke verification — Routes 8/9 (the no-redirect baseline section):**

```markdown
### Route 10 — Redirect-regression sentinel

```bash
curl -I https://<preview-url>/invoices
# Expected: HTTP/2 308
# Expected: location: /financials/bills
```

```bash
curl -I https://<preview-url>/draws
# Expected: HTTP/2 308
# Expected: location: /financials/pay-apps
```

**Purpose:** confirms 1.5c-IA D-01 redirects still fire. Catches a future regression
where someone accidentally removes redirect rules from next.config.mjs.

If either curl returns 200 or 404 instead of 308 → REGRESSION; halt smoke; investigate.
```

### 3.5 Add Network-tab response check (H-D3-06)

**Add to packet §Per-route smoke template:**

```markdown
### Network-tab verification (every route)

In addition to console-error check, open Browser DevTools Network tab and verify:
- All `/rest/v1/*` PostgREST requests return HTTP 200 (NOT 400/401/403/404/500)
- All `/api/*` Next.js API routes return HTTP 200 or expected 2xx/3xx

The Wave-C 400 (PGRST200 — relationship not in schema cache) was a Network-tab
signal, not a console-error signal. Skipping Network-tab → that class of bug
returns.
```

### 3.6 Add escalation path subsection (H-D3-07)

**Add to packet end:**

```markdown
## If smoke finds an issue

1. Capture: route URL + console errors verbatim + Network-tab failed-request
   details + screenshot
2. File: append to `.planning/qa-runs/wave-d/smoke-results.json` with status "FAIL"
3. Identify owning plan:
   - PostgREST 400 / display-name shows UUID → Plan D-1
   - Double NavBar / double sidebar → Plan D-2
   - Wrong URL (e.g., redirects to `/invoices/*` instead of `/financials/*`) →
     Plan D-3 (this packet — smoke ran against wrong URL)
   - Smoke script crash / config error → Plan D-4
   - D-078 entry missing or mis-cited → Plan D-5
4. /nightwork-qa picks up smoke-results.json automatically per decision 4; ship
   blocks until status changes to PASS or Jake explicitly authorizes proceeding
5. If issue is on the smoke script itself: halt; file as iter-3 patch
```

### 3.7 Tighten forbidden-input grep (H-D3-02)

**Replace** `grep -E '^- '` with broader regex catching H3 headers too:
```bash
grep -E '^(- |#+ .*— )/' packet.md
```

Matches both bullet-listed URLs AND H3 section headers naming routes (e.g., `### Route 1 — /invoices`).

### 3.8 Exclude-other-7-IA-sections statement (H-D3-09)

**Add to packet §Scope:**

```markdown
**Out of scope for this smoke packet:** Today, Pipeline, Price Intel, People,
Company, Reports, Admin top-nav sections. Wave-D Plans D-1 + D-2 did not touch
those surfaces; their canonical smoke coverage lands with later plans (Wave
1.1-Full Layer 4 per calibration-log). If you observe a regression in one of
those sections during this smoke walk, file it as out-of-band — do not block
Wave-D ship.
```

---

## §4 — Plan D-4 patches

### 4.1 Rule 4 lifecycle gate (decision 3 — addresses B-D4-01)

**Replace Rule 4 verbatim text with:**

```markdown
**Rule 4 — Playwright smoke pre-QA for UI-touching plans.**

For any plan whose front-matter declares `requires_smoke: true` (UI-touching:
adds/modifies/removes JSX, components, layouts, or PostgREST hints), the
executor's commit-and-push sequence must trigger a Playwright smoke run AFTER
the Vercel preview deploys.

**Lifecycle sequence (single canonical chain):**

1. /gsd-execute-phase completes all tasks
2. Executor commits + pushes to phase branch
3. Vercel preview deployment fires (auto on push)
4. Executor (or CI hook if wired) runs `npx tsx scripts/wave-d-smoke.ts
   --preview-url <vercel-preview-url>` against the deployed preview
5. Smoke results land at `.planning/qa-runs/<phase>/smoke-results.json`
6. Screenshots land at `.planning/qa-runs/<phase>/screenshots/`
7. /nightwork-qa runs WITH smoke artifacts as input (per Rule 4's named
   enforcer below)
8. GATE-N halt for Jake review

**Rule:** smoke runs BETWEEN executor-commit and /nightwork-qa, not before
either, not after both. /nightwork-qa is the gate.

**Why this position:** running smoke before commit means against localhost which
diverges from production runtime (Wave-C's exact gap). Running smoke after QA
means QA can't act on smoke results — the gate is post-hoc theatre. Position
between them is the only way smoke gates the QA verdict.

**Manual smoke is fallback ONLY when Playwright infra is not yet in place for
the surface.** This will become rarer over time; for any surface that lives in
the smoke script's route registry, automated > manual.
```

### 4.2 Rule 4 named enforcer (decision 4 — addresses B-D4-02)

**Add to Rule 4 codification (continued):**

```markdown
**Enforcer:** /nightwork-qa is the single canonical enforcement point.

**Plan front-matter contract:**

Every plan declares `requires_smoke: true | false`:
- UI-touching plans (adds/modifies/removes JSX, components, layouts, PostgREST
  hints, routing) → MUST declare `requires_smoke: true`
- Schema-only plans (migration text without app-layer changes), doc-only plans,
  config-only plans → MAY declare `requires_smoke: false`
- Plan-author defaults to `requires_smoke: true` when ambiguous

**/nightwork-qa enforcement logic:**

```python
# Pseudocode for /nightwork-qa orchestrator
for plan in wave.plans:
    if plan.requires_smoke is True:
        smoke_path = f".planning/qa-runs/{phase}/smoke-results.json"
        if not exists(smoke_path):
            return Verdict.CRITICAL("smoke artifact missing: " + plan.id)
        smoke = json.load(smoke_path)
        if smoke.status == "FAIL":
            failed_routes = [r.url for r in smoke.routes if r.status == "FAIL"]
            return Verdict.CRITICAL(
                f"smoke FAIL on routes {failed_routes}; ship blocked: " + plan.id
            )
    # if requires_smoke is False: skip smoke check entirely
```

**Single point of enforcement** — do NOT spread across executor-preflight +
/gsd-ship + custodian. One named gate, one verdict.

**Failure-mode taxonomy:**
- `requires_smoke=true` AND artifact missing → CRITICAL "smoke not run"
- `requires_smoke=true` AND artifact status=FAIL → CRITICAL "smoke FAIL"
- `requires_smoke=true` AND artifact status=PASS → smoke-check PASS (proceeds
  to other QA reviewers)
- `requires_smoke=false` → smoke-check N/A (proceeds to other QA reviewers)
- Plan-author forgot to declare → /nightwork-qa returns WARNING "plan missing
  requires_smoke flag; assuming true"; if no artifact → CRITICAL as above
```

### 4.3 Screenshot strategy — DIAGNOSTIC-ONLY (decision 5 — addresses B-D4-04)

**Add to D-4 plan §Scope:**

```markdown
**Screenshot strategy: DIAGNOSTIC-ONLY (no baseline diff).**

`wave-d-smoke.ts` captures one screenshot per route to
`.planning/qa-runs/wave-d/screenshots/<route-slug>-<timestamp>.png`. These are
for Jake's eyeball review at GATE-N halt, NOT for pixel-diff regression
detection.

**Why no baseline+diff:**
- Palette is unstable until Strategic Checkpoint #2 (CP2) reconciliation
- Typography is finalized but density/spacing tokens iterate weekly
- Pixel diffs against shifting baselines produce false-positive noise that
  erodes gate trust

**Baseline+diff is a Wave 1.1-Full Layer 4 deliverable** per calibration-log
F1+ harness extension entry. Defer until palette/density/typography contracts
stabilize post-CP2.

**Filename idempotency (H-D4-08):** include `<run-id>` (epoch milliseconds) in
filename to preserve per-run history. Don't overwrite. Last 10 runs retained;
older runs gitignored.
```

### 4.4 Synthetic fixtures replace Drummond UUIDs (decision 6 — addresses B-D4-03 + H-D4-04 + H-D4-14)

#### 4.4.1 — Create `scripts/fixtures/smoke-seed.sql`

**New file content (skeleton — executor fleshes out at execute-time):**

```sql
-- scripts/fixtures/smoke-seed.sql
--
-- Synthetic seed for verification harness smoke scripts. Non-Drummond UUIDs
-- to avoid embedding real client data in repo-checked-in scripts (per
-- nwrp122 decision 6 + ITER-2-PATCHES §4.4).
--
-- Run order: AFTER schema migrations are applied. Idempotent via ON CONFLICT.
--
-- Used by: scripts/wave-d-smoke.ts (Wave-D), scripts/smoke-* (future).

BEGIN;

-- Synthetic org
INSERT INTO orgs (id, name, slug, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Harness Fixture Org', 'harness-fixture', NOW())
ON CONFLICT (id) DO NOTHING;

-- Synthetic profiles + memberships (1 owner + 1 admin + 7 PMs + 1 accounting = 10)
-- ... full seed spec authored at execute-time by D-4 executor ...

-- Synthetic jobs (10 — diverse status + PM assignment)
INSERT INTO jobs (id, org_id, name, address, status, pm_id, ...) VALUES
  ('22222222-2222-2222-2222-200000000001', '11111111-1111-1111-1111-111111111111',
   'Smoke Job Alpha', '101 Test Lane', 'active', ...),
  -- 9 more rows ...
ON CONFLICT (id) DO NOTHING;

-- Synthetic invoices (5 — covers ai_processed / pm_review / qa_review / in_draw / paid statuses)
-- ... full seed spec at execute-time ...

-- Synthetic activity_log rows (10 — exercises display-name vs UUID rendering)
-- ... full seed spec at execute-time ...

COMMIT;
```

The executor fully expands this skeleton during D-4 execute. UUID conventions:
- Org: `11111111-1111-1111-1111-111111111111`
- Users: `00000000-0000-0000-XXXX-XXXXXXXXXXXX`
- Jobs: `22222222-2222-2222-2222-XXXXXXXXXXXX`
- Invoices: `33333333-3333-3333-3333-XXXXXXXXXXXX`
- Activity log: `44444444-4444-4444-4444-XXXXXXXXXXXX`

NO real Ross Built / Drummond / SmartShield UUIDs anywhere in the seed.

#### 4.4.2 — Update `wave-d-smoke.ts` route table

**Replace hardcoded Drummond UUIDs:**
```
OLD: /financials/bills/7c63cf40-8fe4-409f-bc3c-2a7ef8aea003
NEW: /financials/bills/33333333-3333-3333-3333-300000000001

OLD: /jobs/a1bb4d28-103d-40d8-98fd-2dc449bf5d1c
NEW: /jobs/22222222-2222-2222-2222-200000000001
```

#### 4.4.3 — `requires_drummond_data: true` skip path REMOVED

Routes 4-5 previously marked `skipped_no_fixture_match` → now ALL routes run against synthetic seed; no skip path needed. H-D4-04 resolved structurally.

#### 4.4.4 — CLAUDE.md Domain Rules exception clause (decision 6 cross-reference)

**Add new bullet** under existing "## Nightwork standing rules" → "### Domain rules" section:

```markdown
- **Drummond is the reference job for production-facing artifacts ONLY** — E2E
  flows (`/nightwork-end-to-end-test`), demos, seed data shown to Jake/Andrew,
  and Ross Built canonical truth. **Smoke scripts + verification harness
  fixtures + Playwright tests use synthetic seeded UUIDs** to avoid embedding
  real client data in repo-checked-in scripts. Synthetic seed lives at
  `scripts/fixtures/smoke-seed.sql` (Wave-D Plan D-4 deliverable). When a future
  smoke script needs new fixture data, extend `smoke-seed.sql`; do NOT hardcode
  Drummond/SmartShield/real-vendor UUIDs in scripts/.
```

### 4.5 Rules placement → Standing Rules → Workflow posture (decision 7)

**Plan D-4 Task 1 (CLAUDE.md edit) updated location:**

- Original target: line 535 inside "## Development Rules" section
- **New target:** end of `### Workflow posture` subsection (within "## Nightwork standing rules") — after the `/nightwork-propagate` bullet, before the next subsection break

**Insert Rules 1-4 as new bullets in the Workflow posture list:**

```markdown
- **Rule 1 — Schema verification ≠ runtime verification.** Migrations passing
  + REST-API queries returning expected JSON are NECESSARY but NOT SUFFICIENT
  evidence that a UI-touching plan ships correctly. Plans that touch JSX,
  components, layouts, or PostgREST hints MUST be verified with a runtime
  check on a deployed surface (Vercel preview minimum) before /nightwork-qa
  can pass. Wave-A + Wave-C process gap origin: schema-only verification gave
  false PASSes on 3 user-facing bugs.
- **Rule 2 — PostgREST FK citation requirement on plans that touch embedded
  selects.** Any plan adding/modifying a `select=...:embed(...)` PostgREST hint
  MUST cite the specific FK constraint name + table + column that resolves the
  hint. Plan-review iter-1 BLOCKS without this citation. ai-logic-tester MUST
  execute a representative query to verify the FK resolves at runtime (NOT
  infer from schema metadata).
- **Rule 3 — ai-logic-tester executes representative queries.** For any
  PostgREST relationship, RLS policy, or schema-resolution claim in a plan,
  ai-logic-tester (or equivalent reviewer) MUST execute a representative
  SQL/REST query against current schema. Inferring correctness from migration
  text alone is the Wave-C anti-pattern that shipped 3 bugs. This rule applies
  to plan-review iter-1; SKILL.md propagation per Plan D-4 Task 3.
- **Rule 4 — Playwright smoke pre-QA for UI-touching plans.** (See full Rule 4
  codification in Plan D-4 Task 1 — lifecycle, enforcer, failure modes.
  Summary: plans with `requires_smoke: true` MUST have a passing
  `smoke-results.json` artifact before /nightwork-qa can return PASS.)
```

**Cross-reference under "### Architecture posture" section** (per decision 7 second paragraph):

```markdown
- **PostgREST FK citation rule** — when adding embedded-select hints, cite the
  FK constraint by name in the plan. See Workflow posture Rule 2 for full
  language. Migration 00098 (Wave-D) is the canonical example.
```

### 4.6 Logo placement assertion — global invariant (B-D4-05)

**Add to `wave-d-smoke.ts` per-route check (every route, no exception):**

```ts
// Logo placement invariant per CLAUDE.md UI rules
const logoSelector = 'header [data-slot="org-logo"]';
const logo = await page.$(logoSelector);
if (!logo) throw new Error(`Logo missing on ${route.url}`);
const box = await logo.boundingBox();
const viewportWidth = page.viewportSize()?.width ?? 1280;
if (!box || box.x < viewportWidth * 0.5) {
  throw new Error(`Logo not in right-half of viewport on ${route.url}`);
}
```

**Add `data-slot="org-logo"` attribute** to the wordmark + icon elements in `src/components/branding/Wordmark.tsx` + `src/components/branding/Icon.tsx` (Plan D-4 Task 5 — small JSX patch).

### 4.7 DataGrid row-count + design tokens + display-name vs UUID checks (H-D4-09 + 19 + 20)

**Add to per-route check (list routes only):**

```ts
// DataGrid row-count: must have >=1 row OR explicit empty-state indicator
const rows = await page.$$('[role="grid"] [role="row"], tbody tr');
const emptyState = await page.$('[data-state="empty"]');
if (rows.length === 0 && !emptyState) {
  throw new Error(`DataGrid empty without empty-state indicator on ${route.url}`);
}

// PM dropdown display-name (NOT UUID) — applies to /jobs/new + invoice review surfaces
const pmOptions = await page.$$eval(
  'select[name="pm_id"] option',
  els => els.map(e => ({ value: e.value, text: e.textContent || '' })),
);
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/;
const uuidLeaks = pmOptions.filter(o => uuidPattern.test(o.text.trim()));
if (uuidLeaks.length > 0) {
  throw new Error(`PM dropdown shows UUIDs not display-names on ${route.url}: ${uuidLeaks.map(o=>o.text).join(", ")}`);
}

// Design tokens applied (sample assertion)
const navBg = await page.$eval(
  'header.app-shell-nav, header[data-component="nav-bar"]',
  el => getComputedStyle(el).backgroundColor,
);
// Token should resolve to dark NavBar background; spot-check non-empty + non-transparent
if (!navBg || navBg === 'rgba(0, 0, 0, 0)' || navBg === 'transparent') {
  throw new Error(`NavBar background token not resolving on ${route.url}: ${navBg}`);
}
```

### 4.8 Single-NavBar global invariant (H-D4-21)

**Promote from special-case to per-route invariant (every route, no exception):**

```ts
const navBars = await page.$$('header.app-shell-nav, header[data-component="nav-bar"]');
if (navBars.length !== 1) {
  throw new Error(`Expected exactly 1 NavBar on ${route.url}, got ${navBars.length}`);
}

const sidebars = await page.$$('aside.app-shell-sidebar, aside[data-component="job-sidebar"]');
// Sidebar may be 0 or 1 (per NO_SIDEBAR regex in app-shell.tsx), never 2+
if (sidebars.length > 1) {
  throw new Error(`Expected ≤1 sidebar on ${route.url}, got ${sidebars.length}`);
}
```

### 4.9 Document Review pattern selectors (B-D4-03)

**Add to per-route check (Document Review routes only — invoice/bill detail, proposal review, change-order review, etc.):**

```ts
if (route.pattern === 'document-review') {
  // Layout: file preview LEFT (aside or column-left), right-rail (aside-right),
  // audit timeline BELOW (footer or below-fold section)
  const filePreview = await page.$('[data-pattern-slot="file-preview"]');
  const rightRail = await page.$('[data-pattern-slot="right-rail"]');
  const auditTimeline = await page.$('[data-pattern-slot="audit-timeline"]');
  if (!filePreview) throw new Error(`Document Review missing file preview on ${route.url}`);
  if (!rightRail) throw new Error(`Document Review missing right rail on ${route.url}`);
  if (!auditTimeline) throw new Error(`Document Review missing audit timeline on ${route.url}`);
}
```

Requires adding `data-pattern-slot="..."` attributes to InvoiceReviewView + related components (Plan D-4 Task 6 — small JSX patch on the canonical Document Review surface).

### 4.10 Rule 3 propagation to SKILL.md (H-D4-02)

**Plan D-4 Task 3 updated:**

- Original target: only `.claude/agents/nightwork-ai-logic-tester.md`
- **Add target:** `.claude/skills/nightwork-ai-logic-checker/SKILL.md`

Mirror the Rule 3 text into the SKILL.md operating contract. The agent file points TO the skill; skill content is the runtime contract.

### 4.11 Gitignore .planning/verification/auth/ (H-D4-13)

**Add to `.gitignore`:**

```
# Harness auth state (live Supabase session tokens — never commit)
.planning/verification/auth/
```

Verify on clean checkout: `git status` after running `npx tsx scripts/harness-auth-bootstrap.ts` shows no untracked auth-state files.

### 4.12 Loud WARN on missing bypass secret (H-D4-15)

**In `wave-d-smoke.ts` startup:**

```ts
if (!process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
  console.warn('⚠ VERCEL_AUTOMATION_BYPASS_SECRET not set — preview routes may capture Vercel SSO wall as HTTP 200 (false PASS)');
}
if (!process.env.VERIFICATION_BYPASS_SECRET) {
  console.warn('⚠ VERIFICATION_BYPASS_SECRET not set — middleware bypass disabled');
}
// Loud, but do NOT abort — Jake may intentionally run without bypass for diagnostic
```

### 4.13 Parallel BrowserContext fan-out (H-D4-16) — DEFER

**Decision (executor judgement at D-4 execute):** keep sequential for Wave-D (~7.5min walltime is acceptable for the corrective wave). Parallel fan-out via 3-4× BrowserContext is a Wave 1.1-Full Layer 4 optimization. Document as TD-WD-02 if walltime becomes a blocker in practice.

**Rationale:** Wave-D is corrective; smoke runs are infrequent (per phase, not per commit). Walltime optimization adds complexity (cookie-isolation, retry, sequencing) that isn't load-bearing now. Defer until Layer 4.

### 4.14 Cold-lambda warmup ping (H-D4-17) — /login warmup target per nwrp124 step 5 reversion

**Add to `wave-d-smoke.ts` before route loop:**

```ts
// Cold-start warmup — hit /login as warmup target to absorb Vercel preview
// cold-lambda penalty before the route walk begins.
// Per nwrp124 step 5: /login chosen over a dedicated /api/healthcheck route
// to keep verification-harness scope from introducing permanent production
// code. /login is public + reachable pre-auth (smoke harness session not
// yet bootstrapped at warmup time) + warms the same lambda pool as the
// authenticated routes.
try {
  await page.goto(`${previewUrl}/login`, { timeout: 30_000 });
  console.log('Warmup complete');
} catch (e) {
  console.warn(`Warmup ping failed (proceeding anyway): ${e.message}`);
}
```

If `/login` warmup proves insufficient (timeout flake on first 1-2 routes
despite warmup), open Wave-D-followup; do NOT revisit healthcheck route
during Wave-D execute per nwrp124 step 5.

### 4.15 Empty/loading/error state coverage (H-D4-18) — DEFER

Out of D-4 scope (Wave-D corrective tightness). Track as TD-WD-03; revisit Layer 4.

### 4.16 Mobile viewport coverage (H-D4-22) — DEFER

Out of D-4 scope. Track as TD-WD-04; revisit Layer 4.

### 4.17 Rule 2 enforcement regex tightening (H-D4-01)

**Update plan-review checklist's Rule 2 grep:**

```bash
# In plan body markdown
rg -n '\.select\("[^"]+:[^"]+\(' PLAN-FILE.md

# Plus companion grep over files_modified paths (catches code-only PostgREST hints)
for f in $(awk '/^files_modified:/,/^[a-z]/' PLAN-FILE.md | grep -oP '"\K[^"]+\.tsx?'); do
  rg -n '\.select\("[^"]+:[^"]+\(' "$f"
done
```

If hint found in code but FK constraint name not cited in plan → BLOCKING.

### 4.18 Rule 2 reviewer assignment (H-D4-05)

**Update plan-review checklist:**

- Original: `nightwork-multi-tenant-architect` was primary
- **New:** `architect` is primary (schema-correctness lens); `database-reviewer` co-primary (Postgres + PostgREST mechanics); `nightwork-multi-tenant-architect` secondary (only when embedding crosses tenant boundaries).

### 4.19 Acceptance criteria delta for D-4

| Original | iter-2 |
|----------|--------|
| AC count: 9 (D-4-01..09) | AC count: 13 (D-4-01..13) |
| Plan tasks: 4 | Plan tasks: 6 (adds smoke-seed.sql, data-slot attributes; healthcheck route REVERTED per nwrp124 step 5 — /login used as warmup target) |
| 13 routes | 13 routes (synthetic UUIDs replace Drummond) |
| Rules placement: Dev Rules | Rules placement: Workflow posture |
| Screenshot strategy: implicit | Screenshot strategy: explicit DIAGNOSTIC-ONLY |
| Lifecycle gate: ambiguous | Lifecycle gate: codified between executor+/nightwork-qa |
| Enforcer: implicit | Enforcer: /nightwork-qa single point with requires_smoke flag |

### 4.20 New AC additions

- **AC-D4-10** — Synthetic seed seeded successfully (`SELECT COUNT(*) FROM jobs WHERE org_id = '11111111-...'` returns ≥10)
- **AC-D4-11** — Logo `data-slot="org-logo"` present in NavBar render (grep React component source)
- **AC-D4-12** — `data-pattern-slot` attributes present on Document Review canonical surface
- **AC-D4-13** — `wave-d-smoke.ts` warmup pings `/login` successfully (HTTP 200, no timeout) before the route loop (per nwrp124 step 5 healthcheck reversion)

---

## §5 — Plan D-5 patches

### 5.1 D-078 body text — use verified counts (decision 9 + §0.1)

**Replace the "Current state" sentence:**

OLD: "45 user-identity FKs to auth.users, 2 to profiles, after Wave-D extends to 3 profiles FKs"

**NEW:**

```markdown
**Current state (verified via information_schema 2026-05-13):**
- 56 user-identity FKs to `auth.users.id`
- 2 user-identity FKs to `profiles.id` (`invoices.assigned_pm_id`,
  `org_workflow_settings.import_default_pm_id`)
- Wave-D migration 00098 adds a 3rd profiles FK (`org_members.user_id` →
  `profiles.id` via constraint `org_members_user_id_profiles_fkey`), bringing
  totals to **56 / 3** post-Wave-D.

The "30+" comment in migration 00097's body header was estimated at the time
of authoring and is obsolete; current count is 56. Migration 00097 introduced
the split convention; Wave-D 00098 extends it.
```

### 5.2 D-078 — pin constraint name in cross-reference

**Replace cross-reference line:**

OLD: "Cross-reference: migration 00098 (Wave-D extension)"

**NEW:**

```markdown
Cross-reference:
- Migration 00097 (Wave-C origin of split — dropped `public.users`, kept
  profiles FKs)
- Migration 00098 (Wave-D extension — adds FK `org_members_user_id_profiles_fkey`)
- Plan D-1 ITER-2-PATCHES §1 (canonical migration body)
- ARCHITECTURE.md §SOC2 control mapping
- §11 TECH DEBT REGISTRY entry: "Standardize 56 auth.users user-identity FKs
  toward single target" (deferred to F-phase or Wave 1.1-Full)
```

### 5.3 activity_log FK target classification (H-D5-05)

**Add D-078 §audit-log clause:**

```markdown
**Audit-log anchor (SOC2 CC7.2):** `activity_log.user_id` references
`auth.users.id` (NOT profiles). Audit-trail reconstruction always resolves
through auth.users — durable, never display-name-dependent. Profiles is a
display-only embedding target; auth.users is the identity + ownership +
audit anchor.

If display-name resolution is needed in an audit context, query joins
auth.users → profiles via the 1:1 invariant (profiles.id === auth.users.id
per migration 00007); this join is not via FK, it's via the invariant equality.
```

### 5.4 ON DELETE CASCADE retention clause (H-D5-06)

**Add D-078 §retention clause:**

```markdown
**Retention durability:**

- `profiles.id → auth.users.id ON DELETE CASCADE` (migration 00007:16). If
  auth.users row deletes, profiles row cascades.
- All 3 profiles FKs (`invoices.assigned_pm_id`, `org_workflow_settings.import_default_pm_id`,
  `org_members.user_id`) use `ON DELETE NO ACTION` (Wave-D 00098 explicit;
  pre-existing Wave-C inherited). This means: if a profile is force-deleted
  (cascaded from auth.users), the FK violation blocks the auth.users delete.
  Practical outcome: auth.users + profiles act as ONE deletable unit; you
  cannot delete a user without first orphaning the profiles-FK columns
  (set to NULL or transferred).
- All 56 auth.users-FK columns use various ON DELETE behaviors (CASCADE for
  ownership/audit, NO ACTION for financial records). Audit trail durability
  is preserved via auth.users persistence — profile display-name loss does
  not corrupt audit reconstruction (display-name is presentation-layer; the
  identity anchor at auth.users.id is forever).

**Bottom line:** the FK split does NOT change retention posture. Both
`auth.users` and `profiles` are USER-CRITICAL retention class per
ENTITY-INVENTORY.md (per nwrp122 SOC2/retention addendum).
```

### 5.5 Enumerated PostgREST allowed columns (H-D5-07)

**Add D-078 §embedding scope clause:**

```markdown
**PostgREST embedding hint scope (PII fence):**

The `profile:profiles(...)` embedding syntax is permitted ONLY for the
following columns:
- `id` (UUID — same as auth.users.id; not PII in isolation)
- `full_name` (display string; PII at a low level but exposed via UI labels
  by design)

The following profiles columns MUST NEVER appear in a PostgREST embedding
hint:
- `email` (PII — has its own access controls; expose via /api/profiles route
  if needed for an explicit display purpose, never via embedded JOIN)
- `phone` (PII — same as email)
- Any future PII column added to profiles

**Enforcement:** plan-review iter-1 grep gate (see Plan D-4 Rule 2
enforcement §4.17) catches `profile:profiles(*)` and any embedding referencing
fenced columns. BLOCKING.

**Future:** when a legitimate display-of-email use case arises, the convention
is to introduce an `org_member_directory` view that joins profiles + auth.users
+ org_members with the email column ONLY exposed via explicit GET (never
embedded JOIN). Not in Wave-D scope.
```

### 5.6 SOC2 control mapping (H-D5-08 + nwrp122 addendum)

**Add D-078 §SOC2 clause:**

```markdown
**SOC2 control mapping (per ARCHITECTURE.md §SOC2 control mapping):**

This decision touches the following Trust Services Criteria:

- **CC6.1 (Logical and physical access controls)** — `auth.users` is the
  canonical identity + access-control anchor. The FK convention codifies
  this by requiring ownership/audit/identity columns to anchor at auth.users.
  Plan-author choosing profiles for a non-display column would violate this
  control's intent.
- **CC7.2 (System monitoring — security incidents)** — `activity_log.user_id
  → auth.users.id` ensures audit-trail reconstruction is durable across
  profile-row mutations. Display-name change does not break audit history.
- **PI1.1 (Processing integrity — completeness/validity)** — PostgREST
  embedding fence (§5.5 above) prevents accidental PII exposure via
  wrong-target JOIN. Plan-author cannot accidentally expose email via
  `profile:profiles(*)`; the grep gate blocks at plan-review.

**No new controls introduced by this decision.** The convention crystallizes
existing posture rather than creating new control surfaces.
```

### 5.7 Retention class affirmation (nwrp122 addendum)

**Already covered in §5.4 above.** D-078 entry affirms both `auth.users` and
`profiles` are USER-CRITICAL retention per ENTITY-INVENTORY.md. FK split does
not alter retention posture.

### 5.8 §11 TECH DEBT REGISTRY entry (H-D5-04)

**Add new row to `.planning/MASTER-PLAN.md` §11 TECH DEBT REGISTRY:**

```markdown
| TD-D-078 | 2026-05-13 | F-phase / Wave 1.1-Full | Standardize 56 user-identity
FKs toward single target (auth.users canonical OR profiles canonical). Wave-D
codified split convention per D-078; deferred standardization decision until
F-phase scope or Wave 1.1-Full polish. Effort estimate: ~10-15 migrations
+ touch every consumer site. Cross-ref: D-078, migration 00097, migration 00098. |
```

### 5.9 CLAUDE.md placement (H-D5-03) — RESOLVED

**Decision (executor judgement at D-5 execute):** keep at line 72 between
the existing bullet-list and "### Stage 1.5c information-architecture
additions" subsection. This is the canonical Architecture Rules section per
CLAUDE.md current structure. The reviewer's suggestion to move under a Wave-D
subsection was stylistic; current location is correct.

**One-line cross-reference added** to the "### Workflow posture" section per
decision 7 (see §4.5 above).

### 5.10 Acceptance criteria delta for D-5

| Original | iter-2 |
|----------|--------|
| AC count: 4 (D-5-01..04) | AC count: 8 (D-5-01..08) |
| FK counts: 45 / 3 estimated | FK counts: 56 / 2 → 56 / 3 verified |
| SOC2 section: absent | SOC2 §CC6.1 / CC7.2 / PI1.1 mapping added |
| Retention clause: absent | Retention clause added (USER-CRITICAL affirmed) |
| PostgREST PII fence: absent | Allowed-columns fence added |
| audit-log anchor: absent | activity_log.user_id → auth.users explicit |
| §11 TECH DEBT: not added | TD-D-078 row added |
| Files modified: 2 | Files modified: 2 (MASTER-PLAN.md + CLAUDE.md) |

### 5.11 New AC additions

- **AC-D5-05** — D-078 entry contains all 4 SOC2 references (CC6.1, CC7.2, PI1.1)
- **AC-D5-06** — D-078 entry contains retention class affirmation (USER-CRITICAL)
- **AC-D5-07** — D-078 entry contains PostgREST embedding allowed-columns fence
- **AC-D5-08** — §11 TECH DEBT REGISTRY contains TD-D-078 row referencing D-078

---

## §6 — Cross-plan additions

### 6.1 CLAUDE.md Domain Rules exception clause (§4.4.4 above)

Single insertion under existing `### Domain rules` subsection. Adds Drummond-vs-synthetic-fixtures exception.

### 6.2 scripts/fixtures/smoke-seed.sql (§4.4.1 above)

New file. ~50-100 LOC SQL skeleton fleshed out at D-4 execute-time. Idempotent (ON CONFLICT DO NOTHING). Non-Drummond UUIDs throughout.

### 6.3 ~~`src/app/api/healthcheck/route.ts`~~ — REVERTED per nwrp124 step 5

Originally introduced as a cold-lambda warmup target per H-D4-17. Reverted
to /login warmup per nwrp124 step 5: conservative path — no new permanent
production route introduced for verification harness scope. See §4.14 for
the /login warmup logic. **No new file created.**

### 6.4 `data-slot="org-logo"` + `data-pattern-slot="..."` attributes (§4.6 + §4.9 above)

Small JSX patches across `src/components/branding/Wordmark.tsx`, `src/components/branding/Icon.tsx`, `src/components/invoice-review/*` (Document Review pattern surface). Adds data attributes only — no visual / behavior change.

### 6.5 `.gitignore` entry (§4.11 above)

Single-line addition to existing .gitignore for `.planning/verification/auth/`.

---

## §7 — Iter-2 verification

After applying all iter-2 patches, executor verifies via:

```bash
# §0 pre-flight evidence preserved
grep -c "56 user-identity FKs" .planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-5-d078-decision-entry-PLAN.md
# Expected: ≥1

# §1.1 NOTIFY pgrst landed in migration
grep -c "NOTIFY pgrst" supabase/migrations/00098_add_org_members_profiles_fk.sql
# Expected: 1

# §2.1 D-2 scope expanded to 8 files
grep -c "aging/page.tsx\|aging-report/page.tsx" .planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-2-remove-double-appshell-PLAN.md
# Expected: ≥2

# §2.2 TD entry created
test -f .planning/tech-debt/TD-WD-01-invoices-id-page-dead-code.md && echo "TD-WD-01 exists"

# §4.4.1 smoke seed file created (at D-4 execute, not iter-2 doc — but tracked here)
test -f scripts/fixtures/smoke-seed.sql && echo "smoke-seed.sql exists"

# §4.5 Rules placement landed in Workflow posture
grep -A 1 "### Workflow posture" CLAUDE.md | head -100 | grep -c "Rule 1 — Schema verification"
# Expected: 1

# §5.8 §11 TECH DEBT REGISTRY entry
grep -c "TD-D-078" .planning/MASTER-PLAN.md
# Expected: ≥1

# §6.1 CLAUDE.md Domain Rules exception
grep -c "smoke scripts + verification harness fixtures use synthetic" CLAUDE.md
# Expected: 1

# §6.5 .gitignore entry
grep -c ".planning/verification/auth/" .gitignore
# Expected: 1
```

All checks pass → iter-2 patches applied successfully → ready for execute.

**No reviewer re-dispatch per nwrp122 step 1.** Doc-level + small SQL/code adjustments; iter-1 review's PASS verdicts on D-1 + D-2 stand; D-3, D-4, D-5 patches address all WARN/BLOCK findings.

---

## §8 — Execution order (post-iter-2 approval)

Per nwrp121 step 4 + nwrp122 step 7 (unchanged):

1. **D-5 first** — D-078 decision exists in MASTER-PLAN.md before code references it
2. **D-1 + D-2 parallel** — independent code/migration paths (no shared file overlap; D-1 hits PostgREST embed sites + migration; D-2 hits AppShell JSX in different line ranges of the same 6 → 8 files; line-range parallel-safe per D-2 iter-1 architect review)
3. **D-4** — Rules + Playwright script + synthetic seed + CLAUDE.md insertions
4. **D-3** — test packet (doc-only; runs last because it documents the smoke practice that D-4 instantiates)
5. **Apply migration 00098** via Supabase MCP (post-D-1 commit)
6. **Apply synthetic seed** via Supabase MCP (post-D-4 commit, against fixture-harness-org on preview)
7. **Run wave-d-smoke.ts** against Vercel preview URL
8. **/nightwork-qa post-execute** — reads `requires_smoke: true` on D-1/D-2/D-4 plans, finds smoke-results.json, verifies PASS
9. **GATE-D HALT** for Jake review before /gsd-ship
10. **Calibration-log entry append** to Wave-C entry (Wave-D = the corrective wave referenced)

**Wave-B remains REVOKED** per nwrp121 until Wave-D ships clean.

---

## §9 — HALT — Jake review

ITER-2-PATCHES.md drafted. Awaiting Jake authorization before execute.

**Summary of what changes from iter-1 → iter-2:**
- 9 decisions addressed verbatim (1: D-2 scope to 8; 2: TD entry only; 3: lifecycle between executor + QA; 4: /nightwork-qa enforces via requires_smoke flag; 5: diagnostic-only screenshots; 6: synthetic fixtures + CLAUDE.md exception; 7: Workflow posture placement; 8: NOTIFY pgrst added; 9: 56/2 → 56/3 verified)
- 3 clarifications resolved (A: math evidence chain + caveats surfaced; B: /invoices/[id] confirmed unreachable; C: D-5 SOC2 + retention added)
- 4 plans patched with iter-1 HIGH findings (D-1: 7 patches; D-2: 6 patches + 1 TD; D-3: 7 patches; D-4: 19 patches; D-5: 9 patches)
- 3 new files: TD-WD-01, smoke-seed.sql skeleton, .gitignore line (healthcheck route REVERTED per nwrp124 step 5)
- AC counts: D-1 7→8; D-2 unchanged; D-3 unchanged; D-4 9→13; D-5 4→8

**Pending Jake response:** approve as-is, request amendments, or kick back specific patches for further work.
