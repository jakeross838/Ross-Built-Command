"use client";

import { useEffect, useMemo, useState } from "react";
import Slideover from "@/components/nw/overlay/Slideover";
import ClientCombobox, { type ClientComboboxValue } from "@/components/client-combobox";
import NwButton from "@/components/nw/Button";
import { useFlash } from "@/components/nw/FlashProvider";

// Exemplar 1 — New Job as a right slide-over (replaces the old /jobs/new page).
// Two required fields (Name, Client); everything else is defaulted or deferred.
// Status is removed (new jobs are always Active). See design handoff Pattern 2/3.

// Contract type — Pattern 4: ≤3 options → segmented control with HUMAN labels
// (never the raw enum). The 3 relevant types for a cost-plus custom-home
// builder; rarer types (GMP, T&M, unit price) are set later on the job.
const CONTRACT_TYPES = [
  { value: "cost_plus_aia", label: "COST-PLUS (AIA)" },
  { value: "cost_plus_open_book", label: "COST-PLUS (OPEN BOOK)" },
  { value: "fixed_price", label: "FIXED PRICE" },
] as const;
type ContractType = (typeof CONTRACT_TYPES)[number]["value"];

const DEFAULT_CONTRACT: ContractType = "cost_plus_aia";

// Billing method — which draw output this job produces. Phase 1 offers two
// (fixed-fee is Phase 2, not surfaced). Defaulted from the org setting.
const BILLING_METHODS = [
  { value: "cost_plus_statement", label: "COST-PLUS STATEMENT" },
  { value: "aia", label: "AIA PAY APPLICATION (G702/G703)" },
] as const;
type BillingMethod = (typeof BILLING_METHODS)[number]["value"];

interface OrgDefaults {
  deposit: number; // decimal 0-1
  gcFee: number; // decimal 0-1
  retainage?: number; // WHOLE percent 0-100 (jobs.retainage_percent scale, NOT a fraction)
  billingMethod?: string;
  pms: { id: string; full_name: string }[];
}

type Phase = "idle" | "creating" | "created";

const fieldInput =
  "w-full px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border-default)] text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] focus:border-nw-stone-blue focus:outline-none disabled:opacity-50";
const fieldLabel =
  "block mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-tertiary)]";

function pctLabel(decimal: number): string {
  // 0.10 -> "10", 0.185 -> "18.5"
  return String(Math.round(decimal * 1000) / 10);
}

export default function NewJobSlideOver({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const flash = useFlash();

  // Required tier
  const [name, setName] = useState("");
  const [client, setClient] = useState<ClientComboboxValue>({ kind: "empty" });
  const [contractType, setContractType] = useState<ContractType>(DEFAULT_CONTRACT);
  const [billingMethod, setBillingMethod] = useState<BillingMethod>("cost_plus_statement");

  // Org-settings card
  const [defaults, setDefaults] = useState<OrgDefaults | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [depositPct, setDepositPct] = useState(""); // whole-percent string
  const [gcFeePct, setGcFeePct] = useState("");
  const [retainagePct, setRetainagePct] = useState(""); // WHOLE percent string (already 0-100, NOT ×100)
  const [pmId, setPmId] = useState<string>("");

  // More details
  const [moreOpen, setMoreOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [contractAmount, setContractAmount] = useState(""); // USD string
  const [contractDate, setContractDate] = useState("");

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  // Reset + load org defaults each time the slide-over opens.
  useEffect(() => {
    if (!open) return;
    setName("");
    setClient({ kind: "empty" });
    setContractType(DEFAULT_CONTRACT);
    setBillingMethod("cost_plus_statement");
    setAdjustOpen(false);
    setMoreOpen(false);
    setAddress("");
    setContractAmount("");
    setContractDate("");
    setRetainagePct("");
    setPmId("");
    setPhase("idle");
    setError(null);
    let cancelled = false;
    fetch("/api/org/defaults", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: OrgDefaults | null) => {
        if (cancelled || !d) return;
        setDefaults(d);
        setDepositPct(pctLabel(d.deposit ?? 0.1));
        setGcFeePct(pctLabel(d.gcFee ?? 0.2));
        // Retainage is already WHOLE percent from the API — hydrate directly,
        // NEVER pctLabel (that ×100 is for the 0..1 deposit/gcFee fractions).
        setRetainagePct(String(d.retainage ?? 10));
        if (d.billingMethod === "aia" || d.billingMethod === "cost_plus_statement") {
          setBillingMethod(d.billingMethod);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);

  const pmName = useMemo(() => {
    if (!pmId) return "—";
    return defaults?.pms.find((p) => p.id === pmId)?.full_name ?? "—";
  }, [pmId, defaults]);

  const summary = useMemo(() => {
    const dep = depositPct || pctLabel(defaults?.deposit ?? 0.1);
    const gc = gcFeePct || pctLabel(defaults?.gcFee ?? 0.2);
    const ret = retainagePct || String(defaults?.retainage ?? 10);
    return `${dep}% DEPOSIT · ${gc}% GC FEE · ${ret}% RETAINAGE · PM ${pmName === "—" ? "—" : pmName.toUpperCase()}`;
  }, [depositPct, gcFeePct, retainagePct, defaults, pmName]);

  async function handleCreate() {
    if (phase !== "idle") return;
    const trimmedName = name.trim();
    const hasClient = client.kind !== "empty";
    if (!trimmedName || !hasClient) {
      setError("Job name and client are required — everything else can wait.");
      return;
    }
    setError(null);
    setPhase("creating");

    const body: Record<string, unknown> = {
      name: trimmedName,
      contract_type: contractType,
      billing_method: billingMethod,
      deposit_percentage: (Number(depositPct) || 0) / 100,
      gc_fee_percentage: (Number(gcFeePct) || 0) / 100,
      status: "active",
    };
    if (client.kind === "existing") body.client_id = client.id;
    else if (client.kind === "new") body.client_name_for_create = client.full_name;
    // Retainage: WHOLE percent (0..100), sent as-is — draw-calc reads
    // jobs.retainage_percent directly. NOT /100 (that is only for the 0..1
    // deposit/gcFee fractions above). Sent only when present so a failed
    // defaults-load falls back to the org default server-side.
    const retNum = Number(retainagePct);
    if (retainagePct.trim() !== "" && Number.isFinite(retNum)) {
      body.retainage_percent = retNum;
    }
    if (pmId) body.pm_id = pmId;
    if (address.trim()) body.address = address.trim();
    if (contractDate) body.contract_date = contractDate;
    const usd = Number(contractAmount);
    if (contractAmount.trim() && !Number.isNaN(usd) && usd > 0) {
      body.original_contract_amount = Math.round(usd * 100);
    }

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        setPhase("idle");
        setError(j?.error ?? "Couldn't create the job. Please try again.");
        return;
      }
      const { id } = (await res.json()) as { id: string };
      setPhase("created");

      const clientName = client.kind === "existing" || client.kind === "new" ? client.full_name : "";
      const flashMsg = `Job created — ${trimmedName}${clientName ? ` (${clientName})` : ""} is live · ${
        depositPct
      }% deposit · ${gcFeePct}% GC fee · ${retainagePct}% retainage · PM ${pmName}`;

      // Optimistic insertion: broadcast so job filters can add it immediately.
      window.dispatchEvent(
        new CustomEvent("nw:job-created", { detail: { id, name: trimmedName } }),
      );

      // Hold the ✓ success state briefly, then close + flash.
      window.setTimeout(() => {
        onClose();
        flash.show(flashMsg);
      }, 650);
    } catch {
      setPhase("idle");
      setError("Couldn't create the job. Please try again.");
    }
  }

  const busy = phase !== "idle";

  const footer = (
    <div className="flex items-center justify-between gap-3">
      <NwButton variant="ghost" size="md" onClick={onClose} disabled={busy}>
        Cancel
      </NwButton>
      <button
        type="button"
        onClick={handleCreate}
        disabled={busy}
        style={{ fontFamily: "var(--font-jetbrains-mono)", letterSpacing: "0.12em" }}
        className={[
          "inline-flex h-[36px] items-center justify-center gap-2 px-5 text-[11px] font-medium uppercase leading-none text-nw-white-sand",
          "border transition-all duration-150 shadow-[var(--shadow-raise-accent)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-stone-blue/40 focus-visible:ring-offset-1",
          phase === "idle" &&
            "bg-nw-stone-blue border-nw-gulf-blue hover:bg-nw-gulf-blue hover:-translate-y-px active:translate-y-px active:shadow-[var(--shadow-raise-accent-active)]",
          phase === "creating" && "bg-nw-gulf-blue border-nw-gulf-blue cursor-wait",
          phase === "created" && "bg-nw-success border-nw-success",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {phase === "idle" && "Create Job"}
        {phase === "creating" && (
          <>
            <span
              aria-hidden
              className="inline-block h-3 w-3 animate-spin rounded-[var(--radius-dot)] border-2 border-current border-t-transparent"
            />
            Creating…
          </>
        )}
        {phase === "created" && "✓ Job Created"}
      </button>
    </div>
  );

  return (
    <Slideover
      open={open}
      onClose={onClose}
      title="New Job"
      promise="TWO REQUIRED FIELDS — THE REST IS DEFAULTED OR CAN WAIT"
      footer={footer}
      busy={busy}
    >
      <div className="space-y-6">
        {/* ── Required tier ── */}
        <div className="space-y-4">
          <div>
            <label className={fieldLabel} htmlFor="nj-name">
              Job Name *
            </label>
            <input
              id="nj-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
              placeholder="Client name — 100 Main St"
              className={fieldInput}
              autoFocus
            />
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
              Naming: client — street address
            </p>
          </div>

          <ClientCombobox
            label="Client *"
            value={client}
            onChange={setClient}
            disabled={busy}
          />

          <div>
            <span className={fieldLabel}>Contract Type</span>
            <div className="flex border border-[var(--border-default)]">
              {CONTRACT_TYPES.map((ct, i) => {
                const selected = ct.value === contractType;
                return (
                  <button
                    key={ct.value}
                    type="button"
                    disabled={busy}
                    onClick={() => setContractType(ct.value)}
                    className={[
                      "flex-1 px-2 py-2 text-center font-mono text-[10px] uppercase leading-tight tracking-[0.08em] transition-colors",
                      i > 0 ? "border-l border-[var(--border-default)]" : "",
                      selected
                        ? "bg-nw-stone-blue text-nw-white-sand"
                        : "bg-[var(--bg-card)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]",
                    ].join(" ")}
                  >
                    {ct.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
              The payment MODEL (how the client is charged). Separate from Billing Method below (which draw DOCUMENT prints). Org default: {CONTRACT_TYPES.find((c) => c.value === DEFAULT_CONTRACT)?.label}
            </p>
          </div>

          <div>
            <span className={fieldLabel}>Billing Method</span>
            <div className="flex border border-[var(--border-default)]">
              {BILLING_METHODS.map((bm, i) => {
                const selected = bm.value === billingMethod;
                return (
                  <button
                    key={bm.value}
                    type="button"
                    disabled={busy}
                    onClick={() => setBillingMethod(bm.value)}
                    className={[
                      "flex-1 px-2 py-2 text-center font-mono text-[10px] uppercase leading-tight tracking-[0.08em] transition-colors",
                      i > 0 ? "border-l border-[var(--border-default)]" : "",
                      selected
                        ? "bg-nw-stone-blue text-nw-white-sand"
                        : "bg-[var(--bg-card)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]",
                    ].join(" ")}
                  >
                    {bm.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
              The draw DOCUMENT this job prints (not the payment model above). Cost-Plus Statement = cost + markup invoice; AIA = G702/G703 pay app.
            </p>
          </div>
        </div>

        {/* ── FROM ORG SETTINGS (Pattern 3) ── */}
        <div className="border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-tertiary)]">
              From Org Settings
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => setAdjustOpen((v) => !v)}
              className="border border-[var(--border-strong)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-secondary)] transition-colors hover:border-nw-stone-blue hover:text-nw-stone-blue"
            >
              {adjustOpen ? "Done" : "Adjust"}
            </button>
          </div>
          <p className="mt-2 font-mono text-[11px] tracking-[0.04em] text-[color:var(--text-secondary)]">
            {summary}
          </p>

          {adjustOpen && (
            <div className="mt-4 grid animate-fade-up-fast grid-cols-2 gap-3">
              <div>
                <label className={fieldLabel} htmlFor="nj-deposit">
                  Deposit %
                </label>
                <input
                  id="nj-deposit"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={depositPct}
                  onChange={(e) => setDepositPct(e.target.value)}
                  disabled={busy}
                  className={fieldInput}
                />
              </div>
              <div>
                <label className={fieldLabel} htmlFor="nj-gc">
                  GC Fee %
                </label>
                <input
                  id="nj-gc"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={gcFeePct}
                  onChange={(e) => setGcFeePct(e.target.value)}
                  disabled={busy}
                  className={fieldInput}
                />
              </div>
              <div>
                <label className={fieldLabel} htmlFor="nj-retainage">
                  Retainage %
                </label>
                <input
                  id="nj-retainage"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={retainagePct}
                  onChange={(e) => setRetainagePct(e.target.value)}
                  disabled={busy}
                  className={fieldInput}
                />
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
                  Withheld on AIA draws
                </p>
              </div>
              <div className="col-span-2">
                <label className={fieldLabel} htmlFor="nj-pm">
                  Assigned PM
                </label>
                <select
                  id="nj-pm"
                  value={pmId}
                  onChange={(e) => setPmId(e.target.value)}
                  disabled={busy}
                  className={fieldInput}
                >
                  <option value="">— Unassigned —</option>
                  {defaults?.pms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ── MORE DETAILS (Pattern 2) ── */}
        <div>
          <button
            type="button"
            disabled={busy}
            onClick={() => setMoreOpen((v) => !v)}
            className="flex w-full items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]"
          >
            <span className="inline-block w-3 text-center">{moreOpen ? "▾" : "▸"}</span>
            More Details
            <span className="ml-1 font-mono text-[9px] tracking-[0.1em] text-[color:var(--text-muted)]">
              — ALL EDITABLE LATER
            </span>
          </button>
          {moreOpen && (
            <div className="mt-4 animate-fade-up-fast space-y-4">
              <div>
                <label className={fieldLabel} htmlFor="nj-address">
                  Address
                </label>
                <input
                  id="nj-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={busy}
                  placeholder="100 Main St, City, ST"
                  className={fieldInput}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={fieldLabel} htmlFor="nj-amount">
                    Contract Amount (USD)
                  </label>
                  <input
                    id="nj-amount"
                    type="number"
                    min={0}
                    step={0.01}
                    value={contractAmount}
                    onChange={(e) => setContractAmount(e.target.value)}
                    disabled={busy}
                    placeholder="0.00"
                    className={fieldInput}
                  />
                </div>
                <div>
                  <label className={fieldLabel} htmlFor="nj-date">
                    Contract Date
                  </label>
                  <input
                    id="nj-date"
                    type="date"
                    value={contractDate}
                    onChange={(e) => setContractDate(e.target.value)}
                    disabled={busy}
                    className={fieldInput}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="animate-fade-up-fast border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2 text-[13px] text-nw-danger">
            {error}
          </p>
        )}
      </div>
    </Slideover>
  );
}
