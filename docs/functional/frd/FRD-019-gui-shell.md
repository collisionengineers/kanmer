---
status: draft
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
