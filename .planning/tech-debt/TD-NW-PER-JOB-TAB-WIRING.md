# TD-NW-PER-JOB-TAB-WIRING — Wire per-job budget + bills + pay-apps + activity tabs to existing org-wide data layer with job_id filter

**Origin:** GTV Stage 1.5 walk (nwrp264-267, 2026-06-02). Findings F1-F4 in `.planning/ground-truth/PART-1.5-WALK.md`.
**Captured:** 2026-06-02
**Severity:** MEDIUM-HIGH — these are launch-visible per-job surfaces in the locked launch scope (financial core). Currently scaffolded with "Coming F1" / "Coming Wave 1.1-Lite" placeholders, blocking PM-side per-job context for the launch workflows.
**Hard deadline:** **MUST SHIP before Diane dogfood begins.** Per nwrp266 §7-8 disposition: placeholders are honest, but the deadline keeps them from rotting.
**Tier:** MEDIUM under the new tiering pipeline once `tiering-implementation` ships. Bootstrap-under-existing-pipeline if dispatched before tiering-implementation.

## What's currently scaffolded

Four per-job tab surfaces (`src/app/jobs/[id]/<tab>/page.tsx`) mount `<NwPlaceholderCard />` instead of wired data:

| Surface | Current file | Wave | DB layer ready? |
|---|---|---|---|
| **`/jobs/[id]/budget`** | `src/app/jobs/[id]/budget/page.tsx` (was Caldwell-fixture-wrapper; reframed to NwPlaceholderCard 2026-06-02 per F1) | F1 | YES — `budget_lines` table populated (288 org-wide, 144 on Fish, 0 on Drummond). `BudgetView` component exists at `@/components/prototypes/BudgetView`. |
| **`/jobs/[id]/bills`** | `src/app/jobs/[id]/bills/page.tsx` | F1 | YES — `invoices` table populated (57 org-wide, 45 on Fish, 1 on Drummond). Org-wide `/financials/bills` queue works (Stage 1.5 walk P7). |
| **`/jobs/[id]/pay-apps`** | `src/app/jobs/[id]/pay-apps/page.tsx` | F1 (list) + F6 (G702/G703 engine) | YES — `draws` table populated (2 active org-wide). Org-wide `/financials/pay-apps` works (Stage 1.5 walk P7). |
| **`/jobs/[id]/activity`** | `src/app/jobs/[id]/activity/page.tsx` | Wave 1.1-Lite | YES — `activity_log` table populated (63 entries org-wide). Per-job filter not yet authored. |

## Why this is HIGH-priority, NOT optional polish

The Phase 1 locked launch scope (`/.planning/launch/INTERNAL-LAUNCH-SCOPE-LOCKED.md`) keeps the financial core visible. PMs working in a job context (Drummond / Fish / Markgraf / etc.) reach `/jobs/{id}` for the overview, then click per-job tabs. Without per-job budget/bills/pay-apps/activity wired:

- PMs cannot review per-job budget health from inside the job context (must navigate org-wide `/financials/bills` then filter by job — workflow friction).
- "Open invoices on this job" + "draws in progress for this job" surfaces are placeholder text, not data — PMs cannot see at-a-glance status.
- Activity log per job (who-did-what-on-this-job) is absent — Wave 1.1-Lite scope but useful for PM/QA workflow context.

Org-wide `/financials/*` views work and Diane can use them. But Diane + PMs working IN a job's context will hit placeholders for the most-natural per-job surfaces. Launch with this gap = Diane dogfood reveals workflow friction immediately.

## Implementation scope per surface

Per the prior comment in `src/app/jobs/[id]/budget/page.tsx` (preserved in the reframe header at line 30-35 of the prior version), the F1 swap path is:

```ts
// Pseudocode pattern (server component):
import { getCurrentMembership } from "@/lib/org/session";
import { createServerClient } from "@/lib/supabase/server";

export default async function JobBudgetPage({ params }) {
  const membership = await getCurrentMembership();
  if (!membership) return redirect("/login?redirect=...");

  const supabase = createServerClient();
  const [
    jobRes,
    budgetLinesRes,
    invoicesRes,
    costCodesRes,
    drawsRes,
    drawLineItemsRes,
    changeOrdersRes,
  ] = await Promise.all([
    supabase.from("jobs").select(...).eq("id", params.id).eq("org_id", membership.org_id).single(),
    supabase.from("budget_lines").select(...).eq("job_id", params.id).eq("org_id", membership.org_id).is("deleted_at", null),
    supabase.from("invoices").select(...).eq("job_id", params.id).eq("org_id", membership.org_id).is("deleted_at", null),
    // ...etc
  ]);

  if (!jobRes.data) return notFound();
  // determine currentDraw, derive metrics, etc.

  return (
    <div data-direction="C" data-palette="B" className="design-system-scope">
      <BudgetView
        job={jobRes.data}
        budgetLines={budgetLinesRes.data ?? []}
        invoices={invoicesRes.data ?? []}
        // ...etc — props match the existing BudgetView contract
      />
    </div>
  );
}
```

Same pattern (with the appropriate data layer) for `/bills` (mount existing invoice list) + `/pay-apps` (mount draw list) + `/activity` (mount activity feed filtered by job_id).

**Per-surface estimated scope:** ~1 day per surface given the data layers + view components already exist. Total ~4 days work (~half a phase of effort).

## Sequencing constraints

1. **MUST ship before Diane dogfood** (the explicit deadline per nwrp266 §7).
2. **Sequencing within wave:** `/budget` is the dependency root (cost-code aggregation flows into bills + pay-apps + draws). Recommend ship order: `/bills` → `/pay-apps` → `/budget` → `/activity`. (Inverse: `/budget` first if F1 prefers data-foundation-first; either works mechanically.)
3. **Coordinate with F1 wave + Wave 1.1-Lite scope:** F1 owns budget + bills + pay-apps; Wave 1.1-Lite owns activity. Either ship together or split as separate phases.
4. **Owner-portal lessons apply:** per `TD-WB-LISTENER-PHASE1-INTERACTION.md` + `.planning/lessons.md` 2026-06-01 L4-L5: any HIDE-/wire-work routes through the 4-assertion smoke pattern when shipped. Doesn't apply to TD-NW-PER-JOB-TAB-WIRING directly (these are wire-up, not hide), but the verification standard (anon-curl + authed-incognito on Production) does apply.

## Cross-references

- `.planning/ground-truth/PART-1.5-WALK.md` — Stage 1.5 walk findings F1-F4 + deep-dive + mode classification.
- `.planning/ground-truth/PART-1-INVENTORY.md` §1.1.4 — original (a)-CANDIDATE list (corrected via PART-1.5-WALK F-Inv-1).
- `src/app/jobs/[id]/budget/page.tsx` — reframed to NwPlaceholderCard 2026-06-02.
- `src/app/jobs/[id]/bills/page.tsx` — NwPlaceholderCard since Stage 1.5c Plan 5.
- `src/app/jobs/[id]/pay-apps/page.tsx` — NwPlaceholderCard since Stage 1.5c Plan 5.
- `src/app/jobs/[id]/activity/page.tsx` — NwPlaceholderCard since Stage 1.5c Plan 5.
- `@/components/prototypes/BudgetView` — existing wired-view component, ready for real-data props.
- `src/app/api/jobs/health/route.ts` — pattern reference for org-scoped queries (`.eq("org_id", membership.org_id)`).

## TD lifecycle / sequencing

- **STAYS BLOCKING on Diane-dogfood gate.** The launch-readiness check before any Ross Built operational use must confirm all 4 surfaces wired.
- **Resolved when:** all 4 surfaces ship wired + authed-walk on Production confirms data renders for Ross Built jobs (Drummond / Fish / etc.) + per-job role permissions enforced server-side (PM sees their jobs, owner/admin sees all).
- **Order of operations** post-GTV (nwrp266 §6): "OWN PHASE post-GTV, NOT batched into Stage 2F." This is infrastructure-wiring work, scoped separately from GTV verification work.
