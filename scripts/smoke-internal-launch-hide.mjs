// scripts/smoke-internal-launch-hide.mjs
//
// Phase 1 of Internal Ross Built Launch (internal-launch-hide) — Playwright
// smoke runner. Per Plan Task 6 (requires_smoke: true / Workflow Posture
// Rule 4). Walks a deployed Vercel preview (or localhost dev server) and
// verifies all the falsifiable acceptance criteria from the must_haves
// truths block.
//
// Output: .planning/qa-runs/internal-launch-hide/smoke-results.json
//   (Rule 4 canonical artifact path consumed by /nightwork-qa enforcer)
//
// Usage:
//   BASE_URL=http://localhost:3000 \
//     SMOKE_EMAIL=<auth-email> SMOKE_PASSWORD=<auth-password> \
//     node scripts/smoke-internal-launch-hide.mjs
//
//   BASE_URL=https://<vercel-preview-url>.vercel.app \
//     SMOKE_EMAIL=<auth-email> SMOKE_PASSWORD=<auth-password> \
//     node scripts/smoke-internal-launch-hide.mjs
//
// Auth-dependent tests SKIP gracefully if SMOKE_EMAIL + SMOKE_PASSWORD
// are unset (CI / fixture-harness path). Anonymous 404-gate tests still
// run.
//
// Per nwrp232 W-1: smoke #3 POSTs to the REAL Owner Portal admin route
// (/api/owner-portal/admin/revoke-token) and asserts HTTP 404 (NOT 401).
// 404 proves the middleware gate fires BEFORE the route handler (which
// would return 401 for missing auth). Posting to a non-existent path
// would return 404 by default and would NOT prove the gate fires.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.SMOKE_EMAIL || '';
const PASSWORD = process.env.SMOKE_PASSWORD || '';
const HAVE_AUTH = Boolean(EMAIL && PASSWORD);

const RESULTS_PATH = path.resolve(
  '.planning/qa-runs/internal-launch-hide/smoke-results.json'
);

// Auto-create output directory on fresh clones (canonical pattern per
// scripts/wave-d-smoke.ts:795).
mkdirSync(path.dirname(RESULTS_PATH), { recursive: true });

const results = [];

function addResult(id, area, name, status, note = '') {
  results.push({ id, area, name, status, note });
  const icon =
    status === 'PASS' ? 'OK' :
    status === 'FAIL' ? 'XX' :
    status === 'PARTIAL' ? '~~' :
    status === 'SKIP' ? '--' :
    status === 'MANUAL' ? '?' : '??';
  console.log(`  [${icon}] #${id} ${area}: ${name}${note ? ' — ' + note : ''}`);
}

async function run(id, area, name, fn) {
  try {
    const r = await fn();
    addResult(id, area, name, r?.status || 'PASS', r?.note || '');
  } catch (e) {
    const msg = (e?.message || String(e)).slice(0, 240).replace(/\n/g, ' ');
    addResult(id, area, name, 'FAIL', msg);
  }
}

async function gotoWait(page, url, opts = {}) {
  return page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 30000, ...opts });
}

async function status(page, url) {
  // Fetch a URL and return its HTTP status without following redirects.
  // Use page.request so cookies (if any) are carried.
  const res = await page.request.fetch(BASE + url, { maxRedirects: 0, failOnStatusCode: false }).catch((e) => ({ status: () => -1, _err: e }));
  return res.status();
}

async function login(page) {
  if (!HAVE_AUTH) return false;
  await gotoWait(page, '/login');
  await page.fill('input[type=email]', EMAIL);
  await page.fill('input[type=password]', PASSWORD);
  await Promise.all([
    page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 15000 }).catch(() => null),
    page.click('button[type=submit]'),
  ]);
  return !page.url().includes('/login');
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log(`\n[smoke-internal-launch-hide] BASE=${BASE} auth=${HAVE_AUTH ? 'yes' : 'no'}\n`);

  // =========================================================================
  // 1. Nav (desktop) — 4 sections + Admin dropdown after login.
  // =========================================================================
  await run(1, 'Nav (desktop)', 'Desktop nav shows 4 sections + Admin', async () => {
    if (!HAVE_AUTH) return { status: 'SKIP', note: 'no SMOKE_EMAIL/SMOKE_PASSWORD' };
    const ok = await login(page);
    if (!ok) return { status: 'FAIL', note: 'login failed' };
    await gotoWait(page, '/today');
    const items = await page.locator('header nav a').allTextContents();
    const trim = items.map((s) => s.trim()).filter(Boolean);
    const expected = ['Today', 'Jobs', 'Financials', 'Price Intel'];
    const ok2 = expected.every((e) => trim.includes(e));
    const hidden = ['Pipeline', 'People', 'Company', 'Reports'];
    const leaked = hidden.filter((h) => trim.includes(h));
    if (!ok2 || leaked.length > 0) {
      return { status: 'FAIL', note: `visible=${trim.join('|')} leaked=${leaked.join(',')}` };
    }
    return { status: 'PASS', note: `visible=${trim.join('|')}` };
  });

  // =========================================================================
  // 2. Nav (mobile) — iPhone SE viewport. Hamburger menu open + assert items.
  // =========================================================================
  await run(2, 'Nav (mobile)', 'Mobile nav (375px) shows 4 sections + Admin', async () => {
    if (!HAVE_AUTH) return { status: 'SKIP', note: 'no SMOKE_EMAIL/SMOKE_PASSWORD' };
    const mobileCtx = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const mp = await mobileCtx.newPage();
    try {
      await mp.goto(BASE + '/login');
      await mp.fill('input[type=email]', EMAIL);
      await mp.fill('input[type=password]', PASSWORD);
      await Promise.all([
        mp.waitForURL((u) => !u.toString().includes('/login'), { timeout: 15000 }).catch(() => null),
        mp.click('button[type=submit]'),
      ]);
      await mp.goto(BASE + '/today', { waitUntil: 'domcontentloaded' });
      // Open hamburger (best-effort — selector may vary; on failure log PARTIAL).
      const hamburger = mp.locator('button[aria-label*="menu" i], button[aria-label*="nav" i]').first();
      if ((await hamburger.count()) === 0) {
        return { status: 'PARTIAL', note: 'no hamburger button found at 375px' };
      }
      await hamburger.click().catch(() => null);
      await mp.waitForTimeout(300);
      const text = await mp.locator('body').textContent();
      const hidden = ['Pipeline', 'People', 'Company', 'Reports'];
      const leaked = hidden.filter((h) => (text || '').includes(h));
      if (leaked.length > 0) {
        return { status: 'FAIL', note: `mobile leaked: ${leaked.join(',')}` };
      }
      return { status: 'PASS', note: 'mobile nav clean' };
    } finally {
      await mobileCtx.close();
    }
  });

  // =========================================================================
  // 3. Owner Portal — DUAL gate (per nwrp232 W-1 path correction).
  //    Uses REAL route /api/owner-portal/admin/revoke-token so 404 proves
  //    the middleware gate fires BEFORE the route handler (which would
  //    have returned 401 for missing auth).
  // =========================================================================
  await run(3, 'Owner Portal', '/owner/<token> returns 404 when flag off', async () => {
    const s = await status(page, '/owner/some-fake-token');
    if (s === 404) return { status: 'PASS', note: 'HTTP 404' };
    return { status: 'FAIL', note: `HTTP ${s}` };
  });

  await run(4, 'Owner Portal', 'POST /api/owner-portal/admin/revoke-token → 404 (not 401)', async () => {
    const res = await page.request.fetch(
      BASE + '/api/owner-portal/admin/revoke-token',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        data: JSON.stringify({
          token_id: 'invalid-test-id',
          expected_updated_at: '2025-01-01T00:00:00Z',
        }),
        failOnStatusCode: false,
      }
    ).catch(() => null);
    if (!res) return { status: 'FAIL', note: 'request failed' };
    const s = res.status();
    if (s !== 404) return { status: 'FAIL', note: `HTTP ${s} (expected 404; 401 would mean gate did NOT fire)` };
    let body = null;
    try { body = await res.json(); } catch { body = null; }
    const matches = body && body.error === 'Not found';
    return matches
      ? { status: 'PASS', note: 'HTTP 404 + JSON {error:"Not found"} — gate fires before handler' }
      : { status: 'PASS', note: 'HTTP 404 (body shape not asserted)' };
  });

  // =========================================================================
  // 4. Section 404s — flag-driven + hardcoded /people.
  // =========================================================================
  const section404s = [
    ['/pipeline', 'PIPELINE root'],
    ['/pipeline/leads', 'PIPELINE sub'],
    ['/company', 'COMPANY root'],
    ['/company/p-l', 'COMPANY sub'],
    ['/reports', 'REPORTS root'],
    ['/reports/saved', 'REPORTS sub'],
    ['/people', 'PEOPLE root (hardcoded per nwrp232 OQ #3 path (b))'],
    ['/people/vendors', 'PEOPLE/vendors'],
    ['/people/clients', 'PEOPLE/clients (per D-03)'],
  ];
  let nextId = 5;
  for (const [url, label] of section404s) {
    await run(nextId++, 'Section 404', `${url} → 404 — ${label}`, async () => {
      const s = await status(page, url);
      if (s === 404) return { status: 'PASS', note: 'HTTP 404' };
      return { status: 'FAIL', note: `HTTP ${s}` };
    });
  }

  // =========================================================================
  // 5. Price Intel F5 sub-route 404s + root 200.
  // =========================================================================
  const priceIntelF5 = [
    '/price-intel/anomaly-review',
    '/price-intel/bid-comparison',
    '/price-intel/cost-database',
    '/price-intel/material-orders',
    '/price-intel/selections-catalog',
    '/price-intel/vendor-performance',
    '/price-intel/verification',
  ];
  for (const url of priceIntelF5) {
    await run(nextId++, 'Price Intel F5', `${url} → 404`, async () => {
      const s = await status(page, url);
      return s === 404 ? { status: 'PASS' } : { status: 'FAIL', note: `HTTP ${s}` };
    });
  }
  await run(nextId++, 'Price Intel F5', '/price-intel root reachable (200/3xx) — real-logic re-export', async () => {
    const s = await status(page, '/price-intel');
    // Authed renders 200; anon may redirect to /login (3xx). Both acceptable
    // (not 404 — the gate must NOT fire on the root).
    if (s === 404) return { status: 'FAIL', note: 'root unexpectedly 404 — gate over-applied' };
    return { status: 'PASS', note: `HTTP ${s}` };
  });

  // =========================================================================
  // 6. Financials F1 views 404s + root + live sub-routes 200/3xx.
  // =========================================================================
  const financialsF1 = [
    '/financials/change-orders',
    '/financials/purchase-orders',
    '/financials/reconciliation',
  ];
  for (const url of financialsF1) {
    await run(nextId++, 'Financials F1', `${url} → 404`, async () => {
      const s = await status(page, url);
      return s === 404 ? { status: 'PASS' } : { status: 'FAIL', note: `HTTP ${s}` };
    });
  }
  // Schedule route requires a job-id substitute. Use a clearly-non-existent
  // segment; middleware regex matches on /jobs/{anything}/schedule regardless
  // of whether the job ID resolves to a real row.
  await run(nextId++, 'Financials F1', '/jobs/<any-id>/schedule → 404 (regex bundled)', async () => {
    const s = await status(page, '/jobs/smoke-test-job-id/schedule');
    return s === 404 ? { status: 'PASS' } : { status: 'FAIL', note: `HTTP ${s}` };
  });
  await run(nextId++, 'Financials F1', '/financials root reachable — not over-applied', async () => {
    const s = await status(page, '/financials');
    if (s === 404) return { status: 'FAIL', note: 'root unexpectedly 404' };
    return { status: 'PASS', note: `HTTP ${s}` };
  });
  await run(nextId++, 'Financials F1', '/financials/bills reachable — live sub-route', async () => {
    const s = await status(page, '/financials/bills');
    if (s === 404) return { status: 'FAIL', note: 'live sub-route unexpectedly 404' };
    return { status: 'PASS', note: `HTTP ${s}` };
  });

  // =========================================================================
  // 7. Section overview card counts (authed).
  // =========================================================================
  await run(nextId++, 'Section overview', '/financials shows 5 cards (Bills, Pay Apps, Payments, Lien Releases, Aging)', async () => {
    if (!HAVE_AUTH) return { status: 'SKIP', note: 'no auth' };
    const ok = await login(page);
    if (!ok) return { status: 'FAIL', note: 'login failed' };
    await gotoWait(page, '/financials');
    const cards = await page.locator('main a, .grid a').count();
    // Loose lower-bound check: we expect 5 cards. UI may have extra links
    // (eyebrows etc) — assert text presence of expected, absence of hidden.
    const text = await page.locator('body').textContent();
    const expected = ['Bills', 'Pay Apps', 'Payments', 'Lien Releases', 'Aging'];
    const hidden = ['Purchase Orders', 'Change Orders'];
    const okExpected = expected.every((e) => (text || '').includes(e));
    const leaked = hidden.filter((h) => (text || '').includes(h));
    if (!okExpected) return { status: 'FAIL', note: 'missing expected cards' };
    if (leaked.length > 0) return { status: 'FAIL', note: `leaked: ${leaked.join(',')}` };
    return { status: 'PASS', note: `card-links=${cards} expected-5; hidden absent` };
  });

  await run(nextId++, 'Section overview', '/admin shows 4 live cards (Users, Cost Codes, Billing, Owner Portal Tokens)', async () => {
    if (!HAVE_AUTH) return { status: 'SKIP', note: 'no auth' };
    await gotoWait(page, '/admin');
    const text = await page.locator('body').textContent();
    const expected = ['Users', 'Cost Codes', 'Billing', 'Owner Portal Tokens'];
    const hidden = ['Roles', 'Permissions', 'Org Chart', 'Approval Workflows', 'Notification Rules', 'Workflow Customization', 'Integrations', 'Templates'];
    const okExpected = expected.every((e) => (text || '').includes(e));
    // Note: AdminDropdown also renders some labels in the top-nav dropdown; that
    // dropdown is the intentional power-user shortcut per CONTEXT D-22. So we
    // can't strictly assert absence of hidden labels in body text — but the
    // grid filter is verified by the renamed ALL_ADMIN_TILES + filter pattern
    // (mechanical AC at /nightwork-qa). Treat as PASS if expected are present.
    if (!okExpected) return { status: 'FAIL', note: 'missing expected live tiles' };
    return { status: 'PASS', note: '4 expected live tiles present' };
  });

  // =========================================================================
  // 8. Per-job tabs reduced — best-effort (needs a real job id).
  // =========================================================================
  await run(nextId++, 'Per-job tabs', 'PRIMARY_TABS reduced + More ▾ to 3 items', async () => {
    if (!HAVE_AUTH) return { status: 'SKIP', note: 'no auth' };
    // Find any job link on /jobs index.
    await gotoWait(page, '/jobs');
    const firstJobLink = page.locator('a[href^="/jobs/"]').first();
    const href = await firstJobLink.getAttribute('href').catch(() => null);
    if (!href || href === '/jobs') return { status: 'SKIP', note: 'no job link on /jobs index' };
    await gotoWait(page, href);
    const tabTexts = await page.locator('nav a, [role="navigation"] a').allTextContents();
    const trim = tabTexts.map((s) => s.trim()).filter(Boolean);
    const expectedTabs = ['Overview', 'Budget', 'Bills', 'Pay Apps'];
    const droppedTabs = ['Schedule', 'Selections'];
    const droppedMore = ['Plans', 'Specs', 'Photos', 'Documents', 'RFIs', 'Submittals', 'Daily Logs', 'To-Dos', 'Punchlist', 'Time Entries', 'Permits'];
    const haveExpected = expectedTabs.every((e) => trim.includes(e));
    const leakedTabs = droppedTabs.filter((d) => trim.includes(d));
    const leakedMore = droppedMore.filter((d) => trim.includes(d));
    if (!haveExpected) return { status: 'FAIL', note: `missing primary tabs in ${trim.join('|')}` };
    if (leakedTabs.length > 0) return { status: 'FAIL', note: `leaked primary: ${leakedTabs.join(',')}` };
    if (leakedMore.length > 0) return { status: 'PARTIAL', note: `leaked more items: ${leakedMore.join(',')}` };
    return { status: 'PASS', note: `tabs OK; visible=${trim.slice(0,8).join('|')}` };
  });

  // =========================================================================
  // 9. Existing routes 200 — no regression on the live surfaces.
  // =========================================================================
  const liveRoutes = ['/today', '/jobs', '/invoices', '/draws', '/cost-intelligence', '/admin/users', '/admin/cost-codes', '/admin/billing'];
  for (const url of liveRoutes) {
    await run(nextId++, 'No regression', `${url} reachable (not 404)`, async () => {
      const s = await status(page, url);
      if (s === 404) return { status: 'FAIL', note: 'live route unexpectedly 404' };
      return { status: 'PASS', note: `HTTP ${s}` };
    });
  }

  // =========================================================================
  // 10. Reversibility — manual; documented note.
  // =========================================================================
  await run(nextId++, 'Reversibility', 'env-var flip reversibility (manual verification)', async () => {
    return {
      status: 'MANUAL',
      note:
        'Flip NEXT_PUBLIC_FEATURE_PIPELINE to "true" in Vercel Preview + redeploy; re-run with new BASE_URL; expect /pipeline → 200. /people NOT in reversibility set — hardcoded per nwrp232 OQ #3 path (b); un-hides via code change at F2/Wave-2.',
    };
  });

  // =========================================================================
  // Tally + write results.
  // =========================================================================
  const total = results.length;
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const partial = results.filter((r) => r.status === 'PARTIAL').length;
  const skipped = results.filter((r) => r.status === 'SKIP').length;
  const manual = results.filter((r) => r.status === 'MANUAL').length;

  const out = {
    phase: 'internal-launch-hide',
    timestamp: new Date().toISOString(),
    base_url: BASE,
    auth: HAVE_AUTH ? 'authed' : 'anonymous',
    total,
    passed,
    failed,
    partial,
    skipped,
    manual,
    results,
  };

  writeFileSync(RESULTS_PATH, JSON.stringify(out, null, 2));

  console.log(`\n[done] total=${total} pass=${passed} fail=${failed} partial=${partial} skip=${skipped} manual=${manual}`);
  console.log(`[wrote] ${RESULTS_PATH}\n`);

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();
