# Plan-review iter-1 synthesis — B-2a

**Generated:** 2026-05-21
**PLAN:** `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2a-PLAN.md` (2289 lines; commit `7198e86`)
**Reviewers:** 7 (Tier 1 HIGH-threat full scope per nwrp202 §15; NO design-pushback)
**Dispatcher:** /np orchestrator via nwrp202 RE-APPROVE chain
**Synthesis verdict:** **NEEDS-WORK** — substantial revision required before /nx; cost trajectory at or past $50 per-plan halt gate (Rule 7d)

---

## Per-reviewer verdicts

| Reviewer | Verdict | Headline |
|---|---|---|
| spec-checker | **NEEDS-WORK** | 2 BLOCKING + 1 HIGH + 2 MEDIUM. Missing `<criteria>` block (D-17/D-18 mandate); AC-B2a-06 Query 2 arg-count inconsistency |
| custodian | **PASS** | Planning tree clean; MASTER-PLAN alignment solid |
| security-reviewer | **NEEDS-WORK** | 1 BLOCKING + 1 HIGH + 1 MEDIUM. Existing `idx_client_portal_access_token_hash WHERE revoked_at IS NULL` partial index (from 00074) not addressed; 3 re-defined SECURITY DEFINER RPCs lack REVOKE/GRANT pairs; CSRF gap on admin revoke |
| multi-tenant-architect | **PASS** | BY-CONSTRUCTION verified. 1 MINOR-NOTE for B-2b plan-review awareness (`scopedFrom` is scope-floor not complete query gate) |
| rls-auditor | **NEEDS-WORK** | 0 BLOCKING + 2 WARNING + 2 NOTE. PUBLIC_PATHS comment conflation; admin revocation rate-limit IP-only |
| database-reviewer | **NEEDS-WORK** | 2 BLOCKING + 3 WARNING. §4 resolution-table for B-9 documents wrong predicate; Rule 2 FK citations inferred not verified |
| ai-logic-tester | **NEEDS-WORK** | 1 BLOCKING-CANDIDATE + 3 WARNING/NOTE. SAME timing-oracle finding as security-reviewer (Rule 9 alignment, NOT disagreement). Latitude #4 APPROVED in-scope |

**4 of 7 reviewers returned NEEDS-WORK.** 2 of 7 are PASS (custodian + multi-tenant). 1 of 7 (ai-logic) reports BLOCKING-CANDIDATE that aligns with security-reviewer's BLOCKING.

---

## Aggregated BLOCKING findings — 6 items

### B-2a-iter1-BLK-1 — PLAN missing `<criteria>` yaml block (spec-checker) [D-17/D-18 mandate]

PLAN authored 2026-05-21 (one day after stage-1.5c-verification-harness shipped). The criteria mandate requires every post-harness PLAN.md to include a `<criteria>` yaml block with 5 categories (mechanical, dom, visual, behavioral, semantic) — even if some are explicit N/A. Grep for `<criteria>` markers returns zero matches.

**Fix:** Add the block with all 5 categories. For B-2a:
- mechanical: SQL queries verifying FK shape, RPC bodies, indexes
- dom: minimum admin revocation UI verification (token list page renders, revoke button present)
- visual: N/A with nwrp202 §15 rationale (no homeowner UI; admin UI uses existing design tokens — no novel visual verification)
- behavioral: revocation flow end-to-end (admin clicks revoke → token revoked → next homeowner request 403)
- semantic: token-resolution path correctness (vision-level reasoning about helper enforcement)

### B-2a-iter1-BLK-2 — AC-B2a-06 Query 2 arg-count inconsistency (spec-checker)

AC definition text at PLAN:1845 lists only 5 arguments to `create_client_portal_invite` while the function signature requires 6 + the verification SQL at PLAN:1992-1999 is already correct (6 args). One-word fix to the AC text.

### B-2a-iter1-BLK-3 — Existing partial index `idx_client_portal_access_token_hash WHERE revoked_at IS NULL` reintroduces timing oracle on token-resolution hot path (security + ai-logic; Rule 9 alignment)

**TWO independent reviewers flagged the SAME finding from different angles (security threat model + ai-logic runtime evidence via `EXPLAIN ... SET enable_seqscan = off`):**

The PLAN's `resolveOwnerToken` helper queries `client_portal_access` filtered by `access_token_hash = hash` only — without the `revoked_at IS NULL` predicate that the existing 00074 partial index requires. Postgres CANNOT use the partial index without the predicate; falls back to seq scan for revoked-token lookups. Distinguishes "revoked" from "never existed" via measurable query timing.

**This violates nwrp202 §4 LOCKED:** "NO Jake-acceptance partial escape." The PLAN closes the timing oracle on admin-UI `(org_id, client_id, job_id)` lookups but ACTUALLY OPENS one on the token-resolution path that runs on every anon homeowner request.

**Resolution options:**
- (a) Add migration step to DROP `idx_client_portal_access_token_hash WHERE revoked_at IS NULL` and recreate as non-partial — eliminates oracle entirely.
- (b) Add `AND revoked_at IS NULL AND expires_at > now()` predicates to `resolveOwnerToken` SQL — re-introduces partial-predicate timing oracle uniformly (contradicts nwrp202 §4).
- (c) Explicit Jake acceptance per nwrp202 §4 exception (would require Rule 9 HALT for Jake authorization).

**Recommendation:** option (a). Migration step is small (~3 lines: DROP + CREATE non-partial).

### B-2a-iter1-BLK-4 — 3 re-defined SECURITY DEFINER RPCs lack REVOKE/GRANT pairs (security-reviewer)

The 3 RPCs re-defined in 00104 (`create_client_portal_invite`, `submit_client_portal_message`, `mark_client_portal_message_read`) need REVOKE/GRANT pairs in the forward migration per 00103 precedent for re-defined SECURITY DEFINER functions. The plan's T-B2a-12 mitigation claim covers only the 2 new functions (revocation API + rate-limit cleanup), violating the precedent for the 3 re-definitions.

**Fix:** Add REVOKE EXECUTE FROM public + GRANT EXECUTE TO appropriate roles for each of the 3 re-definitions in 00104.

### B-2a-iter1-BLK-5 — §4 resolution-table for B-9 cites Option C predicate while migration implements Option A (database-reviewer)

§4 resolution table row for iter-1 SYNTHESIS B-9 (expired-token gap) describes Option C partial index (`WHERE revoked_at IS NULL AND client_id IS NOT NULL AND expires_at > now()`) while actual authored migration SQL at §5:1089-1091 implements Option A (`WHERE client_id IS NOT NULL` + `revoked_seq` in tuple). Internal contradiction creates executor confusion.

Plus: B-9 expired-token re-invitation semantics under Option A (admin must explicitly revoke expired tokens before re-inviting) must be explicitly acknowledged in PLAN + AC-B2a-08.

### B-2a-iter1-BLK-6 — Rule 2 PostgREST FK citations inferred not verified (database-reviewer)

Rule 2 (CLAUDE.md Workflow posture) requires PostgREST FK citations cite the constraint by name verified against `pg_constraint`. The PLAN's citations for `client_portal_access_job_id_fkey` and `draws_job_id_fkey` are inferred from Postgres auto-naming convention but not verified.

**Fix:** Add the concrete `SELECT conname FROM pg_constraint WHERE conrelid IN ('client_portal_access'::regclass, 'draws'::regclass)` query to §9 before execute dispatch. ai-logic-tester ran the query and confirmed `client_portal_access_job_id_fkey` exists; `draws_job_id_fkey` exists. Citations are correct — but the PLAN body should include the verification query for executor visibility.

---

## Aggregated HIGH findings

### B-2a-iter1-H-1 — AC-B2a-05 timing-oracle probe methodology not pinned (spec-checker)

Defer-to-execute is unfalsifiable. Pin a concrete methodology (specific EXPLAIN query against `idx_client_portal_access_token_hash` + post-load latency assertion).

### B-2a-iter1-H-2 — CSRF gap on admin revoke POST (security-reviewer MEDIUM, escalating)

Admin revoke POST endpoint relies solely on SameSite=Lax cookie semantics. No Origin header validation. No CSRF token. For a security-LOAD-BEARING B-2a plan this is a gap.

**Fix:** Add Origin header validation OR CSRF token to admin revoke route. Document in plan body §6.d threat model.

---

## Aggregated MEDIUM/WARNING findings

### B-2a-iter1-M-1 — Latitude #3 + #4 explicit dispositions (spec-checker)

Latitude #3 (revoked_seq Option A): **APPROVED by security-reviewer + multi-tenant-architect (cross-reviewer alignment).** B + C rejected for stated reasons.

Latitude #4 (sliding-window 90→1-year in 2 RPCs): **APPROVED IN-SCOPE by security + multi-tenant + ai-logic-tester (3-reviewer cross-reviewer alignment).** ai-logic-tester verified via Q8 query that the 2 RPCs are correctly named (`submit_client_portal_message` + `mark_client_portal_message_read`; naming-error correction holds) + no other RPCs/triggers touch `expires_at` (scope-completeness CONFIRMED).

Both Latitudes resolved with no further plan-author work needed. **PLAN should be amended to record these dispositions explicitly** + remove the "ITER-1 DISPOSITION REQUIRED" markers.

### B-2a-iter1-W-1 — PUBLIC_PATHS comment conflates anon-homeowner vs authenticated-admin (rls-auditor)

PUBLIC_PATHS bare-string entry for `/api/owner-portal` has comment "admin revocation API + anon homeowner API." Mechanically correct (route handlers call `getCurrentMembership()` regardless of PUBLIC_PATHS) but conflates two different auth models. **Fix:** clarify comment distinguishing `/api/owner-portal/acknowledge` (anon, B-2b) from `/api/owner-portal/admin/*` (authenticated admin, B-2a).

### B-2a-iter1-W-2 — Admin revocation rate-limit IP-only (rls-auditor)

Admin revocation uses `recordOwnerPortalRequest('ip', requestIp)` only, not per-admin-session `'user_id'` key. A compromised admin session has no per-user revocation rate cap. **Fix:** Plan-author either explicitly accepts as known design choice (admin sessions are authenticated + optimistic-lock-bound) OR adds per-membership.user_id rate-limit key.

---

## Aggregated NOTE findings

- **multi-tenant + ai-logic (cross-reviewer alignment):** `internal_billings` → `internal_billing_types` cosmetic citation correction (constraint at 00038:41 is correct; table-name in PLAN cite is wrong by one word).
- **ai-logic:** Drummond canary (AC-B2a-13 sub-item 9) is vacuously true today — `client_portal_access` is EMPTY (0 rows across all orgs in current schema). Backfill is a no-op; canary passes silently. Fix: acknowledge vacuous OR add active probe via RPC invocation against Drummond job + cleanup.
- **ai-logic:** `draws.job_id` prose imprecision — PLAN claims "does not exist" but 2 existing partial composites lead with `job_id` (filtered on `deleted_at IS NULL`). B-2a's helpers don't include `deleted_at IS NULL` filter (deferred to B-2b) so existing composites aren't selectable; PLAN's conclusion (add unfiltered single-column index) is correct, but prose framing should acknowledge existing partials.
- **multi-tenant MINOR-NOTE:** `scopedFrom` wrapper is scope-floor enforcer not complete query gate. A B-2b author could `.or(...)` to widen scope. **For B-2b plan-review iter-1 awareness:** B-2b should add a grep-based gate blocking direct `createServiceRoleClient()` / `createServerSupabaseClient()` invocations in `src/app/api/owner-portal/**` files.
- **rls-auditor NOTE-2:** §6.d sketch shows `revoked_at: 'now()' as any` (TypeScript escape hatch); contradicts Task 7 step 4's `new Date().toISOString()` form. Plan-author should make §6.d match Task 7 (authoritative).

---

## Cross-reviewer alignments (Rule 9 — alignments not disagreements)

**No Rule 9 factual disagreements.** All cross-reviewer findings are ALIGNMENTS:

| Finding | Reviewers aligned |
|---|---|
| Timing oracle on token-resolution path | security-reviewer + ai-logic-tester (independent angles; same finding) |
| `internal_billings` vs `internal_billing_types` cosmetic | multi-tenant-architect + ai-logic-tester |
| Composite FK BY-CONSTRUCTION works | security + multi-tenant + database + ai-logic (4-reviewer) |
| Latitude #3 Option A approved | security + multi-tenant |
| Latitude #4 IN-SCOPE approved | security + multi-tenant + ai-logic |

Cross-reviewer ALIGNMENT on the timing-oracle finding is high-confidence orchestrator signal — this is a real BLOCKER, not reviewer divergence.

---

## Latitude dispositions

| Latitude | Plan-author proposal | Cross-reviewer disposition |
|---|---|---|
| #3 — `revoked_seq` column add | Option A (column + revocation versioning) | **APPROVED Option A** (security + multi-tenant; B + C rejected for stated reasons) |
| #4 — Sliding-window UPDATE 90→1-year in 2 RPCs | IN-SCOPE (NECESSARY CONSEQUENCE of nwrp200 1-year lock) | **APPROVED IN-SCOPE** (security + multi-tenant + ai-logic; scope-completeness confirmed via Q8 query) |

Both Latitudes resolved. Plan-author should update §2 to remove "ITER-1 DISPOSITION REQUIRED" markers + record approved dispositions.

---

## Cost tracking

Spent on B-2a to-date:
- Planner first pass + iter-1 revision: ~$10-14 (estimated; planner used 233k + 251k tokens)
- Plan-checker iter-1 + iter-2: ~$6-10 (estimated; checker used 176k + 100k tokens)
- 7-reviewer dispatch: ~$15-25 (estimated; varies — ai-logic SQL-heavy, security thorough, others lighter)
- Synthesis: ~$2

**Subtotal: $33-51** — **at or just past $50 per-plan halt gate (Rule 7d).**

Re-author B-2a addressing 6 BLOCKERs + 2 HIGH + multiple WARNING/NOTE: estimated +$10-15.
Re-review (subset of affected reviewers: security + database + spec-checker — others passed or unaffected): estimated +$8-12.

**Trajectory: $51-78 total — EXCEEDS $50 per-plan halt gate.** Per Rule 7d, halt-and-surface to Jake is required. Per Rule 7c, autonomous ceiling bump is BANNED.

---

## Recommended path forward (Jake decision required per Rule 7c)

### Option A — Iter-2 revision in current session (over $50 halt gate)

Plan-author fixes 6 BLOCKERs + 2 HIGH + relevant WARNING/NOTE items in B-2a-PLAN.md. Re-runs 3 affected reviewers (security + database + spec-checker; others passed or are unaffected). If iter-2 PASSES, plan ships at /nx.

**Cost projection:** $10-15 revision + $8-12 re-review = $18-27 additional. Total: $51-78.
**Risk:** EXCEEDS $50 per-plan halt gate. Requires Jake authorization per Rule 7c (no autonomous bumps).
**Pro:** B-2a ships in same session; momentum preserved.
**Con:** Discipline erosion — first time Slice-2 exceeds per-plan halt gate.

### Option B — Halt-for-fresh-session (per nwrp164 precedent)

Compile this synthesis + commit + halt B-2a. Jake reviews findings. Next session resumes with leaner context + iter-1 findings as input. Fresh session inherits clean cost ledger.

**Cost projection:** $0 additional this session. Fresh session: ~$20-30 for revision + re-review (smaller because no plan-author warmup).
**Risk:** Loss of session context (but findings are on disk).
**Pro:** Preserves $50 per-plan halt gate discipline. Aligned with Rule 7c/d posture. nwrp164 precedent ("expensive plans get halt-for-fresh-session over autonomous bump").
**Con:** Wall-clock delay.

### Option C — B-2a-rate-limit micro-plan split (per nwrp202 §3 escape valve)

Split B-2a into:
- `B-2a-core` — composite FK + RPC fix + 1-year + revocation + helpers + index posture (existing token-hash index fix) + PUBLIC_PATHS
- `B-2a-rate-limit` — DB-backed rate-limit table + cleanup + per-token+IP keys

**Cost projection:** Re-plan both = ~2x current. Probably $35-50 for both.
**Risk:** Probably not justified given the timing-oracle fix is small (~3 lines migration). Rate-limit is not the primary balloon driver here — the BLOCKERs are largely fix-in-place items.
**Pro:** Each sub-plan fits comfortably in halt gate.
**Con:** Higher total cost than (A) or (B) for this specific finding set.

### Option D — Override Rule 7d (NOT RECOMMENDED per CLAUDE.md)

Jake authorizes one-time bump of $50 per-plan halt gate to (say) $75. Iter-2 proceeds. Sets precedent that BLOCKERs surfacing late in plan-review iter-1 cycle should be addressed in-session.

**Cost projection:** $51-78 total this session.
**Risk:** Discipline erosion. Future plans cite this as precedent for bumps. Rule 7c violation if not explicit.
**Pro:** Fastest path to /nx.
**Con:** Per CLAUDE.md Rule 7c: "Plan-author + executor + reviewers cannot bump a ceiling autonomously. Bump = explicit Jake message authorizing the new ceiling with reasoning + scope."

---

## Synthesis recommendation

**Option B (halt-for-fresh-session)** per CLAUDE.md Rule 7c/d posture + nwrp164 precedent. The current session has delivered substantial value — 4 ITER-1 SYNTHESIS findings (B-1..B-11) resolved + 2 Latitudes APPROVED with cross-reviewer alignment + 6 BLOCKERs surfaced with concrete fixes + 4 cross-reviewer alignments captured. Jake reviews this synthesis, decides scope/budget for next session, then dispatches iter-2 freshly.

**Alternative defensible:** Option A IF Jake explicitly authorizes a one-time ceiling bump to ~$75 for B-2a with documented rationale (e.g., "B-2a is foundational; halt-for-fresh-session cost ~= bump cost; preserve momentum"). Per Rule 7c this is JAKE's call, not autonomous executor decision.

---

## Halt per nwrp202 §17 + /np Step 4

`halt_after: true` on B-2a frontmatter → GATE B-2a substantive Jake review required before B-2b dispatches. **This synthesis is the first GATE B-2a artifact.**

**Awaiting Jake disposition.** No /nx, no commits beyond the synthesis bundle, no autonomous next action.
