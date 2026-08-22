# Checklist — GUI-107

## Packet and pipeline

- [ ] Complete ticket/group/governing-doc read and source research recorded.
- [ ] Research and files documents are written and read back via MCP.
- [ ] Plan is written and read back via MCP.
- [ ] Open questions are resolved or explicitly parked.
- [ ] Fresh doc gates pass before each stage move.
- [ ] Ticket is taken on the dedicated GUI-107 branch/worktree.

## Implementation

- [ ] Existing core requires model and IPC path are reused without core/provider changes.
- [ ] Shared renderer custom-requirements draft converts maps without mutating source state.
- [ ] Vocabulary comes from the resolved doc model and board deployment environments.
- [ ] Renderer validation rejects unknown boundary/type/proof/environment values.
- [ ] TicketCreate renders fields only for custom profile.
- [ ] TicketCreate prunes empty boundary fields and sends the core-shaped requires map.
- [ ] TicketCreate blocks invalid custom requirements before onCreate.
- [ ] Editor renders fields only for custom profile.
- [ ] Editor includes requires in snapshot, dirty, live-resync, and conflict handling.
- [ ] Editor sends validated requires in UpdateItemPatch and preserves existing save behavior.
- [ ] Non-custom create/edit behavior remains unchanged and does not submit inline requires.
- [ ] GUI-007 Settings/profile semantics and core profile/gate semantics remain untouched.

## Tests and rails

- [ ] Focused custom-requirements/helper tests pass.
- [ ] Existing profileDraft tests pass.
- [ ] Full GUI test suite passes with exact count recorded.
- [ ] Root test suite passes with exact exit/count recorded.
- [ ] Root all-workspace typecheck passes.
- [ ] GUI production build passes.
- [ ] git diff --check passes.
- [ ] Manual Electron visual interaction/screenshot evidence is recorded as PASS or INCONCLUSIVE with reason.

## Handoff

- [ ] Post-implementation report is written and read back via MCP.
- [ ] Checklist/report/scratch preserve exact failures and evidence gaps.
- [ ] Commit is pushed and recorded on GUI-107; PR is opened and recorded.
- [ ] Fresh gates pass and ticket moves only Implementing → Review.
- [ ] Independent-review handoff sent; author does not review or merge.
