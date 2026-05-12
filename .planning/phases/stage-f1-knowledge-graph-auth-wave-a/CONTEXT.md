# Phase stage-f1-knowledge-graph-auth-wave-a — Context

**Authorization:** nwrp113 (2026-05-12) — Wave-A plan authoring + autonomous execution; Wave-B deferred pending Jake review of umbrella EXPANDED-SCOPE.md.
**Source-of-truth:** `.planning/expansions/stage-f1-knowledge-graph-auth-wave-a-EXPANDED-SCOPE.md` (this wave) + `.planning/expansions/stage-f1-knowledge-graph-auth-EXPANDED-SCOPE.md` (umbrella Q&A).

<domain>
## Phase Boundary

Wave-A is the **cleanup + D-035 first-day + schema-shape concerns** wave of F1. Scope:

- D-035 first-day tasks (drop `change_order_budget_lines`, add `lien_releases.status_history` + `jobs.status_history`, fix docx-html auth, decide `budgets` fate → drop entirely).
- Schema-shape concerns surfaced by migration audit (`invoice_allocations` org_id denormalization per Q10b).
- Optional: `public.users` legacy retirement (5 src files refactor; absorbed or deferred to Wave-C).
- NO new entities (Clients is Wave-B).
- NO new triggers (deletion safety net is Wave-B).
- NO knowledge-graph scaffold (that's Wave-B Plan B-7).

**Goal:** Land the cleanup that makes Wave-B knowledge-graph work cleaner. Low blast radius. Independent ship.

**Out of scope (Wave-B territory):**
- Clients entity creation + jobs.client_id FK + Q2 A1 normalization
- client_portal_access.client_id FK
- Owner Portal Path A minimum UI (Q4b)
- Soft-delete DB-trigger safety net (Q6 F)
- activity_log entity_type TS union extension for F1 entities (Wave-B Plan B-4)
- Magic-link primitive + email-in receiving primitive
- Cost-code wipe-and-reseed per D-020
- Fixture-maintenance contract codification (Q9 D)
- Knowledge-graph scaffold + database.types.ts generation pipeline (Q11 D)
- RB org seed + Stripe sanity check + Q2 EXPLAIN ANALYZE
- Harness extensions (multi-viewport per F1+-4)

</domain>

<decisions>
## Implementation Decisions (inherited from umbrella EXPANDED-SCOPE.md)

Wave-A inherits these LOCKED decisions from the umbrella Q&A — do NOT re-litigate during planning or execution:

### Schema philosophy (Q2 A1 + B1 + verification)
- Full normalize: new entities get their own table, FKs to parent. Wave-A doesn't create new entities, but the principle applies to schema-shape changes (A-4 denormalizing org_id onto invoice_allocations).
- Lean cache footprint. Wave-A doesn't add trigger caches.
- EXPLAIN ANALYZE verification step is a Wave-B deliverable; not Wave-A.

### Audit log (Q6 F)
- Strategy 1-prime structure preserved (entity_type + action separate columns).
- Wave-A keeps existing 11-entry entity_type union (drops `'budget'` per A-3).
- Wave-B (Plan B-4) adds new F1 entities to the union — NOT this wave.
- DB-trigger deletion safety net is Wave-B Plan B-3 — NOT this wave.

### Versioning (Q12 A uniform)
- status_history JSONB on every workflow entity. Wave-A closes coverage gap on `lien_releases` + `jobs` (A-1) per D-035 #2 + audit R.7 bonus.
- activity_log for cross-entity events (existing pattern; A-3 removes `'budget'` entity from union).
- No temporal tables. No snapshot columns.

### RLS coverage (Q10b C codified rule)
- Wave-A A-4 implements the codified rule for `invoice_allocations` (ORG-scoped child → add org_id + direct-filter).
- `support_messages` documented as USER-scoped child (comment-only update on its migration file).
- CLAUDE.md Architecture Rules updated with the rule + examples in A-4.

### Stripe (Q10 A)
- Wave-A does NOT seed RB org subscription_status (that's Wave-B Plan B-8). Wave-A doesn't touch Stripe.

### Tenant boundary (D-30)
- Wave-A migrations MUST preserve D-30. A-4's RLS rewrite (JOIN → direct-filter) is the only RLS change; regression test verifies boundary still enforced.

### Knowledge graph implementation (Q11 D hybrid)
- Wave-A does NOT scaffold `src/lib/knowledge-graph/`. That's Wave-B Plan B-7.

### Owner Portal (Q4b Path A)
- Wave-A does NOT touch client_portal_access or Owner Portal UI. That's Wave-B Plan B-2.

### Roles + auth (Q4 + Q5)
- Wave-A does NOT change OrgMemberRole enum (stays at 4 values).
- Wave-A does NOT change internal auth UX (password remains for internal users).

</decisions>

<files>
## File scope (rough estimate per plan)

### A-1 D-035 cleanup migrations
- `supabase/migrations/00094_<descriptive_name>.sql` (new)
- `supabase/migrations/00094_<descriptive_name>.down.sql` (new — rollback)
- `src/app/api/lien-releases/[id]/route.ts` (PATCH route updated for status_history append on transition)
- `src/app/api/lien-releases/bulk/route.ts` (bulk operations updated)
- `src/app/api/jobs/[id]/route.ts` (PATCH route updated for status_history append on transition)
- `CLAUDE.md` (Architecture Rules update for uniform status_history rule)

### A-2 docx-html auth gate fix
- `src/app/api/docx-html/<route>.ts` or equivalent endpoint (path to confirm during plan-phase)
- No migration

### A-3 Drop budgets + refactor
- `supabase/migrations/00095_drop_budgets.sql` (new)
- `supabase/migrations/00095_drop_budgets.down.sql` (new — rollback)
- `src/lib/recalc.ts` (line 253 area; remove budgets.total_amount update)
- `src/app/api/budget-lines/route.ts` (lines 60-70; remove budget lookup)
- `src/lib/activity-log.ts` (line 26; remove `'budget'` from union)
- `CLAUDE.md` (Data Model section update to remove `budgets`; document derived-from-line-items pattern)

### A-4 invoice_allocations org_id denormalize
- `supabase/migrations/00096_invoice_allocations_org_id.sql` (new)
- `supabase/migrations/00096_invoice_allocations_org_id.down.sql` (new — rollback)
- `supabase/migrations/00051_support_chat.sql` (comment-only doc update; no DDL change — note re: Q10b codified rule)
- `CLAUDE.md` (Architecture Rules with Q10b codified rule + examples)

### A-5 (optional) public.users retirement
- 5 src files (TBD via grep during plan-phase; audit GAP item 20 references)
- `supabase/migrations/00097_drop_public_users.sql` (new — only if absorbed)
- `supabase/migrations/00097_drop_public_users.down.sql` (new — only if absorbed)

</files>

<execution_envelope>
## Execution envelope (per nwrp113)

Autonomous execution permitted on:
- CATEGORY A — Mechanical/infrastructure (migrations, code refactors within plan scope, type fixes)
- CATEGORY B — Hook/CI scaffolding
- CATEGORY C — Documentation (CLAUDE.md updates, plan SUMMARY.md authoring)
- CATEGORY D — Phase-spec hygiene
- CATEGORY E — Established harness improvements
- CATEGORY F — Plan execution within Wave-A scope per PLAN.md specs

HALT for Jake on:
- CATEGORY X — anything outside Wave-A scope (Wave-B work; Wave-C work IF A-5 not authorized; deviations from Q1-Q12 + Q4b + Q10b + Q10c captured decisions)
- CATEGORY Y — risk situations (3 fix attempts failed on same root cause; cost cap $4 approaching; plan-review CRITICAL findings; unexpected production schema touch)

Cost ceiling: $5 cumulative vision spend (currently ~$2; halt if approaching $4).
</execution_envelope>
