# Migration safety review — 00107_b3_soft_delete_audit_trigger_def_wc_1.sql

## Migration summary

Backfill-free migration adding (1) `app_private.audit_soft_delete()` SECURITY DEFINER trigger function with three-tier user-id resolution and graceful-degradation EXCEPTION wrapper, (2) 32 `zz_soft_delete_audit_<table>` AFTER UPDATE triggers gated by `WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)`, and (3) DEF-WC-1 RESTRICTIVE backstop policies on `org_members` (`org_isolation` for ALL + `delete_strict` for DELETE). No row mutation, no schema-breaking change, no destructive op.

## Eight-step audit

| Step | Verdict | Evidence | Gap |
|------|---------|----------|-----|
| Backwards compatibility | PASS | No column drops; no renames; no NOT NULL adds without default; types regenerated in same commit (`database.types.ts` updated per B-3-SUMMARY §key-files); ActivityEntityType union additive-only (+23 singular entity types); ENTITY_LABELS Record extended in lockstep (exhaustiveness preserved). Old code calling `logActivity` continues to function unchanged. | None |
| Dry-run plan | PASS | Migration applied via Supabase remote during /nx execute (per B-3-SUMMARY §2 Task 1 commit `49bb664`); pre-design audit query in B-3-PLAN §1.1 enumerated the 32-table list against live `information_schema`; Task 6 per-table verification DO-block captured + asserted entity_type emission per nwrp216 Q3. Triggers + function + policies all created in single transaction (BEGIN/COMMIT wrap). No CONCURRENTLY needed — DDL only, no large UPDATE/INDEX. | None |
| Rollback plan | PASS | `.down.sql` present, symmetric reverse order (policies → 32 triggers → function); DROP IF EXISTS pattern idempotent; explicit comment block documents that activity_log rows captured by trigger between ship and rollback are PRESERVED (append-only audit-log rule). | None |
| Data preservation | PASS | Zero DELETE / TRUNCATE / DROP TABLE / DROP COLUMN statements; WHEN clause restricts trigger firing to FUTURE soft-delete transitions only (`OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL`); existing rows untouched on migration apply; existing activity_log rows untouched on migration apply or rollback. | None |
| RLS posture | PASS | DEF-WC-1 adds RESTRICTIVE backstop on org_members (already RLS-enabled per 00016) — does NOT replace existing 3 PERMISSIVE policies, AND's with them (defense-in-depth intersection). Canonical direct-call form matches existing 14 Pattern A tables verbatim per nwrp215 decision 2 Option A. DELETE policy deliberately omits `is_platform_admin()` per migration 00049 canonical pattern (cross-org membership removal routes through admin tooling with separate audit). Trigger function is SECURITY DEFINER + REVOKE EXECUTE FROM PUBLIC + REVOKE FROM authenticated (per 00103 + B-2a ACL hardening lesson; pg_default_acl auto-grant on app_private schema discovered + addressed inline at apply time). | None |
| Trigger / cache integrity | PASS | Trigger function does not affect any existing cache column inputs (`jobs.approved_cos_total` unaffected; no change_orders writes by this function); EXCEPTION wrapper on INSERT ensures trigger CANNOT block underlying soft-delete UPDATE (AC-B3-10 graceful degradation contract); `zz_` prefix orders trigger LAST among same-event AFTER UPDATE triggers (alphabetic-by-design); SECURITY DEFINER + `SET search_path = public, pg_temp` per CLAUDE.md Dev Rules canonical pattern. | None |
| Drummond fixture impact | PASS | No row mutations — Drummond reference job fixtures and `harness-fixture-org` verification-harness fixtures unaffected on migration apply. Trigger only fires on FUTURE soft-delete transitions; pre-existing fixtures that arrived with deleted_at = NULL stay NULL. Smoke harness verification (Task 3 per B-3-SUMMARY §6) ran against shipped trigger; no fixture parse failures. | None |
| Audit log coverage | PASS | Migration EXTENDS audit-log coverage to 32 previously-uninstrumented soft-delete paths (this is the migration's purpose). `mechanism = 'db_trigger'` discriminator in details JSONB distinguishes trigger-written rows from app-layer `logActivity` calls. Three-tier actor resolution captured in `details.actor_source`. activity_log rows captured by trigger are themselves preserved on rollback (append-only). | None |

## Reverse SQL

Already provided in companion file `00107_b3_soft_delete_audit_trigger_def_wc_1.down.sql` — symmetric reverse (DROP POLICY × 2 → DROP TRIGGER × 32 via DO-block → DROP FUNCTION). No additional inline reverse SQL needed.

## Findings

### BLOCKING

None.

### WARNING

None.

### NOTES

- **Future hardening dependency surfaced (non-blocking).** Migration relies on `activity_log.relforcerowsecurity = false`. If a future migration adds `ALTER TABLE activity_log FORCE ROW LEVEL SECURITY`, this trigger requires an explicit INSERT policy on activity_log matching org_id from trigger context. Documented inline at lines 48-54 of `00107_b3_soft_delete_audit_trigger_def_wc_1.sql` and in B-3-PLAN §5 R-9 + §7. Surface at that future migration's PLAN-author time.
- **MF-8 audit-spoof surface (documented, accepted).** `set_config('app.current_user_id', user_id, true)` (Tier 2 in three-tier resolution) is invoked ONLY by trusted server-side code (service-role API routes). The trigger does NOT guard against spoof at the SQL layer (would require wrapping SET-LOCAL in a SECURITY DEFINER helper with no meaningful additional protection). Tier 1 (auth.uid()) fires first for all authenticated paths; service-role boundary is itself trusted. Documented inline at lines 130-138.
- **TD-NW-APP-PRIVATE-DEFAULT-ACL-HARDEN filed (per nwrp217 §20).** 4-instance lineage of REVOKE-per-function debt. Not a B-3 blocker; addresses pg_default_acl auto-grant pattern at schema level.

## Verdict

**PASS**

Migration is backfill-free, fully reversible, RLS-additive (RESTRICTIVE backstop AND's with existing PERMISSIVE — does not replace), audit-coverage-additive (extends to 32 previously-uninstrumented soft-delete paths), and uses graceful-degradation EXCEPTION wrapper to ensure trigger failure CANNOT block underlying tenant soft-delete UPDATE. All eight audit steps PASS with no blocking or warning findings. Cleared from the data-migration-safety lens for POST-EXECUTE GATE B-3.
