# Design handoff — import inventory & provenance

**Source:** Claude Design project **"Construction Invoice Redesign"** — `https://claude.ai/design/p/3be86e57-60da-4e42-8fb1-398525ca8fd8` (owner: Jake).
**Imported:** 2026-07-15 via the `DesignSync` MCP (`/design-login` scope).
**This pass implements ONLY screen 02 (Invoice Review).** The rest is imported for reference/future propagation.

The two BINDING artifacts required by the handoff task are both present in `README.md`:
- **(a) Label → status map** — `## Label → status map` section.
- **(b) Allocation grid — Excel interaction spec** — `## Allocation grid — Excel interaction spec` section.

## Full project inventory

| Project path | Kind | Mirrored to git here? | Note |
|---|---|---|---|
| `README.md` | spec | ✅ yes | The binding handoff spec (both binding artifacts). |
| `02 Invoice Review.dc.html` | frame | ✅ yes | **The reference screen** — this pass's target. |
| `02 Variations.dc.html` | frame | ✅ yes | Design-exploration variants (Budget/PO-remain column studies). Canonical = `02 Invoice Review`. |
| `Nav.dc.html` | frame | ✅ yes | Shared top nav (imported by 02 via `<dc-import name="Nav">`). |
| `support.js` | runtime | ✅ yes | dc-runtime (loads React/ReactDOM/Babel from unpkg). Needed to render locally. |
| `_ds/…/colors_and_type.css` | tokens | ✅ yes | Slate palette + type + component classes. |
| `_ds/…/nextjs/app/globals.css` | tokens | ✅ yes | Tailwind base + shadcn HSL bridges. |
| `_ds/…/_ds_bundle.js` | runtime | ✅ yes | DS component bundle + DCLogic. Needed to render locally. |
| `01 Invoices.dc.html` | frame | ⛔ not yet | Queue/landing. In claude.ai project; pull on demand for propagation. |
| `03 Upload Invoice.dc.html` | frame | ⛔ not yet | Upload modal (3 modes). |
| `04 Draws.dc.html` | frame | ⛔ not yet | Draw list. |
| `05 Draw Wizard.dc.html` | frame | ⛔ not yet | Create-draw wizard (G703 grid). |
| `06 Draw Detail.dc.html` | frame | ⛔ not yet | Pay app G702/G703. |
| `07 Job.dc.html` | frame | ⛔ not yet | Job overview + new-job drawer. |
| `08 Cost Codes.dc.html` | frame | ⛔ not yet | Settings › cost codes. |
| `* -print-*.dc.html` (×8) | print frames | ⛔ not yet | Print-CSS variants of each screen. |
| `_ds/…/README.md`, `_adherence.oxlintrc.json`, `_ds_manifest.json` | DS meta | ⛔ not yet | Design-system metadata. |
| `uploads/nw design pages/1–8.PNG` | screenshots | ⛔ cannot (cap) | Rendered page screenshots. `get_file` caps at 256 KiB → larger PNGs truncate to a corrupt image. Not mirrorable via DesignSync read. |
| `uploads/draw-*.png` | screenshot | ⛔ cannot (cap) | Same 256 KiB-cap limitation. |

## Why the invoice-review set only (this pass)

The handoff task scopes this pass to **one screen** ("prove it, then we decide propagation") under a tight budget ("bank-don't-squeeze"). The full binding spec (`README.md`) + everything needed to render, audit, and build **screen 02** is mirrored to git and durable. The other 7 screens + print variants + DS metadata serve **future** propagation passes (explicitly out of scope now) and remain in the durable claude.ai project — pull on demand with `DesignSync get_file`. The PNG screenshots are un-mirrorable via the DesignSync read path (256 KiB cap truncates them); the `.dc.html` frames are the authoritative source and render faithfully.

## Local render

`support.js` + `_ds_bundle.js` load React 18.3.1 / ReactDOM / Babel from `unpkg.com`, so any `.dc.html` renders in a real browser. The dc extension refuses `file://`; serve the dir over localhost instead:

```
node <scratchpad>/handoff-server.js "<repo>/design_handoff_redesign" 4600
# → http://localhost:4600/02%20Invoice%20Review.dc.html
```

## Adjudicated mockup deltas (mockup ↔ reality, ruled by Jake)

- **Screen 7 (`07 Job.dc.html`) new-job DRAWER is SUPERSEDED — job creation uses the centered `PopModal`, not a side drawer** (Jake live ruling, 2026-07-15). The app has ONE overlay language and it is centered (upload + review + new-job are all centered `PopModal`); the slide-over is retired for the job-creation surface. The mockup's `07` drawer render is a stale container choice — the fields/reduction it implies still apply, but the container does not. Surface #2 of the new design language uses the shared `.nw-redesign` token scope. See `src/components/new-job/NewJobModal.tsx`.

### Screen 02 (Invoice Review) — Stage-1 modal-chrome deltas (ratified 2026-07-16)

- **Prev/next numeric stepper OMITTED.** 02's header stepper ("‹ 2 / 3 ›") navigates an invoice list the review page doesn't hold — rendering it would be fiction (F2). Ratified out for Stage 1; **propagation-pass candidate: the Phase-B auto-advance build** (list-context navigation through the queue). ESC/close → `/financials/bills` ships instead.
- **Zoom control lives inside the real viewer, not the pane header.** 02's source-pane header carries a −/%/+ width-zoom for its fake paper render. The app renders the REAL document (react-pdf zoom stack, image click-to-zoom, DOCX expand), which owns its zoom/expand/download controls; duplicating them in the pane header would be dead chrome. Pane header carries: `Source document` eyebrow · Stamped/Original toggle (real `stamped_file_url`) · `Open ↗`.
- **No fake ink stamps on the document** (adjudicated pre-session, recorded here). 02's "PM REVIEWED" / "APPROVED FOR PAYMENT" ink-stamp overlays belong to the future stamp-into-archived-PDF pipeline (README "Approval stamps"). The real stamped-copy feature (`stamped_file_url` + Stamped/Original toggle) covers today's need; the page's old fake rotated "QA APPROVED" overlay was REMOVED in Stage 1.
- **PO / CO match renders READ-ONLY** (adjudicated pre-session). 02's searchable Matched-to combobox implies a PO/CO re-match write path that isn't built; Stage 1 shows the real linkage (PO chip + reference / CO chip / "No PO / CO — direct to budget") as a read-only block.
- **Retainage deferred** (adjudicated pre-session). RB holds no retainage; the RET-100 injected-line model waits for the per-job contract option.
- **AI flag "Clear" buttons omitted.** No flag-clear API exists; the footer AI popover lists flags read-only (strikethrough + CLEARED rendering only once the invoice is final-approved).
- **QA-stage primary is labeled "Approve"** (mockup-faithful). The stage is communicated by the header pill ("Final review"); the handler is the existing QA-approve, untouched.
