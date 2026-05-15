---
phase: stage-f1-knowledge-graph-auth-wave-b
plan: B-1a-bis
plan-name: clients-consumer-refactor
type: execute
wave: B-Slice-1
depends_on: [B-1a]
autonomous: true
halt_after: false
requires_smoke: true
threat_model_severity: medium
status: AUTHORED
authored: 2026-05-15
authored_by: gsd-planner subagent (claude-opus-4-7[1m])
authorization: "nwrp152 dispatch + nwrp153 EXPANDED-SCOPE approval + nwrp154 Path A adjudication (slice grows 3 -> 4 plans; B-1a-bis carries consumer refactor + DROP COLUMN)"
source_decisions:
  - "nwrp154 Path A adjudication (slice grows 3 -> 4 plans; B-1a-bis owns consumer refactor + DROP)"
  - "Q1 nwrp153 (PII fence on clients.email + phone; embed narrowing enforced)"
  - "Q2 nwrp153 dual-probe amendment (forward grep + reverse DB probe before DROP)"
  - "Q6 nwrp153 (jobs.pm_id consumer refactor DEFERRED to Wave 1.1-Lite; B-1a-bis does NOT touch jobs.pm_id consumers)"
  - "Q7 nwrp153 (obviously-synthetic fixture naming; harness-client-alpha pattern carries through)"
  - "Q9 D (umbrella; >=1 fixture client row in fixture-harness-org; preserved across refactor)"
  - "Q10b (umbrella; ORG-scoped direct-filter RLS; PostgREST embed crosses join via jobs.client_id FK)"
  - "D-078 + D-079 (PII fence convention; clients.email/phone never embedded)"
  - "D-080 (parent FK convention; clients table created with auth.users FK in B-1a)"
  - ".planning/lessons.md 2026-05-15 entry (downstream-consumer-sweep discipline; PRIMARY discipline for this plan)"
requirements: []
files_modified:
  # Migration files (DROP COLUMN at end of plan)
  - supabase/migrations/00101_drop_jobs_client_columns.sql
  - supabase/migrations/00101_drop_jobs_client_columns.down.sql
  # Load-bearing UI (6 files)
  - src/components/job-sidebar.tsx
  - src/app/jobs/[id]/page.tsx
  - src/app/jobs/page.tsx
  - src/app/jobs/new/page.tsx
  - src/app/draws/[id]/page.tsx
  - src/app/onboard/OnboardWizard.tsx
  # Load-bearing API (6 files)
  - src/app/api/jobs/route.ts
  - src/app/api/jobs/health/route.ts
  - src/app/api/invoices/[id]/route.ts
  - src/app/api/draws/[id]/route.ts
  - src/app/api/draws/[id]/export/route.ts
  - src/app/api/draws/[id]/cover-letter/route.ts
  # AI logic (1 file)
  - src/lib/invoices/job-matcher.ts
  # Proposal flow (2 files)
  - src/app/proposals/review/[extraction_id]/page.tsx
  - src/components/proposals/ProposalDetailsPanel.tsx
  # Sample-data API + scripts (3 files)
  - src/app/api/sample-data/route.ts
  - scripts/fixtures/smoke-seed.sql
  - scripts/rematch-jobs.ts
files_referenced:
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-b/B-1a-clients-schema-foundation-PLAN.md
  - .planning/expansions/stage-f1-knowledge-graph-auth-wave-b-EXPANDED-SCOPE.md
  - .planning/MASTER-PLAN.md
  - .planning/lessons.md
sequence:
  before: "B-1b (types pipeline regenerates database.types.ts post-DROP COLUMN reflecting clean schema)"
  after: "B-1a (clients table + jobs.client_id FK + backfill in place; consumers can read from clients table)"
  parallel_authoring_ok: "true (with B-1a re-author sibling agent; no file collision since B-1a only touches schema + 00100 migration files)"
  parallel_execute_ok: "false (strict sequence; B-1a-bis cannot execute until B-1a migration 00100 applies)"
acceptance-criteria-target: "14 falsifiable items (AC-B1a-bis-01..AC-B1a-bis-14)"
threat_model:
  trust_boundaries:
    - "client (browser) -> Next.js API routes -> PostgREST -> Postgres (RLS-fenced)"
    - "Claude Vision parser -> job-matcher.ts (text matching on client.name via FK join)"
    - "G702/G703 Excel export -> AIA legal document render (owner_name from clients.full_name)"
  threats:
    - id: "T-B1a-bis-01"
      category: "Information disclosure (STRIDE-I)"
      component: "PostgREST embed narrowing on 6 API routes (/api/draws/*, /api/invoices/[id], /api/jobs/*)"
      disposition: "mitigate"
      mitigation: "Embed string narrowed to client:clients(id, name) per D-078 + D-079 PII fence. Plan-review iter-1 grep gate (per Plan D-4 Rule 2) BLOCKS client:clients(*) and any embed referencing email/phone. AC-B1a-bis-14 enforces."
    - id: "T-B1a-bis-02"
      category: "Tampering (STRIDE-T) + Information disclosure"
      component: "POST/PATCH /api/jobs route accepts client_name/email/phone in body"
      disposition: "mitigate"
      mitigation: "Refactor: /api/jobs no longer accepts client_* in request body. Instead, body accepts client_id (must reference existing clients row in same org). Owner-identity CRUD moves to new pattern (in-place find-or-create within /api/jobs OR explicit /api/clients endpoint per executor choice; spec recommends find-or-create in /api/jobs to preserve single-form-submit UX). RLS on clients table prevents cross-org writes by construction (Q10b direct-filter)."
    - id: "T-B1a-bis-03"
      category: "Denial of service (STRIDE-D) on G702/G703 cover-letter render"
      component: "src/app/api/draws/[id]/export/route.ts AIA owner_name renders from joined client row"
      disposition: "mitigate"
      mitigation: "Embed narrowed to client:clients(id, name); render reads draw.jobs.client?.name with ?? '' fallback to match pre-refactor empty-string posture (line 211 current behavior). Smoke gate verifies cover-letter render does not blank out on Drummond fixture."
    - id: "T-B1a-bis-04"
      category: "Information disclosure (STRIDE-I)"
      component: "job-sidebar.tsx mailto: link to client.email"
      disposition: "transfer-to-F3"
      rationale: "Per nwrp154: any consumer that NEEDS client_email/phone (e.g., mailto link on sidebar) is OUT of slice. Refactor removes the mailto link in B-1a-bis; restoration deferred to F3 magic-link work alongside Owner Portal automated client email. TD-B1abis-01 entry created in §13 of this plan."
    - id: "T-B1a-bis-05"
      category: "Repudiation (STRIDE-R) on DROP COLUMN destructive migration"
      component: "supabase/migrations/00101_drop_jobs_client_columns.sql"
      disposition: "mitigate"
      mitigation: "Dual-probe inside atomic transaction: (1) code-level grep verification documented in migration comment + plan §10 verification commands (executor runs BEFORE applying 00101 migration); (2) DB-level reverse probe SELECT COUNT(*) FROM jobs WHERE client_id IS NULL AND (client_name IS NOT NULL OR client_email IS NOT NULL OR client_phone IS NOT NULL) MUST return 0 inside the transaction (Q2 nwrp153 amendment). ROLLBACK + HALT on any probe failure. Down migration re-adds the 3 columns as nullable TEXT (data NOT restored — explicit rollback contract; documented in §11)."
must_haves:
  truths:
    - "All 16 load-bearing src consumers read client identity via the clients table (not via direct jobs.client_* columns)"
    - "PostgREST embed strings narrow client to (id, name) — never include email or phone"
    - "jobs.client_name, jobs.client_email, jobs.client_phone columns absent from public.jobs post-DROP migration"
    - "Wave-B prereq #12 smoke gate holds: 11/13 PASS post-refactor (TD-WE-03 baseline maintained; no NEW failure modes)"
    - "Drummond E2E reference flow (job-sidebar render + invoice review + G702/G703 export) renders client name correctly post-refactor"
    - "/api/jobs POST + PATCH no longer accept client_name/email/phone in body; clients are referenced by client_id"
    - "Job-matcher AI logic preserves surname-matching signal via clients.full_name join"
  artifacts:
    - path: "supabase/migrations/00101_drop_jobs_client_columns.sql"
      provides: "Atomic transaction dropping jobs.client_name/email/phone after forward grep + reverse DB probe verification"
      contains: "BEGIN; ... DO $$ ... reverse-probe ... ALTER TABLE public.jobs DROP COLUMN client_name; ... COMMIT;"
    - path: "supabase/migrations/00101_drop_jobs_client_columns.down.sql"
      provides: "Best-effort emergency rollback re-adding 3 columns as nullable TEXT (data NOT restored)"
      contains: "ALTER TABLE public.jobs ADD COLUMN client_name TEXT;"
    - path: "src/components/job-sidebar.tsx"
      provides: "Right-rail job sidebar with client name display (mailto removed; deferred to F3 per TD-B1abis-01)"
      contains: "client:clients(id, name)"
    - path: "src/app/api/draws/[id]/export/route.ts"
      provides: "G702/G703 Excel cover-letter render preserving owner_name from clients.full_name"
      contains: "client:clients(id, name)"
    - path: "src/lib/invoices/job-matcher.ts"
      provides: "AI job-matcher preserving surname signal via joined client.full_name"
      contains: "client:clients"
  key_links:
    - from: "src/app/api/draws/[id]/export/route.ts"
      to: "public.clients via jobs.client_id FK"
      via: "PostgREST embed client:clients(id, name)"
      pattern: "client:clients\\(id, name\\)"
    - from: "src/lib/invoices/job-matcher.ts"
      to: "public.clients via jobs.client_id FK"
      via: "PostgREST embed client:clients(id, full_name) at jobs select"
      pattern: "client:clients"
    - from: "src/components/job-sidebar.tsx"
      to: "public.clients"
      via: "select with client:clients(id, name) embed"
      pattern: "select.*client:clients"
    - from: "supabase/migrations/00101_drop_jobs_client_columns.sql"
      to: "public.jobs (3 columns dropped post-probe)"
      via: "atomic transaction with reverse DB probe + forward code-level grep documented in migration comment"
      pattern: "DROP COLUMN client_name"
---

<criteria>
mechanical:
  - "Migration 00101_drop_jobs_client_columns.sql exists in supabase/migrations/"
  - "Migration 00101_drop_jobs_client_columns.down.sql exists in supabase/migrations/"
  - "Migration body wraps the 3 DROP COLUMN statements in a single BEGIN..COMMIT atomic transaction"
  - "Migration body contains reverse-probe DO block per Q2 nwrp153 amendment"
  - "Migration header cites D-078 + D-079 + Q1 + Q2 + nwrp154 source decisions"
  - "Migration header documents the forward grep verification command verbatim"
  - "Grep `grep -rE \"client:clients\\([^)]*(\\bemail\\b|\\bphone\\b)|clients\\(.*\\*.*\\)\" src/ scripts/` returns 0 matches post-refactor"
  - "Grep `grep -rn 'jobs\\.client_name\\|jobs\\.client_email\\|jobs\\.client_phone' src/ scripts/` returns 0 hits (active code paths) — fixture _fixtures/*.ts files excluded"
  - "Hook `.githooks/pre-commit` PASSES (Drummond grep gate) on the refactor commit"
dom: []
visual: []
behavioral:
  - "Post-refactor: smoke harness runs `npm run smoke` and reports 11/13 PASS minimum (TD-WE-03 baseline maintained; no NEW failure modes from refactor per Wave-B prereq #12)"
  - "Post-refactor: /jobs/[fixture-job-id] page renders 'Harness Fixture Client Alpha' in the Client Name detail field (read via embed)"
  - "Post-refactor: GET /api/draws/[fixture-draw-id]/cover-letter returns owner_name=clients.full_name (preserves AIA legal document fidelity)"
  - "Post-DROP migration: SELECT column_name FROM information_schema.columns WHERE table_name='jobs' AND column_name IN ('client_name','client_email','client_phone') returns 0 rows"
  - "Post-DROP migration: SELECT 1 FROM jobs LIMIT 1 succeeds (table integrity preserved; FK + indexes intact)"
semantic:
  - "PostgREST embed strings audit clean: every 'jobs:job_id' embed and every 'clients' embed cited in plan §4 table narrows to (id, name) or (id, full_name); zero embeds reference email/phone"
  - "Down migration documents data-loss-on-rollback contract explicitly in header comment"
  - "Edge-case dispositions (mailto link removal from job-sidebar.tsx) documented as TD-B1abis-01 with restoration plan referencing F3 magic-link work"
</criteria>

# Plan B-1a-bis — Clients consumer refactor + DROP COLUMN

## 1. Goal

Refactor the 16 load-bearing src consumers (`+` 3 sample-data/script consumers; 7 design-system fixture files are intentionally LEFT ALONE per §3.2) that currently read or write `jobs.client_name` / `client_email` / `client_phone` to instead read client identity through `jobs.client_id` -> `clients` join (via PostgREST embed `client:clients(id, name)` for read paths, and via a refactored `/api/jobs` write contract that accepts `client_id` for write paths). Once the refactor lands and smoke holds at 11/13 PASS minimum (Wave-B prereq #12), the plan ships an atomic DROP COLUMN migration (`00101_drop_jobs_client_columns.sql`) that removes the 3 embedded columns from `public.jobs`, with dual-probe verification (forward code-level grep + reverse DB probe) inside the transaction.

The plan's PRIMARY DISCIPLINE is the downstream-consumer-sweep contract from `.planning/lessons.md` 2026-05-15. The B-1a parent plan codified the sweep at plan-author time and HALT'd execute; B-1a-bis executes the refactor work that closes the loop.

## 2. Why now / dependencies + Path A origin

### Path A origin (nwrp154)

Per nwrp154 (Jake adjudication post-B-1a planner HALT), the slice grows from 3 plans to 4. The slice execute sequence is now:

```
B-D080 (migration 00099)
  -> B-1a (clients schema + jobs.client_id FK + backfill — NO DROP)
    -> B-1a-bis (consumer refactor + DROP COLUMN — THIS PLAN)
      -> B-1b (types pipeline + KG scaffold)
```

The original B-1a plan combined schema creation + backfill + DROP COLUMN in a single migration (00100). The HALT condition surfaced at plan-author time because the DROP COLUMN was unsafe-by-construction without a precursor consumer refactor: 16 load-bearing src consumers read `jobs.client_name` directly. nwrp154 selected Path A (split into B-1a + B-1a-bis) over Path B (defer DROP to Slice-2; Q2 nwrp153 disposition violated) and Path C (refactor inside B-1a; single plan exceeds context budget).

### Dependency chain

- **B-1a executes BEFORE B-1a-bis.** After B-1a applies migration 00100, `clients` table exists, `jobs.client_id` FK exists, backfill has populated `jobs.client_id` for all jobs with prior `client_name` data, and the 3 embedded columns REMAIN populated. The state is "dual-source" — both `jobs.client_name` (old) and `jobs.client_id -> clients.full_name` (new) return the same data. This dual-source state is THE WINDOW in which B-1a-bis ships the consumer refactor safely.
- **B-1a-bis executes BETWEEN B-1a and B-1b.** B-1a-bis refactors consumers to the new shape, smoke-verifies, then DROPs the embedded columns.
- **B-1b executes AFTER B-1a-bis.** The types pipeline regenerates `database.types.ts` reflecting the clean post-DROP schema (no `client_name`/`email`/`phone` on `jobs`; new `clients` table types).

### Why now (not deferred)

- Per nwrp154 Path A: the dual-source state is a maintenance burden if held >1 phase. Holding for Wave 1.1-Lite means Slice-2 ships Owner Portal (Path A) against still-denormalized data — every write path must update BOTH old + new columns until DROP. Drift risk compounds.
- Per Q2 nwrp153 APPROVED: "DROP NOW with safety addition." Path A's split-into-B-1a-bis is the safety addition; deferring DROP reopens Q2.

## 3. Pre-flight downstream-consumer-sweep (executed at plan-author time)

### Sweep mechanics

Per `.planning/lessons.md` 2026-05-15 entry: this plan's PRIMARY DISCIPLINE. Plan-author ran the grep at plan-authoring time (2026-05-15):

```bash
# Forward probe (active code reads + writes)
grep -rn 'client_name\|client_email\|client_phone' src/ scripts/ --include='*.ts' --include='*.tsx' --include='*.sql'
```

### 3.1 Live sweep results (22 src + 4 scripts + 1 .planning = 27 total hits across 26 files)

The sweep is **identical to B-1a's documented sweep** — no consumers have appeared or disappeared since B-1a was authored 2026-05-15 morning. Count matches exactly.

**Per-file disposition table:**

| # | File | Category | Refactor / Defer / No-change | Embed needed | Notes |
|---|---|---|---|---|---|
| 1 | `src/components/job-sidebar.tsx` | Load-bearing UI | **Refactor + edge case** | `client:clients(id, name)` | Remove mailto link (line 366) — defer to F3 per nwrp154. TD-B1abis-01 entry. |
| 2 | `src/app/jobs/[id]/page.tsx` | Load-bearing UI | **Refactor (read + write)** | `client:clients(id, name)` for read; `/api/jobs` PATCH accepts client_id for write | Job-detail page has READ (line 334-336) + WRITE form (line 371-377). PII fields disappear from edit form; new "Client" combobox sources from `/api/clients` (lookup or find-or-create). |
| 3 | `src/app/jobs/page.tsx` | Load-bearing UI | **Refactor (read)** | `client:clients(id, name)` | Jobs index renders `client_name` in cards (line 323, 389) + search filter (line 138). Switch to `j.client?.name`. |
| 4 | `src/app/jobs/new/page.tsx` | Load-bearing UI | **Refactor (write)** | N/A — POST body change | New-job form posts client_name/email/phone (line 138-140). Refactor to: form collects client name -> POST to /api/jobs with `client_name_for_create` field (server-side find-or-create in same org); email/phone DROPPED from form per TD-B1abis-01. |
| 5 | `src/app/draws/[id]/page.tsx` | Load-bearing UI | **Refactor (read)** | embed via draws.jobs.client | Draw detail page shows `{draw.jobs?.client_name ?? "—"}` (line 525). Switch to `draw.jobs?.client?.name`. |
| 6 | `src/app/onboard/OnboardWizard.tsx` | Load-bearing UI | **Refactor (write)** | N/A — POST body change | Wizard creates first job with `client_name` (line 84, 202, 438). Refactor: wizard collects client name -> includes in POST body as `client_name_for_create`; server-side find-or-create. email/phone NOT in wizard already — clean. |
| 7 | `src/app/api/jobs/route.ts` | Load-bearing API | **Refactor (POST + PATCH)** | N/A — accept client_id in body, OR client_name_for_create as find-or-create shortcut | POST + PATCH currently accept client_* in body (line 42-44, 126-128, 185-187). Refactor: accept `client_id` (must reference existing clients row in same org; RLS blocks cross-org) OR accept `client_name_for_create` (server-side find-or-create within `getCurrentMembership().org_id`). Removes email/phone acceptance per TD-B1abis-01. |
| 8 | `src/app/api/jobs/health/route.ts` | Load-bearing API | **Refactor (read)** | `client:clients(id, name)` | Job-health endpoint selects client_name (line 32, 87). Switch to embed. |
| 9 | `src/app/api/invoices/[id]/route.ts` | Load-bearing API (PostgREST embed) | **Refactor (read)** | nested `jobs:job_id (..., client:clients(id, name))` | Invoice detail embeds `jobs:job_id (..., client_name, ...)` (line 75). Switch to nested embed. |
| 10 | `src/app/api/draws/[id]/route.ts` | Load-bearing API (PostgREST embed) | **Refactor (read)** | nested `jobs:job_id (..., client:clients(id, name))` | Draw detail embed (line 41). Same shape as #9. |
| 11 | `src/app/api/draws/[id]/export/route.ts` | Load-bearing API (AIA legal doc) | **Refactor (read)** — highest risk | nested `jobs:job_id (..., client:clients(id, name))` | G702/G703 cover letter renders owner_name from `coverDraw.jobs?.client_name` (line 211) + Excel C{r} cell (line 311). Switch to `coverDraw.jobs?.client?.name`. Type at line 206 updates. Embed line 108 narrows — REMOVES `client_email` from embed (was unused in render anyway). |
| 12 | `src/app/api/draws/[id]/cover-letter/route.ts` | Load-bearing API | **Refactor (read)** | nested embed | Cover-letter route line 39 embed; line 73 render. Same as #11. |
| 13 | `src/lib/invoices/job-matcher.ts` | AI logic | **Refactor (read)** — preserves matching signal | `client:clients(id, full_name)` | AI matcher uses `client_name` for surname signal (line 7, 36, 94). Switch select to `id, name, address, client:clients(id, full_name), pm_id`; switch `job.client_name` to `job.client?.full_name`. Surname extraction logic unchanged. JobCandidate type updates. |
| 14 | `src/app/proposals/review/[extraction_id]/page.tsx` | Proposal review | **Refactor (read)** | `client:clients(id, name)` | Reads `client_name` (line 51, 121). Switch embed. |
| 15 | `src/components/proposals/ProposalDetailsPanel.tsx` | Proposal panel | **Refactor (read)** | inherits from #14 | Renders `{j.client_name ? ...}` (line 153). Switch to `{j.client?.name ? ...}`. |
| 16 | `src/app/api/sample-data/route.ts` | Sample-data seed API | **Refactor (write)** | N/A — find-or-create | API seeds a sample job with `client_name + client_email` (line 67-68). Refactor: server-side find-or-create on `clients` table, write `client_id` on the job; email DROPPED (per TD-B1abis-01). |

**Design-system fixture files (7 files; NO REFACTOR — sample data, not DB-bound):**

| # | File | Category | Disposition |
|---|---|---|---|
| 17 | `src/app/design-system/_fixtures/jobs.ts` | Design-system fixture (sample data) | **NO-CHANGE in B-1a-bis.** Type literal contains `client_name/email/phone` as a frozen sample data shape; the sample is intentionally pre-refactor to preserve playground render stability. Cosmetic refresh to new `client?: {id, name}` shape deferred to a separate design-system maintenance plan post-B-1b (when generated types land). The fixture is OBVIOUSLY decoupled from the DB — no PostgREST queries fire from `_fixtures/`. |
| 18 | `src/app/design-system/_fixtures/drummond/types.ts` | Design-system fixture types | NO-CHANGE (same rationale) |
| 19 | `src/app/design-system/_fixtures/drummond/jobs.ts` | Design-system fixture (Drummond) | NO-CHANGE (same rationale) |
| 20 | `src/components/prototypes/OwnerDashboardView.tsx` | Prototype renderer | NO-CHANGE — reads from fixture, not DB |
| 21 | `src/components/prototypes/DrawPrintView.tsx` | Prototype renderer | NO-CHANGE — reads from fixture, not DB |
| 22 | `src/components/prototypes/DocumentReviewView.tsx` | Prototype renderer | NO-CHANGE — reads from fixture, not DB |

**`scripts/` consumers (4 files):**

| # | File | Disposition |
|---|---|---|
| 23 | `scripts/fixtures/smoke-seed.sql` | **Refactor (write).** Seed currently writes `client_name` on 10 fixture jobs (line 224-239). After refactor: seed inserts 10 `clients` rows first (mirroring the 10 fixture jobs), then INSERTs jobs with `client_id` pointing to the corresponding clients row. Email/phone NOT in current seed — clean. |
| 24 | `scripts/rematch-jobs.ts` | **Refactor (read).** Line 199 renders `${j.client_name ?? "(no client)"}` in PM output. Update select to embed `client:clients(id, name)`; switch to `j.client?.name`. |
| 25 | `scripts/sanitize-drummond.ts` | NO-CHANGE — one-off ETL script reads from P-drive Drummond raw data, writes pre-refactor shape into a stage file consumed by separate seeding. The OUTPUT of sanitize-drummond.ts is consumed only by `e2e-dewberry-setup.mjs` (next entry), which itself does the find-or-create refactor. |
| 26 | `scripts/e2e-dewberry-setup.mjs` | **Refactor (write).** E2E test setup writes client_* on job INSERT. Refactor: insert clients row first, then job with client_id. Email/phone retained in clients table row (passes through clients RLS; not in any embed). |

**`.planning/` consumers (1 file):**

| # | File | Disposition |
|---|---|---|
| 27 | `.planning/architecture/CURRENT-STATE.md` | NO-CHANGE — documentation-only reference describing the PRE-Wave-B-Slice-1 state. Post-B-1b execute, a separate doc-sync task updates CURRENT-STATE.md (out of scope for B-1a-bis). |

### 3.2 Severity summary

- **16 src files refactored** (active code paths)
- **3 sample-data/script files refactored** (smoke-seed.sql + rematch-jobs.ts + e2e-dewberry-setup.mjs)
- **7 design-system fixture files NO-CHANGE** (sample data, not DB-bound; cosmetic refresh deferred)
- **1 documentation file NO-CHANGE** (CURRENT-STATE.md updates in a separate doc-sync task)
- **0 unrefactored DB-bound consumers remain** — verified by re-grep at refactor-complete checkpoint

### 3.3 Sweep count delta vs B-1a's authored sweep

Same count, same files. No new consumers landed between 2026-05-15 morning (B-1a authoring) and 2026-05-15 afternoon (B-1a-bis authoring). Reverse: no consumers were independently refactored in the interim (e.g., by a sibling Wave-D or Wave-E plan).

## 4. Per-consumer refactor map

| Consumer | Current shape | New shape | Embed string | PII fence verdict |
|---|---|---|---|---|
| `job-sidebar.tsx` line 107 | `select("id, name, address, status, client_name, client_email, pm_id, updated_at")` | `select("id, name, address, status, client:clients(id, name), pm_id, updated_at")` | `client:clients(id, name)` | **PASS** — name only |
| `job-sidebar.tsx` line 357-366 | Render `selectedJob.client_name` + mailto `selectedJob.client_email` | Render `selectedJob.client?.name`; **mailto link REMOVED per TD-B1abis-01** | — | **PASS** — email no longer surfaced |
| `jobs/[id]/page.tsx` line 56-58 | Type: `client_name/email/phone: string \| null` | Type: `client?: { id: string; name: string } \| null` + `client_id: string \| null` | inherited from query | **PASS** |
| `jobs/[id]/page.tsx` line 334-336 | Detail render of `job.client_name/email/phone` | Detail render of `job.client?.name`; email/phone fields removed from display (TD-B1abis-01) | — | **PASS** |
| `jobs/[id]/page.tsx` line 371-377 | Edit-form inputs for client_name/email/phone | Replace 3 inputs with single "Client" combobox (autocomplete on `/api/clients?search=` OR plain text input with find-or-create on save) | — | **PASS** |
| `jobs/page.tsx` line 22 | `client_name: string \| null` on type | `client?: { id: string; name: string } \| null` | — | **PASS** |
| `jobs/page.tsx` line 138, 323, 389 | `j.client_name` (search filter + card render) | `j.client?.name` | inherited from query | **PASS** |
| `jobs/new/page.tsx` line 138-140 | POST body `{ client_name, client_email, client_phone }` | POST body `{ client_name_for_create }` (no email/phone) | — | **PASS** — email/phone removed |
| `draws/[id]/page.tsx` line 60, 525 | `draw.jobs?.client_name` | `draw.jobs?.client?.name` | nested embed in `jobs:job_id` | **PASS** |
| `OnboardWizard.tsx` line 84, 202, 438 | useState `client_name: ""` + POST body | useState `client_name_for_create: ""` + POST body field; field label unchanged | — | **PASS** — never had email/phone |
| `api/jobs/route.ts` line 42-44, 126-128, 185-187 | Accept `client_name/email/phone` in body | Accept `client_id` (existing clients row in same org) OR `client_name_for_create` (server find-or-create within membership.org_id); reject email/phone in body | — | **PASS** — server-side fence on body shape |
| `api/jobs/health/route.ts` line 32, 87 | `select("..., client_name, ...")` | `select("..., client:clients(id, name), ...")` | `client:clients(id, name)` | **PASS** |
| `api/invoices/[id]/route.ts` line 75 | `jobs:job_id (id, name, address, client_name, original_contract_amount, current_contract_amount)` | `jobs:job_id (id, name, address, client:clients(id, name), original_contract_amount, current_contract_amount)` | nested narrowed | **PASS** |
| `api/draws/[id]/route.ts` line 41 | `jobs:job_id (id, name, address, client_name, deposit_percentage, gc_fee_percentage, retainage_percent, original_contract_amount, current_contract_amount, starting_application_number, previous_co_completed_amount)` | Same select but `client:clients(id, name)` replaces `client_name` | nested narrowed | **PASS** |
| `api/draws/[id]/export/route.ts` line 108 | `jobs:job_id (id, name, address, client_name, client_email, deposit_percentage, gc_fee_percentage, original_contract_amount)` | `jobs:job_id (id, name, address, client:clients(id, name), deposit_percentage, gc_fee_percentage, original_contract_amount)` | nested narrowed; **client_email REMOVED from embed (was dead code in render)** | **PASS** |
| `api/draws/[id]/export/route.ts` line 206, 211, 311 | Type `client_name?: string` + render `coverDraw.jobs?.client_name` + Excel C{r} | Type `client?: { id: string; name: string }` + render `coverDraw.jobs?.client?.name` + Excel `job?.client?.name` | — | **PASS** |
| `api/draws/[id]/cover-letter/route.ts` line 39, 62, 73 | Embed + type + `draw?.jobs?.client_name` | Embed `client:clients(id, name)` + type `client?: {id, name}` + `draw?.jobs?.client?.name` | nested narrowed | **PASS** |
| `lib/invoices/job-matcher.ts` line 7, 36, 94 | JobCandidate type `client_name`; select `client_name`; `lastWord(job.client_name)` | JobCandidate `client?: { id: string; full_name: string }`; select `client:clients(id, full_name)`; `lastWord(job.client?.full_name ?? "")` | `client:clients(id, full_name)` | **PASS** — full_name only |
| `proposals/review/[extraction_id]/page.tsx` line 51, 121 | type `client_name`; select `client_name` | type `client?: {id, name}`; select `client:clients(id, name)` | `client:clients(id, name)` | **PASS** |
| `proposals/ProposalDetailsPanel.tsx` line 153 | `{j.client_name ? ` (${j.client_name})` : ""}` | `{j.client?.name ? ` (${j.client.name})` : ""}` | inherits | **PASS** |
| `api/sample-data/route.ts` line 67-68 | INSERT job with `client_name + client_email` | Server find-or-create clients row; INSERT job with `client_id`; email DROPPED | — | **PASS** — email removed |
| `scripts/fixtures/smoke-seed.sql` line 224-239 | INSERT jobs with `client_name` column populated | Step 4.5 (new): INSERT 10 clients rows; Step 5: INSERT 10 jobs with `client_id` column populated (no client_name) | — | **PASS** |
| `scripts/rematch-jobs.ts` line 199 | `j.client_name ?? "(no client)"` | `j.client?.name ?? "(no client)"`; update select | `client:clients(id, name)` | **PASS** |
| `scripts/e2e-dewberry-setup.mjs` | client_* fields on INSERT job | client_id on INSERT job; preceded by clients-row INSERT find-or-create | — | **PASS** — email retained in clients table row, never in embed |

## 5. PII fence enforcement (D-078 + D-079 + Q1 nwrp153)

### 5.1 The rule

Per D-078 + D-079 + Q1 nwrp153 APPROVED: `clients.email` + `clients.phone` are customer PII and MUST NEVER appear in a PostgREST embed string. Future legitimate display-of-email use case (e.g., Owner Portal account-recovery, automated G702 client email) routes through an explicit `/api/clients/[id]` GET endpoint with intentional role-gated authorization, NOT an embed.

### 5.2 Mechanical enforcement

Plan-review iter-1 grep gate (per Plan D-4 Rule 2 codification):

```bash
# Pattern A: catches *-globbed embed
grep -rE "client:clients\(.*\*.*\)" src/ scripts/

# Pattern B: catches explicit email or phone in embed
grep -rE "client:clients\([^)]*(\bemail\b|\bphone\b)" src/ scripts/

# Both patterns BLOCK at plan-review iter-1 if matched.
```

### 5.3 Refactor verification

Post-refactor, plan-author runs both patterns from repo root. Both MUST return 0 matches (AC-B1a-bis-09).

Additionally, the refactor REMOVES the existing `client_email` from `src/app/api/draws/[id]/export/route.ts:108` embed — that string predates the PII fence and is dead code in the cover-letter render (line 211 only uses `client_name`; email is never surfaced). This is a net PII fence improvement vs pre-Wave-B state.

## 6. Type contract updates (manual; pre-B-1b)

Manual type updates required pre-B-1b. The generated `database.types.ts` from B-1b will replace these but isn't available yet at B-1a-bis execute time.

### 6.1 Single canonical type addition

```typescript
// Where? Add to a shared types file, or inline per consumer (executor judgment).
// Recommended: extend src/lib/types/invoice.ts (pre-B-1b refactor target anyway)
// OR add to src/lib/types/clients.ts (new file; B-1b will replace with generated types)

export interface ClientEmbed {
  id: string;
  name: string;  // for narrowed embed
  full_name?: string;  // for job-matcher.ts which uses full_name shape
}
```

### 6.2 Per-consumer type updates

Documented inline in the §4 refactor map. Pattern:
- `client_name: string | null` -> `client?: { id: string; name: string } | null`
- Always nullable because `jobs.client_id` is nullable (per B-1a's `ON DELETE SET NULL` FK shape).

### 6.3 No generated-types dependency

B-1a-bis intentionally does NOT depend on B-1b's `database.types.ts`. Manual type updates suffice; B-1b regenerates and overwrites, picking up the post-DROP schema.

## 7. Smoke gate maintenance (Wave-B prereq #12)

### 7.1 Baseline

Per `.planning/lessons.md` 2026-05-15 entry, Wave-E calibrated smoke to **11/13 PASS** with TD-WE-03 (2 failures: TD-WE-04 /today + TD-WE-05 /settings/workflow). Wave-B prereq #12 requires this baseline maintained.

### 7.2 B-1a-bis smoke contract

Post-refactor, executor runs `npm run smoke` and verifies:
- 11/13 PASS minimum
- The 2 known failures (/today + /settings/workflow) are the SAME 2 failures (TD-WE-03 baseline)
- NO NEW failure modes introduced by the refactor

### 7.3 Why this matters here

B-1a-bis touches 6 load-bearing UI surfaces (job-sidebar, jobs/[id], jobs/, jobs/new, draws/[id], OnboardWizard) — every one is in the smoke harness's purview. A regression in any one likely shows up as a new smoke failure. Smoke is the canary; AC-B1a-bis-10 enforces.

## 8. DROP COLUMN migration sketch

### 8.1 Migration body (`00101_drop_jobs_client_columns.sql`)

```sql
-- ===========================================================================
-- 00101_drop_jobs_client_columns.sql
-- ===========================================================================
--
-- F1-Wave-B-Slice-1 Plan B-1a-bis: DROP the 3 embedded client identity columns
-- (client_name, client_email, client_phone) from public.jobs after the
-- consumer refactor in B-1a-bis lands and Wave-B prereq #12 smoke gate is
-- maintained at 11/13 PASS minimum.
--
-- Source decisions:
--   nwrp154 Path A adjudication (slice grows 3 -> 4 plans; B-1a-bis carries DROP).
--   D-078 + D-079 (PII fence; embedded columns must not survive beyond
--     consumer refactor; otherwise dual-source dataset perpetuates a
--     leak surface).
--   Q1 nwrp153 (PII fence on clients.email + phone; DROP removes the
--     denormalized cache that bypasses the fence).
--   Q2 nwrp153 dual-probe amendment (forward grep + reverse DB probe
--     before DROP).
--
-- PRE-DROP verification (run by executor before applying THIS migration):
--   Forward code-level grep (run from repo root):
--     grep -rn 'client_name\|client_email\|client_phone' \\
--          src/ scripts/ --include='*.ts' --include='*.tsx' --include='*.sql' \\
--          | grep -v -E '(_fixtures/|design-system/|prototypes/)' \\
--          | grep -v -E '^[^:]+:[0-9]+:\\s*//'
--   Expected: 0 matches in active code paths (fixture + prototype + comment
--   files are intentionally excluded per B-1a-bis §3.2; design-system
--   refresh deferred to post-B-1b doc-sync task).
--   HALT migration apply if non-zero — investigate before retry.
--
-- BEFORE this migration:
--   * public.jobs has columns: ..., client_name TEXT, client_email TEXT,
--     client_phone TEXT, client_id UUID (FK to public.clients) ...
--   * jobs.client_id is populated for every job that had any client identity
--     data (per B-1a backfill); jobs.client_name etc. ALSO still populated
--     (dual-source state).
--
-- AFTER this migration:
--   * public.jobs has client_id UUID (FK to public.clients) only; the 3
--     embedded columns are DROPPED.
--   * Reverse probe inside transaction verifies no asymmetric data (i.e.,
--     no row has client_id IS NULL while ANY of client_name/email/phone
--     is non-NULL) — if such a row exists, the DROP would orphan that
--     identity data; transaction ROLLBACKs and HALTs.
--
-- Reversibility: 00101_drop_jobs_client_columns.down.sql re-adds the 3
-- columns as nullable TEXT (data NOT restored — explicit rollback contract;
-- see §11 of B-1a-bis PLAN.md for the data-loss path).
-- ===========================================================================

BEGIN;

-- ===========================================================================
-- 1. REVERSE PROBE (Q2 nwrp153 amendment).
--    Catches asymmetric data — rows with client_id NULL but any of
--    client_name/email/phone non-NULL. DROP would orphan such identity data.
--    HF-A4-2 fail-loud pattern (mirrors B-1a's §10 reverse probe).
-- ===========================================================================
DO $$
DECLARE v_orphan_risk BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_orphan_risk
    FROM public.jobs
   WHERE client_id IS NULL
     AND (client_name IS NOT NULL
       OR client_email IS NOT NULL
       OR client_phone IS NOT NULL);
  IF v_orphan_risk > 0 THEN
    RAISE EXCEPTION 'Reverse probe FAILED: % jobs have client identity data (client_name/email/phone) but NULL client_id. DROP would orphan this data. Investigate before retry. (Likely cause: a write path missed in B-1a-bis consumer refactor.)', v_orphan_risk;
  END IF;
END $$;

-- ===========================================================================
-- 2. DROP the embedded columns.
-- ===========================================================================
ALTER TABLE public.jobs DROP COLUMN client_name;
ALTER TABLE public.jobs DROP COLUMN client_email;
ALTER TABLE public.jobs DROP COLUMN client_phone;

-- ===========================================================================
-- 3. NOTIFY PostgREST schema cache reload (Wave-D 00098 §1.1 decision 8
--    belt-and-suspenders pattern; Supabase auto-reloads via DDL trigger but
--    Wave-C taught us schema verification != runtime verification).
-- ===========================================================================
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ===========================================================================
-- POST-APPLY VERIFICATION QUERIES (see §10 of B-1a-bis PLAN.md)
-- ===========================================================================
-- 1. SELECT column_name FROM information_schema.columns
--      WHERE table_name='jobs' AND table_schema='public'
--      AND column_name IN ('client_name','client_email','client_phone');
--    expect: 0 rows
-- 2. SELECT COUNT(*) FROM public.jobs WHERE client_id IS NOT NULL;
--    expect: number of jobs with backfilled clients (consistent with B-1a
--            post-apply baseline; not changed by THIS migration)
-- 3. Sample PostgREST embed query via REST API to verify client:clients(id, name)
--    resolves correctly post-DROP (no schema-cache PGRST204 errors).
-- ===========================================================================
```

### 8.2 Down migration (`00101_drop_jobs_client_columns.down.sql`)

```sql
-- ===========================================================================
-- 00101_drop_jobs_client_columns.down.sql
-- ===========================================================================
--
-- ROLLBACK for 00101. Re-adds the 3 columns as nullable TEXT but DOES NOT
-- restore data. The pre-DROP data lives only in the `clients` table now (via
-- jobs.client_id FK). Restoration of jobs.client_name/email/phone values
-- would require:
--   1. Reverse-derive jobs.client_name from JOIN of jobs.client_id ->
--      clients.full_name (lossy: email + phone unrecoverable from clients
--      because B-1a-bis refactor of /api/jobs DROPPED email/phone from
--      write paths — only clients.email/phone retain data, and only if
--      the find-or-create path wrote them).
--   2. SQL: UPDATE jobs j SET client_name=c.full_name FROM clients c
--           WHERE c.id = j.client_id;
--      But emails + phones in jobs.client_* would remain NULL after
--      restoration unless an additional reverse-backfill writes from
--      clients.email/phone (only meaningful for jobs created BEFORE
--      B-1a-bis refactor; later jobs likely never persisted email/phone).
--
-- WARNING: This is an EMERGENCY ROLLBACK ONLY. Re-add of columns without
-- data restoration leaves runtime in a broken state IF the consumer
-- refactor is also rolled back in lockstep — the post-refactor consumers
-- read `j.client?.name` (which works regardless of jobs.client_*), so
-- pure DDL rollback without code rollback is harmless on display surfaces.
-- However, /api/jobs POST + PATCH no longer accept client_* in body
-- post-refactor; rolling back the migration alone does not restore those
-- code paths. Plan a coordinated code-rollback in lockstep with this
-- down migration if needed.
--
-- Step order:
--   1. ALTER TABLE jobs ADD COLUMN client_name/email/phone TEXT.
--   2. (Optional) reverse-backfill client_name from clients.full_name via
--      JOIN. Skipped here — left as an operator decision. If executed,
--      add explicit UPDATE inside transaction with status_history audit row.
--   3. NOTIFY pgrst.
-- ===========================================================================

BEGIN;

ALTER TABLE public.jobs ADD COLUMN client_name TEXT;
ALTER TABLE public.jobs ADD COLUMN client_email TEXT;
ALTER TABLE public.jobs ADD COLUMN client_phone TEXT;

-- Operator-controlled reverse-backfill (commented out; uncomment if needed):
-- UPDATE public.jobs j
--    SET client_name = c.full_name,
--        client_email = c.email,
--        client_phone = c.phone
--   FROM public.clients c
--  WHERE c.id = j.client_id;

NOTIFY pgrst, 'reload schema';

COMMIT;
```

## 9. Acceptance criteria (14 falsifiable items)

- **AC-B1a-bis-01** All 16 load-bearing src consumers (per §4 refactor map) compile cleanly (`npm run typecheck` returns 0 errors) post-refactor.
- **AC-B1a-bis-02** All 3 sample-data/script consumers (`smoke-seed.sql`, `rematch-jobs.ts`, `e2e-dewberry-setup.mjs`) refactored per §4; smoke-seed.sql re-applied successfully on fixture-harness-org (10 fixture clients + 10 fixture jobs with non-NULL client_id).
- **AC-B1a-bis-03** Grep `grep -rn 'client_name\|client_email\|client_phone' src/ scripts/ --include='*.ts' --include='*.tsx' --include='*.sql' | grep -v -E '(_fixtures/|design-system/|prototypes/)' | grep -v -E '^[^:]+:[0-9]+:\s*//'` returns 0 hits (active code paths).
- **AC-B1a-bis-04** Grep `grep -rE "client:clients\(.*\*.*\)" src/ scripts/` returns 0 matches (no *-globbed embed).
- **AC-B1a-bis-05** Grep `grep -rE "client:clients\([^)]*(\bemail\b|\bphone\b)" src/ scripts/` returns 0 matches (no email/phone in embed).
- **AC-B1a-bis-06** Migration `supabase/migrations/00101_drop_jobs_client_columns.sql` exists, syntactically valid SQL, header cites nwrp154 + D-078 + D-079 + Q1 + Q2 source decisions, body wraps reverse probe + 3 DROP COLUMN + NOTIFY pgrst in single BEGIN..COMMIT atomic transaction.
- **AC-B1a-bis-07** Migration `supabase/migrations/00101_drop_jobs_client_columns.down.sql` exists, syntactically valid SQL, header documents data-loss-on-rollback contract explicitly.
- **AC-B1a-bis-08** Post-apply: `SELECT column_name FROM information_schema.columns WHERE table_name='jobs' AND table_schema='public' AND column_name IN ('client_name','client_email','client_phone')` returns 0 rows.
- **AC-B1a-bis-09** Post-apply: PostgREST representative query `GET /rest/v1/jobs?select=id,name,client:clients(id,name)&limit=1` returns HTTP 200 with embed resolved correctly (no PGRST204 schema-cache-stale errors; Wave-C Rule 3 ai-logic-tester gate).
- **AC-B1a-bis-10** Post-refactor + post-DROP: `npm run smoke` reports 11/13 PASS minimum with the 2 known failures (/today TD-WE-04 + /settings/workflow TD-WE-05) — NO NEW failure modes (Wave-B prereq #12 maintained per `.planning/lessons.md` 2026-05-15).
- **AC-B1a-bis-11** Post-refactor: `/jobs/22222222-2222-2222-2222-200000000001` page (Smoke Job Alpha on fixture-harness-org) renders 'Smoke Client A' in the Client detail field via embed (read path verified).
- **AC-B1a-bis-12** Post-refactor: GET `/api/draws/[fixture-draw-id]/cover-letter` returns `owner_name=clients.full_name` (preserves AIA legal document fidelity; T-B1a-bis-03 mitigation verified).
- **AC-B1a-bis-13** Post-refactor: AI job-matcher (`src/lib/invoices/job-matcher.ts`) preserves surname-matching signal — unit test or representative-input test confirms `lastWord(job.client?.full_name ?? "")` returns the same surname for fixture-harness-org Smoke Client A..J as pre-refactor `lastWord(job.client_name)`.
- **AC-B1a-bis-14** Edge case TD-B1abis-01 (job-sidebar mailto link removal) documented in `.planning/tech-debt/` or equivalent location with restoration plan referencing F3 magic-link work + Owner Portal automated client email.

## 10. Verification commands (executor uses these at execute time)

### 10.1 Pre-DROP (post-refactor checkpoint)

```bash
# Forward grep — verify no consumer reads jobs.client_* directly
grep -rn 'client_name\|client_email\|client_phone' src/ scripts/ \
  --include='*.ts' --include='*.tsx' --include='*.sql' \
  | grep -v -E '(_fixtures/|design-system/|prototypes/)' \
  | grep -v -E '^[^:]+:[0-9]+:\s*//'
# expect: 0 hits

# PII fence — no email/phone in embed
grep -rE "client:clients\(.*\*.*\)" src/ scripts/
grep -rE "client:clients\([^)]*(\bemail\b|\bphone\b)" src/ scripts/
# expect: 0 matches both patterns

# Type check
npm run typecheck
# expect: 0 errors

# Smoke gate
npm run smoke
# expect: 11/13 PASS minimum (TD-WE-03 baseline)
```

### 10.2 Apply migration 00101

```bash
# Via Supabase MCP at execute time
# mcp__supabase__apply_migration with content = 00101_drop_jobs_client_columns.sql
```

### 10.3 Post-DROP

```sql
-- AC-B1a-bis-08: columns absent
SELECT column_name FROM information_schema.columns
 WHERE table_name='jobs' AND table_schema='public'
   AND column_name IN ('client_name','client_email','client_phone');
-- expect: 0 rows

-- AC-B1a-bis-09: PostgREST embed resolves
-- (Run from a shell with NEXT_PUBLIC_SUPABASE_URL + anon key + auth header set)
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/jobs?select=id,name,client:clients(id,name)&limit=1" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $TEST_USER_JWT"
-- expect: HTTP 200, body shape [{ id, name, client: { id, name } | null }]
```

### 10.4 Drummond E2E reference (post-DROP integrity)

```bash
# Run /nightwork-end-to-end-test (Drummond fixture) — verifies G702/G703 cover-letter
# render preserves owner_name post-refactor + DROP. Per CLAUDE.md "Drummond is the
# reference job for production-facing artifacts" (E2E flow only — fixture-harness-org
# is the smoke target).
```

## 11. Rollback strategy

### 11.1 Same-execute-session rollback (within 1 hour)

If a regression surfaces during execute:

1. `git revert <consumer-refactor-commit>` (or multiple commits if refactor + migration committed separately).
2. Apply `00101_drop_jobs_client_columns.down.sql` via Supabase MCP — re-adds columns as nullable TEXT.
3. **Data NOT auto-restored.** Operator decision: run the commented-out UPDATE in the down migration to reverse-backfill from `clients` table. This restores `client_name` but leaves `client_email`/`client_phone` NULL on jobs (because the consumer refactor DROPPED write paths to those columns; clients.email/phone retain data only if a find-or-create path wrote them).
4. Re-run smoke; verify 11/13 PASS restored.

### 11.2 Post-production-traffic rollback (>1 hour)

Same triage as B-1a §10:
1. Surface to Jake with full diff between current state and pre-execute baseline.
2. Decide per-job: take clients-row value OR accept data loss.
3. Apply reconciliation SQL inside a separate audit-logged migration.

### 11.3 What's NOT reversible

- `client_email` / `client_phone` data that was DROPPED from /api/jobs write paths during the refactor window. If new jobs were created during execute via the refactored POST, their email/phone are in `clients.email/phone` (if the find-or-create wrote them), NOT in `jobs.client_*`. Down migration re-adds the columns but cannot reverse the application-level write redirection.
- Therefore: **rollback restores SHAPE, not behavior.** A coordinated revert of B-1a-bis source code + DOWN migration is the full rollback path. Partial rollback (only DOWN migration, no code revert) leaves runtime in a stable state since the refactored consumers read via embed, not via direct columns.

## 12. SOC2 mapping

| Trust Services Criterion | Coverage |
|---|---|
| **CC6.1** (Logical and physical access controls) | PII fence narrows PostgREST embeds to (id, name) — `clients.email` and `clients.phone` are no longer accessible via the embed surface. RLS on `clients` table (Q10b direct-filter on `org_id`) preserves tenant boundary by construction. Role-gated INSERT + UPDATE on `clients` (owner/admin/pm/accounting per B-1a §4) prevents PM-level privilege escalation. |
| **CC7.2** (System monitoring — security incidents) | Audit-trail durability preserved via the refactor: every consumer that previously read `client_name` from jobs now reads from `clients` via FK join. The `clients` table has `status_history JSONB NOT NULL DEFAULT '[]'` per B-1a (Q12 uniform versioning). When Slice-2 adds 'client' to `ActivityEntityType`, every write to clients writes an `activity_log` row anchored at `auth.users` (D-078 audit anchor). Refactor itself doesn't break any audit_log call sites — the smoke gate catches any regression. |
| **PI1.1** (Processing integrity — completeness/validity) | Reverse-probe inside DROP COLUMN transaction (§8.1 step 1) verifies no asymmetric data remains. ROLLBACK on probe failure preserves pre-migration state. PostgREST embed narrowing (no email/phone) prevents accidental PII exposure via wildcard embeds. Forward grep verification (executor-run before migration apply) prevents code paths that read dropped columns from triggering runtime PGRST errors. |

No new SOC2 controls introduced. B-1a-bis inherits D-078 + D-079 + D-080 + B-1a's control mappings.

## 13. Tech-debt register

| ID | Description | Plan link | Restoration plan |
|---|---|---|---|
| **TD-B1abis-01** | `job-sidebar.tsx` mailto link to `selectedJob.client_email` REMOVED in B-1a-bis (line 366 pre-refactor). Display of email/phone DEFERRED to F3 magic-link work alongside Owner Portal automated client email. | This plan §3.1 row 1 + §4 row 2 | F3 plan adds explicit `/api/clients/[id]` GET endpoint with role-gated authorization (per D-078 + D-079 PII fence rule); job-sidebar consumes the endpoint with explicit user click ("Email client" button -> fetches client row including email -> renders mailto link in confirmation dialog). NOT an embed surface. |
| **TD-B1abis-02** (cosmetic, non-blocking) | 7 design-system fixture files (`_fixtures/jobs.ts`, `_fixtures/drummond/{types,jobs}.ts`, 3 prototype views, `_fixtures/jobs.ts` again) retain literal `client_name/email/phone` shape in sample data. Cosmetic refresh to new `client?: {id, name}` shape deferred to post-B-1b. | This plan §3.1 rows 17-22 | After B-1b lands generated `database.types.ts`, a small design-system maintenance plan refreshes fixture shapes to match new schema. Non-blocking because `_fixtures/` is decoupled from DB queries. |

## 14. Notes for plan-review iter-1

### 14.1 Reviewer focus suggestions

| Reviewer | Focus area | Expected finding shape |
|---|---|---|
| **nightwork-data-migration-safety** | DROP COLUMN atomicity + reverse-probe + rollback contract + dual-source state window | Will verify the migration body matches the §8.1 sketch and the reverse probe RAISEs on asymmetric data. PASS expected. |
| **security-reviewer** | PII fence enforcement on embed narrowing + mailto removal (TD-B1abis-01) + no email/phone in any embed string | Will run grep patterns from §5.2 + spot-check 5-7 random consumers in §4 map. PASS expected. |
| **design-system-reviewer** | UI consumer refactor — job-sidebar, jobs/[id], jobs/, jobs/new, draws/[id], OnboardWizard render unchanged visually post-refactor (just sourced via embed) | Will spot-check 2-3 UI surfaces against design tokens + verify no hardcoded hex slipped in during refactor. PASS expected. |
| **ai-logic-tester** | Representative-query test on PostgREST `client:clients(id, name)` embed AFTER migration applies + verify FK auto-named `jobs_client_id_fkey` resolves the hint per Workflow posture Rule 2 + Rule 3 | MUST execute the representative REST query and verify HTTP 200 + correct embed shape. Will execute job-matcher.ts representative input to verify surname extraction unchanged. PASS expected. |
| **multi-tenant-architect** | RLS pass-through on clients table reads via embed — verifies that a PM in org A reading jobs cannot see clients in org B via the embed (RLS on both `jobs` and `clients` enforces) | PASS expected per Q10b direct-filter RLS on clients. |
| **architect** | Architectural fit with EXPANDED-SCOPE Slice-1 design implication (clients FK semantics support Owner Portal client_portal_access.client_id in Slice-2) + nwrp154 Path A alignment | PASS expected. |
| **enterprise-readiness** | Migration body comment fidelity (cites 5+ source decisions) + commit-mechanism transparency (compound-form per nwrp133) + idempotency (migration runs once; not re-runnable post-DROP) | PASS expected. |
| **scalability** | Index plan (`idx_jobs_client_id` from B-1a preserved post-DROP; no new aggregation introduced) | PASS expected. |
| **compliance** | SOC2 mapping (CC6.1 + CC7.2 + PI1.1) coverage + TD-B1abis-01 documented per CLAUDE.md tech-debt convention | PASS expected. |

### 14.2 Cross-reviewer factual disagreement risk (nwrp118 HALT)

- Possible disagreement on whether `/api/jobs` POST + PATCH should accept `client_id` only (executor implements explicit /api/clients endpoint for create) OR `client_name_for_create` find-or-create shortcut. Resolution: spec leaves to executor judgment; both shapes preserve PII fence + audit-log integrity. Find-or-create within `/api/jobs` is recommended for UX continuity but not mandated.
- Possible disagreement on whether the `_fixtures/` files should refactor in B-1a-bis vs deferred. Resolution: TD-B1abis-02 documents the explicit deferral with rationale (sample data decoupled from DB; cosmetic refresh post-B-1b is safe).

### 14.3 Mandatory pre-flight gates (per Workflow posture Rule 6)

- **(a) Hook regex sweep** on `supabase/migrations/00101_drop_jobs_client_columns.sql` + `.down.sql` for design-token violations — N/A (SQL files; design-token regex doesn't fire on SQL).
- **(a) Hook regex sweep** on the 19 src+script files — executor MUST run `.claude/hooks/nightwork-post-edit.sh` (or equivalent post-edit hook trigger) on each refactored file. Expected: no NEW design-token violations introduced (refactor changes data-binding, not styling).
- **(b) Fixture infrastructure collision check** — no new UUIDs introduced in this plan; B-1a's `clients` fixture row at `00000000-0000-0000-0003-000000000001` is consumed but not duplicated. smoke-seed.sql additions (10 fixture clients) use a new UUID range `00000000-0000-0000-0003-100000000001..0a`; pre-flight: verify no collision with the 0003-* depth-3 namespace prefix in existing migrations. Plan-author check: no prior migration uses `0003-1*` UUID range. PASS.
- **(c) Deliverable path reachability check** — all 19 src+script paths + 2 migration paths are tracked by git from a fresh checkout. PASS.
- **(d) files_modified intersection check** vs sibling agent re-authoring B-1a — B-1a files: `00100_clients_schema_foundation.sql` + `.down.sql` (only). B-1a-bis files: 19 src+script + `00101_drop_jobs_client_columns.sql` + `.down.sql`. **Intersection: empty.** Parallel-authoring confirmed safe at file level. Parallel-execute NOT permitted per nwrp152/nwrp154 migration-numbering sequencing (00100 -> 00101).

### 14.4 Commit mechanism (per nwrp133)

Compound `git add ... && git commit` form is the default; does NOT require Jake authorization. Commit body cites nwrp154 + D-078 + D-079 + Q1 + Q2 source decisions + this plan path. Executor MUST distinguish compound form from `--no-verify` flag (the latter requires Jake authorization per CLAUDE.md).
