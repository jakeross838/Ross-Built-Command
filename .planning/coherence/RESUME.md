# RESUME — invoices+draws big fix (fresh-session cold-start)

**Source of truth:** `.planning/coherence/invoices-draws-deep-dive/` (HANDOFF.md TOP-20 + PRINCIPLES.md). **All RB data is disposable test data** — Jake wipes + starts fresh AFTER functionality is proven, so **fix machinery, not data**.

**Shipped on main:** 1.4 approve-flushes-allocations + 1.7 over-budget-wolf (`2c2018c`) · 1.1 AI-parse cost-code **org-scope** + RB junk cleanup (`964402d`) · 1.5 lien-gate-honors-setting + 1.1c normalized-code unique constraint (00117/00118) · **1.1d template-source divorce** — frozen static seed + guard + killed TEMPLATE_ORG_ID (app + DB carve-out, migration 00119) (`696b992`) · **BLOCK B pt1 — draw money engine** — deposit application (1.6) + adjustments (1.2) + G703 union (1.3) in draw-calc + all 7 rollup call sites + `_data.ts` + `/api/draws/[id]`, permanent invariant test, migration 00120 (`2e335fc`). Key discovery: the "duplicate 05101" was a **cross-org leak** (8j Test Co's codes feeding RB's AI), not RB contamination.

**BLOCK B ACCEPTED** (Jake, 2026-07-10): invariant standing, all money blockers closed at pt1. pt2 (display + wizard) is DEFERRED — see bottom.

**Fresh-session scope, IN ORDER:**
1. **STAGE 2 — cross-org sweep FIRST.** Details in `HANDOFF.md` (TOP-20 + redundancy inventory + per-screen findings).
   - **2.1 cross-org sweep:** sweep EVERY query feeding AI context + pickers + queues + dropdowns → explicit org scoping; verify **as platform_admin: zero foreign-org rows ANYWHERE** (platform_admin bypasses RLS — that's the leak vector). Known straggler: the still-unscoped cost-code picker at `invoices/[id]/page.tsx:361`. Pattern to copy: `parse-invoice.ts getCostCodeList(supabase, orgId)` (`964402d`).
   - **2.2 attribution** · **2.3 determinism** · **2.4 new-job honesty** · **2.5 parse errors + manual-entry fallback** (each maps to a HANDOFF TOP-20 finding).
   - Compact status block at the stage boundary; ship-to-prod per stage.

**DEFERRED — BLOCK B pt2 (display + wizard).** Engine + invariant already shipped (`2e335fc`); `current_payment_due` ties out cent-exact and is test-pinned (`__tests__/draw-block-b-invariant.test.ts`). Deferred by Jake (money blockers closed at pt1). When picked up:
   - **Display:** the "**Less Deposit Credit Applied**" deduction line BETWEEN AIA line 7 and line 8, and an "**Adjustments & Credits**" section, in the 5 prototype views (`DrawApprovalView`, `DrawPrintView`, `OwnerDrawView`, `CostPlusStatementView`, `CostPlusStatementPrintView`) — data already on `PayAppViewData.deposit` + `.adjustments`. Also statement-view adjustments + PDF export spot-check.
   - **Wizard** (`/draws/new` + `update-draft`): deposit-apply input (cents) + **approved-adjustments pending pool** ("N approved credits not yet applied — apply?" — visible≠counted) + cap ≤ remaining pool validated at SAVE **and** APPROVE.
   - **Rulings (Jake):** adjustment status = **`applied_to_draw` only** counts; `approved` = visible pending pool; `resolved` = terminal, never re-enters (test it). Deposit = **manual per-draw `deposit_applied_cents`**; pool = `deposit_amount`; applied-to-date = Σ across non-void draws (drafts reserve, void returns); G702 = line 1a informational + explicit deduction between 7 and 8 (never fold into 7); cap ≤ remaining at save+approve.
   - After wizard: **adversarial verification workflow** (deposit double-allocation across 2 drafts, void-returns-pool, cap-at-approve, resolved-terminal, cross-renderer cent-exact).

**Ops:** use `tsc --noEmit` for green while `next dev` runs (NOT `next build` — it clobbers the dev `.next`). Code commits need a fresh `.planning/qa-runs/*-qa-report.md` (build-green + Chrome-verify process). Push each stage to main (ship-to-prod).
