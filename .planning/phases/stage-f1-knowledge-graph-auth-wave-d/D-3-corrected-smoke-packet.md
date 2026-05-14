---
status: SUPERSEDES Wave-C 5-route packet
authored: 2026-05-13
phase: stage-f1-knowledge-graph-auth-wave-d
plan: D-3
cross_reference:
  - next.config.mjs:91-102 (canonical redirect rules — Bills/Pay Apps rename per stage-1.5c-IA D-01)
  - .planning/expansions/stage-f1-knowledge-graph-auth-wave-d-EXPANDED-SCOPE.md (Plan D-1 9 hint sites + Plan D-2 thin-wrappers)
  - .planning/CONTEXT.md D-01 (Bills/Pay Apps terminology rename)
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-d/ITER-2-PATCHES.md §3 (308 terminology + fixture auth + escalation path)
---

# Wave-D corrected smoke packet — 9 canonical Stage 1.5c routes

## Why this packet supersedes the original

The original Wave-C smoke packet was authored mid-conversation by Claude Code and never written to disk. It pointed Jake at six pre-rename paths under the legacy `/invoices` and `/draws` umbrellas — every one of which **308-redirects** to a canonical Stage 1.5c IA destination per `next.config.mjs:91-102`. (Next.js's `permanent: true` directive emits HTTP 308; the original packet used an incorrect HTTP-code label which has been corrected here per ITER-2-PATCHES.md §3.3.)

Jake's smoke-walk against that packet landed on the redirect destinations and surfaced two legitimate signals — the PGRST200 PostgREST embedding-hint bug (Wave-D Plan D-1's 9 fix sites) and the double-AppShell render (Wave-D Plan D-2's 8-file rescope including `/financials/aging` + `/financials/aging-report` per ITER-2-PATCHES.md §2.1). The signals were real; the packet's INPUT URLs were wrong by construction. A future author copying that packet repeats the error and re-litigates stage-1.5c-IA's resolved rename every cycle.

**This packet uses canonical Stage 1.5c destinations only.** The pre-rename umbrellas (`/invoices` and `/draws`) appear in this packet **only** in this preamble and the §"Why pre-rename URLs are forbidden inputs" section below — never as smoke targets. The authoritative pre→post mapping lives in `next.config.mjs:91-102` (verify the line range hasn't drifted before running smoke).

## Scope

**In scope:** 9 routes covering Wave-D Plan D-1 (PostgREST embedding-hint fixes via `org_members_user_id_profiles_fkey` from migration 00098) and Plan D-2 (double-AppShell removal on the financials/* thin-wrappers + aging surfaces).

**Out of scope** (per ITER-2-PATCHES.md §3.8): Today, Pipeline, Price Intel, People, Company, Reports, Admin top-nav sections. Wave-D Plans D-1 + D-2 did not touch those surfaces; their canonical smoke coverage lands with later plans (Wave 1.1-Full Layer 4 per the post-1.5c-verification-harness calibration log). If you observe a regression in one of those sections during this smoke walk, file it as out-of-band — do not block Wave-D ship.

## Auth fixture for smoke run

Per ITER-2-PATCHES.md §3.1 (decision 6 — non-Drummond synthetic fixture):

- **User:** `harness-fixture@nightwork.local`
- **Password:** see `PLAYWRIGHT_FIXTURE_PASSWORD` (alias: `HARNESS_FIXTURE_PASSWORD`) env var on the Vercel preview deployment
- **Org:** `harness-fixture-org` (UUID seeded via `scripts/fixtures/smoke-seed.sql`)
- **Memberships seeded for this fixture:**
  - 1× owner
  - 1× admin
  - 7× PM (named "Smoke PM Alpha", "Smoke PM Beta", …, "Smoke PM Eta" — distinct display names to verify the PM-dropdown populates non-Unassigned values, not UUIDs)
  - 1× accounting
- **Activity-log seeded rows:** 10× distinct `activity_log` entries with `assigned_pm` populated by 4 different fixture PMs (so the feed displays display-names not UUIDs).
- **Storage-state reuse:** the Playwright runner (`scripts/wave-d-smoke.ts` per Plan D-4) authenticates once, saves session storage, and reuses it across all 9 route hits. Human smoke runs should authenticate once at `/login` and keep the tab open across the full walk.

To override seed for a different fixture set, pass alternate env vars on the preview deploy.

## Routes

### Route 1 — `/financials/bills`

**Origin:** Plan D-1 (was `src/app/invoices/page.tsx` `profiles:user_id` hint — fixed to `profile:profiles (...)` resolving via `org_members_user_id_profiles_fkey`) + Plan D-2 (was double-AppShell on the thin re-export).
**Served by:** `src/app/financials/bills/page.tsx` (thin re-export) → `src/app/invoices/page.tsx` (underlying canonical component).
**Replaces (forbidden input):** the legacy `/invoices` root surface (see `next.config.mjs:91`).

**Expected behavior:**
- Single NavBar visible at top (no double NavBar; no doubled sidebar; no duplicated breadcrumb row).
- PM filter dropdown populates with full names from `org_members → profiles` join (NOT user UUIDs; NOT "Unassigned" for every option).
- Bills list table renders with seeded fixture data (≥1 row).

**Specifically verify:**
- [ ] Page returns HTTP 200 (NOT 308, NOT 404, NOT 500).
- [ ] PM dropdown shows non-empty list of full names (e.g., "Smoke PM Alpha", "Smoke PM Beta").
- [ ] No double NavBar / no doubled sidebar / no duplicated breadcrumb row.
- [ ] Console clean of `PGRST200` errors (PostgREST relationship-cache errors).
- [ ] Browser DevTools Network tab: all `/rest/v1/*` requests return 200 (NOT 400/401/403/500); all `/api/*` requests return expected 2xx/3xx.
- [ ] Primary UX populates within ~2s on Vercel preview.

### Route 2 — `/financials/bills/queue`

**Origin:** Plan D-1 (was `src/app/invoices/queue/page.tsx` `profiles:user_id` hint) + Plan D-2 (was double-AppShell).
**Served by:** `src/app/financials/bills/queue/page.tsx` (thin re-export) → `src/app/invoices/queue/page.tsx`.
**Replaces (forbidden input):** the legacy queue surface (see `next.config.mjs:92`).

**Expected behavior:**
- Single NavBar visible at top.
- PM assignment dropdown populates with full names (NOT UUIDs).
- Review queue renders bills awaiting PM review with assignable PM column.

**Specifically verify:**
- [ ] Page returns HTTP 200.
- [ ] PM dropdown shows non-empty list of full names.
- [ ] No double NavBar / no doubled sidebar.
- [ ] Console clean of `PGRST200` errors.
- [ ] Network tab: PostgREST + API requests return 2xx/3xx.
- [ ] Primary UX populates within ~2s on Vercel preview.

### Route 3 — `/financials/bills/qa`

**Origin:** Plan D-2 (was double-AppShell on the QA queue thin re-export).
**Served by:** `src/app/financials/bills/qa/page.tsx` (thin re-export) → `src/app/invoices/qa/page.tsx`.
**Replaces (forbidden input):** the legacy QA surface (see `next.config.mjs:93`).

**Expected behavior:**
- Single NavBar visible at top.
- QA queue renders bills awaiting accounting review (post-PM-approval).
- Activity feed on each bill shows assignee display-names (not UUIDs).

**Specifically verify:**
- [ ] Page returns HTTP 200.
- [ ] No double NavBar / no doubled sidebar / no duplicated breadcrumb row.
- [ ] Console clean (no PGRST or unhandled errors).
- [ ] Network tab: all requests return 2xx/3xx.
- [ ] Activity feed shows PM display-names when expanded on a fixture bill.

### Route 4 — `/financials/bills/[id]`

**Origin:** Plan D-1 (was `src/app/api/invoices/[id]/route.ts:108-111` `profiles:user_id` hint).
**Served by:** `src/app/financials/bills/[id]/page.tsx` (thin re-export) → underlying bill detail review component.
**Replaces (forbidden input):** the legacy detail surface (see `next.config.mjs:97`).
**Note:** requires a concrete `[id]` for smoke — substitute the first fixture-org bill ID surfaced on Route 1's bill list. Smoke is invalid against a Drummond ID (fixture-org only per ITER-2-PATCHES.md §3.1).

**Expected behavior:**
- Bill detail loads with assigned-PM dropdown showing full names.
- Activity timeline at bottom shows seeded fixture entries with PM display-names (not UUIDs).
- File preview (left rail) renders the seeded fixture document.

**Specifically verify:**
- [ ] Page returns HTTP 200 (not 308 — bare `[id]` URL substituted).
- [ ] PM dropdown shows non-empty list of full names.
- [ ] Activity timeline shows PM display-names, not UUIDs.
- [ ] Console clean of `PGRST200` errors.
- [ ] Network tab: `/api/invoices/[id]` + PostgREST embedding requests return 200.
- [ ] No legacy `/invoices/[id]` page rendered (route lands at canonical `/financials/bills/[id]`; the legacy module is dead-code per TD-WD-01 in ITER-2-PATCHES.md §2.2).

### Route 5 — `/financials/lien-releases`

**Origin:** Plan D-2 (was double-AppShell on the lien-releases thin re-export).
**Served by:** `src/app/financials/lien-releases/page.tsx` (thin re-export) → `src/app/invoices/liens/page.tsx`.
**Replaces (forbidden input):** the legacy liens surface (see `next.config.mjs:95`).

**Expected behavior:**
- Single NavBar visible at top.
- Lien-releases list renders with seeded fixture data.

**Specifically verify:**
- [ ] Page returns HTTP 200.
- [ ] No double NavBar / no doubled sidebar / no duplicated breadcrumb row.
- [ ] Console clean.
- [ ] Network tab: PostgREST + API requests return 2xx/3xx.
- [ ] Primary UX populates within ~2s on Vercel preview.

### Route 6 — `/financials/payments`

**Origin:** Plan D-2 (was double-AppShell on the payments thin re-export).
**Served by:** `src/app/financials/payments/page.tsx` (thin re-export) → `src/app/invoices/payments/page.tsx`.
**Replaces (forbidden input):** the legacy payments surface (see `next.config.mjs:94`).

**Expected behavior:**
- Single NavBar visible at top.
- Payments register renders with seeded fixture data.

**Specifically verify:**
- [ ] Page returns HTTP 200.
- [ ] No double NavBar / no doubled sidebar.
- [ ] Console clean.
- [ ] Network tab: requests return 2xx/3xx.
- [ ] Primary UX populates within ~2s on Vercel preview.

### Route 7 — `/financials/pay-apps`

**Origin:** Plan D-2 (was double-AppShell on the pay-apps thin re-export, replacing the legacy `/draws` surface).
**Served by:** `src/app/financials/pay-apps/page.tsx` (thin re-export) → `src/app/draws/page.tsx`.
**Replaces (forbidden input):** the legacy `/draws` umbrella (see `next.config.mjs:100`).

**Expected behavior:**
- Single NavBar visible at top.
- Pay Apps list renders with seeded fixture data (AIA G702/G703 summaries).

**Specifically verify:**
- [ ] Page returns HTTP 200.
- [ ] No double NavBar / no doubled sidebar / no duplicated breadcrumb row.
- [ ] Console clean.
- [ ] Network tab: PostgREST + API requests return 2xx/3xx.
- [ ] Primary UX populates within ~2s on Vercel preview.

**Print-path coverage (per ITER-2-PATCHES.md §3.2):** `/financials/pay-apps/[id]/print` is the printable G702/G703 layout (legacy `/draws/[id]/print` redirects here per `next.config.mjs:102`). Smoke spot-check after Route 7: navigate to a fixture-org pay app's print URL, verify `<table>` row count > 0 (Pay App G703 line items render) and that print pages may render WITHOUT AppShell — verify that posture is intentional (no console errors; expected layout for print). If you see broken layout, file under Plan D-2 follow-up.

### Route 8 — `/jobs/new`

**Origin:** Plan D-1 (was `src/app/jobs/new/page.tsx:79-80` `profiles:user_id` hint).
**Served by:** `src/app/jobs/new/page.tsx`.
**Replaces (forbidden input):** N/A — `/jobs/new` was never under the `/invoices` or `/draws` umbrella; no pre-rename path.

**Expected behavior:**
- New-job form renders.
- PM assignment dropdown populates with full names of PMs and admins (NOT UUIDs).
- Form fields accept input without validation errors on empty submit (validation fires on submit, not focus).

**Specifically verify:**
- [ ] Page returns HTTP 200.
- [ ] PM dropdown shows non-empty list of full names (e.g., "Smoke PM Alpha" + "Smoke PM Beta" + …).
- [ ] Console clean of `PGRST200` errors.
- [ ] Network tab: `/rest/v1/org_members?...profile:profiles` request returns 200 (NOT 400).
- [ ] Form renders without doubled containers.

### Route 9 — `/jobs/[id]`

**Origin:** Plan D-1 (was `src/app/api/jobs/[id]/overview/route.ts:72-74` `profiles:user_id` hint).
**Served by:** `src/app/jobs/[id]/page.tsx`.
**Replaces (forbidden input):** N/A — `/jobs/[id]` was never under the `/invoices` or `/draws` umbrella; no pre-rename path.
**Note:** requires a concrete `[id]` — substitute the first fixture-org job ID surfaced on `/jobs` (the jobs list). Do not smoke against Drummond IDs (fixture-org only).

**Expected behavior:**
- Job overview loads with assigned-PM name visible (NOT UUID).
- Per-job tabs render correctly (no double NavBar).
- Recent-activity feed on the overview shows PM display-names.

**Specifically verify:**
- [ ] Page returns HTTP 200.
- [ ] Assigned-PM field shows full name (e.g., "Smoke PM Alpha").
- [ ] Console clean of `PGRST200` errors.
- [ ] Network tab: `/api/jobs/[id]/overview` returns 200; PostgREST embedding requests return 200.
- [ ] No double NavBar / no doubled sidebar.

## Smoke verification — redirect-regression sentinel

Per ITER-2-PATCHES.md §3.4. Confirms `stage-1.5c-IA` D-01 redirects still fire from the legacy umbrellas. Catches a future regression where someone accidentally removes redirect rules from `next.config.mjs`.

```bash
curl -I https://<preview-url>/invoices
# Expected: HTTP/2 308
# Expected: location: /financials/bills

curl -I https://<preview-url>/draws
# Expected: HTTP/2 308
# Expected: location: /financials/pay-apps
```

If either curl returns 200 or 404 instead of 308 → **REGRESSION**; halt smoke; investigate `next.config.mjs:91-102`.

## Why pre-rename URLs are forbidden inputs

A smoke packet using a pre-rename umbrella exercises the 308 chain but does NOT exercise the canonical route's render path the way a user landing on the canonical URL would (the redirect masks render differences and timing). More importantly, copying a pre-rename packet into Wave-E / Wave-F / Wave 1.1 re-litigates stage-1.5c-IA's resolved rename every cycle. The canonical rule lives in `next.config.mjs:91-102` (308 permanent redirects, eight legacy → canonical pairs). When the line range drifts, update this packet's citation in lockstep.

Reference: `.planning/CONTEXT.md` D-01 (Bills/Pay Apps terminology rename); `next.config.mjs:91-102` (the 308 rules).

## How to run this smoke packet

1. Run against the **Vercel preview URL** for the Wave-D post-execute branch — NOT localhost. Per CLAUDE.md "Hard rule: verify against the Vercel preview URL before `/gsd-ship`."
2. Authenticate once as `harness-fixture@nightwork.local` (password from `PLAYWRIGHT_FIXTURE_PASSWORD` env). Storage state persists across the 9 route hits.
3. For Routes 4 and 9 (`[id]` params), substitute the first fixture-org bill ID / job ID surfaced on the corresponding list route (Route 1 for bills; `/jobs` for jobs). Drummond IDs are invalid here — synthetic fixture only per ITER-2-PATCHES.md §3.1.
4. Capture screenshots inline via Chrome MCP per CLAUDE.md screenshot protocol (do NOT persist to disk — Jake reviews inline).
5. **Network-tab verification (every route, per ITER-2-PATCHES.md §3.5):** open Browser DevTools Network tab and verify all `/rest/v1/*` PostgREST requests return HTTP 200 (NOT 400/401/403/404/500) and all `/api/*` Next.js API routes return expected 2xx/3xx. The Wave-C 400 (PGRST200 — relationship not in schema cache) was a Network-tab signal, not a console-error signal. Skipping Network-tab means that class of bug returns.
6. Mark each verify checkbox manually after observation.
7. **Companion automation:** if `scripts/wave-d-smoke.ts` (Plan D-4, shipped at commit `b4e4dc4`) is running, this packet is the **human-readable companion** — the Playwright script automates the mechanical render + console + status-code checks for Routes 1-7 against the preview URL. Routes 8 + 9 (no pre-rename path; not the 308-redirect surface) plus the human visual checks (single NavBar; field rendering quality; PM display-name correctness) remain manual.
8. Pass redirect-regression sentinel curls (see §"Smoke verification — redirect-regression sentinel" above) at the start AND end of the walk — frame the entire smoke between the two sentinel runs.

## If smoke finds an issue

Per ITER-2-PATCHES.md §3.6:

1. **Capture:** route URL + console errors verbatim + Network-tab failed-request details + screenshot.
2. **File:** append to `.planning/qa-runs/wave-d/smoke-results.json` with `status: "FAIL"`.
3. **Identify owning plan:**
   - `PGRST200` 400 or display-name shows UUID → **Plan D-1** (PostgREST embedding hint).
   - Double NavBar or double sidebar → **Plan D-2** (AppShell removal).
   - Wrong canonical URL (e.g., lands on a legacy umbrella instead of `/financials/*`) → **Plan D-3** (this packet — smoke ran against wrong URL).
   - Smoke script crash or config error → **Plan D-4** (Playwright + Rules codification).
   - D-078 decision-entry missing or mis-cited → **Plan D-5**.
4. **/nightwork-qa** picks up `smoke-results.json` automatically per ITER-2-PATCHES.md §4 (decision 4); ship blocks until status changes to PASS or Jake explicitly authorizes proceeding.
5. **If issue is on the smoke script itself:** halt; file as iter-3 patch against Plan D-4.

## Cross-references

- `.planning/expansions/stage-f1-knowledge-graph-auth-wave-d-EXPANDED-SCOPE.md` — Wave-D scope; Plan D-1 9 hint sites; Plan D-2 thin-wrappers (8-file iter-2 rescope).
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-d/ITER-2-PATCHES.md` — full iter-2 patch register (§3 is the Plan D-3 patch set this packet implements).
- `next.config.mjs:91-102` — canonical 308 permanent-redirect rules (Bills/Pay Apps rename per stage-1.5c-IA D-01).
- `.planning/CONTEXT.md` D-01 — Bills/Pay Apps terminology rename source decision.
- `.planning/phases/stage-1.5c-information-architecture/` — the rename's source phase folder (full context on the 8-section IA + Bills/Pay Apps terminology adoption).
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-4-rules-and-playwright-PLAN.md` + `…-SUMMARY.md` — companion Playwright automation (`scripts/wave-d-smoke.ts`).
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-5-d078-decision-entry-PLAN.md` — D-078 user-identity FK convention split (the decision underlying migration 00098).
