# Ingestion Architecture (canonical)

**Locked:** 2026-05-04 (Stage 1.5c)
**Source:** Principle 5 ([ARCHITECTURE.md](./ARCHITECTURE.md)) + nwrp43 multi-modal ingestion + EXPANDED-SCOPE Part 5

This document is canonical. F3 reads it before wiring email-in + magic-link forms; Wave 3 reads it before wiring voice/video AI extraction.

Cross-references:
- [ARCHITECTURE.md](./ARCHITECTURE.md) §1 Principle 5 + §6 phase plan
- [ENTITY-INVENTORY.md](./ENTITY-INVENTORY.md) — multi-modal ingestion lands rows in these tables
- [WORKFLOW-INTELLIGENCE.md](./WORKFLOW-INTELLIGENCE.md) WI-038 (multi-modal punchlist ingestion per D-069)
- CLAUDE.md "Invoice Parse Schema (Claude Vision Output)" — existing invoice AI pattern

---

## 0. Purpose

Multi-modal ingestion is Principle 5: voice / video / photo / form fill / paste / scanner / email-in all route to the same entity layer (per [ENTITY-INVENTORY.md](./ENTITY-INVENTORY.md)). Same schema, different sources. The user does the work; the system extracts structure.

Aggressive ingestion across modalities is a moat: every ingestion event is a cross-pollination opportunity (Principle 4 — ONE event, MULTIPLE entities updated).

---

## 1. Modality matrix

| Modality | F-N when wired | Source examples | AI extraction needed? | Lands in entities |
|----------|----------------|-----------------|----------------------|-------------------|
| **Email-in** | F3 (basic) → Wave 3 (full AI routing) | `accounting@rossbuilt.com` invoice arrivals; sub-vendor proposals | yes (Claude Vision per existing pattern) | Bills + Vendors + Cost Codes + Documents |
| **Magic-link form fill** | F3 | Sub responds to RFI; sub uploads lien release; architect submits submittal | partial (form fields structured) | RFIs + Submittals + Lien Releases + Documents |
| **Scanner / file upload** | Wave 1 (existing — partial) | Diane scans paper invoices; PM uploads photos | yes (Claude Vision per existing) | Bills + Photos + Documents |
| **Form fill (in-app)** | Wave 1 (existing) | PM fills out daily log form; PM creates to-do | no (structured input) | Daily Logs + To-Dos + Punchlist + RFIs |
| **Voice (transcript)** | Wave 3 | PM speaks daily log into phone; PM dictates punchlist while walking site | yes (transcription + AI entity routing per WI-038/D-069) | Daily Logs + Punchlist + Photos + To-Dos |
| **Video (with voice)** | Wave 3 | PM walks site filming; voice describes; AI extracts entities (room + vendor + description + due date + photo) | yes (multi-modal AI per WI-038/D-069) | Punchlist + Photos + Daily Logs + Rooms |
| **Photo (standalone)** | Wave 2 | PM snaps photo of progress / defect | partial (geo + timestamp + AI category) | Photos + Daily Logs + Punchlist |
| **Paste / clipboard** | Wave 1 (existing — partial) | Diane pastes vendor list from Excel | partial (column inference) | Vendors + Cost Codes (bulk) |
| **API integration** | Wave 5 | QuickBooks bills sync; Procore handoff; Buildertrend bridge | no (structured) | Bills + Vendors + Jobs (via mapping layer) |
| **Realtime UI events** | Wave 1 (existing) | PM clicks Approve; status change | no (UI-driven) | activity_log + status_history (all entities) |

---

## 2. Cross-pollination contract (Principle 4)

ONE ingestion event → MULTIPLE entities updated. Implementation:

1. **Single transaction** wraps the fanout (Postgres TX or Inngest function with rollback).
2. **Idempotency key** = source_id + source_type (per D-008 imports idempotent).
3. **Audit-log row written FIRST** (activity_log entity_type + action), then entity-write fanout.
4. **Cross-entity validators run AFTER fanout** but BEFORE commit (WI-001..WI-039 patterns).
5. **Cross-pollination targets** (declarative — defined per ingest type):
   - **Bill arrives** → bill row + vendor.last_invoiced_at + budget_line.committed_to_date + cost_code.price_per_unit_history + price_intel.observation + activity_log row
   - **Daily log written** → daily_log row + linked photos + linked punchlist items + activity_log row + WI-010 validator check (daily-log-invoice-validation)
   - **Photo uploaded** → photo row + daily_log link (if voice context) + punchlist link (if voice context) + activity_log row + WI-012 validator (photo-evidence-requirement)
   - **RFI responded** → rfi.status_history update + submittal link (if applicable) + activity_log row + WI-033 validator (CO-requires-RFI-before-invoicing)

---

## 3. AI extraction patterns

### 3.1 Existing pattern: Invoice parse (Claude Vision)

Per CLAUDE.md "Invoice Parse Schema (Claude Vision Output)" — invoice file → Claude Vision API → structured JSON:

```json
{
  "vendor_name": "string",
  "invoice_number": "string | null",
  "total_amount": "number (dollars)",
  "line_items": [...],
  "confidence_score": "0.0-1.0",
  "confidence_details": {...},
  "flags": [...]
}
```

**Confidence routing:**
- ≥ 85% → PM inbox (green, one-click approve candidate)
- 70–84% → PM inbox (yellow flag, needs review)
- < 70% → Diane triages first

**Edit tracking:** `pm_overrides` JSONB logs every PM correction (old/new values). Feeds back into AI self-learning (Phase 4 per CLAUDE.md Roadmap).

### 3.2 F3 email-in pattern (extension of 3.1)

Email arrives at `accounting@rossbuilt.com` → SES/Mailgun webhook → Inngest function:
1. Parse email envelope (`from`, `to`, `subject`, `body`).
2. Extract attachments (PDF / image / docx / xlsx).
3. Route each attachment via existing Claude Vision pipeline (3.1).
4. Email body becomes `notes` on resulting Bill entity.
5. Sender domain matched against `vendors.email` → vendor_id auto-populated (or flagged if unknown).
6. Audit log row written with `entity_type='invoice'`, `action='ingested_via_email'`.

**Idempotency:** message_id from email headers; re-running same email is no-op.

### 3.3 Wave 3 voice/video pattern (WI-038 per D-069)

PM walks site filming with voice narration → upload to mobile app → Inngest function:
1. Transcribe video voice track (Whisper or equivalent).
2. Extract video frames at intervals (e.g., 1 fps for stills).
3. AI multi-modal extraction (Claude vision + transcript):
   - Room location (from voice + visual landmarks)
   - Vendor matched against `vendors` catalog (from voice mention)
   - Item description (from voice)
   - Due date (from voice; default = end of week)
   - Photo extraction (from video frames at relevant timestamps)
4. Each extraction becomes a structured Punchlist Item row.
5. PM reviews + edits in UI (mobile review surface per PATTERNS.md Mobile Touch Approval).

**Endgame:** PM finishes a walkthrough with N punchlist items entered with zero typing. The data graph + AI advantage becomes visceral for the field user.

### 3.4 Wave 3 weekly owner update pattern (auto-generation)

System reads:
- Recent daily logs (Wave 2 ingest)
- Recent photos (Wave 2 ingest)
- Recent approved bills (Wave 1 ingest)
- Approved COs (Wave 1 ingest)
- Schedule progress (Wave 2 ingest)

Generates weekly owner email with:
- This week's progress summary (3-5 bullets from daily logs)
- Photo gallery (5-10 photos selected by AI relevance)
- Cost-plus open-book table (bills approved this week + running budget; per CLAUDE.md "Ross Built is cost-plus open-book")
- Upcoming milestones (schedule)
- Open punchlist items (count + 2-3 most recent)

PM reviews + edits + sends. Closes the loop with the customer (Principle 8 universal applicability).

---

## 4. Ingestion routing infrastructure

### 4.1 F3 — Inngest Cloud (per D-022)

Inngest Cloud is the managed background-job + event-routing service. Free tier sufficient for first 10 orgs; pay tier flips at first paid GA.

Functions per ingestion modality:
- `email.invoice.received` → invoice fanout
- `magic-link.rfi.submitted` → RFI fanout
- `form.daily-log.created` → daily-log fanout
- `scanner.bill.uploaded` → bill fanout (existing pattern; Inngest-wrapped in F3)

Functions are idempotent (per D-008). Retries safe.

### 4.2 F3 — Email-in receiving (basic)

Vendor: SES (AWS) or Mailgun (chosen at F3 start).
Endpoint: `accounting@rossbuilt.com` → webhook → Inngest function (4.1).

**Per-org email aliases:** F3 wires `accounting+<org_slug>@nightwork.com` aliases so multi-tenant routing works without dedicated domain per org.

### 4.3 F3 — Magic link infrastructure (per D-044)

Magic-link tokens extend `client_portal_access` (migration 00074) to subs / architects / inspectors:
- Sub responds to RFI via magic link (signed token in URL; scope-bound to RFI).
- Architect submits submittal via magic link.
- Inspector views read-only public link.

**Auth posture:** SHA-256 hashed token + service-role-API + anon-grant per migration 00074. Token expiry per `client_portal_access.expires_at`. Audit-log on every token-bound action.

---

## 5. Construction-domain specifics

### 5.1 Bill ingestion (Wave 1 existing; F3 extends)

Known Ross Built invoice formats (per CLAUDE.md):
1. **Clean vendor PDFs** — structured table, invoice #, PO ref. High confidence.
2. **T&M invoices** — daily labor entries with crew size × hours. Need to parse each line and verify total = sum of (crew × hours × rate).
3. **Simple Word/PDF invoices** — scope description + lump sum total. No line items, sometimes no invoice number. Low confidence.
4. **Photos of handwritten invoices** — lowest confidence. Route to Diane.

Confidence routing per 3.1.

### 5.2 Lien release ingestion (F1 fixes R.7; F3 adds magic-link path)

Florida 4-statute types (Conditional Progress, Unconditional Progress, Conditional Final, Unconditional Final). F1 adds `lien_releases.status_history` JSONB (R.7 fix per CURRENT-STATE A.2). F3 adds magic-link path: sub clicks email link → fills out web form → lien release filed.

### 5.3 Multi-modal punchlist (Wave 3 — WI-038/D-069)

See §3.3.

---

## 6. F1 schema design implications

When F1 starts entity-table work, ingestion routing requires:

1. **`source_type` + `source_id`** columns on every ingest-able entity (Bills, RFIs, Submittals, Daily Logs, Photos, Punchlist Items, Pay Apps).
2. **Idempotency key** column (UUID; computed from source) per D-008.
3. **`raw_payload` JSONB** column for AI extraction debugging (per CLAUDE.md `ai_raw_response`).
4. **`confidence_score` + `confidence_details`** columns per existing invoice pattern.
5. **`pm_overrides` JSONB** for edit tracking (existing on invoices; extend to other AI-extracted entities).

---

**End of INGESTION-ARCHITECTURE.md.** F3 reads this before wiring email-in + magic-link forms; Wave 3 reads it before wiring voice/video AI extraction (WI-038 / WI-039).
