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
- R5. **Views**: Board (all six stages Backlog→Done, area-grouped columns, badges: taken/blocked/deployment/PR), Standup, Archived — **three**, switched with Ctrl+1…3. There was a fourth, Backlog (FRD-011); it was withdrawn by GUI-070 and the board's Backlog column (GUI-069) is now the only place backlog tickets appear. Settings tabs: Board (areas), Profiles (FRD-002 S2), Appearance (theme dark/light/system, density, notifications, delete-confirm, new-ticket defaults), Git (FRD-020), Connect (FRD-012).
  - R5a. **Tab badges — what the number next to a view's name means.** A tab
    badge counts **everything that lives in that view**, and it **ignores the
    active search and filters**. A badge describes the tab; a filter is a
    temporary lens on what is already behind it. Per view: **Board** — every
    non-archived ticket, *Done included* (a board count is the size of the
    board, not of what is in flight), excluding `plan`/`research` items, for
    which the board renders no card; **Archived** — every archived item
    whatever its type, because the Archived view renders them all; **Standup** —
    no badge, the report is a narrative rather than a quantity. The
    Board/Archived asymmetry over non-ticket items is each view counting what
    it renders, and is deliberate.
  - R5b. **Badges and column counts answer different questions, on purpose.**
    The Board's **per-column** counts *do* respond to the active search and
    filters — they count what is visible in that column. So with a filter on,
    the Board tab may read 152 while the columns beneath it sum to 2 (observed
    under GUI-071 on a 152-ticket board). Both numbers are
    correct: the badge is how much the view holds, the column count
    is how much matches the filter. This is written down because two numbers in
    the same header area answering different questions otherwise read as a
    defect (GUI-071; before it, R5 was silent on badges and the silence was the
    ambiguity).
  - R5c. **One source.** Each view's label, the item set it renders and whether
    it has a badge are keyed together in `renderer/src/lib/views.ts`
    (`VIEWS`, `viewItemsFor`, `viewCount`), which the tab strip, the Ctrl+1…3
    shortcuts, the filtered render set and the empty states all derive from.
    `viewItemsFor` takes `(view, items)` and no filter argument, so a badge is
    structurally incapable of seeing a filter. `lib/views.test.ts` asserts
    badge == rows-the-view-shows-unfiltered across *every* view, so a view
    added later is covered without editing the test. Before GUI-071 the rule
    was inlined three times and the badge expression branched only on
    "archived", which is how the withdrawn Backlog tab came to print the whole
    board.
- R6. **Themed context menus (v3):** all right-click menus are **renderer-drawn components using the app's theme variables** — the native OS menu is replaced. Scope: card menu (Open · Move to ▸ · Add to group ▸ · Dispatch to agent ▸ · Copy ID · Copy [[wiki-link]] · Archive), plus any future menus. Behaviour: positioned at cursor with viewport clamping, Escape/click-away closes, full keyboard navigation (arrows/Enter), `role=menu` semantics, submenus flip when near edges, identical rendering in dark/light/system.
- R7. Single-instance lock, window-bounds persistence, real app menu (DevTools gated to dev), Welcome screen for the empty state.

**Acceptance:** R6 — open the card menu in dark and light themes: colors, borders, hover states match the theme in both; no native menu appears anywhere; menu fully operable by keyboard. R5a/R5b — type into the search box: the Board tab's badge holds still while the board's column counts narrow; archive a ticket and the Board badge drops by one while Archived's rises by one. R1–R5: the shipped behaviours hold (guard matrix: dirty editor × {select, tab-switch, tab-close, project-open, quit} all prompt).

Related: kanmer-upgrades Phases 4/5/7 · kanmer-v2 Phases 3/4/5 · FRD-011 (**withdrawn**, GUI-070) · user request R9.

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
- R5a/R5b/R5c — `renderer/src/lib/views.ts` holds the view table (`VIEWS`, `VIEW_IDS`,
  `viewItemsFor`, `viewCount`, `viewCounts`) and `lib/views.test.ts` asserts the
  badge/rows equality across every view; `App.tsx` derives the tab strip, Ctrl+1…3,
  `allViewItems` and the FilterBar's facet set from it (GUI-071).
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

## Compiled-workflow end state (ADR-0016)

The Editor exposes Scratch as a top-level tab and renders the first group context as read-only material above the ticket body. Local modes select, but never hide, the starting tab: Approval → Ticket, Execution → Plan, Review → Scratch, Evidence → Proof. Non-selected tabs may be dimmed only. A non-blocking board-worktree health banner reports unhealthy observations and directs repair to operations; it never prevents board use.
