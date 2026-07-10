# STATUS — invoices+draws big fix (durable session handoff)

**Updated:** 2026-07-10 · **HEAD (origin/main):** `c706bb1` · branch `flat-ia-rework` → pushes to `origin/main` (ship-to-prod). Tree clean.

Chat transfer is unreliable — this file is the durable handoff. Read alongside `RESUME.md` (full scope + rulings) and `invoices-draws-deep-dive/HANDOFF.md` (TOP-20).

## Shipped (recent → older)
- **BLOCK B pt2b core — wizard deposit control** (`c706bb1`) — deposit-apply $ input + running ledger (pool · applied-to-date · remaining) + G702 line 7a "Less Deposit Credit Applied" + save-time clamp to remaining. Verified live (Sample Client A, $150k pool): apply $5,000 → line 7a −$5,000, due $17,610.40 → $12,610.40; enter $200k → "Exceeds remaining" warning + clamp to −$150k + save disabled.
- **HANDOFF #2 credit fix** (`036b53a`) — linked negative invoice (credit memo) never zeroes; uncaptured flows to total + Adjustments & Credits; linkage-invariant test (7/7). Verified draw #1 due −$640.
- **BLOCK B pt2a display** (`58921dd`) · **Stage 2.1 cross-org sweep** (`ee1765d`) · earlier 1.1d/pt1/1.1/1.1c/1.4/1.5/1.7.

## NEXT (in order)
1. **BLOCK B pt2b TAIL** (finishes Block B). Deposit save-cap done; remaining:
   - **Approve-time cap** — re-validate `deposit_applied_cents ≤ remaining` at approve (draft edited elsewhere between save + approve can't oversubscribe). Approve path = `draw_approve_rpc` (migration 00117) or the action route — a JS check in the action route before the RPC is the light option.
   - **Approved-adjustments pending pool** — wizard shows "N approved credits not yet applied — apply?" (visible ≠ counted; only `applied_to_draw` counts). 0 `draw_adjustments` rows today → renders empty; needs a query + display + an apply affordance.
   - **Multi-draft click-path verify** — apply partial deposit → CREATE draft #1 → split remainder onto a 2nd draft → cap blocks over-application → **void returns pool** (applied-to-date drops, remaining restores). Rule-12 writes; extensive walk. The single-draft core is verified.
2. **PRINT FIDELITY** — `DrawPrintView` hardcodes "5. RETAINAGE (0% per Ross Built standard) $0.00" while jobs withhold 10% (math reflects it) → the PDF contradicts itself. Fix: render the job's actual retainage % + amount; sweep DrawPrintView for ANY other hardcoded values that should be live (deposit, fee labels, org identity). Verify: print a 10%-retainage draw (e.g. Sample Client B draw #1) → numbers match screen.
3. **2.2 attribution** (#17) · **2.3 determinism** (#20) · **2.4 new-job honesty** (#18) · **2.5 parse errors + manual-entry** (#16) · **2.6** gate `/people/vendors` (static fixtures) → 404 per strip posture (no vendors build).

## Flags / open
- **`/people/vendors`** renders static Caldwell fixtures (→ 2.6).
- DrawPrintView retainage hardcode (→ item 2).

## Ops
`tsc --noEmit` for green while `next dev` runs (NOT `next build`). Code commits need a fresh `.planning/qa-runs/*-qa-report.md`. Ceiling $150 / surface $120; halt-on-money-surprise; Rule 12 on live financial writes. End every session by updating this file + committing doc-only.
