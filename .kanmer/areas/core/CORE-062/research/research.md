# Research — CORE-062

## Question

Which `ensureBoardWorktree` creation paths must install the canonical board-worktree ignore list before a caller can sync?

## Findings

1. CORE-058 introduced `BOARD_WORKTREE_IGNORE` and `ensureBoardWorktreeIgnore`, including `.kanmer/data/sources/`, activity-log, and atomic-write residue rules.
2. The `attached` path and the existing-worktree branch-mismatch path call the helper, and the orphan path calls it before its initial commit. The `localExists` and `remoteExists` worktree-add branches return through the common tail without calling it.
3. A local or remote branch can therefore produce a valid board worktree whose `.gitignore` lacks the sources-cache rule; the next sync can stage derived cache files.
4. The existing real-Git fixture can create local and remote branch attachment paths, so the regression should assert the rule before any sync rather than mocking `git`.

## Implications

Move the single ignore reconciliation call to a shared successful-creation seam that executes after local/remote/orphan attachment and before returning an available status. Keep orphan commit ordering intact and preserve the existing one-list-per-concept rule. Add local and remote fixture coverage and leave retroactive cleanup of already-tracked cache history to the explicitly parked CORE-058 boundary.
