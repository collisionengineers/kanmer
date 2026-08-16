# Where the change lands

| Path | Change |
|---|---|
| `apps/gui/src/shared/shortcuts.ts` | **New** — the binding table both the handler and the manual read. |
| `apps/gui/src/renderer/src/App.tsx` | Views derived from `VIEW_LABELS` (fixes the Ctrl+N bug); F1; manual state. |
| `scripts/build-manual.mjs` | **New** — markdown → a bundled TS module. |
| `apps/gui/src/renderer/src/manual/chapters.generated.ts` | **New, generated** — committed, because the build must not need `/docs/`. |
| `apps/gui/src/renderer/src/components/Manual.tsx` | **New** — sidebar, chapter, in-page search. |
| `apps/gui/src/renderer/src/manual/manual.test.ts` | **New** — chapter-matches-bindings. |
| `apps/gui/src/main/index.ts` | Help ▸ Manual, sending a menu command. |
| `package.json` | `build:manual`, run before the GUI build. |
| `packages/ui/src/index.ts` | Barrel. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `apps/gui/electron.vite.config.ts` | The renderer CSP is `default-src 'self'` — nothing may be fetched, so the manual must be bundled. |
| `App.tsx` shortcut handler | The bindings being lifted, and the `["ticket","standup","archived"]` array that GUI-015 left stale. |
| `App.tsx` `VIEW_LABELS` | The order the tab strip renders, which the view shortcuts must follow. |
| `main/index.ts:317` Help submenu | Where the menu item goes; `buildMenu()` re-runs per project open, so the item must stay stateless. |
| `renderer/src/lib/markdown.ts` | `renderMarkdown(text, knownIds)` — reused so manual prose renders like ticket prose. |
