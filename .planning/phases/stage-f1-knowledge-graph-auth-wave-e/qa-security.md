---
phase: stage-f1-knowledge-graph-auth-wave-e
document: qa-security
reviewer: security-reviewer (claude-sonnet-4-6)
reviewed: 2026-05-14
scope: 4 source files + 3 scripts changed across 4 commits (5958df0..018052b)
verdict: PASS with OPEN items (none blocking ship of Wave-E as landed)
---

# Wave-E QA — Security Review

## Files reviewed

- `src/components/nav-bar.tsx` (E-2: +1 line `data-component="nav-bar"`)
- `src/components/job-sidebar.tsx` (E-2: +9/-3 — `data-component` + hover precursor cleanup)
- `src/app/jobs/[id]/page.tsx` (E-2: +22/-2 — `dataPmName` prop + `data-pm-name` attribute)
- `src/app/financials/bills/[id]/page.tsx` (E-3: +161/-24 — Supabase query + vendor null-guard)
- `scripts/fixtures/smoke-seed.sql` (E-2: +62/-9 — placeholder password + ON CONFLICT encrypted_password)
- `scripts/harness-auth-bootstrap.ts` (E-2: +64/-12 — --email arg + resolvePassword helper)
- `scripts/wave-d-smoke.ts` (E-2: +57/-17 — selector refactor)

---

## OWASP Top 10 Assessment

### A01 — Broken Access Control: PASS

**E-3 `bills/[id]/page.tsx`** — correctly implements defense-in-depth:
1. `getCurrentMembership()` called at the top; returns `notFound()` on null (line 63-64)
2. Query includes `.eq("org_id", membership.org_id)` (line 82) — explicit org filter independent of RLS
3. RLS is the backstop per CLAUDE.md rules; application-layer filter is primary
4. `.is("deleted_at", null)` soft-delete filter present (line 83)
5. `.maybeSingle()` returns null on not-found; explicit `notFound()` called rather than throwing

Cross-tenant isolation is structurally correct. A dropped RLS policy would not cause a leak because the explicit `org_id` filter in the query is not conditional.

**`job-sidebar.tsx`** — queries `jobs` with no explicit org_id filter in the changed code, but this relies on RLS (client-side component via Supabase anon client). This is a pre-existing posture unchanged by Wave-E; not a Wave-E regression.

### A02 — Cryptographic Failures: PASS

Password storage in `smoke-seed.sql` uses `crypt(v_password, gen_salt('bf'))` — bcrypt with auto-generated salt (lines 133, 147). Correct. The cleartext `v_password` lives only in the DO block's local PL/pgSQL variable during apply; it is never stored in the database.

Entropy: `crypto.randomUUID()` (orchestrator-side) = 122 bits. Overkill for synthetic fixture accounts. Correct.

### A03 — Injection: PASS

**SQL injection in E-3 `params.id`:** `params.id` is a Next.js dynamic route segment passed directly to `.eq("id", params.id)`. Supabase's PostgREST client parameterizes all equality filters — the value is not string-concatenated into SQL. No injection risk.

**Seed SQL placeholder substitution:** The orchestrator replaces `'__PLACEHOLDER_REPLACED_BY_ORCHESTRATOR__'` with a UUID. UUIDs consist only of hex characters and hyphens — no SQL special characters. The defensive SQL-escaping note in the seed header (`password.replace(/'/g, "''")`) is correct paranoia even though UUIDs cannot contain single quotes.

### A04 — Insecure Design: PASS (with residual item)

**Placeholder defense-in-depth:** The placeholder `'__PLACEHOLDER_REPLACED_BY_ORCHESTRATOR__'` is UUID-incompatible by shape. If someone accidentally runs `psql -f scripts/fixtures/smoke-seed.sql` without orchestrator substitution, the resulting bcrypt hash will not correspond to any guessable credential. This is correct defensive design.

**Smoke credentials file pattern:** `harness-auth-bootstrap.ts`'s `resolvePassword()` reads from a gitignored file. Malformed-line guard at line 101 (`if (credEmail === email && credPw)`) prevents use of `undefined` as a password. Error messages are actionable without leaking credential content (lines 103-106 throw with path + "Re-run the seed apply" message — no credential value in the error).

### A05 — Security Misconfiguration: PASS

No debug mode enabled. No default credentials introduced in production-facing code. The `data-component` and `data-pm-name` attributes added by E-2 are testing/invariant attributes on the nav and PM display — they expose no sensitive data (component identity string and PM full name, which is already visible in the UI).

### A06 — Vulnerable and Outdated Components: NOT REVIEWED

No `package.json` changes in this wave. Outside scope.

### A07 — Identification and Authentication Failures: PASS

No changes to auth flows. `harness-auth-bootstrap.ts` uses Playwright's real form-submit login pattern — no session injection, no cookie stuffing. The `resolvePassword()` function correctly separates the two credential sources (env var for fixture user, gitignored file for smoke users) with no fallback path between them.

### A08 — Software and Data Integrity Failures: PASS

No deserialization of untrusted data. `line_items` and `confidence_details` from the Supabase response in E-3 are cast with type assertions but are never executed or deserialized in a dangerous context.

### A09 — Security Logging and Monitoring: LOW (pre-existing)

**E-3 console.error at line 89:** `console.error("[bills/[id]] invoice query error:", error)` — the Supabase error object may contain query metadata. This is server-side (RSC) so it does not leak to the browser, but it may include the full query string in Supabase's error detail depending on the error type. This is a pre-existing pattern throughout the codebase and is LOW severity (server-only, no RLS bypass risk). The invoice ID logged at line 114-118 on null job embed is equally server-only. Wave-E does not make this worse.

### A10 — Server-Side Request Forgery: PASS

No SSRF vectors in changed files.

---

## Key Decision Validations

### D-079 — PII fence scope (vendor embed narrowing)

CONFIRMED CORRECT.

The E-3 page query embeds `vendors:vendor_id (id, name, address)` — intentionally narrower than the `/api/invoices/[id]` route handler's `(id, name, phone, email, address)`.

Page-side narrowing is correct defense-in-depth. The page only renders vendor identity (name) and location (address); vendor phone/email are not needed on this surface and are not fetched. D-079's B2B classification rationale applies to the API route; the page applies an additional conservative narrowing.

The page.tsx header comment (lines 26-35) documents the intentional divergence and the path for a future plan-author to widen it if needed (requires reviewing D-079 sole-proprietor edge case). The comment is sufficient.

**Sole-proprietor edge case (D-079 trigger (iii)):** The B2B classification holds at the TABLE level for Doug Naeher Drywall and Florida Sunshine Carpentry. The page surface never reaches vendor phone/email (narrowed embed). The API route surface exposes them, which is ratified by the nwrp145 Path C decision documented in `finding-1-reclassification.md`. The override audit trail is complete (see below).

### Override audit trail

CONFIRMED PRESENT AND COMPLETE.

`finding-1-reclassification.md` verified to exist at `.planning/qa-runs/wave-d/finding-1-reclassification.md`. Contains:
- Timestamp: 2026-05-14
- Authorization: nwrp145 — Jake explicit Path C decision
- Original FINDING-1 text reproduced
- 5-point rationale
- Explicit scope of what does NOT change (vendor RLS, other PII fences, TD-WD-06)
- 4 trigger conditions for re-evaluation
- SOC2 CC6.1 mapping
- Cross-references to D-079, Wave-E EXPANDED-SCOPE, E-1 PLAN.md

File is gitignored (confirmed: `.gitignore:107` via `git check-ignore`). D-079 in the tracked `MASTER-PLAN.md` carries the summary rationale, so the override is not orphaned on a fresh checkout.

### Multi-tenant posture (E-3)

CONFIRMED CORRECT.

Query at `bills/[id]/page.tsx` lines 68-84:
- `getCurrentMembership()` — no null escape path
- `.eq("id", params.id)` — scoped to the requested invoice
- `.eq("org_id", membership.org_id)` — explicit org isolation
- `.is("deleted_at", null)` — soft-delete filter
- `.maybeSingle()` — no throw on not-found

No hardcoded ORG_ID. No fallback. Compliant with CLAUDE.md development rule "Never hardcode an ORG_ID as a fallback."

### Password handling (smoke-seed.sql)

CONFIRMED CORRECT.

`v_password TEXT := '__PLACEHOLDER_REPLACED_BY_ORCHESTRATOR__'` at line 106 — placeholder present, not a real credential. Password hashed via `crypt(v_password, gen_salt('bf'))` at line 133 — bcrypt. `ON CONFLICT (id) DO UPDATE SET ... encrypted_password = EXCLUDED.encrypted_password` at line 147 — ITER-2-PATCHES §2.2 patch correctly applied; re-apply rotates the hash.

### Credentials file gitignore

CONFIRMED GITIGNORED.

`git check-ignore -v .planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt` returns `.gitignore:107`. The parent rule `/.planning/*` covers the entire qa-runs/ tree. The credentials file cannot be accidentally committed.

### Harness auth-state file gitignore

CONFIRMED GITIGNORED.

`/.planning/verification/auth/` is explicitly excluded at `.gitignore` (the auth/ block). `HARNESS_AUTH_STATE_PATH` resolves to `.planning/verification/auth/harness-auth-state.json`. Cannot be committed.

### No secrets in the diff (5958df0..018052b)

CONFIRMED CLEAN.

Scanned the full diff for hardcoded secrets, API keys, bearer tokens, and plaintext passwords. The diff references `SmokeSeed2026!` only in planning-document text (comments and plan bodies that describe the remediation of the old password). The current `scripts/fixtures/smoke-seed.sql` working tree does NOT contain `SmokeSeed2026!` (grep returns exit 1). No secrets in any of the 4 commits.

---

## Findings

### FINDING-E-1 [LOW] — `SmokeSeed2026!` persists in git object store

**Location:** `git show ec68df2:scripts/fixtures/smoke-seed.sql` line 65

**Detail:** Commit `ec68df2` (still reachable from `main` via git history) contains `v_password TEXT := 'SmokeSeed2026!'`. The corresponding 9 production accounts were deleted as part of FINDING-2 remediation (commit 5958df0). The current working tree is clean. The credential is unguessable at production because the accounts no longer exist, but it remains readable via `git log -p`.

**Risk:** LOW. The accounts are deleted. The credential scope was fixture-harness-org only (synthetic data, no real client records). If the repository's access model ever changes (vendor audit, open-source), the credential is discoverable.

**Status:** Pre-existing and known. Documented in PLAN-REVIEW-ITER1-security.md §5 FINDING-7. Not introduced by Wave-E; not remediated by Wave-E. A `git filter-repo` scrub would eliminate it if repository access expands. No action required for Wave-E ship.

### FINDING-E-2 [LOW] — `client_email` fetched in `job-sidebar.tsx` but only used for `mailto:` display

**Location:** `src/components/job-sidebar.tsx` lines 18, 107, 364-370

**Detail:** The sidebar query fetches `client_email` from `public.jobs`. This is customer PII (homeowner email). The field is only used to render a `mailto:` link for the "Email" action in the sidebar's selected-job detail panel. This is a pre-existing pattern, not introduced by Wave-E (E-2 only added `data-component` attributes and two hover-token fixes). The column is in the `jobs` table select list.

**Risk:** LOW. The data is legitimately accessed by authenticated org members. The pattern is consistent with the job sidebar's stated purpose (give PMs quick access to job details and client contact while on-site). TD-WD-06 covers the broader `SELECT *` concern at the job overview API endpoint; this sidebar case is narrower (specific column requested, client-side component only).

**Status:** Pre-existing. Not introduced or worsened by Wave-E. Acknowledged under TD-WD-06 scope tracking.

### FINDING-E-3 [LOW] — `harness-auth-bootstrap.ts` password not explicitly zeroed after use

**Location:** `scripts/harness-auth-bootstrap.ts` line 132 (`resolvePassword`) + lines 157-158 (`page.fill`)

**Detail:** The cleartext password string from `resolvePassword()` is held in the `password` variable through the Playwright login flow (lines 132-158). JavaScript has no guaranteed mechanism to zero a string's memory, so the credential may persist in the V8 heap until GC. This is a development/CI-only script and the credential is a synthetic fixture password, not a real user's credential.

**Risk:** LOW. Development/CI context only. Synthetic accounts. Standard JavaScript limitation; no practical exploit path for this use case.

**Status:** Informational. No action required.

### FINDING-E-4 [NOTE] — `console.error` in `bills/[id]/page.tsx` may include Supabase error object internals

**Location:** `src/app/financials/bills/[id]/page.tsx` line 89

**Detail:** `console.error("[bills/[id]] invoice query error:", error)` logs the raw Supabase error object. Depending on the error type, this may include internal Supabase detail strings (e.g., RLS policy names, column names). These appear only in server logs, not in browser responses. The user receives a 404 response.

**Risk:** NOTE. Server-only. Not a browser exposure. Consistent with the codebase's existing error-logging pattern. Future improvement: destructure `error.message` only.

**Status:** Informational.

---

## Acceptance Criteria Verification

| AC | Check | Result |
|----|-------|--------|
| E-3 uses `getCurrentMembership()` | `grep -n getCurrentMembership src/app/financials/bills/[id]/page.tsx` | PASS (line 63) |
| E-3 query filters by `org_id` | `grep -n "org_id" src/app/financials/bills/[id]/page.tsx` | PASS (line 82) |
| E-3 vendor embed is `(id, name, address)` — not `(phone, email)` | Reviewed source lines 77-79 | PASS — no phone/email in embed |
| Vendor null-guard uses `vendor_name_raw` fallback | `grep -n 'vendor_name_raw' src/app/financials/bills/[id]/page.tsx` | PASS (lines 39, 173) |
| Placeholder present in seed (not real password) | `grep -n PLACEHOLDER scripts/fixtures/smoke-seed.sql` | PASS (line 106) |
| `SmokeSeed2026!` absent from current working tree | `grep -rn SmokeSeed2026 scripts/` | PASS (exit 1, no matches) |
| `ON CONFLICT` rotates `encrypted_password` | `grep -n encrypted_password scripts/fixtures/smoke-seed.sql` | PASS (line 147) |
| Credentials file gitignored | `git check-ignore -v .../smoke-seed-credentials-DO-NOT-COMMIT.txt` | PASS (`.gitignore:107`) |
| Auth state file gitignored | `.gitignore` explicit `/.planning/verification/auth/` block | PASS |
| Override audit trail exists | Glob + Read | PASS — file present with full rationale |
| No hardcoded ORG_ID in E-3 | Read page.tsx | PASS |
| Password uses bcrypt | `grep -n gen_salt scripts/fixtures/smoke-seed.sql` | PASS (line 133) |
| No secrets in diff | Diff scan | PASS — no plaintext secrets |

---

## Open Items (Non-blocking for Wave-E)

| ID | Severity | Item | Target |
|----|----------|------|--------|
| FINDING-E-1 | LOW | `SmokeSeed2026!` in git history at `ec68df2` | Scrub if access model changes (git filter-repo) |
| FINDING-E-2 | LOW | `client_email` fetched in job-sidebar.tsx | Covered under TD-WD-06; Wave 1.1-Lite |
| FINDING-E-3 | LOW | Harness password not zeroed post-use | Scripts only; no action required |
| FINDING-E-4 | NOTE | console.error may log Supabase error internals | Server-only; future cleanup |
| FINDING-3 (pre-existing) | MEDIUM | `HARNESS_FIXTURE_PASSWORD` not rotated | Wave-B prerequisite #11 per ITER-2-PATCHES §4.1 |
| FINDING-4 (pre-existing) | MEDIUM | `SELECT *` on jobs returns `client_email`/`client_phone` | TD-WD-06 / Wave 1.1-Lite |
| FINDING-8 (pre-existing) | LOW | No staging layer before main | Wave-B prerequisite per nwrp136 |

---

## Overall Verdict

**PASS.**

Wave-E introduces no new BLOCKING, CRITICAL, or HIGH security issues. The 4 new source files are all below LOW severity in findings. The three BLOCKING patches from ITER-2-PATCHES (§2.1 placeholder mechanism, §2.2 ON CONFLICT encrypted_password, §3.1 vendor null-guard) are confirmed implemented correctly in the landed commits. The D-079 rationale is sound, the override audit trail is complete, and the multi-tenant posture on E-3 is correct.

Pre-existing MEDIUM items (FINDING-3, FINDING-4) remain open and correctly scoped to Wave-B and Wave 1.1-Lite respectively. The `SmokeSeed2026!` git history residual is LOW and documented.

Wave-E is clear to ship.
