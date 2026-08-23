import type { AppSettings } from "../../../shared/ipc.js";
export function restoreTabs(settings: AppSettings, currentProject: string | null): string[] {
  if (settings.openTabs.length > 0) return settings.openTabs;
  return settings.sessionInitialized ? [] : currentProject ? [currentProject] : [];
}
export function restoredActiveTab(openTabs: string[], requested: string): string | null {
  return openTabs.length === 0 ? null : openTabs.includes(requested) ? requested : openTabs.at(-1)!;
}

/**
 * Restore background projects independently so one stale/unreadable project
 * cannot prevent the remaining session tabs from opening. The caller owns the
 * user-visible failure surface; keeping it as a callback makes this helper
 * usable by the renderer without coupling session state to React.
 */
export async function restoreBackgroundTabs<T>(
  openTabs: readonly string[],
  activeTab: string,
  openProject: (path: string) => Promise<T>,
  onOpened: (result: T) => void,
  onFailed: (path: string, error: unknown) => void,
): Promise<void> {
  for (const path of openTabs) {
    if (path === activeTab) continue;
    try {
      onOpened(await openProject(path));
    } catch (error) {
      onFailed(path, error);
    }
  }
}
