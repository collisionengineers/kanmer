import { describe, expect, it } from "vitest";
import type { Item } from "@kanmer/core";
import { UI_STAGES } from "../../../shared/stages.js";
import { blockedIds, columnCards, mergeColumns, optimisticOrder, positionForDrop } from "./board.js";

function item(partial: Partial<Item> & { id: string }): Item {
  return {
    type: "ticket",
    title: partial.id,
    status: "todo",
    area: "",
    priority: "medium",
    assignee: "",
    labels: [],
    links: [],
    archived: false,
    created: "2026-01-01T00:00:00.000Z",
    updated: "2026-01-01T00:00:00.000Z",
    body: "",
    ...partial,
  } as Item;
}

describe("blockedIds", () => {
  it("ignores archived blockers and blockers in the last stage", () => {
    const items = [
      item({ id: "A", blocks: ["X"] }),
      item({ id: "B", blocks: ["Y"], archived: true }),
      item({ id: "C", blocks: ["Z"], status: "done" }),
      item({ id: "X" }),
      item({ id: "Y" }),
      item({ id: "Z" }),
    ];
    const blocked = blockedIds(items, "done");
    expect([...blocked]).toEqual(["X"]);
  });

  it("ignores a blocker edge that points at an id that no longer exists", () => {
    const items = [item({ id: "A", blocks: ["GONE", "B"] }), item({ id: "B" })];
    expect([...blockedIds(items, "done")]).toEqual(["B"]);
  });

  it("returns an empty set when nothing blocks anything", () => {
    expect(blockedIds([item({ id: "A" }), item({ id: "B" })], "done").size).toBe(0);
  });
});


describe("columnCards", () => {
  it("returns only the stage's cards, ordered by order-then-id", () => {
    const items = [
      item({ id: "T-3", status: "planning", order: 30 }),
      item({ id: "T-1", status: "planning", order: 10 }),
      item({ id: "OTHER", status: "todo", order: 5 }),
      item({ id: "T-9", status: "planning" }), // unordered sorts last
      item({ id: "T-2", status: "planning", order: 20 }),
    ];
    expect(columnCards(items, "planning").map((i) => i.id)).toEqual(["T-1", "T-2", "T-3", "T-9"]);
  });

  it("is column-scoped, not area-scoped — cards from every area group", () => {
    const items = [
      item({ id: "UIX-1", status: "planning", area: "ui", order: 20 }),
      item({ id: "API-1", status: "planning", area: "api", order: 10 }),
      item({ id: "NONE-1", status: "planning", area: "", order: 30 }),
    ];
    expect(columnCards(items, "planning").map((i) => i.id)).toEqual(["API-1", "UIX-1", "NONE-1"]);
  });
});

describe("positionForDrop", () => {
  const column = [
    item({ id: "C1", status: "planning", order: 10 }),
    item({ id: "C2", status: "planning", order: 20 }),
    item({ id: "C3", status: "planning", order: 30 }),
  ];

  it("maps the top edge of the first card to \"top\"", () => {
    expect(positionForDrop(column, "C1", "before", "MOVER")).toBe("top");
  });

  it("maps a before-edge to { after: <previous card> }", () => {
    expect(positionForDrop(column, "C3", "before", "MOVER")).toEqual({ after: "C2" });
  });

  it("maps an after-edge to { after: <that card> }", () => {
    expect(positionForDrop(column, "C3", "after", "MOVER")).toEqual({ after: "C3" });
  });

  it("skips the moving card when finding the previous neighbour", () => {
    // Drag C2 onto C3's before-edge: the neighbour above C3, once C2 is
    // excluded, is C1 — not C2 itself, which would make the drag a no-op.
    expect(positionForDrop(column, "C3", "before", "C2")).toEqual({ after: "C1" });
  });

  it("treats the first card as \"top\" once the mover above it is excluded", () => {
    expect(positionForDrop(column, "C2", "before", "C1")).toBe("top");
  });

  it("falls back to \"bottom\" for an unknown target (including a self-drop)", () => {
    expect(positionForDrop(column, "C1", "before", "C1")).toBe("bottom");
    expect(positionForDrop(column, "NOPE", "after", "MOVER")).toBe("bottom");
  });
});

describe("optimisticOrder", () => {
  const ordered = [
    item({ id: "C1", status: "planning", order: 10 }),
    item({ id: "C2", status: "planning", order: 20 }),
    item({ id: "C3", status: "planning", order: 30 }),
  ];

  it("midpoints between the new neighbours", () => {
    expect(optimisticOrder(ordered, { after: "C1" }, "MOVER")).toBe(15);
    expect(optimisticOrder(ordered, { after: "C2" }, "MOVER")).toBe(25);
  });

  it("handles top, bottom and an empty column", () => {
    expect(optimisticOrder(ordered, "top", "MOVER")).toBe(0);
    expect(optimisticOrder(ordered, "bottom", "MOVER")).toBe(40);
    expect(optimisticOrder([], "top", "MOVER")).toBe(10);
    expect(optimisticOrder([], "bottom", "MOVER")).toBe(10);
  });

  it("appends past the last card when the target is last", () => {
    expect(optimisticOrder(ordered, { after: "C3" }, "MOVER")).toBe(40);
  });

  it("treats an unordered column as freshly materialised to 10/20/30", () => {
    const unordered = [
      item({ id: "U1", status: "planning" }),
      item({ id: "U2", status: "planning" }),
      item({ id: "U3", status: "planning" }),
    ];
    expect(optimisticOrder(unordered, "top", "MOVER")).toBe(0);
    expect(optimisticOrder(unordered, { after: "U1" }, "MOVER")).toBe(15);
    expect(optimisticOrder(unordered, "bottom", "MOVER")).toBe(40);
  });

  it("excludes the moving card from the neighbour arithmetic", () => {
    // Moving C2 to just after C1: with C2 excluded, C1's successor is C3.
    expect(optimisticOrder(ordered, { after: "C1" }, "C2")).toBe(20);
  });

  it("returns undefined when the after-target is not in the column", () => {
    expect(optimisticOrder(ordered, { after: "NOPE" }, "MOVER")).toBeUndefined();
  });
});

describe("mergeColumns", () => {
  const stageColumns = UI_STAGES.map((s) => ({ id: s.id, name: s.name, color: s.color }));
  const stageIds = UI_STAGES.map((s) => s.id);

  it("keeps the configured columns in their given order", () => {
    const cols = mergeColumns(stageColumns, ["preparing", "done"], stageIds);
    expect(cols.map((c) => c.id)).toEqual(stageIds);
  });

  it("renders Backlog first, and only once, when backlog tickets are present", () => {
    // The GUI-069 regression: `backlog` cards used to resurrect the column
    // through the unknown-status fallback and land it after Done.
    const cols = mergeColumns(stageColumns, ["backlog", "backlog", "review"], stageIds);
    expect(cols[0].id).toBe("backlog");
    expect(cols.filter((c) => c.id === "backlog")).toHaveLength(1);
    expect(cols[0].name).toBe(UI_STAGES[0].name);
  });

  it("renders every stage even when no item has that status", () => {
    // The column list must not gain and lose a column as a count crosses zero.
    expect(mergeColumns(stageColumns, [], stageIds).map((c) => c.id)).toEqual(stageIds);
  });

  it("gives a genuinely unknown status a trailing fallback column", () => {
    const cols = mergeColumns(stageColumns, ["preparing", "triage"], stageIds);
    expect(cols).toHaveLength(stageIds.length + 1);
    expect(cols[cols.length - 1]).toEqual({ id: "triage", name: "triage" });
  });

  it("never resurrects a known status that was deliberately not rendered", () => {
    // The defect itself: a status the caller declared and then left out of the
    // rendered list is hidden on purpose, and must stay hidden.
    const withoutBacklog = stageColumns.filter((c) => c.id !== "backlog");
    const cols = mergeColumns(withoutBacklog, ["backlog", "preparing"], stageIds);
    expect(cols.map((c) => c.id)).not.toContain("backlog");
  });

  it("still falls back for an unknown status while a known one stays hidden", () => {
    const withoutBacklog = stageColumns.filter((c) => c.id !== "backlog");
    const cols = mergeColumns(withoutBacklog, ["backlog", "triage"], stageIds);
    expect(cols.map((c) => c.id)).toEqual([...stageIds.filter((id) => id !== "backlog"), "triage"]);
  });

  it("ignores an empty status value", () => {
    expect(mergeColumns(stageColumns, ["", "preparing"], stageIds).map((c) => c.id)).toEqual(
      stageIds,
    );
  });

  it("defaults to the old behaviour when no known set is given", () => {
    // Without `known`, nothing is hidden — every absent status is "unknown".
    const withoutBacklog = stageColumns.filter((c) => c.id !== "backlog");
    const cols = mergeColumns(withoutBacklog, ["backlog"]);
    expect(cols[cols.length - 1]).toEqual({ id: "backlog", name: "backlog" });
  });
});
