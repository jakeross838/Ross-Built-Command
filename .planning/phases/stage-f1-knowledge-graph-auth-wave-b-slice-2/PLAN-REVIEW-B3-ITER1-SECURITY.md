# Plan-Review B-3 — Security Reviewer (LOAD-BEARING)
# iter-1 — Soft-delete DB-trigger audit safety net + DEF-WC-1 + DEF-WC-3

**Generated:** 2026-05-22
**Reviewer role:** Security Reviewer (LOAD-BEARING per nwrp214 §17)
**Plan reviewed:** `B-3-PLAN.md` (1191 lines, commit 2f8e93a on origin/main)
**Threat model severity:** HIGH (SECURITY DEFINER trigger function across 32 tables + RLS change on membership-authority table + audit trail foundation)
**Inputs also reviewed:** B-3-CONTEXT.md (51 decisions), migration 00103 (canonical REVOKE pattern), migrations 00104 + 00105 (B-2a ACL hardening lesson), CLAUDE.md Dev Rules

---

## Verdict: NEEDS-WORK

**Summary:** The B-3 plan is architecturally sound and the core SECURITY DEFINER posture is correctly designed — `SET search_path = public, pg_temp`, `REVOKE EXECUTE FROM PUBLIC`, org_id sourced from `NEW` (not session), graceful NULL-tier fallback. Three issues require resolution before /nx: (1) the trigger function body shown in §2.1 is missing an exception handler — the plan defers "Plan-author finalizes exception handling at iter-1" but supplies no handler text, leaving the most important safety property (trigger MUST NOT block the underlying soft-delete) unverified at plan-review time; (2) the `app.current_user_id` GUC is writable by any authenticated session in the service-role escape tier — the plan does not explicitly state that `set_config('app.current_user_id', ...)` is callable ONLY from server-side trusted code and cannot be called by client-bound SQL, creating a user-identity spoofing vector that must be addressed as a documented constraint; (3) the inline verification DO block for migration 00107 (AC M-05) uses a string-contains check on `proacl` text representation that will NOT reliably detect a PUBLIC EXECUTE grant — the B-2a lesson from migration 00103 shows the correct pattern is `aclexplode` + `grantee = 0` (PUBLIC OID), not string matching. One additional MEDIUM finding is surfaced on the hard-DELETE covert-scrub vector. No findings are raised on search_path, REVOKE FROM PUBLIC declaration, org_id threading, or DEF-WC-1 policy design — all are correct.

---

## Per-threat-surface findings

### Threat Surface 1 — SECURITY DEFINER function: search_path, REVOKE, ACL surface

**Finding SEC-B3-01 — PASS**

`app_private.audit_soft_delete()` as specified in §2.1 correctly carries:
- `SECURITY DEFINER` declaration (required for cross-RLS writes to `public.activity_log` from trigger context)
- `SET search_path = public, pg_temp` — matches CLAUDE.md mandate and the canonical pattern from migration 00102 sweep + `app_private.user_org_id` / `app_private.is_platform_admin` family
- `REVOKE EXECUTE ON FUNCTION app_private.audit_soft_delete() FROM PUBLIC;` — appears immediately after the `$$;` function body close in the §2.1 sketch (line 464 of plan), matching the canonical 00103 pattern

The function lives in `app_private` schema. No EXECUTE grant to `anon` or `authenticated` is declared or implied — only the trigger mechanism invokes it, which runs as table-owner (`postgres`) regardless of session role. PASS on ACL surface.

**Finding SEC-B3-02 — PASS**

`NEW.org_id` is the explicit source for `activity_log.org_id` (§2.1 INSERT block, line 451 of plan, and §1.7 write mapping). The trigger does NOT use session-derived org context. This is the correct design: the audit row stays in the same tenant as the soft-deleted row regardless of the calling session's org context. AC-B3-07 explicitly live-verifies this (cross-join source vs audit org_id). PASS.

**Finding SEC-B3-03 — BLOCKING: Trigger exception handler absent from plan body; deferred "at iter-1" with no proposed text**

The §2.1 function body includes this comment in Task 1 Deviation Handling (line 632 of plan):

> "If `auth.uid()` evaluation inside trigger function raises (e.g., context missing): trigger function must guard with `BEGIN ... EXCEPTION WHEN OTHERS THEN ...` to tier-down gracefully. Plan-author finalizes exception handling at iter-1."

The §2.1 code sketch does NOT include the exception block. The CONTEXT D-25 states: "Trigger function does NOT throw or block on missing user_id." The <criteria> behavioral AC-B3-10 states: "Trigger does NOT block soft-delete on missing user_id (graceful degradation)."

The current §2.1 body is:

```sql
BEGIN
  -- three-tier resolution ...
  INSERT INTO public.activity_log (...) VALUES (...);
  RETURN NEW;
END;
```

If the `INSERT INTO public.activity_log` raises (e.g., `activity_log.entity_type NOT NULL` constraint violated, or any transient DB error), the trigger RAISES, which causes the underlying soft-delete `UPDATE` to FAIL. This violates the plan's own AC-B3-10 contract and CONTEXT D-25's "MUST NOT block the underlying soft-delete."

The missing exception handler is a BLOCKING issue at plan-review time because:

1. The final migration body is authored from §2.1 as the design spec. If the executor ships §2.1 verbatim, the fail-open safety property is absent.
2. AC-B3-10 verifies graceful degradation only on NULL `user_id` — it does NOT cover INSERT failure (e.g., activity_log schema mismatch, table not found at `SET search_path` resolution time, disk-full scenario). The AC scope is narrower than the protection gap.
3. The plan explicitly defers this to iter-1 — this IS iter-1.

**Required fix:** Plan-author must add the exception handler to §2.1 before /nx. Canonical form:

```sql
BEGIN
  -- three-tier resolution ...
  BEGIN
    INSERT INTO public.activity_log (...) VALUES (...);
  EXCEPTION WHEN OTHERS THEN
    -- Trigger MUST NOT block the underlying soft-delete.
    -- Log to pg_notify or RAISE NOTICE only; swallow exception.
    RAISE WARNING 'audit_soft_delete: failed to write activity_log for %.% (id=%): %',
      TG_TABLE_SCHEMA, TG_TABLE_NAME, NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
```

Note: `RAISE WARNING` surfaces to Supabase logs and Sentry-captured PostgREST errors at WARNING level without raising to ERROR. This does NOT propagate the exception to the caller. Executor may choose `RAISE NOTICE` (quieter) or `RAISE WARNING` (surfaced to monitoring); either is acceptable. What is NOT acceptable is no handler at all.

AC-B3-10 verification query must also be extended to cover the INSERT-failure path (e.g., insert into a copy of `activity_log` with a constraint that causes the INSERT to fail; assert the soft-delete still succeeds).

---

### Threat Surface 2 — `app.current_user_id` GUC: spoofing vector

**Finding SEC-B3-04 — HIGH: Plan does not explicitly state app.current_user_id is set ONLY by trusted server-side code; spoofing vector undocumented**

The three-tier resolution in §2.1 is:

```
Tier 1: auth.uid()          -- PostgREST JWT GUC
Tier 2: current_setting('app.current_user_id', true)  -- service-role escape
Tier 3: NULL marker
```

The plan notes (§1.9 + CONTEXT D-24) that `app.current_user_id` is NOT currently set anywhere in `src/`, and that B-3 "establishes the design contract." However, the plan DOES NOT explicitly state:

- That `set_config('app.current_user_id', '<any_uuid>', true)` is callable by an authenticated session (because `set_config` is a built-in Postgres function, not an RPC requiring a grant)
- That a malicious authenticated user CANNOT call `set_config('app.current_user_id', '<higher_priv_user_uuid>', true)` via a direct SQL connection or via Supabase's `rpc()` / raw SQL endpoint, then trigger a soft-delete, thereby impersonating a different actor in the audit trail

The protection exists implicitly: PostgREST-served authenticated sessions go through the `authenticated` role. Supabase REST API does not expose raw `SELECT set_config(...)` calls — it only executes PostgREST query operators and explicit RPCs. However, if a future route inadvertently exposes a raw SQL execution path (e.g., a debugging endpoint, a mis-scoped RPC), Tier 2 becomes a spoofing vector.

The protection also relies on Tier 1 taking precedence: if `auth.uid()` returns a non-NULL value (normal for authenticated users), Tier 2 is never evaluated. Tier 2 only fires when `auth.uid()` is NULL — which is the service-role context. Authenticated users always have a JWT sub, so `auth.uid()` is non-NULL for them, and `app.current_user_id` is irrelevant.

This is STRUCTURAL protection, but it is UNDOCUMENTED in the plan. The risk of a future maintainer misunderstanding the tier semantics and calling `set_config` from an authenticated context (inadvertently) is real.

**Required fix (not a code change — a plan-text clarification):** Add an explicit constraint note to §2.1 or §2.6 (whichever covers the escape helper documentation):

> "`app.current_user_id` is a service-role-only escape hatch. It MUST NOT be set from authenticated-role code paths. The Tier 1 precedence (`auth.uid()` non-NULL for authenticated users) provides structural protection, but this constraint is DESIGN INTENT and MUST be documented in the `setSessionUserId` helper when it ships (B-4 or first consumer). Any route calling `set_config('app.current_user_id', ...)` MUST verify it is operating under service-role context (e.g., constructed with `createServiceRoleClient()`, NOT `createBrowserClient()`)."

This note belongs in the PLAN body so it propagates to executor commit body and future-reader CONTEXT. The finding does not BLOCK execute if the plan-text clarification is added at iter-2 — the structural protection is real and present — but it MUST be addressed because the plan establishes the design contract and the constraint is not currently stated.

Severity: HIGH (not BLOCKING because structural protection holds today, but missing documentation creates a future-maintenance spoofing risk that is load-bearing for a 7-year-retention audit trail).

---

### Threat Surface 3 — DEF-WC-1 RESTRICTIVE backstop on org_members

**Finding SEC-B3-05 — PASS**

The RESTRICTIVE policy design in §2.3 correctly mirrors the canonical Wave-A pattern from Pattern A tables:

```sql
CREATE POLICY "org_members_org_isolation" ON public.org_members
  AS RESTRICTIVE
  FOR ALL
  USING ((org_id = (SELECT app_private.user_org_id())) OR (SELECT app_private.is_platform_admin()))
  WITH CHECK (org_id = (SELECT app_private.user_org_id()));
```

Four properties verified:

1. `(SELECT ...)` wrapping per CLAUDE.md Q10b session-cache pattern — present on both `user_org_id()` and `is_platform_admin()` calls
2. `WITH CHECK` does NOT include `OR is_platform_admin()` — correct; platform_admin should not be able to INSERT/UPDATE org_members into a foreign org. Only USING (read) path permits cross-org for platform_admin
3. `AS RESTRICTIVE` — will AND with the existing 3 PERMISSIVE policies (cross-org reads blocked regardless of PERMISSIVE policy bugs)
4. Does NOT modify existing PERMISSIVE policies — CONTEXT D-18 explicit; confirmed not present in §2.3 DDL

**Finding SEC-B3-06 — PASS**

The DELETE backstop:

```sql
CREATE POLICY "org_members_delete_strict" ON public.org_members
  AS RESTRICTIVE
  FOR DELETE
  USING (org_id = (SELECT app_private.user_org_id()));
```

Correctly closes the platform_admin cross-org DELETE vector. The RESTRICTIVE backstop's USING clause for ALL already handles most cross-org access; the separate DELETE policy is belt-and-suspenders for the DELETE command. `(SELECT ...)` wrapping present. PASS.

**Finding SEC-B3-07 — PASS (with minor observation)**

The plan notes that `org_members_org_isolation` FOR ALL with `is_platform_admin()` in USING allows platform_admin to retain cross-org SELECT. The existing `org_members_platform_admin_read` PERMISSIVE policy also covers this. Coexistence is correct — RESTRICTIVE policies AND with PERMISSIVE, so the PERMISSIVE platform_admin read remains effective, and the RESTRICTIVE backstop still blocks non-platform-admin cross-org reads.

Observation (not a finding): the `org_members_platform_admin_read` PERMISSIVE policy becomes partially redundant post-DEF-WC-1 (the RESTRICTIVE USING clause already allows platform_admin cross-org SELECT). This is harmless redundancy — leaving the PERMISSIVE policy in place costs nothing and makes the intent explicit. Do NOT remove it; removing a PERMISSIVE policy when a RESTRICTIVE one is added changes the effective grant surface in non-obvious ways.

---

### Threat Surface 4 — Inline verification DO block for REVOKE (AC M-05)

**Finding SEC-B3-08 — BLOCKING: AC M-05 proacl string-contains check is unreliable; use aclexplode pattern from 00103 + 00105**

Task 1 inline verification item M-05 is:

> "EXECUTE not granted to PUBLIC → `SELECT proacl FROM pg_proc WHERE proname='audit_soft_delete';` does NOT contain `=X/postgres`"

This check is INSUFFICIENT for two reasons surfaced by B-2a's lessons:

**Reason 1 (migration 00103 origin story):** Migration 00103 was written precisely because migration 00102 used a similar `proacl LIKE '...anon=%'` + `LIKE '...authenticated=%'` check but did NOT check for PUBLIC (`=X/postgres`). The PUBLIC grant uses an EMPTY grantee string (`=X/grantor`), so the check `proacl LIKE '=X/postgres'` only matches if `postgres` is the grantor. The actual PUBLIC grant entry in `pg_proc.proacl` looks like `=X/postgres` when postgres granted it, but would look like `=X/supabase_admin` or `=X/rds_superuser` in managed environments. String-matching on the raw text representation is fragile.

**Reason 2 (migration 00105 canonical pattern):** Migration 00105 uses `aclexplode(p.proacl)` with `grantee = 0` to detect PUBLIC grants (in PostgreSQL, grantee OID = 0 means PUBLIC). This is the OID-stable, grantor-independent check. It's what the canonical B-2a lesson codified.

**Required fix:** Replace M-05 string check with an inline DO block using `aclexplode` pattern:

```sql
DO $$
DECLARE
  public_execute_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO public_execute_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid,
         LATERAL aclexplode(p.proacl) acl
   WHERE n.nspname = 'app_private'
     AND p.proname = 'audit_soft_delete'
     AND acl.grantee = 0  -- OID 0 = PUBLIC
     AND acl.privilege_type = 'EXECUTE';
  IF public_execute_count > 0 THEN
    RAISE EXCEPTION 'B-3 verification FAIL: app_private.audit_soft_delete still has PUBLIC EXECUTE grant';
  END IF;
  RAISE NOTICE 'B-3 M-05 PASSED: app_private.audit_soft_delete has no PUBLIC EXECUTE grant';
END $$;
```

This is a BLOCKING finding because: the plan's inline verification DO block is the fail-closed gate that prevents the migration from applying with a misconfigured ACL. A false-passing M-05 means a PUBLIC EXECUTE grant could ship silently — exactly the TD-WAIC-03 pattern. The fix is straightforward and should be added to §3 Task 1 inline verification before /nx.

---

### Threat Surface 5 — Hard-DELETE CASCADE audit gap (R-1 / §1.5)

**Finding SEC-B3-09 — MEDIUM: Hard-DELETE covert scrub channel is real but correctly bounded**

The plan documents the hard-DELETE CASCADE audit gap in §1.5 R-1. Security lens review:

The covert-scrub question is: can an admin exploit this gap to hard-delete records and eliminate audit trail evidence?

Assessment:

1. **Access gate:** Hard-DELETE in production requires either (a) a service-role API route that explicitly issues `DELETE FROM <table>` — no such route exists in the current codebase per CLAUDE.md "Never delete records — soft delete only" rule, or (b) direct Supabase SQL editor access (requires Supabase project owner-level credentials, not just `admin` role in the app).

2. **Visibility of the act:** If an admin uses the Supabase SQL editor to hard-delete a row, that action is visible in Supabase's audit log (project-level audit, separate from `activity_log`). It is NOT invisible.

3. **Blast radius limitation:** The B-3 trigger only covers soft-delete. The gap is the CASCADE case — a parent hard-delete cascades to children. The plan mitigates this by (a) CLAUDE.md prohibition and (b) admin tooling auditing at the parent level. This is the weakest part of the mitigation: "admin tooling audits at parent level" is asserted but no specific admin tooling exists yet that enforces this.

4. **Recommended future hardening (NICE-TO-HAVE, not BLOCKING):** A `BEFORE DELETE` trigger on the 32 tenant tables (or at minimum the high-value ones: `invoices`, `change_orders`, `draws`, `jobs`) that raises an exception or writes a warning `activity_log` row would close this gap. Deferred to Wave 1.1-Lite per the plan is acceptable. However, the plan should explicitly name this as TD-B3-001 (or similar) in the tech debt registry at `MASTER-PLAN.md §11` so it does not get lost.

Disposition: MEDIUM — NOT BLOCKING for B-3. Accepted with the following condition: MASTER-PLAN.md §11 should include a new TD row for this gap at execute time (custodian follow-up). Plan §5 R-1 language is sufficient for ACCEPTED status, but TD registration makes it durable.

---

### Threat Surface 6 — Service-role escape window (§2.6 DEFER)

**Finding SEC-B3-10 — PASS (with documented interim posture)**

The plan defers the `setSessionUserId` helper to first consumer (§2.6). During the window between B-3 ship and the helper authoring (B-4 or later), service-role routes that perform soft-deletes will record `actor_source = 'service_role'` with `user_id = NULL` in the audit trail.

Security assessment:

- The event is still captured — `activity_log` row IS written, with `actor_source = 'service_role'`. The WHAT and WHEN are auditable. The WHO is unresolved.
- For SOC2 CC6.1 (logical access controls) and CC7.2 (monitoring of system operations), event capture without actor identification is a partially-compliant state, not a non-compliant state. The trail proves the event occurred; the actor resolution is degraded.
- The plan's Risk R-3 acknowledges this at §5 and notes the adoption sweep is deferred to B-4 / Wave 1.1-Lite.
- The interim posture is acceptable ONLY because: (a) all current service-role soft-delete paths are admin-initiated and low-frequency, and (b) the full actor context IS available in API-layer logs (Sentry + Vercel request logs) even if the DB audit trail shows `service_role`. Correlation is possible post-hoc.

PASS on the security posture for B-3. The DEFER decision is correctly scoped. The constraint that "setSessionUserId MUST be used from service-role routes that perform user-initiated soft-deletes" must be documented in the helper's API contract when it ships (enforce at B-4 plan-review).

---

### Threat Surface 7 — Trigger function body: no EXECUTE leak via B-2a lesson

**Finding SEC-B3-11 — PASS (B-2a ACL lesson correctly inherited)**

The B-2a ACL hardening lesson (migration 00105, nwrp208) established: after `CREATE OR REPLACE FUNCTION`, REVOKE/GRANT must be re-asserted because PostgreSQL's `CREATE OR REPLACE` can reset ACL state in some configurations. The plan's §2.1 explicitly places the `REVOKE EXECUTE` statement AFTER the function `$$;` close (line 464). This matches the B-2a pattern. PASS.

The function is in `app_private` schema (NOT `public`). An additional protective property: `app_private` is not exposed via PostgREST by default (PostgREST only exposes the `public` schema by default in Supabase). Even if the REVOKE somehow failed, the `app_private` schema placement provides defense-in-depth against direct API callers. This does not excuse the REVOKE (defense-in-depth is belt-AND-suspenders, not either-or), but it means the blast radius of a REVOKE failure is contained.

---

## Summary table

| Finding ID | Severity | Area | Status |
|------------|----------|------|--------|
| SEC-B3-01 | PASS | search_path + REVOKE FROM PUBLIC declaration | OK |
| SEC-B3-02 | PASS | org_id sourced from NEW (not session) | OK |
| SEC-B3-03 | BLOCKING | Exception handler absent from §2.1 function body | FIX REQUIRED pre-/nx |
| SEC-B3-04 | HIGH | app.current_user_id spoofing undocumented — constraint text missing from plan | FIX REQUIRED iter-2 |
| SEC-B3-05 | PASS | DEF-WC-1 org_members_org_isolation RESTRICTIVE policy | OK |
| SEC-B3-06 | PASS | DEF-WC-1 org_members_delete_strict RESTRICTIVE policy | OK |
| SEC-B3-07 | PASS (observation) | platform_admin read coexistence | Harmless redundancy, no action |
| SEC-B3-08 | BLOCKING | AC M-05 uses string-match proacl check instead of aclexplode OID-0 pattern | FIX REQUIRED pre-/nx |
| SEC-B3-09 | MEDIUM | Hard-DELETE covert-scrub gap; needs TD registration | TD row at execute; not blocking |
| SEC-B3-10 | PASS | Service-role escape window during DEFER; interim posture acceptable | OK |
| SEC-B3-11 | PASS | B-2a ACL lesson inherited; REVOKE placed after CREATE OR REPLACE | OK |

---

## Iter-2 requirements (if applicable)

If plan-author chooses to handle BLOCKING findings via iter-2 (per nwrp214 §22):

**BLOCKING findings requiring plan body changes before /nx:**

1. **SEC-B3-03** — Add exception handler block to §2.1 `app_private.audit_soft_delete()` function body. Exact form specified in finding above.
2. **SEC-B3-08** — Replace AC M-05 Task 1 inline verification string-match with `aclexplode` DO block. Exact form specified in finding above.

**HIGH finding requiring plan-text clarification (may be addressed in iter-2 or at execute):**

3. **SEC-B3-04** — Add explicit constraint note to §2.1 or §2.6 stating that `app.current_user_id` is service-role-only and MUST NOT be set from authenticated-role code paths. Plan-text change only; no migration body change required.

**MEDIUM finding (non-blocking, execute-time action):**

4. **SEC-B3-09** — Register hard-DELETE cascade audit gap as a named TD entry in MASTER-PLAN.md §11 at execute time (custodian task).

---

## Cross-reviewer flags for SYNTHESIS

The following items are surfaced for multi-tenant-architect and rls-auditor awareness:

- **SEC-B3-03 (BLOCKING)** — exception handler gap means trigger-raised errors block soft-deletes. Multi-tenant-architect should confirm the exception handler does not weaken any audit integrity contract they require.
- **SEC-B3-04 (HIGH)** — rls-auditor should confirm that the `app.current_user_id` tier-2 path does not interact with any RLS policy evaluated in the trigger function's SECURITY DEFINER context (it does not, because the trigger bypasses RLS, but the rls-auditor should explicitly attest to this).
- **SEC-B3-08 (BLOCKING)** — database-reviewer should confirm the `aclexplode` OID-0 pattern works in the `app_private` schema context (the schema difference from 00103's `public` schema functions does not affect aclexplode behavior, but confirmation from database-reviewer closes any doubt).

---

**Security Reviewer verdict: NEEDS-WORK — 2 BLOCKING findings (SEC-B3-03, SEC-B3-08), 1 HIGH finding (SEC-B3-04). All fixable at iter-2 without scope change. Core SECURITY DEFINER posture and DEF-WC-1 policy design are correct; findings are in the execution-correctness layer (exception handler, verification rigor) and documentation layer (constraint text). No architectural rework required.**
