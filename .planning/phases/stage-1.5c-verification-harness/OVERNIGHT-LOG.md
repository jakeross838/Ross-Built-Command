# Overnight execution log — stage-1.5c-verification-harness

Append-only log per nwrp54 PART 4. Newest at bottom. Jake reviews in morning.

---

## 2026-05-06T22:05:00Z — Begin overnight autonomous execution

**Action:** Read nwrp54 directive. Authorized for overnight per PART 1-6.
- Safe-autonomous-fix envelope: CATEGORY A (mechanical), B (hooks/CI), C (docs).
- HALT on CATEGORY X (product/planning) or CATEGORY Y (risk).
- Wave 4 → 5 → 6 → 7 with halt-after at each boundary.

**Outcome:** Log file initialized. Standing rules unchanged.

**Next step:** Check verify-phase workflow run on most recent commit (note: nwrp54 references `f7ad53a` but actual pushed HEAD is `ad25abb` — checking which run is live).

---

## 2026-05-06T22:13:00Z — Workflow runs 25463683331 + 25464083957 both FAILED at "Install dependencies"

**Action:** Triaged. Both runs failed at npm ci with package-lock drift.
- ad25abb (Plan 6 SUMMARY commit) → run 25463683331 → FAILED
- f7ad53a (Jake's interim "fix(deps): regenerate package-lock.json" commit — partial regen) → run 25464083957 → FAILED with same errors:
  - "lock file's canvas@2.11.2 does not satisfy canvas@3.2.3"
  - 20+ missing transitive deps (node-addon-api, prebuild-install, etc.)

**Outcome:** CATEGORY-A diagnosis (mechanical/infrastructure: npm dep sync). Safe to autofix per nwrp54 PART 2.

**Next step:** Run clean `npm install`, verify with `npm ci --dry-run`, commit, push.

---

## 2026-05-06T22:18:00Z — Lockfile resync attempt 1/3

**Action:** `npm install` (regenerated package-lock.json with 271 insertions, 37 deletions). `npm ci --dry-run` → success ("added 31 packages in 2s"). Committed at `4afdef7` "fix(deps): resync package-lock.json (CATEGORY-A autofix per nwrp54)". Pushed to origin.

**Outcome:** Lockfile re-synced; `npm ci` should now succeed in CI.

**Next step:** Wait for new workflow run on `4afdef7` to start + complete; triage outcome.

---

## 2026-05-06T22:23:00Z — Run #25464339730 on `4afdef7` FAILED at "Wait for Vercel preview Ready" (exit 3)

**Action:** Triaged. Install dependencies + Playwright browsers + phase determination + pending-status all passed. Vercel preview-wait step polled once and got `state=ERROR url=https://nightwork-platform-cxerkdahd-jakeross838s-projects.vercel.app (after 10s)`. Workflow aborted with exit 3 per Plan 6 spec.

**Outcome:** Vercel deployment for commit `4afdef7` ERRORED. Not a discovery issue — discovery worked. Build failed.

**Next step:** Reproduce locally via `npm run build`.

---

## 2026-05-06T22:25:00Z — Local `npm run build` reproduces failure: TS error in `src/lib/stripe.ts:20`

**Action:** Ran `npm run build`. Failed with:
```
./src/lib/stripe.ts:20:5
Type error: Type '"2026-03-25.dahlia"' is not assignable to type '"2026-04-22.dahlia"'.
```

Root cause: my CATEGORY-A autofix `npm install` (lockfile resync at `4afdef7`) transitively pulled in a newer Stripe SDK whose TS types declare `2026-04-22.dahlia` as the only accepted apiVersion. The existing `src/lib/stripe.ts:20` literal `2026-03-25.dahlia` no longer compiles.

**Outcome:** HALT per nwrp54 CATEGORY X. `src/lib/stripe.ts` is in src/lib but NOT src/lib/verification — outside autonomous-fix envelope.

**Next step:** Wrote `HALT-FOR-JAKE.md` with 3 candidate actions (Option A: update apiVersion to 2026-04-22; Option B: pin Stripe package version; Option C: defer Vercel-only protocol). Returning control to Jake.

## State at halt

- HEAD `4afdef7`, all commits pushed
- All 5 GH secrets validated
- Migration 00092 applied
- harness-fixture user bootstrapped
- Wave 0/1/2/3 plans (1-6) shipped + verified locally
- Wave 4-7 NOT dispatched
- 1 fix attempt used (resync attempt 1/3) — 2 remaining if Jake authorizes additional autonomous attempts

**Cost-cap status:** $0 spent on Anthropic vision (harness never ran end-to-end). Well under the $5 stop condition.

---

## 2026-05-06T22:35:00Z — Jake nwrp55: Option A authorized with research gate

**Action:** Per Jake's research gate, before bumping apiVersion to 2026-04-22.dahlia:

1. **Inventoried Nightwork's actual Stripe surface** (5 files use `getStripe()`):
   - `customers.retrieve/update` (webhook + settings/billing)
   - `subscriptions.retrieve/update` (webhook)
   - `checkout.sessions.create({ mode: 'subscription', line_items: [{ price, quantity }] })` (checkout)
   - `checkout.sessions.retrieve` (settings/billing)
   - `billingPortal.sessions.create` (portal)
   - `paymentMethods.list({ customer, type: 'card' })` (settings/billing)
   - `webhooks.constructEvent` (webhook)
   - Webhook events handled: `checkout.session.completed`, `customer.subscription.{created,updated,deleted}`, `invoice.payment_failed`

   Not used: PaymentIntents, SetupIntents, Products, Invoices.create.

2. **Researched Stripe changelog** between 2026-03-25.dahlia and 2026-04-22.dahlia:
   - **Stripe versioning policy** (https://docs.stripe.com/sdks/versioning) verbatim: "we release new API versions monthly with no breaking changes"
   - **WebSearch** confirmed: "2026-04-22.dahlia is a subsequent release [within Dahlia cycle], so it contains only additive changes and no breaking changes. Breaking changes in the Dahlia release cycle occurred in the initial version [2026-03-25.dahlia]."
   - **2026-04-22 additions** (per https://docs.stripe.com/changelog/dahlia/2026-04-22/):
     - Sunbit BNPL support (additive new payment method)
     - Pix recurring payments (additive)
     - Managed Payments in Checkout Sessions + Payment Links (additive)
   - None of the additions affect Nightwork's surface (Nightwork doesn't enable Sunbit/Pix/Managed Payments; uses standard subscription mode + card-only paymentMethods).

3. **Outcome:** No breaking changes for Nightwork's usage. Per Jake's research-gate criterion: proceed with apiVersion bump.

**Next step:** Update `src/lib/stripe.ts:20` apiVersion from `"2026-03-25.dahlia"` to `"2026-04-22.dahlia"`. Verify build clean. Commit + push.

---

## 2026-05-06T22:38:00Z — apiVersion bump committed at `94f401c`

**Action:**
- Edited `src/lib/stripe.ts:20`: `"2026-03-25.dahlia"` → `"2026-04-22.dahlia"`
- `npm run build` → ✓ Compiled successfully (only pre-existing Tailwind warning + ESLint a11y warnings — none from src/lib/stripe.ts)
- Committed at `94f401c`: "fix(stripe): bump apiVersion to 2026-04-22.dahlia" with full rationale (Stripe versioning policy + Nightwork surface analysis + verified additive-only changes)
- Pushed to origin (`4afdef7..94f401c`)

**Outcome:** Vercel build will retry on `94f401c`. Workflow will trigger automatically. Fix attempt 2/3 used; 1 remaining if subsequent issues surface.

**Next step:** Wait for run on `94f401c` to start + complete; triage outcome per nwrp54 PART 1.

**Note:** HALT-FOR-JAKE.md is now obsolete (Jake answered via nwrp55). Will remove or archive as resolved.

---

## 2026-05-07 — Recovery sequence: nwrp56 Option A (Node 20 → 22 CI bump)

**Context recap:**
- Computer shutdown 2026-05-06 22:38Z after `94f401c` (apiVersion bump) was pushed.
- Recovery initiated 2026-05-07 morning by Jake.
- Run on `94f401c` triaged in fresh session: failed at meta-test step "Supabase Realtime requires native WebSocket support" — Node 20 lacks native `WebSocket` global. Same run also surfaced `actions/setup-node` deprecation warning ("Node.js 20 is deprecated as of June 2026").
- nwrp56 authorized Option A: bump CI Node 20 → 22. Attempt 3/3 of nwrp54 autonomous budget.

**Action:**
1. `.github/workflows/verify-phase.yml:76` — `node-version: "20"` → `node-version: "22"` (CATEGORY-B per nwrp54 envelope, in-scope `.github/workflows/`).
2. `package.json` — added `"engines": { "node": ">=22" }` (locks dev/CI alignment with Jake's local Node 24).
3. `.nvmrc` — created with content `22` (developer hint, no enforcement).

**Justifications (from nwrp56):**
- Solves Supabase Realtime native WebSocket requirement at root cause (Node 22 ships native `WebSocket` global per WHATWG).
- Retires the "Node 20 deprecated June 2026" `actions/setup-node` warning.
- Aligns CI Node version with Jake's local Node 24 (no more local-vs-CI Node version drift).
- Single-line workflow change + 2 supporting files; low risk; in-envelope.

**Next step:** Commit + push the three files. Trigger triage on resulting workflow run per nwrp56 step 5. If meta-test passes on Node 22, resume Wave 4 dispatch (Plan 7 — gsd-research-standards + gsd-fix-executor) interactively per nwrp56 (Jake awake). If run fails differently, HALT immediately with new diagnostic and surface candidate next actions.

**Budget status:** Fix attempt 3/3 used after this commit pushes. Zero remaining if subsequent failure surfaces — must HALT for Jake.

---

## 2026-05-07T12:47:00Z — Run #25496484364 on `128a973`: Node 22 bump WORKED, new failure mode at auth-strategy step. HALT.

**Action:** Triaged.

**Node 22 bump SUCCESS — root-cause WebSocket issue resolved:**
- Setup Node ✓ (Node 22)
- Install dependencies ✓
- Install Playwright browsers ✓
- Determine phase ✓
- Set commit status (pending) ✓
- Wait for Vercel preview to be Ready ✓ (Vercel build green on `128a973`, preview `https://nightwork-platform-8vb5m83h1-jakeross838s-projects.vercel.app`)
- Run verification harness ✓ (step itself ran — meta-test/import-time WebSocket failure GONE — but harness exited code 4 internally)

**New failure (different):** Harness exited fast with FATAL on its own auth-strategy step. Verbatim from log:

> `[verify-phase] FATAL: [auth-strategy] User harness-fixture@nightwork.local signed in but has NO active org membership. Re-run migration 00092 (the org_members INSERT is gated on the user existing in auth.users — if the user was bootstrapped AFTER the migration ran, re-running 00092 binds the membership). See Plan 5 README "Chicken-and-egg setup" for the full bootstrap flow.`
>
> `[harness] verify-phase.ts exited with code 4`

This means the `harness-fixture` user authenticates fine (so all 5 GH secrets + Supabase URL + anon key are correct) but has no `org_members` row binding it to an org. The error message itself points to remediation and a documented runbook (Plan 5 README "Chicken-and-egg setup").

**Outcome:** HALT per nwrp56 line 24-27 (failed differently → halt immediately + document + surface candidates). Autonomous budget exhausted (attempt 3/3 used on the Node 22 bump). NOT proceeding to fix without explicit Jake authorization.

**Candidate next actions for Jake:**

- **Option A — Re-run migration 00092 via Supabase MCP.** The fix the FATAL message itself recommends. Tool: `mcp__supabase__apply_migration` with the 00092 SQL (or a small "rebind harness-fixture membership" migration). Safe assuming 00092 is idempotent; would need to verify by reading the migration file. Single tool call. Lowest risk if migration is idempotent.

- **Option B — Direct SQL: insert the missing `org_members` row for harness-fixture.** Tool: `mcp__supabase__execute_sql`. Bypasses migration; faster but skips the "Plan 5 bootstrap flow" the runbook prescribes. Acceptable as a one-shot if Jake confirms which org_id to bind to.

- **Option C — Run the full Plan 5 bootstrap flow.** Tear down harness-fixture user, re-create via Plan 5 README's documented sequence (auth.users INSERT → migration 00092 → org_members INSERT in correct order). Most thorough; longest path. Use if A and B both fail or if there's reason to suspect harness-fixture state is corrupted beyond just the missing membership.

- **Option D — Defer harness end-to-end until Wave 4+.** The harness has now demonstrated CI infrastructure works (auth/CI/Vercel/Node 22/setup-node/install/Playwright). Move forward with Wave 4 (Plan 7 — gsd-research-standards + gsd-fix-executor) without resolving harness-fixture today; resolve harness end-to-end on the way to Wave 6/7 when the harness gets exercised against real phase output.

**Recommendation:** Option A is the fix the error message itself prescribes. Suggest reading `supabase/migrations/00092_*.sql` first to confirm idempotency before re-applying.

**Budget status:** 0/3 autonomous fix attempts remaining for nwrp54 envelope. New authorization required for any next-step fix.

**Cost-cap status:** $0 spent on Anthropic vision (harness still hasn't run end-to-end). Well under the $5 stop condition.

**State at halt:**
- HEAD `128a973` (Node 22 bump), all commits pushed
- Vercel build green on `128a973`
- CI Node infrastructure now correctly aligned at Node 22 (matches Jake's local Node 24 modulo minor version)
- harness-fixture user authenticates but has no org_members row → harness exits 4
- Wave 4–7 still NOT dispatched
- HALT-FOR-JAKE-2.md NOT written this round (this OVERNIGHT-LOG entry IS the halt artifact per nwrp56 line 26)

---

## 2026-05-07 — nwrp57 + nwrp58 + nwrp59: root cause found, surgical fix applied

**Diagnostic chain (read-only, no fix attempts):**

- **nwrp57** (read-only DB query): confirmed harness-fixture user exists in auth.users (id `5eb26edc-…`), org_members row exists (org_id=FIXTURE_ORG_UUID, role=admin, is_active=true), org exists (slug=fixture-harness-org, deleted_at=null). DB state matched pre-overnight expected state perfectly. Migration 00092 idempotent (ON CONFLICT DO NOTHING throughout). No migrations applied since 00092. → Original 4 candidate fixes (re-run 00092 / direct membership insert / full bootstrap / defer) all addressed a non-problem; the membership row was already correct. Surfaced new hypothesis: harness's RLS-scoped read fails despite correct DB state.

- **nwrp58** (read-only code + RLS audit): read `src/lib/verification/auth-strategy.ts` (auth-strategy uses anon-key + signInWithPassword JWT — same client reused for membership check, RLS applies). Read RLS policies on org_members via pg_policy: `members read org_members USING (org_id = app_private.user_org_id())`. Read `app_private.user_org_id()` via pg_get_functiondef: **`SELECT org_id FROM public.profiles WHERE id = auth.uid()` — reads from PROFILES, not org_members.** Final check: `LEFT JOIN profiles` on harness-fixture user returned `profile_id=NULL`. **Root cause confirmed: harness-fixture has no profiles row → user_org_id() returns NULL → RLS predicate `org_id = NULL` hides the user's own membership row → auth-strategy.ts emits FATAL even though org_members row is present and correct.**

- **nwrp59** (authorize attempt 4 — corrective fix):

**Action (attempt 4/4):**

1. Verified `public.profiles` schema: id (uuid NOT NULL), full_name (text NOT NULL), email (text), role (text NOT NULL), org_id (uuid NOT NULL), created_at/updated_at (default now()).
2. **Amended `supabase/migrations/00092_verification_harness_fixture_org.sql`** in place — added new step 3 with `INSERT INTO public.profiles … SELECT … FROM auth.users WHERE email = 'harness-fixture@nightwork.local' ON CONFLICT (id) DO NOTHING`, mirroring the same SELECT-from-auth.users guard pattern used for org_members. Plus a long comment block explaining the chicken-and-egg gap and why this INSERT is required (links to nwrp58 diagnostic). Renumbered step 3 RLS-sanity comment to step 4. → Future cold-bootstraps of a fresh project will run amended 00092 once and seed all three rows (organizations, org_members, profiles) in one transaction.
3. **Created `supabase/migrations/00093_harness_fixture_profile_corrective.sql`** — corrective patch for the already-bootstrapped live DB where 00092 v1 was recorded as applied. Same idempotent INSERT.
4. **Applied 00093 via `mcp__supabase__apply_migration` → `{success: true}`**.
5. Verified live DB state with `SELECT u.email, p.id IS NOT NULL AS has_profile, p.role, p.org_id, om.role, om.is_active FROM auth.users u LEFT JOIN profiles p ON p.id=u.id LEFT JOIN org_members om ON om.user_id=u.id WHERE u.email='harness-fixture@nightwork.local'`:
   - `has_profile = true`
   - `profile.role = admin`
   - `profile.org_id = 00000000-0000-0000-0000-fb1ce0a55e55`
   - `member.role = admin`
   - `member.is_active = true`
   - All four post-fix invariants satisfied.

**Outcome:** The harness's RLS-scoped membership check (auth-strategy.ts:127-133) should now return the org_members row when run with harness-fixture's JWT. `user_org_id()` will resolve to FIXTURE_ORG_UUID via the new profiles row, RLS predicate `org_id = FIXTURE_ORG_UUID` will match, and the membership SELECT will succeed.

**Per nwrp59 explicit guidance:** auth-strategy.ts and RLS policies were NOT modified. The harness pattern (defense-in-depth via session-scoped RLS path) is correct; migration 00092 v1 was incomplete.

**Next step:** Commit amended 00092 + new 00093 + this log entry. Push. Triage new workflow run on resulting commit per nwrp59 step 7.

**Budget status:** Attempt 4/4 used (nwrp54 envelope extended by 1 per nwrp59 line 8 — corrective fix for nwrp57+nwrp58 diagnostic chain, not a new attempt at a previously-unsolved issue). Zero remaining if subsequent failure surfaces.

**Cost-cap status:** $0 spent on Anthropic vision (harness still hasn't run end-to-end).
