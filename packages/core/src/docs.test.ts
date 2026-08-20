import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { KanmerStore } from "./store.js";
import { migrateBoard } from "./migrate.js";
import { repoDocKindOf } from "./docs.js";
import { boundaryThreshold, stageIndex, STAGE_IDS } from "./stages.js";
import { parseRequirement, validateProfileMap, QUESTIONS_RESOLVED } from "./profiles.js";
import { countCheckboxes, PARKED_HEADING_RE } from "./docpaths.js";

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

/** A ticket with a given profile, in Backlog. */
async function ticket(profile: string, extra: Record<string, unknown> = {}): Promise<string> {
  const t = await store.createItem({ type: "ticket", title: profile, profile, ...extra });
  return t.id;
}

describe("stage constants", () => {
  it("are the fixed six, in order", () => {
    expect([...STAGE_IDS]).toEqual([
      "backlog",
      "preparing",
      "implementing",
      "review",
      "verifying",
      "done",
    ]);
  });

  it("boundary thresholds put leave-X one past X and enter-Y at Y", () => {
    expect(boundaryThreshold("leave-backlog")).toBe(stageIndex("backlog") + 1);
    expect(boundaryThreshold("enter-done")).toBe(stageIndex("done"));
  });

  it("rejects a status that is not one of the six", async () => {
    await expect(
      store.createItem({ type: "ticket", title: "A", status: "researching" }),
    ).rejects.toThrow(/Unknown stage "researching"/);
  });
});

describe("requirement grammar", () => {
  it("parses type, proof flavour, environment and named document", () => {
    expect(parseRequirement("plan")).toMatchObject({ type: "plan" });
    expect(parseRequirement("proof:visual")).toMatchObject({ type: "proof", proofType: "visual" });
    expect(parseRequirement("proof:visual@staging")).toMatchObject({
      type: "proof",
      proofType: "visual",
      env: "staging",
    });
    expect(parseRequirement("research/auth")).toMatchObject({ type: "research", named: "auth" });
  });

  it("rejects unknown boundaries, types, proof flavours and environments", () => {
    const opts = { proofTypes: ["visual"], environments: ["staging"] };
    expect(validateProfileMap({ "leave-mars": ["plan"] } as never, opts)[0]).toMatch(
      /unknown boundary/,
    );
    expect(validateProfileMap({ "enter-done": ["reserch"] }, opts)[0]).toMatch(
      /unknown document type/,
    );
    expect(validateProfileMap({ "enter-done": ["proof:movie"] }, opts)[0]).toMatch(
      /unknown proof type/,
    );
    expect(validateProfileMap({ "enter-done": ["proof:visual@moon"] }, opts)[0]).toMatch(
      /unknown environment/,
    );
    expect(validateProfileMap({ "enter-done": ["proof"] }, opts)).toEqual([]);
    // The second pseudo-type must validate like the first, or a board carrying
    // the shipped profiles fails to load (ADR-0011).
    expect(validateProfileMap({ "enter-done": [QUESTIONS_RESOLVED] }, opts)).toEqual([]);
  });
});

describe("the shipped profile gate matrix", () => {
  // FRD-002 acceptance 1: a chore jumps Backlog -> Implementing in one call
  // with only plan/ populated, then is held at Done until proof exists.
  it("chore: one jump to Implementing on plan alone, then blocked entering Done", async () => {
    const id = await ticket("chore");
    await expect(store.moveItem(id, { status: "implementing" })).rejects.toThrow(
      /leaving Preparing requires plan/,
    );
    await store.setDoc(id, "plan", "# Plan");
    expect((await store.moveItem(id, { status: "implementing" })).status).toBe("implementing");

    await expect(store.moveItem(id, { status: "done" })).rejects.toThrow(
      /entering Done requires proof/,
    );
    await store.setDoc(id, "proof", "# Proof");
    expect((await store.moveItem(id, { status: "done" })).status).toBe("done");
  });

  // FRD-002 acceptance 2: research IS the deliverable for a spike.
  it("spike: Backlog straight to Done on research alone", async () => {
    const id = await ticket("spike");
    await expect(store.moveItem(id, { status: "done" })).rejects.toThrow(
      /entering Done requires research/,
    );
    await store.setDoc(id, "research", "# Findings");
    expect((await store.moveItem(id, { status: "done" })).status).toBe("done");
  });

  // FRD-002 acceptance 3.
  it("feature: cannot leave Backlog without a governing doc", async () => {
    const id = await ticket("feature");
    await expect(store.moveItem(id, { status: "preparing" })).rejects.toThrow(
      /leaving Backlog requires governing-doc/,
    );
    await store.updateItem(id, { docs_todo: true });
    expect((await store.moveItem(id, { status: "preparing" })).status).toBe("preparing");
  });

  it("feature: leaving Preparing needs all four documents", async () => {
    const id = await ticket("feature", { docs_todo: true });
    await store.moveItem(id, { status: "preparing" });
    await store.setDoc(id, "research", "r");
    await store.setDoc(id, "files", "f");
    await store.setDoc(id, "plan", "p");
    await expect(store.moveItem(id, { status: "implementing" })).rejects.toThrow(/checklist/);
    await store.setDoc(id, "checklist", "- [ ] a");
    expect((await store.moveItem(id, { status: "implementing" })).status).toBe("implementing");
  });

  // FRD-002 G2: a multi-stage jump is checked against every boundary it
  // crosses and stopped by the first unmet one — not just the next step.
  it("a multi-stage jump is blocked by the FIRST unmet boundary", async () => {
    const id = await ticket("feature");
    await expect(store.moveItem(id, { status: "done" })).rejects.toThrow(/leaving Backlog/);
  });

  // FRD-002 acceptance 5.
  it("changing profile re-gates instantly", async () => {
    const id = await ticket("feature");
    await expect(store.moveItem(id, { status: "preparing" })).rejects.toThrow(/governing-doc/);
    await store.updateItem(id, { profile: "chore" });
    expect((await store.moveItem(id, { status: "preparing" })).status).toBe("preparing");
  });

  // FRD-002 acceptance 4.
  it("custom: a named document is not satisfied by a different one", async () => {
    const id = await ticket("custom", { requires: { "enter-done": ["research/auth"] } });
    await store.setDoc(id, "research/db.md", "# DB");
    await expect(store.moveItem(id, { status: "done" })).rejects.toThrow(/research\/auth/);
    await store.setDoc(id, "research/auth.md", "# Auth");
    expect((await store.moveItem(id, { status: "done" })).status).toBe("done");
  });

  it("custom with an empty map crosses everything freely (historical backfill)", async () => {
    const id = await ticket("custom", { requires: {} });
    expect((await store.moveItem(id, { status: "done" })).status).toBe("done");
  });

  it("rejects an unknown profile", async () => {
    await expect(
      store.createItem({ type: "ticket", title: "A", profile: "wishful" }),
    ).rejects.toThrow(/Unknown profile "wishful"/);
  });

  // FRD-002 P6: ticket > area default > board default.
  it("resolves the profile from the area default, and an explicit ticket profile wins", async () => {
    const board = await store.getBoard();
    await store.setBoard({
      ...board,
      areas: [{ id: "ui", name: "UI", prefix: "UI", defaultProfile: "spike" } as never],
    });
    const inherited = await store.createItem({ type: "ticket", title: "A", area: "ui" });
    expect((await store.getDocGates(inherited.id))!.profile).toBe("spike");

    const explicit = await store.createItem({
      type: "ticket",
      title: "B",
      area: "ui",
      profile: "chore",
    });
    expect((await store.getDocGates(explicit.id))!.profile).toBe("chore");
  });
});

describe("creation is ungated (FRD-002 G3)", () => {
  it("a ticket may be created directly in any stage, including Done", async () => {
    for (const status of STAGE_IDS) {
      const t = await store.createItem({ type: "ticket", title: status, status, profile: "feature" });
      expect(t.status).toBe(status);
    }
  });
});

describe("folder documents (FRD-003)", () => {
  it("round-trips a nested path and satisfies the type's requirement alone", async () => {
    const id = await ticket("spike");
    await store.setDoc(id, "research/azure/tokens.md", "# Tokens");
    expect(await store.getDoc(id, "research/azure/tokens.md")).toBe("# Tokens\n");
    expect((await store.moveItem(id, { status: "done" })).status).toBe("done");
  });

  it("creating a ticket writes exactly one file — folders are lazy", async () => {
    const t = await store.createItem({ type: "ticket", title: "chore", profile: "chore" });
    const dir = path.join(root, ".kanmer", "areas", "_none", t.id);
    expect(await fs.readdir(dir)).toEqual([`${t.id}.md`]);
  });

  it("reference, scratch and assets never satisfy a gate", async () => {
    const id = await ticket("spike");
    await store.setDoc(id, "reference/mockup.md", "x");
    await store.setDoc(id, "scratch/notes.md", "x");
    await store.setDoc(id, "assets/thing.md", "x");
    await expect(store.moveItem(id, { status: "done" })).rejects.toThrow(/requires research/);
  });

  it("rejects an unknown top-level folder, naming the valid ones", async () => {
    const id = await ticket("chore");
    await expect(store.setDoc(id, "reserch/x.md", "x")).rejects.toThrow(
      /Unknown document folder "reserch"/,
    );
  });

  it("rejects traversal out of the ticket folder", async () => {
    const id = await ticket("chore");
    await expect(store.setDoc(id, "../../escape.md", "x")).rejects.toThrow(/Invalid segment/);
  });

  it("batch reads validate paths before reading and retain requested order", async () => {
    const id = await ticket("chore");
    await store.setDoc(id, "plan", "# Plan");
    const [plan, missing, repeated] = await store.getDocsWithVersions(id, ["plan", "files", "plan"]);
    expect(plan).toMatchObject({ doc: "plan", exists: true, content: "# Plan\n" });
    expect(typeof plan.version).toBe("string");
    expect(missing).toEqual({ doc: "files", exists: false, content: null, version: null });
    expect(repeated).toMatchObject({ doc: "plan", exists: true, content: "# Plan\n" });
    await expect(store.getDocsWithVersions(id, ["plan", "../../escape"])).rejects.toThrow(/Invalid segment/);
  });

  it("counts documents per type, lists readable document paths, and enumerates reference files", async () => {
    const id = await ticket("feature", { docs_todo: true });
    await store.setDoc(id, "research/a.md", "a");
    await store.setDoc(id, "research/deep/b.md", "b");
    await store.setDoc(id, "reference/spec.md", "s");
    const info = (await store.getTicketDocsInfo(id))!;
    expect(info.counts.research).toBe(2);
    expect(info.documentPaths).toEqual([
      "reference/spec.md",
      "research/a.md",
      "research/deep/b.md",
    ]);
    expect(info.references.map((r) => r.name)).toEqual(["spec.md"]);
  });

  it("reports sorted scratch slugs without treating them as gate documents", async () => {
    const id = await ticket("spike");
    await store.setDoc(id, "scratch/zebra.md", "z");
    await store.setDoc(id, "scratch/alpha.md", "a");
    const before = await fs.readFile(path.join(root, ".kanmer", "data", "activity.jsonl"), "utf8");

    expect((await store.getTicketDocsInfo(id))?.scratch).toEqual(["alpha", "zebra"]);
    await expect(store.moveItem(id, { status: "done" })).rejects.toThrow(/requires research/);
    expect(await fs.readFile(path.join(root, ".kanmer", "data", "activity.jsonl"), "utf8")).toBe(before);
  });

  it("checklist progress sums across every checklist document", async () => {
    const id = await ticket("chore");
    await store.setDoc(id, "checklist/one.md", "- [x] a\n- [ ] b");
    await store.setDoc(id, "checklist/two.md", "- [x] c");
    expect((await store.getTicketDocsInfo(id))!.checklist).toEqual({ checked: 2, total: 3 });
  });
});

describe("typed proof (FRD-006)", () => {
  it("visual proof without an image warns but does not block", async () => {
    const board = await store.getBoard();
    await store.setBoard({
      ...board,
      profiles: { ...board.profiles, chore: { "enter-done": ["proof:visual"] } },
    });
    const id = await ticket("chore");
    await store.setDoc(id, "proof/after.md", "no picture here");

    const gates = (await store.getDocGates(id))!;
    expect(gates.warnings.join(" ")).toMatch(/expects a screenshot/);
    // Soft, not hard: the move still succeeds.
    expect((await store.moveItem(id, { status: "done" })).status).toBe("done");
  });

  it("an image under proof/ clears the warning", async () => {
    const board = await store.getBoard();
    await store.setBoard({
      ...board,
      profiles: { ...board.profiles, chore: { "enter-done": ["proof:visual"] } },
    });
    const id = await ticket("chore");
    await store.setDoc(id, "proof/after.md", "![shot](assets/a.png)");
    await fs.mkdir(path.join(root, ".kanmer", "areas", "_none", id, "proof", "assets"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(root, ".kanmer", "areas", "_none", id, "proof", "assets", "a.png"),
      "png",
    );
    expect((await store.getDocGates(id))!.warnings).toEqual([]);
  });

  it("rejects a proof environment the board does not declare", async () => {
    await expect(
      store.createItem({
        type: "ticket",
        title: "A",
        profile: "custom",
        requires: { "enter-done": ["proof:visual@staging"] },
      }),
    ).rejects.toThrow(/environment/);
  });
});

describe("priority removal (FRD-008)", () => {
  it("is neither written nor accepted, and a legacy value rides along untouched", async () => {
    const t = await store.createItem({ type: "ticket", title: "A" });
    const file = path.join(root, ".kanmer", "areas", "_none", t.id, `${t.id}.md`);
    expect(await fs.readFile(file, "utf8")).not.toContain("priority:");

    // Passthrough: a hand-added key survives an agent edit (the `due` precedent).
    const raw = await fs.readFile(file, "utf8");
    await fs.writeFile(file, raw.replace("status:", "priority: high\nstatus:"));
    const after = await store.updateItem(t.id, { title: "B" });
    expect((after as unknown as Record<string, unknown>).priority).toBe("high");
  });
});

describe("repo-doc refs", () => {
  it("rejects a nonexistent or traversing ref; accepts a valid one", async () => {
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
  });

  it("a linked governing doc satisfies the backlog gate without docs_todo", async () => {
    await fs.mkdir(path.join(root, "docs", "adr"), { recursive: true });
    await fs.writeFile(path.join(root, "docs", "adr", "0001.md"), "# ADR", "utf8");
    const t = await store.createItem({
      type: "ticket",
      title: "A",
      profile: "feature",
      refs: ["docs/adr/0001.md"],
    });
    expect((await store.moveItem(t.id, { status: "preparing" })).status).toBe("preparing");
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
      expect(boardStore.paths.repoRoot).toBe(path.resolve(root));

      const t = await boardStore.createItem({
        type: "ticket",
        title: "A",
        profile: "feature",
        refs: ["docs/frd/FRD-001.md"],
      });
      expect(t.refs).toEqual(["docs/frd/FRD-001.md"]);
      expect((await boardStore.moveItem(t.id, { status: "preparing" })).status).toBe("preparing");
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
      expect(new KanmerStore(root).paths.repoRoot).toBe(path.resolve(root));
    });
  });
});

describe("per-ticket scratch", () => {
  it("appends below a blank line, never satisfies a gate, and reads back", async () => {
    const id = await ticket("spike");
    await store.appendScratch(id, "research", "first note");
    await store.appendScratch(id, "research", "second note");
    expect(await store.getScratch(id, "research")).toBe("first note\n\nsecond note\n");
    expect(await store.listScratch(id)).toEqual(["research"]);
    // Scratch under a research slug must not be mistaken for research evidence.
    await expect(store.moveItem(id, { status: "done" })).rejects.toThrow(/requires research/);
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

describe("migrateBoard on a current board", () => {
  it("is a no-op", async () => {
    const { v3 } = await migrateBoard(store, { dryRun: true });
    expect(v3.alreadyV3).toBe(true);
  });
});

describe("questions-resolved, end to end (ADR-0011)", () => {
  async function ticketWith(questions: string): Promise<string> {
    const item = await store.createItem({
      type: "ticket",
      title: "Has questions",
      profile: "chore",
      status: "preparing",
    });
    await store.setDoc(item.id, "plan", "The plan.");
    if (questions) await store.setDoc(item.id, "open-questions", questions);
    return item.id;
  }

  async function open(id: string): Promise<number> {
    const { checked, total } = await countCheckboxes(
      path.join(root, ".kanmer", "areas", "general", id),
      "open-questions",
      { stopAtParked: true },
    );
    return total - checked;
  }

  it("refuses to leave Preparing while a question is unticked", async () => {
    const id = await ticketWith("- [ ] **Which way?** — needs deciding.\n");
    await expect(store.moveItem(id, { status: "implementing" })).rejects.toThrow(
      /questions-resolved/,
    );
  });

  it("says what to do, not just that something is missing", async () => {
    const id = await ticketWith("- [ ] Unanswered.\n");
    await expect(store.moveItem(id, { status: "implementing" })).rejects.toThrow(
      /Parked \(explicitly deferred\)/,
    );
  });

  it("clears once the box is ticked", async () => {
    const id = await ticketWith("- [ ] Unanswered.\n");
    await store.setDoc(id, "open-questions", "- [x] Answered — we chose B.\n");
    await expect(store.moveItem(id, { status: "implementing" })).resolves.toBeTruthy();
  });

  it("clears when the question is parked with a reason instead", async () => {
    // The honest exit: parking is not the same as pretending it was answered.
    const id = await ticketWith(
      "- [x] Decided.\n\n## Parked (explicitly deferred)\n\n- [ ] Later — safe to defer because X.\n",
    );
    await expect(store.moveItem(id, { status: "implementing" })).resolves.toBeTruthy();
  });

  it("never blocks a ticket that raised no questions at all", async () => {
    const id = await ticketWith("");
    await expect(store.moveItem(id, { status: "implementing" })).resolves.toBeTruthy();
  });

  it("blocks entering Done too, so nothing closes on an open question", async () => {
    const id = await ticketWith("- [x] Settled.\n");
    await store.moveItem(id, { status: "implementing" });
    await store.setDoc(id, "proof", "Evidence.");
    await store.setDoc(id, "open-questions", "- [ ] Reopened during review.\n");
    await store.moveItem(id, { status: "review" });
    await store.moveItem(id, { status: "verifying" });
    await expect(store.moveItem(id, { status: "done" })).rejects.toThrow(/questions-resolved/);
  });
});

describe("countCheckboxes", () => {
  /** The ticket's folder, found rather than guessed — the area is board-defined. */
  async function dirOf(id: string): Promise<string> {
    const areas = path.join(root, ".kanmer", "areas");
    for (const area of await fs.readdir(areas)) {
      const candidate = path.join(areas, area, id);
      try {
        await fs.stat(candidate);
        return candidate;
      } catch {
        /* not this area */
      }
    }
    throw new Error(`no folder for ${id}`);
  }

  async function write(id: string, body: string): Promise<string> {
    await store.setDoc(id, "open-questions", body);
    return dirOf(id);
  }

  let id: string;
  beforeEach(async () => {
    id = (await store.createItem({ type: "ticket", title: "Counting" })).id;
  });

  it("counts ticked and unticked, in both cases and both bullet styles", async () => {
    const dir = await write(id, "- [ ] a\n- [x] b\n* [X] c\n- [ ] d\n");
    expect(await countCheckboxes(dir, "open-questions")).toEqual({ checked: 2, total: 4 });
  });

  it("stops at the parked heading when asked to", async () => {
    const dir = await write(id, "- [ ] open\n\n## Parked (explicitly deferred)\n- [ ] parked\n- [ ] also parked\n");
    expect(await countCheckboxes(dir, "open-questions", { stopAtParked: true })).toEqual({
      checked: 0,
      total: 1,
    });
    // Without the flag it is a plain count — the checklist caller's behaviour.
    expect(await countCheckboxes(dir, "open-questions")).toEqual({ checked: 0, total: 3 });
  });

  it("matches the exact heading the template ships, and nothing looser", async () => {
    // ADR-0011 consequence: `## Parked` is load-bearing. Renaming it in the
    // template must fail here rather than silently changing what the gate counts.
    expect(PARKED_HEADING_RE.test("## Parked (explicitly deferred)")).toBe(true);
    expect(PARKED_HEADING_RE.test("## parked")).toBe(true);
    expect(PARKED_HEADING_RE.test("### Parked")).toBe(true);
    expect(PARKED_HEADING_RE.test("## Parking")).toBe(false);
    expect(PARKED_HEADING_RE.test("Parked")).toBe(false);
    expect(PARKED_HEADING_RE.test("- [ ] Parked?")).toBe(false);
  });

  it("sums across several documents of the type", async () => {
    await store.setDoc(id, "open-questions", "- [ ] one\n");
    await store.setDoc(id, "open-questions/second.md", "- [ ] two\n- [x] three\n");
    expect(await countCheckboxes(await dirOf(id), "open-questions")).toEqual({
      checked: 1,
      total: 3,
    });
  });

  it("returns zeroes for prose without boxes, and for no document at all", async () => {
    const dir = await write(id, "Some prose. Nothing to decide.\n");
    expect(await countCheckboxes(dir, "open-questions")).toEqual({ checked: 0, total: 0 });
    expect(await countCheckboxes(dir, "research")).toEqual({ checked: 0, total: 0 });
  });
});
