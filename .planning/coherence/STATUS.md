# STATUS — invoices+draws big fix (durable session handoff)

**Updated:** 2026-07-13 · **HEAD (origin/main):** `e4fa411` · branch `flat-ia-rework` → pushes to `origin/main` (ship-to-prod). Tree clean.

Chat transfer is unreliable — this file is the durable handoff. Read alongside `RESUME.md` (full scope + rulings) and `invoices-draws-deep-dive/HANDOFF.md` (TOP-20).

**STAGE 2 FULLY CLOSED** (incl. 2.5b live-save verified: manual invoice → PM Queue, flags [manual_entry], soft-deleted). **STAGE 3 in progress: 3.3 + 3.1 + 3.4 shipped; 3.2 HALTED (see ⚠); 3.5–3.9 remain.**

## ⚠ 3.2 ONE QUEUE — HALTED (Stage-3 HARD RULE). Decision needed.
Absorbing Quick-Approve + bulk-select into /financials/bills means relocating ~1500 lines of **approval-control machinery** (Quick-Approve eligibility `isQuickApproveEligible`/`getApprovalBlockers`, batch approve/hold/deny modals, selection, floating bar) from `invoices/queue/page.tsx` (1583 ln, has it all) into `invoices/page.tsx` (1030 ln, has ZERO). That's approval-adjacent + regression-prone; a redirect-without-porting would REMOVE bulk-approve (a functionality regression). Per "any kill that would touch approval/money logic HALTS," left for a focused pass — recommend extracting the approve machinery into a shared component tested against the approval flows, OR a product call on whether losing bulk-approve on a first-step redirect is acceptable.

## Shipped (recent → older)
- **STAGE 3 · 3.4 ONE NEW-JOB** (`e4fa411`) — in-app "New Job" triggers (jobs/page, job-sidebar) open the drawer OVER the current page (Link→button onClick open) instead of the /jobs/new→Bills redirect hop; create-draw affordance casing unified to "New Draw". Verified drawer-in-place.
- **STAGE 3 · 3.1 ONE DOOR** (`d7c739e`) — single Upload Invoice door; Import CSV demoted to a 3rd mode tab (Upload/Manual/Import) inside the upload modal; ?action=import deep-links to import mode; deleted orphaned invoice-import-modal. Verified.
- **STAGE 3 · 3.3 ONE TAB AXIS** (`65dee39`) — the duplicate ALL/PM/QA second strip → a "Review" filter dropdown; stage tabs are the only tab axis. Verified.
- **STAGE 2 (all): 2.5b** (`9523c09`, live-save verified this session) · **2.5a** (`4d99901`) · **2.4** (`9ccfad2`) · **2.3** (`2561897`) · **2.2** (`13829cd`) · **R1** (`d8a0301`) · **R2** (`3f16aaf`) · **2.6** (verify) · print-fidelity (`32821a9`) · pt2b (`41a5d2f`/`c706bb1`) · HANDOFF#2 (`036b53a`) · pt2a (`58921dd`) · 2.1 (`ee1765d`).
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

## NEXT — STAGE 3 remaining kills (fresh session; nav/chrome only, NEVER math/state-machines — halt if approval/money logic; before/after screenshot per kill). Do 3.2 (see ⚠) as its own focused pass.
- **3.5 ROW SEMANTICS** — `invoices/page.tsx` (list) + `invoices/queue/page.tsx`: row click opens the invoice (`window.location.href = /invoices/[id]` already on some rows — verify list rows); vendor name = plain text, NOT a link (recon: vendor-name-links-to-invoice was flagged NONSENSE in HANDOFF #06).
- **3.6 ACTION HIERARCHY** — the invoice detail/review page (`invoices/[id]/page.tsx`) + row actions: DELETE/VOID into a danger-styled overflow menu; primary row = Approve + the 2-3 frequent actions. (HANDOFF #07: "DELETE in the same row as APPROVE".) CHROME ONLY — don't touch the approve/void endpoints.
- **3.7 CODE PICKER** — the review page allocation picker → the existing `CostCodeCombobox` (searchable, grouped by category). Surface: `invoices/[id]/page.tsx` allocation UI (+ InvoiceDetailsPanel).
- **3.8 MUTATION FEEDBACK** — refetch/optimistic + flash strip after create/approve/route. Sweep: job create (drawer already flashes), invoice route/approve, QA approve, draw create. (HANDOFF #10: create-refresh staleness.) Note: `useFlash`/FlashProvider + the `nw:job-created` event pattern already exist — reuse.
- **3.9 VOCABULARY** — one breadcrumb root; "Draw" everywhere, "Invoices" consistently. LABELS ONLY, no route renames; report a route-consolidation proposal for later. Plus: zero-states adopt the Draws model; jobs banner/empty-state dupe collapsed; filter chrome hidden at zero-state.

Recon (surfaces): `/financials/bills` = `invoices/page.tsx`; `/financials/bills/queue` = `invoices/queue/page.tsx`; QA = `invoices/qa/page.tsx`; review = `invoices/[id]/page.tsx` + `components/invoices/InvoiceDetailsPanel.tsx`. FinancialViewTabs (Invoices/Queue/QA) at `components/financial-view-tabs.tsx` still on queue/qa pages (collapses with 3.2).

## Flags / open
- **2.5b live-save walk** — pending a one-line Rule-12 go-ahead: fill the Manual Entry form on Sample Client A → confirm it lands in the PM Queue → soft-delete. Save path verified-by-construction (reuses /api/invoices/save).
- **DrawPrintView signatory person/title** — now FULLY configurable (R2). Set to "Jake Ross"/"Director of Construction" for RB via /admin/financial. No open item.
- **Edit-mode/blocking-guard** — RESOLVED by R1. pt2b-tail UI walks (pending-pool DISPLAY, approve-cap race, multi-draft void-returns-pool) are now unblocked; fixtures still in place if you want to walk them: draft `da4ca554` ($5k deposit) + approved adjustment `67d0df76` (−$500) on Sample Client A.
- **Attribution residuals (2.2 scope note):** historical activity_log rows with user_id=NULL still render "System" (no known actor to backfill); defensive `?? roleLabel`/`?? "pm"` fallbacks left (only fire if auth missing).

## Ops
`tsc --noEmit` for green while `next dev` runs (NOT `next build`). Code commits need a fresh `.planning/qa-runs/*-qa-report.md`. Ceiling $150 / surface $120; halt-on-money-surprise; Rule 12 on live financial writes (draw writes on test data authorized per nwrp for verification walks). End every session by updating this file + committing doc-only.
