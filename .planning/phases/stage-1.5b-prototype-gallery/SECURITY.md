# Security Review — Stage 1.5b Prototype Gallery

**Reviewer:** Security QA (Claude security-reviewer skill)
**Branch:** `phase/1.5-b-prototype-gallery` @ 78ae5ac
**Date:** 2026-05-04
**Phase:** stage-1.5b-prototype-gallery

---

## Overall Verdict: PASS (with one MEDIUM and one LOW requiring pre-merge acknowledgment)

No CRITICAL or HIGH findings introduced by this change set. No secrets or real credentials detected. No tenant-context leakage. Privacy gate is coherent across all four tiers. The two findings below are scoped-risk items, not blockers.

---

## Findings by Severity

### MEDIUM — M1: `xlsx` package introduces HIGH-severity CVEs with no fix available

**File:** `package.json` (new devDependency `"xlsx": "^0.18.5"`)
**CVEs:** GHSA-4r6h-8v6p-xvw6 (Prototype Pollution), GHSA-5pgg-2g8v-p4x9 (ReDoS)
**npm audit severity:** HIGH
**Fix available:** No — SheetJS `xlsx` has no patched version in the `^0.18.x` line.

**Context / Actual Risk:** `xlsx` is imported exclusively in `scripts/convert-xls-to-xlsx.ts`, which is a local-only developer utility. It is never imported from `src/`, never bundled into the Next.js application, never executed in CI or Vercel. The attack surface for both Prototype Pollution and ReDoS requires parsing attacker-controlled `.xls` input; the only inputs this script reads are Ross Built's own pay-app spreadsheets from a gitignored local directory. Real-world exploitability is negligible given the execution context.

**Recommendation:** Acknowledge this as an accepted local-tooling risk. Add an inline comment to `scripts/convert-xls-to-xlsx.ts` and to `package.json` noting that `xlsx` is devDep, local-only, and the CVEs are accepted. Consider replacing with `node-xlsx` (no active CVEs as of 2026-05) if the conversion script is ever repurposed for a CI step. This is not a blocker.

---

### LOW — L1: `<style jsx global>` in print prototype has session-wide CSS injection scope

**File:** `src/app/design-system/prototypes/draws/[id]/print/page.tsx` (lines 135–236)

**Context:** Next.js App Router with styled-jsx: a `<style jsx global>` block in a `"use client"` component injects styles into the document `<head>` while the component is mounted. The `.aia-*` class definitions (`.aia-bordered-block`, `.aia-print-root`, `.aia-g703`, etc.) and the `@page` rule apply globally to the DOM for the duration of the session on that page. They do NOT modify `globals.css`, and they are cleaned up when the component unmounts (styled-jsx lifecycle), so they do not pollute other routes once navigated away.

**Actual Risk:** Low. The `.aia-*` class names are unique and do not collide with any existing production class names (confirmed by scanning all `src/app/` routes outside the prototypes directory — zero collisions found). The `@page` rule only activates during `window.print()`. No security-sensitive data is disclosed by these styles. The risk is a minor display artifact if a user somehow manages to stay on the print page while also loading another page in the same tab (practically impossible in standard SPA navigation).

**Recommendation:** Document the styled-jsx global scope in a code comment (the existing comment at line 125–134 already explains this well). No code change required. If the print page is ever promoted from prototype to production, switch to a CSS Module with `:global()` for the `@page` rule and scope `.aia-*` classes under a `.print-scope` ancestor to make containment explicit.

---

### NOTE — N1: `Jake Ross`, `Ross Built Custom Homes`, and `305 67th St West, Bradenton FL 34209` hardcoded in print prototype

**File:** `src/app/design-system/prototypes/draws/[id]/print/page.tsx` (lines 344–345, 610–612)

**Context:** The G702 print preview hardcodes the contractor's name, title, and business address as static strings in the AIA signature block. These are public business registration details (Ross Built Custom Homes is a licensed Florida general contractor with publicly available address records). This is not private PII.

**Issue:** From a future-proofing and multi-tenancy standpoint, hardcoding the contractor identity in a prototype is acceptable (prototypes are not production code), but if this template is ever promoted to production, the values must be read from `org_settings` rather than hardcoded. This aligns with the CLAUDE.md Architecture Rule: "Org-configurable, not hardcoded."

**Recommendation:** No immediate action. Tag as tech debt when this prototype is promoted to production.

---

### NOTE — N2: `convert-xls-to-xlsx.ts` contains real Drummond pay-app filenames (accepted)

**File:** `scripts/convert-xls-to-xlsx.ts` (lines 23–25)

The `filesToConvert` array contains `"Drummond - Pay App 1 - March-July 2025.xls"` etc. These filenames include the real project surname. Per CONTEXT D-21 and D-28, the `scripts/` directory is an accepted leak surface (the sanitizer script itself must know the source filenames). The CI grep gate is intentionally scoped to `src/app/design-system/_fixtures/drummond/` only — `scripts/` is excluded by design. This is acknowledged and intentional.

**Action required:** None. Accepted per nwrp31 + CONTEXT D-21.

---

### NOTE — N3: Historical exposure at commit 37c5a92 (T-1.5b-W0-07) — acknowledged

Commit `37c5a92` (`docs(1.5b): plans + pattern map`) was made with `--no-verify`. The plan iteration 1 document included an inlined substitution map referencing real Drummond identifiers. This was acknowledged per nwrp31 Option A (redact-forward) and nwrp38. The substitution map was subsequently moved to the gitignored `.planning/fixtures/drummond/SUBSTITUTION-MAP.md` path.

**Residual risk:** The real vendor names are accessible in git history at `37c5a92` for anyone with access to this private repository. The repo is private (`github.com/jakeross838/nightwork-platform`). Mitigation options (interactive rebase to remove the commit, BFG Repo Cleaner) were evaluated and accepted as out-of-scope per nwrp38 due to the private-repo posture and the multi-PC sync risk of rewriting shared history. This is a permanent residual risk in the private repo's history, not a new finding.

---

## Privacy Posture Verification

| Check | Result | Detail |
|-------|--------|--------|
| 32-token denylist in CI workflow | PASS | 32 pipe-delimited entries confirmed |
| 32-token denylist in `.githooks/pre-commit` | PASS | 32 entries, identical pattern |
| 32-token denylist in `.claude/hooks/nightwork-pre-commit.sh` | PASS | 32 entries, identical pattern |
| 32-token denylist in `scripts/sanitize-drummond.ts` DENYLIST array | PASS | 32 entries confirmed |
| All four gates target identical scope (`src/app/design-system/_fixtures/drummond/`) | PASS | Confirmed consistent |
| `SUBSTITUTION-MAP.md` gitignored | PASS | Covered by `.gitignore:98` (`/.planning/*`) |
| `scripts/drummond-invoice-fields.json` gitignored | PASS | `.gitignore:87` explicit entry |
| No real Drummond identifiers in committed fixtures | PASS | `git grep` against all 32 tokens — zero hits |
| No real US phone numbers in committed fixtures | PASS | All phones are `(941) 555-xxxx` format (fictional) |
| No real email addresses in committed fixtures | PASS | All emails use `.example` TLD |
| All fixture IDs use `caldwell-*` prefix | PASS | `j-caldwell-1`, `v-caldwell-*`, `inv-caldwell-*`, etc. |
| `sanitize-drummond.ts` CI/Vercel guard | PASS | `process.env.CI === "true" || process.env.VERCEL === "1"` throws at startup |
| `sanitize-drummond.ts` gitignore hard-fail for invoice JSON | PASS | `git check-ignore -v` guard at startup |

---

## Hook Compliance Summary

| Hook | Status | Notes |
|------|--------|-------|
| `.githooks/pre-commit` Drummond gate | ACTIVE | Requires `git config core.hooksPath .githooks` per CLAUDE.md. Scoped to staged `src/app/design-system/_fixtures/drummond/`. |
| `.claude/hooks/nightwork-pre-commit.sh` Drummond gate | ACTIVE | Fires on Claude-initiated `git commit` via Bash tool. Same 32-token pattern. |
| `.github/workflows/drummond-grep-check.yml` | ACTIVE | Triggers on all PRs and pushes to `main`. Defense-in-depth final tier. |
| `nightwork-post-edit.sh` T10c (tenant-blind primitives) | PASSING | Confirmed zero imports from `@/lib/(supabase|org|auth)` in all 12 prototype routes and layout. |
| Manual commit bypass risk | ACKNOWLEDGED | `.githooks/pre-commit` closes the gap for manual commits. The `--no-verify` bypass path remains and is logged in commit messages per convention. |

---

## Tenant-Blind Primitive Enforcement (Hook T10c)

All 12 prototype routes and the `prototypes/layout.tsx` file contain zero imports from `@/lib/supabase`, `@/lib/org`, or `@/lib/auth`. Every `[id]` route performs a pure array `.find()` against the Caldwell fixture constants — no database access, no Supabase client instantiation, no `getCurrentMembership()` calls. All auth enforcement is handled by the existing `src/middleware.ts` design-system gate (platform_admin required in production, authenticated user required in development).

---

## New Attack Surface vs Wave 0 Baseline

| Surface | Present in Wave 0 | Added by 1.5b | Risk |
|---------|-------------------|---------------|------|
| 12 read-only prototype routes under `/design-system/prototypes/*` | No | Yes | Negligible — behind platform_admin middleware gate in prod; no DB queries; no user input |
| 12 static Caldwell fixture `.ts` files | No | Yes | Negligible — sanitized fictional data; no real PII; no server-side evaluation |
| `scripts/sanitize-drummond.ts` (local-only) | No | Yes | Negligible — CI/VERCEL guard prevents cloud execution; reads only gitignored local files |
| `scripts/convert-xls-to-xlsx.ts` (local-only) | No | Yes | Low — `xlsx` pkg has HIGH CVEs (M1 above); local-only execution; no production bundle inclusion |
| `.github/workflows/drummond-grep-check.yml` | No | Yes | Negligible — read-only grep; uses `actions/checkout@v4` (not SHA-pinned, standard for private repos) |
| `.githooks/pre-commit` | No | Yes | Negligible — local git hook; no network access |
| `<style jsx global>` in print prototype | No | Yes | Low — session-scoped CSS injection; no collision with production class names (L1 above) |

No new API routes, no new authentication flows, no new database access patterns, no new external service integrations introduced. The prototype gallery is entirely read-only, fixture-driven, and auth-gated.

---

## Dependency Audit Summary

Pre-existing HIGH vulnerabilities carried from `main` (not introduced by this branch):
- `@xmldom/xmldom <=0.8.12` — XML injection (HIGH) — fix available
- `next 9.3.4-canary.0 – 14.2.35` — multiple DoS vectors (HIGH) — fix requires breaking upgrade to Next 16
- `pdfjs-dist <=4.1.392` — arbitrary JS execution via malicious PDF (HIGH) — fix requires react-pdf breaking upgrade
- `tar <=7.5.10` — hardlink path traversal (HIGH) — fix available
- `glob 10.2.0-10.4.5` — CLI command injection (HIGH) — fix requires breaking upgrade

New HIGH vulnerability introduced by this branch:
- `xlsx ^0.18.5` — Prototype Pollution + ReDoS (HIGH) — no fix available — local-only tooling (M1 above)

---

## Conclusion

The Stage 1.5b prototype gallery change set introduces no CRITICAL or HIGH findings in production-reachable code. The only new security surface is the `xlsx` local-only devDependency with HIGH CVEs (M1), which is accepted risk given the execution context. The privacy gate is coherent, consistent across all four tiers, and confirmed passing against the 32-token denylist. Hook compliance is complete. The change set is cleared to merge with M1 acknowledged by the project owner.
