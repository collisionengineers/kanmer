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
- R5. **Branch rename** should migrate all known projects safely — push the new branch before deleting the old, worktree path unchanged so MCP registrations stay valid. **Not built** (see the gap note below); the end state is specified here so the eventual implementation has a target.

**Acceptance (as-built):** the Phase 9 verification list — real-repo tests for orphan creation, migration byte-preservation, conflict pause, and cross-machine recovery. (Rename is excluded: see R5.)

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

**Gap found (R5).** Branch rename is **not implemented**. `setKanmerGitPreferences`
(`settings.ts:87-93`) only persists the string; nothing migrates existing projects, pushes the new
branch, or removes the old one. The next `openProject` calls `ensureBoardWorktree` with the new
name and simply creates or adopts a worktree for it, leaving the old branch behind. Relatedly,
`removeBoardWorktree` (`kanmerGit.ts:108-110`) is dead code — never called from anywhere.
