# Phase stage-f1-knowledge-graph-auth-wave-c — Context

**Authorization:** nwrp116 (2026-05-13) — Wave-C dispatch authorized; Option A sequencing (Wave-C before Wave-B per nwrp115 Item 2). Single-plan wave (Plan C-1 only).
**Source-of-truth:**
- `.planning/expansions/stage-f1-knowledge-graph-auth-wave-c-EXPANDED-SCOPE.md` (Wave-C preliminary scope from nwrp114; refined to committed per nwrp116)
- `.planning/expansions/stage-f1-knowledge-graph-auth-EXPANDED-SCOPE.md` (umbrella F1; nwrp116 amendments applied in commit `a37a5d4`)

<domain>
## Phase Boundary

Wave-C is the **`public.users` legacy retirement** wave of F1. Scope:

- Refactor 5 src files to read `profiles + org_members` exclusively (NOT `public.users`).
- Migration 00097: `DROP TABLE public.users CASCADE`.
- Smoke each refactored UI surface against Drummond reference data.
- NO new entities (Wave-B Plan B-1a creates Clients).
- NO RLS changes (no `public.users` RLS modifications needed; just drop after consumers cleared).
- NO knowledge-graph scaffold (Wave-B Plan B-1b).

**Goal:** Eliminate the triple-identity-table state (`public.users` + `profiles` + `org_members`) so Wave-B's auth refactoring works on a clean foundation. Per audit GAP item 20.

**Out of scope (Wave-B+ territory):**
- Clients entity creation
- KG scaffold + types pipeline
- Soft-delete DB-trigger safety net
- activity_log entity_type TS union extension
- Magic-link primitive + email-in primitive
- Cost-code wipe-and-reseed
- Fixture-maintenance contract enforcement (Amendment 3)
- RB org seed + Stripe + harness extensions

</domain>

<decisions>
## Implementation Decisions (inherited from umbrella EXPANDED-SCOPE.md + nwrp116)

Wave-C inherits these LOCKED decisions:

### Schema philosophy (Q2 A1 — full normalize)
- Wave-C's table drop is the FINAL step in eliminating the legacy identity-table; aligned with Q2 A1 spirit (`profiles + org_members` is the canonical identity path).

### Audit log (Q6 F + Amendment 4)
- Wave-C does NOT extend `activity_log` entity_type union (that's Wave-B Plan B-4).
- No new audit log writes from Wave-C work.

### RLS coverage (Q10b C codified rule)
- `public.users` is being dropped entirely; no RLS rewrite needed.
- All consumers refactored to read `profiles + org_members` (existing RLS posture preserved).

### Tenant boundary (D-30)
- Refactored read paths MUST preserve tenant-boundary-by-construction via `getCurrentMembership()` + org-scoped queries.

### Versioning (Q12 + Amendment 4)
- `public.users` is not a workflow entity (no status_history); the drop is structural cleanup, not versioning concern.

### Wave-B coordination
- Wave-C ships BEFORE Wave-B (Option A per nwrp116). Wave-B Plan B-1a (Clients entity creation + jobs.client_id FK) does NOT need to coordinate with `public.users` retirement; the drop happens first.

</decisions>

<files>
## File scope (per Wave-C EXPANDED-SCOPE preliminary + audit GAP item 20)

### Plan C-1 src refactors (5 files)
Per audit GAP item 20:
- `src/app/platform-admin/users/page.tsx` (platform-admin user listing)
- `src/app/invoices/queue/page.tsx` (invoice queue with reviewer name)
- `src/app/invoices/page.tsx` (invoices list with reviewer/PM names)
- `src/app/api/invoices/[id]/route.ts` (invoice detail with PM name)
- `src/app/jobs/new/page.tsx` (new job form with PM dropdown)

Execute-time grep at plan-authoring narrows to the exact `from("users")` read sites; audit may include incidental references not requiring refactor.

### Migration
- `supabase/migrations/00097_drop_public_users.sql` (new)
- `supabase/migrations/00097_drop_public_users.down.sql` (new)

### Smoke tests
- 5 refactored UI surfaces verified against Drummond reference data

</files>

<execution_envelope>
## Execution envelope (per nwrp116)

Autonomous execution permitted on:
- CATEGORY A — Mechanical/infrastructure (refactor src files + migration)
- CATEGORY B — Hook/CI scaffolding (N/A for Wave-C)
- CATEGORY C — Documentation (PLAN.md + SUMMARY.md)
- CATEGORY D — Phase-spec hygiene
- CATEGORY E — Established harness improvements (N/A for Wave-C)
- CATEGORY F — Plan execution within Wave-C scope per PLAN.md specs

HALT for Jake on:
- CATEGORY X — anything outside Wave-C scope (Wave-B work; deviations from Q1-Q12 + Q4b + Q10b + Q10c + amendments captured decisions)
- CATEGORY Y — risk situations (3 fix attempts failed on same root cause; pre-flight rowcount mismatch on public.users; cascade effects on FKs not in audit scope; smoke failure on UI surfaces post-refactor)

Cost ceiling: $5 cumulative vision spend (currently ~$2; halt if approaching $4).

Hook discipline (per nwrp114 + CLAUDE.md Dev Rule): NEVER `--no-verify` without Jake authorization. Drummond gate never bypassed under any circumstance.

Migration apply: gsd-executor still does NOT have `mcp__supabase__apply_migration` exposed; migration apply will be done by orchestrator after plan execute clean (or batched at GATE-C halt).
</execution_envelope>
