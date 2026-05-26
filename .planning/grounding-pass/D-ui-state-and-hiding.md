# Grounded inventory — UI state, Wave 1.1-Lite original scope, what hides

**Generated:** 2026-05-26
**Source:** Live repo walk + MASTER-PLAN + design system docs + ARCHITECTURE.md
**Scope:** Three related questions — (Q1) UI state of invoice + price-intel surfaces; (Q2) Wave 1.1-Lite original scope vs current Slice-2 work; (Q3) what to hide for an internal-only launch.

Plain language. Honest. Read-only.

---

## Part 1 — UI state of the launch surfaces (invoice + price-intel)

### Verdict up-front

Invoice surfaces are **in good shape** — they're the gold-standard pattern Jake explicitly named as the template every other review surface should extend. They use Slate tokens correctly, mount the canonical `Nw*` primitives consistently, follow the Document Review pattern (file preview left, structured fields right, audit timeline at bottom), and have honest mobile responsiveness (separate card layout for mobile, table for desktop).

Price Intel surfaces are **mostly placeholder shells**. The Price Intel section root (`/price-intel`) re-exports the real Cost Intelligence dashboard (which IS a working surface — items table, cost lookup widget, recent-learnings panel). But almost every sub-route under `/price-intel/` is an `NwPlaceholderCard` rendering "Coming F5." Of 9 sub-routes, 7 are placeholders.

Finalizing the launch-surface UI is **light cosmetic work, not real rebuilds** — measured in days, not weeks. Token discipline is honest; primitives are real; mobile already works for invoice review. The actual launch surfaces are closer to done than the rest of the app suggests.

### Invoice screens audit

#### `/invoices` — All-invoices list (`src/app/invoices/page.tsx`, 851 lines)

- **Design system:** Slate tokens throughout. `var(--bg-card)`, `var(--text-primary)`, `var(--border-default)`, `var(--nw-stone-blue)`. JetBrains Mono eyebrow at 0.14em UPPERCASE. Space Grotesk for h2 headings at weight 500 (NOT 600 per TD-26 fix). No hardcoded hex anywhere I checked. Inline style attributes used for the heading display elements but referencing CSS vars (acceptable per token discipline; not a hex literal).
- **Primitives:** Real `NwButton`, `NwBadge`, `NwMoney`, `EmptyState`, `SkeletonList`, `SkeletonStatCard`, `FinancialViewTabs`. Hand-rolled `<select>` and `<input>` elements for filters (not `NwInput`), but these are inline filter chrome, not core primitives — acceptable.
- **Pattern:** This is a list page, not Document Review. Matches the "Item List with Inline Stats + Filter Rail" pattern. Stat cards at top, primary filter row, collapsible "More Filters," sortable table. Clean and consistent.
- **Mobile:** Responsive utility classes (`flex-col md:flex-row`, `grid-cols-2 md:grid-cols-4`, `md:w-48`). Table uses `overflow-x-auto min-w-[1100px]` so it scrolls horizontally on phones rather than collapsing — that's the right call for a dense data table; mobile users still want to see all columns.
- **Console TODOs / placeholders:** Zero placeholder content. Real `useEffect` fetch from Supabase, real filter state, real sort logic, real inline check-number editing, real picked-up toggle, payment-tracking sub-tab. Long file (851 lines) but no dead code.

#### `/invoices/[id]` — Invoice review (`src/app/invoices/[id]/page.tsx`, ~1500 lines)

- **Design system:** Slate tokens correctly applied (`var(--bg-card)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--text-tertiary)`, `var(--nw-stone-blue)`, `var(--nw-danger)`, `var(--nw-success)`). One small loading spinner uses `rgba(91,134,153,0.3)` literal for the inactive ring color — that's the same pattern called out in TD-B2b-RGBA-CLEANUP for `client-combobox.tsx` (the hex equivalent of stone-blue at 30% opacity); the hook's HEX_HITS regex catches `#hex` but not `rgba()` form. Low blast radius, but consistent with the pattern Jake's already flagged as cleanup-worthy.
- **Primitives:** Real `NwButton`, `NwEyebrow`, `AppShell`, `InvoiceFilePreview`, `InvoiceAllocationsEditor`, `PaymentPanel`, `PaymentTrackingPanel`, `InvoiceHeader`, `InvoiceDetailsPanel`. The page is heavily decomposed — most heavy lifting lives in extracted child components under `src/components/invoices/`. That's the "broken into reusable parts" posture and it shows.
- **Pattern:** This IS the gold-standard Document Review template. File preview on the left (`InvoiceFilePreview`), structured fields right-rail (`InvoiceDetailsPanel` + `InvoiceAllocationsEditor`), audit timeline below (status_history rendering). Every other review surface — proposals, draws, lien releases, change orders — is meant to extend this layout.
- **Mobile:** Uses `max-w-[1600px]` shell + `px-4 md:px-6 py-8` for spacing. Modals are full-width on mobile (`px-4` outer padding on backdrop, `max-w-md` on dialog). Touch-targets on quick-approve buttons sized via `NwButton size="md"` which renders at ~44px height. Mobile responsiveness ranges from "works fine" to "needs the W-1.1 polish pass" (touch-target audit, pinch-zoom on PDF preview — already enumerated in the Wave 1.1 expansion doc).
- **Console TODOs / placeholders:** None on the main happy path. A handful of `eslint-disable-next-line @typescript-eslint/no-explicit-any` comments mark known-shape-but-not-yet-typed PostgREST returns. No "coming soon" badges, no commented-out blocks.

#### `/invoices/queue` — PM Queue (`src/app/invoices/queue/page.tsx`, 1571 lines)

- **Design system:** Slate tokens throughout. `text-[color:var(--text-primary)]`, `bg-[var(--bg-subtle)]`, `border-[var(--border-default)]`. Some `rgba(91,134,153,...)` literals for hover-tint backgrounds (same pattern as TD-B2b-RGBA-CLEANUP). Hex codes for the special accent on selected-row tinting use the form `rgba(91,134,153,0.08)` which is `--nw-stone-blue` at 8% opacity by coincidence; should consolidate to a token but works visually.
- **Primitives:** Real `NwButton`, `NwBadge`, `NwMoney`, `SkeletonList`, `EmptyState`, `Textarea`. Filter chrome is hand-rolled `<select>`/`<input>` again — same pattern as `/invoices`.
- **Pattern:** Two-view layout — mobile card-stack OR desktop table, toggled by `md:hidden` / `hidden md:block`. Floating batch-action bar (fixed-position bottom) when selections are made. Toasts top-center. Three confirmation modals (hold-note, deny-note, batch-approve-confirm with eligible/excluded split).
- **Mobile:** Real card-based mobile layout — not a desktop layout shrunk into a phone. PMs reviewing invoices on their phones get a real mobile experience (vendor name + amount header, badges row, missing-data alerts, PM name footer, Quick Approve as full-width primary CTA on the card). The PM mobile use-case is explicitly addressed.
- **Console TODOs / placeholders:** None. Real workflow-settings gate (batch-approval-enabled, quick-approve-enabled with confidence threshold, require-invoice-date / require-budget-allocation / require-PO-linkage / duplicate-detection / over-budget-requires-note). Real PM self-filter (only PM-on-own-jobs sees an invoice).

#### Remaining invoice routes
- **`/invoices/qa`** (accounting QA queue) — same pattern as `/invoices/queue` with accounting-specific gates.
- **`/invoices/[id]/qa`** — accounting-specific QA detail view.
- **`/invoices/payments`** — payment tracking with check-number entry, mailed-date, picked-up toggle.
- **`/invoices/liens`** — lien-release coordination view.
- **`/financials/bills`** — re-exports `/invoices/page.tsx` (canonical URL per Bills/Pay Apps terminology rename in D-051).
- **`/financials/bills/[id]`** — re-exports `/invoices/[id]/page.tsx`.

All consistent with the patterns above.

### Price-intel screens audit

#### `/price-intel` (root — `src/app/price-intel/page.tsx`)

- **What it does:** Re-exports `/cost-intelligence/page.tsx`. The actual Price Intel surface is the Cost Intelligence hub.

#### `/cost-intelligence` (the real surface)

- **Design system:** Slate tokens; real `NwEyebrow`, `NwBadge`, `NwMoney`, `Card`. Uses `items-grouped-table` component, `cost-lookup-widget`, `recent-learnings-panel`. All custom but built from primitives.
- **Pattern:** Hub-style overview with grouped-table (by category / vendor / job), cost lookup widget, recent-learnings panel, pending-verification + pending-conversions counts.
- **Mobile:** Less responsive than invoice surfaces — the grouped table renders the same way at all viewports and may overflow on mobile. Acceptable for desktop-primary accounting workflow; will need a mobile pass before PMs use it on phones.
- **Console TODOs:** None visible. Real fetch from `items` table + `vendor_item_pricing` + `document_extraction_lines` + `unit_conversion_suggestions`.

#### `/price-intel/anomaly-review`, `/cost-database`, `/bid-comparison`, `/material-orders`, `/vendor-performance`, `/selections-catalog`, `/verification` — ALL PLACEHOLDERS

Every one of these renders `NwPlaceholderCard` with `wave="F5"`. They display nothing real. Example: `/price-intel/anomaly-review/page.tsx` is 20 lines total, rendering:

```
Eyebrow:  Price Intel · Anomaly Review
Headline: Cost anomaly review queue
Body:     Bills flagged by Price Intel for unusual cost vs historical rate,
          vendor performance dispute, or scope-creep markers.
Badge:    Coming F5
```

#### Working sub-routes under `/cost-intelligence/*`
- `/cost-intelligence/conversions` — real
- `/cost-intelligence/items` — real
- `/cost-intelligence/items/[id]` — real
- `/cost-intelligence/lookup` — real
- `/cost-intelligence/scope-data` — real
- `/cost-intelligence/codes` — real
- `/cost-intelligence/suggestions` — real
- `/cost-intelligence/verification` — real

**The duality:** `/cost-intelligence/*` paths render real content. `/price-intel/*` paths (except the root re-export) render placeholders. There's a 308-redirect from `/cost-intelligence` → `/price-intel` per Stage 1.5c IA Plan 1, so a user clicking "Price Intel" in the nav lands on the working dashboard. But if the launch nav links direct users into `/price-intel/anomaly-review` or `/price-intel/bid-comparison`, they'll see "Coming F5" placeholders.

### UI debt that touches THESE screens

From MASTER-PLAN §11 TECH DEBT REGISTRY:

| TD entry | Touches invoice/price-intel? | Effort |
|---|---|---|
| **TD-B2b-RGBA-CLEANUP** | Indirectly. The `rgba(91,134,153,...)` literal pattern lives in `client-combobox.tsx` (used in invoice header for client assignment via `ClientCombobox`). Also recurs in `/invoices/[id]/page.tsx` loading spinner + `/invoices/queue/page.tsx` selected-row tint. | TRIVIAL — single-line replacement × 4-6 sites with `color-mix(in srgb, var(--nw-stone-blue) Npercent, transparent)` OR introduce a `--nw-tint-stone-08` token. ~20 minutes total. |
| **TD-1.5a-followup-1** | Same `rgba()` pattern across 7 design-system pages (NOT invoice routes directly, but same regex family). | SMALL — bundled with TD-B2b cleanup. Token introduction handles both. |
| **TD-WE-01** (Tailwind arbitrary breakpoint `min-[360px]:` not compiling) | Affects logo placement in nav-bar (which sits on every authenticated surface including invoice routes). Currently the wordmark span renders `display: none` at all viewports due to the breakpoint not compiling. | SMALL — replace `min-[360px]:` with named breakpoint `sm:` (640px) OR investigate Tailwind v3.4.1 regression. ~15 minutes. |
| **TD-WE-02** (logo placement design-vs-implementation mismatch) | Same nav-bar; doesn't break anything but CLAUDE.md said "top-right" while implementation has it at "top-left." CLAUDE.md was already corrected to "top-left" per the 2026-05-15 update at line ~340; implementation was always correct. | TRIVIAL — already resolved in docs per CLAUDE.md update; no code action. |
| **TD-WE-03** (lien-releases + pay-apps empty-state) | Not invoice/price-intel directly; touches Financials. | SMALL — add `<EmptyState>` wrapper. |
| **TD-B1abis-03** (ClientCombobox token polish) | Used in invoice review for client assignment. F1 untokenized `boxShadow` + F2 inline `style={fontFamily, color}`. | TRIVIAL — replace inline shadow + style with utility classes. ~10 min. |
| **NwButton TD-20 lag** | Search shows no remaining hand-rolled approve/reject buttons on invoice screens — they use `NwButton` consistently. | DONE — no remaining lag. |

**Net debt touching the launch surfaces:** small. ~30-60 minutes of rgba consolidation across `/invoices/*`, plus ~15 min on the nav-bar `min-[360px]:` breakpoint fix, plus ~10 min ClientCombobox token polish. Under an hour of cosmetic work.

### Mobile + desktop posture

Honest breakdown:

- **Invoice list on mobile (`/invoices`):** WORKS. Stat cards stack 2×2; filter row collapses vertically; table scrolls horizontally with `min-w-[1100px]`. The dense data table is intentionally desktop-optimized — PMs reviewing on phones typically use `/invoices/queue` instead, which has a real mobile card layout.
- **Invoice review on mobile (`/invoices/[id]`):** WORKS WITH ROOM FOR THE WAVE-1.1 POLISH ALREADY ENUMERATED. Touch targets are mostly via `NwButton` (which renders ≥44px). Modals are mobile-friendly. The file preview component (`InvoiceFilePreview`) is the surface most likely to need the pinch-zoom + responsive-PDF work called out in the Wave 1.1 expansion doc. Today: usable but not yet polished.
- **Invoice review on desktop:** WORKS. This IS the gold-standard pattern. File preview left, structured fields right-rail, audit timeline below. Approve/reject/kickback buttons primary CTAs; secondary actions visible.
- **PM Queue on mobile (`/invoices/queue`):** WORKS WELL. Real mobile card-stack layout (not a shrunk table). Quick-approve as full-width CTA. Batch selection works on touch via the 44×44 checkbox label wrapper. Floating batch-action bar pinned bottom. This is explicitly the surface designed for PMs reviewing on phones.
- **Cost Intelligence hub on mobile:** PARTIAL. The grouped table doesn't have a mobile-specific layout. Will need a pass if Diane uses it on her phone, but Diane is desktop-first, so likely not blocking for internal launch.
- **Price Intel placeholder routes on mobile:** RENDER CORRECTLY (the `NwPlaceholderCard` is responsive) but the CONTENT is "Coming F5." Hide them per Part 3.

### Rough finalization estimate

**Light cosmetic polish, NOT real rebuild.** The launch-surface UI is closer to done than the rest of the app suggests. Honest estimate:

1. RGBA cleanup across invoice surfaces + ClientCombobox + design-system pages (TD-B2b + TD-1.5a-followup-1 + TD-B1abis-03 bundled): ~1 hour.
2. Nav-bar `min-[360px]:` breakpoint fix (TD-WE-01): ~15 minutes.
3. Invoice review file preview mobile polish (pinch-zoom, pan, responsive sizing) — the named Wave 1.1 polish item: ~half day to one day of focused work, depending on whether the existing PDF.js setup needs surgery or just CSS.
4. PM Queue touch-target audit (already mostly correct via NwButton; verify on Chrome DevTools iPhone emulation): ~30 minutes.
5. Cost Intelligence hub mobile pass (only if Diane uses it on her phone — not blocking internal launch): ~2-4 hours.

**Total: well under a week of focused UI work to get the launch surfaces feeling finished.** That assumes feature-flagging hides the placeholder routes (Part 3) and nobody adds new functional scope.

The biggest unknown is the invoice file preview mobile work — could be quick (CSS only) or could be a real spike (PDF.js pinch-zoom integration). The Wave 1.1 expansion doc §8 R3 already flagged this risk and recommended a spike before commitment.

---

## Part 2 — Wave 1.1-Lite original scope

### What "Lite" was supposed to cut (per disk)

The canonical reference is `.planning/architecture/ARCHITECTURE.md` lines 169-171. Verbatim:

> ### Wave 1.1-Lite (per D-049)
>
> Subset of Wave 1.1 polish that Ross Built can use immediately post-F6. Excludes large-blast items deferred to Wave 1.1-Full. Cosmetic TDs from 1.5c deferred backlog (TD-21/22/23/24/27/28 per D-056) land here when real backend exists.

MASTER-PLAN D-049 (line 293) states:

> D-049 | 2026-05-04 | Wave 1.1 split into 1.1-Lite + 1.1-Full | Cosmetic TDs from 1.5c deferred backlog (TD-21/22/23/24/27/28 per D-056) land in 1.1-Lite when real backend exists.

MASTER-PLAN line 464 (NEXT PLANNED WORK §12):

> Stage 3a — Wave 1.1-Lite (RB usable per D-049):
> - Subset of Wave 1.1 polish that Ross Built can use immediately post-F6
> - Cosmetic TDs from 1.5c deferred backlog (TD-21/22/23/24/27/28 per D-056) land here when real backend exists

CLAUDE.md (line ~310):

> Wave 1.1-Lite — RB usable post-F6; cosmetic TDs from 1.5c backlog land here

That's the **entire on-disk definition of Wave 1.1-Lite.** It is deliberately vague — "subset of Wave 1.1 polish RB can use post-F6, cosmetic TDs that defer until real backend exists." It does NOT enumerate specific deliverables.

### What "Lite" was supposed to KEEP

The longer Wave 1.1 expansion document (`wave-1.1-invoice-approval-EXPANDED-SCOPE.md`, dated 2026-04-29) is the most concrete authored scope. Its stated scope (Jake's words):

> "Polish invoice approval and ship to Ross Built for real Drummond use. Make it bulletproof and mobile-friendly."

Recommended phase scope from §7 (eight items):

1. Migrate invoice approval flow to F2's `transitionEntity` + `approval_chains` framework
2. Mobile-first invoice review (touch targets, file preview pinch-zoom, primary CTAs)
3. Bulletproof intake (idempotency middleware, duplicate detection, AI parse retry)
4. Real Drummond data flowing (after F4 back-import)
5. Owner-visible PM approval status (status_history `client_visible` flag — design for portal precursor)
6. Notification fan-out tightening (per-role defaults; reduce 13-per-invoice noise)
7. HTTP integration tests for top-5 invoice routes
8. Production rollout staged 24h

Out of scope (deferred):
- Bulk approve → Wave 1.2 (but it actually shipped in `/invoices/queue` already — batch-action bar)
- Approval delegation UI → Wave 3
- Email-intake invoice ingestion → Wave 3
- Multi-attachment invoice splitting → Wave 1.2
- Mobile-first AI correction loop → Wave 1.2
- Per-org notification preferences UI → Wave 3
- **Owner-portal invoice viewer → Wave 3**
- Cross-tenant invoice export → Wave 5

**Critical observation:** The Wave 1.1 expansion doc explicitly lists "Owner-portal invoice viewer" as Wave 3 scope, NOT Wave 1.1. That's the doc that was authored 2026-04-29.

The "Lite" carve-out was Jake's call at D-049 (2026-05-04) — split the recommended scope into "what RB can use immediately post-F6" (Lite) and "remaining polish with larger blast radius" (Full). The "Lite" definition stayed deliberately abstract because foundation work (F1-F6) was still upstream; the actual deliverables would crystallize after the foundation landed.

### Comparison to what got built in Slice-2

| 1.1-Lite intended scope (per disk) | What Slice-2 has built | Match / drift? |
|---|---|---|
| Subset of Wave 1.1 polish RB can use immediately post-F6 | Owner Portal token model + UI (B-2a + B-2b) | DRIFT — Owner Portal is Wave 3 scope per the Wave 1.1 expansion doc |
| Cosmetic TDs from 1.5c when real backend exists | Token polish + RGBA cleanup deferred (TD-B2b-RGBA-CLEANUP, TD-B1abis-03) | MATCH conceptually — but cleanups deferred to "Wave 1.1-Lite polish wave," not actively addressed |
| Mobile-first invoice review polish | NOT ATTEMPTED in Slice-2 | NO MATCH (not built) |
| `transitionEntity` + `approval_chains` framework wiring | NOT ATTEMPTED — `approval_chains` schema still dead config | NO MATCH (deferred to F2 properly) |
| Bulletproof intake (idempotency, duplicate detection) | Duplicate detection already shipped (`is_potential_duplicate` flag in invoices); idempotency middleware F3 scope | PARTIAL pre-existing |
| Real Drummond data | F4 not yet shipped — fixture-harness-org synthetic seed instead (per Wave-D D-4) | NO MATCH (F4 deferred) |
| Owner-visible PM approval (status_history `client_visible` flag) | NOT attempted | NO MATCH |
| Notification fan-out tightening | NOT attempted | NO MATCH |
| Bulk approve as Wave 1.2 (deferred) | ALREADY SHIPPED at `/invoices/queue` (batch action bar, eligible/excluded split modal) | OVER-DELIVERED earlier than planned |
| Owner-portal invoice viewer → Wave 3 | OWNER PORTAL UI SHIPPED in Slice-2 (B-2a security + B-2b UI) | DRIFT — Wave 3 work landed in Slice-2 |

### Was the portal-first work in 1.1-Lite, or did the plan drift?

**The plan drifted.** Here's the honest reconstruction:

The Wave 1.1 expansion doc (April 2026) explicitly enumerated Owner-portal as Wave 3, NOT 1.1-Lite. The Wave 1.1-Lite intent was about polishing what RB already uses internally — invoice flow, mobile review, notification fan-out.

Slice-1 (B-D080 + B-1a + B-1a-bis + B-1b, shipped May 14-18) was **foundation work** — FK convention migration (D-080), `clients` schema split (B-1a), knowledge-graph scaffold + types pipeline + Layer 2 standards + W.1 listener (B-1b). That work IS legitimately F1-Wave-B foundation — knowledge graph + auth foundation per D-050.

Slice-2 was originally umbrella-scoped under "Wave-B Slice-2." When iter-1 plan review surfaced a NULL-leak finding in the owner-portal token model, B-2 was **split into B-2a (security foundation) + B-2b (UI read-only)**. B-2a was authored at full external-grade security rigor: composite FK invariants, `create_client_portal_invite` RPC with NULL-leak fix, 1-year token lifecycle, MANDATORY admin revocation, non-partial token-hash index, DB-backed rate limiting, `activity_log.actor_token_id` tracking. Migration 00104 + ACL hardening 00105.

This is the opposite posture from "internal-only launch for Ross Built." That security rigor makes sense for a public client-facing portal where the threat model includes adversarial token discovery, replay attacks, and rate-limit bypass. It does NOT match an internal-only launch where Diane and the PMs are the only users and they're all on the same VPN.

Where did the portal-first decision come from? Tracing the DECISIONS LOG:

- **D-044** (2026-05-04): "Magic link external access in F3" — explicitly placed external access in F3, NOT in 1.1-Lite.
- **D-049** (2026-05-04): Wave 1.1 split into Lite + Full. No portal mention.
- **F1-Wave-B EXPANDED-SCOPE** (the authoritative scope for the current work): The Wave-B EXPANDED-SCOPE.md is what defined Slice-2 contents. Per nwrp200 (re-split that produced B-2a + B-2b), the Slice-2 plan-author added Owner Portal as Slice-2 scope because Wave-B IS "Knowledge Graph Schema + Auth Foundation" per D-050 — and the owner-token auth model IS an auth surface, so it nominally belongs under F1's auth-foundation umbrella.

That's the route the drift took: the Owner Portal token model is technically an "auth foundation" deliverable, so it slotted under F1-Wave-B; once it was in F1, the UI naturally followed in B-2b; once the UI was real, the security rigor was non-negotiable because tokens are anon-authenticated.

**No D-### decision explicitly authorized "build the Owner Portal in Slice-2."** It happened by aggregation — F1-Wave-B is auth foundation; owner tokens are auth; owner tokens need a UI; UI needs full security rigor. By the time anyone questioned it, B-2a was shipped (2026-05-22) and B-2b followed within hours.

The Wave 1.1 expansion doc's intent — "polish what RB uses internally, ship to RB for real Drummond use" — was lost in the foundation-work focus. The current state (per nwrp222 / nwrp223): GATE B-4 signed, B-5/B-6/B-7 paused for grounding pass to decide whether to continue down the portal-first path or pivot to internal-operator surfaces (Diane + PMs).

The grounding pass IS the course-correction. Jake's framing per nwrp223: "the real target is a deployed, vigorously-tested, internally-usable Nightwork for Ross Built, scoped to INVOICE PROCESSING + PRICE INTELLIGENCE as the working core, with everything not needed HIDDEN."

That's the original Wave 1.1-Lite intent restated. Portal-first was the drift; invoice + price-intel + hide-the-rest is the recovery.

---

## Part 3 — What hides for internal launch

### Owner portal

- **Routes:**
  - `src/app/owner/[token]/page.tsx` — owner dashboard (B-2b ship)
  - `src/app/owner/[token]/pay-apps/[id]/page.tsx` — pay-app acknowledgment page
  - `src/app/owner/[token]/pay-apps/[id]/AcknowledgePayAppButton.tsx` — acknowledge action
  - `src/app/owner/layout.tsx` — owner standalone layout (no auth shell)
  - `src/app/owner/error.tsx` + `src/app/owner/not-found.tsx`
- **API:**
  - `src/app/api/owner-portal/acknowledge-pay-app/route.ts`
  - `src/app/api/owner-portal/admin/revoke-token/route.ts`
- **Recent ship:** B-2a (security foundation, 2026-05-22) + B-2b (UI, 2026-05-22)
- **Hide candidate:** YES, but nuanced. The owner portal is the client-facing surface. For an internal-only Ross Built launch, homeowners aren't users — Diane and the PMs are. The token model and admin-revoke route are CORRECT to ship (they fence against accidental external access), but the `/owner/[token]/*` routes shouldn't be linked from anywhere in the internal nav.
- **Reality check:** Owner portal routes are NOT in the internal nav (nav-bar.tsx has no `/owner` links). The `PUBLIC_PATHS` in `src/middleware.ts` exposes `/owner` so anon tokens can resolve, but discovery requires the token — homeowners can't browse to it without the link. So the routes are functionally hidden for internal users by default; nobody clicking through the internal nav will land there.
- **Hiding mechanism:** Already hidden by absence from nav. The remaining question is whether to:
  - **Option A:** Leave the routes live, mounted, working. Anon-token paths are inert without a valid token; internal users never see them. This is the lowest-effort path.
  - **Option B:** Add a feature-flag-gated middleware check that disables the entire `/owner/*` and `/api/owner-portal/*` surface unless a `NEXT_PUBLIC_OWNER_PORTAL_ENABLED=true` env var is set. Production deploy can default to OFF until the portal is intentionally launched.
  - **Recommendation:** Option B. Cheap insurance — if an `INSERT INTO client_portal_access` ever runs in production by accident (e.g., someone testing the admin grant flow), the routes 404 instead of serving a working portal page. Trivial to flip when the portal IS ready to launch externally.

### Partial / half-built F2-F5 surfaces

Routes that exist but render placeholders for future foundation work, per the grep:

**Admin section (F2/F3 placeholders):**
- `/admin/approval-workflows` — "Coming F3"
- `/admin/integrations` — "Coming F3"
- `/admin/notification-rules` — "Coming F3"
- `/admin/org-chart` — "Coming F2"
- `/admin/permissions` — "Coming F2"
- `/admin/roles` — "Coming F2"
- `/admin/templates` — "Coming Wave 3"
- `/admin/workflow-customization` — "Coming F3"

**Company section (mostly Wave 2 + F4):**
- `/company/capacity-planning` — "Coming Wave 3"
- `/company/cash-flow` — "Coming F4"
- `/company/compliance` — "Coming Wave 2"
- `/company/documents` — "Coming Wave 2"
- `/company/expenses` — "Coming F4"
- `/company/fleet-equipment` — "Coming F4"
- `/company/insurance` — "Coming Wave 2"
- `/company/p-l` — "Coming F4"
- `/company/permits-licensing` — "Coming Wave 2"
- `/company/tax` — "Coming Wave 4"
- `/company/time-tracking` — "Coming F4"

**Pipeline section (Wave 4 placeholders):**
- `/pipeline/bids-out` — "Coming Wave 4"
- `/pipeline/contracts` — "Coming Wave 4"
- `/pipeline/estimates` — "Coming Wave 4"
- `/pipeline/leads` — "Coming Wave 4"
- `/pipeline/proposals` — "Coming Wave 4"

**People section (F2):**
- `/people/clients` — "Coming F1" (clients real backend now exists post-B-1a/B-1a-bis; this placeholder is stale and could go live)
- `/people/org-chart` — "Coming F2"
- `/people/team` — "Coming F2"

**Reports section (Wave 3):**
- `/reports/ai-builder` — "Coming Wave 3"
- `/reports/custom-builder` — "Coming Wave 3"
- `/reports/saved` — "Coming Wave 3"
- `/reports/scheduled` — "Coming Wave 3"
- `/reports/templates` — "Coming Wave 3"

**Sub-portal (F3 — external subcontractor surface):**
- `/sub-portal/page.tsx` — "Coming F3"
- `/sub-portal/magic/[token]` — "Coming F3"
- `/sub-portal/public/[token]` — "Coming F3"

**Per-job tabs (Wave 2 + F2 + F3 + F4 + F5):**
- `/jobs/[id]/warranty` — "Coming F4"
- `/jobs/[id]/to-dos` — "Coming Wave 2"
- `/jobs/[id]/time-entries` — "Coming F4"
- `/jobs/[id]/team` — "Coming F2"
- `/jobs/[id]/submittals` — "Coming F3"
- `/jobs/[id]/specs` — "Coming Wave 2"
- `/jobs/[id]/selections` — "Coming F5"
- `/jobs/[id]/rfis` — "Coming F3"
- `/jobs/[id]/punchlist` — "Coming Wave 2"
- `/jobs/[id]/pre-con` — "Coming F4"
- `/jobs/[id]/plans` — "Coming Wave 2"
- `/jobs/[id]/photos` — "Coming Wave 2"
- `/jobs/[id]/permits` — "Coming Wave 2"
- `/jobs/[id]/pay-apps` — "Coming F1"
- `/jobs/[id]/documents` — "Coming Wave 2"
- `/jobs/[id]/daily-logs` — "Coming Wave 2"
- `/jobs/[id]/closeout` — "Coming Wave 2"
- `/jobs/[id]/bills` — "Coming F1"
- `/jobs/[id]/activity` — "Coming Wave 1.1-Lite"

**Price Intel sub-routes (F5):**
- `/price-intel/anomaly-review` — "Coming F5"
- `/price-intel/bid-comparison` — "Coming F5"
- `/price-intel/cost-database` — "Coming F5"
- `/price-intel/material-orders` — "Coming F5"
- `/price-intel/selections-catalog` — "Coming F5"
- `/price-intel/vendor-performance` — "Coming F5"

**Financials sub-routes (F1):**
- `/financials/purchase-orders` — "Coming F1"
- `/financials/change-orders` — "Coming F1"

Total: **~50+ placeholder routes** rendering `NwPlaceholderCard` with future-wave badges.

### Existing scaffold routes worth highlighting

- `/today` — real content but Section 1 ("Your Day") explicitly says "Coming F3 — personalized daily plan." Sections 2 + 3 (Action Items, Activity Feed) ARE real and pull from `/api/dashboard`. So /today is half-live, half-placeholder; the placeholder section is at the TOP of the page where users land first. Consider replacing the "Your Day" card with a more useful "Today's Queues" overview pulled from invoice/pay-app data, or hiding that section until F3.
- `/draws/new` — scaffold for new-draw form; not sure of completeness without deeper read.
- `/change-orders/[id]` — exists; not sure of completeness.
- `/jobs/[id]/change-orders/new` and `/jobs/[id]/purchase-orders/new` — exist.
- `/api/proposals/[proposal_id]/convert-to-po/route.ts` — returns 501 stub per the grep (`501` token match). Internal API only.

### Feature-flag mechanism

**Does one already exist?** The grep for `NEXT_PUBLIC_FEATURE_*`, `feature_flag`, `featureFlag` returns ZERO matches in `src/`. There is no existing feature-flag library or config.

There IS a precedent for env-flag gating: `TD-WB-LISTENER-UNFLAG` documented the W.1 `onAuthStateChange` listener as env-flag-gated via `NEXT_PUBLIC_AUTH_STATE_LISTENER=true`. That's the canonical "env-var-as-feature-flag" pattern Wave-B already adopted. The pattern is read in `src/hooks/use-current-role.ts` via early-return-when-unset.

**If not, identify the minimal mechanism.** Three layers, each minimal:

1. **Env var conventions:** Define a small set of `NEXT_PUBLIC_FEATURE_<NAME>` env vars in Vercel:
   - `NEXT_PUBLIC_FEATURE_OWNER_PORTAL` — default `false`; flip to `true` when external portal launches
   - `NEXT_PUBLIC_FEATURE_PRICE_INTEL_F5` — default `false`; flip to `true` when F5 ships
   - `NEXT_PUBLIC_FEATURE_PIPELINE` — default `false`; flip to `true` when Wave 4 ships
   - `NEXT_PUBLIC_FEATURE_COMPANY` — default `false`; flip to `true` when Wave 2/F4 surfaces are real
   - `NEXT_PUBLIC_FEATURE_REPORTS` — default `false`; flip when Wave 3 reports ship

2. **Nav-bar conditional rendering:** In `src/components/nav-bar.tsx`, gate the `PRIMARY_NAV` entries on the env var. Right now lines 142-151 define an 8-entry `PRIMARY_NAV` array; filter it at build time using `process.env.NEXT_PUBLIC_FEATURE_*` checks. Example: only include `pipeline`, `company`, `reports` when their respective feature flag is `true`. The `ACCESS` role map stays as-is; the feature-flag filter happens BEFORE the role filter.

3. **Middleware redirect for direct-URL access:** Add a tiny block in `src/middleware.ts` after the existing platform_admin gate that 404s on disabled-feature paths. Pattern:
   ```
   if (pathname.startsWith("/pipeline") && process.env.NEXT_PUBLIC_FEATURE_PIPELINE !== "true") {
     return new Response(null, { status: 404 });
   }
   ```
   This handles the edge case where a user bookmarks `/pipeline/proposals` directly — they get a 404 instead of a "Coming Wave 4" placeholder. Per-feature; ~5 lines per gate.

4. **Owner portal-specific gate:** Same pattern, but applied to `/owner/*` AND `/api/owner-portal/*`. If `NEXT_PUBLIC_FEATURE_OWNER_PORTAL !== "true"`, both surfaces 404. This is the strongest hide — internal users can't accidentally land on the portal, AND if a `client_portal_access` row exists in the DB, the routes still 404 because the feature flag is off.

5. **Optional sub-route gates within nav-visible sections:** Inside `/price-intel`, hide the F5 placeholder sub-routes from the section overview cards by filtering the `PRICE_INTEL_SECTIONS` array (if it exists) or by adding badges that say "Coming F5" but don't link. Cleaner than 7 different placeholder pages.

**Total effort:** ~2 hours.
- 30 min: env var inventory + add to Vercel Production + Preview
- 30 min: nav-bar conditional filter
- 30 min: middleware redirect block
- 30 min: section-overview filtering (financials + price-intel + others)

If Jake wants this even simpler — single `NEXT_PUBLIC_INTERNAL_LAUNCH_MODE=true` env var that, when set, restricts nav to ["Today", "Jobs", "Financials", "Price Intel"] + Admin — that's a 15-minute mechanical change in nav-bar.tsx with one boolean check at the top of `PRIMARY_NAV`.

### Half-built F2-F5 surfaces NOT in placeholder cards

A few routes exist but DON'T render `NwPlaceholderCard` — they're partial real content:

- `/today` — partial real (Action Items + Activity Feed real; "Your Day" placeholder). KEEP, but possibly replace the "Your Day" card with a real launch-surface aggregate (open invoices + due pay-apps).
- `/draws/new` — exists. Status not verified; assume partial.
- `/change-orders/[id]` and `/jobs/[id]/change-orders/new` + `/jobs/[id]/purchase-orders/new` — exist. The Financials section overview marks `/financials/change-orders` and `/financials/purchase-orders` as "Coming F1" (org-wide list), but the job-scoped CO/PO forms exist. Inconsistency.
- `/operations` — exists at root. Status unknown without deeper read; possibly a remnant from earlier IA.

These are minor.

### Existing scaffold routes (501 / coming-soon NOT in placeholder cards)

From the grep:
- `src/app/api/proposals/[proposal_id]/convert-to-po/route.ts` — appears to return 501 stub (internal API; not a user-visible route)
- `src/app/api/change-orders/[id]/route.ts` — exists; status uncertain
- `src/app/api/draws/[id]/export/route.ts` — exists; status uncertain
- `src/app/api/stripe/webhook/route.ts` — exists; tied to billing which is "Coming Wave 1 billing" per TD entries

Internal APIs aren't a user-facing concern for the launch; they don't need feature-flag-hiding.

---

## Honest verdict on what hides

**Hide the owner portal explicitly behind a feature flag. Hide the placeholder F2-F5 / Wave 2 / Wave 3 / Wave 4 routes from the nav-bar via env-var-gated `PRIMARY_NAV` filtering. Ensure direct-URL access to disabled-feature sections returns 404 via a small middleware block. Mechanism: env-var feature flags + nav-bar conditional filter + middleware redirect. Effort: ~2 hours total.**

The nav for internal Ross Built launch should be: **Today | Jobs | Financials | Price Intel | (Admin dropdown for power users)**. Everything else — Pipeline, People, Company, Reports — gets feature-flagged OFF until those waves ship.

That cuts the 8-entry top nav to 4 entries, hides ~50 placeholder routes from the user's discovery path, and protects the owner portal from accidental exposure. The system feels COMPLETE at reduced scope because users only see surfaces that work.

The owner portal is the load-bearing example. It's beautiful, security-rigorous, audit-logged, rate-limited — and it shouldn't be reachable from the internal nav. A `NEXT_PUBLIC_FEATURE_OWNER_PORTAL=false` env var in Production + Preview, paired with a middleware 404 on `/owner/*` and `/api/owner-portal/*` when the flag is off, is cheap insurance that the portal stays parked until external launch is the explicit goal.

There's a nuance worth flagging: **the cost of hiding is way less than the cost of having built the wrong things.** The owner portal IS built. It IS secure. It IS audit-logged. Hiding it doesn't waste that work — it parks it until the launch posture justifies exposing it. The B-2a/B-2b investment carries forward; what changes is when the surface is reachable. That's the difference between "build the right thing" (impossible to know in advance) and "ship the right subset of what's built" (which is exactly what the grounding pass + feature-flag hiding enables).
