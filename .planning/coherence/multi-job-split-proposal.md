# MULTI-JOB INVOICE SPLIT — B-discovery proposal (HALT for Jake's ruling)

**Date:** 2026-07-16 · **Session:** massive-run session 1 · **Status: PROPOSAL — nothing built.**
Evidence basis: first-hand reads of the money core (file:line cited) + a 6-domain parallel codebase map (findings folded in below). Fixture/DB facts verified by SQL.

---

## 1. Today's model (verified first-hand)

- **`invoices.job_id` is the single job identity.** `invoice_allocations` rows carry `invoice_id, cost_code_id (NOT NULL), change_order_id, amount_cents, description, org_id` — **no job_id** (SQL-verified schema). `invoice_line_items` likewise (cost_code/budget_line/po refs, no job).
- **Draw membership is a scalar `invoices.draw_id`** — a whole invoice joins one draw (`draws/new/route.ts:206-229` links by setting `draw_id`).
- **The wizard pull** (`draw-calc.ts:872 approvedInvoicesInPeriod`) selects candidates by `invoices.job_id = jobId` + approved status + `received_date` in period + `draw_id IS NULL`.
- **Draw money math** (`draw-calc.ts:97 sumThisPeriodByCostCode`): per-code sums from the linked invoices' **allocations (tier 1) → line items (tier 2) → invoice-level code (tier 3)** — NO job filter anywhere, because whole-invoice ≡ draw's job. Prior applications (`computeDrawLines:229-240`) pull prior draws' invoices via `draw_id` and re-run the same sums.
- **Uncaptured** (`draw-calc.ts:731`): invoice `total_amount` minus captured coded dollars — folded into G702 line 8 (HANDOFF #2 credit fix). Job-blind; meaningful only because whole-invoice ≡ job.
- **Over-budget gate** (`action/route.ts:226-313` WI-L-4): sums `invoice_line_items.budget_line_id` — budget lines are job-scoped, invoice assumed mono-job.
- **Balance-impact strip** (`balance-impact.ts`): pure per-code math; the route computes baselines from the header job's scopes.
- **THE TAILWIND — WI-013 already models the split.** `src/lib/knowledge-graph/validators/wi-013-multi-job-allocation.ts` (F1-Wave-B Slice-2, 9 tests green) validates *proposed allocations that each carry `job_id`*: (a) Σ allocations = invoice total (1¢ tolerance), (b) every allocation's job is in-org (cross-tenant violation), (c) cost_code has a budget_line **for that allocation's job**. The invariant layer was built ahead of the schema; this proposal aligns the DB + routes + UI with it. It is wired to the knowledge-graph validator registry but **not yet called by the allocations PUT**.

## 2. Proposed design

### 2.1 Schema (2 migrations, both backfilled, rollback-safe)

**M1 — `invoice_allocations.job_id`**: add nullable `uuid REFERENCES jobs(id)` → backfill `= invoices.job_id` → `SET NOT NULL`. Indexes: `(job_id, cost_code_id)`, `(invoice_id, job_id)`. RLS unchanged (org direct-filter per Q10b stays; job cross-checked by WI-013 at write time).

**M2 — `invoice_draw_links`** (junction; see Q2): `id, invoice_id FK, job_id FK, draw_id FK, org_id, created_at/updated_at/deleted_at, UNIQUE(invoice_id, job_id) WHERE deleted_at IS NULL`. Backfill: one row per invoice with `draw_id` set (job = header). Org direct-filter RLS. **`invoices.draw_id` is KEPT and stays in sync for the header job's portion** — every existing reader keeps working; the junction is canonical for split membership.

Both migrations ship with regenerated `database.types.ts` (hook).

### 2.2 Semantics

- **Header job = PRIMARY job (not derived).** It remains: the intake/queue/rail home, duplicate-guard + payment-schedule scope, the default for new allocation rows, and the attribution target for all fallback dollars (line-item/invoice-level sums, uncaptured remainders). *An invoice is "split" iff it has ≥1 allocation with `job_id ≠ invoices.job_id`.*
- **Split invariant (hard):** a split invoice must be FULLY allocated — balanced to total (WI-013 a), every row coded + job'd. Mono-job invoices keep today's laxity (allocations optional; tier-2/3 fallbacks). Consequence: per-job draw math is exact by construction, and **uncaptured ≡ 0 on split invoices** — the uncaptured/credit machinery stays header-job-only, untouched.
- **Draw membership:** the wizard for job J lists an invoice when (header = J AND no junction row for J) OR (Σ allocations on J > 0 AND no junction row for J). Pulling it writes `invoice_draw_links(invoice, J, draw)`; the draw captures **only the J-portion** = Σ allocations with `job_id = J`. Voiding/revising a draw soft-deletes its links.

### 2.3 Money-path deltas (each cited to the code that must change)

| Path | Change |
|---|---|
| `sumThisPeriodByCostCode` (draw-calc.ts:97) | gains `jobId`: tier-1 allocations filtered `job_id = jobId`; tiers 2/3 apply only to invoices whose header = jobId (mono-job fallback preserved cent-exact) |
| `computeDrawLines` prior-applications (:229) | prior invoices resolved via `invoice_draw_links` for (prior draw, job) — falls back to `draw_id` for pre-migration rows (backfill makes these identical) |
| `uncapturedLinkedInvoices` (:731) | gains `jobId`; split invoices contribute 0 (invariant); mono-job unchanged |
| `approvedInvoicesInPeriod` (:872) | candidate rule above; `draw_id IS NULL` gate → junction-absence gate |
| `draws/new` + `preview` + `[id]` + `revise`/`action` routes | link/unlink via junction alongside `draw_id`; portion totals from job-scoped sums |
| WI-L-4 over-budget gate (action/route.ts:226) | split invoices: evaluate `invoice_allocations` per (job, code) against THAT job's budget lines; mono-job: unchanged line-item path |
| `/api/invoices/[id]/balance-impact` + strip | baselines keyed `(job_id, code)`; strip groups **by job then code** with a job eyebrow per group (mockup pattern extended); mono-job renders exactly as today |
| Allocations PUT (`[id]/allocations`) | when any row's job ≠ header → run **WI-013** and 422 on violations (see Q3 for check (c) posture); audit-log the split in `pm_overrides`-style detail |

### 2.4 UI

- **Grid gains a Job column** (org-scoped active-jobs combobox per row, default = header job) — SpreadsheetGrid takes it as one more combobox column; strip groups by job+code. List page: job chip shows `MULTI-JOB (N)` when split (mirrors `MULTIPLE (N)` for codes). Wizard: split invoices render with their J-portion amount + "portion of $TOTAL" subtext.
- **Stamps/statements** (split invoices): stamp money-breakout lines gain the job name per allocation; draw statements list the invoice at its portion amount labeled `$X of $Y invoice total`.

### 2.5 Invariants + tests (Block-B discipline)

- Cent-exact unit tests: two-job split math (portion sums, per-draw capture), junction uniqueness, wizard candidacy, uncaptured=0 on split, mono-job byte-identity (before/after fixture tie-out).
- **Linkage invariant extended per-job:** for draw D on job J: Σ D.this_period across lines ≡ Σ allocations(job=J) of junction-linked invoices (+ mono-job fallback sums − uncaptured, header-job only) — cent-exact.
- Existing draw invariants (Block-B pure + carry-forward) unchanged — they're already per-job.
- E2E: a two-job fixture invoice → split in the grid → approved → pulled into Draw A(job1) and Draw B(job2) → each G703/statement/strip shows only its portion; totals tie cent-exact.

### 2.6 Migration/rollback plan

M1+M2 are additive (no column drops, no data mutation beyond backfills that equal current semantics). Rollback = revert code, leave schema (columns/junction inert — `draw_id` never stopped being written). No destructive step; `nightwork-rollback-planner` template applies.

## 3. What does NOT change

Mono-job invoices (100% of existing data) behave byte-identically: backfill sets every allocation's job = header, so every sum, gate, G702/G703, and statement reproduces today's output — provable via the existing invariant suite + a before/after tie-out on Sample Client A/B.

## 4. OPEN QUESTIONS FOR JAKE (the halt)

- **Q1 — Header job:** PRIMARY (recommended; keeps every mono-job path + intake/queue/duplicate/payment semantics untouched) vs derived-from-allocations (no home for fallback dollars; queue/rail ambiguity). **Rec: primary.**
- **Q2 — Draw membership:** `invoice_draw_links` junction keyed (invoice, job) (recommended; atomic per-portion membership, `draw_id` kept in sync for the header portion) vs per-allocation `draw_id` (fragile under pre-draw edits, lock semantics messy). **Rec: junction.**
- **Q3 — WI-013 check (c)** (cost code must have a budget_line for the allocation's job): enforce HARD on split-invoice saves, or ADVISORY? Hard blocks splits on jobs without budgets (all current RB fixtures have zero budget_lines — SQL-verified). **Rec: advisory warning in the strip/PUT response now; hard only when the org's `require_budget_allocation` gate is on (mirrors existing gate semantics).**
- **Q4 — Split UX entry:** always-visible Job column (recommended; one grid, zero modes) vs a "Split across jobs" toggle revealing it. **Rec: always visible.**
- **Q5 — Statement label** for split portions: `$X of $Y invoice total` — confirm wording.
- **Q6 — Split-invoice status + vendor payment timing (NEW, from the sweep).** The draw RPCs (00061/00110/00117) flip WHOLE-invoice status (`in_draw`/paid) and schedule the FULL vendor payment when a draw approves. Under split: (a) keep whole-invoice semantics — status means "≥1 portion drawn", vendor is paid in full when the FIRST portion's draw approves (payments are whole-invoice; you cut one check) and per-job ready-pools key on junction-absence, not status; or (b) per-portion status + payment scheduling (much bigger). **Rec: (a)** — with lien-release amounts inside `draw_submit_rpc` switched to the job-portion sums (they currently use full invoice totals per draw — under split that inflates job A's lien exposure by job B's dollars).
- **Q7 — PM authorization posture (NEW).** Live RLS (00009/00013) authorizes PM writes by HEADER job — the header PM could edit another job's allocation amounts; non-header PMs get nothing. Options: accept for now (header PM owns the document; Diane/admin handle cross-PM splits) vs per-allocation PM policies (RLS can't express it cleanly today — app-layer gate instead). **Rec: accept + app-layer notice in the PUT when a split touches a job whose PM isn't the actor; revisit at F2 roles engine.** *(Related latent bug found: NO PM write policy exists on `invoice_allocations` at all — only admin/owner/accounting per 00043:115-120 — so a PM's allocation save likely no-ops at RLS TODAY, mono-job included. Goes on the C2 list to verify + fix regardless of this proposal.)*
- **Q8 — Budget/PO consumption source (NEW, the gnarliest).** Every budget number (recalc `invoiced`, WI-L-4 gates, drill-down, integrity check, balance-impact baselines) reads **invoice_line_items** with `budget_line_id` minted from the HEADER job (line-items PUT :54-144 is the most load-bearing header assumption found); draws read **invoice_allocations**. Split invoices make this dual-source visible: line items can't follow allocation jobs 1:1. Options: **(a) migrate budget consumption to allocations** with the same 3-tier fallback as the draw engine (single money source, mono-job provably identical via backfill; +1 session of work + equivalence tests), (b) split-only correction layer (two code paths forever), (c) exclude split invoices from budget rollups with a visible flag (dishonest budgets). **Rec: (a), as its own plan inside B-build with a cent-exact before/after tie-out.**
- **Q9 — Credit memos (NEW).** `invoice_allocations.amount_cents` has `CHECK (amount_cents >= 0)` — negative allocations are DB-impossible, so **credit memos cannot split**. Rec: credits stay mono-job (header) in this pass; the check relax + credit-split semantics deferred (interacts with the uncaptured/credit machinery from HANDOFF #2).

## 5. Build estimate (REVISED after the sweep)

The sweep raised the honest scope: draw-calc job-scoping + 5 draw routes + **3 SQL RPCs (submit/void/approve lien+status semantics)** + wizard client-side pool query (it does NOT use `approvedInvoicesInPeriod` — zero callers; the pool lives in `draws/new/page.tsx:385-426`) + allocations PUT/GET job stamping + WI-013 wiring + save/bulk-import allocation job stamping + partial-approve re-apportionment + grid Job column + strip (job,code) grouping + list/rail allocation-aware filter + per-job tabs + stamp/statement portion labels + draw-detail budget-line auto-create fix + Q8(a) budget-source migration + tests/invariants/E2E. **Estimate: 2 focused sessions (~$100–150 each at the session ceiling), Q8(a) being the second session.** Sequencing: B1 = schema + engine + draws end-to-end (split correct on draws/statements/strip); B2 = budget-source unification (Q8a) + partial-approve + price-intel attribution. Plan-review (money-gate) before each per Workflow posture.

## 6. Domain map — 6-agent sweep results (142 consumers, 72 must-change; full detail in scratchpad sweep-results.json + summarized per domain)

- **draws (28 consumers, 20 must-change):** everything in §2.3 confirmed at line level, PLUS: `draws/[id]` GET **auto-creates budget_lines** on the draw's job from invoice-level codes (:83-111) — wrong-job creation under split; `update-draft` attach/detach + `revise` repointing + `send_back` cascade are all whole-invoice; `recomputePercentageBillings` computes contractor fee on FULL invoice totals (:31-107) — must use job portions; the draw RPCs in SQL (00061/00110/00117) carry the whole-invoice status/lien/payment semantics (→ Q6); wizard pool query is client-side in the page (RIDER-1 legacy surface), `approvedInvoicesInPeriod` is dead code (0 callers).
- **documents (22, 12):** approval stamp (`apply-approval-stamp.ts` + `stamp-pdf.ts`) structurally single-job — needs per-job rows on split stamps; `loadPayAppViewData` drawInvoices/statement backup rows show FULL totals (must show portions or the open-book backup fails to tie); `CostPlusStatementPrintView`/`View` + `DrawApprovalView` + `DrawInvoicesSection` same tie-out failure; snapshots frozen pre-fix STAND (legal record — policy stated in §2.6). NOT FOUND: no dedicated invoice print route (window.print of review page); no PDF G702 generator (browser-print + ExcelJS only); `InvoiceHeader.tsx` is orphaned (imported nowhere) — C2 cleanup candidate.
- **budget-po (28, 17):** balance-impact route + module + strip need (job, code) keying (§2.3); review page `fetchMultiBudget` attributes whole `total_amount` to header code (pre-existing wrongness for multi-CODE, worse for multi-job); **`line-items` PUT budget_line resolver is the most load-bearing header assumption** (→ Q8); `wi-001` validator + tests header-keyed (dormant, low urgency); job overview/cards billed-to-date over/under-counts; `canDeleteJob` guard misses allocation-referenced jobs (must add allocation check); `recalcPO` survives (po_id on line items) but nothing validates PO.job vs invoice job (pre-existing, noted).
- **list-queues (20, 8):** `/api/invoices/list` has NO server job filter (all client-side vs the single jobs embed) — response must grow allocation-job identity; rail filter + Job column + per-job bills/invoices tabs must become "any allocation on this job" with portion amounts (per-job tabs currently over-attribute full totals); eligibility module + batch Gate 1 + action hard-block re-anchor to per-allocation job coverage; duplicate guard is org-wide + job-blind — CORRECT posture for splits, unchanged; `?jobId=` link from per-job invoices tab is already dead (never read) — C2 item.
- **learning-ai (22, 5):** `saveParsedInvoice` allocation auto-create (:701-768) is THE write point to stamp `job_id = effectiveJobId`; line budget resolution per allocation job (→ Q8); bulk-import creates NO allocations — fine under our tiering (mono-job fallback covers imports); partial-approve leaves parent allocations at full amount → must re-apportion (B2); price-intel `commit-line-to-spine` + `pricing_history` (NOT NULL job_id, trigger-fed) attribute to header — split invoices misattribute price observations (B2, minor). NOT FOUND: `parser_corrections` is WRITE-ONLY (no read path — the only live learning is `vendors.default_cost_code_id`, org+vendor keyed, job-blind → untouched by the split).
- **schema-invariants (22, 12+):** `amount_cents >= 0` CHECK (→ Q9); no DB-level sum constraint (PUT-route only — optional trigger hardening deferred); wi-013 DORMANT (registered, zero callers) and its input shape (`amount`) differs from the table (`amount_cents`) — wire-up includes a thin adapter; PM RLS asymmetry (→ Q7) + missing PM write policy on allocations (latent bug, C2); 00096 header comment is the exact checklist of INSERT sites for a NOT NULL column add (allocations route ×3 + save.ts:536); tenant-boundary test should gain an allocation.job-org drift check; linkage invariant test's definition changes exactly as §2.5 states.

## 7. Corrections the sweep forced on §2 (already folded in above)

1. **Wizard pool**: fix lands in `draws/new/page.tsx` (client query), not `approvedInvoicesInPeriod` (dead export — delete or repurpose as the junction-aware pool for a server-side wizard load; C2 will flag the RIDER-1 client-auth surface anyway).
2. **Lien-release sums in `draw_submit_rpc`** must use job-portion amounts (Q6 rec).
3. **`recomputePercentageBillings` fee base** → job portions.
4. **Draw-detail budget-line auto-create** → only from this-job portions.
5. **`canDeleteJob`** → also check `invoice_allocations.job_id`.
6. **Save-path stamping**: `saveParsedInvoice` + allocations GET auto-materialize + PUT are the three INSERT sites (+ 00096's checklist) that must stamp job_id in the SAME commit as the NOT NULL migration.
