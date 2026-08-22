# Checklist — GUI-107

## Packet and pipeline

- [x] Complete ticket/group/governing-doc read and source research recorded.
- [x] Research and files documents are written and read back via MCP.
- [x] Plan is written and read back via MCP.
- [x] Open questions are resolved or explicitly parked.
- [x] Fresh doc gates pass before each stage move.
- [x] Ticket is taken on the dedicated GUI-107 branch/worktree.

## Implementation

- [x] Existing core requires model and IPC path are reused without core/provider changes.
- [x] Shared renderer custom-requirements draft converts maps without mutating source state.
- [x] Vocabulary comes from the resolved doc model and board deployment environments.
- [x] Renderer validation rejects unknown boundary/type/proof/environment values.
- [x] TicketCreate renders fields only for custom profile.
- [x] TicketCreate prunes empty boundary fields and sends the core-shaped requires map.
- [x] TicketCreate blocks invalid custom requirements before onCreate.
- [x] Editor renders fields only for custom profile.
- [x] Editor includes requires in snapshot, dirty, live-resync, and conflict handling.
- [x] Editor sends validated requires in UpdateItemPatch and preserves existing save behavior.
- [x] Non-custom create/edit behavior remains unchanged and does not submit inline requires.
- [x] GUI-007 Settings/profile semantics and core profile/gate semantics remain untouched.

## Tests and rails

- [x] Focused custom-requirements/helper tests pass.
- [x] Existing profileDraft tests pass.
- [x] Full GUI test suite passes with exact count recorded.
- [ ] Root test suite is not green: core 266/266 assertions passed but npm test exited 1 on the preserved Windows EPERM unhandled error recorded in scratch.
- [x] Root all-workspace typecheck passes.
- [x] GUI production build passes.
- [x] git diff --check passes.
- [x] Manual Electron visual interaction/screenshot evidence is INCONCLUSIVE: no controlled real-window host was available.

## Handoff

- [ ] Post-implementation report is written and read back via MCP.
- [ ] Checklist/report/scratch preserve exact failures and evidence gaps.
- [ ] Commit is pushed and recorded on GUI-107; PR is opened and recorded.
- [ ] Fresh gates pass and ticket moves only Implementing → Review.
- [ ] Independent-review handoff sent; author does not review or merge.
