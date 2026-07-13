# STATUS — invoices+draws big fix (durable session handoff)

**Updated:** 2026-07-13 · **HEAD (origin/main):** `13829cd` · branch `flat-ia-rework` → pushes to `origin/main` (ship-to-prod). Tree clean.

Chat transfer is unreliable — this file is the durable handoff. Read alongside `RESUME.md` (full scope + rulings) and `invoices-draws-deep-dive/HANDOFF.md` (TOP-20).

## Shipped (recent → older)
- **2.2 ATTRIBUTION** (`13829cd`) — real acting user recorded on every approval/action (draws action/adjustments/update-draft/revise + invoices action/batch/partial resolve actorId; literal "system"/"user" gone; AI-parse honestly labeled "AI extraction"); draw activity_log rows now carry user_id; QA queue `getApprovalInfo` keys on the pm_approved entry + resolves UUID→profile name. Verified: QA queue shows "Jake Ross", not "system". Fixes HANDOFF #17.
- **R1 edit-mode guard** (`d8a0301`) — blockingOpenDraw excludes the edited draw; honest "Edit Draw #N — Draft" header. Verified both halves.
- **R2 signatory** (`3f16aaf`) — org pay_app_signatory_name/_title (migration 00121) via /admin/financial "Pay App Signatory"; print blank-when-unset, renders when set. Killed the Jake Ross hardcode. Verified full chain.
- **2.6 gate /people/vendors** — already 404'd by middleware (nwrp232); verified authed 404, vendor API intact. No code change.
- **PRINT FIDELITY** (`32821a9`) — DrawPrintView no longer hardcodes "RETAINAGE (0% …) $0.00": AIA line 5 renders actual `RETAINAGE (N%)` = (amount) + new line 6 `TOTAL EARNED LESS RETAINAGE` + renumber 7/8/9. Contractor letterhead (name+address) + signature org name de-hardcoded from the org row; CONTRACT FOR from job.contract_type. Verified live (Sample Client B draw #1, 10% retainage): line 5 ($2,624.80), line 8 current due $22,983.20 — cent-exact ≡ detail screen. `_data.ts` gains `retainage{percent,amount}` + `contractor{name,address}` on PayAppViewData (snapshot backfills). **Remaining hardcode flagged below.**
- **BLOCK B pt2b TAIL** (`41a5d2f`) — approve-time deposit cap; approved-adjustments **pending pool** (apply endpoint `/api/draws/[id]/adjustments/apply` + preview surfaces pending & counts applied + wizard card); **ledger display fix** (Applied/Remaining include this draft); **edit-mode deposit pre-fill** (editing a draft can't zero its applied deposit). Verified live+DB (Sample Client A): draft #1 persisted $5k; ledger Applied $5,000/Remaining $145,000; applied −$500 adj → statement TOTAL DUE $19,154.56 cent-exact.
- **pt2b core** (`c706bb1`) — deposit input + ledger + line 7a + save cap.
- **HANDOFF #2 credit fix** (`036b53a`) · **pt2a display** (`58921dd`) · **Stage 2.1 sweep** (`ee1765d`) · earlier 1.1d/pt1/1.1/1.1c/1.4/1.5/1.7.

## NEXT (in order) — fresh-session entry point (3 sweep items remain)
1. **2.3 DETERMINISM** (#20) — **root cause already found:** the intake review card's cost-code count ("Mixed · 4 codes" then "3 codes" on identical uploads) ≠ persisted allocations (DB=2) ≠ queue "MULTIPLE (2)". Investigate the intake review card's code-count derivation (the one-model dominant-line-code resolution in `src/lib/invoices/save.ts` `resolveDominantLineCode` + the card's client-side count in the intake/review component). Show the count that WILL persist; make coding deterministic per document. Surfaces: intake review card + `/invoices/queue` "MULTIPLE (N)" cell.
2. **2.4 NEW-JOB HONESTY** (#18) — preview values ≡ what saves; label **Contract-Type vs Billing-Method distinctly** (they're conflated in job create); **retainage field at job creation for AIA** jobs; **generic placeholder text** (no Drummond/RB bleed). Surface: the New Job flow (`+ NEW JOB` → job create form) + the draw wizard's job-setup inline form (`src/app/draws/new/page.tsx` needsSetup block already captures contract + retainage — mirror that honesty at job creation).
3. **2.5 PARSE ERRORS + MANUAL-ENTRY** (#16) — friendly copy (raw provider JSON **never** user-visible) on parse failure + a **minimal manual-entry fallback form** (vendor, #, date, job, lines, amounts) so intake survives an AI outage. Keep it minimal. Surface: invoice upload/parse path (`src/lib/invoices/*` + the intake/upload UI); wire the fallback where a parse error currently surfaces.

## Flags / open
- **DrawPrintView signatory person/title** — now FULLY configurable (R2). Set to "Jake Ross"/"Director of Construction" for RB via /admin/financial. No open item.
- **Edit-mode/blocking-guard** — RESOLVED by R1. pt2b-tail UI walks (pending-pool DISPLAY, approve-cap race, multi-draft void-returns-pool) are now unblocked; fixtures still in place if you want to walk them: draft `da4ca554` ($5k deposit) + approved adjustment `67d0df76` (−$500) on Sample Client A.
- **Attribution residuals (2.2 scope note):** historical activity_log rows with user_id=NULL still render "System" (no known actor to backfill); defensive `?? roleLabel`/`?? "pm"` fallbacks left (only fire if auth missing).

## Ops
`tsc --noEmit` for green while `next dev` runs (NOT `next build`). Code commits need a fresh `.planning/qa-runs/*-qa-report.md`. Ceiling $150 / surface $120; halt-on-money-surprise; Rule 12 on live financial writes (draw writes on test data authorized per nwrp for verification walks). End every session by updating this file + committing doc-only.
