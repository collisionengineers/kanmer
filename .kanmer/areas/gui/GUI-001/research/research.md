# Why the rename lost the board

`setKanmerGitPreferences` persisted the string and stopped. Everything after
that followed from one assumption in `ensureBoardWorktree`: that a worktree at
`.worktrees/kanmer` must be the board for whatever branch it was asked about.

Reading the function in order shows the trap. It looks for a worktree attached
to `refs/heads/<branch>`; after a rename there is none. It then checks
`existsSync(boardRoot)` - which is true, because the directory is right there
on the old branch - so the whole creation block is skipped, and the function
returns `{ available: true, branch }` for a branch the worktree is not on.

Nothing errors. The store opens the right files, the board renders, and the
status line shows the new name. The damage arrives at the first sync:
`syncBoard` pushes `HEAD:refs/heads/<new>`, which publishes the old branch's
commits under the new name while the local worktree is still on the old one.
Two names, one history, and the app disagreeing with Git about which is which.

## Rename, don't re-create

The fix is smaller than the bug suggests. `git branch -m` renames the ref in
place: the new branch **is** the old branch, so there is no history to move and
nothing to strand. The worktree path is untouched, which matters more than it
looks - MCP servers are registered against `.worktrees/kanmer` (FRD-020 R5 calls
this out), and a rename that relocated the board would silently break every
connected agent.

`removeBoardWorktree` looked like the other half of an intended
delete-and-recreate design. It is not needed and stays dead; deleting the
worktree is exactly the approach that loses commits.

## The remote, and how much to do

FRD-020 R5 fixes the order: push the new branch before deleting the old. That
ordering is the whole safety property - a failure at any step leaves the history
published under at least one name.

Whether to delete the old remote branch at all is a real question, since a
teammate still on the old name will find it gone. But leaving both is worse: two
branches accumulating divergent board state, with no signal about which is live.
The FRD chose deletion and the ordering makes it safe, so deletion it is.

The asymmetry worth keeping is that only the *local* rename is fatal. Once the
worktree is on the new branch the board works. A remote that could not be
updated is a warning to show, not a reason to roll back and leave the user with
neither name applied.

## The half nobody would have hit in testing

The setting is app-global; worktrees are per-project. Renaming while three
projects are open reaches those three. Every other project on the machine keeps
its old branch until it is next opened - and that is the common case, not the
edge case. So the reconciliation has to live in `ensureBoardWorktree` too, not
only in the settings handler. The handler is really just the fast path for
projects already in memory.
