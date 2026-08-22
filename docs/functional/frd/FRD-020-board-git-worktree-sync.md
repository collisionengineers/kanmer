---
status: approved
covers: shipped Phase 9 feature (backfill)
---

# FRD-020 — Board Git worktree & auto-sync

The board can live on its own branch, shared across machines, without ever touching your source branch.

- R1. The board root is `<repo>/.worktrees/kanmer`, checked out on a configurable branch (default `kanmer-board`, global setting); the source checkout remains the project tab. MCP calls receive the board root; agent execution and project config use the source root.
- R2. First-time setup migrates an existing `.kanmer/` to the branch only after a successful commit; source-branch cleanup is left **staged and visible**, never auto-committed. `.kanmer/` and `.worktrees/` are gitignored at the source; `activity.jsonl` is ignored on the board branch.
- R3. **Automatic sync** (off by default; whole-minute interval): add scoped to `.kanmer` + the board `.gitignore` → commit if dirty → fetch/rebase if the remote branch exists → push. Never `--force`, never any other branch; a rebase conflict aborts, preserves local commits, and **pauses that project** with a visible error + Retry. "Sync now" always available.
- R4. Non-Git folders keep colocated `.kanmer/` with sync shown unavailable.
- R5. **Branch rename** keeps the worktree path and history, and for a non-protected configured branch pushes the new branch before any cleanup. Because the GUI cannot update the hosted `KANMER_BOARD_BRANCH` Actions variable, a custom-to-custom rename retains the old remote ref and tells the operator to update that variable; only after the hosted variable points at the new branch may the old ref be deleted. The repository's protected default `kanmer-board` is an explicit operator boundary: Kanmer refuses to rename away from it automatically because it cannot retarget GitHub protection or required checks. An authorized administrator must retarget protection first, remove the old rule, and rename every local board worktree before the setting is changed.

**Acceptance (as-built):** the Phase 9 verification list — real-repo tests for orphan creation, migration byte-preservation, conflict pause, cross-machine recovery, manual Retry live-branch preflight, and the R5 protected-default refusal/history-preserving custom rename boundary, including retention of the old custom remote ref until `KANMER_BOARD_BRANCH` is updated.

Related: docs/plans/kanmer-v2/phase-9 · kanmerGit.ts · FRD-018 (watcher picks up synced changes).

## Verified against code — Phase 0.2

- R1 — board root `join(repoRoot, ".worktrees", "kanmer")` `kanmerGit.ts:50`; branch default
  `"kanmer-board"` `settings.ts:50`; store built on boardRoot `main/index.ts:412-413`; the context
  keeps `sourceRoot` and `boardRoot` apart `main/index.ts:431`; MCP gets the board root
  `connect.ts:227-230`, agent dispatch spawns at the source root `dispatch.ts:107-112`.
- R2 — three creation paths incl. `worktree add --orphan` seeded from an existing `.kanmer/`, then
  commit, then `git rm -r --ignore-unmatch .kanmer` left **staged, not committed**
  `kanmerGit.ts:55-77`; source `.gitignore` gains `.kanmer/` + `.worktrees/` `kanmerGit.ts:79`;
  `activity.jsonl` ignored on the board branch `kanmerGit.ts:68`.
- R3 — `syncBoard` `kanmerGit.ts:87-106`: `add -- .kanmer .gitignore`, commit only when dirty,
  `ls-remote` before fetch, rebase with `--abort` on failure, `push -u origin
  HEAD:refs/heads/<branch>`. No `--force` on any path and no other branch is ever touched; the
  catch returns `paused: true` with the error preserved `:104-105`. Interval is whole-minute
  (`gitSyncMinutes * 60_000`, `main/index.ts:433`) and off by default (`settings.ts:50`).
- R4 — non-git short-circuit `kanmerGit.ts:47` returns `available: false`; `boardRoot` then falls
  back to the project dir `main/index.ts:412`.

**Protection constraint (R5).** `renameBoardBranch` migrates an existing non-default board
worktree in place: it renames the local ref and pushes the new remote ref. For a custom-to-custom
rename it retains the old remote ref and reports the `KANMER_BOARD_BRANCH` handoff; the operator
deletes that old ref only after the hosted variable is updated. When the current ref is the
protected literal `kanmer-board`, it refuses before any Git mutation and reports the administrator
handoff required to retarget protection and required checks. `applyGitPreferences` retains the old
persisted setting when an open protected board is refused, so the GUI cannot report a branch the
live board does not use. A closed project follows the same refusal during `ensureBoardWorktree`
reconciliation. Both automatic sync and manual Retry re-inspect the live worktree before calling
`syncBoard`; a mismatch pauses without pushing the cached branch. `removeBoardWorktree`
(`kanmerGit.ts`) remains unused because observation and repair are deliberately separate.

## Compiled-workflow end state (ADR-0016)

Board-worktree health is observational. `get_status` reports the board path, expected branch, actual branch, whether it is on the board branch, board source, active ticket count, and an operator-facing repair hint. An expected-branch override is supported. GUI and MCP maintain paired local inspectors across their package boundary; neither auto-repairs, blocks a ticket, or changes Git state merely by observing health.
