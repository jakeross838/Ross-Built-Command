# Wave-D Security Review
# stage-f1-knowledge-graph-auth-wave-d
# Reviewer: Security subagent (claude-sonnet-4-6)
# Date: 2026-05-14
# Scope: 16 commits since 3e39427 (Wave-D: D-1 through D-5 + process docs)

---

## Verdict: WARNING

### Finding Count by Severity

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH     | 2 |
| MEDIUM   | 3 |
| LOW      | 3 |

---

## Top 3 Findings

### FINDING-1 [HIGH] — Vendor PII (phone + email) returned in invoice detail GET response

**File:** `src/app/api/invoices/[id]/route.ts` line 76  
**Pattern:** `vendors:vendor_id (id, name, phone, email, address)`

The invoice detail endpoint's main `SELECT` embeds the vendor row and explicitly pulls `phone` and `email`. These fields are returned to every authenticated org member who can view an invoice — PMs, accounting, and owner roles alike. There is no downstream filtering before `NextResponse.json({ ...invoice })` at line 153 spreads the entire invoice object (including the embedded vendor record) into the response.

**Risk:** vendor phone and email are business-PII. They are not required for invoice review workflow (the UI only needs vendor name and ID to render the review view). Leaking them unnecessarily widens the PII surface exposed to every authenticated session.

**Reproduction:** `GET /api/invoices/<any-invoice-id>` → inspect `vendors` key in JSON response → `phone` and `email` fields present.

**Fix:** Narrow the vendor select to display-safe fields only:
```
vendors:vendor_id (id, name, address)
```
If vendor contact info is needed on a separate surface (e.g. a vendor detail page), fetch it there behind an explicit admin/accounting role gate. PMs reviewing invoices do not need vendor phone or email.

**Note:** This pre-dates Wave-D. The D-1 refactor touched this file for the PostgREST hint fix only — the `vendors` embed was not in D-1 scope. Wave-D did not introduce this but also did not remediate it.

---

### FINDING-2 [HIGH] — Smoke harness ran against production (no preview/staging layer exists)

**Source:** nwrp136 (commit `4afda75`), calibration-log.md lines 253-255  
**Pattern:** "no preview/staging layer" — push-to-main deploys to production

The deployment architecture has no Vercel preview tier between code-merge and production. All 15 Wave-D commits — including migration `00098` and `smoke-seed.sql` (9 synthetic `auth.users` rows written directly to the production Supabase instance) — deployed to production without a smoke gate firing first. Rule 4 (smoke before /nightwork-qa) was designed to execute against a preview URL; in practice the smoke would execute against production or not at all.

**Specific consequence already realized:** `scripts/fixtures/smoke-seed.sql` was applied to production. This created 9 synthetic auth users (`smoke-pm-alpha@nightwork.local` through `smoke-accounting@nightwork.local`) with a weak seed password (`SmokeSeed2026!` visible in the SQL file at line 65) in the production Supabase `auth.users` table. These users are RLS-scoped to `fixture-harness-org` (UUID `00000000-0000-0000-0000-fb1ce0a55e55`) and cannot reach Ross Built data, but they represent unnecessary accounts with a known credential in production auth.

**Risk surface:**
- The 9 synthetic users can authenticate against the production Supabase URL.
- Their password (`SmokeSeed2026!`) is committed to the repository in plaintext.
- An attacker with read access to the repo (or the production Supabase auth table) knows the credential.
- The fixture-harness-org isolation is a Supabase RLS boundary — a policy misconfiguration or future RLS regression could expose production data.

**Recommended actions:**
1. Delete the 9 synthetic auth users from the production Supabase `auth.users` table (`smoke-*@nightwork.local`). The seed is idempotent (ON CONFLICT DO NOTHING) so deletion is clean.
2. Establish a staging/preview Vercel environment before Wave-B begins (nwrp136 prerequisite — already documented).
3. Apply `smoke-seed.sql` only to the staging/preview environment. Never to production.
4. Rotate the `HARNESS_FIXTURE_PASSWORD` for `harness-fixture@nightwork.local` as a precaution (see FINDING-5).

---

### FINDING-3 [MEDIUM] — HARNESS_FIXTURE_PASSWORD leaked in conversation transcript (nwrp139 near-miss; no rotation performed)

**Source:** Scope brief item 5 (nwrp139), calibration-log.md  
**Pattern:** Password exposed in conversation transcript via buggy bash `:- syntax`

The actual `HARNESS_FIXTURE_PASSWORD` value for `harness-fixture@nightwork.local` was echoed in a conversation transcript during Wave-D execution. The brief acknowledges this and notes "user decided not to rotate."

**Risk:** `harness-fixture@nightwork.local` is an `org-admin` role user in `fixture-harness-org`. While the fixture org contains only synthetic data (verified by reviewing `smoke-seed.sql` — all UUIDs follow the predictable synthetic pattern and no Drummond/Ross Built data is referenced), the admin role means a compromised session could:
- CREATE, UPDATE, DELETE synthetic fixture data within fixture-harness-org.
- If a future RLS misconfiguration occurs, an org-admin credential is the highest-value target for cross-tenant probing.

The password is stored as an environment variable (`HARNESS_FIXTURE_PASSWORD`) on the CI/Vercel deployment side. Conversation transcripts (Anthropic Claude sessions) are outside the repository's gitignore scope. If the transcript is in any log accessible to unauthorized parties, the credential is exposed.

**Recommended action:** Rotate `HARNESS_FIXTURE_PASSWORD` and update it in:
- `.env.local` on all development machines
- The Vercel environment variable (Preview + Production)
- The GitHub Actions workflow secret (`.github/workflows/verify-phase.yml`)

Cost of rotation is low. The risk of not rotating is credential compromise of a production auth account (even a synthetic one).

---

## All Findings

### [HIGH] FINDING-1 — Vendor PII phone/email in invoice detail response
*(See Top 3 above)*

### [HIGH] FINDING-2 — Smoke seed applied to production; synthetic accounts with committed password exist
*(See Top 3 above)*

### [MEDIUM] FINDING-3 — HARNESS_FIXTURE_PASSWORD leaked; no rotation performed
*(See Top 3 above)*

### [MEDIUM] FINDING-4 — `select("*")` on jobs table in job overview endpoint

**File:** `src/app/api/jobs/[id]/overview/route.ts` line 71  
**Pattern:** `supabase.from("jobs").select("*")`

The job overview endpoint fetches the entire `jobs` row with `SELECT *`. The jobs schema includes `client_email` and `client_phone` (confirmed in `src/app/api/jobs/route.ts` lines 43-44 and in CLAUDE.md). These fields are returned to every org member who can load the job overview page, including PMs who may not need client contact information.

**Risk:** Client phone and email are clearly PII. Returning them via `SELECT *` to all authenticated sessions — rather than only to admin/owner roles — violates least-privilege posture on PII.

**Fix:** Replace `select("*")` with an explicit field list that omits `client_email` and `client_phone` from PM-facing responses, or add a response transformation that strips those fields for non-admin/non-owner roles before returning the JSON.

**Note:** This pre-dates Wave-D. Wave-D's D-1 refactor added the `profile:profiles (id, full_name)` hint to this endpoint but did not change the jobs query. Worth tracking as a post-Wave-D cleanup item.

### [MEDIUM] FINDING-5 — `dangerouslySetInnerHTML` without DOMPurify on typography playground

**File:** `src/app/design-system/typography/page.tsx` line 512  
**Pattern:** `dangerouslySetInnerHTML={{ __html: b.reason }}`

The typography design-system page renders `b.reason` via `dangerouslySetInnerHTML` without DOMPurify sanitization. The `b.reason` values are hardcoded static strings in the file itself (e.g. `"Office-document association &mdash; wrong tonal register..."`), so there is no actual XSS vector — no user input reaches this render path.

**Verdict:** False positive for production code. However:
- This page is gated to `platform_admin` only via middleware (per CLAUDE.md "Site Office direction scope" + design system playground gating), which reduces exposure surface.
- The pattern is inconsistent with the two other `dangerouslySetInnerHTML` usages in the codebase (`invoice-file-preview.tsx` line 263 and `invoice-upload-content.tsx` line 152) which both apply `DOMPurify.sanitize()`. Code reviewers reading this file in the future may not notice it lacks sanitization and may add a dynamic `b.reason` source.

**Recommendation:** Add a comment noting the source is static-only, or add a no-op `DOMPurify.sanitize()` for pattern consistency. If this surface is ever made dynamic, XSS risk would be introduced without a visible guard.

### [LOW] FINDING-6 — `--no-verify` used on D-1 first commit (nwrp133 near-miss); reverted before push

**Source:** Scope brief item 4 (nwrp133), D-4-rules-and-playwright-SUMMARY.md  
**Pattern:** SHA `8af4aa6` committed locally with `--no-verify`, then reset to `7b26ddd` before push

The near-miss was caught and remediated before origin/main was affected. The D-4 `CLAUDE.md` edit (commit `b4e4dc4`) added explicit commit-mechanism transparency to the Development Rules distinguishing compound-form commits from `--no-verify` flag usage.

**Verdict:** Resolved. No action needed on origin/main. Documented here for completeness per scope brief item 4.

### [LOW] FINDING-7 — `SmokeSeed2026!` password committed in plaintext to scripts/fixtures/smoke-seed.sql

**File:** `scripts/fixtures/smoke-seed.sql` line 65  
**Pattern:** `v_password TEXT := 'SmokeSeed2026!';`

The 9 synthetic smoke users are seeded with a static, committed plaintext password. This password is intentionally hardcoded (the comment says "synthetic; never used at runtime"), but as established in FINDING-2, the seed was applied to production. An attacker with repo read access now knows the production password for `smoke-pm-alpha@nightwork.local` through `smoke-accounting@nightwork.local`.

**Fix:** After deleting the 9 synthetic accounts from production (FINDING-2 remediation), replace the hardcoded password with a random uuid or a constant that generates a new salt each seed run (e.g. `crypt(gen_random_uuid()::text, gen_salt('bf'))`). This ensures seeded accounts, even in staging, cannot be authenticated with a known credential.

### [LOW] FINDING-8 — Deployment architecture gap (no staging layer) documented but not yet remediated

**Source:** nwrp136, commit `4afda75`, calibration-log.md  
**Pattern:** push-to-main = immediate production deployment; Wave-B prerequisite identified but not yet resolved

This is already documented as a Wave-B prerequisite in the calibration log. It is listed here because it is a systemic process security gap — not merely a workflow gap. Without a staging layer, every Wave-B migration (including the D-078 full standardization work) will deploy to production before smoke can fire. For the 9 foundational schema plans in Wave-B, this means schema migrations reach production users before behavioral verification.

**No additional action needed beyond the nwrp136 documented prerequisite** (establish Vercel preview tier before Wave-B execution begins).

---

## Detailed Area Reviews

### Migration 00098 Safety

**Pre-flight DO block:** Present and correct. The RAISE EXCEPTION on orphan `user_id` values is a fail-loud guard that will abort the transaction before adding the constraint. The pattern mirrors 00096 HF-A4-2 and 00097 HF-C1-2. PASS.

**ON DELETE NO ACTION semantics:** Correct per D-078 rationale. The auth.users CASCADE (00016:96) handles the deletion chain; this FK serves as a defensive guard against hand-crafted profile deletions that bypass auth.users. The logic is sound: both child rows (profiles + org_members) go away together via the CASCADE from auth.users; the NO ACTION FK on profiles would only trigger if someone attempted to delete a profile row independently without deleting the auth.users row first — which is the dangerous case it guards against. PASS.

**NOTIFY pgrst:** Present at line 132. Belt-and-suspenders cache reload per ITER-2-PATCHES.md §1.1 decision 8. PASS.

**PII fence at 9 PostgREST hint sites:** All 9 sites use `profile:profiles (id, full_name)` — verified by grep. No site requests `email`, `phone`, or any PII field via the profiles join. The `full_name` field is display-necessary (PM dropdown labels). PASS.

**Down migration:** Single `DROP CONSTRAINT IF EXISTS` — idempotent and safe. Warning in the file about re-verting src changes is appropriate. PASS.

### smoke-seed.sql Data Safety

**No real Ross Built data:** Confirmed. All UUIDs follow the synthetic namespace convention (`22222222-*` for jobs, `33333333-*` for invoices, `44444444-*` for activity log, `00000000-0000-0000-0002-*` for users). No Drummond/SmartShield/real-vendor UUIDs present. PASS.

**Fixture-harness-org reuse:** Correct. The seed reuses UUID `00000000-0000-0000-0000-fb1ce0a55e55` from migrations 00092/00093 rather than creating a parallel org that would collide on email uniqueness. PASS.

**Idempotency:** ON CONFLICT DO NOTHING on all inserts. PASS.

**Known issue:** `SmokeSeed2026!` hardcoded password — see FINDING-7.

### wave-d-smoke.ts Auth Flow

**Fixture user permissions:** `harness-fixture@nightwork.local` is org-admin in fixture-harness-org, NOT platform_admin. This matches the single-auth-path posture (per D-30). The harness cannot reach platform_admin-gated routes or cross-org data. PASS.

**storageState file path:** `HARNESS_AUTH_STATE_PATH` resolves to `.planning/verification/auth/harness-auth-state.json`. This path is gitignored by the `.gitignore` rule at lines 172-173 (`.planning/verification/auth/` and `.planning/verification/auth/**`). The file is never committed. PASS.

**Console output redaction:** `redactConsole()` at line 296 strips `sk-ant-*` API keys and `Bearer` tokens from captured browser console output before writing to the JSON results file. PASS.

**Missing bypass secret WARN:** The script issues loud warnings when `VERCEL_AUTOMATION_BYPASS_SECRET` or `VERIFICATION_BYPASS_SECRET` are not set, but does not abort. This is intentional per iter-2 §4.12. The warning correctly notes the false-PASS risk (Vercel SSO wall returning HTTP 200). PASS.

**URL validation:** `--preview-url` is validated against `/^https:\/\/[A-Za-z0-9.-]+/` regex before use. No SSRF risk — the URL is only used to construct browser navigation targets, not raw fetch calls. PASS.

### API Route Auth

All four Wave-D-touched API routes (`dashboard/route.ts`, `jobs/health/route.ts`, `invoices/[id]/route.ts`, `jobs/[id]/overview/route.ts`) call `getMembershipFromRequest(req) ?? await getCurrentMembership()` as the first operation, and throw `ApiError("Not authenticated", 401)` on failure. All filter DB queries by `membership.org_id`. No route is missing the auth check. PASS.

### SQL Injection

All queries use the Supabase JS client's parameterized query builder (`supabase.from(...).select(...).eq(...)`). No raw SQL string concatenation found in Wave-D-modified files. User-supplied `params.id` values are passed as parameters to `.eq("id", params.id)` — not interpolated into query strings. PASS.

### XSS

**DOMPurify usage:** Both `invoice-file-preview.tsx` and `invoice-upload-content.tsx` apply `DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })` before `dangerouslySetInnerHTML`. These are the only paths where untrusted (vendor-supplied DOCX/Mammoth output) content reaches innerHTML. PASS.

**Typography playground:** `dangerouslySetInnerHTML` on static strings only — see FINDING-5 (LOW).

**Wave-D UI changes:** The AppShell removal (D-2) and design-token fixes are structural/class changes — no new template literals or dynamic string construction introduced that would create XSS surfaces. PASS.

### Branding Components

`Wordmark.tsx` and `Icon.tsx` are pure SVG components accepting `size`, `color`, and `className` props. No user input is rendered into SVG content. The `data-slot="org-logo"` attribute added by D-4 is a static string. PASS.

### InvoiceReviewView.tsx

Prototype-only component. Accepts pre-resolved fixture data via typed props (`CaldwellInvoice`, typed as fixture type). No user input flows through this component. The `data-pattern-slot` attributes added by D-4 are static strings. PASS.

---

## PII / RLS / Migration Summary

| Check | Status | Notes |
|-------|--------|-------|
| Migration 00098 pre-flight DO block | PASS | Orphan check raises on mismatch |
| Migration ON DELETE NO ACTION rationale | PASS | Correct semantics per D-078 |
| NOTIFY pgrst cache reload | PASS | Belt-and-suspenders per ITER-2-PATCHES §1.1 |
| 9 PostgREST hint sites — PII fence | PASS | Only `id, full_name` embedded |
| smoke-seed.sql — no real data | PASS | Synthetic UUIDs only |
| smoke-seed.sql — idempotency | PASS | ON CONFLICT DO NOTHING throughout |
| smoke-seed.sql — production application | FAIL | Applied to prod; 9 synthetic accounts exist with committed password |
| storageState gitignored | PASS | `.planning/verification/auth/**` gitignored |
| HARNESS_FIXTURE_PASSWORD not in code | PASS | env var only; never hardcoded in src |
| HARNESS_FIXTURE_PASSWORD not leaked to git | PASS | Transcript leak only (nwrp139); not in any tracked file |
| Vendor PII in invoice GET response | FAIL | `phone` + `email` returned; see FINDING-1 |
| Client PII in job overview response | FAIL | `SELECT *` returns `client_email`/`client_phone`; see FINDING-4 |
| API routes — auth check present | PASS | All 4 Wave-D routes check membership first |
| API routes — org_id filter on queries | PASS | All queries filter by membership.org_id |
| SQL injection | PASS | Parameterized queries throughout |
| XSS — DOMPurify on untrusted HTML | PASS | Both DOCX preview paths sanitized |
| --no-verify on origin/main | PASS | Near-miss (8af4aa6) reset before push |
