# Phase 5 — GUI: groups, backlog, dispatch, manual

**Goal:** the group experience (chips, filter, detail view), the Backlog list view, the task-scoped dispatch picker, and the in-app manual.

**Depends on:** 3 (group tools), 4 (board model, ContextMenu). **Feeds:** Phase 7 (dogfood) and the adoption playbook.

## Items

### 5.1 Group chips + filter — M (FRD-001 G8)
- Card chips (kind-coloured; click → filter), FilterBar group dropdown, horizon chips surfaced prominently; "Add to group ▸" wired in the ContextMenu. **Where:** `Board.tsx`, `FilterBar.tsx`, `lib/board.ts`.

### 5.2 Group detail view — M–L
- Opens like the editor: group doc (editable), shared files list (+ upload, reusing 4.6), derived member table (id/title/stage) with progress bar, archive action. **Where:** new `components/GroupView.tsx`, IPC for group tools.

### 5.3 Backlog list view — L (FRD-011)
- Virtualized table, shared filters + list-only sort, row + bulk actions (gate-checked Move to Preparing, add-to-group, archive), keyboard/a11y. Board drops the Backlog column (completes 4.2). **Where:** new `components/BacklogTable.tsx`, `App.tsx` views.

### 5.4 Dispatch task picker — M (FRD-010)
- ContextMenu "Dispatch ▸ provider ▸ task" from the SSOT task list; gate-aware enablement with reasons; drawer rows gain task + deliverable link. **Where:** `main/dispatch.ts`, drawer in `App.tsx`.

### 5.5 In-app manual — M–L (FRD-024)
- Help menu item + F1; viewer (sidebar chapters, in-page search, marked pipeline, theme vars); build step generating chapters from `/docs/` FRDs + hand-written getting-started/troubleshooting; shortcuts chapter generated from the binding table; "?" deep-links from Settings tabs + gate messages (wiring 4.5's stub). **Where:** new `components/Manual.tsx`, Help menu template in main, `scripts/build-manual.mjs`.

## Release rail
None tool-facing. README gains the manual mention.

## Verification
- vitest: backlog sort/filter interaction with shared state; group progress derivation display; shortcuts-chapter-matches-bindings test.
- Manual (hands-on): 200-ticket fixture backlog scroll; filter continuity across views; dispatch "Deep research" end-to-end on a fixture ticket; F1 offline; gate "?" lands on the profiles chapter; dark/light manual rendering.
