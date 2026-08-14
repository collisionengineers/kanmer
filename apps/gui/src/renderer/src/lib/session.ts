import type { AppSettings } from "../../../shared/ipc.js";
export function restoreTabs(settings: AppSettings, currentProject: string | null): string[] {
  if (settings.openTabs.length > 0) return settings.openTabs;
  return settings.sessionInitialized ? [] : currentProject ? [currentProject] : [];
}
export function restoredActiveTab(openTabs: string[], requested: string): string | null {
  return openTabs.length === 0 ? null : openTabs.includes(requested) ? requested : openTabs.at(-1)!;
}
