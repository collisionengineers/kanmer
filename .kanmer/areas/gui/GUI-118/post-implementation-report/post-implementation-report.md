# GUI-118 post-implementation report

## Scope and lineage

Implemented only the eight GUI-118 findings linked from CORE-043: F-3836911554, F-3837018843, F-3837018844, F-3837052514, F-3837052515, F-3837084778, F-3837084780, and F-3837084783. The worktree is `.worktrees/gui-118`, branch `gui-118-provider-lifecycle`, based on CORE-043 parent head `1126253eed586111db60ed72eccf6754f0f5ef06` (the merged CORE-089 lineage). No GUI-106, GUI-117, GUI-116, remote-access, or other ticket scope was changed.

## Implementation and production callers

- `apps/gui/src/main/index.ts` now serializes project open/close, Git preference changes, and Connect/disconnect through the existing sync-lifecycle seam plus an application lifecycle lock. Provider-registration failures are retained as a pending reconciliation state and retried after a healthy sync/Retry. Branch settings persist only after all requested renames succeed; a failed rename retains the previous persisted branch. Successful observed handoffs mark native reconnect state.
- The same file routes Connect/disconnect through the lifecycle lock, clears native reconnect state at the user-scoped provider boundary, and updates all open project contexts.
- `apps/gui/src/main/connect.ts`, `providers.ts`, and their tests require native functional probes to report the configured expected branch, actual branch, and an affirmative on-expected-branch result. This keeps the existing identity/format proof and adds branch binding.
- `apps/gui/src/main/settings.ts` and its tests clear native reconnect state across all projects for the user-scoped provider.
- `apps/gui/src/main/kanmerGit.ts` and its test keep a failed remote push handoff actionable, including the required `KANMER_BOARD_BRANCH` update and retained-remote deletion instruction.
- `apps/gui/src/main/index.sync.test.ts` adds production-caller regressions for failed-rename persistence, provider retry reconciliation, and observed-handoff native staleness. Existing assertions were retained.

Finding disposition: F-3836911554 fixed by branch-bound native probe validation; F-3837018843 fixed by pending provider reconciliation and Retry; F-3837018844 fixed by application lifecycle serialization; F-3837052514 fixed by post-success preference persistence; F-3837052515 fixed by locking Connect/disconnect; F-3837084778 fixed by observed-handoff stale marking; F-3837084780 fixed by user-scoped clearing; F-3837084783 fixed by explicit handoff warning. The remote/tunnel and Claude marketplace findings remain outside this ticket as documented in CORE-043.

## Deterministic evidence

- Focused GUI-118 suite: settings 4/4, providers 66/66, connect 34/34, and index.sync 10/10 passed.
- Filtered focused rail: 47 passed, 67 skipped (intentional name filter), exit 0.
- `npm exec vitest -- run src/main/kanmerGit.test.ts -t "push failure|retained|warning" --reporter=dot --testTimeout=60000 --hookTimeout=60000`: 1 passed, 28 skipped, exit 0.
- `npm exec vitest -- run --exclude src/main/index.sync.test.ts --exclude src/main/kanmerGit.test.ts --reporter=dot --testTimeout=60000 --hookTimeout=60000`: 47 files, 392 tests passed, exit 0.
- `npm run typecheck`: exit 0 for core, mcp-server, ui, and gui.
- `npm run build -w @kanmer/gui`: exit 0.
- `npm run test:scripts` after the build: 89/89 passed, exit 0.
- `npm run verify:docs`: exit 0; `git diff --check`: exit 0.

## Preserved failures and evidence limits

The first pre-build `npm run test:scripts` exited 1: 87 passed and 2 failed because `packages/core/dist/index.js` was absent; this was rerun after the required build and passed 89/89. The full `npm test -w @kanmer/gui` rail reached the Git-heavy suites after passing the deterministic suites but produced no output for over a minute and was interrupted; this is INCONCLUSIVE, not PASS. A prior combined focused run also hung before `kanmerGit`; the targeted `kanmerGit` regression above is the bounded replacement. Parent-run focused evidence separately recorded settings 4/4, providers 66/66, connect 34/34, index.sync 10/10, with the combined command interruption preserved.

No live packaged-update, real native-host, protected-branch mutation, or hosted PR evidence is claimed here; those remain INCONCLUSIVE pending independent review and hosted checks. No proof.md is written because proof belongs after merge on main.

## Review handoff

The source and deterministic packet are ready for independent review. The PR/base/head and final traceability are recorded after commit below; the ticket must stop at Review and must not be self-merged or self-verified.


2026-08-23T00:05:00Z GUI-122 cumulative rebase: merge commit 94d9fca2 integrates origin/core-043-protection-retarget head 7654a281 into the GUI-118 branch without conflicts. GUI-119 OpenAI, remote-access, and Claude KANMER_BOARD_BRANCH propagation remains present in connect.ts, index.ts, and remoteAccess/manager.ts; GUI-118 lifecycle changes remain present. GUI-122 focused provider/connect/index-sync rail passed 120/120, GUI typecheck/build, scripts 89/89, docs, and diff checks passed. Full workspace typecheck retains the inherited mcp-server/core dispatchDeliverableProven and verifyDeliverable mismatch. GUI-122 implementation branch is ready for its own Review PR targeting gui-118-provider-lifecycle.
