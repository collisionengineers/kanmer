import { EventEmitter } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { ChildProcess } from "node:child_process";
import {
  OpenAITunnelManager,
  buildOpenAITunnelMcpCommand,
  canonicalOpenAITunnelPath,
  isLoopbackHealthAddress,
  readOpenAITunnelSettings,
  isSafeOpenAIExecutable,
} from "./openaiTunnel.js";

const identity = { fingerprint: `kanmer-proj-v1:${"a".repeat(64)}`, boardRoot: "/repo/.worktrees/kanmer", repoRoot: "/repo", format: 3 as const, boardSource: "file" as const };
const secondIdentity = { ...identity, fingerprint: `kanmer-proj-v1:${"b".repeat(64)}`, repoRoot: "/other" };
const migratedIdentity = { ...identity, fingerprint: `kanmer-proj-v1:${"c".repeat(64)}`, format: 4 as const };
const roots: string[] = [];

function fakeChild(): ChildProcess & { finish(code?: number): void } {
  const child = new EventEmitter() as ChildProcess & { finish(code?: number): void };
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  Object.assign(child, { stdout, stderr, exitCode: null, signalCode: null });
  child.kill = (() => { (child as { exitCode: number }).exitCode = 0; child.emit("close", 0, null); return true; }) as ChildProcess["kill"];
  child.finish = (code = 0) => { (child as { exitCode: number }).exitCode = code; child.emit("close", code, null); };
  return child;
}

function spawnFake(children: Array<ChildProcess & { finish(code?: number): void }>, codes: Array<number | undefined> = [], environments: NodeJS.ProcessEnv[] = []) {
  return ((...args: Parameters<NonNullable<ConstructorParameters<typeof OpenAITunnelManager>[1]>>) => {
    environments.push(args[2].env); const child = fakeChild(); children.push(child); const code = codes[children.length - 1]; if (code !== undefined) queueMicrotask(() => child.finish(code)); return child;
  }) as ConstructorParameters<typeof OpenAITunnelManager>[1];
}

afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe("OpenAITunnelManager", () => {
  it("preserves filesystem roots and surfaces malformed settings", async () => {
    expect(canonicalOpenAITunnelPath("/")).toBe("/");
    expect(canonicalOpenAITunnelPath("C:\\")).toBe("C:/");
    expect(canonicalOpenAITunnelPath("C:\\repo\\")).toBe("C:/repo");
    const root = await mkdtemp(join(tmpdir(), "kanmer-openai-tunnel-")); roots.push(root);
    await writeFile(join(root, "openai-tunnels.json"), "{ malformed", "utf8");
    await expect(readOpenAITunnelSettings(root)).rejects.toThrow("OPENAI_TUNNEL_SETTINGS_READ_FAILED");
  });

  it("canonicalizes Windows project keys and binds a custom credential name", async () => {
    const root = await mkdtemp(join(tmpdir(), "kanmer-openai-tunnel-")); roots.push(root);
    const children: Array<ChildProcess & { finish(code?: number): void }> = [];
    const environments: NodeJS.ProcessEnv[] = [];
    const manager = new OpenAITunnelManager(root, spawnFake(children, [0], environments));
    await manager.register("C:\\\\repo\\", identity);
    const profile = await manager.saveProfile("C:/repo", identity, { profileName: "first", tunnelId: "tunnel-first", executable: "tunnel-client", credentialEnv: "MY_TUNNEL_KEY", healthAddress: "127.0.0.1:8765", enabled: true, autoStart: false, expectedGeneration: null });
    const previous = process.env.MY_TUNNEL_KEY;
    process.env.MY_TUNNEL_KEY = "test-key";
    try {
      await manager.initialize("C:\\\\repo\\", identity, { boardRoot: identity.boardRoot, repoRoot: identity.repoRoot });
      expect(environments[0]?.MY_TUNNEL_KEY).toBe("test-key");
      expect((await manager.overview())[0]?.projectId).toBe("C:/repo");
      expect(profile.profile?.generation).toMatch(/^[0-9a-f-]{36}$/i);
    } finally {
      if (previous === undefined) delete process.env.MY_TUNNEL_KEY; else process.env.MY_TUNNEL_KEY = previous;
    }
  });

  it("reloads its incomplete registered default but rejects partial runnable profiles", async () => {
    const root = await mkdtemp(join(tmpdir(), "kanmer-openai-tunnel-")); roots.push(root);
    const first = new OpenAITunnelManager(root);
    await first.register("/repo", identity);

    const restarted = new OpenAITunnelManager(root);
    const registered = await restarted.viewFor("/repo", identity);
    expect(registered.profile).toMatchObject({ profileName: "repo", tunnelId: "", generation: "", enabled: false, autoStart: false });
    await expect(restarted.doctor("/repo", identity, { boardRoot: identity.boardRoot, repoRoot: identity.repoRoot })).rejects.toThrow("OPENAI_PROFILE_INCOMPLETE");
    await expect(restarted.initialize("/repo", identity, { boardRoot: identity.boardRoot, repoRoot: identity.repoRoot })).rejects.toThrow("OPENAI_PROFILE_INCOMPLETE");

    const afterOperations = new OpenAITunnelManager(root);
    expect((await afterOperations.viewFor("/repo", identity)).profile).toMatchObject({ tunnelId: "", generation: "" });

    const settingsPath = join(root, "openai-tunnels.json");
    const stored = JSON.parse(await readFile(settingsPath, "utf8")) as { profiles: Record<string, { tunnelId: string; executable: string; profileName: string; lastSummary: string | null; lastError: string | null; lastDoctorAt: string | null }> };
    stored.profiles[identity.fingerprint]!.lastSummary = "OpenAI tunnel prerequisites are incomplete.";
    stored.profiles[identity.fingerprint]!.lastError = "OpenAI tunnel prerequisites are incomplete.";
    stored.profiles[identity.fingerprint]!.lastDoctorAt = "2026-08-25T06:00:00.000Z";
    await writeFile(settingsPath, JSON.stringify(stored), "utf8");
    expect((await readOpenAITunnelSettings(root)).profiles[identity.fingerprint]).toMatchObject({ tunnelId: "", generation: "", lastDoctorAt: "2026-08-25T06:00:00.000Z" });

    stored.profiles[identity.fingerprint]!.tunnelId = "partially-configured";
    await writeFile(settingsPath, JSON.stringify(stored), "utf8");
    await expect(readOpenAITunnelSettings(root)).rejects.toThrow("OPENAI_TUNNEL_SETTINGS_INVALID");

    stored.profiles[identity.fingerprint]!.tunnelId = "";
    stored.profiles[identity.fingerprint]!.executable = "another-safe-client";
    await writeFile(settingsPath, JSON.stringify(stored), "utf8");
    await expect(readOpenAITunnelSettings(root)).rejects.toThrow("OPENAI_TUNNEL_SETTINGS_INVALID");

    stored.profiles[identity.fingerprint]!.executable = "tunnel-client";
    stored.profiles[identity.fingerprint]!.profileName = "another-safe-name";
    await writeFile(settingsPath, JSON.stringify(stored), "utf8");
    await expect(readOpenAITunnelSettings(root)).rejects.toThrow("OPENAI_TUNNEL_SETTINGS_INVALID");
  });

  it("creates a reloadable default for a project basename without a leading alphanumeric", async () => {
    const root = await mkdtemp(join(tmpdir(), "kanmer-openai-tunnel-")); roots.push(root);
    const first = new OpenAITunnelManager(root);
    await first.register("/tmp/.kanmer", identity);
    const restarted = new OpenAITunnelManager(root);
    expect((await restarted.viewFor("/tmp/.kanmer", identity)).profile?.profileName).toBe("kanmer-.kanmer");
  });

  it("validates loopback health and safe executable inputs", () => {
    expect(isLoopbackHealthAddress("127.0.0.1:8765")).toBe(true);
    expect(isLoopbackHealthAddress("[::1]:8765")).toBe(true);
    expect(isLoopbackHealthAddress("0.0.0.0:8765")).toBe(false);
    expect(isLoopbackHealthAddress("127.0.0.1:80")).toBe(false);
    expect(isSafeOpenAIExecutable("tunnel-client")).toBe(true);
    expect(isSafeOpenAIExecutable("C:\\Tools\\tunnel-client.exe")).toBe(true);
    expect(isSafeOpenAIExecutable("../tunnel-client")).toBe(false);
  });

  it("builds the canonical stdio command with Windows slash normalization", () => {
    expect(buildOpenAITunnelMcpCommand({ command: "C:\\Program Files\\Kanmer.exe", args: ["--root", "C:\\repo\\.worktrees\\kanmer", "--repo-root", "C:\\repo"] })).toBe('"C:/Program Files/Kanmer.exe" --root C:/repo/.worktrees/kanmer --repo-root C:/repo');
  });

  it("keeps project profiles isolated and rejects duplicate health resources", async () => {
    const root = await mkdtemp(join(tmpdir(), "kanmer-openai-tunnel-")); roots.push(root);
    const manager = new OpenAITunnelManager(root);
    await Promise.all([manager.register("/repo", identity), manager.register("/other", secondIdentity)]);
    const first = await manager.saveProfile("/repo", identity, { profileName: "first", tunnelId: "tunnel-first", executable: "tunnel-client", credentialEnv: "CONTROL_PLANE_API_KEY", healthAddress: "127.0.0.1:8765", enabled: true, autoStart: false, expectedGeneration: null });
    expect(first.profile?.generation).toMatch(/^[0-9a-f-]{36}$/i);
    await expect(manager.saveProfile("/other", secondIdentity, { profileName: "second", tunnelId: "tunnel-second", executable: "tunnel-client", credentialEnv: "CONTROL_PLANE_API_KEY", healthAddress: "127.0.0.1:8765", enabled: true, autoStart: false, expectedGeneration: null })).rejects.toThrow("OPENAI_PROFILE_RESOURCE_DUPLICATE");
    const stored = JSON.parse(await readFile(join(root, "openai-tunnels.json"), "utf8")) as { profiles: Record<string, { profileName: string }> };
    expect(stored.profiles[identity.fingerprint]?.profileName).toBe("first");
    expect(stored.profiles[secondIdentity.fingerprint]?.profileName).toBe("other");
  });

  it("does not reserve incomplete defaults but rejects a duplicate configured address", async () => {
    const root = await mkdtemp(join(tmpdir(), "kanmer-openai-tunnel-")); roots.push(root);
    const manager = new OpenAITunnelManager(root);
    await manager.register("/repo", identity);
    await manager.register("/other", secondIdentity);
    const first = await manager.saveProfile("/repo", identity, { profileName: "first", tunnelId: "tunnel-first", executable: "tunnel-client", credentialEnv: "CONTROL_PLANE_API_KEY", healthAddress: "127.0.0.1:8080", enabled: true, autoStart: false, expectedGeneration: null });
    expect(first.profile?.healthAddress).toBe("127.0.0.1:8080");
    await expect(manager.saveProfile("/other", secondIdentity, { profileName: "second", tunnelId: "tunnel-second", executable: "tunnel-client", credentialEnv: "CONTROL_PLANE_API_KEY", healthAddress: "127.0.0.1:8080", enabled: true, autoStart: false, expectedGeneration: null })).rejects.toThrow("OPENAI_PROFILE_RESOURCE_DUPLICATE");
  });

  it("reconciles a changed project identity without stranding its profile", async () => {
    const root = await mkdtemp(join(tmpdir(), "kanmer-openai-tunnel-")); roots.push(root);
    const manager = new OpenAITunnelManager(root);
    await manager.register("/repo", identity);
    const saved = await manager.saveProfile("/repo", identity, { profileName: "first", tunnelId: "tunnel-first", executable: "tunnel-client", credentialEnv: "CONTROL_PLANE_API_KEY", healthAddress: "127.0.0.1:8765", enabled: true, autoStart: false, expectedGeneration: null });
    const conflict = await manager.register("/repo", migratedIdentity);
    expect(conflict.identityConflict).toBe(true);
    const reconciled = await manager.reconcile("/repo", migratedIdentity, saved.profile!.generation);
    expect(reconciled.profile?.profileName).toBe("first");
    expect(reconciled.identity.fingerprint).toBe(migratedIdentity.fingerprint);
    const stored = JSON.parse(await readFile(join(root, "openai-tunnels.json"), "utf8")) as { projects: Record<string, unknown>; profiles: Record<string, unknown> };
    expect(stored.projects[identity.fingerprint]).toBeUndefined();
    expect(stored.profiles[migratedIdentity.fingerprint]).toBeDefined();
  });

  it("detects a persisted identity change after manager restart", async () => {
    const root = await mkdtemp(join(tmpdir(), "kanmer-openai-tunnel-")); roots.push(root);
    const first = new OpenAITunnelManager(root);
    await first.register("/repo", identity);
    const saved = await first.saveProfile("/repo", identity, { profileName: "first", tunnelId: "tunnel-first", executable: "tunnel-client", credentialEnv: "CONTROL_PLANE_API_KEY", healthAddress: "127.0.0.1:8765", enabled: true, autoStart: false, expectedGeneration: null });
    const restarted = new OpenAITunnelManager(root);
    const conflict = await restarted.register("/repo", migratedIdentity);
    expect(conflict.identityConflict).toBe(true);
    expect(conflict.profile).toBeNull();
    const reconciled = await restarted.reconcile("/repo", migratedIdentity, saved.profile!.generation);
    expect(reconciled.profile?.profileName).toBe("first");
  });

  it("does not leak credentials, starts an owned child, and cleans it up", async () => {
    const root = await mkdtemp(join(tmpdir(), "kanmer-openai-tunnel-")); roots.push(root);
    const children: Array<ChildProcess & { finish(code?: number): void }> = [];
    const environments: NodeJS.ProcessEnv[] = [];
    const manager = new OpenAITunnelManager(root, spawnFake(children, [0, undefined, 0], environments), () => ({ command: "kanmer", args: [], env: { ELECTRON_RUN_AS_NODE: "1" } }));
    await manager.register("/repo", identity);
    const profile = await manager.saveProfile("/repo", identity, { profileName: "first", tunnelId: "tunnel-first", executable: "tunnel-client", credentialEnv: "CONTROL_PLANE_API_KEY", healthAddress: "127.0.0.1:8765", enabled: true, autoStart: false, expectedGeneration: null });
    const previous = process.env.CONTROL_PLANE_API_KEY;
    process.env.CONTROL_PLANE_API_KEY = "do-not-log-this-secret-01234567890123456789";
    try {
      const initialized = await manager.initialize("/repo", identity, { boardRoot: identity.boardRoot, repoRoot: identity.repoRoot });
      expect(initialized.ok).toBe(true);
      expect(initialized.checks.find((check) => check.id === "EXECUTABLE_PRESENT")?.status).toBe("pass");
      expect(environments[0]?.ELECTRON_RUN_AS_NODE).toBe("1");
      const started = await manager.start("/repo", identity, { boardRoot: identity.boardRoot, repoRoot: identity.repoRoot }, profile.profile!.generation);
      expect(started.state).toBe("degraded");
      expect(children).toHaveLength(2);
      expect(environments[1]?.ELECTRON_RUN_AS_NODE).toBe("1");
      await expect(manager.saveProfile("/repo", identity, { profileName: "first", tunnelId: "tunnel-first", executable: "tunnel-client", credentialEnv: "CONTROL_PLANE_API_KEY", healthAddress: "127.0.0.1:8765", enabled: true, autoStart: false, expectedGeneration: profile.profile!.generation, })).rejects.toThrow("OPENAI_STOP_BEFORE_SAVE");
      await manager.markRestartRequired();
      expect((await manager.viewFor("/repo", identity)).status.restartRequired).toBe(true);
      const doctor = await manager.doctor("/repo", identity, { boardRoot: identity.boardRoot, repoRoot: identity.repoRoot });
      expect(doctor.ok).toBe(true);
      expect(doctor.severity).toBe("warning");
      expect(doctor.checks.find((check) => check.id === "HEALTH_ADDRESS")?.status).toBe("warn");
      expect(doctor.checks.some((check) => check.detail.includes("do-not-log"))).toBe(false);
      await manager.closeProject("/repo", identity);
      expect(children[1]!.exitCode).toBe(0);
      expect((await manager.viewFor("/repo", identity)).status.state).toBe("stopped");
    } finally {
      if (previous === undefined) delete process.env.CONTROL_PLANE_API_KEY; else process.env.CONTROL_PLANE_API_KEY = previous;
    }
  });

  it("tracks and terminates an in-flight init command during closeAll", async () => {
    const root = await mkdtemp(join(tmpdir(), "kanmer-openai-tunnel-")); roots.push(root);
    const children: Array<ChildProcess & { finish(code?: number): void }> = [];
    const manager = new OpenAITunnelManager(root, spawnFake(children, [undefined]));
    await manager.register("/repo", identity);
    await manager.saveProfile("/repo", identity, { profileName: "first", tunnelId: "tunnel-first", executable: "tunnel-client", credentialEnv: "CONTROL_PLANE_API_KEY", healthAddress: "127.0.0.1:8765", enabled: true, autoStart: false, expectedGeneration: null });
    const previous = process.env.CONTROL_PLANE_API_KEY;
    process.env.CONTROL_PLANE_API_KEY = "test-key";
    try {
      const initializing = manager.initialize("/repo", identity, { boardRoot: identity.boardRoot, repoRoot: identity.repoRoot });
      await new Promise((resolve) => setTimeout(resolve, 0));
      await manager.closeAll();
      await initializing;
      expect(children[0]!.exitCode).toBe(0);
    } finally {
      if (previous === undefined) delete process.env.CONTROL_PLANE_API_KEY; else process.env.CONTROL_PLANE_API_KEY = previous;
    }
  });

  it("reports the missing named credential without reading a secret", async () => {
    const root = await mkdtemp(join(tmpdir(), "kanmer-openai-tunnel-")); roots.push(root);
    const manager = new OpenAITunnelManager(root, spawnFake([], [0]));
    await manager.register("/repo", identity);
    const profile = await manager.saveProfile("/repo", identity, { profileName: "first", tunnelId: "tunnel-first", executable: "tunnel-client", credentialEnv: "OPENAI_TUNNEL_TEST_MISSING", healthAddress: "127.0.0.1:8765", enabled: true, autoStart: false, expectedGeneration: null });
    const previous = process.env.OPENAI_TUNNEL_TEST_MISSING;
    delete process.env.OPENAI_TUNNEL_TEST_MISSING;
    try {
      const status = await manager.start("/repo", identity, { boardRoot: identity.boardRoot, repoRoot: identity.repoRoot }, profile.profile!.generation);
      expect(status.state).toBe("error");
      expect(status.lastError).toContain("OPENAI_TUNNEL_TEST_MISSING");
    } finally {
      if (previous !== undefined) process.env.OPENAI_TUNNEL_TEST_MISSING = previous;
    }
  });

  it("reports credential failures from auto-start", async () => {
    const root = await mkdtemp(join(tmpdir(), "kanmer-openai-tunnel-")); roots.push(root);
    const manager = new OpenAITunnelManager(root, spawnFake([], []));
    await manager.register("/repo", identity);
    const profile = await manager.saveProfile("/repo", identity, { profileName: "first", tunnelId: "tunnel-first", executable: "tunnel-client", credentialEnv: "OPENAI_TUNNEL_TEST_MISSING", healthAddress: "127.0.0.1:8765", enabled: true, autoStart: true, expectedGeneration: null });
    const previous = process.env.OPENAI_TUNNEL_TEST_MISSING;
    delete process.env.OPENAI_TUNNEL_TEST_MISSING;
    try {
      const result = await manager.autoStart([{ projectId: "/repo", identity }], () => ({ boardRoot: identity.boardRoot, repoRoot: identity.repoRoot }));
      expect(profile.profile?.generation).toBeTruthy();
      expect(result).toEqual([{ projectId: "/repo", ok: false, error: expect.stringContaining("OPENAI_TUNNEL_TEST_MISSING") }]);
    } finally {
      if (previous === undefined) delete process.env.OPENAI_TUNNEL_TEST_MISSING; else process.env.OPENAI_TUNNEL_TEST_MISSING = previous;
    }
  });
});
