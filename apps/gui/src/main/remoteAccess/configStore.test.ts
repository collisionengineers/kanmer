import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { emptyRemoteAccess, readRemoteAccess, remoteAccessPath, writeRemoteAccess } from "./configStore.js";
import { canonicalProjectPath } from "./identity.js";
import { removeTreeWithRetry } from "@kanmer/core";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => removeTreeWithRetry(root))); });

describe("remote access persistence", () => {
  it("writes atomically and round-trips only the versioned registry", async () => {
    const root = await mkdtemp(join(tmpdir(), "kanmer-remote-config-")); roots.push(root);
    const value = emptyRemoteAccess();
    const fingerprint = `kanmer-proj-v1:${"a".repeat(64)}`;
    value.projects[fingerprint] = { projectId: "/repo", identity: { fingerprint, boardRoot: "/repo/.worktrees/kanmer", repoRoot: "/repo", format: 3, boardSource: "file" } };
    await writeRemoteAccess(root, value);
    expect(JSON.parse(await readFile(remoteAccessPath(root), "utf8")).remoteAccess.version).toBe(1);
    expect((await readRemoteAccess(root)).projects[fingerprint].projectId).toBe(canonicalProjectPath("/repo"));
  });

  it("rejects malformed and secret-bearing config records on read", async () => {
    const root = await mkdtemp(join(tmpdir(), "kanmer-remote-config-")); roots.push(root);
    await writeRemoteAccess(root, { version: 1, projects: {}, configs: { bad: { provider: "cloudflared", token: "should-not-survive" } } } as never);
    expect((await readRemoteAccess(root)).configs).toEqual({});
  });

  it("drops orphan registrations and unsafe persisted paths", async () => {
    const root = await mkdtemp(join(tmpdir(), "kanmer-remote-config-")); roots.push(root);
    const fingerprint = `kanmer-proj-v1:${"b".repeat(64)}`;
    await writeRemoteAccess(root, {
      version: 1,
      projects: {
        [fingerprint]: { projectId: "/repo", identity: { fingerprint, boardRoot: "/repo/.worktrees/kanmer", repoRoot: "/repo", format: 3, boardSource: "file" } },
      },
      configs: {
        [fingerprint]: { provider: "cloudflared", executable: "cloudflared", tunnelId: "not-a-uuid", credentialsFile: "relative.json", hostname: "kanmer.example.com", enabled: true, autoStart: true, secretId: "secret" },
        orphan: { provider: "cloudflared", executable: "cloudflared", tunnelId: "4f9620b4-423e-4f37-a30e-61ffcf91f404", credentialsFile: "/credentials.json", hostname: "orphan.example.com", enabled: true, autoStart: true, secretId: "orphan-secret" },
      },
    } as never);
    const loaded = await readRemoteAccess(root);
    expect(loaded.projects).toEqual({ [fingerprint]: expect.anything() });
    expect(loaded.configs).toEqual({});
  });

  it("canonicalizes Windows path spellings before matching a project identity", async () => {
    if (process.platform !== "win32") return;
    const root = await mkdtemp(join(tmpdir(), "kanmer-remote-config-")); roots.push(root);
    const fingerprint = `kanmer-proj-v1:${"c".repeat(64)}`;
    await writeRemoteAccess(root, {
      version: 1,
      projects: {
        [fingerprint]: { projectId: "C:\\Repo\\", identity: { fingerprint, boardRoot: "C:\\Repo\\.worktrees\\kanmer\\", repoRoot: "c:/Repo/", format: 3, boardSource: "file" } },
      },
      configs: {},
    } as never);
    const loaded = await readRemoteAccess(root);
    expect(loaded.projects[fingerprint].projectId).toBe("c:/Repo");
    expect(loaded.projects[fingerprint].identity.repoRoot).toBe("c:/Repo");
  });

  it("redacts token-shaped persisted doctor diagnostics", async () => {
    const root = await mkdtemp(join(tmpdir(), "kanmer-remote-config-")); roots.push(root);
    const fingerprint = `kanmer-proj-v1:${"d".repeat(64)}`;
    await writeRemoteAccess(root, {
      version: 1,
      projects: {
        [fingerprint]: { projectId: "/repo", identity: { fingerprint, boardRoot: "/repo/.worktrees/kanmer", repoRoot: "/repo", format: 3, boardSource: "file" } },
      },
      configs: {
        [fingerprint]: { provider: "cloudflared", executable: "cloudflared", tunnelId: "5f9620b4-423e-4f37-a30e-61ffcf91f405", credentialsFile: "/credentials.json", hostname: "kanmer.example.com", enabled: true, autoStart: false, secretId: "", lastDoctorSummary: `token-${"a".repeat(40)}`, lastDoctorRepair: `repair-${"b".repeat(40)}` },
      },
    } as never);
    const loaded = await readRemoteAccess(root);
    expect(loaded.configs[fingerprint].lastDoctorSummary).toBe("[redacted]");
    expect(loaded.configs[fingerprint].lastDoctorRepair).toBe("[redacted]");
  });
});
