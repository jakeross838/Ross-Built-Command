import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Surface Vercel's VERCEL_ENV system env var to the client bundle as
  // NEXT_PUBLIC_VERCEL_ENV. Vercel sets VERCEL_ENV automatically
  // ("production" on prod deploys, "preview" on PR/branch deploys,
  // "development" locally) but does NOT auto-prefix with NEXT_PUBLIC_;
  // explicit passthrough is required. Used by src/lib/supabase/client.ts
  // env-gated W.1 harness setSession bridge — without this, the gate
  // condition `process.env.NEXT_PUBLIC_VERCEL_ENV !== "production"` is
  // always true (undefined !== "production"), meaning the bridge runs
  // on every deploy. Per /nightwork-qa 2026-05-11 SECURITY M-1 +
  // nwrp90 GROUP 4. Actual risk was LOW (bridge needs valid token
  // pair to do anything) but documentation accuracy matters.
  env: {
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? "",
  },
  experimental: {
    // isomorphic-dompurify pulls in jsdom on the server side, and jsdom reads
    // its bundled default-stylesheet.css via fs.readFileSync at module-load
    // time. Webpack's bundling of jsdom rewrites that asset path so the file
    // ends up missing at runtime ("ENOENT: api/browser/default-stylesheet.css").
    // Externalizing the package keeps it as a runtime require from
    // node_modules so jsdom's __dirname lookup resolves correctly.
    serverComponentsExternalPackages: ["isomorphic-dompurify"],
  },
  async redirects() {
    return [
      // ── Existing rules (preserved; destinations updated to canonical
      //    Stage 1.5c paths per CONTEXT D-01 + D-20) ─────────────────────

      // Action-page-to-modal redirects (Tier 1).
      // Old standalone routes → parent page with ?action= that auto-opens the modal.
      // Per CONTEXT D-01 — destinations updated to /financials/bills (the
      // canonical Bills/Pay Apps path) and /people/vendors. The job-scoped
      // PO route stays under /jobs/[id]/purchase-orders/* (org-wide POs is
      // a placeholder at /financials/purchase-orders per Plan 4).
      { source: "/invoices/upload", destination: "/financials/bills?action=upload", permanent: true },
      { source: "/invoices/import", destination: "/financials/bills?action=import", permanent: true },
      { source: "/vendors/import", destination: "/people/vendors?action=import", permanent: true },
      { source: "/settings/cost-codes/import", destination: "/admin/cost-codes?action=import", permanent: true },
      { source: "/jobs/:id/purchase-orders/import", destination: "/jobs/:id/purchase-orders?action=import", permanent: true },

      // Cost Intelligence consolidation — legacy /items paths.
      // Per CONTEXT D-01/D-11 — destinations updated to /price-intel/* (the
      // canonical Price Intel path). /price-intel/cost-database is the closest
      // semantic match for /items in the new IA; F5 may revisit.
      { source: "/items", destination: "/price-intel/cost-database", permanent: true },
      { source: "/items/verification-queue", destination: "/price-intel/verification", permanent: true },
      { source: "/items/:id", destination: "/price-intel/cost-database/:id", permanent: true },

      // Platform admin CI consolidation — individual CI admin tools merged
      // into tabbed view. Per CONTEXT D-20 — destinations updated to
      // /platform-admin/cost-intelligence (since /admin/platform itself
      // now redirects to /platform-admin via the wildcard rule below).
      { source: "/admin/platform/items", destination: "/platform-admin/cost-intelligence", permanent: true },
      { source: "/admin/platform/pricing", destination: "/platform-admin/cost-intelligence?tab=pricing", permanent: true },
      { source: "/admin/platform/extractions", destination: "/platform-admin/cost-intelligence?tab=extractions", permanent: true },
      { source: "/admin/platform/classifications", destination: "/platform-admin/cost-intelligence?tab=classifications", permanent: true },

      // ── Stage 1.5c Bills/Pay Apps rename + section restructure ────────
      // Per CONTEXT D-01 + D-20 + nwrp44/nwrp45 — 32 legacy paths
      // 301-redirect to canonical 8-section IA. Half-rename = worse drift
      // than no rename.

      // /dashboard → /today (Today as personal home per Principle 7)
      { source: "/dashboard", destination: "/today", permanent: true },

      // /financial → /financials (consolidate; existing duplicate)
      { source: "/financial", destination: "/financials", permanent: true },
      { source: "/financial/:path*", destination: "/financials/:path*", permanent: true },

      // /financials/aging-report → /financials/aging (consistency)
      { source: "/financials/aging-report", destination: "/financials/aging", permanent: true },

      // /operations → /today (Operations dropdown removed; concerns split
      // between Today action items + per-job tabs + Wave 2 placeholders)
      { source: "/operations", destination: "/today", permanent: true },
      { source: "/operations/:path*", destination: "/today", permanent: true },

      // /cost-intelligence/* → /price-intel/* (Price Intel rename per D-11)
      { source: "/cost-intelligence", destination: "/price-intel", permanent: true },
      { source: "/cost-intelligence/lookup", destination: "/price-intel/cost-lookup", permanent: true },
      { source: "/cost-intelligence/codes", destination: "/admin/cost-codes", permanent: true },
      { source: "/cost-intelligence/scope-data", destination: "/price-intel", permanent: true },
      { source: "/cost-intelligence/suggestions", destination: "/price-intel", permanent: true },
      { source: "/cost-intelligence/conversions", destination: "/price-intel/cost-database", permanent: true },

      // /invoices → /financials/bills (Bills terminology rename per D-01)
      { source: "/invoices", destination: "/financials/bills", permanent: true },
      { source: "/invoices/queue", destination: "/financials/bills/queue", permanent: true },
      { source: "/invoices/qa", destination: "/financials/bills/qa", permanent: true },
      { source: "/invoices/payments", destination: "/financials/payments", permanent: true },
      { source: "/invoices/liens", destination: "/financials/lien-releases", permanent: true },
      // /invoices/:id (the per-invoice detail page) → /financials/bills/:id
      { source: "/invoices/:id", destination: "/financials/bills/:id", permanent: true },

      // /draws → /financials/pay-apps (Pay Apps terminology rename per D-01)
      { source: "/draws", destination: "/financials/pay-apps", permanent: true },
      { source: "/draws/:id", destination: "/financials/pay-apps/:id", permanent: true },
      { source: "/draws/:id/print", destination: "/financials/pay-apps/:id/print", permanent: true },

      // NOTE: the 1.5c IA "move CO detail under /financials" redirect was REMOVED
      // (nwrp290). The CO detail page lives at /change-orders/[id]; its destination
      // /financials/change-orders/[id] has no page AND is intentionally 404'd by the
      // FINANCIALS_F1_VIEWS middleware gate (org-wide F1 views hidden pre-launch), so
      // the redirect shadowed the live page behind a 404. The move re-lands in F1 when
      // FINANCIALS_F1_VIEWS ships the /financials/change-orders/[id] route.

      // /vendors → /people/vendors (move under People section)
      { source: "/vendors", destination: "/people/vendors", permanent: true },
      { source: "/vendors/:id", destination: "/people/vendors/:id", permanent: true },

      // /proposals/review/:extraction_id → /pipeline/proposals/review/:extraction_id
      { source: "/proposals/review/:extraction_id", destination: "/pipeline/proposals/review/:extraction_id", permanent: true },

      // /settings/* → /admin/* (Admin section rename per D-15 / Part 7 F)
      { source: "/settings", destination: "/admin", permanent: true },
      { source: "/settings/team", destination: "/admin/users", permanent: true },
      { source: "/settings/integrations", destination: "/admin/integrations", permanent: true },
      { source: "/settings/billing", destination: "/admin/billing", permanent: true },
      { source: "/settings/cost-codes", destination: "/admin/cost-codes", permanent: true },
      { source: "/settings/admin", destination: "/admin", permanent: true },
      { source: "/settings/internal-billings", destination: "/admin", permanent: true },
      { source: "/settings/usage", destination: "/admin", permanent: true },
      { source: "/settings/workflow", destination: "/admin/workflow-customization", permanent: true },
      { source: "/settings/financial", destination: "/admin", permanent: true },
      { source: "/settings/company", destination: "/admin", permanent: true },

      // /admin/platform → /platform-admin (Platform Admin badge target per D-09 + D-20)
      { source: "/admin/platform", destination: "/platform-admin", permanent: true },

      // ── iter-2 D-20 / D-058 — WILDCARD /admin/platform/:path* → /platform-admin/:path* ──
      // Per Decision B-modified (full /admin/platform → /platform-admin
      // migration in 1.5c). This wildcard mechanically covers all 13
      // existing sub-routes that Plan 6 mounts at /platform-admin/*
      // (audit, organizations, organizations/[id], users, users/[id],
      // feedback, feedback/[id], support, support/[id], items, items/[id],
      // cost-intelligence, cost-intelligence/* tabs).
      // Without this wildcard, existing bookmarks/deep-links to
      // /admin/platform/audit etc. would 404; users + Jake/Andrew would
      // lose access until Wave 1.1-Lite.
      //
      // SECURITY NOTE (T-1.5c-1-07): the wildcard sends users to
      // /platform-admin/*. Plan 6 Task 2 extends middleware regex to
      // gate /platform-admin/* with the same isPlatformAdmin check.
      // Plan 1's halt review provides the natural sequencing checkpoint
      // — Plan 1 + Plan 6 must both ship before any /admin/platform/*
      // user lands at unprotected /platform-admin/*.
      { source: "/admin/platform/:path*", destination: "/platform-admin/:path*", permanent: true },
    ];
  },
  webpack: (config) => {
    // pdfjs-dist has an optional "canvas" import used only for Node-side
    // rendering. We run PDF.js in the browser only, so tell webpack to
    // treat the missing module as an empty module.
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
};

// Wrap with Sentry so @sentry/nextjs can tree-shake the client SDK and
// (later) upload source maps. Source-map upload requires SENTRY_AUTH_TOKEN
// + project config — we intentionally leave that un-set here so local
// builds never try to upload.
export default withSentryConfig(nextConfig, {
  silent: true,
  // Don't attempt source-map upload until the auth token + project slug
  // are set in deploy-time env. Until then, just link error stack
  // traces via the in-browser SDK.
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  // Keep the automatic instrumentation on; it wraps server actions /
  // route handlers / etc. so no per-file boilerplate is needed.
  autoInstrumentServerFunctions: true,
  hideSourceMaps: true,
  disableLogger: true,
});
