---
status: approved
covers: shipped GUI shell (backfill) + themed context menus (v3, user request)
---

# FRD-019 — GUI shell

The desktop application around the board.

- R1. **Multi-project tabs**: per-project contexts in main (projectId threading on IPC/events), a tab strip, per-tab view/filter/search/selection state preserved across switches, per-tab unread, session restore on launch.
- R2. **No silent data loss**: every deselect, tab switch, tab close, project switch, and window close routes through the unsaved-edit guard with a confirm modal / native prompt.
- R3. **Editor**: diff-based saves, live re-sync with a conflict banner (doc versions), doc tabs per type (per-type document lists, FRD-003 T7), chip inputs, resizable, wiki-links rendered as tokens, external links open in the browser.
- R4. **Navigation**: FilterBar (search Ctrl+F, area/assignee/label/group), Ctrl+K palette (jump + contextual verbs: Move/Take/Release/New), keyboard card-move, focus/ARIA discipline.
- R5. **Views**: Board (Preparing→Done, area-grouped columns, badges: taken/blocked/deployment/PR), Backlog (FRD-011), Standup, Archived. Settings tabs: Board (areas), Profiles (FRD-002 S2), Appearance (theme dark/light/system, density, notifications, delete-confirm, new-ticket defaults), Git (FRD-020), Connect (FRD-012).
- R6. **Themed context menus (v3):** all right-click menus are **renderer-drawn components using the app's theme variables** — the native OS menu is replaced. Scope: card menu (Open · Move to ▸ · Add to group ▸ · Dispatch to agent ▸ · Copy ID · Copy [[wiki-link]] · Archive), plus any future menus. Behaviour: positioned at cursor with viewport clamping, Escape/click-away closes, full keyboard navigation (arrows/Enter), `role=menu` semantics, submenus flip when near edges, identical rendering in dark/light/system.
- R7. Single-instance lock, window-bounds persistence, real app menu (DevTools gated to dev), Welcome screen for the empty state.

**Acceptance:** R6 — open the card menu in dark and light themes: colors, borders, hover states match the theme in both; no native menu appears anywhere; menu fully operable by keyboard. R1–R5: the shipped behaviours hold (guard matrix: dirty editor × {select, tab-switch, tab-close, project-open, quit} all prompt).

Related: kanmer-upgrades Phases 4/5/7 · kanmer-v2 Phases 3/4/5 · FRD-011 · user request R9.

## Verified against code — Phase 0.2

Renderer paths relative to `apps/gui/src/`.

- R1 — `projectId` threads through every project-scoped IPC method, stated as the contract at
  `shared/ipc.ts:262-267` and enforced by `requireCtx`/`requireStore` `main/index.ts:127-134`;
  contexts map `main/index.ts:100`; per-tab UI state preserved in a ref map
  `renderer/src/App.tsx:61-66,162-185`; `TabStrip.tsx`; session restore `App.tsx:247-274` via
  `lib/session.ts`.
- R2 — the unsaved-edit guard routes through `requestOpen`/`runOpen` `App.tsx:455-479` and
  `lib/tabClose.ts` (vitest-covered).
- R3 — `Editor.tsx` (934 lines): doc version hashes give the conflict banner (core
  `getDocWithVersion`), `ChipInput.tsx` for chip fields, wiki-link tokens via `lib/markdown.ts`.
- R4 — `FilterBar.tsx:4-9,30-31`; `CommandPalette.tsx`; keyboard card-move `Board.tsx:331-337`.
- R5 — views listed match `App.tsx`; Settings' five tabs are in `Settings.tsx:22-23`. **Board
  currently renders Backlog→Done (seven stages) and the Settings tabs are Board/Documents/
  Appearance/Git/Connect** — the Preparing→Done range, the Profiles tab and the Backlog view are
  v3 (Phases 4–5), not yet built.
- R6 — **not built.** Card right-click is still the native Electron `Menu`
  (`Board.tsx:323-326` → `App.tsx:644-675` → `main/index.ts:467-528`). This is the v3 delta;
  Phase 4.8 replaces it with a renderer `ContextMenu`.
- R7 — single-instance lock `main/index.ts:105-125` (with the deliberate smoke-mode failure exit),
  window bounds `settings.ts:136`, app menu with DevTools gated to dev `main/index.ts:274-333`,
  `Welcome.tsx`.

Styling is one global stylesheet (`renderer/src/styles.css`, ~1575 lines) over CSS custom-property
tokens on `:root` with a `[data-theme="light"]` override `styles.css:1-29` — relevant to R6, whose
whole point is that a renderer-drawn menu can use those tokens and a native one cannot.
