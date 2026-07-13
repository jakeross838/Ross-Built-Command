# STATUS — invoices+draws big fix (durable session handoff)

**Updated:** 2026-07-13 · **HEAD (origin/main):** `41a5d2f` · branch `flat-ia-rework` → pushes to `origin/main` (ship-to-prod). Tree clean.

Chat transfer is unreliable — this file is the durable handoff. Read alongside `RESUME.md` (full scope + rulings) and `invoices-draws-deep-dive/HANDOFF.md` (TOP-20).

## Shipped (recent → older)
- **BLOCK B pt2b TAIL** (`41a5d2f`) — approve-time deposit cap; approved-adjustments **pending pool** (apply endpoint `/api/draws/[id]/adjustments/apply` + preview surfaces pending & counts applied + wizard card); **ledger display fix** (Applied/Remaining include this draft); **edit-mode deposit pre-fill** (editing a draft can't zero its applied deposit). Verified live+DB (Sample Client A): draft #1 persisted $5k; ledger Applied $5,000/Remaining $145,000; applied −$500 adj → statement TOTAL DUE $19,154.56 cent-exact.
- **pt2b core** (`c706bb1`) — deposit input + ledger + line 7a + save cap.
- **HANDOFF #2 credit fix** (`036b53a`) · **pt2a display** (`58921dd`) · **Stage 2.1 sweep** (`ee1765d`) · earlier 1.1d/pt1/1.1/1.1c/1.4/1.5/1.7.

## ⚠ DECISION NEEDED (Jake) — edit-mode / blocking-open-draw flow
Opening a draft via the wizard `?edit=<id>` shows **new-draw-#2 mode + a "approve or void Draw #1 before creating Draw #2" warning** — the wizard treats the draft-being-edited as a blocking prior draw (PRE-EXISTING guard, not from pt2b). This blocks: (a) Jake's **multi-draft walk** (can't create draft #2 while #1 open), (b) the **pending-pool DISPLAY** UI verification, (c) the **approve-cap race** (needs 2 open drafts). Options: relax the guard when editing the *same* draft / require submitting draft #1 first / fix edit-mode to load the draft for editing. **The money logic is verified** (persist, ledger, cap-clamp, applied-adjustment integration all cent-exact); only these UI walks are blocked.

## NEXT (in order)
1. **Resolve the edit-mode/blocking-guard flow** (above) → then finish the pt2b-tail UI verification: pending-pool DISPLAY + Apply-button, approve-cap race, multi-draft (create #2 → cap → **void returns pool**). Fixtures in place: draft `da4ca554` ($5k deposit) + approved adjustment `67d0df76` (−$500) on Sample Client A (cost_plus_statement job).
2. **PRINT FIDELITY** — `DrawPrintView` hardcodes "5. RETAINAGE (0% per Ross Built standard) $0.00" while jobs withhold 10% → PDF contradicts its math. Render actual retainage % + amount; sweep DrawPrintView for other hardcoded values (deposit, fee labels, org identity). Verify: print a 10%-retainage draw (Sample Client B draw #1) → numbers match screen.
3. **2.2 attribution** (#17) · **2.3 determinism** (#20) · **2.4 new-job honesty** (#18) · **2.5 parse errors + manual-entry** (#16) · **2.6** gate `/people/vendors` (static fixtures) → 404 per strip posture.

## Flags / open
- Edit-mode/blocking-guard (above). · `/people/vendors` static fixtures (→ 2.6). · DrawPrintView retainage hardcode (→ item 2).

## Ops
`tsc --noEmit` for green while `next dev` runs (NOT `next build`). Code commits need a fresh `.planning/qa-runs/*-qa-report.md`. Ceiling $150 / surface $120; halt-on-money-surprise; Rule 12 on live financial writes (draw writes on test data authorized per nwrp for verification walks). End every session by updating this file + committing doc-only.
