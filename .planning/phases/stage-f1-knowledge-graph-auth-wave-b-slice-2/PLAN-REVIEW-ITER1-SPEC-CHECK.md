# Plan-review iter-1 spec-check -- B-2: Owner Portal Path A

**Reviewer:** nightwork-spec-checker  
**Date:** 2026-05-19  
**Plan:** B-2-PLAN.md  
**Spec:** EXPANDED-SCOPE.md section 7 row B-2  

---

## Acceptance criteria coverage matrix

All 19 ACs declared in frontmatter (AC-B2-01..AC-B2-19).

| # | Criterion | Falsifiable? | Verification in section 9 | Verdict |
|---|-----------|-------------|--------------------------|------|
| AC-B2-01 | Migration applies; forward-probe DO block emits zero exceptions | Yes | npx supabase db push + DO output | COVERED |
| AC-B2-02 | client_portal_access.client_id FK (client_portal_access_client_id_fkey) to clients(id) ON DELETE SET NULL | Yes | pg_constraint query | COVERED |
| AC-B2-03 | Partial unique index on (org_id, client_id) WHERE revoked_at IS NULL AND client_id IS NOT NULL | Yes | pg_indexes query | COVERED |
| AC-B2-04 | Drummond row backfilled; client_id matches jobs.client_id | Yes | JOIN query | COVERED |
| AC-B2-05 | Down-migration reverses cleanly; idempotent | Yes | Apply down + verify columns gone | COVERED |
| AC-B2-06 | activity_log.actor_token_id UUID FK ON DELETE SET NULL; index WHERE actor_token_id IS NOT NULL | Yes | information_schema + pg_indexes | COVERED |
| AC-B2-07 | logActivity() accepts actor_token_id; defensive guard when both user_id + actor_token_id provided | Yes | npm run test unit test | COVERED |
| AC-B2-08 | Acknowledgment endpoint idempotent; single row per token+draw_id; user_id=NULL, actor_token_id populated | Yes | SQL count query | COVERED |
| AC-B2-09 | Cross-client leak: Drummond-scoped API returns zero rows from other client | Yes | scripts/b-2-cross-client-probe.ts | COVERED |
| AC-B2-10 | Rate-limit: 10 bad-token requests in 5s returns 429 from request 6; uniform body | Yes | Curl loop in section 9 | COVERED |
| AC-B2-11 | Anon role has zero SELECT/INSERT/UPDATE/DELETE on client_portal_access | Yes | pg_policies query | COVERED |
| AC-B2-12 | Expired + revoked tokens return 404; generic message (no condition leak) | Yes | SQL expire-row + curl | COVERED |
| AC-B2-13 | Direct anon INSERT into activity_log returns RLS denial | Yes | scripts/b-2-anon-activity-log-probe.ts | COVERED |
| AC-B2-14 | 4-viewport Chrome walk: no horizontal scroll; logo top-left; touch targets >=44px (CTA >=56px); screenshots | Yes | Chrome DevTools manual | COVERED |
| AC-B2-15 | URL-tampering probe: /owner/{token}/pay-apps/{other-draw-id} returns Next 404 | Yes | Chrome DevTools + Network tab | COVERED |
| AC-B2-16 | client-combobox.tsx net diff <=15 lines; no inline boxShadow/style; hook sweep passes | Yes | git diff --stat + grep + hook | COVERED |
| AC-B2-17 | B-2-SUMMARY.md exists with commits, AC attestation, cost actual, follow-ups | Yes | test -f command | COVERED |
| AC-B2-18 | MASTER-PLAN.md TD-B1abis-03 row 297 marked CLOSED | Yes | grep -c | COVERED |
| AC-B2-19 | Smoke ROUTES extended; env-var skip; harness passes with SMOKE_OWNER_TOKEN_DRUMMOND | Yes | grep + harness run | COVERED |

All 19 ACs: FALSIFIABLE. All 19: explicit verification command present in section 9.

---

## EXPANDED-SCOPE section 7 deliverable checklist

| Requirement | Plan section | Verdict |
|---|---|---|
| client_portal_access.client_id FK (ON DELETE SET NULL) + backfill from jobs.client_id | section 4.a, Task 1, AC-B2-01..04 | COVERED |
| Partial unique index (org_id, client_id) WHERE revoked_at IS NULL | Task 1 migration step 4 (PLAN:396-406) | COVERED |
| PostgREST FK citation by name (client_portal_access_client_id_fkey) | AC-B2-02 + section 4.a | COVERED (Rule 2 satisfied) |
| Owner Portal Path A min UI at /owner/{token} -- mobile-mandatory | section 4.c, Task 3, AC-B2-14 | COVERED |
| Read-only progress + payment status | OwnerDashboardView + draws/change_orders queries in Task 3 | COVERED |
| Document downloads | Referenced in section 1 goal item 3; no dedicated task or AC | PARTIAL -- see W-1 |
| 1-2 owner-initiated audit integration points with actor_token_id | section 4.b, Task 2, Task 4, AC-B2-06..08 | COVERED (1 action: pay-app acknowledgment) |
| TD-B1abis-03 carry-forward (nwrp166 distribute pattern) | section 5 Task 5, AC-B2-16 | COVERED |
| Threat model severity: medium | section 6; 11 threats enumerated | COVERED |
| design-pushback reviewer in qa_reviewers | frontmatter qa_reviewers | COVERED |
| New Owner Status View PATTERNS.md entry -- conditional | section 1 + 4.c; deferred with TD-B2-01 | COVERED (correctly deferred) |

---

## Jake mandatory resolutions (per nwrp198 sections 16-20)

| Item | Requirement | Plan treatment | Verdict |
|---|---|---|---|
| 1 -- Token security model | Explicit decision; NO anon RLS; service-role pattern | section 4.a: 4-layer defense, rate-limit, preserved 00074 Scope decision #1; section 11 sign-off | COVERED |
| 2 -- actor_token_id audit integration | Explicit decision | section 4.b: schema, app-layer mutual exclusion, JSDoc enforcement; section 11 sign-off | COVERED |
| 3 -- Mobile-first UI | Mobile-mandatory; standalone layout | section 4.c: 320px floor, 4 viewports, 44/56px touch targets, data-direction wrapper, AC-B2-14 mandates screenshots | COVERED |

---

## 90-day vs 1-year deviation

EXPANDED-SCOPE Q5 line 221 states tokens have 1-year expiration as the existing 00074 pattern. This is factually incorrect.
Migration 00074 line 174: DEFAULT (now() + interval 90 days). Lines 489/540 confirm sliding-window extension is also 90 days.

PLAN section 4.a (PLAN:210) explicitly surfaces this as a plan-author-time correction and routes it to plan-review iter-1 + section 11 sign-off for Jake acknowledgement.

Verdict: CORRECTLY FLAGGED. Not silently chosen. Jake must sign off on 90-day preservation (or amend if 1-year is preferred as a separate D-### decision).

---

## Anti-scope check (per EXPANDED-SCOPE section 3)

| Deferred item | Plan treatment | Verdict |
|---|---|---|
| Full Owner Portal feature set (notifications, comments, signatures) | section 1 Out of scope explicit | CLEAN |
| Token lifecycle policy / rotation cadence | section 4.a defers to Wave 1.1-Lite | CLEAN |
| PII restoration (clients.email/phone) | section 1 Out of scope; D-079 fence preserved | CLEAN |
| PM contact info via owner portal | section 1 Out of scope; homeowner sees PM name only | CLEAN |
| Token revocation UI | section 4.a defers to Wave 1.1-Lite | CLEAN |
| Multi-region rate-limit upgrade | T-B2-06 accept disposition; Wave 1.1-Lite | CLEAN |

No anti-scope items pulled in.

---

## TD-B1abis-03 carry-forward preservation

EXPANDED-SCOPE section 7 + nwrp166 section 11 distribute pattern: TD-B1abis-03 lands in B-2.
PLAN section 5 Task 5 (lines 564-622) delivers this: replaces client-combobox.tsx lines 173-180 inline style and line 203 boxShadow.
Pre-execute violations confirmed at src/components/client-combobox.tsx:173, :201, :203 (verified by reading the file).
AC-B2-16 enforces <=15 line diff gate. MASTER-PLAN.md closure tied to AC-B2-18.

Verdict: COVERED.

---

## Domain rules spot-check

- Drummond fixtures used: YES -- B-2 demos against Drummond client_portal_access token + pay-app history (section 2, Task 3 verify block, AC-B2-04, AC-B2-09). SMOKE_OWNER_TOKEN_DRUMMOND env var used (token not committed to repo -- correct). Harness fixture probes use synthetic UUIDs per CLAUDE.md.
- Recalculate-not-increment honored: YES -- pay-app acknowledgment writes activity_log append-only; does NOT mutate draw.status; no stored counter incremented. (section 4.b: No state mutation on the draw itself.)
- Multi-tenant RLS posture: PASS -- 4-layer cross-client defense (PLAN:217-227); service-role API explicitly filters .eq(client_id).eq(org_id); no anon SELECT policy added; RESTRICTIVE RLS backstop preserved (AC-B2-11); URL-tampering scoped at sub-route level (AC-B2-15).
- Design tokens (no hardcoded colors): PASS -- Task 5 replaces inline boxShadow rgba() + inline style{fontFamily,color} with token utilities. New /owner/* JSX mandated token-only from day one (section 3 Sweep 5). Post-edit hook enforced. NOTE: --shadow-popover CSS var does not exist in globals.css; executor contingency path in Task 5 is the live path (see W-2).
- Audit log writes on every state change: PASS -- pay-app acknowledgment fires logActivity() with actor_token_id (Task 4); idempotent guard prevents duplicate rows (AC-B2-08); actor_token_id column added + indexed (AC-B2-06).

---

## halt_after: true confirmation

PLAN frontmatter line 9: halt_after: true (Tier 1 -- GATE per nwrp198 section 26)
PLAN section 11 line 914: "this PLAN halts at plan-review iter-1 for Jake review. Do NOT auto-/nx."
Section 11: 6 explicit Jake pre-/nx sign-off checkboxes.
Confirmed present and correct.

---

## Findings

### BLOCKING

None.

### WARNING

**W-1 -- Document download AC is absent (spec-scope gap; Jake decision required before /nx).**

EXPANDED-SCOPE section 7 B-2 row specifies "read-only progress + payment status + document downloads" as the minimum UI surface. PLAN section 1 goal item 3 also mentions "downloadable documents." However, no task delivers a document-download flow (no signed-URL generation in Task 3; no documents table query in the service-role API scope) and no AC verifies document download functionality. The existing OwnerDashboardView may or may not include download links -- untested by any B-2 AC.

If deferred: add to section 1 Out of scope list + open TD-B2-xx explicitly.
If in scope: executor adds task + AC before /nx.
Jake must decide before issuing /nx.

**W-2 -- --shadow-popover token does not exist; Task 5 contingency is the live path (executor awareness; does not block /nx).**

globals.css line 161 has a plain box-shadow rule as a bare CSS declaration, not a CSS custom property. No --shadow-popover var exists in globals.css or design-system.css. Task 5 anticipates this: "if --shadow-popover does not exist, replace with the cost-code-combobox idiom verbatim." However, cost-code-combobox.tsx does not apply any boxShadow to its dropdown. Executor must choose an idiom at Task 5 time.

Recommendation: use Tailwind shadow-sm or shadow-md (both token-safe). Resolve at Task 5 start before committing.

**W-3 -- Rate-limit in-process Map is per-Vercel-instance; AC-B2-10 tests single-instance only (accepted disposition; Jake awareness).**

T-B2-06 accepts this and defers to Wave 1.1-Lite. AC-B2-10 verifies via localhost (single-instance), sufficient for stated scope. Rate-limit guarantee weakens under multi-instance Vercel cold-start proliferation. No action required -- already documented in threat model.

### NOTE

**N-1 -- AC numbering cross-reference error in threat model.**

Threat rows T-B2-06 (PLAN:245) and T-B2-07 (PLAN:671) cite AC-B2-17 as the TD-B1abis-03 diff-line-count gate. The actual AC is AC-B2-16 (PLAN:753). The AC definition is correct; only the threat-table cross-references are off by one. No execution impact. Should be corrected in B-2-SUMMARY.md AC attestation table to avoid QA confusion at ship.

**N-2 -- /owner-portal/* co-existence with /owner/* is clean; executor awareness at middleware edit.**

middleware.ts line 7: PUBLIC_PATHS does not include /owner-portal (1.5c surface requires authenticated session -- correct). B-2 adds /owner to PUBLIC_PATHS. isPublic() at middleware.ts:32-34 uses startsWith(p+"/"), so /owner will NOT accidentally gate /owner-portal/* paths. Clean by construction. Executor should verify startsWith match at middleware edit time.

**N-3 -- EXPANDED-SCOPE Q5 line 221 wording is factually wrong (stale; plan correctly corrects it).**

EXPANDED-SCOPE Q5 line 221 says "1-year expiration (existing 00074 pattern)" but 00074 is 90-day sliding. The plan corrects this at section 4.a and section 11 sign-off resolves it for B-2. Optional: amend EXPANDED-SCOPE doc for future-reader clarity after B-2 ships.

**N-4 -- Two test scripts referenced in section 9 are absent from files_modified.**

scripts/b-2-cross-client-probe.ts (AC-B2-09) and scripts/b-2-anon-activity-log-probe.ts (AC-B2-13) appear as deliverables in section 9 verification commands but are not in frontmatter files_modified. Rule 6(c) path-reachability applies. scripts/ is git-tracked; no whitelist gap (low severity). Executor should add both paths to files_modified before execute dispatch.

---

## Verdict

**PASS -- with W-1 requiring Jake decision before /nx.**

All 19 ACs are falsifiable with explicit verification commands. Jake mandatory nwrp198 items (token security model, actor_token_id audit, mobile-first UI) are materially addressed in dedicated sections with sign-off checkboxes. TD-B1abis-03 carry-forward is preserved and bounded. The 90-day vs 1-year deviation is correctly surfaced for Jake acknowledgement -- not silently chosen. Anti-scope items are all cleanly deferred. halt_after: true is present and correctly enforced via section 11 dispatch authorization gate.

Jake must resolve W-1 (document downloads: explicitly deferred with TD, or in-scope requiring task + AC) before issuing /nx.
Section 11 sign-off checkboxes remain the gating mechanism for /nx dispatch. This spec-check does not substitute for that sign-off.
