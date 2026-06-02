# GROUND-TRUTH-VERIFICATION — PART 1.5 WALK (Stage 1.5 of 3)

**Date:** 2026-06-02
**Production baseline:** `https://nightwork-platform.vercel.app` → `dpl_2VXkLAA1f2dCNFPxjsknBGzJ4w8j` (`hael7oqw2`) — post-Phase-1 + listener-off + owner-portal-fix + pre-walk corrections (`8ca201d`). Source: HEAD `8ca201d`.
**Walk mechanism:** split-driver — Jake navigated authed incognito (Ross Built owner session); executor ran parallel Supabase queries for DB-says cross-check.
**Walk target:** Fish Residence (`92a38296-9ad0-4fce-9a84-ca19e2bcf3fb`) substituted for Drummond on routes 5-11 per pre-walk discovery (Drummond functionally empty; Fish data-heavy).
**Verification standard:** Stage-1.5 walk converts (a)-CANDIDATE → (a)-VERIFIED or (a)-BROKEN per modification 5 of nwrp256. Modes used per nwrp265: (a) honest scaffold awaiting wire / (b) route-file-missing or broken / (c) fixture-thin-wrapper that 404s on real UUIDs / wired-and-renders.
**Cost:** sub-stage cap $25 (F1-F9 source investigation + this doc) authorized by nwrp265. Walk DB-cross-check + this doc ~$15-18 actual.

---

## Severity-ranked findings table

| ID | Finding | Severity | Disposition | Fix scope |
|---|---|---|---|---|
| **F1** | `/jobs/[id]/budget` → 404 on real job UUIDs. Page is a Caldwell-fixture thin-wrapper that `notFound()`s when `params.id` doesn't match `CALDWELL_JOBS[].id`. Per file header (`src/app/jobs/[id]/budget/page.tsx:30-35`), F1 wire-up is the explicit path. | **HIGH** (launch-critical surface unreachable) | **FIX (F1 wave work)** | Replace fixture imports with `getCurrentMembership()` + `supabase.from("budget_lines").select(...).eq("job_id", params.id).eq("org_id", membership.org_id)` server-side. Mount existing `BudgetView` with real data. Path defined verbatim in source comment. |
| **F2** | `/jobs/[id]/bills` → "Coming F1" scaffold. `NwPlaceholderCard` mount per `src/app/jobs/[id]/bills/page.tsx`. | **HIGH** (per-job entry to bills missing) | **FIX (F1 wave work)** | Replace `NwPlaceholderCard` with wired list reading `invoices` filtered by `job_id + org_id + deleted_at IS NULL`. Follow the org-wide `/financials/bills` pattern, scoped per-job. |
| **F3** | `/jobs/[id]/pay-apps` → "Coming F1" scaffold. `NwPlaceholderCard` mount per `src/app/jobs/[id]/pay-apps/page.tsx`. | **HIGH** (per-job entry to pay-apps missing) | **FIX (F1 + F6 wave work)** | F1 wires the list reading `draws` filtered by `job_id`. F6 wires the assembled-from-data engine that generates G702/G703 from approved invoices (per file body line 5). |
| **F4** | `/jobs/[id]/activity` → "Coming Wave 1.1-Lite" scaffold. `NwPlaceholderCard` mount per `src/app/jobs/[id]/activity/page.tsx`. activity_log table already ships; per-job filter not yet wired. | **MEDIUM** (per-job activity not surfaced — but org-wide activity exists) | **FIX (Wave 1.1-Lite work)** | Replace `NwPlaceholderCard` with wired feed reading `activity_log` filtered by `entity_id = job_id` OR by entities referencing the job (invoices.job_id, COs.job_id, draws.job_id). Schema supports it; needs query author + UI render. |
| **F5** | `/draws/new` → 404. **Root cause: `next.config.mjs:101` redirect `/draws/:id` → `/financials/pay-apps/:id` catches `/draws/new` → 308 to `/financials/pay-apps/new` → no `page.tsx` exists at that destination → Next.js 404.** The actual draw-creation wizard at `src/app/draws/new/page.tsx` exists and is fully implemented, but unreachable. "Create New Draw" button on `/financials/pay-apps` links to `/draws/new` → broken chain. | **HIGH** (draw-creation feature unreachable; launch-blocker for AIA draw workflow) | **FIX (~30 min — single redirect rule change OR thin re-export page)** | Pick one: (a) exclude `new` from the broad redirect: `{ source: "/draws/:id((?!new$).*)" , ... }`. (b) Create `src/app/financials/pay-apps/new/page.tsx` that re-exports the draw-creation page logic. Recommended: (b) — IA migration intent was `/draws/*` → `/financials/pay-apps/*`; adding the missing destination page completes the migration. |
| **F6** | `/today` Activity Feed showing Bob Mozine activity on Drummond. | **FALSE-POSITIVE** | **NO ACTION** | Verified by query: activity_log has 6 legitimate entries for the 1 Drummond invoice (`7c63cf40-...`). All entries are real status transitions (pm_review → qa_review → qa_approved, kick-back, etc.) on that invoice, attributed to Bob Mozine (user_id `a0000000-0000-0000-0000-000000000004`). Test data (reasons say "test"), but the rendering is correct. Drummond appearing in Activity Feed despite having 0 active CO/budget/draw is because Drummond has 1 invoice with active history. UI matches DB. |
| **F7** | `/jobs` shows 15 jobs not 25. | **CLARIFIED — INVENTORY ERROR + UX INCONSISTENCY** | **FILE (UX consistency follow-up; not launch-blocker)** | Root cause: `/api/jobs/health` (the data source for `/jobs` main list) explicitly filters by `membership.org_id` at line 71 + 98 — single-org scope by design. JobSidebar uses direct `supabase.from("jobs")` without org_id filter; RLS lets platform_admin see cross-org → 25 jobs in sidebar. **PART-1-INVENTORY's "25 visible to platform_admin" was based on sidebar; main list is correctly single-org-scoped to 15.** UX inconsistency: sidebar shows 25 while main list shows 15. For internal Ross Built launch, single-org main list is the correct operational view; cross-org sidebar bleed is a UX surprise but not a functional defect. |
| **F8** | Fish Pay App #1 shows `current_payment_due = -$224,906.77`. | **MATH-CONSISTENT, UX-WEIRD** | **FILE (UX clarity)** | Internal math is consistent: `total_completed_to_date − less_previous_payments = $5,319,169.55 − $5,544,076.32 = −$224,906.77`. The draw is in `status='draft'` with `line_item_count=0` — no this-period work entered yet. The negative reflects "deposit + previous payments exceed work completed (so far)." Once PM adds this-period values, balance flips positive. **UX gap:** showing `Current Payment Due: -$224K` on a draft draw with 0 line items will confuse Diane. Recommend an empty-state indicator: "Draft — no period work entered yet" instead of the raw negative. |
| **F9** | `/financials/bills` queue lacks per-row action affordances. | **CLARIFIED — per-detail actions present** | **NO ACTION (queue-design choice)** | Per `src/app/invoices/[id]/page.tsx:635-1283`: per-invoice detail page mounts QA Approve + Kick Back to PM for `status='qa_review'` invoices, plus Approve + Hold + Deny for `status='pm_review'`. Action-taking works at per-invoice detail level. Queue view intentionally surfaces invoice rows without bulk actions — review is per-invoice (each invoice has its own state). For Diane's QA flow: click invoice → take action. Workflow integrity preserved. |
| **F-Inv-1** | PART-1-INVENTORY misclassified F1-F4 routes as launch-critical (a)-CANDIDATEs. | **MEDIUM (inventory methodology gap)** | **FIX (this doc tightens the classification rule for future inventories)** | See §F-Inv-1 below for concrete proposal. |

---

## Per-route results

Classification key: **PASS** (renders, UI matches DB) / **FAIL** (broken: 404 / scaffold-where-live-expected / data mismatch) / **FLAG** (renders but raises a question).

| # | Route | Result | DB-says | UI-shows | Notes |
|---|---|---|---|---|---|
| 1 | `/` (root) | PASS | authed → 307 → `/today` | redirect as expected | — |
| 2 | `/login` | PASS | n/a (static form) | renders | — |
| 3 | `/today` | FLAG → resolved as **F6 false-positive** | Action Items + Activity Feed pull real activity_log entries | rendered; Bob Mozine activity on Drummond was legitimate (the 1 invoice) | F6 closed |
| 4 | `/jobs` | PASS → flagged F7 (inventory error, not defect) | `/api/jobs/health` returns 15 (Ross Built scope) | 15 jobs | F7 reframes inventory; main list is correctly single-org |
| 5 | `/jobs/{fish}` overview | **PASS** (P4) | 144 budget_lines, 72 COs, 45 invoices, 1 draw, 0 POs | comprehensive overview with contract, budget health (144 lines, 1 over budget, 85 under-committed), open items, client/contract/PM | (a)-VERIFIED |
| 6 | `/jobs/{fish}/budget` | **FAIL → F1** | 144 budget_lines expected | 404 — Caldwell-fixture-only thin-wrapper | (c) fixture-thin-wrapper that 404s on real UUIDs |
| 7 | `/jobs/{fish}/bills` | **FAIL → F2** | 45 invoices expected | "Coming F1" scaffold (NwPlaceholderCard) | (a) honest scaffold awaiting wire |
| 8 | `/jobs/{fish}/pay-apps` | **FAIL → F3** | 1 draw expected | "Coming F1" scaffold (NwPlaceholderCard) | (a) honest scaffold awaiting wire |
| 9 | `/jobs/{fish}/change-orders` | **PASS** (P1) | 72 active COs | 72 rows + summary cards math correct (Original $7.5M + $897K approved COs = $8.4M revised) | (a)-VERIFIED — canonical "data-heavy render works" win |
| 10 | `/jobs/{fish}/purchase-orders` | **PASS** (P6) | 0 POs | graceful empty state with Create PO + Import POs CTAs + summary cards at top | (a)-VERIFIED (empty-state branch) |
| 11 | `/jobs/{fish}/activity` | **FAIL → F4** | activity_log entries expected | "Coming Wave 1.1-Lite" scaffold (NwPlaceholderCard) | (a) honest scaffold awaiting wire |
| 12 | `/jobs/new` | **PASS** (P5) | n/a (form load) | full contract-type options including cost_plus_aia (Ross Built primary) | (a)-VERIFIED |
| 13 | `/financials` overview | **PASS** | 5 cards per Phase 1 T5 | renders 5 cards; Lien Releases tile → `/financials/lien-releases` empty state graceful | (a)-VERIFIED; Extra E2 covered |
| 14 | `/financials/bills` | **PASS** → flagged F9 (clarified) | 57 invoices | rendered list; per-row actions absent at queue level (by design) | F9 closed; (a)-VERIFIED |
| 15 | `/financials/pay-apps` | **PASS** → flagged F8 | 2 active draws | renders draws; Fish draw #1 shows `-$224K` (F8 — math-consistent, UX-weird) | (a)-VERIFIED with F8 caveat |
| 16 | `/invoices/{id}` | **PASS** (P2) | row + line items | excellent surface — source document preview, structured fields, line items, status timeline, Reject / Push to QB actions | (a)-VERIFIED — invoice-review surface ready |
| 17 | `/invoices/{id}/qa` | **PASS** | same invoice | QA review surface renders | (a)-VERIFIED |
| 18 | `/draws/new` | **FAIL → F5** | n/a (wizard form load) | 404 (redirect chain to non-existent `/financials/pay-apps/new`) | wired-but-unreachable due to redirect-rule gap |
| 19 | `/change-orders/{id}` | FLAG (clarification needed) | row exists | renders | Jake flagged for clarification; no specific defect surfaced in walk |
| 20 | `/price-intel` | **PASS** (P3) | 126 pricing_history rows | 61 items, 6 pricing observations, 80 pending verification, $554 tracked | (a)-VERIFIED — Price Intel surface ready |
| 21 | `/admin` + 4 live tile sub-routes | **PASS** | 4 live tiles per Phase 1 T5 (Users, Cost Codes, Billing, Owner Portal Tokens) | renders all 4; sub-routes functional | (a)-VERIFIED |

**Extras:**

| Ref | Test | Result |
|---|---|---|
| **E1** | Route 14 invoice approval-action affordances | Per F9: actions at per-detail level, not queue. PM-stage: Approve / Hold / Deny. QA-stage: QA Approve / Kick Back to PM. Works as designed. |
| **E2** | Route 13 Lien Releases tile destination | `/financials/lien-releases` (per `next.config.mjs:95` legacy redirect target). Empty state graceful (0 rows in `lien_releases` table). |

### Summary count

- **PASS:** 14 routes (1, 2, 4, 5, 9, 10, 12, 13, 14, 15, 16, 17, 20, 21) + 2 Extras
- **FAIL:** 5 routes (6, 7, 8, 11, 18) — F1, F2, F3, F4, F5
- **FLAG → resolved:** 4 (3 false-positive F6, 4 clarified F7, 14 clarified F9, 15 noted F8); 19 (no defect surfaced but flagged for clarification — still open)

---

## F1-F4 deep-dive — per-job tab classification per nwrp265 §2

Per nwrp265 mode-classification: (a) honest scaffold / (b) route-file-missing or broken / (c) fixture-thin-wrapper that 404s.

| Finding | File | Mode | Evidence | F-wave |
|---|---|---|---|---|
| **F1 /budget** | `src/app/jobs/[id]/budget/page.tsx` (101 lines) | **(c) fixture-thin-wrapper** | Lines 47-56: imports `CALDWELL_BUDGET_LINES, CALDWELL_INVOICES, CALDWELL_COST_CODES, CALDWELL_JOBS, CALDWELL_CHANGE_ORDERS, CALDWELL_DRAWS, CALDWELL_DRAW_LINE_ITEMS` from `@/app/design-system/_fixtures/drummond`. Line 64: `const job = CALDWELL_JOBS.find((j) => j.id === params.id);` Line 65: `if (!job) return notFound();`. Fish UUID doesn't match any `caldwell-*` ID → 404. File header lines 30-35 explicitly document F1 swap path: "replace fixture imports with server-side `getCurrentMembership()` + `supabase.from('budget_lines').select(...)` scoped by `membership.org_id`." Same pattern as the owner-portal pre-fix (sanitized fixture mounted as production placeholder waiting for F1 wire). | **F1** |
| **F2 /bills** | `src/app/jobs/[id]/bills/page.tsx` (25 lines) | **(a) honest scaffold** | Line 6 import + lines 13-23 mount: `<NwPlaceholderCard eyebrow="Job · Bills" headline="Bills" body="Job-scoped bills list. ... F1 wires real data." wave="F1" />`. No data calls, no fixture imports — explicit "coming F1" messaging. | **F1** |
| **F3 /pay-apps** | `src/app/jobs/[id]/pay-apps/page.tsx` (26 lines) | **(a) honest scaffold** | Same pattern as F2: `<NwPlaceholderCard ... wave="F1" />` with body "Job-scoped pay apps list. ... F1 wires real data; F6 wires the assembled-from-data engine that generates G702/G703 from approved invoices." | **F1 + F6** |
| **F4 /activity** | `src/app/jobs/[id]/activity/page.tsx` (43 lines) | **(a) honest scaffold** | Lines 24-40: `<NwPlaceholderCard ... wave="Wave 1.1-Lite" />` with body "Activity feed for this job ... The activity_log table already ships; Wave 1.1-Lite wires the per-job filter." Lines 10-22 carry the pre-Plan-5 implementation snapshot in comments as F1/Wave-1.1-Lite reference. | **Wave 1.1-Lite** |

### Common-cause vs distinct-mode determination

Per nwrp265 §1: "Test the 'all four are the same shape — scaffolds + route-file gap awaiting wire-up to existing data' hypothesis FIRST."

**Verdict: NOT a single common cause; two distinct modes.**

- **F2 + F3 + F4 are mode (a)** — `NwPlaceholderCard` mount pattern, explicit "Coming F1" / "Coming Wave 1.1-Lite" messaging in source. Honest scaffolds awaiting wire-up. Fix scope: wire to existing data layer with `job_id` filter.
- **F1 is mode (c)** — `CALDWELL_*` fixture thin-wrapper. `notFound()` triggers when `params.id` doesn't match a Caldwell fixture UUID. **Same Stage 1.5c Plan 3 thin-wrapper pattern as owner-portal pre-fix.** Fix scope: same swap pattern — replace fixture imports with `getCurrentMembership()` + scoped query, mount existing `BudgetView` with real data.

**Why this matters:** F2/F3/F4 are *visible-as-incomplete* (scaffold message tells user "Coming"). F1 is *invisible-as-incomplete* (404 looks like a broken route, not "Coming"). From a launch-readiness UX perspective, F1 is more confusing to PMs because the UI lies about the cause — 404 implies error, not scope-deferred. Recommend F1 either ships the wire OR is converted to an NwPlaceholderCard so the "Coming F1" framing is consistent across the per-job tab family.

Per CLAUDE.md F1 phase scope (Wave 1 financial core): F1 wires F2 + F3 first, then F1 (budget) since budget depends on cost-code + invoice aggregation. Sequencing matches the phase plan.

---

## F5 — draw-creation canonical surface determination

**Root cause:** `next.config.mjs:101`:
```js
{ source: "/draws/:id", destination: "/financials/pay-apps/:id", permanent: true }
```

Catches `/draws/new`, 308-redirects to `/financials/pay-apps/new`. No `page.tsx` exists at that destination → Next.js 404.

**Actual draw-creation wizard:** `src/app/draws/new/page.tsx` (full implementation; not a placeholder). Unreachable due to redirect intercept.

**Where the "Create New Draw" button points:**
- `src/app/draws/page.tsx:87,108` → `/draws/new` (catches redirect → 404)
- `src/app/jobs/[id]/draws/page.tsx:119,141` → `/draws/new?jobId=${job.id}` (same redirect catch → 404)

So both call-sites are broken via the same redirect rule.

**Fix scope (~30 min):** two viable approaches:

| Approach | Mechanism | Pros | Cons |
|---|---|---|---|
| **(a) Exclusion regex on redirect** | `{ source: "/draws/:id((?!new$).*)", destination: "/financials/pay-apps/:id", permanent: true }` | Single-line change. `/draws/new` reaches the existing page directly. | Adds regex complexity to redirect config. |
| **(b) Add destination page** | Create `src/app/financials/pay-apps/new/page.tsx` that re-exports the draw-creation wizard. Update button hrefs to `/financials/pay-apps/new`. | Completes the IA migration `/draws/*` → `/financials/pay-apps/*`. Consistent with Phase 1.5c rename intent. | Touches button hrefs in 4 places + adds 1 page file. |

**Recommended: (b)** — IA migration is incomplete without the destination page; finishing the migration is the cleaner state.

---

## F6 — activity_log Drummond query result

Query: `SELECT * FROM activity_log WHERE org_id = ross_built AND entity_id = drummond_uuid OR entity_id IN (drummond_invoice_ids)`.

Result: **6 entries, all legitimate.** All for the 1 Drummond invoice (`7c63cf40-8fe4-409f-bc3c-2a7ef8aea003`):

| When | Entity | Action | Actor | Detail |
|---|---|---|---|---|
| 2026-04-26 21:23 | invoice | status_changed | Bob Mozine | qa_review → qa_approved |
| 2026-04-24 18:04 | invoice | updated | Bob Mozine | vendor_name_raw set to "SmartShield Homes, LLC [T4-OWNER-LOCKED]" |
| 2026-04-24 18:01 | invoice | status_changed | Bob Mozine | qa_review → qa_approved (reason: "Test QB entry: charge to vendor 890") |
| 2026-04-24 17:58 | invoice | status_changed | Bob Mozine | qa_review → pm_review (kick-back: "Test kick-back — please reassign cost code 12345") |
| 2026-04-24 17:47 | invoice | updated | Bob Mozine | assigned_pm_id changed |
| 2026-04-24 17:06 | invoice | status_changed | Bob Mozine | pm_review → qa_review (approve, reason: "test") |

**Verdict: F6 false-positive.** Drummond has 1 invoice; that invoice has been used as a test fixture for the invoice workflow ("Test QB entry", "Test kick-back", "test" reasons). All entries are real status-history events on the real invoice. Activity Feed rendering is correct. The framing in nwrp264 ("Bob Mozine activity on Drummond despite Drummond having 0 active CO/budget/draw and only 1 invoice") was right about Drummond being mostly empty — but the 1 invoice IS Drummond's, and it has 6 legitimate activity entries.

---

## F7 — /api/jobs cross-org behavior determination

**Source code finding** (`src/app/api/jobs/health/route.ts`):
- Line 61: `const membership = getMembershipFromRequest(req) ?? (await getCurrentMembership());`
- Line 71: `const orgId = membership.org_id;`
- Line 98 + 8 other subsidiary queries: `.eq("org_id", orgId)` — scopes everything to single-org.

**So `/api/jobs/health` is single-org-scoped by design.** Platform admin's cross-org SELECT via RLS doesn't fire because the API explicitly filters by `membership.org_id` BEFORE any RLS query.

**Inventory error:** PART-1-INVENTORY §0.2 + §1.1.4 claimed "25 visible to platform_admin" based on the JobSidebar count (which uses direct `supabase.from("jobs")` with no org_id filter → RLS lets platform_admin see cross-org → 25). The main `/jobs` list at `/api/jobs/health` is correctly scoped to 15.

**UX inconsistency:** Sidebar 25 vs main list 15.

**Disposition:** for internal Ross Built launch, the main list's single-org scope is correct operational behavior. The sidebar's cross-org bleed is a UX surprise but not a functional defect. Two paths:
- (a) Accept the inconsistency for now; document in PART-1-INVENTORY drift (this doc updates §0.2 claim).
- (b) Fix the sidebar to also single-org-scope (JobSidebar query adds `.eq("org_id", membership.org_id)`).

**Recommended: (a) for launch; (b) as Wave 1.1-Lite polish.** Cross-org sidebar bleed only matters when Jake (platform_admin) is signed in — Diane + PMs + Lee won't see it (their RLS filters single-org). For Jake's own UX, the 10 extra fixture jobs in the sidebar are harmless (he knows they're fixtures).

---

## F8 — Fish Pay App #1 negative payment math reconstruction

Query result for Fish draw_number=1, status=draft:

| Field | Cents | Dollars |
|---|---|---|
| `original_contract_sum` | 749,666,717 | $7,496,667.17 |
| `net_change_orders` | 89,714,339 | $897,143.39 |
| `contract_sum_to_date` | 839,381,056 | $8,393,810.56 |
| `total_completed_to_date` | 531,916,955 | $5,319,169.55 |
| `less_previous_payments` | 554,407,632 | $5,544,076.32 |
| **`current_payment_due`** | **-22,490,677** | **-$224,906.77** |
| `balance_to_finish` | 307,464,101 | $3,074,641.01 |
| `deposit_amount` | 74,966,672 | $749,666.72 |
| `line_item_count` | 0 | — |
| `sum_this_period` | NULL | — |

**Math reconstruction:**
- `current_payment_due = total_completed_to_date − less_previous_payments`
- `−$224,906.77 = $5,319,169.55 − $5,544,076.32` ✓

Math is internally consistent.

**Domain interpretation:**
- The draw is in `status='draft'` with 0 line items.
- `less_previous_payments` ($5.54M) > `total_completed_to_date` ($5.32M) — Ross Built has been paid $224K more than work completed (so far, before this period's line items are entered).
- This could reflect: (a) the $749K deposit accounted in less_previous_payments but not yet "earned" against work completed, (b) prior-period over-billing being reconciled, (c) the cost-plus open-book accounting style where deposit + advances exceed completed work in early draws.

**Disposition: not a math bug.** Once PM enters this-period work values into `draw_line_items` (currently 0 rows), `total_completed_to_date` rises, balance flips positive. **UX gap:** showing `Current Payment Due: -$224K` on a draft draw with 0 line items will confuse Diane. Recommend an empty-state indicator: "Draft — no period work entered yet" instead of the raw negative, OR a warning callout: "Draft draw; line items not yet entered; figures may not reflect final pay app."

Routed to Stage 2E for full draws-+-pay-apps flow verification, with this UX gap captured as a polish item.

---

## F9 — per-bill action affordances catalog

Source: `src/app/invoices/[id]/page.tsx` (~1600 lines). Action affordances scoped by `invoice.status`:

| Status | Actions surfaced | Source |
|---|---|---|
| `received` / `ai_processed` | (PM gets routed here) — PM-stage actions | Standard PM review state |
| `pm_review` | **Approve** / **Hold** / **Deny** / **Split** (multi-action) | Lines 1211, 1243, 1251; `openApproveFlow` at 711, partial-modal at 1538 |
| `pm_approved` | (transitions to QA queue) | — |
| `qa_review` | **QA Approve** / **Kick Back to PM** | Lines 1268-1283; `handleQaApprove` at 812, `handleKickBack` at 835 |
| `qa_approved` | **Push to QB** (Accounting); read-only otherwise | `isQaApproved` at 1111; PushToQB action at later lines |
| `qa_kicked_back` | (transitions back to pm_review for re-work) | Banner at 918 |
| `pushed_to_qb` / `in_draw` / `paid` / `void` | Read-only | Status-locked per CLAUDE.md "After QB push: Void + re-enter only" |

**For SmartShield Homes INV-108975 + Triple H Painting INV 2 (both `qa_review`):** Per-detail page surfaces **QA Approve + Kick Back to PM** buttons via lines 1268-1283. Click into either invoice from `/financials/bills/queue` → render the detail view → take action.

**Verdict: F9 closed.** Queue view (`/financials/bills/queue`) intentionally surfaces rows without bulk actions — reviewing-an-invoice is per-invoice work. Action-taking IS wired and functional at the detail level. Workflow integrity preserved per CLAUDE.md status flow.

---

## F-Inv-1 — inventory methodology gap + concrete tightening proposal

**Gap:** PART-1-INVENTORY §1.1.4 listed `[id]/budget`, `[id]/bills`, `[id]/pay-apps`, `[id]/activity` as launch-critical (a)-CANDIDATEs without verifying each file's actual data-call presence. Of these:

- `[id]/budget` is a CALDWELL_* fixture thin-wrapper (no real-backend data call; should have been classified (c)).
- `[id]/bills` is `NwPlaceholderCard` mount (no data call; should have been (c)).
- `[id]/pay-apps` is `NwPlaceholderCard` mount (no data call; should have been (c)).
- `[id]/activity` is `NwPlaceholderCard` mount (no data call; should have been (c)).

The §1.1.4 priority table was *hand-picked from route names*, not verified against the mechanical grep classifier. The grep result (in `/tmp/gtv-data-pages.txt` and `/tmp/gtv-nodata-pages.txt`) would have correctly placed these 4 files in the no-data set if I'd cross-checked.

**Why this happened:** I treated "launch-critical per-job sub-pages" as a *category* assumption (these surfaces must be live because they're launch-critical) rather than a *file-level* fact. Inverted the priority — derived the list from launch-criticality (which is an intent), not from data-call evidence (which is the actual state).

### Concrete proposal for future inventory passes

Tightened (a)-CANDIDATE classification rule:

1. **Mechanical classifier output is the source of truth.** The grep-based data-call detection produces the candidate set. No hand-picking, no extrapolation from route names. If a file isn't in the grep result, it can't be (a)-CANDIDATE.

2. **Per-route file evidence required for any (a)-CANDIDATE.** Each route flagged (a)-CANDIDATE must cite a specific file path + line of the data call (e.g., `supabase.from("X").select(...)` at line N, OR `fetch("/api/...")` at line M). Inventory entry includes the citation; future readers can verify.

3. **Mechanical filter for placeholder patterns (auto-classify as (c)):**
   - Files importing `NwPlaceholderCard` → auto (c). Grep: `import NwPlaceholderCard`.
   - Files importing `CALDWELL_*` from `_fixtures/` → auto (c) (Stage 1.5c thin-wrapper pattern). Grep: `from "@/app/design-system/_fixtures`.
   - Files with only `<NwPlaceholderCard ... wave="<F1|Wave 1.1-Lite|...>"/>` JSX → auto (c).
   - Files that import `notFound` AND look up an ID against a hardcoded fixture set → auto (c) (fixture thin-wrapper pattern). Grep: `notFound` + fixture-find pattern.

4. **Runtime verification per nwrp256 modification 5.** (a)-CANDIDATE upgrades to (a)-VERIFIED only after an authed walk on Production confirms the route renders real data. Stage 1.5 walk format (split-driver: navigator + DB-cross-checker) is the canonical mechanism.

5. **Launch-criticality is ORTHOGONAL to classification.** A route can be both launch-critical AND (c) scaffold — that means it's a launch-blocker that needs FIX (wire-up), not a misclassification. Launch-criticality drives prioritization of Stage 1.5 walks; classification drives candidate-set selection.

6. **Inline self-check on inventory authoring:** Before publishing any (a)-CANDIDATE row, run `grep -lE "supabase\\.|fetch\\(/api/|await supabase" <file>` on the file. If grep returns no match, the file is NOT (a)-CANDIDATE — it's (c) regardless of how launch-critical the route name sounds.

**Application to PART-1-INVENTORY:** §1.1.4 priority table corrected via this PART-1.5-WALK.md. F1-F4 reclassified from "(a)-CANDIDATE launch-critical" to "(c) scaffold-or-fixture-wrapper, launch-critical-FIX-required."

---

## Positive findings (P1-P8 from nwrp264)

| Ref | Finding | Status |
|---|---|---|
| **P1** | Fish CO surface renders all 72 active COs correctly. Summary cards math checks ($7.5M + $897K = $8.4M). | (a)-VERIFIED. Canonical "data-heavy render works" win. |
| **P2** | Invoice review surface (`/invoices/{id}`) is excellent — source document preview, structured fields, line items, status timeline, Reject / Push to QB actions. | (a)-VERIFIED. Core invoice-review ready. |
| **P3** | Price Intel renders comprehensively. 61 items, 6 pricing observations, 80 pending verification, $554 tracked. | (a)-VERIFIED. Launch-ready. |
| **P4** | Job overview (`/jobs/{id}`) — contract numbers, budget health (144 lines, 1 over budget, 85 under-committed), open items, client/contract/PM. | (a)-VERIFIED. Launch-ready. |
| **P5** | Job-create form has full contract-type options including `cost_plus_aia` (Ross Built primary). | (a)-VERIFIED. Launch-ready. |
| **P6** | Empty-state UX on `/jobs/{job}/purchase-orders` is graceful — Create PO + Import POs CTAs, summary cards still render at top. | (a)-VERIFIED (empty-state branch). |
| **P7** | Org-wide `/financials/bills`, `/financials/pay-apps`, and section overview all work. | (a)-VERIFIED. |
| **P8** | Owner-portal fix from `882bf24` verified holding on this walk — no surprise leak. | Confirms previous fix held under new walk. |

---

## Recommended Stage 2A entry — what's verified-enough vs needs-fix-first

### Verified-enough to enter Stage 2A (invoice/bill flow verification)

**Core invoice flow surfaces are ready** for adversarial testing:
- `/invoices/{id}` invoice review (P2)
- `/invoices/{id}/qa` QA review (route 17 PASS)
- `/financials/bills` queue (P7)
- Per-detail action affordances catalog complete (F9)
- Vendor + cost-code data populated (24 vendors, 218 cost codes)
- 57 real invoices with status history to exercise

**Adversarial scope for Stage 2A:**
- Bad inputs on invoice fields (PM override edge cases, cost-code mismatch, amount validation)
- Status flow boundary tests (pm_review → qa_review → qa_approved kick-back chain)
- Role-permission server-side enforcement (PM cannot QA-approve own; QA cannot change PM-approved cost codes per CLAUDE.md edit rules)
- Empty states (an invoice with no line items)
- Concurrent edit (optimistic-lock 409 reconciliation)
- Duplicate-detection (vendor + invoice_number + amount + date collision)

Write-testing target: **fixture-org smoke users** per nwrp257 (`smoke-pm-alpha@nightwork.local`, `smoke-accounting@nightwork.local`). Stage 2A entry-gate provisions login.

### Needs FIX before Stage 2 (or scoped as fix-while-walking)

| Finding | Blocks Stage 2A? | Blocks Stage 2C-E? | Rationale |
|---|---|---|---|
| **F5 /draws/new 404** | NO | **YES (blocks 2E)** | Draw creation is the entry point for the draws + pay apps flow. 2E cannot verify draw flow if the canonical draw-create URL 404s. Fix recommended before 2E. ~30 min. |
| **F1 /jobs/{id}/budget 404** | NO | **YES (blocks 2C)** | Budget flow verification (2C) requires the per-job budget surface to render. F1 wire is broader F1-wave scope (~hours). Workaround for Stage 2C: verify org-wide budget aggregation via /api/jobs/health output + DB queries; defer per-job budget UI testing to post-F1. |
| **F2 /jobs/{id}/bills scaffold** | NO | NO (covered by org-wide /financials/bills) | Per-job entry is missing but org-wide queue works. Stage 2A tests org-wide; per-job entry verification deferred to post-F1. |
| **F3 /jobs/{id}/pay-apps scaffold** | NO | NO (covered by /financials/pay-apps) | Same as F2 — org-wide works; per-job defer to post-F1+F6. |
| **F4 /jobs/{id}/activity scaffold** | NO | NO | Per-job activity is Wave 1.1-Lite scope. Org-wide activity_log queries work for Stage 2 verification. |
| **F7 sidebar/list inconsistency** | NO | NO | UX surprise only; not a workflow defect. Defer to Wave 1.1-Lite polish. |
| **F8 negative-payment-due UX** | NO | NO (informs 2E) | Math correct; UX clarity item for 2E to capture + propose polish. |

### Recommended sequencing

1. **Fix F5 first (~30 min):** un-blocks draws + pay apps flow, smallest change, single-line redirect or single-page add.
2. **Stage 2A: invoice/bill flow** ($30 ceiling per nwrp257) — covered by verified surfaces. Run with smoke-fixture login.
3. **Stage 2B: price intel** ($15) — covered by P3.
4. **Stage 2C: budgets** ($25) — workaround per F1 disposition: verify org-wide aggregation + DB-level math; defer per-job UI to post-F1-wire.
5. **Stage 2D: POs + COs** ($25) — POs covered by P6 empty-state + nwrp257 disposition (RB uses subcontract agreements not POs); COs covered by P1 + route 19 detail verification.
6. **Stage 2E: draws + pay apps + lien releases** ($35) — *requires F5 fix first* + nwrp257 lien-release disposition.
7. **Stage 2F: judgment additions** ($15) — covers F-Inv-1 inventory tightening application + any P/F finding follow-ups.

### Open clarifications carried to Stage 2

- **Route 19 (`/change-orders/{id}`)** — Jake flagged for clarification but no specific defect surfaced. Resolve in 2D walk.
- **F1 wave scope** — when is F1 budget wire planned? If imminent, defer 2C per-job budget testing. If multi-week, do the org-wide-aggregation workaround.
- **F5 fix** — confirm Jake's preferred approach (redirect-exclusion vs add destination page). Recommended (b) per IA migration completeness.

---

## Status

**STAGE 1.5 COMPLETE.** Halt for Jake review.

Production state at write time: `https://nightwork-platform.vercel.app` → `hael7oqw2` (unchanged through this walk + investigation). No source / env-var / deploy changes by Stage 1.5 itself.

Awaiting Jake's call:
1. **Reclassification confirmation** — accept the (a) → (c) reclassification for F1-F4, accept new F-Inv-1 inventory rule for future passes?
2. **F5 fix prioritization** — pre-Stage-2 fix (~30 min, recommended path (b))? Same-commit + push?
3. **Stage 2A authorization** — approve entry with verified-enough surfaces + smoke-fixture login provisioning?
4. **Open carry-overs to 2A-2F** — F7/F8/F9 dispositions accepted as filed?
