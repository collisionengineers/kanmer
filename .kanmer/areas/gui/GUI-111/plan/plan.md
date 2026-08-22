# Plan — GUI-111 review remediation for GUI-109

## Governing docs

- docs/functional/frd/FRD-001-groups.md — preserve G3 ticket-owned membership, G4 archived-group visibility/retirement, G5 existing list_groups/update_item contracts, and no second membership store.
- [[GUI-109]] — remediation is limited to the six independent-review findings on PR #162; GUI-111 must not redesign or replace the original Add to group feature.
- HZN-007 context.md — use the adjacent Kanmer pipeline, dedicated worktree/branch, surfaced errors, exact evidence, and independent review handoff.

## Chosen approach

Keep PR #162 as the feature PR. Work GUI-111 on a dedicated stacked branch forked from c259af171a72fa83a9131f4f53a79d0cfd0f05b5 and target gui-109-add-to-group. Bind card-menu state and asynchronous requests to the opening project and hide/cancel them on project changes. Add explicit loading/error states to group-menu generation. Re-read active groups immediately before assignment and reject a group that was archived between discovery and selection. Add bounded scrolling and keyboard visibility to the existing ContextMenu. Correct the manual wording. Make refresh preserve an action error after a failed card action.

This keeps all membership writes on ProjectClient.updateItem(groups), preserves the existing optimistic ticket revision check, and avoids changing core/IPC/MCP contracts. A fully atomic archive/update transaction is outside the existing contract and remains an explicit residual.

## Ordered implementation

1. Create the GUI-111 worktree/stacked branch from the exact GUI-109 PR head, then take the ticket through MCP.
2. Extend App card-menu state with the opening project identity. Ensure group discovery and assignment only use that project, cancel stale requests on tab changes, and do not render an old menu after a project switch.
3. Extend group-menu helper/state for loading and error outcomes; distinguish successful empty discovery from listGroups failure and add deterministic tests.
4. Revalidate active group membership immediately before updateItem, surfacing a clear archive-race error while preserving ticket revision binding and append/no-duplicate semantics.
5. Add max-height/overflow to context-menu panels and scroll the keyboard-active menu item into view.
6. Correct docs/manual/groups.md so it distinguishes agent-only group creation from the existing user Archive/Unarchive group-detail control; regenerate chapters.generated.ts.
7. Change the shared refresh/action seam only as needed so failed Add to group actions remain visible after the refresh; retain normal successful-action behavior.
8. Run focused helper tests, full GUI tests, workspace typecheck, GUI build, manual freshness, diff-check, and relevant hosted PR checks. Record exact failures and keep live Electron visual evidence INCONCLUSIVE.
9. Write the post-implementation report, tick the checklist, record GUI-111 commit/stacked PR traceability, push, open or update the stacked PR targeting gui-109-add-to-group, and move only Implementing → Review after a fresh gate read.

## Acceptance mapping

- F-001: a menu/request/action cannot cross project tabs; stale project results are cancelled or ignored.
- F-002: loading, successful-empty, and failed discovery are distinct and user-visible.
- F-003: a selected group archived after initial discovery is rejected before the ticket write.
- F-004: large menus are bounded and keyboard navigation scrolls the active entry.
- F-005: manual accurately documents creation versus archive controls.
- F-006: getItem/updateItem/action errors remain visible after refresh.
- Original GUI-109 behavior remains ticket-owned, append-preserving, duplicate-safe, and core-validated.

## Risks and mitigations

- React state can briefly contain an old menu during a root transition: include project identity in state, gate rendering by the active root, and include root in effect cleanup dependencies.
- A read-before-write archive race cannot be made atomic through the existing renderer client: revalidate immediately before updateItem and document the residual; do not claim stronger proof.
- Changing refresh affects many existing actions: add an opt-in error-preservation option and test the helper/state behavior without changing successful refresh semantics.
- ContextMenu CSS is shared: constrain only the existing .ctx-menu panel and add scrollIntoView defensively so existing menus retain positioning and keyboard behavior.
- A live desktop session is unavailable: report deterministic PASS only and leave visual interaction INCONCLUSIVE.

## Stop condition

GUI-111 is in Review with its stacked PR open against gui-109-add-to-group, exact commit/PR traceability recorded, all deterministic rails run, no merge performed, and ready for GUI-099's independent review. GUI-109 remains blocked until that review passes.
