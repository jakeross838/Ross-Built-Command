# Setup complete — stage-f1-knowledge-graph-auth-wave-b-slice-2

**Status:** COMPLETE / READY FOR PLAN
**Completed:** 2026-05-21-1434 (slim authoring per nwrp206)
**EXPANDED-SCOPE:** `.planning/expansions/stage-f1-knowledge-graph-auth-wave-b-slice-2-EXPANDED-SCOPE.md` (RE-APPROVED 2026-05-21 per nwrp202)
**Inherits from:** `.planning/expansions/stage-f1-knowledge-graph-auth-wave-b-SETUP-COMPLETE.md` (Slice-1 closed 2026-05-15)

## Rationale — slim authoring per nwrp206

Slice-2 was bootstrapped as a continuation of stage-f1-knowledge-graph-auth-wave-b (Slice-1) and never received its own SETUP-COMPLETE artifact during initial setup. nwrp197 explicitly noted "setup verification (no-op)" for the original B-2 /np dispatch — meaning Slice-2 introduces NO NEW third-party / env-var / table dependency beyond Slice-1's baseline.

Preflight Check 2 (`/nx` step 1) flagged the missing artifact 2026-05-21-1434 (FAIL on 1-of-10 checks); the other 9 checks passed substantively. Per nwrp206 §1-5: authoring this slim file closes the process gap **honestly** (vs `--skip-preflight` override) AND structurally fixes the same gap for the remaining 6 Slice-2 plans (B-2b, B-3, B-4, B-5, B-6, B-7) so they preflight clean without per-dispatch overrides.

## Inheritance from Slice-1 SETUP-COMPLETE

Slice-1's setup (`.planning/expansions/stage-f1-knowledge-graph-auth-wave-b-SETUP-COMPLETE.md`) covered the following baseline infra. **All inherit unchanged to Slice-2:**

- **V1** npx supabase CLI accessible (2.98.2) — unchanged
- **V2** `HARNESS_FIXTURE_PASSWORD` env var set in `.env.local` — unchanged
- **V3** D-080 codified in MASTER-PLAN.md §10 — unchanged
- **V4** Wave-B prereq #12 smoke gate green (11/13 PASS; 2 failures = TD-WE-03 LOW) — unchanged baseline
- **V5** `NEXT_PUBLIC_AUTH_STATE_LISTENER` env-flag absent (Q5 dormant) — unchanged; per nwrp166 §11 distribute pattern, the unflag is a Slice-2 carry-forward but env-var-only, not setup-required pre-dispatch
- **V6** fixture-harness-org exists in production Supabase — unchanged (verified via Wave-E seed apply 2026-05-14)

**MANUAL items (validated at Slice-1 setup; revalidated at preflight 2026-05-21-1434):**
- Supabase CLI auth + project link → `supabase/.temp/linked-project.json` valid
- DB-password-based link (`supabase link --project-ref <ref> -p <password>`) → `npx supabase gen types typescript --linked` works
- supabase config.toml → 15029 bytes

## Slice-2 — no new prerequisite infrastructure

Per nwrp200/201/202 chain, B-2a (the first Slice-2 plan) introduces these new artifacts BUT all are **deliverables of B-2a's migration 00104**, NOT prerequisite infra that needs to exist before execute:

- `client_portal_access.client_id` column + composite FK invariant — created BY B-2a migration
- `clients(org_id, id)` composite UNIQUE — created BY B-2a migration
- `activity_log.actor_token_id` column — created BY B-2a migration (writes are B-2b scope)
- `owner_portal_rate_limit` counter table (DB-backed rate-limit per nwrp201/202 §3) — created BY B-2a migration; NOT preexisting infra. Per nwrp206 §14: "the DB-backed rate-limit counter table is new infrastructure introduced by B-2a itself (via its migration), not an inherited dependency."
- `revoked_seq` column (Latitude #3 Option A APPROVED) — created BY B-2a migration
- 3 RPC re-definitions (`create_client_portal_invite` + `submit_client_portal_message` + `mark_client_portal_message_read`) — re-defined BY B-2a migration; original 00074 bodies remain canonical until 00104 applies
- Index posture migration (DROP+CREATE non-partial `idx_client_portal_access_token_hash`) — applied BY B-2a migration

**No new third-party services** introduced by Slice-2 (DB-backed rate-limit per nwrp201/202 — explicitly REJECTED Vercel KV + Upstash because neither is provisioned and would add infra dependency to the portal critical path).

**No new env vars** introduced by Slice-2 (B-2a does not add Vercel KV/Upstash env vars; rate-limit cleanup uses internal DB function, no new third-party API key).

## Preflight VALIDATE re-confirmation (2026-05-21-1434)

The following preflight checks PASSED substantively at the Slice-2-level revalidation (re-running the same checks Slice-1 setup originally validated). These re-confirmations satisfy the substantive readiness bar that the missing SETUP-COMPLETE artifact would have established:

### Vercel env vars (12 variables, both environments)

Verified via `vercel env ls` on jakeross838s-projects/nightwork-platform:

| Env var | Production | Preview |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | ✓ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | ✓ |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | ✓ |
| `ANTHROPIC_API_KEY` | ✓ | ✓ |
| `STRIPE_SECRET_KEY` | ✓ | ✓ |
| `STRIPE_WEBHOOK_SECRET` | ✓ | ✓ |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✓ | ✓ |
| `RESEND_API_KEY` | ✓ | ✓ |
| `NEXT_PUBLIC_APP_URL` | ✓ | ✓ |
| `OPENAI_API_KEY` | ✓ | ✓ |
| `NOTIFICATION_FROM_EMAIL` | ✓ | ✓ |
| `VERIFICATION_BYPASS_SECRET` | — | ✓ |

All B-2a-required env vars present (B-2a uses `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` minimum).

### Supabase tables + RLS (6 B-2a-required tables)

Verified via `mcp__supabase__list_tables`:

| Table | Exists | RLS Enabled | Row Count |
|---|---|---|---|
| `client_portal_access` | YES | YES | 0 (awaiting B-2a invite flow) |
| `clients` | YES | YES | 26 |
| `jobs` | YES | YES | 26 |
| `activity_log` | YES | YES | 73 |
| `draws` | YES | YES | 3 |
| `change_orders` | YES | YES | 88 |

RLS posture on `client_portal_access` preserved per 00074:247-301. RESTRICTIVE policy on `activity_log` preserved per 00026:99-101.

### Drummond fixtures (Check 7)

`.planning/fixtures/drummond/` intact:
- `SUBSTITUTION-MAP.md`
- `source1-pdrive/`
- `source2-supabase/`
- `source3-downloads/`

Sufficient for B-2a's backfill canary (AC-B2a-13 sub-item 9) + AC-B2a-06 Query 2 RPC verification against Drummond job.

### Last QA verdict (Check 8)

`.planning/qa-runs/2026-05-20-1525-migration-00103-qa-report.md` — verdict **PASS** ship-ready (3-of-3 reviewers PASS; 0 BLOCKING). NOT a BLOCKING verdict; preflight clears.

## Slice-2 plan coverage (forward-looking)

This SETUP-COMPLETE applies to ALL 7 Slice-2 plans:

- **B-2a** (this dispatch) — Token-issuance security model. Infra requirements: SUBSET of Slice-1 baseline.
- **B-2b** — Read-only portal UI + audit. Infra requirements: SUBSET of Slice-1 baseline (consumes B-2a helpers).
- **B-3** — Soft-delete DB-trigger safety net + DEF-WC-1 + DEF-WC-3. Infra requirements: SUBSET of Slice-1 baseline (extends Slice-1 trigger infra).
- **B-4** — `activity_log.entity_type` TS union extension + write-site coverage + carry-forwards. Infra requirements: SUBSET of Slice-1 baseline.
- **B-5** — Magic-link + email-in primitive (Amendment 2). **DEPENDENCY**: Resend domain verified + DNS records (Slice-1 baseline). MANUAL-CHECKLIST item for B-5 dispatch confirms.
- **B-6** — Cost-code wipe-and-reseed + Amendment 3. Infra requirements: SUBSET of Slice-1 baseline (extends `.githooks/pre-commit`).
- **B-7** — RB org seed + Stripe test-mode sanity + EXPLAIN ANALYZE. **DEPENDENCY**: Stripe test-mode price IDs in Vercel env vars (Slice-1 baseline + MANUAL-CHECKLIST item; partial per Slice-1 SETUP). MANUAL-CHECKLIST item for B-7 dispatch confirms.

**Net:** all 7 Slice-2 plans dispatch against this SETUP-COMPLETE without per-dispatch override. The structural fix (per nwrp206 §5).

## Status

**COMPLETE — READY FOR PLAN**

All AUTO items: none (inherited from Slice-1; Slice-2 introduces no new AUTO setup).
All MANUAL items: validated (inherited from Slice-1; revalidated at preflight 2026-05-21-1434).
All VALIDATE checks: PASS (re-confirmed 2026-05-21-1434).

Re-run `/nx stage-f1-knowledge-graph-auth-wave-b-slice-2` per nwrp206 §16 — should now produce 10-of-10 preflight PASS.
