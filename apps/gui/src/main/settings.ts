import { app } from "electron";
import { join } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";

export type Theme = "dark" | "light" | "system";

export interface WindowBounds {
  x?: number;
  y?: number;
  width: number;
  height: number;
  maximized: boolean;
}

export interface AppSettings {
  theme: Theme;
  recentProjects: string[];
  /** Native toasts for agent-made board changes (default on). */
  notifications: boolean;
  windowBounds?: WindowBounds;
  /** The open-tab session (project roots) restored on next boot. */
  openTabs: string[];
  /** The active tab's project root. */
  activeTab: string;
}

const DEFAULTS: AppSettings = {
  theme: "dark",
  recentProjects: [],
  notifications: true,
  openTabs: [],
  activeTab: "",
};
const MAX_RECENT = 8;

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
      ...(bounds && typeof bounds.width === "number" && typeof bounds.height === "number"
        ? { windowBounds: bounds }
        : {}),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

/** Persist the open-tab session (capped at MAX_RECENT). */
export function setOpenTabs(openTabs: string[], activeTab: string): AppSettings {
  const settings = readSettings();
  settings.openTabs = openTabs.slice(0, MAX_RECENT);
  settings.activeTab = activeTab;
  writeSettings(settings);
  return settings;
}

function writeSettings(settings: AppSettings): void {
  writeFileSync(file(), `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}

export function setTheme(theme: Theme): AppSettings {
  const settings = readSettings();
  settings.theme = theme;
  writeSettings(settings);
  return settings;
}

export function setNotifications(on: boolean): AppSettings {
  const settings = readSettings();
  settings.notifications = on;
  writeSettings(settings);
  return settings;
}

export function setWindowBounds(bounds: WindowBounds): AppSettings {
  const settings = readSettings();
  settings.windowBounds = bounds;
  writeSettings(settings);
  return settings;
}

/** Record a project as most-recently-opened (dedup, capped). */
export function recordRecentProject(root: string): AppSettings {
  const settings = readSettings();
  settings.recentProjects = [root, ...settings.recentProjects.filter((p) => p !== root)].slice(
    0,
    MAX_RECENT,
  );
  writeSettings(settings);
  return settings;
}
