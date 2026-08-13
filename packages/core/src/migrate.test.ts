import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { KanmerStore } from "./store.js";
import { migrateToV2 } from "./migrate.js";

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

    const planDoc = await store.getDoc("TICK-001", "plan");
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
