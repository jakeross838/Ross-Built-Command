# Spec check -- Phase stage-1.5c-verification-harness: Verification Harness

**Auditor:** nightwork-spec-checker
**Date:** 2026-05-07
**Branch:** phase/1.5-c-verification-harness
**Phase base:** 7607bbf
**Self-test verdict at HEAD:** PASS (FAIL=1 AC-139 documented surface gap, SKIP=1)

---

## Acceptance criteria

### Phase-level criteria (README.md)

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| PHASE-AC-1 | Build clean at every wave boundary | COVERED | SELF-TEST-LOG.md:14 confirmed across 10+ CI runs |
| PHASE-AC-2 | Typecheck clean at every wave boundary | COVERED | SELF-TEST-LOG.md:15 confirmed |
| PHASE-AC-3 | All hooks silent on every commit | COVERED | SELF-TEST-LOG.md:17 hooks-runner Layer 1 PASS every run |
| PHASE-AC-4 | Privacy gate (32-token denylist) clean | COVERED | Layer 1 hooks-runner covers denylist; no violations reported |
| PHASE-AC-5 | No Drummond identifier leaks | COVERED | SELF-TEST-LOG.md:17 Drummond grep gate PASS every run |
| PHASE-AC-6 | No modification of _fixtures/drummond/, sanitize-drummond.ts, design-system, 1.5c IA commits | COVERED | git log 7607bbf..HEAD shows no commits touching those paths |
| PHASE-AC-7 | Anthropic API key only via secrets.ANTHROPIC_API_KEY | COVERED | .github/workflows/verify-phase.yml:58 |
| PHASE-AC-8 | All 7 plan-review watchpoints verified | COVERED | SELF-TEST-LOG.md:229-250 all 7 tabulated PASS |
| PHASE-AC-9 | Self-test (Plan 11) passes before merge to main | COVERED | SELF-TEST-LOG.md:252-255; AC-139 is documented known-FAIL |
| PHASE-AC-10 | Plans 8a/8b produce criteria template under 5min friction | PARTIAL | Template text exists inside Plan 8a PLAN.md body (lines 151-171) but .planning/templates/criteria-template.md does not exist on disk |

### Plan 1 -- Foundation

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| AC-1-1 | types.ts exists with all interfaces from spec | COVERED | src/lib/verification/types.ts:1-201 all types present |
| AC-1-2 | registry.ts with registerVerifyFn/resolveVerifyFn/verifyFnRegistry | COVERED | src/lib/verification/registry.ts confirmed |
| AC-1-3 | idempotency.ts with 4 exports | COVERED | src/lib/verification/idempotency.ts confirmed |
| AC-1-4 | state-machine.ts with initialState/transition/isTerminal/isHaltState/MAX_ITERATIONS=3 | COVERED | state-machine.ts:27,36,44,130,134 |
| AC-1-5 | _schema.json valid JSON with 5-domain enum | COVERED | .planning/verification/standards/_schema.json exists |
| AC-1-6 | 5 domain dirs with .gitkeep | COVERED | aia/accounting/lien-law/dates/conservation all present |
| AC-1-7 | .planning/verification/reports/.gitkeep exists | COVERED | File confirmed (0 bytes) |
| AC-1-8 | .gitignore has verification/runs/ ignored + standards/reports re-included | COVERED | grep confirmed |
| AC-1-9 | npm run build clean | COVERED | SELF-TEST-LOG.md:14 |
| AC-1-10 | npx tsc --noEmit clean | COVERED | SELF-TEST-LOG.md:15 |
| AC-1-11 | Drummond grep gate silent | COVERED | SELF-TEST-LOG.md:17 |
| AC-1-13 | Layer1/2/3Context in types.ts (ARCH-CRIT-3) | COVERED | types.ts:137-181 all three with org_id: string |
| AC-1-14 | FIXTURE_ORG_ID exported; canonicalCriterionHash accepts org_id default (C4+D-30) | COVERED | types.ts:134; idempotency.ts signature confirmed |
| AC-1-15 | criteria-loader.test.md scaffold with 4 failure modes + js-yaml trade-off | COVERED | src/lib/verification/criteria-loader.test.md exists |
| AC-1-16 | Migration verification_harness_fixture_org.sql; idempotent (C1+D-30) | COVERED | supabase/migrations/00092 + 00093 corrective |

### Plans 2-7 and 8b (summary)

| Plan | Deliverable | Verdict | Evidence |
|------|-------------|---------|----------|
| 2 | Layer 1 runners (build-typecheck, hooks-runner, dom-assertions, route-status, index) | COVERED | src/lib/verification/layer1/ all 5 files present |
| 3 | Layer 2 loader, runner, money-line-items-sum, self-test-always-pass, introspection guard rail (C3) | COVERED | src/lib/verification/layer2/ + standards/conservation/ all present; SELF-TEST-LOG.md:173-178 |
| 4 | Layer 3 vision-client, cost-cap, runner; injection defense (SEC-HIGH-2); 429 retry | COVERED | src/lib/verification/layer3/ files present; SELF-TEST-LOG.md:163-168 |
| 5 | orchestrator.ts (layer composition); vercel-discovery.ts 4-tier; auth-strategy.ts (C1+D-30); criteria-loader.ts; report-writer.ts (C5); scripts/verify-phase.ts | COVERED | All files confirmed; auth-strategy.ts:169-175 D-30 BREACH detection |
| 6 | verify-phase.yml; SEC-HIGH-1 env-var indirection; 7d artifact retention (C2); PR comment + commit status | COVERED | verify-phase.yml:25-28,108-134; run 25679262906 infrastructure PASS |
| 7 | gsd-research-standards.md (TTL+authority hierarchy); gsd-fix-executor.md (tenant-context fence C6) | COVERED | Both agent files present; SELF-TEST-LOG.md:124-139 |
| 8b | loop-orchestrator.ts; scripts/loop-with-harness.ts; SM in runLoop only (ARCH-CRIT-1); paused-for-fix (WARN-3); CostCap hoisted (C4) | COVERED | Files present; types.ts:73,175; SELF-TEST-LOG.md:79-92 |

### Plan 8a -- Criteria mandate

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| 8a-1 | gsd-planner.md updated to require criteria block (D-17/D-18) | MISSING | grep for D-17, D-18, criteria mandate, criteria-template in .claude/agents/gsd-planner.md returns zero matches |
| 8a-2 | nightwork-spec-checker.md updated for structured criteria consumer (D-19) | MISSING | grep for structured criteria, D-17, D-18, D-19 in .claude/agents/nightwork-spec-checker.md returns zero matches |
| 8a-3 | nightwork-plan-review skill/agent updated to enforce criteria presence + specificity | MISSING | No .claude/skills/nightwork-plan-review/ directory; no agent file updated |
| 8a-4 | .planning/templates/criteria-template.md ships | MISSING | .planning/templates/ directory does not exist on disk |

Note: commit ab292c6 (only Plan 8a commit) modified only criteria-loader.ts and the Plan 8a PLAN.md. No Plan 8a SUMMARY file exists.

### Plans 9-11

| Plan | Deliverable | Verdict | Evidence |
|------|-------------|---------|----------|
| 9 | calibration-log.md scaffold + calibration-log-schema.md (14+ fields) | PARTIAL | Files exist; numeric fields are 0 / (pending ship) -- correct pre-ship per D-13; custodian fills at post-ship |
| 10 | VERIFICATION-PIPELINE.md; MASTER-PLAN.md D-073..D-077; PHILOSOPHY.md section 9; CLAUDE.md Testing Rule | COVERED | All confirmed at named locations |
| 11 | Harness runs end-to-end; 3 layers pass; idempotency verified; SM bounded; 7 watchpoints | COVERED | SELF-TEST-LOG.md:28-250 comprehensive evidence |

### nwrp68 / nwrp70 in-scope fixes

| Fix | Deliverable | Verdict | Evidence |
|-----|-------------|---------|----------|
| nwrp68 | middleware.ts x-nightwork-verification-bypass for /design-system/* | COVERED | src/middleware.ts lines 33-172 bypass implemented, secret-gated, production-blocked |
| nwrp70 FIX 10 | textarea.tsx use client directive | COVERED | src/components/ui/textarea.tsx:1 |

---

## Spec deliverables

- [x] src/lib/verification/ module tree (Plans 1-5 + 8b) -- COVERED
- [x] scripts/verify-phase.ts -- COVERED
- [x] scripts/loop-with-harness.ts -- COVERED
- [x] .github/workflows/verify-phase.yml -- COVERED
- [x] .claude/agents/gsd-research-standards.md -- COVERED
- [x] .claude/agents/gsd-fix-executor.md -- COVERED
- [x] supabase/migrations/00092 + 00093 -- COVERED
- [x] .planning/architecture/VERIFICATION-PIPELINE.md -- COVERED
- [x] .planning/calibration-log.md scaffold -- COVERED (custodian fills at post-ship per D-13)
- [x] .planning/calibration-log-schema.md -- COVERED
- [x] MASTER-PLAN.md D-073..D-077 -- COVERED
- [x] PHILOSOPHY.md section 9 -- COVERED
- [x] CLAUDE.md Testing Rule (Q2=C hybrid posture) -- COVERED
- [ ] .claude/agents/gsd-planner.md criteria mandate update (D-17/D-18) -- MISSING
- [ ] .claude/agents/nightwork-spec-checker.md structured criteria consumer (D-19) -- MISSING
- [ ] nightwork-plan-review criteria enforcement update -- MISSING
- [ ] .planning/templates/criteria-template.md -- MISSING

---

## Domain rules spot-check

- **Drummond fixtures used:** yes -- harness operates on harness-fixture@nightwork.local in fixture-harness-org; no real Drummond data used
- **Recalculate-not-increment honored:** yes -- no financial aggregation logic introduced; harness is CI tooling
- **Multi-tenant RLS posture:** pass -- auth-strategy.ts enforces fixture-org scope; D-30 by-construction; FIXTURE_ORG_UUID assertion at auth-strategy.ts:169-175; no platform-admin escape hatch
- **Design tokens (no hardcoded colors):** pass -- no UI components in src/lib/verification/; no new hex codes introduced
- **Audit log writes on every state change:** pass/N/A -- harness is CI tooling not a financial workflow entity; HALT artifacts serve as audit trail per SOC2 note in VERIFICATION-PIPELINE.md

---

## Findings

### BLOCKING

1. **Plan 8a deliverables not landed** -- Four required artifacts of Plan 8a are absent from the codebase:
   - .claude/agents/gsd-planner.md: grep for D-17, D-18, criteria mandate, criteria-template returns zero matches. Future PLAN files will have no machine-enforced criteria block requirement.
   - .claude/agents/nightwork-spec-checker.md: grep for structured criteria, D-17, D-18, D-19 returns zero matches. Method step 1a (read structured criteria block) was never inserted.
   - nightwork-plan-review: no .claude/skills/nightwork-plan-review/ directory exists; no agent file updated to flag missing/vague criteria as REVISE.
   - .planning/templates/criteria-template.md: .planning/templates/ directory does not exist on disk; file absent.
   The only Plan 8a commit (ab292c6) modified criteria-loader.ts and the Plan 8a PLAN.md. No SUMMARY file exists for Plan 8a.
   Impact: the criteria mandate (D-17/D-18/D-19) is enforced in the harness loader and cited in PLAN files but is not propagated into the authoring toolchain that generates future PLAN files.

2. **nightwork-smoke-tester.md not deprecated** -- Per D-08 (Q4=C), the agent was to be REPLACED with its logic absorbed into harness Layer 1. VERIFICATION-PIPELINE.md line 235 states Agent file deprecated. The actual .claude/agents/nightwork-smoke-tester.md retains its original description unchanged with no deprecation notice, no redirect to Layer 1, and no frontmatter update.
   Impact: VERIFICATION-PIPELINE.md says deprecated; the agent file does not agree.

### WARNING

1. **Calibration log entry not filled** -- .planning/calibration-log.md has all numeric fields at 0 and body sections as (pending ship). Per D-13 the nightwork-custodian fills this at post-ship sweep. Risk: if ship proceeds without the custodian sweep, the calibration log provides no signal to the next-phase /np orchestrator, failing watchpoint 4 (useful lessons not noise).

2. **gsd-execute-phase workflow / /nx command update not confirmed** -- Plan 8b required execute-phase.md and /nx to be updated to wire the loop inside /gsd-execute-phase per D-05. File-level verification was not performed in this audit.

### NOTE

1. **AC-139 known-FAIL (WI-004 surface gap)** -- Intentional; documented in nwrp72 FIX 12 as pending Stage 1.5b prototype-gallery merge. Not a spec violation.

2. **Over-built files** -- src/lib/verification/_browser.ts (nwrp67 FIX 8 Playwright cookie attachment), src/lib/verification/orchestrator.test.md (bring-up scaffold), supabase/migrations/00093 (profile table corrective). None in PLAN files_modified. All motivated by bring-up problems; no security concerns.

3. **FIXTURE_ORG_UUID constant added** beyond spec (spec listed only FIXTURE_ORG_ID). Added per nwrp67 FIX 8 for RLS UUID vs slug disambiguation -- necessary for auth-strategy.ts:169 defense-in-depth assertion.

---

## Verdict

**NEEDS WORK**

Critical-finding count: **2 BLOCKING**

BLOCKING 1 -- Plan 8a four required deliverables (gsd-planner.md criteria mandate, nightwork-spec-checker.md D-19 update, nightwork-plan-review enforcement, .planning/templates/criteria-template.md) were never created on disk. The criteria mandate exists inside the harness loader and PLAN files but is not propagated to the authoring toolchain.

BLOCKING 2 -- nightwork-smoke-tester.md not marked deprecated despite VERIFICATION-PIPELINE.md and D-08 declaring it replaced by Layer 1.

All other phase scope is COVERED: verification module tree, 3 layers, CLI scripts, GH Action, 2 new agents, 2 migrations, canonical docs, middleware bypass, textarea fix -- all with strong evidence from 15+ live CI runs and the Plan 11 self-test PASS.
