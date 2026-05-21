# Phase stage-f1-knowledge-graph-auth-wave-b-slice-2 — B-2a Discussion Log (Assumptions Mode)

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `B-2a-CONTEXT.md` — this log preserves the analysis.

**Date:** 2026-05-21
**Phase:** stage-f1-knowledge-graph-auth-wave-b-slice-2
**Plan:** B-2a (Token-issuance security model — HIGH threat)
**Mode:** assumptions (--auto)
**Driver:** nwrp202 (chain nwrp200 → nwrp201 → nwrp202)
**Calibration tier:** standard (USER-PROFILE.md missing → default)
**Areas analyzed:** Same-org FK invariant approach, RPC NULL-leak fix approach, Migration boundary, Codebase reality inventory

---

## Assumptions Presented

### Area 1: Same-org FK invariant approach (plan-author CHOICE — iter-1 SYNTHESIS B-2)

| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| Composite FK route: add `UNIQUE (org_id, id)` to `public.clients`, then declare `client_portal_access` FK as `FOREIGN KEY (org_id, client_id) REFERENCES public.clients(org_id, id) ON DELETE SET NULL`. Reject CHECK-trigger alternative. | Likely | `supabase/migrations/00100_clients_schema_foundation.sql:216` (clients.id PK), 4 composite UNIQUE precedents (00016:104, 00019:17, 00038:41, 00083:30), ZERO precedent for CHECK-trigger same-org enforcement (grep across migrations 00001..00103 for `cross.org.*invariant` + `BEFORE INSERT.*org_id` returned no matches) |

**Alternative considered:** Explicit `BEFORE INSERT OR UPDATE` trigger validating `NEW.org_id = (SELECT org_id FROM clients WHERE id = NEW.client_id)`. **Rejected** — no precedent in migrations 00001..00103; trigger-based enforcement adds per-write function-call overhead + new SECURITY DEFINER row in search_path hardening matrix from 00102_wa_iter1_security_cleanup.sql:42-75.

### Area 2: `create_client_portal_invite` RPC NULL-leak fix (plan-author CHOICE — iter-1 SYNTHESIS B-4)

| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| Option (b) `CREATE OR REPLACE` the RPC to derive `client_id` from `jobs.client_id` inside the function body. Reject (a) BEFORE INSERT trigger and (c) resolve-route guard. | Confident | Existing RPC at `supabase/migrations/00074_client_portal.sql:390-439` is single canonical write path into `client_portal_access`. `CREATE OR REPLACE FUNCTION` precedents at 00074:112, 390, 448, 501 + 00102:51-75. RPC already has caller-authorization (00074:409-421) + SET search_path discipline (00074:400). Single caller via 1.5c admin surface; no other consumers (grep src/ for `create_client_portal_invite`). ~5 lines of additional code. |

**Alternatives considered:**
- **(a) BEFORE INSERT trigger** — Rejected: duplicates lookup logic on every INSERT including future direct service-role paths; new SECURITY DEFINER footprint to harden; no precedent.
- **(c) Resolve-route guard** — Rejected: application-layer convention; violates CLAUDE.md "BY CONSTRUCTION" architectural posture.

### Area 3: Migration boundary (plan-author CHOICE — nwrp202 §7)

| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| Single migration 00104 containing: clients UNIQUE, FK + backfill + partial unique index, create_client_portal_invite CREATE OR REPLACE, activity_log.actor_token_id column, rate-limit counter table + TTL cleanup, revocation column verification. Reject splitting rate-limit into companion 00105. | Likely | Codebase precedent for cohesive atomic migrations strong: 00074 = 575 lines bundling 2 tables + 3 RPCs + indexes + RLS; 00026 bundles 5+ tables. 00100/00101 split was for B-1a-bis consumer refactor BETWEEN them (analogous situation does NOT exist here). Atomic rollback contract: B-2a is GATE for B-2b — if any piece fails verification, entire migration ROLLBACKs cleanly. |

**Alternative considered:** Split into 00104 (security model + FK + RPC) + 00105 (rate-limit table). Rationale: if rate-limit work explodes mid-execute past $50 halt gate (Rule 7d trigger), splitting migrations allows splitting plans without entangling rollback. **Counter-argument considered:** nwrp202 already locked rate-limit IN scope; pre-deciding for a halt-gate trigger that may not fire is scope-engineering anti-pattern (Rule 7e). Net: single migration unless halt fires.

### Area 4: Codebase reality B-2a relies on (existing infrastructure inventory)

| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| `src/lib/owner-portal/` directory does NOT exist; B-2a creates it. `src/app/api/owner-portal/` does NOT exist; B-2a creates it. Existing `src/app/owner-portal/page.tsx` (Caldwell fixtures) is the only owner-facing artifact and gets superseded by B-2b's `/owner/{token}` (B-2a doesn't touch it). `src/lib/activity-log.ts` does NOT yet have `actor_token_id` support — adding it is B-2a scope (column + types) but LOG WRITES are B-2b scope. No rate-limit precedent in `src/`. | Confident | 4 Glob queries returned "No files found": `src/lib/owner-portal/**/*`, `src/app/api/owner-portal/**/*`, `src/app/owner/**/*` + 1 reverse confirm `src/app/owner-portal/**/*` only returns the 2 known thin wrappers. `src/lib/activity-log.ts:56-63` LogActivityArgs interface inspected directly — `org_id / user_id / entity_type / entity_id / action / details` only; no `actor_token_id` field. Grep for `rate.?limit\|rateLimit\|RateLimit` returned 11 files all containing the term in non-rate-limiting contexts (verification harness, Claude API client throttle docs). |

---

## Corrections Made

None — `--auto` mode + all 4 assumptions Confident/Likely. Per workflow:

> If all assumptions are Confident or Likely: log assumptions, skip to write_context.
> Log: `[auto] All assumptions Confident/Likely — proceeding to context capture.`

[auto] All 4 assumptions confirmed without correction. Confidence breakdown: 2 Likely (Area 1 FK, Area 3 migration boundary) + 2 Confident (Area 2 RPC fix, Area 4 codebase reality).

---

## Auto-Resolved

Not applicable — no Unclear assumptions surfaced.

---

## External Research

**Not performed in this dispatch.** Per workflow `external_research` step: would normally spawn general-purpose research agent for `needs_research` topics. In this case, the 2 flagged topics are forward-looking plan-author iter-1 research (NOT blocking discuss-phase):

1. **DB-backed rate-limit counter table shape** — no Nightwork precedent; consult Postgres ecosystem patterns (`INSERT ... ON CONFLICT` + window/cleanup strategy). Decision points: composite `(key TEXT, window_start TIMESTAMPTZ)` primary key vs `(key_hash BYTEA)`; TTL cleanup via `pg_cron` vs lazy `DELETE WHERE window_start < now() - interval '1 hour'`. This is the rate-limit ballooning risk flagged in nwrp200 → potential `B-2a-rate-limit` micro-plan split per Rule 7d.

2. **Composite FK index ANALYZE behavior** — Postgres planner behavior with redundant UNIQUE INDEX on `clients(org_id, id)` (composite FK requires it) alongside existing `clients_pkey` (UNIQUE on `id` alone). Verify-on-apply via `EXPLAIN`; NOT a blocker.

Both items captured in CONTEXT.md `<deferred>` section as plan-author iter-1 research items.

---

## Locked Decisions (NOT analyzed as assumptions — these are constraints)

The following were locked by EXPANDED-SCOPE.md + nwrp200/201/202 chain BEFORE this dispatch and flow directly into CONTEXT.md `<decisions>` without confirmation:

- Token expiration: 1-year (supersedes 00074 90-day) + MANDATORY admin revocation
- Rate-limit: DB-backed counter table with TTL cleanup (NOT Vercel KV, NOT Upstash)
- Index posture: full covering index + app-layer revoked_at filter (NOT partial WHERE revoked_at IS NULL); NO Jake-acceptance escape
- B-4 leak-fix AC: 3 falsifiable verification queries
- PATTERNS.md "Owner Status View": NOT NEEDED (iter-1 SYNTHESIS B-17 RESOLVED)
- TD-B1abis-03 ClientCombobox polish: lands in B-2b (NOT B-2a)
- actor_token_id audit integration WRITES: lands in B-2b (NOT B-2a)

---

## Files Read During Analysis

- `.planning/expansions/stage-f1-knowledge-graph-auth-wave-b-slice-2-EXPANDED-SCOPE.md`
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2-PLAN.md`
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/PLAN-REVIEW-ITER1-SYNTHESIS.md`
- `.planning/architecture/ARCHITECTURE.md` §8
- `CLAUDE.md` (Architecture posture + Workflow posture Rules 1-9)
- `supabase/migrations/00074_client_portal.sql`
- `supabase/migrations/00100_clients_schema_foundation.sql`
- `supabase/migrations/00101_drop_jobs_client_columns.sql`
- `supabase/migrations/00102_wa_iter1_security_cleanup.sql`
- `supabase/migrations/00026_phase5_scaffolding_tables.sql` (activity_log shape)
- `supabase/migrations/00016*`, `00019*`, `00038*`, `00083*` (composite UNIQUE precedents)
- `src/lib/activity-log.ts`
- `src/middleware.ts`
- `src/lib/supabase/service.ts`
- `src/lib/api/optimistic-lock.ts`
- `src/app/owner-portal/page.tsx` (existing 1.5c thin wrapper)
- `.planning/codebase/*.md` (7 codebase map files referenced)

---

## Methodology Notes

- USER-PROFILE.md: MISSING → calibration tier = "standard" (default)
- METHODOLOGY.md: MISSING → skipped silently per workflow `load_methodology` step
- Todos: 0 matches (`gsd-sdk query todo.match-phase` returned empty)
- Codebase maps: 7 files exist (ARCHITECTURE / CONCERNS / CONVENTIONS / INTEGRATIONS / STACK / STRUCTURE / TESTING) — referenced in CONTEXT.md `<canonical_refs>`

---

*Discussion log written 2026-05-21*
*Plan-author B-2a-PLAN.md authoring step is next via /gsd-plan-phase chain*
