# Research — GUI-111 review remediation for GUI-109

## Question

How should the six independent-review findings on GUI-109 PR #162 be corrected without changing the ticket-owned group model, adding a second storage path, or widening the feature beyond the existing renderer/menu/manual surfaces?

## Governing context

- GUI-109 PR #162 is open at c259af171a72fa83a9131f4f53a79d0cfd0f05b5 and remains in Review.
- GUI-111 blocks GUI-109 and is a review-follow-up ticket under HZN-007.
- HZN-007 requires adjacent Kanmer stages, dedicated ticket worktrees, surfaced errors, and no scope absorption.
- FRD-001 G3/G4/G5 require membership to remain on tickets, archived groups to remain readable but absent from active surfaces, and membership writes to use the existing update_item(groups) contract.
- GUI-109's packet already established that the existing ProjectClient.listGroups/getItem/updateItem, ContextMenu, watcher refresh, and manual generator are the only intended surfaces.

## Findings

1. **Project binding (GitHub thread 3835659776 / F-001).** App stores the open card menu as item/x/y only. clientRef.current follows the active project, while the menu and its asynchronous listGroups request are not keyed to the project that opened it. A tab switch can leave the old menu mounted, allow a late result from project A to populate project B, and run the group action through project B's client for the old ticket id. The correction is to bind card-menu state/request cleanup to the opening project and render/actions only while that project remains active.
2. **Discovery failures (3835659781 / F-002).** listGroups rejection is converted into [] and the helper displays a valid-empty “No active groups available” state. This hides IPC/store failures and contradicts the packet's error-surface expectation and HZN-007 no-swallowed-errors rule. The submenu needs explicit loading/error state so a failure is distinguishable from a board with no groups.
3. **Archive race (3835659784 / F-003).** listGroups excludes archived groups, but another actor can archive a selected group after discovery. Core currently validates group existence including archived groups, so update_item can create membership that vanishes from active chips/filters. The renderer must revalidate that the selected group is still active immediately before updateItem and surface a rejection. The core contract remains unchanged in this bounded remediation; the remaining unavoidable read/write race is documented as a residual unless the existing API gains an atomic active-group check.
4. **Large submenu (3835659786 / F-004).** ContextMenu's .ctx-menu has no max-height/overflow, and keyboard movement does not scroll the active menu item. A large active group set can render entries outside the viewport. CSS bounding plus active-item scrollIntoView fixes the shared menu behavior without a new picker.
5. **Manual accuracy (3835659787 / F-005).** GroupView already exposes Archive/Unarchive through updateGroup. The new groups manual must say creation is agent-only while archiving/unarchiving is available from group detail.
6. **Assignment error visibility (3835659788 / F-006).** runCardAction catches an assignment/concurrency error, then calls refresh; refresh unconditionally clears error on successful reload. The user therefore loses the conflict after the menu closes. Refresh needs an opt-out from clearing an existing action error, used only when the action failed.

## Existing tests and evidence

GUI-109 already has five pure helper tests and the full GUI suite. There are no ContextMenu or App tests covering these new paths, so add deterministic helper tests for loading/error/active-group states and menu-project binding where practical, and rely on full GUI/typecheck/build/manual rails for integration. Live Electron interaction remains INCONCLUSIVE and must not be fabricated.
