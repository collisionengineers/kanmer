import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  Menu,
  nativeTheme,
  Notification,
  screen,
  shell,
  type MenuItemConstructorOptions,
} from "electron";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { classifyKanmerPath } from "../shared/kanmerPath.js";
import {
  KanmerStore,
  assertSafeRepoPath,
  getLinkGraph,
  linkItems,
  migrateBoard,
  migrateToV2,
  repoDocsMap,
  resolveDocTypes,
  resolveGates,
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
  type ItemMenuAction,
  type ItemMenuPayload,
  type OpenProjectResult,
} from "../shared/ipc.js";
import {
  readSettings,
  recordRecentProject,
  setNotifications,
  setOpenTabs,
  setTheme,
  setWindowBounds,
  type Theme,
  type WindowBounds,
} from "./settings.js";
import { connectAgent, disconnectAgent, type ConnectTarget } from "./connect.js";
import { dispatchableProviders, listProviders } from "./providers.js";
import {
  cancelDispatch,
  dispatchTicket,
  killAllDispatches,
  listDispatches,
  onDispatchStatus,
} from "./dispatch.js";

let mainWindow: BrowserWindow | null = null;

/** One open project. projectId is its canonical root (D2). */
interface ProjectContext {
  root: string;
  store: KanmerStore;
  watch: WatchHandle;
  /** Recent writes this GUI made, so its own file changes don't self-toast. */
  ownWrites: Map<string, number>;
}
const contexts = new Map<string, ProjectContext>();

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

/** The theme actually in effect ("system" resolved against the OS). */
function resolvedDark(): boolean {
  const theme = readSettings().theme;
  return theme === "system" ? nativeTheme.shouldUseDarkColors : theme === "dark";
}

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
  const saved = restorableBounds();
  mainWindow = new BrowserWindow({
    width: saved?.width ?? 1280,
    height: saved?.height ?? 820,
    ...(saved?.x !== undefined && saved?.y !== undefined ? { x: saved.x, y: saved.y } : {}),
    minWidth: 900,
    minHeight: 600,
    // Resolve the theme BEFORE the window exists so light-theme users don't
    // get a dark flash every launch (and vice versa).
    backgroundColor: resolvedDark() ? "#0f1115" : "#f6f7f9",
    show: false,
    title: "Kanmer",
    ...(iconPath() ? { icon: iconPath()! } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
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
    setWindowBounds({ ...mainWindow.getNormalBounds(), maximized: mainWindow.isMaximized() });
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
    const isDev = devUrl && url.startsWith(devUrl);
    if (isDev || url.startsWith("file:")) return; // in-app loads stay
    e.preventDefault();
    if (/^https?:/i.test(url)) void shell.openExternal(url);
  });

  // Smoke mode: verify the app boots and renders, then exit cleanly. Exit 0 is
  // the only success, so every way of *not* rendering has to exit non-zero —
  // otherwise the check cannot fail and is worse than no check.
  if (process.env["KANMER_SMOKE"]) {
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
        clearTimeout(watchdog);
        if (!readyToShow) {
          console.error("KANMER_SMOKE: renderer loaded but the window never reached ready-to-show");
          app.exit(1);
        }
        app.exit(0);
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
          const stage =
            (await store?.getBoard())?.statuses.find((s) => s.id === item.status)?.name ??
            item.status;
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

/** Open a project (or focus it if already open), building a per-project context. */
async function openProject(root: string): Promise<OpenProjectResult> {
  const store = new KanmerStore(root);
  const projectId = store.paths.projectRoot; // canonical id (D2): dedups the same folder
  const existing = contexts.get(projectId);
  if (existing) return snapshotOf(existing);

  await store.init();
  recordRecentProject(projectId);
  const ownWrites = new Map<string, number>();
  const watch = watchKanmer(projectId, (event, file) => {
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
  const ctx: ProjectContext = { root: projectId, store, watch, ownWrites };
  contexts.set(projectId, ctx);
  buildMenu(); // refresh the Open Recent submenu
  return snapshotOf(ctx);
}

async function snapshotOf(ctx: ProjectContext): Promise<OpenProjectResult> {
  return {
    projectId: ctx.root,
    root: ctx.root,
    board: await ctx.store.getBoard(),
    items: await ctx.store.listItems({ includeArchived: true }),
    format: await ctx.store.detectFormat(),
  };
}

/** Close a project's watcher and drop its context. */
async function closeProject(projectId: string): Promise<void> {
  const ctx = contexts.get(projectId);
  if (!ctx) return;
  await ctx.watch.close();
  contexts.delete(projectId);
}

/** Native right-click menu for a card; resolves with what the user picked. */
function showItemMenu(
  sender: Electron.WebContents,
  payload: ItemMenuPayload,
): Promise<ItemMenuAction | null> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (action: ItemMenuAction | null) => {
      if (!settled) {
        settled = true;
        resolve(action);
      }
    };
    const template: MenuItemConstructorOptions[] = [
      { label: "Open", click: () => done({ type: "open" }) },
      {
        label: "Move to",
        submenu: payload.statuses.map((s) => ({
          label: s.name,
          enabled: s.id !== payload.currentStatus,
          click: () => done({ type: "move", status: s.id }),
        })),
      },
      ...(payload.taken
        ? [{ label: "Release ticket", click: () => done({ type: "release" }) }]
        : []),
      {
        label: "Dispatch to agent",
        enabled: !payload.taken,
        submenu: dispatchableProviders().map((p) => ({
          label: p.label,
          click: () => done({ type: "dispatch", target: p.id }),
        })),
      },
      { type: "separator" as const },
      {
        label: "Copy ID",
        click: () => {
          clipboard.writeText(payload.id);
          done(null);
        },
      },
      {
        label: "Copy [[wiki-link]]",
        click: () => {
          clipboard.writeText(`[[${payload.id}]]`);
          done(null);
        },
      },
      { type: "separator" as const },
      payload.archived
        ? { label: "Unarchive", click: () => done({ type: "unarchive" }) }
        : { label: "Archive", click: () => done({ type: "archive" }) },
      ...(payload.archived
        ? [{ label: "Delete permanently", click: () => done({ type: "delete" }) }]
        : []),
    ];
    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window: BrowserWindow.fromWebContents(sender) ?? undefined });
    // If the menu closes without a pick, resolve null (after click had its chance).
    menu.on("menu-will-close", () => setTimeout(() => done(null), 120));
  });
}

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
  ipcMain.handle(CH.setTheme, (_e, theme: Theme) => setTheme(theme));
  ipcMain.handle(CH.setNotifications, (_e, on: boolean) => setNotifications(on));
  ipcMain.handle(CH.setOpenTabs, (_e, openTabs: string[], activeTab: string) =>
    setOpenTabs(openTabs, activeTab),
  );
  ipcMain.handle(CH.connectAgent, (_e, p: string, target: ConnectTarget) =>
    connectAgent(target, requireStore(p).paths.projectRoot),
  );
  ipcMain.handle(CH.disconnectAgent, (_e, p: string, target: ConnectTarget) =>
    disconnectAgent(target, requireStore(p).paths.projectRoot),
  );
  ipcMain.handle(CH.listProviders, () => listProviders());
  ipcMain.handle(CH.dispatchAgent, (_e, p: string, ticketId: string, target: ConnectTarget) =>
    dispatchTicket(requireStore(p), target, p, ticketId),
  );
  ipcMain.handle(CH.cancelDispatch, (_e, dispatchId: string) => cancelDispatch(dispatchId));
  ipcMain.handle(CH.listDispatches, (_e, p: string) => listDispatches(p));
  onDispatchStatus((s) => mainWindow?.webContents.send(CH.dispatchStatus, s));
  ipcMain.handle(CH.showItemMenu, (e, payload: ItemMenuPayload) =>
    showItemMenu(e.sender, payload),
  );
  ipcMain.handle(CH.migrate, (_e, p: string, dryRun: boolean) =>
    migrateToV2(requireStore(p), { dryRun }),
  );
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
  ipcMain.handle(CH.getDocTypes, async (_e, p: string, id: string) => {
    const store = requireStore(p);
    const [item, board] = await Promise.all([store.getItem(id), store.getBoard()]);
    return resolveDocTypes(board, item?.area ?? "");
  });
  ipcMain.handle(CH.getDocModel, async (_e, p: string) => {
    const board = await requireStore(p).getBoard();
    return {
      repoDocs: repoDocsMap(board),
      defaultTypes: resolveDocTypes(board, ""),
      defaultGates: resolveGates(board, ""),
    };
  });
  ipcMain.handle(CH.openRepoDoc, async (_e, p: string, rel: string) => {
    // assertSafeRepoPath rejects a path escaping the project root before shell touches it.
    await shell.openPath(assertSafeRepoPath(requireStore(p).paths.projectRoot, rel));
  });
  ipcMain.handle(CH.getRepoDoc, async (_e, p: string, rel: string) => {
    try {
      return await readFile(assertSafeRepoPath(requireStore(p).paths.projectRoot, rel), "utf8");
    } catch {
      return null;
    }
  });
  ipcMain.handle(
    CH.getActivity,
    (_e, p: string, opts?: { id?: string; since?: string; limit?: number }) =>
      requireStore(p).getActivity(opts),
  );
}

app.whenReady().then(async () => {
  // Must equal electron-builder's appId: it's stamped on the Start-Menu
  // shortcut and is what makes Windows toasts + taskbar grouping work.
  app.setAppUserModelId("com.kanmer.app");
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
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  for (const ctx of contexts.values()) void ctx.watch.close();
  killAllDispatches(); // tree-kill background agents so none is orphaned
});
