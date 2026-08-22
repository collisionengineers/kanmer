# Post-implementation report — CORE-062

## Outcome

`ensureBoardWorktree` now applies the single `BOARD_WORKTREE_IGNORE` list after every successful local, remote, attached, branch-reconciliation, and orphan worktree setup. Existing local and remote branch attachment paths therefore receive the `.kanmer/data/sources/` cache rule before any sync can stage derived files.

## Changes

- `apps/gui/src/main/kanmerGit.ts` moves the shared ignore reconciliation to the common successful-creation seam while preserving orphan creation's copy/commit/source-cleanup ordering.
- `apps/gui/src/main/kanmerGit.test.ts` adds real-Git local-existing and remote-existing branch attachment regressions, including `git check-ignore` assertions for the sources cache.

## Governing docs

- FRD-020's board-only staging contract is preserved: every attached board worktree receives the same ignore rules before it becomes available.
- FRD-027 and ADR-0020 continue to treat the source cache as derived state, not declared source authority; retroactive removal of already-tracked history remains explicitly parked.

## Verification

- `npm run test -w @kanmer/gui -- src/main/kanmerGit.test.ts` — PASS, 17/17.
- `npm run build:core` — PASS.
- `npm run typecheck -w @kanmer/gui` — PASS.
- `npm run test:scripts` — PASS, 88/88.
- `npm run check:manual` — PASS, 22 chapters current.
- `npm run verify:docs` — PASS.
- `git diff --check` — PASS.

## Risks / handoff

Historical cache files already tracked in Git are not rewritten by this ticket; that boundary is parked from CORE-058. Live Windows locks, packaged behavior, and hosted evidence remain verification boundaries. PR is opened against CORE-058's cumulative head so the child can be merged non-squash before a fresh CORE-058 review.
