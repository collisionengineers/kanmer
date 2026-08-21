# Research — GUI-077

## Findings

- `apps/gui/src/main/index.ts` owns Electron window construction and imports `nativeTheme`; `isDarkTheme()` already resolves `dark`, `light`, and `system` settings.
- Electron `BrowserWindow` supports `backgroundColor` and native title-bar theming options. The fix belongs in main-process window creation/theme application, not renderer CSS.
- FRD-019 governs GUI shell theme behavior; this ticket must preserve the renderer theme and menus.

## Implication

Apply the resolved dark/light color to native window chrome at construction and whenever the setting/system theme changes, with a focused main-process test if the existing architecture exposes the helper.
