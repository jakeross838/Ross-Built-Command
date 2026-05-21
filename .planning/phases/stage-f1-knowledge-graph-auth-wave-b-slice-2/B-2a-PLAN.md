---
phase: stage-f1-knowledge-graph-auth-wave-b-slice-2
plan: B-2a
plan-name: token-issuance-security-model
type: execute
wave: B-2a (Slice-2 first plan post-nwrp200 re-split; supersedes superseded B-2)
depends_on: []
autonomous: true
halt_after: true   # Tier 1 — GATE B-2a substantive review by Jake before B-2b dispatches per nwrp202 §17; 8 verification items in EXPANDED-SCOPE §9
requires_smoke: true   # security flows + admin revocation flow + rate-limit functional verification
threat_model_severity: high   # external token surface + cross-tenant leak closure + foundational security infra; was MEDIUM for B-2, escalated per nwrp200
status: AUTHORED — PENDING JAKE REVIEW AT PLAN-REVIEW ITER-2
authored: 2026-05-21
authored_by: gsd-planner via /np dispatch (nwrp202)
revised_by: gsd-planner via /np dispatch (nwrp204 iter-2 revision)
authorization: nwrp202 RE-APPROVE + nwrp204 iter-2 dispatch authorization (chain nwrp200 → nwrp201 → nwrp202 → nwrp203 halt-for-fresh-session → nwrp204 iter-2)
source_decisions:
  - "B-2a-CONTEXT.md D-01..D-23 (23 locked decisions)"
  - "EXPANDED-SCOPE.md §7 plan #1 (canonical B-2a scope)"
  - "EXPANDED-SCOPE.md §6 Q5 LOCKED (1-year token expiration + MANDATORY revocation)"
  - "EXPANDED-SCOPE.md §1 entity table B-2a rows (client_portal_access FK + create_client_portal_invite RPC fix + revocation column)"
  - "EXPANDED-SCOPE.md §4 cross-cutting rate-limit row (DB-backed counter table LOCKED per nwrp202 §3)"
  - "EXPANDED-SCOPE.md §9 HALT GATE B-2a (8 verification items)"
  - "EXPANDED-SCOPE.md §7 acceptance criteria preview (12 falsifiable B-2a ACs at lines 393-406)"
  - "nwrp200 (B-2 re-split DIRECTIVE — iter-1 SYNTHESIS B-4 leak finding)"
  - "nwrp201 (rate-limit DB-backed decision; B-4 AC 3-query strengthening request)"
  - "nwrp202 (RE-APPROVE + dispatch authorization for B-2a Tier 1 HIGH-threat full rigor)"
  - "nwrp203 (halt-for-fresh-session per Rule 7c/d posture — iter-1 plan-review surfaced 6 BLOCKERs)"
  - "nwrp204 (iter-2 dispatch authorization; fresh $50 ceiling scoped to revision + re-review + execute + GATE)"
  - "PLAN-REVIEW-B2A-ITER1-SYNTHESIS.md §Iter-2 revision checklist (6 BLK + 2 HIGH + 2 WARNING + 5 NOTE items + 2 Latitude dispositions)"
  - "CLAUDE.md Architecture posture (Multi-tenant RLS BY CONSTRUCTION; Q10b scope-axis rule)"
  - "CLAUDE.md Workflow posture Rules 1-9 (Rule 2 FK citation; Rule 7d halt gate; Rule 8 hook fail-closed)"
  - "iter-1 SYNTHESIS B-1..B-11 (B-2a maps these resolutions)"
files_modified:
  # NEW — Migration 00104 (atomic per D-17)
  - supabase/migrations/00104_b2a_token_issuance_security_model.sql
  - supabase/migrations/00104_b2a_token_issuance_security_model.down.sql
  # Regenerated — types pipeline (mandatory per CLAUDE.md Dev Rules — same commit as 00104)
  - src/lib/types/database.types.ts
  # NEW — server-only token helpers (D-13 + D-14)
  - src/lib/owner-portal/token.ts
  # NEW — application-layer rate-limit guard (consumes DB-backed counter from 00104)
  - src/lib/owner-portal/rate-limit.ts
  # NEW — admin revocation API route (D-08 + D-10 + D-11)
  - src/app/api/owner-portal/admin/revoke-token/route.ts
  # NEW — admin revocation UI surface (D-09 — minimum viable per CONTEXT specifics)
  - src/app/admin/owner-portal-tokens/page.tsx
  - src/app/admin/owner-portal-tokens/_components/RevokeTokenRow.tsx
  # MODIFIED — extend middleware PUBLIC_PATHS (D-12)
  - src/middleware.ts
  # MODIFIED — extend LogActivityArgs interface for actor_token_id (D-23; WRITES are B-2b scope, type contract is B-2a)
  - src/lib/activity-log.ts
  # MODIFIED — extend ENTITY_LABELS + ACTION_LABELS Records to mirror new union members (TypeScript Record exhaustiveness; B-1a-bis precedent at action-labels.ts:17 explicit comment)
  - src/lib/audit/action-labels.ts
files_referenced:
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2a-CONTEXT.md
  - .planning/expansions/stage-f1-knowledge-graph-auth-wave-b-slice-2-EXPANDED-SCOPE.md
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2-PLAN.md
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/PLAN-REVIEW-ITER1-SYNTHESIS.md
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/PLAN-REVIEW-ITER1-SECURITY.md
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/PLAN-REVIEW-ITER1-MULTI-TENANT.md
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/PLAN-REVIEW-ITER1-RLS-AUDITOR.md
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/PLAN-REVIEW-ITER1-AI-LOGIC.md
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/PLAN-REVIEW-ITER1-DATABASE.md
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/PLAN-REVIEW-B2A-ITER1-SYNTHESIS.md
  - supabase/migrations/00074_client_portal.sql               # existing token model (175 lines of context; B-2a extends)
  - supabase/migrations/00100_clients_schema_foundation.sql   # PK + UNIQUE precedent
  - supabase/migrations/00101_drop_jobs_client_columns.sql    # atomic consumer-refactor precedent
  - supabase/migrations/00102_wa_iter1_security_cleanup.sql   # search_path hardening precedent
  - supabase/migrations/00103_revoke_public_execute_security_definer_triggers.sql  # REVOKE pattern precedent
  - supabase/migrations/00016_multi_tenant_foundation.sql     # composite UNIQUE precedent #1
  - supabase/migrations/00019_phase2_org_invites.sql          # composite UNIQUE precedent #2
  - supabase/migrations/00038_phase_b_internal_billings.sql   # composite UNIQUE precedent #3 (constraint at line 41 in internal_billing_types table; filename retains internal_billings per other tables in same migration — N-1 corrected per iter-1 SYNTHESIS)
  - supabase/migrations/00083_org_cost_codes.sql              # composite UNIQUE precedent #4
  - supabase/migrations/00026_phase5_scaffolding_tables.sql   # activity_log shape (no actor_token_id today)
  - supabase/migrations/00028_phase7_purchase_orders_change_orders.sql # change_orders.job_id index (already exists)
  - src/lib/supabase/service.ts                               # service-role client pattern
  - src/lib/api/optimistic-lock.ts                            # updateWithLock for D-11
  - src/middleware.ts                                         # PUBLIC_PATHS extension point
  - CLAUDE.md                                                 # architecture + workflow posture
sequence:
  before: B-2b (B-2b consumes getScopedOwnerPortalClient + assertDrawBelongsToToken from B-2a; B-2b dispatch GATED on B-2a GATE)
  after: B-1b + Wave-A iter-1 cleanup (both RESOLVED per nwrp189; Slice-1 closed)
  parallel_authoring_ok: false (B-2a is foundation; B-2b depends)
  parallel_execute_ok: false (single migration + serial admin path)
acceptance-criteria-target: 13 falsifiable items (AC-B2a-01..AC-B2a-13) — see §8
qa_reviewers:
  - spec-checker
  - custodian
  - security-reviewer       # token surface + RPC fix + revocation + rate-limit + index timing oracle (load-bearing)
  - multi-tenant-architect  # BY-CONSTRUCTION verification on composite FK + helper enforcement
  - rls-auditor             # anon-role policy + PUBLIC_PATHS + restrictive intersection
  - database-reviewer       # FK shape + index posture + backfill correctness + composite UNIQUE precedent fit
  - ai-logic-tester         # Rule 3 representative queries: token resolution; helper enforces scope; cross-client probe; cross-org RPC rejection (3-query B-4 AC verification)
  # NOTE: NO design-pushback per nwrp202 §15 — B-2a has no UI surface design-novelty (admin revocation UI is functional, reuses existing admin section patterns)
---

<criteria>
<!--
  Verification harness criteria block per D-17/D-18 mandate (stage-1.5c-verification-harness, shipped 2026-05-20).
  Authored 2026-05-21 iter-2 (BLK-1 fix per PLAN-REVIEW-B2A-ITER1-SYNTHESIS §Iter-2 revision checklist).
  Five categories: mechanical, dom, visual, behavioral, semantic.
  Each criterion is falsifiable and verifiable from execute artifacts (smoke harness, DB queries, deployed admin UI surface).
-->

mechanical:
  - id: M-01
    statement: "Composite FK `client_portal_access_org_id_client_id_fkey` exists on `client_portal_access` referencing `clients(org_id, id)` ON DELETE SET NULL (cited entry per Rule 2)"
    query: "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'client_portal_access_org_id_client_id_fkey' AND contype = 'f';"
    expected: "1 row; def contains 'FOREIGN KEY (org_id, client_id) REFERENCES clients(org_id, id) ON DELETE SET NULL'"
  - id: M-02
    statement: "RPC `create_client_portal_invite` body derives `client_id` from `jobs.client_id` and RAISES on NULL (closes B-4 leak; cited RPC body matches expected)"
    query: "SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'create_client_portal_invite' AND pronamespace = 'public'::regnamespace;"
    expected: "function body contains 'SELECT j.client_id INTO _client_id' AND 'RAISE EXCEPTION' on NULL AND 'now() + interval ''1 year'''"
  - id: M-03
    statement: "RPC `submit_client_portal_message` body sliding-window UPDATE is `now() + interval '1 year'` (NOT 90 days) per Latitude #4 disposition (cited RPC body matches expected)"
    query: "SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'submit_client_portal_message' AND pronamespace = 'public'::regnamespace;"
    expected: "function body contains 'expires_at = now() + interval ''1 year''' AND does NOT contain '90 days'"
  - id: M-04
    statement: "RPC `mark_client_portal_message_read` body sliding-window UPDATE is `now() + interval '1 year'` (NOT 90 days) per Latitude #4 disposition (cited RPC body matches expected)"
    query: "SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'mark_client_portal_message_read' AND pronamespace = 'public'::regnamespace;"
    expected: "function body contains 'expires_at = now() + interval ''1 year''' AND does NOT contain '90 days'"
  - id: M-05
    statement: "All 9 SECURITY DEFINER functions touched in 00104 have `SET search_path = public, pg_temp` (per 00102 hardening; new + re-defined)"
    query: "SELECT proname, proconfig FROM pg_proc WHERE proname IN ('create_client_portal_invite', 'submit_client_portal_message', 'mark_client_portal_message_read', 'record_owner_portal_request', 'cleanup_owner_portal_rate_limit') AND prosecdef = true AND pronamespace = 'public'::regnamespace;"
    expected: "5 rows; each proconfig array contains 'search_path=public, pg_temp'"
  - id: M-06
    statement: "`draws.job_id` and `change_orders.job_id` indexes exist"
    query: "SELECT indexname FROM pg_indexes WHERE (tablename = 'draws' AND indexname = 'idx_draws_job_id') OR (tablename = 'change_orders' AND indexname = 'idx_change_orders_job_id');"
    expected: "2 rows (idx_draws_job_id added in 00104; idx_change_orders_job_id pre-existing at 00028:171)"
  - id: M-07
    statement: "Partial unique index `client_portal_access_org_client_job_seq_unique` exists with Option A predicate `WHERE (client_id IS NOT NULL)` per D-04 (NOT Option C `revoked_at IS NULL` predicate)"
    query: "SELECT indexdef FROM pg_indexes WHERE indexname = 'client_portal_access_org_client_job_seq_unique';"
    expected: "indexdef contains '(org_id, client_id, job_id, revoked_seq)' AND 'WHERE (client_id IS NOT NULL)' AND does NOT contain 'revoked_at IS NULL'"
  - id: M-08
    statement: "`owner_portal_rate_limit` table + `cleanup_owner_portal_rate_limit()` function exist with RLS service-role-only access"
    query: "SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'owner_portal_rate_limit' AND relkind = 'r'; SELECT proname FROM pg_proc WHERE proname = 'cleanup_owner_portal_rate_limit';"
    expected: "1 row; relrowsecurity = true; cleanup function exists"
  - id: M-09
    statement: "Token-hash index `idx_client_portal_access_token_hash` is NON-PARTIAL post-00104 (BLK-3 fix per iter-1 SYNTHESIS cross-reviewer alignment; eliminates timing oracle on token-resolution hot path)"
    query: "SELECT indexdef FROM pg_indexes WHERE tablename = 'client_portal_access' AND indexname = 'idx_client_portal_access_token_hash';"
    expected: "indexdef does NOT contain 'WHERE' clause (non-partial; serves token-resolution query regardless of revoked_at predicate)"

dom:
  - id: D-01
    statement: "Admin revocation surface at `/admin/owner-portal-tokens` renders the active-tokens list as a `<table>` or `<ul>` of token rows"
    selector: "main table tr, main ul li"
    expected: ">=1 row when at least one client_portal_access row exists; empty state placeholder otherwise"
  - id: D-02
    statement: "Each active (non-revoked) token row exposes a 'Revoke' button (interactive button element with revoke label)"
    selector: "[data-testid='revoke-token-button'], button:contains('Revoke')"
    expected: "button present + clickable (NOT aria-disabled) for non-revoked rows"
  - id: D-03
    statement: "Clicking Revoke opens a confirmation modal showing token metadata (token_id, client name, job name, created_at)"
    selector: "[role='dialog'], [data-testid='revoke-confirmation-modal']"
    expected: "modal renders post-click with token metadata visible; confirms intent before POST"
  - id: D-04
    statement: "Post-revoke, the row updates to show 'Revoked' state (replacing Revoke button OR moving row to a revoked-tokens table section)"
    selector: "[data-testid='revoked-state'], tr[data-revoked='true']"
    expected: "row reflects revoked state without page reload (optimistic UI OR explicit refetch after 200 response)"

visual:
  rationale: "N/A — B-2a has no homeowner UI per nwrp202 §15; admin revocation surface uses existing design tokens + admin section patterns at src/app/admin/users/page.tsx without introducing new pattern entries. PATTERNS.md unchanged per iter-1 SYNTHESIS B-17 RESOLVED. No novel visual verification surface."

behavioral:
  - id: B-01
    statement: "End-to-end revocation flow: authenticated admin clicks Revoke → POST /api/owner-portal/admin/revoke-token completes 200 → `client_portal_access.revoked_at` populated"
    setup: "Seed a client_portal_access row via create_client_portal_invite RPC; admin session active; submit revoke POST with valid expected_updated_at"
    expected: "Response 200 + { revoked: true, revoked_at: '<iso>' }; SQL query against client_portal_access shows revoked_at populated; revoked_seq incremented to max+1"
  - id: B-02
    statement: "`activity_log` row written on successful revocation with `user_id = membership.user_id`, `actor_token_id = NULL`, `entity_type = 'client_portal_access'`, `action = 'revoked'`"
    setup: "After B-01 succeeds, query activity_log"
    expected: "1 new row matches criteria; user_id IS NOT NULL; actor_token_id IS NULL"
  - id: B-03
    statement: "Anon homeowner request with revoked token returns silent-no-op semantics (NOT 200 with data leakage); `submit_client_portal_message` returns no row + does NOT extend expires_at"
    setup: "After B-01 succeeds, invoke `submit_client_portal_message('<revoked_plaintext>', 'msg')` via anon role"
    expected: "RPC returns 0 rows (silent no-op per 00074 design); NO new row inserted into client_portal_messages; expires_at NOT extended"
  - id: B-04
    statement: "Cross-tenant revocation is impossible: admin from org B attempts to revoke org A token returns 0 rows updated (RLS-scoped `updateWithLock`) → 409 conflict (lock-conflict masked) or explicit 404"
    setup: "Org A seeded with a token; org B admin session attempts POST with org A's token_id"
    expected: "Response NOT 200; SQL query shows revoked_at on org A token remains NULL"

semantic:
  - id: S-01
    statement: "Token-resolution helper at src/lib/owner-portal/token.ts exports `ResolvedOwnerToken` interface that REQUIRES non-null `client_id` field (TypeScript compiler enforces caller cannot use a token lacking client_id scope); `scopedFrom(table)` whitelisted via string-literal-union (arbitrary table names fail type-check)"
    file: "src/lib/owner-portal/token.ts"
    expected: "interface declaration includes `client_id: string` (NOT `client_id: string | null`); scopedFrom signature uses TypeScript string-literal-union (e.g., 'jobs' | 'draws' | 'change_orders' | 'lien_releases'); calls to resolveOwnerToken that fail to verify client_id return null (NOT silently return a partial token)"
  - id: S-02
    statement: "`assertDrawBelongsToToken(drawId, resolvedToken)` SQL JOINs to `jobs` filtering on `jobs.client_id = token.client_id AND jobs.org_id = token.org_id` (NOT just `draws.org_id` — closes B-3 intra-org cross-client leak)"
    file: "src/lib/owner-portal/token.ts"
    expected: "function body includes JOIN to jobs table with both client_id AND org_id filters applied at query level; mismatched client_id returns the assertion failure path (false return per chosen error semantics)"
</criteria>

# Plan B-2a — Token-issuance security model (Owner Portal Path A foundation)

## 1. Goal

Ship the **security core of Owner Portal Path A** as the foundation B-2b builds the read-only homeowner UI on top of. B-2a closes a pre-existing intra-org cross-homeowner leak (iter-1 SYNTHESIS B-4: existing `create_client_portal_invite` RPC produces `client_id=NULL`, allowing PostgREST `.eq('client_id', null)` to match ALL NULL rows across the org), introduces BY-CONSTRUCTION cross-client scoping via a composite same-org FK invariant, locks token lifecycle to 1-year (supersedes 00074 90-day sliding window per nwrp200), adds MANDATORY admin revocation as the real-time security control, replaces the non-functional in-process `Map` rate-limit (Vercel serverless invocations destroy the Map per request) with a DB-backed counter table per nwrp201/202, and converts application-layer scoping from convention to construction via `getScopedOwnerPortalClient` + `assertDrawBelongsToToken` helpers.

The driver per nwrp200 is the B-4 leak finding: the schema-level FK addition alone does NOT close the leak — the RPC produces `client_id=NULL` rows that match wildcard PostgREST `.eq('client_id', null)` queries. Without the RPC fix, the FK is structurally present but semantically bypassed. B-2a's atomic migration 00104 ships BOTH (composite FK invariant + RPC `CREATE OR REPLACE`) so the leak surface closes by construction in a single rollback unit.

Specifically:

1. **Composite FK invariant** — add `client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL` to `client_portal_access` with composite FK `(org_id, client_id) REFERENCES clients(org_id, id)` after adding `UNIQUE(org_id, id)` to `public.clients`. Same-org scope enforced by Postgres at constraint level. Backfill from existing `client_portal_access.job_id → jobs.client_id`. (Resolves iter-1 SYNTHESIS B-2.)
2. **`create_client_portal_invite` RPC NULL-leak fix** via `CREATE OR REPLACE FUNCTION` to derive `client_id` from `jobs.client_id` inside the function body. Existing single caller (1.5c admin surface) preserved. Explicit RAISE on `jobs.client_id IS NULL`. (Resolves iter-1 SYNTHESIS B-4.)
3. **Token lifecycle 1-year + MANDATORY admin revocation** — schema-default switched from 00074's 90-day sliding window to 1-year fixed; admin API path POSTs to set `revoked_at = NOW()`; admin UI surface shows live tokens with a "Revoke" button; revocation writes `activity_log` with `user_id` (revoker is authenticated admin). (Closes EXPANDED-SCOPE §6 Q5 LOCKED.)
4. **`activity_log.actor_token_id` column** added — type contract for B-2b's homeowner-initiated audit writes. B-2a does NOT write the column (B-2b's acknowledge endpoint does); B-2a only adds it + extends the TS interface. (Resolves EXPANDED-SCOPE §1 entity row.)
5. **Middleware PUBLIC_PATHS extension** — adds BOTH `/owner/*` AND `/api/owner-portal/*` so anon homeowner POST requests reach route handlers (without `/api/owner-portal/*`, anon = 401 before route handler executes). (Resolves iter-1 SYNTHESIS B-5.)
6. **Index posture eliminating timing oracle** — TWO-PART fix per iter-1 SYNTHESIS cross-reviewer alignment (security + ai-logic):
   - (a) Full covering index `(org_id, client_id, job_id, revoked_seq)` instead of partial `WHERE revoked_at IS NULL` for the admin-UI `(org_id, client_id, job_id)` lookup path (partial index makes revoked-token lookup miss the index, causing measurable seq-scan delay distinguishing "revoked" from "never existed"). App-layer filters apply `revoked_at IS NULL AND expires_at > now()`. (Resolves iter-1 SYNTHESIS B-7; NO Jake-acceptance partial escape per nwrp202 §4.)
   - (b) DROP existing partial `idx_client_portal_access_token_hash WHERE revoked_at IS NULL` (from 00074:188-190) + recreate as NON-PARTIAL on the token-resolution hot path (per BLK-3 iter-1 SYNTHESIS — security-reviewer + ai-logic-tester cross-reviewer alignment). `resolveOwnerToken` queries by `access_token_hash` only, without the `revoked_at IS NULL` predicate, so the partial index reintroduces the same timing oracle (a) closes for the admin-UI path. Non-partial index serves the query regardless of revoked_at value, eliminating the oracle entirely.
7. **Server-only helpers** in `src/lib/owner-portal/token.ts` — `getScopedOwnerPortalClient(resolvedToken)` returns a pre-scoped Supabase wrapper; `assertDrawBelongsToToken(drawId, resolvedToken)` enforces client+org scope on the B-2b acknowledge action. Converts "every author must remember `.eq()`" convention to BY-CONSTRUCTION. (Resolves iter-1 SYNTHESIS B-1 + B-3.)
8. **DB-backed rate-limit infrastructure** — counter table + cleanup function, replacing the in-process Map. Per-token + per-IP keys on `/api/owner-portal/*`. (Resolves iter-1 SYNTHESIS B-6 + nwrp202 §3 LOCKED.)
9. **`draws.job_id` index added; `change_orders.job_id` index verified** — Owner Portal will be the first user-facing path that queries these tables from outside an authenticated session; missing indexes = seq scan on every portal page. `change_orders.job_id` already indexed at 00028:171; no unfiltered single-column index on `draws.job_id` exists (the two existing partial composites — `idx_draws_job_number`, `idx_draws_job_status` — are partial-on-`deleted_at` and cannot serve B-2a helper queries that don't filter `deleted_at IS NULL`); added in 00104. (Resolves iter-1 SYNTHESIS B-11; N-3 prose-imprecision corrected per iter-1 SYNTHESIS.)

## 2. Out of scope (explicit)

### Deferred to B-2b (medium-threat UI plan on B-2a's verified foundation)

- `/owner/{token}` route + standalone layout + mobile UI + cross-client URL-tampering 404 on pay-app sub-route.
- `OwnerDashboardView` + `OwnerDrawView` rendering against Drummond + multi-viewport (iPhone 14 Pro Max + Pixel 7 + iPad Mini + desktop).
- Document downloads (signed-URL pattern + `getScopedOwnerPortalClient` scope on storage reads).
- **`actor_token_id` audit-log WRITES** (acknowledge endpoint writes the row; B-2a adds the column + TS contract only).
- **TOCTOU close on acknowledge** (DB unique constraint on `activity_log (entity_id, actor_token_id, action) WHERE action='acknowledged'` + INSERT...ON CONFLICT DO NOTHING).
- **Soft-delete + status filters on portal queries** (`.is('deleted_at', null)` + `.in('status', ['submitted', 'approved', 'paid', 'void'])`).
- **TD-B1abis-03 ClientCombobox polish** (`shadow-[var(--shadow-panel)]` replacement).
- **NwButton 56px TD-20 boundary exemption comment** (acknowledge CTA mobile-tap target).

### Deferred entirely (no plan in Slice-2)

- New PATTERNS.md "Owner Status View" entry — **RESOLVED per iter-1 SYNTHESIS B-17**; existing §4h.3 (owner portal dashboard) + §2j.3 (draw approval detail) cover. Do NOT invent 13th pattern.
- Token lifecycle alternatives (one-shot per pay-app; auto-rotate every N days) — Wave 1.1-Lite revisit conditions per EXPANDED-SCOPE §6 Q5.
- Full Owner Portal feature set (notifications, comments, signatures, ongoing engagement) — Wave 1.1-Lite.
- Token rotation in-place (extend expiration without re-invite) — Wave 1.1-Lite.

### Plan-author latitude (resolved at iter-1; recorded here for traceability)

**Latitude #1.** Exact composite FK migration ordering (DDL sequence + lock posture during backfill) — single transaction with `ALTER TABLE ... ADD COLUMN` first, backfill UPDATE second, FK constraint with `NOT VALID` then `VALIDATE CONSTRAINT` is the conventional pattern; chosen below in §5 Task 1.

**Latitude #2.** Rate-limit table column shape (`key TEXT` vs `key_hash BYTEA`; window strategy; cleanup mechanism) — chosen below in §5 Task 1 sub-step (h); halt-and-surface escape valve preserved per D-16 if scope balloons. Admin UI revocation surface scope (minimum: a token-list page under `/admin/owner-portal-tokens/`; if scope balloons, halt-and-surface per Rule 7d). Exact `getScopedOwnerPortalClient` interface shape (return shape; error semantics) — chosen below in §5 Task 4.

#### Plan-Author Latitude #3 — `revoked_seq` column + re-invitation pattern — APPROVED Option A

**Disposition (per iter-1 SYNTHESIS):** **APPROVED Option A** by cross-reviewer alignment (security-reviewer + multi-tenant-architect).

**Reasoning (from multi-tenant-architect report):** "Option A is the cleanest BY-CONSTRUCTION re-invitation semantics. Option B violates the soft-delete rule (severs audit FK chain via `actor_token_id ON DELETE SET NULL` cascade). Option C is mechanically blocked by nwrp202 §4 timing-oracle prohibition."

**Background.** CONTEXT.md D-04 LOCKED the index posture: full covering index `(org_id, client_id, job_id)` + app-layer filter on `revoked_at` + `expires_at`. D-04 did NOT lock a re-invitation pattern. The full covering index without `WHERE revoked_at IS NULL` partial predicate eliminates the timing oracle (per iter-1 SYNTHESIS B-7 + nwrp202 §4), but creates a re-invitation problem: an existing revoked row's `(org_id, client_id, job_id)` triplet still occupies the uniqueness slot unless the predicate carries a discriminator.

**Option A (CHOSEN; embedded in §5 Task 1 §1e + AC-B2a-08).** Add `revoked_seq INTEGER NOT NULL DEFAULT 0` column. Unique constraint: `(org_id, client_id, job_id, revoked_seq) WHERE client_id IS NOT NULL`. On revoke: increment `revoked_seq` to (max+1) for the row. Re-invitation creates a NEW row with `revoked_seq = 0` (collision avoided because old row's seq was bumped to ≥1). Row identity survives re-invitation; full audit trail of every revocation cycle preserved.
- **Pros:** Clean Postgres-constraint enforcement; full audit history; matches Q12 uniform versioning posture (CLAUDE.md Architecture posture); no soft-delete-vs-hard-delete ambiguity.
- **Cons:** New column (~5 lines migration + ~2 lines in admin revoke route to compute next seq); conceptually similar to but distinct from `status_history` JSONB pattern; not used elsewhere in the codebase (precedent-zero in Nightwork).

**Option B (REJECTED at iter-1).** Soft-delete-on-revoke + hard cascade on re-invite. No new column. Revocation sets `revoked_at` timestamp; the row is conceptually "tombstoned." On re-invitation, the existing revoked row is HARD-DELETED (`DELETE FROM client_portal_access WHERE id = ... AND revoked_at IS NOT NULL`) immediately before the RPC INSERT, freeing the unique slot.
- **Pros:** Zero schema change beyond what's already in §5 Task 1; no new column.
- **Cons:** Violates CLAUDE.md "Never delete records — soft delete only" Dev Rule; breaks audit-log foreign-key chain via `activity_log.actor_token_id REFERENCES client_portal_access(id) ON DELETE SET NULL` (the FK fires SET NULL, severing the link to the revoked-then-deleted token); loses row identity across re-invitation cycles. **Multi-tenant-architect: rejected on soft-delete-rule + audit-chain-severance grounds.**

**Option C (REJECTED at iter-1).** Predicate the unique constraint with `revoked_at IS NULL`. Existing 00074:181-185 pattern (`client_portal_access_org_job_email_active`) does this for `(org_id, job_id, email)`. Re-invitation works naturally — revoked rows leave the unique scope.
- **Pros:** Single-statement predicate; matches 00074 precedent for `(org_id, job_id, email)` partial unique; zero net new schema beyond §5 Task 1 §1a-§1d.
- **Cons:** Re-introduces the timing oracle (revoked-token lookups miss the partial-predicate-narrowed index → seq-scan latency distinguishes revoked from never-existed). **Mechanically blocked by nwrp202 §4 timing-oracle prohibition.**

#### Plan-Author Latitude #4 — sliding-window UPDATE 90-day → 1-year in 2 RPCs — APPROVED IN-SCOPE

**Disposition (per iter-1 SYNTHESIS):** **APPROVED IN-SCOPE** by cross-reviewer alignment (security-reviewer + multi-tenant-architect + ai-logic-tester — 3-reviewer alignment).

**Reasoning:** NECESSARY CONSEQUENCE of nwrp200 1-year lock (not scope creep). Without consistent 1-year semantics across all RPCs that update `expires_at`, first token use rolls window back to 90 days, undermining nwrp200. **Scope-completeness CONFIRMED by ai-logic-tester Q8 query:** only 3 functions (`create_client_portal_invite`, `submit_client_portal_message`, `mark_client_portal_message_read`) touch `client_portal_access.expires_at`; no other RPCs/triggers.

**Background.** nwrp200 LOCKED 1-year fixed token expiration (supersedes 00074's 90-day sliding-window default). Two SECURITY DEFINER RPCs at `supabase/migrations/00074_client_portal.sql` contain sliding-window UPDATEs that extend `expires_at` to `now() + interval '90 days'` on every successful token use:
- `submit_client_portal_message` at 00074:448-494 (UPDATE at 00074:489)
- `mark_client_portal_message_read` at 00074:501-543 (UPDATE at 00074:540)

Without changing both RPCs to extend by `1 year` instead of `90 days`, the first use of any token after B-2a ship would slide the window back to 90 days — undermining the nwrp200 1-year decision.

**Implementation:** in-scope. Both RPC bodies authored inline in §5 Task 1 §3b + §3c. Change the single sliding-window-UPDATE-interval line in each RPC from `'90 days'` to `'1 year'`. Preserve everything else byte-for-byte (auth checks, `SET search_path = public, pg_temp`, silent-no-op patterns, message insert path).

**Net scope:** ~30 lines of SQL inside the migration body (full RPC re-author for 2 RPCs). Cost-impact: zero — this is the NECESSARY CONSEQUENCE of nwrp200 1-year LOCKED, not net new scope.

**Naming-error footnote.** Earlier PLAN drafts referred to a `consume_client_portal_token` RPC. No such RPC exists in 00074. The actual third RPC with a sliding-window UPDATE is `mark_client_portal_message_read` (00074:501-543). Footnote corrected during BLOCKER #2 fix.

## 3. Why now / dependencies

- **Sequencing rationale (per EXPANDED-SCOPE §8 + nwrp200):** B-2a is the FIRST plan in Slice-2 post-re-split. B-2b's read-only UI depends on B-2a's verified token-scoping helpers + RPC fix verification. B-3's per-table soft-delete trigger applies to B-2a's new `client_portal_access.client_id` FK shape. B-4..B-7 ship after B-3.
- **Slice-1 closed 2026-05-19** per nwrp189 (B-1b shipped + GATE 2 HALT review done). HALT GATE 0 satisfied.
- **TD-WAIC-03 RESOLVED 2026-05-20** via migration 00103 — PUBLIC EXECUTE on 7 trigger-internal SECURITY DEFINER functions revoked; pattern carried into B-2a's new RPC re-definition (`SET search_path = public, pg_temp` per 00102 precedent — applies to existing RPC as well since this is a `CREATE OR REPLACE`).
- **iter-1 B-2 work preservation (per nwrp200):** B-2-PLAN.md (963 lines) + 9 reviewer reports + SYNTHESIS remain on disk as historical artifacts; their substance IS the re-scope input. B-2a PLAN cites them with file:line precision; no copy-paste of stale scope.
- **Hook calibration phase shipped 2026-05-20** (stage-f1-hook-doc-only-detect via commit `c20e5d9`); doc-only commits skip qa-runs timestamp gate via the path-allowlist branch. B-2a is mixed-diff (migration + .ts + .tsx) so the fail-closed posture applies normally.

## 4. Resolution map — iter-1 SYNTHESIS B-1..B-11 → B-2a

Per CLAUDE.md Workflow Rule 9 (cross-reviewer factual disagreement HALT) + the 17 BLOCKING findings consensus structure, this PLAN explicitly maps each in-scope finding to a B-2a task. B-12..B-17 are deferred (B-2b scope or RESOLVED).

| Finding ID | Reviewer | Description | B-2a Resolution | CONTEXT.md D-NN |
|---|---|---|---|---|
| **B-1** | multi-tenant C-1 + ai-logic + rls-auditor | Application-layer scoping is convention, not construction | `getScopedOwnerPortalClient(resolvedToken)` helper in `src/lib/owner-portal/token.ts` (§5 Task 4) | D-13 |
| **B-2** | multi-tenant C-2 | `client_portal_access.client_id` FK lacks same-org invariant | Composite FK `(org_id, client_id) REFERENCES clients(org_id, id)` after `UNIQUE(org_id, id)` on clients (§5 Task 1 sub-step a + b) | D-01 |
| **B-3** | multi-tenant C-3 + ai-logic | Acknowledge step 3 SQL not pinned (intra-org cross-client leak via `.eq('id', drawId).eq('org_id', orgId)`) | `assertDrawBelongsToToken(drawId, resolvedToken)` helper with pinned SQL (§5 Task 4) | D-14 |
| **B-4** | rls-auditor W-4 | Existing `create_client_portal_invite` RPC produces `client_id=NULL` → PostgREST `.eq('client_id', null)` matches ALL rows | `CREATE OR REPLACE FUNCTION` derives `client_id` from `jobs.client_id` inside function body + RAISE if NULL (§5 Task 1 sub-step e); 3 falsifiable queries per AC-B2a-06 | D-05 + D-06 |
| **B-5** | rls-auditor W-1 | `/api/owner-portal/*` NOT in PUBLIC_PATHS — anon homeowner POST returns 401 before route handler | Middleware PUBLIC_PATHS adds BOTH `/owner/*` AND `/api/owner-portal/*` (§5 Task 5) | D-12 |
| **B-6** | security BLOCKING-1 | In-process Map rate-limit non-functional on Vercel (ephemeral serverless functions destroy Map per invocation) | DB-backed counter table + TTL cleanup function (§5 Task 1 sub-step h) + application-layer guard in `src/lib/owner-portal/rate-limit.ts` (§5 Task 8) | D-15 |
| **B-7** | security BLOCKING-2 | Partial index `WHERE revoked_at IS NULL` creates timing oracle (revoked-token lookup misses index → seq-scan delay distinguishes "revoked" from "never existed") | Full covering index `(org_id, client_id, job_id, revoked_seq)` + app-layer `revoked_at IS NULL` filter (§5 Task 1 sub-step d); PLUS BLK-3 DROP-recreate non-partial `idx_client_portal_access_token_hash` for token-resolution hot path; NO Jake-acceptance partial escape per nwrp202 §4 | D-04 |
| **B-8** | ai-logic BLOCKING-1 | PostgREST FK citation missing | `client_portal_access_client_id_fkey` (composite) + `client_portal_access_job_id_fkey` (inline FK on 00074:152) cited in §5 Task 1 sub-step b + AC-B2a-09; Rule 2 verification query added to §9 per BLK-6 | D-19 |
| **B-9** | database BLOCKING-1 + ai-logic NOTE | Partial unique index `WHERE revoked_at IS NULL` doesn't exclude expired-but-not-revoked tokens — expired token occupies `(org_id, client_id)` unique slot, blocks re-invitation | **Option A predicate**: `WHERE client_id IS NOT NULL` + `revoked_seq` in tuple (matches actual migration body at §5:1089-1091); admin must revoke expired tokens before re-inviting (semantic captured in AC-B2a-08) per BLK-5 disposition | D-03 |
| **B-10** | ai-logic NOTE-2 | Partial unique `(org_id, client_id)` blocks 1-client-N-jobs (a single homeowner with 2 jobs cannot have 2 tokens) | Composite key extended to `(org_id, client_id, job_id, revoked_seq)` (§5 Task 1 sub-step d) | D-03 |
| **B-11** | database BLOCKING-2 | `draws` + `change_orders` `job_id` indexes not verified — first production queries from external path | `draws.job_id` unfiltered single-column index added in 00104 (existing partial composites `idx_draws_job_number` / `idx_draws_job_status` are partial-on-`deleted_at` and cannot serve B-2a helper queries); `change_orders.job_id` verified extant at 00028:171 (§5 Task 1 sub-step i) | D-18 |

**B-12..B-16 deferred to B-2b:** TOCTOU race on acknowledge (B-12); `expected_updated_at` on append-only audit (B-13); missing `.is('deleted_at', null)` + status filters (B-14); `--shadow-popover` ClientCombobox token correction (B-15); NwButton TD-20 exemption (B-16).

**B-17 RESOLVED:** no new PATTERNS.md "Owner Status View" entry; existing §4h.3 + §2j.3 cover. B-2a-PLAN does NOT cite a new pattern entry.

## 5. Pre-flight downstream-consumer-sweep

Per CLAUDE.md Workflow posture Rule 6 + `.planning/lessons.md` 2026-05-15 entry: all plans MUST include downstream sweep before execute dispatch.

### Sweep 1 — `client_portal_access` consumers + RPC callers

```bash
# Existing consumers of the table + the RPC
grep -rn "client_portal_access\|create_client_portal_invite" src/ supabase/migrations/ scripts/ 2>/dev/null \
  | grep -v ".planning/" | grep -v "database.types.ts"
```

**Mechanical findings (executed at plan-author time, 2026-05-21):**

- **`src/lib/types/database.types.ts`** — generated types; regenerated as part of B-2a after migration apply.
- **`src/app/owner-portal/page.tsx`** + **`src/app/owner-portal/pay-apps/[id]/page.tsx`** — 1.5c thin-wrappers with Caldwell fixtures. Do NOT use the table at runtime (fixtures). UNTOUCHED by B-2a; superseded by B-2b's `/owner/{token}`.
- **`src/app/sub-portal/public/[token]/page.tsx`** + **`src/app/sub-portal/magic/[token]/page.tsx`** — DIFFERENT subcontractor-portal table. Visible via `client_portal_access` substring grep but unrelated; B-2a does NOT touch sub-portal.
- **`supabase/migrations/00074_client_portal.sql`** — origin migration. B-2a is a `CREATE OR REPLACE` extension; does NOT rewrite.
- **Drummond + harness-fixture-org token rows** — must be backfilled with non-NULL `client_id` via 00104 backfill UPDATE. Pre-flight SQL verifies via the DO-block fail-loud probe at the end of Task 1 sub-step c.

**Decision:** the existing `create_client_portal_invite` RPC has ONE production caller path (1.5c admin surface routes that create invites). B-2a's `CREATE OR REPLACE` preserves the function signature exactly (`p_org_id UUID, p_job_id UUID, p_email TEXT, p_name TEXT, p_visibility_config JSONB, p_expires_at TIMESTAMPTZ`); only the function body is changed to derive `client_id` from `jobs.client_id`. Zero downstream consumer change.

### Sweep 2 — `activity_log` consumers (actor_token_id column add)

```bash
grep -rn "from(\"activity_log\")\|FROM public.activity_log\|LogActivityArgs\|logActivity" \
  src/ scripts/ supabase/migrations/ 2>/dev/null
```

**Mechanical findings:**

- **`src/lib/activity-log.ts`** lines 56-63 — `LogActivityArgs` interface; extended in §5 Task 9 to add `actor_token_id?: string | null` field. Insert path (lines 73-81) appends `actor_token_id: args.actor_token_id ?? null` for type contract; ACTUAL homeowner-initiated writes are B-2b scope.
- **`src/lib/activity-log.ts`** line 92 — `logStatusChange` consumes `LogActivityArgs` shape. The Omit<…> type pickup includes the new field automatically; no separate handling.
- **`src/lib/audit/action-labels.ts`** — ENTITY_LABELS Record mirrors `ActivityEntityType` (per Slice-1 §3.2 precedent). B-2a does NOT add a new entity_type value (no `'owner_portal_token'` or similar); the existing `'draw'` entity_type covers the column's eventual B-2b consumer.
- **`src/components/audit/`** — audit timeline UI; will eventually render `actor_token_id`-bearing rows. Display label decision (e.g., "Homeowner via portal link") is B-2b scope; B-2a does NOT touch the timeline component.
- **Backfill:** existing `activity_log` rows remain `user_id`-populated; `actor_token_id` defaults NULL. No backfill required.

### Sweep 3 — middleware PUBLIC_PATHS extension impact

```bash
grep -rn "PUBLIC_PATHS\|isPublic\|/owner-portal\|/api/owner-portal" \
  src/ 2>/dev/null
```

**Mechanical findings:**

- **`src/middleware.ts:7`** — PUBLIC_PATHS constant currently: `["/", "/login", "/signup", "/pricing", "/forgot-password"]`. B-2a extends with `/owner` (covers `/owner/*` per existing `isPublic` `startsWith(`${p}/`)` matcher at line 33) AND `/api/owner-portal` (covers `/api/owner-portal/*` paths).
- **`src/middleware.ts:30-35`** — `isPublic()` checks `pathname === p || pathname.startsWith(`${p}/`)`. Adding `/owner` matches `/owner/{token}` (B-2b) AND `/owner/anything-else`. Adding `/api/owner-portal` matches `/api/owner-portal/admin/revoke-token` (B-2a) AND `/api/owner-portal/acknowledge` (B-2b).
- **`src/app/api/owner-portal/admin/revoke-token/route.ts`** — NEW B-2a file; the admin revocation route. **CRITICAL:** middleware adding `/api/owner-portal/*` to PUBLIC_PATHS does NOT mean the route is unauthenticated. The admin revoke route MUST call `getCurrentMembership()` + assert `owner` or `admin` role at route-handler entry. PUBLIC_PATHS only bypasses the auth REDIRECT, NOT the route handler's own auth check. Otherwise: cross-tenant revocation by any anon caller. Plan-author MUST cite this clarification at iter-1 review (multi-tenant-architect + security-reviewer mandatory).
- The PUBLIC_PATHS extension is mandatory per iter-1 SYNTHESIS B-5: without `/api/owner-portal/*` whitelisted, anon homeowner POST returns 401 BEFORE reaching B-2b's `/api/owner-portal/acknowledge` route handler. The route handler is where the token resolution happens. So the PUBLIC_PATHS extension is structural; the auth check then happens inside `getScopedOwnerPortalClient(token)`.

### Sweep 4 — optimistic-lock + service-role consumer compatibility

```bash
grep -rn "updateWithLock\|tryCreateServiceRoleClient\|createServiceRoleClient" \
  src/lib/ src/app/api/ 2>/dev/null | head -20
```

**Mechanical findings:**

- **`src/lib/api/optimistic-lock.ts:36-60`** — `updateWithLock<T>` signature: `(supabase, opts: { table, id, orgId, expectedUpdatedAt, updates, selectCols? })`. B-2a's admin revoke endpoint uses this for `client_portal_access` row mutation per D-11.
- **`src/lib/supabase/service.ts:11-42`** — `createServiceRoleClient()` + `tryCreateServiceRoleClient()`. B-2a uses `createServiceRoleClient()` for the admin revoke insert AND for the verification queries; not `tryCreate*` (admin revoke is critical-path, NOT logging).
- The admin revoke route flow: authenticated admin calls `/api/owner-portal/admin/revoke-token` → middleware allows (PUBLIC_PATHS) → route handler calls `getCurrentMembership()` (NOT bypassed by PUBLIC_PATHS) → asserts role IN ('owner', 'admin') → `updateWithLock` against `client_portal_access` with `expected_updated_at` → on success, writes `activity_log` with `user_id = membership.user_id`, `actor_token_id = NULL`, `entity_type = 'client_portal_access'`, `action = 'revoked'`, `details = { revoked_at: <iso> }`.

**RESOLVED (per WARNING #1 / iter-1 plan-checker):** plan-author commits to **path (a) — type-extension throughout**.

Rationale: CONTEXT D-10 explicitly REQUIRES "audit-log entry on revocation with `user_id` from the authenticated admin." Sentry breadcrumb-only would violate D-10 (a breadcrumb is not an audit-log row; it lives in Sentry scope only, disappears with the request, and is NOT queryable from the `activity_log` table). Deferring the audit-log write to B-2b would mean B-2a ships a partial implementation of MANDATORY admin revocation (per EXPANDED-SCOPE §6 Q5 LOCKED) — the gate semantics fail at AC-B2a-08.

**Concrete impact on B-2a scope** (embedded in §5 Task 3 + §5 Task 7):
1. Extend `ActivityEntityType` union at `src/lib/activity-log.ts:20-36` with `| "client_portal_access"` (1 line).
2. Extend `ActivityAction` union at `src/lib/activity-log.ts:38-54` with `| "revoked"` (1 line).
3. Add corresponding `ENTITY_LABELS` + `ACTION_LABELS` Record entries at `src/lib/audit/action-labels.ts:30,55` (2 lines; per BLOCKER #1 fix).
4. Admin revoke route writes the audit-log row directly via `logActivity()` helper — no Sentry breadcrumb dependence.

**Net scope add:** ~4 lines across 2 files (activity-log.ts + action-labels.ts); within the existing B-2a estimate (Task 3 already covers activity-log.ts; Task 3 expanded in BLOCKER #1 fix to cover action-labels.ts in the same atomic commit).

**Sentry breadcrumb optional supplementary** at route handler entry — NOT a substitute for the audit-log row. Belt + suspenders.

### Sweep 5 — hook regex precursor sweep (Rule 6a)

**Methodology (per BLOCKER #5 closure).** The prior PLAN draft cited "expected findings: all NEW files do NOT exist yet, so hook returns no hits" — a non-check. Real pre-flight requires (1) extracting the source code samples from §6.e (`src/lib/owner-portal/token.ts`), §6.f (`src/lib/owner-portal/rate-limit.ts`), Task 7 (admin revocation API route), Task 8 (admin UI page); (2) writing each to a tmp file; (3) running the hook's complete regex set against each. Captured output (2026-05-21 plan-author revision):

```bash
# Samples written to /tmp/b2a-preflight/{token.ts, rate-limit.ts, route.ts, page.tsx}
# extracted verbatim from the PLAN body sections cited above.
for FILE in /tmp/b2a-preflight/*.{ts,tsx}; do
  echo "--- $FILE ---"
  HEX_HITS=$(grep -nE "#[0-9a-fA-F]{6}\\b" "$FILE" | grep -vE "(globals\\.css|tailwind\\.config|//|/\\*)" || true)
  NAMED_HITS=$(grep -nE "\\b(bg|text|border|ring|fill|stroke|from|to|via|placeholder|caret|accent|outline|divide)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)\\b" "$FILE" || true)
  PURE_HITS=$(grep -nE "\\b(bg|text|border)-(white|black)\\b" "$FILE" || true)
  LEGACY_HITS=$(grep -nE "\\b(bg|text|border)-(cream|teal-(?!.*nw)|brass|brand|status|nightwork)-" "$FILE" 2>/dev/null || true)
  ORG_ID_HITS=$(grep -nE "(const|let|var)\\s+ORG_ID\\s*=" "$FILE" || true)
  CB4_HITS=$(grep -nE "cubic-bezier\\([^)]*,[^)]*,[^)]*,\\s*[1-9]\\.[0-9]" "$FILE" || true)
  CB2_HITS=$(grep -nE "cubic-bezier\\([^,]+,\\s*[1-9]\\.[0-9]" "$FILE" || true)
  ROUNDED_HITS=$(grep -nE "\\brounded(-(t|r|b|l|tl|tr|bl|br|ts|te|bs|be|s|e))?-(lg|xl|2xl|3xl|full)\\b" "$FILE" || true)
  SHADOW_HITS=$(grep -nE "box-shadow:\\s*[^;]*\\s+(2[1-9]|[3-9][0-9]|[1-9][0-9]{2,})px\\s+[1-9][0-9]*px" "$FILE" || true)
  PURPLE_HITS=$(grep -nE "hsl\\(\\s*(2[7-9][0-9]|3[01][0-9]|320)\\b" "$FILE" || true)
  # ... echo each variable's hit count
done
```

**Actual findings (executed 2026-05-21 against PLAN-body code samples):**

| File                    | HEX | NAMED | PURE | LEGACY | ORG_ID | CB4 | CB2 | ROUNDED | SHADOW | PURPLE |
|-------------------------|-----|-------|------|--------|--------|-----|-----|---------|--------|--------|
| token.ts (90 lines)     | 0   | 0     | 0    | 0      | 0      | 0   | 0   | 0       | 0      | 0      |
| rate-limit.ts (36 lines)| 0   | 0     | 0    | 0      | 0      | 0   | 0   | 0       | 0      | 0      |
| route.ts (68 lines)     | 0   | 0     | 0    | 0      | 0      | 0   | 0   | 0       | 0      | 0      |
| page.tsx (52 lines)     | 0   | 0     | 0    | 0      | 0      | 0   | 0   | 0       | 0      | 0      |

**Verdict:** PASS — 0 hits across all 4 PLAN-body code samples and all 10 hook regex categories. Pre-authoring discipline confirmed. The PLAN body code samples consume `bg-[var(--bg-card)]` / `text-[color:var(--text-primary)]` / `text-nw-slate-tile` / `p-[var(--space-3)]` / `rounded-[var(--radius-card)]` patterns from day one — no design-token drift introduced by this plan. Existing admin section conventions (`src/app/admin/users/page.tsx`, `src/app/admin/cost-codes/page.tsx`) provide the canonical pattern; B-2a admin page mirrors them.

**Hook scope note.** `.claude/hooks/nightwork-post-edit.sh` is JSON-stdin-driven (reads `tool_input.file_path` from stdin) and scans files under `src/*` or `supabase/migrations/*` only. The pre-flight above replicates the hook's exact regex set against the 4 NEW PLAN-body sample files; at execute time the same regex set fires on every Write/Edit to the real paths. Pre-authoring PASS does NOT preclude execute-time hook firing if the executor introduces a regex hit during implementation; the hook is the load-bearing gate, the pre-flight is the early-warning. Migration SQL pre-flight is N/A (the SQL hook block only checks RLS-on-CREATE-TABLE + DELETE FROM + DROP TABLE + TRUNCATE — all 4 explicitly considered in §6 and §5 Task 1; the 00104 migration creates `owner_portal_rate_limit` table WITH `ENABLE ROW LEVEL SECURITY` per §5c so the hook will pass).

### Sweep 6 — fixture infrastructure collision (Rule 6b)

```bash
# B-2a does NOT introduce new fixture rows. The backfill UPDATE in 00104 derives
# client_id from existing jobs.client_id (00100 already shipped). Pre-flight verifies
# Drummond + harness-fixture-org token rows have a valid client_id source.
mcp__supabase__execute_sql:
  SELECT cpa.id, cpa.org_id, cpa.job_id, j.client_id AS jobs_client_id
    FROM public.client_portal_access cpa
    JOIN public.jobs j ON j.id = cpa.job_id
   ORDER BY cpa.created_at;
```

**Expected findings:** every existing `client_portal_access` row has a `jobs.client_id` set (00100 backfill from B-1a; verified at Slice-1 close). The 00104 backfill UPDATE handles every row deterministically. The forward-probe DO block (sub-step c) raises EXCEPTION if any orphan remains.

### Sweep 7 — `files_modified` intersection check (Rule 5)

B-2a is the FIRST plan in Slice-2 post-re-split; no parallel peer plan exists at dispatch time. `parallel_execute_ok: false` in frontmatter. Intersection check N/A.

**B-2a → B-2b sequential by design** per nwrp200 charter; B-2b dispatch is GATED on B-2a GATE confirmation (EXPANDED-SCOPE §9 HALT GATE B-2a 8 verification items). The intersection check between B-2a + B-2b is not needed because they are not parallel-dispatched.

### Sweep 8 — gitignore + path reachability (Rule 6c)

```bash
# Every path declared in files_modified must be tracked by git from a fresh checkout
for f in \
  supabase/migrations/00104_b2a_token_issuance_security_model.sql \
  supabase/migrations/00104_b2a_token_issuance_security_model.down.sql \
  src/lib/types/database.types.ts \
  src/lib/owner-portal/token.ts \
  src/lib/owner-portal/rate-limit.ts \
  src/app/api/owner-portal/admin/revoke-token/route.ts \
  src/app/admin/owner-portal-tokens/page.tsx \
  src/app/admin/owner-portal-tokens/_components/RevokeTokenRow.tsx \
  src/middleware.ts \
  src/lib/activity-log.ts; do
  git check-ignore "$f" 2>&1
done
```

**Expected:** zero output (no path is gitignored). `src/lib/owner-portal/` + `src/app/api/owner-portal/admin/` + `src/app/admin/owner-portal-tokens/` are NEW directories; their parent paths (`src/lib/`, `src/app/api/`, `src/app/admin/`) are tracked already. New files inside tracked parents are automatically eligible.

## 6. Structural approach

### 6.a Same-org FK invariant (BY CONSTRUCTION — load-bearing per multi-tenant C-2)

**Decision: composite FK on `(org_id, client_id)` after composite UNIQUE on `clients(org_id, id)`. REJECT CHECK trigger alternative.**

#### Why composite FK over CHECK trigger (per CONTEXT D-01)

| Property | Composite FK (chosen) | CHECK trigger (rejected) |
|---|---|---|
| Enforcement layer | Postgres constraint (cannot bypass) | trigger function (can be bypassed via SECURITY DEFINER + role escalation) |
| Precedent in codebase | 4 established (00016:104, 00019:17, 00038:41 in `internal_billing_types`, 00083:30) | Zero — would be novel anti-pattern |
| Cost | one-line `UNIQUE(org_id, id)` add on `clients` (PK already covers `id`; redundancy is acceptable per Postgres planner — ANALYZE-time check confirms) | new trigger function + per-row overhead + new SECURITY DEFINER surface to harden |
| Bypass surface | Zero (FK is BY CONSTRUCTION) | TRIGGER's `SET search_path` must be hardened; SECURITY DEFINER could bypass scoping; trigger function audit-able but not enforce-able by Postgres |
| Rollback contract | Single `ALTER TABLE ... DROP CONSTRAINT` | DROP FUNCTION + DROP TRIGGER + cascade analysis |

The composite FK is the BY-CONSTRUCTION pattern per CLAUDE.md Architecture posture ("Multi-tenant RLS is non-negotiable... tenant safety is built BY CONSTRUCTION"). CHECK trigger is convention-with-bypass-risk per CONTEXT.md D-01 rationale. **No room for "either-or" per the EXPANDED-SCOPE §7 wording** ("composite FK ... OR explicit CHECK trigger — plan-author picks"); B-2a picks composite FK and surfaces the reasoning to iter-1 for security-reviewer + multi-tenant-architect signoff.

#### Migration ordering

The composite FK requires the parent `clients` table to have a UNIQUE constraint covering `(org_id, id)`. The standard Postgres pattern:

```sql
-- Step 1: add UNIQUE constraint on parent (clients)
ALTER TABLE public.clients ADD CONSTRAINT clients_org_id_id_unique UNIQUE (org_id, id);

-- Step 2: add child column (client_portal_access.client_id) nullable initially
ALTER TABLE public.client_portal_access ADD COLUMN client_id UUID;

-- Step 3: backfill client_id from jobs.client_id deterministically
UPDATE public.client_portal_access cpa
   SET client_id = j.client_id
  FROM public.jobs j
 WHERE cpa.job_id = j.id
   AND cpa.client_id IS NULL
   AND j.client_id IS NOT NULL;

-- Step 4: forward probe — every cpa row with a job that has a client_id
-- must now have client_id populated. RAISE EXCEPTION otherwise.
DO $$
DECLARE v_orphan BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_orphan
    FROM public.client_portal_access cpa
    JOIN public.jobs j ON j.id = cpa.job_id
   WHERE j.client_id IS NOT NULL AND cpa.client_id IS NULL;
  IF v_orphan > 0 THEN
    RAISE EXCEPTION 'B-2a forward probe FAILED: % cpa rows have job-with-client but unset client_id. Aborting.', v_orphan;
  END IF;
END $$;

-- Step 5: add composite FK NOT VALID first (avoids long lock; fast)
ALTER TABLE public.client_portal_access
  ADD CONSTRAINT client_portal_access_org_id_client_id_fkey
  FOREIGN KEY (org_id, client_id) REFERENCES public.clients(org_id, id)
  ON DELETE SET NULL
  NOT VALID;

-- Step 6: VALIDATE CONSTRAINT — fast scan; succeeds if backfill was clean
ALTER TABLE public.client_portal_access
  VALIDATE CONSTRAINT client_portal_access_org_id_client_id_fkey;
```

The composite FK constraint name is `client_portal_access_org_id_client_id_fkey` — cited in PostgREST FK citations per CLAUDE.md Workflow Rule 2 (resolves iter-1 SYNTHESIS B-8). The inline FK on `client_portal_access.job_id` from 00074:152 creates constraint name `client_portal_access_job_id_fkey` by Postgres auto-naming convention; also cited. Rule 2 verification query against `pg_constraint` added to §9 per BLK-6.

#### Single-column FK on `client_id` (in addition to composite)

The composite FK enforces same-org BY CONSTRUCTION but Postgres requires that any FK reference be exact. We also need `ON DELETE SET NULL` behavior on the child column when the parent (clients) row is deleted. The composite FK provides this; no separate single-column FK is needed. **However**, the column declaration must include `REFERENCES public.clients(id)` to make the type-system contract explicit at the column level — this is the canonical Postgres style:

```sql
-- Step 2 revised — column add with single-column FK declaration
ALTER TABLE public.client_portal_access
  ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
```

Postgres treats this as two independent constraints: the inline single-column FK (created with auto-name `client_portal_access_client_id_fkey`) AND the composite FK added in Step 5. Both must hold; together they enforce: `client_id IS NULL OR (clients.id == client_id AND clients.org_id == client_portal_access.org_id)`.

**Plan-author proposes the single-column FK at column-declaration time + composite FK as named constraint, both enforced.** Iter-1 reviewers verify this matches established multi-FK patterns (e.g., the dual FK on `org_members` from 00016 + 00098).

### 6.b RPC NULL-leak fix (load-bearing per rls-auditor W-4)

**Decision: `CREATE OR REPLACE FUNCTION` to derive `client_id` from `jobs.client_id` + RAISE on NULL. REJECT BEFORE INSERT trigger + route guard alternatives.**

#### Why CREATE OR REPLACE over trigger or route guard (per CONTEXT D-05)

| Property | CREATE OR REPLACE (chosen) | BEFORE INSERT trigger (rejected) | Route guard (rejected) |
|---|---|---|---|
| Pattern precedent in codebase | 4 instances in 00074 (lines 112, 390, 448, 501) + 1 in 00102 (line 51) | Zero in client_portal_access path | Zero — route guard is application-layer |
| Lines of change | ~5 (one SELECT statement injection + 1 RAISE) | Net new function + new trigger + interaction risk with existing SECURITY DEFINER | Per-route TS changes; convention-not-construction (CLAUDE.md Architecture posture forbids) |
| Bypass surface | Zero (function body cannot be bypassed by caller) | Trigger can be disabled (`ALTER TABLE ... DISABLE TRIGGER`); SECURITY DEFINER bypass risk | Application-layer convention; any code path skipping the guard leaks |
| Performance overhead | Single sub-SELECT inside existing function body (no new query) | Extra row-level trigger fire per INSERT | Negligible (already in route path) |

`CREATE OR REPLACE` is the canonical Nightwork pattern for RPC re-definition. The function signature is preserved exactly (`p_org_id UUID, p_job_id UUID, p_email TEXT, p_name TEXT, p_visibility_config JSONB, p_expires_at TIMESTAMPTZ`); only the body changes. Existing callers (1.5c admin surface) need no code change.

#### Function body change

The existing function (00074:390-439) inserts without setting `client_id`:

```sql
-- BEFORE — 00074:426-435 (the INSERT block)
INSERT INTO public.client_portal_access (
  org_id, job_id, email, name, access_token_hash,
  visibility_config, expires_at, created_by
) VALUES (
  p_org_id, p_job_id, p_email, p_name, _hash,
  COALESCE(p_visibility_config, '{}'::jsonb),
  COALESCE(p_expires_at, now() + interval '90 days'),
  auth.uid()
)
RETURNING id INTO _new_id;
```

The B-2a re-definition adds a `SELECT j.client_id INTO _client_id` step, a RAISE on NULL, and injects `_client_id` into the INSERT. It also locks `p_expires_at` default to 1-year (D-07) per nwrp200:

```sql
-- AFTER — B-2a re-definition body
DECLARE
  _plaintext TEXT;
  _hash TEXT;
  _new_id UUID;
  _client_id UUID;  -- NEW
BEGIN
  -- Existing auth check at function start (unchanged from 00074:407-421)
  -- ...

  -- NEW: derive client_id from jobs.client_id; RAISE if NULL (closes leak per D-05).
  SELECT j.client_id INTO _client_id
    FROM public.jobs j
   WHERE j.id = p_job_id
     AND j.org_id = p_org_id;  -- same-org guard (defense-in-depth; composite FK is BY-CONSTRUCTION)
  IF _client_id IS NULL THEN
    RAISE EXCEPTION 'B-2a invariant FAILED: jobs.id=% has NULL client_id (or job not found in p_org_id=%). Re-invite blocked until client identity assigned to job.', p_job_id, p_org_id;
  END IF;

  _plaintext := encode(extensions.gen_random_bytes(32), 'hex');
  _hash := encode(extensions.digest(_plaintext, 'sha256'), 'hex');

  INSERT INTO public.client_portal_access (
    org_id, job_id, client_id,  -- NEW
    email, name, access_token_hash,
    visibility_config, expires_at, created_by
  ) VALUES (
    p_org_id, p_job_id, _client_id,  -- NEW
    p_email, p_name, _hash,
    COALESCE(p_visibility_config, '{}'::jsonb),
    COALESCE(p_expires_at, now() + interval '1 year'),  -- D-07 (was 90 days)
    auth.uid()
  )
  RETURNING id INTO _new_id;

  RETURN QUERY SELECT _new_id, _plaintext;
END;
```

`SET search_path = public, pg_temp` preserved from existing (00074:400) — same SECURITY DEFINER hardening pattern per 00102 precedent. No change required to the search_path posture.

### 6.c Index posture eliminating timing oracle (security BLOCKING-2)

**Decision: TWO-PART fix per iter-1 SYNTHESIS cross-reviewer alignment (security + ai-logic).** (a) full covering index `(org_id, client_id, job_id, revoked_seq)` + app-layer filter on `revoked_at` and `expires_at` for the admin-UI lookup path; (b) DROP existing partial `idx_client_portal_access_token_hash WHERE revoked_at IS NULL` (00074:188-190) and recreate as NON-PARTIAL for the token-resolution hot path. REJECT partial-index escape per nwrp202 §4 (NO Jake-acceptance partial allowed).

#### Why full covering over partial (per CONTEXT D-04 + iter-1 SYNTHESIS B-7)

A partial index `WHERE revoked_at IS NULL` means:
- Lookup of a NOT-revoked token uses the index → fast (~1ms).
- Lookup of a revoked token misses the index → seq-scan → slow (~10-100ms depending on table size).
- An attacker timing repeated requests can distinguish "this token was once valid but is now revoked" from "this token never existed" — a timing oracle.

The full covering index includes all relevant columns. App-layer filters `WHERE revoked_at IS NULL AND expires_at > now()` apply post-index-scan, so revoked + expired tokens have the same lookup cost as never-existed tokens. **Timing oracle eliminated.**

Index definitions (admin-UI lookup path):

```sql
-- Full covering index — Index posture LOCKED per nwrp202 §4
-- App-layer applies WHERE revoked_at IS NULL AND expires_at > now()
CREATE UNIQUE INDEX client_portal_access_org_client_job_seq_unique
  ON public.client_portal_access (org_id, client_id, job_id, revoked_seq)
  WHERE client_id IS NOT NULL;

-- Lookup index for client → tokens reverse query (admin revocation UI)
CREATE INDEX idx_client_portal_access_client_id
  ON public.client_portal_access (client_id)
  WHERE client_id IS NOT NULL;
```

The UNIQUE index supports the 1-client-N-jobs rule (iter-1 SYNTHESIS B-10): a single client can have tokens for 2 different jobs in the same org (different `job_id`s allowed; same `(org_id, client_id, job_id)` triplet blocked unless `revoked_seq` differs). It is conditional on `client_id IS NOT NULL` because pre-backfill rows could (in rare cases) carry NULL `client_id` until the backfill UPDATE applies — though our forward probe at Step 4 rejects this state. Post-migration, the predicate excludes the (impossible-but-defended) NULL `client_id` rows from uniqueness. Predicate intentionally OMITS `revoked_at IS NULL` per the timing-oracle elimination — app-layer enforces revocation filtering. Re-invitation after revocation works via the `revoked_seq` discriminator (Option A per Latitude #3 disposition).

#### Token-resolution hot path — BLK-3 partial-index DROP+recreate

Per iter-1 SYNTHESIS BLK-3 cross-reviewer alignment (security-reviewer + ai-logic-tester), the existing token-hash index `idx_client_portal_access_token_hash` at 00074:188-190 is a UNIQUE PARTIAL index `WHERE revoked_at IS NULL`. The `resolveOwnerToken` helper (§6.e) queries `client_portal_access` by `access_token_hash` only — without the `revoked_at IS NULL` predicate. Postgres cannot use the partial index without the predicate; falls back to seq-scan for revoked-token lookups. Distinguishes "revoked" from "never existed" via measurable query timing.

**Fix:** DROP the existing partial + recreate as NON-PARTIAL. The non-partial index serves the query regardless of `revoked_at` value (the predicate is `WHERE TRUE`), so revoked + non-revoked + never-existed lookups all use the index and incur the same latency.

Migration body (forward):

```sql
-- BLK-3 fix per iter-1 SYNTHESIS cross-reviewer alignment (security + ai-logic):
-- Existing partial index at 00074:188-190 reintroduces timing oracle on token-resolution
-- hot path because resolveOwnerToken queries by access_token_hash only (without
-- revoked_at IS NULL predicate). DROP partial + recreate non-partial to serve the
-- query regardless of revoked_at value (eliminates the oracle entirely on hot path).
DROP INDEX IF EXISTS public.idx_client_portal_access_token_hash;
CREATE UNIQUE INDEX idx_client_portal_access_token_hash
  ON public.client_portal_access (access_token_hash);
```

Down migration restoration:

```sql
-- Down: restore 00074:188-190 partial index form
DROP INDEX IF EXISTS public.idx_client_portal_access_token_hash;
CREATE UNIQUE INDEX idx_client_portal_access_token_hash
  ON public.client_portal_access (access_token_hash)
  WHERE revoked_at IS NULL;
```

`access_token_hash` collision rates remain negligible (SHA256 256-bit keyspace; collision probability vanishingly small even at internet scale). Removing the partial predicate does NOT impose a practical UNIQUE-violation risk; only an attacker who could brute-force a hash collision could trigger one, which is computationally infeasible.

### 6.d 1-year token lifecycle + MANDATORY admin revocation

**Decision per nwrp200 + EXPANDED-SCOPE §6 Q5 LOCKED:** 1-year default expiration; mandatory admin revocation; existing 90-day sliding window from 00074 superseded.

#### Schema-default change in migration 00104

Two places carry the 90-day default in 00074:

1. **Column default** at 00074:174: `expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '90 days')`.
2. **RPC default fallback** at 00074:432: `COALESCE(p_expires_at, now() + interval '90 days')`.

B-2a changes BOTH to `now() + interval '1 year'`. The column default change is a DDL `ALTER COLUMN ... SET DEFAULT`; the RPC default fallback change is inside the `CREATE OR REPLACE` function body (already shown in §6.b above).

```sql
ALTER TABLE public.client_portal_access
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '1 year');
```

Existing rows are NOT affected (a `SET DEFAULT` change only affects future INSERTs). Existing tokens retain their original `expires_at`; new tokens get 1-year. Sliding-window UPDATE behavior on token use is updated to 1-year per Latitude #4 disposition (in-scope; cross-reviewer-approved by security + multi-tenant + ai-logic). **`submit_client_portal_message` at 00074:489 and `mark_client_portal_message_read` at 00074:540** both contain sliding-window UPDATEs; both are updated to `now() + interval '1 year'` in the §5 Task 1 §3b/§3c RPC re-definitions. The migration is atomic per D-17; the 1-year default is consistent across all sliding-window UPDATEs.

#### Admin revocation API path (D-08 + D-11)

`POST /api/owner-portal/admin/revoke-token` with body `{ token_id: string, expected_updated_at: string }`. Steps:

1. Middleware allows (PUBLIC_PATHS includes `/api/owner-portal/admin/*`).
2. Route handler **CSRF protection** (per iter-1 SYNTHESIS H-2): assert `request.headers.get('origin')` matches `process.env.NEXT_PUBLIC_APP_URL`; reject 403 on mismatch. Documents same-origin enforcement; SameSite=Lax cookie semantics plus explicit Origin header validation closes the CSRF surface. Reference: OWASP CSRF cheat sheet same-origin pattern.
3. Route handler calls `getCurrentMembership()` — NOT bypassed by PUBLIC_PATHS extension; PUBLIC_PATHS only allows auth-redirect-skip, not auth-check-skip.
4. Assert `membership.role IN ('owner', 'admin')`. PM role NOT allowed (admin function only). 403 otherwise.
5. Call `updateWithLock<{ id: string; updated_at: string }>(supabase, { table: 'client_portal_access', id: token_id, orgId: membership.org_id, expectedUpdatedAt: expected_updated_at, updates: { revoked_at: new Date().toISOString(), revoked_seq: <max+1> } })` — uses optimistic-lock per D-11.
6. On success: write audit-log row via `logActivity()` helper with `user_id = membership.user_id`, `actor_token_id = NULL`, `entity_type = 'client_portal_access'`, `entity_id = token_id`, `action = 'revoked'`, `details = { revoked_at: <iso> }`. `'client_portal_access'` + `'revoked'` are NEW union members added in §5 Task 3 (Records mirror per B-1a-bis precedent).
7. Return 200 + `{ revoked: true, revoked_at: now_iso }`. On `isLockConflict`: return the conflict response from `updateWithLock`.

**Threat-model entries (per iter-1 SYNTHESIS H-2):**

- **T-B2a-08 CSRF (NEW):** Admin revoke POST endpoint authenticated by SameSite=Lax cookie + Origin header validation per same-origin OWASP pattern. Mitigation: Origin header check at route handler entry (before getCurrentMembership). Rejects cross-origin requests with 403. No CSRF token storage required because same-origin enforcement at Origin header level is mechanically sufficient — a cross-origin attacker cannot spoof the Origin header from a browser context (Origin is a forbidden-write header per Fetch spec).
- **T-B2a-08-rate-limit (NEW per iter-1 SYNTHESIS W-2):** Admin revocation rate-limit applies IP-level only (`recordOwnerPortalRequest('ip', requestIp)`). Per-membership.user_id rate-limit deferred to Wave 1.1-Lite if observation surfaces abuse. Disposition: **accept** with rationale — admin sessions are authenticated (`getCurrentMembership()` gate) + optimistic-lock-bound (`updateWithLock`) + audit-logged on every revocation. A compromised admin account is bounded by these gates; the IP-level cap is a backstop against scripted revocation of all org tokens. If observation surfaces abuse (multiple admins revoking under the same IP, or per-membership abuse not caught by IP rate-limit), Wave 1.1-Lite adds `recordOwnerPortalRequest('user_id', membership.user_id)` to Task 7 step 3.

**OPTIONAL Sentry breadcrumb** at function entry: `Sentry.addBreadcrumb({ category: 'owner_portal.revoke', message: 'token_revoked', data: { token_id, revoked_by_user_id: membership.user_id, org_id: membership.org_id } })`. NOT a substitute for the audit-log row; supplementary observability.

#### Admin revocation UI surface (D-09) — minimum viable

Plan-author proposes a single page at `/admin/owner-portal-tokens/page.tsx`:

- Server component; calls `getCurrentMembership()`; gates to `owner|admin` role; queries `client_portal_access` for the org (RLS-scoped + `.is('deleted_at', null)` if applicable — note: client_portal_access does NOT have `deleted_at` per 00074 schema, so no soft-delete filter); orders by `created_at DESC`; renders a table with columns: token ID, job (joined name), client (joined full_name), created_at, expires_at, last_accessed_at, revoked_at, "Revoke" button.
- Each "Revoke" button is rendered by `RevokeTokenRow.tsx` (client component) which POSTs to `/api/owner-portal/admin/revoke-token` and refreshes the page.
- Revoked tokens show `revoked_at` populated + button disabled with "Revoked" label.
- Token list excludes service-role-API-internal token rows IF any exist (none currently per Sweep 1; if any appear post-B-2b they MAY be filtered here — TBD at iter-1).

The page does NOT show plaintext tokens (only ever returned once at invite creation; not stored). Layout consumes existing admin section design tokens (mirror `/admin/users/page.tsx` or `/admin/cost-codes/page.tsx`).

**Scope check:** ~150 lines of new TSX (page + sub-component + API route). Within B-2a $30-45 estimate per EXPANDED-SCOPE §10. Halt-and-surface escape valve per D-16 if scope balloons.

### 6.e Helpers — convention to construction (D-13 + D-14)

**Decision: `getScopedOwnerPortalClient(resolvedToken)` + `assertDrawBelongsToToken(drawId, resolvedToken)` in `src/lib/owner-portal/token.ts`.**

The helpers are **server-only** (no `"use client"`); throwing on misuse (e.g., from a client component) is acceptable Defense-in-depth. The module:

```typescript
// src/lib/owner-portal/token.ts — NEW B-2a helper module

import "server-only";  // throws at client-bundle build time if accidentally imported into a client component
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * A resolved owner-portal token: the result of validating a plaintext token
 * against the database. Carries the FK constraint values that downstream
 * queries must filter on.
 */
export interface ResolvedOwnerToken {
  portal_access_id: string;
  org_id: string;
  client_id: string;
  job_id: string;
  invited_at: string;
  expires_at: string;
  revoked_at: string | null;
}

/**
 * Resolve a plaintext token to its underlying client_portal_access row.
 * Returns null if the token is invalid, expired, or revoked. Service-role
 * mediated; bypasses RLS because the lookup is by hash-eq.
 *
 * Returns null in three cases (timing-uniform — no leak between them):
 *   - no row matches the hash
 *   - the row's expires_at <= now()
 *   - the row's revoked_at IS NOT NULL
 *
 * Per iter-1 SYNTHESIS B-7 + nwrp202 §4 + BLK-3: revocation + expiration
 * filters applied app-layer, NOT via partial index. Non-partial token-hash
 * index (per BLK-3 fix) serves the query regardless of revoked_at, so all
 * three null-paths share the same latency. Timing oracle eliminated.
 *
 * @throws never — returns null on any failure mode.
 */
export async function resolveOwnerToken(
  plaintextToken: string
): Promise<ResolvedOwnerToken | null> {
  if (typeof plaintextToken !== "string" || plaintextToken.length !== 64) {
    return null;
  }
  const hash = createHash("sha256").update(plaintextToken).digest("hex");
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("client_portal_access")
    .select("id, org_id, client_id, job_id, invited_at, expires_at, revoked_at")
    .eq("access_token_hash", hash)
    .maybeSingle();
  if (error || !data) return null;
  // App-layer filters per D-04 (no partial index timing oracle).
  if (data.revoked_at !== null) return null;
  if (new Date(data.expires_at).getTime() <= Date.now()) return null;
  if (data.client_id === null) return null;  // post-B-4 invariant; defensive.
  return {
    portal_access_id: data.id,
    org_id: data.org_id,
    client_id: data.client_id,
    job_id: data.job_id,
    invited_at: data.invited_at,
    expires_at: data.expires_at,
    revoked_at: data.revoked_at,
  };
}

/**
 * Return a service-role Supabase client pre-scoped to the resolved token's
 * (org_id, client_id) scope. Every subsequent query MUST go through this
 * client; the returned wrapper's .from() builder injects the scope filters
 * automatically.
 *
 * Per iter-1 SYNTHESIS B-1: converts application-layer scoping from
 * convention to construction. Authors of B-2b cannot forget the .eq()
 * filters because the wrapper applies them.
 *
 * Tables that consume this wrapper's scope contract: jobs, draws,
 * change_orders, lien_releases, documents (the B-2b read set).
 *
 * Tables that DO NOT make sense to query through this wrapper: anything
 * tenant-foreign (e.g., organizations table). The wrapper does NOT
 * disallow such queries explicitly — callers are responsible — but the
 * scope-injected select is enforced via wrapping.
 */
export function getScopedOwnerPortalClient(
  resolvedToken: ResolvedOwnerToken
): ScopedOwnerPortalClient {
  const supabase = createServiceRoleClient();
  return new ScopedOwnerPortalClient(supabase, resolvedToken);
}

class ScopedOwnerPortalClient {
  constructor(
    private supabase: SupabaseClient,
    private resolvedToken: ResolvedOwnerToken
  ) {}

  /**
   * Issue a SELECT query against `tableName` that is pre-filtered by
   * the token's org_id + (where applicable) client_id and job_id.
   *
   * For `jobs`: filters on (id = token.job_id, client_id = token.client_id, org_id = token.org_id).
   * For `draws` + `change_orders`: filters on (job_id = token.job_id, org_id = token.org_id).
   * For anything else: filters on (org_id = token.org_id) only — caller must add finer filters.
   */
  scopedFrom(tableName: "jobs" | "draws" | "change_orders" | "lien_releases") {
    const base = this.supabase.from(tableName);
    if (tableName === "jobs") {
      return base
        .eq("id", this.resolvedToken.job_id)
        .eq("client_id", this.resolvedToken.client_id)
        .eq("org_id", this.resolvedToken.org_id);
    }
    // draws + change_orders + lien_releases all filter on job_id + org_id
    return base
      .eq("job_id", this.resolvedToken.job_id)
      .eq("org_id", this.resolvedToken.org_id);
  }
}

/**
 * Assert that the given draw_id belongs to the resolved token's client + org
 * scope. Returns true iff the draw exists AND its job belongs to the token's
 * client + org. Returns false otherwise. Never throws.
 *
 * Pinned SQL per iter-1 SYNTHESIS B-3: the only acceptable scope check is
 * via JOIN to jobs + verification that jobs.client_id == token.client_id
 * AND jobs.org_id == token.org_id AND draws.org_id == token.org_id.
 *
 * Consumed by B-2b's acknowledge endpoint — without this helper, the
 * acknowledge route could use only .eq('id', drawId).eq('org_id', orgId)
 * which permits an intra-org cross-client probe (another client's draw_id
 * in the same org would resolve).
 */
export async function assertDrawBelongsToToken(
  drawId: string,
  resolvedToken: ResolvedOwnerToken
): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("draws")
    .select("id, job_id, org_id, jobs!inner(id, client_id, org_id)")
    .eq("id", drawId)
    .eq("org_id", resolvedToken.org_id)
    .eq("job_id", resolvedToken.job_id)
    .maybeSingle();
  if (error || !data) return false;
  // Cross-validate jobs join.
  // PostgREST embed reads `data.jobs` as the joined row; cite FK
  // constraint name draws_job_id_fkey (auto-named from inline FK).
  const job = (data as unknown as { jobs?: { id?: string; client_id?: string; org_id?: string } }).jobs;
  if (!job || job.org_id !== resolvedToken.org_id) return false;
  if (job.client_id !== resolvedToken.client_id) return false;
  return true;
}
```

### 6.f Rate-limit infrastructure (DB-backed counter table per D-15)

**Decision: DB-backed counter table with TTL cleanup function. Per-token + per-IP keys.**

#### Why DB-backed (per nwrp201 + nwrp202 §3)

- Vercel KV not provisioned (verified at plan-author time via `.env` probe — no `KV_REST_API_URL` / `KV_REST_API_TOKEN`).
- Upstash not provisioned (no `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`).
- Adding a new third-party service to the critical path of a security primitive is a discipline + cost concern.
- Owner Portal traffic profile is low (homeowners checking progress occasionally — single-digit requests/hour per token).
- Postgres write throughput on a single counter table is non-trivial but well within Supabase's capacity for the projected traffic.

#### Counter table shape

```sql
-- Rate-limit counter table (B-2a)
-- Keyed by (key_type, key_value, window_start). Window granularity: 60s.
-- TTL cleanup: any row with window_start < (now() - interval '5 minutes')
-- is eligible for cleanup. Cleanup function called inline on every INSERT
-- (no pg_cron needed — Nightwork has no pg_cron precedent).
CREATE TABLE public.owner_portal_rate_limit (
  id BIGSERIAL PRIMARY KEY,
  key_type TEXT NOT NULL CHECK (key_type IN ('token', 'ip')),
  key_value TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  UNIQUE (key_type, key_value, window_start)
);

CREATE INDEX idx_owner_portal_rate_limit_window
  ON public.owner_portal_rate_limit (window_start);

-- TTL cleanup function — called inline by application-layer code on every
-- recordRequest() call. Deletes rows older than 5 minutes. Cheap operation
-- because the index above orders by window_start.
CREATE OR REPLACE FUNCTION public.cleanup_owner_portal_rate_limit()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp  -- 00102 hardening
AS $$
BEGIN
  DELETE FROM public.owner_portal_rate_limit
   WHERE window_start < now() - interval '5 minutes';
END;
$$;

-- Revoke PUBLIC EXECUTE per 00103 precedent (defense-in-depth)
REVOKE EXECUTE ON FUNCTION public.cleanup_owner_portal_rate_limit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_owner_portal_rate_limit() TO service_role;

-- RLS: NONE on the rate-limit table (service-role-only access; anon has no path)
ALTER TABLE public.owner_portal_rate_limit ENABLE ROW LEVEL SECURITY;
-- No policies defined → all role access blocked except service_role bypass.
GRANT SELECT, INSERT, UPDATE ON public.owner_portal_rate_limit TO service_role;
```

#### Application-layer guard

`src/lib/owner-portal/rate-limit.ts`:

```typescript
import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service";

const TOKEN_LIMIT_PER_MINUTE = 30;  // per-token bursts (3 surfaces × 10 requests/window)
const IP_LIMIT_PER_MINUTE = 60;     // per-IP global cap

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

/**
 * Record a request from key_type/key_value and return whether it's within
 * the limit. Atomic UPSERT pattern via Postgres ON CONFLICT.
 *
 * Cleanup: opportunistic — every 100th call triggers cleanup_*(). Cheap
 * fallback when no caller checks: rows accumulate but are bounded by
 * the index-aided DELETE.
 */
export async function recordOwnerPortalRequest(
  keyType: "token" | "ip",
  keyValue: string
): Promise<RateLimitResult> {
  const supabase = createServiceRoleClient();
  // Round window down to the nearest minute (UTC).
  const window = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString();
  // Use the atomic increment RPC (see Task 1 §5d) for race-free count update.
  const { data, error } = await supabase.rpc("record_owner_portal_request", {
    p_key_type: keyType,
    p_key_value: keyValue,
    p_window_start: window,
  });
  if (error) {
    // Fail-open with Sentry breadcrumb. Better to leak rate-limit than block users.
    return { allowed: true };
  }
  const count = (data as number) ?? 1;
  const limit = keyType === "token" ? TOKEN_LIMIT_PER_MINUTE : IP_LIMIT_PER_MINUTE;
  if (count > limit) {
    const retryAfter = 60 - ((Date.now() % 60000) / 1000);
    return { allowed: false, retryAfterSeconds: Math.ceil(retryAfter) };
  }
  // Opportunistic cleanup every 100 requests.
  if (Math.random() < 0.01) {
    await supabase.rpc("cleanup_owner_portal_rate_limit").throwOnError();
  }
  return { allowed: true };
}
```

The RPC approach (atomic INSERT-ON-CONFLICT-DO-UPDATE returning count) is plan-author latitude per CONTEXT.md "Plan-author CHOICES surfaced to iter-1 reviewers" — chosen in §5 Task 1 sub-step h below.

#### Halt-and-surface escape valve (D-16)

If rate-limit infrastructure scope balloons (e.g., the RPC + cleanup function + tests + integration push B-2a past $50 per-plan halt gate per Rule 7d), plan-author halts mid-authoring + surfaces to Jake; possible micro-plan split (`B-2a` = security model, `B-2a-rate-limit` = isolated rate-limit infra). NOT pre-decided. Plan-author asserts $30-45 estimate per EXPANDED-SCOPE §10 — at boundary, monitoring required throughout execute phase.

### 6.g Middleware extension (D-12)

Single-line addition to `src/middleware.ts:7`. Per iter-1 SYNTHESIS W-1, PUBLIC_PATHS entries are split to clarify each entry's auth model:

```typescript
// BEFORE
const PUBLIC_PATHS = ["/", "/login", "/signup", "/pricing", "/forgot-password"];

// AFTER (B-2a) — PUBLIC_PATHS bypasses auth-redirect; route handlers still enforce auth
const PUBLIC_PATHS = [
  "/", "/login", "/signup", "/pricing", "/forgot-password",
  "/owner",                           // /owner/{token} — anon homeowner UI (B-2b)
  "/api/owner-portal/acknowledge",    // anon homeowner pay-app acknowledge (B-2b; reaches handler)
  "/api/owner-portal/admin",          // authenticated admin (B-2a; handler enforces via getCurrentMembership())
];
```

The existing `isPublic` matcher (lines 30-35) handles `/owner/{token}` (matches `/owner` prefix), `/api/owner-portal/acknowledge` (B-2b anon endpoint), AND `/api/owner-portal/admin/revoke-token` (B-2a authenticated-admin endpoint). Per Sweep 3: PUBLIC_PATHS only bypasses the auth-redirect; route handlers (admin revoke, B-2b acknowledge) MUST do their own auth checks via `getCurrentMembership()` or `resolveOwnerToken()`.

### 6.h `activity_log.actor_token_id` column + LogActivityArgs extension (D-23)

Column add in migration 00104:

```sql
ALTER TABLE public.activity_log
  ADD COLUMN actor_token_id UUID REFERENCES public.client_portal_access(id) ON DELETE SET NULL;

CREATE INDEX idx_activity_log_actor_token
  ON public.activity_log (actor_token_id)
  WHERE actor_token_id IS NOT NULL;
```

The FK ON DELETE SET NULL preserves the audit row if the token is hard-deleted (rare; soft-delete via `revoked_at` is the normal path). FK constraint name auto-named: `activity_log_actor_token_id_fkey`.

`LogActivityArgs` interface extension in `src/lib/activity-log.ts:56-63`:

```typescript
interface LogActivityArgs {
  org_id: string;
  user_id?: string | null;
  actor_token_id?: string | null;  // NEW (B-2a): present when action originated from owner-portal token-context; B-2b writes
  entity_type: ActivityEntityType;
  entity_id?: string | null;
  action: ActivityAction;
  details?: Record<string, unknown> | null;
}
```

Insert path (lines 73-81) extended:

```typescript
const { error } = await supabase.from("activity_log").insert({
  org_id: args.org_id,
  user_id: args.user_id ?? null,
  actor_token_id: args.actor_token_id ?? null,  // NEW
  entity_type: args.entity_type,
  entity_id: args.entity_id ?? null,
  action: args.action,
  details: args.details ?? null,
});
```

**NOTE per CONTEXT D-23 + Sweep 2:** B-2a adds the column + extends the interface but does NOT write `actor_token_id` rows. The B-2b acknowledge endpoint is the first runtime writer. The B-2a admin revoke API writes `user_id` (NOT `actor_token_id` — the revoker is an authenticated admin, NOT a homeowner-via-token per D-10).

**No DB CHECK constraint on mutual-exclusion** — both fields can be NULL legitimately (e.g., service-role context insertion from a future trigger; B-3 trigger writes for soft-delete; bootstrap migrations). Application-layer enforcement via the helper logActivity caller is sufficient. Surfaced to iter-1 for explicit security-reviewer signoff.

### 6.i `draws.job_id` index addition + `change_orders.job_id` verification (D-18)

Pre-flight verification at plan-author time (already executed):
- `change_orders.job_id` index: EXISTS at 00028:171 (`idx_change_orders_job_id`). Verified.
- `draws.job_id` index: no unfiltered single-column index on `draws.job_id` exists; existing partial composites (`idx_draws_job_number`, `idx_draws_job_status`) are partial-on-`deleted_at` and cannot serve B-2a helper queries that don't filter `deleted_at IS NULL` (N-3 prose-imprecision corrected per iter-1 SYNTHESIS).

B-2a migration 00104 adds the missing unfiltered single-column index:

```sql
-- Per iter-1 SYNTHESIS B-11 + D-18: no unfiltered single-column index on
-- draws.job_id exists today; the two existing partial composites are
-- partial-on-deleted_at and cannot serve helper queries that don't filter
-- deleted_at IS NULL. First user-facing portal query path would seq-scan
-- the table without an unfiltered single-column index.
CREATE INDEX IF NOT EXISTS idx_draws_job_id ON public.draws (job_id);
```

The `IF NOT EXISTS` clause makes the migration safe to re-run.

### 6.j Threat model — HIGH severity (per nwrp200 escalation)

**Severity escalation rationale:** external token surface + cross-tenant leak closure surface + foundational security infrastructure for the FIRST user-facing F1 UI + first DB-backed rate-limit infrastructure in the codebase. Was MEDIUM for B-2; escalated to HIGH for B-2a per nwrp200.

| Threat ID | Category | Component | Disposition | Mitigation |
|---|---|---|---|---|
| T-B2a-01 | I (Info disclosure) | `create_client_portal_invite` RPC | mitigate | `CREATE OR REPLACE` derives `client_id` from `jobs.client_id`; RAISE if NULL (closes B-4 leak per D-05) |
| T-B2a-02 | I | `client_portal_access` cross-org via FK bypass | mitigate | Composite FK `(org_id, client_id) REFERENCES clients(org_id, id)` enforces same-org at Postgres constraint level (BY CONSTRUCTION per D-01) |
| T-B2a-03 | I | App-layer scoping bypass via missed `.eq()` filter | mitigate | `getScopedOwnerPortalClient` helper enforces scope at type-system level (BY CONSTRUCTION per D-13); reviewers verify no B-2b code path bypasses |
| T-B2a-04 | I | Intra-org cross-client probe via acknowledge route | mitigate | `assertDrawBelongsToToken` helper with pinned SQL JOIN to jobs (BY CONSTRUCTION per D-14); B-2b acknowledge route MUST call before mutation |
| T-B2a-05 | I | Timing oracle distinguishing revoked vs never-existed tokens (admin-UI path) | mitigate | Full covering index + app-layer filter on `revoked_at` + `expires_at` (eliminates index-miss timing per D-04); NO partial-index escape |
| T-B2a-05b | I | Timing oracle on token-resolution hot path via existing partial `idx_client_portal_access_token_hash WHERE revoked_at IS NULL` (00074:188-190) | mitigate | DROP partial + recreate NON-PARTIAL per BLK-3 iter-1 SYNTHESIS cross-reviewer alignment (security + ai-logic); index serves token-resolution query regardless of revoked_at value |
| T-B2a-06 | E (Elevation) | Token expiration too long → leak window | mitigate | 1-year + MANDATORY admin revocation (D-07 + D-08 + D-09); revocation makes 1-year acceptable per Jake reasoning in EXPANDED-SCOPE §6 Q5 |
| T-B2a-07 | D (DoS) | Brute-force token enumeration | mitigate | 256-bit entropy (2^256 keyspace; unchanged) + DB-backed rate-limit (per-token + per-IP; D-15) |
| T-B2a-08 | T (Tampering) | Admin revoke API called by unauthorized actor | mitigate | Route handler calls `getCurrentMembership()` (PUBLIC_PATHS bypass auth-redirect only, NOT auth-check) + asserts `owner|admin` role; cross-tenant revocation impossible |
| T-B2a-08b | T (Tampering) | CSRF on admin revoke POST | mitigate | Origin header validation (per iter-1 SYNTHESIS H-2): assert `request.headers.get('origin')` matches `process.env.NEXT_PUBLIC_APP_URL`; reject 403 on mismatch. Same-origin enforcement via Origin header (forbidden-write header per Fetch spec) — no CSRF token storage required. OWASP CSRF cheat sheet same-origin pattern. |
| T-B2a-08c | E | Admin revocation rate-limit IP-only (no per-membership.user_id key) | accept | Per iter-1 SYNTHESIS W-2 disposition (a): admin sessions are authenticated (`getCurrentMembership()` gate) + optimistic-lock-bound (`updateWithLock`) + audit-logged on every revocation. Compromised admin account is bounded by these gates; IP-level cap is a backstop against scripted revocation of all org tokens. Per-membership.user_id rate-limit deferred to Wave 1.1-Lite if observation surfaces abuse. |
| T-B2a-09 | T | Admin revoke race (double-revoke concurrent) | mitigate | `updateWithLock` with `expected_updated_at` per D-11; conflict returns 409 |
| T-B2a-10 | I | activity_log poisoning via direct anon INSERT | mitigate | Existing RLS RESTRICTIVE on activity_log (00026:99-101); anon has zero INSERT policy; only `logActivity()` helper (service-role) writes |
| T-B2a-11 | I | SECURITY DEFINER function search_path mutability | mitigate | `SET search_path = public, pg_temp` on all new SECURITY DEFINER functions (per 00102 precedent); applies to rate-limit cleanup + re-defined existing RPCs (already had it) |
| T-B2a-12 | E | SECURITY DEFINER function PUBLIC EXECUTE inheritance | mitigate | `REVOKE EXECUTE ... FROM PUBLIC` on new SECURITY DEFINER functions (per 00103 precedent); ALSO on re-defined 3 existing RPCs per BLK-4 iter-1 SYNTHESIS (REVOKE+GRANT pair after each CREATE OR REPLACE — role list per 00074 verbatim) |
| T-B2a-13 | I | Rate-limit counter table cross-tenant data leak | mitigate | `key_value` is opaque (token-hash or IP); no tenant data stored; service-role-only access; no RLS-policied row access |
| T-B2a-14 | D | Rate-limit table unbounded growth | mitigate | TTL cleanup function `cleanup_owner_portal_rate_limit()` deletes rows older than 5 minutes; called opportunistically on every 100th request |
| T-B2a-15 | E | revoked_seq race on concurrent re-invitation | accept | If two admins concurrently revoke + re-invite, the second `INSERT` may collide on unique constraint; this is desired (idempotency); UNIQUE conflict surfaces an error to the second caller naturally |

**Out-of-scope threats (deferred):**
- T-B2a-OOS-01 (Token in URL leaks via referer / browser history) — Wave 1.1-Lite per EXPANDED-SCOPE Q5; mitigation considered: `Referrer-Policy: no-referrer` header on `/owner/*` routes (B-2b scope).
- T-B2a-OOS-02 (Multi-region rate-limit consistency) — Wave 1.1-Lite scale; single-region DB-backed sufficient.
- T-B2a-OOS-03 (TOCTOU close on acknowledge) — B-2b scope per iter-1 SYNTHESIS B-12.

## 7. Implementation tasks

Atomic commit boundaries explicit. Each task targets a single concern + a single commit body. Cost projection: §10.

### Task 1 — Migration `00104_b2a_token_issuance_security_model.sql` + `.down.sql`

**Files:**
- `supabase/migrations/00104_b2a_token_issuance_security_model.sql` (NEW)
- `supabase/migrations/00104_b2a_token_issuance_security_model.down.sql` (NEW)

**Action:** atomic single-migration containing 10 logical sub-steps per D-17 (sub-step §1k added per BLK-3). Pre-flight DO block verifies fixture-harness-org + Drummond baselines; forward probe DO block raises EXCEPTION if backfill leaves orphans; final NOTIFY pgrst.

#### SQL (forward) — outline (full body authored at execute time)

```sql
BEGIN;

-- =========================================================================
-- B-2a — Token issuance security model (Owner Portal Path A foundation)
-- Atomic single migration per D-17. Cohesive rollback unit.
-- =========================================================================

-- §0 — Pre-flight: verify baseline. Informational; does NOT fail.
DO $$
DECLARE v_cpa_count INT; v_clients_count INT;
BEGIN
  SELECT COUNT(*) INTO v_cpa_count FROM public.client_portal_access;
  SELECT COUNT(*) INTO v_clients_count FROM public.clients;
  RAISE NOTICE 'B-2a pre-flight: client_portal_access=%, clients=%', v_cpa_count, v_clients_count;
END $$;

-- §1a — UNIQUE(org_id, id) on clients (composite FK parent precondition)
ALTER TABLE public.clients
  ADD CONSTRAINT clients_org_id_id_unique UNIQUE (org_id, id);

-- §1b — Column add on client_portal_access (single-column FK; nullable initially)
ALTER TABLE public.client_portal_access
  ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- §1c — Backfill from jobs.client_id (deterministic; 00100 already shipped)
UPDATE public.client_portal_access cpa
   SET client_id = j.client_id
  FROM public.jobs j
 WHERE cpa.job_id = j.id
   AND cpa.client_id IS NULL
   AND j.client_id IS NOT NULL;

-- §1c2 — Forward probe: every cpa row whose job has a client_id must now have client_id populated
DO $$
DECLARE v_orphan BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_orphan
    FROM public.client_portal_access cpa
    JOIN public.jobs j ON j.id = cpa.job_id
   WHERE j.client_id IS NOT NULL AND cpa.client_id IS NULL;
  IF v_orphan > 0 THEN
    RAISE EXCEPTION 'B-2a §1c forward probe FAILED: % cpa rows orphaned. Aborting.', v_orphan;
  END IF;
END $$;

-- §1d — Composite FK NOT VALID first (fast; no long lock), then VALIDATE
ALTER TABLE public.client_portal_access
  ADD CONSTRAINT client_portal_access_org_id_client_id_fkey
  FOREIGN KEY (org_id, client_id) REFERENCES public.clients(org_id, id)
  ON DELETE SET NULL
  NOT VALID;
ALTER TABLE public.client_portal_access
  VALIDATE CONSTRAINT client_portal_access_org_id_client_id_fkey;

-- §1e — revoked_seq column for re-invitation pattern (Option A per Latitude #3 APPROVED).
ALTER TABLE public.client_portal_access
  ADD COLUMN revoked_seq INTEGER NOT NULL DEFAULT 0;

-- §1f — Indexes (per D-03 + D-04 timing-oracle-elimination posture; Option A predicate).
CREATE UNIQUE INDEX client_portal_access_org_client_job_seq_unique
  ON public.client_portal_access (org_id, client_id, job_id, revoked_seq)
  WHERE client_id IS NOT NULL;

CREATE INDEX idx_client_portal_access_client_id
  ON public.client_portal_access (client_id)
  WHERE client_id IS NOT NULL;

-- §1k — DROP+recreate idx_client_portal_access_token_hash as NON-PARTIAL per BLK-3.
-- Eliminate timing oracle on token-resolution hot path (per iter-1 SYNTHESIS B-2a
-- cross-reviewer finding; existing partial index from 00074:188-190 reintroduces
-- oracle when SQL omits revoked_at IS NULL predicate — resolveOwnerToken queries
-- by access_token_hash only). Non-partial index serves query regardless of
-- revoked_at value, eliminating the oracle entirely on the hot path.
DROP INDEX IF EXISTS public.idx_client_portal_access_token_hash;
CREATE UNIQUE INDEX idx_client_portal_access_token_hash
  ON public.client_portal_access (access_token_hash);

-- §2 — Token expiration default: supersede 00074's 90-day with 1-year (per D-07)
ALTER TABLE public.client_portal_access
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '1 year');

-- §3 — create_client_portal_invite RPC: CREATE OR REPLACE with NULL-leak fix (per D-05)
--      Function signature preserved EXACTLY. Body adds:
--        - SELECT j.client_id INTO _client_id (with same-org guard)
--        - RAISE EXCEPTION if NULL
--        - INSERT includes client_id
--        - p_expires_at fallback: now() + interval '1 year' (was 90 days; per D-07)
--      SET search_path = public, pg_temp preserved from 00074:400 (per 00102 pattern)
CREATE OR REPLACE FUNCTION public.create_client_portal_invite(
  p_org_id UUID, p_job_id UUID, p_email TEXT, p_name TEXT,
  p_visibility_config JSONB, p_expires_at TIMESTAMPTZ
)
RETURNS TABLE(portal_access_id UUID, plaintext_token TEXT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  _plaintext TEXT;
  _hash TEXT;
  _new_id UUID;
  _client_id UUID;
BEGIN
  -- Existing auth check (00074:407-421) preserved unchanged
  IF NOT (
    p_org_id = app_private.user_org_id()
    AND app_private.user_role() IN ('owner','admin','pm')
    AND (
      app_private.user_role() IN ('owner','admin')
      OR EXISTS (
        SELECT 1 FROM public.jobs j WHERE j.id = p_job_id AND j.pm_id = auth.uid()
      )
    )
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- B-2a NEW: derive client_id from jobs.client_id (D-05 leak fix)
  SELECT j.client_id INTO _client_id
    FROM public.jobs j
   WHERE j.id = p_job_id AND j.org_id = p_org_id;
  IF _client_id IS NULL THEN
    RAISE EXCEPTION 'B-2a invariant FAILED: jobs.id=% in org=% has NULL client_id (or job not found). Re-invite blocked.', p_job_id, p_org_id;
  END IF;

  _plaintext := encode(extensions.gen_random_bytes(32), 'hex');
  _hash := encode(extensions.digest(_plaintext, 'sha256'), 'hex');

  INSERT INTO public.client_portal_access (
    org_id, job_id, client_id, email, name, access_token_hash,
    visibility_config, expires_at, created_by
  ) VALUES (
    p_org_id, p_job_id, _client_id, p_email, p_name, _hash,
    COALESCE(p_visibility_config, '{}'::jsonb),
    COALESCE(p_expires_at, now() + interval '1 year'),  -- D-07
    auth.uid()
  )
  RETURNING id INTO _new_id;

  RETURN QUERY SELECT _new_id, _plaintext;
END;
$function$;

-- §3a — REVOKE+GRANT for re-defined create_client_portal_invite per BLK-4 iter-1 SYNTHESIS.
-- Role list matches 00074:441-443 verbatim (authenticated only — admin function).
REVOKE EXECUTE ON FUNCTION public.create_client_portal_invite(UUID, UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_client_portal_invite(UUID, UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ) TO authenticated;

-- §3b — submit_client_portal_message RPC: sliding-window UPDATE 90-day → 1-year (per §6.d + D-07).
--       CREATE OR REPLACE preserves body verbatim except 00074:489 sliding-window UPDATE line.
--       Authored inline per BLOCKER #2 (Plan-Author Latitude #4 APPROVED IN-SCOPE — see §2).
--       Verbatim source: supabase/migrations/00074_client_portal.sql:448-494.
CREATE OR REPLACE FUNCTION public.submit_client_portal_message(
  p_token TEXT,
  p_message TEXT
)
RETURNS TABLE(message_id UUID)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  _hash TEXT;
  _access RECORD;
  _new_id UUID;
BEGIN
  IF p_token IS NULL OR p_message IS NULL OR p_message = '' THEN
    RETURN;
  END IF;

  _hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  SELECT id, org_id, job_id, email
    INTO _access
    FROM public.client_portal_access
    WHERE access_token_hash = _hash
      AND revoked_at IS NULL
      AND expires_at > now();

  IF NOT FOUND THEN
    RETURN;  -- silent no-op
  END IF;

  INSERT INTO public.client_portal_messages (
    org_id, job_id, from_type, from_client_email, message
  ) VALUES (
    _access.org_id, _access.job_id, 'client',
    _access.email, p_message
  )
  RETURNING id INTO _new_id;

  -- B-2a: sliding-window UPDATE 90-day → 1-year per D-07 + nwrp200 LOCKED.
  -- WAS: expires_at = now() + interval '90 days' (00074:489)
  UPDATE public.client_portal_access
    SET last_accessed_at = now(),
        expires_at = now() + interval '1 year'
    WHERE id = _access.id;

  RETURN QUERY SELECT _new_id;
END;
$function$;

-- §3b-grant — REVOKE+GRANT for re-defined submit_client_portal_message per BLK-4 iter-1 SYNTHESIS.
-- Role list matches 00074:496-497 verbatim (anon only — homeowner-callable).
REVOKE EXECUTE ON FUNCTION public.submit_client_portal_message(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_client_portal_message(TEXT, TEXT) TO anon;

-- §3c — mark_client_portal_message_read RPC: sliding-window UPDATE 90-day → 1-year (per §6.d + D-07).
--       NOTE: prior PLAN draft erroneously called this RPC `consume_client_portal_token`; the actual
--       third RPC in 00074 with a sliding-window UPDATE is `mark_client_portal_message_read` at
--       00074:501-543 (sliding-window UPDATE at 00074:540). Authored inline per BLOCKER #2.
--       Verbatim source: supabase/migrations/00074_client_portal.sql:501-543.
CREATE OR REPLACE FUNCTION public.mark_client_portal_message_read(
  p_token TEXT,
  p_message_id UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  _hash TEXT;
  _access RECORD;
BEGIN
  IF p_token IS NULL OR p_message_id IS NULL THEN
    RETURN;
  END IF;

  _hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  SELECT id, org_id, job_id
    INTO _access
    FROM public.client_portal_access
    WHERE access_token_hash = _hash
      AND revoked_at IS NULL
      AND expires_at > now();

  IF NOT FOUND THEN
    RETURN;  -- silent no-op
  END IF;

  UPDATE public.client_portal_messages
    SET read_at = now()
    WHERE id = p_message_id
      AND org_id = _access.org_id
      AND job_id = _access.job_id
      AND from_type = 'builder'
      AND read_at IS NULL;

  -- B-2a: sliding-window UPDATE 90-day → 1-year per D-07 + nwrp200 LOCKED.
  -- WAS: expires_at = now() + interval '90 days' (00074:540)
  UPDATE public.client_portal_access
    SET last_accessed_at = now(),
        expires_at = now() + interval '1 year'
    WHERE id = _access.id;
END;
$function$;

-- §3c-grant — REVOKE+GRANT for re-defined mark_client_portal_message_read per BLK-4 iter-1 SYNTHESIS.
-- Role list matches 00074:545-546 verbatim (anon only — homeowner-callable).
REVOKE EXECUTE ON FUNCTION public.mark_client_portal_message_read(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_client_portal_message_read(TEXT, UUID) TO anon;

-- §4 — activity_log.actor_token_id column (per D-23; column add only, WRITES are B-2b)
ALTER TABLE public.activity_log
  ADD COLUMN actor_token_id UUID REFERENCES public.client_portal_access(id) ON DELETE SET NULL;

CREATE INDEX idx_activity_log_actor_token
  ON public.activity_log (actor_token_id)
  WHERE actor_token_id IS NOT NULL;

-- §5 — Rate-limit counter table (per D-15)
CREATE TABLE public.owner_portal_rate_limit (
  id BIGSERIAL PRIMARY KEY,
  key_type TEXT NOT NULL CHECK (key_type IN ('token', 'ip')),
  key_value TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  UNIQUE (key_type, key_value, window_start)
);

CREATE INDEX idx_owner_portal_rate_limit_window
  ON public.owner_portal_rate_limit (window_start);

-- §5b — Rate-limit cleanup function (TTL; 5-minute retention)
CREATE OR REPLACE FUNCTION public.cleanup_owner_portal_rate_limit()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp  -- per 00102 hardening
AS $$
BEGIN
  DELETE FROM public.owner_portal_rate_limit
   WHERE window_start < now() - interval '5 minutes';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_owner_portal_rate_limit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_owner_portal_rate_limit() TO service_role;

-- §5c — RLS posture on rate-limit table (service-role only)
ALTER TABLE public.owner_portal_rate_limit ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.owner_portal_rate_limit TO service_role;
-- No policies → anon + authenticated blocked by RLS-on-no-policy default

-- §5d — Atomic increment RPC (per §6.f — chosen for atomicity)
CREATE OR REPLACE FUNCTION public.record_owner_portal_request(
  p_key_type TEXT, p_key_value TEXT, p_window_start TIMESTAMPTZ
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _new_count INTEGER;
BEGIN
  INSERT INTO public.owner_portal_rate_limit (key_type, key_value, window_start, request_count)
    VALUES (p_key_type, p_key_value, p_window_start, 1)
    ON CONFLICT (key_type, key_value, window_start)
      DO UPDATE SET request_count = public.owner_portal_rate_limit.request_count + 1
    RETURNING request_count INTO _new_count;
  RETURN _new_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_owner_portal_request(TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_owner_portal_request(TEXT, TEXT, TIMESTAMPTZ) TO service_role;

-- §6 — draws.job_id index (per D-18; change_orders.job_id already exists at 00028:171)
CREATE INDEX IF NOT EXISTS idx_draws_job_id ON public.draws (job_id);

-- §7 — Comments (documentation embedded in schema)
COMMENT ON COLUMN public.client_portal_access.client_id IS
  'F1 Wave-B Slice-2 B-2a — denormalized client identity FK. Backfilled from jobs.client_id on apply. ON DELETE SET NULL preserves token row if client hard-deleted via emergency DBA path; soft-delete (normal path) leaves client_id pointing at deleted_at-NOT-NULL clients row. Composite FK to clients(org_id, id) enforces same-org BY CONSTRUCTION per D-01.';

COMMENT ON COLUMN public.client_portal_access.revoked_seq IS
  'F1 Wave-B Slice-2 B-2a — revocation sequence for re-invitation pattern. On revoke: incremented to (max+1). Re-invitation creates row with revoked_seq=0; old row remains for audit trail. Eliminates timing oracle (per D-04 + iter-1 SYNTHESIS B-7) by allowing full covering index without partial WHERE revoked_at IS NULL.';

COMMENT ON INDEX public.idx_client_portal_access_token_hash IS
  'F1 Wave-B Slice-2 B-2a — NON-PARTIAL per BLK-3 (iter-1 SYNTHESIS cross-reviewer alignment: security + ai-logic). Replaces 00074:188-190 partial WHERE revoked_at IS NULL that re-introduced timing oracle on token-resolution hot path. Non-partial index serves resolveOwnerToken queries (which filter by access_token_hash only) regardless of revoked_at value, eliminating the oracle entirely.';

COMMENT ON COLUMN public.activity_log.actor_token_id IS
  'F1 Wave-B Slice-2 B-2a — present when audit row originated from owner-portal token-context action (B-2b acknowledge). Mutually exclusive with user_id at application layer (logActivity helper enforces). NOT enforced via DB CHECK (legacy rows + future trigger rows may have both NULL). Column add in B-2a; WRITES land in B-2b.';

COMMENT ON FUNCTION public.create_client_portal_invite IS
  'F1 Wave-B Slice-2 B-2a — re-defined to derive client_id from jobs.client_id (closes iter-1 SYNTHESIS B-4 NULL-leak). RAISE on NULL. Expiration default 1-year per nwrp200 (supersedes 00074 90-day). Signature preserved exactly; existing 1.5c admin callers unchanged.';

COMMENT ON TABLE public.owner_portal_rate_limit IS
  'F1 Wave-B Slice-2 B-2a — DB-backed rate-limit counter for /api/owner-portal/* endpoints. Per-token + per-IP keys. 60s windows. TTL cleanup (5 minutes) via cleanup_owner_portal_rate_limit(). Replaces non-functional in-process Map per iter-1 SYNTHESIS B-6 + nwrp201/202. RLS-on-no-policy → service-role-only access.';

-- §8 — PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';

COMMIT;
```

#### SQL (down)

```sql
BEGIN;

-- Reverse order of forward migration. IF EXISTS for idempotent re-apply.

-- §6 reverse
DROP INDEX IF EXISTS public.idx_draws_job_id;

-- §5d/c/b/a reverse
DROP FUNCTION IF EXISTS public.record_owner_portal_request(TEXT, TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.cleanup_owner_portal_rate_limit();
DROP TABLE IF EXISTS public.owner_portal_rate_limit;

-- §4 reverse
DROP INDEX IF EXISTS public.idx_activity_log_actor_token;
ALTER TABLE public.activity_log DROP COLUMN IF EXISTS actor_token_id;

-- §3 reverse — restore 00074 RPC bodies verbatim per BLOCKER #4 (no pseudocode).
--   create_client_portal_invite: restored to 00074:390-439 body byte-for-byte.
--   submit_client_portal_message: restored to 00074:448-494 body byte-for-byte.
--   mark_client_portal_message_read: restored to 00074:501-543 body byte-for-byte.
--   (Verbatim from supabase/migrations/00074_client_portal.sql — re-author at apply
--    time only if 00074 ever changes; current 00074 SHA is the canonical source.)
CREATE OR REPLACE FUNCTION public.create_client_portal_invite(
  p_org_id UUID,
  p_job_id UUID,
  p_email TEXT,
  p_name TEXT,
  p_visibility_config JSONB,
  p_expires_at TIMESTAMPTZ
)
RETURNS TABLE(portal_access_id UUID, plaintext_token TEXT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  _plaintext TEXT;
  _hash TEXT;
  _new_id UUID;
BEGIN
  -- Caller must be org member with role IN ('owner','admin','pm')
  -- and (if pm) own the job. Mirrors Amendment H insert policy.
  IF NOT (
    p_org_id = app_private.user_org_id()
    AND app_private.user_role() IN ('owner','admin','pm')
    AND (
      app_private.user_role() IN ('owner','admin')
      OR EXISTS (
        SELECT 1 FROM public.jobs j
        WHERE j.id = p_job_id AND j.pm_id = auth.uid()
      )
    )
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  _plaintext := encode(extensions.gen_random_bytes(32), 'hex');
  _hash := encode(extensions.digest(_plaintext, 'sha256'), 'hex');

  INSERT INTO public.client_portal_access (
    org_id, job_id, email, name, access_token_hash,
    visibility_config, expires_at, created_by
  ) VALUES (
    p_org_id, p_job_id, p_email, p_name, _hash,
    COALESCE(p_visibility_config, '{}'::jsonb),
    COALESCE(p_expires_at, now() + interval '90 days'),
    auth.uid()
  )
  RETURNING id INTO _new_id;

  RETURN QUERY SELECT _new_id, _plaintext;
END;
$function$;

-- Restore 00074 GRANTs for create_client_portal_invite (per BLK-4 down-reverse parity)
REVOKE EXECUTE ON FUNCTION public.create_client_portal_invite(UUID, UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_client_portal_invite(UUID, UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_client_portal_message(
  p_token TEXT,
  p_message TEXT
)
RETURNS TABLE(message_id UUID)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  _hash TEXT;
  _access RECORD;
  _new_id UUID;
BEGIN
  IF p_token IS NULL OR p_message IS NULL OR p_message = '' THEN
    RETURN;
  END IF;

  _hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  SELECT id, org_id, job_id, email
    INTO _access
    FROM public.client_portal_access
    WHERE access_token_hash = _hash
      AND revoked_at IS NULL
      AND expires_at > now();

  IF NOT FOUND THEN
    RETURN;  -- silent no-op
  END IF;

  INSERT INTO public.client_portal_messages (
    org_id, job_id, from_type, from_client_email, message
  ) VALUES (
    _access.org_id, _access.job_id, 'client',
    _access.email, p_message
  )
  RETURNING id INTO _new_id;

  -- Sliding-window: extend expires_at on successful access (00074 original 90 days).
  UPDATE public.client_portal_access
    SET last_accessed_at = now(),
        expires_at = now() + interval '90 days'
    WHERE id = _access.id;

  RETURN QUERY SELECT _new_id;
END;
$function$;

-- Restore 00074 GRANTs for submit_client_portal_message (per BLK-4 down-reverse parity)
REVOKE EXECUTE ON FUNCTION public.submit_client_portal_message(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_client_portal_message(TEXT, TEXT) TO anon;

CREATE OR REPLACE FUNCTION public.mark_client_portal_message_read(
  p_token TEXT,
  p_message_id UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  _hash TEXT;
  _access RECORD;
BEGIN
  IF p_token IS NULL OR p_message_id IS NULL THEN
    RETURN;
  END IF;

  _hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  SELECT id, org_id, job_id
    INTO _access
    FROM public.client_portal_access
    WHERE access_token_hash = _hash
      AND revoked_at IS NULL
      AND expires_at > now();

  IF NOT FOUND THEN
    RETURN;  -- silent no-op
  END IF;

  UPDATE public.client_portal_messages
    SET read_at = now()
    WHERE id = p_message_id
      AND org_id = _access.org_id
      AND job_id = _access.job_id
      AND from_type = 'builder'
      AND read_at IS NULL;

  UPDATE public.client_portal_access
    SET last_accessed_at = now(),
        expires_at = now() + interval '90 days'
    WHERE id = _access.id;
END;
$function$;

-- Restore 00074 GRANTs for mark_client_portal_message_read (per BLK-4 down-reverse parity)
REVOKE EXECUTE ON FUNCTION public.mark_client_portal_message_read(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_client_portal_message_read(TEXT, UUID) TO anon;

-- §2 reverse
ALTER TABLE public.client_portal_access
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '90 days');

-- §1k reverse — restore 00074:188-190 partial index form (per BLK-3 down-reverse parity)
DROP INDEX IF EXISTS public.idx_client_portal_access_token_hash;
CREATE UNIQUE INDEX idx_client_portal_access_token_hash
  ON public.client_portal_access (access_token_hash)
  WHERE revoked_at IS NULL;

-- §1f/e reverse
DROP INDEX IF EXISTS public.idx_client_portal_access_client_id;
DROP INDEX IF EXISTS public.client_portal_access_org_client_job_seq_unique;
ALTER TABLE public.client_portal_access DROP COLUMN IF EXISTS revoked_seq;

-- §1d reverse
ALTER TABLE public.client_portal_access
  DROP CONSTRAINT IF EXISTS client_portal_access_org_id_client_id_fkey;

-- §1b reverse — drops the single-column FK auto-named client_portal_access_client_id_fkey
ALTER TABLE public.client_portal_access DROP COLUMN IF EXISTS client_id;

-- §1a reverse
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_org_id_id_unique;

NOTIFY pgrst, 'reload schema';

COMMIT;
```

**Verify:**
```bash
mcp__supabase__apply_migration  # apply 00104 forward
npx supabase gen types typescript --linked > src/lib/types/database.types.ts
# AC-B2a-01..14 verification queries (§9 below)
```

**Done:** Migration applies cleanly; forward probe passes; types regenerated; 10 sub-step verification queries return expected results per AC-B2a-01..14.

**Atomic commit:** `feat(b-2a): migration 00104 — composite FK + RPC NULL-leak fix + 1-year + rate-limit + actor_token_id + draws index + non-partial token-hash index`

### Task 2 — Type regeneration + commit-pair gate

**Files:**
- `src/lib/types/database.types.ts` (regenerated)

**Action:**
1. Run `npx supabase gen types typescript --linked > src/lib/types/database.types.ts` (or `supabase gen types typescript --linked` if CLI on PATH).
2. Verify diff includes new fields: `client_portal_access.client_id`, `client_portal_access.revoked_seq`, `activity_log.actor_token_id`, `owner_portal_rate_limit` table type, `record_owner_portal_request` + `cleanup_owner_portal_rate_limit` function types.
3. Verify NO unrelated hand-edit drift.

**Verify:**
```bash
git diff src/lib/types/database.types.ts | grep -E "client_id|actor_token_id|revoked_seq|owner_portal_rate_limit|record_owner_portal_request"
# Expect: at least 1 line per pattern present.
```

**Done:** types file regenerated; diff matches expected additions; ESLint + TS compile clean (`npm run typecheck`).

**Atomic commit:** combined with Task 1 per CLAUDE.md Dev Rules ("Migrations under `supabase/migrations/` MUST be accompanied by a regenerated `src/lib/types/database.types.ts` in the same commit").

### Task 3 — `activity_log.ts` LogActivityArgs + union extensions AND `audit/action-labels.ts` Record exhaustiveness edits

**Files:**
- `src/lib/activity-log.ts`
- `src/lib/audit/action-labels.ts`

**Why both files in one task:** The `ActivityEntityType` and `ActivityAction` unions are consumed at `src/lib/audit/action-labels.ts:30` (`ENTITY_LABELS: Record<ActivityEntityType, string>`) and `src/lib/audit/action-labels.ts:55` (`ACTION_LABELS: Record<ActivityAction, string>`). The B-1a-bis precedent at `action-labels.ts:17` explicit comment ("Source of truth for the type unions: src/lib/activity-log.ts:20-49") + the same file's `'client'` entry (lines 44-51) added under exactly this pattern in Slice-1 prove the contract: any new union member without a Record entry causes `npx tsc --noEmit` to fail with TS2741 "Property 'X' is missing in type". Treating these as separate tasks would either (a) break the build between commits or (b) require co-staged commits that should be a single atomic task per Slice-1 precedent. (Resolves BLOCKER #1 from iter-1 gsd-plan-checker.)

**Action — Step 3a (src/lib/activity-log.ts):**
1. Add `actor_token_id?: string | null` to `LogActivityArgs` interface (lines 56-63).
2. Extend `ActivityEntityType` union (line 20-36): add `| "client_portal_access"` (admin revoke audit-log target per D-10 + Sweep 4 Open Q resolution; WARNING #1 from iter-1 plan-checker resolves path (a) — type extension throughout, NOT breadcrumb-only).
3. Extend `ActivityAction` union (line 38-54): add `| "revoked"` (admin revoke action label).
4. Update insert path (lines 73-81): append `actor_token_id: args.actor_token_id ?? null`.
5. Update JSDoc header (lines 1-17) noting the actor_token_id mutual-exclusion rule + B-2a context.

**Action — Step 3b (src/lib/audit/action-labels.ts):**
1. Add `client_portal_access: "Owner Portal Token"` entry to the `ENTITY_LABELS` Record (currently at lines 30-53 with 11 entries; new entry brings it to **12**). Place after the `'client'` entry (line 51, alphabetical-ish within domain category — `client_portal_access` is a logical extension of the `client` cluster). User-facing label `"Owner Portal Token"` per ENTITY-INVENTORY.md naming convention (entity-level noun for audit-log display).
2. Add `revoked: "revoked"` entry to the `ACTION_LABELS` Record (currently at lines 55-71 with 15 entries; new entry brings it to **16**). Place near `voided: "voided"` (line 62, semantically adjacent — both are explicit lifecycle reversals).
3. NO change to the `auditLabel` function body — defensive fallback handles future drift; the new Record entries are picked up automatically by the indexed lookup.

**Verify:**
```bash
# 1. TypeScript Record exhaustiveness — the load-bearing check
npx tsc --noEmit
# Expect: 0 errors. If ENTITY_LABELS or ACTION_LABELS is missing a key, tsc fails
# with TS2741 (Property 'X' is missing in type 'Record<ActivityEntityType, string>').

# 2. Mechanical N+1 keys assertion — count keys after edit
#    Pre-edit baseline (read at plan-author revision time, 2026-05-21):
#      ENTITY_LABELS: 11 entries → expected post-edit: 12
#      ACTION_LABELS: 15 entries → expected post-edit: 16
ENTITY_KEYS=$(awk '/^const ENTITY_LABELS/,/^};/' src/lib/audit/action-labels.ts | grep -cE '^[[:space:]]+[a-z_]+:[[:space:]]+"')
ACTION_KEYS=$(awk '/^const ACTION_LABELS/,/^};/' src/lib/audit/action-labels.ts | grep -cE '^[[:space:]]+[a-z_]+:[[:space:]]+"')
echo "ENTITY_LABELS keys: $ENTITY_KEYS (expected 12)"
echo "ACTION_LABELS keys: $ACTION_KEYS (expected 16)"
[ "$ENTITY_KEYS" -eq 12 ] || { echo "FAIL: ENTITY_LABELS not 12"; exit 1; }
[ "$ACTION_KEYS" -eq 16 ] || { echo "FAIL: ACTION_LABELS not 16"; exit 1; }

# 3. Exhaustiveness double-check via grep — every union member appears as a Record key
for m in invoice invoice_import_batch purchase_order change_order budget_line job vendor cost_code draw client user client_portal_access; do
  grep -qE "^[[:space:]]+${m}:[[:space:]]+\"" src/lib/audit/action-labels.ts \
    || { echo "MISSING ENTITY_LABELS key: $m"; exit 1; }
done
for m in created updated status_changed deleted delete_blocked voided void_blocked merged imported recomputed approved denied bulk_assigned_job sent_to_queue deleted_errors revoked; do
  grep -qE "^[[:space:]]+${m}:[[:space:]]+\"" src/lib/audit/action-labels.ts \
    || { echo "MISSING ACTION_LABELS key: $m"; exit 1; }
done
echo "All union members present as Record keys."

# 4. ESLint clean
npm run lint
```

**Done:** TS compiles with the new union members + Record entries; `ENTITY_LABELS` count is exactly **12**; `ACTION_LABELS` count is exactly **16**; every union member appears as a Record key (mechanical loop confirms exhaustiveness).

**Atomic commit:** `feat(b-2a): extend activity-log with actor_token_id + client_portal_access entity + revoked action; mirror in action-labels Records`

### Task 4 — Server-only helpers `src/lib/owner-portal/token.ts`

**Files:**
- `src/lib/owner-portal/token.ts` (NEW)

**Action:** author the module per §6.e. Includes:
1. `import "server-only"` at top.
2. `ResolvedOwnerToken` interface.
3. `resolveOwnerToken(plaintext): Promise<ResolvedOwnerToken | null>` — hash + lookup + app-layer filter on `revoked_at` + `expires_at` + `client_id IS NOT NULL`.
4. `getScopedOwnerPortalClient(resolvedToken): ScopedOwnerPortalClient` — returns wrapper with `scopedFrom(tableName)` method.
5. `assertDrawBelongsToToken(drawId, resolvedToken): Promise<boolean>` — pinned SQL with PostgREST `jobs!inner(id, client_id, org_id)` embed (cite FK constraint name `draws_job_id_fkey` per Workflow Rule 2).
6. Unit tests in `src/lib/owner-portal/__tests__/token.test.ts` — covers: valid token resolution; expired token returns null; revoked token returns null; cross-client probe returns false for `assertDrawBelongsToToken`.

**Verify:**
```bash
npm run test -- src/lib/owner-portal/__tests__/token.test.ts
npm run typecheck
npm run lint
# Layer 5 ai-logic-tester probe (manual):
#   - Use Drummond token; assertDrawBelongsToToken with Drummond draw_id → true
#   - Use Drummond token; assertDrawBelongsToToken with a different client's draw_id (manually identified) → false
```

**Done:** All unit tests pass; type-check clean; manual cross-client probe returns false.

**Atomic commit:** `feat(b-2a): server-only owner-portal token helpers (getScopedOwnerPortalClient + assertDrawBelongsToToken)`

### Task 5 — Middleware PUBLIC_PATHS extension

**Files:**
- `src/middleware.ts`

**Action:** edit at line 7 per §6.g (W-1 disposition — split entries per auth model). Add `"/owner"`, `"/api/owner-portal/acknowledge"`, and `"/api/owner-portal/admin"` to the PUBLIC_PATHS array with explanatory comments per entry.

**Verify:**
```bash
# Manual: hit /owner/abc as anon — middleware allows (no auth redirect to /login).
#         hit /api/owner-portal/acknowledge as anon — middleware allows (reaches handler).
#         hit /api/owner-portal/admin/revoke-token as anon — middleware allows; route handler enforces auth.
#         hit /dashboard as anon — middleware redirects to /login (PUBLIC_PATHS extension does NOT regress auth).
npm run typecheck
```

**Done:** PUBLIC_PATHS extension does NOT regress auth for non-owner paths; new paths bypass auth-redirect (route handlers do their own auth check via `getCurrentMembership()` or `resolveOwnerToken()`).

**Atomic commit:** `feat(b-2a): middleware PUBLIC_PATHS extension (/owner + /api/owner-portal/acknowledge + /api/owner-portal/admin)`

### Task 6 — Rate-limit application-layer guard `src/lib/owner-portal/rate-limit.ts`

**Files:**
- `src/lib/owner-portal/rate-limit.ts` (NEW)

**Action:** author the module per §6.f. Includes:
1. `import "server-only"` at top.
2. Constants: `TOKEN_LIMIT_PER_MINUTE = 30`, `IP_LIMIT_PER_MINUTE = 60`.
3. `RateLimitResult` interface.
4. `recordOwnerPortalRequest(keyType, keyValue): Promise<RateLimitResult>` — calls `record_owner_portal_request` RPC (atomic INSERT-ON-CONFLICT-DO-UPDATE returning count); checks count vs limit; opportunistic cleanup every 100 requests.
5. Sentry breadcrumb on fail-open (DB error → allow but breadcrumb).
6. Unit tests in `src/lib/owner-portal/__tests__/rate-limit.test.ts` — covers: under-limit allows; over-limit blocks; window-rollover resets counter; DB error fail-opens.

**Verify:**
```bash
npm run test -- src/lib/owner-portal/__tests__/rate-limit.test.ts
# Manual load test (Layer 5 ai-logic-tester):
for i in {1..35}; do
  curl -X POST http://localhost:3000/api/owner-portal/admin/revoke-token \
    -H "Content-Type: application/json" \
    -H "Cookie: <authed-admin-cookie>" \
    -d '{"token_id":"<test-id>","expected_updated_at":"..."}' -w "%{http_code}\n" -s -o /dev/null
done
# Expect: requests 31+ return 429 (TOKEN_LIMIT_PER_MINUTE=30 exceeded)
```

**Done:** Unit tests pass; manual burst test triggers 429 at request 31+.

**Atomic commit:** `feat(b-2a): DB-backed rate-limit for /api/owner-portal/* (replaces in-process Map per iter-1 SYNTHESIS B-6)`

### Task 7 — Admin revocation API route

**Files:**
- `src/app/api/owner-portal/admin/revoke-token/route.ts` (NEW)

**Action:** author the route handler:
1. POST handler accepting `{ token_id: string; expected_updated_at: string }`.
2. **CSRF protection (per iter-1 SYNTHESIS H-2):** at route handler entry, assert `request.headers.get('origin')` equals `process.env.NEXT_PUBLIC_APP_URL`. Reject 403 on mismatch. This closes the CSRF surface — Origin is a forbidden-write header per Fetch spec, so a cross-origin attacker cannot spoof it from a browser context. Same-origin enforcement via Origin header is the OWASP-recommended pattern (CSRF cheat sheet).
3. Call `getCurrentMembership()` — return 401 if not authenticated, 403 if role NOT IN ('owner', 'admin').
4. Call `recordOwnerPortalRequest('ip', requestIp)` — return 429 if rate-limited.
5. Call `updateWithLock<{ id: string; updated_at: string }>(supabase, { table: 'client_portal_access', id: tokenId, orgId: membership.org_id, expectedUpdatedAt, updates: { revoked_at: new Date().toISOString(), revoked_seq: <max+1 sub-query> } })`.
6. On success: call `logActivity({ org_id: membership.org_id, user_id: membership.user_id, actor_token_id: null, entity_type: 'client_portal_access', entity_id: tokenId, action: 'revoked', details: { revoked_at: <iso> } })`.
7. Return 200 + `{ revoked: true, revoked_at: <iso> }`. On `isLockConflict`: return the conflict response.

**Verify:**
```bash
# Manual via authed admin session:
curl -X POST http://localhost:3000/api/owner-portal/admin/revoke-token \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -H "Cookie: <admin-session>" \
  -d '{"token_id":"<test-token-id>","expected_updated_at":"<current-iso>"}'
# Expect: 200 + { revoked: true, revoked_at: "..." }

# Cross-origin probe (CSRF defense):
curl -X POST http://localhost:3000/api/owner-portal/admin/revoke-token \
  -H "Content-Type: application/json" \
  -H "Origin: https://attacker.example.com" \
  -H "Cookie: <admin-session>" \
  -d '{"token_id":"<test-token-id>","expected_updated_at":"<current-iso>"}'
# Expect: 403 (Origin mismatch)

# Verify activity_log row written:
mcp__supabase__execute_sql:
  SELECT user_id, actor_token_id, entity_type, entity_id, action
    FROM public.activity_log
   WHERE entity_type = 'client_portal_access'
     AND entity_id = '<test-token-id>'
     AND action = 'revoked'
   ORDER BY created_at DESC LIMIT 1;
# Expect: user_id IS NOT NULL, actor_token_id IS NULL, action='revoked'

# Cross-tenant probe — admin from org B attempts to revoke org A's token:
curl -X POST .../revoke-token -d '{"token_id":"<org-A-token-id>","expected_updated_at":"..."}' \
  -H "Origin: http://localhost:3000" \
  -H "Cookie: <org-B-admin-session>"
# Expect: updateWithLock returns 0 rows (RLS-scoped) → 409 (lock conflict masked) or explicit 404.
# Manual SQL verification: SELECT revoked_at FROM client_portal_access WHERE id='<org-A-token-id>'; revoked_at remains NULL.

# Forbidden role (PM) attempts revoke:
curl -X POST .../revoke-token -d '{...}' \
  -H "Origin: http://localhost:3000" \
  -H "Cookie: <pm-session>"
# Expect: 403.
```

**Done:** Admin can revoke; CSRF protection rejects cross-origin POSTs; audit-log written; cross-tenant probe blocked by RLS-scoped `updateWithLock`; PM role blocked by route-handler role check.

**Atomic commit:** `feat(b-2a): admin revocation API route (/api/owner-portal/admin/revoke-token) with CSRF Origin check`

### Task 8 — Admin revocation UI surface

**Files:**
- `src/app/admin/owner-portal-tokens/page.tsx` (NEW)
- `src/app/admin/owner-portal-tokens/_components/RevokeTokenRow.tsx` (NEW)

**Action:**
1. **`page.tsx`** — server component:
   - `getCurrentMembership()` + role gate (`owner|admin` only; 403 otherwise via `notFound()` or redirect to `/admin`).
   - Query `client_portal_access` for org (RLS-scoped); JOIN `clients` (full_name) + `jobs` (name) via PostgREST embed: `select=*, client:clients!inner(full_name), job:jobs!inner(name)` — cite FK constraints `client_portal_access_client_id_fkey` (composite via `client_id`) + `client_portal_access_job_id_fkey` (existing inline from 00074:152) per Workflow Rule 2.
   - Order by `created_at DESC`.
   - Render table: columns: token id (truncated to 8 chars + ellipsis), client name, job name, created_at (relative), expires_at (relative), last_accessed_at (relative or "never"), revoked_at (status badge: "Active" / "Revoked" / "Expired"), action button.
   - Pass each row to `<RevokeTokenRow row={...} />` for action affordance.
   - Layout consumes existing admin section design tokens (mirror `src/app/admin/users/page.tsx` patterns; NO hardcoded hex; design tokens only).

2. **`_components/RevokeTokenRow.tsx`** — client component:
   - Props: `row: { id, expires_at, revoked_at, expected_updated_at }`.
   - If `revoked_at IS NOT NULL`: render disabled "Revoked" badge.
   - Else: render "Revoke" button → on click → confirm modal → POST `/api/owner-portal/admin/revoke-token` with `{ token_id, expected_updated_at }` → revalidate path on success → toast on failure.
   - Touch target ≥44px per SYSTEM.md (admin desktop OK but mobile preserved).

**Verify (CLAUDE.md Testing Rule MANDATORY):**
```bash
npm run dev
# Manual via Chrome DevTools:
#   - Auth as admin (Jake or seeded admin)
#   - Navigate http://localhost:3000/admin/owner-portal-tokens
#   - Confirm table renders with Drummond + any harness-org tokens
#   - Confirm "Revoke" button visible on active rows
#   - Click Revoke on a test row; confirm modal; confirm POST; confirm row updates to "Revoked"
#   - Take screenshot
# Hook regex sweep — should pass post-edit (no hex; design tokens only)
bash .claude/hooks/nightwork-post-edit.sh --check src/app/admin/owner-portal-tokens/
```

**Done:** Admin UI renders; Revoke action works end-to-end; no console errors; hook regex sweep passes; screenshot captured.

**Atomic commit:** `feat(b-2a): admin owner-portal token revocation UI (/admin/owner-portal-tokens)`

### Task 9 — Smoke harness extension + SUMMARY + AC attestation

**Files:**
- `scripts/wave-d-smoke.ts` (extend ROUTES — admin UI route entry)
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2a-SUMMARY.md` (NEW)
- `.planning/MASTER-PLAN.md` (mark Slice-2 B-2a row SHIPPED — no TD-B1abis-03 closure here; that lands in B-2b)

**Action:**
1. **Smoke harness route entry:** append to ROUTES table:
   ```typescript
   {
     route: "/admin/owner-portal-tokens",
     category: "admin",
     primary_ux_selector: "text=Owner portal tokens",  // page heading
     primary_ux_min_count: 1,
     pattern: "admin-list",
     auth: "admin",  // smoke harness uses admin session for /admin/* routes
   },
   ```
2. **SUMMARY.md:** standard B-2a structure — what shipped (atomic migration + helpers + admin path), AC attestation table (each AC marked PASS with verification artifact path), cost actual, follow-ups (B-2b unblock; B-3 dependency).
3. **MASTER-PLAN.md:** Slice-2 row update — mark B-2a SHIPPED; note B-2a GATE pending Jake review.

**Verify:**
```bash
node scripts/wave-d-smoke.ts  # (or harness GH Action)
# Expect: /admin/owner-portal-tokens route passes (HTTP 200 + selector matched + zero console errors)
```

**Done:** SUMMARY.md exists; MASTER-PLAN.md Slice-2 row updated; smoke harness extended + run passes.

**Atomic commit:** `chore(b-2a): SUMMARY + MASTER-PLAN Slice-2 progress + smoke harness admin token route`

## 8. Acceptance criteria (14 falsifiable items)

Per EXPANDED-SCOPE §7 acceptance criteria preview lines 393-406 + B-4 RPC fix AC strengthened per nwrp201 + nwrp202 §5 to 3 falsifiable queries + AC-B2a-14 NEW per BLK-3 iter-1 SYNTHESIS (non-partial token-hash index verification). Each AC has explicit verification query in §9.

**Migration (5 ACs):**

- **AC-B2a-01** — Migration `00104_b2a_token_issuance_security_model.sql` applies cleanly on dev DB. Forward probe DO block emits zero RAISE EXCEPTION; transaction commits.
- **AC-B2a-02** — Composite FK invariant exists: constraint `client_portal_access_org_id_client_id_fkey` references `public.clients(org_id, id) ON DELETE SET NULL`. Cross-tenant probe (insert `(org_id=A, client_id=clients(org_id=B))` row) fails at FK constraint level. (Closes iter-1 SYNTHESIS B-2 + D-01.)
- **AC-B2a-03** — Backfill verification: every existing `client_portal_access` row whose job has a non-NULL `client_id` now has `client_id` populated (matches `jobs.client_id`). Drummond + harness-fixture-org token rows backfilled.
- **AC-B2a-04** — Down-migration `00104_*.down.sql` cleanly reverses; restored RPC body matches 00074:390-439 byte-for-byte; idempotent on re-apply (DROP IF EXISTS); 00074:188-190 partial token-hash index form restored per BLK-3 down-reverse.
- **AC-B2a-05** — Index posture LOCKED per D-04: full covering index `client_portal_access_org_client_job_seq_unique` on `(org_id, client_id, job_id, revoked_seq) WHERE client_id IS NOT NULL`. NO partial `WHERE revoked_at IS NULL` predicate. Timing-oracle elimination verified via repeated lookups of revoked vs never-existed tokens — variance <2× (closes iter-1 SYNTHESIS B-7).

**RPC NULL-leak fix (1 AC strengthened to 3 falsifiable queries):**

- **AC-B2a-06** — `create_client_portal_invite` RPC NULL-leak fix verified via 3 falsifiable queries per nwrp201 + nwrp202 §5 (closes iter-1 SYNTHESIS B-4):
  1. **Backfill completeness:** `SELECT COUNT(*) FROM public.client_portal_access WHERE client_id IS NULL AND revoked_at IS NULL AND expires_at > NOW();` returns 0 post-migration (every active token row has non-NULL `client_id`).
  2. **RPC produces non-NULL `client_id` scoped to inviting org:** invoke `create_client_portal_invite(<test_org_id>, <test_job_id>, <test_email>, <test_name>, '{}'::jsonb, NULL)` via service-role with all **6 arguments** (BLK-2 fix per iter-1 SYNTHESIS — prior AC text said "5 arguments"); resulting row's `client_id = (SELECT client_id FROM jobs WHERE id = <test_job_id>)` AND `org_id = (SELECT org_id FROM jobs WHERE id = <test_job_id>)` — non-NULL, matches parent job's client + org.
  3. **Cross-org invite rejection with zero-leakage-row clause:** attempting `create_client_portal_invite(<org_A_job_id>, ...)` from a session authenticated as `org_B` member is rejected (auth check at function start raises `unauthorized`); post-attempt query `SELECT COUNT(*) FROM client_portal_access WHERE created_at > <attempt_ts> AND org_id = <org_A_id>` returns 0 (no leakage row created — Jake's "real protection" clause per nwrp202 §5).

**Token lifecycle + revocation (2 ACs):**

- **AC-B2a-07** — Token expiration LOCKED to 1-year (supersedes 00074 90-day): `client_portal_access.expires_at` column default = `(now() + interval '1 year')`; RPC fallback in `create_client_portal_invite` body = `now() + interval '1 year'`. Sliding-window UPDATE in `submit_client_portal_message` + `mark_client_portal_message_read` extends to 1-year (per Plan-Author Latitude #4 APPROVED IN-SCOPE). Migration body documents supersession.
- **AC-B2a-08** — Admin revocation end-to-end: `POST /api/owner-portal/admin/revoke-token` with `{ token_id, expected_updated_at }` from authenticated admin (`owner|admin` role) with same-origin Origin header returns 200; `client_portal_access.revoked_at` populated; `revoked_seq` incremented to (max+1) per Option A (Latitude #3 APPROVED); `activity_log` row written with `user_id = membership.user_id`, `actor_token_id = NULL`, `entity_type = 'client_portal_access'`, `action = 'revoked'`. Admin UI at `/admin/owner-portal-tokens/page.tsx` renders the action affordance; clicking Revoke triggers the API call and updates the row state. **Re-invitation discriminator under Option A (Latitude #3 APPROVED):** `revoked_seq` column incremented to (max+1) on revoke; new token row INSERT uses `revoked_seq=0`. **Re-invitation semantics under Option A:** admin must revoke expired tokens before re-inviting (because `(org_id, client_id, job_id, revoked_seq)` partial unique excludes only `client_id IS NOT NULL` rows, NOT expired-but-not-revoked ones — re-invitation against an expired-not-revoked row will collide unless admin revokes first, bumping `revoked_seq` and clearing the slot). Per BLK-5 iter-1 SYNTHESIS clarification. **Cross-origin POST returns 403** per CSRF Origin check (H-2 iter-1 SYNTHESIS fix). **Forbidden role (PM) returns 403** per role gate.

**Middleware + rate-limit + helpers (3 ACs):**

- **AC-B2a-09** — Middleware PUBLIC_PATHS extension (W-1 split form): `/owner/*` AND `/api/owner-portal/acknowledge` AND `/api/owner-portal/admin/*` reach route handlers as anon (NOT 401 by middleware). Route handlers retain their own auth checks (admin revoke requires authenticated admin via `getCurrentMembership()`; B-2b acknowledge requires token resolution). PostgREST FK citations: `client_portal_access_client_id_fkey` (single-col) + `client_portal_access_org_id_client_id_fkey` (composite) + `client_portal_access_job_id_fkey` (from 00074:152) + `draws_job_id_fkey` referenced in plan body per Workflow Rule 2 (closes iter-1 SYNTHESIS B-8); verification query against `pg_constraint` added to §9 per BLK-6.
- **AC-B2a-10** — DB-backed rate-limit functional: 35 sequential requests to a rate-limited endpoint (`/api/owner-portal/admin/revoke-token` or `/api/owner-portal/acknowledge` in B-2b) within 60s returns HTTP 429 starting at request 31 (TOKEN_LIMIT_PER_MINUTE=30). Counter persists across function invocations (DB-backed, NOT in-process). Cleanup function `cleanup_owner_portal_rate_limit()` deletes rows older than 5 minutes when called (closes iter-1 SYNTHESIS B-6).
- **AC-B2a-11** — Helpers enforce scope at type-system + runtime level: (a) `getScopedOwnerPortalClient(token).scopedFrom('jobs')` returns ONLY the token's job (cross-job probe returns 0 rows); (b) `assertDrawBelongsToToken(<other-client-draw-id>, <drummond-token>)` returns `false` (closes iter-1 SYNTHESIS B-1 + B-3). Unit tests + manual cross-client probe verify.

**Database review + indexes (1 AC):**

- **AC-B2a-12** — `draws.job_id` + `change_orders.job_id` indexes verified via `SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ('draws', 'change_orders') AND indexdef LIKE '%job_id%'`. Expected: `idx_draws_job_id` (NEW in 00104) + `idx_change_orders_job_id` (existing at 00028:171) + `idx_change_orders_status` (existing at 00028:173) (closes iter-1 SYNTHESIS B-11).

**Non-partial token-hash index (1 AC; NEW per BLK-3 iter-1 SYNTHESIS):**

- **AC-B2a-14** — Token-hash index `idx_client_portal_access_token_hash` is NON-PARTIAL post-00104: `indexdef` does NOT contain a `WHERE` clause; EXPLAIN ANALYZE confirms index scan on token-resolution query without `revoked_at IS NULL` predicate. Closes BLK-3 cross-reviewer alignment (security + ai-logic) per iter-1 SYNTHESIS — non-partial index serves token-resolution hot path regardless of revoked_at value, eliminating the timing oracle that the partial form at 00074:188-190 reintroduced.

**GATE-readiness (1 AC):**

- **AC-B2a-13 (GATE B-2a)** — Jake reviews + confirms token scoping is airtight via 9 EXPANDED-SCOPE §9 verification items BEFORE B-2b dispatches:
  - (1) `create_client_portal_invite` RPC NULL-leak fix verified (AC-B2a-06).
  - (2) Same-org FK invariant enforced (AC-B2a-02).
  - (3) 1-year default LOCKED + admin revocation API + UI revokes + audit-log row written (AC-B2a-07 + AC-B2a-08).
  - (4) Rate-limit infrastructure Vercel-functional: counter persists across invocations (AC-B2a-10).
  - (5) `/api/owner-portal/*` reachable as anon (PUBLIC_PATHS extension; AC-B2a-09).
  - (6) `getScopedOwnerPortalClient` helper enforces scope (AC-B2a-11).
  - (7) `assertDrawBelongsToToken` helper rejects cross-client probe (AC-B2a-11).
  - (8) PostgREST FK citations match `pg_constraint`; `draws.job_id` + `change_orders.job_id` indexes verified (AC-B2a-09 + AC-B2a-12). Non-partial token-hash index verified (AC-B2a-14 per BLK-3).
  - (9) **Drummond token row backfill verified — canary for D-02 per CONTEXT.md `<specifics>` (per WARNING #3 / iter-1 plan-checker).** Direct SQL probe: `SELECT cpa.client_id, j.client_id AS jobs_client_id FROM public.client_portal_access cpa JOIN public.jobs j ON j.id = cpa.job_id WHERE j.name = 'Drummond';` returns `cpa.client_id = j.client_id` for every Drummond `client_portal_access` row (zero-divergence). **Vacuously-true acknowledgment (N-2 per iter-1 SYNTHESIS):** if `client_portal_access` is empty at backfill time (current state per ai-logic-tester Q6 evidence — 0 rows across all orgs in current schema), the canary passes vacuously. The active probe via AC-B2a-06 sub-item 2 (RPC invocation against Drummond job + `client_id` verification) covers the canary intent for the non-empty case. Drummond is the reference job for production-facing artifacts (CLAUDE.md Domain rules); D-02 explicitly designates the Drummond row backfill as the canary because if Drummond breaks, every downstream user-facing path breaks visibly to Jake.
  Rejection: B-2a iter-2 OR escalate to fresh-session re-scope; B-2b dispatch held.

## 9. Verification commands

### AC-B2a-01 — Migration applies

```bash
mcp__supabase__apply_migration:
  query: <forward migration body from Task 1>
# Expect: success; pre-flight RAISE NOTICE + forward probe DO block no EXCEPTION

mcp__supabase__execute_sql:
  SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 1;
# Expect: 00104 row present.
```

### AC-B2a-02 — Composite FK invariant + Rule 2 FK citation verification (BLK-6)

```bash
# Rule 2 verification: confirm FK constraint names cited in PLAN body match pg_constraint (BLK-6 fix)
mcp__supabase__execute_sql:
  SELECT conname, conrelid::regclass AS source_table,
         confrelid::regclass AS target_table,
         pg_get_constraintdef(oid) AS def
  FROM pg_constraint
  WHERE conrelid IN ('public.client_portal_access'::regclass, 'public.draws'::regclass)
    AND contype = 'f'
  ORDER BY conname;
# Expected FK constraint names present:
#   - client_portal_access_client_id_fkey (single-col FK on client_id)
#   - client_portal_access_job_id_fkey (existing inline from 00074:152)
#   - client_portal_access_org_id_client_id_fkey (B-2a's composite FK)
#   - draws_job_id_fkey (existing inline)

mcp__supabase__execute_sql:
  SELECT con.conname, pg_get_constraintdef(con.oid) AS def
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
   WHERE rel.relname = 'client_portal_access'
     AND con.conname IN ('client_portal_access_org_id_client_id_fkey', 'client_portal_access_client_id_fkey');
# Expect: 2 rows.
#   client_portal_access_client_id_fkey  → FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
#   client_portal_access_org_id_client_id_fkey → FOREIGN KEY (org_id, client_id) REFERENCES clients(org_id, id) ON DELETE SET NULL

# Cross-tenant probe — must fail
mcp__supabase__execute_sql:
  -- attempt to insert a token row where client_id belongs to a different org
  -- (using two real org_ids; org_A_id has a real client clients(org_id=org_A_id, id=client_X);
  --  attempt to insert client_portal_access(org_id=org_B_id, client_id=client_X))
  INSERT INTO public.client_portal_access (org_id, job_id, client_id, email, access_token_hash)
  VALUES (
    '<org_B_id>', '<any_job_id_in_org_B>', '<client_X_from_org_A>',
    'test@example.com', repeat('a', 64)
  );
# Expect: FK violation error mentioning client_portal_access_org_id_client_id_fkey.
# Roll back any test attempt with BEGIN; ... ROLLBACK; pattern.
```

### AC-B2a-03 — Backfill completeness

```bash
mcp__supabase__execute_sql:
  SELECT COUNT(*) AS orphan_count
    FROM public.client_portal_access cpa
    JOIN public.jobs j ON j.id = cpa.job_id
   WHERE j.client_id IS NOT NULL AND cpa.client_id IS NULL;
# Expect: 0

mcp__supabase__execute_sql:
  -- Drummond-specific (production-facing per CLAUDE.md "Drummond as reference job")
  SELECT cpa.id, cpa.client_id, j.client_id AS jobs_client_id
    FROM public.client_portal_access cpa
    JOIN public.jobs j ON j.id = cpa.job_id
   WHERE j.name = 'Drummond'  -- (or however Drummond is identified)
     AND cpa.client_id IS NOT NULL;
# Expect: cpa.client_id = j.client_id for every Drummond row.
```

### AC-B2a-04 — Down migration

```bash
mcp__supabase__apply_migration:
  query: <down migration body from Task 1>
# Expect: success; columns dropped; constraints dropped; restored RPC body matches 00074:390-439
#         AND restored 00074:188-190 partial token-hash index form (per BLK-3 down-reverse)

mcp__supabase__execute_sql:
  SELECT column_name FROM information_schema.columns
   WHERE table_name = 'client_portal_access' AND column_name = 'client_id';
# Expect: 0 rows post-down.

# Verify partial token-hash index form restored post-down (BLK-3 down-reverse parity)
mcp__supabase__execute_sql:
  SELECT indexdef FROM pg_indexes
   WHERE tablename = 'client_portal_access' AND indexname = 'idx_client_portal_access_token_hash';
# Expect: indexdef contains 'WHERE (revoked_at IS NULL)' post-down.

# Re-apply forward
mcp__supabase__apply_migration:
  query: <forward migration body>
# Expect: success again (idempotent on the IF EXISTS / IF NOT EXISTS path)
```

### AC-B2a-05 — Index posture + timing-oracle elimination

```bash
mcp__supabase__execute_sql:
  SELECT indexname, indexdef FROM pg_indexes
   WHERE tablename = 'client_portal_access'
     AND indexname = 'client_portal_access_org_client_job_seq_unique';
# Expect: 1 row; indexdef does NOT contain "WHERE (revoked_at IS NULL)";
#         indexdef DOES contain "WHERE (client_id IS NOT NULL)"

# Timing-oracle test (pinned methodology per iter-1 SYNTHESIS H-1):
# Confirm non-partial index serves query without revoked_at IS NULL predicate
mcp__supabase__execute_sql:
  SET enable_seqscan = off;
  EXPLAIN (ANALYZE, BUFFERS)
    SELECT * FROM public.client_portal_access
    WHERE access_token_hash = decode('<test-hash>', 'hex');
  RESET enable_seqscan;
# Expected: "Index Scan using idx_client_portal_access_token_hash" — confirms non-partial index
# serves query without revoked_at IS NULL predicate (eliminates timing oracle on hot path).
#
# Additional layered probe: create test rows (1 valid + 1 revoked + 1 never-existed-no-row);
# repeatedly query each via resolveOwnerToken; measure response time variance.
# Expected: response time variance <2× across the 3 cases.
# (Manual script: scripts/b-2a-timing-oracle-probe.ts authored at execute time.)
```

### AC-B2a-06 — RPC NULL-leak fix (3 falsifiable queries)

**Query 1 — Backfill completeness:**

```bash
mcp__supabase__execute_sql:
  SELECT COUNT(*) AS active_null_client_count
    FROM public.client_portal_access
   WHERE client_id IS NULL
     AND revoked_at IS NULL
     AND expires_at > NOW();
# Expect: 0 (every active token row has non-NULL client_id).
```

**Query 2 — RPC produces non-NULL client_id (6 arguments per BLK-2):**

```bash
mcp__supabase__execute_sql:
  -- Invoke RPC via service-role with a known test job + email (6 arguments per BLK-2 fix)
  SELECT * FROM public.create_client_portal_invite(
    '<test_org_id>',     -- p_org_id
    '<test_job_id>',     -- p_job_id (must have client_id NOT NULL in jobs table)
    'test+b2a-06@example.com',
    'Test Homeowner',
    '{}'::jsonb,
    NULL                 -- p_expires_at — RPC defaults to now() + 1-year
  );
# Returns: (portal_access_id, plaintext_token)

# Verify the inserted row has non-NULL client_id matching jobs.client_id
mcp__supabase__execute_sql:
  SELECT cpa.client_id, cpa.org_id, j.client_id AS jobs_client_id, j.org_id AS jobs_org_id
    FROM public.client_portal_access cpa
    JOIN public.jobs j ON j.id = cpa.job_id
   WHERE cpa.email = 'test+b2a-06@example.com'
   ORDER BY cpa.created_at DESC LIMIT 1;
# Expect: 1 row; cpa.client_id IS NOT NULL; cpa.client_id = j.client_id; cpa.org_id = j.org_id.

# Clean up
mcp__supabase__execute_sql:
  DELETE FROM public.client_portal_access WHERE email = 'test+b2a-06@example.com';
```

**Query 3 — Cross-org rejection with zero-leakage-row clause:**

```bash
# As org_B authenticated session, attempt to invite for org_A job
# (Setup: identify <org_A_id> + <org_A_job_id> + a session-authenticator for <org_B_id>)
mcp__supabase__execute_sql:
  -- Set session to org_B context (via service-role test fixture or actual auth.jwt() set)
  -- ...session setup...

  SELECT * FROM public.create_client_portal_invite(
    '<org_A_id>',         -- attempting to invite for org_A
    '<org_A_job_id>',
    'test+b2a-06-xorg@example.com',
    'Cross-Org Attacker', '{}'::jsonb, NULL
  );
# Expect: ERROR — 'unauthorized' (from existing 00074 auth check at function start)

# Verify zero leakage row created (Jake's "real protection" clause):
mcp__supabase__execute_sql:
  SELECT COUNT(*) FROM public.client_portal_access
   WHERE org_id = '<org_A_id>'
     AND email = 'test+b2a-06-xorg@example.com';
# Expect: 0 (RPC raised before INSERT; no partial write).
```

### AC-B2a-07 — 1-year token lifecycle

```bash
mcp__supabase__execute_sql:
  SELECT column_default
    FROM information_schema.columns
   WHERE table_name = 'client_portal_access'
     AND column_name = 'expires_at';
# Expect: "(now() + '1 year'::interval)" (NOT "(now() + '90 days'::interval)")

mcp__supabase__execute_sql:
  SELECT pg_get_functiondef(p.oid)
    FROM pg_proc p
   WHERE p.proname = 'create_client_portal_invite'
     AND p.pronamespace = 'public'::regnamespace;
# Expect: function body includes "now() + interval '1 year'" (NOT "90 days")
#         AND includes "_client_id IS NULL THEN RAISE EXCEPTION"

# Verify sliding-window UPDATE in submit_client_portal_message + mark_client_portal_message_read
# are also updated to 1-year (per Plan-Author Latitude #4 APPROVED IN-SCOPE in §2).
mcp__supabase__execute_sql:
  SELECT proname, pg_get_functiondef(oid) FROM pg_proc
   WHERE proname IN ('submit_client_portal_message', 'mark_client_portal_message_read')
     AND pronamespace = 'public'::regnamespace;
# Expect: both function bodies contain "expires_at = now() + interval '1 year'" AND do NOT contain "90 days"
```

### AC-B2a-08 — Admin revocation end-to-end

```bash
# Step 1: create a test token via the (now-fixed) RPC
mcp__supabase__execute_sql:
  SELECT * FROM public.create_client_portal_invite(
    '<test_org_id>', '<test_job_id>', 'test+b2a-08@example.com',
    'Revoke Test', '{}'::jsonb, NULL
  );
# Capture returned (portal_access_id, plaintext_token) — call this <test_token_id> + <test_plaintext>

# Step 2: get current updated_at for the row
mcp__supabase__execute_sql:
  SELECT updated_at FROM public.client_portal_access WHERE id = '<test_token_id>';
# Capture as <current_updated_at>

# Step 3: revoke via admin API (same-origin Origin header per CSRF defense H-2)
curl -X POST http://localhost:3000/api/owner-portal/admin/revoke-token \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -H "Cookie: <admin-session-cookie>" \
  -d "{\"token_id\":\"<test_token_id>\",\"expected_updated_at\":\"<current_updated_at>\"}"
# Expect: 200 + { revoked: true, revoked_at: "..." }

# Step 4: verify row state
mcp__supabase__execute_sql:
  SELECT revoked_at, revoked_seq FROM public.client_portal_access WHERE id = '<test_token_id>';
# Expect: revoked_at IS NOT NULL; revoked_seq >= 1

# Step 5: verify audit-log entry
mcp__supabase__execute_sql:
  SELECT user_id, actor_token_id, entity_type, entity_id, action, details
    FROM public.activity_log
   WHERE entity_id = '<test_token_id>'
     AND entity_type = 'client_portal_access'
     AND action = 'revoked'
   ORDER BY created_at DESC LIMIT 1;
# Expect: 1 row; user_id IS NOT NULL (the admin); actor_token_id IS NULL.

# Step 6: forbidden role (PM) probe
curl -X POST .../revoke-token -d '{"token_id":"<another-token-id>","expected_updated_at":"..."}' \
  -H "Origin: http://localhost:3000" \
  -H "Cookie: <pm-session-cookie>"
# Expect: 403.

# Step 7: cross-tenant probe
curl -X POST .../revoke-token -d '{"token_id":"<org-A-token-id>","expected_updated_at":"..."}' \
  -H "Origin: http://localhost:3000" \
  -H "Cookie: <org-B-admin-session-cookie>"
# Expect: Lock conflict or 404 (RLS-scoped updateWithLock returns 0 rows).
# Verify org-A token revoked_at unchanged.

# Step 8: CSRF probe (H-2 iter-1 SYNTHESIS)
curl -X POST .../revoke-token -d '{"token_id":"<test_token_id>","expected_updated_at":"..."}' \
  -H "Origin: https://attacker.example.com" \
  -H "Cookie: <admin-session-cookie>"
# Expect: 403 (Origin mismatch).

# Step 9: Re-invitation semantics under Option A (BLK-5 iter-1 SYNTHESIS)
# After step 4 (token revoked_at populated; revoked_seq=1), attempt re-invitation:
mcp__supabase__execute_sql:
  SELECT * FROM public.create_client_portal_invite(
    '<test_org_id>', '<test_job_id>', 'test+b2a-08@example.com',
    'Revoke Test (re-invite)', '{}'::jsonb, NULL
  );
# Expect: SUCCESS — new row inserted with revoked_seq=0 (old row remains at revoked_seq=1).
# Confirms Option A: admin must revoke expired tokens before re-inviting because
# (org_id, client_id, job_id, revoked_seq) partial unique excludes only client_id IS NOT NULL
# rows; new row at revoked_seq=0 occupies the slot freed when old row's revoked_seq was bumped.

# Clean up
mcp__supabase__execute_sql:
  DELETE FROM public.client_portal_access WHERE email = 'test+b2a-08@example.com';
  -- audit_log row remains (append-only)
```

### AC-B2a-09 — Middleware PUBLIC_PATHS + FK citations

```bash
# Middleware: anon hits /owner/abc — should reach route (404 for B-2a since no /owner/[token] yet; 200 in B-2b)
curl -i http://localhost:3000/owner/abc | head -1
# Expect: HTTP/1.1 404 (Next not-found; NOT 302 to /login)

# Middleware: anon hits /api/owner-portal/admin/revoke-token (POST) — should reach route handler (401 unauthenticated)
curl -X POST http://localhost:3000/api/owner-portal/admin/revoke-token \
  -H "Content-Type: application/json" -d '{"token_id":"abc","expected_updated_at":"..."}' \
  -w "%{http_code}\n" -s -o /dev/null
# Expect: 401 (route handler's getCurrentMembership returns 401), NOT 302 redirect.

# Middleware: anon hits /api/owner-portal/acknowledge (POST) — should reach route handler (404 for B-2a; 200 in B-2b)
curl -X POST http://localhost:3000/api/owner-portal/acknowledge \
  -H "Content-Type: application/json" -d '{}' \
  -w "%{http_code}\n" -s -o /dev/null
# Expect: 404 (no handler yet in B-2a; B-2b adds), NOT 302 redirect.

# PostgREST FK citation verification — grep PLAN body
grep -c "client_portal_access_client_id_fkey\|client_portal_access_org_id_client_id_fkey\|client_portal_access_job_id_fkey\|draws_job_id_fkey" \
  .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2a-PLAN.md
# Expect: >=4 citations (per BLK-6 — all 4 FK constraint names cited).
```

### AC-B2a-10 — DB-backed rate-limit functional

```bash
# Burst test (35 sequential requests as authed admin)
for i in {1..35}; do
  curl -X POST http://localhost:3000/api/owner-portal/admin/revoke-token \
    -H "Content-Type: application/json" \
    -H "Origin: http://localhost:3000" \
    -H "Cookie: <admin-session>" \
    -d '{"token_id":"non-existent","expected_updated_at":"2026-01-01T00:00:00Z"}' \
    -w "%{http_code} " -s -o /dev/null
done
echo
# Expect: first 30 return 4xx (non-existent token → 404 or 409); requests 31+ return 429.

# Verify counter persists in DB
mcp__supabase__execute_sql:
  SELECT key_type, key_value, request_count, window_start
    FROM public.owner_portal_rate_limit
   ORDER BY window_start DESC LIMIT 5;
# Expect: rows present with request_count > 1 (counter accumulating, NOT destroyed per invocation)

# Verify cleanup function works
mcp__supabase__execute_sql:
  SELECT public.cleanup_owner_portal_rate_limit();
  SELECT COUNT(*) FROM public.owner_portal_rate_limit WHERE window_start < now() - interval '5 minutes';
# Expect: 0 (older rows cleaned up)
```

### AC-B2a-11 — Helpers enforce scope

```bash
# Unit tests
npm run test -- src/lib/owner-portal/__tests__/

# Manual cross-client probe (Layer 5 ai-logic-tester)
# (Setup: Drummond token + Drummond client_id + Drummond job_id + another client's draw_id)
npx tsx scripts/b-2a-helper-probe.ts \
  --drummond-token "<plaintext>" \
  --other-client-draw-id "<draw_id_in_same_org_different_client>"
# Expect:
#   assertDrawBelongsToToken(<other-draw-id>, <drummond-token>) → false
#   getScopedOwnerPortalClient(<drummond-token>).scopedFrom('jobs') → 1 row (Drummond job only)
```

### AC-B2a-12 — Indexes

```bash
mcp__supabase__execute_sql:
  SELECT indexname, indexdef
    FROM pg_indexes
   WHERE tablename IN ('draws', 'change_orders')
     AND indexdef LIKE '%job_id%'
   ORDER BY tablename, indexname;
# Expect: at minimum:
#   change_orders: idx_change_orders_job_id, idx_change_orders_status
#   draws: idx_draws_job_id (NEW B-2a; unfiltered single-column per N-3 prose-correction)
```

### AC-B2a-13 — GATE B-2a Jake review

Verification consists of the 9 EXPANDED-SCOPE §9 HALT GATE B-2a items, each cross-referenced to a prior AC (above). Jake reviews + ATTESTS each via SUMMARY.md table at ship time. Rejection → iter-2 OR fresh-session re-scope.

### AC-B2a-14 — Non-partial token-hash index (BLK-3 iter-1 SYNTHESIS)

```bash
# Verify token-hash index is non-partial post-00104 (BLK-3 fix — closes timing oracle on hot path)
mcp__supabase__execute_sql:
  SELECT indexname, indexdef FROM pg_indexes
   WHERE tablename = 'client_portal_access'
     AND indexname = 'idx_client_portal_access_token_hash';
# Expected: indexdef has no WHERE clause (non-partial — does NOT contain "WHERE (revoked_at IS NULL)")

# Verify SECURITY DEFINER REVOKE+GRANT pairs applied per BLK-4 (3 re-defined RPCs)
mcp__supabase__execute_sql:
  SELECT n.nspname, p.proname, pg_get_function_arguments(p.oid) AS args, acl
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace,
         LATERAL aclexplode(p.proacl) acl
   WHERE p.proname IN ('create_client_portal_invite', 'submit_client_portal_message', 'mark_client_portal_message_read')
     AND n.nspname = 'public';
# Expected: each function has only the expected GRANTs (no PUBLIC):
#   create_client_portal_invite: GRANT to authenticated only (admin function)
#   submit_client_portal_message: GRANT to anon only (homeowner-callable)
#   mark_client_portal_message_read: GRANT to anon only (homeowner-callable)
```

## 10. Cost projection

Per EXPANDED-SCOPE §10:

| Item | Estimate | Reasoning |
|---|---|---|
| Migration 00104 forward + down + types regen | $5-7 | 10 sub-steps (BLK-3 added §1k); atomic per D-17; types pipeline mandatory |
| Helper module + unit tests | $4-6 | 2 helpers + 4 unit tests; type-system contract for B-2b |
| Rate-limit infrastructure (table + RPC + cleanup + guard) | $5-8 | DB-backed counter + atomic UPSERT-RPC + cleanup function + application-layer guard + unit tests |
| Admin revocation API + UI surface | $5-8 | Route handler + page.tsx + sub-component + role gate + audit-log row + CSRF Origin check |
| Middleware extension + activity-log extension | $2-3 | Single-line PUBLIC_PATHS + interface extension + union additions |
| Smoke harness extension + SUMMARY + MASTER-PLAN | $2-3 | Standard scaffolding + AC attestation |
| Plan-review iter-2 (4-5 reviewers subset per nwrp203 §re-review scope) | $8-14 | spec-checker + security + database + ai-logic + optional rls-auditor (others passed iter-1; revisions don't touch their domain) |
| **Total estimated** | **$31-49** | Iter-2 fresh $50 ceiling per nwrp204; revision applied surgically per BLK/H/W/N checklist; cost stays under $50. |

**Halt gate (Rule 7d):** if mid-authoring or mid-execute projection exceeds **$50**, halt + surface to Jake. **Do NOT scope-engineer to fit** (Rule 7e). Possible micro-plan split:
- **B-2a-rate-limit** (D-16) — if rate-limit infra (table + cleanup + RPC + guard + tests) balloons; split into a separate plan.
- **B-2a-admin-ui** — if admin UI surface scope exceeds the 150-line minimum-viable.

**Mid-execute checkpoint (per WARNING #2 / iter-1 plan-checker).** After Task 6 (rate-limit guard) ships, executor measures cumulative cost. If actuals exceed **$20** (i.e., halfway through the $30-45 envelope but >50% of the $50 ceiling consumed with Tasks 7-9 remaining), HALT and surface to Jake with:
1. Itemized actual cost per Tasks 1-6 (migration + types + activity-log/labels + helpers + middleware + rate-limit).
2. Projection for Tasks 7-9 (admin route + admin UI + smoke/SUMMARY).
3. Recommendation: continue / micro-plan-split (B-2a-admin-ui carved off) / fresh-session re-scope per nwrp164 precedent.

The $20-after-Task-6 threshold is the **pre-defined gate trigger** (per Rule 7d "halt-and-surface, not executor judgment"). Triggering this gate is NOT a ceiling bump request (per Rule 7c — Jake-only); it is a checkpoint that lets Jake re-scope before the ceiling fires. Decision matrix at Task 6 boundary:
- If actuals ≤ $20: proceed to Tasks 7-9 without surfacing.
- If actuals $20-30: surface with continue/split options.
- If actuals > $30: halt mandatorily, no continue option.

**Slice-2 ceiling impact:** $31-49 of $200 Slice-2 ceiling consumed (iter-2 fresh $50). Remaining: $151-169 for B-2b + B-3..B-7 (combined EXPANDED-SCOPE §10 estimate: $125-182).

## 11. Rollback

**Rollback sequence (worst-case full revert):**

1. **Code revert (NOT destructive):** `git revert <B-2a commits>` — reverts middleware, route, helpers, admin UI, activity-log extension, type-regen. App returns to pre-B-2a state.
2. **Down migration:** `mcp__supabase__apply_migration` against `00104_*.down.sql`. Drops columns/indexes/constraints; restores 00074 RPC body verbatim; restores 00074:188-190 partial token-hash index form per BLK-3 down-reverse.
3. **Types regen:** re-run `supabase gen types typescript --linked` after down migration.
4. **Order matters:** Code revert FIRST, migration down SECOND. If migration is reverted while code still references `actor_token_id` / `client_id` / `revoked_seq`: TypeScript build error + runtime error.

**Forward-fix (preferred over rollback for most failures):**
- Discovered RPC NULL-leak regression post-ship → patch via additional `CREATE OR REPLACE`; do NOT rollback the migration (FK + index are additive + safe).
- Discovered cross-tenant FK bypass → emergency triage; immediate row-level patch via SQL; investigate composite FK enforcement.
- Discovered rate-limit broken → temporary bypass via flag; ship fix.

## 12. Dispatch authorization (halt_after: true)

Per nwrp202 §17: this PLAN halts at plan-review iter-2 for Jake review. Do NOT auto-/nx.

**Jake pre-/nx checklist (sign-off required on each):**

- [ ] **§6.a same-org FK invariant accepted.** Composite FK `(org_id, client_id) REFERENCES clients(org_id, id)` after `UNIQUE(org_id, id)` on clients. BY CONSTRUCTION; rejects CHECK trigger.
- [ ] **§6.b RPC NULL-leak fix accepted.** `CREATE OR REPLACE` derives `client_id` from `jobs.client_id`; RAISE on NULL. Existing 1.5c caller signature preserved.
- [ ] **§6.c index posture LOCKED per D-04** (full covering, no partial-WHERE-revoked_at-IS-NULL for admin-UI path; DROP+recreate non-partial `idx_client_portal_access_token_hash` for token-resolution hot path per BLK-3). NO partial-index escape per nwrp202 §4.
- [ ] **Plan-Author Latitude #3 disposition — `revoked_seq` column + re-invitation pattern: APPROVED Option A** (per iter-1 SYNTHESIS cross-reviewer alignment security + multi-tenant). `revoked_seq INTEGER` column add; revoke increments seq; re-invitation creates new row with reset seq. Row identity survives re-invitation; audit trail preserved. Options B + C rejected for stated reasons.
- [ ] **Plan-Author Latitude #4 disposition — sliding-window UPDATE 90-day → 1-year in `submit_client_portal_message` + `mark_client_portal_message_read` RPCs: APPROVED IN-SCOPE** (per iter-1 SYNTHESIS cross-reviewer alignment security + multi-tenant + ai-logic). Both RPC bodies authored inline in §5 Task 1 §3b + §3c with sliding-window line changed to `'1 year'`; consistent with nwrp200 LOCKED. Scope-completeness CONFIRMED via ai-logic-tester Q8 query (3 functions total touch `expires_at`; no other RPCs/triggers).
- [ ] **§6.d token lifecycle change accepted.** 1-year default supersedes 00074 90-day (column default + RPC fallback). Sliding-window UPDATEs in `submit_client_portal_message` + `mark_client_portal_message_read` covered by Latitude #4 APPROVED IN-SCOPE.
- [ ] **§6.d CSRF Origin check accepted (H-2 iter-1 SYNTHESIS).** Admin revoke route validates `request.headers.get('origin')` matches `process.env.NEXT_PUBLIC_APP_URL`; rejects 403 on mismatch. Same-origin OWASP pattern.
- [ ] **§6.d admin revocation rate-limit IP-only acceptance (W-2 iter-1 SYNTHESIS).** Disposition (a): explicit accept — admin sessions are authenticated + optimistic-lock-bound + audit-logged. Per-membership.user_id rate-limit deferred to Wave 1.1-Lite if observation surfaces abuse.
- [ ] **§6.e helper construction accepted.** `getScopedOwnerPortalClient` + `assertDrawBelongsToToken` in `src/lib/owner-portal/token.ts`. B-2b's UI plan consumes these helpers exclusively.
- [ ] **§6.f rate-limit DB-backed posture accepted.** Counter table + RPC + cleanup function + application-layer guard. Halt-and-surface escape valve preserved per D-16.
- [ ] **§6.g middleware PUBLIC_PATHS extension accepted (W-1 split form).** `/owner` + `/api/owner-portal/acknowledge` + `/api/owner-portal/admin` with per-entry comments distinguishing auth models.
- [ ] **§6.h activity_log column add accepted.** `actor_token_id` column + LogActivityArgs extension + `'client_portal_access'` entity type + `'revoked'` action.
- [ ] **§6.i draws.job_id unfiltered single-column index addition accepted.** change_orders.job_id verified existing.
- [ ] **§6.j threat model HIGH severity accepted.** Plan-review reviewer set: security + multi-tenant + rls + database + ai-logic + spec-checker + custodian.
- [ ] **Cost projection at $31-49** (§10) within $50 per-plan halt gate (Rule 7d). If mid-execute projection exceeds $50: halt-and-surface per Rule 7d, NO autonomous bump per Rule 7c.
- [ ] **GATE B-2a defined** (§8 AC-B2a-13). B-2b dispatch GATED on B-2a GATE confirmation. Rejection → iter-2 OR fresh-session re-scope.
- [ ] **B-2b dispatch preconditions noted (N-5 iter-1 SYNTHESIS).** B-2b plan-review iter-1 MUST include a grep-based gate blocking direct `createServiceRoleClient()` / `createServerSupabaseClient()` invocations in `src/app/api/owner-portal/**` files. The `scopedFrom` wrapper is a scope-floor enforcer (mandatory `.eq()` injection on every query), not a complete query gate (a B-2b author could still call `.or(...)` to widen scope). Plan-review must mechanically grep for escape-hatch patterns. Source: multi-tenant-architect MINOR-NOTE in PLAN-REVIEW-B2A-ITER1-MULTI-TENANT.md.

**On Jake approval:** issue `/nx` (or equivalent dispatch). Without Jake explicit sign-off, do NOT proceed to execute.

## 13. Hand-off

After B-2a ships (post-Jake-/nx dispatch + execute + QA + smoke green):

1. **Update MASTER-PLAN.md** — Slice-2 B-2a row → SHIPPED (date + commit ref). Note GATE B-2a pending Jake substantive review.
2. **Open SUMMARY.md** at `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2a-SUMMARY.md` with: shipped commits enumerated; AC attestation table (each AC marked PASS with verification artifact path); cost actual recorded; follow-ups for B-2b.
3. **GATE B-2a HALT** — Jake reviews + ATTESTS the 9 EXPANDED-SCOPE §9 verification items. On approval: B-2b dispatch authorized. On rejection: iter-2 on B-2a OR fresh-session re-scope; B-2b dispatch held.
4. **B-2b dispatch readiness:** post-GATE-B-2a approval, B-2b becomes UNBLOCKED (depends_on: B-2a ship + GATE per nwrp200 charter). **B-2b plan-review iter-1 MUST add grep-based gate** blocking direct `createServiceRoleClient()` / `createServerSupabaseClient()` invocations in `src/app/api/owner-portal/**` files per N-5 iter-1 SYNTHESIS.
5. **B-3 dependency:** B-3 trigger function will apply to B-2a's new `client_portal_access.client_id` column. B-3 dispatch sequenced after B-2b ship per EXPANDED-SCOPE §8.
6. **Trigger conditions for Wave 1.1-Lite items:**
   - Token rotation cadence revisit (after first 30-60 days of real RB usage per EXPANDED-SCOPE §6 Q5).
   - Vercel KV / Upstash rate-limit migration (if traffic grows beyond projected single-region DB-backed capacity).
   - SOC2-driven shorter token expiration (if first enterprise customer asks).
   - Per-membership.user_id admin-revocation rate-limit (if observation surfaces abuse per T-B2a-08c W-2 disposition).
7. **Custodian update** to phase folder: ensure SUMMARY.md exists; ensure all 9 atomic commits referenced; ensure smoke artifact path recorded.

---

**End of B-2a-PLAN.md (iter-2 revision).** Halts at plan-review iter-2 per `halt_after: true` and nwrp202 §17. Iter-2 revisions applied per PLAN-REVIEW-B2A-ITER1-SYNTHESIS §Iter-2 revision checklist: 6 BLOCKING + 2 HIGH + 2 WARNING + 5 NOTE items + 2 Latitude dispositions recorded. Cross-reviewer alignment captured (no Rule 9 factual disagreements). Plan-author latitude items resolved at iter-1 (Option A for Latitude #3; IN-SCOPE for Latitude #4). Subset re-review per nwrp203 §re-review scope: spec-checker + security + database + ai-logic + optional rls-auditor (4-5 reviewers; others passed iter-1 or are unaffected by revisions).
