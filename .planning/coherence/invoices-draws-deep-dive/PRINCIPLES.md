# PRINCIPLES.md — best-in-class UX distilled for the Invoices + Draws audit

Research distillation (Ramp, Bill.com, Brex, Stripe, Linear, QuickBooks, Airtable, Superhuman, Gmail, GitHub, plus NN/g and Pencil&Paper canon). 7 parallel research agents, ~530k tokens. Each finding in `HANDOFF.md` cites a principle ID from here. Format per principle: **the rule** → *the antipattern shape to hunt for on a screen*.

The one-line test the whole audit runs, per control/badge/field: **is this the only door to this intent? does it match its twin elsewhere? does its shape uniquely predict its outcome? does it earn its place? does it tell the truth? could the system have known this without asking?**

---

## A. Document / invoice intake — "one front door, many hallways"

Best products expose exactly ONE visually-dominant "add a document" action and absorb every other path (drag-anywhere, email-in, bulk, spreadsheet import) underneath it or as ambient affordances. Two intake affordances are justified ONLY when they take genuinely different payloads (document files needing OCR vs structured rows) — never when both accept the same file to make the same record.

- **INTAKE-1 — One primary 'add' door; alternatives nest inside it.** *Hunt:* two+ equal-weight top-level buttons that each begin an add-document flow side by side ("Upload Invoice" + "Import CSV" + "New Bill"). *(Ramp "New bill ▾" nests spreadsheet import; Stripe single "Create invoice".)*
- **INTAKE-2 — Differentiate doors by payload, not redundancy.** Two doors are legit only if one takes OCR-document files and the other structured rows. *Hunt:* two buttons that both accept PDFs/images and both create a draft bill (one's file-types/output a subset of the other's). Note: if the Upload zone already accepts XLSX, a separate "Import CSV" overlaps.
- **INTAKE-3 — Email-in is an ambient forwarding address, not a button.** *(Ramp `{co}@ap.ramp.com`, Bill.com Inbox address.)*
- **INTAKE-4 — All paths converge on one review queue.** *Hunt:* method-specific destinations (emailed vs uploaded land in different lists).
- **INTAKE-5 — Drag-anywhere; the drop zone IS the browse control.** *Hunt:* a small drop rectangle beside a separate "Browse" button.
- **INTAKE-6 — Single and bulk are the same door scaled** unless bulk buys a materially different workflow.
- **INTAKE-7 — Screen weight follows frequency.** Daily document upload gets prominence; rare CSV/migration paths are demoted behind a menu / import area. *Hunt:* an "Import CSV" given equal-or-greater weight than "Upload Invoice" on the daily screen.
- **INTAKE-8 — Structured imports validate-and-preview before commit; document uploads extract-then-review.** The two look different because their trust models differ.

## B. Review / approval queues — the keyboard-first stack

A reviewer moves through pending items on a persistent list-plus-detail surface, single-key navigate + single-key decide, every decision captures its context inline and auto-advances, a live remaining-count drives to a clear done-state.

- **QUEUE-1 — Single-key navigation and single-key decisions, mouse optional**, shortcuts discoverable. *(Superhuman J/K/E, Linear Triage 1/2/3.)*
- **QUEUE-2 — Approve auto-advances; the reviewer is never stranded** (not bounced to list-top or parked on the cleared item).
- **QUEUE-3 — Holds/denials/kickbacks capture a REQUIRED reason inline, then advance** (the "why" is the payload the next person needs).
- **QUEUE-4 — Persistent list-plus-detail split; queue position never lost.** *Hunt:* full-page-per-item with only back/next arrows and no on-screen list of what's left.
- **QUEUE-5 — Batch-approve the trivially-safe; single-item stays default; risk items (over-budget, low-confidence, no-PO) are gated out of / must be acknowledged in a batch.**
- **QUEUE-6 — The queue always shows what's left and drives to a clear done-state** (visible decrementing count).
- **QUEUE-7 — Reviewer edit authority is scoped:** in-authority fields (cost code, coding) editable inline; out-of-authority (total, vendor) locked and routed through kickback-with-note. *Direct map:* Diane may fix vendor/QB mapping but NOT PM-approved cost codes/amounts — must kick back.
- **QUEUE-8 — Defer (hold/snooze) + undo keep momentum** without forcing a premature approve/deny.

## C. Multi-step financial documents (the draw wizard) — three zones, one live body

(1) a batch-select zone (explicit include/exclude vs a live total), (2) ONE live-editing document body where every toggle/selection/renderer reflows the visible totals in the same interaction, (3) a short irreversible role-gated commit sequence (submit → approve → freeze).

- **WIZARD-SCOPE — Stepper for the batch boundary + commit boundary; NEVER for the document body.** The G702/G703 body stays on one screen so the assembler always sees the whole document + totals. *Hunt:* set a deposit toggle on step 2 / renderer on step 3 but can't see the G702 "current payment due" until a final step.
- **LIVE-TOTAL — Every selection/toggle/renderer change reflows totals in the same click; no "Recalculate" button, no stale numbers.**
- **LINE-SELECT — Inclusion is explicit per-row selection against a persistent running count AND sum.**
- **DRAFT-RESUME — Draft is the ONLY freely-editable state; it persists/resumes intact; it is the only deletable state.**
- **FINALIZE-ONEWAY — Submit/approve/freeze are explicit, confirmation-gated, one-way transitions that name exactly what locks;** after freeze the only retirement is Void-with-reason (retained).
- **REVISE-NOT-EDIT — After lock you revise, not edit:** Rev N links to Rev N-1, supersedes it, prior version retained + viewable. *(Stripe: update finalizes a new invoice and voids the old; both retained.)*
- **SEP-DUTIES — Compile, approve, release/freeze are separate role-gated actions;** the compiler cannot silently approve. Owner approval is meaningful only as a distinct actor + action.
- **CARRY-FORWARD — Exclusion has a visible destination** (carried to next draw / balance-to-finish); G703 columns reconcile on screen (previous + this-period + balance = revised estimate); can't bill past 100% of a line.
- **PRESENTATION-SPLIT — Renderer/output-template choice only re-renders the preview; it never mutates frozen amounts and stays changeable after freeze without a revision.**

## D. Data tables / list views — dense, scannable, honest money

- **INVLIST-1 — Money right-aligned in tabular/mono figures so decimals stack;** text left-aligned. Highest-leverage correctness affordance on a G703. *(Nightwork SYSTEM.md already mandates JetBrains Mono for money — corroborated.)*
- **INVLIST-2 — Compact default row height (~40px) + an explicit, persisted density toggle.**
- **INVLIST-3 — Row actions + selection checkbox revealed on hover, not a permanent trailing button column.**
- **INVLIST-4 — Selection raises a bulk-action bar (absent at rest); select-all + shift-range supported.**
- **INVLIST-5 — Row click opens the review surface; select and peek are distinct targets — one click never does two things.**
- **INVLIST-6 — Header-click sorting + operational filters (job/vendor/status/cost-code/date/amount/confidence) + saved views that persist.**
- **INVLIST-7 — Columns configurable, but decision-critical columns (amount, status, job, cost code, flag, due-date) never fall off horizontal scroll;** freeze the leftmost identity column.
- **INVLIST-8 — Sticky header (and sticky bulk bar)** so a 144-line G703 never loses its column labels.
- **INVLIST-9 — Four visually distinct states: empty / loading / error / filtered-zero** — a blank body is never ambiguous. (Matters doubly given Nightwork's client-auth load-hang history.)

## E. Empty states & first-run — a screen with no rows must still do work

- **ZERO-1 — Four distinct causes, four distinct screens:** never-created (create action) vs filtered-zero (clear-filters, NO create) vs loading (skeleton) vs error (retry). Same "No data" for all four = defect. *(Stripe render order Loading → Error → Empty → Content.)*
- **ZERO-2 — Empty never reads as broken;** the container always states its status; a failed load is visually distinct from a legit empty result.
- **ZERO-3 — Exactly one primary action, and it starts the real workflow** (+ at most one secondary). Zero CTAs (dead end) or 3+ co-equal buttons both fail.
- **ZERO-4 — The action label names the object** ("Upload invoice", "Add budget line", "Start a draw"), never a generic "Get started". Title↔button as call-and-response.
- **ZERO-5 — Copy states what's missing AND how it arrives — the "yet" rule** ("No transactions **yet** · Payments appear here after your first sale"), one active-voice line <~14 words.
- **ZERO-6 — First-run teaches the next step and, where possible, seeds an editable example / import path** (a job with no budget offers "Import budget"/template, not just "No budget lines").
- **ZERO-7 — Restraint: the action outranks the illustration; decoration matches the stakes** (light/none on operational finance surfaces).
- **ZERO-8 — Operational zero is status, not onboarding.** A queue that empties every cycle reads "All caught up", not "create your first invoice" replayed.

## F. Destructive / irreversible actions — match the guard to the real cost

- **DESTRUCT-1 — Guard strength tracks reversibility, not danger vibes:** recoverable → undo toast (no modal); irreversible mid-stakes → single consequence-stating confirm; catastrophic → type-to-confirm.
- **DESTRUCT-2 — Void, don't delete, for finalized financial records** (status→void, row + history retained). Hard delete only on never-finalized drafts. *(Stripe DELETE is draft-only; finalized MUST be voided.)*
- **DESTRUCT-3 — Name the object and preview what else it breaks** (which invoices revert, which lien releases detach) — never a bare "Are you sure? This cannot be undone".
- **DESTRUCT-4 — Verb on the button ("Void draw", not "OK"), danger styling, spatially separated from the safe/cancel default.** *Hunt:* a destructive control sharing a button row/overflow with the primary safe action.
- **DESTRUCT-5 — Type-to-confirm is rare; the token is the object's real name** (not a generic "DELETE").
- **DESTRUCT-6 — Warnings must be earned — no crying wolf on the happy path.** A confirm that fires on every approval becomes click-through noise. *Direct map:* over-budget acknowledgement should fire only when total-to-date would exceed the revised estimate by a material amount — NOT on in-budget (or no-budget) approvals.
- **DESTRUCT-7 — State recoverability honestly;** name the recovery path + window when it exists; say "permanent" only when it truly is.
- **DESTRUCT-8 — High-stakes actions capture a reason into the audit trail** (void, freeze-override, over-budget approval → {who, when, why} to status_history).

## G. IA coherence — the "make-sense" test (catches the two-upload-buttons class)

- **IA-1 — One canonical door per intent.** Two co-equal controls firing the identical action on one screen = one is redundant. *(NN/g: users rarely understand duplicates as such and waste effort.)*
- **IA-2 — Same action, same affordance, everywhere** (label, icon, position, shortcut). *Hunt:* "Approve" as a primary button here, a text link there; "Create Draw" vs "Create New Draw".
- **IA-3 — Different outcomes never share a shape.** *Hunt:* two same-styled buttons where one saves and one deletes, or two "New Job" controls where one opens a drawer and one opens a page.
- **IA-4 — Progressive disclosure over button-crowding.** A toolbar carrying more than the 1–2 actions used >80% of the time is over-crowded. *Hunt:* 6+ co-equal buttons (APPROVE|PARTIAL|HOLD|DENY|REQUEST INFO|DOWNLOAD|DELETE).
- **IA-5 — Badges, counts, stats tell the literal truth** and clear when the quantity does. *Hunt:* a "MULTIPLE (2)" that disagrees with a review card's "4 codes"; a notification "6" that never resolves; a queue count that includes cross-org rows.
- **IA-6 — Infer over ask; never re-ask what you know.** *Hunt:* a required field the system already holds or could derive (a PM the job already implies; a contract the wizard could pull).
- **IA-7 — Every control traces to a live intent;** vestigial/accreted controls are deleted, not tolerated.
- **IA-8 — One component per pattern** (one table, one modal, one status pill). *Hunt:* two queues with different columns/actions for the same entity.
- **IA-9 — A single command/search surface is the canonical fallback and teaches its own shortcuts.**
- **IA-10 — Redundant paths allowed ONLY for genuinely distinct mental models** (reach an invoice via Job vs via Vendor). If you can't name the distinct model, delete the second door.

---

### Sources (representative)
Ramp Bill Pay / approvals / lifecycle docs; Bill.com Inbox + approvals; Brex Bill Pay; Stripe Invoicing/Quotes/Dashboard/empty-state/table docs; Linear Triage/select/peek/method; Superhuman + Gmail shortcuts; QuickBooks progress invoicing; Airtable grid; GitHub delete-repo; NN/g (empty states, confirmation dialogs, proximity of consequential options, redundancy); Pencil&Paper (enterprise tables, empty states). Full URLs in the research transcript (`w2za2rago.output`).
