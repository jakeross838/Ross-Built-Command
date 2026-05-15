# Plan Review Iter-1 — Security Review
# Wave-B-Slice-1: B-D080 + B-1a + B-1a-bis + B-1b

**Reviewer:** security-reviewer
**Reviewed:** 2026-05-15
**Plans in scope:** B-D080, B-1a, B-1a-bis, B-1b (4 plans per nwrp154 Path A slice growth)
**Inputs:** EXPANDED-SCOPE.md, all 4 PLAN.md files, MASTER-PLAN.md §10 D-078/D-079/D-080, CLAUDE.md

---

## Verdict

**PASS WITH CONDITIONS** — No BLOCKING issues. One CRITICAL (AC gap on a fence pattern ambiguity), three HIGH findings (probe-SQL disclosure path, RLS insert gap, hook secret-presence check), three MEDIUM, two LOW. All identified issues are plan-level gaps or design clarifications, not ship-stopping defects in the authored migration body. Conditions (marked HIGH+) must be resolved before execute.

---

## Findings by Severity

---

### CRITICAL

#### CRIT-1 — `client-pii-not-embedded` validator regex does not cover all embed alias forms; false-negative risk

**Plan:** B-1b (§7.4 `client-pii-not-embedded.ts`)
**Rule reference:** D-078 + Q1 nwrp153 + Plan D-4 Rule 2 grep gate

**Finding:**

The validator ships four regex patterns:
```
WILDCARD_PATTERN  = /\bclients?\s*\(\s*\*\s*\)/g
EMAIL_PATTERN     = /\bclients?\s*\([^)]*\bemail\b[^)]*\)/g
PHONE_PATTERN     = /\bclients?\s*\([^)]*\bphone\b[^)]*\)/g
ALIAS_WILDCARD    = /:\s*clients?\s*\(\s*\*\s*\)/g
```

These patterns have a gap: they only match `clients` or `client` as the table name token directly before `(`. A PostgREST embed aliased as `homeowner:clients(id,email)` or `owner:clients(id,phone)` is NOT caught by `EMAIL_PATTERN` or `PHONE_PATTERN` because those patterns anchor on `\bclients?\s*\(` without allowing a preceding alias token (they require the token to immediately precede `(`).

Test case that the plan's own unit-test sketch does NOT cover:

```
"id,homeowner:clients(id,name,email)"
```

Under the current regex, `EMAIL_PATTERN` would not match because the literal `clients?(` is not immediately preceded by a word boundary — it is preceded by the alias `:`. `ALIAS_WILDCARD` only guards the `(*)` form, not the `(id,email)` form.

**Contrast with the plan-review grep gate** (B-1a §6 + B-1a-bis §5.2):
```bash
grep -rE "client:clients\([^)]*(\bemail\b|\bphone\b)" src/ scripts/
```
This pattern also only catches the `client:` prefix, not arbitrary alias prefixes like `homeowner:` or `owner:`.

**Impact:** If a future developer writes `homeowner:clients(id, name, email)` in a PostgREST select string, neither the B-1a-bis grep gate nor the runtime validator catches it. The PII fence has a class of false-negatives for non-`client:`-prefixed aliases.

**Required fix:** Extend both the validator regexes AND the plan-review grep gate to match the general `<alias>:clients(...)` form:
```
# General alias form catching email/phone regardless of alias prefix
grep -rE ":\s*clients\s*\([^)]*(\bemail\b|\bphone\b)" src/ scripts/
```
And update `EMAIL_PATTERN` and `PHONE_PATTERN` in the validator to:
```typescript
const EMAIL_PATTERN = /(?:\w+\s*:\s*)?clients?\s*\([^)]*\bemail\b[^)]*\)/g;
const PHONE_PATTERN = /(?:\w+\s*:\s*)?clients?\s*\([^)]*\bphone\b[^)]*\)/g;
```
Add a unit test:
- Test 6: `"id,homeowner:clients(id,name,email)"` → ok=false, code `client-pii-embed-detected`

**Severity rationale:** CRITICAL because the PII fence is the load-bearing SOC2 PI1.1 control for homeowner contact data, and the validator is advertised as the programmatic enforcement surface that hardens the plan-review grep gate. A structural false-negative in both layers simultaneously is a CRITICAL gap.

---

### HIGH

#### HIGH-1 — B-D080 orphan probe SQL returns COUNT(*) integers; executor stdout may interleave with supabase MCP output in ways that expose UUID prefixes in error messages

**Plan:** B-D080 (§threat_model T-BD080-02, Task 1 probe SQL)
**Rule reference:** CLAUDE.md secret-presence discipline (nwrp139)

**Finding:**

The plan's threat-model notes: "Probe SQL returns COUNT(*) integers only — never row values or UUIDs. Plan-author-time probe ran via PostgREST select (UUID values held in JS Set; logged only as counts + first-8-char-prefix samples when count > 0)."

The parenthetical "first-8-char-prefix samples when count > 0" is the concern. If any of the 11 columns has an orphan count > 0 at execute time, the planned HALT path from the DO $$ block (inside migration 00099.sql) raises:

```
RAISE EXCEPTION 'Pre-flight: orphan FK values detected: change_orders.created_by=%, ...'
```

This RAISE EXCEPTION carries only integer counts per the plan (PASS — no UUID leakage in DB-side RAISE). However, the pre-execute probe SQL in Task 1 runs as a plain SELECT UNION ALL. If an executor agent or logging framework formats that probe result into the conversation transcript, the probe output is COUNT-integers-only (PASS).

The risk is the phrase "first-8-char-prefix samples when count > 0" in the threat model. This implies a PATH-AUTHOR-TIME probe variant (not the migration's DO $$ block) that DID log UUID prefix samples. Per CLAUDE.md nwrp139 pattern:

> Bash secret-presence checks MUST use explicit `if [ -n ... ]` — never the `:-` fallback operator.

The same class of discipline applies to probe SQL: **if a probe produces UUID values in its result set, the executor must never log those values to conversation transcript.** The plan's stated posture for execute-time is COUNT-only (PASS). But the plan does not explicitly forbid a UUID-surfacing fallback if the executor improvises on a probe failure.

**Required clarification:** Add an explicit executor instruction in B-D080 Task 1: "If probe output contains any non-integer column value (UUID, text, etc.), HALT immediately and report the column name and orphan_count only — never paste UUID values into the conversation." This closes the nwrp139-class risk at the plan level.

**Severity:** HIGH because it concerns audit-column UUIDs (user-identity data) potentially leaking to conversation transcript. The current wording is "likely safe" but has an under-specified exception path.

---

#### HIGH-2 — B-1a `clients_org_insert` RLS policy allows `pm` and `accounting` roles to create client records; no justification for accounting-write access

**Plan:** B-1a (§6 migration body, clients_org_insert policy)
**Rule reference:** CLAUDE.md "Least Privilege" + Architecture Rule "Every record created by getCurrentMembership()"

**Finding:**

The B-1a migration (§6 migration body sketch) defines:
```sql
CREATE POLICY clients_org_insert
  ON public.clients
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.org_members
       WHERE user_id = auth.uid() AND is_active = true
         AND role IN ('owner', 'admin', 'pm', 'accounting')
    )
  );
```

The `accounting` role is granted INSERT access on `clients`. Per CLAUDE.md's team/roles section, Diane (accounting) handles invoice intake, QA review, QB push, and draw compilation. She has no documented business need to CREATE new homeowner client records.

Client record creation is a PM/admin function (new job onboarding — OnboardWizard + `/api/jobs/new` per B-1a-bis §4 row 6). Granting `accounting` INSERT on `clients` violates the Principle of Least Privilege.

This is particularly relevant because B-1a-bis refactors `/api/jobs` to accept `client_name_for_create` for a server-side find-or-create within `membership.org_id` — but that path is API-layer (goes through `getCurrentMembership()` role check). The RLS INSERT policy is a direct-PostgREST-access gate that bypasses the application layer.

**Required fix:** Remove `accounting` from `clients_org_insert` policy:
```sql
AND role IN ('owner', 'admin', 'pm')
```
If accounting legitimately needs to associate a client with a job during invoice QA, that path should go through the `/api/clients` endpoint (gated by application-layer role checks) rather than direct INSERT via PostgREST.

**Update policy for UPDATE too:** `clients_org_update` also grants `accounting` write access. Same analysis applies — accounting should read clients (for invoice context) but not modify homeowner identity records.

**Severity:** HIGH because the over-provisioned RLS INSERT policy is a direct privilege-escalation path for the accounting role on PII-classified data.

---

#### HIGH-3 — B-1b type-regen hook uses `--no-verify` as a silent pass-through rather than a HALT point

**Plan:** B-1b (§9 pre-commit hook sketch, line "Allow --no-verify")
**Rule reference:** CLAUDE.md "Never `--no-verify` without Jake's explicit authorization"

**Finding:**

The `nightwork-type-regen.sh` hook sketch contains:
```bash
# Allow --no-verify
if [[ "$CMD" =~ --no-verify ]]; then
  exit 0
fi
```

This causes the type-regen hook to silently pass through when `--no-verify` is present. Per CLAUDE.md standing rules:

> Never `--no-verify` without Jake's explicit authorization. Pre-commit hook failures should HALT for Jake authorization, not bypass-and-continue.

The comment in the plan reads: "Bypass via `--no-verify` per existing hook conventions (per CLAUDE.md "Never `--no-verify` without Jake's explicit authorization" — bypass is logged but allowed; gate enforcement happens at code-review time)."

The parenthetical "bypass is logged but allowed" is not consistent with the CLAUDE.md rule. The existing `nightwork-pre-commit.sh` does NOT silently allow `--no-verify` — it defers to the hook's own logic but the CLAUDE.md rule makes `--no-verify` require Jake authorization. The type-regen hook is advertised as a security gate (prevents schema-type drift); having it silently bypass on `--no-verify` without logging or halting means any executor can bypass the type-regen gate without explicit authorization.

**Required fix:** Remove the silent `exit 0` for `--no-verify`. Instead, emit a warning to stderr and continue (the hook should still run the diff check). If the author wants to document that type-regen bypass is a lower-severity concern than the Drummond grep gate, that distinction should be explicit in the hook comment and in CLAUDE.md, not implicit in a silent exit.

Alternatively: log the bypass via `>&2 echo "[nightwork-type-regen] WARNING: --no-verify flag detected; type-regen check bypassed. Document rationale in commit body per CLAUDE.md."` then `exit 0`. This keeps the bypass functional (for legitimate fast-path use) while creating a visible audit trail.

**Severity:** HIGH because the silent bypass removes a security gate without the traceability that CLAUDE.md requires for all `--no-verify` uses.

---

### MEDIUM

#### MED-1 — B-1a `clients.org_id` uses `ON DELETE CASCADE` from organizations; soft-delete posture inconsistency

**Plan:** B-1a (§6 migration body, CREATE TABLE)
**Rule reference:** CLAUDE.md "Never delete records — soft delete only"

**Finding:**

The `clients` table declares:
```sql
org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
```

Hard-delete of an organization cascades to DELETE all `clients` rows (not soft-delete — the cascade fires `DELETE`, not `SET deleted_at`). The `organizations` table presumably uses soft-delete (`deleted_at` timestamp) per CLAUDE.md's architecture rules. But if a platform-admin ever hard-deletes an organization directly via SQL (a legitimate emergency-DBA path at current single-tenant Ross Built stage), all `clients` rows disappear without `deleted_at` being set, losing the audit trail.

The SOC2 CC7.2 mapping in the plan states "Soft-delete via `deleted_at` (V.1 envelope) preserves historic identity." The CASCADE behavior contradicts this claim for the hard-delete path.

This is consistent behavior across most of the existing schema (e.g., `jobs.org_id REFERENCES organizations ON DELETE CASCADE` per migration 00001) — it's a schema-wide posture, not a B-1a-specific defect. However, given that `clients` now carries homeowner PII and has retention class `forever`, the inconsistency is worth flagging as MEDIUM.

**Required clarification:** The migration header should explicitly acknowledge: "If `organizations` row is hard-deleted, `clients` rows are CASCADE-deleted (not soft-deleted). Given the `forever` retention class on clients, this is an accepted risk at Ross Built single-tenant scale; multi-tenant escalation path is: (a) remove CASCADE from `clients.org_id`, (b) require organization deletion to first archive all `clients` rows via `deleted_at`." This is a documentation-only fix; the cascade behavior itself is consistent with existing schema conventions.

---

#### MED-2 — B-1a-bis `jobs/new/page.tsx` refactor accepts `client_name_for_create` in POST body; find-or-create server path needs explicit org-scope enforcement note

**Plan:** B-1a-bis (§4 row 4: `jobs/new/page.tsx` refactor)
**Rule reference:** CLAUDE.md "Every API route uses `getCurrentMembership()` before DB access"

**Finding:**

B-1a-bis refactors `jobs/new/page.tsx` to POST `{ client_name_for_create }` to `/api/jobs`. The plan notes: "server-side find-or-create within `membership.org_id`" — which is correct per the CLAUDE.md architecture rule. However, the plan does NOT specify the exact behavior when `client_name_for_create` matches an existing client in a different org.

The plan's threat model (T-B1a-bis-02) covers the `client_id`-only path but the `client_name_for_create` path is an alternative shortcut. The find-or-create MUST search only within `getCurrentMembership().org_id`, never across orgs. This appears to be the intent ("within membership.org_id") but is not stated as an explicit acceptance criterion.

**Required addition:** B-1a-bis AC should include: "AC-B1a-bis-XX: POST /api/jobs with `client_name_for_create` parameter creates a `clients` row filtered to `getCurrentMembership().org_id`; a Supabase RLS test or unit test verifies that a clients row from a different org with the same name is NOT matched."

---

#### MED-3 — B-1b W.1 listener `org_members` query inside `onAuthStateChange` has no timeout/abort; DoS path on slow network

**Plan:** B-1b (§5 Task 6 W.1 listener, `onAuthStateChange` handler)
**Rule reference:** Defense in Depth + "Fail Securely"

**Finding:**

The W.1 listener wiring (Task 6 step 2 code sketch) does:
```typescript
const { data } = await supabase
  .from("org_members")
  .select("role")
  .eq("user_id", userId)
  .eq("is_active", true)
  .order("created_at", { ascending: true })
  .limit(1)
  .maybeSingle();
setRole((data?.role as OrgMemberRole | undefined) ?? null);
```

This DB query inside an auth-state-change handler has no timeout, no AbortController, and no error handling. If the Supabase connection is slow or the query hangs (e.g., a connection pool exhaustion event), the handler silently hangs, the React state is not updated, and the UI displays a stale role. Subsequent auth events would queue additional hanging queries.

In env-flag-off mode (slice ship posture) this is a no-op, so the risk is deferred to Slice-2 activation. But the code is authored now; Slice-2 activation just flips an env var.

**Required addition before Slice-2 unflag:** Wrap the query in an abort-on-timeout pattern:
```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5000);
try {
  const { data } = await supabase
    .from("org_members")
    ...
    .abortSignal(controller.signal)
    .maybeSingle();
  setRole((data?.role as OrgMemberRole | undefined) ?? null);
} catch (e) {
  // On timeout or error: leave role as-is (do not setRole(null))
} finally {
  clearTimeout(timeout);
}
```

Document this as a TD-WB-LISTENER-UNFLAG.md pre-condition: "Listener must have timeout/abort before Vercel env-var add."

---

### LOW

#### LOW-1 — B-D080 down migration uses `DROP CONSTRAINT IF EXISTS`; idempotency gap if two planners add the same constraint name by mistake

**Plan:** B-D080 (Task 3 down migration)
**Rule reference:** Wave-C/Wave-D fail-loud convention (per 00097 iter-2 MED-C1-5)

**Finding:**

The down migration uses `DROP CONSTRAINT IF EXISTS` (11 statements). This is correct for the down migration (idempotent revert is desirable on a down). However, the corresponding forward migration uses ADD CONSTRAINT WITHOUT IF NOT EXISTS (intentionally fail-loud). The asymmetry is correct per the documented convention but bears noting: any future plan that accidentally duplicates a constraint name from this list will get a silent no-op on the down, making rollback forensics harder. This is inherent to the IF EXISTS pattern and is the correct tradeoff — flagged for documentation completeness only.

**No action required.** PASS on the existing pattern; NOTE for plan-review posterity.

---

#### LOW-2 — B-1a fixture client seed includes `phone: '+15555550100'`; NANP test-number convention check

**Plan:** B-1a (§6 migration body, fixture INSERT)
**Rule reference:** No accidental real-number contact in test data

**Finding:**

The fixture seed inserts `phone = '+15555550100'` (US +1 555-555-0100). The `555-0100..555-0199` range is NANP-reserved for fictional use in US media and is the standard convention for test phone numbers. This is correct practice.

**PASS.** No change needed. Flagged as a positive verification of the Q7 obviously-synthetic fixture convention.

---

## Cross-Plan Concerns

### XP-1 — PII fence grep gate patterns (B-1a + B-1a-bis) under-cover alias forms (relates to CRIT-1)

The B-1a migration header documents:
```bash
grep -rE "client:clients\([^)]*(\bemail\b|\bphone\b)" src/ scripts/
grep -rE "clients\([^)]*\*\)" src/ scripts/
```
And B-1a-bis §5.2 documents the same two patterns. Both patterns share the same alias-form gap identified in CRIT-1. The patterns should be updated in both migration headers and in B-1a-bis §5.2 and AC-B1a-bis-04/05 to the general form:

```bash
# Pattern A: wildcard (any alias prefix)
grep -rE "(:\s*)?clients?\s*\(\s*\*\s*\)" src/ scripts/
# Pattern B: fenced column with any alias prefix
grep -rE "(:\s*)?clients?\s*\([^)]*(\bemail\b|\bphone\b)" src/ scripts/
```

This is a documentation update to both migration comments and B-1a-bis ACs (AC-B1a-bis-04 + AC-B1a-bis-05).

### XP-2 — B-1a-bis `email` removed from write paths but retained in `clients.email` column; no deletion policy for clients.email data

The B-1a-bis refactor removes `client_email` from all write paths (`/api/jobs` POST/PATCH no longer accepts email; `jobs/new` form drops the email field; `sample-data/route.ts` drops email). However, the `clients` table STILL has an `email` column — populated during the B-1a backfill from `jobs.client_email`. After B-1a-bis ships, new clients created via `client_name_for_create` find-or-create will have `email = NULL`. But historic backfilled clients DO have email values.

There is no documented retention policy for `clients.email` data in the plans. The SOC2 CC7.2 mapping notes "Soft-delete via `deleted_at`" but does not address email-field retention. The ENTITY-INVENTORY `forever` retention class on clients means client records are kept indefinitely — including their email fields.

This is acceptable given D-078 + D-079 + Q1's intent (email is retained in the `clients` table where it is properly fenced from embeds). But a future Owner Portal that displays client email via `/api/clients/[id]` GET should ensure that endpoint has explicit role-gating. TD-B1abis-01 references F3 for the restoration path. **No blocking action required;** flagged for F3 plan-author awareness.

### XP-3 — Sequencing dependency B-1b on B-1a-bis not explicitly in B-1b frontmatter

**Plan:** B-1b frontmatter: `depends_on: [B-1a]`

Per the EXPANDED-SCOPE execution order: B-D080 → B-1a → B-1a-bis → B-1b. B-1b's frontmatter lists `depends_on: [B-1a]` but B-1a-bis is the actual immediate predecessor (B-1b needs the post-DROP schema for types generation). This is a plan-metadata accuracy issue, not a runtime security issue. If orchestrator logic reads `depends_on` to determine dispatch order, B-1b could be dispatched before B-1a-bis completes.

**Required fix:** Update B-1b frontmatter to `depends_on: [B-1a-bis]` (or `[B-1a, B-1a-bis]`).

---

## Summary Table

| ID | Plan | Severity | Finding |
|---|---|---|---|
| CRIT-1 | B-1b | CRITICAL | `client-pii-not-embedded` regex misses aliased embed forms (e.g., `homeowner:clients(id,email)`) |
| HIGH-1 | B-D080 | HIGH | Orphan probe HALT path's "first-8-char-prefix sample" language should be explicitly forbidden for UUID-valued output |
| HIGH-2 | B-1a | HIGH | `clients_org_insert` + `clients_org_update` RLS policies over-provision `accounting` role with PII write access |
| HIGH-3 | B-1b | HIGH | Type-regen hook silently exits 0 on `--no-verify`; no audit trail; violates CLAUDE.md `--no-verify` discipline |
| MED-1 | B-1a | MEDIUM | `clients.org_id ON DELETE CASCADE` not acknowledged in migration header vs `forever` retention class |
| MED-2 | B-1a-bis | MEDIUM | `client_name_for_create` find-or-create server path lacks an explicit org-scope AC |
| MED-3 | B-1b | MEDIUM | W.1 listener `org_members` query has no timeout/abort; DoS path on slow network (activate concern for Slice-2 unflag) |
| LOW-1 | B-D080 | LOW/NOTE | Down migration IF EXISTS asymmetry vs forward migration fail-loud convention — correct pattern, noted for posterity |
| LOW-2 | B-1a | LOW/PASS | Fixture phone `+15555550100` uses NANP test-number range correctly |
| XP-1 | B-1a + B-1a-bis | CRITICAL (related) | Grep gate patterns in both plans share the same alias-form gap as CRIT-1 |
| XP-2 | B-1a-bis | NOTE | Historic `clients.email` backfill data has no explicit retention policy; F3 author must gate `/api/clients/[id]` display with role-check |
| XP-3 | B-1b | MEDIUM | `depends_on: [B-1a]` should be `[B-1a-bis]` given post-DROP schema dependency |

---

## Top 3 Findings (Ranked by Impact)

1. **CRIT-1 (+ XP-1)** — PII fence validator and grep gate both miss the `alias:clients(id,email)` embed form. The fence has structural false-negatives for any PostgREST embed using a non-`client:` alias prefix. This is the architecturally most important finding: two layers of enforcement (runtime validator + plan-review grep gate) share the same blind spot, meaning a single developer oversight bypasses both. Fix the regex in B-1b §7.4 + update the grep commands in B-1a §6 header and B-1a-bis §5.2 + update AC-B1a-bis-04 and AC-B1a-bis-05.

2. **HIGH-2** — `accounting` role has RLS INSERT + UPDATE access on `clients` (homeowner PII table). This violates Principle of Least Privilege and contradicts the CLAUDE.md team/roles definition of the accounting role's responsibilities. The accounting role has no documented business need to create or modify homeowner client records. Remove `accounting` from both `clients_org_insert` and `clients_org_update` policies.

3. **HIGH-3** — Type-regen hook `exit 0` on `--no-verify` provides no audit trail. Per CLAUDE.md, `--no-verify` requires Jake authorization. A silent `exit 0` means any executor can bypass the type-regen gate without the bypass appearing anywhere in the record. The hook should emit a `>&2` warning before passing through so the conversation transcript shows the bypass event.

---

## Required Actions Before Execute

**BLOCKING (must resolve before B-D080 execute):**
- None for B-D080 specifically. HIGH-1 is a documentation clarification, not a migration defect.

**BLOCKING (must resolve before B-1a execute):**
- HIGH-2: Remove `accounting` from `clients_org_insert` + `clients_org_update` RLS policies in migration 00100 body sketch.
- MED-1: Add cascade-vs-retention acknowledgment to migration header.

**BLOCKING (must resolve before B-1a-bis execute):**
- CRIT-1 / XP-1: Update grep gate patterns in B-1a-bis §5.2 + AC-B1a-bis-04 + AC-B1a-bis-05 to cover alias-prefix forms.
- MED-2: Add org-scope AC for `client_name_for_create` find-or-create path.

**BLOCKING (must resolve before B-1b execute):**
- CRIT-1: Update `client-pii-not-embedded.ts` regex patterns + unit tests to cover `homeowner:clients(id,email)` form.
- HIGH-3: Update `nightwork-type-regen.sh` to emit audit warning on `--no-verify` instead of silent `exit 0`.
- XP-3: Update B-1b frontmatter `depends_on` to `[B-1a-bis]`.

**DEFERRED (before Slice-2 W.1 listener unflag):**
- MED-3: Add timeout/abort to `org_members` query in `onAuthStateChange` handler; document as pre-condition in `TD-WB-LISTENER-UNFLAG.md`.

---

## OWASP Top 10 Coverage Notes

- **A01 Broken Access Control:** B-1a RLS shape is architecturally correct (direct-filter org_id per Q10b) EXCEPT for HIGH-2 accounting over-provision. B-D080 ON DELETE NO ACTION posture is correct (prevents orphan audit rows via user deletion).
- **A02 Cryptographic Failures:** N/A — no cryptographic operations in this slice.
- **A03 Injection:** B-1a uses parameterized migration SQL (DDL; no user-controlled inputs in migration body). B-1b validator regexes are read-only string analysis. B-D080 orphan probe uses NO user-provided values. PASS.
- **A05 Security Misconfiguration:** HIGH-2 (RLS over-provision). HIGH-3 (hook bypass gap).
- **A06 Vulnerable and Outdated Components:** N/A — no new npm dependencies in this slice.
- **A07 Identification and Authentication Failures:** W.1 listener (MED-3 timeout gap) is the only auth-adjacent code. Acceptable in env-flag-off posture.
- **A09 Security Logging and Monitoring Failures:** B-D080 ON DELETE NO ACTION prevents silent audit-trail loss (PASS). HIGH-1 documents that probe execution should not log UUID values.
- **Sensitive Data Exposure (PII):** CRIT-1 is the primary PII exposure risk. HIGH-2 is the secondary risk.

---

*Security reviewer sign-off: findings documented. Cross-reviewer factual disagreement HALT (nwrp118) applies if architectural reviewer disputes CRIT-1 regex analysis — resolution via live `grep` test against B-1a-bis refactored source files.*
