import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeTheme,
  Notification,
  screen,
  shell,
  type MenuItemConstructorOptions,
  type IpcMainInvokeEvent,
} from "electron";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { classifyKanmerPath } from "../shared/kanmerPath.js";
import {
  BOUNDARIES,
  composeDispatchPrompt,
  DISPATCH_TASKS,
  DOC_TYPES,
  GATE_EXEMPT_DIRS,
  KanmerStore,
  STAGE_IDS,
  assertSafeRepoPath,
  getLinkGraph,
  linkItems,
  migrateBoard,
  repoDocsMap,
  resolveProfiles,
  resolveProofTypes,
  stageName,
  taskFeasibility,
  watchKanmer,
  type BoardColumn,
  type BoardConfig,
  type ColumnKind,
  type CreateItemInput,
  type ItemFilter,
  type MovePosition,
  type TakeTicketInput,
  type TicketDoc,
  type UpdateItemPatch,
  type WatchHandle,
} from "@kanmer/core";
import {
  CH,
  type BoardWorktreeHealth,
  type KanmerGitStatus as KanmerGitIpcStatus,
  type OpenProjectResult,
} from "../shared/ipc.js";
import {
  readSettings,
  recordRecentProject,
  setNotifications,
  setOpenTabs,
  setPreferences,
  setDispatchSettings,
  setTheme,
  setKanmerGitPreferences,
  setKanmerGitHandoff,
  observeKanmerBoardBranch,
  markNativeReconnectRequired,
  clearNativeReconnectRequired,
  setWindowBounds,
  type AppSettings,
  type Theme,
  type UiPreferences,
  type WindowBounds,
} from "./settings.js";
import {
  nativeChromeBackground,
  refreshesForSystemTheme,
  synchronizeNativeTheme,
} from "./nativeTheme.js";
import {
  ensureBoardWorktree,
  guardGitBranchPreference,
  inspectBoardWorktree,
  preflightBoardSync,
  PROTECTED_BOARD_BRANCH,
  refreshBoardBranchForPreference,
  renameBoardBranch,
  shouldRunAutomaticSync,
  shouldScheduleAutomaticSync,
  shouldAttemptOrdinaryBranchRename,
  shouldAttemptProtectedBranchRename,
  syncBoard,
  type KanmerGitStatus,
} from "./kanmerGit.js";
import { armAutomaticSync } from "./syncTimer.js";
import { withSyncLifecycles } from "./syncLifecycle.js";
import { bindRetryBoardStatus, retryBoardBranch } from "./syncBranch.js";
import {
  connectAgent,
  disconnectAgent,
  drainLegacyCodexRegistrations,
  reconcileProviderRegistration,
  scanLegacyCodexRegistrations,
  skillsStatus,
  updateSkills,
  bundledSkillsRoot,
  serverInvocation,
  type ConnectTarget,
} from "./connect.js";
import { listProviders } from "./providers.js";
import { repoStalenessFor } from "./repoStaleness.js";
import {
  cancelDispatch,
  dispatchTicket,
  killAllDispatches,
  listDispatches,
  onDispatchStatus,
} from "./dispatch.js";
import {
  checkForUpdatesNow,
  initUpdater,
  installUpdateNow,
  isUpdaterEnabled,
  maybeBlockQuitForUpdate,
  updateState,
} from "./updater.js";
import { mcpSessions } from "./mcp-sessions.js";
import { captureSmokePage, requestedSmokeCapturePath, writeSmokeCapture } from "./smokeCapture.js";
import { remoteProjectIdentity } from "./remoteAccess/identity.js";
import { RemoteAccessManager } from "./remoteAccess/manager.js";
import { OpenAITunnelManager, type OpenAITunnelRoots } from "./openaiTunnel.js";
import type { OpenAITunnelConfigInput, RemoteConfigInput } from "../shared/ipc.js";

let mainWindow: BrowserWindow | null = null;

/** One open project. projectId is its canonical root (D2). */
interface ProjectContext {
  sourceRoot: string;
  boardRoot: string;
  store: KanmerStore;
  watch: WatchHandle;
  /** Recent writes this GUI made, so its own file changes don't self-toast. */
  ownWrites: Map<string, number>;
  syncTimer?: NodeJS.Timeout;
  syncStatus: KanmerGitStatus;
  lifecycle?: Promise<void>;
}
const contexts = new Map<string, ProjectContext>();
let connectAgentOverride: typeof connectAgent | null = null;
/** Serializes project open/close, Git preference changes and Connect IPC. */
const appLifecycle: { lifecycle?: Promise<void> } = {};
let remoteAccess: RemoteAccessManager | null = null;
let openAITunnel: OpenAITunnelManager | null = null;
let remoteQuitInProgress = false;

function clearSyncTimer(ctx: ProjectContext): void {
  if (ctx.syncTimer) clearInterval(ctx.syncTimer);
  ctx.syncTimer = undefined;
}

function armSyncTimer(projectId: string, ctx: ProjectContext, minutes: number): void {
  armAutomaticSync(
    ctx,
    shouldScheduleAutomaticSync(ctx.syncStatus, minutes),
    minutes,
    () => {
      if (contexts.get(projectId) !== ctx) return;
      void syncProject(projectId, true).catch((error) => console.error(`[git-sync] automatic sync failed for ${projectId}: ${error instanceof Error ? error.message : String(error)}`));
    },
  );
}

async function remoteIdentity(ctx: ProjectContext) {
  const [{ source }, format] = await Promise.all([ctx.store.getBoardWithSource(), ctx.store.detectFormat()]);
  return remoteProjectIdentity({ boardRoot: ctx.boardRoot, repoRoot: ctx.sourceRoot, format, boardSource: source });
}

function requireRemoteAccess(): RemoteAccessManager {
  if (!remoteAccess) throw new Error("REMOTE_MANAGER_NOT_READY");
  return remoteAccess;
}

function requireOpenAITunnel(): OpenAITunnelManager {
  if (!openAITunnel) throw new Error("OPENAI_TUNNEL_MANAGER_NOT_READY");
  return openAITunnel;
}

const REGISTRATION_PROVIDERS: ConnectTarget[] = ["codex", "claude", "opencode"];

function providerReconciliationMessage(failures: string[]): string {
  return `Provider registration reconciliation failed — ${failures.join("; ")}`;
}

/** Retry the provider registrations that failed during a branch lifecycle. */
async function reconcileProjectProviders(
  ctx: ProjectContext,
  providers: readonly string[] = REGISTRATION_PROVIDERS,
  branch = ctx.syncStatus.branch,
): Promise<boolean> {
  if (!ctx.syncStatus.boardRoot) return false;
  const failures: string[] = [];
  for (const provider of providers) {
    if (!REGISTRATION_PROVIDERS.includes(provider as ConnectTarget)) continue;
    const result = await reconcileProviderRegistration(
      provider as ConnectTarget,
      ctx.sourceRoot,
      ctx.syncStatus.boardRoot,
      branch,
    );
    if (!result.ok) failures.push(`${provider}: ${result.output}`);
  }
  const previous = ctx.syncStatus.error;
  if (failures.length > 0) {
    ctx.syncStatus = {
      ...ctx.syncStatus,
      providerReconciliationPending: { providers: [...providers], branch },
      error: [...new Set([ctx.syncStatus.error, providerReconciliationMessage(failures)].filter(Boolean))].join(" "),
      paused: true,
    };
    return false;
  }
  const providerMarker = previous?.indexOf("Provider registration reconciliation failed —") ?? -1;
  const preservedError = providerMarker >= 0 ? previous!.slice(0, providerMarker).trim() : previous;
  const { providerReconciliationPending: _pending, ...withoutPending } = ctx.syncStatus;
  ctx.syncStatus = providerMarker >= 0
    ? { ...withoutPending, error: preservedError || null, paused: preservedError ? ctx.syncStatus.paused : false }
    : withoutPending;
  return true;
}

async function openAITunnelIdentity(ctx: ProjectContext) {
  return remoteIdentity(ctx);
}

function openAITunnelRoots(ctx: ProjectContext): OpenAITunnelRoots {
  return { boardRoot: ctx.boardRoot, repoRoot: ctx.sourceRoot };
}

function assertTrustedRemoteSender(event: IpcMainInvokeEvent): void {
  const frame = event.senderFrame;
  const trusted = mainWindow?.webContents === event.sender && mainWindow?.webContents.mainFrame === frame;
  const devUrl = process.env["ELECTRON_RENDERER_URL"];
  let allowedUrl = false;
  try {
    const actual = new URL(frame?.url ?? "");
    if (actual.protocol === "file:") allowedUrl = actual.href === pathToFileURL(join(__dirname, "../renderer/index.html")).href;
    else if (devUrl) {
      const expected = new URL(devUrl);
      allowedUrl = (expected.protocol === "http:" || expected.protocol === "https:") && !expected.search && !expected.hash && actual.origin === expected.origin && actual.pathname === expected.pathname && !actual.search && !actual.hash;
    }
  } catch { allowedUrl = false; }
  if (!trusted || !allowedUrl) throw new Error("REMOTE_IPC_UNTRUSTED_SENDER");
}

function assertRemoteProjectId(value: unknown): asserts value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 4096) throw new Error("REMOTE_PROJECT_ID_INVALID");
}

function assertRemoteConfig(value: unknown): asserts value is RemoteConfigInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("REMOTE_CONFIG_INVALID");
  const keys = Object.keys(value).sort().join(",");
  if (keys !== "autoStart,credentialsFile,enabled,executable,expectedConfigGeneration,hostname,tunnelId") throw new Error("REMOTE_CONFIG_UNKNOWN_FIELD");
  const config = value as Partial<RemoteConfigInput>;
  if (![config.executable, config.tunnelId, config.credentialsFile, config.hostname].every((part) => typeof part === "string") || typeof config.enabled !== "boolean" || typeof config.autoStart !== "boolean" || (config.expectedConfigGeneration !== null && typeof config.expectedConfigGeneration !== "string")) throw new Error("REMOTE_CONFIG_INVALID");
}

function assertOpenAITunnelConfig(value: unknown): asserts value is OpenAITunnelConfigInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("OPENAI_PROFILE_INVALID");
  const keys = Object.keys(value).sort().join(",");
  if (keys !== "autoStart,credentialEnv,enabled,executable,expectedGeneration,healthAddress,profileName,tunnelId") throw new Error("OPENAI_PROFILE_UNKNOWN_FIELD");
  const config = value as Partial<OpenAITunnelConfigInput>;
  if (![config.profileName, config.tunnelId, config.executable, config.credentialEnv, config.healthAddress].every((part) => typeof part === "string") || typeof config.enabled !== "boolean" || typeof config.autoStart !== "boolean" || (config.expectedGeneration !== null && typeof config.expectedGeneration !== "string")) throw new Error("OPENAI_PROFILE_INVALID");
}

function remoteOwner(event: IpcMainInvokeEvent): { webContentsId: number; frameRoutingId: number } {
  return { webContentsId: event.sender.id, frameRoutingId: event.senderFrame.routingId };
}

// ---------------------------------------------------------------------------
// Single instance: a second launch focuses the existing window instead.
// ---------------------------------------------------------------------------
if (!app.requestSingleInstanceLock()) {
  if (process.env["KANMER_SMOKE"]) {
    // The boot smoke must not be able to pass without booting. Losing the lock
    // means this process is about to quit having rendered nothing — and a plain
    // app.quit() here exits 0, which made the checklist step §10.5 a false pass.
    // Give each smoke run its own lock with:
    //   npx electron . --user-data-dir=<fresh dir>
    console.error(
      "KANMER_SMOKE: single-instance lock not acquired — quitting without rendering. " +
        "Close any running Kanmer, or pass --user-data-dir=<fresh dir>.",
    );
    app.exit(1);
  }
  app.quit();
}
app.on("second-instance", () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});

function requireCtx(projectId: string): ProjectContext {
  const ctx = contexts.get(projectId);
  if (!ctx) throw new Error(`Project not open: ${projectId}`);
  return ctx;
}
function requireStore(projectId: string): KanmerStore {
  return requireCtx(projectId).store;
}

/** Keep OS-rendered chrome (title/menu/dialogs) in the same mode as the app. */
function applyNativeTheme(theme = readSettings().theme): void {
  synchronizeNativeTheme(theme, nativeTheme, (color) => mainWindow?.setBackgroundColor(color));
}

nativeTheme.on("updated", () => {
  if (refreshesForSystemTheme(readSettings().theme)) applyNativeTheme("system");
});

/** Restore saved window bounds only if they still intersect a display. */
function restorableBounds(): WindowBounds | null {
  const saved = readSettings().windowBounds;
  if (!saved) return null;
  if (saved.x === undefined || saved.y === undefined) return saved;
  const visible = screen.getAllDisplays().some((d) => {
    const a = d.workArea;
    return (
      saved.x! < a.x + a.width &&
      saved.x! + saved.width > a.x &&
      saved.y! < a.y + a.height &&
      saved.y! + saved.height > a.y
    );
  });
  return visible ? saved : null;
}

function createWindow(): void {
  applyNativeTheme();
  const saved = restorableBounds();
  const theme = readSettings().theme;
  mainWindow = new BrowserWindow({
    width: saved?.width ?? 1280,
    height: saved?.height ?? 820,
    ...(saved?.x !== undefined && saved?.y !== undefined ? { x: saved.x, y: saved.y } : {}),
    minWidth: 900,
    minHeight: 600,
    // Resolve the theme BEFORE the window exists so light-theme users don't
    // get a dark flash every launch (and vice versa).
    backgroundColor: nativeChromeBackground(theme, nativeTheme.shouldUseDarkColors),
    show: false,
    title: "Kanmer",
    ...(iconPath() ? { icon: iconPath()! } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once("ready-to-show", () => {
    if (saved?.maximized) mainWindow?.maximize();
    mainWindow?.show();
  });

  // Persist window bounds (debounced on move/resize, final write on close).
  let boundsTimer: NodeJS.Timeout | null = null;
  const saveBounds = () => {
    if (!mainWindow) return;
    void setWindowBounds({ ...mainWindow.getNormalBounds(), maximized: mainWindow.isMaximized() });
  };
  const scheduleSaveBounds = () => {
    if (boundsTimer) clearTimeout(boundsTimer);
    boundsTimer = setTimeout(saveBounds, 500);
  };
  mainWindow.on("resize", scheduleSaveBounds);
  mainWindow.on("move", scheduleSaveBounds);
  mainWindow.on("close", () => {
    if (boundsTimer) clearTimeout(boundsTimer);
    saveBounds();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // electron-vite provides the dev server URL; fall back to the built file.
  const devUrl = process.env["ELECTRON_RENDERER_URL"];
  if (devUrl) {
    void mainWindow.loadURL(devUrl);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  // External links open in the default browser — never navigate the app
  // window away (an https link in a markdown preview used to strand the UI).
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (e, url) => {
    let internal = false;
    try {
      const actual = new URL(url);
      if (devUrl) {
        const expected = new URL(devUrl);
        internal = (expected.protocol === "http:" || expected.protocol === "https:") && !expected.search && !expected.hash && actual.origin === expected.origin && actual.pathname === expected.pathname && !actual.search && !actual.hash;
      } else {
        internal = actual.href === pathToFileURL(join(__dirname, "../renderer/index.html")).href;
      }
    } catch { internal = false; }
    if (internal) return;
    e.preventDefault();
    if (/^https?:/i.test(url)) void shell.openExternal(url);
  });

  // Smoke mode: verify the app boots and renders, then exit cleanly. Exit 0 is
  // the only success, so every way of *not* rendering has to exit non-zero —
  // otherwise the check cannot fail and is worse than no check.
  if (process.env["KANMER_SMOKE"]) {
    // The packaged app with no app-update.yml is the exact "works in dev,
    // silently dead when packaged" failure: it boots, the board works, and the
    // updater never finds a feed. Only a packaged run can see this, so assert
    // it here rather than in a unit test.
    if (app.isPackaged) {
      const feed = join(process.resourcesPath, "app-update.yml");
      if (!existsSync(feed)) {
        console.error(`KANMER_SMOKE: ${feed} is missing — the packaged app has no update feed`);
        app.exit(1);
        // app.exit() tears the window down but this function keeps running;
        // without the return the watchdog wiring below dereferences a window
        // that is already gone.
        return;
      }
    }
    let readyToShow = false;
    mainWindow.once("ready-to-show", () => {
      readyToShow = true;
    });
    const watchdog = setTimeout(() => {
      console.error("KANMER_SMOKE: renderer never finished loading within 20s");
      app.exit(1);
    }, 20_000);
    mainWindow.webContents.once("did-finish-load", () => {
      setTimeout(() => {
        void (async () => {
        if (!readyToShow) {
          clearTimeout(watchdog);
          console.error("KANMER_SMOKE: renderer loaded but the window never reached ready-to-show");
          app.exit(1);
          return;
        }
        try {
          const output = requestedSmokeCapturePath();
          if (output) {
            const marker = `KANMER-SMOKE-${Date.now()}-${process.pid}`;
            const capture = await captureSmokePage(mainWindow!.webContents, marker);
            await writeSmokeCapture(output, capture.png);
            console.error(
              `KANMER_SMOKE: captured ${capture.size.width}x${capture.size.height} renderer PNG ` +
                `with marker ${capture.marker} at ${output}`,
            );
          }
        } catch (error) {
          clearTimeout(watchdog);
          console.error(
            `KANMER_SMOKE: renderer capture failed — ${error instanceof Error ? error.message : String(error)}`,
          );
          app.exit(1);
          return;
        }
        clearTimeout(watchdog);
        app.exit(0);
        })();
      }, 1500);
    });
  }
}

/** Dev-mode window icon (packaged builds get it from the exe/installer). */
function iconPath(): string | null {
  const p = join(app.getAppPath(), "build", "icon.ico");
  return existsSync(p) ? p : null;
}

// ---------------------------------------------------------------------------
// Application menu (the stock Electron menu shipped DevTools to end users).
// ---------------------------------------------------------------------------
function buildMenu(): void {
  const recents = readSettings().recentProjects;
  const template: MenuItemConstructorOptions[] = [
    {
      label: "&File",
      submenu: [
        {
          label: "Open Project…",
          accelerator: "CmdOrCtrl+O",
          click: () => mainWindow?.webContents.send(CH.menu, { type: "pick-project" }),
        },
        {
          label: "Open Recent",
          enabled: recents.length > 0,
          submenu: recents.map((p) => ({
            label: p,
            click: () => mainWindow?.webContents.send(CH.menu, { type: "open-project", path: p }),
          })),
        },
        { type: "separator" },
        { role: "quit", label: "Exit" },
      ],
    },
    {
      label: "&View",
      submenu: [
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
        ...(app.isPackaged
          ? []
          : ([
              { type: "separator" },
              { role: "reload" },
              { role: "toggleDevTools" },
            ] as MenuItemConstructorOptions[])),
      ],
    },
    {
      label: "&Help",
      submenu: [
        // buildMenu() re-runs on every openProject (the recents submenu), so
        // this item has to stay cheap and stateless. It is.
        {
          label: "Manual",
          accelerator: "F1",
          click: () => mainWindow?.webContents.send(CH.menu, { type: "manual" }),
        },
        { type: "separator" },
        {
          label: "Check for Updates…",
          enabled: isUpdaterEnabled(),
          click: () => checkForUpdatesNow("manual"),
        },
        { type: "separator" },
        {
          label: "Kanmer on GitHub",
          click: () => void shell.openExternal("https://github.com/collisionengineers/kanmer"),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ---------------------------------------------------------------------------
// Toasts for agent changes: the watcher fires for our own writes too, so IPC
// write handlers leave a marker and matching events within 2s stay silent.
// ---------------------------------------------------------------------------
function markOwnWrite(projectId: string, key: string): void {
  contexts.get(projectId)?.ownWrites.set(key, Date.now());
}

/** Toast key for a changed file: item id, "board", or null (uninteresting). */
function toastKey(file: string): string | null {
  return classifyKanmerPath(file)?.key ?? null;
}

let pendingToasts: { projectId: string; key: string; event: string }[] = [];
let toastTimer: NodeJS.Timeout | null = null;

function queueToast(projectId: string, key: string, event: string): void {
  pendingToasts.push({ projectId, key, event });
  if (toastTimer) return;
  toastTimer = setTimeout(() => void flushToasts(), 1800);
}

async function flushToasts(): Promise<void> {
  const batch = pendingToasts;
  pendingToasts = [];
  toastTimer = null;
  if (batch.length === 0 || !Notification.isSupported()) return;
  const distinct = [...new Set(batch.map((b) => b.key))];
  let notification: Notification;
  let reveal: { projectId: string; id: string } | null = null;
  if (batch.length > 3) {
    notification = new Notification({
      title: "Kanmer board updated",
      body: `${batch.length} changes across ${distinct.length} item(s)`,
    });
  } else {
    const { projectId, key, event } = batch[batch.length - 1];
    const store = contexts.get(projectId)?.store;
    if (key === "board") {
      notification = new Notification({ title: "Board configuration changed", body: "" });
    } else {
      reveal = { projectId, id: key };
      let title = `${key} ${event === "add" ? "created" : event === "unlink" ? "deleted" : "updated"}`;
      let body = "";
      try {
        const item = await store?.getItem(key);
        if (item) {
          const stage = stageName(item.status);
          title = `${key} — ${stage}`;
          body = item.title;
        }
      } catch {
        // toast falls back to the generic wording
      }
      notification = new Notification({ title, body });
    }
  }
  notification.on("click", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    if (reveal) mainWindow.webContents.send(CH.reveal, reveal);
  });
  notification.show();
}

/**
 * Start the board watcher for a project.
 *
 * Extracted so a migration can stop and restart it — see `CH.migrate`. It has
 * to be one function, or the restarted watcher drifts from the original and
 * live sync quietly behaves differently after a migration than before one.
 */
function startWatch(
  projectId: string,
  boardRoot: string,
  ownWrites: Map<string, number>,
): WatchHandle {
  return watchKanmer(boardRoot, (event, file) => {
    mainWindow?.webContents.send(CH.changed, { projectId, event, file });
    const key = toastKey(file);
    if (!key) return;
    const own = ownWrites.get(key);
    if (own && Date.now() - own < 2000) return;
    // Someone else changed this project's board (agent, hand edit): the renderer
    // shows it in the activity bell / in-app toasts, scoped to that tab.
    mainWindow?.webContents.send(CH.agentChange, { projectId, key, event });
    if (!readSettings().notifications) return;
    if (mainWindow?.isFocused()) return;
    queueToast(projectId, key, event);
  });
}

/** Open a project (or focus it if already open), building a per-project context. */
async function openProject(root: string): Promise<OpenProjectResult> {
  return withSyncLifecycles([appLifecycle], () => openProjectLocked(root));
}

async function openProjectLocked(root: string): Promise<OpenProjectResult> {
  const sourceStore = new KanmerStore(root);
  const projectId = sourceStore.paths.projectRoot; // canonical id (D2): dedups the same folder
  const existing = contexts.get(projectId);
  if (existing) return snapshotOf(existing);

  const savedSettings = readSettings();
  const initialSyncStatus = await ensureBoardWorktree(projectId, savedSettings.kanmerBranch);
  const savedHandoff = savedSettings.pendingBoardHandoffs?.[projectId];
  let syncStatus = initialSyncStatus.handoffPending || !savedHandoff
    ? initialSyncStatus
    : {
        ...initialSyncStatus,
        handoffPending: savedHandoff,
        error: initialSyncStatus.error ?? savedHandoff.warning,
      };
  if (initialSyncStatus.handoffPending) await setKanmerGitHandoff(projectId, initialSyncStatus.handoffPending);
  const boardRoot = syncStatus.boardRoot ?? projectId;
  if (syncStatus.available && syncStatus.boardRoot) {
    const nativeReconnectRequired = await observeKanmerBoardBranch(projectId, syncStatus.branch);
    if (nativeReconnectRequired) syncStatus.nativeReconnectRequired = nativeReconnectRequired;
    const probeContext = {
      sourceRoot: projectId,
      boardRoot: syncStatus.boardRoot,
      syncStatus,
    } as ProjectContext;
    await reconcileProjectProviders(probeContext);
    syncStatus = probeContext.syncStatus;
  }
  // repoRoot is the source checkout: `refs` point at the repo's own /docs/,
  // which does not move into the board worktree. Passed explicitly because we
  // know both roots here — core would otherwise have to infer it.
  const store = new KanmerStore(boardRoot, { repoRoot: projectId });

  await store.init();
  await recordRecentProject(projectId);
  const ownWrites = new Map<string, number>();
  // Watch where the store actually reads. On a git project `ensureBoardWorktree`
  // moves the board to `.worktrees/kanmer` and `git rm`s + gitignores the source
  // `.kanmer/` — watching `projectId` there is watching a directory that no longer
  // exists, so no agent write ever reaches the renderer. Without git, `boardRoot`
  // falls back to `projectId` and this is the old behaviour.
  const watch = startWatch(projectId, boardRoot, ownWrites);
  const ctx: ProjectContext = { sourceRoot: projectId, boardRoot, store, watch, ownWrites, syncStatus, lifecycle: Promise.resolve() };
  const minutes = readSettings().gitSyncMinutes;
  armSyncTimer(projectId, ctx, minutes);
  contexts.set(projectId, ctx);
  buildMenu(); // refresh the Open Recent submenu
  return snapshotOf(ctx);
}

async function autoStartRegisteredProjects(): Promise<void> {
  if (remoteAccess) {
    const registrations = await remoteAccess.autoStartRegistrations();
    const results = await remoteAccess.autoStart(registrations);
    for (const result of results) if (!result.ok) console.error(`[remote-access] auto-start failed for ${result.projectId}: ${result.error ?? "REMOTE_AUTOSTART_FAILED"}`);
  }
  if (openAITunnel) {
    const registrations = await openAITunnel.autoStartRegistrations();
    const results = await openAITunnel.autoStart(registrations, (projectId) => {
      const context = contexts.get(projectId);
      if (context) return openAITunnelRoots(context);
      const registration = registrations.find((candidate) => candidate.projectId === projectId);
      if (!registration) throw new Error("OPENAI_PROJECT_NOT_REGISTERED");
      return { boardRoot: registration.identity.boardRoot, repoRoot: registration.identity.repoRoot };
    });
    for (const result of results) if (!result.ok) console.error(`[openai-tunnel] auto-start failed for ${result.projectId}: ${result.error ?? "OPENAI_AUTOSTART_FAILED"}`);
  }
}

async function snapshotOf(ctx: ProjectContext): Promise<OpenProjectResult> {
  return {
    projectId: ctx.sourceRoot,
    root: ctx.sourceRoot,
    boardRoot: ctx.boardRoot,
    board: await ctx.store.getBoard(),
    items: await ctx.store.listItems({ includeArchived: true }),
    format: await ctx.store.detectFormat(),
  };
}

/** Stop owned project processes, close the watcher, and drop the context. */
async function closeProject(projectId: string): Promise<void> {
  const ctx = contexts.get(projectId);
  if (!ctx) return;
  await withSyncLifecycles([appLifecycle, ctx], async () => {
    if (contexts.get(projectId) !== ctx) return;
    if (openAITunnel) await openAITunnel.closeProject(projectId, await openAITunnelIdentity(ctx));
    await ctx.watch.close();
    clearSyncTimer(ctx);
    contexts.delete(projectId);
  });
}

/**
 * Apply a changed Git board branch to projects already open, then persist the
 * preference. Sync interval changes are persisted even when a protected branch
 * handoff refuses the branch migration.
 *
 * Persisting alone was not enough for either field, and both gaps were silent.
 *
 * A new branch name has to be carried onto each open worktree (FRD-020 R5).
 * Storing it and doing nothing else left every open board on its old branch
 * while the app reported the new one, and the next sync pushed to a branch that
 * had none of the board's history behind it.
 *
 * A changed interval has to re-arm the timers, because they are only ever
 * created in `openProject` — so switching automatic sync on did nothing at all
 * until the project was closed and reopened.
 */
async function applyGitPreferences(kanmerBranch: string, gitSyncMinutes: number): Promise<AppSettings> {
  const projectContexts = [...contexts.values()];
  return withSyncLifecycles([appLifecycle, ...projectContexts], () => applyGitPreferencesLocked(kanmerBranch, gitSyncMinutes));
}

async function applyGitPreferencesLocked(kanmerBranch: string, gitSyncMinutes: number): Promise<AppSettings> {
  // A queued timer callback or a manual Retry waits on these same locks. Once
  // acquired, clear every interval before changing HEAD or remote refs.
  for (const ctx of contexts.values()) clearSyncTimer(ctx);
  try {
    return await applyGitPreferencesBody(kanmerBranch, gitSyncMinutes);
  } finally {
    const effective = readSettings();
    for (const [projectId, ctx] of contexts) armSyncTimer(projectId, ctx, effective.gitSyncMinutes);
  }
}

async function applyGitPreferencesBody(kanmerBranch: string, gitSyncMinutes: number): Promise<AppSettings> {
  const current = readSettings();
  const requestedBranch = kanmerBranch.trim() || PROTECTED_BOARD_BRANCH;
  const renameFailures: string[] = [];
  const handoffReconnects: Array<{ projectId: string; branch: string }> = [];
  // An administrator can retarget and rename an open board worktree while the
  // GUI remains running. Refresh every cached branch before deciding whether
  // the protected-default refusal still applies.
  await Promise.all([...contexts.entries()].map(async ([projectId, ctx]) => {
    const previousBranch = ctx.syncStatus.branch;
    if (!ctx.syncStatus.available && ctx.syncStatus.boardRoot) {
      ctx.syncStatus = { ...ctx.syncStatus, branch: retryBoardBranch(ctx.syncStatus.branch, requestedBranch) };
    } else {
      ctx.syncStatus = await refreshBoardBranchForPreference(ctx.syncStatus, requestedBranch);
    }
    if (!ctx.syncStatus.branchMismatch && previousBranch !== requestedBranch && ctx.syncStatus.branch === requestedBranch) {
      handoffReconnects.push({ projectId, branch: requestedBranch });
    }
  }));
  const hasOpenBoard = [...contexts.values()].some((ctx) => ctx.syncStatus.available && Boolean(ctx.syncStatus.boardRoot));
  const blockedBranchRefresh = [...contexts.values()].some((ctx) => ctx.syncStatus.branchMismatch === true);
  const hasProtectedOpenBoard = [...contexts.values()].some((ctx) =>
    ctx.syncStatus.available && ctx.syncStatus.boardRoot && ctx.syncStatus.branch === PROTECTED_BOARD_BRANCH);
  const protectedOpenBoard = shouldAttemptProtectedBranchRename(
    current.kanmerBranch,
    requestedBranch,
    hasProtectedOpenBoard,
    blockedBranchRefresh,
  );

  // The protected-default refusal is deliberately handled before any context
  // is renamed. A global setting must not leave some open boards migrated and
  // others on the protected branch when the operator handoff is still needed.
  const guardedBranch = guardGitBranchPreference(current.kanmerBranch, requestedBranch, hasOpenBoard);
  const targetBranch = protectedOpenBoard || blockedBranchRefresh ? current.kanmerBranch : guardedBranch;
  if (protectedOpenBoard) {
    for (const [projectId, ctx] of contexts) {
      if (!ctx.syncStatus.available || !ctx.syncStatus.boardRoot || ctx.syncStatus.branch !== PROTECTED_BOARD_BRANCH) continue;
      const refused = await renameBoardBranch(ctx.syncStatus.boardRoot, requestedBranch);
      ctx.syncStatus = { ...ctx.syncStatus, error: refused.error, paused: true };
      mainWindow?.webContents.send(CH.gitStatus, { projectId, ...(await gitStatusForRenderer(ctx)) });
    }
  } else {
    for (const [projectId, ctx] of contexts) {
      const { boardRoot, branch } = ctx.syncStatus;
      if (ctx.syncStatus.available && boardRoot && shouldAttemptOrdinaryBranchRename(
        blockedBranchRefresh,
        branch,
        targetBranch,
      )) {
        const renamed = await renameBoardBranch(boardRoot, targetBranch);
        // A failed rename leaves the worktree on its old branch, so keep
        // reporting that one — the board still works, it just did not move.
        ctx.syncStatus = renamed.ok
          ? {
              ...ctx.syncStatus,
              branch: targetBranch,
              error: renamed.error,
              paused: false,
              ...(renamed.error && renamed.from
                ? { handoffPending: { from: renamed.from, to: targetBranch, warning: renamed.error } }
                : {}),
            }
          : { ...ctx.syncStatus, error: renamed.error, paused: true };
        if (!renamed.ok) renameFailures.push(`${projectId}: ${renamed.error ?? "branch rename failed"}`);
        if (renamed.ok) {
          handoffReconnects.push({ projectId, branch: targetBranch });
          const nativeSettings = await markNativeReconnectRequired(projectId, targetBranch);
          ctx.syncStatus = {
            ...ctx.syncStatus,
            nativeReconnectRequired: nativeSettings.pendingNativeReconnects?.[projectId],
          };
        }
        // A previously surfaced handoff warning is durable until the operator
        // explicitly acknowledges it through confirmKanmerGitHandoff. A
        // later preference rename must not silently erase that acknowledgement
        // requirement merely because the rename itself is clean (or failed).
        if (renamed.ok && renamed.error && renamed.from) {
          await setKanmerGitHandoff(projectId, {
            from: renamed.from,
            to: targetBranch,
            warning: renamed.error,
          });
        }
        mainWindow?.webContents.send(CH.gitStatus, { projectId, ...(await gitStatusForRenderer(ctx)) });
      }
    }
  }
  const persistedBranch = renameFailures.length === 0 ? targetBranch : current.kanmerBranch;
  const settings = await setKanmerGitPreferences(persistedBranch, gitSyncMinutes);
  if (requestedBranch !== current.kanmerBranch && !protectedOpenBoard && !blockedBranchRefresh && renameFailures.length === 0) {
    for (const [projectId, ctx] of contexts) {
      if (!ctx.syncStatus.available || !ctx.syncStatus.boardRoot || ctx.syncStatus.branch !== settings.kanmerBranch) continue;
      await reconcileProjectProviders(ctx, REGISTRATION_PROVIDERS, settings.kanmerBranch);
      mainWindow?.webContents.send(CH.gitStatus, { projectId, ...(await gitStatusForRenderer(ctx)) });
    }
  }
  for (const { projectId, branch } of handoffReconnects) {
    const ctx = contexts.get(projectId);
    if (!ctx) continue;
    const nativeSettings = await markNativeReconnectRequired(projectId, branch);
    ctx.syncStatus = { ...ctx.syncStatus, nativeReconnectRequired: nativeSettings.pendingNativeReconnects?.[projectId] };
  }
  return settings;
}

/**
 * Add board-worktree health to the existing sync status without changing any
 * Git state. This is deliberately recomputed, rather than cached, after
 * status requests and every Git operation that may have changed HEAD.
 */
async function gitStatusForRenderer(ctx: ProjectContext): Promise<KanmerGitIpcStatus> {
  const base = ctx.syncStatus;
  // A non-Git project has no board worktree. A failed Git setup that did find
  // one still retains boardRoot and is inspectable, so do not use `available`
  // as the deciding condition here.
  if (!base.boardRoot) return { ...base, boardWorktree: null };

  const [{ source }, items, inspection] = await Promise.all([
    ctx.store.getBoardWithSource(),
    ctx.store.listItems({ includeArchived: true }),
    inspectBoardWorktree(base.boardRoot, base.branch),
  ]);
  const ticketCount = items.filter((item) => item.type === "ticket" && !item.archived).length;
  const boardWorktree: BoardWorktreeHealth = {
    ...inspection,
    boardSource: source,
    ticketCount,
    repair: boardWorktreeRepair(inspection, source, ticketCount),
  };
  return { ...base, boardWorktree };
}

function boardWorktreeRepair(
  inspection: Awaited<ReturnType<typeof inspectBoardWorktree>>,
  boardSource: "file" | "default",
  ticketCount: number,
): string {
  if (!inspection.actualBranch) {
    return `Board worktree inspection is unavailable or detached at ${inspection.path}; expected branch ${inspection.expectedBranch}. Repair it in Git settings or project setup.`;
  }
  if (!inspection.onBoardBranch) {
    return `Board worktree at ${inspection.path} is on ${inspection.actualBranch}; expected ${inspection.expectedBranch}. Repair it in Git settings or project setup.`;
  }
  if (boardSource === "default" && ticketCount > 0) {
    return `Board configuration is synthesized while ${ticketCount} active ticket${ticketCount === 1 ? "" : "s"} exist. Restore or repair the board configuration before relying on its defaults.`;
  }
  return "No repair required.";
}

async function syncProject(projectId: string, automatic = false): Promise<KanmerGitIpcStatus> {
  const ctx = requireCtx(projectId);
  return withSyncLifecycles([ctx], async () => syncProjectLocked(projectId, ctx, automatic));
}

async function syncProjectLocked(projectId: string, ctx: ProjectContext, automatic: boolean): Promise<KanmerGitIpcStatus> {
  const retryRequested = !automatic;
  // A closed-project protected-branch refusal retains the board root so the
  // operator can complete the handoff outside Kanmer. Retry reconciliation
  // before treating that state as a non-Git project or attempting any sync.
  if (!ctx.syncStatus.available && ctx.syncStatus.boardRoot) {
    const branch = retryBoardBranch(ctx.syncStatus.branch, readSettings().kanmerBranch);
    const retried = await ensureBoardWorktree(ctx.sourceRoot, branch);
    ctx.syncStatus = bindRetryBoardStatus(ctx.boardRoot, ctx.syncStatus, retried);
    if (ctx.syncStatus.available) armSyncTimer(projectId, ctx, readSettings().gitSyncMinutes);
  }
  if (ctx.syncStatus.available && ctx.syncStatus.boardRoot) {
    ctx.syncStatus = await preflightBoardSync(ctx.syncStatus);
  }
  if ((automatic && !shouldRunAutomaticSync(ctx.syncStatus)) || (!automatic && ctx.syncStatus.branchMismatch === true)) {
    clearSyncTimer(ctx);
    const blocked = await gitStatusForRenderer(ctx);
    mainWindow?.webContents.send(CH.gitStatus, { projectId, ...blocked });
    return blocked;
  }
  ctx.syncStatus = await syncBoard(ctx.syncStatus);
  const pendingProviders = ctx.syncStatus.providerReconciliationPending;
  if (pendingProviders && shouldRunAutomaticSync(ctx.syncStatus)) {
    await reconcileProjectProviders(ctx, pendingProviders.providers, pendingProviders.branch);
  }
  if (retryRequested && shouldRunAutomaticSync(ctx.syncStatus)) {
    armSyncTimer(projectId, ctx, readSettings().gitSyncMinutes);
  }
  if (!shouldRunAutomaticSync(ctx.syncStatus)) clearSyncTimer(ctx);
  const status = await gitStatusForRenderer(ctx);
  mainWindow?.webContents.send(CH.gitStatus, { projectId, ...status });
  return status;
}

async function confirmKanmerGitHandoff(projectId: string): Promise<KanmerGitIpcStatus> {
  const ctx = requireCtx(projectId);
  return withSyncLifecycles([ctx], async () => {
    if (ctx.syncStatus.handoffPending) {
      const warning = ctx.syncStatus.handoffPending.warning;
      const { handoffPending: _pending, ...withoutHandoff } = ctx.syncStatus;
      ctx.syncStatus = { ...withoutHandoff, error: ctx.syncStatus.error === warning ? null : ctx.syncStatus.error };
      await setKanmerGitHandoff(projectId, null);
    }
    const status = await gitStatusForRenderer(ctx);
    mainWindow?.webContents.send(CH.gitStatus, { projectId, ...status });
    return status;
  });
}

async function connectProject(projectId: string, target: ConnectTarget) {
  const ctx = requireCtx(projectId);
  return withSyncLifecycles([appLifecycle, ctx], async () => {
    const result = await (connectAgentOverride ?? connectAgent)(target, ctx.sourceRoot, ctx.boardRoot, {}, readSettings().kanmerBranch);
    if (result.ok && (target === "grok" || target === "antigravity")) {
      const settings = await clearNativeReconnectRequired(projectId, target);
      for (const [id, project] of contexts) {
        const pending = settings.pendingNativeReconnects?.[id];
        if (pending) project.syncStatus = { ...project.syncStatus, nativeReconnectRequired: pending };
        else {
          const { nativeReconnectRequired: _native, ...withoutNative } = project.syncStatus;
          project.syncStatus = withoutNative;
        }
        // Renderer contexts filter these events by projectId, so keep the
        // loop's id rather than the initiating Connect project's id.
        mainWindow?.webContents.send(CH.gitStatus, { projectId: id, ...(await gitStatusForRenderer(project)) });
      }
    }
    return result;
  });
}

/** Test-only window injection for production-caller broadcast assertions. */
const setMainWindowForTest = (window: BrowserWindow | null): void => {
  mainWindow = window;
};
const setConnectAgentForTest = (agent: typeof connectAgent | null): void => {
  connectAgentOverride = agent;
};

/** Test seam for the production sync caller; not part of the renderer API. */
export const __kanmerTest = { contexts, openProject, closeProject, syncProject, applyGitPreferences, confirmKanmerGitHandoff, connectProject, setMainWindowForTest, setConnectAgentForTest };

// The card context menu is drawn by the renderer now (FRD-019 R6). A native
// Menu cannot read the app's CSS variables, so it was always slightly wrong in
// one theme; the replacement lives in renderer/src/components/ContextMenu.tsx.

function registerIpc(): void {
  ipcMain.handle(CH.pickProject, async () => {
    const res = await dialog.showOpenDialog({
      title: "Open a Kanmer project folder",
      properties: ["openDirectory", "createDirectory"],
    });
    return res.canceled || res.filePaths.length === 0 ? null : res.filePaths[0];
  });

  ipcMain.handle(CH.openProject, (_e, root: string) => openProject(root));
  ipcMain.handle(CH.closeProject, (_e, projectId: string) => closeProject(projectId));
  ipcMain.handle(CH.currentProject, () => [...contexts.keys()][0] ?? null);
  ipcMain.handle(CH.remoteRegister, async (e, projectId: string) => {
    assertTrustedRemoteSender(e); assertRemoteProjectId(projectId);
    const ctx = requireCtx(projectId);
    return requireRemoteAccess().register(projectId, await remoteIdentity(ctx));
  });
  ipcMain.handle(CH.remoteView, async (e, projectId: string) => {
    assertTrustedRemoteSender(e); assertRemoteProjectId(projectId);
    const ctx = requireCtx(projectId);
    return requireRemoteAccess().viewFor(projectId, await remoteIdentity(ctx));
  });
  ipcMain.handle(CH.remoteOverview, async (e) => { assertTrustedRemoteSender(e); return requireRemoteAccess().overview(); });
  ipcMain.handle(CH.remoteReconcile, async (e, projectId: string, expectedConfigGeneration?: string | null) => {
    assertTrustedRemoteSender(e); assertRemoteProjectId(projectId); if (expectedConfigGeneration !== undefined && expectedConfigGeneration !== null && typeof expectedConfigGeneration !== "string") throw new Error("REMOTE_CONFIG_VERSION_INVALID");
    const ctx = requireCtx(projectId);
    return requireRemoteAccess().reconcile(projectId, await remoteIdentity(ctx), expectedConfigGeneration ?? null);
  });
  ipcMain.handle(CH.remoteRemove, async (e, projectId: string, expectedConfigGeneration?: string | null) => {
    assertTrustedRemoteSender(e); assertRemoteProjectId(projectId); if (expectedConfigGeneration !== undefined && expectedConfigGeneration !== null && typeof expectedConfigGeneration !== "string") throw new Error("REMOTE_CONFIG_VERSION_INVALID");
    const ctx = requireCtx(projectId);
    await requireRemoteAccess().remove(projectId, await remoteIdentity(ctx), expectedConfigGeneration ?? null);
  });
  ipcMain.handle(CH.remoteSaveConfig, async (e, projectId: string, config: RemoteConfigInput) => {
    assertTrustedRemoteSender(e); assertRemoteProjectId(projectId); assertRemoteConfig(config);
    const ctx = requireCtx(projectId);
    return requireRemoteAccess().saveConfig(projectId, await remoteIdentity(ctx), config);
  });
  ipcMain.handle(CH.remoteCreateSecret, async (e, projectId: string, rotate?: boolean, expectedConfigGeneration?: string | null) => {
    assertTrustedRemoteSender(e); assertRemoteProjectId(projectId); if (rotate !== undefined && typeof rotate !== "boolean") throw new Error("REMOTE_ROTATE_INVALID"); if (expectedConfigGeneration !== undefined && expectedConfigGeneration !== null && typeof expectedConfigGeneration !== "string") throw new Error("REMOTE_CONFIG_VERSION_INVALID");
    const ctx = requireCtx(projectId);
    return requireRemoteAccess().createSecret(projectId, await remoteIdentity(ctx), rotate === true, remoteOwner(e), expectedConfigGeneration ?? null);
  });
  ipcMain.handle(CH.remoteConsumeSecret, (e, projectId: string, deliveryId: string) => { assertTrustedRemoteSender(e); assertRemoteProjectId(projectId); if (typeof deliveryId !== "string") throw new Error("REMOTE_DELIVERY_INVALID"); return requireRemoteAccess().consumeSecretDelivery(projectId, deliveryId, remoteOwner(e)); });
  ipcMain.handle(CH.remoteCopySecret, (e, projectId: string, deliveryId: string) => { assertTrustedRemoteSender(e); assertRemoteProjectId(projectId); if (typeof deliveryId !== "string") throw new Error("REMOTE_DELIVERY_INVALID"); return requireRemoteAccess().copySecretDelivery(projectId, deliveryId, remoteOwner(e)); });
  ipcMain.handle(CH.remoteStart, async (e, projectId: string, expectedConfigGeneration?: string | null) => {
    assertTrustedRemoteSender(e); assertRemoteProjectId(projectId); if (expectedConfigGeneration !== undefined && expectedConfigGeneration !== null && typeof expectedConfigGeneration !== "string") throw new Error("REMOTE_CONFIG_VERSION_INVALID");
    const ctx = requireCtx(projectId);
    const identity = await remoteIdentity(ctx);
    return requireRemoteAccess().start(projectId, identity, { root: ctx.boardRoot, repoRoot: ctx.sourceRoot }, expectedConfigGeneration ?? null);
  });
  ipcMain.handle(CH.remoteStop, async (e, projectId: string, expectedRuntimeGeneration?: string | null) => {
    assertTrustedRemoteSender(e); assertRemoteProjectId(projectId); if (expectedRuntimeGeneration !== undefined && expectedRuntimeGeneration !== null && typeof expectedRuntimeGeneration !== "string") throw new Error("REMOTE_RUNTIME_VERSION_INVALID");
    const ctx = requireCtx(projectId);
    return requireRemoteAccess().stop(projectId, await remoteIdentity(ctx), expectedRuntimeGeneration ?? null);
  });
  ipcMain.handle(CH.remoteDoctor, async (e, projectId: string, expected?: { configGeneration?: string | null; runtimeGeneration?: string | null }) => {
    assertTrustedRemoteSender(e); assertRemoteProjectId(projectId); if (expected !== undefined && (!expected || typeof expected !== "object" || (expected.configGeneration !== undefined && expected.configGeneration !== null && typeof expected.configGeneration !== "string") || (expected.runtimeGeneration !== undefined && expected.runtimeGeneration !== null && typeof expected.runtimeGeneration !== "string"))) throw new Error("REMOTE_VERSION_INVALID");
    const ctx = requireCtx(projectId);
    return requireRemoteAccess().doctor(projectId, await remoteIdentity(ctx), { root: ctx.boardRoot, repoRoot: ctx.sourceRoot }, expected?.configGeneration ?? null, expected?.runtimeGeneration ?? null);
  });
  ipcMain.handle(CH.openAITunnelRegister, async (e, projectId: string) => {
    assertTrustedRemoteSender(e); assertRemoteProjectId(projectId);
    const ctx = requireCtx(projectId);
    return requireOpenAITunnel().register(projectId, await openAITunnelIdentity(ctx));
  });
  ipcMain.handle(CH.openAITunnelView, async (e, projectId: string) => {
    assertTrustedRemoteSender(e); assertRemoteProjectId(projectId);
    const ctx = requireCtx(projectId);
    return requireOpenAITunnel().viewFor(projectId, await openAITunnelIdentity(ctx));
  });
  ipcMain.handle(CH.openAITunnelOverview, async (e) => { assertTrustedRemoteSender(e); return requireOpenAITunnel().overview(); });
  ipcMain.handle(CH.openAITunnelSaveProfile, async (e, projectId: string, config: OpenAITunnelConfigInput) => {
    assertTrustedRemoteSender(e); assertRemoteProjectId(projectId); assertOpenAITunnelConfig(config);
    const ctx = requireCtx(projectId);
    return requireOpenAITunnel().saveProfile(projectId, await openAITunnelIdentity(ctx), config);
  });
  ipcMain.handle(CH.openAITunnelInitialize, async (e, projectId: string) => {
    assertTrustedRemoteSender(e); assertRemoteProjectId(projectId);
    const ctx = requireCtx(projectId);
    return requireOpenAITunnel().initialize(projectId, await openAITunnelIdentity(ctx), openAITunnelRoots(ctx));
  });
  ipcMain.handle(CH.openAITunnelDoctor, async (e, projectId: string) => {
    assertTrustedRemoteSender(e); assertRemoteProjectId(projectId);
    const ctx = requireCtx(projectId);
    return requireOpenAITunnel().doctor(projectId, await openAITunnelIdentity(ctx), openAITunnelRoots(ctx));
  });
  ipcMain.handle(CH.openAITunnelStart, async (e, projectId: string, expectedGeneration?: string | null) => {
    assertTrustedRemoteSender(e); assertRemoteProjectId(projectId); if (expectedGeneration !== undefined && expectedGeneration !== null && typeof expectedGeneration !== "string") throw new Error("OPENAI_PROFILE_VERSION_INVALID");
    const ctx = requireCtx(projectId);
    return requireOpenAITunnel().start(projectId, await openAITunnelIdentity(ctx), openAITunnelRoots(ctx), expectedGeneration ?? null);
  });
  ipcMain.handle(CH.openAITunnelStop, async (e, projectId: string, expectedGeneration?: string | null) => {
    assertTrustedRemoteSender(e); assertRemoteProjectId(projectId); if (expectedGeneration !== undefined && expectedGeneration !== null && typeof expectedGeneration !== "string") throw new Error("OPENAI_PROFILE_VERSION_INVALID");
    const ctx = requireCtx(projectId);
    return requireOpenAITunnel().stop(projectId, await openAITunnelIdentity(ctx), expectedGeneration ?? null);
  });
  ipcMain.handle(CH.openAITunnelRestart, async (e, projectId: string, expectedGeneration?: string | null) => {
    assertTrustedRemoteSender(e); assertRemoteProjectId(projectId); if (expectedGeneration !== undefined && expectedGeneration !== null && typeof expectedGeneration !== "string") throw new Error("OPENAI_PROFILE_VERSION_INVALID");
    const ctx = requireCtx(projectId);
    return requireOpenAITunnel().restart(projectId, await openAITunnelIdentity(ctx), openAITunnelRoots(ctx), expectedGeneration ?? null);
  });
  ipcMain.handle(CH.openAITunnelReconcile, async (e, projectId: string, expectedGeneration?: string | null) => {
    assertTrustedRemoteSender(e); assertRemoteProjectId(projectId); if (expectedGeneration !== undefined && expectedGeneration !== null && typeof expectedGeneration !== "string") throw new Error("OPENAI_PROFILE_VERSION_INVALID");
    const ctx = requireCtx(projectId);
    return requireOpenAITunnel().reconcile(projectId, await openAITunnelIdentity(ctx), expectedGeneration ?? null);
  });
  ipcMain.handle(CH.openAITunnelRemove, async (e, projectId: string, expectedGeneration?: string | null) => {
    assertTrustedRemoteSender(e); assertRemoteProjectId(projectId); if (expectedGeneration !== undefined && expectedGeneration !== null && typeof expectedGeneration !== "string") throw new Error("OPENAI_PROFILE_VERSION_INVALID");
    const ctx = requireCtx(projectId);
    await requireOpenAITunnel().remove(projectId, await openAITunnelIdentity(ctx), expectedGeneration ?? null);
  });
  ipcMain.handle(CH.getBoard, (_e, p: string) => requireStore(p).getBoard());
  ipcMain.handle(CH.setBoard, async (_e, p: string, board: BoardConfig) => {
    markOwnWrite(p, "board");
    await requireStore(p).setBoard(board);
    return requireStore(p).getBoard();
  });
  ipcMain.handle(CH.listItems, (_e, p: string, filter?: ItemFilter) =>
    requireStore(p).listItems(filter),
  );
  ipcMain.handle(CH.listItemsWithWarnings, (_e, p: string, filter?: ItemFilter) =>
    requireStore(p).listItemsWithWarnings(filter),
  );
  ipcMain.handle(CH.getItem, (_e, p: string, id: string) => requireStore(p).getItem(id));
  ipcMain.handle(CH.createItem, async (_e, p: string, input: CreateItemInput) => {
    const item = await requireStore(p).createItem(input);
    markOwnWrite(p, item.id);
    return item;
  });
  ipcMain.handle(CH.updateItem, (_e, p: string, id: string, patch: UpdateItemPatch) => {
    markOwnWrite(p, id);
    return requireStore(p).updateItem(id, patch);
  });
  ipcMain.handle(
    CH.moveItem,
    (_e, p: string, id: string, to: { status: string; position?: MovePosition }) => {
      markOwnWrite(p, id);
      // `position` goes straight through: core's assertMoveAllowed runs every
      // rejection (conflict, unknown stage, gates) before computeOrder
      // materialises any sibling's order, so a refused drop writes nothing.
      return requireStore(p).moveItem(id, to);
    },
  );
  ipcMain.handle(CH.deleteItem, (_e, p: string, id: string) => {
    markOwnWrite(p, id);
    return requireStore(p).deleteItem(id);
  });
  ipcMain.handle(CH.takeTicket, (_e, p: string, id: string, input: TakeTicketInput) => {
    markOwnWrite(p, id);
    return requireStore(p).takeTicket(id, input);
  });
  ipcMain.handle(CH.releaseTicket, (_e, p: string, id: string) => {
    markOwnWrite(p, id);
    return requireStore(p).releaseTicket(id);
  });
  ipcMain.handle(CH.addColumn, (_e, p: string, kind: ColumnKind, column: BoardColumn) => {
    markOwnWrite(p, "board");
    return requireStore(p).addColumn(kind, column);
  });
  ipcMain.handle(
    CH.linkItems,
    (_e, p: string, source: string, target: string, action: "add" | "remove") => {
      markOwnWrite(p, source);
      return linkItems(requireStore(p), source, target, action);
    },
  );
  ipcMain.handle(CH.getLinks, (_e, p: string, id: string) => getLinkGraph(requireStore(p), id));
  ipcMain.handle(CH.getSettings, () => readSettings());
  ipcMain.handle(CH.setTheme, async (_e, theme: Theme) => {
    const settings = await setTheme(theme);
    applyNativeTheme(settings.theme);
    return settings;
  });
  ipcMain.handle(CH.setNotifications, (_e, on: boolean) => setNotifications(on));
  ipcMain.handle(CH.setPreferences, (_e, patch: Partial<UiPreferences>) => setPreferences(patch));
  ipcMain.handle(CH.setDispatchSettings, (_e, settings) => setDispatchSettings(settings));
  ipcMain.handle(CH.setKanmerGitPreferences, (_e, prefs: { kanmerBranch: string; gitSyncMinutes: number }) =>
    applyGitPreferences(prefs.kanmerBranch, prefs.gitSyncMinutes),
  );
  ipcMain.handle(CH.getKanmerGitStatus, (_e, p: string) => gitStatusForRenderer(requireCtx(p)));
  ipcMain.handle(CH.syncKanmerNow, (_e, p: string) => syncProject(p));
  ipcMain.handle(CH.confirmKanmerGitHandoff, (_e, p: string) => confirmKanmerGitHandoff(p));
  ipcMain.handle(CH.setOpenTabs, (_e, openTabs: string[], activeTab: string) =>
    setOpenTabs(openTabs, activeTab),
  );
  ipcMain.handle(CH.connectAgent, (_e, p: string, target: ConnectTarget) => connectProject(p, target));
  ipcMain.handle(CH.disconnectAgent, (_e, p: string, target: ConnectTarget) => {
    const ctx = requireCtx(p);
    return withSyncLifecycles([appLifecycle, ctx], async () => {
      const result = await disconnectAgent(target, ctx.sourceRoot);
      if (result.ok && (target === "grok" || target === "antigravity")) {
        const settings = await clearNativeReconnectRequired(p, target);
        for (const [projectId, project] of contexts) {
          const pending = settings.pendingNativeReconnects?.[projectId];
          if (pending) project.syncStatus = { ...project.syncStatus, nativeReconnectRequired: pending };
          else {
            const { nativeReconnectRequired: _native, ...withoutNative } = project.syncStatus;
            project.syncStatus = withoutNative;
          }
          mainWindow?.webContents.send(CH.gitStatus, { projectId, ...(await gitStatusForRenderer(project)) });
        }
      }
      return result;
    });
  });
  ipcMain.handle(CH.listProviders, () => listProviders());
  // Staleness walks artefacts in the source checkout, so it is deliberately a
  // cold read instead of part of snapshotOf() or watcher-driven board refresh.
  ipcMain.handle(CH.getRepoStaleness, async (_e, p: string) => {
    const ctx = requireCtx(p);
    return repoStalenessFor(ctx.store, bundledSkillsRoot());
  });
  // Machine-scoped, so no `requireCtx`: these entries belong to *other*
  // projects, which is exactly why reconnecting this one never drained them.
  ipcMain.handle(CH.scanLegacyCodexRegistrations, () => scanLegacyCodexRegistrations());
  ipcMain.handle(CH.drainLegacyCodexRegistrations, (_e, names: string[]) =>
    drainLegacyCodexRegistrations(Array.isArray(names) ? names.filter((n) => typeof n === "string") : []),
  );
  ipcMain.handle(CH.getSkillsStatus, (_e, p: string, target: ConnectTarget) =>
    skillsStatus(target, requireCtx(p).sourceRoot),
  );
  ipcMain.handle(CH.updateSkills, (_e, p: string, target: ConnectTarget) =>
    updateSkills(target, requireCtx(p).sourceRoot, readSettings().kanmerBranch),
  );
  ipcMain.handle(
    CH.dispatchAgent,
    (_e, p: string, ticketId: string, target: ConnectTarget, taskId?: string) =>
      dispatchTicket(requireStore(p), target, p, ticketId, { taskId }, requireCtx(p).sourceRoot),
  );
  ipcMain.handle(CH.dispatchOptions, async (_e, p: string, ticketId: string) => {
    const store = requireStore(p);
    const item = await store.getItem(ticketId);
    const info = await store.getTicketDocsInfo(ticketId);
    const ctx = { stage: item?.status ?? "backlog", docCounts: info?.counts ?? {} };
    // Feasibility is core's call, not the renderer's — see DispatchOption.
    return DISPATCH_TASKS.map((t) => {
      const f = taskFeasibility(t.id, ctx);
      return {
        id: t.id,
        label: t.label,
        deliverable: t.deliverable,
        enabled: f.ok,
        ...(f.reason ? { reason: f.reason } : {}),
        ...(f.warning ? { warning: f.warning } : {}),
      };
    });
  });
  ipcMain.handle(CH.dispatchTasks, () => DISPATCH_TASKS.map((task) => ({
    id: task.id, label: task.label, deliverable: task.deliverable, prompt: task.prompt("TICK-001"),
  })));
  ipcMain.handle(CH.dispatchPromptPreview, (_e, taskId: string, suffix?: string) => {
    const task = DISPATCH_TASKS.find((candidate) => candidate.id === taskId);
    if (!task) throw new Error(`Unknown dispatch task "${taskId}".`);
    return composeDispatchPrompt(task.prompt("TICK-001"), suffix ?? "");
  });
  ipcMain.handle(CH.cancelDispatch, (_e, dispatchId: string) => cancelDispatch(dispatchId));
  ipcMain.handle(CH.listDispatches, (_e, p: string) => listDispatches(p));
  onDispatchStatus((s) => mainWindow?.webContents.send(CH.dispatchStatus, s));
  /**
   * Migrate the board, with this process's own contention removed first.
   *
   * A migration rewrites every ticket file. Left running, the watcher turns each
   * of those writes into a `changed` event, the renderer answers it with
   * `getItem` and the toast builder with another — two reads of the files being
   * written, in the process doing the writing. Meanwhile the git sync timer can
   * fire `git add -- .kanmer`, which opens every ticket to hash it.
   *
   * On Windows any of those handles turns the next `rename` into `EPERM`. Core
   * now retries, but the fix that matters is not generating the contention.
   *
   * Both are restored in a `finally`: a migration that fails must not also
   * leave live sync dead for the rest of the session.
   */
  ipcMain.handle(CH.migrate, async (_e, p: string, dryRun: boolean) => {
    const ctx = requireCtx(p);
    // A dry run writes nothing, so there is nothing to protect it from.
    if (dryRun) return migrateBoard(ctx.store, { dryRun });

    await ctx.watch.close();
    clearSyncTimer(ctx);
    try {
      return await migrateBoard(ctx.store, { dryRun });
    } finally {
      ctx.watch = startWatch(p, ctx.boardRoot, ctx.ownWrites);
      const minutes = readSettings().gitSyncMinutes;
      armSyncTimer(p, ctx, minutes);
    }
  });
  ipcMain.handle(CH.backfillBoard, async (_e, p: string, dryRun: boolean) => {
    if (!dryRun) markOwnWrite(p, "board");
    const { backfill } = await migrateBoard(requireStore(p), { dryRun });
    return { addedStages: backfill.addedStages };
  });
  ipcMain.handle(CH.getFormat, (_e, p: string) => requireStore(p).detectFormat());
  ipcMain.handle(CH.getDoc, (_e, p: string, id: string, doc: TicketDoc) =>
    requireStore(p).getDocWithVersion(id, doc),
  );
  ipcMain.handle(
    CH.setDoc,
    (
      _e,
      p: string,
      id: string,
      doc: TicketDoc,
      content: string,
      opts?: { append?: boolean; expectedVersion?: string | null },
    ) => {
      markOwnWrite(p, id);
      return requireStore(p).setDoc(id, doc, content, opts);
    },
  );
  ipcMain.handle(CH.getDocsInfo, (_e, p: string, id: string) =>
    requireStore(p).getTicketDocsInfo(id),
  );
  // The doc-type vocabulary is fixed in format 3 (containment defines type),
  // so this no longer varies by area — the shape is kept so the renderer's
  // callers are unchanged.
  ipcMain.handle(CH.getDocTypes, async () => DOC_TYPES.map((id) => ({ id, name: id })));
  ipcMain.handle(CH.getDocModel, async (_e, p: string) => {
    const board = await requireStore(p).getBoard();
    return {
      repoDocs: repoDocsMap(board),
      docTypes: DOC_TYPES,
      gateExemptFolders: GATE_EXEMPT_DIRS,
      boundaries: BOUNDARIES,
      profiles: resolveProfiles(board),
      defaultProfile: board.defaultProfile ?? "fix",
      proofTypes: resolveProofTypes(board),
    };
  });
  ipcMain.handle(CH.openRepoDoc, async (_e, p: string, rel: string) => {
    // assertSafeRepoPath rejects a path escaping the project root before shell touches it.
    await shell.openPath(assertSafeRepoPath(requireCtx(p).sourceRoot, rel));
  });
  ipcMain.handle(CH.getRepoDoc, async (_e, p: string, rel: string) => {
    try {
      return await readFile(assertSafeRepoPath(requireCtx(p).sourceRoot, rel), "utf8");
    } catch {
      return null;
    }
  });
  ipcMain.handle(CH.pickRepoDoc, async (_e, p: string) => {
    const root = requireCtx(p).sourceRoot;
    const res = await dialog.showOpenDialog({
      title: "Pick a governing document",
      defaultPath: join(root, "docs"),
      properties: ["openFile"],
    });
    if (res.canceled || res.filePaths.length === 0) return null;
    const abs = res.filePaths[0];
    if (abs !== root && !abs.startsWith(root + sep)) return null;
    return relative(root, abs).split(sep).join("/");
  });
  // The whole report, for the editor readiness panel. getGateStatus stays as
  // the drag lock-tint's cheaper per-stage view of the same underlying answer.
  ipcMain.handle(CH.listGroups, (_e, p: string, opts?: { kind?: string; includeArchived?: boolean }) =>
    requireStore(p).listGroups(opts ?? {}),
  );
  ipcMain.handle(CH.getGroup, (_e, p: string, id: string) => requireStore(p).getGroup(id));
  ipcMain.handle(CH.createGroup, (_e, p: string, kind: string, title: string, body?: string) =>
    requireStore(p).createGroup(kind, title, body ?? ""),
  );
  ipcMain.handle(
    CH.updateGroup,
    (_e, p: string, id: string, patch: { title?: string; body?: string; archived?: boolean }) =>
      requireStore(p).updateGroup(id, patch),
  );
  ipcMain.handle(CH.getGroupDoc, (_e, p: string, id: string, rel: string) =>
    requireStore(p).getGroupDoc(id, rel),
  );
  ipcMain.handle(CH.setGroupDoc, (_e, p: string, id: string, rel: string, content: string) =>
    requireStore(p).setGroupDoc(id, rel, content),
  );
  ipcMain.handle(CH.getGates, (_e, p: string, id: string) => requireStore(p).getDocGates(id));
  ipcMain.handle(CH.getGateStatus, async (_e, p: string, id: string) => {
    const store = requireStore(p);
    const [item] = await Promise.all([
      store.getItem(id),
      store.getBoard(),
      store.getTicketDocsInfo(id),
    ]);
    const out: Record<string, string[]> = {};
    if (!item) return out;
    const report = await store.getDocGates(id);
    if (!report) return out;
    // blockedBy is already "per stage, why not" — exactly what the drag
    // lock-tint needs, computed once by core.
    for (const stage of STAGE_IDS) {
      if (stage === item.status) {
        out[stage] = [];
        continue;
      }
      out[stage] = report.blockedBy[stage] ?? [];
    }
    return out;
  });
  ipcMain.handle(CH.pickReferences, async () => {
    const res = await dialog.showOpenDialog({
      title: "Add reference files",
      properties: ["openFile", "multiSelections"],
    });
    return res.canceled ? [] : res.filePaths;
  });
  // Core owns the copy and the containment check. Every other path rule in this
  // system lives there, and a second copy here is how one of them drifts.
  ipcMain.handle(CH.addReference, (_e, p: string, id: string, src: string) => {
    markOwnWrite(p, id);
    return requireStore(p).addReference(id, src);
  });
  ipcMain.handle(CH.openReference, async (_e, p: string, id: string, name: string) => {
    // Resolve through core's own listing rather than joining a path here: the
    // name arrives from the renderer, and core is what decides where it lives.
    const info = await requireStore(p).getTicketDocsInfo(id);
    const ref = info?.references.find((r) => r.name === name);
    if (!ref) throw new Error(`No reference "${name}" on ${id}`);
    await shell.openPath(ref.path);
  });
  ipcMain.handle(CH.removeReference, (_e, p: string, id: string, name: string) => {
    markOwnWrite(p, id);
    return requireStore(p).removeReference(id, name);
  });
  ipcMain.handle(
    CH.getActivity,
    (_e, p: string, opts?: { id?: string; since?: string; limit?: number }) =>
      requireStore(p).getActivity(opts),
  );

  ipcMain.handle(CH.getUpdateState, () => updateState());
  ipcMain.handle(CH.mcpSessions, () => mcpSessions());
  ipcMain.handle(CH.installUpdate, async () => {
    // Defensive: the renderer owns the guards (quitAndInstall cannot be undone
    // once called, so a guard placed after it never runs), but nothing else may
    // ever spawn an installer either.
    if (updateState().status.phase !== "downloaded") {
      throw new Error("No downloaded update to install");
    }
    // Returns the refusal reason when the install could not safely be started
    // (GUI-064) — null means the app is on its way down.
    return await installUpdateNow();
  });
}

app.whenReady().then(async () => {
  // Must equal electron-builder's appId: it's stamped on the Start-Menu
  // shortcut and is what makes Windows toasts + taskbar grouping work.
  app.setAppUserModelId("com.kanmer.app");
  remoteAccess = new RemoteAccessManager(app.getPath("userData"), undefined, undefined, undefined, () => readSettings().kanmerBranch);
  remoteAccess.subscribe((status) => mainWindow?.webContents.send(CH.remoteStatus, status));
  openAITunnel = new OpenAITunnelManager(
    app.getPath("userData"),
    undefined,
    (roots) => serverInvocation("claude", roots.boardRoot, roots.repoRoot, readSettings().kanmerBranch),
  );
  openAITunnel.subscribe((status) => mainWindow?.webContents.send(CH.openAITunnelStatus, status));
  registerIpc();
  buildMenu();
  // Auto-open a project on launch: explicit env override, else the most
  // recently opened project. Falls through to the welcome screen on failure.
  const autoOpen = process.env["KANMER_OPEN"] ?? readSettings().recentProjects[0];
  if (autoOpen) {
    try {
      await openProject(autoOpen);
    } catch {
      // fall through to the picker
    }
  }
  createWindow();
  void autoStartRegisteredProjects().catch((error) => console.error(`[remote-access] persisted auto-start unavailable: ${error instanceof Error ? error.message : String(error)}`));
  // After createWindow, and wrapped: a failing updater must never be the reason
  // the app does not start.
  try {
    initUpdater((payload) => {
      if (payload.status.phase === "downloaded") void openAITunnel?.markRestartRequired();
      mainWindow?.webContents.send(CH.updateStatus, payload);
    });
  } catch (err) {
    console.error("[updater] init failed:", err);
  }
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// The quit guard runs on before-quit because that is the only event that can
// still be cancelled. The watcher close moved to will-quit deliberately:
// preventDefault() does NOT stop other listeners on the SAME event, so leaving
// watch.close() on before-quit would tear the watcher down even when the user
// cancels the quit — the app would keep running with live-reload silently dead.
// will-quit fires only when before-quit was not prevented, and `quit` (where
// electron-updater's autoInstallOnAppQuit installs) fires after it.
app.on("before-quit", (e) => {
  maybeBlockQuitForUpdate(e);
  if (e.defaultPrevented || (!remoteAccess && !openAITunnel) || remoteQuitInProgress) return;
  remoteQuitInProgress = true;
  e.preventDefault();
  void Promise.all([remoteAccess?.closeAll(), openAITunnel?.closeAll()]).then(
    () => { remoteQuitInProgress = false; app.quit(); },
    (error) => { console.error(`[remote-access] quit cleanup failed: ${error instanceof Error ? error.message : String(error)}`); remoteQuitInProgress = false; app.quit(); },
  );
});

app.on("will-quit", () => {
  for (const ctx of contexts.values()) void ctx.watch.close();
  killAllDispatches(); // tree-kill background agents so none is orphaned
});
