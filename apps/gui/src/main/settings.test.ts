import { rm } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";

const userData = "C:\\Windows\\Temp\\kanmer-gui075-settings";
vi.mock("electron", () => ({ app: { getPath: () => "C:\\Windows\\Temp\\kanmer-gui075-settings" } }));

const {
  readSettings,
  setDispatchSettings,
  setKanmerGitHandoff,
  resolveDispatchSettings,
  observeKanmerBoardBranch,
  clearNativeReconnectRequired,
} = await import("./settings.js");

afterEach(async () => { await rm(userData, { recursive: true, force: true }); });

describe("dispatch settings", () => {
  it("normalizes known providers/tasks and resolves task precedence", async () => {
    const saved = await setDispatchSettings({
      providers: {
        claude: { defaultModel: "  sonnet  ", taskModels: { files: "haiku", stale: "ignored" } as never, promptSuffix: "  run lint  " },
      },
    });
    expect(saved.dispatch.providers).toEqual({ claude: { defaultModel: "sonnet", taskModels: { files: "haiku" }, promptSuffix: "run lint" } });
    expect(resolveDispatchSettings(saved.dispatch, "claude", "files")).toMatchObject({ model: "haiku", promptCustomized: true });
    expect(resolveDispatchSettings(saved.dispatch, "claude", "verify")).toMatchObject({ model: "sonnet" });
    expect(readSettings().dispatch).toEqual(saved.dispatch);
  });

  it("rejects invalid control characters and oversized values before writing", async () => {
    await expect(setDispatchSettings({ providers: { codex: { defaultModel: "bad\0model" } } })).rejects.toThrow(/invalid/);
    await expect(setDispatchSettings({ providers: { codex: { defaultModel: "bad\nmodel" } } })).rejects.toThrow(/invalid/);
    await expect(setDispatchSettings({ providers: { codex: { defaultModel: "bad\tmodel" } } })).rejects.toThrow(/invalid/);
    await expect(setDispatchSettings({ providers: { codex: { promptSuffix: "x".repeat(4001) } } })).rejects.toThrow(/invalid/);
  });
});

describe("board-branch handoff settings", () => {
  it("persists a pending handoff across settings reads and clears only that project", async () => {
    const handoff = { from: "team-board", to: "renamed-board", warning: "update KANMER_BOARD_BRANCH" };
    await setKanmerGitHandoff("C:\\repo-a", handoff);
    await setKanmerGitHandoff("C:\\repo-b", { ...handoff, from: "old-board" });
    expect(readSettings().pendingBoardHandoffs).toEqual({ "C:\\repo-a": handoff, "C:\\repo-b": { ...handoff, from: "old-board" } });

    await setKanmerGitHandoff("C:\\repo-a", null);
    expect(readSettings().pendingBoardHandoffs).toEqual({ "C:\\repo-b": { ...handoff, from: "old-board" } });
  });

  it("retains native reconnect requirements when a closed project's branch changes", async () => {
    const project = "C:\\repo-closed";
    expect(await observeKanmerBoardBranch(project, "release-board")).toBeNull();
    expect(await observeKanmerBoardBranch(project, "team-board")).toEqual({
      branch: "team-board",
      providers: ["grok", "antigravity"],
    });
    expect(readSettings().pendingNativeReconnects?.[project]).toEqual({
      branch: "team-board",
      providers: ["grok", "antigravity"],
    });

    await clearNativeReconnectRequired(project, "grok");
    expect(readSettings().pendingNativeReconnects?.[project]).toEqual({
      branch: "team-board",
      providers: ["antigravity"],
    });
    await clearNativeReconnectRequired(project, "antigravity");
    expect(readSettings().pendingNativeReconnects?.[project]).toBeUndefined();
  });
});
