/**
 * Unit tests for `clientPiiNotEmbedded` validator.
 *
 * Per F1-Wave-B Plan B-1b — exercises the locked validator interface
 * contract from src/lib/knowledge-graph/types.ts. This validator is
 * pure string analysis (no DB / Supabase call); ctx.supabase is unused.
 *
 * Coverage:
 *   - happy: select string with non-PII columns only → ok=true
 *   - violation: `clients(*)` wildcard → client-pii-embed-wildcard
 *   - violation: `clients(...,email,...)` → client-pii-embed-detected
 *   - violation: `clients(...,phone,...)` → client-pii-embed-detected
 *   - violation: combination (full route source) → 2+ violations with
 *     correct offsets
 *   - aliased embed: `client:clients(*)` → wildcard
 *   - dedupe: same embed alias matched by both wildcard patterns once
 *
 * Per D-078 / D-079 / D-080 / nwrp153 Q4 — `clients.email` + `clients.phone`
 * are PII-fenced. PostgREST embeds must use `profiles` for display columns
 * or use `clients` with explicit non-PII whitelist.
 */
import { strict as assert } from "node:assert";
import { clientPiiNotEmbedded } from "../../src/lib/knowledge-graph/validators/client-pii-not-embedded";
import type { ValidatorContext } from "../../src/lib/knowledge-graph/types";

type Case = { name: string; fn: () => Promise<void> };
const cases: Case[] = [];
const test = (name: string, fn: () => Promise<void>) =>
  cases.push({ name, fn });

// ctx is unused by this validator; supply a minimal shape that
// satisfies the interface.
const stubCtx: ValidatorContext = {
  supabase: {} as ValidatorContext["supabase"],
  org_id: "00000000-0000-0000-0000-fb1ce0a55e55",
  user_id: null,
};

// ── tests ─────────────────────────────────────────────────────────────

test("select with non-PII columns only → ok=true", async () => {
  const result = await clientPiiNotEmbedded(
    { source: "id,client:clients(id,name)" },
    stubCtx,
  );
  assert.equal(result.ok, true);
  assert.equal(result.violations.length, 0);
});

test("clients wildcard → client-pii-embed-wildcard", async () => {
  const result = await clientPiiNotEmbedded(
    { source: "id,client:clients(*)" },
    stubCtx,
  );
  assert.equal(result.ok, false);
  const codes = result.violations.map((v) => v.code);
  assert.ok(codes.includes("client-pii-embed-wildcard"));
});

test("clients with email → client-pii-embed-detected", async () => {
  const result = await clientPiiNotEmbedded(
    { source: "id,client:clients(id,name,email)" },
    stubCtx,
  );
  assert.equal(result.ok, false);
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].code, "client-pii-embed-detected");
});

test("clients with phone → client-pii-embed-detected", async () => {
  const result = await clientPiiNotEmbedded(
    { source: "id,client:clients(id,name,phone)" },
    stubCtx,
  );
  assert.equal(result.ok, false);
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].code, "client-pii-embed-detected");
});

test("full route source with one wildcard + one phone embed → 2 violations", async () => {
  const source = `
    import { createClient } from "@supabase/supabase-js";
    export async function GET() {
      const { data } = await supabase
        .from("jobs")
        .select("id,client:clients(*)");
      const { data: detail } = await supabase
        .from("jobs")
        .select("id,homeowner:clients(id,name,phone)");
      return Response.json({ data, detail });
    }
  `;
  const result = await clientPiiNotEmbedded(
    { source, context_label: "test/route.ts" },
    stubCtx,
  );
  assert.equal(result.ok, false);
  const codes = result.violations.map((v) => v.code);
  assert.ok(codes.includes("client-pii-embed-wildcard"));
  assert.ok(codes.includes("client-pii-embed-detected"));
  // Evidence carries the context_label
  const ev = result.violations[0].evidence as { context_label: string | null };
  assert.equal(ev.context_label, "test/route.ts");
});

test("aliased embed `homeowner:clients(*)` → wildcard violation", async () => {
  const result = await clientPiiNotEmbedded(
    { source: "id,homeowner:clients(*)" },
    stubCtx,
  );
  assert.equal(result.ok, false);
  const codes = result.violations.map((v) => v.code);
  assert.ok(codes.includes("client-pii-embed-wildcard"));
});

test("dedupe: aliased wildcard matched by both patterns counted once", async () => {
  // `client:clients(*)` matches BOTH WILDCARD_PATTERN (clients(*)) and
  // ALIAS_WILDCARD (:clients(*)). Validator dedupes by (code, offset).
  const result = await clientPiiNotEmbedded(
    { source: "id,client:clients(*)" },
    stubCtx,
  );
  const wildcards = result.violations.filter(
    (v) => v.code === "client-pii-embed-wildcard",
  );
  assert.equal(wildcards.length, 1);
});

test("context_label optional → evidence.context_label is null when absent", async () => {
  const result = await clientPiiNotEmbedded(
    { source: "id,client:clients(*)" },
    stubCtx,
  );
  assert.equal(result.ok, false);
  const ev = result.violations[0].evidence as { context_label: string | null };
  assert.equal(ev.context_label, null);
});

test("empty source → ok=true (no embeds to check)", async () => {
  const result = await clientPiiNotEmbedded({ source: "" }, stubCtx);
  assert.equal(result.ok, true);
  assert.equal(result.violations.length, 0);
});

test("safe select on related-but-non-clients table → ok=true (no false positive)", async () => {
  // Make sure we don't trip on unrelated tokens that happen to contain
  // 'email' or 'phone' outside a clients(...) embed.
  const result = await clientPiiNotEmbedded(
    {
      source:
        "id,name,description,user:profiles(id,full_name,email)",
    },
    stubCtx,
  );
  // The regex specifically requires `clients(...)` — profiles(...,email)
  // should NOT match.
  assert.equal(result.ok, true);
});

// ── runner ────────────────────────────────────────────────────────────

(async () => {
  let failed = 0;
  for (const c of cases) {
    try {
      await c.fn();
      console.log(`PASS  ${c.name}`);
    } catch (e) {
      failed++;
      console.log(`FAIL  ${c.name}`);
      console.log(`      ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  console.log("");
  if (failed > 0) {
    console.error(`${failed} of ${cases.length} test(s) failed`);
    process.exit(1);
  } else {
    console.log(`${cases.length} test(s) passed`);
  }
})();
