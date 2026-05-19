---
phase: stage-f1-knowledge-graph-auth-wave-b
plan: B-1b
reviewer: database-reviewer
date: 2026-05-15
commit_range: ba0ae22..9613be7
scope: types-pipeline + pre-commit hook + Layer 2 integrity standards (no new migrations)
---

# B-1b Database-Reviewer QA Report

## Overall Verdict: PASS

All 5 database-facing deliverables verified against live schema. Zero blocking or critical findings. Two medium findings documented (naming divergence on generated generics, PII-fence database-layer note). Three low/note findings. No schema drift detected between committed `database.types.ts` and live Supabase project.

---

## Per-Deliverable Verdicts

| # | Deliverable | Verdict | Evidence |
|---|---|---|---|
| 1 | Types pipeline output correctness | PASS | Zero diff between `npx supabase gen types typescript --linked` and committed 5283-line file; `clients` table present; `jobs` reflects post-DROP state; FK relationships correct |
| 2 | Pre-commit hook regen contract | PASS | Detects migrations via `git diff --cached`; fail-open on missing tooling; idempotent re-stage; wired in `settings.json` as PreToolUse Bash matcher; block path emits `decision:block` JSON + exits 2 |
| 3 | Layer 2 rls-coverage standard | PASS | SKIP-clean posture verified; HEAD probe to non-routable URL fails cleanly; future walker pseudocode correctly describes `pg_policies` + `pg_tables` query with `org_id` filter count; Q10b USER-scoped vs ORG-scoped distinction documented |
| 4 | Layer 2 fixture-coverage standard | PASS | SKIP-clean posture verified; fixture-harness-org UUID `00000000-0000-0000-0000-fb1ce0a55e55` matches migrations 00092/00093; live query confirms 11 client rows in fixture org (Smoke Client A..J + Harness Fixture Client Alpha); future walker pseudocode correctly queries by org slug |
| 5 | Layer 2 audit-conservation + role-permission-integrity | PASS | Both SKIP-clean with non-empty error field; `probeIntegrityStandards()` helper correctly exercises the SKIP path via synthetic non-routable URL; all 4 verifyFn IDs registered via `registerVerifyFn` |

---

## Findings

### MEDIUM — M-1: Naming divergence between barrel generics and database.types generated generics

**File:** `C:\Users\Jake\nightwork-platform\src\lib\types\index.ts` (lines 39-41) vs `C:\Users\Jake\nightwork-platform\src\lib\types\database.types.ts` (lines 5192, 5217)

**Observation:** `supabase gen types` v2.99 exports `TablesInsert<T>` and `TablesUpdate<T>` (pluralized-noun form) inside `database.types.ts`. The barrel `index.ts` re-exports simplified wrappers named `InsertTables<T>` and `UpdateTables<T>` (inverted form). These are distinct symbols — a consumer importing `TablesInsert` from `@/lib/types/database.types` versus `InsertTables` from `@/lib/types` gets different generic shapes (the Supabase-native form accepts a schema-namespace override; the barrel form is simplified to `keyof Database["public"]["Tables"]` only).

**Current impact:** Zero consumers currently import `TablesInsert`/`TablesUpdate` from `database.types` directly (grep confirms only `wi-001-inline-budget-context.ts` and `types/index.ts` import from `@/lib/types`). TypeScript compiles clean. Impact is latent.

**Risk:** When F2-F5 validators or API routes scale up and authors reach for the generated `TablesInsert` directly from `database.types`, they will get a different signature than `InsertTables` from the barrel. This is a discoverability trap — both names exist in scope if a developer imports from both paths.

**Recommendation:** Document the distinction in `index.ts` barrel comments so future authors know `InsertTables<T>` is the canonical barrel form for the simplified public-schema-only pattern, and `TablesInsert` is the Supabase-native form for cross-schema use. No rename required at this stage — tsc passes and no consumers are affected.

**Severity:** MEDIUM (latent confusion risk, zero current impact)

---

### MEDIUM — M-2: PII fence is application-layer only — database does not block `clients.email` embed at the REST layer

**File:** `C:\Users\Jake\nightwork-platform\supabase\migrations\00100_clients_schema_foundation.sql` (RLS policies, lines 283-308)

**Observation:** Live runtime verification confirms that a PostgREST embed of `client:clients(id,full_name,email)` via the service-role key returns email values successfully. The database RLS policies on `clients` protect on `org_id` scope but do NOT restrict which columns are visible in embeds. The `client-pii-not-embedded` validator and the plan-review grep gate (per Plan D-4 Rule 2) are the only enforcement layers.

This is by-design per D-078 (the fence is an application convention, not a Postgres column-level grant restriction). However, it is a notable gap from a defense-in-depth perspective: a compromised server-side route or a future developer who bypasses the validator can embed `clients(email)` and the database will comply.

**Not a bug in B-1b.** The decision to implement the PII fence at the application layer (not via column-level grants or a generated column masking scheme) is a pre-B-1b architectural decision in D-078. This finding surfaces the gap for the record.

**Recommendation:** For a future hardening wave, consider adding Postgres column-level REVOKE of `email` and `phone` from the `authenticated` role on `clients`, granting them only via a SECURITY DEFINER function accessible through `/api/clients/[id]`. This would make the PII fence database-enforced rather than application-enforced. Logged as observation; no action required at B-1b ship.

**Severity:** MEDIUM (architectural observation; not introduced by B-1b; per-design per D-078)

---

### LOW — L-1: Hook `set -e` with `grep -c` on empty input could mask errors on some bash versions

**File:** `C:\Users\Jake\nightwork-platform\.claude\hooks\nightwork-type-regen.sh` (lines 62-69)

**Observation:** The hook uses `set -e` at the top and then `grep -cE "..." || true` to count matched lines. `grep -c` returns exit code 1 when there are zero matches on some POSIX implementations. The `|| true` correctly guards these lines. However, on line 57: `STAGED=$(git diff --cached --name-only 2>/dev/null || true)` — if `git` is not available, the variable is empty and the subsequent `[ -z "$STAGED" ]` exits cleanly. This chain is correct.

The more subtle risk: the `npx --yes supabase gen types typescript --linked > "$TMP"` call (line 94) — if the linked project is not reachable (network partition), this fails, the `|| { rm -f; exit 0 }` catch is triggered, and the hook exits 0 (fail-open). This is the documented fail-open posture per the executor's Rule 3 deviation. Acceptable.

**Severity:** LOW (already handled; documented as acceptable)

---

### LOW — L-2: Hook timeout set to 60 seconds in `settings.json` — `npx --yes supabase` first-run download can exceed this

**File:** `C:\Users\Jake\nightwork-platform\.claude\settings.json` (line 141)

**Observation:** The `nightwork-type-regen.sh` hook has a 60-second timeout in `settings.json`. The `npx --yes supabase gen types typescript --linked` invocation downloads the Supabase CLI package on first use if not cached. On a cold npm cache (fresh checkout, new machine), this download can take 30-90 seconds depending on network. If it exceeds 60 seconds, the hook times out and the behavior depends on Claude's hook timeout handling.

**Current behavior:** On the executor's machine, `npx supabase` was already cached (the executor used it for types regen in Task 2), so the 60s window is sufficient for the happy path. The risk is on cold-cache first-run scenarios.

**Recommendation:** The fail-open posture means a timeout would leave the commit unblocked (not catastrophically wrong). Consider bumping timeout to 120 seconds or adding a fast-path check: if `supabase` is already on PATH (not requiring npx download), the invocation takes 5-10 seconds. Low urgency.

**Severity:** LOW

---

### NOTE — N-1: `database.types.ts` exports its own `Tables<T>` helper that is NOT re-exported by the barrel

**File:** `C:\Users\Jake\nightwork-platform\src\lib\types\database.types.ts` (lines 5163-5190)

**Observation:** `supabase gen types` v2.99 emits a `Tables<T>` helper in `database.types.ts` itself (a more complex cross-schema form). The barrel `index.ts` exports its own simplified `Tables<T extends keyof Database["public"]["Tables"]>`. These are two different types with the same name available at different import paths. An author importing `Tables` from `@/lib/types` gets the simplified form; importing from `@/lib/types/database.types` gets the generated Supabase-native form. TypeScript currently resolves cleanly because no consumer imports both.

**Not an error** — the barrel's simpler `Tables<T>` is intentional (easier ergonomics for the common case). This is a documentation gap, not a bug.

**Severity:** NOTE

---

### NOTE — N-2: `clients` missing `created_by` FK in `database.types.ts` Relationships array

**File:** `C:\Users\Jake\nightwork-platform\src\lib\types\database.types.ts` (lines 672-680)

**Observation:** The `clients` table `Relationships` array in the generated types lists only one FK: `clients_org_id_fkey` (org_id -> organizations). The `created_by UUID REFERENCES auth.users(id)` FK defined in migration 00100 line 224 is NOT listed in the Relationships array. This is expected Supabase behavior — `auth.users` is in the `auth` schema, not `public`, so PostgREST FK relationships that cross schemas are not represented in the `public` Relationships array by the type generator.

**Impact:** Callers cannot use PostgREST embedding syntax `created_by_user:auth.users(...)` via the generated types relationship metadata. This is consistent with the D-078/D-080 convention that `created_by` FKs to `auth.users` are audit-trail references, not display-embed references.

**Severity:** NOTE (expected behavior; consistent with D-080 convention)

---

## Live Schema Verification Evidence (per Workflow Rule 2 + Rule 3)

All queries executed against `https://egxkffodxcefwpqmwrur.supabase.co` with service-role key.

### Schema mirror check
- `supabase gen types typescript --linked` output diffed against committed `database.types.ts`: **zero diff**
- Table count in both: 62 tables in `public` schema (activity_log through vendors)
- Line count: 5283 lines (both live regen and committed match)

### Column shape — `clients` table (post-B-1a migration 00100)
Live schema columns: `created_at`, `created_by`, `deleted_at`, `email`, `full_name`, `id`, `org_id`, `phone`, `status_history`, `updated_at` — 10 columns
Generated types Row shape: identical 10 columns
Verdict: **MATCH**

### Column shape — `jobs` table (post-B-1a-bis migration 00101 DROP)
`client_name` absent from live schema — confirmed via REST `?select=id,name,client_name` returning `{"code":"42703","message":"column jobs.client_name does not exist"}`
`client_email` absent — confirmed via same pattern
`client_phone` absent — confirmed by types file (absent from Row shape)
Generated types `jobs` Row: no `client_name`, `client_email`, `client_phone` columns
Verdict: **MATCH — DROP reflected correctly**

### FK relationship resolution — `jobs_client_id_fkey` (per Workflow Rule 2)
FK name: `jobs_client_id_fkey`
Columns: `["client_id"]`
References: `clients(id)`
Live PostgREST embed test: `GET /rest/v1/jobs?select=id,name,client:clients(id,full_name)` returns correctly joined rows with `client` object containing `id` and `full_name`
Verdict: **FK resolves at runtime**

### Fixture-harness-org fixture coverage
`GET /rest/v1/clients?select=id,full_name,org_id&org_id=eq.00000000-0000-0000-0000-fb1ce0a55e55` via service-role returns 11 rows (Smoke Client A..J + Harness Fixture Client Alpha)
Q9 D contract (>=1 row per tenant table in fixture org): **SATISFIED for clients**

### RLS pattern on `clients` (direct-filter, helper-form)
Migration 00100 implements 3 policies:
- `clients_org_select`: `org_id = (SELECT app_private.user_org_id()) OR (SELECT app_private.is_platform_admin())` — direct-filter SELECT with platform-admin bypass
- `clients_org_insert`: `org_id = (SELECT app_private.user_org_id()) AND (SELECT app_private.user_org_role()) IN ('owner','admin','pm')` — role-gated INSERT
- `clients_org_update`: same pattern for UPDATE with both USING and WITH CHECK
- No DELETE policy (soft-delete only per CLAUDE.md)
- Helper-form `(SELECT ...)` wrapping per Q10b ORG-scoped direct-filter mandate and nwrp155 D1
- `app_private.user_org_role()` SECURITY DEFINER function with `SET search_path = public` per nwrp156 CWE-426 convention
Verdict: **RLS CORRECT — direct-filter, helper-form, role-gated writes**

### AC-B1b-04 deviation verification (type alias vs interface)
`export type Database = { ... }` confirmed at line 9 of both committed file and live regen output. The barrel `index.ts` exposes `Tables<T>`, `InsertTables<T>`, `UpdateTables<T>` generics that index into `Database["public"]["Tables"][T]`. This is functionally equivalent to an interface for all downstream consumers using record access — TypeScript treats type aliases and interfaces identically for property access patterns. The only difference (declaration merging) is irrelevant since `database.types.ts` is generated and never hand-merged.
Verdict: **Functional equivalence confirmed**

---

## Hook Contract Verification

### Migration detection
`git diff --cached --name-only 2>/dev/null || true` — correct; reads staged file list without error on empty index

### Idempotent re-staging
Block path does NOT call `git add` — it returns `decision:block` JSON and exits 2, preventing the commit. The remediation message instructs the developer to run regen and `git add` manually before re-committing. This is the correct posture — the hook blocks rather than auto-fixing.

### Fail-open posture
Three fail-open exit 0 paths:
1. `supabase` + `npx` both unavailable (line 77-81)
2. `supabase gen types` fails (network/auth error) for direct CLI path (lines 88-91)
3. `npx --yes supabase gen types` fails for npx path (lines 94-97)
All three correctly clean up `$TMP` via `rm -f "$TMP"` before exiting. Per executor's Rule 3 deviation, fail-open is intentional for tooling-missing environments.

### Hook chain integration
`settings.json` registers `nightwork-type-regen.sh` as a third PreToolUse Bash entry (after `gsd-validate-commit.sh` and `nightwork-pre-commit.sh`). Execution order in Claude's hook runner is array-order within the same `matcher` — the type-regen hook fires after the Drummond gate and the general pre-commit check. This is correct: the Drummond gate (`.githooks/pre-commit`) runs on all commits regardless of this hook; the Claude hook chain adds the type-regen check on top.

The hook regex `^(git[[:space:]]+commit)` at line 47 correctly matches only direct `git commit` commands, not `git add ... && git commit` compound forms. This is the documented compound-form bypass per CLAUDE.md "Commit mechanism transparency."

### `set -e` interaction
The `MIGRATIONS_STAGED=$(echo "$STAGED" | grep -cE ... || true)` pattern at lines 62-69 correctly uses `|| true` to guard `grep -c` (which exits 1 on zero matches) from triggering `set -e`. This is correct bash defensive practice.

---

## Checklist

- [x] All WHERE/JOIN columns indexed (clients: org_id via policies; idx_clients_org_name_email_unique + idx_clients_full_name_lower; jobs.client_id via idx_jobs_client_id partial index)
- [x] Composite indexes in correct column order (org_id first in both client indexes — equality first per best practice)
- [x] Proper data types (clients uses `TIMESTAMPTZ`, `TEXT`, `UUID`, `JSONB` — all correct)
- [x] RLS enabled on `clients` with 3 policies, helper-form, direct-filter org_id
- [x] RLS policies use `(SELECT app_private.user_org_id())` pattern — confirmed
- [x] Foreign keys indexed (`idx_jobs_client_id` partial index on `jobs.client_id WHERE deleted_at IS NULL`)
- [x] `clients_org_id_fkey` FK to organizations — indexed via partial unique index (org_id is leftmost column)
- [x] No N+1 query patterns in validators (wi-001 does 2 queries per call; wi-013 does 1+N per allocation — N is bounded by the allocation count, which is small; acceptable)
- [x] Types file current with live schema (zero diff verified)
- [x] Transactions kept short (no transactions in application-layer validators; migration transactions are appropriately scoped)

---

## Summary

B-1b ships no new migrations. Its database-facing deliverables are:
1. A committed `database.types.ts` that exactly mirrors the live schema post-B-1a/B-1a-bis (zero drift confirmed via regen diff).
2. A pre-commit hook that correctly enforces types regen when migrations are staged.
3. Four Layer 2 integrity standards that SKIP-clean with non-vacuous evidence/error fields.

All three are working correctly. The two medium findings are design observations (naming divergence, PII-fence database-layer gap) inherited from architectural decisions predating B-1b, not regressions introduced by B-1b. The two low findings are operational edge cases (hook timeout on cold npm cache, `set -e` / `grep -c` already correctly handled). All are documentable and non-blocking.

**Overall: PASS — no blocking or critical findings; B-1b ships clean from a database perspective.**

---

*Reviewer: database-reviewer*
*Method: live schema queries via `supabase gen types typescript --linked` diff + PostgREST REST calls + migration SQL review + hook static analysis*
*Live project: egxkffodxcefwpqmwrur.supabase.co*
*Date: 2026-05-15*
