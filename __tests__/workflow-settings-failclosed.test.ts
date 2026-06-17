/**
 * F2A-2 (nwrp276) — fail-closed simulation for getWorkflowSettings.
 *
 * Runs in BARE NODE (the tsx test runner spawns this file with no Next.js
 * request scope and no .env.local loading), which makes the lib's
 * createServerClient() construction THROW — a real instance of the
 * "settings unavailable" failure class — and tryCreateServiceRoleClient()
 * find no service key. Asserts the fork:
 *
 *   - failClosed: true  → THROWS  (the invoice action route catches this
 *                                  and returns 422 — gates never evaluate
 *                                  on guessed defaults)
 *   - default (legacy)  → returns code-default fallback (all other
 *                                  callers keep pre-F2A-2 behavior)
 *
 * Also pins DEFAULT_WORKFLOW_SETTINGS.require_budget_allocation === true
 * (F2A-3: new orgs start gated; migration 00109 is the column-default
 * half of the same change).
 */
import {
  getWorkflowSettings,
  DEFAULT_WORKFLOW_SETTINGS,
} from "../src/lib/workflow-settings";

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

async function main() {
  // Guard the simulation premise: no service-role key in this process.
  check(
    "premise: no SUPABASE_SERVICE_ROLE_KEY in test env",
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const ORG = "00000000-0000-0000-0000-00000000beef";

  // 1. failClosed: true → must throw.
  let threw = false;
  let message = "";
  try {
    await getWorkflowSettings(ORG, { failClosed: true });
  } catch (e) {
    threw = true;
    message = e instanceof Error ? e.message : String(e);
  }
  check("failClosed:true throws on settings-read failure", threw, message.slice(0, 80));

  // 2. legacy default → falls back to code defaults, never throws.
  let fellBack = false;
  try {
    const s = await getWorkflowSettings(ORG);
    fellBack = s.org_id === ORG && s.id === "";
  } catch {
    fellBack = false;
  }
  check("legacy call falls back to defaults (no throw)", fellBack);

  // 3. F2A-3 code-default pin.
  check(
    "DEFAULT_WORKFLOW_SETTINGS.require_budget_allocation === true",
    DEFAULT_WORKFLOW_SETTINGS.require_budget_allocation === true
  );

  // F6-family (nwrp286): CO-side gate code-default pin (new-org/fallback = gated).
  check(
    "DEFAULT_WORKFLOW_SETTINGS.require_co_budget_allocation === true",
    DEFAULT_WORKFLOW_SETTINGS.require_co_budget_allocation === true
  );

  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
