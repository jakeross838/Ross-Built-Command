---
phase: stage-f1-knowledge-graph-auth-wave-d
plan: D-3
type: execute
wave: 3
depends_on: []
files_modified:
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-3-corrected-smoke-packet.md
autonomous: true
requirements:
  - WAVE-D-ISSUE-3
tags:
  - smoke-packet
  - documentation
  - wave-d
  - corrective

must_haves:
  truths:
    - "Future smoke-packet authors land on a corrected packet that points at canonical Stage 1.5c IA URLs, not pre-rename /invoices + /draws."
    - "The original Wave-C 5-route packet is explicitly superseded — no ambiguity about which packet is current."
    - "Reading the corrected packet alone is enough to run smoke without consulting next.config.mjs (the redirects are explained inline)."
    - "All 9 routes (the 5 originally surfaced in Wave-C + the 4 additional canonical entries needed to express Wave-C's intent) have expected behavior + verify checklist."
    - "Every route's Plan D-1 / D-2 / Wave-C origin is traceable — a future reader knows WHY each route is in the smoke packet."
    - "Zero src/ files modified — git status post-execute shows only .planning/ changes."
  artifacts:
    - path: ".planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-3-corrected-smoke-packet.md"
      provides: "Corrected 9-route smoke packet superseding original Wave-C 5-route packet"
      contains: "/financials/bills, /financials/bills/queue, /financials/bills/qa, /financials/bills/[id], /financials/lien-releases, /financials/payments, /financials/pay-apps, /jobs/new, /jobs/[id]"
      min_lines: 80
  key_links:
    - from: ".planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-3-corrected-smoke-packet.md"
      to: "next.config.mjs (lines 90-102)"
      via: "Inline references to redirect rules so future authors understand WHY /invoices and /draws are wrong inputs."
      pattern: "next\\.config\\.mjs"
    - from: ".planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-3-corrected-smoke-packet.md"
      to: ".planning/expansions/stage-f1-knowledge-graph-auth-wave-d-EXPANDED-SCOPE.md"
      via: "Cross-reference to Plan D-1 (9 Issue-1 sites) and Plan D-2 (6 Issue-2 thin-wrappers) for traceability of WHICH routes the packet covers and WHY."
      pattern: "Plan D-1|Plan D-2|Wave-C"
    - from: ".planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-3-corrected-smoke-packet.md"
      to: "Original Wave-C smoke packet (mental artifact — never written to disk per nwrp120)"
      via: "Explicit 'supersedes' note at top of corrected packet so no one runs the wrong packet."
      pattern: "supersedes|SUPERSEDES"
---

<objective>
Author a corrected smoke-test packet for Wave-D's verification surface. The original Wave-C smoke packet (authored mid-conversation by Claude Code; never committed to disk) pointed Jake at `/invoices`, `/invoices/queue`, `/invoices/qa`, `/invoices/liens`, `/invoices/payments`, and `/draws` — all of which 301-redirect to canonical Stage 1.5c IA paths per `next.config.mjs:91-102`. The smoke-walk Jake ran landed him on the redirect destinations and surfaced legitimate signals, but the packet's input URLs were wrong by construction: a Wave-D smoke packet pointing at pre-rename paths re-litigates Stage 1.5c's resolved rename every time it runs, and a future author copying this packet will repeat the error.

Purpose: Close out Wave-D Issue 3 (per EXPANDED-SCOPE.md §"Plan D-3: Issue 3 — corrected smoke packet (no code change)") by producing a single corrected-packet artifact that (a) supersedes the prior packet explicitly, (b) lists canonical Stage 1.5c URLs only, (c) ties each route back to its Wave-C / Plan D-1 / Plan D-2 origin, and (d) cites `next.config.mjs` redirect rules so the next author understands why pre-rename paths are forbidden inputs.

Output: Single markdown file at `.planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-3-corrected-smoke-packet.md`. Zero source-code changes. Zero migration. Zero src/ touches.
</objective>

<execution_context>
@C:/Users/Jake/nightwork-platform/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Jake/nightwork-platform/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/CONTEXT.md
@.planning/ROADMAP.md
@.planning/expansions/stage-f1-knowledge-graph-auth-wave-d-EXPANDED-SCOPE.md
@next.config.mjs

<!-- Wave-C-touched route surface (Plan D-1) — source files referenced for behavior summaries -->
@src/app/(authenticated)/invoices/page.tsx
@src/app/(authenticated)/invoices/queue/page.tsx
@src/app/(authenticated)/invoices/qa/page.tsx
@src/app/(authenticated)/invoices/liens/page.tsx
@src/app/(authenticated)/invoices/payments/page.tsx
@src/app/(authenticated)/draws/page.tsx
@src/app/(authenticated)/jobs/new/page.tsx

<interfaces>
<!--
Key redirect contracts the smoke-packet author must encode. Extracted from next.config.mjs:91-102.
These are the canonical Stage 1.5c IA destinations per CONTEXT D-01.
Author the corrected packet using ONLY the destination URLs (right-hand side).
-->

From next.config.mjs (lines 91-102):

```
/invoices              → /financials/bills           (permanent 301)
/invoices/queue        → /financials/bills/queue     (permanent 301)
/invoices/qa           → /financials/bills/qa        (permanent 301)
/invoices/payments     → /financials/payments        (permanent 301)
/invoices/liens        → /financials/lien-releases   (permanent 301)
/invoices/:id          → /financials/bills/:id       (permanent 301)
/draws                 → /financials/pay-apps        (permanent 301)
/draws/:id             → /financials/pay-apps/:id    (permanent 301)
```

Untouched routes (no redirect — direct serves):

```
/jobs/new              served by src/app/(authenticated)/jobs/new/page.tsx
/jobs/[id]             served by src/app/(authenticated)/jobs/[id]/page.tsx
```

The corrected packet MUST list the destinations only. Pre-rename inputs (the left side) appear ONLY in the "Why this packet supersedes the original" preamble — as forbidden inputs, not as smoke targets.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Author corrected 9-route smoke packet</name>
  <files>.planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-3-corrected-smoke-packet.md</files>
  <action>
Create the corrected smoke packet at `.planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-3-corrected-smoke-packet.md`. This is a documentation artifact only — NO src/ touches, NO migration, NO code change of any kind.

**Required structure (use these exact section headings in order):**

1. **Frontmatter** — minimal YAML with `status: SUPERSEDES Wave-C 5-route packet`, `authored: 2026-05-13`, `phase: stage-f1-knowledge-graph-auth-wave-d`, `plan: D-3`, `cross_reference: next.config.mjs:91-102 + EXPANDED-SCOPE.md Plan D-1/D-2`.

2. **Section: "Why this packet supersedes the original"** — 2-3 paragraphs explaining:
   - The original Wave-C packet (authored mid-conversation by Claude Code; never committed) pointed at `/invoices`, `/invoices/queue`, `/invoices/qa`, `/invoices/liens`, `/invoices/payments`, and `/draws`.
   - All six 301-redirect to canonical Stage 1.5c IA paths per `next.config.mjs:91-102` (per CONTEXT D-01).
   - Jake's smoke-walk against the original packet surfaced legitimate issues (Issue 1 PostgREST hint, Issue 2 double AppShell) but the packet's INPUT URLs were wrong by construction — a future author copying that packet repeats the error.
   - This packet uses canonical destinations only. Pre-rename paths are forbidden inputs.
   - Cite the exact `next.config.mjs` line range (91-102) so a future author can verify the redirects haven't drifted.

3. **Section: "Routes"** — 9 H3 subsections, one per route. For each route, use this exact template:

   ```
   ### Route N — `{canonical-url}`

   **Origin:** {Plan D-1 9-site list / Plan D-2 6-thin-wrapper list / Wave-C surface / unchanged baseline}
   **Served by:** {src/ path of the underlying page or layout file}
   **Replaces (forbidden input):** {pre-rename URL, or "N/A — never had a pre-rename path"}

   **Expected behavior:**
   - {bullet 1 — what should render}
   - {bullet 2 — what data should populate}
   - {bullet 3 — what should NOT happen, e.g. "no double NavBar"}

   **Specifically verify:**
   - [ ] {check 1 — concrete, observable}
   - [ ] {check 2}
   - [ ] {check 3}
   - [ ] {check 4 — console errors}
   ```

   **The 9 routes (in this order):**

   1. `/financials/bills` — Origin: Plan D-1 (was `invoices/page.tsx:204` `profiles:user_id` hint) + Plan D-2 (was double-AppShell). Served by `src/app/(authenticated)/financials/bills/page.tsx` (thin wrapper) + `src/app/(authenticated)/invoices/page.tsx`. Replaces `/invoices`.
   2. `/financials/bills/queue` — Origin: Plan D-1 (was `invoices/queue/page.tsx:220` `profiles:user_id` hint) + Plan D-2 (was double-AppShell). Served by `src/app/(authenticated)/financials/bills/queue/page.tsx` + `src/app/(authenticated)/invoices/queue/page.tsx`. Replaces `/invoices/queue`.
   3. `/financials/bills/qa` — Origin: Plan D-2 (was double-AppShell). Served by `src/app/(authenticated)/financials/bills/qa/page.tsx` + `src/app/(authenticated)/invoices/qa/page.tsx`. Replaces `/invoices/qa`.
   4. `/financials/bills/[id]` — Origin: Plan D-1 (was `api/invoices/[id]/route.ts:113` `profiles:user_id` hint). Served by `src/app/(authenticated)/financials/bills/[id]/page.tsx` + the underlying invoice detail page. Replaces `/invoices/:id`. Note: requires a concrete `[id]` for smoke — use the first Drummond bill ID surfaced on `/financials/bills`.
   5. `/financials/lien-releases` — Origin: Plan D-2 (was double-AppShell). Served by `src/app/(authenticated)/financials/lien-releases/page.tsx` + `src/app/(authenticated)/invoices/liens/page.tsx`. Replaces `/invoices/liens`.
   6. `/financials/payments` — Origin: Plan D-2 (was double-AppShell). Served by `src/app/(authenticated)/financials/payments/page.tsx` + `src/app/(authenticated)/invoices/payments/page.tsx`. Replaces `/invoices/payments`.
   7. `/financials/pay-apps` — Origin: Plan D-2 (was double-AppShell, `draws/page.tsx`). Served by `src/app/(authenticated)/financials/pay-apps/page.tsx` + `src/app/(authenticated)/draws/page.tsx`. Replaces `/draws`.
   8. `/jobs/new` — Origin: Plan D-1 (was `jobs/new/page.tsx:80` `profiles:user_id` hint). Served by `src/app/(authenticated)/jobs/new/page.tsx`. Replaces N/A — never had a pre-rename path.
   9. `/jobs/[id]` — Origin: Plan D-1 (was `api/jobs/[id]/overview/route.ts:77+117` `profiles:user_id` hint). Served by `src/app/(authenticated)/jobs/[id]/page.tsx`. Replaces N/A — never had a pre-rename path. Note: requires a concrete `[id]` — use the Drummond job ID surfaced on `/jobs`.

   **Expected behavior + verify checks per route (derive from Plan D-1 / D-2 fix targets):**
   - Routes 1, 2, 4, 8, 9 (Plan D-1 hint fixes): expected behavior includes "PM dropdown populates with PM names" or "Activity feed shows PM names" (NOT user UUIDs); verify checklist includes "PM dropdown shows non-empty list of full names" + "no 400 from PostgREST embedding hint" + "console clean of PGRST200 errors".
   - Routes 1, 2, 3, 5, 6, 7 (Plan D-2 double-AppShell fixes): expected behavior includes "single NavBar visible at top"; verify checklist includes "no double NavBar / no doubled sidebar / no duplicated breadcrumb row".
   - Routes overlapping both (1 + 2): include BOTH categories of checks.
   - All 9 routes: verify checklist includes "page returns 200 (not 301, not 404, not 500)" + "no console errors in browser DevTools" + "primary UX populates within ~2s on Vercel preview".

4. **Section: "Why pre-rename URLs are forbidden inputs"** — 1 short paragraph:
   - A smoke packet using `/invoices` exercises the 301 chain but does NOT exercise the canonical route's render path the way a user would (the redirect masks render differences).
   - More importantly, copying a pre-rename packet into Wave-E / Wave-F / Wave 1.1 re-litigates Stage 1.5c's rename every cycle.
   - Reference: CONTEXT D-01 (Bills/Pay Apps terminology rename); `next.config.mjs:91-102` (the 301 rules).

5. **Section: "How to run this smoke packet"** — short procedural notes:
   - Run against the Vercel preview URL for the Wave-D post-execute branch (NOT localhost — per CLAUDE.md "Hard rule: verify against the Vercel preview URL before /gsd-ship").
   - For routes 4 + 9 ([id] params), substitute the first Drummond bill / job ID surfaced on the corresponding list route.
   - Capture screenshots inline via Chrome MCP per CLAUDE.md screenshot protocol (do NOT persist to disk — Jake reviews inline).
   - Mark each verify checkbox manually after observation.
   - If `scripts/wave-d-smoke.ts` (Plan D-4) is running, this packet is the **human-readable companion** — the Playwright script automates routes 1-7 mechanically; routes 8 + 9 + the human visual checks remain manual.

6. **Section: "Cross-references"** — bullet list:
   - `.planning/expansions/stage-f1-knowledge-graph-auth-wave-d-EXPANDED-SCOPE.md` (Wave-D scope; Plan D-1 9 hint sites; Plan D-2 6 thin-wrappers).
   - `next.config.mjs:91-102` (canonical redirect rules).
   - `.planning/CONTEXT.md` D-01 (Bills/Pay Apps rename).
   - `.planning/phases/stage-1.5c-information-architecture/` (the rename's source phase).
   - Plan D-4 PLAN.md (the wave-d-smoke.ts Playwright script that mechanically exercises 15 routes).

**Forbidden in this packet:**
- Any reference to `/invoices`, `/invoices/queue`, `/invoices/qa`, `/invoices/liens`, `/invoices/payments`, or `/draws` as smoke INPUTS. They appear ONLY as forbidden-input examples in Sections 2 + 4.
- Any code change instruction. This packet is documentation only.
- Any speculation about Wave-E or beyond. Scope is Wave-D Issue 3 closure only.

**Tone + style:**
- Direct, terse. No marketing voice. Match the EXPANDED-SCOPE.md tone (operational, declarative).
- Use checkbox lists for verify steps (one `- [ ]` per item).
- Use code fences for URL paths to prevent autolink/wrap.

After writing, verify zero src/ files changed via `git status --porcelain | grep -v '^.. .planning/'` returning empty.
  </action>
  <verify>
    <automated>test -f .planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-3-corrected-smoke-packet.md && wc -l .planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-3-corrected-smoke-packet.md | awk '$1 < 80 { exit 1 }' && grep -c '^### Route' .planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-3-corrected-smoke-packet.md | awk '$1 != 9 { exit 1 }' && grep -q 'SUPERSEDES\|supersedes' .planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-3-corrected-smoke-packet.md && grep -q 'next.config.mjs' .planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-3-corrected-smoke-packet.md && ! grep -E '^- ' .planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-3-corrected-smoke-packet.md | grep -E '`/invoices`|`/invoices/queue`|`/invoices/qa`|`/invoices/liens`|`/invoices/payments`|`/draws`' && git status --porcelain | grep -v '^.. .planning/' | grep -v '^$' && exit 1 || exit 0</automated>
  </verify>
  <done>
    File exists at `.planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-3-corrected-smoke-packet.md` with:
    - ≥80 lines.
    - Exactly 9 `### Route` H3 subsections (one per canonical URL).
    - Contains "supersedes" (case-insensitive) in the preamble.
    - References `next.config.mjs` (at least once, with a line citation).
    - Zero bullet items list `/invoices`, `/invoices/queue`, `/invoices/qa`, `/invoices/liens`, `/invoices/payments`, or `/draws` as smoke INPUTS (they may appear in prose explaining why they're forbidden — verified by grep filtering to bullet lines).
    - `git status --porcelain` shows ONLY `.planning/` modifications; zero src/ files touched.
  </done>
</task>

</tasks>

<threat_model>

**security_enforcement note:** This plan creates a single markdown documentation artifact under `.planning/`. No code change, no migration, no runtime behavior change, no auth/RLS surface touched, no user input handling. STRIDE analysis is functionally void — there is no trust boundary in the change set. The threat-model section is included for schema completeness only.

## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| None applicable | Documentation artifact only. No data flows, no API surface, no auth path, no PII handling. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-WAVE-D-3-01 | I (Information disclosure) | `D-3-corrected-smoke-packet.md` contents | accept | Packet documents canonical public URL structure already visible in `next.config.mjs` (committed to public repo) and any authenticated user's address bar. No incremental disclosure. |
| T-WAVE-D-3-02 | T (Tampering) | Future author copying outdated smoke packet | mitigate | Section "Why this packet supersedes the original" explicitly names the prior 5-route packet as superseded; section "Why pre-rename URLs are forbidden inputs" prevents copy-forward of the original error. The supersedes note is the mitigation. |

</threat_model>

<verification>

**Acceptance criteria from kickoff (verified by Task 1 verify command + post-execute manual check):**

1. **Corrected smoke packet doc exists** at `.planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-3-corrected-smoke-packet.md` → `test -f` check.

2. **All 9 routes documented** with expected behavior + verify checklist → `grep -c '^### Route'` returns 9; each section contains a `**Specifically verify:**` block with checkbox bullets.

3. **Packet supersedes original Wave-C 5-route packet explicitly** → grep for "supersedes" (case-insensitive) in the packet returns ≥1 match; the preamble section explicitly names the original packet.

4. **Doc references `next.config.mjs` redirect rules** so future authors don't repeat the mistake → grep for "next.config.mjs" returns ≥1 match; the citation includes the line range (91-102).

5. **No source code changes** → `git status --porcelain | grep -v '^.. .planning/'` returns empty (all modifications confined to .planning/).

**Out-of-scope by design (do NOT verify):**
- Plan D-4's `scripts/wave-d-smoke.ts` execution — that's Plan D-4's verification surface.
- Actual smoke walk against Vercel preview — that's a post-merge runbook step, not Plan D-3.
- Plan D-1 / D-2 / D-5 deliverables — independent plans, independent verification.

</verification>

<success_criteria>

Plan D-3 succeeds when ALL of the following are true:

1. `.planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-3-corrected-smoke-packet.md` exists, is ≥80 lines, and contains 9 `### Route` subsections (one per canonical Stage 1.5c URL).

2. The packet's preamble explicitly supersedes the original Wave-C 5-route packet and cites `next.config.mjs:91-102` as the authority for why pre-rename URLs are forbidden inputs.

3. Each of the 9 route subsections includes: `Origin:`, `Served by:`, `Replaces:`, `Expected behavior:` (bullets), and `Specifically verify:` (checkbox list with ≥4 items).

4. Plan D-1 origin routes (1, 2, 4, 8, 9) include PM-dropdown / PostgREST-hint verify items; Plan D-2 origin routes (1, 2, 3, 5, 6, 7) include single-NavBar verify items; overlap routes (1, 2) include both categories.

5. `git status --porcelain` post-execute shows ONLY `.planning/` changes — zero src/ touches, zero migration files, zero config changes.

6. The cross-references section ties the packet back to EXPANDED-SCOPE.md, CONTEXT.md D-01, the original 1.5c IA phase folder, and Plan D-4's `wave-d-smoke.ts`.

7. A future planner or smoke-walk author reading the packet alone (without conversation context) understands: which routes to hit, what to look for on each, why these are the canonical URLs, and that the prior packet is dead.

</success_criteria>

<output>
After completion, create `.planning/phases/stage-f1-knowledge-graph-auth-wave-d/stage-f1-knowledge-graph-auth-wave-d-D-3-SUMMARY.md` per the template at `C:/Users/Jake/nightwork-platform/.claude/get-shit-done/templates/summary.md`. The summary should capture:
- Single artifact created: the corrected smoke packet path.
- Zero src/ files modified (paste `git status` output to prove).
- Cross-references back to Plan D-1 (9 hint sites) + Plan D-2 (6 thin-wrappers) + Plan D-4 (wave-d-smoke.ts companion automation).
- One-paragraph "Why this matters": the packet closes Wave-D Issue 3 and prevents future authors from re-litigating Stage 1.5c's resolved rename in smoke-walks.
</output>
