import { app } from "electron";
import { join } from "node:path";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";

export type Theme = "dark" | "light" | "system";
export type CardDensity = "comfortable" | "compact";

/** App-global UI preferences (Phase 4.4). Mirror of shared/ipc.ts UiPreferences. */
export interface UiPreferences {
  cardDensity: CardDensity;
  confirmOnDelete: boolean;
  defaultPriority: string;
  defaultArea: string;
}

export interface WindowBounds {
  x?: number;
  y?: number;
  width: number;
  height: number;
  maximized: boolean;
}

export interface AppSettings extends UiPreferences {
  theme: Theme;
  recentProjects: string[];
  /** Native toasts for agent-made board changes (default on). */
  notifications: boolean;
  windowBounds?: WindowBounds;
  /** The open-tab session (project roots) restored on next boot. */
  openTabs: string[];
  /** The active tab's project root. */
  activeTab: string;
  sessionInitialized: boolean;
  kanmerBranch: string;
  gitSyncMinutes: number;
  /** GUI remote-access registry; owned by the remote-access store but preserved by settings writes. */
  remoteAccess?: Record<string, unknown>;
}

const DEFAULTS: AppSettings = {
  theme: "dark",
  recentProjects: [],
  notifications: true,
  openTabs: [],
  activeTab: "",
  sessionInitialized: false,
  cardDensity: "comfortable",
  confirmOnDelete: true,
  defaultPriority: "",
  defaultArea: "",
  kanmerBranch: "kanmer-board",
  gitSyncMinutes: 0,
};
const MAX_RECENT = 8;
let settingsQueue: Promise<void> = Promise.resolve();

function file(): string {
  return join(app.getPath("userData"), "settings.json");
}

export function readSettings(): AppSettings {
  try {
    const parsed = JSON.parse(readFileSync(file(), "utf8")) as Partial<AppSettings>;
    const bounds = parsed.windowBounds;
    return {
      theme:
        parsed.theme === "light" || parsed.theme === "system" ? parsed.theme : "dark",
      recentProjects: Array.isArray(parsed.recentProjects) ? parsed.recentProjects : [],
      notifications: parsed.notifications !== false,
      openTabs: Array.isArray(parsed.openTabs) ? parsed.openTabs : [],
      activeTab: typeof parsed.activeTab === "string" ? parsed.activeTab : "",
      sessionInitialized: parsed.sessionInitialized === true,
      cardDensity: parsed.cardDensity === "compact" ? "compact" : "comfortable",
      confirmOnDelete: parsed.confirmOnDelete !== false,
      defaultPriority: typeof parsed.defaultPriority === "string" ? parsed.defaultPriority : "",
      defaultArea: typeof parsed.defaultArea === "string" ? parsed.defaultArea : "",
      kanmerBranch: typeof parsed.kanmerBranch === "string" && parsed.kanmerBranch.trim() ? parsed.kanmerBranch.trim() : "kanmer-board",
      gitSyncMinutes: Number.isInteger(parsed.gitSyncMinutes) && (parsed.gitSyncMinutes ?? 0) > 0 ? parsed.gitSyncMinutes! : 0,
      ...(parsed.remoteAccess && typeof parsed.remoteAccess === "object" ? { remoteAccess: parsed.remoteAccess as Record<string, unknown> } : {}),
      ...(bounds && typeof bounds.width === "number" && typeof bounds.height === "number"
        ? { windowBounds: bounds }
        : {}),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

/** Persist Git board preferences. Invalid intervals deliberately mean sync off. */
export function setKanmerGitPreferences(kanmerBranch: string, gitSyncMinutes: number): Promise<AppSettings> {
  return withSettingsFileLock(async () => {
    const settings = readSettings();
    settings.kanmerBranch = kanmerBranch.trim() || "kanmer-board";
    settings.gitSyncMinutes = Number.isInteger(gitSyncMinutes) && gitSyncMinutes > 0 ? gitSyncMinutes : 0;
    writeSettings(settings);
    return settings;
  });
}

/** Persist the open-tab session (capped at MAX_RECENT). */
export function setOpenTabs(openTabs: string[], activeTab: string): Promise<AppSettings> {
  return withSettingsFileLock(async () => {
    const settings = readSettings();
    settings.openTabs = openTabs.slice(0, MAX_RECENT);
    settings.activeTab = activeTab;
    settings.sessionInitialized = true;
    writeSettings(settings);
    return settings;
  });
}

function writeSettings(settings: AppSettings): void {
  const target = file();
  mkdirSync(join(app.getPath("userData")), { recursive: true });
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  renameSync(temporary, target);
}

/** Serialize every settings.json read-modify-write, including remote access. */
export function withSettingsFileLock<T>(work: () => Promise<T>): Promise<T> {
  const previous = settingsQueue;
  const run = previous.catch(() => undefined).then(work);
  settingsQueue = run.then(() => undefined, () => undefined);
  return run;
}

export function setTheme(theme: Theme): Promise<AppSettings> {
  return withSettingsFileLock(async () => {
    const settings = readSettings();
    settings.theme = theme;
    writeSettings(settings);
    return settings;
  });
}

export function setNotifications(on: boolean): Promise<AppSettings> {
  return withSettingsFileLock(async () => {
    const settings = readSettings();
    settings.notifications = on;
    writeSettings(settings);
    return settings;
  });
}

/** Merge a partial UI-preferences patch (Phase 4.4). */
export function setPreferences(patch: Partial<UiPreferences>): Promise<AppSettings> {
  return withSettingsFileLock(async () => {
    const settings = readSettings();
    if (patch.cardDensity === "compact" || patch.cardDensity === "comfortable") settings.cardDensity = patch.cardDensity;
    if (typeof patch.confirmOnDelete === "boolean") settings.confirmOnDelete = patch.confirmOnDelete;
    if (typeof patch.defaultPriority === "string") settings.defaultPriority = patch.defaultPriority;
    if (typeof patch.defaultArea === "string") settings.defaultArea = patch.defaultArea;
    writeSettings(settings);
    return settings;
  });
}

export function setWindowBounds(bounds: WindowBounds): Promise<AppSettings> {
  return withSettingsFileLock(async () => {
    const settings = readSettings();
    settings.windowBounds = bounds;
    writeSettings(settings);
    return settings;
  });
}

/** Record a project as most-recently-opened (dedup, capped). */
export function recordRecentProject(root: string): Promise<AppSettings> {
  return withSettingsFileLock(async () => {
    const settings = readSettings();
    settings.recentProjects = [root, ...settings.recentProjects.filter((p) => p !== root)].slice(0, MAX_RECENT);
    writeSettings(settings);
    return settings;
  });
}
