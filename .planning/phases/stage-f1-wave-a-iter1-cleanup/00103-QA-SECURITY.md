# 00103-QA-SECURITY.md — Migration 00103 Security QA
## Load-bearing reviewer sign-off for TD-WAIC-03 closure

**Migration:** `00103_revoke_public_execute_security_definer_triggers.sql` (98 lines) + `.down.sql`
**QA date:** 2026-05-19
**Reviewer:** Security reviewer (load-bearing — yesterday's finding that became HIGH)
**Verdict:** PASS

---

## Summary

Migration 00103 mechanically closes TD-WAIC-03. All 7 target SECURITY DEFINER trigger-internal functions now show `{postgres=X/postgres, service_role=X/postgres}` in proacl — no PUBLIC, no anon, no authenticated grant. Advisor findings for these functions drop to zero. Trigger registrations intact, SECURITY DEFINER attribute preserved, 126 historical pricing_history rows confirmed. Down migration is symmetric (7 GRANT TO PUBLIC), restores pre-apply broken state without introducing new grants.

---

## Mechanical Test Results

| Test | Description | Result | Evidence |
|------|-------------|--------|----------|
| T1 | §B pattern logic — `=X/postgres` (PUBLIC) CAUGHT | PASS | bash simulation: `=X/postgres` matches `=*` pattern |
| T1 | §B pattern logic — `anon=X/postgres` (anon) CAUGHT | PASS | bash simulation: `anon=X/postgres` matches `anon=*` |
| T1 | §B pattern logic — `authenticated=X/postgres` CAUGHT | PASS | bash simulation: `authenticated=X/postgres` matches `authenticated=*` |
| T1 | §B pattern logic — `postgres=X/postgres` NOT caught | PASS | bash simulation: no pattern matches; correctly allowed |
| T1 | §B pattern logic — `service_role=X/postgres` NOT caught | PASS | bash simulation: no pattern matches; correctly allowed |
| T2 | proacl post-apply — all 7 functions | PASS | All 7: `postgres=X/postgres \| service_role=X/postgres` only. No PUBLIC, no anon, no authenticated. (SQL: `array_to_string(p.proacl::text[], ' \| ')` query on linked project) |
| T3a | Advisor check — 7 target functions absent from flagged list | PASS | Advisor-equivalent query returns 0 rows for the 7 functions |
| T3b | Advisor check — by-design allowlist unchanged at 10 | PASS | Exactly 10 functions returned: autoconfirm_signup, create_client_portal_invite, create_organization_for_new_user, create_signup, default_stages_for_workflow_type, draw_approve_rpc, draw_submit_rpc, draw_void_rpc, mark_client_portal_message_read, submit_client_portal_message |
| T4 | Trigger registrations — 7/7 enabled | PASS | pg_trigger query: all 7 triggers in state `O` (ENABLED origin). Tables: change_order_lines, invoice_line_items, invoices, organizations (x2), po_line_items, proposal_line_items |
| T4 | pricing_history row count | PASS | 126 rows present — trigger-fired historical data intact |
| T5 | Down migration — only GRANTs to PUBLIC | PASS | Static analysis: 7 `GRANT EXECUTE ON FUNCTION ... TO PUBLIC;` lines, 0 non-PUBLIC grants |
| T5 | Down migration — symmetric with up (7/7) | PASS | `grep -c "REVOKE EXECUTE ON FUNCTION"` = 7; `grep -c "GRANT EXECUTE ON FUNCTION"` (.down.sql) = 7 |
| T6 | §B DO block checks all 3 patterns | PASS | Code review: `LIKE '=%'` + `LIKE 'anon=%'` + `LIKE 'authenticated=%'` present; all 3 raise EXCEPTION inside transaction → auto-ROLLBACK if any fires |
| T7 | No collateral damage to other functions | PASS | Broader PUBLIC EXECUTE scan: 28 functions with PUBLIC grant; the 18 non-allowlist functions are all `prosecdef=false` — not SECURITY DEFINER, not advisor-flagged, not in scope |

---

## T2 — Raw proacl Evidence (7 functions, post-apply)

```
public.create_default_approval_chains    -> postgres=X/postgres | service_role=X/postgres
public.create_default_workflow_settings  -> postgres=X/postgres | service_role=X/postgres
public.trg_pricing_history_from_co_line  -> postgres=X/postgres | service_role=X/postgres
public.trg_pricing_history_from_invoice_line -> postgres=X/postgres | service_role=X/postgres
public.trg_pricing_history_from_invoice_status -> postgres=X/postgres | service_role=X/postgres
public.trg_pricing_history_from_po_line  -> postgres=X/postgres | service_role=X/postgres
public.trg_pricing_history_from_proposal_line -> postgres=X/postgres | service_role=X/postgres
```

No `=X/postgres` (PUBLIC) entry. No `anon=X/postgres`. No `authenticated=X/postgres`. Clean.

---

## T4 — Trigger Registration Evidence

All 7 trigger → function pairings confirmed in pg_trigger with state `O` (ENABLED origin):

```
trg_change_order_lines_pricing_history      -> change_order_lines    -> trg_pricing_history_from_co_line
trg_invoice_line_items_pricing_history      -> invoice_line_items     -> trg_pricing_history_from_invoice_line
trg_invoices_pricing_history_on_status      -> invoices               -> trg_pricing_history_from_invoice_status
trg_organizations_create_default_approval_chains -> organizations     -> create_default_approval_chains
trg_organizations_create_workflow_settings  -> organizations          -> create_default_workflow_settings
trg_po_line_items_pricing_history           -> po_line_items          -> trg_pricing_history_from_po_line
trg_proposal_line_items_pricing_history     -> proposal_line_items    -> trg_pricing_history_from_proposal_line
```

pricing_history row count: 126. No data loss.

---

## T7 — Collateral Damage Check (no new attack surface)

The broader `proacl LIKE '=%'` scan returned 28 public-schema functions with PUBLIC EXECUTE. The 18 outside the 10 by-design allowlist are:

```
next_po_number, org_cost_codes_set_updated_at, recompute_budget_line_co_adjustments,
recompute_budget_line_committed, recompute_budget_line_invoiced, recompute_po_invoiced,
touch_org_workflow_settings_updated_at, touch_updated_at, trg_change_order_lines_sync,
trg_change_orders_status_sync, trg_invoice_line_items_budget_sync, trg_invoice_line_items_po_sync,
trg_invoices_status_budget_sync, trg_invoices_status_po_sync, trg_po_line_items_commit_sync,
trg_purchase_orders_commit_sync, update_updated_at, validate_visibility_config
```

All 18 confirmed `prosecdef = false` — NOT SECURITY DEFINER. The advisor flags `anon_security_definer_function_executable` only when `prosecdef=true`. These 18 are pre-existing trigger-invoker functions unaffected by 00103. 00103 did NOT touch them. No new attack surface opened. No collateral damage.

---

## §B Inline Verification Logic Assessment

The DO block in 00103 §B now correctly tests three patterns against each ACL entry:

- `LIKE '=%'` — catches PUBLIC grant (empty grantee prefix before `=`)
- `LIKE 'anon=%'` — catches anon role grant
- `LIKE 'authenticated=%'` — catches authenticated role grant

The DO block runs INSIDE the transaction (`BEGIN` / `COMMIT` wrapping §A). Any RAISE EXCEPTION auto-rolls back the entire transaction, including the §A REVOKEs. This is fail-closed: if verification fails, the migration does not commit.

This is the canonical pattern for TD-WAIC-03 closure. Going forward, any migration revoking PUBLIC from SECURITY DEFINER functions MUST check all three patterns — not just named roles — to avoid a repeat of the 00102 gap.

Root cause of the 00102 miss: the 00102 §B checked `LIKE 'anon=%'` and `LIKE 'authenticated=%'` but not `LIKE '=%'`. Since PUBLIC inheritance is the mechanism by which anon/authenticated get access, revoking named roles while leaving PUBLIC is a no-op. 00103 closes the gap.

---

## Down Migration Assessment

The `.down.sql` restores the pre-apply (post-00102, broken) state:

- 7 `GRANT EXECUTE ON FUNCTION ... TO PUBLIC;` statements
- 0 additional grants to named roles
- Symmetric with up migration (7 REVOKEs in up / 7 GRANTs in down; `grep -c "ON FUNCTION"` confirms)
- Rolling back will cause the Supabase advisor to resume flagging these 7 functions — which is the documented known-degraded rollback state. Acceptable for rollback safety purposes.

---

## TD-WAIC-03 Gap Closure Attestation

Yesterday's QA cycle classified TD-WAIC-03 as MEDIUM-1 (forward-looking). Post-application evidence confirms it was a real bypass: anon and authenticated roles could call 7 SECURITY DEFINER trigger-internal functions via PUBLIC inheritance. Migration 00103 revokes PUBLIC EXECUTE on all 7, closes the inheritance path, and the inline §B verification block mechanically enforces this post-apply with fail-closed ROLLBACK semantics.

**The gap that existed after 00102 is now closed. TD-WAIC-03 resolved.**

---

## Final Verdict: PASS

All 7 mandatory mechanical tests pass. No NEEDS-WORK items. No BLOCKING items.
