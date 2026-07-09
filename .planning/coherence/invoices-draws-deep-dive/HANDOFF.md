# HANDOFF — Invoices + Draws deep-dive audit

**Date:** 2026-07-09 · **Auditor lens:** skeptical senior product designer (Linear/Stripe/Ramp), find-don't-fix · **Env:** localhost:3000 = production code (`flat-ia-rework` == `origin/main`), RB org wiped to clean slate, fabricated obviously-fake data created through the app's own flows, real Claude Vision parse. Screenshots in `screenshots/` (Playwright, 1440px viewport, logged in as Jake/OWNER). Raw per-screen log: `_notes.md`. Research it cites: `PRINCIPLES.md`.

**Tags:** `NONSENSE` (fails the make-sense test) · `BUG` (repro'd defect) · `FLOW` (friction) · `COSMETIC` (canon drift). **Severity:** `BLOCKER` · `BAD` · `POLISH`. Each finding names a one-line fix + the violated PRINCIPLES.md ID.

**Bottom line:** the surfaces are *visually* strong — the design system, the review card (source-left/data-right), the over-budget modal, the draw wizard skeleton, the G702 are all well-built. The failures are in **coherence and financial correctness**: a corrupt cost-code seed poisons every coded number, credits and continuation-sheet lines silently vanish from pay applications, the primary Approve action drops edits, and fixture-org data leaks into the real tenant. A pay application assembled today would go to an owner with the wrong cost codes, a missing credit, and a blank G703. Those are the things to fix before polish.

---

## TOP 20 — worst things, ranked

| # | Sev | Finding | Where | Fix (one line) | Principle |
|---|-----|---------|-------|----------------|-----------|
| 1 | BLOCKER | **Cost-code seed has colliding duplicate codes** — two `05101` (Concrete/Foundation *and* Demolition), two `10101` (Framing *and* Plumbing-Rough), two `06101/06102/06103/06104/15101/15102/16101/17101/04101`, `01101`/`03110`/`03112` listed twice, plus Buildertrend/orphan "Code—Code" junk. Coding is ambiguous *by construction*. | picker (#12), G703 (#18/#22) | Dedupe + renumber the 168-code seed; one code = one trade; block duplicate `code` per org. | IA-5 |
| 2 | BLOCKER | **Credit memo silently dropped from the draw.** A selected, stamped -$640 credit (no cost code → no G703 line) is omitted from G702/G703; owner is overbilled by the credit. | draw wizard (#18/#19), draw detail (#20) | Force credits onto a cost code (or a dedicated Adjustments section); a linked invoice must always affect the total. | CARRY-FORWARD |
| 3 | BLOCKER | **G703 continuation sheet renders EMPTY** ("0 line items") on created *and* submitted draws (`draw_line_items` = 0 systemically, even on $50M fixture draws). G702 has totals with no itemized backing. | draw detail (#20) | Persist/compute the G703 rows on draw create; a pay app with a blank continuation sheet is invalid. | WIZARD-SCOPE |
| 4 | BLOCKER | **APPROVE silently discards unsaved allocation edits.** Change a cost code, click Approve (the obvious action) → the *old* code persists; edit needs a separate "Save Allocations". PM unknowingly approves the wrong code. | invoice review (#13) | Approve must commit pending edits (or block with "unsaved changes"); collapse the two save paths. | QUEUE-7 |
| 5 | BLOCKER | **Cross-org data leak.** PM Queue, QA queue, and the draw-wizard Job dropdown all show Verification-Harness-Fixture-Org rows (Smoke Vendor/Job Alpha/Beta/Gamma) inside the Ross Built tenant. The `/financials/bills` list is correctly scoped; these are not. | PM queue (#14), QA queue (#15), wizard (#17) | Filter every queue/dropdown by `membership.org_id` in the query (don't rely on RLS, which platform_admin bypasses). | IA-8 |
| 6 | BAD | **Two parallel invoice-queue surfaces** — `/financials/bills` ("Invoices", stage tabs) vs `/financials/bills/queue` ("PM Queue", inline Quick-Approve + bulk select). Different columns, different capabilities, no canonical home. | queues (#10/#14) | Pick one queue; fold Quick-Approve + bulk-select into it; delete the other. | IA-1 / IA-8 |
| 7 | BAD | **Three upload doors + payload overlap.** Zero-state shows top-right `UPLOAD INVOICE`, onboarding `Upload invoice`, and `IMPORT CSV`; the Upload zone accepts XLSX, so it overlaps Import CSV's payload. | invoices zero-state (#01/#07) | One primary "Add bill ▾" (Upload default / Import CSV / email-in nested); demote CSV; one onboarding CTA. | INTAKE-1/2/7 |
| 8 | BAD | **Two parallel tab strips, overlapping vocabulary.** Row 1 `TO REVIEW / NEEDS ATTENTION / READY FOR DRAW`; row 2 `ALL / PM REVIEW / ACCOUNTING QA`. `TO REVIEW` and `PM REVIEW` show the identical set (both 6). | invoices queue (#01/#10) | Collapse to ONE stage axis; make role/queue a filter, not a second tab strip. | IA-1 / IA-5 |
| 9 | BAD | **Deposit shown but never applied.** G702 line 1a shows a $150,000 deposit, but Current Payment Due ($23,623.20) doesn't draw it down and "Less Previous Certificates" = $0. Owner paid a deposit yet is billed again in full. | draw summary (#19) | Define + apply deposit accounting (offset early draws or show it in "less previous"). Verify intended behavior. | financial logic |
| 10 | BAD | **Create-refresh bug (recurring).** Job create and QA approve succeed server-side but the UI stays stale until a manual reload ("No jobs yet" right after creating a job). Invites duplicate creates / "did it work?". | jobs (#06), QA approve (#16) | Refetch/optimistically update after every mutation; add a success toast. | INVLIST-9 |
| 11 | BAD | **Two different New-Job mechanisms on one page** — header button opens a *drawer*; the header link + empty-state button go to a full-page `/jobs/new`. Same label, two implementations. | jobs (#05) | One New-Job affordance (keep the drawer); delete `/jobs/new` or make all entry points open the drawer. | IA-3 |
| 12 | BAD | **Vendor-name cell links to the INVOICE, not the vendor.** The only way to open an invoice is clicking its vendor name — an overloaded, mislabeled target. | invoices queue (#10) | Make the row open the invoice; make the vendor name → vendor (or drop the link). | IA-3 / IA-5 |
| 13 | BAD | **No-budget jobs flag EVERY invoice "100% over budget."** With no `budget_lines`, every code has $0 budget → the Over-Budget modal fires on every approval, forcing Convert-to-CO / Approve-as-Overage + note each time. Crying wolf. | approve (#13) | Suppress the over-budget gate when no budget is set (or treat unset budget as "not yet budgeted", not "over"). | DESTRUCT-6 |
| 14 | BAD | **Cost-code picker is an unsorted flat 168+ list**, no search, no grouping, jumps 22101→30101→31101→Buildertrend→21101→01101. Brutal to code against. | invoice review (#12) | Searchable combobox, sorted by code, grouped by division. | INVLIST / IA-4 |
| 15 | BAD | **Destructive DELETE shares the action row with APPROVE** (7 co-equal buttons: APPROVE\|PARTIAL\|HOLD\|DENY\|REQUEST INFO\|DOWNLOAD PDF\|DELETE). | invoice review (#11) | Move DELETE/VOID to an overflow menu, danger-styled, away from the primary; triage the 7 by frequency. | DESTRUCT-4 / IA-4 |
| 16 | BAD | **Raw provider error leaked + hollow "upload manually".** Parse failure renders the raw Anthropic JSON (`invalid_request_error…request_id`) to the user; the header says "try again or upload manually" but only Retry exists — no manual-entry path. | parse failure (#08) | Friendly error copy; build a real manual-entry fallback for when AI is down. | honesty |
| 17 | BAD | **Broken approver attribution.** QA queue shows the PM-approver as "system" (I approved as Jake/OWNER) and a raw UUID for fixture rows. Kills the "every approval says WHO" promise. | QA queue (#15) | Log the real acting user; resolve to profile name in the UI. | DESTRUCT-8 / IA-5 |
| 18 | BAD | **Deposit/GC-fee preview lies on first render** (shows 10%/20% for AIA, but saves 30%/40% — both jobs persisted 0.30/0.40); 30%/40% is itself implausible; retainage isn't captured at job creation. | New Job (#05) | Preview must equal what saves; fix the org default; surface retainage at creation for AIA. | IA-5 / IA-6 |
| 19 | BAD | **Breadcrumb root spelled 3 ways** — `FINANCIAL` (invoices) / `FINANCIALS` (draws) / `OPERATIONS` (jobs, a phantom nav section); Draws↔Pay-Apps and Bills↔Invoices renames half-applied; list `/financials/bills` vs detail `/invoices/[id]` namespace split. | all (#01/#02/#03/#10) | Pick one label per section + one route namespace per entity; propagate the rename fully. | IA-2 |
| 20 | BAD | **Review-card cost-code count ≠ what saves, and is non-deterministic.** Card showed "Mixed · 4 codes" then "3 codes" on identical uploads; DB persisted 2 allocations; queue shows "MULTIPLE (2)". | intake (#09/#11) | Show the count that will persist; make coding deterministic per document. | IA-5 |

---

## Redundancy inventory (every duplicated / competing affordance found)

1. **Invoice intake — 3 doors on one screen:** top-right `UPLOAD INVOICE` + onboarding step-3 `Upload invoice` + `IMPORT CSV` (and Upload accepts XLSX, overlapping Import CSV's payload). *(INTAKE-1/2/7)*
2. **New Job — 3 buttons + 2 mechanisms:** nav `+ NEW JOB`, page-header `+ NEW JOB`, empty-state `+ New Job`; header button opens a drawer while header link + empty-state go to `/jobs/new`. *(IA-1/IA-3)*
3. **Create Draw — 2 buttons, mismatched:** header `CREATE NEW DRAW` (uppercase) + empty-state `+ Create Draw` (title case). *(IA-2)*
4. **Two invoice-queue surfaces:** `/financials/bills` ("Invoices", stage tabs) vs `/financials/bills/queue` ("PM Queue", quick-approve/bulk). Quick-Approve + bulk-select exist only on the second. *(IA-1/IA-8)*
5. **Two tab strips on the Invoices queue:** stage (`TO REVIEW/NEEDS ATTENTION/READY FOR DRAW`) + role/status (`ALL/PM REVIEW/ACCOUNTING QA`); `TO REVIEW` and `PM REVIEW` render the same set. *(IA-1/IA-5)*
6. **Jobs zero-state:** dismissible info banner + empty-state card state the same message ("budgets, invoices, and draws all connect here"). *(IA-7)*
7. **Duplicate/overlapping routes:** invoice detail at `/invoices/[id]` while list is `/financials/bills`; plus `/invoices`, `/jobs/[id]/bills`, `/jobs/[id]/invoices` all exist. Draws: `/draws` → `/financials/pay-apps`; `/invoices/queue` → `/financials/bills/queue`. *(IA-1/IA-2)*
8. **Vendor-name link overloaded** as the invoice-open control (no separate row-open). *(IA-3)*
9. **Two allocation save paths** on the invoice review page: `APPROVE` vs `SAVE ALLOCATIONS` (Approve drops the pending edit). *(IA-3/QUEUE-7)*

---

## Click-count table (current vs. obvious minimum)

| Task | Current | Ideal | Note |
|------|---------|-------|------|
| New user adds their first invoice | choose among **3 doors** → Upload → drop → wait → Save & Route | 1 door → drop → auto-review | Ambiguity is the cost, not the clicks (INTAKE-1). |
| Open an invoice from the queue | find + click the **vendor name** (non-obvious target) | click the row | Row isn't clickable; vendor link is mislabeled (IA-3). |
| Approve one clean invoice (no-budget job) | open → APPROVE → over-budget modal → type note → Approve-as-Overage = **4+** | 1 (quick-approve) when in budget | Over-budget fires on every invoice with no budget (DESTRUCT-6). |
| Confirm a job was created | create in drawer → **no feedback** → manually reload = **+2 & a doubt** | 0 (list updates + toast) | Create-refresh bug (INVLIST-9). |
| Correct a miscoded cost code, then approve | change dropdown → **must find Save Allocations** → then Approve; skipping Save loses the fix | change → Approve commits it | Two save paths, silent loss (QUEUE-7). |
| Build + submit a draw | select job → contract gate → Next → Next → review → Next → summary → Create → reload → Submit = **~9** | select → live doc → Submit | Wizard body should be one live document (WIZARD-SCOPE); reload needed (INVLIST-9). |

---

## Per-screen findings (journey order; see `screenshots/`)

Condensed — full detail in `_notes.md` §01–§22. Positives noted because the bar is "does it make sense," not "is it broken."

**01 · Invoices zero-state** (`screenshots/01`) — 3 upload doors + Import-CSV overlap `[NONSENSE/BAD, INTAKE]`; two tab strips, overlapping "review" `[NONSENSE/BAD, IA-1]`; breadcrumb "FINANCIAL" vs draws' "FINANCIALS" `[BUG/BAD, IA-2]`; full filter chrome over an onboarding card in zero-state `[FLOW/POLISH, ZERO]`; Bills↔Invoices rename only hit the URL `[COSMETIC/POLISH]`. *Positive:* honest "0 in this stage · 0 total"; decent 3-step onboarding.

**02 · Draws zero-state** (`screenshots/02`) — Draws↔Pay-Apps rename half-applied (route `pay-apps`, subtitle "pay applications", everything else "Draws") `[COSMETIC/BAD, IA-2]`; two create-draw entries, different label/casing `[NONSENSE/POLISH, IA-2]`; breadcrumb "FINANCIALS" (≠ invoices) `[BUG/BAD]`. *Positive:* strong empty state (centered glyph, one-line value, single CTA) — the model the invoices zero-state should copy.

**03 · Jobs zero-state** (`screenshots/03`) — 3rd breadcrumb spelling "OPERATIONS" for a phantom nav section `[BUG/BAD, IA-2]`; three identical "+ New Job" `[NONSENSE/BAD, IA-1]`; info banner duplicates the empty-state card `[NONSENSE/POLISH, IA-7]`; "Sort: Health" shown with 0 jobs `[FLOW/POLISH]`.

**04 · Intake review card** (`screenshots/04`, headless preview blank — see #07 for the real source render) — source-left / data-right = correct Document-Review template; job auto-matched with provenance; per-field confidence; "Mixed Cost Codes" flag; `SAVE & ROUTE`. *Findings:* cost-code count non-deterministic (4 vs 3) and ≠ persisted allocations `[BUG, IA-5]`.

**05 · Jobs populated** (`screenshots/05`) — clean table (health dot, budget-used, open-invoices); but the create-refresh bug means you only see it after reload `[BUG/BLOCKER, INVLIST-9]`.

**06 · Invoices queue populated** (`screenshots/06`) — `TO REVIEW`==`PM REVIEW` (both 6) `[REDUNDANCY/BAD]`; vendor-name links to the invoice `[NONSENSE/BAD, IA-3]`; "MULTIPLE (2)" ≠ card's "3–4 codes" `[BUG]`; credit memo sits uncoded (—); every PM column "—" (invoices in *PM review* on PM-less jobs) `[NONSENSE/BAD]`. *Positive:* right-aligned money, sortable headers, `[NO INVOICE #]` badge, payment date computed (Jul 30).

**07 · Invoice review / approval** (`screenshots/07`) — source renders correctly (the earlier blank was a headless artifact — NOT a bug); DELETE in the same row as APPROVE `[NONSENSE/BAD, DESTRUCT-4]`; AI mis-coded concrete → "05101 Demolition" (collision) `[BUG]`; audit timeline collapsed by default `[FLOW/POLISH]`; "91% High Confidence" badge on a "Handwritten Detected" scan `[COSMETIC]`. *Positive:* editable-QB vendor field, split-allocations with running reconciliation, model + flags shown.

**08 · PM Queue** (`screenshots/08`) — **cross-org leak** (Smoke Vendor Alpha/Beta) `[BUG/SECURITY/BLOCKER, IA-8]`; a second queue surface entirely `[REDUNDANCY/BAD, IA-1]`; Quick-Approve + bulk only here.

**09 · QA queue** (`screenshots/09`) — **cross-org leak** (Smoke Vendor Gamma) `[BUG/SECURITY]`; approver shows "system" + raw UUID `[BUG/HONESTY/BAD, DESTRUCT-8]`; Mock Concrete still "05101 Demolition" (correction lost).

**10 · Duplicate detection** (`screenshots/10`) — *Positive:* amber "Possibly already in the system · #INV-1001 … pm review" + VIEW→. Soft-warn (Save stays enabled) rather than hard block — arguably better than the spec's "block", but note the divergence and that saving a flagged dup added friction.

**Over-budget modal** (inline, `_notes` #13) — *Positive:* names the over codes + %, requires a note, offers Convert-to-CO. *Finding:* fires on every no-budget approval; "100.0% over $0" math `[NONSENSE/BAD, DESTRUCT-6]`.

**New Job drawer** (inline, `_notes` #05) — *Positive:* "two required fields", defaults, progressive More-Details, inline client-create. *Findings:* Contract-Type and Billing-Method both say "AIA" `[NONSENSE/BAD]`; deposit/fee preview lies on first render `[BUG/BAD]`; two New-Job mechanisms `[NONSENSE/BAD, IA-3]`; real wiped-client PII as placeholders `[BUG/POLISH]`.

**12 · Draw wizard G703 preview** (`screenshots/12`) — **credit memo dropped** `[BUG/BLOCKER]`; **cost-code collision corrupts lines** (drywall→"15102 Gas Tank & Set"; on Job A plumbing→"10101 Framing") `[BUG/BLOCKER]`; SCHEDULED = invoice amounts, no real schedule of values (no budget) `[BUG]`. *Positive:* retainage computes; selection checkboxes with clear copy; THIS PERIOD editable for AIA, read-only (derived) for cost-plus statement.

**13 · Draw wizard G702 summary** (`screenshots/13`) — deposit shown, never applied `[BUG/BAD]`; credit still missing (total overstated by $640) `[BLOCKER]`. *Positive:* correct AIA line 1–9 structure; retainage/balance math checks.

**16 · Draw detail / drill-down** (`screenshots/16`) — **G703 empty (0 line items)** `[BUG/BLOCKER]`; credit "in this draw · 3" but uncounted `[BLOCKER]`; clean lifecycle controls. *(Did not click PRINT — window.print() would block the session.)*

**Draw lifecycle** (inline, `_notes` #21–22) — submit works; **approve blocked on lien releases despite `require_lien_release_for_draw = false`** `[BUG/verify]`; freeze/carry-forward/void/edit-draft not fully walked (blocked by the lien gate + scope). `markup_display` (own-line vs blended) + a deposit toggle exist in schema but no UI control was found `[FLOW]`.

---

## Open design questions (need Jake's call)

1. **Cost codes:** the 168-code seed is full of duplicate codes (two 05101, two 10101, …). Is that intentional legacy data to be cleaned, or a seed bug? A clean, deduped, division-grouped code list is prerequisite to trustworthy G703s. **Highest-leverage decision in this audit.**
2. **Credits on draws:** should a credit memo reduce a specific cost-code line, or live in a dedicated "Adjustments & Credits" section on the pay app (the `draw_adjustments` table suggests the latter was intended)? Either way it must affect the total.
3. **Deposit accounting:** how should the deposit apply to draws — offset early draws until exhausted, show in "Less Previous", or a separate schedule? Today it's displayed but never drawn down.
4. **Two queues:** keep `/financials/bills` (tabs) or `/financials/bills/queue` (PM Queue with Quick-Approve/bulk)? They should be one surface.
5. **Intake doors:** collapse to one "Add bill ▾"? Is CSV import a daily path (keep prominent) or a migration path (demote)? Does "Receipt" doc-type earn a top-level toggle?
6. **Lien-release gate vs setting:** should draw approval hard-block on pending lien releases even when `require_lien_release_for_draw` is off? Reconcile the setting with the behavior.
7. **Cost-plus statement vs AIA:** should a cost-plus open-book job render an AIA G702/G703 at all, or a distinct cost-+-markup statement? Today both use the G702/G703 wizard; only THIS-PERIOD editability differs.
8. **Confidence routing:** none of the fabricated invoices fell below 70% (even the ugly scan parsed at 0.91), so the <70% Diane-triage path wasn't exercised. Want a deliberately-degraded fixture to validate it?

---

## Coverage & method notes

- **Walked live:** invoices zero→populated, New-Job drawer (created 2 jobs), full intake for 6 obviously-fake invoices via real Claude Vision parse (clean+tax, T&M, lump-sum/no-#, credit-line, credit-memo, ugly-scan) + a duplicate, confidence routing, PM review + correct + over-budget + approve, PM Queue, QA queue + QA-approve, draws zero→wizard(all 4 steps, both AIA & cost-plus)→create→submit→approve-gate, draw detail. DB-verified at each step.
- **Not fully walked (noted, not blocking):** PM Hold/Deny/Request-Info + QA Kick-Back branches (controls present); a clean correct→learn retest via Save-Allocations; draw freeze/snapshot, carry-forward, void, edit-draft (blocked by the lien-release gate + scope); the deposit toggle / own-line-vs-blended renderer (schema `markup_display` exists; UI control not located); the <70% Diane-triage path (fixtures parsed too cleanly).
- **Env caveat:** to reach J2 with data, the 6 fabricated test invoices were advanced PM→QA→qa_approved partly via SQL (documented) after the PM/QA UI was thoroughly walked on one invoice; this only moved status on freshly-fabricated test data.
