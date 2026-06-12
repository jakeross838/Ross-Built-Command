# NIGHTWORK — STATE AND LAUNCH PATH (canonical synthesis)

**Date:** 2026-06-12 · **Authorization:** nwrp280 PART 4 (ceiling $35) · **Supersedes-for-state:** STATE.md's 2026-05-27 snapshot and MASTER-PLAN §9's pre-GTV framing for everything GTV touched. Evidence pointers are the PART/STAGE docs in this directory plus commits on `main`.
**Sources:** PART-1-INVENTORY, PART-1.5-WALK, F-INV-1-RETRO-SWEEP, APPSHELL-OWNERSHIP-INVESTIGATION, PART-2A/2B/2C/2D (+2E results in the consolidated nwrp280 report), STAGE gates, MASTER-PLAN §9-12, TD files, nwrp256-280.

---

## (a) VERIFIED inventory — what Nightwork provably is at HEAD

**Verification standard:** (a)-VERIFIED = runtime-confirmed on Production with real or fixture data; cited row-level evidence. Everything else is explicitly NOT in this table.

| Surface / chain | Status | Evidence |
|---|---|---|
| Invoice review (gold standard) `/financials/bills/[id]` | VERIFIED, real data (E-3 wired) | walk P2; 2A-8 render pending Jake but route+data verified |
| Invoice workflow: gates (job/cost-code, date, duplicate+dismiss, CO-ref), transitions, auto-route pm_approved→qa_review | VERIFIED live on app path | PART-2A 2A-1/2A-5/2D-8; gates 422 correctly |
| Invoice audit trail: status_history Q12 shape + activity_log + overrides capture | VERIFIED | PART-2A 2A-2 |
| QA role rule (no QA edits at qa_approve) | VERIFIED **after fix** `804f80e` | F2A-1 closed-loop 422 |
| Batch approval: 5 gates + fail-closed settings | VERIFIED after `e917214` | F2B-1 closed-loop |
| Budget math: trigger caches exact (CO cache both columns; invoiced cache vs own rule 0/144) | VERIFIED to the cent | PART-2C 2C-2/2C-5; PART-2A 2A-7 |
| Contract identity original+COs==current, all jobs | VERIFIED exact | 2C-3 |
| CO line-allocation trigger chain | VERIFIED — first-ever fire matched hand-calc both directions | PART-2D 2D-1 |
| CO/PO app lifecycle + role gates (403s present; approved-CO lock; fee math 0.15 exact; PCCO sequence) | VERIFIED | PART-2D 2D-2/3/5/6 |
| Draw G703 line math from source rows | VERIFIED cent-exact | 2C-7 (nwrp274 upgrade) |
| Pay App detail + print on real data (F10) | VERIFIED | nwrp273 walk e/f |
| Draw lifecycle mutations: create→submit→approve→void + send_back reject path + one-open-draw-per-job rule | VERIFIED (fixture) | 2E-2 (nwrp280 report) |
| Pay-app workbook ingestion fidelity (Fish App 21, Dewberry App 10) | VERIFIED exact on all anchors; cross-workbook chain ties (App 9→10) | Q2 replay; PART 3 |
| Price-intel panel + queue counts + spine ingestion on approval path | VERIFIED exact (61/6/80/$554.04) | PART-2B; row-127 trace |
| Smoke auth: 9 accounts + production cookie-replay driver | VERIFIED | 2A-0; SmokeAuthHelper incs 1-3 |
| Payment-schedule posture | VERIFIED-with-caveat (0 weekend payments; 50/51 in policy window; engine-level audit not run) | 2A-9 |
| HIDE gates + owner-portal 404 + AppShell single-chrome | VERIFIED | nwrp273 walk a-d; Phase 1 + 882bf24 + 34ac517 |
| Extraction pipeline coverage | VERIFIED counts: 59 extractions blanket all 57 RB invoices; 87 lines (83 pending / 4 verified); auto-commit never fired | PART 3 |

**Known-NOT-verified (honest negatives):** per-job budget/bills/pay-apps/activity tabs (placeholders, F1 wiring TD); PO consumption math (RB has zero POs); lien releases (NO create path exists — F2E-1); confidence routing behavior (fixtures all 0.00); draw export route parity (2E Row 3 cut — shares draw-calc helpers, code-read only); RLS load behavior at scale (503 claim untested at load).

## (b) Consolidated TD ledger (deadline-ordered)

| TD | Severity | Deadline / gate | Notes |
|---|---|---|---|
| TD-NW-CO-LINE-ALLOCATION (+ D2 companion + uncoded-rows family incl. Dewberry Urns/Generator) | HIGH | **BEFORE DOGFOOD**; backfill gates on 2D ✔ (cleared, stamp pending) | the launch-spine TD |
| TD-NW-PER-JOB-TAB-WIRING (+F2D-2 affordance) | MED-HIGH | **BEFORE DOGFOOD** | 4 surfaces ~1day each; data layers exist |
| Lien-release create/generation path (F2E-1) + unwired `require_lien_release_for_draw` (F2E-2) + invoice-unlink-on-void (F2E-3) | MEDIUM | before first REAL draw compilation (F6 family) | new from 2E; no TD file yet — file at F6 scoping |
| N3 fee/deposit convention + data-fix (uniform 0.20/0.10 import default) | MEDIUM | blocked on **fee answer (15/20)** — twice-unfilled placeholder | display fixed at correct scale; data wrong until answer |
| TD-WB-LISTENER-PHASE1-INTERACTION | HIGH-ish, MITIGATED (listener off) | before re-enabling W.1 | D2 bisect + D3 bundle diff queued |
| TD-PLANNING-PIPELINE-SEVERITY-TIERING (tiering-implementation) | process | BLOCKING **on 3-series dispatch only** (nwrp233) — see (f) | design APPROVED Rev 3; SmokeAuthHelper partially built (incs 1-3) |
| TD-NW-SETTINGS-CALLER-HARDENING (+F2D-1 role-layer alignment) | LOW–MED-LOW | F2-era roles work | enforcement callers already closed |
| TD-WD-01 invoices/[id] dead code; TD-WD-02 hex-fallback sweep; TD-WB-WIZARD-CLIENT-CONTACT; TD-NW-HIDE-4-ASSERTION-SMOKE (proposed) | LOW | Wave 1.1-Lite | cosmetic/cleanup |

**Stale-claim reconciliations (MASTER-PLAN vs GTV):**
- **Dashboard 503s:** MASTER-PLAN D-017/§11 records root cause as **RLS policy-stack overhead, NOT missing indexes**. GTV: zero 503s reproduced across every walk and stage; index coverage verified comprehensive (2C-6, 2B-5); EXPLAIN clean at current scale. Reconciled status: *historical, mitigated-by-circumstance, untested at load* — not "current pain." The §11 row should say so; the index-plan rule stays as prophylaxis; a load-shaped RLS test belongs to pre-Builder20 hardening, not pre-dogfood. No VERIFIED-vs-VERIFIED contradiction (the 503 claim was never runtime-verified at GTV scale).
- **STATE.md** (2026-05-27) predates GTV entirely — its "Next: Phase 2 pending tiering" framing is superseded by (e)/(f) below pending Jake's stamp.

## (c) HUMAN-SIDE OPERATIONAL CHECKLIST (Jake/Andrew — standalone)

1. **Fee answer: is Fish's contract fee 15% or 20%?** (twice-unfilled placeholder; gates the N3 data-fix vs the under-billing escalation doc — if 20%, ~$36K under-billed across 72 COs at base×0.05.)
2. **72-CO line backfill (Fish)** — map each approved CO to budget lines (or explicit unallocated flag). Trigger validated 2D-1. Before dogfood.
3. **13-invoice allocation pass** — IDs tabled in PART-2C D2 ($76,970 + $18,096 partial). Before dogfood.
4. **Louver/pergola/planters + Urns/Generator rows** — decide coded-budget-line vs C-suffix treatment for Fish's 4 ($479,900/$319,571 prev) and Dewberry's 2 ($58,000/$0 prev) uncoded scope rows. Before dogfood (rides the backfill session).
5. **Flip `require_budget_allocation=TRUE` on ross-built** — AFTER 2-4 complete (ordering is load-bearing; one UPDATE).
6. **BT $73,232.23 reconciliation** — the Fish cover-vs-G703 prior-app drift inside Buildertrend's own export (PART-2C Q2 decomposition). Bookkeeping-side answer lives in BT, not Nightwork.
7. **Walk leftovers:** 2A-8 gold-standard render eyeball; 2B-3 price spot-walk (incl. the 2027-dated + two $0.00 observations); paper-cuts verify items (PCCO #11/#65 text, fee/deposit percent-scale) — placeholders unfilled since nwrp275.

## (d) KILL LIST (orphans + off-path scaffolds — custodian sweep, post-stamp)

**Orphaned-by-redirect real surfaces (7, from F-INV-1 D.4):** `cost-intelligence/{suggestions,scope-data,conversions}` (real queries, zero reachable URLs; conversions' legacy URL even redirects to a placeholder), `cost-intelligence/codes`+`CodesManager` (admin/cost-codes supersedes), `settings/{admin,company,financial,internal-billings,workflow}` second-hop component pairs (308'd to /admin*). Disposition: delete or resurrect per F5/F2 roadmaps — F5 likely resurrects suggestions/scope-data; the settings family deletes.
**Dead-route sources:** `dashboard`, `operations`, `invoices/*` pages, `draws/{page,[id]}` (TD-WD-01) — all 308'd; `draws/new` stays (re-export target). **Off-path scaffolds:** `financials/reconciliation` fixture strawman (decision: keep-as-demo vs gate vs delete); smoke `zz-*` scripts stay (SmokeAuthHelper seeds).

## (e) ORDERED CRITICAL PATH — today → dogfood → nightwork.build → QB → Builder20

| # | Item | Owner | Est cost/time |
|---|---|---|---|
| 1 | Fee answer + walk leftovers (c.1, c.7) | Jake | 30-60 min |
| 2 | Backfills: 72-CO + 13-invoice + 6 uncoded rows (c.2-4) | Jake/Andrew (data) + ~$8-12 agent assist (entry tooling/import script if wanted) | 0.5-1 day human |
| 3 | Settings flip (c.5) + N3 data-fix per fee answer | agent, $3-5 | minutes |
| 4 | **Per-job tab wiring** (TD-NW-PER-JOB-TAB-WIRING: budget/bills/pay-apps/activity) | agent, bootstrap-LOW pipeline, $40-60 | 2-4 days |
| 5 | **DOGFOOD START (Diane)** — entry checklist = items 1-4 + smoke-login probes rerun | — | — |
| 6 | Dogfood-period fixes + lien create/generation design (F2E-1, F6-lite slice) | agent, $30-50 | 1-2 wks elapsed |
| 7 | nightwork.build cutover (domain + marketing shell + onboarding polish; org-creation path now defaults gated per 00109) | agent, $20-35 | 2-3 days |
| 8 | Interaction-bug root-cause (TD-WB-LISTENER, D2 bisect) — before W.1 re-enable | agent, $15-25 | 1 day |
| 9 | **tiering-implementation** (see (f)) — before ANY 3-series dispatch | agent, $25-40 | 1-2 days |
| 10 | 3-series (3A/3B Provenance Ledger…) under tiered pipeline → QB integration wave (Wave 5) → Builder20 multi-tenant onboarding (load-shaped RLS test from (b) rides here) | per-phase gates | — |

## (f) THE ARGUMENT: re-sequence tiering-implementation BEHIND per-job wiring

**Current lock (nwrp256 §4):** GTV → (a) interaction-bug → (b) tiering-implementation, with tiering BLOCKING 3-series (nwrp233). **Proposed:** GTV → **per-job wiring + dogfood-enablement ops** → (a) → (b) → 3-series. Argued, not assumed:

1. **The deadline asymmetry is the whole case.** Every before-dogfood hard deadline in the ledger attaches to the wiring/backfill family. Tiering's own gate (nwrp233) binds *3-series dispatch* — nothing in nwrp233 binds dogfood. Running tiering first delays the only deadline-bearing work for a gate that isn't on its path.
2. **Bootstrap discipline just carried a 10-stage verification program.** GTV ran HIGH-tier-posture work under bootstrap mode: every ceiling held (full ledger below), zero discipline breaches, halt gates fired correctly twice (F2B-1 proceed-gate; one-open-draw rule). The wiring phases are SMALLER and LOWER-tier than what bootstrap just handled — Phase 1's validated LOW prototype (2-reviewer) fits them exactly.
3. **Tiering's value curve peaks at 3B** ($200-300 projected HIGH-pipeline overhead — the nwrp233 origin), which sits AFTER dogfood on any path. Implementing tiering early buys nothing the wiring phases need; implementing it just-before-3-series buys everything nwrp233 wanted.
4. **GTV already paid down tiering's riskiest deliverable.** SmokeAuthHelper — the REQUIRED design output (nwrp238) — now has three working increments (probe, flow driver, generic fetch) exercised against production across 2A/2D/2E. The implementation phase inherits tested primitives instead of building speculative ones.
5. **(a) interaction-bug can also slide behind dogfood:** the deadlock is mitigated (listener OFF in prod), dogfood doesn't need W.1, and the bisect is cleaner against a stable post-wiring HEAD. Keep it ahead of any listener re-enable, which nothing on the dogfood path requires.
6. **Honest counter-arguments:** (i) wiring under bootstrap forgoes the formal tier gateway on 2-4 more phases — mitigated by Phase-1-prototype reviewer sets, which is exactly what they validated; (ii) deferring (a) leaves an unexplained interaction in the codebase — mitigated, but if W.1 re-enable becomes a dogfood want, (a) jumps the queue; (iii) tiering drift risk if 3-series scope creeps forward — the nwrp233 BLOCKING gate already prevents that mechanically.

**Recommendation:** stamp the (e) ordering. The nwrp233 gate is preserved verbatim — only its position in calendar time moves.

---

## Cost ledger (full GTV)

Stage 1 $22-25 · Stage 1.5 $15-18 · F5/F1 steps $27-32 · AppShell investigation+fix $13-17 · F-Inv-1 sweep $12-16 · F10 $12-15 · 2C gate+exec $20-25 · nwrp273 round $16-18 · nwrp274 round $16-18 · 2A $26-30 · nwrp276 round $18-21 · nwrp277 round $12-14 · nwrp278 round $28-32 · nwrp279 round $4-5 · **nwrp280 batch: 2E $12-14 + PART 3 $6-7 + PART 4 $24-28 = $42-49**. **GTV total ≈ $285-325** vs the $280-320 projection — at band.
