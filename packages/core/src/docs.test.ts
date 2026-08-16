import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { KanmerStore } from "./store.js";
import { backfillStages, migrateBoard } from "./migrate.js";
import { DEFAULT_GATES, evaluateGates, repoDocKindOf, resolveDocTypes } from "./docs.js";
import { BoardConfigSchema, type DocType } from "./types.js";

let root: string;
let store: KanmerStore;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-docs-"));
  store = new KanmerStore(root);
  await store.init();
});

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

const STAGES = ["backlog", "researching", "planning", "implementing", "review", "verifying", "done"];

/** Satisfy the backlog gate so a ticket may leave backlog. */
async function withDocsTodo(title: string, status = "backlog"): Promise<string> {
  const t = await store.createItem({ type: "ticket", title, status, docs_todo: true });
  return t.id;
}

describe("gate engine (pure)", () => {
  const ctx = (from: string, to: string, docs: string[] = [], repo = false) => ({
    statuses: STAGES,
    from,
    to,
    hasDoc: (d: string) => docs.includes(d),
    repoDocSatisfied: () => repo,
  });

  it("fires a leave gate as the stage is left, an enter gate as it is entered", () => {
    // proof before entering done
    expect(evaluateGates(DEFAULT_GATES, ctx("verifying", "done", [], true))).not.toEqual([]);
    expect(evaluateGates(DEFAULT_GATES, ctx("verifying", "done", ["proof"], true))).toEqual([]);
    // research+impact before leaving researching
    const leaveResearching = evaluateGates(DEFAULT_GATES, ctx("researching", "planning", [], true));
    expect(leaveResearching.map((v) => v.gate.needs).sort()).toEqual(["impact", "research"]);
  });

  it("a multi-stage jump cannot skip a gate", () => {
    const violations = evaluateGates(DEFAULT_GATES, ctx("backlog", "done", [], true));
    // Every needs-gate between backlog and done fires at once.
    const needed = violations.map((v) => v.gate.needs).filter(Boolean).sort();
    expect(needed).toEqual([
      "checklist",
      "impact",
      "plan",
      "post-implementation-report",
      "proof",
      "research",
    ]);
  });

  it("a gate whose boundary stage is absent on the board is inert", () => {
    const custom = ["todo", "doing", "done"]; // no researching/review
    const v = evaluateGates(DEFAULT_GATES, {
      statuses: custom,
      from: "todo",
      to: "done",
      hasDoc: () => false,
      repoDocSatisfied: () => true,
    });
    // Only the done-enter (proof) gate has a boundary present here.
    expect(v.map((x) => x.gate.needs)).toEqual(["proof"]);
  });

  it("backlog leave is satisfied by docs_todo (repoDocSatisfied)", () => {
    expect(evaluateGates(DEFAULT_GATES, ctx("backlog", "researching", [], false)).length).toBe(1);
    expect(evaluateGates(DEFAULT_GATES, ctx("backlog", "researching", [], true))).toEqual([]);
  });
});

describe("store-level document gates", () => {
  it("cannot leave backlog without a governing doc — unless docs_todo", async () => {
    const t = await store.createItem({ type: "ticket", title: "A" });
    await expect(store.moveItem(t.id, { status: "researching" })).rejects.toThrow(/governing/i);
    await store.updateItem(t.id, { docs_todo: true });
    const moved = await store.moveItem(t.id, { status: "researching" });
    expect(moved.status).toBe("researching");
  });

  it("cannot leave researching without research + impact", async () => {
    const id = await withDocsTodo("A", "researching");
    await expect(store.moveItem(id, { status: "planning" })).rejects.toThrow(/research\.md is missing/);
    await store.setDoc(id, "research", "r");
    await store.setDoc(id, "impact", "i");
    expect((await store.moveItem(id, { status: "planning" })).status).toBe("planning");
  });

  it("cannot leave planning without plan + checklist", async () => {
    const id = await withDocsTodo("A", "planning");
    await store.setDoc(id, "research", "r");
    await store.setDoc(id, "impact", "i");
    await expect(store.moveItem(id, { status: "implementing" })).rejects.toThrow(/plan\.md is missing/);
    await store.setDoc(id, "plan", "p");
    await store.setDoc(id, "checklist", "- [ ] a");
    expect((await store.moveItem(id, { status: "implementing" })).status).toBe("implementing");
  });

  it("cannot enter review without post-implementation-report; cannot enter done without proof", async () => {
    const id = await withDocsTodo("A", "implementing");
    await expect(store.moveItem(id, { status: "review" })).rejects.toThrow(
      /post-implementation-report\.md is missing/,
    );
    await store.setDoc(id, "post-implementation-report", "pir");
    expect((await store.moveItem(id, { status: "review" })).status).toBe("review");
    await store.moveItem(id, { status: "verifying" });
    await expect(store.moveItem(id, { status: "done" })).rejects.toThrow(/proof\.md is missing/);
    await store.setDoc(id, "proof", "evidence");
    expect((await store.moveItem(id, { status: "done" })).status).toBe("done");
  });

  it("re-resolves gates and doc set against the new area after an area change", async () => {
    // A 'bugs' area with a single-doc set and no gates: moving there frees the pipeline.
    const board = await store.getBoard();
    await store.setBoard({
      ...board,
      areas: [...board.areas, { id: "bugs", name: "Bugs", prefix: "BUG" }],
      docs: {
        areas: {
          bugs: { types: [{ id: "repro", name: "Repro" }], gates: [] },
        },
      },
    });
    const t = await store.createItem({ type: "ticket", title: "A", area: "bugs" });
    // No gates in the bugs area — a full jump is allowed, and only repro is a valid doc.
    expect((await store.moveItem(t.id, { status: "done" })).status).toBe("done");
    await expect(store.setDoc(t.id, "research", "r")).rejects.toThrow(/Unknown document "research"/);
    await expect(store.setDoc(t.id, "repro", "steps")).resolves.toBeDefined();
    const info = await store.getTicketDocsInfo(t.id);
    expect(Object.keys(info!.docs)).toEqual(["repro"]);
  });
});

describe("dynamic doc names + requires hierarchy", () => {
  it("setDoc rejects an unknown doc id, listing the valid ones", async () => {
    const t = await store.createItem({ type: "ticket", title: "A" });
    await expect(store.setDoc(t.id, "nope", "x")).rejects.toThrow(
      /Unknown document "nope".*research/s,
    );
  });

  it("setDoc enforces requires: plan needs research + impact first", async () => {
    const t = await store.createItem({ type: "ticket", title: "A" });
    await expect(store.setDoc(t.id, "plan", "p")).rejects.toThrow(/requires research/);
    await store.setDoc(t.id, "research", "r");
    await expect(store.setDoc(t.id, "plan", "p")).rejects.toThrow(/requires impact/);
    await store.setDoc(t.id, "impact", "i");
    await expect(store.setDoc(t.id, "plan", "p")).resolves.toBeDefined();
  });

  it("rejects a requires cycle and an unknown-id reference at config parse", async () => {
    const cyclic = BoardConfigSchema.safeParse({
      statuses: [{ id: "a", name: "A" }],
      areas: [],
      priorities: [{ id: "medium", name: "Medium" }],
      idPrefixes: { ticket: "TICK", plan: "PLAN", research: "RES" },
      docs: {
        default: {
          types: [
            { id: "a", name: "A", requires: ["b"] },
            { id: "b", name: "B", requires: ["a"] },
          ],
        },
      },
    });
    expect(cyclic.success).toBe(false);

    const unknown = BoardConfigSchema.safeParse({
      statuses: [{ id: "a", name: "A" }],
      areas: [],
      priorities: [{ id: "medium", name: "Medium" }],
      idPrefixes: { ticket: "TICK", plan: "PLAN", research: "RES" },
      docs: { default: { types: [{ id: "a", name: "A", requires: ["ghost"] }] } },
    });
    expect(unknown.success).toBe(false);
  });

  it("rejects a doc-type id that starts with the reserved scratch- prefix", async () => {
    const parsed = BoardConfigSchema.safeParse({
      statuses: [{ id: "a", name: "A" }],
      areas: [],
      priorities: [{ id: "medium", name: "Medium" }],
      idPrefixes: { ticket: "TICK", plan: "PLAN", research: "RES" },
      docs: { default: { types: [{ id: "scratch-notes", name: "Notes" }] } },
    });
    expect(parsed.success).toBe(false);
  });

  it("resolveDocTypes falls back to the default set when the board omits docs", async () => {
    const board = await store.getBoard();
    const types: DocType[] = resolveDocTypes(board, "");
    expect(types.map((t) => t.id)).toContain("post-implementation-report");
  });
});

describe("repo-doc refs", () => {
  it("rejects a nonexistent or traversing ref; accepts a valid one; omits an empty refs key", async () => {
    await expect(
      store.createItem({ type: "ticket", title: "A", refs: ["docs/prd/ghost.md"] }),
    ).rejects.toThrow(/does not exist/);
    await expect(
      store.createItem({ type: "ticket", title: "A", refs: ["../escape.md"] }),
    ).rejects.toThrow(/escapes the project root/);

    await fs.mkdir(path.join(root, "docs", "prd"), { recursive: true });
    await fs.writeFile(path.join(root, "docs", "prd", "checkout.md"), "# PRD", "utf8");
    const t = await store.createItem({
      type: "ticket",
      title: "A",
      refs: ["docs/prd/checkout.md"],
    });
    expect(t.refs).toEqual(["docs/prd/checkout.md"]);

    const plain = await store.createItem({ type: "ticket", title: "B" });
    const raw = await fs.readFile(
      path.join(root, ".kanmer", "areas", "_none", plain.id, `${plain.id}.md`),
      "utf8",
    );
    expect(raw).not.toContain("refs:");
  });

  it("a linked governing doc satisfies the backlog gate without docs_todo", async () => {
    await fs.mkdir(path.join(root, "docs", "adr"), { recursive: true });
    await fs.writeFile(path.join(root, "docs", "adr", "0001.md"), "# ADR", "utf8");
    const t = await store.createItem({ type: "ticket", title: "A", refs: ["docs/adr/0001.md"] });
    expect((await store.moveItem(t.id, { status: "researching" })).status).toBe("researching");
  });

  it("repoDocKindOf classifies by the configured globs", async () => {
    const board = await store.getBoard();
    expect(repoDocKindOf(board, "docs/prd/x.md")).toBe("prd");
    expect(repoDocKindOf(board, "docs\\adr\\y.md")).toBe("adr");
    expect(repoDocKindOf(board, "src/index.ts")).toBeNull();
  });

  // The board can live on its own branch at <repo>/.worktrees/<name>, while the
  // governing docs stay in the source checkout. refs must resolve against the
  // repo, not the board — otherwise the leave-backlog gate is unsatisfiable on
  // every board-worktree project, which is the shipped model.
  describe("board in a worktree: refs resolve against the repo root", () => {
    it("accepts a ref that exists in the repo but not under the board root", async () => {
      const boardRoot = path.join(root, ".worktrees", "kanmer");
      await fs.mkdir(boardRoot, { recursive: true });
      await fs.mkdir(path.join(root, "docs", "frd"), { recursive: true });
      await fs.writeFile(path.join(root, "docs", "frd", "FRD-001.md"), "# FRD", "utf8");

      const boardStore = new KanmerStore(boardRoot);
      await boardStore.init();

      // Derived from the .worktrees/<name> shape, so an already-registered
      // server keeps working without being reconnected.
      expect(boardStore.paths.repoRoot).toBe(path.resolve(root));

      const t = await boardStore.createItem({
        type: "ticket",
        title: "A",
        refs: ["docs/frd/FRD-001.md"],
      });
      expect(t.refs).toEqual(["docs/frd/FRD-001.md"]);
      // ...and the governing-doc gate it exists to satisfy actually opens.
      expect((await boardStore.moveItem(t.id, { status: "researching" })).status).toBe("researching");
    });

    it("honours an explicit repoRoot and still rejects a ghost ref", async () => {
      const boardRoot = path.join(root, "elsewhere", "board");
      await fs.mkdir(boardRoot, { recursive: true });
      const boardStore = new KanmerStore(boardRoot, { repoRoot: root });
      await boardStore.init();

      expect(boardStore.paths.repoRoot).toBe(path.resolve(root));
      await expect(
        boardStore.createItem({ type: "ticket", title: "A", refs: ["docs/frd/ghost.md"] }),
      ).rejects.toThrow(/does not exist/);
    });

    it("falls back to the project root when the board is colocated", () => {
      const colocated = new KanmerStore(root);
      expect(colocated.paths.repoRoot).toBe(path.resolve(root));
    });
  });
});

describe("per-ticket scratch", () => {
  it("appends scratch below a blank line, keeps it out of the pipeline docs, reads it back", async () => {
    const t = await store.createItem({ type: "ticket", title: "A" });
    await store.appendScratch(t.id, "research", "first note");
    await store.appendScratch(t.id, "research", "second note");
    const back = await store.getScratch(t.id, "research");
    expect(back).toBe("first note\n\nsecond note\n");
    // Not reported as a pipeline doc, and listable as scratch.
    const info = await store.getTicketDocsInfo(t.id);
    expect(Object.keys(info!.docs)).not.toContain("scratch-research");
    expect(await store.listScratch(t.id)).toEqual(["research"]);
    // Readable through getDoc with the scratch- prefix too.
    expect(await store.getDoc(t.id, "scratch-research")).toBe("first note\n\nsecond note\n");
  });
});

describe("traceability: commits / prs / deployment", () => {
  it("commits and prs round-trip and omit when empty", async () => {
    const t = await store.createItem({
      type: "ticket",
      title: "A",
      commits: ["abc123"],
      prs: ["#42"],
    });
    expect(t.commits).toEqual(["abc123"]);
    expect(t.prs).toEqual(["#42"]);
    const plain = await store.createItem({ type: "ticket", title: "B" });
    const raw = await fs.readFile(
      path.join(root, ".kanmer", "areas", "_none", plain.id, `${plain.id}.md`),
      "utf8",
    );
    expect(raw).not.toContain("commits:");
    expect(raw).not.toContain("prs:");
  });

  it("deployment is rejected without a board block, and validated against it when present", async () => {
    await expect(
      store.createItem({ type: "ticket", title: "A", deployment: "production" }),
    ).rejects.toThrow(/no deployment tracking/);

    const board = await store.getBoard();
    await store.setBoard({ ...board, deployment: { environments: ["staging", "production"] } });
    for (const value of ["n/a", "not-deployed", "staging", "production"]) {
      const t = await store.createItem({ type: "ticket", title: value, deployment: value });
      expect(t.deployment).toBe(value);
    }
    await expect(
      store.createItem({ type: "ticket", title: "bad", deployment: "moon" }),
    ).rejects.toThrow(/Unknown deployment "moon"/);
  });
});

describe("stage backfill", () => {
  /** Build a store on a hand-written board with the given stage ids. */
  async function boardWith(ids: string[]): Promise<KanmerStore> {
    const r = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-bf-"));
    const s = new KanmerStore(r);
    await s.init();
    const board = await s.getBoard();
    await s.setBoard({ ...board, statuses: ids.map((id) => ({ id, name: id })) });
    return s;
  }

  it("inserts missing canonical stages, keeps aliases, never duplicates, is idempotent", async () => {
    const s = await boardWith(["todo", "implementing", "done"]);
    const report = await backfillStages(s);
    expect(report.addedStages.sort()).toEqual(["planning", "researching", "review", "verifying"]);
    const ids = (await s.getBoard()).statuses.map((x) => x.id);
    // todo kept (backlog alias — no second start column); canonical order preserved.
    expect(ids).toEqual([
      "todo",
      "researching",
      "planning",
      "implementing",
      "review",
      "verifying",
      "done",
    ]);
    // Idempotent: a second run adds nothing.
    expect((await backfillStages(s)).addedStages).toEqual([]);
  });

  it("treats doing/shipped as implementing/done aliases — no duplicate final stage", async () => {
    const s = await boardWith(["todo", "doing", "shipped"]);
    await backfillStages(s);
    const ids = (await s.getBoard()).statuses.map((x) => x.id);
    expect(ids.filter((id) => id === "done" || id === "shipped")).toEqual(["shipped"]);
    expect(ids).toContain("researching");
    expect(ids).toContain("review");
  });

  it("a fresh 7-stage board is a no-op; dryRun reports without writing", async () => {
    expect((await backfillStages(store)).addedStages).toEqual([]);
    const s = await boardWith(["todo", "done"]);
    const before = (await s.getBoard()).statuses.map((x) => x.id);
    const dry = await backfillStages(s, { dryRun: true });
    expect(dry.addedStages.length).toBeGreaterThan(0);
    expect((await s.getBoard()).statuses.map((x) => x.id)).toEqual(before);
  });

  it("migrateBoard backfills stages through the umbrella entry point", async () => {
    const s = await boardWith(["todo", "done"]);
    const { backfill } = await migrateBoard(s);
    expect(backfill.addedStages.length).toBeGreaterThan(0);
  });
});
