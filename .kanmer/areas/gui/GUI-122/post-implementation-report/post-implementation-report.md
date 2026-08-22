# GUI-122 post-implementation report

## Scope and lineage

GUI-122 integrates the current CORE-043 provider-propagation lineage into GUI-118. The dedicated worktree is .worktrees/gui-122 on branch gui-122-rebase-provider-propagation. The branch started at GUI-118 head e09009b2eadfc8a63608307f05ceb4868a5ec273 and merged origin/core-043-protection-retarget head 7654a28104fbc67c58cad61241188d0f3d898c17 as 94d9fca2a9aa6e9158f7b230cea4617accb771dd. The merge was clean and no unrelated source was changed.

## Integration review

The merge preserves GUI-119 OpenAI, remote-access, and Claude KANMER_BOARD_BRANCH propagation:

- connect.ts retains the staged Claude marketplace descriptor binding and branch-aware skill update path.
- index.ts retains the settings-driven branch passed to updateSkills, RemoteAccessManager, and OpenAITunnelManager.
- remoteAccess/manager.ts retains branch environment propagation for runtime and doctor children.
- GUI-118 lifecycle changes remain present in index.ts, settings.ts, providers.ts, connect.ts, and their tests.

The resulting branch is an integration-only cumulative head. No feature behavior beyond the already-reviewed GUI-119 provider propagation and GUI-118 lifecycle implementation was added.

## Deterministic evidence

- Focused providers/connect/index.sync/remote-manager rail: 4 files, 120 tests passed, exit 0.
- GUI typecheck: exit 0.
- GUI build: exit 0; existing gray-matter eval warning only.
- test:scripts after core build: 89/89 passed, exit 0.
- verify:docs: PASS.
- git diff --check: exit 0.

The full workspace typecheck is INCONCLUSIVE and exits 2 at the inherited mcp-server/core mismatch: dispatchDeliverableProven is missing from the resolved core package, verifyDeliverable is absent from DispatchSupervisorOptions, and one status callback is implicitly any. The GUI workspace typecheck passes independently. A scoped worktree core junction was used because shared root node_modules points at a stale main-checkout core package; no tracked dependency or source outside the merge was changed.

No hosted checks, live native host, packaged runtime, protected mutation, or merged-main proof is claimed. Proof remains unwritten until post-merge verification.

## Review handoff

Merge commit 94d9fca2a9aa6e9158f7b230cea4617accb771dd is pushed on gui-122-rebase-provider-propagation. PR #222 targets gui-118-provider-lifecycle. GUI-118 cumulative report/checklist and scratch were refreshed with this lineage. The ticket stops at Review for independent review; no self-review, merge, verification, or cleanup.

## GUI-123 cumulative remediation

GUI-123 merged GUI-120 37740379552e241f200bb181a2ca0e9d3be32ece into GUI-122 94d9fca2, producing 5d041af8886a2d307f0830690534a91cb519dc9c. This restores projectId:id multi-project Connect broadcast coverage and its production-caller regression while retaining GUI-119 propagation. Focused cumulative rail: 121/121; GUI typecheck/build, scripts 89/89, verify:docs and diff-check passed. Full workspace typecheck inherited mcp-server/core dispatch mismatch is INCONCLUSIVE. PR #223 targets GUI-122 and is ready for independent review.
