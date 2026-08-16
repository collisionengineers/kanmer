# Phase 4 — GUI: the new board model

**Goal:** the GUI on format 3 — migration prompt, fixed columns, the Profiles editor, gate feedback that explains itself, reference-file upload, priority gone, and **theme-consistent context menus** (user request).

**Depends on:** Phase 2 (+ 3 for gate IPC shapes). **Feeds:** 5.

## Items

### 4.1 Format-3 migration prompt — M
- Reuse the migrate modal: mapping counts per alias, needs-restage list, folder-move + priority-strip counts, profile-assignment summary; decline leaves read-only compat with the banner (FRD-007 acceptance 6). **Where:** `App.tsx` migrate flow, `shared/ipc.ts`, `main/index.ts` migrate channel → shared core fn.

### 4.2 Fixed columns + Board-settings shrink — M
- Board renders the constant stages Preparing→Done (Backlog exits to FRD-011 in Phase 5 — until then it renders as a plain column with a "moving to its own view" note); Settings Board tab = areas only; palette/context Move verbs use constants. **Where:** `Board.tsx`, `Settings.tsx`, `App.tsx` paletteCommands.

### 4.3 Profiles editor — M (FRD-002 S2)
- Replaces the Documents tab: profile list, per-boundary type pickers validated against the vocabulary, area default-profile pickers, proof-type editor (FRD-006 R1). Save-path validation mirrors core (no unknown types/boundaries).

### 4.4 Profile picker — S
- TicketCreate + Editor chip; custom opens an inline requires editor.

### 4.5 Gate feedback — M
- Drag: gated columns dim with the missing types on hover; rejected drop → toast naming the boundary + doc. Editor: a readiness panel from `get_doc_gates` (per-boundary rows, click-to-open/create the doc tab). "?" deep-link stub for Phase 5's manual.

### 4.6 Reference files UI — M (FRD-004 R2)
- Editor: upload button + drag-drop onto the ticket → `reference/`; list with open-externally + remove-confirm. **Where:** `Editor.tsx`, IPC file-copy channel.

### 4.7 Priority UI removal — S
- FilterBar select, card badge, settings, create dialog. **Where:** `FilterBar.tsx`, `Board.tsx`, `TicketCreate.tsx`, `Settings.tsx`.

### 4.8 Themed context menus — M (FRD-019 R6)
- A renderer `ContextMenu` component (portal; theme CSS vars; viewport clamping; Escape/click-away; arrows/Enter; `role=menu`; submenus flip near edges). Card menu: Open · Move to ▸ · Add to group ▸ (targets wired in Phase 5; disabled until then) · Dispatch to agent ▸ · Copy ID · Copy [[wiki-link]] · Archive. The main-process native `Menu` path for cards is removed. **Where:** new `components/ContextMenu.tsx`, `Board.tsx` context-menu wiring, `styles.css`.

## Release rail
None tool-facing. README screenshots/copy refreshed where stages/priority appear.

## Verification
- vitest (renderer): ContextMenu keyboard matrix + clamping; profile picker validation; gate-feedback formatting from a fixture gates payload.
- Manual matrix: migration prompt on the legacy-board fixture; drag-deny reasons; upload → agent `get_item` shows the file; **context menu in dark, light, and system themes — no native menu anywhere**; typecheck + GUI boot smoke (`KANMER_SMOKE=1`).
