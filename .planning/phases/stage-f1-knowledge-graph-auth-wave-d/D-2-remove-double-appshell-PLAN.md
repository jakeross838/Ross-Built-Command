---
phase: stage-f1-knowledge-graph-auth-wave-d
plan: D-2
plan-name: remove-double-appshell
type: execute
wave: D
depends_on: []
autonomous: true
halt_after: false
threat_model_severity: low
status: not-started
authored: 2026-05-13
authored_by: gsd-planner (claude-opus-4-7[1m])
authorization: nwrp121 (Wave-D dispatch — Issue 2 fix: single AppShell across 6 financials/* surfaces)
requirements: []
source_decisions:
  - "Wave-D EXPANDED-SCOPE §Plan D-2 (.planning/expansions/stage-f1-knowledge-graph-auth-wave-d-EXPANDED-SCOPE.md lines 35-38) — Issue 2 pre-existing bug; double-AppShell stack on 6 financials/* thin-wrapper routes"
  - "stage-1.5c-IA commit 96484db (financials/layout.tsx introduction — fix(1.5c-ia): section overview pages persist NavBar via AppShell layout, UI FLAG-1)"
  - "stage-1.5c-IA Plan 4 thin-wrapper convention (re-export rather than re-implement; D-053) — financials/* wrappers carry the canonical /financials/* URL; underlying files unchanged"
  - "CONTEXT D-01 (Bills/Pay Apps terminology rename) + next.config.mjs:90-102 (permanent 308 redirects from legacy /invoices /draws paths to /financials/*) — direct visits to underlying files never reach render in production; underlying pages are ONLY rendered via thin-wrappers"
  - "nwrp120 diagnosis (Issues 1+2+3 + Rules 1-4) — Issue 2 root cause: financials/layout.tsx wraps children in <AppShell>; each underlying page ALSO wraps in <AppShell>; result is two NavBars + two sidebars in DOM"

files_modified:
  - src/app/invoices/page.tsx
  - src/app/invoices/qa/page.tsx
  - src/app/invoices/queue/page.tsx
  - src/app/invoices/liens/page.tsx
  - src/app/invoices/payments/page.tsx
  - src/app/draws/page.tsx

files_referenced:
  - src/app/financials/layout.tsx (the canonical wrapper post-1.5c — provides <AppShell> for all /financials/* children)
  - src/components/app-shell.tsx (renders <NavBar /> + conditional <JobSidebar />; outermost element is `<div className="min-h-screen flex flex-col">`)
  - src/components/nav-bar.tsx:280-283 (canonical NavBar DOM selector: `<header className="bg-nw-slate-deeper border-b ... sticky top-0 z-40">`)
  - src/components/job-sidebar.tsx:259 (canonical sidebar DOM selector: `<aside className="hidden md:flex flex-col w-[220px] ...">`)
  - src/app/financials/bills/page.tsx (thin re-export: `export { default } from "@/app/invoices/page"`)
  - src/app/financials/bills/qa/page.tsx (thin re-export: `export { default } from "@/app/invoices/qa/page"`)
  - src/app/financials/bills/queue/page.tsx (thin re-export: `export { default } from "@/app/invoices/queue/page"`)
  - src/app/financials/lien-releases/page.tsx (thin re-export: `export { default } from "@/app/invoices/liens/page"`)
  - src/app/financials/payments/page.tsx (thin re-export: `export { default } from "@/app/invoices/payments/page"`)
  - src/app/financials/pay-apps/page.tsx (thin re-export: `export { default } from "@/app/draws/page"`)
  - next.config.mjs:90-102 (308 permanent redirects from /invoices, /invoices/queue, /invoices/qa, /invoices/liens, /invoices/payments, /draws to /financials/* — confirms underlying files are ONLY rendered via /financials/* wrappers in production)
  - .planning/expansions/stage-f1-knowledge-graph-auth-wave-d-EXPANDED-SCOPE.md (Wave-D scope authoring source)
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-c/C-1-public-users-retirement-PLAN.md (sibling plan format reference — Wave-C single-plan pattern)

requires:
  - .planning/expansions/stage-f1-knowledge-graph-auth-wave-d-EXPANDED-SCOPE.md

provides:
  - "Double-AppShell stack eliminated on all 6 /financials/* thin-wrapper-routed surfaces (financials/bills, financials/bills/qa, financials/bills/queue, financials/lien-releases, financials/payments, financials/pay-apps)"
  - "financials/layout.tsx becomes the SOLE AppShell provider for the 6 affected routes (single NavBar + single sidebar in DOM)"
  - "6 underlying page files (invoices/page.tsx, invoices/qa/page.tsx, invoices/queue/page.tsx, invoices/liens/page.tsx, invoices/payments/page.tsx, draws/page.tsx) lose their direct <AppShell> import + wrap"
  - "Unused `import AppShell from \"@/components/app-shell\"` removed from each of the 6 underlying files (otherwise next.js build emits an unused-import warning; ESLint may flag it)"

affects:
  - "Production runtime rendering of /financials/bills (was double NavBar + double sidebar; becomes single)"
  - "Production runtime rendering of /financials/bills/qa (same)"
  - "Production runtime rendering of /financials/bills/queue (same — the original Wave-C smoke surface that surfaced this bug)"
  - "Production runtime rendering of /financials/lien-releases (same)"
  - "Production runtime rendering of /financials/payments (same)"
  - "Production runtime rendering of /financials/pay-apps (same)"
  - "Direct visits to /invoices, /invoices/*, /draws — 308-redirect to /financials/* per next.config.mjs:90-102, so the underlying files post-strip are never rendered without financials/layout.tsx in the chain (verified pre-flight; see §Blast radius)"
  - "NO behavior change on /invoices/[id]/page.tsx (NOT in scope; rendered via /financials/bills/[id] thin wrapper which uses InvoiceReviewView directly, not the [id]/page.tsx file). The double-AppShell concern on /invoices/[id]/page.tsx is independent and tracked separately."
  - "NO behavior change on /financials/aging/page.tsx + /financials/aging-report/page.tsx — these two files also wrap in <AppShell> directly under financials/ (so they ALSO have a double-shell concern) but are explicitly out of scope per nwrp121 Plan D-2 scope (6 files only). Flagged as Wave-D follow-up observation; see §Out-of-scope observations."

sequence:
  before: Plan D-4 (smoke test) — D-4's wave-d-smoke.ts script verifies single-NavBar/single-sidebar invariant against the post-D-2 build; ALSO before D-1 — D-2 dispatches FIRST so D-1's PostgREST hint refactor reads post-AppShell-strip file state on invoices/page.tsx + invoices/queue/page.tsx (per nwrp127 sequencing decision).
  after: D-5 (D-078 decision entry — already landed at c84b4a0). D-2 + D-1 must NOT execute in parallel despite EXPANDED-SCOPE §Execution order item 4's claim — files_modified overlap on 2 files (invoices/page.tsx, invoices/queue/page.tsx). Sequential D-2 → D-1 per nwrp127.
  parallel_authoring_ok: true (D-2 is independent of D-1's PostgREST + FK work)
  parallel_execute_ok: false  # Set false per nwrp127: shares files_modified entries with D-1 (invoices/page.tsx, invoices/queue/page.tsx). Sequential D-2 → D-1 dispatch.

acceptance-criteria-target: 6 falsifiable items (AC-D2-01..AC-D2-06); see §Acceptance criteria below

threat_model:
  trust_boundaries:
    - "Layout-composition boundary — Next.js App Router composes nested layouts top-down; financials/layout.tsx wraps all children. Underlying page files wrapped in <AppShell> stack a second AppShell INSIDE the first one. The threat is structural (double DOM render), not security; SOC2 / RLS / auth posture unaffected."
    - "Re-export indirection boundary — 6 financials/* thin wrappers re-export via `export { default } from \"@/app/invoices/...\"`. If a non-financials importer surfaces post-authoring, stripping AppShell from the underlying page would remove its NavBar everywhere. Pre-flight blast radius grep (§Blast radius) verified zero non-financials importers. Executor MUST re-run the grep before applying edits per AC-D2-01."

  threats:
    - id: T-D-2-01
      category: "T (Tampering — accidental NavBar removal from a non-thin-wrapper consumer)"
      component: "Re-export chain: src/app/financials/* → src/app/invoices/* + src/app/draws/page.tsx"
      disposition: "mitigate"
      mitigation: "Pre-flight blast radius grep (Task 1 Step A) enumerates ALL importers of the 6 underlying page files. Planner-time grep result: ONLY the 6 financials/* thin-wrappers (verbatim list in §Blast radius). If executor's grep returns ANY additional importer (e.g. a Wave-D-1 site adds a fresh import), HALT for Jake — non-thin-wrapper consumer would lose NavBar post-strip. The redirect map at next.config.mjs:90-102 confirms direct-URL visits to /invoices /draws all 308-redirect to /financials/* (so production never serves the underlying file without financials/layout.tsx in the chain)."
    - id: T-D-2-02
      category: "T (Tampering — incomplete refactor: AppShell wrap removed but import not removed)"
      component: "Each of the 6 underlying page files post-strip"
      disposition: "mitigate"
      mitigation: "Task 2-7 explicitly removes BOTH the <AppShell>...</AppShell> wrap AND the `import AppShell from \"@/components/app-shell\"` line. Next.js / TypeScript / ESLint will emit unused-import warnings if the import remains; the build may still pass but the warning surfaces in CI logs. AC-D2-02 + AC-D2-03 verify both via grep — `grep -n '<AppShell>' <file>` and `grep -n 'app-shell' <file>` must both return 0 hits per file post-refactor."
    - id: T-D-2-03
      category: "T (Tampering — Fragment-vs-element return value change breaks consumer expectations)"
      component: "Each page's top-level JSX return"
      disposition: "accept"
      mitigation: "Current return shape: `<AppShell><main>...</main></AppShell>`. Post-strip: `<main>...</main>` (a single React element — same render-output discipline). No Fragment needed for any of the 6 files because each AppShell wraps a single child (a `<main>` element). The post-strip return is a single React element; React + Next.js accept this without Fragment. Verified by inspecting each file (see §Per-file edits — every <AppShell> immediately wraps a single <main>). If executor encounters a file where AppShell wraps multiple sibling elements (unexpected; pre-flight inspection confirms it does not), executor MUST wrap the siblings in `<>...</>` Fragment and document in SUMMARY."
    - id: T-D-2-04
      category: "D (Denial of Service — direct-URL visits to /invoices/* /draws lose NavBar)"
      component: "Legacy URL paths /invoices, /invoices/queue, /invoices/qa, /invoices/liens, /invoices/payments, /draws"
      disposition: "accept"
      mitigation: "next.config.mjs:90-102 308-redirects all 6 legacy paths to /financials/* in production. Direct visits to the underlying page files never render in the Next.js production runtime (the redirect intercepts the request before render). If a developer reaches the underlying file via dev-mode HMR navigation or via /invoices, the redirect still applies (308 redirects fire at both dev + prod). Accept: no production user can hit the underlying file directly; if any developer-mode regression surfaces, Plan D-4's smoke script catches it via Vercel preview URL assertion (D-4 hits the canonical /financials/* paths, not the legacy /invoices/* paths)."

must_haves:
  truths:
    - "After D-2 merges, `grep -rn '<AppShell>' src/app/invoices/ src/app/draws/page.tsx` returns 0 hits"
    - "After D-2 merges, `grep -rn 'import AppShell' src/app/invoices/page.tsx src/app/invoices/qa/page.tsx src/app/invoices/queue/page.tsx src/app/invoices/liens/page.tsx src/app/invoices/payments/page.tsx src/app/draws/page.tsx` returns 0 hits"
    - "After D-2 merges, `npm run build` passes with zero TypeScript errors"
    - "After D-2 merges, `npx tsc --noEmit` passes with zero errors"
    - "After D-2 merges, /financials/bills page DOM contains exactly 1 `<header>` element with class containing `bg-nw-slate-deeper` (the canonical NavBar selector — see §DOM selector reference)"
    - "After D-2 merges, /financials/bills page DOM contains exactly 1 `<aside>` element with class containing `w-[220px]` (the canonical sidebar selector — see §DOM selector reference)"
    - "After D-2 merges, same single-NavBar/single-sidebar invariant holds for /financials/bills/qa, /financials/bills/queue, /financials/lien-releases, /financials/payments, /financials/pay-apps"
    - "After D-2 merges, the visual content of each /financials/* page (main body, tables, filters) renders identically to pre-strip behavior — page content is NOT blank; the <main> element is still rendered, just no longer double-wrapped"
    - "Drummond grep gate (.githooks/pre-commit) silent on the committed diff"
    - "financials/layout.tsx UNCHANGED — remains the canonical AppShell wrapper post-D-2"

  artifacts:
    - path: "src/app/invoices/page.tsx"
      provides: "Invoices list page WITHOUT direct <AppShell> wrap. <main> is the top-level returned element. Re-exported via /financials/bills which wraps in financials/layout.tsx's AppShell."
      not_contains: "<AppShell>"
      not_contains_also: "import AppShell from \"@/components/app-shell\""
      contains: "<main"

    - path: "src/app/invoices/qa/page.tsx"
      provides: "Invoices QA page WITHOUT direct <AppShell> wrap. Re-exported via /financials/bills/qa."
      not_contains: "<AppShell>"
      not_contains_also: "import AppShell"
      contains: "<main"

    - path: "src/app/invoices/queue/page.tsx"
      provides: "Invoices review queue WITHOUT direct <AppShell> wrap. Re-exported via /financials/bills/queue. THIS is the surface that originally surfaced the bug in Wave-C smoke."
      not_contains: "<AppShell>"
      not_contains_also: "import AppShell"
      contains: "<main"

    - path: "src/app/invoices/liens/page.tsx"
      provides: "Lien Releases page WITHOUT direct <AppShell> wrap. Re-exported via /financials/lien-releases."
      not_contains: "<AppShell>"
      not_contains_also: "import AppShell"
      contains: "<main"

    - path: "src/app/invoices/payments/page.tsx"
      provides: "Payments tracking page WITHOUT direct <AppShell> wrap. Re-exported via /financials/payments."
      not_contains: "<AppShell>"
      not_contains_also: "import AppShell"
      contains: "<main"

    - path: "src/app/draws/page.tsx"
      provides: "Pay Apps list page WITHOUT direct <AppShell> wrap. Re-exported via /financials/pay-apps."
      not_contains: "<AppShell>"
      not_contains_also: "import AppShell"
      contains: "<main"

  key_links:
    - from: "src/app/financials/layout.tsx"
      to: "AppShell (the canonical wrapper post-D-2 for all 6 routes)"
      via: "<AppShell>{children}</AppShell>"
      pattern: "<AppShell>\\{children\\}</AppShell>"

    - from: "src/app/financials/bills/page.tsx → src/app/invoices/page.tsx"
      to: "Re-export rendered inside financials/layout.tsx's AppShell"
      via: "export { default } from \"@/app/invoices/page\""
      pattern: "export \\{ default \\} from \"@/app/invoices/page\""

    - from: "src/app/financials/bills/qa/page.tsx → src/app/invoices/qa/page.tsx"
      to: "Re-export rendered inside financials/layout.tsx's AppShell"
      via: "export { default } from \"@/app/invoices/qa/page\""
      pattern: "export \\{ default \\} from \"@/app/invoices/qa/page\""

    - from: "src/app/financials/bills/queue/page.tsx → src/app/invoices/queue/page.tsx"
      to: "Re-export rendered inside financials/layout.tsx's AppShell"
      via: "export { default } from \"@/app/invoices/queue/page\""
      pattern: "export \\{ default \\} from \"@/app/invoices/queue/page\""

    - from: "src/app/financials/lien-releases/page.tsx → src/app/invoices/liens/page.tsx"
      to: "Re-export rendered inside financials/layout.tsx's AppShell"
      via: "export { default } from \"@/app/invoices/liens/page\""
      pattern: "export \\{ default \\} from \"@/app/invoices/liens/page\""

    - from: "src/app/financials/payments/page.tsx → src/app/invoices/payments/page.tsx"
      to: "Re-export rendered inside financials/layout.tsx's AppShell"
      via: "export { default } from \"@/app/invoices/payments/page\""
      pattern: "export \\{ default \\} from \"@/app/invoices/payments/page\""

    - from: "src/app/financials/pay-apps/page.tsx → src/app/draws/page.tsx"
      to: "Re-export rendered inside financials/layout.tsx's AppShell"
      via: "export { default } from \"@/app/draws/page\""
      pattern: "export \\{ default \\} from \"@/app/draws/page\""
---

# D-2 — Remove double-AppShell wrapping from 6 financials/* thin-wrapper-routed surfaces

## Goal

Eliminate the double-AppShell stack on the 6 `/financials/*` thin-wrapper routes by stripping the inner `<AppShell>` wrap from the 6 underlying page files. After D-2, `financials/layout.tsx` (commit `96484db`) is the SOLE AppShell provider for these 6 routes — DOM contains exactly one NavBar + one sidebar per page render. `financials/layout.tsx` is unchanged; the thin-wrapper convention from stage-1.5c-IA Plan 4 is preserved.

## Source decisions (verbatim from authoritative sources)

> **Wave-D EXPANDED-SCOPE §Plan D-2** — "Remove `<AppShell>` from 6 page files: `invoices/page.tsx`, `invoices/qa/page.tsx`, `invoices/queue/page.tsx`, `invoices/liens/page.tsx`, `invoices/payments/page.tsx`, `draws/page.tsx`. `financials/layout.tsx` remains canonical wrapper per D-053 thin-wrapper principle. Blast radius confirmed: Only 6 financials/* thin-wrappers re-export these files. No other importers. Safe."
>
> (`.planning/expansions/stage-f1-knowledge-graph-auth-wave-d-EXPANDED-SCOPE.md` lines 35-38)

> **financials/layout.tsx header comment** — "Financials section layout — wraps children in AppShell so NavBar persists across /financials/* navigation. Per /nightwork-qa 2026-05-11 UI FLAG-1."
>
> (`src/app/financials/layout.tsx` lines 1-15; commit `96484db` "fix(1.5c-ia): section overview pages persist NavBar via AppShell layout (UI FLAG-1)")

> **next.config.mjs:90-102** — "/invoices → /financials/bills (Bills terminology rename per D-01); permanent: true (308) redirect." Same pattern for /invoices/queue, /invoices/qa, /invoices/payments, /invoices/liens, /invoices/:id, /draws, /draws/:id, /draws/:id/print.
>
> (`next.config.mjs` lines 90-102; D-01 / CONTEXT.md Bills/Pay Apps terminology rename)

---

## Pre-flight grep (REQUIRED at execute start)

Executor MUST run BEFORE editing any file.

### Step A — AppShell tag enumeration on the 6 files

```bash
grep -rn '<AppShell>\|</AppShell>\|import AppShell' src/app/invoices/page.tsx src/app/invoices/qa/page.tsx src/app/invoices/queue/page.tsx src/app/invoices/liens/page.tsx src/app/invoices/payments/page.tsx src/app/draws/page.tsx
```

**Planner-time grep result (2026-05-13, against current main):**

```
src/app/invoices/page.tsx:8:import AppShell from "@/components/app-shell";
src/app/invoices/page.tsx:397: <AppShell>
src/app/invoices/page.tsx:849: </AppShell>
src/app/invoices/qa/page.tsx:6:import AppShell from "@/components/app-shell";
src/app/invoices/qa/page.tsx:54: <AppShell>
src/app/invoices/qa/page.tsx:158: </AppShell>
src/app/invoices/queue/page.tsx:6:import AppShell from "@/components/app-shell";
src/app/invoices/queue/page.tsx:723: <AppShell>
src/app/invoices/queue/page.tsx:1573: </AppShell>
src/app/invoices/liens/page.tsx:6:import AppShell from "@/components/app-shell";
src/app/invoices/liens/page.tsx:217:    <AppShell>
src/app/invoices/liens/page.tsx:452:    </AppShell>
src/app/invoices/payments/page.tsx:7:import AppShell from "@/components/app-shell";
src/app/invoices/payments/page.tsx:191:    <AppShell>
src/app/invoices/payments/page.tsx:508:    </AppShell>
src/app/draws/page.tsx:5:import AppShell from "@/components/app-shell";
src/app/draws/page.tsx:58: <AppShell>
src/app/draws/page.tsx:162: </AppShell>
```

**Result: 18 hits across 6 files (3 per file — 1 import + 1 open tag + 1 close tag).**

Note re: line-number divergence from the prompt:
- Prompt mentions "line 723 AppShell open" for `invoices/page.tsx` — that's actually the line for `invoices/queue/page.tsx`. The `invoices/page.tsx` open is at line 397. Planner-confirmed via re-grep at planner-time. Executor MUST trust the grep output, not the prompt's line-number guidance.
- Prompt mentions "line ~1573 close" for `invoices/queue/page.tsx` — confirmed exact at planner-time.

If executor's grep returns:
- A different file in the 6 (e.g. a 7th file surfaces) → HALT for Jake
- Fewer hits per file (e.g. an AppShell open with no matching close) → HALT for Jake; structural drift indicates a hand-edit since planner-time
- More than 3 hits per file (e.g. nested AppShell or multiple imports) → HALT for Jake

### Step B — Blast radius re-verification

```bash
grep -rnE 'from\s*\(?\s*["'\''][^"'\'']*(@/app/invoices/(page|qa/page|queue/page|liens/page|payments/page)|@/app/draws/page)' src/ --include="*.ts" --include="*.tsx"
```

**Planner-time grep result (2026-05-13, against current main):**

```
src/app/financials/bills/page.tsx:26:export { default } from "@/app/invoices/page";
src/app/financials/bills/qa/page.tsx:13:export { default } from "@/app/invoices/qa/page";
src/app/financials/bills/queue/page.tsx:15:export { default } from "@/app/invoices/queue/page";
src/app/financials/lien-releases/page.tsx:15:export { default } from "@/app/invoices/lien-releases" → resolves to src/app/financials/lien-releases/page.tsx which re-exports "@/app/invoices/liens/page"
src/app/financials/payments/page.tsx:13:export { default } from "@/app/invoices/payments/page";
src/app/financials/pay-apps/page.tsx:22:export { default } from "@/app/draws/page";
```

**Result: 6 importers — all are the 6 financials/* thin-wrappers. Zero non-financials importers. Safe to strip AppShell from the underlying files.**

If executor's grep returns ANY additional importer (e.g. a Wave-D-1 site adds a fresh import that consumes one of these underlying files outside the financials/* tree), HALT for Jake — a non-thin-wrapper consumer would lose NavBar post-strip.

### Step C — financials/layout.tsx unchanged confirmation

```bash
grep -n 'AppShell' src/app/financials/layout.tsx
```

**Planner-time grep result:**

```
src/app/financials/layout.tsx:3:// Financials section layout — wraps children in AppShell so NavBar
src/app/financials/layout.tsx:7:import AppShell from "@/components/app-shell";
src/app/financials/layout.tsx:14:  return <AppShell>{children}</AppShell>;
```

**This file is NOT modified by D-2.** Executor MUST verify this file is unchanged post-refactor (`git diff src/app/financials/layout.tsx` returns empty). It is the canonical wrapper that picks up the slack after the underlying files' AppShells are removed.

### Step D — /invoices/[id]/page.tsx NOT in scope confirmation

```bash
grep -n 'AppShell' src/app/invoices/\[id\]/page.tsx
```

**Planner-time grep result:**

```
src/app/invoices/[id]/page.tsx:8:import AppShell from "@/components/app-shell";
src/app/invoices/[id]/page.tsx:610: <AppShell>
src/app/invoices/[id]/page.tsx:628: </AppShell>
src/app/invoices/[id]/page.tsx:900: <AppShell>
src/app/invoices/[id]/page.tsx:2147: </AppShell>
```

`/invoices/[id]/page.tsx` ALSO has AppShell wraps (and even 2 instances). This file is **explicitly NOT in scope for D-2.** Rationale:

- The thin wrapper at `/financials/bills/[id]/page.tsx` does NOT re-export from `/invoices/[id]/page.tsx`. Instead, it renders `InvoiceReviewView` from `src/components/prototypes/` directly with fixtures (see `src/app/financials/bills/[id]/page.tsx` lines 25-61). So `/invoices/[id]/page.tsx` is currently dead code on the `/financials/bills/[id]` path — its double-AppShell does not affect the production /financials/* surface.
- A direct visit to `/invoices/[id]` 308-redirects to `/financials/bills/[id]` via `next.config.mjs:97`, which routes to the thin wrapper (the InvoiceReviewView path), not back to `/invoices/[id]/page.tsx`.
- The double-shell concern on `/invoices/[id]/page.tsx` exists but is independent of Plan D-2's 6-file scope. Track as Wave-D follow-up if developer reaches the file via legacy-route HMR; otherwise resolves in F1 when the [id] surface gets its full real-data wiring.

Per nwrp121 + the prompt's "CRITICAL: scope discipline" directive, D-2 does NOT touch this file.

---

## DOM selector reference (for smoke verification — referenced by Plan D-4 and AC-D2-05/06)

Smoke verification needs canonical selectors to count NavBar + sidebar occurrences in the rendered DOM.

### NavBar selector

From `src/components/nav-bar.tsx:280-283`:

```jsx
<header
  ref={menuRef}
  className="bg-nw-slate-deeper border-b border-[rgba(247,245,236,0.08)] sticky top-0 z-40"
>
```

Canonical selector: **`header.bg-nw-slate-deeper`**

Alternative equivalent selectors (Plan D-4's wave-d-smoke.ts script may use either):
- `header[class*="bg-nw-slate-deeper"]` — partial-class match (matches all class-list orderings)
- `header.sticky.top-0.z-40` — sticky-positioned outer header (avoids token-name coupling)

**Recommendation: use `header.bg-nw-slate-deeper` as the primary selector** — it's the most stable across Tailwind class-ordering shuffles and the most semantic.

Page.locator pattern for Playwright (D-4 reference):
```typescript
const navBars = await page.locator('header.bg-nw-slate-deeper').count();
// Pre-D-2: navBars === 2 (double-shell bug). Post-D-2: navBars === 1.
```

### Sidebar selector

From `src/components/job-sidebar.tsx:259`:

```jsx
<aside className="hidden md:flex flex-col w-[220px] shrink-0 border-r border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden">
```

Canonical selector: **`aside.w-\[220px\]`** (the `w-[220px]` bracket-value utility is the unique width-token signature)

Alternative equivalent selectors:
- `aside[class*="w-\\[220px\\]"]` — bracket-value class search
- `aside.shrink-0[class*="border-r"]` — semantic posture (sidebar = a fixed-width shrink-0 column with right border)

**Recommendation: use `aside.w-\[220px\]` as the primary selector** in Playwright. The bracket-value class name in Tailwind requires escaping the brackets:

```typescript
const sidebars = await page.locator('aside.w-\\[220px\\]').count();
// Pre-D-2: sidebars === 2 (double-shell). Post-D-2: sidebars === 1.
// CAVEAT: the sidebar is `hidden md:flex` — only renders at viewport >= md (768px+).
// On mobile viewport tests the count is 0 in both pre- and post-D-2 states (no regression risk;
// mobile uses the drawer overlay, not the persistent sidebar). Plan D-4 smoke script runs at
// desktop viewport (1440x900) per Vercel preview standard, so this caveat does not affect AC-D2-06.
```

### AppShell-internal sidebar gating note

`src/components/app-shell.tsx:12-25` enumerates `NO_SIDEBAR` paths (regex list). Of D-2's 6 target routes:

| Underlying path | NO_SIDEBAR match | Sidebar renders? |
|---|---|---|
| `/invoices` (rewritten to /financials/bills) | NO match | YES |
| `/invoices/qa` (→ /financials/bills/qa) | NO match | YES |
| `/invoices/queue` (→ /financials/bills/queue) | NO match | YES |
| `/invoices/liens` (→ /financials/lien-releases) | NO match | YES |
| `/invoices/payments` (→ /financials/payments) | NO match | YES |
| `/draws` (→ /financials/pay-apps) | NO match | YES |

All 6 routes render sidebar at desktop viewport. (The `/^\/invoices\/[a-f0-9-]+/` and `/^\/draws\/[a-f0-9-]+/` patterns in NO_SIDEBAR target the detail drill-down paths — not D-2 scope.)

So post-D-2: each of 6 routes has exactly 1 `<header>` + 1 `<aside>` (at desktop viewport). Pre-D-2: each had 2 of each.

---

## Out-of-scope observations (NOT applied by D-2)

These were surfaced during planner-time pre-flight inspection but are explicitly out of scope per the prompt's scope-discipline directive:

### `/financials/aging/page.tsx` + `/financials/aging-report/page.tsx` — additional double-AppShell sites

Both files exist directly under `src/app/financials/` (not as thin wrappers re-exporting from elsewhere). They wrap their own content in `<AppShell>` directly, which composes inside `financials/layout.tsx`'s AppShell — same double-shell pathology as the 6 D-2 targets, but on different routes.

Planner-time grep:
```
src/app/financials/aging/page.tsx:16:import AppShell from "@/components/app-shell";
src/app/financials/aging/page.tsx:21:    <AppShell>
src/app/financials/aging/page.tsx:46:    </AppShell>
src/app/financials/aging-report/page.tsx:4:import AppShell from "@/components/app-shell";
src/app/financials/aging-report/page.tsx:9:    <AppShell>
src/app/financials/aging-report/page.tsx:34:    </AppShell>
```

Per nwrp121 the D-2 scope is "6 files only" (invoices/* x 5 + draws/page.tsx). These aging routes are not in the smoke packet's tested set.

**Disposition:** flag in SUMMARY.md as a Wave-D follow-up observation; recommend a single-line PR after Wave-D ships that strips AppShell from both aging files (same pattern as D-2 tasks below). Do NOT include in D-2's committed diff.

### `/invoices/[id]/page.tsx` — double-AppShell with TWO instances of AppShell wrap

The detail page has TWO separate AppShell-wrapped return paths (lines 610-628 + 900-2147) — likely two conditional rendering branches. This file is in dead-code state per the /financials/bills/[id] thin wrapper using InvoiceReviewView directly (see §Pre-flight Step D).

**Disposition:** Independent of D-2. Track for F1 when /financials/bills/[id] gets real-data wiring (at which point /invoices/[id]/page.tsx either becomes the source-of-truth and gets refactored to remove AppShell, OR gets deleted entirely).

---

## Implementation tasks

Each of Tasks 2-7 follows the same pattern: open file, remove `import AppShell` line, remove the `<AppShell>` open + matching `</AppShell>` close tags, leaving the inner `<main>` element as the top-level return.

Because each underlying AppShell wraps exactly one `<main>` child (verified at planner-time across all 6 files), the post-strip return is a single React element — no Fragment `<>...</>` is required.

### Task 1 — Pre-flight verification (REQUIRED before any edits)

**Path:** N/A (verification only)

**Action:** Executor MUST complete all 4 steps from §Pre-flight grep above before editing files.

- Step A: AppShell tag enumeration on 6 files — must match planner-time output (18 hits, 3 per file)
- Step B: Blast radius — must return exactly 6 importers, all financials/*
- Step C: financials/layout.tsx untouched confirmation (will remain so post-D-2)
- Step D: /invoices/[id]/page.tsx scope-exclusion confirmation

Document outputs in SUMMARY.md before proceeding.

If ANY divergence from planner-time grep results, HALT for Jake.

### Task 2 — Strip AppShell from `src/app/invoices/page.tsx`

**Path:** `src/app/invoices/page.tsx`

**Current state (3 hits — verified at planner-time 2026-05-13):**

```typescript
// Line 8 (import statement):
import AppShell from "@/components/app-shell";

// Line 397 (opening tag, inside the component return):
  return (
    <AppShell>
      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-8">
        <FinancialViewTabs active="invoices" />
        ...

// Line 849 (closing tag, end of return):
      </main>
      <InvoiceUploadModal ... />
      <InvoiceImportModal ... />
    </AppShell>
  );
}
```

Note: the AppShell at line 397 wraps both a `<main>` AND two modal components (`<InvoiceUploadModal>` + `<InvoiceImportModal>` at lines 837-848). Post-strip these become siblings of `<main>`, so we DO need a Fragment wrap here (multiple top-level children).

**Action:**

1. Remove line 8: `import AppShell from "@/components/app-shell";`
2. Replace lines 397-398 (`<AppShell>` open) with `<>` Fragment open
3. Replace line 849 (`</AppShell>` close) with `</>` Fragment close

**Diff preview:**

```diff
// Line 8 (import):
- import AppShell from "@/components/app-shell";
  import FinancialViewTabs from "@/components/financial-view-tabs";

// Lines 396-398:
  return (
-   <AppShell>
+   <>
      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-8">

// Line 849:
        }} />
-    </AppShell>
+    </>
   );
 }
```

**Why Fragment, not bare <main>:** lines 837-848 in the current file have the two modals as siblings of `<main>` (all under `<AppShell>`):

```typescript
      </main>
      <InvoiceUploadModal open={uploadOpen} onClose={() => { ... }} />
      <InvoiceImportModal open={importOpen} onClose={() => { ... }} />
    </AppShell>
```

After strip the return has 3 top-level siblings (`<main>` + 2 modals). React requires either a Fragment or an array; Fragment is cleaner.

**Verify:**
- `grep -n '<AppShell>\|</AppShell>\|import AppShell' src/app/invoices/page.tsx` → 0 hits
- `grep -n 'app-shell' src/app/invoices/page.tsx` → 0 hits
- `grep -n '^  return (\|^    <>' src/app/invoices/page.tsx | head -3` → confirms Fragment-open immediately follows the `return (` line

### Task 3 — Strip AppShell from `src/app/invoices/qa/page.tsx`

**Path:** `src/app/invoices/qa/page.tsx`

**Current state (3 hits — verified at planner-time 2026-05-13):**

```typescript
// Line 6 (import):
import AppShell from "@/components/app-shell";

// Line 54 (opening tag):
  return (
    <AppShell>
      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <FinancialViewTabs active="qa" />
        ...

// Line 158 (closing tag):
        </div>
      )}
    </main>
   </AppShell>
  );
}
```

Note: AppShell wraps EXACTLY ONE child (the `<main>` from line 55 to line 157). Post-strip the return is a single React element — no Fragment needed.

**Action:**

1. Remove line 6: `import AppShell from "@/components/app-shell";`
2. Remove line 54: `    <AppShell>`
3. Remove line 158: `    </AppShell>`

**Diff preview:**

```diff
// Line 6 (import):
- import AppShell from "@/components/app-shell";
  import FinancialViewTabs from "@/components/financial-view-tabs";

// Lines 53-55:
  return (
-   <AppShell>
      <main className="max-w-[1600px] mx-auto px-6 py-8">

// Lines 157-159:
      )}
     </main>
-   </AppShell>
   );
 }
```

**Verify:**
- `grep -n '<AppShell>\|</AppShell>\|import AppShell' src/app/invoices/qa/page.tsx` → 0 hits

### Task 4 — Strip AppShell from `src/app/invoices/queue/page.tsx`

**Path:** `src/app/invoices/queue/page.tsx` (THIS is the surface that originally surfaced the bug in Wave-C smoke per nwrp120)

**Current state (3 hits — verified at planner-time 2026-05-13):**

```typescript
// Line 6 (import):
import AppShell from "@/components/app-shell";

// Lines 722-725 (opening tag):
  return (
    <AppShell>

      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-8">

// Lines 1572-1574 (closing tag):
       )}
     </main>
   </AppShell>
  );
}
```

Note: AppShell wraps EXACTLY ONE child (the `<main>` from line 725 to line 1572 — there's a blank line at 724 inside AppShell before `<main>`). Post-strip the return is a single React element — no Fragment needed. The blank line at 724 should be removed alongside the open tag to keep the diff tidy.

**Action:**

1. Remove line 6: `import AppShell from "@/components/app-shell";`
2. Remove lines 723-724: `    <AppShell>` + blank line
3. Remove line 1573: `    </AppShell>`

**Diff preview:**

```diff
// Line 6 (import):
- import AppShell from "@/components/app-shell";
  import FinancialViewTabs from "@/components/financial-view-tabs";

// Lines 722-725:
  return (
-   <AppShell>
-
      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-8">

// Lines 1572-1574:
       )}
     </main>
-   </AppShell>
   );
 }
```

**Verify:**
- `grep -n '<AppShell>\|</AppShell>\|import AppShell' src/app/invoices/queue/page.tsx` → 0 hits

### Task 5 — Strip AppShell from `src/app/invoices/liens/page.tsx`

**Path:** `src/app/invoices/liens/page.tsx`

**Current state (3 hits — verified at planner-time 2026-05-13):**

```typescript
// Line 6 (import):
import AppShell from "@/components/app-shell";

// Lines 216-218 (opening tag):
  return (
    <AppShell>
      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-8">

// Lines 451-453 (closing tag):
        )}
      </main>
    </AppShell>
  );
}
```

Note: AppShell wraps EXACTLY ONE child (the `<main>`). Post-strip the return is a single React element — no Fragment needed.

**Action:**

1. Remove line 6: `import AppShell from "@/components/app-shell";`
2. Remove line 217: `    <AppShell>`
3. Remove line 452: `    </AppShell>`

**Diff preview:**

```diff
// Line 6 (import):
- import AppShell from "@/components/app-shell";
  import FinancialViewTabs from "@/components/financial-view-tabs";

// Lines 216-218:
  return (
-   <AppShell>
      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-8">

// Lines 451-453:
        )}
      </main>
-   </AppShell>
   );
 }
```

**Verify:**
- `grep -n '<AppShell>\|</AppShell>\|import AppShell' src/app/invoices/liens/page.tsx` → 0 hits

### Task 6 — Strip AppShell from `src/app/invoices/payments/page.tsx`

**Path:** `src/app/invoices/payments/page.tsx`

**Current state (3 hits — verified at planner-time 2026-05-13):**

```typescript
// Line 7 (import):
import AppShell from "@/components/app-shell";

// Lines 190-192 (opening tag):
  return (
    <AppShell>
      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-8">

// Lines 507-509 (closing tag):
        )}
      </main>
    </AppShell>
  );
}
```

Note: AppShell wraps EXACTLY ONE child (the `<main>`). Post-strip the return is a single React element — no Fragment needed.

**Action:**

1. Remove line 7: `import AppShell from "@/components/app-shell";`
2. Remove line 191: `    <AppShell>`
3. Remove line 508: `    </AppShell>`

**Diff preview:**

```diff
// Line 7 (import):
- import AppShell from "@/components/app-shell";
  import FinancialViewTabs from "@/components/financial-view-tabs";

// Lines 190-192:
  return (
-   <AppShell>
      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-8">

// Lines 507-509:
        )}
      </main>
-   </AppShell>
   );
 }
```

**Verify:**
- `grep -n '<AppShell>\|</AppShell>\|import AppShell' src/app/invoices/payments/page.tsx` → 0 hits

### Task 7 — Strip AppShell from `src/app/draws/page.tsx`

**Path:** `src/app/draws/page.tsx`

**Current state (3 hits — verified at planner-time 2026-05-13):**

```typescript
// Line 5 (import):
import AppShell from "@/components/app-shell";

// Lines 57-59 (opening tag):
  return (
    <AppShell>
      <main className="max-w-[1600px] mx-auto px-6 py-8">

// Lines 161-163 (closing tag):
       )}
     </main>
   </AppShell>
  );
}
```

Note: AppShell wraps EXACTLY ONE child (the `<main>`). Post-strip the return is a single React element — no Fragment needed.

**Action:**

1. Remove line 5: `import AppShell from "@/components/app-shell";`
2. Remove line 58: `   <AppShell>`
3. Remove line 162: `   </AppShell>`

**Diff preview:**

```diff
// Line 5 (import):
- import AppShell from "@/components/app-shell";
  import FinancialViewTabs from "@/components/financial-view-tabs";

// Lines 57-59:
  return (
-   <AppShell>
      <main className="max-w-[1600px] mx-auto px-6 py-8">

// Lines 161-163:
       )}
     </main>
-   </AppShell>
   );
 }
```

**Verify:**
- `grep -n '<AppShell>\|</AppShell>\|import AppShell' src/app/draws/page.tsx` → 0 hits

### Task 8 — Post-refactor verification

**Path:** N/A (verification only)

**Action:** After Tasks 2-7 land, run:

```bash
# 1. Zero AppShell tag matches across all 6 files
grep -rn '<AppShell>' src/app/invoices/ src/app/draws/page.tsx
# Expect: 0 hits across the 6 target files
# CAVEAT: src/app/invoices/[id]/page.tsx still has AppShell wraps (out of D-2 scope per Step D).
# This grep MUST exclude /invoices/[id]/page.tsx — use the explicit file list per AC-D2-02.

# More targeted: exact 6 files
grep -n '<AppShell>\|</AppShell>\|import AppShell' \
  src/app/invoices/page.tsx \
  src/app/invoices/qa/page.tsx \
  src/app/invoices/queue/page.tsx \
  src/app/invoices/liens/page.tsx \
  src/app/invoices/payments/page.tsx \
  src/app/draws/page.tsx
# Expect: 0 hits.

# 2. financials/layout.tsx unchanged
git diff src/app/financials/layout.tsx
# Expect: empty diff (the canonical wrapper is preserved).

# 3. TypeScript clean
npx tsc --noEmit
# Expect: 0 errors. Unused-import warning surfaces here if Task 2-7 removed open/close
# but missed the import line; AC-D2-03 catches.

# 4. Next.js build clean
npm run build
# Expect: success, no warnings about unused imports of AppShell across the 6 files.

# 5. Drummond gate
.githooks/pre-commit
# (Auto-runs on commit; silent diff expected per AC-D2-04.)
```

If any of the above fails, HALT for Jake.

---

## Acceptance criteria

| ID | Acceptance criterion |
|---|---|
| AC-D2-01 | Pre-flight grep at execute start (`grep -rn '<AppShell>\|</AppShell>\|import AppShell' src/app/invoices/page.tsx src/app/invoices/qa/page.tsx src/app/invoices/queue/page.tsx src/app/invoices/liens/page.tsx src/app/invoices/payments/page.tsx src/app/draws/page.tsx`) returns the 18-hit baseline documented in §Pre-flight Step A. Blast radius grep (§Step B) returns exactly 6 financials/* importers and zero others. If either diverges, executor HALTs for Jake. |
| AC-D2-02 | After Tasks 2-7 apply, `grep -n '<AppShell>\|</AppShell>\|import AppShell' src/app/invoices/page.tsx src/app/invoices/qa/page.tsx src/app/invoices/queue/page.tsx src/app/invoices/liens/page.tsx src/app/invoices/payments/page.tsx src/app/draws/page.tsx` returns 0 hits across all 6 files. |
| AC-D2-03 | After Tasks 2-7 apply, `grep -n 'app-shell' src/app/invoices/page.tsx src/app/invoices/qa/page.tsx src/app/invoices/queue/page.tsx src/app/invoices/liens/page.tsx src/app/invoices/payments/page.tsx src/app/draws/page.tsx` returns 0 hits (confirms the import line was removed alongside the tags — no orphan unused import). |
| AC-D2-04 | `npm run build` + `npx tsc --noEmit` pass with zero errors and zero unused-import warnings for the 6 files. Drummond grep gate (.githooks/pre-commit) silent on the committed diff. `git diff src/app/financials/layout.tsx` returns empty (canonical wrapper untouched). |
| AC-D2-05 | Plan D-4's `wave-d-smoke.ts` script (per Wave-D EXPANDED-SCOPE §Plan D-4) renders each of the 6 /financials/* routes (/financials/bills, /financials/bills/qa, /financials/bills/queue, /financials/lien-releases, /financials/payments, /financials/pay-apps) against the Vercel preview URL and asserts EXACTLY 1 `header.bg-nw-slate-deeper` element in the DOM per page (the canonical NavBar selector — see §DOM selector reference). Pre-D-2 baseline: 2 per page (the double-shell bug). Post-D-2: 1 per page. Plan D-4's script encodes this assertion. |
| AC-D2-06 | Plan D-4's `wave-d-smoke.ts` script asserts EXACTLY 1 `aside.w-\[220px\]` element per page at desktop viewport (1440x900) across all 6 routes — the canonical sidebar selector. Pre-D-2 baseline: 2. Post-D-2: 1. (Mobile viewport: 0 in both states; sidebar is `hidden md:flex`. Not asserted at mobile viewport.) |

---

## Verification commands

Run all in repo root after executor completes the 7 tasks above.

```bash
# 1. AppShell-related grep on the exact 6 target files.
grep -n '<AppShell>\|</AppShell>\|import AppShell' \
  src/app/invoices/page.tsx \
  src/app/invoices/qa/page.tsx \
  src/app/invoices/queue/page.tsx \
  src/app/invoices/liens/page.tsx \
  src/app/invoices/payments/page.tsx \
  src/app/draws/page.tsx
# Expect: 0 hits. If any hit remains, that file's edit is incomplete.

# 2. app-shell import path grep on the same 6 files.
grep -n 'app-shell' \
  src/app/invoices/page.tsx \
  src/app/invoices/qa/page.tsx \
  src/app/invoices/queue/page.tsx \
  src/app/invoices/liens/page.tsx \
  src/app/invoices/payments/page.tsx \
  src/app/draws/page.tsx
# Expect: 0 hits.

# 3. financials/layout.tsx unchanged.
git diff src/app/financials/layout.tsx
# Expect: empty diff.

# 4. /invoices/[id]/page.tsx unchanged (out of scope per Step D).
git diff src/app/invoices/\[id\]/page.tsx
# Expect: empty diff.

# 5. /financials/aging/page.tsx + /financials/aging-report/page.tsx unchanged (out of scope per §Out-of-scope observations).
git diff src/app/financials/aging/page.tsx src/app/financials/aging-report/page.tsx
# Expect: empty diff.

# 6. TypeScript clean.
npx tsc --noEmit
# Expect: 0 errors.

# 7. Build clean.
npm run build
# Expect: success. No "unused import" warnings on the 6 target files.

# 8. Drummond grep gate.
.githooks/pre-commit
# (Auto-fires on commit; silent expected.)

# 9. Smoke (gated on Plan D-4 wave-d-smoke.ts existing — D-4 lands separately).
#    If D-4 has shipped:
npx tsx scripts/wave-d-smoke.ts --preview-url <vercel-preview-url>
#    Expect: 6 financials/* routes, each with header_count=1 + sidebar_count=1.
#    Pre-D-2 baseline was 2 + 2 per route; D-2 closes Issue 2 to 1 + 1.
```

---

## Dependencies

- **After Wave-A** (cleanup applied 2026-05-12) and **after Wave-C** (public.users retirement + 9 PostgREST hint sites shipped 2026-05-13) — both prerequisite waves are already on main per Wave-D EXPANDED-SCOPE.
- **Parallel-eligible with Plan D-1** (Issue 1 fix — PostgREST relationship + FK retarget). D-1 modifies 9 sites for the `profiles:user_id(...)` → `profile:profiles(...)` rewrite; D-2 modifies AppShell-wrapping in 6 of those same files (4 are in both sets: `invoices/page.tsx`, `invoices/queue/page.tsx`, `api/jobs/[id]/overview/route.ts` is D-1-only, `jobs/new/page.tsx` is D-1-only). The 4 shared files (`invoices/page.tsx` + `invoices/queue/page.tsx`) have edits in non-overlapping line ranges:
  - D-1 touches the `Promise.all([ ... .from("invoices") ... ])` block (around lines 197-211 in queue, lines 170-175 in page) and the `assigned_pm:assigned_pm_id` PostgREST select string (around lines 200-201 in queue, lines 148-149 in page).
  - D-2 touches only the AppShell wrap (line 397 + 849 in page, line 723 + 1573 in queue) and the import line (line 8 in page, line 6 in queue).
  - **Conflict assessment:** zero line-range overlap. Both plans can author + execute in parallel; the rebase at merge time will not produce conflicts. If executor lands D-1 first, D-2's grep at Step A will return the same 18-hit baseline because D-1 does not touch any AppShell line. Same for the reverse order.
- **Before Plan D-4** (smoke test script) — D-4's `wave-d-smoke.ts` verifies the post-D-2 single-shell invariant against the Vercel preview URL. D-4 cannot pass its NavBar count assertion until D-2 ships. Dependency direction: D-4 reads D-2's output, not the other way around.
- **Independent of D-3** (corrected smoke packet — documentation only, no code change).
- **Independent of D-5** (D-078 decision entry in MASTER-PLAN.md — text-only addition).

---

## Rollback strategy

### Quick rollback (PR not yet merged)

`git revert <commit-sha>`. No DB state to recover; no migration to roll back.

### Mid-flight rollback (PR shipped to main; needs to be reverted)

```bash
git revert <merge-commit-sha>
npm run build
# Expect: build passes (the revert restores the 6 underlying files to pre-D-2 state).
git push origin main
```

Post-revert verification:
- Each of 6 /financials/* routes once again renders with double NavBar + double sidebar (the pre-D-2 state Wave-C surfaced).
- Plan D-4's smoke script will fail (header_count=2 instead of 1) — this is EXPECTED on revert; the revert is itself a known regression that ships only as an emergency fix.

### Why no DB / migration component

D-2 is a pure UI-rendering refactor. No schema changes; no FK retargets; no data migration. The only artifact is the TypeScript-source diff for 6 files. Revert = `git revert`. No PI1.1 (data-integrity) concern.

---

## Notes for plan-review

### Re-export indirection visibility

The 6 underlying files are NEVER directly user-reachable in production (next.config.mjs:90-102 308-redirects all legacy URLs). Plan-reviewers MAY interpret this as "dead code" — but the underlying files are the SOURCE-OF-TRUTH for the rendering; the financials/* thin wrappers are just URL-aliasing. Stripping AppShell from the underlying files is the canonical path to fixing the double-shell bug.

The alternative (strip AppShell from `financials/layout.tsx` instead and let the underlying files keep their wraps) was REJECTED because:
1. `financials/layout.tsx` was specifically introduced in commit `96484db` to ensure NavBar persistence on `/financials/*` overview routes (e.g. `/financials/aging`, `/financials/change-orders`, `/financials/purchase-orders`, `/financials/reconciliation`, plus the `/financials` section overview itself). Stripping it would break those routes.
2. Per stage-1.5c-IA D-053 thin-wrapper principle, the thin wrappers SHOULD be parameter-free re-exports — they should not need to know about layout chrome.
3. The 6 underlying files were originally written as standalone pages (pre-1.5c-IA), back when `/invoices` was the user-facing URL and the AppShell was needed at page level. Post-1.5c the URLs moved, the section-level layout was added, but the page-level AppShells were left behind. Stripping them is the correct cleanup of that leftover.

### Why no Fragment in 5 of 6 files

5 of 6 files have AppShell wrapping exactly one `<main>` child. Post-strip the return is a single React element — Next.js + React accept this without Fragment. Bare `<main>` is valid and cleaner than `<><main></></>`.

The exception is `src/app/invoices/page.tsx` (Task 2) which has AppShell wrapping `<main>` + 2 sibling `<InvoiceUploadModal>` / `<InvoiceImportModal>` components. That file gets a Fragment wrap (`<>...</>`) to preserve the multi-child return semantic.

### Why this is "Issue 2" not "Issue 1+2 combined"

Plan-reviewers may ask "since 4 of the 6 D-2 files overlap with D-1's 9-site PostgREST refactor, why not combine D-1 + D-2 into a single plan?"

Rationale for keeping them split (per Wave-D EXPANDED-SCOPE §Execution order item 4):
1. **Independent failure modes.** D-1 fails on PostgREST relationship resolution at runtime (broken `profile:profiles(...)` hint); D-2 fails on DOM rendering (double NavBar visible). Diagnosing a single combined PR's failures would require disambiguating which class of bug is firing.
2. **Independent rollback.** A PostgREST regression in D-1 (e.g. the FK constraint name surprises the executor) shouldn't force a rollback of D-2's clean DOM-rendering fix. Two separate PRs allow surgical revert.
3. **Plan-review iter-1 focus.** D-1 must pass FK-citation enforcement per Rule 2 (nwrp120). D-2 has no FK concern. Combining them dilutes the iter-1 reviewer's focus on D-1's FK-citation check.
4. **Parallel author + execute.** Per EXPANDED-SCOPE item 4, D-1 and D-2 are explicitly intended to execute in parallel after iter-1 review.

### Smoke deferral if Chrome MCP unavailable

If executor doesn't have Chrome MCP access (or Vercel preview URL is not yet provisioned for Wave-D), Plan D-4's `wave-d-smoke.ts` defers — the smoke verdict is "DEFERRED" with a documented sample size of 0. AC-D2-05 + AC-D2-06 are then verified at GATE-D halt against the actual preview URL before /gsd-ship. D-2's code-level acceptance (AC-D2-01..04) does NOT depend on smoke availability.

---

## Status updates (executor populates)

- [ ] Task 1 complete — pre-flight grep verified, 18-hit baseline matches, blast radius confirmed 6
- [ ] Task 2 complete — invoices/page.tsx Fragment-wrap applied, import removed
- [ ] Task 3 complete — invoices/qa/page.tsx bare-main return, import removed
- [ ] Task 4 complete — invoices/queue/page.tsx bare-main return, import removed (THIS is the surface that surfaced the bug in Wave-C smoke)
- [ ] Task 5 complete — invoices/liens/page.tsx bare-main return, import removed
- [ ] Task 6 complete — invoices/payments/page.tsx bare-main return, import removed
- [ ] Task 7 complete — draws/page.tsx bare-main return, import removed
- [ ] Task 8 complete — post-refactor verification passes (grep silent, build clean, layout untouched)
- [ ] AC-D2-01..04 verified locally
- [ ] AC-D2-05..06 verified via Plan D-4 wave-d-smoke.ts against Vercel preview URL (or deferred to GATE-D halt)
- [ ] Plan-review iter-1 verdict captured
- [ ] PR opened
- [ ] PR merged to main
