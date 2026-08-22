# Plan — GUI-109 Add to group

## Governing docs

- `docs/functional/frd/FRD-001-groups.md` — G3/G5 require ticket-owned validated membership and the existing `update_item(groups: [...])` contract; G8 defines the GUI group surface.
- `[[GUI-013]]` — prior group chips/filter implementation and known proof gap for this action.

## Implementation

1. Add a pure `groupMenu` helper for deterministic active-group labels, existing-membership disabling, empty-state rendering, and append-without-duplicates.
2. In App's existing card menu, load active groups when a menu opens and render the helper's entries under an “Add to group” submenu. Use the current ProjectClient rather than a second storage path.
3. On selection, re-read the ticket, append the chosen id to its current groups, call `updateItem`, and use the existing error/refresh path. This preserves memberships across concurrent external edits and leaves unknown-id validation in core.
4. Update the manual source and regenerate the in-app manual so the shipped behavior no longer says the feature is absent.
5. Add focused helper tests, then run the focused/full GUI suite, manual check, GUI typecheck, and GUI build. Preserve every failure and classify Electron visual interaction as INCONCLUSIVE if unavailable.

## Acceptance mapping

- Existing groups appear under the ticket card context menu.
- Selecting an unassigned existing group appends it while preserving all prior groups.
- Selecting an already assigned group is disabled/no-op; no duplicate membership is written.
- Unknown groups cannot be selected from discovery and core remains the final validator.
- After the existing refresh/watcher path, chips/filter and derived group membership read from the updated ticket.
- No group membership is duplicated in group files or renderer state.

## Stop condition

Open a PR and move only Implementing → Review after fresh gates. Stop for independent review; do not merge, verify, release, or clean the worktree/branch.
