# Spec check — stage-f1-wave-a-iter1-cleanup

**Reviewer:** nightwork-spec-checker
**Date:** 2026-05-19 14:07
**Phase commits reviewed:** `a8ae5b1` (migration 00102) + `56de959` (docs + SUMMARY)
**Verdict:** **PASS** (with 2 WARNINGs and 3 NOTEs)

Disk-evidence artifact captured retroactively per CLAUDE.md Workflow posture Rule 8(d) ("Disk-evidence > conversation-context"). Spec-checker agent returned inline summary but did not auto-write to disk; orchestrator (this file) records the report verbatim for SOC2 + audit-trail continuity. Cross-ref: TD-WE-05 (codified disk-write discipline for plan-review reviewers; equivalent codification needed for QA reviewers per qa-runs 2026-05-19-1407 disposition).

---

## Acceptance criteria

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| AC-WA-iter1-01 | Migration 00102 applied; all 8 functions show non-null `proconfig` containing `search_path=...` in `pg_proc` | COVERED | Migration lines 51-224 issue `CREATE OR REPLACE FUNCTION` with `SET search_path = ...` clause for all 8 functions. Inline §A DO block (lines 226-266) runs inside transaction and raises EXCEPTION if any function lacks the clause — fail-fast gate. SUMMARY attestation: "8/8 rows with search_path=public,...,pg_temp." |
| AC-WA-iter1-02 | `get_advisors security` post-apply returns ZERO `function_search_path_mutable` entries | COVERED | SUMMARY §"Advisor delta": pre 8 → post 0, delta −8. Executor ran `mcp__supabase__get_advisors` post-apply per verification commands in PLAN §8. |
| AC-WA-iter1-03 | All 5 `trg_pricing_history_from_*` functions show NO `EXECUTE` privilege for anon/authenticated in `pg_proc.proacl` | COVERED | Migration lines 278-291: REVOKE EXECUTE on all 5. Inline §B DO block (293-335) checks for `anon=%` or `authenticated=%` in proacl and raises EXCEPTION if found. SUMMARY: "proacl: {=X/postgres,postgres=X/postgres,service_role=X/postgres} for all 5; no anon= or authenticated= entries." |
| AC-WA-iter1-04 | Both `create_default_*` functions show NO `EXECUTE` privilege for anon/authenticated | COVERED | Migration lines 288-291: REVOKE EXECUTE on `create_default_approval_chains()` and `create_default_workflow_settings()`. Same §B DO block covers both. |
| AC-WA-iter1-05 | Trigger functions still fire correctly (insert into proposals/invoice_lines → pricing_history row created) | PARTIAL (scope-contracted deferral) | Migration §D (lines 383-401) confirms structural integrity: 5 `trg_pricing_history_from_*` SECURITY DEFINER functions exist + `prosecdef = true`. Live row-INSERT fire test explicitly deferred to QA harness per `requires_smoke: false` scope contract and nwrp174 authorization. SUMMARY AC-05 marks this PASS with caveat. |
| AC-WA-iter1-06 | `get_advisors security` post-apply returns ZERO `anon_security_definer_function_executable` entries for the 7 revoked functions | COVERED | SUMMARY §"Advisor delta": pre 7 → post 0. Remaining by-design anon-callable set enumerated (autoconfirm_signup, create_client_portal_invite, create_organization_for_new_user, create_signup, default_stages_for_workflow_type, draw_*_rpc, mark_client_portal_message_read, submit_client_portal_message). |
| AC-WA-iter1-07 | `pg_extension` shows `pg_trgm` + `vector` in `extensions` schema | COVERED | Migration lines 341-351: CREATE SCHEMA extensions, ALTER EXTENSION pg_trgm SET SCHEMA extensions, ALTER EXTENSION vector SET SCHEMA extensions. Inline §C DO block (353-372) verifies and raises EXCEPTION on mismatch. |
| AC-WA-iter1-08 | `get_advisors security` post-apply returns ZERO `extension_in_public` entries | COVERED | SUMMARY §"Advisor delta": pre 2 → post 0, delta −2. |
| AC-WA-iter1-09 | Existing indexes using trgm/vector operator classes still functional; EXPLAIN ANALYZE resolves | COVERED | SUMMARY AC-09: all 4 indexes (`idx_item_aliases_text_trgm`, `idx_items_canonical_trgm`, `items_embedding_idx`, `idx_pricing_history_description_trgm`) remain in `pg_indexes`; operator classes resolve from `extensions` schema; EXPLAIN on representative query returns valid plan. Migration line 347 sets `ALTER DATABASE postgres SET search_path TO "$user", public, extensions` before the extension move. |
| AC-WA-iter1-10 | CLAUDE.md updated with search_path standard rule | COVERED | CLAUDE.md lines 537-542 (verified via Grep): "SECURITY DEFINER functions MUST set explicit `search_path`. Per Supabase advisor 0011 (`function_search_path_mutable`) + migration 00034 canonical pattern + migration 00102 sweep cleanup (MED-WA-1 closure)." |
| AC-WA-iter1-11 | Down migration `00102_*.down.sql` exists with reverse-section structure + data-loss contract comment | COVERED | File: `supabase/migrations/00102_wa_iter1_security_cleanup.down.sql` (204 lines). Sections present: §C-reverse (15-27), §B-reverse (29-46), §A-reverse (48-202). Data-loss contract comment at lines 10-13. Single BEGIN/COMMIT wrapper (lines 15, 204). |
| AC-WA-iter1-12 | No application code changes required (sweep §3 confirmed zero src/ hits for the 7 REVOKE-EXECUTE functions) | COVERED | SUMMARY AC-12: pre-apply grep against src/ for `rpc('trg_pricing_history_*')` / `rpc('create_default_*')` returned zero matches. Only src/ change is `database.types.ts` (mechanical regen — removal of `show_limit`/`show_trgm`, not an application call-site change). |
| AC-WA-iter1-13 | Smoke harness 11/13 baseline maintained (TD-WE-03 set; no regressions from migration apply) | PARTIAL (scope-contracted deferral) | `requires_smoke: false` in plan frontmatter; smoke harness re-run scheduled for post-Slice-2 dispatch per nwrp174 sequencing. No evidence of post-apply smoke run. Jake-authorized scope-contraction, not executor omission. |
| AC-WA-iter1-14 | Custodian sweep confirms MED-WA-1 marked RESOLVED in GATE-A-HALT.md | COVERED | `.planning/phases/stage-f1-knowledge-graph-auth-wave-a/GATE-A-HALT.md` line 122 (verified): "→ RESOLVED 2026-05-19 via standalone phase stage-f1-wave-a-iter1-cleanup migration 00102. 8 functions hardened, 7 REVOKE EXECUTE applied, pg_trgm + vector moved to `extensions` schema." Line 224: second CLOSED reference for B-7 candidate. Both updated in commit 56de959. |

**Coverage: 12/14 COVERED, 2/14 PARTIAL (AC-05 and AC-13 — both scope-contracted deferrals).**

---

## Findings

### BLOCKING

None.

### WARNING

1. **WARNING-1 — Missing structured `<criteria>` block (D-17/D-18/D-19 mandate):** PLAN.md authored after stage-1.5c-verification-harness shipped and contains no `<criteria>` yaml block with mechanical/dom/visual/behavioral/semantic categories. Mechanically BLOCKING per D-17/D-18. Treated as WARNING because: (a) all 5 harness categories are demonstrably N/A for a pure DB migration, (b) the `<criteria>` loader convention explicitly accepts N/A entries, (c) 14 prose ACs exist and are falsifiable. Routed to TD-WAIC-01.

2. **WARNING-2 — AC-WA-iter1-05 live trigger-fire not verified:** Criterion text says "Trigger functions still fire correctly (insert into proposals → pricing_history row created; insert into invoice_lines → pricing_history row created)." Migration §D confirms structural presence (functions exist + prosecdef = true) but does NOT execute an actual INSERT to verify the trigger fires end-to-end. Scope-contracted deferral per `requires_smoke: false` and nwrp174 authorization, but the criterion text makes no mention of deferral. Routed to TD-WAIC-07.

### NOTE

1. **NOTE-1 — `database.types.ts` not in `files_modified` frontmatter:** PLAN frontmatter `files_modified` lists only the two migration SQL files. Type-regen is a mandatory side-effect (CLAUDE.md "Schema changes regenerate types") correctly added by executor; SUMMARY covers it under "Deviations from Plan." Consider listing it in `files_modified` for future plans involving extension moves to set pre-flight expectation.

2. **NOTE-2 — Down migration restores `RESET search_path` rather than the previous value:** `00102_wa_iter1_security_cleanup.down.sql` line 27 uses `ALTER DATABASE postgres RESET search_path`. Correct for this environment (pre-apply DB had no explicit override) but potentially incorrect in environments with custom prior search_path. Cross-reviewer agreement with security-reviewer LOW-1. Routed to TD-WAIC-02.

3. **NOTE-3 — `B-7 CLOSED` annotation in GATE-A-HALT.md:** Line 224 marks the "B-7 candidate" (function search_path sweep) as CLOSED. Correct — MED-WA-1 was the B-7 candidate routed to this standalone phase.

---

## Spec deliverables checklist

- [x] Migration `00102_wa_iter1_security_cleanup.sql` (403 lines) — PASS
- [x] Migration `00102_wa_iter1_security_cleanup.down.sql` (204 lines) — PASS
- [x] CLAUDE.md Dev Rules bullet — PASS (lines 537-542)
- [x] GATE-A-HALT.md MED-WA-1 RESOLVED — PASS (lines 122 + 224)
- [x] `database.types.ts` regen — PASS (2-line removal landed with migration commit per type-regen hook)
- [x] `WA-iter1-cleanup-SUMMARY.md` — PASS

---

## Verdict

**PASS** — All 14 ACs accounted for. 12/14 fully COVERED with concrete evidence. 2/14 PARTIAL via Jake-authorized scope-contraction. Migration structurally sound: single atomic transaction, fail-fast inline verification DO blocks, function bodies preserved verbatim, correct REVOKE scope, correct extension schema move with `search_path` pre-set. No over-build. No domain rule violations.

Coverage matrix: **12/14 COVERED | 2/14 PARTIAL | 0/14 MISSING**.
