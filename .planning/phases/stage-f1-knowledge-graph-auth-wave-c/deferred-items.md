# Wave-C deferred items (out-of-scope discoveries during execute)

Per CLAUDE.md SCOPE BOUNDARY: pre-existing issues NOT directly caused by Plan
C-1's changes are logged here for future cleanup; not fixed in this PR.

## Pre-existing design-token violations (post-edit hook flagged)

The nightwork-post-edit.sh hook flagged pre-existing hardcoded hex codes in
files Plan C-1 modifies. Confirmed pre-existing via `git diff` — NOT caused
by the C-1 edits.

### `src/app/invoices/page.tsx`

- **Line 810** (pre-existing): `bg-white` on toggle-switch thumb element
  - Pre-existing context: Inline pickup-toggle switch — thumb element uses
    `bg-white` against a stone-blue / border-default background. White thumb
    on dark switch is a standard interaction pattern. Hook flags as
    "Nightwork uses Slate" but this is a legitimate visual contrast on a
    UI toggle thumb. Recommend either:
    1. Update hook allowlist to permit `bg-white` on toggle thumbs, OR
    2. Migrate to a thumb-on-accent token (e.g. `bg-[var(--text-on-accent)]`)
       once SYSTEM.md defines one.
  - Route: Wave 1.1-Lite cosmetic cleanup pass.

**Status:** logged for Wave 1.1-Lite cosmetic pass. Plan C-1's edit in this
file is limited to lines 144-209 (add auth pre-flight + refactor PM
dropdown query per CR-C1-1 Option A); the design-token violation on line
810 is untouched by C-1.

### `src/app/jobs/new/page.tsx`

- **Line 320** (pre-existing): `text-white` class on submit button
  - Pre-existing context: Submit "Create Job" button uses `text-white` against
    `bg-[var(--nw-stone-blue)]`. Stone blue button intentionally uses white
    text for contrast. Likely a stylistic intent decision; hook flags as
    "Slate uses bg-nw-page / text-nw-slate-tile" — but inverse contrast on
    a primary action button is the standard pattern. Recommend either:
    1. Update hook allowlist to permit `text-white` on `bg-[var(--nw-stone-blue)]`
       buttons, OR
    2. Migrate button to use a button-on-stone-blue token (e.g.
       `text-[var(--text-on-accent)]`) once SYSTEM.md defines one.
  - Route: Wave 1.1-Lite cosmetic cleanup pass per ARCHITECTURE.md §6.

- **Lines 332-333** (pre-existing): inline `<style jsx>` block with
  `#F5F5F5` and `#E8E8E8` as CSS-variable fallbacks
  - Pre-existing context: `var(--bg-subtle, #F5F5F5)` and
    `var(--border-default, #E8E8E8)` — the hex is a defensive fallback,
    not a token replacement. Defensive fallbacks are a legitimate pattern
    for env-resilience, but hook does not distinguish fallback from primary.
  - Recommend: refactor the `<style jsx>` block to plain Tailwind utilities
    (`className="bg-[var(--bg-subtle)] border-[var(--border-default)]"` on
    inputs) so no inline CSS is needed; OR update hook regex to permit hex
    inside `var(..., #HEX)` defensive-fallback syntax.
  - Route: Wave 1.1-Lite cosmetic cleanup pass.

**Status:** logged for Wave 1.1-Lite cosmetic pass. Plan C-1's edits in this
file are limited to lines 52-94 (refactor PM dropdown query); the
design-token violations exist on lines 320-340 untouched by C-1.

## Reason this file exists

To unblock C-1 execute while preserving the post-edit hook's audit signal.
Hook will continue to flag these pre-existing items on every C-1-related
edit to this file; documentation here is the deferral-decision record.

---

## Architectural follow-ups (post-Wave-C; routed at GATE-C halt per nwrp118)

### DEF-WC-1 — `org_members` lacks RESTRICTIVE `"org isolation"` policy

**Source:** Wave-C plan-review iter-1 (multi-tenant-architect MED-1). Real architectural SPOF risk that motivated CR-C1-1 (Task 6 → Option A).

**Concern:** `org_members` has ONLY a PERMISSIVE `"members read org_members"` policy (migration 00016:142) — no RESTRICTIVE backstop. If the single PERMISSIVE policy is dropped, unfiltered `org_members` queries leak cross-org PMs.

**Route (per nwrp118 Item 2):** Wave-B Plan B-3 expanded scope. B-3 already covers deletion safety net trigger + user-identity threading (auth + safety hardening). Adding RESTRICTIVE backstop on `org_members` fits naturally — same architectural domain.

**Migration shape:**
```sql
CREATE POLICY "org isolation" ON public.org_members
  AS RESTRICTIVE FOR ALL
  USING (org_id = (SELECT app_private.user_org_id()) OR (SELECT app_private.is_platform_admin()))
  WITH CHECK (org_id = (SELECT app_private.user_org_id()));
```

Mirrors 00049 canonical pattern with HF-A4-1 `(SELECT ...)` session-cache wrapping.

**Impact post-fix:** Wave-C's CR-C1-1 application-layer Option A filtering becomes redundant defense-in-depth rather than required compensating control. Both layers desirable per D-30; redundancy is the goal.

---

### DEF-WC-2 — `invoices.assigned_pm_id` compound-FK consideration

**Source:** Wave-C plan-review iter-1 (multi-tenant-architect cross-tenant PM assignment analysis).

**Concern:** Pre-existing risk. FK references only `profiles(id)` — single-column FK doesn't enforce that `invoices.assigned_pm_id` value's profile belongs to the same org as the invoice. Theoretically allows cross-tenant PM assignment at the DB level.

**Pre vs post-Wave-C:** Semantically equivalent. Wave-C's FK retarget from `users(id)` to `profiles(id)` doesn't change the cross-tenant risk surface. Effective protection today: app-layer enforcement (via `getCurrentMembership()` in API routes) + RLS RESTRICTIVE `WITH CHECK (org_id = user_org_id())` on `invoices` (blocks cross-org INSERT/UPDATE wholesale, but doesn't validate `assigned_pm_id` ↔ org binding specifically).

**Route (per nwrp118 Item 3):** Future Wave deferred. **Revisit triggers:**
- PM assignment workflow matures (Wave 1.1-Lite or Wave 2 when commercial-multi-tenant emerges)
- Audit finding of actual cross-tenant assignment in production
- Compliance/SOC2 hardening pass (per Q7 SOC2 timeline if triggered)

**Migration shape (preview when triggered):**
```sql
ALTER TABLE public.invoices
  DROP CONSTRAINT invoices_assigned_pm_id_fkey;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_assigned_pm_id_org_id_fkey
  FOREIGN KEY (assigned_pm_id, org_id)
  REFERENCES public.org_members (user_id, org_id);
```

Same pattern applies to other person-FKs (`org_workflow_settings.import_default_pm_id`, etc.).

---

### DEF-WC-3 — Plan threat-model accuracy discipline + ARCHITECTURE.md RLS posture summary table

**Source:** Wave-C plan-review iter-1 surfaced 2 factual errors in plan's threat model (T-C-1-03 + T-C-1-04). Security-reviewer made the same T-C-1-03 error independently. Architect's read of migration files caught both.

**Route (per nwrp118 Item 4):**
- Calibration-log entry post-Wave-C ship (Claude Code authoring — captures "plan threat-model matched incorrect reviewer's framing" lesson + recommendation that planner agents cite migration filename + line number for every RLS posture claim).
- Fold into Wave-B Plan B-3 (or B-4 if cleaner fit): ARCHITECTURE.md addition — "RLS posture summary table by entity" as single source of truth across all tenant tables. Prevents future plans from repeating Wave-C's profiles-wide-open misconception.

**Doc shape (Wave-B deliverable):**
```markdown
| Entity | PERMISSIVE policies | RESTRICTIVE policies | Notes |
|---|---|---|---|
| profiles | authenticated SELECT (00007:60; USING true) | org isolation FOR ALL (00016:163; 00049:285-288 refresh) | Cross-org PM dropdowns supported via PERMISSIVE; tenant boundary via RESTRICTIVE |
| org_members | members read SELECT (00016:142) + platform_admin read | **NONE** (DEF-WC-1 gap; Wave-B Plan B-3 closes) | SPOF risk; CR-C1-1 application-layer filter is compensating control until B-3 |
| invoices | role-based write (00043) + auth read | org isolation FOR ALL (00016 + 00049) | Canonical pattern |
| ... | ... | ... | ... |
```

---

## Reason this file exists (updated)

Originally: design-token violation surface (post-edit hook signal).
Now also: architectural follow-ups from Wave-C iter-1 plan-review surfaced via consolidated ITER-2-PATCHES.md + GATE-C halt summary.

DEF-WC-1 → Wave-B Plan B-3 (nwrp118 Item 2)
DEF-WC-2 → future Wave (nwrp118 Item 3; revisit-triggered)
DEF-WC-3 → Wave-B Plan B-3 or B-4 (nwrp118 Item 4) + calibration-log post-ship
