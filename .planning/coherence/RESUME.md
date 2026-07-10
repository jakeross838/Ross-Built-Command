# RESUME — invoices+draws big fix (fresh-session cold-start)

**Source of truth:** `.planning/coherence/invoices-draws-deep-dive/` (HANDOFF.md TOP-20 + PRINCIPLES.md). **All RB data is disposable test data** — Jake wipes + starts fresh AFTER functionality is proven, so **fix machinery, not data**.

**Shipped on main:** 1.4 approve-flushes-allocations + 1.7 over-budget-wolf (`2c2018c`) · 1.1 AI-parse cost-code **org-scope** + RB junk cleanup (`964402d`) · 1.5 lien-gate-honors-setting + 1.1c normalized-code unique constraint (migrations 00117/00118). Key discovery: the "duplicate 05101" was a **cross-org leak** (8j Test Co's codes feeding RB's AI), not RB contamination.

**Fresh-session scope, IN ORDER:**
1. **1.1d** — divorce `TEMPLATE_ORG_ID` from RB's live org (`cost-codes/template/route.ts:12` = RB's id) → new orgs clone a **frozen template source**, never a live customer; + seed guard (never seed into a populated org). Mildly architectural — design the frozen-template carefully, don't rush.
2. **BLOCK B (draw-financial, ONE careful block):** 1.2 credits (`draw_adjustments` fully disconnected — wire calc+API+UI) + 1.3 G703 union (empty because rows are budget-line-driven; union in unbudgeted this-period lines; surface the SCHEDULED-column treatment) + 1.6 deposit (`draw-calc.ts:313` ignores `deposit_amount`). **INVARIANT, cent-exact, both renderers:** G702 total ≡ Σ(G703 lines) + Σ(adjustments/credits) − applied deposit. **Halt on unanticipated money-output changes.**
3. **STAGE 2 — 2.1 cross-org sweep PROMOTED to first item:** sweep EVERY query feeding AI context + pickers + queues + dropdowns; org-scope them; verify as platform_admin = **zero foreign-org rows anywhere** (incl. the still-unscoped picker at `invoices/[id]/page.tsx:361`). Then rest of Stage 2.

**Ops:** use `tsc --noEmit` for green while `next dev` runs (NOT `next build` — it clobbers the dev `.next`). Code commits need a fresh `.planning/qa-runs/*-qa-report.md` (build-green + Chrome-verify process). Push each stage to main (ship-to-prod).
