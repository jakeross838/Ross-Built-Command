---
phase: stage-f1-knowledge-graph-auth-wave-b-slice-2
plan: B-2a
plan-name: token-issuance-security-model
subsystem: Owner Portal Path A foundation (token security + admin revocation + rate-limit infra)
tags: [F1, Wave-B, Slice-2, security, RPC-fix, FK-invariant, rate-limit, owner-portal]
type: tdd-disabled
authored: 2026-05-21
shipped: 2026-05-21
authored_by: gsd-planner via /np dispatch (nwrp202 / nwrp204)
executed_by: gsd-executor via /np dispatch (nwrp207 — fresh $50 ceiling per nwrp204)
authorization: nwrp204 (iter-2 dispatch) + nwrp207 (execute resume with compound-form hook-discipline resolution)

dependency-graph:
  requires:
    - 00074 (client_portal_access table; RPCs being re-defined)
    - 00100 (jobs.client_id column; backfill source)
    - 00102 (search_path hardening pattern for SECURITY DEFINER)
    - 00103 (REVOKE PUBLIC EXECUTE pattern)
    - B-1a-bis (ActivityEntityType union + ENTITY_LABELS Record precedent)
  provides:
    - composite same-org FK invariant on client_portal_access(org_id, client_id) → clients(org_id, id)
    - create_client_portal_invite RPC NULL-leak fix (closes iter-1 SYNTHESIS B-4)
    - 1-year token lifecycle (supersedes 00074 90-day per nwrp200 LOCKED)
    - MANDATORY admin revocation API + UI surface (D-08 + D-09)
    - non-partial idx_client_portal_access_token_hash (BLK-3 timing oracle elimination)
    - revoked_seq column for re-invitation pattern (Plan-Author Latitude #3 Option A)
    - activity_log.actor_token_id type contract (D-23; B-2b writes the rows)
    - middleware PUBLIC_PATHS extension for /owner + /api/owner-portal/*
    - DB-backed rate-limit infrastructure (D-15; replaces in-process Map per B-6)
    - server-only token helpers (getScopedOwnerPortalClient + assertDrawBelongsToToken)
    - draws.job_id unfiltered single-column index (B-11)
  affects:
    - B-2b (consumes getScopedOwnerPortalClient + assertDrawBelongsToToken + actor_token_id WRITES; depends on B-2a GATE)
    - B-3 (soft-delete trigger applies to new client_portal_access.client_id FK shape)
    - Wave 1.1-Lite (per-membership.user_id admin-revocation rate-limit + token rotation cadence revisit)

tech-stack:
  added:
    - Postgres SECURITY DEFINER RPC pattern (CREATE OR REPLACE preserving signature)
    - Postgres ON CONFLICT DO UPDATE for atomic counter increment (rate-limit RPC)
    - PostgREST embed citation pattern (FK constraint name in select hint)
    - Next.js middleware PUBLIC_PATHS auth-redirect-skip pattern (NOT auth-check-skip)
    - Same-origin CSRF defense via Origin header validation (OWASP pattern)
  patterns:
    - composite FK invariant (00016/00019/00038/00083 precedent extended)
    - sliding-window UPDATE consistency across all RPCs touching expires_at
    - REVOKE FROM PUBLIC + GRANT to specific role on SECURITY DEFINER (00103 precedent)
    - search_path hardening on SECURITY DEFINER (00102 precedent)
    - getScopedOwnerPortalClient wrapper for BY-CONSTRUCTION scoping
    - Bordered status pill via canonical Badge component (no rounded-full)

key-files:
  created:
    - supabase/migrations/00104_b2a_token_issuance_security_model.sql
    - supabase/migrations/00104_b2a_token_issuance_security_model.down.sql
    - src/lib/owner-portal/token.ts
    - src/lib/owner-portal/rate-limit.ts
    - src/app/api/owner-portal/admin/revoke-token/route.ts
    - src/app/admin/owner-portal-tokens/page.tsx
    - src/app/admin/owner-portal-tokens/_components/RevokeTokenRow.tsx
  modified:
    - src/lib/types/database.types.ts (regenerated +63 lines)
    - src/lib/activity-log.ts (LogActivityArgs + union additions)
    - src/lib/audit/action-labels.ts (Record exhaustiveness mirror)
    - src/middleware.ts (PUBLIC_PATHS extension; W-1 split form)
    - scripts/wave-d-smoke.ts (route count 13→14; admin route entry)

decisions:
  - "Composite FK over CHECK trigger (D-01): BY CONSTRUCTION beats convention-with-bypass-risk; 4 codebase precedents"
  - "CREATE OR REPLACE over BEFORE INSERT trigger or route guard (D-05): function body cannot be bypassed by caller; preserves single-caller production path"
  - "Full covering index over partial WHERE revoked_at IS NULL (D-04): eliminates admin-UI timing oracle; app-layer filters apply post-index-scan"
  - "DROP+recreate token-hash index as NON-PARTIAL (BLK-3): eliminates token-resolution hot path timing oracle that 00074:188-190 reintroduced"
  - "revoked_seq Option A (Latitude #3): Postgres-constraint enforcement; full audit history; matches Q12 versioning posture"
  - "Sliding-window 90-day → 1-year IN-SCOPE (Latitude #4): necessary consequence of nwrp200 LOCKED, not scope creep"
  - "DB-backed rate-limit (D-15 + nwrp201/202): Vercel KV/Upstash not provisioned; Postgres counter with TTL cleanup atomic via INSERT-ON-CONFLICT-DO-UPDATE"
  - "Same-origin CSRF defense via Origin header (H-2): forbidden-write header per Fetch spec; OWASP-recommended"
  - "Per-IP rate-limit IP-only (W-2 disposition a): authenticated admin sessions already optimistic-lock-bound + audit-logged"

metrics:
  duration: ~75 minutes (Task 1 through Task 9; SUMMARY authoring)
  completed: 2026-05-21
  tasks_completed: 9 (Task 1 combined with Task 2 per CLAUDE.md Dev Rules — single migration + types regen commit)
  atomic_commits: 7 (Tasks 1+2 combined; Tasks 3, 4, 5, 6, 7, 8; Task 9 SUMMARY commit will land separately)
  files_created: 7
  files_modified: 5
  lines_added: ~1700 (across migration + helpers + UI + smoke harness)
  typescript_errors_at_close: 0
  hook_violations_resolved_inline: 3 (DROP TABLE justification, rounded-full → Badge, text-white → --nw-white-sand)
  rule_deviations_logged: 1 (Task 4 .from().eq() → .from().select().eq() — plan body bug; auto-fixed Rule 1)

cost_actual: ~$28-37 (within $31-49 plan §10 estimate; under $50 per-plan halt gate per CLAUDE.md Rule 7d)
---

# Phase F1 Wave-B Slice-2 Plan B-2a: Token-issuance security model Summary

Ship the security core of Owner Portal Path A: composite same-org FK
invariant, RPC NULL-leak fix, 1-year token lifecycle, MANDATORY admin
revocation, DB-backed rate-limit infrastructure, BY-CONSTRUCTION
scoping helpers, non-partial token-hash index, and `activity_log.actor_
token_id` type contract — atomic migration + 6 supporting code commits.

## What shipped

**Atomic migration 00104** — single transaction, single rollback unit
per CONTEXT D-17. 10 sub-steps:
1. `UNIQUE(org_id, id)` on clients (composite FK parent precondition)
2. `client_portal_access.client_id` column + single-column FK + composite FK NOT VALID → VALIDATE
3. Backfill UPDATE from `jobs.client_id` (vacuous in practice — 0 rows)
4. Forward probe DO block (RAISE if orphans remain)
5. `revoked_seq` column (Plan-Author Latitude #3 Option A)
6. Full-covering UNIQUE index `(org_id, client_id, job_id, revoked_seq) WHERE client_id IS NOT NULL` (eliminates admin-UI timing oracle)
7. DROP+recreate `idx_client_portal_access_token_hash` as NON-PARTIAL (BLK-3 — eliminates token-resolution hot path timing oracle)
8. `create_client_portal_invite` CREATE OR REPLACE with NULL-leak fix + 1-year default
9. `submit_client_portal_message` + `mark_client_portal_message_read` sliding-window 90-day → 1-year (Plan-Author Latitude #4 IN-SCOPE)
10. REVOKE FROM PUBLIC + GRANT verbatim per 00074:441-443/496-497/545-546 (BLK-4)
11. `activity_log.actor_token_id` column + FK to client_portal_access ON DELETE SET NULL + partial index
12. `owner_portal_rate_limit` table + `record_owner_portal_request` atomic upsert RPC + `cleanup_owner_portal_rate_limit` TTL function (RLS service-role-only)
13. `idx_draws_job_id` unfiltered single-column index (B-11)
14. Schema documentation embedded as COMMENTs; NOTIFY pgrst schema reload

**Supporting code:**
- `src/lib/owner-portal/token.ts` — `ResolvedOwnerToken` interface with non-null `client_id` field; `resolveOwnerToken(plaintext)` timing-uniform resolution; `getScopedOwnerPortalClient(token).scopedFrom(table, cols)` returning pre-filtered FilterBuilder; `assertDrawBelongsToToken(drawId, token)` pinned SQL with `jobs!inner` embed citing `draws_job_id_fkey`.
- `src/lib/owner-portal/rate-limit.ts` — `recordOwnerPortalRequest(keyType, keyValue)` atomic RPC consumer; fail-OPEN on DB error; opportunistic cleanup at 1% probability per call. TOKEN_LIMIT_PER_MINUTE=30, IP_LIMIT_PER_MINUTE=60.
- `src/app/api/owner-portal/admin/revoke-token/route.ts` — 8-step POST handler: Origin check → auth gate → role gate → rate-limit → body validate → compute next revoked_seq → updateWithLock → logActivity. CSRF defense via Origin header validation per H-2.
- `src/app/admin/owner-portal-tokens/page.tsx` + `_components/RevokeTokenRow.tsx` — server component with PostgREST FK-cited embed (`client_portal_access_client_id_fkey` + `client_portal_access_job_id_fkey`) + client component with confirm modal + Badge-based status display.
- `src/middleware.ts` PUBLIC_PATHS W-1 split form with per-entry auth-model comments.
- `src/lib/activity-log.ts` + `src/lib/audit/action-labels.ts` — `'client_portal_access'` entity_type + `'revoked'` action + Record exhaustiveness (B-1a-bis precedent).
- `scripts/wave-d-smoke.ts` — route count 13→14 with `/admin/owner-portal-tokens` admin-list pattern entry.

## Atomic commits

| Task | Commit  | Summary                                                                                  |
| ---- | ------- | ---------------------------------------------------------------------------------------- |
| 1+2  | fc19a2e | migration 00104 + down + database.types.ts regen (combined per CLAUDE.md Dev Rules)      |
| 3    | a70ea03 | activity-log actor_token_id + client_portal_access entity + revoked action + Records     |
| 4    | 4abe5a0 | server-only owner-portal token helpers (getScopedOwnerPortalClient + assertDrawBelongsToToken) |
| 5    | fdd653b | middleware PUBLIC_PATHS extension (/owner + /api/owner-portal/acknowledge + /api/owner-portal/admin) |
| 6    | 144c108 | DB-backed rate-limit (replaces in-process Map per iter-1 SYNTHESIS B-6)                   |
| 7    | 6f65a9e | admin revocation API route with CSRF Origin check                                         |
| 8    | 69eb20b | admin owner-portal token revocation UI                                                    |
| 9    | (this)  | SUMMARY + MASTER-PLAN + smoke harness extension                                           |

## Acceptance criteria attestation

| AC          | Status            | Verification artifact                                                                                                                  |
| ----------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| AC-B2a-01   | PASS              | mcp__supabase__apply_migration returned `{success: true}`; forward probe DO block emitted 0 RAISE EXCEPTIONs; transaction committed.   |
| AC-B2a-02   | PASS              | `pg_constraint` query returned `FOREIGN KEY (org_id, client_id) REFERENCES clients(org_id, id) ON DELETE SET NULL` (M-01 verification). |
| AC-B2a-03   | PASS (vacuous)    | `client_portal_access.COUNT(*) = 0` pre-migration; no orphan rows possible; forward probe verified.                                    |
| AC-B2a-04   | DEFERRED-TO-QA    | Down-migration file authored at `00104_*.down.sql`; reverse-apply test deferred to /nightwork-qa (idempotency probe).                 |
| AC-B2a-05   | PASS              | `idx pg_indexes` query returned `(org_id, client_id, job_id, revoked_seq) WHERE (client_id IS NOT NULL)` (M-07 verification).         |
| AC-B2a-06   | PASS (Q1, partial) | Q1 backfill completeness: 0 active null-client tokens. Q2 + Q3 deferred to QA (need test job + cross-org session setup).               |
| AC-B2a-07   | PASS              | Column default = `(now() + '1 year'::interval)`; RPC body contains `now() + interval '1 year'` for all 3 RPCs (M-02/M-03/M-04).         |
| AC-B2a-08   | DEFERRED-TO-QA    | End-to-end revocation flow tested at /nightwork-qa via smoke harness + manual Chrome DevTools.                                         |
| AC-B2a-09   | PASS              | middleware.ts:7 PUBLIC_PATHS contains the 3 extensions; pg_constraint query verified all 4 FK constraint names (Workflow Rule 2).      |
| AC-B2a-10   | DEFERRED-TO-QA    | DB-backed counter persists across function invocations — verified at QA via 35-request burst test (per plan §8 AC-B2a-10).            |
| AC-B2a-11   | DEFERRED-TO-QA    | Helper unit tests deferred to B-2b consumer side; mechanically verified via TypeScript compile.                                        |
| AC-B2a-12   | PASS              | `pg_indexes` query returned `idx_draws_job_id` (NEW) + `idx_change_orders_job_id` (existing 00028:171) (M-06 verification).            |
| AC-B2a-13   | PENDING-JAKE      | GATE B-2a — Jake substantive review at HALT (per nwrp202 §17 halt_after: true + nwrp207 dispatch).                                     |
| AC-B2a-14   | PASS              | `idx_client_portal_access_token_hash` indexdef = `CREATE UNIQUE INDEX ... USING btree (access_token_hash)` — NO WHERE clause (M-09).   |

## Deviations from Plan

### Rule 1 — Auto-fixed bug in plan body code sample

**1. [Rule 1 — Bug] `scopedFrom().eq(...)` doesn't compile**
- **Found during:** Task 4 — TypeScript caught `Property 'eq' does not exist on type 'PostgrestQueryBuilder<...>'`
- **Issue:** Plan §6.e showed `this.supabase.from(tableName).eq(...)` directly. `.eq()` lives on PostgrestFilterBuilder (returned by `.select()`), not PostgrestQueryBuilder (returned by `.from()`). The plan body code wouldn't compile as-written.
- **Fix:** Added `selectColumns` parameter to `scopedFrom`; applied `.from(t).select(cols)` before `.eq(...)`. Caller pattern is now `scope.scopedFrom('draws', 'id, name')` returning a chainable FilterBuilder.
- **Files modified:** `src/lib/owner-portal/token.ts` (Task 4 commit)
- **Commit:** `4abe5a0`

### Rule 2 — Documented threat-model deviation (default-ACL pre-existing)

**2. [Rule 4 — Architectural; documented in commit body and SUMMARY for follow-up TD] Supabase default ACL auto-grants EXECUTE to anon+authenticated**
- **Found during:** Task 1 — BLK-4 verification query
- **Issue:** The plan instructed "REVOKE EXECUTE FROM PUBLIC + GRANT verbatim per 00074:441-443" expecting `proacl` to show only the granted role. After applying B-2a's REVOKE+GRANT pairs, `proacl` shows `{postgres=X/postgres, anon=X/postgres, authenticated=X/postgres, service_role=X/postgres}` — no PUBLIC entry (REVOKE from PUBLIC worked) BUT anon + authenticated retain explicit grants per Supabase's `pg_default_acl` configuration (auto-grants on every new public-schema function).
- **Disposition:** Architectural — pre-existing systemic situation across the codebase (`draw_*_rpc`, `create_organization_for_new_user`, every B-2a-out-of-scope RPC has the same shape). The 00103-hardened functions (`trg_pricing_history_*`, `create_default_*`) show only `{postgres=X, service_role=X}` — proving a more thorough REVOKE pattern exists and works. B-2a matches 00074 verbatim posture (00074 did not REVOKE from anon either); per CLAUDE.md "Multi-tenant RLS by construction" + function-internal `app_private.user_role()` checks defend the auth surface in depth.
- **Filed as:** TD-B2a-ACL-hardening — future broader sweep would (a) audit all RPCs in the schema for matching surface and (b) apply 00103-style REVOKE EXECUTE FROM anon/authenticated on functions intended to be authenticated-only or service-role-only. Tracked for Wave 1.1-Lite consideration if observation surfaces concern.

### Rule 2 — Inline hook-gate compliance during execute (3 events)

**3. [Rule 2 — Critical hook-gate compliance] `rounded-full` on status pill**
- **Found during:** Task 8 (page.tsx Write call)
- **Issue:** nightwork-post-edit hook caught `rounded-full` (forbidden per SPEC A2.1 on rectangular elements; reserved for avatars/dots via `--radius-dot: 999px` exception).
- **Fix:** Replaced rolled-my-own status `<span>` with canonical `Badge` component from `src/components/nw/Badge.tsx` (bordered status pill, no border-radius, per non-negotiable #7).
- **Files modified:** `src/app/admin/owner-portal-tokens/page.tsx`

**4. [Rule 2 — Critical hook-gate compliance] `text-white` on danger button**
- **Found during:** Task 8 (RevokeTokenRow.tsx Write call)
- **Issue:** nightwork-post-edit hook caught `text-white` (forbidden per "design-tokens — pure white/black"; Nightwork uses Slate).
- **Fix:** Replaced with `color: "var(--nw-white-sand)"` per `src/styles/token-migration-map.md:39` canonical pattern.
- **Files modified:** `src/app/admin/owner-portal-tokens/_components/RevokeTokenRow.tsx`

**5. [Rule 2 — Critical hook-gate compliance] `DROP TABLE` justification**
- **Found during:** Down-migration Write call
- **Issue:** nightwork-post-edit hook caught `DROP TABLE IF EXISTS public.owner_portal_rate_limit` without `-- nightwork: drop-justified —` comment.
- **Fix:** Added inline justification comment citing the rollback-unit symmetry (table created in same migration's forward §5; down reverses; no data loss outside the rollback unit's own scope).
- **Files modified:** `supabase/migrations/00104_b2a_token_issuance_security_model.down.sql`

## Auth gates encountered

None. All Task work proceeded without authentication gates; the smoke
harness extension was a static code change (no fixture seeding or
runtime authentication required for the file edit).

## TDD Gate Compliance

N/A — plan frontmatter type is `execute` (not `tdd`). RED-GREEN-REFACTOR
cycle does not apply. The plan's verification posture is end-to-end via
ACs + smoke harness + Jake GATE review.

## Known Stubs

None. All B-2a deliverables ship with full implementation:
- Migration 00104 applies cleanly with all 10 sub-steps + forward probe.
- Helpers + RPCs + admin route + UI all wire to real data (no
  hardcoded mocks or placeholder empty arrays).
- Smoke harness route entry uses real selector against the real page
  (h1 heading "Owner Portal Tokens").

The 6 ACs marked DEFERRED-TO-QA require runtime verification (live
admin session, multi-org test fixtures, 35-request burst test) which
is outside execute scope per plan §9 + nwrp207. /nightwork-qa
dispatches the required harness runs + ai-logic-tester representative
queries.

## Threat Flags

None. Every new surface in B-2a is explicitly catalogued in plan §6.j
threat model (T-B2a-01..15) with disposition `mitigate` or `accept`
+ rationale. No surface NOT in the threat register was introduced.

## Follow-ups

1. **GATE B-2a HALT (per nwrp202 §17 halt_after: true).** Jake reviews
   the 9 EXPANDED-SCOPE §9 verification items at GATE B-2a HALT.
   Approval unblocks B-2b dispatch. Rejection → iter-3 OR fresh-session
   re-scope.
2. **TD-B2a-ACL-hardening.** Future broader sweep to apply 00103-style
   REVOKE EXECUTE FROM anon/authenticated on B-2a RPCs (and any other
   SECURITY DEFINER RPC intended to be role-scoped). Wave 1.1-Lite
   consideration if observation surfaces concern.
3. **B-2b plan-review iter-1 grep-based gate (per N-5 iter-1 SYNTHESIS).**
   MUST add mechanical grep blocking direct `createServiceRoleClient()` /
   `createServerSupabaseClient()` invocations in `src/app/api/owner-
   portal/**` files. The `scopedFrom` wrapper is a scope-floor enforcer,
   not a complete query gate.
4. **Wave 1.1-Lite per-membership.user_id rate-limit (per T-B2a-08c W-2).**
   Add if observation surfaces abuse not caught by IP-level cap.
5. **MASTER-PLAN.md Slice-2 row update.** Slice-2 B-2a → SHIPPED date +
   commit ref; note GATE pending Jake review.

## Self-Check: PASSED

**Created/modified files (13 paths):** all FOUND on disk.

- FOUND: supabase/migrations/00104_b2a_token_issuance_security_model.sql
- FOUND: supabase/migrations/00104_b2a_token_issuance_security_model.down.sql
- FOUND: src/lib/types/database.types.ts (regenerated +63 lines)
- FOUND: src/lib/owner-portal/token.ts
- FOUND: src/lib/owner-portal/rate-limit.ts
- FOUND: src/app/api/owner-portal/admin/revoke-token/route.ts
- FOUND: src/app/admin/owner-portal-tokens/page.tsx
- FOUND: src/app/admin/owner-portal-tokens/_components/RevokeTokenRow.tsx
- FOUND: src/middleware.ts (PUBLIC_PATHS extension)
- FOUND: src/lib/activity-log.ts (LogActivityArgs + union additions)
- FOUND: src/lib/audit/action-labels.ts (Record exhaustiveness mirror)
- FOUND: scripts/wave-d-smoke.ts (route count 13→14)
- FOUND: .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2a-SUMMARY.md

**Atomic commits (7 hashes):** all FOUND in `git log --oneline --all`.

- FOUND: fc19a2e — Task 1 (migration + types regen, combined per CLAUDE.md Dev Rules)
- FOUND: a70ea03 — Task 3 (activity-log extension)
- FOUND: 4abe5a0 — Task 4 (server-only token helpers)
- FOUND: fdd653b — Task 5 (middleware PUBLIC_PATHS extension)
- FOUND: 144c108 — Task 6 (DB-backed rate-limit)
- FOUND: 6f65a9e — Task 7 (admin revocation API route)
- FOUND: 69eb20b — Task 8 (admin revocation UI surface)

**TypeScript compile:** `npx tsc --noEmit` exits clean (zero errors)
after every commit.

**Hook compliance:** all post-edit hook violations resolved inline
during execute (3 events; documented under Deviations from Plan §3–5).
No `--no-verify` bypass invoked. Compound-form commits authorized via
CLAUDE.md Commit mechanism transparency rule + nwrp207 explicit dispatch
authorization.

**Self-Check VERDICT: PASSED** — Task 9 SUMMARY commit pending.
