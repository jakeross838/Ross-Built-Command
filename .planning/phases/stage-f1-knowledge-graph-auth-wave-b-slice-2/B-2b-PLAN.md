---
phase: stage-f1-knowledge-graph-auth-wave-b-slice-2
plan: B-2b
plan-name: owner-portal-readonly-ui-and-audit
type: execute
wave: B-2b (Slice-2 second plan post-nwrp200 re-split; depends on B-2a GATE)
depends_on: ["B-2a"]
autonomous: true
halt_after: true                # Tier 1 — GATE on UI per nwrp209 §15-16; B-2b is the FIRST user-facing surface in F1
requires_smoke: true            # mobile-first + first user-facing F1 UI + AC-B2a-08 forward-carried runtime revocation
threat_model_severity: medium   # was MEDIUM for B-2; security foundation SHIPPED in B-2a; B-2b is UI on proven foundation
status: AUTHORED — REVISED 2026-05-22 post plan-checker iter-1 NEEDS-WORK (3 BLK + 4 WARN/NOTE applied)
authored: 2026-05-22
authored_by: gsd-planner via /np dispatch (nwrp209 LEANER B-2b authorization post-B-2a-GATE-SIGNED)
authorization: nwrp209 (B-2a GATE SIGNED + B-2b LEANER 5-reviewer scope + forward-carried AC-B2a-08 runtime revocation as load-bearing GATE condition)
source_decisions:
  - "B-2b-CONTEXT.md D-01..D-34 (34 locked decisions covering route + token resolution + components + mobile + audit + TOCTOU + soft-delete/status filters + ClientCombobox + NwButton + forward-carried test + plan-author latitudes)"
  - "EXPANDED-SCOPE.md §7 plan #2 (canonical B-2b scope; re-split per nwrp200)"
  - "EXPANDED-SCOPE.md §11 B-2b ACs subset (lines 407-415)"
  - "B-2a-PLAN.md + B-2a-SUMMARY.md (foundation SHIPPED 2026-05-21..05-22; commits fc19a2e..ee43e78 + 59459a7)"
  - "nwrp200 (B-2 re-split DIRECTIVE; B-2b authored as UI plan on B-2a foundation)"
  - "nwrp202 §15 (B-2b includes design-pushback in plan-review iter-1; B-2a security-only excluded it)"
  - "nwrp209 §1-17 (B-2a SHIPPED + B-2b LEANER dispatch + forward-carried AC-B2a-08 + per-plan halt gate Rule 7d)"
  - "iter-1 SYNTHESIS B-12..B-17 (TOCTOU close, append-only audit, soft-delete/status filters, --shadow-panel correction, NwButton TD-20 exemption, no new PATTERNS entry — all RESOLVED via B-2b deliverables OR explicit no-op decision)"
  - "PATTERNS.md §4h.3 (Owner Portal Dashboard pattern) + §2h.3 (Owner Draw Review = Document Review extension) — consumed; NO new pattern entry"
  - "SYSTEM.md (Slate type system + Stone Blue palette + 44px touch target minimum + 56px high-stakes + WCAG 2.2 AA mandatory + viewport contract)"
  - "COMPONENTS.md (Button/NwButton size variants; raw-button TD-20 exemption pattern)"
  - "CLAUDE.md UI rules (Slate type + Stone Blue + design tokens always + logo top-left + invoice review as gold standard for document-review surfaces)"
  - "CLAUDE.md Workflow posture Rules 1-9 (Rule 1 runtime verification; Rule 2 FK citation; Rule 4 smoke gate for UI-touching; Rule 5 files_modified intersection; Rule 6 pre-flight; Rule 7d per-plan halt gate; Rule 8 hook fail-closed)"
  - "plan-checker iter-1 NEEDS-WORK (2026-05-22): 3 BLK + 4 WARN/NOTE — applied at REVISED status above"
files_modified:
  # NEW — owner-portal route tree (D-01..D-04)
  - src/app/owner/layout.tsx
  - src/app/owner/error.tsx
  - src/app/owner/[token]/page.tsx
  - src/app/owner/[token]/pay-apps/[id]/page.tsx
  # NEW — acknowledge endpoint (D-15..D-21)
  - src/app/api/owner-portal/acknowledge-pay-app/route.ts
  # NEW — migration 00106 TOCTOU dedupe unique index (D-19)
  - supabase/migrations/00106_b2b_activity_log_ack_dedupe.sql
  - supabase/migrations/00106_b2b_activity_log_ack_dedupe.down.sql
  # Regenerated — types pipeline mandatory per CLAUDE.md Dev Rules (00106 only adds index; types may be no-op but regen + commit MUST happen in same commit)
  - src/lib/types/database.types.ts
  # MODIFIED — extend ActivityAction union with 'acknowledged' (D-16; 'draw' entity already in union per B-1a-bis; 'acknowledged' is new for B-2b)
  - src/lib/activity-log.ts
  # MODIFIED — mirror ACTION_LABELS Record per B-1a-bis precedent (Record exhaustiveness)
  - src/lib/audit/action-labels.ts
  # MODIFIED — TD-B1abis-03 polish (D-23..D-25) + NOTE-1 fix (font-display utility instead of inline fontFamily)
  - src/components/client-combobox.tsx
  # MODIFIED — middleware PUBLIC_PATHS extension for /api/owner-portal/acknowledge-pay-app (BLK-1 fix per plan-checker iter-1;
  # existing /api/owner-portal/acknowledge entry does NOT startsWith-match /api/owner-portal/acknowledge-pay-app via the
  # matcher at src/middleware.ts:65-66 because the matcher requires `${p}/` not `${p}-`. Deterministic at plan-author time;
  # no longer deferred to execute-time verification per plan-checker BLK-1 option (b).)
  - src/middleware.ts
  # MODIFIED — extend smoke-seed.sql with client_portal_access fixture row (BLK-2 fix per plan-checker iter-1;
  # 00104 backfill only repaired NULL client_id on existing rows; no new portal_access fixture was added. Tasks 7-8 +
  # AC-B2b-10 require deterministic seeded fixture + plaintext token via HARNESS_FIXTURE_OWNER_TOKEN env var.)
  - scripts/fixtures/smoke-seed.sql
  # MODIFIED (smoke harness route table extension per Workflow Rule 4 — first user-facing F1 routes)
  - scripts/wave-d-smoke.ts
  # NEW — probe scripts for runtime verification + harness assertions (N-2 fix per plan-review iter-1 synthesis;
  # previously referenced in PLAN body but not enumerated here):
  - scripts/b-2b-toctou-probe.ts             # TOCTOU concurrent-double-tap probe (Task 7 / AC-B2b-06)
  - scripts/b-2b-touch-target-probe.ts       # mobile touch-target audit (Task 7 / AC-B2b-09)
  - scripts/b-2b-revocation-runtime-probe.ts # forward-carried AC-B2a-08 runtime revocation test (Task 8 / AC-B2b-10) per nwrp209 §3
files_referenced:
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2b-CONTEXT.md
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2a-PLAN.md
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2a-SUMMARY.md
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/PLAN-REVIEW-B2A-ITER1-SYNTHESIS.md
  - .planning/expansions/stage-f1-knowledge-graph-auth-wave-b-slice-2-EXPANDED-SCOPE.md
  - .planning/design/PATTERNS.md            # §4h.3 + §2h.3 consumed
  - .planning/design/SYSTEM.md              # tokens + touch targets + viewport contract
  - .planning/design/COMPONENTS.md          # Button/NwButton size variants
  - src/lib/owner-portal/token.ts           # B-2a; consumed (resolveOwnerToken, getScopedOwnerPortalClient, assertDrawBelongsToToken, ResolvedOwnerToken, OwnerPortalScopableTable)
  - src/lib/owner-portal/rate-limit.ts      # B-2a; consumed (recordOwnerPortalRequest)
  - src/lib/activity-log.ts                 # B-2a; extended (action union + Record mirror)
  - src/lib/audit/action-labels.ts          # B-2a; extended (ACTION_LABELS mirror)
  - src/middleware.ts                       # B-2a; PUBLIC_PATHS already extends /owner + /api/owner-portal/acknowledge (B-2b adds /api/owner-portal/acknowledge-pay-app per BLK-1 fix)
  - src/components/prototypes/OwnerDashboardView.tsx  # existing tenant-blind; consumed (BLK-3 fix: wrap in <main data-prototype="owner-dashboard"> at page.tsx layer, NOT in this component, to preserve Latitude #1 (a) tenant-blind contract)
  - src/components/prototypes/OwnerDrawView.tsx       # existing tenant-blind; consumed (BLK-3 fix: wrap in <main data-prototype="owner-draw"> at page.tsx layer)
  - src/app/owner-portal/page.tsx           # existing 1.5c thin wrapper (D-33 disposition: leave or deprecate)
  - src/app/owner-portal/pay-apps/[id]/page.tsx  # existing 1.5c thin wrapper (D-33)
  - src/lib/api/optimistic-lock.ts          # NOT used by B-2b (append-only audit_log per D-16)
  - supabase/migrations/00026_phase5_scaffolding_tables.sql  # activity_log shape
  - supabase/migrations/00074_client_portal.sql              # client_portal_access table shape (referenced by BLK-2 fixture seeding)
  - supabase/migrations/00104_b2a_token_issuance_security_model.sql  # activity_log.actor_token_id column shape + client_portal_access.client_id column
  - CLAUDE.md                               # UI rules + Workflow posture
sequence:
  before: B-3 (Slice-2 §8 dependency map; B-3 trigger applies to B-2a's client_portal_access.client_id FK shape)
  after: B-2a (SHIPPED 2026-05-22 per nwrp209 GATE)
  parallel_authoring_ok: false
  parallel_execute_ok: false   # B-2b is sequential after B-2a; ship unlocks B-3 dispatch per nwrp209 §7 deferred pace-vs-ceiling
acceptance-criteria-target: 10 falsifiable items (AC-B2b-01..AC-B2b-10) — see §8
env_vars_required:
  # BLK-2 fix: HARNESS_FIXTURE_OWNER_TOKEN ships the plaintext token via env so Tasks 7-8 + AC-B2b-10 can execute.
  # Per CLAUDE.md secret-presence-verification pattern (per nwrp139): use explicit `if [ -n ... ]; then ... else ... fi`,
  # NEVER the `${VAR:-NOT_SET}` fallback operator (the `:-` form returns the VALUE when set, leaking the secret).
  #
  # Set in:
  #   - `.env.local` (Jake dev machine + executor)
  #   - Vercel Preview (smoke harness against preview URL per Workflow Rule 1)
  #   - Vercel Production (smoke harness against production once B-2b ships)
  #
  # Presence-check pattern (canonical per nwrp139):
  #   if [ -n "$HARNESS_FIXTURE_OWNER_TOKEN" ]; then
  #     echo "HARNESS_FIXTURE_OWNER_TOKEN: SET (len=${#HARNESS_FIXTURE_OWNER_TOKEN})"
  #   else
  #     echo "HARNESS_FIXTURE_OWNER_TOKEN: NOT SET"
  #   fi
  - name: HARNESS_FIXTURE_OWNER_TOKEN
    purpose: "Plaintext 64-char hex token for the seeded client_portal_access fixture row in smoke-seed.sql; SHA-256 of this value equals the access_token_hash column on the fixture row"
    consumers: ["scripts/wave-d-smoke.ts", "scripts/b-2b-revocation-runtime-probe.ts", "scripts/b-2b-toctou-probe.ts"]
    where_to_set: [".env.local", "Vercel Preview env vars", "Vercel Production env vars"]
qa_reviewers:
  # NOTE: plan-review iter-1 scope is LEANER (5 reviewers per nwrp209 §10): spec-checker + ui-reviewer + nightwork-design-pushback + custodian + security-reviewer.
  # QA post-execute uses standard /nightwork-qa skill defaults below (7 reviewers; rls-auditor + ai-logic-tester carried because B-2b consumes B-2a RLS surface + executes representative queries against new dedupe index).
  - spec-checker
  - ui-reviewer
  - nightwork-design-pushback
  - custodian
  - security-reviewer
  - ai-logic-tester
  - rls-auditor
---

<criteria>
<!--
  Verification harness criteria block per D-17/D-18 mandate (stage-1.5c-verification-harness, shipped 2026-05-20).
  Authored 2026-05-22 (lean direct authoring per nwrp209 LEANER B-2b scope).
  REVISED 2026-05-22 post plan-checker iter-1 NEEDS-WORK (BLK-3 fix: data-prototype attribute applied via <main> wrapper in page.tsx).
  Five categories: mechanical, dom, visual, behavioral, semantic.
  Each criterion is falsifiable and verifiable from execute artifacts (smoke harness, DB queries, deployed /owner/{token} surface, Playwright mobile-viewport harness).

  Source mappings:
    mechanical — M-01..M-04 cover 00106 dedupe index posture + activity_log row shape + action-labels Record exhaustiveness.
    dom        — D-01..D-04 cover /owner/{token} render + /owner/{token}/pay-apps/{id} render + error boundary + acknowledge CTA presence.
    visual     — V-01..V-03 cover mobile viewport rendering (iPhone 13/14/15 Pro Max + Pixel 7) + design token compliance + 44/56px touch targets.
    behavioral — B-01..B-04 cover end-to-end portal load + acknowledge → activity_log write + TOCTOU concurrent-double-tap → exactly 1 row + revoked-token blocks (forward-carried AC-B2a-08).
    semantic   — S-01..S-02 cover token-scoped data fetch path correctness (no direct service-role client in /owner/** or /api/owner-portal/** outside B-2a admin paths) + ClientCombobox token correctness.
-->

mechanical:
  - id: M-01
    statement: "Migration 00106 adds partial unique index `activity_log_ack_dedupe_unique` on `(entity_id, actor_token_id, action) WHERE action='acknowledged' AND actor_token_id IS NOT NULL` (TOCTOU close per D-19)"
    query: "SELECT indexdef FROM pg_indexes WHERE tablename = 'activity_log' AND indexname = 'activity_log_ack_dedupe_unique';"
    expected: "1 row; indexdef contains '(entity_id, actor_token_id, action)' AND \"WHERE ((action = 'acknowledged'::text) AND (actor_token_id IS NOT NULL))\""
  - id: M-02
    statement: "Acknowledge endpoint writes activity_log row with entity_type='draw', action='acknowledged', user_id=NULL, actor_token_id populated (D-16; mutual exclusion per app-layer convention per activity-log.ts:21-27)"
    query: "SELECT entity_type, action, user_id, actor_token_id FROM public.activity_log WHERE action = 'acknowledged' AND created_at > NOW() - interval '1 hour' ORDER BY created_at DESC LIMIT 1;"
    expected: "1 row; entity_type='draw'; action='acknowledged'; user_id IS NULL; actor_token_id IS NOT NULL"
  - id: M-03
    statement: "ActivityAction union extended with 'acknowledged' member (D-16); ACTION_LABELS Record entry mirrors per B-1a-bis precedent (TypeScript fails compile without)"
    file: "src/lib/activity-log.ts + src/lib/audit/action-labels.ts"
    expected: "src/lib/activity-log.ts ActivityAction union includes 'acknowledged' literal; src/lib/audit/action-labels.ts ACTION_LABELS Record contains 'acknowledged: \"acknowledged\"' entry; npx tsc --noEmit passes"
  - id: M-04
    statement: "Acknowledge route uses B-2a helpers exclusively (no direct service-role client in src/app/api/owner-portal/acknowledge-pay-app/ OR src/app/owner/**; admin path src/app/api/owner-portal/admin/** keeps service-role per B-2a design)"
    query: "grep -rn 'createServiceRoleClient\\|createServerSupabaseClient\\|tryCreateServiceRoleClient' src/app/owner/ src/app/api/owner-portal/acknowledge-pay-app/ 2>/dev/null"
    expected: "0 hits (multi-tenant MINOR-NOTE grep gate from B-2a iter-1 carried forward; B-2b plan-review iter-1 MANDATORY check per B-2a §13 hand-off N-5)"

dom:
  - id: D-01
    statement: "Route `/owner/{token}` renders OwnerDashboardView component on valid (non-revoked, non-expired, non-NULL-client_id) token; data-prototype anchor applied via <main> wrapper in page.tsx (BLK-3 fix: tenant-blind primitives at src/components/prototypes/OwnerDashboardView.tsx remain UNTOUCHED per Latitude #1 (a))"
    selector: "main[data-prototype='owner-dashboard'], main[data-prototype='owner-dashboard'] h1"
    expected: "page returns HTTP 200; <main data-prototype='owner-dashboard'> wrapper present at page-route level; OwnerDashboardView rendered inside; main heading (job name) visible"
  - id: D-02
    statement: "Route `/owner/{token}/pay-apps/{id}` renders OwnerDrawView component on valid token + draw belonging to token's client+org scope (per assertDrawBelongsToToken from B-2a); data-prototype anchor applied via <main> wrapper in page.tsx (BLK-3 fix)"
    selector: "main[data-prototype='owner-draw'], main[data-prototype='owner-draw'] h1"
    expected: "page returns HTTP 200 for valid (token, drawId) pair; <main data-prototype='owner-draw'> wrapper present at page-route level; OwnerDrawView rendered inside; draw-number heading visible"
  - id: D-03
    statement: "Error boundary at `src/app/owner/error.tsx` catches token-not-found / revoked / expired and renders 'link no longer valid' UX (D-04; Next.js error.tsx convention)"
    selector: "main [data-error='owner-portal-invalid-token'], main:contains('link no longer valid')"
    expected: "for invalid/revoked/expired token URL: page renders error boundary UX (NOT 500 stack trace); NO data leakage in error message"
  - id: D-04
    statement: "Acknowledge CTA button present on /owner/{token}/pay-apps/{id} for non-acknowledged draws; touch target ≥56px (high-stakes per SYSTEM.md) OR ≥44px with WCAG-minimum acknowledgment per D-27"
    selector: "[data-testid='acknowledge-pay-app-button']"
    expected: "button present + clickable for non-acknowledged draws; CSS height (or min-height) ≥44px (≥56px preferred per D-26 Option a; D-27 plan-author choice documented)"

visual:
  - id: V-01
    statement: "Mobile viewport rendering verified at iPhone 13 Pro Max (430×932), iPhone 14/15 Pro Max (430×932), Pixel 7 (412×915) per F1+-4 multi-viewport contract (D-12)"
    setup: "Playwright multi-viewport harness — render /owner/{harness-fixture-token} at each viewport; capture screenshots"
    expected: "no horizontal scroll; top bar with Ross Built logo top-left + job name; main content fits viewport; safe-area handling on bottom; readable type (≥14px body); content reflows correctly (no overlap)"
  - id: V-02
    statement: "Design token compliance verified across NEW B-2b files (post-edit hook regex set passes; no hardcoded hex outside globals.css/tailwind.config; no legacy bg-cream/teal/brass/brand/status/nightwork namespaces; no rounded-full on rectangular elements; no text-white/black on Slate surfaces)"
    query: "post-edit hook fires on every Write/Edit during execute; final mechanical sweep at QA via grep -rn '#[0-9a-fA-F]{6}\\b\\|bg-(cream|teal|brass|brand|status|nightwork)-\\|rounded-(lg|xl|2xl|3xl|full)\\|\\b(bg|text)-(white|black)\\b' src/app/owner/ src/app/api/owner-portal/acknowledge-pay-app/ src/components/client-combobox.tsx 2>/dev/null | grep -v node_modules"
    expected: "0 hits across all 10 hook regex categories (HEX, NAMED, PURE, LEGACY, ORG_ID, CB4, CB2, ROUNDED, SHADOW, PURPLE) on B-2b-touched files"
  - id: V-03
    statement: "Touch targets verified at runtime: acknowledge CTA ≥44px height per SYSTEM.md WCAG-minimum (≥56px preferred per D-26 Option a); breadcrumb links + nav links ≥44px"
    selector: "[data-testid='acknowledge-pay-app-button'], a[href^='/owner']"
    expected: "computedStyle.height (or min-height) ≥44px for all touch-target candidates measured via Playwright"

behavioral:
  - id: B-01
    statement: "End-to-end portal load: render /owner/{harness-fixture-token} on Vercel preview → page loads with seeded smoke-fixture data (job name, contract amount, draws, COs) sourced via getScopedOwnerPortalClient from B-2a; NO direct service-role client invocation in src/app/owner/**"
    setup: "Harness fixture token via HARNESS_FIXTURE_OWNER_TOKEN env (BLK-2 fix); seeded client_portal_access row in smoke-seed.sql; /owner/{plaintext} rendered against Vercel preview"
    expected: "200 response; <main data-prototype='owner-dashboard'> root visible (BLK-3 wrapper); job name = smoke-fixture job name; balance_to_finish + paidToDate compute correctly from DB rows mapped to CALDWELL shape per Latitude #1 (a)"
  - id: B-02
    statement: "Acknowledge flow end-to-end: POST /api/owner-portal/acknowledge-pay-app with valid token + drawId → 200 → activity_log row written with entity_type='draw', action='acknowledged', actor_token_id=<token.id>, user_id=NULL (append-only per D-16; NO expected_updated_at)"
    setup: "After B-01, POST acknowledge endpoint with body { token: <plaintext from HARNESS_FIXTURE_OWNER_TOKEN>, drawId: <smoke-fixture-draw-id> }; verify response 200 + activity_log row via SQL"
    expected: "Response { acknowledged: true }; SQL query against activity_log shows 1 new row matching criteria; no optimistic-lock-conflict 409 (audit is append-only NOT versioned)"
  - id: B-03
    statement: "TOCTOU close on concurrent double-tap: 2 concurrent POSTs to acknowledge with identical (drawId, token) produce exactly 1 activity_log row (D-19 + D-20 + D-21; B-12 iter-1 SYNTHESIS resolution)"
    setup: "After B-02, fire 2 concurrent POST requests via Playwright OR 2 curl racing against the same (token, drawId) within same window"
    expected: "Both responses 200 (idempotent — INSERT...ON CONFLICT DO NOTHING means second insert succeeds silently); SQL COUNT(*) FROM activity_log WHERE action='acknowledged' AND entity_id=<drawId> AND actor_token_id=<token.id> RETURNS 1 (not 2)"
  - id: B-04
    statement: "Forward-carried AC-B2a-08 runtime revocation: 5-step test per D-28 — (1) create test token; (2) /owner/{token} loads; (3) revoke via admin route; (4) /owner/{token} blocks; (5) cleanup. LOAD-BEARING GATE CONDITION per nwrp209 §3."
    setup: "On Vercel preview: create token via create_client_portal_invite RPC OR re-use harness-fixture seeded token; render /owner/{plaintext} (expect 200 + dashboard); POST /api/owner-portal/admin/revoke-token with token_id + expected_updated_at as authed admin; re-render /owner/{plaintext}"
    expected: "Step 2: 200 + <main data-prototype='owner-dashboard'> rendered. Step 4: page renders error boundary (D-04 'link no longer valid' UX) — NOT a 200 with data, NOT a 500 stack trace. **If runtime revocation fails at Step 4: HALT before B-2b ships per nwrp209 §3 forward-carried condition.**"

semantic:
  - id: S-01
    statement: "All B-2b data fetches route through getScopedOwnerPortalClient(resolvedToken) from B-2a (D-06); acknowledge route uses assertDrawBelongsToToken before writing audit row (D-17); pre-flight grep mechanical gate per N-5 iter-1 SYNTHESIS (B-2a §13 hand-off requirement)"
    file: "src/app/owner/**, src/app/api/owner-portal/acknowledge-pay-app/route.ts"
    expected: "(a) grep 'getScopedOwnerPortalClient' in src/app/owner/** + src/app/api/owner-portal/acknowledge-pay-app/ — at least 2 hits (page.tsx + acknowledge route); (b) grep 'assertDrawBelongsToToken' in src/app/api/owner-portal/acknowledge-pay-app/route.ts — at least 1 hit (acknowledge route before audit write); (c) grep 'createServiceRoleClient\\|createServerSupabaseClient\\|tryCreateServiceRoleClient' in src/app/owner/** + src/app/api/owner-portal/acknowledge-pay-app/ — ZERO hits (multi-tenant MINOR-NOTE grep gate carried forward per B-2a §13 N-5)"
  - id: S-02
    statement: "ClientCombobox uses shadow-[var(--shadow-panel)] design token (D-24); --shadow-popover NOT referenced (does not exist; iter-1 SYNTHESIS B-15 correction); inline style={fontFamily, color} replaced with utility classes including font-display where Space Grotesk applies (NOTE-1 fix); inline fontFamily removed"
    file: "src/components/client-combobox.tsx"
    expected: "(a) grep 'shadow-\\[var(--shadow-panel)\\]' in client-combobox.tsx — 1+ hit; (b) grep 'shadow-popover\\|--shadow-popover' — ZERO hits; (c) grep 'style=' in client-combobox.tsx — minimal (label fontFamily replaced with font-mono / font-display utility per tailwind.config.ts mapping; tertiary text color migrated to utility classes mirroring cost-code-combobox.tsx idiom)"
</criteria>

# Plan B-2b — Read-only Owner Portal Path A UI + audit integration

## 1. Goal

Ship the **first user-facing surface in F1**: read-only `/owner/{token}` portal route + standalone mobile-first layout + 1-2 owner-initiated audit-integration actions (pay-app acknowledgment via `actor_token_id` per B-2a's type contract). B-2b builds on B-2a's verified token-scoping security foundation (composite same-org FK, RPC NULL-leak fix, 1-year + revocation, rate-limit infrastructure, `getScopedOwnerPortalClient` + `assertDrawBelongsToToken` helpers — all SHIPPED per nwrp209 GATE).

The driver per nwrp209 §3 is the **forward-carried AC-B2a-08 runtime revocation test as load-bearing GATE condition.** B-2a deferred the end-to-end revocation flow test to B-2b (status DEFERRED-TO-QA per B-2a-SUMMARY.md AC table) — B-2b ship is GATED on this test passing live on a deployed Vercel preview surface. If revocation doesn't work in practice (despite all B-2a mechanical verifications), the security model is unproven. The test is enumerated as AC-B2b-10 below and tied to the smoke harness.

Specifically:

1. **`/owner/{token}` route + standalone layout** (D-01..D-04) — entry point. Server-side renders `OwnerDashboardView` against `getScopedOwnerPortalClient` query results. Standalone (NO auth nav-bar; homeowner is anon). Logo top-left per CLAUDE.md UI rules. Error boundary handles token-not-found / revoked / expired with "link no longer valid" UX. **(D-01 + D-03 + D-04 explicitly cited)**
2. **`/owner/{token}/pay-apps/{id}` route** (D-02) — drilldown. Renders `OwnerDrawView`. Cross-validates draw belongs to token's client+org via `assertDrawBelongsToToken` from B-2a; mismatched draw_id falls through to error boundary.
3. **Acknowledge pay-app API route** (D-15..D-21) — `POST /api/owner-portal/acknowledge-pay-app`. PUBLIC_PATHS extended in B-2a for `/api/owner-portal/acknowledge`; **B-2b adds `/api/owner-portal/acknowledge-pay-app` to PUBLIC_PATHS explicitly (per BLK-1 fix; the existing entry's `startsWith('${p}/')` matcher does NOT cover the hyphenated route)**. Steps: resolve token → rate-limit per-token + per-IP via `recordOwnerPortalRequest` → `assertDrawBelongsToToken` scope check → `INSERT INTO activity_log ... ON CONFLICT (entity_id, actor_token_id, action) WHERE action='acknowledged' DO NOTHING` (append-only per D-16; TOCTOU close per D-19/D-20).
4. **Migration 00106 — TOCTOU dedupe unique index** (D-19) — partial unique index `(entity_id, actor_token_id, action) WHERE action='acknowledged' AND actor_token_id IS NOT NULL`. Closes iter-1 SYNTHESIS B-12 (concurrent double-tap producing duplicate audit rows). Resolves the race at DB level so the application-layer INSERT can rely on `ON CONFLICT DO NOTHING` semantics.
5. **Soft-delete + status filters on portal queries** (D-22) — every B-2b query on `draws` includes `.is('deleted_at', null)` + `.in('status', ['submitted', 'approved', 'paid', 'void'])` (homeowner sees submitted/approved/paid/void only — NOT `draft` or `pm_review`). Per iter-1 SYNTHESIS B-14.
6. **ClientCombobox TD-B1abis-03 polish** (D-23..D-25) — inline `boxShadow` + inline `style={fontFamily, color}` → `shadow-[var(--shadow-panel)]` token + utility classes (`text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-tertiary)]` migrated from inline style). Per iter-1 SYNTHESIS B-15 (`--shadow-popover` does NOT exist; closest existing token is `--shadow-panel` defined at `colors_and_type.css:61`). **NOTE-1 fix**: same posture also applied to layout.tsx + error.tsx — replace `style={{ fontFamily: 'var(--font-space-grotesk)' }}` with `font-display` utility class per tailwind.config.ts:64 mapping.
7. **NwButton TD-20 exemption decision** (D-26 + D-27) — acknowledge CTA is high-stakes (homeowner explicitly acknowledging a pay-app); SYSTEM.md prefers 56px touch target. NwButton lg=44px. Plan-author chooses (a) TD-20 boundary exemption raw `<button>` with comment citing 56px requirement (mirroring `OwnerDrawView.tsx:158-162` precedent) OR (b) NwButton lg=44px with named WCAG-minimum acknowledgment in implementation comment. Iter-1 design-pushback confirms.
8. **ActivityAction union extended + Record mirrored** — `'acknowledged'` member added to `ActivityAction` union at `src/lib/activity-log.ts:51-73`; `ACTION_LABELS` Record mirrored at `src/lib/audit/action-labels.ts:62-83` per B-1a-bis precedent (TypeScript Record exhaustiveness fails compile without). `'draw'` entity_type is already in `ActivityEntityType` union per B-1a-bis Slice-1 deliverables — no new entity type needed.
9. **Smoke harness route table extension** — `scripts/wave-d-smoke.ts` adds `/owner/{HARNESS_FIXTURE_OWNER_TOKEN}` + `/owner/{HARNESS_FIXTURE_OWNER_TOKEN}/pay-apps/{HARNESS_FIXTURE_DRAW_ID}` entries per CLAUDE.md Workflow Rule 4 (smoke gate maintenance for UI-touching plans). **BLK-2 fix**: token plaintext shipped via `HARNESS_FIXTURE_OWNER_TOKEN` env var; deterministic seeded fixture row in smoke-seed.sql; HARNESS_FIXTURE_DRAW_ID references an existing seeded draw entity (re-use existing pattern from smoke-seed.sql).

## 2. Out of scope (explicit)

### Out of scope for B-2b (deferred or RESOLVED)

- **B-2a security model SHIPPED** (per nwrp209 GATE 2026-05-22): composite same-org FK, RPC NULL-leak fix, 1-year token lifecycle + MANDATORY revocation, DB-backed rate-limit infrastructure, `getScopedOwnerPortalClient` + `assertDrawBelongsToToken` helpers, non-partial token-hash index, `actor_token_id` activity_log column + TS interface, middleware PUBLIC_PATHS extension. **All consumed by B-2b; not re-derived.**
- **New PATTERNS.md "Owner Status View" entry** — iter-1 SYNTHESIS B-17 RESOLVED. Existing §4h.3 (Owner Portal Dashboard, Dashboard pattern) + §2h.3 (Owner Draw Review, Document Review extension) cover. Cited in §3 below; not duplicated.
- **Full Owner Portal feature set** (notifications, comments, signature workflows, ongoing engagement) → Wave 1.1-Lite. B-2b is minimum-viable read-only.
- **Token lifecycle alternatives** (one-shot per pay-app, auto-rotate every N days) → Wave 1.1-Lite revisit conditions per EXPANDED-SCOPE §6 Q5.
- **Owner Portal email notifications** ("your pay-app is ready") → Wave 1.1-Lite.
- **RLS posture verification** — B-2a proved BY CONSTRUCTION at composite FK + helper layers; B-2b consumes without touching RLS surface. rls-auditor at QA confirms no regression.
- **`updateWithLock` on audit_log writes** — RESOLVED per iter-1 SYNTHESIS B-13 (audit_log is append-only, NOT versioned; no optimistic-lock). Per D-16.
- **`--shadow-popover` token** — RESOLVED per iter-1 SYNTHESIS B-15 (token does NOT exist in design system; use `--shadow-panel` at `colors_and_type.css:61`). Per D-24.

### Plan-author latitudes (surface at iter-1; NOT pre-decided per CONTEXT D-04..D-34 framing)

**Latitude #1 — `OwnerDashboardView` + `OwnerDrawView` prop interface match (D-11).** Existing components accept `CaldwellJob` / `CaldwellDraw` / `CaldwellChangeOrder` / `CaldwellInvoice` / `CaldwellVendor` / `CaldwellCostCode` / `CaldwellDrawLineItem` types from `@/app/design-system/_fixtures/drummond/types`. B-2b queries return DB-shape rows. Plan-author chooses:
- **(a) shape DB results to match Caldwell* types at query-result time** (cast / map; minimal component refactor); preserves tenant-blind component contract; ~30 lines of mapping code per route
- **(b) refactor components to accept DB-shape types** (wider blast radius; touches 1.5c thin wrappers + design-system playground); pushes back component contract per nwrp200's tenant-blind constraint
- **Plan-author recommendation: (a)** — preserves the tenant-blind contract per Stage 1.5c §SYSTEM and avoids touching the 1.5c thin wrappers (D-33). Implementation at execute time; iter-1 design-pushback + ui-reviewer confirm.
- **BLK-3 coherence note**: data-prototype attribute applied via `<main data-prototype="owner-dashboard">...</main>` wrapper in the page.tsx files (NEW B-2b files), NOT in the tenant-blind OwnerDashboardView/OwnerDrawView components. Those primitives remain untouched per Latitude #1 (a).

**Latitude #2 — `src/app/owner/layout.tsx` structure.** Plan-author proposes minimal top bar (Ross Built logo top-left + job name center) + main content + bottom safe-area handling for iPhone notch/home-bar. Defer fancier surface (PM contact info, app-icon, branding) to Wave 1.1-Lite. Iter-1 design-pushback confirms shape.

**Latitude #3 — Document download UX (footnote on D-22 + EXPANDED-SCOPE §11 line 408).** "Owner Portal Path A document downloads work: homeowner downloads at least one Drummond fixture document." Plan-author proposes a link list (one `<a>` per doc) in the OwnerDrawView right-rail (mirroring InvoiceReviewView's attachments list per PATTERNS.md §2h.3 Document Review extension). Alternative: accordion or cards. Iter-1 ui-reviewer + design-pushback confirms; if doc downloads are out-of-scope-for-B-2b (because Caldwell fixtures lack signed-URL data), explicitly defer to Wave 1.1-Lite OR scope-in via fixture-level mocked URLs — plan-author surfaces.

**Latitude #4 — D-27 NwButton TD-20 vs lg=44px choice.** Per D-26: (a) raw `<button>` with TD-20 exemption comment + 56px height (mirroring `OwnerDrawView.tsx:158-162` precedent), OR (b) NwButton lg=44px with named WCAG-minimum acknowledgment. **Plan-author recommendation: (a)** — mirrors the precedent in the same component being consumed; acknowledge is a high-stakes action (homeowner irreversible attestation); 56px is a measurable upgrade over 44px in the touch-target standards. Iter-1 design-pushback confirms.

**Latitude #5 — AC-B2a-08 runtime revocation test mechanism (D-28 + nwrp209 §3).** Plan-author chooses:
- **(a) Playwright headless** — fully automated; integrated with existing smoke harness route table; reproducible in CI
- **(b) Manual harness via curl + dev server** — Jake walks through 5 steps interactively at QA
- **Plan-author recommendation: (a) Playwright headless** — runtime revocation is a CI-trackable contract; manual harness re-burns Jake-time on every B-2b ship-candidate; smoke harness already exists. Iter-1 security-reviewer confirms.

**Latitude #6 — TOCTOU test pattern (D-21).** Plan-author chooses:
- **(a) Playwright concurrent-double-tap** — fire 2 concurrent POSTs via Page.evaluate; assert exactly 1 audit row
- **(b) Manual via 2 curl racing** — `curl ... & curl ... & wait` from bash; SQL count check
- **Plan-author recommendation: (a) Playwright** — already-in-harness; reproducible; same posture as Latitude #5. Iter-1 ai-logic-tester confirms.

**Latitude #7 — Cleanup posture for 1.5c thin wrappers at `src/app/owner-portal/*` (D-33).** Plan-author chooses:
- **(a) Leave as design-system playground** — wrapper preserved; tagged as such in a top-of-file comment; not linked from production navigation
- **(b) Mark deprecated with redirect** — `src/app/owner-portal/page.tsx` returns `redirect('/design-system/prototypes/owner-portal')` or similar; production homeowner surface is `/owner/{token}` only
- **Plan-author recommendation: (a)** — wrapper is harmless (fixture-backed; not auth-redirected; not linked from anywhere); deprecation adds blast radius. Iter-1 custodian confirms.

### Claude's Discretion

None for B-2b core scope. Latitudes #1-#7 above explicitly bounded; all substantive scope locked at D-01..D-34 in B-2b-CONTEXT.md.

### Folded Todos

None — no pending todos matched B-2b scope.

## 3. Why now / dependencies

- **Sequencing rationale (per EXPANDED-SCOPE §8 + nwrp200 + nwrp209):** B-2a SHIPPED 2026-05-22 (GATE SIGNED per nwrp209 §1). B-2b's read-only UI depends on B-2a's verified token-scoping helpers + admin revocation API + middleware extension + rate-limit infrastructure. B-2b ship unlocks B-3 dispatch (subject to nwrp209 §7 deferred pace-vs-ceiling conversation; per-plan halt gate Rule 7d applies).
- **Forward-carried AC-B2a-08 runtime revocation** (per nwrp209 §3): B-2a deferred this AC to QA (status DEFERRED-TO-QA per B-2a-SUMMARY.md). The test is the load-bearing condition for B-2b ship. If it fails: HALT before ship per nwrp209 §3.
- **Hook calibration phase** (stage-f1-hook-doc-only-detect shipped 2026-05-20 per commit `c20e5d9`): B-2b is mixed-diff (migration + .ts + .tsx + .sql); fail-closed posture applies normally. Doc-only-skip carve-out is NOT applicable.
- **PATTERNS.md alignment** (B-17 RESOLVED): §4h.3 (Owner Portal Dashboard, Dashboard pattern) + §2h.3 (Owner Draw Review, Document Review extension) cover B-2b's surfaces without new pattern entry. Plan body §6 cites both.
- **Slice-2 cost ledger** (per nwrp209 §17): B-2a actual ~$28-37 vs §10 estimate $31-49 (under-budget). B-2b §10 estimate $17-25 (revised per WARN-3 to add Playwright probe realism); combined Slice-2 spend $45-62 of $200 ceiling. Per-plan halt gate Rule 7d: $50 max per plan; B-2b well under.

## 4. Resolution map — iter-1 SYNTHESIS B-12..B-16 → B-2b

Per CLAUDE.md Workflow Rule 9 (cross-reviewer factual disagreement HALT) + the iter-1 SYNTHESIS B-12..B-17 findings, this PLAN explicitly maps each B-2b-relevant finding to a B-2b task. B-17 RESOLVED (no new PATTERNS entry); B-1..B-11 are B-2a scope (SHIPPED).

| Finding ID | Reviewer (iter-1 B-2 plan-review) | Description | B-2b Resolution | CONTEXT.md D-NN |
|---|---|---|---|---|
| **B-12** | ai-logic + database | TOCTOU race on acknowledge: concurrent double-tap → duplicate audit rows | Migration 00106 partial unique index `(entity_id, actor_token_id, action) WHERE action='acknowledged' AND actor_token_id IS NOT NULL` + `INSERT ... ON CONFLICT DO NOTHING` in acknowledge route | D-19 + D-20 + D-21 |
| **B-13** | spec-checker + database + custodian | `expected_updated_at` on audit-log writes violates append-only audit semantic | NO `updateWithLock` / `expected_updated_at` on activity_log; direct INSERT with ON CONFLICT for dedupe | D-16 |
| **B-14** | spec-checker + multi-tenant | Missing `.is('deleted_at', null)` + status filter on draws queries → homeowner sees `draft` + `pm_review` drafts | Every B-2b query on draws includes `.is('deleted_at', null)` + `.in('status', ['submitted', 'approved', 'paid', 'void'])`; on jobs (parent) `.is('deleted_at', null)` where applicable | D-22 |
| **B-15** | design-pushback + ui-reviewer | ClientCombobox cites `--shadow-popover` non-existent token | Replace with `shadow-[var(--shadow-panel)]` (closest existing per `colors_and_type.css:61`); replace inline `style={fontFamily, color}` with utility classes mirroring `cost-code-combobox.tsx` idiom | D-23 + D-24 + D-25 |
| **B-16** | design-pushback | NwButton lacks 56px size variant for high-stakes acknowledge CTA | Either (a) TD-20 boundary exemption raw `<button>` with comment citing 56px (mirroring OwnerDrawView.tsx:158-162) OR (b) NwButton lg=44px with WCAG-minimum acknowledgment; plan-author latitude #4; iter-1 design-pushback confirms | D-26 + D-27 |
| **B-17** | architect | (Proposed) New PATTERNS.md "Owner Status View" entry | RESOLVED — §4h.3 + §2h.3 already cover; do NOT invent 13th pattern; cite both in §6 below | (no D-NN; cited by exclusion) |

**B-1..B-11 RESOLVED in B-2a** (SHIPPED per nwrp209). **B-2b consumes**: composite same-org FK (B-2), RPC NULL-leak fix (B-4), 1-year + MANDATORY revocation (Q5), middleware PUBLIC_PATHS extension (B-5), DB-backed rate-limit (B-6), non-partial token-hash index (BLK-3), `getScopedOwnerPortalClient` + `assertDrawBelongsToToken` helpers (B-1 + B-3), full covering index (B-7), `draws.job_id` unfiltered single-column index (B-11).

## 5. Pre-flight downstream-consumer-sweep

Per CLAUDE.md Workflow posture Rule 6 + `.planning/lessons.md` 2026-05-15 entry: all plans MUST include downstream sweep before execute dispatch. Six sub-checks per Rule 6(a)-(d) + Rule 5 + Rule 6(c):

### Sweep 1 — `getScopedOwnerPortalClient` + `assertDrawBelongsToToken` + `recordOwnerPortalRequest` consumers (D-06 grep gate)

```bash
# Existing helpers from B-2a; B-2b consumers must route through them.
grep -rn "getScopedOwnerPortalClient\|assertDrawBelongsToToken\|recordOwnerPortalRequest" \
  src/ scripts/ 2>/dev/null | grep -v ".planning/"
```

**Mechanical findings (executed at plan-author time, 2026-05-22):**

- **`src/lib/owner-portal/token.ts`** — B-2a deliverable; declares + exports the helpers. Untouched by B-2b.
- **`src/lib/owner-portal/rate-limit.ts`** — B-2a; declares + exports `recordOwnerPortalRequest`. Untouched.
- **`src/app/api/owner-portal/admin/revoke-token/route.ts`** — B-2a; consumes `recordOwnerPortalRequest('ip', ...)` only (admin path uses authenticated session). Untouched by B-2b.
- **B-2b additions:** `src/app/owner/[token]/page.tsx`, `src/app/owner/[token]/pay-apps/[id]/page.tsx`, `src/app/api/owner-portal/acknowledge-pay-app/route.ts` — all NEW. Each MUST grep-positive for `getScopedOwnerPortalClient`; acknowledge route MUST grep-positive for `assertDrawBelongsToToken` before the audit INSERT; both data routes MUST grep-positive for `recordOwnerPortalRequest`.
- **N-5 anti-pattern grep gate** (per B-2a §13 hand-off + multi-tenant MINOR-NOTE): `grep -rn 'createServiceRoleClient\|createServerSupabaseClient\|tryCreateServiceRoleClient' src/app/owner/ src/app/api/owner-portal/acknowledge-pay-app/` must return **ZERO hits**. Plan-review iter-1 mechanical gate per N-5 iter-1 SYNTHESIS.

### Sweep 2 — `activity_log` consumers + 'acknowledged' action union (D-16 type contract)

```bash
grep -rn "ActivityAction\|'acknowledged'\|action: \"acknowledged\"\|action='acknowledged'" \
  src/ scripts/ supabase/migrations/ 2>/dev/null | grep -v ".planning/" | grep -v "database.types.ts"
```

**Mechanical findings:**

- **`src/lib/activity-log.ts:51-73`** — `ActivityAction` union; B-2b extends with `| "acknowledged"` (1 line; same shape as B-1a-bis's `client` extension + B-2a's `revoked` extension).
- **`src/lib/audit/action-labels.ts:62-83`** — `ACTION_LABELS` Record; B-2b adds `acknowledged: "acknowledged"` entry per B-1a-bis precedent (line 17 explicit comment). TypeScript Record<ActivityAction, string> exhaustiveness fails compile without (B-1a-bis nwrp158 iter-3 diagnostic).
- **`src/components/audit/`** — audit timeline UI; renders existing rows; B-2b does NOT touch the timeline component. The new `'acknowledged'` action will surface as "Pay App acknowledged" per `entityLabel + actionLabel` composition.
- **`'draw'` entity_type** — already in `ActivityEntityType` union at `src/lib/activity-log.ts:46`; already has `ENTITY_LABELS['draw'] = 'Pay App'` per `src/lib/audit/action-labels.ts:44`. NO additions needed.

### Sweep 3 — Existing prototype components prop interface match (D-09..D-11 latitude #1)

```bash
grep -n "interface OwnerDashboardViewProps\|interface OwnerDrawViewProps\|CaldwellJob\|CaldwellDraw" \
  src/components/prototypes/OwnerDashboardView.tsx src/components/prototypes/OwnerDrawView.tsx 2>/dev/null
```

**Mechanical findings:**

- `OwnerDashboardView` accepts `{ job: CaldwellJob, draws: CaldwellDraw[], changeOrders: CaldwellChangeOrder[], drawReviewHref?: (drawId: string) => string }`.
- `OwnerDrawView` accepts `{ draw: CaldwellDraw, job: { id, name } | null, lineItems: CaldwellDrawLineItem[], invoices: CaldwellInvoice[], vendors: CaldwellVendor[], costCodes: CaldwellCostCode[], breadcrumbRoot?: { href, label } }`.
- **B-2b approach (Latitude #1 recommendation a):** at execute time, B-2b route handlers fetch DB rows via `getScopedOwnerPortalClient` and shape them to `Caldwell*` types via lightweight mapping (e.g., `mapDbJobToCaldwell(dbJob): CaldwellJob`). Tenant-blind contract preserved. ~30 lines per route. **BLK-3 coherence**: data-prototype anchor lives on a `<main>` wrapper in the page.tsx (NOT inside the tenant-blind primitive).
- **Alternative (Latitude #1 recommendation b):** refactor components to accept DB types. Touches 1.5c thin wrappers + design-system playground. Plan-author rejects per (a) reasoning above.

### Sweep 4 — Activity_log dedupe index reachability (D-19 + D-20)

```bash
# B-2b's 00106 partial unique index on activity_log requires existing actor_token_id column (B-2a added at 00104).
mcp__supabase__execute_sql:
  SELECT column_name FROM information_schema.columns
   WHERE table_name = 'activity_log' AND column_name = 'actor_token_id';
```

**Expected findings:**

- 1 row: `actor_token_id` column present. (Added in 00104 §4 per B-2a-PLAN.md §5 Task 9.)
- The dedupe index references `(entity_id, actor_token_id, action) WHERE action='acknowledged' AND actor_token_id IS NOT NULL`. The partial predicate scopes the constraint to owner-portal-initiated acknowledgments — does NOT block legacy or future user-action `entity_id` collisions on other action types. By design.
- Idempotency: re-running 00106 forward against an existing index is blocked via `IF NOT EXISTS` on the `CREATE UNIQUE INDEX`. Down migration drops the index unconditionally.

### Sweep 5 — Middleware PUBLIC_PATHS extends with new entry per acknowledge-pay-app route (BLK-1 fix)

```bash
grep -n "PUBLIC_PATHS\|/owner\|/api/owner-portal" src/middleware.ts 2>/dev/null
```

**Mechanical findings (verified 2026-05-22):**

- `src/middleware.ts:16-40` — PUBLIC_PATHS contains `"/owner"` (covers `/owner/{token}` via existing `startsWith(`${p}/`)` matcher at line 33) + `"/api/owner-portal/acknowledge"` (covers `/api/owner-portal/acknowledge` exactly OR `/api/owner-portal/acknowledge/...` via startsWith) + `"/api/owner-portal/admin"` (admin route; B-2a).
- **BLK-1 fix verdict (revised post plan-checker iter-1):** The matcher at `src/middleware.ts:65-66` is `pathname === p || pathname.startsWith(\`${p}/\`)`. The existing PUBLIC_PATHS entry `/api/owner-portal/acknowledge` requires `pathname === '/api/owner-portal/acknowledge'` OR `pathname.startsWith('/api/owner-portal/acknowledge/')`. The path `/api/owner-portal/acknowledge-pay-app` matches NEITHER (hyphen, not slash, follows the base). **B-2b MUST add `/api/owner-portal/acknowledge-pay-app` to PUBLIC_PATHS explicitly.** This is deterministic at plan-author time; the previous "verify at execute time" hedge is REMOVED per plan-checker BLK-1 option (b).

**Required PUBLIC_PATHS extension (added in Task 5):**

```typescript
// src/middleware.ts — insert below existing /api/owner-portal/acknowledge entry (after line 32)

  // F1-Wave-B Slice-2 B-2b per BLK-1 (plan-checker iter-1 fix): anon homeowner
  // pay-app acknowledge endpoint (B-2b). The existing /api/owner-portal/acknowledge
  // entry above does NOT cover this route because the matcher at line 65-66
  // requires `pathname === p` OR `pathname.startsWith(`${p}/`)` — both fail
  // when the suffix is `-pay-app` (hyphen, not slash). Explicit entry required.
  // Reaches route handler as anon; route handler does token resolution +
  // `assertDrawBelongsToToken` from src/lib/owner-portal/token.ts.
  '/api/owner-portal/acknowledge-pay-app',  // anon homeowner pay-app acknowledge (B-2b; reaches handler)
```

### Sweep 6 — Hook regex precursor sweep (Rule 6a)

```bash
# B-2b NEW files (planned):
#   src/app/owner/layout.tsx
#   src/app/owner/error.tsx
#   src/app/owner/[token]/page.tsx
#   src/app/owner/[token]/pay-apps/[id]/page.tsx
#   src/app/api/owner-portal/acknowledge-pay-app/route.ts
# B-2b MODIFIED files:
#   src/components/client-combobox.tsx (TD-B1abis-03 + NOTE-1)
#   src/lib/activity-log.ts (action union)
#   src/lib/audit/action-labels.ts (Record mirror)
#   src/middleware.ts (BLK-1 — PUBLIC_PATHS extension)
#   scripts/fixtures/smoke-seed.sql (BLK-2 — client_portal_access fixture row)
#   scripts/wave-d-smoke.ts (route table extension)
#
# Plan-author commits to NO design-token drift in NEW files:
#   - bracket-value utilities with CSS vars (`bg-[var(--bg-card)]`, etc.)
#   - `text-[color:var(--text-primary)]` / `text-nw-slate-tile` namespace
#   - `p-[var(--space-3)]` / `rounded-[var(--radius-card)]`
#   - 0 hardcoded hex; 0 legacy namespaces; 0 rounded-full on rectangular
#   - NOTE-1: inline `style={{ fontFamily: 'var(--font-space-grotesk)' }}` replaced
#     with `font-display` utility class (maps to Space Grotesk per tailwind.config.ts:64)
# ClientCombobox modification removes inline boxShadow + inline style (D-23..D-25).
```

**Pre-flight verdict:** PASS expected. Mechanical sweep at QA per V-02 verification criterion above (0 hits across all 10 hook regex categories on B-2b-touched files).

### Sweep 7 — `files_modified` intersection check (Rule 5)

B-2b is the SECOND plan in Slice-2 post-re-split; sequential after B-2a per nwrp200 charter. `parallel_execute_ok: false` in frontmatter.

```bash
# Intersection check against B-2a (SHIPPED; files_modified per B-2a-PLAN.md frontmatter lines 34-53):
#   B-2a: 00104.sql, 00104.down.sql, database.types.ts, token.ts, rate-limit.ts, revoke-token/route.ts,
#         owner-portal-tokens/page.tsx, owner-portal-tokens/_components/RevokeTokenRow.tsx, middleware.ts,
#         activity-log.ts, action-labels.ts
#   B-2b: 00106.sql, 00106.down.sql, database.types.ts, owner/layout.tsx, owner/error.tsx,
#         owner/[token]/page.tsx, owner/[token]/pay-apps/[id]/page.tsx,
#         acknowledge-pay-app/route.ts, activity-log.ts, action-labels.ts, client-combobox.tsx,
#         middleware.ts (BLK-1), smoke-seed.sql (BLK-2), wave-d-smoke.ts
#
# Intersection: src/lib/types/database.types.ts (both regen — sequential per B-2a SHIPPED status),
#               src/lib/activity-log.ts (both extend; sequential),
#               src/lib/audit/action-labels.ts (both mirror Records; sequential),
#               src/middleware.ts (both extend PUBLIC_PATHS; sequential)
```

**Verdict:** intersection non-empty BUT B-2a is SHIPPED. Sequential dispatch satisfies Rule 5. B-2b reads B-2a's deliverables from disk; no parallel-time conflict.

### Sweep 8 — gitignore + path reachability (Rule 6c)

```bash
# Every path declared in files_modified must be tracked by git from a fresh checkout
for f in \
  src/app/owner/layout.tsx \
  src/app/owner/error.tsx \
  src/app/owner/[token]/page.tsx \
  src/app/owner/[token]/pay-apps/[id]/page.tsx \
  src/app/api/owner-portal/acknowledge-pay-app/route.ts \
  supabase/migrations/00106_b2b_activity_log_ack_dedupe.sql \
  supabase/migrations/00106_b2b_activity_log_ack_dedupe.down.sql \
  src/lib/types/database.types.ts \
  src/lib/activity-log.ts \
  src/lib/audit/action-labels.ts \
  src/components/client-combobox.tsx \
  src/middleware.ts \
  scripts/fixtures/smoke-seed.sql \
  scripts/wave-d-smoke.ts; do
  git check-ignore "$f" 2>&1
done
```

**Expected:** zero output (no path is gitignored). All parent directories (`src/app/`, `src/lib/`, `src/components/`, `supabase/migrations/`, `scripts/`, `scripts/fixtures/`) are tracked. New nested directories (`src/app/owner/`, `src/app/owner/[token]/pay-apps/`, `src/app/api/owner-portal/acknowledge-pay-app/`) are NEW; their parents are tracked so the new files are eligible.

## 6. Structural approach

### 6.a Route + layout structure (D-01..D-04 + Latitude #2 + BLK-3 wrapper)

**Decision: minimal standalone layout. No auth nav-bar. Top bar with Ross Built logo top-left + job name. Main content. Bottom safe-area handling. (D-01 + D-03)**

**BLK-3 fix — `data-prototype` anchor wrapper posture**: each page.tsx wraps its tenant-blind primitive render in a `<main data-prototype="...">...</main>` element. The wrapper lives in the NEW B-2b page.tsx files; the tenant-blind `OwnerDashboardView` / `OwnerDrawView` primitives at `src/components/prototypes/` remain UNTOUCHED per Latitude #1 (a). This resolves the plan-checker iter-1 BLK-3 incoherence between Latitude #1 (a) tenant-blind preservation and the smoke-harness selector `main [data-prototype='owner-dashboard']`.

#### `src/app/owner/layout.tsx`

Standalone layout per D-03. NOT auth-redirect-protected (PUBLIC_PATHS in B-2a). Renders ONLY a top bar + `{children}`. Logo top-left per CLAUDE.md UI rule ("Ross Built logo sits in the top-left of every authenticated surface; collapses to icon-only at <360px viewport per Q13" — collapses applies to anon surfaces too per F1+-4 viewport contract).

**NOTE-1 fix**: inline `style={{ fontFamily: 'var(--font-space-grotesk)' }}` replaced with `font-display` utility class. Tailwind's `font-display` already maps to Space Grotesk per `tailwind.config.ts:64`. Mirrors Task 6's TD-B1abis-03 polish posture.

```tsx
// src/app/owner/layout.tsx — NEW B-2b standalone layout (D-03)
import "@/app/design-system/design-system.css";  // load design tokens

export const dynamic = "force-dynamic";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  // Minimal top bar; logo collapses to icon-only <360px per F1+-4
  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <header
        className="sticky top-0 z-10 border-b border-[var(--border-default)] bg-[var(--bg-page)] px-[var(--space-4)] py-[var(--space-3)]"
        role="banner"
      >
        <div className="flex items-center gap-[var(--space-3)]">
          {/* Logo top-left per CLAUDE.md UI rules; icon-only <360px */}
          {/* NOTE-1: font-display utility (Space Grotesk per tailwind.config.ts:64); inline fontFamily removed */}
          <span className="font-display text-[16px] tracking-[0.02em] text-[color:var(--text-primary)]">
            Ross Built
          </span>
        </div>
      </header>
      {children}
    </div>
  );
}
```

**Note**: the page.tsx files own their own `<main>` wrapper (per BLK-3) — layout.tsx no longer renders a `<main>` element to avoid nesting `<main>` inside `<main>`. The top-level `<div>` + sticky `<header>` cover layout chrome; routes provide their own semantic root.

#### `src/app/owner/error.tsx`

Next.js error boundary. Renders "link no longer valid" UX without leaking which failure mode triggered (revoked / expired / not-found / NULL client_id — all share the same display per `resolveOwnerToken`'s timing-uniform null contract).

**NOTE-1 fix**: same posture — inline fontFamily on `<h1>` replaced with `font-display` utility.

```tsx
"use client";
// src/app/owner/error.tsx — NEW B-2b error boundary (D-04)
import { useEffect } from "react";

export default function OwnerError({ error }: { error: Error }) {
  useEffect(() => {
    // Optional: Sentry breadcrumb here; do NOT log the token or error.message
    // verbatim (may contain user-supplied data). Just category + timestamp.
  }, [error]);

  return (
    <main
      data-error="owner-portal-invalid-token"
      className="mx-auto max-w-[480px] py-[var(--space-12)] text-center px-[var(--space-4)] pb-[env(safe-area-inset-bottom)]"
    >
      {/* NOTE-1: font-display utility (Space Grotesk per tailwind.config.ts:64); inline fontFamily removed */}
      <h1 className="font-display text-[24px] tracking-[0.02em] text-[color:var(--text-primary)] mb-[var(--space-3)]">
        This link is no longer valid
      </h1>
      <p className="text-[14px] text-[color:var(--text-secondary)] mb-[var(--space-6)]">
        Your project portal link may have expired or been revoked. Please contact
        your project manager for a new link.
      </p>
    </main>
  );
}
```

#### `src/app/owner/[token]/page.tsx` (BLK-3 wrapper applied)

Server component. Resolves token, fetches scoped data, renders `OwnerDashboardView` with mapped fixture-shape props (Latitude #1 recommendation a). Error boundary catches `resolveOwnerToken` failure via `notFound()` or thrown error. **`<main data-prototype="owner-dashboard">` wraps the tenant-blind primitive (BLK-3 fix per plan-checker iter-1; primitive at `src/components/prototypes/OwnerDashboardView.tsx` remains UNTOUCHED).**

```tsx
// src/app/owner/[token]/page.tsx — NEW B-2b entry route (D-01 + D-06..D-11 + D-22)
import { notFound } from "next/navigation";
import {
  resolveOwnerToken,
  getScopedOwnerPortalClient,
} from "@/lib/owner-portal/token";
import { recordOwnerPortalRequest } from "@/lib/owner-portal/rate-limit";
import OwnerDashboardView from "@/components/prototypes/OwnerDashboardView";
import type {
  CaldwellJob,
  CaldwellDraw,
  CaldwellChangeOrder,
} from "@/app/design-system/_fixtures/drummond/types";

export const dynamic = "force-dynamic";

interface DbJobRow {
  id: string;
  name: string;
  address: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  contract_type: "cost_plus" | "fixed";
  original_contract_amount: number;
  current_contract_amount: number;
  pm_id: string;
  status: "active" | "complete" | "warranty" | "cancelled";
  deposit_percentage: number;
  gc_fee_percentage: number;
}

interface DbDrawRow {
  id: string;
  job_id: string;
  draw_number: number;
  application_date: string;
  period_start: string;
  period_end: string;
  status: "draft" | "pm_review" | "approved" | "submitted" | "paid" | "void";
  revision_number: number;
  original_contract_sum: number;
  net_change_orders: number;
  contract_sum_to_date: number;
  total_completed_to_date: number;
  less_previous_payments: number;
  current_payment_due: number;
  balance_to_finish: number;
  deposit_amount: number;
  submitted_at: string | null;
  paid_at: string | null;
}

// Map DB row shape → Caldwell fixture-shape (Latitude #1 recommendation a).
// Tenant-blind contract on OwnerDashboardView preserved.
function mapDbJobToCaldwell(row: DbJobRow): CaldwellJob {
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? "",
    client_name: row.client_name ?? "",
    client_email: row.client_email ?? "",
    client_phone: row.client_phone ?? "",
    contract_type: row.contract_type,
    original_contract_amount: row.original_contract_amount,
    current_contract_amount: row.current_contract_amount,
    pm_id: row.pm_id,
    status: row.status,
    deposit_percentage: row.deposit_percentage,
    gc_fee_percentage: row.gc_fee_percentage,
  };
}

// NOTE-2 fix: explicit field-by-field map (mirroring mapDbJobToCaldwell) to catch
// shape drift at compile time. `satisfies CaldwellDraw` would also work; the
// structural map prevents silent drift if CaldwellDraw grows new fields.
function mapDbDrawToCaldwell(row: DbDrawRow): CaldwellDraw {
  return {
    id: row.id,
    job_id: row.job_id,
    draw_number: row.draw_number,
    application_date: row.application_date,
    period_start: row.period_start,
    period_end: row.period_end,
    status: row.status,
    revision_number: row.revision_number,
    original_contract_sum: row.original_contract_sum,
    net_change_orders: row.net_change_orders,
    contract_sum_to_date: row.contract_sum_to_date,
    total_completed_to_date: row.total_completed_to_date,
    less_previous_payments: row.less_previous_payments,
    current_payment_due: row.current_payment_due,
    balance_to_finish: row.balance_to_finish,
    deposit_amount: row.deposit_amount,
    submitted_at: row.submitted_at,
    paid_at: row.paid_at,
  };
}

// (change_orders mapping similar; omitted for brevity)

export default async function OwnerDashboardPage({
  params,
}: {
  params: { token: string };
}) {
  // Step 1: resolve token (timing-uniform null per B-2a)
  const resolved = await resolveOwnerToken(params.token);
  if (!resolved) {
    // Falls through to error boundary at src/app/owner/error.tsx
    notFound();
  }

  // Step 2: rate-limit per-token (per-IP rate-limit on this read path is N/A;
  // the read path is GET-equivalent and the dominant abuse surface is the
  // POST acknowledge route per B-2a §6.f rate-limit posture).
  // Skip per-token RL on initial dashboard read OR include — plan-author
  // proposes INCLUDE for parity with acknowledge route (defense-in-depth).
  const tokenRl = await recordOwnerPortalRequest("token", resolved.portal_access_id);
  if (!tokenRl.allowed) {
    throw new Error("rate-limit"); // → error boundary
  }

  // Step 3: scoped queries via B-2a helper. Includes soft-delete + status
  // filters per D-22 + iter-1 SYNTHESIS B-14. (D-05 — getScopedOwnerPortalClient
  // injects scope filters at query-builder level; tenant-isolation BY CONSTRUCTION.)
  const scope = getScopedOwnerPortalClient(resolved);

  const { data: jobRow } = await scope.scopedFrom("jobs", "*").maybeSingle();
  if (!jobRow) notFound();

  const { data: drawsRows } = await scope
    .scopedFrom("draws", "*")
    .is("deleted_at", null)
    .in("status", ["submitted", "approved", "paid", "void"]);

  const { data: cosRows } = await scope
    .scopedFrom("change_orders", "*")
    .in("status", ["approved", "executed"]);

  // Step 4: map to Caldwell shape + render
  // BLK-3 fix (plan-checker iter-1): wrap tenant-blind primitive in <main data-prototype="...">
  // so smoke-harness selector `main[data-prototype='owner-dashboard']` resolves WITHOUT modifying
  // the tenant-blind OwnerDashboardView component (preserves Latitude #1 (a) contract).
  return (
    <main
      data-prototype="owner-dashboard"
      className="px-[var(--space-4)] py-[var(--space-4)] pb-[env(safe-area-inset-bottom)]"
    >
      <OwnerDashboardView
        job={mapDbJobToCaldwell(jobRow as DbJobRow)}
        draws={(drawsRows ?? []).map((d) => mapDbDrawToCaldwell(d as DbDrawRow))}
        changeOrders={(cosRows ?? []) as unknown as CaldwellChangeOrder[]}
        drawReviewHref={(drawId) => `/owner/${params.token}/pay-apps/${drawId}`}
      />
    </main>
  );
}
```

#### `src/app/owner/[token]/pay-apps/[id]/page.tsx` (BLK-3 wrapper applied)

Similar shape; resolves token; calls `assertDrawBelongsToToken` to cross-validate draw_id; falls through to error boundary on mismatch. **`<main data-prototype="owner-draw">` wraps the tenant-blind primitive (BLK-3 fix; OwnerDrawView at `src/components/prototypes/OwnerDrawView.tsx` remains UNTOUCHED).**

```tsx
// src/app/owner/[token]/pay-apps/[id]/page.tsx — NEW B-2b drilldown (D-02 + D-17 + D-22)
import { notFound } from "next/navigation";
import {
  resolveOwnerToken,
  getScopedOwnerPortalClient,
  assertDrawBelongsToToken,
} from "@/lib/owner-portal/token";
import { recordOwnerPortalRequest } from "@/lib/owner-portal/rate-limit";
import OwnerDrawView from "@/components/prototypes/OwnerDrawView";

export const dynamic = "force-dynamic";

export default async function OwnerPayAppPage({
  params,
}: {
  params: { token: string; id: string };
}) {
  // Step 1: token resolution
  const resolved = await resolveOwnerToken(params.token);
  if (!resolved) notFound();

  // Step 2: rate-limit per-token
  const rl = await recordOwnerPortalRequest("token", resolved.portal_access_id);
  if (!rl.allowed) throw new Error("rate-limit");

  // Step 3: cross-validate draw_id belongs to token (closes B-3 intra-org
  // cross-client probe per B-2a §6.e assertDrawBelongsToToken pinned SQL)
  // (D-07 — assertDrawBelongsToToken is the canonical scope-assertion helper
  // for cross-client probe defense; called BEFORE the audit write)
  const ok = await assertDrawBelongsToToken(params.id, resolved);
  if (!ok) notFound();

  // Step 4: scoped queries with soft-delete + status filters (D-22)
  const scope = getScopedOwnerPortalClient(resolved);

  const { data: drawRow } = await scope
    .scopedFrom("draws", "*")
    .eq("id", params.id)
    .is("deleted_at", null)
    .in("status", ["submitted", "approved", "paid", "void"])
    .maybeSingle();
  if (!drawRow) notFound();

  // (line items, invoices, vendors, cost codes fetched + mapped similarly)
  // OwnerDrawView consumes Caldwell* types; mapping omitted for brevity.

  // BLK-3 fix (plan-checker iter-1): wrap tenant-blind primitive in <main data-prototype="...">
  return (
    <main
      data-prototype="owner-draw"
      className="px-[var(--space-4)] py-[var(--space-4)] pb-[env(safe-area-inset-bottom)]"
    >
      <OwnerDrawView
        draw={drawRow as any}  // mapped to CaldwellDraw shape
        job={{ id: resolved.job_id, name: "(fetched from scope.scopedFrom('jobs'))" }}
        lineItems={[]}      // mapped from draw_line_items query
        invoices={[]}       // mapped from invoices query (cost-plus open-book)
        vendors={[]}        // mapped from vendors query
        costCodes={[]}      // mapped from cost_codes query
        breadcrumbRoot={{ href: `/owner/${params.token}`, label: "Project" }}
      />
    </main>
  );
}
```

### 6.b Acknowledge API route (D-15..D-21)

**Decision: `POST /api/owner-portal/acknowledge-pay-app`. Append-only audit_log INSERT with TOCTOU close via DB unique index + `ON CONFLICT DO NOTHING`. (D-08 — append-only audit semantic; D-10 — bearer-token-in-body auth; D-19 + D-20 TOCTOU close.)**

```typescript
// src/app/api/owner-portal/acknowledge-pay-app/route.ts — NEW B-2b acknowledge endpoint
//
// Per CONTEXT D-15..D-21:
//   - Anon-token-resolved (token in request body OR Authorization bearer)
//   - PUBLIC_PATHS extended in B-2a for /api/owner-portal/acknowledge;
//     B-2b ALSO extends for /api/owner-portal/acknowledge-pay-app per BLK-1 fix
//     (existing matcher does NOT cover the hyphenated route — deterministic at
//     plan-author time per Sweep 5 analysis)
//   - Rate-limited: per-token + per-IP via B-2a's recordOwnerPortalRequest
//   - assertDrawBelongsToToken cross-validation BEFORE audit write
//   - INSERT INTO activity_log ... ON CONFLICT DO NOTHING (TOCTOU close per
//     migration 00106 unique index on (entity_id, actor_token_id, action)
//     WHERE action='acknowledged' AND actor_token_id IS NOT NULL)
//   - APPEND-ONLY — NO expected_updated_at; NO updateWithLock (audit-log is
//     append-only per D-16 + iter-1 SYNTHESIS B-13)

import { NextRequest, NextResponse } from "next/server";
import {
  resolveOwnerToken,
  assertDrawBelongsToToken,
} from "@/lib/owner-portal/token";
import { recordOwnerPortalRequest } from "@/lib/owner-portal/rate-limit";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

interface AckBody {
  token?: unknown;
  drawId?: unknown;
}

function isUuidLike(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
function isTokenLike(v: unknown): v is string {
  return typeof v === "string" && v.length === 64;
}

export async function POST(request: NextRequest) {
  // Step 1: parse + validate body
  let body: AckBody;
  try {
    body = (await request.json()) as AckBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!isTokenLike(body.token) || !isUuidLike(body.drawId)) {
    return NextResponse.json(
      { error: "Invalid token or drawId" },
      { status: 400 },
    );
  }

  // Step 2: resolve token (timing-uniform null per B-2a)
  const resolved = await resolveOwnerToken(body.token);
  if (!resolved) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Step 3: rate-limit per-token + per-IP
  const requestIp =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const tokenRl = await recordOwnerPortalRequest("token", resolved.portal_access_id);
  if (!tokenRl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: { "Retry-After": String(tokenRl.retryAfterSeconds ?? 60) },
      },
    );
  }
  const ipRl = await recordOwnerPortalRequest("ip", requestIp);
  if (!ipRl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: { "Retry-After": String(ipRl.retryAfterSeconds ?? 60) },
      },
    );
  }

  // Step 4: cross-validate draw belongs to token (closes B-3 intra-org
  // cross-client probe per B-2a §6.e pinned SQL)
  const ok = await assertDrawBelongsToToken(body.drawId, resolved);
  if (!ok) {
    return NextResponse.json({ error: "Draw not found" }, { status: 404 });
  }

  // Step 5: write audit_log row via B-2a's logActivity helper
  //   - entity_type='draw' (already in ActivityEntityType union)
  //   - action='acknowledged' (NEW B-2b union member per Task 4)
  //   - user_id=NULL (homeowner-via-token NOT authenticated admin)
  //   - actor_token_id=resolved.portal_access_id (D-16)
  //
  // TOCTOU close per D-19 + D-20: the 00106 migration creates a partial
  // unique index on (entity_id, actor_token_id, action) WHERE action=
  // 'acknowledged' AND actor_token_id IS NOT NULL. Concurrent double-tap
  // produces exactly 1 audit row — the second INSERT collides at the
  // unique constraint, fires ON CONFLICT DO NOTHING semantics inside
  // logActivity's onConflictDoNothing=true upsert branch (Task 3).
  //
  // WARN-2 (plan-checker iter-1) — Option (a) considered + REJECTED in
  // favor of (b) extending logActivity helper. Rationale: keeps ON CONFLICT
  // ergonomics central to the audit-log helper module; one call site;
  // future audit-action additions inherit the upsert semantic without
  // re-implementing per-call. Option (a) (direct upsert inside the route
  // handler) would scatter the ON CONFLICT semantics across consumers.

  await logActivity({
    org_id: resolved.org_id,
    user_id: null,
    actor_token_id: resolved.portal_access_id,
    entity_type: "draw",
    entity_id: body.drawId,
    action: "acknowledged",
    details: { acknowledged_via: "owner_portal" },
    onConflictDoNothing: true,  // WARN-2 fix: option (b) locked; flag in LogActivityArgs (Task 3)
  });

  // Step 6: return success
  return NextResponse.json({ acknowledged: true });
}
```

### 6.c TOCTOU dedupe migration (D-19)

```sql
-- supabase/migrations/00106_b2b_activity_log_ack_dedupe.sql
-- F1-Wave-B Slice-2 B-2b per CONTEXT D-19 + iter-1 SYNTHESIS B-12 closure.
--
-- TOCTOU close on owner-portal pay-app acknowledgment: concurrent double-tap
-- from a homeowner (network retry, fast double-tap, racing tabs) must produce
-- exactly 1 audit_log row, not 2. Partial unique index scopes the constraint
-- to action='acknowledged' AND actor_token_id IS NOT NULL — does NOT block
-- legacy or future user-action entity_id collisions on other action types
-- (e.g., status_changed rows with same entity_id but different user_id are
-- still permitted; only homeowner-via-token acknowledged actions are deduped).
--
-- Idempotency: IF NOT EXISTS guards the forward apply; down drops unconditionally.

CREATE UNIQUE INDEX IF NOT EXISTS activity_log_ack_dedupe_unique
  ON public.activity_log (entity_id, actor_token_id, action)
  WHERE action = 'acknowledged' AND actor_token_id IS NOT NULL;

COMMENT ON INDEX public.activity_log_ack_dedupe_unique IS
  'F1 Wave-B Slice-2 B-2b D-19 — TOCTOU close on homeowner pay-app acknowledgment. Scopes uniqueness to acknowledged actions with non-null actor_token_id; concurrent double-tap from owner portal produces exactly 1 audit row via INSERT...ON CONFLICT DO NOTHING.';

-- Schema reload (mirroring 00104 pattern)
NOTIFY pgrst, 'reload schema';
```

```sql
-- supabase/migrations/00106_b2b_activity_log_ack_dedupe.down.sql
-- F1-Wave-B Slice-2 B-2b down migration — restore pre-B-2b state.

DROP INDEX IF EXISTS public.activity_log_ack_dedupe_unique;

NOTIFY pgrst, 'reload schema';
```

### 6.d ActivityAction union + Record extension + onConflictDoNothing flag (D-16 type contract for B-2b; WARN-2 lock-in)

`'acknowledged'` is NEW to `ActivityAction` union (B-2b additions; `'revoked'` was B-2a's addition). `'draw'` entity_type is already in `ActivityEntityType` union.

**WARN-2 fix**: Option (b) explicitly locked in — extend logActivity helper with `onConflictDoNothing?: boolean` flag. Option (a) (direct upsert at the route handler) was considered + REJECTED. Rationale captured at §6.b Step 5 above. This is no longer an "ambiguous comment block" — single canonical implementation.

```typescript
// src/lib/activity-log.ts — modify around line 73 (after 'revoked' entry)

export type ActivityAction =
  | "created"
  // ... existing members ...
  | "revoked"  // B-2a
  // F1-Wave-B Slice-2 B-2b per CONTEXT D-16. Owner-portal pay-app
  // acknowledgment uses entity_type='draw' + action='acknowledged' +
  // actor_token_id=resolved.portal_access_id + user_id=NULL. TOCTOU
  // close via migration 00106 partial unique index + ON CONFLICT DO
  // NOTHING semantics. Must mirror ACTION_LABELS Record entry in
  // src/lib/audit/action-labels.ts per B-1a-bis precedent.
  | "acknowledged";
```

```typescript
// src/lib/audit/action-labels.ts — extend ACTION_LABELS Record (line 62-83)

const ACTION_LABELS: Record<ActivityAction, string> = {
  // ... existing entries ...
  revoked: "revoked",  // B-2a
  // F1-Wave-B Slice-2 B-2b per CONTEXT D-16. Owner-portal pay-app
  // acknowledgment surfaces in audit timeline as "Pay App acknowledged"
  // via entityLabel + actionLabel composition (ENTITY_LABELS['draw'] =
  // 'Pay App' per Stage 1.5c D-01 terminology rename).
  acknowledged: "acknowledged",
};
```

#### `onConflictDoNothing` flag on logActivity (WARN-2 LOCKED to option (b))

```typescript
// src/lib/activity-log.ts — extend LogActivityArgs (line 75-93)

interface LogActivityArgs {
  org_id: string;
  user_id?: string | null;
  actor_token_id?: string | null;  // B-2a
  entity_type: ActivityEntityType;
  entity_id?: string | null;
  action: ActivityAction;
  details?: Record<string, unknown> | null;
  /**
   * F1-Wave-B Slice-2 B-2b per CONTEXT D-19 + D-20. When true, the
   * underlying INSERT uses upsert with onConflict=
   * 'entity_id,actor_token_id,action' and ignoreDuplicates=true so
   * concurrent acknowledgment double-tap produces exactly 1 row
   * (migration 00106 partial unique index closes the race at DB level).
   * Default false (existing callers retain plain-INSERT semantics).
   */
  onConflictDoNothing?: boolean;
}

// Update insert path (line 104-112):
if (args.onConflictDoNothing === true) {
  const { error } = await supabase
    .from("activity_log")
    .upsert(
      {
        org_id: args.org_id,
        user_id: args.user_id ?? null,
        actor_token_id: args.actor_token_id ?? null,
        entity_type: args.entity_type,
        entity_id: args.entity_id ?? null,
        action: args.action,
        details: args.details ?? null,
      },
      { onConflict: "entity_id,actor_token_id,action", ignoreDuplicates: true },
    );
  // ... handle error
} else {
  const { error } = await supabase.from("activity_log").insert({
    // ... existing shape
  });
}
```

### 6.e ClientCombobox TD-B1abis-03 polish (D-23..D-25 + NOTE-1)

Mirror `cost-code-combobox.tsx` idiom + replace `--shadow-popover` (does NOT exist) with `shadow-[var(--shadow-panel)]` (defined at `colors_and_type.css:61` per iter-1 SYNTHESIS B-15).

```typescript
// src/components/client-combobox.tsx — modify ~10 lines per CONTEXT D-23..D-25

// BEFORE (lines 171-178):
{label && (
  <span
    className="block mb-1 text-[10px] uppercase tracking-[0.12em]"
    style={{
      fontFamily: "var(--font-jetbrains-mono)",
      color: "var(--text-tertiary)",
    }}
  >
    {label}
  </span>
)}

// AFTER:
{label && (
  <span className="block mb-1 text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-tertiary)] font-mono">
    {label}
  </span>
)}

// BEFORE (lines 196-205):
<div
  id={listboxId}
  role="listbox"
  className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-y-auto border bg-[var(--bg-card)]"
  style={{
    borderColor: "var(--border-default)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  }}
>

// AFTER:
<div
  id={listboxId}
  role="listbox"
  className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-y-auto border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[var(--shadow-panel)]"
>
```

Note: `font-mono` is the Slate JetBrains Mono utility class per `tailwind.config.ts`; verify at execute time. If `font-mono` doesn't map to JetBrains Mono in the project config, fall back to `font-display` (Space Grotesk) OR a bracket-value utility `font-[var(--font-jetbrains-mono)]`. Plan-author confirms via grep at execute time.

**NOTE-1 fix applied**: Inline `style={{ fontFamily: 'var(--font-space-grotesk)' }}` patterns are NOT in client-combobox.tsx (which uses JetBrains Mono for the label). NOTE-1 specifically applies to layout.tsx + error.tsx (D-01-area files); see §6.a where `font-display` utility replaces inline fontFamily on Space-Grotesk-targeted elements (per `tailwind.config.ts:64`).

### 6.f NwButton TD-20 boundary exemption on acknowledge CTA (D-26 + D-27 + D-31 design-pushback iter-1 disposition deferred)

Plan-author Latitude #4 recommendation **(a) — raw `<button>` with TD-20 exemption comment + 56px height**. Mirrors `OwnerDrawView.tsx:158-162` precedent. (D-31 — iter-1 design-pushback signs off on this variant.)

```typescript
// src/app/owner/[token]/pay-apps/[id]/page.tsx — acknowledge CTA fragment

// TD-20 boundary exemption per OwnerDrawView.tsx:158-162 precedent.
// NwButton lg size = 44px; acknowledge is a high-stakes action (homeowner
// irreversible attestation of pay-app); SYSTEM.md mandates 56px touch
// target for high-stakes per WCAG 2.2 AA + Nightwork's stricter posture.
// Raw <button> required because NwButton has no 56px variant. Comment
// cited per nightwork-ui-template TD-20 exemption rationale.
<button
  type="button"
  data-testid="acknowledge-pay-app-button"
  onClick={handleAcknowledge}
  disabled={isAcknowledging || isAlreadyAcknowledged}
  className="
    w-full
    bg-[var(--nw-stone-blue)] text-[color:var(--nw-white-sand)]
    font-display text-[16px]
    px-[var(--space-6)] py-[var(--space-4)]
    border border-[var(--nw-stone-blue)]
    hover:bg-[var(--nw-stone-blue-hover)]
    focus:outline-2 focus:outline-offset-2 focus:outline-[var(--nw-stone-blue)]
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-colors
  "
  style={{ minHeight: "56px" }}  /* TD-20 exemption: NwButton lacks 56px size */
>
  {isAcknowledging
    ? "Acknowledging..."
    : isAlreadyAcknowledged
    ? "Acknowledged"
    : "Acknowledge Pay App"}
</button>
```

Iter-1 design-pushback confirms or counter-proposes (b) per D-27.

### 6.g PATTERNS.md alignment (B-17 RESOLVED; cite both) (D-32 alignment posture)

Per iter-1 SYNTHESIS B-17 + EXPANDED-SCOPE §15 line 191: B-2b does NOT add a new pattern entry. Existing PATTERNS.md sections cover both surfaces:

- **§4h.3 — Owner Portal Dashboard (Dashboard pattern)** — covers `/owner/{token}` (B-2b's `OwnerDashboardView` consumption). KPI tiles + draws list + change-orders summary + recent-activity sidebar.
- **§2h.3 — Owner Draw Review (Document Review extension)** — covers `/owner/{token}/pay-apps/{id}` (B-2b's `OwnerDrawView` consumption). Document Review pattern (file preview LEFT + structured fields right-rail + audit timeline below) extended for homeowner audience (no AI confidence + no PM override audit + no internal cost-code mapping per OwnerDrawView.tsx:25-32).

B-2b implementation files include these citations in top-of-file docstrings.

### 6.h Smoke harness route table extension (Workflow Rule 4 + BLK-2 fixture infrastructure)

**BLK-2 fix per plan-checker iter-1**: deterministic fixture seeded in `scripts/fixtures/smoke-seed.sql`; plaintext token shipped via `HARNESS_FIXTURE_OWNER_TOKEN` env var (NOT a bare string constant in scripts/). This is required because the previous PLAN referenced `HARNESS_FIXTURE_TOKEN` + `HARNESS_FIXTURE_DRAW_ID` constants that did NOT exist in `scripts/wave-d-smoke.ts` (verified via grep at plan-author time). Without seeded portal_access fixture + plaintext, Tasks 7-8 + AC-B2b-10 cannot execute.

#### BLK-2.a — Extend `scripts/fixtures/smoke-seed.sql` with `client_portal_access` fixture row

The seed extension adds a `client_portal_access` row in the existing `00000000-0000-0000-0000-fb1ce0a55e55` org (harness-fixture-org), linked to the existing `22222222-2222-2222-2222-200000000001` job (Smoke Job Alpha) + the existing `00000000-0000-0000-0003-100000000001` client (Smoke Client A) — both seeded in smoke-seed.sql Step 4.5 + Step 5. The `access_token_hash` is a deterministic SHA-256 hex of the plaintext shipped via env.

The plaintext convention (32-byte / 64-char hex per `00074_client_portal.sql` §LINE 25-34): `HARNESS_FIXTURE_OWNER_TOKEN` MUST be a 64-char hex string in `.env.local` (Vercel Preview + Production). The SHA-256 hash hard-coded in the seed MUST match `digest(:plaintext::text, 'sha256')` of that value. Plan-author proposes the seed embeds the hash literal AND documents the plaintext convention in a comment block (NOT embedding plaintext in the seed file). The orchestrator-driven substitution pattern from the existing smoke-seed.sql password lifecycle is the precedent.

```sql
-- ============================================================================
-- Step 8 (NEW — B-2b BLK-2 fix per plan-checker iter-1): client_portal_access
-- fixture row for owner-portal smoke harness + AC-B2b-10 runtime revocation
-- probe + AC-B2b-06 TOCTOU concurrent-double-tap test.
--
-- access_token_hash MUST equal SHA-256 hex of $HARNESS_FIXTURE_OWNER_TOKEN
-- (orchestrator-substituted at apply time, same lifecycle pattern as the
-- existing smoke password placeholder above at line 106).
--
-- Token convention (per 00074_client_portal.sql lines 25-34):
--   - Plaintext: 64-char hex (encode(extensions.gen_random_bytes(32), 'hex'))
--   - Hash:      SHA-256 hex of plaintext (encode(digest(plaintext, 'sha256'), 'hex'))
--   - CHECK on access_token_hash enforces 64-char length.
--
-- APPLY PROCEDURE (orchestrator-driven, mirrors smoke-seed password lifecycle):
--
--   1. Orchestrator generates a single shared 64-char hex token plaintext via
--      Node `crypto.randomBytes(32).toString('hex')` OR re-uses existing
--      `HARNESS_FIXTURE_OWNER_TOKEN` env value if already provisioned.
--   2. Orchestrator computes SHA-256 hex of the plaintext.
--   3. Orchestrator substitutes the placeholder string
--      '__SHA256_REPLACED_BY_ORCHESTRATOR_FROM_HARNESS_FIXTURE_OWNER_TOKEN__'
--      below with the computed hash hex.
--   4. Orchestrator submits the resulting SQL via Supabase MCP `execute_sql`.
--   5. On apply success, orchestrator writes the plaintext value to
--      `.env.local` AND adds it to Vercel Preview + Production env vars.
--      Plaintext is documented in
--      `.planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt`
--      (same restricted-checkin file as the smoke user passwords).
--
-- HARNESS_FIXTURE_DRAW_ID: re-uses an existing seeded draw entity. The smoke
-- seed currently does NOT seed `draws` rows (only jobs + invoices + activity_log).
-- Plan-author MUST extend Step 8 with a synthetic draw row in the
-- harness-fixture-org if AC-B2b-06 (TOCTOU) requires a specific draw_id with
-- status IN ('submitted','approved','paid','void'). Convention: UUID prefix
-- `55555555-5555-5555-5555-XXXXXXXXXXXX` for draws (mirroring existing prefix
-- conventions); 1 synthetic draw on Smoke Job Alpha with status='submitted'.
-- ============================================================================
INSERT INTO public.client_portal_access (
  id,
  org_id,
  job_id,
  client_id,
  email,
  name,
  access_token_hash,
  visibility_config,
  invited_at,
  expires_at,
  created_by
) VALUES (
  '00000000-0000-0000-0004-100000000001',                  -- deterministic UUID for B-2b smoke fixture row
  '00000000-0000-0000-0000-fb1ce0a55e55',                  -- harness-fixture-org
  '22222222-2222-2222-2222-200000000001',                  -- Smoke Job Alpha (Step 5)
  '00000000-0000-0000-0003-100000000001',                  -- Smoke Client A (Step 4.5)
  'smoke-fixture-owner@nightwork.local',
  'Smoke Fixture Owner',
  '__SHA256_REPLACED_BY_ORCHESTRATOR_FROM_HARNESS_FIXTURE_OWNER_TOKEN__',
  '{}'::jsonb,
  NOW(),
  NOW() + interval '365 days',                             -- 1-year per D-09 (B-2a)
  '5eb26edc-5989-477f-ac42-d1e9264db0e2'                   -- harness-fixture@nightwork.local (00092/00093)
)
ON CONFLICT (id) DO UPDATE SET
  access_token_hash = EXCLUDED.access_token_hash,           -- rotate hash on re-apply (parallel to password lifecycle)
  expires_at        = EXCLUDED.expires_at,
  revoked_at        = NULL;                                 -- clear revocation on re-apply (idempotency)

-- Synthetic draw row for AC-B2b-06 TOCTOU + AC-B2b-05 acknowledge writes
INSERT INTO public.draws (
  id,
  org_id,
  job_id,
  draw_number,
  application_date,
  period_start,
  period_end,
  status,
  revision_number,
  original_contract_sum,
  net_change_orders,
  contract_sum_to_date,
  total_completed_to_date,
  less_previous_payments,
  current_payment_due,
  balance_to_finish,
  deposit_amount,
  submitted_at
) VALUES (
  '55555555-5555-5555-5555-500000000001',                  -- HARNESS_FIXTURE_DRAW_ID convention
  '00000000-0000-0000-0000-fb1ce0a55e55',
  '22222222-2222-2222-2222-200000000001',                  -- Smoke Job Alpha
  1,
  CURRENT_DATE,
  CURRENT_DATE - interval '30 days',
  CURRENT_DATE,
  'submitted',
  0,
  250000000, 0, 250000000, 50000000, 0, 50000000, 200000000, 25000000,
  NOW()
)
ON CONFLICT (id) DO NOTHING;
```

#### BLK-2.b — `HARNESS_FIXTURE_OWNER_TOKEN` env-var presence check pattern

Per CLAUDE.md secret-presence-verification (nwrp139): `${VAR:-NOT_SET}` is FORBIDDEN. Use explicit `if [ -n ... ]; then ... fi`:

```bash
# Canonical presence-check pattern; safe to embed in commit logs / executor scripts
if [ -n "$HARNESS_FIXTURE_OWNER_TOKEN" ]; then
  echo "HARNESS_FIXTURE_OWNER_TOKEN: SET (len=${#HARNESS_FIXTURE_OWNER_TOKEN})"
else
  echo "HARNESS_FIXTURE_OWNER_TOKEN: NOT SET"
fi
```

#### BLK-2.c — `scripts/wave-d-smoke.ts` route entries (consume HARNESS_FIXTURE_OWNER_TOKEN)

```typescript
// scripts/wave-d-smoke.ts — extend ROUTES array per CONTEXT D-30 + Workflow Rule 4
// BLK-2 fix per plan-checker iter-1: plaintext token via env var; deterministic seeded fixture.

// Read plaintext token from env (canonical pattern; throw at startup if missing)
const HARNESS_FIXTURE_OWNER_TOKEN = process.env.HARNESS_FIXTURE_OWNER_TOKEN;
if (!HARNESS_FIXTURE_OWNER_TOKEN) {
  console.error(
    "[wave-d-smoke] HARNESS_FIXTURE_OWNER_TOKEN: NOT SET — required for owner-portal route smoke. Set in .env.local + Vercel Preview/Production.",
  );
  process.exit(2);  // setup error exit code per script header
}

const HARNESS_FIXTURE_DRAW_ID = "55555555-5555-5555-5555-500000000001";  // seeded in smoke-seed.sql §Step 8

// F1-Wave-B Slice-2 B-2b per CONTEXT D-01 + D-02 + BLK-2 fix:
// homeowner portal entry + drilldown routes. Synthetic seeded UUIDs per CLAUDE.md
// "Drummond is the reference job for production-facing artifacts ONLY" — smoke
// harness uses synthetic seed at scripts/fixtures/smoke-seed.sql.
//
// Selector posture: <main data-prototype='owner-dashboard'> wrapper (BLK-3 fix) +
// heading inside. Selector resolves on the page.tsx wrapper element, NOT on
// the tenant-blind primitive (which remains untouched per Latitude #1 (a)).

{
  route: `/owner/${HARNESS_FIXTURE_OWNER_TOKEN}`,
  category: "owner-portal",
  primary_ux_selector: "main[data-prototype='owner-dashboard'], main[data-prototype='owner-dashboard'] h1",
  primary_ux_min_count: 1,
  pattern: "owner-portal-dashboard",
},
{
  route: `/owner/${HARNESS_FIXTURE_OWNER_TOKEN}/pay-apps/${HARNESS_FIXTURE_DRAW_ID}`,
  category: "owner-portal",
  primary_ux_selector: "main[data-prototype='owner-draw'], main[data-prototype='owner-draw'] h1",
  primary_ux_min_count: 1,
  pattern: "owner-portal-draw",
},
```

Route count: 14→16 (B-2a added 14; B-2b adds 2).

### 6.i Threat model (medium severity)

Per B-2b-CONTEXT.md and EXPANDED-SCOPE §7 plan #2: B-2b threat severity is **medium** (down from B-2a's HIGH). Justification: B-2a SHIPPED the foundational security model; B-2b is UI consuming verified helpers. New surfaces:

- **T-B2b-01 — Token-scoped data fetch correctness.** Mitigated BY CONSTRUCTION via `getScopedOwnerPortalClient` from B-2a (scope filters injected at query builder level). Multi-tenant-architect MINOR-NOTE grep gate carried forward (S-01 verification criterion).
- **T-B2b-02 — Acknowledge API surface (CSRF? Origin check?).** Anon-token-resolved POST endpoint. CSRF N/A in the traditional sense (no cookie-authenticated session; token in request body acts as bearer credential). Rate-limit applies per-token + per-IP per B-2a infrastructure. Token plaintext in body MUST be over HTTPS only (Vercel default). No Origin header check (does not apply to anon-token-bearer endpoints; the auth IS the token).
- **T-B2b-03 — Mobile UI XSS surface.** Mitigated via React's default escaping; no `dangerouslySetInnerHTML` in B-2b code. Document download URLs (Latitude #3) come from `getScopedOwnerPortalClient` query results — server-side validated; no user-controllable content rendered raw.
- **T-B2b-04 — Forward-carried AC-B2a-08 runtime revocation MUST work** (per nwrp209 §3). If revocation fails in practice (token still resolves after admin revokes), the security model is unproven and B-2b ship is HALTED per nwrp209 §3 forward-carried condition. AC-B2b-10 covers.
- **T-B2b-05 — Information disclosure on error boundary.** Error boundary at `src/app/owner/error.tsx` (D-04) renders generic "link no longer valid" — does NOT leak which failure mode (revoked / expired / not-found / NULL client_id) triggered. Matches `resolveOwnerToken`'s timing-uniform null contract.
- **T-B2b-06 — Soft-delete bypass.** `.is('deleted_at', null)` filter on every B-2b query per D-22 + iter-1 SYNTHESIS B-14 closure. Homeowner cannot see soft-deleted records.
- **T-B2b-07 — Status filter bypass.** `.in('status', ['submitted', 'approved', 'paid', 'void'])` on draws queries per D-22. Homeowner cannot see `draft` or `pm_review` drafts.

| Threat ID | Category (STRIDE) | Component | Disposition | Mitigation Plan |
|---|---|---|---|---|
| T-B2b-01 | Information Disclosure | `/owner/**` + `/api/owner-portal/acknowledge-pay-app/route.ts` | mitigate | `getScopedOwnerPortalClient` + `assertDrawBelongsToToken` from B-2a; multi-tenant grep gate (S-01) |
| T-B2b-02 | Tampering | acknowledge POST endpoint | mitigate | Token-in-body acts as bearer credential; rate-limit per-token + per-IP via B-2a infra; HTTPS-only per Vercel default |
| T-B2b-03 | Information Disclosure | OwnerDashboardView + OwnerDrawView rendering | mitigate | React default escaping; no dangerouslySetInnerHTML; document URLs server-validated |
| T-B2b-04 | Tampering | Token revocation runtime path | mitigate | Forward-carried AC-B2a-08 test (AC-B2b-10) — if fails: HALT before ship per nwrp209 §3 |
| T-B2b-05 | Information Disclosure | `src/app/owner/error.tsx` | mitigate | Generic "link no longer valid" UX; no failure-mode-specific messages |
| T-B2b-06 | Information Disclosure | All B-2b portal queries | mitigate | `.is('deleted_at', null)` per D-22 (iter-1 SYNTHESIS B-14 closure) |
| T-B2b-07 | Information Disclosure | B-2b draws queries | mitigate | `.in('status', [...])` per D-22 — exclude draft + pm_review from homeowner view |

## 7. Implementation tasks (atomic; each gets its own commit)

### Task 1 — Migration 00106 + types regen (D-19 + CLAUDE.md Dev Rules same-commit pairing)

**Files:**
- `supabase/migrations/00106_b2b_activity_log_ack_dedupe.sql` (NEW)
- `supabase/migrations/00106_b2b_activity_log_ack_dedupe.down.sql` (NEW)
- `src/lib/types/database.types.ts` (regenerated; may be no-op if index-only)

**Verify:**
```bash
mcp__supabase__apply_migration: <forward body>
mcp__supabase__execute_sql:
  SELECT indexdef FROM pg_indexes WHERE indexname = 'activity_log_ack_dedupe_unique';
# Expect: 1 row; indexdef contains '(entity_id, actor_token_id, action)' AND 'WHERE...acknowledged...actor_token_id IS NOT NULL'
npx supabase gen types typescript --linked > src/lib/types/database.types.ts.tmp
# diff; commit regen output even if no-op
```

**Done:** Migration applied; index visible in pg_indexes; types regenerated (possibly no-op); both files committed together per CLAUDE.md Dev Rules.

**Atomic commit:** `feat(b-2b): migration 00106 — TOCTOU dedupe unique index on activity_log + types regen`

### Task 2 — ActivityAction union + ACTION_LABELS Record extension + onConflictDoNothing flag (D-16; WARN-2 locked option (b))

**Files:**
- `src/lib/activity-log.ts` (extend `ActivityAction` union + extend `LogActivityArgs` with `onConflictDoNothing` flag + extend insert path with upsert branch per WARN-2 lock-in to option (b))
- `src/lib/audit/action-labels.ts` (extend `ACTION_LABELS` Record)

**Verify:**
```bash
npx tsc --noEmit
# Expect: 0 errors (Record exhaustiveness preserved)
grep -n "acknowledged" src/lib/activity-log.ts src/lib/audit/action-labels.ts
# Expect: union member + Record entry both present
grep -n "onConflictDoNothing" src/lib/activity-log.ts
# Expect: LogActivityArgs property declaration + upsert branch (2+ hits)
```

**Done:** TS compile passes; both files committed together as one atomic unit (Record exhaustiveness ties them); upsert branch wired per WARN-2 option (b).

**Atomic commit:** `feat(b-2b): activity-log 'acknowledged' action + onConflictDoNothing flag + ACTION_LABELS mirror`

### Task 3 — `/owner/{token}` route + layout + error boundary (D-01..D-04 + D-06..D-11 + D-22; BLK-3 wrapper applied; NOTE-1 font-display utility)

**Files:**
- `src/app/owner/layout.tsx` (NEW; NOTE-1: font-display utility, no inline fontFamily)
- `src/app/owner/error.tsx` (NEW; NOTE-1: font-display utility, no inline fontFamily)
- `src/app/owner/[token]/page.tsx` (NEW; BLK-3: `<main data-prototype="owner-dashboard">` wraps `<OwnerDashboardView />`; NOTE-2: explicit field-by-field map in `mapDbDrawToCaldwell`)

**Action:** Implement per §6.a structural approach. Server-side render via `getScopedOwnerPortalClient` from B-2a. Map DB rows → `Caldwell*` types (Latitude #1 recommendation a). Apply `.is('deleted_at', null)` + `.in('status', ['submitted', 'approved', 'paid', 'void'])` per D-22. **BLK-3 fix**: wrap the tenant-blind `OwnerDashboardView` render in `<main data-prototype="owner-dashboard">...</main>` at the page.tsx layer (NOT in the primitive). **NOTE-1 fix**: use `font-display` utility class for Space Grotesk surfaces; remove inline `style={{ fontFamily: ... }}` from both layout.tsx and error.tsx. **NOTE-2 fix**: `mapDbDrawToCaldwell` uses explicit field-by-field map (mirroring `mapDbJobToCaldwell` precedent) — no cast.

**Verify:**
```bash
# Build passes
npm run build
# Local dev render
npm run dev  # in background
# Hit /owner/<HARNESS_FIXTURE_OWNER_TOKEN> — expect 200 + OwnerDashboardView inside <main data-prototype="owner-dashboard">
# Hit /owner/invalid-token — expect notFound() → error boundary
# Verify NOTE-1 fix:
grep -n 'style={{ fontFamily' src/app/owner/layout.tsx src/app/owner/error.tsx
# Expect: 0 hits
grep -n 'font-display' src/app/owner/layout.tsx src/app/owner/error.tsx
# Expect: 2+ hits (header + h1)
# Verify BLK-3 fix:
grep -n 'data-prototype="owner-dashboard"' src/app/owner/[token]/page.tsx
# Expect: 1 hit inside a <main ...> wrapper
grep -n 'data-prototype' src/components/prototypes/OwnerDashboardView.tsx
# Expect: 0 hits in primitive (Latitude #1 (a) tenant-blind preservation)
```

**Done:** Routes return 200 for valid token + render `<main data-prototype="owner-dashboard"><OwnerDashboardView /></main>`; invalid/revoked/expired tokens route through error boundary; tenant-blind primitive UNTOUCHED; font-display utility applied.

**Atomic commit:** `feat(b-2b): owner portal route + layout + error boundary + dashboard render`

### Task 4 — `/owner/{token}/pay-apps/{id}` drilldown route (D-02 + D-17 + D-22; BLK-3 wrapper applied)

**Files:**
- `src/app/owner/[token]/pay-apps/[id]/page.tsx` (NEW; includes acknowledge CTA per §6.f; BLK-3: `<main data-prototype="owner-draw">` wraps `<OwnerDrawView />`)

**Action:** Implement per §6.a + §6.f. `assertDrawBelongsToToken` cross-validation. Document download UX per Latitude #3 (plan-author recommendation: link list mirroring InvoiceReviewView attachments per PATTERNS.md §2h.3). Acknowledge CTA per D-26/D-27 (plan-author recommendation a: raw `<button>` with TD-20 comment + 56px minHeight). **BLK-3 fix**: wrap the tenant-blind `OwnerDrawView` render in `<main data-prototype="owner-draw">...</main>` at the page.tsx layer.

**Verify:**
```bash
# Hit /owner/<TOKEN>/pay-apps/<VALID_DRAW_ID> — expect 200 + OwnerDrawView inside <main data-prototype="owner-draw">
# Hit /owner/<TOKEN>/pay-apps/<OTHER_CLIENT_DRAW_ID> — expect notFound() (assertDrawBelongsToToken returns false)
grep -n 'data-prototype="owner-draw"' src/app/owner/[token]/pay-apps/[id]/page.tsx
# Expect: 1 hit inside <main ...>
grep -n 'data-prototype' src/components/prototypes/OwnerDrawView.tsx
# Expect: 0 hits in primitive
```

**Done:** Routes render `<main data-prototype="owner-draw"><OwnerDrawView /></main>` for valid (token, drawId) pairs; cross-client probe falls through to error boundary; tenant-blind primitive UNTOUCHED.

**Atomic commit:** `feat(b-2b): owner portal pay-app drilldown + cross-client scope assertion`

### Task 5 — Acknowledge API route + middleware PUBLIC_PATHS extension (D-15..D-21 + BLK-1 fix)

**Files:**
- `src/app/api/owner-portal/acknowledge-pay-app/route.ts` (NEW)
- `src/middleware.ts` (MODIFIED — REQUIRED per BLK-1 fix; existing `/api/owner-portal/acknowledge` does NOT startsWith-match `/api/owner-portal/acknowledge-pay-app` due to hyphen vs slash; explicit entry required)

**Action:** Implement per §6.b. POST handler: parse body → resolveToken → rate-limit per-token + per-IP → assertDrawBelongsToToken → logActivity with `onConflictDoNothing: true`. Append-only (NO updateWithLock). **BLK-1 fix**: add `/api/owner-portal/acknowledge-pay-app` entry to `PUBLIC_PATHS` in `src/middleware.ts` with comment matching B-2a's per-entry comment style.

**Verify:**
```bash
# Verify BLK-1 fix at middleware
grep -n "/api/owner-portal/acknowledge-pay-app" src/middleware.ts
# Expect: 1 hit inside PUBLIC_PATHS array (between existing /api/owner-portal/acknowledge and /api/owner-portal/admin)

# Manual or Playwright test
curl -X POST http://localhost:3000/api/owner-portal/acknowledge-pay-app \
  -H "Content-Type: application/json" \
  -d '{"token":"<HARNESS_FIXTURE_OWNER_TOKEN>","drawId":"55555555-5555-5555-5555-500000000001"}'
# Expect: 200 { acknowledged: true } (NOT 401 redirect — confirms PUBLIC_PATHS extension)

mcp__supabase__execute_sql:
  SELECT entity_type, action, user_id, actor_token_id FROM public.activity_log
   WHERE action = 'acknowledged' ORDER BY created_at DESC LIMIT 1;
# Expect: entity_type='draw'; action='acknowledged'; user_id IS NULL; actor_token_id IS NOT NULL
```

**Done:** Endpoint returns 200 (NOT 401 — PUBLIC_PATHS extension lands the request at the handler); activity_log row written with correct shape; no expected_updated_at; rate-limit functional.

**Atomic commit:** `feat(b-2b): acknowledge-pay-app endpoint + middleware PUBLIC_PATHS extension + token resolution + scope assertion + append-only audit`

### Task 6 — ClientCombobox TD-B1abis-03 polish (D-23..D-25)

**Files:**
- `src/components/client-combobox.tsx` (MODIFIED ~10 lines)

**Action:** Replace inline `boxShadow` with `shadow-[var(--shadow-panel)]`; replace inline `style={fontFamily, color}` on label `<span>` with utility classes `font-mono text-[color:var(--text-tertiary)]` (verify font-mono → JetBrains Mono at execute time; if not, use `font-[var(--font-jetbrains-mono)]`). Mirror `cost-code-combobox.tsx` idiom.

**Verify:**
```bash
grep -n "shadow-\[var(--shadow-panel)\]\|--shadow-popover\|boxShadow" src/components/client-combobox.tsx
# Expect: shadow-panel present; shadow-popover absent; boxShadow absent (or only in unmodified portions)
npm run build
# Expect: 0 errors
```

**Done:** TD-B1abis-03 closed; design token compliance restored.

**Atomic commit:** `polish(b-2b): TD-B1abis-03 ClientCombobox shadow + utility class migration`

### Task 7 — Smoke harness extension + BLK-2 fixture seed (Workflow Rule 4 + D-30 + BLK-2)

**Files:**
- `scripts/fixtures/smoke-seed.sql` (MODIFIED — REQUIRED per BLK-2 fix; adds Step 8 with client_portal_access fixture row + synthetic draw row in harness-fixture-org)
- `scripts/wave-d-smoke.ts` (MODIFIED; +2 route entries; consumes `HARNESS_FIXTURE_OWNER_TOKEN` env)
- `scripts/b-2b-revocation-runtime-probe.ts` (NEW — Playwright OR curl-based 5-step harness; Task 8 deliverable; cross-referenced here for context)

**Action:** Per §6.h:
1. Extend smoke-seed.sql with Step 8 (client_portal_access fixture row + synthetic submitted draw on Smoke Job Alpha).
2. Orchestrator generates 64-char hex token plaintext, computes SHA-256 hex, substitutes placeholder in seed at apply time, ships plaintext via `HARNESS_FIXTURE_OWNER_TOKEN` env (`.env.local` + Vercel Preview + Vercel Production).
3. Update wave-d-smoke.ts: consume `HARNESS_FIXTURE_OWNER_TOKEN` from env; add 2 route entries with BLK-3 selectors `main[data-prototype='owner-dashboard']` + `main[data-prototype='owner-draw']` (per BLK-3 fix — selectors stable; tenant-blind primitives untouched per Latitude #1 (a)).

**Verify:**
```bash
# Verify env var presence (canonical CLAUDE.md secret-presence pattern)
if [ -n "$HARNESS_FIXTURE_OWNER_TOKEN" ]; then echo "HARNESS_FIXTURE_OWNER_TOKEN: SET (len=${#HARNESS_FIXTURE_OWNER_TOKEN})"; else echo "HARNESS_FIXTURE_OWNER_TOKEN: NOT SET"; fi
# Expect: SET (len=64)

# Apply seed extension via orchestrator-substituted Supabase MCP execute_sql
# (mirrors existing smoke-seed password lifecycle)

# Verify fixture row in DB
mcp__supabase__execute_sql:
  SELECT id, org_id, job_id, client_id, char_length(access_token_hash) AS hash_len, revoked_at, expires_at
    FROM public.client_portal_access
   WHERE id = '00000000-0000-0000-0004-100000000001';
# Expect: 1 row; hash_len=64; revoked_at IS NULL; expires_at > NOW()

# Local smoke run against dev server
npx tsx scripts/wave-d-smoke.ts --preview-url http://localhost:3000
# Expect: 16 routes tested (14 from B-2a + 2 from B-2b); all pass
```

**Done:** Smoke harness covers owner-portal routes; runs green pre-QA; fixture row + env var verified.

**Atomic commit:** `chore(b-2b): smoke harness route table extension + smoke-seed client_portal_access fixture (BLK-2)`

### Task 8 — Forward-carried AC-B2a-08 runtime revocation test + SUMMARY (D-28 + AC-B2b-10 + nwrp209 §3)

**Files:**
- `scripts/b-2b-revocation-runtime-probe.ts` (NEW — Playwright OR curl-based 5-step harness; plan-author Latitude #5 recommendation: Playwright)
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2b-SUMMARY.md` (NEW — execute-time deliverable)

**Action:** Author the 5-step probe per D-28:
1. Create test token via `create_client_portal_invite` against harness-fixture-org's seeded job. (Alternative: re-use the existing `HARNESS_FIXTURE_OWNER_TOKEN` seeded fixture row; revoke + re-issue via the lifecycle to exercise the full revocation flow.)
2. Render `/owner/{plaintext}` — assert 200 + OwnerDashboardView visible (under `<main data-prototype="owner-dashboard">` wrapper per BLK-3).
3. POST `/api/owner-portal/admin/revoke-token` with `{ token_id, expected_updated_at }` as authed harness admin.
4. Re-render `/owner/{plaintext}` — assert error boundary visible (NOT 200, NOT 500 stack).
5. Cleanup: revoke completes the test fixture lifecycle (no DELETE).

**Verify:**
```bash
npx tsx scripts/b-2b-revocation-runtime-probe.ts --preview-url <vercel-preview-url>
# Expect: all 5 steps PASS; HALT script if Step 4 fails (asserts D-29 forward-carried condition)
```

**Done:** Probe runs green against Vercel preview surface; AC-B2b-10 verified live; B-2b ship unblocked per nwrp209 §3.

**Atomic commit:** `test(b-2b): forward-carried AC-B2a-08 runtime revocation probe`

(SUMMARY.md commit comes after; standard scaffolding.)

## 8. Acceptance criteria (10 falsifiable items)

Per EXPANDED-SCOPE §11 lines 407-415 + B-2b-CONTEXT.md D-28 forward-carried condition. Each AC has explicit verification in §9.

**Migration + types (1 AC):**

- **AC-B2b-01** — Migration `00106_b2b_activity_log_ack_dedupe.sql` applies cleanly. Partial unique index `activity_log_ack_dedupe_unique` on `(entity_id, actor_token_id, action) WHERE action='acknowledged' AND actor_token_id IS NOT NULL` exists in `pg_indexes`. Idempotent on re-apply (IF NOT EXISTS guard). Closes iter-1 SYNTHESIS B-12. (D-19 + D-20)

**Routes + UI (3 ACs):**

- **AC-B2b-02** — `/owner/{token}` route renders `<main data-prototype="owner-dashboard"><OwnerDashboardView /></main>` against scope-filtered DB data via `getScopedOwnerPortalClient` from B-2a (D-05). NO direct service-role client invocation in `src/app/owner/**` (S-01 grep gate; multi-tenant MINOR-NOTE carried forward from B-2a). Soft-delete + status filters applied per D-22 (draws.status IN ('submitted','approved','paid','void'); .is('deleted_at', null) on jobs/draws). BLK-3 fix: data-prototype anchor in `<main>` wrapper at page.tsx; tenant-blind primitive at `src/components/prototypes/OwnerDashboardView.tsx` UNTOUCHED per Latitude #1 (a). (D-01 + D-05 + D-06 + D-22)
- **AC-B2b-03** — `/owner/{token}/pay-apps/{id}` route renders `<main data-prototype="owner-draw"><OwnerDrawView /></main>` ONLY when draw belongs to token's client+org scope (via `assertDrawBelongsToToken` from B-2a; D-07). Cross-client probe (other client's draw_id in same org) returns notFound() → error boundary. (D-02 + D-07 + D-17)
- **AC-B2b-04** — Error boundary at `src/app/owner/error.tsx` renders "link no longer valid" UX for ALL failure modes (revoked / expired / not-found / NULL client_id / rate-limit). No information disclosure on which failure mode (timing-uniform UX matches `resolveOwnerToken`'s timing-uniform null contract). (D-04 + D-08 + T-B2b-05)

**Audit integration (2 ACs):**

- **AC-B2b-05** — POST `/api/owner-portal/acknowledge-pay-app` with `{ token, drawId }` returns 200 + writes 1 `activity_log` row with `entity_type='draw'`, `action='acknowledged'`, `user_id=NULL`, `actor_token_id=<resolved.portal_access_id>`. Append-only (NO `expected_updated_at`, NO `updateWithLock`). BLK-1 fix: middleware PUBLIC_PATHS extended explicitly so request reaches handler as anon (NOT 401 redirect). Closes iter-1 SYNTHESIS B-13. (D-10 + D-15 + D-16)
- **AC-B2b-06** — TOCTOU close on concurrent double-tap: 2 concurrent POSTs with identical `(token, drawId)` produce **exactly 1** activity_log row (NOT 2). Verified via Playwright OR 2-curl-racing test (Latitude #6). Both POSTs return 200 (idempotent — second hits ON CONFLICT DO NOTHING via 00106 index). Closes iter-1 SYNTHESIS B-12. (D-19 + D-20 + D-21)

**Polish + design (2 ACs):**

- **AC-B2b-07** — ClientCombobox uses `shadow-[var(--shadow-panel)]` token (NOT `--shadow-popover` which does not exist). Inline `style={fontFamily, color}` replaced with utility classes (`font-mono` or `font-[var(--font-jetbrains-mono)]` + `text-[color:var(--text-tertiary)]`). Mirrors `cost-code-combobox.tsx` idiom. NOTE-1 same polish posture applied to layout.tsx + error.tsx (font-display utility for Space Grotesk). Closes iter-1 SYNTHESIS B-15 + TD-B1abis-03. (D-23 + D-24 + D-25)
- **AC-B2b-08** — Acknowledge CTA touch target ≥56px (high-stakes per SYSTEM.md) via plan-author Latitude #4 recommendation (a): raw `<button>` with TD-20 exemption comment mirroring `OwnerDrawView.tsx:158-162` precedent + explicit `style={{ minHeight: "56px" }}`. Iter-1 design-pushback signs off on the chosen variant per D-27 + D-31. Closes iter-1 SYNTHESIS B-16. (D-26 + D-27 + D-31)

**Mobile-first (1 AC):**

- **AC-B2b-09** — Mobile viewport rendering verified on Vercel preview via Playwright multi-viewport harness at iPhone 13 Pro Max (430×932), iPhone 14/15 Pro Max (430×932), Pixel 7 (412×915) per F1+-4. No horizontal scroll; top bar with logo top-left + job name; content fits viewport; safe-area handling on bottom (env(safe-area-inset-bottom)). Smoke harness covers `/owner/{HARNESS_FIXTURE_OWNER_TOKEN}` + `/owner/{HARNESS_FIXTURE_OWNER_TOKEN}/pay-apps/{HARNESS_FIXTURE_DRAW_ID}` at all 3 viewports. BLK-2 fixture seeded + env var provisioned. (D-12 + D-13 + D-14)

**Forward-carried GATE (1 AC):**

- **AC-B2b-10 (FORWARD-CARRIED FROM AC-B2a-08; LOAD-BEARING GATE per nwrp209 §3)** — End-to-end runtime revocation verified live on Vercel preview:
  1. Create test token via `create_client_portal_invite` RPC against harness-fixture-org's seeded job (OR re-use existing `HARNESS_FIXTURE_OWNER_TOKEN` fixture row + revoke-then-re-issue lifecycle).
  2. Render `/owner/{plaintext}` — assert 200 + `<main data-prototype="owner-dashboard">` root visible (per BLK-3 wrapper).
  3. POST `/api/owner-portal/admin/revoke-token` with `{ token_id, expected_updated_at }` as authed harness admin — assert 200 + `client_portal_access.revoked_at` populated.
  4. Re-render `/owner/{plaintext}` — **assert error boundary visible (D-04 'link no longer valid' UX). NOT 200 with data. NOT 500 stack trace.**
  5. Cleanup: revoke completes the test fixture lifecycle; no DELETE.

  **If Step 4 fails: HALT B-2b before ship per nwrp209 §3 forward-carried condition.** This is the load-bearing GATE — B-2a deferred this AC to QA (status DEFERRED-TO-QA per B-2a-SUMMARY.md); if revocation doesn't work in practice (despite all B-2a mechanical verifications), the security model is unproven. (D-28 + D-29 + nwrp209 §3)

## 9. Verification commands

### AC-B2b-01 — Migration 00106 applies + index exists

```bash
mcp__supabase__apply_migration:
  query: <00106 forward body from Task 1>
# Expect: success

mcp__supabase__execute_sql:
  SELECT indexname, indexdef FROM pg_indexes
   WHERE tablename = 'activity_log' AND indexname = 'activity_log_ack_dedupe_unique';
# Expect: 1 row; indexdef = 'CREATE UNIQUE INDEX activity_log_ack_dedupe_unique ON public.activity_log USING btree (entity_id, actor_token_id, action) WHERE ((action = 'acknowledged'::text) AND (actor_token_id IS NOT NULL))'
```

### AC-B2b-02 — /owner/{token} render + scope correctness + BLK-3 wrapper

```bash
# Local dev render after Task 3
curl -s http://localhost:3000/owner/$HARNESS_FIXTURE_OWNER_TOKEN -o /tmp/owner-dashboard.html
grep -c "data-prototype=\"owner-dashboard\"" /tmp/owner-dashboard.html
# Expect: >= 1 (BLK-3 wrapper present)

# Grep gate per S-01 / multi-tenant MINOR-NOTE (B-2a §13 N-5)
grep -rn 'createServiceRoleClient\|createServerSupabaseClient\|tryCreateServiceRoleClient' \
  src/app/owner/ src/app/api/owner-portal/acknowledge-pay-app/ 2>/dev/null
# Expect: ZERO hits

# Verify primitive UNTOUCHED (BLK-3 + Latitude #1 (a))
grep -n 'data-prototype' src/components/prototypes/OwnerDashboardView.tsx src/components/prototypes/OwnerDrawView.tsx
# Expect: 0 hits (anchor lives ONLY at the page.tsx wrapper layer)

# Verify scope filters applied (visual or via SQL log inspection)
mcp__supabase__execute_sql:
  SELECT COUNT(*) FROM public.draws
   WHERE job_id = '22222222-2222-2222-2222-200000000001'   -- Smoke Job Alpha (harness fixture)
     AND status NOT IN ('submitted', 'approved', 'paid', 'void');
# Expect: 0 (B-2b query excludes draft + pm_review per D-22; if dataset has any, they're invisible to homeowner)
```

### AC-B2b-03 — Cross-client probe rejected

```bash
# Setup: harness-fixture-org has 2 clients (client_A=Smoke Client A, client_B=Smoke Client B);
# B's job has a draw with id=<draw_B>
# Token for client_A → query /owner/$HARNESS_FIXTURE_OWNER_TOKEN/pay-apps/<DRAW_B_ID>
curl -s -o /dev/null -w "%{http_code}\n" \
  http://localhost:3000/owner/$HARNESS_FIXTURE_OWNER_TOKEN/pay-apps/<DRAW_B_ID>
# Expect: 404 (assertDrawBelongsToToken returns false → notFound() → error boundary)
```

### AC-B2b-04 — Error boundary UX timing-uniform

```bash
# Verify 4 failure modes all produce the same UX:
for path in \
  /owner/non-existent-token-${rand_64chars} \
  /owner/<revoked_token_plaintext> \
  /owner/<expired_token_plaintext> \
  /owner/${non_64char_garbage}; do
  curl -s http://localhost:3000${path} | grep -c "link no longer valid"
done
# Expect: each returns 1 hit (all 4 share the same "link no longer valid" UX)
```

### AC-B2b-05 — Acknowledge writes correct shape + BLK-1 middleware reach

```bash
# First verify BLK-1 fix: middleware does NOT 401-redirect anon
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/owner-portal/acknowledge-pay-app \
  -H "Content-Type: application/json" \
  -d '{}'
# Expect: 400 (handler reached + body-validation failure) — NOT 401/307 (would mean middleware blocked)

# Then issue valid acknowledge POST
if [ -n "$HARNESS_FIXTURE_OWNER_TOKEN" ]; then echo "HARNESS_FIXTURE_OWNER_TOKEN: SET (len=${#HARNESS_FIXTURE_OWNER_TOKEN})"; else echo "HARNESS_FIXTURE_OWNER_TOKEN: NOT SET"; fi
curl -X POST http://localhost:3000/api/owner-portal/acknowledge-pay-app \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$HARNESS_FIXTURE_OWNER_TOKEN\",\"drawId\":\"55555555-5555-5555-5555-500000000001\"}"
# Expect: 200 { acknowledged: true }

mcp__supabase__execute_sql:
  SELECT entity_type, action, user_id, actor_token_id, details
    FROM public.activity_log
   WHERE action = 'acknowledged' AND entity_id = '55555555-5555-5555-5555-500000000001'
   ORDER BY created_at DESC LIMIT 1;
# Expect: entity_type='draw'; action='acknowledged'; user_id IS NULL;
#         actor_token_id IS NOT NULL (= resolved.portal_access_id); details = { acknowledged_via: 'owner_portal' }
```

### AC-B2b-06 — TOCTOU concurrent-double-tap → 1 row

```bash
# Playwright concurrent test (Latitude #6 recommendation a)
npx tsx scripts/b-2b-toctou-probe.ts \
  --token "$HARNESS_FIXTURE_OWNER_TOKEN" \
  --draw-id "55555555-5555-5555-5555-500000000001"
# Probe script fires 2 concurrent POSTs; checks SQL count post-test.
# Expect: both POSTs return 200; activity_log has exactly 1 acknowledged row for (draw, token)

# Alternative: 2-curl-racing
(curl -X POST http://localhost:3000/api/owner-portal/acknowledge-pay-app \
   -H "Content-Type: application/json" \
   -d "{\"token\":\"$HARNESS_FIXTURE_OWNER_TOKEN\",\"drawId\":\"55555555-5555-5555-5555-500000000001\"}" &) \
&& (curl -X POST http://localhost:3000/api/owner-portal/acknowledge-pay-app \
      -H "Content-Type: application/json" \
      -d "{\"token\":\"$HARNESS_FIXTURE_OWNER_TOKEN\",\"drawId\":\"55555555-5555-5555-5555-500000000001\"}" &) \
&& wait

mcp__supabase__execute_sql:
  SELECT COUNT(*) FROM public.activity_log
   WHERE action = 'acknowledged'
     AND entity_id = '55555555-5555-5555-5555-500000000001'
     AND actor_token_id = '00000000-0000-0000-0004-100000000001';
# Expect: 1 (NOT 2 — ON CONFLICT DO NOTHING via 00106 index closed the race)
```

### AC-B2b-07 — ClientCombobox tokens correct + NOTE-1

```bash
grep -n "shadow-\[var(--shadow-panel)\]" src/components/client-combobox.tsx
# Expect: 1+ hits
grep -n "shadow-popover\|--shadow-popover" src/components/client-combobox.tsx
# Expect: 0 hits
grep -nE "style=\{\{" src/components/client-combobox.tsx
# Expect: minimal (label fontFamily + tertiary color migrated to utility classes per D-25)

# NOTE-1 verification — owner-portal files
grep -nE "style=\{\{[[:space:]]*fontFamily" src/app/owner/layout.tsx src/app/owner/error.tsx
# Expect: 0 hits (replaced with font-display utility)
grep -nE "font-display" src/app/owner/layout.tsx src/app/owner/error.tsx
# Expect: 2+ hits
```

### AC-B2b-08 — Acknowledge CTA 56px

```bash
# Visual + DOM verification via Playwright at execute time
npx tsx scripts/b-2b-touch-target-probe.ts \
  --route "/owner/$HARNESS_FIXTURE_OWNER_TOKEN/pay-apps/55555555-5555-5555-5555-500000000001"
# Probe asserts: [data-testid="acknowledge-pay-app-button"].computedStyle.minHeight >= 56px
# Expect: PASS at iPhone 13 Pro Max + iPhone 14/15 Pro Max + Pixel 7 viewports
```

### AC-B2b-09 — Multi-viewport mobile render

```bash
# Smoke harness run with multi-viewport flag (per F1+-4)
if [ -n "$HARNESS_FIXTURE_OWNER_TOKEN" ]; then echo "HARNESS_FIXTURE_OWNER_TOKEN: SET (len=${#HARNESS_FIXTURE_OWNER_TOKEN})"; else echo "HARNESS_FIXTURE_OWNER_TOKEN: NOT SET"; fi
npx tsx scripts/wave-d-smoke.ts \
  --preview-url "https://<vercel-preview>" \
  --viewports "iphone-13-pro-max,iphone-14-pro-max,pixel-7"
# Expect: 16 routes × 3 viewports = 48 PASS (or however the harness counts viewport replications)
# No horizontal scroll; no console errors; page heading visible
```

### AC-B2b-10 — Forward-carried AC-B2a-08 runtime revocation (LOAD-BEARING)

```bash
# Run on Vercel preview (NOT localhost — production-runtime parity per Workflow Rule 1)
npx tsx scripts/b-2b-revocation-runtime-probe.ts \
  --preview-url "https://<vercel-preview>" \
  --harness-admin-cookie "<HARNESS_ADMIN_SESSION_COOKIE>"
# Probe runs 5 steps per D-28; HALTs script on Step 4 failure.
# Expect: all 5 steps PASS.
# **If Step 4 fails: HALT B-2b before ship per nwrp209 §3 forward-carried condition.**
```

## 10. Cost projection

Per EXPANDED-SCOPE §10 + nwrp209 §17 + nwrp166 §17 per-plan halt gate (Rule 7d $50 cap):

**WARN-3 fix (plan-checker iter-1)** — Task 7-8 re-estimated to $4-6 combined (was $2-3). Reasoning: Playwright probe at Vercel preview-URL (multi-step navigate + admin POST + re-navigate + assertions) is realistically $4-6 of compute + tooling overhead, not $2-3. Total revised to $17-25 (was $15-22) — still well under $50 per-plan halt gate Rule 7d.

| Item | Estimate | Reasoning |
|---|---|---|
| Migration 00106 forward + down + types regen | $2-3 | Single partial unique index; types likely no-op |
| ActivityAction union + Records mirror + onConflictDoNothing flag | $1-2 | 2-line union extension + Record entry + LogActivityArgs flag + upsert branch; precedent from B-1a-bis + B-2a |
| /owner route + layout + error boundary (Task 3) + BLK-3 wrapper + NOTE-1 + NOTE-2 | $3-4 | 3 files (layout + error + page); DB→Caldwell mapping; `<main>` wrapper; explicit field-by-field draw map |
| /pay-apps/{id} drilldown + acknowledge CTA (Task 4) + BLK-3 wrapper | $3-4 | 1 file with full OwnerDrawView render + CTA + `<main>` wrapper |
| Acknowledge API route + middleware PUBLIC_PATHS extension (Task 5) + BLK-1 | $3-4 | Route handler + body validation + helpers + audit insert + 1-line middleware entry |
| TD-B1abis-03 ClientCombobox polish (Task 6) | $1 | ~10 line replacement; mechanical |
| Smoke harness + BLK-2 fixture seed (Task 7) | $2-3 | smoke-seed.sql Step 8 extension + orchestrator-substitution lifecycle + 2 route table entries |
| Forward-carried revocation probe + SUMMARY (Task 8) | $2-3 | Playwright 5-step probe against Vercel preview + SUMMARY scaffolding (WARN-3: realistic Playwright probe cost) |
| Plan-review iter-1 (5-reviewer LEANER scope per nwrp209 §10) | $4-6 | spec-checker + ui-reviewer + design-pushback + custodian + security-reviewer (already executed at iter-1; this revision is the iter-1 NEEDS-WORK fix per ~$2-3 revision-cycle ceiling) |
| **Total estimated** | **$17-25** | **per EXPANDED-SCOPE §10 + nwrp209 §17 ledger + WARN-3 revision** |

**Halt gate (Rule 7d):** if mid-authoring or mid-execute projection exceeds **$50**, halt + surface to Jake. **Do NOT scope-engineer to fit** (Rule 7e — scope-engineering ban; per WARN-3 explicit reminder: don't shrink probe scope to fit estimate; surface to Jake if Task 8 alone exceeds $5). B-2b is well under at $17-25; per-plan ceiling has ample headroom.

**Mid-execute checkpoint (parallel to B-2a's WARNING #2 pattern):** After Task 5 (acknowledge route + middleware extension ships), executor measures cumulative cost. If actuals exceed **$18** (i.e., 72% of $25 envelope consumed with Tasks 6-8 remaining), HALT and surface to Jake. (Per WARN-3 revised projection — trigger raised from $15 to $18 to match $17-25 total.)

**Slice-2 ceiling impact:** B-2a actual ~$28-37 + B-2b estimate $17-25 = **$45-62 of $200 Slice-2 ceiling consumed.** Remaining for B-3..B-7: $138-155 (combined EXPANDED-SCOPE §10 estimate: $115-160). Per nwrp209 §7: "deferred pace-vs-ceiling conversation" pending; B-2b ship may unlock that decision.

## 11. Rollback

**Rollback sequence (worst-case full revert):**

1. **Code revert (NOT destructive):** `git revert <B-2b commits>` — reverts /owner routes, acknowledge route, middleware extension, activity-log extension, ClientCombobox, smoke harness, fixture seed extension, migration 00106. App returns to pre-B-2b state (B-2a foundation remains live).
2. **Down migration:** `mcp__supabase__apply_migration` against `00106_*.down.sql`. Drops `activity_log_ack_dedupe_unique` index. Pre-existing `activity_log` rows untouched (index drop is non-destructive).
3. **Fixture seed cleanup (optional):** the `client_portal_access` + `draws` fixture rows added by smoke-seed.sql Step 8 are idempotent (ON CONFLICT clauses); they remain after code revert but are harmless (no orphan FK relationships, scoped to harness-fixture-org). Cleanup only if explicitly required by SECURITY posture: `DELETE FROM public.client_portal_access WHERE id = '00000000-0000-0000-0004-100000000001'; DELETE FROM public.draws WHERE id = '55555555-5555-5555-5555-500000000001';`
4. **Types regen:** re-run `supabase gen types typescript --linked` after down migration (likely no-op since 00106 didn't add columns).
5. **Env-var cleanup (optional):** `HARNESS_FIXTURE_OWNER_TOKEN` in Vercel Preview + Production is harmless on revert (no consumers post-revert); leave in place for re-ship of B-2b OR delete from Vercel dashboards if cleanup desired.
6. **Order matters:** Code revert FIRST, migration down SECOND. If migration is reverted while code still uses `'acknowledged'` action: TypeScript compile error (union doesn't include the member post-revert) — but code revert already removed those callers, so this is fine in the standard order.

**Forward-fix (preferred over rollback for most failures):**
- Discovered acknowledge endpoint regression post-ship → patch the route directly; do NOT rollback the migration (index is additive + safe).
- Discovered mobile viewport break → CSS-only forward-fix in /owner/layout.tsx + components.
- Discovered TOCTOU dedupe bypass → emergency triage; verify index is in pg_indexes; rebuild if corrupted (REINDEX CONCURRENTLY).

## 12. Dispatch authorization (halt_after: true)

Per nwrp209 §15-16 + halt_after: true: this PLAN halts at plan-review iter-1 for Jake review. Do NOT auto-/nx.

**Jake pre-/nx checklist (sign-off required on each):**

- [ ] **§6.a route + layout structure accepted.** `/owner/{token}` + `/owner/{token}/pay-apps/{id}` + standalone layout + error boundary. Logo top-left per CLAUDE.md UI rules. Latitude #2 (layout structure) confirmed.
- [ ] **§6.a Latitude #1 disposition — DB→Caldwell mapping vs component refactor: APPROVED (a) per plan-author recommendation** (preserves tenant-blind contract; minimal blast radius).
- [ ] **§6.a BLK-3 fix (plan-checker iter-1)** — data-prototype anchor applied via `<main data-prototype="...">` wrapper in page.tsx layer; tenant-blind primitives at `src/components/prototypes/Owner{Dashboard,Draw}View.tsx` UNTOUCHED per Latitude #1 (a) preservation.
- [ ] **§6.b acknowledge API route accepted.** POST /api/owner-portal/acknowledge-pay-app with anon-token-resolved + rate-limited + assertDrawBelongsToToken + append-only audit insert. NO Origin check (token-bearer auth, not cookie-session).
- [ ] **§6.b BLK-1 fix (plan-checker iter-1)** — `src/middleware.ts` PUBLIC_PATHS extended explicitly with `/api/owner-portal/acknowledge-pay-app`; existing `/api/owner-portal/acknowledge` entry does NOT cover the hyphenated route (deterministic at plan-author time; no longer deferred to execute-time verification).
- [ ] **§6.c TOCTOU dedupe migration accepted (D-19 + D-20 + B-12 closure).** Partial unique index on activity_log; ON CONFLICT DO NOTHING semantics via upsert + ignoreDuplicates=true. Latitude #6 (test pattern) — Playwright recommended.
- [ ] **§6.d Activity-log union + Record extension accepted.** 'acknowledged' action added; ACTION_LABELS mirror. 'draw' entity already in union (no addition needed).
- [ ] **§6.d WARN-2 fix (plan-checker iter-1)** — option (b) LOCKED: extend logActivity helper with `onConflictDoNothing` flag. Option (a) considered + REJECTED; rationale in §6.b Step 5. Centralizes ON CONFLICT semantics in the helper module.
- [ ] **§6.e ClientCombobox token polish accepted (D-23..D-25 + B-15 closure).** shadow-[var(--shadow-panel)] (not --shadow-popover); utility classes (not inline style).
- [ ] **NOTE-1 fix (plan-checker iter-1)** — inline `style={{ fontFamily: 'var(--font-space-grotesk)' }}` replaced with `font-display` utility on layout.tsx + error.tsx (per `tailwind.config.ts:64` mapping). Mirrors §6.e TD-B1abis-03 posture.
- [ ] **NOTE-2 fix (plan-checker iter-1)** — `mapDbDrawToCaldwell` uses explicit field-by-field map (mirroring `mapDbJobToCaldwell` precedent) — no cast.
- [ ] **§6.f Latitude #4 disposition — NwButton TD-20 vs lg=44px: APPROVED (a) per plan-author recommendation** (raw button + TD-20 exemption comment + 56px minHeight; mirrors OwnerDrawView.tsx:158-162 precedent). Iter-1 design-pushback signs off (D-31).
- [ ] **§6.g PATTERNS.md alignment accepted (B-17 RESOLVED).** §4h.3 + §2h.3 cited; no new pattern entry (D-32).
- [ ] **§6.h smoke harness extension accepted (Workflow Rule 4 + D-30 + BLK-2 fix).** 2 new route entries; selector posture `main[data-prototype='...']` (per BLK-3); fixture row seeded in smoke-seed.sql Step 8 (per BLK-2); plaintext token via HARNESS_FIXTURE_OWNER_TOKEN env (per BLK-2 + CLAUDE.md secret-presence pattern).
- [ ] **BLK-2 fix (plan-checker iter-1)** — `scripts/fixtures/smoke-seed.sql` Step 8 extension with `client_portal_access` fixture row + synthetic submitted draw; `HARNESS_FIXTURE_OWNER_TOKEN` env-var declared with canonical presence-check pattern (`if [ -n ... ]; then ... fi` per nwrp139).
- [ ] **§6.i threat model MEDIUM severity accepted.** Plan-review iter-1 reviewer set: spec-checker + ui-reviewer + design-pushback + custodian + security-reviewer (5 reviewers per nwrp209 §10 LEANER scope).
- [ ] **Latitude #3 disposition — document download UX: link list mirroring InvoiceReviewView attachments per PATTERNS.md §2h.3.** Iter-1 ui-reviewer + design-pushback confirms. If Caldwell fixtures lack signed-URL data, scope-in mocked URLs OR defer to Wave 1.1-Lite — plan-author surfaces choice.
- [ ] **Latitude #5 disposition — AC-B2a-08 runtime revocation test: Playwright headless.** Iter-1 security-reviewer confirms.
- [ ] **Latitude #6 disposition — TOCTOU test: Playwright concurrent-double-tap.** Iter-1 ai-logic-tester confirms.
- [ ] **Latitude #7 disposition — 1.5c thin wrapper cleanup (D-33): leave as design-system playground.** Iter-1 custodian confirms.
- [ ] **Cost projection at $17-25** (§10 + WARN-3 revision) within $50 per-plan halt gate (Rule 7d). If mid-execute projection exceeds $50: halt-and-surface per Rule 7d, NO autonomous bump per Rule 7c. Per WARN-3: don't shrink probe scope to fit estimate (Rule 7e scope-engineering ban).
- [ ] **GATE B-2b defined** (§8 AC-B2b-10 + nwrp209 §3 forward-carried). AC-B2a-08 runtime revocation MUST pass live on Vercel preview before B-2b ships. Rejection → iter-2 OR fresh-session re-scope.
- [ ] **N-5 multi-tenant MINOR-NOTE grep gate carried forward.** Plan-review iter-1 mechanically greps for `createServiceRoleClient|createServerSupabaseClient|tryCreateServiceRoleClient` in `src/app/owner/**` + `src/app/api/owner-portal/acknowledge-pay-app/` — must return ZERO hits. (Per B-2a §13 hand-off + multi-tenant-architect iter-1 MINOR-NOTE.)

**On Jake approval:** issue `/nx` (or equivalent dispatch). Without Jake explicit sign-off, do NOT proceed to execute.

## 13. Hand-off

After B-2b ships (post-Jake-/nx dispatch + execute + QA + smoke green + AC-B2b-10 PASS):

1. **Update MASTER-PLAN.md** — Slice-2 B-2b row → SHIPPED (date + commit ref). Note GATE B-2b PASSED (AC-B2b-10 forward-carried revocation verified live).
2. **Open SUMMARY.md** at `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2b-SUMMARY.md` with: shipped commits enumerated; AC attestation table (each AC marked PASS with verification artifact path); cost actual recorded; smoke-fixture-org canary outcome (`/owner/$HARNESS_FIXTURE_OWNER_TOKEN` rendered correctly; document downloads working OR explicitly deferred per Latitude #3 outcome); follow-ups for B-3.
3. **Update B-2a-SUMMARY.md AC-B2a-08** — flip status DEFERRED-TO-QA → PASS with verification artifact path = B-2b's `scripts/b-2b-revocation-runtime-probe.ts` output + AC-B2b-10 attestation. Forward-carried condition closed.
4. **B-3 dispatch readiness:** post-B-2b ship, B-3 becomes UNBLOCKED (per nwrp209 §7 deferred pace-vs-ceiling conversation pending). B-3 trigger function applies to B-2a's new `client_portal_access.client_id` FK shape — verify via plan-review iter-1 mechanical check.
5. **Trigger conditions for Wave 1.1-Lite items:**
   - Full Owner Portal feature set (notifications, comments, signatures) — per CONTEXT D-21 + EXPANDED-SCOPE §13 line 143.
   - Document download UX expansion (signed-URL pattern + auth gate) — if Latitude #3 surfaced limitations.
   - Owner portal email notifications — per EXPANDED-SCOPE §13 line 382.
   - PII restoration for "Your PM is [name]" surface — per EXPANDED-SCOPE Q4 line 219.
   - Token rotation cadence revisit (after first 30-60 days of real RB usage) — per EXPANDED-SCOPE §6 Q5.
   - 1.5c thin wrapper deprecation (D-33) — if production navigation drift surfaces concerns.
6. **Custodian update** to phase folder: ensure B-2b-SUMMARY.md exists; ensure all atomic commits referenced; ensure smoke artifact path recorded; ensure forward-carried AC-B2a-08 attestation cross-references both SUMMARYs.

---

**End of B-2b-PLAN.md (iter-1 authoring + REVISED 2026-05-22 post plan-checker iter-1 NEEDS-WORK).** Halts at plan-review iter-1 per `halt_after: true` and nwrp209 §10. Iter-1 scope is LEANER (5 reviewers: spec-checker + ui-reviewer + nightwork-design-pushback + custodian + security-reviewer) per nwrp209 §10; QA post-execute uses standard 7-reviewer scope per /nightwork-qa skill defaults. Plan-author latitude items #1-#7 surfaced for iter-1 disposition (5 of 7 have plan-author recommendations; #3 and #4 are dispositioned with recommendations awaiting design-pushback signoff). Forward-carried AC-B2a-08 runtime revocation is the load-bearing GATE per nwrp209 §3; AC-B2b-10 covers. No PATTERNS.md additions per B-17 RESOLVED. No new RLS surface (B-2a foundation consumed). Cost $17-25 well under $50 per-plan halt gate (per WARN-3 revision). Slice-2 ledger $45-62 of $200 ceiling post-B-2b. **Revisions applied 2026-05-22: BLK-1 (middleware PUBLIC_PATHS explicit extension); BLK-2 (smoke-seed.sql Step 8 + HARNESS_FIXTURE_OWNER_TOKEN env-var); BLK-3 (<main data-prototype="..."> wrapper in page.tsx, tenant-blind primitives untouched); WARN-1 (D-NN citations added to §6 + ACs); WARN-2 (option (b) locked); WARN-3 (cost estimate updated $17-25 + checkpoint trigger $18); NOTE-1 (font-display utility on layout.tsx + error.tsx); NOTE-2 (explicit field-by-field map in mapDbDrawToCaldwell).**
