import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { KanmerStore } from "./store.js";
import { getLinkGraph, linkItems } from "./links.js";
import { migrateToV2 } from "./migrate.js";

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

  it("seeds the seven default workflow stages as the only stage dimension", async () => {
    const board = await store.getBoard();
    expect(board.statuses.map((s) => s.id)).toEqual([
      "backlog",
      "researching",
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

  it("allocates sequential, zero-padded ids", async () => {
    const a = await store.createItem({ type: "ticket", title: "A" });
    const b = await store.createItem({ type: "ticket", title: "B" });
    expect(a.id).toBe("TICK-001");
    expect(b.id).toBe("TICK-002");
  });

  it("gives tickets area-based ids and places them in the area's folder", async () => {
    await store.addColumn("area", { id: "api", name: "API" });
    const t = await store.createItem({ type: "ticket", title: "A", area: "api" });
    expect(t.id).toBe("API-001");
    expect(
      await fs
        .access(path.join(root, ".kanmer", "areas", "api", "API-001", "API-001.md"))
        .then(() => true),
    ).toBe(true);
    const none = await store.createItem({ type: "ticket", title: "B" });
    expect(none.id).toBe("TICK-001");
    expect(
      await fs
        .access(path.join(root, ".kanmer", "areas", "_none", "TICK-001", "TICK-001.md"))
        .then(() => true),
    ).toBe(true);
  });

  it("rejects standalone plan/research creation on a v2 board, naming set_ticket_doc", async () => {
    await expect(store.createItem({ type: "plan", title: "P" })).rejects.toThrow(
      /set_ticket_doc/,
    );
    await expect(store.createItem({ type: "research", title: "R" })).rejects.toThrow(
      /set_ticket_doc/,
    );
  });

  it("defaults status to the first stage", async () => {
    const t = await store.createItem({ type: "ticket", title: "A" });
    expect(t.status).toBe("backlog");
  });

  it("updates fields and stamps updated", async () => {
    // Create in review (creation is ungated) and move across an ungated
    // boundary (review→verifying) so this stays a test about `updated`, not gates.
    const t = await store.createItem({ type: "ticket", title: "A", status: "review" });
    const moved = await store.moveItem(t.id, { status: "verifying" });
    expect(moved.status).toBe("verifying");
    expect(moved.updated >= t.updated).toBe(true);
    const reloaded = await store.getItem(t.id);
    expect(reloaded?.status).toBe("verifying");
  });

  it("rejects moving an item to a status the board doesn't define", async () => {
    await store.setBoard({
      ...(await store.getBoard()),
      statuses: [
        { id: "todo", name: "Todo" },
        { id: "wip", name: "WIP" },
        { id: "done", name: "Done" },
      ],
    });
    const t = await store.createItem({ type: "ticket", title: "A" });
    await expect(store.moveItem(t.id, { status: "planning" })).rejects.toThrow(/Unknown status/);
    const moved = await store.moveItem(t.id, { status: "wip" });
    expect(moved.status).toBe("wip");
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
    const board = await store.getBoard();
    await store.setBoard({ ...board, areas: [] });
    await store.createItem({ type: "ticket", title: "A", area: "anything" });
    await store.setBoard(board);
    await store.addColumn("area", { id: "ui", name: "UI" });
    await expect(
      store.createItem({ type: "ticket", title: "B", area: "api" }),
    ).rejects.toThrow(/Unknown area "api"\. Valid areas: pr-review, ui/);
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

  it("does not bump updated on a no-op patch, and never touches the file", async () => {
    const t = await store.createItem({ type: "ticket", title: "A", body: "hello" });
    const file = path.join(root, ".kanmer", "areas", "_none", t.id, `${t.id}.md`);
    const mtimeBefore = (await fs.stat(file)).mtimeMs;
    // Beat coarse filesystem mtime granularity: if a no-op rewrote the file,
    // the stamp would have moved by the time we re-stat it.
    await new Promise((r) => setTimeout(r, 20));
    const same = await store.updateItem(t.id, { title: "A", body: "hello\n" });
    expect(same.updated).toBe(t.updated);
    const empty = await store.updateItem(t.id, {});
    expect(empty.updated).toBe(t.updated);
    expect((await fs.stat(file)).mtimeMs).toBe(mtimeBefore);
    const changed = await store.updateItem(t.id, { title: "B" });
    expect(changed.updated >= t.updated).toBe(true);
    expect((await fs.stat(file)).mtimeMs).toBeGreaterThan(mtimeBefore);
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
      store.createItem({ type: "ticket", title: "P", links: ["TICK-999"] }),
    ).rejects.toThrow(/No item with id "TICK-999" to link to/);
  });

  it("surfaces malformed files, id mismatches and hand-moved folders as warnings", async () => {
    await store.createItem({ type: "ticket", title: "Good" });
    const none = path.join(root, ".kanmer", "areas", "_none");
    await fs.mkdir(path.join(none, "BROKEN-001"), { recursive: true });
    await fs.writeFile(
      path.join(none, "BROKEN-001", "BROKEN-001.md"),
      "---\nid: [not: valid\n---\n",
      "utf8",
    );
    await fs.mkdir(path.join(none, "TICK-999"), { recursive: true });
    await fs.writeFile(
      path.join(none, "TICK-999", "TICK-999.md"),
      "---\nid: TICK-042\ntype: ticket\ntitle: Misnamed\n---\nbody\n",
      "utf8",
    );
    // A ticket whose frontmatter area disagrees with the folder it sits in.
    await fs.mkdir(path.join(none, "TICK-500"), { recursive: true });
    await fs.writeFile(
      path.join(none, "TICK-500", "TICK-500.md"),
      "---\nid: TICK-500\ntype: ticket\ntitle: Strayed\narea: pr-review\n---\nbody\n",
      "utf8",
    );
    const { items, warnings } = await store.listItemsWithWarnings();
    expect(items.some((i) => i.id === "TICK-001")).toBe(true);
    expect(warnings.length).toBe(3);
    expect(warnings.some((w) => w.file.endsWith("BROKEN-001.md"))).toBe(true);
    expect(warnings.some((w) => w.message.includes("TICK-042"))).toBe(true);
    expect(warnings.some((w) => w.message.includes("frontmatter wins"))).toBe(true);
    // Plain listItems keeps working and still returns the parseable items.
    expect((await store.listItems()).length).toBe(3);
  });

  it("reconciles a hand-moved folder to the frontmatter area on the next write", async () => {
    const t = await store.createItem({ type: "ticket", title: "A", area: "pr-review" });
    // Hand-move the folder out of its area.
    const from = path.join(root, ".kanmer", "areas", "pr-review", t.id);
    const to = path.join(root, ".kanmer", "areas", "_none", t.id);
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.rename(from, to);
    await store.updateItem(t.id, { title: "B" });
    expect(
      await fs.access(path.join(root, ".kanmer", "areas", "pr-review", t.id)).then(
        () => true,
        () => false,
      ),
    ).toBe(true);
  });

  it("reports the board source", async () => {
    expect((await store.getBoardWithSource()).source).toBe("file");
    const bare = new KanmerStore(await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-bare-")));
    expect((await bare.getBoardWithSource()).source).toBe("default");
  });

  it("filters by status and label", async () => {
    await store.createItem({ type: "ticket", title: "A", status: "backlog", labels: ["x"] });
    // A ticket cannot be created straight into the final stage — take the
    // real path: create earlier, write proof, then move.
    const b = await store.createItem({
      type: "ticket",
      title: "B",
      status: "verifying",
      labels: ["y"],
    });
    await store.setDoc(b.id, "proof", "Evidence.");
    await store.moveItem(b.id, { status: "done" });
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
    const linker = await store.createItem({ type: "ticket", title: "Linker", links: [target.id] });
    const mentioner = await store.createItem({
      type: "ticket",
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

  it("seeds default priorities and the PR Review default area", async () => {
    const board = await store.getBoard();
    expect(board.priorities.map((p) => p.id)).toContain("urgent");
    expect(board.areas.map((a) => a.id)).toEqual(["pr-review"]);
    expect(board.areas[0].prefix).toBe("PR");
  });

  it("stamps version.json with the current format on init", async () => {
    const raw = JSON.parse(
      await fs.readFile(path.join(root, ".kanmer", "version.json"), "utf8"),
    );
    expect(raw.format).toBe(2);
    expect(await store.detectFormat()).toBe(2);
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
      type: "ticket",
      title: "B",
      body: `refers to [[${a.id}]]`,
    });
    const c = await store.createItem({ type: "ticket", title: "C", links: [a.id] });

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

describe("format v2", () => {
  it("moves the ticket folder when the area changes; the id never changes", async () => {
    await store.addColumn("area", { id: "api", name: "API" });
    const t = await store.createItem({ type: "ticket", title: "A", area: "api" });
    expect(t.id).toBe("API-001");
    const moved = await store.updateItem(t.id, { area: "pr-review" });
    expect(moved.id).toBe("API-001");
    expect(moved.area).toBe("pr-review");
    const newFile = path.join(root, ".kanmer", "areas", "pr-review", "API-001", "API-001.md");
    expect(await fs.access(newFile).then(() => true)).toBe(true);
    expect(
      await fs.access(path.join(root, ".kanmer", "areas", "api", "API-001")).then(
        () => true,
        () => false,
      ),
    ).toBe(false);
    expect((await store.getItem("API-001"))?.area).toBe("pr-review");
  });

  it("round-trips ticket docs, appends without clobbering, reports checklist progress", async () => {
    const t = await store.createItem({ type: "ticket", title: "A" });
    expect(await store.getDoc(t.id, "research")).toBeNull();
    await store.setDoc(t.id, "research", "# Findings\n\nStuff");
    expect(await store.getDoc(t.id, "research")).toBe("# Findings\n\nStuff\n");
    await store.setDoc(t.id, "research", "More stuff", { append: true });
    expect(await store.getDoc(t.id, "research")).toBe("# Findings\n\nStuff\n\nMore stuff\n");
    // checklist requires plan, plan requires research+impact — write them first.
    await store.setDoc(t.id, "impact", "impact");
    await store.setDoc(t.id, "plan", "plan");
    await store.setDoc(t.id, "checklist", "- [x] one\n- [ ] two\n- [X] three\nnot a box");
    const info = await store.getTicketDocsInfo(t.id);
    expect(info?.docs).toEqual({
      research: true,
      impact: true,
      "open-questions": false,
      plan: true,
      checklist: true,
      "post-implementation-report": false,
      proof: false,
    });
    expect(info?.checklist).toEqual({ checked: 2, total: 3 });
  });

  it("setDoc rejects a stale expectedVersion and leaves the file alone", async () => {
    const t = await store.createItem({ type: "ticket", title: "A" });
    const { version: stale } = await store.setDoc(t.id, "research", "A");
    await store.setDoc(t.id, "research", "B"); // a concurrent, newer write
    await expect(
      store.setDoc(t.id, "research", "C", { expectedVersion: stale }),
    ).rejects.toThrow(/Conflict/);
    expect(await store.getDoc(t.id, "research")).toContain("B");
  });

  it("setDoc accepts a fresh expectedVersion", async () => {
    const t = await store.createItem({ type: "ticket", title: "A" });
    await store.setDoc(t.id, "research", "A");
    const read = await store.getDocWithVersion(t.id, "research");
    expect(read.content).toBe("A\n");
    const { version } = await store.setDoc(t.id, "research", "B", {
      expectedVersion: read.version,
    });
    // The returned token describes what was actually written.
    expect((await store.getDocWithVersion(t.id, "research")).version).toBe(version);
  });

  it("expectedVersion: null means the document must not exist yet", async () => {
    const t = await store.createItem({ type: "ticket", title: "A" });
    await expect(
      store.setDoc(t.id, "impact", "first", { expectedVersion: null }),
    ).resolves.toBeDefined();
    await expect(
      store.setDoc(t.id, "impact", "again", { expectedVersion: null }),
    ).rejects.toThrow(/Conflict/);
    expect(await store.getDoc(t.id, "impact")).toContain("first");
  });

  it("append honours expectedVersion", async () => {
    const t = await store.createItem({ type: "ticket", title: "A" });
    const { version: stale } = await store.setDoc(t.id, "research", "one");
    await store.setDoc(t.id, "research", "two", { append: true });
    const before = await store.getDoc(t.id, "research");
    await expect(
      store.setDoc(t.id, "research", "three", { append: true, expectedVersion: stale }),
    ).rejects.toThrow(/Conflict/);
    expect(await store.getDoc(t.id, "research")).toBe(before);
  });

  it("setDoc without expectedVersion is still last-write-wins", async () => {
    const t = await store.createItem({ type: "ticket", title: "A" });
    await store.setDoc(t.id, "research", "A");
    await store.setDoc(t.id, "research", "B");
    expect(await store.getDoc(t.id, "research")).toBe("B\n");
    // Legacy-layout items report null for both halves, as getDoc does.
    expect(await store.getDocWithVersion(t.id, "plan")).toEqual({
      content: null,
      version: null,
    });
  });

  it("takes and releases a ticket", async () => {
    // Created in implementing (ungated) so take's default stage is a no-op move,
    // not a gated jump through the whole pipeline.
    const t = await store.createItem({ type: "ticket", title: "A", status: "implementing" });
    const taken = await store.takeTicket(t.id, { branch: "feat/x", worktree: "wt/x" });
    expect(taken.taken_at).toBeTruthy();
    expect(taken.branch).toBe("feat/x");
    expect(taken.worktree).toBe("wt/x");
    expect(taken.status).toBe("implementing");
    await expect(store.takeTicket(t.id, { branch: "feat/y" })).rejects.toThrow(
      /already taken/,
    );
    const retaken = await store.takeTicket(t.id, { branch: "feat/y", force: true });
    expect(retaken.branch).toBe("feat/y");
    expect(retaken.worktree).toBeUndefined();
    const released = await store.releaseTicket(t.id);
    expect(released.taken_at).toBeUndefined();
    expect(released.branch).toBeUndefined();
    // The file itself must not carry null-valued taken keys.
    const raw = await fs.readFile(
      path.join(root, ".kanmer", "areas", "_none", t.id, `${t.id}.md`),
      "utf8",
    );
    expect(raw).not.toContain("taken_at");
    expect(raw).not.toContain("branch");
  });

  it("gates the final stage on proof.md and names set_ticket_doc in the error", async () => {
    // Created in verifying (creation ungated) so only the proof→done gate is in play.
    const t = await store.createItem({ type: "ticket", title: "A", status: "verifying" });
    await expect(store.moveItem(t.id, { status: "done" })).rejects.toThrow(
      /proof\.md is missing.*set_ticket_doc/s,
    );
    await store.setDoc(t.id, "proof", "Tests: 35/35 green.");
    const done = await store.moveItem(t.id, { status: "done" });
    expect(done.status).toBe("done");
  });

  it("allows creating a ticket directly in the final stage (creation is ungated)", async () => {
    // D6: gates fire on transitions only, so imports/backfills of finished work
    // may be created straight into the final stage without proof.md existing.
    const born = await store.createItem({ type: "ticket", title: "Born done", status: "done" });
    expect(born.status).toBe("done");
    expect((await store.listItems({ includeArchived: true })).length).toBe(1);
  });

  it("still allows creating into any stage, and the default first stage", async () => {
    const defaulted = await store.createItem({ type: "ticket", title: "A" });
    expect(defaulted.status).toBe("backlog");
    const explicit = await store.createItem({ type: "ticket", title: "B", status: "verifying" });
    expect(explicit.status).toBe("verifying");
  });

  it("does not gate creation on a single-stage board", async () => {
    const board = await store.getBoard();
    await store.setBoard({ ...board, statuses: [{ id: "only", name: "Only" }] });
    const t = await store.createItem({ type: "ticket", title: "A", status: "only" });
    expect(t.status).toBe("only");
  });

  it("refuses a status reorder when the new final boundary's configured gate is unmet", async () => {
    const t = await store.createItem({ type: "ticket", title: "A", status: "review" });
    await expect(
      store.reorderColumns("status", [
        "backlog",
        "researching",
        "planning",
        "implementing",
        "verifying",
        "done",
        "review",
      ]),
    ).rejects.toThrow(/post-implementation-report\.md is missing/);
    expect(t.status).toBe("review");
    // The board was NOT written.
    expect((await store.getBoard()).statuses.at(-1)?.id).toBe("done");
  });

  it("allows a status reorder once every occupant satisfies the new final boundary gate", async () => {
    const t = await store.createItem({ type: "ticket", title: "A", status: "review" });
    await store.setDoc(t.id, "post-implementation-report", "evidence");
    await store.reorderColumns("status", [
      "backlog",
      "researching",
      "planning",
      "implementing",
      "verifying",
      "done",
      "review",
    ]);
    expect((await store.getBoard()).statuses.at(-1)?.id).toBe("review");
  });

  it("refuses the same thing through a whole-board setBoard, as the Settings editor does", async () => {
    await store.createItem({ type: "ticket", title: "A", status: "review" });
    const board = await store.getBoard();
    const review = board.statuses.find((s) => s.id === "review")!;
    board.statuses = [...board.statuses.filter((s) => s.id !== "review"), review];
    await expect(store.setBoard(board)).rejects.toThrow(/post-implementation-report\.md is missing/);
    expect((await store.getBoard()).statuses.at(-1)?.id).toBe("done");
  });

  it("reordering non-status columns never touches the proof gate", async () => {
    const t = await store.createItem({ type: "ticket", title: "A", status: "review" });
    // Put a proofless ticket in the current final stage by hand — reordering
    // priorities must not care.
    await fs.writeFile(
      path.join(root, ".kanmer", "areas", "_none", t.id, `${t.id}.md`),
      (
        await fs.readFile(
          path.join(root, ".kanmer", "areas", "_none", t.id, `${t.id}.md`),
          "utf8",
        )
      ).replace("status: review", "status: done"),
      "utf8",
    );
    await expect(
      store.reorderColumns("priority", ["urgent", "high", "medium", "low"]),
    ).resolves.toBeDefined();
  });
});

describe("activity log", () => {
  it("appends one well-formed line per mutation with from/to and actor", async () => {
    // review→verifying and the backward take→implementing are ungated, so this
    // stays a test about activity entries, not gate satisfaction.
    const t = await store.createItem({ type: "ticket", title: "A", status: "review" });
    await store.updateItem(t.id, { title: "B", priority: "high" });
    await store.moveItem(t.id, { status: "verifying" });
    await store.takeTicket(t.id, { branch: "feat/x" });
    await store.releaseTicket(t.id);
    await store.setDoc(t.id, "research", "notes");
    await store.deleteItem(t.id);
    const entries = await store.getActivity();
    const ops = entries.map((e) => e.op);
    expect(ops).toEqual([
      "create",
      "update", // title
      "update", // priority
      "update", // status → verifying
      "take",
      "update", // status → implementing (take's stage move)
      "release",
      "doc",
      "delete",
    ]);
    const statusMove = entries[3];
    expect(statusMove).toMatchObject({ id: t.id, field: "status", from: "review", to: "verifying" });
    expect(entries.every((e) => e.actor === "gui")).toBe(true);
    expect(entries.every((e) => typeof e.ts === "string" && e.ts.length > 0)).toBe(true);
  });

  it("filters by id and since; deleting the log breaks nothing", async () => {
    const a = await store.createItem({ type: "ticket", title: "A" });
    const b = await store.createItem({ type: "ticket", title: "B" });
    expect((await store.getActivity({ id: b.id })).length).toBe(1);
    const all = await store.getActivity();
    const sinceLast = await store.getActivity({ since: all[0].ts });
    expect(sinceLast.length).toBeLessThan(all.length);
    await fs.rm(path.join(root, ".kanmer", "data", "activity.jsonl"));
    expect(await store.getActivity()).toEqual([]);
    await store.updateItem(a.id, { title: "A2" }); // logging resumes
    expect((await store.getActivity()).length).toBe(1);
  });

  it("rotates: past ~5k lines the oldest half is dropped", async () => {
    const file = path.join(root, ".kanmer", "data", "activity.jsonl");
    const pad = "x".repeat(80);
    const line = (i: number) =>
      JSON.stringify({ ts: `t${i}`, id: "TICK-001", op: "update", field: pad, actor: "gui" });
    await fs.writeFile(file, Array.from({ length: 5100 }, (_, i) => line(i)).join("\n") + "\n");
    const t = await store.createItem({ type: "ticket", title: "A" });
    const entries = await store.getActivity();
    expect(entries.length).toBeLessThanOrEqual(2500);
    expect(entries[entries.length - 1].id).toBe(t.id); // newest survived
  });
});

describe("blocks / order", () => {
  it("rel blocks writes blocks[]; blocked-by derives; default rel keeps links[]", async () => {
    const a = await store.createItem({ type: "ticket", title: "A" });
    const b = await store.createItem({ type: "ticket", title: "B" });
    await linkItems(store, a.id, b.id, "add", "blocks");
    expect((await store.getItem(a.id))?.blocks).toEqual([b.id]);
    expect((await store.getItem(a.id))?.links).toEqual([]);
    const graph = await getLinkGraph(store, b.id);
    expect(graph.blockedBy).toEqual([a.id]);
    expect(graph.backlinks).toEqual([]); // blocks edges are typed, not plain links
    await linkItems(store, a.id, b.id, "remove", "blocks");
    expect((await store.getItem(a.id))?.blocks).toEqual([]);
  });

  it("blocked flips off when the blocker reaches the last stage or is archived", async () => {
    const { computeBlockedIds } = await import("./links.js");
    // Blocker starts in verifying so the only gate to the final stage is proof.
    const a = await store.createItem({ type: "ticket", title: "Blocker", status: "verifying" });
    const b = await store.createItem({ type: "ticket", title: "Blocked" });
    await linkItems(store, a.id, b.id, "add", "blocks");
    const board = await store.getBoard();
    const last = board.statuses[board.statuses.length - 1].id;
    const blockedNow = computeBlockedIds(await store.listItems({ includeArchived: true }), last);
    expect(blockedNow.has(b.id)).toBe(true);
    await store.setDoc(a.id, "proof", "done");
    await store.moveItem(a.id, { status: last });
    const afterDone = computeBlockedIds(await store.listItems({ includeArchived: true }), last);
    expect(afterDone.has(b.id)).toBe(false);
    await store.moveItem(a.id, { status: "backlog" });
    await store.updateItem(a.id, { archived: true });
    const afterArchive = computeBlockedIds(await store.listItems({ includeArchived: true }), last);
    expect(afterArchive.has(b.id)).toBe(false);
  });

  it("a file still carrying a legacy due: loads fine (passthrough) and is not read by any filter", async () => {
    const t = await store.createItem({ type: "ticket", title: "X" });
    const file = path.join(root, ".kanmer", "areas", "_none", t.id, `${t.id}.md`);
    const raw = await fs.readFile(file, "utf8");
    // Hand-add a legacy `due:` the way a board written before v2 would carry it.
    await fs.writeFile(file, raw.replace("status:", "due: 2020-01-01\nstatus:"), "utf8");
    // It loads without error and is preserved as an unknown passthrough key;
    // nothing in the store reads `due` any more.
    const loaded = await store.getItem(t.id);
    expect(loaded?.title).toBe("X");
    expect((loaded as Record<string, unknown>).due).toBeDefined();
  });

  it("orders: position verbs materialise, midpoint-insert, unordered sorts last", async () => {
    // A gate-free custom board (non-canonical stage ids) so this stays a test of
    // the fractional-order machinery, isolated from document gates.
    await store.setBoard({
      ...(await store.getBoard()),
      statuses: [
        { id: "col1", name: "One" },
        { id: "col2", name: "Two" },
      ],
    });
    const a = await store.createItem({ type: "ticket", title: "A" });
    const b = await store.createItem({ type: "ticket", title: "B" });
    const c = await store.createItem({ type: "ticket", title: "C" });
    // Move C to the top of col1: materialises A/B and places C before them.
    await store.moveItem(c.id, { status: "col1", position: "top" });
    let ids = (await store.listItems({ status: "col1" })).map((i) => i.id);
    expect(ids).toEqual([c.id, a.id, b.id]);
    // Insert A after C — midpoint between C and B's orders.
    await store.moveItem(a.id, { status: "col1", position: { after: c.id } });
    ids = (await store.listItems({ status: "col1" })).map((i) => i.id);
    expect(ids).toEqual([c.id, a.id, b.id]);
    // Bottom placement.
    await store.moveItem(c.id, { status: "col1", position: "bottom" });
    ids = (await store.listItems({ status: "col1" })).map((i) => i.id);
    expect(ids).toEqual([a.id, b.id, c.id]);
    // A new unordered item sorts after all ordered ones.
    const d = await store.createItem({ type: "ticket", title: "D" });
    ids = (await store.listItems({ status: "col1" })).map((i) => i.id);
    expect(ids[ids.length - 1]).toBe(d.id);
    // position.after must name an item in the target stage.
    await expect(
      store.moveItem(d.id, { status: "col2", position: { after: a.id } }),
    ).rejects.toThrow(/not an item in stage/);
  });

  it("rebalances when midpoints between two neighbours are exhausted", async () => {
    // Single gate-free stage so the move is only about order rebalancing.
    await store.setBoard({
      ...(await store.getBoard()),
      statuses: [{ id: "col1", name: "One" }],
    });
    const a = await store.createItem({ type: "ticket", title: "A" });
    const b = await store.createItem({ type: "ticket", title: "B" });
    const c = await store.createItem({ type: "ticket", title: "C" });
    // Two adjacent doubles: (10 + 10.000000000000002) / 2 is not strictly
    // between them, which is the only way to reach computeOrder's rebalance.
    await store.updateItem(a.id, { order: 10 });
    await store.updateItem(b.id, { order: 10.000000000000002 });
    await store.moveItem(c.id, { status: "col1", position: { after: a.id } });
    const ids = (await store.listItems({ status: "col1" })).map((i) => i.id);
    expect(ids).toEqual([a.id, c.id, b.id]);
    // The rebalance rewrote the pathological values into the 10/20 ladder.
    expect((await store.getItem(a.id))?.order).toBe(10);
    expect((await store.getItem(b.id))?.order).toBe(20);
    expect((await store.getItem(c.id))?.order).toBe(15);
  });

  it("a rejected positioned move leaves the target column's siblings untouched", async () => {
    const s1 = await store.createItem({ type: "ticket", title: "S1", status: "planning" });
    const s2 = await store.createItem({ type: "ticket", title: "S2", status: "planning" });
    const s3 = await store.createItem({ type: "ticket", title: "S3", status: "planning" });
    const t = await store.createItem({ type: "ticket", title: "T", status: "backlog" });
    const siblings = [s1, s2, s3];
    for (const s of siblings) expect(s.order).toBeUndefined();
    const before = new Map(siblings.map((s) => [s.id, s.updated]));
    const activityBefore = (await store.getActivity()).length;

    // Make expectedUpdated stale.
    await new Promise((r) => setTimeout(r, 5));
    await store.updateItem(t.id, { title: "T2" });
    await expect(
      store.moveItem(t.id, {
        status: "planning",
        position: "top",
        expectedUpdated: t.updated,
      }),
    ).rejects.toThrow(/Conflict/);

    for (const s of siblings) {
      const reloaded = await store.getItem(s.id);
      expect(reloaded?.order).toBeUndefined();
      expect(reloaded?.updated).toBe(before.get(s.id));
    }
    expect((await store.getActivity()).slice(activityBefore).filter((e) => e.field === "order"))
      .toEqual([]);
  });

  it("a proof-gated positioned move leaves the final stage's siblings untouched", async () => {
    const a = await store.createItem({ type: "ticket", title: "A", status: "verifying" });
    const b = await store.createItem({ type: "ticket", title: "B", status: "verifying" });
    for (const p of [a, b]) {
      await store.setDoc(p.id, "proof", "evidence");
      await store.moveItem(p.id, { status: "done" });
    }
    expect((await store.getItem(a.id))?.order).toBeUndefined();
    const proofless = await store.createItem({ type: "ticket", title: "P", status: "backlog" });

    await expect(
      store.moveItem(proofless.id, { status: "done", position: "top" }),
    ).rejects.toThrow(/proof\.md is missing/);

    for (const p of [a, b]) {
      expect((await store.getItem(p.id))?.order).toBeUndefined();
    }
  });

  it("items without new keys serialise without new-key noise", async () => {
    const t = await store.createItem({ type: "ticket", title: "Plain" });
    const raw = await fs.readFile(
      path.join(root, ".kanmer", "areas", "_none", t.id, `${t.id}.md`),
      "utf8",
    );
    for (const key of ["due:", "order:", "blocks:", "taken_at:", "branch:", "worktree:"]) {
      expect(raw).not.toContain(key);
    }
  });
});

describe("format v1 compatibility", () => {
  let v1root: string;
  let v1store: KanmerStore;

  beforeEach(async () => {
    v1root = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-v1-"));
    const k = path.join(v1root, ".kanmer");
    await fs.mkdir(path.join(k, "data"), { recursive: true });
    await fs.mkdir(path.join(k, "tickets"), { recursive: true });
    await fs.mkdir(path.join(k, "plans"), { recursive: true });
    await fs.mkdir(path.join(k, "research"), { recursive: true });
    await fs.writeFile(
      path.join(k, "data", "board.yml"),
      [
        "statuses:",
        "  - { id: todo, name: Todo }",
        "  - { id: in-progress, name: In progress }",
        "  - { id: done, name: Done }",
        "areas:",
        "  - { id: api, name: API }",
        "priorities:",
        "  - { id: medium, name: Medium }",
        "idPrefixes: { ticket: TICK, plan: PLAN, research: RES }",
        "",
      ].join("\n"),
      "utf8",
    );
    const ticket = [
      "---",
      "id: TICK-001",
      "type: ticket",
      "title: Legacy ticket",
      "status: in-progress",
      "area: api",
      "links: [PLAN-001]",
      "---",
      "Legacy body.",
      "",
    ].join("\n");
    const plan = [
      "---",
      "id: PLAN-001",
      "type: plan",
      "title: Legacy plan",
      "status: todo",
      "---",
      "Plan body for [[TICK-001]].",
      "",
    ].join("\n");
    const orphan = [
      "---",
      "id: RES-001",
      "type: research",
      "title: Orphan research",
      "status: todo",
      "---",
      "Nobody links me.",
      "",
    ].join("\n");
    await fs.writeFile(path.join(k, "tickets", "TICK-001.md"), ticket, "utf8");
    await fs.writeFile(path.join(k, "plans", "PLAN-001.md"), plan, "utf8");
    await fs.writeFile(path.join(k, "research", "RES-001.md"), orphan, "utf8");
    v1store = new KanmerStore(v1root);
  });

  afterEach(async () => {
    await fs.rm(v1root, { recursive: true, force: true });
  });

  it("detects format 1 and keeps reading/writing the legacy layout", async () => {
    expect(await v1store.detectFormat()).toBe(1);
    expect((await v1store.listItems()).length).toBe(3);
    const updated = await v1store.updateItem("TICK-001", { title: "Renamed" });
    expect(updated.title).toBe("Renamed");
    const created = await v1store.createItem({ type: "ticket", title: "Another" });
    expect(created.id).toBe("TICK-002");
    expect(
      await fs.access(path.join(v1root, ".kanmer", "tickets", "TICK-002.md")).then(() => true),
    ).toBe(true);
    // Plan creation is still allowed on a v1 board.
    const p = await v1store.createItem({ type: "plan", title: "New plan" });
    expect(p.id).toBe("PLAN-002");
    // init() must not stamp v2 onto a v1 board.
    await v1store.init();
    expect(
      await fs.access(path.join(v1root, ".kanmer", "version.json")).then(
        () => true,
        () => false,
      ),
    ).toBe(false);
  });

  it("migrates v1 to v2: dry run, real run, idempotent re-run", async () => {
    const dry = await migrateToV2(v1store, { dryRun: true });
    expect(dry.alreadyV2).toBe(false);
    expect(dry.ticketMoves).toEqual([
      { id: "TICK-001", to: path.join("areas", "api", "TICK-001") },
    ]);
    expect(dry.foldedDocs).toEqual([{ source: "PLAN-001", intoTicket: "TICK-001", doc: "plan" }]);
    expect(dry.convertedToTickets).toEqual([{ id: "RES-001", label: "legacy-research" }]);
    expect(dry.areaPrefixes).toEqual({ api: "API" });
    // Dry run touched nothing.
    expect(await v1store.detectFormat()).toBe(1);
    expect(
      await fs.access(path.join(v1root, ".kanmer", "tickets", "TICK-001.md")).then(() => true),
    ).toBe(true);

    const bodyBefore = (await v1store.getItem("TICK-001"))?.body;
    const report = await migrateToV2(v1store);
    expect(report.alreadyV2).toBe(false);
    expect(await v1store.detectFormat()).toBe(2);

    const ticketFile = path.join(v1root, ".kanmer", "areas", "api", "TICK-001", "TICK-001.md");
    expect(await fs.access(ticketFile).then(() => true)).toBe(true);
    expect((await v1store.getItem("TICK-001"))?.body).toBe(bodyBefore);
    const planDoc = await v1store.getDoc("TICK-001", "plan");
    expect(planDoc).toContain("# Legacy plan");
    expect(planDoc).toContain("Plan body for [[TICK-001]].");
    // PLAN-001 is now a document, not an item — nothing may still link to it.
    expect((await v1store.getItem("TICK-001"))?.links).not.toContain("PLAN-001");

    const orphan = await v1store.getItem("RES-001");
    expect(orphan?.type).toBe("ticket");
    expect(orphan?.labels).toContain("legacy-research");

    const version = JSON.parse(
      await fs.readFile(path.join(v1root, ".kanmer", "version.json"), "utf8"),
    );
    expect(version).toMatchObject({ format: 2, migratedFrom: 1 });

    const board = await v1store.getBoard();
    expect(board.areas.find((a) => a.id === "api")?.prefix).toBe("API");

    // Legacy dirs are gone; re-run is a no-op.
    expect(
      await fs.access(path.join(v1root, ".kanmer", "tickets")).then(
        () => true,
        () => false,
      ),
    ).toBe(false);
    const again = await migrateToV2(v1store);
    expect(again.alreadyV2).toBe(true);
  });

  it("a second store instance sees the new format after another instance migrates", async () => {
    // Two processes, one board: the GUI migrates while a long-lived MCP
    // server holds its own store. resetFormatCache() cannot reach across.
    const a = new KanmerStore(v1root);
    const b = new KanmerStore(v1root);
    expect(await a.detectFormat()).toBe(1); // a caches 1
    await migrateToV2(b);
    expect(await a.detectFormat()).toBe(2);
  });

  it("does not re-issue an id that already exists in the other layout", async () => {
    await migrateToV2(v1store);
    const before = (await v1store.listItems({ includeArchived: true })).map((i) => i.id);
    expect(before).toContain("TICK-001");
    // Force the v1 allocation path by hand, as a stale format cache would.
    await fs.mkdir(path.join(v1root, ".kanmer", "tickets"), { recursive: true });
    await fs.writeFile(
      path.join(v1root, ".kanmer", "version.json"),
      JSON.stringify({ format: 1 }),
      "utf8",
    );
    const fresh = new KanmerStore(v1root);
    expect(await fresh.detectFormat()).toBe(1);
    const created = await fresh.createItem({ type: "ticket", title: "New" });
    expect(before).not.toContain(created.id);
  });
});
