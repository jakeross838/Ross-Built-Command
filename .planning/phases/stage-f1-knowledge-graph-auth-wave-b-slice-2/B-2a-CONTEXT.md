# Phase stage-f1-knowledge-graph-auth-wave-b-slice-2 — B-2a CONTEXT

**Gathered:** 2026-05-21 (assumptions mode via /np dispatch per nwrp202)
**Status:** Ready for planning
**Plan ID:** B-2a (Token-issuance security model — HIGH threat)
**Predecessor:** B-2-PLAN.md (iter-1 NEEDS-WORK 2026-05-20; superseded by nwrp200 re-split)

<domain>
## Phase Boundary

**B-2a delivers the token-issuance security model for the Owner Portal Path A.** It is the security core that B-2b's read-only homeowner UI builds on. B-2a closes a pre-existing intra-org cross-homeowner leak (iter-1 SYNTHESIS B-4: existing `create_client_portal_invite` RPC produces `client_id=NULL`) + introduces BY-CONSTRUCTION cross-client scoping + locks token lifecycle to 1-year + mandatory admin revocation + replaces the non-functional in-process Map rate-limit with a DB-backed counter table.

**Out of scope (deferred to B-2b):** `/owner/{token}` route, mobile UI, document downloads, actor_token_id audit-log WRITES (column is added in B-2a; WRITES happen in B-2b), TOCTOU close on acknowledge, soft-delete/status filters on portal queries, ClientCombobox token polish (TD-B1abis-03), NwButton TD-20 exemption.

**Out of scope (deferred entirely):** PATTERNS.md "Owner Status View" entry (iter-1 SYNTHESIS B-17 RESOLVED — §4h.3 + §2j.3 cover); token lifecycle alternatives (one-shot, auto-rotate); full Owner Portal feature set (notifications, comments, signatures) → Wave 1.1-Lite.
</domain>

<decisions>
## Implementation Decisions

### Schema — `client_portal_access.client_id` FK + same-org invariant

- **D-01:** Add `client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL` to `client_portal_access` with **composite FK invariant** — declare FK as `FOREIGN KEY (org_id, client_id) REFERENCES public.clients(org_id, id)` after adding `UNIQUE (org_id, id)` to `public.clients`. Composite FK enforces same-org BY CONSTRUCTION at Postgres level. Reject CHECK-trigger alternative (no precedent in migrations 00001..00103; introduces novel anti-pattern with SECURITY-DEFINER bypass risk).
  - **Why composite FK:** 4 established precedents — `org_members UNIQUE(org_id, user_id)` (00016:104), `org_invites UNIQUE(org_id, email)` (00019:17), `internal_billings UNIQUE(org_id, name)` (00038:41), `org_cost_codes UNIQUE(org_id, code)` (00083:30). `clients.id` is already PK (00100:216) so adding `UNIQUE(org_id, id)` is a single-line addition with no row-rewrite cost (~25 rows post-B-1a backfill). Composite FK is BY-CONSTRUCTION; CHECK trigger is convention-with-bypass-risk.
  - **Confidence:** Likely. `client_portal_access` is the first table to declare a 2-column FK to another org-scoped table — small novel step.
  - **If wrong:** CHECK trigger that silently fails or gets bypassed by SECURITY DEFINER + service-role would allow `(org_id=A, client_id=clients(org_id=B))` — exactly the cross-org leak this scope is supposed to close BY CONSTRUCTION.

- **D-02:** Backfill `client_portal_access.client_id` from existing `client_portal_access.job_id → jobs.client_id` (per B-1a/B-1a-bis canonical client identity). Drummond token row + any other live rows.

- **D-03:** Add **partial unique index** `(org_id, client_id, job_id) WHERE revoked_at IS NULL AND client_id IS NOT NULL AND expires_at > now()` (per iter-1 SYNTHESIS B-9 expired-token gap + B-10 1-client-N-jobs).

- **D-04:** **Index posture LOCKED:** full covering index + app-layer `revoked_at` filter (NOT partial `WHERE revoked_at IS NULL` — eliminates timing oracle distinguishing "revoked" from "never existed" per iter-1 SYNTHESIS B-7). **NO Jake-acceptance partial escape** per nwrp202 §4.

### Schema — `create_client_portal_invite` RPC NULL-leak fix

- **D-05:** Fix the RPC via **`CREATE OR REPLACE`** to derive `client_id` from `jobs.client_id` inside the function body (Option (b) from EXPANDED-SCOPE §7 B-2a). Reject BEFORE INSERT trigger (Option a) and resolve-route guard (Option c).
  - **Why CREATE OR REPLACE:** The existing RPC at `supabase/migrations/00074_client_portal.sql:390-439` is the **single canonical write path** into `client_portal_access`. `CREATE OR REPLACE FUNCTION` mirrors established pattern in same migration (3 places: 00074:112, 390, 448, 501) + migration 00102 canonical re-definition (00102:51-75). Adding `SELECT j.client_id INTO _client_id FROM public.jobs j WHERE j.id = p_job_id` + injecting into existing INSERT is ~5 lines. Trigger would duplicate logic + add row-level overhead + new SECURITY DEFINER footprint to harden. Resolve-route guard is application-layer convention violating CLAUDE.md "BY CONSTRUCTION" posture.
  - **Confidence:** Confident.
  - **If wrong:** RPC signature change would break existing single caller (builder UI via 1.5c admin surface). If `jobs.client_id IS NULL` for an invited job, RPC must explicitly RAISE rather than insert NULL — explicit guard required in plan body.

- **D-06:** RPC fix verified via **3 falsifiable queries** per nwrp202 §5 + EXPANDED-SCOPE §11 AC: backfill completeness (`SELECT COUNT(*) FROM client_portal_access WHERE client_id IS NULL AND revoked_at IS NULL AND expires_at > NOW();` → 0), RPC produces non-NULL `client_id` scoped to inviting org (representative invocation), cross-org rejection with zero-leakage-row clause (org_B-session attempts org_A-job invite → 0 new rows in org_A).

### Token lifecycle — 1-year + MANDATORY admin revocation

- **D-07:** Token expiration **LOCKED to 1-year** (supersedes 00074 90-day sliding window). Migration body documents supersession.
- **D-08:** **Admin revocation API path** sets `revoked_at = NOW()` on a specific token row.
- **D-09:** **Admin UI revocation surface** — minimum: "revoke" button on an existing admin-facing list of active tokens; if no such list exists, B-2a creates one. Plan-author scopes at iter-1.
- **D-10:** **Audit-log entry on every revocation** uses authenticated `user_id` (NOT `actor_token_id` — the revoker is an admin user; `actor_token_id` is reserved for B-2b's homeowner-initiated actions).
- **D-11:** Revocation row mutation uses `expected_updated_at` per CLAUDE.md R.10 + `updateWithLock()` from `src/lib/api/optimistic-lock.ts` (revoke is row mutation, NOT append-only; per nwrp202 reconciliation of iter-1 SYNTHESIS B-13).

### Middleware + API surface

- **D-12:** Extend `src/middleware.ts` PUBLIC_PATHS to include **BOTH** `/owner/*` AND `/api/owner-portal/*` (per iter-1 SYNTHESIS B-5). Without `/api/owner-portal/*`, middleware returns 401 for anon homeowner POST before route handler.

### Helpers — convention → construction

- **D-13:** Create `src/lib/owner-portal/token.ts` with **`getScopedOwnerPortalClient(resolvedToken)`** — server-only helper returning pre-scoped Supabase wrapper enforcing client + org scope. Eliminates "every author must remember `.eq()`" anti-pattern (iter-1 SYNTHESIS B-1). Construction over convention.
- **D-14:** Create **`assertDrawBelongsToToken(drawId, resolvedToken)`** helper in the same module. Pinned SQL guarantees acknowledge action (B-2b consumer) verifies draw belongs to token's client + org scope. Without this helper, B-2b's acknowledge route could leak intra-org cross-client (iter-1 SYNTHESIS B-3).

### Rate-limit infrastructure

- **D-15:** Rate-limit **LOCKED to DB-backed counter table with TTL cleanup** per nwrp201 + nwrp202 §3 (neither Vercel KV nor Upstash provisioned per package.json + .env probe done 2026-05-21). Per-token + per-IP keys on `/api/owner-portal/*`.
- **D-16:** **Halt-and-surface escape valve** per Rule 7d: if rate-limit infra (table schema + TTL cleanup + per-key derivation + tests) balloons B-2a past $50 per-plan halt gate, plan-author halts + surfaces; possible micro-plan split (`B-2a` = security model, `B-2a-rate-limit` = isolated rate-limit infra). NOT pre-decided here.

### Migration boundary

- **D-17:** **Single migration 00104** containing all B-2a schema work: (a) `clients UNIQUE(org_id, id)` add, (b) `client_portal_access.client_id` FK + backfill + new partial unique index, (c) `create_client_portal_invite` `CREATE OR REPLACE`, (d) `activity_log.actor_token_id` column add (WRITES are B-2b scope but column lives here since it FKs to `client_portal_access`), (e) rate-limit counter table + TTL cleanup function, (f) revocation-related column verification + admin path.
  - **Why single migration:** Atomic rollback contract. Codebase precedent strong for cohesive atomic migrations (00074 = 575 lines bundling 2 tables + 3 RPCs + indexes + RLS; 00026 bundles `lien_releases + notifications + activity_log + 2 more tables`). B-2a is GATE for B-2b — if any single piece fails verification, entire migration ROLLBACKs and B-2b doesn't dispatch.
  - **Confidence:** Likely. Counter-trigger: per-plan halt gate may force B-2a / B-2a-rate-limit split — that's an EXECUTION-time scope decision (Rule 7d), not a migration-boundary decision. Single migration is still possible even with two plans.
  - **If wrong:** Rate-limit retro-correction would force re-rolling security model. Mitigation: rate-limit is the simplest piece (1 table + cleanup function); FK + RPC fix are load-bearing.

### `draws` + `change_orders` index verification

- **D-18:** Plan-author runs `SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ('draws', 'change_orders') AND indexdef LIKE '%job_id%'` at /np time; adds missing indexes to migration 00104 if absent (per iter-1 SYNTHESIS B-11). Without indexes, every B-2b portal page = seq scan from external path.

### PostgREST FK citation

- **D-19:** B-2a-PLAN.md body cites **`client_portal_access_client_id_fkey`** + **`client_portal_access_job_id_fkey`** constraint names per CLAUDE.md Workflow posture Rule 2 (iter-1 SYNTHESIS B-8 resolved).

### Codebase reality B-2a creates (confirmed via Glob)

- **D-20:** `src/lib/owner-portal/` directory **does not exist** — B-2a creates it from scratch.
- **D-21:** `src/app/api/owner-portal/` directory **does not exist** — B-2a creates it (for admin revocation API path + future B-2b acknowledge endpoint).
- **D-22:** Existing `src/app/owner-portal/page.tsx` (Caldwell fixtures 1.5c thin wrapper) **untouched** by B-2a; superseded by B-2b's `/owner/{token}`.
- **D-23:** `src/lib/activity-log.ts` `LogActivityArgs` interface (lines 56-63) does NOT have `actor_token_id` today. B-2a adds the column + extends the interface; the LOG WRITES that use `actor_token_id` are B-2b scope.

### Plan-author CHOICES surfaced to iter-1 reviewers (NOT pre-decided here)

D-01..D-23 above lock the substantive scope. Plan-author retains latitude on:
- Exact SQL shape of composite FK migration (DDL ordering, lock posture during backfill)
- Exact RPC body re-definition (parameter signature preservation + RAISE behavior for NULL job.client_id)
- Rate-limit table column shape (`key TEXT` vs `key_hash BYTEA`; window strategy; cleanup mechanism `pg_cron` vs `DELETE WHERE window_start < now() - interval '1 hour'` on each INSERT)
- Admin UI revocation surface (minimum viable scope)
- Exact `getScopedOwnerPortalClient` interface (return shape; error semantics)
- Backfill safety (lock posture; partial-rollback resilience)

### Claude's Discretion

None for B-2a. Every decision is locked by EXPANDED-SCOPE + nwrp chain OR is explicitly surfaced as plan-author latitude with bounded option space.

### Folded Todos

None — no pending todos matched this phase per `gsd-sdk query todo.match-phase` (todo_count: 0).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (gsd-planner, security-reviewer, multi-tenant-architect, rls-auditor, database-reviewer, ai-logic-tester) MUST read these before planning or implementing.**

### Slice-level scope (CANONICAL TRUTH)

- `.planning/expansions/stage-f1-knowledge-graph-auth-wave-b-slice-2-EXPANDED-SCOPE.md` — Status: RE-APPROVED 2026-05-21 per nwrp202; §7 plan #1 is canonical B-2a scope; §6 Q5 LOCKED (1-year + revocation); §1 entity table B-2a rows; §4 cross-cutting rate-limit row; §9 HALT GATE B-2a (8 verification items); §11 12 falsifiable B-2a ACs.

### Historical artifacts (predecessor; inputs to re-scope)

- `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2-PLAN.md` — 963-line iter-1 PLAN (NEEDS-WORK 2026-05-20); superseded by nwrp200 re-split BUT contains substantial detail to mine (e.g., §4.a + §4.b on schema posture; §3 on /owner route relocation rationale).
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/PLAN-REVIEW-ITER1-SYNTHESIS.md` — 9-reviewer consensus on 17 BLOCKING findings (B-1..B-17); B-1..B-11 map to B-2a, B-12..B-16 map to B-2b, B-17 RESOLVED.
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/PLAN-REVIEW-ITER1-SECURITY.md` — security-reviewer's 2 BLOCKING + 4 HIGH + 4 MEDIUM findings (B-6 rate-limit non-functional + B-7 timing oracle drove nwrp200/202 lockouts).
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/PLAN-REVIEW-ITER1-MULTI-TENANT.md` — multi-tenant-architect's 3 CRITICAL (BY-CONSTRUCTION bar) findings drove same-org FK invariant scope.
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/PLAN-REVIEW-ITER1-RLS-AUDITOR.md` — rls-auditor's B-4 NULL-leak finding + B-5 PUBLIC_PATHS finding.
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/PLAN-REVIEW-ITER1-AI-LOGIC.md` — ai-logic-tester's 4 BLOCKING findings (B-3 SQL pinning + B-8 FK citation + others).
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/PLAN-REVIEW-ITER1-DATABASE.md` — database-reviewer's 2 BLOCKING (B-9 expired-token gap + B-11 jobs.job_id index).
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/PLAN-REVIEW-ITER1-SPEC-CHECK.md` — spec-checker's W-1 doc-downloads scope (RESOLVED per nwrp200 → B-2b).
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/PLAN-REVIEW-ITER1-CUSTODIAN.md` — custodian PASS (planning tree clean).

### Orchestrator-directive chain (decision audit trail)

- `nwrp196` — Slice-2 EXPANDED-SCOPE first APPROVE flip (2026-05-20)
- `nwrp197` — Setup verification (no-op)
- `nwrp198` — Original /np dispatch for B-2 (Tier 1; produced superseded B-2-PLAN.md)
- `nwrp199` — Fresh-session re-orientation (2026-05-21)
- `nwrp200` — B-2 → B-2a + B-2b re-split DIRECTIVE
- `nwrp201` — Rate-limit DB-backed decision; B-4 AC strengthening request
- `nwrp202` — RE-APPROVE + dispatch authorization for B-2a (this dispatch)

### Architecture / standards

- `.planning/architecture/ARCHITECTURE.md` §8 — F1 Owner Portal Path A auth path constraint (Path A chosen — extending `client_portal_access` tokens; NO `owner_view` role).
- `.planning/architecture/ENTITY-INVENTORY.md` — entity catalog (Retention class + PII? columns).
- `CLAUDE.md` — Multi-tenant RLS BY CONSTRUCTION (Architecture posture); Q10b scope-axis rule for child detail tables; Development Rule on PostgREST FK citation; Workflow posture Rules 1-9 (especially Rule 1 schema≠runtime, Rule 2 FK citation, Rule 3 ai-logic-tester executes queries, Rule 4 Playwright smoke pre-QA, Rule 7d $50 per-plan halt gate, Rule 7e scope-engineering ban, Rule 8 hook fail-closed, Rule 9 cross-reviewer factual disagreement HALT).
- `.planning/MASTER-PLAN.md` — DECISIONS LOG + §9 CURRENT POSITION + §12 NEXT PLANNED WORK (Slice-2 entries).

### Codebase patterns (file:line citations)

- `supabase/migrations/00074_client_portal.sql` — existing token model. Line 174: expiration column. Lines 390-439: `create_client_portal_invite` RPC. Lines 247-301: RLS posture. Lines 112, 390, 448, 501: `CREATE OR REPLACE FUNCTION` precedents.
- `supabase/migrations/00100_clients_schema_foundation.sql` — `clients` table. Line 216: PK on `id`. Line 244: existing UNIQUE constraints. Reference for FK pattern.
- `supabase/migrations/00101_drop_jobs_client_columns.sql` — B-1a-bis precedent for atomic consumer-refactor + DROP migration.
- `supabase/migrations/00102_wa_iter1_security_cleanup.sql` lines 42-75 — canonical search_path hardening pattern (`SET search_path = public, pg_temp` on SECURITY DEFINER functions). B-2a's RPC fix + revocation API must inherit.
- `supabase/migrations/00026_phase5_scaffolding_tables.sql` lines 82-100 — `activity_log` table shape (no `actor_token_id` today).
- `supabase/migrations/00016*.sql` line 104 — `org_members UNIQUE(org_id, user_id)` composite UNIQUE precedent.
- `supabase/migrations/00019*.sql` line 17 — `org_invites UNIQUE(org_id, email)` composite UNIQUE precedent.
- `supabase/migrations/00038*.sql` line 41 — `internal_billings UNIQUE(org_id, name)` composite UNIQUE precedent.
- `supabase/migrations/00083*.sql` line 30 — `org_cost_codes UNIQUE(org_id, code)` composite UNIQUE precedent.
- `src/lib/activity-log.ts` lines 56-63 — `LogActivityArgs` interface; needs `actor_token_id` extension (column added in B-2a; WRITES are B-2b scope).
- `src/middleware.ts` line 7 — PUBLIC_PATHS constant; extension point for B-2a (`/owner/*` + `/api/owner-portal/*`).
- `src/lib/supabase/service.ts` lines 11-42 — service-role client creation pattern. B-2a's RPC fix verification + admin revocation API use this.
- `src/lib/api/optimistic-lock.ts` lines 36-60 — `updateWithLock` for admin revocation row mutation (D-11).
- `src/app/owner-portal/page.tsx` — existing 1.5c thin wrapper (untouched by B-2a; superseded by B-2b's `/owner/{token}`).

### Codebase maps (project-level)

- `.planning/codebase/ARCHITECTURE.md` — system architecture overview.
- `.planning/codebase/CONVENTIONS.md` — coding conventions.
- `.planning/codebase/STRUCTURE.md` — directory structure conventions.
- `.planning/codebase/STACK.md` — stack reference (Next.js 14 + Supabase + Claude API).
- `.planning/codebase/CONCERNS.md` — cross-cutting concerns inventory.
- `.planning/codebase/INTEGRATIONS.md` — external integrations.
- `.planning/codebase/TESTING.md` — testing conventions.

### Verification harness

- `.planning/architecture/VERIFICATION-PIPELINE.md` — 3-layer verification harness (D-073) for post-ship sign-off (Layer 1 mechanical + Layer 2 standards + Layer 3 vision).
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`supabase/migrations/00074_client_portal.sql` (the existing 575-line `client_portal_access` migration)** — token-hash model (SHA-256 hex; plaintext returned ONCE); RLS policies (3 anon-role policies + service-role unrestricted); 3 RPCs (`create_client_portal_invite`, `consume_client_portal_token`, `submit_client_portal_message`). B-2a extends — does NOT rewrite. The token-hash mechanism is unchanged; only `client_id` is added + lifecycle locked + revocation surfaced + RPC fix.
- **`CREATE OR REPLACE FUNCTION` re-definition idiom** — well-established pattern in 00074 (3 instances) + 00102 (1 instance). B-2a follows.
- **Composite UNIQUE constraint precedent** — 4 established (00016, 00019, 00038, 00083). B-2a adds the 5th to `clients(org_id, id)`.
- **`SECURITY DEFINER + SET search_path = public, pg_temp` discipline** — canonical pattern per 00102:42-75. B-2a's RPC re-definition + admin revocation function inherit.
- **`updateWithLock()` from `src/lib/api/optimistic-lock.ts`** — for admin revocation row mutation (D-11).
- **Service-role client creation pattern** at `src/lib/supabase/service.ts:11-42` — B-2a's verification queries + admin path use this.
- **Existing 1.5c thin-wrapper Owner UI** (`src/app/owner-portal/page.tsx` + `/pay-apps/[id]/page.tsx`) — UNTOUCHED by B-2a; superseded by B-2b.

### Established Patterns

- **Multi-tenant RLS BY CONSTRUCTION** (CLAUDE.md Architecture posture + nwrp200 escalation) — B-2a composite FK invariant + scope helpers convert convention to construction.
- **Q10b scope-axis rule** (CLAUDE.md) — `client_portal_access` is ORG-scoped child (queries are org-driven), so direct-filter RLS via `org_id` column applies. B-2a's new `client_id` column adds an *additional* scope dimension; RLS continues to filter on `org_id` while application-layer helper enforces client scope.
- **PostgREST FK citation** (CLAUDE.md Workflow Rule 2) — B-2a-PLAN.md body cites `client_portal_access_client_id_fkey` + `client_portal_access_job_id_fkey` for any future embedded-select hint.
- **Atomic migration bundling** (00074 575 lines / 00026 multi-table) — B-2a's migration 00104 bundles all schema work into one atomic unit per D-17.
- **`gen_random_bytes(32)` + SHA-256 hex token-hash** (00074:170-185) — B-2a does NOT introduce new tokens; existing mechanism continues.
- **Search_path hardening on SECURITY DEFINER** (00102:42-75) — B-2a inherits.

### Integration Points

- **`src/middleware.ts:7`** PUBLIC_PATHS constant — B-2a extends with `/owner/*` + `/api/owner-portal/*`.
- **`src/lib/activity-log.ts:56-63`** LogActivityArgs interface — B-2a extends with `actor_token_id` field (WRITES are B-2b scope).
- **`src/lib/api/optimistic-lock.ts:36-60`** `updateWithLock` — B-2a admin revocation API uses for row mutation.
- **NEW: `src/lib/owner-portal/token.ts`** — created in B-2a; houses `getScopedOwnerPortalClient` + `assertDrawBelongsToToken` (D-13, D-14).
- **NEW: `src/app/api/owner-portal/`** — created in B-2a (admin revocation route + future B-2b acknowledge endpoint).
- **`supabase/migrations/00104_*.sql`** — NEW migration created in B-2a per D-17.
- **`supabase/migrations/00104_*.down.sql`** — REQUIRED rollback migration accompanying 00104.
- **`src/lib/types/database.types.ts`** — regenerated via `supabase gen types typescript --linked` (mandatory per CLAUDE.md Development Rules); plan-author MUST stage in same commit as 00104.
</code_context>

<specifics>
## Specific Ideas

- **Drummond token row backfill** is the canary for D-02. Plan-review iter-1 verifies via representative SQL probe (per Rule 3 ai-logic-tester executes queries) that Drummond's existing token row has its `client_id` populated post-migration (matching `jobs.client_id` of Drummond's job).
- **Rate-limit table shape** is plan-author latitude. Plan-author should consult Postgres ecosystem patterns (no Nightwork precedent exists). See `<deferred>` research items below.
- **Composite FK index implications** — adding `UNIQUE(org_id, id)` on `clients` may cause `pg_indexes` redundancy with `clients_pkey`. Postgres allows this; ANALYZE-time planner behavior should be confirmed via `EXPLAIN` once migration applies (verify, don't block).
- **Admin revocation UI minimum** — should consist of: (a) admin-facing list of active tokens for the org (rows: token id, job, client, created_at, expires_at, last_accessed_at, "Revoke" button), (b) revoke-confirmation modal, (c) revoke API call → status update. Plan-author may opt for a tighter scope (e.g., just SQL + an existing admin page receives a section) if $50 halt gate pressure.
</specifics>

<deferred>
## Deferred Ideas

### Plan-author iter-1 research items (NOT blocking discuss-phase)

- **DB-backed rate-limit counter table shape** — no Nightwork precedent. Plan-author should consult Postgres ecosystem patterns (e.g., `INSERT ... ON CONFLICT (key) DO UPDATE SET count = count + 1` + window/cleanup strategy). Decision points: composite `(key TEXT, window_start TIMESTAMPTZ)` primary key vs `(key_hash BYTEA)`; TTL cleanup via `pg_cron` (no Nightwork precedent for pg_cron) vs lazy `DELETE WHERE window_start < now() - interval '1 hour'` on each INSERT; index posture for the rate-limit-bucket hot read path. This is the rate-limit ballooning risk flagged in nwrp200 → potential `B-2a-rate-limit` micro-plan split per Rule 7d.
- **Composite FK index ANALYZE behavior** — when Postgres enforces composite FK `(org_id, client_id) REFERENCES clients(org_id, id)`, the matching UNIQUE INDEX on `clients(org_id, id)` is required + creates redundancy with existing `clients_pkey` (UNIQUE on `id` alone). ANALYZE-time planner behavior should be confirmed via `EXPLAIN` once migration applies. NOT a blocker; verify-on-apply.

### Out-of-scope for B-2a (mapped to B-2b or later)

- All UI work (`/owner/{token}` route, mobile UI, document downloads) → **B-2b**
- `actor_token_id` audit-log WRITES (column add is B-2a; writes are B-2b) → **B-2b**
- TOCTOU close on acknowledge (DB unique constraint on `activity_log (entity_id, actor_token_id, action) WHERE action='acknowledged'` + INSERT...ON CONFLICT DO NOTHING) → **B-2b**
- soft-delete + status filters on portal queries → **B-2b**
- ClientCombobox token polish (TD-B1abis-03) → **B-2b**
- NwButton 56px TD-20 boundary exemption → **B-2b**
- B-3 soft-delete trigger + DEF-WC-1 + DEF-WC-3 + 25 tenant tables → **B-3 (depends on B-2a's new `client_portal_access.client_id` FK shape)**

### Out-of-scope for Slice-2 entirely

- Full Owner Portal feature set (notifications, comments, signature workflows, ongoing engagement) → **Wave 1.1-Lite**
- Token lifecycle alternative options (one-shot per pay-app, auto-rotate every N days) → **Wave 1.1-Lite revisit conditions** (first enterprise SOC2 ask OR real RB homeowner usage data)
- "Notify homeowner that token will expire in 30 days" auto-rotation flow → **Wave 1.1-Lite**
- Token rotation in-place (extend expiration without re-invite) → **Wave 1.1-Lite**
- New PATTERNS.md "Owner Status View" entry — **RESOLVED per iter-1 SYNTHESIS B-17** (existing §4h.3 + §2j.3 cover; do not invent 13th pattern)

### Reviewed Todos (not folded)

None — `gsd-sdk query todo.match-phase` returned 0 matches.
</deferred>

---

*Phase: stage-f1-knowledge-graph-auth-wave-b-slice-2*
*Plan: B-2a (Token-issuance security model — HIGH threat; halt_after: true)*
*Context gathered: 2026-05-21 via /np dispatch (assumptions mode, --auto)*
*Driver: nwrp202 RE-APPROVE + dispatch authorization (chain: nwrp200 → nwrp201 → nwrp202)*
