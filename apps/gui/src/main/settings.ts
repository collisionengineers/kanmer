import { app } from "electron";
import { join } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";

export type Theme = "dark" | "light";

export interface AppSettings {
  theme: Theme;
  recentProjects: string[];
}

const DEFAULTS: AppSettings = { theme: "dark", recentProjects: [] };
const MAX_RECENT = 8;

function file(): string {
  return join(app.getPath("userData"), "settings.json");
}

export function readSettings(): AppSettings {
  try {
    const parsed = JSON.parse(readFileSync(file(), "utf8")) as Partial<AppSettings>;
    return {
      theme: parsed.theme === "light" ? "light" : "dark",
      recentProjects: Array.isArray(parsed.recentProjects) ? parsed.recentProjects : [],
    };
  } catch {
    return { ...DEFAULTS };
  }
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
