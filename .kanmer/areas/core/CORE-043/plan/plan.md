# CORE-043 plan — safe protection-aware rename flow

## Governing docs

- `docs/functional/frd/FRD-020-board-git-worktree-sync.md`
- `docs/architecture/adr/ADR-0016-compiled-workflow.md`

## Outcome

A live board cannot be moved automatically from the protected default `kanmer-board` to a name whose GitHub protection has not been retargeted. The refusal is fail-closed and leaves the local worktree, remote refs, and persisted branch preference unchanged for the refused open-project migration. A custom-branch rename continues to preserve history and perform push-before-delete.

## Implementation steps

1. Add one source-of-truth constant for the protected default and return a stable operator-facing refusal from `renameBoardBranch` before validation or Git mutation when the current branch is that default and the destination differs.
2. Refactor `applyGitPreferences` so branch migration is attempted before committing a changed branch preference for open projects; on a refusal, retain the old preference and apply only the requested sync interval.
3. Update real-Git fixtures: prove the protected-default refusal is byte/remote/ref/worktree unchanged, and prove the existing history-preserving rename on a custom branch (representing protection already retargeted). Cover closed-project reconciliation refusal.
4. Update Settings plus FRD-020/manual text with the retarget-first operator sequence and the explicit no-live-API boundary; regenerate the bundled manual.
5. Run focused GUI Git tests, full GUI tests, all-workspace typecheck, manual/docs checks, and the relevant build/diff rails. Record exact exit codes and any unavailable live protection proof.

## Non-goals

No GitHub API/App, branch-protection mutation, workflow required-check change, package/dependency change, MCP change, or CORE-046 work.

## Stop condition

Commit and push the bounded diff, record exact checks and external INCONCLUSIVE evidence, open/update the ticket PR, and move CORE-043 to Review. Do not merge or self-review.
