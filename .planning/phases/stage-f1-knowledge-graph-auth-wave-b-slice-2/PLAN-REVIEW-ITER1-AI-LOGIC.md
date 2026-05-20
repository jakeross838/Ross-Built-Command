# B-2 Plan Review iter-1 — AI Logic Tester (Business Logic Correctness)

**Reviewer:** nightwork-ai-logic-tester (skill: nightwork-ai-logic-checker)
**Plan:** B-2 — client_portal_access.client_id FK + Owner Portal Path A min UI
**Mode:** Plan-review iter-1 (forward-reasoning against authored plan; runtime execution deferred to QA cycle because migration 00104 is not yet shipped)
**Date:** 2026-05-19
**Verdict:** NEEDS WORK — 4 BLOCKING, 3 WARNING, 5 NOTE findings

---

## Operating contract

Per CLAUDE.md Rule 3, ai-logic-tester MUST execute representative queries for PostgREST/RLS claims. At plan-review iter-1, migration 00104 has NOT yet been applied, so runtime execution against post-apply schema is NOT YET POSSIBLE. Per the skill contract, runtime evidence requirement is DEFERRED to QA cycle ai-logic-tester (post-execute, pre-ship). This review focuses on forward-reasoning correctness of the authored logic, with explicit flags where post-apply runtime verification is REQUIRED before QA can pass.


---

## Flow 1 — Token resolution flow

### Forward reasoning (expected)

Homeowner navigates to /owner/{T} where T is the 64-char hex plaintext.

1. Next middleware matches /owner in PUBLIC_PATHS; skips getCurrentMembership gate.
2. /owner/[token]/page.tsx server component invokes validateOwnerToken(params.token).
3. Helper computes sha256_hex(T) → $hash.
4. Service-role Supabase query: client_portal_access .eq access_token_hash=$hash .is revoked_at null .gt expires_at now.
5. Zero rows: return null → notFound → error.tsx.
6. One row: return {portalAccess, client, job, orgId}.
7. Page issues 3 follow-up queries scoped to (org_id, client_id) on jobs, draws, change_orders.
8. Renders OwnerDashboardView with those props.

### Findings

**[BLOCKING-1] PostgREST FK citation missing for embedded resolution shape (Rule 2 violation).** §5 Task 3 step 2 declares the helper returns `{portalAccess, client: Pick<Client,'id'|'full_name'>, job: Pick<Job,'id'|'name'>, orgId}` — but the implementation description is a SINGLE query against client_portal_access. To populate client + job in one round-trip requires a PostgREST embedded select like `.select("*, client:clients(id, full_name), job:jobs(id, name)")`. The plan does NOT cite:
- `client_portal_access_client_id_fkey` (NEW in 00104) — resolves :clients(...) embed
- `client_portal_access_job_id_fkey` (PRE-EXISTING from 00074) — resolves :jobs(...) embed

Per Workflow posture Rule 2, missing FK citation = BLOCKING. Fix: specify the explicit .select() string + FK constraint names. Alternative: if the helper issues 3 SEPARATE queries (per-row round-trips), state this explicitly and accept the perf hit.

**[BLOCKING-2] client_id backfill leaves NULL when parent jobs.client_id is NULL → Layer 3 defense becomes no-op.** Task 1 step 2 backfills `cpa.client_id := j.client_id WHERE j.client_id IS NOT NULL`. Step 3 forward probe only RAISES if a job HAS a client_id but the cpa is NULL — it does NOT catch the case where the job's client_id is also NULL. So a cpa row whose parent job has NULL client_id will be left with NULL client_id.

§4.a Layer 3 says service-role API then issues `.eq('client_id', row.client_id).eq('org_id', row.org_id)` — but if row.client_id is NULL, `.eq('client_id', null)` in PostgREST returns rows where client_id IS NULL (NOT an empty set). That means the homeowner sees draws / jobs / change_orders for ALL records in their org where client_id is NULL. Cross-client leak vector in the failure mode.

Fix options:
- (a) Pre-apply DO block: assert `SELECT count(*) FROM client_portal_access cpa JOIN jobs j ON j.id=cpa.job_id WHERE j.client_id IS NULL` = 0 BEFORE running the backfill UPDATE. Current pre-flight in step 0 only counts harness rows.
- (b) Add NOT NULL constraint on client_portal_access.client_id post-backfill so future inserts can't recreate the vector. Conflicts with ON DELETE SET NULL semantics — resolve via ON DELETE CASCADE (delete token if client hard-deleted; soft-delete keeps client row referenced).
- (c) At minimum, validateOwnerToken refuses tokens whose row has client_id IS NULL.

**[WARNING-1] Sliding-window UPDATE on read is a write-on-GET pattern.** Task 3 step 2 says "Updates last_accessed_at + extends expires_at on successful resolution." Every page load issues an UPDATE. Acceptable per existing 00074 RPC semantics, but the rationale should be cross-referenced from §4.a to the existing migration 00074:561-562 COMMENT so future readers understand WHY a read mutates state.

**[NOTE-1] Rate-limit bucket counting (misses vs all-calls).** Plan does not specify whether per-token bucket counts ALL calls or MISSES only. If all-calls: a homeowner with a valid token making 6 page loads in 60s would be 429'd. If misses-only: typo recovery works. Specify in §4.a.

### Verdict on Flow 1: NEEDS WORK (BLOCKING-1, BLOCKING-2)

### Runtime evidence (Rule 3)

DEFERRED. Post-execute QA must:
- `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname IN ('client_portal_access_client_id_fkey', 'client_portal_access_job_id_fkey');` — expect both with REFERENCES + ON DELETE clause.
- curl /api/owner-portal/resolve with valid Drummond token; inspect JSON for client + job sub-objects populated (NOT PGRST200 errors).
- Cross-client probe: generate Drummond + harness-fixture tokens; resolve Drummond; verify response payload contains zero harness-fixture-org rows.


---

## Flow 2 — Pay-app acknowledgment flow

### Forward reasoning

Homeowner on /owner/{T}/pay-apps/{D} clicks Acknowledge.

1. Client POSTs {token, draw_id, expected_updated_at} to /api/owner-portal/acknowledge-pay-app.
2. Server validateOwnerToken → portal_access + (org_id, client_id).
3. Server confirms draw D belongs to (org_id, client_id) scope — else 404.
4. Server checks idempotency: SELECT existing acknowledged row.
5. If exists: 200 + already_acknowledged:true. No new row.
6. Else: logActivity(... action='acknowledged').
7. Returns 200 + acknowledged:true.

DB change: ONE new row in activity_log. No state change on draws (per §4.b).

### Findings

**[BLOCKING-3] Idempotency TOCTOU race condition.** Task 4 step 1 implements idempotency as SELECT-then-INSERT. Two concurrent POSTs (double-tap on mobile latency):
- T1 SELECT count=0
- T2 SELECT count=0
- T1 INSERT
- T2 INSERT
- Result: TWO duplicate audit rows for the same (token, draw_id).

Violates AC-B2-08 ("single activity_log row per token+draw_id"). Fix: add partial unique index on activity_log (entity_id, actor_token_id, action) WHERE action='acknowledged' AND actor_token_id IS NOT NULL in migration 00104, and reframe the endpoint to INSERT ... ON CONFLICT DO NOTHING. Affected-rows = 0 → return already_acknowledged:true. Closes both 1-second and 1-minute concurrent cases.

**[BLOCKING-4] expected_updated_at in body is misleading.** §4.b says optimistic locking applies; route body claims to use updateWithLock on the synthetic last_accessed_at UPDATE. But logActivity is an INSERT (audit log is append-only by design). The expected_updated_at from the client is therefore unused for the audit-log write.

Fix: remove expected_updated_at from the acknowledgment endpoint contract OR explicitly document what it locks against. If it's meant to lock against draws.updated_at (revision tracking for F6 revisions), then BLOCKING-4 cascades into Flow-2 WARNING-2 (idempotency keyed on revision). If it's meant to lock against client_portal_access.updated_at (sliding window), updateWithLock is overkill for an internal side-effect.

Recommendation: remove expected_updated_at from the contract entirely; document why (audit-log append-only; sliding-window is internal); update §4 cross-cutting "Optimistic locking" row to clarify it does NOT apply to insert-only audit operations.

**[WARNING-2] Idempotency key granularity not specified.** Plan keys idempotency on (actor_token_id, entity_id='draw', action='acknowledged'). Implications:
- Token revoked + new token issued for same client + same draw → new token CAN re-acknowledge (different actor_token_id; technically not idempotent against client identity).
- Draw revision (rev 2) shipped → homeowner CANNOT acknowledge the revision because entity_id is the same draws.id.

Alternatives:
- (actor_token_id, entity_id, action, draws.revision_number) — allows re-ack on revision.
- (client_portal_access.client_id, entity_id, action) — token-rotation-stable.

Plan must explicitly state which semantic is intended + Jake must approve. For B-2 starter posture, token-keyed is acceptable IF the revision-tracking case is documented as a Wave 1.1-Lite gap.

### Verdict on Flow 2: NEEDS WORK (BLOCKING-3, BLOCKING-4)

### Runtime evidence (Rule 3)

DEFERRED. Post-execute QA must:
- Concurrent burst: `seq 1 5 | xargs -P 5 -I{} curl -X POST .../acknowledge-pay-app -d '{token:T, draw_id:D}'`; SELECT count(*) FROM activity_log WHERE entity_id=D AND action='acknowledged'; expect 1.
- 1-second serial: confirms steady-state idempotency.
- 1-minute serial: confirms idempotency across rate-limit windows.


---

## Flow 3 — Acknowledgment idempotency at 1s + 1min repeats

### Forward reasoning

Two POSTs with same {token, draw_id}:
- Serial 1-second apart: under READ COMMITTED, second SELECT sees first INSERT committed → idempotent → returns already_acknowledged. ONE row.
- Serial 1-minute apart: same as above. ONE row.
- Concurrent (truly parallel): TOCTOU race per BLOCKING-3 → TWO rows.

### Domain sense check

Diane reviewing audit log seeing TWO "Homeowner acknowledged Draw N" entries 0ms apart looks like a bug, would file a ticket. Should never happen. A homeowner double-tapping the button (mobile network anxiety) is the COMMON case for the concurrent scenario.

### Verdict on Flow 3: BLOCKING (subsumed by BLOCKING-3)

Fix BLOCKING-3 via partial unique index + ON CONFLICT DO NOTHING.

---

## Flow 4 — Cross-client query path / deleted_at filter

### Forward reasoning

User's question: "If a client has 3 active jobs and 2 draws per job, /owner/{token} shows all 6 draws?" 

Per migration 00074 schema, client_portal_access.job_id is NOT NULL. The token is SINGLE-JOB-SCOPED, not client-scoped. ONE token = ONE job = 2 draws for that job. A client with 3 jobs would have 3 separate tokens / 3 separate /owner/{T} URLs.

### Findings

**[NOTE-2] Plan §4.a INCONSISTENT on token scope (job vs client).** §4.a Layer 3 says "resolved row carries client_id" — implies client-wide visibility. Task 3 step 3 implementation says queries scope to (org_id, client_id) — would return all jobs for that client (potentially 3 of them). But 00074 schema has job_id NOT NULL on cpa, so the token also has a single job_id.

The NEW partial unique index `(org_id, client_id) WHERE revoked_at IS NULL AND client_id IS NOT NULL` BLOCKS issuing more than one active token per (org, client) — meaning a client with 3 jobs can only have ONE active token, and the admin must revoke + reissue to switch which job the homeowner views.

Most Ross Built clients have ONE active job at a time, but Lee Worthy / Bob Mozine likely have repeat clients with multiple jobs (Anna Maria Island has a small client pool). Plan-author should clarify intent.

Fix: partial unique index should be `(org_id, client_id, job_id) WHERE revoked_at IS NULL AND client_id IS NOT NULL` — uniqueness keyed on (client, job) tuple. Otherwise a homeowner with 2 jobs gets blocked from receiving the second job's token. Domain-semantic correctness bug.

Also: Task 3 step 3 should scope queries to (org_id, client_id, job_id) OR (org_id, job_id) — NOT (org_id, client_id) alone. Otherwise the homeowner with 3 jobs sees all 3 in their portal, which is potentially correct (client-portal-wide view) OR wrong (token-per-job semantics) depending on intent. Plan must pick.

**[NOTE-3] .is('deleted_at', null) filter NOT specified on queries.** Task 3 step 3 lists queries on jobs / draws / change_orders with (org_id, client_id) filter. Does NOT mention .is('deleted_at', null). Per CLAUDE.md soft-delete rule, every tenant query must add it. A soft-deleted draw (voided by accounting) would surface to the homeowner.

Drummond fixture probably has no deleted rows so manual testing won't catch. Fix: explicit .is('deleted_at', null) on every query in Task 3 step 3 + AC asserting soft-deleted draw set to deleted_at=now does NOT appear in /owner/{token}.

### Verdict on Flow 4: NEEDS WORK (NOTE-2, NOTE-3)


---

## Flow 5 — Token expiration logic at 90-day boundary

### Forward reasoning

Token T issued at T0 with expires_at=T0+90d. Sliding-window UPDATE on every successful resolution extends expires_at=now+90d. So expiration is "90 days of INACTIVITY," not "90 days since issuance."

Mid-session boundary:
- Homeowner loaded /owner/{T} at T-5min, resolution succeeded, expires_at extended to now+90d.
- 90 days pass with NO further interaction (closed tab, traveled, forgot).
- Homeowner clicks Acknowledge at T-90d-5min. The acknowledge endpoint calls validateOwnerToken. Filter .gt(expires_at, now) → zero rows → null → 404.

### Findings

**[NOTE-4] No grace period; error boundary needs contact-PM path.** Plan does NOT provide a grace window. Per §4.a the generic-error message is correct (no timing oracle on expiration vs revocation). But Task 3 step 6 says error.tsx renders only "Your portal link is no longer valid. Please contact your project manager." — without a clickable mailto/contact link, the homeowner has no recourse path.

Layout footer's mailto would NOT render in error.tsx if Next.js shows error.tsx WITHOUT the layout — verify Next 14 error boundary semantics. Task 3 step 6 should explicitly include a contact-PM mailto link in error.tsx, NOT rely on layout inheritance.

### Domain sense check

Hard cutoff at request time is correct. Generic error message is correct (no leak). Adding contact-path = correct posture.

### Verdict on Flow 5: PASS with NOTE-4 documentation

---

## Flow 6 — Audit integration (view-events vs acknowledged-events)

### Forward reasoning

Plan §4.b says ONE action ('acknowledged') as audit-integration probe. No view-event logging.

Implication: a homeowner can browse extensively without ANY audit trail of their reads. Only audit row appears on explicit Acknowledge click. last_accessed_at on the cpa row gives a single "last touched" timestamp per token, NOT per-entity-view.

### Findings

**[WARNING-3] No per-entity view-event audit = no proof-of-delivery.** From cost-plus open-book transparency POV, "homeowner accessed Pay App N on date X" is a useful signal — especially for AIA G702 dispute scenarios where the contractor needs to prove the homeowner saw the pay app before approving the next one.

Questions answerable: "when did homeowner last touch the portal?" (via last_accessed_at).
Questions NOT answerable: "which specific draws did the homeowner view, and when?"

For B-2 minimum viability this is acceptable. But should be flagged as TD-B2-02 for Wave 1.1-Lite. Currently no such TD opened in §13 Hand-off.

Recommendation: open TD-B2-02 "Per-entity view-event audit for owner portal" as Wave 1.1-Lite candidate.

### Domain sense check

Diane sees explicit acknowledged-actions only. From her POV sparse but unambiguous. Lack of view-events is invisible to her until needed (G702 dispute scenario — Drummond contests Pay App 8 was ever delivered, Diane needs timestamps).

### Verdict on Flow 6: PASS with WARNING-3 (open TD)

The 1 audit action is well-scoped. View-event omission acceptable for B-2 but should be tracked.


---

## Flow 7 — Draw status visibility rules

### Forward reasoning

Task 3 step 3 queries draws with .eq(org_id, $).eq(client_id, $) and (per Flow 4 NOTE-3) MUST also .is(deleted_at, null). NO further status filter is specified.

OwnerDashboardView filters by d.status==='paid' (paidToDate), d.status==='submitted'||'pm_review' (drawsAwaitingApproval), and renders all statuses as badges.

### Findings

**[NOTE-5] Draft + rejected draws would surface to homeowner.** With NO status filter at query layer, a draft draw (PM-only WIP) or void draw (rescinded pay-app) would appear in the homeowner's dashboard.

Per Ross Built cost-plus open-book: homeowner SHOULD see actioned draws (including void — contractor sent then withdrew, homeowner has right to know). But DRAFT draws are PM-only WIP and should NOT be visible (premature exposure of "I'm thinking about billing you this much" creates negotiation problems).

CLAUDE.md draws status enum: draft | pm_review | approved | submitted | paid | void. Plan picks none explicitly. PM-defense intent likely: homeowner sees draws in {submitted, approved, paid, void} (externally-visible states). pm_review is internal PM-side review — probably should NOT be visible to homeowner.

Fix: Task 3 step 3 must specify .in('status', ['submitted', 'approved', 'paid', 'void']) (or equivalent .neq('status', 'draft').neq('status', 'pm_review')). Add AC asserting draft + pm_review draws are NOT visible to homeowner.

### Domain sense check

Andrew (Director of Pre-Construction/Finance) reviewing homeowner-visible data: would NOT want draft draws (working numbers) to appear. Would also not want pm_review draws (still PM-side). Would want submitted + approved + paid + void to be visible.

Cost-plus open-book: "everything ACTED ON is visible" — drafts are not actioned.

### Verdict on Flow 7: NEEDS WORK (NOTE-5)

---

## State machine integrity

B-2 doesn't introduce new state transitions on draws, change_orders, jobs. Acknowledgment does NOT mutate draw.status per §4.b ("No state mutation on the draw itself").

New ActivityAction literal 'acknowledged' is added but has no state-machine semantics — purely an audit signal.

**State machine check: PASS** (no new transitions; existing transitions untouched).

---

## Construction-domain sense check

- **Diane (accounting):** would accept "Homeowner (via portal link) acknowledged Draw N" entries. Would NOT accept duplicates (BLOCKING-3) or missing entries (BLOCKING-1 cascade). Would expect draft draws invisible (NOTE-5).
- **PM:** would accept token-based access. Would NOT want homeowner to see in-flight pm_review draws (NOTE-5).
- **Homeowner (Drummond):** single URL showing job status, pay-app history, approved CO totals, document downloads. Plan covers this. Mobile-first is correct (Anna Maria Island seasonal residents; phone primary device).
- **Lee (owner):** "homeowner viewed their portal N times this month" KPI would be useful (WARNING-3 highlights gap).
- **AIA G702/G703 alignment:** acknowledgment is homeowner-side signal NOT mapped to AIA. AIA "received" stamp is PM's notation, not homeowner's. Plan correctly avoids mutating draw state.
- **Drummond reality check:** Drummond Pay App 8 was approved + paid in production. If backfilled into the portal, homeowner sees 8 paid pay-apps, 1-2 in-flight, approved CO total. Matches paper folder review.

---

## Edge cases (skill checklist)

| Case | Coverage | Status |
|---|---|---|
| Zero values | acknowledgment no-op on state; N/A | N/A |
| Negative values | N/A | N/A |
| Empty collections | OwnerDashboardView fixture-empty rendering inherited from 1.5c | covered |
| Boundaries | 90-day expiration (Flow 5 NOTE-4) | documented |
| Concurrent edits | acknowledgment TOCTOU (BLOCKING-3) | BLOCKING |
| Soft-deleted upstream | clients soft-deleted but cpa references deleted row — service-role filter still works but homeowner sees data for "deleted" client (no admin notice) | NOTE-worthy |
| Revisions | acknowledgment idempotency may block re-ack of revised draw (WARNING-2) | WARNING |
| Locked records | submitted draws locked per CLAUDE.md; ack doesn't mutate, no lock concern | covered |
| Tenant boundary | Layer 3 + Layer 4 verified at code-design level; runtime probe deferred to QA | covered with deferral |


---

## Runtime evidence (Rule 3) — DEFERRED to QA cycle

Migration 00104 has NOT yet shipped at plan-review iter-1. Rule 3 runtime-execution contract is DEFERRED to QA cycle ai-logic-tester (post-execute, pre-ship).

| Claim | Required runtime evidence |
|---|---|
| FK client_portal_access_client_id_fkey resolves PostgREST embed | execute_sql pg_get_constraintdef + curl /api/owner-portal/resolve inspecting JSON has client + job sub-objects |
| Anon-role has zero policies on client_portal_access | SELECT policyname FROM pg_policies WHERE tablename='client_portal_access' AND 'anon'=ANY(roles) → 0 rows |
| Cross-client query blocked by service-role filter | Generate Drummond + harness-fixture tokens; resolve Drummond; payload contains zero harness-fixture rows |
| Acknowledgment idempotency under concurrency | 5 parallel POSTs; activity_log count=1 |
| Soft-deleted draw filter | UPDATE one draw SET deleted_at=now; reload /owner/{token}; draw NOT in payload |
| Draft draw status filter | Insert draft draw for Drummond; reload portal; draft NOT in payload |

Plan-review iter-1 verdict on Rule 3 compliance: the plan documents the right ACs but verification steps must be tightened with these explicit runtime probes.

---

## Summary of findings

| ID | Severity | Flow | Summary |
|---|---|---|---|
| BLOCKING-1 | BLOCKING | 1 | PostgREST FK citation missing (Rule 2); validateOwnerToken resolution shape unclear |
| BLOCKING-2 | BLOCKING | 1 | client_id backfill leaves NULL when parent jobs.client_id NULL → Layer 3 defense becomes no-op (cross-client leak vector) |
| BLOCKING-3 | BLOCKING | 2,3 | Acknowledgment TOCTOU race → duplicate audit rows on concurrent double-tap |
| BLOCKING-4 | BLOCKING | 2 | expected_updated_at in body misleading; contract should remove or document |
| WARNING-1 | WARNING | 1 | Sliding-window UPDATE on read; needs explicit rationale comment |
| WARNING-2 | WARNING | 2 | Idempotency key granularity (token vs client vs revision) not specified |
| WARNING-3 | WARNING | 6 | No per-entity view-event audit; open TD-B2-02 for Wave 1.1-Lite |
| NOTE-1 | NOTE | 1 | Rate-limit bucket counts misses-only vs all-calls not specified |
| NOTE-2 | NOTE | 4 | Partial unique index (org_id, client_id) blocks repeat clients with multiple jobs; should be (org_id, client_id, job_id) |
| NOTE-3 | NOTE | 4 | .is(deleted_at, null) filter NOT specified on owner-portal queries |
| NOTE-4 | NOTE | 5 | error.tsx needs explicit contact-PM mailto link (verify Next 14 layout inheritance) |
| NOTE-5 | NOTE | 7 | Draw status visibility filter undefined; draft + pm_review draws would leak to homeowner |

---

## Verdict: NEEDS WORK

**Cannot proceed to /nx without resolving:**
- BLOCKING-1 (PostgREST FK citation + resolution-shape specification)
- BLOCKING-2 (backfill leak vector + NOT NULL or app-layer refusal)
- BLOCKING-3 (TOCTOU via partial unique index + ON CONFLICT)
- BLOCKING-4 (expected_updated_at contract clarification)
- NOTE-2 (partial unique index granularity for repeat clients)
- NOTE-3 (deleted_at filter omission)
- NOTE-5 (draw status visibility filter)

**Recommended path forward:**
1. **Author plan amendment** addressing all 4 BLOCKING + NOTE-2/3/5 (changes affect migration 00104, Task 3 step 3 queries, Task 4 step 1 logic, ACs).
2. **Add 4 new ACs:**
   - AC-B2-20: .is(deleted_at, null) filter on all owner-portal data queries; soft-deleted entities not visible.
   - AC-B2-21: .in(status, [...]) filter excludes draft + pm_review draws from homeowner view.
   - AC-B2-22: Partial unique index on activity_log for acknowledgment idempotency; ON CONFLICT DO NOTHING in insert path.
   - AC-B2-23: Concurrent burst probe: 5 parallel POSTs result in exactly 1 activity_log row.
3. **Update plan §9 verification commands** with concurrent-burst probe + soft-delete probe + draft-draw probe.
4. **Open TD-B2-02** (view-event audit; Wave 1.1-Lite) per WARNING-3.
5. **Re-submit to plan-review iter-2** with resolutions.

**Estimated additional cost:** $4-8 for amendments + re-review (within existing $25-40 projection if Jake authorizes). Does NOT push past the $50 per-plan halt gate (Rule 7d).

