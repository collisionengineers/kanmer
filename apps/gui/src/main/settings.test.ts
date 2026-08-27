import { readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({ userData: "", sequence: 0 }));
vi.mock("electron", () => ({ app: { getPath: () => fixture.userData } }));

const {
  readSettings,
  renameSettingsFile,
  setDispatchSettings,
  setKanmerGitHandoff,
  resolveDispatchSettings,
  observeKanmerBoardBranch,
  clearNativeReconnectRequired,
} = await import("./settings.js");

beforeEach(() => {
  fixture.userData = join(tmpdir(), `kanmer-gui129-settings-${process.pid}-${fixture.sequence += 1}`);
});

afterEach(async () => { await rm(fixture.userData, { recursive: true, force: true }); });

function renameError(code: string): NodeJS.ErrnoException {
  return Object.assign(new Error(`rename failed: ${code}`), { code });
}

describe("settings-file atomic rename", () => {
  it.each(["EPERM", "EBUSY"] as const)("retries a transient Windows %s rename within the bounded schedule", (code) => {
    const failure = renameError(code);
    const rename = vi.fn<(...args: [string, string]) => void>()
      .mockImplementationOnce(() => { throw failure; })
      .mockImplementationOnce(() => { throw failure; });
    const pauses: number[] = [];

    renameSettingsFile("temporary", "target", rename, (milliseconds) => pauses.push(milliseconds), "win32");

    expect(rename).toHaveBeenCalledTimes(3);
    expect(pauses).toEqual([10, 20]);
  });

  it("surfaces a persistent transient Windows rename error after the bounded retries", () => {
    const failure = renameError("EPERM");
    const rename = vi.fn(() => { throw failure; });
    const pauses: number[] = [];

    expect(() => renameSettingsFile("temporary", "target", rename, (milliseconds) => pauses.push(milliseconds), "win32")).toThrow(failure);
    expect(rename).toHaveBeenCalledTimes(4);
    expect(pauses).toEqual([10, 20, 40]);
  });

  it.each([
    ["a non-transient Windows error", renameError("EACCES"), "win32"],
    ["a transient non-Windows error", renameError("EPERM"), "linux"],
  ] as const)("does not retry %s", (_case, failure, platform) => {
    const rename = vi.fn(() => { throw failure; });
    const pauses: number[] = [];

    expect(() => renameSettingsFile("temporary", "target", rename, (milliseconds) => pauses.push(milliseconds), platform)).toThrow(failure);
    expect(rename).toHaveBeenCalledTimes(1);
    expect(pauses).toEqual([]);
  });

  it("leaves no temporary sibling after a successful production settings write", async () => {
    await setDispatchSettings({ providers: { codex: { defaultModel: "gpt-5" } } });
    expect(await readdir(fixture.userData)).toEqual(["settings.json"]);
  });
});

describe("git sync interval default", () => {
  it("defaults an unrecorded interval to five minutes and keeps an explicit zero off", async () => {
    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir(fixture.userData, { recursive: true });
    const file = join(fixture.userData, "settings.json");

    expect(readSettings().gitSyncMinutes).toBe(5);
    await writeFile(file, JSON.stringify({ theme: "dark" }), "utf8");
    expect(readSettings().gitSyncMinutes).toBe(5);
    await writeFile(file, JSON.stringify({ gitSyncMinutes: 0 }), "utf8");
    expect(readSettings().gitSyncMinutes).toBe(0);
    await writeFile(file, JSON.stringify({ gitSyncMinutes: 12 }), "utf8");
    expect(readSettings().gitSyncMinutes).toBe(12);
    await writeFile(file, JSON.stringify({ gitSyncMinutes: "soon" }), "utf8");
    expect(readSettings().gitSyncMinutes).toBe(0);
  });
});

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
  it("requires native reconnect on the first observation of a custom branch", async () => {
    expect(await observeKanmerBoardBranch("C:\\repo-existing", "team-board")).toEqual({
      branch: "team-board",
      providers: ["grok", "antigravity"],
    });
  });

  it("persists a pending handoff across settings reads and clears only that project", async () => {
    const handoff = { from: "team-board", to: "renamed-board", warning: "update KANMER_BOARD_BRANCH" };
    await setKanmerGitHandoff("C:\\repo-a", handoff);
    await setKanmerGitHandoff("C:\\repo-b", { ...handoff, from: "old-board" });
    expect(readSettings().pendingBoardHandoffs).toEqual({ "C:\\repo-a": handoff, "C:\\repo-b": { ...handoff, from: "old-board" } });

    await setKanmerGitHandoff("C:\\repo-a", null);
    expect(readSettings().pendingBoardHandoffs).toEqual({ "C:\\repo-b": { ...handoff, from: "old-board" } });
  });

  it("treats native reconnect as user-scoped across closed projects", async () => {
    const project = "C:\\repo-closed";
    const other = "C:\\repo-other";
    expect(await observeKanmerBoardBranch(project, "kanmer-board")).toBeNull();
    expect(await observeKanmerBoardBranch(project, "team-board")).toEqual({
      branch: "team-board",
      providers: ["grok", "antigravity"],
    });
    expect(await observeKanmerBoardBranch(other, "kanmer-board")).toBeNull();
    expect(await observeKanmerBoardBranch(other, "other-board")).toEqual({
      branch: "other-board",
      providers: ["grok", "antigravity"],
    });
    expect(readSettings().pendingNativeReconnects?.[project]).toEqual({
      branch: "team-board",
      providers: ["grok", "antigravity"],
    });
    expect(readSettings().pendingNativeReconnects?.[other]).toEqual({
      branch: "other-board",
      providers: ["grok", "antigravity"],
    });

    await clearNativeReconnectRequired(project, "grok");
    expect(readSettings().pendingNativeReconnects?.[project]).toEqual({
      branch: "team-board",
      providers: ["antigravity"],
    });
    expect(readSettings().pendingNativeReconnects?.[other]).toEqual({
      branch: "other-board",
      providers: ["antigravity"],
    });
    await clearNativeReconnectRequired(project, "antigravity");
    expect(readSettings().pendingNativeReconnects?.[project]).toBeUndefined();
    expect(readSettings().pendingNativeReconnects?.[other]).toBeUndefined();
  });
});
