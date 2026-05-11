# Security Review — stage-1.5c-verification-harness
**Date:** 2026-05-07
**Reviewer:** security-reviewer (Claude Sonnet 4.6)
**Branch:** phase/1.5-c-verification-harness
**Phase base:** 7607bbf
**Scope:** 8 surfaces per brief; 97 files changed, 92 commits ahead of main

---

## Verdict: CONDITIONAL PASS

No BLOCKING or CRITICAL findings. One WARNING and two NOTEs. All findings are
documented below with mitigations. The harness's security architecture is
well-structured: defense-in-depth at the bypass gate, fail-closed env-var reads,
timing-safe comparison, RLS-bound fixture session, prompt-injection blocklist +
defender system prompt, and correct env-var indirection in CI. The three
items below are real weaknesses, not noise.

---

## Summary Table

| Severity | Count |
|----------|-------|
| BLOCKING | 0 |
| CRITICAL | 0 |
| WARNING  | 1 |
| NOTE     | 2 |

---

## Findings

---

### WARNING-1 — NODE_ENV vs VERCEL_ENV mismatch in design-system gate (middleware.ts:179)

**File:** `src/middleware.ts`, line 179

**Issue:** `isVerificationBypass()` correctly checks `VERCEL_ENV !== "production"`
(line 75), blocking the bypass on all Vercel production deployments. However, the
`else` branch that falls through when `isVerificationBypass()` returns false uses
`NODE_ENV === "production"` (line 179) to decide whether to require `isPlatformAdmin`
or merely `user`. These are two different environment signals:

- `VERCEL_ENV` is set by Vercel's deployment runtime to `"production"` /
  `"preview"` / `"development"`.
- `NODE_ENV` is the Node.js build mode — always `"production"` in any optimized
  Next.js build, including preview deploys.

The result: on a Vercel **preview** deployment (where the bypass is designed to
work), `VERCEL_ENV === "preview"` but `NODE_ENV === "production"`. The non-bypass
path (`else` block, line 179) then evaluates `isProd = true` and enforces
`isPlatformAdmin`. This is the correct behavior for security (preview deployments
without the bypass header still require `isPlatformAdmin`), but the signal is
accidental — if Vercel changes its build behavior, the two environment variables
could diverge in the unsafe direction (e.g., a non-production build mode on a
production URL).

The bypass itself (the path taken when `isVerificationBypass()` returns `true`)
is correctly gated by `VERCEL_ENV !== "production"` and is unaffected by the
`NODE_ENV` inconsistency.

**Risk:** Low in current deployment posture; medium if the `NODE_ENV`-based gate
is ever relied upon in isolation.

**Recommended fix:** Replace `process.env.NODE_ENV === "production"` at line 179
with `process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"`
so the platform_admin gate fires on production by either signal, and the gate
never degrades to "authenticated user only" on a production deployment regardless
of which env var Vercel sets.

```typescript
// BEFORE (line 179):
const isProd = process.env.NODE_ENV === "production";

// AFTER:
const isProd =
  process.env.VERCEL_ENV === "production" ||
  process.env.NODE_ENV === "production";
```

---

### NOTE-1 — REPORT_BODY flows through `${{ steps.report.outputs.report_body }}` into `run:` via env (verify-phase.yml:445)

**File:** `.github/workflows/verify-phase.yml`, line 445

**Issue:** `REPORT_BODY` is populated from a multi-line step output that contains
the contents of `final.md` (up to 60,000 characters). It is then referenced in a
`run:` body through the `env:` block (`$REPORT_BODY` shell variable), which is the
correct pattern per SEC-HIGH-1. However, `final.md` is authored by `report-writer.ts`
whose sanitization contract is asserted by comment (Plan 5) but not verified in
this review's scope. If `report-writer.ts` ever includes unsanitized user-derived
content (e.g., raw criterion text from PLAN files that passed the criteria-loader
blocklist), that content would be embedded in the PR comment body via `gh pr comment`.

**Current mitigations:**
- Criteria-loader sanitizes criterion text before it reaches report-writer (blocklist
  + length cap).
- `final.md` content is placed in `$REPORT_BODY` via env-block (no shell
  interpretation of the content itself).
- `gh pr comment --body "$BODY"` passes the body as a command argument; shell
  expands `$BODY` but does not execute it.

**Risk:** Low. The env-block indirection neutralizes shell injection. The remaining
risk is GitHub Markdown injection in the PR comment body (e.g., a criterion text
containing `](javascript:` links). GitHub's PR comment renderer sanitizes Markdown,
so exploitation would require bypassing GitHub's own sanitizer.

**Action:** No code change required before ship. Add an explicit assertion to
Plan 10 (documentation) or Plan 9 (calibration log) that `report-writer.ts` strips
raw criterion text from committed reports (per iter-1 C5 — already referenced in
runner.ts comments but not in a testable contract).

---

### NOTE-2 — Harness auth cookie is httpOnly:false (\_browser.ts:201)

**File:** `src/lib/verification/_browser.ts`, line 201

**Issue:** `supabaseSessionCookies()` sets `httpOnly: false` on the injected
Supabase auth cookie. This matches the behavior of `@supabase/ssr`'s client-side
cookie storage (the Supabase JS client reads its own auth token from JavaScript),
but it means the access token is readable by any JavaScript executing in the
Playwright page context — including third-party scripts loaded by the app under
test.

**Why this is low severity in context:**
- The harness fixture user is org-admin in a fixture org containing only seeded
  test data. There is no real-tenant data at risk.
- The Playwright browser context is ephemeral and isolated to the harness run.
- The access token expires with the session (default Supabase TTL 1 hour).
- The fixture org UUID `00000000-0000-0000-0000-fb1ce0a55e55` is published in
  migration source; the session token is the only actual secret here, and it is
  transient.

**Risk:** Negligible for current harness-only usage. Would become a concern if
the `supabaseSessionCookies()` helper is reused in integration tests that run
against non-fixture environments.

**Action:** Add a code comment to `supabaseSessionCookies()` documenting the
`httpOnly: false` constraint (required by Supabase SSR client-side auth) and
explicitly scoping the helper to fixture-org / ephemeral test use only. No
behavioral change required.

---

## Verified-Clean Items

The following items were reviewed and found to be correctly implemented:

**1. isVerificationBypass() — all 4 defenses (middleware.ts:61-83)**
- Defense 1 (pathname): re-checked inside the helper regardless of caller (line 66). Correct.
- Defense 2 (secret length): `!secret || secret.length < 16` (line 71). Fails closed when unset. Correct.
- Defense 3 (VERCEL_ENV): `process.env.VERCEL_ENV === "production"` returns false (line 75). Correct. (The WARNING-1 above applies to the parallel non-bypass path, not this check.)
- Defense 4 (timing-safe): XOR loop on `charCodeAt(i)` with early-exit length check (lines 78-83). Correct. Note: the length check `provided.length !== secret.length` before the XOR loop leaks the secret length via a timing difference, but this is the standard constant-time pattern for string comparison and is acceptable — leaking the length of a 32-byte secret does not meaningfully aid brute force.
- Bypass does NOT apply to tenant-data routes: confirmed by pathname pre-check at line 66 and the caller's outer `if` at line 159.

**2. createHarnessSession() — defense-in-depth (auth-strategy.ts)**
- Uses anon-key client (NOT service-role): confirmed at line 123.
- `persistSession: false, autoRefreshToken: false`: correct for CI (line 124).
- Membership assertion against FIXTURE_ORG_UUID: present and throws loudly on mismatch (line 169).
- No platform_admin escape hatch: confirmed — no import of service-role client, no platform_admins table query anywhere in the file.
- Error messages do not expose the password value (only reports that it is missing or that sign-in failed).

**3. sanitizeCriterionText() — 6 patterns + length cap (criteria-loader.ts)**
All 6 patterns present and verified by name:
- `ignore-prior-instructions` (line 55): targets "ignore prior/previous/all/the instructions". Correct.
- `system-role-injection` (line 59): targets "system:". Correct.
- `override-instructions` (line 62): targets "override your/the/prior/previous instructions/prompt/directives". Correct.
- `json-shape-injection` (line 67): targets `{` or `}` followed by "verdict"/"confidence"/"reasoning" key. Correct.
- `backtick-fence` (line 70): targets triple-backtick. Correct.
- `nested-newlines` (line 71): targets blank lines within criterion text. Correct.
- Length cap at 200 chars (line 50): applied before pattern check; cannot be bypassed by inserting patterns after character 200 because the length check short-circuits first.
- Rejected criteria write to stderr with the filtered text (lines 173-176); they do NOT silently drop. Correct.

**4. _browser.ts — env-var reads fail closed**
- `vercelBypassHeaders()`: returns `{}` when `VERCEL_AUTOMATION_BYPASS_SECRET` is unset (line 47). Correct.
- `nightworkVerificationBypassHeaders()`: returns `{}` when `VERIFICATION_BYPASS_SECRET` is unset (line 83). Correct.
- Neither function logs the secret value. The secrets appear only in the returned header object, which is passed directly to Playwright's `extraHTTPHeaders`. Correct.

**5. vision-client.ts — redaction coverage (layer3/vision-client.ts)**
- `redactApiKey()` strips `sk-ant-[A-Za-z0-9_-]+` and `Bearer [A-Za-z0-9_-.=]+` (lines 107-108).
- Applied in: error thrown when non-JSON returned (line 224), error messages in JSON parse path (line 225), runner.ts catch block (line 259), Sentry `extra.error_redacted` (runner.ts line 308). Confirmed all stderr/Sentry paths apply redaction.
- Defender system prompt explicitly labels user-message text as untrusted (lines 71-95). Malformed criterion text returns FAIL rather than executing as instructions.
- Strict JSON schema: unexpected top-level keys throw halt-for-Jake (lines 237-243). Required keys checked (lines 244-250). Verdict must be "PASS"|"FAIL" (line 252). Confidence must be 0.0-1.0 (line 257). Reasoning max 500 chars (line 266). All correct.
- Suspicious-PASS detection: triggers when `verdict=PASS && confidence>0.99 && /\bPASS\b/i.test(criterion.text)` (lines 281-289). Correct logic.
- One coverage gap: `redactApiKey()` does not cover `HARNESS_FIXTURE_PASSWORD` or `VERCEL_AUTOMATION_BYPASS_SECRET` patterns. These are not API key formats, but if they ever appeared in a vision error context they would not be redacted. Accepted as low risk given the vision client only touches `ANTHROPIC_API_KEY`.

**6. verify-phase.yml — SEC-HIGH-1 compliance**
- All `${{ github.* }}` and `${{ inputs.* }}` flow through `env:` blocks. Verified by grep: no instance of `${{ ... }}` appears inline inside a `run:` body shell command.
- The one apparent exception (`name: verify-phase-${{ github.sha }}` at line 415) is in a `with:` YAML field for `upload-artifact`, not a shell `run:` body. YAML context expressions are not subject to shell injection. Correct.
- The `if: ${{ steps.harness.outputs.exit_code != '0' }}` at line 519 is a GitHub Actions expression evaluated in the YAML engine, not in a shell. Not a shell injection risk.
- BRANCH regex `^phase/[a-z0-9.-]+$` (line 123): rejects uppercase, spaces, semicolons, backticks, `$`, `|`, `&`, parentheses. Correct for shell injection prevention.
- INPUT_PHASE regex `^stage-[0-9.]+[a-z]?-[a-z0-9-]+$` (line 115): same class of restriction. Correct.
- INPUT_PREVIEW_URL regex `^https://[A-Za-z0-9.-]+(/[A-Za-z0-9._~/?#=-]*)?$` (line 263): blocks `$()`, backticks, semicolons, spaces. Correct.
- All 7 secrets referenced via `${{ secrets.X }}` only: ANTHROPIC_API_KEY, VERCEL_TOKEN, HARNESS_FIXTURE_PASSWORD, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, VERCEL_AUTOMATION_BYPASS_SECRET, VERIFICATION_BYPASS_SECRET. Confirmed.

**7. Migrations 00092 + 00093 — RLS posture**
- No `DROP POLICY`, `CREATE POLICY`, `ALTER TABLE ... ENABLE/DISABLE ROW LEVEL SECURITY`, or `GRANT` statements in either migration. RLS is unchanged.
- Both migrations use `ON CONFLICT DO NOTHING`: fully idempotent. Re-running is a no-op.
- Fixture user bound to single UUID `00000000-0000-0000-0000-fb1ce0a55e55` across both migrations. Consistent.
- No `platform_admins` table insert anywhere in either migration. Confirmed.
- `org_members` role is `'admin'` (fixture-org-scoped), not a platform-admin role. Correct.
- Migration 00093 is a corrective patch for the `profiles` row gap discovered post-00092; it makes no policy or permission changes beyond adding the missing `profiles` row.

---

## Actions Required Before Ship

| # | Severity | File | Action |
|---|----------|------|--------|
| 1 | WARNING  | `src/middleware.ts:179` | Replace `NODE_ENV === "production"` with dual-signal check `VERCEL_ENV === "production" \|\| NODE_ENV === "production"` to prevent accidental downgrade of design-system gate on future deployment configurations. |
| 2 | NOTE     | `src/lib/verification/_browser.ts:201` | Add comment documenting `httpOnly: false` constraint and scoping helper to fixture-org use only. No behavior change. |
| 3 | NOTE     | Plan 10 / Plan 9 scope | Add testable assertion that `report-writer.ts` strips raw criterion text from committed reports (iter-1 C5 contract). |
