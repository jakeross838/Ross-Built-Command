# Phase internal-launch-hide: HIDE - Discussion Log (Assumptions Mode)

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the analysis.

**Date:** 2026-05-26
**Phase:** internal-launch-hide
**Mode:** assumptions (--auto)
**Calibration tier:** standard (no USER-PROFILE.md)
**Areas analyzed:** /people/clients carve-out, empty-vs-false canonical idiom, middleware insertion point, PerJobTabs filter composition

## Assumptions Presented

### /people/clients carve-out (Item 1 from nwrp230)
| Assumption | Confidence | Evidence |
|---|---|---|
| HIDE alongside rest of `/people/*`; no carve-out | Confident | `src/app/people/clients/page.tsx:6-19` (19-line placeholder); `src/app/api/clients/route.ts:40-67` (autocomplete-only backend with PII fence); `src/components/client-combobox.tsx` (real Diane/PM lookup path); GROUNDED-INVENTORY:153 + D-ui-state-and-hiding.md:295 (both label stale) |

### Empty-vs-false canonical idiom (Item 2 from nwrp230)
| Assumption | Confidence | Evidence |
|---|---|---|
| Canonical idiom `process.env.NEXT_PUBLIC_FEATURE_X !== "true"` (negate; default deny) at all 4 read sites; byte-identical to W.1 precedent | Confident | `src/hooks/use-current-role.ts:67-69` (W.1 precedent); `src/lib/supabase/client.ts:71` (`NEXT_PUBLIC_VERCEL_ENV !== "production"` confirms negate-string-compare idiom); inline comments at `use-current-role.ts:61-66` document fail-CLOSED rationale; alternative idioms (`=== "false"`, `Boolean(process.env.X)`) mis-handle `""` and `"false"` respectively |

### Middleware insertion point ordering
| Assumption | Confidence | Evidence |
|---|---|---|
| Insert AFTER `updateSession()` (line 141), AFTER platform-admin block (188-209), BEFORE design-system block (235) | Confident | `src/middleware.ts:141` (updateSession sets Sentry tags); platform-admin block (188-209) must run first for staff bypass posture; design-system block (235) is platform-presentation, not tenant-org scope; Owner Portal dual-gate must short-circuit BEFORE PUBLIC_PATHS auth-redirect-skip resolves (lines 27,32,41,48); JSON-vs-HTML 404 split per lines 157-162 + 285-290 |

### PerJobTabs filter composition
| Assumption | Confidence | Evidence |
|---|---|---|
| Static array removal (drop 14 from `moreBaseItems` lines 73-97, drop Schedule + Selections from `PRIMARY_TABS` lines 64-71); `morePhaseItems` unchanged; composition order preserved | Likely | `src/components/nav/per-job-tabs.tsx:73-97` (all 14 hidden items in `moreBaseItems`); `morePhaseItems` at 99-113 contains job-lifecycle phases (Closeout/Warranty/Pre-Con), not feature placeholders; mobile collapse at 367-373 concatenates same source arrays; PO ambiguity: EXPANDED-SCOPE §7 line 174 says "More ▾ collapses to CO + PO + Activity" but PO is NOT currently in `moreBaseItems` — surface to plan-author |

## Corrections Made

No corrections — all 4 assumptions confirmed via --auto (3 Confident + 1 Likely; per workflow, all-Confident-or-Likely proceeds without correction Q&A).

## Auto-Resolved

None — no Unclear assumptions.

## External Research

Skipped — `needs_research` was empty (W.1 precedent + `TD-WB-LISTENER-UNFLAG.md` are internal; idiom choice is local convention).

## Open items surfaced for plan-phase

1. **PO clarification (from D-06 / Area 4 Likely confidence):** EXPANDED-SCOPE §7 + GROUNDED-INVENTORY both say "More ▾ collapses to CO + PO + Activity" but `/jobs/[id]/purchase-orders` is NOT currently in `moreBaseItems`. Plan-author resolves either by (a) adding the literal entry (1-line align with intent) OR (b) confirming PO is only reachable via the hidden `/financials/purchase-orders` (intent mismatch — surface to Jake).
