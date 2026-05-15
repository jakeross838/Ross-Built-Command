# Expanded scope — stage-f1-knowledge-graph-auth-wave-b (Slice 1)

**Status:** APPROVED 2026-05-15 (per nwrp153 — Q1 + Q3 + Q6 + Q7 approved as-recommended; Q2 approved with dual-probe amendment; Q4 approved with preferred candidate swap to `client-pii-not-embedded`; Q5 amended to ENV-FLAGGED activation in this slice).
**Generated:** 2026-05-15
**Slice scope:** Wave-B-Slice-1 (3 plans: B-D080, B-1a, B-1b). Remaining Wave-B umbrella plans (B-2..B-7) DEFERRED per nwrp152.
**Phase name:** `stage-f1-knowledge-graph-auth-wave-b`
**Wave of:** F1 — Knowledge Graph + Auth Foundation (umbrella at `.planning/expansions/stage-f1-knowledge-graph-auth-EXPANDED-SCOPE.md`)
**Sibling waves (shipped):** A (2026-05-12), C (2026-05-13), D (2026-05-13), E (2026-05-14)
**Authorization:** nwrp152 dispatch
**Source decisions:** D-080 (codified MASTER-PLAN.md §10:256 — 2026-05-15), D-078 (parent FK convention), Q1/Q2 A1/Q9 D/Q10b/Q10c/Q11 D/Q12 (umbrella Q&A resolutions)

---

## Stated scope (Jake's words, verbatim — from nwrp152 dispatch)

> Wave-B-Slice-1 — 3 plans dispatched as a sliced subset of Wave-B umbrella (.planning/expansions/stage-f1-knowledge-graph-auth-EXPANDED-SCOPE.md):
>
> 1. Plan B-D080 — User-identity FK convention migration 00099
>    - Migration 00099_user_identity_fk_convention.sql per D-080 (MASTER-PLAN.md §10:256)
>    - 10 columns → auth.users(id) ON DELETE NO ACTION: change_orders.created_by, draws.created_by, draws.approved_by, invoices.created_by, invoices.duplicate_dismissed_by, jobs.created_by, lien_releases.created_by, parser_corrections.corrected_by, purchase_orders.created_by, vendors.created_by
>    - 1 column → profiles(id) ON DELETE NO ACTION: jobs.pm_id (mirrors invoices.assigned_pm_id Wave-C 00097 pattern)
>    - Pre-flight orphan probe per brief §6 — run at plan-author time + execute time; halt on count diff
>    - source_decisions: D-080 (primary), D-078 (parent convention)
>    - requires_smoke: false (DB-only; no UI surface)
>
> 2. Plan B-1a — Clients schema foundation
>    - New `clients` table with V.1 universal envelope (id, created_at, updated_at, created_by, org_id, deleted_at, status_history JSONB NOT NULL DEFAULT '[]')
>    - jobs.client_id FK to clients(id) ON DELETE SET NULL
>    - Backfill from existing jobs.client_name / client_email / client_phone embedded columns
>    - Drop embedded jobs.client_* columns after backfill verification
>    - status_history JSONB (Q12 uniform versioning)
>    - Direct-filter org_isolation RLS (Q10b ORG-scoped tenant table rule, NOT join-based)
>    - ≥1 fixture client row in fixture-harness-org (Q9 D)
>    - Pre-flight orphan probe on backfill (all jobs.client_name values map to a clients row)
>    - requires_smoke: false (schema-only)
>    - Plan-author note: D-080 migration 00099 lands BEFORE B-1a migration 00100 — clients.created_by needs auth.users FK per D-080 from creation
>
> 3. Plan B-1b — KG scaffold + types pipeline + harness extensions
>    - Per umbrella Q11 D hybrid: schema in DB, types auto-generated, validators in app
>    - Scaffold src/lib/knowledge-graph/ — README + index + validators/ + queries/
>    - Type pipeline: supabase gen types typescript --linked > src/lib/types/database.types.ts
>    - Pre-commit hook regenerating types on migration changes
>    - CLAUDE.md update with type-generation rule
>    - Refactor src/lib/types/invoice.ts to extend database.types.ts
>    - 3 exemplar WI validators per Amendment 1: WI-001 (inline budget context), WI-013 (multi-job allocation), 1 Clients-related (final selection at plan-author time)
>    - Validator interface: (input: T, ctx: ValidatorContext) => ValidatorResult per umbrella §Q11
>    - Foundational harness extensions in src/lib/verification/layer2/standards/:
>      - Audit conservation assertion
>      - RLS coverage assertion (Q9 + Q3 + Q10b)
>      - Role-permission integrity assertion
>      - Fixture coverage assertion (Q9 D)
>    - useCurrentRole onAuthStateChange listener activation (W.1 bridge cleanup from 1.5c-vh)
>    - HALT if plan-authoring surfaces >2.5 days work (fallback per umbrella to standalone Wave-B0 harness extension wave)
>    - requires_smoke: true (W.1 listener changes auth state behavior)
>
> OUT of slice scope (deferred):
> - Plans B-2 through B-7 (Owner Portal, deletion trigger, activity_log extension, magic-link primitive, cost-code reseed, RB seed + Stripe + EXPLAIN ANALYZE)
> - Three Wave-A iter-1 deferred cleanup items (search_path sweep, REVOKE EXECUTE, extension schema moves)
>
> Sequencing:
> 1. B-D080 first (migration 00099; D-080 convention applies to clients table at creation)
> 2. B-1a (migration 00100; clients schema + backfill)
> 3. B-1b (KG scaffold; requires B-1a applied for types generation)
>
> Parallel authoring OK; execute strictly sequential per migration numbering.

---

## 1. Mapped entities and workflows

### New entities introduced by this slice

| Entity / table | VISION wave | Current state | Notes |
|---|---|---|---|
| `clients` (new) | F1 (Wave 1 per ENTITY-INVENTORY) | MISSING (CURRENT-STATE §A.4 — embedded in `jobs.client_name/email/phone`) | V.1 universal envelope + `status_history` JSONB + `org_id` direct-filter RLS. Retention class `forever`. PII flagged (yes). Source-of-truth promotion per umbrella Q2 A1. |

### Existing entities touched

| Entity / column | VISION wave | Current state | Slice impact |
|---|---|---|---|
| `jobs.client_id` (new FK) | Wave 1 (existing) | MISSING (jobs use embedded `client_*` columns per CURRENT-STATE §A.2) | Plan B-1a adds FK `ON DELETE SET NULL` to `clients(id)`; backfills from existing embedded columns; drops embedded `client_name/email/phone` post-backfill verification. |
| `jobs.pm_id` (FK retarget) | Wave 1 (existing) | NO_FK (per D-080 brief §2 inventory) | Plan B-D080 adds FK to `profiles(id) ON DELETE NO ACTION` per D-080 row 7. Mirrors `invoices.assigned_pm_id` Wave-C 00097 precedent. |
| 10 audit columns (`created_by`/`approved_by`/`duplicate_dismissed_by`/`corrected_by`) | various Wave 1 | NO_FK (per D-080 brief §2 inventory) | Plan B-D080 adds FK to `auth.users(id) ON DELETE NO ACTION` per D-080 row 1-6 + 8-11. |
| `database.types.ts` (new) | — | MISSING | Plan B-1b runs `supabase gen types typescript --linked` to produce. |
| `src/lib/knowledge-graph/` (new scaffold) | F1 | MISSING | Plan B-1b creates per umbrella Q11 D hybrid pattern. |
| `src/lib/types/invoice.ts` (refactor) | — | EXISTS (hand-rolled) | Plan B-1b refactors to extend `database.types.ts`. |
| `src/lib/verification/layer2/standards/` | — | EXISTS (`conservation/` only — money-line-items-sum.ts + self-test-always-pass.ts) | Plan B-1b adds 4 foundational standards: audit-conservation, RLS coverage, role-permission integrity, fixture coverage. |
| `client.ts` `onAuthStateChange` listener | — | DORMANT (W.1 bridge env-gated per 1.5c-vh) | Plan B-1b activates; invalidates cached role lookups on auth state changes. |

### Workflows touched

| Workflow | Current state | Slice impact |
|---|---|---|
| `clients` lifecycle | N/A (entity new) | Plan B-1a creates `status_history` JSONB on `clients`; no workflow transitions yet (entity is data-only at slice ship; transitions come with B-2 Owner Portal use). |
| Audit-trail durability (CC7.2) | Existing per migration 00026 + D-078 | B-D080 ON DELETE NO ACTION on 10 audit FKs preserves audit-trail durability through user-deletion attempts. |
| PostgREST embedding hint for `jobs.pm_id` → profiles | Existing for `invoices.assigned_pm_id` | B-D080 + B-1a together enable `pm:profiles(id, full_name)` embed on jobs detail view (consistent with invoices). |
| TypeScript type ↔ schema sync | DRIFT-PRONE (hand-rolled types) | Plan B-1b's pre-commit hook + CI verify catches schema drift. |

---

## 2. Prerequisite gaps

What MUST exist before this slice can ship.

| # | Gap | Source | Blocking? |
|---|---|---|---|
| 1 | D-080 decision entry codified | MASTER-PLAN.md §10:256 (committed 2026-05-15) | RESOLVED |
| 2 | Wave-D shipped (PostgREST FK convention live; 9 sites refactored) | MASTER-PLAN.md §12 + Wave-D EXPANDED-SCOPE | RESOLVED |
| 3 | Wave-E shipped (smoke harness green; 12 logo-invariant failures resolved; TD-WE-03 baseline accepted) | Wave-E EXPANDED-SCOPE + nwrp152 prereq #12 | RESOLVED |
| 4 | Smoke harness ≤2 failures (TD-WE-03 set) — gate for slice plan-review iter-1 | nwrp152 prereq #12 | RESOLVED |
| 5 | Wave-C `public.users` retired (clean foundation entering Wave-B per umbrella §9 sequencing Option A) | Wave-C EXPANDED-SCOPE + migration 00097 | RESOLVED |
| 6 | Wave-A migrations applied (00094 D-035 cleanup; 00095 drop budgets; 00096 invoice_allocations org_id) | Wave-A EXPANDED-SCOPE | RESOLVED |
| 7 | Decision brief at `.planning/decisions-resolved/2026-05-15-user-identity-fk-convention-BRIEF.md` (the source for D-080) accessible | filesystem | RESOLVED |
| 8 | Synthetic seed at `scripts/fixtures/smoke-seed.sql` re-applied with random apply-time password (Wave-E Plan E-2) | Wave-E SHIP | RESOLVED |
| 9 | HARNESS_FIXTURE_PASSWORD env var present in CI + Vercel preview (Wave-B prereq #11 SATISFIED via Jake override per nwrp152) | nwrp152 prereq #11 | RESOLVED |
| 10 | `supabase gen types typescript --linked` CLI available + project linked | Supabase CLI environment | **VERIFY at B-1b plan-author time** — orchestrator confirms `supabase --version` returns valid version + `supabase status` shows linked project. Halt if unlinked. |
| 11 | `fixture-harness-org` UUID `00000000-0000-0000-0000-fb1ce0a55e55` exists with org_member row (per migration 00092 + 00093 corrective) | RESOLVED | Plan B-1a fixture row INSERT depends on org existing. |
| 12 | Pre-flight orphan probe SQL ownership: Claude Code authors at execute time with live schema access (per nwrp152 closing line) | nwrp152 | DESIGN CONTRACT (not a gap; documented) |
| 13 | `validate(input, [validators], ctx)` API route integration pattern is NEW — Plan B-1b establishes; no existing pattern to inherit | umbrella Q11 D | DESIGN CONTRACT |

**No blocking gaps remain.** All 12 prerequisites from nwrp152 satisfied; #10 and #11 are mechanical verifications at execute time.

---

## 3. Dependent-soon gaps

What's likely needed shortly after — design for it now.

| # | Gap | Likely next slice / wave | Design implication |
|---|---|---|---|
| 1 | `client_portal_access.client_id` FK | Wave-B-Slice-2 (B-2 Owner Portal Path A) | Plan B-1a's `clients` table FK constraint shape (`ON DELETE SET NULL`) must allow `client_portal_access` row preservation if a client is soft-deleted. Document the soft-delete cascade choice in B-1a migration comment. |
| 2 | Soft-delete DB-trigger safety net (Q6 F deletion safety net) | Wave-B-Slice-2 (B-3) | Plan B-1a's `clients` table inherits the trigger when B-3 ships. Plan B-1a must include `deleted_at TIMESTAMPTZ` (V.1 envelope) — already in scope. |
| 3 | `activity_log.entity_type` TS union extension for `clients` | Wave-B-Slice-2 (B-4) | Plan B-1b's KG validators MAY emit log events; if so, design for `clients` event type to land in B-4. Document validator log-emit posture in B-1b README. |
| 4 | WI-XXX bulk validator implementation (F2-F5 ramp) | F2..F5 | Plan B-1b's validator interface contract `(input: T, ctx: ValidatorContext) => ValidatorResult` is foundational. Lock the shape carefully — F2-F5 will write 35+ validators against this contract. Strong recommendation: ValidatorContext threads `{ org_id, supabase, membership, current_user_id }` per umbrella Q11. |
| 5 | F2 employees + role_definitions registry | F2 | `clients` table FK target choice (auth.users for `created_by`) is consistent with F2 patterns. No design constraint conflict. |
| 6 | Multi-viewport per F1+-4 Layer 3 | Wave-B-Slice-2 (B-7) or Wave-B0 fallback | Plan B-1b harness extensions ship foundational standards; multi-viewport is separate per nwrp152 OUT-of-slice. No conflict. |
| 7 | `jobs.pm_id` PostgREST embed adoption in UI | Wave 1.1-Lite polish | Plan B-D080's profiles FK on `jobs.pm_id` enables this; existing job views currently fetch PM via secondary query. Document refactor opportunity in B-D080 migration comment; do NOT refactor consumers in this slice (out of scope). |
| 8 | `draws.approved_by` PostgREST embed (deferred per D-080) | F6 Pay App engine | B-D080 carves out as auth.users-only; F6 may add parallel profiles FK if G702 signature block needs display embed. Document carve-out rationale in B-D080 migration comment so F6 author finds it. |

---

## 4. Cross-cutting checklist

| Concern | Status | Rationale |
|---|---|---|
| Audit logging | APPLIES | B-1b harness adds **audit-conservation assertion** (every mutation in tests counts activity_log delta). `clients` table CREATE/UPDATE/DELETE must write to activity_log — but no UI mutations ship in this slice, so activity_log writes are scaffold-only. B-1a migration's INSERT of fixture row should NOT write activity_log (seed bypasses normal flow per existing 00092/00093 precedent). |
| Permissions | APPLIES | `clients` table RLS uses direct-filter on `org_id` (Q10b ORG-scoped). No new role added. PMs cannot create clients in this slice (no UI); future Wave-B-Slice-2 (B-2) opens Owner Portal flows. |
| Optimistic locking | N/A | No write endpoints added in this slice (schema-only + scaffold). `clients` table needs `updated_at` (V.1 envelope) which exists. When B-2 adds Owner Portal mutations, `expected_updated_at` applies per R.10. |
| Soft-delete + status_history | APPLIES | Plan B-1a adds `deleted_at TIMESTAMPTZ` + `status_history JSONB NOT NULL DEFAULT '[]'` per V.1 + Q12 uniform. |
| Recalculate, don't increment | N/A | No derived totals introduced in this slice. |
| Multi-tenant RLS | APPLIES | Plan B-1a's `clients` RLS = 3-policy R.23 shape (proposals/00065 precedent) + direct-filter on `org_id` via `app_private.user_org_id()` wrapped in `(SELECT ...)` per Wave-C 00097 session-cache pattern. NOT join-based per Q10b ORG-scoped tenant table rule. |
| Idempotency | N/A | No write endpoints, webhooks, or imports added in this slice. V.2 import contract design deferred to F3 per umbrella. |
| Background jobs | N/A | Slice is schema + scaffold; no async work. |
| Rate limiting | N/A | No external-facing endpoints. |
| Observability | APPLIES (LIGHT) | B-1b's W.1 listener activation should not flood Sentry; verify Sentry tags `user_id`/`org_id` continue to populate post-listener (no regression). Migration 00099 + 00100 should run cleanly in production preview; capture Supabase Studio log output if errors. |
| Data import/export (V.2) | APPLIES (DESIGN-INTENT) | New `clients` entity should have a documented JSON export schema sketched in B-1a README comment even though F3 ships the framework. Per V.2 universal contract — every new entity has export/import shape from day one (one-pager in migration comment is sufficient; full V.2 framework F3). |
| Document provenance (V.3) | DEFER | `clients` may eventually originate from contract document extraction (Wave 4 contracts entity); add `document_extraction_id` FK at that time. NOT in slice scope. |
| Mobile-friendly | N/A | No UI surface in this slice. (B-2 Owner Portal Path A will need mobile review.) |
| Drummond fixtures sufficient | PARTIAL | Drummond has client_name "Drummond" (in `jobs.client_name`) but no normalized client record. Plan B-1a's backfill creates the canonical `clients` row from this embedded data. Fixture client in `fixture-harness-org` is separate (Q9 D contract). |
| CI test gate | APPLIES | Plan B-1b's type-generation pre-commit hook + CI verify catches schema drift. Plan B-1a's migration runs in Supabase MCP execute path; verification via `supabase status` post-apply. |
| Error handling for partial failures | APPLIES | Plan B-1a's backfill must be atomic — if any `jobs.client_name` value fails to map to a clients row, transaction rolls back. Pre-flight orphan probe surfaces ambiguous cases BEFORE migration apply. |
| Graceful degradation | N/A | No external dependencies (Resend, Anthropic, Stripe) touched in slice. |
| Wave-B prereq #12 smoke gate maintenance | APPLIES (INHERITED) | Plan-review iter-1 verifies smoke harness still passes ≤2 failures matching TD-WE-03 set (per nwrp152). If smoke regresses post-slice changes, BLOCK. B-1b's W.1 listener activation is the most likely regression source — explicit smoke run mandatory post-B-1b execute. |
| Downstream-consumer-sweep (`.planning/lessons.md` 2026-05-15) | APPLIES (INHERITED) | All 3 plans MUST include downstream-consumer-sweep in pre-flight verification even if scoped "schema-only." Specifically: B-D080 sweeps for code reading `jobs.pm_id` (verify FK retarget doesn't break secondary queries); B-1a sweeps for code reading `jobs.client_name`/`client_email`/`client_phone` (every consumer must read from `clients` table via FK after column drop); B-1b sweeps for code importing `src/lib/types/invoice.ts` (verify refactor preserves type shape). Plan-review iter-1 BLOCKS without sweep results. |
| Rules 1-6 (Workflow posture) | APPLIES | Rule 1 (schema verification != runtime verification) — B-1b requires_smoke:true is the runtime gate. Rule 2 (PostgREST FK citation) — B-D080 must cite `jobs_pm_id_profiles_fkey` constraint name. Rule 3 (ai-logic-tester executes representative queries) — applies to all plan-review iter-1. Rule 4 (Playwright smoke pre-QA) — B-1b. Rule 5 (files_modified intersection check) — slice plans authored in parallel; intersection check mandatory. Rule 6 (pre-flight collision checks) — all 3 plans; hook regex sweep + fixture collision check + path reachability check. |
| Plan-review iter-1 cross-reviewer factual disagreement HALT (nwrp118) | APPLIES | Any factual disagreement between reviewers (e.g., RLS policies, migration history, schema shape) HALTS for Jake. Resolution via source verification (migration files, pg_policies), not majority-rule. |

---

## 5. Construction-domain checklist

| Domain consideration | Applies? | Rationale |
|---|---|---|
| Drummond as reference job | YES | Drummond is RB's reference job. Plan B-1a's backfill processes Drummond's `jobs.client_name='Drummond'` (or similar) into a canonical `clients` row. Verify post-backfill that Drummond's UI surfaces render the same client name. |
| Field mistakes become permanent QC entries | N/A | Slice does not touch daily-log / punchlist workflows (Wave 2). |
| Draw requests link to punchlist | N/A | Wave 2 reconciliation; not in slice. |
| Invoice review is gold standard UI | N/A | No new UI surface in slice. Client-detail UI deferred to Wave 1.1-Lite. |
| Stone blue palette + Slate type + logo top-right | N/A | No UI surface. |
| Stored aggregates require rationale comments | N/A | No new aggregates. |
| Cost-plus open-book | YES (FUTURE-FACING) | `clients` table is the canonical record for who the homeowner is. Owner Portal Path A (B-2 Slice-2) will surface costs to this client. Plan B-1a's design must support: one client → multiple jobs (e.g., Drummond owns multiple lots over time). FK is on `jobs.client_id` (1:N client → jobs); verify shape supports. |
| Florida-specific | YES (FUTURE-FACING) | `clients` table will eventually carry FL-specific fields (homestead exemption status, FL contractor license linkage for vendor relationships). NOT in slice; design `clients` to allow additive columns (V.1 envelope + extensible JSONB if needed for org-configurable client metadata). Recommendation: NO JSONB metadata column in slice; add column-by-column when need surfaces. |
| GC fee semantics | N/A | Not touched in slice. |
| Lien waivers / FL release types | N/A | Wave-B-Slice-2 (B-2) Owner Portal may surface lien-release status to client; not in slice. |
| Retainage | N/A | Not in slice. |
| Multi-currency | N/A | FL-only. |
| Owner notification cadence | N/A | B-2 Slice-2 Owner Portal scope. |
| Compliance retention | YES | `clients` retention class = `forever` per ENTITY-INVENTORY (audit trail). V.1 envelope's `deleted_at` enables soft-delete; the 7-year financial retention rule (per VISION §6.4) applies once Owner Portal Path A ships — client records cannot be hard-deleted while linked jobs have invoices. Document in B-1a migration comment. |

---

## 6. Targeted questions for Jake

1. **B-1a `clients.email` + `clients.phone` PII fence posture** — D-078's PII fence applies to `profiles` (customer/employee email/phone). D-079 narrows fence scope to NOT include vendors (B2B). **Question:** Does the PII fence apply to `clients.email` + `clients.phone` (homeowner contact)? **Recommended: YES — apply fence.** Rationale: homeowners are customers, identical PII class to `profiles.email`/`phone`. Plan-review iter-1 grep gate (per Plan D-4 Rule 2 codification) blocks `client:clients(*)` and any embedding referencing `clients.email`/`clients.phone`. Document in B-1a migration comment with cross-ref to D-078 + D-079.

2. **B-1a — drop embedded `jobs.client_*` columns NOW or DEFER post-Slice-2?** Plan B-1a's stated scope drops embedded columns post-backfill verification. Alternative: leave embedded as denormalized cache, drop in Slice-2 after Owner Portal proves clients table sufficient. **DECISION (nwrp153): DROP NOW with safety addition.** Backfill verification MUST run TWO probes INSIDE the atomic transaction before `DROP COLUMN`: (a) **Forward probe** — every non-NULL `jobs.client_name` has a corresponding `clients` row post-backfill (existing recommendation); (b) **Reverse probe** — `SELECT COUNT(*) FROM jobs WHERE client_id IS NULL AND (client_name IS NOT NULL OR client_email IS NOT NULL OR client_phone IS NOT NULL)` MUST return `0`. If reverse probe `> 0`: HALT before `DROP COLUMN`, ROLLBACK the transaction, surface to plan-author. Rationale: deferral creates dual-write maintenance burden + risk of drift between sources; the dual-probe pattern catches asymmetric backfill failures (e.g., a job row with `client_email` set but null `client_name` — the forward probe alone wouldn't catch it) that would orphan data on column drop. Backfill is atomic (single transaction); no partial state risk on successful commit; halt-on-probe-failure path is explicit rollback.

3. **B-1b validator interface ergonomics** — Validator signature is `(input: T, ctx: ValidatorContext) => ValidatorResult`. **Question:** Should validators be sync (return ValidatorResult) or async (return Promise<ValidatorResult>)? **Recommended: ASYNC.** Rationale: future validators may need DB lookups via `ctx.supabase` (e.g., WI-013 multi-job allocation must query `invoice_allocations` table); sync limits to in-memory checks only. Cost: every caller awaits; small ergonomic burden, large flexibility win. F2-F5 will write 35+ validators against this interface — lock now.

4. **B-1b — 3rd exemplar (Clients-related) validator selection** — nwrp152 says "1 Clients-related (final selection at plan-author time)." **DECISION (nwrp153): defer to plan-author with PREFERRED candidate = (b) `client-pii-not-embedded`.** Plan-author MAY choose differently with documented rationale, but the recommendation is to ship (b) over (a). Three candidates remain: (a) `client-active-when-job-active` — any non-deleted job must reference a non-deleted client; (b) `client-pii-not-embedded` — PostgREST embedding hint sanity check (e.g., scans for `client:clients(*)` or `client:clients(...email...)` patterns in routes/lib); (c) `client-deletion-blocked-when-jobs-linked` — R.6 codification for clients. **Rationale for preferring (b):** the 3-validator set (WI-001 inline budget context + WI-013 multi-job allocation + `client-pii-not-embedded`) gives THREE structurally distinct validator patterns — cross-entity logic (WI-001) / multi-row query (WI-013) / schema-shape policy (b). Choosing (a) would yield 2 FK-existence variants (WI-001 already exercises FK existence) with no structural distinction. Additionally, (b) exercises the PII fence pattern (Q1's architectural commitment), tightening the link between schema decision and runtime enforcement.

5. **B-1b — `useCurrentRole onAuthStateChange` listener activation impact on production sessions** — W.1 bridge pre-positioned env-gated `setSession` in `client.ts` since 1.5c-vh. Activating the listener in B-1b changes auth state behavior in production. **DECISION (nwrp153): ENV-FLAGGED activation in this slice, NOT unflagged.** The 6-week dormancy + multi-surface auth state propagation argues for contained blast radius even if the listener is "purely additive cache invalidation" in theory. Cost is 2 lines of env-gate code (`process.env.NEXT_PUBLIC_AUTH_STATE_LISTENER === 'true'`) vs production regression risk. Unflag in Wave-B-Slice-2 OR a standalone follow-up phase after an observation window (default observation: 1-2 weeks of post-Slice-1 ship + smoke harness telemetry green + Sentry error rate flat). Plan B-1b ships both the listener wiring AND the env-flag pre-flight check; activation in production requires explicit env-var addition (Vercel Production + Preview env). Document the unflag path in the B-1b migration body + a Wave-B-Slice-2 candidate TD entry.

6. **B-D080 — `jobs.pm_id` profiles FK — refactor consumers in slice OR defer?** Adding the FK enables `pm:profiles(id, full_name)` PostgREST embed. Current code uses secondary queries. **Question:** Refactor consumers in slice OR defer to Wave 1.1-Lite polish? **Recommended: DEFER.** Rationale: slice scope is schema + scaffold + foundational; consumer refactor is polish work + needs UI verification + UX QA review. Document in B-D080 migration comment as "refactor opportunity unlocked"; cross-ref to Wave 1.1-Lite TD entry.

7. **B-1a fixture client name choice** — Q9 D contract requires >=1 fixture client row in `fixture-harness-org`. **Question:** Use a Caldwell-shaped sanitized name (existing fixture convention from 1.5b) OR an obviously-synthetic name like "Harness Fixture Client Alpha"? **Recommended: OBVIOUSLY-SYNTHETIC** (e.g., "Harness Fixture Client Alpha"). Rationale: Drummond is the reference-job-data convention; fixtures should be clearly distinct from Drummond/production names to prevent accidental confusion. Caldwell-shape was a 1.5b convention for prototype gallery only.

---

## 7. Recommended scope expansion

**Stated:** "Wave-B-Slice-1 — 3 plans dispatched as a sliced subset of Wave-B umbrella ... 1. Plan B-D080 — User-identity FK convention migration 00099 ... 2. Plan B-1a — Clients schema foundation ... 3. Plan B-1b — KG scaffold + types pipeline + harness extensions"

**Recommended phase scope (matches stated, with explicit additions captured below):**

1. **B-D080: Migration 00099 — 11 FK constraints per D-080 matrix** — 10 → `auth.users(id) ON DELETE NO ACTION`; 1 (`jobs.pm_id`) → `profiles(id) ON DELETE NO ACTION`. Pre-flight orphan probe at plan-author + execute time. Migration body cites D-080 (codification) + D-078 (parent convention). Plan-author runs `supabase mcp execute_sql` for orphan counts; halts if >0 without authorized NULL-out path per brief §6.

2. **B-1a: Migration 00100 — clients schema + backfill + jobs.client_id FK + drop embedded columns** — V.1 envelope + `status_history JSONB NOT NULL DEFAULT '[]'` + direct-filter org-isolation RLS (3-policy R.23 shape) + >=1 fixture client row in fixture-harness-org (per Q9 D) + backfill atomic transaction + orphan probe + post-backfill column drop. Plan-author cites D-080 (because `clients.created_by` FK from creation) + Q2 A1 (normalize) + Q9 D (fixture) + Q10b (ORG-scoped direct-filter RLS) + Q12 (status_history).

3. **B-1b: KG scaffold + types pipeline + foundational harness extensions + W.1 listener activation** — `src/lib/knowledge-graph/` scaffold (README + index + validators/ + queries/) + `supabase gen types typescript --linked` pipeline + pre-commit hook + CLAUDE.md type-generation rule + refactor `src/lib/types/invoice.ts` to extend generated types + 3 exemplar WI validators (WI-001, WI-013, 1 Clients-related TBD at plan-author time) + 4 foundational Layer 2 standards (audit-conservation, RLS coverage, role-permission integrity, fixture coverage) + W.1 listener activation. Plan-author cites Q11 D (hybrid) + Q9 (fixture) + Q3 + Q10b (RLS coverage refinement) + umbrella §8 (harness extensions) + W.1 (1.5c-vh carry-forward).

**Cross-slice additions (slice augments stated scope with):**

- Pre-flight downstream-consumer-sweep MANDATORY in all 3 plans per `.planning/lessons.md` 2026-05-15 entry (sweep includes: smoke harness route table, dead-code paths, documentation references, agent prompt references).
- B-1a migration comment: V.2 export schema sketched (one-pager) for `clients` entity; full V.2 framework deferred to F3.
- B-1a migration comment: PII fence application to `clients.email`/`phone` per Q1 — **APPROVED nwrp153**; plan-review iter-1 grep gate blocks `client:clients(*)` and any embedding referencing `clients.email`/`clients.phone`.
- B-1a backfill safety: forward probe + reverse probe inside atomic transaction per Q2 amendment (nwrp153); HALT + ROLLBACK before `DROP COLUMN` if reverse probe `> 0`.
- B-D080 migration comment: `jobs.pm_id` PostgREST embed refactor opportunity documented for Wave 1.1-Lite (NOT done in slice).
- B-D080 migration comment: `draws.approved_by` auth.users-only carve-out rationale documented for F6 author (per D-080 §4 deferred decision).
- B-1b validator interface contract: async (Promise<ValidatorResult>) per Q3 — **APPROVED nwrp153** with uniform signature (no sync overloads).
- B-1b 3rd exemplar validator: preferred candidate = `client-pii-not-embedded` per Q4 amendment (nwrp153); plan-author may choose differently with documented rationale.
- B-1b listener activation: ENV-FLAGGED per Q5 amendment (nwrp153); production activation requires explicit env-var add (Vercel Production + Preview); unflag path documented as Wave-B-Slice-2 candidate TD.
- B-1a fixture client naming: OBVIOUSLY-SYNTHETIC pattern per Q7 (e.g., "Harness Fixture Client Alpha"); transparently identifiable as fixture-harness-org data.

**Out of scope (deferred):**

- Plans B-2 through B-7 (Owner Portal Path A, deletion safety net trigger, activity_log entity_type extension, magic-link primitive, cost-code reseed, RB seed + Stripe + EXPLAIN ANALYZE) — deferred per nwrp152 to Wave-B-Slice-2+.
- Three Wave-A iter-1 deferred cleanup items (function `search_path` sweep, REVOKE EXECUTE on pricing_history + auto-seed functions, move `pg_trgm`/`vector` extensions out of public schema) — deferred per nwrp152.
- Bulk WI validator implementation beyond 3 exemplars — F2-F5 ramp.
- Multi-viewport harness extension (F1+-4 AC-1-12 Layer 3) — Wave-B-Slice-2 (B-7) or Wave-B0 fallback.
- Consumer refactor for `jobs.pm_id` PostgREST embed adoption — Wave 1.1-Lite polish.
- Full Owner Portal feature set — Wave 1.1-Lite or later per umbrella Q4b scope narrowing.

**Acceptance criteria target (preview — final criteria locked in /gsd-discuss-phase):**

- [ ] Migration 00099 applied; pre-flight orphan probe at plan-author time AND at execute time both return matching counts (0 orphans expected on Drummond + fixture-harness-org); 11 FK constraints exist per D-080 matrix; verified via `information_schema.table_constraints` query post-apply
- [ ] Migration 00100 applied; `clients` table exists with V.1 envelope + status_history JSONB + RLS enabled (3-policy direct-filter on org_id); `jobs.client_id` FK exists; `jobs.client_name`/`client_email`/`client_phone` columns DROPPED post-backfill verification
- [ ] Backfill complete: every non-NULL pre-migration `jobs.client_name` maps to a row in `clients`; orphan count == 0
- [ ] >=1 fixture client row in `fixture-harness-org` (Q9 D contract); Layer 2 fixture-coverage assertion passes
- [ ] `database.types.ts` generated and committed; `supabase gen types typescript --linked` returns clean output; pre-commit hook regenerates on migration change
- [ ] `src/lib/types/invoice.ts` refactored to extend `database.types.ts`; `npm run build` passes
- [ ] `src/lib/knowledge-graph/` scaffold exists with README + index + validators/ + queries/; 3 exemplar validators ship (WI-001 + WI-013 + 1 Clients-related); each validator has a unit test demonstrating the `(input, ctx) => ValidatorResult` contract
- [ ] 4 foundational Layer 2 standards added to `src/lib/verification/layer2/standards/`: audit-conservation, RLS coverage, role-permission integrity, fixture coverage; each has a self-test exercising the assertion against the existing fixture-harness-org dataset
- [ ] `useCurrentRole onAuthStateChange` listener activated in production via merge to main; Sentry verifies no auth-state-change error rate increase
- [ ] Smoke harness post-slice run shows <=2 failures matching TD-WE-03 baseline (Wave-B prereq #12 maintained)
- [ ] All 3 plans cite source_decisions in frontmatter per nwrp152 (B-D080: D-080 + D-078; B-1a: Q2 A1 + Q9 D + Q10b + Q12; B-1b: Q11 D + Q9 + harness Layer 2 contract)
- [ ] Plan-review iter-1 passes on all 3 plans without cross-reviewer factual disagreement (per nwrp118 HALT gate)
- [ ] CLAUDE.md updated with type-generation rule per B-1b deliverable

---

## 8. Risks and assumptions

| Risk | Mitigation |
|---|---|
| Pre-flight orphan probe surfaces >0 orphans on production `parser_corrections.corrected_by` (NOT NULL column without FK — could hold arbitrary UUID values) | Plan B-D080 author runs probe at plan-author time. If >0 orphans on any column: surface to Jake, decide per-column NULL-out vs block. `parser_corrections` is NOT NULL — orphan rows cannot be NULL-ed; require backfill from auth.users or delete row (audit-aware). Document decision in plan body. |
| `jobs.client_name` backfill ambiguity — multiple jobs with same client_name but distinct client_email (= different Smith households) | Plan B-1a's backfill uniqueness key choice surfaced at plan-author time. Recommended: `(org_id, lower(trim(client_name)), lower(trim(client_email)))` composite uniqueness — if all 3 match, treat as same client; if name matches but email differs, create distinct clients. Document at plan-author. Pre-flight probe counts distinct clients per uniqueness key. |
| `supabase gen types typescript --linked` not idempotent — re-running may produce slightly different output (column order, etc.) | Plan B-1b pre-commit hook regenerates on migration change; CI verifies generated file is committed (`git diff --exit-code database.types.ts`). Output drift caught at commit time. |
| W.1 listener activation causes auth-state thrashing in unrelated existing code paths | Plan B-1b smoke run (requires_smoke:true) validates 9 critical routes post-activation. Sentry alerts on auth-state-change error rate spike. Rollback path: revert single B-1b commit. |
| Validator interface contract too rigid (sync) OR too flexible (any-shape JSONB) — F2-F5 finds it inadequate | §6 Q3 recommendation: async validators with explicit ValidatorContext shape. Plan B-1b README documents contract + 3 exemplars + F2-F5 expansion path. Refactor if F2-F5 needs ergonomic adjustment (low cost early — only 3 validators exist at slice ship). |
| Slice plans B-D080 + B-1a + B-1b have files_modified intersection that Rule 5 mechanical check catches | Plans authored in parallel per nwrp152; mechanical intersection check at plan-review iter-1 (files_modified grep). B-D080 = migration only; B-1a = migration only + minor fixture seed; B-1b = scaffold + types pipeline + harness extensions + W.1 listener (no migration). Intersection check likely empty (each plan touches distinct file sets). If non-empty, force sequential dispatch or worktree isolation. |
| Pre-flight downstream-consumer-sweep finds undocumented `jobs.client_*` consumer that breaks at column drop | Sweep is mechanical (grep all `.ts`/`.tsx` for `client_name`/`client_email`/`client_phone`). Per Wave-C precedent (D-1 PostgREST hint fix), expect 5-15 consumer files. Each consumer either updated in B-1a OR documented as TD entry with rollback path. Plan-review iter-1 BLOCKS without sweep results. |
| B-1b plan-authoring surfaces >2.5 days work (per nwrp152 fallback condition) | Plan-author HALTS at plan-author time. Fallback to standalone Wave-B0 harness extension wave per umbrella §9. Jake authorizes resumption of B-1b (now harness-extensions-stripped) vs Wave-B0 dispatch. |
| HARNESS_FIXTURE_PASSWORD env var not present in CI when B-1b smoke runs | Verify at execute-time start: smoke run script asserts env var exists; halts with clear error message if missing. Per nwrp152 prereq #11 — Jake override puts this on Wave-B authorization path; deferred until triggering event. |
| D-080 migration cites `jobs.pm_id → profiles(id)` but Wave-D 00098 added `org_members.user_id → profiles(id)` — both columns reference profiles but for different purposes (PM-assignment vs membership-identity); reviewer confusion possible | Plan B-D080 migration comment distinguishes explicitly: `jobs.pm_id` is the canonical PM-assignment column (mirrors `invoices.assigned_pm_id`); `org_members.user_id` is membership-identity (dual-FK retroactive per Wave-D). Cross-reference both in comment. |
| `clients` retention class `forever` but `fixture-harness-org` may need periodic cleanup | Per Wave-E precedent — fixture-harness-org rows are managed by migration apply / down sequence, not by user-facing delete flows. Document `clients` fixture row creation in B-1a migration; down migration removes it. |

**Assumptions:**

1. nwrp152 prereqs #1-12 are accurately satisfied as stated. No regression since prereq verification.
2. D-080 entry at MASTER-PLAN.md §10:256 is the canonical source for B-D080 plan-author; no further FK matrix changes pending.
3. Plan-author has Supabase CLI access + linked project + can run `supabase mcp execute_sql` for orphan probes.
4. Pre-Wave-B-Slice-1 commits (TD-WE-04 selector swap, TD-WE-05 deferred-state comments) are merged; smoke baseline reflects this.
5. The 9 prereq-clean smoke accounts (smoke-*@nightwork.local) seeded post-Wave-E are present in production Supabase with apply-time random passwords.

---

## 9. Hand-off

After Jake approves this expansion (or amends it):

1. **GATE 1 (per nwrp152):** Plan authoring + plan-review iter-1. Plans authored in parallel per nwrp152 (B-D080, B-1a, B-1b). Plan-review iter-1 runs with explicit Rule 1-6 enforcement, including:
   - Rule 2 FK citation requirement on B-D080 (cites `jobs_pm_id_profiles_fkey` + 10 auth.users constraint names)
   - Rule 3 ai-logic-tester runs orphan probe representative queries pre-execute
   - Rule 5 files_modified intersection check across all 3 plans (mechanical grep)
   - Rule 6 (a) hook regex sweep + (b) fixture collision check + (c) deliverable path reachability + (d) intersection check
   - Downstream-consumer-sweep results attached
   - **HALT for Jake review of consolidated iter-1 findings BEFORE execute.**

2. After Jake authorizes execute:
   - **B-D080 executes FIRST** (migration 00099; D-080 convention applies to clients table at creation per nwrp152 sequencing)
   - **B-1a executes SECOND** (migration 00100; depends on B-D080 for `clients.created_by` auth.users FK)
   - **B-1b executes THIRD** (KG scaffold; depends on B-1a for types generation including new `clients` table)
   - Parallel authoring OK; execute strictly sequential per migration numbering

3. **GATE 2 (per nwrp152):** After B-1b ships post-execute. **HALT for Jake re: validator structure** review. Jake authorizes onward Slice-2 dispatch OR amendments to validator interface contract.

4. `/nightwork-qa` post-execute per slice ship. Plan-review iter-1 cross-reviewer factual disagreement HALT (nwrp118) applies throughout.

5. Calibration-log entry append at slice ship completion (post-GATE 2 authorization).

6. Cost ceiling: $50 (matches nwrp145 budget per nwrp152).

7. Subsequent slice authorization at Jake's call — Slice-2 = B-2 Owner Portal Path A + B-3 deletion trigger + B-4 activity_log extension is the natural next slice per umbrella §9 plan dependency graph; Slice-3 = B-5 magic-link + B-6 cost-code reseed + B-7 RB seed completes Wave-B.

---

**End of expansion.** Awaiting Jake review at GATE 1 (after plan-review iter-1).
