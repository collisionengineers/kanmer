import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { KanmerStore } from "./store.js";
import { getLinkGraph, linkItems } from "./links.js";

let root: string;
let store: KanmerStore;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-test-"));
  store = new KanmerStore(root);
  await store.init();
});

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe("KanmerStore", () => {
  it("initialises the .kanmer skeleton with a default board", async () => {
    expect(await store.exists()).toBe(true);
    const board = await store.getBoard();
    expect(board.idPrefixes.ticket).toBe("TICK");
  });

  it("seeds the six default workflow stages as the only stage dimension", async () => {
    const board = await store.getBoard();
    expect(board.statuses.map((s) => s.id)).toEqual([
      "todo",
      "planning",
      "implementing",
      "review",
      "verifying",
      "done",
    ]);
    expect(board).not.toHaveProperty("phases");
  });

  it("loads a legacy board that still has a phases array, dropping it", async () => {
    // Simulate a board.yml written before the consolidation.
    const legacy = [
      "phases:",
      "  - { id: build, name: Build }",
      "statuses:",
      "  - { id: todo, name: Todo }",
      "  - { id: done, name: Done }",
      "areas: []",
      "priorities:",
      "  - { id: medium, name: Medium }",
      "idPrefixes: { ticket: TICK, plan: PLAN, research: RES }",
      "",
    ].join("\n");
    await fs.writeFile(path.join(root, ".kanmer", "data", "board.yml"), legacy, "utf8");
    const board = await store.getBoard();
    expect(board).not.toHaveProperty("phases");
    expect(board.statuses.map((s) => s.id)).toEqual(["todo", "done"]);
  });

  it("allocates sequential, zero-padded ids per type", async () => {
    const a = await store.createItem({ type: "ticket", title: "A" });
    const b = await store.createItem({ type: "ticket", title: "B" });
    const p = await store.createItem({ type: "plan", title: "Plan" });
    expect(a.id).toBe("TICK-001");
    expect(b.id).toBe("TICK-002");
    expect(p.id).toBe("PLAN-001");
  });

  it("defaults status to the first stage", async () => {
    const t = await store.createItem({ type: "ticket", title: "A" });
    expect(t.status).toBe("todo");
  });

  it("updates fields and stamps updated", async () => {
    const t = await store.createItem({ type: "ticket", title: "A" });
    const moved = await store.moveItem(t.id, { status: "review" });
    expect(moved.status).toBe("review");
    expect(moved.updated >= t.updated).toBe(true);
    const reloaded = await store.getItem(t.id);
    expect(reloaded?.status).toBe("review");
  });

  it("filters by status and label", async () => {
    await store.createItem({ type: "ticket", title: "A", status: "todo", labels: ["x"] });
    await store.createItem({ type: "ticket", title: "B", status: "done", labels: ["y"] });
    expect((await store.listItems({ status: "done" })).length).toBe(1);
    expect((await store.listItems({ label: "x" })).length).toBe(1);
  });

  it("searches across title and body", async () => {
    await store.createItem({ type: "ticket", title: "Fix the parser", body: "needle here" });
    await store.createItem({ type: "ticket", title: "Unrelated" });
    expect((await store.searchItems("needle")).length).toBe(1);
    expect((await store.searchItems("parser")).length).toBe(1);
  });

  it("deletes items", async () => {
    const t = await store.createItem({ type: "ticket", title: "A" });
    expect(await store.deleteItem(t.id)).toBe(true);
    expect(await store.getItem(t.id)).toBeNull();
  });

  it("adds a stage to the board", async () => {
    const board = await store.addColumn("status", { id: "blocked", name: "Blocked" });
    expect(board.statuses.some((s) => s.id === "blocked")).toBe(true);
  });

  it("seeds default priorities and empty areas", async () => {
    const board = await store.getBoard();
    expect(board.priorities.map((p) => p.id)).toContain("urgent");
    expect(board.areas).toEqual([]);
  });

  it("creates with an area and filters by it", async () => {
    await store.addColumn("area", { id: "ui", name: "UI", color: "#5b8cff" });
    await store.createItem({ type: "ticket", title: "UI card", area: "ui" });
    await store.createItem({ type: "ticket", title: "No area" });
    expect((await store.listItems({ area: "ui" })).length).toBe(1);
  });

  it("adds a priority column", async () => {
    const board = await store.addColumn("priority", { id: "blocker", name: "Blocker" });
    expect(board.priorities.some((p) => p.id === "blocker")).toBe(true);
  });

  it("excludes archived items unless requested", async () => {
    const t = await store.createItem({ type: "ticket", title: "A" });
    await store.updateItem(t.id, { archived: true });
    expect((await store.listItems()).length).toBe(0);
    expect((await store.listItems({ includeArchived: true })).length).toBe(1);
  });

  it("round-trips a full board through setBoard", async () => {
    const board = await store.getBoard();
    board.areas.push({ id: "api", name: "API", color: "#3ddc84" });
    board.idPrefixes.ticket = "BUG";
    await store.setBoard(board);
    const reloaded = await store.getBoard();
    expect(reloaded.areas.some((a) => a.id === "api")).toBe(true);
    expect(reloaded.idPrefixes.ticket).toBe("BUG");
  });
});

describe("links", () => {
  it("computes forward and backlinks from frontmatter and wiki-links", async () => {
    const a = await store.createItem({ type: "ticket", title: "A" });
    const b = await store.createItem({
      type: "research",
      title: "B",
      body: `refers to [[${a.id}]]`,
    });
    const c = await store.createItem({ type: "plan", title: "C", links: [a.id] });

    const graphA = await getLinkGraph(store, a.id);
    expect(graphA.backlinks.sort()).toEqual([b.id, c.id].sort());

    const graphB = await getLinkGraph(store, b.id);
    expect(graphB.links).toContain(a.id);
  });

  it("adds and removes structured links", async () => {
    const a = await store.createItem({ type: "ticket", title: "A" });
    const b = await store.createItem({ type: "ticket", title: "B" });
    await linkItems(store, a.id, b.id, "add");
    expect((await store.getItem(a.id))?.links).toContain(b.id);
    await linkItems(store, a.id, b.id, "remove");
    expect((await store.getItem(a.id))?.links).not.toContain(b.id);
  });
});
