import { describe, expect, it } from "vitest";
import { remoteProjectIdentity } from "./identity.js";

describe("GUI remote project identity", () => {
  it("matches MCP's canonical payload and is stable across slash/case differences", () => {
    const first = remoteProjectIdentity({ boardRoot: "C:\\Work\\Project\\.worktrees\\kanmer", repoRoot: "C:\\Work\\Project", format: 3, boardSource: "file" });
    const second = remoteProjectIdentity({ boardRoot: "c:/Work/Project/.worktrees/kanmer/", repoRoot: "c:/Work/Project/", format: 3, boardSource: "default" });
    expect(first.fingerprint).toBe(second.fingerprint);
    expect(first.fingerprint).toMatch(/^kanmer-proj-v1:[a-f0-9]{64}$/);
  });

  it("changes when the board format changes", () => {
    const current = remoteProjectIdentity({ boardRoot: "/repo/.worktrees/kanmer", repoRoot: "/repo", format: 3, boardSource: "file" });
    const old = remoteProjectIdentity({ boardRoot: "/repo/.worktrees/kanmer", repoRoot: "/repo", format: 2, boardSource: "file" });
    expect(current.fingerprint).not.toBe(old.fingerprint);
  });
});

