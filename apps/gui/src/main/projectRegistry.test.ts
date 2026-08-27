import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { KanmerStore } from "@kanmer/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RegistryProjectIdentity } from "../shared/ipc.js";
import {
  ENDPOINT_REGISTRY_ENV,
  ProjectRegistryWriter,
  assertSelectedEndpoint,
  claims,
  endpointMatches,
  entryForContext,
  normalizePolicy,
  observeEndpoint,
  observeRegistry,
  parseRegistry,
  readRegistry,
  redactRemoteOrigin,
  registryLocation,
  serializeRegistry,
  validateEntry,
  type ObservationDeps,
} from "./projectRegistry.js";

const deps: ObservationDeps = {
  inspectBoardBranch: async () => "kanmer-board",
  inspectBoardSync: async () => ({ remote: true, ahead: 2, behind: 1, localSha: "a", remoteSha: "b" }),
  remoteOrigin: async () => "https://example.test/org/repo.git",
  machine: () => "test-machine",
  now: () => new Date("2026-08-27T12:00:00.000Z"),
};

async function snapshot(dir: string): Promise<string> {
  const out: Array<[string, number, string]> = [];
  async function walk(current: string): Promise<void> {
    for (const entry of (await readdir(current, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else out.push([path.relative(dir, full), (await stat(full)).size, await readFile(full, "utf8")]);
    }
  }
  await walk(dir);
  return JSON.stringify(out);
}

let home = "";
let boardA = "";
let boardB = "";
let projectIdA = "";
let fingerprintA = "";
/** The lease record CORE-115's `takeTicket` actually wrote for the live ticket — asserted, not hand-made. */
let liveLease: { id: string; revision: number; phase: string; provider: string; workspace: string; heartbeatAt: string; expiresAt: string } | null = null;

beforeAll(async () => {
  home = await mkdtemp(path.join(tmpdir(), "kanmer-gui144-"));
  boardA = path.join(home, "alpha");
  boardB = path.join(home, "beta");
  // A: a board born with a logical identity, one live lease as the store
  // writes it (CORE-115 mints lease_* on take — nothing is hand-injected,
  // review F-001), one expired legacy claim.
  const storeA = new KanmerStore(boardA, { actor: "test" });
  await storeA.init({ fallbackFingerprint: "kanmer-proj-v1:" + "a".repeat(64) });
  const live = await storeA.createItem({ type: "ticket", title: "live", profile: "chore" });
  const taken = await storeA.takeTicket(live.id, { branch: "live-branch", worktree: ".worktrees/live", assignee: "controller-one", stage: "backlog", provider: "claude-code" });
  const takenRaw = taken as unknown as Record<string, unknown>;
  expect(typeof takenRaw.lease_id).toBe("string");
  liveLease = {
    id: takenRaw.lease_id as string,
    revision: takenRaw.lease_revision as number,
    phase: takenRaw.lease_phase as string,
    provider: takenRaw.lease_provider as string,
    workspace: takenRaw.lease_workspace as string,
    heartbeatAt: takenRaw.lease_heartbeat_at as string,
    expiresAt: taken.claim_expires_at as string,
  };
  const expired = await storeA.createItem({ type: "ticket", title: "expired", profile: "chore" });
  await storeA.takeTicket(expired.id, { branch: "old-branch", assignee: "controller-two", stage: "backlog" });
  const expiredFile = path.join(boardA, ".kanmer", "areas", "_none", expired.id, `${expired.id}.md`);
  const text = await readFile(expiredFile, "utf8");
  expect(text).toMatch(/^claim_expires_at: /m);
  // Strip the minted lease_* keys so this one is a genuine legacy (pre-CORE-115) claim, then expire it.
  await writeFile(expiredFile, text.replace(/^lease_[a-z_]+: .*\n/gm, "").replace(/^claim_expires_at: .*$/m, "claim_expires_at: 2026-08-27T11:00:00.000Z"), "utf8");
  const record = await storeA.getProject();
  projectIdA = record!.project_id;
  // B: a legacy board (no project.json) — identity unassigned.
  const storeB = new KanmerStore(boardB, { actor: "test" });
  await storeB.init({ fallbackFingerprint: "kanmer-proj-v1:" + "b".repeat(64) });
  await rm(path.join(boardB, ".kanmer", "project.json"), { force: true });
});

afterAll(async () => { await rm(home, { recursive: true, force: true }); });

describe("registry location and contract", () => {
  it("is decided by the environment, never a request", () => {
    expect(registryLocation({}, home)).toEqual({ path: path.join(home, ".kanmer", "endpoints.json"), source: "default" });
    const absolute = path.join(home, "custom.json");
    expect(registryLocation({ [ENDPOINT_REGISTRY_ENV]: absolute }, home)).toEqual({ path: absolute, source: "env" });
    const relative = registryLocation({ [ENDPOINT_REGISTRY_ENV]: "relative/endpoints.json" }, home);
    expect(relative.source).toBe("env");
    expect(relative.error).toMatch(/absolute/);
  });

  it("parses and validates like the server module without dropping entries", () => {
    expect(parseRegistry("{").ok).toBe(false);
    expect(parseRegistry("[]").ok).toBe(false);
    expect(parseRegistry(JSON.stringify({ schema: 2, endpoints: {} }))).toMatchObject({ ok: false, error: expect.stringMatching(/schema/) });
    expect(parseRegistry(JSON.stringify({ schema: 1, endpoints: [] }))).toMatchObject({ ok: false, error: expect.stringMatching(/endpoints/) });
    const parsed = parseRegistry(JSON.stringify({ schema: 1, endpoints: { ok: { boardRoot: boardA }, bad: { boardRoot: "x/y" } } }));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(Object.keys(parsed.file.endpoints)).toEqual(["ok", "bad"]);
    expect(validateEntry("ok", { boardRoot: boardA })).toEqual([]);
    expect(validateEntry("ok", { boardRoot: "x/y" })[0]).toMatch(/absolute/);
    expect(validateEntry("ok", {})[0]).toMatch(/boardRoot/);
    expect(validateEntry("ok", null)[0]).toMatch(/object/);
    expect(validateEntry("Bad Name", { boardRoot: boardA })[0]).toMatch(/name/);
    expect(validateEntry("ok", { boardRoot: boardA, repoRoot: "rel" })[0]).toMatch(/repoRoot/);
    expect(validateEntry("ok", { boardRoot: boardA, boardBranch: "" })[0]).toMatch(/boardBranch/);
    expect(validateEntry("ok", { boardRoot: boardA, policy: 3 })[0]).toMatch(/policy/);
  });

  it("normalises policy labels and redacts remote origins", () => {
    expect(normalizePolicy(undefined)).toBeUndefined();
    expect(normalizePolicy("  ")).toBeUndefined();
    expect(normalizePolicy(" main-only ")).toBe("main-only");
    expect(() => normalizePolicy(`a${String.fromCharCode(0)}b`)).toThrow(/REGISTRY_POLICY_INVALID/);
    expect(() => normalizePolicy("x".repeat(65))).toThrow(/REGISTRY_POLICY_INVALID/);
    expect(() => normalizePolicy(3)).toThrow(/REGISTRY_POLICY_INVALID/);
    expect(redactRemoteOrigin("https://user:secret@github.com/org/repo.git")).toBe("https://github.com/org/repo.git");
    // SCP form keeps its fixed login (the server does too — F-004); only a smuggled password goes.
    expect(redactRemoteOrigin("git@github.com:org/repo.git")).toBe("git@github.com:org/repo.git");
    expect(redactRemoteOrigin("git:token@github.com:org/repo.git")).toBe("git@github.com:org/repo.git");
    expect(redactRemoteOrigin("")).toBeNull();
  });

  it("redacts origins and fingerprints locations exactly as the server's project-identity module", async () => {
    const serverModule = pathToFileURL(path.resolve(__dirname, "../../../../packages/mcp-server/src/project-identity.ts")).href;
    const server = (await import(/* @vite-ignore */ serverModule)) as {
      redactRemoteOrigin: (raw: string | null | undefined) => string | null;
      locationFingerprint: (input: { repoPath: string; boardPath: string; machine: string | null; boardBranch: string | null; remoteOrigin: string | null }) => { fingerprint: string };
    };
    const probes = [
      "https://user:secret@github.com/org/repo.git",
      "https://github.com/org/repo.git",
      "ssh://git@github.com/org/repo.git",
      "git@github.com:org/repo.git",
      "git:token@github.com:org/repo.git",
      "file:///C:/repos/x",
      "C:\\repos\\x",
      "   ",
      null,
      undefined,
    ];
    for (const probe of probes) expect(redactRemoteOrigin(probe)).toBe(server.redactRemoteOrigin(probe));
    // The kanmer-loc-v1 fingerprint the card shows must equal what list_projects reports for the same facts.
    for (const origin of ["git@github.com:org/repo.git", "https://github.com/org/repo.git", null]) {
      const view = await observeEndpoint("alpha", { boardRoot: boardA }, { ...deps, remoteOrigin: async () => redactRemoteOrigin(origin) }, null);
      expect(view.location).not.toBeNull();
      const expected = server.locationFingerprint({ repoPath: view.location!.repoPath, boardPath: view.location!.boardPath, machine: "test-machine", boardBranch: "kanmer-board", remoteOrigin: server.redactRemoteOrigin(origin) });
      expect(view.location!.fingerprint).toBe(expected.fingerprint);
    }
  });

  it("writes a file the MCP server's registry module parses and validates identically", async () => {
    // The server package ships no type declarations, so the GUI mirrors the
    // contract; this proves the mirror against the real module by loading it
    // untyped from its source path.
    const serverModule = pathToFileURL(path.resolve(__dirname, "../../../../packages/mcp-server/src/project-registry.ts")).href;
    const server = (await import(/* @vite-ignore */ serverModule)) as {
      parseRegistry: (text: string) => { ok: boolean; file?: { endpoints: Record<string, unknown> } };
      validateEntry: (name: string, entry: unknown) => string[];
      ENDPOINT_NAME_RE: RegExp;
    };
    const writer = new ProjectRegistryWriter(path.join(home, "contract", "endpoints.json"));
    await writer.upsert("alpha", { boardRoot: boardA, repoRoot: boardA, boardBranch: "kanmer-board", policy: "main-only" });
    await writer.upsert("beta", { boardRoot: boardB });
    const text = await readFile(writer.path, "utf8");
    const parsed = server.parseRegistry(text);
    expect(parsed.ok).toBe(true);
    expect(Object.keys(parsed.file!.endpoints).sort()).toEqual(["alpha", "beta"]);
    for (const [name, entry] of Object.entries(parsed.file!.endpoints)) {
      expect(server.validateEntry(name, entry)).toEqual([]);
      expect(validateEntry(name, entry)).toEqual([]);
    }
    expect(server.ENDPOINT_NAME_RE.source).toBe(/^[a-z0-9][a-z0-9._-]{0,63}$/.source);
    for (const name of ["ok", "a.b_c-d", "Bad", "-x", "x".repeat(65)]) expect(server.validateEntry(name, { boardRoot: boardA })).toEqual(validateEntry(name, { boardRoot: boardA }));
    expect(text).toBe(serializeRegistry(JSON.parse(text)));
  });
});

describe("observation", () => {
  it("reports two projects with distinct health through read-only stores and never writes", async () => {
    const before = await snapshot(home);
    const selected: RegistryProjectIdentity = { project_id: null, board_id: null, identity: "unassigned", origin: null, fingerprint: "kanmer-proj-v1:" + "0".repeat(64) };
    const a = await observeEndpoint("alpha", { boardRoot: boardA, policy: "main-only", boardBranch: "kanmer-board" }, deps, selected);
    expect(a.health).toBe("ok");
    expect(a.project?.identity).toBe("logical");
    expect(a.project?.project_id).toBe(projectIdA);
    expect(a.project?.fingerprint).toMatch(/^kanmer-proj-v1:[0-9a-f]{64}$/);
    fingerprintA = a.project!.fingerprint;
    expect(a.policy).toBe("main-only");
    expect(a.selected).toBe(false);
    expect(a.ticketCount).toBe(2);
    expect(a.boardSync).toEqual({ remote: true, ahead: 2, behind: 1, localSha: "a", remoteSha: "b" });
    expect(a.location).toMatchObject({ machine: "test-machine", boardBranch: "kanmer-board", remoteOrigin: "https://example.test/org/repo.git" });
    expect(a.location?.fingerprint).toMatch(/^kanmer-loc-v1:[0-9a-f]{64}$/);
    // Only the live claim is an active controller; the expired legacy claim is a workspace, not a controller (F-007).
    expect(a.controllers).toEqual([{ controller: "controller-one", tickets: ["TICK-001"] }]);
    expect(a.workspaces.map((w) => [w.ticket, w.branch, w.worktree, w.claim, w.controller, w.expiresAt])).toEqual([
      ["TICK-001", "live-branch", ".worktrees/live", "live", "controller-one", liveLease!.expiresAt],
      ["TICK-002", "old-branch", null, "expired", "controller-two", "2026-08-27T11:00:00.000Z"],
    ]);
    // The lease shown is the one the store wrote on take — never a hand-made record (F-001).
    expect(a.workspaces[0]?.lease).toEqual({
      id: liveLease!.id,
      revision: liveLease!.revision,
      phase: liveLease!.phase,
      provider: "claude-code",
      workspace: liveLease!.workspace,
      heartbeatAt: liveLease!.heartbeatAt,
      controllerRun: null,
      workerRun: null,
      heartbeatStale: false,
    });
    expect(liveLease!.revision).toBe(1);
    expect(liveLease!.phase).toBe("implementing");
    expect(a.workspaces[1]?.lease).toBeNull();
    expect(a.problems).toEqual([]);

    const b = await observeEndpoint("beta", { boardRoot: boardB }, deps, selected);
    expect(b.health).toBe("unassigned");
    expect(b.project?.project_id).toBeNull();
    expect(b.project?.identity).toBe("unassigned");
    expect(b.controllers).toEqual([]);
    expect(b.workspaces).toEqual([]);

    const missing = await observeEndpoint("gone", { boardRoot: path.join(home, "nowhere") }, deps, selected);
    expect(missing.health).toBe("missing-board");
    const invalid = await observeEndpoint("bad", { boardRoot: "relative" }, deps, selected);
    expect(invalid.health).toBe("invalid");
    expect(invalid.problems[0]).toMatch(/absolute/);

    const drift = await observeEndpoint("alpha", { boardRoot: boardA, boardBranch: "other" }, deps, selected);
    expect(drift.problems).toEqual(['board is on "kanmer-board", registry expects "other"']);
    expect(await snapshot(home)).toBe(before);
  });

  it("marks the selected project by logical id first and legacy fingerprint as the fallback", async () => {
    const byId = await observeEndpoint("alpha", { boardRoot: boardA }, deps, { project_id: projectIdA, board_id: projectIdA, identity: "logical", origin: "generated", fingerprint: "kanmer-proj-v1:" + "f".repeat(64) });
    expect(byId.selected).toBe(true);
    const byFingerprint = await observeEndpoint("alpha", { boardRoot: boardA }, deps, { project_id: null, board_id: null, identity: "unassigned", origin: null, fingerprint: fingerprintA });
    expect(byFingerprint.selected).toBe(true);
    const other = await observeEndpoint("alpha", { boardRoot: boardA }, deps, { project_id: "someone-else", board_id: null, identity: "logical", origin: "generated", fingerprint: fingerprintA });
    expect(other.selected).toBe(false);
    expect(endpointMatches({ project_id: null, board_id: null, identity: "unassigned", origin: null, fingerprint: "x" }, null)).toBe(false);
  });

  it("reads the whole registry from the environment location and reports a malformed file without dropping the view", async () => {
    const file = path.join(home, "registry", "endpoints.json");
    const env = { [ENDPOINT_REGISTRY_ENV]: file };
    const missing = await observeRegistry(env, home, deps, null);
    expect(missing.registry).toEqual({ path: file, source: "env", exists: false, error: null });
    expect(missing.endpoints).toEqual([]);
    expect(missing.selectedRegistered).toBe(false);

    const writer = new ProjectRegistryWriter(file);
    await writer.upsert("beta", { boardRoot: boardB });
    await writer.upsert("alpha", { boardRoot: boardA, boardBranch: "kanmer-board" });
    const view = await observeRegistry(env, home, deps, { project_id: projectIdA, board_id: projectIdA, identity: "logical", origin: "generated", fingerprint: fingerprintA });
    expect(view.endpoints.map((endpoint) => [endpoint.name, endpoint.health, endpoint.selected])).toEqual([["alpha", "ok", true], ["beta", "unassigned", false]]);
    expect(view.selectedRegistered).toBe(true);

    await writeFile(file, "{ not json", "utf8");
    const malformed = await observeRegistry(env, home, deps, null);
    expect(malformed.registry.exists).toBe(true);
    expect(malformed.registry.error).toMatch(/valid JSON/);
    expect(malformed.endpoints).toEqual([]);
    await expect(writer.upsert("gamma", { boardRoot: boardA })).rejects.toThrow(/REGISTRY_MALFORMED/);
    expect(await readFile(file, "utf8")).toBe("{ not json");
  });

  it("classifies claims defensively when lease fields are absent or malformed", () => {
    const now = new Date("2026-08-27T12:00:00.000Z");
    const items = [
      { id: "T-1", type: "ticket", status: "implementing", assignee: "bob", taken_at: "2026-08-27T11:50:00.000Z", lease_id: "", lease_revision: "3" },
      { id: "T-2", type: "ticket", status: "backlog", assignee: "" },
      { id: "G-1", type: "group", status: "backlog", assignee: "x", taken_at: "2026-08-27T11:50:00.000Z" },
    ] as unknown as Parameters<typeof claims>[0];
    const result = claims(items, now, { claimExpiryMinutes: 30 });
    expect(result.controllers).toEqual([{ controller: "bob", tickets: ["T-1"] }]);
    expect(result.workspaces).toHaveLength(1);
    expect(result.workspaces[0]?.lease).toBeNull();
    expect(result.workspaces[0]?.claim).toBe("live");
  });

  it("counts only live claims as active controllers and flags stale heartbeats (F-007)", () => {
    const now = new Date("2026-08-27T12:00:00.000Z");
    const items = [
      { id: "T-1", type: "ticket", status: "implementing", claim_controller: "alice", taken_at: "2026-08-27T11:50:00.000Z", claim_expires_at: "2026-08-27T12:20:00.000Z", lease_id: "L1", lease_revision: 2, lease_heartbeat_at: "2026-08-27T11:58:00.000Z" },
      { id: "T-2", type: "ticket", status: "implementing", claim_controller: "bob", taken_at: "2026-08-27T10:00:00.000Z", claim_expires_at: "2026-08-27T10:30:00.000Z", lease_id: "L2", lease_revision: 1 },
      { id: "T-3", type: "ticket", status: "review", assignee: "carol", taken_at: "2026-08-27T09:00:00.000Z" },
      { id: "T-4", type: "ticket", status: "implementing", claim_controller: "alice", taken_at: "2026-08-27T11:00:00.000Z", claim_expires_at: "2026-08-27T12:30:00.000Z", lease_id: "L4", lease_revision: 1, lease_heartbeat_at: "2026-08-27T11:00:00.000Z" },
    ] as unknown as Parameters<typeof claims>[0];
    const result = claims(items, now, { claimExpiryMinutes: 30, leaseHeartbeatMinutes: 10 });
    expect(result.controllers).toEqual([{ controller: "alice", tickets: ["T-1", "T-4"] }]);
    expect(result.workspaces.map((w) => [w.ticket, w.claim, w.controller, w.lease?.heartbeatStale ?? null])).toEqual([
      ["T-1", "live", "alice", false],
      ["T-2", "expired", "bob", true], // no heartbeat recorded: taken_at is the last beat, long stale
      ["T-3", "expired", "carol", null],
      ["T-4", "live", "alice", true],
    ]);
    // A legacy claim's derived expiry is reported rather than left blank.
    expect(result.workspaces[2]?.expiresAt).toBe("2026-08-27T09:30:00.000Z");
  });
});

describe("main-process guards", () => {
  it("lets a mutation act only on the endpoint bound to the sender's selected project (F-003)", async () => {
    const file = path.join(home, "guard", "endpoints.json");
    const env = { [ENDPOINT_REGISTRY_ENV]: file };
    const writer = new ProjectRegistryWriter(file);
    await writer.upsert("alpha", { boardRoot: boardA });
    await writer.upsert("beta", { boardRoot: boardB });
    const asAlpha = await observeRegistry(env, home, deps, { project_id: projectIdA, board_id: projectIdA, identity: "logical", origin: "generated", fingerprint: fingerprintA });
    expect(() => assertSelectedEndpoint(asAlpha, "alpha")).not.toThrow();
    expect(() => assertSelectedEndpoint(asAlpha, "beta")).toThrow(/REGISTRY_NOT_SELECTED/);
    const unregistered = await observeRegistry(env, home, deps, { project_id: "someone-else", board_id: null, identity: "logical", origin: "generated", fingerprint: "kanmer-proj-v1:" + "0".repeat(64) });
    expect(() => assertSelectedEndpoint(unregistered, "alpha")).toThrow(/REGISTRY_NOT_SELECTED/);
    const nobody = await observeRegistry(env, home, deps, null);
    expect(() => assertSelectedEndpoint(nobody, "alpha")).toThrow(/REGISTRY_NOT_SELECTED/);
  });

  it("accepts any endpoint bound to the sender's project when the registry names it twice (F-014)", async () => {
    const file = path.join(home, "guard-dup", "endpoints.json");
    const env = { [ENDPOINT_REGISTRY_ENV]: file };
    const writer = new ProjectRegistryWriter(file);
    await writer.upsert("alpha", { boardRoot: boardA });
    await writer.upsert("alpha-mirror", { boardRoot: boardA, policy: "main-only" });
    await writer.upsert("beta", { boardRoot: boardB });
    const asAlpha = await observeRegistry(env, home, deps, { project_id: projectIdA, board_id: projectIdA, identity: "logical", origin: "generated", fingerprint: fingerprintA });
    expect(asAlpha.endpoints.filter((endpoint) => endpoint.selected).map((endpoint) => endpoint.name)).toEqual(["alpha", "alpha-mirror"]);
    expect(() => assertSelectedEndpoint(asAlpha, "alpha")).not.toThrow();
    expect(() => assertSelectedEndpoint(asAlpha, "alpha-mirror")).not.toThrow();
    expect(() => assertSelectedEndpoint(asAlpha, "beta")).toThrow(/REGISTRY_NOT_SELECTED: "beta" is not the selected project \("alpha", "alpha-mirror"\)/);
  });

  it("records a board branch only for a git-backed board (F-005)", () => {
    const git = entryForContext({ boardRoot: boardA, sourceRoot: boardA, syncStatus: { available: true, boardRoot: boardA, branch: "kanmer-board" } }, "main-only");
    expect(git).toEqual({ boardRoot: boardA, repoRoot: boardA, boardBranch: "kanmer-board", policy: "main-only" });
    const plain = entryForContext({ boardRoot: boardB, sourceRoot: boardB, syncStatus: { available: false, boardRoot: null, branch: "kanmer-board" } }, undefined);
    expect(plain).toEqual({ boardRoot: boardB, repoRoot: boardB });
    expect("boardBranch" in plain).toBe(false);
    const broken = entryForContext({ boardRoot: boardB, sourceRoot: boardB, syncStatus: { available: false, boardRoot: boardB, branch: "kanmer-board" } }, undefined);
    expect(broken.boardBranch).toBeUndefined();
    expect(validateEntry("plain", plain)).toEqual([]);
  });
});

describe("serialised writer (MCP-054 F-001)", () => {
  it("applies concurrent upserts without losing any and keeps the file valid throughout", async () => {
    const file = path.join(home, "concurrent", "endpoints.json");
    const writer = new ProjectRegistryWriter(file);
    const names = Array.from({ length: 20 }, (_, index) => `endpoint-${index}`);
    await Promise.all(names.map((name) => writer.upsert(name, { boardRoot: boardA, policy: name })));
    const { parsed } = await readRegistry(file);
    expect(parsed?.ok).toBe(true);
    if (parsed?.ok) {
      expect(Object.keys(parsed.file.endpoints).sort()).toEqual([...names].sort());
      expect(parsed.file.endpoints["endpoint-7"]).toEqual({ boardRoot: boardA, policy: "endpoint-7" });
    }
    const leftovers = (await readdir(path.dirname(file))).filter((entry) => entry.includes(".tmp-"));
    expect(leftovers).toEqual([]);
  });

  it("renames, sets policy and removes, refusing unknown or colliding names", async () => {
    const file = path.join(home, "edits", "endpoints.json");
    const writer = new ProjectRegistryWriter(file);
    await writer.upsert("one", { boardRoot: boardA, repoRoot: boardA });
    await writer.upsert("two", { boardRoot: boardB });
    await expect(writer.rename("one", "two")).rejects.toThrow(/REGISTRY_NAME_TAKEN/);
    await expect(writer.rename("ghost", "three")).rejects.toThrow(/REGISTRY_ENDPOINT_MISSING/);
    await expect(writer.rename("one", "Bad Name")).rejects.toThrow(/REGISTRY_NAME_INVALID/);
    await writer.rename("one", "uno");
    await writer.setPolicy("uno", "main-only");
    let { parsed } = await readRegistry(file);
    expect(parsed?.ok && parsed.file.endpoints).toEqual({ uno: { boardRoot: boardA, repoRoot: boardA, policy: "main-only" }, two: { boardRoot: boardB } });
    await writer.setPolicy("uno", undefined);
    await writer.remove("two");
    await expect(writer.remove("two")).rejects.toThrow(/REGISTRY_ENDPOINT_MISSING/);
    ({ parsed } = await readRegistry(file));
    expect(parsed?.ok && parsed.file.endpoints).toEqual({ uno: { boardRoot: boardA, repoRoot: boardA } });
    await expect(writer.upsert("bad", { boardRoot: "relative" })).rejects.toThrow(/REGISTRY_INVALID/);
  });

  it("adds a new endpoint but refuses to replace an existing name (F-006)", async () => {
    const file = path.join(home, "add", "endpoints.json");
    const writer = new ProjectRegistryWriter(file);
    await writer.add("one", { boardRoot: boardA, repoRoot: boardA });
    await expect(writer.add("one", { boardRoot: boardB })).rejects.toThrow(/REGISTRY_NAME_EXISTS/);
    await expect(writer.add("Bad Name", { boardRoot: boardB })).rejects.toThrow(/REGISTRY_NAME_INVALID/);
    const { parsed } = await readRegistry(file);
    expect(parsed?.ok && parsed.file.endpoints).toEqual({ one: { boardRoot: boardA, repoRoot: boardA } });
  });

  it("refuses to overwrite an operator edit made while a mutation was in flight", async () => {
    const file = path.join(home, "stale", "endpoints.json");
    // The hook runs after the writer's read and before its verify step: a hand edit lands exactly there.
    let sneak: (() => Promise<void>) | null = null;
    const writer = new ProjectRegistryWriter(file, { afterRead: async () => { await sneak?.(); } });
    await writer.upsert("one", { boardRoot: boardA });
    sneak = async () => { sneak = null; await writeFile(file, serializeRegistry({ schema: 1, endpoints: { hand: { boardRoot: boardB } } }), "utf8"); };
    await expect(writer.upsert("two", { boardRoot: boardB })).rejects.toThrow(/REGISTRY_CHANGED/);
    const { parsed } = await readRegistry(file);
    expect(parsed?.ok && Object.keys(parsed.file.endpoints)).toEqual(["hand"]);
  });
});
