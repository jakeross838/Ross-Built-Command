# Expanded scope — stage-1.5c-verification-harness

**Status:** APPROVED 2026-05-06 (with confirmations — see "Approved confirmations" section below)
**Generated:** 2026-05-06
**Approved:** 2026-05-06 by Jake (per `C:\Users\Jake\Downloads\nwrp48.txt`)
**Stated scope (Jake's words, verbatim from `C:\Users\Jake\Downloads\nwrp47.txt` — captured 2026-05-06):**

> PAUSE Plan 3a-now and Wave 3. Build verification infrastructure before finishing 1.5c.
>
> [Three-layer verification pipeline + research-during-planning step + dynamic prompting calibration. Layer 1 = static checks; Layer 2 = industry-standards (AIA G702/G703, accounting identities, lien law, money conservation, computed-value formulas); Layer 3 = Claude vision against PLAN-file criteria. New `gsd-research-standards` agent at /np time. Deliverables: Playwright harness at `scripts/verify-phase.ts`; `.github/workflows/verify-phase.yml`; standards JSON library at `.planning/verification/standards/`; vision integration; criteria-mandate update to gsd-planner; calibration log; loop-with-executor (max 3 iter); documentation. Vercel-only (no localhost), preserve 1.5c IA Plans 1/2/2-amend/3 commits, do not modify `_fixtures/drummond/` or `sanitize-drummond.ts`. ~2-3 days build, ~9-10 days total to 1.5c shipped (vs ~5-7 if skipped).]
>
> If you see scope I'm wrong about (industry standard I'm overspecifying, layer that should be deferred to F1), flag before starting.

---

## 0. Branch posture and orchestrator context (read first)

This phase runs on a **fresh branch** `phase/1.5-c-verification-harness` cut from `main` (HEAD `7607bbf`). It is separate from the in-flight `phase/1.5-c-information-architecture` branch which carries Plans 1/2/2-amend/3 commits not yet on main.

**Sequence per Jake's Part 7:** verification-harness ships to main FIRST → 1.5c IA branch then rebases/merges main and resumes through the harness → Plan 3a-now → Wave 3 (Plans 4+5) → 1.5c ship.

**Dispatch tooling already in place** (lowers risk substantially):
- Playwright is already installed (`package.json:^1.59.1`) — devDep, no new dep needed for harness scaffolding.
- `.github/workflows/drummond-grep-check.yml` already exists on the IA branch (Plan 1.5b-1) — there is GitHub Actions precedent in this repo to copy structure from.
- 17+ existing scripts at `scripts/e2e-*.mjs`, `scripts/smoke-test*.mjs` use `chromium` from `playwright`, take screenshots, post-process JSON results — strong reuse vocabulary for `scripts/verify-phase.ts`.
- `nightwork-end-to-end-test` and `nightwork-smoke-tester` agents already exist for related concerns; this phase needs to scope them vs the new harness (Question 4 below).
- `.planning/expansions/stage-1.5b-prototype-gallery-EXPANDED-SCOPE.md` is the format precedent.

---

## 1. Mapped entities and workflows

| Entity / artifact / surface | Wave / domain | Current state | Relevance to harness |
|---|---|---|---|
| `scripts/verify-phase.ts` | Net-new infra (this phase) | DOES NOT EXIST | **Primary deliverable.** Playwright-based; walks Vercel preview URLs at 3 viewports; orchestrates Layers 1/2/3; emits structured report. |
| `.github/workflows/verify-phase.yml` | Net-new infra (this phase) | DOES NOT EXIST. Precedent: `.github/workflows/drummond-grep-check.yml` (IA branch only). | **Primary deliverable.** Triggers on push to `phase/*`; waits for Vercel preview ready; runs harness; posts PR comment + commit status. |
| `.planning/verification/standards/` JSON library | Net-new infra (this phase) | DOES NOT EXIST | **Layer 2.** Per-domain rule files (aia/, accounting/, lien-law/, dates/, conservation/). Critical scope-cut question — see §6 Q1. |
| `.claude/agents/gsd-research-standards.md` | Net-new agent (this phase) | DOES NOT EXIST. Adjacent agent: `gsd-phase-researcher.md` (cyan, WebSearch + WebFetch + Context7 + Firecrawl + Exa). | **Research-during-planning.** Spawned at `/np` time before `gsd-planner`. Integration with `gsd-phase-researcher` is open — see §6 Q5. |
| `gsd-planner` PLAN-file `criteria:` mandate | Update existing agent | `gsd-planner` exists; PLAN files today do not have a structured `criteria:` section. Existing 1.5c PLAN files (Plans 1, 2, 2-amend, 3 in IA branch) lack it. | **Cross-cutting protocol change.** Updating gsd-planner prompt + plan-review reject path + retrofit existing 1.5c PLANs — see §6 Q6. |
| `.planning/calibration-log.md` | Net-new artifact (this phase) | DOES NOT EXIST | **Calibration loop.** Per-phase entries on parallelism/prompt-density/drift. Owner of writing entries is open — see §6 Q7. |
| Layer 3 vision (Claude API) | Net-new integration | `@anthropic-ai/sdk ^0.88.0` installed; Anthropic key in Vercel for invoice extraction. Used today only for invoice/proposal extraction. | **Layer 3 deliverable.** Vision agent receives screenshot + criteria; returns pass/fail + reasoning. Cost gating is a real concern — see Risk R3. |
| `nightwork-end-to-end-test` and `nightwork-smoke-tester` agents | Existing custom agents | Both exist in `.claude/agents/`. Neither runs against Vercel preview today; both target localhost dev server per CLAUDE.md "Testing Rule." | **Boundary question.** Does harness REPLACE these or AUGMENT? See §6 Q4. |
| `nightwork-spec-checker` | Existing custom agent | Exists. Compares implementation to acceptance criteria at end of `/gsd-execute-phase`. Today criteria are prose in PLAN.md. | **Integration point.** When PLAN files gain structured `criteria:` blocks, spec-checker reads them too — must coordinate with §6 Q6. |
| `nightwork-qa` orchestrator | Existing | Runs at end of `/gsd-execute-phase`. Currently the gate before `/nightwork-end-to-end-test` and `/gsd-ship`. | **Loop-with-executor sequencing.** Does harness loop run BEFORE or AFTER `/nightwork-qa`? See §6 Q3. |
| Drummond fixtures + `sanitize-drummond.ts` | Wave 1 / 1.5b | Lives on IA branch (in `src/app/design-system/_fixtures/drummond/` + `scripts/sanitize-drummond.ts`). NOT on main. | **EXPLICITLY DO-NOT-TOUCH per Jake's Part 8 constraints.** Harness reads them, never modifies. |
| 1.5c IA Plans 1/2/2-amend/3 commits | Wave 1 / 1.5c | Live on `phase/1.5-c-information-architecture` branch only. | **EXPLICITLY DO-NOT-TOUCH per Jake's Part 8 constraints.** Retrofit (Part 5) is a SEPARATE post-harness task, not part of this phase. |
| Vercel preview URL pattern | Deployment | `https://nightwork-platform-git-{branch}-jakeross838s-projects.vercel.app` per MASTER-PLAN §3 + `.planning/deployment.md`. Auto-deploy on push (D-013). | Harness target. Auto-detect from Vercel API + `gh` CLI vs hardcode pattern — implementation latitude per Jake's Part 8 ("freedom on … specific Playwright assertion patterns"). |
| AIA G702/G703 reference | Industry standard | Reference: Drummond Pay App 5 (per 1.5b corrected from "Pay App 8" — see 1.5b CLAUDE.md correction). Print stylesheet exists in IA branch's prototype gallery. | Layer 2 source for the AIA standards JSON. |
| Florida lien law (4 statute waiver types) | Industry standard | VISION.md §2.4: conditional / unconditional / conditional progress / unconditional progress. PARTIAL on `lien_releases` (no status_history per CURRENT-STATE A.2). | Layer 2 source for lien-law standards JSON. |
| NAHB cost code conventions | Industry standard | `canonical_cost_codes` table seeded with 354 NAHB rows (migration 00082). | Available reference; covered by Layer 1 (DOM presence of cost codes), not Layer 2 formulas. |
| Construction accounting identities (debits=credits, aging buckets sum to AR, retainage = billed × rate, etc.) | Industry standard | Implicit in current code. Not formally documented anywhere. | Layer 2 source. **Scope-question:** how deep to research vs defer to F1 (§6 Q1). |


---

## 2. Prerequisite gaps

What MUST exist before this phase can ship.

| # | Gap | Source | Blocking? |
|---|---|---|---|
| 1 | A `phase/1.5-c-verification-harness` branch cut from `main` HEAD `7607bbf`. | Jake Part 7. | **BLOCKING — must be the first git operation of /np execute.** |
| 2 | Anthropic API key reachable from GitHub Action runner (for Layer 3 vision). | Jake Part 8 (vision API key in Vercel/GitHub secrets, never in committed code). | **BLOCKING for Layer 3.** Layer 1 + Layer 2 land without it; Layer 3 cannot. Auto-setup MUST surface this as a MANUAL Jake step (add `ANTHROPIC_API_KEY` to GitHub Actions secrets if not already a secret — note that Vercel env-var availability does not equal GitHub Actions secret availability). |
| 3 | A Vercel-preview-aware way to discover preview URL from a branch push. | Jake Part 8 (must work on Vercel preview URLs). | **BLOCKING for harness CI mode.** Options: (a) Vercel REST API + `VERCEL_TOKEN` secret, (b) `vercel deployments list --prod=false` via `vercel` CLI, (c) compute deterministic URL via the documented pattern `nightwork-platform-git-{branch}-jakeross838s-projects.vercel.app`. Auto-setup needs to verify (c) actually resolves before relying on it. |
| 4 | The harness must be runnable by a human locally (debugging) AND by GitHub Actions. | Pragmatic. | NOT BLOCKING but a hard ergonomic requirement — `npx tsx scripts/verify-phase.ts --preview-url https://...` must Just Work outside Actions, otherwise developer iteration on the harness itself is painful. |
| 5 | Playwright browsers must be installed in the GH Action runner. | Playwright runtime. | **BLOCKING for CI mode.** Use `npx playwright install --with-deps chromium` step. The IA branch's `drummond-grep-check.yml` workflow does NOT install browsers — verify-phase.yml needs this step. |
| 6 | A defined contract for what criteria means in PLAN files (yaml-style, mechanical/dom/visual/behavioral/semantic categories per Jake item 7). | Jake Part 4 item 7. | **BLOCKING** for Layer 3 — vision agent needs structured criteria to check against. The contract is defined in this phase; existing 1.5c IA PLAN files retrofit comes AFTER (see §6 Q6). |
| 7 | gsd-planner agent + plan-review enforcement of the criteria mandate. | Jake Part 4 item 7. | **BLOCKING** for the protocol going forward. Without this, Plan 3a-now and Wave 3 plans skip criteria and the harness has nothing to verify against. |
| 8 | `requirements-expander` agent (this agent) and `nightwork-init-phase` command — which already exist (D-018). | Existing infra. | NOT BLOCKING — already shipped 2026-04-29. |
| 9 | A criterion for harness self-test passes (the harness must verify itself before merging to main). | Jake Part 7 step 11 (self-test: run harness against itself). | **BLOCKING for ship.** A harness that does not pass its own three layers is not safe to deploy. |
| 10 | Definition of ambiguous failure — when does the loop halt for Jake review vs spawn an executor for fix? | Jake Part 4 item 9. | **BLOCKING for loop-with-executor.** Must distinguish Layer 1 failure: TypeScript error in file X line Y (fixable) from Layer 3 failure: vision says cost code is missing on line item but human disagrees (semantic, halt). |

---

## 3. Dependent-soon gaps

What is likely needed shortly after — design for it now.

| # | Gap | Likely next phase | Design implication |
|---|---|---|---|
| 1 | The Layer 2 standards JSON library will grow with each new entity domain (POs in Wave 1.1; daily logs in Wave 2; emails in Wave 3). | Every Wave 1.1+ phase. | Standards files MUST be ergonomic to add: one file = one rule, JSON Schema for the rule shape itself, a `verifyFn` referenced by string ID and resolved at runtime via a registry. Do not bake rules into TypeScript code that has to be modified for every new domain. |
| 2 | The harness will eventually run against `main` post-merge (continuous monitoring), not only on phase branches. | Foundation F3 (CI test gate). | Design `verify-phase.yml` so it can take an arbitrary preview URL via workflow_dispatch input, not only a phase/* push trigger. |
| 3 | The calibration log will inform automatic prompt-density tuning (Jake Part 3 — scale dynamically, not statically). | Wave 1.1+ phases. | Calibration entries must be machine-readable enough that the orchestrator can read them at next-phase scope time. JSON-front-matter + markdown body is the recommended shape. |
| 4 | `gsd-research-standards` will eventually produce a `phase-domain-cache` so the same domain (AIA, accounting) does not re-search on every phase. | Every Wave 1+ phase referencing those domains. | Research output MUST include a cache key (domain identifier) and a TTL (re-research when cache > N days old). Do not burn $1+ on AIA web search every phase. |
| 5 | Layer 3 vision costs (Anthropic API per screenshot per criterion) will scale linearly with phase count × criterion count × commit count. | Every phase running through harness from now on. | Add a cost cap per harness run (e.g., $1.00) and per criterion (e.g., one vision call per criterion per commit, not re-evaluated on no-op commits). The smoke-test pattern in `scripts/smoke-test.mjs:30` (take screenshots only for FAIL/PARTIAL) is the analogue — extend to run vision only on changed surfaces. |
| 6 | Loop-with-executor will need a `gsd-fix-executor` agent variant (lighter prompt, scoped to one failure context). | First time loop fires (next phase). | Either branch `gsd-executor` with a frontmatter variant (`gsd-fix-executor`) or pass a context-mode flag to the existing agent. Decide here so Wave 3 is not the first place to hit this. |
| 7 | The harness should produce a what changed diff between consecutive commits reports — to know if a regression appeared. | Every multi-commit phase. | Store reports under `.planning/verification/reports/[phase]/[commit].md` per Jake spec; add a `[phase]/index.md` that surfaces the commit chain + diffs. Cheap to add now; expensive to retrofit. |
| 8 | A way to skip Layer 3 for prototype-only phases (1.5b is mostly visual, no industry standards apply). | Stage 1.5b prototype work. | Per-phase `verification.config.yml` at `.planning/phases/[phase]/verification.config.yml` declaring which layers/domains apply. Default = all three; opt-out per phase. |
| 9 | Browser support for Layer 3 (Site Office is Safari/iPhone-tested per 1.5b; harness today scopes to Chromium per Playwright default). | Mobile-flow phases (Wave 1.1, Wave 2 daily logs, Wave 3 owner portal). | Out-of-scope for this phase; Mobile Safari specifics defer. But make it `--browser` configurable in the harness so Wave 1.1 can opt in without retrofit. |
| 10 | A way for a downstream phase to ADD a one-shot Layer 2 rule without bloating the global library. | Phases with novel domain logic. | Design Layer 2 registry to accept BOTH global rules (in `.planning/verification/standards/`) AND phase-local rules (in `.planning/phases/[phase]/standards/`). |

---

## 4. Cross-cutting checklist

| Concern | Status | Rationale |
|---|---|---|
| Audit logging | N/A — infra phase, not entity work | This phase adds NO mutations to tenant tables. Activity-log writes are unchanged. |
| Permissions | N/A — infra phase | No new API routes, no role-gated surfaces. |
| Optimistic locking | N/A — infra phase | No write endpoints. |
| Soft-delete + status_history | N/A — infra phase | No new statused entities. |
| Recalculate, do not increment | N/A — infra phase | No derived totals. |
| Multi-tenant RLS | N/A — infra phase | No new tables. |
| Idempotency | **APPLIES — harness reruns** | Re-running harness on the same commit MUST be a no-op (do not double-write reports, do not re-spend Layer 3 vision tokens). Use commit SHA + criteria hash as idempotency key. Reports overwrite-on-rerun is acceptable; cost-spend MUST dedupe. |
| Background jobs | DEFER | The harness is CI-driven (GitHub Action). No request-time work. Inngest unrelated. |
| Rate limiting | **APPLIES — Layer 3 vision Anthropic calls** | Anthropic API has rate limits. Add per-run cap + per-criterion call limit. Failures degrade gracefully (Layer 3 -> skipped, rate-limited rather than FAIL). |
| Observability | **APPLIES** | Harness should emit structured logs (JSON to stdout) so a future Pino pipeline (foundation F3) can consume. Do not `console.log` ad-hoc. Sentry tagging for vision-call failures is reasonable but not required. |
| Data import/export | N/A — no new entities | |
| Document provenance | N/A — no entities originate from documents | |
| Mobile-friendly | N/A for the harness itself; APPLIES to what it tests | The harness renders three viewports (1920x1080, 1280x800, 393x852 per Jake Part 4 item 1). The 393x852 is iPhone-sized, satisfies Wave 1.1 mobile-PM workflow. |
| Drummond fixtures sufficient | N/A — harness uses no fixtures | The harness walks production routes that themselves use Drummond fixtures. The harness has no fixtures of its own. |
| CI test gate | **APPLIES — this IS the CI test gate** | Foundation F3 originally owned GitHub Actions or Vercel pre-build hook running typecheck + test suite (GAP.md A.1 #11). This phase ships earlier and richer. **Document explicitly:** F3 CI test gate is now mostly absorbed by harness Layer 1; F3 CI work narrows to the `npm test` runner + typecheck integration. |
| Error handling for partial failures | **APPLIES — loop-with-executor** | Loop must distinguish (a) all 3 layers pass -> continue; (b) Layer N fails fixably -> spawn executor; (c) Layer N fails ambiguously OR iteration count = 3 -> halt for Jake. State machine documented in PLAN. |
| Graceful degradation | **APPLIES** | (a) Vercel preview not ready -> wait with timeout, retry, then degrade with explicit preview not built error. (b) Anthropic rate-limited -> Layer 3 marks criteria as skipped, retry later not FAIL. (c) GitHub Actions runner times out -> harness emits partial report + error. |
| Internal labor and equipment billing | N/A | |
| Recurring patterns | N/A | |
| Mobile flows | N/A — harness is CI infra | |
| Approval delegation | N/A | |
| Multi-currency | N/A | |
| Retainage | DEFER — Layer 2 rule | Lives in Layer 2 accounting/retainage standard JSON, but the rule itself is retainage = billed * org_workflow_settings.retainage_percentage. Org-configurable per CLAUDE.md. **Scope-cut question:** include retainage rule in initial Layer 2 library or defer to F1? See §6 Q1. |
| Lien waivers | DEFER — Layer 2 rule | Florida 4-statute waiver type structural rule. Same scope-cut question. |
| Sub-tier suppliers | N/A | |
| Tax handling | N/A | |
| Owner notification cadence | N/A | |
| Compliance retention | N/A | Reports under `.planning/verification/reports/` are git-tracked; retention is forever, in git. |

---

## 5. Construction-domain checklist

| Domain consideration | Applies? | Rationale |
|---|---|---|
| Drummond as reference job | YES — indirectly | The harness verifies routes that render Drummond fixture data. The harness itself uses no fixtures. |
| Field mistakes become permanent QC entries | N/A | |
| Draw requests link to punchlist | N/A | |
| Invoice review is the gold standard UI | YES — verification target | Layer 3 vision verifies that document-review surfaces extend the invoice-review template. The cost code missing on each line item failure Jake names in Part 5 step 4 is precisely this kind of check. |
| Stone blue palette + Space-Grotesk-Inter-JetBrains-Mono + logo top-right | YES — Layer 3 + Layer 1 | Layer 1 mechanically catches hex/font drift via existing post-edit hook (already in place; harness re-runs hook output). Layer 3 vision catches palette drift the hook misses (e.g., legitimate token reused incorrectly). |
| Stored aggregates require rationale comments | N/A — no new aggregates | |
| Cost-plus open-book | YES — Layer 3 criterion | Owner-visible surfaces (client portal, draw approve view) need Layer 3 verification that owner sees what they should and not what they should not. **Scope-cut:** owner portal is not in this phase verification target; defer. |
| Florida-specific (lien releases / contractor licenses / retainage caps) | YES — Layer 2 lien-law standards | See §6 Q1. |
| GC fee semantics | YES — Layer 2 accounting standards | GC fee compounds on COs is a math identity Layer 2 can verify. **Scope-cut:** include in initial library or defer? See §6 Q1. |
| Drummond Pay App 5 (corrected from Pay App 8) | YES — AIA G702/G703 reference | The 1.5b CLAUDE.md correction is acknowledged. The Layer 2 AIA rule references the canonical pay-app form — implementation can cite Pay App 5 as the test fixture without baking the path in. |

---

## 6. Targeted questions for Jake

These are the nuance questions the orchestrator asked me to surface explicitly so Jake can answer at EXPANDED-SCOPE review time before /np dispatches.

### Q1. Layer 2 industry-standards library scope for THIS phase

This is the most consequential scope question. Jake Part 8 explicitly invites flagging if any layer should defer to F1.

The five standards domains Jake names (aia, accounting, lien-law, dates, conservation) represent months of construction-domain knowledge if researched and codified rigorously. Three options:

- **A. Ship FRAMEWORK + Layer 1 + Layer 3 + ONE working Layer 2 example (money conservation).** Standards library scaffolding lands but is mostly empty. Future phases populate as they go. ~2 days build, full pipeline runs end-to-end on a single Layer 2 rule.
- **B. Ship FRAMEWORK + 5 domains stubbed (rules JSON exists, ~2-3 fully implemented).** AIA G702 line-7-identity + accounting debits=credits + money conservation get verifyFn implementations; lien-law and dates ship as schema-only stubs that fail-soft until populated. ~3 days build.
- **C. Ship everything Jake described (3 days of construction-accounting research + implementation across all 5 domains).** ~3-4 days of research-heavy work, much of it requiring Jake domain expertise to validate.

**Recommended: A.** Reasoning:
1. The cost-code-on-line-items issue Jake names in Part 5 step 4 is a Layer 3 vision check, not Layer 2 - so the named pain point is solved by A.
2. The construction-domain depth Jake names (AIA G702/G703 structure, accounting identities, conservation laws, computed value formulas) is genuine F1+ territory. F1 already includes every aggregation has an index plan verification work; folding accounting identities into F1 is consistent.
3. The gsd-research-standards agent ships in this phase (item 6); future phases that NEED a domain populate it via that agent on first encounter. This is consistent with Jake calibration-log philosophy (scale dynamically).
4. Net delta vs Jake plan: 1-2 days saved this phase, 1-2 days added across F1-F6 as domains get populated on first need. Same total cost, less overspecification risk.

If Jake disagrees and wants more upfront: **B is the compromise** (framework + 5 stubs + 2-3 implementations). C is the maximalist read of Jake stated scope.

**ASK:** A / B / C?

### Q2. Vercel-only constraint vs current /nx flow

Jake Part 8 says Must work on Vercel preview URLs (not localhost - Jake frustration with localhost is real). Current /nx flow (per CLAUDE.md Testing Rule MANDATORY) restarts dev server, navigates via Chrome DevTools MCP locally, screenshots inline.

Two integrations:

- **A. REPLACE.** Harness becomes the canonical visual verification path. Localhost walks deprecate. CLAUDE.md Testing Rule updates to defer to harness for verification-eligible surfaces. Local dev still runs on localhost for code iteration; visual sign-off goes through Vercel preview + harness.
- **B. AUGMENT.** Harness is the CI signal; localhost walk remains the inner-loop dev tool. CLAUDE.md Testing Rule stays as written. /nx wraps both: localhost during execute (existing), harness on push to Vercel after commit.
- **C. AUGMENT-with-deprecation-path.** Same as B today; CLAUDE.md adds note that harness will replace localhost walks once it is stable + multi-phase-validated. Re-evaluate at end of Wave 3.

**Recommended: C.** Reasoning:
1. Jake frustration with localhost is real and harness is meant to address it. Replacing immediately (A) is risky - if harness has bugs in week 1, dev velocity collapses.
2. Localhost iteration during code-write is genuinely faster (no Vercel deploy round-trip). Removing it means every visual experiment requires a push.
3. Hybrid posture during weeks 1-3 lets the harness prove itself; end-of-Wave-3 re-evaluation gives a natural decision point.
4. This is fundamentally a calibration question - Jake Part 3 calibration log captures it. So C explicitly defers final decision to the calibration log.

**ASK:** A / B / C?

### Q3. Loop-with-executor sequencing relative to existing /nightwork-qa

Current GSD flow: /gsd-execute-phase -> checkpoints -> /nightwork-qa -> /gsd-code-review-fix (if QA found things) -> /gsd-ship. Jake Part 4 item 9 adds a harness-spawns-executor inner loop (max 3 iter).

Three integration patterns:

- **A. Harness loop runs INSIDE /gsd-execute-phase, BEFORE /nightwork-qa.** Each commit during execute fires harness. Failures spawn gsd-fix-executor, max 3 iter, then halt for Jake. /nightwork-qa still runs at end-of-execute as the final gate. (Two-level gating.)
- **B. Harness loop runs AS PART OF /nightwork-qa.** /nightwork-qa becomes the harness orchestrator; spawning executor is a step inside nightwork-qa. Existing /gsd-code-review-fix becomes the legacy path; harness-driven fixes are the modern path.
- **C. Harness loop runs ONLY on push to phase branch, INDEPENDENT of /gsd-execute-phase.** Execute does its work; pushing a checkpoint commit triggers harness via GitHub Action. Failures show up as PR comments / commit status; executor is not spawned by harness - Jake (or Claude on next prompt) sees the report and prompts the fix.

**Recommended: A.** Reasoning:
1. Pattern is novel and risky. Adding it as an INSIDE-execute step keeps the existing /nightwork-qa unchanged - minimal blast radius. Existing post-execute QA continues as the safety net.
2. Per-commit verification (vs end-of-phase) is the explicit catches bugs Jake currently catches manually after print-and-paste walks goal - bugs surface immediately, not at QA.
3. The gsd-fix-executor agent is naturally a branched gsd-executor (frontmatter variant): scoped to one failure context, reads the harness report, makes one focused commit, returns control. Reuses 90% of existing executor logic.
4. C is too loose - the loop semantics depend on iteration counting which is hard to do across human/Claude/GH-Action handoffs. B is cleaner long-term but bundles too much change into one phase.

**Sub-question Q3.1:** halt_after gate interaction. The existing checkpoint protocol (per /gsd-execute-phase) already has halt points. The harness loop max-iter-3 halt is a NEW halt point. If Jake said halt_after iteration 5 in PLAN, should the harness loop budget come out of those 5 (sub-iterations within an iteration) or be additive? **Recommended: ADDITIVE within a single iteration.** A halt-after gate halts when its iteration count is hit; the harness loop is an inner loop that runs up to 3 attempts at fixing whatever the last commit broke. This way harness cost scales with breakage, not with phase complexity.

**ASK Q3:** A / B / C?
**ASK Q3.1:** ADDITIVE (recommended) / SUBSUMED?

### Q4. Boundary vs existing nightwork-end-to-end-test and nightwork-smoke-tester

Both agents exist already. nightwork-end-to-end-test walks create vendor -> PO -> invoice -> approve -> draw -> G702/G703 -> lien release -> paid through Drummond per CLAUDE.md. nightwork-smoke-tester is the existing visual smoke-test agent. Both target localhost.

Three options:

- **A. Harness REPLACES both.** Both agents deprecate; their logic merges into harness Layer 1 (smoke checks) and Layer 2 (workflow integrity). /nightwork-end-to-end-test command becomes a wrapper around the harness.
- **B. Harness AUGMENTS - they remain for localhost dev signal, harness owns CI signal.** No agents change. Harness is additive.
- **C. Harness REPLACES smoke-tester (overlapping concern), KEEPS end-to-end-test (different concern - full Drummond workflow walk vs harness per-route verification).** Smoke-tester logic merges into Layer 1. End-to-end-test stays as the pre-ship Drummond walk-through and gets retrofitted (on a future date) to use harness vision-checks but remains a separate agent.

**Recommended: C.** Reasoning:
1. nightwork-smoke-tester is conceptually identical to harness Layer 1 (mechanical health checks). Keeping both is duplicative and creates which one fired and why confusion.
2. nightwork-end-to-end-test is a workflow integrity test (the order of operations across entities matters), which is closer to Layer 2 than Layer 1, BUT it is a single multi-route walk vs harness per-route walk. They are complementary: harness verifies each route renders correctly; end-to-end-test verifies the journey across routes succeeds.
3. Replacing both (A) is ambitious for one phase. Augmenting both (B) is hand-wavy and the smoke-tester redundancy never resolves.

**ASK:** A / B / C?

### Q5. gsd-research-standards relationship to gsd-phase-researcher

gsd-phase-researcher exists today (cyan, full WebSearch + WebFetch + Context7 + Firecrawl + Exa). It runs at /gsd-plan-phase time and writes RESEARCH.md. Jake Part 4 item 6 adds a NEW agent gsd-research-standards that runs at /np time before gsd-planner and writes .planning/research/[phase]-standards.md.

Three options:

- **A. REPLACE.** gsd-research-standards subsumes gsd-phase-researcher. One research agent, one RESEARCH.md output, with both phase-specific tech research and industry-standards research as sections.
- **B. RUN BESIDE.** Two agents, two outputs. gsd-phase-researcher produces RESEARCH.md (technical patterns, libraries, npm registry checks). gsd-research-standards produces STANDARDS.md (AIA, accounting, lien law, dates, conservation rules - populates Layer 2 criteria). Planner reads both.
- **C. EXTEND.** Single agent with two modes (--mode tech, --mode standards); plan-phase orchestrator calls it twice in sequence; outputs go to two files.

**Recommended: B.** Reasoning:
1. The agents have different concerns and output different artifacts. Tech research is what library exists, what is the best pattern, what is already in our codebase. Standards research is what is the industry-canonical rule, what is the source citation, what is the verifyFn. Keeping them separate makes failure modes obvious - if standards research costs $2 of API calls, you can rate-limit it independently.
2. A creates a god-agent; bug-fix iteration on one mode breaks the other.
3. C is implementable but the cognitive overhead of single agent with modes is more than two clean agents.

**ASK:** A / B / C?

### Q6. Migration plan for existing 1.5c IA Plans (criteria-section retrofit)

Jake Part 4 item 7 makes PLAN-file criteria sections mandatory going forward. Plans 1, 2, 2-amend, 3 in phase/1.5-c-information-architecture lack them. Jake Part 5 says write criteria checklists for each (~1 hour total) but does not specify whether retrofit is part of THIS phase scope or a separate task.

Three options:

- **A. INCLUDE retrofit in this phase.** Add a final task: Write criteria sections for 1.5c Plans 1/2/2-amend/3 in the IA branch via a separate PR. Keeps everything together; creates cross-branch coupling (verification-harness branch ships first, criteria-retrofit lands on IA branch).
- **B. EXCLUDE retrofit; create a follow-up task.** This phase ships harness + protocol; a separate 1.5c-criteria-retrofit task runs on IA branch after harness merges to main. Simpler scope; Jake Part 5 ~1-hour estimate becomes its own thing.
- **C. EXCLUDE retrofit; bundle into Plan 3a-now.** Per Jake Part 5: Then Plan 3a-now spawns through harness. Plan 3a-now PLAN file has criteria; preceding plans (1, 2, 2-amend, 3) lack them but are post-facto. Skip retrofit for landed-already work; criteria mandate applies to future plans only.

**Recommended: B.** Reasoning:
1. Jake Part 7 dispatch sequence is explicit: harness ships first, then 1.5c IA rebases and resumes through harness. The retrofit fits naturally between rebase IA and Plan 3a-now spawns. Treating it as a 1-hour follow-up between merges is clean.
2. A creates branch coupling that is brittle (this branch ships; that branch needs an update; if either delays, both delay).
3. C is tempting but means harness first real run targets Plan 3a-now without a clean baseline of past-plan criteria - and the retrofit is needed for harness to verify retrofitted 1.5c at all (per Part 5 step 1).

**ASK:** A / B / C?

### Q7. Calibration-log writer (orchestrator vs custodian vs auto-extraction)

Jake Part 4 item 8 establishes .planning/calibration-log.md with per-phase entries on parallelism / prompt-density / drift. Jake Part 3 says orchestrator references it at scope time. Who writes the entries?

- **A. nightwork-custodian** (existing skill that runs at end-of-phase ship) appends an entry as part of its post-ship sweep.
- **B. nightwork-qa** (existing orchestrator) writes the entry as part of its end-of-execute report.
- **C. Auto-extraction from QA reports** - a new tiny agent reads the QA verdict, parses pass/fail/iter-counts, and appends to the log.
- **D. Jake writes it** at end-of-phase by hand (~5 min).

**Recommended: A.** Reasoning:
1. nightwork-custodian already runs at post-ship. The calibration entry IS a custodian-style retrospective (what landed clean, what did not, adjustment for next phase). Adding write calibration entry to the custodian existing scope is mechanically simplest.
2. The data the entry needs (parallelism count, iter-N-required-or-not, drift-cases) is mostly extractable from QA report + phase artifacts (PLAN.md, SUMMARY.md, harness reports). Custodian existing pattern is to read those artifacts and synthesize.
3. B is fine but conflates is this phase ready to ship with what did we learn - separable concerns.
4. C is optimal long-term but premature - until we have 3-5 entries, hand-curated quality matters more than auto-extraction precision.
5. D works for entry 1; does not scale.

**ASK:** A / B / C / D?

### Q8. Visibility of harness reports - git-tracked vs gitignored

.planning/verification/reports/[phase]/[commit].md per Jake Part 4 item 1. Are these tracked in git or gitignored?

- **A. GIT-TRACKED.** Reports become permanent record. Anyone landing on a phase branch sees the harness verdict for every commit.
- **B. GITIGNORED.** Reports are local-and-action artifact only. PR comment surfaces the verdict; persistence is via commit status + Action logs.
- **C. PARTIAL.** Final report per phase committed; intermediate (per-commit) reports gitignored.

**Recommended: C.** Reasoning:
1. Per-commit reports clutter git history (every harness re-run rewrites a file = noisy diffs).
2. End-of-phase final report is genuinely useful as historical record (parallels QA report retention).
3. The MASTER-PLAN gitignore already follows this pattern: qa-runs/, plan-reviews/, drift-checks/, e2e-runs/, design-checks/, custodian-runs/, propagate/ are gitignored; architecture/, canonical docs, etc. are tracked. Add .planning/verification/runs/ to the gitignored list, .planning/verification/reports/ (final-only) to tracked.

**ASK:** A / B / C?

---

## 7. Recommended scope expansion

**Stated scope (verbatim, condensed):** Build a 3-layer verification harness (Layer 1 static + Layer 2 industry-standards + Layer 3 vision-against-criteria) with research-during-planning + dynamic-prompting calibration, runnable on Vercel preview URLs via GitHub Actions, with loop-with-executor (max 3 iter) for fixable failures and halt-for-Jake on ambiguous failures. ~2-3 days build. Net 9-10 days to 1.5c shipped vs 5-7 if skipped.

**Recommended phase scope:**

1. **Playwright harness scripts/verify-phase.ts** - auto-detects Vercel preview URL (Q3 prerequisite #3); 3 viewports (1920x1080, 1280x800, 393x852); orchestrates Layers 1/2/3 in sequence; writes report to .planning/verification/reports/[phase]/[commit].md (Q8 hybrid posture). Runnable locally via npx tsx scripts/verify-phase.ts --preview-url URL (prerequisite #4) and from GH Action. Reuses chromium + screenshot pattern from existing scripts/smoke-test.mjs. **2-3 days.**

2. **GitHub Actions workflow .github/workflows/verify-phase.yml** - triggers on push to phase/* (per Jake), workflow_dispatch for manual reruns (per Dependent-Soon section 3 #2), npx playwright install --with-deps chromium step (prerequisite #5), Vercel preview wait + URL discovery, harness invocation, PR-comment posting, commit-status setting. Models on existing .github/workflows/drummond-grep-check.yml structure. Anthropic key sourced from secrets dot ANTHROPIC_API_KEY (prerequisite #2). **0.5 day.**

3. **Layer 1 implementation** - wraps existing build/typecheck/hooks/privacy gates as harness orchestrator steps (no rewrites of those gates themselves); adds DOM assertion runner that reads criteria from PLAN files; route status-code checker. Smoke-test logic from scripts/smoke-test.mjs migrates here. **0.5 day.**

4. **Layer 2 framework + ONE working example (per Q1=A recommendation)** - .planning/verification/standards/{aia,accounting,lien-law,dates,conservation}/ directories with one fully-implemented rule in conservation/money-conservation.json (line items sum to total). Standards rule schema (JSON Schema for the rules themselves). Verify-fn registry resolving by string ID. Foundation for future phases to add more rules cheaply. **0.5 day.**

5. **Layer 3 implementation - Claude vision integration** - Anthropic SDK call passing screenshot + criterion + reasoning request; cost cap per run (default one dollar) + per-criterion call cap (1 per criterion per commit, idempotent on commit SHA + criterion hash, per Cross-Cutting Idempotency above); structured output (pass/fail/reasoning per criterion). Graceful degradation on rate-limit. **0.5 day.**

6. **gsd-research-standards agent (per Q5=B)** - spawned at /np time before gsd-planner; reads phase scope + EXPANDED-SCOPE; identifies relevant industry domains; web-searches authoritative sources (NAHB, AIA documentation, FL state statutes, IRS, GAAP); writes .planning/research/[phase]-standards.md; auto-populates Layer 2 criteria the planner picks up. Caches by domain identifier with TTL (per Dependent-Soon section 3 #4). **0.5 day.**

7. **PLAN file criteria: section mandate** - update gsd-planner prompt to require yaml-style structured criteria (mechanical/dom/visual/behavioral/semantic categories per Jake Part 4 item 7); update nightwork-plan-review to flag missing/vague criteria as REVISE; update nightwork-spec-checker to read structured criteria. Note: 1.5c IA retrofit is a SEPARATE follow-up per Q6=B, NOT part of this phase. **0.5 day.**

8. **Calibration log scaffolding** - initialize .planning/calibration-log.md with empty template + format spec; update nightwork-custodian (per Q7=A) to append per-phase entries at post-ship; update /np orchestrator to read calibration log at scope time. Format: JSON-front-matter + markdown body (per Dependent-Soon section 3 #3). **0.5 day.**

9. **Loop-with-executor mechanism (per Q3=A)** - harness emits actionable failure context (file:line, criterion, expected vs actual); orchestrator inside /gsd-execute-phase spawns a gsd-fix-executor agent variant (frontmatter-branched from gsd-executor per Dependent-Soon section 3 #6) with failure context; max 3 iter (additive within current execute iteration per Q3.1); on iter-3 OR ambiguous failure (Layer 3 vision uncertain) halt for Jake. State machine documented in PLAN. **0.5-1 day.**

10. **Documentation updates** - new .planning/architecture/VERIFICATION-PIPELINE.md (canonical doc); MASTER-PLAN.md DECISIONS LOG entries D-073..D-077 (per Jake item 10) - verification pipeline is canonical infrastructure, layer scope deferred decisions, criteria-mandate, calibration-log, loop-with-executor; update CONTEXT.md cross-refs; PHILOSOPHY.md addition for verification-first development pattern; CLAUDE.md Testing Rule (MANDATORY) updated per Q2=C deprecation-path. **0.5 day.**

11. **Self-test and ship** - run harness against itself (per Jake Part 7 step 11); fix what surfaces; merge phase/1.5-c-verification-harness to main. **0.5 day.**

**Total: ~6.5-8 days build** (vs Jake stated 2-3 days estimate). The overrun is real and worth surfacing - see section 8 Risk R1.

**Out of scope (deferred):**

- **Layer 2 standards beyond money-conservation** - per Q1=A. AIA / accounting / lien-law / dates rules populate as phases need them, via gsd-research-standards. Future phase work, no calendar cost on this phase.
- **1.5c IA Plans 1/2/2-amend/3 criteria retrofit** - per Q6=B. Separate ~1-hour follow-up after harness lands.
- **Plan 3a-now and Wave 3 (Plans 4+5)** - explicitly paused per Jake stated scope. Resume after harness ships.
- **Mobile Safari browser support in harness** - per Dependent-Soon section 3 #9. Chromium-only this phase; --browser flag designed in but not implemented for Webkit/Safari.
- **phase-domain-cache for research agent** - per Dependent-Soon section 3 #4. Single-phase TTL is sufficient; cross-phase caching is V2.
- **Cost-cap enforcement at GH-Action level (vs run level)** - per Cross-Cutting Rate Limiting. Per-run cap implemented; org-level monthly cap is later infrastructure.
- **Replacing nightwork-end-to-end-test** - per Q4=C. End-to-end-test stays; smoke-tester logic absorbed into Layer 1.
- **CI test gate for npm test typecheck** - F3 narrowed-scope work picks this up. This phase ships the Action infrastructure; F3 adds typecheck/test-suite steps.

**Acceptance criteria target (preview - final criteria locked in /gsd-discuss-phase):**

- [ ] scripts/verify-phase.ts exists, runs end-to-end against a Vercel preview URL, completes in < 5 min for a single-route phase.
- [ ] .github/workflows/verify-phase.yml exists, fires on push to phase/*, posts a PR comment + commit status.
- [ ] Layer 1 wraps build/typecheck/hooks/privacy gates and reports per-route HTTP status codes for the 12 production routes 1.5c IA mounts.
- [ ] Layer 2 framework loads JSON rules from .planning/verification/standards/[domain]/, executes verifyFn registered by string ID, fails on rule violation with file:line + expected/actual.
- [ ] Layer 2 ships with at least 1 fully-implemented rule (conservation/money-conservation or equivalent) that passes against current code state.
- [ ] Layer 3 calls Anthropic vision API with screenshot + criterion text, returns pass/fail + reasoning per criterion, respects cost cap (one dollar per harness run by default).
- [ ] gsd-research-standards agent at .claude/agents/gsd-research-standards.md exists; spawned by /np orchestrator; outputs .planning/research/[phase]-standards.md.
- [ ] gsd-planner rejects plans missing the criteria: section; nightwork-plan-review flags vague criteria as REVISE.
- [ ] .planning/calibration-log.md initialized with template; nightwork-custodian appends entry post-ship.
- [ ] Loop-with-executor: harness failure spawns gsd-fix-executor with failure context; max 3 iter; on iter-3 or ambiguous halt for Jake; state machine documented.
- [ ] .planning/architecture/VERIFICATION-PIPELINE.md canonical doc exists; MASTER-PLAN.md decisions D-073..D-077 logged.
- [ ] Self-test: harness runs against this phase own commits; passes all three layers.
- [ ] Privacy gate (32-token denylist) clean across new files.
- [ ] All hooks silent (T10c, tenant-blind, post-edit drift gates).
- [ ] No modification of _fixtures/drummond/, sanitize-drummond.ts, or 1.5c IA Plans 1/2/2-amend/3 commits.
- [ ] Anthropic API key referenced via secrets dot ANTHROPIC_API_KEY only; never present in committed code.
- [ ] Loop max 3 iterations enforced; no infinite-loop path.

---

## 8. Risks and assumptions

| # | Risk / Assumption | Severity | Mitigation |
|---|---|---|---|
| R1 | 6.5-8 day estimate overruns Jake stated 2-3 days. The deltas come from: (a) auto-detect Vercel preview vs hardcoded URL (1d), (b) loop-with-executor state machine (1d), (c) calibration-log integration with custodian (0.5d), (d) docs + DECISIONS LOG entries (0.5d). | HIGH | Surface this delta now (NOT mid-execute). If Jake wants 2-3 days, drop scope: skip auto-detect (use deterministic URL pattern only); skip calibration log integration with custodian (initialize file only, defer custodian update); skip docs polish; inline criteria-mandate in gsd-planner (no plan-review enforcement yet). 2-3 days to MVP, 6-8 to full vision. **Recommended: name the trade explicitly at /gsd-discuss-phase.** |
| R2 | Vercel preview URL discovery is fragile (auto vs deterministic pattern vs API). | MEDIUM | Default to deterministic pattern (Source 0 cited); fall back to Vercel API if pattern fails. Do not deploy harness with single-source URL discovery. |
| R3 | Anthropic vision cost during iteration (every commit re-runs Layer 3). | MEDIUM | Per-criterion idempotency on commit SHA + criterion hash (cross-cutting Idempotency). Per-run cost cap (default one dollar). Per-org cap deferred to F3. |
| R4 | The first real Layer 3 vision criterion (e.g., cost code visible on each invoice line item) may have ambiguous definition - does a tooltip-only cost code count? Header showing total? | MEDIUM | Criteria phrasing requirements are part of the gsd-planner mandate update. Plan-review flags vague criteria. Layer 3 vision returns confidence score; below 0.7 confidence triggers halt-for-Jake even on pass verdict. |
| R5 | Loop-with-executor produces low-quality fixes that pass harness but drift from Jake intent. | MEDIUM | Iter-3 hard halt. gsd-fix-executor writes commit messages naming the harness failure it addressed; commit history surfaces the chain. Jake reviews at /nightwork-qa. |
| R6 | GitHub Actions runner timeout (default 6 hours) is plenty; worst case, harness with 100 criteria x 5 viewports x 12 routes could hit 30+ min - Action-level concurrency limits one harness run per branch. | LOW | Per-phase config opt-out per layer (Dependent-Soon section 3 #8); skip Layer 3 vision for routes where it adds no value. |
| R7 | Standards JSON library schema design at this phase locks future flexibility; bad schema = retrofit pain across F1-Wave 4. | MEDIUM | Standards schema goes through plan-review; document migration story for adding/removing rule fields. |
| R8 | The criteria-mandate retrofit for 1.5c IA Plans (Q6=B follow-up) takes longer than 1 hour because criteria are genuinely hard to write retroactively for already-shipped work. | LOW-MEDIUM | Plan retrofit time-box at 2 hours; if it exceeds, drop to criteria for new work only (Q6=C-equivalent fallback). |
| R9 | Vercel-only constraint (Jake Part 8) creates a CI dependency that did not exist before - broken Vercel = blocked execute. | MEDIUM | Harness has a --mode local for emergency localhost run; documented but discouraged. CLAUDE.md notes the hybrid posture (Q2=C). |
| R10 | The gsd-research-standards agent web-search results may be unreliable (e.g., AIA docs behind paywall, state statutes ambiguous). | MEDIUM | Agent flags low-confidence results; outputs are reviewable in .planning/research/[phase]-standards.md before planner consumes. Jake can override at /np review. |
| A1 | Anthropic API key is already a GitHub Actions secret (or can be added easily). | - | Auto-setup verifies; surfaces as MANUAL Jake action if missing. |
| A2 | Vercel preview deploys fire on push (currently true per D-013). | - | Verify in auto-setup. |
| A3 | Playwright Chromium runs reliably in ubuntu-latest (Action runner). | - | Standard pattern; well-tested. |
| A4 | gsd-fix-executor as a frontmatter-branched gsd-executor is a viable variant. | - | Verify by reading existing gsd-executor.md; if blocking, change to a separate full agent file. |
| A5 | The 5 standards domains Jake names are the right initial set (and computed value formulas is a sub-category, not a 6th domain). | - | Jake confirms at /gsd-discuss-phase. |

---

## 8.5. Approved confirmations (Jake nwrp48 — 2026-05-06)

**Day target:** Full vision (6.5-8 days). MVP path rejected. Surface trade-offs at /gsd-discuss-phase if estimate slips, but baseline accepts the full pipeline.

**Q1-Q8 answers:** ACCEPT ALL RECOMMENDATIONS AS PROPOSED.
- Q1=A (Layer 2 framework + ONE money-conservation example; defer aia/accounting/lien-law/dates to F1+ via gsd-research-standards)
- Q2=C (augment-with-deprecation-path; CLAUDE.md updates to defer to harness once stable; re-eval at end of Wave 3)
- Q3=A (harness loop INSIDE /gsd-execute-phase, BEFORE /nightwork-qa)
- Q3.1=ADDITIVE (CONFIRMED — harness loops within current execute iteration, NOT consuming halt-after budget)
- Q4=C (REPLACE nightwork-smoke-tester via Layer 1 absorption; KEEP nightwork-end-to-end-test for workflow integrity)
- Q5=B (gsd-research-standards runs BESIDE gsd-phase-researcher; two agents, two outputs)
- Q6=B (1.5c IA criteria retrofit EXCLUDED from this phase; ~1-hour follow-up after harness merges to main)
- Q7=A (nightwork-custodian appends calibration-log entries at post-ship)
- Q8=C (final phase report git-tracked; intermediate per-commit reports gitignored)

**Iter-1 plan-review watchpoints (verbatim from Jake nwrp48):**

1. **Standards library schema designed for forward extensibility** — Layer 2 standards arrive incrementally across F1-F6 + Wave 1.1+; schema must not require retrofit pain
2. **Loop-with-executor state machine cleanly bounded** — max 3 iter, no infinite loops, halt-for-Jake on confidence < 0.7 vision results
3. **gsd-research-standards agent reusable across phases** — caching, TTL, search authority hierarchy
4. **Calibration-log integration with custodian produces useful lessons not noise**
5. **gsd-planner mandate update enforces criteria sections without becoming a friction tax**
6. **Vercel preview URL discovery robust** — REST API or CLI primary, deterministic pattern fallback
7. **Idempotency contract precise** — commit SHA + criterion hash key tested, rerun-on-same-commit really is no-op

These watchpoints become explicit plan-review checks in iter-1. nightwork-plan-review reviewers (architect + planner + enterprise-readiness + scalability + compliance + security + design-pushback if applicable) cite these by number when surfacing concerns.

**Standing rules during execute (verbatim from Jake nwrp48):**
- Parallelism by work type (per Part 3 dynamic-prompting categories)
- Integration checkpoints during execute (similar to 1.5c IA Plans 1/2/3/6/7 halt_after pattern)
- Build / typecheck / hooks / privacy clean throughout
- Dynamic prompting via calibration-log (referenced at scope time for next phase)

---

## 9. Hand-off

After Jake approves this expansion (or amends it):
- /nightwork-auto-setup stage-1.5c-verification-harness runs (auto-checks: branch cut, Anthropic GitHub secret present, Vercel preview pattern resolves; manual checklist: confirm Q1-Q8 answers, add ANTHROPIC_API_KEY to GH secrets if missing, confirm Vercel auto-deploy is on for phase/* branches)
- Then /np stage-1.5c-verification-harness for plan
- Then /nx stage-1.5c-verification-harness for execute (lands on phase/1.5-c-verification-harness branch)
- Push to remote, Vercel deploys (this branch preview is itself a harness target via self-test step 11)
- Self-test step: harness runs against itself; verify all three layers pass on this phase own commits
- Merge to main when stable
- Resume 1.5c IA work via Q6=B retrofit (~1-2 hours), then Plan 3a-now spawns through harness, then Wave 3 (Plans 4+5), then 1.5c ship

