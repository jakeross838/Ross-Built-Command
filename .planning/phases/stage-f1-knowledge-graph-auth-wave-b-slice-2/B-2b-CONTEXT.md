# Phase stage-f1-knowledge-graph-auth-wave-b-slice-2 — B-2b CONTEXT

**Gathered:** 2026-05-22 (lean direct authoring per nwrp209 "target ONE iter cycle"; substance well-documented in EXPANDED-SCOPE §7 plan #2 + B-2a deliverables)
**Status:** Ready for planning
**Plan ID:** B-2b (Read-only Owner Portal Path A UI + audit integration — medium threat)
**Depends on:** B-2a (SHIPPED per nwrp209 §1 — commits `fc19a2e..ee43e78` + `59459a7` ACL hardening)

<domain>
## Phase Boundary

**B-2b delivers the read-only Owner Portal Path A UI for homeowners + audit-log integration on owner-initiated actions.** It is the user-facing surface that makes B-2a's verified token-issuance security foundation usable + demoable.

Specifically: `/owner/{token}` route + standalone mobile-first layout + progress + payment status + document downloads + 1-2 owner-initiated audit-integration actions (pay-app acknowledgment via `actor_token_id`).

**B-2b ships READ-ONLY portal access** for homeowners. Token-based auth (no authenticated session), mobile-mandatory, anon-token-resolved.

**Out of scope (deferred):**
- B-2a security model (composite FK, RPC NULL-leak fix, 1-year + revocation, rate-limit, helpers, indexes, ACL hardening) — SHIPPED in B-2a
- New PATTERNS.md "Owner Status View" entry — iter-1 SYNTHESIS B-17 RESOLVED; §4h.3 (Dashboard) + §2j.3 (Document Review extension) already cover
- Full Owner Portal feature set (notifications, comments, signature workflows, ongoing engagement) → Wave 1.1-Lite
- Token lifecycle alternatives (one-shot per pay-app, auto-rotate every N days) → Wave 1.1-Lite revisit conditions
- Multi-tenant + RLS posture verification — B-2a proved BY-CONSTRUCTION at composite FK + helper layers; B-2b consumes B-2a's helpers without touching RLS surface
</domain>

<decisions>
## Implementation Decisions

### Route + layout

- **D-01:** New `/owner/{token}` route at `src/app/owner/[token]/page.tsx` — token-resolved entry. Standalone (NOT auth-redirected) per middleware PUBLIC_PATHS extension shipped in B-2a.
- **D-02:** New `/owner/{token}/pay-apps/[id]` route at `src/app/owner/[token]/pay-apps/[id]/page.tsx` — pay-app drilldown.
- **D-03:** New `src/app/owner/layout.tsx` — standalone layout, NO auth nav-bar (homeowner is anon).
- **D-04:** New `src/app/owner/error.tsx` — error boundary handling token-not-found / revoked / expired. Falls through to "link no longer valid" UX. Uses `useRouter`'s Next error pattern.
- **D-05:** Existing `src/app/owner-portal/page.tsx` (1.5c thin wrapper with Caldwell fixtures) — UNTOUCHED by B-2b. Superseded by `/owner/{token}` route at runtime via redirect or simply by not linking it from anywhere. Plan-author decides cleanup posture (could be left as Drummond-only design-system playground; or marked deprecated).

### Token resolution + data fetch

- **D-06:** ALL portal data fetches use `getScopedOwnerPortalClient(resolvedToken)` from B-2a (`src/lib/owner-portal/token.ts:185-197`). NO direct `createServiceRoleClient` or `createServerSupabaseClient` invocations in `src/app/api/owner-portal/**` or `src/app/owner/**` files. (Multi-tenant-architect MINOR-NOTE from B-2a iter-1 — B-2b plan-review iter-1 grep gate enforces.)
- **D-07:** `resolveOwnerToken` returns null on missing/revoked/expired → route hits error boundary (D-04). No surface fallback to authenticated session.
- **D-08:** Page server-side renders the resolved data (no client-side data fetch for the initial paint; reduces TTFB on mobile). Token resolved once per request.

### Renderable components (existing prototypes; reused tenant-blind)

- **D-09:** Render `OwnerDashboardView` (existing tenant-blind component at `src/components/prototypes/OwnerDashboardView.tsx`) for the homepage. Pass props from `getScopedOwnerPortalClient` query results.
- **D-10:** Render `OwnerDrawView` (existing) for pay-app drilldown.
- **D-11:** Plan-author confirms exact prop interface match at /np time; if existing components need minor adjustment (e.g., loading states, empty states for anon-token-resolved data), document as in-scope minor refactor.

### Mobile-first UI

- **D-12:** Viewport contract per F1+-4 multi-viewport: iPhone 13 Pro Max, iPhone 14/15 Pro Max, Pixel 7. Test against these viewports via Playwright + visual smoke.
- **D-13:** Touch targets ≥ 44px per SYSTEM.md (high-stakes actions like acknowledge pay-app ≥ 56px).
- **D-14:** Standalone layout = no top nav-bar + no admin sidebar (homeowner is anon). Plan-author proposes layout structure (likely a top bar with Ross Built logo + job name; main content; bottom safe-area).

### Audit integration (acknowledge pay-app)

- **D-15:** Implement pay-app acknowledgment as the canonical audit-integration probe action (per EXPANDED-SCOPE §7 plan #2). API route at `src/app/api/owner-portal/acknowledge-pay-app/route.ts` (NEW). PUBLIC_PATHS for this route already extended in B-2a (`/api/owner-portal/acknowledge`).
- **D-16:** Acknowledge route writes `activity_log` row with: `entity_type='draw'`, `action='acknowledged'`, `user_id=NULL`, `actor_token_id=<resolved_token.id>`. APPEND-ONLY (per iter-1 SYNTHESIS B-13 fix — NO `expected_updated_at` optimistic-lock on activity_log writes).
- **D-17:** Uses B-2a's `assertDrawBelongsToToken(drawId, resolvedToken)` helper to verify scope BEFORE writing the audit row.
- **D-18:** Rate-limited via B-2a's `recordOwnerPortalRequest('token', resolvedToken.id)` + `recordOwnerPortalRequest('ip', requestIp)` (DB-backed counter live from 00104).

### TOCTOU close on acknowledge

- **D-19:** Migration 00106 (NEW; B-2b scope) adds DB unique constraint: `CREATE UNIQUE INDEX activity_log_ack_dedupe_unique ON activity_log (entity_id, actor_token_id, action) WHERE action='acknowledged' AND actor_token_id IS NOT NULL;`
- **D-20:** Acknowledge insert path: `INSERT INTO activity_log (...) ... ON CONFLICT (entity_id, actor_token_id, action) WHERE action='acknowledged' DO NOTHING` — concurrent double-tap produces exactly 1 audit row.
- **D-21:** iter-1 SYNTHESIS B-12 closure verified via concurrent-double-tap test (Playwright OR manual via 2 curl racing).

### Soft-delete + status filters on portal queries

- **D-22:** Per iter-1 SYNTHESIS B-14 — every B-2b query against `draws`, `jobs`, `change_orders`, `lien_releases` includes:
  - `.is('deleted_at', null)` (where applicable to the table)
  - `.in('status', ['submitted', 'approved', 'paid', 'void'])` on `draws` (exclude `draft` + `pm_review` from homeowner view)

### ClientCombobox token polish (TD-B1abis-03)

- **D-23:** `src/components/client-combobox.tsx` inline `boxShadow` + inline `style={fontFamily, color}` → token-driven Tailwind utility classes mirroring `cost-code-combobox.tsx` idiom (~10 lines).
- **D-24:** **Use `shadow-[var(--shadow-panel)]`** (closest existing token per iter-1 SYNTHESIS B-15). NOT `--shadow-popover` (does NOT exist in design system).
- **D-25:** Plan-author replaces inline `style={fontFamily, color}` with utility classes (`font-display`, `text-foreground` or equivalent from existing tokens).

### NwButton TD-20 boundary exemption

- **D-26:** Per iter-1 SYNTHESIS B-16 — NwButton lacks a 56px size variant. B-2b's acknowledge button (high-stakes action; touch target ≥ 56px per SYSTEM.md) requires either:
  - (a) TD-20 boundary exemption comment on raw `<button>` (mirroring `OwnerDrawView.tsx:158-162` precedent) explaining why we bypass NwButton + cite SYSTEM.md 56px requirement
  - (b) NwButton lg size = 44px with explicit WCAG-minimum acknowledgment in PLAN body (44px IS the WCAG minimum; 56px is stronger but not mandatory)
- **D-27:** Plan-author picks (a) or (b) at /np time; iter-1 design-pushback reviewer confirms.

### Forward-carried GATE condition (per nwrp209 §3)

- **D-28:** **AC-B2a-08 runtime revocation MUST execute live as B-2b ship test prerequisite.** Test pattern:
  1. Create a test token via `create_client_portal_invite` (already verified live in B-2a QA Q2)
  2. Render `/owner/{token}` — verify portal loads
  3. Revoke the token via admin route (uses B-2a's `revoke-token` route)
  4. Re-request `/owner/{token}` — verify portal blocks (403 OR redirect to error boundary with revoked message)
  5. Cleanup
- **D-29:** If runtime revocation fails in B-2b ship test → **HALT before B-2b ships** per nwrp209 §3 forward-carried condition.

### Codebase reality B-2b touches/creates (verified)

- **D-30:** NEW: `src/app/owner/` directory tree (multiple files: `[token]/page.tsx`, `[token]/pay-apps/[id]/page.tsx`, `layout.tsx`, `error.tsx`) — does NOT exist; B-2b creates
- **D-31:** NEW: `src/app/api/owner-portal/acknowledge-pay-app/route.ts` — does NOT exist; B-2b creates (companion to B-2a's `/admin/revoke-token` route)
- **D-32:** NEW: migration 00106 for TOCTOU dedup unique index — B-2b authors
- **D-33:** EXISTING (untouched): `src/app/owner-portal/page.tsx` + `/pay-apps/[id]/page.tsx` (1.5c thin wrappers) — superseded but not deleted (cleanup deferred OR documented in §12 hand-off)
- **D-34:** EXISTING (consumed): B-2a deliverables — `src/lib/owner-portal/token.ts`, `src/lib/owner-portal/rate-limit.ts`, `src/middleware.ts` PUBLIC_PATHS extension, `src/lib/activity-log.ts` interface (B-2b writes via this interface)

### Plan-author latitudes (surface at iter-1; NOT pre-decided)

D-01..D-34 above lock substantive scope. Plan-author retains latitude on:
- Exact OwnerDashboardView/OwnerDrawView prop interfaces (read existing components at /np time; confirm match or document minor refactor)
- Layout structure of `src/app/owner/layout.tsx` (top bar styling, safe-area handling)
- Document download UX (link list vs accordion vs cards)
- D-27: NwButton TD-20 vs lg=44px choice
- AC-B2a-08 runtime revocation test pattern (Playwright headless OR manual harness)
- TOCTOU test pattern (concurrent curl racing OR Playwright)
- Cleanup posture for the 1.5c thin wrappers (D-33)

### Claude's Discretion

None for B-2b core scope. All substantive items locked. Plan-author latitude items above are explicit + bounded.

### Folded Todos

None — no pending todos matched this phase.
</decisions>

<canonical_refs>
## Canonical References

### Slice-level scope (CANONICAL TRUTH)

- `.planning/expansions/stage-f1-knowledge-graph-auth-wave-b-slice-2-EXPANDED-SCOPE.md` §7 plan #2 — canonical B-2b scope; §11 has B-2b ACs (subset); RE-APPROVED 2026-05-21 per nwrp202

### B-2a foundation (CONSUMED — SHIPPED)

- `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2a-PLAN.md` (2559 lines; ACs verified live at QA)
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2a-SUMMARY.md` (executor post-ship summary)
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/PLAN-REVIEW-B2A-ITER1-*.md` + ITER2-*.md + QA-*.md (full review trail)
- `.planning/qa-runs/2026-05-21-1605-stage-f1-wave-b-slice-2-B-2a-qa-report.md` (local; full QA verdict)
- `.planning/qa-runs/2026-05-22-0949-stage-f1-wave-b-slice-2-B-2a-acl-reverify.md` (local; ACL re-verify PASS)
- Commits: `fc19a2e` (migration 00104) + `a70ea03` (activity-log + ENTITY_LABELS) + `4abe5a0` (token helpers) + `fdd653b` (middleware PUBLIC_PATHS) + `144c108` (rate-limit) + `6f65a9e` (admin revoke route) + `69eb20b` (admin UI) + `ee43e78` (SUMMARY) + `59459a7` (00105 ACL hardening)

### Orchestrator chain

- nwrp200 (B-2 → B-2a + B-2b re-split)
- nwrp201 + nwrp202 (B-2a parameters; B-2b inherits)
- nwrp203 (B-2a halt-for-fresh-session; superseded mid-session)
- nwrp204 (B-2a fresh $50; superseded by nwrp208 bump)
- nwrp205 (B-2a /nx authorized)
- nwrp206 (B-2a SETUP-COMPLETE remediation)
- nwrp207 (B-2a QA bump $50→$75)
- nwrp208 (B-2a ACL fix bump $75→$85)
- nwrp209 (B-2a GATE SIGNED; B-2b authorized; LEANER 5-reviewer scope; forward-carried AC-B2a-08 runtime revocation)

### Architecture / standards

- `.planning/architecture/ARCHITECTURE.md` §8 (F1 Owner Portal Path A auth path constraint — Path A chosen)
- `.planning/design/PATTERNS.md` §4h.3 (owner portal dashboard, Dashboard pattern) + §2j.3 (draw approval detail, Document Review extension) — both cover B-2b without new pattern entry
- `.planning/design/SYSTEM.md` — design tokens, type system, viewport contract, touch targets ≥44px (high-stakes ≥56px), motion contracts
- `.planning/design/COMPONENTS.md` — locked component contract (Button, NwButton, etc.); icon library boundary
- `CLAUDE.md` — UI rules (Slate type system; Stone Blue palette; logo top-left; design tokens always; invoice review as gold standard for document-review surfaces); Multi-tenant RLS BY CONSTRUCTION; Workflow posture Rules 1-9
- `.planning/MASTER-PLAN.md` §9/§12 — Slice-2 progress (post-B-2a-SHIP per nwrp209)

### Existing codebase (consumed/touched)

- `src/lib/owner-portal/token.ts` (B-2a; helpers consumed by B-2b)
- `src/lib/owner-portal/rate-limit.ts` (B-2a; consumed)
- `src/lib/activity-log.ts` (B-2a interface extension; B-2b writes via)
- `src/lib/audit/action-labels.ts` (B-2a Record exhaustiveness; B-2b adds 'draw' + 'acknowledged' if not already)
- `src/middleware.ts` (B-2a PUBLIC_PATHS extension; /owner/* + /api/owner-portal/acknowledge already covered)
- `src/components/prototypes/OwnerDashboardView.tsx` (existing tenant-blind; B-2b consumes)
- `src/components/prototypes/OwnerDrawView.tsx` (existing; B-2b consumes)
- `src/app/owner-portal/page.tsx` (existing 1.5c thin wrapper; B-2b supersedes but does NOT delete)
- `src/app/owner-portal/pay-apps/[id]/page.tsx` (existing; same)
- `src/components/client-combobox.tsx` (B-2b touches per TD-B1abis-03)
- `src/lib/api/optimistic-lock.ts` (NOT used by B-2b for activity_log writes — D-16 append-only; used by B-2a's admin revoke route only)
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **B-2a helpers** at `src/lib/owner-portal/token.ts`: `resolveOwnerToken` (token-hash + lookup + scope-narrowing), `getScopedOwnerPortalClient` (pre-scoped Supabase wrapper), `assertDrawBelongsToToken` (pinned PostgREST embed for cross-validation). ALL B-2b data fetches MUST go through these.
- **B-2a rate-limit** at `src/lib/owner-portal/rate-limit.ts`: DB-backed counter via `recordOwnerPortalRequest('token', ...) + ('ip', ...)`. B-2b acknowledge route uses both.
- **Existing OwnerDashboardView + OwnerDrawView** at `src/components/prototypes/`: tenant-blind components built during 1.5c. B-2b feeds them real Drummond data via `getScopedOwnerPortalClient`.
- **`updateWithLock`** at `src/lib/api/optimistic-lock.ts`: NOT used for activity_log writes (append-only per D-16). Used for any draw status mutations — but B-2b is READ-ONLY for draws (acknowledge doesn't mutate draw row; only appends audit_log).

### Established Patterns

- **Server-side render token resolution** (D-08): match Next.js 14 App Router server component pattern. No client-side useSwr/useEffect for the initial paint.
- **B-2a `getScopedOwnerPortalClient` mandatory** (D-06): grep gate at plan-review iter-1 blocks direct service-role client construction in `src/app/api/owner-portal/**` or `src/app/owner/**`. Multi-tenant-architect MINOR-NOTE from B-2a iter-1 captured this requirement.
- **Append-only activity_log** (D-16): no `expected_updated_at` on activity_log writes per iter-1 SYNTHESIS B-13. INSERT...ON CONFLICT DO NOTHING for dedupe per D-20.
- **Mobile-first viewport contract** (D-12): iPhone 13/14/15 Pro Max + Pixel 7 per F1+-4. Playwright multi-viewport harness used at /nightwork-qa.
- **Existing 1.5c thin wrappers superseded but preserved** (D-33): `src/app/owner-portal/*` stays as design-system playground; B-2b's `/owner/{token}/*` is the production homeowner surface.

### Integration Points

- `src/app/owner/[token]/page.tsx` — NEW server component; entry point
- `src/app/owner/[token]/pay-apps/[id]/page.tsx` — NEW pay-app drilldown
- `src/app/owner/layout.tsx` — NEW standalone layout (no auth nav)
- `src/app/owner/error.tsx` — NEW Next error boundary
- `src/app/api/owner-portal/acknowledge-pay-app/route.ts` — NEW POST handler; uses B-2a helpers + rate-limit; writes activity_log via D-16/D-17/D-20 pattern
- `supabase/migrations/00106_*.sql` — NEW; adds activity_log dedupe unique index per D-19
- `supabase/migrations/00106_*.down.sql` — NEW; drops the index
- `src/components/client-combobox.tsx` — modified per D-23/D-24/D-25 (TD-B1abis-03 polish)
- `src/lib/types/database.types.ts` — regenerated (if migration 00106 changes schema; likely no since 00106 is index-only)
</code_context>

<specifics>
## Specific Ideas

- **Drummond as canary**: post-ship, render `/owner/{token}` for Drummond's portal token (created via `create_client_portal_invite` against Drummond job) — verify all data fields render correctly; document downloads work; acknowledge pay-app writes audit_log row; revoke + re-request → portal blocks.
- **AC-B2a-08 forward-carried test (D-28)**: this IS the primary GATE B-2b condition per nwrp209 §3. Plan-author proposes the exact test mechanism (Playwright headless preferred for automation; manual harness via curl/dev server acceptable for manual verification).
- **PATTERNS.md alignment (B-17 RESOLVED)**: §4h.3 documents owner-portal dashboard (Dashboard pattern). §2j.3 documents draw-approval detail as Document Review extension. B-2b's UI consumes these patterns without inventing new entries. Plan body MUST cite both.
- **Cost ledger surface at iter-1 (per nwrp209 §17)**: plan-review iter-1 synthesis MUST include running Slice-2 cost ledger so Jake has full data for B-3 rescope decision.
</specifics>

<deferred>
## Deferred Ideas

### Out-of-scope for B-2b (mapped to later)

- Full Owner Portal feature set (notifications, comments, signature workflows, ongoing engagement) → **Wave 1.1-Lite**
- Token lifecycle alternative options (one-shot, auto-rotate every N days) → **Wave 1.1-Lite revisit**
- Owner Portal email notifications ("your pay-app is ready to review") → **Wave 1.1-Lite**
- Multi-language support → **Wave 1.1-Lite or later**
- Print-friendly G702/G703 from portal → **Wave 1.1-Full**

### Out-of-scope for Slice-2 entirely

- New PATTERNS.md "Owner Status View" entry — RESOLVED per iter-1 SYNTHESIS B-17
- Owner Portal Path B (separate role + RLS-enforced auth) — NOT in F1 per ARCHITECTURE.md §8

### Reviewed Todos (not folded)

None — no pending todos matched this phase.

### Plan-author latitude items (surface at iter-1)

- D-27 NwButton TD-20 vs lg=44px choice (design-pushback iter-1 confirms)
- AC-B2a-08 runtime revocation test mechanism (Playwright vs manual; security-reviewer iter-1 confirms)
- TOCTOU test pattern (concurrent curl racing vs Playwright)
- Cleanup posture for 1.5c thin wrappers (D-33 — leave as design-system playground OR mark deprecated; custodian iter-1 confirms)
</deferred>

---

*Phase: stage-f1-knowledge-graph-auth-wave-b-slice-2*
*Plan: B-2b (Read-only Owner Portal Path A UI + audit integration — medium threat; halt_after: true)*
*Context gathered: 2026-05-22 via /np dispatch (lean direct authoring per nwrp209)*
*Driver: nwrp209 §5-10 — B-2b authorized post-B-2a-GATE-SIGNED; LEANER 5-reviewer scope; NOT touching $200 ceiling*
