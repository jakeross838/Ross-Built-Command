# Migration safety review — 00092_verification_harness_fixture_org.sql + 00093_harness_fixture_profile_corrective.sql

## Migration summary
00092 (v2) seeds the verification-harness fixture organization, the harness-fixture user's org_members row, and the harness-fixture user's profiles row (idempotent ON CONFLICT DO NOTHING, gated by SELECT from auth.users). 00093 is the corrective patch for already-bootstrapped live DBs where 00092 v1 (which omitted the profiles row) was already recorded as applied — it inserts only the missing profiles row with identical ON CONFLICT DO NOTHING semantics.

## Eight-step audit
| Step | Verdict | Evidence | Gap |
|------|---------|----------|-----|
| Backwards compatibility | PASS | Pure INSERT-only against existing tables (organizations, org_members, profiles). No DDL, no column drops/renames/type changes, no NOT NULL retrofits. Old code paths continue to function — they will simply not see the fixture rows under RLS (org_id mismatch). | None |
| Dry-run plan | PASS | Both migrations wrapped in BEGIN/COMMIT. Each statement is either an INSERT … ON CONFLICT DO NOTHING (00092 step 1) or INSERT … SELECT FROM auth.users WHERE email=… ON CONFLICT DO NOTHING (00092 steps 2–3, 00093). On a clean DB without the harness user, steps 2–3 are no-ops (SELECT returns 0 rows); on a populated DB with the user pre-created, all three insert exactly one row. No long-running operations; no CONCURRENTLY needed. | None |
| Rollback plan | WARNING | No `<NNNNN>_*_rollback.sql` companion file in `supabase/migrations/`. Reverse SQL is trivial (three scoped DELETEs by id + email lookup) but is not committed alongside the migrations. The phase plan documented the reverse path in the user prompt; capture it in this report (see "Reverse SQL" below) so the rollback contract is on record. | Add reverse SQL as a comment to 00092 + 00093, or a sibling rollback.sql, before stage close. |
| Data preservation | PASS | No DELETE / TRUNCATE / DROP. ON CONFLICT DO NOTHING guarantees re-runs cannot overwrite or corrupt existing rows. The fixture UUID 00000000-0000-0000-0000-fb1ce0a55e55 is mnemonic and reserved (per 00092 comment) — no collision risk with real tenant org IDs (which use gen_random_uuid()). | None |
| RLS posture | PASS | organizations, org_members, profiles all had RLS enabled in 00016. Existing RESTRICTIVE policies (`org isolation` / `members read own org` / `members read org_members` / `org isolation` on profiles, gated by app_private.user_org_id()) apply unchanged. The fixture rows are tenant-scoped under those existing policies: only sessions whose user_org_id() resolves to the fixture UUID can read them. The harness session BY CONSTRUCTION resolves only to the fixture org (its only profiles row points there), so cross-tenant reach is impossible even with a misconfigured query. No new policies needed; no policy mutations. | None |
| Trigger / cache integrity | PASS | No computed cache columns affected. `jobs.approved_cos_total` and other trigger-maintained caches are on tables not touched by these migrations. `trg_organizations_updated_at` fires on the fixture org INSERT but only stamps updated_at, which is already set explicitly to NOW(). | None |
| Drummond fixture impact | PASS | Drummond fixtures live in `src/app/design-system/_fixtures/drummond/` as filesystem JSON, not DB rows (confirmed). These migrations do not touch any Drummond data, any tenant data, or any tenant tables. Drummond seed flows unaffected. | None |
| Audit log coverage | PASS (non-applicable) | The harness fixture org is operator-internal infrastructure, not a tenant entity that participates in financial workflows. No invoice/draw/change-order audit trails involved. platform_admin_audit is unaffected (no platform_admin grants made here). | None |

## Reverse SQL (not present as companion file — record on file here)
```sql
-- Rollback for 00092 + 00093 (run in this order)
BEGIN;
DELETE FROM public.profiles
  WHERE id = (SELECT id FROM auth.users WHERE email = 'harness-fixture@nightwork.local')
    AND org_id = '00000000-0000-0000-0000-fb1ce0a55e55'::uuid;
DELETE FROM public.org_members
  WHERE org_id = '00000000-0000-0000-0000-fb1ce0a55e55'::uuid
    AND user_id = (SELECT id FROM auth.users WHERE email = 'harness-fixture@nightwork.local');
DELETE FROM public.organizations
  WHERE id = '00000000-0000-0000-0000-fb1ce0a55e55'::uuid;
COMMIT;
-- NOTE: auth.users row for harness-fixture@nightwork.local is intentionally
-- NOT deleted by this rollback — it was created out-of-band by
-- supabase.auth.admin.createUser (per 00092 chicken-and-egg note) and is
-- managed separately from migrations.
```

## Findings
### BLOCKING
- (none)

### WARNING
- Rollback plan: No companion rollback.sql committed for 00092 or 00093. The reverse SQL above is straightforward but should be captured in-tree (either as `00092_..._rollback.sql` + `00093_..._rollback.sql` files or as a trailing comment block in each migration) before the phase ships, to honor the migration-safety contract step 3.

### INFO
- 00092 v1 → v2 amendment pattern (the in-place edit + 00093 as the corrective for already-applied DBs) is the correct shape for this situation. Future fresh bootstraps consume v2; the live DB picks up 00093. Both arrive at the same end state and are individually idempotent.
- The chicken-and-egg note in 00092 lines 13–34 documents the auth.users prerequisite clearly; the SELECT-from-auth.users guard pattern is the right idempotent shape and prevents the migration from failing on a clean DB where the harness user has not yet been created.

## Verdict
PASS (with one non-blocking WARNING on rollback artifact placement)
