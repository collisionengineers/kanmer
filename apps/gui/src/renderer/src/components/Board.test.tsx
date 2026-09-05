// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { BoardConfig, Item } from "@kanmer/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Board, type BoardMove } from "./Board.js";
import { ClientContext, type ProjectClient } from "../lib/client.js";
import { stagesForScope, type Scope } from "../lib/scopes.js";

// Vitest globals are off in this workspace, so RTL's auto-cleanup never runs.
afterEach(cleanup);

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

function ticket(id: string, status: string, extra: Partial<Item> = {}): Item {
  return {
    id,
    type: "ticket",
    title: `Title of ${id}`,
    status,
    area: "",
    labels: [],
    groups: [],
    order: 10,
    ...extra,
  } as unknown as Item;
}

function column(status: string, n: number, extra: Partial<Item> = {}): Item[] {
  return Array.from({ length: n }, (_, i) =>
    ticket(`${status.toUpperCase()}-${i + 1}`, status, { order: (i + 1) * 10, ...extra }),
  );
}

function renderBoard(overrides: Partial<Parameters<typeof Board>[0]> = {}) {
  const client = { getGateStatus: vi.fn().mockResolvedValue({}) } as unknown as ProjectClient;
  const props = {
    board,
    items: [item],
    selectedId: null,
    onSelect: vi.fn(),
    onMove: vi.fn<(id: string, move: BoardMove) => void>(),
    onMoveRelative: vi.fn(),
    onQuickAdd: vi.fn(),
    onContext: vi.fn(),
    onFilterGroup: vi.fn(),
    blocked: new Set<string>(),
    scope: "all" as Scope,
    pages: {} as Record<string, number>,
    onPage: vi.fn<(columnId: string, page: number) => void>(),
    onAnnounce: vi.fn<(message: string) => void>(),
    ...overrides,
  };
  const view = render(
    <ClientContext.Provider value={client}>
      <Board {...props} />
    </ClientContext.Provider>,
  );
  return { props, ...view };
}

function dropOn(target: Element, id: string, at = { x: 220, y: 140 }): void {
  const event = new Event("drop", { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    dataTransfer: { value: { getData: () => id } },
    clientX: { value: at.x },
    clientY: { value: at.y },
  });
  fireEvent(target, event);
}

describe("Board gate move anchor", () => {
  it("forwards the pointer anchor for an empty-column drop", () => {
    // The board is on "all", so column 2 is Preparing, as it was before scopes.
    const { props, container } = renderBoard();
    const target = container.querySelectorAll(".cell")[1];
    expect(target).toBeTruthy();

    dropOn(target, "GUI-108");

    expect(props.onMove).toHaveBeenCalledWith("GUI-108", {
      status: "preparing",
      position: "bottom",
      anchor: { x: 220, y: 140 },
    });
  });
});

describe("Board columns follow the scope", () => {
  it.each([
    ["active", ["Preparing", "Implementing", "Review", "Verifying"]],
    ["all", ["Backlog", "Preparing", "Implementing", "Review", "Verifying", "Done"]],
    ["backlog", ["Backlog"]],
    ["done", ["Done"]],
  ] as const)("renders %s as %j", (scope, names) => {
    renderBoard({ scope, items: column("backlog", 2) });
    expect(
      screen.getAllByRole("region").map((r) => r.getAttribute("aria-label")),
    ).toEqual(names.map((n) => `${n} column`));
  });

  it("does not resurrect a scoped-out stage as an unknown-status fallback column", () => {
    // mergeColumns' `known` argument is what stops this (GUI-069): a stage the
    // scope deliberately omits must stay omitted, not reappear last and
    // labelled with its raw id.
    renderBoard({ scope: "active", items: [...column("backlog", 3), ...column("done", 3)] });
    const labels = screen.getAllByRole("region").map((r) => r.getAttribute("aria-label"));
    expect(labels).toHaveLength(stagesForScope("active").length);
    expect(labels.join(" ")).not.toContain("Backlog");
    expect(labels.join(" ")).not.toContain("backlog");
    expect(labels.join(" ")).not.toContain("Done");
    expect(labels.join(" ")).not.toContain("done");
  });

  it("still gives a genuinely unknown status its fallback column", () => {
    renderBoard({ scope: "all", items: [ticket("X-1", "triage")] });
    const labels = screen.getAllByRole("region").map((r) => r.getAttribute("aria-label"));
    expect(labels).toContain("triage column");
  });
});

describe("Board column pager", () => {
  it("shows four cards and the range out of the filtered total", () => {
    renderBoard({ scope: "done", items: column("done", 28) });
    const col = screen.getByRole("region", { name: "Done column" });
    expect(within(col).getAllByRole("button", { name: /^DONE-/ })).toHaveLength(4);
    expect(within(col).getByText("1–4 of 28")).toBeTruthy();
  });

  it("does not render a pager for a column that already fits", () => {
    renderBoard({ scope: "done", items: column("done", 4) });
    const col = screen.getByRole("region", { name: "Done column" });
    expect(within(col).queryByText(/of 4$/)).toBeNull();
    expect(within(col).queryByRole("button", { name: "Next Done tickets" })).toBeNull();
  });

  it("asks the caller for the next and previous page", () => {
    const { props } = renderBoard({ scope: "done", items: column("done", 28), pages: { done: 3 } });
    const col = screen.getByRole("region", { name: "Done column" });
    expect(within(col).getByText("9–12 of 28")).toBeTruthy();

    fireEvent.click(within(col).getByRole("button", { name: "Next Done tickets" }));
    expect(props.onPage).toHaveBeenCalledWith("done", 4);
    fireEvent.click(within(col).getByRole("button", { name: "Previous Done tickets" }));
    expect(props.onPage).toHaveBeenCalledWith("done", 2);
  });

  it("disables the ends rather than hiding them, so the bound is visible", () => {
    renderBoard({ scope: "done", items: column("done", 6) });
    const col = screen.getByRole("region", { name: "Done column" });
    expect(within(col).getByRole("button", { name: "Previous Done tickets" }).hasAttribute("disabled")).toBe(true);
    expect(within(col).getByRole("button", { name: "Next Done tickets" }).hasAttribute("disabled")).toBe(false);
  });

  it("shows the last populated page rather than a false empty state", () => {
    // A remembered page past the end of a column that a filter just shrank.
    renderBoard({ scope: "done", items: column("done", 6), pages: { done: 99 } });
    const col = screen.getByRole("region", { name: "Done column" });
    expect(within(col).getAllByRole("button", { name: /^DONE-/ })).toHaveLength(2);
    expect(within(col).getByText("5–6 of 6")).toBeTruthy();
  });

  it("counts what is in the column, not what is on the page", () => {
    renderBoard({ scope: "done", items: column("done", 28) });
    const head = screen.getByRole("region", { name: "Done column" }).querySelector(".col-count");
    expect(head?.textContent).toBe("28");
  });

  it("reaches every card in a column across its pages", () => {
    const items = column("done", 9);
    for (const [page, expected] of [
      [1, ["DONE-1", "DONE-2", "DONE-3", "DONE-4"]],
      [2, ["DONE-5", "DONE-6", "DONE-7", "DONE-8"]],
      [3, ["DONE-9"]],
    ] as const) {
      cleanup();
      renderBoard({ scope: "done", items, pages: { done: page } });
      const col = screen.getByRole("region", { name: "Done column" });
      expect(
        within(col).getAllByRole("button", { name: /^DONE-/ }).map((b) =>
          b.getAttribute("aria-label")?.split(" ")[0],
        ),
      ).toEqual([...expected]);
    }
  });
});

describe("Board manual ordering uses the whole column, never the page", () => {
  it("resolves a drop at the top of a later page against the card above it in the full column", () => {
    const { props } = renderBoard({ scope: "done", items: column("done", 12), pages: { done: 2 } });
    const col = screen.getByRole("region", { name: "Done column" });
    const card = within(col).getAllByRole("button", { name: /^DONE-/ })[0];
    expect(card.getAttribute("aria-label")).toContain("DONE-5");

    // Drop on the top half of the first visible card: "before DONE-5".
    card.getBoundingClientRect = () =>
      ({ top: 100, height: 40, left: 0, right: 0, bottom: 140, width: 0, x: 0, y: 100, toJSON: () => ({}) }) as DOMRect;
    dropOn(card, "DONE-12", { x: 10, y: 105 });

    // Not "top" — the column's real predecessor is DONE-4, on the page before.
    expect(props.onMove).toHaveBeenCalledWith("DONE-12", {
      status: "done",
      position: { after: "DONE-4" },
      anchor: { x: 10, y: 105 },
    });
  });

  it("refuses a whole-cell drop while a paged column's last page is off-screen", () => {
    // "Bottom of the column" is a position the user cannot see from page 1, so
    // the card would vanish with no indication of where it went.
    const { props, container } = renderBoard({
      scope: "done",
      items: column("done", 28),
      pages: { done: 1 },
    });
    dropOn(container.querySelector(".cell")!, "DONE-3");

    expect(props.onMove).not.toHaveBeenCalled();
    const reason = screen.getByRole("status").textContent ?? "";
    expect(reason).toContain("DONE-3 was not moved");
    expect(reason).toContain("page 7");
    expect(reason).toContain("right-click menu");
    expect(props.onAnnounce).toHaveBeenCalledWith(expect.stringContaining("was not moved"));
  });

  it("allows the same drop once the last page is showing", () => {
    const { props, container } = renderBoard({
      scope: "done",
      items: column("done", 28),
      pages: { done: 7 },
    });
    dropOn(container.querySelector(".cell")!, "DONE-3");

    expect(props.onMove).toHaveBeenCalledWith("DONE-3", {
      status: "done",
      position: "bottom",
      anchor: { x: 220, y: 140 },
    });
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("Board compact cards", () => {
  it("shows the title, the id and one group chip with a +N for the rest", () => {
    renderBoard({
      scope: "backlog",
      items: [ticket("B-1", "backlog", { groups: ["HZN-009", "EPIC-004", "BATCH-2"] })],
    });
    const card = screen.getByRole("button", { name: /^B-1/ });
    expect(within(card).getByText("Title of B-1")).toBeTruthy();
    expect(within(card).getByText("B-1")).toBeTruthy();
    expect(within(card).getByRole("button", { name: "HZN-009" })).toBeTruthy();
    expect(within(card).getByText("+2")).toBeTruthy();
    // The memberships themselves are untouched — the card shows a subset and
    // says so; the Editor holds the full list.
    expect(within(card).queryByText("EPIC-004")).toBeNull();
  });

  it("shows no indicator for a single membership, and no chip for none", () => {
    renderBoard({
      scope: "backlog",
      items: [
        ticket("B-1", "backlog", { groups: ["HZN-009"] }),
        ticket("B-2", "backlog", { groups: [] }),
      ],
    });
    const one = screen.getByRole("button", { name: /^B-1/ });
    expect(within(one).getByRole("button", { name: "HZN-009" })).toBeTruthy();
    expect(within(one).queryByText(/^\+/)).toBeNull();
    const none = screen.getByRole("button", { name: /^B-2/ });
    expect(within(none).queryByText(/^\+/)).toBeNull();
  });

  it("filters to the group when its chip is clicked, without selecting the card", () => {
    const { props } = renderBoard({
      scope: "backlog",
      items: [ticket("B-1", "backlog", { groups: ["HZN-009", "EPIC-004"] })],
    });
    fireEvent.click(screen.getByRole("button", { name: "HZN-009" }));
    expect(props.onFilterGroup).toHaveBeenCalledWith("HZN-009");
    expect(props.onSelect).not.toHaveBeenCalled();
  });

  it("keeps labels — compacting is a density change, not a data cull", () => {
    renderBoard({ scope: "backlog", items: [ticket("B-1", "backlog", { labels: ["focus-board"] })] });
    expect(within(screen.getByRole("button", { name: /^B-1/ })).getByText("focus-board")).toBeTruthy();
  });

  it("still carries every exception badge and the keyboard stage move", () => {
    const { props } = renderBoard({
      scope: "backlog",
      items: [ticket("B-1", "backlog", { prs: ["1"], deployment: "staging", taken_at: "now", branch: "b" })],
      blocked: new Set(["B-1"]),
      dispatching: new Set(["B-1"]),
    });
    const card = screen.getByRole("button", { name: /^B-1/ });
    expect(card.getAttribute("aria-label")).toContain("blocked");
    expect(within(card).getByText(/blocked/)).toBeTruthy();
    expect(within(card).getByText(/agent/)).toBeTruthy();
    expect(within(card).getByText(/staging/)).toBeTruthy();

    fireEvent.keyDown(card, { key: "ArrowRight", ctrlKey: true });
    expect(props.onMoveRelative).toHaveBeenCalledWith("B-1", 1);
  });
});
