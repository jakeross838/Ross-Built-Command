"use client";

import { useEffect, useState } from "react";
import PopModal from "@/components/nw/overlay/PopModal";
import ClientCombobox, { type ClientComboboxValue } from "@/components/client-combobox";
import NwButton from "@/components/nw/Button";
import { useFlash } from "@/components/nw/FlashProvider";
import "@/app/nw-redesign.css";

// New Job — surface #2 of the flat-IA redesign language. Reduced to TWO required
// fields (Name, Client); contract type, billing method, deposit/fee/retainage,
// and PM (unassigned) default SILENTLY from org settings — everything is editable
// later in Job Settings, and the first-draw setup card catches a missing contract
// amount at draw time. MORE DETAILS ▾ absorbs the rare at-creation overrides.
// Container is the centered PopModal (one overlay language — upload + review are
// centered); the slide-over is retired for this surface (see design_handoff_redesign/
// ASSETS.md — screen 7's drawer is superseded by Jake's live ruling).

const CONTRACT_TYPES = [
  { value: "cost_plus_aia", label: "COST-PLUS (AIA)" },
  { value: "cost_plus_open_book", label: "COST-PLUS (OPEN BOOK)" },
  { value: "fixed_price", label: "FIXED PRICE" },
] as const;
type ContractType = (typeof CONTRACT_TYPES)[number]["value"];
const DEFAULT_CONTRACT: ContractType = "cost_plus_aia";

const BILLING_METHODS = [
  { value: "cost_plus_statement", label: "COST-PLUS STATEMENT" },
  { value: "aia", label: "AIA PAY APPLICATION (G702/G703)" },
] as const;
type BillingMethod = (typeof BILLING_METHODS)[number]["value"];

interface OrgDefaults {
  deposit: number; // fraction 0-1
  gcFee: number; // fraction 0-1
  retainage?: number; // WHOLE percent 0-100
  billingMethod?: string;
  pms: { id: string; full_name: string }[];
}

type Phase = "idle" | "creating" | "created";

const fieldInput =
  "w-full px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border-default)] text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] focus:border-nw-stone-blue focus:outline-none disabled:opacity-50";
const fieldLabel =
  "block mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-tertiary)]";
const segmentBtn = (selected: boolean, first: boolean) =>
  [
    "flex-1 px-2 py-2 text-center font-mono text-[10px] uppercase leading-tight tracking-[0.08em] transition-colors",
    first ? "" : "border-l border-[var(--border-default)]",
    selected
      ? "bg-nw-stone-blue text-nw-white-sand"
      : "bg-[var(--bg-card)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]",
  ].join(" ");

export default function NewJobModal({
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

  // Silent org defaults (applied to the create body; NOT shown in the default view).
  const [defaults, setDefaults] = useState<OrgDefaults | null>(null);

  // MORE DETAILS — the rare at-creation overrides (all editable later in Job Settings).
  const [moreOpen, setMoreOpen] = useState(false);
  const [contractType, setContractType] = useState<ContractType>(DEFAULT_CONTRACT);
  const [billingMethod, setBillingMethod] = useState<BillingMethod>("cost_plus_statement");
  const [address, setAddress] = useState("");
  const [contractAmount, setContractAmount] = useState(""); // USD string
  const [contractDate, setContractDate] = useState("");

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  // Reset + load org defaults each time the modal opens.
  useEffect(() => {
    if (!open) return;
    setName("");
    setClient({ kind: "empty" });
    setMoreOpen(false);
    setContractType(DEFAULT_CONTRACT);
    setBillingMethod("cost_plus_statement");
    setAddress("");
    setContractAmount("");
    setContractDate("");
    setPhase("idle");
    setError(null);
    let cancelled = false;
    fetch("/api/org/defaults", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: OrgDefaults | null) => {
        if (cancelled || !d) return;
        setDefaults(d);
        // Seed the (hidden) billing default from the org so MORE DETAILS + the
        // create body agree with org settings.
        if (d.billingMethod === "aia" || d.billingMethod === "cost_plus_statement") {
          setBillingMethod(d.billingMethod);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);

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

    // Deposit / GC fee / retainage default SILENTLY from org settings (no UI).
    // PM defaults to unassigned (no pm_id).
    const body: Record<string, unknown> = {
      name: trimmedName,
      contract_type: contractType,
      billing_method: billingMethod,
      deposit_percentage: defaults?.deposit ?? 0.1,
      gc_fee_percentage: defaults?.gcFee ?? 0.2,
      status: "active",
    };
    if (client.kind === "existing") body.client_id = client.id;
    else if (client.kind === "new") body.client_name_for_create = client.full_name;
    // Retainage: WHOLE percent (0..100). Sent only when the org default loaded so a
    // failed defaults-load falls back to the org default server-side.
    if (typeof defaults?.retainage === "number" && Number.isFinite(defaults.retainage)) {
      body.retainage_percent = defaults.retainage;
    }
    // MORE DETAILS overrides (optional).
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
      const flashMsg = `Job created — ${trimmedName}${clientName ? ` (${clientName})` : ""} is live · defaults from org settings, editable in Job Settings`;

      // Optimistic insertion: broadcast so job filters can add it immediately.
      window.dispatchEvent(new CustomEvent("nw:job-created", { detail: { id, name: trimmedName } }));

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

  return (
    <PopModal open={open} onClose={onClose} width={560} busy={busy} ariaLabel="New Job">
      <div className="nw-redesign flex max-h-[92vh] flex-col">
        {/* ── Slate-deep header (redesign) ── */}
        <div
          className="flex items-center justify-between gap-4 px-6 py-4"
          style={{ background: "var(--nw-slate-deep)" }}
        >
          <div className="min-w-0">
            <div
              style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 600, fontSize: "17px", letterSpacing: "-0.02em", color: "var(--nw-white-sand)" }}
            >
              New Job
            </div>
            <div
              className="mt-0.5"
              style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(247,245,236,0.5)" }}
            >
              Two required fields — the rest is defaulted or can wait
            </div>
          </div>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            aria-label="Close"
            title="Close · Esc"
            className="inline-flex items-center gap-1.5 border px-1.5 py-1 transition-colors"
            style={{ borderColor: "rgba(247,245,236,0.25)" }}
          >
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", letterSpacing: "0.1em", color: "rgba(247,245,236,0.55)" }}>ESC</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(247,245,236,0.6)" strokeWidth="1.5" strokeLinecap="round"><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto px-6 py-5">
          <div className="space-y-4">
            <div>
              <label className={fieldLabel} htmlFor="nj-name">Job Name *</label>
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

            <ClientCombobox label="Client *" value={client} onChange={setClient} disabled={busy} />

            {/* Quiet helper line — replaces the FROM ORG SETTINGS card. */}
            <p className="border-l-2 border-[var(--border-default)] pl-3 text-[12px] leading-snug text-[color:var(--text-tertiary)]">
              Defaults applied from org settings — everything editable later in Job Settings.
            </p>

            {/* ── MORE DETAILS ▾ — collapsed; absorbs the rare at-creation fields ── */}
            <div className="pt-1">
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
                    <span className={fieldLabel}>Contract Type</span>
                    <div className="flex border border-[var(--border-default)]">
                      {CONTRACT_TYPES.map((ct, i) => (
                        <button key={ct.value} type="button" disabled={busy} onClick={() => setContractType(ct.value)} className={segmentBtn(ct.value === contractType, i === 0)}>
                          {ct.label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
                      The payment MODEL (how the client is charged). Org default: {CONTRACT_TYPES.find((c) => c.value === DEFAULT_CONTRACT)?.label}
                    </p>
                  </div>

                  <div>
                    <span className={fieldLabel}>Billing Method</span>
                    <div className="flex border border-[var(--border-default)]">
                      {BILLING_METHODS.map((bm, i) => (
                        <button key={bm.value} type="button" disabled={busy} onClick={() => setBillingMethod(bm.value)} className={segmentBtn(bm.value === billingMethod, i === 0)}>
                          {bm.label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
                      The draw DOCUMENT this job prints. Cost-Plus Statement = cost + markup; AIA = G702/G703 pay app.
                    </p>
                  </div>

                  <div>
                    <label className={fieldLabel} htmlFor="nj-address">Address</label>
                    <input id="nj-address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} disabled={busy} placeholder="100 Main St, City, ST" className={fieldInput} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={fieldLabel} htmlFor="nj-amount">Contract Amount (USD)</label>
                      <input id="nj-amount" type="number" min={0} step={0.01} value={contractAmount} onChange={(e) => setContractAmount(e.target.value)} disabled={busy} placeholder="0.00" className={fieldInput} />
                    </div>
                    <div>
                      <label className={fieldLabel} htmlFor="nj-date">Contract Date</label>
                      <input id="nj-date" type="date" value={contractDate} onChange={(e) => setContractDate(e.target.value)} disabled={busy} className={fieldInput} />
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
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between gap-3 border-t border-[var(--border-default)] px-6 py-4">
          <NwButton variant="ghost" size="md" onClick={onClose} disabled={busy}>Cancel</NwButton>
          <button
            type="button"
            onClick={handleCreate}
            disabled={busy}
            style={{ fontFamily: "var(--font-jetbrains-mono)", letterSpacing: "0.12em" }}
            className={[
              "inline-flex h-[36px] items-center justify-center gap-2 px-5 text-[11px] font-medium uppercase leading-none text-nw-white-sand",
              "border transition-all duration-150 shadow-[var(--shadow-raise-accent)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-stone-blue/40 focus-visible:ring-offset-1",
              phase === "idle" && "bg-nw-stone-blue border-nw-gulf-blue hover:bg-nw-gulf-blue hover:-translate-y-px active:translate-y-px active:shadow-[var(--shadow-raise-accent-active)]",
              phase === "creating" && "bg-nw-gulf-blue border-nw-gulf-blue cursor-wait",
              phase === "created" && "bg-nw-success border-nw-success",
            ].filter(Boolean).join(" ")}
          >
            {phase === "idle" && "Create Job"}
            {phase === "creating" && (
              <>
                <span aria-hidden className="inline-block h-3 w-3 animate-spin rounded-[var(--radius-dot)] border-2 border-current border-t-transparent" />
                Creating…
              </>
            )}
            {phase === "created" && "✓ Job Created"}
          </button>
        </div>
      </div>
    </PopModal>
  );
}
