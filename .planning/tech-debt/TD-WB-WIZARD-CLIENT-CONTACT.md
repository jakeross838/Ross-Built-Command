# TD-WB-WIZARD-CLIENT-CONTACT — OnboardWizard client email/phone removal

**Origin:** F1-Wave-B Slice-1 B-1a-bis ITER-2-PATCHES §3.6 (design-pushback
C-3 + nwrp155 C7 disposition; DELIBERATE REGRESSION per Q1 PII fence).
**Severity:** LOW (org-onboarding flow; no production user affected today).
**Status:** Active — restoration ship requirement: Slice-2 Plan B-2 commit.
**Source decision:** nwrp155 C7 + design-pushback C-3 + Q1 nwrp153 PII fence.

## Summary

OnboardWizard Step 5 originally collected `client_name + client_email +
client_phone`. Post-B-1a-bis, Step 5 collects `client_name` only — wired to
`/api/jobs` POST as `client_name_for_create` (server-side find-or-create
against `clients` table). Email + phone fields REMOVED from the wizard form
per Q1 PII fence + Q2 A1 normalization.

## Why this is acceptable

1. **Wizard is org-onboarding scope** (org admin creates the org's first
   job), NOT client-onboarding scope. Client contact details are managed
   elsewhere (Slice-2 Owner Portal Path A's client invite flow OR an
   explicit `/api/clients/[id]` PATCH endpoint, both deferred to F3
   magic-link work).

2. **No production impact today.** Ross Built does NOT currently use Owner
   Portal magic-link invites (Path A scope deferred to F3). The email/phone
   fields in the wizard wrote to `jobs.client_email/phone` columns which
   B-1a-bis is REMOVING anyway. The fields would be dead data even if
   retained.

3. **2-week regression window bounded.** Slice-2 Plan B-2 ships Owner
   Portal Path A; B-2 plan-author MUST add the client-contact-collection
   flow at that time. If Slice-2 ships >2 weeks after Slice-1, that's still
   inside the Owner Portal feature being unbuilt today — no production
   user is affected.

## Restoration path (Slice-2 / F3)

Slice-2 Plan B-2 (Owner Portal Path A) adds client-contact-collection via
explicit `/api/clients/[id]` PATCH endpoint (admin-gated; sends to
clients.email/phone for magic-link delivery). Field re-appears in the
appropriate UX surface (NOT the org-onboarding wizard).

## Related entries

- `TD-B1abis-01` (job-sidebar mailto removal — same root cause; restoration
  via /api/clients/[id] GET in Slice-2 B-2).
- `.planning/runbooks/wave-b-slice-1-rollback.md` (rollback procedure).
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-b/B-1a-bis-clients-consumer-refactor-PLAN.md`
  §3.6 + §13.

## Verification at restoration ship

When Slice-2 B-2 ships, verify:
- [ ] `/api/clients/[id]` PATCH endpoint accepts `email` + `phone` body fields
- [ ] Endpoint is admin-gated (membership.role IN ('owner','admin'))
- [ ] OnboardWizard does NOT re-add email/phone (org-onboarding scope preserved)
- [ ] New client-management surface (e.g., `/people/clients/[id]/edit`)
      exposes email + phone fields with audit-log coverage
- [ ] Magic-link delivery uses `clients.email` (not `jobs.client_email`)
