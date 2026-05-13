# F1 — Knowledge Graph Schema + Auth Foundation — EXPANDED-SCOPE

**Status:** DRAFT — Q&A complete (Q1-Q12 + Q4b + Q10b + Q10c resolved). Pending Jake authorization to proceed to Plan files. Per nwrp97 stop-after-expansion protocol: HALT here for review.
**Phase name:** `stage-f1-knowledge-graph-auth`
**Source prompt:** `C:\Users\Jake\Downloads\nwrp97.txt`
**Initiated:** 2026-05-12
**Owner:** Jake Ross
**Drift-check:** `.planning/drift-checks/2026-05-12-1700-f1-knowledge-graph-auth-expansion-init.md` (PASS)
**Canonical references:**
- `.planning/MASTER-PLAN.md` §12 NEXT PLANNED WORK Stage 2 / F1 (line 346-354)
- `.planning/architecture/ARCHITECTURE.md` §6 (revised phase plan) + §7 (SOC2 control mapping) + §8 (Owner Portal F1 auth path constraint)
- `.planning/architecture/ENTITY-INVENTORY.md` (31+ entities with F-N when shipped + Retention class + PII?)
- `.planning/architecture/ROLES-CATALOG.md` (15+ default roles; F2 wires)
- `.planning/architecture/WORKFLOW-INTELLIGENCE.md` (39 cross-entity validation patterns — D-066 / D-071)
- `.planning/architecture/VERIFICATION-PIPELINE.md` (3-layer harness — D-073)
- DECISIONS LOG D-001..D-077 (esp. D-022, D-024, D-027, D-049, D-050, D-051, D-058, D-066, D-067, D-068, D-071, D-073, D-077)
- F1+ deferred decisions (F1+-1 prod domain, F1+-2 prod SSO posture, F1+-4 AC-1-12 Layer 3 ambiguity)

---

## Stated scope (verbatim from nwrp97)

> F1 Phase Expansion — Knowledge Graph + Auth
>
> Three F1+ decisions captured pre-Wave-1.1-Lite (non-blocking for F1 development):
> - F1+-1: Production domain (nightwork.build vs subdomain) — pending Jake decision before Wave 1.1-Lite launch
> - F1+-2: Production SSO posture — pending Jake decision before Wave 1.1-Lite launch
> - F1+-4: AC-1-12 Layer 3 ambiguity — folds into F1 harness extension work
>
> Carry-forward from 1.5c-vh + 1.5c-IA:
> - useCurrentRole onAuthStateChange listener pre-positioned via W.1 bridge (env-gated setSession in client.ts); once F1 adds listener, W.1 becomes immediately effective without further harness work
> - src/middleware.ts:179 NODE_ENV → VERCEL_ENV (already shipped during harness phase QA)
> - WI-004 cost-code-per-line-item criterion (now reachable since 1.5b prototype-gallery merged to main)
>
> Next major phase per MASTER-PLAN roadmap: F1 — Knowledge Graph + Auth foundation.

---

## What's already canonically locked (pre-Q&A baseline)

Per ARCHITECTURE.md §6 + ENTITY-INVENTORY.md + standing rules in CLAUDE.md, the following are NOT open for Q&A — they're inputs to F1:

1. **Multi-tenant RLS-by-construction.** Every tenant table has RLS enabled; every API filters by `getCurrentMembership()`; tenant safety is built BY CONSTRUCTION, not enforcement. (CLAUDE.md "Nightwork standing rules" + D-30.)
2. **Every record carries `id`, `created_at`, `updated_at`, `created_by`, `org_id`, `deleted_at` (soft delete).** (CLAUDE.md "Architecture Rules".)
3. **Audit log (`activity_log`) uses Strategy 1-prime** (entity_type + action separate columns, `src/lib/audit/action-labels.ts` maps DB → UI). F1 may extend enum or migrate, but the architecture is locked. (AUDIT-LOG-STRATEGY.md + D-051.)
4. **F1 entity surface = ENTITY-INVENTORY F-N="F1" column rows + fixes to existing rows.** Per inventory: Clients (new); fixes to existing Bills/Pay Apps/Lien Releases/etc.; client_portal_access lifecycle; platform_admins existing.
5. **F1 first-day tasks (per D-035 F0-absorbed):** drop `change_order_budget_lines`; add `lien_releases.status_history`; fix docx-html auth; decide `budgets` table fate; reference-job cost-code wipe-and-reseed (D-020).
6. **F1 commits to ONE Owner Portal auth path** (Path A token model OR Path B owner_view role; NOT both). Per ARCHITECTURE §8 + iter-2 multi-tenant W-1.
7. **F1 schema design reads WORKFLOW-INTELLIGENCE.md (39 patterns) + ENTITY-INVENTORY.md before designing tables.** Cross-entity validators are first-class architectural concerns. (D-066 + D-071.)
8. **Inngest Cloud for async** (per D-022) — F3 wires; F1 establishes the schema hooks.
9. **Verification harness (Layer 1/2/3) is the canonical CI signal.** F1 extends Layer 2 with audit conservation + RLS coverage assertions + role-permission integrity. (D-073 + D-074 + D-075 + D-076 + D-077.)

---

## 1. Schema design philosophy

### Entity boundaries

F1 entity surface = ENTITY-INVENTORY.md "F-N when shipped" column rows tagged **F1** + fixes to existing rows. NOT the full 31-entity catalog (that ships across F1-F6 + Waves 2-4).

**New F1 entities:**
- `clients` — homeowners + commercial owners. PII flagged (yes). Retention class `forever`. Relationships: → `jobs` (FK from jobs.client_id), → `pay_apps` (approval workflow).

**Existing entities receiving F1 fixes:**
- `lien_releases` — add `status_history` JSONB (D-035 #2). Q12 closure. R.7 gap.
- `jobs` — add `status_history` JSONB (audit bonus, R.7 same gap). Q12 closure. Also: `client_id` FK to new `clients` table; drop embedded `client_name/client_email/client_phone/address` (Q2 A1 full normalize).
- `invoice_allocations` — add `org_id NOT NULL` (Q10b denormalize org-scoped child).
- `client_portal_access` — add `client_id` FK to replace per-job-only scoping (Q4b Path A scope shift).
- Drop `change_order_budget_lines` (D-035 #1; 0 rows + 0 consumers).
- Drop `budgets` cascade (Q10c; 0 rows + 2 partial consumers — refactor `recalc.ts` + `budget-lines/route.ts`).

**Deferred to later F-phases or Waves per ENTITY-INVENTORY:**
- F2: Employees + role definitions registry
- F4: Time Entries, Equipment, Equipment Usage, Expenses
- F5: Products, Estimates, Bids, Selections (full)
- F6: Banker role
- Wave 2: Daily Logs, Photos, Schedule Items, To-Dos, Punchlist Items, Documents
- Wave 2/3: RFIs, Submittals, Permits
- Wave 4: Tax Records, Contracts, Insurance Policies

### Relationship cardinalities + FK strategy

- **Jobs is universal parent.** Every operational entity FK → Jobs (direct or via join table). Wave 2+ entities (Daily Logs, Photos, Punchlist) inherit this.
- **Strict normalization (Q2 A1).** Clients becomes its own entity; embedded `jobs.client_*` columns dropped. One source of truth from day one (before Wave 1.1-Lite onboards real client data).
- **ON DELETE CASCADE for tenant-bound child entities** (e.g., `invoice_allocations` CASCADE to `invoices`; `budget_lines` CASCADE to `jobs`).
- **ON DELETE SET NULL where parent removal shouldn't cascade** (e.g., `change_orders.draw_id` SET NULL; document references).
- **Composite indexes on `(org_id, parent_fk_id)`** for tenant-bounded queries. F1's `invoice_allocations` denormalization adds `(org_id, invoice_id)`.
- **FK cardinality:** most relationships are 1:N from parent to child. Many-to-many surfaces handled via join tables (e.g., `draw_line_items` joining `draws` ↔ `budget_lines`).

### Soft delete patterns

- Every tenant table has `deleted_at TIMESTAMPTZ`. Soft delete only (never hard delete) per CLAUDE.md.
- **Q6 F deletion safety net:** Postgres trigger on `UPDATE WHERE deleted_at IS NOT NULL AND OLD.deleted_at IS NULL` emits `activity_log` row via shared `SECURITY DEFINER` function. Guarantees deletion-audit-cannot-be-skipped property regardless of code path.
- Catalog/reference tables (NAHB cost codes, internal_billing_types) typically don't soft-delete — they're idempotent reference data.

### Versioning strategy (Q12 uniform)

- **Workflow entities:** `status_history` JSONB tracking `{who, when, old_status, new_status, note}` per transition.
- **Cross-entity events:** `activity_log` (Strategy 1-prime — `entity_type` + `action` separate TEXT columns + `details` JSONB).
- **Pay Apps + Draws (LOCKED post-submit only):** `revision_number` rows pattern. Pre-submit edits go through `status_history` JSONB. Post-submit on entities with a LOCKED state require `revision_number` rows. Pay Apps + Draws are the only entities with a LOCKED post-submit state per AIA G702/G703 legal contract requirements. **Do NOT extend `revision_number` pattern to other entities without explicit Jake authorization.** (Amendment 4 per nwrp116 — harmonized with CLAUDE.md phrasing; clarifies trigger condition LOCKED-state vs general rule status_history-for-everything-else.)
- **Bills post-QB-push:** Immutable. Void + re-enter only.
- **No temporal tables. No snapshot columns. No per-entity variation.**

### Audit log schema design

Extends existing migration 00026 + AUDIT-LOG-STRATEGY.md Strategy 1-prime structure. F1 changes:

- **TS union extension** (`src/lib/activity-log.ts:20-49`): add `lien_releases`, `proposals`, `clients`, `client_portal_access` to `ActivityEntityType`. Remove `budget` (Q10c).
- **DB-trigger deletion safety net (Q6 F):** 1 `SECURITY DEFINER` function + generated migration applying triggers to every tenant table.
- **User-identity-threading:** `current_setting('app.current_user_id', true)` populated by request middleware; trigger reads setting to populate `activity_log.user_id`; NULL/service-role marker fallback.
- **Postgres ENUM migration on `entity_type`:** deferred (Q6 / Q7 outputs). TEXT + TS narrowing remains the discipline.

## 2. RLS policy design

### Per-table policies vs centralized policy functions

F1 continues the **per-table policy** pattern (existing across 62 tables). No centralized policy function abstraction. Rationale: per-table policies are easier to audit row-by-row in `pg_policies`; centralized functions add indirection without simplifying the check logic.

### Role-based vs ownership-based access

- **Tenant boundary (universal):** `org_id` filter via `app_private.user_org_id()` in every direct-filter policy.
- **Role-based:** `app_private.user_role()` check (`owner` / `admin` / `pm` / `accounting`). Used for write-permission gating (e.g., "admin owner accounting write invoice_allocations" policy in migration 00043).
- **Ownership-based:** `created_by IS NULL OR created_by = auth.uid()` pattern where applicable (e.g., user-owned support_conversations).
- **Token-scoped (anon):** `client_portal_access` token validation via `SECURITY DEFINER` RPCs (existing 00074 pattern). F1 extends for Path A Owner Portal.

### Service role escape hatches + their audit trail

- **logActivity** uses service-role client (bypasses RLS for audit writes). Audit row itself documents the write — self-auditing.
- **Stripe webhook** uses service role to update `subscription_status` (no user context).
- **create_signup RPC** (migration 00023) is `SECURITY DEFINER` — atomic auth.users + profile + org + membership.
- **Owner Portal anon-grant** (00074) uses service-role API for portal reads after token validation.
- **F1 audit rule:** every service-role write SHOULD log an activity_log row. Q6 F deletion safety net guarantees this for deletions specifically; other service-role writes log via existing helper patterns.

### Cross-tenant boundary enforcement (D-30 canonical)

- D-30 codified in CLAUDE.md "Nightwork standing rules": "Multi-tenant RLS is non-negotiable. Every tenant table has RLS enabled, every query filters on org_id from getCurrentMembership(). Tenant safety is built BY CONSTRUCTION, not by enforcement."
- **Codified rule (Q10b addition to CLAUDE.md Architecture Rules):**
  > "Every primary tenant entity has `org_id NOT NULL` + direct-filter RLS. Child detail tables follow the parent's scope-axis: ORG-scoped children → `org_id` from day one + direct-filter RLS; USER-scoped children → may RLS-by-join when relationship is strict (single parent FK + ON DELETE CASCADE + parent has proper RLS); anything else → case-by-case in code review."
- **Exceptions documented:**
  - `platform_admins` is intentionally cross-org (operator role; migration 00048-00049). RLS posture: user_id-bounded SELECT cross-org; writes/deletes still org-scoped.
  - `support_messages` is user-scoped child via join (Q10b codified rule — kept as-is).
- F1 introduces NO new cross-tenant code paths.

### RLS coverage assertions for harness Layer 2 (Q9 D + Q3 safety + Q10b refinement)

Layer 2 assertion logic:
- **ORG-scoped tenant table:** must have `org_id NOT NULL` + RLS enabled + at least one policy filtering on `org_id` (direct or via app_private function) + ≥1 fixture row in fixture-harness-org.
- **USER-scoped child table:** must have RLS enabled + at least one policy filtering on parent FK ownership + ≥1 fixture row reachable via parent FK in fixture-harness-org.
- **Multi-org user warning (Q3):** if a fixture user has >1 active org_members row, harness surfaces as WARN (catches test data drift, not error).
- **Deletion audit coverage (Q6 F):** for every tenant table, harness verifies the `SECURITY DEFINER` deletion trigger is attached.

## 3. Auth flow design

### Magic link signup/signin

**External actors (Q4b Path A locked):** owners + future architects/inspectors/subs use magic-link tokens via `client_portal_access` (migration 00074). SHA-256 hashed tokens + 90-day sliding-window expiry + service-role-API portal reads + anon-grant message RPCs. F1 expands the F4 magic-link primitive (email-delivery + token-generation infrastructure) for F4 reuse — Architect/Inspector RFI flows inherit the same primitive.

**Internal users (Q5 A):** continue with email + password via `signInWithPassword` (login.ts) + `create_signup` RPC (migration 00023). F1 does NOT refactor internal login UX.

### Password fallback (Q5 A)

- Internal `OrgMemberRole` users (owner, admin, pm, accounting) authenticate via email + password.
- Minimum password length: 8 chars (existing).
- No magic-link option for internal users in F1.
- **Future revisit triggers:**
  - F1+-2 (Production SSO posture) — if production goes SSO-only for internal, password becomes irrelevant.
  - Q7 outputs (SOC2 timeline) — if Type 1 pursuit triggers passwordless requirement, refactor is bounded (login.ts + signup.ts + existing-user migration script).
- **Reversibility:** A's posture is bounded to revisit later; locks nothing irreversible.

### Session lifetime + refresh strategy

- Supabase Auth defaults (1-hour access token + 30-day refresh token). F1 does NOT extend.
- Step-up auth for sensitive operations (pay-app approval, delete operations, payroll): deferred to F2/F3 territory.

### useCurrentRole onAuthStateChange listener (carry-forward from 1.5c-vh)

- W.1 bridge pre-positioned in 1.5c-vh: env-gated `setSession` in `client.ts` ships during harness phase. Currently dormant in production.
- **F1 deliverable:** add the `onAuthStateChange` listener. Once F1 adds listener, W.1 becomes immediately effective without further harness work.
- Listener invalidates cached role lookups on auth state changes — critical for role-aware UI rendering when admin grants/revokes roles mid-session.

### Multi-org membership (Q3 A formalize)

- Schema already supports multi-org via `org_members` composite unique `(org_id, user_id)` (migration 00016:104).
- `getCurrentMembership()` (`src/lib/org/session.ts:60-68`) picks oldest active membership — deterministic single-org-active per session.
- **F1 contract:** single-org-active per session via oldest-deterministic resolution. Multi-org switcher deferred to commercial-demand phase (Wave 4+ or later F).
- **Safety addition (Q3 A):** when `resolveMembership` returns >1 row, log warning to app logs + Sentry event (severity: warning, non-blocking) with user_id + all returned org_ids. Continue normal flow with oldest-deterministic resolution.
- **Harness Layer 2 (Q3 + Q9):** fixture/test data creating multi-org user surfaces as WARN — catches test data drift.

## 4. Provisioning + onboarding

### New org signup flow

Existing `create_signup` RPC (migration 00023) — atomic SECURITY DEFINER that creates:
1. `auth.users` row (pre-confirmed)
2. `profiles` row
3. `organizations` row (default settings, trialing status)
4. `org_members` row with `role='owner'`

F1 reuses; no schema changes. Output of signup → redirect to `/onboard`.

### First user becomes org_admin

`create_signup` assigns `role='owner'` to first user (NOT `admin`). F1 preserves this contract. Subsequent team members invited via `org_invites` (migration 00019) — invite email contains a token; recipient signs up + invite code consumed → `org_members` row created with role specified in invite.

### Billing setup integration (Q10 A)

- **RB org seeded with bypass:** `subscription_status='active'`, no Stripe customer ID, `trial_ends_at=null`. RB is internal — doesn't pay itself. F1 deliverable: migration seed for RB org with these values.
- **New org signup uses existing Stripe routes IN TEST MODE only** in F1. Production cutover deferred to Wave 1.1-Lite or commercial-launch phase.
- **F1+-1 (production domain) is blocking prerequisite for production Stripe** (webhook signature URLs + return URLs).
- **F1 sanity check:** verify Stripe test-mode routes (`/api/stripe/webhook`, `/api/stripe/portal`, `/api/stripe/checkout`) still work against current schema/RLS post-F1 changes (no code changes expected; just verify).
- **Production cutover playbook documented as Wave 1.1-Lite deliverable:** env vars, webhook URL, Stripe price IDs, registration steps. Checklist capture only — NOT F1 work.

### Team invite flow

Existing `org_invites` (migration 00019). F1 does NOT change invite mechanism.

**Owner Portal client_portal_access invites** (separate from internal team invites; Q4b Path A): existing `create_client_portal_invite` RPC creates the token + emails owner. F1 expands UI to surface invite flow + 1-2 audit integration points for owner-initiated actions (e.g., pay-app acknowledgment via `actor_token_id`).

## 5. Role + permission matrix

### F1 keeps existing 4 internal roles (Q4 A)

`OrgMemberRole` enum (`src/lib/org/session.ts:5` + migration 00016:97 CHECK) stays at 4 values:

| Role | Scope | Typical RB user |
|---|---|---|
| `owner` | Full company access; final approval | Lee Ross |
| `admin` | Full operational access | Jake Ross, Andrew Ross |
| `pm` | Assigned-job ownership (limited; F2 expands) | 6 RB PMs (Lee Worthy, Nelson Belanger, etc.) |
| `accounting` | Bills QA + Pay Apps + Lien Releases (limited; F2 expands) | Diane, Mara, Cindy |

DB CHECK constraint stays in sync with TS enum (4 values).

### Q4b Path A locked — `owner_view` role NOT added

External owners (homeowners) use **token-based magic-link access via `client_portal_access`** (migration 00074). NOT a member role. No `owner_view` in OrgMemberRole enum. F1 honors Principle 8 (external access via magic links + universal applicability) — same pattern as F3 architects/inspectors/subs.

### platform_admin (existing migration 00048-00049)

Cross-org operator role. Stored in separate `platform_admins` table (NOT `OrgMemberRole`). Current admins: Jake Ross, Andrew Ross.

- Cross-org SELECT for debugging/support (RLS posture: user_id-bounded per CC6.7).
- Writes/deletes still strictly org-scoped by RLS — cross-org mutations go through service-role API routes that audit-log unconditionally.
- `/admin/platform/*` middleware-gated (per D-058).
- F1 preserves this posture. NO new platform_admin code paths.

### F2 wires (per ROLES-CATALOG.md, NOT F1 scope)

11+ additional roles: GM, Sr PM, Estimator, Foreman, Field, Designer, Sub Foreman, Sub Bookkeeper. Plus `role_definitions` table (canonical registry) + permission matrix UI + Org Chart visual.

### F3 adds

Architect / Inspector via magic-link mechanism — same primitive as F1 Owner Portal (Path A).

### Wave 4 adds

Banker (loan officer; job-scoped public link).

## 6. Audit log scope

### Q6 F — B + DB-trigger deletion safety net

**Logged events:**
- App-layer via `logActivity` helper (existing 30+ call sites):
  - Status transitions (workflow entities)
  - Key field edits (amount, vendor reassignment, cost code change)
  - Role grants/revokes
  - Soft-deletes (app-layer attempts)
  - Bulk operations (imports, queue assignments)
- DB-trigger safety net (Q6 F new):
  - Every soft-delete (`UPDATE WHERE deleted_at IS NOT NULL AND OLD.deleted_at IS NULL`) on every tenant table emits activity_log row via shared `SECURITY DEFINER` function. Defense-in-depth: app-layer-forgot scenarios still produce audit row.

**Mechanism:**
- Continue app-layer `logActivity` for normal events (proven pattern; 30+ call sites; service-role write; non-throwing).
- DB-trigger only for deletions (NOT every CRUD — that's Option A overkill per Q6).

**User-identity-threading (Q6 F supporting):**
- F1 establishes `current_setting('app.current_user_id', true)` convention.
- Request middleware sets the GUC at request start; clears at request end.
- DB-trigger reads the setting to populate `activity_log.user_id` for deletion rows.
- NULL fallback if context unavailable (e.g., cron jobs, service-role direct DB access).

**Detail JSONB (Q6 F + D folded):**
- Existing `logStatusChange` populates `{from, to, reason, ...extra}`.
- Existing `log-field-edit` populates old/new values.
- F1 ensures financial-event logging fully exercises detail JSONB surface (old/new amounts + actor chain on COs, draws, lien releases).

### Retention

- `activity_log` retention class = **forever** per ENTITY-INVENTORY.
- Survives org-delete (audit-log-preservation rule per CLAUDE.md soft-delete pattern).
- `status_history` JSONB retention follows the parent entity's retention class:
  - `forever` entities (Lien Releases, Proposals, Permits, Tax Records, Activities) → status_history preserved forever.
  - `tenant-deletion-lifecycle` entities → status_history dropped on org-delete cascade.

### Access controls

- `activity_log` table RLS: tenants can SELECT only their own org's rows (filter on `org_id`).
- `platform_admins` can SELECT cross-org for debugging/support.
- No UI or API path to UPDATE or DELETE activity_log rows. Append-only by design.

### Query/export interface

- F1: existing aggregation reads via `from("activity_log")` in 9 read sites (per AUDIT-LOG-STRATEGY.md).
- F1 does NOT ship export API. Query directly via SQL editor or future Reports phase.

### SOC2 readiness target (Q7 A — SOC2-capable, no active pursuit)

- F1 architecture aligns with SOC2 Type 1 controls per ARCHITECTURE §7 mapping (CC6.1, CC6.6, CC6.7, CC7.2, PI1.1, C1.1).
- Q6 F strengthens PI1.1 (Processing integrity) via deletion safety net.
- Q4b Path A strengthens CC6.1 (Logical access — single mental model for external auth).
- **No active SOC2 pursuit in F1.** Pursuit trigger = first enterprise customer requiring attestation. Pursuit scope when triggered: ~2-3 months work (controls documentation, auditor engagement, evidence collection workflow setup, vendor management documentation).
- **F1 does NOT ship:** formal access review process, formal change management process, formal incident response runbook, vendor management process, evidence collection workflow.

### Postgres ENUM migration on entity_type

**Deferred.** AUDIT-LOG-STRATEGY notes "Migrating to a Postgres ENUM is a F1+ option." Strict ENUM at DB layer would prevent typo'd entity_type values from being written. F1 keeps TEXT + TS narrowing as the discipline. Revisit triggers: SOC2 Type 2 pursuit or commercial scale.

## 7. Migration path from current state

### Existing fixture data → real schema (Q9 D fixture-maintenance contract)

**Codified contract (added to F1 deliverables):**

1. Every new tenant-scoped table migration ALSO seeds ≥1 sanitized fixture row into `fixture-harness-org` in the same migration (per 1.5b SUBSTITUTION-MAP discipline).
2. Sanitization rules documented inline in migration comments. Categories: vendor names → safe variants; dollar amounts → safe variants; client names → fictional homeowner names; addresses → safe city/state variants.
3. Layer 2 harness assertion: every tenant-scoped table has ≥1 fixture row in fixture-harness-org (or ≥1 fixture row reachable via parent FK for USER-scoped child tables, per Q10b refinement). Missing → FAIL.
4. Tenant-scoped vs shared classification at migration authoring time:
   - **Tenant-scoped:** tables with `org_id` (jobs, invoices, vendors, clients, lien_releases, proposals, client_portal_access, etc.) → fixture coverage required.
   - **Shared:** tables without `org_id` (cost_codes catalog, NAHB enums, internal_billing_types reference data) → no fixture coverage required.
5. Contract inherits post-F1: every new tenant-scoped table in F2-F6 follows same pattern; Layer 2 assertion catches violations automatically.

**F1 implementation responsibility:** seed fixture rows for new F1 entities (Clients, fixed-up lien_releases, etc.) per this contract.

### fixture-harness-org handling

- Stays as separate isolated org (`00000000-0000-0000-0000-fb1ce0a55e55`; slug `fixture-harness-org`) per D-30 canonical tenant boundary.
- Sanitized Caldwell-shaped data continues (per 1.5b SUBSTITUTION-MAP).
- Migration 00093 fixture corrective referenced as cautionary example of ad-hoc drift. Q9 D contract prevents recurrence.

### Backward compat with 1.5c-IA production routes

- Thin-wrapper components mounted in 1.5c with sanitized fixtures (Plan 3 of 1.5c IA) become real-entity-readers in F1.
- F1 wires 1.5b prototypes to real entities (read-only first).
- Owner Portal thin-wrapper switches to Path A token-based real reads.
- Production route Site Office direction scope (per D-057 + D-061) preserved — outer container `<div data-direction="C" data-palette="B" className="design-system-scope">` stays load-bearing.

### D-035 first-day tasks status (post-audit)

1. **Drop `change_order_budget_lines`** (D-035 #1): DONE-ish — 0 rows, 0 consumers, ready to drop. F1-Wave-A.
2. **Add `lien_releases.status_history`** (D-035 #2): PENDING. F1-Wave-A + Q12 closure. Also extends to `jobs` (audit R.7 bonus).
3. **Fix docx-html auth** (D-035 #3): PENDING. 5-min `getCurrentMembership()` gate. F1-Wave-A.
4. **Decide `budgets` table fate** (D-035 #4): RESOLVED via Q10c — drop entirely. F1-Wave-A.
5. **Reference-job cost-code wipe-and-reseed (per D-020)** (D-035 #5): PARTIAL — Layer 1 NAHB canonical = 354 rows ready; Layer 2 reseed in F1-Wave-B.

### Additional cleanup surfaced by audit

6. Retire `public.users` legacy table (audit GAP item 20; 5 src files need refactor to read `profiles + org_members` exclusively). Wave-A or Wave-C decision.
7. Function `search_path` sweep (audit Section 5; 8 flagged functions). F1-Wave-A.
8. REVOKE EXECUTE from anon on 4× `pricing_history` trigger functions + 3× `create_default_*` auto-seed functions (audit Section 5). F1-Wave-A.
9. Wire deferred FKs (`draw_adjustments.source_document_id` → `document_extractions`; 00052:295 deferred `vendor_item_pricing` FK; 00065:59 `proposals.source_document_id`). F1-Wave-A.
10. Move `pg_trgm` and `vector` extensions out of `public` schema (advisor recommendation). F1-Wave-A.

## 8. Harness criteria scope for F1

### New criteria categories F1 introduces

- **Database integrity** — FK coverage (every entity-link FK declared); NOT NULL coverage on `org_id`, `created_at`, `updated_at`, `created_by` per CLAUDE.md Architecture Rules; soft-delete coverage (`deleted_at TIMESTAMPTZ` on every tenant table).
- **RLS coverage assertions** — pg_policies query verifies:
  - Every ORG-scoped tenant table has direct-filter policy on `org_id` (via `app_private.user_org_id()` or equivalent).
  - Every USER-scoped child table has join-based policy filtering on parent FK ownership.
  - Every tenant table has `rowsecurity=true`.
- **Audit completeness** —
  - Every soft-delete in tests produces `activity_log` row (Q6 F trigger guarantees).
  - Every workflow entity transition in tests populates `status_history` (Q12 uniform pattern).
  - Every cross-entity event goes through `logActivity` helper or trigger.
- **Fixture coverage (Q9 D)** — every tenant-scoped table has ≥1 fixture row in fixture-harness-org (or reachable via parent FK for USER-scoped child tables per Q10b).

### Layer 2 standards for F1

- **Audit conservation:** for every mutation in a test scenario, count `activity_log` rows before and after; new rows MUST exist for tracked event types. Fail if conservation violated.
- **RLS coverage assertions:** per pg_policies + pg_tables query, every public schema table flagged as tenant-scoped (has `org_id` or matches USER-scoped child criteria) has ≥1 policy. Surface tables with `rowsecurity=false` as FAIL (with documented exceptions).
- **Role-permission integrity:** every API route that mutates state exercises `requireRole(...)` or equivalent. Tests for unauthorized role return 403; authorized role succeeds. Negative-path coverage.
- **Fixture coverage:** Q9 D assertion enforces. New tenant tables without fixture row → FAIL.

### Harness extensions needed

1. **useCurrentRole onAuthStateChange listener activation** (W.1 bridge cleanup) — F1 wires the listener; carry-forward from 1.5c-vh becomes immediately effective.
2. **Multi-viewport per F1+-4** — AC-1-12 Layer 3 ambiguity folds into F1 harness extension work. Layer 3 vision against multiple viewports (mobile + tablet + desktop) for verification-eligible surfaces.
3. **Behavioral test category** — new Layer 2 category for "what happens when X" scenarios (e.g., "what happens when a user with no membership accesses an org-scoped page?"). Plan-phase to define exact scope.
4. **Multi-org user warning surfacing** (Q3) — fixture data drift detector.

### F1 verification step (Q2 follow-on)

Run `EXPLAIN ANALYZE` on representative RB data for the 4 candidate aggregations:
- `jobs.approved_cos_total` (existing trigger cache — verify still appropriate)
- `jobs.total_committed` (sum of POs across cost codes)
- `vendors.balance_outstanding` (sum of approved-not-paid bills)
- `jobs.current_contract_amount` (original + approved CO impacts)

Any aggregation sustaining >100ms gets a trigger cache before Wave 1.1-Lite launches. All sub-100ms with indexes alone → B1 lean cache footprint (Q2) holds.

## 9. Plan decomposition

### Wave structure (audit-driven per Section 7)

F1 splits into 2 (or 3) sub-waves:

**F1-Wave-A — Cleanup + D-035 + schema-shape concerns (~1-2 days, low blast):**
- Plan A-1: Drop `budgets` cascade + drop `change_order_budget_lines` + refactor consumers (`recalc.ts` + `budget-lines/route.ts`). [Q10c + D-035 #1]
- Plan A-2: Add `status_history` JSONB to `lien_releases` + `jobs` + update PATCH + bulk routes to append on transitions. Fix docx-html auth (`getCurrentMembership()` gate). [Q12 + D-035 #2 + D-035 #3]
- Plan A-3: `invoice_allocations` `org_id` denormalize (backfill + ADD NOT NULL + composite index + RLS rewrite from JOIN to direct-filter) + comment-only documentation on `support_messages` user-scoped pattern + CLAUDE.md Architecture Rules update with Q10b codified rule. [Q10b]
- Plan A-4: Function `search_path` sweep + REVOKE EXECUTE sweep on 4× `pricing_history` triggers + 3× auto-seed functions + move `pg_trgm` + `vector` extensions out of `public` schema. [audit Section 5]
- Optional: Plan A-5 (or absorb into A-1..A-4): Retire `public.users` legacy table (5 src file refactor). [audit GAP item 20]

**F1-Wave-B — Knowledge graph + auth (~2-3 weeks, foundational; 9 plans per nwrp115/116 restructure):**

Per nwrp115 Item 1 + nwrp116: B-1 split into B-1a (Schema Foundation) + B-1b (KG scaffold + types pipeline + foundational harness extensions) for cleaner rollback boundary and to make new types available to downstream plans. Old Plan B-7 (KG scaffold) absorbed into B-1b. Plan B-8 (RB seed + Stripe + harness extensions) renumbered to Plan B-7. **Hybrid A/C harness approach (per nwrp115 Item 3):** primary path bundles foundational harness extensions into B-1b; fallback to standalone F1-Wave-B0 if B-1b plan-authoring surfaces 2.5+ days of work.

- Plan B-1a: Clients entity creation + `jobs.client_id` FK + backfill from embedded `client_*` columns + drop embedded columns + add `status_history` to clients. [Q2 A1 + Q12] **SCHEMA ONLY** — pure DB migration; rollback = revert migration.
- Plan B-1b: KG scaffold + types pipeline + foundational harness extensions. (a) `src/lib/knowledge-graph/` scaffold + README + index files + 3-5 exemplar WI validators (per Amendment 1: WI-001 + WI-013 + one Clients-related). (b) `database.types.ts` generation pipeline via `supabase gen types typescript --linked` + pre-commit hook regenerating on migration changes + CLAUDE.md update for type-generation rule. (c) Refactor `src/lib/types/invoice.ts` to extend `database.types.ts`. (d) Foundational harness extensions in `src/lib/verification/layer2/standards/`: audit conservation, RLS coverage assertions, role-permission integrity. (e) Criteria categories: database integrity, RLS coverage, audit completeness. (f) `useCurrentRole onAuthStateChange` listener activation (W.1 bridge cleanup). [Q11 D + Q9 + F1+-4 harness extensions + hybrid A/C primary path]
- Plan B-2: `client_portal_access.client_id` FK + Owner Portal Path A minimum UI (read-only progress + payment status + document downloads) + 1-2 audit integration points (e.g., pay-app acknowledgment via `actor_token_id`). [Q4b]
- Plan B-3: Soft-delete DB-trigger safety net (1 `SECURITY DEFINER` function + per-table triggers on every tenant table) + user-identity-threading convention (`current_setting('app.current_user_id', true)` populated by request middleware) + **DEF-WC-1: `org_members` RESTRICTIVE `"org isolation"` backstop** (Wave-C deferred follow-up routed here per nwrp118 Item 2; mirrors 00049 canonical pattern with `(SELECT ...)` session-cache wrapping) + **DEF-WC-3 partial: ARCHITECTURE.md "RLS posture summary table by entity"** (single source of truth across all tenant tables; prevents future plans from repeating Wave-C's profiles-wide-open misconception per nwrp118 Item 4). [Q6 F + DEF-WC-1 + DEF-WC-3]
- Plan B-4: `activity_log` `entity_type` TS union extension (+ `lien_releases`, `proposals`, `clients`, `client_portal_access`; remove `budget`) + write-site coverage for new F1 entities. [Q6 F]
- Plan B-5: Magic-link primitive + email-in receiving primitive (Amendment 2 scope clarification per nwrp116). **F1 email-in primitive MVP:** (a) Resend webhook endpoint at `/api/email-in/webhook` (or similar) receiving email events (delivered, bounced, complained). (b) Stores received emails as `documents` table rows with raw payload preserved. (c) Does NOT parse content into specific entities. (d) Does NOT route to invoice processing pipeline. (e) Does NOT establish MX records or email server infrastructure. **Magic-link primitive:** email-delivery + token-generation infrastructure for F4 reuse (Architect/Inspector RFI flows, Sub Portal magic link); reuses the webhook + token-gen patterns established here. **Deferred to Wave 3 per GAP item 21:** AI parsing of email content, routing to invoice processing, accounting@rossbuilt.com inbox setup, multi-modal extraction per WI-038 punchlist. [ARCHITECTURE §6 F1 + Amendment 2]
- Plan B-6: Cost-code wipe-and-reseed per D-020 + Q9 D fixture-maintenance contract codification + Layer 2 fixture-coverage assertion (CI hook). **Amendment 3 (per nwrp116):** Add pre-commit hook OR plan-review BLOCKING check: for every migration file containing CREATE TABLE pattern with `org_id` column declaration (tenant-scoped table), verify same migration file contains `INSERT INTO <table_name> ... VALUES (...)` with fixture-harness-org UUID `00000000-0000-0000-0000-fb1ce0a55e55`. If missing → REJECT (commit blocked OR plan-review CRITICAL finding). Documented exception: tables explicitly classified as "shared" (no `org_id`) skip this check. Implementation: extend `.githooks/pre-commit` or `.claude/hooks/nightwork-post-edit.sh` with regex matching CREATE TABLE + org_id + matching INSERT. [D-035 #5 + Q9 + Amendment 3]
- Plan B-7: RB org seed (`subscription_status='active'`, no Stripe customer ID, `trial_ends_at=null`) + Stripe test-mode sanity check + Q2 `EXPLAIN ANALYZE` verification step (4 candidate aggregations) + remaining harness extensions (multi-viewport per F1+-4 + behavioral test category if not absorbed into B-1b per hybrid A/C). [Q10 A + Q2 verification + Q8 carry-forward + F1+-4]

**F1-Wave-B0 (fallback; ~1-2 days, only if B-1b harness extensions scope exceeds plan budget at plan-authoring time):**
- Plan B0-1: Standalone harness extension wave between Wave-C and Wave-B. Single plan. Multi-viewport per F1+-4 + behavioral test category + any harness extensions overflowing from B-1b. Surfaces at B-1b plan-authoring as a HALT for Jake authorization if needed.

**F1-Wave-C (committed per nwrp116; ~0.5-1 day, medium blast; ships BEFORE Wave-B per Option A sequencing):**
- Plan C-1: `public.users` legacy retirement (refactor 5 src files to read `profiles + org_members` exclusively + migration 00097 DROP TABLE public.users CASCADE). Wave-B auth refactoring works on clean foundation without `public.users` in picture. See `.planning/expansions/stage-f1-knowledge-graph-auth-wave-c-EXPANDED-SCOPE.md` for full Wave-C scope.

### Halt gates (architectural decisions vs autonomous execution)

- **Wave-A independent ship.** Small enough for autonomous after plan-review passes. Wave-A could drop independently of Wave-B if Jake wants cleanup live ASAP.
- **Wave-B architectural commits warrant strategic checkpoints between plans:**
  - After Plan B-3 (deletion safety net trigger): manual verification of trigger firing on representative cases.
  - After Plan B-1b (KG scaffold + types pipeline + foundational harness extensions): Plan review of validator structure + harness extensions before B-2 onward. **If B-1b plan-authoring surfaces 2.5+ days work, HALT for Jake to authorize fallback to standalone F1-Wave-B0 standalone harness extension wave.**
- **NEW HALT GATE per nwrp118 Wave-C lesson — cross-reviewer factual disagreement:** any plan-review iter-1 with **cross-reviewer factual disagreement** (two or more reviewers make CONTRADICTORY CLAIMS about canonical state — RLS policies, migration history, schema shape, etc.) HALTS for Jake authorization on resolution, even within autonomous CATEGORY F envelope. Resolution requires verifying against source (migration files, pg_policies, etc.) — diagnose-first discipline, not majority-rule consensus. Caught by Wave-C: security-reviewer claimed profiles RLS wide-open; architect verified RESTRICTIVE backstop via migration line numbers (00016:163 + 00049:285-288). "4-of-5 consensus" could have resolved future disagreements incorrectly without this gate.
- **Wave-C sequencing:** confirmed per nwrp116 — Option A (Wave-C before Wave-B). Wave-C ships clean → Wave-B dispatches on cleaner foundation.

### Dependencies between Plans

- A-1 (drop budgets) before B-1 (Clients) — both touch `budget_lines` references; sequence first.
- B-1a (Clients schema) before B-1b (KG scaffold + types pipeline) — types pipeline needs Clients schema applied to generate database.types.ts with new entity.
- B-1b (types pipeline + harness extensions) before B-2+ — downstream plans use new types AND extended harness Layer 2 standards for verification.
- B-1a/B-1b (Clients) before B-2 (`client_portal_access.client_id` FK) — FK depends on Clients table existing + types available.
- B-3 (deletion trigger) after B-1a/B-1b + B-2 — trigger applies to all new tables.
- B-4 (activity_log extension) parallel with B-5 (magic-link + email-in primitive); both independent.
- B-6 (cost-code reseed + fixture-maintenance contract Amendment 3) can run parallel with B-3/B-4/B-5.
- B-7 (RB seed + Stripe + EXPLAIN ANALYZE + remaining harness extensions) last — verifies F1 foundation end-to-end.
- A-3 (invoice_allocations org_id denormalize) independent — can land any time in Wave-A.

### Estimated total

- **Wave-A:** 1-2 days (SHIPPED 2026-05-12; migrations applied 2026-05-13 via Supabase MCP).
- **Wave-C:** 0.5-1 day (committed per nwrp116; Option A sequencing — Wave-C before Wave-B).
- **Wave-B0 (fallback only):** 1-2 days if B-1b harness extension scope expands at plan-authoring time.
- **Wave-B:** 2-3 weeks (per ARCHITECTURE §6 canonical estimate; **9 plans** restructured per nwrp115/116 — B-1a/B-1b split + B-7→absorbed-into-B-1b + B-8→B-7 renumber).
- **Total F1:** 2.5-4 weeks. Matches canonical 3-4 week estimate.

## 10. Open questions resolved + remaining for Jake decision

_Q1..Q12 tracking table — populated as Q&A proceeds._

| # | Question | Status | Resolution |
|---|----------|--------|------------|
| Q1 | Scope ambition (minimal vs ambitious vs canonical) | **RESOLVED** | **A — Canonical F1** per ARCHITECTURE §6 + D-049/D-050/D-066/D-071. 3-4 weeks. F1-tagged entity surface + RLS + audit-by-construction + auth + org model + magic-link primitive + email-in receiving + 1.5b wired to real entities (read-only first) + D-035 first-day fixes. Jake reasoning: canonical docs represent resolved architectural thinking; F3 magic-link dependency means deferring it just moves complexity (net-zero or net-negative); D-050 F1-F6 split was deliberate, honor it. |
| Q2 | Schema philosophy (strict normalization vs pragmatic) | **RESOLVED** | **A1 + B1 with verification step.** Axis 1 — A1 full normalize (migrate `jobs.client_*` embedded → Clients rows + `jobs.client_id` FK; drop embedded; backfill via migration; one source of truth from day one before Wave 1.1-Lite onboards real client data). Axis 2 — B1 lean cache footprint (only existing `jobs.approved_cos_total` survives; reactive add otherwise). **Verification step added:** when F1 ships, run `EXPLAIN ANALYZE` on representative RB data for the 4 candidate aggregations (`jobs.approved_cos_total` / `jobs.total_committed` / `vendors.balance_outstanding` / `jobs.current_contract_amount`). Any aggregation sustaining >100ms gets a trigger cache before Wave 1.1-Lite launches. All sub-100ms with indexes alone → B1 holds. This captures "lean by default, but verify the assumption" rather than "lean and find out at customer-pain time." → F1 acceptance criterion. |
| Q3 | Multi-org membership in MVP | **RESOLVED** | **A — formalize current behavior with safety addition.** Schema already permits multi-org via composite unique `(org_id, user_id)` (migration 00016:104); `getCurrentMembership()` deterministically picks oldest active membership (`src/lib/org/session.ts:60-68`). F1 contract: single-org-active-per-session via oldest-deterministic resolution. Multi-org switcher deferred to commercial-demand phase (Wave 4+ or later F). **Safety addition:** when `resolveMembership` query returns >1 row, log warning to app logs + Sentry event (severity: warning, non-blocking) with user_id + all returned org_ids; continue normal flow with oldest-deterministic resolution. **Harness Layer 2 RLS coverage assertion:** fixture/test data creating multi-org user surfaces as warning, catches test data drift. (Feeds Q8 harness criteria scope.) |
| Q4 | Role granularity (6 listed vs different set) | **RESOLVED** | **A — keep existing 4 + path-dependent `owner_view`.** F1 OrgMemberRole enum stays at 4 values (`owner` \| `admin` \| `pm` \| `accounting`). Path-dependent: add `owner_view` IF Path B chosen (Q4b). F2 expansion via roles engine + `role_definitions` table per ROLES-CATALOG.md F2 tagging (GM, Sr PM, Estimator, Foreman, Field, Designer, Sub Foreman, Sub Bookkeeper). F3 adds Architect/Inspector via magic-link mechanism. Wave 4 adds Banker. DB CHECK constraint stays in sync with TS enum. |
| Q4b | Owner Portal auth path commitment (Path A vs Path B per ARCHITECTURE §8 / multi-tenant W-1) | **RESOLVED** | **Path A — extend 00074 token model.** Honors Principle 8 (magic-link external access + universal applicability); existing primitives shipped & audited (Branch 2 Phase 2.9); single mental model for ALL external actors (owners + architects + inspectors + subs all use tokens); auth-seat cost deferred indefinitely; Wave 4 commercial-tenant SSO migration is a bounded Wave-4 problem. **OrgMemberRole stays at 4 values** (no `owner_view` added). **F1 scope narrowed:** (1) Schema — add Clients entity + FK from `client_portal_access` to `clients` (replaces per-job-only scoping), ~half day. (2) Page wiring — minimum Owner Portal UI for happy path (read-only progress + payment status + document downloads). (3) Audit integration — 1-2 owner-initiated actions wire `actor_token_id` (e.g., pay-app acknowledgment). **Full Owner Portal feature set (notifications, comments, signature workflows, ongoing engagement) deferred to Wave 1.1-Lite or later** where real RB homeowner usage will surface UX requirements. F1 does NOT ship full Owner Portal — it ships the schema + minimum-viable-UI + audit integration points. |
| Q5 | Magic link vs password (internal org members) | **RESOLVED** | **A — keep current state.** Internal org-members continue with email + password via `signInWithPassword` (login.ts) + `create_signup` RPC (migration 00023). External actors (owners + F3 architects/inspectors/subs) use magic-link tokens via 00074 + F3 extensions. F4 magic-link plumbing (email-delivery + token-generation infrastructure) ships in F1 for F4 reuse but does NOT replace internal login UX. **Future revisit triggers:** F1+-2 production SSO decision + Q7 SOC2 timeline outputs. **Reversibility:** bounded (login.ts + signup.ts + existing-user migration script if needed). |
| Q6 | Audit log scope (every CRUD vs business state vs money-only) | **RESOLVED** | **F — B + DB-trigger deletion safety net.** Continue app-layer `logActivity` for state changes + key field edits (canonical pattern, 30+ call sites). Plus: 1 `SECURITY DEFINER` function + generated migration applying to every tenant table, firing on soft-delete transition (`UPDATE WHERE deleted_at IS NOT NULL AND OLD.deleted_at IS NULL`). Guarantees deletion audit completeness regardless of code path. D's financial detail folded in automatically (existing helpers already support detailed JSONB). **F1 deliverables:** (1) Extend `entity_type` TS union: + `lien_releases`, `proposals`, `clients`, `client_portal_access`. (2) Continue app-layer for state changes. (3) Generated migration: shared trigger function + per-table trigger declarations. (4) Establish user-identity-threading convention via `current_setting('app.current_user_id', true)` populated by request middleware; trigger reads setting to populate `activity_log.user_id`; NULL/service-role marker fallback. (5) Document invariant: "every soft-delete creates an activity_log row, app-layer or trigger-layer, guaranteed." **Deferred:** Postgres ENUM migration on `entity_type` (revisit per Q7 SOC2 output); trigger-based logging on financial tables (E pattern not adopted; app-layer canonical for state changes). |
| Q7 | SOC2 timeline target | **RESOLVED** | **A — SOC2-capable, no active pursuit.** ARCHITECTURE §7 control mapping (CC6.1 / CC6.6 / CC6.7 / CC7.2 / PI1.1 / C1.1) maintained. Q6=F + Q4b=Path A + Q3=A + RLS-by-construction already align with SOC2 controls. **Pursuit trigger:** first enterprise customer requiring SOC2 attestation. **Pursuit scope when triggered:** ~2-3 months work (controls documentation, auditor engagement, evidence collection workflow setup, vendor management documentation). **F1 does NOT ship:** formal access review process, formal change management process, formal incident response runbook, vendor management process, evidence collection workflow. Confirms Q5=A (passwords OK) + Q6=F (sufficient coverage for Type 1) + Q2 verification step retained as non-SOC2-driven F1 acceptance. |
| Q8 | Real-time subscriptions in F1 vs defer | **RESOLVED** | **A — defer entirely to F3 or later.** F1 ships static reads. D-022 makes Inngest canonical for async events; adding Supabase Realtime creates parallel async surface competing with Inngest (architectural fragmentation). F3 (Notifications + Magic-link + Sub Portal) is natural home for live UX. F3 retrofit cost bounded: publications are non-destructive additive migrations. **UX implication for F1:** activity feeds + Today screen show "last refreshed Xs ago" timestamp + manual refresh button (cheap, optional). Honors "stale-by-seconds is fine for MVP" while giving users a visible knob. |
| Q9 | Harness-fixture migration strategy | **RESOLVED** | **D — A + codified fixture-maintenance contract.** Continue Caldwell-sanitized synthetic-fixture pattern (working since 1.5b). Codify discipline to prevent 00093-style drift. **F1 fixture-maintenance contract:** (1) Every new tenant-scoped table migration ALSO seeds ≥1 sanitized fixture row into fixture-harness-org in the same migration (per 1.5b SUBSTITUTION-MAP; sanitization rules inline as migration comments). (2) Layer 2 harness assertion: every tenant-scoped table has ≥1 fixture row in fixture-harness-org; missing → FAIL. (3) Tenant-scoped vs shared table classification at migration authoring time (tenant-scoped: tables with `org_id` like jobs/invoices/vendors/clients/lien_releases/proposals/client_portal_access → coverage required; shared: catalog/enum/reference tables without `org_id` → no coverage required). (4) Contract inherits post-F1; F2-F6 follow same pattern automatically caught by Layer 2 assertion. **F1 implementation responsibility:** seed fixture rows for new F1 entities (Clients, fixed-up lien_releases, etc.) per this contract — that's F1 deliverable work, not future-phase. **D-30 unchanged:** fixture-harness-org remains single isolated org. |
| Q10 | Real Stripe in F1 vs defer | **RESOLVED** | **A — defer Stripe production; verify test mode + seed RB bypass.** Stripe scaffold + 3 API routes (webhook, portal, checkout) + migration 00024 already exist. F1+-1 (production domain) blocks production webhook URLs. RB is internal (doesn't pay); Builder 20 Club is Wave 1.1-Lite-or-later. **F1 Stripe deliverables:** (1) RB org seed migration: `subscription_status='active'`, no Stripe customer ID, `trial_ends_at=null`, bypass billing. (2) Sanity-check existing Stripe routes work in test mode against current schema/RLS (no code changes expected). (3) Document production cutover playbook (env vars, webhook URL, Stripe price IDs, registration steps) as Wave 1.1-Lite-or-later deliverable — checklist capture only, NOT F1 work. |
| Q10b | RLS-by-join schema coherence (invoice_allocations + support_messages) | **RESOLVED** | **C — add `org_id` to invoice_allocations; keep support_messages user-scoped; codify rule.** invoice_allocations is org-scoped child where `org_id` adds clear value (composite indexes, simpler RLS, no future denormalization migration). support_messages is fundamentally user-scoped — `org_id` would be redundant column with no query-path benefit. **Codified rule (add to CLAUDE.md Architecture Rules):** "Every primary tenant entity has `org_id NOT NULL` + direct-filter RLS. Child detail tables follow the parent's scope-axis: ORG-scoped children → `org_id` from day one + direct-filter RLS; USER-scoped children → may RLS-by-join when relationship is strict (single parent FK + ON DELETE CASCADE + parent has proper RLS); anything else → case-by-case in code review." **F1 deliverables:** (1) Migration: `ALTER TABLE invoice_allocations` ADD `org_id NOT NULL` (backfill from `invoices.org_id`) + composite index `(org_id, invoice_id)` + DROP join-based RLS / CREATE direct-filter RLS + regression test for boundary enforcement. (2) Comment-only update on `support_messages` migration: explanatory note that user-scoped pattern is intentional per canonical rule. (3) Update CLAUDE.md Architecture Rules with the rule + examples. (4) **Q9 contract refinement:** Layer 2 assertion becomes "ORG-scoped tables: have `org_id NOT NULL` + ≥1 fixture row; USER-scoped child tables: ≥1 fixture row reachable via parent FK." |
| Q10c | Budgets table fate (D-035 #4) | **RESOLVED** | **A — drop entirely.** `budgets` not in canonical docs (ENTITY-INVENTORY.md + CLAUDE.md Data Model both omit it); conceptually redundant — versioning intent already encoded by `budget_lines.original_estimate` (v1) + `revised_estimate` (v1 + approved CO impacts) + `change_orders` (audit trail) + PCCO log (canonical versioning record). 0 rows + 2 partial consumers = bounded refactor. **Architectural posture:** budgets are NOT first-class entities in Nightwork's data model; budget concepts surface through line items + change orders, computed on read (matches CLAUDE.md "Never store computed values" + Q2 lean cache). **F1 deliverables (fold into Wave-A cleanup per audit):** (1) Migration: `DROP TABLE budgets CASCADE` (safe — 0 rows); optionally `ALTER TABLE budget_lines DROP COLUMN budget_id`. (2) Refactor `src/lib/recalc.ts:253` — remove `budgets.total_amount` update; canonical total is `SUM(budget_lines.revised_estimate)` on read. (3) Refactor `src/app/api/budget-lines/route.ts:60-70` — remove budget lookup. (4) Remove `'budget'` from `activity_log.entity_type` TS union (`src/lib/activity-log.ts:26`); existing rows (if any) remain as legacy text — non-breaking. (5) Q9 fixture contract: no fixture row needed (table dropped). **D-035 #4 RESOLVED.** |
| Q11 | Knowledge graph implementation (library / app / DB / hybrid) | **RESOLVED** | **D — hybrid: schema/RLS in DB, types auto-generated, validators + helpers in app.** Schema canonical in Supabase migrations. Types via `supabase gen types typescript --linked > src/lib/types/database.types.ts`. Validators + queries in `src/lib/knowledge-graph/`. Matches existing Nightwork stack idioms. A premature (no second consumer); B loses schema/validator conceptual separation; C incompatible with WI complexity (WI-028 cross-entity in pure SQL unmaintainable). **F1 structure:** `src/lib/knowledge-graph/validators/wi-XXX.ts` (one per pattern), `queries/` (cross-entity helpers), `README.md`, `index.ts`. **Validator interface contract:** `(input: T, ctx: ValidatorContext) => ValidatorResult` where `ValidatorResult = { ok: true } \| { ok: false, reason, surface: 'block' \| 'flag' \| 'inform' }`. `ValidatorContext` threads org_id + supabase client. **F1 concrete deliverables:** (1) Type generation pipeline + pre-commit hook regenerates on migration changes + CI verifies types not stale (Drummond-gate-pattern). (2) Refactor `src/lib/types/invoice.ts` to extend `database.types.ts`. (3) Create `src/lib/knowledge-graph/` scaffold + README + index files + 3-5 exemplar WI validators. **F1-feasible exemplar list (Amendment 1 per nwrp116):** WI-001 (inline budget context — invoices + budget_lines + cost_codes + POs + COs; all F1), WI-013 (multi-job allocation — touches F1 invoice_allocations org_id work), and one Clients-related validator (Plan-phase finalizes; likely "client-active-when-job-active" or similar). **WI-028 (punchlist-blocks-lien-release) REJECTED as F1 exemplar** — requires Punchlist Items entity which is Wave 2 per ENTITY-INVENTORY. WI-002 + WI-003 also F1-feasible alternates (inline PO/CO context). (4) Cross-reference WORKFLOW-INTELLIGENCE.md patterns to implementation files (footer per pattern when validators ship). (5) API route integration pattern: mutating routes call `validate(input, [validators], ctx)`; `block` failures → HTTP 422 with reasons; `flag`/`inform` returned in response metadata. **F2-F5 add bulk WI validators per their respective phase scope; F6 finalizes pay-app validators.** Failure mode mitigations: manual-types-coexisting prevented via CLAUDE.md rule + code review; schema-without-regen prevented via pre-commit + CI. Sub-decisions deferred to Plan phase: ValidatorContext shape, exemplar validator final selection, refactor pattern for existing API routes. |
| Q12 | Entity versioning strategy | **RESOLVED** | **A — uniform existing pattern.** `status_history` JSONB + `activity_log` (Strategy 1-prime) + Pay Apps + Draws revision_number rows (LOCKED post-submit only). No temporal tables, no snapshot columns, no per-entity variation. Existing pattern proven across 8 of 10 workflow entities. **Amendment 4 phrasing harmonized with CLAUDE.md (per nwrp116):** "Status transitions on workflow entities are tracked via `status_history` JSONB. Pre-submit edits go through `status_history`. Post-submit on entities with a LOCKED state require `revision_number` rows. Pay Apps + Draws are the only entities with a LOCKED post-submit state per AIA G702/G703 contract requirements. Do NOT extend `revision_number` pattern to other entities without explicit Jake authorization." Clarifies trigger condition (LOCKED state = post-submit on Pay Apps/Draws) vs general rule (status_history for everything else). **F1 deliverables (mostly already in scope from earlier Qs):** (1) Add `status_history JSONB NOT NULL DEFAULT '[]'::jsonb` to: `lien_releases` (D-035 #2 + Q6), `jobs` (audit R.7 bonus + Q6), `clients` (new F1 entity per Q2 A1 normalize). (2) Update PATCH + bulk routes to append on transitions via existing `logStatusChange` pattern. (3) Document uniform pattern in CLAUDE.md Architecture Rules per Amendment 4 phrasing above. (4) Verify in F1 acceptance: all workflow entities have status_history populated on lifecycle transitions; Q9 fixture coverage + Q6 trigger safety net enforce coverage. **No new schema mechanism beyond gap closure.** |

---

## Wave 1.1-Lite coordination

### What MUST ship in F1 for Wave 1.1-Lite to launch

- Real schema with multi-tenant RLS by construction (Q1 canonical F1).
- Clients entity + jobs.client_id FK + drop embedded jobs.client_* columns (Q2 A1 normalize) — required before Wave 1.1-Lite onboards real RB client data.
- Owner Portal Path A minimum UI (Q4b) — RB owners need read-only progress + payment + document downloads.
- All workflow entities have `status_history` (Q12) — lien_releases, jobs, clients new coverage.
- `activity_log` covers F1 entities + DB-trigger deletion safety net (Q6 F).
- D-035 cleanup complete (Wave-A) — drops + status_history additions + docx-html auth + sweep work.
- RB org seeded with `subscription_status='active'` bypass (Q10 A).
- Fixture-maintenance contract enforced via harness Layer 2 (Q9 D).
- `EXPLAIN ANALYZE` verification step passed (Q2) — no aggregations sustaining >100ms, or trigger caches added pre-Wave-1.1-Lite.
- Knowledge-graph scaffold + types pipeline + 3-5 exemplar WI validators (Q11 D).

### What CAN defer from F1 to Wave 1.1-Lite (or later)

- **Full Owner Portal feature set:** notifications, comments, signature workflows, ongoing engagement (per Q4b scope narrowing — F1 minimum UI only).
- **Production Stripe cutover:** F1+-1 (production domain) blocks; Wave 1.1-Lite or commercial-launch enables (Q10 A).
- **Bulk WI validator implementation:** F1 ships 3-5 exemplars; F2-F5 add bulk per phase scope.
- **Full email-in ingestion pipeline:** F1 ships minimum receiving primitive; full rebuild per GAP item 21 in Wave 3.
- **SOC2 active pursuit:** Q7 A defers indefinitely until commercial demand.
- **Real-time subscriptions:** Q8 A defers entirely to F3 (Notifications) or later.
- **Trigger cache additions beyond `jobs.approved_cos_total`:** Q2 B1 — only added if `EXPLAIN ANALYZE` shows >100ms aggregations.

### F1+-1 / F1+-2 / F1+-4 status (pre-Wave-1.1-Lite gates)

- **F1+-1 (production domain — nightwork.build vs subdomain):** pending Jake decision before Wave 1.1-Lite launch. NOT blocking F1 dev. Affects Stripe webhook URLs + Owner Portal production URLs.
- **F1+-2 (production SSO posture):** pending Jake decision before Wave 1.1-Lite launch. NOT blocking F1 dev. May retroactively revise Q5 (passwords) if SSO-only direction chosen.
- **F1+-4 (AC-1-12 Layer 3 ambiguity — multi-viewport harness):** folds into F1-Wave-B Plan B-1b (foundational harness extensions; primary path per nwrp115 Item 3 hybrid A/C) OR Plan B-7 (remaining harness extensions if B-1b is foundational-only) OR standalone Wave-B0 (fallback if scope expands).

### Carry-forward from 1.5c-vh + 1.5c-IA

- `useCurrentRole onAuthStateChange` listener — pre-positioned via W.1 bridge (env-gated `setSession` in `client.ts`); F1 adds listener → W.1 immediately effective.
- `src/middleware.ts:179 NODE_ENV → VERCEL_ENV` — already shipped during harness phase QA.
- WI-004 cost-code-per-line-item criterion — now reachable since 1.5b prototype-gallery merged to main; F1 plan-phase may select as 4th exemplar validator alongside the Amendment-1-revised list (WI-001 + WI-013 + Clients-related TBD). **WI-028 is NOT a valid F1 exemplar (requires Wave 2 Punchlist Items entity per ENTITY-INVENTORY).**

---

## Recommended Plan decomposition

### Wave summary

| Wave | Scope summary | Plan count | Estimated days | Blast |
|---|---|---|---|---|
| **F1-Wave-A** (SHIPPED 2026-05-12; migrations applied 2026-05-13) | Cleanup + D-035 + schema-shape concerns (drop CCBL + budgets, add status_history on lien_releases + jobs, fix docx-html auth, invoice_allocations org_id denormalize) | **4 plans** (A-1..A-4) | **1-2 days** ✓ | Low |
| **F1-Wave-C** (per nwrp116 — Option A sequencing; dispatches BEFORE Wave-B) | `public.users` legacy retirement (5 src files refactor + migration 00097 DROP TABLE) | **1 plan** (C-1) | **0.5-1 day** | Medium (touches UI query results) |
| **F1-Wave-B0** (FALLBACK only) | Standalone harness extension wave (if B-1b scope expands at plan-authoring) | **1 plan** (B0-1) | **1-2 days** | Low |
| **F1-Wave-B** (per nwrp115/116 restructure) | Knowledge graph + auth foundation: B-1a schema; B-1b KG scaffold + types pipeline + foundational harness extensions; B-2 Owner Portal Path A; B-3 deletion trigger; B-4 audit log extension; B-5 magic-link + email-in MVP (Amendment 2); B-6 cost-code reseed + fixture-maintenance contract Amendment 3; B-7 RB seed + Stripe + EXPLAIN ANALYZE + remaining harness extensions | **9 plans** (B-1a, B-1b, B-2..B-7) | **2-3 weeks** (~10-15 working days) | Foundational |

**Total F1:** 14 plans across 4 waves (A=4 shipped + C=1 + B=9 + B0 fallback if needed); ~2.5-4 weeks calendar. Matches canonical ARCHITECTURE §6 estimate (3-4 weeks).

### Halt gates summary

- ✅ Wave-A plan-review complete (iter-1 + iter-2 patches); Wave-A executed + shipped + migrations applied.
- ✅ Wave-C sequencing confirmed (Option A — Wave-C before Wave-B per nwrp116).
- HALT after Wave-C ships: Jake reviews Wave-C ship summary before Wave-B authorization.
- After Plan B-3 (deletion safety net): manual verification of trigger firing on representative cases.
- After Plan B-1b (KG scaffold + types pipeline + foundational harness extensions): plan review of validator structure + extensions before B-2..B-7 progression.
- After Wave-B Plan B-7 complete: Q2 `EXPLAIN ANALYZE` verification gate — pass before Wave 1.1-Lite launch.

### Plan-phase resumption sequence

When Jake authorizes:
1. `/np stage-f1-knowledge-graph-auth-wave-a` — Wave-A plans (A-1..A-4) drafted + plan-reviewed first.
2. `/nx stage-f1-knowledge-graph-auth-wave-a` — Wave-A execute + QA + ship (autonomous-eligible if plan-review passes cleanly).
3. `/np stage-f1-knowledge-graph-auth-wave-b` — Wave-B plans (B-1..B-8) drafted with Wave-A state as baseline.
4. `/nx stage-f1-knowledge-graph-auth-wave-b` — Wave-B execute + QA + ship.
5. (Optional) `/np stage-f1-knowledge-graph-auth-wave-c` if Wave-C remains separate.

Alternative: single `/np stage-f1-knowledge-graph-auth` covering all 12 plans, with internal sequencing. Jake's preference at Plan-phase kickoff.

---

## Critical architectural decisions for Jake to review

These decisions are codified in the Q1-Q12 resolutions but warrant explicit Jake review before Plan files are authored. Each is paired with a "reversibility cost" assessment so Jake can weigh.

| # | Decision | Source | Reversibility cost |
|---|---|---|---|
| **1** | **Owner Portal Path A locked** — token-based via extending 00074; no `owner_view` role; external actors uniform pattern (owners + architects + inspectors + subs all magic-link). | Q4b | **High** — Path A → Path B migration in Wave 4+ for commercial-tenant SSO/MFA is a bounded but real migration (backfill auth.users from portal access rows, create org_members rows, rewrite RLS policies). |
| **2** | **F1 entity surface = ENTITY-INVENTORY F1 column literal** — Clients (new) + fixes to existing; defer Employees/Time/Equipment/Daily Logs/etc. to F2-F6 + Waves 2-4. | Q1 + Q4 + Q12 | **Low** — adding F-N+1 entities later is additive; doesn't constrain. |
| **3** | **F1 keeps internal password auth** (`signInWithPassword` + `create_signup` RPC). | Q5 A | **Low** — bounded refactor if F1+-2 production SSO posture or Q7 SOC2 outputs trigger passwordless migration. |
| **4** | **Q6 F deletion safety-net trigger architecture** — 1 `SECURITY DEFINER` function applied across every tenant table via generated migration. User-identity threading via `current_setting('app.current_user_id', true)`. | Q6 | **Medium** — pattern is foundational; F2+ inherits user-identity-threading convention; trigger function itself can be modified additively. |
| **5** | **Q10b codified rule for child entity scope-axis** — ORG-scoped children → `org_id` from day one; USER-scoped children → may RLS-by-join. F1 denormalizes `invoice_allocations`; keeps `support_messages` as-is. | Q10b | **Low** — rule applies going forward; existing exceptions documented. |
| **6** | **Q11 D hybrid knowledge graph architecture** — schema/RLS in DB; types auto-generated; validators + helpers in app at `src/lib/knowledge-graph/`. | Q11 | **Medium** — establishes the pattern F2-F6 inherits. Extraction to standalone library (Option A) is bounded ~1-2 weeks if commercialization later separates services. |
| **7** | **Q12 uniform versioning pattern** — `status_history` JSONB + `activity_log` + Pay Apps revision rows (LOCKED exception only). No temporal tables. No snapshot columns. | Q12 | **Medium** — adding temporal tables later for SOC2 Type 2 is per-table cost. Not free, but bounded. |
| **8** | **Wave-A / Wave-B / Wave-C split structure** — Wave-A ships cleanup independently (autonomous-eligible); Wave-B foundational. | audit Section 7 | **Low** — wave structure is workflow choice; F1 deliverables don't change. |
| **9** | **F1 scope: 8 Wave-B plans + 4 Wave-A plans + optional Wave-C plan = 12-13 plans, 2.5-4 weeks total.** | audit + Q-resolutions | **Low** — scope can adjust during plan-phase if specific plans grow/shrink. |
| **10** | **F1 SOC2 posture: capable but no active pursuit.** | Q7 A | **Low** — pursuit can begin when commercial demand surfaces; ~2-3 months to attestation. |
| **11** | **Q10c drop `budgets` entirely** — versioning intent already encoded by `budget_lines.original_estimate` + `revised_estimate` + change_orders. | Q10c | **Medium** — adding budgets back later is doable but requires re-litigating the canonical entity decision. |
| **12** | **Q3 single-org-active per session with multi-org safety warning** — formalize current behavior; multi-org switcher deferred to commercial-demand phase. | Q3 A | **Low** — schema already supports multi-org via composite unique; UI switcher is additive Wave-N work. |

### Suggested review pattern

Per nwrp97 stop-after-expansion protocol:
1. Read EXPANDED-SCOPE.md
2. Confirm decisions match captured Q&A
3. Review proposed Wave-A / Wave-B / Wave-C decomposition
4. Authorize Plan file authoring OR request adjustments

Critical decisions #1, #4, #6, #11 are the highest-impact architectural commits — worth focused review.
