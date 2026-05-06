---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: halt-pending
last_updated: "2026-05-06T18:57:07Z"
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 6
  completed_plans: 0
  percent: 0
active_phase: stage-1.5c-verification-harness
active_wave: 0
last_completed_plan: 01.5-c-verification-harness-1-foundation
halt_pending: true
halt_reason: "Wave 0 complete — Plan 1 (foundation) shipped per halt_after:true. Awaiting Jake review before dispatching Wave 1 (Plans 2/3/4 in parallel)."
---

# Nightwork — State

**Updated:** 2026-05-06 (Plan 1 of stage-1.5c-verification-harness shipped).

## Active phase

- Branch: `phase/1.5-c-verification-harness`
- Phase: stage-1.5c-verification-harness — 3-layer verification pipeline runnable on `phase/*` branches via Vercel preview URL + GitHub Actions.
- Wave: 0 — foundation contracts (Plan 1) shipped, `halt_after: true`. Awaiting Jake review before Wave 1 dispatch.
- Status: Plan 1 SUMMARY at `.planning/phases/stage-1.5c-verification-harness/01.5-c-verification-harness-1-foundation-SUMMARY.md`. Wave 1 will dispatch Plans 2/3/4 (Layers 1/2/3) in parallel after halt review.

## Recent work shipped (per git log + canonical plan)

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
