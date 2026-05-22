# Deferred items — stage-f1-knowledge-graph-auth-wave-b-slice-2

Items discovered during plan execution that are out of scope for the current plan but should be tracked.

## B-3 (2026-05-22)

### Pre-existing test failures (NOT caused by B-3)

Verified via `git stash` baseline run BEFORE B-3 changes — identical failures present:

- `src/app/api/lien-releases/bulk/route.ts` — 3 of 9 tests failing on bulk mark_received / waive flow (regression guard tests). Pre-existing; unrelated to B-3 trigger or DEF-WC-1 RLS.
- `src/app/api/.../org_members.maybeSingle()/single()` GH #18 — 1 of 4 tests failing on lint guard about ordering / org_id filter. Pre-existing; unrelated to B-3.

**Disposition:** Out of scope per executor Deviation Rules scope-boundary. Track here; do not fix as part of B-3. Investigate and resolve in a future maintenance plan (likely Wave 1.1-Lite cleanup).
