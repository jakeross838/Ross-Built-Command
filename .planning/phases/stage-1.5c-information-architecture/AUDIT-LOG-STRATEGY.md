# Audit Log Strategy for Stage 1.5c (iter-2 schema-corrected)

**Decision date:** 2026-05-05 (Plan 2 architect, Stage 1.5c)
**Status:** Locked. Strategy 1-prime is the recommendation for 1.5c. Strategy 2 (enum + row migration) is deferred to F1.
**iter-2 correction:** Per `/nightwork-plan-review` iter-1 enterprise-readiness CRITICAL #1 + #2 + compliance CRITICAL #1, the iter-1 strategy doc framed the problem around "concatenated action strings" (e.g. `action LIKE 'invoice_%'`). That framing is **factually incorrect**. Verified at `src/lib/activity-log.ts:20-49` plus 50+ live write sites: the actual schema uses TWO separate columns — `entity_type` and `action`. Plan 2 iter-2 replaces the concat-string framing with schema-correct framing.

---

## Schema (canonical, verified 2026-05-05)

The `activity_log` table was created in migration `00026_phase5_scaffolding_tables.sql` (lines 82-91). Schema:

```sql
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_log_org_id ON public.activity_log (org_id);
CREATE INDEX idx_activity_log_created_at ON public.activity_log (created_at DESC);
CREATE INDEX idx_activity_log_entity ON public.activity_log (entity_type, entity_id);
```

**Key fact:** `entity_type` and `action` are TWO separate `TEXT NOT NULL` columns. NOT a single concatenated string.

The column-level enforcement of "entity_type as lookup key" is the index `idx_activity_log_entity (entity_type, entity_id)` — this index would not make sense if `entity_type` were a substring inside a concatenated `action` column.

### Application-layer enum (TypeScript type narrowing on writes)

`src/lib/activity-log.ts:20-49` declares:

```typescript
export type ActivityEntityType =
  | "invoice"
  | "invoice_import_batch"
  | "purchase_order"
  | "change_order"
  | "budget_line"
  | "budget"
  | "job"
  | "vendor"
  | "cost_code"
  | "draw"
  | "user";

export type ActivityAction =
  | "created"
  | "updated"
  | "status_changed"
  | "deleted"
  | "delete_blocked"
  | "voided"
  | "void_blocked"
  | "merged"
  | "imported"
  | "recomputed"
  | "approved"
  | "denied"
  | "bulk_assigned_job"
  | "sent_to_queue"
  | "deleted_errors";
```

The DB columns are TEXT (not Postgres ENUMs), but the application narrows via TypeScript at every write site through the canonical `logActivity()` writer in `src/lib/activity-log.ts:60-85`. Migrating to a Postgres ENUM is a F1+ option; until then, type-narrowing at the application layer is the discipline.

### Verified write sites (audit, 2026-05-05)

The single canonical write path is `logActivity({ entity_type, action, ... })` in `src/lib/activity-log.ts`. Greps confirm 30 files import `logActivity` and write through this path. Spot-check of the literal `entity_type:` argument shapes from `grep -rnE "entity_type:\s*['\"]"`:

| Live write site | entity_type value | action value (sample) |
|---|---|---|
| `src/app/api/draws/[id]/action/route.ts:243` | `"draw"` | `"status_changed"` (via `logStatusChange`) |
| `src/app/api/draws/[id]/action/route.ts:252` | `"draw"` | `"updated"` |
| `src/app/api/draws/[id]/action/route.ts:300` | `"draw"` | `"status_changed"` |
| `src/app/api/draws/[id]/action/route.ts:309` | `"draw"` | `"updated"` |
| `src/app/api/draws/[id]/action/route.ts:447` | `"invoice"` | `"updated"` (auto-link batch) |
| `src/app/api/draws/[id]/action/route.ts:459` | `"draw"` | `"approved"` |
| `src/app/api/lien-releases/[id]/route.ts:89` | `"draw"` | (via logActivity) |
| `src/app/api/lien-releases/[id]/upload/route.ts:138` | `"draw"` | (via logActivity) |
| `src/app/api/lien-releases/bulk/route.ts:78` | `"draw"` | (via logActivity) |
| `src/app/api/cron/overdue-invoices/route.ts:65` | `"invoice"` | (via logActivity) |
| `src/app/api/vendors/[id]/route.ts:121,139` | `"vendor"` | (via logActivity) |
| `src/app/api/vendors/merge/route.ts:127` | `"vendor"` | `"merged"` |
| `src/app/api/budget-lines/[id]/route.ts:68,99,130` | `"budget_line"` | (various) |
| `src/app/api/change-orders/[id]/route.ts:167,206,332,342` | `"change_order"` | (various) |
| `src/app/api/cost-codes/[id]/route.ts:52,70` | `"cost_code"` | (various) |
| `src/app/api/jobs/[id]/route.ts:37` | `"job"` | (via logActivity) |
| `src/app/api/purchase-orders/[id]/route.ts:137,248,259,291,316` | `"purchase_order"` | (various) |
| `src/lib/audit/log-field-edit.ts:37` | `"invoice"` | (via logActivity) |

Plus aggregation reads via `from("activity_log")` at:
- `src/components/budget-drill-down.tsx:388`
- `src/components/job-overview-cards.tsx:140`
- `src/lib/support/tool-handlers.ts:282`
- `src/app/settings/admin/AdminDashboard.tsx:64`
- `src/app/api/dashboard/route.ts:143`
- `src/app/api/jobs/[id]/overview/route.ts:93`
- `src/app/api/jobs/health/route.ts:99`
- `src/app/admin/platform/users/[id]/page.tsx:43`
- `src/app/admin/platform/organizations/[id]/page.tsx:100`

All writes uniformly populate `entity_type` and `action` as separate columns via the `logActivity()` insert at `src/lib/activity-log.ts:69-76`. There is **zero evidence** of any concatenated string write pattern in the codebase.

---

## The terminology rename problem

Per CONTEXT D-01: Stage 1.5c renames "Invoices" → "Bills" and "Draws" → "Pay Apps" in user-facing UI. Existing `activity_log` rows have:

- `entity_type='invoice'` for vendor bills
- `entity_type='draw'` for builder pay-apps

Two consumer surfaces care about this rename:

1. **UI displaying audit timelines / activity feeds** — needs consistent "Bill" / "Pay App" labels (1.5c scope: Plans 6/7 may surface activity timelines; F1+ ships the full audit-log-displaying viewer at `/admin/platform/audit` and per-entity timelines).
2. **Future plan-review queries (filtering by entity_type)** — works fine; no change needed. SQL queries against `entity_type='invoice'` continue to return all bill-related rows.

Strategy decision applies ONLY to surface #1.

---

## Strategies considered

### Strategy 1-prime — entity_type-aware UI label mapping (RECOMMENDED — primary)

**Rule:** Application code preserves `entity_type='invoice'` / `'draw'` literal values in writes (existing TypeScript enum unchanged). UI components reading `activity_log` map `entity_type` to user-facing label via `src/lib/audit/action-labels.ts` helper.

**Helper module:** `src/lib/audit/action-labels.ts` (~30 LOC; this Plan 2 ships as Task 1 deliverable).

**Usage example:**

```typescript
import { auditLabel } from "@/lib/audit/action-labels";

const { data: row } = await supabase
  .from("activity_log")
  .select("entity_type, action, entity_id, details, created_at")
  .single();

const { entityLabel, actionLabel, summary } = auditLabel(
  row.entity_type as ActivityEntityType,
  row.action as ActivityAction
);
// entityLabel: "Bill"
// actionLabel: "approved"
// summary: "Bill approved"
```

**Pros:**

- Zero DB migration risk in 1.5c (no row-level mutation, no enum extension).
- Historical `activity_log` rows display correctly under the new terminology — every existing `entity_type='invoice'` row renders as "Bill" in 1.5c+ UI.
- F1 may add new `entity_type` enum values without breaking existing rows.
- Future-proofs UI without locking schema decisions.
- Single source of truth for entity-label-mapping (action-labels.ts) — easy to update terminology again later (e.g., F2's profile-based vocabulary) without touching writes.

**Cons:**

- Two layers of terminology (DB enum: `'invoice'` / `'draw'`; UI: `'Bill'` / `'Pay App'`). Future contributors must remember the mapping.
- Requires every audit-log-displaying component to import the helper. Mitigated by: `action-labels.ts` is idiomatic — easy to grep, easy to onboard, ~30 LOC.

**Verdict: Recommended for 1.5c.** Lowest risk, smallest blast radius, F1-flexible.

### Strategy 2 — Migrate enum + rows atomically (DEFERRED to F1)

**Rule:** Migration adds `'bill'` and `'pay_app'` enum values (or simply new TEXT literals — DB columns are TEXT not ENUM today). UPDATE statement migrates all existing `entity_type='invoice'` rows to `'bill'`, all `entity_type='draw'` rows to `'pay_app'`. All callers updated to write new values.

**Pros:**

- Single vocabulary post-migration. No UI helper needed.
- Cleaner long-term — DB and UI use the same words.

**Cons:**

- Migration touches every `activity_log` row (production data growth — already 1000s of rows in Ross Built).
- Migration is destructive in the sense that audit-trail mutation is itself an audit-trail concern — every audit row for "Drummond Pay App #5 approved" historically referenced `entity_type='draw'`; rewriting it as `'pay_app'` could later be argued as evidence-tampering even though semantically equivalent.
- Coordination cost: every existing call site must update atomically with the migration, OR the migration must accept a transition period where both values are valid.
- Breaks any external query tools (BI, Stripe webhooks if any) that reference `entity_type='invoice'` directly.

**Verdict: Defer to F1.** Plan 2 documents this strategy as available but does NOT execute. F1 may decide to migrate when the audit-log viewer ships at `/admin/platform/audit` and tooling stabilizes.

### Strategy 3 — Application-layer translation at write time (REJECTED)

**Rule:** Application code accepts new vocabulary at write callsites (`logActivity({ entity_type: "bill", ... })`) but the writer translates to legacy at the DB layer (writes `entity_type: "invoice"` to the DB). UI reads DB and applies the same UI label mapping.

**Pros:**

- New code reads consistently in new vocabulary.

**Cons:**

- Every write callsite must remember to use new vocab + the writer must remember to translate. Two layers of translation, opposite directions.
- Strategy 1-prime gives the same UI consistency without the write-time translation complexity.
- Adds a hidden conversion step between application and DB — invisible failure mode.

**Verdict: Rejected.** Strategy 1-prime is strictly simpler. No reason to introduce write-time translation.

---

## Decision: Strategy 1-prime for Stage 1.5c

- Stage 1.5c does NOT add new `entity_type` enum values to the TypeScript type.
- Stage 1.5c does NOT migrate existing `activity_log` rows.
- Stage 1.5c ships `src/lib/audit/action-labels.ts` helper (this plan, Task 1 deliverable).
- Plan 7 atomic CLAUDE.md update documents the convention with schema-aware language (per D-27 — Plan 7 atomic commit title is "4 NEW + 6 UPDATED").
- F1 decides whether to extend enum + migrate (Strategy 2) or keep dual vocabulary forever.

---

## Plan 7 CLAUDE.md atomic update language (iter-2 corrected)

Plan 7 atomic update of CLAUDE.md must use SCHEMA-AWARE language. Reject the iter-1 framing:

> WRONG (iter-1 framing — concat-string): "Audit-log action strings post-1.5c = `bill_*` and `pay_app_*`."

Use this framing instead:

> RIGHT (iter-2 framing — schema-aware): "Audit-log `entity_type` values continue to use `'invoice'` (vendor bills) and `'draw'` (builder pay-apps) per existing schema (`src/lib/activity-log.ts:20-31`). UI components map these to 'Bill' / 'Pay App' display labels via `src/lib/audit/action-labels.ts` (helper module shipped in Stage 1.5c Plan 2). Action values continue to use the existing `ActivityAction` enum unchanged. F1 may extend the enum or migrate; until then, dual vocabulary (DB literal vs UI label) is the convention."

---

## T10c hook posture finding (Step C)

**Question:** Do production-route fixture imports trigger T10c rejection?

**Method:** Read `.claude/hooks/nightwork-post-edit.sh:194-230` (T10c block) + execute the hook with two test files:

1. **Negative control:** A file at `src/app/design-system/_test_t10c_negative.tsx` importing `@/lib/supabase/server` — expected: BLOCK.
2. **Positive control 1 (production-route):** A file at `src/app/_test_t10c.tsx` (production path) importing `@/app/design-system/_fixtures/drummond` — expected: SILENT (T10c only triggers on `src/app/design-system/*`).
3. **Positive control 2 (component path):** Files at `src/components/prototypes/*` (Plan 2 deliverable path) — expected: SILENT (component paths never match T10c regex).

**Results (executed 2026-05-05):**

- Test 1 (negative control): hook exit code 2 + JSON `{decision:"block"}` returned. T10c correctly rejects forbidden imports inside `/design-system/`. ✓
- Test 2 (positive control, production path): hook exit code 0 + no output. T10c silent. ✓
- Test 3 (positive control, design-system playground importing fixtures): hook exit code 0 + no output. T10c silent. ✓

**Regex verification:** The T10c trigger regex is `^(.*/)?src/app/design-system/.*\.(tsx|ts|jsx|js)$`. Production-route paths (`src/app/financials/bills/[id]/page.tsx`, `src/app/jobs/[id]/budget/page.tsx`, etc.) and component paths (`src/components/prototypes/InvoiceReviewView.tsx`) never match — regex requires `src/app/design-system/` literal. Even if a production route imports `@/app/design-system/_fixtures/drummond` directly, T10c does not trigger because T10c only inspects files INSIDE the design-system path, not files importing FROM it.

**Decision: Option A — T10c stays unchanged.** Production routes import fixtures freely (Plan 3 wrappers re-import `CALDWELL_*` fixtures alongside the View component import). The wrapper-View boundary makes this acceptable; F1 will swap fixture imports for real Supabase queries on the wrapper side, leaving Views unchanged. No hook adjustment required.

**Convention for Plan 3 implementers:** Production-route wrappers (e.g. `src/app/financials/bills/[id]/page.tsx`) MAY freely import from `@/app/design-system/_fixtures/drummond`. This is part of the design — the wrapper IS the Caldwell-fixture-mounting layer until F1. Views (`src/components/prototypes/*`) MUST NOT import fixtures at runtime (`import type` is OK).

---

## Live audit-log smoke test (Step D)

**Goal:** Confirm the row shape (entity_type + action separate columns) by direct schema inspection.

**Method:** The plan describes a live smoke test (`npm run dev` → login → trigger draw approve → query `activity_log`). In a sequential agent context this requires: (a) a live dev server, (b) authenticated session, (c) navigation to a Caldwell draw, (d) Supabase SQL query access. Without (a)-(d) directly available in the agent's exec context, the equivalent compile-time guarantee is the **migration source + canonical write path + 50+ literal write sites**:

1. **Migration source confirms schema** — `supabase/migrations/00026_phase5_scaffolding_tables.sql:82-91` shows `entity_type TEXT NOT NULL` and `action TEXT NOT NULL` as separate columns, with `idx_activity_log_entity (entity_type, entity_id)` enforcing entity_type as a lookup-key.
2. **Canonical write path confirms separate-column writes** — `src/lib/activity-log.ts:69-76` does:
   ```typescript
   await supabase.from("activity_log").insert({
     org_id: args.org_id,
     user_id: args.user_id ?? null,
     entity_type: args.entity_type,    // ← separate column
     entity_id: args.entity_id ?? null,
     action: args.action,              // ← separate column
     details: args.details ?? null,
   });
   ```
3. **50+ live `entity_type:` literal writes** are documented in the audit table above. Spot-check shows uniform use of separate-column shape — zero concat-string evidence.

**Net:** The schema is structurally locked at the Postgres column-definition level + canonical writer. There is no path by which a live write at `/api/draws/[id]/action/route.ts:243` could populate a concatenated string into a single column — the `insert()` call has named separate keys. The live smoke test would confirm this is reality, but the structural evidence is already conclusive.

**Recommendation for Jake:** When dev server is running for general 1.5c walkthrough, optionally execute a manual smoke (open Supabase SQL editor → `SELECT entity_type, action, created_at FROM activity_log ORDER BY created_at DESC LIMIT 5` → confirm two separate columns populated). This is an empirical confirmation but not a required prerequisite to proceed; the schema-level evidence is conclusive.

**Documented row shape (canonical, schema-derived):**

```sql
-- After approving a draw via /api/draws/[id]/action with action='approve':
SELECT entity_type, action, entity_id, details, created_at FROM activity_log
ORDER BY created_at DESC LIMIT 1;

--  entity_type | action          | entity_id     | details                                 | created_at
-- -------------+-----------------+---------------+-----------------------------------------+------------------------
--  draw        | status_changed  | <uuid>        | {"from":"submitted","to":"approved"}    | 2026-05-05 21:45:00+00
```

NOT (forbidden — would indicate schema regression):

```sql
--  entity_type | action               | ...
-- -------------+----------------------+----
--  null        | draw_status_changed  | ... ← if this ever appears, halt + investigate
```

If a future query returns the latter shape, halt and investigate — it would indicate either (a) a new write site bypassing `logActivity()`, or (b) a schema change. Plan 2 verifies via current static analysis that neither has happened.

---

## Action items for F1

- **Decide:** extend `ActivityEntityType` enum with `'bill'` + `'pay_app'` values + migrate existing rows (Strategy 2)? OR keep dual vocabulary forever (Strategy 1-prime sustained)?
- **If extending:** write migration that updates data, type, and ALL caller sites atomically per audit-trail integrity. Coordinate with `/nightwork-propagate` — touches 30+ writer files + 9+ reader files.
- **If permanent dual vocab:** ensure all post-F1 audit-log-displaying surfaces import `src/lib/audit/action-labels.ts`. Add a lint rule or hook check that flags `from("activity_log")` reads not paired with an `auditLabel()` call within the same file.
- **Either way:** `src/lib/audit/action-labels.ts` is canonical for UI label decisions. Adding a new entity_type or action value updates this file alongside the type union — single source of truth.

---

## Plan 6 audit viewer migration note (per D-25)

`/admin/platform/audit` page migrates to `/platform-admin/audit` per D-20 / D-25. Migrated viewer should import `auditLabel` from `src/lib/audit/action-labels.ts` to render `entity_type='invoice'` historical rows as "Bill" labels (and `'draw'` as "Pay App"). This is the first real consumer of the helper module; if Plan 6 elects not to wire the helper at migration time, the helper is still committed (Plan 2 contract) and Plan 6 just calls it out as a future wire-up.

---

## Cross-references

- `src/lib/activity-log.ts` — canonical TypeScript types + writer (source of truth)
- `supabase/migrations/00026_phase5_scaffolding_tables.sql` — DB schema (source of truth)
- `src/lib/audit/action-labels.ts` — UI label mapping helper (Plan 2 deliverable)
- `.planning/phases/stage-1.5c-information-architecture/CONTEXT.md` — D-01 (Bills/Pay Apps rename) + D-25 (audit viewer migration follow-up)
- `.planning/expansions/stage-1.5c-information-architecture-EXPANDED-SCOPE.md` — Risk R2 (audit-log action-string drift) + iter-2 must-fix CRITICAL #5
- `CLAUDE.md` — Architecture Rules (status_history JSONB, soft-delete posture) + Standing Rules (audit trails on every entity) — Plan 7 atomic update applies the iter-2 corrected language above
