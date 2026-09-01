import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { removeTreeWithRetry, STEP_PACKET_LIMITS } from "../../core/dist/index.js";
import {
  collectStepDocumentSnapshot,
  collectWorkspaceSnapshot,
  parseIndexFlagCensus,
  parseNameStatusZ,
  parsePorcelainV1Z,
  readBoundedWorkspaceFile,
} from "../dist/reconciliation.js";

function git(cwd, ...args) {
  return execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", windowsHide: true }).trim();
}

function indexEntry(cwd, mode, name, content) {
  const blob = execFileSync("git", ["-C", cwd, "hash-object", "-w", "--stdin"], {
    input: Buffer.from(content, "utf8"), encoding: "utf8", windowsHide: true,
  }).trim();
  execFileSync("git", ["-C", cwd, "update-index", "-z", "--index-info"], {
    input: Buffer.from(`${mode} ${blob}\t${name}\0`, "utf8"), windowsHide: true,
  });
}

async function materializeTrackedLink(
  cwd,
  name,
  target,
  representation = process.platform === "win32" ? "placeholder" : "real-link",
) {
  const absolute = path.join(cwd, ...name.split("/"));
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  if (representation === "placeholder") {
    git(cwd, "config", "core.symlinks", "false");
    await fs.writeFile(absolute, target);
  }
  else {
    git(cwd, "config", "core.symlinks", "true");
    await fs.symlink(target, absolute, "file");
  }
  indexEntry(cwd, "120000", name, target);
}

async function fixture(t, { objectFormat } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-step-reconcile-"));
  t.after(() => removeTreeWithRetry(root));
  git(root, "init", ...(objectFormat ? [`--object-format=${objectFormat}`] : []), "-b", "main");
  git(root, "config", "user.email", "fixture@example.invalid");
  git(root, "config", "user.name", "Fixture");
  await fs.writeFile(path.join(root, "tracked.txt"), "base\n");
  git(root, "add", "tracked.txt");
  git(root, "commit", "-m", "base");
  const worktree = path.join(root, ".worktrees", "ticket");
  git(root, "worktree", "add", "-b", "ticket-step", worktree, "main");
  const board = path.join(root, "board");
  await fs.mkdir(board);
  return { root, worktree, board };
}

test("porcelain and name-status parsers preserve both rename endpoints and reject truncation", () => {
  assert.deepEqual(parsePorcelainV1Z(Buffer.from("R  renamed ü.txt\0old name.txt\0", "utf8")).map((entry) => entry.path), ["renamed ü.txt", "old name.txt"]);
  assert.deepEqual(parseNameStatusZ(Buffer.from("R100\0old name.txt\0renamed ü.txt\0", "utf8")), ["old name.txt", "renamed ü.txt"]);
  assert.throws(() => parsePorcelainV1Z(Buffer.from("?? incomplete", "utf8")), /terminated by NUL/);
  assert.throws(() => parsePorcelainV1Z(Buffer.from([0x3f, 0x3f, 0x20, 0xff, 0])), /encoded data|encoding/i);
});

test("index-flag census preserves raw NUL paths and rejects malformed or unbounded output", () => {
  const oid = "a".repeat(40);
  const census = parseIndexFlagCensus(Buffer.from(
    `H 100644 ${oid} 0\tnormal.txt\0h 100755 ${oid} 0\tassumed.txt\0S 100644 ${oid} 0\tskipped.txt\0s 120000 ${oid} 0\tboth\n雪.txt\0`,
    "utf8",
  ));
  assert.equal(census.count, 4);
  assert.deepEqual(census.assumeUnchanged, ["assumed.txt", "both\n雪.txt"]);
  assert.deepEqual(census.skipWorktree, ["skipped.txt", "both\n雪.txt"]);
  assert.deepEqual(census.entries.map(({ mode, stage, path }) => ({ mode, stage, path })), [
    { mode: "100644", stage: 0, path: "normal.txt" },
    { mode: "100755", stage: 0, path: "assumed.txt" },
    { mode: "100644", stage: 0, path: "skipped.txt" },
    { mode: "120000", stage: 0, path: "both\n雪.txt" },
  ]);
  assert.match(census.digest, /^[0-9a-f]{64}$/);
  assert.throws(() => parseIndexFlagCensus(Buffer.from(`H 100644 ${oid} 0\tunterminated`, "utf8")), /terminated by NUL/);
  assert.throws(() => parseIndexFlagCensus(Buffer.from(`H 100644 ${oid} 0\t\0`, "utf8")), /empty tracked path/);
  assert.throws(() => parseIndexFlagCensus(Buffer.alloc(2 * 1024 * 1024 + 1)), /exceeds.*bytes/i);
  assert.throws(
    () => parseIndexFlagCensus(Buffer.from(Array.from({ length: 16_385 }, (_, index) => `H 100644 ${oid} 0\tp${index}\0`).join(""), "utf8")),
    /exceeds.*tracked entries/i,
  );
  assert.throws(
    () => parseIndexFlagCensus(Buffer.from(Array.from({ length: 257 }, (_, index) => `H 120000 ${oid} 0\tlink-${index}\0`).join(""), "utf8")),
    /tracked symbolic links/i,
  );
});

const baseAuthorityItem = {
  id: "TICK-001", type: "ticket", title: "fixture", status: "implementing", priority: "medium",
  labels: [], links: [], body: "", created: "2026-08-31T00:00:00.000Z", updated: "2026-08-31T00:00:00.000Z",
};

function authorityStore({ item = baseAuthorityItem, inventory = [], groups = [], batch = null, error = null } = {}) {
  let snapshots = 0;
  return {
    reads: () => ({ snapshots }),
    store: {
      getExecutionAuthoritySnapshot: async () => {
        snapshots += 1;
        if (error) throw new Error(error);
        return {
          item,
          revision: { revision: "rev1:stable", updated: item.updated, documents: 0 },
          gates: { profile: "custom", boundaries: [] },
          fixed: [],
          inventory,
          groups,
          batch: typeof batch === "function" ? batch(snapshots) : batch,
        };
      },
    },
  };
}

test("more than 256 revision-exempt scratch/reference docs do not exhaust the authority census", async () => {
  const inventory = Array.from({ length: 300 }, (_, index) => ({
    doc: `${index % 2 ? "scratch" : "reference"}/note-${String(index).padStart(3, "0")}.md`,
    exists: true,
    content: "note",
    version: "a".repeat(16),
  }));
  const fixture = authorityStore({ inventory });
  const result = await collectStepDocumentSnapshot(fixture.store, "TICK-001");
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.snapshot.inventory.length, 300);
  assert.deepEqual(fixture.reads(), { snapshots: 2 });
});

test("stable document collection consumes the store's de-duplicated bounded group authority", async () => {
  const item = { ...baseAuthorityItem, groups: ["HZN-001", "HZN-001"] };
  const groups = [{
    group: { id: "HZN-001", kind: "horizon", title: "Release", body: "Context body" },
    context: "Frozen context",
    contextVersion: "b".repeat(16),
  }];
  const fixture = authorityStore({ item, groups });
  const result = await collectStepDocumentSnapshot(fixture.store, "TICK-001");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(fixture.reads(), { snapshots: 2 });
  assert.deepEqual(result.snapshot.item.groups, ["HZN-001"]);
  assert.equal(result.snapshot.groups.length, 1);
  assert.equal(result.snapshot.evidence.filter((entry) => entry.layer === "group").length, 1);
});

test("bounded store authority refusal stops before batch projection or later packet work", async () => {
  for (const reason of [
    "combined counted-document and unique-group census exceeds 256 entries",
    "group record HZN-001 is missing",
    "Group HZN-001 resolved as conflicting identity HZN-OTHER",
    `ticket document proof/proof.md exceeds ${STEP_PACKET_LIMITS.maxStringBytes} pre-read bytes`,
  ]) {
    const fixture = authorityStore({ error: reason });
    const result = await collectStepDocumentSnapshot(fixture.store, "TICK-001");
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.reason, new RegExp(reason.split(" ")[0], "i"));
    assert.deepEqual(fixture.reads(), { snapshots: 1 });
  }
});

test("batch authority is part of the same bounded double-sample", async () => {
  const fixture = authorityStore({
    batch: (sample) => ({
      id: "batch-a", controller: "controller", controllerRun: "run", frozenAt: "2026-09-01T00:00:00.000Z",
      state: "active", declaration: "consistent", branch: "batch-a", workspace: "worktree:.worktrees/batch-a",
      members: [{ id: "TICK-001", exists: true, status: sample === 1 ? "implementing" : "review", archived: false, terminal: false, taken: true }],
      allTerminal: false,
    }),
  });
  const result = await collectStepDocumentSnapshot(fixture.store, "TICK-001");
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /changed during the bounded double-sample/i);
  assert.deepEqual(fixture.reads(), { snapshots: 2 });
});

test("workspace snapshot is stable, bounded and does not refresh the Git index", async (t) => {
  const { root, worktree } = await fixture(t);
  await fs.writeFile(path.join(worktree, "tracked.txt"), "worker change\n");
  await fs.writeFile(path.join(worktree, "space ü.txt"), "untracked\n");
  const indexPath = git(worktree, "rev-parse", "--git-path", "index");
  const absoluteIndex = path.isAbsolute(indexPath) ? indexPath : path.resolve(worktree, indexPath);
  const beforeBytes = await fs.readFile(absoluteIndex);
  const before = await fs.stat(absoluteIndex);
  // A legacy/local board may still be rooted at the source checkout. A linked
  // ticket worktree beneath that checkout is distinct from the protected board
  // Git worktree and remains inspectable.
  const result = await collectWorkspaceSnapshot({ repoRoot: root, boardRoot: root, worktree: ".worktrees/ticket", branch: "ticket-step" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.snapshot.entries.map((entry) => entry.path), ["space ü.txt", "tracked.txt"]);
  assert.match(result.snapshot.head, /^[0-9a-f]{40}$/);
  assert.deepEqual(await fs.readFile(absoluteIndex), beforeBytes);
  assert.equal((await fs.stat(absoluteIndex)).mtimeMs, before.mtimeMs);
});

test("a SHA-256 repository retains its full 64-character workspace HEAD", async (t) => {
  const { root, worktree, board } = await fixture(t, { objectFormat: "sha256" });
  const result = await collectWorkspaceSnapshot({
    repoRoot: root,
    boardRoot: board,
    worktree: ".worktrees/ticket",
    branch: "ticket-step",
  });
  assert.equal(result.ok, true, result.ok ? undefined : result.reason);
  if (result.ok) assert.match(result.snapshot.head, /^[0-9a-f]{64}$/);
});

test("assume-unchanged and skip-worktree flags refuse hidden tracked evidence without mutating the index", async (t) => {
  for (const [flag, expected] of [["--assume-unchanged", /assume-unchanged/i], ["--skip-worktree", /skip-worktree/i]]) {
    const { root, worktree, board } = await fixture(t);
    git(worktree, "update-index", flag, "tracked.txt");
    await fs.writeFile(path.join(worktree, "tracked.txt"), `${flag} hidden edit\n`);
    const indexPath = git(worktree, "rev-parse", "--git-path", "index");
    const absoluteIndex = path.isAbsolute(indexPath) ? indexPath : path.resolve(worktree, indexPath);
    const beforeBytes = await fs.readFile(absoluteIndex);
    const before = await fs.stat(absoluteIndex);
    const result = await collectWorkspaceSnapshot({ repoRoot: root, boardRoot: board, worktree: ".worktrees/ticket", branch: "ticket-step" });
    assert.equal(result.ok, false);
    assert.match(result.reason, expected);
    assert.deepEqual(await fs.readFile(absoluteIndex), beforeBytes);
    assert.equal((await fs.stat(absoluteIndex)).mtimeMs, before.mtimeMs);
  }
});

test("index-flag addition and removal between samples are snapshot drift", async (t) => {
  for (const initiallyHidden of [false, true]) {
    const { root, worktree, board } = await fixture(t);
    if (initiallyHidden) git(worktree, "update-index", "--assume-unchanged", "tracked.txt");
    const result = await collectWorkspaceSnapshot({
      repoRoot: root,
      boardRoot: board,
      worktree: ".worktrees/ticket",
      branch: "ticket-step",
      betweenSamples: async () => {
        git(worktree, "update-index", initiallyHidden ? "--no-assume-unchanged" : "--assume-unchanged", "tracked.txt");
      },
    });
    assert.equal(result.ok, false);
    assert.match(result.reason, /changed during the bounded double-sample/i);
  }
});

test("tracked index mode or object drift between samples is refused", async (t) => {
  for (const kind of ["mode", "object"]) {
    const { root, worktree, board } = await fixture(t);
    const result = await collectWorkspaceSnapshot({
      repoRoot: root,
      boardRoot: board,
      worktree: ".worktrees/ticket",
      branch: "ticket-step",
      betweenSamples: async () => {
        if (kind === "mode") git(worktree, "update-index", "--chmod=+x", "tracked.txt");
        else indexEntry(worktree, "100644", "tracked.txt", "alternate index bytes\n");
      },
    });
    assert.equal(result.ok, false);
    assert.match(result.reason, /changed during the bounded double-sample/i);
  }
});

test("a clean confined tracked symlink is identity-bound and write-through changes its retained entry", async (t) => {
  const { root, worktree, board } = await fixture(t);
  const link = path.join(worktree, "tracked-link.txt");
  try {
    await fs.symlink("tracked.txt", link, "file");
  } catch (error) {
    t.skip(`filesystem cannot create the required file symlink: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  git(worktree, "add", "tracked-link.txt");
  git(worktree, "commit", "-m", "add confined link");
  if (!git(worktree, "ls-files", "-s", "--", "tracked-link.txt").startsWith("120000 ")) {
    t.skip("Git did not retain the fixture as mode 120000");
    return;
  }

  const baseline = await collectWorkspaceSnapshot({ repoRoot: root, boardRoot: board, worktree: ".worktrees/ticket", branch: "ticket-step" });
  assert.equal(baseline.ok, true);
  if (!baseline.ok) return;
  const before = baseline.snapshot.entries.find((entry) => entry.path === "tracked-link.txt" && entry.index === "." && entry.worktree === ".");
  assert.ok(before);

  await fs.writeFile(link, "write through confined link\n");
  const current = await collectWorkspaceSnapshot({
    repoRoot: root,
    boardRoot: board,
    worktree: ".worktrees/ticket",
    branch: "ticket-step",
    baseline: baseline.snapshot,
  });
  assert.equal(current.ok, true);
  if (!current.ok) return;
  const after = current.snapshot.entries.find((entry) => entry.path === "tracked-link.txt" && entry.index === "." && entry.worktree === ".");
  assert.ok(after);
  assert.notEqual(after.content, before.content);
  assert.ok(current.snapshot.entries.some((entry) => entry.path === "tracked.txt"));
});

test("clean external, parent-relative, chained and dangling tracked symlinks fail closed", async (t) => {
  for (const fixtureKind of ["external", "parent-relative", "chained", "dangling"]) {
    const { root, worktree, board } = await fixture(t);
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), `kanmer-step-link-${fixtureKind}-`));
    t.after(() => removeTreeWithRetry(outside));
    const external = path.join(outside, "external.txt");
    await fs.writeFile(external, "external\n");
    const link = path.join(worktree, "tracked-link.txt");
    try {
      if (fixtureKind === "external") {
        await fs.symlink(external, link, "file");
      } else if (fixtureKind === "parent-relative") {
        await fs.symlink(path.relative(worktree, external), link, "file");
      } else if (fixtureKind === "chained") {
        await fs.symlink(external, path.join(worktree, "intermediate-link.txt"), "file");
        await fs.symlink("intermediate-link.txt", link, "file");
      } else {
        await fs.symlink("missing-target.txt", link, "file");
      }
    } catch (error) {
      t.skip(`filesystem cannot create ${fixtureKind} symlink fixture: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }
    git(worktree, "add", "-A");
    git(worktree, "commit", "-m", `add ${fixtureKind} link`);
    if (!git(worktree, "ls-files", "-s", "--", "tracked-link.txt").startsWith("120000 ")) {
      t.skip("Git did not retain the fixture as mode 120000");
      return;
    }
    const result = await collectWorkspaceSnapshot({ repoRoot: root, boardRoot: board, worktree: ".worktrees/ticket", branch: "ticket-step" });
    assert.equal(result.ok, false);
    assert.match(result.reason, /outside the physical worktree|dangling|unreadable|ENOENT/i);
  }
});

test("clean in-worktree and outside-and-back tracked-link chains fail closed", async (t) => {
  for (const fixtureKind of ["in-worktree-chain", "outside-and-back"]) {
    const { root, worktree, board } = await fixture(t);
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), `kanmer-step-link-${fixtureKind}-`));
    t.after(() => removeTreeWithRetry(outside));
    const hop = path.join(worktree, "hop.txt");
    const link = path.join(worktree, "tracked-link.txt");
    try {
      if (fixtureKind === "in-worktree-chain") {
        await fs.symlink("tracked.txt", hop, "file");
      } else {
        const returning = path.join(outside, "return.txt");
        await fs.symlink(path.join(worktree, "tracked.txt"), returning, "file");
        await fs.symlink(returning, hop, "file");
      }
      await fs.symlink("hop.txt", link, "file");
    } catch (error) {
      t.skip(`filesystem cannot create ${fixtureKind} symlink fixture: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }
    git(worktree, "add", "hop.txt", "tracked-link.txt");
    git(worktree, "commit", "-m", `add ${fixtureKind} links`);
    const result = await collectWorkspaceSnapshot({ repoRoot: root, boardRoot: board, worktree: ".worktrees/ticket", branch: "ticket-step" });
    assert.equal(result.ok, false);
    assert.match(result.reason, /direct|chain|symbolic-link or junction component|lexically outside/i);
  }
});

test("raw tracked-link components refuse an erased external hop and retain confined parent traversal", async (t) => {
  {
    const { root, worktree, board } = await fixture(t);
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-step-erased-hop-"));
    t.after(() => removeTreeWithRetry(outside));
    await fs.writeFile(path.join(worktree, ".gitignore"), "ignored-hop\n");
    await fs.writeFile(path.join(worktree, "victim.txt"), "in-worktree decoy\n");
    git(worktree, "add", ".gitignore", "victim.txt");
    git(worktree, "commit", "-m", "add erased-hop controls");
    try {
      await fs.symlink(outside, path.join(worktree, "ignored-hop"), process.platform === "win32" ? "junction" : "dir");
    } catch (error) {
      t.skip(`filesystem cannot create the erased-hop fixture: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }
    await materializeTrackedLink(worktree, "tracked-erased-hop.txt", "ignored-hop/../victim.txt");
    git(worktree, "commit", "-m", "add raw erased-hop link");
    assert.equal(git(worktree, "status", "--porcelain=v1", "--untracked-files=all"), "");
    const result = await collectWorkspaceSnapshot({
      repoRoot: root,
      boardRoot: board,
      worktree: ".worktrees/ticket",
      branch: "ticket-step",
    });
    assert.equal(result.ok, false);
    assert.match(result.reason, /raw target.*symbolic-link or junction|symbolic-link or junction component before normalization/i);
  }

  {
    const { root, worktree, board } = await fixture(t);
    await fs.mkdir(path.join(worktree, "normal"));
    await fs.writeFile(path.join(worktree, "victim.txt"), "victim\n");
    git(worktree, "add", "victim.txt");
    git(worktree, "commit", "-m", "add parent-traversal controls");
    await materializeTrackedLink(worktree, "normal-parent-link.txt", "normal/../victim.txt");
    await materializeTrackedLink(worktree, "links/confined-parent-link.txt", "../tracked.txt");
    git(worktree, "commit", "-m", "add confined parent links");
    assert.equal(git(worktree, "status", "--porcelain=v1", "--untracked-files=all"), "");
    const result = await collectWorkspaceSnapshot({
      repoRoot: root,
      boardRoot: board,
      worktree: ".worktrees/ticket",
      branch: "ticket-step",
    });
    assert.equal(result.ok, true, result.ok ? undefined : result.reason);
  }
});

test("tracked-link target decoding retains a leading UTF-8 BOM for real links and Windows placeholders", async (t) => {
  for (const representation of ["real-link", "placeholder"]) {
    await t.test(representation, async (t) => {
      const { root, worktree, board } = await fixture(t);
      const outside = await fs.mkdtemp(path.join(os.tmpdir(), `kanmer-step-bom-hop-${representation}-`));
      t.after(() => removeTreeWithRetry(outside));
      const bom = "\uFEFF";
      await fs.mkdir(path.join(worktree, "ignored-hop"));
      await fs.writeFile(path.join(worktree, ".gitignore"), "*ignored-hop\n");
      await fs.writeFile(path.join(worktree, "victim.txt"), "in-worktree decoy\n");
      git(worktree, "add", ".gitignore", "victim.txt");
      git(worktree, "commit", "-m", "add BOM path controls");
      try {
        await fs.symlink(outside, path.join(worktree, `${bom}ignored-hop`), process.platform === "win32" ? "junction" : "dir");
        await materializeTrackedLink(
          worktree,
          `tracked-bom-${representation}.txt`,
          `${bom}ignored-hop/../victim.txt`,
          representation,
        );
      } catch (error) {
        t.skip(`filesystem cannot create the ${representation} BOM fixture: ${error instanceof Error ? error.message : String(error)}`);
        return;
      }
      git(worktree, "commit", "-m", `add ${representation} BOM target`);
      const result = await collectWorkspaceSnapshot({
        repoRoot: root,
        boardRoot: board,
        worktree: ".worktrees/ticket",
        branch: "ticket-step",
      });
      assert.equal(result.ok, false);
      assert.match(result.reason, /raw target.*symbolic-link or junction|symbolic-link or junction component before normalization/i);
    });
  }
});

test("a tracked link to an ignored or untracked target is not observable authority", async (t) => {
  const { root, worktree, board } = await fixture(t);
  await fs.writeFile(path.join(worktree, ".gitignore"), "ignored-target.txt\n");
  await fs.writeFile(path.join(worktree, "ignored-target.txt"), "ignored target\n");
  git(worktree, "add", ".gitignore");
  git(worktree, "commit", "-m", "add ignored target rule");
  await materializeTrackedLink(worktree, "tracked-ignored-link.txt", "ignored-target.txt");
  git(worktree, "commit", "-m", "add link to ignored target");
  assert.equal(git(worktree, "status", "--porcelain=v1", "--untracked-files=all"), "");
  const result = await collectWorkspaceSnapshot({
    repoRoot: root,
    boardRoot: board,
    worktree: ".worktrees/ticket",
    branch: "ticket-step",
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /not an indexed tracked regular path/i);
});

test("tracked-link target bytes are bounded before authority is accepted", async (t) => {
  const { root, worktree, board } = await fixture(t);
  const target = path.join(worktree, "large-target.bin");
  const link = path.join(worktree, "large-link.bin");
  await fs.writeFile(target, Buffer.alloc(2 * 1024 * 1024 + 1, 0x61));
  try {
    await fs.symlink("large-target.bin", link, "file");
  } catch (error) {
    t.skip(`filesystem cannot create the required file symlink: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  git(worktree, "add", "large-target.bin", "large-link.bin");
  git(worktree, "commit", "-m", "add oversized confined link target");
  if (!git(worktree, "ls-files", "-s", "--", "large-link.bin").startsWith("120000 ")) {
    t.skip("Git did not retain the fixture as mode 120000");
    return;
  }
  const result = await collectWorkspaceSnapshot({ repoRoot: root, boardRoot: board, worktree: ".worktrees/ticket", branch: "ticket-step" });
  assert.equal(result.ok, false);
  assert.match(result.reason, /bounded snapshot budget|aggregate bytes|exceeds/i);
});

test("a staged gitlink is refused before workspace-file authority", async (t) => {
  const { root, worktree, board } = await fixture(t);
  const head = git(worktree, "rev-parse", "HEAD");
  git(worktree, "update-index", "--add", "--cacheinfo", `160000,${head},submodule`);
  const result = await collectWorkspaceSnapshot({ repoRoot: root, boardRoot: board, worktree: ".worktrees/ticket", branch: "ticket-step" });
  assert.equal(result.ok, false);
  assert.match(result.reason, /Git link|gitlink/i);
});

test("a non-zero tracked index stage is refused", async (t) => {
  const { root, worktree, board } = await fixture(t);
  const oid = execFileSync("git", ["-C", worktree, "hash-object", "-w", "--stdin"], {
    input: Buffer.from("conflict bytes\n"), encoding: "utf8", windowsHide: true,
  }).trim();
  execFileSync("git", ["-C", worktree, "update-index", "--index-info"], {
    input: `100644 ${oid} 1\tconflict.txt\n`, encoding: "utf8", windowsHide: true,
  });
  const result = await collectWorkspaceSnapshot({ repoRoot: root, boardRoot: board, worktree: ".worktrees/ticket", branch: "ticket-step" });
  assert.equal(result.ok, false);
  assert.match(result.reason, /non-zero index stage/i);
});

test("bounded handle reads reject replacement, short/growing reads and post-read changes and always close", async (t) => {
  const allocatedRoot = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-step-handle-read-"));
  t.after(() => removeTreeWithRetry(allocatedRoot));
  const root = await fs.realpath(allocatedRoot);

  const exercise = async (name, content, hooks, expected) => {
    const absolute = path.join(root, name);
    await fs.writeFile(absolute, content);
    let closes = 0;
    await assert.rejects(
      readBoundedWorkspaceFile(root, absolute, { total: 0 }, {
        ...hooks(absolute),
        afterClose: () => { closes += 1; },
      }),
      expected,
    );
    assert.equal(closes, 1);
    return absolute;
  };

  const replaced = await exercise("replace.txt", "original\n", (absolute) => {
    const displaced = path.join(root, "replace.displaced");
    return {
      afterHandleValidated: async () => {
        await fs.rename(absolute, displaced);
        await fs.writeFile(absolute, "replacement\n");
      },
    };
  }, /changed identity|changed identity, type/i);
  await fs.rm(replaced, { force: true });
  await fs.rm(path.join(root, "replace.displaced"), { force: true });

  await exercise("short.txt", "longer content\n", (absolute) => ({
    afterHandleValidated: () => fs.truncate(absolute, 1),
  }), /short bounded read|changed identity, type/i);
  await exercise("growth.txt", "base\n", (absolute) => ({
    afterHandleValidated: () => fs.appendFile(absolute, "growth beyond the checked size\n"),
  }), /grew during|changed identity, type/i);
  await exercise("post-read.txt", "base\n", (absolute) => ({
    afterRead: () => fs.appendFile(absolute, "changed after read\n"),
  }), /changed identity, type/i);
});

test("bounded handle read refuses a symlink substituted after the path sample where supported", async (t) => {
  const allocatedRoot = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-step-handle-link-"));
  t.after(() => removeTreeWithRetry(allocatedRoot));
  const root = await fs.realpath(allocatedRoot);
  const absolute = path.join(root, "candidate.txt");
  const target = path.join(root, "target.txt");
  const probe = path.join(root, "probe-link.txt");
  await fs.writeFile(absolute, "candidate\n");
  await fs.writeFile(target, "target\n");
  try {
    await fs.symlink(target, probe, "file");
    await fs.rm(probe);
  } catch (error) {
    t.skip(`filesystem cannot create the required file symlink: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  let closes = 0;
  await assert.rejects(
    readBoundedWorkspaceFile(root, absolute, { total: 0 }, {
      beforeOpen: async () => {
        await fs.rm(absolute);
        await fs.symlink(target, absolute, "file");
      },
      afterClose: () => { closes += 1; },
    }),
    /symbolic link|changed identity|ELOOP|too many levels/i,
  );
  assert.ok(closes <= 1);
});

test("a real linked worktree nested beneath a dedicated board worktree is protected", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-step-nested-board-"));
  const board = path.join(root, ".worktrees", "dedicated-board");
  const nested = path.join(board, "nested-ticket");
  t.after(async () => {
    try { execFileSync("git", ["-C", root, "worktree", "remove", "--force", nested], { windowsHide: true, stdio: "ignore" }); } catch {}
    try { execFileSync("git", ["-C", root, "worktree", "remove", "--force", board], { windowsHide: true, stdio: "ignore" }); } catch {}
    await removeTreeWithRetry(root);
  });
  git(root, "init", "-b", "main");
  git(root, "config", "user.email", "fixture@example.invalid");
  git(root, "config", "user.name", "Fixture");
  await fs.writeFile(path.join(root, "tracked.txt"), "base\n");
  git(root, "add", "tracked.txt");
  git(root, "commit", "-m", "base");
  git(root, "worktree", "add", "-b", "dedicated-board", board, "main");
  git(root, "worktree", "add", "-b", "nested-ticket", nested, "main");

  const result = await collectWorkspaceSnapshot({
    repoRoot: root,
    boardRoot: board,
    worktree: ".worktrees/dedicated-board/nested-ticket",
    branch: "nested-ticket",
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /protected board worktree or one of its children/i);
});

test("staged, mixed, untracked and exact whitespace/Unicode/newline paths are retained in lexical order", async (t) => {
  const { root, worktree, board } = await fixture(t);
  await fs.writeFile(path.join(worktree, "tracked.txt"), "staged\n");
  git(worktree, "add", "tracked.txt");
  await fs.writeFile(path.join(worktree, "tracked.txt"), "mixed\n");
  await fs.writeFile(path.join(worktree, " space ü.txt "), "untracked\n");
  await fs.writeFile(path.join(worktree, "!literal.txt"), "literal pathspec\n");
  git(worktree, "add", "!literal.txt");
  const result = await collectWorkspaceSnapshot({ repoRoot: root, boardRoot: board, worktree: ".worktrees/ticket", branch: "ticket-step" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const paths = result.snapshot.entries.map((entry) => entry.path);
  assert.deepEqual(paths, [...paths].sort((left, right) => left < right ? -1 : left > right ? 1 : 0));
  assert.ok(paths.includes(" space ü.txt "));
  assert.ok(paths.includes("!literal.txt"));
  const tracked = result.snapshot.entries.find((entry) => entry.path === "tracked.txt");
  assert.equal(tracked.index, "M");
  assert.equal(tracked.worktree, "M");
});

test("real Git name-status output preserves a Unicode newline filename", async (t) => {
  const { root } = await fixture(t);
  const newlinePath = "line\n雪.ts";
  const blob = execFileSync("git", ["-C", root, "hash-object", "-w", "--stdin"], {
    input: Buffer.from("newline path\n"), encoding: "utf8", windowsHide: true,
  }).trim();
  const tree = execFileSync("git", ["-C", root, "mktree", "-z"], {
    input: Buffer.from(`100644 blob ${blob}\t${newlinePath}\0`, "utf8"), encoding: "utf8", windowsHide: true,
  }).trim();
  const commit = execFileSync("git", ["-C", root, "commit-tree", tree, "-p", "HEAD", "-m", "newline tree"], {
    encoding: "utf8", windowsHide: true,
  }).trim();
  const raw = execFileSync("git", ["-C", root, "diff", "--name-status", "-z", "HEAD", commit, "--"], {
    encoding: "buffer", windowsHide: true,
  });
  assert.ok(parseNameStatusZ(raw).includes(newlinePath));
});

test("a staged rename followed by a worktree rename preserves every role", async (t) => {
  const { root, worktree, board } = await fixture(t);
  git(worktree, "mv", "tracked.txt", "staged name ü.txt");
  await fs.rename(path.join(worktree, "staged name ü.txt"), path.join(worktree, "worktree name.txt"));
  const result = await collectWorkspaceSnapshot({ repoRoot: root, boardRoot: board, worktree: ".worktrees/ticket", branch: "ticket-step" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const paths = result.snapshot.entries.map((entry) => entry.path);
  assert.ok(paths.includes("tracked.txt"));
  assert.ok(paths.includes("staged name ü.txt"));
  assert.ok(paths.includes("worktree name.txt"));
});

test("a staged rename source recreated as untracked retains both same-path entries", async (t) => {
  const { root, worktree, board } = await fixture(t);
  git(worktree, "mv", "tracked.txt", "renamed.txt");
  await fs.writeFile(path.join(worktree, "tracked.txt"), "recreated source\n");
  const result = await collectWorkspaceSnapshot({ repoRoot: root, boardRoot: board, worktree: ".worktrees/ticket", branch: "ticket-step" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const sourceEntries = result.snapshot.entries.filter((entry) => entry.path === "tracked.txt");
  assert.equal(sourceEntries.length, 2);
  assert.deepEqual(sourceEntries.map((entry) => `${entry.index}${entry.worktree}`).sort(), ["??", "R."]);
  assert.notEqual(sourceEntries[0].content, sourceEntries[1].content);
});

test("a second change to a pre-dirty path changes its canonical identity", async (t) => {
  const { root, worktree, board } = await fixture(t);
  await fs.writeFile(path.join(worktree, "tracked.txt"), "first\n");
  const baseline = await collectWorkspaceSnapshot({ repoRoot: root, boardRoot: board, worktree: ".worktrees/ticket", branch: "ticket-step" });
  assert.equal(baseline.ok, true);
  if (!baseline.ok) return;
  await fs.writeFile(path.join(worktree, "tracked.txt"), "second\n");
  const current = await collectWorkspaceSnapshot({ repoRoot: root, boardRoot: board, worktree: ".worktrees/ticket", branch: "ticket-step", baseline: baseline.snapshot });
  assert.equal(current.ok, true);
  if (!current.ok) return;
  assert.notEqual(current.snapshot.entries[0].content, baseline.snapshot.entries[0].content);
});

test("a pre-dirty index mode change changes identity even when blob bytes do not", async (t) => {
  const { root, worktree, board } = await fixture(t);
  await fs.writeFile(path.join(worktree, "tracked.txt"), "staged content\n");
  git(worktree, "add", "tracked.txt");
  const baseline = await collectWorkspaceSnapshot({ repoRoot: root, boardRoot: board, worktree: ".worktrees/ticket", branch: "ticket-step" });
  assert.equal(baseline.ok, true);
  if (!baseline.ok) return;
  git(worktree, "update-index", "--chmod=+x", "tracked.txt");
  const current = await collectWorkspaceSnapshot({ repoRoot: root, boardRoot: board, worktree: ".worktrees/ticket", branch: "ticket-step", baseline: baseline.snapshot });
  assert.equal(current.ok, true);
  if (!current.ok) return;
  assert.notEqual(current.snapshot.entries.find((entry) => entry.path === "tracked.txt").content,
    baseline.snapshot.entries.find((entry) => entry.path === "tracked.txt").content);
});

test("a dirty hard-linked file is inconclusive instead of authorising an external mutation", async (t) => {
  const { root, worktree, board } = await fixture(t);
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-step-hardlink-"));
  t.after(() => removeTreeWithRetry(outside));
  const external = path.join(outside, "external.txt");
  await fs.writeFile(external, "outside mutation\n");
  await fs.rm(path.join(worktree, "tracked.txt"));
  try {
    await fs.link(external, path.join(worktree, "tracked.txt"));
  } catch (error) {
    t.skip(`filesystem cannot create the required hard link: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  const result = await collectWorkspaceSnapshot({ repoRoot: root, boardRoot: board, worktree: ".worktrees/ticket", branch: "ticket-step" });
  assert.equal(result.ok, false);
  assert.match(result.reason, /hard-linked/i);
});

test("a clean tracked hardlink is refused even when Git reports no content change", async (t) => {
  const { root, worktree, board } = await fixture(t);
  const alias = path.join(root, "outside-hardlink.txt");
  try {
    await fs.link(path.join(worktree, "tracked.txt"), alias);
  } catch (error) {
    t.skip(`filesystem cannot create the required hard link: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  assert.equal(git(worktree, "status", "--porcelain=v1"), "");
  const result = await collectWorkspaceSnapshot({ repoRoot: root, boardRoot: board, worktree: ".worktrees/ticket", branch: "ticket-step" });
  assert.equal(result.ok, false);
  assert.match(result.reason, /hard-linked|filesystem links|single workspace identity/i);
});

test("same-byte clean file replacement between samples remains internal snapshot drift", async (t) => {
  const { root, worktree, board } = await fixture(t);
  const tracked = path.join(worktree, "tracked.txt");
  const original = await fs.readFile(tracked);
  const result = await collectWorkspaceSnapshot({
    repoRoot: root,
    boardRoot: board,
    worktree: ".worktrees/ticket",
    branch: "ticket-step",
    betweenSamples: async () => {
      await fs.rm(tracked);
      await fs.writeFile(tracked, original);
    },
  });
  assert.equal(git(worktree, "status", "--porcelain=v1"), "");
  assert.equal(result.ok, false);
  assert.match(result.reason, /changed during the bounded double-sample/i);
});

test("a missing indexed regular file must agree with the same capture's porcelain deletion", async (t) => {
  const { root, worktree, board } = await fixture(t);
  await fs.rm(path.join(worktree, "tracked.txt"));
  const ordinary = await collectWorkspaceSnapshot({ repoRoot: root, boardRoot: board, worktree: ".worktrees/ticket", branch: "ticket-step" });
  assert.equal(ordinary.ok, true);

  const dishonestRun = async (cwd, args) => {
    if (args[0] === "status") return Buffer.alloc(0);
    return execFileSync("git", ["--no-optional-locks", "-C", cwd, ...args], {
      encoding: "buffer", windowsHide: true, maxBuffer: 2 * 1024 * 1024,
    });
  };
  const hidden = await collectWorkspaceSnapshot({
    repoRoot: root,
    boardRoot: board,
    worktree: ".worktrees/ticket",
    branch: "ticket-step",
    run: dishonestRun,
  });
  assert.equal(hidden.ok, false);
  assert.match(hidden.reason, /missing.*porcelain|porcelain.*missing/i);
});

test("porcelain deletion remains authoritative when a tracked file's parent directory is also absent", async (t) => {
  const { root, worktree, board } = await fixture(t);
  const nested = path.join(worktree, "nested", "tracked.txt");
  await fs.mkdir(path.dirname(nested), { recursive: true });
  await fs.writeFile(nested, "nested\n");
  git(worktree, "add", "nested/tracked.txt");
  git(worktree, "commit", "-m", "add nested tracked file");
  await fs.rm(path.dirname(nested), { recursive: true });
  const result = await collectWorkspaceSnapshot({
    repoRoot: root,
    boardRoot: board,
    worktree: ".worktrees/ticket",
    branch: "ticket-step",
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.ok(result.snapshot.entries.some((entry) => entry.path === "nested/tracked.txt"));
});

test("ignored files and Git common-directory metadata are explicitly outside the collected path evidence", async (t) => {
  const { root, worktree, board } = await fixture(t);
  const excludeValue = git(worktree, "rev-parse", "--git-path", "info/exclude");
  const exclude = path.isAbsolute(excludeValue) ? excludeValue : path.resolve(worktree, excludeValue);
  await fs.mkdir(path.dirname(exclude), { recursive: true });
  await fs.appendFile(exclude, "\nignored-worker-output.txt\n");
  await fs.writeFile(path.join(worktree, "ignored-worker-output.txt"), "not observable by status\n");
  const result = await collectWorkspaceSnapshot({ repoRoot: root, boardRoot: board, worktree: ".worktrees/ticket", branch: "ticket-step" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.snapshot.entries.some((entry) => entry.path === "ignored-worker-output.txt"), false);
  assert.deepEqual(result.headChanges, []);
});

test("committed changes and rename endpoints are retained against the baseline HEAD", async (t) => {
  const { root, worktree, board } = await fixture(t);
  const baseline = await collectWorkspaceSnapshot({ repoRoot: root, boardRoot: board, worktree: ".worktrees/ticket", branch: "ticket-step" });
  assert.equal(baseline.ok, true);
  if (!baseline.ok) return;
  git(worktree, "mv", "tracked.txt", "renamed ü.txt");
  git(worktree, "commit", "-m", "rename");
  const current = await collectWorkspaceSnapshot({ repoRoot: root, boardRoot: board, worktree: ".worktrees/ticket", branch: "ticket-step", baseline: baseline.snapshot });
  assert.equal(current.ok, true);
  if (!current.ok) return;
  assert.deepEqual(current.headChanges, ["tracked.txt", "renamed ü.txt"]);
});

test("detached, foreign, board, symlink and parent-link workspaces fail closed", async (t) => {
  const { root, worktree, board } = await fixture(t);
  const boardAlias = await collectWorkspaceSnapshot({ repoRoot: root, boardRoot: worktree, worktree: ".worktrees/ticket", branch: "ticket-step" });
  assert.equal(boardAlias.ok, false);
  await fs.mkdir(path.join(worktree, "child"));
  const boardChild = await collectWorkspaceSnapshot({ repoRoot: root, boardRoot: worktree, worktree: ".worktrees/ticket/child", branch: "ticket-step" });
  assert.equal(boardChild.ok, false);
  assert.match(boardChild.reason, /board worktree or one of its children/i);

  indexEntry(worktree, "120000", "link.txt", "outside.txt");
  const indexedLink = await collectWorkspaceSnapshot({ repoRoot: root, boardRoot: board, worktree: ".worktrees/ticket", branch: "ticket-step" });
  assert.equal(indexedLink.ok, false);
  assert.match(indexedLink.reason, /symbolic link/i);
  git(worktree, "update-index", "--force-remove", "--", "link.txt");

  const outside = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-step-outside-"));
  t.after(() => removeTreeWithRetry(outside));
  await fs.writeFile(path.join(outside, "payload.txt"), "outside\n");
  await fs.symlink(outside, path.join(worktree, "escape"), process.platform === "win32" ? "junction" : "dir");
  indexEntry(worktree, "100644", "escape/payload.txt", "outside\n");
  const parentLink = await collectWorkspaceSnapshot({ repoRoot: root, boardRoot: board, worktree: ".worktrees/ticket", branch: "ticket-step" });
  assert.equal(parentLink.ok, false);
  assert.match(parentLink.reason, /outside the physical worktree/i);
  git(worktree, "update-index", "--force-remove", "--", "escape/payload.txt");
  await fs.rm(path.join(worktree, "escape"), { force: true });

  const foreign = path.join(root, "foreign");
  await fs.mkdir(foreign);
  git(foreign, "init", "-b", "foreign-branch");
  git(foreign, "config", "user.email", "fixture@example.invalid");
  git(foreign, "config", "user.name", "Fixture");
  await fs.writeFile(path.join(foreign, "foreign.txt"), "foreign\n");
  git(foreign, "add", "foreign.txt");
  git(foreign, "commit", "-m", "foreign");
  const foreignResult = await collectWorkspaceSnapshot({ repoRoot: root, boardRoot: board, worktree: "foreign", branch: "foreign-branch" });
  assert.equal(foreignResult.ok, false);
  assert.match(foreignResult.reason, /foreign repository/i);

  git(worktree, "checkout", "--detach");
  const detached = await collectWorkspaceSnapshot({ repoRoot: root, boardRoot: board, worktree: ".worktrees/ticket", branch: "ticket-step" });
  assert.equal(detached.ok, false);
});

test("a recorded junction cannot redirect a same-repository worktree outside the source root", async (t) => {
  const { root, board } = await fixture(t);
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-step-external-worktree-"));
  const alias = path.join(root, ".worktrees", "escaped-root");
  git(root, "worktree", "add", "-b", "escaped-root", outside, "main");
  t.after(async () => {
    await fs.rm(alias, { force: true });
    try { execFileSync("git", ["-C", root, "worktree", "remove", "--force", outside], { windowsHide: true, stdio: "ignore" }); } catch {}
    await removeTreeWithRetry(outside);
  });
  try {
    await fs.symlink(outside, alias, process.platform === "win32" ? "junction" : "dir");
  } catch (error) {
    t.skip(`platform cannot create the required worktree alias: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  const result = await collectWorkspaceSnapshot({ repoRoot: root, boardRoot: board, worktree: ".worktrees/escaped-root", branch: "escaped-root" });
  assert.equal(result.ok, false);
  assert.match(result.reason, /outside the physical source repository/i);
});

test("timeout and content-budget overflow are inconclusive", async (t) => {
  const { root, worktree, board } = await fixture(t);
  await fs.writeFile(path.join(worktree, "too-large.bin"), Buffer.alloc(2 * 1024 * 1024 + 1));
  const overflow = await collectWorkspaceSnapshot({ repoRoot: root, boardRoot: board, worktree: ".worktrees/ticket", branch: "ticket-step" });
  assert.equal(overflow.ok, false);
  assert.match(overflow.reason, /bounded snapshot budget/i);
  const timeout = await collectWorkspaceSnapshot({
    repoRoot: root,
    boardRoot: board,
    worktree: ".worktrees/ticket",
    branch: "ticket-step",
    run: async () => { throw Object.assign(new Error("git timed out"), { code: "ETIMEDOUT" }); },
  });
  assert.equal(timeout.ok, false);
  assert.match(timeout.reason, /timed out/i);

  const aggregate = await collectWorkspaceSnapshot({
    repoRoot: root,
    boardRoot: board,
    worktree: ".worktrees/ticket",
    branch: "ticket-step",
    maxDurationMs: 10,
    run: async () => new Promise((resolve) => setTimeout(() => resolve(Buffer.alloc(0)), 50)),
  });
  assert.equal(aggregate.ok, false);
  assert.match(aggregate.reason, /aggregate workspace collection deadline exhausted/i);
});

test("the aggregate deadline is enforced inside the non-Git regular-file census", async (t) => {
  const { root, board } = await fixture(t);
  let now = 0;
  let visited = null;
  const result = await collectWorkspaceSnapshot({
    repoRoot: root,
    boardRoot: board,
    worktree: ".worktrees/ticket",
    branch: "ticket-step",
    testHooks: {
      now: () => now,
      beforeRegularCensusEntry: (trackedPath) => {
        visited = trackedPath;
        now = 30_001;
      },
    },
  });
  assert.equal(visited, "tracked.txt");
  assert.equal(result.ok, false);
  assert.match(result.reason, /aggregate workspace collection deadline exhausted/i);
});

test("missing, branch-mismatched and malformed output are inconclusive", async (t) => {
  const { root, board } = await fixture(t);
  assert.equal((await collectWorkspaceSnapshot({ repoRoot: root, boardRoot: board, worktree: ".worktrees/missing", branch: "x" })).ok, false);
  assert.equal((await collectWorkspaceSnapshot({ repoRoot: root, boardRoot: board, worktree: ".worktrees/ticket", branch: "wrong" })).ok, false);
  let calls = 0;
  const malformed = await collectWorkspaceSnapshot({
    repoRoot: root,
    boardRoot: board,
    worktree: ".worktrees/ticket",
    branch: "ticket-step",
    run: async (_cwd, args) => {
      calls += 1;
      if (args[0] === "rev-parse" && args[1] === "--git-common-dir") return Buffer.from(git(root, "rev-parse", "--git-common-dir"));
      if (args[0] === "symbolic-ref") return Buffer.from("ticket-step\n");
      if (args[0] === "rev-parse") return Buffer.from(`${git(root, "rev-parse", "HEAD")}\n`);
      return Buffer.from("?? truncated", "utf8");
    },
  });
  assert.equal(malformed.ok, false);
  assert.ok(calls > 0);
});
