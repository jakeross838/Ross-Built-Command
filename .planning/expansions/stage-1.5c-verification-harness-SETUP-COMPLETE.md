# Setup complete — stage-1.5c-verification-harness

**Status:** READY FOR PLAN
**Completed:** 2026-05-06
**Branch:** phase/1.5-c-verification-harness (HEAD `0164110`)

## VALIDATE items (9 PASS — existing infrastructure verified)

- [x] **Phase branch cut from main** — `git branch --show-current` → `phase/1.5-c-verification-harness`; cut from main HEAD `7607bbf` per Jake nwrp47 Part 7
- [x] **EXPANDED-SCOPE.md APPROVED** — Status line `**Status:** APPROVED 2026-05-06 by Jake (nwrp48)`
- [x] **Playwright npm package** — `package.json devDependencies.playwright = ^1.59.1`
- [x] **Anthropic SDK npm package** — `package.json dependencies.@anthropic-ai/sdk = ^0.88.0`
- [x] **tsx for running TS scripts** — `package.json devDependencies.tsx = ^4.21.0`
- [x] **`gh` CLI installed + authed** — `gh --version` → 2.90.0; `gh auth status` → logged in as `jakeross838`
- [x] **`vercel` CLI installed + authed** — `vercel --version` → 52.0.0; `vercel whoami` → `jakeross838`
- [x] **Vercel preview deploys live** — latest preview 59m old (Ready) per `vercel ls` at setup time; further confirmed by Jake's fresh push of `phase/1.5-c-information-architecture` producing `https://nightwork-platform-nh33id6ck-jakeross838s-projects.vercel.app`
- [x] **scripts/ directory with Playwright patterns** — 17+ existing `.mjs` scripts using chromium + screenshots (e2e-*, smoke-test*, brand-*) provide reuse vocabulary for `scripts/verify-phase.ts`

## AUTO items (4 executed, all documented)

- [x] **Vercel deterministic preview URL pattern** — `git-main` URL returns 401 (URL exists ✓). Long branch names exceed 63-char DNS label limit and Vercel truncates with hash suffix → deterministic pattern unreliable for `phase/1.5-c-*`. Documented as PARTIAL in AUTO-LOG; Vercel REST API + `VERCEL_TOKEN` is now the primary discovery path.
- [x] **`.github/workflows/` directory state** — Does NOT exist on this branch (cut from main predates IA-branch's `drummond-grep-check.yml`). Verification-harness phase will CREATE `.github/workflows/` from scratch as the first GH Action on main.
- [x] **GitHub Actions secrets enumeration via `gh` CLI** — Initial validation reported INSUFFICIENT-SCOPE; re-validation succeeded. Token scope `repo` IS sufficient for `gh secret list` on repos the user owns. Updated for next phase's auto-setup notes.
- [x] **Vercel preview deploys configured for phase/\* branches** — PASS. Latest preview deploys (59m, 20h, 21h ago at setup time) all in `Environment: Preview`. Auto-deploy on push active per D-013.

## MANUAL items (3 validated)

- [x] **Item 1: `ANTHROPIC_API_KEY` in GitHub Actions secrets** — VALIDATED via `gh api repos/jakeross838/nightwork-platform/actions/secrets`. Secret name present, `created_at: 2026-05-06T16:21:14Z`. Layer 3 (Claude vision) can call Anthropic API from inside GH Action runner.
- [x] **Item 2: `VERCEL_TOKEN` in GitHub Actions secrets** — VALIDATED via same API. Secret name present, `created_at: 2026-05-06T16:29:59Z`. Vercel REST API primary path for preview URL discovery is enabled.
- [x] **Item 3: Vercel preview auto-deploy for phase/\* branches** — VALIDATED via Jake's note + AUTO-4 evidence + fresh push of `phase/1.5-c-information-architecture` producing a Ready preview URL during setup window. Vercel UI redesign moved the relevant settings; visual confirmation skipped per Jake judgment, but empirical evidence (4 recent preview deploys + 1 just-validated push) is sufficient.

## What's NOT being set up (out of scope, intentional)

- **No new database tables, migrations, RLS policies, indexes** — pure infra phase.
- **No new env vars in `.env.local`** — Anthropic key for Layer 3 lives in GH Actions secrets only (CI runner needs its own copy per Jake nwrp48). Local dev mode of harness can reuse the existing local `ANTHROPIC_API_KEY` if Jake runs `npx tsx scripts/verify-phase.ts --preview-url URL` directly.
- **No third-party signups beyond Anthropic** (already configured for invoice extraction).
- **No Drummond fixture changes** (explicitly forbidden per Part 8 constraints).
- **No npm installs** — Playwright + Anthropic SDK + tsx all already present.
- **No 1.5c IA retrofit work** — Q6=B; that's a separate ~1-hour follow-up after harness merges to main.

## Branch posture confirmation

This phase runs on `phase/1.5-c-verification-harness` (cut from main HEAD `7607bbf`). It is **separate** from the in-flight `phase/1.5-c-information-architecture` branch which carries Plans 1/2/2-amend/3 commits not yet on main.

**Sequence per Jake nwrp47 Part 7:**
1. ✓ EXPANDED-SCOPE.md APPROVED
2. ✓ Auto-setup complete (this file)
3. → `/np stage-1.5c-verification-harness` (next step — discuss + plan + plan-review iter-1)
4. → Halt at iter-1 plan-review for Jake review (per nwrp48)
5. → `/nx stage-1.5c-verification-harness` (execute on this branch)
6. → Push to remote, Vercel deploys, harness self-tests against itself
7. → Merge to main when stable
8. → 1.5c IA branch rebases/merges main and resumes through harness (Q6=B retrofit ~1 hour, then Plan 3a-now, then Wave 3, then 1.5c ship)

## Iter-1 plan-review watchpoints (carry forward to /np dispatch)

Per Jake nwrp48, plan-review will explicitly verify:

1. Standards library schema designed for forward extensibility
2. Loop-with-executor state machine cleanly bounded (max 3 iter, halt-for-Jake on confidence < 0.7 vision results)
3. gsd-research-standards agent reusable across phases (caching, TTL, search authority hierarchy)
4. Calibration-log integration with custodian produces useful lessons not noise
5. gsd-planner mandate update enforces criteria sections without becoming a friction tax
6. Vercel preview URL discovery robust (REST API or CLI primary, deterministic pattern fallback)
7. Idempotency contract precise (commit SHA + criterion hash key tested, rerun-on-same-commit really is no-op)

These become explicit plan-review checks; nightwork-plan-review reviewers cite by number when surfacing concerns.

## Next

Run `/np stage-1.5c-verification-harness` to begin planning.

If during planning you discover EXPANDED-SCOPE.md needs revision (a prerequisite was missed), update EXPANDED-SCOPE.md and re-run `/nightwork-auto-setup stage-1.5c-verification-harness` to refresh setup.
