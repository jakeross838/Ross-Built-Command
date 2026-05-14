---
phase: stage-f1-knowledge-graph-auth-wave-e
type: iter-2-patches
authored: 2026-05-14
authored_by: orchestrator (claude-opus-4-7[1m]) under nwrp145 autonomous-run authorization
authorization: /nightwork-plan-review iter-1 (9 reviewers; all returned)
status: AUTHORITATIVE — executors apply these patches alongside PLAN.md bodies
---

# Wave-E Iter-2 Patches

Iter-1 /nightwork-plan-review dispatched 9 reviewers in parallel. Aggregate verdict: WARNING with multiple BLOCKING + CRITICAL patches required before execute. All patches are mechanical-applicable inline; no re-author of plan bodies needed.

**Patches authoritative.** Plan bodies remain canonical for sections NOT touched by these patches. Where plan body conflicts with this addendum, this addendum wins (same precedence Wave-D ITER-2-PATCHES.md held).

## §1 — Plan E-1 patches

### §1.1 — ENTITY-INVENTORY.md update (CRITICAL per compliance reviewer)

D-079 declares vendors PII?=No (B2B commercial contact info). `.planning/architecture/ENTITY-INVENTORY.md` line 21 previously classified Vendors PII?=yes. Contradiction breaks SOC2 C1.1 evidence-trail traceability.

**Patch:** ENTITY-INVENTORY.md line 21 updated by orchestrator at iter-2 commit time (NOT executor scope — already applied as part of E-1 Path C scope-expansion). Vendors PII? cell now reads:

> no — B2B commercial contact info per D-079 (phone/email/address are published business data, not customer PII; sole-proprietor edge case acknowledged at D-079 trigger (iii) + finding-1-reclassification.md). W-9 TIN belongs in separate Tax Records entity row (Wave 4 vendor portal scope).

**E-1 files_modified updated** to include `.planning/architecture/ENTITY-INVENTORY.md`.

**New AC-E1-05:** `grep -nE "^\| Vendors \|" .planning/architecture/ENTITY-INVENTORY.md` returns 1 match containing the substring "B2B commercial contact info per D-079" and NOT containing "yes (email".

### §1.2 — D-079 SOC2 mapping expansion (per compliance Finding 3)

D-079 originally mapped to CC6.1 only. Inherits D-078's CC7.2 + PI1.1 surfaces. Patch applied at orchestrator iter-2 commit time (D-079 entry extended with explicit CC7.2 + PI1.1 inheritance clause + sole-proprietor caveat).

### §1.3 — finding-1-reclassification.md sole-proprietor edge case (per compliance Finding 2)

`finding-1-reclassification.md` gains a "Known edge cases" section documenting sole-proprietor vendor PII overlap (Doug Naeher Drywall, Florida Sunshine Carpentry examples) + 4 trigger conditions for re-evaluation. Patch applied at orchestrator iter-2 commit time.

## §2 — Plan E-2 patches

### §2.1 — Seed credentials mechanism (BLOCKING per database-reviewer Finding 1 + security-reviewer concern 1)

**Original plan (E-2 Step 5 + Task 6):** Use `RAISE NOTICE` inside the seed DO block to emit per-user `email password` lines; orchestrator captures NOTICE output via `psql -f` stdout/stderr to the gitignored credentials file.

**Root cause of issue:** Three architecturally impossible mechanisms specified.
1. `COPY TO '/path'` requires `pg_write_server_files` privilege — denied on Supabase managed instances.
2. `psql \o` redirects psql RESULT output, not PL/pgSQL RAISE NOTICE.
3. Supabase MCP `execute_sql` does NOT surface NOTICE-level messages in return values.
4. Per security-reviewer: `RAISE NOTICE` goes to stderr (not stdout) when invoked via `psql -f`; requires `2>&1` stderr-merging.

**Revised mechanism:** Orchestrator generates the password client-side (Node `crypto.randomUUID()`), passes it into the SQL as a literal in the DO block, then writes the credentials file from Node side after seed apply confirms success.

**Executor implementation:**

(a) E-2 Task 6 (smoke-seed.sql rewrite) revised body — wrap the existing DO block to accept a single shared `v_password` parameter at the top, used by all 9 user INSERTs:

```sql
-- Top of DO block (revised)
DO $$
DECLARE
  v_password TEXT := '__PLACEHOLDER_REPLACED_BY_ORCHESTRATOR__';  -- orchestrator replaces this string before execute_sql
  v_user RECORD;
BEGIN
  FOR v_user IN
    SELECT * FROM (VALUES
      ('00000000-0000-0000-0002-000000000001'::uuid, 'smoke-owner@nightwork.local',      'Smoke Owner',      'admin'),
      ('00000000-0000-0000-0002-000000000002'::uuid, 'smoke-pm-alpha@nightwork.local',   'Smoke PM Alpha',   'pm'),
      -- ... 7 more rows (preserved from current seed)
    ) AS t(id, email, full_name, role)
  LOOP
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_user.id, 'authenticated', 'authenticated',
      v_user.email, crypt(v_password, gen_salt('bf')), NOW(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email'], 'role', v_user.role),
      jsonb_build_object('full_name', v_user.full_name),
      NOW(), NOW(), '', '', '', ''
    )
    ON CONFLICT (id) DO UPDATE SET
      email_confirmed_at = COALESCE(auth.users.email_confirmed_at, NOW()),
      updated_at = NOW(),
      encrypted_password = EXCLUDED.encrypted_password;  -- §2.2 patch
    -- ... auth.identities INSERT ON CONFLICT (provider_id, provider) DO NOTHING (unchanged)
  END LOOP;
END $$;
```

(b) Seed file header comment documents the new orchestrator-driven mechanism:

```sql
-- APPLY PROCEDURE (orchestrator-driven; NOT via direct `psql -f`):
-- 1. Orchestrator generates a single shared password via Node `crypto.randomUUID()`
-- 2. Reads this file as a string template
-- 3. Substitutes `__PLACEHOLDER_REPLACED_BY_ORCHESTRATOR__` with the generated UUID
-- 4. Submits the resulting SQL via Supabase MCP `execute_sql`
-- 5. On apply success, writes the credentials file at
--    `.planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt`
--    with one line per smoke-* user: `<email> <password>`
-- The placeholder MUST be a UUID-shaped synthetic value at rest in the seed file
-- (so static analysis / accidental psql -f doesn't insert a literal placeholder
-- as a real password — but more importantly the file should NEVER be applied
-- without the orchestrator step). Recommendation: placeholder is the literal
-- string `'__PLACEHOLDER_REPLACED_BY_ORCHESTRATOR__'` — UUID-incompatible by
-- shape, so any accidental apply produces a runtime cleartext that won't match
-- any expected pattern.
```

(c) Executor verifies the placeholder substring is present (AC-E2-14a NEW):

```bash
grep -nE "'__PLACEHOLDER_REPLACED_BY_ORCHESTRATOR__'" scripts/fixtures/smoke-seed.sql
# Expected: 1 match (the v_password DECLARE line)
```

(d) Orchestrator post-merge apply procedure (NOT in plan body; orchestrator-level only):

```typescript
// orchestrator/post-execute-seed-apply.ts (conceptual; not a real file)
const password = crypto.randomUUID();
const seedSqlTemplate = fs.readFileSync('scripts/fixtures/smoke-seed.sql', 'utf-8');
const seedSql = seedSqlTemplate.replace(
  /'__PLACEHOLDER_REPLACED_BY_ORCHESTRATOR__'/g,
  `'${password.replace(/'/g, "''")}'`  // SQL-escape single quotes; UUID won't contain them but defensive
);
await mcp.supabase.execute_sql({ query: seedSql });

const credLines = [
  `harness-fixture@nightwork.local <see HARNESS_FIXTURE_PASSWORD env var; per nwrp141 don't-rotate decision>`,
  `smoke-owner@nightwork.local ${password}`,
  `smoke-pm-alpha@nightwork.local ${password}`,
  `smoke-pm-beta@nightwork.local ${password}`,
  `smoke-pm-gamma@nightwork.local ${password}`,
  `smoke-pm-delta@nightwork.local ${password}`,
  `smoke-pm-epsilon@nightwork.local ${password}`,
  `smoke-pm-zeta@nightwork.local ${password}`,
  `smoke-pm-eta@nightwork.local ${password}`,
  `smoke-accounting@nightwork.local ${password}`,
];
fs.writeFileSync(
  '.planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt',
  credLines.join('\n') + '\n'
);
```

### §2.2 — ON CONFLICT must update encrypted_password (BLOCKING per database-reviewer Finding 2)

**Original plan:** `ON CONFLICT (id) DO UPDATE SET email_confirmed_at = COALESCE(auth.users.email_confirmed_at, NOW()), updated_at = NOW()`.

**Issue:** On re-apply, conflict skips the VALUES, leaving stale `encrypted_password` while orchestrator writes a NEW cleartext to the credentials file. Credentials file and stored hash diverge; smoke can't authenticate on re-apply.

**Patch:** Add `encrypted_password = EXCLUDED.encrypted_password` to the ON CONFLICT SET clause. Already shown in §2.1 (b) above.

**New AC-E2-14b:** `grep -nE 'encrypted_password = EXCLUDED.encrypted_password' scripts/fixtures/smoke-seed.sql` returns ≥1 match.

### §2.3 — Smoke harness selectors for /financials/bills routes (WARNING per planner + architect + multi-tenant + design-pushback consensus)

**Original plan (E-2 Task 4):** Refactor `select[name='pm_id']` / `select[name='assigned_pm']` / `select[name='import_default_pm_id']` to Playwright role-based locators via `page.getByRole("combobox", { name: /assigned pm/i })`.

**Issue:** `src/components/invoices/InvoiceHeader.tsx:82-92` PM `<select>` is row-level + has no `aria-label` + no `<label>`-wrap. `src/app/invoices/page.tsx:508-513` PM filter `<select>` also has no aria-label / no label-wrap / previous text is "All PMs" (not "Assigned PM"). Role-based locator won't resolve on /financials/bills + /financials/bills/queue routes.

**Patch:** Replace those two routes' primary-UX selectors with non-select-based selectors. Recommended: page-header text check.

Executor patches to `scripts/wave-d-smoke.ts` route table:

```typescript
// /financials/bills route entry — replace primary_ux_selector
{
  path: "/financials/bills",
  primary_ux_selector: "h1, h2, [data-page-header]",  // page header text
  primary_ux_min_count: 1,
  // ... rest unchanged
},

// /financials/bills/queue route entry — same swap
{
  path: "/financials/bills/queue",
  primary_ux_selector: "h1, h2, [data-page-header]",
  primary_ux_min_count: 1,
  // ... rest unchanged
},

// /jobs/new + /settings/workflow keep the role-based locator approach since
// their forms DO have labels that resolve (per E-2 plan body verification)
{
  path: "/jobs/new",
  primary_ux_selector: 'select',  // FALLBACK to any <select> on page; min_count: 1
  primary_ux_min_count: 1,
  // ... 
},

{
  path: "/settings/workflow",
  primary_ux_selector: 'select',
  primary_ux_min_count: 1,
  // ...
},
```

Actually given that `getByRole` is a Playwright Locator method (not a CSS selector), and the route table uses CSS selector strings, the simplest patch is:
- `/financials/bills` + `/financials/bills/queue` → use page-header CSS selector
- `/jobs/new` + `/settings/workflow` → use `'select'` (any select element); semantic test is "form rendered with selects"

This avoids the getByRole approach entirely (which would require restructuring the smoke's locator-vs-selector contract). Keeps the existing CSS-string-based route table.

**Revised AC-E2-10:** Replaces the previous "role-based locator refactor" with simpler "non-name=-attribute primary-UX selectors." Plan body's getByRole refactor approach is superseded by this §2.3 patch.

### §2.4 — Plan E-2 files_modified bookkeeping (per planner Finding 2)

EXPANDED-SCOPE §Plan E-2 files_modified list was missing `src/app/jobs/[id]/page.tsx`. Already included in E-2 PLAN.md frontmatter. Patch: ensure EXPANDED-SCOPE.md §Plan E-2 sub-step list mentions jobs/[id]/page.tsx for the data-pm-name attribute task.

Patch applied at orchestrator iter-2 commit time to EXPANDED-SCOPE.md (informational note added after Plan E-2 section).

### §2.5 — AC-E2-10 grep refinement (NOTE per planner)

Original AC-E2-10 corroborate grep uses bash-only `-n '^[^/]'` filter. For cross-platform compatibility (Windows Git Bash), simpler form:

```bash
grep -nE 'select\[name=' scripts/wave-d-smoke.ts | grep -v '^\s*//'
# Expected: 0 hits (legacy name= selectors removed from active code)
```

Mechanical patch to the grep expression; functionally equivalent.

## §3 — Plan E-3 patches

### §3.1 — Vendor null-guard in shim (BLOCKING per database-reviewer Finding 3)

**Original plan (E-3 Task 3):** Construct `vendor` prop from PostgREST embed; if `vendorEmbed` is null (because synthetic seed has `vendor_id = NULL`), the page returns `notFound()`. This means smoke route 404s on every synthetic invoice.

**Issue (database-reviewer):** "All 5 synthetic invoices have `vendor_id = NULL`. PostgREST embed returns null. View's prop contract is non-nullable on `vendor`. Without explicit null-guard in the shim, this is a runtime TypeError."

**ALSO:** The `notFound()` on missing vendor_id is itself a production bug. Real production invoices arrive unmatched (parsed from email PDF; `vendor_name_raw` populated, `vendor_id` NULL) and matched later (PM review). Unmatched invoices should still render (so PMs can match them) — `notFound()` breaks the matching workflow entirely.

**Patch:** E-3 Task 3 shim updated to handle null vendor via `vendor_name_raw` fallback:

```typescript
// E-3 Task 3 shim (revised)
const vendorEmbed = row.vendors;  // null if vendor_id IS NULL or RLS-hidden
const jobEmbed = row.jobs;

// Job is REQUIRED (every invoice scoped to a job via job_id NOT NULL FK)
if (!jobEmbed) {
  console.error("[bills/[id]] invoice query returned null job embed:", { id: row.id, job_id: row.job_id });
  return notFound();
}

// Vendor is OPTIONAL (unmatched-state invoice has vendor_id NULL pending PM review)
const vendorProp = vendorEmbed
  ? {
      id: vendorEmbed.id,
      name: vendorEmbed.name,
      // Note: vendor embed shape is (id, name, address) per E-3 plan body
      // — narrower than E-1 Path C API route's (id, name, phone, email, address).
      // E-3's narrower shape is appropriately conservative (page-side minimum-
      // required-fields). Phone/email available via /api/invoices/[id] for
      // VendorContactPopover prefetch posture per D-079.
    }
  : {
      id: "",
      name: row.vendor_name_raw ?? "Unknown Vendor",
      // Unmatched invoice — PM can match via the right-rail vendor matcher.
      // See PATTERNS.md Document Review pattern + Wave-B vendor-matching
      // workflow scope.
    };
```

**New AC-E3-10:** `grep -nE 'vendor_name_raw \?\? "Unknown Vendor"' src/app/financials/bills/\[id\]/page.tsx` returns ≥1 match.

**AC-E3-09 (existing) update:** Smoke route `/financials/bills/33333333-3333-3333-3333-300000000001` returns HTTP 200 AND rendered DOM contains `text=Smoke Vendor Alpha` (from `vendor_name_raw`, NOT from vendors.name). The synthetic seed leaves vendor_id NULL; rendered output uses the raw parsed vendor name.

### §3.2 — Page header comment about embed shape divergence (per enterprise + multi-tenant)

E-3 page.tsx gains a header comment documenting the intentional embed shape divergence from E-1 Path C API route:

```typescript
// src/app/financials/bills/[id]/page.tsx (header comment, after "use server" if present)

/**
 * Bill detail page — reads from public.invoices via Supabase.
 *
 * Vendor embed shape: (id, name, address).
 *
 * Intentionally narrower than /api/invoices/[id] route handler's vendor embed
 * (id, name, phone, email, address) per D-079 vendor B2B contact posture +
 * E-1 Path C decision. The page-side narrowing is defense-in-depth: this
 * surface only renders vendor identity (name) and location (address); phone/
 * email are accessible via the canonical /api/invoices/[id] response for
 * the VendorContactPopover prefetch posture (per vendor-contact-popover.tsx:18
 * comment). If a future plan-author needs phone/email on this page, fetch
 * via the API route OR widen the embed here AFTER review of D-079 sole-prop
 * edge case.
 */
```

**New AC-E3-11:** `grep -nE 'Intentionally narrower than /api/invoices' src/app/financials/bills/\[id\]/page.tsx` returns ≥1 match.

## §4 — Wave-E EXPANDED-SCOPE patches

### §4.1 — Wave-B Prerequisite #11 — HARNESS_FIXTURE_PASSWORD rotation (per security-reviewer Top concern 2)

Add to Wave-B prerequisite list:

> 11. **NEW (security iter-1):** Rotate HARNESS_FIXTURE_PASSWORD per security-reviewer FINDING-3 promotion. Originally classified MEDIUM per nwrp139 (don't-rotate decision); promoted to Wave-B prerequisite at iter-1 because the credential is org-admin in production Supabase (synthetic-org scope, but real auth) and rotation is low-cost (env var update). Three rotation surfaces: `.env.local` on all dev machines + Vercel env var (Production + Preview) + GitHub Actions workflow secret. Before Wave-B Plan B-1 dispatches.

### §4.2 — Plan E-2 files_modified bookkeeping

EXPANDED-SCOPE §Plan E-2 files_modified section was missing `src/app/jobs/[id]/page.tsx` (the data-pm-name attribute target). Add to the file list and re-verify Rule 5 disjointness explicitly:

```
E-1 files_modified: planning artifacts only (no src/)
E-2 files_modified:
  - src/components/nav-bar.tsx
  - src/components/job-sidebar.tsx
  - src/app/jobs/[id]/page.tsx           ← NEWLY DOCUMENTED in iter-2 (was in PLAN frontmatter but missing here)
  - scripts/wave-d-smoke.ts
  - scripts/fixtures/smoke-seed.sql
  - scripts/harness-auth-bootstrap.ts
E-3 files_modified:
  - src/app/financials/bills/[id]/page.tsx
Rule 5 disjoint: ✓ (E-1 has no src/; E-2 + E-3 disjoint at src/ level)
```

## §5 — Three-namespace test-attribute taxonomy (deferred to Wave-E close-out per design-pushback)

**NOT iter-2 scope.** Deferred to Wave-E close-out (alongside D-080 user-identity FK convention entry per nwrp144 #2). At close-out, add to `.planning/design/COMPONENTS.md` §8 OR `.planning/design/PATTERNS.md`:

```markdown
### Test-attribute namespaces

Three attribute namespaces for Playwright smoke harness + verification harness Layer 3 vision selectors:

- `data-slot` — singleton identity. One per page. Example: `data-slot="org-logo"` on the Wordmark/Icon SVG (Wordmark.tsx:88, Icon.tsx:37).
- `data-pattern-slot` — layout-pattern slot. Multiple per page, distinct per slot. Example: `data-pattern-slot="file-preview"` / `"right-rail"` / `"audit-timeline"` on InvoiceReviewView regions (InvoiceReviewView.tsx:293/333/482).
- `data-component` — component-instance identity. One per component-mount on the page. Example: `data-component="nav-bar"` on `<header>` (nav-bar.tsx:280); `data-component="job-sidebar"` on `<aside>` (job-sidebar.tsx:259).

Plan-authors writing new test-selectable attributes pick the namespace that matches the semantic relationship:
- Brand mark / singleton element → data-slot
- Layout region within a pattern → data-pattern-slot
- Component instance (NavBar, JobSidebar, future Drawer, etc.) → data-component

Avoid introducing a 4th namespace without explicit design-system review.
```

Patch applied at Wave-E close-out commit (orchestrator authors D-080 + this docs entry together).

## Iter-2 patch summary

| # | Patch | Severity | Target file | Status |
|---|-------|----------|-------------|--------|
| §1.1 | ENTITY-INVENTORY.md line 21 update | CRITICAL | `.planning/architecture/ENTITY-INVENTORY.md` | ✓ Applied at iter-2 commit |
| §1.2 | D-079 SOC2 expansion (CC7.2 + PI1.1) | WARNING | `.planning/MASTER-PLAN.md` | ✓ Applied at iter-2 commit |
| §1.3 | finding-1-reclassification.md sole-prop section | WARNING | `.planning/qa-runs/wave-d/finding-1-reclassification.md` | ✓ Applied at iter-2 commit |
| §2.1 | Seed credentials mechanism — orchestrator-passes-password | BLOCKING | scripts/fixtures/smoke-seed.sql (executor applies) | Pending E-2 execute |
| §2.2 | ON CONFLICT encrypted_password update | BLOCKING | scripts/fixtures/smoke-seed.sql (executor applies) | Pending E-2 execute |
| §2.3 | Smoke selectors for /financials/bills routes | WARNING | scripts/wave-d-smoke.ts (executor applies) | Pending E-2 execute |
| §2.4 | EXPANDED-SCOPE Plan E-2 files_modified bookkeeping | NOTE | EXPANDED-SCOPE.md | Pending iter-2 commit |
| §2.5 | AC-E2-10 grep refinement | NOTE | E-2 PLAN AC text | Pending iter-2 commit |
| §3.1 | E-3 vendor null-guard in shim | BLOCKING | src/app/financials/bills/[id]/page.tsx (executor applies) | Pending E-3 execute |
| §3.2 | E-3 page header comment about embed divergence | WARNING | src/app/financials/bills/[id]/page.tsx (executor applies) | Pending E-3 execute |
| §4.1 | Wave-B Prerequisite #11 (HARNESS_FIXTURE_PASSWORD rotation) | WARNING | EXPANDED-SCOPE.md | Pending iter-2 commit |
| §5 | Three-namespace docs codification | NOTE | COMPONENTS.md or PATTERNS.md | Deferred to Wave-E close-out |

**Patches §1.1, §1.2, §1.3 applied at iter-2 commit time (orchestrator-side; not executor scope).**

**Patches §2.1, §2.2, §2.3, §3.1, §3.2 applied by executors during E-2 + E-3 execute (executor scope; addendum is the spec).**

**Patches §2.4, §2.5, §4.1 applied at iter-2 commit time (orchestrator-side).**

**Patch §5 deferred to Wave-E close-out.**

## Cross-plan coordination resolution

The §3.1 patch (E-3 vendor null-guard via vendor_name_raw fallback) **resolves the cross-plan coordination concern** that planner + architect + multi-tenant flagged separately (E-2 seed vendor_id). Database-reviewer's analysis is correct: adding vendor seeding to E-2 is unnecessary fixture infrastructure when E-3's shim should handle the null case anyway (it's also more realistic — production invoices arrive unmatched).

The planner/architect/multi-tenant approach (seed vendors) would also work but expands E-2 scope. Database-reviewer's approach (E-3 null-guard) is the more elegant fix because it ALSO addresses a latent production bug (E-3's `notFound() on missing vendor` would break the PM matching workflow on real unmatched invoices).

Smoke AC verification post-fix:
- AC-E-10 (`/financials/bills/33333333-...-300000000001 returns 200`): PASSES via E-3 null-guard rendering vendor_name_raw fallback
- AC-E3-09 (DOM contains "Smoke Vendor Alpha"): PASSES via vendor_name_raw which IS "Smoke Vendor Alpha" in the synthetic seed
- AC-E3-10 (NEW): grep verifies null-guard pattern present

## What's NOT in iter-2 scope

- E-1 Path C decision itself (locked at nwrp145; iter-2 only adds compliance follow-ups)
- Three-namespace docs codification (deferred to close-out)
- HARNESS_FIXTURE_PASSWORD actual rotation (Wave-B prerequisite, not Wave-E execute)
- TD-WB-01 hook precision refinement for rounded-full status dots (Wave-B candidate)
- TD-WD-06 jobs/[id]/overview SELECT(*) PII narrowing (Wave 1.1-Lite)
- SmokeSeed2026! in git history scrub (LOW residual; only if repo access model changes)

## Execute readiness

Post-iter-2-commit:
- E-1 Path C: ready to execute (4 ACs; docs-only)
- E-2: ready to execute with §2.1 + §2.2 + §2.3 patches absorbed
- E-3: ready to execute with §3.1 + §3.2 patches absorbed

Sequencing per nwrp145: E-2 first (orchestrator post-execute applies seed via Supabase MCP with password substitution); then E-1 + E-3 in parallel (E-1 docs-only; E-3 wires real DB lookup).

Then re-run wave-d-smoke.ts against staging URL → /nightwork-qa revalidation → ship to main.
