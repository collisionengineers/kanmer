import { describe, expect, it } from "vitest";
import {
  DARK_NATIVE_CHROME,
  LIGHT_NATIVE_CHROME,
  nativeChromeBackground,
  refreshesForSystemTheme,
  synchronizeNativeTheme,
  type NativeThemePort,
} from "./nativeTheme.js";

function native(systemDark: boolean): NativeThemePort {
  return { themeSource: "system", shouldUseDarkColors: systemDark };
}

describe("synchronizeNativeTheme", () => {
  it.each([
    ["dark", false, DARK_NATIVE_CHROME],
    ["light", true, LIGHT_NATIVE_CHROME],
    ["system", true, DARK_NATIVE_CHROME],
    ["system", false, LIGHT_NATIVE_CHROME],
  ] as const)("sets %s source and %s native background", (theme, systemDark, expectedColor) => {
    const port = native(systemDark);
    const colors: string[] = [];

    synchronizeNativeTheme(theme, port, (color) => colors.push(color));

    expect(port.themeSource).toBe(theme);
    expect(colors).toEqual([expectedColor]);
  });
});

describe("nativeChromeBackground", () => {
  it("uses the system color only for the system preference", () => {
    expect(nativeChromeBackground("dark", false)).toBe(DARK_NATIVE_CHROME);
    expect(nativeChromeBackground("light", true)).toBe(LIGHT_NATIVE_CHROME);
    expect(nativeChromeBackground("system", true)).toBe(DARK_NATIVE_CHROME);
    expect(nativeChromeBackground("system", false)).toBe(LIGHT_NATIVE_CHROME);
  });
});

describe("refreshesForSystemTheme", () => {
  it("refreshes after an OS native-theme update only when following the system", () => {
    expect(refreshesForSystemTheme("system")).toBe(true);
    expect(refreshesForSystemTheme("dark")).toBe(false);
    expect(refreshesForSystemTheme("light")).toBe(false);
  });
});
