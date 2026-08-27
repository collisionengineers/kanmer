import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { KanmerStore } from "./store.js";
import { migrateBoard } from "./migrate.js";
import { resolvePaths } from "./paths.js";
import {
  allocateProjectRecord,
  computeRevision,
  isProjectIdShape,
  readProjectRecord,
  revisionCountsDocument,
} from "./project.js";

let root: string;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-project-"));
});

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe("project record", () => {
  it("allocates once, idempotently, and reads back", async () => {
    const paths = resolvePaths(root);
    await fs.mkdir(paths.kanmer, { recursive: true });
    const first = await allocateProjectRecord(paths, { origin: "generated", format: 3 });
    expect(first.allocated).toBe(true);
    expect(isProjectIdShape(first.record.project_id)).toBe(true);
    expect(first.record.board_id).toBe(first.record.project_id);
    expect(first.record.migratedFrom).toBeUndefined();
    const second = await allocateProjectRecord(paths, { origin: "migrated", format: 3 });
    expect(second.allocated).toBe(false);
    expect(second.record).toEqual(first.record);
    expect(await readProjectRecord(paths)).toEqual(first.record);
  });

  it("records the fallback fingerprint as migration evidence", async () => {
    const paths = resolvePaths(root);
    await fs.mkdir(paths.kanmer, { recursive: true });
    const { record } = await allocateProjectRecord(paths, {
      origin: "migrated",
      format: 3,
      fallbackFingerprint: "kanmer-proj-v1:abc",
      now: () => "2026-08-27T00:00:00.000Z",
    });
    expect(record.migratedFrom).toEqual({ fingerprint: "kanmer-proj-v1:abc", format: 3, at: "2026-08-27T00:00:00.000Z" });
    expect(record.created).toBe("2026-08-27T00:00:00.000Z");
  });

  it("treats a malformed or foreign file as absent rather than throwing", async () => {
    const paths = resolvePaths(root);
    await fs.mkdir(paths.kanmer, { recursive: true });
    await fs.writeFile(paths.projectFile, "{ not json", "utf8");
    expect(await readProjectRecord(paths)).toBeNull();
    await fs.writeFile(paths.projectFile, JSON.stringify({ schema: 2, project_id: "x" }), "utf8");
    expect(await readProjectRecord(paths)).toBeNull();
  });
});

describe("store identity", () => {
  it("a fresh board is born with a generated identity on init", async () => {
    const store = new KanmerStore(root);
    await store.init();
    const project = await store.getProject();
    expect(project?.origin).toBe("generated");
    // Opening it again never reallocates.
    await store.init();
    expect((await store.getProject())?.project_id).toBe(project?.project_id);
  });

  it("a legacy board receives a one-time migrated identity with an auditable activity entry", async () => {
    const store = new KanmerStore(root);
    await store.init();
    await fs.rm(store.paths.projectFile); // simulate a board written before FRD-029
    expect(await store.getProject()).toBeNull();
    const again = new KanmerStore(root);
    await again.init({ fallbackFingerprint: "kanmer-proj-v1:legacy" });
    const project = await again.getProject();
    expect(project?.origin).toBe("migrated");
    expect(project?.migratedFrom?.fingerprint).toBe("kanmer-proj-v1:legacy");
    const activity = await again.getActivity({ id: "board" });
    expect(activity.some((e) => e.field === "project_id" && String(e.to).startsWith(project!.project_id))).toBe(true);
  });

  it("N concurrent first writes on a legacy board mint exactly one identity and one activity entry", async () => {
    const seed = new KanmerStore(root);
    await seed.init();
    await fs.rm(seed.paths.projectFile); // legacy board: everything but project.json
    const stores = Array.from({ length: 8 }, () => new KanmerStore(root));
    await Promise.all(stores.map((s, i) => s.init({ fallbackFingerprint: `kanmer-proj-v1:legacy-${i}` })));
    const record = await seed.getProject();
    expect(record?.origin).toBe("migrated");
    const ids = new Set<string>();
    for (const s of stores) ids.add((await s.getProject())!.project_id);
    expect([...ids]).toEqual([record!.project_id]);
    // Exactly one migration entry (the seed's own `generated` allocation is the only other one).
    const entries = (await seed.getActivity({ id: "board" })).filter((e) => e.field === "project_id");
    expect(entries).toHaveLength(2);
    expect(entries.filter((e) => String(e.to).startsWith(record!.project_id))).toHaveLength(1);
    // No temp files left behind by the losers.
    const leftovers = (await fs.readdir(seed.paths.kanmer)).filter((f) => f.includes(".tmp-"));
    expect(leftovers).toEqual([]);
  });

  it("allocateProjectRecord itself is exclusive under concurrency", async () => {
    const paths = resolvePaths(root);
    await fs.mkdir(paths.kanmer, { recursive: true });
    const results = await Promise.all(
      Array.from({ length: 8 }, () => allocateProjectRecord(paths, { origin: "migrated", format: 3 })),
    );
    expect(results.filter((r) => r.allocated)).toHaveLength(1);
    expect(new Set(results.map((r) => r.record.project_id)).size).toBe(1);
    expect((await readProjectRecord(paths))?.project_id).toBe(results[0].record.project_id);
  });

  it("a malformed project.json is replaced by a fresh allocation (documented fallback)", async () => {
    const paths = resolvePaths(root);
    await fs.mkdir(paths.kanmer, { recursive: true });
    await fs.writeFile(paths.projectFile, "{ not json", "utf8");
    const result = await allocateProjectRecord(paths, { origin: "migrated", format: 3, fallbackFingerprint: "kanmer-proj-v1:x" });
    expect(result.allocated).toBe(true);
    expect((await readProjectRecord(paths))?.project_id).toBe(result.record.project_id);
  });

  it("the identity survives a copy to another path (logical, not location-bound)", async () => {
    const store = new KanmerStore(root);
    await store.init();
    const copy = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-project-copy-"));
    try {
      await fs.cp(store.paths.kanmer, path.join(copy, ".kanmer"), { recursive: true });
      const twin = new KanmerStore(copy);
      expect((await twin.getProject())?.project_id).toBe((await store.getProject())?.project_id);
    } finally {
      await fs.rm(copy, { recursive: true, force: true });
    }
  });

  it("migrateBoard allocates identity on an already-current board, and a dry run only previews", async () => {
    const store = new KanmerStore(root);
    await store.init();
    await fs.rm(store.paths.projectFile);
    const preview = await migrateBoard(store, { dryRun: true });
    expect(preview.v3.alreadyV3).toBe(true);
    expect(preview.identity).toEqual({ allocated: false, wouldAllocate: true, project_id: null, origin: null });
    expect(await store.getProject()).toBeNull();
    const real = await migrateBoard(store, { fallbackFingerprint: "kanmer-proj-v1:old" });
    expect(real.identity.allocated).toBe(true);
    expect(real.identity.origin).toBe("migrated");
    expect((await store.getProject())?.migratedFrom?.fingerprint).toBe("kanmer-proj-v1:old");
    const repeat = await migrateBoard(store);
    expect(repeat.identity).toEqual({
      allocated: false,
      wouldAllocate: false,
      project_id: real.identity.project_id,
      origin: "migrated",
    });
  });
});

describe("document-inclusive revision", () => {
  it("is stable, ignores scratch/reference, and orders documents deterministically", () => {
    const base = computeRevision("ticket", [
      { path: "plan/plan.md", version: "a" },
      { path: "proof/proof.md", version: "b" },
    ]);
    expect(base).toMatch(/^rev1:[0-9a-f]{16}$/);
    expect(
      computeRevision("ticket", [
        { path: "proof/proof.md", version: "b" },
        { path: "plan/plan.md", version: "a" },
        { path: "scratch/notes.md", version: "zzz" },
        { path: "reference/spec.md", version: "yyy" },
      ]),
    ).toBe(base);
    expect(computeRevision("ticket", [{ path: "plan/plan.md", version: "a" }, { path: "proof/proof.md", version: "c" }])).not.toBe(base);
    expect(computeRevision("ticket edited", [{ path: "plan/plan.md", version: "a" }, { path: "proof/proof.md", version: "b" }])).not.toBe(base);
    expect(revisionCountsDocument("scratch/notes.md")).toBe(false);
    expect(revisionCountsDocument("proof/proof.md")).toBe(true);
  });

  it("changes when a proof is rewritten even though `updated` does not (F-015)", async () => {
    const store = new KanmerStore(root);
    await store.init();
    const item = await store.createItem({ type: "ticket", title: "Revisioned" });
    const before = await store.getRevision(item.id);
    expect(before?.revision).toMatch(/^rev1:/);
    await store.setDoc(item.id, "proof", "# proof v1");
    const afterProof = await store.getRevision(item.id);
    expect(afterProof?.revision).not.toBe(before?.revision);
    expect(afterProof?.updated).toBe(before?.updated);
    expect(afterProof?.documents).toBe(1);
    await store.appendScratch(item.id, "notes", "running note");
    expect((await store.getRevision(item.id))?.revision).toBe(afterProof?.revision);
  });

  it("a stale expectedRevision is refused with Conflict before any byte is written", async () => {
    const store = new KanmerStore(root);
    await store.init();
    const item = await store.createItem({ type: "ticket", title: "CAS" });
    const stale = (await store.getRevision(item.id))!.revision;
    await store.setDoc(item.id, "plan", "# plan"); // someone else wrote a document
    const ticketBytes = await fs.readFile(path.join(store.paths.areasRoot, "_none", item.id, `${item.id}.md`), "utf8");

    await expect(store.updateItem(item.id, { title: "clobber", expectedRevision: stale })).rejects.toThrow(/^Conflict:/);
    await expect(store.moveItem(item.id, { status: "preparing", position: "top", expectedRevision: stale })).rejects.toThrow(/^Conflict:/);
    await expect(store.setDoc(item.id, "proof", "# proof", { expectedRevision: stale })).rejects.toThrow(/^Conflict:/);
    await expect(store.appendScratch(item.id, "notes", "x", { expectedRevision: stale })).rejects.toThrow(/^Conflict:/);
    await expect(store.takeTicket(item.id, { branch: "b", expectedRevision: stale })).rejects.toThrow(/^Conflict:/);

    expect(await fs.readFile(path.join(store.paths.areasRoot, "_none", item.id, `${item.id}.md`), "utf8")).toBe(ticketBytes);
    expect(await store.getDoc(item.id, "proof")).toBeNull();
    expect(await store.getScratch(item.id, "notes")).toBeNull();
    expect((await store.getItem(item.id))?.title).toBe("CAS");

    const fresh = (await store.getRevision(item.id))!.revision;
    const updated = await store.updateItem(item.id, { title: "accepted", expectedRevision: fresh });
    expect(updated.title).toBe("accepted");
    // The accepted write itself moved the revision on.
    expect((await store.getRevision(item.id))!.revision).not.toBe(fresh);
  });

  it("release, renew and transfer honour expectedRevision with zero writes on conflict (F-004)", async () => {
    const store = new KanmerStore(root);
    await store.init();
    const item = await store.createItem({ type: "ticket", title: "Claim CAS", status: "implementing", profile: "chore", docs_todo: true });
    const taken = await store.takeTicket(item.id, { branch: "b", worktree: "w", assignee: "ctl-a" });
    const stale = (await store.getRevision(item.id))!.revision;
    await store.setDoc(item.id, "plan", "# plan"); // moves the revision without touching the claim
    const file = path.join(store.paths.areasRoot, "_none", item.id, `${item.id}.md`);
    const bytes = await fs.readFile(file, "utf8");
    const activityBefore = (await store.getActivity({ id: item.id })).length;

    await expect(store.renewTicket(item.id, "ctl-a", { expectedRevision: stale })).rejects.toThrow(/^Conflict:/);
    await expect(
      store.transferTicket(item.id, { assignee: "ctl-b", reason: "operator: handover", expectedRevision: stale }),
    ).rejects.toThrow(/^Conflict:/);
    await expect(store.releaseTicket(item.id, { expectedRevision: stale })).rejects.toThrow(/^Conflict:/);

    expect(await fs.readFile(file, "utf8")).toBe(bytes);
    expect((await store.getItem(item.id))?.assignee).toBe(taken.assignee);
    expect((await store.getActivity({ id: item.id })).length).toBe(activityBefore);

    const fresh = (await store.getRevision(item.id))!.revision;
    const renewed = await store.renewTicket(item.id, "ctl-a", { expectedRevision: fresh });
    expect(renewed.claim_expires_at).toBeTruthy();
    const afterRenew = (await store.getRevision(item.id))!.revision;
    expect(afterRenew).not.toBe(fresh);
    const released = await store.releaseTicket(item.id, { expectedRevision: afterRenew });
    expect(released.taken_at).toBeUndefined();
  });
});
