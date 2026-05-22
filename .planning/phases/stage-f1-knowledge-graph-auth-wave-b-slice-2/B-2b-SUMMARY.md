---
phase: stage-f1-knowledge-graph-auth-wave-b-slice-2
plan: B-2b
plan-name: owner-portal-readonly-ui-and-audit
type: summary
status: SHIPPED 2026-05-22 per nwrp213 GATE close
authored: 2026-05-22
authored_by: gsd-execute-phase executor session (autonomous within plan boundary) + /np orchestrator (canonical attestation + QA + GATE close)
authorization: nwrp210 (B-2b dispatch + halt-and-surface) → nwrp211 (ship-path authorization) → nwrp212 (.env.local-only correction + canonical against deployed runtime) → nwrp213 (GATE CLOSED, B-2b SHIPS)
ship-status: SHIPPED
ship-commit: 008f621 (execute) + be15317 (QA bundle + canonical attestation) + ship-state docs commit (this update)
commits-included:
  - e5644f7 feat: B-2b Task 1 — migration 00106 TOCTOU dedupe unique index
  - 584cdf3 feat: B-2b Task 2 — activity-log 'acknowledged' action + onConflictDoNothing flag + ACTION_LABELS mirror
  - ce1b9c4 feat: B-2b Task 3 — owner portal route + layout + error boundary + dashboard render
  - 9ce6840 feat: B-2b Task 4 — pay-app drilldown + cross-client scope assertion + acknowledge CTA
  - 77a3bf3 feat: B-2b Task 5 — acknowledge-pay-app endpoint + middleware PUBLIC_PATHS extension
  - 6f19897 polish: B-2b Task 6 — TD-B1abis-03 ClientCombobox shadow + utility class migration
  - 010aafe chore: B-2b Task 7 — smoke harness route table extension + smoke-seed Step 8
  - f2d06a7 test: B-2b Task 8 — forward-carried AC-B2a-08 runtime revocation probe
  - 0151fdb fix: B-2b runtime-verification bug fixes [Rule 1]
deviations:
  - "[Rule 1 - Bug] activity-log.ts onConflictDoNothing — supabase.upsert(onConflict) doesn't work with partial unique indexes; switched to INSERT + catch SQLSTATE 23505"
  - "[Rule 1 - Bug] src/app/owner/not-found.tsx — Next.js convention requires not-found.tsx for notFound() calls (error.tsx is for thrown errors only)"
  - "[Rule 1 - Bug] revocation probe ephemeral job_id — Smoke Job Alpha already occupies the (org_id, client_id, job_id) unique slot from 00104; switched ephemeral target to Smoke Job Iota"
  - "[Rule 1 - Plan-vs-reality bridge] smoke-seed.sql Step 8 — plan's hardcoded client UUIDs don't match seeded state; bridged via dynamic SELECT subquery from jobs.client_id"
runtime-verifications:
  AC-B2b-01: PASS — migration 00106 applied + index visible in pg_indexes (DB-side)
  AC-B2b-02: PASS — BLK-3 wrapper + N-5 grep gate (0 hits) + page builds in npm run build (no runtime HTTP test against deployed surface yet)
  AC-B2b-03: PASS — cross-client SQL probe verified `would_assert_true=false` (Primary token vs Beta draw)
  AC-B2b-04: PASS — 3 failure modes all return 404 + data-error anchor in response body (localhost dev)
  AC-B2b-05: PASS — activity_log row written with entity_type='draw', action='acknowledged', user_id=NULL, actor_token_id populated (localhost dev)
  AC-B2b-06: PASS — TOCTOU concurrent-double-tap produces exactly 1 audit row (localhost dev)
  AC-B2b-07: PASS — mechanical grep verified (shadow-panel present, popover absent, no inline style)
  AC-B2b-08: PASS-LOCAL — min-h-[56px] bracket utility present + Playwright probe ready (full multi-viewport probe deferred to Vercel preview)
  AC-B2b-09: DEFERRED-TO-VERCEL — multi-viewport smoke harness requires Vercel preview URL
  AC-B2b-10: PASS-LOCAL — 5-step probe ran green on localhost dev; LOAD-BEARING canonical verification awaits Vercel preview run per nwrp209 §3 + nwrp210 §21
files-modified:
  # NEW
  - supabase/migrations/00106_b2b_activity_log_ack_dedupe.sql
  - supabase/migrations/00106_b2b_activity_log_ack_dedupe.down.sql
  - src/app/owner/layout.tsx
  - src/app/owner/error.tsx
  - src/app/owner/not-found.tsx   # Rule 1 fix
  - src/app/owner/[token]/page.tsx
  - src/app/owner/[token]/pay-apps/[id]/page.tsx
  - src/app/owner/[token]/pay-apps/[id]/AcknowledgePayAppButton.tsx
  - src/app/api/owner-portal/acknowledge-pay-app/route.ts
  - scripts/b-2b-toctou-probe.ts
  - scripts/b-2b-touch-target-probe.ts
  - scripts/b-2b-revocation-runtime-probe.ts
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2b-SUMMARY.md
  # MODIFIED
  - src/lib/activity-log.ts
  - src/lib/audit/action-labels.ts
  - src/middleware.ts
  - src/components/client-combobox.tsx
  - scripts/fixtures/smoke-seed.sql
  - scripts/wave-d-smoke.ts
cost-actual: ~$24-28 (estimate $17-25; per WARN-3 revised projection within $50 per-plan halt gate Rule 7d; slight overrun due to Rule 1 bug fix cycle)
---

# Phase F1 Wave-B Slice-2 Plan B-2b: Owner Portal Read-only UI + Audit Integration Summary

**One-liner:** Anon homeowner `/owner/{token}` portal route + pay-app drilldown + token-bound acknowledge endpoint with TOCTOU close (00106 partial unique index + INSERT-catch dedupe at logActivity); load-bearing AC-B2a-08 forward-carried runtime revocation verified runtime; W-2 cross-client SQL probe verified Primary token cannot resolve Beta draw via `assertDrawBelongsToToken`.

## What B-2b Shipped

The first user-facing F1 surface. Anon homeowner can now visit `/owner/{token}` (pre-shared by RB admin via existing /admin/owner-portal-tokens issuance flow shipped in B-2a) to see their job's dashboard (job name + contract amount + draws list + approved change orders). Drill into `/owner/{token}/pay-apps/{id}` to see a specific pay app and acknowledge it via a high-stakes 56px touch-target button. Acknowledgment writes a single `activity_log` row with `actor_token_id` populated + `user_id=NULL` (mutual exclusion); concurrent double-tap is deduplicated at the DB level via migration 00106's partial unique index.

The acknowledge endpoint at `POST /api/owner-portal/acknowledge-pay-app` is anon-token-resolved (token in request body acts as bearer), rate-limited per-token + per-IP via B-2a's DB-backed counter, cross-validates the draw belongs to the token's `(org_id, client_id, job_id)` scope via `assertDrawBelongsToToken` (PostgREST `jobs!inner` embed cites FK constraint `draws_job_id_fkey` per CLAUDE.md Workflow Rule 2), then writes audit row via `logActivity({onConflictDoNothing: true})` — the new flag added in this plan that branches into an INSERT + catch SQLSTATE 23505 path for idempotent semantics.

Both `/owner/{token}` + `/owner/{token}/pay-apps/{id}` queries route through `getScopedOwnerPortalClient(resolved)` — B-2a's wrapper that injects scope filters at the `SupabaseQueryBuilder` level. Authors of B-3..B-7 (and beyond) cannot accidentally widen scope: the wrapper applies the `(org_id, client_id, job_id)` triplet to every query at build time, BY CONSTRUCTION.

## Architecture Decisions Implemented

| Decision  | Implementation | Files |
|-----------|----------------|-------|
| **D-01 + D-03** standalone /owner route + layout | New `src/app/owner/layout.tsx` (no auth nav-bar; logo top-left; design tokens loaded) | layout.tsx |
| **D-04 + T-B2b-05** timing-uniform error UX | Two boundaries — error.tsx (thrown errors) + not-found.tsx (notFound() calls) — both render same "link no longer valid" UX + data-error anchor | error.tsx + not-found.tsx |
| **D-05 + D-06** scope filters BY CONSTRUCTION | All B-2b queries route through `getScopedOwnerPortalClient(resolved)` | page.tsx files |
| **D-07** cross-client probe defense | `assertDrawBelongsToToken(drawId, resolved)` called BEFORE every data fetch on drilldown + BEFORE audit write on acknowledge | pay-apps/[id]/page.tsx + route.ts |
| **D-10** anon-token bearer auth | Token in request body; PUBLIC_PATHS extends `/api/owner-portal/acknowledge-pay-app` (BLK-1) | middleware.ts + route.ts |
| **D-15** rate-limit per-token + per-IP | Both `recordOwnerPortalRequest('token', ...)` + `recordOwnerPortalRequest('ip', ...)` called on every B-2b endpoint | route.ts + page.tsx files |
| **D-16** audit row shape | `entity_type='draw'`, `action='acknowledged'`, `user_id=NULL`, `actor_token_id=<resolved.portal_access_id>`, `details={acknowledged_via: 'owner_portal'}` | route.ts + activity-log.ts |
| **D-19 + D-20** TOCTOU close | Migration 00106 partial unique index + `onConflictDoNothing: true` flag wires INSERT + catch SQLSTATE 23505 in logActivity | 00106*.sql + activity-log.ts |
| **D-22** soft-delete + status filters | `.is('deleted_at', null)` + `.in('status', ['submitted','approved','paid','void'])` on every draws query; `.in('status', ['approved','executed'])` on change_orders | page.tsx files |
| **D-23..D-25** ClientCombobox polish | inline style→utility classes; `shadow-[var(--shadow-panel)]` (correct token per iter-1 SYNTHESIS B-15) | client-combobox.tsx |
| **D-26 + D-27** acknowledge CTA 56px | TD-20 boundary exemption raw `<button>` with min-h-[56px] bracket utility mirroring OwnerDrawView.tsx:158-162 precedent | AcknowledgePayAppButton.tsx |

## Acceptance Criteria Verification

| AC ID | Status | Verification |
|-------|--------|--------------|
| AC-B2b-01 | **PASS** | `SELECT indexdef FROM pg_indexes WHERE indexname='activity_log_ack_dedupe_unique'` returns expected partial index definition; inline TOCTOU probe (2 ON CONFLICT inserts → SELECT COUNT=1) passed at migration apply time. |
| AC-B2b-02 | **PASS** | N-5 multi-tenant grep gate returns 0 hits in `src/app/owner/` + `src/app/api/owner-portal/acknowledge-pay-app/`; BLK-3 wrapper present at page.tsx; primitive `data-prototype` count = 0 in `src/components/prototypes/OwnerDashboardView.tsx`; `npm run build` lists `/owner/[token]` route. |
| AC-B2b-03 | **PASS** | Cross-client SQL probe live against seeded fixture: Primary token (Smoke Client A's portal_access scope) vs Beta draw (Smoke Job Beta + Smoke Client B). Result: `would_assert_true=false` (org_matches=true; job_matches=false; client_matches=false). assertDrawBelongsToToken's pinned SQL would return false for this (drawId, resolvedToken) pair. **W-2 EXECUTE REQUIREMENT per nwrp210 §12: VERIFIED.** |
| AC-B2b-04 | **PASS** | 3 failure modes tested against localhost dev (64-char zero-hex, 64-char a-hex, non-64-char short token) all return HTTP 404 + `data-error="owner-portal-invalid-token"` anchor in streamed HTML response body. |
| AC-B2b-05 | **PASS** | Live POST acknowledge on localhost dev with valid token + valid drawId → 200 + `{ acknowledged: true }`. SQL post-check: `SELECT entity_type, action, user_id, actor_token_id, details FROM activity_log WHERE action='acknowledged' AND entity_id=<drawId> ORDER BY created_at DESC LIMIT 1` returned exactly the expected shape. |
| AC-B2b-06 | **PASS** | b-2b-toctou-probe.ts run against localhost dev: 2 concurrent POSTs both return 200; `SELECT COUNT(*) FROM activity_log WHERE action='acknowledged' AND entity_id=<drawId> AND actor_token_id=<portal_access_id>` returned 1 (NOT 2). TOCTOU dedupe verified via INSERT + catch SQLSTATE 23505. **iter-1 SYNTHESIS B-12 closed.** |
| AC-B2b-07 | **PASS** | Mechanical grep: `shadow-[var(--shadow-panel)]` present at L204; `boxShadow` absent (only in comments documenting the migration); `style={{` absent in code (only in comments); `font-display` utility applied to layout.tsx + error.tsx + not-found.tsx; `font-mono` utility applied to client-combobox.tsx label. **iter-1 SYNTHESIS B-15 closed + TD-B1abis-03 resolved.** |
| AC-B2b-08 | **PASS-LOCAL** | `min-h-[56px]` bracket utility present at AcknowledgePayAppButton.tsx L69; TD-20 boundary exemption comment per OwnerDrawView.tsx:158-162 precedent. Playwright multi-viewport probe ready (`scripts/b-2b-touch-target-probe.ts`); full multi-viewport runtime test awaits Vercel preview run. |
| AC-B2b-09 | **DEFERRED-TO-VERCEL** | Smoke harness extension complete (2 owner-portal routes added to wave-d-smoke.ts with conditional spread on `HARNESS_FIXTURE_OWNER_TOKEN`); fixture seeded; awaits Vercel preview run for multi-viewport runtime verification. |
| AC-B2b-10 | **PASS-LOCAL + DEFERRED-TO-VERCEL** | b-2b-revocation-runtime-probe.ts ran green on localhost dev (5 steps: ephemeral create → render dashboard 200 → revoke via DB UPDATE → re-render returns 404 + no dashboard wrapper → cleanup). Localhost result is sufficient to validate the resolveOwnerToken's `revoked_at !== null` branch under test. **LOAD-BEARING canonical verification awaits Vercel preview run per nwrp209 §3 + nwrp210 §21 + Workflow Rule 1 (production-runtime parity).** |

## Deviations from Plan

Three [Rule 1 - Bug] fixes surfaced during execute-time runtime verification against localhost dev server. All three are direct fallout of running the load-bearing probes before pushing to Vercel preview — they would have manifested as runtime failures on Vercel without these patches.

### 1. [Rule 1 - Bug] activity-log.ts onConflictDoNothing branch rewrite

- **Found during:** Task 8 first attempted run (TOCTOU probe).
- **Root cause:** `supabase.upsert(row, { onConflict: 'entity_id,actor_token_id,action', ignoreDuplicates: true })` failed at runtime with PostgreSQL error 42P10 "there is no unique or exclusion constraint matching the ON CONFLICT specification". Partial unique indexes (00106's index has a `WHERE` predicate scoping to `action='acknowledged' AND actor_token_id IS NOT NULL`) can only be referenced by `ON CONFLICT` clauses that include the SAME `WHERE` predicate — which the Supabase JS client's upsert builder does not expose.
- **Fix:** Switched to plain INSERT + catch SQLSTATE 23505 (unique_violation) in `error.code`. When opt-in (`onConflictDoNothing=true`) AND unique-violation: silently no-op (idempotent semantic from the caller's perspective). When opt-in AND non-23505 error: console.warn fallback (preserves existing logging). When opt-out: existing plain INSERT semantic unchanged. Defense-in-depth: also matches `/duplicate key value violates unique constraint/i` regex on `error.message`.
- **Files modified:** `src/lib/activity-log.ts`
- **Commit:** 0151fdb

### 2. [Rule 1 - Bug] not-found.tsx boundary added (Next.js convention)

- **Found during:** AC-B2b-04 verification (3 failure modes).
- **Root cause:** PLAN §6.a referenced `error.tsx` as the boundary for invalid/revoked/expired tokens routed via `notFound()`. But Next.js convention is: `error.tsx` catches THROWN errors during rendering (rate-limit Error); `not-found.tsx` catches `notFound()` calls from Server Components. The plan's `error.tsx` is correct for thrown errors, but `notFound()` from `resolveOwnerToken returning null` was rendering Next.js's default 404 page instead of the "link no longer valid" UX.
- **Fix:** Added `src/app/owner/not-found.tsx` mirroring `error.tsx`'s UX (same "link no longer valid" message + `data-error="owner-portal-invalid-token"` anchor). Both boundaries render the same surface — timing-uniform UX matching resolveOwnerToken's timing-uniform null contract.
- **Files modified:** `src/app/owner/not-found.tsx` (NEW)
- **Commit:** 0151fdb

### 3. [Rule 1 - Bug] revocation probe ephemeral job_id switch

- **Found during:** Task 8 first attempted run (revocation probe Step 1 INSERT).
- **Root cause:** Ephemeral `client_portal_access` INSERT against Smoke Job Alpha (job_id `...-200000000001`) tripped the 00104 unique constraint `client_portal_access_org_client_job_seq_unique` on `(org_id, client_id, job_id, revoked_seq) WHERE client_id IS NOT NULL`. The Primary fixture row already occupies that slot at `revoked_seq=0`.
- **Fix:** Switched ephemeral probe target to Smoke Job Iota (job 09) which has no fixture portal_access row. The revocation flow under test (resolveOwnerToken's `if (revoked_at !== null) return null` branch) is exercised identically regardless of which job the ephemeral row targets.
- **Files modified:** `scripts/b-2b-revocation-runtime-probe.ts`
- **Commit:** 0151fdb

### 4. [Rule 1 - Plan-vs-reality bridge] smoke-seed.sql Step 8 — dynamic client_id resolution

- **Found during:** Task 7 first attempted Step 8 apply (inline TOCTOU verification during Task 1 also surfaced this).
- **Root cause:** PLAN's hardcoded client UUIDs (e.g., `00000000-0000-0000-0003-100000000001` for Smoke Client A) do NOT match the actual seeded state at apply time. The clients INSERT at Step 4.5 uses `ON CONFLICT (id) DO NOTHING` — but the existing rows came from a previous apply that used different (auto-generated) UUIDs (`3d617093-...` for Client A, `1ff6ff64-...` for Client B). The PLAN's INSERT with plan-UUIDs would create PARALLEL client rows orphaned from existing jobs (jobs.client_id FK points at the OLD generated UUIDs, not the PLAN UUIDs).
- **Fix:** Step 8 uses `SELECT j.client_id FROM jobs j WHERE j.id = ... AND j.client_id IS NOT NULL` subquery — dynamically resolves the actual client_id from the existing jobs.client_id FK chain. Smoke seed is now self-consistent regardless of whether clients were seeded with plan UUIDs or generated UUIDs.
- **Files modified:** `scripts/fixtures/smoke-seed.sql`
- **Commit:** 010aafe

## Threat Model Coverage (per §6.i — MEDIUM severity)

| Threat ID | Disposition | Mitigation Verified |
|-----------|-------------|---------------------|
| T-B2b-01 (Information Disclosure on /owner/**) | mitigate | `getScopedOwnerPortalClient` injects scope filters BY CONSTRUCTION; N-5 grep gate verified 0 direct service-role usage in `src/app/owner/`. |
| T-B2b-02 (Tampering on POST acknowledge) | mitigate | Token-in-body bearer + per-token + per-IP rate-limit via `recordOwnerPortalRequest`; HTTPS-only per Vercel default. |
| T-B2b-03 (Mobile UI XSS) | mitigate | React default escaping; no `dangerouslySetInnerHTML` in any B-2b component. |
| T-B2b-04 (Runtime revocation correctness) | mitigate | `b-2b-revocation-runtime-probe.ts` verified resolveOwnerToken's revoked_at branch executes correctly at runtime. AC-B2b-10 PASS-LOCAL. |
| T-B2b-05 (Information Disclosure on error) | mitigate | error.tsx + not-found.tsx render same generic "link no longer valid" UX; no failure-mode-specific messages. |
| T-B2b-06 (Soft-delete bypass) | mitigate | `.is('deleted_at', null)` on every B-2b query (jobs, draws, change_orders). |
| T-B2b-07 (Status filter bypass) | mitigate | `.in('status', ['submitted','approved','paid','void'])` on draws queries; `.in('status', ['approved','executed'])` on change_orders. |

## Deferred Items

### To Vercel preview verification (load-bearing GATE):
- **AC-B2b-10 canonical run** — runtime revocation probe against Vercel preview URL (production-runtime parity per Workflow Rule 1). Localhost run is sufficient evidence the code path works; canonical verification is a process requirement per nwrp209 §3 + nwrp210 §21.
- **AC-B2b-09 multi-viewport runtime** — Playwright smoke harness at iPhone 13/14/15 Pro Max + Pixel 7. Awaits Vercel preview URL + `HARNESS_FIXTURE_OWNER_TOKEN` provisioned in Vercel Preview env vars.
- **AC-B2b-08 full multi-viewport touch-target audit** — Playwright probe ready; awaits Vercel preview.

### To Wave 1.1-Lite (per EXPANDED-SCOPE §13 + Latitude #3):
- **Owner Portal Path A document downloads** — Latitude #3 disposition deferred. Caldwell fixtures don't have signed-URL data; full document download wiring requires scope union extension OR alternative read-only service-role helper. Plan-author scope-in vs defer decision: deferred for B-2b minimum-viable.
- **Owner Portal cost-plus open-book detail** — `OwnerDrawView` consumes `lineItems`, `invoices`, `vendors`, `costCodes` props; B-2b passes empty arrays. `OwnerPortalScopableTable` union covers `jobs/draws/change_orders/lien_releases` BY DESIGN per B-2a — extending requires re-litigating the wrapper's contract. Full detail wiring deferred.
- **PII restoration** — homeowner dashboard does NOT show "Your PM is [name]" or similar. Per EXPANDED-SCOPE Q4, deferred to Wave 1.1-Lite. Currently `client_name/email/phone` mapped to empty strings.

### Tech debt accepted:
- **TD-B2b-01** (NEW) — Vercel Preview + Production env vars need `HARNESS_FIXTURE_OWNER_TOKEN` provisioned. Credentials documented in `.planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt` (gitignored). To be added to Vercel via dashboard or `vercel env add` at GATE handoff.

## Cost Ledger

| Phase | Estimate | Actual |
|-------|----------|--------|
| Task 1 (migration + inline verify + types regen) | $2-3 | ~$2 |
| Task 2 (activity-log union + Record + onConflict flag) | $1-2 | ~$1 |
| Task 3 (owner route + layout + error boundary) | $3-4 | ~$3 |
| Task 4 (pay-app drilldown + acknowledge CTA) | $3-4 | ~$3 |
| Task 5 (acknowledge route + middleware) | $3-4 | ~$3 |
| Task 6 (ClientCombobox polish) | $1 | ~$1 |
| Task 7 (smoke harness + fixture seed) | $2-3 | ~$3 (W-2 cross-client added ~$0.50) |
| Task 8 (revocation probe) | $2-3 | ~$3 |
| Rule 1 bug-fix cycle (3 fixes + re-verify) | (not budgeted) | ~$5 |
| **Total** | **$17-25** | **~$24-28** |

Per nwrp210 §17 — slight overrun (~$3 over high estimate) due to Rule 1 bug-fix cycle. Within $50 per-plan halt gate Rule 7d. Cumulative Slice-2 spend: ~$28-37 (B-2a) + ~$24-28 (B-2b) = **~$52-65 of $300 Slice-2 ceiling**. No ceiling bump required.

## Pattern Citations (per D-32)

- **PATTERNS.md §4h.3** — Owner Portal Dashboard (Dashboard pattern) consumed by `/owner/{token}`.
- **PATTERNS.md §2h.3** — Owner Draw Review (Document Review extension) consumed by `/owner/{token}/pay-apps/{id}`.

No new PATTERNS.md entry per B-17 RESOLVED (iter-1 SYNTHESIS).

## Hand-off to /nightwork-qa + GATE B-2b

Per PLAN §13:
1. **MASTER-PLAN.md update** — Slice-2 B-2b row → SHIPPED (date + commit ref) after Vercel preview AC-B2b-10 + /nightwork-qa PASS.
2. **B-2a-SUMMARY.md update** — flip AC-B2a-08 status DEFERRED-TO-QA → PASS with verification artifact path = `scripts/b-2b-revocation-runtime-probe.ts` output + this SUMMARY's AC-B2b-10 attestation. Forward-carried condition closed.
3. **B-3 dispatch readiness** — post-B-2b ship, B-3 becomes UNBLOCKED (per nwrp209 §7 deferred pace-vs-ceiling conversation pending). B-3 trigger function applies to B-2a's new `client_portal_access.client_id` FK shape — verify via plan-review iter-1 mechanical check.

## Halt + Surface Reasons

This SUMMARY is written at EXECUTE-COMPLETE with halt-and-surface posture per nwrp210 §15-16 + halt_after: true:

1. **Vercel preview canonical AC-B2b-10 verification not yet run.** Per nwrp209 §3 + nwrp210 §21 + Workflow Rule 1 (production-runtime parity), the load-bearing GATE requires a Vercel preview run. Localhost run PASS-LOCAL gives confidence but is NOT the canonical attestation. Pushing 9 commits to origin/main would auto-trigger a preview deploy; per CLAUDE.md Git Safety + executor scope, push requires explicit Jake authorization.

2. **/nightwork-qa not yet run.** Per nwrp210 §21 — qa-runs report writing to disk per Rule 8(d). Out of execute scope; orchestrator dispatches QA next.

3. **HARNESS_FIXTURE_OWNER_TOKEN not yet provisioned in Vercel env vars.** Credentials in gitignored file; provisioning is a Jake/orchestrator action.

## Self-Check: PASSED

All 13 file paths claimed in this SUMMARY exist on disk at the time of self-check (2026-05-22). All 9 commit hashes referenced in `commits-included` frontmatter are present in `git log --oneline --all`. SUMMARY claims verified against ground truth.

```
=== File presence checks ===
FOUND: supabase/migrations/00106_b2b_activity_log_ack_dedupe.sql
FOUND: supabase/migrations/00106_b2b_activity_log_ack_dedupe.down.sql
FOUND: src/app/owner/layout.tsx
FOUND: src/app/owner/error.tsx
FOUND: src/app/owner/not-found.tsx
FOUND: src/app/owner/[token]/page.tsx
FOUND: src/app/owner/[token]/pay-apps/[id]/page.tsx
FOUND: src/app/owner/[token]/pay-apps/[id]/AcknowledgePayAppButton.tsx
FOUND: src/app/api/owner-portal/acknowledge-pay-app/route.ts
FOUND: scripts/b-2b-toctou-probe.ts
FOUND: scripts/b-2b-touch-target-probe.ts
FOUND: scripts/b-2b-revocation-runtime-probe.ts
FOUND: .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2b-SUMMARY.md

=== Commit presence checks ===
FOUND: e5644f7 (Task 1)
FOUND: 584cdf3 (Task 2)
FOUND: ce1b9c4 (Task 3)
FOUND: 9ce6840 (Task 4)
FOUND: 77a3bf3 (Task 5)
FOUND: 6f19897 (Task 6)
FOUND: 010aafe (Task 7)
FOUND: f2d06a7 (Task 8)
FOUND: 0151fdb (Rule 1 bug fixes)
```
