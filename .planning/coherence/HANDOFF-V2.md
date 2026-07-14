# HANDOFF-V2 — Invoices + Draws RE-GAUNTLET (Stage 4)

**Date:** 2026-07-14 · **Session:** verification / re-gauntlet · **HEAD:** `a6c7ede` (+ this session's openers commit) · branch `flat-ia-rework` → origin/main.
**Predecessor:** `invoices-draws-deep-dive/HANDOFF.md` (the 2026-07-09 audit — TOP-20 + per-screen §01–22 + click table). This file keys every disposition to that numbering.

**Method note (READ FIRST — this is not a full live walk):** the audit's TOP-20 were largely fixed across Stages 1–3 (prior sessions). This session's job was to RE-VERIFY. Two hard constraints shaped it:

1. **Budget.** The full live gauntlet as written (wipe RB + regenerate fresh data through real Claude Vision + walk all ~24 J1/J2 sub-paths + before/after screenshots) is a **~$300–600 browser session** — 3–5× the **$120 surface / $150 ceiling** set for this session. Per the standing "HALT and bank rather than squeeze" rule, I did **not** run the destructive wipe/regenerate or the screenshot-dense live walk.
2. **A money-logic finding (NEW-2 below) is a HALT trigger** per the session rule "anything money-logic HALTS."

So this session verified the money-critical dispositions **browser-free** (code read end-to-end + DB/SQL tie-outs, cent-exact) and hands the **live confirmation** to **JAKE'S WALK LIST** at the bottom (~30 min → approved draw + printed docs). Evidence type is stated per finding: `[CODE]` `[DB]` `[SQL-tieout]` `[WALK]` (needs a live click to close).

**Data-safety cleared (Rule 10 — verified, not inferred):** RB org (`…0001` = "Ross Built Custom Homes") holds ONLY the two fabricated audit fixtures — "Sample Client A — 123 Test St" and "Sample Client B — 456 Demo Ave" (6 invoices, 2 draws). **Fish (`92a38296…`) and Drummond do not exist anywhere in the DB** — the audit wipe removed them. The "Fish is real operational data" memory now names data that is gone (corrected at close). No real data was at risk; no wipe was performed this session.

---

## Openers (this session's only code changes — both banked, tsc green)

**(a) Adversarial diff-read of the 3.2 ONE-QUEUE absorb (money-gate wiring).** Read as a hostile reviewer hunting eligibility bypasses / state-leaks-between-rows / batch partial-failure mishandling. Traced the entire surface to ground truth: `approval-eligibility.ts`, `useInvoiceApproval.ts`, `invoices/page.tsx` (list absorb), `api/invoices/list/route.ts`, `api/invoices/batch-action/route.ts`, `api/invoices/[id]/action/route.ts`.

- **Verdict: money-gate is SOUND.** The server is authoritative and **fails closed** — both approval routes re-fetch org-scoped, re-validate the *full* blocker set (job/cost-code, duplicate, invoice-date, budget-allocation, PO-linkage), enforce the `batch_approval_enabled` kill-switch, and 422 when settings can't be read. The client module's "null settings → everything eligible" branch is **unreachable from the list** (`batchEnabled`/`quickApproveEnabled` gate on `workflowSettings?.X ?? false`, so no approval UI renders until settings resolve). `onMutated` advances only `result.success` ids to the correct target status; checkboxes render only on actionable rows. No bypass, no cross-row leak that writes wrong data, no partial-failure mishandling. `[CODE]`
- **NEW-1 (POLISH) — FIXED this session.** `confirmQuickApprove` didn't clear the quick-approved id from `selectedIds`, so quick-approving a checkbox-selected row left a departed id in the floating-bar `count` (count≠total) and could ship a stale id to a later hold/deny (server safely rejects it). Trivial+safe wiring fix applied in `useInvoiceApproval.ts` (drop the id alongside `onMutated`). tsc green. `[CODE]` → confirm in walk step J1-3.

**(b) Deleted orphaned `src/app/invoices/queue/page.tsx`** — unreachable dead code (the `financials/bills/queue` re-export is now a pure `redirect()`; every other reference is a provenance comment or a URL nav that `next.config.mjs:99` 308-redirects independent of the file). Removed the stale generated `.next/types` stub; **tsc exit 0.** `[CODE]`

---

## TOP-20 disposition (keyed to the audit's numbering)

| # | Sev | Finding (audit) | Status | Fixed by / evidence |
|---|-----|-----------------|--------|---------------------|
| 1 | BLOCKER | Cost-code seed has colliding duplicate codes | **FIXED** `[DB]` | 1.1/1.1c/1.1d. Root cause was a **cross-org leak** (8j Test Co codes feeding RB's AI), not RB contamination. RB now has **162 codes, 0 duplicate `code` values, 3 unique indexes**. |
| 2 | BLOCKER | Credit memo silently dropped from the draw | **FIXED** `[SQL-tieout]` ⚠️ | HANDOFF-#2 credit fix (`036b53a`) + BLOCK B. `uncapturedLinkedInvoices` folds a −$640 uncoded credit into line 8 **and** Adjustments & Credits. Linkage invariant cent-exact on draw B: `linked $25,608.00 − captured $26,248.00 = −$640.00 uncaptured`. Render shows line 8 = **$22,983.20** (credit applied). ⚠️ **but see NEW-2** — the stored column that carry-forward reads still holds the credit-*dropped* $23,623.20. |
| 3 | BLOCKER | G703 continuation sheet renders EMPTY | **FIXED via compute-on-read** `[CODE]` → `[WALK]` | BLOCK B pt1 G703 union. `draw_line_items = 0` is **BY DESIGN** (CLAUDE.md "never store computed values"); `_data.ts` builds `lineItems` from the `computeDrawLines` snapshot (allocations → line-items → invoice-level code), so a no-budget job still yields a real G703. Confirm the sheet renders lines in walk J2-6. |
| 4 | BLOCKER | APPROVE discards unsaved allocation edits | **FIXED** `[CODE]` → `[WALK]` | 1.4 approve-flushes-allocations (`2c2018c`). The `[id]/action` route commits `updates` atomically with the status change (`updatePayload = { status, status_history, ...updates }`). Confirm the review page ships pending edits on Approve in walk J1-2. |
| 5 | BLOCKER | Cross-org data leak (fixture-org rows in RB queues/dropdowns) | **FIXED** `[CODE][DB]` | Stage 2.1 cross-org sweep (`ee1765d`) org-scoped every client picker/queue/dropdown; 3.2 retired the leaky PM Queue into the org-scoped list. `list`/`batch-action`/`[id]/action` all `.eq(org_id)`. |
| 6 | BAD | Two parallel invoice-queue surfaces | **FIXED** `[CODE]` | 3.2 ONE QUEUE — PM Queue machinery absorbed into the Bills list; queue retired via redirect. |
| 7 | BAD | Three upload doors + payload overlap | **FIXED** `[CODE]` → `[WALK]` | 3.1 ONE DOOR — single Upload modal with Upload/Manual/Import tabs; CSV demoted. Confirm in J1-1. |
| 8 | BAD | Two parallel tab strips, overlapping vocab | **FIXED** `[CODE]` | 3.3 ONE TAB AXIS — stage tabs are the only axis; PM-vs-QA is a Review filter dropdown. |
| 9 | BAD | Deposit shown but never applied | **FIXED** `[DB]` | BLOCK B pt2 — deposit-apply input + ledger. Draw A carries `deposit_applied_cents = 500000` ($5,000); line 8 explicit deduction between 7 and 8. |
| 10 | BAD | Create-refresh bug (stale UI after mutation) | **FIXED** `[CODE]` → `[WALK]` | 3.8 mutation feedback (flash strip) + 3.4 drawer-in-place + 2.2 attribution. Confirm job-create + QA-approve feedback in J1-4/J1-5. |
| 11 | BAD | Two different New-Job mechanisms | **FIXED** `[CODE]` | 3.4 ONE NEW-JOB — drawer-in-place from every entry point. |
| 12 | BAD | Vendor-name cell links to the invoice | **FIXED** `[CODE]` | 3.5 ROW SEMANTICS — row opens the invoice, vendor is plain text, Inv# is the real `<Link>`. |
| 13 | BAD | No-budget jobs flag EVERY invoice over-budget | **FIXED** `[CODE]` | 1.7 over-budget wolf (`2c2018c`). Server gate fires only when `revised_estimate > 0`. |
| 14 | BAD | Cost-code picker is a flat unsorted 168-list | **FIXED** `[CODE]` | 3.7 CODE PICKER — `CostCodeCombobox` (searchable, division-grouped, code-sorted). |
| 15 | BAD | Destructive DELETE shares the action row | **FIXED** `[CODE]` | 3.6 ACTION HIERARCHY — Delete + secondaries moved to an overflow "More" menu, danger below a divider. |
| 16 | BAD | Raw provider error + hollow "upload manually" | **FIXED** `[CODE]` | 2.5a friendly-error sanitizer + 2.5b real manual-entry path. |
| 17 | BAD | Broken approver attribution ("system"/raw UUID) | **FIXED** `[CODE]` | 2.2 attribution — real acting user in `status_history`; QA queue resolves UUID → profile name. |
| 18 | BAD | New-Job deposit/GC-fee preview lies; no retainage | **FIXED** `[CODE]` | 2.4 new-job honesty — preview ≡ what saves; retainage captured at creation (whole-percent). |
| 19 | BAD | Breadcrumb spelled 3 ways + namespace split | **PARTIAL** `[CODE]` | 3.9 fixed the labels (one breadcrumb root per section; killed the phantom "OPERATIONS"). **Route-namespace split (Bills/Invoices, Pay-Apps/Draws URL-vs-label) DEFERRED** — route-consolidation proposal, Jake's call (residual). |
| 20 | BAD | Review-card code count ≠ persists, non-deterministic | **FIXED** `[CODE][DB]` | 2.3 determinism — count only `amount_cents > 0` allocations; the list route's `line_item_summary` mirrors it. |

**Tally: 18 FIXED · 1 PARTIAL (#19 labels fixed, route namespace deferred) · all four money BLOCKERS (#1/#2/#3/#9) verified fixed — with #2 carrying the NEW-2 caveat below.**

---

## Per-screen status (audit §01–22 shots, condensed)

- **01 invoices zero-state** — 3 doors→1 (7 FIXED); two strips→one (8 FIXED); "FINANCIAL"→"Financials ·" (19 FIXED); zero-state chrome hidden so SetupGuide stands alone (3.9). ✓
- **02 draws zero-state** — breadcrumb unified (19); create-draw casing unified "New Draw" (3.4). ✓
- **03 jobs zero-state** — "OPERATIONS" phantom killed (19); 3 New-Job → one drawer (11); banner/empty-state dupe collapsed (3.9). ✓
- **04 intake review card** — code count deterministic ≡ persisted (20 FIXED). ✓ `[WALK]` re-confirm on a real upload.
- **05 jobs populated** — create-refresh fixed (10). ✓ `[WALK]`
- **06 invoices queue populated** — vendor→invoice link fixed (12); "MULTIPLE (N)" ≡ persisted (20); one queue (6). ✓
- **07 invoice review/approval** — DELETE moved to overflow (15); code picker combobox (14); approve commits edits (4). ✓ `[WALK]`
- **08 PM queue** — cross-org leak fixed + surface retired (5/6). ✓
- **09 QA queue** — cross-org leak fixed (5); attribution shows real user (17). ✓ `[WALK]`
- **10 duplicate detection** — soft-warn preserved; the gate is server-enforced on approve. ✓ `[WALK]` (dup pair fixture needed).
- **over-budget modal** — no longer fires on no-budget jobs (13). ✓
- **New Job drawer** — preview ≡ saves; retainage at creation; one mechanism (18/11). ✓
- **12 G703 preview** — credit no longer dropped (2); collisions gone (1). ✓ `[WALK]`
- **13 G702 summary** — deposit applied (9); credit in total (2). ✓ `[WALK]`
- **16 draw detail** — G703 computed-on-read (3); credit counted (2). ✓ `[WALK]` **+ NEW-2 carry-forward check**.
- **draw lifecycle** — lien gate honors setting (1.5); freeze snapshot at approval exists (`captureAndStoreSnapshot`). ✓ `[WALK]` (submit→approve→freeze byte-identical).

---

## Click-count table — re-measured vs the audit

| Task | Audit | **Now** | Note |
|------|-------|---------|------|
| New user adds first invoice | 3 doors → … | **1 door → drop → auto-review** | 3.1 ONE DOOR. At ideal. |
| Open an invoice from the queue | click vendor name | **click the row** | 3.5 row-nav. At ideal. |
| Approve one clean invoice (no-budget job) | 4+ (over-budget every time) | **1 (quick-approve)** when in budget | 1.7 killed the no-budget wolf; 3.2 quick-approve on the list. At ideal. |
| Confirm a job was created | +2 & a doubt (manual reload) | **0 (drawer closes, list updates, flash)** | 3.4 + 3.8. At ideal. |
| Correct a miscode, then approve | change → find Save Allocations → Approve (loses if skipped) | **change → Approve commits** | 1.4. At ideal `[WALK]`. |
| Build + submit a draw | ~9 + reload | **~7–8, no reload** | Wizard still multi-step (WIZARD-SCOPE "one live doc" not adopted); reload gone (3.8). Improved, not ideal. |

---

## NEW findings (this session; same taxonomy)

- **NEW-1 · POLISH · `[CODE]` FIXED** — quick-approve didn't clear the row from batch selection (count≠total; stale id to later hold/deny). Fixed in `useInvoiceApproval.ts`. Confirm J1-3.

- **NEW-2 · BAD (money-logic) · `[SQL-tieout]` · HALT — NOT fixed (surfaced for Jake).** The **carry-forward reads a stale stored column.** `lessPreviousCertificatesForJob` (draw-calc.ts:390) computes G702 **line 7 ("less previous certificates")** from the prior draw's **stored `draws.current_payment_due` column** — but that column is written only at draft-save and is **never refreshed by `draw_submit_rpc`** (verified: the submit RPC touches status/invoices/lien-releases only, not `current_payment_due`). Meanwhile the detail/print **recompute on read** (`_data.ts`) and correctly apply the TS-only uncaptured-credit / deposit / adjustment terms.
  - **Evidence (submitted draw B, `3ff2ea6e`):** stored `current_payment_due = $23,623.20` (credit dropped) vs recomputed render `$22,983.20` (−$640 credit applied — RESUME's own PRINT-FIDELITY note recorded $22,983.20 live). A **carry-forward draw #2 would inherit line 7 = $23,623.20, $640 too high**, understating draw #2's payment due by $640.
  - **Scope:** any submitted draw whose source (credit/deposit/adjustment) changed after the last draft-save. The existing staleness detector (`storedSummaryStale`, nwrp286) was built for exactly this drift but **only runs for `draft` status** — submitted draws are uncovered. Latent on the fixture (no draw #2 exists yet); the "carry-forward on the next draw" walk (J2-7) would surface it live.
  - **Why HALT not fix:** this is draw money-math. The fix is a money-logic decision (canonicalize on the recompute/snapshot, OR refresh the stored column on submit, OR extend the staleness signal to submitted draws) — Jake's call, not a rendering/wiring fix.

- **OBS (pre-existing parity, not a 3.2 regression) · `[CODE]`** — the batch hook never surfaces `result.failed` reasons; a server-side rejection just "approves fewer than clicked." The pre-submit excluded-split covers client-known blockers, so it only bites on client/server divergence or a concurrent edit. Feature-add (money-adjacent honesty) → deferred.

---

## Residual list (known-deferred — carried forward)

- **NEW-2 carry-forward staleness** (money-logic; awaiting Jake's decision — top of the list).
- **QA-page absorb** — `/financials/bills/qa` still a separate action surface; needs a `useInvoiceQaReview` sibling hook (3.2 step-5 "not clean").
- **Route-namespace reconciliation (#19 tail)** — Bills/Invoices + Pay-Apps/Draws URL-vs-label split; pick one namespace + 301, or treat URLs as internal. Jake's call.
- **Receipts** — no top-level "Receipt" doc-type toggle (audit open Q5).
- **QuickBooks push** — Phase 4, not built.
- **Fixed-fee statement renderer** — `billing_method = fixed_fee_schedule` fork present in `_data.ts` but the renderer is not built (AIA + cost-plus statement only).
- **Phase-B modal review** — `/financials/bills/[id]` mounts a placeholder `InvoiceReviewView` (not reached; rows link `/invoices/[id]`).
- **Confidence <70% triage path** — **still unexercised** (audit open Q8). Min fixture confidence is 0.82; no degraded fixture exists. Needs a deliberately-degraded upload to validate the Diane-triage route.
- **WIZARD-SCOPE** — draw wizard is still multi-step, not "one live document."
- **2.5b live-save walk** — manual-entry save verified-by-construction; a 30-sec live walk still pending.

---

## JAKE'S WALK LIST — ~30 min, ends at an approved draw + printed docs

Existing fixtures suffice for most of it; a few steps need you to create a fixture through the UI (noted). Run on `localhost:3000` (restart `next dev` if the 5-day-old server is stale), logged in as yourself.

**J1 — Invoices (~15 min)**
1. **`/financials/bills`** — confirm ONE "Upload Invoice" door (top-right), the single stage-tab strip (To Review / Needs Attention / Ready for Draw) with a **Review** dropdown (not a second strip), and that **clicking a row** (neutral cell) opens the invoice; vendor name is plain text; Inv# is a link. *(6, 8, 12)*
2. **Upload 2–3 fabricated invoices** (drag a PDF; one clean, one degraded/handwritten to force **<70% confidence** — the untested path). At the review card: confirm the **code count is deterministic** and matches what saves; **change a cost code** via the searchable combobox; click **Approve** and confirm the *changed* code persists (no separate Save needed) and **no over-budget modal** fires on the no-budget job. *(4, 13, 14, 20, + confidence-triage residual)*
3. **To Review → Review: PM Review** — tick **2 eligible** rows → floating batch bar → **Approve All** → confirm the **eligible/excluded split** (blocked rows named with reasons) → confirm → counts update + flash. **NEW-1 check:** with 2 rows selected, click **Quick-Approve** on one of them inline — the bar count must drop to **1** (not stay 2). *(3.2, NEW-1)*
4. Open one invoice → **More** menu (Delete is here, danger-styled) → exercise **Hold / Deny / Request-Info** once each (note required) → confirm the audit timeline shows **your name**, not "system". *(15, 17)*
5. **Review → Accounting QA** → open a `pm_approved`/`qa_review` invoice → **QA Approve** (see the approval stamp) and **Kick Back** one (note) → confirm attribution + that the stamp shows job/code/amount/approver. *(17, stamp)*

**J2 — Draws / Pay Apps (~15 min)**
6. **`/financials/pay-apps`** → open **Sample Client B — Draw #1** (submitted). Confirm the **G703 continuation sheet renders line items** (not "0 line items"), the **−$640 credit** appears under **Adjustments & Credits**, and **line 8 = $22,983.20** (credit applied). *(2, 3)*
7. **NEW-2 (money-logic) live check** — create **Draw #2** on Sample Client B. Inspect line 7 **"less previous certificates."** If it reads **$23,623.20** → **NEW-2 confirmed** (should be **$22,983.20**). If it reads $22,983.20 → NEW-2 is not reachable via this path and can be downgraded. *(NEW-2)*
8. Open **Sample Client A — Draw #1** (draft). Confirm the **deposit ledger** (pool / applied $5,000 / remaining); the **approved-adjustments pending pool** ("N approved credits not yet applied") is **visible but not counted**; **apply one** and watch the total move. *(9, adjustments)*
9. **Print** the draw (both renderers if you flip the job's billing method): confirm **retainage is real** (not hardcoded 0%), the **signatory** is the org-configured name/title, and the printed line 8 is **cent-exact ≡** the detail screen. *(print fidelity, R2)*
10. **Submit → Approve** a draft draw → confirm the **freeze**: edit a source invoice afterward and re-open the approved draw — the financials must be **byte-identical** (snapshot). *(freeze)*

Ending state: one draw **approved** (frozen) + its documents **printed**, having touched every fixed blocker and the two open money questions (NEW-2 carry-forward, <70% confidence path).
