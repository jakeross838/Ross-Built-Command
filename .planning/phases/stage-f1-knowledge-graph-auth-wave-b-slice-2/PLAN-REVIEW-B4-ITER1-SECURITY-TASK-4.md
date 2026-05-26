---
reviewer: security-reviewer
scope: NARROW — Task 4 ONLY (per nwrp220 §8)
plan: B-4
iter: 1
date: 2026-05-22
verdict: PASS
blocking_findings: 0
must_fix_findings: 0
notes: 1
---

# Security Review — B-4 Task 4 ONLY (MEDIUM-1 PATCH /api/jobs org_id filter)

Scope strictly limited to Task 4 per nwrp220 §8. Tasks 1-3, 5-11 are NOT reviewed here.

---

## Check 1 — Fix correctness

**Source verified:** `src/app/api/jobs/route.ts` line 258-377.

The PATCH handler binds `membership` at line 266:
```typescript
const membership = await getCurrentMembership();
```

This is the canonical source per CLAUDE.md Development Rules ("Every API route uses `getCurrentMembership()` before DB access"). The `membership.org_id` value is server-derived from the authenticated session — it is not from `body` and cannot be attacker-influenced.

The proposed fix adds `.eq("org_id", membership.org_id)` to the UPDATE chain at line 373-377, immediately after `.eq("id", body.id)`. The chain order is:

```typescript
const { error } = await supabase
  .from("jobs")
  .update(patch)
  .eq("id", body.id)
+ .eq("org_id", membership.org_id)
  .is("deleted_at", null);
```

**Verdict: CORRECT.** The fix uses `membership.org_id` (server-authoritative), not `body.org_id` (attacker-controlled). The additional filter reduces the UPDATE predicate so it matches zero rows when `body.id` belongs to a different org. No regression on legitimate same-org PATCH: RLS already ensures `org_id = app_private.user_org_id()` aligns with `membership.org_id`, so the extra filter is redundant-but-harmless for the happy path.

One observation: the pre-read at line 278-283 (the `.select("retainage_percent, org_id, ...")` query) also lacks an `.eq("org_id", membership.org_id)` filter. This is a cosmetic gap — RLS still blocks cross-org reads — but it means a malicious request with a foreign `body.id` will get a 404 from the missing row rather than a cross-org-blocked 403. The behavior is correct (attacker learns nothing useful); the defense-in-depth is asymmetric vs the UPDATE. This is noted below under Notes, not flagged as a finding because it is a pre-existing pattern across this route and the behavior is safe.

---

## Check 2 — AC-B4-04 cross-tenant probe adequacy

AC-B4-04 specifies two verification mechanisms:

1. **Code grep** — `grep -A 5 'from("jobs")' ... | grep -B 2 -A 2 '.eq("org_id"'` — confirms the line is present. This is mechanical and falsifiable.

2. **Integration test stub** — org_B user PATCH on org_A job_id returns non-200 OR 0 rows updated.

Per PLAN §5 R-3, the test infrastructure may not support a full RLS-bound session; stub is acceptable with code-review evidence as the primary falsifier. This is **acceptable** for the following reasons:

- The RLS policy on `public.jobs` (migration 00016:159) is `RESTRICTIVE FOR ALL USING (org_id = app_private.user_org_id())`. This is the DB-layer backstop.
- The application-layer `.eq("org_id", membership.org_id)` adds defense-in-depth. The threat model for MEDIUM-1 was defense-in-depth missing — not RLS absent. Adding the filter closes the gap.
- "Non-200 OR 0 rows updated" is the correct specification: even if test infra uses service-role (BYPASSRLS), mocking `membership.org_id` to org_B's id while passing org_A's `job_id` exercises the application-layer filter directly.
- Code-review evidence (confirming `membership.org_id` is server-authoritative per Check 1) is sufficient primary verification at this threat-model severity.

**Verdict: AC-B4-04 is adequately falsifiable. Test stub + code-review evidence meets the MEDIUM-1 bar per PLAN §5 R-3.**

---

## Check 3 — Defense-in-depth posture

**RLS policy on `public.jobs` (migration 00016:159):**
```sql
CREATE POLICY "org isolation" ON public.jobs
  AS RESTRICTIVE FOR ALL
  USING (org_id = app_private.user_org_id())
  WITH CHECK (org_id = app_private.user_org_id());
```

This is canonical Pattern A: RESTRICTIVE policy, direct-filter on `org_id`, uses `app_private.user_org_id()` session helper (wrapped in a stable function — session-cached, not per-row evaluated).

**Interaction analysis:** Adding `.eq("org_id", membership.org_id)` to the UPDATE chain does NOT weaken RLS. The two filters are AND-ed at the Postgres level: the UPDATE's WHERE clause becomes `id = $1 AND org_id = $2 AND deleted_at IS NULL`, and RLS adds `org_id = app_private.user_org_id()`. When both `membership.org_id` and `user_org_id()` resolve to the same value (the authenticated user's org), the combined predicate is `org_id = X AND org_id = X` — redundant but correct. There is no scenario where the application filter could mask an RLS failure: if RLS is dropped accidentally, the application filter still blocks cross-org updates. Defense-in-depth is correctly layered.

No masking, no weakening, no subtle interaction.

**Verdict: Defense-in-depth correctly added. RLS unaffected.**

---

## Check 4 — Scope boundary

This review covers Task 4 only. The following items were observed during file reading but are explicitly NOT reviewed:

- Task 5 race-catch (`insertError.code === '23505'` branch at ~line 67-78) — outside scope.
- Task 3 write-site sweep routes — outside scope.
- Tasks 8-10 validator changes — outside scope.

**NOTE (out of scope — flag only):** During reading the PATCH handler, the SELECT pre-read at lines 278-283 queries `jobs` by `body.id` without an `org_id` filter. RLS makes this safe. It is a pre-existing pattern shared with other routes. Not a B-4 finding; if the custodian or another reviewer wants to track application-layer consistency on reads as well, that is a separate TD item. NOT a MUST-FIX for B-4.

---

## Summary

| Check | Result |
|-------|--------|
| Fix uses `membership.org_id` (server-authoritative, not `body.org_id`) | PASS |
| Filter chains correctly on UPDATE; no regression | PASS |
| AC-B4-04 falsifiability (grep + test stub + code-review) | PASS |
| Defense-in-depth layer correct; RLS not weakened | PASS |
| Scope boundary honored | PASS |

**Verdict: PASS — no blocking findings, no must-fix findings. Task 4 fix is correct. B-4 execute may proceed on Task 4.**
