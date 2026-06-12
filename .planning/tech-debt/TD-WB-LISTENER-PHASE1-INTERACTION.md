# RESOLVED 2026-06-12 (nwrp283 interaction-bug phase) — deadlock ABSENT at HEAD; listener RE-ENABLED in Production

**Outcome:** D2/D3 cells found the deadlock unreproducible at current HEAD in BOTH build flavors (Preview deploy + true production bundle via local NEXT_PUBLIC_VERCEL_ENV=production build), each with FRESH sign-ins. The prime mechanism suspect (supabase-js await-inside-onAuthStateChange lock deadlock) was REFUTED in two cells (bare Node + raw-client Chromium, v2.103). The May-28 truth table carried an uncontrolled variable: session freshness (SIGNED_IN-event paths only run on fresh sign-ins). Line-level mechanism never named; nothing left at HEAD to fix (nwrp283 condition 3 honored — no fix compressed to fit).

**Config decision landed:** NEXT_PUBLIC_AUTH_STATE_LISTENER=true restored to Production; deploy dpl_7HDBz3NoeCSbfV6x3FmJfskbxndk; anon-curl + automated authed production cell HEALTHY; Jake 2-min incognito spot-check surfaced as the human confirmation.

**REVISIT TRIGGER (the live contract):** signature = post-login shell stuck Loading + zero completing supabase requests. Mitigation: vercel env rm NEXT_PUBLIC_AUTH_STATE_LISTENER production + force redeploy (proven, ~2 min). Then bisect acbfa06..HEAD with tmp/zz-listener-app-cell.mjs against LOCAL production bundles (per-commit cells without deploys).

---

# TD-WB-LISTENER-PHASE1-INTERACTION — W.1 listener × Phase 1 source production deadlock

**Origin:** Post-Phase-1 ship debug (nwrp247-254, 2026-05-28). Successor to TD-WB-LISTENER-UNFLAG.
**Captured:** 2026-05-28
**Severity:** HIGH-ish — auth path + unknown deadlock mechanism + only currently-known mitigation is "feature off."
**Scheduled:** Follow-up phase, runs under tiered pipeline once `tiering-implementation` ships. Good real test case for HIGH-tier.
**Blocks:** any future attempt to re-enable `NEXT_PUBLIC_AUTH_STATE_LISTENER` on Production.

## What broke

Authed walks on `https://nightwork-platform.vercel.app` were broken between cl0ds1ths deploy (May 27 17:54) and the mitigation deploy (May 28 ~08:41). Symptom: no top nav, no role badge, no PLATFORM badge, "ALL 0 JOBS" sidebar, page stuck "Loading...", ZERO Supabase requests fired from the browser. Same auth session, same authed cookie present.

Required BOTH halves to reproduce:

| Source | `NEXT_PUBLIC_AUTH_STATE_LISTENER` | Deploy | Outcome |
|---|---|---|---|
| pre-Phase-1 (`9b041b9`) | `true` | `isuinxe7t` (May 26 16:14) | works |
| pre-Phase-1 (`9b041b9`) | undefined | `r02hbraom` (May 28 09:04 — D1) | works |
| post-Phase-1 (`acbfa06`) | `true` | `cl0ds1ths` (May 27 17:54) | **broken** |
| post-Phase-1 (`acbfa06`) | undefined | `ljdtfrt5b` (May 28 08:41), `x14j6jhg5` (09:10) | works |

Listener alone (isuinxe7t) works. Phase 1 alone (ljdtfrt5b / x14j6jhg5) works. Both together (cl0ds1ths) deadlocks.

## Mitigation in place

- `vercel env rm NEXT_PUBLIC_AUTH_STATE_LISTENER production` — env var removed from Production only. Preview retains `true` (left intact for future bisect comparison per Jake nwrp251).
- `vercel --prod --force` redeployed current HEAD `acbfa06`. Production canonical alias resolves to `x14j6jhg5` (post-Phase-1 + listener-off).
- Per TD-WB-LISTENER-UNFLAG.md "Risk profile" section validated 2026-05-15: both `useCurrentRole()` consumer surfaces (nav-bar + invoice-detail) fail-CLOSED on `null`. Worst case from listener-off = stale cross-tab role UI; RLS still gates data server-side. Safe to sit in this state indefinitely.
- TD-WB-LISTENER-UNFLAG.md status flipped to `ROLLED-BACK-INVESTIGATING` per its own Reverse-rollback section.

## What's NOT known

- **The precise mechanism.** The W.1 listener subscribes to `supabase.auth.onAuthStateChange` in `src/hooks/use-current-role.ts:67-102`. With listener-on, four+ concurrent `supabase.auth.*` callers exist on the `/jobs` page mount path (use-current-role × 2 effects, platform-admin-badge, job-sidebar, jobs-page). `@supabase/ssr ^0.10.2` + `@supabase/supabase-js ^2.103.0` use `navigator.locks` to serialize auth operations — a deadlock would explain "zero supabase requests + everything hangs." But pre-Phase-1 + listener-on does NOT deadlock (proven by isuinxe7t works), so the lock pattern alone is insufficient. Phase 1 must change something — bundle chunking? component mount order? middleware response cookie handling? — that combined with the listener tips the deadlock condition.
- **Which Phase 1 commit triggers it.** Five commits in Phase 1 (`265a752..0cff0a0`):
  - T1 (`265a752`) feature-flags.ts NEW module
  - T2 (`36a0fb1`) nav-bar.tsx PRIMARY_NAV filter
  - T3 (`e0cbfa8`) middleware.ts 7 gate blocks + `respond404` helper
  - T4 (`8c305de`) per-job-tabs.tsx array reductions
  - T5 (`275a918`) 6 section-overview pages array filters
  - T6 (`0cff0a0`) Playwright smoke runner
- **Why Phase 1's pre-ship verification didn't catch it.** Phase 1 walked Vercel Preview deploys. Preview's `src/lib/verification/_browser.ts` `setSession()` bridge bypasses the normal cookie-load path. The bug only manifests on Production's real-user code path. See `.planning/lessons.md` 2026-05-28 entry Lessons 1 + 2.

## Investigation plan

Scoped as a single follow-up phase. Three deliverables, all read-only / experimental until D3 lands on a real fix:

### D2 — Bisect Phase 1 commits with listener ON

- Re-enable `NEXT_PUBLIC_AUTH_STATE_LISTENER=true` on Production temporarily for the duration of the bisect window. Communicate downtime risk to Jake.
- Binary chop the 5 source commits (T1 → T5; T6 is just a smoke script). ~3 deploys minimum:
  1. Deploy T3 (middleware) on its own → if works, bug is in T2/T4/T5; if broken, bug is in T1/T2/T3.
  2. Narrow to single commit.
- Each deploy: `vercel --prod --force` (cache-bust mandatory per Rule 10), authed walk via Incognito + fresh sign-in. Symptom either reproduces or doesn't.
- Output: specific commit + line-range that interacts with the listener.
- Cost: ~3 Production deploys, ~20-30 min hands-on with Jake.
- Risk: Production briefly hosts each bisect deploy (~3 minutes per build + walk). Worst case: same `cl0ds1ths`-equivalent broken state for the duration. Mitigation: keep `vercel --prod` revert command ready (deploy current `acbfa06` + listener-off).

### D3 — Bundle diff between working and broken deploys

- Read-only. No deploys.
- Fetch the JS chunks from `isuinxe7t` (works, listener-on, pre-Phase-1) and `cl0ds1ths` (broken, listener-on, post-Phase-1). Diff the chunks that contain `use-current-role` / `nav-bar` / `feature-flags` / `client.ts`.
- Identify what specifically changed in webpack chunk content: which modules co-located, which got split, which import order changed, whether the persistent build cache caused different code-generation paths even where source is identical.
- Cross-check against D2's identified commit: does the bundle delta match the source delta?
- Output: bundle-level mechanism characterization (chunking change vs initialization order vs cache pollution vs other).
- Cost: ~30-60 min, no production impact.

### D4 — Real fix selection + implementation

Candidate options (decision pending D2+D3 mechanism findings):

1. **Per-page listener gating.** Only subscribe to `onAuthStateChange` on pages that benefit from reactive role refresh (e.g., long-running surfaces with cross-tab login concerns). Doesn't help if D2/D3 identifies a problem on a page that legitimately needs the listener.
2. **Debounce / queue the subscription.** Wait for the first `getUser()` to resolve before subscribing. Removes the concurrency between listener subscribe and initial getUser. Cheap fix if mechanism is concurrency-related.
3. **Upgrade `@supabase/ssr` + `@supabase/supabase-js`.** Check if known issues with `navigator.locks` deadlock patterns have been fixed in newer versions. Run upgrade through phase-level testing.
4. **Consolidate all `supabase.auth.*` calls into one context provider.** Hoist the user/role/membership state into one shared React Context that owns the single subscription and single `getUser()` call. Every consumer (`useCurrentRole`, JobSidebar, PlatformAdminBadge, JobsPage) reads from context. Removes the 4+ concurrent auth.* call pattern entirely.

Recommended for first pass: probably option 4 (consolidate context) — it's the most architecturally durable and removes the whole class of race conditions, not just this specific one. Confirm against D2/D3 mechanism before committing.

## Why this matters beyond Phase 1

The W.1 listener is the only piece of infrastructure that handles cross-tab logout / token-refresh / user-update propagation in the role-aware UI. Until this TD closes:

- Sign-out in tab B leaves stale role badge in tab A until refresh.
- Sign-in in tab B doesn't propagate to tab A.
- USER_UPDATED (admin changes a user's role server-side) doesn't reflect in open tabs.
- Token-refresh (hourly per Supabase default) doesn't re-validate role.

Per CLAUDE.md "treat null as non-privileged by default": none of these create elevated-access risk. RLS gates data server-side. But the UX degradation is real — single-tab usage is fine, multi-tab gets stale states until manual refresh.

## Cross-references

- `.planning/lessons.md` 2026-05-28 entry — Lessons 1 + 2 + 3 + production state.
- `.planning/qa-runs/2026-05-27-1536-internal-launch-hide-qa-report.md` Post-ship addendum (2026-05-28).
- `.planning/tech-debt/TD-WB-LISTENER-UNFLAG.md` — predecessor TD entry; status updated to `ROLLED-BACK-INVESTIGATING`. This TD subsumes the original.
- `src/hooks/use-current-role.ts:67-102` — the W.1 listener subscription site.
- `src/lib/supabase/client.ts` — supabase browser client init; harness bridge at lines 69-105 verified not relevant to the bug (dead code on Production builds).
- `src/middleware.ts:209-336` — Phase 1 T3 middleware gates + `respond404` helper. T3 is one of the candidate commits in the D2 bisect.
- `src/components/nav-bar.tsx:147-177` — Phase 1 T2 PRIMARY_NAV filter + isFeatureEnabled import. T2 is one of the candidate commits in the D2 bisect.
- `CLAUDE.md` Workflow posture Rule 10 — Runtime truth-table over inference (codified from this debug).
- `.planning/process/PLANNING-PIPELINE-TIERING.md` §10 — extended with L1 + L2 lessons feeding the verification standard.

## TD lifecycle / sequencing

- **STAYS BLOCKING on any future attempt to re-enable `NEXT_PUBLIC_AUTH_STATE_LISTENER` on Production.** Listener-off is the mitigation; flipping back without D2 + D3 + D4 reintroduces the production regression.
- **Sequencing question for next session** (per Jake nwrp252): three queued phases — (a) this TD's investigation, (b) `tiering-implementation` resume from `acbfa06`, (c) Ground-Truth-Verification phase. The interaction-bug must be at least D2-bisected before Ground-Truth-Verification (otherwise GTV inventory mid-surgery contaminates "broken vs scaffold" reads).
- **Resolved when:** D2 + D3 + D4 all complete AND Production runs at least 2 weeks on the chosen fix with no recurrence AND TD-WB-LISTENER-UNFLAG.md can be re-promoted to RESOLVED via clean unflag walk on the post-D4 Production-target deploy.
