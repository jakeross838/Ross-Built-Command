# F1-Wave-C — `public.users` Legacy Retirement — EXPANDED-SCOPE (PRELIMINARY)

**Status:** PRELIMINARY — pending Jake authorization to dispatch.
**Authorization trigger:** nwrp114 item 2 — "A-5 (public.users retirement) → DEFER to Wave-C".
**Phase name:** `stage-f1-knowledge-graph-auth-wave-c`
**Wave of:** F1 — Knowledge Graph + Auth Foundation (umbrella)
**Sibling waves:**
- F1-Wave-A (shipped 2026-05-12; cleanup + D-035 + schema-shape)
- F1-Wave-B (deferred pending Jake review of umbrella EXPANDED-SCOPE.md)
**Umbrella EXPANDED-SCOPE.md:** `.planning/expansions/stage-f1-knowledge-graph-auth-EXPANDED-SCOPE.md`
**Source audit:** `.planning/audits/2026-05-12-migration-inventory.md` GAP item 20

---

## Stated scope (verbatim from nwrp114)

> A-5 (public.users retirement) → DEFER to Wave-C
> - Reasoning: medium-blast refactor doesn't fit Wave-A's bounded-cleanup verdict
> - Document Wave-C scope: 5 src file refactors + public.users DROP after consumers cleared

---

## What's pre-locked

- **Decision: DEFER A-5 to Wave-C** (Jake nwrp114). Original Wave-A optional A-5 plan stays as canonical input.
- **Medium blast radius:** 5 src files refactored to read `profiles + org_members` exclusively (touches UI query results in some surfaces).
- **Sequencing relative to Wave-B:** Wave-C can ship BEFORE Wave-B (cleanup work), AFTER Wave-B (parallel), or AS A WAVE-B SUB-WAVE depending on Jake's call at Wave-B authorization. Default: Wave-C dispatches as standalone after Wave-B ships.
- **No new entities, no new RLS policies, no schema additions** — pure code refactor + table drop.

---

## Plan list (preliminary)

| Plan | Migration | Code changes | Source |
|---|---|---|---|
| **C-1** Retire `public.users` legacy table | 00097 (DROP TABLE) | 5 src files refactored: identified during Wave-A audit GAP item 20; concrete file list at execute time via `grep -rn "from\(\"users\"\)\|public\.users" src/` | nwrp114 + audit Section 5 |

Per audit, the 5 src consumers reading `public.users` (rather than canonical `profiles + org_members`):
- `src/app/platform-admin/users/page.tsx`
- `src/app/invoices/queue/page.tsx`
- `src/app/invoices/page.tsx`
- `src/app/api/invoices/[id]/route.ts`
- `src/app/jobs/new/page.tsx`

*(Note: audit also identified additional files referencing `users` — `src/app/api/jobs/[id]/overview/route.ts`, `src/app/admin/platform/users/page.tsx`, `src/app/settings/usage/page.tsx`, `src/app/api/organizations/members/invite/route.ts`, `src/lib/plan-limits.ts`. Execute-time grep will narrow to actual `from("users")` reads vs incidental references.)*

---

## Acceptance criteria (preliminary)

### Plan C-1 acceptance

1. **Grep verification at execute start:** `grep -rn 'from\("users"\)\|public\.users' src/` enumerates the exact consumer file list. Confirm matches audit GAP item 20 expectation (~5 files).
2. **Refactor each consumer** to read `profiles + org_members` exclusively. Preserve UI behavior:
   - `src/app/platform-admin/users/page.tsx` — platform-admin user listing (uses `auth.users + profiles + platform_admins` join post-refactor)
   - `src/app/invoices/queue/page.tsx` — invoice queue with reviewer name
   - `src/app/invoices/page.tsx` — invoices list with reviewer/PM names
   - `src/app/api/invoices/[id]/route.ts` — invoice detail with assigned PM name
   - `src/app/jobs/new/page.tsx` — new job form with PM dropdown
3. **Migration 00097_drop_public_users.sql** (+ paired `.down.sql`):
   - `DROP TABLE public.users CASCADE` (with `-- nightwork: drop-justified` marker)
   - Down migration restores schema (NOT data — production `public.users` rows captured as fixture for emergency restore via audit Section 5 evidence; document in down comment)
4. **Test coverage:** UI smoke for the 5 refactored surfaces — Drummond reference data must render correct user names post-refactor.
5. **`npm run build` + harness Layer 1 + Drummond gate green.**
6. **Pre-flight executor check:** `SELECT COUNT(*) FROM public.users;` documented for posterity; expected to match `auth.users + profiles` row count post-refactor.

---

## Sequencing options

| Option | Timing | Tradeoff |
|---|---|---|
| **A. Wave-C before Wave-B** (recommended) | After Wave-A migrations apply + verify; before Wave-B dispatch | Clean foundation entering Wave-B. Wave-B inherits no `public.users` legacy concerns. ~0.5-1 day insert. |
| **B. Wave-C after Wave-B** | After Wave-B ships | Wave-B Plan B-1 (Clients entity creation) may touch some of the 5 consumer files anyway — wait to avoid double-refactor. But Wave-B's clean-foundation expectation means inheriting legacy. |
| **C. Wave-C absorbed into Wave-B Plan B-1** | As sub-task of Wave-B Plan B-1 | Single PR; tightest coupling. But Plan B-1 already substantial; absorbing C adds blast radius. |

**Default: Option A** unless Jake routes via Wave-B authorization.

---

## Out-of-scope (Wave-C does NOT)

- Add new Clients entity (Wave-B Plan B-1)
- Change `auth.users` Supabase Auth table (foundational; never modified)
- Refactor non-listed consumers (per audit, the 5 listed are the active read sites; incidental references in test files / docs are out of scope)
- Modify `profiles` + `org_members` schema (Wave-B + F2 territory)

---

## Risk register (preliminary)

| Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|
| 5-file refactor breaks UI surface rendering user names | Medium | Low | Smoke each surface against Drummond reference; pre-merge Vercel-preview verification |
| Backfill from `public.users` → `auth.users + profiles` finds row count mismatch | Low | Medium | Pre-flight `SELECT COUNT(*)` comparison; if mismatch, HALT for Jake |
| Cascade effects on FKs not in audit scope | Low | Medium | `DROP TABLE CASCADE` + post-DDL `pg_constraint` query verifies no orphan refs |
| Wave-B Plan B-1 Clients work collides with C-1 refactor | Low | Low | Sequence: ship Wave-C BEFORE Wave-B Plan B-1 (Option A default) |

---

## Estimated total

**0.5-1 day** (single plan; 5 file refactor + 1 migration + smoke tests + atomic commit + push).

---

## Halt gates

- **Pre-flight HALT** if `SELECT COUNT(*) FROM public.users` mismatches `auth.users + profiles` row counts unexpectedly.
- **Plan-review iter-1** (lightweight: architect + database-reviewer + security-reviewer + nightwork-data-migration-safety; ~4 reviewers).
- **Post-execute HALT** if any of the 5 UI smokes fails.
- **GATE-C halt** for Jake review before Wave-B dispatch (if Option A) or before next-wave dispatch (Options B/C).

---

## Activation

Wave-C is **not authorized for dispatch yet.** Authorization trigger: Jake explicitly authorizes at:
1. Wave-A GATE-A halt review (could be: "approve Wave-C now alongside Wave-A wrap-up"), OR
2. Wave-B authorization decision (could be: "Wave-C first, then Wave-B" — Option A), OR
3. Standalone Wave-C dispatch decision later.

**Default expectation per nwrp114:** Wave-C dispatches as a focused single-plan wave between Wave-A and Wave-B. Jake confirms or routes alternative at Wave-B authorization.
