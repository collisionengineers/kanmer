# Where the change lands

| Path | Why |
|---|---|
| `renderer/src/components/ContextMenu.tsx` | **New.** Portal, panels, submenus, keyboard, ARIA. |
| `renderer/src/lib/menu.ts` | **New.** Placement and keyboard index maths — pure, so vitest can reach it. |
| `renderer/src/lib/menu.test.ts` | **New.** 12 tests. |
| `renderer/src/App.tsx` | Menu state, item construction, gate fetch on open, provider list. |
| `renderer/src/components/Board.tsx` | `onContext` carries the pointer position. |
| `renderer/src/styles.css` | `.ctx-*` — every colour a token. |
| `main/index.ts`, `preload/index.ts`, `shared/ipc.ts` | The native path deleted. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `styles.css:1-29` | The token set the menu must use, and the light override that makes theming automatic. |
| `main/index.ts` `CH.getGateStatus` | Where the per-stage "why not" comes from. The renderer cannot compute it — it may not import core at runtime. |
| `AGENTS.md` §7 (renderer logic in `lib/`) | Why placement and key handling are not in the component. |
