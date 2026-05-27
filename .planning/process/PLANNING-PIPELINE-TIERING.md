# Planning Pipeline Severity Tiering — Design (DRAFT)

**Status:** DRAFT — awaiting Jake review per nwrp237. Do NOT implement to gsd-sdk yet.
**Filed:** 2026-05-27 per nwrp237 directive post Phase 1 (internal-launch-hide) SHIPPED.
**Origin:** TD-PLANNING-PIPELINE-SEVERITY-TIERING in MASTER-PLAN.md §11 — BLOCKING gate on 3-series dispatch per nwrp233. Phase 1 shipped the LOW-tier prototype 2026-05-27, validating feasibility; this document formalizes the design.
**Cost cap (this design pass):** $50. Design-only — no gsd-sdk / skill changes ship from this pass.
**Authorization chain:** nwrp231/nwrp232 PARKED → nwrp233 PROMOTED (BLOCKING on 3-series) → Phase 1 prototype shipped per nwrp236/237/238 → nwrp237 directive to draft this design.

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
- Phase 2: UI-FINALIZE (cosmetic polish on launch surfaces, BUT with PDF-preview spike risk — see §2.4 placement)
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
| `gsd-planner` | 2 iters mandatory | Forces revision cycle even if iter-1 plan-check PASS — HIGH phases benefit from forcing a re-look. |
| `gsd-plan-checker` | 2 iters mandatory | Same — forcing iter-2 catches drift between iter-1 plan + iter-2 plan. |
| `nightwork-plan-review` | 8 reviewers (current full set) | **architect + planner + enterprise-readiness + multi-tenant-architect + security-reviewer + scalability (if queries) + compliance (if PII/financial/audit) + design-pushback (if UI)**. No skips. |
| Plan-review iter-2 | RUN | Forced revision pass after iter-1 findings. Per current Wave-B Slice-2 + Wave-D precedent. |
| `nightwork-preflight` | YES | Always. |
| `gsd-execute-phase` | Subagent dispatch | Per-plan parallelism where files_modified disjoint. |
| `nightwork-qa` | Full reviewer set | **spec-checker + custodian + security + ai-logic-tester + ui-reviewer (if UI) + design-system-reviewer (if UI) + rls-auditor (if DB) + database-reviewer (if DB) + data-migration-safety (if migrations)**. No skips for the always-list. |
| Smoke | YES — authed primitive + ai-logic-tester deeper Drummond pass | SmokeAuthHelper required; financial-logic phases run ai-logic-tester against Drummond fixtures end-to-end. |
| `nightwork-end-to-end-test` | YES | Run full Drummond scenario (create vendor → PO → invoice → approve → draw → G702/G703 → lien release → paid). |
| Custodian sweep | YES — post-ship | Standard. |

**Cost ceiling:** $200 per slice (up from MEDIUM's $100). Per-plan halt $100 per Rule 7d. Max 1 bump per slice per Rule 7c. **For multi-slice HIGH phases (e.g., F3B might span 3 slices), each slice carries its own $200 + bump allowance.**

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

The init wrapper asks Jake an explicit AskUserQuestion:

```
This phase looks like [LOW | MEDIUM | HIGH] severity based on:
- [bullet list of detected signals: schema changes? UI? financial logic? etc.]

Tier sets:
- Reviewer set: [security+planner | architect+planner+security+conditional | full 8]
- Cost ceiling: [$50 | $100 | $200]
- Pipeline depth: [skip-analyzer + 1-iter | analyzer + 1-iter + conditional | analyzer + 2-iter + full]

Select severity: [LOW] [MEDIUM] [HIGH] [Override with rationale]
```

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

**Tier candidates:**

| Tier | Argument for | Argument against |
|------|-------------|------------------|
| LOW | UI polish ≈ visual + token discipline; no schema; reversible | PDF-preview spike risk; might introduce new component primitives; design-pushback applies |
| MEDIUM | PDF-preview is the spike; if it introduces new component patterns OR new API for PDF rendering, that's MEDIUM. Cross-cutting design touches launch surfaces. | Might be over-rotation if PDF-preview slice is bounded |
| HIGH | If PDF-preview means new entities (PDF cache table?) OR financial-display-correctness (G702/G703 preview?) | Phased plan §Phase 2 explicitly scoped to NON-financial-correctness — pure visual polish |

**Recommendation: MEDIUM**, with explicit Phase 2 EXPANDED-SCOPE clarification:

1. If Phase 2 scope confirms NO PDF-preview spike OR confirms PDF-preview is using an existing library wrapper (no new schema, no new API contract), then **downgrade to LOW** at /nightwork-init-phase time via the override mechanism.

2. If Phase 2 scope expands to include PDF-preview backend (PDF generation API, cache, etc.), stay at MEDIUM.

3. Phase 2's design-pushback concern is real — the launch surfaces have a tight design contract (Slate palette + Site Office tokens per Stage 1.5a). Adding cosmetic polish carries non-trivial drift risk. MEDIUM's 4-reviewer set includes design-pushback when UI surfaces touch; LOW's 2-reviewer set doesn't.

**Decision deferred to Phase 2 EXPANDED-SCOPE authoring** — but tiering design's default for "UI polish on launch surfaces with potential spike risk" is MEDIUM.

---

## 6. Escalation rules

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
    - Recommend: review after 4 phases per tier; adjust as evidence accumulates.

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
5. **TD-PLANNING-PIPELINE-SEVERITY-TIERING is NOT done.** → this design closes the design phase; implementation work follows post-Jake-review.

---

## 11. Cost ledger for this design pass

- Read pipeline files (np.md, nightwork-plan-review.md, nightwork-qa.md): ~10k tokens
- Read Phase 1 artifacts (PLAN-REVIEW, MASTER-PLAN, EXPANDED-SCOPE): ~10k tokens
- Inline drafting of this document: ~12k tokens
- **Total ~32k tokens; well under the $50 cap.**

No subagent dispatch used (per LOW-tier discipline — this design IS a LOW-severity meta-phase). No additional cost incurred beyond reading + drafting.

---

## 12. Next steps (post-Jake review)

After Jake reviews:

1. **APPROVED → promote DRAFT to APPROVED at top of file.** Add `Approved by Jake: <date>` line.
2. **APPROVED with revisions → revise this doc + re-surface.** No mid-doc edits to gsd-sdk yet.
3. **REJECTED → halt; re-discuss.**

After APPROVED:
- A separate `/nightwork-init-phase` for a "Tiering Implementation" phase (LOW or MEDIUM tier itself) authors the implementation EXPANDED-SCOPE + dispatches /np.
- Implementation phase ships, validated against Phase 2 dispatch.
- Phase 2 dispatches under the new tiered pipeline.

**This design is the contract; gsd-sdk implementation comes next as its own phase.**

---

**END OF DRAFT — awaiting Jake review per nwrp237.**
