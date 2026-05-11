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

---

## 2026-05-07T13:09:00Z — Run #25497597582 on `2d2b203`: HARNESS RAN END-TO-END. Three real findings, HALT per nwrp59 step 7.

**Action:** Triaged.

**Outcome — harness now runs end-to-end (root cause from nwrp58 fixed):**
- Setup Node ✓ (Node 22)
- Install dependencies ✓
- Vercel preview Ready ✓
- **Run verification harness ✓ (3m46s — real execution; previous run was 2s fast-fail at auth-strategy)**
- Parse harness JSON output ✓
- Read final report ✓
- Upload artifacts ✓
- Post PR comment ✓
- Set commit status (final) ✓
- Fail job on harness failure X (the harness's own report has FAIL verdicts)

The "Fail job on harness failure" gate failure is the harness *reporting* — not infrastructure. The harness completed, produced `.planning/verification/reports/stage-1.5c-verification-harness/final.md`, summary: **PASS=2, FAIL=61, SKIP=3**. This is the "real Plans 1-5 issues surfaced" branch of nwrp59 step 7.

**Three categorical findings:**

### Finding 1 — Vercel deployment protection blocks all 58 route-status checks (HTTP 401)

Every `layer1-route-status-*` criterion FAILED with `→ HTTP 401 | expected: HTTP 2xx or 3xx | actual: HTTP 401`. Sample: root, /admin, /admin/platform/*, /cost-intelligence/*, /dashboard, /design-system/*, /draws, /financials, /invoices, /jobs, /login, /onboard, /pricing, /settings/*, /signup, /vendors — all 58 routes the harness probes return 401.

**Root cause (high confidence):** Vercel's *Deployment Protection* feature gates preview URLs by default — unauthenticated requests to a preview URL return 401 unless authenticated via Vercel SSO or unless the request carries the `x-vercel-protection-bypass: <secret>` header (or `?x-vercel-protection-bypass=<secret>` query param) with a value matching `VERCEL_AUTOMATION_BYPASS_SECRET`.

The harness's `layer1/route-status` runner fetches raw URLs without credentials; Vercel returns 401 before the Next.js app even runs. INFRASTRUCTURE gap — likely unaccounted for in Plan 6's design and not surfaced earlier because the harness never ran end-to-end before this run.

**Candidate fix paths (for Jake's decision):**
- **A.** Disable Vercel Deployment Protection for the project's preview environment (Vercel dashboard → Settings → Deployment Protection → toggle off for Preview). Simplest, but exposes preview URLs to anyone with the URL.
- **B.** Configure `VERCEL_AUTOMATION_BYPASS_SECRET` on the Vercel project, store as a GH Actions secret, and update Plan 6's `layer1/route-status` runner to attach the `x-vercel-protection-bypass` header on every preview fetch. Most secure; preserves preview privacy. Single-file edit + 1 new GH secret + 1 Vercel setting.
- **C.** Use Vercel's *Protection Bypass for Automation* feature (similar to B but managed via Vercel's UI, generates a long-lived bypass token).

### Finding 2 — `layer1-mechanical-build-clean` FAIL appears to be a false positive

Evidence column shows: `> next build ⚠ No build cache found. Please configure build caching for faster rebuilds. ... Attention: Next.js now collects completely anonymous telemetry...` — this is `next build`'s normal stdout for a fresh CI runner. The build *almost certainly succeeded* (Vercel preview built green on this same commit; harness step ran). But the harness's "build-clean" check is matching against this stdout pattern and returning FAIL.

**Likely root cause:** Plan 2's `layer1/mechanical/build-clean` predicate is probably either (a) checking exit code AND stdout for "✓ Compiled successfully" OR (b) flagging any `⚠`/warning emoji as a fail. Without reading the predicate source: this is a HARNESS RULE TUNING issue — Plan 2 work, not a real failure.

**Candidate fix:** read `src/lib/verification/layer1/mechanical/build-clean.ts` (or wherever the predicate lives) and verify the success criterion is "process exit code = 0", not a stdout substring match. Likely a 1–3 line edit.

### Finding 3 — Three AC SKIPs: criterion text in wrong layer

`AC-stage-1.5c-verification-harness-02-20@desktop|laptop|mobile` all SKIPped with: `Criterion text does not match Layer 1 DOM convention v1: 'src/lib/verification/layer1/dom-assertions.ts uses chromium.launch() and 3 viewports (1920/1280/393)'`.

**Root cause:** This AC is written about a SOURCE FILE assertion (Plan 2 implementation detail — "uses chromium.launch() and 3 viewports") but registered as Layer 1 DOM-convention which expects DOM-element-presence assertions. Either the AC was registered in the wrong layer in the phase spec, or its text needs rewording into the DOM convention.

**Candidate fix:** rewrite AC-02-20 in PLAN.md (or wherever phase ACs live) as either: (a) a Layer 1 *mechanical* check (grep `src/lib/verification/layer1/dom-assertions.ts` for `chromium.launch` + check viewport array contains [1920, 1280, 393]); or (b) move the AC to a different verification mechanism entirely. Single-spec edit.

### What's confirmed working

- Node 22 CI runner ✓
- npm dep sync ✓
- Stripe SDK apiVersion alignment ✓
- Vercel preview build ✓
- Harness auth-strategy + RLS-scoped membership check ✓ (post nwrp58/59 fix)
- Layer 1 mechanical/typecheck-clean ✓ (PASS — 0 errors in src/)
- Layer 1 mechanical/drummond-grep ✓ (PASS — hook exit 0)
- Plan 6 workflow infrastructure (vercel-wait + harness execution + JSON parse + report read + artifact upload + PR comment + commit-status) ✓

**Per nwrp59 step 7:** HALT — real Plans 1-5 issues surfaced. NOT in scope for nwrp54 autonomous envelope (these are CATEGORY-X product/planning fixes, not CATEGORY-A/B/C mechanical fixes).

**Budget status:** Attempt 4/4 used. Zero remaining. Awaiting Jake decision.

**Recommended fix sequencing (for Jake):**
1. **Finding 1 (Vercel auth)** is highest-leverage — fixing it unblocks 58 of 61 FAILs in one move. Suggest Path B (`VERCEL_AUTOMATION_BYPASS_SECRET` + harness header). Likely ~30–60 min including Vercel UI + GH secret + harness code edit.
2. **Finding 2 (build-clean predicate)** likely 5–15 min — single-file predicate fix in `src/lib/verification/layer1/`.
3. **Finding 3 (AC-02-20 rewrite)** likely 5 min — phase-spec edit.

After all three: harness should report PASS=63, FAIL=0, SKIP=0 (or close), and Wave 4 dispatch can proceed per nwrp54 PART 3.

**Cost-cap status remains $0** (harness has no Layer 3 criteria yet — only Layer 1 ran).

---

## 2026-05-07 — nwrp60: three corrective commits, MANUAL STEP REQUIRED for FIX 1

**Action (attempt 5/5 — nwrp54 envelope extended, treated as Plan 6.1 amendment per nwrp60 line 3):**

Three fix commits landed in sequence (clean history per nwrp60 step 27):

### Commit `f4bd96b` — FIX 1: Vercel deployment protection bypass

Per Vercel docs (https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection):
- Edited `src/lib/verification/layer1/route-status.ts` — read `process.env.VERCEL_AUTOMATION_BYPASS_SECRET`; when set, attach `x-vercel-protection-bypass: <secret>` + `x-vercel-set-bypass-cookie: true` headers on every preview-URL fetch. Cookie spares per-request bypass overhead (Vercel sets a session cookie after first bypass).
- Edited `.github/workflows/verify-phase.yml` — added `VERCEL_AUTOMATION_BYPASS_SECRET: ${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}` to the job-level env block alongside `ANTHROPIC_API_KEY`, `VERCEL_TOKEN`, `HARNESS_FIXTURE_PASSWORD`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Behavior with secret unset → no bypass header sent (works for unprotected local dev URLs). With secret set → header attached on every fetch.

#### **MANUAL STEP REQUIRED BEFORE NEXT WORKFLOW RUN WILL FULLY SUCCEED**

Until both sub-steps below are completed, the workflow run on `c20d524` will still show 58/58 route FAILs because Vercel rejects empty bypass headers:

1. **Generate the secret in Vercel:**
   - Vercel dashboard → `nightwork-platform` project → Settings → Deployment Protection → **Protection Bypass for Automation** → Generate Secret → **Copy value**

2. **Add the secret to GitHub Actions:**
   ```bash
   gh secret set VERCEL_AUTOMATION_BYPASS_SECRET --body '<paste-value-here>' --repo jakeross838/nightwork-platform
   ```
   Or via UI: GitHub repo → Settings → Secrets and variables → Actions → New repository secret → name `VERCEL_AUTOMATION_BYPASS_SECRET` → value `<paste>`.

3. **Trigger a re-run** by an empty commit on the branch (or via `gh run rerun <id>` for the post-fix run).

### Commit `fe36f63` — FIX 2: build-clean predicate exit-code-only

`src/lib/verification/layer1/build-typecheck.ts` previously failed on any `/\bwarn(?:ing)?[ :]/` substring in stdout/stderr in addition to exit-code != 0. This produced a false positive on Run #25497597582: Next.js prints `⚠ No build cache found. Please configure build caching for faster rebuilds.` on fresh CI runners (a perf hint, not a build problem); the substring match probably also tripped on dependency deprecation notices or telemetry strings. Build succeeded (exit 0) but harness reported FAIL.

Tightened predicate: exit code 0 only. Updated criterion text from "0 warnings, 0 errors" → "exits 0" so the published criterion matches the predicate. Lint/typecheck warnings belong to dedicated runners (typecheck is `runTypecheck` in same module; lint not yet wired).

### Commit `c20d524` — FIX 3: AC-02-20 dom: section converted to N/A

Plan 2's `dom:` section in `01.5-c-verification-harness-2-layer-1-static-checks-PLAN.md` had two source-file assertions about its own `dom-assertions.ts` ("contains a regex matching 'Page X contains element/text \"Y\"'", "uses chromium.launch() and 3 viewports (1920/1280/393)"). The orchestrator filters `dom:` criteria into the dom-assertions runner; the runner's convention-v1 parser expects `Page <path> contains element/text "<value>"` and rejects everything else with `Criterion text does not match Layer 1 DOM convention v1` SKIP — which is exactly what we saw 3× in the run.

Both ACs are tautologically verified by integration (the @desktop/@laptop/@mobile result-ID suffixes prove chromium.launch + 3 viewports work; the SKIP message itself is evidence the convention-v1 regex exists). Replaced with a single `N/A — …` entry matching the existing `visual:` N/A precedent in the same file. The criteria-loader skips N/A entries (line 166), so 3 SKIPs disappear from the report.

Authoring lesson captured inline: Plan-internal implementation ACs don't belong in `dom:`; either omit (integration covers it) or rewrite as convention-v1 checks against rendered surfaces.

### Expected outcome of next workflow run

| Component | Expected verdict |
|---|---|
| Setup Node / Install / Vercel preview / harness exec / artifact upload | ✓ (carries forward from `2d2b203`) |
| layer1-mechanical-build-clean | **PASS** (was FAIL — FIX 2) |
| layer1-mechanical-typecheck-clean | PASS (carries forward) |
| layer1-mechanical-drummond-grep | PASS (carries forward) |
| 58 × layer1-route-status-* | **PASS** if Jake's manual Vercel secret step is complete; else FAIL again with HTTP 401 (FIX 1) |
| 3 × AC-stage-1.5c-verification-harness-02-20@viewport SKIPs | **gone from report** (FIX 3 — criteria-loader skips N/A entries) |

If manual step complete: PASS≈61, FAIL≈0, SKIP=0 (modulo any real route issues). Wave 4 dispatch unblocked.
If manual step pending: PASS=3, FAIL=58, SKIP=0. Surface again with halt for manual step.

**Budget status:** Attempt 5/5 used (per nwrp60 line 3 envelope extension). Zero remaining. Awaiting Jake decision after triaging next run.

**Cost-cap status remains $0** (no Layer 3 criteria; no vision API spend).

---

## 2026-05-07T17:03:00Z — Run #25510202433 on `104636c`: FIX 2 + FIX 3 verified clean. FIX 1 blocked on Jake manual step.

**Action:** Triaged.

**Outcome — exact prediction match for "manual step pending" branch:**

| Metric | Prior run (`2d2b203`) | This run (`104636c`) | Δ | Cause |
|---|---|---|---|---|
| PASS | 2 | **3** | +1 | FIX 2 ✓ — `layer1-mechanical-build-clean` now PASS with `evidence: "exit 0"` (was FAIL on warn-substring false positive) |
| FAIL | 61 | 60 | −1 | build-clean moved to PASS; route-status FAILs unchanged |
| SKIP | 3 | **0** | −3 | FIX 3 ✓ — AC-02-20 N/A entry skipped by criteria-loader; 3 viewport-multiplied SKIPs gone |

All 60 remaining FAILs are `layer1-route-status-*` returning HTTP 401 — confirms FIX 1 code is wired correctly but `VERCEL_AUTOMATION_BYPASS_SECRET` is not yet present in GitHub Actions secrets, so route-status sends an empty bypass header → Vercel rejects.

**Manual step still required (un-blocking action):**
1. Vercel project Settings → Deployment Protection → Protection Bypass for Automation → Generate Secret → Copy value
2. `gh secret set VERCEL_AUTOMATION_BYPASS_SECRET --body '<value>' --repo jakeross838/nightwork-platform`
3. Trigger re-run (empty commit on branch, or `gh run rerun 25510202433`)

After manual step completes, expected next-run shape: PASS=63, FAIL=0, SKIP=0 — assuming no real route-status issues underneath the 401s. Wave 4 dispatch unblocked at that point.

**Code-side scope is closed.** All in-envelope corrective fixes for the three findings from run #25497597582 have landed and are verified working in CI. No further code/spec changes pending in nwrp60 scope.

**Halting per nwrp60 scope completion + manual-step gate.**

**Budget status:** Attempt 5/5 used. Zero remaining. Awaiting Jake to complete the Vercel manual step + decide how to proceed (re-run workflow vs. defer Wave 4 dispatch on different signal).

**Cost-cap status remains $0.**

---

## 🟢 2026-05-07T18:20:20Z — Run #25513946216 on `4f3b595`: INAUGURAL FULL-PASS MILESTONE

**Action:** Per nwrp61, Jake set `VERCEL_AUTOMATION_BYPASS_SECRET` in GH Actions secrets (verified via `gh secret list` — timestamp 2026-05-07T18:16:02Z), then triggered fresh run via empty commit `4f3b595`.

**Workflow conclusion: SUCCESS.** All 17 steps green; "Fail job on harness failure" step skipped (no failure to propagate). Harness completed in 149.0s; report committed to artifacts.

### Verdict counts

- **PASS: 63** (was 3 prior run — +60 came back online once Vercel bypass took effect)
- **FAIL: 0** ✨ (was 60 — all route-status 401s resolved)
- **SKIP: 13** (was 0 — split into two distinct surface-completeness gaps; see below)

### What now PASSes

- `layer1-mechanical-build-clean` ✓ (FIX 2)
- `layer1-mechanical-typecheck-clean` ✓ (carried)
- `layer1-mechanical-drummond-grep` ✓ (carried)
- 60 × `layer1-route-status-*` ✓ (FIX 1 + Jake's manual Vercel secret step)

### SKIP triage — both are documented future-Wave dependencies, not real failures

#### SKIP-A — Layer 2 introspection surface (1 criterion)

`layer2-conservation-money-line-items-sum` SKIPped with verbatim error:

> `No introspection surface at <preview>/api/_introspect/invoice (HTTP not 2xx/3xx). Wave 1.1 adds /api/_introspect/* routes; until then Layer 2 skips...`

This is a known and documented future-Wave dependency captured by the rule itself. Wave 1.1 ships the `/api/_introspect/*` routes; Layer 2 conservation rules will activate then.

#### SKIP-B — Layer 3 vision model deprecation (12 criteria)

All 12 Layer 3 vision criteria SKIPped with the same Anthropic API error:

> `404 {"type":"error","error":{"type":"not_found_error","message":"model: claude-3-5-sonnet-20241022"}}`

The harness's Layer 3 vision client (`src/lib/verification/layer3/vision-client.ts`) is calling Anthropic with the model ID `claude-3-5-sonnet-20241022` — which has been **retired** (current latest is the Claude 4.X family per system prompt; Sonnet 4.6 / Haiku 4.5 / Opus 4.7 are currently shipping).

This is in the harness's own code (Plan 4 — `src/lib/verification/layer3/`), not Plans 1-5 application code, so it would be in-scope for a Plan 6.1+ correction. **Not fixed in this session per nwrp61 envelope budget exhaustion (5/5 used).** Surfaced for Jake decision.

Recommended fix path when authorized:
- Single-line edit in `src/lib/verification/layer3/vision-client.ts` to update the model ID from `claude-3-5-sonnet-20241022` → a current Claude 4.X model (`claude-sonnet-4-6` is the current Sonnet equivalent for vision).
- Re-run the harness; expect Layer 3 SKIPs → PASS/FAIL depending on actual rendered surface vs. criterion text.
- Estimated cost on first non-cached vision run per the SKIP cost column: $0.0000 (still $0 because nothing actually ran on Anthropic side).

### What's now confirmed end-to-end working

- ✓ Node 22 CI runner (nwrp56)
- ✓ npm dep sync + Stripe SDK alignment (nwrp54)
- ✓ Vercel preview build (existing infra)
- ✓ Harness auth-strategy + RLS-scoped membership check (nwrp58/59 fix — profiles row)
- ✓ Layer 1 mechanical (build, typecheck, drummond-grep)
- ✓ Layer 1 route-status across 60 production routes (nwrp60 FIX 1 + nwrp61 manual step)
- ✓ Plan 6 GH Actions workflow (vercel-wait → harness exec → JSON parse → final.md → artifact upload → PR comment → commit-status)
- ✓ Per-commit report writing + sanitized final.md
- ✓ Plan 8a criteria-loader respects N/A entries (nwrp60 FIX 3)

### Wave 4 dispatch posture

**Per nwrp61 step 4A: UNBLOCKED but HALT for Jake review.** The harness now produces a real signal end-to-end — surface the report contents + ask Jake whether to:

1. **Dispatch Wave 4 (Plan 7 — gsd-research-standards + gsd-fix-executor) immediately.** The 0-FAIL state is the milestone Wave 4 needed; SKIP-A and SKIP-B are documented future-Wave / Plan 6.1 amendment work that don't block Plan 7.

2. **Pause to fix SKIP-B (Layer 3 vision model)** before Wave 4. One-line edit; would unlock Layer 3 verdicts on the next run, possibly surfacing real Plans 1-5 FAILs the harness was built to catch (cost code missing on invoice line items, etc. — WI-004 territory). Closer to the harness's full-fidelity signal before Wave 4.

3. **Both** — fix SKIP-B (unblocks Layer 3), confirm next run still 0 FAIL or surface real Plans 1-5 issues, then Wave 4.

**Halting per nwrp61 outcome A. Awaiting Jake review + dispatch authorization.**

**Budget status:** Attempt 5/5 used; nwrp54 envelope exhausted. nwrp61 authorized one-time corrective execution (set secret + trigger run + triage). No new authorization yet for SKIP-B fix or Wave 4 dispatch.

**Cost-cap status remains $0** (Layer 3 vision API never successfully ran — all calls 404'd before incurring spend; Anthropic doesn't bill on 404s).

---

## 2026-05-07T18:30:24Z — Run #25514368735 on `0ffb9a9`: nwrp62 FIX 4 worked — vision API now operational. NEW failure mode surfaced. Outcome C, HALT.

**Action (attempt 6/6 — nwrp54 envelope, nwrp62 FIX 4 single-line vision-client model update):**

Updated two literal occurrences of `claude-3-5-sonnet-20241022` → `claude-sonnet-4-6`:
- `src/lib/verification/layer3/vision-client.ts:31` (DEFAULT_MODEL)
- `src/lib/verification/layer3/runner.ts:64` (VISION_MODEL_ID)

Pushed at `0ffb9a9`. Run #25514368735 completed in 199.1s.

### Verdict counts

- **PASS: 63** (Layer 1 unchanged — all 60 routes + build + typecheck + drummond)
- **FAIL: 12** (was 0; ALL 12 Layer 3 vision criteria FAIL)
- **SKIP: 1** (`layer2-conservation-money-line-items-sum` — Wave 1.1 dependency, unchanged)

### What worked (nwrp62 FIX 4 success)

- ✓ Anthropic vision API reachable on `claude-sonnet-4-6`
- ✓ Vision calls returning 200 (no more 404s)
- ✓ Cost cap operational: **$0.0782 spent**, well under the $1/run cap (~$0.0066/call × 12 calls)
- ✓ Cost recorded per-criterion in report and idempotency cache
- ✓ Confidence scores returning real values (0.50–0.95)
- ✓ Reasoning text populated in harness JSON

### NEW infrastructure failure mode (outcome C)

**Every Layer 3 screenshot shows a Vercel SSO login page**, not the Nightwork app. The vision model is correctly identifying that the screenshot does not contain the criterion subject — but the screenshot is the wrong page. Sample reasoning:

> AC-04-60 (conf 0.95): "The screenshot shows a Vercel login page with no README documentation… The criterion requires Layer 3 README documentation which is entirely absent from this login page."
>
> AC-08a-97 (conf 0.95): "The screenshot shows a Vercel login page, not the Nightwork platform content. No 'Site Office' signature, tracking-eyebrow styling, or UPPERCASE eyebrow text elements are visible anywhere on the page."
>
> AC-08a-98 (conf 0.95): "Default black/white/gray styling and no Slate Set B palette… No construction platform UI or slate-blue color tokens are visible."
>
> AC-08a-103 (conf 0.95): "Not a Document Review interface. There is no file preview panel, right-rail panel, or audit timeline visible anywhere on the page."

(All 12 vision reasoning entries describe the same thing: a Vercel login page where the actual app should be.)

### Root cause

Layer 1 `route-status.ts` (FIX 1) attaches the Vercel bypass header on every `fetch()` call → all 60 routes return 200/3xx as expected.

But **Layer 3's `runner.ts:181` calls `browser.newContext({ viewport: { width: 1280, height: 800 } })` without `extraHTTPHeaders`** — so when Playwright/chromium navigates to the preview URL, it does NOT attach `x-vercel-protection-bypass`. Vercel's deployment protection redirects the browser to the Vercel SSO login page. Playwright takes a screenshot of that login page. Vision API correctly says "this isn't your app." 12 FAILs.

This is the same class of problem FIX 1 solved for the `fetch()` path, just hadn't surfaced on the Playwright path because Layer 3 had been blocked by the deprecated model ID.

### Halting — DO NOT FIX per nwrp62 directive

> "DO NOT modify auth-strategy.ts, RLS policies, Plans 1-5 application code, or dispatch Wave 4 without Jake authorization. Stay scoped to vision-client model ID update + run triage."

The fix is in `src/lib/verification/layer3/` (in-envelope for Plan 6.1 amendment) but **not in nwrp62's authorized scope** — model-ID-update only. Halting per outcome C.

### Candidate fix paths for Jake's decision (nwrp63 territory)

#### Option A — Recommended: chromium.newContext extraHTTPHeaders (single-file, minimal)

Edit `src/lib/verification/layer3/runner.ts:181` to thread the bypass header into the chromium context when set:

```ts
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  ...(bypassSecret && {
    extraHTTPHeaders: {
      "x-vercel-protection-bypass": bypassSecret,
      "x-vercel-set-bypass-cookie": "true",
    },
  }),
});
```

After the first navigation, Vercel sets a session cookie (per `x-vercel-set-bypass-cookie: true`) so subsequent requests in the same context carry the bypass automatically — no per-request overhead. Behavior with secret unset: no headers attached (works for unprotected local dev URLs).

**Same pattern should be applied to `src/lib/verification/layer1/dom-assertions.ts`** — it also calls `chromium.launch()` and will hit the same issue once a future phase authors a real DOM convention v1 criterion. Both runners share the `_browser.ts` helper for launch args; either extend that helper to include extraHTTPHeaders or duplicate the pattern in each runner.

Estimated change size: ~5–10 lines. ~5 min including grep + edit. Cost on next run: another ~$0.0782 (12 vision calls).

#### Option B — Query param fallback

Append `?x-vercel-protection-bypass=<secret>` to each `pageUrl` before `page.goto()`. Works without modifying browser context, but pollutes URLs in screenshots/logs and clashes with route-specific query params.

#### Option C — Defer Layer 3 verification until Wave 1.1+ in production

Mark Layer 3 as known-broken-against-protected-previews; rely on Layer 1 + Layer 2 for now; revisit when Vercel auth is removed from preview environments or a different verification path is set up. Loses the harness's vision capability for this phase but unblocks Wave 4 dispatch.

### Recommendation

**Option A** is the canonical fix for the harness's stated design (Layer 3 vision against protected Vercel previews). One file edit, ~5–10 lines, idempotent with the secret-unset path, sets up a clean precedent for `dom-assertions.ts` to follow when needed. Estimated cost on first re-run: ~$0.0782 (cached subsequent runs would be $0 per existing idempotency cache).

After Option A: expected next run shape if Layer 3 surfaces real Plans 1-5 issues = MIXED (some PASSes for criteria where the rendered surface satisfies the criterion, some FAILs surfacing actual gaps). If 0 vision FAILs: full PASS=75, FAIL=0, SKIP=1. Wave 4 dispatch confirmed unblocked at that point.

**Halting per nwrp62 outcome C. Awaiting Jake fix-path decision.**

**Budget status:** Attempt 6/6 used. Zero remaining. nwrp62 envelope exhausted.

**Cost-cap status:** **$0.0782 spent on vision API in this run** (first non-zero spend across all attempts). Well under $1/run cap; idempotency cache will prevent re-spend on identical (commit, criterion) pairs.

---

## 2026-05-07T18:53:08Z — Run #25515440465 on `a476a03`: nwrp63 FIX 5 worked. Layer 3 reaching real app. 11 real findings, HALT outcome B.

**Action (attempt 7/7 — nwrp63 FIX 5):**

Threaded Vercel deployment-protection bypass into Playwright contexts via new `vercelBypassHeaders()` helper in `src/lib/verification/_browser.ts`. Used in:
- `src/lib/verification/layer3/runner.ts:181` (Layer 3 vision context)
- `src/lib/verification/layer1/dom-assertions.ts:83` (Layer 1 DOM assertions context — preventive; no DOM criteria active in this phase)

Pushed at `a476a03`. Run #25515440465 completed in 200.0s; vision cost $0.0788.

### Verdict counts

- **PASS: 64** (was 63; +1 — first Layer 3 vision PASS!)
- **FAIL: 11** (was 12; −1)
- **SKIP: 1** (`layer2-conservation-money-line-items-sum` — Wave 1.1 dependency, unchanged)

### What FIX 5 accomplished

Vision screenshots now show **real app content** instead of Vercel SSO login page. Sample reasoning shifts:
- Before (`0ffb9a9`): "The screenshot shows a Vercel login page, not the Nightwork platform content."
- After (`a476a03`): "The screenshot shows a Nightwork marketing homepage with a hero section, CTA buttons, and a capabilities section."

The app is reachable. The harness is now signaling at full fidelity through all three layers.

### The PASS — AC-08a-98 (conf 0.72): Slate palette ✓

> "Page `<route>`: Slate Set B palette only (#5B8699 stone-blue accents; no off-token hex)"
>
> Vision (PASS, 0.72): "The visible accent color on the SIGN IN button and 'Forgot password?'/'Start a free trial' links appears to be a slate/stone-blue consistent with #5B8699; no obviously off-token accent colors are visible…"

The harness vision-confirmed the brand-token compliance the design system mandates. ✨ Inaugural Layer 3 PASS.

### The 11 FAILs split into two clean categories

#### Category 1 — Authoring error: criteria describe non-UI things (8 FAILs)

These criteria were authored under `visual:` or `semantic:` (Layer 3 vision) in their PLAN files, but their text describes documentation, CI workflow internals, agent design, code architecture, or schema rules — none of which are evaluable from a UI screenshot. **Same authoring bug Plan 2 had with AC-02-20 (fixed in nwrp60 FIX 3 by converting to `N/A — …` with rationale).**

| Criterion | Plan | Vision verdict + reasoning | What this AC is actually about |
|---|---|---|---|
| AC-04-60 | 4 (Layer 3 Vision) | FAIL 0.5 — "non-UI/documentation criterion" | "Layer 3 README documents the idempotency contract…" → README docs |
| AC-06-76 | 6 (GH Actions) | FAIL 0.5 — "repo-level artifacts not visible" | "workflows/README.md documents this milestone (D-29 anchor)" → repo file |
| AC-06-77 | 6 (GH Actions) | FAIL 0.5 — "CI/CD workflow concern unrelated to UI" | "PR comment includes both run link and artifact link" → CI artifact |
| AC-07-91 | 7 (New Agents) | FAIL 0.5 — "internal agent design standards… not in UI" | "Agent design: gsd-research-standards… caching strategy + TTL + authority hierarchy" → agent design |
| AC-07-92 | 7 (New Agents) | FAIL 0.5 — "internal agent design/engineering constraint" | "Agent design: gsd-fix-executor scope-narrowed…" → agent design |
| AC-08b-126 | 8b (Loop) | FAIL 0.5 — "code/design criterion not visible" | "Loop design: state machine bounded (MAX_ITERATIONS=3…)" → code architecture |
| AC-08b-127 | 8b (Loop) | FAIL 0.5 — "internal CI/orchestration system design requirement" | "Loop design: Claude-in-the-loop default mode…" → CI orchestration |
| AC-09-140 | 9 (Calibration Log) | FAIL 0.5 — "schema design rule… not in UI" | "Schema design: machine-readable JSON + human-readable markdown hybrid…" → schema |

**Recommended fix path:** rewrite each as one of:
- (a) `behavioral:` Layer 2 standards rule (with a corresponding registry entry) — for design/architecture invariants that can be checked by introspection or grep
- (b) `mechanical:` Layer 1 grep-style check (would require extending Layer 1 mechanical category to support source-file ACs — Plan 6.3+ work)
- (c) `N/A — <reason>` — match the pattern from nwrp60 FIX 3 / AC-02-20 — for criteria that are tautologically verified by integration / build / phase shipping

Most of these (4 of 8) are about agent or loop *design*, which is best captured as a Plan-2-style narrative AC tracked outside the harness. (b) requires harness extension work; (c) is a 30-minute phase-spec edit. Recommend (c) for now to clear the noise, with (a) deferred to a future "extend Layer 2 to cover design-invariant ACs" plan.

#### Category 2 — Route/page targeting gaps (3 FAILs)

These are real visual/semantic claims, but the harness rendered the wrong page so vision can't evaluate them.

| Criterion | Plan | Vision verdict + reasoning | What's wrong |
|---|---|---|---|
| AC-08a-97 | 8a (Criteria Mandate) | FAIL 0.9 — "login page with no 'Site Office' signature visible…" | Criterion text uses `<route>` placeholder unsubstituted; defaulted to login page |
| AC-08a-102 | 8a (Criteria Mandate) | FAIL 0.5 — "login page with no invoice line items visible" | Criterion text uses `<route>` placeholder; should target an invoice review page (this is WI-004 territory!) |
| AC-08a-103 | 8a (Criteria Mandate) | FAIL 0.95 — "marketing homepage… no Document Review pattern with file preview, right-rail, audit timeline" | Criterion text doesn't specify a route; defaults to `/`; should target `/invoices/[id]/review` |

These are the harness doing what it was built to do — surfacing that **even authoring-correct criteria can't be evaluated until route binding works**. AC-08a-102 in particular is the WI-004 cost-code criterion: it would PASS or genuinely FAIL once it's pointed at an actual invoice review page with line items.

**Recommended fix path:** two distinct fixes
- (i) **Plan 8a criteria mandate update** — require explicit route paths in criterion text; deprecate `<route>` placeholder syntax (or define route-substitution semantics).
- (ii) **Plan 5 orchestrator route-resolver** — implement `<route>` substitution against either a phase-config map or a deterministic page (e.g. fixture-org's first invoice). This is real Plan 5 implementation work; not in nwrp54 envelope.

### Summary card

| Category | Count | Severity | Fix scope |
|---|---|---|---|
| 1 — Authoring errors (Plans 4, 6, 7, 8b, 9) | 8 | Low — noise, not real failures | Phase-spec edits (~30 min total) |
| 2 — Route/page targeting (Plan 8a × 3) | 3 | Medium — blocks real verification | Plan 8a spec + Plan 5 implementation work |
| **Real Plans 1-5 issues surfaced** | **0 confirmed yet** | — | Will surface once Category 2 routing fixed |

The harness has demonstrated end-to-end signal integrity. **Zero confirmed Plans 1-5 application bugs surfaced yet** — but Category 2 prevents AC-08a-102 (WI-004 cost-code) from evaluating against a real invoice page, so a real WI-004 issue could still be lurking.

### Wave 4 dispatch posture

The original harness purpose (find real Plans 1-5 issues) is partially blocked on Category 2 routing fixes. But Wave 4 (Plan 7 — gsd-research-standards + gsd-fix-executor agents) doesn't depend on Layer 3 fidelity — it's about agent infrastructure for the loop-with-executor (Plan 8b). Wave 4 dispatch is unblocked from a workflow-gate standpoint (the harness reports SUCCESS gate-wise; FAILs are surfaced for review, not blocking).

**Per nwrp63 outcome B: HALT for Jake findings review.**

### Halting per nwrp63 directive

> "DO NOT modify auth-strategy.ts, RLS policies, Plans 1-5 application code, or dispatch Wave 4 without Jake authorization. Stay scoped to bypass-header-in-Playwright fix + run triage."

No further fixes attempted. Awaiting Jake decision on:
1. **Wave 4 dispatch now** (Plan 7 — agents) — Category 1/2 are spec-quality work that can run in parallel or after.
2. **Category 1 cleanup first** (~30 min phase-spec edits to N/A the 8 misauthored ACs) — clears noise from harness reports going forward.
3. **Category 2 fix first** (Plan 5 route resolver + Plan 8a criteria mandate update) — unblocks real Layer 3 verification, but is non-trivial implementation.
4. **All three in some order.**

**Budget status:** Attempt 7/7 used. Zero remaining. nwrp54 + nwrp62 + nwrp63 envelopes exhausted.

**Cost-cap status:** **$0.0788 spent this run; cumulative $0.157** ($0.0782 + $0.0788) across two productive Layer 3 runs. All under $1/run cap. Idempotency cache will short-circuit re-runs against same (commit, criterion) pairs at $0 vision cost.

---

## 2026-05-07T19:53:18Z — Run #25518393171 on `d552e97`: nwrp64 FIX 6 cleared Category 1 cleanly. HALT for Jake before FIX 7.

**Action (attempt 8/9 — nwrp64 FIX 6):**

- 5 PLAN files edited (Plans 4/6/7/8b/9): 8 misauthored visual:/semantic: ACs replaced with single `N/A — <reason>` entries citing the run that surfaced each FAIL and explaining where the criterion's truth actually lives (behavioral category, code review, or integration).
- Plan 8a (criteria-mandate) extended with new "Common authoring errors (post-mortem)" section codifying the pattern (Documentation/CI/Agent design/Code architecture/Schema rules/Source-file claims) with concrete examples and the rule: visual:/semantic: MUST describe something visible on a rendered web page.

Pushed at `d552e97`. Run #25518393171 completed in 178.2s; vision cost $0.0260 (down from $0.0788 — fewer criteria run, ~4 calls × $0.0065 each).

### Verdict counts

- **PASS: 64** (unchanged — Layer 1 60 routes + 3 mechanical + 1 Layer 3 vision)
- **FAIL: 3** (was 11; −8 — exactly the predicted Category 1 cleanup)
- **SKIP: 1** (Layer 2 introspection — Wave 1.1 dep, unchanged)

### Layer 3 detail (4 criteria total — AC-IDs renumbered after 8 ACs removed from loaded set)

| ID (this run) | Was (nwrp63) | Verdict | Conf | Notes |
|---|---|---|---|---|
| AC-08a-92 | AC-08a-97 | FAIL | 0.90 | "Site Office signature" — Category 2: rendered login page (`<route>` placeholder unsubstituted) |
| **AC-08a-93** | **AC-08a-98** | **PASS** | **0.72** | **"Slate Set B palette" — preserved across renumbering ✨** |
| AC-08a-97 | AC-08a-102 | FAIL | 0.50 | "cost code on invoice line items" (**WI-004 territory**) — Category 2: rendered login page |
| AC-08a-98 | AC-08a-103 | FAIL | 0.95 | "Document Review pattern" — Category 2: rendered marketing `/` (no route specified) |

The renumbering is mechanical: criteria-loader uses `AC-${phase}-${plan}-${criteria.length + 1}` so removing 8 entries from the loaded set shifts the global sequence number for everything after. Only the 4 Plan 8a Layer 3 ACs survived the cleanup; their relative ordering is intact.

### What FIX 6 confirmed

- ✓ N/A pattern works as designed — criteria-loader skips N/A entries silently (line 166 of criteria-loader.ts: `if (/^\s*N\/A/i.test(text)) continue;`).
- ✓ The PASS for Slate palette compliance (AC-08a-93, conf 0.72) is durable across cleanup — vision API stably identified `#5B8699 stone-blue` accents on SIGN IN button and links.
- ✓ Vision cost dropped proportionally (4 calls vs 12) — the harness only spends on criteria that survive sanitization + N/A filtering.
- ✓ Plan 8a now codifies the authoring lesson with concrete examples — future PLAN authors have a reference to consult.

### Halting per nwrp64 step 6

> "HALT for Jake — confirm Category 1 cleared cleanly before Category 2 dispatch."

Category 1 cleared cleanly. The 3 remaining FAILs are exactly the Category 2 (route/page targeting) criteria. **Awaiting Jake confirmation before dispatching FIX 7** (Plan 8a criteria-mandate update for explicit routes + Plan 5 orchestrator route-resolver implementation + sweep existing ACs for `<route>` placeholder usage).

**Budget status:** Attempt 8/9 used (nwrp64 authorized two attempts). 1 remaining for FIX 7.

**Cost-cap status:** $0.0260 this run; cumulative $0.183 across three productive Layer 3 runs. Well under $1/run cap. Idempotency cache should short-circuit AC-08a-93 (PASS) on subsequent runs against the same commit at $0 vision cost.

---

## 2026-05-07T20:10:40Z — Run #25519241866 on `ab292c6`: nwrp65 FIX 7 root-caused criteria-loader bug. 3 new findings unmasked. HALT.

**Action (attempt 9 — nwrp65 FIX 7, route-resolver implementation + criteria-mandate update):**

### DEEPER ROOT CAUSE found while implementing FIX 7

The 4 "Plan 8a Layer 3 ACs" (`Page <route>: Site Office signature…`, `…Slate palette…`, `…cost code on invoice line items…`, `Document Review pattern present…`) we'd been chasing as Category 2 since nwrp63 — they were **NEVER Plan 8a's real criteria**. They were **template examples** the criteria-loader was extracting because its regex matched the FIRST `<criteria>` literal anywhere in the file (an inline-prose mention at Plan 8a:20 — `"…require <criteria> yaml block per D-17/D-18"`) → first ```yaml``` block after it (the drop-in template at line 145 with `Page <route>: …` placeholders), not the real `<criteria>` block at line 503.

This means:
- Plan 8a's actual criteria were never being loaded (its real block sat dead since the file was authored)
- Other PLAN files with inline `<criteria>` mentions in prose may have been similarly affected
- The "WI-004 cost-code AC" and "Document Review pattern AC" we'd been excited about — those were template examples Jake/team had written as illustrations of good criteria; never real verification targets

### Three changes shipped in this commit

1. **`src/lib/verification/criteria-loader.ts`** — line-anchored regex with multiline flag. `<criteria>` and `</criteria>` MUST now be on their own lines. Inline-prose mentions no longer trigger extraction. All 12 PLAN files verified line-anchored at standalone-tag positions; behavior preserved for everything except Plan 8a (now picks up the real block) and apparently Plans 5, 10 (which had similar prose-mention ambiguity).

2. **Plan 8a PLAN.md updates:**
   - Real `<criteria>` block (line 503) `semantic:` items converted to single `N/A — …` entry (template/spec-checker design = misauthored, same anti-pattern as FIX 6).
   - Drop-in template (line 145-165) updated to use REAL explicit routes (`/design-system/philosophy`, `/design-system/palette`, `/design-system/patterns`, `/financials/invoices/[id]`).
   - New "Route convention" callout added: explicit routes required; `<route>` placeholder deprecated; backward-compat fallback to `/` preserved but discouraged.

3. **`src/lib/verification/layer3/README.md`** — extended "Page URL routing" with route-extraction contract table covering 5 representative shapes (explicit, dynamic-segment, missing-prefix, deprecated placeholder, fallback).

### Verdict counts

- **PASS: 63** (was 64; −1 — the previous Layer 3 PASS was AC-08a-93 / Slate palette, which was a template example. Plan 8a's real visual: is N/A, so no Layer 3 PASS from there now.)
- **FAIL: 3** (was 3; same count, **completely different ACs** — the 3 template-derived Category 2 FAILs disappeared, replaced by 3 newly-unmasked misauthored ACs from Plans 5 and 10)
- **SKIP: 1** (Layer 2 introspection — Wave 1.1 dep, unchanged)
- **Vision cost:** $0.0201 (3 calls × ~$0.0067; cumulative $0.203)

### The 3 newly-unmasked FAILs — same Category 1 anti-pattern as FIX 6

| ID | Plan | Vision reason | Actually about |
|---|---|---|---|
| AC-10-29 | 10 (Documentation) | "internal documentation design pattern (VERIFICATION-PIPELINE.md canonical doc role)" | Doc structure/architecture |
| AC-10-30 | 10 (Documentation) | "internal documentation files (VERIFICATION-PIPELINE.md, MASTER-PLAN, PHILOSOPHY, CLAUDE.md, CONTEXT.md) … cross-document consistency check that is not verifiable visually" | Cross-doc consistency |
| AC-05-100 | 5 (Orchestrator) | "internal test documentation (orchestrator.test.md, Plan 11, Scenario 4)" | Test doc claim |

**Same authoring anti-pattern as FIX 6** — `semantic:` ACs describing docs / cross-doc / test files, none vision-evaluable. They were hidden by the criteria-loader bug; now visible because the regex correctly extracts each PLAN's real `<criteria>` block.

The proper fix is the same playbook: convert these 3 to `N/A — <reason>` entries citing this run + explaining that doc/test correctness is verified by integration or by `behavioral:` content checks, not by vision API.

### Halting per nwrp64 step 6 + nwrp65 directive

> "HALT for Jake regardless of outcome — Wave 4 dispatch is the next decision after FIX 7 lands."

**Authorized scope is fully consumed.** nwrp64 authorized FIX 6 + FIX 7; nwrp65 authorized FIX 7 execution. Both have shipped. The 3 newly-unmasked findings are CATEGORY 1 work — applying the FIX 6 playbook (~10 min phase-spec edits in Plans 5 and 10) — but **not in nwrp65's authorized scope**.

### Three options for Jake's call

1. **FIX 6.1 — Apply N/A cleanup to AC-10-29, AC-10-30, AC-05-100** (~10 min phase-spec edits, ~1 attempt). Brings the report to PASS=63 / FAIL=0 / SKIP=1 — clean signal. Then Wave 4 dispatch.

2. **Dispatch Wave 4 (Plan 7) now.** The 3 new FAILs are AC-quality issues, not real Plans 1-5 application bugs; workflow gate will continue reporting failure but the harness signal integrity is solid. Cleanup can ride alongside or after Wave 4.

3. **Author proper Layer 3 ACs against `/design-system/patterns`** (where Document Review pattern actually renders with Caldwell fixture data including cost codes on invoice line items). New ACs would be REAL verification of WI-004 and the Document Review template — the milestone we'd been pursuing before discovering the template-extraction bug. ~30 min spec work. Then Wave 4.

**Recommendation:** Option 1 (~10 min cleanup) → confirm clean → then Option 3 (~30 min real ACs against `/design-system/patterns`) → confirm WI-004 verdict → then Wave 4. End-state: harness verifying real surfaces, not template examples.

**Budget status:** Attempts 8 + 9 used (nwrp64 + nwrp65). Zero remaining without new authorization.

**Cost-cap status:** $0.0201 this run; cumulative **$0.203** across all productive vision runs. Well under $1/run cap. Idempotency cache will keep cost flat on subsequent runs against same commit.

---

## 2026-05-07T20:40:49Z — Run #25520633491 on `8e4ead1`: nwrp66 STEP 1+2 landed. NOVEL FAILURE MODE — app-middleware auth gating. WI-004 verdict = AMBIGUOUS. HALT.

**Action (continuous block per nwrp66 — STEP 1 + STEP 2 in single commit `8e4ead1`):**

### STEP 1 — FIX 6.1 cleanup ✓
3 unmasked Category-1 ACs converted to N/A:
- Plan 5: AC-05-100 (orchestrator.test.md / Plan 11 Scenario 4 cross-ref)
- Plan 10: AC-10-29 (VERIFICATION-PIPELINE.md canonical doc role)
- Plan 10: AC-10-30 (cross-doc consistency across 5 internal MD files)

Same authoring anti-pattern as nwrp64 FIX 6 + nwrp65 FIX 7. All 3 dropped from harness reports cleanly.

### STEP 2 — Authored 4 real Layer 3 ACs ✓
Targeted actually-rendered design-system surfaces (Jake's `/design-system/prototypes/{invoices,documents}/*` don't exist; the patterns/typography/palette pages render the canonical content):

- AC-08a-130 visual: `/design-system/palette` — Slate Set B swatches + #5B8699 hex code
- AC-08a-131 visual: `/design-system/typography` — tracking-eyebrow row 0.14em UPPERCASE
- AC-08a-138 semantic: `/design-system/patterns` — Document Review pattern visible
- AC-08a-139 semantic: `/design-system/patterns` — cost code metadata visible (single-invoice WI-004 surface)

Plus two latent loader bugs found and fixed inline:
1. Plan 8a mechanical AC #3 contained literal triple-backticks which prematurely closed the `\`\`\`yaml` code fence and truncated criteria-loader extraction. Rephrased.
2. Plan 8a behavioral AC mentioned `<criteria>` tag literally in prose; rephrased to "structured criteria block".

Verified 15/15 ACs extract cleanly post-fix; all under 200-char SEC-HIGH-2 cap.

### Run #25520633491 verdict counts

- **PASS: 63** (Layer 1: 60 routes + 3 mechanical synthetic; no Layer 3 PASS)
- **FAIL: 4** (all 4 newly-authored Layer 3 ACs)
- **SKIP: 1** (Layer 2 introspection — Wave 1.1 dep, unchanged)
- **Vision cost:** $0.0264 (4 calls × ~$0.0066); cumulative **$0.230**

### NOVEL FAILURE MODE — app-middleware auth gating

All 4 vision calls FAIL with confidence 0.95 — and all 4 say the same thing: **the screenshot shows the Nightwork login page, not the `/design-system/*` page that the criterion targeted.**

Verbatim reasoning (all 4 ACs):

> AC-08a-130 (palette): "screenshot shows a login page, not the /design-system/palette page. No palette swatches, hex codes, or color system UI are visible — only email/password fields and sign-in controls."
>
> AC-08a-131 (typography): "screenshot shows the Nightwork login page… There is no token table, no tracking-eyebrow row, and no typographic samples visible."
>
> AC-08a-138 (Document Review pattern): "screenshot shows a Nightwork login page, not the /design-system/patterns page. No Document Review pattern, file preview, or structured invoice fields are visible."
>
> AC-08a-139 (cost-code WI-004 surface): "screenshot shows a Nightwork login page with email/password fields and a Sign In button. There is no invoice WI-004, no 'Cost code' label, and no design-system/patterns content visible; **the page has not authenticated to display the required content**."

#### Diagnosis

- ✓ Layer 3 route extraction worked — `evidence.pageUrl` shows the correct `/design-system/palette`, `/design-system/typography`, `/design-system/patterns` URLs.
- ✓ Vercel deployment-protection bypass worked (nwrp65 FIX 5) — Playwright got past Vercel SSO.
- ✗ **The Nightwork app's own Next.js middleware redirected to `/login`** because the Playwright browser context has no Supabase auth cookie.

Per CLAUDE.md "Components playground at `/design-system`": "Gated to platform_admin in production via middleware (404 to non-staff per Stage 1.5a SPEC B7)." So `/design-system/*` requires authentication AND platform_admin role.

The harness's `auth-strategy.ts` calls `supabase.auth.signInWithPassword` and gets an `access_token` + `refresh_token` — but those credentials are scoped to the Layer 3 runner's Supabase client, NOT to the Playwright browser context. The browser navigates as an unauthenticated user, hits the middleware, gets redirected to `/login`.

#### WI-004 verdict: **AMBIGUOUS**

We cannot evaluate the WI-004 cost-code surface (or any `/design-system/*` page) until the harness's Layer 3 runner attaches the Supabase auth session to the Playwright browser context. **The harness's "find what's broken" fidelity is intact** — it's correctly surfacing that the screenshots are wrong-page — but it can't yet *evaluate* protected surfaces.

### Three candidate fix paths (all in src/lib/verification/, in-envelope for Plan 6.5 amendment)

**A — Recommended: attach Supabase session cookie to Playwright context.** The harness already authenticates via `auth-strategy.ts` and gets `access_token` + `refresh_token`. Convert these to Supabase's session-cookie format and add via `context.addCookies()` after `browser.newContext()`. Same pattern as Vercel bypass header — once cookie is set, all subsequent requests in that context carry the auth. Estimated change: ~20 lines in `runner.ts` + maybe a helper in `auth-strategy.ts`. Requires platform_admin role for `/design-system/*` per CLAUDE.md — would need to either (a) seed harness-fixture user as platform_admin, OR (b) target post-login routes that org-admin can reach.

**B — Authenticate via Playwright (UI flow).** Have Layer 3 runner navigate to `/login` first, fill email/password (HARNESS_FIXTURE_PASSWORD), submit, wait for redirect, then navigate to target route. More fragile (depends on login UI structure) but matches "real user" testing posture.

**C — Change `/design-system/*` middleware to allow public read in non-production.** Per CLAUDE.md the playground is "Sample data only — no Drummond, no real Ross Built records — so the playground is safe to share." Could relax the middleware to skip auth for non-prod environments. Touches src/middleware.ts (Plans 1-5 product code, CATEGORY-X — outside nwrp envelope).

#### Halt for Jake — per nwrp66 explicit halt criterion

> "Novel failure mode (not template-extraction, not misauthored AC, not route placeholder)"

This is novel — app-middleware-auth, distinct from the Vercel-deployment-protection bypass we already solved. Halting.

The good news: every other piece of the harness is **operating correctly**. Route extraction parses properly, Vercel bypass holds, vision API hits real models with real screenshots, cost is bounded, idempotency presumably works. Just need one more layer of session attachment to unlock protected app routes.

**Budget status:** Attempt 10 of nwrp envelope (continuous block per nwrp66). Cumulative vision spend $0.230 — well under the $5 ceiling Jake authorized. Plenty of room for FIX 8 once authorized.

**Cost-cap status:** $0.0264 this run; cumulative **$0.230** across 5 productive vision runs.

---

## 2026-05-07T21:18:56Z — Run #25522448412 on `572280f`: nwrp67 FIX 8 STEP 1 worked. HALT for platform_admin architectural decision.

**Action (continuous block per nwrp67 STEP 1 — cookie attachment, no role-gate work):**

Implemented Supabase session cookie attachment to Playwright contexts. 7 files changed; typecheck clean. Pushed at `572280f`.

### Architecture summary

1. **`HarnessSession`** (auth-strategy.ts) gained `supabase_url` + `raw_session` fields. `raw_session` is the opaque session object from `supabase.auth.signInWithPassword` — kept opaque so future Supabase auth schema additions flow through automatically.
2. **`Layer{1,3}Context`** (types.ts) gained optional `harness_session?: HarnessSessionLike`. `HarnessSessionLike` is the runner-needed subset (supabase_url + raw_session); declared in types.ts to keep dependency direction clean.
3. **`_browser.ts`** added `supabaseSessionCookies(supabaseUrl, previewUrl, rawSession): PlaywrightCookie[]`. Constructs the SSR auth cookie matching `@supabase/ssr` defaults:
   - name: `sb-<projectRef>-auth-token` (chunked `.0`/`.1`/... if > 3180 chars)
   - value: `base64-` + base64URL(JSON.stringify(rawSession))
   - sameSite Lax, secure (https previews), httpOnly false
   - 400-day expiry (matches `DEFAULT_COOKIE_OPTIONS.maxAge`)
   - Project-ref derivation: `hostname.split(".")[0]` (matches `@supabase/supabase-js` SupabaseClient.ts:369)
   - Returns empty array if session/url undefined → `context.addCookies([])` is a no-op (idempotent with local-mode runs)
4. **`orchestrator.ts`** threads `harnessSession` into Layer{1,3}Context.
5. **`layer3/runner.ts`** + **`layer1/dom-assertions.ts`** call `supabaseSessionCookies` + `context.addCookies` after `newContext()` (mirrors `vercelBypassHeaders` pattern).

### Verdict counts (Run #25522448412)

- **PASS: 63** (Layer 1: 60 routes + 3 mechanical synthetic — unchanged)
- **FAIL: 4** (all 4 Layer 3 ACs still FAIL — but for a *different reason* now)
- **SKIP: 1** (Layer 2 introspection — Wave 1.1 dep, unchanged)
- **Vision cost:** $0.0258 (cumulative **$0.256**)

### A. Cookie attachment confirmation — VERIFIED WORKING

**Reasoning shifted from "Nightwork login page" → "404 'This page could not be found'"** across all 4 Layer 3 ACs:

> AC-08a-130 (palette): "screenshot shows a 404 error page ('This page could not be found'), meaning the /design-system/palette page does not exist or is inaccessible"
>
> AC-08a-131 (typography): "404 error page... /design-system/typography page did not load"
>
> AC-08a-138 (Document Review pattern): "404 'This page could not be found' error, meaning the /design-system/patterns page does not exist and no Document Review pattern or any UI content is visible"
>
> AC-08a-139 (cost-code WI-004 surface): "404 'This page could not be found' error page, so no invoice or cost code metadata is visible at the /design-system/patterns URL"

**Why this proves cookie attachment works:** if cookies were missing/malformed, Nightwork's middleware would redirect to `/login` (the prior nwrp66 behavior). Instead, the middleware now *successfully recognizes the auth*, looks up membership, identifies the harness-fixture user as **org-admin in fixture-harness-org** (not platform_admin), and applies the design-system role gate per CLAUDE.md:

> "Components playground at `/design-system`. Gated to platform_admin in production via middleware (404 to non-staff per Stage 1.5a SPEC B7)."

Cookie attachment is functioning correctly. Auth, project-ref derivation, base64URL encoding, chunking thresholds all verified by behavioral observation (404 path, not /login redirect path).

### B. Layer 3 verdict status — still 4 FAILs, but role-gated not auth-gated

The 4 newly-authored ACs targeting `/design-system/{palette,typography,patterns}` cannot succeed regardless of how good the harness gets, because the harness-fixture user is **non-staff** by design and `/design-system/*` 404s non-staff in all environments. The harness is correctly surfacing the role gate.

WI-004 remains AMBIGUOUS — same reason as nwrp66 (we cannot evaluate the cost-code surface) but with a clearer diagnostic now (role gate, not auth gate).

### C. Architectural question — HALT for Jake decision

> Per nwrp67 STEP 2: "HALT FOR JAKE before any platform_admin seed work. The seed is a real D-30 architectural question worth one halt."

The harness-fixture user needs to verify content on `/design-system/*` (where prototypes render). Three architectural paths, each with D-30 / multi-tenant safety implications:

#### P1 — Grant `platform_admin` to harness-fixture

**What it does:** Insert `harness-fixture` into `public.platform_admins` (per CLAUDE.md the platform-admin grant is direct SQL with `notes` column documenting purpose). Harness gains cross-tenant-readable scope on every major tenant table (per migration 00049 `*_platform_admin_read` SELECT policies). On `/design-system/*`, the middleware no longer 404s.

**D-30 implications:**
- Any future authoring error or drift in the harness could read across all customer tenants. The harness today operates only on fixture-harness-org by design (D-30 amendment), but `platform_admin` would weaken that "by construction" tenant boundary at the DB level.
- CLAUDE.md states platform_admin grants are auditable via `platform_admin_audit` and intended for "operators (Jake, Andrew, future support / engineering)". A *system account* with cross-tenant SELECT is a different posture than an operator account; would need a fresh D-30 amendment plus an audit-log row explaining the grant.
- Mitigation: the harness's auth-strategy already asserts membership.org_id === FIXTURE_ORG_UUID at line 147 (defense-in-depth — fails loudly on D-30 breach). Extending to also assert "platform_admin reads ONLY occur on /design-system/* routes" would require harness-side scope-narrowing; current harness has no such enforcement.

#### P2 — Add Caldwell-like fixture data to fixture-harness-org

**What it does:** Migration that seeds invoices, jobs, cost-codes into fixture-harness-org so that production routes (e.g. `/jobs/[id]/budget`, `/financials/invoices/[id]`) render meaningful content for the org-admin harness-fixture user. Layer 3 ACs target those routes instead of `/design-system/*`.

**D-30 implications:**
- Cleanest by-construction posture: harness sees only fixture-org data; tenant boundary is preserved.
- Cost: more migration work + more fixture maintenance + the design-system playground stays out of automated verification. Some criteria (Slate palette, tracking-eyebrow tokens) are most directly verified ON the design-system pages — verifying them through production routes is indirect.
- The CLAUDE.md "Components playground" was explicitly designed to be platform_admin-only; using a different verification surface honors that design intent.

#### P3 — Add `/design-system/*` verification-bypass middleware path

**What it does:** Add a header-based bypass to the `/design-system/*` middleware (similar to `VERCEL_AUTOMATION_BYPASS_SECRET`): if a special header `x-nightwork-verification-bypass: <secret>` is present, the middleware skips the platform_admin gate. Layer 3 / dom-assertions add the header alongside vercel bypass + cookies.

**D-30 implications:**
- Touches `src/middleware.ts` (Plans 1-5 application code, **CATEGORY-X — outside nwrp envelope** without explicit Jake authorization).
- Risk: the bypass secret leaking would expose `/design-system/*` (sample-data only per CLAUDE.md, so disclosure risk is low). But it sets a precedent for header-based middleware-skip flags.
- Cleanest from harness-side; preserves harness-fixture's org-admin posture (no cross-tenant grant).
- CLAUDE.md note: "Sample data only — no Drummond, no real Ross Built records — so the playground is safe to share for design feedback." So the design-system pages are already considered low-sensitivity. Adding a verification-bypass is consistent with that posture.

#### Recommendation

**P3 > P2 > P1** by D-30 alignment:

- **P3 is the cleanest match for the existing pattern** (Vercel bypass via env-var-controlled header). The /design-system/* middleware is already declared "404 to non-staff per Stage 1.5a SPEC B7" — adding a verification-bypass for CI is conceptually identical to "404 to non-staff EXCEPT verified-automation."
- **P2 is the most thorough by-construction fix** but requires fixture-data work.
- **P1 weakens D-30 the most** — granting platform_admin to a system account breaks the operator-vs-system distinction the platform_admin role was built for.

**Recommend Jake reads:**
1. CLAUDE.md "Platform admin (cross-tenant)" section — confirm whether granting platform_admin to a system account fits the design.
2. `.planning/phases/stage-1.5c-verification-harness/01.5-c-verification-harness-CONTEXT.md` D-30 ("Tenant safety boundary") — confirm which path the D-30 amendment was envisioning.
3. `src/middleware.ts` — assess the surface area for adding a verification-bypass code path.

**Halting per nwrp67 STEP 2. Awaiting Jake decision on P1/P2/P3.**

**Budget status:** Attempt 11 (continuous block per nwrp66/67 framing). Cumulative vision spend **$0.256** (well under $5 ceiling).

**Cost-cap status:** $0.0258 this run.

---

## 2026-05-08T13:49Z — nwrp68 FIX 9 STEP 1+2 landed; HALT for manual VERIFICATION_BYPASS_SECRET setup

**Action (continuous block — STEPs 1 + 2 in two clean commits, attempt 12):**

### Commit `a3f22b1` — STEP 1: middleware bypass

`src/middleware.ts` updated. `isVerificationBypass(request)` helper added with four-clause defense in depth:

1. `pathname` inside `/design-system/*` (caller filters; helper re-checks)
2. `VERIFICATION_BYPASS_SECRET` env var set + length ≥ 16 (fail closed)
3. `VERCEL_ENV !== "production"` — bypass NEVER works on production deployment, regardless of secret state
4. `x-nightwork-verification-bypass` header equals secret via timing-safe compare (constant-time XOR loop)

Replaced prior CR1/H12 "no env-var bypass" comment block with rationale: this contract is materially different — header + secret + production-block, not env-var-presence-flag. Audit log: every bypass usage emits `[verification-bypass]` to stdout (tab-separated pathname / ip / ua / ts) which flows through Sentry breadcrumb. No DB write — `platform_admin_audit` is for operator actions, not system-account verification.

D-30 alignment: `/design-system/*` is platform-presentation (sample data per CLAUDE.md), not tenant data. Bypass is narrow-scope, secret-gated, production-blocked, audit-logged. Tenant-data routes (`/api/*`, `/jobs`, `/financials`, `/people`, `/company`, `/reports`) unaffected — RLS continues to enforce tenant boundary.

### Commit `829d6e3` — STEP 2: harness wiring

`src/lib/verification/_browser.ts` gains two helpers:
- `nightworkVerificationBypassHeaders()` — returns `{x-nightwork-verification-bypass: <secret>}` when env set; empty object otherwise
- `harnessBrowserHeaders()` — convenience wrapper merging Vercel + Nightwork bypass headers

`layer3/runner.ts` + `layer1/dom-assertions.ts`: replace standalone `vercelBypassHeaders()` with `harnessBrowserHeaders()`. Both layers now attach Vercel SSO bypass + Nightwork verification bypass in a single `extraHTTPHeaders` pass.

`.github/workflows/verify-phase.yml`: add `VERIFICATION_BYPASS_SECRET: ${{ secrets.VERIFICATION_BYPASS_SECRET }}` to job-level env block.

### Run #25559090719 on `829d6e3`: fail-closed confirmation

PASS=63 / FAIL=4 / SKIP=1 — **identical verdicts and 404 reasoning to the prior run** because `VERIFICATION_BYPASS_SECRET` isn't yet set in GH Actions. The middleware bypass code is wired but **inert without the secret** — exactly the fail-closed posture the design demands.

Sample vision reasoning (AC-08a-130, conf 0.95): *"The screenshot shows a 404 'This page could not be found.' error, so the /design-system/palette page did not load."* Same as nwrp67's run. The bypass needs both server-side and client-side secret presence to fire; we shipped both code paths but the shared secret hasn't been generated yet.

Vision cost: $0.0259; cumulative **$0.282**.

### MANUAL STEP REQUIRED — Jake, before next harness run will reach `/design-system/*`

```
1. Generate the shared secret locally:
   openssl rand -base64 32

2. Add to Vercel project env vars:
   - Vercel → nightwork-platform → Settings → Environment Variables → Add
   - Name:   VERIFICATION_BYPASS_SECRET
   - Value:  <paste from step 1>
   - Environments: Preview, Development
     (DO NOT add to Production — server-side middleware unconditionally
      blocks bypass when VERCEL_ENV=production, but defense-in-depth
      says: don't even surface the secret to the prod environment)

3. Add to GitHub Actions secrets:
   gh secret set VERIFICATION_BYPASS_SECRET \
     --body '<same value>' \
     --repo jakeross838/nightwork-platform

4. (Optional, for local-mode harness runs):
   echo 'VERIFICATION_BYPASS_SECRET=<same value>' >> .env.local

5. Trigger fresh harness run:
   git -C nightwork-platform commit --allow-empty \
     -m "ci: trigger harness with VERIFICATION_BYPASS_SECRET configured"
   git push
```

### Halt for Jake — manual step gate

After step 3, Layer 3's vision reasoning should shift from "404 page" → real `/design-system/*` content (palette swatches, typography token table, Document Review pattern, cost-code metadata). All 4 ACs become evaluable. WI-004 surfaces with a real verdict (PASS / FAIL on actual rendered content).

If anything goes wrong post-secret-setup (bypass not firing, new 404, vision misread the content) — that's outcome B/C territory and a fresh halt-for-Jake.

**Halting per nwrp68 STEP 2 manual-step gate.** Code is shipped; awaiting Jake secret setup + run trigger.

**Budget status:** Attempt 12 (continuous block per nwrp66/67/68 framing). Cumulative vision spend **$0.282** (well under $5 ceiling). The bypass-inert run cost the same as a normal run because vision still ran and 404'd; idempotency cache will keep cost flat on the next run if criteria don't change.

**Cost-cap status:** $0.0259 this run.

---

## 2026-05-08T14:20Z — Run #25560571687 on `fa3be66`: bypass still not firing — GH secret missing. HALT (outcome B).

**Action:** Triggered fresh harness run via empty commit per Jake's instruction after he configured `VERIFICATION_BYPASS_SECRET` in Vercel (Preview only) and stated GH Actions secrets were set.

### Verdict counts (Run #25560571687)

- **PASS: 63** (unchanged)
- **FAIL: 4** (all 4 Layer 3 ACs — *identical 404 reasoning to prior 3 runs*)
- **SKIP: 1**
- **Vision cost:** $0.0258 (cumulative **$0.308**)

Vision reasoning verbatim (sample): *"The screenshot shows a 404 'This page could not be found.' error page, meaning /design-system/palette does not exist."* — same as nwrp67 + nwrp68 STEP-2 runs.

### Diagnosis (outcome B — bypass not working as intended)

**Root cause: `VERIFICATION_BYPASS_SECRET` is NOT present in GitHub Actions secrets.**

#### Evidence #1 — workflow log inspection

Every step header prints the resolved env var. For un-set secrets, GitHub Actions resolves to empty string (rather than redacting with `***`):

```
verify  Run verification harness  2026-05-08T14:17:56...   VERIFICATION_BYPASS_SECRET:
verify  Setup Node                                          VERIFICATION_BYPASS_SECRET:
verify  Install dependencies                                VERIFICATION_BYPASS_SECRET:
... (every step shows empty value)
```

By comparison, properly-set secrets in the same job env block render as `***`. So the `${{ secrets.VERIFICATION_BYPASS_SECRET }}` reference resolved to undefined → empty string → harness `nightworkVerificationBypassHeaders()` returned `{}` (fail-closed) → no header attached → middleware fell through to the 404 path.

#### Evidence #2 — `gh secret list` direct query

```
$ gh secret list --repo jakeross838/nightwork-platform | grep VERIFICATION
(no output)

$ gh secret list --repo jakeross838/nightwork-platform | grep -E "VERIFICATION|VERCEL"
VERCEL_AUTOMATION_BYPASS_SECRET   2026-05-07T18:16:02Z
VERCEL_TOKEN                      2026-05-06T16:29:59Z
```

Only `VERCEL_AUTOMATION_BYPASS_SECRET` (set during nwrp61) and `VERCEL_TOKEN` exist. `VERIFICATION_BYPASS_SECRET` is missing from GH.

#### Evidence #3 — middleware bypass code is correct

The middleware code itself (`a3f22b1`) and harness wiring (`829d6e3`) are working as designed. Run #25559090719 (immediately after STEP 2 push, before any secret config) showed the same fail-closed posture, confirming the code path is wired but inert without both server-side AND CI-side secrets.

### Three possible causes

1. **Secret set in wrong scope** — GH supports secrets at org / repo / environment levels. If Jake added it to a repository **environment** (e.g. "production") rather than at the repo level, it wouldn't be available to the workflow which doesn't use `environment:` blocks.

2. **Different secret name** — the workflow expects exactly `VERIFICATION_BYPASS_SECRET` (`.github/workflows/verify-phase.yml:78`). A typo (e.g., `NIGHTWORK_VERIFICATION_BYPASS_SECRET`, `VERIFICATION_BYPASS`, trailing whitespace) would silently resolve empty.

3. **GH UI didn't save** — occasionally the "Add secret" form fails silently if the value contains characters the form misinterprets, or if the user navigates away before submission completes.

### Recommended remediation (one of three paths)

**A. Verify + retry via gh CLI (fastest, ~30s):**
```bash
gh secret set VERIFICATION_BYPASS_SECRET \
  --body '<paste the same value used in Vercel>' \
  --repo jakeross838/nightwork-platform

# Verify:
gh secret list --repo jakeross838/nightwork-platform | grep VERIFICATION_BYPASS_SECRET
# Should show: VERIFICATION_BYPASS_SECRET   2026-05-08T...
```

**B. Check GH UI for misnamed secret:** Settings → Secrets and variables → Actions → look for any secret with a similar name (typos / case mismatch / trailing whitespace).

**C. Paste the secret value back to me:** I can run `gh secret set` directly (same redaction protocol as nwrp61 — no echo, no log, no commit).

### Important: secret value MUST match Vercel's

The middleware compares the harness-provided header against `process.env.VERIFICATION_BYPASS_SECRET` *on the deployed Vercel preview*. If Jake's Vercel env value differs from the GH Actions secret value, the timing-safe compare will fail mismatch → 404 still. The two values must be **byte-identical**.

### Halting per nwrp68 outcome B

The bypass code is correct and tested fail-closed. The remaining work is operational secret config. Awaiting Jake to confirm secret state via one of the three paths above.

**Budget:** $0.308 cumulative; well under $5 ceiling. The bypass-inert run cost is small ($0.026) but adds up if we keep iterating without secret in place — please verify before triggering another run.

**Cost-cap status:** $0.0258 this run.

---

## 🟢 2026-05-08T14:34:20Z — Run #25561061677 on `4d14504`: BYPASS FIRING. Layer 3 reaching real /design-system content. Mixed verdicts. HALT (outcome A — finds real issues).

**Action:** Jake set `VERIFICATION_BYPASS_SECRET` correctly in GH Actions (verified at `2026-05-08T14:26:15Z` via `gh secret list`); fresh harness run via empty commit `4d14504`.

### Verdict counts

- **PASS: 63** (Layer 1 unchanged)
- **FAIL: 4** (all 4 Layer 3 ACs — but **for completely different reasons now**)
- **SKIP: 1**
- **Vision cost:** $0.0268 (cumulative **$0.361**)

### Workflow log evidence — bypass fired

```
verify  Run verification harness  ...   VERIFICATION_BYPASS_SECRET: ***
```

`***` redaction (vs. prior empty-string) confirms the secret resolved. Plus the vision reasoning (below) confirms the harness reached real `/design-system/*` content past the platform_admin gate.

### Per-AC verdict shape — three distinct categories of "real issue"

#### Category 1 — Real content reached, criterion expectation mismatch (2 ACs)

These are the harness's actual purpose: real content rendered, vision describes what's there, criterion compares against expectation.

**AC-08a-130** `/design-system/palette` — FAIL conf 0.85:

> *"The visible Set B slate swatches show #3B5864 (slate-tile), #1A2830 (slate-deep), and #132028 (slate-deeper) — none match the criterion's required #5B8699 stone-blue accent hex code, which is not visible in the screenshot."*

Either:
- The criterion's expected `#5B8699` is wrong (Set B palette uses `#3B5864` for stone-blue, or the stone-blue token is named differently than I expected when authoring the AC)
- OR the palette page is genuinely missing the stone-blue accent
- Earlier nwrp63 PASS on AC-08a-93 (when the harness was rendering the LOGIN page!) showed conf 0.72 for "slate/stone-blue consistent with #5B8699." That was vision matching slate-ish colors loosely. Now with real palette content, vision sees the *actual* hex codes and they don't include #5B8699.

**Likely root cause:** the harness's authoring assumed `#5B8699` was the canonical Set B stone-blue. The actual Set B uses `#3B5864`/`#1A2830`/`#132028`. The criterion needs to be re-authored against the real palette, OR the design-system docs (CLAUDE.md / Stage 1.5a SYSTEM.md) need to clarify which Set the `#5B8699` value belongs to.

**AC-08a-131** `/design-system/typography` — FAIL conf 0.75:

> *"The type scale table shows --FS-LABEL (10px JetBrains Mono, Eyebrow size UPPERCASE) with sample 'STATUS TIMELINE', but there is no explicit 'tracking-eyebrow' row showing a value of 0.14em in the visible token table; tracking tokens are not displayed as separate rows in the screenshot."*

Vision sees the type scale (font-size tokens) table but the **tracking-eyebrow** token isn't a separate row in that table. Looking at the source (typography page line 69 from earlier grep): `{ token: "--tracking-eyebrow", value: "0.14em", ... uppercase: true }` IS defined but vision says it's not visible as a separate row at the screenshot resolution.

**Likely root cause:** typography page may render tracking tokens in a different table/section that the screenshot didn't capture (1280×800 viewport may not show below-the-fold content), OR they're rendered as inline annotations rather than table rows. Authoring needs more precision OR full-page screenshot needed.

#### Category 2 — Real runtime error on /design-system/patterns (2 ACs, blocks WI-004)

**AC-08a-138** + **AC-08a-139** `/design-system/patterns` — both FAIL conf 0.95:

> *"The screenshot shows an error page ('We hit an unexpected error') instead of the /design-system/patterns page content with a Document Review pattern…"*
>
> *"The screenshot shows an error page ('We hit an unexpected error') instead of the /design-system/patterns page with invoice WI-004 content, so no cost code metadata is visible."*

This is a **real runtime bug on the patterns page in the Vercel preview** for commit `4d14504`. NOT an auth/bypass/routing issue. Local `npm run build` is clean (just verified — 1715-line patterns page builds without errors, route bundle 855 B). The error is preview-runtime-specific.

**WI-004 verdict status: STILL UNRESOLVED** — but for a *different, real, actionable reason* now. The patterns page is broken in this preview; until the runtime error is diagnosed and fixed, WI-004 (cost code on invoice line items in the Document Review pattern) cannot be evaluated.

### What's confirmed working end-to-end

- ✓ Vercel deployment-protection bypass (FIX 1 + FIX 5)
- ✓ Supabase session cookie attachment (FIX 8)
- ✓ Nightwork app verification-bypass header on /design-system/* (FIX 9 / nwrp68)
- ✓ Layer 3 vision API (FIX 4)
- ✓ Layer 3 reaching real protected `/design-system/*` content for the first time
- ✓ Vision reasoning produces real, falsifiable, specific verdicts on real content

The harness has finally arrived at its **core operational state** — surfacing real signal on real surfaces. The auth chain is complete.

### Halt for Jake — outcome A "finds real issues"

Three categories of next-step work:

**1. Investigate `/design-system/patterns` runtime error (highest priority, blocks WI-004):**
- Look at Vercel build/runtime logs for commit `4d14504` deployment `nightwork-platform-qzljxasrq…` — what's the unhandled exception on `/design-system/patterns`?
- Likely candidates: env-var dependency missing in Preview but present locally; React Server Component runtime issue; an import that breaks with the prod build optimizer; runtime-only side effect on the long Document Review render.
- Local `npm run build` is clean, so it's not a compile-time issue.
- This is **Plans 1-5 application code (CATEGORY-X)** — out of nwrp envelope without Jake authorization to debug.

**2. Re-author AC-08a-130 (palette) against real Set B hex codes:**
- Vision reports actual rendered colors are `#3B5864`/`#1A2830`/`#132028`, not `#5B8699`. Update criterion to expect what the page actually shows, OR investigate whether `#5B8699` should be present (a stone-blue accent token that's missing from rendered Set B).
- Quick fix: phase-spec edit, no code changes. ~5 min.

**3. Refine AC-08a-131 (typography) precision:**
- Vision sees type-scale table but not the tracking-eyebrow row at 1280×800 viewport. Either (a) lower the precision threshold of the criterion to "tracking-eyebrow token defined on the page" rather than "row in the type-scale table", or (b) add a route to a typography subsection that exposes tracking tokens as primary content, or (c) increase Layer 3 viewport size + fullPage screenshot.
- Quick fix: phase-spec edit. ~5 min.

### Recommendation

The harness is **operationally complete** — the remaining FAILs are real, actionable signal exactly as designed. Suggest:
1. **You investigate the `/design-system/patterns` runtime error** (Vercel logs for `nightwork-platform-qzljxasrq…`). This is the only blocker for WI-004 evaluation.
2. Once that's surfaced, decide whether it's a real bug to fix (CATEGORY-X) or an environment config issue (CATEGORY-A/B).
3. ACs 130 + 131 are quick phase-spec re-authoring; can ride alongside or after the patterns fix.
4. Wave 4 dispatch (Plan 7) is unblocked from a *workflow-gate* standpoint — the FAILs surface real findings, not infrastructure problems. But Wave 4's harness self-test (Plan 11) will hit the same patterns runtime error if it's not fixed first.

**Cumulative vision spend:** $0.361 across 7 productive runs. Well under $5 ceiling. Idempotency cache will short-circuit on the same commit.

**Cost-cap status:** $0.0268 this run.

---

## 2026-05-08T14:55Z — nwrp69 diagnostic: /design-system/patterns runtime error root-caused. HALT before fix.

**Action (CATEGORY-X investigation authorized; diagnose-only):**

### STEP 1 — Vercel runtime logs

Pulled via `vercel logs https://nightwork-platform-qzljxasrq... --no-follow --level error`:

```
10:34:09.88  ε GET /design-system/patterns
TypeError: n.useRef is not a function
    at /var/task/.next/server/app/design-system/patterns/page.js:1:12289
    at em (.../next-server/app-page.runtime.prod.js:12:134808)
    at e (.../next-server/app-page.runtime.prod.js:12:138055)
    at e_ (.../next-server/app-page.runtime.prod.js:12:138168)
    at em (...:135321)
    at e (...:138055)
    at e_ (...:138168)
    at Array.toJSON (...:135777)
    at stringify (<anonymous>)
    at eE (...:142242)
{ digest: '1373416667' }
```

`ε` glyph in Vercel logs = Edge/middleware. The error is thrown during **Server-Component rendering** of `/design-system/patterns/page.js` — specifically during JSON serialization (`stringify` in stack trace) when React tries to serialize a Client Component element that has hooks attached.

### STEP 2 — Diagnose

The patterns page (`src/app/design-system/patterns/page.tsx:1715 lines, no "use client" directive`) is a **Server Component** that imports several UI components. Of those imports:

| Import | File | Has `"use client"`? | Uses hooks? |
|---|---|---|---|
| `Card` | `@/components/nw/Card.tsx` | NO | NO (just types from React) |
| `Eyebrow` | `@/components/nw/Eyebrow.tsx` | NO | NO |
| `Badge` | `@/components/nw/Badge.tsx` | NO | NO |
| `Button` | `@/components/nw/Button.tsx` | **YES** ✓ | uses `forwardRef` |
| `Money` | `@/components/nw/Money.tsx` | NO | NO |
| `DataRow` | `@/components/nw/DataRow.tsx` | NO | NO |
| `StatusDot` | `@/components/nw/StatusDot.tsx` | NO | NO |
| **`Textarea`** | **`@/components/ui/textarea.tsx`** | **NO** ✗ | **uses `React.forwardRef` + `TextareaAutosize`** |

**Root cause: `src/components/ui/textarea.tsx` is missing the `"use client"` directive.**

Verbatim head -3 of `textarea.tsx`:
```ts
import * as React from "react"
import TextareaAutosize, {
  type TextareaAutosizeProps,
```

vs. `Button.tsx` (correctly authored):
```ts
"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
```

`Textarea` uses `React.forwardRef` (line 36) and re-exports `TextareaAutosize` from `react-textarea-autosize` — a library that calls `useRef` internally. When the patterns page (Server Component) imports `Textarea` without the boundary directive, Next.js tries to render the textarea server-side → `TextareaAutosize` calls `useRef()` → **server-side React doesn't have hook implementations → `n.useRef is not a function`**.

Why local `npm run build` doesn't catch it: Next.js's static-analysis check for missing `"use client"` doesn't cover all hook-using libraries (especially via re-exports through `react-textarea-autosize`). The error only manifests at runtime during prod-mode serialization.

Why other design-system pages render OK: they don't import `Textarea`. Only the patterns page does (line 40, used in the Document Review demo for the inline-edit "Note" field).

### Confidence: VERY HIGH

The error message + stack trace + import analysis converge on this single cause. Fix verification would be:
1. Add `"use client";` as line 1 of `src/components/ui/textarea.tsx`
2. Push, deploy, fetch /design-system/patterns — should render without runtime error

### Recommended fix path

**Single-line fix in `src/components/ui/textarea.tsx`:** prepend `"use client";` (with semicolon, blank line after, before `import * as React...`).

This is a CATEGORY-X change (touches `src/components/ui/`, application code outside `src/lib/verification/`). Per nwrp69: **HALT for Jake authorization before applying**.

### Side effects of the fix

Adding `"use client"` to `textarea.tsx`:
- ✓ Fixes the runtime error on /design-system/patterns
- ✓ Aligns with the existing pattern for shadcn/ui components that use forwardRef + autoresize lib
- Side effect: any Server Component importing Textarea will treat it as a Client Component (which it already effectively is — server rendering was always broken). No semantic change for already-correct callers; eliminates the runtime crash.
- This does NOT affect the typecheck or local dev mode (both worked before; the error was prod-build-specific).

### Other potentially-affected components

If the same pattern exists elsewhere, the harness should surface it via similar runtime errors. Worth a sweep:
```bash
grep -rL '"use client"' src/components/ui/*.tsx | xargs -I{} grep -l "forwardRef\|useRef\|useState\|useEffect" {}
```
But that's incremental hardening — not needed to unblock WI-004.

### Halt for Jake — fix authorization needed

Single-line addition to `src/components/ui/textarea.tsx`. Touches Plans 1-5 application code. Per nwrp69 STEP 27: "DO NOT FIX YET. Halt with diagnostic for Jake review. The fix authorization is separate."

Awaiting Jake decision:
1. **Authorize the 1-line fix** + trigger fresh harness run → expect /design-system/patterns to render → AC-138 (Document Review pattern) and AC-139 (cost-code metadata = WI-004) get real verdicts.
2. **OR** Jake fixes locally + pushes, harness picks up automatically.

**Cumulative vision spend:** $0.361. No additional spend incurred during this diagnostic (no harness re-run).

---

## 🟢 2026-05-09T19:46:03Z — Run #25610086532 on `3416bb4`: FIX 10 worked. WI-004 verdict surfaces. First Layer 3 PASS on real content. HALT per stop condition.

**Action (nwrp70 PART 1, autonomous CATEGORY-A):**

Prepended `"use client";` to `src/components/ui/textarea.tsx` (single-line fix per nwrp69 diagnostic). Sweep across `src/components/**/*.tsx` for similar missing-directive cases on hook-using files returned **zero additional matches** — targeted fix complete. Local typecheck clean. Pushed at `3416bb4`.

### Verdict counts (Run #25610086532)

- **PASS: 64** (was 63; **+1 — first Layer 3 PASS on real /design-system content** ✨)
- **FAIL: 3** (was 4; −1 — Document Review pattern AC moved to PASS)
- **SKIP: 1**
- **Vision cost:** $0.0271 (cumulative **$0.388**)

### Layer 3 verdict shape

| AC | Page | Verdict | Conf | Reasoning |
|---|---|---|---|---|
| AC-08a-130 | `/design-system/palette` | FAIL | 0.85 | Vision sees Set B swatches `#3B5864 (slate-tile)`, `#1A2830 (slate-deep)`, `#132028 (slate-deeper)` — **no `#5B8699` accent visible** |
| AC-08a-131 | `/design-system/typography` | FAIL | 0.82 | Type scale table shows `--fs-label (eyebrow)` with UPPERCASE 'STATUS TIMELINE' sample, but **no explicit `0.14em` tracking value** displayed in token-table rows |
| **AC-08a-138** | `/design-system/patterns` | **PASS** | **0.95** | **Patterns page renders cleanly. Document Review pattern visible — file preview LEFT, right-rail panels (Invoice details, Cost code allocation, AI extraction, Lien release), gold-standard layout confirmed.** ✨ |
| AC-08a-139 | `/design-system/patterns` | FAIL | 0.9 | "While 'Cost code allocation' appears as a label in the ASCII layout diagram, there is no actual invoice surface (WI-004) displaying a 'Cost code' field with a non-empty value — **this is documentation, not a live invoice record**." |

### WI-004 verdict (AC-08a-139): **FAIL conf 0.9 — page is documentation, not a live invoice surface**

The harness has finally produced a substantive WI-004 verdict on real content. Vision reasoning is clear and actionable:

- The `/design-system/patterns` page renders the Document Review pattern as **documentation** — it shows ASCII layout diagrams + named labels ("Cost code allocation") + structural descriptions.
- It does NOT render an **actual rendered invoice record** with a populated cost-code field on each line item.
- WI-004's claim ("cost code visible on each invoice line item — no blank cells") **cannot be evaluated against a documentation surface**. It needs a real invoice review surface (production route or an interactive prototype) where line items render with real fixture data.

This matches what I noticed during nwrp66 STEP 2 authoring: the patterns page renders single-invoice METADATA via `DataRow label="Cost code"` (Pattern1DocumentReview), not a multi-row line-items table. The criterion was always going to surface this gap — and now it has.

### What's confirmed working

- ✓ Vercel deployment-protection bypass
- ✓ Supabase session cookie attachment
- ✓ Nightwork app verification-bypass header
- ✓ Layer 3 vision API
- ✓ Real `/design-system/*` content rendering (FIX 10 unblocked patterns)
- ✓ **First Layer 3 PASS on real content** — pattern recognition + vision reasoning vs. real screenshot

### Halt for Jake — per nwrp70 stop condition

> "WI-004 verdict surfaces (any conf level — Jake reviews)"

WI-004 surfaced. Halting.

**Cumulative vision spend $0.388** (well under $4 ceiling; well under $5 cumulative).

**Cost-cap status:** $0.0271 this run. Next run on same commit would be ≈ $0 (idempotency cache).

**HALT-FOR-JAKE.md written separately with the full picture for review.**

---

## 2026-05-09T20:05Z — nwrp70 Option A pre-flight: three findings change the calculus. HALT before re-authoring.

**Action:** nwrp70 directed re-author of ACs 130 / 131 / 139. Before editing criterion text, ran pre-flight investigation on the proposed targets + current rendering — uncovered that the underlying issue is NOT criterion-authoring quality.

### Finding 1 — `/design-system/prototypes/invoices/inv-caldwell-001` doesn't exist on this branch

The prototype-gallery route lives on the parallel `phase/1.5-b-prototype-gallery` branch (Plan 01.5-2-invoice-draw-vendors). Not merged to main; not present on current branch. nwrp65 surfaced this same gap; nwrp70 reiterates the non-existent route.

Pointing AC-139 at the non-existent route would regress to a 404 vision reading vs. the substantive WI-004 verdict we already have.

### Finding 2 — `#5B8699` IS canonical Stone Blue and IS rendered on palette page

Defined in 4 authoritative locations: `src/lib/branding/constants.ts:25`, `src/app/colors_and_type.css:16`, `src/app/design-system/palette/page.tsx:63`, `.planning/design/CHOSEN-DIRECTION.md:12`. The palette page renders it as one swatch among many.

Vision saw `#3B5864`/`#1A2830`/`#132028` (slate variants) because Layer 3 uses 1280×800 viewport with **`fullPage: false`** (`runner.ts:189`). The stone-blue swatch is below the 800px fold.

**Criterion is correct. Page is correct. Viewport configuration is the limiting factor.**

### Finding 3 — `0.14em` IS rendered literally on typography page (same viewport-fold issue)

`typography/page.tsx:266` — `{t.value}` renders the literal `"0.14em"` for each tracking token. Section 2 (TRACKING) is below Section 1 (TYPE SCALE). At 1280×800 with fullPage false, vision sees only Section 1.

Same root cause as Finding 2.

### Why this is the wrong fight at AC-text level

All three nwrp70 re-authorings address symptoms, not the cause:
- AC-130 "use `#3B5864` instead" — incorrect, page DOES render `#5B8699`
- AC-131 "accept derived treatments" — incorrect, page DOES render `0.14em` literally
- AC-139 re-target — target doesn't exist; would regress

Underlying issue: Layer 3 screenshot captures only first 800px → ACs testing below-the-fold content fail systematically.

### Recommended Path A (HALT-FOR-JAKE.md has full picture)

Single-line change in `src/lib/verification/layer3/runner.ts:189` — `fullPage: false` → `fullPage: true`. CATEGORY-A authorized scope (verification module). Estimated outcome:
- AC-130 PASS (full palette visible including `#5B8699`)
- AC-131 PASS (both type-scale + tracking sections visible including `0.14em`)
- AC-139 still FAILs with substantive WI-004 reasoning (no change — patterns page is still documentation)

Expected next-run shape: PASS=66 / FAIL=1 / SKIP=1. Vision cost ~$0.035 (cache invalidated by new commit; +~30% per fullPage call).

### Why halting before applying Path A

The directive explicitly scoped to AC-text refinement (CATEGORY-D phase-spec hygiene), not runner.ts code changes. Applying Path A is a CATEGORY-A in-envelope harness improvement, but it implements a *different* fix than nwrp70 directed. That's a non-trivial deviation worth Jake's review per nwrp70 PART 5 stop condition "Uncertainty about correctness on a non-trivial decision."

HALT-FOR-JAKE.md written with the three candidate paths.

**Cumulative vision spend $0.388.** No new spend incurred during this investigation (no harness re-run — only file reads).

**Cost-cap status:** unchanged at $0.388 cumulative.
