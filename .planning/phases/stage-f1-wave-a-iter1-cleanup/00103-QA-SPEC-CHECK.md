# Spec check — Migration 00103 (TD-WAIC-03 closure)

**Reviewer:** nightwork-spec-checker
**Date:** 2026-05-20
**Verdict:** **PASS** (with 2 WARNINGs and 1 NOTE)

Disk-evidence artifact captured retroactively per CLAUDE.md Workflow posture Rule 8(d) ("Disk-evidence > conversation-context"). Agent returned inline summary but did not auto-write to disk; orchestrator records the report verbatim for SOC2 + audit-trail continuity. Recurring gap with this agent (same as Wave-A iter-1 cleanup QA 2026-05-19); flagged for codification parallel to TD-WE-05.

---

## Acceptance criteria (8 derived from nwrp196/197)

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| AC-1 | Migration 00103 + .down.sql exist with reverse-section structure + data-loss contract comment | COVERED | `supabase/migrations/00103_revoke_public_execute_security_definer_triggers.sql` (126 lines) + `.down.sql` (22 lines). Data-loss contract at `.sql:24-25`, `.down.sql:7-9`. Reverse structure present; BEGIN/COMMIT wrapper. |
| AC-2 | Inline §B verification DO block checks all THREE grant patterns (`=%` PUBLIC + `anon=%` + `authenticated=%`) | COVERED | `00103.sql:75-87` — `LIKE '=%'` (PUBLIC), `LIKE 'anon=%'`, `LIKE 'authenticated=%'` all checked in FOREACH loop; any match raises EXCEPTION inside transaction → automatic ROLLBACK. |
| AC-3 | §C structural check confirms 7/7 SECURITY DEFINER functions intact | COVERED | `00103.sql:99-123` — DO block queries pg_proc WHERE prosecdef=true + function name IN list; raises EXCEPTION if fn_count <> 7. |
| AC-4 | Migration applied via `mcp__supabase__apply_migration` with `success:true` | COVERED | Externally verified by orchestrator (post-apply proacl + advisor delta corroborates apply success). |
| AC-5 | Post-apply proacl shows NO `=X` / `anon=X` / `authenticated=X` on all 7 functions | COVERED | All 7 functions show `{postgres=X/postgres,service_role=X/postgres}` — confirmed via mcp__supabase__execute_sql direct query. |
| AC-6 | Advisor re-check confirms 14 target lints cleared | COVERED | mcp__supabase__get_advisors security: 5 trg_pricing_history_* + 2 create_default_* absent from anon_security_definer_function_executable + authenticated_security_definer_function_executable lists (14 lints cleared). |
| AC-7 | STEP 3 smoke confirms trigger registrations + enabled state + historical rows | COVERED | pg_trigger: all 7 registrations intact + state='O' enabled; pricing_history has 119 invoice + 7 proposal historical rows. |
| AC-8 | TD-WAIC-03 in MASTER-PLAN §11 marked CLOSED with corrected resolution language | COVERED | `MASTER-PLAN.md:301` updated with `[CLOSED 2026-05-20 via migration 00103 / nwrp196-197 follow-up]` + full corrected resolution (root cause, severity re-classification, mechanical evidence, convention codification). |

**Score: 8/8 ACs COVERED.**

---

## Findings

### BLOCKING
None.

### WARNING

1. **Down-migration rollback state comment vs yesterday's SUMMARY display gap.** `WA-iter1-cleanup-SUMMARY.md:114` documents post-00102 proacl as `{=X/postgres,postgres=X/postgres,service_role=X/postgres}` — the `=X` IS the PUBLIC grant that 00102 missed but the SUMMARY didn't interpret it as such. Now historically corrected in TD-WAIC-03 closure language; SUMMARY itself retains the misleading display. No functional impact to 00103 correctness.

2. **Down-migration lacks inline verification.** `00103.down.sql` has no §B-style DO block confirming the GRANT re-applied successfully after rollback. Consistent with 00102.down.sql posture (also lacked post-GRANT verification). Low severity: rollback state is the known-degraded state (advisor will re-flag), not a silent failure. Pattern is TD-WAIC-06 territory.

### NOTE

1. **Down-migration name symmetry.** Down file named `00103_revoke_public_execute_security_definer_triggers.down.sql` — name says "revoke" but the down-migration performs GRANTs. Standard convention (down named after up), mildly confusing in isolation. Cosmetic only.

---

## Spec deliverables checklist

- [x] Migration 00103 apply-direction (126 lines)
- [x] Migration 00103 rollback-direction (22 lines)
- [x] Inline §B DO block (all 3 grant patterns)
- [x] Inline §C structural check
- [x] MASTER-PLAN TD-WAIC-03 row CLOSED
- [x] Convention codification language in TD closure

---

## Domain rules spot-check

- Drummond fixtures used: N/A — pure GRANT/REVOKE migration; no fixture data.
- Recalculate-not-increment honored: N/A — no aggregation or financial math.
- Multi-tenant RLS posture: N/A — no RLS policies modified; REVOKE EXECUTE FROM PUBLIC improves posture by closing extraneous grant.
- Design tokens (no hardcoded colors): N/A — SQL migration only.
- Audit log writes on every state change: N/A — GRANT/REVOKE is not a workflow state change.

---

## Verdict reasoning

All 8 derived ACs COVERED with concrete evidence. Migration content technically correct: §B DO block covers exact gap that 00102 missed (PUBLIC `=%`), §C structural check guards against accidental DROP, both checks run inside transaction with fail-fast semantics. MASTER-PLAN TD-WAIC-03 closure language is accurate and complete. Two WARNINGs are pre-existing-pattern observations with no functional impact on 00103.

**Score: 8/8 COVERED | 0 PARTIAL | 0 MISSING. PASS verdict.**
