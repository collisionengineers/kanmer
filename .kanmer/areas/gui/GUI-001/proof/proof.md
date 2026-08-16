# Proof

Commit `b3fc42d`.

Seven tests in `apps/gui/src/main/kanmerGit.test.ts`, each against a real Git
repo with a real bare origin - no mocks, because the claim is about refs:

- **keeps the history, the path and the remote consistent** - the pre-rename
  `HEAD` sha is identical after, HEAD is on the new branch, `origin` resolves
  the new name to that same sha, the worktree is still `.worktrees/kanmer` with
  its `.kanmer/` intact, and the old branch is gone from origin. This one test
  is the whole ticket: on the old code the sha comparison is what fails.
- **no-op when the name already matches** - and the remote is left alone.
- **refuses a name that is already taken** - `ok: false`, and the worktree is
  verified still on its old branch.
- **renames locally with no remote** - `origin` removed first; still succeeds.
- **reconciliation: moves a worktree left on the old branch** - the closed-project
  path. `ensureBoardWorktree(repo, "team-board")` against a worktree on
  `kanmer-board` returns available, no error, same path, same sha, HEAD moved.
- **reconciliation: reports the real branch when it fails** - `available: false`
  with an error, worktree untouched.
- **reconciliation: idempotent** - second call is a clean no-op.

Full rail: 131 GUI tests (7 new) and core's 6 files green; `smoke.mjs` 117/117;
`smoke-protocol.mjs` 26/26; both typechecks; GUI build; boot smoke exit 0.

**Not proven by the suite:** the two remote-failure warning paths, and the
Settings pane's rename button, which has no renderer test - GUI component
testing does not exist in this repo and adding it is not this ticket's job.
