import { memo, useCallback, useRef, useState } from "react";
import type { BoardColumn, BoardConfig, CreateItemInput, Item, MovePosition } from "@kanmer/core";
import { columnColor, columnCards, positionForDrop } from "../lib/board.js";
import { QuickAdd } from "./QuickAdd.js";

interface BoardProps {
  board: BoardConfig;
  items: Item[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, to: { status: string; position?: MovePosition }) => void;
  /** Keyboard drag equivalent: move one stage left (-1) or right (+1). */
  onMoveRelative: (id: string, dir: -1 | 1) => void;
  onQuickAdd: (input: CreateItemInput) => void;
  /** Native right-click menu for a card. */
  onContext: (item: Item) => void;
  /** Ids with a live blocker — computed once in App, read per card as a boolean. */
  blocked: Set<string>;
  /** Ids with a background agent dispatch in flight. */
  dispatching?: Set<string>;
}

/** Merge configured columns with any extra values found on items (fallback columns). */
function mergeColumns(defined: BoardColumn[], present: string[]): BoardColumn[] {
  const ids = new Set(defined.map((c) => c.id));
  const extra = [...new Set(present)].filter((id) => id && !ids.has(id));
  return [...defined, ...extra.map((id) => ({ id, name: id }))];
}

interface AreaGroup {
  id: string; // "" for no area
  name: string;
  color?: string;
  cards: Item[];
}

/** Which half of a card the pointer is over. */
function edgeOf(el: HTMLElement, clientY: number): "before" | "after" {
  const r = el.getBoundingClientRect();
  return clientY < r.top + r.height / 2 ? "before" : "after";
}

/**
 * The board is a single row of workflow-stage columns (statuses). Within each
 * column, cards cluster by area under a colour-coded sub-header — areas group
 * related work without adding a second workflow dimension.
 */
export function Board(props: BoardProps): JSX.Element {
  const {
    board,
    items,
    selectedId,
    onSelect,
    onMove,
    onMoveRelative,
    onQuickAdd,
    onContext,
    blocked,
    dispatching,
  } = props;
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<{ id: string; edge: "before" | "after" } | null>(null);

  // The drop handlers must see the current items without being rebuilt when
  // items change: a fresh callback identity would re-render every memoized
  // Card on every board change, which is exactly what Phase 7.5 removed.
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const onCardDragOver = useCallback((statusId: string, id: string, edge: "before" | "after") => {
    setDropHint((h) => (h && h.id === id && h.edge === edge ? h : { id, edge }));
    setDropTarget(statusId); // the card swallowed the cell's dragover
  }, []);

  const onCardDragLeave = useCallback((id: string) => {
    setDropHint((h) => (h?.id === id ? null : h));
  }, []);

  const onCardDrop = useCallback(
    (statusId: string, targetId: string, edge: "before" | "after", dragged: string) => {
      setDropHint(null);
      setDropTarget(null);
      if (!dragged) return;
      // COLUMN-scoped, never the rendered area group: `order` is a
      // column-wide key while the board renders grouped by area, so
      // neighbours must come from the whole column.
      const column = columnCards(itemsRef.current, statusId);
      onMove(dragged, {
        status: statusId,
        position: positionForDrop(column, targetId, edge, dragged),
      });
    },
    [onMove],
  );

  const statuses = mergeColumns(board.statuses, items.map((i) => i.status));
  const usingAreas = board.areas.length > 0 || items.some((i) => i.area);

  function groupByArea(cards: Item[]): AreaGroup[] {
    if (!usingAreas) return cards.length ? [{ id: "", name: "", cards }] : [];
    const order = [...board.areas.map((a) => a.id)];
    for (const c of cards) if (c.area && !order.includes(c.area)) order.push(c.area);
    order.push(""); // No area bucket, last
    return order
      .map((areaId) => ({
        id: areaId,
        name: areaId ? board.areas.find((a) => a.id === areaId)?.name ?? areaId : "No area",
        color: columnColor(board.areas, areaId),
        cards: cards.filter((c) => (c.area || "") === areaId),
      }))
      .filter((g) => g.cards.length > 0);
  }

  return (
    <div
      className="board"
      style={{ gridTemplateColumns: `repeat(${statuses.length}, minmax(230px, 1fr))` }}
    >
      {statuses.map((s) => (
        <div key={s.id} className="col-head">
          {s.name}
          <span className="col-count">
            {items.filter((i) => i.status === s.id).length || ""}
          </span>
        </div>
      ))}

      {statuses.map((status) => {
        // One sorted column feeds both the rendering and the drop maths, so
        // the insertion line and the computed neighbour can never disagree.
        const groups = groupByArea(columnCards(items, status.id));
        return (
          <div
            key={status.id}
            className={dropTarget === status.id ? "cell drop" : "cell"}
            onDragOver={(e) => {
              e.preventDefault();
              setDropTarget(status.id);
              setDropHint(null);
            }}
            onDragLeave={() => setDropTarget((t) => (t === status.id ? null : t))}
            onDrop={(e) => {
              // Empty column space: the whole-cell fallback, now carrying a
              // position so a drag never leaves the card's old `order` behind.
              e.preventDefault();
              setDropTarget(null);
              setDropHint(null);
              const id = e.dataTransfer.getData("text/plain");
              if (id) onMove(id, { status: status.id, position: "bottom" });
            }}
          >
            {groups.map((group) => (
              <div key={group.id || "__none__"} className="area-group">
                {usingAreas && (
                  <div className="area-head">
                    <span
                      className="area-dot"
                      style={group.color ? { background: group.color } : undefined}
                    />
                    {group.name}
                    <span className="area-add">
                      <QuickAdd
                        label=""
                        placeholder={`New in ${group.name}…`}
                        onAdd={(title) =>
                          onQuickAdd({
                            type: "ticket",
                            title,
                            status: status.id,
                            area: group.id,
                          })
                        }
                      />
                    </span>
                  </div>
                )}
                {group.cards.map((item) => (
                  <Card
                    key={item.id}
                    item={item}
                    board={board}
                    selected={item.id === selectedId}
                    blocked={blocked.has(item.id)}
                    dispatching={dispatching?.has(item.id) ?? false}
                    dropEdge={dropHint?.id === item.id ? dropHint.edge : null}
                    statusId={status.id}
                    onSelect={onSelect}
                    onMoveRelative={onMoveRelative}
                    onContext={onContext}
                    onCardDragOver={onCardDragOver}
                    onCardDragLeave={onCardDragLeave}
                    onCardDrop={onCardDrop}
                  />
                ))}
              </div>
            ))}
            <QuickAdd
              label="card"
              onAdd={(title) => onQuickAdd({ type: "ticket", title, status: status.id })}
            />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Memoized: with stable callbacks from App and Board, a drop-target hover or a
 * single item patch re-renders one card, not every card on the board. Every
 * prop here is a primitive or a stable function on purpose — passing the
 * blocked `Set` or the drop-hint object straight in would re-render the whole
 * board on every dragover.
 */
const Card = memo(function CardInner({
  item,
  board,
  selected,
  blocked,
  dispatching,
  dropEdge,
  statusId,
  onSelect,
  onMoveRelative,
  onContext,
  onCardDragOver,
  onCardDragLeave,
  onCardDrop,
}: {
  item: Item;
  board: BoardConfig;
  selected: boolean;
  blocked: boolean;
  dispatching: boolean;
  dropEdge: "before" | "after" | null;
  statusId: string;
  onSelect: (id: string) => void;
  onMoveRelative: (id: string, dir: -1 | 1) => void;
  onContext: (item: Item) => void;
  onCardDragOver: (statusId: string, id: string, edge: "before" | "after") => void;
  onCardDragLeave: (id: string) => void;
  onCardDrop: (
    statusId: string,
    targetId: string,
    edge: "before" | "after",
    dragged: string,
  ) => void;
}): JSX.Element {
  const areaColor = columnColor(board.areas, item.area);
  const priColor = columnColor(board.priorities, item.priority);
  const priName = board.priorities.find((p) => p.id === item.priority)?.name ?? item.priority;
  const areaName = item.area
    ? board.areas.find((a) => a.id === item.area)?.name ?? item.area
    : "";
  const stageName = board.statuses.find((s) => s.id === item.status)?.name ?? item.status;
  const cls = ["card", selected ? "selected" : "", dropEdge ? `drop-${dropEdge}` : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <article
      className={cls}
      style={areaColor ? { borderLeft: `3px solid ${areaColor}` } : undefined}
      draggable
      tabIndex={0}
      role="button"
      aria-label={`${item.id} ${item.title || "Untitled"}, stage ${stageName}${
        areaName ? `, area ${areaName}` : ""
      }${blocked ? ", blocked" : ""}${
        item.deployment && item.deployment !== "n/a" ? `, deployment ${item.deployment}` : ""
      }`}
      onDragStart={(e) => e.dataTransfer.setData("text/plain", item.id)}
      onDragOver={(e) => {
        e.preventDefault();
        // Load-bearing: without it the cell's handler also fires and issues a
        // second, position-less move.
        e.stopPropagation();
        onCardDragOver(statusId, item.id, edgeOf(e.currentTarget, e.clientY));
      }}
      onDragLeave={() => onCardDragLeave(item.id)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation(); // same reason as onDragOver
        onCardDrop(
          statusId,
          item.id,
          edgeOf(e.currentTarget, e.clientY),
          e.dataTransfer.getData("text/plain"),
        );
      }}
      onClick={() => onSelect(item.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContext(item);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(item.id);
        } else if ((e.ctrlKey || e.metaKey) && e.key === "ArrowLeft") {
          e.preventDefault();
          onMoveRelative(item.id, -1);
        } else if ((e.ctrlKey || e.metaKey) && e.key === "ArrowRight") {
          e.preventDefault();
          onMoveRelative(item.id, 1);
        }
      }}
    >
      <div className="card-top">
        <span className="card-id">{item.id}</span>
        {item.taken_at && (
          <span className="chip taken" title={`Taken${item.branch ? ` on ${item.branch}` : ""}`}>
            ⛏ {item.branch ?? "taken"}
          </span>
        )}
        {blocked && (
          <span className="chip blocked" title="Blocked by an unfinished ticket">
            ⛔ blocked
          </span>
        )}
        {dispatching && (
          <span className="chip dispatch" title="A background agent is working this ticket">
            ⏳ agent
          </span>
        )}
        {item.deployment && item.deployment !== "n/a" && (
          <span
            className={item.deployment === "not-deployed" ? "chip deploy off" : "chip deploy"}
            title={`Deployment: ${item.deployment}`}
          >
            🚀 {item.deployment}
          </span>
        )}
        {(item.prs?.length ?? 0) > 0 && (
          <span className="chip pr" title={`${item.prs!.length} PR(s)`}>
            ⇅ {item.prs!.length}
          </span>
        )}
        {item.priority && (
          <span className="pri" style={priColor ? { color: priColor } : undefined}>
            {priName}
          </span>
        )}
      </div>
      <div className="card-title">{item.title || "Untitled"}</div>
      {item.labels.length > 0 && (
        <div className="card-labels">
          {item.labels.map((l) => (
            <span key={l} className="chip">
              {l}
            </span>
          ))}
        </div>
      )}
      {item.assignee && <div className="card-assignee">@{item.assignee}</div>}
    </article>
  );
});
