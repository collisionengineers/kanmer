# Phase 4 — GUI trust

**Goal:** eliminate every silent-data-loss path and dead-end error state in the renderer. Can run in parallel with Phases 2–3 (touches `apps/gui/src/renderer` + one main-process handler).

**Depends on:** nothing (Phase 1.7's `expected_updated` strengthens 4.2 but isn't required). **Feeds:** Phase 5 (dirty guard used by Esc/context menus), Phase 7.

## Items

### 4.1 Diff-based saves (keystone — do first) — M
- **Where:** `apps/gui/src/renderer/src/components/Editor.tsx`.
- Editor currently keeps local `useState` per field and `onSave` writes all 8 fields wholesale — clobbering concurrent agent edits to fields the user never touched. Keep a `baseline` ref (the `item` snapshot at mount / last save); on save, send **only fields where local ≠ baseline**. Core `updateItem` is read-merge-write of the current file, so untouched fields get field-level merge for free.

### 4.2 Live re-sync + conflict banner — M
- **Where:** `Editor.tsx`.
- `useEffect` on `item.updated`: when it differs from `baseline.current.updated` — if not dirty, silently adopt all incoming values + reset baseline; if dirty, adopt incoming values only for untouched fields, and show a banner "Changed on disk while editing" with **Keep mine / Take theirs** (v1: global choice). Save-time stale check: `getItem(id)` and compare `updated` to baseline before writing, closing the watcher-debounce race window; reset baseline to the returned item after save.

### 4.3 Unsaved-changes guard — M
- **Where:** `Editor.tsx` (report `dirty` upward via `onDirtyChange` into a ref — no re-render), `App.tsx`.
- Route every deselection through one `trySelect(id)` gate — card click, editor Close, wiki-link navigate, tab switch — with a small plain-CSS confirm ("Discard changes to TICK-012?"). `window.onbeforeunload` while dirty for window close. With 4.1/4.2, "dirty" shrinks to genuinely-edited fields, so the guard fires rarely and honestly.

> **Amended by the PR #2 review remediation:** document-tab switches are guarded by a tab-level `tryTab` inside `Editor.tsx`, not by routing through `trySelect` (the tab strip never deselects the item). Project switching was unguarded and is now covered by `pendingProject`/`requestOpen` in `App.tsx`. Delete-while-open stays deliberately unguarded — the item is gone. The `beforeunload` half remains unverified in this Electron configuration (AGENTS.md §11).

### 4.4 Settings validation + error surfacing — M
- **Where:** `components/Settings.tsx`, `App.tsx` (`saveBoard`, lines ~86–89).
- Validate the draft before IPC: ≥1 stage, non-blank column names, non-empty ID prefixes, unique area prefixes (v2). Render inline error in the modal head instead of closing. Wrap `onSaveBoard` in try/catch and show thrown zod messages. Drop the optimistic `setBoard(next)` (or revert in catch) so an invalid board never renders. Backdrop-click/Cancel with a modified draft → confirm discard.

> **Amended by the PR #2 review remediation:** `validateDraft` cannot mirror the last-stage proof check — the renderer has no `proof.md` visibility — so core's rejection surfaces through `Settings.save()`'s catch instead. It now also mirrors core's *duplicate `idPrefixes`* rule, not just area-vs-area uniqueness.

### 4.5 External links open in the default browser — S
- **Where:** `apps/gui/src/main/index.ts` (`createWindow`), `renderer/src/lib/markdown.ts`.
- Today an `https://` link in a markdown preview navigates the BrowserWindow away with no way back. Add `will-navigate` → `preventDefault()` + `shell.openExternal(url)` for `https?:` (allow the dev-server/file URL through), and `setWindowOpenHandler` → openExternal + deny. Bundle: disable raw-HTML passthrough in `renderMarkdown` (marked renderer override, zero deps) — CSP remains the backstop for `dangerouslySetInnerHTML`.

> **Amended by the PR #2 review remediation:** as built, the raw-HTML override escaped the wiki anchors the same function generated, so `[[ID]]` rendered as literal text. `[[…]]` is now a `marked` **inline extension**, so no raw HTML is produced at all and the escaping stays exactly as strict as specified.

### 4.6 Empty / loading / error states — S
- **Where:** `App.tsx`, `components/{Board,ItemList,Welcome}.tsx`, `styles.css`.
- try/catch around `pickAndOpen`/`openProject` → `setError`, resurrecting Welcome's currently-dead `error` prop; `openingProject` flag → "Opening…" indicator. Board zero-items: centered empty state over the grid ("No tickets yet — add a card, or connect an agent in Settings"), headers still visible. Distinguish filtered-empty (`items.length > 0`, `viewItems.length === 0`) → "No matches" + Clear-filters button.

### 4.7 QuickAdd: blur never creates — S
- **Where:** `components/QuickAdd.tsx` (line ~42), `components/Board.tsx` (~110).
- Blur no longer commits; Enter commits, Escape cancels; non-empty text keeps the input open (nothing typed is lost). Add a per-area "+" in each area group header passing `{ type, title, status, area: group.id }` — today's quick-add drops new cards into "No area" even when added inside an area group.

### 4.8 Full-height drop zones — S
- **Where:** `styles.css` (`.board`, `.cell`, `.content`).
- Cells are only content-height (`min-height: 60px`), so dropping under a short column does nothing. Set `.board { grid-template-rows: auto 1fr; min-height: 100%; }` with `.content` providing height so cells stretch to the column bottom.

## Verification
- Manual two-writer test: open a ticket in the editor, have an agent (or a second shell editing the file) change its stage and body mid-edit — saving the GUI's title change must not revert the agent's stage/body; the conflict banner appears only when the same field diverges.
- Switching cards / closing with edits prompts; saving then switching doesn't.
- Settings: deleting all stages shows an inline error, board on screen stays valid.
- Clicking an external link opens the browser, app stays put. Fresh project shows the empty state. Typing in QuickAdd then clicking away creates nothing.
