---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: shipped
last_updated: "2026-05-11T16:26:00Z"
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 18
  completed_plans: 18
  percent: 100
---

# Nightwork — State

**Updated:** 2026-05-11 (stage-1.5c-verification-harness SHIPPED — merged to main at `128d92a`).

## Phase shipped: stage-1.5c-verification-harness

- **Branch:** `phase/1.5-c-verification-harness` (95 commits, 2026-05-06 → 2026-05-11)
- **Merge commit:** `128d92a` (no-ff) on main, 2026-05-11T16:25:58-04:00
- **Final harness baseline:** PASS=68 / FAIL=1 (documented WI-004 surface gap) / SKIP=1 (Wave 1.1 dep). Run #25682584177 on `e60a677`.
- **Final /nightwork-qa verdict:** WARNING (single carry-forward NODE_ENV vs VERCEL_ENV one-liner; not blocking).
- **Vision spend:** ~$0.573 / $5.00 ceiling (11.5% used).
- **What shipped:** 3-layer verification harness (Layer 1 mechanical/DOM, Layer 2 industry-standards, Layer 3 Claude vision) with runLoop state machine + 3-iteration bounded fix loop + CostCap singleton; GitHub Actions workflow + Vercel preview discovery + auth chain (deployment-protection bypass → Supabase session cookie → /design-system gate); criteria mandate (D-17/D-18/D-19) with planner-prompt + plan-review + spec-checker enforcement; calibration-log; canonical VERIFICATION-PIPELINE.md doc; nightwork-smoke-tester deprecated; new gsd-research-standards + gsd-fix-executor agents; harness fixture org (migrations 00092 + 00093).
- **GATE history:** GATE 1 (post-Wave-5 loop machinery review) → GATE 2 (post-Wave-7 doc phase complete) → GATE 3 (post-/nightwork-qa merge authorization).
- **Follow-ups queued:** NODE_ENV → VERCEL_ENV one-line fix in `src/middleware.ts:179`; PLAN-REVIEW-security.md stale-artifact cleanup; gsd-planner.md manual sync per criteria-template.md instructions.

## Recent work shipped (per git log + canonical plan)

- **2026-05-06: stage-1.5c-verification-harness Plan 6 (GitHub Actions workflow) shipped on `phase/1.5-c-verification-harness`.** 2 atomic task commits + 1 SUMMARY commit: verify-phase.yml workflow YAML (`4dfa994`); workflow README (`3feeb14`). First GH Action on main from this branch (`.github/workflows/` did not exist on main pre-merge). 14-step workflow with push + workflow_dispatch triggers, concurrency cancel-in-progress, Vercel REST API wait-for-Ready gate (live-tests Plan 5 vercel-discovery contract per watchpoint #3), defensive harness-output JSON parser (watchpoint #4), 5 GH secrets wired (the original 2 from plan template + 3 added per Rule 2 missing-critical: HARNESS_FIXTURE_PASSWORD + Supabase URL + anon key), exit-code 0/1/2/3/4 → success/failure/failure/error/error mapping (watchpoint #6), 7-day artifact retention with screenshots/ excluded per C2+D-30. SEC-HIGH-1 verified: 0 violations of `${{ github.* }}` / `${{ inputs.* }}` in shell `run:` bodies (watchpoint #1; precise Python parser tracking shell-block boundaries). Watchpoints #3, #7, #8 deferred to first push (workflow self-test). Halt-pending Jake review before Wave 4 (Plan 7 — new agents). 4 deviations auto-fixed (3 Rule 2 missing-critical + 1 Rule 1 bug fixing transcribed YAML fragment in plan template).
- **2026-05-05: stage-1.5c-verification-harness Plan 5 (orchestrator + Vercel discovery + criteria-loader + auth-strategy + report-writer + verify-phase.ts CLI) shipped on `phase/1.5-c-verification-harness`.** 3 atomic commits + 1 SUMMARY commit: vercel-discovery + criteria-loader + auth-strategy (`1cc868d`); orchestrator + report-writer (`547c00d`); verify-phase.ts + test fixture + README update (`789fe35`). Wave 2 single-plan dispatch complete; halt-pending Jake review before Wave 3 (Plan 6 GH Actions workflow). All 7 watchpoints (Jake nwrp51) addressed: REST API as PRIMARY discovery (Jake watchpoint #2), real Supabase signInWithPassword auth strategy with NO platform-admin path (watchpoint #3), 141 non-N/A criteria extracted from this phase's 12 PLANs (watchpoint #4), runHarness does NOT drive state machine (watchpoint #1+#5), all 3 active scope items closed (watchpoint #6), calibration-log custodian integration designed (watchpoint #7). HarnessReport.loop_state DELETED per ARCH-CRIT-1; FIXTURE_ORG_UUID added alongside slug (Option A). Iter-1 amendments verified: ARCH-CRIT-1/2/3, C1, C5, SEC-HIGH-2, WARNING-1, W1, D-30.
- **2026-05-06: stage-1.5c-verification-harness Plan 4 (Layer 3 vision) shipped on `phase/1.5-c-verification-harness`.** Wave 1 sequential complete (Plans 2/3/4 sequenced); halt-pending Jake review before Wave 2.
- **2026-05-06: stage-1.5c-verification-harness Plans 2 + 3 (Layer 1 static + Layer 2 standards framework) shipped.**
- **2026-05-06: stage-1.5c-verification-harness Plan 1 (foundation) shipped on `phase/1.5-c-verification-harness`.** 5 atomic commits: types/registry/idempotency/state-machine module (`9b73f57`); standards JSON schema + 5 domain dirs + reports tracked + .gitignore (`a5f213a`); criteria-loader.test.md scaffold (`ba304ec`); fixture-org migration 00092 + .down.sql (`3476854`); README (`ff7861e`). Halt-pending Jake review before Wave 1 dispatch (Plans 2/3/4 parallel). All iter-1 plan-review CRITICAL amendments addressed (ARCH-CRIT-1/2/3, C1, C4, D-30).
- **PR #31 (2026-04-29)**: Plan consolidation — `docs/nightwork-plan-canonical-v1.md` becomes the single source of truth.
- **PR #26 (~2026-04-28)**: Phase 3.4 proposals review form aligned with invoice patterns; print-view added; phase pre-merge cleanups.
- **Phase 3.4 polish** (in-flight before this session): invoice review structure mirrored to proposals.

## Branches

- `main` — clean, recently merged.
- `phase/1.5-c-verification-harness` — current; Wave 0 (Plan 1) shipped; halt-pending Jake review before Wave 1.
- `nightwork-build-system-setup` — predecessor; build-system files staged for review.

## Outstanding tech debt + known issues

Canonical §12 is authoritative. Selected highlights:

- **Embedding-on-create wiring gap** — cost intelligence pillar 2 requires this; named as a blocker.
- **Dashboard 503s on aggregations** — historical pain point; new architecture rules require index plans + caching plans on every aggregation.
- **Phase 3.4 dropdown optgroup labels** — relabel `[New]` / `[Legacy]` / `[Pending]` to PM-facing terms (per memory `project_phase3_4_polish_dropdown_labels`).
- **PR #26 follow-up** — extracted_data cache + UI alignment to invoice review (per memory `project_phase3_4_pr26_merge_blockers`).

### Deferred from QA baseline 2026-04-29

These were knowingly deferred from `.planning/qa-runs/2026-04-29-1012-qa-report.md` to keep the build-system phase scoped. Address in a dedicated security-hardening pass before launch.

- **MEDIUM — `vercel.json` X-Frame-Options should be `DENY`** (currently `SAMEORIGIN`). Largely redundant once CSP `frame-ancestors 'none'` is enforced (now in place), but tighten anyway for legacy-browser coverage.
- **MEDIUM — Permissions-Policy is incomplete.** Add `payment=(), usb=(), fullscreen=(self), clipboard-read=()` alongside the existing camera/mic/geolocation locks. `payment=()` is the relevant Stripe-adjacent surface.
- **MEDIUM — No Cross-Origin-Opener-Policy.** Add `Cross-Origin-Opener-Policy: same-origin-allow-popups` (Stripe-redirect compatible). Track COEP `require-corp` as a separate roadmap item — every third-party resource must set CORP headers, so it requires a coordinated rollout.
- **CSP follow-up — migrate from `'unsafe-inline'` to nonces.** The current CSP allows `'unsafe-inline'` in `script-src` and `style-src` because Next.js 14 injects inline scripts (hydration) and inline styles without nonces by default. Next.js docs describe a middleware-based nonce flow; adopt it before launch so the CSP becomes meaningfully strict. (HIGH-finding H1 was resolved by adding the CSP itself; tightening it is the follow-up.)

### Env vars requiring real values before flow activation

- **`STRIPE_WEBHOOK_SECRET`** — currently `whsec_placeholder` in both Production and Preview. Requires the real value from the Stripe Dashboard webhook endpoint before any payment flow is exercised. Wave 1 (subscription / billing activation) blocks on this.
- **`RESEND_API_KEY`** — currently `re_placeholder`. Requires real Resend account + verified sending domain before any transactional email is sent (notifications, draw approvals, etc.). Wave 1 (notifications activation) blocks on this.
- **`STRIPE_PRICE_STARTER` / `_PROFESSIONAL` / `_ENTERPRISE`** — empty in `.env.local`, not pushed to Vercel. Populate after Stripe products exist; then `vercel env add` for both envs.

## Test fixtures

Drummond is the canonical reference job. Real-data fixtures live at `__tests__/fixtures/classifier/.local/` (gitignored). Synthetic fixtures (R.21) are used everywhere else.

## Pre-launch state

Ross Built is Tenant 1, pre-launch — test data only. No migration risk during foundation work. Other tenants will land on production data once the foundation hardens.

## Relevant memory entries

- `feedback_subagent_additions.md` — flag subagent additions at kickoff.
- `feedback_qa_report_path.md` — write QA reports to `./qa-reports/` (project) not the harness sandbox.
- `project_phase3_4_pm_role_gate.md` — `org_cost_codes` writes are owner/admin only.
- `feedback_force_push_rule.md` — `--force-with-lease` OK on solo feature branches post-rebase; never on main/shared; never plain `--force`.
- `project_phase3_4_polish_dropdown_labels.md` — dropdown relabel before PR ready-for-review.
- `project_phase3_4_pr26_merge_blockers.md` — fresh-session sequence + open questions.
