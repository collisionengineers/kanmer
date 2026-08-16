import { useCallback, useMemo, useRef, useState } from "react";
import type { Item } from "@kanmer/core";
import { rangeBetween, windowedRows } from "../lib/windowedRows.js";

/** Fixed, and the reason the windowing maths is twenty lines. Matches the CSS. */
const ROW_HEIGHT = 32;

type SortKey = "id" | "title" | "area" | "profile" | "updated";

export interface BacklogTableProps {
  /** Already filtered by App's shared predicate — filters are not re-applied here. */
  items: Item[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /**
   * Move one ticket on. Rejects per ticket, so a mixed bulk selection can
   * partly succeed and the caller reports what did not.
   */
  onMove: (id: string) => Promise<void>;
  onArchive: (ids: string[]) => void;
  onAddToGroup: (ids: string[], groupId: string) => void;
  /** Group ids offered by the bulk action, derived from the tickets on the board. */
  groups: string[];
}

/**
 * The Backlog as a list, not a column (FRD-011, PRD-001 problem 6).
 *
 * A kanban column is for work in flight, where seeing every card matters. A
 * backlog is a queue you scan, sort and triage, and a column cannot do any of
 * those. This is the only route to a backlogged ticket once the board drops its
 * Backlog column, so it carries open, move, archive and grouping.
 *
 * **Sort is display-only** (D27). The board's `order` is a human's manual
 * arrangement; a list sort that persisted it would silently rewrite that.
 */
export function BacklogTable({
  items,
  selectedId,
  onSelect,
  onMove,
  onArchive,
  onAddToGroup,
  groups,
}: BacklogTableProps): JSX.Element {
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "id", desc: false });
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const [anchor, setAnchor] = useState<string | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const [moveReport, setMoveReport] = useState<string[] | null>(null);
  const [moving, setMoving] = useState(false);
  // Mutable, not a plain ref: the callback ref both stores the node and
  // measures it, so `current` has to be assignable.
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const rows = useMemo(() => {
    const val = (i: Item): string =>
      sort.key === "updated" ? i.updated : ((i[sort.key] as string | undefined) ?? "");
    return [...items].sort((a, b) => (sort.desc ? -1 : 1) * val(a).localeCompare(val(b)));
  }, [items, sort]);

  const ids = useMemo(() => rows.map((r) => r.id), [rows]);
  const win = windowedRows({
    count: rows.length,
    rowHeight: ROW_HEIGHT,
    viewportHeight,
    scrollTop,
  });

  const measure = useCallback((el: HTMLDivElement | null) => {
    bodyRef.current = el;
    if (el) setViewportHeight(el.clientHeight || 600);
  }, []);

  const toggle = (id: string, shift: boolean): void => {
    setChecked((prev) => {
      const next = new Set(prev);
      const span = shift && anchor ? rangeBetween(ids, anchor, id) : [id];
      const turningOn = !prev.has(id);
      for (const s of span) {
        if (turningOn) next.add(s);
        else next.delete(s);
      }
      return next;
    });
    if (!shift) setAnchor(id);
  };

  const allVisible = rows.length > 0 && rows.every((r) => checked.has(r.id));
  const selection = rows.filter((r) => checked.has(r.id));

  /**
   * Bulk move, one ticket at a time so a mixed selection partly succeeds.
   * Silently moving 7 of 10 is the worst outcome; refusing all 10 because one
   * lacks a governing doc is the second worst.
   */
  const bulkMove = async (): Promise<void> => {
    setMoving(true);
    const failures: string[] = [];
    for (const it of selection) {
      try {
        await onMove(it.id);
      } catch (err) {
        failures.push(`${it.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    setMoving(false);
    setChecked(new Set());
    setMoveReport(
      failures.length
        ? [`Moved ${selection.length - failures.length} of ${selection.length}.`, ...failures]
        : null,
    );
  };

  const onKeyDown = (e: React.KeyboardEvent): void => {
    const at = selectedId ? ids.indexOf(selectedId) : -1;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(rows.length - 1, Math.max(0, at + (e.key === "ArrowDown" ? 1 : -1)));
      const id = ids[next];
      if (id) {
        onSelect(id);
        // Keep the focused row in view — the windowing only renders what is.
        bodyRef.current?.scrollTo({ top: Math.max(0, next * ROW_HEIGHT - viewportHeight / 2) });
      }
    } else if (e.key === " " && selectedId) {
      e.preventDefault();
      toggle(selectedId, false);
    }
  };

  const header = (key: SortKey, label: string): JSX.Element => (
    <th
      aria-sort={sort.key === key ? (sort.desc ? "descending" : "ascending") : "none"}
      onClick={() => setSort((s) => ({ key, desc: s.key === key ? !s.desc : false }))}
    >
      {label}
      {sort.key === key && <span aria-hidden="true">{sort.desc ? " ▾" : " ▴"}</span>}
    </th>
  );

  return (
    <div className="backlog" onKeyDown={onKeyDown}>
      <div className="backlog-actions">
        <label className="check">
          <input
            type="checkbox"
            checked={allVisible}
            aria-label="Select all"
            onChange={() => setChecked(allVisible ? new Set() : new Set(ids))}
          />
          {selection.length > 0 ? `${selection.length} selected` : `${rows.length} in Backlog`}
        </label>
        {selection.length > 0 && (
          <>
            <span className="spacer" />
            <button className="ghost sm" disabled={moving} onClick={() => void bulkMove()}>
              {moving ? "Moving…" : "Move to Preparing"}
            </button>
            {groups.length > 0 && (
              <select
                value=""
                aria-label="Add selected to group"
                onChange={(e) => {
                  if (!e.target.value) return;
                  onAddToGroup([...checked], e.target.value);
                  setChecked(new Set());
                }}
              >
                <option value="">Add to group…</option>
                {groups.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            )}
            <button
              className="danger sm"
              onClick={() => {
                onArchive([...checked]);
                setChecked(new Set());
              }}
            >
              Archive {selection.length}
            </button>
          </>
        )}
      </div>

      {moveReport && (
        <div className="banner warn">
          <div>
            {moveReport.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
            <button className="ghost xs" onClick={() => setMoveReport(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="backlog-scroll" ref={measure} onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
        <table className="backlog-table">
          <thead>
            <tr>
              <th aria-label="Selected" />
              {header("id", "ID")}
              {header("title", "Title")}
              {header("area", "Area")}
              {header("profile", "Profile")}
              {header("updated", "Updated")}
            </tr>
          </thead>
          <tbody>
            {win.padTop > 0 && (
              <tr style={{ height: win.padTop }} aria-hidden="true">
                <td colSpan={6} />
              </tr>
            )}
            {rows.slice(win.start, win.end).map((it) => (
              <tr
                key={it.id}
                role="row"
                aria-selected={it.id === selectedId}
                className={it.id === selectedId ? "selected" : ""}
                tabIndex={-1}
                onClick={() => onSelect(it.id)}
              >
                <td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={checked.has(it.id)}
                    aria-label={`Select ${it.id}`}
                    onChange={(e) => toggle(it.id, (e.nativeEvent as MouseEvent).shiftKey)}
                  />
                </td>
                <td><code>{it.id}</code></td>
                <td className="backlog-title">{it.title}</td>
                <td className="muted">{it.area}</td>
                <td className="muted">{it.profile ?? "—"}</td>
                <td className="muted">{it.updated.slice(0, 10)}</td>
              </tr>
            ))}
            {win.padBottom > 0 && (
              <tr style={{ height: win.padBottom }} aria-hidden="true">
                <td colSpan={6} />
              </tr>
            )}
          </tbody>
        </table>
        {rows.length === 0 && <p className="hint">Nothing in Backlog matches the current filters.</p>}
      </div>
    </div>
  );
}
