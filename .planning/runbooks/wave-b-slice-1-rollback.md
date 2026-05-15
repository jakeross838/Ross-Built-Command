# Wave-B-Slice-1 Rollback Runbook

Codified per F1-Wave-B Slice-1 B-1a-bis ITER-2-PATCHES §3.10 (data-migration
WARN-2/5 patch). Cross-referenced by `supabase/migrations/00101_drop_jobs_
client_columns.down.sql` header.

## Scope

Wave-B Slice-1 ships:
- B-D080 migration 00099 (user-identity FK convention codification — 11 FKs)
- B-1a migration 00100 (clients table + jobs.client_id FK + backfill)
- B-1a-bis migration 00101 (DROP jobs.client_name/email/phone) + source
  refactor across 19 src+script consumers
- B-1b src/lib types pipeline + knowledge-graph scaffold + harness Layer 2

This runbook covers rollback scenarios for any combination of these.

## Scenario A: rollback after B-1a-bis ships but before B-1b ships

1. Revert B-1a-bis source commit(s) — restores pre-refactor source code in
   19 consumers + removes /api/clients endpoint + ClientCombobox component.
2. Apply 00101.down via Supabase MCP — re-adds jobs.client_name/email/phone
   as nullable TEXT.
3. **Operator decision: backfill embedded columns from clients table?**
   - **YES path** (restores client_name display continuity):
     ```sql
     UPDATE public.jobs j
     SET client_name = c.full_name,
         client_email = c.email,
         client_phone = c.phone
     FROM public.clients c
     WHERE j.client_id = c.id
       AND c.deleted_at IS NULL;
     ```
   - **NO path:** leave embedded columns NULL (operator accepts visible
     blank client field on /jobs/[id] until forward-fix re-deploys).
4. Re-run smoke: `npm run smoke`. Expect 11/13 PASS baseline.

## Scenario B: rollback after Slice-1 fully shipped but before Slice-2 starts

Same as Scenario A but skip step 1 (no B-1b revert needed; B-1b is
application-layer + harness, not schema-bound to clients table).

## Scenario C: emergency rollback (clients table has been written to in production with non-fixture data)

HALT. Manual data export of clients table required BEFORE step 5
(00100.down DROPs the clients table). Engage Jake.

```bash
# Export clients table to CSV before applying 00100.down:
psql "$DATABASE_URL" -c "\\copy (SELECT * FROM public.clients) TO 'clients-pre-rollback.csv' CSV HEADER"
```

Then proceed:
5. Apply 00100.down — drops clients table + jobs.client_id column.
6. (Optional) Apply 00099.down — drops 11 FK constraints from B-D080.

## Coordinated rollback notes

- 00101.down + B-1a-bis code revert MUST happen together. Partial rollback
  (only 00101.down, no code revert) leaves runtime stable because post-
  refactor consumers read via embed (`j.client?.full_name`), but /api/jobs
  POST + PATCH no longer accept client_* in body. Pure code rollback without
  DDL rollback would fail at runtime (consumers try to SELECT client_name on
  a table that still has the column — works) — so code rollback alone is
  safer than DDL rollback alone.
- 00100.down (drops clients table) requires data export per Scenario C IF
  any non-fixture clients rows have been INSERTed since Slice-1 ship.

## Data loss inventory

| Field | Recoverable from clients table? | Notes |
|---|---|---|
| jobs.client_name | YES (via reverse UPDATE) | clients.full_name → jobs.client_name |
| jobs.client_email | NO post-B-1a-bis | DELIBERATE REGRESSION per ITER-2-PATCHES §3.6; restoration via Slice-2 B-2 |
| jobs.client_phone | NO post-B-1a-bis | Same as above |

For pre-B-1a-bis-refactor jobs, the original embedded values live only in
pg_dump backups. The reverse UPDATE above does NOT touch those rows.

## Verification post-rollback

After any rollback path, verify:
```sql
-- 1. jobs.client_name column re-added
SELECT column_name FROM information_schema.columns
 WHERE table_name='jobs' AND table_schema='public'
   AND column_name IN ('client_name','client_email','client_phone');
-- expect: 3 rows

-- 2. /jobs/[id] page renders (re-run /nightwork-end-to-end-test)
-- 3. /api/jobs POST/PATCH accept legacy body shape (re-run smoke harness)
```

If any verification step FAILS, do NOT redeploy. Engage Jake.
