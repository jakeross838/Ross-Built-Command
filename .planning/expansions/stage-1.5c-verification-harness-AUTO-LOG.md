# Auto-setup log — stage-1.5c-verification-harness

**Generated:** 2026-05-06
**Branch:** phase/1.5-c-verification-harness (cut from main HEAD `7607bbf`)
**EXPANDED-SCOPE:** APPROVED 2026-05-06 by Jake (nwrp48)

## VALIDATE items (existing infrastructure verified)

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Phase branch cut from main | PASS | `git branch --show-current` → `phase/1.5-c-verification-harness` |
| 2 | EXPANDED-SCOPE.md APPROVED | PASS | Status line in EXPANDED-SCOPE.md: `**Status:** APPROVED 2026-05-06` |
| 3 | Playwright npm package | PASS (already installed) | `package.json devDependencies.playwright = ^1.59.1` |
| 4 | Anthropic SDK npm package | PASS (already installed) | `package.json dependencies.@anthropic-ai/sdk = ^0.88.0` |
| 5 | tsx for running TS scripts | PASS (already installed) | `package.json devDependencies.tsx = ^4.21.0` |
| 6 | `gh` CLI installed + authed | PASS | `gh --version` → 2.90.0; `gh auth status` → logged in as `jakeross838` |
| 7 | `vercel` CLI installed + authed | PASS | `vercel --version` → 52.0.0; `vercel whoami` → `jakeross838` |
| 8 | Vercel preview deploys live | PASS | Latest preview 59m ago (Ready) per `vercel ls` |
| 9 | scripts/ directory with Playwright patterns | PASS | 17+ existing `.mjs` scripts using chromium + screenshots (e2e-*, smoke-test*, brand-*) — strong reuse vocabulary for `scripts/verify-phase.ts` |

## AUTO items (executed)

| # | Item | Status | Result |
|---|---|---|---|
| 1 | Verify Vercel deterministic preview URL pattern resolves | PARTIAL | `https://nightwork-platform-git-main-jakeross838s-projects.vercel.app` returns **401** (Vercel-protected; URL exists ✓). Deterministic pattern works for short branch names. **CAVEAT:** longer branch names (phase/1.5-c-information-architecture, phase/1.5-c-verification-harness) exceed DNS label limit (63 chars) and Vercel truncates with hash suffix → deterministic pattern unreliable for THIS branch. Recommendation: use Vercel REST API + VERCEL_TOKEN as primary discovery; deterministic pattern as fallback only for short branches. |
| 2 | Check current `.github/workflows/` directory state | PASS (informational) | Directory does NOT exist on this branch (cut from main HEAD `7607bbf` which precedes the IA-branch's `drummond-grep-check.yml`). The verification harness phase will CREATE `.github/workflows/` from scratch as the first GH Action on main. |
| 3 | Check GitHub Actions secrets via `gh` CLI | INSUFFICIENT-SCOPE | `gh secret list` returned empty. Token scopes: `gist`, `read:org`, `repo`. Listing secrets requires `admin:repo_hook` or `actions:read` scope. Cannot verify Anthropic key presence in GH Actions secrets via CLI — Jake must verify manually via dashboard. |
| 4 | Spot-check Vercel preview deploys configured for phase/* branches | PASS | Latest preview deploys (59m, 20h, 21h, 21h ago) all show `Environment: Preview` — auto-deploy on push is active per D-013. |

## MANUAL items pending Jake

See `.planning/expansions/stage-1.5c-verification-harness-MANUAL-CHECKLIST.md` for the 3 items.

## Notes

- **No Database changes** — this is a pure infra phase; no new migrations, tables, RLS policies, or indexes.
- **No new env vars in `.env.local`** — Anthropic key for Layer 3 vision lives in GH Actions secrets only (CI runner needs its own copy per Jake nwrp48). Local dev mode of harness can reuse the existing local `ANTHROPIC_API_KEY` from `.env.local` if Jake runs `npx tsx scripts/verify-phase.ts --preview-url URL` directly.
- **No third-party signups** beyond Anthropic (already configured for invoice extraction).
- **No Drummond fixture changes** (explicitly forbidden per Part 8 constraints).
- **No npm installs needed** — Playwright + Anthropic SDK + tsx all already present.

## Verdict

**PENDING JAKE** — 3 MANUAL items.

Once Jake completes the MANUAL items, re-run `/nightwork-auto-setup stage-1.5c-verification-harness` to validate + write SETUP-COMPLETE.md.
