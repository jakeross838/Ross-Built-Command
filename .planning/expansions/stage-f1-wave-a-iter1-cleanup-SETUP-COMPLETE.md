# Setup complete — stage-f1-wave-a-iter1-cleanup

**Status:** READY FOR PLAN (PRE-AUTHORED — no /nightwork-auto-setup orchestrator run)
**Completed:** 2026-05-19 (post-hoc per nwrp175 path-a; no AUTO/MANUAL items needed for this cleanup wave)

> This artifact was authored post-hoc per nwrp175 path-(a) to satisfy nightwork-preflight Check 2 honestly (without `--no-verify` / `--skip-preflight` bypass per Rule 8). The cleanup wave was authored as nwrp165 weekend Deliverable #5 without going through `/nightwork-init-phase` → `/nightwork-auto-setup` because the plan has zero infrastructure dependencies (no env vars, no third-party services, no new fixtures, no new npm dependencies).

---

## AUTO items (none needed)

The cleanup wave touches ONLY Postgres-side state via existing Supabase MCP connection:

- ✅ **Supabase MCP `execute_sql` + `apply_migration`** — connection active per Slice-1 dispatch chain; verified at preflight Check 5 (`mcp__supabase__execute_sql` returns expected schema state for `clients` / `jobs` / `invoices` post-Slice-1 ship).
- ✅ **Migration file location** — `supabase/migrations/` exists; next available migration number is 00102 (post-00101 from Slice-1 B-1a-bis); PLAN §4 Task 1 declares this path.
- ✅ **No env vars required** — the cleanup operates on existing schema; no new application-layer config.
- ✅ **No new third-party service connections** — touches only Supabase + the pre-commit hook chain (`.claude/hooks/*` + `.githooks/*`) which is local-only.
- ✅ **No new npm dependencies** — pure Postgres SQL changes; no application code changes.
- ✅ **No new Vercel preview URL setup** — Plan `requires_smoke: false` per PLAN frontmatter; no smoke harness run mandated.
- ✅ **CI / GitHub Actions** — no new workflow files; existing CI runs untouched.

## MANUAL items (none needed)

- No Resend account, domain verification, or DKIM/SPF setup
- No Stripe account or webhook URL
- No Anthropic API key (no AI call surface added)
- No Inngest signing key
- No Sentry DSN
- No `vercel login` / domain wire (no Vercel-side changes)

## Drummond fixtures

- ✅ **No new fixture data needed.** Cleanup operates on function definitions + role grants + extension schemas; no row-layer touchpoints. Existing Drummond + fixture-harness-org data unaffected.

## Phase-specific items

Per PLAN §A inventory verified against Supabase advisor security-lint run (2026-05-15 NIGHT per PLAN §1):

- ✅ **8 functions enumerated for search_path hardening:**
  1. `public.trg_change_orders_status_sync`
  2. `public._compute_scheduled_payment_date`
  3. `app_private.co_cache_trigger`
  4. `app_private.cleanup_stale_import_errors`
  5. `app_private.update_vip_landed_total_cents`
  6. `public.org_cost_codes_set_updated_at`
  7. `public.touch_updated_at`
  8. `app_private.update_iel_landed_total_cents`

- ✅ **7 functions enumerated for REVOKE EXECUTE:**
  - 5 `trg_pricing_history_from_*` trigger functions (`from_co_line`, `from_invoice_line`, `from_invoice_status`, `from_po_line`, `from_proposal_line`)
  - 2 `create_default_*` seed-default functions (`create_default_approval_chains`, `create_default_workflow_settings`)

- ✅ **2 extensions enumerated for schema move:**
  - `pg_trgm` (currently in `public`)
  - `vector` (currently in `public`)

Live Supabase advisor scan re-confirms this inventory pre-dispatch (per preflight Check 5).

## Rollback strategy

Per PLAN §7:

1. **Up migration**: `supabase/migrations/00102_wa_iter1_security_cleanup.sql` wraps all 3 sections in single transaction.
2. **Down migration**: `supabase/migrations/00102_wa_iter1_security_cleanup.down.sql` reverses each section in inverse order (§C extension move back to public + database search_path restore; §B GRANT EXECUTE restoration; §A function search_path SET clause removal via fresh CREATE OR REPLACE).
3. **Data-loss contract**: ZERO data loss in either direction (no row touched in either up or down direction). Safe to repeatedly apply + reverse.
4. **Manual rollback path** (worst-case if both up + down fail): restore function definitions from git history of migration 00102; re-run GRANT EXECUTE statements; ALTER EXTENSION ... SET SCHEMA public. Worst-worst-case: yesterday's automated Supabase backup; RTO ~10 min.

## Pre-dispatch verification (executed post-hoc 2026-05-19)

- ✅ Plan file at `.planning/phases/stage-f1-wave-a-iter1-cleanup/WA-iter1-cleanup-PLAN.md` is git-tracked (1 commit at `2cdeea4` from weekend); unchanged since authoring
- ✅ Plan frontmatter `status: AUTHORED — NOT DISPATCHED` matches dispatch-eligible posture
- ✅ Plan `autonomous: true` per umbrella envelope
- ✅ Plan `halt_after: true` — GATE post-cleanup substantive review per nwrp174 §16
- ✅ Plan `requires_smoke: false` — smoke not required (pure DB security hardening)
- ✅ Plan `threat_model_severity: medium` matches scope (security boundary tightening on internal trigger functions + extension relocation; no production-data risk)
- ✅ 14 acceptance criteria target declared (AC-WA-iter1-01..AC-WA-iter1-14)

## Next

Per nwrp175 §35: re-run `/nightwork-preflight stage-f1-wave-a-iter1-cleanup` → Checks 1+2 PASS post-this-commit. Surface preflight clean state to Jake. Jake authorizes `/nx stage-f1-wave-a-iter1-cleanup` in follow-up message.

Per nwrp174 §17: after cleanup ships, STOP for the night before Slice-2 dispatch.
