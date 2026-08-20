# Checklist — GUI-097

- [ ] Confirm GUI-096 is merged and use its final Scratch/tab types.
- [ ] Add/export exact four-value `EditorMode` enum/type and one mapping helper.
- [ ] Map Approval→Ticket, Execution→Plan, Review→Scratch, Evidence→Proof.
- [ ] Initialize Editor tab from mode on open.
- [ ] Reapply mapping only for new item or explicit mode change, never ordinary refresh.
- [ ] Add accessible four-option mode control.
- [ ] Route mode changes through existing dirty-tab confirmation; cancel retains mode/tab.
- [ ] Mark primary/secondary tabs for styling.
- [ ] Keep every tab rendered, enabled, focusable, and clickable.
- [ ] Add readable/focus-safe dimming only; active non-primary tab remains clearly active.
- [ ] Preserve correct empty states for missing plan/scratch/proof.
- [ ] Centralize App opening as ID + ephemeral mode with Approval default.
- [ ] Pass Approval from card/Open/wiki/activity/create/session paths.
- [ ] Pass Execution from dispatch actions without changing dispatch eligibility or invoking twice.
- [ ] Preserve requested mode through dirty pending-navigation confirmation.
- [ ] Reset ordinary future opens/session restore to Approval; do not persist mode.
- [ ] Test pure mapping and all four initial surfaces.
- [ ] Test missing-document surfaces remain the mapped target.
- [ ] Test dim-not-hide/enable behavior for all tabs.
- [ ] Test explicit mode switch, dirty cancel/confirm, and no reset on item refresh.
- [ ] Test new item/mode request reset, ordinary Approval, dispatch Execution, session Approval.
- [ ] Run GUI tests/typecheck and `npm run verify`.
- [ ] Capture screenshots of all four modes showing all tabs.
- [ ] Confirm no core/MCP/IPC/schema/gate/stage/view/dispatch-feasibility/package/lock change.
- [ ] Open PR with `Kanmer: GUI-097`; keep `docs_todo` until DOC-011 links FRD-019.
- [ ] Stop at review readiness; do not merge or start another ticket.

## Progress notes

Append mapping test output, dirty-switch cases, dispatch/open call-site audit, screenshots, and command exit codes.
