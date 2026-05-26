# INTERNAL ROSS BUILT LAUNCH — SCOPE LOCKED

**Status:** SCOPE LOCKED — authoritative scope for the first internal Ross Built launch.
**Authorized by:** nwrp225 (2026-05-26).
**Generated:** 2026-05-26.
**Precedents in this scope:** grounding pass (`.planning/grounding-pass/GROUNDED-INVENTORY.md`) + empirical verification (`.planning/grounding-pass/TASK-1-INVOICE-PARSE-FINDINGS.md`, `.planning/grounding-pass/TASK-2-CODE-VERIFY.md`).
**Posture:** Plain language. Carefully reviewed. Sign-off at each gate. Standing discipline rules hold (cost ceilings, halt gates, the calibrated hook, orchestrator pattern). This document is the spine the launch plan will be built from in a fresh-context drafting session per nwrp225 §38.

---

## Purpose

First internal deployment of Nightwork's full financial core to Ross Built, on **real data**, designed to be **bank/client-defensible**: a lender or owner can audit exactly where any invoice went, how it was coded, who touched it, through its full lifecycle.

The launch is internal-first. Diane and the six PMs are the users. Owner Portal stays parked (built, hidden) until a later wave justifies external exposure.

---

## Headline Feature — Invoice Provenance Ledger

The launch is anchored on a single user-visible feature that makes Nightwork demonstrably better than the current paper-and-spreadsheet workflow: a per-invoice append-only living record that captures every state change, every code change, every approval / rejection / kickback / acknowledgment, with full chain of custody.

### Behavior

**Append-only living record per invoice.** Captures an event on every state change. Re-coding never overwrites — it appends "was X, changed to Y by [who] on [when], reason [note]".

**Current coded state (what the invoice IS right now):**
- Cost code(s) with descriptions
- CO/PCCO designation (with PCCO# if applicable)
- PO linkage (which PO, what balance remains)
- Budget line billed against
- Amount + multi-cost-code allocations
- This-invoice-portion vs running total against the budget line
- Draw # if drawn
- Lien release status

**Chain of custody (full history, append-only):**
- submitted → PM reviewed → QA'd → approved → kicked-back → re-coded/adjusted → in-draw → paid
- Rejection / unapproval recorded as events (not deletions)
- Over-budget acknowledgments (who acknowledged, what note they wrote, what severity band)
- Every state change carries `{who, when, old_state, new_state, note}`

**Renders in TWO places:**
1. **On-screen on the invoice review surface** for the Ross Built team during day-to-day work
2. **Printed onto the draw/pay-app G702/G703 PDF package** that banks/clients receive — this is the bank-facing deliverable that makes the launch defensible

### Architecture posture

- **Works over the CURRENT shipped 4-status approval flow** (owner / admin / PM / accounting). Does not require an approval-chain engine to ship.
- **Built append-only with clean seams** so deferred event types (future approval-chain-engine steps, reconciliation events, automated escalations) slot in later WITHOUT a rebuild.
- **Spine already exists:** `status_history` JSONB column on every workflow entity + cross-entity `activity_log` table. The provenance ledger ASSEMBLES + RENDERS what's already captured, ADDS the coded-state snapshot, and MAKES lifecycle events append-with-history (no overwrites on re-coding).
- The provenance block on the printed pay app travels with the deliverable that goes to the bank.

---

## Other Build Items

### 1. CO virtual designation + handwriting-detection routing safety net

**Problem (per `TASK-1-INVOICE-PARSE-FINDINGS.md` §1):** Diane and PMs annotate paper invoices with handwritten "PCCO #5" or "Y" markings to designate change-order work. 24% of real Ross Built invoices (8 of 33 fish invoices in the empirical run) have ground-truth `is_change_order: true` that comes from these handwritten marks. The Claude Vision parser FLAGS the handwriting (`handwritten_detected` fires) but does not semantically read the content. Result: CO invoices route to PM auto-approve and bill against the BASE budget — the #1 cost-plus accounting failure.

**Build:**
- **In-app control to mark invoice/lines as change-order work tied to a PCCO#.** Replaces Diane's handwritten paper PCCO marks. Writes into invoice data + the provenance ledger event stream.
- **Handwriting-detection routing safety net:** when `handwritten_detected` fires AND the parser couldn't read the marks (specifically: when the model's confidence on cost-code or CO designation is uncertain in the presence of detected handwriting), the invoice MUST NOT route to GREEN auto-approve. Force "human confirm CO status" review tier instead.

**Why both:** The in-app control gives PMs a clean digital path; the safety net catches cases where Diane already wrote PCCO# on paper and uploaded before re-coding digitally.

### 2. Per-job cost-code seeding

**Problem (per `TASK-1-INVOICE-PARSE-FINDINGS.md` §2):** The parser confidently suggests semantically-correct cost codes that are NUMERICALLY WRONG when the job's `cost_codes` table is not seeded with the job's actual numbering. In the empirical run, 0/22 invoices had literal cost-code matches; 33/33 had semantic matches (right work category, wrong code number). The Fish job's ground truth uses entirely different 5-digit codes (10102 plumbing material, 25102 trim/millwork, 27101 painting, 28701 windows) than the Drummond reference job.

**Build:**
- Prerequisite per active Ross Built job: seed the job's cost-code list.
- Two mechanisms acceptable: CSV import OR org-template-applied-to-job (admin sets up an org-default list, applies to each new job at creation; PM tweaks per job if needed).
- Without this step, PMs retag every invoice's line items — the friction undermines the auto-approval workflow.

### 3. flagAnomaly real implementation

**Status (per `TASK-2-CODE-VERIFY.md` Check 2 + Check 4):** Current `src/lib/cost-intelligence/queries.ts` `flagAnomaly` is a 4-line stub returning the constant `NO_HISTORY`. The data foundation IS real: 126 Ross Built rows in `pricing_history` spanning 2020-2027, 21 distinct vendors, 29 cost codes. But 79% of observations are in 2026; pre-2026 backfill is only 8 rows.

**Build:**
- Replace stub with real query against `pricing_history`.
- **IQR-based** outlier detection (more robust than mean-based for small samples).
- **Low/medium/high confidence by sample size** (≥10 observations = high, 3-9 = medium, <3 = low). Surface confidence to PMs so thin-data flags are honestly labeled.
- **Recency-weighted** (2026 data heavier than 2020 anchor points).
- **Renders as per-line badge in the invoice review right-rail.**

**Precursor cleanup:** 14 of 126 rows have NULL `cost_code_id` and won't contribute to per-cost-code aggregations until back-mapped. 1-2 hour SQL cleanup pass before flagAnomaly ships.

**Honest framing for PMs:** flagAnomaly will be useful on the top-2 vendor+cost-code combos (Island Lumber × Framing Material 28 obs over 3 weeks; Clean Cans × Sanitation 10 obs over 7 months) and borderline on the next tier. The confidence indicator makes thin-data honest — PMs see "comparing against 3 observations in last 6 months, low confidence" rather than a false-precision percentage.

### 4. Math-mismatch flag split

**Problem (per `TASK-1-INVOICE-PARSE-FINDINGS.md` §5):** `math_mismatch` flag fired 3 times in 33 invoices; all 3 were false positives where the parser's stated `total_amount` matched ground truth exactly. The mismatch came from `sum(line_items[].amount) != subtotal` (Claude calculation idiosyncrasy on invoices with auto-pay discount lines, payment processing offsets, etc.), not from a real vendor billing error. False-positive math_mismatch degrades trust in the flag.

**Build:**
- Split into TWO separate signals:
  - `line_items_sum_mismatch` — low signal, Claude arithmetic idiosyncrasy; informational only
  - `subtotal_tax_total_mismatch` — high signal, real vendor billing error; surfaces as a real warning
- ~1-2 hours of work.

### 5. Caldwell-fixture → real-DB swaps (5 routes)

**Problem (per `TASK-2-CODE-VERIFY.md` Check 3):** Seven production routes currently mount synthetic Caldwell fixtures instead of real DB data. The Wave-E E-3 swap pattern at `src/app/financials/bills/[id]/page.tsx` is proven; just hasn't been rolled to the other six. For internal launch, five of the seven are launch-relevant and need swapping; two are Wave 2 scope and get hidden (see HIDE below).

**Swap targets (~11-16 hours, 1.5-2 days total):**

| Route | Effort | Why launch-relevant |
|---|---|---|
| `/financials/pay-apps/[id]` | 3-4 hours | Pay App approval = critical owner-touchpoint. **Folds in the printed provenance block in the same pass** (swap to real data + add the provenance ledger render). |
| `/financials/pay-apps/[id]/print` | 1 hour after the [id] swap | G702/G703 print is the legal deliverable. **Same fold-in: printed provenance block lands here.** |
| `/jobs/[id]/budget` | 4-6 hours (6 PostgREST embeds) | Core PM surface; PMs see real budget data daily |
| `/jobs/[id]/mobile-approval` | 1-2 hours (borrows the `bills/[id]` shim almost verbatim) | PM mobile approval is core invoice flow |
| `/jobs/[id]/documents/[documentId]` (lien-release path only) | 2-3 hours (skip plan/contract paths) | Lien release review is part of draw closure |

**Coordination note (per nwrp225 §22):** The pay-app swaps FOLD IN the printed provenance block. One pass = swap to real data + render the provenance block onto the printed pay app. Do not separate these into two passes; the provenance work depends on the real-DB data being there.

---

## HIDE — Feature-Flag Off (~2 hours)

Pattern: `NEXT_PUBLIC_FEATURE_*` env vars + nav-bar conditional + middleware 404 block + section-overview filtering. Same precedent as `NEXT_PUBLIC_AUTH_STATE_LISTENER` (W.1 unflag). No feature-flag library; env vars + a couple of small code changes.

**Hidden surfaces:**

- **Owner portal** — `/owner/*` + `/api/owner-portal/*` return 404 when flag off. Already not in internal nav; this adds the explicit middleware gate so the routes 404 even on direct URL access. Owner Portal is built (B-2a + B-2b shipped at full external-grade security rigor) — staying hidden until external launch is the explicit goal.
- **~50 placeholder routes** — Admin F2/F3, Company Wave 2/F4, Pipeline Wave 4, People F2, Reports Wave 3, Sub Portal F3, per-job Wave 2/F2/F3/F4/F5, Price Intel F5 sub-routes, Financials F1 org-wide views.
- **15 per-job operational tabs** — schedule, daily logs, punchlist, photos, RFIs, submittals, plans, specs, permits, warranty, pre-con, closeout, team, time-entries, to-dos.
- **`/jobs/[id]/schedule` + `/financials/reconciliation`** — the two Caldwell-fixture-mount routes that are Wave 2 / post-Phase 3.9 scope. Hide, don't swap.
- **Partial "Your Day" today-card** — replaced with a real launch-surface aggregate (see UI-FINALIZE).

**Internal launch nav reduces from 8 sections to 4 + Admin:**

> **Today | Jobs | Financials | Price Intel | (Admin ▾)**

---

## UI-FINALIZE — Launch Surfaces Only (~under a week)

**Bar:** consistent, clean, professional, works on Ross Built devices. NOT gold-plating; NOT every-pixel-perfect.

**Bounded scope:**

| Item | Effort | Notes |
|---|---|---|
| RGBA cleanup bundle: TD-B2b-RGBA-CLEANUP + TD-B1abis-03 + TD-1.5a-followup-1 | ~1 hour | Consolidate to a `--nw-tint-stone-08` token or `color-mix()`; ~4-6 sites across invoice surfaces + client-combobox + design-system pages |
| Nav-bar `min-[360px]:` breakpoint fix (TD-WE-01) | ~15 min | Replace with named breakpoint `sm:` (640px) or investigate Tailwind v3 regression |
| PDF-preview mobile polish (pinch-zoom + pan + responsive sizing) | Half-day to one day | **FLAGGED SPIKE RISK** — could be CSS-only or could need PDF.js surgery. Spike before commitment per Wave 1.1 expansion doc §8 R3 |
| PM-queue touch-target audit | ~30 min | Chrome DevTools iPhone emulation walk; verify `NwButton` size="md" renders ≥44px in real conditions |
| "Your Day" replacement with real aggregate | Half-day to one day | Replace the "Coming F3 — personalized daily plan" placeholder card on `/today` with a real launch-surface aggregate: Open Invoices Today + Pay Apps Due This Week |

**Post-build UI touch-up step:** The provenance block + flagAnomaly badge land on the invoice review screen AFTER UI-finalize per the SEQUENCE below. Reserve a small UI-touch-up step for those panels post-build (e.g., final polish on the provenance card's spacing, the anomaly badge's color treatment) to keep the launch surface consistent.

---

## TEST — Vigorous Gate to Real Use

This is the gate. Diane is the first real user; she does not get her time wasted on broken flows.

- **Drummond + Fish end-to-end invoice walks** against the real fixtures (`test-invoices/Dewberry-*`, `test-invoices/fish-invoices/*.pdf`). Full path: upload → parse → code → approve → QA → draw → provenance-renders-on-PDF. Walk every step on real data, not synthetic.
- **TD-B3-FIXTURE-COVERAGE-32-TABLE** — seed all 32 soft-delete tables in `fixture-harness-org` + observe the audit trigger fires on each. Currently only 5 of 32 tables empirically exercised at B-3 ship; the other 27 confirmed by CASE-mapping static analysis. Required before real RB data flows.
- **Permissions matrix integration smoke** — the 115 unit tests in `__tests__/invoice-permissions.test.ts` cover the matrix at the function level. Add an integration walk that exercises the actual API routes with each role × each status to confirm end-to-end.
- **Cross-org tenant-boundary probe** — fixture-org A user attempts to fetch fixture-org B's data via every route; confirm 404 or filtered-empty in all cases. RLS is the backstop; this is the application-layer verification.
- **Diane 1-2 week dogfood on real RB jobs** before broad PM rollout. Diane uses Nightwork in parallel with the current paper workflow on real Ross Built invoices for 1-2 weeks. Capture every friction point + every bug + every "I wish it did X." This is the most important test.
- **Production staged rollout with 24-hour observation window** after Diane dogfood passes. PMs onboard in waves; observe Sentry / activity-log volume / no-regression smoke for 24h between waves.

---

## DEFERRED — Explicitly OUT

These items are deliberately NOT in launch scope. Where the launch surface needs to be designed-for-future, that's noted.

**Integrations — ALL OUT for launch:**
- **QuickBooks Online push** — Diane continues dual-entry into QBO manually. Schema fields (`qb_bill_id`, `qb_vendor_id`, statuses `pushed_to_qb` / `qb_failed`) stay in place for future wiring; no integration code ships at launch.
- **Email intake** — `accounting@rossbuilt.com` parser-watcher stays unbuilt. Drag-drop + bulk-upload modal IS the launch intake path. Diane downloads invoices from her email and uploads via the single or bulk path.
- **PM push notifications** (SMS / web push) — out. PMs check the app to see what's waiting; existing email/in-app notifications via `notifyRole` / `notifyUser` stay as they are.

**Approval-chain engine — OUT, designed-for:**
- The full multi-step approval-chain engine (F3 scope) is out.
- The provenance ledger is built **over the current 4-status approval flow** (owner / admin / PM / accounting) but the event schema is **designed to accept chain-engine events later** — additional event types slot in without a rebuild.

**Reconciliation — OUT, designed-for:**
- The reconciliation feature itself is hidden (see `/financials/reconciliation` in HIDE).
- The provenance ledger schema is **designed to accept "reconciled" events later** — when reconciliation ships in a future wave, it appends events to the existing per-invoice ledger.

**Owner Portal exposure — OUT, built:**
- The portal is built (B-2a security + B-2b UI both shipped to production runtime).
- Stays hidden for internal launch behind the feature flag.
- Future wave will flip the flag when external exposure is the explicit goal.

---

## SEQUENCE — Jake's Chosen Order

> **HIDE → UI-FINALIZE → BUILD → fix → TEST/dogfood**

Order rationale:

1. **HIDE first** — get the app feeling complete at reduced scope before doing any other work. Cheapest item ($2hr); biggest perceptual change (8-section nav → 4 sections; ~50 placeholder routes disappear from discovery).
2. **UI-FINALIZE next** — clean the launch surfaces before building new features on them. The build items land on already-finalized surfaces, so we don't polish twice.
3. **BUILD third** — the provenance ledger + CO designation + cost-code seeding + flagAnomaly + math-mismatch split + the 5 Caldwell swaps. The pay-app swaps fold in the printed provenance block (one pass).
4. **Fix** — any issues surfaced during BUILD get addressed before TEST starts.
5. **TEST/dogfood last** — the vigorous gate. Diane uses on real jobs; bugs / friction caught here, fixed, retested.

**Provenance block + flagAnomaly land on the invoice review screen AFTER UI-finalize.** Include a small UI-touch-up step for those panels post-build to keep the launch surface visually consistent.

**Realistic total:** ~4 weeks. Most of it dogfood time. No integration swamp (those are deferred).

---

## DISCIPLINE

This is a carefully-reviewed, sign-off-at-each-gate effort. Jake does not move on until 100% happy with the PLAN and the launch-readiness bar (not every pixel).

**Standing rules hold:**

- **Cost ceilings** — set per phase at /np dispatch authorization; bumps are Jake-only; max one bump per slice per Rule 7c; per-plan halt gate $50 per Rule 7d.
- **Halt gates** — at the end of each phase; orchestrator review before proceeding; cross-reviewer factual disagreement halts per Rule 9.
- **The calibrated hook** — every commit goes through `.claude/hooks/nightwork-pre-commit.sh` + `.githooks/pre-commit`. Drummond grep gate is NEVER bypassed (Dev Rule). Other hook gates may be bypassed only with explicit per-incident Jake authorization documented in the commit body per Rule 8(a). Execute-Phase footer convention from TD-NW-HOOK-EXECUTE-PHASE-DETECT applies to all execute commits.
- **Orchestrator pattern** — Jake is orchestrator (architectural decisions, ceiling authorization, cross-reviewer disagreement resolution, halt-gate sign-off). Executor (Claude Code session) plans + authors + executes + reviews + ships within guardrails; surfaces with structured options on architectural choices or discipline gates.

---

## Related Artifacts

The launch plan (drafted in a fresh-context session per nwrp225 §38) will be built from this scope-lock + the three grounding-pass artifacts:

- **`.planning/grounding-pass/GROUNDED-INVENTORY.md`** (677 lines) — 6-section grounded inventory: what exists / invoice + price-intel actual state / UI state of launch surfaces / what hides / Wave 1.1-Lite original scope / the gap to launch.
- **`.planning/grounding-pass/TASK-1-INVOICE-PARSE-FINDINGS.md`** (265 lines) — empirical Claude Vision parse run against 39 real Ross Built fixtures. $0.94 spend. 97% header-field accuracy. Handwritten PCCO 24% miss rate. Cost-code taxonomy 0/22 literal + 100% semantic. False-positive math_mismatch on 3/33.
- **`.planning/grounding-pass/TASK-2-CODE-VERIFY.md`** (446 lines) — load-bearing inventory-claim verification against live code + live DB. flagAnomaly wiring revised to 6-8 hours (down from 2-3 days). pricing_history 126 RB rows, 79% in 2026, 14 NULL cost_code_id cleanup gap. 7 Caldwell-mount routes confirmed (not 6); 5 SWAP / 2 HIDE split. All Check 1 invoice-review-screen claims verified file:line.

**Adjacent canonical references** (do not need to be re-read during plan-draft; the scope above already incorporates the relevant decisions):
- `CLAUDE.md` — project-level rules including Architecture Rules, Dev Rules, UI Rules, Workflow Rules 1-9, Orchestration discipline.
- `.planning/MASTER-PLAN.md` — canonical entry point + DECISIONS LOG + ship history.
- `.planning/architecture/ARCHITECTURE.md` — 8 principles + post-1.5c phase plan + RLS posture summary.
- `.planning/design/PHILOSOPHY.md` + `SYSTEM.md` + `COMPONENTS.md` + `PATTERNS.md` — design system contracts; the launch surfaces follow these.
