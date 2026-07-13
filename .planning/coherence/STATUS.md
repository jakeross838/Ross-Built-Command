# STATUS — invoices+draws big fix (durable session handoff)

**Updated:** 2026-07-13 · **HEAD (origin/main):** `9523c09` · branch `flat-ia-rework` → pushes to `origin/main` (ship-to-prod). Tree clean.

Chat transfer is unreliable — this file is the durable handoff. Read alongside `RESUME.md` (full scope + rulings) and `invoices-draws-deep-dive/HANDOFF.md` (TOP-20).

**STAGE-2 SWEEP COMPLETE** (R1, R2, 2.2, 2.3, 2.4, 2.5a, 2.5b, 2.6). Next = STAGE 3 (redundancy kills) — fresh session, see NEXT.

## Shipped (recent → older)
- **2.5b manual entry** (`9523c09`) — ManualInvoiceForm (mode toggle Upload/Manual on the upload modal) → POSTs the same /api/invoices/save pipeline, confidence 1.0 → PM Queue, flags manual_entry. Verified render+validation. **Live save NOT walked (Rule 12 — invoice write); verified-by-construction; 30-sec authorized walk pending.**
- **2.5a friendly errors** (`4d99901`) — idempotent friendlyIngestError sanitizer across parse/save/parse-next routes + upload/import UIs; raw JSON never user-visible. Unit test 24/24.
- **2.4 new-job honesty** (`9ccfad2`) — Contract-Type vs Billing-Method distinct; Retainage % at creation (WHOLE-percent scale, bound to org default via ORG_COLUMNS fix); generic placeholders. Verified.
- **2.3 determinism** (`2561897`) — intake card + list badge count only amount>0 codes = persisted allocations. DB tie-out + "MULTIPLE (2)" verified.
- **2.2 attribution** (`13829cd`) · **R1 edit-guard** (`d8a0301`) · **R2 signatory** (`3f16aaf`) · **2.6 vendors 404** (verify only).
- **2.2 ATTRIBUTION** (`13829cd`) — real acting user recorded on every approval/action (draws action/adjustments/update-draft/revise + invoices action/batch/partial resolve actorId; literal "system"/"user" gone; AI-parse honestly labeled "AI extraction"); draw activity_log rows now carry user_id; QA queue `getApprovalInfo` keys on the pm_approved entry + resolves UUID→profile name. Verified: QA queue shows "Jake Ross", not "system". Fixes HANDOFF #17.
- **R1 edit-mode guard** (`d8a0301`) — blockingOpenDraw excludes the edited draw; honest "Edit Draw #N — Draft" header. Verified both halves.
- **R2 signatory** (`3f16aaf`) — org pay_app_signatory_name/_title (migration 00121) via /admin/financial "Pay App Signatory"; print blank-when-unset, renders when set. Killed the Jake Ross hardcode. Verified full chain.
- **2.6 gate /people/vendors** — already 404'd by middleware (nwrp232); verified authed 404, vendor API intact. No code change.
- **PRINT FIDELITY** (`32821a9`) — DrawPrintView no longer hardcodes "RETAINAGE (0% …) $0.00": AIA line 5 renders actual `RETAINAGE (N%)` = (amount) + new line 6 `TOTAL EARNED LESS RETAINAGE` + renumber 7/8/9. Contractor letterhead (name+address) + signature org name de-hardcoded from the org row; CONTRACT FOR from job.contract_type. Verified live (Sample Client B draw #1, 10% retainage): line 5 ($2,624.80), line 8 current due $22,983.20 — cent-exact ≡ detail screen. `_data.ts` gains `retainage{percent,amount}` + `contractor{name,address}` on PayAppViewData (snapshot backfills). **Remaining hardcode flagged below.**
- **BLOCK B pt2b TAIL** (`41a5d2f`) — approve-time deposit cap; approved-adjustments **pending pool** (apply endpoint `/api/draws/[id]/adjustments/apply` + preview surfaces pending & counts applied + wizard card); **ledger display fix** (Applied/Remaining include this draft); **edit-mode deposit pre-fill** (editing a draft can't zero its applied deposit). Verified live+DB (Sample Client A): draft #1 persisted $5k; ledger Applied $5,000/Remaining $145,000; applied −$500 adj → statement TOTAL DUE $19,154.56 cent-exact.
- **pt2b core** (`c706bb1`) — deposit input + ledger + line 7a + save cap.
- **HANDOFF #2 credit fix** (`036b53a`) · **pt2a display** (`58921dd`) · **Stage 2.1 sweep** (`ee1765d`) · earlier 1.1d/pt1/1.1/1.1c/1.4/1.5/1.7.

## NEXT — STAGE 3: THE REDUNDANCY KILLS (fresh session; nav/chrome only, NEVER math/state-machines — any kill touching approval/money logic HALTS). Before/after screenshot per kill. Order matters (3.3 first — 3.2 lands on the same surface).
Live recon gathered this session (surfaces confirmed in-browser):
- **`/financials/bills`** = re-export of `src/app/invoices/page.tsx` (the list) + `src/components/financial-view-tabs.tsx` (Invoices/Queue/QA tabs). The list header shows **TWO tab strips**: stage tabs "TO REVIEW / NEEDS ATTENTION / READY FOR DRAW" + a duplicate "ALL / PM REVIEW / ACCOUNTING QA" strip. Two doors: **IMPORT CSV** + **UPLOAD INVOICE** buttons.
- **`/financials/bills/queue`** = re-export of `src/app/invoices/queue/page.tsx` (PM Queue: Quick-Approve + bulk-select). **QA** = `src/app/invoices/qa/page.tsx`.
- **Upload modal** (`invoice-upload-modal` → `invoice-upload-content.tsx`) now has the Upload/Manual toggle (2.5b) — the natural home to demote Import CSV into (3.1). New Job = `NewJobSlideOver` drawer (already exists; 2.4).

1. **3.3 ONE TAB AXIS** (FIRST) — keep the stage tabs (To Review / Needs Attention / Ready for Draw); the role/queue split (ALL/PM REVIEW/ACCOUNTING QA) becomes a FILTER; the duplicate second strip dies. Surface: `invoices/page.tsx` + `financial-view-tabs.tsx`.
2. **3.2 ONE QUEUE** — `/financials/bills` absorbs Quick-Approve + bulk-select from the PM Queue; `/financials/bills/queue` deleted (redirect in next.config). QA folds into the Accounting-QA filter view if clean this session — else report.
3. **3.1 ONE DOOR** — single primary UPLOAD INVOICE; Import CSV demoted inside the upload surface (add an Import tab beside Upload/Manual) as a secondary path; onboarding CTA → same door. Receipt stays a card toggle (already is).
4. **3.4 ONE NEW-JOB** — drawer everywhere; `/jobs/new` deleted (redirect opens the `NewJobSlideOver` drawer); one create-draw affordance, one casing.
(3.5-3.9 — row semantics, DELETE-to-overflow, combobox picker, mutation feedback, vocabulary — later.)

## Flags / open
- **2.5b live-save walk** — pending a one-line Rule-12 go-ahead: fill the Manual Entry form on Sample Client A → confirm it lands in the PM Queue → soft-delete. Save path verified-by-construction (reuses /api/invoices/save).
- **DrawPrintView signatory person/title** — now FULLY configurable (R2). Set to "Jake Ross"/"Director of Construction" for RB via /admin/financial. No open item.
- **Edit-mode/blocking-guard** — RESOLVED by R1. pt2b-tail UI walks (pending-pool DISPLAY, approve-cap race, multi-draft void-returns-pool) are now unblocked; fixtures still in place if you want to walk them: draft `da4ca554` ($5k deposit) + approved adjustment `67d0df76` (−$500) on Sample Client A.
- **Attribution residuals (2.2 scope note):** historical activity_log rows with user_id=NULL still render "System" (no known actor to backfill); defensive `?? roleLabel`/`?? "pm"` fallbacks left (only fire if auth missing).

## Ops
`tsc --noEmit` for green while `next dev` runs (NOT `next build`). Code commits need a fresh `.planning/qa-runs/*-qa-report.md`. Ceiling $150 / surface $120; halt-on-money-surprise; Rule 12 on live financial writes (draw writes on test data authorized per nwrp for verification walks). End every session by updating this file + committing doc-only.
