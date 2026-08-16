# design-sync notes — Kanmer

Repo-specific facts a re-sync needs. Config lives in `config.json`; the design agent's conventions in `conventions.md`.

## What the "design system" is

- Kanmer had no DS package. `packages/ui` (`@kanmer/ui`) was created for this sync: a **barrel** over the GUI renderer (`apps/gui/src/renderer/src/components/*`, `lib/*`, `styles.css`) plus one own file, `src/demo.tsx` (in-memory `ProjectClient`, `KanmerProvider`, `demoBoard/demoItems/demoActivity`, and a `window.kanmer` shim for Settings' Git/Connect tabs). Nothing is reimplemented — if a GUI component changes, `npm run build:ui` picks it up.
- Build: `npm run build:ui` (builds `@kanmer/core` first — its `dist/index.d.ts` is what `@kanmer/ui`'s `.d.ts` re-exports resolve against). tsup emits `dist/index.js` + `dist/index.d.ts` + `dist/index.css` (the GUI's `styles.css`, imported from `src/index.ts`).
- All `@kanmer/core` imports in the renderer are `import type` — the bundle is browser-safe. `marked` is bundled into `dist/index.js` (`noExternal`).
- Converter invocation (from repo root): `--node-modules ./node_modules --entry ./packages/ui/dist/index.js` (root node_modules holds react and the workspace symlink `@kanmer/ui`).

## Config decisions

- `srcDir: ../../apps/gui/src/renderer/src` so JSDoc/leading docs come from the real component sources; `KanmerProvider` pinned via `componentSrcMap`. `ClientContext` excluded (PascalCase context, not a component).
- `docsDir: docs/components` holds **category stubs only** (`---\ncategory: X\n---`) — they set the group (Board / Dialogs / Shell / Inputs / Providers); the `.prompt.md` body is synthesized from JSDoc + props + preview examples. Kept out of `docs/*.md` so the default `guidelinesGlob` doesn't ship them as guidelines.
- `provider: KanmerProvider` — every card renders inside the demo client. Previews that need different data nest their own `<KanmerProvider client={createDemoClient({...})}>` (inner wins).
- `dtsPropsFor` pins the 7 components whose props take `BoardConfig` (a zod-inferred structural type > 240 chars → the extractor emitted `board: unknown`). Bodies are copied from the source interfaces; keep them in sync if the GUI props change (Board, FilterBar, ArchivedList, Editor, Settings, TicketCreate, Standup).
- `overrides`: overlays (`Editor`, `Settings`, `TicketCreate`, `ConfirmModal`, `CommandPalette`, `ActivityPanel`) are `cardMode: single` + viewport; wide ones (`Board`, `FilterBar`, `ArchivedList`, `Standup`, `KanmerProvider`, `TabStrip`, `Welcome`) are `column`. `ActivityPanel.primaryStory: Recent` (esbuild sorts IIFE exports alphabetically, so "Empty" would win by default).

## Preview conventions (`.design-sync/previews/`)

- Every preview imports `./frame.module.css` — restores the app's dark ground (`html body { background: var(--bg); color: var(--text) }`) at higher specificity than the card harness's white `body`. It must be `.module.css`: plain `.css` imports are loaded as `empty` by the story-imports policy; `.module.css` falls through to esbuild local-css and lands in `_preview/<Name>.css`, which the card links.
- **Overlay stories need a sized root** (`<div style={{ height: 720 }}>`): the harness wraps single-mode cards in a `transform`ed box, which becomes the containing block for `position: fixed`; with only a fixed child that box is 0px tall and the modal renders clipped/centred on y=0.
- Board stories are 7 columns × 230px min — wider than any card; the FullBoard story scrolls horizontally inside its own div, the other stories use a 4-stage subset so all columns are visible.
- Demo timestamps are relative to module load (`Date.now()` at import) so "2h ago" reads right; captures aren't pixel-diffed so this doesn't churn grades.

## Known render warns (triaged — not new)

- `[FONT_MISSING] "Cascadia Code"` — one textarea stack `ui-monospace, "Cascadia Code", monospace` (styles.css line ~482). Cascadia Code is a Windows 11 system font, not a brand font, and sits behind `ui-monospace`; not shipped. Decision pending with the user: leave as a system-font fallback (current), or vendor the OFL woff2 via `cfg.extraFonts`.

## Re-sync risks

- `dtsPropsFor` bodies are hand-copied — they go stale silently if a GUI prop interface changes. Diff them against `apps/gui/src/renderer/src/components/<Name>.tsx` on every re-sync.
- Category stubs enumerate components — a new GUI component added to `packages/ui/src/index.ts` without a stub lands in group `general` (harmless) and with no preview (floor card).
- The `window.kanmer` shim in `demo.tsx` covers only what Settings' Git/Connect tabs call today; new `window.kanmer.*` calls in the renderer will throw inside those tabs in the DS pane until the shim grows.
- `.gitignore` in this repo carried unresolved stash conflict markers (`<<<<<<< Updated upstream`) before this sync — the design-sync entries were appended below them. Resolved since, to the `apps/gui/release-*/` glob.
- Toolchain: converter deps in `.ds-sync/` pinned `playwright@1.61.0` to match the cached `chromium-1228` under `%LOCALAPPDATA%/ms-playwright`; a different cache needs a different pin (see the sub-skill §4.1).
