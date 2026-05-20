---
phase: stage-f1-knowledge-graph-auth-wave-b-slice-2
plan: B-2
plan-name: client-portal-client-id-fk-owner-portal-path-a
type: execute
wave: B-2 (first per Slice-2 execute order)
depends_on: []
autonomous: true
halt_after: true  # Tier 1 — GATE substantive review by Jake before /nx ship per nwrp198 §26
requires_smoke: true  # first user-facing F1 surface + mobile-mandatory
threat_model_severity: medium  # external token surface; mobile-first; first user-facing F1 UI
status: AUTHORED — PENDING JAKE REVIEW AT PLAN-REVIEW ITER-1
authored: 2026-05-20
authored_by: gsd-planner via /np dispatch (nwrp198)
authorization: Slice-2 EXPANDED-SCOPE APPROVED 2026-05-20 per nwrp196 + nwrp198 /np dispatch authorization
source_decisions:
  - "EXPANDED-SCOPE §7 item 1 (B-2): client_portal_access.client_id FK + Owner Portal Path A min UI + 1-2 audit integration points + TD-B1abis-03"
  - "EXPANDED-SCOPE Q4b (umbrella): Path A — extend client_portal_access tokens, NO new role"
  - "EXPANDED-SCOPE Q5: 1-year default token expiration deferred to Wave 1.1-Lite for lifecycle policy revisit (existing 00074 = 90-day sliding window; B-2 inherits)"
  - "ARCHITECTURE.md §8: F1 commits to ONE auth path — Path A chosen"
  - "nwrp166 §10-11 distribute pattern: TD-B1abis-03 (ClientCombobox token polish) lands in B-2"
  - "nwrp198 §16-20 mandatory resolution: token security model + actor_token_id audit + mobile-first UI"
  - "CLAUDE.md Architecture posture: Multi-tenant RLS BY CONSTRUCTION; PostgREST FK citation Rule 2; Drummond as reference job (production-facing); synthetic UUIDs for harness fixtures"
  - "CLAUDE.md Workflow posture Rule 7d: $50 per-plan halt gate; Rule 7e: scope-engineering ban"
  - "CLAUDE.md UI rules: Slate type system; design tokens (no hardcoded hex); mobile-first first F1 user-facing surface"
  - "EXPANDED-SCOPE §1 mapped entities: ON DELETE SET NULL on client_id FK (preserves token row if client soft-deleted)"
  - "EXPANDED-SCOPE §4 rate-limiting MEDIUM: token endpoint rate-limit per token + IP"
  - "Existing migration 00074: SHA-256 hex token-hash model; plaintext returned ONCE; sliding-window 90-day expires; service-role API pattern for portal reads"
requirements: []  # captured via §8 ACs
files_modified:
  - supabase/migrations/00104_client_portal_access_add_client_id.sql           # NEW (FK + backfill + partial unique index + actor_token_id on activity_log)
  - supabase/migrations/00104_client_portal_access_add_client_id.down.sql      # NEW
  - src/lib/types/database.types.ts                                            # regenerated via supabase gen types (mandatory per CLAUDE.md)
  - src/app/owner/[token]/page.tsx                                             # NEW token-resolved entry route
  - src/app/owner/[token]/pay-apps/[id]/page.tsx                               # NEW token-resolved pay-app drilldown
  - src/app/owner/layout.tsx                                                   # NEW standalone owner layout (no auth nav-bar)
  - src/app/owner/error.tsx                                                    # NEW error boundary (token not found / revoked / expired)
  - src/app/api/owner-portal/resolve/route.ts                                  # NEW POST handler: token → portal_access_id + client_id + scoped data (service-role-backed)
  - src/app/api/owner-portal/acknowledge-pay-app/route.ts                      # NEW POST handler: writes activity_log with actor_token_id
  - src/lib/owner-portal/token.ts                                              # NEW server-only token validation + rate-limit helpers
  - src/lib/activity-log.ts                                                    # add actor_token_id to ActivityEntityType + LogActivityArgs interface + insert path (T2 audit integration)
  - src/middleware.ts                                                          # add /owner/* to PUBLIC_PATHS (token-based auth)
  - src/components/client-combobox.tsx                                         # TD-B1abis-03 polish (~10 lines: boxShadow + inline label style → tokens)
files_referenced:
  - .planning/expansions/stage-f1-knowledge-graph-auth-wave-b-slice-2-EXPANDED-SCOPE.md  # §1 mapped entities + §4 cross-cutting + §7 recommended scope (B-2 row) + §10 cost
  - supabase/migrations/00074_client_portal.sql                                # existing token model (SHA-256, sliding window, 3 RPCs)
  - supabase/migrations/00100_clients_schema_foundation.sql                    # FK shape reference (jobs.client_id ON DELETE SET NULL)
  - supabase/migrations/00101_drop_jobs_client_columns.sql                     # B-1a-bis precedent (consumer refactor + DROP atomic)
  - supabase/migrations/00026_phase5_scaffolding_tables.sql                    # activity_log table schema (no actor_token_id today)
  - src/app/owner-portal/page.tsx                                              # existing 1.5c thin-wrapper (Caldwell fixtures; replaced by token route)
  - src/app/owner-portal/pay-apps/[id]/page.tsx                                # existing 1.5c thin-wrapper
  - src/components/prototypes/OwnerDashboardView.tsx                           # existing tenant-blind View component (reused by token route)
  - src/components/prototypes/OwnerDrawView.tsx                                # existing tenant-blind View component (reused by token route)
  - src/components/cost-code-combobox.tsx                                      # TD-B1abis-03 idiom reference
  - src/middleware.ts                                                          # PUBLIC_PATHS extension point
  - src/lib/activity-log.ts                                                    # logActivity signature extension
  - .planning/MASTER-PLAN.md §11 row 297 (TD-B1abis-03 — ClientCombobox token polish)
  - .planning/architecture/ARCHITECTURE.md §8 (F1 auth path constraint)
  - .planning/design/PATTERNS.md (Document Review pattern; new "Owner Status View" pattern to be added)
  - CLAUDE.md Architecture posture + UI rules + Workflow posture Rules 1-9
  - .planning/phases/stage-f1-hook-doc-only-detect/HDOD-PLAN.md (Tier 1 plan structure precedent)
sequence:
  before: B-3 (B-3 trigger applies to B-2's new FK shape on client_portal_access; B-3 also adds actor_token_id-aware audit posture where B-2 introduces it)
  after: Wave-A iter-1 cleanup ship (RESOLVED 2026-05-19) + TD-WAIC-03 closure (RESOLVED 2026-05-20 via 00103)
  parallel_authoring_ok: n/a (B-2 is first plan in Slice-2 execute order; no parallel peer)
  parallel_execute_ok: false (single migration + UI; serial only)
acceptance-criteria-target: 19 falsifiable items (AC-B2-01..AC-B2-19)
qa_reviewers:
  - spec-checker
  - custodian
  - security-reviewer       # token surface + actor_token_id audit + cross-tenant leak threat model
  - multi-tenant-architect  # RLS posture + anon-role scoping
  - ai-logic-tester         # Rule 3: execute representative queries (token → client_id → scoped data; cross-client probe)
  - rls-auditor             # anon-role policy + RESTRICTIVE intersection
  - database-reviewer       # FK shape + partial unique index + backfill correctness
  - design-pushback         # mobile-first UI + new "Owner Status View" PATTERNS.md entry
---

# Plan B-2 — `client_portal_access.client_id` FK + Owner Portal Path A min UI + 1-2 audit integration points + TD-B1abis-03 polish

## 1. Goal

Ship the **first F1 user-facing UI surface** as a **mobile-mandatory, token-based external Owner Portal at `/owner/{token}`** that lets a Ross Built homeowner view their job's progress, pay-app status, approved change-order totals, and downloadable documents — **without any authenticated session**, with **mechanically enforced single-client scoping** so no token can ever surface another client's data, and with a **first-class `actor_token_id` audit-trail integration** that distinguishes homeowner-via-token actions from authenticated-user actions in `activity_log` for SOC2 CC6.1 / CC7.2 traceability.

Specifically:

1. **Schema extension** — add `client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL` to `client_portal_access` (currently scoped to `(org_id, job_id, email)`); backfill from `client_portal_access.job_id → jobs.client_id` per B-1a/B-1a-bis canonical client identity; add partial unique index `(org_id, client_id) WHERE revoked_at IS NULL` to prevent duplicate active tokens per client identity (parallel to existing `(org_id, job_id, email)` per-job-per-email index).
2. **Audit integration** — add `actor_token_id UUID REFERENCES public.client_portal_access(id) ON DELETE SET NULL` to `activity_log`; extend `logActivity()` to accept and persist it; mutual-exclusion CHECK constraint (`user_id IS NULL XOR actor_token_id IS NULL` for the new rows — see §4.b for legacy-row reconciliation).
3. **Owner Portal Path A min UI** — new `/owner/{token}` route (NOT extending existing `/owner-portal/*`; see §3 + §4.c for relocation rationale) that:
   - Resolves the token via the **existing 00074 hash-and-lookup pattern** (SHA-256 hex of plaintext; no new token-gen mechanism).
   - Renders **OwnerDashboardView** (already tenant-blind) and **OwnerDrawView** for pay-app drilldown, fed by **real Drummond data from a service-role API**.
   - Mobile-first per iPhone 13/14/15 Pro Max + Pixel 7 viewport contract.
   - Standalone layout (no authenticated nav-bar; homeowner is anon).
   - Falls through to 404 / "link no longer valid" on revoked/expired/missing tokens via Next error boundary.
4. **1-2 owner-initiated audit actions** — implement **pay-app acknowledgment** (the canonical example per EXPANDED-SCOPE §7) as the audit-integration probe action. Writes `activity_log` row with `entity_type='draw'`, `action='acknowledged'` (new ActivityAction value), `user_id=NULL`, `actor_token_id=<portal_access.id>`. Optimistic locking applies per CLAUDE.md cross-cutting.
5. **TD-B1abis-03 carry-forward** (per nwrp166 distribute pattern, ~10 lines) — replace `src/components/client-combobox.tsx` inline `boxShadow` (line 203) and inline `style={fontFamily, color}` (lines 173-180) with token-driven Tailwind utility classes mirroring `cost-code-combobox.tsx` idiom. No accessibility behavior change; pure design-token discipline.

**Out of scope (deferred per EXPANDED-SCOPE §3 + §7):**
- Full Owner Portal feature set (notifications, comments, signature workflows, ongoing engagement) → Wave 1.1-Lite.
- Token lifecycle policy revisit (rotation cadence) → Wave 1.1-Lite per EXPANDED-SCOPE Q5.
- PII restoration in UI (clients.email/phone visibility) → Wave 1.1-Lite per EXPANDED-SCOPE Q4.
- PM contact info surfacing through the owner portal → Wave 1.1-Lite (homeowner sees PM name only).
- New "Owner Status View" PATTERNS.md entry — design-pushback may request it during plan-review iter-1; we add it inside B-2 scope IF requested (otherwise documented as TD-B2-01 for fast follow-up).

## 2. Why now / dependencies

- **Sequencing rationale (per EXPANDED-SCOPE §8):** B-2 is **first** in Slice-2's execute order. B-3 (trigger function + DEF-WC-1) depends on B-2's new `client_id` FK shape because B-3's per-table soft-delete trigger applies to `client_portal_access` and must handle the new column gracefully; B-3 also needs the `actor_token_id` audit integration pattern that B-2 establishes so the trigger function can write activity_log rows that distinguish service-role-context soft-deletes from token-context soft-deletes.
- **Slice-1 closed 2026-05-18** with all 4 plans shipped (B-D080, B-1a, B-1a-bis, B-1b). TD-WAIC-03 PUBLIC-grant exposure was RESOLVED 2026-05-20 via migration 00103 per nwrp196-197. The repo is at a clean baseline; pre-dispatch advisor check confirmed zero outstanding security findings on the call path B-2 touches.
- **Hook calibration phase shipped 2026-05-19** (stage-f1-hook-doc-only-detect via commit chain `ee9e1bc + 56de959 + a8ae5b1`); doc-only commits now skip the qa-runs timestamp gate. B-2 is mixed-diff (migration + .ts + .tsx + bash N/A) — the existing fail-closed posture applies normally.
- **TD-B1abis-03 carry-forward** (nwrp166 §11 distribute map): lands in B-2 because B-2's plan-author is already reading client UI code adjacent to the Owner Portal surface. Tight surface; ~10 lines; one-commit polish addition.
- **No new entities BEYOND** the column additions; the entire token-validation primitive already exists in migration 00074 (SHA-256 + sliding-window + anon GRANT pattern). B-2 **extends** that primitive — it does not duplicate or replace it.
- **Drummond is the reference job for production-facing artifacts** (Owner Portal demos against Drummond's `client_portal_access` token + Drummond's pay-app history). Synthetic UUIDs (`smoke-seed.sql`) for harness fixture rows where applicable, per CLAUDE.md.

## 3. Pre-flight downstream-consumer-sweep

Per CLAUDE.md Workflow posture + `.planning/lessons.md` 2026-05-15 entry: all plans MUST include downstream sweep before execute dispatch.

### Sweep 1 — existing `/owner-portal/*` route consumers

```bash
# Search for any consumer of /owner-portal route (nav-bar, links, smoke, redirects)
grep -rn "owner-portal\|/owner/" src/ scripts/ .planning/ 2>/dev/null \
  | grep -v "design-system/prototypes" \
  | grep -v ".planning/architecture\|.planning/design\|.planning/phases"
```

**Findings (mechanical at plan-author time, 2026-05-20):**

- `src/app/owner-portal/page.tsx` — 1.5c thin-wrapper with Caldwell fixtures, NOT real owner-portal-via-token. Author-time comment explicitly states: "F1 commits to ONE auth path (Path A or Path B); 1.5c structural — Caldwell fixtures only."
- `src/app/owner-portal/pay-apps/[id]/page.tsx` — same thin-wrapper pattern.
- `src/middleware.ts` — `/owner-portal/*` is currently behind `isPublic` = false (authenticated; the 1.5c implementation runs against the org-admin user, not an anon homeowner). NOT in `PUBLIC_PATHS`.
- `src/components/nav-bar.tsx` — no `/owner-portal` link in the authenticated nav (correct; homeowner doesn't see the org nav).
- `scripts/wave-d-smoke.ts` — no `/owner-portal` route entry today. Smoke table extension required for B-2 (add `/owner/{drummond-token}` after B-2 ships per harness extension contract; details in §5 Task 6).
- `.planning/design/PATTERNS.md` — no "Owner Status View" entry today. design-pushback reviewer may request creation; flagged in §1.

**Decision (per §4.c relocation rationale):** B-2 mounts at **`/owner/{token}`** (singular, not `/owner-portal/{token}`). The existing `/owner-portal/*` routes are **left intact** (1.5c thin-wrappers continue to render with Caldwell fixtures for design-system playground use, where they are correctly gated to authenticated org-admin via middleware). B-2 adds a parallel surface at `/owner/{token}`. Both surfaces co-exist; their layout shells differ (one nav-bar-wrapped, one standalone), and they consume the same `OwnerDashboardView` + `OwnerDrawView` tenant-blind View components.

**Rationale for not replacing `/owner-portal/*`:** the 1.5c surface is the **design-system playground for Caldwell fixtures**, gated to platform_admin in production per Stage 1.5a SPEC B7. It is NOT user-facing. Replacing it would conflate two distinct surfaces — design-playground vs production-owner-portal. They remain distinct.

### Sweep 2 — activity_log consumers (actor_token_id addition)

```bash
# Every site that reads activity_log columns or constructs activity_log rows
grep -rn "from(\"activity_log\")\|FROM public.activity_log\|logActivity\|logStatusChange" \
  src/ scripts/ supabase/migrations/ 2>/dev/null
```

**Findings (mechanical):**

- `src/lib/activity-log.ts` — single write-path via `logActivity()` + `logStatusChange()` helpers (lines 65-107). Both must accept the new `actor_token_id` field as nullable optional.
- `src/lib/audit/action-labels.ts` — ENTITY_LABELS Record mirrors ActivityEntityType union (per Slice-1 B-1a-bis iter-3 §3.2 precedent). NOT touched by B-2 (no new entity_type values; only new ActivityAction `'acknowledged'`).
- `src/components/audit/` — reads activity_log rows; will display `actor_token_id`-bearing rows. Display label decision: "Owner via portal link" (the homeowner doesn't have a `user_id` to resolve to a name). Implementation in §5 Task 4.
- `supabase/migrations/00026_phase5_scaffolding_tables.sql` lines 82-91 — original schema. NO `actor_token_id` column today; B-2 migration adds it.
- Backfill: existing activity_log rows remain `user_id`-populated; `actor_token_id` defaults NULL. No backfill required.

### Sweep 3 — client_portal_access existing references

```bash
grep -rn "client_portal_access\|client_portal_messages\|create_client_portal_invite\|submit_client_portal_message\|mark_client_portal_message_read" src/ scripts/ supabase/migrations/ 2>/dev/null
```

**Findings:**

- Only consumer in `src/` today: `src/lib/types/database.types.ts` (auto-regenerated). No application code consumes the table yet because the 1.5c thin-wrappers use fixtures. B-2 introduces the first runtime consumer via `src/lib/owner-portal/token.ts` + `/api/owner-portal/resolve/route.ts`.
- The 3 SECURITY DEFINER RPCs (`create_client_portal_invite` / `submit_client_portal_message` / `mark_client_portal_message_read`) are NOT called from `src/` today. B-2 does NOT add a new RPC; it uses a direct service-role API route to resolve token → portal_access row, mirroring the "service-role portal reads" Scope decision #1 documented in 00074:55-59.

### Sweep 4 — smoke harness route table extension requirement

```bash
grep -n "ROUTES\s*=\s*\[\|primary_ux_selector" scripts/wave-d-smoke.ts 2>/dev/null
```

**Findings:** `scripts/wave-d-smoke.ts:165` defines the ROUTES table. B-2 ship MUST extend it with the new `/owner/{drummond-token}` entry. The token plaintext cannot be checked into the repo (security boundary); the harness reads it from `process.env.SMOKE_OWNER_TOKEN_DRUMMOND` (new env var) and skips the route check if unset. Layer 3 visual + DOM checks confirmed in §5 Task 3.

### Sweep 5 — hook regex precursor sweep (Rule 6a)

```bash
# Mechanical pre-flight against the hook's COMPLETE forbidden-pattern set
bash .claude/hooks/nightwork-post-edit.sh --dry-run-all src/components/client-combobox.tsx \
  src/app/owner/ \
  supabase/migrations/00104_*.sql 2>/dev/null || true
```

**Findings:** TD-B1abis-03's inline `boxShadow: "0 4px 12px rgba(0,0,0,0.08)"` (line 203) and inline `style={fontFamily, color}` (lines 173-180) WILL trigger the hook (HEX_HITS detects `rgba(0,0,0,0.08)` if the pattern set includes rgba; NAMED_HITS catches inline color/fontFamily without var). The TD-B1abis-03 polish in this plan resolves the hook fire by replacement with tokenized utilities. Any new `/owner/*` JSX MUST consume design tokens from day one (no hex; no inline color; no inline fontFamily).

### Sweep 6 — fixture infrastructure collision (Rule 6b)

```bash
# No new fixture rows introduced — B-2 backfills from existing jobs.client_id → client_portal_access.job_id
# Drummond + harness fixture token rows are pre-existing per 00074 + smoke-seed.sql
# Pre-flight SELECT to confirm token row exists for Drummond + harness-fixture-org
```

**Findings:** B-2 migration backfills `client_id` from the deterministic `jobs.client_id` join (00100 already shipped). If any existing `client_portal_access` row has a `job_id` whose `jobs.client_id` is NULL, the backfill must handle it (`UPDATE … SET client_id = j.client_id WHERE j.client_id IS NOT NULL`). Pre-apply verification DO block enforces zero orphans (HF-A4-2 fail-loud pattern per 00100 §0).

### Sweep 7 — files_modified intersection check (Rule 5)

Single plan in this dispatch wave; no parallel peer. Intersection check N/A. Confirmed `parallel_execute_ok: false` in frontmatter.

## 4. Structural approach

### 4.a Token-based auth security model (LOAD-BEARING — Jake mandatory resolution item 1)

**Decision: extend the existing 00074 SHA-256-hash + service-role-API pattern. NO new token mechanism. NO RLS-for-anon-role.**

#### Token generation, expiration, revocation

- **Generation:** REUSE existing `create_client_portal_invite(p_org_id, p_job_id, p_email, p_name, p_visibility_config, p_expires_at)` SECURITY DEFINER RPC (00074:390-439). Plaintext = `encode(extensions.gen_random_bytes(32), 'hex')` = 64-char hex (256 bits of entropy). Plaintext returned ONCE; only `access_token_hash` (SHA-256 hex digest) is stored. B-2 does NOT add a new generation primitive.
- **Format / entropy:** 64-char hex, 256 bits. Already CHECK-constrained on the column (`char_length(access_token_hash) = 64`).
- **Expiration:** B-2 inherits the existing 90-day sliding-window default (00074:174 `expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '90 days')`). EXPANDED-SCOPE Q5 documents a 1-year-default consideration deferred to Wave 1.1-Lite; **B-2 does not change the default.** Source line: EXPANDED-SCOPE.md Q5 line 211 ("B-2 default in this slice: tokens have 1-year expiration"). **CORRECTION at plan-author time:** the EXPANDED-SCOPE wording says "1-year expiration" but the existing 00074 schema is 90-day sliding. **B-2 preserves the existing 90-day sliding default** to avoid an unintentional schema-default change inside a plan that should not be changing token lifecycle policy. If Jake intends to change the default to 1 year, that is a separate D-### decision and a separate plan; this is surfaced to plan-review iter-1 for explicit Jake acknowledgement. (See §11 dispatch authorization checklist.)
- **Revocation:** REUSE existing `revoked_at TIMESTAMPTZ` column. Setting `revoked_at = now()` immediately invalidates the token (RPC lookups already check `revoked_at IS NULL`). UI to revoke is owner-admin-PM-side (NOT homeowner-side); the existing 1.5c admin surface or a future admin route handles this. **B-2 does not ship a revocation UI** — that is Wave 1.1-Lite scope. The DB-layer mechanism is sufficient.

#### Token → client scoping (cross-client leak prevention)

**The security core of B-2.** Threat: anon walks `/owner/<token-1>` then increments digits / brute-forces / tries another tenant's leaked token and gets another client's data.

**Layered defense (4 layers; all must hold):**

1. **Token entropy (Layer 1):** 256-bit random hex. Brute-force enumeration of the 64-char hex space at any practical rate is mathematically infeasible (2^256 keyspace). 
2. **Hash-lookup scoping (Layer 2):** the `/api/owner-portal/resolve` route accepts the plaintext token, computes SHA-256 hex, looks up the **single matching `client_portal_access` row** where `access_token_hash = $hash AND revoked_at IS NULL AND expires_at > now()`. If zero rows match: return 404. If multiple match (impossible per unique index `idx_client_portal_access_token_hash`): treat as server error + Sentry alarm. The lookup is service-role + filtered by hash, NOT scoped by tenant — the hash IS the scope.
3. **Single-client scoping (Layer 3, NEW IN B-2):** the resolved row carries `client_id`. The service-role API then issues all subsequent queries with `.eq("client_id", row.client_id).eq("org_id", row.org_id)` — application-layer scoping. The route handler NEVER accepts arbitrary `client_id` from the URL or body; the token IS the only source of truth for which client's data flows. Cross-client query: impossible by API contract.
4. **RLS backstop (Layer 4, INHERITED):** `client_portal_access` already has RLS (00074:247-301; org-scoped SELECT for builders, platform-admin bypass, no anon SELECT policy). B-2's service-role API uses the service-role client which bypasses RLS — but the application code filters by `client_id + org_id` before returning data. **No anon SELECT policy is added on `client_portal_access`** — the table remains builder-side-only for authenticated SELECT. The anon path is exclusively through the service-role API.

**Why NOT add an anon RLS policy on client_portal_access:**
- An anon SELECT policy would require Postgres to identify the anon's intended row, which requires a session-local setting (e.g., `SET LOCAL app.current_token_hash = $hash`). That setting can only be set by the application — at which point the application has already done the validation work. Adding RLS-for-anon adds complexity without adding safety.
- Existing 00074 explicitly chose "Scope decision #1: service-role portal reads" (00074:55-59) — anon never SELECTs directly; the service-role API mediates all reads. B-2 preserves that decision verbatim.
- Defense-in-depth is provided by: (a) RLS prevents authenticated cross-org reads; (b) service-role API explicitly filters by client_id+org_id; (c) the only entry path for anon is the resolve endpoint, which derives both scopes from the token.

#### Rate limiting (per EXPANDED-SCOPE §4)

- Per-token: short-window (60s) cache miss counter; >5 misses on same token in 60s = 429. Implemented in `src/lib/owner-portal/token.ts` using in-process Map with TTL eviction (acceptable for Vercel single-region; for multi-region a Redis/KV upgrade would be needed but is out of scope per EXPANDED-SCOPE §3 row 1).
- Per-IP: 30 requests / 60s on `/api/owner-portal/resolve` regardless of token. Headers honored: `x-forwarded-for`, `x-real-ip`.
- 429 responses do NOT distinguish "wrong token" from "rate-limited token" — same body, same status — to avoid timing oracles on token validity.
- All 429s are logged (without the token plaintext or hash) to Sentry tagged `owner_portal_rate_limit`.

#### Threat-model coverage (audit checklist)

| Threat | Mitigation | Verification |
|---|---|---|
| T-B2-01 cross-client leak via token-data mismatch | Layer 3 application-layer filter `.eq(client_id, row.client_id).eq(org_id, row.org_id)`; PG plan execution proves filter applies | AC-B2-09 ai-logic-tester executes representative cross-client probe SQL |
| T-B2-02 token brute-force enumeration | Layer 1 entropy (2^256) + Layer 4 rate-limit (5 misses/60s/token; 30 req/60s/IP) | AC-B2-10 verification via simulated burst |
| T-B2-03 cross-org leak via anon role | Layer 4 RLS backstop + service-role API explicit `org_id` filter; no anon SELECT policy added | AC-B2-11 rls-auditor verifies anon role has zero SELECT on client_portal_access |
| T-B2-04 token expiration bypass | Existing 00074 query filter `expires_at > now()`; sliding-window UPDATE only on successful auth | AC-B2-12 expired-token probe returns 404 |
| T-B2-05 audit-log poisoning by anon writes | actor_token_id-bearing writes only go through `/api/owner-portal/acknowledge-pay-app` (service-role; validates token first); anon cannot write activity_log directly (RLS RESTRICTIVE; no anon INSERT policy) | AC-B2-13 anon-side direct INSERT into activity_log returns RLS denial |
| T-B2-06 TD-B1abis-03 polish scope-creep | Hard bounded to lines 173-180 + line 203 of client-combobox.tsx; ~10 lines net change; no behavioral change | AC-B2-17 diff line-count <= 15 lines net |

### 4.b actor_token_id audit integration (Jake mandatory resolution item 2)

**Decision: add `actor_token_id UUID REFERENCES public.client_portal_access(id) ON DELETE SET NULL` to `activity_log`. Mutual-exclusion enforced via DB CHECK constraint for NEW rows only (legacy rows preserved).**

#### Schema change

```sql
ALTER TABLE public.activity_log
  ADD COLUMN actor_token_id UUID REFERENCES public.client_portal_access(id) ON DELETE SET NULL;

CREATE INDEX idx_activity_log_actor_token
  ON public.activity_log (actor_token_id)
  WHERE actor_token_id IS NOT NULL;
```

**Mutual-exclusion strategy.** Legacy rows: `user_id` populated, `actor_token_id` NULL (default). Token-context rows (post-B-2): `user_id` NULL, `actor_token_id` populated. **A DB CHECK constraint is NOT added in B-2** because:
- (a) Legacy rows could have `user_id` NULL today (service-role-context inserts where the action originated from a system process). A CHECK like `(user_id IS NULL) <> (actor_token_id IS NULL)` would fail on those legacy rows during apply.
- (b) The mutual-exclusion property is application-layer-enforced (`logActivity()` accepts either `user_id` or `actor_token_id` but not both; see §5 Task 2).
- (c) B-3's trigger function will write activity_log rows from soft-delete contexts where BOTH may be NULL (service-role + no token). DB CHECK would conflict with B-3.

Application-layer enforcement IS sufficient because `logActivity()` is the ONLY write path (00026 schema + activity-log.ts:6-15 documentation). Direct DB INSERTs are blocked by RLS RESTRICTIVE.

#### `logActivity()` signature extension

```typescript
// src/lib/activity-log.ts — extended LogActivityArgs interface
interface LogActivityArgs {
  org_id: string;
  user_id?: string | null;
  actor_token_id?: string | null;  // NEW: present when action originated from owner portal token
  entity_type: ActivityEntityType;
  entity_id?: string | null;
  action: ActivityAction;
  details?: Record<string, unknown> | null;
}
```

The insert path appends `actor_token_id: args.actor_token_id ?? null`. **Application-layer assertion** (added in §5 Task 2): if BOTH `user_id` and `actor_token_id` are provided, `logActivity()` warns + drops `actor_token_id` (defensive). This is documented in the function-header JSDoc.

#### Actions logged

EXPANDED-SCOPE §7 line 274 specifies "1-2 owner-initiated actions wire `actor_token_id`". B-2 ships ONE canonical action:

- **`acknowledged`** (new `ActivityAction` literal) on `entity_type='draw'`: homeowner acknowledges receipt of a pay-app. Fires from `POST /api/owner-portal/acknowledge-pay-app`. Body: `{ token, draw_id, expected_updated_at }`. Writes `activity_log` row: `{ org_id, user_id: NULL, actor_token_id: portal_access.id, entity_type: 'draw', entity_id: draw_id, action: 'acknowledged', details: { acknowledged_at: now() } }`. **No state mutation on the draw itself** (acknowledgment is purely an audit signal; it does NOT change draw.status). This matches the "read-only owner portal" scope per EXPANDED-SCOPE §3 row 1.

The acknowledgment route uses `updateWithLock()` only on the synthetic `last_accessed_at` UPDATE of the token row (sliding-window extension), NOT on the draw row, because the draw is not being mutated. **No optimistic-locking required on the audit-log INSERT** (audit rows are append-only by design).

#### Downstream UI rendering

`src/components/audit/` (e.g., audit timeline component used by Document Review pattern) reads `activity_log` rows. When `actor_token_id IS NOT NULL`, the display label is **"Homeowner (via portal link)"** instead of the resolved user name. The portal_access row's `name` or `email` fields could theoretically be surfaced but B-2 does NOT do so (PII fence concerns; D-079 — homeowner email is in scope). The generic "Homeowner (via portal link)" label is sufficient for audit traceability + does not leak PII.

### 4.c Mobile-first UI confirmation (Jake mandatory resolution item 3)

**Decision: standalone `/owner/{token}` route with NO authenticated nav-bar. Layout authored mobile-first (320px floor; reference iPhone 13 Pro Max 430×932 + Pixel 7 412×915 viewports).**

#### Route relocation rationale

- `/owner-portal/*` (existing 1.5c) is the **design-system playground for Caldwell fixtures**, gated to platform_admin in production. It is NOT user-facing.
- `/owner/{token}` is the **production homeowner-portal surface**, gated by token (NOT auth), mobile-mandatory.
- Both surfaces co-exist; they consume the same `OwnerDashboardView` + `OwnerDrawView` tenant-blind View components. The View components were specifically authored tenant-blind (per `src/components/prototypes/OwnerDashboardView.tsx:36` "Tenant-blind by construction.") to support this reuse.

#### Layout shell (`src/app/owner/layout.tsx`)

Standalone — does NOT inherit `nav-bar.tsx` (which assumes an authenticated `getCurrentMembership`-backed session). Contains:
- Minimal top-row branding: Ross Built logo + "Owner Portal" eyebrow text. Logo top-left per CLAUDE.md UI rules.
- No navigation links (the homeowner sees only their own job; no other org context to navigate).
- Footer with a "secured by Nightwork" trust micro-statement + a "report an issue" mailto link to PM.
- `<div data-direction="C" data-palette="B" className="design-system-scope">` wrapper per CLAUDE.md "Site Office direction scope on production routes" rule.

#### Mobile-first specifics

- **Viewport meta:** `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />` (already global in root layout).
- **Touch targets:** all interactive elements ≥44px height per SYSTEM.md (higher-stakes actions like "Acknowledge pay-app" get 56px). Existing `OwnerDashboardView` `Card` and `Badge` primitives already comply.
- **Typography:** Slate type system inherited (Space Grotesk display, Inter body, JetBrains Mono money/eyebrows). Token bindings only; NO hardcoded fontFamily declarations in new code.
- **Density:** comfortable mode default; print-forces-compact respected (per SYSTEM.md density modes). Homeowner may print their pay-app for records.
- **No horizontal scroll** at 320px viewport floor — every grid/table collapses to single-column on narrow viewports. The existing `OwnerDashboardView` Card grid pattern (4-up on desktop) collapses to stack on mobile via Tailwind `md:grid-cols-4 grid-cols-1` idiom.

#### Verification commands

Layer 3 visual smoke (multi-viewport per F1+-4):
- iPhone 14 Pro Max (430×932)
- Pixel 7 (412×915)
- iPad Mini (744×1133)
- Desktop reference (1280×800)

Per EXPANDED-SCOPE §7 row 6, **the multi-viewport harness extension SHIPS in B-7**, not B-2. So B-2 verifies multi-viewport via **manual `mcp__chrome-devtools__resize_page` walks at execute time** (CLAUDE.md Testing Rule MANDATORY). Smoke harness gets the new route + canonical desktop viewport in B-2 ship; multi-viewport coverage extends in B-7 per the harness contract.

#### Design pattern question

`PATTERNS.md` has 12 patterns today; Document Review is the gold standard. "Owner Status View" is a NEW pattern. Per EXPANDED-SCOPE §5 row "Invoice review is gold standard UI" + §7 row 276 "Plan-review iter-1 includes nightwork-design-pushback for the new UI pattern (likely new PATTERNS.md 'Owner Status View' entry)":

- **B-2 ships the pattern entry IF design-pushback requests it** during plan-review iter-1.
- If deferred, TD-B2-01 opens for follow-up (Wave 1.1-Lite).
- The pattern itself is: **single-job KPI Card grid (4-up) + recent activity list + pay-app history table + document download grid**. Mobile-first, no right-rail (homeowner doesn't need PM-side metadata).

## 5. Implementation tasks

Atomic commit boundaries are explicit. Each task targets a **single concern + a single commit body**. Cost projection: §12.

### Task 1 — Migration `00104_client_portal_access_add_client_id.sql` + `.down.sql`

**Files:**
- `supabase/migrations/00104_client_portal_access_add_client_id.sql` (new)
- `supabase/migrations/00104_client_portal_access_add_client_id.down.sql` (new)

**SQL (forward):**

```sql
BEGIN;

-- 0. Pre-flight: verify fixture-harness-org client_portal_access baseline.
DO $$
DECLARE v_existing INT;
BEGIN
  SELECT COUNT(*) INTO v_existing
    FROM public.client_portal_access
   WHERE org_id = '00000000-0000-0000-0000-fb1ce0a55e55';
  -- Allow 0 or N; do not fail if no harness portal_access rows yet.
  -- The CHECK is informational; backfill below handles whatever exists.
  RAISE NOTICE 'Pre-flight: % harness client_portal_access rows', v_existing;
END $$;

-- 1. Add client_id column (nullable; SET NULL on parent delete).
ALTER TABLE public.client_portal_access
  ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- 2. Backfill from jobs.client_id (deterministic; 00100 already shipped).
UPDATE public.client_portal_access cpa
   SET client_id = j.client_id
  FROM public.jobs j
 WHERE cpa.job_id = j.id
   AND cpa.client_id IS NULL
   AND j.client_id IS NOT NULL;

-- 3. Forward probe: every existing client_portal_access row whose job has
--    a client_id must now have client_id populated. HF-A4-2 fail-loud.
DO $$
DECLARE v_orphan BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_orphan
    FROM public.client_portal_access cpa
    JOIN public.jobs j ON j.id = cpa.job_id
   WHERE j.client_id IS NOT NULL
     AND cpa.client_id IS NULL;
  IF v_orphan > 0 THEN
    RAISE EXCEPTION 'Forward probe FAILED: % client_portal_access rows have job-with-client but unset client_id. Aborting.', v_orphan;
  END IF;
END $$;

-- 4. Partial unique index (per EXPANDED-SCOPE §7 line 272).
--    Prevents duplicate active tokens per (org, client) — parallel to the
--    existing (org_id, job_id, email) partial unique index from 00074.
CREATE UNIQUE INDEX client_portal_access_org_client_active
  ON public.client_portal_access (org_id, client_id)
  WHERE revoked_at IS NULL AND client_id IS NOT NULL;

-- 5. Lookup index for backfill-time + future client→token reverse queries.
CREATE INDEX idx_client_portal_access_client_id
  ON public.client_portal_access (client_id)
  WHERE revoked_at IS NULL;

-- 6. activity_log.actor_token_id addition (§4.b).
ALTER TABLE public.activity_log
  ADD COLUMN actor_token_id UUID REFERENCES public.client_portal_access(id) ON DELETE SET NULL;

CREATE INDEX idx_activity_log_actor_token
  ON public.activity_log (actor_token_id)
  WHERE actor_token_id IS NOT NULL;

-- 7. COMMENT documentation.
COMMENT ON COLUMN public.client_portal_access.client_id IS
'F1-Wave-B Slice-2 B-2 — denormalized client identity FK. Backfilled from jobs.client_id on apply. ON DELETE SET NULL preserves token row if client is hard-deleted via emergency DBA path; soft-delete (the normal path) leaves client_id pointing at a deleted_at=NOT NULL clients row (correct audit posture, mirrors jobs.client_id from 00100).';

COMMENT ON COLUMN public.activity_log.actor_token_id IS
'F1-Wave-B Slice-2 B-2 — present when audit-log row originated from owner portal token-context action (homeowner via /owner/{token}). Mutually exclusive with user_id at the application layer (logActivity() enforces). NOT enforced via DB CHECK because (a) legacy rows may have user_id NULL with no token context, (b) B-3 trigger writes will sometimes have both NULL (service-role context). Display label downstream: "Homeowner (via portal link)" — does NOT surface PII (D-079 fence preserved).';

-- 8. NOTIFY PostgREST schema cache reload (Wave-D 00098 §1.1 decision 8).
NOTIFY pgrst, 'reload schema';

COMMIT;
```

**SQL (down):**

```sql
BEGIN;

DROP INDEX IF EXISTS public.idx_activity_log_actor_token;
ALTER TABLE public.activity_log DROP COLUMN IF EXISTS actor_token_id;

DROP INDEX IF EXISTS public.client_portal_access_org_client_active;
DROP INDEX IF EXISTS public.idx_client_portal_access_client_id;
ALTER TABLE public.client_portal_access DROP COLUMN IF EXISTS client_id;

NOTIFY pgrst, 'reload schema';

COMMIT;
```

**Verify:**
```bash
npx supabase db push   # or mcp__supabase__apply_migration
npx supabase gen types typescript --linked > src/lib/types/database.types.ts
```

**Done:** Migration applies cleanly + types regenerated + Drummond + harness backfill verified via §9 SQL.

**Atomic commit:** `feat(b-2): add client_portal_access.client_id FK + activity_log.actor_token_id (migration 00104)`

### Task 2 — `activity_log.ts` actor_token_id integration + new ActivityAction

**Files:**
- `src/lib/activity-log.ts`

**Action:**
1. Add `actor_token_id?: string | null` to `LogActivityArgs` interface.
2. Add `'acknowledged'` to `ActivityAction` union (note: `'acknowledged'` is distinct from existing `'approved'` — `approved` is internal PM/owner role action; `acknowledged` is homeowner-via-token signal).
3. Insert path: append `actor_token_id: args.actor_token_id ?? null`.
4. Defensive guard: if BOTH `user_id` and `actor_token_id` set, console.warn + null-out `actor_token_id`.
5. JSDoc header extension documenting the mutual-exclusion rule.

**Verify:**
```bash
npm run typecheck
npm run lint
```

**Done:** TS compiles; ESLint clean; no consumer (audit timeline, audit/action-labels.ts) breaks.

**Atomic commit:** `feat(b-2): extend logActivity with actor_token_id + 'acknowledged' action`

### Task 3 — Owner Portal route at `/owner/{token}` + middleware extension + standalone layout + reusable View wiring

**Files:**
- `src/middleware.ts` (add `/owner` to `PUBLIC_PATHS`)
- `src/app/owner/layout.tsx` (new — standalone shell, no nav-bar)
- `src/app/owner/[token]/page.tsx` (new — entry route, server-side token resolve, renders `OwnerDashboardView`)
- `src/app/owner/[token]/pay-apps/[id]/page.tsx` (new — pay-app drilldown)
- `src/app/owner/error.tsx` (new — error boundary for invalid/revoked/expired token)
- `src/lib/owner-portal/token.ts` (new — server-only token validation + rate-limit helpers)
- `src/app/api/owner-portal/resolve/route.ts` (new — POST handler; service-role-backed; returns scoped data)

**Action:**
1. **Middleware (`src/middleware.ts`):** add `/owner` to `PUBLIC_PATHS` array (line 7). Verify the existing public-path matcher logic (`isPublic`) handles `/owner/{token}` correctly (it should — `pathname.startsWith('/owner/')` matches because the public-path check uses `startsWith`).
2. **Token validation helper (`src/lib/owner-portal/token.ts`):**
   - `validateOwnerToken(plaintext: string): Promise<{ portalAccess: ResolvedPortalAccess; client: Pick<Client, 'id'|'full_name'>; job: Pick<Job, 'id'|'name'>; orgId: string } | null>`.
   - Computes SHA-256 hex of plaintext, queries `client_portal_access` via service-role client with the layered filter: `.eq('access_token_hash', $hash).is('revoked_at', null).gt('expires_at', now())`. If zero rows: returns null. If one row: returns scoped resolution.
   - In-process rate-limit Map (per-token + per-IP) with 60s TTL eviction. ipPrefix derived from `headers().get('x-forwarded-for')` first IP only, then `headers().get('x-real-ip')` fallback.
   - Updates `last_accessed_at` + extends `expires_at` on successful resolution (sliding-window — matches existing RPC behavior).
3. **`/owner/[token]/page.tsx`:** server component. Calls `validateOwnerToken(params.token)`. On null → `notFound()` (triggers `error.tsx`). On success → queries:
   - `jobs` row for the resolved `job_id` (service-role; explicit `.eq('org_id', $orgId).eq('client_id', $clientId)`).
   - `draws` rows for the job (same filter).
   - `change_orders` rows for the job (same filter).
   - Renders `<OwnerDashboardView job={job} draws={draws} changeOrders={changeOrders} drawReviewHref={(id) => `/owner/${params.token}/pay-apps/${id}`} />` inside the `design-system-scope` wrapper.
4. **`/owner/[token]/pay-apps/[id]/page.tsx`:** analogous to existing `/owner-portal/pay-apps/[id]/page.tsx` but token-scoped. Validates token, validates the requested `draw.id` belongs to the token's `client_id + org_id` scope (404 otherwise — prevents URL-tampering cross-client probe).
5. **`/owner/layout.tsx`:** standalone — minimal Ross-Built logo top-left, eyebrow text, no nav. Footer with secured-by + report-an-issue mailto.
6. **`/owner/error.tsx`:** generic "Your portal link is no longer valid. Please contact your project manager." Does NOT distinguish "expired" / "revoked" / "not found" (avoids timing oracles on portal-access state).
7. **`/api/owner-portal/resolve/route.ts`:** POST endpoint accepting `{ token: string }` body. Wraps `validateOwnerToken`. Returns 200 + `{ portal_access_id, client, job, ... }` on success; 404 on failure; 429 on rate limit. Used by client-side components if any (the server-side resolution in `page.tsx` is primary; the API exists for hydration / refresh flows).

**Verify (CLAUDE.md Testing Rule MANDATORY):**
```bash
npm run dev
# Manually walk via Chrome DevTools MCP:
#   - resize to iPhone 14 Pro Max viewport
#   - navigate to http://localhost:3000/owner/<drummond-token-plaintext>
#   - confirm OwnerDashboardView renders with Drummond data
#   - confirm no console errors
#   - confirm logo top-left, mobile single-column collapse
#   - take screenshot
# Then test invalid token:
#   - navigate to /owner/invalid-token-deadbeef
#   - confirm error.tsx renders generic message (no leak)
# Then test cross-client probe (URL tampering on pay-app sub-route):
#   - get drummond-token; copy a draw_id from a DIFFERENT client's job
#   - navigate to /owner/<drummond-token>/pay-apps/<other-client-draw-id>
#   - confirm 404 (not the other client's draw rendered)
```

**Done:** All 4 walks pass; screenshot captured; no console errors; logo top-left visible at 320px viewport; cross-client probe returns 404.

**Atomic commit:** `feat(b-2): mount /owner/{token} route + standalone layout + service-role-backed token resolution`

### Task 4 — Pay-app acknowledgment audit endpoint + UI button

**Files:**
- `src/app/api/owner-portal/acknowledge-pay-app/route.ts` (new — POST handler)
- `src/app/owner/[token]/pay-apps/[id]/page.tsx` (extend — wire acknowledgment button)
- `src/components/prototypes/OwnerDrawView.tsx` (minimal extension — optional acknowledge button prop)

**Action:**
1. **`/api/owner-portal/acknowledge-pay-app/route.ts`:** POST endpoint. Body: `{ token: string; draw_id: string; expected_updated_at: string }`. Steps:
   - `validateOwnerToken(body.token)` → null = 404.
   - Confirm `draw_id` belongs to token's `(org_id, client_id)` scope → 404 otherwise.
   - Compute idempotency: query `activity_log` for any existing row with `entity_type='draw' AND entity_id=$draw_id AND actor_token_id=$portalAccess.id AND action='acknowledged'`. If exists → 200 + `{ already_acknowledged: true }`.
   - Otherwise: `logActivity({ org_id, user_id: null, actor_token_id: portalAccess.id, entity_type: 'draw', entity_id: draw_id, action: 'acknowledged', details: { acknowledged_at: new Date().toISOString() } })`.
   - Return 200 + `{ acknowledged: true }`.
2. **`OwnerDrawView.tsx` extension:** new optional prop `onAcknowledge?: () => void; acknowledged?: boolean;`. Renders a 56px-tall primary CTA "Acknowledge receipt" when not yet acknowledged; renders a checkmark + "Acknowledged on YYYY-MM-DD" when acknowledged. Tenant-blind by construction preserved.
3. **`/owner/[token]/pay-apps/[id]/page.tsx`:** extends — passes onAcknowledge handler that POSTs to the API + revalidates path.

**Verify:**
```bash
# Click acknowledge in the Chrome DevTools session from Task 3
# Confirm activity_log row written:
mcp__supabase__execute_sql query:
  SELECT id, org_id, user_id, actor_token_id, entity_type, entity_id, action
    FROM public.activity_log
   WHERE entity_id = '<drummond-draw-id>'
     AND action = 'acknowledged'
   ORDER BY created_at DESC LIMIT 1;
# Expect: user_id IS NULL, actor_token_id IS NOT NULL, action='acknowledged'
# Click again — confirm idempotent (200 + already_acknowledged: true; no second row)
```

**Done:** Single activity_log row written on first click; idempotent on repeated click; row has user_id=NULL and actor_token_id populated.

**Atomic commit:** `feat(b-2): owner portal pay-app acknowledgment with actor_token_id audit`

### Task 5 — TD-B1abis-03 ClientCombobox polish

**Files:**
- `src/components/client-combobox.tsx` (lines 173-180 + line 203 — token-driven utilities)

**Action:** Replace:

```tsx
// BEFORE — lines 173-180 (inline style on label eyebrow)
<span
  className="block mb-1 text-[10px] uppercase tracking-[0.12em]"
  style={{
    fontFamily: "var(--font-jetbrains-mono)",
    color: "var(--text-tertiary)",
  }}
>
  {label}
</span>

// AFTER — token-driven utility classes mirroring cost-code-combobox.tsx
<span className="block mb-1 text-[10px] uppercase tracking-[0.12em] font-mono text-[color:var(--text-tertiary)]">
  {label}
</span>
```

```tsx
// BEFORE — line 203 (inline boxShadow)
<div
  id={listboxId}
  role="listbox"
  className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-y-auto border bg-[var(--bg-card)]"
  style={{
    borderColor: "var(--border-default)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  }}
>

// AFTER — token-driven utility (shadow-popover token; border-default already a utility)
<div
  id={listboxId}
  role="listbox"
  className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-y-auto border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[var(--shadow-popover)]"
>
```

**Pre-flight verification** that `--shadow-popover` token exists in `src/app/globals.css` or `src/app/design-system/design-system.css`. If absent: cost-code-combobox.tsx uses a different idiom; mirror that exactly. (Plan-author confirmed at /np time: `cost-code-combobox.tsx` does NOT currently set a boxShadow — its dropdown uses a different elevation pattern. Decision: if `--shadow-popover` does not exist, **replace with the cost-code-combobox idiom verbatim** rather than introducing a new token. The TD says "or `box-shadow: var(--shadow-popover)` once that token exists" — token introduction is OUT OF SCOPE for B-2.)

**Net change:** ≤15 lines (per AC-B2-17). No behavioral / accessibility regression.

**Verify:**
```bash
# Hook regex sweep — should pass post-edit
bash .claude/hooks/nightwork-post-edit.sh --check src/components/client-combobox.tsx
# Visual diff in Chrome DevTools — dropdown looks identical (shadow opacity equivalent)
```

**Done:** Hook passes; visual diff zero (or imperceptible); TS + lint clean.

**Atomic commit:** `refactor(b-2): TD-B1abis-03 — replace ClientCombobox inline shadow + label style with tokens`

### Task 6 — Smoke harness extension + SUMMARY + AC attestation

**Files:**
- `scripts/wave-d-smoke.ts` (extend ROUTES array)
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2-SUMMARY.md` (new)
- `.planning/MASTER-PLAN.md` (mark TD-B1abis-03 closed; cite B-2 commit)

**Action:**
1. **Smoke harness route entry:** append to `ROUTES` array:
   ```typescript
   {
     route: process.env.SMOKE_OWNER_TOKEN_DRUMMOND
       ? `/owner/${process.env.SMOKE_OWNER_TOKEN_DRUMMOND}`
       : null,  // skip if env var unset
     category: "owner-portal",
     primary_ux_selector: "text=Owner portal",  // eyebrow text in standalone layout
     primary_ux_min_count: 1,
     pattern: "owner-status-view",
   },
   ```
   Skip-pattern documented in inline comment: harness sysop sets `SMOKE_OWNER_TOKEN_DRUMMOND` env var to Drummond's plaintext token (generated once via `create_client_portal_invite`; the plaintext is captured at generation time and provisioned to Vercel preview env). The token is NEVER committed to the repo.
2. **SUMMARY.md:** standard SUMMARY structure (per recent precedents) — what shipped, AC attestation, follow-ups, cost actuals.
3. **MASTER-PLAN.md:** mark TD-B1abis-03 row 297 as CLOSED with B-2 commit reference (mirrors TD-WAIC-03 closure pattern at row 301).

**Verify:**
```bash
# Smoke harness — first run from harness env with token provisioned
node scripts/wave-d-smoke.ts  # (or run via harness GH Action)
# Expect: /owner/{token} row passes (HTTP 200 + "Owner portal" selector matched + zero console errors)
```

**Done:** SUMMARY.md exists; MASTER-PLAN.md TD row marked CLOSED; smoke harness route entry added; harness run passes.

**Atomic commit:** `chore(b-2): SUMMARY + MASTER-PLAN TD-B1abis-03 closure + smoke harness owner-portal route`

## 6. Threat model

**Severity: MEDIUM.** First external-facing token surface in F1; mobile-mandatory; cross-client + cross-org leak vectors are load-bearing. Detailed threat register:

| ID | Category | Component | Disposition | Mitigation Plan |
|---|---|---|---|---|
| T-B2-01 | I (Info disclosure) | `/api/owner-portal/resolve` | mitigate | Layered: token entropy + hash-lookup + application-layer client_id+org_id filter + RLS RESTRICTIVE backstop. AC-B2-09 cross-client probe verifies. |
| T-B2-02 | S (Spoofing) / E (Elevation) | token endpoint | mitigate | 256-bit entropy + per-token rate-limit (5 misses/60s) + per-IP rate-limit (30 req/60s) + 429 timing-uniform. AC-B2-10. |
| T-B2-03 | I (Info disclosure) | cross-org via anon | mitigate | service-role API explicit `.eq('org_id', $orgId)` filter + no anon RLS policy on `client_portal_access` + 00074 service-role-only reads decision preserved. AC-B2-11. |
| T-B2-04 | E (Elevation) | token expiration bypass | mitigate | inherited 00074 query filter `expires_at > now()` + sliding-window UPDATE only on success. AC-B2-12. |
| T-B2-05 | T (Tampering) | activity_log poisoning by anon writes | mitigate | activity_log has RLS RESTRICTIVE; anon has zero INSERT policy; only `/api/owner-portal/acknowledge-pay-app` writes (service-role; validates token first). AC-B2-13. |
| T-B2-06 | D (Denial of service) | rate-limit bypass / amplification | accept | In-process Map rate-limit is per-instance (Vercel single-region); multi-region or attacker bypassing via IP rotation defeats per-IP but not per-token. Per-token entropy + endpoint cost make amplification economically infeasible at attacker scale. Upgrade to Redis/KV deferred to Wave 1.1-Lite (per EXPANDED-SCOPE §3 row 1). |
| T-B2-07 | T / I | TD-B1abis-03 polish scope-creep | mitigate | hard-bounded to lines 173-180 + 203 of client-combobox.tsx; AC-B2-17 enforces ≤15 lines net diff. |
| T-B2-08 | I | PII leak via "Homeowner" label display | accept | Audit timeline displays generic "Homeowner (via portal link)" — does NOT surface portal_access.name or .email. D-079 fence preserved. |
| T-B2-09 | T | URL-tampering cross-client pay-app probe | mitigate | `/owner/{token}/pay-apps/{id}` validates draw belongs to token's client_id+org_id scope. AC-B2-14. |
| T-B2-10 | S | token replay attack across portals | mitigate | Single SHA-256 hash unique-index; token is single-portal-access by construction (one row per hash). Sliding-window expiration limits stale-token re-use. |
| T-B2-11 | I | token in URL leaks via referer / browser history | accept | Token lifecycle policy revisit deferred to Wave 1.1-Lite per EXPANDED-SCOPE Q5. Existing 00074 90-day sliding window inherits. Mitigation considered: `Referrer-Policy: no-referrer` header on `/owner/*` routes. Added in §5 Task 3 layout. |

**Out-of-scope threats (deferred per EXPANDED-SCOPE §3):**
- T-OOS-01: Token revocation UI for owner-admin-PM (Wave 1.1-Lite).
- T-OOS-02: Token rotation cadence policy (Wave 1.1-Lite Q5).
- T-OOS-03: Multi-region rate-limit upgrade (Wave 1.1-Lite scale).

## 7. Test plan

### Layer 1 — DB/schema mechanical

1. Migration applies on dev DB with zero errors.
2. `client_portal_access.client_id` exists; FK to `clients(id)`; ON DELETE SET NULL.
3. `activity_log.actor_token_id` exists; FK to `client_portal_access(id)`; ON DELETE SET NULL.
4. Partial unique index `client_portal_access_org_client_active` exists with correct predicate.
5. `database.types.ts` regenerated with both new columns.

### Layer 2 — RLS / fixture-coverage assertions

1. Anon role has zero SELECT on `client_portal_access` (verify via `pg_policies`).
2. activity_log RLS RESTRICTIVE policy unchanged (verify via `pg_policies`).
3. Drummond's `client_portal_access` row backfilled with non-NULL `client_id` matching `jobs.client_id`.
4. Harness fixture-org `client_portal_access` rows (if any) backfilled correctly.

### Layer 3 — UI/runtime verification

1. **Chrome DevTools manual walk** at 4 viewports (iPhone 14 Pro Max / Pixel 7 / iPad Mini / desktop): `/owner/<drummond-token>` renders OwnerDashboardView with Drummond data; no console errors; logo top-left; mobile single-column collapse.
2. Invalid token → error.tsx renders generic message.
3. Revoked token (set `revoked_at = now()` for test row; re-fetch) → error.tsx renders.
4. Expired token (set `expires_at = now() - interval '1 day'`) → error.tsx renders.
5. Cross-client URL-tampering probe (use Drummond token to access another client's draw_id) → 404.
6. Pay-app acknowledgment writes correct activity_log row; idempotent.

### Layer 4 — smoke harness route extension

1. Smoke harness with `SMOKE_OWNER_TOKEN_DRUMMOND` provisioned: `/owner/{token}` route entry passes (HTTP 200 + selector matched + zero console errors).
2. Without env var: route entry skipped gracefully (no harness failure).

### Layer 5 — security probes (per Rule 3 ai-logic-tester)

1. **Brute-force probe (simulated):** 10 requests to `/api/owner-portal/resolve` with random tokens in 5s → expect 429 after 5 misses.
2. **Cross-org probe:** generate a valid Drummond token + a valid harness-fixture-org token; resolve Drummond token; verify response contains zero harness-fixture-org data.
3. **anon direct INSERT into activity_log:** via anon-key Supabase client; expect RLS denial.
4. **Cross-client URL tampering on pay-app sub-route:** described above; expect 404.

## 8. Acceptance criteria

19 falsifiable items. Each AC has explicit verification command/method in §9.

**Migration (5 ACs):**

- **AC-B2-01** Migration `00104_*.sql` applies cleanly on dev DB. Forward probe DO block emits zero RAISE EXCEPTION; transaction commits.
- **AC-B2-02** `client_portal_access.client_id` column exists; FK constraint `client_portal_access_client_id_fkey` references `public.clients(id)` ON DELETE SET NULL. (PostgREST FK citation per Workflow posture Rule 2.)
- **AC-B2-03** Partial unique index `client_portal_access_org_client_active` exists on `(org_id, client_id) WHERE revoked_at IS NULL AND client_id IS NOT NULL`.
- **AC-B2-04** Drummond's `client_portal_access` row (if it exists pre-apply) has non-NULL `client_id` matching the Drummond `jobs.client_id`. (Forward probe in migration enforces zero orphans.)
- **AC-B2-05** Down-migration `00104_*.down.sql` cleanly reverses (DROP COLUMN + DROP INDEX + NOTIFY pgrst). Idempotent on re-apply (DROP IF EXISTS).

**actor_token_id audit (3 ACs):**

- **AC-B2-06** `activity_log.actor_token_id` column exists; FK to `client_portal_access(id)` ON DELETE SET NULL; index `idx_activity_log_actor_token` exists with predicate `WHERE actor_token_id IS NOT NULL`.
- **AC-B2-07** `logActivity()` accepts optional `actor_token_id` parameter; defensive guard nulls it out if both `user_id` and `actor_token_id` are provided + warns.
- **AC-B2-08** Pay-app acknowledgment endpoint writes a single activity_log row per token+draw_id (idempotent on repeated calls); row has `user_id=NULL`, `actor_token_id=<portal_access.id>`, `action='acknowledged'`.

**Token security (5 ACs — load-bearing):**

- **AC-B2-09** Cross-client leak prevention: ai-logic-tester executes representative SQL where a Drummond-scoped service-role API call returns ONLY Drummond client data; resolved row's `client_id` is the sole filter. Probe: `SELECT count(*) FROM jobs WHERE client_id = $other_client_id AND org_id = $drummond_org_id;` returned via the resolve API is zero.
- **AC-B2-10** Brute-force rate-limit: 10 sequential requests to `/api/owner-portal/resolve` with random tokens within 5s returns HTTP 429 starting at request 6. Response body uniform across "wrong token" + "rate-limited" responses.
- **AC-B2-11** anon-role has zero SELECT, INSERT, UPDATE, DELETE policies on `client_portal_access`; rls-auditor verifies via `pg_policies` query. Service-role API is the ONLY anon-facing data path.
- **AC-B2-12** Expired token (test row with `expires_at = now() - interval '1d'`) returns 404 at `/owner/{token}` and at `/api/owner-portal/resolve`. Revoked token returns 404. Generic error message (no leak of which condition triggered).
- **AC-B2-13** Direct INSERT into `activity_log` via anon Supabase client (with anon JWT) returns RLS denial. No actor_token_id-bearing row can be inserted without going through the service-role API.

**UI mobile-first (2 ACs):**

- **AC-B2-14** Chrome DevTools walk at iPhone 14 Pro Max (430×932), Pixel 7 (412×915), iPad Mini (744×1133), desktop (1280×800): `/owner/{drummond-token}` renders without horizontal scroll; logo top-left visible; touch targets ≥44px (acknowledge CTA ≥56px); no console errors. Screenshots captured at all 4 viewports.
- **AC-B2-15** Cross-client URL-tampering probe: `/owner/{drummond-token}/pay-apps/{other-client-draw-id}` returns Next 404 (NOT the other client's draw rendered). Verified via Chrome DevTools navigation + Network tab.

**TD-B1abis-03 polish (1 AC):**

- **AC-B2-16** `src/components/client-combobox.tsx` net diff ≤15 lines; no inline `boxShadow` / `style={fontFamily, color}` remaining; hook regex sweep passes. Visual diff zero or imperceptible in Chrome DevTools side-by-side.

**Workflow / SUMMARY / GATE-readiness (3 ACs):**

- **AC-B2-17** `B-2-SUMMARY.md` exists at ship time with: shipped commits enumerated; AC attestation table (each AC marked PASS with verification artifact path); cost actual recorded; follow-ups noted.
- **AC-B2-18** MASTER-PLAN.md TD-B1abis-03 row (line 297) marked CLOSED with B-2 commit reference; mirrors TD-WAIC-03 closure pattern at row 301.
- **AC-B2-19** Smoke harness ROUTES array extended with `/owner/{token}` entry; env-var skip pattern documented; harness run with `SMOKE_OWNER_TOKEN_DRUMMOND` provisioned passes the new route check.

## 9. Verification commands

### AC-B2-01..05 — Migration

```bash
# Apply
npx supabase db push    # or mcp__supabase__apply_migration

# Regenerate types
npx supabase gen types typescript --linked > src/lib/types/database.types.ts

# AC-B2-02: FK existence + ON DELETE SET NULL
mcp__supabase__execute_sql:
  SELECT con.conname, pg_get_constraintdef(con.oid) AS def
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
   WHERE rel.relname = 'client_portal_access'
     AND con.conname = 'client_portal_access_client_id_fkey';
# Expect: 1 row; def includes "REFERENCES clients(id) ON DELETE SET NULL"

# AC-B2-03: Partial unique index
mcp__supabase__execute_sql:
  SELECT indexname, indexdef FROM pg_indexes
   WHERE tablename = 'client_portal_access'
     AND indexname = 'client_portal_access_org_client_active';
# Expect: 1 row; indexdef includes "WHERE (revoked_at IS NULL AND client_id IS NOT NULL)"

# AC-B2-04: Drummond backfill (skip if no pre-existing portal_access for Drummond)
mcp__supabase__execute_sql:
  SELECT cpa.id, cpa.client_id, j.client_id AS jobs_client_id
    FROM public.client_portal_access cpa
    JOIN public.jobs j ON j.id = cpa.job_id
   WHERE j.client_id IS NOT NULL;
# Expect: cpa.client_id = j.client_id for every row
```

### AC-B2-06..08 — actor_token_id audit

```bash
# AC-B2-06: column + FK + index
mcp__supabase__execute_sql:
  SELECT column_name, data_type FROM information_schema.columns
   WHERE table_name = 'activity_log' AND column_name = 'actor_token_id';
# Expect: 1 row; data_type = uuid

# Test logActivity with actor_token_id
npm run test -- src/lib/__tests__/activity-log.test.ts   # add unit test in Task 2

# AC-B2-08: idempotency probe (manual via Chrome walk)
# After first click on acknowledge CTA + second click:
mcp__supabase__execute_sql:
  SELECT count(*) FROM public.activity_log
   WHERE entity_type = 'draw'
     AND entity_id = '<drummond-draw-id>'
     AND actor_token_id = '<drummond-portal-access-id>'
     AND action = 'acknowledged';
# Expect: 1 (NOT 2)
```

### AC-B2-09..13 — Token security probes

```bash
# AC-B2-09: cross-client probe via test script
# (executable test in scripts/b-2-cross-client-probe.ts — author in Task 3)
npx tsx scripts/b-2-cross-client-probe.ts \
  --token-a <drummond-token> \
  --client-b <other-client-id>
# Expect: response JSON has zero entries from client-b

# AC-B2-10: rate-limit burst
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/owner-portal/resolve \
    -H "Content-Type: application/json" \
    -d "{\"token\":\"deadbeef-random-$i\"}" -w "%{http_code}\n" -s -o /dev/null
done
# Expect: first 5 are 404; remaining 5 are 429

# AC-B2-11: anon-role policies on client_portal_access
mcp__supabase__execute_sql:
  SELECT policyname, cmd, roles FROM pg_policies
   WHERE tablename = 'client_portal_access' AND 'anon' = ANY(roles);
# Expect: 0 rows

# AC-B2-12: expired token returns 404
mcp__supabase__execute_sql:
  -- temporarily expire a test row
  UPDATE public.client_portal_access SET expires_at = now() - interval '1 day'
   WHERE id = '<test-token-id>';
# Then via curl:
curl -X POST http://localhost:3000/api/owner-portal/resolve \
  -H "Content-Type: application/json" -d '{"token":"<test-plaintext>"}' -w "%{http_code}\n"
# Expect: 404. Restore the row after test.

# AC-B2-13: anon RLS denial
# (executable test in scripts/b-2-anon-activity-log-probe.ts)
npx tsx scripts/b-2-anon-activity-log-probe.ts
# Expect: PostgrestError {code: '42501', message: 'permission denied' or similar RLS denial}
```

### AC-B2-14..15 — UI mobile-first + URL tampering

```bash
# AC-B2-14: Chrome DevTools MCP manual walk (4 viewports)
# Documented in B-2-SUMMARY.md with 4 screenshot file paths attached.

# AC-B2-15: cross-client URL tampering
# Manual in Chrome DevTools — confirm 404 + screenshot.
```

### AC-B2-16 — TD-B1abis-03 polish

```bash
# Diff line count
git diff --stat HEAD~1..HEAD src/components/client-combobox.tsx
# Expect: <=15 lines net

# Hook check
bash .claude/hooks/nightwork-post-edit.sh --check src/components/client-combobox.tsx
# Expect: exit 0

# Grep for inline style remnants
grep -n "boxShadow\|style={" src/components/client-combobox.tsx
# Expect: zero matches (TD-B1abis-03 fully closed)
```

### AC-B2-17..19 — SUMMARY + MASTER-PLAN + smoke

```bash
# AC-B2-17
test -f .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2-SUMMARY.md
# AC-B2-18
grep -c "TD-B1abis-03.*CLOSED\|TD-B1abis-03.*RESOLVED" .planning/MASTER-PLAN.md
# Expect: >=1
# AC-B2-19
grep -n "owner-portal\|SMOKE_OWNER_TOKEN" scripts/wave-d-smoke.ts
# Expect: matched lines confirming route entry
```

## 10. Rollback

**Rollback sequence (worst-case full revert):**

1. **Code revert (NOT destructive):** `git revert <B-2 commits>` — reverts middleware change, route files, types, activity-log.ts, client-combobox.tsx. App returns to pre-B-2 state. `/owner/{token}` returns to 404 (no route).
2. **Down migration:** `npx supabase db push` against `00104_*.down.sql`. Drops `client_portal_access.client_id`, `activity_log.actor_token_id`, both indexes.
3. **Types regen:** re-run `npx supabase gen types typescript --linked` after down migration.
4. **Order matters:** Code revert FIRST, migration down SECOND. If migration is reverted while code still references `actor_token_id`: TypeScript build error + runtime error. Code-then-DB sequencing prevents this.

**Forward-fix (preferred over rollback for most failures):**
- Discovered cross-client leak post-ship → patch the explicit `.eq('client_id', ...)` filter immediately; do NOT rollback the migration (the columns are additive + safe).
- Discovered token enumeration exploit → temporarily revoke all active `client_portal_access` rows via SQL UPDATE + ship a fix. Migration rollback is not the right response.

## 11. Dispatch authorization (halt_after: true)

Per nwrp198 §26: this PLAN halts at plan-review iter-1 for Jake review. Do NOT auto-/nx.

**Jake pre-/nx checklist (sign-off required on each):**

- [ ] **§4.a security model accepted.** Layered defense (entropy + hash-lookup + app-layer filter + RLS backstop). NO anon RLS policy added. Service-role API as the sole anon data path (preserves 00074 Scope decision #1).
- [ ] **90-day sliding window preserved (NOT 1-year default).** EXPANDED-SCOPE Q5 line 211 mentions "1-year expiration" but the existing 00074 schema is 90-day sliding. B-2 preserves the existing default to avoid an unintentional schema-default change. If Jake wants the 1-year change in B-2, surface as amendment.
- [ ] **§4.b actor_token_id pattern accepted.** App-layer mutual exclusion (no DB CHECK due to B-3 trigger interaction + legacy rows). Display label "Homeowner (via portal link)" — does NOT surface PII.
- [ ] **§4.c mobile-first surface accepted.** New `/owner/{token}` route distinct from existing `/owner-portal/*` (1.5c playground co-exists). Standalone layout (no nav-bar). Multi-viewport coverage at execute time + smoke harness extension at ship; multi-viewport harness ships in B-7.
- [ ] **TD-B1abis-03 polish bounded.** ≤15 lines net diff; cost-code-combobox idiom; no new token introduction.
- [ ] **Cost projection at $22-33** (§12) within $50 per-plan halt gate (Rule 7d). If mid-execute the projection exceeds $50, halt-and-surface per Rule 7d.

**On Jake approval:** issue `/nx` (or equivalent dispatch). Without Jake explicit sign-off, do NOT proceed to execute.

## 12. Cost projection

Per EXPANDED-SCOPE §10:

| Item | Estimate | Reasoning |
|---|---|---|
| Migration + types regen | $4-6 | 00104 + .down + types pipeline; similar to 00100 baseline |
| Route + layout + token helper + service-role API | $8-12 | 4 new files; mobile-first JSX; service-role integration |
| acknowledgment endpoint + UI button | $4-6 | 1 new API + 1 component extension |
| TD-B1abis-03 polish | $1-3 | ~10 lines bounded |
| Smoke harness + SUMMARY + MASTER-PLAN | $3-5 | scaffolding + AC attestation |
| Plan-review iter-1 (7 reviewers per frontmatter) | $5-8 | medium threat-model; multi-tenant + rls-auditor mandatory |
| **Total estimated** | **$25-40** | At-or-above EXPANDED-SCOPE §10 $22-33 estimate due to 7-reviewer plan-review |

**Halt gate:** if mid-authoring or mid-execute projection exceeds **$50** (Rule 7d), halt + surface to Jake + propose scope-reduction options. **Do NOT scope-engineer to fit.**

**Slice-2 ceiling impact:** $25-40 of $200 ceiling consumed. Remaining: $160-175 for B-3..B-7 (combined EXPANDED-SCOPE estimate $110-160).

## 13. Hand-off

After B-2 ships (post-Jake-/nx dispatch + execute + QA + smoke green):

1. **Update MASTER-PLAN §11 TD-B1abis-03 row 297 → CLOSED** with B-2 commit ref (in §5 Task 6).
2. **Update MASTER-PLAN §12 (carry-forward log)** — note B-2 ship; note B-3 sequencing readiness.
3. **Mark Slice-2 progress in EXPANDED-SCOPE.md** §7 row B-2 → SHIPPED (date).
4. **Open TD-B2-01** (if applicable): "PATTERNS.md 'Owner Status View' entry deferred to Wave 1.1-Lite OR design-pushback request" — depending on iter-1 outcome.
5. **Trigger conditions for Wave 1.1-Lite items:**
   - Token revocation UI (no trigger yet — Wave 1.1-Lite scope).
   - Token rotation cadence revisit (after first 30-60 days of real RB usage per EXPANDED-SCOPE Q5).
   - PII restoration via `/api/clients/[id]` GET endpoint (if homeowner needs PM contact info; deferred per Q4).
   - Multi-region rate-limit upgrade (when scale demands).
6. **Slice-2 dispatch readiness:** B-3 dispatch becomes UNBLOCKED (depends_on: B-2 ship per EXPANDED-SCOPE §8 strict-sequential edge "B-2 BEFORE B-3").
7. **Custodian update** to phase folder: ensure SUMMARY.md exists; ensure all 6 commits referenced; ensure smoke artifact path recorded; QA cycle invocation pending.

---

**End of B-2-PLAN.md.** Halts at plan-review iter-1 per `halt_after: true` and nwrp198 §26.
