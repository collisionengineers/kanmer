import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { join } from "node:path";
import {
  KanmerStore,
  getLinkGraph,
  linkItems,
  watchKanmer,
  type BoardColumn,
  type BoardConfig,
  type ColumnKind,
  type CreateItemInput,
  type ItemFilter,
  type UpdateItemPatch,
  type WatchHandle,
} from "@kanmer/core";
import { CH, type OpenProjectResult } from "../shared/ipc.js";
import { readSettings, recordRecentProject, setTheme, type Theme } from "./settings.js";
import { connectAgent, type ConnectTarget } from "./connect.js";

let mainWindow: BrowserWindow | null = null;
let store: KanmerStore | null = null;
let watch: WatchHandle | null = null;

function requireStore(): KanmerStore {
  if (!store) throw new Error("No project open");
  return store;
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0f1115",
    title: "Kanmer",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
    },
  });

  // electron-vite provides the dev server URL; fall back to the built file.
  const devUrl = process.env["ELECTRON_RENDERER_URL"];
  if (devUrl) {
    void mainWindow.loadURL(devUrl);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  // Smoke mode: verify the app boots and renders, then exit cleanly.
  if (process.env["KANMER_SMOKE"]) {
    mainWindow.webContents.once("did-finish-load", () => {
      setTimeout(() => app.exit(0), 1500);
    });
  }
}

/** Point the app at a project folder: (re)build store + watcher, return snapshot. */
async function openProject(root: string): Promise<OpenProjectResult> {
  if (watch) {
    await watch.close();
    watch = null;
  }
  store = new KanmerStore(root);
  await store.init();
  recordRecentProject(store.paths.projectRoot);

  watch = watchKanmer(root, (event, file) => {
    mainWindow?.webContents.send(CH.changed, { event, file });
  });

  return {
    root: store.paths.projectRoot,
    board: await store.getBoard(),
    items: await store.listItems({ includeArchived: true }),
  };
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
  ipcMain.handle(CH.currentProject, () => store?.paths.projectRoot ?? null);
  ipcMain.handle(CH.getBoard, () => requireStore().getBoard());
  ipcMain.handle(CH.setBoard, async (_e, board: BoardConfig) => {
    await requireStore().setBoard(board);
    return requireStore().getBoard();
  });
  ipcMain.handle(CH.listItems, (_e, filter?: ItemFilter) => requireStore().listItems(filter));
  ipcMain.handle(CH.getItem, (_e, id: string) => requireStore().getItem(id));
  ipcMain.handle(CH.createItem, (_e, input: CreateItemInput) => requireStore().createItem(input));
  ipcMain.handle(CH.updateItem, (_e, id: string, patch: UpdateItemPatch) =>
    requireStore().updateItem(id, patch),
  );
  ipcMain.handle(CH.moveItem, (_e, id: string, to: { status: string }) =>
    requireStore().moveItem(id, to),
  );
  ipcMain.handle(CH.deleteItem, (_e, id: string) => requireStore().deleteItem(id));
  ipcMain.handle(CH.addColumn, (_e, kind: ColumnKind, column: BoardColumn) =>
    requireStore().addColumn(kind, column),
  );
  ipcMain.handle(CH.linkItems, (_e, source: string, target: string, action: "add" | "remove") =>
    linkItems(requireStore(), source, target, action),
  );
  ipcMain.handle(CH.getLinks, (_e, id: string) => getLinkGraph(requireStore(), id));
  ipcMain.handle(CH.getSettings, () => readSettings());
  ipcMain.handle(CH.setTheme, (_e, theme: Theme) => setTheme(theme));
  ipcMain.handle(CH.connectAgent, (_e, target: ConnectTarget) =>
    connectAgent(target, requireStore().paths.projectRoot),
  );
}

app.whenReady().then(async () => {
  registerIpc();
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
  void watch?.close();
});
