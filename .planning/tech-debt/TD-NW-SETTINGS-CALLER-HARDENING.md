# TD-NW-SETTINGS-CALLER-HARDENING — LOW-tier getWorkflowSettings callers

**Origin:** PART-2B caller classification (nwrp277 addition 3) → nwrp278 §6 disposition ("file as one TD entry, not a fix wave").
**Severity:** LOW (no financial-control bypass; friction/limit drift only).
**Captured:** 2026-06-12.

## Scope

The enforcement-grade callers are CLOSED (action route F2A-2 `804f80e`; batch-action F2B-1 this wave). Display-only callers need nothing. These LOW sites remain on the legacy silent-fallback path — on a settings read error they evaluate against code defaults:

| Caller | Behavior on read error | Why LOW |
|---|---|---|
| `src/lib/invoices/save.ts:427` (save-time duplicate FLAGGING) | detection re-enabled at 'moderate' for orgs that disabled it | fail-STRICT direction — extra flags create dismissal friction, never bypass a control |
| `src/app/api/invoices/import/upload/route.ts:44` | org batch-size cap / auto-route threshold replaced by defaults (50 / 85) | wrong limits for one request window; no approval-gate involvement |
| `src/lib/invoices/bulk-import.ts:254` | same as above | same |

## Resolution shape (when picked up)

Thread `{ failClosed: true }` + a caller-appropriate failure response (flag-nothing-and-warn for save.ts; 422 for the import routes), or — cheaper — give `getWorkflowSettings` a `failStrict` variant that returns the STRICTEST configuration on read error instead of defaults. Decide at pickup; not worth a wave now.

## Lifecycle

Non-blocking for dogfood. Natural host: the F2-era settings/roles work, or any wave already touching these files. Display-only callers (`workflow-settings` GET/PATCH, `settings/workflow` page, draw export/cover-letter template reads) are CLOSED with no action per nwrp278.
