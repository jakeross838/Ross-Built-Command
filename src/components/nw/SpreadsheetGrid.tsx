"use client";

/**
 * SpreadsheetGrid — the app-wide Excel-pure editable table standard
 * (Stage-2 review redesign; design_handoff_redesign/README.md "Allocation grid
 * — Excel interaction spec"). Bordered grid, borderless in-place cell editing,
 * keyboard navigation, NO edit modals.
 *
 * Interaction contract (canonical for the whole app):
 *   - click a cell to select; click a selected editable cell (or start typing,
 *     or press Enter) to edit in place; focus shows an inset 1px stone-blue ring
 *   - Tab / Shift-Tab move right / left (wrapping across rows)
 *   - Enter commits and moves down; typing replaces; Esc reverts the cell
 *   - arrow keys navigate between cells when NOT editing
 *   - numeric cells are JetBrains Mono tabular-nums, right-aligned
 *   - row actions (✕ remove) are hover-revealed at the row end
 *   - "combobox" cells delegate to a caller-supplied editor (e.g. a searchable
 *     cost-code picker) that owns its own panel/keyboard; never clipped
 *
 * Generic over the row type. Columns declare how each cell reads, displays, and
 * writes its value. The grid owns selection/edit state; rows stay controlled by
 * the parent via `onRowsChange`.
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type GridColumnKind = "text" | "number" | "combobox";

export type GridColumn<Row> = {
  key: string;
  header: ReactNode;
  /** CSS grid track (e.g. "minmax(140px,1fr)", "130px"). */
  width: string;
  kind: GridColumnKind;
  align?: "left" | "right";
  /** Display (non-editing) content for a cell. */
  display: (row: Row, rowIndex: number) => ReactNode;
  /** text/number: current edit string. */
  getValue?: (row: Row) => string;
  /** text/number: apply an edited string, returning the patched row. */
  setValue?: (row: Row, raw: string) => Row;
  /** combobox: caller-owned editor. Calls done() to return focus to the grid. */
  editor?: (args: {
    row: Row;
    rowIndex: number;
    done: () => void;
    setRow: (patch: Row) => void;
  }) => ReactNode;
  /** Per-cell red flag (e.g. missing cost code) → danger ring. */
  invalid?: (row: Row) => boolean;
  editable?: boolean;
};

type Props<Row> = {
  rows: Row[];
  columns: GridColumn<Row>[];
  onRowsChange: (rows: Row[]) => void;
  readOnly?: boolean;
  onRemoveRow?: (index: number) => void;
  /** Rendered inside the grid, spanning all columns, as the total/footer row. */
  footer?: ReactNode;
  ariaLabel?: string;
};

export default function SpreadsheetGrid<Row>({
  rows,
  columns,
  onRowsChange,
  readOnly,
  onRemoveRow,
  footer,
  ariaLabel,
}: Props<Row>) {
  // Selected cell + whether it's in edit mode. Column index excludes the
  // trailing remove-action affordance.
  const [active, setActive] = useState<{ r: number; c: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeCellRef = useRef<HTMLDivElement>(null);
  const editableCols = columns.map((_, i) => i).filter((i) => columns[i].editable !== false);

  const template = columns.map((c) => c.width).join(" ") + " 26px";

  const beginEdit = useCallback(
    (r: number, c: number, initial?: string) => {
      const col = columns[c];
      if (readOnly || col.editable === false) return;
      if (col.kind === "combobox") {
        setActive({ r, c });
        setEditing(true);
        return;
      }
      setActive({ r, c });
      setDraft(initial ?? col.getValue?.(rows[r]) ?? "");
      setEditing(true);
    },
    [columns, readOnly, rows]
  );

  const commit = useCallback(() => {
    if (!active) return;
    const col = columns[active.c];
    if (col.kind !== "combobox" && col.setValue) {
      onRowsChange(rows.map((row, i) => (i === active.r ? col.setValue!(row, draft) : row)));
    }
    setEditing(false);
  }, [active, columns, draft, onRowsChange, rows]);

  const cancel = useCallback(() => setEditing(false), []);

  const move = useCallback(
    (dr: number, dc: number) => {
      if (!active) return;
      let r = active.r;
      let idxInEditable = editableCols.indexOf(active.c);
      if (idxInEditable === -1) idxInEditable = 0;
      idxInEditable += dc;
      r += dr;
      // Horizontal wrap across rows.
      while (idxInEditable >= editableCols.length) {
        idxInEditable -= editableCols.length;
        r += 1;
      }
      while (idxInEditable < 0) {
        idxInEditable += editableCols.length;
        r -= 1;
      }
      if (r < 0) r = 0;
      if (r > rows.length - 1) r = rows.length - 1;
      setActive({ r, c: editableCols[idxInEditable] });
      setEditing(false);
    },
    [active, editableCols, rows.length]
  );

  // Keep DOM focus on whatever the active cell currently is: the inline input
  // while editing (so typing/commit/Esc land there), else the cell div itself
  // (so arrow/Enter/Tab navigation fires). Without this, a mouse click selects
  // a cell but keyboard events have nowhere to go.
  useEffect(() => {
    if (!active) return;
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else {
      activeCellRef.current?.focus();
    }
  }, [editing, active]);

  function onCellKeyDown(e: React.KeyboardEvent, r: number, c: number) {
    const col = columns[c];
    if (editing && active?.r === r && active?.c === c) {
      if (col.kind === "combobox") return; // editor owns its keys
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
        move(1, 0);
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      } else if (e.key === "Tab") {
        e.preventDefault();
        commit();
        move(0, e.shiftKey ? -1 : 1);
      }
      return;
    }
    // Not editing: navigation + enter-to-edit + type-to-replace.
    if (e.key === "Enter" || e.key === "F2") {
      e.preventDefault();
      beginEdit(r, c);
    } else if (e.key === "Tab") {
      e.preventDefault();
      move(0, e.shiftKey ? -1 : 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      move(0, 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      move(0, -1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1, 0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1, 0);
    } else if (col.kind !== "combobox" && e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
      // Typing replaces the cell.
      e.preventDefault();
      beginEdit(r, c, e.key);
    } else if (col.kind === "combobox" && (e.key.length === 1 || e.key === "Enter")) {
      e.preventDefault();
      beginEdit(r, c);
    }
  }

  return (
    <div
      ref={gridRef}
      role="grid"
      aria-label={ariaLabel}
      className="nw-grid"
      style={{ ["--nw-grid-cols" as string]: template }}
    >
      <div role="row" className="nw-grid-head" style={{ gridTemplateColumns: template }}>
        {columns.map((col) => (
          <div
            key={col.key}
            role="columnheader"
            className="nw-grid-eyebrow"
            style={{ textAlign: col.align ?? "left" }}
          >
            {col.header}
          </div>
        ))}
        <div />
      </div>

      {rows.map((row, r) => (
        <div
          role="row"
          key={r}
          className="nw-grid-row"
          style={{ gridTemplateColumns: template }}
        >
          {columns.map((col, c) => {
            const isActive = active?.r === r && active?.c === c;
            const isEditing = isActive && editing;
            const invalid = col.invalid?.(row) ?? false;
            const canEdit = !readOnly && col.editable !== false;
            return (
              <div
                key={col.key}
                ref={isActive ? activeCellRef : undefined}
                role="gridcell"
                tabIndex={isActive ? 0 : -1}
                onKeyDown={(e) => onCellKeyDown(e, r, c)}
                onClick={() => {
                  // Single click edits an editable text/number cell in place
                  // (mockup: "click any cell to edit in place"). Combobox cells
                  // own their own click; just select those.
                  if (canEdit && col.kind !== "combobox") beginEdit(r, c);
                  else setActive({ r, c });
                }}
                className={
                  "nw-grid-cell" +
                  (isActive ? " is-active" : "") +
                  (invalid ? " is-invalid" : "") +
                  (col.align === "right" ? " is-num" : "")
                }
              >
                {isEditing && col.kind === "combobox" && col.editor
                  ? col.editor({
                      row,
                      rowIndex: r,
                      done: () => setEditing(false),
                      setRow: (patch) => onRowsChange(rows.map((x, i) => (i === r ? patch : x))),
                    })
                  : isEditing
                    ? (
                      <input
                        ref={inputRef}
                        className="nw-grid-input"
                        type={col.kind === "number" ? "text" : "text"}
                        inputMode={col.kind === "number" ? "decimal" : undefined}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={commit}
                        style={{ textAlign: col.align ?? "left" }}
                      />
                    )
                    : (
                      <span className="nw-grid-value">{col.display(row, r)}</span>
                    )}
              </div>
            );
          })}
          <div className="nw-grid-rowact">
            {!readOnly && onRemoveRow && rows.length > 1 && (
              <button
                type="button"
                aria-label="Remove row"
                className="nw-grid-remove"
                onClick={() => onRemoveRow(r)}
                tabIndex={-1}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      ))}

      {footer && (
        <div role="row" className="nw-grid-foot" style={{ gridTemplateColumns: template }}>
          {footer}
        </div>
      )}
    </div>
  );
}
