// @vitest-environment jsdom
import { fireEvent, render } from "@testing-library/react";
import type { BoardConfig, Item } from "@kanmer/core";
import { describe, expect, it, vi } from "vitest";
import { Board, type BoardMove } from "./Board.js";
import { ClientContext, type ProjectClient } from "../lib/client.js";

const board = { areas: [], priorities: [] } as unknown as BoardConfig;
const item = {
  id: "GUI-108",
  type: "ticket",
  title: "Gate feedback",
  status: "backlog",
  area: "",
  labels: [],
  groups: [],
  order: 10,
} as unknown as Item;

describe("Board gate move anchor", () => {
  it("forwards the pointer anchor for an empty-column drop", () => {
    const onMove = vi.fn<(id: string, move: BoardMove) => void>();
    const client = { getGateStatus: vi.fn().mockResolvedValue({}) } as unknown as ProjectClient;
    const { container } = render(
      <ClientContext.Provider value={client}>
        <Board
          board={board}
          items={[item]}
          selectedId={null}
          onSelect={vi.fn()}
          onMove={onMove}
          onMoveRelative={vi.fn()}
          onQuickAdd={vi.fn()}
          onContext={vi.fn()}
          onFilterGroup={vi.fn()}
          blocked={new Set()}
        />
      </ClientContext.Provider>,
    );

    const target = container.querySelectorAll(".cell")[1];
    expect(target).toBeTruthy();
    const event = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperties(event, {
      dataTransfer: { value: { getData: () => "GUI-108" } },
      clientX: { value: 220 },
      clientY: { value: 140 },
    });
    fireEvent(target, event);

    expect(onMove).toHaveBeenCalledWith("GUI-108", {
      status: "preparing",
      position: "bottom",
      anchor: { x: 220, y: 140 },
    });
  });
});
