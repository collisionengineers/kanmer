// Unit coverage for the FRD-029 named endpoint registry (MCP-054). Runs
// against dist/ like the other server tests; git/os probes are stubbed so the
// observation contract is exercised without a repository.
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm, stat, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { removeTreeWithRetry } from "@kanmer/core";

const { KanmerStore } = await import("@kanmer/core");
const registry = await import(new URL("../dist/project-registry.js", import.meta.url));
const {
  ENDPOINT_REGISTRY_ENV,
  observeEndpoint,
  observeRegistry,
  parseRegistry,
  registryLocation,
  upsertEndpoint,
  validateEntry,
  writeRegistry,
} = registry;

const deps = {
  inspectBoardBranch: async () => "kanmer-board",
  inspectBoardSync: async (_root, branch) => ({ remoteBranch: branch, localSha: "a", remoteSha: "a", ahead: 0, behind: 0 }),
  resolveLocation: async (input) => ({ repoPath: input.repoPath, boardPath: input.boardPath, machine: "test", boardBranch: input.boardBranch, remoteOrigin: null, fingerprint: `kanmer-loc-v1:${input.boardPath}` }),
  now: () => new Date("2026-08-27T12:00:00.000Z"),
};

async function snapshot(dir) {
  const out = [];
  async function walk(current) {
    for (const entry of (await readdir(current, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else out.push([path.relative(dir, full), (await stat(full)).size, await readFile(full, "utf8")]);
    }
  }
  await walk(dir);
  return JSON.stringify(out);
}

const home = await mkdtemp(path.join(os.tmpdir(), "kanmer-registry-home-"));
const boardA = path.join(home, "alpha");
const boardB = path.join(home, "beta");
test.before(async () => {
  // A: a board born with a logical identity and one live claim plus one expired one.
  const storeA = new KanmerStore(boardA, { actor: "test" });
  await storeA.init({ fallbackFingerprint: "kanmer-proj-v1:" + "a".repeat(64) });
  const live = await storeA.createItem({ type: "ticket", title: "live", profile: "chore" });
  await storeA.takeTicket(live.id, { branch: "live-branch", worktree: ".worktrees/live", assignee: "controller-one", stage: "backlog" });
  const expired = await storeA.createItem({ type: "ticket", title: "expired", profile: "chore" });
  await storeA.takeTicket(expired.id, { branch: "old-branch", assignee: "controller-two", stage: "backlog" });
  // Expire the second claim in place: the registry classifies what the board says, it never renews or releases.
  const expiredFile = path.join(boardA, ".kanmer", "areas", "_none", expired.id, `${expired.id}.md`);
  const text = await readFile(expiredFile, "utf8");
  assert.match(text, /^claim_expires_at: /m);
  await writeFile(expiredFile, text.replace(/^claim_expires_at: .*$/m, "claim_expires_at: 2026-08-27T11:00:00.000Z"), "utf8");
  // B: a legacy board (no project.json) — identity unassigned.
  const storeB = new KanmerStore(boardB, { actor: "test" });
  await storeB.init({ fallbackFingerprint: "kanmer-proj-v1:" + "b".repeat(64) });
  await rm(path.join(boardB, ".kanmer", "project.json"), { force: true });
});
test.after(async () => { await removeTreeWithRetry(home); });

test("registry location is decided by the spawning environment, never a request", () => {
  assert.deepEqual(registryLocation({}, home), { path: path.join(home, ".kanmer", "endpoints.json"), source: "default" });
  const absolute = path.join(home, "custom.json");
  assert.deepEqual(registryLocation({ [ENDPOINT_REGISTRY_ENV]: absolute }, home), { path: absolute, source: "env" });
  const relative = registryLocation({ [ENDPOINT_REGISTRY_ENV]: "relative/endpoints.json" }, home);
  assert.equal(relative.source, "env");
  assert.match(relative.error, /absolute/);
});

test("parse and entry validation refuse malformed input without dropping entries", () => {
  assert.equal(parseRegistry("{").ok, false);
  assert.equal(parseRegistry("[]").ok, false);
  assert.match(parseRegistry(JSON.stringify({ schema: 2, endpoints: {} })).error, /schema/);
  assert.match(parseRegistry(JSON.stringify({ schema: 1, endpoints: [] })).error, /endpoints/);
  const parsed = parseRegistry(JSON.stringify({ schema: 1, endpoints: { ok: { boardRoot: boardA }, bad: { boardRoot: "x/y" } } }));
  assert.equal(parsed.ok, true);
  assert.deepEqual(Object.keys(parsed.file.endpoints), ["ok", "bad"]);
  assert.deepEqual(validateEntry("ok", { boardRoot: boardA }), []);
  assert.match(validateEntry("ok", { boardRoot: "x/y" })[0], /absolute/);
  assert.match(validateEntry("ok", {})[0], /boardRoot/);
  assert.match(validateEntry("ok", null)[0], /object/);
  assert.match(validateEntry("Bad Name", { boardRoot: boardA })[0], /name/);
  assert.match(validateEntry("ok", { boardRoot: boardA, repoRoot: "rel" })[0], /repoRoot/);
  assert.match(validateEntry("ok", { boardRoot: boardA, boardBranch: "" })[0], /boardBranch/);
  assert.match(validateEntry("ok", { boardRoot: boardA, policy: 3 })[0], /policy/);
});

test("observes two fixtures through fresh read-only stores and never writes", async () => {
  const before = await snapshot(home);
  const bound = { project_id: null, board_id: null, identity: "unassigned", origin: null, fingerprint: "kanmer-proj-v1:" + "0".repeat(64) };
  const a = await observeEndpoint("alpha", { boardRoot: boardA, policy: "main-only", boardBranch: "kanmer-board" }, deps, bound);
  assert.equal(a.health, "ok");
  assert.equal(a.project.identity, "logical");
  assert.match(a.project.project_id, /^[0-9a-f-]{36}$/);
  assert.equal(a.project.board_id, a.project.project_id);
  assert.match(a.project.fingerprint, /^kanmer-proj-v1:[0-9a-f]{64}$/);
  assert.equal(a.policy, "main-only");
  assert.equal(a.bound, false);
  assert.equal(a.ticketCount, 2);
  assert.deepEqual(a.boardSync, { remoteBranch: "kanmer-board", localSha: "a", remoteSha: "a", ahead: 0, behind: 0 });
  assert.equal(a.location.boardPath, boardA);
  assert.deepEqual(a.controllers, [
    { controller: "controller-one", tickets: ["TICK-001"] },
    { controller: "controller-two", tickets: ["TICK-002"] },
  ]);
  assert.deepEqual(a.workspaces.map((w) => [w.ticket, w.branch, w.worktree, w.claim]), [
    ["TICK-001", "live-branch", ".worktrees/live", "live"],
    ["TICK-002", "old-branch", null, "expired"],
  ]);
  assert.deepEqual(a.problems, []);

  const b = await observeEndpoint("beta", { boardRoot: boardB }, deps, bound);
  assert.equal(b.health, "unassigned");
  assert.equal(b.project.project_id, null);
  assert.equal(b.project.identity, "unassigned");
  assert.deepEqual(b.controllers, []);
  assert.deepEqual(b.workspaces, []);

  // Bound matching: logical id first, legacy fingerprint as the fallback.
  const boundA = await observeEndpoint("alpha", { boardRoot: boardA }, deps, a.project);
  assert.equal(boundA.bound, true);
  const boundByFingerprint = await observeEndpoint("beta", { boardRoot: boardB }, deps, b.project);
  assert.equal(boundByFingerprint.bound, true);
  const wrong = await observeEndpoint("beta", { boardRoot: boardB }, deps, a.project);
  assert.equal(wrong.bound, false);

  const missing = await observeEndpoint("gone", { boardRoot: path.join(home, "nowhere") }, deps, bound);
  assert.equal(missing.health, "missing-board");
  assert.equal(missing.project, null);
  const invalid = await observeEndpoint("bad", { boardRoot: "relative" }, deps, bound);
  assert.equal(invalid.health, "invalid");
  assert.match(invalid.problems[0], /absolute/);
  const branchDrift = await observeEndpoint("alpha", { boardRoot: boardA, boardBranch: "other" }, deps, bound);
  assert.equal(branchDrift.health, "ok");
  assert.match(branchDrift.problems[0], /registry expects "other"/);
  assert.equal(await snapshot(home), before, "observation must not write to any board");
});

test("observeRegistry reports a missing or malformed file and keeps every named entry", async () => {
  const file = path.join(home, "endpoints.json");
  const env = { [ENDPOINT_REGISTRY_ENV]: file };
  const absent = await observeRegistry(env, home, deps, null);
  assert.deepEqual(absent, { registry: { path: file, source: "env", exists: false, error: null }, endpoints: [], missing: [] });
  await writeFile(file, "nope", "utf8");
  const malformed = await observeRegistry(env, home, deps, null);
  assert.equal(malformed.registry.exists, true);
  assert.match(malformed.registry.error, /JSON/);
  assert.deepEqual(malformed.endpoints, []);
  await writeRegistry(file, { schema: 1, endpoints: { beta: { boardRoot: boardB }, alpha: { boardRoot: boardA } } });
  await writeFile(file, JSON.stringify({ schema: 1, endpoints: { beta: { boardRoot: boardB }, alpha: { boardRoot: boardA }, gamma: { boardRoot: "rel" } } }), "utf8");
  const all = await observeRegistry(env, home, deps, null);
  assert.deepEqual(all.endpoints.map((e) => [e.name, e.health]), [["alpha", "ok"], ["beta", "unassigned"], ["gamma", "invalid"]]);
  const one = await observeRegistry(env, home, deps, null, { name: "beta" });
  assert.deepEqual(one.endpoints.map((e) => e.name), ["beta"]);
  assert.deepEqual(one.missing, []);
  const none = await observeRegistry(env, home, deps, null, { name: "delta" });
  assert.deepEqual(none.endpoints, []);
  assert.deepEqual(none.missing, ["delta"]);
  const relative = await observeRegistry({ [ENDPOINT_REGISTRY_ENV]: "rel.json" }, home, deps, null);
  assert.match(relative.registry.error, /absolute/);
  assert.deepEqual(relative.endpoints, []);
});

test("writeRegistry/upsertEndpoint validate first and write atomically", async () => {
  const file = path.join(home, "written", "endpoints.json");
  await assert.rejects(() => writeRegistry("relative.json", { schema: 1, endpoints: {} }), /absolute/);
  await assert.rejects(() => writeRegistry(file, { schema: 1, endpoints: { bad: { boardRoot: "rel" } } }), /bad: boardRoot/);
  await assert.rejects(() => writeRegistry(file, { schema: 2, endpoints: {} }), /schema/);
  const first = await upsertEndpoint(file, "alpha", { boardRoot: boardA });
  assert.deepEqual(first, { schema: 1, endpoints: { alpha: { boardRoot: boardA } } });
  const second = await upsertEndpoint(file, "beta", { boardRoot: boardB, policy: "candidate" });
  assert.deepEqual(Object.keys(second.endpoints), ["alpha", "beta"]);
  assert.deepEqual(JSON.parse(await readFile(file, "utf8")), second);
  assert.deepEqual((await readdir(path.dirname(file))).filter((name) => name.includes(".tmp-")), [], "no temp file left behind");
  await mkdir(path.join(home, "broken"), { recursive: true });
  const broken = path.join(home, "broken", "endpoints.json");
  await writeFile(broken, "{", "utf8");
  await assert.rejects(() => upsertEndpoint(broken, "alpha", { boardRoot: boardA }), /JSON/);
  assert.equal(await readFile(broken, "utf8"), "{", "a malformed registry is never overwritten by upsert");
});
