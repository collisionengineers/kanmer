# GUI-123 post-implementation report

## Scope and lineage

GUI-123 is a bounded cumulative integration remediation for GUI-122. The
dedicated worktree is .worktrees/gui-123 on branch
gui-123-preserve-gui120. It started from GUI-122 head 94d9fca2 and merged the
exact GUI-120 merge commit 37740379552e241f200bb181a2ca0e9d3be32ece. The
resulting clean merge commit is 5d041af8. No unrelated production feature
changes were introduced.

## Integration result

The GUI-120 merge restores apps/gui/src/main/index.ts and
apps/gui/src/main/index.sync.test.ts. The production syncProject caller now
retains the per-project projectId: id broadcast, and the two-project regression
drives that caller and asserts both project ids. The GUI-120 test seams
(connectAgentOverride, setMainWindowForTest, and setConnectAgentForTest) are
present. GUI-119 provider propagation remains present in connect.ts, index.ts,
and remoteAccess/manager.ts, including KANMER_BOARD_BRANCH propagation for the
OpenAI, remote-access, and Claude paths.

## Deterministic evidence

- Focused providers/connect/index.sync/remote-manager rail: 4 files, 121 tests passed, exit 0; this includes the GUI-120 multi-project broadcast regression.
- GUI workspace typecheck: exit 0.
- GUI build: exit 0; existing gray-matter eval warning only.
- npm run test:scripts: 89/89 passed, exit 0.
- npm run verify:docs: PASS, exit 0.
- git diff --check: exit 0.

The full workspace typecheck is INCONCLUSIVE and exited 1 at the inherited
mcp-server/core mismatch: dispatchDeliverableProven is missing from the
resolved @kanmer/core package, verifyDeliverable is absent from
DispatchSupervisorOptions, and one status callback is implicitly any. The GUI
workspace typecheck passes independently. The worktree used a scoped
@kanmer/core junction after building the worktree core package because the
shared root dependency resolution otherwise points at stale main-checkout
artifacts; no tracked dependency or source outside this integration changed.

No hosted checks, live native host, packaged runtime, protected mutation, or
merged-main proof is claimed. Proof remains for post-merge verification.

## Review handoff

Commit 5d041af8 is ready to push in gui-123-preserve-gui120. The PR targets
gui-122-rebase-provider-propagation. The ticket stops at Review for an
independent reviewer; there is no self-review, merge, verification, or
cleanup in this handoff.

## Traceability

Commit 5d041af8886a2d307f0830690534a91cb519dc9c is pushed on gui-123-preserve-gui120. PR #223 targets gui-122-rebase-provider-propagation and carries the exact footer Kanmer: GUI-123. The ticket is ready for independent review.
