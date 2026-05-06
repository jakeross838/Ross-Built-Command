# Manual setup checklist — stage-1.5c-verification-harness

**Status:** PENDING JAKE — 3 items
**Generated:** 2026-05-06
**Branch:** phase/1.5-c-verification-harness

After completing each item, re-run `/nightwork-auto-setup stage-1.5c-verification-harness` to validate.

---

## Item 1: Add `ANTHROPIC_API_KEY` to GitHub Actions secrets

**Why:** Layer 3 (Claude vision against PLAN-file criteria) calls the Anthropic API from inside the GitHub Action runner. Vercel env-var availability is NOT the same as GH Actions secret availability — they're separate stores. The CI runner must have its own copy. (Jake nwrp48 explicitly called this out.)

**Time estimate:** 3 minutes (assumes you have an existing key already; new-key generation adds ~2 min)

**Steps:**
1. Open https://github.com/jakeross838/nightwork-platform/settings/secrets/actions in your browser (you may need to log in)
2. Click **New repository secret** (green button, top-right)
3. **Name:** exactly `ANTHROPIC_API_KEY` (case-sensitive; the harness's `.github/workflows/verify-phase.yml` will reference `${{ secrets.ANTHROPIC_API_KEY }}`)
4. **Value:** paste your Anthropic API key. If you don't have one or want a CI-scoped key:
   - Open https://console.anthropic.com/settings/keys
   - Click **Create Key**
   - Name it "Nightwork CI — verify-phase harness" so it's distinguishable from the local-dev key
   - Copy the key value
5. Click **Add secret**

**Validation (auto-runs on next `/nightwork-auto-setup` invocation):**
- The validator will attempt `gh secret list --repo jakeross838/nightwork-platform | grep ANTHROPIC_API_KEY` and require it to return a hit. NOTE: this check requires elevated `gh` token scope (`actions:read` or `admin:repo_hook`). If the validator can't access the secrets list, it will surface a fallback validation: trigger a workflow_dispatch on a test workflow that prints whether the secret resolves, and confirm via the run logs.
- Estimated cost of an idle CI key: $0 (Anthropic keys are pay-per-call; idle = $0).

---

## Item 2: Add `VERCEL_TOKEN` to GitHub Actions secrets

**Why:** Vercel preview URL discovery primary path is the Vercel REST API (per EXPANDED-SCOPE Q3 prerequisite #3 option (a)). The deterministic URL pattern (`nightwork-platform-git-{branch-slug}-jakeross838s-projects.vercel.app`) WORKS for short branch names but FAILS for `phase/1.5-c-information-architecture` and `phase/1.5-c-verification-harness` because the slugged hostname exceeds the DNS label length limit (63 chars) and Vercel truncates with a hash suffix. Auto-setup verified this empirically: `nightwork-platform-git-main-...` returns 401 (URL exists ✓); the longer-branch URL returns connection failure (URL truncated/non-existent).

**Time estimate:** 4 minutes

**Steps:**
1. Open https://vercel.com/account/tokens in your browser (you must be logged in as the team owner — `jakeross838s-projects`)
2. Click **Create Token**
3. **Name:** "Nightwork CI — verify-phase harness"
4. **Scope:** select `jakeross838s-projects` (or `Full Access` — token-scoped tokens require team-level `Full Account` for cross-team operations; team-scoped is sufficient for this repo)
5. **Expiration:** No Expiration (or set to 1 year if you prefer rotation; CI keys are typically long-lived)
6. Click **Create**
7. Copy the token value (you'll see it once)
8. Open https://github.com/jakeross838/nightwork-platform/settings/secrets/actions in your browser
9. Click **New repository secret**
10. **Name:** exactly `VERCEL_TOKEN`
11. **Value:** paste the Vercel token from step 7
12. Click **Add secret**

**Validation (auto-runs on next `/nightwork-auto-setup` invocation):**
- The validator will attempt `gh secret list | grep VERCEL_TOKEN`. If the validator's `gh` token scope can't list secrets, it will use the same workflow_dispatch fallback as Item 1.
- Per-call cost: Vercel API is free for project-scoped read operations.

---

## Item 3: Confirm Vercel preview deploys are auto-configured for phase/* branches

**Why:** The harness's GitHub Action triggers on push to `phase/*` branches and waits for the Vercel preview to be Ready before running. If Vercel preview deploys aren't auto-firing on `phase/*` push, the Action will hang indefinitely. Per D-013 + the Nightwork deployment runbook, auto-deploy is on by default — but this is the one config that, if wrong, blocks the entire pipeline. Confirm.

**Time estimate:** 2 minutes (mostly browser navigation)

**Steps:**
1. Open https://vercel.com/jakeross838s-projects/nightwork-platform/settings/git in your browser
2. Find the **Production Branch** setting — confirm it's set to `main`
3. Scroll to **Ignored Build Step** — confirm it's empty (or, if non-empty, doesn't exclude `phase/*` branches)
4. Scroll to **Preview Deployments** section — confirm preview is enabled for "All branches except production"
5. Take a screenshot of the Git settings page and save anywhere (no need to attach; just keep for reference if validation fails)

**Validation (auto-runs on next `/nightwork-auto-setup` invocation):**
- The validator will check `vercel ls --scope=jakeross838s-projects` and require the most recent deployment under `Environment: Preview` to be < 24 hours old. Initial validation already passes per AUTO-LOG.md (latest preview was 59 minutes ago when this checklist was generated). After Jake re-pushes the verification-harness branch (which happens implicitly during `/nx execute`), a NEW preview deploy will fire and the validator can confirm phase/* push triggers preview correctly.

---

## After all 3 items complete

Run: `/nightwork-auto-setup stage-1.5c-verification-harness`

The command re-validates every item. On 100% pass, it writes `stage-1.5c-verification-harness-SETUP-COMPLETE.md` and you're cleared to run `/np stage-1.5c-verification-harness`.

If any validation fails, this checklist gets updated in-place with the specific failure message and you re-do the failed item.

---

## Notes

- **No npm installs** — Playwright + Anthropic SDK + tsx all already present in `package.json`. No `npm install` step needed.
- **No `.env.local` changes** — local dev mode of harness reuses the existing local `ANTHROPIC_API_KEY` if Jake runs `npx tsx scripts/verify-phase.ts --preview-url URL` directly. CI runner uses `secrets.ANTHROPIC_API_KEY`.
- **No database changes** — pure infra phase; no migrations, tables, RLS policies, indexes.
- **No third-party signups beyond Anthropic** (already configured for invoice extraction).
- **Drummond fixtures untouched** (explicitly forbidden per Part 8 constraints).
