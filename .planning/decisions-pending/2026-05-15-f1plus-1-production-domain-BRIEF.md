---
type: decision-brief
status: PENDING JAKE
authored: 2026-05-15 NIGHT
authored_by: orchestrator (claude-opus-4-7[1m]) under nwrp165 weekend Option A deliverable #4
authorization: nwrp165 weekend scope + nwrp167 sequential autonomous execution
prerequisite_for: Wave-B Slice-2 B-5 Resend webhook URL stability; B-7 Stripe production webhook URL; Wave 1.1-Lite Owner Portal Path A homeowner email links
inherits_from: F1+-1 reference in F1 umbrella EXPANDED-SCOPE §513; Q10 A (Stripe defer); B-5 / B-7 dependencies in Slice-2 EXPANDED-SCOPE
---

# F1+-1 Production Domain — decision brief

**Question for Jake:** what domain does Nightwork run on once Wave-B Slice-2 ships (B-5 Resend webhook + B-7 Stripe + Wave 1.1-Lite Owner Portal homeowner email links)? Three candidates have different cost / trust / commercial-readiness profiles.

This brief is investigative. It surfaces tradeoffs so the decision can land before Wave 1.1-Lite launches; no D-### entry written tonight, no domain registered, no DNS records configured.

## §1 — What this decision affects

| Surface | Domain dependency | When it bites |
|---|---|---|
| Resend webhook receiver (`/api/email-in/webhook`) | Resend dashboard accepts any HTTPS URL but signs events for the configured destination URL. Stable production URL preferred over Vercel preview URL (changes per deploy). | B-5 ships in Slice-2 (next slice). |
| Resend domain for SENDING (DKIM/SPF) | Sending domain MUST be verified in Resend; sending from a domain you don't control is impossible. Vercel.app is not configurable for DKIM. | B-5 magic-link primitive depends on a sending domain. |
| Stripe webhook URL | Stripe dashboard pins webhook URL per environment. Vercel preview URLs change per deploy; production webhook must point at a stable URL. | B-7 Stripe test-mode → cutover deferred to Wave 1.1-Lite OR commercial-launch per Q10 A. |
| Owner Portal Path A homeowner email links | Tokenized URLs sent to Drummond-class homeowners via email. URL shape matters for trust signal — homeowners receiving `https://nightwork-platform-6rs4cd2r3-jakeross838s-projects.vercel.app/owner/{token}` will not click. | B-2 Slice-2 (ship next slice) IF B-2 emails owners in the slice; otherwise Wave 1.1-Lite when real Drummond homeowner usage starts. |
| Brand trust signal | Future commercial-tenant onboarding (Builder 20 Club, etc.) sees the URL as a credibility cue. | Wave 4 commercial-readiness; not Wave 1.1-Lite blocking. |
| Marketing surface | nightwork.build = "this is a product Jake's building." vercel.app = "this is a Vercel-hosted project." | Pre-Wave 4 commercial launch. |

**Wave 1.1-Lite blocking dependency:** YES — Owner Portal Path A homeowner-facing emails need a stable, trustworthy domain. Vercel.app preview URLs are unworkable for homeowner trust.

## §2 — Three candidate options

### Option A — Register and use `nightwork.build`

**Posture:** purchase the .build TLD (common for dev-tools/SaaS products; aligned with Nightwork brand trajectory per VISION.md); configure as production primary domain on Vercel.

**Tradeoffs:**
- ✓ Best for commercial trajectory (Builder 20 Club, future enterprise tenants).
- ✓ Owner Portal email links carry full brand trust.
- ✓ Resend DKIM/SPF setup on a domain Jake owns.
- ✓ Stripe webhook URL stable across deploys.
- ✓ Independent of any other Jake property (clean separation from rossbuilt.com or personal dev domains).
- ✗ Cost: domain registration ~$15-50/year (.build TLD is in the $15-30 range typically).
- ✗ Time: DNS propagation + Vercel domain setup ~1-2 hours of Jake's time.
- ✗ Commits to "Nightwork" as the product name long-term. (Per VISION.md the name is canonical; no reservation here.)

**Estimated effort:** 1-2 hours Jake-side (registrar purchase + Vercel domain wire + DNS setup + Resend domain verification + Stripe webhook URL update). One-time.

### Option B — Subdomain on existing Jake-owned property

**Posture:** use a subdomain like `app.rossbuilt.com` (if RB's domain is available to Jake) OR `nightwork.jakeross.dev` (if Jake has a personal dev TLD).

**Tradeoffs:**
- ✓ Zero marginal cost (uses existing domain).
- ✓ Fast setup (DNS records on existing zone).
- ✓ Easier rollback (drop subdomain, parent stays).
- ✗ Brand confusion: `app.rossbuilt.com` reads as "Ross Built's internal app" — confusing for commercial-tenant onboarding later.
- ✗ Owner Portal homeowners see `rossbuilt.com` (or `jakeross.dev`) instead of `nightwork.build`; mixes the brand message.
- ✗ Future migration cost when Nightwork goes commercial — re-pointing all emails, rebuilding trust signals.
- ✗ Tied to parent domain's reputation (DKIM/SPF inheritance complications).

**Estimated effort:** 30 min Jake-side (DNS records only).

### Option C — Defer; stay on Vercel.app for RB internal use through Wave 1.1-Lite

**Posture:** RB is internal-only; Vercel-generated `nightwork-platform.vercel.app` is acceptable for the small internal user set (Jake, Andrew, Diane, 6 PMs, Lee). Defer production domain decision to commercial-launch trigger (first paying customer asks).

**Tradeoffs:**
- ✓ Zero cost.
- ✓ Zero setup time.
- ✓ Preserves option-value (don't commit to nightwork.build name lock-in).
- ✗ **Blocks Owner Portal Path A homeowner-facing surfaces.** Drummond homeowners cannot reasonably be sent links to a `vercel-platform-<hash>-jakeross838s-projects.vercel.app` URL. This option requires B-2 Owner Portal Path A to ship WITHOUT sending homeowner emails (UI-only, surfaced via admin sharing a link — not the canonical homeowner-receives-email-link flow per ARCHITECTURE.md §8).
- ✗ Blocks Stripe production cutover indefinitely.
- ✗ Blocks magic-link primitive from being useful in production (DKIM/SPF on vercel.app is impossible).
- ✗ Pushes the production-domain decision into Wave 1.1-Lite when usage pressure is higher and the surface is bigger.

**Estimated effort:** 0 hours. Defers the work.

## §3 — Recommendation

**Pick Option A — register `nightwork.build`.**

Reasoning:
1. **Cost is trivial.** $15-50/year is negligible against Slice-2's $200 ceiling, let alone any commercial trajectory.
2. **Wave-B Slice-2's B-5 (magic-link + email-in) and B-2 (Owner Portal) both depend on a stable production domain.** Deferring to Option C means shipping Slice-2 with crippled magic-link (can't send-from-vercel.app) + crippled Owner Portal (can't email homeowner the URL). That defeats Q4b's "minimum-viable Owner Portal Path A" — minimum-viable still includes the homeowner getting a link.
3. **VISION.md commits to "Nightwork" as the product name.** Option A reflects that commitment; Option B (subdomain on personal domain) leaves the brand-name decision ambiguous; Option C defers indefinitely.
4. **DKIM/SPF/DMARC needs a domain you control.** Resend won't sign emails from `*.vercel.app` (you don't own the parent domain). This is technical, not preferential.

**Edge case for Option B:** if Jake has a strong preference to delay the `nightwork.build` name (e.g., name change considered), Option B on `nightwork.jakeross.dev` (if Jake owns `jakeross.dev`) preserves the SSO/DKIM technical requirements without name lock-in. But this is structurally Option A with a different domain string.

**Sub-decision if Option A is picked:** registrar choice (Cloudflare Registrar = lowest fees, no markup; Namecheap = friendly UX; Google Domains migrating to Squarespace = use elsewhere). **Recommend Cloudflare Registrar** — Cloudflare DNS is already a common Vercel companion; one less vendor; no upsell on whois privacy (it's free); transparent pricing.

## §4 — Decision sequence if Option A picked

1. Register `nightwork.build` at Cloudflare Registrar (~15 min, ~$30/year).
2. Set Cloudflare as nameservers (default with Cloudflare Registrar).
3. Add `nightwork.build` as production domain in Vercel project settings; configure SSL certificate (Vercel auto-issues via Let's Encrypt).
4. Add Resend DKIM + SPF + DMARC records to Cloudflare DNS per Resend dashboard guidance; verify domain in Resend.
5. Update `NEXT_PUBLIC_APP_URL` env var in Vercel Production + Preview to `https://nightwork.build`.
6. (Future Wave 1.1-Lite cutover) Update Stripe production webhook URL to `https://nightwork.build/api/webhooks/stripe`.
7. (Future) Update Slack/Sentry/etc. integrations pointing at app URL.

## §5 — Wave 1.1-Lite blocking summary

| Dependency | Status |
|---|---|
| Wave-B Slice-2 B-2 Owner Portal Path A homeowner email link | **BLOCKING — needs Option A or B** before B-2 dispatches email surfaces. |
| Wave-B Slice-2 B-5 Resend webhook + sending domain | **BLOCKING — needs Option A or B** for DKIM/SPF. |
| Wave-B Slice-2 B-7 Stripe production webhook URL | NOT BLOCKING — B-7 ships test mode only per Q10 A. Production cutover deferred to Wave 1.1-Lite. |
| Wave 1.1-Lite Builder 20 Club launch | **BLOCKING — needs Option A or B** for credible commercial-tenant surface. |
| Wave 4 commercial readiness | BLOCKING per Wave 1.1-Lite blocker — same answer. |

**Recommendation:** Pick Option A (`nightwork.build`); register at Cloudflare Registrar; complete DNS + Resend + Vercel setup BEFORE Slice-2 B-5 dispatches. Estimated 1-2 hours Jake-side; ~$30 first-year cost.
