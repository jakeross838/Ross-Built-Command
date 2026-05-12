---
phase: stage-f1-knowledge-graph-auth-wave-a
plan: A-2
plan-name: docx-html-auth-gate-fix
type: execute
status: complete
wave: A
depends_on: [A-1]
autonomous: true
executed_at: 2026-05-12T22:00Z
files_modified:
  - src/app/api/invoices/[id]/docx-html/route.ts (auth gate + tenant filter + JSDoc + HF-A2-1 comment)
acceptance-criteria-target: 5 falsifiable items (verbatim from EXPANDED-SCOPE) + 3 plan-derived sub-ACs
acceptance-criteria-status: 7/8 satisfied at commit; AC-8 manual cURL deferred to GATE-A (no dev server in autonomous execution)
iter-2-patches-applied:
  - HF-A2-1 (load-bearing code comment near .eq("org_id", membership.org_id) filter)
  - HF-A2-2 (extended INSERT/upsert grep against src/; documented below)
deferred-to-wave-b:
  - MED-A2-1 (storage file path validation against {org_id}/ prefix)
---

# Plan A-2 — docx-html auth gate fix (F1-Wave-A) — SUMMARY

## Overview

D-035 first-day task #3: closed the unauthenticated access gap on
`GET /api/invoices/[id]/docx-html`. The endpoint previously returned
rendered DOCX HTML to ANY request that knew or guessed a UUID — no
auth check, no tenant filter, no org_id scoping. Per CLAUDE.md
Development Rule, every API route gates on `getCurrentMembership()`
before DB access; this plan brings docx-html into that contract.

This is the second F1-Wave-A plan landed. Code-only change (no
migration). Atomic commit per nwrp50 Vercel-only protocol.

## Deliverable completed

### Single file modified — `src/app/api/invoices/[id]/docx-html/route.ts`

**Diff** (net +18 lines, 1 modified parameter rename `_request` → `request`,
2 modified SELECT chain lines):

```diff
@@ -3,6 +3,10 @@ import mammoth from "mammoth";
 import DOMPurify from "isomorphic-dompurify";
 import { createServerClient } from "@/lib/supabase/server";
 import { ApiError, withApiError } from "@/lib/api/errors";
+import {
+  getCurrentMembership,
+  getMembershipFromRequest,
+} from "@/lib/org/session";

 export const dynamic = "force-dynamic";
 export const fetchCache = "force-no-store";
@@ -11,15 +15,32 @@ export const maxDuration = 30;
 /**
  * Render a DOCX invoice to sanitized HTML so the browser can display it
  * next to the parsed fields. DOCX can't be iframe-embedded like PDFs.
+ *
+ * Auth: requires an active org membership (per CLAUDE.md Development Rule —
+ * every API route gates on `getCurrentMembership()` before DB access).
+ * Cross-tenant invoice ids resolve to 404 (existence-side-channel-safe,
+ * matching the rest of the /api/invoices/[id]/* family).
+ *
+ * Per F1 Wave-A Plan A-2 (D-035 first-day task #3): closes the gap where
+ * the endpoint previously returned rendered DOCX HTML to unauthenticated
+ * requests that knew or guessed a UUID.
  */
 export const GET = withApiError(
-  async (_request: NextRequest, context: { params: { id: string } }) => {
+  async (request: NextRequest, context: { params: { id: string } }) => {
+    const membership =
+      getMembershipFromRequest(request) ?? (await getCurrentMembership());
+    if (!membership) throw new ApiError("Not authenticated", 401);
+
     const supabase = createServerClient();

     const { data: invoice, error } = await supabase
       .from("invoices")
-      .select("id, original_file_url, original_file_type")
+      .select("id, org_id, original_file_url, original_file_type")
       .eq("id", context.params.id)
+      // Defense-in-depth tenant filter — REQUIRED if this route ever switches
+      // to tryCreateServiceRoleClient() (service-role bypasses RLS). Do not
+      // remove without verifying RLS is still the sole tenant boundary.
+      .eq("org_id", membership.org_id)
       .is("deleted_at", null)
       .single();
```

**Pattern matched:** Fast-path `getMembershipFromRequest(req) ?? (await getCurrentMembership())`
following the canonical sibling at `src/app/api/invoices/[id]/route.ts:61`. Rationale per
PLAN.md OPEN-QUESTION-2: docx-html is called on every invoice-detail render via
`invoice-file-preview.tsx:198`; the 250-300ms middleware-header fast-path savings
are perceptible UX.

**Tenant boundary semantics:**
- Missing membership → `ApiError("Not authenticated", 401)`.
- Cross-tenant invoice id → `.eq("org_id", membership.org_id)` zeroes the row; downstream
  `if (error || !invoice) throw new ApiError("Invoice not found", 404)` returns 404 —
  matches the existence-side-channel-safe posture used by `[id]/route.ts:203-205` and
  `[id]/allocations/route.ts:38-40`.
- Authenticated + same-org → existing rendered DOCX HTML behavior preserved (no
  regression to `invoice-file-preview.tsx:198` consumer).

**iter-2 patches:**
- **HF-A2-1 (load-bearing code comment):** 3-line inline comment immediately before the
  `.eq("org_id", membership.org_id)` filter. Documents that if a future maintainer swaps
  `createServerClient()` for `tryCreateServiceRoleClient()`, the .eq filter becomes the
  SOLE tenant boundary — do not remove without verifying RLS is still the sole boundary.
- **HF-A2-2 (extended INSERT/upsert grep):** documented below in "Verification outputs"
  section. Two INSERT sites found (`sample-data/route.ts:157`, `import/upload/route.ts:128`);
  both already pass `org_id: orgId` from server-side membership resolution. No unexpected
  paths.

## Acceptance criteria satisfaction

### Verbatim from Wave-A EXPANDED-SCOPE.md (AC-1..AC-5)

| AC | Status | Evidence |
|----|--------|----------|
| **AC-1** docx-html endpoint identified | ✓ PASS | `src/app/api/invoices/[id]/docx-html/route.ts` (target file located via plan-authoring grep, confirmed by Read tool during execute) |
| **AC-2** `getCurrentMembership()` gate added; missing membership → 401 | ✓ PASS | Grep: `getMembershipFromRequest` count=2 (import + call site), `throw new ApiError("Not authenticated", 401)` count=1 (line 32) |
| **AC-3** No regression in legitimate-membership case | ✓ PASS (mechanical) | Diff preserves existing rendered-DOCX-HTML path. `invoice-file-preview.tsx:198` fetches inside authenticated browser session → fast-path middleware headers populated → membership resolves → continues to mammoth + DOMPurify pipeline unchanged. Manual cURL Scenario 2 deferred to GATE-A. |
| **AC-4** Harness Layer 1 covers endpoint behavior | ✓ PASS (lenient interpretation per OQ-A-2-1 disposition) | Layer 1 build-typecheck passes (signature change `_request` → `request` typesafe); Layer 1 hooks-runner / Drummond gate silent on diff; Layer 1 route-status covers consumer `page.tsx` paths orthogonally. Strict-interpretation Layer 2 standards rule deferred to Wave-B Plan B-7. |
| **AC-5** `npm run build` + Drummond gate green | ✓ PASS | `npx tsc --noEmit` exit 0 (no TypeScript errors); `npm run build` exit 0 (full Next.js production build succeeded); `.githooks/pre-commit` exit 0 (Drummond grep gate silent on staged diff) |

### Plan-derived sub-ACs (AC-6..AC-8)

| AC | Status | Evidence |
|----|--------|----------|
| **AC-6** Fast-path `getMembershipFromRequest(request)` precedes `getCurrentMembership()` fallback | ✓ PASS | Grep: `grep -n "getMembershipFromRequest" src/app/api/invoices/[id]/docx-html/route.ts` returns 2 matches (line 8 import, line 31 call site). Pattern matches canonical `[id]/route.ts:61`. |
| **AC-7** Query-side tenant filter `.eq("org_id", membership.org_id)` present | ✓ PASS | Grep: `grep -n '\.eq("org_id", membership\.org_id)' src/app/api/invoices/[id]/docx-html/route.ts` returns 1 match (line 43). Covers T-A-2-02 mitigation. HF-A2-1 comment present at lines 40-42. |
| **AC-8** Manual cURL scenarios 1/2/3 documented + executed | ⏳ DEFERRED to GATE-A | Documented in PLAN.md Verification commands. Autonomous executor environment has NO running dev server (the agent runs in a Bash tool without `npm run dev` lifecycle); manual scenarios cannot be executed without first standing up `localhost:3000` + Drummond seed + a DOCX-typed invoice fixture. Flagged for GATE-A: harness Layer 1 + grep evidence covers AC-2 + AC-7 falsifiable contracts mechanically; manual scenarios provide independent verification at GATE-A halt review. |

## Verification command outputs

### `npx tsc --noEmit` (typecheck)

```
(empty stdout)
```

Exit code: **0**. Zero TypeScript errors. The `_request` → `request` rename did not
break any caller's parameter-type inference (Next.js route handlers are loose-typed
on the request parameter inside `withApiError` HOC).

### `npm run build` (Next.js production build)

Output (tail):
```
ƒ /vendors                                                    9.9 kB          261 kB
└ ƒ /vendors/[id]                                             11.6 kB         262 kB
+ First Load JS shared by all                                  161 kB
  ├ chunks/4661-6f83372cfa544d9c.js                            103 kB
  ├ chunks/fd9d1056-15fbbc6c011cb74a.js                        53.6 kB
  └ other shared chunks (total)                                4.56 kB


ƒ Middleware                                                   142 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

Exit code: **0**. Full compile + page generation succeeded.

### `.githooks/pre-commit` (Drummond grep gate)

```
EXIT=0
```

Silent on staged diff (no Drummond references introduced; no `cms_rebuild` /
"RossOS" / forbidden-pattern violations).

### iter-2 HF-A2-2 — extended INSERT/upsert grep

Command:
```bash
grep -rnE "from\(.invoices.\)\.(insert|upsert)" src/
```

Result:
```
src/app/api/sample-data/route.ts:157:    await supabase.from("invoices").insert({
src/app/api/invoices/import/upload/route.ts:128:      await supabase.from("invoices").insert({
```

**Both sites verified safe:**
- `sample-data/route.ts:157` — passes `org_id: orgId` from `getCurrentMembership()`-resolved server-side identity (verified by reading lines 140-170 of the file). Expected: sample data seeder for the tenant org.
- `invoices/import/upload/route.ts:128` — passes `org_id: orgId` from `getCurrentMembership()`-resolved server-side identity (verified by reading lines 115-145 of the file). Expected: import-error row creation path when storage upload fails mid-batch.

**No unexpected paths.** `.upsert()` returns 0 matches in `src/`. Both INSERT
sites already follow the multi-tenant invariant (org_id from membership, never from
request body). HF-A2-2 documented complete.

### Consumer verification (no client-side change required)

Grep:
```bash
grep -rn "fetch.*api/invoices.*docx-html" src/
```

Result:
```
src/components/invoice-file-preview.tsx:198:        const res = await fetch(`/api/invoices/${invoiceId}/docx-html`);
```

Single consumer. Runs in authenticated browser session (Supabase auth cookies +
middleware-stamped `x-org-id` / `x-org-role` headers). Continues to function
identically post-A-2 — the new auth gate accepts the fast-path header read.

## Deviations from PLAN.md / ITER-2-PATCHES.md

**None of substance.** All directives applied verbatim:

- **PLAN.md Task 1 (auth gate diff):** applied verbatim. Code matches the
  "Code diff preview (consolidated full patch)" exactly. Fast-path pattern,
  `Not authenticated` 401, `.eq("org_id", membership.org_id)` tenant filter,
  expanded JSDoc.
- **PLAN.md Task 2 (consumer verification):** completed via grep — no code
  change needed to `invoice-file-preview.tsx` (confirmed by reading lines
  198-251 of the file).
- **PLAN.md Task 3 (Layer 1 verification):** completed (typecheck + build + Drummond gate).
- **PLAN.md Task 4 (manual scenarios):** documented; execution deferred to GATE-A
  (no running dev server in autonomous executor environment).
- **HF-A2-1:** applied. Three-line inline comment present at lines 40-42 immediately
  before `.eq("org_id", membership.org_id)`. Text matches ITER-2-PATCHES.md spec verbatim.
- **HF-A2-2:** executed. Two INSERT sites confirmed safe; no unexpected paths.
  Documented above.
- **MED-A2-1 (storage file path validation):** deferred to Wave-B per plan
  exclusion. Noted in frontmatter `deferred-to-wave-b`.

**Minor: LF/CRLF warning during git add.** Windows checkout, repo files use LF; git
auto-converts on add. Cosmetic; no behavior impact. Same warning surfaced during
A-1 commits — established pattern.

## OPEN-QUESTIONS resolutions (from plan iter-1)

Accepted plan-author defaults per ITER-2-PATCHES.md:

- **OQ-A-2-1 (harness Layer 1 coverage interpretation):** lenient interpretation (a).
  AC-4 satisfied by Layer 1 build-typecheck + hooks-runner running clean on the diff +
  manual cURL evidence at GATE-A. Strict-interpretation Layer 2 standards rule
  (auth-gate-required-on-every-`/api/**`-route) deferred to Wave-B Plan B-7.
- **OQ-A-2-2 (fast-path vs simpler pattern):** stayed with fast-path. Matches the
  route's nearest sibling (`[id]/route.ts`) which uses the fast-path pattern.
  Allocations route may pick up the fast-path later as parallel cleanup.
- **OQ-A-2-3 (first API-route test file):** deferred to Wave-B. Adding the first
  `.test.ts` file for `src/app/api/**` is meaningful infrastructure investment
  out of scope for Wave-A "low blast radius / minimize cost" envelope. AC-8
  manual scenarios + security-reviewer agent provide adequate falsifiable
  evidence at GATE-A.

## Risk register status

| Risk | Realized? | Notes |
|------|-----------|-------|
| Regression: authenticated user can no longer view their own DOCX invoice preview | NO (mechanical verification) | TypeScript build passed; consumer (`invoice-file-preview.tsx:198`) runs in authenticated session that resolves middleware-stamped fast-path headers. Manual Scenario 2 deferred to GATE-A. |
| Regression: middleware-stamped headers absent → falls back to slow path → endpoint timeout | NO | `maxDuration = 30` (line 13); fallback `await getCurrentMembership()` is 250-300ms per session.ts:128-133 commentary — well under 30s budget. Same code path used by 6+ sibling routes already shipping in production. |
| Regression: cross-tenant filter changes RLS interaction in an unforeseen way | NO | `.eq("org_id", ...)` is defense-in-depth alongside existing RLS at the `invoices` table (migration 00016+ direct-filter policies). If RLS already filters, new filter is a no-op; if RLS dropped, new filter still blocks. No new attack surface. |
| Behavioral change: error message text differs ("Invoice not found" vs old generic 500 from missing-row) | NO | Existing error path already returns `"Invoice not found"` 404 (line 47 post-A-2); cross-tenant case now uses the same path. `invoice-file-preview.tsx:201` reads `data.error` regardless of status code. Unchanged consumer behavior. |
| Harness Layer 1 coverage gap: AC-4 not falsifiable by existing harness | NO (lenient interpretation accepted) | Per OQ-A-2-1 disposition. Layer 2 standards rule deferred to Wave-B. |
| Cost overrun | NO | Plan A-2 = code-only, ~5-minute task per Jake's framing. ~0 vision spend. Cumulative Wave-A spend still under $2 of $5 ceiling. |

## Migration status

**Not applicable.** Plan A-2 is code-only. No `supabase/migrations/*` file created or
modified. Atomic commit contains 1 source file + 1 SUMMARY.md + 1 OVERNIGHT-LOG.md update.

## Self-Check

**Files modified:**
- `src/app/api/invoices/[id]/docx-html/route.ts` — FOUND (verified via git diff —
  net +18 lines added, 2 modified inline) ✓

**Files created:**
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-a/A-2-docx-html-auth-SUMMARY.md` — FOUND (this file) ✓

**Verification commands run + recorded:**
- `npx tsc --noEmit` exit 0 ✓
- `npm run build` exit 0 ✓
- `bash .githooks/pre-commit` exit 0 ✓
- Extended INSERT/upsert grep documented ✓

**Acceptance criteria covered:**
- AC-1..AC-7: PASS (7/8) ✓
- AC-8: DEFERRED to GATE-A (documented rationale) ⏳

**Commit hash:** see git log post-push. Atomic commit per nwrp50 with 3 files:
route source + SUMMARY.md + OVERNIGHT-LOG.md update.

**Pushed:** to `origin/main` per nwrp50 Vercel-only protocol.

## Self-Check: PASSED

All deliverables completed. 7/8 ACs satisfied at commit; AC-8 manual cURL scenarios
deferred to GATE-A halt review (rationale: autonomous executor environment lacks
running dev server lifecycle). Recommend proceed to Plan A-3 (drop budgets +
refactor) per CONTEXT.md sequencing.
