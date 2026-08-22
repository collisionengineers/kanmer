# Plan — CORE-062

## Governing docs

- **FRD-020:** every canonical board worktree must stage only board state; the ignore list must be present regardless of how the worktree is attached.
- **FRD-027 / ADR-0020:** derived source cache is not project-declared source authority and must remain ignored; no retroactive history rewrite belongs here.

## Approach

Keep `BOARD_WORKTREE_IGNORE` as the sole list and call `ensureBoardWorktreeIgnore` after every successful local, remote, attached, branch-reconciliation, and orphan worktree setup. Add real-Git local and remote branch tests that inspect `.gitignore` before synchronization.

## Ordered steps

1. Refactor `ensureBoardWorktree` so local and remote branch attachment paths share the ignore reconciliation seam without changing orphan commit/source-cleanup ordering.
2. Add deterministic local-existing and remote-existing bare-origin regressions for `.kanmer/data/sources/`.
3. Run focused GUI Git tests, core/server build/typecheck, scripts/docs/manual/diff rails, and record inherited failures.
4. Write the post-implementation report, traceability, PR, and independent-review handoff.

## Proof and risks

Real-Git fixtures prove the rule exists before sync on both attachment paths. The remaining risk is historical cache files already tracked; that is explicitly parked and must not be silently rewritten.
