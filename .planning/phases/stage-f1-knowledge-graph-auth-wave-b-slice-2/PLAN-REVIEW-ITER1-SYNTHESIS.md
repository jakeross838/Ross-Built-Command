# Plan-review iter-1 synthesis — B-2

**Generated:** 2026-05-20
**PLAN:** `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2-PLAN.md` (963 lines)
**Reviewers:** 9 (full Tier 1 scope per nwrp198 §21-24)
**Synthesis verdict:** **NEEDS-WORK — substantial revision required before /nx**

---

## Per-reviewer verdicts

| Reviewer | Verdict | Headline |
|---|---|---|
| spec-checker | PASS | 19/19 ACs falsifiable + verification commands; 1 W (document downloads scope) + 3 NOTE |
| custodian | PASS | Planning tree clean; MASTER-PLAN alignment confirmed |
| security-reviewer | **NEEDS-WORK** | **2 BLOCKING** + 4 HIGH + 4 MEDIUM |
| multi-tenant-architect | **REVISE** | **3 CRITICAL** + 6 WARNING (BY-CONSTRUCTION bar not met) |
| rls-auditor | **NEEDS-WORK** | **2 HIGH** + 1 MEDIUM (Jake decision) |
| ai-logic-tester | **NEEDS-WORK** | **4 BLOCKING** + 3 WARNING + 5 NOTE |
| database-reviewer | **CONDITIONAL PASS** | **2 BLOCKING** + 3 WARNING |
| design-pushback | **REVISE** | **4 CRITICAL** + 4 WARNING + 5 NOTE |
| ui-reviewer | **CONDITIONAL BLOCK** | **2 BLOCK** + 5 FLAG |

**6 of 9 reviewers returned NEEDS-WORK / REVISE / CONDITIONAL BLOCK.**

---

## Aggregated BLOCKING findings (must resolve before /nx) — 17 items

Cross-reviewer agreements noted in [brackets]. Listed by aggregate severity.

### Architecture / construction (5 items)

**B-1. Application-layer scoping is convention, not construction** [multi-tenant C-1 + ai-logic + rls-auditor]
Recommendation: introduce `getScopedOwnerPortalClient(resolvedToken)` helper in `src/lib/owner-portal/token.ts` returning pre-scoped Supabase wrapper. Eliminates "every author must remember .eq()" anti-pattern.

**B-2. client_portal_access.client_id FK lacks same-org invariant** [multi-tenant C-2]
Recommendation: composite FK `(org_id, client_id) REFERENCES clients(org_id, id)` after composite UNIQUE on `clients(org_id, id)`. OR explicit CHECK trigger + TD-B2-02 with deferral rationale.

**B-3. acknowledge-pay-app step 3 SQL not pinned** [multi-tenant C-3 + ai-logic-tester]
PLAN says "confirm draw_id belongs to token's scope" without explicit SQL. If implementer uses only `.eq('id', drawId).eq('org_id', orgId)` (missing client-scoping), intra-org cross-client leak. **Pin the SQL OR provide `assertDrawBelongsToToken(drawId, resolvedToken)` helper signature.**

**B-4. NEW invites via existing `create_client_portal_invite` RPC produce client_id=NULL** [rls-auditor W-4]
Post-B-2, the existing RPC inserts without setting new `client_id` column. Resolve route then queries `.eq('client_id', null)` → PostgREST `.is('client_id', null)` → matches ALL rows where client_id IS NULL → intra-org cross-homeowner leak. **CRITICAL.** Three options: (a) BEFORE INSERT trigger auto-populating client_id from jobs.client_id, (b) CREATE OR REPLACE the RPC to derive client_id, (c) resolve route guards against `row.client_id IS NULL`.

**B-5. /api/owner-portal/* NOT in PUBLIC_PATHS** [rls-auditor W-1]
PLAN Task 3 adds `/owner` to PUBLIC_PATHS but NOT `/api/owner-portal`. Middleware returns 401 for unauth `/api/*` requests. Anon homeowner POST /api/owner-portal/acknowledge-pay-app 401s before route handler. **One-line fix in Task 3 step 1.**

### Security (3 items)

**B-6. In-process rate-limit Map non-functional on Vercel** [security BLOCKING-1]
Vercel serverless functions are ephemeral; Map destroyed per invocation. Counter never accumulates → 5-miss threshold never reached → rate limiting effectively absent. With BLOCKING-2 timing oracle, 256-bit entropy is the only protection. **Resolution: Vercel KV (Redis-backed) OR Jake explicit acceptance that rate limiting is non-functional.**

**B-7. Partial index `WHERE revoked_at IS NULL` creates timing oracle** [security BLOCKING-2]
Revoked-token lookup misses index → seq-scan → measurably slower than valid-token lookup. Attacker can distinguish "was once valid (revoked)" from "never existed." **Resolution: full covering index + app-layer revoked_at filter, OR Jake explicit acceptance given 256-bit entropy.**

**B-8. PostgREST FK citation missing** [ai-logic BLOCKING-1]
Task 3 step 2 `.select()` strings don't cite FK constraint names per CLAUDE.md Workflow posture Rule 2. Cite `client_portal_access_client_id_fkey` + `client_portal_access_job_id_fkey`.

### Database / data correctness (3 items)

**B-9. Partial unique index expired-token gap** [database BLOCKING-1 + ai-logic NOTE]
`WHERE revoked_at IS NULL` doesn't exclude expired-but-not-revoked tokens. Expired token still occupies `(org_id, client_id)` unique slot → blocks re-invitation. **Resolution options:** (a) extend predicate `WHERE revoked_at IS NULL AND expires_at > now()`, (b) update invite creation to revoke expired-and-unreplaced first, (c) accept as known gap with TD.

**B-10. Partial unique index `(org_id, client_id)` blocks repeat clients with multiple jobs** [ai-logic NOTE-2]
Per-client per-org uniqueness blocks one client having tokens for 2 separate jobs. **Resolution: change to `(org_id, client_id, job_id) WHERE revoked_at IS NULL AND client_id IS NOT NULL`.**

**B-11. draws + change_orders job_id indexes not verified** [database BLOCKING-2]
First production queries against these tables from external path. If indexes absent, every portal page = seq scan. **Resolution: run `SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ('draws', 'change_orders') AND indexdef LIKE '%job_id%'`; add to migration 00104 if missing.**

### Logic correctness (3 items)

**B-12. TOCTOU race on acknowledge idempotency** [ai-logic BLOCKING-3]
SELECT-then-INSERT pattern races under concurrent double-tap → creates duplicate audit rows → contradicts AC-B2-08 "exactly 1 row." **Resolution: DB unique constraint `activity_log (entity_id, actor_token_id, action) WHERE action='acknowledged'` + INSERT...ON CONFLICT DO NOTHING.**

**B-13. expected_updated_at in body misleading on append-only audit** [ai-logic BLOCKING-4]
activity_log is append-only; expected_updated_at doesn't apply. **Resolution: remove from contract OR document the target table explicitly.**

**B-14. Missing filters on portal queries** [ai-logic NOTE-3 + NOTE-5]
- `.is('deleted_at', null)` not specified on draws/jobs/COs queries → soft-deleted draws would render to homeowner
- `.in('status', ['submitted', 'approved', 'paid', 'void'])` not specified → draft + pm_review draws would leak

### UI / Design (3 items)

**B-15. --shadow-popover token does NOT exist** [UI BLOCK-01 + design-pushback C-2]
Task 5 TD-B1abis-03 polish proposes non-existent token. Cost-code-combobox uses raw `shadow-2xl` (not a token). **Resolution: use `shadow-[var(--shadow-panel)]` — closest existing token.**

**B-16. NwButton has no 56px size; TD-20 exemption comment required** [UI BLOCK-02 + design-pushback C-1]
Task 4 must explicitly require TD-20 boundary exemption comment on raw button (mirroring OwnerDrawView.tsx:158-162) OR accept NwButton lg=44px with named WCAG-minimum acknowledgment.

**B-17. No new PATTERNS.md "Owner Status View" entry needed** [design-pushback C-3]
PATTERNS.md §4h.3 already documents owner portal dashboard (Dashboard pattern); §2j.3 documents draw approval detail (Document Review extension). Inventing 13th pattern violates "do not invent one-off layouts" rule. **Resolution: drop proposed new pattern + TD-B2-01; cite existing §4h.3 + §2j.3.**

---

## Cross-reviewer agreements (Rule 9 analysis)

All findings show cross-reviewer ALIGNMENT (multiple reviewers converging on same issues from different angles) — NOT factual disagreement. **Rule 9 halt-gate NOT triggered** but agreements warrant orchestrator-disposition surfacing:

- `--shadow-popover` token nonexistence: UI + design-pushback
- TD-20 exemption requirement: UI + design-pushback
- Application-layer scoping convention-vs-construction: multi-tenant + ai-logic + rls-auditor (all 3 LOAD-BEARING per nwrp198 §23)
- 90-day vs 1-year token expiration: security + rls-auditor + database (all flag as Jake-decision item)
- Partial unique index issues: database + multi-tenant + ai-logic
- Concurrent acknowledgment race: ai-logic + security (medium)
- /api/owner-portal/* PUBLIC_PATHS gap: rls-auditor (caught uniquely; warrants attention)

---

## Plan-author's flagged deviations

**Deviation 1 — 90-day vs 1-year token expiration** (still pending Jake decision per nwrp198 + iter-1 reviewers): EXPANDED-SCOPE Q5 says 1-year; existing 00074 schema is 90-day sliding window; PLAN preserves 90-day; surfaces for Jake. Multiple reviewers flagged this — Jake explicit acceptance required before /nx.

---

## Other findings (non-blocking; iter-2 carry-forward OR TD)

- spec-checker W-1: document downloads in EXPANDED-SCOPE not in PLAN scope — Jake decision (add task OR explicit OOS + TD)
- ai-logic NOTE-4: error.tsx contact-PM mailto link unclear in Next 14 layout inheritance
- ai-logic WARNING-3: no per-entity view-event audit (TD-B2-02 candidate)
- UI FLAG-01: no `src/app/owner/loading.tsx` — add or defer
- UI FLAG-02: empty draw list not handled in OwnerDashboardView — add or TD-B2-02
- UI FLAG-03: OwnerDashboardView pre-existing inline styles — TD-B2-03 candidate
- UI FLAG-04: breadcrumb back-link verification missing from Task 3 verify steps
- UI FLAG-05: Referrer-Policy in layout.tsx won't work — needs next.config.js headers()
- Multi-tenant W-1/W-3/W-4: invariant, rotation, audit-trail snapshot — TD-B2-0X candidates

---

## Recommended path forward

**Option A — REVISE-AND-RE-REVIEW (iter-2):**
1. Plan-author re-dispatched with 17 BLOCKING items + 8+ TD candidates to address
2. PLAN amended (likely +500 lines: helper construction, composite FK design, pinned SQL, regex changes, additional ACs)
3. Re-dispatch 9-reviewer iter-2 with focus on the revisions
4. Cost: ~$15-25 for amendment + iter-2 review
5. Total B-2 budget projection: $50-75 (well above $50 per-plan halt gate)

**Option B — HALT FOR FRESH SESSION (Jake authorization):**
1. Pause B-2 mid-dispatch
2. Jake reviews this synthesis + decides:
   - Resolve open Jake-decision items (document downloads, 90-day vs 1-year, etc.)
   - Authorize ceiling discussion: B-2 likely exceeds $50 per-plan halt — needs Jake bump OR scope split
   - Possibly split B-2 into B-2a (schema + token security) + B-2b (UI + audit) to fit ceilings
3. Resume next session with cleaner scope

**Recommendation:** Per CLAUDE.md Rule 7c/d (no autonomous bump; max one bump per slice) + Rule 7e (no scope-engineering), **Option B is appropriate.** The substantial revision needed + Jake-decision items + per-plan halt-gate proximity warrant Jake disposition before continuing.

---

## Cost tracking

Spent on this iter-1 cycle: ~$15-20 (plan-author + 9 parallel reviewers + this synthesis).
Remaining B-2 budget under $50 per-plan halt gate: ~$30-35.
Re-author + iter-2 estimate: ~$15-25.
**Trajectory at or above $50 halt gate.** Surface to Jake per Rule 7c.

---

**Halting for Jake disposition per nwrp198 §26.** This synthesis + 9 disk artifacts on disk. Pre-/nx review checklist heavy; many decisions deferred to Jake (document downloads scope, 90-day vs 1-year, B-1..B-17 disposition strategy).
