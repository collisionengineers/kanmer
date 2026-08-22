# Open questions

- [x] Should GUI-111 create a separate feature PR? No. GUI-109 PR #162 remains the feature PR; this ticket is its blocking remediation record. The implementation branch must be stacked from GUI-109 head c259af171a72fa83a9131f4f53a79d0cfd0f05b5 and target gui-109-add-to-group, so fixes can be applied to the existing PR without an independent main-target merge.
- [x] How should project switching be handled with an open card menu? Bind the menu to the opening project, cancel/reject stale requests, and hide/close it when the active project changes. No action may use a different project's client.
- [x] What should an active-group archive race do? Re-read active groups immediately before updateItem and surface a clear failure if the selected id is no longer active; preserve the existing core validator and document the non-atomic residual.
- [x] How should discovery errors differ from an empty board? Track loading and error states; show a disabled error entry with the real failure text, while the empty state remains only for a successful [] response.
- [x] What is the scalable menu behavior? Bound every context-menu panel with vertical scrolling and scroll the keyboard-active entry into view; preserve existing portal/position semantics.
- [x] What should the manual say about archiving? Group creation remains agent-only; existing GroupView Archive/Unarchive is a user control.
- [x] How should assignment failures survive refresh? Refresh with error clearing disabled after a failed card action, so the error banner remains visible; successful actions keep the existing clear-and-refresh behavior.

## Parked (explicitly deferred)

- Live Electron click-through and screenshot remain INCONCLUSIVE as in GUI-109; no desktop proof is available in this lane.
- A fully atomic group archive-versus-ticket-update transaction is outside the existing ProjectClient/core contract and is not invented here; the renderer revalidation is the bounded fix required by F-003.
