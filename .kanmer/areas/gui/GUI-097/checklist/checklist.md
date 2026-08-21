# Checklist — GUI-097

- [x] Confirm GUI-096 is merged and use its final Scratch/tab types.
- [x] Add/export exact four-value `EditorMode` enum/type and one mapping helper.
- [x] Map Approval→Ticket, Execution→Plan, Review→Scratch, Evidence→Proof.
- [x] Initialize Editor tab from mode on open.
- [x] Reapply mapping only for new item or explicit mode change, never ordinary refresh.
- [x] Add accessible four-option mode control.
- [x] Route mode changes through existing dirty-tab confirmation; cancel retains mode/tab.
- [x] Mark primary/secondary tabs for styling.
- [x] Keep every tab rendered, enabled, focusable, and clickable.
- [x] Add readable/focus-safe dimming only; active non-primary tab remains clearly active.
- [x] Preserve correct empty states for missing plan/scratch/proof.
- [x] Centralize App opening as ID + ephemeral mode with Approval default.
- [x] Pass Approval from ordinary selection/create/session paths.
- [x] Pass Execution from dispatch actions without changing dispatch eligibility or invoking twice.
- [x] Preserve requested mode through dirty pending-navigation confirmation.
- [x] Reset ordinary future opens/session restore to Approval; do not persist mode.
- [x] Test pure mapping, initial surfaces, dim-not-hide, and explicit mode switch.
- [x] Run GUI tests/typecheck and diff check.
- [x] Confirm no core/MCP/IPC/schema/gate/stage/view/dispatch-feasibility/package/lock change.
- [x] Open PR #101 with traceability.
- [ ] Merged-main proof and closeout.

## Closeout — GUI-097

- [x] PR merge verified (`gh pr view --json state,mergedAt`)
- [x] proof.md finalised (PR URL + merge date recorded)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body (PR link, no follow-ups)
- [ ] cd out of worktree; `git worktree remove .worktrees/gui-097`
- [ ] `git branch -D gui-097-editor-modes` (squash-merged)
- [ ] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`
