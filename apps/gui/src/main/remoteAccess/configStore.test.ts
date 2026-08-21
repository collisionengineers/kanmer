import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { emptyRemoteAccess, readRemoteAccess, remoteAccessPath, writeRemoteAccess } from "./configStore.js";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe("remote access persistence", () => {
  it("writes atomically and round-trips only the versioned registry", async () => {
    const root = await mkdtemp(join(tmpdir(), "kanmer-remote-config-")); roots.push(root);
    const value = emptyRemoteAccess();
    const fingerprint = `kanmer-proj-v1:${"a".repeat(64)}`;
    value.projects[fingerprint] = { projectId: "/repo", identity: { fingerprint, boardRoot: "/repo/.worktrees/kanmer", repoRoot: "/repo", format: 3, boardSource: "file" } };
    await writeRemoteAccess(root, value);
    expect(JSON.parse(await readFile(remoteAccessPath(root), "utf8")).remoteAccess.version).toBe(1);
    expect((await readRemoteAccess(root)).projects[fingerprint].projectId).toBe("/repo");
  });

  it("rejects malformed and secret-bearing config records on read", async () => {
    const root = await mkdtemp(join(tmpdir(), "kanmer-remote-config-")); roots.push(root);
    await writeRemoteAccess(root, { version: 1, projects: {}, configs: { bad: { provider: "cloudflared", token: "should-not-survive" } } } as never);
    expect((await readRemoteAccess(root)).configs).toEqual({});
  });
});
