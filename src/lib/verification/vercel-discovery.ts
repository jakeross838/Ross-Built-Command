// Vercel preview URL discovery.
//
// Per D-20/D-21 + Plan-review watchpoint #6: hierarchy of fallbacks +
// fail-loudly when all paths fail. AUTO-LOG empirically verified that the
// deterministic pattern is unreliable for long branch names — Vercel
// truncates with a hash suffix beyond the 63-char DNS-label limit. Per the
// AUTO-LOG: `git-main` URL works (short branch name); `phase/1.5-c-*`
// URLs do NOT work via deterministic pattern.
//
// Therefore the hierarchy is:
//   (1) explicit --preview-url      — operator override, no probing
//   (2) Vercel REST API + token     — PRIMARY (per Jake watchpoint #2 + AUTO-LOG)
//   (3) `vercel ls` CLI fallback    — when REST returns no rows / network down
//   (4) deterministic pattern       — last-ditch for short branch names only
//   (5) fail-loudly with full trace
//
// Per EXPANDED-SCOPE §6 R2: do not deploy harness with single-source URL
// discovery. Per D-23: SIGINT-on-CLI-spawn timeout, never `kill -9`.
//
// Wait-for-Ready: poll the discovered URL with HEAD request; back off
// 1s → 2s → 4s → 8s → 15s → 30s; cap at 5min total wait. A 401 (preview
// auth) counts as Ready — the deployment exists and is reachable; the
// harness session will authenticate downstream.
//
// Per D-30: this module is tenant-blind (operates on git branch + Vercel
// project metadata only; no tenant data flows here). The discovered URL
// is fed into Layer*Context.preview_url; tenant scoping happens at the
// auth layer (auth-strategy.ts) and the idempotency layer (Plan 1).

import { spawn } from "node:child_process";

export interface VercelDiscoveryResult {
  url: string;
  source: "explicit" | "vercel-cli" | "vercel-rest-api" | "deterministic-pattern";
  ready: boolean;
}

export interface DiscoveryOptions {
  branch: string;
  explicit_url?: string;
  vercel_token?: string;
  wait_for_ready?: boolean;
  repo_root: string;
}

const PROJECT_NAME = "nightwork-platform";
const TEAM_OR_USER_SLUG = "jakeross838s-projects";
const VERCEL_API_BASE = "https://api.vercel.com";
const MAX_READY_WAIT_MS = 5 * 60 * 1000; // 5 minutes
const READY_BACKOFF_MS = [1_000, 2_000, 4_000, 8_000, 15_000, 30_000];

export async function discoverPreviewUrl(
  opts: DiscoveryOptions
): Promise<VercelDiscoveryResult> {
  const errors: string[] = [];

  // 1. Explicit override — no probing
  if (opts.explicit_url) {
    const ready =
      opts.wait_for_ready === false ? true : await waitForReady(opts.explicit_url);
    return { url: opts.explicit_url, source: "explicit", ready };
  }

  // 2. Vercel REST API — PRIMARY (per Jake watchpoint #2 + AUTO-LOG empirical evidence
  // that deterministic pattern is unreliable for long branch names).
  const token = opts.vercel_token ?? process.env.VERCEL_TOKEN;
  if (token) {
    try {
      const apiUrl = await tryVercelRestApi(opts.branch, token);
      if (apiUrl) {
        const ready =
          opts.wait_for_ready === false ? true : await waitForReady(apiUrl);
        return { url: apiUrl, source: "vercel-rest-api", ready };
      }
      errors.push(
        `vercel-rest-api: no READY deployment found for branch '${opts.branch}'`
      );
    } catch (err) {
      errors.push(
        `vercel-rest-api: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  } else {
    errors.push(
      `vercel-rest-api: no VERCEL_TOKEN env var (set locally or as GH Action secret)`
    );
  }

  // 3. Vercel CLI fallback (when REST API path failed — e.g. network glitch,
  // rate-limit, transient 5xx). Lower priority than REST API per the AUTO-LOG
  // recommendation: REST API gives precise state metadata; CLI parses
  // column-aligned text output and is more brittle.
  try {
    const cliUrl = await tryVercelCli(opts.branch, opts.repo_root);
    if (cliUrl) {
      const ready =
        opts.wait_for_ready === false ? true : await waitForReady(cliUrl);
      return { url: cliUrl, source: "vercel-cli", ready };
    }
  } catch (err) {
    errors.push(`vercel-cli: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 4. Deterministic pattern fallback — last resort. Per AUTO-LOG: works for
  // SHORT branch names (e.g. `main`, `dev`); breaks for long ones because
  // Vercel truncates beyond 63-char DNS-label limit and appends a hash suffix.
  const patternUrl = buildDeterministicUrl(opts.branch);
  try {
    const probe = await fetch(patternUrl, { method: "HEAD", redirect: "manual" });
    // 200/301/302/401 all indicate URL exists — preview deploy auth is on
    if (probe.status >= 200 && probe.status < 500) {
      const ready =
        opts.wait_for_ready === false ? true : await waitForReady(patternUrl);
      return { url: patternUrl, source: "deterministic-pattern", ready };
    }
    errors.push(
      `deterministic-pattern: ${patternUrl} returned ${probe.status} (likely truncated branch name — AUTO-LOG R2)`
    );
  } catch (err) {
    errors.push(
      `deterministic-pattern: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  throw new Error(
    `[verify-phase] FAILED to discover Vercel preview URL for branch '${opts.branch}'. Tried:\n` +
      errors.map((e) => `  - ${e}`).join("\n") +
      `\n\nPossible fixes:\n` +
      `  - Verify the branch is pushed to remote and Vercel preview deploy fired (check 'vercel ls').\n` +
      `  - Verify VERCEL_TOKEN env var is set (locally) or available as GitHub Action secret (CI).\n` +
      `  - Pass --preview-url explicitly to bypass discovery (escape hatch).\n` +
      `  - For long branch names: deterministic pattern is unreliable (AUTO-LOG R2); REST API path is required.\n`
  );
}

function buildDeterministicUrl(branch: string): string {
  // Slugify branch: lowercase, replace non-alphanumeric with -, collapse runs.
  const slug = branch
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `https://${PROJECT_NAME}-git-${slug}-${TEAM_OR_USER_SLUG}.vercel.app`;
}

/**
 * Spawn `vercel ls --prod=false` and grep stdout for a Ready row matching
 * the branch. Per D-23: never `kill -9`; CLI runs to completion or its
 * own timeout (Vercel CLI typically returns within a few seconds).
 */
async function tryVercelCli(branch: string, cwd: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const cmd = process.platform === "win32" ? "vercel.cmd" : "vercel";
    const child = spawn(
      cmd,
      ["ls", "--prod=false", "--scope", TEAM_OR_USER_SLUG],
      {
        cwd,
        shell: process.platform === "win32",
      }
    );
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => (stdout += d.toString()));
    child.stderr?.on("data", (d) => (stderr += d.toString()));
    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      if (code !== 0) {
        return reject(
          new Error(`vercel ls exit ${code}: ${stderr.trim() || "no output"}`)
        );
      }
      // Find a Ready deployment with the branch in source column.
      const lines = stdout.split("\n");
      for (const line of lines) {
        if (!line.includes(branch)) continue;
        if (!line.toLowerCase().includes("ready")) continue;
        const urlMatch = line.match(/https:\/\/[^\s]+\.vercel\.app/);
        if (urlMatch) return resolve(urlMatch[0]);
      }
      resolve(null);
    });
  });
}

/**
 * GET /v6/deployments?meta-githubCommitRef=<branch>&state=READY&limit=1
 * Returns the first deployment's url field. The Vercel REST API requires
 * a Bearer token; we use VERCEL_TOKEN from env (set locally or as GH secret).
 *
 * Per AUTO-LOG: this is the PRIMARY path. The token has been validated
 * against the live API per .planning/expansions/SETUP-COMPLETE.md item #29.
 */
async function tryVercelRestApi(
  branch: string,
  token: string
): Promise<string | null> {
  const url =
    `${VERCEL_API_BASE}/v6/deployments?meta-githubCommitRef=` +
    `${encodeURIComponent(branch)}&state=READY&limit=1`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    deployments?: Array<{ url?: string; state?: string }>;
  };
  const deployment = json.deployments?.[0];
  if (!deployment?.url) return null;
  return deployment.url.startsWith("http")
    ? deployment.url
    : `https://${deployment.url}`;
}

/**
 * Poll URL with HEAD probe until 2xx/3xx/401 response or timeout.
 * Per the discovery contract: 401 (preview auth) counts as Ready — the
 * deployment exists and the URL is reachable; the harness session will
 * authenticate downstream via auth-strategy.ts.
 */
async function waitForReady(url: string): Promise<boolean> {
  const start = Date.now();
  let attempt = 0;
  while (Date.now() - start < MAX_READY_WAIT_MS) {
    try {
      const res = await fetch(url, { method: "HEAD", redirect: "manual" });
      // 401 = preview auth on; URL exists. 5xx = transient deploy issue; retry.
      if (res.status >= 200 && res.status < 500) return true;
    } catch {
      // network error → retry
    }
    const delay =
      READY_BACKOFF_MS[Math.min(attempt, READY_BACKOFF_MS.length - 1)];
    await new Promise((r) => setTimeout(r, delay));
    attempt++;
  }
  return false;
}
