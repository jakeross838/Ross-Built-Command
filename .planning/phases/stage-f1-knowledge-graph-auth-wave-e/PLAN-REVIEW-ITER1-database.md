---
review: PLAN-REVIEW-ITER1-database
plans: [E-2, E-3]
lens: database / SQL
reviewer: database-reviewer (claude-sonnet-4-6)
date: 2026-05-14
verdict: WARNING
---

# Plan-Review Iter-1 — Database / SQL Lens
## Wave-E: E-2 (smoke-harness-fix) + E-3 (bills-id-db-wire)

---

## Verdict: WARNING

No blocking SQL defects were found. Two findings require explicit acknowledgement
or a small task addition before execute proceeds; neither is blocking on its own but
together they represent a gap the executor must address.

---

## Finding 1 — WARNING: `crypt(gen_random_uuid()::text, gen_salt('bf'))` password
rewrite is correct, but the credentials-file write mechanism is architecturally
impossible inside a SQL DO block without superuser access

**Severity:** WARNING (blocks the credentials-file contract the plan relies on)

**Location:** E-2 Plan, `scripts/fixtures/smoke-seed.sql` rewrite; Plan frontmatter
line 78 + key_links line 184:

> "generated email→password pairs written to `.planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt`"
> "via: apply-time COPY or psql \\o or pg_notify hand-off — seed writes generated email→password rows to the file"

**Finding:**

The SQL DO $$ block that runs `crypt(gen_random_uuid()::text, gen_salt('bf'))` per user
generates the bcrypt hash at apply-time inside the Postgres function. The cleartext
password (`gen_random_uuid()::text`) exists ephemerally as a PL/pgSQL variable during
that DO block execution and is never surfaced to any output channel — the DO block
writes only the hash to `auth.users.encrypted_password`.

There is no mechanism inside a DO $$ block to write to the local filesystem:
- `COPY TO '/path'` requires superuser (pg_write_server_files privilege); Supabase
  managed instances deny this to all roles including service-role by default.
- `pg_notify` is inter-process, not filesystem.
- `psql \o` redirection is a psql meta-command that intercepts the psql output stream,
  not SQL output — it cannot capture DO block internals.
- `RAISE NOTICE` can surface the cleartext to the psql stdout/stderr stream, but only
  if psql is run locally with `--echo-errors` or similar; Supabase MCP `execute_sql`
  does NOT capture NOTICE output (it returns only query results + error messages).

**Consequence:** As written, the rewrite sets an apply-time-random bcrypt hash that
is permanently unrecoverable. The `harness-auth-bootstrap.ts` credentials-file read
path will fail because the file is never written. The smoke harness cannot authenticate
as any `smoke-*@nightwork.local` user.

**Resolution path (two options; executor must pick one):**

Option A (RECOMMENDED — minimal SQL change): Change the DO block to generate a
single shared random password string at the top of the block, persist it via
`RAISE NOTICE` (psql stdout), AND use `RETURNING` on the identity insert to echo the
values. The orchestrator (which runs the seed via `psql -f`) pipes output to a temp
file and extracts NOTICE lines to write the credentials file. The DO block becomes:

```sql
DO $$
DECLARE
  v_password TEXT := gen_random_uuid()::text;  -- single apply-time random; all 9 users share
BEGIN
  RAISE NOTICE 'SMOKE_SEED_PASSWORD=%', v_password;
  FOR v_user IN ... LOOP
    INSERT INTO auth.users (..., encrypted_password, ...) VALUES
      (..., crypt(v_password, gen_salt('bf')), ...);
  ...
  END LOOP;
END $$;
```

The orchestrator captures the NOTICE line and writes:
```
smoke-owner@nightwork.local:<password>
smoke-pm-alpha@nightwork.local:<password>
...
```
to the credentials file. All 9 smoke users share one password (simpler, no security
regression — they are synthetic fixture accounts, all already in the same fixture org).

Option B (MINIMAL — no psql at all): Instead of a random password, keep a
deterministic but non-committed password. The DO block uses a password derived from an
environment variable (e.g. `current_setting('app.smoke_seed_password', true)`) set via
`psql -v smoke_seed_password=$SMOKE_SEED_PASSWORD` at apply time. The env var is set
by the orchestrator before running psql. harness-auth-bootstrap.ts reads the same env
var. No credentials file needed.

Option A is cleaner because it keeps the seed file self-contained (no external env var
dependency) and produces the file the plan already contracts to produce.

**If the plan is executed without this fix:** the `crypt(gen_random_uuid()::text, ...)`
change will ship correctly (no plaintext in git — FINDING-2 remediation stands), but
the smoke harness will fail to authenticate as smoke users, breaking AC-E2-12
(harness-auth-bootstrap reads credentials file) and by extension AC-E-07 (smoke re-run
post-seed-reapply) and AC-E-10 (bills route smoke 200 assertion).

---

## Finding 2 — WARNING: E-3 vendor embed shape diverges from the API route pattern
(pre-E-1 state)

**Severity:** WARNING (inconsistency; not a runtime error, but creates a PII-fence gap)

**Location:** E-3 Plan, multiple sites:
- Plan frontmatter line 25: "Post-E-1, the vendor embed in this file narrows to
  `(id, name, address)` — E-3 mirrors that shape."
- must_haves truth line 109: "the page query's vendor embed string contains
  '(id, name, address)'"
- Plan artifact: "contains_also_also: `vendors:vendor_id (id, name, address)`"

**Finding:**

The existing API route (`src/app/api/invoices/[id]/route.ts:76`) currently returns:
```
vendors:vendor_id (id, name, phone, email, address)
```
E-1 has NOT yet shipped. If E-3 executes before E-1 (or in parallel with E-1 as
permitted by the sequencing rules), the page-side embed will be `(id, name, address)`
while the API route embed remains `(id, name, phone, email, address)`.

The E-3 plan explicitly acknowledges this ("If E-3 ships first, E-3's narrowing stands
on its own; if E-1 ships first, E-3's narrowing mirrors E-1's") and states the
constraint is independent. This is architecturally correct — the narrower embed on the
page-side cannot re-introduce the PII leak regardless of E-1 order.

**What this review adds:** The E-3 plan uses the notation `vendors:vendor_id (id, name, address)`.
Cross-checking against existing codebase embed patterns (confirmed via grep of src/):
the established convention in this codebase is `vendors:vendor_id (name)` or
`vendors:vendor_id (id, name)`. The syntax `vendors:vendor_id (id, name, address)` is
valid PostgREST — it specifies a relationship hint via `vendor_id` FK column (migration
00001:136: `vendor_id UUID REFERENCES vendors(id)`, nullable). However, since the 5
synthetic smoke invoices have `vendor_id = NULL` (confirmed: seed SQL lines 203-211
populate only 8 columns; vendor_id is not among them), the PostgREST embed will return
`null` for the vendor object on all 5 synthetic rows.

The E-3 shim handles this correctly (field mapping table shows `vendor_id: null` → shim
defaults). The View contract `vendor: { id: string; name: string }` must also handle
null. Executor must verify that InvoiceReviewView's vendor prop is typed to accept null
OR that the shim constructs a fallback `{ id: '', name: inv.vendor_name_raw ?? '' }`
when the embed returns null. The field mapping table in E-3 Plan §Field mapping shows
`inv.vendor_id: null` but does not explicitly document the fallback for the
`vendor: { id, name }` prop passed to the View. This is a TypeScript/runtime gap the
executor must resolve during Task 3 (shim construction).

**Action required by executor:** In the shim construction (Task 3), explicitly handle
the case where the vendor embed is null (because vendor_id is null on synthetic invoices):
```typescript
const vendorProp = dbVendor
  ? { id: dbVendor.id, name: dbVendor.name }
  : { id: '', name: row.vendor_name_raw ?? 'Unknown Vendor' };
```
This is NOT a schema change — it is an application-layer null-guard that the plan body
should call out explicitly but currently leaves implicit.

---

## Finding 3 — INFO: RLS policy function `app_private.user_org_id()` is called
without the `(SELECT ...)` wrapper in raw SQL policy definitions

**Severity:** INFO (no action required for E-2/E-3; flagging for Wave-B awareness)

**Location:** `supabase/migrations/00016_multi_tenant_foundation.sql:152-163`

The RESTRICTIVE "org isolation" policies on public.invoices and all tenant tables use:
```sql
USING (org_id = app_private.user_org_id())
```
not:
```sql
USING (org_id = (SELECT app_private.user_org_id()))
```

The `(SELECT fn())` wrapper is the Supabase best-practice pattern because it causes
Postgres to evaluate the function once per query (cached at the initPlan node) rather
than once per row. For the STABLE SECURITY DEFINER function `app_private.user_org_id()`
(which does `SELECT org_id FROM profiles WHERE id = auth.uid()`), the bare call IS
optimized by Postgres because the planner recognizes STABLE functions can be inlined
with constant-folding at the query level — but only when the RLS policy is evaluated
against a scan with a good selectivity estimate. Under high-row-count scenarios (future
multi-tenant scale) or with stale statistics, the bare form can degrade to per-row
evaluation.

This pattern predates E-2/E-3 and is out of scope for Wave-E. It is the established
convention for this project. No action required now; log as a Wave-B performance
hardening candidate (add TD entry: wrap `app_private.user_org_id()` in `(SELECT ...)`
across all RESTRICTIVE policies via a single migration).

The E-3 plan's page-level code mirrors the correct pattern by calling
`getCurrentMembership()` at the application layer (one call per request, not per row),
which avoids this concern entirely for the Server Component path.

---

## E-2 Seed SQL Quality Assessment

**bcrypt cost factor:** `gen_salt('bf')` uses pgcrypto's default bcrypt work factor of
2^11 (cost=11 in OpenBSD nomenclature, internally mapped to 2^11 iterations). This is
Supabase's default and is appropriate. No change needed.

**ON CONFLICT (id) DO UPDATE behavior:** The current seed (pre-E-2 rewrite) uses:
```sql
ON CONFLICT (id) DO UPDATE SET
  email_confirmed_at = COALESCE(auth.users.email_confirmed_at, NOW()),
  updated_at = NOW();
```
This does NOT re-encrypt the password on re-apply — a correct behavior for the
current version (plaintext password case). After E-2's rewrite to
`crypt(gen_random_uuid()::text, gen_salt('bf'))`, if the DO block generates a fresh
random hash per apply but ON CONFLICT only updates `email_confirmed_at` + `updated_at`,
then re-applying the seed will NOT rotate the password (the new hash is in the INSERT
VALUES clause which is skipped on conflict). This is consistent with the plan's intent
(T-E-2-04 acceptance: "each `psql -f` apply MUST generate FRESH passwords"). But for
fresh passwords to propagate, ON CONFLICT must also update `encrypted_password`. The
current ON CONFLICT clause does not include `encrypted_password = EXCLUDED.encrypted_password`.

**Action required by executor (E-2 seed rewrite):** Add `encrypted_password =
EXCLUDED.encrypted_password` to the ON CONFLICT DO UPDATE clause so that re-applying
the seed actually rotates the password hash:
```sql
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,  -- ADD THIS
  email_confirmed_at = COALESCE(auth.users.email_confirmed_at, NOW()),
  updated_at = NOW();
```
Without this, a re-apply after user deletion+recreation does NOT update the hash,
and the credentials file written by the orchestrator would contain a password that
doesn't match the stored hash from the original apply.

**RAISE NOTICE capture via Supabase MCP:** Confirmed: Supabase MCP `execute_sql` does
not capture PostgreSQL NOTICE-level messages in its return payload. Only query result
rows and ERROR-level messages are returned. This reinforces Finding 1 — the
credentials-file write mechanism must use psql (local) or the orchestrator-wrapper
approach described in Finding 1.

**Cross-plan vendor_id population for E-3:** The current seed SQL (lines 203-211) does
NOT populate `vendor_id` on synthetic invoices. E-3's field mapping table explicitly
documents this and provides a null-guard shim. No E-2 seed change is needed to
satisfy E-3's smoke pass — the null vendor embed is handled in the shim. This is the
correct resolution of the "E-3 noted seed lacks vendor_id" coordination question:
E-2 does NOT need to add a vendor table or vendor_id to the synthetic invoices.
The shim is the right F1-trajectory approach.

---

## E-3 Query Pattern Assessment

**getCurrentMembership() + org_id filter:** The plan mandates `.eq('org_id', membership.org_id)`
as belt-and-suspenders on top of the RESTRICTIVE RLS policy. This is correct per
CLAUDE.md. The API route (`src/app/api/invoices/[id]/route.ts:80-83`) uses the same
pattern and adds `.is('deleted_at', null)`. E-3 must also add `.is('deleted_at', null)`
to the page query — the plan artifact specifies this:
"`.eq('id', params.id).eq('org_id', orgId).is('deleted_at', null).maybeSingle()`"
This is correct.

**`maybeSingle()` vs `single()`:** The plan uses `.maybeSingle()` which returns null
(not an error) when 0 rows are found, then the page calls `notFound()` on null. This
is the correct pattern for a Server Component. The API route uses `.maybeSingle()` on
the main query too (line 83). Consistent. Pass.

**Embed syntax `vendors:vendor_id`:** Valid. The FK `invoices.vendor_id REFERENCES vendors(id)`
exists in migration 00001:136. PostgREST resolves it via pg_constraint. The
`vendors:vendor_id` alias-syntax (`alias:column (fields)`) is the correct hint form
when the column name differs from the table name. Confirmed by existing codebase usage
at `src/components/budget-drill-down.tsx:244` and `src/app/api/draws/[id]/route.ts:191`.

**`jobs:job_id` embed:** Similarly valid. FK at migration 00001:134: `job_id UUID REFERENCES jobs(id)`.
Resolves via same mechanism. All 5 synthetic invoices have `job_id` populated (confirmed
in seed lines 206-210). This embed will return data for all synthetic rows.

**`cost_codes:cost_code_id` embed:** Valid FK at migration 00001:135. All 5 synthetic
invoices have `cost_code_id = NULL` (not in the 8-column seed insert). Embed returns
null. Shim handles with `costCode: null`. View accepts `costCode: null` per its prop
type `costCode: { id, code, description } | null`. Pass.

**Index coverage for E-3 query:**
- `invoices.id` (PK): index via `PRIMARY KEY` constraint. Pass.
- `invoices.org_id`: `idx_invoices_org_id` (migration 00016:167). Pass.
- `invoices.(org_id, status)`: compound partial index exists via `idx_invoices_org_status`
  (migration 00035). Not used by E-3's PK lookup, but RLS traversal benefits.
- `vendors.id` (PK): index via `PRIMARY KEY`. Pass.
- `jobs.id` (PK): index via `PRIMARY KEY`. Pass.
- `cost_codes.id` (PK): index via `PRIMARY KEY`. Pass.

The E-3 query plan for `WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL` will
use the PK index on `id` with a filter on `org_id`. The single-row PK lookup is
effectively O(1) regardless of org_id index. Estimated plan: Index Scan on invoices_pkey
(id = $1) → Filter (org_id = $2, deleted_at IS NULL). Sub-millisecond on any data size.
No additional indexes are needed for E-3.

---

## Cross-Plan Vendor_id Coordination Resolution

E-2 seed does NOT need to add vendors or vendor_id to resolve E-3's smoke pass.
The resolution is:

1. Synthetic invoices have `vendor_id = NULL`.
2. The PostgREST embed `vendors:vendor_id (id, name, address)` returns `null` for
   all 5 synthetic rows.
3. E-3's shim construction must explicitly handle the null embed (see Finding 2 for
   the required null-guard).
4. InvoiceReviewView receives `vendor: { id: '', name: 'Smoke Vendor Alpha' }`
   (using `vendor_name_raw` as the display fallback), which satisfies the
   `vendor: { id: string; name: string }` prop contract.
5. The smoke AC asserts DOM presence of 'Smoke Vendor Alpha' text — this passes
   because `vendor_name_raw` is populated in all 5 seed rows and the shim uses it.

This is the correct F1-trajectory approach. Adding a vendors table to the smoke seed
would create unnecessary fixture infrastructure. The null-guard shim is the right
boundary between what the seed provides and what the View requires.

---

## Top 3 DB Findings (Summary)

**Finding 1 — WARNING:** The credentials-file write mechanism described in E-2 Plan is
architecturally impossible inside a SQL DO block without superuser. `COPY TO` is denied
on Supabase managed instances; Supabase MCP `execute_sql` does not capture RAISE NOTICE
output. Executor must implement the orchestrator-wrapper approach (psql NOTICE capture)
or the env-var approach before the credentials-file contract can be fulfilled. Without
this fix, the smoke harness cannot authenticate as smoke-* users.

**Finding 2 — WARNING:** E-3's shim construction implicitly relies on a null-guard for
the `vendor:` embed (because all synthetic invoices have `vendor_id = NULL`), but the
E-3 Plan body does not explicitly document the fallback for the `vendor: { id, name }`
prop. Executor must add an explicit null-guard (`dbVendor ?? { id: '', name: row.vendor_name_raw ?? '' }`)
in Task 3. Without this, `InvoiceReviewView` receives `null` for `vendor` which
violates the View's non-nullable `vendor: { id: string; name: string }` prop contract
and causes a runtime TypeError.

**Finding 3 — WARNING (E-2 seed rewrite):** The ON CONFLICT DO UPDATE clause in the
auth.users insert must include `encrypted_password = EXCLUDED.encrypted_password` for
password rotation to take effect on re-apply. Without this, a second `psql -f`
invocation preserves the original hash while writing a new credentials file with a
different cleartext password — a credentials/hash mismatch that breaks authentication.
