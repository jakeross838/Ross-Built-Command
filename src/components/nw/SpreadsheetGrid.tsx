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
 *
 * Perf (Stage-1): rows render through a memoized <GridRow> so a keystroke in
 * the active cell re-renders ONLY that row — the per-row combobox cells in the
 * other rows skip. Unchanged row objects keep identity (parents patch rows via
 * map-with-same-object-for-untouched), so the default shallow compare works.
 * Handlers reach rows through a ref-backed stable callback, keeping the memo
 * effective without stale closures.
 */
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
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

type RowCallbacks<Row> = {
  onCellKeyDown: (e: React.KeyboardEvent, r: number, c: number) => void;
  onCellClick: (r: number, c: number) => void;
  onDraftChange: (value: string) => void;
  onCommit: () => void;
  onEditorDone: () => void;
  onEditorSetRow: (r: number, patch: Row) => void;
  onRemove: (r: number) => void;
};

function GridRowInner<Row>({
  row,
  rowIndex,
  columns,
  template,
  readOnly,
  showRemove,
  activeCol,
  editing,
  draft,
  inputRef,
  activeCellRef,
  cb,
}: {
  row: Row;
  rowIndex: number;
  columns: GridColumn<Row>[];
  template: string;
  readOnly?: boolean;
  showRemove: boolean;
  /** Column index of the active cell when this row holds it, else null. */
  activeCol: number | null;
  /** True when the active cell in THIS row is in edit mode. */
  editing: boolean;
  /** Draft value for the in-edit cell (only meaningful while editing). */
  draft: string;
  inputRef: RefObject<HTMLInputElement>;
  activeCellRef: RefObject<HTMLDivElement>;
  cb: RowCallbacks<Row>;
}) {
  return (
    <div role="row" className="nw-grid-row" style={{ gridTemplateColumns: template }}>
      {columns.map((col, c) => {
        const isActive = activeCol === c;
        const isEditing = isActive && editing;
        const invalid = col.invalid?.(row) ?? false;
        return (
          <div
            key={col.key}
            ref={isActive ? activeCellRef : undefined}
            role="gridcell"
            tabIndex={isActive ? 0 : -1}
            onKeyDown={(e) => cb.onCellKeyDown(e, rowIndex, c)}
            onClick={() => cb.onCellClick(rowIndex, c)}
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
                  rowIndex,
                  done: cb.onEditorDone,
                  setRow: (patch) => cb.onEditorSetRow(rowIndex, patch),
                })
              : isEditing
                ? (
                  <input
                    ref={inputRef}
                    className="nw-grid-input"
                    type="text"
                    inputMode={col.kind === "number" ? "decimal" : undefined}
                    value={draft}
                    onChange={(e) => cb.onDraftChange(e.target.value)}
                    onBlur={cb.onCommit}
                    style={{ textAlign: col.align ?? "left" }}
                  />
                )
                : (
                  <span className="nw-grid-value">{col.display(row, rowIndex)}</span>
                )}
          </div>
        );
      })}
      <div className="nw-grid-rowact">
        {!readOnly && showRemove && (
          <button
            type="button"
            aria-label="Remove row"
            className="nw-grid-remove"
            onClick={() => cb.onRemove(rowIndex)}
            tabIndex={-1}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
// Shallow-compare memo; generics survive via the cast.
const GridRow = memo(GridRowInner) as typeof GridRowInner;

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

  function onCellClick(r: number, c: number) {
    const col = columns[c];
    const canEdit = !readOnly && col.editable !== false;
    // Single click edits an editable text/number cell in place
    // (mockup: "click any cell to edit in place"). Combobox cells
    // own their own click; just select those.
    if (canEdit && col.kind !== "combobox") beginEdit(r, c);
    else setActive({ r, c });
  }

  // Stable callback bundle for the memoized rows — identity never changes;
  // the ref always points at this render's handlers (no stale closures).
  const handlersRef = useRef<RowCallbacks<Row>>(null as unknown as RowCallbacks<Row>);
  handlersRef.current = {
    onCellKeyDown,
    onCellClick,
    onDraftChange: setDraft,
    onCommit: commit,
    onEditorDone: () => setEditing(false),
    onEditorSetRow: (r, patch) => onRowsChange(rows.map((x, i) => (i === r ? patch : x))),
    onRemove: (r) => onRemoveRow?.(r),
  };
  const stableCbRef = useRef<RowCallbacks<Row> | null>(null);
  if (stableCbRef.current === null) {
    stableCbRef.current = {
      onCellKeyDown: (e, r, c) => handlersRef.current.onCellKeyDown(e, r, c),
      onCellClick: (r, c) => handlersRef.current.onCellClick(r, c),
      onDraftChange: (v) => handlersRef.current.onDraftChange(v),
      onCommit: () => handlersRef.current.onCommit(),
      onEditorDone: () => handlersRef.current.onEditorDone(),
      onEditorSetRow: (r, patch) => handlersRef.current.onEditorSetRow(r, patch),
      onRemove: (r) => handlersRef.current.onRemove(r),
    };
  }
  const cb = stableCbRef.current;

  const showRemove = !readOnly && !!onRemoveRow && rows.length > 1;

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
        <GridRow
          key={r}
          row={row}
          rowIndex={r}
          columns={columns}
          template={template}
          readOnly={readOnly}
          showRemove={showRemove}
          activeCol={active?.r === r ? active.c : null}
          editing={active?.r === r && editing}
          draft={active?.r === r && editing ? draft : ""}
          inputRef={inputRef}
          activeCellRef={activeCellRef}
          cb={cb}
        />
      ))}

      {footer && (
        <div role="row" className="nw-grid-foot" style={{ gridTemplateColumns: template }}>
          {footer}
        </div>
      )}
    </div>
  );
}
