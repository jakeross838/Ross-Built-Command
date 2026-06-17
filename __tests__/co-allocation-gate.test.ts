/**
 * F6-family (nwrp286) — CO allocation-gate logic (the require_co_budget_allocation
 * invariant). Pure-function tests; the route wires this behind a fail-closed
 * settings read and returns gate.status/gate.error. Cents-exact.
 */
import { evaluateCoAllocationGate } from "../src/lib/co-allocation-gate";

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

// AC-D1-1: zero lines → 422.
{
  const r = evaluateCoAllocationGate([], 100000);
  check("zero lines → 422", !r.ok && r.status === 422 && /allocated to a budget line/.test(r.error));
}

// AC-D1-2: a line missing budget_line_id → 422.
{
  const r = evaluateCoAllocationGate(
    [{ budget_line_id: "bl-1", amount: 60000 }, { budget_line_id: null, amount: 40000 }],
    100000
  );
  check("a line missing budget_line_id → 422", !r.ok && r.status === 422 && /allocated to a budget line/.test(r.error));
}

// AC-D1-3: all allocated but Σ ≠ amount → 422 (over).
{
  const r = evaluateCoAllocationGate(
    [{ budget_line_id: "bl-1", amount: 60000 }, { budget_line_id: "bl-2", amount: 50000 }],
    100000
  );
  check("Σ lines ($1100.00) ≠ amount ($1000.00) → 422", !r.ok && r.status === 422 && /must sum to the CO amount/.test(r.error));
}

// AC-D1-3b: Σ ≠ amount → 422 (under, off-by-one-cent — the exact-integer guard).
{
  const r = evaluateCoAllocationGate([{ budget_line_id: "bl-1", amount: 99999 }], 100000);
  check("off-by-1¢ under → 422 (exact integer compare)", !r.ok && r.status === 422);
}

// AC-D1-4 (logic half): ≥1 line, all allocated, Σ == amount → ok.
{
  const r = evaluateCoAllocationGate(
    [{ budget_line_id: "bl-1", amount: 60000 }, { budget_line_id: "bl-2", amount: 40000 }],
    100000
  );
  check("multi-line, all allocated, Σ==amount → ok", r.ok === true);
}

// Single full-amount line (the trigger first-fire shape) → ok.
{
  const r = evaluateCoAllocationGate([{ budget_line_id: "bl-1", amount: 799510 }], 799510);
  check("single full-amount line → ok", r.ok === true);
}

// Credit/negative line that still nets to amount → ok (allocation supports deducts within a CO).
{
  const r = evaluateCoAllocationGate(
    [{ budget_line_id: "bl-1", amount: 120000 }, { budget_line_id: "bl-2", amount: -20000 }],
    100000
  );
  check("mixed +/- lines summing to amount → ok", r.ok === true);
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
