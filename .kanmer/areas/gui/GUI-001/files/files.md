# Where the change lands

| Path | Why |
|---|---|
| `main/kanmerGit.ts` | `renameBoardBranch`, plus the reconcile branch in `ensureBoardWorktree`. |
| `main/index.ts` | `applyGitPreferences` replaces the pass-through IPC handler. |
| `renderer/src/components/Settings.tsx` | Branch field becomes an explicit rename action. |
| `main/kanmerGit.test.ts` | **New.** Seven tests against real Git. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `kanmerGit.ts` `ensureBoardWorktree` (the `existsSync(boardRoot)` guard) | The bug itself: an existing directory is taken as proof the branch matches. |
| `kanmerGit.ts` `syncBoard` | Why the wrong branch is not caught later - it pushes `HEAD:refs/heads/<status.branch>` and trusts the status. |
| `main/index.ts` `openProject` (the `syncTimer` line) | Timers exist only here, which is why an interval change never took effect. |
| `docs/functional/frd/FRD-020-board-git-worktree-sync.md` R5 | The required ordering: push new before deleting old, path unchanged. |
| `kanmerGit.ts` `removeBoardWorktree` | Dead code that looks like the intended fix and is not - deleting the worktree is how commits get lost. |
