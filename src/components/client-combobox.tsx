"use client";

/**
 * ClientCombobox — F1-Wave-B Slice-1 Plan B-1a-bis.
 *
 * Async-search combobox for selecting a client (homeowner or commercial) on
 * job-edit / new-job forms. Replaces the legacy 3-input pattern (client_name +
 * client_email + client_phone) per Q1 PII fence (D-078 + D-079 + nwrp153).
 *
 * Wire-up:
 *   - Backed by /api/clients?search=<query> (returns id + full_name only)
 *   - On selection of an existing client, calls onChange({ kind: "existing", id, full_name })
 *   - On selection of "Create new client: <typed>", calls onChange({ kind: "new", full_name })
 *   - Parent component is responsible for translating the onChange payload to
 *     POST/PATCH /api/jobs body fields:
 *       existing -> client_id: id
 *       new      -> client_name_for_create: full_name
 *
 * Pattern follows cost-code-combobox.tsx (plain-html, Slate design tokens,
 * keyboard nav, click-outside close) for codebase consistency. Per ITER-2-
 * PATCHES §3.5 the Base UI Combobox primitive at @/components/ui/combobox.tsx
 * is the canonical primitive; this wrapper uses the same UX contract (filtered
 * list + keyboard nav + create-new option) but a plain-html implementation
 * for simpler integration with async fetch + find-or-create flow.
 */

import { useEffect, useMemo, useRef, useState } from "react";

export interface ClientOption {
  id: string;
  full_name: string;
}

export type ClientComboboxValue =
  | { kind: "existing"; id: string; full_name: string }
  | { kind: "new"; full_name: string }
  | { kind: "empty" };

interface Props {
  value: ClientComboboxValue;
  onChange: (next: ClientComboboxValue) => void;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
}

export default function ClientCombobox({
  value,
  onChange,
  disabled,
  placeholder = "Search or type a new client name...",
  label,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(
    value.kind === "existing" ? value.full_name : value.kind === "new" ? value.full_name : "",
  );
  const [options, setOptions] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Async search with light debounce. Cancellation token prevents stale responses.
  useEffect(() => {
    if (!open) return;
    const trimmed = search.trim();
    if (trimmed.length < 2) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/clients?search=${encodeURIComponent(trimmed)}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          if (!cancelled) setOptions([]);
          return;
        }
        const json = (await res.json()) as { clients?: ClientOption[] };
        if (!cancelled) setOptions(json.clients ?? []);
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [search, open]);

  // Click-outside close
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const showCreateOption = useMemo(() => {
    const trimmed = search.trim();
    if (trimmed.length < 2) return false;
    // Show "Create" if no exact match in options
    const exactMatch = options.some(
      (o) => o.full_name.toLowerCase() === trimmed.toLowerCase(),
    );
    return !exactMatch;
  }, [search, options]);

  const totalItems = options.length + (showCreateOption ? 1 : 0);

  function commitExisting(opt: ClientOption) {
    onChange({ kind: "existing", id: opt.id, full_name: opt.full_name });
    setSearch(opt.full_name);
    setOpen(false);
  }

  function commitNew() {
    const trimmed = search.trim();
    if (trimmed.length < 2) return;
    onChange({ kind: "new", full_name: trimmed });
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setHighlight((h) => Math.min(totalItems - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (highlight < options.length) {
        commitExisting(options[highlight]);
      } else if (showCreateOption) {
        commitNew();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setOpen(true);
    setHighlight(0);
    if (!e.target.value.trim()) {
      onChange({ kind: "empty" });
    }
  }

  return (
    <div ref={rootRef} className="relative">
      {label && (
        <span
          className="block mb-1 text-[10px] uppercase tracking-[0.12em]"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            color: "var(--text-tertiary)",
          }}
        >
          {label}
        </span>
      )}
      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        aria-autocomplete="list"
        aria-expanded={open}
        className="w-full px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--nw-stone-blue)] focus:outline-none disabled:opacity-50"
      />
      {open && (
        <div
          className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-y-auto border bg-[var(--bg-card)]"
          style={{
            borderColor: "var(--border-default)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          {loading && (
            <div className="px-3 py-2 text-xs text-[color:var(--text-tertiary)]">
              Searching...
            </div>
          )}
          {!loading && options.length === 0 && !showCreateOption && search.trim().length < 2 && (
            <div className="px-3 py-2 text-xs text-[color:var(--text-tertiary)]">
              Type 2+ characters to search
            </div>
          )}
          {!loading &&
            options.map((opt, idx) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => commitExisting(opt)}
                onMouseEnter={() => setHighlight(idx)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  idx === highlight
                    ? "bg-[rgba(91,134,153,0.08)] text-[color:var(--text-primary)]"
                    : "text-[color:var(--text-primary)] hover:bg-[rgba(91,134,153,0.04)]"
                }`}
              >
                {opt.full_name}
              </button>
            ))}
          {!loading && showCreateOption && (
            <button
              type="button"
              onClick={commitNew}
              onMouseEnter={() => setHighlight(options.length)}
              className={`w-full text-left px-3 py-2 text-sm border-t transition-colors ${
                options.length === highlight
                  ? "bg-[rgba(91,134,153,0.08)] text-[color:var(--text-primary)]"
                  : "text-[color:var(--text-primary)] hover:bg-[rgba(91,134,153,0.04)]"
              }`}
              style={{ borderColor: "var(--border-default)" }}
            >
              <span className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-tertiary)] mr-2">
                Create
              </span>
              {search.trim()}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
