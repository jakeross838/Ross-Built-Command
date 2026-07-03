"use client";

import { useMemo, useState } from "react";

// Shared with CostCodesManager — the shape POSTed to /api/cost-codes/import.
export type ImportDraft = {
  code: string;
  description: string;
  category: string;
  sort_order: number;
  has_co_variant: boolean;
};

export type ParsedFile = {
  fileName: string;
  columns: string[];
  rows: string[][];
  totalRows: number;
  truncated: boolean;
};

// Cost codes may be numeric (22101) OR a named line item — builders track
// overhead, fees, insurance, markup and allowances by name ("Change Order
// Markup", "Contractor Fee", "Buildertrend Flat Rate"). So a code is valid if,
// after trimming, it is non-empty, has no control characters (a sign of parse
// garbage), and is at most 64 chars. Only genuinely-empty or absurdly-long
// cells are flagged — and those stay VISIBLE in the preview, never dropped
// silently.
const CODE_FORMAT = /^[^\t\r\n]{1,64}$/;
const CO_SUFFIX = /^(\d{3,7})[cC]$/;
const NONE = -1; // "not mapped" sentinel for the dropdowns

type ParsedRow = {
  code: string;
  description: string;
  category: string;
  isCo: boolean;
  base: string;
  error: string | null;
};

function guess(columns: string[], patterns: RegExp[]): number {
  for (const re of patterns) {
    const i = columns.findIndex((c) => re.test(c));
    if (i >= 0) return i;
  }
  return NONE;
}

export default function CostCodeImportModal({
  parsed,
  busy,
  onChooseFile,
  onCommit,
  onClose,
  onDownloadSample,
}: {
  parsed: ParsedFile | null;
  busy: boolean;
  onChooseFile: () => void;
  onCommit: (rows: ImportDraft[]) => void;
  onClose: () => void;
  onDownloadSample: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(0,0,0,0.4)] px-4 py-8"
      onClick={onClose}
    >
      <div className="w-full max-w-4xl border nw-panel p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg text-[color:var(--text-primary)]">Import cost codes</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[color:var(--text-secondary)] text-sm px-2 py-1 hover:text-[color:var(--text-primary)]"
          >
            ✕
          </button>
        </div>

        {/* ---- Guidance (shown in BOTH phases — before and after file choice) ---- */}
        <div className="border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3 text-[13px] text-[color:var(--text-secondary)] leading-relaxed">
          <p className="text-[color:var(--text-primary)]">
            <strong>How to format your file.</strong> One row per cost code. Include a column
            for the <strong>code</strong>, a <strong>description</strong>, and the{" "}
            <strong>category</strong> it belongs to. If your code and description live in one
            column (like <code>22101-Appliances</code>), that&rsquo;s fine — we&rsquo;ll offer
            to split them. CSV or Excel (.xlsx) both work.
          </p>
          <button
            type="button"
            onClick={onDownloadSample}
            className="mt-2 text-[12px] tracking-[0.06em] uppercase text-[color:var(--nw-stone-blue)] border-b border-[var(--border-strong)] hover:border-[var(--nw-stone-blue)] pb-0.5"
          >
            Download sample template (.csv)
          </button>
        </div>

        {parsed ? (
          <MappingStep parsed={parsed} busy={busy} onCommit={onCommit} onClose={onClose} />
        ) : (
          <ChooseStep busy={busy} onChooseFile={onChooseFile} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

function ChooseStep({
  busy,
  onChooseFile,
  onClose,
}: {
  busy: boolean;
  onChooseFile: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="mt-4 border border-dashed border-[var(--border-default)] bg-[var(--bg-card)] px-6 py-10 text-center">
        <p className="text-sm text-[color:var(--text-secondary)] max-w-md mx-auto">
          Choose a <strong>CSV</strong> or <strong>Excel (.xlsx)</strong> file. We&rsquo;ll show
          a preview and let you map the columns before anything is saved.
        </p>
        <button
          type="button"
          onClick={onChooseFile}
          disabled={busy}
          className="mt-5 px-4 py-2 nw-primary-btn text-sm disabled:opacity-60"
        >
          {busy ? "Reading…" : "Choose file"}
        </button>
      </div>
      <div className="mt-4">
        <button type="button" onClick={onClose} className="px-4 py-2 border border-[var(--border-default)] text-sm">
          Cancel
        </button>
      </div>
    </>
  );
}

function MappingStep({
  parsed,
  busy,
  onCommit,
  onClose,
}: {
  parsed: ParsedFile;
  busy: boolean;
  onCommit: (rows: ImportDraft[]) => void;
  onClose: () => void;
}) {
  const { fileName, columns, rows, totalRows, truncated } = parsed;

  const [codeCol, setCodeCol] = useState<number>(() =>
    guess(columns, [/^cost\s*code$/i, /^code$/i, /code/i, /item/i])
  );
  const [descCol, setDescCol] = useState<number>(() =>
    guess(columns, [/^description$/i, /desc/i, /^name$/i, /title/i])
  );
  const [catCol, setCatCol] = useState<number>(() =>
    guess(columns, [/^cost\s*category$/i, /categor/i, /group/i, /division|trade/i])
  );

  // Auto-detect a combined "22101-Appliances" column: the code column's values
  // contain a "-" followed by a non-digit (a description), with no separate
  // description column.
  const combinedLikely = useMemo(() => {
    if (codeCol === NONE) return false;
    let hits = 0;
    let seen = 0;
    for (const r of rows.slice(0, 40)) {
      const v = (r[codeCol] ?? "").trim();
      if (!v) continue;
      seen++;
      const idx = v.indexOf("-");
      if (idx >= 0 && /\D/.test(v.slice(idx + 1))) hits++;
    }
    return seen > 0 && hits / seen > 0.5;
  }, [codeCol, rows]);

  const [splitCombined, setSplitCombined] = useState<boolean>(false);
  const [autoApplied, setAutoApplied] = useState(false);
  if (!autoApplied && combinedLikely && descCol === NONE) {
    setSplitCombined(true);
    setAutoApplied(true);
  }

  const parsedRows: ParsedRow[] = useMemo(() => {
    return rows.map((row) => {
      const rawCode = codeCol !== NONE ? (row[codeCol] ?? "").trim() : "";
      let code = rawCode;
      let description = descCol !== NONE ? (row[descCol] ?? "").trim() : "";
      if (splitCombined && rawCode) {
        const idx = rawCode.indexOf("-");
        if (idx >= 0) {
          code = rawCode.slice(0, idx).trim();
          description = rawCode.slice(idx + 1).trim();
        }
        // (b) No "-" in a combined cell → keep the WHOLE cell as the code and
        // do NOT blank the description; it's a valid named line item.
      }
      const category = catCol !== NONE ? (row[catCol] ?? "").trim() : "";
      // Never drop a valid code for a missing description — fall back to the
      // code label itself (a named line item is self-describing).
      if (code && !description) description = code;
      const m = code.match(CO_SUFFIX);
      let error: string | null = null;
      if (!code) error = "No code — check the Code column mapping.";
      else if (!CODE_FORMAT.test(code))
        error = `"${code.slice(0, 32)}${code.length > 32 ? "…" : ""}" is over 64 chars or has invalid characters.`;
      return { code, description, category, isCo: !!m, base: m ? m[1] : code, error };
    });
  }, [rows, codeCol, descCol, catCol, splitCombined]);

  const valid = parsedRows.filter((p) => !p.error);
  const errorRows = parsedRows.filter((p) => p.error);

  const stats = useMemo(() => {
    const bases = new Set<string>();
    const cats = new Set<string>();
    let co = 0;
    for (const p of valid) {
      bases.add(p.isCo ? p.base : p.code);
      if (p.isCo) co++;
      if (p.category) cats.add(p.category);
    }
    return { codes: bases.size, categories: cats.size, coVariants: co };
  }, [valid]);

  function commit() {
    const out: ImportDraft[] = valid.map((p, i) => ({
      code: p.code,
      description: p.description,
      category: p.category,
      sort_order: i,
      has_co_variant: false, // server derives this from the "<digits>C" rows
    }));
    onCommit(out);
  }

  // Sticky header cells must carry their OWN OPAQUE background: (1) backgrounds
  // on thead/tr don't paint under position:sticky, so the color must sit on the
  // <th>; and (2) --bg-subtle is rgba(...,.06) — 94% transparent — so rows
  // scroll straight through it. Use the opaque --bg-page (#f7f5ec) + a bottom
  // border. Table is border-separate + border-spacing-0 (sticky cell backgrounds
  // are unreliable under border-collapse); row separators live on the <td> cells.
  const thClass =
    "sticky top-0 z-10 px-3 py-2 text-left text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)] bg-[var(--bg-page)] border-b border-[var(--border-default)]";
  const tdClass = "px-3 py-2 align-top border-b border-[var(--border-default)]";

  return (
    <>
      <p className="mt-3 text-xs text-[color:var(--text-tertiary)]">
        <span className="font-mono">{fileName}</span> — {totalRows} row
        {totalRows === 1 ? "" : "s"}
        {truncated ? " (showing first 5000)" : ""}. Detected columns:{" "}
        {columns.map((c) => c || "(unnamed)").join(", ")}.
      </p>

      {/* ---- Column mapping ---- */}
      <div className="mt-3 grid sm:grid-cols-3 gap-3">
        <MapField
          label="Code column"
          help="A number like 22101 or a name like Contractor Fee."
          value={codeCol}
          columns={columns}
          onChange={setCodeCol}
        />
        <MapField
          label="Description column"
          help="What the code is for, e.g. Appliances."
          value={descCol}
          columns={columns}
          onChange={setDescCol}
          disabled={splitCombined}
          disabledNote="From the split"
        />
        <MapField
          label="Category column"
          help="The group it belongs to — used for grouping."
          value={catCol}
          columns={columns}
          onChange={setCatCol}
        />
      </div>

      <label className="mt-3 flex items-start gap-2 text-[13px] text-[color:var(--text-primary)]">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={splitCombined}
          onChange={(e) => {
            setSplitCombined(e.target.checked);
            setAutoApplied(true);
          }}
        />
        <span>
          The code column also contains the description — split on the first <code>-</code>{" "}
          (digits before = code, the rest = description).
          {combinedLikely && !splitCombined && (
            <span className="text-[color:var(--nw-warn)]"> Looks like yours does.</span>
          )}
        </span>
      </label>

      {/* ---- Stats ---- */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm border-y border-[var(--border-default)] py-2">
        <Stat n={stats.codes} label="cost codes" />
        <Stat n={stats.categories} label="categories" />
        <Stat n={stats.coVariants} label="change-order variants" />
        {errorRows.length > 0 && (
          <span className="text-[color:var(--nw-danger)]">
            {errorRows.length} row{errorRows.length === 1 ? "" : "s"} flagged — shown below, not imported
          </span>
        )}
      </div>

      {/* ---- Preview ---- */}
      <div className="mt-3 max-h-[300px] overflow-auto border border-[var(--border-default)]">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr>
              <th className={thClass}>Code</th>
              <th className={thClass}>Description</th>
              <th className={thClass}>Category</th>
              <th className={thClass}>Result</th>
            </tr>
          </thead>
          <tbody>
            {parsedRows.map((p, i) => (
              <tr key={i} className={p.error ? "bg-[rgba(176,85,78,0.06)]" : ""}>
                <td className={`${tdClass} font-mono whitespace-nowrap`}>{p.code || "—"}</td>
                <td className={tdClass}>{p.description}</td>
                <td className={`${tdClass} text-[color:var(--text-secondary)]`}>{p.category}</td>
                <td className={`${tdClass} text-xs`}>
                  {p.error ? (
                    <span className="text-[color:var(--nw-danger)]">{p.error}</span>
                  ) : p.isCo ? (
                    <span className="text-[color:var(--text-secondary)]">
                      change-order → merges into {p.base}
                    </span>
                  ) : (
                    <span className="text-[color:var(--nw-success)]">ok</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex gap-2 items-center">
        <button
          type="button"
          onClick={commit}
          disabled={busy || valid.length === 0}
          className="px-4 py-2 nw-primary-btn text-sm disabled:opacity-60"
        >
          {busy ? "Importing…" : `Import ${stats.codes} code${stats.codes === 1 ? "" : "s"}`}
        </button>
        <button type="button" onClick={onClose} className="px-4 py-2 border border-[var(--border-default)] text-sm">
          Cancel
        </button>
        {valid.length === 0 && (
          <span className="text-xs text-[color:var(--nw-danger)]">
            Nothing to import — check your column mapping.
          </span>
        )}
      </div>
    </>
  );
}

function MapField({
  label,
  help,
  value,
  columns,
  onChange,
  disabled,
  disabledNote,
}: {
  label: string;
  help: string;
  value: number;
  columns: string[];
  onChange: (v: number) => void;
  disabled?: boolean;
  disabledNote?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] tracking-[0.08em] uppercase text-[color:var(--text-secondary)]">
        {label}
      </span>
      {disabled ? (
        <div className="px-2 py-2 border border-[var(--border-default)] bg-[var(--bg-subtle)] text-sm text-[color:var(--text-tertiary)] italic">
          {disabledNote}
        </div>
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="px-2 py-2 border nw-panel text-sm"
        >
          <option value={NONE}>— not in file —</option>
          {columns.map((c, i) => (
            <option key={i} value={i}>
              {c || `Column ${i + 1}`}
            </option>
          ))}
        </select>
      )}
      <span className="text-[11px] text-[color:var(--text-tertiary)] leading-snug">{help}</span>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <span className="text-[color:var(--text-primary)]">
      <strong className="font-mono">{n}</strong>{" "}
      <span className="text-[color:var(--text-secondary)]">{label}</span>
    </span>
  );
}
