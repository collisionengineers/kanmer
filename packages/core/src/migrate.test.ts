import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { removeTreeWithRetry } from "./io.js";
import { KanmerStore } from "./store.js";
import { auditProofRecords, migrateBoard, migrateProofValidation, migrateToV2, migrateToV3 } from "./migrate.js";
import { repoDocKindOf } from "./docs.js";

let root: string;
let k: string;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-migrate-"));
  k = path.join(root, ".kanmer");
  await fs.mkdir(path.join(k, "data"), { recursive: true });
});

afterEach(async () => {
  await removeTreeWithRetry(root);
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

  /**
   * Re-running the umbrella must be a no-op. A single run cannot show this:
   * the v3 step restamps version.json immediately, so a v1→v2 step that
   * wrongly fired on a v3 board leaves no trace until the *second* run.
   */
  it("migrateBoard on an already-migrated board changes nothing", async () => {
    const store = await seedV2Board();
    await migrateBoard(store);
    const versionFile = path.join(k, "version.json");
    const stamped = await fs.readFile(versionFile, "utf8");
    expect(JSON.parse(stamped).format).toBe(3);

    store.resetFormatCache();
    const again = await migrateBoard(store);

    // Both steps must recognise there is nothing to do. Before the fix
    // `alreadyV2` was false here, because the guard tested `=== 2` and this
    // board is 3 — so the v1→v2 migration ran and stamped it back down.
    expect(again.v2.alreadyV2).toBe(true);
    expect(again.v3.alreadyV3).toBe(true);
    expect(again.backfill.addedStages).toEqual([]);

    // The flags can be right while the file churns, so assert the bytes. A
    // re-stamp shows up here as a fresh `migratedAt` even when nothing else
    // moved.
    expect(await fs.readFile(versionFile, "utf8")).toBe(stamped);
  });

  it("resuming does not rewrite tickets an earlier run already migrated", async () => {
    const store = await seedV2Board();
    await migrateToV3(store);
    const ids = (await store.listItems({ includeArchived: true })).map((i) => i.id);
    expect(ids.length).toBeGreaterThan(1);

    // The state an EPERM mid-loop leaves: tickets migrated, version.json not
    // yet stamped, because writeVersion is deliberately last.
    await fs.writeFile(path.join(k, "version.json"), JSON.stringify({ format: 2 }), "utf8");
    store.resetFormatCache();

    const files = ids.map((id) => path.join(k, "areas", "api", id, `${id}.md`));
    const before = await Promise.all(files.map((f) => fs.stat(f).then((s) => s.mtimeMs)));

    const again = await migrateToV3(store);

    // Zero ticket files touched. Without the per-ticket skip every one is
    // rewritten, which is what made each retry on a real board die earlier
    // than the last.
    const after = await Promise.all(files.map((f) => fs.stat(f).then((s) => s.mtimeMs)));
    expect(after).toEqual(before);
    expect(again.resumed).toBe(true);
    expect(again.notes.some((n) => n.includes("resumed a previously interrupted"))).toBe(true);
  });

  it("resuming still finishes the tickets the interrupted run never reached", async () => {
    const store = await seedV2Board();
    await migrateToV3(store);

    // Roll ONE ticket back to its format-2 shape, and the board with it.
    const id = (await store.listItems({ includeArchived: true }))[0].id;
    const file = path.join(k, "areas", "api", id, `${id}.md`);
    const raw = await fs.readFile(file, "utf8");
    await fs.writeFile(
      file,
      raw.replace(/^profile: .*$/m, "priority: medium").replace(/^status: .*$/m, "status: todo"),
      "utf8",
    );
    await fs.writeFile(path.join(k, "version.json"), JSON.stringify({ format: 2 }), "utf8");
    store.resetFormatCache();

    const report = await migrateToV3(store);

    const fixed = await store.getItem(id);
    expect(fixed?.status).toBe("backlog");
    expect(fixed?.profile).toBeDefined();
    expect((fixed as unknown as { priority?: string }).priority).toBeUndefined();
    expect(report.resumed).toBe(true);
    expect(await store.detectFormat()).toBe(3);
  });

  it("sweeps stale atomic-write temps and leaves fresh ones alone", async () => {
    const store = await seedV2Board();
    const dir = path.join(k, "areas", "api");
    const stale = path.join(dir, ".TICK-999.md.tmp-18292-182");
    const fresh = path.join(dir, ".TICK-998.md.tmp-4242-7");
    await fs.writeFile(stale, "residue", "utf8");
    await fs.writeFile(fresh, "in flight", "utf8");
    const old = new Date(Date.now() - 5 * 60_000);
    await fs.utimes(stale, old, old);

    const report = await migrateToV3(store);

    expect(report.sweptTempFiles).toBe(1);
    await expect(fs.access(stale)).rejects.toThrow();
    // A temp younger than the threshold may belong to a write happening right
    // now in another process; removing it would break that write.
    expect(await fs.readFile(fresh, "utf8")).toBe("in flight");
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

describe("proof census and the strict cutover (CORE-129)", () => {
  const SHA = "d".repeat(40);
  let store: KanmerStore;
  let boardRoot: string;

  /** A valid `proof-record/2` PASS document. */
  const typedProof = [
    "---",
    "kind: proof-record",
    "schema: 2",
    `merged_sha: "${SHA}"`,
    'environment: "detached worktree"',
    'verified_at: "2026-09-05T04:00:00.000Z"',
    "result: PASS",
    "attempts:",
    '  - attempted_at: "2026-09-05T04:00:00.000Z"',
    '    command: "npm run verify"',
    '    cwd: "/tmp/verify"',
    "    exit_code: 0",
    "    result: PASS",
    "    authority: authoritative",
    '    summary: "the rail ran"',
    "---",
    "",
    "Evidence.",
  ].join("\n");

  beforeEach(async () => {
    boardRoot = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-census-"));
    store = new KanmerStore(boardRoot);
    await store.init();
    // A fresh board is strict; these census tests are about an *existing*
    // board, which is the only kind that ever needs a cutover.
    await store.updateBoard((board) => ({ ...board, proofValidation: { mode: "report" } }));
  });

  afterEach(async () => {
    await removeTreeWithRetry(boardRoot);
  });

  async function ticketWithProof(title: string, proof: string | null): Promise<string> {
    const item = await store.createItem({ type: "ticket", title });
    if (proof !== null) await store.setDoc(item.id, "proof", proof);
    return item.id;
  }

  it("buckets valid, legacy, invalid and absent deterministically", async () => {
    await ticketWithProof("valid", typedProof);
    await ticketWithProof("legacy", "# Proof\n\nIt worked.\n");
    await ticketWithProof("invalid", typedProof.replace("schema: 2", "schema: 9"));
    await ticketWithProof("absent", null);

    const census = await auditProofRecords(store);
    expect(census.complete).toBe(true);
    expect(census.counts).toEqual({ valid: 1, legacy: 1, invalid: 1, absent: 1, total: 4 });
    expect(census.parserVersion).toBe("proof-record/2#1");
    // Every entry carries its own diagnosis, which is what makes the census
    // usable as a work list rather than four numbers.
    const invalid = census.entries.find((entry) => entry.bucket === "invalid")!;
    expect(invalid.diagnostics).toEqual(["schema must be 2, got 9"]);
  });

  it("fingerprints raw bytes and is stable across repeated readings", async () => {
    const id = await ticketWithProof("valid", typedProof);
    const first = await auditProofRecords(store);
    const second = await auditProofRecords(store);
    expect(second.digest).toBe(first.digest);
    expect(first.entries[0].bytes).toBe(Buffer.byteLength((await store.getDoc(id, "proof"))!, "utf8"));
    expect(first.entries[0].sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes the digest when a proof, a stage or the roster changes", async () => {
    const id = await ticketWithProof("valid", typedProof);
    const base = (await auditProofRecords(store)).digest;

    await store.setDoc(id, "proof", `${typedProof}\n\nOne more paragraph.\n`);
    const afterEdit = (await auditProofRecords(store)).digest;
    expect(afterEdit).not.toBe(base);

    await store.createItem({ type: "ticket", title: "another" });
    expect((await auditProofRecords(store)).digest).not.toBe(afterEdit);
  });

  it("dry run censuses and writes nothing, digest or no digest", async () => {
    await ticketWithProof("legacy", "# Proof\n");
    const preview = await migrateProofValidation(store, { dryRun: true });
    expect(preview.from).toBe("report");
    expect(preview.changed).toBe(false);
    expect(preview.census.counts.legacy).toBe(1);

    const refused = await migrateProofValidation(store, { dryRun: true, censusDigest: preview.census.digest });
    expect(refused.changed).toBe(false);
    expect(refused.refused).toMatch(/dry_run does not apply a cutover/);
    expect((await store.getBoard()).proofValidation).toEqual({ mode: "report" });
  });

  it("never enables strict without a digest, however many times it is called", async () => {
    await ticketWithProof("legacy", "# Proof\n");
    await migrateProofValidation(store, {});
    await migrateProofValidation(store, {});
    expect((await store.getBoard()).proofValidation).toEqual({ mode: "report" });
  });

  it("refuses a stale digest without writing", async () => {
    const id = await ticketWithProof("legacy", "# Proof\n");
    const stale = (await auditProofRecords(store)).digest;
    await store.setDoc(id, "proof", "# Proof\n\nAmended after the census was taken.\n");

    const result = await migrateProofValidation(store, { censusDigest: stale });
    expect(result.changed).toBe(false);
    expect(result.refused).toMatch(/census digest mismatch/);
    expect((await store.getBoard()).proofValidation).toEqual({ mode: "report" });
  });

  it("applies an exact digest, writing only the policy and leaving proof bytes alone", async () => {
    const legacyId = await ticketWithProof("legacy", "# Proof\n\nIt worked.\n");
    const before = await store.getDoc(legacyId, "proof");
    const boardBefore = await store.getBoard();

    const census = await auditProofRecords(store);
    const result = await migrateProofValidation(store, { censusDigest: census.digest });
    expect(result.refused).toBeNull();
    expect(result.changed).toBe(true);
    expect(result.to).toBe("strict");

    const boardAfter = await store.getBoard();
    expect(boardAfter.proofValidation).toEqual({ mode: "strict" });
    expect({ ...boardAfter, proofValidation: undefined }).toEqual({ ...boardBefore, proofValidation: undefined });
    // The point of the whole design: history is described, never rewritten.
    expect(await store.getDoc(legacyId, "proof")).toBe(before);
  });

  it("is idempotent once strict, and re-censuses without asking for a digest again", async () => {
    await ticketWithProof("legacy", "# Proof\n");
    const census = await auditProofRecords(store);
    await migrateProofValidation(store, { censusDigest: census.digest });

    const again = await migrateProofValidation(store, {});
    expect(again.from).toBe("strict");
    expect(again.to).toBe("strict");
    expect(again.changed).toBe(false);
    expect(again.refused).toBeNull();
    expect(again.census.counts.total).toBe(1);
  });

  it("migrate_board's umbrella carries the census and enables nothing on its own", async () => {
    await ticketWithProof("legacy", "# Proof\n");
    const report = await migrateBoard(store, { dryRun: true });
    expect(report.proofValidation.census.counts.legacy).toBe(1);
    expect(report.proofValidation.changed).toBe(false);
    expect((await store.getBoard()).proofValidation).toEqual({ mode: "report" });
  });

  it("refuses the cutover on a board that has not been format-migrated yet", async () => {
    // A format-1 board keeps its tickets somewhere this census does not look,
    // so a digest taken here would describe a board that stops existing the
    // moment the format migration runs.
    const legacyRoot = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-census-v1-"));
    try {
      await fs.mkdir(path.join(legacyRoot, ".kanmer", "data"), { recursive: true });
      // A legacy `tickets/` folder is what makes this a format-1 board.
      await fs.mkdir(path.join(legacyRoot, ".kanmer", "tickets"), { recursive: true });
      await fs.writeFile(
        path.join(legacyRoot, ".kanmer", "data", "board.yml"),
        ["statuses:", "  - { id: todo, name: Todo }", "areas: []", "idPrefixes: { ticket: TICK, plan: PLAN, research: RES }", ""].join("\n"),
        "utf8",
      );
      const legacyStore = new KanmerStore(legacyRoot);
      expect(await legacyStore.detectFormat()).toBeLessThan(3);
      const census = await auditProofRecords(legacyStore);
      const result = await migrateProofValidation(legacyStore, { censusDigest: census.digest });
      expect(result.changed).toBe(false);
      expect(result.refused).toMatch(/migrate the format first/);
    } finally {
      await removeTreeWithRetry(legacyRoot);
    }
  });
});
