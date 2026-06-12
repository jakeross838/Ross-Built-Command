# PART 2A — Invoice/Bill flow verification results

**Date:** 2026-06-12
**Authorization:** nwrp275 (executed as gated at `4b71465`, $35 ceiling, three conditions).
**Spend:** ~$26-30 against $35.
**Verdict: binding gate 9/9 PASS; 7 of 9 matrix rows landed (2A-8 pending Jake's walk; 2A-4 partial by fixture gap). One significant NEW finding (F2A-1: QA edit restriction not enforced server-side). All mutations fixture-org, exact-return verified, cleanup clean — the immediate-halt clause never fired. RB rows untouched.**

## Pre-loaded findings (nwrp275 condition 3 — surfaced before the matrix ran)

1. **RB has ZERO pre-qa invoices** (all 57 are qa_approved 55 / qa_review 2) — the intake → PM-approval flow had never executed on production data until this stage drove it fixture-side.
2. **`require_budget_allocation = FALSE` on every org** (org_workflow_settings) — the D2 mechanism named: the allocation gate EXISTS in code (action route :158-172), is org-configurable, and is off. The disposition lever is a settings flip, not a build.
3. **The workflow-gate block FAILS OPEN on settings-read error** (action route :174-179 — try/catch warns and proceeds, skipping date/duplicate/PO/allocation gates). Code-read finding; the fail-closed doctrine (Rule 8) argues for 422-on-error here. → F2A-2.

Otherwise: no pre-loaded surprises beyond the 2C carry-forwards already filed.

## Binding gate — smoke-login probes (2A-0): **PASS 9/9**

All nine smoke accounts authenticated against production Supabase on first attempt (`scripts/smoke-auth-probe.mjs` — SmokeAuthHelper increment #1, committed). The nwrp266 §13 provisioning concern is CLOSED: `last_sign_in_at IS NULL` meant never-used, not broken. Credentials resolved per the documented lifecycle (orchestrator credentials file; last-wins parse; nothing printed).

## Matrix results

| # | Test | Result |
|---|---|---|
| 2A-0 | Smoke-login probes | **PASS 9/9** (binding gate) |
| 2A-1 | Can approval complete with zero allocation? | **YES — demonstrated live on production app path.** Approve as smoke-pm-beta: 422 without job/cost-code → 422 without invoice_date (`require_invoice_date=true`) → 422 while flagged duplicate → after dismiss, **200 with ZERO line allocations** (`require_budget_allocation=false`), auto-advanced pm_approved→qa_review. The three active gates all fired; the allocation gate is configured off. This is exactly how D2's 13 happened. |
| 2A-2 | App-layer audit trail | **PASS** — status_history appended exact Q12 shape `{who, when, old_status, new_status, note}` per hop including the system auto-route entry; activity_log rows fired per transition (3→5 over the run); `qa_overrides` captured old/new on the QA edit. The 2C-2 boundary closes: SQL-path silent, app-path complete. |
| 2A-3 | Allocation authoring paths | **PASS by existence** — `/api/invoices/[id]/allocations` (cost-code splits on `invoice_allocations`, with backward-compat materialization) + `/api/invoices/[id]/line-items` (budget-line-keyed `invoice_line_items`). Authoring paths exist; the D2 hole is the optional gate, not missing plumbing. |
| 2A-4 | Confidence routing | **PARTIAL (fixture gap)** — bands live in queue UI per contract (code-read); smoke invoices ALL have confidence 0.00, so routing cannot be exercised against varied data. Fixture extension flagged (seed varied confidence values). |
| 2A-5 | Duplicate gate + dismiss | **PASS** — flagged invoice 422s on approve ("dismiss the flag or deny"); `/dismiss-duplicate` 200; post-dismiss approve proceeds. (Detection WRITER lives at save-time in `src/lib/invoices/save.ts` — gate+dismiss exercised; writer noted code-read.) |
| 2A-6 | QA kickback + role rule | **kickback PASS / role rule FINDING (F2A-1)** — kick_back from qa_approved → pm_review with note + audit ✓. BUT `qa_approve` as smoke-accounting WITH `updates.total_amount` change **succeeded**: amount changed 2500000→2400000. CLAUDE.md: QA "CANNOT change PM-approved cost codes or amounts — must kick back." Not enforced at the API layer (the UI may hide fields; the API permits). Transparency intact (qa_overrides logged the change) — restriction absent. |
| 2A-7 | invoiced-cache under app-path transitions | **PASS — exact both directions.** ZZ line item ($500.00) on the spent-status invoice → `invoiced` 0→50000 exactly (line-items trigger); kick_back dropped status out of the spent set → 50000→0 exactly (status-sync trigger); soft-delete left 0. |
| 2A-8 | Gold-standard render walk (RB qa_review bill) | **PENDING Jake** — queued: open either qa_review RB bill at /financials/bills/[id]; parse-confidence + status timeline + overrides UI per P2. |
| 2A-9 | Payment-schedule math | **PASS with caveat** — 0 of 51 payment dates fall on weekends (roll respected); 50/51 sit in the month-end (≈30th) window consistent with the by-20th rule; 6 invoices have no payment_date (early-status). Caveat: SQL bands are cruder than the engine's calendar logic — a per-invoice engine-vs-policy audit would need the compute function replayed, not justified at this depth. |

## Findings ledger

- **F2A-1 (MEDIUM-HIGH):** QA role edit-restriction not enforced server-side (2A-6). Recommend: action route rejects `updates` touching cost_code_id/total_amount when actor's role is accounting and invoice is PM-approved — same 422 pattern as the other gates. Routes naturally with the gates work below.
- **F2A-2 (MEDIUM):** workflow gates fail OPEN on settings-read error (route :174-179). One-line posture flip (422 on settings unreadable) aligns with Rule 8 fail-closed doctrine.
- **F2A-3 (disposition lever):** `require_budget_allocation=false` everywhere. **Recommend flipping TRUE for ross-built before Diane dogfood** (pairs with the D2 13-invoice backfill + TD-NW-CO-LINE-ALLOCATION's before-dogfood deadline; after the flip, un-allocated approves 422 — exactly the guard the dogfood needs).
- **F2A-4 (fixture gaps):** smoke org has zero cost codes (ZZ seeded/removed for this run — permanent minimal fixtures would simplify 2B-2E) + all smoke confidence values 0.00 (blocks routing tests).

## Fee question prep (nwrp275 — your 15/20 call pending)

Uniformity query run: **ALL 15 active RB jobs store exactly deposit 0.1000 / gc_fee 0.2000** — uniform across every job, which is the systemic-import-default signature your if-15 path describes (real contracts vary: Fish COs run 15%, CLAUDE.md notes 18/20/no-fee variants). Both paths prepped: if-15 → data-fix scope is ALL jobs, routes with the N3 convention TD (display now shows wrong data at correct scale until the data fix); if-20 → per-CO under-billing math doc (72 Fish COs × base × 0.05) ships as standalone escalation.

## Mutation residue (documented; append-only audit stays by design)

Beta invoice: restored to exact pre-state (pm_review, $25,000.00, no cost code/date, dup flags clear, overrides null); `status_history` retains 5 entries + activity_log 5 rows — the permanent audit record OF this test (2C-2 precedent). ZZ rows (cost code ZZ999, budget line, line item) soft-deleted; smoke org back to 0 active cost codes / 0 budget lines; ZZ invoiced cache 0.

## Carry-forwards

- **2B (price intel):** none from this stage.
- **2D (POs + COs):** F2A-1 role-gates work + N2 fee-labeling + TD-NW-CO-LINE-ALLOCATION runtime trigger check (Rule 10 flag) all converge there.
- **2E (draws):** F10 verified ✓ (its gate already satisfied); D3 staleness affordance; the 4 uncoded scope rows' backfill disposition feeds the draw chain.
- **Before-dogfood checklist forming:** flip `require_budget_allocation` (F2A-3) + backfill D2's 13 + TD-NW-CO-LINE-ALLOCATION both workstreams + fee data-fix (pending the 15/20 answer).
