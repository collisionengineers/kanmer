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
- [x] Root all-workspace typecheck passes.
- [x] GUI production build passes.
- [x] git diff --check passes.
- [x] Manual Electron visual interaction/screenshot evidence is INCONCLUSIVE: no controlled real-window host was available.

## Parked (explicitly deferred)

- [ ] Root test suite is not green: core 266/266 assertions passed but npm test exited 1 on the preserved Windows EPERM unhandled error recorded in scratch. Parked because the failure is an external Windows temporary-log/file-lock boundary; no GUI-107 assertion failed and the focused/full GUI rails are green.

## Handoff

- [x] Post-implementation report is written and read back via MCP.
- [x] Checklist/report/scratch preserve exact failures and evidence gaps.
- [x] Commit is pushed and recorded on GUI-107; PR is opened and recorded.
- [x] Fresh gates pass and ticket moved only Implementing → Review.
- [x] Independent-review handoff sent; author does not review or merge.

## Rail readback

- GUI focused 21/21 (TicketCreate 3 + Editor 18), exit 0; full GUI 39 files / 360 tests, exit 0.
- Root typecheck exit 0; GUI build exit 0; core build exit 0; scripts rerun 82/82 exit 0.
- HTTP rail first run 60/61 with controlled Windows spawnSync ETIMEDOUT, then rerun 61/61 exit 0; both outcomes are preserved in scratch.
- Root npm test remains non-green only because core's 266/266 assertions were followed by one unhandled Windows EPERM opening a temp dispatch log; this is preserved in scratch and the unchecked root-test line above.

---

## Closeout — GUI-107

- [x] PR merge verified (gh pr view confirmed MERGED)
- [x] proof.md finalised with PR URL and merge date
- [x] Moved to final stage
- [x] Outcome recorded in ticket body (PR link, follow-ups)
- [x] cd out of worktree; git worktree remove .worktrees/gui-107
- [x] git branch -d gui-107-custom-requires
- [x] git fetch --prune + git worktree prune
- [x] take_ticket action: release
