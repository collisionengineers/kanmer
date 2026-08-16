import { useState } from "react";
import { Board, blockedIds, demoBoard, demoItems } from "@kanmer/ui";
import type { BoardConfig, Item } from "@kanmer/ui";
import "./frame.module.css";

const active = demoItems.filter((i) => !i.archived);
const noop = () => {};

/** Board with `blocked` derived the way App does it (a live blocker = an unfinished item that lists this id in `blocks`). */
function useBoardState(seed: Item[]) {
  const [items, setItems] = useState(seed);
  const [selected, setSelected] = useState<string | null>("API-009");
  const move = (id: string, to: { status: string }) =>
    setItems((cur) => cur.map((i) => (i.id === id ? { ...i, status: to.status } : i)));
  return { items, selected, setSelected, move };
}

/** The whole 7-stage default board: area sub-headers, a taken card, a blocked card, deploy + PR chips, an agent working a ticket. */
export const FullBoard = () => {
  const s = useBoardState(active);
  return (
    <div style={{ overflowX: "auto", padding: 8, minHeight: 420 }}>
      <Board
        board={demoBoard}
        items={s.items}
        selectedId={s.selected}
        onSelect={s.setSelected}
        onMove={s.move}
        onMoveRelative={noop}
        onQuickAdd={noop}
        onContext={noop}
        blocked={blockedIds(s.items, "done")}
        dispatching={new Set(["GUI-027"])}
      />
    </div>
  );
};

const fourStages: BoardConfig = {
  ...demoBoard,
  statuses: demoBoard.statuses.filter((st) => ["backlog", "implementing", "review", "done"].includes(st.id)),
};
const fourStageItems = active.filter((i) => fourStages.statuses.some((st) => st.id === i.status));

/** `density="compact"` — tighter cards, more per column. A four-stage board so every column is visible at once. */
export const Compact = () => {
  const s = useBoardState(fourStageItems);
  return (
    <div style={{ padding: 8, minHeight: 320 }}>
      <Board
        board={fourStages}
        items={s.items}
        selectedId={s.selected}
        onSelect={s.setSelected}
        onMove={s.move}
        onMoveRelative={noop}
        onQuickAdd={noop}
        onContext={noop}
        blocked={blockedIds(s.items, "done")}
        density="compact"
      />
    </div>
  );
};

const noAreas: BoardConfig = { ...fourStages, areas: [] };
const flatItems = fourStageItems.map((i) => ({ ...i, area: "" }));

/** A board with no areas configured: cards stack flat under each stage — no sub-headers, no per-area quick-add. */
export const NoAreas = () => {
  const s = useBoardState(flatItems);
  return (
    <div style={{ padding: 8, minHeight: 320 }}>
      <Board
        board={noAreas}
        items={s.items}
        selectedId={null}
        onSelect={s.setSelected}
        onMove={s.move}
        onMoveRelative={noop}
        onQuickAdd={noop}
        onContext={noop}
        blocked={new Set()}
      />
    </div>
  );
};
