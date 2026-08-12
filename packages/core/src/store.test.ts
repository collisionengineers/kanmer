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

  it("rejects moving an item to a status the board doesn't define", async () => {
    await store.setBoard({
      ...(await store.getBoard()),
      statuses: [
        { id: "todo", name: "Todo" },
        { id: "done", name: "Done" },
      ],
    });
    const t = await store.createItem({ type: "ticket", title: "A" });
    await expect(store.moveItem(t.id, { status: "planning" })).rejects.toThrow(/Unknown status/);
    const moved = await store.moveItem(t.id, { status: "done" });
    expect(moved.status).toBe("done");
  });

  it("rejects creating an item with a status the board doesn't define", async () => {
    await expect(
      store.createItem({ type: "ticket", title: "A", status: "nope" }),
    ).rejects.toThrow(/Unknown status/);
  });

  it("rejects an unknown priority, listing the valid ids", async () => {
    await expect(
      store.createItem({ type: "ticket", title: "A", priority: "p0" }),
    ).rejects.toThrow(/Unknown priority "p0"\. Valid priorities: low, medium, high, urgent/);
    const t = await store.createItem({ type: "ticket", title: "A" });
    await expect(store.updateItem(t.id, { priority: "p0" })).rejects.toThrow(/Unknown priority/);
  });

  it("validates area only when the board defines areas; empty area always legal", async () => {
    // No areas configured: anything goes (legacy boards tag undeclared areas).
    await store.createItem({ type: "ticket", title: "A", area: "anything" });
    await store.addColumn("area", { id: "ui", name: "UI" });
    await expect(
      store.createItem({ type: "ticket", title: "B", area: "api" }),
    ).rejects.toThrow(/Unknown area "api"\. Valid areas: ui/);
    const ok = await store.createItem({ type: "ticket", title: "C", area: "" });
    expect(ok.area).toBe("");
  });

  it("derives the priority default from the board when medium is absent", async () => {
    const board = await store.getBoard();
    board.priorities = [
      { id: "p3", name: "P3" },
      { id: "p2", name: "P2" },
      { id: "p1", name: "P1" },
    ];
    await store.setBoard(board);
    const t = await store.createItem({ type: "ticket", title: "A" });
    expect(t.priority).toBe("p2");
  });

  it("rejects traversal and separator ids from every id-taking method", async () => {
    for (const bad of ["../evil", "..\\evil", "a/b", "a\\b", ".hidden", ""]) {
      await expect(store.getItem(bad)).rejects.toThrow(/Invalid item id/);
      await expect(store.updateItem(bad, { title: "x" })).rejects.toThrow(/Invalid item id/);
      await expect(store.deleteItem(bad)).rejects.toThrow(/Invalid item id/);
    }
  });

  it("does not bump updated on a no-op patch", async () => {
    const t = await store.createItem({ type: "ticket", title: "A", body: "hello" });
    await new Promise((r) => setTimeout(r, 5));
    const same = await store.updateItem(t.id, { title: "A", body: "hello\n" });
    expect(same.updated).toBe(t.updated);
    const empty = await store.updateItem(t.id, {});
    expect(empty.updated).toBe(t.updated);
    const changed = await store.updateItem(t.id, { title: "B" });
    expect(changed.updated >= t.updated).toBe(true);
  });

  it("rejects a stale expectedUpdated with a conflict error; accepts a fresh one", async () => {
    const t = await store.createItem({ type: "ticket", title: "A" });
    await new Promise((r) => setTimeout(r, 5));
    const moved = await store.updateItem(t.id, { title: "B" });
    await expect(
      store.updateItem(t.id, { title: "C", expectedUpdated: t.updated }),
    ).rejects.toThrow(/Conflict/);
    const okUpdate = await store.updateItem(t.id, {
      title: "C",
      expectedUpdated: moved.updated,
    });
    expect(okUpdate.title).toBe("C");
  });

  it("allocates unique ids under concurrent createItem", async () => {
    const created = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        store.createItem({ type: "ticket", title: `T${i}` }),
      ),
    );
    const ids = created.map((c) => c.id);
    expect(new Set(ids).size).toBe(10);
    expect((await store.listItems()).length).toBe(10);
  });

  it("rejects createItem links to items that don't exist", async () => {
    await expect(
      store.createItem({ type: "plan", title: "P", links: ["TICK-999"] }),
    ).rejects.toThrow(/No item with id "TICK-999" to link to/);
  });

  it("surfaces malformed files and filename/id mismatches as warnings", async () => {
    await store.createItem({ type: "ticket", title: "Good" });
    const dir = path.join(root, ".kanmer", "tickets");
    await fs.writeFile(path.join(dir, "BROKEN-001.md"), "---\nid: [not: valid\n---\n", "utf8");
    await fs.writeFile(
      path.join(dir, "TICK-999.md"),
      "---\nid: TICK-042\ntype: ticket\ntitle: Misnamed\n---\nbody\n",
      "utf8",
    );
    const { items, warnings } = await store.listItemsWithWarnings();
    expect(items.some((i) => i.id === "TICK-001")).toBe(true);
    expect(warnings.length).toBe(2);
    expect(warnings.some((w) => w.file.endsWith("BROKEN-001.md"))).toBe(true);
    expect(warnings.some((w) => w.message.includes("TICK-042"))).toBe(true);
    // Plain listItems keeps working and still returns the parseable items.
    expect((await store.listItems()).length).toBe(2);
  });

  it("reports the board source", async () => {
    expect((await store.getBoardWithSource()).source).toBe("file");
    const bare = new KanmerStore(await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-bare-")));
    expect((await bare.getBoardWithSource()).source).toBe("default");
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
    expect((await store.deleteItem(t.id)).deleted).toBe(true);
    expect(await store.getItem(t.id)).toBeNull();
    expect((await store.deleteItem(t.id)).deleted).toBe(false);
  });

  it("cleans frontmatter links of items referencing a deleted id, reports body refs", async () => {
    const target = await store.createItem({ type: "ticket", title: "Target" });
    const linker = await store.createItem({ type: "plan", title: "Linker", links: [target.id] });
    const mentioner = await store.createItem({
      type: "research",
      title: "Mentioner",
      body: `see [[${target.id}]]`,
    });
    const result = await store.deleteItem(target.id);
    expect(result.deleted).toBe(true);
    expect(result.cleanedLinks).toEqual([linker.id]);
    expect(result.bodyReferencesRemain).toEqual([mentioner.id]);
    expect((await store.getItem(linker.id))?.links).not.toContain(target.id);
    expect((await store.getItem(mentioner.id))?.body).toContain(target.id);
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

  it("rejects adding a link to a missing target, but removal stays permissive", async () => {
    const a = await store.createItem({ type: "ticket", title: "A" });
    await expect(linkItems(store, a.id, "TICK-999", "add")).rejects.toThrow(
      /No item with id "TICK-999" to link to/,
    );
    // A dangling link (e.g. hand-edited) can still be removed.
    await expect(linkItems(store, a.id, "TICK-999", "remove")).resolves.toBeDefined();
  });
});
