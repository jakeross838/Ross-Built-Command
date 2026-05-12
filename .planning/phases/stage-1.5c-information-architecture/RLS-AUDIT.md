# RLS audit — Stage 1.5c Information Architecture

## Re-audit context

Prior audit: 2026-05-11 — verdict PASS (no DB/RLS concerns).
This re-audit: 2026-05-11 — post GATE-B.1 autofixes, HEAD 7fa0725.

Four fix groups reviewed:
- GROUP 1 (commit 96484db): 7 layout.tsx files only — AppShell wrappers for section overview pages
- GROUP 2 (commit 20d6ef5): PlaceholderWave type addition, JSX scope wraps on 43 placeholder pages, className fix, comment update — no DB code
- GROUP 3 (commit 9ef5dab): StatusBadge refactor to NwBadge in admin/billing/page.tsx — UI only
- GROUP 4 (commit 7fa0725): next.config.mjs env passthrough for NEXT_PUBLIC_VERCEL_ENV — build config only

## Migrations reviewed

None — no supabase/migrations files were touched in the 4 fix commits.
Most recent migrations on branch: 00091, 00092, 00093 (unchanged, already audited in prior pass).

## API routes reviewed

None — no src/app/api/ files were created or modified in the 4 fix commits.

## Checks

| Check | Verdict | Evidence |
|-------|---------|----------|
| New tables: RLS enabled | N/A | No CREATE TABLE in any fix commit |
| New tables: at least one policy | N/A | No migrations touched |
| New API routes: getCurrentMembership before DB access | N/A | No API routes created or modified |
| New API routes: org_id filter on every query | N/A | No API routes created or modified |
| Hardcoded ORG_ID fallback | PASS | grep -nE "(const\|let\|var)\s+ORG_ID\s*=" src/ — zero matches |
| Soft-delete only | N/A | No DB mutations in any fix commit |
| status_history appends | N/A | No DB mutations in any fix commit |

## Findings

### BLOCKING

None.

### WARNING

None.

### NOTE

- GROUP 4 (next.config.mjs): The NEXT_PUBLIC_VERCEL_ENV passthrough closes the W.1 harness bridge gate documentation gap. The bridge at src/lib/supabase/client.ts gating on `process.env.NEXT_PUBLIC_VERCEL_ENV !== "production"` was previously always true (undefined !== "production"), meaning the harness setSession code ran on every deploy including production. The fix inlines the correct value at build time. No tenant data path, no RLS surface, no org_id involvement — pure build config. Security reviewer assessed actual exploit risk as LOW (bridge requires a valid token pair the attacker would already possess), and this audit concurs. The env passthrough is correct and closes the gate as designed.
- All 4 fix groups are UI/config changes only. The RLS posture established by the prior audit is entirely unaffected.
- No new tenant tables, no new API routes, no migration changes, no hardcoded ORG_IDs, no hard deletes, no cross-tenant joins introduced.

## Verdict

PASS
