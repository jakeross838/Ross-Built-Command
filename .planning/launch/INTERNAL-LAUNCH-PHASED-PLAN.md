# INTERNAL ROSS BUILT LAUNCH — PHASED PLAN

**Status:** REV 1 (per nwrp227 — Gaps 1+2 re-spec applied; Open Questions §1–§7 decisions applied; cost-code schema empirically corrected). Phase 1 (HIDE) AUTHORIZED to dispatch separately at $25 halt-gate ceiling. Slices 3A/3B/3C/3D awaiting Jake sign-off on this revision.
**Generated:** 2026-05-26 (rev 1 same-day)
**Drafting authorization:** nwrp226 (initial) + nwrp227 (revision)
**Source artifacts (durable, not conversation memory):**
- `.planning/launch/INTERNAL-LAUNCH-SCOPE-LOCKED.md` (commit `af661e6`) — authoritative locked scope
- `.planning/grounding-pass/GROUNDED-INVENTORY.md` — 6-section grounded inventory
- `.planning/grounding-pass/TASK-1-INVOICE-PARSE-FINDINGS.md` — empirical Claude Vision parse results on 39 real Ross Built fixtures
- `.planning/grounding-pass/TASK-2-CODE-VERIFY.md` — verified code + DB state (flagAnomaly wiring, 5 Caldwell swaps, pricing_history shape)

**Posture:** This is the spine. Each phase below becomes its own `/np` dispatch with separate `/gsd-discuss-phase` → `/gsd-plan-phase` → `/nightwork-plan-review` → `/nightwork-preflight` → `/nx` → `/nightwork-qa` → `/gsd-ship` cycle. Standing discipline (cost ceilings as halt-gate control points per nwrp227, halt gates, calibrated hooks, orchestrator pattern, Workflow Posture Rules 1–9) holds throughout. No phase dispatches until Jake signs off on THIS plan (excepting Phase 1 which is pre-authorized per nwrp227).

---

## REVISIONS LOG

### Rev 3 — 2026-05-26 same-day (nwrp229)

**Slices 3A / 3B / 3C / 3D SIGNED OFF** by Jake (Rev 2 + one addition).
- §A resolution confirmed (a)+(c).
- 3A ceiling $30 confirmed; hard-fail harness halt confirmed as "real gate, not ceremony."
- 3B backfill AC + manual-review queue mechanism confirmed; **one addition** per Jake:
  > "ONE addition: add a Phase 5 launch-readiness gate — the /admin/co-backfill-review queue must be EMPTY (or every remaining item explicitly Jake-acknowledged-as-deferred) before launch ships to Diane. A queue full of unresolved CO references that nobody clears IS the silent-mis-bill problem in a different hat. The queue is the right mechanism; 'items sit forever' can't be the resting state."
- 3C printed-block AC confirmed; **NO mm-precise bounding-box checks** added (Jake's call: over-engineering for a human-eyeballed deliverable).

**Phase 1 init Q1-Q3 confirmed** with recommended options (5 granular flags / HIDE Schedule+Selections / F1 org-wide hidden both ways). More▾ → CO + PO + Activity confirmed.

**Expander ACs confirmed** — fail-closed default + middleware-after-updateSession both kept.

**Phase 5 AC added** per Jake's addition: pre-Diane-dogfood gate requiring the backfill review queue be empty or each remaining item explicitly Jake-deferred.

Plan is **approved end-to-end**. Phase 1 init continues through cycle to Phase 1 sign-off gate; Phases 3A-3D dispatch in dependency order after Phase 1 + Phase 2 gates clear.

---

### Rev 2 — 2026-05-26 same-day (nwrp228)

**Open Question §A — RESOLVED.** Jake chose **(a) drop original per-job seeding + (c) add regression harness**. Harness is mandatory (not optional): re-run parser against Fish fixtures with the REAL 218-code production list; confirm literal-match rate jumps from 0/22 to high. If it does → seeding stays dead, theory proven. If it doesn't → learn why before dogfood, not during. (b) per-job preferred-subset deferred to post-launch unless dogfood asks.

**Slice 3A scope reduction applied.** Was ~2–3 days (seeding-heavy). Now ~half a day: math-mismatch split (~1–2h) + 14-NULL pricing_history cleanup (~1–2h) + regression harness (~2–3h).

**Slice 3A halt-gate ceiling reduced.** $50 → **$30** (per Jake's nwrp228 "your call to propose"). Scope dropped; ceiling follows.

**Slice 3B.2 backfill AC tightened per Jake's concern.** Original AC measured the unresolved-row count but didn't say what happens to those rows. Tightened: every `co_reference IS NOT NULL AND co_id IS NULL` row after backfill MUST be either (a) resolved to a real co_id, OR (b) marked with a `co_backfill_needs_review` flag visible in an admin/PM manual-review queue, OR (c) explicitly excluded with documented reason in the migration. **NO silent NULLs.** New task added: flag-and-surface-for-manual-review mechanism with a per-org queue.

**Gaps 1 & 2 fixes — APPROVED.** Jake confirmed both. Awaiting his inline confirmation on the tightened 3B backfill AC + 3C printed-block layout AC before fully signing 3B/3C.

**Phase 1 (HIDE) init proceeds** per Jake's nwrp228 explicit "(a) — use the three artifacts as verbatim stated scope." Requirements-expander spawning in background while Rev 2 surfaces.

---

### Rev 1 — 2026-05-26 (nwrp227)

**Gap 1 — CO virtual designation re-specced as first-class deliverable with real FK linkage to change_orders.**
- Schema verification (parallel reads of migrations 00001, 00013, 00015, 00066): `invoices.co_id UUID REFERENCES change_orders(id)` exists at invoice level. `invoice_line_items.co_reference` is **TEXT only** at line level — not an FK. Per Jake's directive, this is unacceptable: a bank cannot trace "PCCO #5" if it's a free-text string.
- Slice 3B re-spec: CO virtual designation is now 3B.2 as a first-class deliverable (was a sub-row under 3B.1). Includes migration to add `co_id UUID REFERENCES change_orders(id)` to invoice_line_items + best-effort backfill of existing `co_reference` text → FK + writer changes + provenance block renders the LINKED CO (PCCO# + description + total + budget_line allocations) rather than a bare string. Handwriting-routing safety net retained but explicitly reframed as 3B.3 BACKUP path (not main event).

**Gap 2 — Printed provenance block on G702/G703 PDF re-specced as separate line item with own effort + own AC.**
- Slice 3C re-spec: was bundled as "1 hour after [id]" afterthought. Now 3C.3 — separate ~4–6 hour deliverable with its own falsifiable AC about the PRINTED PAGE (location on G702/G703, content, format, verification against Drummond Pay App 8 reference).
- Printed render treated as **HIGHER-priority** than on-screen per nwrp227 (bank > team).

**Open Question §2 — empirically resolved with surprise finding.**
- Live DB verification: `cost_codes` is org-scoped (not per-job); RB has **218 codes** in one shared list; 2 RB jobs with budgets share **140 of 147 codes (95% overlap)**. `getCostCodeList()` in `src/lib/claude/parse-invoice.ts:21-30` reads cost_codes with NO job filter — production sees all 218 codes today.
- TASK-1's "0/22 literal cost-code match" was a **harness-prompt artifact** (test script fed Drummond 30-code subset; production behaviour different).
- Implication: "per-job cost-code seeding" deliverable as originally framed (Slice 3A) does NOT fit the actual schema — there's nothing to seed because the codes already exist for all jobs.
- Surfaced as new open question for Jake's call (see §New Open Question §A); Slice 3A revised pending decision.

**Open Question §1–§7 decisions applied** (per nwrp227):
- §1 3C/3D sequential — YES
- §2 cost-code seeding — answer changed by empirical finding above
- §3 admin-triggered re-apply — YES (deferred; not in launch scope per finding)
- §4 ceilings — AUTHORIZED as halt-gate control points (NOT believed budget); estimates historically ~2x; realistic emotional budget ~$600–700 / ~6 weeks
- §5 senior-PM-first phased rollout — YES
- §6 single seams spot-check — YES
- §7 docs at end of 3B — YES

**Phase 1 (HIDE) pre-authorized** per nwrp227. Dispatches independently of this revision sign-off. Halt-gate ceiling $25. Per-plan halt $50 per Rule 7d.

---

## Plan Overview

Five SEQUENCE phases per the locked scope, with **BUILD decomposed into four internal slices** following the established Wave > Slice pattern (precedent: F1-Wave-B Slice-1 / Slice-2). Each phase AND each BUILD slice has its own Jake sign-off gate — **9 sign-off gates total** between authorization-of-this-plan and launch-ready.

| # | Phase / Slice | Sequence step | Goal | Effort (rough) | Threat-model severity | Halt-gate ceiling (Jake-authorized per nwrp227 as control point, NOT believed budget) |
|---|---|---|---|---|---|---|
| 1 | **Phase 1 — HIDE** ✅ pre-authorized per nwrp227 | HIDE | App feels complete at reduced scope | ~2 hours | LOW | $25 (low expected-bump risk) |
| 2 | **Phase 2 — UI-FINALIZE** | UI-FINALIZE | Clean launch surfaces before BUILD lands on them | Under a week | LOW–MEDIUM | $50 (PDF preview spike risk) |
| 3 | **Phase 3 — BUILD** | BUILD | Real new work | ~2 weeks | varies per slice | $240 across 4 slices (with expected bumps on 3B/3C per nwrp227) |
| 3a | Slice 3A — Prerequisites *(scope-reduced per Rev 2 §A resolution: seeding dropped + regression harness added)* | BUILD | Math-mismatch split + flagAnomaly cleanup + cost-code regression harness | ~half a day | MEDIUM | **$30** (reduced from $50 per nwrp228) |
| 3b | Slice 3B — Invoice Provenance Ledger + CO Designation FK + CO Safety Net (HEADLINE) | BUILD | The headline deliverable + #1 financial-safety item; CO designation now first-class with real FK | ~2 weeks | **HIGH** | $75 (expected to need its one-bump per Rule 7c) |
| 3c | Slice 3C — Caldwell Swaps + Printed Provenance Block on G702/G703 PDF | BUILD | 5 routes swapped to real DB; **printed provenance block is now separate first-class line item (bank-facing)** | ~3–4 days (was ~2 days; printed block now ~4–6h on its own) | **HIGH** | $75 (expected to need its one-bump per Rule 7c) |
| 3d | Slice 3D — flagAnomaly Real Implementation | BUILD | Inline vendor-fairness flag on invoice review | ~1 day | MEDIUM | $40 |
| 4 | **Phase 4 — FIX** | fix | Address issues surfaced during BUILD | Driven by Phase 3 | MEDIUM | $50 (placeholder) |
| 5 | **Phase 5 — TEST + DOGFOOD** | TEST/dogfood | Vigorous gate; Diane 1–2 wk dogfood; staged PM rollout | 1–2 weeks calendar; ~3–5 days executor | MEDIUM–HIGH | $50 |

**Realistic total calendar: ~4–6 weeks** (the locked scope's ~4 weeks was tight per nwrp227's "estimates run ~2x historically"; dogfood time is the bulk).

**Halt-gate ceiling sum: ~$395** across 9 gates (Rev 2: 3A reduced $50→$30). **Realistic emotional total per nwrp227: $600–700** given history (Slice-2 was $130–193 estimated → $315–456 actual). 3B and 3C are the HIGH-severity pre-existing-artifact-touching slices most likely to need their one-bump-per-slice per Rule 7c. **Bumps are expected; the gates are the control, not the number.** Plan-author self-resolution of overrun is BANNED per Rule 7a; bumps are Jake-only.

**Dependency graph** (hard ordering — not negotiable):
- Phase 1 (HIDE) → Phase 2 (UI-FINALIZE): finalize on already-reduced surfaces. Phase 1 dispatches independently per nwrp227; does NOT roll into Phase 2 automatically.
- Phase 2 → Phase 3 (BUILD): build features on clean surfaces, not polish twice
- **Within BUILD:** 3A (prereqs) → 3B (provenance + CO designation FK + safety net) → 3C (swaps with printed provenance, which depends on the provenance ledger existing) → 3D (flagAnomaly) — **sequential per Open Question §1 decision**
- Phase 3 → Phase 4 (FIX): address what BUILD surfaces; may be no-op if nothing surfaces
- Phase 4 → Phase 5 (TEST/DOGFOOD): no dogfood on broken flows

---

## Phase 1 — HIDE

**Sequence step:** HIDE (first per locked scope rationale: cheapest + biggest perceptual change)

**Goal:** Get the app feeling complete at reduced scope before doing any other work. 8-section nav → 4 sections + Admin dropdown. ~50 placeholder routes disappear from discovery. Owner Portal returns 404 on direct URL access.

**Threat-model severity:** **LOW.** Env-var pattern proven (Wave-B used `NEXT_PUBLIC_AUTH_STATE_LISTENER` with explicit observation window — same template). No schema changes. No financial-logic changes. No data writes. No new endpoints. Failure mode = wrong section renders = no data loss; visible to user; reversible by flipping env var.

**Concrete work items** (effort estimates from GROUNDED-INVENTORY §6 HIDE block):

| Item | Effort | Files | Notes |
|---|---|---|---|
| Add 5 `NEXT_PUBLIC_FEATURE_*` env vars to Vercel Production + Preview | ~30 min | (Vercel dashboard or `vercel env add`) | `NEXT_PUBLIC_FEATURE_OWNER_PORTAL`, `NEXT_PUBLIC_FEATURE_PRICE_INTEL_F5`, `NEXT_PUBLIC_FEATURE_PIPELINE`, `NEXT_PUBLIC_FEATURE_COMPANY`, `NEXT_PUBLIC_FEATURE_REPORTS`, all default `false` |
| Conditional rendering in `PRIMARY_NAV` + `PerJobTabs` | ~30 min | `src/components/nav-bar.tsx` (PRIMARY_NAV array + PerJobTabs component) | Filter by env-var checks BEFORE the existing role filter |
| Middleware 404 block for direct-URL access | ~30 min | `src/middleware.ts` | Pattern per Section 4 of GROUNDED-INVENTORY: `if (pathname.startsWith("/pipeline") && process.env.NEXT_PUBLIC_FEATURE_PIPELINE !== "true") return new Response(null, { status: 404 });` per gate. Owner Portal hardened to BOTH `/owner/*` AND `/api/owner-portal/*`. |
| Section-overview Card grid filtering | ~30 min | `/financials`, `/admin`, `/price-intel`, `/people`, `/company`, `/reports` section landing pages | Filter Card grid to only show sub-routes with their feature flag on |

**Falsifiable acceptance criteria (each is verifiable on Vercel preview per Rule 1 — schema verification ≠ runtime verification):**

- ✅ Internal launch nav renders **Today | Jobs | Financials | Price Intel | (Admin ▾)** — 4 primary sections + Admin dropdown. No Pipeline / Company / Reports / People in the top nav.
- ✅ Direct URL to `/pipeline` (any path) returns **HTTP 404** when `NEXT_PUBLIC_FEATURE_PIPELINE !== "true"`. Same for `/company/*`, `/reports/*`, `/people/*` (excluding the working `/people/clients` if kept), and Owner Portal `/owner/*` + `/api/owner-portal/*`.
- ✅ Section-overview Card grid on `/financials` shows only Bills, Pay Apps (legacy URL `/draws/[id]`), POs (per-job), COs (per-job), Aging (placeholder OK if kept), Payments, Lien Releases. Hides org-wide POs, org-wide COs, Reconciliation.
- ✅ Section-overview Card grid on `/admin` shows only working routes (Users, Cost Codes, Billing, Owner Portal Tokens). Hides Approval Workflows, Integrations, Notification Rules, Org Chart, Permissions, Roles, Templates, Workflow Customization.
- ✅ Per-job nav (`PerJobTabs`) shows only the working tabs: Bills, Pay Apps (real backend at `/draws/[id]`), Budget (if Slice 3C completes the swap; otherwise hide), POs, COs, Internal Billings. Hides all 15 Wave-2/F2/F3/F4/F5 placeholder tabs.
- ✅ Flipping any `NEXT_PUBLIC_FEATURE_*` env var back to `true` in a hotfix scenario re-exposes the routes without code changes. (Reversibility verification: spot-check one feature flag.)
- ✅ Existing working routes (Today, Jobs, /invoices, /invoices/[id], /invoices/queue, /invoices/qa, /invoices/payments, /invoices/liens, /draws/*, /cost-intelligence/*, /price-intel root, Admin live routes) all render without regression.

**Jake sign-off gate:** Phase 1 ships to production. Jake visually confirms internal launch nav matches the 4-section + Admin dropdown spec. `/nightwork-qa` PASS. Custodian sweep marks Phase 1 done. **Jake authorizes Phase 2 dispatch.**

**Proposed ceiling for Jake authorization:** **$25** (low complexity, single small plan; well under typical slice ceiling).

---

## Phase 2 — UI-FINALIZE

**Sequence step:** UI-FINALIZE (locked-scope ordering rationale: clean launch surfaces before BUILD lands on them, so we don't polish twice).

**Goal:** Bar = consistent, clean, professional, works on Ross Built devices. NOT gold-plating, NOT every-pixel-perfect. Specifically targeting the launch surfaces only (invoice list, invoice review, PM queue, QA queue, payments, liens, /today landing).

**Threat-model severity:** **LOW–MEDIUM.** Mostly cosmetic (RGBA tokens, breakpoint fix, touch targets) = LOW. PDF preview mobile polish is a **spike risk** (could be CSS-only or could need PDF.js surgery per Wave 1.1 expansion doc §8 R3) = MEDIUM. No financial-logic risk. Design-system post-edit hook enforces token discipline mechanically per CLAUDE.md UI Rules.

**Concrete work items** (effort estimates from GROUNDED-INVENTORY §3 and §6 UI-FINALIZE block):

| Item | Effort | Files | TD reference |
|---|---|---|---|
| RGBA cleanup bundle | ~1 hour | `src/app/invoices/[id]/page.tsx` (loading spinner), `src/app/invoices/queue/page.tsx` (selected-row tint), `src/components/clients/client-combobox.tsx`, 7 design-system pages | TD-B2b-RGBA-CLEANUP + TD-B1abis-03 + TD-1.5a-followup-1. Consolidate to `--nw-tint-stone-08` token OR `color-mix()`. |
| Nav-bar `min-[360px]:` breakpoint fix | ~15 min | `src/components/nav-bar.tsx` (wordmark size class) | TD-WE-01. Replace arbitrary breakpoint with named `sm:` (640px) OR investigate Tailwind v3 regression. |
| PDF preview mobile polish (pinch-zoom + pan + responsive sizing) | **SPIKE FIRST** then half-day to 1 day | `src/components/invoices/file-preview.tsx` (or equivalent react-pdf consumer) | Wave 1.1 expansion §8 R3. **Spike first per locked scope §UI-FINALIZE** — confirm CSS-only path before committing scope. If PDF.js surgery needed, surface to Jake before continuing. |
| PM-queue touch-target audit | ~30 min | Chrome DevTools iPhone emulation; no code unless violations found | Verify `NwButton` size="md" renders ≥44px on real conditions per SYSTEM.md touch standards. |
| "Your Day" replacement with real launch-surface aggregate | Half-day to 1 day | `src/app/today/page.tsx` (top section currently renders "Coming F3" placeholder card) | Per locked scope: Open Invoices Today + Pay Apps Due This Week. Existing aggregator infrastructure (`getActionItems`, activity feed) is the precedent for the data shape. |

**Falsifiable acceptance criteria:**

- ✅ `git grep "rgba(91,134,153"` across `src/` returns ZERO hits outside `tailwind.config.ts` / `globals.css` / `colors_and_type.css` (the canonical color-definition files).
- ✅ `.claude/hooks/nightwork-post-edit.sh` fires ZERO new violations on `src/components/nav-bar.tsx`, `src/app/invoices/[id]/page.tsx`, `src/app/invoices/queue/page.tsx`, `src/components/clients/client-combobox.tsx`, `src/app/today/page.tsx`. (Hook runs as part of every commit during this phase.)
- ✅ TD-WE-01 entry in `.planning/MASTER-PLAN.md` §11 tech-debt registry marked CLOSED with a one-line resolution.
- ✅ Nav-bar wordmark renders correctly on Chrome DevTools iPhone SE viewport (375×667) and iPhone 14 Pro viewport (393×852). Manual verification via screenshot.
- ✅ PDF preview spike outcome documented in a short `SPIKE-RESULT.md` under the phase's `.planning/phases/internal-launch-ui-finalize/` dir BEFORE committing PDF preview code. If spike finds PDF.js surgery needed, **HALT for Jake** before proceeding (per Rule 7e — scope-engineering ban; do not split to fit budget).
- ✅ PDF preview on iPhone SE viewport: pinch-zoom works; pan works after zoom; preview occupies appropriate viewport area without horizontal-scroll on the page body.
- ✅ PM Queue (`/invoices/queue`) on iPhone SE viewport: all card-action buttons have ≥44px hit area (verified via DevTools layout inspector or computed style spot-check).
- ✅ `/today` top section renders Open Invoices Today + Pay Apps Due This Week aggregates from real data. Placeholder "Coming F3" card is removed.
- ✅ Vercel preview verified per Rule 1 (schema verification ≠ runtime verification) — `/nightwork-qa` runs `nightwork-design-check` + nightwork-ui-reviewer against the Vercel preview URL and verifies design-system compliance.

**Jake sign-off gate:** Vercel preview walked by Jake on real device (iPhone) and desktop. `/nightwork-qa` PASS. Custodian sweep marks Phase 2 done. **Jake authorizes Phase 3A dispatch.**

**Proposed ceiling for Jake authorization:** **$50** (multiple small plans bundled OR single plan with several deliverables; PDF preview spike contained within).

---

## Phase 3 — BUILD

**Sequence step:** BUILD (third per locked scope). 4 internal slices, each with its own /np dispatch + plan-review + execute + QA + Jake sign-off gate. Slices are dependency-ordered per the graph in §Plan Overview.

The four slices are spec'd separately below. Each slice is **a distinct sign-off-gated unit** per Jake's nwrp226 directive.

---

### Slice 3A — Prerequisites *(SCOPE-REDUCED per Rev 2 — §A resolved (a)+(c) per nwrp228)*

**Goal:** Three small foundational items in ~half a day total: math-mismatch flag split (closes TASK-1 §5 false-positive trust gap), pricing_history NULL cleanup (precursor for 3D flagAnomaly per TASK-2 Check 4), and cost-code parser regression harness (validates the artifact theory quantitatively per Jake's nwrp228 — "Don't just believe the schema read; verify it").

**Empirical scope correction (per Rev 1 schema verification + Rev 2 §A resolution):**

The original Slice 3A treated "per-job cost-code seeding" as the bulk of the work, drawing from TASK-1's 0/22 literal-match finding. Live DB verification surfaced a different picture:

- `cost_codes` table is **org-scoped, not per-job** (per schema check via `information_schema.columns`; only an `org_id` column, no `job_id`).
- RB org currently has **218 cost codes** spanning categories 01–39 (Drummond-style 01101 Architectural through 39101 Dump Trailer Usage).
- Both Drummond-style codes (01101, 03110, 03111) AND Fish-style codes (10102, 25102, 27101, 28701) are present in the same shared list.
- 2 RB jobs with budgets share **140 of 147 codes used (95% overlap)** — only 7 codes used in one job alone.
- Production's `getCostCodeList()` in `src/lib/claude/parse-invoice.ts:21-30` reads cost_codes with NO job filter — the parser sees ALL 218 codes today via RLS-scoped query.
- TASK-1's "0/22 literal match" was a **harness-prompt artifact**: the test script hardcoded Drummond's 30-code subset (per TASK-1 §1 sampling strategy line "the harness used the Drummond reference job's 30-code list"). Production behavior is different.

**Per Rev 2 §A resolution (nwrp228):** Jake chose **(a) drop the original seeding deliverable + (c) add the regression harness**. (b) per-job preferred-subset deferred to post-launch unless dogfood asks. The harness is MANDATORY — quantitatively verifying the artifact theory before dogfood, not after.

**Concrete work items (Rev 2):**

| Item | Effort | Files | Notes |
|---|---|---|---|
| **Math-mismatch flag split** — split `math_mismatch` into `line_items_sum_mismatch` (informational) and `subtotal_tax_total_mismatch` (real warning) | ~1–2 hours | `src/lib/claude/parse-invoice.ts` (parser output schema + flag computation), `src/app/invoices/[id]/page.tsx` (flag-rendering panel — change pill copy + severity), `src/lib/types/invoice.ts` (parsed-invoice type) | Locked scope §"Other Build Items §4". Each signal renders separately on the invoice review screen. `line_items_sum_mismatch` is info-only (gray pill); `subtotal_tax_total_mismatch` is a warning pill (orange/yellow) but still non-blocking. |
| **flagAnomaly precursor cleanup** — back-map the 14 NULL `cost_code_id` rows in `pricing_history` | ~1–2 hours | Service-role SQL pass; `supabase/migrations/00109_pricing_history_cost_code_backfill.sql` (number subject to slot availability) to make cleanup auditable + reproducible | TASK-2 Check 4: 14 of 126 RB rows have NULL cost_code_id; these won't contribute to per-cost-code aggregation in 3D's flagAnomaly. Map via vendor + description text inference; explicitly exclude untraceable rows with documented reason. |
| **Cost-code parser regression harness** — quantitative validation of the artifact theory per nwrp228 | ~2–3 hours | New harness script under `node_modules/.tmp/cost-code-verify.mjs` (gitignored, same pattern as TASK-1 harness); results captured in `.planning/launch/COST-CODE-VERIFY.md` | Runs `parseInvoiceWithVision` on the same 33 Fish fixtures TASK-1 used, BUT with the FULL 218-code production list (not Drummond's 30-code subset). Captures literal-match rate + per-invoice breakdown. **If literal-match rate jumps from 0/22 to high** → artifact theory confirmed; seeding stays dead. **If rate doesn't jump** → discovered before dogfood; halt and surface to Jake for root-cause investigation. |

**Falsifiable acceptance criteria (Rev 2):**

- ✅ `math_mismatch` is renamed/replaced. `line_items_sum_mismatch` fires on the 3 TASK-1 false-positive invoices (`02 Spectrum`, `13 Island Lumber Screws`, `19 Climatic`) — verified by re-running parse on those fixtures. `subtotal_tax_total_mismatch` does NOT fire on those 3.
- ✅ After cleanup, `SELECT count(*) FROM pricing_history WHERE org_id = '<RB-org-id>' AND cost_code_id IS NULL` returns **0** (or only rows explicitly documented as untraceable in the migration).
- ✅ **Cost-code regression harness — quantitative AC:** harness runs against all 33 Fish fixtures with full 218-code prod list; literal-match rate captured. **Pass threshold: literal-match rate ≥ 50%** (materially higher than TASK-1's 0/22 = 0%). Per-invoice breakdown captured (which Fish invoices still mismatch, why) so failures are actionable. Results written to `.planning/launch/COST-CODE-VERIFY.md`.
- ✅ **Harness fail-path defined:** if literal-match rate < 50%, Slice 3A HALTS — does NOT proceed to /nightwork-qa PASS. Findings surfaced to Jake with options: investigate prompt/list interaction, add per-job preferred-subset (option b after all), revert to seeding deliverable, or other. NO silent "harness ran but result looked iffy" path.
- ✅ `/nightwork-qa` PASS including nightwork-data-portability (new tables/columns have import/export contracts) and nightwork-ai-logic-tester (math-mismatch split routes flags correctly; cleanup didn't break pricing_history queries; cost-code regression result is sound).
- ✅ Rule 1 verification: math-mismatch split walked on Vercel preview (upload an invoice with line-items-sum-mismatch, verify pill renders as info-only and doesn't block approval). Harness results documented before sign-off.

**Jake sign-off gate:** /nightwork-qa PASS. Harness results reviewed by Jake — confirms artifact theory empirically OR triggers fail-path investigation. **Jake authorizes Slice 3B dispatch.**

**Halt-gate ceiling (Jake-authorized per nwrp228):** **$30** (reduced from $50 — scope dropped significantly; ~half-day's work). Per-plan halt $50 per Rule 7d.

---

### Slice 3B — Invoice Provenance Ledger + CO Designation FK + CO Safety Net (HEADLINE)

**Goal:** Ship the launch's three headline financial-integrity deliverables as a coherent unit:
1. The per-invoice append-only living record (provenance ledger) that captures every state change, every code change, every approval / rejection / kickback / acknowledgment, with full chain of custody.
2. **CO virtual designation as the PRIMARY workflow** (replaces Diane's paper PCCO marks) — with a **real FK linkage from invoice_line_items to change_orders**, NOT a free-text string. Bank-traceable, auditable.
3. The handwriting-detection safety net as **BACKUP** path (not main event) for the transition window where paper PCCO marks still flow in.

**This is the headline slice. It is NOT a sub-bullet — it is the deliverable that makes Nightwork demonstrably better than the current paper-and-spreadsheet workflow and makes the launch bank/client-defensible.** Per nwrp227 Gap 1: CO virtual designation is FIRST-CLASS, not a sub-row.

**Threat-model severity:** **HIGH.**
- Touches financial data (cost-code reassignment events, CO designation, allocation changes).
- Append-only contract is load-bearing — if events overwrite, the provenance ledger lies, and a bank/client audit fails.
- **CO designation goes from unverifiable string → bank-traceable FK reference.** Bank can navigate from "PCCO #5" on a printed pay-app → real change_orders row with its description, amount, budget-line allocations.
- CO routing safety net prevents the #1 cost-plus accounting failure as backup (TASK-1 §1: 24% of fish invoices have handwritten PCCO that parser misses; billing a CO invoice against base budget is the failure the workflow is designed to prevent).
- Bank-facing output: printed provenance block travels on the G702/G703 PDF deliverable (spec'd in Slice 3C.3 — the higher-priority render).
- Rule 1 applies HARD: schema verification ≠ runtime verification. Vercel preview verification mandatory before /nightwork-qa.

**Schema verification (Rev 1):** Live migration reads confirm the gap.

- `invoices.co_id UUID REFERENCES change_orders(id)` — exists at INVOICE level (migration 00001:138). ✓
- `invoice_line_items.co_reference TEXT` — **free-text only** at LINE level (migration 00013:38). ✗ Gap 1.
- `invoice_line_items.is_change_order BOOLEAN` — line-level flag exists (migration 00013:37). ✓
- `change_orders.pcco_number INTEGER NOT NULL` — per-job sequential PCCO# (migration 00001:111). ✓ This is what banks see as "PCCO #5."
- `change_orders.source_invoice_id UUID REFERENCES invoices(id)` — CO→invoice back-link exists (migration 00015:32). ✓
- `change_order_budget_lines` (id, change_order_id FK, budget_line_id FK, amount) — CO ↔ budget_line allocation exists (migration 00015:45–54). ✓

**The fix per Gap 1:** add `co_id UUID REFERENCES change_orders(id)` to invoice_line_items + best-effort text→FK backfill + writer changes + provenance renders the linked CO record (not the bare number).

#### 3B.1 — Invoice Provenance Ledger (event schema + assembly + on-screen render)

**Architecture posture** (per locked scope §Headline Feature §Architecture):

- **Works over the CURRENT shipped 4-status approval flow** (owner / admin / PM / accounting). Does NOT require the approval-chain engine (F3 scope, deferred).
- **Built append-only with clean seams** so deferred event types (future approval-chain steps, reconciliation events, automated escalations) slot in later WITHOUT a rebuild.
- **Spine already exists:** `status_history` JSONB column on every workflow entity (per CLAUDE.md Architecture Rules + Q12 uniform versioning) + cross-entity `activity_log` table (35+ entity types after B-3 per GROUNDED-INVENTORY §1).
- Work = (1) ASSEMBLE + RENDER what's already captured; (2) ADD the coded-state snapshot read-assembly; (3) MAKE re-coding events append to the event stream (no overwrites on cost-code reassignment, CO designation changes, allocation changes).

**Concrete tasks:**

| Task | Files | Notes |
|---|---|---|
| **Event capture extensions** — wire re-coding paths to write to `activity_log` with old/new values | `src/app/api/invoices/[id]/lines/[lineId]/route.ts` (cost-code reassignment), `src/app/api/invoices/[id]/co-designation/route.ts` (NEW endpoint for CO marking — see 3B.2), `src/app/api/invoices/[id]/allocations/route.ts` (allocation changes), `src/lib/activity-log.ts` (extend `logActivity` helper to accept new action types: `invoice_recode`, `invoice_co_designation`, `invoice_allocation_change`) | Existing pattern (status changes write to both `status_history` JSONB + `activity_log` per Q12) is the precedent. Re-coding events follow the same dual-write pattern. |
| **Provenance assembler** — server-side function `getInvoiceProvenance(supabase, invoiceId, orgId)` returning `{ currentCodedState, chainOfCustody }` | `src/lib/invoice-provenance/index.ts` (NEW lib), `src/lib/invoice-provenance/queries.ts`, `src/lib/types/invoice-provenance.ts` | Returns current state (cost codes + descriptions, **CO/PCCO designation as linked record per 3B.2**, PO+balance, budget line + running totals, amount + allocations, this-invoice-portion vs running total, draw#, lien-release status) + chain-of-custody ordered list (status_history events + activity_log events, merged + sorted chronologically). Designed-for-seams: renderer maps known action types to human-readable text; unknown actions render generically so F3 approval-chain events + post-F5 reconciliation events render automatically when they start firing. |
| **API endpoint** — thin wrapper `GET /api/invoices/[id]/provenance` returning the assembler output | `src/app/api/invoices/[id]/provenance/route.ts` | Membership-gated per Rule 2 (every API route uses `getCurrentMembership()` before DB access). Read-only. |
| **On-screen render component** — `<InvoiceProvenanceLedger>` displayed in right-rail or collapsible section of `/invoices/[id]` | `src/components/invoices/InvoiceProvenanceLedger.tsx` (NEW), integration into `src/app/invoices/[id]/page.tsx` (the 2,234-line gold-standard surface) | Follows Document Review pattern (PATTERNS.md). Slate tokens (NwBadge, NwMoney, EmptyState). Default-collapsed on mobile (PM phone use case); default-expanded on desktop. Renders BOTH current state + chain of custody in one component. **NOTE:** the printed render in Slice 3C.3 is the higher-priority surface per nwrp227. On-screen reuses the same `getInvoiceProvenance` output, just laid out for the app instead of the page. |
| **Re-coding event UI surface** — when PM/QA changes a cost code or CO designation, they're prompted for a note (existing pattern for kick-back); note flows into the activity_log payload | Modify cost-code editor in `src/components/invoices/CostCodeEditor.tsx` (or equivalent), CO-designation toggle UI in the right-rail (see 3B.2) | Note becomes the `reason` field on the recode event. Existing kickback-note infrastructure is the precedent. |

#### 3B.2 — CO Virtual Designation (PRIMARY workflow + REAL FK linkage) — first-class deliverable per nwrp227 Gap 1

**This is the in-app control that REPLACES Diane's handwritten paper PCCO marks as the primary CO-designation workflow.** The handwriting safety net (3B.3) is the backup; this is the main event.

**Per nwrp227 critical requirement:** "the designation must LINK TO THE REAL change_orders RECORD via foreign key — NOT a free-text co_reference string." Empirically verified: today's `invoice_line_items.co_reference` is TEXT (migration 00013:38). This is the gap that gets fixed here.

**Concrete tasks:**

| Task | Files | Notes |
|---|---|---|
| **Schema migration: add `co_id UUID REFERENCES change_orders(id)` to invoice_line_items** | `supabase/migrations/00109_invoice_line_items_co_fk.sql` (number subject to slot availability) | New nullable FK column. Indexed: `CREATE INDEX idx_invoice_line_items_co ON invoice_line_items(co_id) WHERE co_id IS NOT NULL AND deleted_at IS NULL;`. RLS policies inherit from existing invoice_line_items policies (migration 00013:116–158). |
| **Best-effort backfill: existing `co_reference` text → `co_id` FK** | Same migration; SQL pass | For each row where `co_reference` matches a pattern like `PCCO #?(\d+)` AND a `change_orders` row exists with `pcco_number = <captured>` AND `job_id = (invoice's job_id)`, set `co_id`. Audit-log every resolved backfill via service-role insert into `activity_log` with action='invoice_line_co_backfill_resolved', payload={old_text, resolved_co_id, line_id}. **Unresolved rows do NOT silently land at `co_id IS NULL`** — see next task. |
| **Unresolved-backfill manual-review flag + queue** (per Rev 2 / nwrp228 tightening) | Same migration adds `co_backfill_needs_review BOOLEAN NOT NULL DEFAULT false` column on `invoice_line_items`; migration sets `= true` for any row where `co_reference IS NOT NULL` post-backfill but no FK resolved AND not explicitly excluded. UI surface: `/admin/co-backfill-review` queue (NEW route, admin-only) lists every flagged row with invoice context, the original text, suggested change_orders dropdown to manually resolve, OR "not a CO" button with note. | Per Jake's nwrp228: "those need a flagged-for-manual-review fallback, NOT a silent NULL." Admin resolves each flagged row using the in-app CO designation control (3B.2) OR marks confirmed-not-CO with note. Resolution clears the flag. Audit-log every resolution via activity_log action='invoice_line_co_backfill_resolved_manual'. |
| **Mark `co_reference` as deprecated for new writes (preserve for audit)** | COMMENT ON COLUMN; documentation in `src/lib/types/invoice.ts` | New writes write to `co_id` FK; legacy text values preserved on existing rows. Once Slice 3B ships, future migrations could DROP `co_reference` but that's deferred to a Wave 1.1-Full cleanup. |
| **In-app CO designation control — UI component** | `src/components/invoices/CoDesignationControl.tsx` (NEW), embedded in `/invoices/[id]` right-rail and per-line block | Per-invoice OR per-line: reviewer selects from a dropdown of `change_orders` for the invoice's `job_id` filtered by `status IN ('approved', 'executed')` ordered by `pcco_number`. Dropdown shows "PCCO #5 — {description} — ${amount_with_fee}". Selection writes `invoice_line_items.co_id = <selected>` + `is_change_order = true`. PM/Diane required to provide a note (becomes activity_log event payload). |
| **New API endpoint: `POST /api/invoices/[id]/co-designation`** | `src/app/api/invoices/[id]/co-designation/route.ts` (NEW) | Body: `{ line_id, co_id, note }` (line_id nullable for whole-invoice designation; if null, applies to all lines). Server-side: validates `co_id` exists, belongs to same `job_id` as invoice, has status approved/executed. Updates `invoice_line_items.co_id` + `is_change_order = true`. Writes `activity_log` event `invoice_co_designation` with payload `{line_id, old_co_id, new_co_id, old_is_change_order, new_is_change_order, who, when, note}`. Membership-gated per Rule 2. Returns updated row(s). |
| **PostgREST embed hint for provenance assembler** | `src/lib/invoice-provenance/queries.ts` | Embed change_orders into invoice_line_items query via the new FK. **Cite FK constraint name in plan per Rule 2.** ai-logic-tester runs representative query per Rule 3 to verify resolution. |

#### 3B.3 — Handwriting-Routing Safety Net (BACKUP path) — reframed per nwrp227 Gap 1

**Reframed from main event to backup.** The primary workflow is the in-app CO designation (3B.2). This safety net catches the transition cases where Diane already wrote PCCO# on paper and uploaded before re-coding digitally. Once the paper-PCCO workflow is fully replaced by the in-app control, this safety net firing rate drops — it's the bridge during transition.

| Task | Files | Notes |
|---|---|---|
| **Routing logic update** — when `handwritten_detected` fires AND parser's `confidence_details.cost_code_suggestion < 0.7` OR `confidence_details.is_change_order < 0.7`, **the invoice MUST NOT route to GREEN auto-approve tier.** Force `human_confirm_co` review tier instead. | `src/lib/invoice-routing.ts` (or wherever the confidence-routing decision happens — check `/api/invoices/upload/route.ts` and `parseInvoiceWithVision`'s caller); add a new routing tier `human_confirm_co` between YELLOW and RED | TASK-1 §1 documents 8 of 33 fish invoices (24%) had ground-truth `is_change_order: true` from handwritten PCCO that parser missed. The parser correctly fires `handwritten_detected` but doesn't propagate uncertainty into CO designation. Routing change kicks every such invoice to a human-confirm tier where the PM uses the 3B.2 in-app control to pick the right CO record. |
| **Override path for confirmed-not-CO** — PM/Diane can mark "confirmed-not-CO despite handwriting" with a note; subsequent identical-vendor-same-job invoices DO NOT re-flag (avoid alert fatigue) | UI on the human-confirm tier surface; per-org-per-vendor-per-job confirmation table OR a flag on a vendor-confidence model row | Locked scope §"Other Build Items §1" framing: "the in-app control gives PMs a clean digital path; the safety net catches cases where Diane already wrote PCCO# on paper and uploaded before re-coding digitally." |

**Falsifiable acceptance criteria (slice-wide):**

#### Provenance Ledger (3B.1)
- ✅ **Event append-only contract:** Editing the cost code on an invoice line item writes a new `activity_log` row with `action = 'invoice_recode'` and payload `{old_code_id, new_code_id, line_id, who, when, note}`. The original cost_code_id is NOT overwritten in any prior `activity_log` row (verified by running the action twice and confirming TWO rows exist with the full history).
- ✅ **Allocation change events captured:** Editing a multi-cost-code allocation writes an `invoice_allocation_change` event with the full old + new allocation snapshot.
- ✅ **Provenance assembler returns full chain:** `GET /api/invoices/<id>/provenance` returns a `chainOfCustody` array with one entry per state change OR re-coding event OR over-budget acknowledgment, ordered chronologically with `{who, when, action, payload, note}`.
- ✅ **Provenance assembler returns current state:** `GET /api/invoices/<id>/provenance` returns `currentCodedState` with cost codes (+ descriptions), CO/PCCO designation **AS LINKED RECORD with `{co_id, pcco_number, description, amount, total_with_fee, status, allocations[]}`** (NOT a bare string), PO linkage, budget line (with running total), amount + allocations, draw#, lien-release status. Verified by spot-checking against the invoice review page's rendered values for at least 3 test invoices spanning different states (e.g., one approved, one in-draw, one paid).
- ✅ **On-screen render:** `/invoices/[id]` renders the InvoiceProvenanceLedger component. Both current state + chain of custody visible. On iPhone SE viewport, ledger defaults collapsed; expands on tap. On desktop, defaults expanded.
- ✅ **Designed-for-seams verified** (per Open Question §6 — single spot-check decided): Manually insert a row into `activity_log` with `action = 'chain_step:approved'` (a future F3-style action). Page reload renders the event in the chain-of-custody with the generic-action format. No code changes required.

#### CO Virtual Designation + FK linkage (3B.2)
- ✅ **Schema:** `\d+ public.invoice_line_items` shows `co_id UUID REFERENCES change_orders(id)`. Index `idx_invoice_line_items_co` exists.
- ✅ **Backfill verified (Rev 2 tightened per nwrp228 — no silent NULLs):** Running the backfill against the live DB produces an `activity_log` audit row for each RESOLVED match (action='invoice_line_co_backfill_resolved'). For every row where `co_reference IS NOT NULL` post-backfill, exactly one of the following holds: (a) `co_id` is now set to a real `change_orders.id`, OR (b) `co_backfill_needs_review = true` and the row appears in the `/admin/co-backfill-review` queue, OR (c) the row is explicitly excluded with a documented reason in the migration's `WHERE` clause (e.g., voided invoices, soft-deleted parents). **Mandatory invariant:** `SELECT COUNT(*) FROM invoice_line_items WHERE co_reference IS NOT NULL AND co_id IS NULL AND co_backfill_needs_review = false AND deleted_at IS NULL` returns **0**. NO silent NULLs.
- ✅ **Manual-review queue surface:** `/admin/co-backfill-review` renders the list of flagged rows with invoice context (vendor, date, amount, the original `co_reference` text), a change_orders dropdown (filtered by invoice's job_id, approved/executed statuses) for manual resolution, and a "not a CO" button with required note. Verified by flipping at least 3 test rows through the queue: resolve one to a real CO, mark one as not-a-CO, leave one in queue. Spot-check that resolved rows clear the flag and write the `invoice_line_co_backfill_resolved_manual` audit event.
- ✅ **In-app control:** PM opens `/invoices/[id]`, selects a line, picks "PCCO #5 — {description} — ${total_with_fee}" from the CO dropdown, provides a note, confirms. `invoice_line_items.co_id` is set to the change_orders.id; `is_change_order = true`; `activity_log` has an `invoice_co_designation` event with `old_co_id`, `new_co_id`, `note`.
- ✅ **CO designation renders as LINKED record:** provenance ledger on `/invoices/[id]` shows "Change Order: PCCO #5 — {description} — ${total_with_fee}" with a click-through link to the change_order's detail surface (or, if no detail surface yet, an expandable accordion showing the linked CO's fields). NOT a bare "5" string.
- ✅ **API contract:** `POST /api/invoices/[id]/co-designation` with valid body returns 200 + updated row; invalid `co_id` (wrong job, wrong status) returns 422; missing membership returns 401/403; full membership/RLS test pass.
- ✅ **PostgREST FK citation:** plan-author cites the FK constraint name `invoice_line_items_co_id_fkey` (or whatever the migration creates it as) in the plan per Rule 2. ai-logic-tester executes a representative embed query and confirms resolution.

#### Handwriting Safety Net (3B.3 — backup path)
- ✅ **Handwriting safety net — test against TASK-1 fixtures:** Re-running parse + routing on the 8 missed-PCCO fish invoices from TASK-1 §1 (`11 Suncoast`, `15 Island Lumber`, `27 MJ Florida`, `33 Triple H Painting`, `36 Metro Electric WellPump`, `39 Island Lumber Lattice`, `41 Island Lumber Lumber`, `45 Sight To See 1195`) routes all 8 to `human_confirm_co` tier — NOT to GREEN auto-approve.
- ✅ **No false positives on the safety net:** Invoices where `handwritten_detected` fires but parser confidence is high (≥0.85) on BOTH cost-code suggestion AND is_change_order still route normally. Verified by running parse + routing on the 25 of 33 fish invoices that did NOT have missed CO designation per TASK-1 — none should route to `human_confirm_co` unnecessarily.
- ✅ **Override path:** PM marks an invoice as "confirmed-not-CO despite handwriting"; subsequent identical-vendor-same-job invoices DO NOT re-flag. Spot-verify with two sequential invoices from same vendor on same job.

#### Slice-wide
- ✅ **Rule 1 verification:** Full Drummond invoice walk on Vercel preview (upload → parse → route → approve → recode → assign-CO-via-FK → audit timeline shows all events with the linked CO record). No schema-only verification accepted.
- ✅ **Rule 2 verification (FK citation):** Plan-author cites FK constraints by name for all PostgREST embed hints (`invoice_line_items_co_id_fkey` etc.). ai-logic-tester executes representative queries against current schema per Rule 3.
- ✅ **Docs updated per Open Question §7 decision:** `docs/architecture.md` + `docs/security.md` + `docs/onboarding.md` updated to reflect the provenance ledger + CO FK linkage. `nightwork-enterprise-docs` skill fires at end of Slice 3B.
- ✅ `/nightwork-qa` PASS with full reviewer set including nightwork-ai-logic-tester, nightwork-compliance-reviewer, nightwork-enterprise-readiness-reviewer (audit-log completeness), security-reviewer (RLS + membership filter on new endpoints), nightwork-data-portability (new co_id FK + provenance event types have export contracts).

**Jake sign-off gate:** Full Drummond walk on Vercel preview; Jake confirms (a) provenance ledger renders the LINKED CO record (not a string), (b) in-app CO designation control works as primary path, (c) handwriting safety net routes the TASK-1 fixtures correctly as backup. /nightwork-qa PASS. nightwork-end-to-end-test PASS. enterprise-docs synced. **Jake authorizes Slice 3C dispatch.**

**Halt-gate ceiling (Jake-authorized per nwrp227):** **$75** (architecture-level slice; provenance assembler + render component + CO-FK migration + backfill + in-app control + safety net + multiple migration/API/UI files). Per Rule 7c, **expect to need the one-bump this slice** given HIGH severity + pre-existing-artifact-touching nature; Jake bumps if/when surfaced. Per-plan halt $50 per Rule 7d.

---

### Slice 3C — Caldwell Swaps + Printed Provenance Block on G702/G703 PDF

**Goal:** Swap 5 production routes from Caldwell synthetic fixtures to real DB data, AND ship the **printed provenance block on the G702/G703 PDF as a separate first-class deliverable** (per nwrp227 Gap 2: it's the bank-facing legal artifact, NOT a 1-hour afterthought).

**Per nwrp227 Gap 2:** the printed provenance render is **HIGHER-priority than the on-screen render**. On-screen serves the Ross Built team day-to-day; the printed block is what banks/owners actually receive as the chain-of-custody artifact attached to the G702/G703 deliverable. Spec rigor inverts: printed gets the deeper spec + AC; on-screen reuses the same data structured for the app.

**Threat-model severity:** **HIGH.**
- Printed pay-app G702/G703 PDF is the **legal deliverable** that goes to the bank/owner. Errors here are externally visible to a regulated audience.
- Printed provenance block IS the bank-facing chain-of-custody artifact — accurate, complete, must survive print, must travel with the deliverable.
- Pay-app print = G702/G703 form integrity matters (AIA standard format per CLAUDE.md; Drummond Pay App 8 is the reference).
- Real RB data flowing through swapped routes for the first time — risk of leaked synthetic data if swap is incomplete.
- Touches pre-existing code (the pay-app PDF generator) per nwrp227 framing — HIGH severity + expected bump risk.

**Concrete work items** (effort estimates from TASK-2 Check 3 + nwrp227 Gap 2 re-spec; route swap pattern from `src/app/financials/bills/[id]/page.tsx` Wave-E E-3 swap):

#### 3C.1 — Pay-app route swap (`/financials/pay-apps/[id]`)

| Field | Value |
|---|---|
| **Effort** | 3–4 hours per TASK-2 Check 3 |
| **Files** | `src/app/financials/pay-apps/[id]/page.tsx`; new adapter (CaldwellDraw shape ← DB draw row + embeds: draws + draw_line_items + cost_codes + change_orders + jobs); integration of `<InvoiceProvenanceLedger>` per invoice in the pay-app |
| **Why** | Pay App approval = critical owner-touchpoint surface. Foundation for 3C.2 + 3C.3. |
| **PostgREST embeds** | 5 (draws → draw_line_items, draws → jobs, draw_line_items → budget_lines → cost_codes, draws → change_orders join). Rule 2 FK citation required. |

#### 3C.2 — Pay-app print route swap (`/financials/pay-apps/[id]/print`)

| Field | Value |
|---|---|
| **Effort** | 1 hour AFTER 3C.1 (same data, different View) |
| **Files** | `src/app/financials/pay-apps/[id]/print/page.tsx`; reuses 3C.1 adapter |
| **Why** | Print surface — separate from the on-screen surface but uses the same data. This is the renders-real-data-on-print foundation; 3C.3 LAYERS the provenance block on top. |

#### 3C.3 — Printed Provenance Block on G702/G703 PDF — FIRST-CLASS DELIVERABLE per nwrp227 Gap 2

**This is the bank-facing legal artifact. The entire point of "bank-defensible."**

| Field | Value |
|---|---|
| **Effort** | **~4–6 hours** (separate from 3C.2 route swap). Real work: PDF generator extension, per-invoice provenance block layout, AIA G702/G703 compatibility, print-friendly typography, page-break handling. |
| **Files** | PDF generator: likely `src/lib/pay-app-pdf.ts` OR an equivalent under `src/lib/pdf/`; if React-PDF based, a new `<PrintedProvenanceBlock>` component; integration into `src/app/financials/pay-apps/[id]/print/page.tsx` |
| **Spec — location on the page** | **Per-invoice block** appended below each invoice's line in the supporting-doc section of the G702/G703 package (NOT a summary table; NOT a single appended page). Each invoice that is included in the pay-app gets its own provenance block immediately following its line entry. If the block would split across a page break, force a page break before the block so it stays whole. |
| **Spec — content** | (a) Header: "Provenance — Invoice #{invoice_number} — {vendor_name} — ${total_amount}". (b) Current coded state: cost codes (with descriptions), **CO/PCCO designation as linked record from 3B.2 (PCCO #5 + description + total_with_fee + budget_line allocations)**, PO linkage (if any), budget line + this-invoice-portion vs running total, lien release status. (c) Chain of custody: ordered table with columns `When | Who | Action | Note` — every status transition + every re-coding event + every over-budget acknowledgment from the activity_log + status_history. |
| **Spec — format** | Single-column layout. Readable typography (≥9pt body, ≥10pt headers; serif or sans-serif consistent with the rest of the G702/G703). Complete — no truncation ellipses. Tables use full width. Multi-line notes wrap with indent. Long history is allowed to span multiple pages with "(continued)" header on subsequent pages. |
| **Spec — designed-for-future** | Block renderer maps known activity_log action types (status changes, recodes, CO designations, allocations, acknowledgments) to human-readable rows. Unknown action types render as `{action_type} by {actor}` so future F3 chain events + post-F5 reconciliation events appear automatically. Aligns with 3B.1's designed-for-seams contract. |

#### 3C.4 — `/jobs/[id]/budget` swap

| Field | Value |
|---|---|
| **Effort** | 4–6 hours per TASK-2 Check 3 (6 PostgREST embeds) |
| **Files** | `src/app/jobs/[id]/budget/page.tsx`; new adapter (CaldwellBudget shape ← budget_lines + cost_codes + invoices + draws + draw_line_items + change_orders joined) |
| **Why** | Core PM surface; PMs see real budget data daily. |

#### 3C.5 — `/jobs/[id]/mobile-approval` swap

| Field | Value |
|---|---|
| **Effort** | 1–2 hours per TASK-2 Check 3 (borrows the `financials/bills/[id]` shim almost verbatim) |
| **Files** | `src/app/jobs/[id]/mobile-approval/page.tsx`; reuse the `financials/bills/[id]/page.tsx` adapter pattern |
| **Why** | PM mobile approval is core invoice flow. Lightest swap due to shim reuse. |

#### 3C.6 — `/jobs/[id]/documents/[documentId]` (lien-release path only) swap

| Field | Value |
|---|---|
| **Effort** | 2–3 hours per TASK-2 Check 3 (skip plan/contract paths) |
| **Files** | `src/app/jobs/[id]/documents/[documentId]/page.tsx`; new adapter for lien-release type only |
| **Why** | Lien release review is part of draw closure. Plans/contracts paths remain hidden behind Phase 1 feature flags. |

**Total effort (post-Rev 1): ~15–22 hours = ~2–3 days executor work** (was ~11–16 hours; printed provenance block adds ~4–6 hours as separate line item per nwrp227 Gap 2).

**Falsifiable acceptance criteria:**

#### Route swap basics (3C.1, 3C.2, 3C.4, 3C.5, 3C.6)
- ✅ All 5 swapped routes pass `git grep "CALDWELL_" -- "<file_path>"` = ZERO hits (no synthetic-fixture imports remain).
- ✅ All 5 swapped routes call `getCurrentMembership()` before DB access per Rule 2; queries `.eq("org_id", membership.org_id)` per RLS posture.
- ✅ Per Rule 2 (PostgREST FK citation requirement): every embed hint cites the FK constraint by name in the plan. ai-logic-tester executes representative queries per Rule 3.
- ✅ **Pay-app on-screen provenance (3C.1):** `/financials/pay-apps/[id]` renders the InvoiceProvenanceLedger for each invoice in the pay-app. Expandable per invoice; default-collapsed on mobile.
- ✅ **No regressions:** existing real-data path `/draws/[id]` (legacy URL) still works identically — the new IA at `/financials/pay-apps/[id]` is an alternate access path, not a replacement of the working backend.
- ✅ **Budget tab swap (3C.4):** `/jobs/[id]/budget` renders Drummond budget with real budget_lines, real running totals (computed-on-read per Architecture Rules; no stored aggregates except the trigger-maintained `jobs.approved_cos_total` cache); change-order impact reflected.
- ✅ **Mobile approval swap (3C.5):** `/jobs/[id]/mobile-approval` on iPhone SE viewport renders real invoices for that job's queue; approve action writes a real status transition (verified by checking activity_log post-approval).
- ✅ **Lien-release swap (3C.6):** `/jobs/[id]/documents/[documentId]` for a lien-release documentId renders the real lien release record with vendor, related invoices, signature status, file preview.

#### Printed Provenance Block (3C.3) — bank-facing AC, higher rigor per nwrp227
- ✅ **Block exists per invoice on the PDF:** generating a Drummond pay-app PDF that includes ≥3 invoices produces 3 distinct provenance blocks, one per invoice, in the order the invoices appear in the supporting-doc section.
- ✅ **Block location verified:** the block appears IMMEDIATELY BELOW the invoice's line entry in the supporting-doc section — NOT as a summary table at the end, NOT as a single appended page. Verified by opening the PDF and visually inspecting alongside Drummond Pay App 8 reference.
- ✅ **Block content — current coded state:** each block renders cost codes (with descriptions), CO/PCCO designation **AS LINKED RECORD with PCCO# + description + total_with_fee + budget_line allocations** (NOT a bare string per 3B.2 FK linkage), PO linkage if any, budget line + this-invoice-portion vs running total, lien release status.
- ✅ **Block content — chain of custody:** each block renders an ordered table of every status transition + re-coding + over-budget acknowledgment for that invoice, columns `When | Who | Action | Note`. Verified against the on-screen ledger for at least 3 invoices spanning different lifecycle states.
- ✅ **Print survival:** PDF rendered at standard 8.5×11" page size with print typography (≥9pt body, ≥10pt headers). No truncation, no overflow off page, no text cut off at page break. Spot-test by generating a PDF for a high-history invoice (≥10 events) and confirming all events render readable, even if spanning a page break with "(continued)" indicator.
- ✅ **Designed-for-future seam (per Open Question §6 — single spot-check):** manually insert an `activity_log` row with `action = 'chain_step:approved'` for an invoice; regenerate the PDF; verify the new event renders generically in the printed chain-of-custody.
- ✅ **Bank-facing visual inspection:** Jake or Diane visually inspects the generated Drummond pay-app PDF + provenance blocks alongside the Drummond Pay App 8 reference and signs off on "this is what we'd send a bank." Captured in `.planning/launch/PRINTED-PROVENANCE-SIGNOFF.md`.

#### Slice-wide
- ✅ **Drummond fixture verification:** `nightwork-end-to-end-test` walks a full Drummond scenario (create vendor → PO → invoice → approve → draw → G702/G703 → printed provenance block visible → lien release → paid) and verifies each step succeeds.
- ✅ **Plan-review iter-1 Rule 6 pre-flight passes:** hook regex sweep (zero violations on swapped files + the new PDF block component), fixture infrastructure collision check (no UUID/email/slug collisions; Drummond reads against existing migration 00073/00077 backfilled data per TASK-2 Check 4), deliverable-path reachability check (all 5 page.tsx paths + the new printed-provenance file git-tracked from fresh checkout), files_modified intersection check (no overlap with Slice 3D's flagAnomaly work per Open Question §1 — sequential decision).
- ✅ Rule 1 verification: all 5 swapped routes + the printed provenance block walked on Vercel preview with real data, not schema-only. PDF generated against real Drummond pay-app and opened/inspected.
- ✅ `/nightwork-qa` PASS with full reviewer set: security-reviewer (RLS on swapped queries + PDF generation route), nightwork-multi-tenant-architect (org_id filtering through PDF surface), nightwork-rls-auditor (membership-gating on print endpoint), nightwork-design-system-reviewer (swapped on-screen views still match Document Review pattern), nightwork-data-portability (printed provenance is an export-format contract for the bank-facing artifact), nightwork-ai-logic-tester (provenance assembler returns correct linked-CO data per representative query).

**Jake sign-off gate:** (a) Vercel preview walked by Jake across all 5 swapped routes on real Drummond data; (b) **Drummond pay-app PDF generated + visually inspected alongside Drummond Pay App 8 reference**; (c) Jake signs off in writing on the printed provenance block format. /nightwork-qa PASS. nightwork-end-to-end-test PASS. **Jake authorizes Slice 3D dispatch.**

**Halt-gate ceiling (Jake-authorized per nwrp227):** **$75** (5 swaps + first-class printed provenance block per Rev 1). Per Rule 7c, **expect to need the one-bump this slice** given HIGH severity + pre-existing-PDF-generator touching nature + nwrp227 expectation; Jake bumps if/when surfaced. Per-plan halt $50 per Rule 7d.

---

### Slice 3D — flagAnomaly Real Implementation

**Goal:** Replace the 4-line stub in `src/lib/cost-intelligence/queries.ts` with real outlier detection logic against `pricing_history`. Surface as per-line badge in the invoice review right-rail.

**Threat-model severity:** **MEDIUM.** Informational signal — does not block approval, does not change financial calculations, does not modify approval gates. But PMs trust it for approval decisions, so false-positive rate matters; the confidence indicator is the protection against false precision on thin data.

**Concrete work items** (effort estimate from TASK-2 Check 2: ~6–8 hours / single day for first cut; ~2–3 days for polished version):

| Task | Effort | Files | Notes |
|---|---|---|---|
| **Replace stub with real query** | 1 hour | `src/lib/cost-intelligence/queries.ts:340-356` (replace `flagAnomaly`) | Query `pricing_history` filtered by `org_id` + `vendor_id` + `cost_code_id` + `date >= NOW() - INTERVAL '2 years'`. Return rows for in-memory analysis. |
| **Resolve `canonical_code_id` ↔ `cost_code_id` signature gap** | 1 hour | Update function signature; resolve at the function (recommended) OR at the caller | TASK-2 Check 2 surfaced this — current signature uses `canonical_code_id` (global spine); practical callers know `cost_code_id` (org-local). Resolve org-local → canonical inside the function via `org_cost_codes.canonical_code_id`, OR accept org-local directly. Recommend accepting `cost_code_id` (org-local) — simpler caller contract. |
| **IQR-based outlier detection** | 1 hour | New helper functions in `src/lib/cost-intelligence/anomaly-detection.ts` | More robust than mean-based for small samples per locked scope §"Other Build Items §3" + TASK-2 Check 2 recommendation. Compute median + Q1/Q3; flag values outside `Q1 − 1.5*IQR` or `Q3 + 1.5*IQR`. |
| **Confidence by sample size** | (rolled into above) | Same | ≥10 observations = HIGH; 3-9 = MEDIUM; <3 = LOW (return `insufficient_history`). Returned as `confidence: "low" | "medium" | "high"` field on AnomalyFlag. |
| **Recency weighting** | 1 hour | Same | Decay weight per observation by `(today - obs_date)` days. 2026 data heavier than 2020 anchor points per TASK-2 Check 4 finding that 79% of observations are in 2026. |
| **Wire into invoice review screen as per-line badge** | 2 hours | `src/app/invoices/[id]/page.tsx` (per-line render block); new component `src/components/invoices/AnomalyBadge.tsx` if not extending an existing badge | Render alongside the existing confidence-score badge; clicking the badge expands to show `comparing against N observations from {first_date} to {last_date}, median ${median} cents, your invoice ${unit_price_cents} cents = {pct_deviation}% off`. |
| **Honest confidence labeling** | 30 min | Component | Per locked scope: "the confidence indicator makes thin-data honest — PMs see 'comparing against 3 observations in last 6 months, low confidence' rather than a false-precision percentage." |
| **Cache + perf** | 1–2 hours | Either a precomputed view (`vendor_cost_code_anomaly_stats`) OR batch query (one SELECT with `IN (vendor+code tuples)`) OR 24h in-memory cache | TASK-2 Check 2 notes naive call per line item = N database queries per page load. Pick one approach; document. |
| **Tests** | 1 hour | New unit tests in `__tests__/anomaly-detection.test.ts` | Median calc, severity classification, edge cases (zero/one/all-same-price observations). |

**Total: ~6–8 hours per TASK-2 Check 2 single-day estimate.**

**Falsifiable acceptance criteria:**

- ✅ **Top-2 healthy combos return non-trivial anomaly results:** for the ISLAND LUMBER × Framing Material combo (28 observations, range $2.50–$113.49, avg $18.54 per TASK-2 Check 4), an artificially-injected outlier price (e.g., $300 unit_price) returns `is_anomaly: true, severity: "warning" | "critical", confidence: "high", n_observations: 28`.
- ✅ For the CLEAN CANS × Sanitation combo (10 observations over 7 months), a 3x-priced item returns at least `severity: "warning", confidence: "medium" | "high"`.
- ✅ **Single-observation combos return insufficient_history without crashing:** for the 12 vendor+cost-code combos with single observations per TASK-2 Check 4, `flagAnomaly` returns `is_anomaly: false, reason: "insufficient history", confidence: "low"`.
- ✅ **Confidence indicator visible:** clicking the anomaly badge on `/invoices/[id]` for a flagged line item shows "comparing against N observations from {first_date} to {last_date}, low/medium/high confidence" — honest labeling, no false precision.
- ✅ **Cleanup verified:** prior phase's 14-NULL `cost_code_id` cleanup (Slice 3A) must be complete; running `SELECT count(*) FROM pricing_history WHERE org_id = '<RB-org-id>' AND cost_code_id IS NULL` returns 0 BEFORE Slice 3D ships.
- ✅ **Perf acceptable:** invoice review page load time with anomaly badges on a 10-line invoice does NOT increase by more than ~100ms (verified via Chrome DevTools performance trace).
- ✅ **Unit tests pass:** all anomaly-detection unit tests pass.
- ✅ Rule 1 verification: walk invoice review on Vercel preview with real RB data; confirm badge renders, confidence label is honest, click-to-expand shows the comparison details.
- ✅ `/nightwork-qa` PASS with nightwork-ai-logic-tester (anomaly detection math is sound on representative queries) and nightwork-scalability-reviewer (query plan for the per-line lookup; cache strategy holds at 100k-tenant scale).

**Jake sign-off gate:** Vercel preview verified by Jake on real RB invoice; anomaly badge renders honestly. /nightwork-qa PASS. **Jake authorizes Phase 4 dispatch (or directly to Phase 5 if Phase 4 is no-op).**

**Proposed ceiling for Jake authorization:** **$40** (single plan; single-day estimate per TASK-2).

---

## Phase 4 — FIX

**Sequence step:** fix (per locked scope: "any issues surfaced during BUILD get addressed before TEST starts").

**Goal:** Address bugs, design drift, or scope gaps surfaced during Phase 3 BUILD slices before exposing the system to real RB data in TEST phase. **This phase is scope-discovered:** if Phase 3 ships clean, FIX is a no-op and we proceed directly to TEST. If issues surface, this is the gate to address them before dogfood starts.

**Threat-model severity:** **MEDIUM** (presumptive — varies with what surfaces; e.g., a financial-logic bug surfaces as HIGH; a UI drift surfaces as LOW). Severity assessed per issue.

**Concrete work items:** TBD. Driven by:
- /nightwork-qa findings across Phase 3 slices that were marked as non-blocking but worth addressing pre-launch
- Diane spot-check feedback from Slice 3A sign-off
- Jake spot-check feedback from Slices 3B/3C/3D sign-offs
- nightwork-end-to-end-test failures that surfaced edge cases

**Possible scope (placeholder — to be specified at Phase 4 dispatch time after Phase 3 wraps):**
- Confidence-routing tuning if the human_confirm_co tier shows excessive false positives or false negatives in spot-checks
- Provenance ledger render polish (e.g., a chronologically-ordered audit timeline that's hard to scan on mobile gets a redesign)
- Caldwell-swap adapter edge cases (e.g., a draw with zero invoices, a budget line with no historical invoices)
- Performance issues if any swapped route's page-load latency exceeds threshold
- Documentation: enterprise-docs skill fires to update docs/security.md + docs/architecture.md + docs/onboarding.md per CLAUDE.md "architectural changes ship → docs in sync" contract

**Falsifiable acceptance criteria:**

- ✅ All issues marked as `must-fix-pre-launch` during Phase 3 QA cycles are closed (verified by issue tracker OR by re-running the specific QA check).
- ✅ Diane and Jake spot-check feedback items are either addressed OR deferred-with-rationale (Jake approves the deferral list).
- ✅ /nightwork-qa across all of Phase 3 + Phase 4 work returns PASS with no MUST-FIX findings remaining.
- ✅ Custodian sweep marks Phase 4 done.

**Jake sign-off gate:** Jake reviews the closed-items list + any deferred items with rationale. /nightwork-qa PASS. **Jake authorizes Phase 5 dispatch.**

**Proposed ceiling for Jake authorization:** **$50 placeholder** — actual ceiling re-set at Phase 4 dispatch time based on scope discovered. Per-plan halt at $50.

---

## Phase 5 — TEST + DOGFOOD

**Sequence step:** TEST/dogfood (last per locked scope: "the vigorous gate. Diane uses on real jobs; bugs / friction caught here, fixed, retested.").

**Goal:** Vigorous validation against real Ross Built data, then production staged rollout. Diane is the first real user; the dogfood window is the most important test. **No phase 6: when TEST + DOGFOOD ships, internal launch is complete.**

**Threat-model severity:** **MEDIUM–HIGH.** Production deploy with real RB data + real RB users (Diane initially, then 6 PMs). Rollback paths must be exercised. Sentry monitoring observed for 24h between rollout waves per locked scope §TEST.

**Calendar:** 1–2 weeks total (Diane dogfood window is the bulk; executor work is the harness setup + e2e fixture work + staged rollout coordination).

**Concrete work items:**

| Task | Effort (executor) | Owner | Notes |
|---|---|---|---|
| **Drummond + Fish end-to-end invoice walks** against real fixtures | ~1 day | Executor | `nightwork-end-to-end-test` runs full path: upload → parse → code → approve → QA → draw → printed-provenance-on-PDF. Real fixtures: `test-invoices/Dewberry-*`, `test-invoices/fish-invoices/*.pdf`. Walk every step on real data, NOT synthetic. |
| **TD-B3-FIXTURE-COVERAGE-32-TABLE** | ~1 day | Executor | Per locked scope §TEST + per MASTER-PLAN tech-debt registry. Currently only 5 of 32 tables empirically exercised at B-3 ship; the other 27 confirmed by CASE-mapping static analysis. Required before real RB data flows. Seed all 32 soft-delete tables in `fixture-harness-org` + observe audit trigger fires on each. |
| **Permissions matrix integration smoke** | ~half-day | Executor | The 115 unit tests in `__tests__/invoice-permissions.test.ts` cover the matrix at the function level. Add an integration walk that exercises the actual API routes with each role × each status to confirm end-to-end behavior. |
| **Cross-org tenant-boundary probe** | ~half-day | Executor | fixture-org A user attempts to fetch fixture-org B's data via every route; confirm 404 or filtered-empty in all cases. RLS is the backstop; this is the application-layer verification per locked scope §TEST. |
| **Diane 1–2 week dogfood on real RB jobs** | 1–2 weeks calendar; minimal executor time during the window | Diane (primary user) + Jake (oversight) + Executor (bug triage as friction surfaces) | The single best test of "is this usable" is Diane using it on real invoices in real volume per locked scope §TEST. Diane uses Nightwork in parallel with the current paper workflow on real Ross Built invoices. Capture every friction point + every bug + every "I wish it did X." |
| **Production staged rollout with 24h observation windows** | ~1 day setup + 1 day per onboarding wave | Executor + Jake (rollout coordination) | Per locked scope §TEST. PMs onboard in waves. Observe Sentry / activity-log volume / no-regression smoke for 24h between waves. Suggested wave order: Diane → PM #1 (Lee Worthy or similar Senior) → 2-3 PMs at once → remaining PMs. |

**Falsifiable acceptance criteria:**

- ✅ **PRE-DIANE-DOGFOOD GATE (added Rev 3 per nwrp229) — CO backfill review queue cleared:** before Phase 5 ships launch to Diane for dogfood, `/admin/co-backfill-review` queue is **EMPTY** (zero unresolved flagged rows) OR every remaining flagged row is **explicitly Jake-acknowledged-as-deferred** with rationale captured in `.planning/launch/CO-BACKFILL-QUEUE-DEFERRALS.md` (per-row: which invoice, why deferred, when it gets resolved). Mandatory invariant query: `SELECT COUNT(*) FROM invoice_line_items WHERE co_backfill_needs_review = true AND deleted_at IS NULL` returns count matching the deferrals doc. "Items sit forever" is not the resting state — the queue is the mechanism for catching silent-mis-bills, and a full unmanaged queue defeats that purpose. Jake walks the queue + signs off OR explicitly defers each remaining item before Diane dogfood starts.
- ✅ **Drummond e2e walk PASS:** `nightwork-end-to-end-test` returns success for the full Drummond scenario (vendor → PO → invoice → approve → draw → G702/G703 → printed provenance block visible → lien release → paid).
- ✅ **Fish e2e walk PASS:** equivalent walk for the Fish job's distinct cost-code list (with Slice 3A's per-job seeding applied) — confirms multi-job data integrity.
- ✅ **TD-B3 fixture coverage extended to 32 tables:** `fixture-harness-org` has at least 1 seeded row per soft-delete-eligible table, and a manual delete on each row produces an `activity_log` event of `action = '*_soft_delete'`. TD-B3-FIXTURE-COVERAGE-32-TABLE in MASTER-PLAN §11 marked CLOSED.
- ✅ **Permissions matrix integration smoke PASS:** each of the 4 roles × 21 statuses combinations exercised against the actual API routes returns the expected allow/deny result. Failures surface as integration test failures.
- ✅ **Cross-org tenant probe PASS:** automated test attempts to fetch fixture-org B's invoices, jobs, vendors, draws, COs, POs, lien releases as a fixture-org A user; every attempt returns 404 or filtered-empty array. RLS backstop verified.
- ✅ **Diane dogfood log:** Diane keeps a friction log (or Jake captures verbally) of every friction point + bug + "I wish it did X" comment across the 1–2 week window. Log written to `.planning/launch/DIANE-DOGFOOD-LOG.md`.
- ✅ **Critical bugs fixed during dogfood:** any bug Diane surfaces that BLOCKS her from completing a real invoice approval is fixed within 24h; non-blocking friction items are triaged into a Wave-1.1-Full followup list.
- ✅ **Diane sign-off:** Diane confirms in writing (`.planning/launch/DIANE-SIGNOFF.md`) that the system is ready for PM rollout. Includes a "what's better than paper" summary + a "what still needs polish" deferred list.
- ✅ **PM staged rollout:** each onboarding wave gets a 24h observation window. Sentry error rate ≤ baseline + 10% during the window. `activity_log` volume tracked. No regression smoke on the existing working surfaces.
- ✅ **Rollback plan ready:** per `nightwork-rollback-planner`, an ordered rollback plan exists for the launch — git revert sequence, data restore steps (if any), feature-flag-off steps, communication steps. Document at `.planning/launch/ROLLBACK-PLAN.md`. Never executed during normal launch but ready if needed.
- ✅ All 6 PMs onboarded with at least 24h of observation between waves; no rollback triggered.

**Jake sign-off gate:** Diane signs off on the dogfood. All 6 PMs onboarded successfully across the staged rollout. /nightwork-qa final pass. **Internal Launch SHIPPED.**

**Proposed ceiling for Jake authorization:** **$50** for executor-side work (harness, e2e fixture extension, smoke, staged rollout coordination, bug triage during dogfood). Diane's dogfood time is calendar, not Claude cost.

---

## Designed-For Items (NOT in launch scope, BUT seams built)

Per locked scope §DEFERRED, these items are explicitly OUT of launch but the provenance ledger schema is designed to accept them later without rebuild:

- **Approval-chain engine (F3):** when chain steps fire, they write `activity_log` events with new action types (e.g., `chain_step:approved`, `chain_step:rejected`). Provenance ledger renderer picks them up automatically per Slice 3B "designed-for-seams verified" AC.
- **Reconciliation events (post-F5):** when reconciliation ships, it appends `action = 'reconciled'` events to the existing per-invoice ledger. Same render pattern.
- **Automated escalations:** new action types slot in.
- **Owner Portal exposure:** hidden behind feature flag per Phase 1; future wave flips the flag.

---

## Standing Discipline

Per CLAUDE.md Nightwork standing rules + locked scope §DISCIPLINE, these hold throughout the launch:

- **Cost ceilings** — set per phase/slice at /np dispatch authorization (by Jake); bumps are Jake-only per Rule 7c; max one bump per slice; per-plan halt gate $50 per Rule 7d. Plan-author self-resolution of cost overrun is BANNED per Rule 7a.
- **Halt gates** — at the end of each phase + each BUILD slice; orchestrator review before proceeding; cross-reviewer factual disagreement halts per Rule 9.
- **Calibrated hooks** — every commit goes through `.claude/hooks/nightwork-pre-commit.sh` + `.githooks/pre-commit`. Drummond grep gate NEVER bypassed per Dev Rule. Other hook gates may be bypassed only with explicit per-incident Jake authorization documented in commit body per Rule 8a. Execute-Phase footer convention applies to all execute commits.
- **Orchestrator pattern** — Jake = orchestrator (architectural decisions, ceiling authorization, cross-reviewer disagreement resolution, halt-gate sign-off). Executor (Claude Code session) = plans + authors + executes + reviews + ships within guardrails; surfaces with structured options on architectural choices or discipline gates.
- **Plan-review iter-1 pre-flight (Rule 6)** — hook regex sweep + fixture infra collision + deliverable path reachability + files_modified intersection check on every plan.
- **Rule 1 (schema verification ≠ runtime verification)** — every UI-touching plan verified on Vercel preview before /nightwork-qa PASS.
- **Rule 2 (PostgREST FK citation)** — every embed hint cites FK constraint by name in the plan.
- **Rule 3 (ai-logic-tester executes representative queries)** — no schema-metadata inference.
- **Rule 4 (Playwright smoke pre-QA for UI-touching plans)** — Slices 3B/3C/3D + Phase 2 trigger this; `requires_smoke: true` in plan front-matter.
- **Rule 5 (files_modified intersection check before parallel dispatch)** — Slice 3D vs Slice 3C parallel question routed through this gate per Open Question §1.

---

## Open Questions for Jake

### §1–§7: RESOLVED per nwrp227

For audit trail, the originals + Jake's calls:

| # | Question | Jake's call |
|---|---|---|
| §1 | Slice 3C/3D parallel vs sequential? | **Sequential** ✓ |
| §2 | Cost-code seeding mechanism (org-template vs CSV)? | **Org-template-applied-to-job** ✓ — caveated: "per-job override must be real/easy; if numbers differ per job, the override is load-bearing, not a nicety" → caveat empirically resolved by Rev 1 finding (codes already exist; 95% overlap; override genuinely a nicety) → see new §A |
| §3 | Cost-code backfill for existing jobs? | **Admin-triggered re-apply** ✓ — now moot per Rev 1 finding (codes are org-scoped; no per-job seeding to back-fill) |
| §4 | Cost ceilings | **Authorized as halt-gate control points, NOT believed budget** ✓ — see Rev 1 Plan Overview table for updated framing. Estimates historically ~2x; realistic emotional budget ~$600–700 / ~6 weeks; 3B and 3C most likely to need their one-bump-per-slice; bumps expected; gates are control |
| §5 | Phase 5 staged rollout wave structure? | **Senior-PM-first phased** ✓ — Diane (1–2 wk dogfood) → 1 senior PM (24h) → 2–3 mid-tier (24h) → remaining |
| §6 | Designed-for-seams testing depth? | **Single-action spot-check** ✓ — applied to both 3B.1 (on-screen) and 3C.3 (printed) seams |
| §7 | Documentation timing? | **End of Slice 3B** ✓ — `nightwork-enterprise-docs` fires at Slice 3B sign-off; sync `docs/architecture.md` + `docs/security.md` + `docs/onboarding.md` |

### §A — RESOLVED per nwrp228

Jake chose **(a) drop original seeding + (c) add regression harness**. (b) per-job preferred-subset deferred to post-launch unless dogfood asks. Harness is MANDATORY — not optional verification:

> "Don't just believe the schema read; verify it quantitatively. If it does → seeding stays dead, theory proven. If it DOESN'T → we learn why before dogfood, not during." — nwrp228

Applied throughout the doc:
- Slice 3A scope reduced from ~2–3 days to ~half a day
- Slice 3A halt-gate ceiling reduced from $50 to **$30** (Jake authorized "your call to propose"; $30 proposed; subject to confirmation)
- Slice 3A's AC now includes a HARD FAIL path: if literal-match rate < 50%, slice HALTS and Jake decides next action (not silent "looks iffy" path)
- Cost-code regression results captured to `.planning/launch/COST-CODE-VERIFY.md` for auditability

### §B — Confirmation needed before 3B/3C dispatch (per nwrp228)

Jake's nwrp228: "One thing before I fully sign 3B/3C: surface the REVISED 3B and 3C sections themselves (not just the summary) so I can confirm the ACs are as tight as described — specifically the co_id backfill AC (what happens to invoices whose 'PCCO #5' text DOESN'T resolve to a real change_orders record? those need a flagged-for-manual-review fallback, not a silent NULL) and the printed-block layout AC."

Surfaced inline in the next conversation turn. Tightening applied per Rev 2:
- **3B.2 backfill AC** now includes `co_backfill_needs_review BOOLEAN` flag + `/admin/co-backfill-review` queue + mandatory "no silent NULLs" invariant query
- **3C.3 printed-block layout AC** unchanged (Rev 1's version is tight; awaiting Jake's read).

---

## What This Plan Does NOT Do

- ❌ Does NOT execute Slices 3A/3B/3C/3D/Phase 2/4/5 until Jake signs off on Rev 1. Phase 1 is pre-authorized per nwrp227.
- ❌ Does NOT treat cost ceilings as believed budgets — they are halt-gate control points per nwrp227 §4. Bumps expected on 3B/3C; Jake authorizes bumps per Rule 7c.
- ❌ Does NOT include email intake (`accounting@rossbuilt.com`) — explicitly DEFERRED per locked scope §DEFERRED.
- ❌ Does NOT include QuickBooks Online push — explicitly DEFERRED per locked scope §DEFERRED.
- ❌ Does NOT include PM mobile push notifications — explicitly DEFERRED per locked scope §DEFERRED.
- ❌ Does NOT include the full F3 approval-chain engine — DEFERRED, but designed-for-seams in Slice 3B.
- ❌ Does NOT include the reconciliation feature — DEFERRED, hidden in Phase 1.
- ❌ Does NOT expose the Owner Portal — DEFERRED, hidden in Phase 1.
- ❌ Does NOT include the 2 Caldwell-fixture-mount routes that are Wave 2 scope (`/jobs/[id]/schedule`, `/financials/reconciliation`) — those are HIDDEN in Phase 1, not swapped.
- ❌ Does NOT reconcile the two pricing-data systems (`pricing_history` vs `vendor_item_pricing`) — DEFERRED to a future architecture decision.

---

## Sign-Off

**Drafted:** 2026-05-26 in fresh context per nwrp226.
**Rev 1:** 2026-05-26 same-day per nwrp227 (Gaps 1+2 re-spec + Open Question §1–§7 decisions applied + cost-code schema empirical correction surfaced as §A).
**Rev 2:** 2026-05-26 same-day per nwrp228 (§A resolved (a)+(c): Slice 3A scope reduced, regression harness mandatory; Slice 3B.2 backfill AC tightened with manual-review fallback per Jake's no-silent-NULLs concern; Gaps 1+2 approvals confirmed).
**Rev 3:** 2026-05-26 same-day per nwrp229 (Slices 3A/3B/3C/3D SIGNED OFF; Phase 5 pre-Diane-dogfood gate added requiring CO backfill review queue empty or explicitly-deferred; Phase 1 init Q1-Q3 confirmed; expander ACs confirmed).
**Status:** **PLAN APPROVED END-TO-END** per nwrp229. Phase 1 init continuing through cycle; Phases 3A-3D dispatch in dependency order after Phase 1 + Phase 2 gates clear.

**Next steps:**
1. **Phase 1 (HIDE) cycle continues** through `/nightwork-auto-setup` → SETUP-COMPLETE.md → `/np` → `/nx` → Jake sign-off gate. STOPS at that gate; does NOT roll into Phase 2.
2. After Phase 1 ships: Phase 2 → Slice 3A → Slice 3B → Slice 3C → Slice 3D → Phase 4 → Phase 5 dispatch in order, each at their own sign-off gate.
3. Phase 5 pre-Diane-dogfood gate: CO backfill review queue cleared (or each remaining item explicitly Jake-deferred per `.planning/launch/CO-BACKFILL-QUEUE-DEFERRALS.md`).

Plan is **approved end-to-end** per nwrp229. Phase 1 init proceeds.
