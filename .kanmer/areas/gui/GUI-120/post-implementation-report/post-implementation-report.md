# GUI-120 post-implementation report

## Scope and lineage

GUI-120 is limited to the GUI-118 multi-project status broadcast finding. The dedicated worktree is .worktrees/gui-120 on branch gui-120-multiproject-broadcast, based on GUI-118 head e09009b2eadfc8a63608307f05ceb4868a5ec273. CORE-043 currently points at 7654a281, but the requested PR targets gui-118-provider-lifecycle, so no unrelated CORE-043 rebase was applied. No other ticket scope was changed.

## Implementation

The GUI-118 source already emitted the loop id as projectId: id. GUI-120 makes this contract explicit with a renderer-filter comment and adds narrowly scoped test injection seams for the production caller. The new regression creates two open ProjectContext entries, invokes the real connectProject production caller for the initiating project, captures both gitStatus broadcasts, and asserts payload projectId values are [firstProject, secondProject]. The test proves the second project is not mislabeled with the initiating project id.

## Evidence

- Focused regression: 1 passed, 10 skipped, exit 0.
- Full apps/gui index.sync production-caller rail: 11 tests passed, exit 0.
- GUI typecheck: exit 0.
- GUI build: exit 0.
- test:scripts: 89/89 passed, exit 0.
- verify:docs: PASS.
- git diff --check: exit 0.

The shared root node_modules pointed at a stale main-checkout core dist while this worktree source includes the current dispatch provider registry. A scoped worktree junction to packages/core was used for deterministic GUI tests; no tracked dependency or source file outside GUI-120 changed.

The full workspace typecheck is INCONCLUSIVE/failed at the inherited mcp-server baseline: dispatchDeliverableProven is missing from the resolved core package, verifyDeliverable is not present on DispatchSupervisorOptions, and the status callback is implicitly any. The GUI workspace typecheck passed independently. No hosted checks, live packaged/native host proof, or merged-main proof is claimed. Proof remains unwritten until post-merge verification.

## Review handoff

The packet is ready for independent review. The PR will target gui-118-provider-lifecycle and the ticket will stop at Review; no self-review, merge, verification, or cleanup.
