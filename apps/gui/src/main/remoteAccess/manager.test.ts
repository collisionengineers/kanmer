import { mkdtemp, readFile, rm } from "node:fs/promises";
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
const config = { executable: "cloudflared", tunnelId: "tunnel", credentialsFile: "/credentials.json", hostname: "mcp.example.com", enabled: true };

describe("RemoteAccessManager", () => {
  it("serializes config and persists a bearer before one-time delivery", async () => {
    const root = await mkdtemp(join(tmpdir(), "kanmer-remote-manager-")); roots.push(root);
    const manager = new RemoteAccessManager(root);
    await manager.register("/repo", identity);
    const configured = await manager.saveConfig("/repo", identity, config);
    expect(configured.config.secretConfigured).toBe(false);
    const delivery = await manager.createSecret("/repo", identity);
    expect(delivery.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(manager.consumeSecretDelivery(delivery.deliveryId)).toBe(true);
    expect(manager.consumeSecretDelivery(delivery.deliveryId)).toBe(false);
    await expect(manager.createSecret("/repo", identity)).rejects.toThrow("REMOTE_SECRET_EXISTS");
  });

  it("expires an undelivered token capability", async () => {
    vi.useFakeTimers();
    try {
      const root = await mkdtemp(join(tmpdir(), "kanmer-remote-manager-")); roots.push(root);
      const manager = new RemoteAccessManager(root);
      await manager.register("/repo", identity);
      await manager.saveConfig("/repo", identity, config);
      const delivery = await manager.createSecret("/repo", identity);
      vi.advanceTimersByTime(60_001);
      expect(manager.consumeSecretDelivery(delivery.deliveryId)).toBe(false);
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
    await expect(manager.saveConfig("/other", second, { ...config, hostname: "mcp.example.com" })).rejects.toThrow("REMOTE_RESOURCE_DUPLICATE");
  });

  it("preserves both projects when registration starts concurrently", async () => {
    const root = await mkdtemp(join(tmpdir(), "kanmer-remote-manager-")); roots.push(root);
    const manager = new RemoteAccessManager(root);
    const second = { ...identity, fingerprint: "kanmer-proj-v1:" + "c".repeat(64), repoRoot: "/third" };
    await Promise.all([manager.register("/repo", identity), manager.register("/third", second)]);
    const persisted = JSON.parse(await readFile(join(root, "settings.json"), "utf8")) as { remoteAccess: { projects: Record<string, unknown> } };
    expect(Object.keys(persisted.remoteAccess.projects)).toEqual(expect.arrayContaining([identity.fingerprint, second.fingerprint]));
  });
});
