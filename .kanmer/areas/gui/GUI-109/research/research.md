# Research — Add to group from the ticket context menu

## Ticket and governing context

GUI-109 is a remediation of the historical GUI-013 record. GUI-013's current proof explicitly says that the group chips/filter work shipped but the “Add to group” context-menu action was not implemented. The linked GUI-013 plan and files identify the existing Board/App group-filter surfaces. FRD-001 is the governing contract.

FRD-001 G3/G5 are decisive: membership lives on each ticket's `groups` frontmatter, member lists are derived, and there is no dedicated add/remove group tool. The GUI must therefore use the existing project client `updateItem(id, { groups })` path, which reaches the core store's group-id validation through the existing IPC handler. No new group storage, renderer-side membership list, or MCP tool is appropriate.

## Current source path

- `apps/gui/src/renderer/src/App.tsx` owns the card context-menu state and `cardMenuItems` builder. It already provides Open, Move, Release, Dispatch, copy, archive, and delete actions.
- `apps/gui/src/renderer/src/components/ContextMenu.tsx` supports nested submenus, disabled entries, keyboard selection, and themed portal rendering. The Add to group action can be a submenu without changing this shared component.
- `apps/gui/src/renderer/src/lib/client.ts` exposes `listGroups()`, `getItem()`, and `updateItem()` over the typed project-scoped IPC contract. `apps/gui/src/main/index.ts` already handles `updateItem` and `listGroups`; no main/preload/server change is needed.
- `apps/gui/src/renderer/src/components/FilterBar.tsx`, Board group chips, and GroupView already consume the same ticket `groups` field. Refreshing after the update lets watcher/list reads show the new chip and derived membership.
- `docs/manual/groups.md` still claims that no add-to-group control exists. Its generated in-app copy is rebuilt by `npm run build:manual`; the source manual should be updated with this feature.

## Chosen interaction

When a card menu opens, load active groups through `listGroups()`. Add a themed “Add to group” submenu. Each existing group is one entry labelled with its id/title; groups already on the ticket are disabled rather than duplicated. If no active groups exist, show one disabled explanatory entry. Selecting a group re-reads the ticket, appends the selected id to the latest `groups` array, and calls `updateItem`. Re-reading preserves memberships added by another agent/window after the menu opened; core still rejects any stale/unknown id.

The menu remains scoped to existing groups. Creating groups, archiving groups, group detail redesign, filters, chips, and MCP/core semantics are out of scope.

## Evidence plan

Add a small pure menu/membership helper with focused unit tests for empty membership, preserving multiple existing groups, duplicate prevention, and labels/disabled state. Add a renderer-level source/contract assertion only where useful; rely on the existing ContextMenu keyboard/submenu tests and the GUI suite for integration coverage. Run focused helper tests, the full GUI suite, manual freshness, GUI typecheck/build, and relevant workspace rails. A live Electron card-menu interaction and screenshot cannot be run in this environment; record that as INCONCLUSIVE rather than claiming it.
