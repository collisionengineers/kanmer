import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { KanmerStore } from "./store.js";
import { migrateToV2, migrateToV3 } from "./migrate.js";
import { repoDocKindOf } from "./docs.js";

let root: string;
let k: string;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-migrate-"));
  k = path.join(root, ".kanmer");
  await fs.mkdir(path.join(k, "data"), { recursive: true });
});

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

/** Write a board.yml by hand — hand-edited boards are exactly what migration must survive. */
async function writeBoardYml(lines: string[]): Promise<void> {
  await fs.writeFile(path.join(k, "data", "board.yml"), lines.join("\n"), "utf8");
}

function itemFile(frontmatter: string[], body: string): string {
  return ["---", ...frontmatter, "---", body, ""].join("\n");
}

describe("migration: colliding destinations", () => {
  it("refuses to migrate a board whose id prefixes collide, without moving anything", async () => {
    await writeBoardYml([
      "statuses:",
      "  - { id: todo, name: Todo }",
      "  - { id: done, name: Done }",
      "areas: []",
      "priorities:",
      "  - { id: medium, name: Medium }",
      // Two types share one prefix, so a ticket and a plan can both be
      // FOO-001 — and both migrate to areas/_none/FOO-001/FOO-001.md.
      "idPrefixes: { ticket: FOO, plan: FOO, research: RES }",
      "",
    ]);
    await fs.mkdir(path.join(k, "tickets"), { recursive: true });
    await fs.mkdir(path.join(k, "plans"), { recursive: true });
    await fs.writeFile(
      path.join(k, "tickets", "FOO-001.md"),
      itemFile(["id: FOO-001", "type: ticket", "title: Real", "status: todo"], "THE REAL TICKET"),
      "utf8",
    );
    await fs.writeFile(
      path.join(k, "plans", "FOO-001.md"),
      itemFile(["id: FOO-001", "type: plan", "title: Orphan plan", "status: todo"], "Nobody links me."),
      "utf8",
    );
    const store = new KanmerStore(root);

    const dry = await migrateToV2(store, { dryRun: true });
    expect(dry.blockers.length).toBe(1);
    expect(dry.blockers[0]).toMatch(/FOO-001.*would both be written to/s);

    await expect(migrateToV2(store)).rejects.toThrow(/Migration refused/);

    // Nothing moved, nothing was destroyed.
    expect((await store.listItems()).length).toBe(2);
    expect(await fs.readFile(path.join(k, "tickets", "FOO-001.md"), "utf8")).toContain(
      "THE REAL TICKET",
    );
    expect(await store.detectFormat()).toBe(1);
  });
});

describe("migration: folded ids in structured relations", () => {
  it("strips folded ids from blocks[] too", async () => {
    await writeBoardYml([
      "statuses:",
      "  - { id: todo, name: Todo }",
      "  - { id: done, name: Done }",
      "areas: []",
      "priorities:",
      "  - { id: medium, name: Medium }",
      "idPrefixes: { ticket: TICK, plan: PLAN, research: RES }",
      "",
    ]);
    await fs.mkdir(path.join(k, "tickets"), { recursive: true });
    await fs.mkdir(path.join(k, "plans"), { recursive: true });
    await fs.writeFile(
      path.join(k, "tickets", "TICK-001.md"),
      itemFile(
        [
          "id: TICK-001",
          "type: ticket",
          "title: Ticket",
          "status: todo",
          "links: [PLAN-001]",
          "blocks: [PLAN-001]",
        ],
        "Mentions [[PLAN-001]] in prose.",
      ),
      "utf8",
    );
    await fs.writeFile(
      path.join(k, "plans", "PLAN-001.md"),
      itemFile(["id: PLAN-001", "type: plan", "title: The plan", "status: todo"], "Plan body."),
      "utf8",
    );
    const store = new KanmerStore(root);

    const report = await migrateToV2(store);

    const ticket = await store.getItem("TICK-001");
    expect(ticket?.links).not.toContain("PLAN-001");
    expect(ticket?.blocks ?? []).toEqual([]);
    // Bodies are prose: the mention stays, and is reported.
    expect(ticket?.body).toContain("[[PLAN-001]]");
    expect(report.notes.some((n) => n.includes("left as prose"))).toBe(true);
  });
});

describe("migration: resumability", () => {
  /** A board caught mid-migration: TICK-001 already moved, TICK-002 not yet. */
  async function halfMigrated(): Promise<KanmerStore> {
    await writeBoardYml([
      "statuses:",
      "  - { id: todo, name: Todo }",
      "  - { id: done, name: Done }",
      "areas:",
      "  - { id: api, name: API }",
      "priorities:",
      "  - { id: medium, name: Medium }",
      "idPrefixes: { ticket: TICK, plan: PLAN, research: RES }",
      "",
    ]);
    await fs.mkdir(path.join(k, "areas", "api", "TICK-001"), { recursive: true });
    await fs.writeFile(
      path.join(k, "areas", "api", "TICK-001", "TICK-001.md"),
      itemFile(
        ["id: TICK-001", "type: ticket", "title: First", "status: todo", "area: api"],
        "Already moved.",
      ),
      "utf8",
    );
    await fs.mkdir(path.join(k, "tickets"), { recursive: true });
    await fs.writeFile(
      path.join(k, "tickets", "TICK-002.md"),
      itemFile(["id: TICK-002", "type: ticket", "title: Second", "status: todo"], "Still legacy."),
      "utf8",
    );
    // Deliberately no version.json — that is what makes this the trap state.
    return new KanmerStore(root);
  }

  it("resumes a migration interrupted between two ticket renames", async () => {
    const store = await halfMigrated();
    expect(await store.detectFormat()).toBe(1);

    const report = await migrateToV2(store); // must not ENOENT on TICK-001

    const version = JSON.parse(await fs.readFile(path.join(k, "version.json"), "utf8"));
    expect(version.format).toBe(2);
    const ids = (await store.listItems()).map((i) => i.id).sort();
    expect(ids).toEqual(["TICK-001", "TICK-002"]);
    expect(
      await fs.access(path.join(k, "areas", "api", "TICK-001", "TICK-001.md")).then(() => true),
    ).toBe(true);
    expect(
      await fs.access(path.join(k, "areas", "_none", "TICK-002", "TICK-002.md")).then(() => true),
    ).toBe(true);
    expect(report.notes.some((n) => n.includes("resumed a previously interrupted migration"))).toBe(
      true,
    );
  });

  it("does not lose un-migrated tickets when the legacy dir is deleted by hand", async () => {
    // The destructive workaround this test exists to make unnecessary:
    // faced with a migration that ENOENTs forever, a user deletes
    // .kanmer/tickets/ — which throws away every ticket not yet moved.
    // Assert the preventive half: the resumable run finishes the job itself,
    // so the legacy dir is gone *because* it was drained, not emptied.
    const store = await halfMigrated();
    await migrateToV2(store);
    expect(
      await fs.access(path.join(k, "tickets")).then(
        () => true,
        () => false,
      ),
    ).toBe(false);
    expect((await store.listItems()).map((i) => i.id).sort()).toEqual(["TICK-001", "TICK-002"]);
  });

  it("resumes a migration interrupted inside the fold loop without duplicating content", async () => {
    await writeBoardYml([
      "statuses:",
      "  - { id: todo, name: Todo }",
      "  - { id: done, name: Done }",
      "areas:",
      "  - { id: api, name: API }",
      "priorities:",
      "  - { id: medium, name: Medium }",
      "idPrefixes: { ticket: TICK, plan: PLAN, research: RES }",
      "",
    ]);
    const dir = path.join(k, "areas", "api", "TICK-001");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, "TICK-001.md"),
      itemFile(
        [
          "id: TICK-001",
          "type: ticket",
          "title: First",
          "status: todo",
          "area: api",
          "links: [PLAN-001]",
        ],
        "Moved already.",
      ),
      "utf8",
    );
    // plan.md was written, then the run died before removing the legacy file.
    await fs.writeFile(path.join(dir, "plan.md"), "# Legacy plan\n\nPlan body.\n", "utf8");
    await fs.mkdir(path.join(k, "tickets"), { recursive: true });
    await fs.mkdir(path.join(k, "plans"), { recursive: true });
    await fs.writeFile(
      path.join(k, "plans", "PLAN-001.md"),
      itemFile(["id: PLAN-001", "type: plan", "title: Legacy plan", "status: todo"], "Plan body."),
      "utf8",
    );
    const store = new KanmerStore(root);

    await migrateToV2(store);

    // v1→v2 leaves documents flat (`plan.md` beside the ticket); the move into
    // `plan/` happens in the v3 step, so read the v2 shape this step produces.
    const planDoc = await fs.readFile(path.join(k, "areas", "api", "TICK-001", "plan.md"), "utf8");
    expect(planDoc).toContain("# Legacy plan");
    expect(planDoc!.split("# Legacy plan").length).toBe(2); // exactly once
    expect(
      await fs.access(path.join(k, "plans", "PLAN-001.md")).then(
        () => true,
        () => false,
      ),
    ).toBe(false);
  });
});

describe("migration: v2 → v3", () => {
  /**
   * A realistic v2 board: the seven stages, priorities, loose pipeline
   * documents and a scratch note — plus one stage no alias covers, which is the
   * case the report has to be honest about.
   */
  async function seedV2Board(extraStatus?: string): Promise<KanmerStore> {
    await fs.writeFile(path.join(k, "version.json"), JSON.stringify({ format: 2 }), "utf8");
    await writeBoardYml([
      "statuses:",
      "  - { id: backlog, name: Backlog }",
      "  - { id: researching, name: Researching }",
      "  - { id: planning, name: Planning }",
      "  - { id: implementing, name: Implementing }",
      "  - { id: review, name: Review }",
      "  - { id: verifying, name: Verifying }",
      "  - { id: done, name: Done }",
      ...(extraStatus ? [`  - { id: ${extraStatus}, name: Extra }`] : []),
      "areas:",
      "  - { id: api, name: API, prefix: API }",
      "priorities:",
      "  - { id: low, name: Low }",
      "  - { id: medium, name: Medium }",
      "idPrefixes: { ticket: TICK, plan: PLAN, research: RES }",
      "",
    ]);

    const mk = async (id: string, status: string, priority: string) => {
      const dir = path.join(k, "areas", "api", id);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        path.join(dir, `${id}.md`),
        itemFile(
          [`id: ${id}`, "type: ticket", `title: ${id}`, `status: ${status}`, "area: api", `priority: ${priority}`],
          "Body.",
        ),
        "utf8",
      );
      return dir;
    };

    const a = await mk("API-001", "researching", "high");
    await fs.writeFile(path.join(a, "research.md"), "# Research\n", "utf8");
    await fs.writeFile(path.join(a, "impact.md"), "# Impact\n", "utf8");
    await fs.writeFile(path.join(a, "scratch-notes.md"), "jotting\n", "utf8");

    const b = await mk("API-002", "done", "low");
    await fs.writeFile(path.join(b, "proof.md"), "# Proof\n", "utf8");

    await mk("API-003", "planning", "medium");
    if (extraStatus) await mk("API-004", extraStatus, "low");

    return new KanmerStore(root);
  }

  it("collapses seven stages to six with zero restages, moves docs, strips priority", async () => {
    const store = await seedV2Board();
    expect(await store.detectFormat()).toBe(2);

    const dry = await migrateToV3(store, { dryRun: true });
    expect(dry.needsRestage).toEqual([]);
    expect(dry.prioritiesStripped).toBe(3);
    // Researching and Planning both collapse into Preparing.
    const preparing = dry.stageMapping.filter((m) => m.to === "preparing").map((m) => m.from);
    expect(preparing.sort()).toEqual(["planning", "researching"]);
    // Dry run wrote nothing.
    expect(await store.detectFormat()).toBe(2);

    const real = await migrateToV3(store);
    expect(real.needsRestage).toEqual([]);
    expect(real.stageMapping).toEqual(dry.stageMapping); // dry-run parity
    expect(await store.detectFormat()).toBe(3);

    // Stages mapped.
    expect((await store.getItem("API-001"))?.status).toBe("preparing");
    expect((await store.getItem("API-003"))?.status).toBe("preparing");
    expect((await store.getItem("API-002"))?.status).toBe("done");

    // Documents moved into their folders, impact renamed to files.
    const dir = path.join(k, "areas", "api", "API-001");
    expect(await fs.readFile(path.join(dir, "research", "research.md"), "utf8")).toBe("# Research\n");
    expect(await fs.readFile(path.join(dir, "files", "impact.md"), "utf8")).toBe("# Impact\n");
    expect(await fs.readFile(path.join(dir, "scratch", "notes.md"), "utf8")).toBe("jotting\n");
    expect(await fs.access(path.join(dir, "research.md")).then(() => true, () => false)).toBe(false);

    // Priority stripped; profiles assigned per FRD-002's note (as amended).
    const active = await store.getItem("API-001");
    expect((active as Record<string, unknown>).priority).toBeUndefined();
    expect(active?.profile).toBe("feature");
    expect((await store.getItem("API-002"))?.profile).toBe("custom");

    // board.yml lost the legacy dimensions and gained the v3 vocabulary.
    const board = await store.getBoard();
    expect(board.statuses).toBeUndefined();
    expect(board.priorities).toBeUndefined();
    expect(Object.keys(board.profiles ?? {})).toContain("spike");
    expect(board.proofTypes).toContain("visual");
  });

  it("sends an unmappable stage to Backlog with a needs-restage label, listed in the report", async () => {
    const store = await seedV2Board("triage");
    const report = await migrateToV3(store);
    expect(report.needsRestage).toEqual([{ id: "API-004", from: "triage" }]);
    const t = await store.getItem("API-004");
    expect(t?.status).toBe("backlog");
    expect(t?.labels).toContain("needs-restage");
  });

  it("is idempotent: a second run is a no-op and rewrites nothing", async () => {
    const store = await seedV2Board();
    await migrateToV3(store);
    const file = path.join(k, "areas", "api", "API-001", "API-001.md");
    const before = await fs.readFile(file, "utf8");

    const again = await migrateToV3(store);
    expect(again.alreadyV3).toBe(true);
    expect(again.stageMapping).toEqual([]);
    expect(await fs.readFile(file, "utf8")).toBe(before); // byte-identical
  });

  it("resumes when a previous run already moved some documents", async () => {
    const store = await seedV2Board();
    // Simulate a run that died after relocating research but before the rest.
    const dir = path.join(k, "areas", "api", "API-001");
    await fs.mkdir(path.join(dir, "research"), { recursive: true });
    await fs.rename(path.join(dir, "research.md"), path.join(dir, "research", "research.md"));

    await migrateToV3(store);
    expect(await fs.readFile(path.join(dir, "research", "research.md"), "utf8")).toBe("# Research\n");
    expect(await fs.readFile(path.join(dir, "files", "impact.md"), "utf8")).toBe("# Impact\n");
  });

  it("the migrated board is immediately workable: a gate opens on the moved documents", async () => {
    const store = await seedV2Board();
    await migrateToV3(store);
    // API-001 came out as `feature` in Preparing with research + files already
    // present, so it needs only plan + checklist to move on.
    await expect(store.moveItem("API-001", { status: "implementing" })).rejects.toThrow(
      /leaving Preparing requires plan, checklist/,
    );
    await store.setDoc("API-001", "plan", "# Plan");
    await store.setDoc("API-001", "checklist", "- [ ] go");
    expect((await store.moveItem("API-001", { status: "implementing" })).status).toBe("implementing");
  });
});

describe("migration: repoDocs survives", () => {
  it("carries a customised repoDocs across, instead of reverting to the shipped globs", async () => {
    await fs.writeFile(path.join(k, "version.json"), JSON.stringify({ format: 2 }), "utf8");
    await writeBoardYml([
      "statuses:",
      "  - { id: backlog, name: Backlog }",
      "  - { id: done, name: Done }",
      "areas: []",
      "priorities:",
      "  - { id: medium, name: Medium }",
      "idPrefixes: { ticket: TICK, plan: PLAN, research: RES }",
      "docs:",
      "  repoDocs:",
      "    frd: docs/functional/frd/**",
      "",
    ]);
    const store = new KanmerStore(root);
    await migrateToV3(store);

    // repoDocs is how a ref is classified as a governing doc (FRD-002 P4).
    // Dropping it with the rest of the v2 `docs` block silently reverted the
    // board to the shipped globs, which classify nothing on a docs-template
    // tree — so the leave-Backlog gate became unsatisfiable by refs again.
    const board = await store.getBoard();
    expect(board.repoDocs).toEqual({ frd: "docs/functional/frd/**" });
    expect(board.docs).toBeUndefined();
    expect(repoDocKindOf(board, "docs/functional/frd/FRD-001.md")).toBe("frd");
  });

  it("leaves repoDocs absent when the board never configured it", async () => {
    await fs.writeFile(path.join(k, "version.json"), JSON.stringify({ format: 2 }), "utf8");
    await writeBoardYml([
      "statuses:",
      "  - { id: backlog, name: Backlog }",
      "areas: []",
      "priorities: []",
      "idPrefixes: { ticket: TICK, plan: PLAN, research: RES }",
      "",
    ]);
    const store = new KanmerStore(root);
    await migrateToV3(store);
    expect((await store.getBoard()).repoDocs).toBeUndefined();
  });
});
