# Stage F1 Wave-B Slice-2 — EXPANDED-SCOPE

**Status:** DRAFT — pending Jake re-review post-nwrp166 amendments
**Authored:** 2026-05-15 NIGHT
**Revision:** 2026-05-15 NIGHT (nwrp166 amendments applied — see "Amendment history" below)
**Authorization:** nwrp165 Option A weekend scope (write-up only, no execute)
**Author:** Claude Code (this session)
**Phase:** stage-f1-knowledge-graph-auth-wave-b-slice-2
**Branch:** main @ `3654393`
**Inherits:** Slice-1 (3 of 4 plans shipped; B-1b deferred to fresh session per nwrp164)

> This document is authored under nwrp165's weekend Option A constraints:
> zero destructive operations, zero execute, halt-and-surface between
> deliverables, $40 weekend ceiling. It is NOT to be dispatched via `/np`
> until Jake reviews, amends as needed, approves, and explicitly invokes
> the discuss → plan → review cycle. The companion plan files (B-2..B-7)
> are NOT authored as part of this weekend; only this scope expansion is.

### Amendment history

- **2026-05-15 NIGHT — nwrp166 amendments (this revision):**
  - **Q11 rewrite (distribute, NOT bundle):** dropped proposed B-8 polish bundle plan; distributed 4 Slice-1 carry-forwards across existing plans (TD-B1abis-01 → B-4, TD-B1abis-02 → B-4, TD-B1abis-03 → B-2, W.1 listener unflag → B-3 or B-4 conditional). Slice-2 stays at 6 plans. Cascaded edits in §1 Mapped entities, §7 Recommended scope expansion, §8 dependency map, §10 cost projection, §11 acceptance criteria. (per nwrp166 §7-13)
  - **Q9 rewrite (best-estimate intersection matrix + pre-dispatch gate):** removed unconditional parallel-dispatch recommendation; replaced with best-estimate intersection matrix flagging B-4 ∩ B-5 as MEDIUM-HIGH risk surface; deferred actual authorization to plan-review iter-1 after authored plans expose concrete `files_modified`. No parallel dispatch authorized pre-plan-authoring. (per nwrp166 §15)
  - **§10 cost-projection per-plan halt gate:** added explicit gate — "if any individual plan projects >$50 mid-authoring, halt for Jake re-scope. Do NOT plan-author through it." with trigger conditions enumerated. (per nwrp166 §17)
  - **Q1-Q12 recommendation pattern review:** strengthened Q4 (PII restoration deferral) and Q5 (token rotation cadence) with explicit dependency-chain deferral costs + named regression durations + orchestrator's stated preference + reasoning. Q1/Q2/Q6/Q8/Q12 already had reasoning per umbrella convention; not amended this revision. (per nwrp166 §20-22)
  - Q1-Q12 numbering, Status field, and other content preserved verbatim.

---

## Stated scope (Jake's words, verbatim — from nwrp165 + umbrella out-of-scope list)

From nwrp165:

> Slice-2 EXPANDED-SCOPE authoring.
>    - Author .planning/expansions/stage-f1-knowledge-graph-auth-wave-b-slice-2-EXPANDED-SCOPE.md
>    - Plans B-2 through B-7 per umbrella out-of-scope list (Owner Portal Path A, deletion trigger + DEF-WC-1 + DEF-WC-3, activity_log full extension, magic-link + email-in primitive, cost-code reseed + fixture contract Amendment 3, RB seed + Stripe + EXPLAIN ANALYZE + remaining harness)
>    - Include Q&A resolutions matching umbrella Q1-Q12 references
>    - Halt gates explicit (after which plans, what review work)
>    - Dependency map across the 6 plans
>    - Cost projection based on Slice-1 actuals (~$22/plan avg; B-1a-bis $40 outlier; project ~$130-180 for Slice-2)
>    - Forward estimate calibration: ceiling at $200 for Slice-2 with buffer
>    - HALT for Jake review after authoring; do NOT dispatch /np

From F1 umbrella EXPANDED-SCOPE §9 Plan decomposition (canonical 6-plan Slice-2 mapping):

- **B-2:** `client_portal_access.client_id` FK + Owner Portal Path A minimum UI (read-only progress + payment status + document downloads) + 1-2 audit integration points. [Q4b]
- **B-3:** Soft-delete DB-trigger safety net + user-identity-threading convention + DEF-WC-1 (`org_members` RESTRICTIVE backstop) + DEF-WC-3 partial (ARCHITECTURE.md "RLS posture summary table by entity"). [Q6 F + DEF-WC-1 + DEF-WC-3]
- **B-4:** `activity_log.entity_type` TS union extension (add `lien_releases`, `proposals`, `clients`, `client_portal_access`; remove `budget`) + write-site coverage for new F1 entities. [Q6 F]
- **B-5:** Magic-link primitive + email-in receiving primitive (Amendment 2). F1 email-in MVP: Resend webhook → `documents` table rows (no parsing, no inbox setup). Magic-link primitive: email-delivery + token-generation infrastructure for F4 reuse. [ARCHITECTURE §6 F1 + Amendment 2]
- **B-6:** Cost-code wipe-and-reseed per D-020 + Q9 D fixture-maintenance contract codification + Layer 2 fixture-coverage assertion (CI hook). Amendment 3: pre-commit hook OR plan-review BLOCKING check for fixture-harness-org seed in every tenant-scoped CREATE TABLE migration. [D-035 #5 + Q9 + Amendment 3]
- **B-7:** RB org seed + Stripe test-mode sanity check + Q2 `EXPLAIN ANALYZE` verification step (4 candidate aggregations) + remaining harness extensions (multi-viewport per F1+-4 + behavioral test category if not absorbed into B-1b). [Q10 A + Q2 verification + Q8 carry-forward + F1+-4]

---

## 1. Mapped entities and workflows

### New entities introduced by this slice

| Entity | Plan | New columns / shape | Retention class | PII? |
|---|---|---|---|---|
| (none — primarily extensions of existing entities) | — | — | — | — |
| `documents` table extension | B-5 | New row type: `kind='email_in'` + raw_payload JSONB | forever (audit trail) | YES — email contents may carry PII |
| Token primitives (magic-link + actor_token reuse) | B-5 | Token-generation helper + Resend send wrapper; NOT new table | sessional | NO |

### Existing entities touched

| Entity | Plan | Change |
|---|---|---|
| `client_portal_access` | B-2 | Add `client_id UUID NOT NULL REFERENCES clients(id) ON DELETE SET NULL` FK (currently scoped only to single job; this widens scope to client identity) |
| All tenant tables (~25 tables per ENTITY-INVENTORY.md) | B-3 | Per-table trigger declaration for soft-delete audit safety net |
| `org_members` | B-3 | DEF-WC-1: ADD RESTRICTIVE "org isolation" policy (mirrors 00049 canonical pattern with `(SELECT ...)` session-cache wrapping) |
| `activity_log.entity_type` TS union | B-4 | + `lien_releases`, `proposals`, `clients`, `client_portal_access`; — `budget` (removed in Q10c) |
| API write routes for `clients`, `proposals`, `lien_releases`, `client_portal_access` | B-4 | Inject `logActivity` calls at create/update/state-change sites where missing |
| `cost_codes` (templates + org-scoped) | B-6 | Wipe + reseed per D-020 canonical NAHB scope; preserve `org_id IS NULL` template rows + reseed `(org_id = RB_ORG_ID)` working set; preserve existing Drummond linkages |
| `organizations` (RB org row) | B-7 | Update RB seed: `subscription_status='active'`, no Stripe customer ID, `trial_ends_at=NULL` (per Q10 A) |
| `src/app/api/jobs/route.ts` PATCH (MEDIUM-1 carry-forward) | **B-4** (per nwrp166 §10 + distribute pattern) | Add `.eq("org_id", membership.org_id)` to `PATCH /api/jobs` lines 373-377 (B-1a-bis QA cross-reviewer agreement; pre-existing surface, defense-in-depth fix). |
| `src/app/api/jobs/route.ts` `resolveClientId` (TD-B1abis-01 carry-forward) | **B-4** (per nwrp166 §11 + distribute pattern) | Catch unique-violation `23505` + re-run find branch (~5 lines, same file as MEDIUM-1). |
| `src/components/client-combobox.tsx` token polish (TD-B1abis-03 carry-forward) | **B-2** (per nwrp166 §11 + distribute pattern) | Replace inline `boxShadow` + inline `style={fontFamily, color}` with shadow-elevation token + utility classes mirroring cost-code-combobox.tsx idiom (~10 lines). |
| `clients` GIN trigram migration (TD-B1abis-02 carry-forward) | **B-4** (per nwrp166 §11 + distribute pattern; plan-author may opt to defer to B-6) | `CREATE INDEX idx_clients_full_name_trgm ON public.clients USING gin (full_name gin_trgm_ops) WHERE deleted_at IS NULL;` (~1 line SQL). |
| `useCurrentRole` W.1 listener unflag (B-1b carry-forward) | **B-3 OR B-4 (conditional on observation window)** (per nwrp166 §11 + distribute pattern) | `NEXT_PUBLIC_AUTH_STATE_LISTENER=true` env-var addition in Vercel Production + Preview. Standalone single-commit; lands in whichever of B-3/B-4 ships first AFTER 1-2 weeks observation window + Sentry green + smoke clean. NOT a code change. |

### Workflows touched

| Workflow | Plan | Surface |
|---|---|---|
| Owner Portal Path A login + read-only progress + payment status + document downloads | B-2 | NEW — first user-facing UI in F1 (mobile-friendly mandatory per CLAUDE.md). Minimum-viable surface; not full feature set per Q4b. |
| Soft-delete safety net | B-3 | TRIGGER-LAYER — guarantees audit row on every soft-delete transition regardless of code path. Threads `current_setting('app.current_user_id', true)` from middleware. |
| Email receiving (Resend webhook) | B-5 | NEW — receives delivery/bounce/complaint events + storage-only intake of inbound emails. No parsing, no routing to invoice pipeline. |
| Magic-link delivery + token primitive | B-5 | NEW — email-delivery infra + token-generation helper for F4 reuse (Architect/Inspector RFI, Sub Portal). Does NOT replace internal password login (Q5 A). |
| Cost-code template ↔ org-overlay coherence | B-6 | EXISTING (D-020 wipe-and-reseed). Drummond linkages preserved; fixture-harness-org seeds added per Amendment 3 contract. |
| RB-as-internal-tenant billing bypass | B-7 | NEW seed of `organizations` row with `subscription_status='active'` + `trial_ends_at=NULL`; Stripe routes verified in test mode (no production webhook URL yet — F1+-1 dependency). |
| EXPLAIN ANALYZE for 4 candidate aggregations | B-7 | NEW verification step (Q2 verification): `jobs.approved_cos_total` / `jobs.total_committed` / `vendors.balance_outstanding` / `jobs.current_contract_amount`. Any >100ms → trigger cache decision before Wave 1.1-Lite. |

---

## 2. Prerequisite gaps

What MUST exist before this slice can ship.

| # | Gap | Source | Blocking? |
|---|---|---|---|
| 1 | Slice-1 fully shipped (B-D080 + B-1a + B-1a-bis + B-1b) | `e07819a` + post-B-1b commit | **PENDING B-1b ship** (Slice-1 75% complete; B-1b deferred per nwrp164). Slice-2 cannot dispatch until B-1b ships. |
| 2 | `clients` table exists (per B-1a / migration 00100) | RESOLVED | Required for B-2 FK + B-4 entity_type extension. |
| 3 | `jobs.client_id` FK exists (per B-1a-bis / migration 00101) | RESOLVED | Required as pattern reference for B-2 FK shape. |
| 4 | KG scaffold + types pipeline (per B-1b) | PENDING B-1b ship | Required for B-3 trigger function + B-5 token helpers + B-7 RB seed to consume `database.types.ts`. |
| 5 | 4 foundational Layer 2 standards (per B-1b) | PENDING B-1b ship | Required for B-6 fixture-coverage Amendment 3 to plug into existing harness; B-7 multi-viewport extends the same harness. |
| 6 | W.1 listener env-flag wiring (per B-1b) | PENDING B-1b ship | Slice-2 carries the optional unflag once observation window closes. |
| 7 | Smoke harness 11/13 baseline holds | RESOLVED 2026-05-15 (run `1778877773840` against `323f0be`) | Wave-B prereq #12 maintained; gate for Slice-2 plan-review iter-1. |
| 8 | Drummond + fixture-harness-org seed data intact | RESOLVED | B-3 trigger applies to all tenant tables; fixture rows must satisfy trigger expectations (NULL user marker tolerated). |
| 9 | Resend domain verified + DNS records configured | **MANUAL — Jake action required for B-5** | B-5 webhook endpoint test cannot validate inbound mail without verified domain. Track in MANUAL-CHECKLIST when /nightwork-init-phase fires. |
| 10 | Stripe test-mode account active + Builder 20 Club price IDs exist | **PARTIAL — Stripe scaffold from migration 00024 exists; test-mode price IDs not yet populated** | B-7 sanity check needs price IDs in env vars to test checkout/portal/webhook routes. Track in MANUAL-CHECKLIST. |
| 11 | Production domain decision (F1+-1) for Stripe webhook URL | DEFERRED | B-7 does NOT require production webhook URL; test-mode webhook URL is acceptable for sanity check. Production cutover documented as Wave 1.1-Lite-or-later deliverable per Q10. |
| 12 | EXPLAIN ANALYZE representative dataset | RESOLVED | Drummond fixture is representative; B-7 runs against live Supabase. |
| 13 | `current_setting('app.current_user_id', true)` middleware threading | DESIGN CONTRACT — B-3 establishes | NOT a gap; B-3's responsibility to design + wire. |
| 14 | ARCHITECTURE.md "RLS posture summary table by entity" section exists | DESIGN CONTRACT — B-3 (DEF-WC-3 partial) authors | NOT a gap; B-3 deliverable. |

**Blocking gaps:**
- #1 (Slice-1 ship completion) — Slice-2 cannot start until B-1b ships and GATE 2 HALT review completes.
- #9 (Resend domain) and #10 (Stripe price IDs) require Jake's manual action; not pre-block but cannot dispatch B-5/B-7 without resolution.

---

## 3. Dependent-soon gaps

What's likely needed shortly after — design for it now.

| # | Gap | Likely next slice / wave | Design implication |
|---|---|---|---|
| 1 | Full Owner Portal feature set (notifications, comments, signature workflows, ongoing engagement) | Wave 1.1-Lite | Plan B-2 minimum-viable UI must NOT block future feature additions. Token model from 00074 already supports the extension; design page surface to additively layer new features. |
| 2 | AI parsing of inbound email into specific entities (invoice / proposal / lien-release extraction) | Wave 3 (intelligence layer) | Plan B-5's `documents.raw_payload` JSONB must preserve everything Wave 3 will need for extraction (headers, attachments, MIME parts). |
| 3 | accounting@rossbuilt.com inbox setup + MX record routing | Wave 3 | Plan B-5 ships only the webhook receiver + storage; MX routing is a Resend-side configuration. Document in B-5 README. |
| 4 | Multi-modal extraction per WI-038 punchlist (email + photo + audio) | Wave 3 | Plan B-5 establishes the `documents` row-as-intake pattern; Wave 3 reuses for non-email modalities. |
| 5 | F2 employees + role_definitions registry | F2 | Plan B-3 trigger function must work with current 4-role enum AND future expanded role enum (role-agnostic; trigger reads `current_setting`, not role). |
| 6 | Inngest async event surface | F3 | Plan B-3 trigger could optionally enqueue Inngest event on soft-delete (e.g., for "notify owner" downstream); deferred to F3 — B-3 ships trigger-write-only; Inngest hook is additive layer later. |
| 7 | F6 Pay App G702 signature block | F6 | Plan B-4's activity_log extension may need additional `entity_type` values for pay-app states (`pay_app_submitted`, `pay_app_approved`, `pay_app_paid`); deferred to F6. B-4 ships current F1 entity set only. |
| 8 | NWCM (Nightwork Customer Management) admin views | Wave 4 (commercial readiness) | Plan B-7's RB org seed pattern (active, no Stripe ID, no trial) becomes the reference for trial-org creation flow in Wave 4. Document in B-7 README. |
| 9 | `clients.email`/`clients.phone` PII restoration in UI | Wave-B-Slice-2 polish OR Wave 1.1-Lite | Slice-2 explicit decision required: is the PII fence relaxed for non-admin roles via column-level GRANT (per ai-logic-tester's NOTE in B-1a-bis QA §10), OR is restoration deferred entirely to Wave 1.1-Lite where Owner Portal Path A may need contact info? **Surfaced as Q4 below.** |
| 10 | Multi-viewport harness extension (F1+-4 AC-1-12 Layer 3) | B-7 within this slice | Plan B-7 catches; NOT a deferral. |

---

## 4. Cross-cutting checklist

| Concern | Status | Rationale |
|---|---|---|
| Audit logging | APPLIES (HEAVY) | B-3 trigger guarantees every soft-delete writes activity_log. B-4 extends `entity_type` to F1 entities + adds write-site coverage. B-2 adds `actor_token_id` audit integration on owner-initiated actions (pay-app acknowledgment). B-7 RB seed migration must NOT write activity_log (seed bypass per existing 00092/00093 precedent). |
| Permissions | APPLIES (HEAVY) | B-2 Owner Portal Path A adds token-based access surface (NOT a new role; OrgMemberRole stays at 4 values per Q4 + Q4b). B-3 DEF-WC-1 closes `org_members` RESTRICTIVE backstop gap. RLS posture summary table (DEF-WC-3 partial) codifies all tenant tables' RLS shape in ARCHITECTURE.md. |
| Optimistic locking | APPLIES | B-2 introduces first user-facing mutations in F1 (Owner Portal acknowledgments). Apply `expected_updated_at` per R.10 + `updateWithLock()` from `src/lib/api/optimistic-lock.ts`. Required even for simple "I acknowledge" actions. |
| Soft-delete + status_history | APPLIES | B-3 trigger is THE deliverable. Plan must verify trigger fires on all tenant tables; verify trigger handles `UPDATE ... SET deleted_at = NOW()` pattern (not raw DELETE which is forbidden per CLAUDE.md). |
| Recalculate, don't increment | APPLIES (VERIFICATION) | B-7 EXPLAIN ANALYZE on 4 candidate aggregations is the Q2 verification step — confirms read-time recompute holds at scale. Any aggregation >100ms gets a trigger cache decision BEFORE Wave 1.1-Lite. |
| Multi-tenant RLS | APPLIES (HEAVY) | B-2 `client_portal_access.client_id` FK shape: `ON DELETE SET NULL` (preserves token row if client soft-deleted). B-3 trigger function uses `SECURITY DEFINER` — must NOT bypass org_id scoping; trigger writes `activity_log.org_id` from the row's org_id, not a constant. B-3 DEF-WC-1 RESTRICTIVE backstop pattern explicitly tested for cross-org leak prevention. B-6 cost-code reseed preserves org-scoped vs template separation. |
| Idempotency | APPLIES | B-5 Resend webhook MUST be idempotent (Resend may deliver same event twice on retry). Use Resend's event ID (`event.data.id` or similar) as idempotency key; check before insert; no-op on duplicate. B-7 RB seed migration MUST be idempotent (re-applying should not create duplicate row; use `INSERT ... ON CONFLICT DO NOTHING` or `UPSERT`). |
| Background jobs | APPLIES (LIGHT) | B-5 email-in webhook could optionally enqueue Inngest event for downstream processing (Wave 3 prep). Defer Inngest integration to Wave 3 per Q8 (real-time deferred); B-5 ships webhook → storage only. |
| Rate limiting | APPLIES (MEDIUM) | B-5 Resend webhook is external-facing — rate-limit per Resend signature verification (reject any request without valid `Svix-Signature` header); audit-log all rejections. B-2 Owner Portal token endpoint is also external-facing — rate-limit per token to prevent brute-force token guessing. |
| Observability | APPLIES (HEAVY) | B-3 trigger errors MUST surface to Sentry (Postgres NOTICE/WARNING captured); B-5 Resend webhook MUST tag Sentry events with `event_type` for filterability; B-7 Stripe sanity check verifies Sentry tags `user_id`/`org_id`/`platform_admin` continue to populate post-RB-seed migration. |
| Data import/export (V.2) | APPLIES (DESIGN-INTENT) | B-2 Owner Portal Path A document downloads use existing storage signed-URL pattern (no new import/export). B-5 `documents.raw_payload` JSONB is import-shape from day one (Resend payload IS the canonical record); design for V.2 framework reuse in F3. |
| Document provenance (V.3) | APPLIES | B-5 stores inbound emails as `documents` rows; provenance is intrinsic (Resend event ID + delivery timestamp). Sets the precedent for Wave 3 multi-modal extraction provenance. |
| Mobile-friendly | APPLIES (CRITICAL) | B-2 Owner Portal Path A is the FIRST user-facing surface in F1 + the FIRST mobile-mandatory surface (homeowners use phones). Test on iPhone 13/14/15 Pro Max viewport + Android equivalents per F1+-4 multi-viewport contract (B-7 ships the harness extension). |
| Drummond fixtures sufficient | APPLIES | B-2 Owner Portal Path A needs Drummond client_portal_access token row + sample payment/document data. B-3 trigger needs Drummond tenant-table rows with valid org_id to validate trigger fires correctly. B-6 cost-code reseed preserves Drummond's existing cost_code linkages. B-7 RB seed updates RB org row (Drummond is `org_id = RB_ORG_ID` so seed touches Drummond data). |
| CI test gate | APPLIES (HEAVY) | B-6 Amendment 3 adds pre-commit hook OR plan-review BLOCKING check that every tenant-scoped CREATE TABLE includes fixture-harness-org INSERT in same migration. B-7 multi-viewport harness extension adds new Layer 3 standard to CI. |
| Error handling for partial failures | APPLIES | B-3 trigger MUST handle the edge case where `current_setting('app.current_user_id', true)` returns NULL (service-role context); trigger writes NULL user_id with a service-role marker, does NOT block the soft-delete. B-5 webhook MUST handle Resend retries gracefully (see idempotency). |
| Graceful degradation | APPLIES | B-5 Resend webhook failure (Resend down OR webhook endpoint down) should NOT block other Nightwork operations; alert via Sentry. B-7 Stripe test-mode failure does NOT block ship; document in B-7 README + cross-ref to F1+-1 production cutover. |
| Wave-B prereq #12 smoke gate maintenance | APPLIES (INHERITED) | Plan-review iter-1 verifies smoke harness still passes ≤2 failures matching TD-WE-03 set. B-2 Owner Portal adds new routes — smoke harness route table MUST be extended; the downstream-consumer-sweep is mandatory per lessons.md 2026-05-15 entry. |
| Downstream-consumer-sweep (`.planning/lessons.md` 2026-05-15) | APPLIES (INHERITED) | All 6 plans MUST include downstream-consumer-sweep in pre-flight verification. Specifically: B-2 sweeps smoke harness route table for new Owner Portal routes + nav/middleware references; B-3 sweeps every tenant table per ENTITY-INVENTORY.md against trigger application; B-4 sweeps `entity_type` consumers (`src/lib/audit/action-labels.ts` `ENTITY_LABELS` Record per Slice-1 iter-3 §3.2 precedent); B-5 sweeps Resend webhook signature verification across any auth/middleware path; B-6 sweeps cost-code consumers for hardcoded code-id references; B-7 sweeps RB org row consumers for assumed-trial-org behaviors. Plan-review iter-1 BLOCKS without sweep results. |
| Rules 1-6 (Workflow posture) | APPLIES | Rule 1 (schema verification ≠ runtime verification) — B-2/B-3/B-5/B-7 all require_smoke:true (or Layer 3 harness verification). Rule 2 (PostgREST FK citation) — B-2 cites `client_portal_access_client_id_fkey`. Rule 3 (ai-logic-tester executes representative queries) — all plan-review iter-1. Rule 4 (Playwright smoke pre-QA) — B-2 (UI), B-3 (trigger behavior), B-5 (webhook), B-7 (multi-viewport). Rule 5 (files_modified intersection check) — Slice-2 plans authored in parallel; mechanical intersection check mandatory. Rule 6 (pre-flight collision checks) — all 6 plans; hook regex sweep + fixture collision check + path reachability + parallel intersection per nwrp135. |
| Plan-review iter-1 cross-reviewer factual disagreement HALT (nwrp118) | APPLIES | Any factual disagreement between reviewers HALTS for Jake. Slice-2's blast radius (6 plans, 25+ tables, trigger function, external webhooks) makes this gate more likely to fire than Slice-1's 4 plans. |

---

## 5. Construction-domain checklist

| Domain consideration | Applies? | Rationale |
|---|---|---|
| Drummond as reference job | YES | B-2 Owner Portal Path A demos against Drummond's `client_portal_access` token + Drummond's pay-app history. B-3 trigger fires on Drummond soft-deletes (none expected in test, but trigger must handle if executed). B-6 preserves Drummond cost-code linkages. B-7 RB seed updates Drummond's parent org row. |
| Field mistakes become permanent QC entries | N/A (Wave 2) | Slice does not touch daily-log / punchlist workflows. |
| Draw requests link to punchlist | N/A (Wave 2) | Reconciliation; not in slice. |
| Invoice review is gold standard UI | NO (RESPECT) | B-2 Owner Portal Path A is NOT invoice review — it's read-only homeowner view. Different pattern (PATTERNS.md may need new "Owner Status View" pattern documented). |
| Stone blue palette + Slate type + logo top-left | YES (CRITICAL) | B-2 Owner Portal Path A is new user-facing surface — design system applies. Cite SYSTEM.md + COMPONENTS.md tokens; NO hardcoded hex (post-edit hook enforces). |
| Stored aggregates require rationale comments | YES (CARRY-FORWARD) | B-7 EXPLAIN ANALYZE may surface a need for a new trigger-maintained cache; if so, plan-author authors rationale comment per CLAUDE.md exception clause. |
| Cost-plus open-book | YES (CRITICAL) | B-2 Owner Portal Path A surfaces costs to homeowner — every line item / pay-app / document must accurately reflect cost-plus billing reality. Drummond's data is the demo source. |
| Florida-specific | YES (LIGHT) | B-2 Owner Portal Path A may eventually surface FL homestead exemption status (deferred per umbrella §1 footer); no FL-specific work in slice. |
| GC fee semantics | YES (LIGHT) | B-2 Owner Portal Path A pay-app view shows GC fee separately from base; existing data model supports — verify in B-2 UI design that fee is surfaced clearly. |
| Lien waivers / FL release types | YES | B-4 adds `lien_releases` to `activity_log.entity_type`; B-2 Owner Portal Path A surfaces lien-release status to homeowner (visibility into "have all subs released against my draw?" is a homeowner trust factor). |
| Retainage | N/A | Not in slice. |
| Multi-currency | N/A | FL-only. |
| Owner notification cadence | DEFER | B-2 Owner Portal Path A is read-only; notification cadence ships in Wave 1.1-Lite. |
| Compliance retention | APPLIES | B-3 trigger ensures every soft-delete creates audit row — 7-year financial retention rule (VISION §6.4) preserves trail. B-5 `documents` (inbound email storage) inherits forever retention class. |

---

## 6. Targeted questions for Jake

These need decisions before /np dispatches Slice-2. Each comes with a recommendation; Jake confirms or amends.

1. **B-3 trigger function — SECURITY DEFINER vs SECURITY INVOKER posture.** Q6 F's "1 SECURITY DEFINER function + per-table triggers" was the canonical resolution. **Question:** Confirm SECURITY DEFINER (function runs with definer's privileges, bypasses RLS) is the intended posture, OR shift to SECURITY INVOKER (function runs with caller's privileges, respects caller's RLS)? **Recommended: SECURITY DEFINER, with explicit `SET search_path = public, pg_temp` per Wave-A iter-1 hardening lesson.** Rationale: trigger must always write activity_log regardless of caller's role (service-role contexts must work too); INVOKER would block trigger writes from low-privilege callers. Wave-A iter-1 deferred `search_path` sweep is the disciplined complement — every SECURITY DEFINER function in the system gets explicit `search_path`. Slice-2 candidate to bundle that sweep with B-3 trigger creation (also addresses TD-WA-iter1-1 per nwrp165 deliverable #5). Counter-argument: bundling slows B-3 if sweep surfaces 8+ functions needing individual review.

2. **B-3 `current_setting('app.current_user_id', true)` middleware threading — which middleware OWNS the SET LOCAL call?** Q6 F left this open. Three candidates: (a) `src/middleware.ts` (Next.js edge middleware) — but it doesn't talk to Supabase directly; (b) `getCurrentMembership()` helper (every API route entry point) — most natural place but requires adding SET LOCAL to every read; (c) a new middleware layer wrapped around Supabase client creation. **Recommended: (b) `getCurrentMembership()` helper.** Rationale: every API route already calls `getCurrentMembership()` per CLAUDE.md Development Rules; adding `SET LOCAL app.current_user_id = ...` immediately after membership resolution is one-touch. Cost: `getCurrentMembership()` becomes slightly heavier on every request. Alternative: only set on writes, not reads — surface to B-3 plan-author.

3. **B-5 Resend webhook signature verification — Svix-Signature scheme vs Resend's own signature?** Resend's webhook security pattern needs verification before plan-authoring. **Question:** Is Resend's webhook signing using Svix (standard webhook signature library) or Resend-specific HMAC? Verify against Resend dashboard config; document in B-5 plan body. **Recommended: defer to plan-author time — Resend docs verification is mechanical, doesn't need Jake decision.** But surface here because failure to verify signatures correctly is a security gap that would surface late if missed.

4. **PII restoration in UI — when do non-admin roles get to see `clients.email`/`clients.phone`?** Slice-1 D-079 fence excludes `clients.email`/`phone` from PostgREST embeds; `/api/clients?search=` returns only `id, full_name`. **Question:** Does Slice-2's B-2 Owner Portal Path A need contact info visibility (e.g., for "contact your PM" surface) OR is restoration deferred to Wave 1.1-Lite? **Recommended: DEFER to Wave 1.1-Lite.** Rationale: B-2 minimum-viable UI per Q4b is read-only progress + payment + documents; contact info is owner-side data the homeowner already has (their own email/phone). PM contact info surfaces from `profiles` table (subject to D-078 fence — PM's email/phone visible to admin/owner role). Slice-2 NOT the place to relax `clients` PII fence.

   **Deferral dependency-chain cost (per nwrp166 §20):**
   - **PM workflows affected (~4-8 week regression):** PMs creating new clients via the find-or-create UI in B-1a-bis cannot subsequently view that client's email/phone from any UI surface until Wave 1.1-Lite ships a `/clients/{id}` detail page with PII visible to PM role. Today: PM types client name → backend creates row → no UI to view the contact info they just (didn't) enter (B-1a-bis dropped the embedded `client_email`/`client_phone` per Q1 fence). Workaround: PM uses Drummond-style external contact records (email/CRM) until Wave 1.1-Lite.
   - **Owner-facing copy in B-2 UI affected:** if B-2 Owner Portal needs "Your PM is [name] — contact at [email/phone]" surface (likely homeowner expectation), the contact info must come from `profiles.email`/`profiles.phone` (subject to D-078 fence — accessible to admin/owner role, NOT homeowner via token). Homeowner sees PM name only, not contact info, until Wave 1.1-Lite adds explicit PM-contact surface (separate from clients PII restoration).
   - **TD-WB-WIZARD-CLIENT-CONTACT.md (Slice-1 deliberate regression doc)** stays open until Wave 1.1-Lite ships full /clients/{id} detail. The TD was opened during B-1a-bis ITER-2 §3.6 specifically anticipating this gap.
   - **Quantified blast:** estimated 4-8 weeks of "PM can't see client contact info from UI" until Wave 1.1-Lite onboards real RB homeowner usage. RB's current workflow (paper folders + Diane's spreadsheet) covers this gap during the regression window; no production user is currently dependent on UI-visible client contact info.

   Slice-2 NOT relaxing the fence preserves D-078 + D-079 + Q1 SOC2-CC6.1 posture; relaxing requires either column-level GRANT REVOKE or RLS-on-clients with explicit `SELECT (id, full_name)` policy for non-admin roles — both larger surface changes than Slice-2's stated scope accommodates.

5. **B-2 Owner Portal Path A — token rotation cadence?** Existing 00074 `client_portal_access` model supports tokens with expiration. **Question:** What's the desired token lifecycle for B-2? Options: (a) one-shot tokens regenerated per pay-app (high security, friction for homeowner); (b) long-lived tokens with manual revocation (low security, low friction); (c) auto-rotate every 90 days with one-click renewal (medium); (d) defer entirely to Wave 1.1-Lite where real RB homeowner usage surfaces requirements. **Recommended: (d) DEFER lifecycle decisions to Wave 1.1-Lite, with B-2 ship-time defaults = 1-year expiration + manual admin revocation.**

   **Orchestrator's preference + reasoning (per nwrp166 §22):** I prefer (d) over (a)/(b)/(c) because the lifecycle policy is fundamentally a homeowner-trust calibration question that benefits enormously from observing real RB usage (Andrew's actual conversations with Drummond homeowners about portal access friction vs. security). Decisions made now without that signal are policy theater. The 1-year default is conservative enough to be safe (not "forever") + low-friction enough to be testable (not "rotate every payment").

   **Deferral dependency-chain cost (per nwrp166 §20):**
   - **No PM/Owner regression in observation window:** B-2 ships with working tokens; homeowners can log in; no functionality gap.
   - **Wave 1.1-Lite carries the lifecycle-policy decision** as one of the early UX learnings from real-world Drummond/Anna Maria Island usage. Estimated trigger: 30-60 days into Wave 1.1-Lite production. NOT a hard blocker for Wave 1.1-Lite launch.
   - **Security posture during 1-year-default window:** acceptable per Q7 (SOC2-capable, no active pursuit). If first enterprise SOC2 trigger fires during this window, lifecycle revisit becomes blocking — but that's months out per Q7 trigger condition.
   - **One-shot tokens (option a)** would be the rigorous SOC2-aligned answer; rejected today for UX reasons documented above. Revisit trigger: enterprise customer asks.

   B-2 default in this slice: tokens have 1-year expiration (existing 00074 pattern) + manual revocation via admin UI. Document in B-2 README that lifecycle policy is a Wave 1.1-Lite open question.

6. **B-6 cost-code reseed — destructive timing.** D-020's wipe-and-reseed is destructive to current `org_cost_codes` rows (template rows preserved). **Question:** Apply during B-6 ship (production rows wiped) or defer cost-code reseed to a Wave 1.1-Lite migration where Diane (accounting) can verify the reseed matches her chart of accounts? **Recommended: SPLIT.** (a) B-6 ships the wipe-and-reseed for `org_id IS NULL` (templates) and `fixture-harness-org` only — these are safe to wipe. (b) Defer RB org's `org_cost_codes` wipe to Wave 1.1-Lite where Diane reviews the seed list before destructive apply. (c) Document the deferral in B-6 README. **Avoid: wiping RB's current `org_cost_codes` in an autonomous Slice-2 plan.**

7. **B-7 RB org seed posture — current vs net-new pattern.** Q10 A: `subscription_status='active'`, no Stripe customer ID, `trial_ends_at=NULL`. **Question:** Is RB's current `organizations` row already in this state (no-op seed) OR does it need to be updated? **Recommended: VERIFY at plan-author time via `mcp__supabase__execute_sql` query.** If already in state: B-7 documents the no-op + adds a check assertion to Layer 2 harness ("RB org has billing bypass posture"). If not: B-7 includes a single-row UPDATE in idempotent form (`WHERE org_id = RB_ORG_ID AND subscription_status != 'active'`).

8. **B-7 EXPLAIN ANALYZE — pass/fail threshold strict 100ms?** Q2 verification step: "any aggregation >100ms gets a trigger cache before Wave 1.1-Lite." **Question:** Strict 100ms ceiling OR margin (e.g., 100ms is target, alert at 150ms, block at 250ms)? **Recommended: STRICT 100ms with explicit document on margin.** Rationale: 100ms is the published target for "instant" UI; B-7 flags any >100ms for Wave 1.1-Lite engineering attention. Plan-author decides per-aggregation: cache (if >100ms) OR optimize indexing (if 100-150ms borderline). Document threshold rationale in B-7 README.

9. **Slice-2 ship order — strict sequential (B-2 → B-3 → B-4 → ... → B-7) OR parallel where safe?** (per nwrp166 §15: actual Rule 5 intersection matrix required before recommendation, not after.) Slice-1 was strict sequential. Slice-2's 6 plans have nominal independence per umbrella dependency map, but Rule 5 mandates mechanical files_modified intersection check BEFORE authorizing parallel dispatch — not after.

    **Current state:** B-2..B-7 plan files do NOT exist yet (only umbrella bullet-point scope in `.planning/expansions/stage-f1-knowledge-graph-auth-EXPANDED-SCOPE.md` §9). Without authored plan frontmatter, a true `files_modified` intersection cannot be computed mechanically. What follows is a **best-estimate intersection matrix** based on umbrella scope, intended to flag where parallel dispatch is at-risk pre-authoring — NOT a substitute for the mandatory mechanical check at plan-review iter-1.

    **Best-estimate matrix (B-4 ∩ B-5 ∩ B-6, the candidate parallel-dispatch trio):**

    | Pair | Probable shared files | Intersection severity |
    |---|---|---|
    | B-4 ∩ B-5 | `src/lib/activity-log.ts` (likely — B-4 extends entity_type union; B-5 webhook may log received-email events as activity_log row with `entity_type='document'`); `src/lib/audit/action-labels.ts` (entity_type Record mirrors activity-log.ts per Slice-1 §3.2 precedent); possibly `src/app/api/email-in/webhook/route.ts` if B-5 calls `logActivity` from webhook handler | **MEDIUM-HIGH** — if B-5 logs webhook receipts via activity_log, both plans touch the same Record + union. Concrete intersection only resolvable at plan-author time. |
    | B-4 ∩ B-6 | None expected. B-4 touches `src/lib/activity-log.ts` + API route write-sites; B-6 touches migration files + `.githooks/pre-commit` (Amendment 3 hook) + cost-codes seed data. Surfaces don't overlap. | **LOW** — likely empty intersection. |
    | B-5 ∩ B-6 | None expected. B-5 is mostly net-new files in `src/app/api/email-in/`, `src/lib/email/`; B-6 is migration + hook. Surfaces don't overlap. | **LOW** — likely empty intersection. |

    **Decision (per nwrp166 §15 framing):** Parallel dispatch authorization for B-4 + B-5 + B-6 is **PENDING — to be re-decided at plan-review iter-1 after authored plans expose actual files_modified lists.** The estimate above flags B-4 ∩ B-5 as the at-risk pair; plan-authors of B-4 and B-5 must surface concrete files_modified to plan-review iter-1, and the mechanical intersection check (per Rule 5) gates dispatch posture:

    - **If actual intersection is EMPTY:** parallel dispatch authorized.
    - **If actual intersection is NON-EMPTY:** sequential dispatch (B-4 → B-5 → B-6, OR worktree isolation with explicit merge protocol) is the default; bypass requires Jake authorization with documented rationale.

    **No recommendation for parallel dispatch is given in this EXPANDED-SCOPE.** Sequential B-2 → B-3 (B-3 trigger applies to B-2's new table) → B-4/B-5/B-6 (dispatch posture TBD at plan-review iter-1) → B-7 is the only sequencing this document authorizes pre-dispatch. The cost-saving from parallel (~2-3 days wall-clock) materializes only if the mechanical check is empty.

10. **Carry-forward MEDIUM-1 (PATCH /api/jobs missing org_id filter) — bundle into which Slice-2 plan?** Per Slice-1 carry-forward convention: MEDIUM-1 documented in B-1a-bis QA cross-reviewer agreement, NOT a TD entry. **Question:** Which Slice-2 plan bundles the fix? Candidates: (a) B-2 (touches jobs surfaces for Owner Portal); (b) B-4 (touches activity_log write-site coverage adjacent to jobs); (c) Standalone Slice-2 "carry-forward bundle" plan. **Recommended: (b) B-4.** Rationale: B-4 ships activity_log entity_type extension which audits clients-related state changes; PATCH /api/jobs is a write surface that already touches activity_log via `logActivity`. One commit; tight surface; minimal additional review burden.

11. **TD-B1abis-01/02/03 + W.1 listener unflag — distribute across existing Slice-2 plans (DISTRIBUTE, NOT BUNDLE per nwrp166 §7).** Four small carry-forward items need landing somewhere in Slice-2. **Decision (per nwrp166 amendment to original recommendation):** DISTRIBUTE into existing plans rather than create new B-8 bundle plan. Bundle approach creates iter-1 review difficulty (4 unrelated diffs in one review) + any-item-blocks-bundle risk (one finding holds 3 other items hostage). Distribution map:

    | Carry-forward | Lands in | Rationale |
    |---|---|---|
    | TD-B1abis-01 (find-or-create race, ~5 lines) | **B-4** | B-4 already touches activity_log write-sites + the carry-forward MEDIUM-1 fix at `src/app/api/jobs/route.ts`; the `resolveClientId` find-or-create branch is in the same file. Tight surface; one-commit addition. |
    | TD-B1abis-02 (GIN trigram index, ~1 line of migration SQL) | **B-4** | B-4 ships no new migration in current scope; adding `CREATE INDEX idx_clients_full_name_trgm` as a minor companion migration keeps B-4's footprint coherent (audit log + client query infra both feed UX of /api/clients endpoint). Alternative: B-6 (cost-code reseed) also ships a migration; defer to plan-author choice. |
    | TD-B1abis-03 (ClientCombobox F1+F2 token polish, ~10 lines) | **B-2** | B-2 is the Owner Portal Path A plan = natural home for client-related UI polish. ClientCombobox is the client-search component that the Owner Portal won't even render (read-only homeowner view), but B-2's plan-author is reading client UI code anyway; the polish lands cleanly in their existing context. |
    | W.1 listener unflag (env-var addition + observation-window check) | **standalone single-commit in B-3 OR B-4** | This is an env-var addition (`NEXT_PUBLIC_AUTH_STATE_LISTENER=true` in Vercel Production + Preview), NOT a code change. Lands as one atomic commit in whichever of B-3/B-4 ships first AFTER the observation window closes (1-2 weeks post-Slice-1 ship + Sentry green + smoke clean). Plan-author of B-3 (or B-4 if B-3 ships before observation window closes) adds an env-var-step task with explicit verification gate. |

    **Net effect:** Slice-2 stays at 6 plans (B-2..B-7); no new B-8 plan; faster iter-1 review per plan; atomic commits preserve rollback boundaries. Each carry-forward gets its own focused review surface within the host plan's existing scope.

12. **B-3 DEF-WC-3 partial — ARCHITECTURE.md RLS posture summary table — full table OR phased?** DEF-WC-3 partial scope per umbrella: "RLS posture summary table by entity" (single source of truth across all tenant tables). **Question:** Full table including ALL 25 tenant tables (high authoring cost, comprehensive) OR phased table covering only the entities touched by Slice-1/Slice-2 + a note "remaining tables documented in Wave-B0/F2"? **Recommended: FULL TABLE.** Rationale: the gap that DEF-WC-3 closes (Wave-C profiles-wide-open misconception per nwrp118 Item 4) was a reviewer-side knowledge gap that a comprehensive table prevents. Phased table leaves the same gap for non-touched tables. Authoring cost: ~1 hour for ~25 tables × 5 columns (entity, RLS policies, scope-axis Q10b, fixture coverage Q9 D, retention class). Output: ARCHITECTURE.md new §X with table.

---

## 7. Recommended scope expansion

**Stated (per nwrp165 + umbrella mapping):** B-2 through B-7 — 6 plans.

**Recommended phase scope (matches stated, with explicit additions captured below):**

1. **B-2 — `client_portal_access.client_id` FK + Owner Portal Path A min UI + 1-2 audit integration points + TD-B1abis-03 carry-forward** [Q4b + Slice-1 carry-forward per nwrp166 §10]
   - Migration: ADD `client_id UUID REFERENCES clients(id) ON DELETE SET NULL` to `client_portal_access`; backfill from existing `client_portal_access.job_id → jobs.client_id`; partial unique index `(org_id, client_id, deleted_at IS NULL)` to prevent duplicate active tokens per client.
   - UI: minimum-viable `/owner/{token}` route — read-only progress + payment status + document downloads. Mobile-mandatory per F1+-4. NO new role; token-based auth.
   - Audit: 1-2 owner-initiated actions wire `actor_token_id` (e.g., pay-app acknowledgment via signed receipt).
   - **Carry-forward (per nwrp166 distribute pattern):** TD-B1abis-03 — replace inline `boxShadow: "0 4px 12px rgba(0,0,0,0.08)"` + inline `style={fontFamily, color}` on `src/components/client-combobox.tsx` with shadow-elevation token + utility classes mirroring cost-code-combobox.tsx label idiom (~10 lines). Lands here because B-2 plan-author is reading client UI code anyway; tight surface; one-commit polish addition.
   - Threat model: medium (external token surface; mobile-first; first user-facing F1 UI). Plan-review iter-1 includes nightwork-design-pushback for the new UI pattern (likely new PATTERNS.md "Owner Status View" entry).

2. **B-3 — Soft-delete DB-trigger safety net + user-identity-threading convention + DEF-WC-1 + DEF-WC-3 partial + W.1 listener unflag (conditional)** [Q6 F + DEF-WC-1 + DEF-WC-3 + Slice-1 carry-forward per nwrp166 §11]
   - 1 `SECURITY DEFINER` function + per-table triggers on ~25 tenant tables (per ENTITY-INVENTORY.md tenant-scope inventory).
   - User-identity-threading: `current_setting('app.current_user_id', true)` populated by `getCurrentMembership()` per Q above; trigger reads setting + writes `activity_log.user_id` (NULL marker on service-role).
   - DEF-WC-1: `org_members` RESTRICTIVE `"org isolation"` backstop policy mirroring 00049 canonical pattern with `(SELECT ...)` session-cache wrapping.
   - DEF-WC-3 partial: ARCHITECTURE.md "RLS posture summary table by entity" — full table (per Q12 above) covering ~25 tables × 5 columns.
   - **Carry-forward (per nwrp166 distribute pattern; conditional on observation-window timing):** W.1 listener unflag — env-var addition `NEXT_PUBLIC_AUTH_STATE_LISTENER=true` in Vercel Production + Preview. Lands in B-3 IF the 1-2 week observation window post-Slice-1 ship closes before B-3 dispatches (Sentry green + smoke clean over the window). If observation window still open at B-3 ship time, defer to B-4. Standalone single-commit; one explicit verification gate task in plan body. NOT a code change.
   - Threat model: HIGH (trigger function fires on every tenant table; SECURITY DEFINER privilege; cross-tenant leak if poorly authored). Plan-review iter-1 mandatory: security-reviewer + multi-tenant-architect + database-reviewer + rls-auditor.

3. **B-4 — `activity_log.entity_type` TS union extension + write-site coverage + MEDIUM-1 + TD-B1abis-01 + TD-B1abis-02 + W.1 listener unflag (conditional)** [Q6 F + Slice-1 carry-forwards per nwrp166 §10-11]
   - `src/lib/activity-log.ts:36` ActivityEntityType TS union: + `'lien_releases'`, `'proposals'`, `'client_portal_access'`; remove `'budget'` (Q10c). NOTE: `'client'` already added in Slice-1 B-1a-bis iter-3 §3.2.
   - `src/lib/audit/action-labels.ts:51` ENTITY_LABELS Record extended in lockstep (per Slice-1 iter-3 §3.2 precedent — downstream-consumer-sweep mandatory).
   - Write-site coverage: every CREATE/UPDATE/state-change API route for new F1 entities (clients ✓ Slice-1, lien_releases, proposals, client_portal_access) calls `logActivity` at appropriate points.
   - **Carry-forward 1 (per nwrp166 distribute pattern):** MEDIUM-1 PATCH /api/jobs lines 373-377 missing `.eq("org_id", membership.org_id)` filter (B-1a-bis cross-reviewer agreement, per Q above #10).
   - **Carry-forward 2 (per nwrp166 distribute pattern):** TD-B1abis-01 — find-or-create race condition fix in same file (`src/app/api/jobs/route.ts` `resolveClientId` at line 58-102). Catch unique-violation error code `23505` from the INSERT call + re-run the find branch + return the resolved id rather than surfacing duplicate-key 500. ~5 lines of code; tight surface to the MEDIUM-1 fix (same file).
   - **Carry-forward 3 (per nwrp166 distribute pattern):** TD-B1abis-02 — `CREATE INDEX idx_clients_full_name_trgm ON public.clients USING gin (full_name gin_trgm_ops) WHERE deleted_at IS NULL;` as a minor companion migration to B-4's no-migration-otherwise plan. Keeps B-4's footprint coherent (audit log + client query infra both feed UX of `/api/clients` endpoint). Alternative: defer to B-6's existing migration if plan-author prefers grouped migration commits.
   - **Carry-forward 4 (per nwrp166 distribute pattern; conditional on observation-window timing):** W.1 listener unflag — env-var addition `NEXT_PUBLIC_AUTH_STATE_LISTENER=true` in Vercel Production + Preview. Lands in B-4 IF B-3 shipped before the observation window closed (i.e., B-3 didn't land this carry-forward). Standalone single-commit; one explicit verification gate task in plan body. NOT a code change.
   - Threat model: low (additive type extension + write-site sweep + one application-layer defense-in-depth fix + one bounded-retry catch + one trigram index migration + one env-var addition).

4. **B-5 — Magic-link primitive + email-in receiving primitive (Amendment 2)** [ARCHITECTURE §6 F1 + Amendment 2]
   - F1 email-in primitive MVP: `/api/email-in/webhook` Resend webhook receiver; stores received emails as `documents` rows with raw_payload preserved; idempotent on Resend event_id; signature-verified per Q above #3; rate-limited.
   - Magic-link primitive: email-delivery wrapper (Resend `send` API helper) + token-generation helper (signed JWT or DB-stored token, mirror 00074 pattern). For F4 reuse (Architect/Inspector RFI, Sub Portal).
   - Does NOT: parse email content, route to invoice pipeline, establish MX records, replace internal password login.
   - Threat model: high (external-facing webhook; token-generation; potential replay attack via Resend event ID reuse). Plan-review iter-1 mandatory: security-reviewer.

5. **B-6 — Cost-code wipe-and-reseed + fixture-maintenance contract Amendment 3** [D-020 + Q9 + Amendment 3]
   - D-020 wipe-and-reseed: SPLIT per Q above #6. Slice-2 ships templates (`org_id IS NULL`) + fixture-harness-org. RB org's cost_codes deferred to Wave 1.1-Lite with Diane review.
   - Amendment 3: pre-commit hook OR plan-review BLOCKING check verifying every tenant-scoped CREATE TABLE migration includes fixture-harness-org INSERT. Implementation: extend `.githooks/pre-commit` or `.claude/hooks/nightwork-post-edit.sh` with regex matching CREATE TABLE + org_id + matching INSERT.
   - Layer 2 fixture-coverage assertion (already shipped in B-1b) is the CI counterpart; Amendment 3 hook is the commit-time gate.
   - Threat model: low (additive seed + hook addition; explicit deferral of RB destructive apply).

6. **B-7 — RB org seed + Stripe test-mode sanity + EXPLAIN ANALYZE + remaining harness** [Q10 + Q2 + Q8 + F1+-4]
   - RB org seed migration: idempotent update of `organizations` row for RB (per Q above #7 — verify state, no-op if already in state). `subscription_status='active'`, no Stripe customer ID, `trial_ends_at=NULL`.
   - Stripe test-mode sanity check: verify 3 API routes (webhook, portal, checkout) work against current schema/RLS in test mode. NO code changes expected; verification only.
   - Q2 verification step: `EXPLAIN ANALYZE` on 4 candidate aggregations (`jobs.approved_cos_total` / `jobs.total_committed` / `vendors.balance_outstanding` / `jobs.current_contract_amount`); threshold per Q above #8 (strict 100ms).
   - Remaining harness extensions: multi-viewport per F1+-4 + behavioral test category (if not absorbed into B-1b per hybrid A/C decision from Slice-1).
   - Threat model: medium (production schema touched via RB seed; multi-viewport harness adds runtime cost to CI).

**Note on plan count (per nwrp166 §13):** Slice-2 = 6 plans (B-2..B-7). No new B-8 bundle plan. Slice-1 carry-forwards distributed per Q11 distribution map: TD-B1abis-01 → B-4, TD-B1abis-02 → B-4 (or B-6 per plan-author), TD-B1abis-03 → B-2, MEDIUM-1 → B-4, W.1 listener unflag → B-3 OR B-4 (whichever ships after observation window closes).

**Cross-slice additions:**

- Pre-flight downstream-consumer-sweep MANDATORY in all 6 plans per `.planning/lessons.md` 2026-05-15 entry.
- All Slice-2 plans inherit Wave-B prereq #12 smoke gate (≤2 failures matching TD-WE-03 set; B-2 Owner Portal Path A extends route table — sweep + smoke route table update mandatory).
- Threat model severity at each plan called out above; plan-review iter-1 dispatch matches (security-reviewer for B-3/B-5; multi-tenant + rls + database for B-3; design-pushback for B-2).
- Cost-discipline pattern from Slice-1 carries forward: ceiling per slice (NOT per plan); halt-and-trim if mid-flight cost approaches ceiling.

**Out of scope (deferred):**

- Full Owner Portal feature set (notifications, comments, signature workflows, ongoing engagement) → Wave 1.1-Lite or later per Q4b umbrella resolution.
- AI parsing of inbound email content → Wave 3 per GAP item 21 (B-5 ships webhook → storage only).
- MX record routing for accounting@rossbuilt.com inbox → Wave 3.
- Production Stripe webhook URL → F1+-1 production domain decision dependency.
- RB org `org_cost_codes` destructive wipe → Wave 1.1-Lite per Q above #6 split.
- Wave-A iter-1 search_path sweep — handled per nwrp165 deliverable #5 as separate authored plan (NOT bundled with B-3).
- F2 employees + role_definitions registry → F2 (canonical phase).
- WI-XXX bulk validator implementation beyond Slice-1's 3 exemplars → F2-F5 ramp.

**Acceptance criteria target (preview — final criteria locked in /gsd-discuss-phase Slice-2):**

- [ ] B-2 migration applied; `client_portal_access.client_id` FK exists with `ON DELETE SET NULL`; partial unique index in place; Drummond's token row backfilled with non-NULL `client_id`.
- [ ] B-2 Owner Portal Path A renders against Drummond's token in fixture-harness-org; mobile viewport (iPhone 14 Pro Max + Pixel 7) per F1+-4 passes Layer 3 visual check.
- [ ] B-2 audit integration: pay-app acknowledgment writes `activity_log` row with `actor_token_id` populated.
- [ ] B-3 trigger function deployed on all ~25 tenant tables; trigger writes activity_log on every soft-delete; representative manual test fires for each entity type.
- [ ] B-3 DEF-WC-1 RESTRICTIVE backstop policy on `org_members`; cross-org leak test (impersonate user from org A, query `org_members` for org B) returns 0 rows.
- [ ] B-3 DEF-WC-3 ARCHITECTURE.md RLS posture summary table covers ~25 tenant tables with 5 columns each.
- [ ] B-4 `entity_type` TS union extended; ENTITY_LABELS Record extended in lockstep; write-site coverage adds `logActivity` calls to all new F1 entity create/update sites.
- [ ] B-4 carry-forward MEDIUM-1: `PATCH /api/jobs` lines 373-377 has `.eq("org_id", membership.org_id)` filter.
- [ ] B-5 Resend webhook receives test event; stores as `documents` row with `kind='email_in'`; idempotent on Resend event_id; rejects request without valid signature.
- [ ] B-5 magic-link primitive sends test email via Resend `send` API; generates valid signed token via helper.
- [ ] B-6 cost-code reseed applies for templates + fixture-harness-org; RB cost_codes UNTOUCHED (deferred to Wave 1.1-Lite).
- [ ] B-6 Amendment 3 hook: synthetic test migration without fixture INSERT fails the hook; synthetic test migration WITH fixture INSERT passes.
- [ ] B-7 RB org seed: `organizations` row has `subscription_status='active'`, `trial_ends_at=NULL`; idempotent (re-apply is no-op).
- [ ] B-7 Stripe test-mode: webhook + portal + checkout routes verified against current schema; Sentry tags continue to populate.
- [ ] B-7 EXPLAIN ANALYZE: 4 candidate aggregations measured; any >100ms surfaced for Wave 1.1-Lite trigger cache decision; results documented in B-7 README.
- [ ] B-7 multi-viewport harness: F1+-4 AC-1-12 Layer 3 standards shipped + passing on fixture-harness-org.
- [ ] B-2 TD-B1abis-03: ClientCombobox `boxShadow` + inline style replaced with shadow token + utility classes.
- [ ] B-4 TD-B1abis-01: `resolveClientId` catches `23505` + re-finds; integration test with two concurrent identical-name inserts shows no 500.
- [ ] B-4 TD-B1abis-02: `idx_clients_full_name_trgm` exists post-migration; EXPLAIN ANALYZE shows GIN index used on representative `/api/clients?search=` query.
- [ ] B-3 or B-4 (whichever ships after observation window closes) W.1 listener unflag: `NEXT_PUBLIC_AUTH_STATE_LISTENER=true` in Vercel Production + Preview; Sentry shows no auth-state-change error rate spike during the 7 days post-unflag.
- [ ] All 6 plans cite source_decisions in frontmatter per nwrp152 convention.
- [ ] Plan-review iter-1 passes on all plans without cross-reviewer factual disagreement (per nwrp118 HALT gate).
- [ ] Smoke harness post-slice run shows ≤2 failures matching TD-WE-03 set (Wave-B prereq #12 maintained).

---

## 8. Plan dependency map

```
                  Slice-1 closes (B-1b ships)
                          │
                          ▼
         ┌────────────────┴────────────────┐
         │  GATE 2 HALT (post-B-1b, per nwrp152)  │
         │  Jake review: validator structure,     │
         │  Layer 2 standards, types pipeline     │
         └────────────────┬────────────────┘
                          │
                          ▼
                  /np stage-f1-knowledge-graph-auth-wave-b-slice-2
                          │
                          ▼
                  Plan-review iter-1 (all 6 plans)
                          │
                          ▼
                  B-2 (Owner Portal + TD-B1abis-03 carry-forward)
                          │
                          ▼
                  B-3 (depends on B-2's new table for trigger application;
                       + W.1 unflag IF observation window closed)
                          │
                          ▼
                  ┌───────┴───────┐
                  │       │       │
                  ▼       ▼       ▼
                B-4     B-5     B-6
              (logging  (magic  (cost-code
              + 4       link)   reseed)
              carry-
              forwards)
                  │       │       │
                  └───────┴───────┘
                          │
                          ▼
                  B-7 (RB seed + Stripe + EXPLAIN + remaining harness)
                    │
                    ▼
               /nightwork-qa (Slice-2 close)
                    │
                    ▼
               Wave-B-Slice-1 + Slice-2 complete
                    │
                    ▼
            Wave 1.1-Lite kickoff
```

**Strict-sequential edges:**
- Slice-1 (B-1b) ships BEFORE Slice-2 dispatches.
- B-2 BEFORE B-3 (B-3 trigger applies to B-2's new `client_portal_access.client_id` FK shape).
- B-7 LAST (verifies F1 foundation end-to-end via EXPLAIN ANALYZE + multi-viewport + RB seed).

**Parallel-safe edges (PENDING per Rule 5 actual files_modified intersection check at plan-review iter-1; per nwrp166 §15):**
- B-4 + B-5 + B-6 — nominally independent per umbrella scope; ACTUAL parallel-dispatch authorization deferred until authored plans expose concrete `files_modified` lists and mechanical intersection check runs at plan-review iter-1. See Q9 above for best-estimate intersection matrix.

**Rule 5 pre-dispatch check:** mechanical grep across all parallel-claimed plans' `files_modified`. Any non-empty intersection → force sequential OR worktree isolation. Authored plans MUST declare `parallel_execute_ok: true` only if confident; the matrix from Q9 flags B-4 ∩ B-5 as the at-risk pair to verify carefully at plan-review.

---

## 9. Halt gates (architectural decisions vs autonomous execution)

Per nwrp152 + nwrp164 disciplined posture:

- **HALT GATE 0 (pre-Slice-2):** Slice-1 must fully ship (B-1b complete + GATE 2 HALT review done) BEFORE Slice-2 dispatches. Authoring this EXPANDED-SCOPE during Slice-1's mid-flight halt is fine; **dispatch** of Slice-2 requires Slice-1 closure.

- **HALT GATE 1 (post-B-3):** B-3 trigger application across ~25 tenant tables + DEF-WC-1 RESTRICTIVE backstop + DEF-WC-3 RLS posture summary table is the largest architectural change in Slice-2. Manual verification:
  - Trigger fires on each tenant table soft-delete (representative test per table — script-driven).
  - RESTRICTIVE policy on `org_members` blocks cross-org reads (impersonation test).
  - RLS posture summary table accurate against live `pg_policies` (mechanical diff).
  Jake reviews before B-4/B-5/B-6 dispatch.

- **HALT GATE 2 (post-B-5):** B-5's Resend webhook is the first external-facing endpoint in F1 (per Q above #3 signature verification + rate limiting + idempotency). Verify:
  - Resend test event lands as `documents` row.
  - Signature verification rejects unsigned/badly-signed requests (security test).
  - Idempotency: same Resend event_id replayed = no-op on second call.
  Jake reviews before B-6/B-7 dispatch.

- **HALT GATE 3 (post-B-7, Slice-2 close):** /nightwork-qa final + smoke 11/13 verification + EXPLAIN ANALYZE results review. If any aggregation >100ms surfaced, Jake decides per-aggregation Wave 1.1-Lite trigger cache vs index optimization. Slice-2 closes only after Jake explicit sign-off.

- **Cross-cutting HALT (per nwrp118):** any plan-review iter-1 with cross-reviewer factual disagreement HALTS for Jake. Slice-2's high blast radius (6 plans × multiple reviewer cycles) makes this gate more likely than Slice-1.

- **Cost-discipline HALT (per nwrp164 / nwrp165):** if mid-Slice-2 cost approaches ceiling, halt + trim QA scope OR halt for fresh session. Do NOT bump ceiling autonomously.

---

## 10. Cost projection (Slice-1 actuals → Slice-2 forward estimate)

**Slice-1 actuals (per interim-state doc 2026-05-15-NIGHT.md §3):**

| Plan | Spend |
|------|-------|
| B-D080 | ~$8 |
| B-1a | ~$15 |
| B-1a-bis (with rework + hook precision refactor + 9-reviewer QA) | ~$40 |
| Bundle fix + docs + smoke + bootstrap (this session post-QA) | ~$3 |
| **Slice-1 total to-date** | **~$66-68** |
| B-1b (projected, deferred to fresh session) | ~$33-65 |
| **Slice-1 projected complete** | **~$100-133** |

**Slice-1 per-plan mean (4 plans):** ~$22 (including B-1b projection middle). Excluding the B-1a-bis $40 high outlier (rework + hook precision + 9-reviewer QA): ~$13 mean.

**Slice-2 forward estimate (6 plans per nwrp166 §13 — no B-8):**

| Plan | Estimate | Reasoning |
|------|----------|-----------|
| B-2 | $22-33 | UI + migration + threat-model-medium plan-review + TD-B1abis-03 ClientCombobox polish carry-forward (+$2-3) |
| B-3 | $35-50 | HIGH threat model, security + multi-tenant + rls + database reviewers; trigger function affects ~25 tables; DEF-WC-3 RLS summary table authoring (~1hr); + W.1 unflag carry-forward IF observation window closed (+$1-2 env-var only) |
| B-4 | $15-25 | Additive type extension + write-site sweep + MEDIUM-1 fix + TD-B1abis-01 race-catch + TD-B1abis-02 trigram migration + W.1 unflag (alt to B-3); 5 carry-forwards inflate from $10-15 baseline to $15-25 (+$5-10) |
| B-5 | $25-35 | External webhook + security reviewer + idempotency + token-gen |
| B-6 | $15-20 | Hook addition + reseed migration + Layer 2 assertion |
| B-7 | $20-30 | RB seed + Stripe verification + EXPLAIN + multi-viewport harness |
| **Slice-2 total estimate** | **$132-193** | 6-plan range; reflects nwrp166 distribute pattern (carry-forwards inflate B-2 + B-3 + B-4 by ~$8-15 vs pre-distribute estimate) |

**Recommended ceiling:** $200 for Slice-2 with buffer. Permits absorbing 1-2 plan rework events (like Slice-1's B-1a-bis) without triggering bump-or-halt decisions. Per nwrp164 discipline: NO autonomous bumps; halt + surface if ceiling hit.

**Per-plan halt gate (per nwrp166 §17):** **If any individual plan projects >$50 mid-authoring, halt for Jake re-scope. Do NOT plan-author through it.** Slice-1's B-1a-bis blew the $40 line because the per-plan gate didn't exist; Slice-2's B-3 estimate ($35-50) sits at this gate's boundary — plan-author MUST surface to Jake if scope expands past $50 during /np dispatch rather than continuing to author. Trigger conditions:
- B-3 trigger application surfaces >5 tenant tables needing per-table opt-in (vs blanket trigger).
- DEF-WC-3 RLS posture summary table authoring surfaces >30 tables (vs estimated ~25).
- Wave-A iter-1 search_path sweep (per Q1) surfaces >8 functions needing individual review (vs estimated 8 per nwrp165 deliverable #5).
- B-5 Resend signature verification needs custom HMAC implementation (vs Svix-library reuse).

Plan-author halt-and-surface pattern: write the partial plan to disk, surface to Jake with cost projection update + scope-reduction options, halt for re-scope authorization. Do NOT continue authoring through the $50 threshold.

**Trim-as-you-go scopes (if mid-flight, applied AFTER per-plan halt gate decision):**
- Skip enterprise-readiness/compliance/multi-tenant on plans without those surfaces (B-4, B-6 candidates).
- Skip design-pushback on plans without UI changes (B-3, B-4, B-5, B-6, B-7 candidates).
- Keep ALWAYS: spec-checker, custodian, security-reviewer, ai-logic-tester.

---

## 11. Risks and assumptions

| Risk | Mitigation |
|---|---|
| B-3 trigger function performance impact at scale | EXPLAIN ANALYZE on a representative tenant-table soft-delete; verify trigger overhead <5ms. If higher, plan-author surfaces per-table opt-in vs blanket application. |
| `current_setting('app.current_user_id', true)` middleware threading misses some code paths (e.g., direct service-role usage) | B-3 plan-author surveys all Supabase client creation sites; documents any path that doesn't thread the setting (service-role inserts, scheduled jobs); trigger writes NULL with marker rather than failing. |
| DEF-WC-1 RESTRICTIVE backstop subtly breaks existing PERMISSIVE policies | Plan-review iter-1 verifies RESTRICTIVE intersects PERMISSIVE correctly (AND-logic); ai-logic-tester runs representative queries from org-A user perspective + org-B user perspective. |
| B-5 Resend webhook signature verification implementation gap | Q above #3 surfaces this; plan-author verifies against Resend docs at /np time; security-reviewer iter-1 mandatory. |
| B-5 `documents` table missing necessary columns for raw_payload preservation | Plan-author surveys `documents` schema at /np time; if `raw_payload JSONB` column missing, B-5 migration adds it; document import-shape preservation in B-5 README. |
| B-6 D-020 cost-code reseed inadvertently wipes RB production rows | SPLIT per Q above #6 enforced at plan-author time; B-6 migration ONLY touches `org_id IS NULL` (templates) + fixture-harness-org. WHERE clause MUST exclude RB_ORG_ID. Plan-review iter-1 verifies. |
| B-7 EXPLAIN ANALYZE reveals existing aggregation >100ms requiring trigger cache before Slice-2 ships | Per Q above #8 — surface to Jake; per-aggregation decision (cache vs optimize vs accept). B-7 may need to ship a trigger cache migration as part of Slice-2 to maintain Wave 1.1-Lite readiness. Document as Q-handoff if discovered. |
| B-2 Owner Portal Path A introduces new UI pattern not in PATTERNS.md | Plan-review iter-1 includes nightwork-design-pushback; if pattern is novel, plan-author adds "Owner Status View" entry to PATTERNS.md as part of B-2 scope. |
| Slice-2 dispatched before Slice-1 closes (B-1b shipped) | Hard prereq #1; preflight check verifies; explicit gate in §9. |
| Parallel dispatch of B-4 + B-5 + B-6 surfaces Rule 5 files_modified intersection | Mechanical grep at /np time; any intersection forces sequential OR worktree isolation. |
| Slice-1 carry-forwards (MEDIUM-1 + TD-B1abis-*) drift / get forgotten | Q above #10 routes MEDIUM-1 to B-4 specifically; Q above #11 distributes TDs per nwrp166 amendment (TD-B1abis-01 → B-4, TD-B1abis-02 → B-4, TD-B1abis-03 → B-2, W.1 unflag → B-3 OR B-4). Distribution map embedded in §1 Mapped entities table + §7 Recommended scope per-plan breakdown + §11 Acceptance criteria, so Slice-2 plan-authors find each carry-forward at multiple checkpoints. |
| B-3 SECURITY DEFINER function bypasses RLS incorrectly (writes activity_log to wrong org) | Trigger reads `row.org_id` (the row being soft-deleted) and writes `activity_log.org_id = row.org_id`. Plan-review iter-1 verifies trigger function body. Layer 2 audit-conservation assertion catches any cross-org leak. |
| Wave-A iter-1 search_path sweep bundled with B-3 (per Q above #1) blows up scope | If sweep surfaces >5 functions needing review, surface to Jake at plan-author time; option to ship separately as Slice-2 plan B-9 OR defer to Wave-A iter-1 cleanup plan per nwrp165 deliverable #5. |
| W.1 listener unflag (B-3 or B-4 per nwrp166 distribute pattern) surfaces auth-state regression in production | Observation window (1-2 weeks of Slice-1 green + Sentry clean + smoke 11/13 baseline) gates unflag. If any anomaly surfaces, halt unflag + revert env var (env-var only, no code change to revert). |

**Assumptions:**

1. nwrp165 cost ceiling for the weekend ($40) does NOT carry forward into Slice-2's dispatch budget. Slice-2 gets its own $200 ceiling per Q above + cost projection §10.
2. Slice-1 closes with B-1b + GATE 2 HALT review approved per current trajectory.
3. Resend account is in good standing; domain verification + DNS records can be completed Jake-side before B-5 dispatch.
4. Stripe test mode price IDs can be populated in Vercel env vars before B-7 dispatch (Jake-side manual action; MANUAL-CHECKLIST item).
5. `current_setting('app.current_user_id', true)` middleware threading does NOT require schema migration (Postgres-side feature only; setting is session-local).
6. Drummond + fixture-harness-org fixture data remains intact through B-1b ship (no destructive Wave-A iter-1 cleanup ships in the interim).
7. ARCHITECTURE.md is in a state that can absorb the new RLS posture summary section without major restructuring.
8. The post-B-1b GATE 2 HALT does NOT surface a Slice-2 scope change. If it does, this EXPANDED-SCOPE is re-amended before /np dispatches Slice-2.

---

## 12. Hand-off

After Jake reviews this expansion (and amends if needed):

1. **Approve (or amend):** Mark Status from DRAFT → APPROVED with date.
2. **Slice-1 closes first.** Resume Slice-1 with B-1b execute + QA + GATE 2 HALT review per nwrp164 sequence in `INTERIM-STATE-2026-05-15-NIGHT.md` §6.
3. **Run `/nightwork-init-phase stage-f1-knowledge-graph-auth-wave-b-slice-2`** (or equivalent) to:
   - Capture any stated-scope additions from Jake (verbatim).
   - Run `/nightwork-auto-setup` to verify AUTO infrastructure (Resend domain ✓ / Stripe price IDs ✓ / fixture data intact ✓ etc.).
   - Surface MANUAL-CHECKLIST items (Resend MX, Stripe price IDs, env-var population).
4. **Run `/np stage-f1-knowledge-graph-auth-wave-b-slice-2`** to dispatch discuss-phase + plan-phase + plan-review.
5. **Plan-review iter-1 + iter-2 cycle** per CLAUDE.md Workflow posture. Cross-reviewer factual disagreements HALT per nwrp118.
6. **/nx dispatches per dependency map** in §8. Parallel-where-safe per Rule 5 intersection check.
7. **Halt gates** at end of B-3 + B-5 + B-7 per §9.
8. **Slice-2 closes** when GATE 3 HALT approved + smoke 11/13 baseline maintained.

After Slice-2 closes, the full F1 Wave-B is done. Wave 1.1-Lite kicks off per ARCHITECTURE.md §6 canonical phase plan.

---

**Weekend authoring notes (per nwrp165 path-a + nwrp166 amendments):**
- This document is deliverable #1 of 5 weekend deliverables. Surface for Jake re-review post-nwrp166 amendments; HALT before proceeding to #2 (lessons.md retrospective).
- Zero code touched; zero migrations; zero destructive operations.
- Authoring spend estimate (original): ~$3-5 (substantial scope document; large file write).
- Revision spend estimate (nwrp166 amendments): ~$2-4 (multiple surgical Edit calls; no new sections).
- Total deliverable #1 spend: ~$5-9 of $40 weekend ceiling.
- If Jake amends substantially, re-author this document via Edit/Write; do NOT amend via /np (the amend cycle is for after Slice-2 dispatches).
