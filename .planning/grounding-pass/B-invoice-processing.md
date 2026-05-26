# Grounded inventory — invoice processing actual state

**Generated:** 2026-05-26
**Source:** Live repo walk against current main (commit e71f51e)
**Question:** Can Diane actually use this on a real RB job right now?

---

## Pipeline overview (in plain language)

The invoice flow today, from the moment Diane (or Mara) gets a PDF in her inbox:

1. **File arrives.** Diane downloads the email attachment to her desktop. No email-intake automation; no `accounting@rossbuilt.com` parser. She uploads it manually.

2. **Upload, two ways:**
   - **Single upload:** click "Upload" on `/invoices`, modal opens (`src/components/invoice-upload-modal.tsx`), drag-and-drop one file, watch a 5-step progress UI (uploading → analyzing → extracting → matching → complete), see parsed fields side-by-side with the file preview, hit "Save."
   - **Bulk import:** click "Import" on `/invoices`, modal opens (`src/components/invoice-import-modal.tsx`), drag up to 50 files in one batch. Server creates one `invoices` row per file in status `import_queued`. Client polls `/api/invoices/import/{batchId}/parse-next` one file at a time so Claude rate limits don't hit.

3. **AI parse.** `src/lib/claude/parse-invoice.ts:145-216` (`parseInvoiceWithVision`) sends the file to Claude (model `claude-sonnet-4-20250514`) with a long structured prompt (lines 41-141). Returns a strict JSON envelope: `document_type, vendor_name, invoice_number, invoice_date, total, line_items, confidence_score, confidence_details, flags, cost_code_suggestion`. Math-mismatch detection is mandatory per the prompt (lines 69-73). PDFs go in as native PDF blocks; images as base64 images. DOCX is converted to HTML via `mammoth` and rendered alongside.

4. **Auto-match.** `src/lib/invoices/save.ts:203-558` (single) and `src/lib/invoices/bulk-import.ts:149-487` (bulk):
   - Vendor matched against existing vendors via token-overlap rule (`matchVendor` at `save.ts:57-99`).
   - Job matched via `src/lib/invoices/job-matcher.ts` — multi-signal: name + address + client + filename + description weights, returns score + reasons + ambiguous flag + runners-up.
   - Cost code auto-filled if Claude's suggestion has `confidence >= 0.8` (`save.ts:273-279`).
   - Hard duplicate detection (exact vendor+amount+date) routes new bulk-imported rows to `import_duplicate` status (`bulk-import.ts:232-248`); on single-upload it surfaces a duplicate-modal asking the user to confirm save-anyway.

5. **Routing by confidence.** `determineStatus(score)` in `src/lib/invoices/save.ts:183-186`:
   ```ts
   export function determineStatus(confidence: number): string {
     if (confidence < 0.7) return "qa_review";  // Diane sees it first
     return "pm_review";
   }
   ```
   Bulk import uses the same logic via `promoteStatus()` from `/send-to-queue`.

6. **PM picks up** at `/invoices/queue` (`src/app/invoices/queue/page.tsx`, 1,571 lines) — filters/sorts/batch operations; clicks invoice card → goes to `/invoices/{id}`.

7. **PM review screen** at `/invoices/{id}` (`src/app/invoices/[id]/page.tsx`, 2,234 lines) — file preview LEFT (`InvoiceFilePreview`), parsed fields editable on the right (vendor, invoice#, date, total, per-line cost codes, CO toggle, allocations via `InvoiceAllocationsEditor`), audit timeline in right rail (`InvoiceDetailsPanel`), live budget impact per-cost-code (page lines 396-439). PM hits Approve / Hold / Deny / Partial / Request Info.

8. **Approve gates fire.** Server-side `/api/invoices/{id}/action` (`src/app/api/invoices/[id]/action/route.ts:99-307`):
   - Must have `job_id` and `cost_code_id` (line 100-108).
   - Org-configurable invoice-date / budget-allocation / PO-linkage gates fire when enabled (lines 110-179).
   - CO lines must have `co_reference` — hard block (lines 183-199).
   - Budget gate: sums allocations per budget line, returns 422 with `{error: "over_budget", details}` unless `?acknowledged_over_budget=true` (lines 205-289).
   - Amount-increase > 10% over AI-parsed total requires a note (lines 293-306).
   - Duplicate flag must be dismissed or denied (lines 126-137).
   - Status auto-advances `pm_approved → qa_review` (lines 42-45, `NEXT_STATUS_MAP`).

9. **QA queue** at `/invoices/qa` (`src/app/invoices/qa/page.tsx`) — Diane sees all invoices with status `qa_review` or `pm_approved`. Click row → loads `/invoices/{id}`. The route `/invoices/{id}/qa` is just a redirect (file is `src/app/invoices/[id]/qa/page.tsx`, 9 lines, all redirect).

10. **QA approve / kick back.** Same `/api/invoices/{id}/action` endpoint:
    - `action: "qa_approve"` → `qa_approved` (page handler at `src/app/invoices/[id]/page.tsx:812-831`).
    - `action: "kick_back"` → back to `pm_review` (page handler at `src/app/invoices/[id]/page.tsx:835-853`, requires note).
    - QB-mapping-notes textarea exists but bundles into the action's `note` field (line 819-821) — not a separate column.

11. **Payment lifecycle.** `/invoices/payments` page + `PaymentPanel` on detail. Once `qa_approved` or later, Diane can:
    - **Schedule** — auto-computes scheduled_payment_date from org payment schedule (5th → 15th, 20th → 30th, weekend/holiday skip via `src/lib/payment-schedule.ts`).
    - **Mark paid** — records check#/method/reference/date, flips `payment_status` to `paid` or `partial`, flips `invoice.status` to `paid` when fully paid (`src/app/api/invoices/[id]/payment/route.ts:165-211`).
    - **Reverse** — clears all payment fields if draw not locked (lines 213-258).
    - **Bulk payment** — `/api/invoices/payments/bulk` + `batch-by-vendor` endpoints.

12. **Draw pickup.** Diane goes to `/draws/new`, picks invoices from `qa_approved` + `pushed_to_qb` + `in_draw` + `paid` (`src/app/draws/new/page.tsx:198`). Draw is created in `draft` (`src/app/api/draws/new/route.ts:141-178`). Invoices are linked via `draw_id` update (lines 184-207) but their status stays `qa_approved` until draw submission.

13. **Draw submit cascades.** On `/api/draws/{id}/action` with `action: "submit"`, the DB RPC `submit_draw_with_lien_releases` (migration `supabase/migrations/00061_transactional_draw_rpcs.sql:171-190`) atomically:
    - Flips every linked invoice from `qa_approved` → `in_draw`.
    - Auto-creates one `lien_releases` row per vendor per draw (lines 198-220).
    - Generates a status_history entry per invoice.

14. **QB push.** ❌ No code path exists. Status enum allows `pushed_to_qb` and `qb_failed`, schema has `qb_bill_id` column on `invoices`, but no API route writes it and no UI surface offers it. Only match for "quickbooks" in `src/lib/invoices/job-matcher.ts` (a string keyword for overhead detection).

15. **Lien releases tracked.** `/invoices/liens` (`src/app/invoices/liens/page.tsx`) lists post-draw lien releases, supports bulk-upload-PDFs with filename-pattern matching to existing rows. Cindy uploads signed releases as they come back from vendors.

---

## What's wired

### File upload

- **Routes:**
  - `src/components/invoice-upload-modal.tsx` — single, opens via `/invoices?action=upload`. Lazy-loads `invoice-upload-content.tsx` (777 lines).
  - `src/components/invoice-import-modal.tsx` — bulk, opens via `/invoices?action=import`. Lazy-loads `invoice-import-content.tsx`.
  - No standalone `/invoices/upload` page route; uploads happen inside the modal hosted on `/invoices`.

- **UI status:** Working. Single-upload shows full-viewport modal with the live parse-step progress (`PARSE_STEPS` at `invoice-upload-content.tsx:14-21`), file preview, parsed-data card with confidence breakdown, and "Save" once the parse completes. Bulk shows a table per-file with statuses tracking through `import_queued → import_parsing → import_parsed → pm_review/qa_review` (`invoice-import-content.tsx:21-48`). Both have drag-and-drop with visible drop-zone state.

- **Backend:**
  - `POST /api/invoices/parse` (`src/app/api/invoices/parse/route.ts`, 138 lines) — single file, max 120-second timeout, validates type, uploads to Storage, runs parse, returns parsed JSON + storage path + DOCX HTML (if applicable).
  - `POST /api/invoices/import/upload` (`src/app/api/invoices/import/upload/route.ts`, 179 lines) — batch upload, creates `invoice_import_batches` row + N `invoices` rows in `import_queued`, validates file types (PDF/image/DOCX; XLSX rejected with "convert to PDF first"), enforces 10MB/file limit, enforces per-org `import_max_batch_size` (default 50, max 200).
  - `POST /api/invoices/import/{batchId}/parse-next` (`src/app/api/invoices/import/[batchId]/parse-next/route.ts`, 254 lines) — claims one queued row at a time via status guard (lines 80-89), downloads file, runs parse with one retry on failure (lines 130-170), applies parsed result to the row (lines 184-207), recomputes batch counters. Has a `FORCE_PARSE_FAIL` env var for manual retry-logic testing.

- **Storage:** Supabase Storage bucket `invoice-files` is the only storage surface. Org-scoped paths: `{orgId}/uploads/{timestamp}_{safeName}` or `{orgId}/ingest/...` for the document classifier path. Signed URLs minted on detail load with 1-hour expiry (`src/app/api/invoices/[id]/route.ts:109-111`). Post-save, files are renamed to clean convention `[job]_[vendor]_[invoice#]_[date].[ext]` (`save.ts:315-341`).

### AI parse (Claude Vision)

- **Library:** `src/lib/claude/parse-invoice.ts` (260 lines). Exports:
  - `parseInvoiceWithVision(buffer, mediaType, fileName, supabase, meta)` — for PDF/image/DOCX after mammoth conversion.
  - `parseInvoiceFromText(text, fileName, supabase, meta)` — for text-extracted DOCX flow.

- **Wired to Anthropic API?** Yes. `src/lib/claude.ts` is a thin wrapper around `@anthropic-ai/sdk` that meters every call into `api_usage` table for plan-limit enforcement. Model: `claude-sonnet-4-20250514` (Sonnet 4), `max_tokens: 4096`. Pricing logged per-call (`src/lib/claude.ts:24-29`): $3/MTok in, $15/MTok out for Sonnet 4.

- **Schema implemented per CLAUDE.md "Invoice Parse Schema"?** Yes, and extended:
  - Adds `document_type` (invoice / proposal / quote / credit_memo / statement / unknown) per `src/lib/claude/parse-invoice.ts:48`.
  - Adds per-line `is_change_order` + `co_reference` + `source_page_number` + `cost_code_suggestion` (lines 102-118).
  - Adds invoice-level `is_change_order` with strong bias toward true (lines 56-67 — "false positive is cheap; false negative is expensive").
  - Cost-code list is dynamically loaded from the org's `cost_codes` table and injected into the prompt (lines 21-39) so suggestions are constrained to known codes.
  - Math-mismatch flag mandatory (lines 69-73).

- **Confidence routing (>=85% / 70-84% / <70%)?** Partial. The actual cutoff in code is `score < 0.7` → `qa_review` (Diane gets it first); `score >= 0.7` → `pm_review` (`save.ts:183-186`). The "≥85% one-click approve" tier in CLAUDE.md is implemented as a separate Quick-Approve UX layer on `/invoices/queue` with an org-configurable threshold (default `quick_approve_min_confidence: 95`), gated by `quick_approve_enabled`. So the spec's 3-tier table is collapsed in code to a binary route + a Quick-Approve UX layer on top.

### Invoice list / queue

- **Routes:**
  - `/invoices` — all-invoices list (`src/app/invoices/page.tsx`, 851 lines).
  - `/invoices/queue` — PM-focused pending queue (`src/app/invoices/queue/page.tsx`, 1,571 lines).
  - `/invoices/qa` — Diane's QA queue (`src/app/invoices/qa/page.tsx`, lightweight table).
  - `/invoices/payments` — post-QA payment lifecycle (`src/app/invoices/payments/page.tsx`).
  - `/invoices/liens` — post-draw lien releases (`src/app/invoices/liens/page.tsx`).

- **Filtering by status / job / vendor?** Working. `/invoices` has:
  - Primary: search, job filter, PM filter, confidence filter.
  - Advanced: status multi-select, amount range (`0-5k | 5k-25k | 25k-100k | 100k+`), date range.
  - Sort: vendor / date / amount / status / PM / aging.
  - Five stat cards: total / total value / pending / approved / in draw / paid.
  - PM dropdown sourced via `org_members + profiles` with the FK fix shipped in Wave-D migration 00098.

- **PM-specific view?** Working. `/invoices/queue` pre-loads the current PM's `jobs` (lines 192-201) and includes any invoice on those jobs (not just explicitly assigned). Admins and accounting see all org invoices. Diane's `/invoices/qa` is the QA-specific queue (status `qa_review` + `pm_approved`).

- **Status filters:** Working. Queue has `pending | held | denied | kicked_back | info_requested | needs_attention | all`. The "needs_attention" composite catches kicked-back invoices and other states the PM hasn't actively addressed.

### Invoice review screen

- **Route:** `/invoices/{id}` — `src/app/invoices/[id]/page.tsx`, 2,234 lines. (`/invoices/{id}/qa` redirects to it.) This is the largest single source file in the invoice surface.

- **Layout — file preview LEFT + right rail + audit timeline:** Match. The hero block (lines 1304-1430) uses `grid-cols-1 lg:grid-cols-2`:
  - LEFT: `<InvoiceFilePreview>` (PDF via react-pdf, image with click-to-zoom, DOCX via sanitized mammoth HTML, downloadable fallback) — `src/components/invoice-file-preview.tsx`, 100+ lines.
  - RIGHT (stacked):
    1. `<InvoiceDetailsPanel>` — metadata grid + AI extraction summary + vertical audit timeline (`src/components/invoices/InvoiceDetailsPanel.tsx`).
    2. `<InvoiceAllocationsEditor>` — multi-cost-code splits with running totals + auto-create from line items if missing (`src/components/invoice-allocations-editor.tsx`).
  - BELOW the hero: line items editor (full-width), workflow actions row, `<PaymentPanel>` + `<PaymentTrackingPanel>` (`grid-cols-1 lg:grid-cols-2`), edit history card, cost-intelligence link-out.

- **Mobile-friendly?** Partial:
  - Single-column collapse via `lg:grid-cols-2` (kicks in at 1024px+).
  - Sticky bottom action bar (`md:hidden`, line 1517) on phones shows Approve / Partial / Hold / Deny / Request Info as full-width buttons.
  - PDF preview itself is heavy — iframe/react-pdf works on phones but isn't optimized for touch panning.
  - Line items table is dense; tap targets within can be small.
  - But for the core "see invoice + approve" flow, it works on a phone.

- **Override tracking (`pm_overrides` JSONB)?** Wired. The action route merges incoming `pm_overrides` + `qa_overrides` into the invoice row (`src/app/api/invoices/[id]/action/route.ts:346-367`). `EditHistoryCard` displays them when present (lines 1480-1489 in detail page). PATCH route also has a separate field-level audit-log path via `logFieldEdit` when a privileged role edits a locked invoice (`src/app/api/invoices/[id]/route.ts:275-296`).

### Approval workflow

- **Approve / deny / hold:** Wired at `src/app/api/invoices/[id]/action/route.ts`. Accepts these actions (line 21):
  ```ts
  "approve" | "hold" | "deny" | "request_info" | "info_received"
  | "qa_approve" | "kick_back" | "reopen"
  ```
  Status mapping at lines 30-39 (`ACTION_STATUS_MAP`); auto-advances at lines 42-45 (`NEXT_STATUS_MAP`).

- **QA kickback:** Wired. Action `kick_back` requires a note (server-enforced, line 73-78), writes two `status_history` entries (kicked_back → pm_review, lines 332-344). UI banner shows the kickback reason at the top of the detail page (line 919-931) when a `pm_review`-status invoice has a recent `qa_kicked_back` entry in its history.

- **Status transitions tracked? `status_history` JSONB writes?** Yes. Every action appends one or two entries to `status_history`, each with `{who, when, old_status, new_status, note}`. Plus a separate `activity_log` row via `logStatusChange()` (lines 416-425) for cross-entity events. UUIDs in `who` are resolved to real names client-side via a profiles fetch (detail page lines 289-319).

- **Batch operations:** Working. `POST /api/invoices/batch-action` (`src/app/api/invoices/batch-action/route.ts`, 340 lines) for queue-level bulk approve/hold/deny. Runs the same workflow-settings gates per invoice; collects success + failed arrays. Selection state in queue UI (lines 137-145 of queue page); batch buttons with confirmation modals.

### Budget integration

- **Live budget impact on review screen:** Wired. The detail page fetches `budget_lines` for the current job + cost codes used by the line items (lines 396-439), then sums all "counting" status invoices (`pm_approved`, `qa_review`, `qa_approved`, `pushed_to_qb`, `in_draw`, `paid` — line 416) for those budget lines. Shows remaining-vs-spent per cost code in the sidebar.

- **Severity classifier:** Returns `none | yellow | orange | red` based on overage percentage (lines 668-692):
  - `<= revised_estimate` → `none`
  - `0-10%` over → `yellow`
  - `10-25%` over → `orange` (requires note)
  - `> 25%` over → `red` (requires PM acknowledgement + choose-CO-path)
  - Allowances → bumped straight to red (since allowances "expected to overrun")
  - No budget at all + any spend → `red`

- **Budget aggregation? Performance posture?** All-cents storage (`BIGINT amount_cents` everywhere). Aggregation is "recalculate on read" per CLAUDE.md rule; there's also a trigger-maintained `jobs.approved_cos_total` cache (migration 00042) but invoice/budget totals are computed live. `recalcLinesAndPOs` helper fires on every status transition (lines 396-413 of action route) to keep downstream `budget_lines.invoiced` and PO running totals fresh. Performance is bounded by per-cost-code IN-list queries — fine for one invoice's lines, would need to be revisited at scale.

### Edge cases

- **Duplicates:** Wired. Two-tier detection:
  - **Hard match** (exact vendor + amount + date) in `save.ts:153-173` (`checkDuplicate`) blocks the save flow with a "duplicate detected" modal asking user to confirm save-anyway. On bulk import, hard duplicates auto-route to `import_duplicate` status (`bulk-import.ts:232-248`).
  - **Soft fuzzy match** via `findPotentialDuplicate()` (`src/lib/invoices/duplicate-detection.ts`, 80+ lines) uses sensitivity-tuned thresholds (configurable per-org) and sets `is_potential_duplicate = true` + `duplicate_of_id`.
  - Review screen surfaces a "Possible duplicate detected — matches X" banner with a "Not a duplicate" button (`/api/invoices/{id}/dismiss-duplicate`, `src/app/api/invoices/[id]/dismiss-duplicate/route.ts`, 65 lines).
  - Approval is blocked when the flag is live and detection is on.

- **Over-budget:** Wired. Server-side budget gate in the action route 422s with `{error: "over_budget", details: [...]}` unless `?acknowledged_over_budget=true` is set (route lines 269-289). Client-side: graduated severity modal (detail page lines 1648+), required note in orange or red bands.

- **PO matching:** Partial. `po_id` field exists on `invoices` and per-line `invoice_line_items.po_id`. Detail page can link to a PO. There's a workflow-settings `require_po_linkage` gate (off by default for Ross Built). But the PO-matching auto-suggestion logic isn't implemented — there's no "this invoice references PO #1234, want to link?" suggestion surface; the PM picks manually. `po_reference_raw` is parsed by Claude but no automatic resolution to `po_id`.

- **Multi-job split:** Partial. The schema supports it (`parent_invoice_id` + the partial-approval split flow), but "split across multiple jobs" isn't surfaced in the UI as a distinct flow. The Partial flow at `/api/invoices/{id}/partial-approve` (`src/app/api/invoices/[id]/partial-approve/route.ts`, 223 lines) splits the invoice by line items:
  - Approved portion → child invoice with `pm_approved/qa_review` status, child invoice number suffixed `-A`.
  - Held portion → original stays as `pm_held` with reduced total and the `partial_approval_note` set.
  - This is a same-job split, not a cross-job split. Multi-job split would require either creating two children or relinking line items to different jobs — not implemented.

- **Credit memos:** Partial. The detail page detects `total_amount < 0` (`isCreditMemo` at line 659) and shows credit-memo-specific copy in the approve modal (lines 1580-1586). Claude Vision is instructed to flag `credit_memo` in its `flags[]`. But there's no separate "credit memo" entity; it's just an invoice with a negative total. Workflow proceeds through the normal approval path. No specific offset against an existing positive invoice.

- **Request Info / Info Received:** Wired. Action `request_info` → status `info_requested` (`ACTION_STATUS_MAP` line 35); action `info_received` → back to `pm_review` (line 36). The detail page surfaces an "Info Requested" banner with the question + a "Resume Review" button when the status is `info_requested` (lines 969-991).

### Tests

- **Integration coverage of the flow?** Partial.
  - `__tests__/invoice-permissions.test.ts` — covers the lock/role matrix (32 status × role combinations) for `isInvoiceLocked` + `canEditLockedFields` + `canEditInvoice`. Comprehensive unit-level coverage of the permission model.
  - `__tests__/invoice-allocations-tenant-boundary.test.ts` — RLS regression test for post-00096 invoice_allocations org_id denormalization. Currently SKIPs because the test fixture only has one org's data (Wave-B Plan B-6 will seed 2-org coverage).
  - `__tests__/status-enum-alignment.test.ts` — covers enum consistency between code and DB.

- **No end-to-end test** for the full "upload → parse → approve → QA → draw" walk. No integration test for the Claude parse contract.

- **Reference invoice formats (Drummond fixtures, three known shapes from CLAUDE.md):**
  - `src/app/design-system/_fixtures/drummond/invoices.ts` — sanitized data for the design-system playground (renamed in code as "Caldwell" — sanitized substitution map). Not parsed live; hard-coded JSON.
  - `test-invoices/` directory at repo root (gitignored mostly, manual test corpus):
    - `Dewberry-681_KRD-Pay_App_*.xlsx` + pages 01-11 — multi-page AIA-style invoice.
    - `Fish_Pay_App_21_March_26.xlsx` + `fish-invoices/01..45.pdf` — 45 PDFs covering full vendor variety (Metro Electric, Spectrum Business, FPL utility, Clean Cans dumpster, Ecosouth roll-off, Mobile Modular storage, Island Lumber (15+ invoices in many formats), Home Depot receipts, Suncoast Precision, Climatic Conditioning HVAC, Rangel Tile, Sight To See, MJ Florida sub-pay-app, Triple H Architectural / Painting, Universal Windows, Screens Plus, Volcano Stone, Metro Electric well pump).
    - `fish-ground-truth.csv` — labeled ground truth for parse-quality comparison.
  - These are for manual testing; nothing in CI exercises them.

---

## What's missing for Diane to use this on a real RB job

(Diane is non-technical. She needs to: open the app, see today's invoices, click one, see the file + parsed fields + budget impact, route it to the right PM. PM gets it on their phone. PM approves. It lands in her queue. She QA-approves. It ends up in the next draw. Then in QuickBooks.)

### Showstoppers (would break Diane's day-1 workflow)

1. **No email intake.** Phase 4 future work per CLAUDE.md. Diane today receives invoices via vendor email to `accounting@rossbuilt.com` (or her direct inbox). Today she'd have to download each attachment locally, then upload via the modal. The bulk-import flow makes this less painful (50 files at once) but doesn't eliminate the manual step. No parser-watcher, no `Resend`-style inbound webhook (despite Resend being in the env-var list). No `src/app/api/email-intake` route exists. **This is the single biggest day-to-day friction.**

2. **No QuickBooks push.** The status enum allows `pushed_to_qb` and `qb_failed`, the invoice schema has a `qb_bill_id` column on `invoices` (migration 00001:183), and the `pushed_to_qb` status is referenced everywhere in the filter logic — but no code path writes them. There is no QuickBooks Online integration code at all:
   - No `src/app/api/quickbooks/*` routes.
   - No `quickbooks-online` SDK in `package.json` (need to confirm — but no QBO imports anywhere).
   - Only one match for "quickbooks" in the codebase: a `"quickbooks"` overhead-detection keyword in `job-matcher.ts`.
   - After Diane QA-approves an invoice, it sits in `qa_approved` until a draw pulls it in (auto-flipped to `in_draw` by the submit RPC at migration `00061:174`).
   - She would still have to manually re-enter every invoice into QuickBooks — the system she's replacing today.

3. **No PM mobile push-notification.** Notifications fire via `notifyRole` / `notifyUser` (`src/lib/notifications.ts`) to the notifications table, but those rely on email or in-app delivery. There is no SMS or push notification to PMs in the field. If a PM is on-site, the only way they know about new invoices is to open the app. CLAUDE.md says "PM mobile review on phones" — the UI supports that (sticky action bar, responsive grid), but the "tell me I have invoices" loop is incomplete.

### Major gaps (could be worked around for launch but cost time daily)

4. **No "Today" landing.** The CLAUDE.md ARCHITECTURE.md describes a "Today" section as the canonical landing. The invoice list is at `/invoices` and the PM queue at `/invoices/queue`, but there is no single "your invoices today" surface that gives Diane the day's pile in one click. She'd have to know to navigate to `/invoices/queue` or `/invoices/qa`. The `Today` nav entry exists in nav structure (per CLAUDE.md "8 sections locked at D-040") but not as a populated invoice surface.

5. **Lien releases are auto-generated but not auto-completed.** Migration 00061 auto-creates a `lien_releases` row per vendor per submitted draw, but Cindy still has to manually fetch/upload the signed PDF from each vendor. The `/invoices/liens` page supports bulk-upload-and-match-by-filename (the rows can be matched to uploaded PDFs by parsed amount and vendor signal), but the "ask the vendor for a lien release" outbound email isn't automated.

6. **Cost code mapping not org-customizable in-app.** Cost codes are seeded per-org (Ross Built has 5-digit codes per CLAUDE.md), and the AI suggests from the org's list. But adding or editing codes mid-workflow requires SQL or admin UI access — the PM/Diane can't add a new code on the fly when an invoice arrives in a category they haven't budgeted for. There's a cost-codes admin page (referenced as `/cost-intelligence/verification`) but Diane would have to leave the invoice workflow to update it.

7. **Partial approval is line-item-based, not amount-based.** The split flow at `/api/invoices/{id}/partial-approve` requires checking which line items go in the approved portion (route lines 28-89). For a one-line invoice that should be partly paid (e.g., "$10k approved, $2k held pending verification"), there's no path — PM would have to manually add a line item adjustment, which would break math-mismatch and confuse the audit trail. Memo from `partial-approve/route.ts:89`: "All lines are approved — use the regular Approve button instead."

8. **No PO auto-matching.** Even though the parser extracts `po_reference_raw`, the system never auto-binds it to an actual `po_id`. The PM picks from a dropdown. For a builder running 14 simultaneous jobs with hundreds of POs each, this matters more than it sounds — a PM reviewing 5 invoices on a Tuesday morning will spend significant time PO-matching when the parser already knows the PO number.

9. **`/invoices/{id}/qa` is just a redirect.** This is intentional (Phase 3a "unification" per migration commits) — the QA page is `src/app/invoices/[id]/qa/page.tsx` (9 lines, all redirect to `/invoices/{id}`). Means there's no QA-specific layout; Diane and PMs see the same screen with the same controls. The QA Approve / Kick Back buttons are conditionally shown only when status is `pm_approved` or `qa_review` (detail page line 635: `isQaReviewable`). This is fine but means the workflow context (you're acting as QA, not PM) is implicit not explicit.

10. **No automated daily sweep / escalation.** A `/api/cron/overdue-invoices` route exists (referenced at status check). But there's no surfaced "this invoice has been sitting for 8 days, escalate" UI on the queue. The aging badge (30d+, 60d+, 90d+) shows in the queue but no notification fires automatically based on it. CLAUDE.md Phase 4 mentions "escalation timers + PM delegation" as future work.

11. **No audit timeline on the detail page beyond `status_history`.** Status history is rendered in the right rail of `InvoiceDetailsPanel`, but the broader `activity_log` cross-entity events (which fire via `logStatusChange` and `logActivity` from many code paths — every payment action, every batch action, every field edit on a locked invoice) aren't surfaced on the invoice detail. So an audit asking "who changed the vendor name on April 3rd" has to query `activity_log` directly via SQL. Some of these go into the `pm_overrides`/`qa_overrides` JSONB and surface in `EditHistoryCard`, but not all.

### Minor (won't block launch)

12. **Receipt vs invoice classification.** The system handles `document_type === "receipt"` with optional vendor + invoice# enforcement (detail page lines 1023-1028), but in practice all receipts go through the same workflow.

13. **DOCX preview escape hatch.** Doug Naeher Drywall sends DOCX; the mammoth-rendered HTML preview is decent but not 100% faithful to the original Word formatting (especially tables, headers/footers). Download fallback is one click — workable but not seamless.

14. **Bulk approve gates are different from single approve.** The batch-action route gates on workflow-settings flags but doesn't run the full per-line CO-reference check that single approve enforces (`/api/invoices/[id]/action/route.ts:183-199` is single-only). PM might successfully batch-approve invoices that single-approve would reject for missing CO references. Low risk for Ross Built because CO references typically come in by the time PMs are batch-approving, but it's a behavioral inconsistency.

15. **Math-mismatch is reported but not blocking.** Claude flags `math_mismatch` and the UI shows a red banner (detail page lines 995-1007), but the PM can still approve. For Ross Built this is correct (some vendors' line items legitimately don't sum to totals because of tax line treatment), but Diane should be aware of the threshold.

16. **No "save-and-stay" vs "save-and-next" navigation.** After Diane QA-approves an invoice, the page routes back to `/invoices/qa` (queue). This is the right default but there's no way to QA-approve and stay on the page (e.g., to update payment tracking immediately).

---

## Status summary

| Sub-feature | Status | Notes |
|---|---|---|
| Single file upload | Working | Modal at `/invoices?action=upload`; 5-step progress UI |
| Bulk file upload | Working | 50-file batches; per-file table; status `import_queued → import_parsing → ...` |
| Email intake | Missing | Phase 4 future per CLAUDE.md; biggest day-to-day gap |
| Claude Vision parse | Working | `claude-sonnet-4-20250514`; full schema + extensions; math-mismatch detection mandatory |
| DOCX parse | Working | Mammoth-rendered HTML preview; sanitized via DOMPurify |
| Image parse | Working | JPG/PNG/WEBP; base64; click-to-zoom in preview |
| Confidence routing | Partial | Binary `< 0.7 / >= 0.7` + Quick-Approve >= 95%; not the 3-tier in CLAUDE.md |
| Duplicate detection — hard | Working | Exact vendor+amount+date; blocks save flow with modal |
| Duplicate detection — soft | Working | Sensitivity-tuned fuzzy; sets `is_potential_duplicate`; banner + dismiss |
| Vendor auto-match | Working | Token-overlap; auto-create if no match |
| Job auto-match | Working | Multi-signal (name, address, client, filename, description); shows runners-up |
| Cost code auto-fill | Working | When AI suggestion confidence >= 0.8 |
| Per-line cost code suggestion | Working | One per line; AI suggests `cost_code_suggestion` per line |
| Overhead detection | Working | Routes job-less invoices to "overhead" bucket |
| Invoice list page | Working | Search, filter, sort, batch ops; 500-row cap |
| PM queue | Working | Pre-loads PM's jobs; aging badges; needs-attention composite |
| QA queue | Working | Simple list of `qa_review` + `pm_approved` |
| Today landing | Missing | No unified daily inbox for Diane |
| Invoice review screen | Working | Two-column hero, file LEFT, panels RIGHT, audit timeline, allocations editor |
| Mobile review | Partial | Sticky action bar; PDF preview heavy on phones; dense line-items table |
| File preview — PDF | Working | react-pdf with iframe fallback |
| File preview — image | Working | Click-to-zoom; expand overlay |
| File preview — DOCX | Working | Mammoth HTML; DOMPurify sanitized |
| Status history JSONB | Working | Every transition; resolved to real names client-side |
| Cross-entity activity log | Working | Fires from action route + batch route + payment route |
| pm_overrides / qa_overrides | Working | Merged on every action; rendered in EditHistoryCard |
| Lock-aware editing | Working | `isInvoiceLocked` + `canEditLockedFields` matrix; privileged-only edit on locked invoices |
| Per-line CO toggle + reference | Working | Hard-blocked if CO line has no reference |
| Amount guard >10% over AI | Working | Server-enforced via 422; client-side modal |
| Over-budget gate (graduated) | Working | yellow/orange/red severity; allowances → red; ack-token unlock |
| Budget allocation gate | Working | Org-configurable; line-level allocation check |
| PO linkage gate | Working | Org-configurable; line-level OR header-level check |
| PO auto-match suggestion | Missing | `po_reference_raw` parsed but never auto-bound to `po_id` |
| Invoice-date gate | Working | Org-configurable |
| Duplicate gate | Working | Org-configurable; needs explicit dismiss before approve |
| Batch approve / hold / deny | Working | Same gates as single; toast feedback |
| Batch approve CO-ref check | Partial | Single-approve has it; batch-approve doesn't |
| Partial approval (line split) | Working | Creates child invoice with approved lines; parent goes to pm_held |
| Partial approval (amount split) | Missing | No amount-based partial; line-only |
| Multi-job split | Missing | Schema not designed for cross-job; would require re-architecting |
| Credit memo workflow | Partial | Detected by negative total; normal approval flow; no offset against original |
| Request Info | Working | Status `info_requested` → `info_received` round-trip |
| QB push action | Missing | Schema fields exist (`qb_bill_id`, statuses); no API route; no integration |
| QB integration code | Missing | No QBO SDK; no `/api/quickbooks/*` routes; only one keyword match |
| Payment scheduling | Working | Auto-computes from org payment schedule (5th → 15th, 20th → 30th, weekend skip) |
| Payment mark-paid | Working | Records check#/method/reference; partial/full detection; flips invoice.status when full |
| Payment reverse | Working | Blocked if draw is locked |
| Bulk payment | Working | `/api/invoices/payments/bulk` and `batch-by-vendor` |
| Payment tracking (check, pickup) | Working | `check_number`, `picked_up`, `mailed_date` on PATCH route |
| Draw pickup (qa_approved → in_draw) | Working | Via `submit_draw_with_lien_releases` RPC; not a per-invoice action |
| Auto lien release generation | Working | One per vendor per draw via same submit RPC |
| Lien release bulk match | Working | Filename-pattern matching for uploads |
| Lien release request (outbound) | Missing | Diane/Cindy still has to email each vendor |
| Email notification (in-app) | Working | `notifyRole`, `notifyUser`, `sendNotification` |
| Push notification / SMS | Missing | Email/in-app only |
| Escalation timer / aging notification | Missing | Aging shown in queue; no notification fires |
| Drummond/Fish E2E test | Missing | Fixtures exist; no automated walk |
| Permissions matrix tests | Working | `__tests__/invoice-permissions.test.ts` covers full status × role |
| RLS regression test | Partial | `invoice-allocations-tenant-boundary.test.ts` exists; SKIPs without 2-org fixtures |

---

## Honest verdict

**Diane could use this on a real RB job today, with two large workarounds:** (a) she manually uploads every invoice instead of intake-by-email, and (b) she still has to dual-enter every approved invoice into QuickBooks because the QB push is unimplemented despite the schema being ready for it.

The core workflow — upload, parse, route to PM by confidence, PM approves on phone with live budget impact, QA queue, kick-back loop, partial approval (line-based), scheduled payment, draw pickup, auto lien release — is all wired and meaningfully edge-cased. The review screen is the documented gold-standard pattern (file LEFT, fields RIGHT, audit timeline) implemented at 2,234 lines with real edge-case handling (over-budget severity bands, amount guards, duplicate dismissal, partial splits, line-item CO references, math-mismatch banner, credit-memo detection, lock-aware editing matrix, optimistic locking via `updateWithLock`). The Claude Vision parse is honest, metered, plan-limit-aware, with mandatory math-mismatch detection and per-line cost code suggestions.

**The three things to unlock launch-readiness are:**
1. **Email intake** (eliminate the manual upload step — `accounting@rossbuilt.com` → automated parse-and-queue).
2. **QuickBooks push** (so the workflow doesn't dead-end at `qa_approved` and create a parallel dual-entry system).
3. **PM push notifications** (so field PMs know there's work waiting without checking).

Everything else is polish.

**Confidence: HIGH** that the system is closer to ready than CLAUDE.md's "Phase 4 future" framing suggests for the core invoice loop. The architecture is sound; the edge cases are real, not stubbed; the UI has the production-grade pattern.

**Confidence: HIGH** that the QB push gap is the load-bearing one. If Diane has to dual-enter into QuickBooks, she will — but the value-prop is cut in half. The schema is already laid out for QB integration (`qb_bill_id`, `qb_vendor_id`, statuses `pushed_to_qb`/`qb_failed`), so this is a matter of implementing the integration, not redesigning anything.

**Confidence: MEDIUM** on the bulk import + email-intake combo being enough to handle Ross Built's actual daily volume. Some vendors (Florida Sunshine Carpentry T&M sheets) are formats that the parser does adequately but not perfectly; Diane will need to QA-correct several per week. The system handles that gracefully (PM correction → `pm_overrides` JSON → captured by `captureCorrections` → fed back to the AI for self-learning per the CLAUDE.md spec — though the self-learning loop itself isn't yet exercised in code).

---

## File path quick-reference

**Routes (UI surface):**
- `src/app/invoices/page.tsx` — All Invoices (851 lines)
- `src/app/invoices/queue/page.tsx` — PM Queue (1,571 lines)
- `src/app/invoices/qa/page.tsx` — QA Queue
- `src/app/invoices/payments/page.tsx` — Payment tracking
- `src/app/invoices/liens/page.tsx` — Lien releases
- `src/app/invoices/[id]/page.tsx` — Detail / review screen (2,234 lines)
- `src/app/invoices/[id]/qa/page.tsx` — Redirects to detail

**API endpoints:**
- `src/app/api/invoices/parse/route.ts` — Single upload + parse
- `src/app/api/invoices/save/route.ts` — Save parsed result
- `src/app/api/invoices/[id]/route.ts` — GET detail + PATCH
- `src/app/api/invoices/[id]/action/route.ts` — Approve/hold/deny/QA/kick-back (489 lines)
- `src/app/api/invoices/[id]/allocations/route.ts` — Multi-cost-code split
- `src/app/api/invoices/[id]/line-items/route.ts` — Bulk-replace line items
- `src/app/api/invoices/[id]/payment/route.ts` — Schedule/mark-paid/reverse
- `src/app/api/invoices/[id]/partial-approve/route.ts` — Line-based split
- `src/app/api/invoices/[id]/dismiss-duplicate/route.ts` — Clear duplicate flag
- `src/app/api/invoices/[id]/docx-html/route.ts` — Mammoth render
- `src/app/api/invoices/batch-action/route.ts` — Bulk approve/hold/deny
- `src/app/api/invoices/import/upload/route.ts` — Bulk upload (creates batch)
- `src/app/api/invoices/import/[batchId]/parse-next/route.ts` — Sequential parse-and-update
- `src/app/api/invoices/import/[batchId]/send-to-queue/route.ts` — Promote parsed to pm_review/qa_review
- `src/app/api/invoices/import/[batchId]/bulk-assign/route.ts` — Bulk-assign job
- `src/app/api/invoices/import/[batchId]/delete-errors/route.ts` — Remove failed parses
- `src/app/api/invoices/import/[batchId]/route.ts` — Get batch summary
- `src/app/api/invoices/payments/bulk/route.ts` — Bulk payment actions
- `src/app/api/invoices/payments/batch-by-vendor/route.ts` — Vendor-grouped batch
- `src/app/api/draws/new/route.ts` — Create draw (links invoices)
- `src/app/api/draws/[id]/action/route.ts` — Submit cascades qa_approved → in_draw

**Libraries:**
- `src/lib/claude/parse-invoice.ts` — Vision prompt + JSON parse (260 lines)
- `src/lib/claude.ts` — Anthropic SDK wrapper with metering
- `src/lib/invoices/save.ts` — Single-upload save (586 lines)
- `src/lib/invoices/bulk-import.ts` — Bulk import save logic
- `src/lib/invoices/parse-file.ts` — File type dispatch (PDF/image/DOCX)
- `src/lib/invoices/duplicate-detection.ts` — Soft fuzzy duplicate match
- `src/lib/invoices/job-matcher.ts` — Multi-signal job matching
- `src/lib/invoices/file-naming.ts` — Clean filename convention
- `src/lib/invoices/corrections.ts` — `captureCorrections` for AI self-learning
- `src/lib/invoices/display.ts` — Render helpers
- `src/lib/invoice-permissions.ts` — Lock-aware role gates
- `src/lib/recalc.ts` — `recalcLinesAndPOs` (downstream budget recompute)
- `src/lib/payment-schedule.ts` — 5th/20th cutoff math
- `src/lib/activity-log.ts` — `logStatusChange`, `logActivity`
- `src/lib/notifications.ts` — `notifyRole`, `notifyUser`, `sendNotification`
- `src/lib/api/optimistic-lock.ts` — `updateWithLock`
- `src/lib/workflow-settings.ts` — Org-configurable gates

**Components:**
- `src/components/invoice-upload-modal.tsx`
- `src/components/invoice-import-modal.tsx`
- `src/components/invoice-upload-content.tsx` (777 lines)
- `src/components/invoice-import-content.tsx`
- `src/components/invoice-file-preview.tsx` — PDF/image/DOCX dispatch
- `src/components/invoice-allocations-editor.tsx` — Multi-cost-code split editor
- `src/components/invoices/InvoiceHeader.tsx`
- `src/components/invoices/InvoiceDetailsPanel.tsx` — Right-rail with audit timeline
- `src/components/invoices/PaymentPanel.tsx` — Schedule/mark-paid actions
- `src/components/invoices/PaymentTrackingPanel.tsx` — Check#/pickup/mailed

**Schema (migrations touching invoice tables):**
- `supabase/migrations/00001_initial_schema.sql:132-190` — `invoices` table (CLAUDE.md spec)
- `supabase/migrations/00013_invoice_line_items_and_co_flags.sql` — Per-line splits + CO flags
- `supabase/migrations/00015_partial_approvals_co_links_vendor_notes.sql` — Partial approval columns
- `supabase/migrations/00036_bulk_invoice_import.sql` — Batch table + import statuses
- `supabase/migrations/00041_invoice_document_type.sql` — Receipt vs invoice
- `supabase/migrations/00044_parser_corrections.sql` — Self-learning capture
- `supabase/migrations/00060_align_status_enums.sql` — Adds info_requested/info_received
- `supabase/migrations/00061_transactional_draw_rpcs.sql:171-190` — qa_approved → in_draw cascade
- `supabase/migrations/00078_backfill_invoice_allocations_from_line_items.sql` — Allocation backfill
- `supabase/migrations/00096` — `invoice_allocations.org_id` denormalization (Wave-A)

**Fixtures + manual test corpus:**
- `src/app/design-system/_fixtures/drummond/invoices.ts` — Sanitized Caldwell (was Drummond) for playground
- `test-invoices/Dewberry-*` — Multi-page AIA-style invoice manual corpus
- `test-invoices/fish-invoices/*.pdf` — 45 PDFs covering full vendor variety
- `test-invoices/fish-ground-truth.csv` — Labeled ground truth for parse-quality comparison

**Tests:**
- `__tests__/invoice-permissions.test.ts` — Full status × role matrix
- `__tests__/invoice-allocations-tenant-boundary.test.ts` — Post-00096 RLS regression
- `__tests__/status-enum-alignment.test.ts` — Enum consistency
