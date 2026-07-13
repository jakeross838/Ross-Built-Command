# STATUS — invoices+draws big fix (durable session handoff)

**Updated:** 2026-07-13 · **HEAD (origin/main):** `32821a9` · branch `flat-ia-rework` → pushes to `origin/main` (ship-to-prod). Tree clean.

Chat transfer is unreliable — this file is the durable handoff. Read alongside `RESUME.md` (full scope + rulings) and `invoices-draws-deep-dive/HANDOFF.md` (TOP-20).

## Shipped (recent → older)
- **PRINT FIDELITY** (`32821a9`) — DrawPrintView no longer hardcodes "RETAINAGE (0% …) $0.00": AIA line 5 renders actual `RETAINAGE (N%)` = (amount) + new line 6 `TOTAL EARNED LESS RETAINAGE` + renumber 7/8/9. Contractor letterhead (name+address) + signature org name de-hardcoded from the org row; CONTRACT FOR from job.contract_type. Verified live (Sample Client B draw #1, 10% retainage): line 5 ($2,624.80), line 8 current due $22,983.20 — cent-exact ≡ detail screen. `_data.ts` gains `retainage{percent,amount}` + `contractor{name,address}` on PayAppViewData (snapshot backfills). **Remaining hardcode flagged below.**
- **BLOCK B pt2b TAIL** (`41a5d2f`) — approve-time deposit cap; approved-adjustments **pending pool** (apply endpoint `/api/draws/[id]/adjustments/apply` + preview surfaces pending & counts applied + wizard card); **ledger display fix** (Applied/Remaining include this draft); **edit-mode deposit pre-fill** (editing a draft can't zero its applied deposit). Verified live+DB (Sample Client A): draft #1 persisted $5k; ledger Applied $5,000/Remaining $145,000; applied −$500 adj → statement TOTAL DUE $19,154.56 cent-exact.
- **pt2b core** (`c706bb1`) — deposit input + ledger + line 7a + save cap.
- **HANDOFF #2 credit fix** (`036b53a`) · **pt2a display** (`58921dd`) · **Stage 2.1 sweep** (`ee1765d`) · earlier 1.1d/pt1/1.1/1.1c/1.4/1.5/1.7.

## ⚠ DECISION NEEDED (Jake) — edit-mode / blocking-open-draw flow
Opening a draft via the wizard `?edit=<id>` shows **new-draw-#2 mode + a "approve or void Draw #1 before creating Draw #2" warning** — the wizard treats the draft-being-edited as a blocking prior draw (PRE-EXISTING guard, not from pt2b). This blocks: (a) Jake's **multi-draft walk** (can't create draft #2 while #1 open), (b) the **pending-pool DISPLAY** UI verification, (c) the **approve-cap race** (needs 2 open drafts). Options: relax the guard when editing the *same* draft / require submitting draft #1 first / fix edit-mode to load the draft for editing. **The money logic is verified** (persist, ledger, cap-clamp, applied-adjustment integration all cent-exact); only these UI walks are blocked.

## NEXT (in order) — this is the fresh-session entry point
1. **STAGE 2 SWEEP (order 3)** — the next clean unit; a multi-item sweep deserving a focused pass:
   - **2.2 attribution** (#17) — real acting user on status changes / audit rows; names resolved (no "system", no bare UUIDs).
   - **2.3 determinism** (#20) — card count = persisted rows = badge count; no divergent counters.
   - **2.4 new-job honesty** (#18) — preview ≡ save; Contract-Type vs Billing-Method labeled distinctly; retainage captured at creation for AIA; generic placeholders (no Drummond/RB bleed).
   - **2.5 parse errors + manual-entry** (#16) — friendly copy, raw JSON never surfaced; minimal manual-entry fallback when parse fails.
   - **2.6 gate `/people/vendors`** — gate behind existing flag machinery → 404 per strip posture. Vendor data/API STAY; the management page stays shadowed. **Do NOT build a vendors page.**
2. **Deferred (needs Jake):** resolve the edit-mode/blocking-guard flow (above) → then finish pt2b-tail UI walks (pending-pool DISPLAY + Apply-button, approve-cap race, multi-draft void-returns-pool). Fixtures in place: draft `da4ca554` ($5k deposit) + approved adjustment `67d0df76` (−$500) on Sample Client A.

## Flags / open
- **Edit-mode/blocking-guard** flow decision (see ⚠ block) — blocks pt2b UI walks only; money logic verified.
- **DrawPrintView signatory hardcode** — "Jake Ross" / "Director of Construction" still fixed; no org `pay_app_signatory` config field exists. Org NAME is wired. Needs an org-config field (architectural add — surface, don't invent).
- `/people/vendors` static fixtures (→ 2.6).

## Ops
`tsc --noEmit` for green while `next dev` runs (NOT `next build`). Code commits need a fresh `.planning/qa-runs/*-qa-report.md`. Ceiling $150 / surface $120; halt-on-money-surprise; Rule 12 on live financial writes (draw writes on test data authorized per nwrp for verification walks). End every session by updating this file + committing doc-only.
