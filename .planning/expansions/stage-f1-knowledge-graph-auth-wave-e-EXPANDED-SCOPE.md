---
phase: stage-f1-knowledge-graph-auth-wave-e
type: expanded-scope
authored: 2026-05-14
authored_by: orchestrator (claude-opus-4-7[1m]) under nwrp141-144 authorization
authorization: Wave-D GATE-N /nightwork-qa BLOCKING verdict + nwrp141-144 framing
status: APPROVED for plan authoring
---

# Wave-E — Corrective Wave for Wave-D Verification Gaps

## Purpose

Wave-D shipped 5 plans (D-1/D-2/D-3/D-4/D-5) per AC at code layer. Wave-D's `/nightwork-qa` runtime verification surfaced 3 BLOCKING findings (smoke harness selector mismatch — 3 reviewers converged; `/financials/bills/[id]` route incompatibility; vendor PII embed) + 2 HIGH security findings (vendor PII embed + plaintext seed password in production). Wave-E is the corrective wave that closes the runtime-verification gaps and security HIGHs before Wave-B's foundational schema work begins.

Wave-E to Wave-D is what Wave-D was to Wave-C: corrective wave for verification gaps. Wave-D's 5 plans REMAIN SHIPPED — Wave-E adds the missing runtime-verification layer + closes security HIGHs.

## Status of pre-Wave-E remediations (already executed via Supabase MCP)

Per nwrp141-143 user authorization, 9 production `smoke-*@nightwork.local` accounts (created by D-4 smoke seed apply at nwrp135) have been DELETED from production Supabase. Cascade chain verified clean (9 auth.users + 9 profiles + 9 org_members + 9 auth.identities cascaded; 10 activity_log SET NULL on user_id). 10 dangling-pm synthetic jobs + 5 invoices + 10 null-user activity_log in fixture-harness-org also cleaned (nwrp143 additive cleanup). fixture-harness-org restored to pre-nwrp135 canonical state (1 org_member + 1 profile + 0 jobs/invoices/activity_log; original harness-fixture user preserved). Local commit at `5958df0` (NOT yet pushed; bundles with Plan E-2 seed rewrite).

Audit trail: `.planning/qa-runs/wave-d/finding-2-remediation.md` (gitignored; local-only).

## Wave-E Plan Decomposition

3 plans (E-4 absorbed into E-2 per nwrp141 decomposition):

### Plan E-1 — FINDING-1 re-classification (Path C per nwrp145)

**REVISED at nwrp145: Path C (re-classify as ACCEPTED RISK), NOT Path A (narrow embed).**

**Original scope (Path A) cancelled.** Per nwrp145 Jake adjudication: FINDING-1 [HIGH] is re-classified as ACCEPTED RISK. The vendor embed at line 76 of `src/app/api/invoices/[id]/route.ts` REMAINS UNCHANGED. Rationale: vendor phone/email is B2B contact info (commercial entities, published business data) — NOT customer PII (homeowner email/phone). D-078's PII fence was designed around `profiles` (customer/employee identity), not `vendors`. Vendor-builder relationship implies reciprocal consent for direct contact. VendorContactPopover tap-to-call is a load-bearing PM workflow.

**Revised scope (Path C):**
1. Author re-classification audit trail at `.planning/qa-runs/wave-d/finding-1-reclassification.md` (gitignored; local-only)
2. Add D-079 MASTER-PLAN entry codifying "PII fence = customer data only; vendor B2B contact info NOT in scope"
3. Update this EXPANDED-SCOPE (THIS edit) to reflect Path C decision
4. Update E-1 PLAN.md to reflect Path C scope (NO code changes)

**Files modified:** 0 source files; 3 planning artifacts (re-classification doc, MASTER-PLAN.md, EXPANDED-SCOPE.md, E-1 PLAN.md)

**requires_smoke:** false (no code change; documentation-only)

**Out of scope (unchanged):** `jobs/[id]/overview/route.ts:71` `SELECT *` returning `client_email` + `client_phone` (FINDING-4, MEDIUM) — TD-WD-06 for Wave 1.1-Lite scope. Customer PII fence (D-078) remains in effect for `profiles` table and `jobs` customer columns; Path C narrows fence scope to those, NOT vendor B2B contact.

### Plan E-2 — Smoke harness fix + seed rewrite (absorbs E-4 security per nwrp141)

**Scope:**
1. **Add `data-component="nav-bar"` to `<header>` in `src/components/nav-bar.tsx:280`** — matches existing `data-slot="org-logo"` + `data-pattern-slot` convention from D-4.
2. **Add `data-component="job-sidebar"` to `<aside>` in `src/components/job-sidebar.tsx:259`** — same pattern.
3. **Precursor cleanup (Rule 6 pre-flight findings on job-sidebar.tsx):**
   - Line 164: `hover:text-white` → `hover:text-[color:var(--nw-white-sand)]` (matches fd70122 + aging-report:27 / aging:39 sibling pattern)
   - Line 284: same `hover:text-white` → `hover:text-[color:var(--nw-white-sand)]` (CTA button second instance)
   - Lines 192, 212, 248, 343, 407: `rounded-full` on status dots — keep as-is (legitimate per CLAUDE.md SYSTEM.md §13 "avatars/dots use --radius-dot: 999px exception"); plan body documents the hook-vs-spec divergence as Wave-B hook-precision-refinement candidate, NOT a fix
4. **Update `scripts/wave-d-smoke.ts`:**
   - NavBar selector: `'header.app-shell-nav, header[data-component="nav-bar"]'` → `'header[data-component="nav-bar"]'` (single canonical selector matching the production attribute)
   - Sidebar selector: `'aside.app-shell-sidebar'` → `'aside[data-component="job-sidebar"]'`
   - Hydration wait: `waitUntil: "load"` → `waitUntil: "networkidle"` per ai-logic-tester Bug C
   - Primary-UX form selectors: `select[name='pm_id']` → either add `name=` attributes to `<select>` elements in jobs/new/page.tsx + settings/workflow/page.tsx OR refactor to role-based locators `page.getByRole("combobox", { name: /assigned pm/i })` per ai-logic-tester Bug B (pick role-based; it's more semantic)
   - **NEW per nwrp144 #1: Add DOM-level PM name verification AC** — for jobs/[id]/overview route, smoke must assert that PM names render correctly in rendered output (NOT just that the API returns 200). This validates the application-layer pm_id → orgPms[i].full_name mapping that nwrp143 Q3(a) flagged. Selector: `[data-pm-name]` attribute on the rendered PM display OR text content match against the synthetic seed's PM names. Acceptance: the DOM contains `Smoke PM Alpha` (or equivalent) text in the PM-display region of jobs/[id]/overview.
5. **REWRITE `scripts/fixtures/smoke-seed.sql`:**
   - Replace hardcoded `v_password TEXT := 'SmokeSeed2026!'` with `crypt(gen_random_uuid()::text, gen_salt('bf'))`
   - Write the generated password to `.planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt` at apply time (gitignored per `.planning/qa-runs/` whitelist exclusion)
   - Update `harness-auth-bootstrap.ts` to read password from gitignored credentials file OR environment variable (consistent with existing `HARNESS_FIXTURE_PASSWORD` env var pattern for the original harness-fixture user)
6. **Apply rewritten seed** to production via Supabase MCP post-merge (re-creates the 9 synthetic accounts with apply-time random passwords)

**Origin:**
- nwrp140 (3-reviewer convergence on smoke selector mismatch)
- nwrp141 (FINDING-2 prevention — never commit plaintext password)
- nwrp144 #1 (DOM-level PM name verification AC)
- Rule 6 pre-flight findings on job-sidebar.tsx (precursor cleanup #3)

**Files modified:** 5 (`src/components/nav-bar.tsx`, `src/components/job-sidebar.tsx`, `scripts/wave-d-smoke.ts`, `scripts/fixtures/smoke-seed.sql`, possibly `scripts/harness-auth-bootstrap.ts` for password loading)

**requires_smoke:** true (UI changes + harness fix; smoke run validates the fix end-to-end)

**Post-execute step (orchestrator, not executor):** apply rewritten seed via Supabase MCP execute_sql to re-create 9 smoke users; then re-run wave-d-smoke.ts.

### Plan E-3 — `/financials/bills/[id]` real DB wire

**Scope:** `src/app/financials/bills/[id]/page.tsx:39` currently reads from in-memory `CALDWELL_INVOICES` fixtures (string IDs like `inv-caldwell-001`). Synthetic seed UUIDs `33333333-...` never match. Per nwrp141 Q3 decision: wire real `public.invoices` DB lookup (F1 trajectory; correct long-term).

**Implementation:**
- Replace `const inv = CALDWELL_INVOICES.find((i) => i.id === params.id)` with real Supabase query: `supabase.from('invoices').select('*').eq('id', params.id).single()`
- Verify `getCurrentMembership()` membership check before query per CLAUDE.md API route rules
- Handle 404 path correctly (invoice not found OR not in user's org via RLS)
- Map Caldwell-fixture's display logic to real-invoice fields (vendor_name_raw, total_amount, line_items, etc.)

**Origin:**
- /nightwork-qa spec-checker BLOCKING #2 (404 on /financials/bills/[id])
- /nightwork-qa ai-logic-tester Bug D (Caldwell-fixture-vs-DB structural incompatibility)
- nwrp141 Q3 decision: wire real DB lookup (F1 trajectory)

**Halt condition:** If implementation requires new RLS policies or schema changes beyond the existing `invoices` table policies → HALT, surface to Jake.

**Files modified:** 1 (`src/app/financials/bills/[id]/page.tsx`)

**requires_smoke:** true (UI route resolution change; smoke validates the synthetic UUID resolves to real invoice display)

### NOT in Wave-E scope (deferred / handled separately)

- **FINDING-3 nwrp139 harness-fixture password leak:** override per nwrp141 Q2 — Jake's nwrp139 don't-rotate decision STANDS. Re-affirmed at nwrp141 with FINDING-2 context. Rotation deferred. Documented in calibration log nwrp141 entry.
- **FINDING-4 jobs/[id]/overview select(*):** TD-WD-06 for Wave 1.1-Lite scope. Pre-existing, not Wave-D-caused. Adding would expand Wave-E into general PII audit.
- **D-arch decision (nwrp136 deployment architecture):** deferred to pre-dogfood per nwrp138. D-arch-3 default for now. Reopen when Ross Built staff start using nightwork-platform.vercel.app or custom domain is set up.
- **User-identity FK convention (D-### entry):** new MASTER-PLAN.md decision entry codifying fork-vs-converge for 11 user-identity columns lacking FK. Per nwrp144 #2: author as part of Wave-E close-out OR standalone decision pass before Wave-B kickoff. **Orchestrator decision: author during Wave-E close-out (after E-1/E-2/E-3 ship + /nightwork-qa PASS)** — defers the convention codification until smoke harness is fixed so the decision's impact can be validated cleanly.

## Wave-E Sequencing

```
[Plan authoring in parallel] E-1 + E-2 + E-3 (3 gsd-planner subagents)
    ↓
[/nightwork-plan-review] iter-1 (6 reviewers per skill)
    ↓
[HALT for Jake] iter-1 findings review
    ↓
[Wave-E Execute] in dependency order:
  - E-2 first (seed rewrite + harness fix — gates downstream smoke runs)
  - E-1 + E-3 in parallel (independent files; no overlap with E-2)
    ↓
[Apply rewritten seed] via Supabase MCP (re-creates 9 smoke users with random pwd)
    ↓
[Re-run wave-d-smoke.ts] against https://nightwork-platform.vercel.app
    ↓
[/nightwork-qa] revalidation
    ↓
[Wave-E GATE-N] HALT for Jake
    ↓
[Wave-E close-out] author D-### MASTER-PLAN entry for user-identity FK convention (per nwrp144 #2)
    ↓
[Push] Wave-E commits + pre-Wave-E remediation commit (5958df0) bundled together
```

## Rule 1-6 Discipline (per Wave-D codification)

- **Rule 1 (schema ≠ runtime):** smoke run is the canonical runtime verification gate. Re-run after E-2 fixes.
- **Rule 2 (PostgREST FK citation):** N/A for E-1 (narrow embed, no new hint); E-3 may write new embeds → cite the relevant FK constraints. The user-identity FK convention close-out (post-Wave-E) addresses the 11-column audit per nwrp143/144.
- **Rule 3 (ai-logic-tester executes representative queries):** E-3 plan-author must verify real DB lookup pattern via Supabase MCP probe at plan-review time.
- **Rule 4 (Playwright smoke pre-QA):** E-2 requires_smoke=true (UI change); E-3 requires_smoke=true (route render change); E-1 requires_smoke=false (route-handler only, no UI change).
- **Rule 5 (files_modified intersection):** E-1, E-2, E-3 have disjoint files_modified (verified at this expansion). parallel_execute_ok: true for E-1 + E-3; E-2 sequences first (gates downstream smoke runs).
- **Rule 6 (pre-flight collision checks):** Rule 6(a) pre-flight done at this expansion — 7 hits surfaced on job-sidebar.tsx, 2 cleaned by E-2 precursor, 5 documented as Wave-B hook-precision-refinement (not E-2 scope). Rule 6(b)(c)(d) N/A for these plans.

## Wave-E Acceptance Criteria (cumulative across 3 plans)

1. AC-E-01: `grep -nE "phone|email" src/app/api/invoices/\[id\]/route.ts` returns 0 hits in PostgREST embed hints (E-1).
2. AC-E-02: `grep -nE 'data-component="nav-bar"' src/components/nav-bar.tsx` returns ≥1 match (E-2).
3. AC-E-03: `grep -nE 'data-component="job-sidebar"' src/components/job-sidebar.tsx` returns ≥1 match (E-2).
4. AC-E-04: `grep -nE "\b(bg|text|border)-(white|black)\b" src/components/job-sidebar.tsx` returns 0 hits (E-2 precursor).
5. AC-E-05: `grep -nE "SmokeSeed2026|hardcoded.*password" scripts/fixtures/smoke-seed.sql` returns 0 hits (E-2 seed rewrite).
6. AC-E-06: `grep -nE "crypt\(gen_random_uuid|smoke-seed-credentials-DO-NOT-COMMIT" scripts/fixtures/smoke-seed.sql` returns ≥1 match (E-2 seed rewrite).
7. AC-E-07: wave-d-smoke.ts re-run returns PASS on all 13 routes (or documented expected DEFER/SKIP for routes pending future work) — verified post-execute against re-applied seed.
8. AC-E-08: DOM verification: smoke harness asserts `text=Smoke PM Alpha` (or equivalent) appears in rendered output of jobs/[id]/overview route (E-2 new AC per nwrp144 #1).
9. AC-E-09: `/financials/bills/[id]/page.tsx` reads from `public.invoices` via Supabase query, not CALDWELL_INVOICES (E-3).
10. AC-E-10: smoke route `/financials/bills/33333333-3333-3333-3333-300000000001` returns 200 with synthetic invoice data rendered (E-3 + E-2 re-applied seed).
11. AC-E-11: `/nightwork-qa` re-run post-Wave-E execute returns PASS or WARNING (not BLOCKING).
12. AC-E-12: Wave-B prerequisite list updated; D-### MASTER-PLAN entry authored for user-identity FK convention.

## Commit Posture

Each plan = one atomic commit. Compound `git add ... && git commit` form per nwrp133 codification (no --no-verify without explicit Jake auth). Push to origin/main AFTER all 3 plans + re-applied seed + smoke PASS + GATE-N approval, bundled with the pre-existing 5958df0 (FINDING-2 remediation calibration log).

## Wave-B Prerequisites (cumulative post-Wave-E)

Items 1-7 unchanged. Items 8 + 9 resolved by Wave-E if PASS. Item 10 (user-identity FK convention D-### entry) is Wave-E close-out scope. Wave-B remains REVOKED until Wave-E GATE-N approved.

**Item 11 (NEW; iter-2 patch per security-reviewer Top concern 2):** Rotate HARNESS_FIXTURE_PASSWORD per security-reviewer FINDING-3 promotion. Originally classified MEDIUM per nwrp139 (don't-rotate decision); promoted to Wave-B prerequisite at iter-1 because the credential is org-admin in production Supabase (synthetic-org scope, but real auth) and rotation is low-cost (env var update). Three rotation surfaces: `.env.local` on all dev machines + Vercel env var (Production + Preview) + GitHub Actions workflow secret. Before Wave-B Plan B-1 dispatches.

## Iter-2 patches (consolidated reference)

After /nightwork-plan-review iter-1 returned 9 reviewer verdicts, iter-2 patches landed inline. Full patch list with severity + status: `.planning/phases/stage-f1-knowledge-graph-auth-wave-e/ITER-2-PATCHES.md`. Notable per-plan effects:

- **Plan E-1:** New AC-E1-05 (ENTITY-INVENTORY.md line 21 update); files_modified expanded to include `.planning/architecture/ENTITY-INVENTORY.md` (compliance CRITICAL fix).
- **Plan E-2 files_modified (canonical):**
  - src/components/nav-bar.tsx
  - src/components/job-sidebar.tsx
  - src/app/jobs/[id]/page.tsx (data-pm-name attribute — was in PLAN frontmatter but missing here; iter-2 documents explicitly)
  - scripts/wave-d-smoke.ts (selector swap for /financials/bills routes per iter-2 §2.3)
  - scripts/fixtures/smoke-seed.sql (orchestrator-driven credentials per iter-2 §2.1 + ON CONFLICT encrypted_password per iter-2 §2.2)
  - scripts/harness-auth-bootstrap.ts
- **Plan E-3 files_modified:** unchanged (src/app/financials/bills/[id]/page.tsx) — but iter-2 §3.1 patches the implementation to use `vendor_name_raw` fallback null-guard instead of `notFound()` on missing vendor embed; iter-2 §3.2 adds page header comment documenting the embed-shape divergence vs API route.

Rule 5 disjointness verified: E-1 has no src/ files; E-2 + E-3 disjoint at src/ level (E-2 touches nav-bar, job-sidebar, jobs/[id]/page; E-3 touches financials/bills/[id]/page).
