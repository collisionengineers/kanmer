import { useState } from "react";
import type { BoardColumn, BoardConfig, CreateItemInput, Item } from "@kanmer/core";
import { columnColor } from "../lib/board.js";
import { QuickAdd } from "./QuickAdd.js";

interface BoardProps {
  board: BoardConfig;
  items: Item[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, to: { status: string }) => void;
  onQuickAdd: (input: CreateItemInput) => void;
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

/**
 * The board is a single row of workflow-stage columns (statuses). Within each
 * column, cards cluster by area under a colour-coded sub-header — areas group
 * related work without adding a second workflow dimension.
 */
export function Board(props: BoardProps): JSX.Element {
  const { board, items, selectedId, onSelect, onMove, onQuickAdd } = props;
  const [dropTarget, setDropTarget] = useState<string | null>(null);

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
        const groups = groupByArea(items.filter((i) => i.status === status.id));
        return (
          <div
            key={status.id}
            className={dropTarget === status.id ? "cell drop" : "cell"}
            onDragOver={(e) => {
              e.preventDefault();
              setDropTarget(status.id);
            }}
            onDragLeave={() => setDropTarget((t) => (t === status.id ? null : t))}
            onDrop={(e) => {
              e.preventDefault();
              setDropTarget(null);
              const id = e.dataTransfer.getData("text/plain");
              if (id) onMove(id, { status: status.id });
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
                  </div>
                )}
                {group.cards.map((item) => (
                  <Card
                    key={item.id}
                    item={item}
                    board={board}
                    selected={item.id === selectedId}
                    onSelect={onSelect}
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

function Card({
  item,
  board,
  selected,
  onSelect,
}: {
  item: Item;
  board: BoardConfig;
  selected: boolean;
  onSelect: (id: string) => void;
}): JSX.Element {
  const areaColor = columnColor(board.areas, item.area);
  const priColor = columnColor(board.priorities, item.priority);
  const priName = board.priorities.find((p) => p.id === item.priority)?.name ?? item.priority;
  return (
    <article
      className={selected ? "card selected" : "card"}
      style={areaColor ? { borderLeft: `3px solid ${areaColor}` } : undefined}
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", item.id)}
      onClick={() => onSelect(item.id)}
    >
      <div className="card-top">
        <span className="card-id">{item.id}</span>
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
}
