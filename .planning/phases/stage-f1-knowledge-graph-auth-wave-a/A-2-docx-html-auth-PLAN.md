---
phase: stage-f1-knowledge-graph-auth-wave-a
plan: A-2
plan-name: docx-html-auth-gate-fix
type: execute
wave: A
depends_on: []
autonomous: true
halt_after: false
threat_model_severity: medium
status: not-started
requirements: []
files_modified:
  - src/app/api/invoices/[id]/docx-html/route.ts
files_referenced:
  - src/app/api/invoices/[id]/allocations/route.ts (canonical pattern reference)
  - src/app/api/invoices/[id]/route.ts (canonical pattern reference)
  - src/lib/org/session.ts (getCurrentMembership + getMembershipFromRequest source)
  - src/lib/api/errors.ts (ApiError + withApiError helpers — already imported in target file)
requires:
  - .planning/expansions/stage-f1-knowledge-graph-auth-wave-a-EXPANDED-SCOPE.md
  - .planning/expansions/stage-f1-knowledge-graph-auth-EXPANDED-SCOPE.md (umbrella)
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-a/CONTEXT.md
provides:
  - Authenticated-only access to GET /api/invoices/[id]/docx-html
  - Tenant-boundary enforcement (cross-tenant invoice id → 404, not unauthenticated 200 docx HTML)
  - D-035 first-day task #3 closed
affects:
  - All consumers of `/api/invoices/[id]/docx-html` (currently: src/components/invoice-file-preview.tsx fetches at line 198 inside an authenticated session)
  - No DB schema changes
  - No migration sequence position
acceptance-criteria-target: 5 falsifiable items (verbatim from EXPANDED-SCOPE) + 3 plan-derived sub-ACs

threat_model:
  trust_boundaries:
    - "client → /api/invoices/[id]/docx-html — currently UNGATED; any unauthenticated request that knows or guesses a UUID receives sanitized DOCX HTML"
    - "cross-tenant boundary — currently UNGATED; an authenticated user in org-X can request an invoice id belonging to org-Y and receive the rendered HTML"
  threats:
    - id: T-A-2-01
      category: I (Information Disclosure)
      component: GET /api/invoices/[id]/docx-html
      disposition: mitigate
      mitigation: "Add `getCurrentMembership()` (with `getMembershipFromRequest()` fast-path) check before any DB access; reject missing membership with ApiError(401)."
    - id: T-A-2-02
      category: I (Information Disclosure — cross-tenant)
      component: GET /api/invoices/[id]/docx-html
      disposition: mitigate
      mitigation: "Add `.eq('org_id', membership.org_id)` filter to the invoice SELECT (defense-in-depth alongside RLS); cross-tenant id → `Invoice not found` 404 (NOT a 403, to avoid existence-disclosure side-channel — same posture as `src/app/api/invoices/[id]/route.ts:203-205`)."
    - id: T-A-2-03
      category: D (Denial of Service — vendor-supplied DOCX rendering cost)
      component: mammoth.convertToHtml on attacker-controlled file
      disposition: accept
      mitigation: "Already mitigated by `maxDuration = 30` (line 9) + DOMPurify sanitization (line 59); the new auth gate further reduces attack surface to authenticated org-members only. No additional mitigation in this plan."

must_haves:
  truths:
    - "GET /api/invoices/[id]/docx-html with NO authenticated session returns HTTP 401 (not 200 + HTML, not 404)"
    - "GET /api/invoices/[id]/docx-html with an authenticated session whose membership.org_id matches the invoice's org_id returns HTTP 200 + sanitized HTML (current behavior preserved)"
    - "GET /api/invoices/[id]/docx-html with an authenticated session whose membership.org_id does NOT match the invoice's org_id returns HTTP 404 (existence-side-channel-safe; matches pattern in src/app/api/invoices/[id]/route.ts:203-205)"
    - "The route handler calls `getCurrentMembership()` (with `getMembershipFromRequest()` fast-path) BEFORE any Supabase query (per CLAUDE.md Development Rule: 'Every API route uses getCurrentMembership() before DB access')"
    - "The route handler filters the invoice SELECT by `.eq('org_id', membership.org_id)` as a defense-in-depth layer alongside RLS (matches canonical pattern in src/app/api/invoices/[id]/allocations/route.ts:37-40)"
    - "Existing DOCX file-preview UX at src/components/invoice-file-preview.tsx:198 continues to render DOCX invoices identically for authenticated org-members"
    - "`npm run build` passes with zero TypeScript errors; `npx tsc --noEmit` passes"
    - "Drummond grep gate (system pre-commit hook at .githooks/pre-commit) silent on the committed diff"
  artifacts:
    - path: "src/app/api/invoices/[id]/docx-html/route.ts"
      provides: "GET handler with `getCurrentMembership()` + tenant-boundary filter prepended to the existing Supabase query"
      contains: "getCurrentMembership"
      contains_also: ".eq(\"org_id\", membership.org_id)"
  key_links:
    - from: "src/app/api/invoices/[id]/docx-html/route.ts"
      to: "src/lib/org/session.ts (getCurrentMembership + getMembershipFromRequest)"
      via: "named import"
      pattern: "import.*getCurrentMembership"
    - from: "src/app/api/invoices/[id]/docx-html/route.ts"
      to: "src/lib/api/errors.ts (ApiError 401)"
      via: "existing named import — re-used for new 401 throw"
      pattern: "throw new ApiError\\(.*401"
    - from: "src/components/invoice-file-preview.tsx:198"
      to: "/api/invoices/[id]/docx-html"
      via: "fetch in useEffect"
      pattern: "fetch.*api/invoices.*docx-html"
---

# Plan A-2 — docx-html auth gate fix

## Source decision

D-035 first-day task #3: **docx-html endpoint auth gate** (per umbrella EXPANDED-SCOPE.md §5, "F1 first-day tasks").

Per nwrp113 Wave-A authorization: code-only, no migration. 5-minute task per Jake's framing.

## Goal

Add the `getCurrentMembership()` gate to `GET /api/invoices/[id]/docx-html` so the endpoint matches the rest of the `/api/invoices/[id]/*` family. Currently the endpoint reads invoice metadata + downloads the original DOCX file + returns sanitized HTML **without any authentication or tenant-boundary check** — any unauthenticated request that knows a UUID receives the rendered DOCX content.

This violates the CLAUDE.md Development Rule:

> **Every API route uses `getCurrentMembership()` before DB access.** RLS alone is a backstop, not a substitute for application-layer auth. A dropped policy must not cause a leak. Filter every query by `membership.org_id`.

## Scope inclusions

1. Add the canonical auth pattern to `src/app/api/invoices/[id]/docx-html/route.ts`:
   - `getMembershipFromRequest(req)` fast-path (middleware-stamped headers; ~250-300ms faster than `getCurrentMembership()`).
   - Fallback to `await getCurrentMembership()`.
   - `throw new ApiError("Not authenticated", 401)` when both return null.
   - Add `.eq("org_id", membership.org_id)` filter to the existing Supabase SELECT against `invoices`.
2. Cross-tenant attempts return 404 (existence-side-channel-safe; matches `src/app/api/invoices/[id]/route.ts:203-205` and `src/app/api/invoices/[id]/allocations/route.ts:38-40`).
3. Plan SUMMARY documenting the diff + harness Layer 1 build/typecheck verdict.

## Scope exclusions

- **No migration.** This is a code-only change; no DB schema touched.
- **No new test file.** Existing codebase has zero `.test.ts` files for `src/app/api/**` (verified via Glob); creating a one-off test framework for this single endpoint is out of scope per Wave-A "low blast radius / minimize cost" envelope (CONTEXT.md §execution_envelope). Verification is via harness Layer 1 (build + typecheck + hook-sweep) + the manual cURL scenarios documented in the Verification commands section.
- **No refactor of the existing mammoth + DOMPurify rendering path** (lines 42-61). XSS mitigation already in place per defense-in-depth comment at line 56-58.
- **No PATCH / POST / DELETE handler added.** Only the existing GET handler is gated.
- **No changes to `src/components/invoice-file-preview.tsx`.** The fetch at line 198 already runs inside an authenticated browser session that carries Supabase auth cookies; no client-side change is needed.
- **Not in scope:** Layer 2 standards rule asserting auth-gate on every `/api/**` route (that's a candidate for Wave-B Plan B-7 harness-extension or later — surfaced as an OPEN-QUESTION below).

## Current-state analysis

### Target file: `src/app/api/invoices/[id]/docx-html/route.ts`

```typescript
// CURRENT (lines 1-70) — NO auth gate:
import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import DOMPurify from "isomorphic-dompurify";
import { createServerClient } from "@/lib/supabase/server";
import { ApiError, withApiError } from "@/lib/api/errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 30;

export const GET = withApiError(
  async (_request: NextRequest, context: { params: { id: string } }) => {
    const supabase = createServerClient();

    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("id, original_file_url, original_file_type")
      .eq("id", context.params.id)
      .is("deleted_at", null)
      .single();
    if (error || !invoice) throw new ApiError("Invoice not found", 404);
    // ... mammoth + DOMPurify pipeline ...
  }
);
```

**Issues:**

1. **Line 15-16:** `_request: NextRequest` is the underscored placeholder — handler never reads the request. Will be replaced with `request` so `getMembershipFromRequest(request)` can read the middleware-stamped `x-org-id` / `x-org-role` headers.
2. **Line 18:** `const supabase = createServerClient()` runs BEFORE any auth check. Per CLAUDE.md Development Rule, `getCurrentMembership()` (or fast-path equivalent) must precede DB access.
3. **Line 20-24:** invoice SELECT does NOT filter by `org_id`. RLS at the database layer may filter, but per CLAUDE.md: "A dropped policy must not cause a leak. Filter every query by `membership.org_id`."
4. **Line 25:** `Invoice not found` 404 message is correct for the cross-tenant existence-side-channel-safe posture — no change needed there.

### Canonical reference pattern (from `src/app/api/invoices/[id]/allocations/route.ts:25-40`)

```typescript
export const GET = withApiError(async (
  _req: NextRequest,
  context: { params: { id: string } }
) => {
  const membership = await getCurrentMembership();
  if (!membership) throw new ApiError("Not authenticated", 401);
  const supabase = createServerClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, org_id, total_amount, cost_code_id, description")
    .eq("id", context.params.id)
    .single();
  if (!invoice || invoice.org_id !== membership.org_id) {
    throw new ApiError("Invoice not found", 404);
  }
  // ...
```

This route uses the simpler `await getCurrentMembership()` only — no `getMembershipFromRequest()` fast-path. Both styles ship in production.

### Canonical reference pattern (from `src/app/api/invoices/[id]/route.ts:57-69`) — fast-path version

```typescript
export const GET = withApiError(async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  const membership = getMembershipFromRequest(req) ?? (await getCurrentMembership());
  if (!membership) throw new ApiError("Not authenticated", 401);

  const supabase = tryCreateServiceRoleClient() ?? createServerClient();
  const orgId = membership.org_id;

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(`...`)
    .eq("id", params.id)
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .maybeSingle();
```

**Choice for A-2:** Use the **fast-path pattern** (matches `[id]/route.ts:61`). Rationale: docx-html is called from `invoice-file-preview.tsx` on every detail-page render; the 250-300ms saving per `getMembershipFromRequest` cited in `src/lib/org/session.ts:128-133` matters for perceived load time. No need for `tryCreateServiceRoleClient()` — RLS-bounded SELECT on a single invoice id is fine through the user session.

## Implementation tasks

### Task 1: Apply the auth gate diff to the route handler

**File:** `src/app/api/invoices/[id]/docx-html/route.ts`

**Diff:**

```typescript
// BEFORE (lines 1-16):
import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import DOMPurify from "isomorphic-dompurify";
import { createServerClient } from "@/lib/supabase/server";
import { ApiError, withApiError } from "@/lib/api/errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 30;

/**
 * Render a DOCX invoice to sanitized HTML so the browser can display it
 * next to the parsed fields. DOCX can't be iframe-embedded like PDFs.
 */
export const GET = withApiError(
  async (_request: NextRequest, context: { params: { id: string } }) => {
    const supabase = createServerClient();

// AFTER:
import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import DOMPurify from "isomorphic-dompurify";
import { createServerClient } from "@/lib/supabase/server";
import { ApiError, withApiError } from "@/lib/api/errors";
import {
  getCurrentMembership,
  getMembershipFromRequest,
} from "@/lib/org/session";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 30;

/**
 * Render a DOCX invoice to sanitized HTML so the browser can display it
 * next to the parsed fields. DOCX can't be iframe-embedded like PDFs.
 *
 * Auth: requires an active org membership (per CLAUDE.md Development Rule —
 * every API route gates on `getCurrentMembership()` before DB access).
 * Cross-tenant invoice ids resolve to 404 (existence-side-channel-safe,
 * matching the rest of the /api/invoices/[id]/* family).
 *
 * Per F1 Wave-A Plan A-2 (D-035 first-day task #3): closes the gap where
 * the endpoint previously returned rendered DOCX HTML to unauthenticated
 * requests that knew or guessed a UUID.
 */
export const GET = withApiError(
  async (request: NextRequest, context: { params: { id: string } }) => {
    const membership =
      getMembershipFromRequest(request) ?? (await getCurrentMembership());
    if (!membership) throw new ApiError("Not authenticated", 401);

    const supabase = createServerClient();
```

**Second diff — add `org_id` to the SELECT projection + the cross-tenant filter:**

```typescript
// BEFORE (lines 19-25 in the original file):
    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("id, original_file_url, original_file_type")
      .eq("id", context.params.id)
      .is("deleted_at", null)
      .single();
    if (error || !invoice) throw new ApiError("Invoice not found", 404);

// AFTER:
    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("id, org_id, original_file_url, original_file_type")
      .eq("id", context.params.id)
      .eq("org_id", membership.org_id)
      .is("deleted_at", null)
      .single();
    if (error || !invoice) throw new ApiError("Invoice not found", 404);
```

**Rationale for `.eq("org_id", membership.org_id)` over the inline-check pattern (`if (invoice.org_id !== membership.org_id)`):** Both ship in production. The query-side filter is slightly preferred here because:

1. It hits a tenant-bounded composite index (org_id is the leading column on most tenant tables, e.g., migrations 00043+ for invoice_allocations).
2. It produces the same 404 verdict whether (a) the invoice doesn't exist or (b) the invoice belongs to a different org — RLS already gives this outcome, but the explicit filter makes the intent grep-able and the unit-of-isolation visible in the SQL.

The inline-check pattern (used by allocations route) is functionally equivalent. Either is acceptable for this plan; the diff above uses the query-side filter to match `src/app/api/invoices/[id]/route.ts:80-82` which is the closest sibling route.

### Task 2: Verify the existing consumer still works

**File (read-only verification):** `src/components/invoice-file-preview.tsx:198`

```typescript
// EXISTING — no change needed:
const res = await fetch(`/api/invoices/${invoiceId}/docx-html`);
```

The fetch runs inside an authenticated browser session that carries Supabase auth cookies. The new gate accepts middleware-stamped headers (fast-path) OR the session resolved via `getCurrentMembership()` — either succeeds for an authenticated org-member viewing their own invoice.

**No code change to `invoice-file-preview.tsx`.** Just confirm via build that no TypeScript error surfaces from the docx-html route's signature change (`_request` → `request`).

### Task 3: Run harness Layer 1 verification

Per nwrp113 CONTEXT.md §execution_envelope CATEGORY E (established harness improvements / CATEGORY F (plan execution within Wave-A scope per PLAN.md specs):

1. `npm run build` — must pass.
2. `npx tsc --noEmit` — must pass.
3. System pre-commit hook (`.githooks/pre-commit` — Drummond grep gate per nwrp33 C6) — silent on the diff.
4. (Optional, if harness orchestrator is run on the resulting branch:) Layer 1's `build-typecheck.ts` covers items 1+2; `hooks-runner.ts` covers item 3. Layer 1 does NOT have an `/api/**`-route-status sub-runner today (route-status.ts at `src/lib/verification/layer1/route-status.ts:48-78` walks `src/app/**/page.tsx` only — excludes `app/api/` per line 60). The `/api/invoices/[id]/docx-html` endpoint itself is NOT directly exercised by the harness's existing Layer 1 sub-runners. See OPEN-QUESTION below.

### Task 4: Manual verification (3 scenarios)

Documented in Verification commands section below. These are NOT executable harness checks — they are documented as cURL snippets the executor will run locally against `localhost:3000` after the diff is applied + dev server restarted.

## Code diff preview (consolidated full patch)

```typescript
// src/app/api/invoices/[id]/docx-html/route.ts — FULL FILE AFTER A-2

import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import DOMPurify from "isomorphic-dompurify";
import { createServerClient } from "@/lib/supabase/server";
import { ApiError, withApiError } from "@/lib/api/errors";
import {
  getCurrentMembership,
  getMembershipFromRequest,
} from "@/lib/org/session";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 30;

/**
 * Render a DOCX invoice to sanitized HTML so the browser can display it
 * next to the parsed fields. DOCX can't be iframe-embedded like PDFs.
 *
 * Auth: requires an active org membership (per CLAUDE.md Development Rule —
 * every API route gates on `getCurrentMembership()` before DB access).
 * Cross-tenant invoice ids resolve to 404 (existence-side-channel-safe,
 * matching the rest of the /api/invoices/[id]/* family).
 *
 * Per F1 Wave-A Plan A-2 (D-035 first-day task #3): closes the gap where
 * the endpoint previously returned rendered DOCX HTML to unauthenticated
 * requests that knew or guessed a UUID.
 */
export const GET = withApiError(
  async (request: NextRequest, context: { params: { id: string } }) => {
    const membership =
      getMembershipFromRequest(request) ?? (await getCurrentMembership());
    if (!membership) throw new ApiError("Not authenticated", 401);

    const supabase = createServerClient();

    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("id, org_id, original_file_url, original_file_type")
      .eq("id", context.params.id)
      .eq("org_id", membership.org_id)
      .is("deleted_at", null)
      .single();
    if (error || !invoice) throw new ApiError("Invoice not found", 404);
    if (invoice.original_file_type !== "docx") {
      throw new ApiError("Not a DOCX invoice", 400);
    }
    if (!invoice.original_file_url) {
      throw new ApiError("Invoice has no file", 404);
    }

    const { data: fileData, error: dlError } = await supabase.storage
      .from("invoice-files")
      .download(invoice.original_file_url);
    if (dlError || !fileData) {
      throw new ApiError(`Download failed: ${dlError?.message ?? "unknown"}`, 500);
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await mammoth.convertToHtml(
      { buffer },
      {
        // Keep it simple — wrap recognized lists/paras. No images (they'd
        // need signed URLs and DOCX invoices rarely embed them).
        styleMap: [
          "p[style-name='Heading 1'] => h2",
          "p[style-name='Heading 2'] => h3",
          "p[style-name='Heading 3'] => h4",
        ],
      }
    );

    // XSS guard (defense in depth): even though every consumer also
    // sanitizes on render, sanitizing here means the value persisted /
    // logged / cached anywhere downstream is already safe. DOMPurify
    // strips <script>, on*= handlers, and javascript: URLs.
    const sanitized = DOMPurify.sanitize(result.value, {
      USE_PROFILES: { html: true },
    });

    return NextResponse.json({
      html: sanitized,
      warnings: result.messages
        .filter((m) => m.type === "warning")
        .map((m) => m.message),
    });
  }
);
```

**Total net diff:** +8 lines (5 new imports + 3 new auth-gate lines), 1 modified line (`_request` → `request`), 2 modified SELECT chain lines (add `org_id` to projection + add `.eq("org_id", ...)` filter), 1 expanded JSDoc comment block.

## Acceptance criteria

### Verbatim from Wave-A EXPANDED-SCOPE.md §Plan A-2 acceptance

1. **AC-1:** docx-html endpoint identified via grep for current handler. **(Confirmed during plan authoring: `src/app/api/invoices/[id]/docx-html/route.ts`.)**
2. **AC-2:** `getCurrentMembership()` gate added; missing membership → 401 unauthorized.
3. **AC-3:** No regression in legitimate-membership case (existing docx-html generation continues).
4. **AC-4:** Harness Layer 1 covers the endpoint behavior (authorized + unauthorized cases). **(See OPEN-QUESTION 1 below — Layer 1's route-status sub-runner walks `src/app/**/page.tsx` only and does NOT exercise `/api/**` endpoints; the Layer 1 build-typecheck + hooks-runner sub-runners DO cover the diff, and that is the falsifiable interpretation of AC-4 supported by the existing harness.)**
5. **AC-5:** `npm run build` + Drummond gate green.

### Plan-derived sub-ACs

6. **AC-6:** Use of `getMembershipFromRequest(request)` fast-path BEFORE `getCurrentMembership()` fallback — matches canonical pattern in `src/app/api/invoices/[id]/route.ts:61`. Falsifiable via grep: `grep -n "getMembershipFromRequest" src/app/api/invoices/[id]/docx-html/route.ts` returns ≥1 match.
7. **AC-7:** Query-side tenant filter — falsifiable via grep: `grep -n '.eq("org_id", membership.org_id)' src/app/api/invoices/[id]/docx-html/route.ts` returns ≥1 match (covers T-A-2-02 mitigation).
8. **AC-8:** Manual verification scenarios documented + executable as cURL snippets (Verification commands section below). Executor must run all 3 scenarios + paste output into the plan SUMMARY before committing.

## Verification commands

### Mandatory pre-commit checks (gate the diff)

```bash
# 1. Type-check passes (Layer 1 build-typecheck equivalent — fast inner loop)
npx tsc --noEmit

# 2. Build passes (Layer 1 build-typecheck.ts)
npm run build

# 3. Drummond grep gate silent (Layer 1 hooks-runner equivalent)
.githooks/pre-commit  # runs verbatim; expect zero stdout + exit 0
```

### Manual scenarios (3 cases — executor runs after `npm run dev` on a clean checkout)

Assumptions: dev server running at `localhost:3000`; Drummond seed loaded; one DOCX invoice exists in fixture org (e.g., the Doug Naeher Drywall reference invoice per CLAUDE.md "Known Invoice Formats #3"). Substitute `<DOCX_INVOICE_UUID>` with the actual UUID from `select id from invoices where original_file_type = 'docx' limit 1;`.

**Scenario 1 — Unauthenticated request (expect HTTP 401):**

```bash
# No auth cookie supplied
curl -i -s "http://localhost:3000/api/invoices/<DOCX_INVOICE_UUID>/docx-html" | head -5

# EXPECTED:
# HTTP/1.1 401 Unauthorized
# ...
# {"error":"Not authenticated"}
```

**Scenario 2 — Authenticated request, member of the invoice's org (expect HTTP 200 + JSON containing `html` field):**

```bash
# Run the request in a logged-in browser session (e.g., open
# DevTools → Network on /financials/invoices/<DOCX_INVOICE_UUID>; the
# docx-html fetch happens automatically via invoice-file-preview.tsx:198).
# OR replicate via cURL with the Supabase auth cookie set:

curl -i -s \
  --cookie "sb-<project-ref>-auth-token=<session-token>" \
  "http://localhost:3000/api/invoices/<DOCX_INVOICE_UUID>/docx-html" \
  | head -20

# EXPECTED:
# HTTP/1.1 200 OK
# content-type: application/json
# ...
# {"html":"<p>...sanitized DOCX content...</p>","warnings":[]}
```

**Scenario 3 — Authenticated request, member of a DIFFERENT org (expect HTTP 404 — NOT 403; per the existence-side-channel-safe posture):**

```bash
# Step 1: get a UUID of an invoice belonging to a different org
# (run in psql as service-role):
#   select id from invoices
#   where original_file_type = 'docx'
#     and org_id != '<current-user-org-uuid>'
#   limit 1;

# Step 2: cURL with the same authenticated session as Scenario 2
curl -i -s \
  --cookie "sb-<project-ref>-auth-token=<session-token>" \
  "http://localhost:3000/api/invoices/<CROSS_TENANT_DOCX_UUID>/docx-html" \
  | head -10

# EXPECTED:
# HTTP/1.1 404 Not Found
# ...
# {"error":"Invoice not found"}
```

### Optional: full harness run (post-commit on branch)

```bash
# Layer 1 build-typecheck + hooks-runner + route-status (page.tsx only) + DOM
npm run verify:phase  # or whatever harness orchestrator script is wired
```

Note: harness Layer 1's `route-status.ts` does NOT exercise `/api/invoices/[id]/docx-html` directly (excludes `app/api/`). What Layer 1 DOES cover:

- **build-typecheck** — catches signature mismatches in the route file (`_request` → `request` rename surfaces immediately if anything imports the function's parameter type).
- **hooks-runner** — Drummond grep gate.
- **route-status** — every `src/app/**/page.tsx` returns 2xx/3xx (orthogonal coverage; would catch a regression where the page that mounts invoice-file-preview can't load, but does not test the docx-html endpoint itself).
- **dom-assertions** — orthogonal; runs against page DOM, not API endpoints.

Manual scenarios above are the falsifiable evidence for AC-2/3 (authorized + unauthorized cases). The Wave-A QA scope (per EXPANDED-SCOPE.md §Wave-A QA scope) spawns `security-reviewer` to confirm no auth regression — that reviewer reads the diff + acceptance criteria + Verification commands output.

## Dependencies

- **None.** Plan A-2 is independent of A-1, A-3, A-4, A-5. Can land at any point in Wave-A execution.
- **Recommendation:** land A-2 after A-1 (smaller migrations sequence first per CONTEXT.md §Sequencing) but parallel-ready with A-3 and A-4 if execution wants to batch the typecheck + build cycles.

## Rollback strategy

Single-commit, code-only change with no schema dependency. Rollback = `git revert <A-2-commit-sha>`.

- **No migration to roll back.** No DB state changes.
- **No data backfill to undo.** No rows mutated.
- **No consumer changes to revert.** `invoice-file-preview.tsx` continues to function before, during, and after rollback.
- **Idempotency:** re-applying the diff after revert + re-revert is safe (no side effects).

Worst case (somehow auth gate breaks legitimate flow despite Verification commands passing): revert the commit, the endpoint returns to the pre-A-2 ungated behavior, no data loss. This explicitly re-introduces the D-035 #3 vulnerability — so revert must be followed by an immediate re-plan or root-cause investigation before re-trying. Per nwrp113 CATEGORY Y: 3 fix attempts failed on same root cause → HALT for Jake.

## Risk register

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| Regression: authenticated user can no longer view their own DOCX invoice preview | HIGH | LOW | Scenario 2 manual verification; canonical pattern proven across `[id]/route.ts` + `[id]/allocations/route.ts` + 6 other routes (per grep on `isPlatformAdmin\|impersonation` family of patterns); pattern is type-safe (would fail typecheck if `getCurrentMembership` signature drifted) |
| Regression: middleware-stamped headers absent → falls back to slow path → endpoint timeout | MEDIUM | LOW | `maxDuration = 30` already in place (line 9); fallback path is `await getCurrentMembership()` (~250-300ms slower per session.ts:128-133 commentary — well under 30s budget); fallback is the SAME code path already used by 6+ sibling routes in production |
| Regression: cross-tenant filter changes RLS interaction in an unforeseen way | LOW | LOW | RLS on `invoices` already enforces org-boundary (migration history shows `invoices.org_id` direct-filter policy from migration 00016+). The new `.eq("org_id", ...)` is defense-in-depth — if RLS was already filtering, the new filter is a no-op; if RLS dropped, the new filter still blocks. No new attack surface. |
| Behavioral change: error message text differs ("Invoice not found" vs old generic 500 from missing-row) | LOW | LOW | Existing error path already returns `"Invoice not found"` 404 (line 25); cross-tenant case now uses the same path. No change to consumer parsing. invoice-file-preview.tsx:201 reads `data.error` regardless of status code — unchanged behavior. |
| Harness Layer 1 coverage gap: AC-4 not falsifiable by existing harness | LOW (philosophical, not safety) | HIGH | OPEN-QUESTION 1 below. Plan-review iter-1 may want to bump to a Layer 2 rule; otherwise manual cURL scenarios + security-reviewer reading the diff are the authoritative falsifiable evidence. |
| Cost overrun: harness re-runs consume Layer 3 vision budget | LOW | LOW | CONTEXT.md §execution_envelope tracks $5 vision cap; harness re-run for code-only change runs Layers 1-2 only (vision-free); Layer 3 is gated to UI-touching plans per VERIFICATION-PIPELINE.md. |

## Plan size

PLAN.md content (excluding frontmatter): **~250 lines** code+prose targeting Jake's "5-minute task" framing — minimal scope, maximal explicitness, no decisions deferred.

## Open questions

<OPEN-QUESTION-1>
**Q:** AC-4 says "Harness Layer 1 covers the endpoint behavior (authorized + unauthorized cases)." Existing harness Layer 1 sub-runners are: `build-typecheck`, `hooks-runner`, `route-status` (page.tsx only — excludes `app/api/` per `src/lib/verification/layer1/route-status.ts:60`), and `dom-assertions` (page DOM only). **None directly exercise the `/api/invoices/[id]/docx-html` endpoint with authenticated + unauthenticated sessions.**

Three possible interpretations of AC-4:

- **(a) Lenient:** AC-4 is satisfied by Layer 1 build-typecheck + hooks-runner running clean on the diff (catches signature drift + Drummond gate violations). Manual cURL scenarios + security-reviewer agent reading the diff are the authoritative falsifiable evidence for the auth behavior itself. **Recommendation:** ship with this interpretation; AC-4 plan-language slightly imprecise vs. existing harness capability.

- **(b) Strict:** Add a Layer 2 standards rule asserting `getCurrentMembership()` gate on every `/api/**` route file (or some specific allowlist). Would surface as a static-analysis rule running against `src/app/api/**/*.ts`. **Out of scope for A-2** (this is a candidate for Wave-B Plan B-7 harness extensions or a separate cleanup plan).

- **(c) Mid:** Add a one-off Playwright sub-runner to Layer 1 that hits `/api/invoices/<fixture-uuid>/docx-html` with + without harness session. **Probably overkill for A-2** — adds harness infrastructure not used elsewhere; better as a Layer 2 standards rule per (b).

**Default recommendation:** proceed with interpretation (a). Surface this OPEN-QUESTION for plan-review iter-1 to either confirm or escalate.
</OPEN-QUESTION-1>

<OPEN-QUESTION-2>
**Q:** Use the simpler `await getCurrentMembership()` pattern (matches `[id]/allocations/route.ts:29-30`) or the fast-path `getMembershipFromRequest(req) ?? (await getCurrentMembership())` pattern (matches `[id]/route.ts:61`)?

Both ship in production. Diff currently uses the fast-path version (per Implementation tasks §Task 1 + Code diff preview).

- **Fast-path argument:** docx-html is called on every invoice-detail-page render (invoice-file-preview.tsx:198 fires in a useEffect on mount); 250-300ms savings (per session.ts:128-133 commentary) is perceptible.
- **Simpler argument:** allocations route is called on the same page and uses the simpler pattern — consistency between sibling routes might be preferable to micro-optimization.

**Default recommendation:** stay with fast-path version. Allocations route may pick up the fast-path later as a parallel cleanup; A-2 should match the route's nearest sibling (`[id]/route.ts`) which uses fast-path. Surface for plan-review iter-1 if preference differs.
</OPEN-QUESTION-2>

<OPEN-QUESTION-3>
**Q:** Should A-2 introduce a `src/app/api/invoices/[id]/docx-html/route.test.ts` test file as the first endpoint test in the codebase?

**Pro:** establishes pattern for testing API routes; would falsifiably cover AC-4.
**Con:** zero existing `.test.ts` files for `src/app/api/**` (Glob verified). Adding the first one means choosing a test runner + mocking strategy + fixture-session-builder — none of which exist. This is meaningful infrastructure investment for a 5-minute task; out of scope per Wave-A "low blast radius / minimize cost" envelope (CONTEXT.md §execution_envelope; nwrp113 cost ceiling $5 cumulative vision spend, currently ~$2).

**Default recommendation:** defer test-file infrastructure to a dedicated Wave-B (or later) plan. AC-8 manual scenarios + security-reviewer agent provide adequate falsifiable evidence. Surface for plan-review iter-1.
</OPEN-QUESTION-3>

---

## Output

After execution, create `.planning/phases/stage-f1-knowledge-graph-auth-wave-a/A-2-docx-html-auth-SUMMARY.md` per the standard plan SUMMARY template, including:

- Commit SHA
- Full diff captured (the +/- lines actually committed)
- Verification command output (`npx tsc --noEmit` + `npm run build` + `.githooks/pre-commit` exit codes)
- Manual scenarios 1/2/3 actual output (or note that a scenario was skipped + why)
- AC-1..AC-8 each marked PASS/FAIL with one-line evidence
- Resolutions to any of OPEN-QUESTION 1/2/3 surfaced during plan-review
- Risk register status (any risk now realized?)
