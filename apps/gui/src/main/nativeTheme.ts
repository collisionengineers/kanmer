import type { Theme } from "./settings.js";

export const DARK_NATIVE_CHROME = "#0f1115";
export const LIGHT_NATIVE_CHROME = "#f6f7f9";

export interface NativeThemePort {
  themeSource: Theme;
  shouldUseDarkColors: boolean;
}

export function nativeChromeBackground(theme: Theme, systemDark: boolean): string {
  const dark = theme === "system" ? systemDark : theme === "dark";
  return dark ? DARK_NATIVE_CHROME : LIGHT_NATIVE_CHROME;
}

/**
 * Keep Electron-owned chrome in the same mode as the persisted renderer theme.
 * The port makes the mapping testable without booting an Electron application.
 */
export function synchronizeNativeTheme(
  theme: Theme,
  native: NativeThemePort,
  setBackgroundColor: (color: string) => void,
): void {
  native.themeSource = theme;
  setBackgroundColor(nativeChromeBackground(theme, native.shouldUseDarkColors));
}

/** A native-theme event changes the app only while the user follows the OS. */
export function refreshesForSystemTheme(theme: Theme): boolean {
  return theme === "system";
}
