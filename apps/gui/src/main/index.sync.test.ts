import { execFile as execFileCallback } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const electronMocks = vi.hoisted(() => ({
  syncBoard: vi.fn(),
  app: {
    isPackaged: false,
    requestSingleInstanceLock: vi.fn(() => true),
    quit: vi.fn(),
    exit: vi.fn(),
    on: vi.fn(),
    whenReady: vi.fn(() => new Promise<void>(() => undefined)),
    getPath: vi.fn(() => join(tmpdir(), "kanmer-core084-electron")),
    getAppPath: vi.fn(() => process.cwd()),
    getVersion: vi.fn(() => "0.3.3"),
    setAppUserModelId: vi.fn(),
  },
  nativeTheme: {
    shouldUseDarkColors: false,
    themeSource: "dark",
    on: vi.fn(),
  },
  ipcMain: { handle: vi.fn() },
}));

vi.mock("electron", () => ({
  app: electronMocks.app,
  BrowserWindow: class BrowserWindow {
    static getAllWindows(): unknown[] { return []; }
  },
  dialog: {
    showOpenDialog: vi.fn(),
    showMessageBox: vi.fn(),
  },
  ipcMain: electronMocks.ipcMain,
  Menu: {
    buildFromTemplate: vi.fn(() => ({})),
    setApplicationMenu: vi.fn(),
  },
  nativeTheme: electronMocks.nativeTheme,
  Notification: class Notification {},
  screen: { getAllDisplays: vi.fn(() => [{ workArea: { x: 0, y: 0, width: 1920, height: 1080 } }]) },
  shell: {
    openExternal: vi.fn(),
    openPath: vi.fn(),
    trashItem: vi.fn(),
  },
}));

vi.mock("electron-updater", () => ({
  autoUpdater: {
    on: vi.fn(),
    checkForUpdates: vi.fn(),
    quitAndInstall: vi.fn(),
  },
}));

vi.mock("./kanmerGit.js", async () => {
  const actual = await vi.importActual<typeof import("./kanmerGit.js")>("./kanmerGit.js");
  return { ...actual, syncBoard: electronMocks.syncBoard };
});

import { __kanmerTest } from "./index.js";
import { ensureBoardWorktree } from "./kanmerGit.js";

const execFile = promisify(execFileCallback);
const git = async (cwd: string, ...args: string[]): Promise<string> =>
  (await execFile("git", args, {
    cwd,
    windowsHide: true,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  })).stdout.trim();

let dir: string;
let repo: string;
let origin: string;

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), "kanmer-core084-sync-"));
  origin = join(dir, "origin.git");
  repo = join(dir, "repo");
  mkdirSync(repo, { recursive: true });
  await git(dir, "init", "--bare", "--initial-branch=main", origin);
  await git(dir, "init", "--initial-branch=main", repo);
  await git(repo, "config", "user.email", "test@example.com");
  await git(repo, "config", "user.name", "Test");
  await git(repo, "remote", "add", "origin", origin);
  writeFileSync(join(repo, "README.md"), "fixture\n", "utf8");
  await git(repo, "add", "--", "README.md");
  await git(repo, "commit", "-m", "fixture");
  await git(repo, "push", "-u", "origin", "main");
  electronMocks.syncBoard.mockReset();
  electronMocks.syncBoard.mockImplementation(async (status) => status);
});

afterEach(() => {
  __kanmerTest.contexts.delete(repo);
  rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
});

describe("syncProject production Retry caller", () => {
  it("returns paused mismatch without invoking syncBoard or mutating refs", async () => {
    const beforeRefs = await git(repo, "show-ref");
    const beforeWorktrees = await git(repo, "worktree", "list", "--porcelain");
    const ctx = {
      sourceRoot: repo,
      boardRoot: repo,
      store: {
        getBoardWithSource: async () => ({ source: "file" }),
        listItems: async () => [],
      },
      watch: { close: async () => undefined },
      ownWrites: new Map<string, number>(),
      syncStatus: {
        available: true,
        boardRoot: repo,
        branch: "kanmer-board",
        lastSync: null,
        error: null,
        paused: true,
      },
    };
    __kanmerTest.contexts.set(repo, ctx as never);

    const result = await __kanmerTest.syncProject(repo);

    expect(result).toMatchObject({
      branch: "kanmer-board",
      branchMismatch: true,
      paused: true,
      error: expect.stringContaining("main"),
    });
    expect(electronMocks.syncBoard).not.toHaveBeenCalled();
    expect(await git(repo, "show-ref")).toBe(beforeRefs);
    expect(await git(repo, "worktree", "list", "--porcelain")).toBe(beforeWorktrees);
    expect(readFileSync(join(repo, "README.md"), "utf8")).toBe("fixture\n");
  }, 30_000);

  it("retries a retained board root after a closed-project protected refusal", async () => {
    mkdirSync(join(repo, ".kanmer"), { recursive: true });
    writeFileSync(join(repo, ".kanmer", "version.json"), '{"format":3}\n', "utf8");
    await git(repo, "add", "--", ".kanmer");
    await git(repo, "commit", "-m", "board");

    const protectedStatus = await ensureBoardWorktree(repo, "kanmer-board");
    expect(protectedStatus.available).toBe(true);
    const refusal = await ensureBoardWorktree(repo, "team-board");
    expect(refusal).toMatchObject({ available: false, boardRoot: protectedStatus.boardRoot, branch: "team-board" });
    expect(refusal.error).toMatch(/Cannot rename protected board branch kanmer-board automatically/);

    // The administrator completes the protected handoff while the project is
    // closed. Retry must re-run reconciliation against the retained root and
    // only then enter the normal sync path.
    await git(protectedStatus.boardRoot!, "branch", "-m", "team-board");
    const ctx = {
      sourceRoot: repo,
      boardRoot: protectedStatus.boardRoot!,
      store: {
        getBoardWithSource: async () => ({ source: "file" }),
        listItems: async () => [],
      },
      watch: { close: async () => undefined },
      ownWrites: new Map<string, number>(),
      syncStatus: refusal,
    };
    __kanmerTest.contexts.set(repo, ctx as never);

    const result = await __kanmerTest.syncProject(repo);

    expect(result).toMatchObject({ available: true, branch: "team-board", boardRoot: protectedStatus.boardRoot, paused: false });
    expect(electronMocks.syncBoard).toHaveBeenCalledTimes(1);
    expect(await git(protectedStatus.boardRoot!, "symbolic-ref", "--short", "HEAD")).toBe("team-board");
  }, 30_000);
});
