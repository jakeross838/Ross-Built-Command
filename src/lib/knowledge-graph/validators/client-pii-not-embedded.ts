// client-pii-not-embedded — PostgREST embed hint PII fence validator.
//
// Source rule (D-078 / D-079 / D-080 PII fence convention + nwrp153 Q4):
//   "When PostgREST embedding hints are used to display data, the embed
//    must reference `profiles` for display columns (full_name) and MUST
//    NOT reference `clients.email` / `clients.phone` (homeowner PII)."
//
// Per Q1 nwrp153 — `clients.email` + `clients.phone` are inside the PII
// fence (PII-class data per ENTITY-INVENTORY.md). PostgREST embed hints
// MUST reference `profiles` (for display) OR `clients` with an explicit
// non-PII column whitelist; wildcard + email/phone references are blocked.
//
// Input shape: a string that is either:
//   (a) a single PostgREST select query string
//       e.g., "id,client:clients(id,name)"
//   (b) a route file's full source text (validator scans within)
//
// Violation codes:
//   - `client-pii-embed-wildcard` — `clients(*)` (transitively exposes PII)
//   - `client-pii-embed-detected` — `clients(...,email,...)` or `clients(...,phone,...)`
//
// This validator is sync-shaped in logic (pure string analysis; no DB
// call) but async-typed per nwrp153 Q3 (uniform Promise<ValidatorResult>
// for caller simplicity).
//
// COMPLEMENTS Plan-D-4 Rule-2 plan-review grep gate — provides a
// programmatic interface that future code can call (e.g., a future
// `/api/_introspect/pii-fence` route, a CI lint step, or a pre-commit
// hook extension).
import type { Validator, ValidatorViolation } from "../types";

export interface ClientPiiInput {
  source: string;
  /** Optional diagnostic label, e.g., "src/app/api/jobs/route.ts" */
  context_label?: string;
}

// Wildcard variants. Standalone form `clients(*)` AND aliased form
// `homeowner:clients(*)` / `client:clients(*)` — both expose PII transitively.
const WILDCARD_PATTERN = /\bclients?\s*\(\s*\*\s*\)/g;
const ALIAS_WILDCARD = /:\s*clients?\s*\(\s*\*\s*\)/g;

// Named-column embed references that include fenced fields. Match
// `clients(...,email...)` and `clients(...,phone...)` permissively.
const EMAIL_PATTERN = /\bclients?\s*\([^)]*\bemail\b[^)]*\)/g;
const PHONE_PATTERN = /\bclients?\s*\([^)]*\bphone\b[^)]*\)/g;

export const clientPiiNotEmbedded: Validator<ClientPiiInput> = async (
  input,
  _ctx,
) => {
  const violations: ValidatorViolation[] = [];

  // Dedupe by END offset (start + matched length). The standalone
  // wildcard pattern AND the alias-wildcard pattern can both fire on the
  // same embed (e.g., `client:clients(*)`); they share the same
  // `clients(*)` substring but their match-start indices differ because
  // the alias pattern captures the `:` prefix. End offset is stable
  // across both views of the same embed.
  const seenWildcard = new Set<number>();
  const wildcardHits = [
    ...input.source.matchAll(WILDCARD_PATTERN),
    ...input.source.matchAll(ALIAS_WILDCARD),
  ];
  for (const hit of wildcardHits) {
    const idx = hit.index ?? 0;
    const endOffset = idx + hit[0].length;
    if (seenWildcard.has(endOffset)) continue;
    seenWildcard.add(endOffset);
    violations.push({
      code: "client-pii-embed-wildcard",
      message: `PostgREST embed uses wildcard on clients table at offset ${idx}; wildcard transitively exposes email + phone which are inside the D-078 PII fence.`,
      evidence: {
        match: hit[0],
        offset: idx,
        context_label: input.context_label ?? null,
      },
    });
  }

  const seenDetected = new Set<string>();
  for (const pattern of [EMAIL_PATTERN, PHONE_PATTERN]) {
    for (const hit of input.source.matchAll(pattern)) {
      const idx = hit.index ?? 0;
      const key = `${idx}:${hit[0]}`;
      if (seenDetected.has(key)) continue;
      seenDetected.add(key);
      violations.push({
        code: "client-pii-embed-detected",
        message: `PostgREST embed references fenced PII column on clients at offset ${idx}.`,
        evidence: {
          match: hit[0],
          offset: idx,
          context_label: input.context_label ?? null,
        },
      });
    }
  }

  return { ok: violations.length === 0, violations };
};
