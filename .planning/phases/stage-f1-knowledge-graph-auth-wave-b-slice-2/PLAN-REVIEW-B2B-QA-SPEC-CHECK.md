# Spec check -- B-2b: Owner Portal Read-only UI + Audit Integration

Auditor: nightwork-spec-checker
Date: 2026-05-22
Commits: e5644f7..008f621 (10 commits per SUMMARY)
Deploy: https://nightwork-platform.vercel.app (dpl_6GEt5X2CsBpyPpeavjntGH3a6MPq)

---

## Acceptance Criteria

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| AC-B2b-01 | Migration 00106 TOCTOU dedupe unique index applied | COVERED | supabase/migrations/00106_b2b_activity_log_ack_dedupe.sql:14-16 |
| AC-B2b-02 | /owner route renders with BLK-3 data-prototype wrappers | COVERED | src/app/owner/[token]/page.tsx:230 data-prototype=owner-dashboard; pay-apps/[id]/page.tsx:138 data-prototype=owner-draw |
| AC-B2b-03 | Cross-client probe PASS -- assertDrawBelongsToToken returns false for cross-client draw | COVERED | route.ts:119 assertDrawBelongsToToken before audit write; SUMMARY SQL probe would_assert_true=false per nwrp210 sec12 |
| AC-B2b-04 | Error boundary -- 3 failure modes -> 404 + data-error anchor | COVERED | not-found.tsx:18 + error.tsx:28 both carry data-error=owner-portal-invalid-token; page.tsx:183-185 notFound() on null |
| AC-B2b-05 | Acknowledge writes correct activity_log row shape | COVERED | route.ts:142-151 logActivity(entity_type=draw, action=acknowledged, user_id=null, actor_token_id=resolved.portal_access_id); activity-log.ts:81 acknowledged in union |
| AC-B2b-06 | TOCTOU probe -- 2 concurrent POSTs -> 1 audit row | COVERED | activity-log.ts:163-172 catch SQLSTATE 23505 + silent no-op when onConflictDoNothing===true; probe COUNT=1 on localhost |
| AC-B2b-07 | ClientCombobox shadow-[var(--shadow-panel)]; no --shadow-popover | COVERED | client-combobox.tsx:204 shadow-[var(--shadow-panel)] present; inline boxShadow absent per SUMMARY grep |
| AC-B2b-08 | Touch targets >=56px (TD-20 exemption + min-h-[56px]) | COVERED (LOCAL) | AcknowledgePayAppButton.tsx:69 min-h-[56px] in className; Playwright multi-viewport deferred to Vercel |
| AC-B2b-09 | Mobile viewport renders correctly | DEFERRED | Smoke harness extension committed; full run awaits Vercel + HARNESS_FIXTURE_OWNER_TOKEN per TD-B2b-01 |
| AC-B2b-10 | Revocation probe: ephemeral -> 200 dashboard -> revoke -> 404 no-wrapper | PASS (PRODUCTION) | Canonical Production runtime per nwrp212 sec15: 5 steps all PASS. Forward-carried AC-B2a-08 closed. |

---

## Spec Deliverables

- [x] Migration 00106 partial unique index -- COVERED
- [x] /owner/{token} dashboard route -- COVERED (src/app/owner/[token]/page.tsx)
- [x] /owner/{token}/pay-apps/{id} drilldown -- COVERED (src/app/owner/[token]/pay-apps/[id]/page.tsx)
- [x] AcknowledgePayAppButton -- COVERED (src/app/owner/[token]/pay-apps/[id]/AcknowledgePayAppButton.tsx)
- [x] POST /api/owner-portal/acknowledge-pay-app -- COVERED (src/app/api/owner-portal/acknowledge-pay-app/route.ts)
- [x] activity-log.ts onConflictDoNothing flag -- COVERED (src/lib/activity-log.ts:119,140-173)
- [x] Error + not-found boundaries -- COVERED (src/app/owner/error.tsx, src/app/owner/not-found.tsx)
- [x] Owner layout (no auth nav) -- COVERED (src/app/owner/layout.tsx)
- [x] PUBLIC_PATHS middleware extension -- COVERED (src/middleware.ts:41)
- [x] ClientCombobox shadow token fix -- COVERED (src/components/client-combobox.tsx:204)
- [x] Smoke harness + fixture seed extensions -- COVERED (scripts/wave-d-smoke.ts, scripts/fixtures/smoke-seed.sql)
- [ ] AC-B2b-09 multi-viewport Playwright run -- DEFERRED (TD-B2b-01)

---

## Domain Rules Spot-Check

- Drummond fixtures used: N/A -- owner portal uses Caldwell fixture shape; smoke probes use synthetic seeded UUIDs. No Drummond real-client data in probe scripts.
- Recalculate-not-increment honored: yes -- no stored running totals; draw amounts read from existing draws.* columns; assertDrawBelongsToToken is read-only scope validation.
- Multi-tenant RLS posture: pass -- getScopedOwnerPortalClient(resolved) injects (org_id, client_id, job_id) BY CONSTRUCTION; N-5 grep gate 0 hits in src/app/owner/; acknowledge route uses logActivity only after token resolution + cross-client assertion.
- Design tokens (no hardcoded colors): pass -- AcknowledgePayAppButton.tsx:69 uses CSS var tokens throughout; client-combobox.tsx:204 uses shadow-[var(--shadow-panel)]; no hex literals in B-2b files.
- Audit log writes added on every state change: pass -- logActivity called on every acknowledge POST (entity_type=draw, action=acknowledged, actor_token_id populated, user_id=null); TOCTOU dedupe ensures 1 row on double-tap.

---

## Findings

### BLOCKING
None.

### WARNING
1. AC-B2b-09 DEFERRED -- mobile viewport runtime not verified on Vercel. Smoke harness committed; no Playwright multi-viewport run against production deploy. Per Workflow Rule 1, UI-touching plans require deployed-surface verification. Explicit deferral acknowledged; does not block ship. TD-B2b-01 must land before next B-2x plan touching mobile owner-portal surfaces.
2. AC-B2b-08 touch-target Playwright audit DEFERRED. scripts/b-2b-touch-target-probe.ts committed but not run against Vercel. min-h-[56px] confirmed at code level. Same prerequisite as AC-B2b-09.

### NOTE
1. Three Rule 1 bugs fixed during execute: activity-log.ts upsert rewrite (partial-index ON CONFLICT limitation), not-found.tsx added (Next.js notFound() convention), revocation probe job_id switched (00104 unique constraint collision). All fixes correct and documented in SUMMARY.
2. Slight cost overrun (~ over high estimate). Actual ~4-28 vs estimate 7-25. Within 0 per-plan halt gate (Rule 7d).
3. AC-B2b-10 forward-carried closure. AC-B2a-08 formally closed via Production runtime probe per nwrp212 sec15. B-2a-SUMMARY.md status flip (DEFERRED-TO-QA -> PASS) is custodian task per SUMMARY sec14.

---

## Verdict

PASS (with deferred items)

AC-B2b-01 through AC-B2b-08 covered by shipped code with line-level evidence. AC-B2b-10 PASS on Production runtime per canonical nwrp212 sec15 probe. AC-B2b-09 intentionally deferred with TD-B2b-01 tracking. No blocking findings. Two warnings (AC-B2b-08 + AC-B2b-09) are acknowledged scope decisions, not spec violations.

Forward-carried AC-B2a-08: CLOSED. Production runtime probe confirmed.

B-3 dispatch gate: UNBLOCKED pending TD-B2b-01 custodian task (HARNESS_FIXTURE_OWNER_TOKEN provisioning in Vercel env).
