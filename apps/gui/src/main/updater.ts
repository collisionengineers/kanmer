import { app, dialog } from "electron";
import { autoUpdater } from "electron-updater";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { mcpSessionsSync } from "./mcp-sessions.js";
import type { UpdatePhase, UpdateStatusEvent } from "../shared/ipc.js";

/**
 * The auto-updater: schedule, event fan-out, and the quit guard.
 *
 * `electron-updater` is imported statically and is the app's one externalized
 * production dependency (see electron.vite.config.ts). That is deliberate: if
 * it is ever missing from the packaged asar, main fails to load and the boot
 * smoke exits non-zero by construction, rather than the updater silently doing
 * nothing forever.
 */

/** Not t=0: a check at launch competes with openProject for the first paint. */
const FIRST_CHECK_DELAY_MS = 30_000;
/** Kanmer windows stay open for days, so a re-check on an interval is the norm. */
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * AGENTS.md §7 says the MCP server must never write to stdout — that rule is
 * about the SERVER process, whose stdout IS the MCP transport. This file runs in
 * the Electron main process, whose stdout is not a transport; and when the same
 * binary runs as the MCP server (ELECTRON_RUN_AS_NODE=1) the entry point is
 * kanmer-mcp.cjs and main/index.ts is never loaded, so this code cannot execute
 * there at all. We still use stderr, for consistency with the KANMER_SMOKE
 * messages and because no logging dependency is worth adding for four lines.
 */
const log = {
  info: (m: unknown) => console.error("[updater]", m),
  warn: (m: unknown) => console.error("[updater] warn:", m),
  error: (m: unknown) => console.error("[updater] error:", m),
  debug: (m: unknown) => console.error("[updater] debug:", m),
};

let send: ((payload: UpdateStatusEvent) => void) | null = null;
let enabled = false;
let timer: NodeJS.Timeout | null = null;
/** Which trigger the in-flight check came from, so the renderer can be quiet about auto ones. */
let currentSource: "auto" | "manual" = "auto";
/** Last whole percent emitted, so a download is ~100 IPC messages and not thousands. */
let lastPercent = -1;
let quitPromptShown = false;

let state: UpdateStatusEvent = { status: { phase: "disabled" }, source: "auto" };

/**
 * Record and push in one step, so `updateState()` and the pushed event can
 * never disagree — a renderer that mounts late asks for the same value the
 * subscription would have given it.
 */
function emit(status: UpdatePhase, source: "auto" | "manual" = currentSource): void {
  state = { status, source };
  try {
    send?.(state);
  } catch (err) {
    log.error(`could not push update status: ${String(err)}`);
  }
}

/** Current state, for a renderer that mounted late or reloaded. */
export function updateState(): UpdateStatusEvent {
  return state;
}

/** Whether the Help ▸ Check for Updates… item should be clickable. */
export function isUpdaterEnabled(): boolean {
  return enabled;
}

/**
 * Configure flags, wire events, schedule checks. Called once from whenReady,
 * after createWindow(). Every failure path here is non-fatal: a broken updater
 * must never stop the app starting.
 */
export function initUpdater(sendFn: (payload: UpdateStatusEvent) => void): void {
  send = sendFn;
  try {
    // The boot smoke makes no network calls.
    if (process.env["KANMER_SMOKE"]) return;
    // A normal `npm run dev:gui` never hits the network either. KANMER_DEV_UPDATE=1
    // is the opt-in that makes the dev fast-loop against a local feed possible.
    if (!app.isPackaged && !process.env["KANMER_DEV_UPDATE"]) return;
    if (!app.isPackaged) autoUpdater.forceDevUpdateConfig = true; // reads apps/gui/dev-app-update.yml

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    // 6.8.9 warns on every download otherwise, and we never use the nsis-web target.
    autoUpdater.disableWebInstaller = true;
    // GitHub excludes prereleases from /releases/latest, and allowPrerelease
    // flips allowDowngrade on as a side effect. Neither is wanted.
    autoUpdater.allowPrerelease = false;
    autoUpdater.allowDowngrade = false;
    autoUpdater.logger = log;

    autoUpdater.on("checking-for-update", () => emit({ phase: "checking" }));
    autoUpdater.on("update-available", (info) => {
      lastPercent = -1;
      emit({ phase: "available", version: info.version });
    });
    autoUpdater.on("update-not-available", () =>
      emit({ phase: "none", version: app.getVersion() }),
    );
    autoUpdater.on("download-progress", (p) => {
      const percent = Math.floor(p.percent);
      if (percent === lastPercent) return; // throttle: whole percents only
      lastPercent = percent;
      const version = state.status.phase === "available" ? state.status.version : currentVersion();
      emit({ phase: "downloading", version, percent });
    });
    autoUpdater.on("update-downloaded", (e) => {
      // releaseNotes is `string | ReleaseNoteInfo[] | null` — only the string
      // form is renderable as-is.
      emit({
        phase: "downloaded",
        version: e.version,
        ...(typeof e.releaseNotes === "string" ? { releaseNotes: e.releaseNotes } : {}),
      });
    });
    autoUpdater.on("update-cancelled", () => emit({ phase: "idle" }));
    autoUpdater.on("error", (err) => emit({ phase: "error", message: err.message }));

    enabled = true;
    emit({ phase: "idle" }, "auto");
    logFeed();

    setTimeout(() => checkForUpdatesNow("auto"), FIRST_CHECK_DELAY_MS);
    timer = setInterval(() => checkForUpdatesNow("auto"), CHECK_INTERVAL_MS);
  } catch (err) {
    enabled = false;
    log.error(`init failed, auto-update is off for this run: ${String(err)}`);
  }
}

/** The installed version, as the string the renderer shows. */
function currentVersion(): string {
  return app.getVersion();
}

/**
 * Log the feed the updater will actually read, by reading the exact file it
 * reads. A packaged run then visibly proves it found app-update.yml, which is
 * the one thing that cannot be checked from source.
 */
function logFeed(): void {
  if (!app.isPackaged) {
    log.info("dev update config in use (KANMER_DEV_UPDATE) — apps/gui/dev-app-update.yml");
    return;
  }
  const feed = join(process.resourcesPath, "app-update.yml");
  if (!existsSync(feed)) {
    log.warn(`no ${feed} — this packaged app cannot auto-update`);
    return;
  }
  const summary = readFileSync(feed, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .slice(0, 4)
    .join(" | ");
  log.info(`feed ${feed}: ${summary}`);
}

/** The Help-menu item and the interval both come through here. */
export function checkForUpdatesNow(source: "auto" | "manual"): void {
  if (!enabled) return;
  if (source === "manual" && state.status.phase === "downloaded") {
    // checkForUpdates() on an already-downloaded update resolves from cache and
    // may not re-emit update-downloaded, which would make the menu item look
    // broken. Re-send what we already have instead.
    emit(state.status, "manual");
    return;
  }
  currentSource = source;
  try {
    // Empty catch ON PURPOSE: electron-updater emits `error` AND rejects for the
    // same failure. The `error` listener is the single handler; this exists only
    // to stop an unhandled rejection.
    void autoUpdater.checkForUpdates()?.catch(() => {});
  } catch (err) {
    log.error(`check failed: ${String(err)}`);
  }
}

/**
 * Install the downloaded update and restart.
 *
 * NOT CANCELLABLE. BaseUpdater.quitAndInstall spawns the installer via
 * install() BEFORE app.quit() (BaseUpdater.js:13-23), and the installer
 * force-kills every process under the install dir. Every guard — unsaved edits,
 * live agent sessions — must therefore run in the RENDERER, before the IPC call
 * that reaches this function. The only caller is the CH.installUpdate handler.
 */
export function installUpdateNow(): void {
  autoUpdater.quitAndInstall(true, true);
}

/**
 * The before-quit guard: the only thing standing between "user quits Kanmer at
 * 5pm while their agent is mid-run" and an unattended install that kills the
 * agent's MCP session.
 *
 * Returns true when the quit was intercepted. Synchronous throughout, because
 * before-quit cannot await.
 */
export function maybeBlockQuitForUpdate(e: Electron.Event): boolean {
  if (state.status.phase !== "downloaded" || quitPromptShown) return false;
  // Re-read the flag: it is what actually decides whether `quit` installs
  // (BaseUpdater's onQuit handler checks it again at quit time).
  if (!autoUpdater.autoInstallOnAppQuit) return false;

  let sessions;
  try {
    sessions = mcpSessionsSync();
  } catch (err) {
    log.error(`session probe failed: ${String(err)}`);
    return false; // fail open: never trap the user in a quit they asked for
  }
  // Nothing to warn about — let the silent install happen.
  if (sessions.count === 0 && !sessions.unknown) return false;

  const version = state.status.version;
  e.preventDefault();
  quitPromptShown = true;
  const choice = dialog.showMessageBoxSync({
    type: "warning",
    title: "Install the update?",
    message: `Kanmer ${version} will install when you quit.`,
    detail: sessions.unknown
      ? "Agent MCP sessions running from this install will be closed by the installer."
      : `This will close ${sessions.count} agent MCP session(s): ${sessions.projects.join(", ")}. ` +
        "Board data is safe — the agent's connection is what drops.",
    buttons: ["Install and quit", "Quit without installing", "Cancel"],
    defaultId: 0,
    cancelId: 2,
    noLink: true,
  });

  if (choice === 2) {
    quitPromptShown = false; // stay open; ask again on the next quit
    return true;
  }
  if (choice === 1) autoUpdater.autoInstallOnAppQuit = false; // defer to a later quit
  // Re-enter quit; quitPromptShown stops this handler prompting twice.
  app.quit();
  return true;
}

/** Stop the interval — used by tests and by an orderly shutdown. */
export function stopUpdater(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
