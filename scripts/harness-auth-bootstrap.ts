// scripts/harness-auth-bootstrap.ts
//
// Y.1.B implementation (per stage-1.5c-verification-harness nwrp82).
//
// Performs a real Nightwork login on a Vercel preview URL via Playwright,
// then dumps the resulting browser context's storageState (cookies +
// localStorage + IndexedDB) to a JSON file. The verification harness
// (Layer 1 dom-assertions + Layer 3 runner) loads this state via
// `browser.newContext({ storageState: HARNESS_AUTH_STATE_PATH })` so
// every harness page navigation carries a fully-hydrated authenticated
// session — including the client-side state that @supabase/ssr's
// `createBrowserClient` populates after a real form-submit login.
//
// Replaces the prior Y.2 cookie + localStorage injection approach
// (commits 7ea7ca4 + earlier) which only populated server-side cookies;
// client-side `auth.getUser()` returned null because the SSR browser
// client cached an empty session at module init and did not auto-hydrate
// from out-of-band cookie injection (verified by Y.1.D diagnostic
// 2026-05-11 — both cookie + localStorage were present but useCurrentRole
// hook still returned null).
//
// Architectural reasoning (per nwrp82 STEP 3 commit rationale):
//   - Canonical Playwright auth pattern, endorsed by docs
//   - Zero production code coupling to harness internals
//   - Robust against @supabase/ssr internal behavior changes
//   - One-time bootstrap; minimal ongoing maintenance
//
// USAGE
//   npx tsx scripts/harness-auth-bootstrap.ts --preview-url <https://...>
//   npx tsx scripts/harness-auth-bootstrap.ts --preview-url <https://...> --email smoke-pm-alpha@nightwork.local
//
// OPTIONAL ARGS
//   --email <user>                    — defaults to harness-fixture@nightwork.local
//
// REQUIRED CREDENTIALS (one of, depending on --email)
//   For harness-fixture@nightwork.local:
//     HARNESS_FIXTURE_PASSWORD env var (existing pattern; don't-rotate per nwrp139/141)
//   For smoke-*@nightwork.local:
//     .planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt (gitignored;
//     written by orchestrator post-seed-apply per Plan E-2 / ITER-2-PATCHES.md §2.1)
//
// REQUIRED ENV
//   NEXT_PUBLIC_SUPABASE_URL          — (only for assertion logging; not used for login flow)
//   VERCEL_AUTOMATION_BYPASS_SECRET   — protected-preview SSO bypass (if set)
//   VERIFICATION_BYPASS_SECRET        — Nightwork app /design-system bypass (if set)
//
// OUTPUT
//   .planning/verification/auth/harness-auth-state.json
//   (gitignored; regenerated per CI run)
//
// EXIT CODES
//   0  success
//   1  failed (validation, login error, navigation timeout, write error)

import { chromium, type Browser, type BrowserContext } from "playwright";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import {
  chromiumLaunchArgs,
  harnessBrowserHeaders,
  HARNESS_AUTH_STATE_PATH,
} from "../src/lib/verification/_browser";

const FIXTURE_USER_EMAIL = "harness-fixture@nightwork.local";

function parseArgs(argv: string[]): { previewUrl: string; email: string } {
  let previewUrl = "";
  let email = FIXTURE_USER_EMAIL; // default to harness-fixture for backward compatibility
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--preview-url" && i + 1 < argv.length) {
      previewUrl = argv[i + 1];
    }
    if (argv[i] === "--email" && i + 1 < argv.length) {
      email = argv[i + 1];
    }
  }
  return { previewUrl, email };
}

function resolvePassword(email: string): string {
  // For smoke-* synthetic accounts (created by scripts/fixtures/smoke-seed.sql):
  // read password from gitignored credentials file written by the orchestrator
  // post-seed-apply step (per Plan E-2 / ITER-2-PATCHES.md §2.1).
  if (email.startsWith("smoke-") && email.endsWith("@nightwork.local")) {
    const credPath = path.resolve(
      process.cwd(),
      ".planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt",
    );
    if (!existsSync(credPath)) {
      throw new Error(
        `Cannot find smoke-user credentials file at ${credPath}. ` +
        `Did the orchestrator write credentials after applying scripts/fixtures/smoke-seed.sql? ` +
        `See the seed file header for the apply procedure.`,
      );
    }
    const content = readFileSync(credPath, "utf-8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue;
      const [credEmail, credPw] = line.split(/\s+/, 2);
      if (credEmail === email && credPw) return credPw;
    }
    throw new Error(
      `No password line for ${email} in credentials file at ${credPath}. ` +
      `Re-run the seed apply to regenerate.`,
    );
  }

  // For harness-fixture@nightwork.local: HARNESS_FIXTURE_PASSWORD env var
  // (existing pattern; don't-rotate decision per nwrp139/141).
  const envPassword = process.env.HARNESS_FIXTURE_PASSWORD;
  if (!envPassword) {
    throw new Error(
      "Missing HARNESS_FIXTURE_PASSWORD env. Set the harness fixture user password before running bootstrap.",
    );
  }
  return envPassword;
}

async function bootstrap(): Promise<void> {
  const { previewUrl, email } = parseArgs(process.argv.slice(2));

  if (!previewUrl) {
    throw new Error(
      "Missing --preview-url argument. Usage: tsx scripts/harness-auth-bootstrap.ts --preview-url <https://...>"
    );
  }
  if (!/^https:\/\/[A-Za-z0-9.-]+/.test(previewUrl)) {
    throw new Error(`Invalid --preview-url: ${previewUrl}`);
  }

  const password = resolvePassword(email);  // throws actionable error if not found

  console.log(`[harness-auth-bootstrap] starting against ${previewUrl}`);

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  try {
    browser = await chromium.launch({ args: chromiumLaunchArgs() });
    context = await browser.newContext({
      extraHTTPHeaders: harnessBrowserHeaders(),
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    // Step 1: navigate to login page
    const loginUrl = `${previewUrl.replace(/\/$/, "")}/login`;
    console.log(`[harness-auth-bootstrap] navigating to ${loginUrl}`);
    await page.goto(loginUrl, { waitUntil: "load", timeout: 45_000 });

    // Step 2: fill email + password
    // Login form selectors per src/app/login/LoginForm.tsx:
    //   <input name="email" type="email" ...>
    //   <input name="password" type="password" ...>
    //   <button type="submit">...</button>
    console.log(`[harness-auth-bootstrap] filling credentials for ${email}`);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);

    // Step 3: submit and wait for navigation away from /login
    console.log(`[harness-auth-bootstrap] submitting login`);
    await Promise.all([
      page.waitForURL(
        (url: URL) => !url.pathname.startsWith("/login"),
        { timeout: 30_000 }
      ),
      page.click('button[type="submit"]'),
    ]);

    const landedAt = page.url();
    console.log(`[harness-auth-bootstrap] login succeeded — landed at ${landedAt}`);

    // Step 4: wait a bit for @supabase/ssr to fully hydrate client-side
    // auth state. The login response sets Set-Cookie + the navigation that
    // follows uses those cookies; client-side @supabase/ssr browser client
    // reads them on first auth.getUser() call. 2s is conservative — most
    // real sites hydrate in <500ms.
    await page.waitForTimeout(2000);

    // Step 5: capture storageState
    const state = await context.storageState();
    console.log(
      `[harness-auth-bootstrap] captured storageState: ${state.cookies.length} cookies; ` +
        `${state.origins.length} origins with storage`
    );

    // Surface sb-* cookies + localStorage for verification (names + sizes only)
    const sbCookies = state.cookies.filter((c) => c.name.startsWith("sb-"));
    console.log(
      `[harness-auth-bootstrap]   sb-* cookies: ${sbCookies
        .map((c) => `${c.name}(${c.value.length})`)
        .join(", ")}`
    );
    for (const origin of state.origins) {
      const sbStorage = (origin.localStorage ?? []).filter((kv) =>
        kv.name.startsWith("sb-")
      );
      if (sbStorage.length > 0) {
        console.log(
          `[harness-auth-bootstrap]   sb-* localStorage @ ${origin.origin}: ${sbStorage
            .map((kv) => `${kv.name}(${kv.value.length})`)
            .join(", ")}`
        );
      }
    }

    if (sbCookies.length === 0) {
      throw new Error(
        "storageState captured but contains no sb-* cookies — login did not persist a Supabase session. " +
          "Check fixture credentials, Vercel bypass header, and login page behavior."
      );
    }

    // Step 6: write to file
    mkdirSync(path.dirname(HARNESS_AUTH_STATE_PATH), { recursive: true });
    writeFileSync(HARNESS_AUTH_STATE_PATH, JSON.stringify(state, null, 2));
    console.log(
      `[harness-auth-bootstrap] storageState written to ${HARNESS_AUTH_STATE_PATH}`
    );
  } finally {
    if (context) await context.close().catch(() => undefined);
    if (browser) await browser.close().catch(() => undefined);
  }
}

bootstrap().then(
  () => {
    console.log(`[harness-auth-bootstrap] success`);
    process.exit(0);
  },
  (err) => {
    console.error(
      `[harness-auth-bootstrap] FAILED:`,
      err instanceof Error ? err.message : String(err)
    );
    process.exit(1);
  }
);
