// tmp/tiering-dry-run.mjs — mechanics dry-run (nwrp285 rider 2):
// exercises every EXECUTABLE seam of the tiered pipeline end-to-end
// BEFORE F6-family dispatches for real. The markdown skill logic is
// instruction-text; this validates the machine parts those instructions
// depend on: config load, tier resolution, signal regexes + PA-1
// rationale rendering, severity frontmatter parse/abort, jsonl append,
// and the consolidated SmokeAuthHelper against production.

import { readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";
import { statusAuthed } from "../scripts/lib/smoke-auth.mjs";

let fails = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  if (!ok) fails++;
};

// 1. Config loads + tiers resolve.
const cfg = JSON.parse(readFileSync(".planning/process/tier-config.json", "utf8"));
check("tier-config.json parses", true);
for (const t of ["LOW", "MEDIUM", "HIGH"]) {
  const tier = cfg.tiers[t];
  check(
    `tier ${t} resolves (ceiling $${tier?.halt_gate_ceiling}, per-plan $${tier?.per_plan_halt})`,
    !!tier && tier.halt_gate_ceiling > 0 && tier.per_plan_halt > 0
  );
}
check(
  "reviewer sets: LOW=2, MEDIUM=4, HIGH base=6",
  cfg.tiers.LOW.plan_review_reviewers.length === 2 &&
    cfg.tiers.MEDIUM.plan_review_reviewers.length === 4 &&
    cfg.tiers.HIGH.plan_review_reviewers_base6.length === 6
);

// 2. Signal regexes compile + fire on a throwaway F6-shaped scope; PA-1
//    rationale renders SIGNALS not just verdict.
const throwawayScope =
  "CO allocation authoring with change_order_lines writes; G703 line math " +
  "(cents); draw staleness affordance UI; one migration possible for upload metadata; " +
  "estimated wall-clock 20h";
const fired = [];
for (const s of cfg.init_detection_signals.signals) {
  let re;
  try {
    re = new RegExp(s.pattern, "i");
  } catch (e) {
    check(`signal regex compiles: ${s.label}`, false, e.message);
    continue;
  }
  const m = throwawayScope.match(re);
  if (m) fired.push({ label: s.label, suggests: s.suggests, quote: m[0] });
}
check("all signal regexes compile", fails === 0);
check(
  "throwaway F6-shaped scope fires financial + schema + UI signals",
  fired.some((f) => f.label === "financial logic") &&
    fired.some((f) => f.label === "schema/migration") &&
    fired.some((f) => f.label === "UI/config")
);
const rationale =
  fired.map((f) => `${f.suggests} signal: ${f.label} ('${f.quote}')`).join("; ") +
  " → HIGH";
check(
  "PA-1: rendered rationale names signals + quotes, not just verdict",
  /signal: .*\('.*'\)/.test(rationale) && rationale.split(";").length >= 3,
  rationale.slice(0, 110) + "…"
);

// 3. Severity frontmatter parse + abort-on-missing (the /np pre-step
//    contract) against throwaway docs.
const withSev = "---\nphase: zz-dry-run\nstatus: APPROVED\nseverity: HIGH\n---\nbody";
const withoutSev = "---\nphase: zz-dry-run\nstatus: APPROVED\n---\nbody";
const readSeverity = (doc) => doc.match(/^severity:\s*(LOW|MEDIUM|HIGH)\s*$/m)?.[1] ?? null;
check("severity parse: present → HIGH", readSeverity(withSev) === "HIGH");
check("severity parse: missing → null (np ABORTS)", readSeverity(withoutSev) === null);

// 4. §6.2 trigger table present for the dry-run tier.
check(
  "retier triggers include LOW+schema → HIGH",
  cfg.retier_triggers.triggers.some((t) => t.at_tier === "LOW" && /schema/.test(t.condition))
);

// 5. jsonl capture — append ONE SYNTHETIC event (AC-13: capture live +
//    tested; PA-3: empty-at-REVIEW-1 must be distinguishable — this row
//    proves logging works; real halts carry synthetic:false).
const JSONL = ".planning/process/mid-execute-halts.jsonl";
if (!existsSync(JSONL)) writeFileSync(JSONL, "");
const event = {
  when: new Date().toISOString(),
  phase: "tiering-implementation-dry-run",
  tier_at_dispatch: "LOW",
  trigger: "synthetic test event — AC-13 capture validation (dry-run)",
  recommended_tier: "HIGH",
  disposition: "synthetic — not a real halt",
  synthetic: true,
};
appendFileSync(JSONL, JSON.stringify(event) + "\n");
const lines = readFileSync(JSONL, "utf8").trim().split("\n").filter(Boolean);
check("jsonl append-only capture works", lines.length >= 1 && JSON.parse(lines[lines.length - 1]).synthetic === true);

// 6. SmokeAuthHelper consolidated lib — live statusAuthed against production
//    (AC-8 functional + the §9 sanity smoke equivalent).
const sa = await statusAuthed(
  "https://nightwork-platform.vercel.app/api/invoices/33333333-3333-3333-3333-300000000002",
  "smoke-pm-beta@nightwork.local"
);
check(
  "smoke-auth.mjs statusAuthed live (expects 200 for owner-org invoice as its PM)",
  !sa.skipped && sa.ok && sa.status === 200,
  JSON.stringify(sa)
);
// graceful-skip branch (AC-9): bogus email with no creds resolvable.
const skip = await statusAuthed("https://nightwork-platform.vercel.app/", "nobody@nightwork.local");
check("smoke-auth.mjs skips gracefully on missing creds (AC-9)", skip.skipped === true, skip.reason ?? "");

console.log(fails === 0 ? "\nDRY-RUN: ALL PASS" : `\nDRY-RUN: ${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);
