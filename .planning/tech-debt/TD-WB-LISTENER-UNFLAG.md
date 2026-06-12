# TD-WB-LISTENER-UNFLAG — W.1 listener production unflag

**Origin:** F1-Wave-B Plan B-1b (nwrp153 Q5 amendment + nwrp152 dispatch)
**Captured:** 2026-05-15
**Scheduled:** Slice-2 follow-up after observation window
**Status (2026-06-12): CLOSED** — the unflag is DONE: listener re-enabled in Production per nwrp283 interaction-bug phase close (deploy dpl_7HDBz3NoeCSbfV6x3FmJfskbxndk; L2 post-flip verification incl. automated authed production cell HEALTHY). Rollback contract + revisit trigger live in TD-WB-LISTENER-PHASE1-INTERACTION + the canonical doc.

**Prior status (2026-05-28):** `ROLLED-BACK-INVESTIGATING` per the Reverse-rollback section of this doc. The W.1 listener was unflagged on Production via commit `aa3a5a4` 2026-05-26; an interaction with Phase 1 source (internal-launch-hide, shipped 2026-05-27) caused a silent client-side auth deadlock on the post-Phase-1 + listener-on combination (deploy `cl0ds1ths`). Mitigation deployed 2026-05-28 — `NEXT_PUBLIC_AUTH_STATE_LISTENER` env-var removed from Production. Preview retains the flag for future bisect comparison. **This TD is subsumed by `TD-WB-LISTENER-PHASE1-INTERACTION.md`** for the mechanism investigation (D2 bisect + D3 bundle diff + D4 real fix). See `.planning/lessons.md` 2026-05-28 entry + `.planning/qa-runs/2026-05-27-1536-internal-launch-hide-qa-report.md` Post-ship addendum (2026-05-28) for the full debug narrative.

## What ships in B-1b

- `src/hooks/use-current-role.ts` — second `useEffect` block
  subscribing to `supabase.auth.onAuthStateChange`. Listener fires on
  `SIGNED_OUT` / `TOKEN_REFRESHED` / `USER_UPDATED` / `SIGNED_IN`
  events and re-fetches role from `org_members` for the new/refreshed
  session.
- Subscription is gated behind
  `process.env.NEXT_PUBLIC_AUTH_STATE_LISTENER === "true"`. With the
  env var unset (default), the effect returns early BEFORE creating the
  subscription. Production blast radius on slice ship = zero.
- `.env.local.example` documents the env var (commented out).

## What does NOT ship in B-1b

- The actual env-var add in Vercel **Production** + **Preview**
  environments. With `NEXT_PUBLIC_AUTH_STATE_LISTENER` unset on
  Vercel, the listener is dormant in production and previews exactly
  as it is locally.

## Unflag path (Slice-2 follow-up)

1. **Confirm Slice-2 is open for execute.** This TD is a Slice-2 work
   item, not a same-slice follow-up. Don't unflag before the Slice-2
   `/np` or equivalent kick-off.

2. **Add the env var to Vercel:**
   - Via dashboard: Project Settings → Environment Variables → Add
     `NEXT_PUBLIC_AUTH_STATE_LISTENER` with value `true`, scope to
     **Production** + **Preview** environments (omit Development —
     local dev uses `.env.local`).
   - Or via CLI: `vercel env add NEXT_PUBLIC_AUTH_STATE_LISTENER`
     (interactive prompt for environment selection).

3. **Trigger a redeploy** so the new env var is inlined into the
   client bundle. Either a fresh `vercel --prod` or a push to a
   tracking branch that re-deploys.

4. **Verify** on the preview URL:
   - Open DevTools → Application → Cookies; confirm a logged-in
     session exists.
   - Open DevTools → Sources; verify the
     `onAuthStateChange` subscription is created (set a breakpoint
     inside the listener; trigger a sign-out from another tab; confirm
     the breakpoint hits).
   - Smoke harness baseline maintained (≤2 TD-WE-03 failures; no nav-
     bar or invoice-detail consumer regression).

5. **Update this TD entry's status to RESOLVED.**

## Observation criteria

Per Q5 nwrp153, default observation window is **1–2 weeks** post-slice
ship before unflagging. Criteria to satisfy before unflag:

- Smoke harness baseline maintained throughout the observation window
  (11/13 PASS matching TD-WE-03 set).
- Zero Sentry incidents involving `auth/onAuthStateChange` or
  `useCurrentRole` since slice ship.
- Zero nav-bar / invoice-detail role-cache regressions surfaced via
  Jake's daily local use OR via QA review.

## Risk profile

**Blast radius if listener has a latent bug at unflag time:**
- Nav-bar (`src/components/nav-bar.tsx:155`) reads `useCurrentRole()`
  for 8-section role-aware rendering. A bug that incorrectly fires
  `setRole(null)` on a benign auth event would degrade the nav to
  null-role posture (fewer sections rendered) — visible degradation,
  not a silent break.
- Invoice review (`src/app/invoices/[id]/page.tsx:123`) reads
  `useCurrentRole()` for role-gated invoice actions. Same
  visibility — a degradation to null-role hides the action buttons
  instead of leaking access.

Both consumer surfaces fail-CLOSED on `null` (per CLAUDE.md "treat
null as non-privileged by default"), so the worst-case bug is
**reduced functionality**, not **elevated access**. This is the
designed safety posture; the env-flag gate is defense-in-depth on
top of that, not the only safety net.

## Reverse rollback

If the unflag exposes a regression in production:
1. Remove the env var from Vercel (Settings → Environment Variables
   → delete `NEXT_PUBLIC_AUTH_STATE_LISTENER`).
2. Redeploy. The early-return resumes; listener is dormant again.
3. Re-flag this TD entry as `ROLLED-BACK-INVESTIGATING` and triage
   the regression before re-attempting unflag.

No code change needed for rollback — env-var flip + redeploy.

## Cross-references

- `src/hooks/use-current-role.ts` — the gated subscription
- `.env.local.example` — env var documentation
- `.planning/expansions/stage-f1-knowledge-graph-auth-wave-b-EXPANDED-SCOPE.md` — Q5 amendment context
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-b/B-1b-kg-scaffold-types-pipeline-PLAN.md` §6 + §11 — Task 6 implementation + smoke verification approach
