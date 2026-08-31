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

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-step-reconcile-"));
  t.after(() => removeTreeWithRetry(root));
  git(root, "init", "-b", "main");
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
  const census = parseIndexFlagCensus(Buffer.from("H normal.txt\0h assumed.txt\0S skipped.txt\0s both\n雪.txt\0", "utf8"));
  assert.equal(census.count, 4);
  assert.deepEqual(census.assumeUnchanged, ["assumed.txt", "both\n雪.txt"]);
  assert.deepEqual(census.skipWorktree, ["skipped.txt", "both\n雪.txt"]);
  assert.match(census.digest, /^[0-9a-f]{64}$/);
  assert.throws(() => parseIndexFlagCensus(Buffer.from("H unterminated", "utf8")), /terminated by NUL/);
  assert.throws(() => parseIndexFlagCensus(Buffer.from("H \0", "utf8")), /empty tracked path/);
  assert.throws(() => parseIndexFlagCensus(Buffer.alloc(2 * 1024 * 1024 + 1)), /exceeds.*bytes/i);
  assert.throws(
    () => parseIndexFlagCensus(Buffer.from(Array.from({ length: 65_537 }, (_, index) => `H p${index}\0`).join(""), "utf8")),
    /exceeds.*tracked entries/i,
  );
});

test("more than 256 revision-exempt scratch/reference docs do not exhaust the authority census", async () => {
  const inventory = Array.from({ length: 300 }, (_, index) => ({
    doc: `${index % 2 ? "scratch" : "reference"}/note-${String(index).padStart(3, "0")}.md`,
    exists: true,
    content: "note",
    version: "a".repeat(16),
  }));
  const item = { id: "TICK-001", type: "ticket", title: "fixture", status: "implementing", priority: "medium", labels: [], links: [], body: "", created: "2026-08-31T00:00:00.000Z", updated: "2026-08-31T00:00:00.000Z" };
  const store = {
    getRevision: async () => ({ revision: "rev1:stable" }),
    getItem: async () => item,
    getDocsWithVersions: async () => [],
    listTicketDocsWithVersions: async () => inventory,
    batchState: async () => null,
    getDocGates: async () => ({ profile: "custom", boundaries: [] }),
    getGroup: async () => null,
    getGroupDoc: async () => null,
  };
  const result = await collectStepDocumentSnapshot(store, "TICK-001");
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.snapshot.inventory.length, 300);
});

test("stable document collection de-duplicates repeated identical ticket groups", async () => {
  const item = {
    id: "TICK-001", type: "ticket", title: "fixture", status: "implementing", priority: "medium",
    labels: [], links: [], groups: ["HZN-001", "HZN-001"], body: "",
    created: "2026-08-31T00:00:00.000Z", updated: "2026-08-31T00:00:00.000Z",
  };
  let groupReads = 0;
  const store = {
    getRevision: async () => ({ revision: "rev1:stable" }),
    getItem: async () => item,
    getDocsWithVersions: async () => [],
    listTicketDocsWithVersions: async () => [],
    batchState: async () => null,
    getDocGates: async () => ({ profile: "custom", boundaries: [] }),
    getGroup: async () => {
      groupReads += 1;
      return { id: "HZN-001", kind: "horizon", title: "Release", body: "Context body" };
    },
    getGroupDoc: async () => "Frozen context",
  };
  const result = await collectStepDocumentSnapshot(store, "TICK-001");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(groupReads, 2, "one group read in each stable sample");
  assert.equal(result.snapshot.groups.length, 1);
  assert.equal(result.snapshot.evidence.filter((entry) => entry.layer === "group").length, 1);
});

test("group authority is bounded on its unique census before any group or context read", async () => {
  const groupLimit = STEP_PACKET_LIMITS.maxDocuments;
  const makeStore = (groups) => {
    let groupReads = 0;
    let contextReads = 0;
    const item = {
      id: "TICK-001", type: "ticket", title: "fixture", status: "implementing", priority: "medium",
      labels: [], links: [], groups, body: "",
      created: "2026-08-31T00:00:00.000Z", updated: "2026-08-31T00:00:00.000Z",
    };
    return {
      reads: () => ({ groupReads, contextReads }),
      store: {
        getRevision: async () => ({ revision: "rev1:stable" }),
        getItem: async () => item,
        getDocsWithVersions: async () => [],
        listTicketDocsWithVersions: async () => [],
        batchState: async () => null,
        getDocGates: async () => ({ profile: "custom", boundaries: [] }),
        getGroup: async (id) => {
          groupReads += 1;
          return { id, kind: "horizon", title: id, body: "Context body" };
        },
        getGroupDoc: async () => {
          contextReads += 1;
          return "Frozen context";
        },
      },
    };
  };

  const atLimit = makeStore(Array.from({ length: groupLimit }, (_, index) => `HZN-${String(index).padStart(3, "0")}`));
  const accepted = await collectStepDocumentSnapshot(atLimit.store, "TICK-001");
  assert.equal(accepted.ok, true);
  assert.deepEqual(atLimit.reads(), { groupReads: groupLimit * 2, contextReads: groupLimit * 2 });

  const overLimit = makeStore(Array.from({ length: groupLimit + 1 }, (_, index) => `HZN-${String(index).padStart(3, "0")}`));
  const refused = await collectStepDocumentSnapshot(overLimit.store, "TICK-001");
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /group.*census|group.*limit|array.*entries/i);
  assert.deepEqual(overLimit.reads(), { groupReads: 0, contextReads: 0 });

  const duplicates = makeStore(Array.from({ length: groupLimit * 4 }, () => "HZN-001"));
  const collapsed = await collectStepDocumentSnapshot(duplicates.store, "TICK-001");
  assert.equal(collapsed.ok, true);
  assert.deepEqual(duplicates.reads(), { groupReads: 2, contextReads: 2 });
  if (collapsed.ok) assert.deepEqual(collapsed.snapshot.item.groups, ["HZN-001"]);

  const oneCountedDocument = makeStore(Array.from({ length: groupLimit }, (_, index) => `HZN-${String(index).padStart(3, "0")}`));
  oneCountedDocument.store.listTicketDocsWithVersions = async () => [{
    doc: "proof/proof.md", exists: true, content: "proof", version: "a".repeat(16),
  }];
  const combinedOverflow = await collectStepDocumentSnapshot(oneCountedDocument.store, "TICK-001");
  assert.equal(combinedOverflow.ok, false);
  assert.match(combinedOverflow.reason, /combined counted-document and unique-group census/i);
  assert.deepEqual(oneCountedDocument.reads(), { groupReads: 0, contextReads: 0 });
});

test("a missing group after a valid bounded census refuses before a context read", async () => {
  let groupReads = 0;
  let contextReads = 0;
  const store = {
    getRevision: async () => ({ revision: "rev1:stable" }),
    getItem: async () => ({
      id: "TICK-001", type: "ticket", title: "fixture", status: "implementing", priority: "medium",
      labels: [], links: [], groups: ["HZN-001"], body: "",
      created: "2026-08-31T00:00:00.000Z", updated: "2026-08-31T00:00:00.000Z",
    }),
    getDocsWithVersions: async () => [],
    listTicketDocsWithVersions: async () => [],
    batchState: async () => null,
    getDocGates: async () => ({ profile: "custom", boundaries: [] }),
    getGroup: async () => { groupReads += 1; return null; },
    getGroupDoc: async () => { contextReads += 1; return null; },
  };
  const result = await collectStepDocumentSnapshot(store, "TICK-001");
  assert.equal(result.ok, false);
  assert.match(result.reason, /group.*missing/i);
  assert.equal(groupReads, 1);
  assert.equal(contextReads, 0);
});

test("a conflicting resolved group identity refuses before a context read", async () => {
  let groupReads = 0;
  let contextReads = 0;
  const store = {
    getRevision: async () => ({ revision: "rev1:stable" }),
    getItem: async () => ({
      id: "TICK-001", type: "ticket", title: "fixture", status: "implementing", priority: "medium",
      labels: [], links: [], groups: ["HZN-001"], body: "",
      created: "2026-08-31T00:00:00.000Z", updated: "2026-08-31T00:00:00.000Z",
    }),
    getDocsWithVersions: async () => [],
    listTicketDocsWithVersions: async () => [],
    batchState: async () => null,
    getDocGates: async () => ({ profile: "custom", boundaries: [] }),
    getGroup: async () => {
      groupReads += 1;
      return { id: "HZN-OTHER", kind: "horizon", title: "Wrong group", body: "Conflicting authority" };
    },
    getGroupDoc: async () => {
      contextReads += 1;
      return "must not be read";
    },
  };
  const result = await collectStepDocumentSnapshot(store, "TICK-001");
  assert.equal(result.ok, false);
  assert.match(result.reason, /conflicting identity/i);
  assert.equal(groupReads, 1);
  assert.equal(contextReads, 0);
});

test("oversized counted document authority is refused before packet hashing or Git observation", async () => {
  const inventory = [{
    doc: "proof/proof.md",
    exists: true,
    content: "x".repeat(STEP_PACKET_LIMITS.maxStringBytes + 1),
    version: "a".repeat(16),
  }];
  const item = { id: "TICK-001", type: "ticket", title: "fixture", status: "implementing", priority: "medium", labels: [], links: [], body: "", created: "2026-08-31T00:00:00.000Z", updated: "2026-08-31T00:00:00.000Z" };
  const store = {
    getRevision: async () => ({ revision: "rev1:stable" }),
    getItem: async () => item,
    getDocsWithVersions: async () => [],
    listTicketDocsWithVersions: async () => inventory,
    batchState: async () => null,
    getDocGates: async () => ({ profile: "custom", boundaries: [] }),
    getGroup: async () => null,
    getGroupDoc: async () => null,
  };
  const result = await collectStepDocumentSnapshot(store, "TICK-001");
  assert.equal(result.ok, false);
  assert.match(result.reason, /bounded snapshot|encoded bytes/i);
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

test("bounded handle reads reject replacement, short/growing reads and post-read changes and always close", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-step-handle-read-"));
  t.after(() => removeTreeWithRetry(root));

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
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-step-handle-link-"));
  t.after(() => removeTreeWithRetry(root));
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
  assert.match(aggregate.reason, /aggregate Git collection deadline exhausted/i);
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
