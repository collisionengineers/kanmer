import { EventEmitter } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { ChildProcess } from "node:child_process";
import {
  OpenAITunnelManager,
  buildOpenAITunnelMcpCommand,
  isLoopbackHealthAddress,
  isSafeOpenAIExecutable,
} from "./openaiTunnel.js";

const identity = { fingerprint: `kanmer-proj-v1:${"a".repeat(64)}`, boardRoot: "/repo/.worktrees/kanmer", repoRoot: "/repo", format: 3 as const, boardSource: "file" as const };
const secondIdentity = { ...identity, fingerprint: `kanmer-proj-v1:${"b".repeat(64)}`, repoRoot: "/other" };
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
      expect(environments[0]?.ELECTRON_RUN_AS_NODE).toBe("1");
      const started = await manager.start("/repo", identity, { boardRoot: identity.boardRoot, repoRoot: identity.repoRoot }, profile.profile!.generation);
      expect(started.state).toBe("degraded");
      expect(children).toHaveLength(2);
      expect(environments[1]?.ELECTRON_RUN_AS_NODE).toBe("1");
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
});
