"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CostCode } from "./page";
import CostCodeImportModal, { type ImportDraft } from "./CostCodeImportModal";

if (typeof document !== "undefined" && !document.getElementById("nw-cc-styles")) {
  const s = document.createElement("style");
  s.id = "nw-cc-styles";
  s.textContent = `
    .nw-panel { background: var(--bg-card); border-color: var(--border-default); }
    .nw-input { background: var(--bg-subtle); border-color: var(--border-default); color: var(--text-primary); }
    .nw-input:focus { outline: none; border-color: var(--nw-stone-blue); }
    .nw-primary-btn { font-family: var(--font-jetbrains-mono); letter-spacing: 0.12em; font-weight: 500; background: var(--nw-stone-blue); color: var(--nw-white-sand); border: 1px solid var(--nw-stone-blue); }
    .nw-primary-btn:hover:not(:disabled) { background: var(--nw-gulf-blue); border-color: var(--nw-gulf-blue); }
  `;
  document.head.appendChild(s);
}

// Cost code format — mirrors CODE_FORMAT in src/app/api/cost-codes/route.ts.
const CODE_FORMAT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,19}$/;
const NEW_CATEGORY = "__new__";

type DraftRow = {
  code: string;
  description: string;
  category: string; // "" = Uncategorized
  has_co_variant: boolean;
  addingCategory: boolean; // true → show the free-text "new category" input
  error?: string | null;
};

type Modal =
  | { mode: "add"; rows: DraftRow[] }
  | { mode: "edit"; id: string; rows: [DraftRow] };

function blankRow(): DraftRow {
  return { code: "", description: "", category: "", has_co_variant: false, addingCategory: false };
}

function csvEscape(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export default function CostCodesManager({ initial }: { initial: CostCode[] }) {
  const router = useRouter();
  const [codes, setCodes] = useState<CostCode[]>(initial);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<Modal | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [parsedFile, setParsedFile] = useState<{
    fileName: string;
    columns: string[];
    rows: string[][];
    totalRows: number;
    truncated: boolean;
  } | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const existingCategories = useMemo(() => {
    const set = new Set<string>();
    for (const c of codes) {
      const cat = (c.category ?? "").trim();
      if (cat) set.add(cat);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [codes]);

  // Categories available in the modal dropdown: existing + any typed on other
  // rows this session (so a new category propagates to sibling rows).
  const draftCategories = useMemo(() => {
    if (!modal) return existingCategories;
    const set = new Set(existingCategories);
    for (const r of modal.rows) {
      const cat = r.category.trim();
      if (cat) set.add(cat);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [modal, existingCategories]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return codes;
    return codes.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        (c.category ?? "").toLowerCase().includes(q)
    );
  }, [codes, search]);

  // STEP 4: group by category with a stable order (named alpha, Uncategorized last).
  const grouped = useMemo(() => {
    const map = new Map<string, CostCode[]>();
    for (const c of filtered) {
      const key = (c.category ?? "").trim() || "Uncategorized";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code));
    }
    return Array.from(map.entries()).sort((a, b) => {
      if (a[0] === "Uncategorized") return 1;
      if (b[0] === "Uncategorized") return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [filtered]);

  async function refresh() {
    const res = await fetch("/api/cost-codes", { cache: "no-store" });
    if (res.ok) {
      const body = (await res.json()) as { codes: CostCode[] };
      setCodes(body.codes);
    }
  }

  // ---- Modal ----
  function openAdd() {
    setModal({ mode: "add", rows: [blankRow(), blankRow(), blankRow()] });
  }
  function openEdit(c: CostCode) {
    setModal({
      mode: "edit",
      id: c.id,
      rows: [
        {
          code: c.code,
          description: c.description,
          category: c.category ?? "",
          has_co_variant: c.has_co_variant,
          addingCategory: false,
        },
      ],
    });
  }
  function patchRow(i: number, patch: Partial<DraftRow>) {
    setModal((m) => {
      if (!m) return m;
      const rows = m.rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) as DraftRow[];
      return { ...m, rows } as Modal;
    });
  }
  function addRow() {
    setModal((m) => (m && m.mode === "add" ? { ...m, rows: [...m.rows, blankRow()] } : m));
  }
  function removeRow(i: number) {
    setModal((m) => {
      if (!m || m.mode !== "add") return m;
      const rows = m.rows.filter((_, idx) => idx !== i);
      return { ...m, rows: rows.length ? rows : [blankRow()] };
    });
  }

  function validateAndCollect(): { rows: ImportDraft[]; ok: boolean } | null {
    if (!modal) return null;
    const existingLower = new Map(codes.map((c) => [c.code.toLowerCase(), c.id]));
    const seen = new Map<string, number>();
    const isAdd = modal.mode === "add";
    const editingId = modal.mode === "edit" ? modal.id : null;

    // A fully-blank row in add mode is ignored (not an error).
    const rowsWithErrors = modal.rows.map((r, i) => {
      const code = r.code.trim();
      const desc = r.description.trim();
      if (isAdd && !code && !desc && !r.category.trim()) {
        return { ...r, error: null, _blank: true };
      }
      let error: string | null = null;
      if (!code) error = "Code is required.";
      else if (!CODE_FORMAT.test(code))
        error = "Use letters, digits, . - _ (max 20 chars).";
      else if (!desc) error = "Description is required.";
      else {
        const lc = code.toLowerCase();
        const owner = existingLower.get(lc);
        if (owner && owner !== editingId) error = `"${code}" already exists.`;
        else if (seen.has(lc)) error = `Duplicate of row ${seen.get(lc)! + 1}.`;
        else seen.set(lc, i);
      }
      return { ...r, error, _blank: false };
    });

    setModal((m) =>
      m ? ({ ...m, rows: rowsWithErrors.map(({ _blank, ...r }) => r) } as Modal) : m
    );

    const live = rowsWithErrors.filter((r) => !r._blank);
    if (live.length === 0) {
      setMessage({ kind: "err", text: "Add at least one code." });
      return { rows: [], ok: false };
    }
    if (live.some((r) => r.error)) return { rows: [], ok: false };

    const out: ImportDraft[] = live.map((r) => ({
      code: r.code.trim(),
      description: r.description.trim(),
      category: r.category.trim(),
      sort_order: 0,
      has_co_variant: r.has_co_variant,
    }));
    return { rows: out, ok: true };
  }

  async function saveModal() {
    if (!modal) return;
    const collected = validateAndCollect();
    if (!collected || !collected.ok) return;
    setBusy(true);
    setMessage(null);
    try {
      if (modal.mode === "edit") {
        const r = collected.rows[0];
        const res = await fetch(`/api/cost-codes/${modal.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            code: r.code,
            description: r.description,
            category: r.category || null,
            has_co_variant: r.has_co_variant,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? `Save failed (${res.status})`);
        }
        setMessage({ kind: "ok", text: "Saved." });
      } else {
        const res = await fetch("/api/cost-codes/import", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            codes: collected.rows.map((r) => ({
              code: r.code,
              description: r.description,
              category: r.category || null,
              sort_order: r.sort_order,
              has_co_variant: r.has_co_variant,
            })),
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Save failed");
        }
        const body = await res.json();
        setMessage({ kind: "ok", text: `Added ${body.imported} cost code${body.imported === 1 ? "" : "s"}.` });
      }
      setModal(null);
      await refresh();
      router.refresh();
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setBusy(false);
    }
  }

  async function deleteOne(id: string) {
    if (!confirm("Delete this cost code? It will be soft-deleted and can be restored via SQL if needed.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/cost-codes/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Delete failed");
      }
      setMessage({ kind: "ok", text: "Deleted." });
      await refresh();
      router.refresh();
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Delete failed" });
    } finally {
      setBusy(false);
    }
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} cost codes? Soft-delete only.`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/cost-codes/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "delete", ids: Array.from(selected) }),
      });
      if (!res.ok) throw new Error("Bulk delete failed");
      setSelected(new Set());
      setMessage({ kind: "ok", text: "Bulk delete complete." });
      await refresh();
      router.refresh();
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Bulk delete failed" });
    } finally {
      setBusy(false);
    }
  }

  async function bulkCategory() {
    if (selected.size === 0) return;
    const category = prompt("New category for selected cost codes (blank to clear):");
    if (category === null) return;
    setBusy(true);
    try {
      const res = await fetch("/api/cost-codes/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "category", ids: Array.from(selected), category: category || null }),
      });
      if (!res.ok) throw new Error("Bulk update failed");
      setSelected(new Set());
      setMessage({ kind: "ok", text: "Category applied." });
      await refresh();
      router.refresh();
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Bulk update failed" });
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const header = "code,description,category,sort_order,has_co_variant";
    const rows = codes
      .map((c) =>
        [
          csvEscape(c.code),
          csvEscape(c.description),
          csvEscape(c.category ?? ""),
          String(c.sort_order),
          c.has_co_variant ? "true" : "false",
        ].join(",")
      )
      .join("\n");
    const blob = new Blob([`${header}\n${rows}\n`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cost-codes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/cost-codes/parse-file", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Could not read file (${res.status})`);
      }
      const body = (await res.json()) as {
        columns: string[];
        rows: string[][];
        total_rows: number;
        truncated: boolean;
      };
      setParsedFile({
        fileName: file.name,
        columns: body.columns,
        rows: body.rows,
        totalRows: body.total_rows,
        truncated: body.truncated,
      });
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Could not read file" });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function downloadSample() {
    const sample =
      "code,description,category\n" +
      "03101,Concrete & Foundation,Structure\n" +
      "06101,Framing,Structure\n" +
      "09101,Electrical,Electrical\n" +
      "09101C,Electrical Change Order,Electrical\n" +
      "10101,Plumbing,Plumbing\n";
    const blob = new Blob([sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cost-codes-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportCommit(rows: ImportDraft[]) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/cost-codes/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ codes: rows }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Import failed");
      }
      const body = await res.json();
      setParsedFile(null);
      setImportOpen(false);
      setMessage({
        kind: "ok",
        text: `Imported ${body.imported} cost codes${
          body.co_variants_merged
            ? ` (${body.co_variants_merged} change-order variant${body.co_variants_merged === 1 ? "" : "s"} merged)`
            : ""
        }.`,
      });
      await refresh();
      router.refresh();
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Import failed" });
    } finally {
      setBusy(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleGroup(cat: string) {
    setCollapsed((s) => {
      const next = new Set(s);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <input
          type="search"
          placeholder="Search code, description, or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border nw-panel text-sm w-[320px] max-w-full"
        />
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={openAdd}
            className="px-3 py-2 bg-[var(--nw-stone-blue)] text-[color:var(--nw-white-sand)] text-sm hover:bg-[var(--nw-gulf-blue)] transition-colors"
          >
            + Add Cost Codes
          </button>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="px-3 py-2 border border-[var(--border-default)] text-sm"
          >
            Import CSV / Excel
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={onImportFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={exportCsv}
            className="px-3 py-2 border border-[var(--border-default)] text-sm"
          >
            Export CSV
          </button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border-default)] text-sm">
          <span className="text-[color:var(--text-primary)]">{selected.size} selected</span>
          <button type="button" onClick={bulkCategory} disabled={busy} className="px-3 py-1 border border-[var(--border-default)]">
            Change category
          </button>
          <button type="button" onClick={bulkDelete} disabled={busy} className="px-3 py-1 border border-[var(--border-default)] text-[color:var(--nw-danger)]">
            Delete
          </button>
          <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-xs text-[color:var(--text-secondary)]">
            Clear
          </button>
        </div>
      )}

      {message && (
        <p className={`text-xs ${message.kind === "ok" ? "text-[color:var(--nw-success)]" : "text-[color:var(--nw-danger)]"}`}>
          {message.text}
        </p>
      )}

      {/* STEP 4: grouped, collapsible list */}
      <div className="border nw-panel overflow-hidden">
        {grouped.length === 0 && (
          <div className="px-3 py-8 text-center text-[color:var(--text-secondary)] text-sm">
            {search ? "No matching cost codes." : "No cost codes yet. Click + Add Cost Codes or Import CSV / Excel."}
          </div>
        )}
        {grouped.map(([cat, list]) => {
          const isCollapsed = collapsed.has(cat);
          const coCount = list.filter((c) => c.has_co_variant).length;
          return (
            <div key={cat} className="border-b border-[var(--border-default)] last:border-b-0">
              <button
                type="button"
                onClick={() => toggleGroup(cat)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-[var(--bg-subtle)] text-left hover:bg-[var(--bg-card)] transition-colors"
              >
                <span className="text-[color:var(--text-secondary)] text-xs w-3">{isCollapsed ? "▸" : "▾"}</span>
                <span className="font-display text-sm text-[color:var(--text-primary)]">{cat}</span>
                <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-[color:var(--text-tertiary)]">
                  {list.length} code{list.length === 1 ? "" : "s"}
                  {coCount > 0 ? ` · ${coCount} CO` : ""}
                </span>
              </button>
              {!isCollapsed && (
                <table className="w-full text-sm">
                  <tbody>
                    {list.map((c) => (
                      <tr key={c.id} className="border-t border-[var(--border-default)]">
                        <td className="px-3 py-2 w-8">
                          <input
                            type="checkbox"
                            checked={selected.has(c.id)}
                            onChange={() => toggleSelect(c.id)}
                          />
                        </td>
                        <td className="px-3 py-2 font-mono text-[color:var(--text-primary)] whitespace-nowrap">
                          {c.code}
                          {c.has_co_variant && (
                            <span
                              title={`Has change-order variant ${c.code}C`}
                              className="ml-2 inline-block px-1.5 py-0.5 border border-[var(--border-strong)] text-[9px] font-mono tracking-[0.08em] text-[color:var(--text-secondary)] align-middle"
                            >
                              +{c.code}C
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[color:var(--text-primary)]">{c.description}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openEdit(c)}
                            className="text-xs px-2 py-1 border border-[var(--border-default)] hover:bg-[var(--bg-subtle)]"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteOne(c.id)}
                            className="ml-1 text-xs px-2 py-1 border border-[var(--border-default)] text-[color:var(--nw-danger)] hover:bg-[var(--bg-subtle)]"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-[color:var(--text-secondary)]">
        {filtered.length} of {codes.length} codes shown.
      </p>

      {modal && (
        <CostCodeModal
          modal={modal}
          categories={draftCategories}
          busy={busy}
          onClose={() => setModal(null)}
          onPatchRow={patchRow}
          onAddRow={addRow}
          onRemoveRow={removeRow}
          onSave={saveModal}
        />
      )}

      {importOpen && (
        <CostCodeImportModal
          parsed={parsedFile}
          busy={busy}
          onChooseFile={() => fileRef.current?.click()}
          onCommit={handleImportCommit}
          onClose={() => {
            setImportOpen(false);
            setParsedFile(null);
          }}
          onDownloadSample={downloadSample}
        />
      )}
    </div>
  );
}

function CostCodeModal({
  modal,
  categories,
  busy,
  onClose,
  onPatchRow,
  onAddRow,
  onRemoveRow,
  onSave,
}: {
  modal: Modal;
  categories: string[];
  busy: boolean;
  onClose: () => void;
  onPatchRow: (i: number, patch: Partial<DraftRow>) => void;
  onAddRow: () => void;
  onRemoveRow: (i: number) => void;
  onSave: () => void;
}) {
  const isAdd = modal.mode === "add";
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(0,0,0,0.4)] px-4 py-10"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl border nw-panel p-5 shadow-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg text-[color:var(--text-primary)]">
            {isAdd ? "Add cost codes" : "Edit cost code"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[color:var(--text-secondary)] text-sm px-2 py-1 hover:text-[color:var(--text-primary)]"
          >
            ✕
          </button>
        </div>

        <div className="hidden sm:grid grid-cols-[130px_1fr_170px_90px_28px] gap-2 mb-1 text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)] px-0.5">
          <span>Code</span>
          <span>Description</span>
          <span>Category</span>
          <span>CO variant</span>
          <span></span>
        </div>

        <div className="space-y-2">
          {modal.rows.map((row, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[130px_1fr_170px_90px_28px] gap-2 items-start">
              <input
                value={row.code}
                onChange={(e) => onPatchRow(i, { code: e.target.value, error: null })}
                placeholder="13101"
                className="px-2 py-2 border nw-panel text-sm font-mono"
              />
              <input
                value={row.description}
                onChange={(e) => onPatchRow(i, { description: e.target.value, error: null })}
                placeholder="Description"
                className="px-2 py-2 border nw-panel text-sm"
              />
              {row.addingCategory ? (
                <div className="flex gap-1">
                  <input
                    autoFocus
                    value={row.category}
                    onChange={(e) => onPatchRow(i, { category: e.target.value })}
                    placeholder="New category"
                    className="px-2 py-2 border nw-panel text-sm w-full"
                  />
                  <button
                    type="button"
                    title="Back to list"
                    onClick={() => onPatchRow(i, { addingCategory: false, category: "" })}
                    className="px-2 border border-[var(--border-default)] text-[color:var(--text-secondary)]"
                  >
                    ↩
                  </button>
                </div>
              ) : (
                <select
                  value={categories.includes(row.category) ? row.category : ""}
                  onChange={(e) => {
                    if (e.target.value === NEW_CATEGORY) onPatchRow(i, { addingCategory: true, category: "" });
                    else onPatchRow(i, { category: e.target.value });
                  }}
                  className="px-2 py-2 border nw-panel text-sm"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value={NEW_CATEGORY}>+ New category…</option>
                </select>
              )}
              <label className="flex items-center gap-1.5 text-sm text-[color:var(--text-primary)] py-2">
                <input
                  type="checkbox"
                  checked={row.has_co_variant}
                  onChange={(e) => onPatchRow(i, { has_co_variant: e.target.checked })}
                />
                <span className="sm:hidden">CO variant</span>
              </label>
              {isAdd ? (
                <button
                  type="button"
                  title="Remove row"
                  onClick={() => onRemoveRow(i)}
                  className="py-2 text-[color:var(--text-tertiary)] hover:text-[color:var(--nw-danger)]"
                >
                  ✕
                </button>
              ) : (
                <span />
              )}
              {row.error && (
                <p className="sm:col-span-5 text-xs text-[color:var(--nw-danger)] -mt-1">{row.error}</p>
              )}
            </div>
          ))}
        </div>

        {isAdd && (
          <button
            type="button"
            onClick={onAddRow}
            className="mt-2 text-sm px-3 py-1.5 border border-[var(--border-default)] text-[color:var(--text-primary)] hover:bg-[var(--bg-subtle)]"
          >
            + Add row
          </button>
        )}

        <p className="mt-3 text-xs text-[color:var(--text-secondary)]">
          Check <strong>CO variant</strong> when a code also has a change-order line (13101 → 13101C) — it stays one code, not two.
        </p>

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onSave} disabled={busy} className="px-4 py-2 nw-primary-btn text-sm disabled:opacity-60">
            {busy ? "Saving…" : isAdd ? "Add codes" : "Save"}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2 border border-[var(--border-default)] text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
