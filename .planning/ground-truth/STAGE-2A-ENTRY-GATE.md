# Stage 2A Entry Gate — Invoice/Bill flow verification scoping

**Date:** 2026-06-11
**Authorization chain:** nwrp266 §15-17 (revised order; 2A after 2C) + §11-13 (smoke-login provisioning gate BINDS 2A) + nwrp274 (produce this gate, $10 cap, DO NOT execute).
**Proposed ceiling:** $35 (2C ran $15-18 read-mostly; 2A is mutation-heavier — login probes + API-path flow drives + fixture prep. HIGH-threat 2x heuristic from the Slice-2 estimation lesson applied to a $15-18 base).
**Status: AWAITING JAKE AUTHORIZATION — 2A does not execute until approved.**

## Scope framing

2A verifies the **invoice/bill flow**: intake states → PM/QA approval transitions → allocation authoring → caches → audit trails — against 57 real RB invoices (read-only) + 5 smoke invoices (mutation targets). The gold-standard review surface (P2, walk-verified) is the render anchor; 2A tests the WORKFLOW around it. Carry-forwards from 2C land here: D2's sharpened question (can approval complete with zero allocation?), the app-layer audit-trail boundary (SQL-path doesn't append status_history; API-path must), and the invoiced-cache trigger under API-path transitions.

## Binding pre-flight gate — smoke-login probes (nwrp266 §13)

**All 9 smoke accounts must authenticate before any other 2A row runs.** Current state: all 9 confirmed, **zero have ever signed in**; only `harness-fixture@nightwork.local` has a proven interactive login.

- **Mechanism:** scripted `signInWithPassword` per account against production Supabase — the first real increment of **SmokeAuthHelper** (mandated by nwrp238; env-var convention per PLANNING-PIPELINE-TIERING.md §229/§241: `SMOKE_PASSWORD` = the orchestrator-generated shared password from the smoke-seed PASSWORD LIFECYCLE, cleartext held by Jake / secrets store, NOT in repo).
- **Credential pre-check:** secret-presence verification uses the nwrp139 canonical `if [ -n ... ]` form ONLY (never `${VAR:+...}${VAR:-...}` — that pattern leaked a password once).
- **HALT conditions:** cleartext unavailable → halt (Jake provides or rotates via smoke-seed re-apply, which upserts new bcrypt hashes). Any account fails auth → halt + re-authorize per nwrp266 §13.
- Accounts: smoke-pm-{alpha,beta,gamma,delta,epsilon,zeta,eta} (pm), smoke-accounting (accounting), smoke-owner (owner) — all fixture-harness-org.

## DB-says expectations (live, 2026-06-11)

| Fact | Value |
|---|---|
| RB invoices (active) | **57** — status distribution: qa_approved 55, qa_review 2 |
| Smoke invoices (fixture org) | **5** |
| RB invoices with NEITHER cost_code_id NOR line items | 0 (every invoice has at least invoice-level coding) |
| D2 backlog: spent RB invoices with zero line-item allocations | 13 ($76,970.00) + $18,096.64 partial shortfall = $95,066.64 invisible to budget rollups |
| Fish draw-invoice value uncoded+uncovered (absent from per-line G703) | $11,300.23 (2C-7 adjacent finding) |
| status_history on SQL-path transitions | EMPTY (2C-2 boundary — app layer must append; that's what 2A tests) |
| Smoke org fixtures | 8 jobs, 5 invoices, 2 submitted draws, **0 budget lines** (2A-7 needs fixture prep) |

## Test matrix

| # | Test | Method | Mutation? | Expected / notes |
|---|---|---|---|---|
| 2A-0 | **BINDING** 9-account login probe | SmokeAuthHelper increment | no | all 9 authenticate or HALT |
| 2A-1 | **D2 sharpened:** can approval complete with zero cost-code allocation? | drive one smoke invoice pm_review→pm_approved→qa_approved via API with no allocation | smoke only | documents the hole (current code likely permits — the 13 prove it happened); enumerate the exact gate-less transition points |
| 2A-2 | App-layer audit trail | same transitions as 2A-1 | smoke only | status_history appends {who, when, old, new} per hop; activity_log rows fire; pm_overrides/qa_overrides capture edits |
| 2A-3 | Allocation authoring path | exercise whatever UI/API writes invoice_line_items on a smoke invoice | smoke only | path exists and writes budget_line_id-keyed rows — or documented ABSENT (feeds D2 disposition) |
| 2A-4 | Confidence routing (≥85 / 70-84 / <70) | inspect routing logic + smoke invoice confidence values | no | routing behavior matches CLAUDE.md contract or documented unwired |
| 2A-5 | Duplicate detection (vendor+number+amount+date) | submit a duplicate smoke invoice | smoke only | block + notify per contract |
| 2A-6 | QA kickback + role rule | qa_review → qa_kicked_back → pm_review on smoke invoice; QA attempts cost-code change | smoke only | kickback works; QA blocked from changing PM-approved codes/amounts |
| 2A-7 | invoiced-cache under API-path transitions | seed ONE smoke budget line (fixture prep, ZZ-2A prefix), allocate a smoke invoice line, cross pm_approved | smoke only | `budget_lines.invoiced` moves exactly; returns exactly on reversal (2C-2 exact-return discipline) |
| 2A-8 | Review-surface render (gold standard) | Jake authed walk: one qa_review RB invoice at /financials/bills/[id] | no | parse-confidence + status timeline + overrides UI render per P2 |
| 2A-9 | Payment-schedule math (by 5th→15th, by 20th→30th, weekend roll) | SQL over RB invoices' received_date vs payment_date | no | computed dates match policy; exceptions enumerated |

**Mutation discipline:** ALL mutations on fixture-harness-org ONLY. RB rows are READ-ONLY throughout 2A (pre-launch real data). Scratch artifacts carry `ZZ-2A-` naming (2C-2 precedent), end voided/soft-deleted, residue documented; cache rows must return to exact pre-test values or IMMEDIATE HALT.

## Halt conditions

- 2A-0 probe failure (binding — nwrp266 §13 re-authorization).
- Any test step that would mutate an RB-org row (scope breach — halt, do not improvise).
- Any cache (invoiced / approved_cos_total) fails exact-return after cleanup.
- Cross-finding BLOCKING-class: a transition that moves money-bearing state with NO audit row (status_history AND activity_log both silent) — that is a financial-auditability break per CLAUDE.md, not a routine finding.
- Ceiling approach per Rule 7.

## Exit criteria

`PART-2A-INVOICES.md` in `.planning/ground-truth/`: matrix PASS/FAIL per row, the 2A-1 hole disposition (with recommended gate placement if confirmed), SmokeAuthHelper increment committed (it persists as the seed of the tiering-implementation deliverable), carry-forwards for 2B named.

**Awaiting authorization to execute 2A as scoped (proposed $35 ceiling).**
