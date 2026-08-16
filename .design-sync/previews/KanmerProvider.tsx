import { useEffect, useState } from "react";
import { Board, KanmerProvider, blockedIds, createDemoClient, useClient } from "@kanmer/ui";
import type { BoardConfig, Item } from "@kanmer/ui";
import "./frame.module.css";

/**
 * A screen that loads its data through the context the provider supplies —
 * exactly how App wires the real IPC client. Board moves go through
 * `client.moveItem` and the board re-fetches, so the demo is interactive.
 */
function ConnectedBoard() {
  const client = useClient();
  const [board, setBoard] = useState<BoardConfig | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const refresh = () => void client.listItems().then(setItems);
  useEffect(() => {
    void client.getBoard().then(setBoard);
    refresh();
  }, [client]);
  if (!board) return <p className="empty">Loading…</p>;
  const four: BoardConfig = { ...board, statuses: board.statuses.filter((s) => ["backlog", "implementing", "review", "done"].includes(s.id)) };
  const visible = items.filter((i) => four.statuses.some((s) => s.id === i.status));
  return (
    <div style={{ padding: 8, minHeight: 320 }}>
      <Board
        board={four}
        items={visible}
        selectedId={selected}
        onSelect={setSelected}
        onMove={(id, to) => void client.moveItem(id, to).then(refresh)}
        onMoveRelative={() => {}}
        onQuickAdd={(input) => void client.createItem(input).then(refresh)}
        onContext={() => {}}
        blocked={blockedIds(items, "done")}
      />
    </div>
  );
}

/** Wrap the tree once; every Kanmer screen inside reads the same client. With no `client` prop it serves the seeded demo board. */
export const DemoBoard = () => (
  <KanmerProvider>
    <ConnectedBoard />
  </KanmerProvider>
);

const custom = createDemoClient({
  projectId: "C:/work/acme-api",
  items: [
    { id: "TICK-001", type: "ticket", title: "Wire the health endpoint", status: "implementing", area: "", priority: "high", assignee: "sam", labels: ["api"], links: [], archived: false, body: "", created: "", updated: "" },
    { id: "TICK-002", type: "ticket", title: "Add request logging", status: "backlog", area: "", priority: "medium", assignee: "", labels: [], links: [], archived: false, body: "", created: "", updated: "" },
  ],
  activity: [],
});

/** Pass your own `client` (any `ProjectClient` — here a second demo store) to back the screens with different data. */
export const CustomClient = () => (
  <KanmerProvider client={custom}>
    <ConnectedBoard />
  </KanmerProvider>
);
