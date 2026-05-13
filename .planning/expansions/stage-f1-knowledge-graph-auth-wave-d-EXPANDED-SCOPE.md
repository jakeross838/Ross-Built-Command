# F1-Wave-D — Wave-C Corrective + Process Gap Closure — EXPANDED-SCOPE

**Status:** APPROVED 2026-05-13 per nwrp121.
**Phase name:** `stage-f1-knowledge-graph-auth-wave-d`
**Wave of:** F1 — Knowledge Graph + Auth Foundation (umbrella)
**Sibling waves:**
- F1-Wave-A (shipped 2026-05-12; cleanup + D-035 + schema-shape)
- F1-Wave-C (shipped 2026-05-13; `public.users` retirement) — **3 real bugs surfaced post-ship via manual smoke**
- F1-Wave-B (still REVOKED per nwrp120; gated on Wave-D + process gap closure)
**Source:**
- nwrp120 (smoke results + diagnosis request)
- nwrp121 (Wave-D authorization + Additions 1 + 2)
- Diagnosis report (Issues 1 + 2 + 3 root causes + process gap + Rules 1-4)

---

## Why Wave-D exists

Wave-C shipped with 1 real bug + surfaced 2 pre-existing bugs:
- **ISSUE 1 (real, Wave-C-caused):** PostgREST `profiles:user_id(...)` hint malformed — 9 sites affected (6 Wave-C + 3 pre-existing latent-broken)
- **ISSUE 2 (pre-existing):** Double AppShell wrapping on 6 `/financials/*` thin-wrapper routes — financials/layout.tsx (commit 96484db) + per-page AppShell stack
- **ISSUE 3 (pre-existing intentional):** `/invoices` 301-redirects to `/financials/bills` per stage-1.5c-IA D-01 — smoke packet was wrong

**Process gap:** Wave-C QA passed all 8 reviewers (5 plan-review iter-1 + 3 post-execute) without anyone actually exercising the refactored UI at runtime. Schema verification ≠ runtime verification. Wave-A had the same gap (got lucky).

## Wave-D scope (5 plans)

### Plan D-1: Issue 1 fix — PostgREST relationship resolution
- Migration: `ALTER TABLE org_members ADD CONSTRAINT org_members_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES profiles(id)` (data-safe: profiles.id === auth.users.id === org_members.user_id 1:1 invariant)
- Refactor 9 sites from broken `profiles:user_id(id, full_name)` to `profile:profiles(id, full_name)`:
  - **6 Wave-C-touched:** `invoices/page.tsx:204`, `invoices/queue/page.tsx:220`, `jobs/new/page.tsx:80`, `api/invoices/[id]/route.ts:113`, `api/jobs/[id]/overview/route.ts:77+117`
  - **3 pre-existing latent-broken:** `api/dashboard/route.ts:159`, `api/jobs/health/route.ts:113`, `settings/workflow/page.tsx:22`
- Plan-review iter-1 MUST cite FK constraint per Rule 2

### Plan D-2: Issue 2 fix — single AppShell across 6 financials/* surfaces
- Remove `<AppShell>` from 6 page files: `invoices/page.tsx`, `invoices/qa/page.tsx`, `invoices/queue/page.tsx`, `invoices/liens/page.tsx`, `invoices/payments/page.tsx`, `draws/page.tsx`
- `financials/layout.tsx` remains canonical wrapper per D-053 thin-wrapper principle
- **Blast radius confirmed:** Only 6 financials/* thin-wrappers re-export these files. No other importers. Safe.

### Plan D-3: Issue 3 — corrected smoke packet (no code change)
- Document artifact: corrected smoke URLs at `/financials/bills`, `/financials/bills/queue`, `/financials/bills/qa`, `/financials/lien-releases`, `/financials/payments`, `/financials/pay-apps`
- Wave-D PLAN.md notes this as "test packet correction, no implementation"

### Plan D-4: Codify Rules 1-4 + wave-d-smoke.ts Playwright script
- **CLAUDE.md Development Rules:** add Rules 1-4 per nwrp120 diagnosis + nwrp121 Addition 2
- **Plan-review checklist:** add Rule 2 FK citation BLOCKING requirement
- **ai-logic-tester prompt:** update per Rule 3 — must execute representative queries for PostgREST/RLS claims
- **`scripts/wave-d-smoke.ts`:** Playwright script per Addition 2
  - Hits 15 routes (9 Issue-1 + 6 Issue-2)
  - Per route: waits for page load, captures console errors, screenshot, checks primary UX populates (PM dropdown non-empty; activity feed shows names; no double NavBar)
  - Outputs pass/fail JSON
  - Runs against Vercel preview URL (env var)
  - ~2 hours work; seeds Wave 1.1-Full Layer 4 framework

### Plan D-5: D-078 decision entry in MASTER-PLAN.md (per Addition 1)
- New decision: user-identity FK convention
- Current state: split (45× `auth.users`, 3× `profiles` post-Wave-D)
- Rationale: profiles FKs enable PostgREST embedding for display-name joins; auth.users FKs preserved for ownership/audit/identity columns
- Going-forward convention: NEW user-identity FKs default to `auth.users` UNLESS the column is used in PostgREST embedding hints for display, in which case `profiles`. Document the column explicitly when choosing profiles.
- Deferred: full standardization (migrate all 45 to one target) is an F-phase or Wave 1.1-Full decision
- Cross-reference: this entry + Wave-D PLAN.md + migration 00097 (Wave-C originating split) + Wave-D migration (extends to org_members)

## Execution order (per nwrp121)

1. ✅ Author all 5 plans in parallel (gsd-planner agents)
2. Plan-review iter-1 (6 reviewers each; Rule 2 FK citation MUST be enforced on D-1)
3. **HALT** for Jake review of consolidated iter-1 findings BEFORE execute
4. Execute in dependency order:
   - **D-5 first** (decision exists before code references it)
   - **D-1 + D-2 parallel** (independent code/migration)
   - **D-4** (Rules + script)
   - **D-3** (test packet)
5. Apply migration via Supabase MCP
6. Run `scripts/wave-d-smoke.ts` against Vercel preview
7. `/nightwork-qa` post-execute
8. **HALT** for Jake review BEFORE `/gsd-ship`
9. Calibration-log entry append to Wave-C entry (Wave-D = the corrective Wave-C's calibration-log "Adjustment for next phase" pointed at)

## Wave-B gate (per nwrp121)

Wave-B remains REVOKED until ALL of:
- Wave-D shipped to main
- `wave-d-smoke.ts` passes against post-ship preview URL
- Rules 1-4 codified in CLAUDE.md
- D-078 entry committed to MASTER-PLAN.md
- `/nightwork-plan-review` prompt updated to enforce Rule 2 FK citation requirement
