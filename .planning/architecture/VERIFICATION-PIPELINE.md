# Verification pipeline

**Status:** SHIPPED (stage-1.5c-verification-harness, 2026-05-XX). Canonical doc.
**Last updated:** Plan 10 of stage-1.5c-verification-harness.

This document is the single source of truth for the 3-layer verification pipeline that catches per-commit bugs against Vercel preview URLs. It supersedes ad-hoc verification descriptions in earlier docs.

## Why this exists

Per Jake nwrp47 + nwrp48: prior verification was Jake-on-localhost-after-print-and-paste. Bugs slipped through three rounds of review (e.g., the cost-code-missing-on-each-line-item issue in 1.5c IA). The harness catches:

- Static check failures (build, typecheck, hooks, privacy) — Layer 1
- Industry-standards violations (money conservation, AIA G702/G703, accounting identities, lien law, dates) — Layer 2
- Visual / semantic drift from PLAN-file criteria — Layer 3 (Claude vision)

Per-commit, on Vercel preview URLs, in CI via GitHub Actions. Loop-with-executor (max 3 iter) auto-fixes mechanical failures; halts for Jake review on ambiguous (confidence < 0.7) or iter-3-reached failures.

## Pipeline overview

```
Push to phase/* branch
  ↓
Vercel preview deploy (auto)
  ↓
GitHub Action: verify-phase.yml
  ↓
scripts/verify-phase.ts → src/lib/verification/orchestrator.ts → runHarness
  ↓
  Layer 1: build/typecheck/hooks/privacy + DOM (3 viewports) + route-status
  ↓
  Layer 2: industry-standards rules (loaded from .planning/verification/standards/<domain>/*.json)
  ↓
  Layer 3: Claude vision against PLAN-file criteria (visual + semantic)
  ↓
  Report: per-commit (gitignored) + final (git-tracked)
  ↓
Inside /gsd-execute-phase: scripts/loop-with-harness.ts wraps with state machine
  ↓
  passed → continue
  failed-fixable → spawn gsd-fix-executor → iter+1
  failed-ambiguous → halt for Jake (HALT-AMBIGUOUS-VISION.md or HALT-ITER-3.md artifact)
  ↓
After execute completes → /nightwork-qa (unchanged)
```

## Layer 1 — static / mechanical / DOM

**Source:** `src/lib/verification/layer1/` (Plan 2 of stage-1.5c-verification-harness)

**What it checks:**
- `mechanical` category: `npm run build` clean (exit 0; nwrp60 FIX 2 dropped substring warning check), `npx tsc --noEmit` clean, system pre-commit hook silent (Drummond grep)
- `dom` category: Playwright chromium across 3 viewports (1920×1080 / 1280×800 / 393×852); selector + text assertions
- Auto-discovered route status (every `src/app/**/page.tsx` route returns 2xx/3xx)

**Vercel deployment-protection bypass (per nwrp60 FIX 1):** route-status fetcher attaches `x-vercel-protection-bypass: <VERCEL_AUTOMATION_BYPASS_SECRET>` + `x-vercel-set-bypass-cookie: true` to every preview URL fetch. Without this, Vercel returns 401 on all unauthenticated requests to protected preview deployments.

**Convention v1 for `dom` criteria:**

```yaml
criteria:
  dom:
    - 'Page /financials/bills/[id] contains element "th[scope=col]:has-text(\"Cost Code\")"'
    - 'Page /dashboard contains text "Recent invoices"'
```

**Loop semantics:** Layer 1 FAIL → state machine `failed-fixable` → spawn `gsd-fix-executor`. Most Layer 1 failures are file:line errors with clear remediation.

**Cost:** Free (no API calls).

**Forward-extensibility (per D-02):** Add a new mechanical check = wrap a CLI command in `runLayer1`. Add a new DOM convention = parser branch in `dom-assertions.ts`.

## Layer 2 — industry-standards

**Source:** `src/lib/verification/layer2/` (Plan 3) + `.planning/verification/standards/<domain>/*.json`

**Domains scaffolded:**
- `aia` — AIA G702/G703 standards (e.g., row-7 identity)
- `accounting` — debits/credits, retainage formulas, GC fee math
- `lien-law` — Florida 4-statute waiver structure (713.20(2)(a-d))
- `dates` — payment schedule cutoffs, business-day calc
- `conservation` — money sums, state machine completeness

**Currently shipped:**
- `conservation/money-line-items-sum` — invoice/draw/CO line items sum to total within 1 cent. Phase placeholder; SKIPs cleanly until `/api/_introspect/*` ships in Wave 1.1+.

**Forward-extensibility (per D-02 + Plan-review watchpoint #1):** Adding a Layer 2 rule:

1. Drop `<rule-id>.json` matching `_schema.json` at `.planning/verification/standards/<domain>/<rule-id>.json`.
2. Drop `<rule-id>.ts` at `src/lib/verification/layer2/standards/<domain>/<rule-id>.ts` calling `registerVerifyFn(...)`.
3. Append `import "./standards/<domain>/<rule-id>"` to `src/lib/verification/layer2/index.ts`.

That's it. No framework code changes per rule. `gsd-research-standards` agent (Plan 7) automates research of new rules at /np time.

**Convention for `behavioral` criteria:**

```yaml
criteria:
  behavioral:
    - "Sum of invoice.line_items[*].amount equals invoice.total_amount within 1 cent"
    - "Approval transitions invoice.status from pm_review to pm_approved"
```

**Loop semantics:** Layer 2 FAIL on `severity: "blocking"` rule → state machine `failed-fixable`. `severity: "warning"` rules log but don't halt loop.

**Cost:** Free (no API calls; standards are local checks).

## Layer 3 — Claude vision

**Source:** `src/lib/verification/layer3/` (Plan 4)

**What it checks:**
- `visual` criteria: design system tokens (Slate Set B), typography (Space Grotesk / Inter / JetBrains Mono), layout
- `semantic` criteria: meaning-level checks not catchable by DOM selectors (e.g., "cost code is visible on each invoice line item")

**Model:** `claude-sonnet-4-6` (per nwrp62 FIX 4 — earlier `claude-3-5-sonnet-20241022` was retired by Anthropic).

**Screenshot dimensions (per nwrp70/71 FIX 11):** fullPage screenshots, capped at 7800px height (Anthropic vision API rejects images with any dimension > 8000px). For long-scroll pages, top 7800px is captured via Playwright `clip` option.

**Auth chain for protected app routes (per nwrp58/59/63/65/67/68 fixes):**
1. Vercel deployment-protection bypass via `extraHTTPHeaders` in `browser.newContext()`
2. Supabase session cookie attachment via `context.addCookies()` (cookie name `sb-<projectRef>-auth-token`)
3. Nightwork app verification-bypass header `x-nightwork-verification-bypass: <VERIFICATION_BYPASS_SECRET>` for `/design-system/*` routes only (production-blocked via `VERCEL_ENV !== "production"` check)

**Page URL routing convention:**

```yaml
criteria:
  visual:
    - "Page /financials/invoices/[id]: Site Office signature visible (tracking-eyebrow 0.14em UPPERCASE eyebrows)"
  semantic:
    - "Page /financials/invoices/[id]: cost code is visible on each line item (no blank cells)"
```

**Confidence-based halt (per D-07):** If vision returns confidence < 0.7 EVEN ON PASS verdict, the loop halts for Jake review. Implementation: `state-machine.ts` transitions to `failed-ambiguous` on any Layer 3 result with confidence < 0.7.

**Idempotency contract (per D-22 + Plan-review watchpoint #7):** `idempotency_key = sha256(commit_sha + canonical_criterion_hash)`. Cached at `.planning/verification/runs/<phase>/<commit>/vision-<key-prefix>.json` (gitignored). Rerun on same commit = cache hit, vision_cost_usd=0. Plan 11 self-tests this invariant.

**Cost cap (per D-22):** Default $1 per harness run. CostCap enforces; calls beyond cap return SKIP. Per ITER-1 C4: CostCap constructed ONCE per `runLoop` invocation (singleton across iterations; NOT 3× multiplied). Org-monthly cap deferred to F3.

**Cost guidance:**
- ~$0.007 per call (claude-sonnet-4-6 vision; empirical from bring-up)
- 20 criteria × 1 commit ≈ $0.14; idempotency caps reruns at ~$0
- Calibration log (Plan 9) tracks actual `vision_cost_usd` per phase

## State machine (per D-05/D-06/D-07)

```
idle → running-layer-1 → running-layer-2 → running-layer-3 → passed | failed-fixable | failed-ambiguous
```

**Transitions:**
- L1/L2 FAIL → failed-fixable (unless iter-3, then failed-ambiguous)
- L3 FAIL with confidence ≥ 0.7 → failed-fixable (unless iter-3)
- L3 result with confidence < 0.7 (ANY verdict) → failed-ambiguous
- All layers PASS → passed
- failed-fixable + iter < 3 (default mode) → return `paused-for-fix` (Claude orchestrator spawns gsd-fix-executor)

**Iter-N loop (per D-06):** MAX_ITERATIONS = 3. ADDITIVE within current execute iteration. Does NOT consume halt-after budget.

**Halt-for-Jake artifacts (3 types):**
- `HALT-AMBIGUOUS-VISION.md` — any Layer 3 result with confidence < 0.7 (per D-07)
- `HALT-ITER-3.md` — loop reached MAX_ITERATIONS without resolution
- `HALT-FIX-QUALITY-FAILURE.md` — iter > 1 fix-quality gate (build + tsc) broke by fix-executor commit (ITER-1 MEDIUM-3)

All retained to `.planning/verification/reports/<phase>/halts/<commit>-<reason>.md` (git-tracked, SOC2 traceable per ITER-1 W3).

## Criteria mandate (per D-17/D-18)

Every PLAN.md from stage-1.5c-verification-harness onward includes a `<criteria>` yaml block:

```yaml
criteria:
  mechanical: [...]
  dom: [...]
  visual: [...]
  behavioral: [...]
  semantic: [...]
```

**Enforcement:** `nightwork-plan-review` flags missing/vague criteria as REVISE. **Consumer:** harness Layer 1/2/3 + `nightwork-spec-checker` (per D-19).

**1.5c IA exemption (per Q6=B):** Plans 1/2/2-amend/3 on `phase/1.5-c-information-architecture` branch are exempt; criteria retrofit is a separate ~1-hour follow-up after harness merges to main.

**Friction-tax watchpoint (per D-18 / Plan-review watchpoint #5):** ~5 min/plan target. >20 criteria = plan should split. >50% PLAN_VAGUE_CRITERIA flags = template needs more default phrasings (extend, don't fail).

**Route convention (per nwrp65 FIX 7):** `dom` / `visual` / `semantic` criteria MUST start with an explicit route in the form `Page /<exact-path>: …`. The `<route>` placeholder pattern is **deprecated** — Layer 3 runner extracts the path literally, so unresolved placeholders cause Playwright to navigate to `/<route>` (404).

**Authoring lessons (per nwrp60 FIX 3 / nwrp64 FIX 6 / nwrp65 FIX 7):**
- `visual:` and `semantic:` criteria MUST describe something visible on a rendered web page.
- Documentation claims, CI workflow design, agent design, code architecture, schema rules, source-file implementation claims → `behavioral:` category or N/A entries (NOT vision-evaluable).

**Criteria-loader regex hardening (per nwrp65 FIX 7):** `<criteria>` and `</criteria>` tags MUST be on their own lines. Inline-prose mentions like `"…require <criteria> yaml block…"` no longer trigger extraction (which previously caused template examples to be loaded as ACs).

## Vercel preview URL discovery (per D-20/D-21 / watchpoint #6)

4-tier hierarchy in `src/lib/verification/vercel-discovery.ts`:

1. Explicit `--preview-url` arg
2. `vercel ls` CLI primary
3. Vercel REST API + `VERCEL_TOKEN` fallback
4. Deterministic pattern (`nightwork-platform-git-<slug>-jakeross838s-projects.vercel.app`) — unreliable for long branch names
5. All paths failed → throw with actionable error

Wait-for-Ready: HEAD probe with exponential backoff up to 5 min cap.

## Calibration log (per D-13/D-14)

`.planning/calibration-log.md` is append-only; each phase gets one entry written by `nightwork-custodian` at post-ship sweep. JSON-front-matter (machine-readable) + markdown body (human-readable). Schema at `.planning/calibration-log-schema.md`.

`/np` orchestrator reads recent 3-5 entries when scoping next phase; adjusts parallelism / prompt density / iter budget per heuristics in schema reader rules.

## Agent coordination

**`gsd-research-standards`** (Plan 7) — runs at `/np` time BEFORE `gsd-planner`, BESIDE `gsd-phase-researcher`. Produces `.planning/research/<phase>-standards.md` with proposed Layer 2 rules. Caches by domain+subset+tenant with TTL.

**`gsd-fix-executor`** (Plan 7) — frontmatter-branched from `gsd-executor`. Receives ONE failure context, makes ONE focused commit, returns. Spawned by `/gsd-execute-phase` on failed-fixable. Never invokes the harness itself. Tenant-context fence (9 MUST-NOT-edit categories) enforced via pre-commit shell snippet.

## CI integration

`.github/workflows/verify-phase.yml` (Plan 6) — first GH Action on main from this branch. Triggers on push to `phase/*` + workflow_dispatch. Posts PR comment + sets commit status. Concurrency: one run per branch. Node 22 (per nwrp56). Env vars: `ANTHROPIC_API_KEY` + `VERCEL_TOKEN` + `HARNESS_FIXTURE_PASSWORD` + `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `VERCEL_AUTOMATION_BYPASS_SECRET` + `VERIFICATION_BYPASS_SECRET`.

## Reports

- **Per-commit:** `.planning/verification/runs/<phase>/<commit>/report.md` (gitignored per D-16)
- **Final:** `.planning/verification/reports/<phase>/final.md` (git-tracked per D-15)
- **Halt artifacts:** `.planning/verification/runs/<phase>/<commit>/HALT-*.md` + retention at `.planning/verification/reports/<phase>/halts/<sha>-<reason>.md`

## Sequencing relative to /nightwork-qa

Per D-05: harness loop runs INSIDE /gsd-execute-phase BEFORE /nightwork-qa. /nightwork-qa continues unchanged as the final post-execute gate. Harness catches per-commit issues; /nightwork-qa catches phase-level integrity issues.

## Boundary vs existing agents

Per Q4=C:
- **`nightwork-smoke-tester`** (existing) — REPLACED. Mechanical-health-check logic absorbed into Layer 1 (Plan 2). Agent file deprecated.
- **`nightwork-end-to-end-test`** (existing) — KEPT. Workflow integrity walk through Drummond is complementary to harness per-route verification. Future date may retrofit to use harness vision-checks.

## Plan-review watchpoints (canonical anchors)

| # | Watchpoint | Anchor |
|---|---|---|
| 1 | Standards library schema designed for forward extensibility | Plan 1 (registry contract) + Plan 3 (schema + first rule) |
| 2 | Loop-with-executor state machine cleanly bounded | Plan 1 (state machine spec) + Plan 8b (implementation) |
| 3 | gsd-research-standards agent reusable across phases | Plan 7 (caching, TTL, search authority hierarchy) |
| 4 | Calibration-log integration with custodian produces useful lessons not noise | Plan 9 (entry schema + custodian writer) |
| 5 | gsd-planner mandate update enforces criteria sections without becoming a friction tax | Plan 8a (template + enforcement) |
| 6 | Vercel preview URL discovery robust | Plan 5 (4-tier discovery hierarchy) |
| 7 | Idempotency contract precise | Plan 1 (contract spec) + Plan 4 (cache implementation) + Plan 11 (rerun-no-op self-test) |

## Operational reference

**Run harness locally:**

```bash
npx tsx scripts/verify-phase.ts --phase stage-X-Y --preview-url https://...
```

**Run loop (with state machine + halt artifacts):**

```bash
npx tsx scripts/loop-with-harness.ts --phase stage-X-Y
```

**Run via `/nx`:** auto-invokes loop inside `/gsd-execute-phase` after each commit.

**Run via GitHub Actions:** push to `phase/*` → workflow fires automatically. Or `gh workflow run verify-phase.yml -f phase=stage-X-Y`.

## Extension points (forward work)

- **Layer 2 rule additions:** F1 + Wave 1.1+ phases via `gsd-research-standards` (NAHB / AIA / FL statutes / IRS / GAAP authority hierarchy)
- **Mobile Safari support:** `--browser` flag designed in (Plan 4 Layer 3); WebKit implementation deferred to Wave 1.1
- **Cross-phase research caching:** single-phase TTL this phase; cross-phase cache deferred
- **Org-monthly Anthropic cost cap:** per-run cap implemented; org-monthly deferred to F3
- **Auto-spawn `gsd-fix-executor` mode:** loop has the knob (`auto_spawn_fix_executor`); full implementation deferred to Wave 1.1+
- **`/api/_introspect/*` routes:** Layer 2 conservation rule references these; deferred to Wave 1.1+ when Layer 2 rules need live entity data

## Out-of-scope (not part of this pipeline)

- `/nightwork-end-to-end-test` workflow integrity walk — separate concern
- F3 narrowed-scope CI test gate (`npm test` runner + typecheck integration) — separate phase
- 1.5c IA criteria retrofit — separate ~1-hour follow-up post-harness-merge

## Tenant safety boundary (per stage-1.5c-verification-harness D-30)

**Per D-30 — verbatim:** "Verification harness operates on fixture-org-scoped data only. Real-tenant data is unreachable BY CONSTRUCTION at every layer (auth strategy, screenshot capture, criteria loading, vision API calls, report generation, idempotency cache, fix executor commits). No exception path exists for 'just this once' platform-admin verification — if a future need arises, it requires explicit D-30 amendment, not a code workaround."

**Implementation map (8 layers):**

| Layer | Tenant-safety mechanism |
|---|---|
| Auth strategy (Plan 5) | `auth-strategy.ts` `createHarnessSession` authenticates as `harness-fixture@nightwork.local` with membership in single fixture org `FIXTURE_ORG_ID`. RLS unchanged but session's org_id claim resolves only to fixture data. |
| Screenshot capture (Plan 4) | Path includes `org_id`: `runs/<phase>/<commit>/screenshots/<org_id>/<route>.png`. Per-org subdir means cross-tenant screenshots never co-mingled on disk. |
| Criteria loading (Plan 5) | `sanitizeCriterionText` blocklist (200-char cap; rejects "ignore prior", "system:", "override", JSON-shaped braces+backticks, nested newlines). Prompt injection is defense-in-depth. |
| Vision API calls (Plan 4) | Defender system prompt + strict JSON schema validation + suspicious-PASS detection. |
| Report generation (Plan 5) | `report-writer.ts` `writeReport` (final tracked) sanitizes evidence — strips page URLs, screenshot paths, raw vision reasoning. |
| Idempotency cache (Plan 1) | `canonicalCriterionHash` includes `org_id`. Cached PASS verdict from tenant A cannot be reused for tenant B. |
| Fix executor commits (Plan 7) | `gsd-fix-executor` MUST NOT edit `_fixtures/`, `sanitize-drummond.ts`, RLS migrations, `getCurrentMembership` callsites, tenant-table migrations, `/api/_introspect/*` routes, `src/middleware.ts`, `src/lib/api/auth*`, other phases' planning artifacts. Pre-commit shell snippet enforces. |
| GH Actions artifact upload (Plan 6) | Retention 30→7 days; artifact path glob excludes `screenshots/` subtree. Raw bytes never reach git-tracked artifact. |

**Why "by construction" rather than "by enforcement":** A dropped RLS policy must not cause a leak. Tenant-blind primitives + fixture-org-scoped session + per-org_id-keyed cache + sanitized git-tracked artifacts work together so that even if any single safeguard fails, the others still hold.

**`/design-system/*` verification-bypass exception (per nwrp68):** the Nightwork app middleware accepts `x-nightwork-verification-bypass: <secret>` header to skip the platform_admin gate ONLY on `/design-system/*` routes (sample-data only per CLAUDE.md; not tenant data). Production-blocked via `VERCEL_ENV !== "production"` check. Timing-safe compare. Audit-logged. This narrows but does NOT eliminate D-30 — tenant-data routes remain platform_admin-gated.

## Report sanitization rules (per ITER-1 multi-tenant C5 + compliance WARNING-3)

Two report types with different sanitization profiles:

| Report | Path | Tracked? | Evidence sanitized? |
|---|---|---|---|
| Per-commit | `.planning/verification/runs/<phase>/<commit>/report.md` | gitignored | NO (full evidence) |
| Final | `.planning/verification/reports/<phase>/final.md` | git-tracked | **YES** |
| HALT artifacts (per ITER-1 W3) | `runs/<commit>/HALT-*.md` + `reports/halts/<sha>-<reason>.md` | mixed | reports/halts/ copies inherit final.md sanitization |

**Sanitization implementation (Plan 5 `report-writer.ts`):**

Strip from `final.md`: full page URLs, screenshot paths, raw vision reasoning.
Keep in `final.md`: criterion ID, verdict, confidence, layer + category, truncated evidence (≤80 chars), cumulative cost + duration.

## Data retention table (per ITER-1 compliance WARNING-4)

| Artifact | Storage | Retention | Deletion trigger |
|---|---|---|---|
| Per-commit report | repo gitignored | indefinite | `git clean -fdx .planning/verification/runs/` |
| Screenshots (`<org_id>/`) | repo gitignored | indefinite | same |
| Idempotency cache | repo gitignored | indefinite | same |
| HALT artifacts (runs/) | repo gitignored | indefinite | same |
| HALT retention copies (`reports/halts/`) | repo git-tracked | indefinite (in git history) | manual cleanup |
| Final phase report | repo git-tracked | indefinite | overwritten on next run |
| Final report versioned alias (W4) | repo git-tracked | indefinite | manual cleanup |
| GH Actions artifact | GitHub | **7 days** (was 30, per C2) | automatic GitHub expiration |
| Anthropic API data | Anthropic servers | **zero retention** (DPA — see WARNING-2) | n/a |
| Sentry error events (W1) | Sentry servers | per Sentry plan (30/90 days) | per Sentry settings |
| Calibration log | repo git-tracked | indefinite (append-only) | n/a |

## SOC2 control map (per ITER-1 compliance WARNING-5)

| Control | Description | Implementation |
|---|---|---|
| **CC6.1** Logical/physical access | Fixture-org-scoped session; tenant-context fence; getCurrentMembership RLS; secrets via `${{ secrets.X }}` only | Plans 5/7/6 + CLAUDE.md |
| **CC6.7** Data transmission/disposal | API key redaction; vision API TLS 1.2+; Anthropic zero-retention; artifact retention 7d | Plans 4/5/6 |
| **CC7.2** System monitoring | Sentry tagging on harness exceptions; HALT artifacts retained for SOC2 traceability (W3); commit status; PR comment | Plans 4/5/8b/6 |
| **PI1.1** System inputs authorized/complete/accurate/timely | sanitizeCriterionText; strict vision JSON schema validation; suspicious-PASS detection; 200-char cap; injection pattern blocklist | Plans 4/5 (SEC-HIGH-2) |

Each control row should be confirmed by an external SOC2 auditor at the appropriate trust-services-criteria audit cycle. Nightwork is pre-SOC2 today; this map is preparatory documentation.

## Anthropic data-processor disclosure (per ITER-1 compliance WARNING-2)

**Anthropic acts as a data sub-processor for the verification harness.** Layer 3 vision calls send screenshots + criterion text + page URL to Anthropic Claude API.

**Anthropic processing posture:**
- Per Anthropic API Data Usage Policy: API inputs/outputs are NOT used for model training. Zero-retention attestation applies.
- Per Anthropic DPA: data residency in US; encryption in transit + at rest; processed only for the duration of the API call.

**Per ITER-1 D-30 coverage:** the screenshots sent to Anthropic are FIXTURE-ORG-ONLY by construction (harness session authenticates as harness-fixture user; production tenant data unreachable). Even if Anthropic's processing were less strict, no real-tenant data could leak.

**Future (Wave 1.1+):** before extending the harness to per-tenant preview verification, formal Anthropic DPA addendum required. Tenant opt-in to per-tenant Layer 3 vision in org_settings. F3 covers.

## API key redaction (per ITER-1 compliance WARNING-1)

API keys (`sk-ant-*` Anthropic, `Bearer *` for various) MUST be redacted from any string that could end up in:
- stderr output (CI logs, local dev console)
- Sentry exception payloads
- Committed report files
- GitHub artifact zips

**Implementation (Plans 4 + 5 inline):**

```typescript
function redactApiKey(message: string): string {
  return message
    .replace(/sk-ant-[A-Za-z0-9_\-]+/g, "[REDACTED:ANTHROPIC_KEY]")
    .replace(/Bearer\s+[A-Za-z0-9_\-\.=]+/g, "Bearer [REDACTED]");
}
```

Every error path wraps with `redactApiKey(message)` before stderr / Sentry / report write.

## Final report versioning (per ITER-1 W4 enterprise-readiness)

**Problem:** `reports/<phase>/final.md` is overwritten on each harness run. Historical comparison lost.

**Amendment:** also write a versioned alias `final-<run-iso-date>.md` alongside the latest `final.md`. Versioned files preserve history.

## Vercel ls stdout grep fragility (per ITER-1 W6 enterprise-readiness)

**Problem:** Plan 5 `vercel-discovery.ts` `tryVercelCli` parses `vercel ls` stdout via line-by-line grep + URL regex. Vercel CLI output format changes between versions.

**Recommended future amendment (Wave 1.1+):** replace `vercel ls` parsing with `vercel inspect <branch> --json`.

**Mitigation today:** 4-tier hierarchy with REST API as fallback. Discovery is robust by layered defense, not by primary-path stability.

## Iter-1 plan-review amendments anchored here

Per Jake nwrp49 — applied targeted amendments to address iter-1 plan-review verdict (REVISE-PLAN — 11 CRITICAL/HIGH findings + 24 WARNINGs).

**Cluster summary:**

| Cluster | Findings | Affected plans | Doc location |
|---|---|---|---|
| 1: Tenant boundary by construction | C1-C6 + WARNING-3 | Plans 1, 3, 4, 5, 6, 7, 10 | D-30 + this doc § Tenant safety boundary |
| 2: State machine + criteria loader | ARCH-CRIT-1/2/3 | Plans 1, 5, 8b, 11 | this doc § State machine |
| 3: Injection hardening | SEC-HIGH-1/2 | Plans 4, 5, 6 | this doc § sanitization / injection |
| Inline WARNINGs | W1-W6 + MEDIUM-2/3 | Plans 4, 5, 8b, 6 | inline in each plan |
| Plan 10 doc-pass | DPA, retention, SOC2, sanitization, redaction, final versioning, vercel grep | This Plan 10 | sections above |
| Wave-1.1+ deferred | scalability/multi-tenant futures | deferred-items.md | future |

**Iter-2 plan-review watchpoints (per Jake nwrp49 §5):**
1. C1 fix produces real auth strategy ✓ (Plan 5 auth-strategy.ts ships)
2. ARCH-CRIT-1 fix verified by iter-3 hard-halt test case ✓ (Plan 11 self-test executes)
3. ARCH-CRIT-2 fix includes criteria-loader smoke test ✓ (Plan 1 + Plan 11)
4. SEC-HIGH-1 fix uses env-var indirection ✓ (Plan 6 env: blocks)
5. SEC-HIGH-2 fix includes prompt sanitization layer + assertion ✓ (Plan 5 sanitizeCriterionText + Plan 4 strict schema)
6. D-30 wording lands in CONTEXT.md, cross-referenced from PHILOSOPHY.md ✓

## Source attribution

- **Spec:** `.planning/expansions/stage-1.5c-verification-harness-EXPANDED-SCOPE.md` (APPROVED 2026-05-06)
- **Plans:** `.planning/phases/stage-1.5c-verification-harness/01.5-c-verification-harness-{1..11}-*-PLAN.md`
- **Decisions:** D-01..D-30 in `01.5-c-verification-harness-CONTEXT.md`. MASTER-PLAN D-073..D-077 (Plan 10 Task 2).
- **Implementation:** `src/lib/verification/`, `scripts/verify-phase.ts`, `scripts/loop-with-harness.ts`, `.github/workflows/verify-phase.yml`, `.claude/agents/gsd-research-standards.md`, `.claude/agents/gsd-fix-executor.md`, `.planning/calibration-log.md`, `.planning/calibration-log-schema.md`, `supabase/migrations/00092_verification_harness_fixture_org.sql` + `00093_harness_fixture_profile_corrective.sql`.
