# Criteria template

**For:** every PLAN.md from stage-1.5c-verification-harness onward.
**Mandate:** D-17/D-18 in `.planning/phases/stage-1.5c-verification-harness/01.5-c-verification-harness-CONTEXT.md`.
**Watchpoint #5:** enforce structured thinking without becoming a friction tax. Use the defaults below; only invent phrasings when the defaults don't fit.

## Why structured criteria

The verification harness (Plans 1-11 of stage-1.5c-verification-harness) verifies plans against falsifiable criteria, in 5 categories:

- `mechanical` → Layer 1 (static checks: build/typecheck/hooks/privacy)
- `dom` → Layer 1 (Playwright DOM assertions across 3 viewports)
- `behavioral` → Layer 2 (industry-standards rules: math identities, state machine completeness)
- `visual` → Layer 3 (Claude vision: design tokens, palette, typography, layout)
- `semantic` → Layer 3 (Claude vision: meaning-level checks like "cost code visible on each line item")

PLAN `<criteria>` blocks fuel the harness. Vague criteria = vision call ambiguity = halt-for-Jake. Specific criteria = clean PASS or actionable FAIL.

## Drop-in template (copy + edit per plan)

> **Route convention (per nwrp65 FIX 7):** `dom` / `visual` / `semantic` criteria MUST start with an **explicit route** in the form `Page /<exact-path>: …`. The previously-shown `<route>` placeholder pattern is **deprecated** because the verification harness's Layer 3 runner extracts the path literally — `Page <route>: …` causes Playwright to navigate to `/<route>`, which redirects to login on Vercel-protected previews and renders the wrong page. Substitute the actual route the criterion is meant to verify (e.g. `/design-system/patterns` for Document Review pattern, `/financials/invoices/[id]` for cost-code visibility on a real invoice).
>
> If a criterion describes a UI surface that doesn't have a stable rendered page yet, point it at the closest design-system showcase (e.g. `/design-system/patterns`) where the pattern renders against fixture data — or move the criterion to `behavioral:` if it's really about implementation invariants.
>
> **Backward compat:** criteria authored without an explicit route still work — Layer 3 falls back to the preview-URL root. But you'll get FAILs whenever the marketing/login page doesn't show what the criterion describes. Always prefer explicit routes.

```yaml
criteria:
  mechanical:
    - "npm run build clean (0 warnings, 0 errors)"
    - "npx tsc --noEmit returns 0 errors in src/"
    - "All hooks silent on every commit (T10a-T10d, post-edit drift, Drummond grep)"
    - "Privacy gate clean across new files"
  dom:
    - 'Page /financials/invoices/[id] contains element "th[scope=col]:has-text(\"Cost Code\")"'
    - 'Page /dashboard contains text "Active jobs"'
  visual:
    - "Page /design-system/philosophy: Site Office signature visible (tracking-eyebrow 0.18em UPPERCASE on eyebrows)"
    - "Page /design-system/palette: Slate Set B palette only (#5B8699 stone-blue accents; no off-token hex)"
  behavioral:
    - "<function-name>(<input>) returns <expected-output>"
    - "<API endpoint> POST <body> transitions <entity>.status to <expected-status>"
    - "<state machine> on event <X> from state <A> moves to state <B>"
  semantic:
    - "Page /design-system/patterns: cost code is visible on each invoice line item (no blank cells)"
    - "Page /design-system/patterns: Document Review pattern present (file preview LEFT, right-rail panel, audit timeline BELOW)"
```

## When a category doesn't apply

Use `N/A — <one-line reason>` rather than omitting the category. The criteria-loader skips N/A entries silently:

```yaml
criteria:
  mechanical:
    - "npm run build clean"
  dom:
    - "N/A — no UI surfaces in this plan (foundation module + JSON schema only)"
  visual:
    - "N/A — no UI surfaces"
  behavioral:
    - "<test>"
  semantic:
    - "N/A — no Layer 3 vision criteria for this plan"
```

## Specificity rubric (for plan-review enforcement)

A criterion is **specific** if a different Claude instance can run the verification without asking clarifying questions.

| Vague | Specific |
|---|---|
| "Page works" | "Page /dashboard returns HTTP 200" |
| "Component renders" | "Page /financials/bills/[id] contains element 'th[scope=col]:has-text(\"Cost Code\")'" |
| "Auth flow good" | "POST /api/auth/login with valid credentials returns 200 + session cookie; transitions session to active" |
| "Site Office vibe" | "Page /design-system uses tracking-eyebrow 0.18em UPPERCASE on all eyebrow elements" |
| "Cost codes visible" | "Page /financials/bills/[id]: every row in the line items table has a non-empty cost-code cell" |

`nightwork-plan-review` flags vague criteria (left column patterns) as REVISE. Authoring tip: if you find yourself writing "good", "correct", "works", "renders", you're vague — restate as a falsifiable assertion.

## Common authoring errors (post-mortem from stage-1.5c-verification-harness self-test)

The harness's first end-to-end run (#25515440465 on `a476a03`, 2026-05-07) surfaced **9 misauthored Layer 3 ACs across Plans 2/4/6/7/8b/9** — each describing something that vision API cannot evaluate from a UI screenshot. The vision model identified them all as "non-UI/documentation criterion" or "internal design unrelated to UI" with confidence ≤ 0.5. Pattern, with examples:

| Anti-pattern | Example | Why it's wrong | Correct home |
|---|---|---|---|
| **Documentation/README claims** | "Layer 3 README documents the idempotency contract…" (AC-04-60) | README content isn't on the rendered web page | `behavioral:` (file-content grep) or N/A |
| **CI workflow design** | "Workflow design: PR comment includes both run link and artifact link…" (AC-06-77) | CI artifacts aren't on the rendered web page | `behavioral:` (workflow YAML grep) or N/A |
| **Agent design / architecture** | "Agent design: gsd-fix-executor scope-narrowed…" (AC-07-92) | Agent prompts aren't on the rendered web page | `behavioral:` (frontmatter / fence grep) or N/A |
| **Code architecture / state machines** | "Loop design: state machine cleanly bounded (MAX_ITERATIONS=3 hard cap; no recursive calls; pure-function transitions)" (AC-08b-126) | Code structure isn't on the rendered web page | `behavioral:` (code structure grep) or N/A |
| **Schema / data-format rules** | "Schema design: extractable-data-only rule (no speculation) prevents calibration entries from devolving into noisy free-text" (AC-09-140) | Schema rules aren't on the rendered web page | `behavioral:` (schema parse) or N/A |
| **Source-file implementation claims** | "src/lib/verification/layer1/dom-assertions.ts uses chromium.launch() and 3 viewports (1920/1280/393)" (AC-02-20) | Source files aren't on the rendered web page | `behavioral:` (grep) or N/A |

**The rule:** `visual:` and `semantic:` criteria MUST describe something visible on a rendered web page when the harness navigates to a route via Playwright + chromium. If the criterion is about code, agents, READMEs, schemas, CI workflows, or "design intent" — it belongs in `behavioral:` (Layer 2 standards rule with a registry entry) or `mechanical:` (Layer 1 grep-style check) or as `N/A — <reason>` if it's tautologically verified by integration.

Cleanups landed in: nwrp60 FIX 3 (AC-02-20), nwrp64 FIX 6 (8 ACs across Plans 4/6/7/8b/9). The pattern: convert misauthored visual:/semantic: blocks to a single `N/A — <reason>` entry citing the run that surfaced the FAIL and explaining where the criterion's truth actually lives.

## Worked examples in stage-1.5c-verification-harness

This phase's PLAN files 1-11 are the canonical worked examples. Reference for shape:

- **Plan 1** (foundation): mechanical-heavy, dom/visual/semantic = N/A
- **Plan 3** (Layer 2 framework): behavioral-heavy with one mechanical
- **Plan 5** (orchestrator): all 5 categories represented; semantic anchors the rerun-no-op invariant
- **Plan 8a** (this plan): all 5 categories represented; semantic anchors the design

## Friction tax check (Plan-review watchpoint #5)

The criteria mandate must NOT cost more than ~5 minutes per plan to author. If a plan-author finds themselves spending 30+ minutes on the criteria block:

1. Are they over-specifying? Most criteria can be 1 line.
2. Is the plan too large? Each plan should have 5-15 criteria total. >20 = plan should split.
3. Is the template missing a category for this plan's scope? Surface as plan-review iter-1 feedback to extend the template.

The template above ships with the most-common phrasings. Reuse > invent.

## Upstream planner sync (manual)

`.claude/agents/gsd-planner.md` is gitignored (comes from the upstream GSD plugin and is overlaid per-PC by the plugin's update mechanism). Per stage-1.5c-vh D-17/D-18, the planner prompt must reference this template so newly authored plans include `<criteria>` blocks.

To propagate the criteria mandate to gsd-planner.md across PCs:

1. Open `.claude/agents/gsd-planner.md` on each PC.
2. Add a "Criteria mandate" section near the PLAN.md format documentation that mirrors the in-repo `.claude/commands/nightwork-plan-review.md` enforcement (criteria block presence, 5-category coverage, specificity scan, friction-tax watchpoint).
3. Reference `.planning/templates/criteria-template.md` (this file) as the canonical drop-in.

The mandate is enforced even if the planner forgets the block — `nightwork-plan-review` flags missing/vague criteria as BLOCKING/REVISE on every `/np` run.
