# Files — GUI-111 review remediation

## Production changes

| Path | Change | Risk / proof |
|---|---|---|
| apps/gui/src/renderer/src/App.tsx | Bind the card menu and group request/action to the opening project; track group loading/error state; revalidate active group before assignment; preserve action failures across refresh. | Highest risk: stale project writes, archived-group race, and swallowed conflicts. Full GUI tests, typecheck, and source inspection prove the renderer contract. |
| apps/gui/src/renderer/src/lib/groupMenu.ts | Extend pure menu-item generation for loading and discovery-error states, and keep active-group selection predicate deterministic. | Low risk; focused unit tests prove empty/loading/error/duplicate behavior. |
| apps/gui/src/renderer/src/lib/groupMenu.test.ts | Add focused tests for loading/error states and active-group eligibility helpers. | Deterministic proof of failure-state and revalidation decisions. |
| apps/gui/src/renderer/src/components/ContextMenu.tsx | Scroll the active menu item into view as keyboard focus moves. | Shared menu behavior; full GUI suite and typecheck cover regressions. |
| apps/gui/src/renderer/src/styles.css | Bound context-menu height and enable vertical scrolling. | Visual/layout-only rail; diff/build and existing menu source prove the CSS is scoped. |
| docs/manual/groups.md | Correct archive/unarchive wording. | Manual freshness check. |
| apps/gui/src/renderer/src/manual/chapters.generated.ts | Regenerate the in-app manual from the source. | Generated parity check. |

## Existing contracts to reuse

| Surface | Contract |
|---|---|
| Project identity | App root/clientRef and project-scoped ProjectClient; card menu must not outlive its opening project. |
| Membership | ProjectClient.listGroups() for active discovery; getItem/updateItem(groups, expectedUpdated) for ticket-owned writes. |
| Group retirement | GroupView/updateGroup({ archived }); archived groups stay readable and are omitted from active listGroups. |
| Menu behavior | Existing nested ContextMenu, keyboard navigation, and portal. |
| Refresh/errors | Existing refresh() and error banner; add only the needed preserve-error option. |
| Manual | docs/manual/groups.md is source; npm run build:manual regenerates chapters.generated.ts. |

## Context files

- docs/functional/frd/FRD-001-groups.md — authoritative group storage, archive, and membership semantics.
- GUI-109 plan/report — original feature scope, acceptance mapping, and known visual evidence boundary.
- apps/gui/src/renderer/src/App.tsx — active project/client refs, card menu state/actions, refresh/error behavior.
- apps/gui/src/renderer/src/lib/groupMenu.ts — current pure helper and menu tests.
- apps/gui/src/renderer/src/components/ContextMenu.tsx and styles.css — nested menu layout and keyboard behavior.
- apps/gui/src/renderer/src/components/GroupView.tsx — existing archive/unarchive control used to correct manual text.
- docs/manual/groups.md — user-facing source copied into generated manual.

## Explicit non-targets

No core/MCP/IPC storage changes, no new group model, no group creation UI, no provider/dispatch redesign, no unrelated ticket menu changes, no changes to GUI-109's original branch, and no live Electron/remote proof claims.
