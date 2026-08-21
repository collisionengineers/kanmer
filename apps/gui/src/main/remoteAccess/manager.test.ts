import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({
  app: { isPackaged: false, getAppPath: () => process.cwd() },
  safeStorage: { isEncryptionAvailable: () => true, getSelectedStorageBackend: () => "dpapi", encryptString: (value: string) => Buffer.from(`enc:${Buffer.from(value).toString("base64")}`), decryptString: (value: Buffer) => Buffer.from(value.toString().slice(4), "base64").toString() },
}));

const { RemoteAccessManager } = await import("./manager.js");
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

const identity = { fingerprint: "kanmer-proj-v1:" + "a".repeat(64), boardRoot: "/repo/.worktrees/kanmer", repoRoot: "/repo", format: 3, boardSource: "file" as const };
const config = { executable: "cloudflared", tunnelId: "tunnel", credentialsFile: "/credentials.json", hostname: "mcp.example.com", enabled: true, autoStart: false, expectedConfigGeneration: null };
const owner = { webContentsId: 1, frameRoutingId: 1 };

describe("RemoteAccessManager", () => {
  it("serializes config and persists a bearer before one-time delivery", async () => {
    const root = await mkdtemp(join(tmpdir(), "kanmer-remote-manager-")); roots.push(root);
    const manager = new RemoteAccessManager(root);
    await manager.register("/repo", identity);
    const configured = await manager.saveConfig("/repo", identity, config);
    expect(configured.config.secretConfigured).toBe(false);
    const delivery = await manager.createSecret("/repo", identity, false, owner);
    expect(delivery.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(manager.consumeSecretDelivery("/repo", delivery.deliveryId, owner)).toBe(true);
    expect(manager.consumeSecretDelivery("/repo", delivery.deliveryId, owner)).toBe(false);
    await expect(manager.createSecret("/repo", identity)).rejects.toThrow("REMOTE_SECRET_EXISTS");
  });

  it("expires an undelivered token capability", async () => {
    vi.useFakeTimers();
    try {
      const root = await mkdtemp(join(tmpdir(), "kanmer-remote-manager-")); roots.push(root);
      const manager = new RemoteAccessManager(root);
      await manager.register("/repo", identity);
      await manager.saveConfig("/repo", identity, config);
      const delivery = await manager.createSecret("/repo", identity, false, owner);
      vi.advanceTimersByTime(60_001);
      expect(manager.consumeSecretDelivery("/repo", delivery.deliveryId, owner)).toBe(false);
    } finally { vi.useRealTimers(); }
  });

  it("keeps project records isolated while queued writes settle", async () => {
    const root = await mkdtemp(join(tmpdir(), "kanmer-remote-manager-")); roots.push(root);
    const manager = new RemoteAccessManager(root);
    const second = { ...identity, fingerprint: "kanmer-proj-v1:" + "b".repeat(64), repoRoot: "/other" };
    await Promise.all([manager.register("/repo", identity), manager.register("/other", second)]);
    const [first, other] = await Promise.all([
      manager.saveConfig("/repo", identity, config),
      manager.saveConfig("/other", second, { ...config, tunnelId: "other-tunnel", hostname: "other.example.com" }),
    ]);
    expect(first.identity.fingerprint).not.toBe(other.identity.fingerprint);
    expect(first.config.hostname).toBe("mcp.example.com");
    expect(other.config.hostname).toBe("other.example.com");
    const otherView = await manager.viewFor("/other", second);
    await expect(manager.saveConfig("/other", second, { ...config, hostname: "mcp.example.com", expectedConfigGeneration: otherView.status.configGeneration })).rejects.toThrow("REMOTE_RESOURCE_DUPLICATE");
  });

  it("preserves both projects when registration starts concurrently", async () => {
    const root = await mkdtemp(join(tmpdir(), "kanmer-remote-manager-")); roots.push(root);
    const manager = new RemoteAccessManager(root);
    const second = { ...identity, fingerprint: "kanmer-proj-v1:" + "c".repeat(64), repoRoot: "/third" };
    await Promise.all([manager.register("/repo", identity), manager.register("/third", second)]);
    const persisted = JSON.parse(await readFile(join(root, "settings.json"), "utf8")) as { remoteAccess: { projects: Record<string, unknown> } };
    expect(Object.keys(persisted.remoteAccess.projects)).toEqual(expect.arrayContaining([identity.fingerprint, second.fingerprint]));
  });

  it("binds delivery consumption to its project and initiating frame", async () => {
    const root = await mkdtemp(join(tmpdir(), "kanmer-remote-manager-")); roots.push(root);
    const manager = new RemoteAccessManager(root);
    await manager.register("/repo", identity);
    await manager.saveConfig("/repo", identity, config);
    const delivery = await manager.createSecret("/repo", identity, false, owner);
    expect(manager.consumeSecretDelivery("/other", delivery.deliveryId, owner)).toBe(false);
    expect(manager.consumeSecretDelivery("/repo", delivery.deliveryId, { webContentsId: 2, frameRoutingId: 1 })).toBe(false);
  });

  it("invalidates the old one-time delivery after a successful rotation", async () => {
    const root = await mkdtemp(join(tmpdir(), "kanmer-remote-manager-")); roots.push(root);
    const manager = new RemoteAccessManager(root);
    await manager.register("/repo", identity);
    await manager.saveConfig("/repo", identity, config);
    const oldDelivery = await manager.createSecret("/repo", identity, false, owner);
    const newDelivery = await manager.createSecret("/repo", identity, true, owner);
    expect(manager.consumeSecretDelivery("/repo", oldDelivery.deliveryId, owner)).toBe(false);
    expect(manager.consumeSecretDelivery("/repo", newDelivery.deliveryId, owner)).toBe(true);
  });

  it("copies in main and clears only an unchanged clipboard value", async () => {
    vi.useFakeTimers();
    try {
    const root = await mkdtemp(join(tmpdir(), "kanmer-remote-manager-")); roots.push(root);
    let clipboardValue = "";
    const clipboard = { readText: () => clipboardValue, writeText: (value: string) => { clipboardValue = value; } };
    const manager = new RemoteAccessManager(root, undefined, undefined, clipboard);
    await manager.register("/repo", identity);
    await manager.saveConfig("/repo", identity, config);
    const delivery = await manager.createSecret("/repo", identity, false, owner);
    expect(manager.copySecretDelivery("/repo", delivery.deliveryId, owner)).toBe(true);
    expect(clipboardValue).toMatch(/^[A-Za-z0-9_-]{43}$/);
    vi.advanceTimersByTime(60_001);
    expect(clipboardValue).toBe("");
    const secondDelivery = await manager.createSecret("/repo", identity, true, owner);
    expect(manager.copySecretDelivery("/repo", secondDelivery.deliveryId, owner)).toBe(true);
    clipboardValue = "a newer user value";
    vi.advanceTimersByTime(60_001);
    expect(clipboardValue).toBe("a newer user value");
    await manager.closeAll();
    expect(clipboardValue).toBe("a newer user value");
    } finally { vi.useRealTimers(); }
  });

  it("enumerates deterministic persisted auto-start registrations and scavenges dead owners", async () => {
    const root = await mkdtemp(join(tmpdir(), "kanmer-remote-manager-")); roots.push(root);
    const projectRoot = await mkdtemp(join(tmpdir(), "kanmer-remote-project-")); roots.push(projectRoot);
    const projectBoard = join(projectRoot, "board");
    await mkdir(projectBoard, { recursive: true });
    const projectIdentity = { ...identity, boardRoot: projectBoard, repoRoot: projectRoot };
    const ownerDir = join(root, "remote-access-owners");
    await (await import("node:fs/promises")).mkdir(ownerDir, { recursive: true });
    await writeFile(join(ownerDir, `${"a".repeat(64)}.json`), JSON.stringify({ pid: 999999, nonce: "00000000-0000-0000-0000-000000000000", projectFingerprint: projectIdentity.fingerprint }));
    const manager = new RemoteAccessManager(root);
    await manager.register("/repo", projectIdentity);
    const first = await manager.viewFor("/repo", projectIdentity);
    await manager.saveConfig("/repo", projectIdentity, { ...config, autoStart: true, expectedConfigGeneration: first.status.configGeneration });
    const configured = await manager.viewFor("/repo", projectIdentity);
    await manager.createSecret("/repo", projectIdentity, false, owner, configured.status.configGeneration);
    const registrations = await manager.autoStartRegistrations();
    expect(registrations.map((entry) => entry.projectId)).toEqual(["/repo"]);
    await expect(readFile(join(ownerDir, `${"a".repeat(64)}.json`))).rejects.toMatchObject({ code: "ENOENT" });
  });
});
