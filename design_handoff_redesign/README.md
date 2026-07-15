# Nightwork — 8-Screen Redesign · Handoff

Redesign of the invoice/draw app's eight core screens in one visual language (Nightwork Design System, Slate palette). Mandate: **reduction** — fewer default-visible controls, progressive disclosure, generous space. Workflows, the flat top nav (Invoices · Price Intelligence · Draws), and the job filter rail are unchanged.

## Files (click-through order)

- `Nav.dc.html` — shared top nav (imported by all screens); `active` prop
- `01 Invoices.dc.html` — invoice queue (landing). Stage tabs with live counts, search, filter popover, rail filters in place
- `02 Invoice Review.dc.html` — **the reference screen.** Opens as a large modal over the queue (prev/next stepper, ESC closes). Everything else derives from its patterns
- `03 Upload Invoice.dc.html` — upload modal over queue; `uploadState` tweak (queued/empty); ESC closes
- `04 Draws.dc.html` — draw list; Open/All tabs; rail filters in place
- `05 Draw Wizard.dc.html` — create draw, 4 clickable steps (`step` tweak); sticky dark footer with running total
- `06 Draw Detail.dc.html` — pay app (G702/G703); sticky dark footer decision bar; timeline disclosure
- `07 Job.dc.html` — job overview + new-job drawer (nav "+ New job" → `#new` hash; ESC closes)
- `08 Cost Codes.dc.html` — settings › cost codes; collapsible categories; RET-100 system code

Navigation is real. Price Intelligence is present but inert (out of scope).

## The system

**Tokens** — from `_ds/…4c/colors_and_type.css`. Page `--nw-white-sand #F7F5EC` (never pure white); cards `#FFFFFF` + `1px rgba(59,88,100,.15)`; nav/footers `--nw-slate-deep #1A2830`; action `--nw-stone-blue #5B8699`; links `--nw-gulf-blue #4E7A8C`. Zero border-radius (avatars/dots excepted). No gradients, no filled pills, shadows only on overlays/popovers/paper.

**Type** — **Space Grotesk for everything** (display AND body — override `--font-body`; the DS default Inter is not used). JetBrains Mono for eyebrows/labels (9–11px, 0.10–0.14em tracking, uppercase) and **all money** (`tabular-nums`, true minus −).

**Core patterns** (built in 02, reused everywhere):
- **Modal record view** — full-screen overlay on the list (dimmed backdrop = context), slate-deep header: identity + status pill left, prev/next stepper + ESC right. Detail screens that aren't records (wizard, job) stay pages.
- **Footer decision bar** — sticky slate-deep bar owns ALL verdict actions: context/AI status left, live validation + primary/secondary/⋯ right. Popovers open upward. Nothing above the fold approves anything.
- **Spreadsheet allocation table** — bordered grid, borderless inputs (focus = inset 1px stone-blue ring), searchable cost-code combobox per cell (search by code or name, PO badge + "$X remain" per option, never clipped), total row inside the grid.
- **Balance impact strip** — the allocation grid stays Excel-pure (Description · Cost code · Amount only); balance math lives in a compact strip directly below the grid: one row per distinct cost code the invoice touches — `code · scope ("PO RB-2026-041" / "Budget") · "$X remain after"`. Ink when comfortable, amber when ≤12% of the scope remains, red `"$X over"` when negative — the same red as the over-budget confirmation it predicts. Prior balance ("Was $16,800 before this invoice") and the PO committed-cost note surface on hover only. A one-code invoice shows one row.
- **Committed & Final** — G703 tables (05 preview, 06 detail) carry a **Committed** column (open PO value not yet invoiced, net of this application; gulf-blue, PO number in the cell tooltip; — when no PO) and a per-line **Final** checkbox ("no further billings expected on this line"). Checked lines turn their Balance success-green and project at billed + committed instead of scheduled; a projection strip totals at-completion vs scheduled for mid-build forecasting.
- **Bulk selection** — list rows carry a hover-revealed checkbox (visible when checked); >0 selected floats a slim slate-deep bar bottom-center: "N SELECTED · APPROVE · HOLD · ✕". Actions apply to the set; ✕ clears.
- **One door, three modes** — the add-invoice modal is a single entry point with quiet segmented modes: Upload files · Manual entry · Import CSV (same segmented-control treatment as stage tabs). No email-in (roadmap, not UI).
- **Over-budget confirmation** — approving an invoice with any negative after-value opens a confirm dialog listing each over scope (code · name · Budget/PO · red after-value — the same red as the table), with "Go back" / bordered-danger "Approve anyway". The red arrow IS the preview of this dialog.
- **PO / CO match** — invoice-level "Matched to · PO / CO" combobox in review, directly under Vendor/Job: searchable list of the job's open POs (with open balance), approved COs, and "No PO / CO — direct to budget"; typed chips (PO gulf-blue · CO amber). AI pre-matches from the document (status line: "✓ AI matched — PO number found on page 1"); a vendor-mismatch pick warns amber. The match determines which commitment the lines draw.
- **Approval stamps** — each approval stage stamps the source document itself, like ink on paper: transparent bordered mono blocks (no fill, `mix-blend-mode: multiply`, slight rotation, pointer-events none) sitting in the document's whitespace. PM review = stone-blue single-border ("PM REVIEWED · name · date · flags cleared"); final approval = success-green double-border ledger stamp: header "APPROVED FOR PAYMENT", then org · job · date · approver · stage · draw # · payment status, then the money breakout — one line per allocation (code · name · amount, incl. RET-100 when withheld) with a TOTAL ALLOCATED rule, and an audit id + GL note footer. Stamps render into the archived PDF and travel with the document — the draw package shows stamped invoices (06's "Stamped" pills reference this).
- **Disclosure** — History/timelines/AI detail collapse to one-line summaries; optional inputs (QuickBooks note) collapse to a "+ Note" link; filters live in a popover; destructive/rare actions in ⋯ overflow.
- **Searchable dropdowns everywhere** — any select with >5 options is a combobox with a search field; panels overlay (position:absolute, high z-index), never clipped by containers.

## Retainage model (org-level default: none)

Ross Built does not withhold retainage — **no screen shows retainage by default**. It's a per-job contract option:
- When a job sets `retainagePct > 0` (tweak on 02 and 06), the system injects a negative **RET-100 "Retainage withheld · X%"** line into the allocation table (auto, not hand-editable, "released at closeout"), the header shows "Net of X% retainage," and allocation balances against net payable.
- G702 statements always print the retainage lines (as $0.00 / — when off) — AIA-form accurate.
- `08` registers RET-100 as a SYSTEM cost code mapped to a QB retainage account.

## Invoice lifecycle (tracked end to end)

`received → AI extraction → pm_review → final_review → ready (allocated) → in_draw (draft → submitted) → funded → paid → pushed_to_qb → archived`, with `void` available until in_draw and `returned_to_pm` looping back from review. 01's stage tabs map to it: To review (pm/final review) · Needs attention (blocked) · Ready for draw (ready + in_draw) · **Billed** (funded/paid/pushed/archived — rows stay linked to their draw and QuickBooks entry; archive is searchable, never deleted). Archive lives in 02's ⋯ menu.

## Lien releases (4-type taxonomy, statutory-form aware)

Types = conditional/unconditional × progress/final. **Conditional progress** releases are requested from every vendor on a draw at submission and attached to the owner package (06 card: per-vendor status — received/requested); owner approval blocks until all are in or waived. **Unconditional progress** releases are auto-requested when funding clears. Final draws swap to conditional/unconditional **final** forms, which also gate retainage release on jobs that hold it. Florida is a statutory-form state (Ch. 713) — forms follow the statute per job state.

## Deposit application (per-job policy)

Client deposits sit on file per job and apply against draws by builder-set policy — the G702 carries a "Less deposit applied this draw" line with the policy select inline (06): **10% of each draw** / **apply until exhausted** / **hold for final draw**. Applied amount recomputes current payment due; the line notes on-file, applied-to-date, and remaining-after. Hanlon holds for final draw ($238,885 on file, 05); Whitaker applies 10% per draw ($241,000 on file, $120,500 applied).

## Terminology (locked)

"Final review" (not QA) · "Return to PM" + reason required (not kick back) · "AI extraction · N fields · X% confidence · N flags" (never a model name) · "Cost code allocation" · "Budget remain / PO remain" ("remain", not "left") · "Recall draw" / "Record owner approval" on submitted draws · committed = open PO value not yet invoiced · "Final" = no further billings expected on a line (feeds projection) · lien releases named by quadrant ("Conditional · progress", never just "waiver") · deposit policies: "10% of each draw" / "apply until exhausted" / "hold for final draw".

## Data dictionary (consistent across screens)

- **Hanlon Residence** — cost-plus (AIA), contract to date $4,820,000, billed $2,710,150 (56.2%), no retainage, draw #9 draft: 3 invoices, **$40,950.00 due**
- **Whitaker Residence** — draw #4 submitted Jul 9 (viewed Jul 11): Keys Framing $14,750 + Gulf Millwork $11,498 − Precision credit $640 = $25,608.00 gross; deposit 10%/draw → −$2,560.80 → **$23,047.20 due**; lien releases 2 of 3 (Precision requested, reminder Jul 16)
- **Osprey Lane Spec** — fixed price, draw #1 approved · funding, $179,133.50
- **02 sample invoice** — Harborline Plumbing #4410, $18,600.00, 4 allocation lines; impact strip exercises every state: 15-410 (PO RB-2026-041, two lines summed → $2,050 remain, amber), 15-420 (Budget → $13,000 remain, ink), 01-500 (Budget → $350 over, **red** → triggers the over-budget confirmation on Approve)
- **POs**: RB-2026-041 (15-410, $24,000 total / $8,000 invoiced), RB-2026-038 (06-400, $60,000 / $41,500), RB-2026-044 (15-720, $28,000 / $0)
- People: Jake Ross (owner) · Maria Delgado (PM) · Sam Whitfield (accounting)

## Label → status map

Invoices: RECEIVED=`received` · PM REVIEW=`pm_review` · FINAL REVIEW=`qa_review` · APPROVED / "Approved for draw"=`qa_approved` · WITH PM / "Returned"=`returned_to_pm` · MISSING INVOICE # / POSSIBLE DUPLICATE=`needs_attention(reason)` · ON HOLD=`held` · INFO REQUESTED=`info_requested` · DRAW #N · DRAFT=`in_draw(draft)` · DRAW #N · SUBMITTED=`in_draw(submitted)` · FUNDED=`funded` · PAID=`paid` · PUSHED TO QUICKBOOKS=`pushed_to_qb` · ARCHIVED=`archived` · VOID=`void`.
Queue tabs: TO REVIEW=`pm_review|qa_review` · NEEDS ATTENTION=`needs_attention|held|info_requested` · READY FOR DRAW=`qa_approved|in_draw` · BILLED=`funded|paid|pushed_to_qb|archived`.
Draws: DRAFT=`draft` · SUBMITTED · AWAITING OWNER=`submitted` · APPROVED · FUNDING=`approved` · FUNDED · date=`funded`; OPEN tab=`draft|submitted|approved`.
Lien releases: RECEIVED / REQUESTED per waiver, typed `conditional|unconditional × progress|final`.

## Allocation grid — Excel interaction spec

Applies to 02's allocation table and the wizard's G703 grid: click any cell to edit **in place** (borderless input; focus = inset 1px stone-blue ring); Tab/Shift-Tab moves right/left, Enter commits + moves down, arrow keys navigate when not editing, typing replaces, **Esc reverts the cell** to its pre-edit value; numerals are JetBrains Mono `tabular-nums`, right-aligned; row actions (✕ remove) are hover-revealed at row end; cost-code cells open a type-to-filter combobox on click/Enter (never clipped). **No edit modals, ever.** This spec is the canonical table behavior for the entire app — invoice allocation, wizard G703, draw tables, cost codes.

**Frozen snapshot rule:** submitted/approved draws render from a snapshot captured at approval — amounts, if-approved arrows, and projections do NOT recompute live after approval; the mockups' live math models draft state only.

## Implementation notes

- Next.js 14 + Tailwind + shadcn/ui per DS README (`borderRadius: 0`); import the token CSS; Heroicons outline 1.5px.
- Hover = border/color shifts only, 0.15s. Comboboxes/popovers close on outside click (not mocked).
- Rail = 220px fixed, a pure job filter for whatever the top nav shows; "Job overview →" link appears when filtered — the only path to `07`.
- Modal math is live in the mockups (allocation totals, if-approved arrows, flag counts) — implement identically: after = now − Σ(lines in scope on this invoice); scope = PO if matched, else budget.
- Tweaks per screen mock states: 02 (`retainagePct`, `showTooltip`, `historyOpen`, `aiExpanded`), 03 (`uploadState`), 05 (`step`), 06 (`retainagePct`, `timelineOpen`), 07 (`drawerOpen`), 08 (`expandAll`), 01 (`emptyQueue`).
