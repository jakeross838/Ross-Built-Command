# Deep-dive findings log (raw, per-screen) — source for HANDOFF.md

Tags: NONSENSE (fails make-sense test) / BUG / FLOW / COSMETIC. Severity: BLOCKER / BAD / POLISH.
Screenshots at 1440 viewport (Playwright), light theme, logged in as Jake/OWNER (platform_admin).

Env note: RB org wiped to clean slate (soft-delete). Home `/` → `/financials/bills`. `/draws` → `/financials/pay-apps`.

---

## 01 — Invoices zero-state (`/financials/bills`, nav "INVOICES")

- **[NONSENSE/BAD] Three upload doors on one screen.** Top-right `UPLOAD INVOICE` + onboarding step-3 `Upload invoice` + (the intake surface itself). Plus `IMPORT CSV` beside `UPLOAD INVOICE` = the two-doors defect Jake flagged. Research INTAKE-1: one primary door, alternatives nest inside it. CSV (structured rows) vs Upload (document OCR) are arguably different payloads (INTAKE-2 allows), but they're equal-weight peers (violates INTAKE-1) and in a zero-state where onboarding says "Upload your first invoice," Import CSV as a co-equal is noise. Fix: one primary "Add bill ▾" with Upload (default) / Import CSV / email-in nested.
- **[NONSENSE/BAD] Two job-create doors.** Nav `+ NEW JOB` + onboarding `Add a job`. (Acceptable in onboarding, but the nav one is globally present too.)
- **[NONSENSE/BAD] Two parallel tab groups, overlapping vocabulary.** Row 1: `TO REVIEW | NEEDS ATTENTION | READY FOR DRAW`. Row 2: `ALL | PM REVIEW | ACCOUNTING QA`. "Review" appears in both; relationship (AND? OR?) unexplained. "TO REVIEW" vs "PM REVIEW" vs "ACCOUNTING QA" semantics collide. New user cannot tell what's selected-together. Fix: collapse to ONE stage axis; make role/queue a filter not a second tab strip.
- **[BUG/BAD] Breadcrumb root inconsistent with Draws.** Here: `FINANCIAL · INVOICES` (singular). Draws page: `FINANCIALS · DRAWS` (plural). Same nav section root, two spellings.
- **[COSMETIC/POLISH] Bills vs Invoices terminology.** Route `/financials/bills`, everything user-facing says "Invoices". D-051 rename to "Bills" only hit the URL.
- **[FLOW/POLISH] Full filter/tab/search chrome rendered in zero-state** (all tabs 0, search, MORE FILTERS) above the onboarding card — nothing to filter yet. Draws zero-state (cleaner) suppresses this. Inconsistent empty-state treatment between the two flagship surfaces.
- **[COSMETIC/POLISH] Onboarding footer** "…we'll prompt you when you create your first draw." says "draw" (lowercase) while the section is "Draws"/"Pay Apps".
- Positive: onboarding card is a decent first-run (teaches next step, cost-codes pre-checked "Done"). Honest counts "0 in this stage · 0 total".

## 02 — Draws zero-state (`/financials/pay-apps`, nav "DRAWS")

- **[COSMETIC/BAD] Draws vs Pay Apps rename half-applied.** Route `pay-apps`, subtitle "AIA G702/G703 pay applications", but title "Draws", nav "DRAWS", empty-state "No draws yet", buttons "Create Draw". Same concept, two names in one viewport.
- **[BUG/BAD] Breadcrumb root "FINANCIALS" here vs "FINANCIAL" on invoices.** (paired with 01.)
- **[NONSENSE/POLISH] Two create-draw entries, two labels, two styles.** Header `CREATE NEW DRAW` (uppercase, filled) + empty-state `+ Create Draw` (title case, filled). Same action, inconsistent label + casing. (Empty-state CTA duplicating header is acceptable per pattern, but label/casing must match.)
- Positive: empty state is strong — centered doc glyph, "No draws yet", one-line value explanation ("generate an AIA G702/G703 pay application from approved invoices"), single clear CTA. This is the model the invoices zero-state should follow.
- **[CONSISTENCY] Empty-state treatments diverge:** draws = clean centered card, no filter chrome; invoices = full chrome + onboarding checklist. Two different empty-state philosophies on sibling surfaces.

## 03 — Jobs zero-state (`/jobs`, nav has NO Jobs item)

- **[BUG/BAD] Third breadcrumb root spelling: `OPERATIONS · JOBS`.** Now three roots across the app: FINANCIAL (invoices), FINANCIALS (draws), OPERATIONS (jobs). And "Operations" is not a top-nav section at all — breadcrumb points at a phantom parent.
- **[NONSENSE/BAD] Three identical "+ New Job" buttons on one screen:** top-nav `+ NEW JOB`, page-header `+ NEW JOB` (visually identical, right-aligned, ~same row as nav), and empty-state `+ New Job`. Nav + header duplicate is pure accretion.
- **[NONSENSE/POLISH] Info banner duplicates the empty-state card.** Banner: "Jobs are the foundation… budgets, invoices, and draws all connect here." Empty card: "Create your first job to start tracking budgets, invoices, and draws." Same message twice, stacked.
- **[FLOW/POLISH] Zero-state shows "Sort: Health (worst first)" + "Active" status filter** with 0 jobs — sorting/filtering affordances that can't do anything yet.
- Positive: empty-state card is good (building glyph, clear one-line value, single CTA). Banner is dismissible.

## 04 — Home `/` → redirects to `/financials/bills` (== screen 01). No dashboard/Today surface exists (stripped). Redirect noted; frame 04 is a duplicate of 01.

## 05 — New Job flow (right drawer opened from header "New Job" ref_13)

- Positive: strong drawer. "TWO REQUIRED FIELDS — THE REST IS DEFAULTED OR CAN WAIT", sensible defaults, progressive "More Details — all editable later", ESC hint, inline "CREATE <name>" client creation. This is a model create flow.
- **[NONSENSE/BAD] Contract Type and Billing Method overlap on "AIA".** Contract Type = {Cost-Plus (AIA), Cost-Plus (Open Book), Fixed Price}. Billing Method = {Cost-Plus Statement, AIA Pay Application (G702/G703)}. "AIA" is in both. Default combo = Cost-Plus (AIA) contract + Cost-Plus Statement billing — internally contradictory to a new user (is it AIA or Statement?). Two dimensions that sound like the same question asked twice; allows contradictory combos with no guardrail/explanation.
- **[BUG/POLISH] Placeholder is a real (wiped) client:** "Kellner — 214 Palm Ave" as JOB NAME placeholder. Use a synthetic example.
- **[BUG/BAD] Deposit/GC-fee defaults swing hard by contract type:** AIA → "10% DEPOSIT · 20% GC FEE"; switching to Open Book → "30% DEPOSIT · 40% GC FEE". A 40% GC fee default on an open-book job is implausibly high; verify the org-settings→contract-type mapping (looks like a seed/config error that would mislead a real user).
- **[NONSENSE/BAD] Two different New-Job mechanisms on one page:** header button `ref_13` opens this drawer; header link `ref_31` and empty-state `ref_48` are `<a href="/jobs/new">` (a full page). Same label "New Job", two implementations. (Verify `/jobs/new` separately — likely a dead/duplicate route.)

## 06 — Jobs list, populated + **CREATE-REFRESH BUG**

- **[BUG/BLOCKER] List does not refresh after creating a job.** Created "Sample Client A" via drawer → "CREATING…" → drawer closed → list still showed "No jobs yet · 0 jobs (active)". DB confirms the job was created (id 0cef246b…, timestamped). Only a manual page reload surfaced it ("1 job (active)"). User gets zero feedback that creation worked → high risk of clicking New Job again and creating a duplicate. Same client-side-stale-data class CLAUDE.md warns about; must check invoice-upload + draw-create for the same defect.
- Populated list is a clean table: NAME | CLIENT/PM | % COMPLETE | BUDGET USED ($used/$total) | OPEN INVOICES | LAST ACTIVITY | STATUS, with left health dot + legend (Green/Yellow/Red). Good.
- **[FLOW/POLISH] No success toast/confirmation anywhere** on job create (see bug above) — silent success is as bad as silent failure.
- Reproduced: created Job B (AIA) → list still "1 job (active)" showing only Job A. DB has both. Bug is deterministic.

### Job-create defaults / retainage (DB-verified)
- **[BUG/BAD] Deposit/GC-fee preview lies on first render.** Drawer opened for AIA showed "10% DEPOSIT · 20% GC FEE"; actual org default that persists is **30% / 40%** (both created jobs saved deposit_percentage 0.30, gc_fee_percentage 0.40). The 10/20 flash disagrees with what saves. A user who doesn't toggle contract type would believe deposit is 10% when it's 30%.
- **[BUG/POLISH] 30% deposit / 40% GC-fee org default is implausible** (RB real default is 10%/20% per spec) — stale test config leaking into every new job.
- **[NONSENSE/BAD] Retainage exists in schema but not in job creation.** jobs has retainage_percent, retainage_threshold_percent, retainage_dropoff_percent — but the New Job drawer (even More Details) never asks for retainage, only deposit + GC fee. For an AIA job, retainage (typically 10% held) is fundamental. Must be set via some other surface (org ADJUST or job settings) — verify reachability.

## 07 — Invoice upload surface (`/financials/bills` → "Upload Invoice", full-page takeover)

- **[CONSISTENCY/BAD] Create-surface pattern is inconsistent:** New Job = right drawer; Upload Invoice = full-page takeover. Two different chrome patterns for two create flows.
- **[NONSENSE/BAD] "IMPORT CSV" vs "UPLOAD INVOICE" overlap in payload.** The Upload dropzone accepts **PDF, DOCX, XLSX, JPG, PNG** — i.e. it already ingests spreadsheets (XLSX). "Import CSV" ingests CSV spreadsheets. Both accept structured spreadsheets → the two doors are NOT cleanly differentiated by payload (research INTAKE-2). Import CSV is nearly subsumed by Upload. Collapse to one "Add bill ▾".
- **[PURPOSE/POLISH] DOCUMENT TYPE: [Invoice | Receipt] toggle.** A "Receipt" intake mode on the invoice upload — scope/purpose unclear for a GC AP flow; verify what Receipt does and whether it earns a top-level toggle here.
- Positive: dropzone is good — one zone, drag+click, multi-file, "each gets its own review card", explicit accepted types.
- Positive: parse progress is a clear per-file checklist (Uploading → Analyzing document → Extracting invoice data → Matching vendor and job → Complete). Nicely legible.

## 08 — Parse FAILURE handling (Anthropic API out of credits) — env blocker + real findings

- **[ENV BLOCKER] AI parse fails: `400 invalid_request_error "Your credit balance is too low to access the Anthropic API."`** No invoice can enter via the app intake without Anthropic credits.
- **[BUG/HONESTY/BAD] Raw provider error leaked to end user.** `invoice-upload-content.tsx:1193` renders `{fileStatus.error}` verbatim → the PM sees `Parse failed: 400 {"type":"error",...,"message":"Your credit balance is too low ... purchase credits.","request_id":"req_011Ccrk..."}`. A PM/accountant should get a friendly message ("Couldn't read this document automatically — retry or enter details manually"), never raw API JSON with request_id.
- **[NONSENSE/BAD] "upload manually" is a hollow promise.** Header copy (`:1192`) says "AI parsing failed — try again or **upload manually**", but the card renders only **Retry** (+ remove). There is NO manual-entry control/flow. The one honest fallback when AI is down (hand-key the invoice) does not exist — so an AP clerk is fully stuck if parsing fails.
- Positive: graceful-ish degradation shell — failure is contained per-file, file stays attached, Retry offered, batch not lost.
- NOTE: blank left "ORIGINAL DOCUMENT" pane in Playwright captures is almost certainly a headless-Chromium PDF-embed render limitation, NOT a bug — verify on a persisted invoice in the real browser before flagging.

## 09 — Intake results / routing (6 invoices via real AI parse; DB-verified)

- Confidence routing observed: 0.97 (clean/T&M/drywall/credit-memo), **0.82** (lump-sum, no invoice #), **0.91** (ugly-scan PNG). All → `pm_review`. None fell below the 70% Diane-triage line (my ugly scan parsed too cleanly at 0.91), so the <70% triage path wasn't exercised.
- **[BUG/consistency] Review-card cost-code count ≠ persisted allocations.** Card showed "Mixed · 4 codes" then "3 codes" across identical uploads (AI non-determinism), but DB persisted 2 allocations; queue shows "MULTIPLE (2)". The number the user sees at review (3–4) is not what saves (2).
- **[NONSENSE/BAD] Credit memo (-$640) saved with NO cost code + 0 allocations.** A negative credit isn't tied to any budget line — it will float untracked against budget. Should force a cost code (which line it credits).
- Positive: duplicate detection works — amber "Possibly already in the system · #INV-1001 … · pm review" + VIEW → link. Soft-warn (SAVE stays enabled), not a hard block (spec said "block"; soft-warn+compare is arguably better — note the divergence). Saving a flagged duplicate appears to add friction (its save hung in automation).

## 10 — Invoices queue, populated (`/financials/bills`, 6 in pm_review)

- **[REDUNDANCY/BAD] `TO REVIEW` (row-1 tab) and `PM REVIEW` (row-2 tab) both show 6 — identical set.** Two parallel tab strips, and their "review" tabs are duplicative. Collapse to one axis.
- **[NONSENSE/BAD] Invoices in "PM review" on jobs with NO PM.** Every row's PM column = "—" (jobs created with PM unassigned). Routed to PM review with no assignee — who actions them? Either force a PM at job creation, or route PM-less jobs somewhere sane.
- Table is good: VENDOR | INV # | DATE | JOB | COST CODE | AMOUNT | DRAW | PAID | PM | DAYS OUT | PAYMENT; right-aligned money, sortable headers, [NO INVOICE #] badge, "MULTIPLE (2)" cost-code badge, red negative for the credit memo, "Not on a draw" / UNPAID chips.
- Payment date computed to Jul 30 for all (received today Jul 9 → by the 20th → 30th) — payment schedule works.
- Notification bell shows a "6" badge (one per uploaded invoice) — verify these notifications are useful, not noise.
- **[NONSENSE/BAD] Vendor-name cell links to the INVOICE (`/invoices/[id]`), not the vendor.** The only way to open an invoice is clicking its vendor name — an overloaded/mislabeled target. Expectation: vendor name → vendor. Add a clear row-open affordance; make vendor name → vendor (or drop the link).
- **[CONSISTENCY/POLISH] Split route namespace:** list at `/financials/bills`, detail at `/invoices/[id]`. Two namespaces for one entity (and `/invoices` + `/jobs/[id]/bills` + `/jobs/[id]/invoices` also exist — dead/duplicate routes to audit).

## 11 — Invoice review / PM approval page (`/invoices/[id]`) — the gold-standard surface

- Source preview RENDERS in the real browser (the earlier blank pane was a headless artifact — not a bug). Layout follows Document Review: source LEFT, details RIGHT. Good.
- **[NONSENSE/BAD] Destructive DELETE sits in the same action row as APPROVE.** Row: APPROVE | PARTIAL | HOLD | DENY | REQUEST INFO | DOWNLOAD PDF | DELETE. DELETE (irreversible) adjacent to the primary APPROVE invites misclicks (research: separate destructive from safe, don't put them in the same cluster). Also 7 peer actions is a lot — PARTIAL / REQUEST INFO purposes are unclear at a glance.
- **[BUG/AI] Mis-coding surfaced for review:** concrete foundation pour + rebar ($8,910) → `05101 — Demolition`; pump truck ($950) → `03114 — Equipment Rental`. Concrete work coded as Demolition is wrong-trade — good that PM can fix, but shows why the miscoding-heavy "Mixed Cost Codes" flag matters. (RB's 05101 label is "Demolition", not "Concrete" as CLAUDE.md examples imply — cost-code seed differs from doc.)
- **[consistency] Allocation count mismatch (again):** review card claimed 3–4 codes; the page shows 2 allocation rows (merged concrete+rebar into one). The pre-save "N codes" the user saw ≠ persisted 2.
- **[FLOW/POLISH] Audit timeline collapsed by default** ("VIEW FULL TIMELINE ˅"). For an audit-trail-first product, the timeline being hidden under-sells the "every change is logged" promise; consider showing a compact timeline inline.
- Positive: `PM: Unassigned ▼` assignable here; per-field confidence + model name (claude-sonnet-4-6) + flags (Handwritten Detected, Mixed Cost Codes) shown; "Split this invoice across multiple cost codes — sum must equal total" with running $9,860.00 / $9,860.00 reconciliation; vendor name "editable — match to QuickBooks"; "OPEN IN NEW TAB" + "Download Original" on the source.
- Confidence label mismatch: top badge "91% High Confidence" but AI panel says "CONFIDENCE 91.8%" and flags say "Handwritten Detected" — 91.8% + a handwritten flag labeled "High Confidence" is slightly contradictory (a handwritten-detected scan calling itself high-confidence).

## 12 — COST CODE PICKER — major systemic finding (used on every invoice + draw)

- **[NONSENSE/BLOCKER] The cost-code dropdown is an unsorted flat list of 168+ items with COLLIDING codes.** Same 5-digit code maps to different trades:
  - `05101` = "Concrete / Foundation" AND "Demolition"
  - `05102` = "Concrete Flatwork" AND "Demolition Debris Removal"; `05103` = "Concrete Block / CMU" AND "Concrete Cutting"
  - `06101` = "Framing — Lumber" AND "Clearing and Grubbing"; `06102` = "Framing — Labor" AND "Tree Removal"; `06103` = "Trusses" AND "Grading"; `06104` = "Sheathing & Wrap" AND "Drainage Plan Work"
  - `09101` = "Masonry" AND "Electrical — Rough"; `10101` = "Framing Labor & General Carpentry" AND "Plumbing — Rough"; `10102` = "Framing Material" AND "Plumbing — Finish"
  - `04101` = "Site Work / Excavation" AND "Surveying"; `15101` = "Drywall — Hang" AND "Gas Rough In"; `16101` = "Fireplace" AND "Interior Paint"; `17101` = "Roofing" AND "Flooring — Tile"
  - `01101 — Architectural Services` and `03110 — Temporary Electric & Water` and `03112 — Debris Removal` each appear TWICE (distinct UUIDs).
  - Plus import junk: `Buildertrend Flat Rate — Buildertrend Flat Rate`, `Change Order Markup — …`, `36101C …Change Order`, and orphan `Demolition — Demolition` / `Framing Labor — Framing Labor` / `Silt Fence — Silt Fence` (code == description).
- **Consequence:** cost-coding is ambiguous by construction — the AI mis-picked "05101 Demolition" for concrete because two 05101s exist; a human faces the same trap. **G703 draws keyed on 5-digit codes are corrupted by duplicate codes** (two line items with code 05101 meaning different trades). This is the highest-leverage data-integrity issue on these surfaces.
- **[NONSENSE/BAD] The picker is unsorted** (jumps 22101 → 30101 → 31101 → Buildertrend → 21101 → 01101…) and has NO search/grouping — finding a code in 168 flat options is brutal. Needs: dedupe/clean the seed, sort by code, group by division, and make it a searchable combobox.

## 13 — PM approve / over-budget / correction (DB-verified)

- **[BUG/BLOCKER] APPROVE silently discards unsaved allocation edits.** Changed the cost code dropdown from "05101 Demolition" → "05101 Concrete/Foundation", then clicked APPROVE. UI showed the new code, but the persisted allocation is STILL "05101 Demolition". The dropdown edit needs a *separate* "SAVE ALLOCATIONS" button; APPROVE commits the previously-saved allocation and drops the pending change. A PM who fixes a miscode and then approves (the obvious action) unknowingly approves the WRONG code. Two competing save mechanisms on one panel with silent data loss.
- **[NONSENSE/BAD] No-budget jobs flag EVERY invoice as "over budget".** Jobs with no budget_lines → every cost code has $0 budget → the Over Budget modal fires on every approval ("+$8,910 (100.0%)"). A newly-set-up job (budget not yet entered) forces the overage flow (Convert to CO / Approve as Overage + required note) on literally every invoice. "100.0% over $0" is also misleading math.
- **[FLOW] correct→learn-verify not exercised / not triggered.** parser_corrections stayed 0 after the (lost) correction. Because the edit didn't persist, the learn signal never fired; combined with the approve-drops-edit bug, the whole correct→learn path is fragile. Needs a clean retest via SAVE ALLOCATIONS.
- Positive: Over Budget modal is well-designed — names the over cost codes + %, requires a note to approve-as-overage, offers Convert to Change Order, Cancel. Approve routes pm_review → qa_review correctly; status_history grows (audit trail intact).

## 14 — SECOND invoice queue `/financials/bills/queue` ("PM Queue") — redundancy + cross-org leak

- **[REDUNDANCY/BAD] Two parallel invoice-queue surfaces.** `/financials/bills` = "Invoices" (workflow-stage tab strips). `/financials/bills/queue` = "PM Queue" (sub-tabs INVOICES | QUEUE | QA, inline QUICK APPROVE, bulk-select checkboxes, confidence/PM/job filters). Two different list UIs for the same invoices, reachable from different places (the invoice detail "← Queue" goes to PM Queue; the nav "Invoices" goes to the list). Users can't tell which is canonical.
- **[BUG/SECURITY/BLOCKER — verify] PM Queue shows CROSS-ORG invoices.** It lists "Smoke Vendor Alpha" ($15,000) / "Smoke Vendor Beta" ($25,000) on "SMOKE JOB ALPHA/BETA" — these belong to **Verification Harness Fixture Org**, not Ross Built. Count says "7 invoices pending PM review" (5 RB + 2 fixture). The `/financials/bills` "Invoices" list correctly showed only RB's 6. So the PM Queue query is NOT org-scoped (likely relies on RLS, which platform_admin bypasses → cross-org rows appear). Even if only platform-admins see it, it violates "filter every query by membership.org_id" (CLAUDE.md) and the two queues disagree on membership. Verify whether a non-platform-admin owner also sees cross-org.
- **[consistency] QUICK APPROVE + bulk select exist only on PM Queue, not the Invoices list.** High-confidence (97%) rows get inline QUICK APPROVE; 82% + the credit memo don't. Good feature, but batch/quick-approve is absent from the other queue — capability split across two surfaces.
- Fixture Smoke rows show CONFIDENCE 0% + badges NO INVOICE#/NO DATE/UNKNOWN VENDOR + "56d [300+]" waiting — stale fixture junk surfacing in a real tenant's queue.

## 15 — Accounting QA queue (`/financials/bills/qa`)

- **[BUG/SECURITY] Cross-org leak here too:** QA queue shows "Smoke Vendor Gamma / SMOKE JOB GAMMA $35,000" (Verification Harness Fixture Org). "2 invoices ready for QA review" = 1 RB (Mock Concrete) + 1 fixture. Same org-scoping gap as the PM Queue.
- **[BUG/HONESTY/BAD] Approver attribution is broken.** PM-APPROVED column shows "system — Jul 9, 2026" for Mock Concrete (I approved it as Jake/OWNER — should say "Jake Ross"), and a **raw UUID** "00000000-…0002-000000000001" for the fixture row. For an audit-trail-first product that promises "every approval says WHO," logging the approver as "system" (or an unresolved UUID) defeats the core promise.
- Confirms correction loss: Mock Concrete cost code renders "05101 — Demolition" (my Concrete/Foundation fix was dropped by Approve).
- Table: VENDOR | INVOICE # | JOB | COST CODE | AMOUNT | PM APPROVED (who+when) | WAITING. Clean, but see attribution bug.
- QA stage page: actions QA APPROVE | KICK BACK TO PM | DOWNLOAD PDF (correctly narrower than PM stage); "QB MAPPING NOTES · bundled into QA approve" field (matches "QA fixes vendor/QB mapping"). Good.
- **[BUG — verify] QA can still edit the cost-code dropdown.** The allocations dropdown appears editable at QA stage — but the edit rule says QA CANNOT change PM-approved cost codes (must kick back). Verify it's actually blocked.

## 16 — RECURRING: UI does not refresh after mutations

- **[BUG/BAD] Clicked QA Approve → DB moved qa_review → qa_approved (status_history=4), but the page still showed "QA Review / QA Approve".** Same class as the job-create-no-refresh bug. This is now confirmed on ≥2 surfaces (job create, QA approve). Systemic: mutations succeed server-side but the client view goes stale until a manual reload. Erodes trust ("did that work?") and risks double-actions.
- J1 branches NOT exercised (noted, not blocking): HOLD, DENY, REQUEST INFO (PM stage), KICK BACK TO PM (QA stage), and a live correct→learn retest via SAVE ALLOCATIONS. Action controls are present; behavior beyond routing not walked due to scope/time.

# ===== J2 — DRAWS / PAY APPS =====

## 17 — Draw wizard steps 1–3 (AIA job, `/financials/pay-apps/new`)

- Positive: clean 4-step wizard (Select Job → Period → Review Line Items → Summary & Submit), "save as draft at any step", live G703 preview, smart first-draw setup gate ("no contract amount yet, so G702 math would be $0 — set contract + retainage").
- Retainage IS reachable — captured at first-draw setup (not job creation). Revises the earlier "retainage missing" note: it's deferred to draw-time (reasonable, but the AIA job-creation choice doesn't capture it upfront).
- **[BUG/SECURITY] Cross-org leak in the draw-wizard Job dropdown** — lists all Smoke Job Alpha/Beta/Gamma/Epsilon/Eta/Kappa/Theta/Zeta (fixture org) alongside RB's 2 jobs. A user could build an RB draw against a fixture-org job. Same org-scoping gap as the queues.
- Step 2 Period: sensible defaults (period start = day after last locked draw; end = today) + "3 approved invoice(s) received between …" confirmation. Good.

## 18 — Draw wizard Step 3 G703 preview — MAJOR financial-integrity findings

- **[BUG/BLOCKER — financial] Selected credit memo (-$640) silently dropped from the G703.** 3 invoices checked (INV-3003 $11,498, CM-0007 -$640, Framing $14,750), but the G703 shows only 3 positive lines totaling $26,248 — the -$640 credit (no cost code → no G703 line to land on) is omitted. Net effect: the pay application to the owner is $640 too high; a stamped, selected credit never reaches the draw. Credits MUST map to a line (or an adjustments section) — they cannot silently vanish.
- **[BUG/BLOCKER] Cost-code collision corrupts the pay application.** The drywall invoice's $1,814.96 portion renders on the G703 as **"15102 — Gas Tank & Set"** (there are two 15102 codes: "Drywall — Finish & Texture" AND "Gas Tank & Set"; the wrong one was chosen). The owner's AIA pay app shows drywall work billed under Gas. Direct downstream consequence of the duplicate-cost-code seed (finding #12).
- **[BUG] SCHEDULED column = the invoice amounts, not a schedule of values.** No budget_lines exist, so SCHEDULED is set to this-period (balance $0, 100% complete on every line), and the $500k contract isn't broken down across codes. A real G703 needs a schedule of values from the budget; without budgets the G703 is self-referential.
- Positive: retainage computes correctly (10% → $1,475 / $968.30 / $181.50); THIS PERIOD is an editable input for AIA (contrast cost_plus_statement = derived-only per recent lock); selection checkboxes exclude invoices from totals with clear copy ("unchecked stay in the Ready-for-Draw pool").

## 19 — Draw wizard Step 4 G702 Summary (AIA)

- Well-structured AIA G702 (lines 1–9): Original Contract $500,000 · Deposit $150,000 · Contract Sum to Date $500,000 · Total Completed $26,248 · Total Retainage $2,624.80 (10%) · Current Payment Due $23,623.20 · Balance to Finish + Retainage $476,376.80. Retainage/balance math checks.
- **[BUG/BAD — verify] Deposit shown (line 1a $150,000) but never applied to Current Payment Due.** Owner paid a $150k deposit upfront, yet line 8 asks for another $23,623.20 with no drawdown of the deposit and nothing in "Less Previous Certificates". If the deposit was collected, early draws should offset against it. Verify intended deposit accounting (and note 30% deposit is the implausible org default).
- **[BLOCKER] Credit memo still missing:** Total Completed $26,248 (should be $25,608 with the -$640 credit) — the G702 grand total is $640 overstated. Reconfirms finding #18.
- **[FLOW] No deposit toggle / renderer choice on the AIA path.** Task expects "deposit toggle + own-line vs blended renderer" — not present on AIA summary. Likely lives on the cost_plus_statement renderer (Job A) — tested next.

## 20 — Draw detail / drill-down (`/financials/pay-apps/[id]`, Pay App #1 DRAFT)

- **[BUG/BLOCKER] G703 Continuation Sheet renders EMPTY ("0 LINE ITEMS")** on the created draw, though the wizard Step-3 preview showed 3 lines. The G702 shows totals ($26,248 completed, $23,623.20 due) but the itemized continuation sheet that justifies them is blank. draw_line_items persists as 0 across ALL draws (confirmed in initial inventory — even $50M fixture draws). A pay application whose G703 is empty is not a valid AIA submission. (This likely motivated the recent freeze/snapshot work — verify whether approval populates it.)
- **[BLOCKER] Credit memo linked but uncounted:** "Invoices in this draw · 3" lists CM-0007 (-$640), but G702 Total Completed = $26,248 excludes it. Linked ≠ counted.
- Actions: PRINT | EDIT DRAFT | VOID | SEND BACK (disabled on draft) | SUBMIT FOR APPROVAL. Clean lifecycle controls. Status timeline present (collapsed "1 step · DRAFT"). (Did NOT click PRINT — window.print() dialog would block the session.)
- G702 panel is clean and correct-format; the failure is the empty G703 + miscounted credit, i.e. the numbers that would reach the owner are wrong.

## 21 — Draw lifecycle: submit → approve gate

- Submit works (draft → submitted; status timeline "2 steps"). Reload fixed the stale-UI (submit button stayed spinning until reload — same refresh pattern).
- **[BUG/verify] Approve blocked on lien releases despite the setting being off.** "Cannot approve — 2 lien release(s) are still pending. Mark received or waive before approving." But org_workflow_settings.require_lien_release_for_draw = FALSE. Either the setting is ignored or there's a separate hard gate. 2 releases were auto-created (one per draw vendor). Good control in principle; the settings mismatch needs reconciling.
- Lifecycle beyond approval (freeze/snapshot, carry-forward to next draw, void, edit-draft) NOT fully walked — blocked here by the lien gate + scope/time. Controls (VOID, SEND BACK, EDIT DRAFT) are present on the detail page. The freeze/snapshot (recent commits) couldn't be verified end-to-end; note that even at submitted state draw_line_items stayed 0, so verify whether approval is what populates the G703 snapshot.

## 22 — Cost-plus-statement renderer (Job A) vs AIA — the actual difference

- Both billing methods use the SAME G703 wizard/preview UI. The real difference: **THIS PERIOD is a read-only derived value for cost_plus_statement** (Job A) vs an **editable input for AIA** (Job B) — matches the recent "lock this-period for cost_plus_statement (derived-only)" commit. The wizard doesn't otherwise signal that a cost-plus job produces a "cost + markup statement" rather than a G702/G703; it uses AIA framing (G702/G703, retainage) even for the open-book cost-plus job.
- **[BUG/BLOCKER] Same cost-code collision corruption on Job A:** the plumbing invoice (INV-1001, $13,449.90) split to "**10101 — Framing Labor & General Carpentry**" ($10,710.70) + "12102 — Plumbing Fixtures" ($2,739.20) — i.e. the bulk of a plumbing bill renders as Framing (10101 is both). Concrete stays "05101 Demolition". A cost-plus open-book statement (which the client reads line-by-line) would show plumbing as framing and concrete as demolition.
- **[FLOW] "own-line vs blended" markup rendering not found in UI.** jobs.markup_display exists in schema (likely the own-line-vs-blended GC-fee toggle) but no UI control surfaced in job creation or the draw wizard. The deposit toggle likewise wasn't found. These may live in a job-settings surface not reached; flag as not-located.
