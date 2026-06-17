# NIGHTWORK — STATE AND LAUNCH PATH (canonical synthesis)

> **GTV-CLOSED (2026-06-12, nwrp281).** All stages complete, batch accepted, (f) re-sequence STAMPED (MASTER-PLAN updated). Open on the human side only: **(1) Jake's post-deploy walk bundle** (checklist item 7) and **(2) the CO #66-72 adjudication** (item 8 — identity verified to the cent below; evidence favors DB). Fee question RESOLVED per nwrp281 §A: **Fish contract fee = 11%** (9% + 2% components; $824,633.39 = 11.0000% of contract, formula-level read of Diane's Adjusted workbook), **per-CO fees are a separate variable structure (0.15 default / 0.11 on #22-24 / $0 on no-fee COs) and were already CORRECT rate-for-rate — no under-billing; the $39K scenario is dead.** Fish's stored fee fixed to 0.11 + relabeled "Contract Fee %" (`8bed758`); the other 14 jobs are checklist item 9.
>
> **Q2 dual-close symmetry (GTV's cleanest proof-of-value):** ONE parser lineage explains both jobs' contract gaps to the cent — Fish $479,900.00 (louvers/overhangs/pergola/planters, carrying $319,571.01 of previous billings — confirmed from the source side per nwrp281 A6c) and Dewberry $58,000.00 (Urns/Generator). One silent-skip bug, one warn-fix (`e917214`), two mystery numbers closed, and the F8 negative-payment-due explained — all from replaying the actual import sources through the repo's own parser.
>
> **Post-close corrections folded (nwrp281 close-out wave):** F2E-1 CORRECTED — the lien generator EXISTS in `draw_submit_rpc` (per-vendor pending rows at submit; void marks not_required); it has simply never executed with effect. The gap is the manual/upload create path + gate wiring → `TD-NW-LIEN-CREATE`. F2E-3 **FIXED** (migration 00110): draw void now releases ALL linked invoices with per-invoice audit appends — closed-loop proven re-drawable. F2E-2 interim shipped (default false, rows false). A(5) period-mapping: NOT a parser issue — the importer never writes draw rows; the Fish working draw is wizard-created (April period, human dates) while the workbook is the billed March App 21 → the working draw RENDERS as "Pay App #21" while App 21 is already billed — **off-by-one boundary question folded into the #66-72 adjudication** (item 8).

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

1. ~~Fee answer~~ **CLOSED per nwrp281 §A** — 11% contract / variable per-CO; per-CO layer verified correct; no under-billing. Evidence: formula-level read of `Fish-Pay_App_21_Mar_26__Adjusted_.xlsx` (Jake to drop into test-invoices/ for the diff record).
2. **72-CO line backfill (Fish)** — map each approved CO to budget lines (or explicit unallocated flag). Trigger validated 2D-1. Before dogfood.
3. **13-invoice allocation pass** — IDs tabled in PART-2C D2 ($76,970 + $18,096 partial). Before dogfood.
4. **Louver/pergola/planters + Urns/Generator rows** — decide coded-budget-line vs C-suffix treatment for Fish's 4 ($479,900/$319,571 prev) and Dewberry's 2 ($58,000/$0 prev) uncoded scope rows. Before dogfood (rides the backfill session).
5. **Flip `require_budget_allocation=TRUE` on ross-built** — AFTER 2-4 complete (ordering is load-bearing; one UPDATE).
6. **Fish billed-ahead $126,927.25 reconciliation** (SUPERSEDES the $73K drift estimate, source numbers per nwrp281 A6a: payments $5,544,076.32 vs Diane's own G703 completed-to-date $5,417,149.07) — Diane reconciles before App #22.
7. **Walk leftovers:** 2A-8 gold-standard render eyeball; 2B-3 price spot-walk (incl. the 2027-dated + two $0.00 observations); paper-cuts items (PCCO #11/#65 text, **fee now reads "Contract Fee % 11.0%" on Fish**, deposit percent-scale); chrome-once standard throughout.
8. **CO #66-72 adjudication** (nwrp281 A4): DB Σ #66-72 with-fee = **$25,441.87 EXACT** (all 7 descriptions match incl. −$640.55 plaster credit; ≤#65 ties Diane's log within 2¢ rounding). Evidence FAVORS DB: the in-repo App-21 file's own G703 carries $25,441.87 as "PCCO for this Application" — the file knows these COs; the Adjusted copy's log ending at #65 reads stale. If DB right: no action. If file right: a 7-row void plan gets surfaced, not executed. **Fold-in: the App-21 off-by-one** — the wizard-created working draw renders as #21 while App 21 is billed; decide whether `starting_application_number` should be 22 (or the working draw's number semantics adjust) in the same sitting.
9. **14-job fee collection** (nwrp281 A3): every other job carries the 0.20/0.10 import defaults — collect each job's real contract fee + deposit from its contract docs (do NOT bulk-assume 11%). Deposit note: Fish's G702 shows Deposit $0 vs stored 0.10 — flagged, not fixed.

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

## POST-CLOSE ADDENDUM — Per-Job Wiring phase SHIPPED (2026-06-12, nwrp282)

Critical-path item 4 is DONE (`10bba5f`, deploy `dpl_GUonZ7AGGTw3CHp6s4XRBscErYGu`): all four per-job tabs wired to real data, F2D-2 affordance closed, W-6 metric de-dupe applied, both inherited test debts cleared — **full test suite green for the first time on record**. Details: PART-WIRING.md. TD-NW-PER-JOB-TAB-WIRING's wiring scope is SATISFIED pending Jake's walk; its allocation-backfill companions remain items 2-5 below.

### THE COMBINED WALK LIST (one incognito pass — Wave C + wiring together, per nwrp282 condition 5)

1. `/jobs/{fish}/budget` → real G703-style BudgetView (144 lines), chrome once.
2. `/jobs/{fish}/bills` → 57-row bill table, status badges, rows link to bill review.
3. `/jobs/{fish}/pay-apps` → draw list shows **#21** ("Current Due (at creation)" column), links to F10 detail.
4. `/jobs/{fish}/activity` → 16-row feed with named actors + readable summaries.
5. `/jobs/{drummond}/budget` (+ bills/pay-apps/activity) → graceful empty states.
6. `/jobs/{fish}/change-orders` → ONE summary row ("Pending / Draft COs" only — no contract triple repeat); **as a PM-role check if convenient:** "+ New Change Order" absent for PMs, present for you.
7. `/jobs/{fish}` job details → **"Contract Fee % 11.0%"**, deposit 10.0%, retainage unchanged.
8. Pay-app detail PCCO panel → **#11 reads "plan revision #3 7.14" unbroken; #65 reads "Ext. Column Wraps"**.
9. One qa_review bill at `/financials/bills/[id]` → gold-standard render (2A-8).
10. Chrome renders ONCE on every stop (L6 standing item).

### Dogfood gates — SPLIT per nwrp284 (two gates, not one list)

**START gates (all human; dogfood begins when these clear):**
1. The combined walk (10 stops above + the 2-minute listener spot-check from the interaction-bug close).
2. Diane sitting with the item-8 brief (ITEM-8-ADJUDICATION-BRIEF.md).
3. **13-invoice + $11,300.23 uncoded allocation backfill** (the invoice-side slice of items 2-4).
4. `require_budget_allocation` flip for ross-built — **AFTER gate 3**.
5. 14-job fee collection — trickles (display-only; doesn't block the start).

**FIRST-DRAW gates (clear before Diane's first real draw, ~2-4 weeks after start):**
1. Item-8 resolution APPLIED (starting_application_number + previous-certificates baseline per the adjudication branch).
2. **F6 allocation authoring + the 72-CO backfill** (TD-NW-CO-LINE-ALLOCATION both workstreams; trigger validated 2D-1).
3. Diane's $126,927.25 billed-ahead reconciliation.
4. TD-NW-LIEN-CREATE — before the first BANK-SUBMITTED package (upload path + generator validation at first real submit).

### Interaction-bug phase — CLOSED with the CONFIG DECISION (2026-06-12, nwrp283)

**Decision: listener RE-ENABLED in Production** (`NEXT_PUBLIC_AUTH_STATE_LISTENER=true`, deploy `dpl_7HDBz3NoeCSbfV6x3FmJfskbxndk`, cache-skip + domain-ID checks ✓). L2 post-flip verification run: anon-curl ✓ + **automated authed cell on live production** (Playwright fresh sign-in as a smoke PM → shell healthy, role resolves, 17 supabase requests — the exact signature that broke on 2026-05-28 is absent). **Jake's 2-minute incognito spot-check is the remaining human confirmation** (heavy-account case: nav + role badge + jobs sidebar load normally).

**Diagnosis (honest):** the deadlock is **absent at current HEAD in BOTH build flavors** — Preview deploy and a true production bundle (local `NEXT_PUBLIC_VERCEL_ENV=production` build) both ran fresh-sign-in cells HEALTHY. The line-level mechanism was never named: the prime suspect (supabase-js await-inside-onAuthStateChange lock deadlock) was **refuted by two cells** (bare Node AND raw-client real Chromium — no deadlock on v2.103), and the May-28 truth table carried an uncontrolled third variable (**session freshness** — the SIGNED_IN-event path only runs on fresh sign-ins; the original cells never controlled it). 60+ intervening commits changed multiple client surfaces. Per nwrp283 (3), no fix was compressed-to-fit — there is nothing left at HEAD to fix.

**Revisit trigger (the rollback contract):** if the signature reappears (post-login shell stuck "Loading…", zero completing supabase requests), the proven 2-minute mitigation is `vercel env rm NEXT_PUBLIC_AUTH_STATE_LISTENER production` + force redeploy. Then bisect `acbfa06..HEAD` using the now-cheap per-commit cell runner (`tmp/zz-listener-app-cell.mjs` against local production bundles — no deploys needed). TD-WB-LISTENER-PHASE1-INTERACTION carries this trigger; TD-WB-LISTENER-UNFLAG closes (the unflag is done).

### Next per stamped sequence

**Tiering-implementation SHIPPED** (nwrp285, commit `06c23d6`, 2026-06-11): all 8 touch points landed in one closed-seam cutover — tier-config.json (PA-2 committed), /np severity-abort pre-step, /nx Check 11, plan-review + QA tier-resolved reviewer sets (old fixed sets DELETED, AC-14 grep-clean), init-phase Step 2.5 signal-rendered severity declaration (PA-1), EXPANDED-SCOPE template, CLAUDE.md Rule 11, mid-execute-halts.jsonl seeded with one synthetic event (PA-3/AC-13). Mechanics dry-run (nwrp285 rider 2) ALL PASS — and earned its keep: it caught the schema/migration signal regex missing prose-"migration" before F6 could dispatch under a mis-firing signal table. TD-PLANNING-PIPELINE-SEVERITY-TIERING closure: condition (i) MET here; (ii) awaits F6-family shipping under the new tier; (iii) REVIEW-1 after 4 tiered phases. nwrp233's 3-series gate condition is now SATISFIED in mechanism (3-series dispatch still sequenced behind the F6-family + dogfood gates per the walk list).

**F6-family SHIPPED** (nwrp286, commit `0c19459`, deploy `dpl_9h4dYsMsdXHiqWNJwePPGRG3AsyY`, 2026-06-17) — the FIRST phase through the tiered pipeline, planned + executed autonomously under HIGH. Premises corrected to live ground truth first (CO authoring already existed → the work was the GATE; backfill target is $799,510.34 base not $897,143.39 fee-inclusive; staleness is a net-new diff). Four deliverables, all machine-verified:
- **D1 CO allocation gate** — migration 00111 (`require_co_budget_allocation`; new orgs gated, existing incl. RB ungated/safe; NOT flipped for RB per firewall); enforced at CO approval, fail-closed, mirrors the invoice gate.
- **D2 72-CO backfill rails** — `scripts/backfill/co-line-allocation.mjs` (dry-run default, resolved-org production guard, validate-all-then-insert, idempotent); RUNBOOK drafted; NOT executed on RB.
- **D3 draw staleness badge** — display-only, draft draws, source-derived diff (dead pass-through fields excluded per plan-review).
- **D4 N2 labels** — "Base Amount" (CO list) + "With fee" (pay-app PCCO panel); #11/#65 truncation untouched.

Pipeline first-run: HIGH base-6 plan-review exercised live (consolidated to 4 agents for the unattended ceiling — friction-tax data for REVIEW-1); §6.2 did NOT fire (migration is the expected in-tier confirmation); mid-execute-halts.jsonl NOT appended (nothing halted). TD-PLANNING-PIPELINE-SEVERITY-TIERING closure: (i) MET at 06c23d6; **(ii) MET here — F6-family shipped under HIGH discipline**; (iii) REVIEW-1 after 4 tiered phases (1 of 4 done). nwrp233 3-series gate satisfied in mechanism; 3-series still sequenced behind dogfood gates.

**Queued for Jake's walk** (visual sign-off NOT self-certified per nwrp286): D3 badge appearance + D4 label clarity (folds into walk stop 8 alongside #11/#65); the gate's end-to-end HTTP 422/200 round-trip (every component machine-verified; needs an owner/admin fixture user to exercise). See the nwrp286 exit report for the combined walk queue.

## Cost ledger (full GTV)

Stage 1 $22-25 · Stage 1.5 $15-18 · F5/F1 steps $27-32 · AppShell investigation+fix $13-17 · F-Inv-1 sweep $12-16 · F10 $12-15 · 2C gate+exec $20-25 · nwrp273 round $16-18 · nwrp274 round $16-18 · 2A $26-30 · nwrp276 round $18-21 · nwrp277 round $12-14 · nwrp278 round $28-32 · nwrp279 round $4-5 · **nwrp280 batch: 2E $12-14 + PART 3 $6-7 + PART 4 $24-28 = $42-49**. **GTV total ≈ $285-325** vs the $280-320 projection — at band.
