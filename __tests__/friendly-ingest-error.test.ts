// Run: npx tsx __tests__/friendly-ingest-error.test.ts
// 2.5 — the ingest error sanitizer must never leak raw provider/parse text and
// must be idempotent (safe to wrap at both API and display layers).
import { friendlyIngestError } from "../src/lib/invoices/friendly-error";

let pass = 0;
let fail = 0;
function eq(actual: unknown, expected: unknown, label: string) {
  if (actual === expected) { pass++; }
  else { fail++; console.error(`FAIL: ${label}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`); }
}
function truthy(v: unknown, label: string) {
  if (v) { pass++; } else { fail++; console.error(`FAIL: ${label} — expected truthy, got ${JSON.stringify(v)}`); }
}

// Raw provider/parse text must NEVER appear in the output.
const RAW_LEAKS = [
  'Claude returned invalid JSON: {"vendor_name": unterminated',
  "SyntaxError: Unexpected token < in JSON at position 0\n  at parse (/app/x.js:1)",
  "Storage upload failed: 413 Payload Too Large",
  "PostgrestError: duplicate key value violates unique constraint",
  "Error: connect ECONNREFUSED 127.0.0.1:54322",
];
for (const raw of RAW_LEAKS) {
  const out = friendlyIngestError(raw);
  truthy(out.length > 0, `non-empty for: ${raw.slice(0, 24)}`);
  // The output must be one of the fixed friendly messages — never contain the raw.
  eq(out === friendlyIngestError(out), true, `idempotent for: ${raw.slice(0, 24)}`);
  truthy(!out.includes("{") && !out.includes("Postgrest") && !out.includes("ECONNREFUSED") && !out.includes("SyntaxError") && !out.includes("/app/"), `no raw leak for: ${raw.slice(0, 24)}`);
}

// Category mappings.
eq(friendlyIngestError("Claude returned invalid JSON"), "We couldn't read this document automatically. Try a clearer scan, or enter the invoice manually.", "json → unreadable");
eq(friendlyIngestError("AI call limit reached"), "AI processing is busy right now. Try again in a moment, or enter the invoice manually.", "limit → busy");
eq(friendlyIngestError("Unsupported file type: .heic"), "That file type isn't supported. Upload a PDF or image, or enter the invoice manually.", "unsupported");
eq(friendlyIngestError("Storage upload failed"), "The file couldn't be uploaded. Check the file and try again.", "upload");
eq(friendlyIngestError(""), "Something went wrong processing this document. Try again, or enter the invoice manually.", "empty → generic");
eq(friendlyIngestError(null), "Something went wrong processing this document. Try again, or enter the invoice manually.", "null → generic");

// Idempotency: every friendly output re-sanitizes to itself (no downgrade).
for (const m of [
  "AI processing is busy right now. Try again in a moment, or enter the invoice manually.",
  "We couldn't read this document automatically. Try a clearer scan, or enter the invoice manually.",
  "Something went wrong processing this document. Try again, or enter the invoice manually.",
]) {
  eq(friendlyIngestError(m), m, `idempotent friendly: ${m.slice(0, 20)}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
