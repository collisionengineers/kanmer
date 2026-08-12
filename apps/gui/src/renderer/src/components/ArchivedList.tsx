import { useState } from "react";
import type { BoardConfig, Item } from "@kanmer/core";
import { columnName } from "../lib/board.js";

interface ArchivedListProps {
  items: Item[];
  board: BoardConfig;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRestore: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

/**
 * The archived-items view: restore, or — behind a two-click confirm —
 * permanently delete. This is the only place the GUI deletes; everywhere
 * else "delete" means archive.
 */
export function ArchivedList({
  items,
  board,
  selectedId,
  onSelect,
  onRestore,
  onDelete,
}: ArchivedListProps): JSX.Element {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <div className="list">
      {items.map((item) => (
        <div
          key={item.id}
          className={item.id === selectedId ? "list-row selected" : "list-row"}
        >
          <button className="list-open" onClick={() => onSelect(item.id)}>
            <span className="list-id">{item.id}</span>
            <span className="list-title">{item.title || "Untitled"}</span>
            <span className="chip subtle">{item.type}</span>
            {item.status && (
              <span className="chip subtle">{columnName(board.statuses, item.status)}</span>
            )}
          </button>
          <div className="list-actions">
            <button className="ghost xs" onClick={() => void onRestore(item.id)}>
              Restore
            </button>
            {confirmId === item.id ? (
              <button
                className="danger xs"
                onClick={() => {
                  setConfirmId(null);
                  void onDelete(item.id);
                }}
              >
                Confirm delete
              </button>
            ) : (
              <button
                className="ghost xs"
                title="Permanently delete — removes the whole ticket folder"
                onClick={() => setConfirmId(item.id)}
              >
                Delete permanently
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
