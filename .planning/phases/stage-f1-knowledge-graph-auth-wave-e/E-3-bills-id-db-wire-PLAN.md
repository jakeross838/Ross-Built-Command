---
phase: stage-f1-knowledge-graph-auth-wave-e
plan: E-3
plan-name: bills-id-db-wire
type: execute
wave: E
depends_on: []
autonomous: true
halt_after: false
requires_smoke: true
threat_model_severity: medium
status: not-started
authored: 2026-05-14
authored_by: gsd-planner (claude-opus-4-7[1m])
authorization: nwrp141-144 + Wave-D /nightwork-qa ai-logic-tester Bug D + spec-checker BLOCKING #2

requirements: []

source_decisions:
  - "Wave-E EXPANDED-SCOPE §Plan E-3 (.planning/expansions/stage-f1-knowledge-graph-auth-wave-e-EXPANDED-SCOPE.md lines 73-92) — wire real public.invoices DB lookup; F1 trajectory; halt-if-RLS-or-schema-changes-needed"
  - "Wave-D /nightwork-qa ai-logic-tester Bug D (.planning/qa-runs/2026-05-14-1700-qa-report.md lines 79) — root cause: page reads in-memory CALDWELL_INVOICES; synthetic seed UUID 33333333-... never matches Caldwell string IDs like inv-caldwell-001"
  - "Wave-D /nightwork-qa spec-checker BLOCKING #2 (qa-report.md line 79 + recommended-next-step item 4) — /financials/bills/[id] returns 404 on synthetic UUID against current Caldwell-fixture path"
  - "nwrp141 Q3 decision — wire real DB lookup (F1 trajectory; correct long-term). Caldwell ID waiver REJECTED because it creates broken-route shipping pattern"
  - "CLAUDE.md Architecture Rules — every API/page query MUST call getCurrentMembership() before DB access; never hardcode ORG_ID fallback (only TEMPLATE_ORG_ID is sanctioned constant)"
  - "Wave-E EXPANDED-SCOPE §Plan E-1 (lines 28-38) — vendor PII embed narrowing on API route. E-3 coordinates with E-1 by using the SAME narrowed embed shape (id, name, address — no phone/email) so the page does not re-introduce the PII leak E-1 closes"

files_modified:
  - src/app/financials/bills/[id]/page.tsx

files_referenced:
  - src/app/design-system/_fixtures/drummond/invoices.ts (current Caldwell fixture source; defines the in-memory rows whose string IDs like "inv-caldwell-001" never match synthetic UUIDs — being REPLACED by real DB lookup. Fixture file itself is NOT modified by E-3.)
  - src/app/design-system/_fixtures/drummond/types.ts (CaldwellInvoice / CaldwellVendor / CaldwellJob / CaldwellCostCode type definitions; remain the InvoiceReviewView contract — E-3 constructs CaldwellInvoice-shaped objects from DB rows to preserve the prop contract)
  - src/app/api/invoices/[id]/route.ts (existing real-invoice API route; canonical pattern reference for: getCurrentMembership() check + Supabase query + PostgREST embed + 404 handling + org scoping. Post-E-1, the vendor embed in this file narrows to (id, name, address) — E-3 mirrors that shape.)
  - src/components/prototypes/InvoiceReviewView.tsx (the View — UNCHANGED by E-3 per Wave-E EXPANDED-SCOPE; receives CaldwellInvoice prop. View's prop signature: invoice: CaldwellInvoice, vendor: { id, name }, job: { id, name }, costCode: { id, code, description } | null. Note the vendor signature is minimally {id, name} — narrowed embed (id, name, address) satisfies it.)
  - src/lib/supabase/server.ts (createServerClient pattern reference; cookie-aware Supabase client for Server Components)
  - src/lib/org/session.ts (getCurrentMembership() reference; returns { org_id, role, is_active } or null — null path -> notFound() per CLAUDE.md auth posture)
  - supabase/migrations/00001_initial_schema.sql (lines 132-190 — canonical public.invoices schema: id, job_id, vendor_id, cost_code_id, po_id, co_id, invoice_number, invoice_date, vendor_name_raw, description, line_items JSONB, total_amount BIGINT, invoice_type, confidence_score, confidence_details JSONB, status, status_history, received_date, payment_date, original_file_url, org_id, deleted_at)
  - supabase/migrations/00013_invoice_line_items_and_co_flags.sql (adds invoice_line_items table — separate from inline line_items JSONB on invoices; E-3 reads inline line_items JSONB for prototype-shape parity; F1 may later swap to invoice_line_items joined fetch)
  - supabase/migrations/00016_multi_tenant_foundation.sql (line 157 — RESTRICTIVE org-isolation RLS policy on public.invoices: `org_id = app_private.user_org_id()`. Confirms the page query with `.eq('org_id', orgId)` is belt-AND-suspenders with RLS, not in conflict.)
  - scripts/fixtures/smoke-seed.sql (lines 200-211 — smoke seed inserts 5 invoices with synthetic UUID `33333333-3333-3333-3333-30000000000{1..5}`. Each row populates ONLY: id, org_id, job_id, vendor_name_raw, total_amount, invoice_type, status, received_date. No vendor_id, no cost_code_id, no line_items, no confidence_score/confidence_details, no description, no invoice_number, no invoice_date, no payment_date, no original_file_url. SEE §Field mapping concern below — drives E-3's safe-default construction discipline.)
  - .planning/qa-runs/2026-05-14-1700-qa-report.md (Wave-D QA verdict; BLOCKING #2 + ai-logic-tester Bug D)
  - .planning/expansions/stage-f1-knowledge-graph-auth-wave-e-EXPANDED-SCOPE.md (Wave-E authoring source)
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-2-remove-double-appshell-PLAN.md (sibling plan format reference; same Wave-D plan style)

requires:
  - .planning/expansions/stage-f1-knowledge-graph-auth-wave-e-EXPANDED-SCOPE.md

provides:
  - "/financials/bills/[id] route resolves synthetic UUIDs (33333333-3333-3333-3333-XXXX) against real public.invoices DB rows scoped to the user's org via getCurrentMembership()"
  - "src/app/financials/bills/[id]/page.tsx reads from Supabase server client, not from in-memory CALDWELL_INVOICES — Caldwell fixture import is REMOVED from this file (Caldwell fixtures remain in @/app/design-system/_fixtures/drummond/ for other consumers and prototype gallery; not deleted)"
  - "Vendor embed in page query uses NARROWED shape (id, name, address — no phone/email) matching the E-1 post-execute narrowed shape on src/app/api/invoices/[id]/route.ts:76. This prevents re-introducing the PII leak E-1 closes."
  - "404 path triggers via Next.js notFound() when (a) invoice id not found at all, OR (b) invoice exists in another org and RLS hides it from the current user. Both states are user-indistinguishable per existing API route convention (no information disclosure)."
  - "Field-mapping shim: page constructs a CaldwellInvoice-shaped object from DB row + embeds so InvoiceReviewView (UNCHANGED) renders against real data. Fields the seed omits (confidence_score/details, line_items, invoice_number, invoice_date, etc.) get safe defaults so the View's required-field accesses don't NPE. See §Field mapping for the exact mapping table."

affects:
  - "Production runtime rendering of /financials/bills/[id] for ALL invoice IDs — Caldwell string IDs (inv-caldwell-001..007) NO LONGER RESOLVE post-E-3 (404 instead of fixture render). This is the intended F1 cutover per nwrp141 Q3. Caldwell fixtures remain accessible via the design-system playground (/design-system/prototypes/invoices/[id]) which is a separate route that imports fixtures directly."
  - "Smoke route /financials/bills/33333333-3333-3333-3333-300000000001 transitions from 404 (current) to 200 with real synthetic-invoice render (post-E-2 re-applied seed + post-E-3 wire). AC-E-10 verifies this end-to-end."
  - "Vercel preview render of /financials/bills/[id] — was previously rendering Caldwell fixtures (if route matched a Caldwell string ID), now renders real DB invoice data."
  - "No change to non-detail bills routes: /financials/bills (list), /financials/bills/qa, /financials/bills/queue, /financials/lien-releases, /financials/payments, /financials/pay-apps are unaffected. E-3 modifies only the detail route's page.tsx."
  - "No change to /design-system/prototypes/invoices/[id] (playground prototype route that imports fixtures directly — out of E-3 scope per Wave-E EXPANDED-SCOPE; design-system gallery remains fixture-driven)."

sequence:
  before: E-2 smoke run; the smoke run validates the route returns 200 + renders real invoice data after re-applied seed (AC-E-10). E-2's smoke harness already targets /financials/bills/33333333-3333-3333-3333-300000000001 (scripts/wave-d-smoke.ts:186) — once E-2's seed re-applies and E-3's wire lands, the smoke assertion flips from 404 to 200.
  parallel_authoring_ok: true (E-1 + E-2 + E-3 all authored in parallel per Wave-E EXPANDED-SCOPE Sequencing block lines 103-105)
  parallel_execute_ok: true with E-1 (E-1 touches src/app/api/invoices/[id]/route.ts ONLY; E-3 touches src/app/financials/bills/[id]/page.tsx ONLY — disjoint files_modified). With E-2: E-2 sequences FIRST because E-2 re-applies the seed which is the source-of-truth for the 5 synthetic invoices E-3's smoke validates against. E-3 can author + commit code in parallel with E-2, but the smoke-PASS gate (AC-E-10) requires E-2's seed re-apply step (orchestrator runs post-execute) to land first.
  execute_order_within_wave: 2 or 3 (E-2 first; E-1 + E-3 second wave — parallel)

acceptance-criteria-target: 9 falsifiable items (AC-E3-01..AC-E3-09); see §Acceptance criteria below

threat_model:
  trust_boundaries:
    - "Auth boundary — page is rendered as a Server Component with cookie-bound Supabase client (createServerClient from src/lib/supabase/server.ts). getCurrentMembership() resolves the authenticated user's active org_member row. If null (unauthenticated or no active membership), the page MUST notFound() — NEVER render with a hardcoded ORG_ID fallback per CLAUDE.md Development Rules."
    - "RLS-as-second-line boundary — public.invoices has RESTRICTIVE RLS policy `org_id = app_private.user_org_id()` (migration 00016:157). The page's `.eq('org_id', orgId)` filter is belt-AND-suspenders with RLS, not in conflict. A dropped policy must not cause a leak — application-layer filter remains in place."
    - "PII-fence boundary — vendor embed in page query uses NARROWED shape (id, name, address — no phone/email). The narrowing matches E-1's post-execute shape on src/app/api/invoices/[id]/route.ts:76 so E-3 does NOT re-introduce the PII leak E-1 closes. If E-3 ships BEFORE E-1, E-3's narrowed embed still stands on its own (the constraint is independent of E-1's API route changes). The post-Wave-E posture: BOTH the API route (E-1) AND the page-side direct query (E-3) use the narrowed embed."
    - "View-contract boundary — InvoiceReviewView is UNCHANGED by E-3 per Wave-E EXPANDED-SCOPE; it expects CaldwellInvoice-shaped props (rich type with confidence_score, confidence_details, flags, line_items as non-nullable). Real DB rows from the synthetic seed do NOT populate these (seed inserts ONLY 8 columns — see §Field mapping). E-3 constructs a CaldwellInvoice-shaped shim object from DB row + embeds + safe defaults to preserve the View contract. The shim approach keeps the View unchanged but means the AI Parse Confidence panel + Status Timeline panel show defaulted data on synthetic invoices. This is acceptable because: (a) synthetic invoices are smoke-harness-only; (b) confidence_score=0 + empty confidence_details renders as 0% / empty grid, which is correct for a non-AI-parsed invoice; (c) the View is structurally tested by the smoke harness via DOM presence assertions, not by content correctness on AI-parse data."

  threats:
    - id: T-E-3-01
      category: "I (Information Disclosure — RLS bypass via hardcoded ORG_ID fallback)"
      component: "src/app/financials/bills/[id]/page.tsx post-wire"
      disposition: "mitigate"
      mitigation: "Implementation tasks below explicitly forbid hardcoded ORG_ID. The page MUST call getCurrentMembership() and `notFound()` if null. The `.eq('org_id', membership.org_id)` filter scopes the query to the user's org. AC-E3-04 verifies via grep — no string literal matching UUID pattern in page.tsx post-wire (excluding the synthetic seed UUID PREFIX `33333333-` if it appears in a doc-comment, which is allowed as a non-runtime constant)."
    - id: T-E-3-02
      category: "I (Information Disclosure — vendor PII leak via embedded query)"
      component: "PostgREST embed in page Supabase query"
      disposition: "mitigate"
      mitigation: "The vendor embed uses NARROWED shape: `vendor:vendor_id (id, name, address)` — NO phone, NO email. This matches the E-1 post-execute API route shape and prevents re-introduction of the leak E-1 closes. AC-E3-05 verifies via grep — `grep -nE \"phone|email\" src/app/financials/bills/\\[id\\]/page.tsx` returns 0 hits in PostgREST embed hints (the file may still reference 'email' in unrelated context like a comment about client_email being out-of-scope, but no embed hint contains phone/email)."
    - id: T-E-3-03
      category: "T (Tampering — NPE from undefined fields when seed columns are sparse)"
      component: "InvoiceReviewView's required-field accesses (inv.confidence_details, inv.flags, inv.line_items, inv.confidence_score)"
      disposition: "mitigate"
      mitigation: "The synthetic seed populates only 8 of the ~20 columns the View accesses (see §Field mapping). E-3 constructs a CaldwellInvoice-shaped shim object with SAFE DEFAULTS for missing fields: confidence_score=0 (renders 0% in confidence panel), confidence_details={vendor_name:0, invoice_number:0, total_amount:0, job_reference:0, cost_code_suggestion:0} (renders 0% grid), flags=[] (panel hides flag span), line_items=[] (Line items panel hides per condition `inv.line_items.length > 0`), invoice_number=null (renders '—'), invoice_date=null (renders '—'), description='' (View does not display description in current render), payment_date=null (renders '—'), po_id=null (renders '—'), original_file_url=null (renders 'Invoice PDF preview' default), draw_id=null (timeline omits 'IN DRAW' step), invoice_type defaults to whatever the DB row provides (seed populates this). AC-E3-06 verifies via a representative-query smoke check that View renders without runtime error against the synthetic seed."
    - id: T-E-3-04
      category: "D (Denial of Service — unauthenticated user hits page)"
      component: "Page render path when membership is null"
      disposition: "mitigate"
      mitigation: "Middleware enforces authenticated-org-member gate before the /financials/bills/[id] route renders (existing middleware contract per src/app/financials/bills/[id]/page.tsx header comment: 'Auth posture: middleware enforces authenticated-org-member gate before this route renders'). Defense in depth: page ALSO calls getCurrentMembership() and `notFound()` if null. Per CLAUDE.md API route rules, the application layer cannot trust middleware alone. AC-E3-04 + AC-E3-07 verify membership check is present + 404 path triggers correctly."
    - id: T-E-3-05
      category: "T (Tampering — Caldwell fixture import path remains and creates dual-source ambiguity)"
      component: "src/app/financials/bills/[id]/page.tsx post-wire"
      disposition: "mitigate"
      mitigation: "Implementation tasks REMOVE the import line `import { CALDWELL_INVOICES, CALDWELL_VENDORS, CALDWELL_JOBS, CALDWELL_COST_CODES } from '@/app/design-system/_fixtures/drummond';` entirely. AC-E3-03 verifies via grep — `grep -nE 'CALDWELL_INVOICES|CALDWELL_VENDORS|CALDWELL_JOBS|CALDWELL_COST_CODES|@/app/design-system/_fixtures' src/app/financials/bills/\\[id\\]/page.tsx` returns 0 hits. The type-only import of CaldwellInvoice (used for the shim object's shape) IS PERMITTED — see Implementation Task 3 below."

must_haves:
  truths:
    - "After E-3 merges, `grep -nE 'CALDWELL_INVOICES|CALDWELL_VENDORS|CALDWELL_JOBS|CALDWELL_COST_CODES' src/app/financials/bills/\\[id\\]/page.tsx` returns 0 hits (the runtime fixture imports are gone)"
    - "After E-3 merges, `grep -nE 'createServerClient|getCurrentMembership' src/app/financials/bills/\\[id\\]/page.tsx` returns at least 1 hit each (auth + Supabase client wired)"
    - "After E-3 merges, `grep -nE 'from \"@/lib/supabase/server\"|from \"@/lib/org/session\"' src/app/financials/bills/\\[id\\]/page.tsx` returns at least 1 hit each (correct imports)"
    - "After E-3 merges, the page query's vendor embed string contains '(id, name, address)' and contains NEITHER 'phone' NOR 'email'"
    - "After E-3 merges, the page function is `async` (Server Component pattern; required for `await getCurrentMembership()` + `await supabase.from(...)`)"
    - "After E-3 merges, `npm run build` passes with zero TypeScript errors"
    - "After E-3 merges, `npx tsc --noEmit` passes with zero errors"
    - "After E-3 merges, calling /financials/bills/33333333-3333-3333-3333-300000000001 (synthetic seed UUID 1) against the harness-fixture user's auth state returns HTTP 200 with rendered InvoiceReviewView containing the seed's vendor_name_raw 'Smoke Vendor Alpha' (verified at AC-E-10 via E-2 smoke run post-seed-reapply)"
    - "After E-3 merges, calling /financials/bills/inv-caldwell-001 (a Caldwell fixture string ID) returns HTTP 404 (Caldwell fixtures NO LONGER resolve at this route — F1 cutover per nwrp141 Q3)"
    - "After E-3 merges, calling /financials/bills/<arbitrary-non-existent-UUID> returns HTTP 404 (notFound() path)"
    - "After E-3 merges, the page wraps render in `<div data-direction=\"C\" data-palette=\"B\" className=\"design-system-scope\">` per CONTEXT D-19 + iter-3 Q-iter2-1=a (Site Office direction-aware CSS activation — pre-existing wrap, must NOT be removed)"
    - "After E-3 merges, financials/layout.tsx remains the sole AppShell provider (E-3 does NOT touch financials/layout.tsx or re-introduce inner AppShell in the page)"
    - "Drummond grep gate (.githooks/pre-commit) silent on the committed diff (no Drummond identifiers — only synthetic UUIDs in comments if present)"

  artifacts:
    - path: "src/app/financials/bills/[id]/page.tsx"
      provides: "Bill detail page WIRED to public.invoices via Supabase. Calls getCurrentMembership() + 404s if null. Queries with `.eq('id', params.id).eq('org_id', orgId).is('deleted_at', null).maybeSingle()`. Embeds vendor (id, name, address), job (id, name), cost_codes (id, code, description). Constructs CaldwellInvoice-shaped shim from DB row + safe defaults. Renders <InvoiceReviewView /> inside the existing Site Office direction wrap."
      contains: "createServerClient"
      contains_also: "getCurrentMembership"
      contains_also_also: "vendors:vendor_id (id, name, address)"
      contains_also_also_also: "InvoiceReviewView"
      not_contains: "CALDWELL_INVOICES"
      not_contains_also: "CALDWELL_VENDORS"
      not_contains_also_also: "CALDWELL_JOBS"
      not_contains_also_also_also: "CALDWELL_COST_CODES"

  key_links:
    - from: "src/app/financials/bills/[id]/page.tsx"
      to: "src/lib/supabase/server.ts createServerClient()"
      via: "import + invocation in async page function"
      pattern: "createServerClient"

    - from: "src/app/financials/bills/[id]/page.tsx"
      to: "src/lib/org/session.ts getCurrentMembership()"
      via: "import + await call"
      pattern: "getCurrentMembership"

    - from: "src/app/financials/bills/[id]/page.tsx"
      to: "public.invoices via Supabase"
      via: "supabase.from('invoices').select(...).eq('id', params.id).eq('org_id', membership.org_id).is('deleted_at', null).maybeSingle()"
      pattern: "from\\(['\"]invoices['\"]\\)"

    - from: "src/app/financials/bills/[id]/page.tsx"
      to: "src/components/prototypes/InvoiceReviewView.tsx"
      via: "<InvoiceReviewView invoice={...} vendor={...} job={...} costCode={...} breadcrumbRoot={...} />"
      pattern: "<InvoiceReviewView"
---

# E-3 — Wire `/financials/bills/[id]` to public.invoices (Caldwell-fixture replacement)

## Goal

Replace the in-memory `CALDWELL_INVOICES` fixture lookup in `src/app/financials/bills/[id]/page.tsx:39` with a real Supabase query against `public.invoices`, scoped to the authenticated user's org via `getCurrentMembership()`. After E-3, `/financials/bills/<UUID>` resolves real DB rows; synthetic seed UUIDs (`33333333-3333-3333-3333-300000000001..5`) render correctly post-E-2 seed re-apply; Caldwell string IDs (`inv-caldwell-001..007`) return 404 (F1 cutover per nwrp141 Q3).

This closes Wave-D `/nightwork-qa` BLOCKING #2 (`/financials/bills/[id]` 404 on synthetic UUID) and ai-logic-tester Bug D (Caldwell-fixture-vs-DB structural incompatibility). The route was the ONLY Document Review pattern test surface and was structurally incoherent with the synthetic seed approach.

**Scope note:** E-3 modifies a single file (`src/app/financials/bills/[id]/page.tsx`). No schema changes, no new RLS policies, no migration. View component (`InvoiceReviewView`) is UNCHANGED. Caldwell fixtures remain in `@/app/design-system/_fixtures/drummond/` for the design-system playground gallery (out of E-3 scope).

## Source decisions (verbatim from authoritative sources)

> **Wave-E EXPANDED-SCOPE §Plan E-3** — "`src/app/financials/bills/[id]/page.tsx:39` currently reads from in-memory `CALDWELL_INVOICES` fixtures (string IDs like `inv-caldwell-001`). Synthetic seed UUIDs `33333333-...` never match. Per nwrp141 Q3 decision: wire real `public.invoices` DB lookup (F1 trajectory; correct long-term).
>
> Implementation:
> - Replace `const inv = CALDWELL_INVOICES.find((i) => i.id === params.id)` with real Supabase query: `supabase.from('invoices').select('*').eq('id', params.id).single()`
> - Verify `getCurrentMembership()` membership check before query per CLAUDE.md API route rules
> - Handle 404 path correctly (invoice not found OR not in user's org via RLS)
> - Map Caldwell-fixture's display logic to real-invoice fields (vendor_name_raw, total_amount, line_items, etc.)
>
> **Halt condition:** If implementation requires new RLS policies or schema changes beyond the existing `invoices` table policies → HALT, surface to Jake."
>
> (`.planning/expansions/stage-f1-knowledge-graph-auth-wave-e-EXPANDED-SCOPE.md` lines 73-92)

> **/nightwork-qa BLOCKING #2 (spec-checker + ai-logic-tester convergence)** — "`/financials/bills/[id]` route reads from in-memory Caldwell fixtures, NOT DB. Synthetic seed UUID `33333333-3333-3333-3333-300000000001` will never match Caldwell ID `inv-caldwell-001`. The ONLY Document Review pattern test route is structurally incoherent with the synthetic seed approach until F1 wires real DB reads."
>
> (`.planning/qa-runs/2026-05-14-1700-qa-report.md` line 79; recommended-fix item 4 line 135)

> **nwrp141 Q3 decision** — "Wire real DB lookup (F1 trajectory; correct long-term). Caldwell ID waiver was REJECTED because it creates broken-route shipping pattern."

> **CLAUDE.md Architecture Rules** — "Every API route uses `getCurrentMembership()` before DB access. RLS alone is a backstop, not a substitute for application-layer auth. A dropped policy must not cause a leak. Filter every query by `membership.org_id`."
>
> "Never hardcode an ORG_ID as a fallback. If a record's `org_id` is null, fail with 500 'record missing org_id'. The only legitimate constant ORG_ID is `TEMPLATE_ORG_ID` in cost-codes/template/route.ts for seed reads."

---

## Pre-flight grep (REQUIRED at execute start)

Executor MUST run BEFORE editing the file.

### Step A — Current state of page.tsx

```bash
grep -nE "CALDWELL_INVOICES|CALDWELL_VENDORS|CALDWELL_JOBS|CALDWELL_COST_CODES|@/app/design-system/_fixtures|notFound\(|createServerClient|getCurrentMembership" \
  src/app/financials/bills/\[id\]/page.tsx
```

**Planner-time grep result (2026-05-14, against current main):**

```
src/app/financials/bills/[id]/page.tsx:27:  CALDWELL_INVOICES,
src/app/financials/bills/[id]/page.tsx:28:  CALDWELL_VENDORS,
src/app/financials/bills/[id]/page.tsx:29:  CALDWELL_JOBS,
src/app/financials/bills/[id]/page.tsx:30:  CALDWELL_COST_CODES,
src/app/financials/bills/[id]/page.tsx:31:} from "@/app/design-system/_fixtures/drummond";
src/app/financials/bills/[id]/page.tsx:39:  const inv = CALDWELL_INVOICES.find((i) => i.id === params.id);
src/app/financials/bills/[id]/page.tsx:40:  if (!inv) return notFound();
src/app/financials/bills/[id]/page.tsx:42:  const vendor = CALDWELL_VENDORS.find((v) => v.id === inv.vendor_id);
src/app/financials/bills/[id]/page.tsx:43:  const job = CALDWELL_JOBS.find((j) => j.id === inv.job_id);
src/app/financials/bills/[id]/page.tsx:44:  const costCode = inv.cost_code_id
src/app/financials/bills/[id]/page.tsx:45:    ? CALDWELL_COST_CODES.find((c) => c.id === inv.cost_code_id) ?? null
src/app/financials/bills/[id]/page.tsx:48:  if (!vendor || !job) return notFound();
```

**Result: 12 hits. The file currently has zero Supabase imports / zero `getCurrentMembership` call (the comment at lines 19-21 documents that F1 will wire those — E-3 is that F1 work).**

If executor's grep returns:
- Caldwell imports already removed → file has been touched since planner-time; HALT for Jake
- A `createServerClient` already present → another plan landed first; HALT and verify
- Different line numbers but same identifiers → safe to proceed (line numbers may shift with prior whitespace edits)

### Step B — Confirm InvoiceReviewView signature unchanged

```bash
grep -nE "export interface InvoiceReviewViewProps|invoice: CaldwellInvoice|vendor: \{|job: \{|costCode:" \
  src/components/prototypes/InvoiceReviewView.tsx
```

**Planner-time grep result:**

```
src/components/prototypes/InvoiceReviewView.tsx:73:export interface InvoiceReviewViewProps {
src/components/prototypes/InvoiceReviewView.tsx:74:  invoice: CaldwellInvoice;
src/components/prototypes/InvoiceReviewView.tsx:75:  vendor: { id: string; name: string };
src/components/prototypes/InvoiceReviewView.tsx:76:  job: { id: string; name: string };
src/components/prototypes/InvoiceReviewView.tsx:77:  costCode: { id: string; code: string; description: string } | null;
```

**Result: The View accepts:**
- `invoice: CaldwellInvoice` (rich CaldwellInvoice type from `@/app/design-system/_fixtures/drummond/types`)
- `vendor: { id: string; name: string }` — **minimal {id, name} contract** (narrowed embed (id, name, address) satisfies this; the address field is unused by the View but doesn't violate the contract)
- `job: { id: string; name: string }` — minimal
- `costCode: { id, code, description } | null`

If the executor's grep reveals the View signature has changed (e.g., a new required field was added in a parallel plan), HALT for Jake — the shim construction in Task 3 will need to be revised.

### Step C — Confirm Caldwell fixture file is NOT modified by E-3

```bash
ls -la src/app/design-system/_fixtures/drummond/invoices.ts
git log --oneline -3 src/app/design-system/_fixtures/drummond/invoices.ts
```

**Planner-time:** File exists, last touched by the sanitize-drummond.ts generator at 2026-05-05. E-3 does NOT touch this file (or any file under `@/app/design-system/_fixtures/drummond/`).

### Step D — Confirm E-1's vendor narrowing target (informational; not blocking E-3)

If E-1 has shipped before E-3 starts:

```bash
grep -n "vendors:vendor_id" src/app/api/invoices/\[id\]/route.ts
```

**Expected post-E-1:** `vendors:vendor_id (id, name, address)` (E-1 removes `phone, email` from this line).

**Pre-E-1 (current main):** `vendors:vendor_id (id, name, phone, email, address)` at line 76.

E-3 uses the NARROWED shape `(id, name, address)` in the page query regardless of whether E-1 has shipped — the constraint is independent. If E-3 ships first, E-3's narrowing stands on its own; if E-1 ships first, E-3's narrowing mirrors E-1's. Either order is safe.

If executor's grep reveals E-1's shape has DIVERGED from `(id, name, address)` (e.g., the team decided to use `(id, name)` instead), HALT for Jake — page query must match the API route shape for consistency.

### Step E — Confirm the existing Site Office direction wrap remains

```bash
grep -nE 'data-direction="C"|data-palette="B"|design-system-scope' src/app/financials/bills/\[id\]/page.tsx
```

**Planner-time grep result:**

```
src/app/financials/bills/[id]/page.tsx:51:    <div data-direction="C" data-palette="B" className="design-system-scope">
```

**This wrap is LOAD-BEARING per CLAUDE.md Stage 1.5c additions** ("DO NOT REMOVE the wrap or strip the attributes — load-bearing on production"). E-3 PRESERVES this wrap; the post-wire JSX still returns `<div data-direction="C" data-palette="B" className="design-system-scope"><InvoiceReviewView ... /></div>`.

---

## Field mapping concern (HALT FINDING — surface to plan-review)

The synthetic seed (`scripts/fixtures/smoke-seed.sql:200-211`) populates only **8 columns** on each `public.invoices` row:

| Column | Seed value |
|---|---|
| `id` | UUID (synthetic, `33333333-3333-3333-3333-30000000000X`) |
| `org_id` | `00000000-0000-0000-0000-fb1ce0a55e55` (fixture-harness-org) |
| `job_id` | UUID (synthetic, `22222222-2222-2222-2222-20000000000X`) |
| `vendor_name_raw` | `'Smoke Vendor Alpha'` / Beta / Gamma / Delta / Epsilon |
| `total_amount` | BIGINT cents |
| `invoice_type` | `'progress'` / `'time_and_materials'` / `'lump_sum'` |
| `status` | `'ai_processed'` / `'pm_review'` / `'qa_review'` / `'in_draw'` / `'paid'` |
| `received_date` | `CURRENT_DATE` |

The View accesses **13+ fields** (see `src/components/prototypes/InvoiceReviewView.tsx` planner-time scan):

| View access | DB column | Seed populates? | Shim default |
|---|---|---|---|
| `inv.id` | `id` | YES | (use DB) |
| `inv.vendor_id` | `vendor_id` | NO | null |
| `inv.job_id` | `job_id` | YES | (use DB) |
| `inv.cost_code_id` | `cost_code_id` | NO | null |
| `inv.po_id` | `po_id` | NO | null |
| `inv.co_id` | `co_id` | NO | null |
| `inv.invoice_number` | `invoice_number` | NO | null |
| `inv.invoice_date` | `invoice_date` | NO | null |
| `inv.description` | `description` | NO | `''` |
| `inv.invoice_type` | `invoice_type` | YES | (use DB) |
| `inv.total_amount` | `total_amount` | YES | (use DB) |
| `inv.confidence_score` | `confidence_score` | NO | `0` |
| `inv.confidence_details` | `confidence_details` JSONB | NO | `{vendor_name:0, invoice_number:0, total_amount:0, job_reference:0, cost_code_suggestion:0}` |
| `inv.status` | `status` | YES | (use DB) |
| `inv.received_date` | `received_date` | YES | (use DB) |
| `inv.payment_date` | `payment_date` | NO | null |
| `inv.draw_id` | `draw_id` | NO | null |
| `inv.line_items` | `line_items` JSONB | NO | `[]` |
| `inv.flags` | (NOT a DB column on public.invoices — Caldwell-only) | N/A | `[]` |
| `inv.original_file_url` | `original_file_url` | NO | null |

**The View also accesses `vendor.name` and `job.name`** — these come from the PostgREST embed, not the invoices row.

### Plan-author halt assessment (per nwrp141 Q3 halt conditions)

**Per Wave-E EXPANDED-SCOPE §Plan E-3 halt conditions:**

1. **NEW RLS policies needed?** NO. `public.invoices` already has RESTRICTIVE org-isolation RLS (migration 00016:157: `org_id = app_private.user_org_id()`). The harness-fixture user is an active org_member of fixture-harness-org and can SELECT the 5 synthetic invoices via existing RLS. **No new RLS needed.**

2. **Schema changes needed?** NO. All View-accessed columns exist on `public.invoices` (verified against migration 00001 lines 132-190). Some are unpopulated by the seed, but they exist as nullable columns. **No schema changes needed.**

3. **Caldwell-only fields without DB equivalent?** ONE: `inv.flags` is a Caldwell-fixture-only string array (the type definition at `src/app/design-system/_fixtures/drummond/types.ts:108` includes `flags: string[]` but there is no `flags` column on `public.invoices`). **Mitigation:** the shim object defaults `flags: []` — the View hides the flag panel via condition `inv.flags.length > 0` so the empty default renders correctly. F1-Wave-B or Wave 1.1 may add a `flags` column if real flag data is needed.

**Conclusion: NO HALT CONDITION TRIGGERED.** E-3 proceeds with the shim approach. The field-mapping table above documents every default explicitly so plan-review can audit the gap.

**Plan-review attention point:** the shim approach trades View-content fidelity (confidence panel shows 0% on synthetic invoices) for View-contract stability (no change to `InvoiceReviewView`). The trade is appropriate because: (a) the View is locked-contract per Wave-E EXPANDED-SCOPE; (b) synthetic invoices exist for smoke-harness DOM-presence assertions, not AI-parse content correctness; (c) real Drummond / Caldwell invoices populated by future invoice-upload pipelines WILL fill these columns, at which point the View renders with full fidelity without any further change. **The shim is the correct F1-trajectory approach** — not a v1-then-v2 reduction.

---

## Implementation tasks

### Task 1 — Pre-flight verification (REQUIRED before any edits)

**Path:** N/A (verification only)

**Action:** Executor MUST complete Steps A-E from §Pre-flight grep above before editing the file. Document outputs in SUMMARY.md before proceeding. If ANY divergence from planner-time grep results (or any blast-radius surprise), HALT for Jake.

### Task 2 — Replace fixture imports + lookup with Supabase query

**Path:** `src/app/financials/bills/[id]/page.tsx`

**Current state (verified at planner-time 2026-05-14):**

```typescript
// Lines 25-32 (imports):
import { notFound } from "next/navigation";
import {
  CALDWELL_INVOICES,
  CALDWELL_VENDORS,
  CALDWELL_JOBS,
  CALDWELL_COST_CODES,
} from "@/app/design-system/_fixtures/drummond";
import InvoiceReviewView from "@/components/prototypes/InvoiceReviewView";

// Lines 34-48 (sync component + fixture lookup):
export default function BillReviewPage({
  params,
}: {
  params: { id: string };
}) {
  const inv = CALDWELL_INVOICES.find((i) => i.id === params.id);
  if (!inv) return notFound();

  const vendor = CALDWELL_VENDORS.find((v) => v.id === inv.vendor_id);
  const job = CALDWELL_JOBS.find((j) => j.id === inv.job_id);
  const costCode = inv.cost_code_id
    ? CALDWELL_COST_CODES.find((c) => c.id === inv.cost_code_id) ?? null
    : null;

  if (!vendor || !job) return notFound();

  return (
    <div data-direction="C" data-palette="B" className="design-system-scope">
      <InvoiceReviewView
        invoice={inv}
        vendor={vendor}
        job={job}
        costCode={costCode}
        breadcrumbRoot={{ href: "/financials/bills", label: "Bills" }}
      />
    </div>
  );
}
```

**Action:**

1. **REMOVE** the runtime fixture imports (lines 26-31):
   ```typescript
   import {
     CALDWELL_INVOICES,
     CALDWELL_VENDORS,
     CALDWELL_JOBS,
     CALDWELL_COST_CODES,
   } from "@/app/design-system/_fixtures/drummond";
   ```

2. **ADD** Supabase + auth imports:
   ```typescript
   import { createServerClient } from "@/lib/supabase/server";
   import { getCurrentMembership } from "@/lib/org/session";
   ```

3. **ADD** type-only import of `CaldwellInvoice` (used to type the shim object — see Task 3):
   ```typescript
   import type { CaldwellInvoice } from "@/app/design-system/_fixtures/drummond/types";
   ```
   **Why type-only:** the InvoiceReviewView prop signature requires `invoice: CaldwellInvoice`; the page constructs a CaldwellInvoice-shaped shim from DB row + safe defaults. A type-only import does NOT carry the runtime fixture rows (no `CALDWELL_INVOICES`/etc. — those are removed in step 1). TypeScript `import type` is erased at compile time per ECMAScript spec.

4. **CHANGE** the component from sync to async (Server Component pattern):
   ```typescript
   export default async function BillReviewPage({
     params,
   }: {
     params: { id: string };
   }) {
     // ... async body below
   }
   ```

5. **REPLACE** the fixture lookup body with the Supabase query. The full replacement body:

   ```typescript
   const membership = await getCurrentMembership();
   if (!membership) return notFound();

   const supabase = createServerClient();

   const { data: row, error } = await supabase
     .from("invoices")
     .select(`
       id, job_id, vendor_id, cost_code_id, po_id, co_id,
       invoice_number, invoice_date, vendor_name_raw, description,
       line_items, total_amount, invoice_type,
       confidence_score, confidence_details,
       status, received_date, payment_date, draw_id,
       original_file_url, org_id,
       vendors:vendor_id (id, name, address),
       jobs:job_id (id, name),
       cost_codes:cost_code_id (id, code, description)
     `)
     .eq("id", params.id)
     .eq("org_id", membership.org_id)
     .is("deleted_at", null)
     .maybeSingle();

   if (error) {
     // Treat any query error as 404 (avoid leaking error detail to user).
     // Server logs will capture the error for ops debugging.
     console.error("[bills/[id]] invoice query error:", error);
     return notFound();
   }
   if (!row) return notFound();
   ```

**Why `(id, name, address)` for the vendor embed:** per E-1 PII-narrowing (Wave-E EXPANDED-SCOPE §Plan E-1) — phone + email are NOT embedded. The address field is in the contract for consistency with E-1's post-execute API route shape and harmless for the View (which only accesses `vendor.name`). If E-1 has already shipped at execute-time, this matches the API route shape. If E-3 ships first, this stands on its own.

**Why `.is('deleted_at', null)`:** soft-delete contract per CLAUDE.md Architecture Rules — deleted invoices must not surface to users. Belt-AND-suspenders with potential future RLS that excludes deleted rows.

**Why `.maybeSingle()` instead of `.single()`:** `.single()` raises an error if zero rows match; `.maybeSingle()` returns `{ data: null }` instead. The cleaner pattern for "404 if not found" — see the existing API route at `src/app/api/invoices/[id]/route.ts:83` which uses the same.

**Verify (executor runs after edit):**
- `grep -nE 'CALDWELL_INVOICES|CALDWELL_VENDORS|CALDWELL_JOBS|CALDWELL_COST_CODES' src/app/financials/bills/\[id\]/page.tsx` → 0 hits
- `grep -nE 'createServerClient|getCurrentMembership' src/app/financials/bills/\[id\]/page.tsx` → at least 1 hit each
- `grep -nE 'from "@/lib/supabase/server"|from "@/lib/org/session"' src/app/financials/bills/\[id\]/page.tsx` → at least 1 hit each
- `grep -nE 'vendors:vendor_id \(id, name, address\)' src/app/financials/bills/\[id\]/page.tsx` → at least 1 hit
- `grep -nE 'vendors:vendor_id.*(phone|email)' src/app/financials/bills/\[id\]/page.tsx` → 0 hits (PII fence)
- `grep -nE 'async function BillReviewPage|export default async function' src/app/financials/bills/\[id\]/page.tsx` → at least 1 hit

### Task 3 — Construct CaldwellInvoice shim + extract embeds

**Path:** `src/app/financials/bills/[id]/page.tsx` (continues from Task 2)

**Action:** After the DB query succeeds (Task 2 step 5), construct the View props from `row` + embeds. Add the following body BEFORE the `return (...)` JSX:

```typescript
// PostgREST embeds may arrive as object OR array depending on FK
// cardinality. The current FKs (vendor_id, job_id, cost_code_id) are
// single-row joins, so each embed is a singleton or null. Normalize to
// object | null defensively (matches the pattern in src/app/api/invoices/[id]/route.ts).
const vendorEmbed = Array.isArray(row.vendors) ? row.vendors[0] ?? null : (row.vendors as { id: string; name: string; address: string | null } | null);
const jobEmbed = Array.isArray(row.jobs) ? row.jobs[0] ?? null : (row.jobs as { id: string; name: string } | null);
const costCodeEmbed = Array.isArray(row.cost_codes) ? row.cost_codes[0] ?? null : (row.cost_codes as { id: string; code: string; description: string } | null);

if (!vendorEmbed || !jobEmbed) {
  // Both are required by the View. If either is missing (FK pointing
  // at a deleted row, or seed inserted without vendor_id), 404.
  return notFound();
}

// Construct CaldwellInvoice-shaped shim from DB row + safe defaults.
// The InvoiceReviewView contract is locked-shape (CaldwellInvoice); see
// §Field mapping concern in PLAN.md for the full mapping rationale.
// Fields the seed populates: id, job_id, vendor_name_raw, total_amount,
// invoice_type, status, received_date. Fields the seed omits: vendor_id,
// cost_code_id, po_id, co_id, invoice_number, invoice_date, description,
// confidence_score, confidence_details, line_items, payment_date,
// draw_id, original_file_url. The `flags` field is Caldwell-only (no DB
// column) — defaults to []. F1-Wave-B or Wave 1.1 may extend.
const invoice: CaldwellInvoice = {
  id: row.id as string,
  vendor_id: (row.vendor_id as string | null) ?? "",
  job_id: (row.job_id as string | null) ?? "",
  cost_code_id: (row.cost_code_id as string | null) ?? null,
  po_id: (row.po_id as string | null) ?? null,
  co_id: (row.co_id as string | null) ?? null,
  invoice_number: (row.invoice_number as string | null) ?? null,
  invoice_date: (row.invoice_date as string | null) ?? null,
  description: (row.description as string | null) ?? "",
  invoice_type: (row.invoice_type as CaldwellInvoice["invoice_type"]) ?? "progress",
  total_amount: Number(row.total_amount ?? 0),
  confidence_score: Number(row.confidence_score ?? 0),
  confidence_details: (row.confidence_details as CaldwellInvoice["confidence_details"]) ?? {
    vendor_name: 0,
    invoice_number: 0,
    total_amount: 0,
    job_reference: 0,
    cost_code_suggestion: 0,
  },
  status: (row.status as CaldwellInvoice["status"]),
  received_date: (row.received_date as string | null) ?? "",
  payment_date: (row.payment_date as string | null) ?? null,
  draw_id: (row.draw_id as string | null) ?? null,
  line_items: Array.isArray(row.line_items) ? (row.line_items as CaldwellInvoice["line_items"]) : [],
  flags: [], // Caldwell-only field; no DB column. F1-Wave-B may add.
  original_file_url: (row.original_file_url as string | null) ?? null,
};

// Vendor prop: View signature accepts { id, name }. The narrowed embed
// (id, name, address) satisfies this — address is unused by the View
// but doesn't violate the contract. Per E-1 PII fence, phone + email
// are intentionally NOT included.
const vendor = { id: vendorEmbed.id, name: vendorEmbed.name };

// Job prop: View signature accepts { id, name }.
const job = { id: jobEmbed.id, name: jobEmbed.name };

// CostCode prop: View signature accepts { id, code, description } | null.
const costCode = costCodeEmbed
  ? { id: costCodeEmbed.id, code: costCodeEmbed.code, description: costCodeEmbed.description }
  : null;
```

**Why the shim approach (vs changing the View signature):** Wave-E EXPANDED-SCOPE locks `InvoiceReviewView` as UNCHANGED. The View expects `CaldwellInvoice`-shaped props with non-nullable `confidence_score`, `confidence_details`, `line_items`, `flags`. Real DB rows (especially synthetic seed) populate sparse columns. Shim construction with safe defaults is the only path that satisfies BOTH constraints (real DB read + locked View contract).

**Why `confidence_score: 0` default:** the View's confidence panel renders `(inv.confidence_score * 100).toFixed(0)%` — 0 renders as "0%" which is correct for a non-AI-parsed synthetic invoice. The `confidenceTone(0)` helper returns `"danger"` (red) which is correct (low confidence). No NPE risk.

**Why `flags: []` default:** the View panel hides via `inv.flags.length > 0` — empty array correctly hides the flag span. No content shown is the correct render for synthetic invoices.

**Why `line_items: []` default:** the Line Items panel renders only if `inv.line_items.length > 0`. Empty array correctly hides the panel. Real Drummond/Caldwell invoices populated by future upload pipelines WILL fill this.

**Why we cast `row.status as CaldwellInvoice["status"]` without a null check:** `public.invoices.status` has `NOT NULL` constraint per migration 00001:159. The DB guarantees non-null. The cast is for TypeScript narrowing (the Supabase client returns it as `string`).

**Verify (executor runs after edit):**
- `npx tsc --noEmit` → 0 errors
- `grep -nE 'const invoice: CaldwellInvoice' src/app/financials/bills/\[id\]/page.tsx` → at least 1 hit
- `grep -nE 'flags: \[\]' src/app/financials/bills/\[id\]/page.tsx` → at least 1 hit (the Caldwell-only default is explicit)

### Task 4 — Update the JSX return (preserve the Site Office wrap)

**Path:** `src/app/financials/bills/[id]/page.tsx` (continues from Task 3)

**Action:** Replace lines 50-60 (the existing JSX return) with the post-shim JSX. The Site Office direction wrap MUST remain — it is LOAD-BEARING per CLAUDE.md ("DO NOT REMOVE the wrap or strip the attributes — load-bearing on production").

```typescript
return (
  <div data-direction="C" data-palette="B" className="design-system-scope">
    <InvoiceReviewView
      invoice={invoice}
      vendor={vendor}
      job={job}
      costCode={costCode}
      breadcrumbRoot={{ href: "/financials/bills", label: "Bills" }}
    />
  </div>
);
```

**Diff preview (full file, post-Task-2/3/4):**

```diff
- import { notFound } from "next/navigation";
- import {
-   CALDWELL_INVOICES,
-   CALDWELL_VENDORS,
-   CALDWELL_JOBS,
-   CALDWELL_COST_CODES,
- } from "@/app/design-system/_fixtures/drummond";
- import InvoiceReviewView from "@/components/prototypes/InvoiceReviewView";
+ import { notFound } from "next/navigation";
+ import { createServerClient } from "@/lib/supabase/server";
+ import { getCurrentMembership } from "@/lib/org/session";
+ import type { CaldwellInvoice } from "@/app/design-system/_fixtures/drummond/types";
+ import InvoiceReviewView from "@/components/prototypes/InvoiceReviewView";

- export default function BillReviewPage({
+ export default async function BillReviewPage({
    params,
  }: {
    params: { id: string };
  }) {
-   const inv = CALDWELL_INVOICES.find((i) => i.id === params.id);
-   if (!inv) return notFound();
-
-   const vendor = CALDWELL_VENDORS.find((v) => v.id === inv.vendor_id);
-   const job = CALDWELL_JOBS.find((j) => j.id === inv.job_id);
-   const costCode = inv.cost_code_id
-     ? CALDWELL_COST_CODES.find((c) => c.id === inv.cost_code_id) ?? null
-     : null;
-
-   if (!vendor || !job) return notFound();
+   const membership = await getCurrentMembership();
+   if (!membership) return notFound();
+
+   const supabase = createServerClient();
+
+   const { data: row, error } = await supabase
+     .from("invoices")
+     .select(`
+       id, job_id, vendor_id, cost_code_id, po_id, co_id,
+       invoice_number, invoice_date, vendor_name_raw, description,
+       line_items, total_amount, invoice_type,
+       confidence_score, confidence_details,
+       status, received_date, payment_date, draw_id,
+       original_file_url, org_id,
+       vendors:vendor_id (id, name, address),
+       jobs:job_id (id, name),
+       cost_codes:cost_code_id (id, code, description)
+     `)
+     .eq("id", params.id)
+     .eq("org_id", membership.org_id)
+     .is("deleted_at", null)
+     .maybeSingle();
+
+   if (error) {
+     console.error("[bills/[id]] invoice query error:", error);
+     return notFound();
+   }
+   if (!row) return notFound();
+
+   // (Shim construction from Task 3 — vendorEmbed, jobEmbed, costCodeEmbed,
+   // null-checks, CaldwellInvoice shim object, vendor/job/costCode props)

    return (
      <div data-direction="C" data-palette="B" className="design-system-scope">
        <InvoiceReviewView
-         invoice={inv}
+         invoice={invoice}
          vendor={vendor}
          job={job}
          costCode={costCode}
          breadcrumbRoot={{ href: "/financials/bills", label: "Bills" }}
        />
      </div>
    );
  }
```

**Verify:**
- `grep -nE '<div data-direction="C" data-palette="B" className="design-system-scope">' src/app/financials/bills/\[id\]/page.tsx` → at least 1 hit (the wrap is preserved)
- `grep -nE '<InvoiceReviewView' src/app/financials/bills/\[id\]/page.tsx` → 1 hit
- `grep -nE 'breadcrumbRoot=\{\{ href: "/financials/bills", label: "Bills" \}\}' src/app/financials/bills/\[id\]/page.tsx` → 1 hit (prop unchanged)

### Task 5 — Update the file header comment

**Path:** `src/app/financials/bills/[id]/page.tsx` (lines 1-23)

**Action:** Update the header comment to reflect post-E-3 state. The current comment (lines 5, 18-20, 22) says "F1 swaps fixtures for real Supabase queries on this wrapper side, View unchanged" and "F1 wires real getCurrentMembership() + Supabase data fetch on this wrapper". After E-3, this IS the F1 wire — update the wording.

**Suggested replacement** (keep the file structure + CONTEXT cite + the Site Office activation note; replace the F1-future-tense language with E-3-past-tense):

```typescript
// src/app/financials/bills/[id]/page.tsx
//
// Production route — Bill review (Stage 1.5c Plan 3 thin wrapper, F1-wired
// to public.invoices via Wave-E Plan E-3).
//
// Mounts InvoiceReviewView from src/components/prototypes/ with REAL invoice
// data from public.invoices (E-3 replaced the Caldwell-fixture lookup with
// a Supabase query; the View is unchanged per Wave-E EXPANDED-SCOPE).
//
// Per CONTEXT D-19 + iter-3 Q-iter2-1=a: outer container wraps in
// data-direction="C" data-palette="B" className="design-system-scope" so
// Site Office direction-aware CSS rules from
// src/app/design-system/design-system.css activate (the file is already
// bundled into production via root layout import per Plan 1 / D-23).
//
// Per CONTEXT D-01 (Bills/Pay Apps rename): UI labels say "Bill" not
// "Invoice". InvoiceReviewView preserves the internal name for
// code-search continuity per D-01 scope clarification.
//
// Auth posture: middleware enforces authenticated-org-member gate before
// this route renders. Page defense-in-depth: calls getCurrentMembership()
// and notFound() if null. Query is scoped to membership.org_id (RLS is
// belt-AND-suspenders, not in conflict).
//
// PII fence: vendor embed uses (id, name, address) shape per Wave-E Plan
// E-1 — phone + email are intentionally NOT embedded. The address field is
// in the contract for parity with the API route at
// src/app/api/invoices/[id]/route.ts; it's unused by InvoiceReviewView.
//
// Field-mapping shim: page constructs a CaldwellInvoice-shaped object
// from DB row + safe defaults to preserve the InvoiceReviewView contract.
// Real Drummond / Caldwell invoices populated by future invoice-upload
// pipelines will populate the sparse columns (confidence_score,
// confidence_details, line_items, etc.); shim defaults handle synthetic
// seed rows. See .planning/phases/stage-f1-knowledge-graph-auth-wave-e/
// E-3-bills-id-db-wire-PLAN.md §Field mapping concern for the full table.
```

**Verify:**
- `grep -nE 'F1-wired|public.invoices via Wave-E Plan E-3' src/app/financials/bills/\[id\]/page.tsx` → at least 1 hit (header updated)
- No stale "F1 wires" / "F1 swaps fixtures" language remaining

### Task 6 — Post-refactor verification

**Path:** N/A (verification only)

**Action:** After Tasks 2-5 land, run:

```bash
# 1. Fixture imports gone
grep -nE 'CALDWELL_INVOICES|CALDWELL_VENDORS|CALDWELL_JOBS|CALDWELL_COST_CODES' \
  src/app/financials/bills/\[id\]/page.tsx
# Expect: 0 hits (the type-only import of CaldwellInvoice is OK — it's a `import type`)

# 2. Type-only Caldwell import still present (used for shim shape)
grep -nE '^import type.*CaldwellInvoice' \
  src/app/financials/bills/\[id\]/page.tsx
# Expect: 1 hit

# 3. Supabase + auth imports present
grep -nE 'createServerClient|getCurrentMembership' \
  src/app/financials/bills/\[id\]/page.tsx
# Expect: at least 1 hit each (one import + one invocation each)

# 4. Page is async
grep -nE 'export default async function BillReviewPage' \
  src/app/financials/bills/\[id\]/page.tsx
# Expect: 1 hit

# 5. Vendor embed is narrowed (no phone/email)
grep -nE 'vendors:vendor_id \(id, name, address\)' \
  src/app/financials/bills/\[id\]/page.tsx
# Expect: 1 hit

grep -nE 'vendors:vendor_id.*(phone|email)' \
  src/app/financials/bills/\[id\]/page.tsx
# Expect: 0 hits (PII fence)

# 6. Site Office wrap preserved
grep -nE '<div data-direction="C" data-palette="B" className="design-system-scope">' \
  src/app/financials/bills/\[id\]/page.tsx
# Expect: 1 hit

# 7. Build clean
npm run build
# Expect: success, no TypeScript errors

# 8. tsc clean
npx tsc --noEmit
# Expect: 0 errors

# 9. Drummond grep gate
.githooks/pre-commit
# Expect: silent (no Drummond identifiers in the diff)

# 10. Caldwell fixture file untouched
git diff src/app/design-system/_fixtures/drummond/
# Expect: empty diff (no fixture files modified)

# 11. View untouched
git diff src/components/prototypes/InvoiceReviewView.tsx
# Expect: empty diff
```

If any of the above fails, HALT for Jake.

---

## Acceptance criteria

| ID | Acceptance criterion |
|---|---|
| AC-E3-01 | Pre-flight grep at execute start (Steps A-E from §Pre-flight grep) matches planner-time output: 12 fixture-related hits in page.tsx pre-edit; InvoiceReviewView signature unchanged; Caldwell fixture file untouched; Site Office wrap present pre-edit. If ANY divergence, executor HALTs for Jake. |
| AC-E3-02 | After Tasks 2-5 apply, `grep -nE 'CALDWELL_INVOICES\|CALDWELL_VENDORS\|CALDWELL_JOBS\|CALDWELL_COST_CODES' src/app/financials/bills/\[id\]/page.tsx` returns 0 hits (runtime fixture imports removed). |
| AC-E3-03 | After Tasks 2-5 apply, `grep -nE '^import type.*CaldwellInvoice' src/app/financials/bills/\[id\]/page.tsx` returns 1 hit (type-only import retained for shim shape; the runtime imports are gone per AC-E3-02). |
| AC-E3-04 | After Tasks 2-5 apply, BOTH of these grep results are present:<br>`grep -nE 'createServerClient' src/app/financials/bills/\[id\]/page.tsx` → at least 2 hits (1 import + 1 invocation)<br>`grep -nE 'getCurrentMembership' src/app/financials/bills/\[id\]/page.tsx` → at least 2 hits (1 import + 1 awaited call)<br>AND no hardcoded ORG_ID string literal (UUID pattern matching `[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}` excluded — only in comments documenting the synthetic seed UUID prefix is acceptable). |
| AC-E3-05 | After Tasks 2-5 apply, PII fence intact:<br>`grep -nE 'vendors:vendor_id \(id, name, address\)' src/app/financials/bills/\[id\]/page.tsx` → 1 hit<br>`grep -nE 'vendors:vendor_id.*(phone\|email)' src/app/financials/bills/\[id\]/page.tsx` → 0 hits |
| AC-E3-06 | After Tasks 2-5 apply, the post-wire page renders without runtime error when called against the synthetic seed. Verified at AC-E-10 via E-2's smoke harness: route `/financials/bills/33333333-3333-3333-3333-300000000001` returns HTTP 200 and DOM contains text matching `Smoke Vendor Alpha` (the seed's vendor_name_raw value — appears in the View's vendor name slot via the `vendor.name` embed, AND in the breadcrumb fallback path via `inv.invoice_number ?? inv.id`). |
| AC-E3-07 | After Tasks 2-5 apply, the 404 paths work correctly:<br>(a) `/financials/bills/inv-caldwell-001` (Caldwell string ID) returns HTTP 404 — Caldwell fixtures no longer resolve at this route post-F1 cutover.<br>(b) `/financials/bills/<arbitrary-non-existent-UUID>` returns HTTP 404 — `notFound()` triggers via `.maybeSingle()` returning null.<br>(c) Unauthenticated request returns HTTP 404 (or whatever the middleware-redirect contract is; the page-level defense `notFound()` triggers if middleware somehow allows through). Verified manually at GATE-N pre-ship or via spot-check curl in plan-review. |
| AC-E3-08 | After Tasks 2-5 apply, `npm run build` + `npx tsc --noEmit` pass with zero errors. Drummond grep gate (.githooks/pre-commit) silent on the committed diff. `git diff src/components/prototypes/InvoiceReviewView.tsx` returns empty (View untouched per Wave-E scope). `git diff src/app/design-system/_fixtures/drummond/` returns empty (fixtures untouched). `git diff src/app/financials/layout.tsx` returns empty (layout untouched). |
| AC-E3-09 | Verified at GATE-N pre-ship harness re-run via `wave-d-smoke.ts` (cumulative Wave-E AC-E-10; depends on E-2 seed re-apply). Smoke harness asserts the route `/financials/bills/33333333-3333-3333-3333-300000000001` returns HTTP 200 with rendered InvoiceReviewView (DOM contains the View's signature data-pattern-slot attributes: `[data-pattern-slot="file-preview"]`, `[data-pattern-slot="right-rail"]`, `[data-pattern-slot="audit-timeline"]`). Pre-E-3 baseline: HTTP 404 (Caldwell fixture lookup misses). Post-E-3 + E-2 seed re-apply: HTTP 200 with rendered View. |

---

## Verification commands

Run all in repo root after executor completes Tasks 2-5.

```bash
# 1. Fixture imports removed
grep -nE 'CALDWELL_INVOICES|CALDWELL_VENDORS|CALDWELL_JOBS|CALDWELL_COST_CODES' \
  src/app/financials/bills/\[id\]/page.tsx
# Expect: 0 hits.

# 2. Type-only Caldwell import retained
grep -nE '^import type.*CaldwellInvoice' \
  src/app/financials/bills/\[id\]/page.tsx
# Expect: 1 hit.

# 3. Supabase + auth imports + invocations
grep -cnE 'createServerClient|getCurrentMembership' \
  src/app/financials/bills/\[id\]/page.tsx
# Expect: 4 hits (2 imports + 2 invocations).

# 4. Async component
grep -nE 'export default async function BillReviewPage' \
  src/app/financials/bills/\[id\]/page.tsx
# Expect: 1 hit.

# 5. Narrowed vendor embed
grep -nE 'vendors:vendor_id \(id, name, address\)' \
  src/app/financials/bills/\[id\]/page.tsx
# Expect: 1 hit.

# 6. PII fence — no phone/email in vendor embed
grep -nE 'vendors:vendor_id.*(phone|email)' \
  src/app/financials/bills/\[id\]/page.tsx
# Expect: 0 hits.

# 7. Site Office wrap preserved
grep -nE 'data-direction="C" data-palette="B" className="design-system-scope"' \
  src/app/financials/bills/\[id\]/page.tsx
# Expect: 1 hit.

# 8. Build clean
npm run build
# Expect: 0 TypeScript errors.

# 9. tsc clean
npx tsc --noEmit
# Expect: 0 errors.

# 10. Drummond gate
.githooks/pre-commit
# Expect: silent.

# 11. Fixture file untouched
git diff src/app/design-system/_fixtures/drummond/
# Expect: empty diff.

# 12. View untouched
git diff src/components/prototypes/InvoiceReviewView.tsx
# Expect: empty diff.

# 13. financials/layout.tsx untouched
git diff src/app/financials/layout.tsx
# Expect: empty diff.

# 14. Smoke against Vercel preview (gated on E-2 seed re-apply + wave-d-smoke.ts existing)
#     AC-E3-09 is verified at GATE-N pre-ship harness run, NOT at E-3 execute completion.
#     If E-2 has shipped + seed has re-applied:
npx tsx scripts/wave-d-smoke.ts --preview-url <vercel-preview-url>
# Expect: /financials/bills/33333333-3333-3333-3333-300000000001 returns HTTP 200
# with DOM containing data-pattern-slot="file-preview" + "right-rail" + "audit-timeline".
# Pre-E-3 baseline: 404. Post-E-3 + E-2 seed re-apply: 200.
```

---

## Dependencies

- **After Wave-A** (cleanup applied 2026-05-12), **after Wave-C** (public.users retirement shipped 2026-05-13), **after Wave-D** (5 plans shipped including D-1 PostgREST refactor at src/app/api/invoices/[id]/route.ts). E-3's page query mirrors the API route's post-D-1 PostgREST pattern.
- **Coordinates with Plan E-1** — E-1 narrows the vendor embed on `src/app/api/invoices/[id]/route.ts:76` from `(id, name, phone, email, address)` to `(id, name, address)`. E-3's page query uses `(id, name, address)` on a DIFFERENT file (`src/app/financials/bills/[id]/page.tsx`). Disjoint files_modified — `parallel_execute_ok: true` with E-1 per Wave-E EXPANDED-SCOPE Sequencing block. If E-1 ships first, E-3 mirrors E-1's shape. If E-3 ships first, E-3's narrowing stands independently and matches what E-1 will later land on the API route.
- **Coordinates with Plan E-2** — E-2 fixes the smoke harness selectors + rewrites the seed with random password + re-applies the seed via Supabase MCP. E-3's AC-E3-09 (smoke PASS on /financials/bills/{synthetic-uuid}) requires E-2's seed re-apply to have run — the 5 synthetic invoices must exist in production fixture-harness-org for the route to resolve. Per Wave-E EXPANDED-SCOPE: E-2 executes FIRST (gates downstream smoke runs); E-1 + E-3 execute in parallel afterward. The orchestrator runs E-2's seed re-apply post-execute via Supabase MCP execute_sql.
- **Independent of any post-Wave-E close-out work** — D-### user-identity FK convention entry (per nwrp144 #2) is deferred to Wave-E close-out scope, not a dependency of E-3.
- **Before GATE-N** — E-3 commits without running Playwright; AC-E3-09 is verified at GATE-N pre-ship harness re-run against the Vercel preview URL.

---

## Rollback strategy

### Quick rollback (PR not yet merged)

`git revert <commit-sha>`. No DB state to recover; no migration to roll back. The page reverts to the Caldwell-fixture lookup state.

### Mid-flight rollback (PR shipped to main; needs to be reverted)

```bash
git revert <merge-commit-sha>
npm run build
# Expect: build passes (the revert restores src/app/financials/bills/[id]/page.tsx
# to pre-E-3 Caldwell-fixture state).
git push origin main
```

Post-revert verification:
- `/financials/bills/inv-caldwell-001` resolves (Caldwell fixtures back in play) — but `/financials/bills/33333333-...` returns 404 (the BLOCKING bug Wave-E was meant to fix is back). This is EXPECTED on revert; the revert is itself a known regression that ships only as an emergency fix.
- Plan E-2's smoke script will fail (AC-E-10) — expected on revert.

### Why no DB / migration component

E-3 is a pure source-code refactor of a single page file. No schema changes; no new RLS; no data migration. The only code artifact is the TypeScript-source diff for `src/app/financials/bills/[id]/page.tsx`. Revert = `git revert`. No PI1.1 (data-integrity) concern.

### What rollback does NOT cover

If E-2's seed re-apply has already executed (5 synthetic invoices exist in production fixture-harness-org), those invoices remain. Reverting E-3 only restores the page-side fixture lookup; it does not delete DB rows. The 5 synthetic invoices are RLS-isolated to fixture-harness-org so they pose no leak risk. If full cleanup is desired (e.g., before re-applying with different UUIDs), follow the Plan E-2 cleanup pattern from `.planning/qa-runs/wave-d/finding-2-remediation.md` (gitignored; local-only).

---

## Notes for plan-review

### Why the shim is the correct F1 trajectory, not a "v1"

The shim approach (construct CaldwellInvoice-shaped object from DB row + safe defaults) might READ as "v1-then-v2 scope reduction" — render a simpler version now, do it properly later. It is NOT.

**Why it's correct trajectory:**

1. **The View is locked-contract per Wave-E EXPANDED-SCOPE.** `InvoiceReviewView` accepts `CaldwellInvoice`-shaped props. Changing the View signature would (a) break the design-system playground prototype consumers that also pass CaldwellInvoice props, (b) require coordinated changes across multiple files, and (c) exceed E-3's "single file modified" scope per Wave-E EXPANDED-SCOPE.

2. **The synthetic seed is structurally sparse by design.** The seed exists to populate fixture-harness-org with enough invoice rows to test route resolution + DOM structure — NOT to populate AI-parse content. The synthetic seed's `ai_processed` / `pm_review` / `qa_review` / `in_draw` / `paid` status values are workflow-state assertions, not content assertions.

3. **Real Drummond / Caldwell invoices fill the gap.** Future invoice-upload pipelines (F2+ AI extraction; F4+ multi-modal ingestion per `.planning/architecture/INGESTION-ARCHITECTURE.md`) populate the sparse columns. The shim defaults remain in place; when real data arrives, the View renders with full fidelity WITHOUT any change to E-3's code.

4. **The alternative (change the View signature) would be the v1-then-v2 anti-pattern.** Adding nullable variants on every CaldwellInvoice field would either: (a) require null-checks everywhere in the View (degraded UX); or (b) require a separate "DBInvoice" type with its own renderer (parallel implementations to maintain). Neither is the F1 trajectory; the shim is.

### Why type-only `import type { CaldwellInvoice }` is acceptable

CLAUDE.md "Architecture Rules" sets the project's tenant-isolation + non-fixture-imports posture. Hook T10c (per `.claude/hooks/nightwork-post-edit.sh:194-230`) blocks RUNTIME imports of fixture files from production paths — but TypeScript `import type` is erased at compile time and does NOT pull in runtime values. The CaldwellInvoice type definition lives at `src/app/design-system/_fixtures/drummond/types.ts` (a pure type-only file with no runtime imports per its own header comment lines 4-7).

Importing the type for the shim's shape parameter is structurally equivalent to defining the same shape inline — the only difference is single-source-of-truth (the type lives next to its consumers in the design-system playground and the InvoiceReviewView).

**If plan-review pushes back:** the alternative is to define a local `BillInvoice` type alias mirroring CaldwellInvoice's shape in page.tsx. This would work mechanically but creates a second source-of-truth that drifts from the View's expected type. The current pattern (type-only import) is the cleanest.

### Why we 404 on missing vendor or job embed (vs render with placeholders)

The View's signature is non-nullable for vendor + job (`{ id: string; name: string }` not `{ id: string; name: string } | null`). If the FK points at a deleted row (vendor.deleted_at IS NOT NULL or job.deleted_at IS NOT NULL — embeds return null in that case after factoring soft-delete RLS), the View would crash on `vendor.name` / `job.name`.

`notFound()` is the correct posture: an invoice with a missing vendor or job is structurally broken; surfacing it to the user invites confusion. The 404 path also covers the synthetic seed's "no vendor_id" case (seed inserts NULL vendor_id) — this means the synthetic seed CURRENTLY would 404 with no further changes.

**Implication for AC-E3-06 + AC-E3-09:** the synthetic seed needs to be updated to include `vendor_id` references to the synthetic vendors that smoke-seed.sql Step 4 creates (or alternative: the page tolerates null vendor via a placeholder). **Per plan-author halt assessment: NEITHER halt condition is triggered** because E-2 (which executes BEFORE E-3 per sequencing) can update its seed to populate `vendor_id` as part of its scope — the seed rewrite is already in E-2's scope per Wave-E EXPANDED-SCOPE §Plan E-2 step 5. **Plan-review attention point: confirm with E-2 plan-author that their seed rewrite includes `vendor_id` populating the synthetic vendors created in Step 4 — if not, surface as a cross-plan coordination requirement.**

### Where the orphan vendor_id risk lives

Even if E-2 populates vendor_id in the synthetic seed, real Drummond invoices uploaded post-F1 may have null `vendor_id` during AI parsing (the AI extracts `vendor_name_raw` first; vendor matching is downstream). The 404-on-missing-vendor posture would block such invoices from review. **F1 follow-up:** consider a render path that uses `vendor_name_raw` directly when `vendor_id` is null (skipping the vendor embed for the View's vendor.name slot). NOT in E-3 scope; capture as TD-WE-XX if plan-review flags this.

### Why we don't query invoice_line_items (the relation table)

`public.invoice_line_items` (per migration 00013) is the RELATIONAL line-item table. The View accesses `inv.line_items` (the inline JSONB column on public.invoices). E-3 reads the inline JSONB for two reasons:

1. **Prototype-shape parity:** CaldwellInvoice's `line_items` field is structurally identical to public.invoices.line_items JSONB. Shim construction is trivial.
2. **Smoke harness scope:** the smoke harness validates DOM presence + 200 status — not line-item content correctness. The empty `line_items: []` default + the View's panel-hide-on-empty pattern correctly handles synthetic invoices.

F1-Wave-B or Wave 1.1 may swap to invoice_line_items joined fetch when invoice-upload pipelines populate the relational table; until then, the inline JSONB read is correct.

### What if `confidence_details` JSONB has a different shape than CaldwellInvoiceConfidenceDetails expects?

Real invoices parsed by Claude Vision populate `confidence_details` JSONB per the schema in CLAUDE.md "Invoice Parse Schema". The shape MATCHES CaldwellInvoiceConfidenceDetails (vendor_name, invoice_number, total_amount, job_reference, cost_code_suggestion). The cast `row.confidence_details as CaldwellInvoice["confidence_details"]` is structurally safe.

**Edge case:** if a future parser version adds a new field (e.g., `tax_amount`), the cast still works (TypeScript is structural — extra fields are tolerated). If a future parser version REMOVES a field, the View renders that key as `undefined` which would NPE on `(details[k] * 100).toFixed(0)`. **Mitigation:** the shim's safe-default object provides all 5 keys; only used when DB row's `confidence_details` is null. For non-null DB values, plan-review may want to wrap with a more defensive normalizer in F1-Wave-B.

### Smoke deferral if E-2 doesn't ship in time

If E-2 ships AFTER E-3 (against the EXPANDED-SCOPE sequencing), the smoke run will still 404 on `/financials/bills/33333333-...` because the 5 synthetic invoices don't exist in the seed yet. AC-E3-09 would be DEFERRED with a documented "E-2 must apply seed first" note. The orchestrator can choose to: (a) wait for E-2; or (b) ship E-3 + E-1 first, then E-2, then re-run smoke. Either order is functionally correct; only the smoke-PASS timestamp shifts.

E-3's code-level acceptance (AC-E3-01..08) does NOT depend on E-2 — those run locally against the page source. Only AC-E3-09 (smoke against Vercel preview) requires E-2's seed re-apply.

---

## Status updates (executor populates)

- [ ] Task 1 complete — pre-flight grep verified, 12-hit baseline matches, View signature unchanged, fixture file untouched pre-edit, Site Office wrap present pre-edit
- [ ] Task 2 complete — fixture imports removed; Supabase + auth imports added; async component; query with narrowed vendor embed; `notFound()` paths for unauthenticated / query error / no-row
- [ ] Task 3 complete — embed normalization; CaldwellInvoice-shaped shim constructed with safe defaults for sparse seed columns
- [ ] Task 4 complete — JSX return updated; Site Office wrap preserved; View prop names match
- [ ] Task 5 complete — file header comment updated to reflect E-3 post-wire state
- [ ] Task 6 complete — post-refactor verification passes (grep silent on fixture imports; Supabase/auth imports present; PII fence intact; Site Office wrap preserved; build + tsc clean; Drummond gate silent; sibling files untouched)
- [ ] AC-E3-01..08 verified locally
- [ ] AC-E3-09 verified at GATE-N pre-ship harness run via wave-d-smoke.ts (NOT at E-3 execute completion; depends on E-2 seed re-apply)
- [ ] Plan-review iter-1 verdict captured
- [ ] PR opened
- [ ] PR merged to main
