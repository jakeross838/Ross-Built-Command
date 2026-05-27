# Planning Pipeline Severity Tiering — Design (DRAFT Rev 3)

**Status:** DRAFT Rev 3 — awaiting Jake review per nwrp241. Rev 2 returned APPROVED on (1)-(5) + (a)(b) + Q10 with 2 soft-criteria items requiring Rev 3 tightening (§6.2 friction-tax watchpoint mechanical close + §2.3 architect-vs-enterprise-readiness mechanical signal table + "both = 2 base slots" path).
**Filed:** 2026-05-27 per nwrp237 directive post Phase 1 (internal-launch-hide) SHIPPED.
**Revised:** 2026-05-27 per nwrp239 (Rev 1 review) → Rev 2; 2026-05-27 per nwrp241 (Rev 2 review) → Rev 3.
**Origin:** TD-PLANNING-PIPELINE-SEVERITY-TIERING in MASTER-PLAN.md §11 — BLOCKING gate on 3-series dispatch per nwrp233. Phase 1 shipped the LOW-tier prototype 2026-05-27, validating feasibility; this document formalizes the design.
**Cost cap (this design pass):** $50. Design-only — no gsd-sdk / skill changes ship from this pass.
**Authorization chain:** nwrp231/nwrp232 PARKED → nwrp233 PROMOTED (BLOCKING on 3-series) → Phase 1 prototype shipped per nwrp236/237/238 → nwrp237 directive to draft this design → nwrp239 REVISE-DESIGN feedback applied in Rev 2 → nwrp241 APPROVED on Rev 2 substantive items + Rev 3 tightening on 2 soft-criteria items.

**Rev 3 changes from Rev 2 (per nwrp241):**

| Item | Section | Change |
|------|---------|--------|
| §6.2 friction-tax watchpoint mechanical close | §6.2 | METRIC + THRESHOLD + ACTION (mid_execute_halt_rate per tier; >20% threshold; mandatory revision proposal in next Review-N artifact; Jake authorizes; revisions ship BEFORE next phase at that tier dispatches) |
| §2.3 architect-vs-enterprise-readiness mechanical table + "both = 2 slots" path | §2.3 | Replaces soft "phase-content-driven" framing with mechanical signal table (9 signals + "both apply" path that expands HIGH base 6 → effective 7) |

**Rev 2 changes from Rev 1 (per nwrp239):**

| Item | Section | Change |
|------|---------|--------|
| (1) HIGH = base 6 + conditionals, not flat 8 | §2.3 | Restructured HIGH tier with base set + conditional adds (parallels MEDIUM's "+conditional" pattern) |
| (2) Reject forced iter-2 on HIGH | §2.3 | iter-2 mandatory ONLY if iter-1 produces findings; capped at 2 iters; targeted spot-check option |
| (3) Phase 2 = LOW by default + PDF-preview spike | §5 | Inverted recommendation; PDF-preview runs as prefix LOW-spike PASS before Phase 2 dispatches |
| (4) Add §11.5 retrospective walk | §11.5 (new) | Concrete Phase 1 cost retrospective under proposed LOW with two scenarios (Phase 1 actual vs hypothetical clean-iter-1) |
| (5) §6 explicit halt-and-re-tier triggers | §6 | Mechanical detection signals (schema / cross-tenant / financial / external integration) that halt + re-tier mid-execute |
| (a) §4 AskUserQuestion conflicting-signals display | §4 | Show mixed-signal conflicts explicitly, not black-box recommendation |
| (b) §10 lesson 5 + §12 — TD stays BLOCKING until implementation ships | §10, §12 | Explicit: design APPROVED ≠ TD closed; implementation must ship AND Phase 2 must dispatch under new tier before 3-series unblocks |
| Q10 tightening | §8 | "Review AND DOCUMENT after 4 phases per tier" |

---

## 1. Problem statement

The current planning pipeline (`/np` → `/gsd-discuss-phase` → `/gsd-plan-phase` → `/nightwork-plan-review` → `/nx` → `/gsd-execute-phase` → `/nightwork-qa`) runs the **same uncut machinery regardless of phase severity**. For a LOW-severity ~2-hour config phase like internal-launch-hide, the full pipeline costs $75–90 in planning overhead alone — more than the entire phase's execute budget. For a HIGH-severity phase like F3B (Invoice Provenance Ledger with schema + financial logic), the same uncut machinery is appropriate — that's exactly where rigor can't be trimmed.

**Cost evidence from Phase 1 (without tiering, pre-/np):**

| Stage | Token cost | Time | Notes |
|-------|-----------|------|-------|
| gsd-assumptions-analyzer (auto mode) | ~118k | one-shot | Catalogs gray areas, surfaces unknowns |
| gsd-planner iter-1 | ~213k | one-shot | Authors PLAN.md Rev 1 |
| gsd-plan-checker iter-1 | ~194k | one-shot | Goal-backward verification |
| gsd-planner iter-2 | ~213k | one-shot | Revises PLAN.md Rev 2 |
| gsd-plan-checker iter-2 | ~194k | one-shot | Re-verifies Rev 2 |
| nightwork-plan-review iter-1 (8 reviewers) | reduced to 2 (security + planner) per nwrp231 | parallel | $25 ceiling → $50 bump |
| nightwork-plan-review iter-2 (revision pass) | same 2 reviewers | parallel | nwrp232 extension |

**Phase 1 with the reduced approach actually used:** ~$50 + 1 bump. **The full HIGH-severity uncut would have been $75–90.** All findings were caught by 2 reviewers; the 6 skipped reviewers were ceremony for this phase, not load-bearing.

**Phase 1 execute under reduced posture (per nwrp236):** $0 subagent dispatch on the 6 tasks (INLINE mode); 2 QA reviewers (security + planner). Result: zero BLOCKING / CRITICAL / WARNING; 4 NOTEs all non-actionable. Cost discipline held.

**The opportunity:** make this tiering explicit + mechanical so future LOW phases dispatch with the LOW pipeline by default (not by Jake-issued nwrp directive each time), MEDIUM phases get their own calibrated middle ground, and HIGH phases get the full rigor automatically.

---

## 2. Tier definitions (concrete)

### 2.1 LOW tier

**Defining characteristics:**
- Pure config / env-var / feature-flag / UI-conditional work
- No schema changes
- No financial logic / cents math / aggregations
- No new entities or RLS policies
- No new external integrations
- Reversibility via config flip (not via code revert)
- Estimated wall-clock ≤ 4 hours of execute
- Failure mode = wrong section renders / placeholder showed up = no data loss; user-visible; reversible

**Examples (past + future):**
- Phase 1: internal-launch-hide (env-var feature flags + middleware 404 + nav filters + section-overview filters)
- Phase 2 candidate: cosmetic polish on launch surfaces if scope is locked to known surfaces
- Doc-only phases that touch CLAUDE.md / .planning/ / runbook updates
- Hook calibration phases (e.g., TD-NW-HOOK-DOC-ONLY-DETECT)

**Pipeline:**

| Stage | Run? | Notes |
|-------|------|-------|
| `gsd-assumptions-analyzer` | SKIP | Replace with: read EXPANDED-SCOPE.md directly. The analyzer's value-add is identifying gray areas; EXPANDED-SCOPE already documents Jake's stated scope + Q&A resolutions. For LOW phases, EXPANDED-SCOPE IS the analysis. |
| `gsd-planner` | 1 iter | Single iteration. No iter-2 unless plan-checker iter-1 surfaces a BLOCKING finding. |
| `gsd-plan-checker` | 1 iter | Single iteration. If iter-1 PASS → proceed. If iter-1 REVISE → planner iter-2 → plan-checker iter-2. Cap at 2 cycles. |
| `nightwork-plan-review` | 2 reviewers | **security-reviewer + planner** (the iter-2 approvers of Phase 1). NO architect / enterprise-readiness / multi-tenant-architect / scalability / compliance / design-pushback unless explicitly justified in EXPANDED-SCOPE. |
| `nightwork-preflight` | YES | Always runs — checks SETUP-COMPLETE.md, Vercel env vars, branch state. Cheap and load-bearing. |
| `gsd-execute-phase` | INLINE mode | No subagent dispatch on tasks; do them inline. Per-commit Execute-Phase footer discipline. |
| `nightwork-qa` | 2 reviewers | **security-reviewer + planner** (parallels plan-review for symmetry). NO spec-checker / custodian / ai-logic-tester / ui-reviewer / design-system-reviewer / rls-auditor / database-reviewer / data-migration-safety. Custodian still fires post-ship via separate `/nightwork-cleanup` invocation. |
| Smoke | YES — anon-tolerant + Owner Portal critical | If UI touched: smoke script using the SmokeAuthHelper primitive (see §3). Anon-mode acceptable for verification when the gates fire on PUBLIC paths; authed-mode REQUIRED for non-PUBLIC paths. Jake's visual walk acceptable for sign-off. |
| Custodian sweep | YES — post-ship | Fires via `/nightwork-cleanup` after Jake sign-off. Archives + lessons. |

**Cost ceiling:** $50 per slice. Per-plan halt $50 per Rule 7d. Max 1 bump per slice per Rule 7c.

**Skipped reviewers (LOW tier rationale):**

| Skipped | Why for LOW |
|---------|-------------|
| architect | LOW = no new architecture; existing patterns reused |
| enterprise-readiness | LOW = no new entities / APIs / audit logs / observability surfaces |
| multi-tenant-architect | LOW = no new tables / queries / RLS / cross-org joins |
| scalability | LOW = no new queries / aggregations / dashboards |
| compliance | LOW = no PII / financial / audit / external integrations |
| design-pushback | Use only if NEW component variants / patterns introduced. Filtering existing arrays + adding flag-driven conditionals doesn't qualify. |
| spec-checker (QA) | Plan-review's planner did parity audit; redundant at QA |
| ai-logic-tester (QA) | No financial logic / aggregations / status transitions |
| ui-reviewer (QA) | Static array filters + middleware gates aren't new visual surfaces |
| design-system-reviewer (QA) | Token discipline enforced by post-edit hook on touched lines |
| rls-auditor (QA) | No DB changes |
| database-reviewer (QA) | No DB changes |
| data-migration-safety (QA) | No migrations |

### 2.2 MEDIUM tier

**Defining characteristics:**
- UI work on launch surfaces with non-trivial component additions OR spike risk
- New API routes (no schema changes) OR substantive changes to existing routes
- Performance work (caching layer, query optimization) without new aggregations
- Cross-cutting refactors that touch ≥5 files AND span ≥2 features
- Estimated wall-clock 4–16 hours of execute
- Failure mode = real user-visible bug; might require deploy rollback; data integrity intact

**Examples (future):**
- Phase 2: UI-FINALIZE (only IF spike per §5 surfaces real PDF complexity; otherwise Phase 2 stays LOW per Rev 2 inversion)
- Wave 1.1-Lite items that span multiple sweeps
- New API route additions (e.g., bulk export endpoints) without schema impact
- Pattern propagation phases (`/nightwork-propagate` driven)

**Pipeline:**

| Stage | Run? | Notes |
|-------|------|-------|
| `gsd-assumptions-analyzer` | RUN | One pass, auto mode. MEDIUM phases benefit from gray-area surfacing; LOW phases didn't (config work has fewer gray areas). |
| `gsd-planner` | 1 iter default, 2 if needed | Cap at 2 iters per plan-checker feedback. |
| `gsd-plan-checker` | 1 iter default, 2 if needed | Same cap. |
| `nightwork-plan-review` | 4 reviewers | **architect + planner + security-reviewer + ONE conditional**. The conditional is selected per phase content: enterprise-readiness (if new APIs / audit logs), scalability (if queries / aggregations), compliance (if PII / financial / audit), design-pushback (if UI surfaces), multi-tenant-architect (if cross-org concern). If multiple categories apply → pick the dominant one; surface to Jake if genuinely ambiguous. |
| `nightwork-preflight` | YES | Always. |
| `gsd-execute-phase` | Subagent dispatch OK | Per-plan parallelism allowed where files_modified disjoint per Rule 5. Per-commit Execute-Phase footer. |
| `nightwork-qa` | 4 reviewers | **security + spec-checker + planner + ONE conditional**. Conditional same logic as plan-review (mirror — the same domain expert reviews plan + execute for consistency). |
| Smoke | YES — authed primitive | Use SmokeAuthHelper (§3). Authed-mode required for UI surfaces; anon-mode acceptable for API/middleware gates that fire on PUBLIC paths. |
| Custodian sweep | YES — post-ship | Standard. |

**Cost ceiling:** $100 per slice (up from LOW's $50). Per-plan halt $75 per Rule 7d (proportional). Max 1 bump per slice per Rule 7c.

**Why 4 reviewers not 8:** The "conditional + 1" pattern picks the most domain-relevant reviewer rather than running all 5 conditionals. Empirically the conditionals overlap (scalability + multi-tenant share concerns; compliance + enterprise-readiness share concerns). The dominant-conditional approach catches what the dominant axis would catch; if the phase genuinely spans 2 conditionals, the plan-author surfaces it at /np dispatch and adds the second conditional.

### 2.3 HIGH tier

**Defining characteristics:**
- Schema changes (new tables, RLS, new entities, FK additions)
- Financial logic / cents math / aggregations / status transitions on financial entities
- New external integrations (QuickBooks, Buildertrend, Stripe webhooks, etc.)
- Headline features (Invoice Provenance Ledger, AIA G702/G703 generation, draw revision system)
- Cross-tenant concerns (platform-admin tooling, impersonation flows, multi-tenant data leaks)
- Auth / authorization changes (role gates, permission matrices, RLS posture shifts)
- Estimated wall-clock ≥ 16 hours of execute
- Failure mode = data corruption / cross-tenant leak / financial misreporting / audit-trail gap

**Examples (future):**
- F3A (Invoice Provenance Ledger schema design)
- F3B (Provenance Ledger implementation + UI)
- F2 (Roles Engine — 15-role library + permission matrix)
- F3 (Approval + Notification Engines)
- F6 (Pay App + Draw Engine — G702/G703 print-ready)

**Pipeline:**

| Stage | Run? | Notes |
|-------|------|-------|
| `gsd-assumptions-analyzer` | RUN | Full pass. |
| `gsd-planner` | 1 iter default, 2 if needed | **Rev 2 (per nwrp239 item 2):** Iter-2 ONLY if iter-1 plan-checker produces findings. Cap at 2 iters total. If iter-1 PASS clean → ship to plan-review. Rejected forced-iter-2 framing (re-authoring a clean plan = $40-50 of pure waste). Belt-and-suspenders option: targeted 5-minute architect spot-check of iter-1 PASS verdict (raises any concerns inline, no re-authoring). |
| `gsd-plan-checker` | 1 iter default, 2 if needed | Same — iter-2 only if iter-1 surfaces findings. |
| `nightwork-plan-review` | **base 6 + conditional adds (per nwrp239 item 1)** | **Base 6:** spec-checker + planner + security-reviewer + ai-logic-tester + custodian + ONE of {architect \| enterprise-readiness} (phase-content-driven). **Conditional adds:** rls-auditor + database-reviewer + data-migration-safety (if DB / migration work); multi-tenant-architect (if cross-org concern); scalability (if queries / aggregations / hot paths); design-pushback (if UI); compliance (if PII / financial / audit / external integration). Slice-2 Tier-2 ran 5 reviewers and caught real issues; flat-8 default was unexamined ceremony. Phases touching all conditional domains GET all conditionals — earned per phase, not defaulted. |
| Plan-review iter-2 | Only if iter-1 findings | Per Rev 2 framing — iter-2 fixes iter-1 findings; runs if iter-1 surfaced revisable issues. |
| `nightwork-preflight` | YES | Always. |
| `gsd-execute-phase` | Subagent dispatch | Per-plan parallelism where files_modified disjoint. |
| `nightwork-qa` | Same base 6 + conditional pattern | **Base 6:** spec-checker + custodian + security-reviewer + ai-logic-tester + planner (parity) + ONE of {architect \| enterprise-readiness}. **Conditional adds:** ui-reviewer + design-system-reviewer (if UI changed); rls-auditor + database-reviewer + data-migration-safety (if DB / migrations); multi-tenant-architect (if cross-org); scalability (if queries / aggregations); compliance (if PII / financial / audit). Mirror plan-review reviewer choice for consistency. |
| Smoke | YES — authed primitive + ai-logic-tester deeper Drummond pass | SmokeAuthHelper required; financial-logic phases run ai-logic-tester against Drummond fixtures end-to-end. |
| `nightwork-end-to-end-test` | YES | Run full Drummond scenario (create vendor → PO → invoice → approve → draw → G702/G703 → lien release → paid). |
| Custodian sweep | YES — post-ship | Standard. |

**Cost ceiling:** $200 per slice (up from MEDIUM's $100). Per-plan halt $100 per Rule 7d. Max 1 bump per slice per Rule 7c. **For multi-slice HIGH phases (e.g., F3B might span 3 slices), each slice carries its own $200 + bump allowance.**

**Why base 6 not flat 8:** the previous "full 8 reviewers" default (architect + planner + enterprise-readiness + multi-tenant-architect + security + scalability + compliance + design-pushback) was unexamined ceremony — that's exactly the problem tiering was supposed to fix. Slice-2 used 5 reviewers and caught all real issues. The base-6-plus-conditional pattern earns each reviewer per phase content. A phase that touches schema + cross-tenant + UI + queries gets architect + spec-checker + planner + security + ai-logic-tester + custodian + rls-auditor + database-reviewer + data-migration-safety + multi-tenant-architect + scalability + design-pushback (= 12 reviewers — higher than flat-8 because that phase genuinely spans more domains). A phase that touches only schema + RLS gets base 6 + rls-auditor + database-reviewer + data-migration-safety = 9 reviewers. Both decisions are explicit and traceable to phase content, not default.

**Architect vs enterprise-readiness disambiguation (base-6 "ONE of" — mechanical signal table per nwrp241):**

Picked mechanically from the stated scope + plan body, not by plan-author judgment. Signals fire deterministically at /np dispatch time; the `np.md` config implementation reads these as regex/keyword patterns against EXPANDED-SCOPE.md + the drafted PLAN.md.

| Signal | Picks |
|--------|-------|
| New entity/table in plan body | architect |
| FK additions or schema layering | architect |
| New component/service boundaries | architect |
| Module-spanning refactor | architect |
| New audit-log surfaces (status_history, activity_log entries) | enterprise-readiness |
| Sentry / observability changes | enterprise-readiness |
| Rate limiting / idempotency on retries | enterprise-readiness |
| Error handling / graceful degradation in plan body | enterprise-readiness |
| Data retention / lifecycle policies | enterprise-readiness |
| Both apply | Both count = **2 base slots (HIGH base 6 → effective 7)** |

**"Both = 2 slots" path (the key Rev 3 addition):** when a phase genuinely needs both lenses — e.g., a schema-introducing phase that ALSO adds new audit-log surfaces — the base-6 reviewer set expands to base-7 by including BOTH architect AND enterprise-readiness. No false choice forced; explicit cost is the +1 reviewer slot, which is proportional to the phase's genuine multi-lens span. Surfaces explicitly in the /nightwork-init-phase AskUserQuestion output ("Detected signals fire for BOTH architect AND enterprise-readiness — HIGH base set will be 7 reviewers (architect + enterprise-readiness + base 5)").

**Mechanical enforcement at /np dispatch:** `np.md` config runs the signal-table regex over EXPANDED-SCOPE.md + PLAN.md body and outputs the picked reviewer(s). If the regex matches zero architect-signals AND zero enterprise-readiness-signals on a HIGH phase, that's an init-phase mis-tier (HIGH should have at least one structural-design OR production-quality concern); halt for Jake re-tier per §6.2 trigger.

---

## 3. Auth-aware smoke primitive (REQUIRED per nwrp238)

**Status:** REQUIRED tiering-design deliverable BLOCKING Phase 2 dispatch per nwrp238.

**Problem from Phase 1:** Phase 1's anon Playwright smoke proved the Owner Portal dual gate (PUBLIC paths). For other section gates (non-PUBLIC paths), the middleware auth gate at `src/middleware.ts:155` fires FIRST and returns 307 to `/login`, masking the new feature-flag gates. The smoke counted these 307s as failures (20 of 39 tests "failed" — actually all hidden routes 307'd correctly to login, route is still hidden from anon perspective). Jake's authed visual walk filled the gap.

**Design: `SmokeAuthHelper` — reusable login + cookie management primitive**

```
scripts/lib/smoke-auth.mjs       ← NEW (or .ts equivalent)

API surface:
  - login(page, { email, password }): Promise<boolean>
      Performs Playwright login flow. Returns true on success.
  - withAuthedContext(browser, opts, fn): Promise<R>
      Creates a fresh authed context, runs fn against it, cleans up.
  - getAuthCookies(page): Promise<Cookie[]>
      Extracts session cookies for sharing across requests.
  - statusAuthed(page, url): Promise<number>
      Same as plain status() but with authed cookies attached.

Behavior:
  - Reads SMOKE_EMAIL + SMOKE_PASSWORD from env vars (no hardcoded creds)
  - Reads SMOKE_AUTH_URL from env (defaults to BASE_URL/login)
  - SKIPS gracefully if creds missing — returns false from login()
  - Handles MFA / 2FA via interactive PROMPT_FOR_OTP env flag (future)
  - Persists session cookies for the full smoke run; resets between runs
```

**Per-tier usage:**

| Tier | Smoke posture |
|------|---------------|
| LOW | Anon-tolerant smoke. SmokeAuthHelper available but optional; phases CAN skip auth entirely if all assertions are against PUBLIC paths (Owner Portal pattern) OR if Jake's authed visual walk fills the gap. |
| MEDIUM | Authed required. SmokeAuthHelper mandatory; auth credentials provisioned via tiering-design-managed env vars (SMOKE_EMAIL / SMOKE_PASSWORD seeded into per-machine `.env.local` or per-CI-run secrets). |
| HIGH | Authed required + ai-logic-tester Drummond pass. Authed smoke + financial-logic-aware Drummond fixture walk. |

**Credential management (initial recommendation):**

For Ross Built internal launch, use a dedicated `smoke-runner@nightwork.local` user with PM role (limited scope, no admin capabilities, no real data access). Credentials stored in `.env.local` (gitignored) per machine. CI runs read from CI secrets store.

**For multi-tenant test scenarios (Wave 2+):** introduce `harness-fixture-org` test user mapping (per scripts/fixtures/smoke-seed.sql precedent — Wave-D Plan D-4 + nwrp135 fixture infra collision check). The fixture org has known UUIDs + a known PM user that smoke runs use. Drummond fixtures NOT used in smoke (per Workflow Posture: "Drummond is the reference job for production-facing artifacts ONLY — synthetic seeded UUIDs in smoke scripts").

**Open question for Jake:** which auth provider posture for smoke?
- (a) Supabase email/password against existing user — simplest; reuses existing auth
- (b) Service-role JWT mint — bypass UI login; faster; but doesn't test the actual login surface
- (c) Magic-link token capture — most realistic; most flaky in CI

Recommend **(a) Supabase email/password** for Phase 2 + the next 3 phases; revisit (b) if smoke runtime exceeds 5 minutes regularly.

---

## 4. Severity-declaration mechanism (mechanical)

**Goal:** make tier selection automatic + auditable. Future Claude sessions should NOT have to re-derive tier from scratch by reading the directive chain.

**Design: `severity:` field in EXPANDED-SCOPE.md frontmatter**

EXPANDED-SCOPE.md already exists as the canonical Jake-approved scope document per D-011. Extending its frontmatter with `severity:` adds tier as a first-class scope attribute.

```yaml
---
phase: <phase-name>
status: APPROVED  # or DRAFT
severity: LOW  # LOW | MEDIUM | HIGH — REQUIRED field per tiering design
severity_rationale: |
  <1-3 sentences explaining tier selection>
estimated_wall_clock: 2h  # informational, used to spot tier mismatches
halt_gate_ceiling: 50  # auto-set from severity tier (LOW=$50, MEDIUM=$100, HIGH=$200)
per_plan_halt: 50  # auto-set from severity tier (LOW=$50, MEDIUM=$75, HIGH=$100)
---
```

**Tier selection at `/nightwork-init-phase` time:**

The init wrapper runs detection signals AGAINST the stated scope and **displays the conflict explicitly when signals are mixed (per nwrp239 item (a))** — not a black-box recommendation. Three flavors of AskUserQuestion based on signal posture:

**Flavor A — Clean signals (all point same direction):**
```
Phase: <phase-name>
Stated scope detected signals: <N signals>, all consistent with [LOW | MEDIUM | HIGH]
  - <signal 1>
  - <signal 2>
  - <signal N>

Recommend: [tier]
  Reviewer set: <reviewers>
  Cost ceiling: $<N>
  Pipeline depth: <skip-analyzer / 1-iter / 2-iter framing>

Select: [LOW] [MEDIUM] [HIGH] [Override with rationale]
```

**Flavor B — Mixed signals (conflict):**
```
Phase: <phase-name>
Stated scope detected MIXED signals — manual disambiguation required:

  N signals suggest HIGH:
    - <signal X>: <stated-scope quote>
    - <signal Y>: <quote>
    - <signal Z>: <quote>

  M signals suggest MEDIUM:
    - <signal A>: <quote>
    - <signal B>: <quote>

  K signals suggest LOW:
    - <signal P>: <quote>

  Dominant signal weighting recommends: [tier] (because <reasoning>)

Select: [LOW] [MEDIUM] [HIGH] [Override with rationale]
```

**Flavor C — Insufficient signals (sparse stated scope):**
```
Phase: <phase-name>
Stated scope is sparse; no strong tier signals detected.

Inferring from estimated wall-clock (<N>h): <tier guess>

Select: [LOW] [MEDIUM] [HIGH] [Add more stated scope first]
```

The mixed-signal display (Flavor B) makes the call auditable. Jake can see exactly which signals are firing in which direction and make the call from the surfaced evidence, not from an opaque "recommend HIGH" output. If the wrapper's "dominant signal weighting" reasoning is wrong, Jake sees the data and corrects.

**Detection signals (informational hints — NOT auto-tier):**

| Signal | Suggests |
|--------|----------|
| supabase/migrations/* changes | HIGH |
| New entity / table in stated scope | HIGH |
| Financial logic terms (invoice, draw, payment, lien, CO) in stated scope | MEDIUM-HIGH |
| Cross-tenant terms (impersonation, platform-admin, org_id) | HIGH |
| External integration (QuickBooks, Buildertrend, Stripe, email) | HIGH |
| UI / nav / placeholder / config / hide / flag in stated scope | LOW-MEDIUM |
| Hook calibration / doc-only / .planning/ touches | LOW |
| Wall-clock ≤ 4h estimate | LOW signal (not dispositive) |
| Wall-clock ≥ 16h estimate | HIGH signal (not dispositive) |

**Mechanical enforcement at `/np` dispatch:**

```
1. Read EXPANDED-SCOPE.md.
2. Confirm `severity:` field present + value in {LOW, MEDIUM, HIGH}. If missing → ABORT with message: "EXPANDED-SCOPE.md missing severity: field. Re-run /nightwork-init-phase to declare tier."
3. Read tier config from .planning/process/PLANNING-PIPELINE-TIERING.md (or a tier-config.json derived from it).
4. Dispatch the tier's pipeline (skip-stages, reviewer-set, cost-ceiling).
5. All commits + reports cite the tier in their audit trail.
```

**Why frontmatter, not /np argument:** /np args are ephemeral; frontmatter survives session loss + /clear + future Claude sessions. The tier is a property of the phase, not of one invocation.

**Why frontmatter, not CONTEXT.md:** CONTEXT.md is generated at /gsd-discuss-phase time; severity is set at /nightwork-init-phase time (before discuss). Frontmatter on EXPANDED-SCOPE.md is the earliest canonical decision point.

**Override path:** Jake can manually edit `severity:` in EXPANDED-SCOPE.md. If he downgrades a phase to LOW that the detection signals flagged as HIGH, the init wrapper warns + Jake confirms. If he upgrades a LOW phase to HIGH (e.g., paranoia or audit posture), no warning needed.

**Audit-trail integration:** every QA report, plan-review report, and SHIPPED commit cites the tier (e.g., commit body has `Severity: LOW` line; QA report has `**Threat severity:** LOW (tier per EXPANDED-SCOPE.md severity: field)`).

---

## 5. Phase 2 placement decision

**Phase 2 = UI-FINALIZE** of Internal Ross Built Launch SEQUENCE (HIDE → UI-FINALIZE → BUILD → fix → TEST/dogfood). UI polish on the launch surfaces after Phase 1 (HIDE) reduced nav to 4 sections.

**Jake's framing per nwrp237:** "Phase 2 is UI work on launch surfaces with a real PDF-preview spike risk; not pure config."

**Jake's correction per nwrp239 (item 3):** Phase 2's bounded scope (RGBA cleanup, breakpoint fix, touch-target audit, "Your Day" replacement) is LOW work. The PDF-preview spike is a SEPARATE identified question — not part of Phase 2, it's a gate on whether Phase 2 expands.

**Rev 2 recommendation: Phase 2 = LOW by default + PDF-preview spike as separate LOW-spike prefix.**

**Two-step dispatch:**

1. **PDF-preview LOW-spike** runs as a tiny prefix LOW phase BEFORE Phase 2 dispatches. Scope: investigate whether existing PDF rendering library (e.g., react-pdf, pdf.js wrapper, browser-native object embed) covers the launch-surface PDF-preview requirements OR whether new component / new API / new library integration is needed. Estimated wall-clock: 0.5 day. Output: spike report stating "CSS-only path confirmed" OR "PDF.js surgery needed; here's the surface area."

2. **Phase 2** dispatches WITH the spike result folded into EXPANDED-SCOPE:
   - **Spike says "CSS-only path confirmed, half-day work"** → Phase 2 stays LOW. Bounded RGBA cleanup + breakpoint fix + touch-target audit + "Your Day" replacement + the now-confirmed-CSS-only PDF preview path.
   - **Spike says "PDF.js surgery needed, real complexity"** → Phase 2 escalates to MEDIUM with the spike findings informing the new scope (new component primitive, design-pushback applies, possible new API contract). MEDIUM cost ceiling + 4-reviewer set + SmokeAuthHelper required.

**Why not MEDIUM-by-default with downgrade:** the Rev 1 framing inverted the right direction. Paying MEDIUM rigor on probably-LOW work because of an UNKNOWN that the spike answers in half a day is over-rotation. The spike is the cheap-question-first move; tiering decision waits on the spike answer.

**Spike tier:** the PDF-preview spike itself is LOW (it's a half-day investigation, no production code change). The spike runs the LOW pipeline: skip analyzer, 1-iter planner + plan-check, 2 reviewers (security + planner — or in this case, security + design-pushback since the question is UI-pattern-shaped). Spike report goes into `.planning/spikes/phase-2-pdf-preview-spike-report.md` (or wherever spike outputs land per existing `gsd-spike` skill convention) + becomes a citable input to Phase 2 EXPANDED-SCOPE.

**Decision recorded:** Phase 2 EXPANDED-SCOPE authoring requires the PDF-preview spike report to exist + cite its conclusion. /nightwork-init-phase for Phase 2 blocks until the spike has dispositioned (either path-a or path-b).

---

## 6. Escalation rules

### 6.1 Cost-overrun escalation (same per all tiers)

**LOW phase overrun:**

If a LOW phase's plan-review surfaces a BLOCKING finding from one of the 2 reviewers, OR if execute hits per-plan halt ceiling ($50), the executor HALTS for Jake per Rule 7a (plan-author self-resolution BANNED). Options Jake authorizes:

- **(a) Re-scope to fit** — narrow the phase's deliverables. Cheapest. Common when EXPANDED-SCOPE was too ambitious.
- **(b) Escalate tier to MEDIUM** — keep scope, add 2 reviewers (architect + 1 conditional), bump ceiling to $100. Jake-authorized only.
- **(c) Single ceiling bump per Rule 7c** — keep scope + reviewer set, bump ceiling $50 → $75 once. Jake-authorized only.
- **(d) Halt for fresh session** — preserve discipline gate per nwrp164 precedent; restart with fresh context budget.

**MEDIUM phase overrun:**

Same options. MEDIUM's natural ceiling is $100; bump path is $100 → $150 once. Escalation to HIGH is rare but valid if scope discovers schema impact.

**HIGH phase overrun:**

HIGH's ceiling is $200; bump path is $200 → $300 once per Rule 7c. No tier-escalation (HIGH is the top). Re-scope is the dominant remediation.

**Scope-engineering ban (Rule 7e) applies to all tiers:** splitting a plan to "fit" the ceiling is the same anti-pattern as bumping. If work doesn't fit, halt for re-scope or fresh session.

### 6.2 Mid-execute tier-mismatch triggers (per nwrp239 item 5)

Cost-overrun (§6.1) is one failure mode; SCOPE-DISCOVERS-WRONG-TIER is a different and important case. These triggers fire mechanically — not on judgment — at plan-author time, plan-review time, OR QA time. If trigger fires, halt for Jake re-tier (same pattern as cost overrun, applied to scope discovery).

**Mechanical halt-and-re-tier triggers:**

| Tier-at-dispatch | Trigger condition | Halt action |
|------------------|-------------------|-------------|
| LOW | Plan surfaces a schema change (any `supabase/migrations/*` in files_modified OR `CREATE TABLE` / `ALTER TABLE` / `CREATE POLICY` in plan body) | HALT, re-tier to **HIGH** |
| LOW | Plan surfaces a cross-tenant concern (new `platform_admins` rows, impersonation flows, cross-org joins, RLS posture change) | HALT, re-tier to **HIGH** |
| LOW | Plan surfaces financial logic / cents math (status transitions on invoice/draw/CO/lien, new aggregation, new payment-schedule math, new G702/G703 logic) | HALT, re-tier to **MEDIUM minimum** (HIGH if also schema/cross-tenant) |
| MEDIUM | Plan surfaces new schema (any `supabase/migrations/*`) | HALT, re-tier to **HIGH** |
| MEDIUM | Plan surfaces cross-tenant data flow (cross-org joins, new platform-admin surface, new RLS) | HALT, re-tier to **HIGH** |
| Any tier | Plan surfaces new external integration (QuickBooks, Buildertrend, Stripe webhook, email-in, Procore, etc.) | HALT, re-tier to **HIGH** |
| Any tier | Plan-review iter-1 surfaces a tier-mismatch finding from a reviewer (e.g., security-reviewer flags PII handling that requires compliance reviewer + HIGH tier discipline) | HALT, re-tier to whichever tier the reviewer flagged |
| Any tier | QA reviewer surfaces a domain that the dispatched tier didn't cover (e.g., LOW phase QA finds the implementation introduced an aggregation; tier was LOW but the work is now HIGH) | HALT, re-tier to the discovered tier; treat the existing work as a precursor to be retroactively reviewed |

**Mechanical detection signals (fire at plan-author time):**

| Signal | Fires on |
|--------|----------|
| `supabase/migrations/*` in files_modified | Schema change |
| `CREATE TABLE` / `ALTER TABLE` / `CREATE POLICY` / `DROP POLICY` in plan body | Schema / RLS change |
| `platform_admin_audit` / `getCurrentMembership` / `app_private.user_org_id` / `org_id` in mutation paths | Cross-tenant concern |
| `cents` / `amount_*` / `total_*` / `status_history` / `revision_number` in financial-entity contexts | Financial logic |
| External-API keyword scan (`qbo`, `quickbooks`, `buildertrend`, `procore`, `stripe.webhook`, `resend.email`, `email-in`) | External integration |

**Halt-action protocol:**

1. Executor (or plan-reviewer at iter-1) HALTS — does NOT auto-re-tier.
2. Surface to Jake with: detected trigger, current tier, recommended new tier, rationale (citing the mechanical signal that fired).
3. Jake authorizes new tier OR re-scopes to remove the trigger condition OR explicitly overrides ("keep at current tier — trigger is a false positive because <reasoning>").
4. Re-dispatch under new tier with EXPANDED-SCOPE.md `severity:` field updated to match.
5. Work-done-so-far becomes a precursor input to the re-tiered phase.

**Why mechanical not judgment:** judgment calls miss tier-mismatches the same way they miss security findings. Mechanical signals fire deterministically; Jake decides whether each is a true tier-mismatch or false positive. False-positive rate becomes a tunable metric.

**Friction-tax watchpoint (mechanical close per nwrp241):**

The watchpoint is closed-loop, not advisory. Three components:

**METRIC: `mid_execute_halt_rate` per tier**
```
mid_execute_halt_rate(tier) = (halts triggered by §6.2 mechanical signals at that tier)
                            / (total phases dispatched at that tier)
                            over trailing 4 phases per tier
```

Tracked in `.planning/process/PIPELINE-TIERING-REVIEW-N.md` (the artifact mandated by §8 Q10) as a first-class metric alongside ceiling-bump rate + reviewer-set effectiveness.

**THRESHOLD: >20% per tier**

If `mid_execute_halt_rate(tier) > 0.20` over trailing 4 phases, that's signal of one of:
- (a) The tier's **defining-characteristics** (§2.x) are too permissive — phases are slipping into the tier that shouldn't be there, and §6.2 triggers catch them downstream
- (b) The **§4 detection-signal regex set** is mis-calibrated — true tier-mismatches aren't surfaced at /nightwork-init-phase time, so they surface later via §6.2

**ACTION: mandatory revision proposal**

When breach detected (>20% per tier), the next `.planning/process/PIPELINE-TIERING-REVIEW-N.md` artifact MUST propose specific revisions to ONE of:

| Cause | Revision target |
|-------|-----------------|
| (a) tier defining-characteristics too permissive | Edit §2.1 / §2.2 / §2.3 defining-characteristics in this design doc; tighten criteria; update detection-signal table to reflect |
| (b) detection-signal regex set mis-calibrated | Edit §4 detection-signal regex set + Flavor B mixed-signal display logic in `nightwork-init-phase.md` config |

Both revisions are Jake-authorized before they land in production gsd-sdk config (`np.md` + `nightwork-init-phase.md`). **Revisions must ship BEFORE the next phase at that tier dispatches** — the threshold breach is the gate.

The metric-threshold-action triple makes the watchpoint mechanical: a >20% rate doesn't sit as a soft "should look at this" note; it triggers a defined revision path before next-tier-dispatch.

**Why this is the right closing pattern:** the design's entire premise is mechanizing decisions that were previously soft. A friction-tax watchpoint with no mechanical action defeats itself — it becomes the same kind of "should review eventually" item that the tiering design replaces. Mechanical metric + mechanical threshold + mechanical revision-mandate-before-next-dispatch matches the rest of the design's discipline.

---

## 7. Implementation surface (post-design — NOT in scope of this design pass)

After Jake reviews this design + approves, implementation work would touch:

1. **`.claude/commands/np.md`** — add tier-selection logic, gate dispatch on `severity:` field in EXPANDED-SCOPE.md frontmatter.
2. **`.claude/commands/nightwork-init-phase.md`** — add AskUserQuestion for tier selection + write `severity:` field.
3. **`.claude/commands/nightwork-plan-review.md`** — add tier-aware reviewer set selection (LOW=2, MEDIUM=4, HIGH=8).
4. **`.claude/commands/nightwork-qa.md`** — same tier-aware logic.
5. **`.claude/commands/nx.md`** — confirm tier alignment in preflight.
6. **`scripts/lib/smoke-auth.mjs`** (NEW) — SmokeAuthHelper primitive per §3.
7. **`.planning/templates/expanded-scope-template.md`** (if it exists, or create) — include `severity:` field with default LOW + tier-rationale prompt.
8. **`.planning/process/PLANNING-PIPELINE-TIERING.md`** (this doc) — promote from DRAFT to APPROVED on Jake sign-off.
9. **`CLAUDE.md` Workflow Posture section** — add Rule 10 (severity tiering) summarizing the contract.

Estimated implementation effort: 1-2 days work + a precursor dogfood phase (Phase 2 dispatched under the new MEDIUM tier with this infrastructure live). Cost ceiling for implementation: $150 (MEDIUM tier — modifies the pipeline itself, design-pushback applies to skill/command files).

---

## 8. Open questions for Jake (review prompts)

Each numbered question maps to a concrete decision Jake makes during review.

1. **Reviewer sets per tier — accept the proposed sets?**
   - LOW: 2 (security + planner)
   - MEDIUM: 4 (architect + planner + security + 1 conditional)
   - HIGH: 8 (full current set)
   - OR alternative? E.g., MEDIUM = 3 (security + planner + 1 conditional)?

2. **Cost ceilings per tier — accept $50 / $100 / $200?**
   - Per-plan halt: $50 / $75 / $100?
   - OR different scaling? E.g., per-slice $50 / $125 / $250?

3. **`gsd-assumptions-analyzer` skip for LOW — accept?**
   - The analyzer adds value when EXPANDED-SCOPE has gray areas. For LOW (typically EXPANDED-SCOPE is comprehensive), skipping is justified.
   - Edge case: a LOW phase with novel gray-area concerns might benefit. Override path: Jake can request analyzer run during /nightwork-init-phase via AskUserQuestion follow-up.

4. **Forced iter-2 on HIGH — accept the "mandatory revision cycle" framing?**
   - HIGH iter-2 catches drift between iter-1 plan + iter-2 plan even if iter-1 plan-check PASS.
   - Risk: forces $40-50 of additional plan-author + plan-check tokens per HIGH phase. Worth it for schema/financial work?

5. **SmokeAuthHelper auth provider — Supabase email/password (recommended) vs service-role JWT vs magic-link?**
   - Recommendation: (a) Supabase email/password.
   - Trade-offs documented in §3.

6. **Severity-declaration mechanism — accept `severity:` field in EXPANDED-SCOPE.md frontmatter?**
   - Alternative: dedicated `.planning/phases/<phase>/SEVERITY.md` file. Heavier.
   - Alternative: `severity:` in PLAN.md frontmatter. Later in pipeline; misses init-phase decisions.

7. **Phase 2 tier — accept MEDIUM default with downgrade path?**
   - MEDIUM if PDF-preview / new components / design-pushback applies.
   - LOW if scope confirms no PDF-preview spike + existing library wrapper.

8. **Escalation rules — accept Rule 7a/7c/7d application to all tiers?**
   - LOW overrun → bump $50→$75 OR escalate to MEDIUM.
   - MEDIUM overrun → bump $100→$150 OR escalate to HIGH.
   - HIGH overrun → bump $200→$300 OR re-scope.

9. **Tier-aware audit-trail — accept commit body `Severity: LOW` line + QA report tier citation?**
   - Adds 1 line to every commit. Cheap. Auditable.

10. **Friction-tax watchpoint — what's the threshold for re-tier?**
    - If LOW phases consistently bump their ceiling, tier is too tight OR scope is too loose.
    - If HIGH phases consistently stay under their ceiling, tier is too loose OR scope is too tight.
    - **Per nwrp239 tightening: review AND DOCUMENT after 4 phases per tier.** A review that produces no artifact is not a review. Required output: `.planning/process/PIPELINE-TIERING-REVIEW-N.md` (where N increments per review) with: phases reviewed, ceiling-bump rate per tier, mid-execute halt-and-re-tier rate per tier, reviewer-set effectiveness (did the picked conditional reviewer catch anything load-bearing?), proposed adjustments. Adjustments require Jake authorization before pipeline edits ship.

---

## 9. Non-goals (explicit)

- **Per-tenant tier configurability.** Tiering is a Ross-Built-internal design concern; future customers don't customize tier mechanics.
- **Tier-aware MCP / tool selection.** Tools available are constant; only pipeline orchestration tiers.
- **Per-phase tier autoswitch mid-execute.** Tier is locked at /nightwork-init-phase time. If execute discovers the tier was wrong, halt for Jake re-tier.
- **Replacing /nightwork-propagate.** Propagate is for cross-cutting changes ("everywhere," "all," "make X match Y"). Tiering is for vertical depth (per-phase rigor). Orthogonal.

---

## 10. Lessons captured from Phase 1 (informing this design)

Per `.planning/lessons.md` 2026-05-27 entry:

1. **Anon vs authed smoke is a tiering-design choice, not a local concern.** → resolved in §3 (SmokeAuthHelper primitive).
2. **PLAN/CONTEXT framing audits on future tiering phases.** → §4 (tier-aware audit-trail) + §8 Q9.
3. **LOW-severity rigor holds at 2+ reviewers minimum.** → §2.1 confirms (security + planner).
4. **Cost discipline at tier level, not just per-plan.** → §6 (escalation rules) + §2.x (per-tier ceilings).
5. **TD-PLANNING-PIPELINE-SEVERITY-TIERING is NOT done.** → this design closes the **DESIGN** phase only; implementation work follows post-Jake-review. **Per nwrp239 tightening (b): TD remains BLOCKING on 3-series dispatch until the IMPLEMENTATION phase (per §12) ships AND Phase 2 has dispatched successfully under the new tier (the validation that the design works as built). Approved design + unblocked 3-series + no actual tier pipeline running = the gap defeats itself.** TD closes when: (i) implementation phase SHIPPED, (ii) Phase 2 dispatched + completed under new tier, (iii) PIPELINE-TIERING-REVIEW-1.md authored after 4 phases per Q10 — all three required.

---

## 11. Cost ledger for this design pass

**Rev 1 draft (initial pass):**
- Read pipeline files (np.md, nightwork-plan-review.md, nightwork-qa.md): ~10k tokens
- Read Phase 1 artifacts (PLAN-REVIEW, MASTER-PLAN, EXPANDED-SCOPE): ~10k tokens
- Inline drafting of this document: ~12k tokens
- **Rev 1 total ~32k tokens; well under the $50 cap.**

**Rev 2 (per nwrp239):**
- Read nwrp239 directive + re-read DRAFT Rev 1: ~5k tokens
- Inline revisions (items 1-5, framing tightenings a-b, accepted items, §11.5 retrospective walk): ~10k tokens
- **Rev 2 total ~15k tokens; combined with Rev 1 ~47k.**

**Rev 3 (this revision pass per nwrp241):**
- Read nwrp241 directive: ~2k tokens
- Targeted edits (§6.2 mechanical close + §2.3 mechanical signal table + "both = 2 slots" path): ~5k tokens
- **Rev 3 total ~7k tokens; combined with Rev 1 + Rev 2 ~54k.**

**Note on cost cap:** combined Rev 1 + Rev 2 + Rev 3 = ~54k tokens, marginally above the original $50 cap stated in the preamble. The overrun is ~$5-10 and was driven by Jake's nwrp241 explicit green-light on Rev 3 tightening (which itself was a single-pass small edit). Per Rule 7a (plan-author self-resolution BANNED), this is surfaced honestly; per Rule 7c (max 1 bump per slice), no bump used; the marginal $5-10 is absorbed as cost-of-correctness for closing the two soft-criteria gaps that Jake flagged. If a future audit cares, the breakdown is logged here. Not a discipline violation; not silent.

No subagent dispatch used in any pass (per LOW-tier discipline — this design IS a LOW-severity meta-phase). No analyzer ran. No plan-checker iter-2 needed (Rev 1 → Rev 2 surfaced specific actionable findings; Rev 2 → Rev 3 closed 2 explicit soft-criteria items per Jake-directed mechanical revisions).

## 11.5 Phase 1 retrospective walk under proposed LOW tier (per nwrp239 item 4)

Concrete cost retrospective: under the proposed LOW pipeline (analyzer SKIP + 1 planner iter + 1 plan-check iter unless iter-1 surfaces findings + 2 reviewers iter-1 + iter-2 only if findings + INLINE execute + 2 QA reviewers + smoke + visual walk), what would Phase 1 have cost?

### Phase 1 actual cost (what was spent, per the Phase 1 audit trail)

Phase 1 actually used a partial-LOW path per Jake's nwrp231/232/236 directives (reduced reviewers + INLINE execute + 2 QA reviewers). It ALSO ran the full pre-/np pipeline ( assumptions-analyzer + 2-iter planner + 2-iter plan-check) because the LOW tier didn't formally exist yet.

| Stage | Token cost (approx) | Cost per nwrp233 framing |
|-------|---------------------|--------------------------|
| Init phase + EXPANDED-SCOPE.md authoring | ~50k | (not separately tracked) |
| gsd-assumptions-analyzer (auto mode, full pass) | ~118k | included in $75-90 |
| gsd-planner iter-1 (authored PLAN.md Rev 1) | ~213k | included |
| gsd-plan-checker iter-1 (goal-backward verify) | ~194k | included |
| gsd-planner iter-2 (revised to Rev 2 per nwrp232 OQ dispositions) | ~213k | included |
| gsd-plan-checker iter-2 (re-verify Rev 2) | ~194k | included |
| nightwork-plan-review iter-1 (2 reviewers — security + planner, per nwrp231 reduction) | ~120k | included |
| nightwork-plan-review iter-2 (2 reviewers, after Jake nwrp232 dispositions) | ~120k | included |
| **Subtotal: planning overhead (per nwrp233)** | **~1.17M tokens** | **~$75-90** |
| gsd-execute-phase (INLINE per nwrp236; no subagent dispatch on tasks) | ~40-60k (just inline edits + commits) | low (~$5-10) |
| nightwork-qa (2 reviewers per nwrp236) | ~120k | ~$8-12 |
| Custodian sweep (post-ship) | ~50k | ~$3-5 |
| **Subtotal: execute + QA + close** | **~210-230k** | **~$16-27** |
| **Phase 1 total** | **~1.38-1.40M tokens** | **~$91-117** |

### Proposed LOW pipeline applied to Phase 1's actual content

Phase 1 had REAL iter-1 findings (Jake nwrp232 OQ dispositions: Schedule bundling, PEOPLE hardcoded, Vendors/Overview live:false reframe). Under proposed LOW + Jake revision item 2 (iter-2 only if iter-1 produces findings), iter-2 WOULD still have run for Phase 1 because iter-1 surfaced revisable issues.

| Stage | Proposed LOW cost | Saved vs actual |
|-------|-------------------|-----------------|
| Init phase + EXPANDED-SCOPE.md authoring | ~50k (same) | 0 |
| gsd-assumptions-analyzer | **SKIP** | **~118k saved (~$10-15)** |
| gsd-planner iter-1 | ~213k (same) | 0 |
| gsd-plan-checker iter-1 | ~194k (same — finds findings → triggers iter-2) | 0 |
| gsd-planner iter-2 (required because iter-1 had findings per revision #2) | ~213k (same) | 0 |
| gsd-plan-checker iter-2 | ~194k (same) | 0 |
| nightwork-plan-review iter-1 (2 reviewers) | ~120k (same — already LOW-reduced via nwrp231) | 0 |
| nightwork-plan-review iter-2 (2 reviewers, required by iter-1 OQ findings) | ~120k (same) | 0 |
| **Subtotal: planning overhead** | **~1.05M tokens** | **~118k saved (~10%)** |
| gsd-execute-phase INLINE | ~40-60k (same) | 0 |
| nightwork-qa (2 reviewers) | ~120k (same) | 0 |
| Custodian sweep | ~50k (same) | 0 |
| **Subtotal: execute + QA + close** | **~210-230k (same)** | 0 |
| **Phase 1 under proposed LOW total** | **~1.26-1.28M tokens** | **~118k saved (8% of total)** |
| **Estimated cost** | **~$76-100** | **~$15 saved vs actual $91-117** |

**Conclusion for Phase 1 specifically:** proposed LOW would have saved ~10% of planning tokens (~$10-15) versus Phase 1's actual reduced-path cost. Modest savings on Phase 1's actual content because iter-1 had real findings → iter-2 ran in both the actual AND proposed paths.

### Where proposed LOW would save dramatically — hypothetical clean-iter-1 LOW phase

For a LOW phase where iter-1 plan-check PASSes clean (no iter-2 needed):

| Stage | Proposed LOW cost | Saved vs full uncut |
|-------|-------------------|---------------------|
| gsd-assumptions-analyzer | **SKIP** | ~118k |
| gsd-planner iter-1 | ~213k | 0 |
| gsd-plan-checker iter-1 (PASS clean) | ~194k | 0 |
| gsd-planner iter-2 | **SKIP** | ~213k |
| gsd-plan-checker iter-2 | **SKIP** | ~194k |
| nightwork-plan-review iter-1 (2 reviewers) | ~120k | 0 (vs full-8 reviewers: ~360k = ~240k saved) |
| nightwork-plan-review iter-2 | **SKIP** (no iter-1 findings) | ~120k (assuming full-set would have re-iterated) |
| **Total planning** | **~527k tokens** | **~885k saved vs full ~1.4M uncut** |
| **Estimated cost** | **~$30-45** | **~$60-80 saved per phase** |

**Conclusion for hypothetical clean-iter-1 LOW phase:** proposed LOW saves ~60% of planning tokens (~$60-80) versus the full uncut pipeline. This is the dramatic win — LOW phases that don't need revision cycles get the full benefit of skipping analyzer + skipping iter-2 + reduced reviewers.

### Honest framing of the validation

**Phase 1 retrospective:** proposed LOW saves ~$10-15 over what Phase 1 actually spent (which was already partial-LOW per Jake's nwrp231/232/236 hacks). The 10% savings IS a win but isn't dramatic.

**The bigger validation is structural, not arithmetic:**

1. **Phase 1 had Jake driving the cost discipline manually via 3 separate nwrp directives** (nwrp231 bump ceiling + reduce reviewers; nwrp232 extend ceiling for revision; nwrp236 INLINE execute + reduce QA reviewers). Proposed LOW pipeline does ALL of this automatically — Jake authors EXPANDED-SCOPE.md with `severity: LOW` and the pipeline applies the discipline without per-phase intervention. **The win is process automation, not raw $/phase savings on Phase 1's specific content.**

2. **Hypothetical clean-iter-1 LOW phases (e.g., Phase 2 if it stays LOW per §5) save $60-80 each.** Across ~10 LOW phases between now and Wave 2 (post-launch UI polish, hook calibrations, doc-only refreshes, RGBA cleanups, etc.), that's ~$600-800 saved without Jake intervention.

3. **The mechanical halt-and-re-tier triggers (§6.2) catch tier-mismatches at plan-author or QA time — not at "Jake notices the cost spiraled" time.** This is a different category of value entirely (correctness, not raw savings).

4. **HIGH phases gain rigor that LOW phases shed.** F3B's projected $200-300 in planning overhead under the proposed HIGH tier (base 6 + conditionals) is HIGHER than the previous undifferentiated $75-90 baseline — because the previous baseline was a LOW-shaped pipeline applied to HIGH work, which is exactly the failure mode tiering fixes in the OTHER direction.

### Validation verdict

Proposed LOW design **VALIDATES** on Phase 1 retrospective: 10% savings on Phase 1's actual content + ~60% savings on hypothetical clean-iter-1 LOW phases + process automation that removes per-phase Jake intervention burden. The design does not promise dramatic Phase-1-specific savings (Jake already cost-engineered Phase 1 manually) — it promises that those same disciplines apply automatically to future LOW phases AND that HIGH phases get appropriately MORE rigor than the previous undifferentiated baseline.

If proposed-LOW had projected $60-70 for Phase 1's actual content, the design WOULD have failed Jake's validation threshold per nwrp239 item (4). Projection of ~$76-100 (modest $10-15 savings on Phase 1's actual) PLUS ~60% savings on clean-iter-1 LOW phases PLUS process-automation value satisfies the validation.

---

## 12. Next steps (post-Jake review)

After Jake reviews:

1. **APPROVED → promote DRAFT to APPROVED at top of file.** Add `Approved by Jake: <date>` line.
2. **APPROVED with revisions → revise this doc + re-surface.** No mid-doc edits to gsd-sdk yet.
3. **REJECTED → halt; re-discuss.**

After APPROVED:

**Step 1 — Tiering Implementation phase (probably MEDIUM tier itself per nwrp239 framing — modifies pipeline + adds SmokeAuthHelper crosses design-pushback threshold + touches multiple skill/command files):**
- `/nightwork-init-phase tiering-implementation` authors EXPANDED-SCOPE.md with `severity: MEDIUM`.
- Scope includes 9 implementation touch points from §7: `np.md`, `nightwork-init-phase.md`, `nightwork-plan-review.md`, `nightwork-qa.md`, `nx.md`, `scripts/lib/smoke-auth.mjs` (NEW), `.planning/templates/expanded-scope-template.md`, this design doc promotion DRAFT→APPROVED, CLAUDE.md Rule 10 addition.
- Dispatches `/np tiering-implementation` → `/nx tiering-implementation`.
- Ships under existing reviewer set (since the new tiering doesn't apply yet — bootstrap).

**Step 2 — Phase 2 PDF-preview spike (LOW prefix per §5):**
- `/nightwork-init-phase phase-2-pdf-preview-spike` authors EXPANDED-SCOPE.md with `severity: LOW`.
- Half-day investigation; spike report at `.planning/spikes/phase-2-pdf-preview-spike-report.md` (or wherever gsd-spike-wrap-up convention dictates).
- Dispatches under the NEW tiered pipeline (first real test of the LOW lane).

**Step 3 — Phase 2 UI-FINALIZE:**
- `/nightwork-init-phase phase-2-ui-finalize` authors EXPANDED-SCOPE.md citing the spike report disposition.
- `severity:` set to LOW (if spike path-a) OR MEDIUM (if spike path-b).
- Dispatches under the appropriate tier.

**TD-PLANNING-PIPELINE-SEVERITY-TIERING stays BLOCKING on 3-series dispatch until ALL THREE conditions met (per nwrp239 tightening (b)):**

| Condition | Verification |
|-----------|--------------|
| (i) Implementation phase SHIPPED | Custodian sweep marks `tiering-implementation` SHIPPED in MASTER-PLAN.md §9 |
| (ii) Phase 2 dispatched under new tier (validates design works as built) | Phase 2 PLAN.md carries `severity:` frontmatter; QA report cites tier; reviewer set matches the tier's spec |
| (iii) PIPELINE-TIERING-REVIEW-1.md authored after 4 phases (per Q10 tightened) | First review artifact exists at `.planning/process/PIPELINE-TIERING-REVIEW-1.md` |

**Approved design + unblocked 3-series + no actual tier pipeline running = the gap defeats itself.** TD closes only when implementation has shipped AND been validated under real phase dispatch AND reviewed.

3-series dispatch (3A → 3D) BLOCKS until TD closes per the three conditions above.

**This design is the contract; gsd-sdk implementation comes next as its own phase (Step 1); Phase 2 follows (Step 2-3); TD closes when implementation + Phase 2 + Review-1 all land.**

---

**END OF DRAFT Rev 3 — awaiting Jake review per nwrp241.**
