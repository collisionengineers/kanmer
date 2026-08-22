# Post-implementation report — CORE-073

## Summary
The GUI sync retry now remains bound to the board root owned by the open project context. A retry that reports another root is rejected into a paused status preserving the existing root, store, and watcher; a retry with no root also remains paused on the open root. Matching roots continue normally.

## Changes
| File | Change | Why |
|---|---|---|
| apps/gui/src/main/syncBranch.ts | Added typed bindRetryBoardStatus helper with normalized root comparison and fail-closed mismatch/no-root handling | Prevent retry status from redirecting sync/status away from the open context's board worktree |
| apps/gui/src/main/syncBranch.test.ts | Added matching-root, mismatched-root, and missing-root regressions | Prove retry binding and preservation of paused context state |
| apps/gui/src/main/index.ts | Applied root binding before replacing ctx.syncStatus in syncProject | Keep the existing store/watcher and retry result on one board root |

## Governing docs
The ticket references FRD-027 project-declared sources and ADR-0020 project-declared source trust. This change does not alter source declarations, fetching, trust, cache content, or authority. It preserves the board-worktree boundary by refusing cross-root retry results.

## Risks / follow-ups
Hosted Windows GUI/manual evidence is unavailable in this run. The full GUI rail remains INCONCLUSIVE because the base checkout's shared core lacks the antigravity dispatch provider and related symbols; the first failure is preserved below. No unrelated behavior was changed.

## Verification hand-off
On merged main, run:
- npm run test -w @kanmer/gui -- --run src/main/syncBranch.test.ts (expected 5/5 or later equivalent)
- npm run typecheck -w @kanmer/gui
- npm run build:core
- npm run test:scripts (expected 88/88)
- npm run test -w @kanmer/gui -- --run (full GUI rail)
- git diff --check
Also exercise a real GUI project with a paused board-worktree retry and verify the context boardRoot, store, watcher, and sync status remain the same after a mismatched/no-root result; hosted Windows evidence is currently INCONCLUSIVE.

## Exact command evidence
- npm run test -w @kanmer/gui -- --run src/main/syncBranch.test.ts — exit 0, 5/5.
- npm run build:core — exit 0.
- npm run test:scripts — exit 0, 88/88.
- npm run typecheck -w @kanmer/gui — exit 1: inherited stale shared-core errors for dispatchDeliverableProven, verifyDeliverable, and antigravity in apps/gui/src/main/dispatch.ts/providers.ts.
- npm run test -w @kanmer/gui -- --run — exit 1: full GUI 45 files, 304/305 tests; 3 suites fail to collect on missing shared dispatch provider antigravity and 1 dispatch assertion reports the same baseline mismatch. The CORE-073 syncBranch suite passes.
- git diff --check — exit 0.
