# Wave-E Database QA Review

**Reviewer:** postgres-reviewer  
**Phase head:** 018052b  
**Date:** 2026-05-14  
**Verdict:** PASS

---

## 1. Seed correctness — smoke-seed.sql

**Placeholder substitution (NOTE):** The `v_password` placeholder
`'__PLACEHOLDER_REPLACED_BY_ORCHESTRATOR__'` is declared as a TEXT
variable inside the DO block and passed directly to
`crypt(v_password, gen_salt('bf'))`. A UUID replacement string (hex +
hyphens, no single quotes) is SQL-literal-safe as a PL/pgSQL TEXT value.
No quoting escape risk. Defensive comment in the file header is accurate.

**pgcrypto usage:** `crypt(v_password, gen_salt('bf'))` is correct
Supabase bcrypt form; matches migration 00092/00093 harness-fixture user
pattern. No issue.

**ON CONFLICT idempotency:**
- `auth.users`: `ON CONFLICT (id) DO UPDATE SET ... encrypted_password = EXCLUDED.encrypted_password` — correct. Rotates hash on re-apply so credentials file stays in sync (ITER-2-PATCHES §2.2).
- `auth.identities`: `ON CONFLICT (provider_id, provider) DO NOTHING` — correct per Supabase auth schema unique constraint.
- `profiles`, `org_members`, `jobs`, `invoices`, `activity_log`: all `ON CONFLICT (id) DO NOTHING` — non-destructive. Correct.

**auth.users NOT NULL columns:** The INSERT supplies `instance_id`, `id`, `aud`, `role`, `email`, `encrypted_password`, `email_confirmed_at`, `raw_app_meta_data`, `raw_user_meta_data`, `created_at`, `updated_at`, `confirmation_token`, `email_change`, `email_change_token_new`, `recovery_token`. All Supabase-required NOT NULL columns covered; empty-string sentinel values for token columns match 00092 harness pattern.

**profiles.role CHECK constraint:** Migration 00007 defines `role IN ('admin', 'pm', 'accounting')`. The seed inserts `'admin'`, `'pm'`, `'accounting'` — all valid. The `'owner'` role used in `org_members` is mapped to `'admin'` at the profiles level with a comment explaining the distinction. No constraint violation.

**org_members.role CHECK constraint:** Migration 00016 defines `('owner','admin','pm','accounting')`. Seed uses all four values correctly.

**Smoke Job UUID format (NOTE):** Job ID `22222222-2222-2222-2222-20000000000a` uses a lowercase hex digit `a` in the last segment. This is valid UUID syntax — PostgreSQL accepts lowercase hex in UUID literals. No issue.

**activity_log schema alignment:** Migration 00026 defines `entity_type TEXT NOT NULL`, `entity_id UUID`, `action TEXT NOT NULL`, `details JSONB`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`. Seed INSERT lists `(id, org_id, user_id, action, entity_type, entity_id)` — all columns present and NOT NULL columns satisfied. `details` omitted (nullable). Correct.

---

## 2. E-3 query plan — bills/[id]/page.tsx

**Primary key lookup:** `invoices.id` is the UUID PRIMARY KEY from migration 00001. Index lookup is guaranteed. Optimal.

**org_id + deleted_at filter:** Migration 00035 creates:
```
idx_invoices_org_status ON public.invoices (org_id, status) WHERE deleted_at IS NULL
```
The E-3 query filters `.eq('org_id', ...).is('deleted_at', null)` but does NOT filter on `status`. There is no composite index on `(org_id) WHERE deleted_at IS NULL` alone. However, because the query also filters `.eq('id', params.id)` — a primary key point lookup — the planner will use the PK index and filter org_id + deleted_at as a recheck condition on the single returned row. For a single-row PK fetch this is optimal regardless of the org_id index; no seq scan risk on this query shape. **NOTE:** if this query pattern is ever used without the `id` equality filter (e.g., listing bills), the missing `(org_id) WHERE deleted_at IS NULL` partial index would matter. Out of scope for Wave-E.

**vendor_id FK:** Migration 00001 declares `vendor_id UUID REFERENCES vendors(id)` — FK exists. PostgREST resolves `vendors:vendor_id (id,name,address)` via this FK. Migration 00035 creates `idx_invoices_org_vendor ON public.invoices (org_id, vendor_id) WHERE deleted_at IS NULL` — FK column indexed.

**job_id FK:** Migration 00001 declares `job_id UUID REFERENCES jobs(id)` — FK exists. PostgREST resolves `jobs:job_id (id,name)`. FK column is indexed via `idx_invoices_job_status` from migration 00035.

**cost_code_id FK:** Migration 00001 declares `cost_code_id UUID REFERENCES cost_codes(id)`. PostgREST resolves `cost_codes:cost_code_id (id,code,description)`. FK column indexed via `idx_invoices_cost_code` from migration 00035.

**Embed safety — vendor null guard:** Seed inserts invoices with `vendor_id` deliberately NULL. The page correctly falls back to `vendor_name_raw`. The `jobEmbed` null check with `notFound()` is correct given `job_id NOT NULL` FK constraint on `public.invoices`.

---

## 3. Migration history completeness

No new migration files in Wave-E. The invoices schema from 00001 (with subsequent amendments through 00097) supports all columns queried by E-3: `vendor_id`, `vendor_name_raw`, `job_id`, `cost_code_id`, `po_id`, `co_id`, `invoice_number`, `invoice_date`, `description`, `line_items`, `total_amount`, `invoice_type`, `confidence_score`, `confidence_details`, `status`, `received_date`, `payment_date`, `draw_id`, `original_file_url`, `org_id`. No missing column gap.

---

## 4. Activity log schema match

Confirmed: migration 00026 schema is `entity_type TEXT NOT NULL, entity_id UUID, action TEXT NOT NULL, details JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`. Seed comment and INSERT column list are accurate.

---

## Findings summary

| # | Severity | Finding |
|---|----------|---------|
| 1 | NOTE | No standalone `(org_id) WHERE deleted_at IS NULL` partial index on `invoices`; not a Wave-E risk given PK-first query shape, but worth adding if any future listing query drops the `id` filter. |
| 2 | NOTE | `v_password` DO block scoping is correct; the UUID-shaped placeholder comment accurately explains SQL-safety. No action needed. |

**Verdict: PASS.** All seed correctness checks pass. E-3 query plan is safe for the single-row PK lookup pattern. Migration history is complete for the queried columns. Activity log schema matches the seed INSERT. No blocking or critical findings.
