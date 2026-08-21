# Files — GUI-077

## Modify

| Path | Reason |
|---|---|
| `apps/gui/src/main/index.ts` | BrowserWindow/title-bar native chrome follows resolved theme. |
| `apps/gui/src/main/*.test.ts` | Cover theme-to-native-chrome mapping where current test structure permits. |

## Context

| Path | Why |
|---|---|
| `apps/gui/src/main/settings.ts` | Theme setting and system-theme integration. |
| `apps/gui/src/renderer/src/styles.css` | Renderer tokens remain the visual source; do not duplicate them. |

## Out of scope

Renderer CSS, context-menu work, and OS-wide appearance settings.
