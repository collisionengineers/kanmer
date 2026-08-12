import type { BoardConfig, Item, ItemType } from "@kanmer/core";
import { columnColor, columnName } from "../lib/board.js";
import { QuickAdd } from "./QuickAdd.js";

interface ItemListProps {
  view: ItemType;
  items: Item[];
  board: BoardConfig;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onQuickAdd: (title: string) => void;
}

/** Flat list view for plans and research items. */
export function ItemList({
  view,
  items,
  board,
  selectedId,
  onSelect,
  onQuickAdd,
}: ItemListProps): JSX.Element {
  return (
    <div className="list">
      <div className="list-quickadd">
        <QuickAdd label={view} placeholder={`New ${view} title…`} onAdd={onQuickAdd} />
      </div>

      {items.length === 0 && <div className="empty">Nothing here yet.</div>}

      {items.map((item) => {
        const areaColor = columnColor(board.areas, item.area);
        return (
          <button
            key={item.id}
            className={item.id === selectedId ? "list-row selected" : "list-row"}
            style={areaColor ? { borderLeft: `3px solid ${areaColor}` } : undefined}
            onClick={() => onSelect(item.id)}
          >
            <span className="list-id">{item.id}</span>
            <span className="list-title">
              {item.title || "Untitled"}
              {item.archived && <span className="chip subtle archived-tag">archived</span>}
            </span>
            {item.area && <span className="chip subtle">{columnName(board.areas, item.area)}</span>}
            {item.status && (
              <span className="chip subtle">{columnName(board.statuses, item.status)}</span>
            )}
            <span className="list-updated">{formatDate(item.updated)}</span>
          </button>
        );
      })}
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}
